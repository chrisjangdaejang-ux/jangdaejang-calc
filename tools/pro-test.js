/* 전문가 이름 리포트(tools/agent-backend.gs v17 proSave·proList·proRevoke·proOpen·proClick + assets/pro-report.js) 자동 검증
   실행: node tools/pro-test.js
   구글 시트·토스 API를 흉내 낸 가짜 객체 위에서: 주문 결제·열람 → 전문가 링크 만들기 → 고객 열기 → 고치기·멈추기 → 환불·만료 때 닫힘을 확인합니다.
   (실제 토스·구글 서버에는 접속하지 않습니다.) */
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
const src = fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8');
vm.runInContext(src + '\n;globalThis.__T = { OC, PCX, PH, SH_P, hashOf, PRO_MAX_LINKS, PRO_FAKE };', ctx);
const T = ctx.__T;
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
const R = require(path.join(__dirname, '..', 'assets', 'pro-report.js'));
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra) : ''); } }
const K = (sd, code, dong, apt, band) => [sd, code, dong, apt, band].map(v => encodeURIComponent(v).replace(/~/g, '%7E').replace(/!/g, '%21')).join('~');
const k1 = K('s00', '11710', '가락동', '헬리오시티', '84㎡대'), k2 = K('s00', '11680', '대치동', '은마', '84㎡대');
const pro = () => (sheets['전문가리포트'] ? sheets['전문가리포트'].rows.slice(1) : []);
const pc = (row, h) => row[T.PCX[h]];
const findP = id => pro().find(r => pc(r, 'id') === id);
const ordRow = id => sheets['주문'].rows.find(x => x[T.OC['주문번호']] === id);

function buy(keys, product, phone) {
  let r = post({ action: 'createOrder', product, keys, contact: phone, agree: true });
  const id = r.orderId;
  r = post({ action: 'confirmPayment', paymentKey: 'tgen_' + id, orderId: id, amount: product === 'pack' ? 29000 : 9900 });
  return { o: id, t: r.token };
}
const PROF = { role: 'agent', office: '행복공인중개사사무소', ceo: '홍길동', reg: '11680-2020-00123', addr: '서울 강남구 대치동 900', phone: '02-1234-5678', kakao: 'https://pf.kakao.com/_abc' };
const LOGO = 'data:image/png;base64,' + Buffer.from('fakepng').toString('base64');

// 1. 아직 열어 보지 않은 주문 → 만들 수 없음
const A = buy([k1, k2], 'pack', '01012345678');
let r = post({ action: 'proSave', o: A.o, t: A.t, profile: PROF, secs: ['sum'], notes: {} });
check('열람 전 주문 → 거절', !r.ok && /먼저 한 번 열어/.test(r.err), r);
post({ action: 'openReport', o: A.o, t: A.t, open: true });

