/* 관심 단지·청약 알림 1단계 자동 확인 — 실행: node tools/alerts-test.js </dev/null
   ① assets/alerts-core.js: 묶음 만들기(거래 하나에 알림 하나, 끈 단지·끈 종류 빼기), 같은 알림 다시 안 보내기, 끄기 링크, 동의 확인, 청약 날짜(새 공고·접수 하루 전·발표일)
   ② tools/agent-backend.gs: 서버에 복사된 계산 블록이 화면과 글자 그대로 같은지, 신청(동의 필수)·하루 한 통·다시 안 보내기·끄기 링크·모닝 브리핑과 한 통으로 합치기·광고 규칙
   ③ 화면 연결: 알림 센터·종 단추·서비스 워커 판 번호
   가짜 시트·메일·공개 자료 위에서만 돌고 실제 서버에는 접속하지 않습니다. 금액 단위: 만원. */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const A = require('../assets/alerts-core.js');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } }

/* ---------- ① 계산 ---------- */
const P1 = { sd: 's00', code: '11710', dong: '잠실동', jibun: '35', apt: '잠실엘스', band: '84㎡대' };
const P2 = { sd: 's00', code: '11710', dong: '풍납동', jibun: '', apt: '동아한가람1', band: '84㎡대' };
const G = { g: '11710', date: '2026-11-25', d0: '2026-11-24', rows: [
  { d: '잠실동', j: '35', a: '잠실엘스', b: '84㎡대', dt: 20261120, ar: 84.8, f: 12, p: 300000, day: '2026-11-25', s: '06:01' },
  { d: '잠실동', j: '35', a: '잠실엘스', b: '84㎡대', dt: 20261121, ar: 84.8, f: 20, p: 320000, hi: 1, pm: 310000, day: '2026-11-25', s: '06:01' },
  { d: '잠실동', j: '35', a: '잠실엘스', b: '84㎡대', dt: 20261122, ar: 84.8, f: 3, p: 250000, dr: -21.9, m2: 320000, day: '2026-11-25', s: '06:01' },
  { d: '잠실동', j: '35', a: '잠실엘스', b: '84㎡대', dt: 20261123, ar: 84.8, f: 4, p: 150000, dr: -53, sus: 1, day: '2026-11-25', s: '06:01' },
  { d: '잠실동', j: '35', a: '다른단지', b: '84㎡대', dt: 20261120, ar: 84.8, f: 9, p: 100000, day: '2026-11-25', s: '06:01' }],
  u: { '풍납동||동아한가람1|84㎡대': [60, 300, 44.0] }, u0: { '풍납동||동아한가람1|84㎡대': [60, 301, 50.2] } };
const S = { g: '11710', urgent: [{ d: '잠실동', a: '잠실엘스', b: '84㎡대', ar: 84.8, f: 12, p: 300000, dt: 20261120, med: 340000, n3: 4, disc: -11.8 },
  { d: '잠실동', a: '잠실엘스', b: '84㎡대', ar: 84.8, f: 7, p: 330000, dt: 20261119, med: 340000, n3: 4, disc: -2.9 }],
  gap: [{ d: '풍납동', a: '동아한가람1', b: '84㎡대', jr: 33.4, jr0: 50.2, dlt: -16.8, nj: 12, ns: 6, to: '2026-11-19' }, { d: '풍납동', a: '동아한가람1', b: '84㎡대', jr: 50, jr0: 47, dlt: 3, to: '2026-11-19' }] };
let ev = A.placeEvents(P1, G, S);
check('거래 하나에 알림 하나(신고가·급매·큰 하락·새 실거래), 다른 단지·특수 거래 의심 큰 하락은 뺌', ev.map(e => e.k).join(',') === 'drop,high,drop,trade', ev.map(e => [e.k, e.dt]));
check('급매는 브리핑 급매 레이더(중간값보다 10% 이상 낮음) — 같은 거래는 새 실거래 대신 급매로', ev[0].k === 'drop' && /최근 3개월 같은 평형 중간값 34억 원\(4건\)보다 11.8% 낮아요/.test(ev[0].s), ev[0]);
check('신고가 문구: 그 전 최고가 대비(자료 두 값으로만 계산)', /31억 원보다 3.2% 높아요/.test(ev[1].s) && /20층 32억 원/.test(ev[1].t), ev[1]);
check('큰 하락: 최근 2년 최고가보다 10% 이상', /최근 2년 최고가 32억 원보다 21.9% 낮아요/.test(ev[2].s), ev[2]);
check('특수 거래 의심(53% 낮음)은 큰 하락 대신 새 실거래로만', ev[3].k === 'trade' && ev[3].dt === 20261123, ev[3]);
let ev2 = A.placeEvents(P2, G, S);
check('전세가율 변화 5%p 이상만(브리핑 급변 + 어제 대비)', ev2.length === 2 && ev2.every(e => e.k === 'jeonse') && /50.2%에서 33.4%로 16.8%p 내려갔어요/.test(ev2[0].t) && /50.2%에서 44.0%로 6.2%p/.test(ev2[1].t), ev2.map(e => e.t));
check('알림 id 는 같은 키면 같은 값(서버·화면 공통)', A.keyId('t|a') === A.keyId('t|a') && A.keyId('t|a') !== A.keyId('t|b') && /^[0-9a-f]{16}$/.test(A.keyId('x')));

