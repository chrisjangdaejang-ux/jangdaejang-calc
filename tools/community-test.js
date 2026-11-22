/* 살아보니(건물별 후기·이야기) 자동 확인 — 실행: node tools/community-test.js </dev/null
   ① 숨김: config.js COMMUNITY_ENABLED=false 면 화면 어디에도 칸·링크가 없고, community/ 는 '준비 중'·검색 제외, 약관 초안은 숨김
   ② 서버(tools/agent-backend.gs v46): 문 닫힘·운영자 확인·기본 거르기(전화·주소·이메일·동호수)·설정 없으면 검토 대기·횟수 제한·
      건물마다 후기 하나·이야기 칸 열리는 기준·같은 동 다른 건물·별명·신고 임시조치·실거주 인증 사진 바로 지우기·탈퇴
   ③ 공개 저장소에 비공개 거르기 값이 없는지
   가짜 시트·드라이브·메일 위에서만 돌고 실제 서버에는 접속하지 않아요.
   진짜 거르기 설정으로도 돌려 보려면: CM_RULES_FILE=../jangdaejang-engine/data/community/rules.json node tools/community-test.js </dev/null
   (그때도 낱말은 찍지 않고 맞았는지만 찍어요) */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } }
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ---------- ① 숨김 ---------- */
const cfgSrc = read('assets/config.js');
check('config.js: COMMUNITY_ENABLED 는 false', /COMMUNITY_ENABLED:\s*false\b/.test(cfgSrc) && !/COMMUNITY_ENABLED:\s*true/.test(cfgSrc));
function clientCtx(o) {
  o = o || {};
  const store = Object.assign({}, o.ls || {}), sstore = {};
  const ctx = { console, JSON, Promise, URLSearchParams, setTimeout,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    sessionStorage: { getItem: k => (k in sstore ? sstore[k] : null), setItem: (k, v) => { sstore[k] = String(v); }, removeItem: k => { delete sstore[k]; } },
    location: { pathname: '/jangdaejang-calc/mine/', search: o.search || '', hash: '' } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(cfgSrc.replace(/if \(typeof document === 'undefined'\) return;/, 'return;') + (o.on ? ';window.JDJ_SITE.COMMUNITY_ENABLED=true;' : ''), ctx);
  vm.runInContext(read('assets/community.js'), ctx);
  return ctx;
}
const ADM = 'a'.repeat(64);
let c = clientCtx();
check('꺼짐: enabled()=false, slot() 은 빈 글자', c.JDJ_CM.enabled() === false && c.JDJ_CM.slot({ t: 'a', g: '11680', d: '개포동', k: '12|개포자이', n: '개포자이' }) === '');
check('꺼짐: 주소에 ?preview=community 만 붙여서는 안 열림', clientCtx({ search: '?preview=community' }).JDJ_CM.enabled() === false);
check('꺼짐: 운영자 표시만 있고 주소 표시가 없으면 안 열림', clientCtx({ ls: { jdj_cm_preview: '1', jdj_cm_admin: ADM } }).JDJ_CM.enabled() === false);
check('꺼짐: 미리 보기 표시는 있어도 운영자 토큰 모양이 아니면 안 열림', clientCtx({ ls: { jdj_cm_preview: '1', jdj_cm_admin: 'x' }, search: '?preview=community' }).JDJ_CM.enabled() === false);
c = clientCtx({ ls: { jdj_cm_preview: '1', jdj_cm_admin: ADM }, search: '?preview=community' });
check('운영자 미리 보기: 운영자 기기 + ?preview=community 면 열림, 칸이 생김', c.JDJ_CM.enabled() === true && /data-cm-pid="a\|11680\|개포동\|12\|개포자이"/.test(c.JDJ_CM.slot({ t: 'a', g: '11680', d: '개포동', k: '12|개포자이', n: '개포자이' })));
check('켜짐(대표 확인 뒤): config 만으로 열림', clientCtx({ on: true }).JDJ_CM.enabled() === true);
check('건물 번호: 꺾쇠·줄바꿈 빼고, 동의 | 는 공백으로, 형식이 틀리면 빈 값',
  c.JDJ_CM.pidOf({ t: 'o', g: '11680', d: '역삼|동', k: '역삼동|<b>1</b>' }) === 'o|11680|역삼 동|역삼동|b1/b' && c.JDJ_CM.pidOf({ t: 'x', g: '11680', d: 'a', k: 'b' }) === '' && c.JDJ_CM.pidOf({ t: 'a', g: '1168', d: 'a', k: 'b' }) === '');

const walk = (d, out) => { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { if (e.name.startsWith('.') || e.name === 'node_modules') return; const p = path.join(d, e.name); if (e.isDirectory()) { if (!/^(apt|cy|comm|sitemaps|data|tools|docs|design)$/.test(e.name) || d !== ROOT) walk(p, out); } else if (/\.html$/.test(e.name)) out.push(p); }); return out; };
const pages = walk(ROOT, []).map(p => path.relative(ROOT, p));
const linking = pages.filter(p => !p.startsWith('community/')).filter(p => /href="[^"]*community\//.test(read(p)));
check('꺼짐: community/ 밖의 어떤 화면에도 살아보니로 가는 링크가 없음', linking.length === 0, linking);
const tabSrc = read('assets/tabbar.js') + read('assets/layout.js');
check('꺼짐: 탭 메뉴·공용 배치에 살아보니 항목이 없음', !/community|살아보니/.test(tabSrc));
const views = { 'mine/index.html': "t: 'a'", 'assets/offi-view.js': "t: 'o'", 'assets/villa-view.js': "t: 'v'", 'assets/comm-view.js': "t: 'c'" };
Object.keys(views).forEach(f => check(`${f}: 살아보니 칸은 JDJ_CM.slot() 으로만(꺼져 있으면 빈 글자)`, new RegExp('window\\.JDJ_CM \\? JDJ_CM\\.slot\\(\\{ ?' + views[f].replace(/'/g, "'")).test(read(f))));
check('mine/: community.js 를 불러옴(아파트·빌라·오피스텔·상가 탭 모두 이 화면)', /assets\/community\.js\?v=\d+/.test(read('mine/index.html')));
const cp = read('community/index.html'), ca = read('community/admin/index.html');
check('community/: 검색 제외(noindex), 꺼져 있으면 준비 중', /<meta name="robots" content="noindex/.test(cp) && /준비 중이에요/.test(cp) && /!CM \|\| !CM\.enabled\(\)/.test(cp));
check('community/admin/: 검색 제외, 주소 전달 막음(no-referrer), 머리줄 로그인 칩 없음', /noindex/.test(ca) && /no-referrer/.test(ca) && /data-noacct/.test(ca));
const sm = ['sitemap.xml'].concat(fs.readdirSync(path.join(ROOT, 'sitemaps')).map(f => 'sitemaps/' + f)).filter(f => /\.xml$/.test(f));
check('사이트맵에 community 주소 없음', sm.every(f => !/\/community\//.test(read(f))));
const terms = read('terms/index.html'), priv = read('privacy/index.html');
check('약관: 살아보니 운영정책 초안은 숨김(hidden + data-cm-only) + 변호사 검토 필요 표시', /<section id="community" data-cm-only hidden>/.test(terms) && /변호사 검토 필요/.test(terms) && /임시조치/.test(terms) && /제44조의2/.test(terms) && /보관 기간/.test(terms));
check('개인정보처리방침: 살아보니 초안도 숨김', /<section id="community" data-cm-only hidden>/.test(priv) && /변호사 검토 필요/.test(priv));
check('약관·방침 화면이 community.js 를 불러야 켜는 날 보임', /assets\/community\.js/.test(terms) && /assets\/community\.js/.test(priv) && /assets\/config\.js/.test(terms));
const cmJs = read('assets/community.js');
check('화면 글: 회사 이름·서비스 이름을 직접 쓰지 않음', ![cmJs, cp, ca].some(s => /장대장|집코드/.test(s)));
const sw = read('sw.js');
check('서비스 워커: community.js 판 번호가 mine 과 같음', sw.indexOf('./assets/community.js?v=' + /community\.js\?v=(\d+)/.exec(read('mine/index.html'))[1]) >= 0);

/* ---------- ② 서버 ---------- */
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
const book = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet()), getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST', getSheets: () => Object.values(sheets), deleteSheet() {} };
sheets['중개사'] = makeSheet(); sheets['로그'] = makeSheet();
const props = { KAKAO_REST_KEY: 'FAKE', BRIEF_PULL_TOKEN: 'PULLTOKEN_' + crypto.randomBytes(8).toString('hex') };
const cacheMap = new Map(), mails = [], files = {}, folders = [];
let fileN = 0;
const ctx = {
  console,
  SpreadsheetApp: { getActive: () => book, openById: () => book },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) },
  CacheService: { getScriptCache: () => ({ get: k => (cacheMap.has(k) ? cacheMap.get(k) : null), put: (k, v) => cacheMap.set(k, v), remove: k => cacheMap.delete(k), removeAll: ks => ks.forEach(k => cacheMap.delete(k)) }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail(a, b, c) { mails.push(typeof a === 'object' ? a : { to: a, subject: b, body: c }); }, getRemainingDailyQuota: () => 100 },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  DriveApp: {
    getFolderById(id) { const f = folders.find(x => x.id === id); if (!f) throw new Error('no folder'); return f; },
    createFolder(name) {
      const f = { id: 'FOLD' + folders.length, name, shared: false, getId() { return this.id; }, setSharing() { this.shared = true; },
        createFile(blob) { const id = 'FILE' + (++fileN); files[id] = { id, name: blob.name, bytes: blob.bytes, type: blob.type, trashed: false, shared: false, folder: this.id }; return { getId: () => id, setSharing() { files[id].shared = true; } }; } };
      folders.push(f); return f;
    },
    getFileById(id) { const f = files[id]; if (!f) throw new Error('no file'); return { setTrashed(v) { f.trashed = v; }, getBlob: () => ({ getContentType: () => f.type, getBytes: () => f.bytes }) }; },
    Access: { ANYONE_WITH_LINK: 'x' }, Permission: { VIEW: 'v' }
  },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    formatDate: (d, tz, f) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).map(x => [x.type, x.value]));
      return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('hh', p.hour).replace('mm', p.minute);
    },
    computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    base64Decode: s => Array.from(Buffer.from(s, 'base64')),
    base64Encode: b => Buffer.from(b.map(x => x & 255)).toString('base64'),
    newBlob: (bytes, type, name) => ({ bytes, type, name })
  },
  UrlFetchApp: { fetch() { throw new Error('network'); } }
};
vm.createContext(ctx);
const GS = read('tools/agent-backend.gs');
vm.runInContext(GS + '\n;globalThis.__T = { UC, SC, UH, SSH, CMPC, CMVC, CMRC, CM_ST, cmCheck, cmUid, cmAlias, cmIsAdmin, cmUserGone, cmVerifyCleanup, hashOf, sessionUser, userDelete };', ctx);
const T = ctx.__T;
const VD = vm.runInContext('Date', ctx);   // 서버 쪽 날짜(instanceof Date 가 맞게)
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);

