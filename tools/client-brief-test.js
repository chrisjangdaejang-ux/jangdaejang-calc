/* 중개사 플러스(내 손님 브리핑·주간 리포트) 자동 확인 — 실행: node tools/client-brief-test.js </dev/null
   서버(tools/agent-backend.gs v26)와 화면 공용 계산(assets/client-brief.js)을 가짜 구글 시트·드라이브·공개 데이터 위에서 돌려 봅니다.
   손님 10명·단지 5곳 한도 · 전화번호·실명 저장 안 함 · 손님 링크 토큰(맞히기 어려움·새로 만들면 예전 링크 막힘) · 단지 한 번씩만(엔진 목록·메일) · 주간 리포트 받기.
   (실제 서버에는 접속하지 않습니다.) */
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
const BRIEF0 = {
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
const MARKET = { date: '2026-11-21', name: '집코드 모닝 브리핑', win: { from: '2026-11-20', to: '2026-11-21' },
  kr: { n: 812, nhi: 40, hi: [{ sd: '서울', gn: '강남구', d: '압구정동', a: '현대7차', b: '245㎡대', p: 1150000, pm: 1050000, pmd: 20260301, up: 9.5 }], drop: [{ sd: '경기', gn: '화성시', d: '청계동', a: '예시', b: '84㎡대', p: 60000, m2: 80000, m2d: 20250501, dr: -25 }, { sd: '경기', gn: '화성시', d: '청계동', a: '의심거래', b: '84㎡대', p: 30000, m2: 80000, m2d: 20250501, dr: -62, sus: 1 }] },
  seoul: { n: 120, nhi: 12, hi: [], drop: [] }, policy: [{ name: '주담대 한도 조정', stage: '시행', d: '2026-11-17', scope: '전국' }], rate: null,
  cy: { n: 3, rows: [{ n: '이번 주 단지', sd: '서울', gn: '송파구', sp: ['20261117', ''], rc: ['20261118', '20261119'] }] }, lines: ['전국에서 어제 새로 올라온 아파트 매매는 812건이에요.'] };

const BRIEF = { '11710': { g: '11710', name: '송파구', trades: [], lines: { '': { fact: '송파구 새 거래 없음' } }, pro: {} } };
const CX = { '11710': { v: 1, g: '11710', name: '송파구', sd: '서울', date: '2026-11-21', win: { from: '2026-11-20', to: '2026-11-21' }, ref: '2026-11-15',
    cx: { '잠실동|리센츠': { a: '리센츠', d: '잠실동', nn: 1, new: [{ b: '84㎡대', ar: 85, p: 333000, dt: 20261107, f: 12, hi: 1 }], urg: [], last: [{ b: '84㎡대', ar: 85, p: 333000, dt: 20261107 }],
                       chg: { b: '84㎡대', m1: 336000, n1: 5, m0: 349000, n0: 27, pct: -3.7 } },
          '잠실동|잠실엘스': { a: '잠실엘스', d: '잠실동', nn: 0, new: [], urg: [], last: [{ b: '84㎡대', ar: 84.8, p: 310000, dt: 20261109 }] } } },
  '11680': { v: 1, g: '11680', name: '강남구', date: '2026-11-21', win: { from: '2026-11-13', to: '2026-11-19' }, cx: { '대치동|은마': { a: '은마', d: '대치동', nn: 0, new: [], urg: [], last: [{ b: '74㎡대', p: 312000, dt: 20261113 }],
          rk: [{ b: '74㎡대', r0: 800, r1: 776, mv: 24, n: 5972, from: '2026-11-14', to: '2026-11-21' }] } } } };
const drive = [];
ctx.DriveApp = { Access: { ANYONE_WITH_LINK: 'any' }, Permission: { VIEW: 'view' },
  createFolder: n => ({ getId: () => 'FOLDER1', createFile: blob => { const id = 'F' + drive.length; drive.push({ id, blob, share: null }); return { getId: () => id, setSharing(a, p) { drive[drive.length - 1].share = a + '/' + p; } }; } }),
  getFolderById: () => ({ createFile: blob => { const id = 'F' + drive.length; drive.push({ id, blob, share: null }); return { getId: () => id, setSharing(a, p) { drive[drive.length - 1].share = a + '/' + p; } }; } }),
  getFileById: id => ({ setTrashed() { const f = drive.find(x => x.id === id); if (f) f.trashed = true; } }) };
ctx.Utilities.base64Decode = s => Array.from(Buffer.from(s, 'base64'));
ctx.Utilities.newBlob = (bytes, type, name) => ({ bytes, type, name, getBytes: () => bytes, getDataAsString: () => Buffer.from(bytes).toString() });
const fetch0 = ctx.UrlFetchApp.fetch;
ctx.UrlFetchApp.fetch = (url, opt) => {
  const m = url.match(/data\/brief\/cx\/(\d{5})\.json/), send = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
  if (m) { fetches.push({ url, opt }); return CX[m[1]] ? send(200, CX[m[1]]) : send(404, {}); }
  const b = url.match(/data\/brief\/(\d{5})\.json/); if (b) { fetches.push({ url, opt }); return BRIEF[b[1]] ? send(200, BRIEF[b[1]]) : send(404, {}); }
  if (/data\/brief\/market\.json/.test(url)) return send(404, {});
  return fetch0(url, opt);
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8')
  + '\n;globalThis.__T = { BC, UC, SC, UH, SSH, BRIEF_PRICE, BRIEF_NAME, SITE_NAME, hashOf, briefDaily, bpLabel, bpToken, bpKey, briefAreas, BP_APTS };', ctx);
const T = ctx.__T;
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
const get = p => JSON.parse(ctx.doGet({ parameter: p }).s);
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } }

/* 요금제 표: 다른 작업이 넣는 중개사 플러스 줄(customers·weekly)이 아직 없으면 이 확인에서만 같은 이름으로 넣어 둠 */
let PLUS = Object.keys(T.BRIEF_PRICE).find(k => Number(T.BRIEF_PRICE[k].customers) > 0);
if (!PLUS) { PLUS = 'brief_broker_plus'; T.BRIEF_PRICE[PLUS] = { id: PLUS, name: T.BRIEF_NAME + ' 중개사 플러스 1개월', amount: 9900, areas: 10, apts: 10, pro: true, customers: 10, weekly: true, days: 30 }; }
check('요금제 표: 중개사 플러스 손님 10명·주간 리포트', T.BRIEF_PRICE[PLUS].customers === 10 && T.BRIEF_PRICE[PLUS].weekly === true, T.BRIEF_PRICE[PLUS]);
const PRO = Object.keys(T.BRIEF_PRICE).find(k => T.BRIEF_PRICE[k].pro && !(Number(T.BRIEF_PRICE[k].customers) > 0)) || 'brief_pro';

sheets['회원'] = makeSheet(); sheets['세션'] = makeSheet(); sheets['회원'].appendRow(T.UH); sheets['세션'].appendRow(T.SSH);
function member(id, brief) {
  const s = crypto.randomBytes(32).toString('hex'), r = [], q = [];
  r[T.UC['카카오id']] = 'k' + id; r[T.UC['닉네임']] = '회원' + id; r[T.UC['저장자료']] = JSON.stringify({ brief: brief || { areas: [{ g: '11710', gn: '송파구', sd: '서울특별시', dn: '' }], apts: [] } });
  sheets['회원'].appendRow(r);
  q[T.SC['세션해시']] = T.hashOf('ses|' + s); q[T.SC['카카오id']] = 'k' + id; q[T.SC['만든날']] = new FakeDate(); q[T.SC['만료일']] = new FakeDate(NOW + 90 * 86400000);
  sheets['세션'].appendRow(q);
  return s;
}
function sub(id, key, contact) {
  if (!sheets['브리핑구독']) { sheets['브리핑구독'] = makeSheet(); sheets['브리핑구독'].appendRow(Object.keys(T.BC)); }
  const r = []; Object.keys(T.BC).forEach(h => r[T.BC[h]] = '');
  r[T.BC['id']] = 'B' + id; r[T.BC['생성시각']] = new FakeDate(); r[T.BC['상품']] = T.BRIEF_PRICE[key].name; r[T.BC['상태']] = '이용'; r[T.BC['주문번호']] = 'JDJ' + id;
  r[T.BC['카카오id']] = 'k' + id; r[T.BC['채널']] = 'email'; r[T.BC['연락처']] = contact; r[T.BC['연락처가림']] = 'x***'; r[T.BC['시작일']] = '2026-11-20'; r[T.BC['만료일']] = '2026-12-19'; r[T.BC['발송수']] = 0;
  sheets['브리핑구독'].appendRow(r);
}
const sA = member(1), sB = member(2), sC = member(3);
sub(1, PLUS, 'a@example.com'); sub(2, PLUS, 'b@example.com'); sub(3, PRO, 'c@example.com');
const PROF = { role: 'agent', office: '잠실하나공인중개사사무소', ceo: '홍길동', reg: '11710-2020-00123', addr: '서울 송파구 올림픽로 300', phone: '02-412-0000' };
const AP = (n, g) => Array.from({ length: n }, (_, i) => ({ g: g || '11710', d: '잠실동', a: '단지' + i }));
const cust = (i, extra) => Object.assign({ label: `${i + 1}0${i + 1}호 손님`, purpose: 'buy', apts: [{ g: '11710', d: '잠실동', a: '리센츠' }] }, extra || {});

