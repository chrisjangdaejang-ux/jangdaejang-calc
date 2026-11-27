/* 상가·건물·땅 실거래 지도(map/?k=bld · ?k=land) 자동 확인 — 실행: node tools/bldmap-test.js </dev/null
   ① 계산(assets/bldmap-core.js): 줄 풀기 · 기간·금액·면적·용도·종류 거르기 · ㎡/평·대지/연면적 단가 · 짧은 금액 · 동 묶음 가운데값(3건부터, 직거래·지분 뺌)
      · 동네 둘레 자리(늘 같은 자리, 반지름 안) · 동 가운데 찾는 순서 · 땅 묶음 · 주소 왕복 · 단가 분포 그림
   ② 화면 규칙: 지번·소유자 칸을 읽지 않음 · '정확한 위치가 아니라 동네 위치예요' · 땅은 LAND_ENABLED/미리 보기일 때만 · 다른 회사 이름·권유 문구 없음 · ~요 말투
   ③ 연결: map/index.html(머리줄 전환·스크립트·아파트 코드 건너뛰기) · sw.js 미리 저장 판 · 첫 화면·내 집 시세(상가·건물)·지역별 상가·건물 페이지에서 지도로 가는 링크
   ④ 화면 캡처(선택): BMAP_SHOTS=저장 폴더 [BMAP_DATA=bmap 폴더(로컬 자료) | 없으면 raw.githubusercontent.com 공개본] node tools/bldmap-test.js
      → 390×844 · 1280×800 캡처, 지도 출처 표시·확대 단추가 목록 칸·기호 설명에 가리지 않는지, 가로 넘침·콘솔 오류 확인 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const B = require('../assets/bldmap-core.js');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---------- ① 계산 ---------- */
const DOC = { g: '11680', to: '202610', from: '202111', d: ['역삼동', '신사동', '없는동'], u: ['제2종근린생활', '업무', '숙박'], z: ['일반상업', '제2종일반주거'],
  c: [[0, 20261012, 0, 0, 33.1, 3, 30000, 0], [0, 20250105, 1, 0, 40, 1, 50000, 1], [0, 20240301, 1, 0, 100, 2, 120000, 0], [0, 20220301, 0, 0, 20, null, 8000, 2]],
  b: [[1, 20260903, 0, 1, 481.2, 231.5, 2750000, 0, 0], [1, 20240310, 2, 1, 687.5, 224.9, 500000, 0], [1, 20230101, 0, 1, 300, 150, 300000, 0], [2, 20211201, 1, 0, 1000, null, 900000, 0]],
  e: [[127.023, 37.52, 1, 'p']], dc: { '없는동': [127.1, 37.5, 'h'] } };
