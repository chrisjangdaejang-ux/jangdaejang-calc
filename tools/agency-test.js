/* 집예보 분양대행(v20) 자동 검증 — 실행: node tools/agency-test.js
   ① 시행사 전속 의뢰(agencyApply) ② 판매 파트너 신청·로그인(관리코드 해시만) ③ 파트너에게 보이는 현장 조건(승인·위탁계약·재위탁 승낙·모집 중·기간)
   ④ 수수료 조건은 배정된 파트너에게만 ⑤ 계약 보고(고객 이름·연락처 거절, 동·호수 중복) ⑥ 정산표 ⑦ 화면(partner/, bunyang/agency/) 문구·동의 판.
   구글 시트·메일은 가짜 객체로 흉내 냅니다. */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');

function makeSheet() {
  const rows = [];
  const sh = {
    rows,
    getDataRange() { return { getValues: () => rows.map(r => r.slice()) }; },
    getLastRow() { return rows.length; },
    appendRow(r) { rows.push(r.slice()); },
    deleteRow(r) { rows.splice(r - 1, 1); },
    setFrozenRows() {},
    getRange(r, c, nr, nc) {
      const rg = {
        setValues(v) { v.forEach((line, i) => line.forEach((x, j) => { (rows[r - 1 + i] = rows[r - 1 + i] || [])[c - 1 + j] = x; })); return rg; },
        setValue(x) { (rows[r - 1] = rows[r - 1] || [])[c - 1] = x; return rg; },
        getValue() { return (rows[r - 1] || [])[c - 1]; },
        getValues() { return [(rows[r - 1] || []).slice(c - 1, c - 1 + (nc || 1))]; },
        setFontWeight() { return rg; }, setBackground() { return rg; }, setFontColor() { return rg; }, setNumberFormat() { return rg; }, insertCheckboxes() { return rg; }
      };
      return rg;
    }
  };
  return sh;
}
const sheets = {};
const book = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet()), getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST', getSheets: () => Object.values(sheets), deleteSheet(sh) { Object.keys(sheets).forEach(k => { if (sheets[k] === sh) delete sheets[k]; }); } };
sheets['중개사'] = makeSheet(); sheets['로그'] = makeSheet();
const props = {};
const cacheMap = new Map();
const mails = [], fetched = [];
let priceJson = {};
const signed = b => Array.from(b).map(x => x > 127 ? x - 256 : x);
const unsigned = a => Buffer.from(a.map(x => x & 255));
const ctx = {
  console,
  SpreadsheetApp: { getActive: () => book, openById: () => book },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: k => cacheMap.has(k) ? cacheMap.get(k) : null, put: (k, v) => cacheMap.set(k, v), remove: k => cacheMap.delete(k) }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail(o) { mails.push(o); }, getRemainingDailyQuota: () => 100 },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  HtmlService: { createHtmlOutput: h => ({ html: h }) },
  ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ inTimezone: () => ({ create() {} }) }) }) }) }), getService: () => ({ getUrl: () => 'https://script.google.com/x/exec' }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    formatDate: (d, tz, f) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).map(x => [x.type, x.value]));
      return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('hh', p.hour).replace('mm', p.minute);
    },
    computeDigest: (alg, s) => signed(crypto.createHash('sha256').update(s, 'utf8').digest()),
    computeHmacSha256Signature: (v, k) => signed(crypto.createHmac('sha256', k).update(v, 'utf8').digest()),
    base64EncodeWebSafe: a => unsigned(a).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
    base64DecodeWebSafe: s => signed(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
    newBlob: x => typeof x === 'string' ? { getBytes: () => signed(Buffer.from(x, 'utf8')) } : { getDataAsString: () => unsigned(x).toString('utf8') },
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, sleep() {}
  },
  UrlFetchApp: {
    fetch(url, opt) {
      fetched.push(url);
      if (/api\.solapi\.com/.test(url)) { fetched.push(JSON.parse(opt.payload)); return { getResponseCode: () => 200, getContentText: () => '{}' }; }
      const g = (url.match(/price\/(\d{5})\.json$/) || [])[1];
      if (g && priceJson[g]) return { getContentText: () => JSON.stringify(priceJson[g]), getResponseCode: () => 200 };
      throw new Error('404 ' + url);
    }
  }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8') + '\n;globalThis.__T = { STH, STC, PAH, PAC, DLC, settleSheet, setupAgency, siteOpen, DV_CONSENT_V, PT_CONSENT_V };', ctx);