// 1. 한도: 손님 10명·단지 5곳
let r = post({ action: 'bpMine', s: sA });
check('플러스 한도: 손님 10명·단지 5곳·주간 리포트', r.ok && r.limit.customers === 10 && r.limit.apts === 5 && r.limit.weekly === true, r);
r = post({ action: 'bpMine', s: sC });
check('중개사용(손님 카드 없는 요금제)은 한도 0', r.ok && r.limit.customers === 0, r);
r = post({ action: 'bpSave', s: sC, profile: PROF, customers: [cust(0)] });
check('플러스가 아니면 저장 거절', !r.ok && /중개사 플러스/.test(r.err), r);
r = post({ action: 'bpSave', s: sA, profile: PROF, customers: Array.from({ length: 11 }, (_, i) => cust(i)) });
check('11명은 거절', !r.ok && /10명까지/.test(r.err), r);
r = post({ action: 'bpSave', s: sA, profile: PROF, customers: [cust(0, { apts: AP(6) })] });
check('단지 6곳은 거절', !r.ok && /5곳까지/.test(r.err), r);
r = post({ action: 'bpSave', s: sA, profile: PROF, customers: [cust(0, { apts: AP(5).concat(AP(5)) })] });
check('같은 단지는 하나로(5곳 그대로 저장)', r.ok && r.customers[0].apts.length === 5, r);
r = post({ action: 'bpSave', s: sA, profile: Object.assign({}, PROF, { role: 'consult', office: '부동산 연구소' }), customers: [cust(0)] });
check('공인중개사가 아니면 거절', !r.ok && /공인중개사/.test(r.err), r);
r = post({ action: 'bpSave', s: sA, profile: Object.assign({}, PROF, { reg: '' }), customers: [cust(0)] });
check('등록번호 없으면 거절(법정 표시)', !r.ok && /등록번호/.test(r.err), r);
const ten = Array.from({ length: 10 }, (_, i) => cust(i, i < 3 ? { apts: [{ g: '11710', d: '잠실동', a: '리센츠' }, { g: '11710', d: '잠실동', a: '잠실엘스' }, { g: '11680', d: '대치동', a: '은마' }] } : {}));
r = post({ action: 'bpSave', s: sA, profile: PROF, customers: ten });
check('10명 저장', r.ok && r.customers.length === 10, r);

// 2. 전화번호·실명·이메일은 저장하지 않음
const BADS = ['010-1234-5678', '김○○ 01012345678', '손님 010 1234 5678', '02-412-0000 손님', '김철수 손님', '이영희님', 'kim@example.com', '<script>'];
BADS.slice(0, 7).forEach(lb => { const x = post({ action: 'bpSave', s: sB, profile: PROF, customers: [cust(0, { label: lb })] }); check('거절: ' + lb, !x.ok && /전화번호|실명|이메일/.test(x.err), x); });
['김○○ 손님', '302호 손님', '강남구 손님', '신혼부부 손님', 'A고객'].forEach(lb => { const x = post({ action: 'bpSave', s: sB, profile: PROF, customers: [cust(0, { label: lb })] }); check('받음: ' + lb, x.ok && x.customers[0].label === lb, x); });
const dump = JSON.stringify(Object.values(sheets).map(sh => sh.rows));
check('시트 어디에도 손님 전화번호 없음', !/010[-\s]?1234|01012345678/.test(dump) && !/김철수|이영희|kim@example/.test(dump));
check('손님 시트에 연락처 칸 없음', !sheets['내손님'].rows[0].some(h => /연락|전화|휴대|메일/.test(String(h))), sheets['내손님'].rows[0]);

