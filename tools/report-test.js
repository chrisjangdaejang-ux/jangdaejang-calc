/* 내 집 성적표(주간) + 관심 단지 즉시 알림 새 종류 자동 확인 — 실행: node tools/report-test.js </dev/null
   ① assets/report-core.js: 카드(공식 숫자 그대로)·쉬운 말 문장·지난 성적표와의 차이·순자산·층 참고값·메일(끄기 링크, 개인 값 없음)
   ② assets/alerts-core.js 새 종류: 전세가율 80%·90% 선, 근처 신축 허가(500m), 근처 청약 공고 — 새 종류는 직접 켠 경우에만, 같은 공고는 한 번만
   ③ tools/agent-backend.gs(v49): 두 계산 블록이 화면과 글자 그대로 같은지, 성적표 메일(켠 사람만·그날 자료만·같은 날 한 번·끄기 링크·광고 없음),
      회원 저장 자료 rp(대출 잔액·보정) 저장·되돌려 주기·다른 사람에게 안 보임, 트리거
   ④ 화면: my/report/·알림 센터·서비스 워커·서비스 이름 하드코딩 없음·경쟁 앱 이름 없음
   가짜 시트·메일·공개 자료 위에서만 돌고 실제 서버에는 접속하지 않습니다. 금액 단위: 만원. */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const RC = require('../assets/report-core.js'), A = require('../assets/alerts-core.js');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 700) : ''); } }
const ROOT = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ---------- ① 성적표 계산 ---------- */
const P = { sd: 's00', code: '11680', dong: '개포동', jibun: '1', apt: 'A아파트', band: '84㎡대' };
const R = { v: 1, g: '11680', date: '2026-11-30', pd: '2026-11-23',
  wk: { w: '2026-48', from: '2026-11-23', to: '2026-11-29', st: 'prov', g: { nm: '강남구', chg: 0.12, np: 41, n: 60, mchg: 0.3, mnp: 150, old: 0 }, sd: { nm: '서울', chg: 0.08, np: 400 }, kr: { nm: '전국', chg: -0.02, np: 3000 } },
  u: { '개포동|1|A아파트|84㎡대': [215000, 2, 74, 81.2, 5, 1, '202611', 110, [[20261125, 12, 216000, 0, 1], [20261110, 3, 205000, 1, 0]]] },
  p: { '개포동|1|A아파트|84㎡대': [210000, 3, 71, 78.4] },
  d: { '개포동': { n: 9, nn: 2, nw: [['B단지', '59㎡대', 20261126, 5, 150000, 0, 0], ['A아파트', '84㎡대', 20261125, 12, 216000, 0, 1]] } } };
