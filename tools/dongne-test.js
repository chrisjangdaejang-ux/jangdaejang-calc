/* 동네 중개사 파트너 + 자동결제(빌링) 자동 확인 — 실행: node tools/dongne-test.js </dev/null
   ① 숨김: PARTNER_ENABLED·BILLING_OPEN=false, dongne/ 는 검색 제외·다른 화면에서 링크 없음, 약관 초안은 '변호사 검토 필요'
   ② 계산 규칙(assets/dongne-core.js): 요금(월간·연간·창립·묶음)·첫 결제일·안내 날짜·실패 단계·22시 마감·글 고르기·순서·이웃 동
   ③ 서버(tools/agent-backend.gs v50): 문 닫힘·운영자 미리 보기·공공 자료 확인(바로 승인/검토 대기)·3자리·대기·동 바꾸기 30일·
      한마디 거르기·브리핑 칸 동의 확인·제재(단계·박탈)·신고 대기열·해지·창립 혜택 규칙·빌링 잠금
   ④ 빌링을 켠 가상 서버: 빌링키는 스크립트 속성에만·정기 결제·실패 3일→멈춤·브리핑 체험 5일째 안내·체험 끝 안내 딱 한 번·첫 달 반값
   ⑤ 공개 저장소에 비공개 거르기 낱말·빌링키가 없음
   가짜 시트·메일·토스 위에서만 돌아요(실제 서버·결제에 접속하지 않음). */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } }
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ---------- ① 숨김 ---------- */
const cfg = read('assets/config.js');
check('config: PARTNER_ENABLED=false', /PARTNER_ENABLED:\s*false\b/.test(cfg) && !/PARTNER_ENABLED:\s*true/.test(cfg));
check('config: BILLING_OPEN=false', /BILLING_OPEN:\s*false\b/.test(cfg) && !/BILLING_OPEN:\s*true/.test(cfg));
const GS = read('tools/agent-backend.gs');
check('서버: DONGNE_ENABLED=false · BILLING_OPEN=false · PAID_OPEN=false', /const DONGNE_ENABLED = false;/.test(GS) && /const BILLING_OPEN = false;/.test(GS) && /const PAID_OPEN = false;/.test(GS));
const pages = ['dongne/index.html', 'dongne/my/index.html', 'dongne/admin/index.html', 'dongne/terms/index.html'];
pages.forEach(p => { const s = read(p); check(p + ': 검색 제외(noindex)', /<meta name="robots" content="noindex, nofollow">/.test(s)); });
pages.filter(p => !/admin/.test(p)).forEach(p => check(p + ': 꺼져 있으면 준비 중', /준비 중이에요/.test(read(p)) && /enabled\(\)/.test(read(p))));
const walk = (d, out) => { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { if (e.name.startsWith('.') || e.name === 'node_modules') return; const p = path.join(d, e.name); if (e.isDirectory()) { if (!/^(apt|cy|comm|sitemaps|data|tools|docs|design)$/.test(e.name) || d !== ROOT) walk(p, out); } else if (/\.html$/.test(e.name)) out.push(p); }); return out; };
const linking = walk(ROOT, []).map(p => path.relative(ROOT, p)).filter(p => !p.startsWith('dongne/')).filter(p => /href="[^"]*dongne\//.test(read(p)));
check('꺼짐: dongne/ 밖 화면에 동네 파트너로 가는 고정 링크 없음', linking.length === 0, linking);
const sm = ['sitemap.xml'].concat(fs.readdirSync(path.join(ROOT, 'sitemaps')).map(f => 'sitemaps/' + f)).filter(f => /\.xml$/.test(f));
check('사이트맵에 dongne 주소 없음', sm.every(f => !/\/dongne\//.test(read(f))));
const terms = read('dongne/terms/index.html');
check('약관 초안: 변호사 검토 필요 + 가맹사업 아님 + 관할 + 상표·간판 없음 + 전자 동의 기록', /변호사 검토 필요/.test(terms) && /가맹사업이 아니에요/.test(terms) && /본점 소재지를 관할하는 법원/.test(terms) && /간판/.test(terms) && /약관 판/.test(terms));
check('약관 초안: 자동 결제·해지 버튼·환불·중대 위반 환불 없음·창립 혜택 30일·단계 제재', /자동 결제 동의는 다른 동의와 따로/.test(terms) && /버튼 한 번/.test(terms) && /돌려 드리지 않아요/.test(terms) && /30일이 지나면 혜택은 사라지고/.test(terms) && /1차 경고 메일 → 2차 7일 노출 중지[^→]*→ 3차 해지/.test(terms));
check('약관 초안: "영구" 혜택 표현 없음', !/영구/.test(terms) && !/영구/.test(read('dongne/index.html')));
check('이용약관·환불 정책: 자동 결제 조항은 숨김(data-bill-only hidden) + 초안 표시', /<section id="autopay" data-bill-only hidden>/.test(read('terms/index.html')) && /<section id="autopay" data-bill-only hidden>/.test(read('refund/index.html')) && /변호사 검토 필요/.test(read('refund/index.html')));
check('화면 글: 서비스 이름 하드코딩 없음(dongne/·dongne.js·billing.js)', pages.concat(['assets/dongne.js', 'assets/billing.js', 'assets/dongne-core.js']).every(p => !/집코드|집예보|장대장/.test(read(p).replace(/주식회사 장대장부동산그룹/g, ''))));
check('가입 화면: "보통 바로 승인돼요. 확인이 필요하면 2영업일 안에 알려 드려요."', /보통 바로 승인돼요\. 확인이 필요하면 2영업일 안에 알려 드려요\./.test(read('dongne/index.html')));
check('가입 화면: 자동 결제 문구 크게 + 따로 체크', /paybig/.test(read('dongne/index.html')) && /agPay/.test(read('dongne/index.html')) && /자동 결제돼요/.test(read('dongne/index.html')));

/* ---------- ② 계산 규칙 ---------- */
const core = read('assets/dongne-core.js');
const blk = (s) => { const m = /\/\* DONGNE-CORE BEGIN[\s\S]*?\/\* DONGNE-CORE END \*\//.exec(s); return m ? m[0] : ''; };
check('서버 DONGNE-CORE = 화면 dongne-core.js(글자 그대로)', blk(GS) && blk(GS) === blk(core));
const C = require(path.join(ROOT, 'assets/dongne-core.js'));
let p = C.dpPrice(3, {});
check('요금: 월간 3개 동 9,900원', p.total === 9900 && p.extraN === 0, p);
p = C.dpPrice(5, {}); check('요금: 월간 5개 동 = 9,900 + 2×5,000', p.total === 19900, p);
p = C.dpPrice(5, { plan: 'y' }); check('요금: 연간 5개 동 = 99,000 + 2×50,000', p.total === 199000, p);
p = C.dpPrice(4, { founding: true }); check('요금: 창립 추가 동 20% 할인(4,000원)', p.total === 13900 && p.extraEach === 4000, p);
p = C.dpPrice(12, {}); check('요금: 최대 10개 동', p.n === 10 && p.total === 9900 + 7 * 5000, p);
check('묶음 혜택: 기본값 off — 제휴 사무소라도 그대로', C.DP_RULE.bundleMode === 'off' && C.dpPrice(3, { affiliate: true }).total === 9900 && C.dpBundleText() === '');
C.DP_RULE.bundleMode = 'include'; check('묶음 include: 제휴 사무소는 기본 3개 동 무료(추가 동만)', C.dpPrice(4, { affiliate: true }).total === 5000 && C.dpPrice(4, {}).total === 14900);
C.DP_RULE.bundleMode = 'discount'; C.DP_RULE.bundlePct = 10; check('묶음 discount: 10% 할인(10원 아래 버림)', C.dpPrice(3, { affiliate: true }).total === 8910 && /10% 할인/.test(C.dpBundleText()));
C.DP_RULE.bundleMode = 'off'; C.DP_RULE.bundlePct = 0;
check('첫 결제일 = 가입 + 1개월(말일 맞춤)', C.dpFirstCharge('2026-11-23') === '2026-12-23' && C.dpFirstCharge('2027-01-31') === '2027-02-28');
check('다음 결제일: 월간 +1개월·연간 +12개월', C.dpNextCharge('2026-12-23', 'm') === '2027-01-23' && C.dpNextCharge('2026-12-23', 'y') === '2027-12-23');
check('해지 = 그달 말일', C.dpMonthEnd('2026-11-05') === '2026-11-30' && C.dpMonthEnd('2028-02-03') === '2028-02-29');
check('안내: 월간 첫 결제 7일 전만', C.dpNoticeDue('m', '2026-12-23', '2026-12-16', true) === 7 && C.dpNoticeDue('m', '2027-01-23', '2027-01-16', false) === 0);
check('안내: 연간 30일·7일 전', C.dpNoticeDue('y', '2027-12-23', '2027-11-23', false) === 30 && C.dpNoticeDue('y', '2027-12-23', '2027-12-16', false) === 7 && C.dpNoticeDue('y', '2027-12-23', '2027-12-20', false) === 0);
check('결제 실패: 3일 다시 시도 → 14일 멈춤 → 해지', C.dpFailStep('2026-12-01', '2026-12-04') === 'retry' && C.dpFailStep('2026-12-01', '2026-12-05') === 'stop' && C.dpFailStep('2026-12-01', '2026-12-18') === 'stop' && C.dpFailStep('2026-12-01', '2026-12-19') === 'end');
check('22시 마감: 21:59 → 다음 날 아침, 22:00 → 모레 아침', C.dpBriefDay(Date.parse('2026-11-23T21:59:00+09:00')) === '2026-11-24' && C.dpBriefDay(Date.parse('2026-11-23T22:00:00+09:00')) === '2026-11-25');
check('창립: 문 연 날부터 3개월 안', C.dpFounding('2027-01-10', '2027-04-09') && !C.dpFounding('2027-01-10', '2027-04-10'));
check('동 바꾸기: 30일에 한 번', !C.dpSwapOk('2026-11-01', '2026-11-30').ok && C.dpSwapOk('2026-11-01', '2026-11-30').wait === 1 && C.dpSwapOk('2026-11-01', '2026-12-01').ok && C.dpSwapOk('', '2026-11-01').ok);
const at = s => Date.parse(s);
const P1 = [{ id: 'n1', pid: 'A', at: at('2026-11-23T10:00:00+09:00'), help: 0, rep: 0 }, { id: 'n2', pid: 'B', at: at('2026-11-23T09:00:00+09:00'), help: 0, rep: 0 },
  { id: 'n3', pid: 'C', at: at('2026-11-23T22:30:00+09:00'), help: 9, rep: 0 }, { id: 'n4', pid: 'D', at: at('2026-11-10T10:00:00+09:00'), help: 9, rep: 0 }];
check('글 고르기: 마감 뒤 글·7일 지난 글은 빼고 점수 높은 글', C.dpPickPost(P1, '2026-11-24', '').id === 'n1');
check('글 고르기: 어제 실린 파트너는 다른 글이 있으면 뒤로(돌려 보여 주기)', C.dpPickPost(P1, '2026-11-24', 'A').id === 'n2');
check('글 고르기: 신고 많은 글은 빠짐', C.dpPickPost([{ id: 'x', pid: 'A', at: at('2026-11-23T10:00:00+09:00'), help: 0, rep: 3 }], '2026-11-24', '') === null);
check('글 고르기: 점수가 같으면 창립 파트너 먼저', C.dpPickPost([{ id: 'a', pid: 'A', at: at('2026-11-23T10:00:00+09:00') }, { id: 'b', pid: 'B', at: at('2026-11-23T10:00:00+09:00'), found: true }], '2026-11-24', '').id === 'b');
const ord = C.dpOrder(['A', 'B', 'C'], '', { A: 1 }, '2026-11-24', { C: 1 });
check('순서: 창립 파트너 → 글 쓴 파트너 → 이름 카드', ord[0] === 'C' && ord[1] === 'A' && ord[2] === 'B', ord);
check('순서: 오늘 글이 실린 파트너가 맨 앞', C.dpOrder(['A', 'B', 'C'], 'B', {}, '2026-11-24', { C: 1 })[0] === 'B');
const keys = ['11680|개포동', '11680|대치동', '11680|도곡동', '11710|잠실동'];
check('구독 지역: 동을 골랐으면 그 동', JSON.stringify(C.dpAreaDongs({ g: '11680', dn: '대치동' }, keys, [], '2026-11-24')) === '["11680|대치동"]');
check('구독 지역: 구 전체면 관심 단지 동 먼저 + 날마다 돌아가며 하나', (() => { const a = C.dpAreaDongs({ g: '11680', dn: '' }, keys, ['도곡동'], '2026-11-24'), b = C.dpAreaDongs({ g: '11680', dn: '' }, keys, ['도곡동'], '2026-11-25'); return a[0] === '11680|도곡동' && a.length === 2 && b[0] === '11680|도곡동' && a[1] !== b[1]; })());
const pts11 = JSON.parse(read('assets/dong/11.json')).rows;
const nr = C.dpNear('11680|개포동', pts11, 8);
check('이웃 동: 법정동 가운데 점에서 가까운 8곳(자기 동 빼고)', nr.length === 8 && nr.every(x => x.key !== '11680|개포동') && nr.some(x => x.key === '11680|대치동'), nr.slice(0, 3));
check('법정동 가운데 점 파일: 동 이름 규칙(띄어쓰기 없음)·숫자 3개', Object.keys(pts11).every(k => /^\d{5}\|[가-힣0-9·.]{1,20}$/.test(k)) && Object.values(pts11).every(v => v.length === 3));
check('공인중개사법 표시 5가지(소속이면 대표·소속 성명)', C.dpLegal({ office: 'O', addr: 'A', tel: 'T', reg: 'R', name: 'N', ceo: 'E', kind: 'member' }).join('|') === 'O|A|T|등록번호 R|대표 E · 소속공인중개사 N');

/* ---------- ③ 서버(가짜 시트) ---------- */
function makeSheet() {
  const rows = [];
  const sh = { rows, getDataRange() { return { getValues: () => rows.map(r => r.slice()) }; }, getLastRow() { return rows.length; }, appendRow(r) { rows.push(r.slice()); }, deleteRow(r) { rows.splice(r - 1, 1); }, setFrozenRows() {},
    getRange(r, c, nr, nc) { const rg = { setValues(v) { v.forEach((line, i) => line.forEach((x, j) => { (rows[r - 1 + i] = rows[r - 1 + i] || [])[c - 1 + j] = x; })); return rg; }, setValue(x) { (rows[r - 1] = rows[r - 1] || [])[c - 1] = x; return rg; },
      getValue() { return (rows[r - 1] || [])[c - 1]; }, getValues() { return [(rows[r - 1] || []).slice(c - 1, c - 1 + (nc || 1))]; }, setFontWeight() { return rg; }, setBackground() { return rg; }, setFontColor() { return rg; }, setNumberFormat() { return rg; }, insertCheckboxes() { return rg; } }; return rg; } };
  return sh;
}
function server(opts) {
  opts = opts || {};
  const sheets = {}, props = Object.assign({ BRIEF_PULL_TOKEN: 'PULL_' + crypto.randomBytes(6).toString('hex') }, opts.props || {}), cacheMap = new Map(), mails = [], files = {}, folders = [], fetches = [];
  const book = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet()), getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST', getSheets: () => Object.values(sheets), deleteSheet() {} };
  sheets['중개사'] = makeSheet(); sheets['로그'] = makeSheet();
  let fileN = 0;
  const ctx = { console, SpreadsheetApp: { getActive: () => book, openById: () => book },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: k => (cacheMap.has(k) ? cacheMap.get(k) : null), put: (k, v) => cacheMap.set(k, v), remove: k => cacheMap.delete(k), removeAll: ks => ks.forEach(k => cacheMap.delete(k)) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail(a, b, c) { mails.push(typeof a === 'object' ? a : { to: a, subject: b, body: c }); }, getRemainingDailyQuota: () => 100 },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
    ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    HtmlService: { createHtmlOutput: s => ({ s }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TEST/exec' }) },
    DriveApp: { getFolderById(id) { const f = folders.find(x => x.id === id); if (!f) throw new Error('no folder'); return f; },
      createFolder(name) { const f = { id: 'FOLD' + folders.length, name, getId() { return this.id; }, createFile(blob) { const id = 'FILE' + (++fileN); files[id] = { id, trashed: false, shared: false, bytes: blob.bytes, type: blob.type }; return { getId: () => id }; } }; folders.push(f); return f; },
      getFileById(id) { const f = files[id]; if (!f) throw new Error('no file'); return { setTrashed(v) { f.trashed = v; }, setSharing() { f.shared = true; }, getBlob: () => ({ getContentType: () => f.type, getBytes: () => f.bytes }) }; },
      Access: { ANYONE_WITH_LINK: 'x' }, Permission: { VIEW: 'v' } },
    Utilities: { getUuid: () => crypto.randomUUID(),
      formatDate: (d, tz, f) => { const q = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).map(x => [x.type, x.value])); return f.replace('yyyy', q.year).replace('yy', q.year.slice(2)).replace('MM', q.month).replace('dd', q.day).replace('HH', q.hour).replace('hh', q.hour).replace('mm', q.minute); },
      computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => b > 127 ? b - 256 : b), DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      base64Decode: s => Array.from(Buffer.from(s, 'base64')), base64Encode: b => Buffer.from(typeof b === 'string' ? b : b.map(x => x & 255)).toString('base64'), newBlob: (bytes, type, name) => ({ bytes, type, name }) },
    UrlFetchApp: { fetch(url, o) { fetches.push({ url, o }); const r = (opts.fetch || (() => null))(url, o); if (!r) throw new Error('network'); return { getResponseCode: () => r.code || 200, getContentText: () => JSON.stringify(r.body) }; } } };
  vm.createContext(ctx);
  let src = GS;
  if (opts.open) src = src.replace('const DONGNE_ENABLED = false;', 'const DONGNE_ENABLED = true;');
  if (opts.billing) src = src.replace('const BILLING_OPEN = false;', 'const BILLING_OPEN = true;').replace('const PAID_OPEN = false;', 'const PAID_OPEN = true;');
  vm.runInContext(src + '\n;globalThis.__T = { UC, SC, UH, SSH, BH, BC, DPC, DPPC, DPEC, BRAC, hashOf, dpAll, dpDaily, dpPickDay, dpPickReset, brBillDaily: baBillDaily, briefExpiry, brTrialEnded: baTrialEnded, bKey, DP_RULE, ymd, dpUid };', ctx);
  const T = ctx.__T, VD = vm.runInContext('Date', ctx);
  const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
  function addUser(k) {
    const U = sheets['회원'] || (sheets['회원'] = makeSheet()), S = sheets['세션'] || (sheets['세션'] = makeSheet());
    if (!U.rows.length) U.appendRow(T.UH); if (!S.rows.length) S.appendRow(T.SSH);
    const r = []; r[T.UC['카카오id']] = k; r[T.UC['닉네임']] = 'n' + k; r[T.UC['가입일']] = new VD(Date.now() - 30 * 864e5); r[T.UC['최근로그인']] = new VD(); r[T.UC['저장자료']] = ''; r[T.UC['수정일']] = '';
    U.appendRow(T.UH.map((h, i) => r[i] === undefined ? '' : r[i]));
    const s = crypto.randomBytes(32).toString('hex'), sr = []; sr[T.SC['세션해시']] = T.hashOf('ses|' + s); sr[T.SC['카카오id']] = k; sr[T.SC['만든날']] = new VD(); sr[T.SC['만료일']] = new VD(Date.now() + 30 * 864e5);
    S.appendRow(T.SSH.map((h, i) => sr[i] === undefined ? '' : sr[i]));
    return s;
  }
  return { ctx, T, VD, post, sheets, props, mails, files, fetches, addUser, cacheMap };
}
/* 공공 자료(표준데이터) 가짜 응답: 등록번호 → 사무소 */
const REG = { '11680-2020-00123': { medOfficeNm: '행복공인중개사사무소', rprsvNm: '김행복', lctnRoadNmAddr: '서울특별시 강남구 개포로 1', crtrYmd: '2026-11-01' },
  '11680-2021-00456': { medOfficeNm: '개포부동산공인중개사사무소', rprsvNm: '이개포', lctnRoadNmAddr: '서울특별시 강남구 개포로 2', crtrYmd: '2026-11-01' },
  '11680-2019-00789': { medOfficeNm: '대치공인중개사사무소', rprsvNm: '박대치', lctnRoadNmAddr: '서울특별시 강남구 삼성로 3', crtrYmd: '2026-11-01' },
  '11680-2018-00111': { medOfficeNm: '네번째공인중개사사무소', rprsvNm: '최넷', lctnRoadNmAddr: '서울특별시 강남구 개포로 4', crtrYmd: '2026-11-01' } };