const T = ctx.__T;
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
const rows = [];
function check(name, got, want) { const ok = JSON.stringify(got) === JSON.stringify(want); rows.push({ ok, name, got, want }); }
const allCells = () => JSON.stringify(Object.values(sheets).map(s => s.rows));

T.setupAgency();
check('setupAgency: 시트 7개', ['분양대행의뢰', '분양현장', '판매파트너', '파트너세션', '현장배정', '계약보고', '수수료정산'].every(n => !!sheets[n]), true);

// ① 전속 의뢰
const dv = { action: 'agencyApply', company: '(주)가나개발', biz: '220-81-62517', role: 'dev', manager: '김담당', contact: '010-2222-3333',
  addr: '서울 강서구 화곡동 ○○', kind: 'villa', units: '18', stage: 'build', permit: 'free', start: '2027년 3월', terms: '세대당 1,000만 원', memo: '준공 예정 2027.2', agree: true, cv: T.DV_CONSENT_V };
check('의뢰: 동의 없으면 거절', post(Object.assign({}, dv, { agree: false })).ok, false);
check('의뢰: 옛 동의 판 거절', post(Object.assign({}, dv, { cv: 'old' })).ok, false);
check('의뢰: 사업자번호 틀리면 거절', post(Object.assign({}, dv, { biz: '123-45-67890' })).ok, false);
check('의뢰: 수식 주입 거절', post(Object.assign({}, dv, { memo: '=IMPORTXML(1)' })).ok, false);
mails.length = 0;
const D1 = post(dv);
check('의뢰: 접수', [D1.ok, /^DV[0-9A-F]{8}$/.test(D1.id)], [true, true]);
check('의뢰: 시트에 한 줄, 처리상태 접수', [sheets['분양대행의뢰'].rows.length, sheets['분양대행의뢰'].rows[1][16]], [2, '접수']);
check('의뢰: 주인 메일에 연락처 없음', mails.some(m => JSON.stringify(m).includes('2222-3333')), false);

// ② 파트너 신청
const pa = { action: 'partnerApply', type: 'expert', name: '부동산 채널 A', manager: '이전문', phone: '010-4444-5555', email: 'a@example.com', area: '서울 강서·양천',
  channel: 'https://www.youtube.com/@example', intro: '구독자 대상 세미나', pay: 'income', agree: true, cv: T.PT_CONSENT_V };
check('파트너: 동의 없으면 거절', post(Object.assign({}, pa, { agree: false })).ok, false);
check('파트너: 공인중개사는 등록번호 필요', post(Object.assign({}, pa, { type: 'broker', phone: '010-4444-0000' })).ok, false);
check('파트너: 분양대행사는 사업자번호 필요', post(Object.assign({}, pa, { type: 'agency', phone: '010-4444-0001' })).ok, false);
check('파트너: 세금계산서 정산은 사업자번호 필요', post(Object.assign({}, pa, { pay: 'invoice', phone: '010-4444-0002' })).ok, false);
check('파트너: http 채널 주소 거절', post(Object.assign({}, pa, { channel: 'http://x.com', phone: '010-4444-0003' })).ok, false);
const P1 = post(pa);
check('파트너(전문가·개인): 접수 + 관리코드', [P1.ok, /^P[0-9A-F]{8}$/.test(P1.id), /^[0-9A-F]{10}$/.test(P1.code)], [true, true, true]);
check('파트너: 같은 연락처 두 번 신청 거절', post(pa).ok, false);
check('파트너: 관리코드 원값은 시트에 없음', allCells().includes(P1.code), false);
const P2 = post(Object.assign({}, pa, { type: 'broker', name: '화곡공인중개사', reg: '11500-2020-00001', phone: '010-6666-7777', pay: 'invoice', biz: '220-81-62517' }));
check('파트너(공인중개사): 접수', P2.ok, true);

