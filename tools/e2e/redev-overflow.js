/* 재개발 화면 가로 넘침 점검(Playwright): 분담금 계산기(빈 칸·값 넣은 뒤·계산식/민감도 펼침)·구역 페이지·구역 목록·구역 지도(거르기 시트) — 폭 360·390·1280
   실행: node tools/e2e/redev-overflow.js [화면 저장 폴더]
   ZONE_LOCAL=폴더 를 주면 data/redev/zone/ 을 그 폴더 파일로(공개본에 아직 없을 때 — 엔진 redev_detail.py 로컬 결과) · ZONES=구역 id 목록(쉼표) */
'use strict';
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const L = require('./lib'), { start } = require('./server');
const OUT = process.argv[2] || '', LOC = process.env.ZONE_LOCAL || '';
const ZONES = (process.env.ZONES || '11170한남2구역').split(',').filter(Boolean);
(async () => {
  const srv = await start(8797), b = await chromium.launch(), bad = [], errs = [];
  for (const w of [360, 390, 1280]) {
    const m = w < 900, ctx = await b.newContext({ viewport: { width: w, height: m ? 800 : 800 }, isMobile: m, hasTouch: m, locale: 'ko-KR' });
    await L.blockOutside(ctx);
    if (LOC) await ctx.route(/\/jangdaejang-data\/data\/redev\/zone\/(.+)$/, r => { const f = path.join(LOC, decodeURIComponent(r.request().url().split('/redev/zone/')[1].split('?')[0])); fs.existsSync(f) ? r.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(w + ' ' + e.message));
    const chk = async (name, shot) => {
      const o = await p.evaluate(() => { const iw = innerWidth, sw = document.documentElement.scrollWidth;
        /* 가로로 밀어 보는 상자(overflow-x auto·scroll·hidden) 안은 페이지를 넓히지 않음 */
        const inScroll = e => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (/(auto|scroll|hidden)/.test(getComputedStyle(a).overflowX)) return true; return false; };
        const wide = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > iw + 1 || r.left < -1) && getComputedStyle(e).position !== 'fixed' && !e.closest('.ztabs,.chips,#map,.leaflet-container') && !inScroll(e); }).slice(0, 3).map(e => e.tagName + '.' + e.className + '#' + e.id);
        return { sw, iw, wide }; });
      const ok = o.sw <= o.iw && !o.wide.length; console.log((ok ? 'ok  ' : 'FAIL') + ` ${w} ${name} scrollWidth ${o.sw} / ${o.iw}${o.wide.length ? ' 넘친 요소 ' + o.wide.join(', ') : ''}`);
      if (!ok) bad.push(w + ' ' + name);
      if (OUT && shot) await p.screenshot({ path: path.join(OUT, `${shot}-${w}.png`), fullPage: true });
    };
    const go = async u => { await p.goto('http://127.0.0.1:8797/jangdaejang-calc/' + u, { waitUntil: 'load' }); await p.waitForTimeout(2200); };
    await go('villa/calc/?z=' + encodeURIComponent(ZONES[0])); await chk('계산기 빈 칸');
    for (const [k, v] of [['appr', '3억 2,500'], ['ratio', '105.37'], ['mem', '12억 3,450'], ['area', '84.97'], ['buy', '18억 7,650'], ['dep', '5억 5,000'], ['tax', '6,250'], ['loan', '6억'], ['rate', '4.35'], ['months', '96']]) await p.fill('#' + k, v);
    await p.waitForTimeout(1500); await chk('계산기 값 넣음', 'calc-filled');
    await p.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; })); await p.waitForTimeout(300); await chk('계산기 계산식·민감도 펼침', m ? 'calc-open' : '');
    await p.click('#mPrem'); await p.fill('#prem', '15억 5,000'); await p.waitForTimeout(500); await chk('계산기 프리미엄 방식');
    for (const z of ZONES) { await go('villa/z/?id=' + encodeURIComponent(z)); await chk('구역 페이지 ' + z, z === ZONES[0] ? 'zone' : ''); }
    await go('villa/z/'); await chk('구역 목록');
    await go('villa/zone/'); await chk('구역 지도', 'map');
    if (m) { await p.click('#fOpen'); await p.waitForTimeout(500); await chk('구역 지도 거르기 시트', 'map-sheet');
      const top = await p.evaluate(() => Math.round(document.getElementById('map').getBoundingClientRect().top)); console.log(`     ${w} 지도 시작 위치 ${top}px`); }
    await ctx.close();
  }
  console.log(errs.length ? '스크립트 오류 ' + JSON.stringify(errs) : '스크립트 오류 없음');
  console.log(bad.length ? `넘침 ${bad.length}곳` : '넘침 없음');
  await b.close(); srv.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
