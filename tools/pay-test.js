/* 프리미엄 결제 서버 로직(tools/agent-backend.gs v11) 자동 검증 — 실행: node tools/pay-test.js
   구글 시트·토스 API를 흉내 낸 가짜 객체 위에서 주문 생성 → 금액 대조 → 승인 → 열람 기록 → 환불 요청 → 다시 보기를 확인합니다.
   (실제 토스·구글 서버에는 접속하지 않습니다. 테스트용 시크릿 키 값도 가짜 문자열을 씁니다.) */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');

/* ---------- 가짜 구글 서비스 ---------- */
function makeSheet() {
  const rows = [];
  const sh = {
    rows,
    getDataRange() { return { getValues: () => rows.map(r => r.slice()) }; },
    getLastRow() { return rows.length; },
    appendRow(r) { rows.push(r.slice()); },
    setFrozenRows() {},
    getRange(r, c, nr, nc) {
      const rg = {
        setValues(v) { v.forEach((line, i) => line.forEach((x, j) => { (rows[r - 1 + i] = rows[r - 1 + i] || [])[c - 1 + j] = x; })); return rg; },
        setValue(x) { (rows[r - 1] = rows[r - 1] || [])[c - 1] = x; return rg; },
        getValue() { return (rows[r - 1] || [])[c - 1]; },
        getValues() { return [(rows[r - 1] || []).slice(c - 1, c - 1 + (nc || 1))]; },
        setFontWeight() { return rg; }, setBackground() { return rg; }, setFontColor() { return rg; },
        setNumberFormat() { return rg; }, insertCheckboxes() { return rg; }
      };
      return rg;
    }
  };
  return sh;
}
const sheets = {};
const book = {
  getSheetByName: n => sheets[n] || null,
  insertSheet: n => (sheets[n] = makeSheet()),
  getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST',
  getSheets: () => Object.values(sheets), deleteSheet() {}
};
sheets['중개사'] = makeSheet(); sheets['로그'] = makeSheet();
const props = { TOSS_SECRET_KEY: 'test_sk_FAKE_FOR_UNIT_TEST' };
const cacheMap = new Map();
const mails = [];
let tossMode = 'ok', tossCalls = [];
const ctx = {
  console,
  SpreadsheetApp: { getActive: () => book, openById: () => book },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: k => cacheMap.has(k) ? cacheMap.get(k) : null, put: (k, v) => cacheMap.set(k, v), remove: k => cacheMap.delete(k), removeAll: ks => ks.forEach(k => cacheMap.delete(k)) }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail: (...a) => mails.push(a) },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    formatDate: (d, tz, f) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
        .formatToParts(d).map(x => [x.type, x.value]));
      return f.replace('yyyy', p.year).replace('yy', p.year.slice(2)).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour === '24' ? '00' : p.hour).replace('hh', p.hour).replace('mm', p.minute);
    },
    computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
    base64Encode: s => Buffer.from(s).toString('base64'),
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
  },
  UrlFetchApp: {
    fetch(url, opt) {
      tossCalls.push({ url, opt });
      const body = opt.payload ? JSON.parse(opt.payload) : null;
      const send = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
      if (tossMode === 'reject') return send(400, { code: 'REJECT_CARD_COMPANY', message: '카드사에서 거절했습니다.' });
      if (tossMode === 'already' && body) return send(400, { code: 'ALREADY_PROCESSED_PAYMENT', message: '이미 처리된 결제 입니다.' });
      if (tossMode === 'already' && !body) return send(200, { status: 'DONE', orderId: ctx.__lastOrder, totalAmount: ctx.__lastAmount, method: '카드', approvedAt: new Date().toISOString() });
      if (tossMode === 'wrongAmount') return send(200, { status: 'DONE', orderId: body.orderId, totalAmount: 100, method: '카드', approvedAt: new Date().toISOString() });
      return send(200, { status: 'DONE', orderId: body.orderId, totalAmount: body.amount, method: '카드', approvedAt: new Date().toISOString() });
    }
  }
};
vm.createContext(ctx);
const src = fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8').replace('const PAID_OPEN = false;', 'const PAID_OPEN = true;');   // 결제 흐름 검증은 판매를 연 상태로(잠금은 tools/paid-lock-test.js)
vm.runInContext(src + '\n;globalThis.__T = { PRICE, OC, SH_O, safeEq, parseContact, parseKey, hashOf };', ctx);
const T = ctx.__T;
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
const orders = () => sheets['주문'].rows.slice(1);
const col = (row, h) => row[T.OC[h]];
const findO = id => orders().find(r => col(r, '주문번호') === id);