/* 가짜 회원 셋(세션 직접 만들기 — 로그인 자체는 auth-test.js 가 확인) */
function addUser(k, nick, joinedDaysAgo) {
  const U = sheets['회원'] || (sheets['회원'] = makeSheet()), S = sheets['세션'] || (sheets['세션'] = makeSheet());
  if (!U.rows.length) U.appendRow(T.UH); if (!S.rows.length) S.appendRow(T.SSH);
  const r = []; r[T.UC['카카오id']] = k; r[T.UC['닉네임']] = nick; r[T.UC['가입일']] = new VD(Date.now() - (joinedDaysAgo || 30) * 864e5); r[T.UC['최근로그인']] = new VD(); r[T.UC['저장자료']] = ''; r[T.UC['수정일']] = '';
  U.appendRow(T.UH.map((h, i) => r[i] === undefined ? '' : r[i]));
  const s = crypto.randomBytes(32).toString('hex'), sr = []; sr[T.SC['세션해시']] = T.hashOf('ses|' + s); sr[T.SC['카카오id']] = k; sr[T.SC['만든날']] = new VD(); sr[T.SC['만료일']] = new VD(Date.now() + 30 * 864e5);
  S.appendRow(T.SSH.map((h, i) => sr[i] === undefined ? '' : sr[i]));
  return s;
}
const A = addUser('k1001', '장대장실명'), B = addUser('k1002', '홍길동'), C = addUser('k1003', '김철수'), D = addUser('k1004', '이영희'), N = addUser('k1005', '새회원', 0);
const PID = 'a|11680|개포동|12|개포자이', PID2 = 'o|11680|개포동|개포동|1234-5', PID3 = 'a|11680|역삼동|1|역삼아파트';
const R5 = { tr: 4, no: 3, pk: 2, sc: 5, mg: 4 };
const W = (s, o) => post(Object.assign({ action: 'cmWrite', s, pid: PID, name: '개포자이', kind: 'r', r: R5, text: '역까지 걸어서 7분이라 출퇴근 편해요' }, o || {}));