// 2. 표시 정보 검사(공인중개사: 등록번호·대표·소재지·연락처)
r = post({ action: 'proSave', o: A.o, t: A.t, profile: Object.assign({}, PROF, { reg: '' }), secs: ['sum'] });
check('공인중개사 등록번호 없음 → 거절', !r.ok && /등록번호/.test(r.err), r);
r = post({ action: 'proSave', o: A.o, t: A.t, profile: Object.assign({}, PROF, { addr: '' }), secs: ['sum'] });
check('소재지 없음 → 거절', !r.ok && /소재지/.test(r.err), r);
r = post({ action: 'proSave', o: A.o, t: A.t, profile: Object.assign({}, PROF, { phone: '123' }), secs: ['sum'] });
check('전화번호 형식 → 거절', !r.ok && /연락처/.test(r.err), r);
r = post({ action: 'proSave', o: A.o, t: A.t, profile: Object.assign({}, PROF, { role: 'member' }), secs: ['sum'] });
check('소속공인중개사 본인 이름 없음 → 거절', !r.ok && /소속공인중개사/.test(r.err), r);
r = post({ action: 'proSave', o: A.o, t: A.t, profile: Object.assign({}, PROF, { role: 'assistant' }), secs: ['sum'] });
check('중개보조원 등 없는 유형 → 거절', !r.ok, r);
r = post({ action: 'proSave', o: A.o, t: A.t, profile: { role: 'pro', office: '김세무회계', name: '김세무', title: '세무사', phone: '010-2222-3333' }, secs: ['sum'] });
check('다른 전문가는 등록번호 없이 가능', r.ok, r);
r = post({ action: 'proSave', o: A.o, t: A.t, profile: Object.assign({}, PROF, { office: '집예보 공식 인증 중개사' }), secs: ['sum'] });
check('이름에 집예보 사칭 → 거절', !r.ok, r);
r = post({ action: 'proSave', o: A.o, t: A.t, profile: PROF, secs: ['sum'], notes: { summary: '집예보 분석 결과 꼭 오릅니다' } });
check('의견에 집예보 분석 사칭 → 거절', !r.ok && /집예보가 쓴 것처럼/.test(r.err), r);
r = post({ action: 'proSave', o: A.o, t: A.t, profile: Object.assign({}, PROF, { logo: 'data:image/svg+xml;base64,PHN2Zz4=' }), secs: ['sum'] });
check('SVG 로고 거절(스크립트 위험)', !r.ok, r);
r = post({ action: 'proSave', o: A.o, t: A.t, profile: Object.assign({}, PROF, { logo: 'data:image/png;base64,' + 'A'.repeat(50000) }), secs: ['sum'] });
check('큰 로고 거절', !r.ok, r);
r = post({ action: 'proSave', o: A.o, t: A.t, profile: PROF, secs: ['nope'] });
check('항목 없음 → 거절', !r.ok, r);
r = post({ action: 'proSave', o: A.o, t: 'x'.repeat(64), profile: PROF, secs: ['sum'] });
check('주문 토큰 틀림 → 거절', !r.ok, r);

// 3. 정상 만들기
const notes = { summary: '학군 보시는 고객님께 맞아요.\n<script>x</script>', '0.fv': '현장 확인 필요', '9.fv': '버림', closing: '연락 주세요', evil: 'x' };
r = post({ action: 'proSave', o: A.o, t: A.t, profile: Object.assign({}, PROF, { logo: LOGO }), client: '김○○', notes, secs: ['sum', 'fv', 'money', 'fv', 'zz'],
  cond: { income: 8000, cash: 50000, own: 'none', rate: 4.1 }, days: 90, dataTo: '202610' });
check('만들기 성공 + 링크 id·토큰', r.ok && /^P[0-9A-F]{11}$/.test(r.id) && /^[0-9a-f]{64}$/.test(r.token), r);
const L1 = r;
let row = findP(L1.id);
check('토큰 원값 미저장(해시만)', pc(row, '토큰해시') === T.hashOf('pro|' + L1.token) && !JSON.stringify(sheets['전문가리포트'].rows).includes(L1.token));
check('주문 열람 토큰·고객 연락처 미저장', !JSON.stringify(sheets['전문가리포트'].rows).includes(A.t) && !JSON.stringify(sheets['전문가리포트'].rows).includes('01012345678'));
check('섹션 정리(중복·없는 키 제거)', pc(row, '섹션') === JSON.stringify(['sum', 'fv', 'money']));
const sn = JSON.parse(pc(row, '의견'));
check('의견: 허용 키만, 꺾쇠 제거', sn.summary && !/[<>]/.test(sn.summary) && sn['0.fv'] && !sn['9.fv'] && !sn.evil, sn);
check('대출 조건: 대출 칸 넣을 때만 저장', JSON.parse(pc(row, '조건')).income === 8000);
const exp1 = pc(row, '만료일'), days1 = (exp1 - Date.now()) / 86400000;
check('만료 90일', days1 > 89 && days1 <= 90.01, days1);
check('유형은 법정 명칭으로 기록', pc(row, '유형') === '개업공인중개사');