const DONG = JSON.parse(read('assets/dong/11.json')), D28 = JSON.parse(read('assets/dong/28.json')), D41 = JSON.parse(read('assets/dong/41.json'));
let tossLog = [], tossFail = false;
function fakeFetch(url, o) {
  if (/assets\/dong\/11\.json/.test(url)) return { body: DONG }; if (/assets\/dong\/28\.json/.test(url)) return { body: D28 }; if (/assets\/dong\/41\.json/.test(url)) return { body: D41 };
  if (/tn_pubr_public_med_office_api/.test(url)) { const reg = decodeURIComponent(/estblRegNo=([^&]+)/.exec(url)[1]); const x = REG[reg]; return { body: { response: { header: { resultCode: x ? '00' : '03', resultMsg: 'OK' }, body: { items: x ? [Object.assign({ estblRegNo: reg }, x)] : [], totalCount: x ? 1 : 0 } } } }; }
  if (/api\.tosspayments\.com\/v1\/billing\/authorizations\/issue/.test(url)) { const b = JSON.parse(o.payload); tossLog.push(['issue', b]); return { body: { billingKey: 'BK_SECRET_' + b.authKey, customerKey: b.customerKey, card: { number: '1234****5678', issuerCode: '11' }, cardCompany: '시험카드' } }; }
  if (/api\.tosspayments\.com\/v1\/billing\//.test(url)) { const b = JSON.parse(o.payload); tossLog.push(['charge', b, url, o.headers]); return tossFail ? { code: 400, body: { message: '한도 초과' } } : { body: { status: 'DONE', totalAmount: b.amount, paymentKey: 'pk_' + b.orderId } }; }
  if (/jangdaejang-data\/data\/brief\//.test(url)) return { code: 404, body: {} };
  return null;
}
const AG = { rules: true, ad: true, privacy: true, terms: true };
const TV = /const DP_TERMS_V = '([^']+)'/.exec(GS)[1];
const app0 = (o) => Object.assign({ action: 'dpApply', kind: 'owner', office: '행복공인중개사사무소', reg: '11680-2020-00123', name: '김행복', tel: '0212345678', mail: 'happy@example.com',
  addr: '서울 강남구 개포로 1 (개포동)', g: '11680', gn: '강남구', dn: '개포동', picks: [], intro: '개포동 15년', agree: AG, v: TV }, o || {});