// 로그인
check('로그인: 관리코드 틀리면 거절', post({ action: 'partnerLogin', id: P1.id, code: 'XXXX' }).ok, false);
const L1 = post({ action: 'partnerLogin', id: P1.id, code: P1.code.toLowerCase() });
check('로그인: 심사 중이어도 로그인(현장은 안 보임)', [L1.ok, L1.me.ready], [true, false]);
check('세션 원값 저장 안 함', allCells().includes(L1.s), false);
const H0 = post({ action: 'partnerHome', s: L1.s });
check('심사 중: 현장 0곳 + 안내', [H0.sites.length, /심사 중/.test(H0.why)], [0, true]);
check('잘못된 세션 거절', post({ action: 'partnerHome', s: 'a'.repeat(64) }).code, 'auth');

// 승인 + 계약서
const PTH = vm.runInContext('PTH', ctx), PTC = vm.runInContext('PTC', ctx);
const ptRow = id => sheets['판매파트너'].rows.find(r => r[PTC['id']] === id);
ptRow(P1.id)[PTC['승인']] = true;
check('승인만: 아직 현장 안 보임(계약서 전)', /계약서/.test(post({ action: 'partnerHome', s: L1.s }).why), true);
ptRow(P1.id)[PTC['계약서일']] = new Date();
ptRow(P2.id)[PTC['승인']] = true; ptRow(P2.id)[PTC['계약서일']] = new Date();

// ③ 현장 조건
const addSite = o => { const r = T.STH.map(() => ''); Object.keys(o).forEach(k => r[T.STC[k]] = o[k]); sheets['분양현장'].rows.push(r); };
const past = new Date(Date.now() - 10 * 86400000), fut = new Date(Date.now() + 90 * 86400000);
const base = { 승인: true, 현장명: '화곡 신축 빌라', 종류: '빌라(다세대)', 시도: '서울', 시군구: '강서구', 동: '화곡동', 규모: '18세대', 분양가범위: '3억 원대', 인허가구분: '건축허가만',
  위탁계약일: past, 위탁기간끝: fut, 재위탁승낙: true, 파트너업무: '홍보·고객 소개·상담', 파트너수수료: '계약 1건당 ○○만 원(세금 별도)', 자료링크: 'https://drive.google.com/x',
  상태: '모집 중', 의뢰id: D1.id, 총수수료조건: '세대당 1,000만 원', 내부메모: '시행사 대표 직통' };
addSite(Object.assign({}, base, { id: 'S1' }));
addSite(Object.assign({}, base, { id: 'S2', 재위탁승낙: false }));
addSite(Object.assign({}, base, { id: 'S3', 위탁계약일: '' }));
addSite(Object.assign({}, base, { id: 'S4', 상태: '마감' }));
addSite(Object.assign({}, base, { id: 'S5', 위탁기간끝: past }));
addSite(Object.assign({}, base, { id: 'S6', 승인: false }));
addSite(Object.assign({}, base, { id: 'S7', 위탁계약일: fut }));
const H1 = post({ action: 'partnerHome', s: L1.s });
check('보이는 현장: 승인·위탁계약·재위탁 승낙·모집 중·기간 안(S1만)', H1.sites.map(x => x.id), ['S1']);
check('배정 전: 수수료 조건·자료 링크 안 보임', [H1.sites[0].fee, H1.sites[0].doc], [undefined, undefined]);
check('어디에도 총수수료조건·내부메모 없음', /1,000만|직통/.test(JSON.stringify(H1)), false);
check('계약 보고: 배정 전 거절', post({ action: 'partnerDeal', s: L1.s, site: 'S1', date: '2026-11-20' }).ok, false);
check('판매 신청: 안 보이는 현장 거절', post({ action: 'partnerJoin', s: L1.s, site: 'S2' }).ok, false);
const J1 = post({ action: 'partnerJoin', s: L1.s, site: 'S1' });
check('판매 신청: 접수', J1.ok, true);
check('판매 신청: 두 번 거절', post({ action: 'partnerJoin', s: L1.s, site: 'S1' }).ok, false);
check('신청 상태: 아직 수수료 안 보임', [post({ action: 'partnerHome', s: L1.s }).sites[0].my, post({ action: 'partnerHome', s: L1.s }).sites[0].fee], ['신청', undefined]);
sheets['현장배정'].rows[1][T.PAC['상태']] = '배정';
const H2 = post({ action: 'partnerHome', s: L1.s });
check('배정 뒤: 파트너 수수료·자료 보임', [H2.sites[0].my, H2.sites[0].fee, H2.sites[0].doc], ['배정', '계약 1건당 ○○만 원(세금 별도)', 'https://drive.google.com/x']);
check('배정 뒤에도 총수수료조건·내부메모 없음', /1,000만|직통/.test(JSON.stringify(H2)), false);

