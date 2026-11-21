/* 모닝 브리핑 서버 로직(tools/agent-backend.gs v18~v22) 자동 검증 — 실행: node tools/brief-test.js
   가짜 구글 시트·토스·솔라피·공개 데이터 위에서: 동네 저장 → 7일 체험 → 이용권 주문·승인(이어 붙이기) → 아침 발송(이메일·알림톡)
   → 만료 안내 → 해지·환불 예정액 → 집계(개인정보 없음) → 연락처 정리를 확인합니다. (실제 서버에는 접속하지 않습니다.) */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');

function makeSheet() {
  const rows = [];
  const sh = {
    rows,
    getDataRange() { return { getValues: () => rows.map(r => r.slice()) }; },
    getLastRow() { return rows.length; },
    appendRow(r) { rows.push(r.slice()); },
    deleteRow(i) { rows.splice(i - 1, 1); },
    setFrozenRows() {},
    getRange(r, c, nr, nc) {
      const rg = {
        setValues(v) { v.forEach((line, i) => line.forEach((x, j) => { (rows[r - 1 + i] = rows[r - 1 + i] || [])[c - 1 + j] = x; })); return rg; },
        setValue(x) { (rows[r - 1] = rows[r - 1] || [])[c - 1] = x; return rg; },
        getValue() { return (rows[r - 1] || [])[c - 1]; },
        getValues() { const out = []; for (let i = 0; i < (nr || 1); i++) out.push((rows[r - 1 + i] || []).slice(c - 1, c - 1 + (nc || 1))); return out; },
        setFontWeight() { return rg; }, setBackground() { return rg; }, setFontColor() { return rg; }, setNumberFormat() { return rg; }
      };
      return rg;
    }
  };
  return sh;
}
const sheets = {};
const book = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet()), getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST', getSheets: () => Object.values(sheets), deleteSheet() {} };
sheets['중개사'] = makeSheet(); sheets['로그'] = makeSheet();
const props = { TOSS_SECRET_KEY: 'test_sk_FAKE', BRIEF_PULL_TOKEN: 'pull-FAKE-123' };
const cacheMap = new Map(), mails = [], fetches = [];
let NOW = Date.parse('2026-11-21T07:10:00+09:00');
const RealDate = Date;
class FakeDate extends RealDate { constructor(...a) { if (!a.length) super(NOW); else super(...a); } static now() { return NOW; } }
const BRIEF = {
  '11710': { g: '11710', name: '송파구', trades: [{ d: '잠실동', a: '리센츠', b: '84㎡대', p: 333000, dr: -9.9 }, { d: '가락동', a: '헬리오시티', b: '49㎡대', p: 247000, hi: 1 }],
    lines: { '': { fact: '송파구에서 새로 올라온 매매 거래는 2건이에요.' }, '잠실동': { fact: '잠실동에서 새로 올라온 매매 거래는 1건이에요.' } }, pro: { '': ['"한 줄"'], '잠실동': ['"잠실 한 줄"'] } },
  '11320': { g: '11320', name: '도봉구', trades: [], lines: { '': { fact: '도봉구 새 거래 없음' } }, pro: {} }
};
const ctx = {
  console, Date: FakeDate, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, encodeURIComponent, decodeURIComponent,
  SpreadsheetApp: { getActive: () => book, openById: () => book },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: k => cacheMap.has(k) ? cacheMap.get(k) : null, put: (k, v) => cacheMap.set(k, v), remove: k => cacheMap.delete(k) }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail: (...a) => mails.push(a) },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ inTimezone: () => ({ create() {} }) }) }) }) }) },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  HtmlService: { createHtmlOutput: s => ({ s }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    formatDate: (d, tz, f) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
        .formatToParts(d).map(x => [x.type, x.value]));
      return f.replace('yyyy', p.year).replace('yy', p.year.slice(2)).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour === '24' ? '00' : p.hour).replace('hh', p.hour).replace('mm', p.minute);
    },
    computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
    computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', k).update(v).digest()).map(b => b > 127 ? b - 256 : b),
    base64Encode: s => Buffer.from(s).toString('base64'),
    sleep() {}, DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
  },
  UrlFetchApp: {
    fetch(url, opt) {
      opt = opt || {};
      fetches.push({ url, opt });
      const send = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
      const m = url.match(/data\/brief\/(\w+)\.json/);
      if (m && m[1] === 'market') return send(200, MARKET);
      if (m) return m[1] === 'index' ? send(200, { date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new RealDate(NOW)) }) : BRIEF[m[1]] ? send(200, BRIEF[m[1]]) : send(404, {});
      if (url.indexOf('api.solapi.com') >= 0) return send(200, { groupInfo: { count: { total: 1 } } });
      const body = opt.payload ? JSON.parse(opt.payload) : null;
      return send(200, { status: 'DONE', orderId: body.orderId, totalAmount: body.amount, method: '카드', approvedAt: new FakeDate().toISOString() });
    }
  }
};
const MARKET = { date: '2026-11-21', name: '집예보 모닝 브리핑', win: { from: '2026-11-20', to: '2026-11-21' },
  kr: { n: 812, nhi: 40, hi: [{ sd: '서울', gn: '강남구', d: '압구정동', a: '현대7차', b: '245㎡대', p: 1150000, pm: 1050000, pmd: 20260301, up: 9.5 }], drop: [{ sd: '경기', gn: '화성시', d: '청계동', a: '예시', b: '84㎡대', p: 60000, m2: 80000, m2d: 20250501, dr: -25 }] },
  seoul: { n: 120, nhi: 12, hi: [], drop: [] }, policy: [{ name: '주담대 한도 조정', stage: '시행', d: '2026-11-17', scope: '전국' }], rate: null,
  cy: { n: 3, rows: [{ n: '이번 주 단지', sd: '서울', gn: '송파구', sp: ['20261117', ''], rc: ['20261118', '20261119'] }] }, lines: ['전국에서 어제 새로 올라온 아파트 매매는 812건이에요.'] };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8')
  + '\n;globalThis.__T = { BC, OC, UC, SC, UH, SSH, BRIEF_PRICE, BRIEF_TRIAL, BRIEF_NAME, SITE_NAME, bProdKey, briefPublic, briefStats, briefSeen, bKey, hashOf, cleanBrief, briefDaily, briefState, bRows, briefAreas, briefInterest, briefCleanup };', ctx);