/* 문 닫힘 */
let S = server({ fetch: fakeFetch });
const sA = S.addUser('k1'), sAdm = S.addUser('k9');
let r = S.post({ action: 'dpConfig' });
check('문 닫힘: 일반 사용자에겐 open:false 만', r.ok && r.open === false && !r.rule, r);
r = S.post(app0({ s: sA }));
check('문 닫힘: 일반 회원 신청 거절(closed)', r.ok === false && r.code === 'closed', r);
check('문 닫힘: 브리핑 칸 없음', S.post({ action: 'dpBrief', g: '11680', dn: '개포동', s: sA }).show === false);
S.props.BRIEF_ADMIN_IDS = JSON.stringify(['k9']);
r = S.post({ action: 'dpConfig', s: sAdm });
check('운영자(모닝 브리핑 운영자 모드 계정): 미리 보기 열림, 빌링 잠김', r.ok && r.preview === true && r.billing === false && r.terms === TV, r);
check('운영자 아닌 계정은 운영자 검토 화면 거절', S.post({ action: 'dpAdminQueue', s: sA }).code === 'admin');

/* 운영자 미리 보기로 신청 — 키 없음 → 검토 대기 */
r = S.post(app0({ s: sAdm }));
check('공공 자료 키 없음 → 검토 대기(시범 파트너, 카드 없음)', r.ok && r.st === '검토대기' && r.auto === false && r.pay === '시범' && !r.ck, r);
check('신청 메일: 시범 파트너·카드 등록 없이 무료', S.mails.some(m => m.to === 'happy@example.com' && /시범 파트너/.test(m.htmlBody || '')));
check('시트에 카카오 회원번호 없음(해시만)', !JSON.stringify(S.sheets['동네파트너'].rows).includes('k9'));
check('전자 동의 기록: 4가지 + 판', S.sheets['동네파트너동의'].rows.slice(1).length === 4 && S.sheets['동네파트너동의'].rows.slice(1).every(x => x[4] === TV));
check('같은 계정 두 번 신청 거절', S.post(app0({ s: sAdm })).ok === false);