// ⑤ 계약 보고
const dl = { action: 'partnerDeal', s: L1.s, site: 'S1', date: '2026-11-20', unit: '302호', amt: '31500', alias: 'A고객' };
check('보고: 고객 이름 모양 거절', post(Object.assign({}, dl, { alias: '김철수' })).ok, false);
check('보고: 전화번호 모양 거절', post(Object.assign({}, dl, { alias: '01012345678' })).ok, false);
check('보고: 미래 날짜 거절', post(Object.assign({}, dl, { date: '2099-01-01' })).ok, false);
const R1 = post(dl);
check('보고: 접수', [R1.ok, /^DL/.test(R1.id)], [true, true]);
check('보고: 같은 동·호수 두 번 거절', post(dl).ok, false);
const L2 = post({ action: 'partnerLogin', id: P2.id, code: 'WRONG' });
check('다른 파트너는 배정 안 된 현장 보고 못 함', L2.ok, false);

// ⑥ 정산
const DLC = T.DLC, d = sheets['계약보고'].rows[1];
d[DLC['상태']] = '정산대기'; d[DLC['회사수수료원']] = 10000000; d[DLC['파트너몫원']] = 5000000;
post(Object.assign({}, dl, { unit: '401호' }));
sheets['계약보고'].rows[2][DLC['상태']] = '취소';
check('정산표: 1줄(취소 제외)', T.settleSheet(), 1);
const se = sheets['수수료정산'].rows[1];
check('정산표: 2026-11 · 파트너 · 건수1 · 확인1 · 회사 1,000만 · 파트너 500만 · 미지급 500만', [se[0], se[1], se[4], se[5], se[6], se[7], se[8], se[9]], ['2026-11', P1.id, 1, 1, 10000000, 5000000, 0, 5000000]);
const H3 = post({ action: 'partnerHome', s: L1.s });
check('내 보고: 정산대기 건의 내 몫 보임', H3.deals.find(x => x.id === R1.id).share, 5000000);
check('로그아웃', [post({ action: 'partnerLogout', s: L1.s }).ok, post({ action: 'partnerHome', s: L1.s }).code], [true, 'auth']);

// ⑦ 화면
const root = path.join(__dirname, '..');
const pg = fs.readFileSync(path.join(root, 'partner', 'index.html'), 'utf8'), ag = fs.readFileSync(path.join(root, 'bunyang', 'agency', 'index.html'), 'utf8');
check('화면: 동의 판이 서버와 같음', [pg.includes(T.PT_CONSENT_V), ag.includes(T.DV_CONSENT_V)], [true, true]);
check('화면: 법적 고지(집예보 분양대행, 운영 (주)장대장부동산그룹)', [/집예보 분양대행\(운영: \(주\)장대장부동산그룹\)/.test(pg), /집예보 분양대행\(운영: \(주\)장대장부동산그룹\)/.test(ag)], [true, true]);
check('화면: 점수 무관 원칙', [/미래가치 점수·순위/.test(pg), /미래가치 점수·순위/.test(ag)], [true, true]);
check('화면: 분양권 전매·기존 주택 알선은 별개(중개)', /분양권 전매/.test(pg), true);
check('화면: A+ 테마 사용', [/aplus\.css/.test(pg), /aplus\.css/.test(ag)], [true, true]);

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : `  got=${JSON.stringify(r.got)} want=${JSON.stringify(r.want)}`)));
console.log(`\n${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
