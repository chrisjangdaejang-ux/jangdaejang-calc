/* 새 주소로 저장값 옮기기(assets/store-move.js) 검사 — 실행: node tools/store-move-test.js </dev/null
   ① 지금은 꺼져 있고, 예전 주소(github.io)에서는 track.js 가 이 파일을 붙이지도 않음(지금 사이트 동작 그대로)
   ② 옮길 값 고르기: jdj_ 만, 로그인·운영자·미리 보기 값은 빼고, 한도 안으로
   ③ 다리 화면: 목적지 고정(다른 사이트로 못 보냄), 돌아갈 경로 검사, 예전 값이 # 뒤에만 실림
   ④ 새 주소: track.js 가 # 값을 분석 도구 전에 지우고, store-move 가 받아 저장(이미 쓴 값은 지키기), 한 번만
   ⑤ 건너뛰기: 로봇·다른 화면 안·로그인·결제 돌아오는 화면 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let ok = 0, bad = 0;
const check = (name, got, want) => {
  const g = String(JSON.stringify(got)), w = String(JSON.stringify(want));
  if (g === w) ok++; else { bad++; console.log('FAIL ' + name + '\n   결과 ' + g.slice(0, 800) + '\n   기대 ' + w); }
};
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const M = require('../assets/store-move.js');

/* ① 꺼짐 */
check('지금은 꺼짐', M.CFG.ON, false);
check('목적지·다리 화면 주소', [M.CFG.DEST, M.CFG.BRIDGE], ['https://zipyebo.com', 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/move/']);
check('꺼져 있으면 옮기러 가지 않음', M.skipReason({ top: true, path: '/', ua: 'Mozilla/5.0 (iPhone)' }), 'off');

function store(init) {
  const m = new Map(Object.entries(init || {}));
  return { get length() { return m.size; }, key: i => [...m.keys()][i] ?? null, getItem: k => m.has(k) ? m.get(k) : null,
    setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), dump: () => Object.fromEntries(m) };
}
const TRACK = rd('assets/track.js');
const loaderSrc = TRACK.slice(TRACK.lastIndexOf('/* 새 주소로 저장값 옮기기(assets/store-move.js): 새 도메인'));
function loader(href, ls, ss) {
  const u = new URL(href), added = [];
  const ctx = { location: u, localStorage: ls || store(), sessionStorage: ss || store(),
    document: { currentScript: { src: u.origin + (u.pathname.startsWith('/jangdaejang-calc/') ? '/jangdaejang-calc/' : '/') + 'assets/track.js?v=2' },
      createElement: () => ({}), head: { appendChild: s => added.push(s.src) } } };
  vm.runInNewContext(loaderSrc, ctx);
  return added;
}
check('예전 주소(github.io)에서는 store-move.js 를 붙이지 않음', loader('https://chrisjangdaejang-ux.github.io/jangdaejang-calc/mine/'), []);
check('내 컴퓨터 확인용(http)에서도 붙이지 않음', loader('http://127.0.0.1:8790/jangdaejang-calc/'), []);
check('새 주소 첫 방문이면 붙임(track.js 와 같은 폴더)', loader('https://zipyebo.com/apt/11110/'), ['https://zipyebo.com/assets/store-move.js?v=1']);
check('옮기기를 끝낸 기기는 붙이지 않음', loader('https://zipyebo.com/', store({ jdj_moved: '1' })), []);
check('이 탭에서 이미 확인했으면 붙이지 않음(꺼져 있을 때 한 번만 불러옴)', loader('https://zipyebo.com/', store(), store({ jdj_mv_chk: '1' })), []);
check('돌아온 값이 있으면 끝낸 기기라도 붙임', loader('https://zipyebo.com/', store({ jdj_moved: '1' }), store({ jdj_mv_in: '0' })).length, 1);
check('track.js 가 붙이는 코드는 GA 를 켜는 코드와 따로', TRACK.lastIndexOf('store-move.js') > TRACK.indexOf("gtag('js'"), true);

/* ② 고르기 */
const ENT = [['jdj_watch', '[1,2]'], ['jdj_fin', '{"i":7000}'], ['jdj_cal', '[{"d":"2027-03-01","a":30000}]'], ['jdj_auth', 'TOKEN'], ['jdj_auth_state', 'x'],
  ['jdj_cm_admin', '1'], ['jdj_dp_preview', '1'], ['jdj_cs_pv', '1'], ['jdj_bk_nav', '[]'], ['jdj_moved_out', '1'], ['other_site', 'x'], ['jdj_orders', '[{"o":"A1"}]'],
  ['jdj_big', 'x'.repeat(70000)], ['jdj_vid', 'abc']];
const PK = M.pick(ENT);
check('옮길 값: jdj_ 사용자 값만', Object.keys(PK.keep).sort(), ['jdj_cal', 'jdj_fin', 'jdj_orders', 'jdj_vid', 'jdj_watch']);
check('너무 큰 값은 빼고 알려 줌', PK.dropped, ['jdj_big']);
const many = Array.from({ length: 10 }, (_, i) => ['jdj_k' + i, 'y'.repeat(40000)]);
check('전체 한도(18만 자) 안으로', Object.keys(M.pick(many).keep).length, 4);

/* 주고받는 모양 */
const enc = M.encode({ jdj_fin: '{"i":7000,"n":"홍길동"}' }, 123);
check('# 뒤 글자는 주소에 안전한 글자만', /^[A-Za-z0-9_-]+$/.test(enc), true);
check('되읽기(한글 포함)', M.decode(enc), { t: 123, d: { jdj_fin: '{"i":7000,"n":"홍길동"}' } });
check('이상한 값은 버림', [M.decode('!!'), M.decode(''), M.decode(M.encode({ jdj_auth: 'T', jdj_x: '1' }).slice(0, 5))], [null, null, null]);
check('받을 때도 로그인 값은 거름', M.decode(M.encode({ jdj_auth: 'T', jdj_x: '1' })).d, { jdj_x: '1' });

/* 합치기 */
check('처음(10분 안): 예전 값으로', M.merge({ jdj_fin: 'new', jdj_vid: 'n' }, { jdj_fin: 'old', jdj_vid: 'o' }, true), [['jdj_fin', 'old'], ['jdj_vid', 'o']]);
check('새 주소를 이미 쓰던 기기: 새 주소 값 지킴(없는 것만 + 방문 기록)', M.merge({ jdj_fin: 'new', jdj_vid: 'n' }, { jdj_fin: 'old', jdj_vid: 'o', jdj_cal: 'c' }, false), [['jdj_vid', 'o'], ['jdj_cal', 'c']]);

/* ③ 돌아갈 경로 */
check('돌아갈 경로 검사', ['/map/?g=11110', '//evil.com/x', '/\\evil', 'https://evil.com/', '/a\nb', '/x#frag', ''].map(M.safeTo), ['/map/?g=11110', '/', '/', '/', '/', '/x', '/']);

/* 다리 화면 실행 */
const BR = M.buildBridge('https://zipyebo.com');
check('다리 화면: 확인 글자·검색 제외·외부 파일 없음·목적지 고정', [BR.includes(M.CFG.MARK), BR.includes('noindex'), /<script[^>]+src=/.test(BR), BR.includes('"https://zipyebo.com"'), BR.includes("default-src 'none'")], [true, true, false, true, true]);
let thrown = ''; try { M.buildBridge('javascript:alert(1)'); } catch (e) { thrown = 'err'; }
check('다리 화면: 이상한 목적지 거절', thrown, 'err');
function bridge(hash, ls) {
  const js = BR.match(/<script>\n([\s\S]*?)\n<\/script>/)[1];
  const ctx = { localStorage: ls, location: { hash, replace(u) { ctx.went = u; } }, btoa: s => Buffer.from(s, 'binary').toString('base64'), unescape, encodeURIComponent, decodeURIComponent, JSON, Object, String, Date };
  vm.runInNewContext(js, ctx);
  return ctx.went;
}
const old = store({ jdj_watch: '[1,2]', jdj_fin: '{"i":7000}', jdj_auth: 'TOKEN', jdj_cm_admin: '1' });
const went = bridge('#to=' + encodeURIComponent('/mine/?d=11710'), old);
check('다리 화면: 목적지는 새 주소의 같은 화면', went.split('#')[0], 'https://zipyebo.com/mine/?d=11710');
const got = M.decode(went.split('#jdjmv=')[1]);
check('다리 화면: # 뒤에 옮길 값만(로그인·운영자 값 없음)', got && Object.fromEntries(Object.entries(got.d).sort()), { jdj_fin: '{"i":7000}', jdj_watch: '[1,2]' });
check('다리 화면: 예전 값은 지우지 않고 보낸 표시만', [old.getItem('jdj_fin'), !!old.getItem('jdj_moved_out')], ['{"i":7000}', true]);
check('다리 화면: 다른 사이트로 보내라는 값은 첫 화면으로', bridge('#to=' + encodeURIComponent('//evil.com/'), store()).split('#')[0], 'https://zipyebo.com/');
check('다리 화면: 예전 값이 없으면 #jdjmv=0', bridge('', store()), 'https://zipyebo.com/#jdjmv=0');

/* ④ 새 주소에서 받기: track.js 첫 부분(# 지우기) + store-move run */
const stashSrc = TRACK.slice(TRACK.indexOf('/* 새 주소로 저장값 옮기기(assets/store-move.js, 기본 꺼 둠)에서 돌아온'), TRACK.indexOf("(function(){\n  const C = window.JDJ_CONFIG"));
function arrive(href, ls, ss, extra) {
  const u = new URL(href), win = { location: Object.assign(u, { reload() { win.reloaded = (win.reloaded || 0) + 1; }, replace(x) { win.went = x; } }),
    localStorage: ls, sessionStorage: ss, history: { state: null, replaceState(st, t, x) { win.url = x; } }, navigator: { userAgent: 'Mozilla/5.0 (iPhone)' },
    atob: s => Buffer.from(s, 'base64').toString('binary'), btoa: s => Buffer.from(s, 'binary').toString('base64') };
  win.window = win; win.top = win; win.self = win; Object.assign(win, extra || {});
  vm.runInNewContext(stashSrc, win);
  const code = rd('assets/store-move.js').replace("if (typeof module !== 'undefined' && module.exports) module.exports = api;\n  else if (typeof document !== 'undefined') run();", 'run();');
  vm.runInNewContext(code, win);
  return win;
}
const ls2 = store({ jdj_vid: 'newvid', jdj_visits_home: '1' }), ss2 = store();
const W = arrive(went.replace('https://zipyebo.com', 'https://zipyebo.com'), ls2, ss2);
check('새 주소: 분석 도구 전에 # 값을 주소에서 지움', W.url, '/mine/?d=11710');
check('새 주소: 이 방문은 페이지 보기 통계를 다시 보내지 않음 표시', W.JDJ_MV_BACK, 1);
check('새 주소: 받은 값 저장 + 끝냄 표시 + 한 번 새로 고침', [ls2.getItem('jdj_fin'), ls2.getItem('jdj_watch'), !!ls2.getItem('jdj_moved'), W.reloaded, ss2.getItem('jdj_mv_in')], ['{"i":7000}', '[1,2]', true, 1, null]);
check('새 주소: 로그인 값은 옮기지 않음', ls2.getItem('jdj_auth'), null);
const W2 = arrive('https://zipyebo.com/mine/', ls2, ss2);
check('새로 고침 뒤: 다시 옮기러 가지 않음', [W2.went, W2.reloaded], [undefined, undefined]);
check('track.js: 돌아온 방문은 send_page_view false', /window\.JDJ_MV_BACK \? \{page_location: loc, page_referrer: ref, send_page_view: false\}/.test(TRACK), true);

/* ⑤ 건너뛰기 */
const on = o => M.skipReason(Object.assign({ force: true, top: true, path: '/', search: '', ua: 'Mozilla/5.0 (iPhone)' }, o));
check('켜졌을 때 보통 방문은 옮기러 감', on({}), '');
check('건너뛰기: 로봇·자동 브라우저·다른 화면 안', [on({ ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }), on({ ua: 'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)' }), on({ webdriver: true }), on({ top: false })], ['bot', 'bot', 'bot', 'frame']);
check('건너뛰기: 로그인·결제 돌아오는 화면', [on({ path: '/login/' }), on({ path: '/premium/success/' }), on({ path: '/brief/paid/' }), on({ search: '?paymentKey=x' }), on({ search: '?code=abc' })], ['path', 'path', 'path', 'query', 'query']);
check('건너뛰기: 끝낸 기기·이 탭에서 시도함·기한 지남', [on({ moved: true }), on({ tried: true }), on({ today: '2099-01-01' })], ['moved', 'tried', 'until']);

/* 켜졌을 때(force) 실제로 다리 화면이 있는지 먼저 확인하고 감 */
(async () => {
  const mk = body => async () => ({ ok: true, text: async () => body });
  const go = async (fetchFn, href) => {
    const code = rd('assets/store-move.js').replace(/^(\s*ON: )false\b/m, '$1true').replace("if (typeof module !== 'undefined' && module.exports) module.exports = api;\n  else if (typeof document !== 'undefined') run();", 'run();');
    const u = new URL(href), win = { location: Object.assign(u, { replace(x) { win.went = x; }, reload() {} }), localStorage: store(), sessionStorage: store(), navigator: { userAgent: 'Mozilla/5.0 (iPhone)' }, fetch: fetchFn };
    win.top = win; win.self = win;
    vm.runInNewContext(code, win); await new Promise(r => setTimeout(r, 20));
    return win;
  };
  const a = await go(mk(BR), 'https://zipyebo.com/map/?g=11110');
  check('켜짐: 다리 화면 확인 뒤 이동(돌아갈 곳은 # 뒤에만)', a.went, 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/move/#to=' + encodeURIComponent('/map/?g=11110'));
  check('켜짐: 이 탭 시도 표시', a.sessionStorage.getItem('jdj_mv_try'), '1');
  const b = await go(mk('<html>404</html>'), 'https://zipyebo.com/');
  check('켜짐: 다리 화면이 아직 없으면 그대로(사이트 안 끊김)', b.went, undefined);
  const c = await go(mk(BR), 'https://other.example/');
  check('켜짐: 새 대표 주소가 아닌 곳에서는 안 감', c.went, undefined);
  const d = await go(async () => { throw new Error('net'); }, 'https://zipyebo.com/');
  check('켜짐: 확인이 실패해도 그대로', d.went, undefined);
  console.log(`저장값 옮기기 검사: ${ok}개 맞음, ${bad}개 틀림`);
  process.exit(bad ? 1 : 0);
})();
