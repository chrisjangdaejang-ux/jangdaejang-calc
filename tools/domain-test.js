/* 새 도메인 준비 검사 — 실행: node tools/domain-test.js </dev/null
   ① 화면·공용 JS·서비스 워커·앱 설치 정보에 사이트 절대 경로(/jangdaejang-calc/, /jangdaejang-data/)가 새로 생기지 않았는지
      (쓰면 새 도메인 https://zipyebo.com 에서 깨짐 — 상대 경로나 JB.SITE / JB.DATA 를 쓰세요)
   ② 경로 자동 감지 줄(JB)이 모든 파일에서 글자 하나 다르지 않고 같으며, 예전 주소·새 도메인에서 맞는 값을 주는지
   ③ JB 를 쓰는 파일·화면 스크립트는 JB 를 먼저 정의하는지
   ④ 상대 경로가 실제 파일을 가리키는지(예전 주소 /jangdaejang-calc/ 와 새 도메인 / 양쪽에서 같은 파일)
   ⑤ 도메인 바꾸기 도구(tools/domain-switch.js) 미리 보기: CNAME·SITE_URL·robots·서버 주소, 예전 대표 주소가 남지 않음
   ⑥ 서버: 카카오 로그인 돌아올 주소에 예전 주소·새 도메인 둘 다, 메일 링크는 WEB_ROOT 한 곳 */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let ok = 0, bad = 0;
const check = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { ok++; } else { bad++; console.log('FAIL ' + name + '\n   결과 ' + g.slice(0, 1500) + '\n   기대 ' + w); }
};
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const files = cp.execFileSync('git', ['-C', ROOT, 'ls-files', '-z'], { maxBuffer: 1 << 28 }).toString().split('\0').filter(Boolean)
  .filter(f => fs.existsSync(path.join(ROOT, f)));

const CANON = "var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');";
const ABS = /(?<!github\.io)\\?\/jangdaejang-(calc|data)\\?\//;