const L = B.decode(DOC);
check('줄 풀기: 8건 · 지번 칸 없음', L.length === 8 && L.every(d => !('jibun' in d) && !('j' in d)), L.length);
check('구분상가 줄', eq([L[0].k, L[0].dong, L[0].use, L[0].zone, L[0].area, L[0].floor, L[0].amt, L[0].flag], ['c', '역삼동', '제2종근린생활', '일반상업', 33.1, 3, 30000, 0]));
check('통건물 줄 + 추정 위치', eq([L[4].k, L[4].area, L[4].land, L[4].est], ['g', 481.2, 231.5, { lng: 127.023, lat: 37.52, grade: 1, src: 'p' }]) && L[5].est === null);
const F = o => B.filter(L, Object.assign({ types: { c: true, g: true }, years: 5, price: '', area: '', use: '', basis: 'l', to: '202610' }, o)).map(d => d.id);
check('기간: 1년 / 3년 / 5년', eq([F({ years: 1 }).length, F({ years: 3 }).length, F({ years: 5 }).length], [2, 5, 8]), [F({ years: 1 }), F({ years: 3 })]);
check('기간 시작 = 끝 달 포함 최근 n년', B.since('202610', 1) === 20251100 && B.since('202610', 5) === 20211100);
check('종류: 구분상가만', eq(F({ types: { c: true, g: false } }), ['c0', 'c1', 'c2', 'c3']));
check('금액: 10억~30억', eq(F({ price: 'p3' }), ['c2', 'g2']) && eq(F({ price: 'p5' }), ['g0']));
check('면적: 통건물 대지 기준 / 연면적 기준', eq(F({ area: 'a3', types: { c: false, g: true } }), ['g0', 'g1']) && eq(F({ area: 'a3', basis: 'b', types: { c: false, g: true } }), ['g2']));
check('용도: 근린생활 · 업무 · 숙박', eq(F({ use: 'n' }), ['c0', 'c3', 'g0', 'g2']) && eq(F({ use: 'o' }), ['c1', 'c2', 'g3']) && eq(F({ use: 'h' }), ['g1']));
check('용도 묶음', ['제1종근린생활', '업무', '판매', '숙박', '의료'].map(B.useGroup).join('') === 'nyshx'.replace('y', 'o'));
check('단가: 구분상가 전용 ㎡당 · 3.3㎡당', Math.round(B.unitPrice(L[0], 'm')) === 906 && Math.round(B.unitPrice(L[0], 'p')) === Math.round(30000 / 33.1 * 3.3058));
check('단가: 통건물 대지 / 연면적 · 대지 없으면 null', Math.round(B.unitPrice(L[4], 'm', 'l')) === 11879 && Math.round(B.unitPrice(L[4], 'm', 'b')) === 5715 && B.unitPrice(L[7], 'm', 'l') === null);
check('짧은 금액', [B.shortWon(125000), B.shortWon(9500), B.shortWon(2750000), B.shortWon(1234567)].join('|') === '12.5억|9,500만|275억|123억');
check('금액 글자', B.won(123400) === '12억 3,400만 원' && B.won(5000) === '5,000만 원');
check('말풍선 값: 총액 · ㎡당 · 평당', [B.label(L[0], 't'), B.label(L[0], 'm'), B.label(L[4], 'p', 'b')].join('|') === '3억|906만|1.9억', [B.label(L[0], 't'), B.label(L[0], 'm'), B.label(L[4], 'p', 'b')]);
check('말풍선 이름표·날짜', B.useTag(L[0]) === '근린' && B.useTag(L[1]) === '업무' && B.useTag({ k: 'c', use: '의료' }) === '상가' && B.useTag({ k: 'g', use: '' }) === '기타' && B.ymShort(20260602) === '26.06');
const G = B.byDong(L, 't', 'l');
check('동 묶음: 거래 많은 순 · 종류별 건수', eq(G.map(o => [o.dong, o.n, o.nk.c, o.nk.g]), [['역삼동', 4, 4, 0], ['신사동', 3, 0, 3], ['없는동', 1, 0, 1]]));
check('가운데값: 직거래·지분 뺀 3건부터(역삼동 2건 → 없음 · 신사동 3건 → 가운데)', G[0].med === null && G[1].med === 500000);
check('목록 최신 순', G[1].list.map(d => d.id).join() === 'g0,g1,g2');
const c0 = { lat: 37.5, lng: 127 }, p1 = B.ring(c0, 'k', 3, 20), p2 = B.ring(c0, 'k', 3, 20);
const dist = p => Math.hypot((p.lat - c0.lat) * 111320, (p.lng - c0.lng) * 111320 * Math.cos(c0.lat * Math.PI / 180));
check('동네 둘레 자리: 늘 같은 자리 · 반지름 안(450m)', eq(p1, p2) && Array.from({ length: 60 }, (_, i) => dist(B.ring(c0, 'x', i, 60))).every(d => d <= 451));
check('동네 둘레 자리: 서로 다름', new Set(Array.from({ length: 30 }, (_, i) => B.ring(c0, 'x', i, 30)).map(p => p.lat.toFixed(5) + p.lng.toFixed(5))).size === 30);
const rows = { '11680|역삼동': [127.03, 37.49, 5] };
check('동 가운데: 공동주택 → 구 파일 대신 값 → 없음', eq(B.dongCenter('11680', '역삼동', rows, DOC.dc), { lng: 127.03, lat: 37.49, src: 'apt' }) && B.dongCenter('11680', '없는동', rows, DOC.dc).src === 'adm' && B.dongCenter('11680', '신사동', rows, DOC.dc) === null);
check('동 가운데: 읍·면 아래 리는 읍·면으로', B.dongCenter('44200', '배방읍 공수리', { '44200|배방읍': [127, 36.7, 3] }, null).src === 'apt');
const LD = { to: '202610', e: { '가나면': [12, 36, 60, 10, 12, 20, { '임야': [40, 30000, 50000, 80000], '전': [3, null, null, null] }], '다라동': [0, 2, 3, 0, 0, 1, {}] } };
const lr = B.landRows(LD, 1, '');
check('땅 묶음: 1년 거래 있는 곳만 · 지분 비율', eq(lr.map(o => [o.dong, o.n, o.h]), [['가나면', 12, 10]]) && Math.round(lr[0].r * 100) === 83);
check('땅 묶음: 5년 · 지목 거르기', B.landRows(LD, 5, '').length === 2 && B.landRows(LD, 5, '임야').length === 1 && B.jimoks(LD)[0] === '임야');
check('땅 가격 글자(원/㎡ → 만 원)', B.landPrice(50000, 'm') === '5만' && B.landPrice(5000, 'm') === '5,000원' && B.landPrice(null, 'm') === null);
const S0 = { k: 'bld', types: { c: true, g: false }, lb: 'p', bs: 'b', yr: 5, pr: 'p3', ar: '', us: 'o', jm: '', sel: '11680|역삼동' };
const q = B.toQuery(S0, { lat: 37.5, lng: 127.03, zoom: 15 }), back = B.fromQuery(q);
check('주소 왕복', eq([back.k, back.types, back.lb, back.bs, back.yr, back.pr, back.us, back.sel], ['bld', { c: true, g: false }, 'p', 'b', 5, 'p3', 'o', '11680|역삼동']) && /lat=37\.5000/.test(q), q);
check('주소: 이상한 값은 버림', eq([B.fromQuery('k=x&yr=7&pr=zz&sel=<b>').k, B.fromQuery('yr=7').yr, B.fromQuery('pr=zz').pr, B.fromQuery('sel=<b>').sel], ['bld', 3, '', '']));
check('단가 분포: 점 3개부터 · 거래 수만큼 점', B.scatter(L.slice(0, 2), 'm', 'l') === '' && (B.scatter(L, 'm', 'l').match(/<circle/g) || []).length === 5);