const T = ctx.__T;
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
const get = p => JSON.parse(ctx.doGet({ parameter: p }).s);

let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra) : ''); } }

/* 회원 2명(세션 토큰) 만들기 */
sheets['회원'] = makeSheet(); sheets['세션'] = makeSheet();
sheets['회원'].appendRow(T.UH); sheets['세션'].appendRow(T.SSH);
function member(id) {
  const s = crypto.randomBytes(32).toString('hex'), r = [], q = [];
  r[T.UC['카카오id']] = 'k' + id; r[T.UC['닉네임']] = '회원' + id; r[T.UC['저장자료']] = ''; sheets['회원'].appendRow(r);
  q[T.SC['세션해시']] = T.hashOf('ses|' + s); q[T.SC['카카오id']] = 'k' + id; q[T.SC['만든날']] = new FakeDate(); q[T.SC['만료일']] = new FakeDate(NOW + 90 * 86400000);
  sheets['세션'].appendRow(q);
  return s;
}
const s1 = member(111), s2 = member(222);
const subRows = () => (sheets['브리핑구독'] ? sheets['브리핑구독'].rows.slice(1) : []);
const bc = (r, h) => r[T.BC[h]];

// 1. 동네 저장(userSave brief) — 동·개수 정리
let r = post({ action: 'userSave', s: s1, data: { brief: { areas: [{ g: '11710', gn: '송파구', sd: '서울특별시', dn: '잠실동' }, { g: '11710', gn: '송파구', sd: '서울특별시', dn: '잠실동' },
  { g: '11320', gn: '도봉구', sd: '서울특별시', dn: '' }, { g: 'x', gn: 'bad' }, { g: '11680', gn: '강남구', dn: '<b>' }], apts: ['리센츠'], email: 'x@y.z' } } });
check('동네 저장: 중복·잘못된 값 제거', r.ok && r.data.brief.areas.length === 2 && r.data.brief.areas[0].dn === '잠실동' && !('email' in r.data.brief), r.data && r.data.brief);
check('불러오기에 brief 포함', post({ action: 'userLoad', s: s1 }).data.brief.areas.length === 2);