// 4. 고객 열기
r = post({ action: 'proOpen', id: L1.id, tk: L1.token });
check('고객 열기 성공 + 단지 키', r.ok && r.report.keys.length === 2 && r.report.profile.office === PROF.office && r.report.profile.role === 'agent' && r.report.client === '김○○', r);
check('고객 응답에 주문번호·토큰·결제 정보 없음', !JSON.stringify(r).includes(A.o) && !JSON.stringify(r).includes(A.t) && !/tgen_|열람횟수|views/.test(JSON.stringify(r)));
check('고객 응답에 숫자(점수·시세) 없음 — 열 때마다 공개 자료로 다시 계산', !('fv' in r.report) && !('price' in r.report));
check('열람 횟수 기록', pc(findP(L1.id), '열람횟수') === 1);
r = post({ action: 'proOpen', id: L1.id, tk: L1.token.slice(0, -1) + (L1.token.slice(-1) === 'a' ? 'b' : 'a') });
check('틀린 토큰 → 거절', !r.ok, r);
r = post({ action: 'proOpen', id: 'P00000000000', tk: L1.token });
check('없는 링크 → 거절', !r.ok);
r = post({ action: 'proClick', id: L1.id, tk: L1.token, kind: 'call' });
check('문의 버튼 횟수만 기록', r.ok && pc(findP(L1.id), '문의클릭') === 1);

// 5. 목록·고치기(링크 그대로)·다른 주문은 못 고침
r = post({ action: 'proList', o: A.o, t: A.t });
check('목록: 내 주문 링크만 + 열람·문의 수', r.ok && r.links.length === 2 && r.links.some(x => x.id === L1.id && x.views === 1 && x.clicks === 1), r);
r = post({ action: 'proSave', o: A.o, t: A.t, id: L1.id, profile: PROF, client: '', notes: { summary: '고친 의견' }, secs: ['fv'], days: 30 });
check('고치기 성공(새 토큰 없음)', r.ok && r.updated && !r.token, r);
r = post({ action: 'proOpen', id: L1.id, tk: L1.token });
check('고친 뒤 같은 링크로 새 내용', r.ok && r.report.notes.summary === '고친 의견' && r.report.secs.join() === 'fv' && r.report.cond === null && !r.report.profile.logo, r);
const B = buy([k1], 'single', '01055556666'); post({ action: 'openReport', o: B.o, t: B.t, open: true });
r = post({ action: 'proSave', o: B.o, t: B.t, id: L1.id, profile: PROF, secs: ['sum'] });
check('다른 주문으로 남의 링크 고치기 거절', !r.ok, r);
r = post({ action: 'proRevoke', o: B.o, t: B.t, id: L1.id });
check('다른 주문으로 남의 링크 멈추기 거절', !r.ok, r);

// 6. 멈추기 → 열 수 없음 → 다시 열기
r = post({ action: 'proRevoke', o: A.o, t: A.t, id: L1.id });
check('멈추기', r.ok && pc(findP(L1.id), '상태') === '멈춤');
r = post({ action: 'proOpen', id: L1.id, tk: L1.token });
check('멈춘 링크 → 열 수 없음', !r.ok);
post({ action: 'proRevoke', o: A.o, t: A.t, id: L1.id, on: true });
check('다시 열기', post({ action: 'proOpen', id: L1.id, tk: L1.token }).ok);

// 7. 링크 만료·주문 열람 기간 끝·환불 요청 → 닫힘
const rowL = sheets['전문가리포트'].rows.find(x => x[T.PCX['id']] === L1.id);
const keep = rowL[T.PCX['만료일']]; rowL[T.PCX['만료일']] = new Date(Date.now() - 1000);
check('링크 만료 → 열 수 없음', !post({ action: 'proOpen', id: L1.id, tk: L1.token }).ok);
rowL[T.PCX['만료일']] = keep;
const oa = ordRow(A.o), paidKeep = oa[T.OC['승인시각']]; oa[T.OC['승인시각']] = new Date(Date.now() - 366 * 86400000);
check('주문 열람 기간 끝 → 고객 링크도 닫힘', !post({ action: 'proOpen', id: L1.id, tk: L1.token }).ok);
oa[T.OC['승인시각']] = paidKeep;
r = post({ action: 'proSave', o: B.o, t: B.t, profile: PROF, secs: ['sum'], days: 90 });
const LB = r;
const ob = ordRow(B.o); ob[T.OC['승인시각']] = new Date(Date.now() - 330 * 86400000);
r = post({ action: 'proSave', o: B.o, t: B.t, profile: PROF, secs: ['sum'], days: 90 });
const left = (findP(r.id)[T.PCX['만료일']] - Date.now()) / 86400000;
check('만료일은 주문 열람 기간을 넘지 않음', r.ok && left < 36 && left > 34, left);
post({ action: 'refundRequest', o: B.o, t: B.t, reason: '테스트' });
check('환불 요청 → 고객 링크 닫힘', !post({ action: 'proOpen', id: LB.id, tk: LB.token }).ok);
check('환불 요청 → 새 링크 못 만듦', !post({ action: 'proSave', o: B.o, t: B.t, profile: PROF, secs: ['sum'] }).ok);