// 3. 손님 링크 토큰
r = post({ action: 'bpMine', s: sA });
const c0 = r.customers[0], m0 = c0.link.match(/\/brief\/c\/#(C[0-9A-F]{11})\.([0-9a-f]{64})$/);
check('링크 모양: /brief/c/#id.토큰64', !!m0, c0.link);
check('토큰은 손님마다 다름', new Set(r.customers.map(c => c.link.split('.').pop())).size === 10);
check('토큰은 시트에 저장하지 않음', !JSON.stringify(Object.values(sheets).map(sh => sh.rows)).includes(m0[2]));
check('토큰은 서버 비밀값 없이는 못 만듦(id 해시와 다름)', m0[2] !== crypto.createHash('sha256').update(m0[1]).digest('hex') && m0[2] !== crypto.createHash('sha256').update('bpc|' + m0[1] + '|1').digest('hex'));
let o = post({ action: 'bpOpen', id: m0[1], tk: m0[2] });
check('손님 화면 열림(로그인 없음)', o.ok && o.card.apts.length === 3 && o.card.profile.office === PROF.office, o);
check('손님 화면엔 이름표 없음', !JSON.stringify(o).includes(c0.label));
const flip = m0[2].slice(0, 63) + (m0[2][63] === 'a' ? 'b' : 'a');
check('토큰 한 글자만 달라도 거절', !post({ action: 'bpOpen', id: m0[1], tk: flip }).ok);
check('다른 손님 토큰으로는 거절', !post({ action: 'bpOpen', id: m0[1], tk: r.customers[1].link.split('.').pop() }).ok);
r = post({ action: 'bpRelink', s: sA, id: c0.id });
const nl = r.customers.find(c => c.id === c0.id).link;
check('링크 새로 만들기: 새 토큰', nl !== c0.link, nl);
check('예전 링크는 막힘', !post({ action: 'bpOpen', id: m0[1], tk: m0[2] }).ok);
check('새 링크는 열림', post({ action: 'bpOpen', id: m0[1], tk: nl.split('.').pop() }).ok);
check('다른 중개사는 내 손님 링크를 못 바꿈', !post({ action: 'bpRelink', s: sB, id: c0.id }).ok);
const bid = 'C' + 'A'.repeat(11);
for (let i = 0; i < 21; i++) post({ action: 'bpOpen', id: bid, tk: crypto.randomBytes(32).toString('hex') });
check('맞히기 시도 20번 넘으면 1시간 막힘', /1시간/.test(post({ action: 'bpOpen', id: bid, tk: 'a'.repeat(64) }).err || ''));

// 4. 엔진 목록: 모든 손님 단지를 한 번씩(이름표 없음)
r = post({ action: 'bpSave', s: sB, profile: Object.assign({}, PROF, { office: '대치둘공인중개사사무소', reg: '11680-2019-00077' }), customers: [cust(0, { label: '분당 손님', apts: [{ g: '11710', d: '잠실동', a: '리센츠' }, { g: '11680', d: '대치동', a: '은마' }] })] });
check('두 번째 중개사 저장', r.ok, r);
check('엔진 목록은 토큰 없으면 거절', !get({ action: 'bpPull', k: 'x' }).ok);
const pl = get({ action: 'bpPull', k: 'pull-FAKE-123' });
const keys = pl.cx.map(c => c.g + '|' + c.d + '|' + c.a);
check('단지 한 번씩(손님 11명·중개사 2명 → 3곳)', pl.ok && keys.length === 3 && new Set(keys).size === 3, pl.cx);
check('엔진 목록에 이름표·카카오 id 없음', !/손님|"k1"|"k2"/.test(JSON.stringify(pl)), pl);
check('주간 리포트 중개사 2명(키는 해시 12자리)', pl.brokers.length === 2 && pl.brokers.every(b => /^[0-9a-f]{12}$/.test(b.bid) && b.regions[0] === '11710'), pl.brokers);
const ar = get({ action: 'briefAreas', k: 'pull-FAKE-123' });
check('구독 동네에 손님 단지 동네(강남구)도', ar.ok && ar.areas.some(a => a.g === '11680'), ar);

// 5. 주간 리포트 받기(엔진 → 서버)
const pdf = Buffer.from('%PDF-1.4 test').toString('base64');
check('올리기: 토큰 없으면 거절', !post({ action: 'bpPut', k: 'bad', kind: 'weekly', bid: pl.brokers[0].bid, date: '2026-11-23', b64: pdf }).ok);
r = post({ action: 'bpPut', k: 'pull-FAKE-123', kind: 'weekly', bid: pl.brokers[0].bid, date: '2026-11-21', b64: pdf });
check('올리기: 드라이브에 저장·링크 있는 사람만 보기', r.ok && drive.length === 1 && drive[0].share === 'any/view' && drive[0].blob.type === 'application/pdf', r);
r = post({ action: 'bpPut', k: 'pull-FAKE-123', kind: 'weekly', bid: pl.brokers[0].bid, date: '2026-11-21', b64: pdf });
check('같은 날 다시 올리면 바꿔 둠', r.ok && sheets['주간리포트'].rows.length === 2 && drive[0].trashed === true);
const mineA = post({ action: 'bpMine', s: sA }), mineB = post({ action: 'bpMine', s: sB });
const who = [mineA, mineB].find(x => x.weekly.length);
check('내 구독 관리에 받기 링크(그 중개사만)', !!who && who.weekly[0].date === '2026-11-21' && /drive\.google\.com\/uc\?export=download&id=F1/.test(who.weekly[0].url) && [mineA, mineB].filter(x => x.weekly.length).length === 1, [mineA.weekly, mineB.weekly]);

// 6. 아침 메일 '내 손님 카드' — 단지 자료는 동네마다 한 번만 받음
fetches.length = 0; mails.length = 0;
T.briefDaily();
const mA = mails.find(m => m[0].to === 'a@example.com'), mC = mails.find(m => m[0].to === 'c@example.com');
const h = mA && mA[0].htmlBody;
check('플러스 메일에 내 손님 카드', !!h && h.includes('내 손님 카드') && h.includes('101호 손님') && h.includes('손님에게 보내기'), h && h.slice(0, 200));
check('새 거래: 신고가·금액 그대로', h.includes('어제 새 거래 1건 · 84㎡대 33억 3,000만 원(11/7 계약, 12층) · 신고가'));
check('새 거래 없으면 "어제 새 거래 없음" + 최근 거래가', h.includes('어제 새 거래 없음 · 가장 최근 거래 84㎡대 31억 원(2026.11.9 계약)'));
check('확인 기간이 하루가 아니면 날짜로', h.includes('11/13 이후 새 거래 없음'));
check('미래가치 등수 변화', h.includes('미래가치 등수(74㎡대) 800위 → 776위 ▲24'));
check('가격 변화 문장', h.includes('84㎡대 최근 3개월 가운데 값 33억 6,000만 원(5건) · 그 전 3개월 34억 9,000만 원(27건)보다 −3.7%'));
check('손님용 링크', /\/brief\/c\/#C[0-9A-F]{11}\.[0-9a-f]{64}/.test(h));
check('중개사용(손님 카드 없음) 메일엔 칸 없음', mC && !mC[0].htmlBody.includes('내 손님 카드'));
const cxF = fetches.filter(f => /\/cx\//.test(f.url)).map(f => f.url.match(/cx\/(\d+)/)[1]);
check('단지 자료는 동네마다 한 번만 받음', cxF.length === 2 && new Set(cxF).size === 2, cxF);
check('시험·검증·채점 낱말 없음(메일)', !/시험|검증|채점/.test(h));

// 7. 오래된 리포트 정리 · 탈퇴하면 손님 자료도 지움
sheets['주간리포트'].rows.splice(1, 0, ['2026-09-01', pl.brokers[0].bid, 'OLD', new FakeDate()]);
drive.push({ id: 'OLD' });
post({ action: 'bpPut', k: 'pull-FAKE-123', kind: 'weekly', bid: pl.brokers[1].bid, date: '2026-11-21', b64: pdf });
check('8주 지난 리포트는 지움', !sheets['주간리포트'].rows.some(x => x[2] === 'OLD') && drive.find(x => x.id === 'OLD').trashed === true);
r = post({ action: 'userDelete', s: sB });
check('탈퇴하면 표시 정보·손님 이름표 지움', r.ok && !sheets['내손님'].rows.some(x => x[1] === 'k2') && !sheets['플러스중개사'].rows.some(x => x[0] === 'k2'));
check('다른 중개사 손님은 그대로', sheets['내손님'].rows.filter(x => x[1] === 'k1').length === 10);

/* ---------- 화면 공용 계산 ---------- */
globalThis.JDJ_SITE = { SITE_NAME: '집코드' };
require('../assets/brief-core.js'); require('../assets/pro-report.js');
const CB = require('../assets/client-brief.js');
const BW = globalThis.JDJ_BRIEF, WT = (BW.TIERS || []).find(t => Number(t.customers) > 0);
check('화면 요금제 표에도 손님 10명·주간 리포트(서버 표와 같음)', !!WT && WT.customers === 10 && WT.weekly === true && T.BRIEF_PRICE[WT.id] && T.BRIEF_PRICE[WT.id].customers === 10, WT);
check('화면 한도: 실제 요금제 표에서 손님 10명·단지 5곳', CB.limitOf([{ tier: WT && WT.id, active: true, state: '이용' }], BW.PRICE).customers === 10 && CB.limitOf([{ tier: WT && WT.id, active: true, state: '이용' }], BW.PRICE).apts === 5);
check('화면 한도: 요금제 줄의 customers 를 읽음', CB.limits({ customers: 10, weekly: true }).customers === 10 && CB.limits({ customers: 10 }).apts === 5 && CB.limits({}).customers === 0);
check('화면 한도: 구독 목록에서', CB.limitOf([{ tier: 'p', active: true, state: '이용' }], { p: { customers: 10, weekly: true } }).weekly === true
  && CB.limitOf([{ tier: 'p', active: false, start: '2026-01-01', state: '이용' }], { p: { customers: 10 } }, '2026-11-21').customers === 0);
BADS.slice(0, 7).forEach(lb => check('화면도 거절: ' + lb, !CB.cleanLabel(lb).ok));
['김○○ 손님', '302호 손님', '강남구 손님', 'A고객'].forEach(lb => { check('화면도 받음: ' + lb, CB.cleanLabel(lb).ok); check('서버와 같은 결과: ' + lb, T.bpLabel(lb) === CB.cleanLabel(lb).label); });
let L = CB.cleanList(Array.from({ length: 11 }, (_, i) => cust(i)), CB.limits({ customers: 10 }));
check('화면: 11명 거절', !!L.err && /10명/.test(L.err));
L = CB.cleanList([cust(0, { apts: AP(6) })], CB.limits({ customers: 10 }));
check('화면: 단지 6곳 거절', /5곳/.test(L.err), L);
L = CB.cleanList([cust(0, { phone: '01012345678', name: '김철수', apts: AP(2) })], CB.limits({ customers: 10 }));
check('화면: 보낼 값에 전화번호·이름 칸 없음', !L.err && !JSON.stringify(L.list).includes('0101234') && !JSON.stringify(L.list).includes('김철수') && Object.keys(L.list[0]).sort().join() === 'apts,g,gn,id,label,purpose', L.list);
check('화면: 동네 한 번씩', CB.sggs([{ apts: AP(3) }, { apts: AP(2).concat(AP(1, '11680')) }]).join() === '11680,11710');
check('링크 읽기', !!CB.parseHash('#CABCDEF01234.' + 'a'.repeat(64)) && !CB.parseHash('#CABCDEF01234.' + 'a'.repeat(63)) && !CB.parseHash('#P' + 'A'.repeat(11) + '.' + 'a'.repeat(64)));
const card = CB.card({ purpose: 'sell', apts: [{ g: '11710', d: '잠실동', a: '리센츠' }, { g: '11710', d: '잠실동', a: '잠실엘스' }, { g: '11680', d: '대치동', a: '은마' }, { g: '11650', d: '반포동', a: '없는자료' }] }, CX, PROF);
const ch = CB.cardHtml(card, {});
check('화면 카드: 메일과 같은 문장', ch.includes('어제 새 거래 1건 · 84㎡대 33억 3,000만 원(11/7 계약, 12층)') && ch.includes('어제 새 거래 없음 · 가장 최근 거래 84㎡대 31억 원(2026.11.9 계약)') && ch.includes('11/13 이후 새 거래 없음'));
check('화면 카드: 자료 없는 단지도 말없이 빼지 않음', ch.includes('없는자료') && ch.includes('오늘 자료를 아직 받지 못했어요'));
check('화면 카드: 기간·출처(공공자료)', ch.includes('11/13 → 11/21 확인한 국토부 공개 자료') && ch.includes('공공자료'));
check('화면 카드: 중개사 법정 표시', ['잠실하나공인중개사사무소', '대표 공인중개사 홍길동', '등록번호 11710-2020-00123', '서울 송파구 올림픽로 300', '전화 02-412-0000'].every(w => ch.includes(w)), ch);
check('화면 카드: 목적 제목', card.title === '오늘 아침 팔려는 단지 매매 소식');
check('화면 카드: 회사 이름 대신 서비스 이름', !/장대장부동산그룹/.test(fs.readFileSync(path.join(__dirname, '../assets/client-brief.js'), 'utf8')));
check('화면 카드: 이름표는 중개사 화면에서만', CB.cardHtml(card, { label: '302호 손님' }).includes('302호 손님') && !ch.includes('302호'));

console.log(`\n중개사 플러스 확인: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