/* ---------- 검증 ---------- */
let pass = 0, fail = 0;
const isDate = v => Object.prototype.toString.call(v) === '[object Date]';   // vm 안의 Date 는 instanceof 가 통하지 않음
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra) : ''); } }

const K = (sd, code, dong, apt, band) => [sd, code, dong, apt, band].map(v => encodeURIComponent(v).replace(/~/g, '%7E').replace(/!/g, '%21')).join('~');
const k1 = K('s00', '11710', '가락동', '헬리오시티', '84㎡대'), k2 = K('s00', '11680', '대치동', '은마', '84㎡대'), k3 = K('s00', '11650', '반포동', '현대6차(78~81동)', '59㎡대');

// 1. 상수시간 비교·연락처·키 파싱
check('safeEq 같음', T.safeEq('abc', 'abc'));
check('safeEq 다름', !T.safeEq('abc', 'abd') && !T.safeEq('abc', 'abcd') && !T.safeEq('', 'a'));
check('휴대폰 가림', T.parseContact('010-1234-5678').mask === '010-****-5678');
check('이메일 가림', T.parseContact('Hong.Gil@Example.com').mask === 'ho***@example.com');
check('잘못된 연락처 거절', T.parseContact('12345') === null);
check('단지 키 파싱(물결표 포함 이름)', T.parseKey(k3) && T.parseKey(k3).name === '현대6차(78~81동) 59㎡대');
check('잘못된 단지 키 거절', T.parseKey('abc~def') === null && T.parseKey(K('x', '1', 'a', 'b', 'c')) === null);

// 2. 주문 만들기 검증
let r = post({ action: 'createOrder', product: 'single', keys: [k1, k2], contact: '01012345678', agree: true });
check('단지 리포트에 2곳 → 거절', !r.ok, r);
r = post({ action: 'createOrder', product: 'pack', keys: [k1], contact: '01012345678', agree: true });
check('비교 패키지에 1곳 → 거절', !r.ok, r);
r = post({ action: 'createOrder', product: 'single', keys: [k1], contact: '01012345678', agree: false });
check('청약철회 동의 없음 → 거절', !r.ok, r);
r = post({ action: 'createOrder', product: 'gold', keys: [k1], contact: '01012345678', agree: true });
check('없는 상품 → 거절', !r.ok, r);
r = post({ action: 'createOrder', product: 'single', keys: [k1], contact: '010-1234-5678', agree: true, amount: 100 });
check('주문 생성 성공, 금액은 서버 가격(클라이언트 금액 무시)', r.ok && r.amount === 9900 && /^JDJ\d{6}-[0-9A-F]{10}$/.test(r.orderId), r);
const A = r.orderId;
let row = findO(A);
check('주문 탭 자동 생성 + 결제대기 기록', !!row && col(row, '상태') === '결제대기' && col(row, '금액') === 9900);
check('연락처 원문 미저장(가린 값+해시만)', col(row, '연락처') === '010-****-5678' && !JSON.stringify(row).includes('01012345678'));

// 3. 금액 위변조 → 승인 API 호출 없이 거절
tossCalls = [];
r = post({ action: 'confirmPayment', paymentKey: 'tgen_test_A', orderId: A, amount: 100 });
check('금액 위변조 거절', !r.ok && tossCalls.length === 0, r);
check('금액불일치 상태 기록', col(findO(A), '상태') === '금액불일치');