/* ---------- ② 화면 규칙 ---------- */
const ui = read('assets/bldmap.js'), core = read('assets/bldmap-core.js'), code = (ui + core).replace(/\/\*[\s\S]*?\*\//g, '');
check('지번·소유자 칸을 읽지 않음(jibun·.j·owner·pnu)', !/jibun|\.j\b|owner|pnu|소유자 이름/i.test(code));
check('위치 안내 문구', (ui.match(/정확한 위치가 아니라 동네 위치예요/g) || []).length >= 3);
check('추정 위치는 점선·약 100m 설명', /추정 위치/.test(ui) && /약 100m/.test(ui) && /dashed/.test(ui));
check('땅: LAND_ENABLED 또는 미리 보기일 때만(머리줄·땅 지도 링크)', /CFG\.LAND_ENABLED === true \|\| lsGet\('jdj_land_preview'\) === '1'/.test(ui) && /if \(landOn\(\) && !el\.querySelector/.test(ui) && /if \(S\.k === 'land' && !landOn\(\)\) S\.k = 'bld'/.test(ui) && /landOn\(\) \? `<a class="ghost"/.test(ui));
const RIVAL = /직방|호갱노노|아실|네이버 ?부동산|리치고|밸류맵|디스코|땅야|부동산플래닛|KB ?부동산|다방|피터팬|랜드북/;
check('다른 회사 이름 없음', !RIVAL.test(ui + core + read('map/index.html')));
check('~요 말투 · 권유 문구 없음', !/습니다|합니다/.test(ui + core) && !/사세요|투자하세요|추천 매물|수익 보장|지금 사야/.test(ui + core));
check('가운데값은 3건부터(한두 건 값이 그대로 드러나지 않게)', /ok\.length >= 3 \? median\(ok\) : null/.test(core));
check('출처·기준 달 표시', /IDX\.src\.trade/.test(ui) && /계약분까지/.test(ui) && /해제 신고 거래는 뺐어요/.test(ui));

/* ---------- ③ 연결 ---------- */
const map = read('map/index.html'), sw = read('sw.js');
const vOf = (s, f) => (new RegExp(f.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '\\?v=(\\d+)').exec(s) || [])[1];
['assets/bldmap-core.js', 'assets/bldmap.js'].forEach(f => {
  const v = vOf(map, '../' + f);
  check(`map/: ${f} 불러옴 · sw.js 미리 저장 판 같음`, !!v && vOf(sw, './' + f) === v, [v, vOf(sw, './' + f)]);
});
check('map/: 머리줄 지도 종류 전환(아파트 | 상가·건물) · 땅 링크는 화면에 박지 않음', /id="kseg"/.test(map) && /href="\.\/\?k=bld"/.test(map) && !/href="[^"]*k=land/.test(map));
check('map/: 상가·건물 모드면 아파트 지도 코드를 돌리지 않음', /if \(window\.JDJ_BMAP && JDJ_BMAP\.isOn\(\)\) \{ JDJ_BMAP\.start\(\); return; \}/.test(map));
check('map/: bldmap 스크립트가 지도 엔진 뒤, 화면 코드 앞', map.indexOf('map-engine.js') < map.indexOf('bldmap-core.js') && map.indexOf('bldmap.js?v') < map.indexOf('JDJ_BMAP.isOn'));
const home = read('index.html');
check('첫 화면: 상가·건물 거래 지도 줄', /class="srow" href="map\/\?k=bld" data-track="home_svc_bmap"/.test(home) && /href="map\/\?k=bld" data-track="home_end_bmap"/.test(home));
const mine = read('mine/index.html');
check('내 집 시세(상가·건물 탭): 지도로 보기 링크(탭이 열렸을 때만 보임)', /id="bmapL"/.test(mine) && /#commSec:not\(\[hidden\]\)\) #bmapL/.test(mine) && /\.\.\/map\/\?k=bld/.test(mine));
const commDirs = fs.readdirSync(path.join(ROOT, 'comm')).filter(d => /^\d{5}$/.test(d));
const noLink = commDirs.filter(d => !/map\/\?k=bld&g=\d{5}" data-track="seo_comm_to_bmap"/.test(read(`comm/${d}/index.html`)));
check('지역별 상가·건물 페이지: 지도로 보기 링크', commDirs.length > 0 && noLink.length === 0 && /map\/\?k=bld" data-track="seo_comm_to_bmap"/.test(read('comm/index.html')), noLink.slice(0, 5));

/* 공장·창고(엔진 표시 비트 4 — 국토교통부 '공장 및 창고 등 매매' 자료, 2026-11-27) */
const IND = B.decode({ g: '11200', to: '202610', d: ['성수동2가'], u: ['공장', '창고시설', '자동차 관련시설', '제2종근린생활'], z: ['준공업'],
  c: [[0, 20261026, 0, 0, 49.9, 4, 277428, 4], [0, 20261020, 3, 0, 30, 1, 20000, 0]], b: [[0, 20260901, 1, 0, 900, 600, 300000, 4 | 1], [0, 20260801, 2, 0, 500, 400, 100000, 4]] });
check('공장·창고 묶음: 표시 비트 4면 용도와 관계없이 공장·창고', IND.map(d => B.useGroup(d)), ['f', 'n', 'f', 'f'].length === 4 && eq(IND.map(d => B.useGroup(d)), ['f', 'n', 'f', 'f']));
check('공장·창고 이름표: 공장·창고·공장 등', eq(IND.map(B.useTag), ['공장', '근린', '창고', '공장 등']), IND.map(B.useTag));
check('용도 고르기에 공장·창고', B.USES.some(u => u.id === 'f' && u.t === '공장·창고'));
check('공장·창고로 거르기', eq(B.filter(IND, { to: '202610', years: 1, use: 'f', types: { c: true, g: true } }).map(d => d.id), ['c0', 'g0', 'g1']));
check('공장·창고 표시는 직거래·지분 판정과 따로(시세 거래 판정 그대로)', eq(IND.map(B.plain), [true, true, false, true]));
check('공장·창고 비트가 있어도 직거래 글자만', B.flagText(5), '직거래');
console.log(`상가·건물·땅 지도 확인: ${pass}개 통과, ${fail}개 실패`);

/* ---------- ④ 화면 캡처(선택) ---------- */
if (process.env.BMAP_SHOTS) shots().then(() => process.exit(fail ? 1 : 0), e => { console.log('  실패: 화면 캡처', e && e.message); process.exit(1); });
else process.exit(fail ? 1 : 0);

async function shots() {
  const { chromium } = require('playwright');
  const http = require('http'), https = require('https');
  const OUT = process.env.BMAP_SHOTS, LOCAL = process.env.BMAP_DATA || '';
  fs.mkdirSync(OUT, { recursive: true });
  const TY = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  const raw = p => new Promise(ok => https.get('https://raw.githubusercontent.com/chrisjangdaejang-ux/jangdaejang-data/gh-pages/' + p, r => { const a = []; r.on('data', c => a.push(c)); r.on('end', () => ok(r.statusCode === 200 ? Buffer.concat(a) : null)); }).on('error', () => ok(null)));
  const srv = http.createServer(async (req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    let file = null, body = null;
    if (u.startsWith('/jangdaejang-calc/')) { file = path.join(ROOT, u.slice('/jangdaejang-calc/'.length)); if (u.endsWith('/')) file = path.join(file, 'index.html'); }
    else if (u.startsWith('/jangdaejang-data/')) {
      const rel = u.slice('/jangdaejang-data/'.length);
      if (LOCAL && rel.startsWith('data/bmap/')) file = path.join(LOCAL, rel.slice('data/bmap/'.length));
      else body = await raw(rel);
    }
    if (file && fs.existsSync(file) && fs.statSync(file).isFile()) body = fs.readFileSync(file);
    if (!body) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TY[path.extname(file || u)] || 'application/octet-stream' }); res.end(body);
  });
  await new Promise(ok => srv.listen(0, ok));
  const base = `http://127.0.0.1:${srv.address().port}/jangdaejang-calc/map/`;
  const browser = await chromium.launch();
  const cases = [
    ['dong', '?k=bld'], ['deal', '?k=bld&lat=37.4988&lng=127.0388&z=16'], ['card', '?k=bld&lat=37.4988&lng=127.0388&z=15&sel=11680%7C역삼동'],
    ['sgg', '?k=bld&lat=37.5400&lng=127.0050&z=11'], ['unit', '?k=bld&lb=p&bs=b&yr=5'], ['land', '?k=land&preview=land&lat=37.37&lng=127.11&z=12'], ['apt', '']];
  for (const [w, h, tag] of [[390, 844, 'm'], [1280, 800, 'pc']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'ko-KR' });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());       // 지도 타일·카카오 SDK·광고·통계는 막음(배경은 회색)
    for (const [name, qs] of cases) {
      const pg = await ctx.newPage(), errs = [];
      pg.on('pageerror', e => errs.push(String(e.message || e)));
      await pg.goto(base + qs, { waitUntil: 'domcontentloaded' });
      await pg.waitForTimeout(name === 'apt' ? 2500 : 3500);
      if (name === 'card' && tag === 'm') await pg.waitForSelector('#bmBack', { timeout: 5000 }).catch(() => {});
      await pg.screenshot({ path: path.join(OUT, `${tag}-${name}.png`) });
      const r = await pg.evaluate(() => {
        const box = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return b.width && b.height ? { l: b.left, t: b.top, r: b.right, b: b.bottom } : null; };
        const hit = (a, b) => a && b && !(a.r <= b.l || a.l >= b.r || a.b <= b.t || a.t >= b.b);
        const attr = box('.leaflet-control-attribution'), zin = box('#zin'), zout = box('#zout'), panel = box('#bmPanel'), leg = box('#legend'), top = box('.mtop');
        const pins = document.querySelectorAll('.jm-b').length;
        return { attr: !!attr, attrHidden: [panel, leg].some(x => hit(attr, x)), zoomHidden: [panel, leg, top].some(x => hit(zin, x) || hit(zout, x)), over: document.documentElement.scrollWidth > innerWidth + 1, pins,
          kseg: [...document.querySelectorAll('#kseg a')].map(a => a.textContent + (a.classList.contains('on') ? '*' : '')).join('|') };
      });
      const label = `${tag} ${name}`;
      if (name !== 'apt') {
        check(`캡처 ${label}: 지도 출처 표시가 가리지 않음`, r.attr && !r.attrHidden, r);
        check(`캡처 ${label}: 확대·축소 단추가 가리지 않음`, !r.zoomHidden, r);
        check(`캡처 ${label}: 말풍선 있음`, r.pins > 0, r);
      }
      check(`캡처 ${label}: 가로 넘침 없음 · 스크립트 오류 없음`, !r.over && !errs.length, [r, errs.slice(0, 3)]);
      check(`캡처 ${label}: 머리줄 전환`, name === 'apt' ? /^아파트\*\|상가·건물/.test(r.kseg) : name === 'land' ? /땅\*/.test(r.kseg) : /상가·건물\*/.test(r.kseg), r.kseg);
      await pg.close();
    }
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(`화면 캡처 확인 뒤: ${pass}개 통과, ${fail}개 실패 → ${OUT}`);
}