/* 문을 연 서버 + 공공 자료 키 */
S = server({ open: true, fetch: fakeFetch, props: { DATA_GO_KR_KEY: 'abc+key/=' } });
const u1 = S.addUser('u1'), u2 = S.addUser('u2'), u3 = S.addUser('u3'), u4 = S.addUser('u4'), u5 = S.addUser('u5'), sub = S.addUser('sub1'), adm = S.addUser('adm');
S.props.BRIEF_ADMIN_IDS = JSON.stringify(['adm']);
check('약관 판이 다르면 거절', S.post(app0({ s: u1, v: 'old' })).code === 'terms');
check('필수 동의 빠지면 거절', /동의해 주세요/.test(S.post(app0({ s: u1, agree: { rules: true } })).err));
check('등록번호 형식 확인(전화번호 거절)', /등록번호/.test(S.post(app0({ s: u1, reg: '010-1234-5678' })).err));
check('소속공인중개사는 대표 성명 필수', /대표/.test(S.post(app0({ s: u1, kind: 'member', ceo: '' })).err));
check('빌링 잠김: 사무소 동 포함 3개 동까지', /3개 동까지/.test(S.post(app0({ s: u1, picks: ['11680|대치동', '11680|도곡동', '11680|일원동'] })).err));
check('먼 동은 못 고름(이웃 8곳만)', /가까운 동만/.test(S.post(app0({ s: u1, picks: ['11710|잠실동'] })).err));
r = S.post(app0({ s: u1, picks: ['11680|대치동', '11680|도곡동'] }));
check('공공 자료와 맞음 → 바로 승인 + 3개 동 + 창립', r.ok && r.auto === true && r.st === '승인' && r.got.length === 3 && r.founding === true, r);
check('공공 자료 키는 서비스 키 칸에 인코딩해서', S.fetches.some(f => /serviceKey=abc%2Bkey%2F%3D/.test(f.url)));
r = S.post(app0({ s: u2, office: '틀린이름공인중개사사무소', reg: '11680-2021-00456', name: '이개포', mail: 'b@example.com' }));
check('이름이 다름 → 검토 대기 + 운영자 메일', r.ok && r.st === '검토대기' && S.mails.some(m => m.to === 'owner@example.com' && /검토 대기/.test(m.subject)), r);
r = S.post(app0({ s: u3, office: '대치공인중개사사무소', reg: '11680-2019-00789', name: '박대치', mail: 'c@example.com', picks: ['11680|대치동'] }));
check('세 번째 파트너 승인', r.ok && r.auto, r);
r = S.post(app0({ s: u4, office: '네번째공인중개사사무소', reg: '11680-2018-00111', name: '최넷', mail: 'd@example.com' }));
check('한 동 3자리: 네 번째는 개포동 대기', r.ok && r.wait.indexOf('11680|개포동') >= 0 && r.got.length === 0, r);
check('공공 자료에 없는 등록번호 → 검토 대기', S.post(app0({ s: u5, reg: '11680-2022-00999', office: '없는사무소', name: '홍', mail: 'e@example.com' })).st === '검토대기');
check('자리 현황', (() => { const x = S.post({ action: 'dpSlots', s: u1, keys: ['11680|개포동', '11680|대치동'] }); return x.slots['11680|개포동'].used === 3 && x.slots['11680|개포동'].wait === 2 && x.slots['11680|대치동'].used === 2; })());