// 4. 정상 승인
r = post({ action: 'createOrder', product: 'pack', keys: [k1, k2, k3], contact: 'buyer@example.com', agree: true });
const B = r.orderId;
check('비교 패키지 29,000원', r.ok && r.amount === 29000, r);
tossCalls = [];
r = post({ action: 'confirmPayment', paymentKey: 'tgen_test_B', orderId: B, amount: 29000 });
check('정상 승인 + 토큰 발급', r.ok && typeof r.token === 'string' && r.token.length >= 32, r);
const call = tossCalls[0] || { opt: { headers: {} } };
check('토스 승인 API 호출 형식(Basic 인증·멱등키)', call.url === 'https://api.tosspayments.com/v1/payments/confirm'
  && call.opt.headers.Authorization === 'Basic ' + Buffer.from(props.TOSS_SECRET_KEY + ':').toString('base64') && /^confirm-/.test(call.opt.headers['Idempotency-Key']));
let tokB = r.token;
row = findO(B);
check('시트: 결제완료·승인시각·결제수단', col(row, '상태') === '결제완료' && isDate(col(row, '승인시각')) && col(row, '결제수단') === '카드');
check('토큰 원문 미저장(해시만)', col(row, '열람토큰') !== tokB && col(row, '열람토큰') === T.hashOf(tokB));

// 5. 성공 화면 새로고침(같은 결제키 재승인) → 새 토큰, 다른 결제키 → 거절
r = post({ action: 'confirmPayment', paymentKey: 'tgen_test_B', orderId: B, amount: 29000 });
check('같은 결제키 재요청 → 새 토큰', r.ok && r.token !== tokB, r);
const oldTok = tokB; tokB = r.token;
r = post({ action: 'openReport', o: B, t: oldTok });
check('이전 토큰은 무효', !r.ok);
r = post({ action: 'confirmPayment', paymentKey: 'tgen_OTHER', orderId: B, amount: 29000 });
check('다른 결제키로 재승인 거절', !r.ok);

// 6. 토큰 검증
r = post({ action: 'openReport', o: B, t: tokB.slice(0, -1) + (tokB.slice(-1) === 'a' ? 'b' : 'a') });
check('틀린 토큰 거절', !r.ok);
r = post({ action: 'openReport', o: A, t: tokB });
check('다른 주문 토큰으로 열람 불가', !r.ok);

// 7. 상태 확인(open:false)은 열람 기록 안 함
r = post({ action: 'openReport', o: B, t: tokB });
check('상태 확인: 열람 전·환불 가능', r.ok && r.order.viewed === false && r.order.refundable === true && !r.keys, r);
check('상태 확인 응답에 연락처·결제키 없음', !/buyer|tgen_test|\*\*\*/.test(JSON.stringify(r)));
check('최초열람시각 공란 유지', col(findO(B), '최초열람시각') === '');

// 8. 열람 → 최초 열람 시각 기록, 두 번째 열람에도 유지
r = post({ action: 'openReport', o: B, t: tokB, open: true });
check('열람 성공 + 단지 키 3개', r.ok && r.keys.length === 3 && r.order.viewed === true && r.order.refundable === false, r);
const first = col(findO(B), '최초열람시각');
check('최초열람시각 기록', isDate(first));
r = post({ action: 'openReport', o: B, t: tokB, open: true });
check('두 번째 열람: 최초열람시각 그대로, 횟수 2', col(findO(B), '최초열람시각') === first && col(findO(B), '열람횟수') === 2);

// 9. 환불 요청: 열람 후 → 검토 필요로 기록, 메일 1통
mails.length = 0;
r = post({ action: 'refundRequest', o: B, t: tokB, reason: '테스트' });
check('열람 후 환불 요청 → 검토 필요', r.ok && /검토 필요/.test(col(findO(B), '환불상태')) && mails.length === 1, r);
check('환불 메일에 연락처·토큰 없음', !/buyer@|01012345678/.test(JSON.stringify(mails)) && !JSON.stringify(mails).includes(tokB));

// 10. 열람 전 환불 요청 → 전액 환불 대상, 이후 열람 차단, 중복 요청은 그대로
r = post({ action: 'createOrder', product: 'single', keys: [k2], contact: '01098765432', agree: true });
const C = r.orderId;
r = post({ action: 'confirmPayment', paymentKey: 'tgen_test_C', orderId: C, amount: 9900 });
const tokC = r.token;
r = post({ action: 'refundRequest', o: C, t: tokC, reason: '단순 변심' });
check('열람 전 환불 요청 → 전액 환불 대상', r.ok && /전액 환불 대상/.test(col(findO(C), '환불상태')) && r.order.refundable === false, r);
r = post({ action: 'refundRequest', o: C, t: tokC });
check('중복 환불 요청 → already', r.ok && r.already);
r = post({ action: 'openReport', o: C, t: tokC, open: true });
check('환불 요청 후 열람 차단(환불 기준 보호)', !r.ok && col(findO(C), '최초열람시각') === '');