// 문 닫힘
check('문 닫힘: 읽기는 open:false 만(글 없음)', JSON.stringify(post({ action: 'cmPlace', pid: PID })) === JSON.stringify({ ok: true, open: false }));
let r = W(A);
check('문 닫힘: 로그인 회원도 쓰기 거절(closed)', r.ok === false && r.code === 'closed', r);
check('잘못된 건물 번호 거절', post({ action: 'cmPlace', pid: 'x|<script>' }).ok === false);

// 운영자 확인
r = post({ action: 'cmAdminEnter', t: 'f'.repeat(64) });
check('운영자: 메일 링크 없이 들어가기 거절', r.ok === false);
r = post({ action: 'cmAdminMail' });
const mail = mails.find(m => /운영자 확인 링크/.test(m.subject || ''));
check('운영자: 확인 링크는 스크립트 주인 메일로만, 응답에 메일 주소·링크 없음', r.ok && mail && mail.to === 'owner@example.com' && !/owner@|#t=/.test(JSON.stringify(r)));
const tok = /#t=([0-9a-f]{64})/.exec(mail.body)[1];
check('운영자: 링크 토큰은 해시만 저장', !JSON.stringify(props).includes(tok));
r = post({ action: 'cmAdminEnter', t: tok });
const AS = r.as;
check('운영자: 링크로 들어가면 운영자 토큰(30일)', r.ok && /^[0-9a-f]{64}$/.test(AS) && T.cmIsAdmin(AS) && !JSON.stringify(props).includes(AS));
check('운영자: 같은 링크는 두 번 못 씀', post({ action: 'cmAdminEnter', t: tok }).ok === false);
check('운영자 아닌 토큰으로 검토 목록 거절', post({ action: 'cmAdminQueue', as: 'b'.repeat(64) }).code === 'admin');
post({ action: 'cmAdminMail' }); post({ action: 'cmAdminMail' });
check('운영자 메일은 한 시간에 세 번까지', post({ action: 'cmAdminMail' }).ok === false);

// 설정 없음 → 검토 대기 (운영자 미리 보기)
r = W(A, { as: AS });
check('설정이 아직 없으면 글은 검토 대기(운영자가 보고 올림)', r.ok && r.held === true && r.st === '검토대기', r);
const P = () => sheets['커뮤니티글'];
check('시트에 카카오 회원번호·닉네임을 넣지 않음', !JSON.stringify(P().rows).match(/k1001|장대장실명/));

// 비공개 설정 넣기(테스트용 가짜 낱말 — 진짜 목록은 비공개 엔진에)
const RULES = process.env.CM_RULES_FILE ? JSON.parse(fs.readFileSync(process.env.CM_RULES_FILE, 'utf8')) : {
  open: false, boardMin: 3, reportHide: 2, nearMin: 3, lim: { review: [3, 5], post: [3, 5], report: [5, 10], verify: [2, 3] },
  groups: [{ id: 'dam', act: 'block', re: ['테스트억\\s*이하로\\s*팔지\\s*말'] }, { id: 'prof', act: 'block', re: ['테스트욕'], norm: false }, { id: 'ad', act: 'block', re: ['테스트광고'] }, { id: 'watch', act: 'hold', re: ['테스트검토'] }],
  score: { w: { dup: 5, rep: 1, digit: 1, latin: 1, newbie: 1, burst: 1, flat: 0.5, short: 0.2 }, hold: 1.5, block: 4 }
};
const REAL = !!process.env.CM_RULES_FILE;
check('설정 넣기: 토큰 틀리면 거절', post({ action: 'cmRulesPut', k: 'nope', rules: RULES }).err === 'auth');
check('설정 넣기: 정규식이 틀리면 거절', post({ action: 'cmRulesPut', k: props.BRIEF_PULL_TOKEN, rules: { open: false, groups: [{ id: 'dam', act: 'block', re: ['(('] }] } }).ok === false);
r = post({ action: 'cmRulesPut', k: props.BRIEF_PULL_TOKEN, rules: Object.assign({}, RULES, REAL ? { boardMin: 3, reportHide: 2, lim: { review: [3, 5], post: [3, 5], report: [5, 10], verify: [2, 3] } } : {}) });
check('설정 넣기: 스크립트 속성에 나눠 저장', r.ok && Number(props.CM_RULES_N) >= 1 && r.open === false, r);
check('설정이 들어와도 open:false 면 일반 사용자에겐 닫힘', post({ action: 'cmPlace', pid: PID }).open === false);

// 일반 쓰기는 운영자 미리 보기로(as) 확인
const Wa = (s, o) => W(s, Object.assign({ as: AS }, o || {}));
const blocked = (text, why) => { const x = Wa(B, { text }); return x.ok === false && x.code === 'filter' && (!why || new RegExp(why).test(x.err)); };
check('기본 거르기: 전화번호', blocked('관리실 번호 010-1234-5678 이에요', '전화번호') && blocked('연락 주세요 010 1234 5678', '전화번호') && blocked('02.3444.5008 로 연락', '전화번호'));
check('기본 거르기: 인터넷 주소·오픈채팅·이메일', blocked('자세한 건 https://example.com 참고', '인터넷 주소') && blocked('open.kakao.com/o/abc 들어오세요', '인터넷 주소') && blocked('abc@test.co.kr 로 메일', '이메일'));
check('기본 거르기: 동·호수', blocked('101동 1203호 너무 시끄러워요', '동·호수') && blocked('1203호 층간소음 심해요', '동·호수'));
check('기본 거르기: 지하철 3호선·9호선은 괜찮음', Wa(B, { text: '3호선·9호선 둘 다 가까워서 좋아요' }).ok === true);
if (!REAL) {
  check('비공개 설정: 담합 글 막기(법 안내 문구)', blocked('우리 단지 테스트억 이하로 팔지 말자구요', '담합'));
  check('비공개 설정: 띄어 써도 걸림(norm)', blocked('테스트억   이하로   팔지 말자', '담합'));
  check('비공개 설정: 욕설·광고 막기', blocked('관리 테스트욕 같아요', '욕설') && blocked('테스트광고 연락', '광고'));
  r = Wa(C, { pid: PID3, name: '역삼아파트', text: '관리소 테스트검토 필요해 보여요' });
  check('비공개 설정: hold 낱말은 검토 대기로', r.ok && r.held === true, r);
}
r = Wa(A, { text: '역까지 걸어서 7분이라 출퇴근 편해요' });
check('정상 후기는 바로 공개', r.ok && r.st === '공개', r);
const firstId = r.id;
r = Wa(A, { text: '밤에는 조용한 편이고 관리가 꼼꼼해요', r: { tr: 5, no: 4, pk: 3, sc: 4, mg: 5 } });
check('한 사람은 한 건물에 후기 하나: 다시 쓰면 고쳐짐(같은 id)', r.ok && r.id === firstId && P().rows.filter(x => x[T.CMPC['회원']] === T.cmUid('k1001') && x[T.CMPC['장소']] === PID).length === 1, r);
check('별점 빠지면 거절', Wa(D, { r: { tr: 4 } }).ok === false);
check('한 줄 후기 100자 넘으면 거절', Wa(D, { text: '가'.repeat(101) }).ok === false);
check('너무 짧으면 거절', Wa(D, { text: '좋음' }).ok === false);
check('새로 가입한 사람 + 같은 글 되풀이 = 스팸 점수로 검토·막기',
  (() => { const a = Wa(N, { pid: PID3, text: '역까지 걸어서 7분이라 출퇴근 편해요' }); const b = Wa(N, { pid: PID2, text: '역까지 걸어서 7분이라 출퇴근 편해요' }); return a.ok && (b.ok === false || b.held === true); })());
let lim = null; for (let i = 0; i < 8 && !lim; i++) { const x = Wa(D, { pid: 'a|11680|대치동|' + i + '|단지' + i, text: '대치동 학원가가 가까워요 ' + '가나다라마바사아자차'[i] }); if (!x.ok && x.code === 'limit') lim = i; }
check('횟수 제한: 한 시간에 정한 수를 넘으면 잠시 막힘', lim !== null && lim <= 5, lim);

// 이야기 칸·같은 동·별명
let pl = post({ action: 'cmPlace', pid: PID, as: AS });
check('읽기: 공개 후기만, 평균 별점', pl.ok && pl.open && pl.preview === true && pl.n >= 2 && pl.avg.tr > 0 && pl.reviews.every(x => x.x && x.who), pl);
check('별명: 닉네임이 아니라 이웃 XXXX, 건물마다 달라짐', pl.reviews.every(x => /^이웃 [0-9A-F]{4}$/.test(x.who)) && !JSON.stringify(pl).match(/장대장실명|홍길동|k100/)
  && T.cmAlias(T.cmUid('k1001'), PID) !== T.cmAlias(T.cmUid('k1001'), PID2));
check('후기가 적으면 이야기 칸 닫힘', pl.board === false && pl.posts.length === 0);
r = post({ action: 'cmWrite', as: AS, s: B, pid: PID, name: '개포자이', kind: 'p', text: '이번 주말 단지 장터 열린대요 가 보실 분' });
check('이야기 글: 후기가 기준보다 적으면 거절', r.ok === false && /후기가 적어서/.test(r.err), r);
Wa(C, { text: '주차는 저녁에 좀 빠듯해요' });
pl = post({ action: 'cmPlace', pid: PID, as: AS });
check('후기가 기준(테스트 3개)을 넘으면 이야기 칸 열림', pl.board === true, { n: pl.n, b: pl.boardMin });
r = post({ action: 'cmWrite', as: AS, s: D, pid: PID, name: '개포자이', kind: 'p', text: '이번 주말 단지 장터 열린대요 가 보실 분 있나요' });
check('이야기 글 쓰기', r.ok && r.st === '공개', r);
const pl3 = post({ action: 'cmPlace', pid: PID3, as: AS });
const pl2 = post({ action: 'cmPlace', pid: PID2, as: AS });
check('글이 적은 건물: 같은 동 다른 건물 후기를 이름표와 함께(다른 동은 안 섞음)', pl2.near.length > 0 && pl2.near.every(x => x.n === '개포자이') && pl3.near.every(x => x.n !== '개포자이'), { near2: pl2.near.length, near3: pl3.near.map(x => x.n) });

// 로그인한 사람의 내 글
pl = post({ action: 'cmPlace', pid: PID, as: AS, s: A });
check('내 후기 표시(고치기용)', pl.me && pl.me.review && pl.me.review.mine === true && pl.reviews.some(x => x.mine));

// 신고 → 임시조치
const target = pl.reviews.find(x => x.mine).id;
check('내 글은 신고 대신 지우기', post({ action: 'cmReport', as: AS, s: A, id: target, why: 'abuse' }).ok === false);
r = post({ action: 'cmReport', as: AS, s: B, id: target, why: 'abuse' });
const r2 = post({ action: 'cmReport', as: AS, s: B, id: target, why: 'abuse' });
check('같은 사람이 두 번 신고해도 한 번', r.ok && !r.hidden && r2.again === true);
r = post({ action: 'cmReport', as: AS, s: C, id: target, why: 'pi' });
check('신고가 기준 수에 닿으면 바로 가림(임시조치) + 운영자 메일(글 내용 없이)', r.ok && r.hidden === true && mails.some(m => /임시조치/.test(m.subject || '') && !/역까지|조용한/.test(m.body || '')), r);
pl = post({ action: 'cmPlace', pid: PID, as: AS });
check('임시조치 글은 목록에서 빠짐', !pl.reviews.some(x => x.id === target));
check('임시조치 글은 쓴 사람이 고칠 수 없음', Wa(A, { text: '고쳐서 다시 올려 볼게요 괜찮아요' }).ok === false);
let q = post({ action: 'cmAdminQueue', as: AS });
check('운영자 검토 목록: 임시조치·검토 대기·신고 이유', q.ok && q.tmp.some(x => x.id === target && x.reps.length === 2) && q.hold.length >= 1 && q.cfg.ready === true, { tmp: q.tmp && q.tmp.length, hold: q.hold && q.hold.length });
check('운영자: 다시 공개', post({ action: 'cmAdminAct', as: AS, id: target, op: 'show' }).ok && post({ action: 'cmPlace', pid: PID, as: AS }).reviews.some(x => x.id === target));
const heldId = q.hold[0].id;
check('운영자: 지우기 = 내용·별점·건물 이름 비움', post({ action: 'cmAdminAct', as: AS, id: heldId, op: 'del' }).ok
  && (row => row[T.CMPC['상태']] === '삭제' && row[T.CMPC['내용']] === '' && row[T.CMPC['별점']] === '')(P().rows.find(x => x[0] === heldId)));
check('운영자 아니면 지우기 거절', post({ action: 'cmAdminAct', as: 'c'.repeat(64), id: target, op: 'del' }).ok === false);

// 실거주 인증
const IMG = 'data:image/jpeg;base64,' + Buffer.alloc(3000, 7).toString('base64');
check('인증: 사진 아닌 것 거절', post({ action: 'cmVerify', as: AS, s: B, pid: PID, img: 'data:text/html;base64,PGI+' }).ok === false);
r = post({ action: 'cmVerify', as: AS, s: B, pid: PID, name: '개포자이', img: IMG });
const vrow = sheets['커뮤니티인증'].rows[1], fid = vrow[T.CMVC['파일']];
check('인증: 운영자만 보는 폴더(공유 안 함)에, 파일 이름에 사람 정보 없음', r.ok && r.waiting && files[fid] && !files[fid].shared && !folders[0].shared && /^V[0-9A-F]{9}\.jpg$/.test(files[fid].name), r);
check('인증: 기다리는 중이면 다시 보내도 하나', post({ action: 'cmVerify', as: AS, s: B, pid: PID, img: IMG }).waiting === true && sheets['커뮤니티인증'].rows.length === 2);
q = post({ action: 'cmAdminQueue', as: AS });
check('운영자 검토 목록에 사진(운영자 토큰으로만)', q.verify.length === 1 && /^data:image\/jpeg;base64,/.test(q.verify[0].img));
check('운영자가 아니면 사진 못 봄', post({ action: 'cmAdminQueue' }).ok === false);
r = post({ action: 'cmAdminVerify', as: AS, id: q.verify[0].id, op: 'ok' });
check('승인하면 사진은 바로 휴지통, 시트에서 파일 칸 비움, 승인만 남음', r.ok && files[fid].trashed === true && sheets['커뮤니티인증'].rows[1][T.CMVC['파일']] === '' && sheets['커뮤니티인증'].rows[1][T.CMVC['상태']] === '승인');
pl = post({ action: 'cmPlace', pid: PID, as: AS });
check('인증한 사람 글에 실거주 인증 표시(그 건물에서만)', pl.reviews.some(x => x.v) && !post({ action: 'cmPlace', pid: PID2, as: AS }).near.some(x => x.v && x.n !== '개포자이'));
post({ action: 'cmVerify', as: AS, s: C, pid: PID, img: IMG });
const old = sheets['커뮤니티인증'].rows[2]; old[T.CMVC['시각']] = new VD(Date.now() - 15 * 864e5);
const fid2 = old[T.CMVC['파일']];
check('14일 동안 검토 안 된 사진은 지움', T.cmVerifyCleanup() === 1 && files[fid2].trashed === true && sheets['커뮤니티인증'].rows[2][T.CMVC['상태']] === '기간만료');
r = post({ action: 'cmVerify', as: AS, s: D, pid: PID, img: IMG }); const fid3 = sheets['커뮤니티인증'].rows[3][T.CMVC['파일']];
post({ action: 'cmAdminVerify', as: AS, id: sheets['커뮤니티인증'].rows[3][0], op: 'no' });
check('거절해도 사진은 바로 지움', files[fid3].trashed === true && sheets['커뮤니티인증'].rows[3][T.CMVC['상태']] === '거절');

// 내 글 지우기·탈퇴
const mine = post({ action: 'cmMine', s: D });
check('내 글 목록', mine.ok && mine.list.length >= 1);
check('내 글 지우기', post({ action: 'cmDelete', s: D, id: mine.list[0].id }).ok && P().rows.find(x => x[0] === mine.list[0].id)[T.CMPC['상태']] === '삭제');
check('남의 글은 못 지움', post({ action: 'cmDelete', s: D, id: target }).ok === false);
const ub = T.cmUid('k1002');
r = post({ action: 'userDelete', s: B });
check('탈퇴: 그 사람 글 모두 지움 + 인증 기록 삭제 + 신고 기록에서 이름 뺌', r.ok && P().rows.filter(x => x[T.CMPC['회원']] === ub).every(x => x[T.CMPC['상태']] === '삭제' && x[T.CMPC['내용']] === '')
  && !sheets['커뮤니티인증'].rows.some(x => x[T.CMVC['회원']] === ub) && !sheets['커뮤니티신고'].rows.some(x => x[T.CMRC['신고자']] === ub), r);
check('운영자 알림 메일에는 글 내용·회원 정보 없음', mails.filter(m => /살아보니\]/.test(m.subject || '')).every(m => !/역까지|조용한|k100|장대장실명/.test(m.body || '')));