const NOTICES = [
  { no: 'N1', n: '송파 새단지', sd: '서울특별시', g: '송파구', k: '민영', pb: '20261124', sp: ['20261201', '20261201'], r1: ['20261202', '20261202'], rc: ['20261201', '20261203'], pw: '20261209', u: 'https://www.applyhome.co.kr/x', cut: [{ band: 1, lo: 52, hi: 64 }] },
  { no: 'N2', n: '강동 공공', sd: '서울특별시', g: '강동구', k: '국민', pb: '20261016', sp: ['', ''], r1: ['20261026', '20261105'], rc: ['20261026', '20261106'], pw: '20261126' },
  { no: 'N3', n: '경기 민영', sd: '경기도', g: '안산시 단원구', k: '민영', pb: '20261125', sp: ['20261126', '20261126'], r1: ['20261126', ''], rc: ['20261126', '20261128'], pw: '20261203', cut: [{ band: 0, insufficient: true }] },
  { no: 'N4', n: '광주 단지', sd: '광주광역시', g: '북구', k: '민영', pb: '20261125', sp: ['', ''], r1: ['20261130', ''], rc: ['20261130', ''], pw: '20261210' }];
const cy = r => A.cleanPrefs({ cy: Object.assign({ on: true, regions: [{ sd: '서울특별시', g: '', gn: '' }, { sd: '경기도', g: '41273', gn: '안산시 단원구' }, { sd: '광주광역시', g: '', gn: '' }] }, r || {}) }).cy;
check('설정 정리: 옛 시·도 이름은 새 이름으로, 가점 범위 뒤집힘 바로잡기, 지역 없으면 꺼짐',
  cy().regions[2].sd === '전남광주통합특별시' && A.cleanPrefs({ cy: { on: true, lo: 70, hi: 40, regions: [{ sd: '서울특별시' }] } }).cy.lo === 40 && A.cleanPrefs({ cy: { on: true, regions: [] } }).cy.on === false);
let c25 = [].concat.apply([], NOTICES.map(n => A.cyEvents(n, cy(), '2026-11-25', '')));
check('11/25: 새 공고(공고일이 오늘 이전, 접수가 모두 끝난 N2는 뺌) + 접수 하루 전(N3 11/26 특별공급·1순위 같은 날은 한 번)', c25.map(e => e.key).sort().join(',') === ['c|N1|new', 'c|N3|eve|2026-11-26', 'c|N3|new', 'c|N4|new'].sort().join(','), c25.map(e => e.key));
check('접수 하루 전 문구: 내일(11/26) 특별공급·1순위 접수', c25.some(e => e.k === 'cy_eve' && /내일\(11\/26\) 경기 민영 특별공급·1순위 접수가 시작돼요/.test(e.t)));
let c26 = [].concat.apply([], NOTICES.map(n => A.cyEvents(n, cy(), '2026-11-26', '2026-11-25')));
check('11/26: 발표일 당일(N2) + 신청한 날(11/25) 전에 나온 공고는 새 공고로 안 보냄', c26.map(e => e.key).sort().join(',') === ['c|N1|new', 'c|N2|win', 'c|N3|new', 'c|N4|new'].filter(k => k !== 'c|N1|new').sort().join(','), c26.map(e => e.key));
let c30 = [].concat.apply([], NOTICES.map(n => A.cyEvents(n, cy(), '2026-11-30', '2026-11-30')));
check('11/30: 특별공급(12/1) 하루 전, 1순위(12/2)는 아직', c30.map(e => e.key).join(',') === 'c|N1|eve|2026-12-01', c30.map(e => e.key));
check('12/1: 1순위(12/2) 하루 전', [].concat.apply([], NOTICES.map(n => A.cyEvents(n, cy(), '2026-12-01', '2026-12-01'))).map(e => e.key).join(',') === 'c|N1|eve|2026-12-02');
check('달이 바뀌는 날짜 계산', A.addDay('2026-11-30', 1) === '2026-12-01' && A.addDay('2026-12-31', 1) === '2027-01-01' && A.addDay('2028-02-28', 1) === '2028-02-29');
check('집 있음: 국민주택 공고(N2) 뺌', ![].concat.apply([], NOTICES.map(n => A.cyEvents(n, cy({ nohome: false }), '2026-11-26', ''))).some(e => e.no === 'N2'));
check('가점 범위: 위쪽 끝(45)이 예상 범위 아래쪽 끝(52)보다 낮으면 그 공고는 뺌, 예상 범위 없는 공고는 알리고 밝힘',
  (() => { const e = [].concat.apply([], NOTICES.map(n => A.cyEvents(n, cy({ lo: 30, hi: 45 }), '2026-11-25', ''))); return !e.some(x => x.no === 'N1') && /예상 당첨 가점 범위가 없어요/.test(e.find(x => x.no === 'N3').s); })());