/* 한마디 쓰기·거르기 */
const W = (s, o) => S.post(Object.assign({ action: 'dpWrite', s, topic: 'rent', text: '이번 주는 전세 문의가 늘었어요. 학기 전에 이사하려는 가족이 많아요.' }, o || {}));
check('전화번호 막기', W(u1, { text: '자세한 건 010-1234-5678 로 전화 주세요 동네 소식' }).code === 'filter');
check('인터넷 주소 막기', W(u1, { text: '동네 소식은 https://example.com 에서 확인하세요' }).code === 'filter');
r = W(u1);
check('비공개 설정이 없으면 모든 글은 검토 대기', r.ok && r.held === true, r);
check('하루 한 글', /하루에 한 개/.test(W(u1).err));
const RULES = JSON.parse(fs.readFileSync(path.join(ROOT, '..', fs.existsSync(path.join(ROOT, '..', 'pt-engine')) ? 'pt-engine' : 'jangdaejang-engine', 'data', 'dongne', 'rules.json'), 'utf8'));
check('설정 넣기: 토큰 틀리면 거절', S.post({ action: 'dpRulesPut', k: 'no', rules: RULES }).err === 'auth');
r = S.post({ action: 'dpRulesPut', k: S.props.BRIEF_PULL_TOKEN, rules: RULES });
check('설정 넣기: 스크립트 속성 DP_RULES_* 에', r.ok && Number(S.props.DP_RULES_N) >= 1, r);
check('담합 글 막기(법 안내)', /담합/.test(W(u3, { text: '우리 단지 12억 이하로는 팔지 맙시다 다들 동참해요' }).err));
check('가격 예측 → 검토 대기', W(u3, { text: '다음 달이면 15억까지 갑니다 지금 준비하세요' }).held === true);
const sh = S.sheets['동네한마디'];
sh.rows.slice(1).forEach(x => { x[S.T.DPPC['시각']] = new S.VD(Date.now() - 2 * 864e5); });   // 어제 쓴 걸로
const okPost = W(u3, { text: '대치동 학원가 앞 횡단보도 공사가 이번 주에 끝나요.', topic: 'traffic', key: '11680|대치동' });
check('깨끗한 글은 바로 공개', okPost.ok && okPost.st === '공개', okPost);
sh.rows.slice(1).forEach(x => { x[S.T.DPPC['시각']] = new S.VD(Date.now() - 864e5 - 3600e3); });

/* 브리핑 칸: 광고성 정보 동의한 구독자만 */
function addSub(k, ad, am) {
  const B = S.sheets['브리핑구독'] || (S.sheets['브리핑구독'] = makeSheet()); if (!B.rows.length) B.appendRow(S.T.BH);
  const r = [], id = 'B' + crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 9);
  r[S.T.BC['id']] = id; r[S.T.BC['카카오id']] = k; r[S.T.BC['상태']] = '체험'; r[S.T.BC['상품']] = '체험'; r[S.T.BC['광고동의']] = ad; r[S.T.BC['아침광고동의']] = am; r[S.T.BC['채널']] = 'email'; r[S.T.BC['연락처']] = k + '@mail.kr';
  r[S.T.BC['시작일']] = S.T.ymd(new Date(Date.now() - 864e5)); r[S.T.BC['만료일']] = S.T.ymd(new Date(Date.now() + 5 * 864e5));
  B.appendRow(S.T.BH.map((h, i) => r[i] === undefined ? '' : r[i]));
  return S.T.bKey(id);
}
const kNo = addSub('sub0', false, false), kYes = addSub('sub1', true, false);
S.T.dpPickReset();
check('웹 브리핑 칸: 광고성 정보 동의 없으면 안 보임', S.post({ action: 'dpBrief', g: '11680', dn: '대치동', k: kNo }).show === false);
check('웹 브리핑 칸: 누구인지 모르면 안 보임', S.post({ action: 'dpBrief', g: '11680', dn: '대치동' }).show === false);
r = S.post({ action: 'dpBrief', g: '11680', dn: '대치동', k: kYes });
const dx = r.sec && r.sec.list[0];
check('웹 브리핑 칸: 동의한 구독자 → 대치동 글 1개 + 파트너 카드', r.show && dx && dx.post && /횡단보도/.test(dx.post.text) && dx.partners.length >= 2 && dx.partners[0].id === dx.post.pid, r);
check('카드에 법정 표시 5가지(사무소·소재지·연락처·등록번호·성명)', dx && ['office', 'addr', 'tel', 'reg', 'name'].every(k => dx.partners[0][k]) && dx.partners[0].tel === '02-1234-5678');
check('창립 혜택 중이면 카드에 창립 표시', dx && dx.partners.every(c => c.found === true));
r = S.post({ action: 'dpBrief', g: '11680', dn: '', k: kYes });
check('구 전체 구독자: 파트너가 있는 동 하나가 날마다 돌아가며', r.show && r.sec.list.length === 1, r.sec);