// 2. 설정·체험
const cfg = get({ action: 'briefConfig' });
check('채널: 키 없으면 카카오 꺼짐', cfg.ok && cfg.channels.email === true && cfg.channels.kakao === false, cfg);
r = post({ action: 'briefTrial', s: s1, channel: 'kakao', contact: '01012345678', privacy: true });
check('키 없는데 카카오 고르면 거절', !r.ok && /준비 중/.test(r.err), r);
r = post({ action: 'briefTrial', s: s1, channel: 'email', contact: 'me@example.com', privacy: false });
check('연락처 동의 없으면 거절', !r.ok, r);
r = post({ action: 'briefTrial', s: 'f'.repeat(64), channel: 'email', contact: 'me@example.com', privacy: true });
check('로그인 없으면 거절', !r.ok && r.code === 'auth', r);
r = post({ action: 'briefTrial', s: s2, channel: 'email', contact: 'b@example.com', privacy: true });
check('동네 없으면 거절', !r.ok && /동네/.test(r.err), r);
r = post({ action: 'briefTrial', s: s1, channel: 'email', contact: 'Me@Example.com', privacy: true });
check('7일 체험 시작(오늘~6일 뒤)', r.ok && r.sub.active && r.sub.start === '2026-11-21' && r.sub.end === '2026-11-27' && r.sub.contact === 'me***@example.com', r);
r = post({ action: 'briefTrial', s: s1, channel: 'email', contact: 'me@example.com', privacy: true });
check('체험은 한 번만', !r.ok && /한 번/.test(r.err), r);

// 3. 이용권 주문·승인 — 체험이 끝난 다음 날부터 이어 붙임
r = post({ action: 'briefOrder', s: s1, product: 'brief', channel: 'email', contact: 'me@example.com', privacy: true, agree: false });
check('환불 안내 동의 없으면 거절', !r.ok, r);
r = post({ action: 'briefOrder', s: s1, product: 'brief_pro', channel: 'email', contact: 'me@example.com', privacy: true, agree: true, amount: 10 });
check('주문: 서버 가격 4,900원', r.ok && r.amount === 4900 && /^JDJ\d{6}-[0-9A-F]{10}$/.test(r.orderId), r);
const OID = r.orderId;
const ord = sheets['주문'].rows.find(x => x[T.OC['주문번호']] === OID);
check('주문 시트: 연락처 가린 값만', ord && ord[T.OC['연락처']] === 'me***@example.com' && !JSON.stringify(ord).includes('me@example.com'));
r = post({ action: 'briefConfirm', paymentKey: 'tgen_b1', orderId: OID, amount: 100 });
check('금액 위변조 거절', !r.ok, r);
r = post({ action: 'briefOrder', s: s1, product: 'brief_pro', channel: 'email', contact: 'me@example.com', privacy: true, agree: true });
const OID2 = r.orderId;
r = post({ action: 'briefConfirm', paymentKey: 'tgen_b2', orderId: OID2, amount: 4900 });
check('승인 → 체험 끝난 다음 날부터 30일', r.ok && r.sub.start === '2026-11-28' && r.sub.end === '2026-12-27' && r.sub.pro === true, r);
r = post({ action: 'briefConfirm', paymentKey: 'tgen_b2', orderId: OID2, amount: 4900 });
check('같은 결제키 다시 → 그대로', r.ok && r.sub.start === '2026-11-28', r);
r = post({ action: 'confirmPayment', paymentKey: 'tgen_other', orderId: OID2, amount: 4900 });
check('리포트 승인 경로로 다른 결제키 → 거절', !r.ok, r);

// 4. 아침 발송
const sent = T.briefDaily();
check('발송 1건(체험 중 회원)', sent === 1, sent);
const m = mails.find(a => a[0] && a[0].to === 'me@example.com');
check('이메일: 받는 사람·제목·동 단위 내용', !!m && /11\/21 집예보 모닝 브리핑/.test(m[0].subject) && /송파구 잠실동/.test(m[0].htmlBody) && /잠실동에서 새로 올라온/.test(m[0].htmlBody) && /도봉구/.test(m[0].htmlBody), m && m[0].subject);
check('메일: ① 전국 시장(신고가 TOP·하락·정책·이번 주 청약) 먼저', !!m && /① 오늘의 부동산 시장/.test(m[0].htmlBody) && /압구정동 현대7차 245㎡대 115억 원/.test(m[0].htmlBody)
  && /주담대 한도 조정/.test(m[0].htmlBody) && /이번 주 단지/.test(m[0].htmlBody) && m[0].htmlBody.indexOf('① 오늘의') < m[0].htmlBody.indexOf('송파구 잠실동'));