check('가점 범위가 예상 범위와 겹치면 알리고 겹친다고만(확률처럼 쓰지 않음)',
  (() => { const e = A.cyEvents(NOTICES[0], cy({ lo: 50, hi: 58 }), '2026-11-25', ''); return e.length === 1 && /60~85㎡ 예상 당첨 가점은 52~64점이고, 내 가점 범위\(50~58점\)는 그 범위와 겹쳐요/.test(e[0].s) && !/확률|가능성/.test(e[0].s); })());
check('청약 종류 끄기(발표일만 끔)', ![].concat.apply([], NOTICES.map(n => A.cyEvents(n, cy({ kinds: { cy_win: false } }), '2026-11-26', ''))).some(e => e.k === 'cy_win'));
check('지역 밖(시·군·구가 다름)은 안 보냄', A.cyEvents(Object.assign({}, NOTICES[2], { g: '안산시 상록구' }), cy(), '2026-11-25', '').length === 0);

/* 묶음·다시 안 보내기 */
const O = { places: [P1, P2], g: { '11710': G }, s: { '11710': S }, notices: NOTICES, today: '2026-11-25', since: '2026-11-25',
  prefs: { cy: { on: true, regions: [{ sd: '경기도', g: '41273', gn: '안산시 단원구' }] } } };
let D = A.digest(O);
check('묶음: 단지 2곳 + 청약(신청 뒤 공고·접수 하루 전)', D.groups.length === 2 && D.cy.length === 2 && D.n === 8 && D.ids.length === 8, [D.groups.map(g => g.ev.length), D.cy.map(e => e.key)]);
const sent = {}; D.ids.forEach(id => { sent[id] = 1; });
let D2 = A.digest(Object.assign({}, O, { sent }));
check('다시 안 보내기: 보낸 알림 id 는 다음 날 묶음에서 빠짐', D2.n === 0 && D2.groups.length === 0 && D2.cy.length === 0, D2);
const G2 = JSON.parse(JSON.stringify(G)); G2.rows.push({ d: '잠실동', j: '35', a: '잠실엘스', b: '84㎡대', dt: 20261125, ar: 84.8, f: 9, p: 305000, day: '2026-11-26', s: '06:01' });
D2 = A.digest(Object.assign({}, O, { g: { '11710': G2 }, sent, today: '2026-11-26' }));
check('다시 안 보내기: 새로 올라온 거래만 남음', D2.n === 1 && D2.groups[0].ev[0].dt === 20261125, D2);
D2 = A.digest(Object.assign({}, O, { prefs: { mute: [A.pid(P1)], kinds: { jeonse: false } } }));
check('끈 단지(잠실엘스)·끈 종류(전세가율)는 빠짐', D2.n === 0, D2);
D2 = A.digest(Object.assign({}, O, { prefs: { kinds: { trade: false, drop: false, jeonse: false } } }));
check('신고가만 켜면 신고가만', D2.n === 1 && D2.groups[0].ev[0].k === 'high');

