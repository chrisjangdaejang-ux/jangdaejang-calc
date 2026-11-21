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
    urgent: [{ d: '가락동', a: '급매단지', b: '84㎡대', p: 150000, med: 172000, disc: -12.8, n3: 4, dt: 20261101 }], urgent_lo: [{ d: '가락동', a: '얕은급매', b: '59㎡대', p: 94000, med: 100000, disc: -6.0, n3: 3, dt: 20261102 }],
    lines: { '': { fact: '송파구에서 새로 올라온 매매 거래는 2건이에요.' }, '잠실동': { fact: '잠실동에서 새로 올라온 매매 거래는 1건이에요.' } }, pro: { '': ['"한 줄"'], '잠실동': ['"잠실 한 줄"'] } },
  '11320': { g: '11320', name: '도봉구', trades: [], lines: { '': { fact: '도봉구 새 거래 없음' } }, pro: {},
    pnews: { n: 1, note: { 공급: '공급 고정 문장' }, items: [{ t: '도봉구 창동 재개발 정비구역 지정', d: '2026-11-20', org: '서울특별시', u: 'https://news.seoul.go.kr/citybuild/archives/1', c: '공급', rg: '서울 도봉구', terms: [['정비구역', '재개발·재건축을 해도 된다고 공식으로 정한 구역이에요.']] }] } }
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
      const wk = url.match(/data\/brief\/wk\/(\w+)\.json/);                 // v41 지난주 우리 지역은?(7시 공개분)
      if (wk) return WK[wk[1]] ? send(200, WK[wk[1]]) : send(404, {});
      const m = url.match(/data\/brief\/(\w+)\.json/);
      if (m && m[1] === 'market') return send(200, MARKET);
      if (m) return m[1] === 'index' ? send(200, { date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new RealDate(NOW)) }) : BRIEF[m[1]] ? send(200, BRIEF[m[1]]) : send(404, {});
      if (url.indexOf('api.solapi.com') >= 0) return send(200, { groupInfo: { count: { total: 1 } } });
      const body = opt.payload ? JSON.parse(opt.payload) : null;
      return send(200, { status: 'DONE', orderId: body.orderId, totalAmount: body.amount, method: '카드', approvedAt: new FakeDate().toISOString() });
    }
  }
};
const WK = {   // 송파구는 오늘 날짜(실림), 도봉구는 지난 날짜(빠짐), 전국 문장은 오늘
  '11710': { date: '2026-11-21', w: '2026-46', from: '2026-11-09', to: '2026-11-15', ver: 1, status: 'prov', asof: '2026-11-19', url: 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/weekly/2026-46/', lines: ['송파구 주간 문장', '서울 주간 문장'] },
  '11320': { date: '2026-11-14', w: '2026-45', from: '2026-11-02', to: '2026-11-08', ver: 1, status: 'prov', asof: '2026-11-12', url: 'https://x', lines: ['도봉구 지난주 묵은 문장'] },
  market: { date: '2026-11-21', w: '2026-46', from: '2026-11-09', to: '2026-11-15', ver: 1, status: 'prov', asof: '2026-11-19', url: 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/weekly/2026-46/', line: '전국 주간 문장' } };
const MARKET = { date: '2026-11-21', name: '집예보 모닝 브리핑', win: { from: '2026-11-20', to: '2026-11-21' },
  kr: { n: 812, nhi: 40, hi: [{ sd: '서울', gn: '강남구', d: '압구정동', a: '현대7차', b: '245㎡대', p: 1150000, pm: 1050000, pmd: 20260301, up: 9.5 }], drop: [{ sd: '경기', gn: '화성시', d: '청계동', a: '예시', b: '84㎡대', p: 60000, m2: 80000, m2d: 20250501, dr: -25 }, { sd: '경기', gn: '화성시', d: '청계동', a: '의심거래', b: '84㎡대', p: 30000, m2: 80000, m2d: 20250501, dr: -62, sus: 1 }] },
  seoul: { n: 120, nhi: 12, hi: [], drop: [] }, policy: [{ name: '주담대 한도 조정', stage: '시행', d: '2026-11-17', scope: '전국' }], rate: null,
  cy: { n: 3, rows: [{ n: '이번 주 단지', sd: '서울', gn: '송파구', sp: ['20261117', ''], rc: ['20261118', '20261119'] }] }, lines: ['전국에서 어제 새로 올라온 아파트 매매는 812건이에요.'],
  pnews: { n: 2, by: { 정책: 1, 교통: 1 }, note: { 정책: '정책 고정 문장', 교통: '교통이 좋아지면 보통 주변 집값과 수요에 영향을 줘요.' }, items: [
    { t: "[참고] '27년 부동산 공시가격 시세반영률은 전년 수준 유지", d: '2026-11-20', org: '국토교통부', u: 'https://www.korea.kr/briefing/pressReleaseView.do?newsId=156790000', c: '정책', sub: '세금', terms: [['공시가격', '정부가 세금 계산에 쓰려고 해마다 정해 발표하는 집값이에요.']] },
    { t: '경인선 철도지하화 종합계획 반영', d: '2026-11-19', org: '인천광역시', u: 'javascript:alert(1)', c: '교통', rg: '인천' }] } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8')
  + '\n;globalThis.__T = { BC, OC, UC, SC, UH, SSH, BRIEF_PRICE, BRIEF_TRIAL, BRIEF_NAME, SITE_NAME, bProdKey, briefPublic, briefStats, briefSeen, bKey, hashOf, cleanBrief, briefDaily, briefState, bRows, briefAreas, briefInterest, briefCleanup, briefMarketHtml, briefPnHtml, bChangeAmt, bBrokerNo, bUrgent, briefWeeklyHtml, briefPiece };', ctx);
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
r = post({ action: 'briefOrder', s: s1, product: 'brief_pro', channel: 'email', contact: 'me@example.com', privacy: true, agree: true });
check('중개사용: 등록번호 없으면 거절(쉬운 이유)', !r.ok && /등록번호/.test(r.err) && /중개사 전용 할인/.test(r.err), r);
r = post({ action: 'briefOrder', s: s1, product: 'brief_pro', broker: '010-1234-5678', channel: 'email', contact: 'me@example.com', privacy: true, agree: true });
check('중개사용: 전화번호를 넣으면 거절', !r.ok && /전화번호가 아니라/.test(r.err), r);
r = post({ action: 'briefOrder', s: s1, product: 'brief_pro', broker: '11710-2019-00123', channel: 'email', contact: 'me@example.com', privacy: true, agree: true, amount: 10 });
check('주문: 서버 가격 4,900원', r.ok && r.amount === 4900 && /^JDJ\d{6}-[0-9A-F]{10}$/.test(r.orderId), r);
const OID = r.orderId;
const ord = sheets['주문'].rows.find(x => x[T.OC['주문번호']] === OID);
check('주문 시트: 연락처 가린 값만', ord && ord[T.OC['연락처']] === 'me***@example.com' && !JSON.stringify(ord).includes('me@example.com'));
r = post({ action: 'briefConfirm', paymentKey: 'tgen_b1', orderId: OID, amount: 100 });
check('금액 위변조 거절', !r.ok, r);
r = post({ action: 'briefOrder', s: s1, product: 'brief_pro', broker: '제 11710-2019-00123 호', channel: 'email', contact: 'me@example.com', privacy: true, agree: true });
const OID2 = r.orderId;
check('중개사용 주문: 등록번호 정리·확인 대기', subRows().some(x => bc(x, '주문번호') === OID2 && bc(x, '중개사번호') === '11710-2019-00123' && bc(x, '중개사확인') === '확인 대기'));
r = post({ action: 'briefConfirm', paymentKey: 'tgen_b2', orderId: OID2, amount: 4900 });
check('승인 → 체험 끝난 다음 날부터 30일', r.ok && r.sub.start === '2026-11-28' && r.sub.end === '2026-12-27' && r.sub.pro === true, r);
r = post({ action: 'briefConfirm', paymentKey: 'tgen_b2', orderId: OID2, amount: 4900 });
check('같은 결제키 다시 → 그대로', r.ok && r.sub.start === '2026-11-28', r);
check('중개사용 승인 → 운영자에게 등록번호 확인 메일', mails.some(a => typeof a[1] === 'string' && /중개사용 등록번호 확인/.test(a[1]) && /11710-2019-00123/.test(a[2])));
check('승인 → 낸 돈 기록·중개사 확인 상태', r.sub.broker && r.sub.broker.review === '확인 대기' && subRows().some(x => bc(x, '주문번호') === OID2 && bc(x, '결제액') === 4900));
r = post({ action: 'confirmPayment', paymentKey: 'tgen_other', orderId: OID2, amount: 4900 });
check('리포트 승인 경로로 다른 결제키 → 거절', !r.ok, r);

// 4. 아침 발송
const sent = T.briefDaily();
check('발송 1건(체험 중 회원)', sent === 1, sent);
const m = mails.find(a => a[0] && a[0].to === 'me@example.com');
check('이메일: 받는 사람·제목·동 단위 내용', !!m && /11\/21 집예보 모닝 브리핑/.test(m[0].subject) && /송파구 잠실동/.test(m[0].htmlBody) && /잠실동에서 새로 올라온/.test(m[0].htmlBody) && /도봉구/.test(m[0].htmlBody), m && m[0].subject);
check('메일: ① 전국 시장(신고가 TOP·하락·정책·이번 주 청약) 먼저', !!m && /① 오늘의 부동산 시장/.test(m[0].htmlBody) && /압구정동 현대7차 245㎡대 115억 원/.test(m[0].htmlBody)
  && /주담대 한도 조정/.test(m[0].htmlBody) && /이번 주 단지/.test(m[0].htmlBody) && m[0].htmlBody.indexOf('① 오늘의') < m[0].htmlBody.indexOf('송파구 잠실동'));
check('메일 큰 하락 TOP: 특수 거래 의심은 빼고 진짜 하락만', !!m && /청계동 예시 84㎡대/.test(m[0].htmlBody) && !/의심거래/.test(m[0].htmlBody));
check('메일 ①: 새 정책·교통·공급 발표(원문 제목·부처·날짜·용어 풀이·고정 문장, 공식 https 링크만)', !!m && /새로 발표된 정책·교통·공급 소식/.test(m[0].htmlBody)
  && /href="https:\/\/www\.korea\.kr\/briefing\/pressReleaseView\.do\?newsId=156790000"/.test(m[0].htmlBody) && /국토교통부 · 11\/20 발표 · 세금/.test(m[0].htmlBody)
  && /<b>공시가격<\/b> — 정부가 세금 계산에/.test(m[0].htmlBody) && /교통이 좋아지면 보통 주변 집값과 수요에 영향을 줘요/.test(m[0].htmlBody)
  && !/javascript:/.test(m[0].htmlBody) && /<b>경인선 철도지하화 종합계획 반영<\/b>/.test(m[0].htmlBody));
check('메일 ②: 그 동네 이름이 나온 발표는 동네 칸 맨 위(없는 동네는 생략)', !!m && /내 동네 관련 발표/.test(m[0].htmlBody)
  && m[0].htmlBody.indexOf('내 동네 관련 발표') > m[0].htmlBody.indexOf('도봉구') - 400 && (m[0].htmlBody.match(/내 동네 관련 발표/g) || []).length === 1
  && m[0].htmlBody.indexOf('도봉구 창동 재개발 정비구역 지정') < m[0].htmlBody.indexOf('도봉구 새 거래 없음'));
check('메일: 새 발표가 없으면 칸 자체가 없음(빈 상자 없음)', !/새로 발표된/.test(T.briefMarketHtml(Object.assign({}, MARKET, { pnews: undefined }), {})) && !/새로 발표된/.test(T.briefMarketHtml(Object.assign({}, MARKET, { pnews: { n: 0, items: [] } }), {})) && T.briefPnHtml(null, 3) === '');
check('메일: 7시 공개된 주간 칸(그날 날짜만) — 내 지역 먼저, 전국 나중, 지난 날짜 문장은 안 씀', !!m && /지난주 우리 지역은\?/.test(m[0].htmlBody)
  && m[0].htmlBody.indexOf('송파구 주간 문장') < m[0].htmlBody.indexOf('전국 주간 문장') && !/묵은 문장/.test(m[0].htmlBody)
  && m[0].htmlBody.indexOf('지난주 우리 지역은') < m[0].htmlBody.indexOf('① 오늘의'));
check('시장 자료는 하루 한 번만 받음', fetches.filter(f => /\/brief\/market\.json/.test(f.url)).length === 1);
check('주간 전국 문장(wk/market.json)도 하루 한 번', fetches.filter(f => /\/wk\/market\.json/.test(f.url)).length <= 1);
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

// 9. 요금제 표·관심 단지 수·요금제 바꾸기(v25)
const WEB = require('../assets/brief-core.js');
const pick = t => ({ id: t.id, label: t.label, amount: t.amount, areas: t.areas, apts: t.apts, customers: t.customers, urgPick: !!t.urgPick, weekly: !!t.weekly, pro: !!t.pro, broker: !!t.broker, show: !!t.show });
check('요금제 표: 화면(brief-core TIERS)과 서버(BRIEF_TIERS)가 같음', JSON.stringify(WEB.TIERS.map(pick)) === JSON.stringify(Object.values(T.BRIEF_PRICE).map(pick)),
  [WEB.TIERS.map(pick), Object.values(T.BRIEF_PRICE).map(pick)]);
check('요금: 기본 3,900·지역 3 / 플러스 5,900·지역 10·단지 10 / 중개사용 4,900·지역 10', [T.BRIEF_PRICE.brief.amount, T.BRIEF_PRICE.brief.areas, T.BRIEF_PRICE.brief_plus.amount, T.BRIEF_PRICE.brief_plus.areas, T.BRIEF_PRICE.brief_plus.apts, T.BRIEF_PRICE.brief_pro.amount, T.BRIEF_PRICE.brief_pro.areas].join() === '3900,3,5900,10,10,4900,10');
check('차액 계산: (새 금액−지금 금액)×남은 날/30, 10원 미만 버림', [T.bChangeAmt(T.BRIEF_PRICE.brief, T.BRIEF_PRICE.brief_plus, 18), T.bChangeAmt(T.BRIEF_PRICE.brief, T.BRIEF_PRICE.brief_pro, 30),
  T.bChangeAmt(T.BRIEF_PRICE.brief, T.BRIEF_PRICE.brief_plus, 1), T.bChangeAmt(T.BRIEF_PRICE.brief_plus, T.BRIEF_PRICE.brief, 20), T.bChangeAmt(T.BRIEF_PRICE.brief, T.BRIEF_PRICE.brief_plus, 0)].join() === '1200,1000,60,0,0');
check('등록번호 형식: 화면·서버 같은 결과', ['11680-2020-00123', '11680202000123', '제 11680-2020-00123 호', '서울강남-1234', '가1234-5678', '11680-2031-00123', '99999-2020-00123', '010-1234-5678', '123-45-67890', '1234', 'abc-1234', '']
  .every(x => JSON.stringify(T.bBrokerNo(x, 2026)) === JSON.stringify(WEB.brokerNo(x, 2026))));
check('등록번호 형식: 맞는 것·틀린 것', ['11680-2020-00123', '11680202000123', '서울강남-1234'].every(x => T.bBrokerNo(x, 2026).ok) && ['11680-2031-00123', '99999-2020-00123', '010-1234-5678', '123-45-67890', '1234', 'abc-1234', ''].every(x => !T.bBrokerNo(x, 2026).ok)
  && T.bBrokerNo('11680202000123', 2026).norm === '11680-2020-00123' && T.bBrokerNo('서울강남-1234', 2026).kind === 'old');
NOW = Date.parse('2027-03-01T10:00:00+09:00');
const s3 = member(333);
post({ action: 'userSave', s: s3, data: { brief: { areas: [{ g: '11710', gn: '송파구', sd: '서울특별시', dn: '' }], apts: ['가', '나', '다', '헬리오시티'] } } });
r = post({ action: 'briefOrder', s: s3, product: 'brief_hidden', channel: 'email', contact: 'c@example.com', privacy: true, agree: true });
check('표에 없는 요금제 주문 거절', !r.ok, r);
T.BRIEF_PRICE.brief_hidden = { id: 'brief_hidden', label: '숨김', name: T.BRIEF_NAME + ' 숨김 1개월', amount: 9900, areas: 10, apts: 10, days: 30, show: false };
r = post({ action: 'briefOrder', s: s3, product: 'brief_hidden', channel: 'email', contact: 'c@example.com', privacy: true, agree: true });
check('show:false 요금제는 주문 거절(미리 넣어 둔 새 요금제)', !r.ok, r);
r = post({ action: 'briefOrder', s: s3, product: 'brief', channel: 'email', contact: 'c@example.com', privacy: true, agree: true });
r = post({ action: 'briefConfirm', paymentKey: 'tgen_c1', orderId: r.orderId, amount: 3900 });
check('기본 승인: 오늘부터 30일', r.ok && r.sub.start === '2027-03-01' && r.sub.end === '2027-03-30' && r.sub.tier === 'brief' && r.sub.apts === 3, r);
const baseId = r.sub.id;
mails.length = 0; props.BRIEF_SENT = ''; T.briefDaily();
let m3 = mails.find(a => a[0] && a[0].to === 'c@example.com');
check('기본: 관심 단지 4번째(헬리오시티)는 서버에서 빼고 보냄(3개까지)', !!m3 && !/\[관심 단지\] 헬리오시티/.test(m3[0].htmlBody) && /헬리오시티/.test(m3[0].htmlBody));
NOW = Date.parse('2027-03-13T10:00:00+09:00');
let q = post({ action: 'briefChangeQuote', s: s3, id: baseId, product: 'brief_plus' });
check('올리기 미리 보기: 오늘 바로·남은 18일 차액 1,200원(서버 계산)', q.ok && q.kind === 'now' && q.left === 18 && q.amount === 1200 && !q.free, q);
q = post({ action: 'briefChangeQuote', s: s2, id: baseId, product: 'brief_plus' });
check('남의 구독은 바꿀 수 없음', !q.ok, q);
r = post({ action: 'briefChange', s: s3, id: baseId, product: 'brief_plus', agree: true });
check('올리기 주문: 차액 주문 만들기', r.ok && r.kind === 'now' && r.amount === 1200 && /변경 차액$/.test(r.orderName), r);
const COID = r.orderId; fetches.length = 0;
r = post({ action: 'briefConfirm', paymentKey: 'tgen_c2', orderId: COID, amount: 3900 });
check('차액과 다른 금액 → 토스 승인 전에 거절(돈 안 나감)', !r.ok && !fetches.some(f => /tosspayments/.test(f.url)), r);
r = post({ action: 'briefChange', s: s3, id: baseId, product: 'brief_plus', agree: true });
const COID2 = r.orderId;
NOW = Date.parse('2027-03-14T00:30:00+09:00');
r = post({ action: 'briefConfirm', paymentKey: 'tgen_c3', orderId: COID2, amount: 1200 });
check('주문한 날이 지나면 다시 하게 함(남은 날 수가 바뀜)', !r.ok && /주문한 날/.test(r.err), r);
NOW = Date.parse('2027-03-13T11:00:00+09:00');
r = post({ action: 'briefChange', s: s3, id: baseId, product: 'brief_plus', agree: true });
r = post({ action: 'briefConfirm', paymentKey: 'tgen_c4', orderId: r.orderId, amount: 1200 });
check('차액 승인 → 오늘부터 플러스, 끝날은 그대로', r.ok && r.change && r.sub.tier === 'brief_plus' && r.sub.active && r.sub.start === '2027-03-13' && r.sub.end === '2027-03-30' && r.sub.sent === 1 && r.sub.apts === 10, r);
const plusId = r.sub.id;
check('이전 행은 변경(발송·환불 대상 아님)', subRows().some(x => bc(x, 'id') === baseId && bc(x, '상태') === '변경') && T.briefState(T.bRows().find(o => o.r[T.BC['id']] === baseId), new FakeDate()).refundEst === 0);
check('낸 돈 합계 = 3,900 + 1,200', subRows().some(x => bc(x, 'id') === plusId && bc(x, '결제액') === 5100));
check('올린 뒤 환불 예정 = 새 금액 남은 날 일할(18일 → 3,540원)', r.sub.refundEst === 3540, r.sub.refundEst);
mails.length = 0; props.BRIEF_SENT = ''; T.briefDaily();
m3 = mails.find(a => a[0] && a[0].to === 'c@example.com');
check('플러스: 같은 날 바로 관심 단지 10개까지(헬리오시티 포함)', !!m3 && /\[관심 단지\] 헬리오시티/.test(m3[0].htmlBody) && mails.filter(a => a[0] && a[0].to === 'c@example.com').length === 1);
q = post({ action: 'briefChangeQuote', s: s3, id: plusId, product: 'brief' });
check('내리기 미리 보기: 다음 이용권부터(3/31), 결제 없음', q.ok && q.kind === 'next' && q.at === '2027-03-31' && q.amount === 0, q);
r = post({ action: 'briefChange', s: s3, id: plusId, product: 'brief' });
check('내리기: 지금은 플러스 그대로, 다음 요금제만 적어 둠', r.ok && r.kind === 'next' && r.sub.tier === 'brief_plus' && r.sub.next === 'brief' && r.sub.nextLabel === '기본', r);
check('내 구독에 다음 요금제', post({ action: 'briefMine', s: s3 }).next === 'brief');
r = post({ action: 'briefChange', s: s3, id: plusId, product: 'brief_plus' });
check('내리기 되돌리기', r.ok && r.sub.next === '', r);
r = post({ action: 'briefChange', s: s3, id: plusId, product: 'brief' });
NOW = Date.parse('2027-03-28T07:10:00+09:00'); mails.length = 0; props.BRIEF_SENT = ''; T.briefDaily();
check('만료 안내에 다음 요금제', mails.some(a => a[0] && a[0].to === 'c@example.com' && /기본 요금제로 준비/.test(a[0].htmlBody) && /\?p=brief/.test(a[0].htmlBody)));
NOW = Date.parse('2027-03-30T10:00:00+09:00');
q = post({ action: 'briefChangeQuote', s: s3, id: plusId, product: 'brief_pro' });
check('플러스 → 중개사용(더 싼 요금제)은 다음 이용권부터', q.ok && q.kind === 'next', q);
r = post({ action: 'briefChange', s: s3, id: plusId, product: 'brief_hidden' });
check('숨긴 요금제로는 못 바꿈', !r.ok, r);
// 마지막 날 기본 → 중개사용: 차액 30원(100원 미만) → 등록번호 확인 후 결제 없이 바로
NOW = Date.parse('2027-04-27T09:00:00+09:00'); const s4 = member(444);
post({ action: 'userSave', s: s4, data: { brief: { areas: [{ g: '11320', gn: '도봉구', sd: '서울특별시', dn: '' }] } } });
r = post({ action: 'briefOrder', s: s4, product: 'brief', channel: 'email', contact: 'd@example.com', privacy: true, agree: true });
check('기본 주문', r.ok, r); const lastO = r.orderId; NOW = Date.parse('2027-04-27T10:00:00+09:00');
r = post({ action: 'briefConfirm', paymentKey: 'tgen_d1', orderId: lastO, amount: 3900 });
const s1Base = r.sub.id; NOW = Date.parse('2027-05-26T10:00:00+09:00');
q = post({ action: 'briefChangeQuote', s: s4, id: s1Base, product: 'brief_pro' });
check('마지막 날 차액 30원 → 결제 없이 바꿈 표시·중개사 표시', q.ok && q.kind === 'now' && q.left === 1 && q.amount === 30 && q.free && q.broker, q);
r = post({ action: 'briefChange', s: s4, id: s1Base, product: 'brief_pro', agree: true });
check('중개사용으로 올릴 때도 등록번호 필요', !r.ok && /등록번호/.test(r.err), r);
r = post({ action: 'briefChange', s: s4, id: s1Base, product: 'brief_pro', agree: true, broker: '서울송파-4567' });
check('결제 없이 바로 중개사용 + 확인 대기', r.ok && r.free && r.sub.tier === 'brief_pro' && r.sub.pro && r.sub.broker.review === '확인 대기' && r.sub.broker.no === '서울송파-4567', r);

// 10. 중개사 플러스: 한도·중개사용에서 올리기(등록번호 그대로)·급매 기준
check('중개사 플러스: 9,900원·지역 20·단지 30·손님 10·급매 기준 고름·주간 리포트', ['amount', 'areas', 'apts', 'customers', 'urgPick', 'weekly', 'broker', 'show'].map(k => T.BRIEF_PRICE.brief_pro_plus[k]).join() === '9900,20,30,10,true,true,true,true');
NOW = Date.parse('2027-06-01T09:00:00+09:00');
const s5 = member(505);
const areas20 = Array.from({ length: 25 }, (_, i) => ({ g: String(11000 + i * 10), gn: '구' + i, sd: '서울특별시', dn: '' }));
areas20[0] = { g: '11710', gn: '송파구', sd: '서울특별시', dn: '' };
r = post({ action: 'userSave', s: s5, data: { brief: { areas: areas20, apts: Array.from({ length: 40 }, (_, i) => '단지' + i), urg: 6 } } });
check('저장 한도: 지역 20곳·단지 30개까지(가장 큰 요금제 기준), 급매 기준 저장', r.ok && r.data.brief.areas.length === 20 && r.data.brief.apts.length === 30 && r.data.brief.urg === 6, r.data && [r.data.brief.areas.length, r.data.brief.apts.length, r.data.brief.urg]);
check('급매 기준 범위 밖(3%)은 저장 안 함', post({ action: 'userSave', s: s5, data: { brief: { areas: areas20, urg: 3 } } }).data.brief.urg === null);
post({ action: 'userSave', s: s5, data: { brief: { areas: areas20, apts: Array.from({ length: 40 }, (_, i) => '단지' + i), urg: 6 } } });
r = post({ action: 'briefOrder', s: s5, product: 'brief_pro', broker: '11710-2015-00077', channel: 'email', contact: 'e@example.com', privacy: true, agree: true });
r = post({ action: 'briefConfirm', paymentKey: 'tgen_e1', orderId: r.orderId, amount: 4900 });
const e1 = r.sub.id;
mails.length = 0; props.BRIEF_SENT = ''; T.briefDaily();
let me = mails.find(a => a[0] && a[0].to === 'e@example.com');
check('중개사용: 급매 기준은 10% 그대로(6% 저장값 안 씀)', !!me && /급매단지/.test(me[0].htmlBody) && !/얕은급매/.test(me[0].htmlBody));
NOW = Date.parse('2027-06-11T10:00:00+09:00');
q = post({ action: 'briefChangeQuote', s: s5, id: e1, product: 'brief_pro_plus' });
check('중개사용 → 중개사 플러스: 바로·남은 20일 차액 3,330원·등록번호 다시 안 물음', q.ok && q.kind === 'now' && q.left === 20 && q.amount === 3330 && q.broker === false, q);
r = post({ action: 'briefChange', s: s5, id: e1, product: 'brief_pro_plus', agree: true });
r = post({ action: 'briefConfirm', paymentKey: 'tgen_e2', orderId: r.orderId, amount: 3330 });
check('중개사 플러스 적용: 같은 등록번호·확인 상태 이어받음', r.ok && r.sub.tier === 'brief_pro_plus' && r.sub.broker.no === '11710-2015-00077' && r.sub.broker.review === '확인 대기' && r.sub.customers === 10 && r.sub.urgPick, r.sub);
mails.length = 0; props.BRIEF_SENT = ''; T.briefDaily();
me = mails.find(a => a[0] && a[0].to === 'e@example.com');
check('중개사 플러스: 내가 정한 6% 기준으로 급매 더 넓게', !!me && /급매단지/.test(me[0].htmlBody) && /얕은급매/.test(me[0].htmlBody));
check('급매 목록 계산: 서버·화면 같음', JSON.stringify([5, 6, 10, 12, 20].map(t => T.bUrgent(BRIEF['11710'], t).map(u => u.a))) === JSON.stringify([5, 6, 10, 12, 20].map(t => WEB.urgentFor(BRIEF['11710'], t).map(u => u.a)))
  && JSON.stringify(T.bUrgent(BRIEF['11710'], 15)) === '[]' && T.bUrgent(BRIEF['11710']).length === 1);

// 11. 친구 초대 보상
NOW = Date.parse('2027-07-01T09:00:00+09:00');
const mk = id => { const ss = member(id); post({ action: 'userSave', s: ss, data: { brief: { areas: [{ g: '11320', gn: '도봉구', sd: '서울특별시', dn: '' }] } } }); return ss; };
const buy = (ss, mail, key) => { const o = post({ action: 'briefOrder', s: ss, product: 'brief', channel: 'email', contact: mail, privacy: true, agree: true, ref: key }); return { o, c: post({ action: 'briefConfirm', paymentKey: 'tgen_' + mail.replace(/\W/g, ''), orderId: o.orderId, amount: 3900 }) }; };
const sA = mk(601), sX = mk(602), sB = mk(603), sD = mk(604);
check('유료 이용 안 한 사람은 초대 링크 못 만듦', !post({ action: 'briefInvite', s: sX }).ok);
buy(sA, 'a@example.com');
const inv = post({ action: 'briefInvite', s: sA });
check('초대 링크: 브리핑 주소 ?ref=코드(카카오 id 원문 없음)', inv.ok && /^R[0-9A-F]{8}$/.test(inv.code) && inv.url.endsWith('/brief/?ref=' + inv.code) && [...new URL(inv.url).searchParams.keys()].join() === 'ref' && !/(^|[^0-9A-F])k?601([^0-9A-F]|$)/.test(inv.url) &&   /* 카카오 id(601) 원문이 경계 있는 값으로 없음 — 코드 해시에 우연히 '601'이 들어가도 통과 */ inv.left === 12, inv);
check('자기 자신 초대는 안 됨', buy(sA, 'a2@example.com', inv.code).o.ref === 'self');
r = post({ action: 'briefTrial', s: sB, channel: 'email', contact: 'b@example.com', privacy: true, ref: inv.code });
check('초대받은 체험 → 대기만(체험만 하면 보상 없음)', r.ok && r.ref === 'ok' && sheets['브리핑초대'].rows.slice(1).length === 1 && sheets['브리핑초대'].rows[1][4] === '대기');
const rowsOf = id => subRows().filter(x => bc(x, '카카오id') === 'k' + id);
check('체험만 한 상태: 두 사람 모두 보상 이용권 없음', rowsOf(601).every(x => bc(x, '결제액') !== 0) && rowsOf(603).every(x => bc(x, '결제액') !== 0));
NOW = Date.parse('2027-07-05T09:00:00+09:00');
const bb = buy(sB, 'b@example.com');
check('초대받은 사람이 유료 결제 → 두 사람 모두 1개월', bb.c.ok && bb.c.reward && bb.c.reward.inviter === '1개월' && bb.c.reward.me === '1개월', bb.c);
const rwA = rowsOf(601).filter(x => bc(x, '결제액') === 0), rwB = rowsOf(603).filter(x => bc(x, '결제액') === 0);
check('보상 = 다음 결제 1개월 미룸(지금 이용권 끝난 다음 날부터 30일, 0원)', rwA.length === 1 && rwB.length === 1 && bc(rwB[0], '시작일') === '2027-08-07' && bc(rwB[0], '만료일') === '2027-09-05' && bc(rwA[0], '시작일') === '2027-08-30' && bc(rwA[0], '주문번호') === '',
  [rwA.map(x => [bc(x, '시작일'), bc(x, '만료일')]), rwB.map(x => [bc(x, '시작일'), bc(x, '만료일')])]);
const rwS = T.briefState(T.bRows().find(o => o.r[T.BC['id']] === bc(rwB[0], 'id')), new FakeDate());
check('보상 이용권은 환불(현금) 없음', rwS.refundEst === 0 && rwS.orderId === '' && rwS.reward === true, rwS);
r = post({ action: 'briefRefund', s: sB, id: rwS.id });
check('보상 이용권 환불 요청은 거절', !r.ok, r);
const sC = mk(605); buy(sC, 'c@example.com'); const invC = post({ action: 'briefInvite', s: sC });
check('초대받는 보상은 계정당 한 번', buy(sB, 'b2@example.com', invC.code).o.ref === 'once' || post({ action: 'briefTrial', s: sB, channel: 'email', contact: 'b@example.com', privacy: true, ref: invC.code }).ref === 'once');
check('이미 유료로 쓴 사람은 대상 아님', buy(sC, 'c2@example.com', inv.code).o.ref === 'paid');
for (let i = 0; i < 11; i++) sheets['브리핑초대'].rows.push([new FakeDate(), inv.code, 'k601', 'kz' + i, '지급', new FakeDate(), '1개월', '1개월', '']);
check('연 한도 계산', post({ action: 'briefInvite', s: sA }).left === 0);
const dd = buy(sD, 'd2@example.com', inv.code);
check('한 사람 보상은 연 12개월까지: 초대한 사람은 연 한도, 받은 사람은 1개월', dd.o.ref === 'ok' && dd.c.reward.inviter === '연 한도' && dd.c.reward.me === '1개월', dd.c.reward);
check('초대 시트: 카카오 id 외 연락처 없음', !/@example\.com/.test(JSON.stringify(sheets['브리핑초대'].rows)));

// 12. 메일 광고 동의 2가지(정보통신망법 제50조 ①항 광고성 정보 · ③항 이른 아침)·(광고) 제목·수신 거부
NOW = Date.parse('2027-09-01T06:00:00+09:00');
const sF = mk(701), sG = mk(702), sH = mk(703), sI = mk(704);
const rowsK = id => subRows().filter(x => bc(x, '카카오id') === 'k' + id);
buy(sF, 'f@example.com');
r = post({ action: 'briefTrial', s: sG, channel: 'email', contact: 'g@example.com', privacy: true, ad: true, amAd: true });
check('신청 때 두 동의 → 둘 다 동의·동의 일시 기록', r.ok && rowsK(702).every(x => bc(x, '광고동의') === true && bc(x, '광고동의시각') instanceof Date && bc(x, '아침광고동의') === true && bc(x, '아침광고동의시각') instanceof Date));
check('동의 처리 결과 메일(두 항목)', mails.some(a => a[0] && a[0].to === 'g@example.com' && /광고 수신 동의 처리 결과/.test(a[0].subject) && /광고성 정보 받기: 동의/.test(a[0].htmlBody) && /이른 아침\(오전 7시\) 브리핑 메일 속 광고 받기: 동의/.test(a[0].htmlBody)));
check('동의 안 한 사람은 기본 꺼짐', rowsK(701).every(x => bc(x, '광고동의') !== true && bc(x, '아침광고동의') !== true));
r = post({ action: 'briefTrial', s: sH, channel: 'email', contact: 'h@example.com', privacy: true, ad: false, amAd: true });
check('광고성 정보 동의 없이 이른 아침만 → 이른 아침도 꺼짐', r.ok && rowsK(703).every(x => bc(x, '광고동의') !== true && bc(x, '아침광고동의') !== true));
r = post({ action: 'briefTrial', s: sI, channel: 'email', contact: 'i@example.com', privacy: true, ad: true, amAd: false });
check('광고성 정보만 동의 → 이른 아침은 꺼짐', r.ok && rowsK(704).every(x => bc(x, '광고동의') === true && bc(x, '아침광고동의') !== true));
const adSh = () => sheets['브리핑광고'] || (T.briefAdToday(new FakeDate()), sheets['브리핑광고']);
adSh().rows.push(['A1', '2027-09-02', '2027-09-03', '좋은은행', '주담대 금리 비교', '내 조건 대출 한도 3분 확인', 'https://example.com/loan', '게재', '']);
adSh().rows.push(['A2', '2027-09-02', '2027-09-30', '나쁜링크', '제목', '설명', 'http://insecure.example', '게재', '']);
const mailTo = to => mails.filter(a => a[0] && a[0].to === to && /모닝 브리핑 —/.test(a[0].subject));
NOW = Date.parse('2027-09-01T07:10:00+09:00'); mails.length = 0; props.BRIEF_SENT = ''; T.briefDaily();
check('광고 없는 날: 두 동의 다 한 사람도 평소 제목', mailTo('g@example.com').length === 1 && !/^\(광고\)/.test(mailTo('g@example.com')[0][0].subject) && !/광고 수신 거부/.test(mailTo('g@example.com')[0][0].htmlBody));
NOW = Date.parse('2027-09-02T07:10:00+09:00'); mails.length = 0; props.BRIEF_SENT = ''; T.briefDaily();
const gm = mailTo('g@example.com')[0], fm = mailTo('f@example.com')[0], im = mailTo('i@example.com')[0];
check('광고 있는 날 + 두 동의: 제목 맨 앞 (광고)·광고 1개·광고주·라벨', !!gm && /^\(광고\) \[집예보\]/.test(gm[0].subject) && /주담대 금리 비교/.test(gm[0].htmlBody) && /좋은은행/.test(gm[0].htmlBody) && (gm[0].htmlBody.match(/>광고</g) || []).length === 1, gm && gm[0].subject);
check('광고 메일: 보낸 사람 정보·원클릭 수신 거부 링크', !!gm && /보낸 사람: 집예보\(\(주\)장대장부동산그룹\)/.test(gm[0].htmlBody) && /02-3444-5008/.test(gm[0].htmlBody) && /action=briefAdOff&id=B[0-9A-F]{9}&t=[0-9a-f]{16}/.test(gm[0].htmlBody));
check('동의 없음 → 광고 있는 날도 메일 광고 없음·평소 제목', !!fm && !/^\(광고\)/.test(fm[0].subject) && !/주담대 금리 비교/.test(fm[0].htmlBody));
check('광고성 정보 동의만(이른 아침 없음) → 메일 광고 없음', !!im && !/^\(광고\)/.test(im[0].subject) && !/주담대 금리 비교/.test(im[0].htmlBody));
(() => { rowsK(703).forEach(x => { x[T.BC['아침광고동의']] = true; }); })();   // 시트에서 이른 아침만 켜진 경우(광고성 정보 꺼짐)
NOW = Date.parse('2027-09-02T07:20:00+09:00'); mails.length = 0; rowsK(703).forEach(x => { x[T.BC['최근발송일']] = ''; }); props.BRIEF_SENT = ''; T.briefDaily();
const hm = mailTo('h@example.com')[0];
check('이른 아침 동의만(광고성 정보 없음) → 메일 광고 없음', !!hm && !/^\(광고\)/.test(hm[0].subject) && !/주담대 금리 비교/.test(hm[0].htmlBody));
rowsK(703).forEach(x => { x[T.BC['아침광고동의']] = false; });
check('http 링크 광고는 쓰지 않음', !/insecure/.test(gm[0].htmlBody));
mails.length = 0;
check('하루 한 번만(재발송 없음)', T.briefDaily() === undefined && mailTo('g@example.com').length === 0);
check('발송기록에 광고 id', JSON.stringify(sheets['발송기록'].rows).includes('보냄(광고 A1)'));
check('웹 광고 자리: 공개 정보만', JSON.stringify(get({ action: 'briefAd' })) === JSON.stringify({ ok: true, ad: { id: 'A1', adv: '좋은은행', title: '주담대 금리 비교', desc: '내 조건 대출 한도 3분 확인', url: 'https://example.com/loan' } }));
const gid = (gm[0].htmlBody.match(/id=(B[0-9A-F]{9})/) || [])[1], gt = (gm[0].htmlBody.match(/t=([0-9a-f]{16})/) || [])[1];
let off = ctx.doGet({ parameter: { action: 'briefAdOff', id: gid, t: 'f'.repeat(16) } });
check('수신 거부: 토큰 틀리면 처리 안 함', /처리하지 못했어요/.test(off.s) && rowsK(702).every(x => bc(x, '아침광고동의') === true));
mails.length = 0;
off = ctx.doGet({ parameter: { action: 'briefAdOff', id: gid, t: gt } });
check('원클릭 수신 거부 → 두 동의 모두 끔·철회 일시·결과 메일', /처리했어요/.test(off.s) && rowsK(702).every(x => bc(x, '아침광고동의') === false && bc(x, '아침광고철회시각') instanceof Date && bc(x, '광고동의') === false && bc(x, '광고철회시각') instanceof Date)
  && mails.some(a => a[0] && /광고 수신 거부 처리 결과/.test(a[0].subject)));
NOW = Date.parse('2027-09-03T07:10:00+09:00'); mails.length = 0; props.BRIEF_SENT = ''; T.briefDaily();
check('철회 뒤: 광고 있는 날도 메일 광고 없음', mailTo('g@example.com').length === 1 && !/^\(광고\)/.test(mailTo('g@example.com')[0][0].subject));
r = post({ action: 'briefAdPref', s: sF, on: true });
check('구독 관리: 광고성 정보 동의 없이 이른 아침만 켜면 거절(쉬운 안내)', !r.ok && /먼저 '광고성 정보 받기'에 동의해야 고를 수 있어요/.test(r.err), r);
r = post({ action: 'briefAdPref', s: sF, ad: true, on: true });
check('구독 관리: 두 동의 켜기 → 동의·일시', r.ok && r.adc.on && r.amAd.on && /^2027-09-03 /.test(r.amAd.at) && /^2027-09-03 /.test(r.adc.at) && post({ action: 'briefMine', s: sF }).amAd.on === true, r);
r = post({ action: 'briefAdPref', s: sF, ad: false, on: true });
check('구독 관리: 광고성 정보를 끄면서 이른 아침을 켜려 하면 거절', !r.ok, r);
r = post({ action: 'briefAdPref', s: sF, ad: false, on: false });
check('구독 관리: 광고성 정보 끄면 이른 아침도 함께 꺼짐·철회 일시', r.ok && !r.adc.on && !r.amAd.on && /^2027-09-03 /.test(r.amAd.off) && /^2027-09-03 /.test(r.adc.off), r);
post({ action: 'briefAdPref', s: sF, ad: true, on: true });
check('광고주 통계: 메일 광고 동의자 10명 미만이면 숨김', T.briefPublic().amAd == null);
(() => { const sh = sheets['브리핑구독']; for (let i = 0; i < 12; i++) { const rr = []; rr[T.BC['id']] = 'Y' + i; rr[T.BC['상품']] = T.BRIEF_PRICE.brief.name; rr[T.BC['상태']] = '이용'; rr[T.BC['채널']] = 'email';
  rr[T.BC['시작일']] = '2027-09-01'; rr[T.BC['만료일']] = '2027-09-30'; rr[T.BC['카카오id']] = 'ky' + i; rr[T.BC['광고동의']] = i !== 9; rr[T.BC['아침광고동의']] = i < 10; sh.rows.push(rr); } })();
check('광고주 통계: 두 동의 모두 한 사람 수(10명 이상일 때만)', T.briefPublic().amAd === 10, T.briefPublic().amAd);
subRows().filter(x => /^Y/.test(bc(x, 'id'))).forEach(x => { x[T.BC['상태']] = '해지'; });
// 2년 확인 안내(두 동의 모두)
rowsK(701).forEach(x => { x[T.BC['아침광고동의시각']] = new FakeDate(Date.parse('2025-09-01T09:00:00+09:00')); x[T.BC['광고동의시각']] = new FakeDate(Date.parse('2025-08-20T09:00:00+09:00')); });
rowsK(704).forEach(x => { x[T.BC['광고동의시각']] = new FakeDate(Date.parse('2025-09-02T09:00:00+09:00')); });
NOW = Date.parse('2027-09-04T07:10:00+09:00'); mails.length = 0; props.BRIEF_SENT = ''; T.briefDaily();
const rc = to => mails.find(a => a[0] && a[0].to === to && /광고 수신 동의 확인 안내/.test(a[0].subject));
check('2년 지난 두 동의 → 확인 안내(두 항목·날짜)·확인 일시', !!rc('f@example.com') && /광고성 정보 받기: 2025-08-20에 동의/.test(rc('f@example.com')[0].htmlBody) && /이른 아침\(오전 7시\) 브리핑 메일 속 광고 받기: 2025-09-01에 동의/.test(rc('f@example.com')[0].htmlBody)
  && /briefAdOff/.test(rc('f@example.com')[0].htmlBody) && rowsK(701).every(x => bc(x, '광고확인시각') instanceof Date));
check('2년 지난 광고성 정보 동의만 있어도 확인 안내', !!rc('i@example.com') && /광고성 정보 받기: 2025-09-02에 동의/.test(rc('i@example.com')[0].htmlBody) && !/이른 아침/.test(rc('i@example.com')[0].htmlBody));
mails.length = 0; props.BRIEF_SENT = ''; NOW = Date.parse('2027-09-05T07:10:00+09:00'); T.briefDaily();
check('확인 안내는 2년에 한 번', !mails.some(a => a[0] && /수신 동의 확인 안내/.test(a[0].subject)));

/* v41 지난주 우리 지역은?(주간 실거래 동향) — 엔진 문장 그대로, 내 지역 먼저·전국 나중, 같은 시·도 문장은 한 번만, 자료 없으면 칸 없음 */
{
  const wk = { w: '2026-46', from: '2026-11-09', to: '2026-11-15', ver: 1, status: 'prov', asof: '2026-11-23', url: 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/weekly/2026-46/' };
  const S1 = { g: '11710', name: '송파구', trades: [], lines: {}, wk: Object.assign({ lines: ['송파구 지난주 문장', '서울 지난주 문장'] }, wk) };
  const S2 = { g: '11680', name: '강남구', trades: [], lines: {}, wk: Object.assign({ lines: ['강남구 지난주 문장', '서울 지난주 문장'] }, wk) };
  const p1 = T.briefPiece(S1, { g: '11710' }, false, [], 10), p2 = T.briefPiece(S2, { g: '11680' }, false, [], 10), p0 = T.briefPiece({ g: '11650', name: '서초구', trades: [], lines: {} }, { g: '11650' }, false, [], 10);
  const h = T.briefWeeklyHtml([p1, p2], { wk: Object.assign({ line: '전국 지난주 문장' }, wk) });
  const at = x => h.indexOf(x);
  check('주간: 내 지역 → 시·도 → 다른 내 지역 → 전국 순서', at('송파구 지난주') < at('서울 지난주') && at('서울 지난주') < at('강남구 지난주') && at('강남구 지난주') < at('전국 지난주'), h);
  check('주간: 같은 시·도 문장은 한 번', h.split('서울 지난주 문장').length === 2);
  check('주간: 잠정·기간·판·기준일·출처', /11\/9~11\/15 계약 · 잠정/.test(h) && /제1판/.test(h) && /2026\.11\.23 기준/.test(h) && /국토교통부 실거래가 분석/.test(h));
  check('주간: 자료 없으면 칸 없음', T.briefWeeklyHtml([p0], { kr: {} }) === '');
  check('주간: 전국만 있어도 칸', /전국 지난주 문장/.test(T.briefWeeklyHtml([p0], { wk: Object.assign({ line: '전국 지난주 문장' }, wk) })));
  check('주간: 이상한 주소는 링크 안 함', !/javascript/.test(T.briefWeeklyHtml([p0], { wk: Object.assign({ line: 'x' }, wk, { url: 'javascript:alert(1)' }) })));
}

console.log(`모닝 브리핑 서버 로직 검증: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