check('시장 자료는 하루 한 번만 받음', fetches.filter(f => /market\.json/.test(f.url)).length === 1);
check('이름은 SITE_NAME 한 곳에서', T.BRIEF_NAME === T.SITE_NAME + ' 모닝 브리핑' && T.BRIEF_PRICE.brief.name === T.BRIEF_NAME + ' 1개월' && T.BRIEF_TRIAL.name === T.BRIEF_NAME + ' 7일 체험');
check('예전 이름 행도 인식', T.bProdKey('아침 브리핑 중개사용 1개월') === 'brief_pro' && T.bProdKey('아침 브리핑 7일 체험') === 'trial' && T.bProdKey(T.BRIEF_PRICE.brief.name) === 'brief' && T.bProdKey('다른 상품') === '');
check('메일: 링크에 열람 표시(구독 id 해시, 연락처 없음)', !!m && /src=mail&amp;k=[0-9a-f]{10}|src=mail&k=[0-9a-f]{10}/.test(m[0].htmlBody) && !/me@example\.com/.test(m[0].htmlBody.split('src=mail')[1] || ''));
check('메일: [지역·단지 바꾸기] 버튼', !!m && /지역·단지 바꾸기/.test(m[0].htmlBody));
check('공개 통계: 구독자 10명 미만이면 숫자 없음', T.briefPublic().n === null);
check('열람 기록: 잘못된 값 거절·같은 날 한 번만', !T.briefSeen({ k: 'xx', d: '2026-11-21' }).ok && T.briefSeen({ k: 'abcdef0123', d: '2026-11-21' }).ok && T.briefSeen({ k: 'abcdef0123', d: '2026-11-21' }).ok && sheets['브리핑열람'].rows.length === 2);
(() => { const sh = sheets['브리핑구독']; for (let i = 0; i < 12; i++) { const r = []; r[T.BC['id']] = 'X' + i; r[T.BC['상품']] = i < 11 ? T.BRIEF_PRICE.brief.name : '아침 브리핑 7일 체험'; r[T.BC['상태']] = i < 11 ? '이용' : '체험';
  r[T.BC['시작일']] = '2026-11-01'; r[T.BC['만료일']] = '2026-12-30'; r[T.BC['카카오id']] = 'kx' + i; sh.rows.push(r); } })();
const PUB = T.briefPublic();
check('공개 통계: 10명 이상이면 구독자 수·유료 수, 10명 미만 칸 숨김', PUB.n >= 12 && PUB.paid >= 11 && Object.keys(PUB.budget).length === 0 && PUB.open === null && PUB.name === T.BRIEF_NAME, PUB);
check('운영자 통계: 토큰 없으면 거절', T.briefStats({ k: 'nope' }).ok === false);
check('체험(일반)은 중개사 줄 없음', m && !/손님께 할 이야기/.test(m[0].htmlBody));
check('같은 날 두 번 안 보냄', T.briefDaily() === undefined && mails.filter(a => a[0] && a[0].to === 'me@example.com').length === 1);
check('발송기록: 연락처 없음', sheets['발송기록'] && !JSON.stringify(sheets['발송기록'].rows).includes('me@example.com'));

// 5. 알림톡 켜기 → 채널 바꾸기 → 다음 날 솔라피 호출
Object.assign(props, { SOLAPI_API_KEY: 'KEYFAKE', SOLAPI_API_SECRET: 'SECRETFAKE', SOLAPI_PFID: 'KA01PFFAKE', SOLAPI_TPL_BRIEF: 'TPLFAKE', SOLAPI_TPL_EXPIRE: 'TPLEXP' });
const mine = post({ action: 'briefMine', s: s1 });
check('내 구독 2개 + 카카오 켜짐', mine.ok && mine.subs.length === 2 && mine.channels.kakao && mine.trialUsed, mine);
const trialId = mine.subs.find(x => /체험/.test(x.product)).id, paidId = mine.subs.find(x => x.orderId).id;
r = post({ action: 'briefUpdate', s: s1, id: trialId, channel: 'kakao', contact: '' });
check('채널 바꿀 때 연락처 없으면 거절', !r.ok, r);
r = post({ action: 'briefUpdate', s: s1, id: trialId, channel: 'kakao', contact: '010-1234-5678' });
check('카카오톡으로 변경', r.ok && r.sub.channel === 'kakao' && r.sub.contact === '010-****-5678', r);
NOW += 86400000; fetches.length = 0;
T.briefDaily();
const sol = fetches.find(f => f.url.indexOf('solapi') >= 0);
const sp = sol && JSON.parse(sol.opt.payload).messages[0];
check('솔라피 HMAC 인증·템플릿 변수', !!sol && /^HMAC-SHA256 apiKey=KEYFAKE, date=.+, salt=\w+, signature=[0-9a-f]{64}$/.test(sol.opt.headers.Authorization)
  && sp.to === '01012345678' && sp.kakaoOptions.templateId === 'TPLFAKE' && sp.kakaoOptions.variables['#{동네}'].indexOf('송파구 잠실동') === 0 && sp.kakaoOptions.disableSms === true, sp);