// 8. 주문 1건 링크 상한
for (let i = pro().filter(x => pc(x, '주문번호') === A.o).length; i < T.PRO_MAX_LINKS; i++) post({ action: 'proSave', o: A.o, t: A.t, profile: PROF, secs: ['sum'] });
r = post({ action: 'proSave', o: A.o, t: A.t, profile: PROF, secs: ['sum'] });
check(`링크 상한 ${T.PRO_MAX_LINKS}개`, !r.ok && /까지/.test(r.err), r);
check('기간 고르지 않음/엉뚱한 값 → 30일', (() => { const x = pro().filter(q => pc(q, '주문번호') === A.o).slice(-1)[0]; const d = (pc(x, '만료일') - Date.now()) / 86400000; return d > 29 && d <= 30.01; })());

// 9. 링크 맞히기 막기: 같은 id로 20번 틀리면 1시간 잠금
for (let i = 0; i < 20; i++) post({ action: 'proOpen', id: L1.id, tk: 'f'.repeat(64) });
r = post({ action: 'proOpen', id: L1.id, tk: L1.token });
check('틀린 시도 많으면 잠금', !r.ok && /시도가 많아/.test(r.err), r);

// 10. 화면 모듈(assets/pro-report.js) — 서버와 같은 규칙
check('링크 # 형식', R.linkOf(L1.id, L1.token).endsWith('/premium/r/#' + L1.id + '.' + L1.token) && R.parseHash('#' + L1.id + '.' + L1.token).tk === L1.token);
check('잘못된 # 거절', R.parseHash('#P123.abc') === null && R.parseHash('#jv=abc') === null && R.parseHash('') === null);
const pe = p => R.profileError(R.cleanProfile(p));
check('화면 검사: 정상', pe(PROF) === '');
check('화면 검사: 등록번호', /등록번호/.test(pe(Object.assign({}, PROF, { reg: '' }))));
check('화면 검사: 소속 본인 이름', /소속공인중개사/.test(pe(Object.assign({}, PROF, { role: 'member' }))));
check('화면 검사: 자격사 이름', /이름/.test(pe({ role: 'licensed', title: '세무사', office: 'a', phone: '010-1111-2222' })));
check('화면 검사: 예전 유형(pro) → 컨설팅·전문가(활동명·연락처만)', pe({ role: 'pro', office: 'a', phone: '010-1111-2222' }) === '' && R.cleanProfile({ role: 'pro' }).role === 'consult'
  && R.cleanProfile({ role: 'pro', title: '세무사' }).role === 'licensed');
check('화면 검사: 사칭', pe(Object.assign({}, PROF, { office: '집예보 인증 사무소' })) !== '');
check('화면·서버 사칭 규칙 같음', String(R.FAKE) === String(T.PRO_FAKE));
check('의견 사칭 검사', /집예보가 쓴/.test(R.notesError({ summary: '집예보의 분석으로는 확실' })) && R.notesError({ summary: '집예보 숫자를 같이 보세요' }) === '');
check('의견 상자 이름', R.opinionLabel(R.cleanProfile(PROF)) === '홍길동 공인중개사 의견' && R.opinionLabel(R.cleanProfile({ role: 'member', ceo: '홍길동', name: '이소속' })) === '이소속 공인중개사 의견'
  && R.opinionLabel(R.cleanProfile({ role: 'pro', name: '김세무', title: '세무사' })) === '김세무 세무사 의견');
const nh = R.noteHtml(R.cleanProfile(PROF), '<img src=x onerror=alert(1)>\n둘째 줄', 'summary');
check('의견 글은 글자로만(HTML 불가)', !/<img/.test(nh) && /&lt;img/.test(nh) && /<br>/.test(nh));
const hh = R.headHtml(R.cleanProfile(Object.assign({}, PROF, { logo: 'javascript:alert(1)' })));
check('머리말: 등록번호·소재지·연락처 표시, 이상한 로고 무시', /중개사무소 등록번호 11680-2020-00123/.test(hh) && /서울 강남구/.test(hh) && /02-1234-5678/.test(hh) && !/javascript:/.test(hh));
check('카카오 주소는 카카오 도메인만', R.cleanProfile({ kakao: 'https://evil.com/x' }).kakao === '' && R.cleanProfile({ kakao: 'https://open.kakao.com/o/abc' }).kakao);
const fh = R.footHtml({ refresh: true });
check('하단 출처 표기: 데이터·분석 집예보', /데이터·분석: 집예보/.test(fh));
check('항목 정리', R.cleanSecs(['fv', 'fv', 'x', 'money']).join() === 'fv,money');