/* 도움돼요·신고·연락 기록 */
const pid = dx.post.id;
check('도움돼요 + 같은 사람 두 번은 한 번', S.post({ action: 'dpHelp', id: pid, v: 'visitor_aaaa' }).n === 1 && S.post({ action: 'dpHelp', id: pid, v: 'visitor_aaaa' }).again === true);
['v_bbbbbbbb', 'v_cccccccc', 'v_dddddddd'].forEach(v => S.post({ action: 'dpReport', id: pid, why: 'ad', v }));
check('글 신고 3건 → 잠시 가림(임시조치)', S.sheets['동네한마디'].rows.find(x => x[0] === pid)[S.T.DPPC['상태']] === '임시조치');
const p3 = S.T.dpAll().find(x => x.office === '대치공인중개사사무소');
check('파트너 카드 신고 → 대기열', S.post({ action: 'dpReport', pid: p3.id, why: 'false', v: 'v_rrrrrrrr' }).n === 1 && S.post({ action: 'dpReport', pid: p3.id, why: 'etc', v: 'v_ssssssss' }).n === 2);
let q = S.post({ action: 'dpAdminQueue', s: adm });
check('운영자 대기열: 검토 대기 신청·확인할 글·가린 글·신고 쌓인 파트너·사유 틀', q.ok && q.partners.length === 2 && q.hold.length >= 1 && q.tmp.length === 1 && q.reported[0].id === p3.id && q.tpl.ban.length === 4 && q.tpl.strike.length === 2, { p: q.partners && q.partners.length, h: q.hold && q.hold.length });
check('운영자 대기열: 이메일 가림', q.partners.every(x => /\*\*\*@/.test(x.mail)));
check('연락 누름 기록(같은 날 한 번)', S.post({ action: 'dpLog', t: 'call', id: p3.id, v: 'v1aaaaaaaa' }).ok && (S.post({ action: 'dpLog', t: 'call', id: p3.id, v: 'v1aaaaaaaa' }), S.sheets['동네파트너기록'].rows.filter(x => x[1] === 'call').length === 1));

/* 거절(이유 메일) → 자리 비면 대기 1번에게 */
const p2 = S.T.dpAll().find(x => x.mail === 'b@example.com');
check('거절은 이유 필수', /이유/.test(S.post({ action: 'dpAdminAct', s: adm, op: 'reject', id: p2.id }).err));
S.post({ action: 'dpAdminAct', s: adm, op: 'reject', id: p2.id, why: '등록 정보가 공공 자료와 달라요' });
const p4 = S.T.dpAll().find(x => x.mail === 'd@example.com');
check('자리가 나면 대기 1번에게 넣고 메일', p4.keys.some(k => k.k === '11680|개포동') && S.mails.some(m => m.to === 'd@example.com' && /자리가 났어요/.test(m.subject)) && S.mails.some(m => m.to === 'b@example.com' && /등록 정보가 공공 자료와 달라요/.test(m.htmlBody)));

/* 동 바꾸기 30일 */
const p1 = () => S.T.dpAll().find(x => x.mail === 'happy@example.com');
check('사무소 동은 못 바꿈', /사무소가 있는 동/.test(S.post({ action: 'dpSwap', s: u1, from: '11680|개포동', to: '11680|일원동' }).err));
r = S.post({ action: 'dpSwap', s: u1, from: '11680|도곡동', to: '11680|일원동' });
check('빈 자리 이웃 동으로 바꾸기', r.ok && p1().keys.some(k => k.k === '11680|일원동') && !p1().keys.some(k => k.k === '11680|도곡동'), r);
check('같은 자리는 30일에 한 번', /30일에 한 번/.test(S.post({ action: 'dpSwap', s: u1, from: '11680|일원동', to: '11680|도곡동' }).err));
check('대기 걸기', S.post({ action: 'dpWait', s: u3, key: '11680|도곡동' }).n === 1);

/* 단계 제재 1→2→3 */
const st = (op, cat, why) => S.post({ action: 'dpAdminAct', s: adm, op, id: p3.id, cat, why });
r = st('strike', 'rules'); check('1차: 경고 메일', r.step === 1 && S.mails.some(m => m.to === 'c@example.com' && /1차/.test(m.subject)));
r = st('strike', 'complaint'); const p3b = S.T.dpAll().find(x => x.id === p3.id);
check('2차: 7일 노출 중지(자리 그대로)', r.step === 2 && p3b.st === '노출중지' && p3b.keys.length > 0);
S.T.dpPickReset();
check('노출 중지 동안 브리핑에서 빠짐', !(S.post({ action: 'dpBrief', g: '11680', dn: '대치동', k: kYes }).sec.list[0] || { partners: [] }).partners.some(c => c.id === p3.id));
r = st('strike', 'rules'); const p3c = S.T.dpAll().find(x => x.id === p3.id);
check('3차: 해지 + 창립 혜택 박탈', r.step === 3 && p3c.st === '해지' && S.sheets['동네파트너'].rows.find(x => x[0] === p3.id)[S.T.DPC['창립']] === '박탈');

/* 중대 위반 박탈 */
r = S.post({ action: 'dpAdminAct', s: adm, op: 'ban', id: p4.id, cat: 'fraud', why: '고객 계약금 사고 확인' });
const p4b = S.T.dpAll().find(x => x.id === p4.id), banMail = S.mails.filter(m => m.to === 'd@example.com').pop();
check('중대 위반 박탈: 해지·혜택 박탈·글 지움·환불 없음 메일', r.step === 'ban' && p4b.st === '해지' && S.sheets['동네파트너'].rows.find(x => x[0] === p4.id)[S.T.DPC['창립']] === '박탈' && /돌려 드리지 않아요/.test(banMail.htmlBody) && /사기·전세사기·금전 사고/.test(banMail.htmlBody));
const u4b = S.addUser('u4b');
r = S.post(app0({ s: u4, office: '네번째공인중개사사무소', reg: '11680-2018-00111', name: '최넷', mail: 'd@example.com' }));
check('박탈된 등록번호로 다시 신청 → 바로 승인 안 함·창립 아님', r.ok && r.st === '검토대기' && r.founding === false, r);

/* 해지 버튼 */
r = S.post({ action: 'dpCancel', s: u1 });
check('해지 버튼 하나: 그달 말일까지 이용', r.ok && r.endAt === C.dpMonthEnd(S.T.ymd(new Date())) && p1().pay === '해지예정');
check('해지 취소', S.post({ action: 'dpCancel', s: u1, undo: true }).pay === '시범');

/* 빌링 잠금 */
check('빌링 잠김: 파트너 카드 등록 거절', S.post({ action: 'dpBillingIssue', s: u1, authKey: 'a', customerKey: 'c' }).code === 'billing_closed');
check('빌링 잠김: 브리핑 자동 결제 거절', S.post({ action: 'briefBillStart', s: sub, product: 'brief', agree: true }).code === 'billing_closed');
check('PAID_ACTIONS 는 그대로(빌링은 BILLING_OPEN·PAID_OPEN 둘 다로 잠금)', !/dpBillingIssue|briefBill/.test(/const PAID_ACTIONS = \{[^}]*\}/.exec(GS)[0]));