/* 끄기 링크 */
const L = A.links('https://script.example/exec', 'XABC123DEF', id => 'tok-' + id, pid => 'ph-' + pid.length);
check('끄기 링크: 모두·청약·단지(단지 키는 줄인 값)', L.all === 'https://script.example/exec?action=alertOff&id=XABC123DEF&t=tok-XABC123DEF&all=1' && L.cy.endsWith('&cy=1') && L.place(A.pid(P1)) === 'https://script.example/exec?action=alertOff&id=XABC123DEF&t=tok-XABC123DEF&p=ph-' + A.pid(P1).length, L);
const M = A.mailHtml(D, { site: '집예보', web: 'https://web.example/', links: L, since: '2026-11-25 07:00', sender: { name: '(주)장대장부동산그룹', tel: '02-3444-5008', email: 'help@example.com' }, date: '2026-11-25', gname: c => c === '11710' ? '송파구' : '' });
check('메일: 단지마다 끄기 · 청약 끄기 · 모두 끄기 · 설정 링크', (M.html.match(/이 단지 알림 끄기/g) || []).length === 2 && /청약 알림 끄기/.test(M.html) && M.html.indexOf(A.esc(L.all)) >= 0 && /my\/alerts\//.test(M.html), M.html.length);
check('메일: 광고 아님·보낸 사람·답장 주소·제목에 건수', /광고가 아니|정보 알림/.test(M.html) && /02-3444-5008/.test(M.html) && /help@example\.com/.test(M.html) && /새 소식 8건/.test(M.subject) && !/\(광고\)/.test(M.subject), M.subject);
check('메일: 경쟁 앱 이름 없음', !/호갱|직방|리치고|아실|네이버 부동산|KB부동산|다방/.test(M.html));
const Mm = A.mailHtml(D, { site: '집예보', web: 'https://web.example/', links: L, merged: true, date: '2026-11-25' });
check('브리핑에 넣는 조각: 끄기 링크 유지·바깥 머리 없음', /모든 알림 끄기/.test(Mm.html) && !/집예보 <span style="color:#2F6BFF">알림/.test(Mm.html));
check('글자 넣기 막기(단지 이름의 꺾쇠)', !/<script>/.test(A.mailHtml(A.digest({ places: [Object.assign({}, P1, { apt: '<script>x' })], g: { '11710': { rows: [{ d: '잠실동', j: '35', a: '<script>x', b: '84㎡대', dt: 20261120, f: 1, p: 1000 }] } }, today: '2026-11-25' }), {}).html));

/* 동의 확인 */
const okSub = { state: '활성', consent: true, consentAt: '2026-11-25 07:00', v: A.V, email: 'me@example.com' };
check('동의: 모두 있으면 보냄', A.canSend(okSub));
check('동의: 체크 없음·시각 없음·문구 판 없음·해지·이메일 아님이면 안 보냄', [{ consent: false }, { consentAt: '' }, { v: '' }, { state: '해지' }, { email: 'nope' }].every(x => !A.canSend(Object.assign({}, okSub, x))));
check('광고: 두 동의가 모두 있어야(브리핑과 같은 규칙)', A.adOk({ ad: { on: true }, am: { on: true } }) && !A.adOk({ ad: { on: true }, am: { on: false } }) && !A.adOk({ ad: { on: false }, am: { on: true } }) && !A.adOk(null));

/* ---------- ② 서버 ---------- */
const gs = fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8'), core = fs.readFileSync(path.join(__dirname, '..', 'assets', 'alerts-core.js'), 'utf8');
const blk = s => { const a = s.indexOf('/* ALERTS-CORE BEGIN'), b = s.indexOf('/* ALERTS-CORE END */'); return a >= 0 && b > a ? s.slice(a, b) : null; };
check('서버의 계산 블록 = 화면 계산 블록(글자 그대로)', blk(gs) && blk(gs) === blk(core));

function makeSheet() {
  const rows = [];
  const sh = { rows,
    getDataRange() { return { getValues: () => rows.map(r => r.slice()) }; }, getLastRow() { return rows.length; },
    appendRow(r) { rows.push(r.slice()); }, deleteRow(i) { rows.splice(i - 1, 1); }, setFrozenRows() {},
    getRange(r, c, nr, nc) { const rg = {
      setValues(v) { v.forEach((line, i) => line.forEach((x, j) => { (rows[r - 1 + i] = rows[r - 1 + i] || [])[c - 1 + j] = x; })); return rg; },
      setValue(x) { (rows[r - 1] = rows[r - 1] || [])[c - 1] = x; return rg; }, getValue() { return (rows[r - 1] || [])[c - 1]; },
      getValues() { const out = []; for (let i = 0; i < (nr || 1); i++) out.push((rows[r - 1 + i] || []).slice(c - 1, c - 1 + (nc || 1))); return out; },
      setFontWeight() { return rg; }, setBackground() { return rg; }, setFontColor() { return rg; }, setNumberFormat() { return rg; } }; return rg; } };
  return sh;
}
const sheets = {};
const book = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet()), getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST', getSheets: () => Object.values(sheets), deleteSheet() {} };
sheets['중개사'] = makeSheet(); sheets['로그'] = makeSheet();
const props = { BRIEF_PULL_TOKEN: 'pull-FAKE' }, mails = [];
let NOW = Date.parse('2026-11-25T07:10:00+09:00'), QUOTA = 100;
const RealDate = Date;
class FakeDate extends RealDate { constructor(...a) { if (!a.length) super(NOW); else super(...a); } static now() { return NOW; } }
let GDATA = { '11710': G };
const DATA = { 'chungyak/notices.json': { rows: NOTICES }, 'index.json': { sgg: { '11710': { name: '송파구', sido: '서울특별시' } }, sido: [] } };
const BRIEFS = { '11710': Object.assign({ name: '송파구', trades: [], lines: { '': { fact: '송파구 새 거래 요약' } } }, S) };
const ctx = {
  console, Date: FakeDate, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, isFinite, encodeURIComponent, decodeURIComponent, parseInt, parseFloat,
  SpreadsheetApp: { getActive: () => book, openById: () => book },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail: o => { QUOTA--; mails.push(o); }, getRemainingDailyQuota: () => QUOTA },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, getService: () => ({ getUrl: () => 'https://script.example/exec' }),
    newTrigger: () => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ inTimezone: () => ({ create() {} }) }) }) }) }) },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  HtmlService: { createHtmlOutput: s => ({ s }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    formatDate: (d, tz, f) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' }).formatToParts(d).map(x => [x.type, x.value]));
      const u = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday];
      return f.replace('yyyy', p.year).replace('yy', p.year.slice(2)).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour === '24' ? '00' : p.hour).replace('hh', p.hour).replace('mm', p.minute).replace(/^u$/, String(u));
    },
    computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
    computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', k).update(v).digest()).map(b => b > 127 ? b - 256 : b),
    base64Encode: s => Buffer.from(s).toString('base64'), sleep() {}, DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
  },
  UrlFetchApp: { fetch(url) {
    const send = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
    const u = url.replace(/\?v=\d+$/, '');
    let m = u.match(/data\/today\/g\/(\d{5})\.json$/); if (m) return GDATA[m[1]] ? send(200, GDATA[m[1]]) : send(404, {});
    m = u.match(/data\/brief\/(\w+)\.json$/);
    if (m) { if (m[1] === 'index') return send(200, { date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new RealDate(NOW)) }); if (m[1] === 'market') return send(200, { date: '2026-11-25', lines: ['전국 요약'] }); return BRIEFS[m[1]] ? send(200, BRIEFS[m[1]]) : send(404, {}); }
    m = u.match(/data\/(chungyak\/notices\.json|index\.json)$/); if (m) return send(200, DATA[m[1]]);
    return send(404, {});
  } }
};
vm.createContext(ctx);
vm.runInContext(gs + '\n;globalThis.__T = { UC, SC, UH, SSH, BC, AXC, AX_V, hashOf, axTok, axPh, alertsDaily, briefDaily, briefAreas, axCleanup };', ctx);
const T = ctx.__T;
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
const get = p => ctx.doGet({ parameter: p });
sheets['회원'] = makeSheet(); sheets['세션'] = makeSheet(); sheets['회원'].appendRow(T.UH); sheets['세션'].appendRow(T.SSH);
function member(id, favs) {
  const s = crypto.randomBytes(32).toString('hex'), r = [], q = [];
  r[T.UC['카카오id']] = 'k' + id; r[T.UC['닉네임']] = '회원' + id; r[T.UC['저장자료']] = JSON.stringify({ favs: favs || [] }); sheets['회원'].appendRow(r);
  q[T.SC['세션해시']] = T.hashOf('ses|' + s); q[T.SC['카카오id']] = 'k' + id; q[T.SC['만든날']] = new FakeDate(); q[T.SC['만료일']] = new FakeDate(NOW + 90 * 86400000);
  sheets['세션'].appendRow(q);
  return s;
}
const sA = member(1, [P1, P2]), sB = member(2, [P1]), sC = member(3, []);
const axRows = () => sheets['알림구독'] ? sheets['알림구독'].rows.slice(1) : [];
const ax = (r, h) => r[T.AXC[h]];
const prefsCy = { cy: { on: true, regions: [{ sd: '경기도', g: '41273', gn: '안산시 단원구' }] } };