/* ---------- ③ 공개 저장소에 비공개 값이 없는지 ---------- */
check('서버 코드에 거르기 낱말 목록·점수 무게가 없음(설정에서 읽음)', !/groups\s*:\s*\[\s*\{/.test(GS.split('v46 살아보니')[1] || '') && !/"w"\s*:|w:\s*\{\s*dup/.test(GS));
if (REAL) {
  const pub = [GS, cmJs, cp, ca, terms].join('\n');
  const leaked = RULES.groups.reduce((n, g) => n + g.re.filter(s => s.length >= 6 && pub.includes(s)).length, 0);
  check('진짜 설정의 규칙 문장이 공개 파일에 하나도 없음', leaked === 0, leaked);
  // 진짜 설정에 함께 적힌 예문(비공개)으로: 정상 문장은 통과, 걸러야 할 문장은 그 종류로 걸림(문장은 찍지 않음)
  const EX = RULES.examples || { ok: [], bad: [] }, opt = { rules: RULES, recent: [], join: new VD(0), hour: 0, r: R5 };
  const fp = EX.ok.filter(t => T.cmCheck(t, opt).act !== 'ok');
  check('진짜 설정: 정상 예문이 걸리지 않음', EX.ok.length > 0 && fp.length === 0, fp.length);
  const miss = EX.bad.filter(([t, w]) => T.cmCheck(t, opt).why !== w);
  check('진짜 설정: 걸러야 할 예문이 그 종류로 걸림', EX.bad.length > 0 && miss.length === 0, miss.length);
}

console.log(`살아보니: ${pass}개 통과${fail ? `, ${fail}개 실패` : ''}${REAL ? ' (진짜 설정 사용)' : ''}`);
process.exit(fail ? 1 : 0);