/* 탈퇴 */
S.post({ action: 'userDelete', s: u1 });
const gone = S.sheets['동네파트너'].rows.find(x => x[S.T.DPC['이메일']] === '' && x[S.T.DPC['사무소명']] === '행복공인중개사사무소');
check('회원 탈퇴: 파트너 해지 + 연락처·이메일 지움', !!gone && gone[S.T.DPC['상태']] === '해지');

/* ---------- ④ 빌링을 켠 가상 서버 ---------- */
tossLog = []; tossFail = false;
const SB = server({ open: true, billing: true, fetch: fakeFetch, props: { DATA_GO_KR_KEY: 'k', TOSS_SECRET_KEY: 'test_sk_FAKE', TOSS_BILLING_CLIENT_KEY: 'test_ck_FAKE' } });
const b1 = SB.addUser('b1');
r = SB.post({ action: 'dpConfig', s: b1 });
check('빌링 열림: 화면 키 전달, 첫 결제일 = 한 달 뒤', r.billing === true && r.clientKey === 'test_ck_FAKE' && r.firstCharge === C.dpFirstCharge(SB.T.ymd(new Date())));
check('빌링 열림: 자동 결제 동의를 따로 받아야 함', /정기 결제 동의/.test(SB.post(app0({ s: b1 })).err));
r = SB.post(app0({ s: b1, agree: Object.assign({ pay: true }, AG), plan: 'm', picks: ['11680|대치동', '11680|도곡동', '11680|일원동'] }));
const first = C.dpFirstCharge(SB.T.ymd(new Date())), fd = first.split('-');
check('가입: 카드대기 + 고객키 + 자동 결제 문구(4개 동, 창립 할인)', r.ok && r.pay === '카드대기' && /^[0-9a-f-]{36}_D[0-9A-F]{9}$/.test(r.ck) && r.payText === `${+fd[1]}월 ${+fd[2]}일부터 매월 13,900원이 자동 결제돼요`, r);
check('자동 결제 동의 문구가 동의 기록에', SB.sheets['동네파트너동의'].rows.some(x => /정기 결제\(자동결제\) 동의: .*13,900원/.test(x[3])));
const pidB = r.id;
check('카드 등록 전에는 노출 안 함', SB.T.dpAll().find(x => x.id === pidB).pay === '카드대기' && SB.post({ action: 'dpMine', s: b1 }).me.ck === r.ck);
check('고객키가 다르면 카드 등록 거절', /맞지 않아요/.test(SB.post({ action: 'dpBillingIssue', s: b1, authKey: 'AUTH1', customerKey: 'wrong' }).err));
r = SB.post({ action: 'dpBillingIssue', s: b1, authKey: 'AUTH1', customerKey: r.ck });
check('카드 등록: authKey → billingKey(서버 호출 본문 authKey·customerKey)', r.ok && r.pay === '정상' && r.first === first && tossLog[0][0] === 'issue' && tossLog[0][1].authKey === 'AUTH1');
const pb = () => SB.T.dpAll().find(x => x.id === pidB);
check('빌링키는 스크립트 속성에만(시트·응답에 없음)', JSON.parse(SB.props['BK_DP_' + pidB]).bk === 'BK_SECRET_AUTH1' && !JSON.stringify(SB.sheets).includes('BK_SECRET') && !JSON.stringify(SB.post({ action: 'dpMine', s: b1 })).includes('BK_SECRET'));
check('카드 표시는 끝 4자리만', /5678/.test(pb().card) && !/1234\*/.test(pb().card));
// 첫 결제 7일 전 안내 → 결제
const setRow = (h, v) => { const row = SB.sheets['동네파트너'].rows.find(x => x[0] === pidB); row[SB.T.DPC[h]] = v; };
const today = SB.T.ymd(new Date());
setRow('첫결제일', C.dpAddDays(today, 7)); setRow('다음결제일', C.dpAddDays(today, 7));
SB.T.dpDaily(new Date());
check('첫 결제 7일 전 안내 메일(결제일·금액·해지 버튼)', SB.mails.some(m => m.to === 'happy@example.com' && /7일 뒤/.test(m.subject) && /13,900원이 자동 결제돼요/.test(m.htmlBody) && /해지하기/.test(m.htmlBody)));
setRow('다음결제일', today); SB.props.DP_DAILY = '';
SB.T.dpDaily(new Date());
const ch = tossLog.find(x => x[0] === 'charge');
check('정기 결제: POST /v1/billing/{billingKey} + customerKey·amount·orderId·orderName + Basic 인증', ch && /\/v1\/billing\/BK_SECRET_AUTH1$/.test(ch[2]) && ch[1].amount === 13900 && ch[1].customerKey && ch[1].orderId && ch[1].orderName && ch[3].Authorization === 'Basic ' + Buffer.from('test_sk_FAKE:').toString('base64'));
check('결제 뒤 다음 결제일 +1개월', pb().next === C.dpNextCharge(today, 'm') && pb().pay === '정상');
// 실패 → 3일 다시 시도 → 멈춤 → 14일 → 해지, 창립 혜택 30일 뒤 사라짐
tossFail = true; setRow('다음결제일', today); SB.props.DP_DAILY = '';
SB.T.dpDaily(new Date());
check('결제 실패 → 재시도 + 안내', pb().pay === '재시도' && pb().failAt === today && SB.mails.some(m => /결제가 되지 않았어요/.test(m.subject)));
setRow('실패일', C.dpAddDays(today, -4)); SB.props.DP_DAILY = '';
SB.T.dpDaily(new Date());
check('3일 지나도 실패 → 노출 멈춤(자리 지킴)', pb().pay === '실패' && pb().keys.length === 4 && SB.mails.some(m => /노출을 멈췄어요/.test(m.subject)));
SB.T.dpPickReset();
setRow('실패일', C.dpAddDays(today, -18)); SB.props.DP_DAILY = '';
SB.T.dpDaily(new Date());
check('14일 더 지나면 해지 + 빌링키 지움', pb().st === '해지' && !SB.props['BK_DP_' + pidB]);
check('끊긴 지 30일 안이면 창립 표시가 남아 있음(다시 오면 이어 받기)', SB.sheets['동네파트너'].rows.find(x => x[0] === pidB)[SB.T.DPC['창립']] === 'Y');
setRow('해지예정일', C.dpAddDays(today, -31)); SB.props.DP_DAILY = '';
SB.T.dpDaily(new Date());
check('끊긴 지 30일 지나면 창립 혜택 사라짐', SB.sheets['동네파트너'].rows.find(x => x[0] === pidB)[SB.T.DPC['창립']] === '박탈');
r = SB.post(app0({ s: b1, agree: Object.assign({ pay: true }, AG) }));
check('다시 가입해도 창립 아님', r.ok && r.founding === false, r);