let r = post({ action: 'alertMine', s: sA });
check('서버: 신청 전 상태', r.ok && r.sub === null && r.v === A.V && r.favs === 2, r);
r = post({ action: 'alertJoin', s: sA, email: 'a@example.com', v: A.V, prefs: prefsCy });
check('서버: 동의 체크 없으면 거절', !r.ok && /동의/.test(r.err) && !axRows().length, r);
r = post({ action: 'alertJoin', s: sA, consent: true, email: 'a@example.com', v: 'old', prefs: prefsCy });
check('서버: 동의 문구 판이 다르면 거절', !r.ok && /새로 고친/.test(r.err), r);
r = post({ action: 'alertJoin', s: sA, consent: true, email: 'not-mail', v: A.V });
check('서버: 이메일 형식 확인', !r.ok && /이메일/.test(r.err), r);
r = post({ action: 'alertJoin', s: sC, consent: true, email: 'c@example.com', v: A.V });
check('서버: 관심 단지도 청약 지역도 없으면 거절', !r.ok && /관심 목록/.test(r.err), r);
r = post({ action: 'alertJoin', s: 'f'.repeat(64), consent: true, email: 'a@example.com', v: A.V });
check('서버: 로그인 없으면 거절', !r.ok && r.code === 'auth', r);
const m0 = mails.length;
r = post({ action: 'alertJoin', s: sA, consent: true, email: 'A@Example.com', v: A.V, at: '2026-11-25T07:05:00.000Z', prefs: prefsCy });
const rowA = axRows()[0];
check('서버: 신청 — 동의·동의 시각·문구 판·화면 동의 시각 저장, 이메일은 가린 값만 돌려줌', r.ok && r.sub.state === '활성' && r.sub.mask === 'a***@example.com' && ax(rowA, '동의') === true && ax(rowA, '동의시각') instanceof Date && ax(rowA, '동의문구판') === A.V && /^2026-11-25T07:05/.test(ax(rowA, '화면동의시각')) && !JSON.stringify(r).includes('a@example.com'), r);
check('서버: 신청 확인 메일(답장 주소 = 고객문의 이메일, 모두 끄기 링크)', mails.length === m0 + 1 && mails[mails.length - 1].replyTo === 'chris938@naver.com' && /action=alertOff/.test(mails[mails.length - 1].htmlBody), mails[mails.length - 1]);
post({ action: 'alertJoin', s: sB, consent: true, email: 'b@example.com', v: A.V });

