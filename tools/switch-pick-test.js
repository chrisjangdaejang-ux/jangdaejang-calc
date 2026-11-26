/* 첫 화면 '이사 갈 집 구하기' 칸 → [집이 있어요]·[전월세 살아요] 펼침(assets/switch-pick.js) 자동 검증
   실행: node tools/switch-pick-test.js </dev/null
   ① 고른 값 기억(localStorage 막혀도 오류 없이) ② 처음엔 펼치고, 기억한 뒤엔 바로 그 화면 주소 ③ 자바스크립트 꺼져도 원래 주소(switch/)
   ④ 키보드(Enter·Space·Escape)·aria-expanded ⑤ 메뉴 격자(펼친 칸이 끼어도 마지막 칸 전체 너비) ⑥ 클릭 집계 이름 */
const fs = require('fs'), path = require('path');
const P = require('../assets/switch-pick.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const rows = [];
function check(name, got, want, basis) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want, basis }); }

/* ① 기억 */
const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; };
const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
let ls = mem();
check('처음엔 기억 없음', P.load(ls), null);
check('전월세 고르면 기억', [P.save(ls, 'rent'), P.load(ls)], [true, 'rent']);
check('모르는 값은 저장 안 함', [P.save(ls, 'x'), P.load(ls)], [false, 'rent']);
ls.setItem(P.KEY, 'zzz');
check('이상한 값이 남아 있으면 무시', P.load(ls), null);
check('저장소가 막혀도 오류 없음', [P.load(bad), P.save(bad, 'own'), P.load(null)], [null, false, null], 'try/catch');
check('단추 두 개: 주소·문구·집계', P.OPTS.map(o => [o.href, o.b, o.s, o.track]), [['switch/', '집이 있어요', '팔고 이사 가기', 'home_switch_pick_own'], ['switch/rent/', '전월세 살아요', '보증금으로 이사 갈 집 찾기', 'home_switch_pick_rent']]);

/* ②④ 가짜 화면으로 mount */
function el(tag) {
  const e = { tagName: tag, attrs: {}, dataset: {}, cls: new Set(), ev: {}, hidden: false, children: [], parentNode: null,
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    classList: null, addEventListener(t, f) { (this.ev[t] = this.ev[t] || []).push(f); },
    fire(t, o) { const ev = Object.assign({ prevented: false, preventDefault() { this.prevented = true; }, target: this, button: 0 }, o); (this.ev[t] || []).forEach(f => f(ev)); return ev; },
    click() { return this.fire('click'); }, focus() { doc.activeElement = this; },
    insertBefore(n) { n.parentNode = this; this.children.push(n); }, querySelector() { return null; }, closest() { return null; } };
  e.classList = { add: c => e.cls.add(c), remove: c => e.cls.delete(c) };
  return e;
}
const doc = { activeElement: null, createElement: el, readyState: 'complete' };
function page(store) {
  const nav = el('nav'), a = el('a'); a.setAttribute('href', 'switch/'); nav.insertBefore(a); a.parentNode = nav;
  const w = { document: doc, localStorage: store, innerHeight: 0 };
  return { nav, a, w, api: P.mount(a, w) };
}
let pg = page(mem());
check('처음: 주소는 그대로(switch/) + 단추 역할', [pg.a.getAttribute('href'), pg.a.getAttribute('role'), pg.a.getAttribute('aria-expanded'), pg.a.getAttribute('aria-controls')], ['switch/', 'button', 'false', 'swPick'], '자바스크립트 꺼지면 원래 주소로');
let ev = pg.a.click();
check('누르면 이동 막고 펼침', [ev.prevented, pg.a.getAttribute('aria-expanded'), pg.nav.children.length, pg.nav.children[1] && pg.nav.children[1].id], [true, 'true', 2, 'swPick']);
check('펼친 칸은 그 칸 바로 다음', pg.nav.children[1].className, 'swpick');
pg.a.click();
check('다시 누르면 접힘', [pg.a.getAttribute('aria-expanded'), pg.nav.children[1].hidden], ['false', true]);
ev = pg.a.fire('keydown', { key: ' ' });
check('Space 로 펼침', [ev.prevented, pg.a.getAttribute('aria-expanded')], [true, 'true']);
pg.nav.children[1].fire('keydown', { key: 'Escape' });
check('Escape 로 접고 칸으로 포커스', [pg.a.getAttribute('aria-expanded'), doc.activeElement === pg.a], ['false', true]);
ev = pg.a.fire('click', { ctrlKey: true });
check('Ctrl+클릭(새 탭)은 원래 주소로', ev.prevented, false);
const html = pg.nav.children[1].innerHTML;
check('펼친 칸 안 단추 = 진짜 링크 2개(집계 이름 포함)', [(html.match(/<a href="switch\/" data-track="home_switch_pick_own"/) || []).length, (html.match(/<a href="switch\/rent\/" data-track="home_switch_pick_rent"/) || []).length], [1, 1]);
check('쉬운 말·~요체 안내', /지금 사는 집이 어떤가요\?/.test(html) && /바꿀 수 있어요/.test(html), true);

let st = mem(); P.save(st, 'rent'); pg = page(st);
check('기억한 뒤: 칸 주소 = 전월세 화면, 펼침 없음', [pg.a.getAttribute('href'), pg.a.getAttribute('role'), pg.a.getAttribute('aria-expanded')], ['switch/rent/', null, null]);
ev = pg.a.click();
check('  └ 누르면 막지 않고 바로 이동', ev.prevented, false);
st = mem(); P.save(st, 'own'); pg = page(st);
check('집이 있어요 기억 → switch/', pg.a.getAttribute('href'), 'switch/');
pg = page(bad);
check('저장소 막힌 기기도 펼침은 동작', [pg.a.click().prevented, pg.a.getAttribute('aria-expanded')], [true, 'true']);

/* ③⑤ 첫 화면·격자 */
const home = read('index.html'), lay = read('assets/layout.css'), sw = read('sw.js');
check('첫 화면 칸: href="switch/" 유지 + 집계 이름', /<a href="switch\/" data-track="home_to_switch">/.test(home), true, '점진적 향상');
check('첫 화면에 스크립트 연결', /<script src="\.\/assets\/switch-pick\.js\?v=1" defer><\/script>/.test(home), true);
/* 첫 화면 개편(대표 승인 시안 2026-11-26): '이사 갈 집' 단추는 맨 위 상황 단추 4칸 격자(.sit) 안 */
check('상황 단추 격자 안에서 펼침', /<nav class="sit" id="sit"[\s\S]*?<a href="switch\/" data-track="home_to_switch">[\s\S]*?<\/nav>/.test(home), true);
check('펼친 칸은 한 줄 전체·단추 높이 44px 이상', /\.sit div\.swpick\{grid-column:1\/-1/.test(home) && /\.sit \.swpick-row a\{[^}]*min-height:(\d+)px/.test(home) && +home.match(/\.sit \.swpick-row a\{[^}]*min-height:(\d+)px/)[1] >= 44, true);
check('서비스 워커에 등록', sw.includes("'./assets/switch-pick.js?v=1'"), true);

let pass = 0;
rows.forEach(r => { if (r.ok) pass++; console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name.padEnd(44) + ' ' + JSON.stringify(r.got).slice(0, 30).padEnd(30) + ' ' + (r.ok ? '' : '기대 ' + JSON.stringify(r.want) + ' ') + (r.basis || '')); });
console.log('\n' + pass + '/' + rows.length + ' 통과');
if (pass !== rows.length) process.exit(1);