/* 모닝 브리핑 자동결제 */
tossFail = false;
const t1 = SB.addUser('t1');
const SBB = () => SB.sheets['브리핑구독'] || (SB.sheets['브리핑구독'] = makeSheet());
function trialRow(k, startOff, endOff) {
  const B = SBB(); if (!B.rows.length) B.appendRow(SB.T.BH);
  const r = [], id = 'B' + crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 9);
  r[SB.T.BC['id']] = id; r[SB.T.BC['카카오id']] = k; r[SB.T.BC['상태']] = '체험'; r[SB.T.BC['상품']] = /BRIEF_TRIAL = \{ name: BRIEF_NAME \+ ' 7일 체험'/.test(GS) ? (/const SITE_NAME = '([^']+)'/.exec(GS)[1] + ' 모닝 브리핑 7일 체험') : '';
  r[SB.T.BC['채널']] = 'email'; r[SB.T.BC['연락처']] = k + '@mail.kr'; r[SB.T.BC['연락처가림']] = k.slice(0, 2) + '***@mail.kr'; r[SB.T.BC['광고동의']] = false; r[SB.T.BC['발송수']] = 1;
  r[SB.T.BC['시작일']] = SB.T.ymd(new Date(Date.now() + startOff * 864e5)); r[SB.T.BC['만료일']] = SB.T.ymd(new Date(Date.now() + endOff * 864e5));
  B.appendRow(SB.T.BH.map((h, i) => r[i] === undefined ? '' : r[i]));
  return id;
}
trialRow('t1', -4, 2);   // 체험 5일째(남은 날 3일)
SB.T.briefExpiry(new Date());
const t5 = SB.mails.filter(m => m.to === 't1@mail.kr');
check('체험 5일째: 카드 등록 안내 한 번(이틀 뒤 끝·끊김 없이·링크·첫 달 반값 1,950원)', t5.length === 1 && /이틀 뒤/.test(t5[0].subject) && /끊김 없이 계속 받아요/.test(t5[0].htmlBody) && /autopay=1/.test(t5[0].htmlBody) && /1,950원/.test(t5[0].htmlBody), t5.map(m => m.subject));
SB.T.briefExpiry(new Date());
check('체험 안내는 다시 안 보냄', SB.mails.filter(m => m.to === 't1@mail.kr').length === 1);
check('자동 결제 동의 없으면 거절(문구 함께)', /자동 결제 동의에 따로 체크/.test(SB.post({ action: 'briefBillStart', s: t1, product: 'brief', agree: false }).err));
r = SB.post({ action: 'briefBillStart', s: t1, product: 'brief', agree: true });
const f1 = SB.T.ymd(new Date(Date.now() + 3 * 864e5)).split('-');
check('체험 중 등록: 첫 결제 = 체험 끝 다음 날, 첫 달 반값 문구', r.ok && r.half === true && r.payText === `${+f1[1]}월 ${+f1[2]}일부터 매월 3,900원이 자동 결제돼요(첫 달은 반값 1,950원)`, r);
r = SB.post({ action: 'briefBillIssue', s: t1, authKey: 'BRAUTH', customerKey: r.ck });
check('브리핑 카드 등록: 정상 + 빌링키는 속성에만', r.ok && r.bill.st === '정상' && Object.keys(SB.props).some(k => /^BK_BR_/.test(k) && /BK_SECRET_BRAUTH/.test(SB.props[k])) && !JSON.stringify(SB.sheets).includes('BK_SECRET_BRAUTH'));
const brRow = () => SB.sheets['브리핑자동결제'].rows[1];
brRow()[SB.T.BRAC['다음결제일']] = SB.T.ymd(new Date(Date.now() + 7 * 864e5)); brRow()[SB.T.BRAC['첫결제일']] = brRow()[SB.T.BRAC['다음결제일']];
SB.T.brBillDaily(new Date());
check('브리핑: 결제 7일 전 안내(첫 달 반값 금액)', SB.mails.some(m => m.to === 't1@mail.kr' && /7일 뒤/.test(m.subject) && /1,950원/.test(m.htmlBody)));
brRow()[SB.T.BRAC['다음결제일']] = SB.T.ymd(new Date()); brRow()[SB.T.BRAC['첫결제일']] = SB.T.ymd(new Date());
const nBefore = SBB().rows.length;
SB.T.brBillDaily(new Date());
const brCh = tossLog.filter(x => x[0] === 'charge').pop();
check('브리핑 첫 결제: 반값 1,950원 + 30일 이용 행 생김', brCh[1].amount === 1950 && SBB().rows.length === nBefore + 1 && SBB().rows[SBB().rows.length - 1][SB.T.BC['결제액']] === 1950);
check('다음 달은 정가', (() => { brRow()[SB.T.BRAC['첫결제일']] = SB.T.ymd(new Date(Date.now() - 30 * 864e5)); brRow()[SB.T.BRAC['다음결제일']] = SB.T.ymd(new Date()); SB.T.brBillDaily(new Date()); return tossLog.filter(x => x[0] === 'charge').pop()[1].amount === 3900; })());
r = SB.post({ action: 'briefBillCancel', s: t1 });
check('브리핑 자동 결제 해지 버튼 하나: 이미 낸 기간까지', r.ok && r.bill.st === '해지예정' && r.endAt);
// 체험 끝 + 카드 없음 → 딱 한 번
const t2 = SB.addUser('t2'); trialRow('t2', -8, -1);
SB.T.brTrialEnded(new Date()); SB.T.brTrialEnded(new Date());
const endM = SB.mails.filter(m => m.to === 't2@mail.kr');
check('체험 끝·카드 없음: 멈춤 + 카드 등록 안내 딱 한 번', endM.length === 1 && /멈췄어요/.test(endM[0].subject) && /한 번만/.test(endM[0].htmlBody));
const t3 = SB.addUser('t3'); trialRow('t3', -20, -10);
SB.T.brTrialEnded(new Date());
check('오래전에 끝난 체험자에게는 안 보냄', !SB.mails.some(m => m.to === 't3@mail.kr'));

/* ---------- ⑤ 공개 저장소 ---------- */
const PUB = walk(ROOT, []).concat(['assets/dongne.js', 'assets/dongne-core.js', 'tools/agent-backend.gs', 'assets/billing.js'].map(f => path.join(ROOT, f)));
const words = [].concat(...RULES.groups.map(g => g.re)).filter(s => s.length > 12);
const leak = PUB.filter(f => { const s = fs.readFileSync(f, 'utf8'); return words.some(w => s.includes(w)); });
check('공개 저장소에 비공개 거르기 낱말 없음', leak.length === 0, leak.map(f => path.relative(ROOT, f)));
check('공개 저장소에 빌링키·시크릿 키 값 없음', !/(live|test)_sk_[A-Za-z0-9]{6,}/.test(GS) && !/billingKey\s*[:=]\s*'[A-Za-z0-9]{10,}'/.test(GS));

console.log(`동네 파트너·자동결제: ${pass}개 통과${fail ? `, ${fail}개 실패` : ''}`);
process.exit(fail ? 1 : 0);