/* 하루 묶음 */
let n0 = mails.length;
T.alertsDaily();
let sentNow = mails.slice(n0);
check('하루 묶음: 신청한 두 사람에게 한 통씩', sentNow.length === 2 && sentNow.map(m => m.to).sort().join(',') === 'a@example.com,b@example.com', sentNow.map(m => m.to));
const mA = sentNow.find(m => m.to === 'a@example.com');
check('하루 묶음: A는 단지 2곳 + 청약(신청 뒤 공고·접수 하루 전), 끄기 링크·답장 주소, 광고 없음', /잠실엘스/.test(mA.htmlBody) && /동아한가람1/.test(mA.htmlBody) && /경기 민영/.test(mA.htmlBody) && (mA.htmlBody.match(/이 단지 알림 끄기/g) || []).length === 2 && /청약 알림 끄기/.test(mA.htmlBody) && mA.replyTo === 'chris938@naver.com' && !/\(광고\)/.test(mA.subject) && !/광고 수신 거부/.test(mA.htmlBody), mA.subject);
check('하루 묶음: 메일 안 이메일 주소·카카오 id 없음', !/k1\b|b@example/.test(mA.htmlBody));
n0 = mails.length; T.alertsDaily();
check('같은 날 다시 돌려도 안 보냄(하루 한 통)', mails.length === n0);
NOW += 86400000; n0 = mails.length; T.alertsDaily();
check('다음 날: 새 알림이 없으면 안 보냄(보낸 알림 다시 안 보냄)', mails.length === n0, mails.slice(n0).map(m => m.subject));
GDATA = { '11710': G2 }; NOW += 86400000; n0 = mails.length; T.alertsDaily();
sentNow = mails.slice(n0);
check('그다음 날: 새로 올라온 거래 1건만 두 사람에게', sentNow.length === 2 && sentNow.every(m => /새 소식 1건/.test(m.subject)), sentNow.map(m => m.subject));
check('보낸 기록: 연락처 없음', !JSON.stringify(sheets['알림기록'].rows).includes('@') && !JSON.stringify(sheets['알림발송'].rows).includes('@'));

/* 끄기 링크 */
const idA = ax(axRows()[0], 'id'), idB = ax(axRows()[1], 'id');
let h = get({ action: 'alertOff', id: idA, t: 'wrong', all: '1' }).s;
check('끄기: 확인값이 틀리면 처리 안 함', /처리하지 못했어요/.test(h) && ax(axRows()[0], '상태') === '활성');
h = get({ action: 'alertOff', id: idA, t: T.axTok(idA), p: T.axPh(A.pid(P1)) }).s;
check('끄기: 이 단지만', /잠실엘스 84㎡대 알림을 껐어요/.test(h) && JSON.parse(ax(axRows()[0], '설정')).mute[0] === A.pid(P1), h);
h = get({ action: 'alertOff', id: idA, t: T.axTok(idA), cy: '1' }).s;
check('끄기: 청약만', /청약 알림을 껐어요/.test(h) && JSON.parse(ax(axRows()[0], '설정')).cy.on === false);
G2.rows.push({ d: '잠실동', j: '35', a: '잠실엘스', b: '84㎡대', dt: 20261126, ar: 84.8, f: 15, p: 310000, day: '2026-11-27', s: '06:01' });
NOW += 86400000; n0 = mails.length; T.alertsDaily();
check('끈 단지 새 거래는 A에게 안 감, B는 받음', mails.slice(n0).map(m => m.to).join(',') === 'b@example.com', mails.slice(n0).map(m => m.to));
h = get({ action: 'alertOff', id: idB, t: T.axTok(idB), all: '1' }).s;
check('끄기: 모든 알림 — 해지·철회 시각·처리 결과 메일', /모두 껐어요/.test(h) && ax(axRows()[1], '상태') === '해지' && ax(axRows()[1], '철회시각') instanceof Date && /알림 메일을 껐어요/.test(mails[mails.length - 1].subject));
G2.rows.push({ d: '잠실동', j: '35', a: '잠실엘스', b: '84㎡대', dt: 20261127, ar: 84.8, f: 16, p: 311000, day: '2026-11-28', s: '06:01' });
NOW += 86400000; n0 = mails.length; T.alertsDaily();
check('해지한 사람에게는 안 감', !mails.slice(n0).some(m => m.to === 'b@example.com'));
NOW += 31 * 86400000; T.axCleanup(new FakeDate());
check('해지 30일 뒤 이메일 원문 지움 · 90일 지난 기록 지움', ax(axRows()[1], '이메일') === '' && ax(axRows()[0], '이메일') === 'a@example.com');