const c = RC.card(P, R);
check('카드: 공식 숫자 그대로(시세·순위·점수·전세가율·시·도 등수)', c.price.v === 215000 && c.rank.r === 2 && c.rank.n === 5 && c.rank.same && c.fv.v === 74 && c.fv.sr === 110 && c.jr.v === 81.2 && c.jr.line === 80, c);
check('카드: 지난 성적표 값', c.price.v0 === 210000 && c.rank.r0 === 3 && c.fv.v0 === 71 && c.jr.v0 === 78.4 && c.pd === '2026-11-23');
check('카드: 점수는 화면과 같이 99점까지', RC.card(P, Object.assign({}, R, { u: { '개포동|1|A아파트|84㎡대': [1, 1, 104, 50, 2, 0, '', 1, []] } })).fv.v === 99);
check('카드: 없는 집·자료 없음은 null', RC.card(Object.assign({}, P, { apt: '없는단지' }), R) === null && RC.card(P, null) === null);
const L = RC.lines(c, '강남구'), by = {}; L.forEach(l => { by[l.k] = l; });
check('문장: 이번 주 가격 흐름(가운데 50% 평균을 쉬운 말로, 잠정 표시, 시·도·전국)', /지난주\(11\/23~11\/29\) 강남구 아파트값은 같은 집끼리 비교해 \+0\.12% 올랐어요/.test(by.wk.t) && /41쌍/.test(by.wk.s) && /4분의 1씩을 빼고 평균/.test(by.wk.s) && /잠정/.test(by.wk.s) && /서울 전체 \+0\.08% · 전국 −0\.02%/.test(by.wk.s), by.wk);
check('문장: 시세 차이(지난번보다 5,000만 원 올랐어요)', /21억 5,000만 원 · 지난번보다 5,000만 원 올랐어요/.test(by.price.t), by.price);
check('문장: 동네 순위 올라감', /개포동 같은 평형대 아파트 5곳 중 2위 · 지난번 3위 → 1계단 올랐어요/.test(by.rank.t), by.rank);
check('문장: 미래가치 점수 차이·참고 점수 설명', /74점 · 지난번 71점 → \+3점 · 시·도 안 110위/.test(by.fv.t) && /참고 점수/.test(by.fv.s), by.fv);
check('문장: 전세가율 80% 넘음 경고', /81\.2% · 지난번 78\.4% → \+2\.8%p/.test(by.jr.t) && /80%를 넘었어요/.test(by.jr.s), by.jr);
check('문장: 우리 동네 새 거래(지난 성적표 뒤 처음 보인 것)', /지난 성적표\(11\/23\) 뒤 개포동에 새로 올라온 아파트 거래 2건/.test(by.near.t) && /B단지 59㎡대 11\/26 5층 15억 원/.test(by.near.s), by.near);
check('문장: 최근 실거래(신고가·직거래 표시)', /11\/25 12층 21억 6,000만 원\(신고가\) · 11\/10 3층 20억 5,000만 원\(직거래\)/.test(by.trade.t), by.trade);
const noWk = RC.lines(RC.card(P, Object.assign({}, R, { wk: null, pd: '', p: {}, d: { '개포동': { n: 0, nr: 0, rc: [] } } })), '강남구');
check('문장: 주간 동향 없음·지난 성적표 없음·최근 2주 거래 없음', /아직 없어요/.test(noWk[0].t) && !noWk.some(l => /지난번/.test(l.t)) && /최근 2주 개포동에서 신고된 아파트 거래는 아직 없어요/.test(noWk.find(l => l.k === 'near').t), noWk);
const smallWk = RC.lines(RC.card(P, Object.assign({}, R, { wk: Object.assign({}, R.wk, { g: { nm: '강남구', chg: null, np: 12, mchg: 0.41 } }) })), '강남구')[0];
check('문장: 표본 부족이면 변동률을 내지 않고 4주 숫자만', /12쌍이라 변동률을 내지 않았어요/.test(smallWk.t) && /30쌍 이상일 때만/.test(smallWk.s) && /\+0\.41%/.test(smallWk.s), smallWk);
const allText = L.map(l => l.t + ' ' + l.s).join(' ') + noWk.map(l => l.t + ' ' + l.s).join(' ');
check('문장: 보장·확정 수익 같은 말 없음, 반말 없음', !/보장|확실히|반드시 오|무조건|틀림없|수익을 약속/.test(allText) && L.every(l => /요[.)]?$|요\)|[0-9%원]\)?$|건$|위$|점$/.test(l.s.trim()) || /요/.test(l.s)), L.map(l => l.s));
/* v55 지난번 예측 → 실제 */
const Rh = Object.assign({}, R, { hitp: 5, lw: { '개포동|1|A아파트|84㎡대': [[20261125, 12, 216000, 210000, 2.9, 1], [20261120, 2, 190000, 209000, -9.1, 0]] }, ht: { '개포동|1|A아파트|84㎡대': [7, 5] } });
const ch = RC.card(P, Rh), lh = RC.lines(ch, '강남구').find(l => l.k === 'hit');
check('v55 적중: 지난번 시세 → 실제 거래(차이 %)·지금까지 7건 중 5건(71%)', lh && /지난번 시세 21억 원 → 실제 거래 21억 6,000만 원\(\+2\.9%\) · 19억 원\(−9\.1%\)/.test(lh.t) && /7건 중 5건 적중\(71%\)/.test(lh.s) && /±5%/.test(lh.s), lh);
const ch0 = RC.lines(RC.card(P, Object.assign({}, Rh, { lw: {} })), '강남구').find(l => l.k === 'hit');
check('v55 적중: 지난주 새 거래가 없으면 그렇게 말하고 누적만', ch0 && /새로 신고된 거래가 없어요/.test(ch0.t) && /7건 중 5건/.test(ch0.s), ch0);
check('v55 적중: 자료가 없으면 줄 없음', !RC.lines(c, '강남구').some(l => l.k === 'hit'));
check('순자산 = 집값 − 대출(비율)', JSON.stringify(RC.net(215000, 80000)) === JSON.stringify({ net: 135000, ratio: 37.2 }) && RC.net(0, 1) === null && RC.net(215000, -1) === null && RC.net(215000, 0).net === 215000);
const TR = [[20261120, 84.9, 10, 210000, 0, 0], [20261001, 84.9, 12, 220000, 0, 0], [20260801, 84.9, 9, 200000, 0, 0], [20260701, 84.9, 11, 150000, 1, 0], [20250101, 84.9, 10, 100000, 0, 0], [20261102, 84.9, 25, 260000, 0, 0]];
const fr = RC.floorRef(TR, 10, '2026-11-30');
check('층 참고값: 내 층 ±3·최근 1년·직거래 뺀 중간값, 3건 미만이면 값 없음', fr.n === 3 && fr.med === 210000 && fr.lo === 200000 && fr.hi === 220000 && RC.floorRef(TR, 25, '2026-11-30').med === null && RC.floorRef(TR, 'x', '2026-11-30') === null, fr);
check('메일 집 고르기: 내 집 먼저·같은 집 한 번·6곳까지', (() => { const h = [P], f = [P, ...Array.from({ length: 8 }, (_, i) => Object.assign({}, P, { apt: 'F' + i }))]; const x = RC.places(h, f); return x.length === 6 && x[0] === P && x.filter(p => p.apt === P.apt).length === 1; })());
const MH = RC.mailHtml([{ c, g: '강남구', mine: true }], { site: '테스트웹', web: 'https://web.example/', links: { rp: 'https://s.example/exec?action=alertOff&id=X&t=T&rp=1', all: 'https://s.example/exec?action=alertOff&id=X&t=T&all=1' }, sender: { name: '회사', tel: '02-0000-0000', email: 'help@example.com' }, date: '2026-11-30' });
check('메일: 서비스 이름은 넘겨받은 값, 제목·끄기 링크 두 개·설정 링크·광고 아님', /\[테스트웹\] 11\/30 내 집 성적표 — A아파트/.test(MH.subject) && /rp=1/.test(MH.html) && /all=1/.test(MH.html) && /my\/alerts\//.test(MH.html) && /광고가 아니에요/.test(MH.html) && !/집예보/.test(MH.html) && !/\(광고\)/.test(MH.subject), MH.subject);
check('메일: 공유 주소에는 공개 칸만(대출·보정 없음)', /my\/report\/\?sd=s00&amp;d=11680%7C%EA%B0%9C%ED%8F%AC%EB%8F%99%7C1%7CA%EC%95%84%ED%8C%8C%ED%8A%B8&amp;b=84/.test(MH.html) && !/대출|순자산|loan/.test(MH.html));
check('메일: 꺾쇠 막기', !/<script>/.test(RC.mailHtml([{ c: RC.card(Object.assign({}, P, { apt: '<script>' }), { u: { '개포동|1|<script>|84㎡대': [1, null, null, null, null, 0, '', null, []] } }), g: '' }], {}).html));

/* ---------- ② 알림 새 종류 ---------- */
const PA = { sd: 's00', code: '11710', dong: '잠실동', jibun: '35', apt: '잠실엘스', band: '84㎡대' };
const G = { date: '2026-11-25', d0: '2026-11-24', rows: [], u: { '잠실동|35|잠실엘스|84㎡대': [70, 10, 81.0] }, u0: { '잠실동|35|잠실엘스|84㎡대': [70, 10, 79.5] } };
let ev = A.placeEvents(PA, G, null);
check('전세가율 80% 선을 넘으면 알림(5%p 변화가 아니어도)', ev.length === 1 && ev[0].k === 'jeonse' && /80%를 넘었어요: 79\.5% → 81\.0%/.test(ev[0].t) && /보증보험/.test(ev[0].s), ev);
const G9 = { u: { '잠실동|35|잠실엘스|84㎡대': [70, 10, 78.0] }, u0: { '잠실동|35|잠실엘스|84㎡대': [70, 10, 91.0] } };
ev = A.placeEvents(PA, G9, null);
check('90%·80% 아래로 함께 내려오면 각각 + 5%p 변화', ev.map(e => e.key.replace(/^.*\|/, '')).join(',') === '78,d,d' || ev.filter(e => /아래로 내려왔어요/.test(e.t)).length === 2, ev.map(e => e.t));
check('선 넘음은 같은 방향이면 같은 알림 id(다시 안 보냄)', A.placeEvents(PA, G, null)[0].id === A.placeEvents(PA, Object.assign({}, G, { date: '2026-12-01' }), null)[0].id);
const NB = { asof: '2026-11-22', kinds: { dase: '다세대', offi: '오피스텔' }, rows: [
  { id: 'N1', k: 'dase', st: 'permit', g: '11710', dn: '송파구 잠실동', xy: [127.0915, 37.5135], u: 18, pm: '202610' },     // 약 320m
  { id: 'N2', k: 'offi', st: 'permit', g: '11710', dn: '송파구 잠실동', xy: [127.10, 37.52], u: 40, pm: '202611' },        // 1.2km 밖
  { id: 'N3', k: 'dase', st: 'build', g: '11710', dn: '송파구 잠실동', xy: [127.0912, 37.5100], u: 10, pm: '202610' },    // 공사 중
  { id: 'N4', k: 'dase', st: 'permit', g: '11710', dn: '송파구 잠실동', xy: [127.0912, 37.5100], u: 10, pm: '202605' }] };  // 오래된 허가
const XY = [127.09114, 37.50992];
const nb = A.nbEvents(PA, XY, NB, '');
check('근처 신축 허가: 500m 안·허가 단계·최근 3달만, 거리는 50m 단위 대략', nb.length === 1 && nb[0].key === 'n|' + A.pid(PA) + '|N1' && /약 \d+m 거리에 신축 허가가 났어요: 송파구 잠실동 다세대 18세대/.test(nb[0].t) && /100m 범위/.test(nb[0].s) && nb[0].m % 50 === 0, nb);
check('근처 신축 허가: 신청한 달 전 허가는 안 보냄', A.nbEvents(PA, XY, NB, '2026-11-25').length === 0);
const NOT = [{ no: 'C1', n: '송파 새단지', sd: '서울특별시', g: '송파구', k: '민영', pb: '20261124', sp: ['20261201', ''], r1: ['20261202', ''], rc: ['20261201', ''], pw: '20261209', u: 'https://www.applyhome.co.kr/x' },
  { no: 'C2', n: '강동 단지', sd: '서울특별시', g: '강동구', k: '민영', pb: '20261124', r1: ['20261202', ''], pw: '20261209' },
  { no: 'C3', n: '송파 옛공고', sd: '서울특별시', g: '송파구', k: '민영', pb: '20261001', r1: ['20261010', ''], pw: '20261020' }];
const SG = c => c === '11710' ? { sido: '서울특별시', name: '송파구' } : null;
const near = A.cyNear(PA, SG('11710'), NOT, '2026-11-25', '');
check('근처 청약: 같은 시·군·구·최근 14일·접수 안 끝난 공고만', near.length === 1 && near[0].no === 'C1' && /관심 단지와 같은 송파구에 송파 새단지 청약 공고가 나왔어요/.test(near[0].t) && near[0].u, near);
const base = { places: [PA], g: { '11710': G }, s: {}, notices: NOT, today: '2026-11-25', nb: NB, xy: () => XY, sg: SG };
let D = A.digest(Object.assign({}, base, { prefs: {} }));
check('새 두 종류는 기본으로 꺼짐(직접 켜야 받음) — 기존 종류는 그대로', D.n === 1 && D.groups[0].ev[0].k === 'jeonse' && A.cleanPrefs({}).kinds.nb === false && A.cleanPrefs({}).kinds.cynear === false && A.cleanPrefs({}).kinds.high === true, D.groups.map(g => g.ev.map(e => e.k)));
D = A.digest(Object.assign({}, base, { prefs: { kinds: { nb: true, cynear: true } } }));
check('켜면 근처 신축·근처 청약도 하루 묶음 한 통에', D.groups.length === 1 && D.groups[0].ev.map(e => e.k).sort().join(',') === 'cynear,jeonse,nb', D.groups[0].ev.map(e => e.k));
D = A.digest(Object.assign({}, base, { prefs: { kinds: { nb: true, cynear: true }, cy: { on: true, regions: [{ sd: '서울특별시', g: '11710', gn: '송파구' }] } } }));
check('같은 공고는 한 번만: 청약 맞춤(새 공고)으로 가면 근처 청약은 뺌', D.cy.some(e => e.key === 'c|C1|new') && !D.groups[0].ev.some(e => e.k === 'cynear'), [D.cy.map(e => e.key), D.groups[0].ev.map(e => e.k)]);
D = A.digest(Object.assign({}, base, { places: [PA, Object.assign({}, PA, { apt: '리센츠', jibun: '19' })], prefs: { kinds: { cynear: true, jeonse: false } } }));
check('같은 구 관심 단지가 둘이어도 근처 청약은 한 번', D.groups.reduce((n, g) => n + g.ev.filter(e => e.k === 'cynear').length, 0) === 1, D.groups.map(g => g.ev.map(e => e.k)));
check('알림 센터 종류 이름: 신고가·새 실거래·전세가율·근처 신축 허가·근처 청약 공고', ['신고가', '새 실거래', '전세가율', '근처 신축 허가', '근처 청약 공고'].every(n => Object.values(A.KINDS).indexOf(n) >= 0));
check('설정: rp(성적표 메일)는 켠 경우에만 true', A.cleanPrefs({}).rp === false && A.cleanPrefs({ rp: true }).rp === true && A.cleanPrefs({ rp: 'yes' }).rp === false);

/* ---------- ③ 서버 ---------- */
const gs = read('tools/agent-backend.gs');
const blk = (s, n) => { const a = s.indexOf(`/* ${n}-CORE BEGIN`), b = s.indexOf(`/* ${n}-CORE END */`); return a >= 0 && b > a ? s.slice(a, b) : null; };
check('서버 REPORT-CORE = 화면 report-core.js(글자 그대로)', blk(gs, 'REPORT') && blk(gs, 'REPORT') === blk(read('assets/report-core.js'), 'REPORT'));
check('서버 ALERTS-CORE = 화면 alerts-core.js(글자 그대로)', blk(gs, 'ALERTS') && blk(gs, 'ALERTS') === blk(read('assets/alerts-core.js'), 'ALERTS'));
function makeSheet() {
  const rows = [];
  const sh = { rows, getDataRange() { return { getValues: () => rows.map(r => r.slice()) }; }, getLastRow() { return rows.length; },
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
const props = { BRIEF_PULL_TOKEN: 'pull-FAKE' }, mails = [], triggers = [];
let NOW = Date.parse('2026-11-30T07:10:00+09:00'), QUOTA = 100;   // v55 월요일 7시대 발송
const RealDate = Date;
class FakeDate extends RealDate { constructor(...a) { if (!a.length) super(NOW); else super(...a); } static now() { return NOW; } }
const kday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new RealDate(NOW));
let RIX = { date: '2026-11-30' };
const RG = { '11680': R };
const ctx = {
  console, Date: FakeDate, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, isFinite, encodeURIComponent, decodeURIComponent, parseInt, parseFloat,
  SpreadsheetApp: { getActive: () => book, openById: () => book },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail: o => { QUOTA--; mails.push(o); }, getRemainingDailyQuota: () => QUOTA },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, getService: () => ({ getUrl: () => 'https://script.example/exec' }), WeekDay: { MONDAY: 'MONDAY' },
    newTrigger: h => ({ timeBased: () => ({ onWeekDay: d => ({ atHour: hr => ({ inTimezone: tz => ({ create() { triggers.push([h, d, hr, tz]); } }) }) }), everyDays: () => ({ atHour: hr => ({ inTimezone: tz => ({ create() { triggers.push([h, 'daily', hr, tz]); } }) }) }) }) }) },
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
    const u = url.replace(/[?&]v=\d+$/, '');
    if (/data\/report\/index\.json$/.test(u)) return RIX ? send(200, RIX) : send(404, {});
    let m = u.match(/data\/report\/g\/(\d{5})\.json$/); if (m) return RG[m[1]] ? send(200, RG[m[1]]) : send(404, {});
    if (/data\/index\.json$/.test(u)) return send(200, { sgg: { '11680': { name: '강남구', sido: '서울특별시' } }, sido: [] });
    if (/chungyak\/notices\.json$/.test(u)) return send(200, { rows: [] });
    return send(404, {});
  } }
};
vm.createContext(ctx);
vm.runInContext(gs + '\n;globalThis.__T = { UC, SC, UH, SSH, AXC, hashOf, axTok, reportWeekly, alertsInstall, cleanRp };', ctx);
const T = ctx.__T;
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
const get = p => ctx.doGet({ parameter: p });
sheets['회원'] = makeSheet(); sheets['세션'] = makeSheet(); sheets['회원'].appendRow(T.UH); sheets['세션'].appendRow(T.SSH);
function member(id, data) {
  const s = crypto.randomBytes(32).toString('hex'), r = [], q = [];
  r[T.UC['카카오id']] = 'k' + id; r[T.UC['닉네임']] = '회원' + id; r[T.UC['저장자료']] = JSON.stringify(data || {}); sheets['회원'].appendRow(r);
  q[T.SC['세션해시']] = T.hashOf('ses|' + s); q[T.SC['카카오id']] = 'k' + id; q[T.SC['만든날']] = new FakeDate(); q[T.SC['만료일']] = new FakeDate(NOW + 90 * 86400000);
  sheets['세션'].appendRow(q);
  return s;
}
const HOME = Object.assign({ t: '2026-11-20', bp: 150000, bd: '2019-03' }, P);
const sA = member(1, { homes: [HOME] }), sB = member(2, { favs: [P] }), sC = member(3, { homes: [HOME] });
let r = post({ action: 'alertJoin', s: sA, consent: true, email: 'a@example.com', v: A.V });
check('서버: 관심 단지·청약 없이 내 집만 있으면 성적표를 켜야 신청됨', !r.ok && /내 집을 등록/.test(r.err), r);
r = post({ action: 'alertJoin', s: sA, consent: true, email: 'a@example.com', v: A.V, prefs: { rp: true } });
check('서버: 성적표 켜고 신청 → 설정에 rp 저장, alertMine 이 집 수·새 판 표시', r.ok && r.sub.prefs.rp === true && r.homes === 1 && r.rp === 1, r);
post({ action: 'alertJoin', s: sB, consent: true, email: 'b@example.com', v: A.V });          // 성적표는 안 켬
post({ action: 'alertJoin', s: sC, consent: true, email: 'c@example.com', v: A.V, prefs: { rp: true } });
let n0 = mails.length;
RIX = { date: '2026-11-29' };
check('성적표: 그날 자료가 아니면 안 보내고 기록만', T.reportWeekly() === -1 && mails.length === n0 && sheets['알림발송'].rows.some(x => /자료가 아직 없어/.test(String(x[3]))));
RIX = { date: '2026-11-30' };
const sent = T.reportWeekly(), out = mails.slice(n0);
check('성적표: 켠 사람(A·C)에게만 한 통씩', sent === 2 && out.map(m => m.to).sort().join(',') === 'a@example.com,c@example.com', out.map(m => m.to));
const mA = out.find(m => m.to === 'a@example.com');
check('성적표 메일: 내 집 카드·성적표만 끄기·모든 알림 끄기·답장 주소·광고 없음', /내 집 성적표/.test(mA.subject) && /A아파트/.test(mA.htmlBody) && /action=alertOff[^"]*rp=1/.test(mA.htmlBody) && /all=1/.test(mA.htmlBody) && mA.replyTo === 'chris938@naver.com' && !/\(광고\)/.test(mA.subject), mA.subject);
n0 = mails.length; T.reportWeekly();
check('성적표: 같은 날 다시 돌려도 안 보냄', mails.length === n0);
const idA = sheets['알림구독'].rows.slice(1).find(x => x[T.AXC['카카오id']] === 'k1')[T.AXC['id']];
let h = get({ action: 'alertOff', id: idA, t: T.axTok(idA), rp: '1' }).s;
check('끄기 링크: 성적표만 꺼짐(구독은 그대로)', /내 집 성적표 메일을 껐어요/.test(h) && JSON.parse(sheets['알림구독'].rows.slice(1).find(x => x[T.AXC['카카오id']] === 'k1')[T.AXC['설정']]).rp === false && sheets['알림구독'].rows.slice(1).find(x => x[T.AXC['카카오id']] === 'k1')[T.AXC['상태']] === '활성', h);
NOW += 7 * 86400000; RIX = { date: kday() }; RG['11680'] = Object.assign({}, R, { date: kday() }); n0 = mails.length; T.reportWeekly();
check('다음 주: 끈 사람(A)에게는 안 가고 C만', mails.slice(n0).map(m => m.to).join(',') === 'c@example.com', mails.slice(n0).map(m => m.to));
QUOTA = 5; NOW += 7 * 86400000; RIX = { date: kday() }; n0 = mails.length; T.reportWeekly();
check('메일 한도에 닿으면 멈추고 기록', mails.length === n0 && sheets['알림발송'].rows.some(x => x[2] === '성적표' && /한도/.test(String(x[3]))));
QUOTA = 100;
check('보낸 기록에 연락처 없음', !JSON.stringify(sheets['알림기록'].rows).includes('@') && !JSON.stringify(sheets['알림발송'].rows).includes('@'));
/* 회원 저장 자료 rp */
const key = [P.code, P.dong, P.jibun, P.apt, P.band].join('|');
r = post({ action: 'userSave', s: sA, data: { homes: [HOME], rp: { adj: { [key]: { fl: 12, ext: 'y', rem: 'zz' }, 'bad<key': { fl: 1 } }, loan: { [key]: 35000, [key + 'x']: 'NaN' }, hist: [['2026-11-30', key, 215000, 35000], ['bad', key, 1, 1]], t: 1700000000000 } } });
check('저장 자료 rp: 모양 확인 뒤 저장(이상한 키·값은 버림)', r.ok && r.data.rp.adj[key].fl === 12 && r.data.rp.adj[key].ext === 'y' && r.data.rp.adj[key].rem === '' && !r.data.rp.adj['bad<key'] && r.data.rp.loan[key] === 35000 && Object.keys(r.data.rp.loan).length === 1 && r.data.rp.hist.length === 1, r.data && r.data.rp);
r = post({ action: 'userLoad', s: sA });
check('저장 자료 rp: 본인 불러오기에 그대로', r.ok && r.data.rp.loan[key] === 35000 && r.data.rp.t === 1700000000000);
r = post({ action: 'userLoad', s: sB });
check('저장 자료 rp: 다른 사람에게는 빈 값', r.ok && Object.keys(r.data.rp.loan).length === 0);
check('대출 잔액은 성적표 메일에 없음', !mails.some(m => /35,000|3억 5,000만/.test(m.htmlBody)));
T.alertsInstall();
check('트리거: alertsInstall 하나로 매일 알림(7·9시) + 월요일 성적표(v55: 7·8시)', JSON.stringify(triggers.filter(t => t[0] === 'reportWeekly').map(t => [t[1], t[2]])) === JSON.stringify([['MONDAY', 7], ['MONDAY', 8]]) && triggers.filter(t => t[0] === 'alertsDaily').length === 2, triggers);
check('알림톡은 꺼진 자리만(RP_ALIMTALK=false)', /const RP_ALIMTALK = false;/.test(gs));

/* ---------- ④ 화면 ---------- */
const page = read('my/report/index.html'), center = read('my/alerts/index.html'), sw = read('sw.js');
check('성적표 화면: 계산 블록·내 집·관심 부품을 싣고 서비스 이름은 설정에서', /report-core\.js\?v=5/.test(page) && /mine-core\.js/.test(page) && /watch\.js\?v=9/.test(page) && /SITE_NAME/.test(page) && !/집예보/.test(page.replace("|| '집예보'", '')) && !/장대장부동산그룹/.test(page));
check('성적표 화면: 경쟁 앱 이름·보장 문구 없음', !/호갱|직방|리치고|아실|다방|네이버 부동산|KB부동산/.test(page) && !/보장|무조건|확실히 오/.test(page));
check('성적표 화면: 대출·보정은 이 기기(jdj_report_me)와 내 계정에만, 공유 주소에는 공개 칸만', /jdj_report_me/.test(page) && /d\.rp = ME/.test(page) && /shareUrl = p => `\$\{location\.origin\}\$\{BASE\}my\/report\/\?sd=/.test(page) && !/shareUrl[^\n]*loan/.test(page));
check('성적표 화면: 보정 값은 공식 숫자와 따로("내가 적은 정보")', (page.match(/내가 적은 정보/g) || []).length >= 2 && /공식 숫자와 점수는 바뀌지 않아요/.test(page));
check('알림 센터: 성적표 메일 켜기(기본 꺼짐)·새 종류 설명·성적표 화면 링크', /id="rp"/.test(center) && /drawRp/.test(center) && /새로 생긴 알림이라 직접 켜야 받아요/.test(center) && /my\/report\//.test(center));
check('알림 센터: 서버가 새 칸을 모르면 이 기기 값을 지킴', /newSrv\(\)/.test(center) && /S0\.rp = L0\.rp/.test(center));
check('서비스 워커: 성적표 화면·계산 파일', /'\.\/my\/report\/'/.test(sw) && /report-core\.js\?v=5/.test(sw));
check('내 집 시세 화면에서 성적표로', /my\/report\//.test(read('mine/index.html')));
check('안내 문서: 재배포·alertsInstall·알림톡 템플릿 초안', (d => /reportWeekly/.test(d) && /alertsInstall/.test(d) && /템플릿/.test(d) && /#{/.test(d))(read('docs/alerts.md')));

console.log(`\n성적표·새 알림 확인: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