/* ① 사이트 절대 경로 금지 */
const served = files.filter(f => /\.(html|js|css|webmanifest|json)$/.test(f) && !/^(tools|docs|design)\//.test(f) && !/^(apt|cy)\//.test(f));
const ALLOW = { 'sw.js': [/^const DATA_PATH = '\/jangdaejang-data\/';/m] };     // 예전 주소에서만 쓰는 데이터 경로(같은 사이트일 때만 캐시)
const hits = [];
for (const f of served) {
  let s = rd(f).split(CANON).join('');
  for (const re of ALLOW[f] || []) s = s.replace(re, '');
  s.split('\n').forEach((l, i) => { if (ABS.test(l)) hits.push(f + ':' + (i + 1) + ' ' + l.trim().slice(0, 120)); });
}
check('사이트 절대 경로(/jangdaejang-calc/·/jangdaejang-data/) 없음 — 상대 경로나 JB.SITE·JB.DATA 를 쓰세요', hits, []);
// 검색용 페이지(apt/·cy/)는 엔진이 만듦 — 표본만
const gen = files.filter(f => /^(apt|cy)\/.*\.html$/.test(f));
const genHits = gen.filter((f, i) => i % 50 === 0).filter(f => ABS.test(rd(f)));
check('검색용 페이지(표본)에도 사이트 절대 경로 없음', genHits, []);

/* ② 자동 감지 줄이 모두 같음 + 값 */
const jbLines = [];
for (const f of served) rd(f).split('\n').forEach(l => { if (l.includes("window.JDJ_BASE) ||")) jbLines.push([f, l.trim()]); });
check('경로 자동 감지 줄(JB)은 모두 같은 글자', jbLines.filter(([, l]) => l !== CANON).map(([f]) => f), []);
const jb = p => { const c = { location: { pathname: p } }; c.window = c; vm.runInNewContext(CANON + '\nthis.out = JB;', c); return c.out; };
check('예전 주소에서: 사이트·데이터 경로', jb('/jangdaejang-calc/map/'), { SITE: '/jangdaejang-calc/', DATA: '/jangdaejang-data/' });
check('새 도메인 첫 화면에서: 사이트 /, 데이터는 github.io 공개 데이터', jb('/map/'), { SITE: '/', DATA: 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' });
check('새 도메인 /jangdaejang-calc 비슷한 이름 경로도 첫 화면 기준', jb('/jangdaejang-calcx/').SITE, '/');
const nodeJB = (() => { const c = {}; vm.runInNewContext(CANON + '\nthis.out = JB;', c); return c.out; })();
check('node(검사) 에서는 예전 주소 기준', nodeJB.SITE, '/jangdaejang-calc/');

/* ③ JB 를 쓰기 전에 정의 */
const noDef = [];
for (const f of served.filter(f => /\.js$/.test(f))) { const s = rd(f); if (/\bJB\.(SITE|DATA)\b/.test(s) && !s.includes(CANON)) noDef.push(f); }
for (const f of served.filter(f => /\.html$/.test(f))) {
  const s = rd(f); let defined = false;
  for (const m of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(m[1])) continue;
    const body = m[2], def = body.indexOf(CANON), use = body.search(/\bJB\.(SITE|DATA)\b/);
    if (use >= 0 && !defined && (def < 0 || def > use)) { noDef.push(f); break; }
    if (def >= 0 && !/type="module"/.test(m[1])) defined = true;
  }
}
check('JB 를 쓰는 곳은 먼저 정의', noDef, []);

/* ④ 상대 경로가 실제 파일 */
const exists = rel => { const p = path.join(ROOT, rel); return fs.existsSync(p) && (fs.statSync(p).isFile() || fs.existsSync(path.join(p, 'index.html'))); };
const broken = [];
const pages = files.filter(f => /\.html$/.test(f) && !/^(apt|cy|tools|docs|design)\//.test(f) && !/^weekly\/\d/.test(f))
  .concat(['weekly/2026-46/index.html'], gen.filter((f, i) => i % 400 === 0));
for (const f of pages) {
  const s = rd(f).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, m => m.replace(/>[\s\S]*<\/script>/, '></script>'));
  for (const m of s.matchAll(/\b(?:src|href|action)=["']((?:\.\.?\/)[^"'#?]*)/g)) {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1]));
    if (target.startsWith('..')) { broken.push(f + ' → ' + m[1] + ' (사이트 밖)'); continue; }
    if (!exists(target === '.' ? 'index.html' : target)) broken.push(f + ' → ' + m[1]);
  }
}
check('상대 경로가 모두 실제 파일(사이트 안)', [...new Set(broken)].slice(0, 30), []);
const man = JSON.parse(rd('manifest.webmanifest'));
const manPaths = [man.id, man.start_url, man.scope].concat((man.icons || []).map(i => i.src), (man.shortcuts || []).flatMap(s => [s.url].concat((s.icons || []).map(i => i.src))));
check('앱 설치 정보: 모두 ./ 로 시작(어느 주소에서나 같은 폴더)', manPaths.filter(p => !/^\.\//.test(p)), []);
check('앱 설치 정보: 아이콘 파일 있음', manPaths.filter(p => /\.png$/.test(p) && !exists(p.slice(2))), []);
const sw = rd('sw.js'), shell = (sw.match(/const SHELL = \[([\s\S]*?)\];/) || [, ''])[1].match(/'[^']*'/g).map(x => x.slice(1, -1));
check('서비스 워커 미리 저장 목록: 모두 ./ 로 시작', shell.filter(u => !u.startsWith('./')), []);
check('서비스 워커 미리 저장 목록: 파일 있음', shell.filter(u => !exists(u.slice(2).replace(/\?.*$/, '') || 'index.html')), []);
check('서비스 워커 범위는 자기 위치 기준', /const BASE = new URL\('\.\/', self\.location\)\.pathname;/.test(sw), true);
check('.nojekyll 있음(.well-known 폴더를 그대로 올림)', fs.existsSync(path.join(ROOT, '.nojekyll')), true);
check('CNAME 은 아직 없음(바꾸는 날 tools/domain-switch.js 가 만듦)', fs.existsSync(path.join(ROOT, 'CNAME')), false);

/* ⑤ 도메인 바꾸기 미리 보기 */
const S = require('./domain-switch.js');
const P = S.plan({ domain: 'zipyebo.com' });
check('CNAME 내용', P.out.get('CNAME'), 'zipyebo.com\n');
check('config.js SITE_URL', /SITE_URL: 'https:\/\/zipyebo\.com',/.test(P.out.get('assets/config.js') || ''), true);
const left = [...P.out].filter(([f, s]) => s.includes(S.OLD) && f !== 'tools/agent-backend.gs').map(([f]) => f);
const untouched = served.filter(f => !P.out.has(f) && !/^(sitemaps)\//.test(f) && rd(f).includes(S.OLD));
check('바꾼 뒤 화면에 예전 대표 주소 없음', left.concat(untouched), []);
const rob = P.out.get('robots.txt') || '';
check('robots: 경로가 / 기준·사이트맵 새 주소', [/^Allow: \/$/m.test(rob), /^Disallow: \/login\/$/m.test(rob), rob.includes('Sitemap: https://zipyebo.com/sitemap.xml'), rob.includes('/jangdaejang-calc/')], [true, true, true, false]);
check('서버 WEB_ROOT 새 주소', /^const WEB_ROOT = 'https:\/\/zipyebo\.com\/';/m.test(P.out.get('tools/agent-backend.gs') || ''), true);
const swNew = P.out.get('sw.js') || '', vNow = +(sw.match(/jdj-v(\d+)/) || [])[1], vNew = +(swNew.match(/jdj-v(\d+)/) || [])[1];
check('sw 판 번호 +1', vNew, vNow + 1);
const cfgV = s => (s.match(/assets\/config\.js\?v=(\d+)/) || [])[1];
check('config.js 판 번호 +1', +cfgV(P.out.get('index.html') || '') , +cfgV(rd('index.html')) + 1);
let bad2 = ''; try { S.plan({ domain: 'javascript:alert(1)' }); } catch (e) { bad2 = 'err'; }
check('이상한 도메인 거절', bad2, 'err');

/* ⑥ 서버 */
const gs = rd('tools/agent-backend.gs');
check('서버: WEB_ROOT 한 줄(지금은 예전 주소)', (gs.match(/^const WEB_ROOT = '([^']*)';/m) || [])[1], S.OLD + '/');
check('서버: 카카오 로그인 돌아올 주소 둘 다 허용', [gs.includes("'https://zipyebo.com/login/'"), /KAKAO_REDIRECTS = \[WEB_ROOT \+ 'login\/'/.test(gs)], [true, true]);
check('서버: 쓰지 않는 예전 후보 주소(zipcode.works)는 로그인 허용에서 뺌', /KAKAO_REDIRECTS = \[[^\]]*zipcode\.works/.test(gs), false);
check('서버: 브이월드 확인 도메인은 사이트 주소와 따로(VWORLD_DOMAIN)', [/^const VWORLD_DOMAIN = 'chrisjangdaejang-ux\.github\.io';/m.test(gs), /WEB_ROOT\.replace\(\/\^https/.test(gs)], [true, false]);
const P2 = S.plan({ domain: 'zipyebo.com', storeMoveOn: true }), sm2 = P2.out.get('assets/store-move.js') || '';
check('전환 도구 --store-move-on: 저장값 옮기기 켜고 track.js 가 붙이는 판 번호 +1', [/^\s*ON: true,/m.test(sm2), /store-move\.js\?v=2/.test(P2.out.get('assets/track.js') || '')], [true, true]);
check('전환 도구 기본(켜기 없음): 저장값 옮기기는 그대로 꺼짐', P.out.has('assets/store-move.js'), false);
const P3 = S.plan({ domain: 'example.org' });
check('다른 도메인이면 저장값 옮기기 목적지도 같이', /^\s*DEST: 'https:\/\/example\.org'/m.test(P3.out.get('assets/store-move.js') || ''), true);
check('지금 저장값 옮기기는 꺼짐·목적지 zipyebo.com', [/^\s*ON: false,/m.test(rd('assets/store-move.js')), /DEST: 'https:\/\/zipyebo\.com'/.test(rd('assets/store-move.js'))], [true, true]);
check('서버: 메일 링크에 예전 사이트 주소를 직접 쓰지 않음(WEB_ROOT 만)', (gs.match(/https:\/\/chrisjangdaejang-ux\.github\.io\/jangdaejang-calc\//g) || []).length, 2);

console.log(`도메인 준비 검사: ${ok}개 맞음, ${bad}개 틀림`);
process.exit(bad ? 1 : 0);