// 11. v20 유형 확대: 분양대행사 · 부동산 컨설팅·전문가 · 자격사 (중개보조원 제외, 공인중개사 법정 표기 유지)
const BIZ = '1208147521';   // 체크섬이 맞는 예시 번호
const SELLER = { role: 'seller', office: '한빛분양대행(주)', biz: BIZ, ceo: '김대표', name: '이담당', title: '○○역 현장 분양 상담', phone: '02-3333-4444' };
const C = buy([k1], 'single', '01077778888'); post({ action: 'openReport', o: C.o, t: C.t, open: true });
r = post({ action: 'proSave', o: C.o, t: C.t, profile: SELLER, secs: ['sum'], notes: { summary: '현장 견본주택에서 평면을 같이 보세요.' } });
check('분양대행사 저장', r.ok, r);
row = findP(r.id);
check('분양대행사: 유형·직함·사업자번호 기록', pc(row, '유형') === '분양대행사' && pc(row, '직함') === SELLER.title && String(pc(row, '사업자번호')).replace(/\D/g, '') === BIZ, row);
let op = post({ action: 'proOpen', id: r.id, tk: r.token });
check('분양대행사: 고객 열기에 유형·사업자번호·직함', op.ok && op.report.profile.role === 'seller' && op.report.profile.biz === BIZ && op.report.profile.title === SELLER.title, op);
const sp = R.cleanProfile(op.report.profile);
check('분양대행사: 의견 상자 이름', R.opinionLabel(sp) === '한빛분양대행(주) 분양대행 의견', R.opinionLabel(sp));
check('분양대행사: 머리말에 사업자등록번호·대표자, 의견에 판매 회사 안내', /사업자등록번호 120-81-47521/.test(R.headHtml(sp)) && /대표 김대표/.test(R.headHtml(sp)) && /분양 판매를 맡은 회사/.test(R.noteHtml(sp, 'x', 'summary')));
r = post({ action: 'proSave', o: C.o, t: C.t, profile: Object.assign({}, SELLER, { biz: '' }), secs: ['sum'] });
check('분양대행사: 사업자등록번호 없어도 저장(선택 항목, 대표 결정 11/21)', r.ok, r);
r = post({ action: 'proSave', o: C.o, t: C.t, profile: Object.assign({}, SELLER, { biz: '1208147520' }), secs: ['sum'] });
check('분양대행사: 사업자등록번호 체크섬 틀림 → 거절', !r.ok && /다시 확인/.test(r.err), r);
r = post({ action: 'proSave', o: C.o, t: C.t, profile: Object.assign({}, SELLER, { ceo: '' }), secs: ['sum'] });
check('분양대행사: 대표자 없어도 저장(선택 항목)', r.ok, r);
r = post({ action: 'proSave', o: C.o, t: C.t, profile: Object.assign({}, SELLER, { office: '한빛공인중개사사무소' }), secs: ['sum'] });
check('공인중개사 아닌 유형이 중개사 명칭 사용 → 거절(제18조)', !r.ok && /제18조/.test(r.err), r);
check('화면 검사도 같음: 분양대행사', pe(SELLER) === '' && pe(Object.assign({}, SELLER, { biz: '' })) === '' && /제18조/.test(pe(Object.assign({}, SELLER, { office: '행복공인중개사사무소' }))));
const CONS = { role: 'consult', office: '장대장TV', name: '장대장', title: '유튜브·경제방송 출연', phone: '02-3444-5008' };
r = post({ action: 'proSave', o: C.o, t: C.t, profile: CONS, secs: ['fv'] });
check('컨설팅·전문가: 활동명·연락처만으로 저장(사업자번호 선택)', r.ok, r);
op = post({ action: 'proOpen', id: r.id, tk: r.token });
check('컨설팅·전문가: 의견 상자 이름', op.ok && op.report.profile.role === 'consult' && R.opinionLabel(R.cleanProfile(op.report.profile)) === '장대장 부동산 전문가 의견', op.report && op.report.profile);
r = post({ action: 'proSave', o: C.o, t: C.t, profile: Object.assign({}, CONS, { office: '' }), secs: ['fv'] });
check('컨설팅·전문가: 상호·활동명 없음 → 거절', !r.ok && /활동명/.test(r.err), r);
const TAX = { role: 'licensed', title: '세무사', name: '김세무', office: '김세무회계', phone: '02-555-6666' };
r = post({ action: 'proSave', o: C.o, t: C.t, profile: TAX, secs: ['money'], notes: { summary: '양도세 신고 수임료 50% 할인해 드려요' } });
check('세무사: 수임료 할인 문구 → 거절(광고 규정)', !r.ok && /세무사 광고 규정/.test(r.err), r);
r = post({ action: 'proSave', o: C.o, t: C.t, profile: TAX, secs: ['money'], notes: { summary: '상담 고객께 상품권 드립니다' } });
check('세무사: 금전 혜택 문구 → 거절', !r.ok, r);
r = post({ action: 'proSave', o: C.o, t: C.t, profile: TAX, secs: ['money'], notes: { summary: '1주택 비과세 요건(보유 2년)을 먼저 확인해 보세요.' } });
check('세무사: 일반 의견은 저장', r.ok, r);
op = post({ action: 'proOpen', id: r.id, tk: r.token });
check('세무사: 고객 화면 자격명 표기', op.ok && R.opinionLabel(R.cleanProfile(op.report.profile)) === '김세무 세무사 의견' && /세무사 김세무/.test(R.headHtml(R.cleanProfile(op.report.profile))), op.report && op.report.profile);
check('화면 검사: 세무사 금지 문구', /세무사 광고 규정/.test(R.notesError({ summary: '기장료 최저가 비교' }, R.cleanProfile(TAX))) && R.notesError({ summary: '기장료 최저가 비교' }, R.cleanProfile(CONS)) === '');
r = post({ action: 'proSave', o: C.o, t: C.t, profile: Object.assign({}, TAX, { title: '대출상담사' }), secs: ['sum'] });
check('자격사: 목록에 없는 자격 → 거절', !r.ok && /자격/.test(r.err), r);
r = post({ action: 'proSave', o: C.o, t: C.t, profile: Object.assign({}, PROF, { role: 'member', name: '박보조', title: '중개보조원' }), secs: ['sum'] });
check('중개보조원 직함 → 거절', !r.ok && /중개보조원/.test(r.err), r);
check('화면 검사: 중개보조원', /중개보조원/.test(pe({ role: 'consult', office: '중개보조원 박○○', phone: '010-1111-2222' })));
check('공인중개사 법정 표기 유지', /중개사무소 등록번호 11680-2020-00123/.test(R.headHtml(R.cleanProfile(PROF))) && /대표 공인중개사 홍길동/.test(R.headHtml(R.cleanProfile(PROF))));
check('유형 키 화면·서버 같음', Object.keys(R.ROLE).join() === Object.keys(vm.runInContext('PRO_ROLE', ctx)).join());

// 대표 결정 11/21: 공인중개사가 아닌 전문가(교수·컨설팅 직원 등)는 이름·활동명과 연락 방법 하나만
{
  const PF = { role: 'consult', office: '○○대 부동산학과', title: '○○대 교수', phone: '', kakao: 'https://pf.kakao.com/_abc' };
  check('교수·컨설턴트: 전화 없이 카톡 채널만 있어도 통과(화면)', pe(PF) === '', pe(PF));
  check('교수·컨설턴트: 연락 방법이 하나도 없으면 안내(화면)', /전화번호나 카카오톡/.test(pe(Object.assign({}, PF, { kakao: '' }))));
  check('공인중개사는 전화번호 계속 필수(화면)', /공인중개사는 연락처/.test(pe(Object.assign({}, PROF, { phone: '' }))), pe(Object.assign({}, PROF, { phone: '' })));
}
console.log(`전문가 이름 리포트 검증: ${pass}개 확인, ${fail}개 어긋남`);
process.exit(fail ? 1 : 0);