/* 메일 한도 */
post({ action: 'alertJoin', s: sB, consent: true, email: 'b@example.com', v: A.V });
G2.rows.push({ d: '잠실동', j: '35', a: '잠실엘스', b: '84㎡대', dt: 20261228, ar: 84.8, f: 17, p: 312000, day: '2026-12-29', s: '06:01' });
NOW += 86400000; QUOTA = 5; n0 = mails.length; T.alertsDaily();
check('메일 한도: 5통 남으면 멈추고 기록', mails.length === n0 && sheets['알림발송'].rows.some(x => /한도/.test(String(x[3]))));
QUOTA = 100; T.alertsDaily();
check('한도가 풀리면 같은 날 다음 실행에 보냄', mails.length === n0 + 1 && mails[mails.length - 1].to === 'b@example.com');

/* 모닝 브리핑과 한 통으로 */
sheets['회원'].rows[2][T.UC['저장자료']] = JSON.stringify({ favs: [P1], brief: { areas: [{ g: '11710', gn: '송파구', sd: '서울특별시', dn: '' }], apts: [] } });
r = post({ action: 'briefTrial', s: sB, channel: 'email', contact: 'brief-b@example.com', privacy: true });
check('브리핑 체험 시작(합치기 확인용)', r.ok, r);
r = post({ action: 'alertMine', s: sB });
check('alertMine: 브리핑 받는 이메일은 가린 값만', r.brief && r.brief.mask === 'br***@example.com', r.brief);
G2.rows.push({ d: '잠실동', j: '35', a: '잠실엘스', b: '84㎡대', dt: 20261229, ar: 84.8, f: 18, p: 313000, day: '2026-12-30', s: '06:01' });
NOW += 86400000; n0 = mails.length;
T.alertsDaily();
check('브리핑을 이메일로 받는 사람은 알림만 따로 보내지 않음', !mails.slice(n0).some(m => m.to === 'b@example.com' || m.to === 'brief-b@example.com'));
T.briefDaily();
const toB = mails.slice(n0).filter(m => m.to === 'brief-b@example.com' || m.to === 'b@example.com');
check('브리핑 메일 한 통 안에 알림이 함께(끄기 링크 포함)', toB.length === 1 && /모닝 브리핑/.test(toB[0].subject) && /내가 고른 것의 새 소식/.test(toB[0].htmlBody) && /이 단지 알림 끄기/.test(toB[0].htmlBody), toB.map(m => m.subject));
n0 = mails.length; T.alertsDaily(); T.briefDaily();
check('합친 뒤 같은 날 다시 돌려도 더 안 감', mails.length === n0);
r = T.briefAreas({ k: 'pull-FAKE' });
check('브리핑 자료 동네에 알림 구독자 관심 단지 동네가 들어감', r.ok && r.areas.some(a => a.g === '11710'), r);