// 6. 만료 안내(D-3), 집계, 해지·환불
NOW = Date.parse('2026-11-25T07:10:00+09:00'); fetches.length = 0;
T.briefDaily();
check('만료 3일 전 안내(알림톡 만료 템플릿)', fetches.some(f => f.url.indexOf('solapi') >= 0 && JSON.parse(f.opt.payload).messages[0].kakaoOptions.templateId === 'TPLEXP'));
let ag = get({ action: 'briefAreas', k: 'wrong' });
check('집계: 토큰 틀리면 거절', !ag.ok);
ag = get({ action: 'briefAreas', k: 'pull-FAKE-123' });
check('집계: 동네 코드·수만(개인정보 없음)', ag.ok && JSON.stringify(ag.areas) === JSON.stringify([{ g: '11320', n: 1 }, { g: '11710', n: 1 }]) && !/@|010|k111/.test(JSON.stringify(ag)), ag);
const lg = sheets['로그']; lg.appendRow(['시각', '유형', '중개사id', '구코드', '단지', '방문자']);
for (let i = 0; i < 6; i++) lg.appendRow([new FakeDate(NOW - 3600000), 'rec', 'A0000001', '11710', '11710|잠실동|리센츠', 'v' + i]);
for (let i = 0; i < 3; i++) lg.appendRow([new FakeDate(NOW - 3600000), 'rec', 'A0000001', '11710', '11710|잠실동|엘스', 'w' + i]);
const it = get({ action: 'briefInterest', k: 'pull-FAKE-123' });
check('관심도: 방문자 5명 이상 단지만', it.ok && JSON.stringify(it.gu) === JSON.stringify({ '11710': [['잠실동', '리센츠', 6, 0]] }), it);
r = post({ action: 'briefRefund', s: s1, id: paidId, reason: '테스트' });
check('첫 발송 전 환불 요청 → 전액 예정·발송 중단', r.ok && r.sub.refundEst === 4900 && r.sub.state === '해지', r.sub);
check('운영자 메일', mails.some(a => typeof a[1] === 'string' && /집예보 모닝 브리핑 환불 요청/.test(a[1])));
r = post({ action: 'briefStop', s: s1, id: trialId });
check('해지', r.ok && r.sub.state === '해지' && !r.sub.active, r);
NOW = Date.parse('2026-11-26T07:10:00+09:00'); fetches.length = 0;
T.briefDaily();
check('해지 뒤 발송 없음', !fetches.some(f => f.url.indexOf('solapi') >= 0));

// 7. 일할 환불 예정액
const st = T.briefState({ r: Object.assign([], subRows().find(x => bc(x, '주문번호') === OID2), { [T.BC['발송수']]: 10, [T.BC['상태']]: '이용' }) }, new FakeDate(Date.parse('2026-12-08T10:00:00+09:00')));
check('이용 중 환불 = 남은 날 일할(20일 → 3,260원)', st.left === 20 && st.refundEst === 3260, st);

// 8. 연락처 정리(이용 끝난 뒤 30일)
NOW = Date.parse('2027-02-10T07:10:00+09:00');
T.briefCleanup(new FakeDate());
check('끝난 지 30일 지난 연락처 원문 삭제', subRows().every(x => !bc(x, '연락처')), subRows().map(x => bc(x, '연락처')));
check('결제대기 행 정리(이틀 지난 것)', subRows().every(x => bc(x, '상태') !== '결제대기'));

console.log(`모닝 브리핑 서버 로직 검증: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