// 11. 7일 지난 열람 전 주문 → 환불 불가 표시
let rowC2;
r = post({ action: 'createOrder', product: 'single', keys: [k3], contact: '01011112222', agree: true });
const D = r.orderId;
r = post({ action: 'confirmPayment', paymentKey: 'tgen_test_D', orderId: D, amount: 9900 });
const tokD = r.token;
rowC2 = sheets['주문'].rows.find(x => x[T.OC['주문번호']] === D);
rowC2[T.OC['승인시각']] = new Date(Date.now() - 8 * 86400000);
r = post({ action: 'openReport', o: D, t: tokD });
check('7일 경과 → 환불 가능 아님', r.ok && r.order.refundable === false && r.order.viewed === false, r);

// 12. 다시 보기
r = post({ action: 'findOrder', o: D, c: '2222' });
check('휴대폰 뒤 4자리로 찾기 → 새 토큰', r.ok && r.token && r.token !== tokD, r);
r = post({ action: 'openReport', o: D, t: tokD });
check('다시 보기 후 이전 토큰 무효', !r.ok);
r = post({ action: 'findOrder', o: B, c: 'BUYER@example.com' });
check('이메일(대소문자 무관)로 찾기', r.ok, r);
r = post({ action: 'findOrder', o: B, c: 'other@example.com' });
check('다른 이메일 거절', !r.ok);
for (let i = 0; i < 5; i++) post({ action: 'findOrder', o: D, c: '0000' });
r = post({ action: 'findOrder', o: D, c: '2222' });
check('틀린 시도 5회 후 1시간 잠금', !r.ok && /1시간/.test(r.err), r);
r = post({ action: 'findOrder', o: A, c: '5678' });
check('결제 안 된 주문은 찾기 불가', !r.ok);

// 13. 승인 실패·재처리·응답 불일치
r = post({ action: 'createOrder', product: 'single', keys: [k1], contact: '01033334444', agree: true });
const E1 = r.orderId;
tossMode = 'reject';
r = post({ action: 'confirmPayment', paymentKey: 'tgen_test_E', orderId: E1, amount: 9900 });
check('카드 거절 → 승인실패 기록·코드 전달', !r.ok && r.code === 'REJECT_CARD_COMPANY' && col(findO(E1), '상태') === '승인실패', r);
tossMode = 'already'; ctx.__lastOrder = E1; ctx.__lastAmount = 9900;
r = post({ action: 'confirmPayment', paymentKey: 'tgen_test_E', orderId: E1, amount: 9900 });
check('이미 처리된 결제 → 조회로 확인 후 완료', r.ok && col(findO(E1), '상태') === '결제완료', r);
r = post({ action: 'createOrder', product: 'single', keys: [k1], contact: '01033334444', agree: true });
const F = r.orderId;
tossMode = 'wrongAmount';
r = post({ action: 'confirmPayment', paymentKey: 'tgen_test_F', orderId: F, amount: 9900 });
check('승인 응답 금액 불일치 → 열람 토큰 없음', !r.ok && col(findO(F), '상태') === '금액불일치', r);
tossMode = 'ok';

// 14. 시크릿 키 없으면 승인하지 않음
delete props.TOSS_SECRET_KEY;
r = post({ action: 'createOrder', product: 'single', keys: [k1], contact: '01033334444', agree: true });
r = post({ action: 'confirmPayment', paymentKey: 'tgen_test_G', orderId: r.orderId, amount: 9900 });
check('TOSS_SECRET_KEY 없음 → 안내 오류', !r.ok && /설정/.test(r.err), r);

// 15. 기존 기능 영향 없음
r = post({ action: 'nope' });
check('알 수 없는 action', !r.ok && r.err === 'unknown');

console.log(`결제 서버 로직 검증: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