/* 광고: 브리핑 두 동의가 모두 있을 때만 */
sheets['브리핑광고'] = sheets['브리핑광고'] || makeSheet();
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new RealDate(NOW));
sheets['브리핑광고'].rows.length = 0;
sheets['브리핑광고'].appendRow(['id', '시작일', '종료일', '광고주', '제목', '설명', '링크', '상태', '메모']);
sheets['브리핑광고'].appendRow(['AD1', '2026-01-01', '2027-12-31', '광고주', '광고 제목', '설명', 'https://ad.example/', '게재', '']);
const sD = member(4, [P1]);
post({ action: 'userSave', s: sD, data: { favs: [P1], brief: { areas: [{ g: '11710', gn: '송파구', sd: '서울특별시', dn: '' }] } } });
r = post({ action: 'briefTrial', s: sD, channel: 'email', contact: 'd-brief@example.com', privacy: true });
const bRowD = () => sheets['브리핑구독'].rows.find((x, i) => i > 0 && x[T.BC['카카오id']] === 'k4');
check('광고 확인용 브리핑 행(끝난 구독 — 동의 기록만 남음)', r.ok, r);
bRowD()[T.BC['상태']] = '해지';
post({ action: 'alertJoin', s: sD, consent: true, email: 'd@example.com', v: A.V });
G2.rows.push({ d: '잠실동', j: '35', a: '잠실엘스', b: '84㎡대', dt: 20261230, ar: 84.8, f: 19, p: 314000, day: today(), s: '06:01' });
NOW += 86400000; n0 = mails.length; T.alertsDaily();
let mD = mails.slice(n0).find(m => m.to === 'd@example.com');
check('광고 동의 없음: 알림 메일에 광고 없음', mD && !/\(광고\)/.test(mD.subject) && !/광고 제목/.test(mD.htmlBody), mD && mD.subject);
bRowD()[T.BC['광고동의']] = true; bRowD()[T.BC['아침광고동의']] = true;
G2.rows.push({ d: '잠실동', j: '35', a: '잠실엘스', b: '84㎡대', dt: 20261231, ar: 84.8, f: 21, p: 315000, day: today(), s: '06:01' });
NOW += 86400000; n0 = mails.length;
T.alertsDaily();
mD = mails.slice(n0).find(m => m.to === 'd@example.com');
check('두 광고 동의 모두 있음: 제목 앞 (광고)·광고 1개·광고 수신 거부 링크', mD && /^\(광고\) /.test(mD.subject) && /광고 제목/.test(mD.htmlBody) && /action=briefAdOff/.test(mD.htmlBody), mD && mD.subject);

/* 탈퇴 */
r = post({ action: 'userDelete', s: sA });
check('탈퇴: 알림 구독·기록을 바로 지움', r.ok && !axRows().some(x => ax(x, '카카오id') === 'k1') && !sheets['알림기록'].rows.some(x => x[1] === idA));

/* ---------- ③ 화면 연결 ---------- */
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const center = read('my/alerts/index.html'), sw = read('sw.js'), wj = read('assets/watch.js');
check('알림 센터: 계산·종 부품·로그인 부품을 싣고, 동의 칸은 기본으로 꺼짐', /alerts-core\.js\?v=3/.test(center) && /watch\.js\?v=8/.test(center) && /auth\.js/.test(center) && /id="agree">/.test(center) && !/id="agree" checked/.test(center));
check('알림 센터: 동의 문구에 주어(집예보가 …)와 하루 한 번·오전 7시대', /집예보가 하루 한 번 오전 7시대에 이메일로 알려 주는 것에 동의해요/.test(center));
check('알림 센터: 경쟁 앱 이름 없음, 회사명 대신 서비스 이름', !/호갱|직방|리치고|아실|다방/.test(center) && !/장대장부동산그룹/.test(center));
check('서비스 워커: 알림 센터·계산 파일을 저장 목록에, 판 번호 올림', /'\.\/my\/alerts\/'/.test(sw) && /alerts-core\.js\?v=3/.test(sw) && /watch\.js\?v=8/.test(sw) && /jdj-v(\d+)/.test(sw));
check('종 단추: 알림 센터로 가는 링크·안 본 수', /my\/alerts\//.test(wj) && /새 알림 \$\{r\.unread\}건/.test(wj));
const pages = ['index.html', 'my/watch/index.html', 'ask/index.html', 'quiz/index.html', 'mine/index.html', 'buy/report/index.html', 'rank/index.html', 'map/index.html', 'track/detail/index.html'];
check('watch.js 를 싣는 화면은 모두 새 판(v=8)과 계산 파일', pages.every(p => { const s = read(p); return /watch\.js\?v=8/.test(s) && !/assets\/watch\.js\?v=7/.test(s) && /alerts-core\.js\?v=3/.test(s) && s.indexOf('alerts-core.js') < s.indexOf('assets/watch.js'); }));
const oldCopy = /카카오톡으로 알려 드릴게요|발송을 시작하면|발송 시작 때|발송 시작 시|id="alrBtn"/;
check('예전 카카오톡 알림 신청 문구가 남지 않음(단지·로그인·관심 지역·단지 이유 칸)', ['mine/index.html', 'login/index.html', 'assets/area-watch.js', 'assets/narrative.js'].every(p => !oldCopy.test(read(p))));
check('단지 화면 알림 칸: 관심 목록 넣기 + 알림 센터 + 카카오톡은 준비 중(날짜 약속 없음)', (s => /이 단지에 새 거래·신고가가 나오면 알려 드려요/.test(s) && /JDJ_WATCH\.star\(p, \{label: true\}\)/.test(s) && /my\/alerts\//.test(s) && /카카오톡 알림은 준비하고 있어요/.test(s))(read('mine/index.html')));
check('안내 문서: 대표가 신청할 것과 걸리는 기간', /비즈니스 채널/.test(read('docs/alerts.md')) && /알림톡 딜러/.test(read('docs/alerts.md')) && /080/.test(read('docs/alerts.md')) && /alertsInstall/.test(read('docs/alerts.md')));

console.log(`\n알림 1단계 확인: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
