/* 상가·건물·땅 실거래 지도 — map/index.html 이 주소 ?k=bld(상가·건물) · ?k=land(땅)일 때 JDJ_BMAP.start() 로 화면을 넘겨받는다.
   지도 엔진은 assets/map-engine.js(카카오맵, 안 되면 Leaflet), 계산은 assets/bldmap-core.js(JDJ_BMAPC).
   자료: data/bmap/index.json · bmap/{구}.json(엔진 scripts/bldmap.py — 최근 5년, 지번 없음), assets/map-geo.json(구 가운데), assets/dong/{시·도}.json(동 가운데)
   위치: 지번은 받지도 보여 주지도 않음. 거래는 '동네 위치'(동 가운데 둘레)에 모아 두고 "정확한 위치가 아니라 동네 위치예요"라고 적음.
         통건물 중 공개 건축물대장과 한 건물만 맞은 거래만 그 추정 위치(약 100m, 점선)에. 땅은 읍·면·동 묶음 숫자만.
   단계: 확대 11 이하 = 시·군·구 묶음, 12~14 = 동 묶음, 15 이상 = 거래 하나씩(동네 둘레).
   휴대폰: 지도 + 아래 목록 시트(접힘·반·크게). PC(900px 이상): 왼쪽 목록·카드 + 오른쪽 지도.
   머리줄 '아파트 | 상가·건물 | 땅' 전환(#kseg)은 두 모드 모두 이 파일이 꾸밈(땅은 LAND_ENABLED 또는 미리 보기일 때만). */
(function () {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const DATA = JB.DATA + 'data/', SITE = JB.SITE;
  const CFG = window.JDJ_SITE || {};
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const J = u => fetch(u, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  if (/[?&]preview=land(&|$)/.test(location.search)) { try { localStorage.setItem('jdj_land_preview', '1'); } catch (e) {} }
  if (/[?&]preview=off(&|$)/.test(location.search)) { try { localStorage.removeItem('jdj_land_preview'); } catch (e) {} }
  const landOn = () => CFG.LAND_ENABLED === true || lsGet('jdj_land_preview') === '1';

  /* ---------- 머리줄 전환 ---------- */
  function kseg() {
    const el = $('kseg'); if (!el) return;
    const k = new URLSearchParams(location.search).get('k') || '';
    if (landOn() && !el.querySelector('[data-k="land"]')) el.insertAdjacentHTML('beforeend', '<a href="./?k=land" data-k="land" data-track="map_kind_land">땅</a>');
    el.querySelectorAll('a').forEach(a => { const on = (a.dataset.k || '') === (k === 'bld' || k === 'land' ? k : ''); a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kseg); else kseg();

  const BC = window.JDJ_BMAPC;
  if (!BC) return;
  const T = BC.TYPES;

  const CSS = `
body.bm .mwrap{background:#EEF1F4}
.bm-top .row1{max-width:none}
.bm-top .bm-r{display:flex;align-items:center;gap:6px;flex-wrap:wrap;max-width:860px;width:100%;margin:0 auto}
.bm-top .seg button{padding:0 12px}
.bm-top .chip.ty{display:inline-flex;align-items:center;gap:6px}
.bm-top .chip.ty i{width:10px;height:10px;border-radius:50%;flex:none}
.bm-top .chip.ty.on{background:#fff;color:var(--text);border-width:2px}
.bm-top .chip.ty.c.on{border-color:${T.c.color}}.bm-top .chip.ty.g.on{border-color:${T.g.color}}
.bm-top .chip.ty:not(.on) i{opacity:.35}
.bm-top .fil{flex:1 1 100%}
.bm-top .bm-hint{font-size:12.5px;color:var(--sub2);white-space:nowrap}
@media(max-width:420px){.bm-top .seg button{padding:0 10px;font-size:14px}}
/* 말풍선 */
.jm-b.bg{transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:62px;min-height:44px;padding:4px 10px;border-radius:14px;background:#33404F;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.25);line-height:1.25;border:2px solid #fff}
.jm-b.bg b{font-size:12.5px;font-weight:800}.jm-b.bg span{font-size:13.5px;font-weight:800}.jm-b.bg small{font-size:11px;opacity:.92}
.jm-b.bd{transform:translate(-50%,-50%);display:flex;align-items:center;gap:5px;min-height:34px;padding:3px 10px 3px 4px;border-radius:999px;background:#fff;border:2px solid #33404F;box-shadow:0 2px 7px rgba(0,0,0,.2);font-size:12.5px;font-weight:700;color:var(--text)}
.jm-b.bd i{font-style:normal;min-width:24px;height:24px;line-height:24px;border-radius:999px;text-align:center;color:#fff;font-size:12px;font-weight:800;padding:0 6px;background:#33404F}
.jm-b.bd small{font-size:11.5px;color:var(--sub2);font-weight:700}
.jm-b.bd.c{border-color:${T.c.color}}.jm-b.bd.c i{background:${T.c.color}}
.jm-b.bd.g{border-color:${T.g.color}}.jm-b.bd.g i{background:${T.g.color}}
.jm-b.bd.l{border-color:${T.l.color}}.jm-b.bd.l i{background:${T.l.color}}
.jm-b.bd.sel,.jm-b.bg.sel{outline:3px solid rgba(25,31,40,.8);outline-offset:1px}
.jm-b.dl{transform:translate(-50%,calc(-100% - 6px));display:flex;flex-direction:column;align-items:center;min-width:46px;padding:0 0 2px;border-radius:7px;color:#fff;box-shadow:0 1px 5px rgba(0,0,0,.25);line-height:1.2;border:1.5px solid #fff;overflow:visible}
.jm-b.dl em{font-style:normal;font-size:10.5px;font-weight:800;background:#fff;color:var(--bc);border-radius:5px 5px 0 0;width:100%;text-align:center;padding:1px 4px;box-sizing:border-box}
.jm-b.dl b{font-size:13px;font-weight:900;padding:1px 6px 0}.jm-b.dl small{font-size:10.5px;font-weight:700;opacity:.92}
.jm-b.dl::after{content:'';position:absolute;left:50%;bottom:-6px;margin-left:-5px;border:5px solid transparent;border-bottom:0;border-top:6px solid var(--bc)}
.jm-b.dl.c{background:${T.c.color};--bc:${T.c.color}}.jm-b.dl.g{background:${T.g.color};--bc:${T.g.color}}
.jm-b.dl.est{background:#fff;color:${T.g.color};border:2px dashed ${T.g.color}}.jm-b.dl.est em{background:${T.g.color};color:#fff}
.jm-b.dl.sel{outline:3px solid rgba(25,31,40,.8);outline-offset:1px;z-index:5}
.jm-b.dn{transform:translate(-50%,-50%);padding:2px 9px;border-radius:999px;background:rgba(255,255,255,.94);border:1px dashed #8B95A1;color:var(--sub);font-size:11.5px;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,.12);min-height:26px;display:flex;align-items:center}
/* 목록·카드 칸 */
.bm-panel{position:absolute;left:0;right:0;bottom:0;z-index:34;background:#fff;border-radius:18px 18px 0 0;box-shadow:0 -4px 16px rgba(0,0,0,.14);display:flex;flex-direction:column;overscroll-behavior:contain;transition:height .18s}
.bm-panel .grab{flex:none;display:block;width:100%;height:22px;border:0;background:none;cursor:pointer;position:relative}
.bm-panel .grab::before{content:'';position:absolute;left:50%;top:8px;width:40px;height:4px;margin-left:-20px;border-radius:2px;background:#D1D6DB}
.bm-hd{flex:none;padding:0 14px 8px;cursor:pointer}
.bm-hd b{display:block;font-size:16px;font-weight:900;letter-spacing:-.3px;line-height:1.35}
.bm-hd small{display:block;font-size:12.5px;color:var(--sub2);line-height:1.45;margin-top:1px}
.bm-body{flex:1;min-height:0;overflow:auto;padding:0 12px 14px;-webkit-overflow-scrolling:touch}
.bm-sort{display:flex;gap:6px;flex-wrap:wrap;margin:2px 0 6px}
.bm-sort button{font:inherit;font-size:13.5px;font-weight:700;min-height:44px;padding:0 12px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--sub2);cursor:pointer}
.bm-sort button[aria-pressed="true"]{border-color:var(--blue);background:var(--blue-l);color:var(--blue)}
.bm-list{list-style:none;margin:0;padding:0}
.bm-list button{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;align-items:center;width:100%;min-height:56px;padding:8px 8px;border:0;border-bottom:1px solid var(--line2);background:none;text-align:left;font:inherit;color:var(--text);cursor:pointer;border-radius:10px}
.bm-list button:hover,.bm-list button:focus-visible{background:var(--gray2)}
.bm-list .nm b{display:block;font-size:15px;font-weight:800;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bm-list .nm small{display:block;font-size:12.5px;color:var(--sub2);line-height:1.4}
.bm-list .v{font-size:15px;font-weight:900;color:var(--text);white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums}
.bm-list .v small{display:block;font-size:12px;font-weight:700;color:var(--sub2)}
.bm-dots{display:inline-flex;gap:3px;margin-right:5px;vertical-align:1px}.bm-dots i{width:8px;height:8px;border-radius:50%;display:inline-block}
.bm-empty{padding:22px 10px;text-align:center;font-size:14.5px;color:var(--sub);line-height:1.6}
.bm-card h2{margin:2px 0 0;font-size:19px;font-weight:900;letter-spacing:-.4px;line-height:1.35}
.bm-card .sub{margin:2px 0 0;font-size:13.5px;color:var(--sub2)}
.bm-back{border:0;background:none;font:inherit;font-size:14px;font-weight:700;color:var(--blue);min-height:44px;padding:0 4px;cursor:pointer}
.bm-loc{margin:8px 0 0;padding:8px 11px;border-radius:10px;background:#FFF6DB;border:1px solid #F1DFA6;color:#5C4500;font-size:13.5px;font-weight:600;line-height:1.55}
.bm-loc small{display:block;font-weight:500;font-size:12.5px;color:#6B5600}
.bm-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 0}
.bm-stats>div{border:1px solid var(--line2);border-radius:12px;padding:8px 10px}
.bm-stats .k{font-size:12.5px;color:var(--sub2);font-weight:700}
.bm-stats .v{font-size:17px;font-weight:900;margin-top:1px;white-space:nowrap}
.bm-stats .d{font-size:12px;color:var(--sub3);line-height:1.45;margin-top:1px}
.bm-trs{list-style:none;margin:12px 0 0;padding:0;border-top:1px solid var(--line2)}
.bm-trs li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1px 10px;padding:8px 2px;border-bottom:1px solid var(--line2)}
.bm-trs li.foc{background:#FFF1F1;border-radius:8px;padding-left:8px;padding-right:8px}
.bm-trs .a{font-size:14px;font-weight:700;line-height:1.45;min-width:0}
.bm-trs .a i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:0}
.bm-trs .a small{display:block;font-size:12.5px;font-weight:500;color:var(--sub2)}
.bm-trs .p{text-align:right;font-size:15px;font-weight:900;white-space:nowrap}
.bm-trs .p small{display:block;font-size:12px;font-weight:700;color:var(--sub2)}
.bm-tag{display:inline-block;font-size:11px;font-weight:800;border-radius:5px;padding:0 5px;margin-left:4px;line-height:18px;background:var(--gray);color:var(--sub);vertical-align:1px}
.bm-tag.est{background:#E8EEF7;color:${T.g.color}}
.bm-more{display:block;width:100%;margin:8px 0 0;min-height:44px;border:1px solid var(--line);border-radius:12px;background:#fff;font:inherit;font-size:14px;font-weight:700;color:var(--sub);cursor:pointer}
.bm-acts{display:flex;flex-direction:column;gap:8px;margin:12px 0 0}
.bm-acts a,.bm-acts button{display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:12px;font:inherit;font-size:15px;font-weight:800;text-decoration:none;cursor:pointer;padding:0 12px;text-align:center}
.bm-acts a{background:var(--blue);color:#fff;border:0}
.bm-acts a.ghost,.bm-acts button{background:#fff;color:var(--blue);border:1.5px solid var(--blue)}
.bm-sc{margin:10px 0 0;border:1px solid var(--line2);border-radius:12px;padding:0 10px}
.bm-sc summary{min-height:44px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:14px;font-weight:800;cursor:pointer}
.bm-sc summary small{font-size:12px;font-weight:600;color:var(--sub2)}
.bm-sc svg{display:block;margin:4px 0 0}
.bm-src{margin:10px 0 0;font-size:12.5px;color:var(--sub3);line-height:1.6}
.bm-tbl{width:100%;border-collapse:collapse;margin:10px 0 0;font-size:13.5px}
.bm-tbl th,.bm-tbl td{padding:7px 4px;border-bottom:1px solid var(--line2);text-align:left}
.bm-tbl th{font-size:12.5px;color:var(--sub2);font-weight:700}.bm-tbl td.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.bm-toast{position:absolute;left:50%;top:calc(var(--mt) + 54px);transform:translateX(-50%);z-index:60;background:rgba(25,31,40,.88);color:#fff;font-size:13.5px;font-weight:700;border-radius:999px;padding:8px 14px;pointer-events:none}
.legend .bm-lg{display:flex;flex-direction:column;gap:2px}
.legend .bm-lg span{display:flex;align-items:center;gap:6px;white-space:nowrap}
.legend i.bm-dot{width:11px;height:11px;border-radius:50%}
.legend i.bm-est{width:13px;height:11px;border-radius:4px;border:2px dashed ${T.g.color};background:#fff;box-sizing:border-box}
.legend .lgpill .lgdots i{width:7px;height:7px;border-radius:50%}
@media(min-width:1024px){body.bm .mwrap{margin-bottom:0}}
@media(min-width:900px){
  .bm-top .bm-r{max-width:none;margin:0}.bm-top .row1{margin:0;max-width:none}
  .bm-panel{top:var(--mt);right:auto;width:380px;border-radius:0;box-shadow:2px 0 10px rgba(0,0,0,.08);border-right:1px solid var(--line);height:auto!important}
  .bm-panel .grab{display:none}.bm-hd{cursor:default;padding-top:12px}
}`;

  /* ---------- 상태 ---------- */
  const Q = new URLSearchParams(location.search);
  const S = Object.assign(BC.fromQuery(Q), { lv: '', sort: 'n' });
  if (S.k === 'land' && !landOn()) S.k = 'bld';
  let IDX = null, GEO = null, MAP = null, MOVED = false, MT = -1, VIEW = 'list', CARD = null, SHEET = 'peek';
  const FILES = {};            // 구 → {st:'wait'|'ok'|'err', doc, deals}
  const DONG = {};             // 시·도 2자리 → rows | 'wait' | null
  const PINS = new Map();
  const LAND = () => S.k === 'land';
  const sggName = g => ((IDX && IDX.sgg[g]) || {}).n || '';
  const sidoShort = g => String(((IDX && IDX.sgg[g]) || {}).sd || '').replace(/(특별자치도|특별자치시|특별시|광역시|도)$/, '').replace(/^(전라|경상|충청)(남|북)$/, (m, a, b) => a[0] + b) || '';
  const gCenter = g => { const c = GEO && GEO.sgg && GEO.sgg[g]; return Array.isArray(c) ? { lng: c[0], lat: c[1] } : null; };
  const levelOf = z => z <= 11 ? 'sgg' : (LAND() || z <= 14) ? 'dong' : 'deal';
  const unitMode = () => S.lb === 't' ? 'm' : S.lb;       // 카드 단가 칸: 총액 보기일 때는 ㎡당

  /* ---------- 지도 위 안내(ⓘ 칩 — 지도 화면 아파트 모드와 같은 모양) ---------- */
  const INFO_LOC = { c: '동네 위치예요', l: '정확한 위치가 아니라 동네 위치예요',
    t: '정확한 위치가 아니라 동네 위치예요. 국토교통부는 상가·건물·땅 거래의 지번을 가리거나(통건물·땅) 일부만 공개해요. 그래서 거래를 동네(법정동) 가운데 둘레에 모아 보여 드리고, 지번은 보여 드리지 않아요. 통건물 중 공개 건축물대장과 딱 한 건물만 맞은 거래만 점선 테두리로 추정 위치(약 100m)에 놓았어요.' };
  const INFO_LAND = { c: '동네 묶음이에요', l: '땅은 거래 한 건씩이 아니라 동네 묶음으로 보여 드려요',
    t: '땅은 거래 한 건 한 건을 보여 드리지 않고, 읍·면·동마다 거래 수·지분거래 수·지목별 ㎡당 가격 범위(최근 3년, 거래가 5건보다 적으면 비움)만 보여 드려요. 정확한 위치가 아니라 동네 위치예요.' };
  let ST = null;
  function status(m) {
    const el = $('mstat'); if (!el) return;
    if (m && typeof m === 'object') { if (ST === m) return; ST = m; el.innerHTML = `<button type="button" class="mchip" aria-expanded="false" aria-controls="mpop" aria-label="${esc(m.c)} — 설명 보기"><span class="t">${esc(m.c)}</span><span class="i" aria-hidden="true">ⓘ</span></button>`; return; }
    ST = null; popClose(); el.innerHTML = m ? `<span class="mnote" role="status">${esc(m)}</span>` : '';
  }
  function popOpen() { if (!ST) return; const p = $('mpop'); p.innerHTML = `<b>${esc(ST.c)}</b>${esc(ST.t)}<button type="button" class="x" aria-label="설명 닫기">✕</button>`; p.hidden = false; const b = $('mstat').querySelector('.mchip'); if (b) b.setAttribute('aria-expanded', 'true'); }
  function popClose() { const p = $('mpop'); if (!p || p.hidden) return; p.hidden = true; const b = $('mstat') && $('mstat').querySelector('.mchip'); if (b) b.setAttribute('aria-expanded', 'false'); }
  let TT = 0;
  function toast(t) { let el = document.querySelector('.bm-toast'); if (!el) { el = document.createElement('div'); el.className = 'bm-toast'; el.setAttribute('role', 'status'); $('mwrap').appendChild(el); } el.textContent = t; el.hidden = false; clearTimeout(TT); TT = setTimeout(() => { el.hidden = true; }, 2200); }

  /* ---------- 화면 뼈대 ---------- */
  function shell() {
    const st = document.createElement('style'); st.id = 'bmCss'; st.textContent = CSS; document.head.appendChild(st);
    document.body.classList.remove('lay-split'); document.body.classList.add('bm');
    const h1 = document.querySelector('.top h1.badge'); if (h1) h1.textContent = LAND() ? '땅 지도' : '상가·건물 지도';
    document.title = (LAND() ? '땅 실거래 지도' : '상가·건물 실거래 지도') + ' | ' + (CFG.SITE_NAME || '집예보');
    $('mwrap').innerHTML = `<div id="map" role="application" aria-label="${LAND() ? '땅 거래 지도' : '상가·건물 거래 지도'}"></div>
  <div class="mtop bm-top"><div class="bm-r" id="bmR1"></div><div class="row1"><div class="fil" id="fil" data-chiprow="필터 더보기"></div></div></div>
  <div class="mside">
    <button type="button" class="fab" id="zin" aria-label="확대">+</button>
    <button type="button" class="fab" id="zout" aria-label="축소">−</button>
    <button type="button" class="fab" id="me" aria-label="내 위치로"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg></button>
  </div>
  <div class="legend" id="legend"></div>
  <div class="mstat" id="mstat"><span class="mnote">지도를 준비하고 있어요…</span></div>
  <div class="mpop" id="mpop" role="dialog" aria-label="지도 보는 법" hidden></div>
  <section class="bm-panel" id="bmPanel" aria-label="${LAND() ? '땅 거래 목록' : '상가·건물 거래 목록'}"><button type="button" class="grab" id="bmGrab" aria-label="목록 크게·작게 보기"></button><div class="bm-hd" id="bmHd"></div><div class="bm-body" id="bmBody"></div></section>`;
    controls();
    legend();
    bindShell();
  }
  function controls() {
    const seg = (id, items, cur, label) => `<div class="seg" role="group" aria-label="${label}" id="${id}">${items.map(([v, t]) => `<button type="button" data-v="${v}" class="${cur === v ? 'on' : ''}" aria-pressed="${cur === v}">${t}</button>`).join('')}</div>`;
    const sel = (id, opts, cur, label, on) => `<select class="chip${on ? ' on' : ''}" id="${id}" aria-label="${label}">${opts.map(o => `<option value="${esc(o.id)}"${o.id === cur ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`;
    const yrs = BC.YEARS.map(y => ({ id: String(y), t: `최근 ${y}년` }));
    if (LAND()) {
      $('bmR1').innerHTML = seg('bmLb', [['m', '㎡당'], ['p', '3.3㎡당']], S.lb === 'p' ? 'p' : 'm', '가격 단위') + `<span class="bm-hint">동네 묶음 · 지분거래 비율</span>`;
      const jm = [{ id: '', t: '모든 지목' }].concat(landJimoks().map(j => ({ id: j, t: j })));
      $('fil').innerHTML = sel('bmYr', yrs, String(S.yr), '기간', S.yr !== 3) + sel('bmJm', jm, S.jm, '지목', !!S.jm);
    } else {
      $('bmR1').innerHTML = seg('bmLb', [['t', '총액'], ['m', '㎡당'], ['p', '3.3㎡당']], S.lb, '말풍선 값')
        + ['c', 'g'].map(k => `<button type="button" class="chip ty ${k}${S.types[k] ? ' on' : ''}" data-ty="${k}" aria-pressed="${S.types[k]}" title="${T[k].name} 거래 보기·숨기기"><i style="background:${T[k].color}" aria-hidden="true"></i>${T[k].short}</button>`).join('');
      const basis = S.types.g ? seg('bmBs', [['l', '대지 기준'], ['b', '연면적 기준']], S.bs, '통건물 단가·면적 기준') : '';
      $('fil').innerHTML = sel('bmYr', yrs, String(S.yr), '기간', S.yr !== 3) + sel('bmPr', BC.PRICES, S.pr, '거래 금액', !!S.pr)
        + sel('bmAr', BC.AREAS, S.ar, S.types.g ? '면적(구분상가 전용·통건물 고른 기준)' : '전용면적', !!S.ar) + sel('bmUs', BC.USES, S.us, '건물 용도', !!S.us) + basis;
    }
  }
  function landJimoks() { const c = {}; Object.keys(FILES).forEach(g => { const f = FILES[g]; if (f.st === 'ok' && f.doc.l) BC.jimoks(f.doc.l).forEach((j, i) => { c[j] = (c[j] || 0) + (10 - Math.min(9, i)); }); });
    const base = ['대', '전', '답', '임야', '잡종지', '공장용지']; base.forEach(j => { c[j] = c[j] || 0.5; }); if (S.jm) c[S.jm] = c[S.jm] || 1;
    return Object.keys(c).sort((a, b) => c[b] - c[a]).slice(0, 12); }
  /** 공장·창고 등 매매 자료가 있는지(목록 index 의 f 건수) */
  const hasInd = () => !!(IDX && IDX.sgg && Object.keys(IDX.sgg).some(g => IDX.sgg[g] && IDX.sgg[g].f && IDX.sgg[g].f[2]));
  function legend() {
    const el = $('legend'); if (!el) return;
    const mob = innerWidth <= 768;
    const items = LAND() ? [`<span><i class="bm-dot" style="background:${T.l.color}"></i>땅 거래(읍·면·동 묶음)</span>`]
      : [S.types.c ? `<span><i class="bm-dot" style="background:${T.c.color}"></i>구분상가·사무실</span>` : '', S.types.g ? `<span><i class="bm-dot" style="background:${T.g.color}"></i>통건물</span>` : '',
         S.types.g ? '<span><i class="bm-est"></i>점선 = 통건물 추정 위치(약 100m)</span>' : '',
         hasInd() ? '<span class="sm">이름표 공장·창고 = 공장·창고 거래(건물 용도에서 따로 고를 수 있어요)</span>' : ''].filter(Boolean);
    const body = `<div class="bm-lg">${items.join('')}<span class="sm">숫자 = 거래 건수 · 동네 위치예요(정확한 위치 아님)</span></div>`;
    if (mob && !LGM) {
      const dots = (LAND() ? [T.l.color] : ['c', 'g'].filter(k => S.types[k]).map(k => T[k].color)).map(c => `<i style="background:${c}"></i>`).join('');
      el.className = 'legend mob fold';
      el.innerHTML = `<button type="button" class="lgpill" aria-expanded="false" aria-label="지도 기호 설명 펼치기"><span class="lgdots" aria-hidden="true">${dots}</span>기호 설명</button>`;
    } else {
      el.className = 'legend' + (mob ? ' mob' : '');
      el.innerHTML = (mob ? '<div class="lghd"><b>지도 기호 설명</b><button type="button" class="lgx" aria-label="기호 설명 접기">✕</button></div>' : '') + body;
    }
  }
  let LGM = false;

  /* ---------- 칸 크기 → 지도 비키기 ---------- */
  function sheetH() {
    const H = $('mwrap').clientHeight - Math.max(0, MT);
    return SHEET === 'peek' ? 74 : SHEET === 'full' ? Math.round(H * 0.82) : Math.round(H * 0.5);
  }
  let LAYK = '';
  function layout() {
    const top = document.querySelector('.bm-top'), p = $('bmPanel'); if (!top || !p) return;
    const wide = innerWidth >= 900, mt = top.offsetHeight;
    MT = mt;
    if (!wide) p.style.height = sheetH() + 'px'; else p.style.height = '';
    const mb = wide ? 0 : sheetH(), ml = wide ? p.offsetWidth : 0, k = [mt, mb, ml].join('|');
    $('mwrap').style.setProperty('--mt', mt + 'px'); $('mwrap').style.setProperty('--mb', mb + 'px'); $('mwrap').style.setProperty('--ml', ml + 'px');
    p.classList.toggle('peek', !wide && SHEET === 'peek');
    if (k !== LAYK) { LAYK = k; if (MAP) { MAP.relayout(); render(); } }
  }
  function setSheet(s) { SHEET = s; layout(); }

  /* ---------- 자료 ---------- */
  function ensure(gs) {
    let wait = 0;
    gs.slice(0, 40).forEach(g => {
      if (FILES[g]) { if (FILES[g].st === 'wait') wait++; return; }
      FILES[g] = { st: 'wait' }; wait++;
      J(DATA + 'bmap/' + g + '.json').then(doc => {
        FILES[g] = doc ? { st: 'ok', doc, deals: BC.decode(doc) } : { st: 'err' };
        if (doc && LAND() && doc.l) controls();
        render(); if (CARD && CARD.g === g) openCard(CARD);
      });
      const sd = g.slice(0, 2);
      if (!(sd in DONG)) { DONG[sd] = 'wait'; J(SITE + 'assets/dong/' + sd + '.json').then(d => { DONG[sd] = d && d.rows ? d.rows : null; render(); }); }
    });
    return wait;
  }
  const dongRows = g => { const r = DONG[g.slice(0, 2)]; return r && r !== 'wait' ? r : null; };
  /** 구의 동마다 지도 자리 {dong → {lat,lng,src}} — 동 가운데를 못 찾은 동은 구 가운데 둘레(동네 위치) */
  const CEN = {};
  function centers(g, dongs) {
    const f = FILES[g], key = g + '|' + (dongRows(g) ? 1 : 0); let C = CEN[key];
    if (!C) C = CEN[key] = {};
    const gc = gCenter(g); let miss = Object.keys(C).filter(d => C[d].src === 'sgg').length;
    dongs.forEach(d => { if (C[d]) return; const c = BC.dongCenter(g, d, dongRows(g), f && f.doc && f.doc.dc);
      if (c) C[d] = c; else if (gc) { const p = BC.ring(gc, g + d, miss++, Math.max(8, dongs.length), 900); C[d] = { lat: p.lat, lng: p.lng, src: 'sgg' }; } });
    return C;
  }
  function view() { const c = MAP.center(); return { lat: c.lat, lng: c.lng, zoom: MAP.zoom() }; }
  function inB(b, p, pad, minDeg) { const dx = Math.max((b.e - b.w) * pad, minDeg || 0), dy = Math.max((b.n - b.s) * pad, (minDeg || 0) * 0.8); return p.lng >= b.w - dx && p.lng <= b.e + dx && p.lat >= b.s - dy && p.lat <= b.n + dy; }
  /** 화면에 걸친 시·군·구(구 가운데가 화면 둘레 안) — 확대했을 때도 화면 밖 구 가운데까지 넉넉히(구 하나 지름 ≈ 10km) */
  function visibleG(b, pad, minDeg) { return Object.keys((IDX && IDX.sgg) || {}).filter(g => { const c = gCenter(g); return c && inB(b, c, pad, minDeg); }); }
  const fopt = () => ({ types: S.types, years: S.yr, price: S.pr, area: S.ar, use: S.us, basis: S.bs, to: (IDX && IDX.to) || '' });
  function dealsOf(g) { const f = FILES[g]; return f && f.st === 'ok' ? BC.filter(f.deals, Object.assign(fopt(), { to: f.doc.to || IDX.to })) : null; }
  function idxCount(g) {
    const e = IDX.sgg[g] || {}, i = BC.YEARS.indexOf(S.yr);
    if (LAND()) return e.l ? e.l[i] : 0;
    return (S.types.c && e.c ? e.c[i] : 0) + (S.types.g && e.g ? e.g[i] : 0);
  }
  const filtered = () => !LAND() && !!(S.pr || S.ar || S.us);

  /* ---------- 말풍선 ---------- */
  function node(cls, html, tap, aria) {
    const n = document.createElement('div'); n.className = 'jm-n';
    const b = document.createElement('div'); b.className = 'jm-b ' + cls; b.innerHTML = html; b.setAttribute('role', 'button'); b.tabIndex = 0; if (aria) b.setAttribute('aria-label', aria);
    const go = e => { e.stopPropagation(); if (MOVED) return; tap(e); };
    b.addEventListener('click', go); b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); } });
    n.appendChild(b); return n;
  }
  function put(next) {
    for (const [k, p] of PINS) if (!next.has(k)) { p.h.remove(); PINS.delete(k); }
    for (const [k, v] of next) {
      const p = PINS.get(k), sig = v.cls + '|' + v.html;
      if (p && p.sig === sig && p.lat === v.lat && p.lng === v.lng) continue;
      if (p) p.h.remove();
      PINS.set(k, { h: MAP.add(v.lat, v.lng, node(v.cls, v.html, v.tap, v.aria), v.z || 0), sig, lat: v.lat, lng: v.lng });
    }
  }
  /** 겹치는 말풍선 덜기: 앞(중요한 것)부터 자리를 잡고, 이미 잡힌 자리와 겹치면 그 단계에선 숨김(목록에는 그대로) */
  function declutter(arr, w, h) {
    const sz = MAP.size(), kept = [], boxes = [];
    for (const v of arr) {
      const p = MAP.project(v.lat, v.lng); if (p.x < -40 || p.y < -40 || p.x > sz.w + 40 || p.y > sz.h + 40) continue;
      const bw = v.w || w, bh = v.h || h, bx = { l: p.x - bw / 2, r: p.x + bw / 2, t: p.y - bh / 2, b: p.y + bh / 2 };
      if (!v.force && boxes.some(o => !(bx.r < o.l || bx.l > o.r || bx.b < o.t || bx.t > o.b))) continue;
      boxes.push(bx); kept.push(v);
    }
    return kept;
  }
  const typeCls = o => !LAND() ? (o.nk.c >= o.nk.g ? (S.types.c ? 'c' : 'g') : 'g') : 'l';
  const medLabel = (o, k) => { const v = BC.stat(o.list, S.lb, S.bs); return v == null ? '' : BC.shortWon(v); };

  let ROWS = [];
  function render() {
    if (!MAP || !IDX) return;
    const z = MAP.zoom(), lv = levelOf(z), b = MAP.bounds(), next = new Map(), rows = [];
    if (lv !== S.lv) { S.lv = lv; }
    let wait = 0;
    const gs = visibleG(b, lv === 'sgg' ? 0.1 : 0.3, lv === 'sgg' ? 0 : 0.09);
    if (z >= 11) wait = ensure(gs);
    if (lv === 'sgg') {
      const pins = [];
      gs.forEach(g => {
        const c = gCenter(g); if (!inB(b, c, 0)) return; const d = dealsOf(g), n = LAND() ? idxCount(g) : d ? d.length : idxCount(g);
        if (!n) return;
        const med = !LAND() && d && S.lb !== 't' ? BC.stat(d, S.lb, S.bs) : null;
        const sub = med != null ? `<small>${S.lb === 'p' ? '3.3㎡당' : '㎡당'} ${esc(BC.shortWon(med))}</small>` : '';
        rows.push({ g, name: sggName(g), sub: sidoShort(g) + (filtered() && !d ? ' · 금액·면적·용도 조건은 확대하면 반영돼요' : ''), n, v: n.toLocaleString() + '건', num: n, lat: c.lat, lng: c.lng, last: 0, med });
        pins.push({ k: 'G' + g, lat: c.lat, lng: c.lng, cls: 'bg' + (CARD && CARD.g === g && !CARD.dong ? ' sel' : ''), html: `<b>${esc(sggName(g))}</b><span>${n.toLocaleString()}건</span>${sub}`, z: n, tap: () => MAP.setView(c.lat, c.lng, LAND() ? 13 : 13), aria: `${sggName(g)} 거래 ${n}건 — 가까이 보기` });
      });
      pins.sort((a, b2) => b2.z - a.z);
      declutter(pins, 80, 50).forEach(p => next.set(p.k, p));
    } else {
      const pins = [], deal = [];
      gs.forEach(g => {
        const f = FILES[g]; if (!f || f.st !== 'ok') return;
        if (LAND()) {
          const lr = BC.landRows(f.doc.l, S.yr, S.jm); if (!lr.length) return;
          const C = centers(g, lr.map(o => o.dong));
          lr.forEach(o => { const c = C[o.dong]; if (!c) return; const vis = inB(b, c, 0);
            const pj = S.jm ? o.pj[S.jm] : null, pv = pj ? BC.landPrice(pj[2], S.lb === 'p' ? 'p' : 'm') : null;
            if (vis) rows.push({ g, dong: o.dong, name: o.dong, sub: `${sggName(g)} · 지분거래 ${o.h.toLocaleString()}건${o.r != null ? ` (${Math.round(o.r * 100)}%)` : ''}`, n: o.n, v: o.n.toLocaleString() + '건', num: pv ? pj[2] : o.n, lat: c.lat, lng: c.lng, last: 0 });
            if (!inB(b, c, 0.15)) return;
            pins.push({ k: 'D' + g + o.dong, lat: c.lat, lng: c.lng, z: o.n, w: 130, h: 34, cls: 'bd l' + (CARD && CARD.g === g && CARD.dong === o.dong ? ' sel' : ''),
              html: `<i>${o.n.toLocaleString()}</i>${esc(o.dong)}${o.r != null && o.n >= 5 ? ` <small>지분 ${Math.round(o.r * 100)}%</small>` : ''}${pv ? ` <small>${esc(pv)}</small>` : ''}`,
              tap: () => openCard({ g, dong: o.dong }), aria: `${o.dong} 땅 거래 ${o.n}건 — 자세히 보기` });
          });
          return;
        }
        const d = dealsOf(g); if (!d || !d.length) return;
        const groups = BC.byDong(d, S.lb, S.bs), C = centers(g, groups.map(o => o.dong));
        groups.forEach(o => { const c = C[o.dong]; if (!c) return; const vis = inB(b, c, 0);
          const ml = medLabel(o);
          if (vis) rows.push({ g, dong: o.dong, name: o.dong, sub: `${sggName(g)} · ${['c', 'g'].filter(k => S.types[k] && o.nk[k]).map(k => `${T[k].short} ${o.nk[k]}`).join(' · ')}`, n: o.n, v: o.n.toLocaleString() + '건', vs: ml ? `${S.lb === 't' ? '총액' : S.lb === 'p' ? '3.3㎡당' : '㎡당'} 가운데 ${ml}` : '', num: BC.stat(o.list, S.lb, S.bs), lat: c.lat, lng: c.lng, last: o.last, dots: ['c', 'g'].filter(k => o.nk[k]), approx: c.src === 'sgg' });
          if (!inB(b, c, 0.15)) return;
          if (lv === 'dong') {
            pins.push({ k: 'D' + g + o.dong, lat: c.lat, lng: c.lng, z: o.n, w: 120, h: 34, cls: 'bd ' + typeCls(o) + (CARD && CARD.g === g && CARD.dong === o.dong ? ' sel' : ''),
              html: `<i>${o.n.toLocaleString()}</i>${esc(o.dong)}${ml ? ` <small>${esc(ml)}</small>` : ''}`, tap: () => openCard({ g, dong: o.dong }), aria: `${o.dong} 거래 ${o.n}건 — 거래 목록 보기` });
          } else {
            const top = o.list.slice(0, 60);
            pins.push({ k: 'N' + g + o.dong, lat: c.lat, lng: c.lng, z: 1000, force: true, w: 90, h: 26, cls: 'dn', html: `${esc(o.dong)} · 동네 위치 ${o.n > top.length ? `+${(o.n - top.length).toLocaleString()}` : ''}`, tap: () => openCard({ g, dong: o.dong }), aria: `${o.dong} 거래 ${o.n}건 — 거래 목록 보기` });
            top.forEach((x, i) => { const p = x.est ? { lat: x.est.lat, lng: x.est.lng } : BC.ring(c, g + o.dong, i, top.length);
              deal.push({ k: 'T' + g + x.id, lat: p.lat, lng: p.lng, z: 500 - i, w: 60, h: 50, cls: 'dl ' + x.k + (x.est ? ' est' : '') + (CARD && CARD.g === g && CARD.focus === x.id ? ' sel' : ''),
                html: `<em>${esc(BC.useTag(x))}</em><b>${esc(BC.label(x, S.lb, S.bs))}</b><small>${esc(BC.ymShort(x.date))}</small>`, tap: () => openCard({ g, dong: o.dong, focus: x.id }), aria: `${o.dong} ${BC.fmtDate(x.date)} ${T[x.k].short} ${BC.won(x.amt)} — 자세히 보기` }); });
          }
        });
      });
      pins.sort((a, b2) => b2.z - a.z);
      declutter(pins.concat(deal), 100, 30).forEach(p => next.set(p.k, p));
    }
    put(next);
    ROWS = rows;
    if (VIEW === 'list') drawList(lv);
    const loading = wait > 0;
    if (loading) status('거래 자료를 불러오고 있어요…');
    else if (!rows.length) status(z < 10 ? '지도를 확대하면 동네 거래가 보여요' : (gs.length ? '이 화면에는 조건에 맞는 거래가 없어요' : '이 화면에는 거래 자료가 없어요'));
    else status(LAND() ? INFO_LAND : INFO_LOC);
  }

  /* ---------- 목록 ---------- */
  function drawList(lv) {
    const hd = $('bmHd'), body = $('bmBody'); if (!hd || !body) return;
    const total = ROWS.reduce((s, r) => s + r.n, 0), what = LAND() ? '땅' : ['c', 'g'].filter(k => S.types[k]).map(k => T[k].short).join('·');
    const lvT = lv === 'sgg' ? '시·군·구' : '동네';
    hd.innerHTML = `<b>지도에 보이는 ${lvT} ${ROWS.length.toLocaleString()}곳 · 거래 ${total.toLocaleString()}건</b><small>최근 ${S.yr}년 ${esc(what)}${filtered() ? ' · 조건 적용' : ''} · 정확한 위치가 아니라 동네 위치예요</small>`;
    const sorts = [['n', '거래 많은 순']].concat(lv !== 'sgg' && !LAND() ? [['r', '최근 거래 순']] : []).concat(!LAND() && S.lb !== 't' && lv !== 'sgg' ? [['v', (S.lb === 'p' ? '3.3㎡당' : '㎡당') + ' 높은 순']] : []).concat(LAND() && S.jm ? [['v', `${S.jm} ㎡당 높은 순`]] : []).concat([['a', '가나다 순']]);
    if (!sorts.some(s => s[0] === S.sort)) S.sort = 'n';
    const rs = ROWS.slice().sort(S.sort === 'a' ? (a, b) => a.name.localeCompare(b.name, 'ko') : S.sort === 'r' ? (a, b) => b.last - a.last : S.sort === 'v' ? (a, b) => (b.num || -1) - (a.num || -1) : (a, b) => b.n - a.n).slice(0, 200);
    body.innerHTML = (rs.length ? `<div class="bm-sort" role="group" aria-label="목록 순서">${sorts.map(([k, t]) => `<button type="button" data-so="${k}" aria-pressed="${S.sort === k}">${esc(t)}</button>`).join('')}</div>
      <ol class="bm-list">${rs.map((r, i) => `<li><button type="button" data-ri="${i}"><span class="nm"><b>${r.dots ? `<span class="bm-dots" aria-hidden="true">${r.dots.map(k => `<i style="background:${T[k].color}"></i>`).join('')}</span>` : ''}${esc(r.name)}</b><small>${esc(r.sub || '')}${r.approx ? ' · 동 위치 자료가 없어 구 가운데 둘레에 놓았어요' : ''}</small></span><span class="v">${esc(r.v)}${r.vs ? `<small>${esc(r.vs)}</small>` : ''}</span></button></li>`).join('')}</ol>`
      : `<p class="bm-empty">${MAP && MAP.zoom() < 10 ? '지도를 확대하면 동네별 거래가 보여요.' : '이 화면에는 조건에 맞는 거래가 없어요. 지도를 옮기거나 기간·조건을 넓혀 보세요.'}</p>`)
      + `<p class="bm-src">자료: ${esc(LAND() ? IDX.src.land : IDX.src.trade + (IDX.src.ind && hasInd() ? ' · ' + IDX.src.ind : ''))} · ${esc(ymL(LAND() ? IDX.lto || IDX.to : IDX.to))} 계약분까지 · 해제 신고 거래는 뺐어요.</p>`;
    body._rows = rs;
  }
  const ymL = ym => ym ? `${String(ym).slice(0, 4)}년 ${+String(ym).slice(4, 6)}월` : '';

  /* ---------- 카드 ---------- */
  function openCard(o) {
    CARD = o; VIEW = 'card'; S.sel = o.g + '|' + o.dong;
    const f = FILES[o.g];
    const body = $('bmBody'), hd = $('bmHd');
    if (!f || f.st !== 'ok') { ensure([o.g]); hd.innerHTML = '<b>거래를 불러오고 있어요…</b>'; body.innerHTML = ''; if (innerWidth < 900 && SHEET === 'peek') setSheet('half'); return; }
    const gname = `${sidoShort(o.g)} ${sggName(o.g)}`.trim();
    hd.innerHTML = `<b>${esc(o.dong)} ${LAND() ? '땅 거래' : '상가·건물 거래'}</b><small>${esc(gname)} · 최근 ${S.yr}년</small>`;
    const C = centers(o.g, [o.dong]), c = C[o.dong];
    const locNote = `<p class="bm-loc">정확한 위치가 아니라 동네 위치예요.<small>${LAND() ? '땅은 거래 한 건씩이 아니라 읍·면·동 묶음 숫자로만 보여 드려요.' : '지번은 국토교통부가 가리거나 일부만 공개해서 보여 드리지 않아요. 지도의 점은 이 동네 가운데 둘레에 모아 놓은 자리예요.'}${c && c.src === 'sgg' ? ' 이 동은 위치 자료가 없어 구 가운데 둘레에 놓았어요.' : ''}</small></p>`;
    const share = `<button type="button" id="bmShare" data-track="bmap_share">이 동네 거래 공유하기</button>`;
    let html = `<div class="bm-card"><button type="button" class="bm-back" id="bmBack">← 목록으로</button>${locNote}`;
    if (LAND()) {
      const r = BC.landRows(f.doc.l, S.yr, '').find(x => x.dong === o.dong);
      if (!r) html += '<p class="bm-empty">이 기간에는 거래가 없어요.</p>';
      else {
        const un = S.lb === 'p' ? 'p' : 'm';
        html += `<div class="bm-stats"><div><div class="k">최근 ${S.yr}년 땅 거래</div><div class="v">${r.n.toLocaleString()}건</div></div>
          <div><div class="k">그중 지분거래</div><div class="v">${r.h.toLocaleString()}건</div><div class="d">${r.r != null ? `거래의 ${Math.round(r.r * 100)}%` : ''}</div></div></div>`;
        const pj = Object.keys(r.pj);
        if (pj.length) html += `<table class="bm-tbl"><thead><tr><th>지목</th><th class="n">3년 거래</th><th class="n">${un === 'p' ? '3.3㎡당' : '㎡당'} 가운데</th><th class="n">가운데 50% 범위</th></tr></thead><tbody>${pj.map(j => { const v = r.pj[j];
          return `<tr><td>${esc(j)}</td><td class="n">${(v[0] || 0).toLocaleString()}건</td><td class="n">${v[2] != null ? esc(BC.landPrice(v[2], un)) : '자료가 부족해요'}</td><td class="n">${v[1] != null && v[3] != null ? `${esc(BC.landPrice(v[1], un))}~${esc(BC.landPrice(v[3], un))}` : '-'}</td></tr>`; }).join('')}</tbody></table>
          <p class="bm-src">지목별 가격은 최근 3년 일반 거래(지분거래 뺌) 기준이고, 거래가 5건보다 적으면 비워 둬요. 가운데 50% 범위 = 거래를 가격 순으로 줄 세웠을 때 가운데 절반이 들어가는 범위예요.</p>`;
      }
      html += `<div class="bm-acts"><a href="${esc(SITE + 'land/?c=' + encodeURIComponent(o.g) + '&e=' + encodeURIComponent(o.dong))}" data-track="bmap_to_land">이 동네 땅 위험 신호 확인하기 ›</a>${share}</div>
        <p class="bm-src">자료: ${esc(IDX.src.land)} · ${esc(ymL(f.doc.l && f.doc.l.to))} 계약분까지 · 해제 거래는 뺐어요.</p></div>`;
    } else {
      const d = (dealsOf(o.g) || []).filter(x => x.dong === o.dong).sort((a, b) => b.date - a.date || b.amt - a.amt);
      const um = unitMode();
      const box = k => { const l = d.filter(x => x.k === k); if (!S.types[k]) return ''; const m = BC.stat(l, um, S.bs);
        return `<div><div class="k"><span class="bm-dots" aria-hidden="true"><i style="background:${T[k].color}"></i></span>${T[k].name}</div><div class="v">${l.length.toLocaleString()}건</div><div class="d">${m != null ? `${esc(BC.modeName(um, S.bs, k))} 가운데 ${esc(BC.won(Math.round(m)))}` : l.length ? '거래가 적어 가운데값은 보여 드리지 않아요(직거래·지분 거래 뺌, 3건부터)' : '이 기간 거래 없음'}</div></div>`; };
      html += `<div class="bm-stats">${box('c')}${box('g')}</div>`;
      const sc = BC.scatter(d, um, S.bs);
      if (sc) html += `<details class="bm-sc"><summary>단가 분포 보기 <small>${um === 'p' ? '3.3㎡당' : '㎡당'}${S.types.g ? ` · 통건물은 ${S.bs === 'b' ? '연면적' : '대지'} 기준` : ''} · 한 점 = 거래 한 건</small></summary>${sc}<p class="bm-src">직거래·지분 거래는 뺐어요. 위쪽 끝(상위 3%)을 넘는 값은 맨 위 테두리 점으로 모았어요. 색: 보라 = 구분상가·사무실, 남색 = 통건물.</p></details>`;
      const n0 = CARD.more ? d.length : 30, fi = o.focus ? d.findIndex(x => x.id === o.focus) : -1, show = d.slice(0, Math.max(n0, fi + 1));
      html += d.length ? `<ol class="bm-trs" aria-label="거래 목록">${show.map(x => { const up = BC.unitPrice(x, um, S.bs), fl = BC.flagText(x.flag);
          return `<li${x.id === o.focus ? ' class="foc" id="bmFoc"' : ''}><div class="a"><i style="background:${T[x.k].color}" aria-hidden="true"></i>${esc(BC.fmtDate(x.date))} · ${esc(T[x.k].short)} · ${esc(x.use || '용도 정보 없음')}${x.est ? '<span class="bm-tag est">추정 위치</span>' : ''}${fl ? `<span class="bm-tag">${esc(fl)}</span>` : ''}
            <small>${esc(BC.areaText(x))}${x.k === 'c' ? ` · ${x.floor != null ? x.floor + '층' : '층 정보 없음'}` : ''}${x.zone ? ` · ${esc(x.zone)}` : ''}</small></div>
            <div class="p">${esc(BC.won(x.amt))}<small>${up != null ? `${esc(BC.modeName(um, S.bs, x.k))} ${esc(BC.won(Math.round(up)))}` : ''}</small></div></li>`; }).join('')}</ol>${d.length > show.length ? `<button type="button" class="bm-more" id="bmMore">거래 ${(d.length - show.length).toLocaleString()}건 더 보기</button>` : ''}`
        : '<p class="bm-empty">이 조건에 맞는 거래가 없어요. 기간·조건을 넓혀 보세요.</p>';
      const ck = d.filter(x => x.k === 'g').length > d.filter(x => x.k === 'c').length ? 'g' : 'c';
      html += `<div class="bm-acts"><a href="${esc(SITE + 'mine/?t=c&cg=' + encodeURIComponent(o.g) + '&ck=' + ck)}" data-track="bmap_to_comm">${esc(sggName(o.g))} 상가·건물 시세 흐름 보기 ›</a>
        ${landOn() ? `<a class="ghost" href="${esc(SITE + 'map/?k=land&g=' + encodeURIComponent(o.g))}" data-track="bmap_to_landmap">이 동네 땅 거래 보기 ›</a>` : ''}${share}</div>
        <p class="bm-src">자료: ${esc(IDX.src.trade)} · ${esc(ymL(f.doc.to))} 계약분까지 · 해제 신고 거래는 뺐어요. 가운데값은 직거래·지분 거래를 빼고 계산했어요. 단가 = 거래 금액 ÷ 면적(통건물 대지 기준은 건물값이 섞여 있어요).${x0est(d)}</p></div>`;
    }
    body.innerHTML = html; body.scrollTop = 0;
    if (innerWidth < 900 && SHEET === 'peek') setSheet('half');
    const fe = $('bmFoc'); if (fe) fe.scrollIntoView({ block: 'center' });
    render();
  }
  const x0est = d => d.some(x => x.est) ? ' 추정 위치 = 공개 건축물대장(국토교통부 건축HUB)의 대지·연면적·준공 연도가 이 거래와 한 건물만 맞은 자리(약 100m 단위)예요. 실제와 다를 수 있어요.' : '';
  function closeCard() { CARD = null; VIEW = 'list'; S.sel = ''; render(); saveUrl(); }

  async function doShare() {
    const url = location.origin + SITE + 'map/?' + BC.toQuery(S, MAP ? view() : null);
    const title = CARD ? `${sggName(CARD.g)} ${CARD.dong} ${LAND() ? '땅' : '상가·건물'} 거래 지도` : (LAND() ? '땅 실거래 지도' : '상가·건물 실거래 지도');
    try { if (navigator.share) { await navigator.share({ title, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); toast('주소를 복사했어요'); } catch (e) { toast('주소를 복사하지 못했어요'); }
    if (window.jdjStat) jdjStat('feature_use', { feature: 'bmap_share' });
  }
  let SU = 0;
  function saveUrl() { clearTimeout(SU); SU = setTimeout(() => { if (!MAP) return; try { history.replaceState(history.state, '', location.pathname + '?' + BC.toQuery(S, view())); } catch (e) {} }, 400); }

  /* ---------- 누름 ---------- */
  function bindShell() {
    $('bmR1').addEventListener('click', e => {
      const lb = e.target.closest('#bmLb button'); if (lb) { S.lb = lb.dataset.v; controls(); render(); if (CARD) openCard(CARD); saveUrl(); return; }
      const ty = e.target.closest('[data-ty]'); if (ty) { const k = ty.dataset.ty; S.types[k] = !S.types[k]; if (!S.types.c && !S.types.g) S.types[k === 'c' ? 'g' : 'c'] = true; controls(); legend(); render(); if (CARD) openCard(CARD); saveUrl(); }
    });
    $('fil').addEventListener('click', e => { const bs = e.target.closest('#bmBs button'); if (bs) { S.bs = bs.dataset.v; controls(); render(); if (CARD) openCard(CARD); saveUrl(); } });
    $('fil').addEventListener('change', e => {
      const t = e.target, v = t.value;
      if (t.id === 'bmYr') S.yr = +v || 3; else if (t.id === 'bmPr') S.pr = v; else if (t.id === 'bmAr') S.ar = v; else if (t.id === 'bmUs') S.us = v; else if (t.id === 'bmJm') S.jm = v; else return;
      controls(); render(); if (CARD) openCard(CARD); saveUrl();
    });
    $('zin').onclick = () => MAP && MAP.zoomBy(1); $('zout').onclick = () => MAP && MAP.zoomBy(-1);
    $('me').onclick = () => { if (!navigator.geolocation) return toast('이 기기에서는 내 위치를 쓸 수 없어요'); navigator.geolocation.getCurrentPosition(p => MAP && MAP.setView(p.coords.latitude, p.coords.longitude, 15), () => toast('내 위치를 가져오지 못했어요'), { timeout: 8000 }); };
    $('mstat').addEventListener('click', e => { if (!e.target.closest('.mchip')) return; if ($('mpop').hidden) popOpen(); else popClose(); });
    $('mpop').addEventListener('click', e => { if (e.target.closest('.x')) popClose(); });
    $('legend').addEventListener('click', e => { if (e.target.closest('.lgpill')) { LGM = true; legend(); } else if (e.target.closest('.lgx')) { LGM = false; legend(); } });
    document.addEventListener('pointerdown', e => { if ($('mpop') && !$('mpop').hidden && !e.target.closest('#mpop,#mstat')) popClose(); if (LGM && !e.target.closest('#legend')) { LGM = false; legend(); } }, true);
    $('bmGrab').onclick = () => setSheet(SHEET === 'peek' ? 'half' : SHEET === 'half' ? 'full' : 'peek');
    $('bmHd').addEventListener('click', () => { if (innerWidth < 900 && SHEET === 'peek') setSheet('half'); });
    let y0 = null;   // 손가락으로 시트 끌어 올리기·내리기
    const pan = $('bmPanel');
    pan.addEventListener('pointerdown', e => { if (e.target.closest('#bmGrab,#bmHd')) y0 = e.clientY; });
    pan.addEventListener('pointerup', e => { if (y0 == null) return; const dy = e.clientY - y0; y0 = null; if (Math.abs(dy) < 30) return;
      setSheet(dy < 0 ? (SHEET === 'peek' ? 'half' : 'full') : (SHEET === 'full' ? 'half' : 'peek')); });
    $('bmBody').addEventListener('click', e => {
      const so = e.target.closest('[data-so]'); if (so) { S.sort = so.dataset.so; drawList(S.lv); return; }
      const ri = e.target.closest('[data-ri]'); if (ri) { const r = ($('bmBody')._rows || [])[+ri.dataset.ri]; if (!r) return;
        if (!r.dong) { MAP.setView(r.lat, r.lng, 13); return; }
        if (MAP.zoom() < 13) MAP.setView(r.lat, r.lng, 14); else MAP.setView(r.lat, r.lng);
        openCard({ g: r.g, dong: r.dong }); return; }
      if (e.target.closest('#bmBack')) { closeCard(); return; }
      if (e.target.closest('#bmMore')) { CARD.more = true; openCard(CARD); return; }
      if (e.target.closest('#bmShare')) { doShare(); }
    });
    let LW = innerWidth <= 768;
    addEventListener('resize', () => { const w = innerWidth <= 768; if (w !== LW) { LW = w; LGM = false; legend(); } layout(); });
    if (window.ResizeObserver) new ResizeObserver(layout).observe(document.querySelector('.bm-top'));
  }

  /* ---------- 시작 ---------- */
  async function start() {
    shell(); layout();
    const [ix, geo] = await Promise.all([J(DATA + 'bmap/index.json'), J(SITE + 'assets/map-geo.json')]);
    GEO = geo;
    if (!ix || !ix.sgg) { status('상가·건물 지도 자료를 준비하고 있어요. 잠시 뒤 다시 열어 주세요.'); $('bmHd').innerHTML = '<b>지도 자료를 준비하고 있어요</b><small>실거래 자료가 공개되는 대로 이 화면에 보여 드려요.</small>'; return; }
    IDX = ix;
    if (LAND() && !ix.lto) { status('땅 거래 자료를 준비하고 있어요'); }
    const lat = parseFloat(Q.get('lat')), lng = parseFloat(Q.get('lng')), z = parseInt(Q.get('z'), 10);
    const sel = S.sel ? S.sel.split('|') : null;
    const gc = S.g ? gCenter(S.g) : sel ? gCenter(sel[0]) : null;
    const v = isFinite(lat) && isFinite(lng) && lat > 32 && lat < 39.5 && lng > 124 && lng < 132 ? { lat, lng, zoom: isFinite(z) ? Math.max(7, Math.min(19, z)) : 13 }
      : gc ? { lat: gc.lat, lng: gc.lng, zoom: 13 } : { lat: 37.5172, lng: 127.0473, zoom: 13 };
    try { MAP = await window.JDJ_MAPE.create($('map'), v); }
    catch (e) { status('지도를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 열어 주세요.'); return; }
    document.documentElement.dataset.mapEngine = MAP.kind + (MAP.tiles ? ':' + MAP.tiles : '');
    MAP.onIdle(() => { MOVED = false; render(); saveUrl(); });
    MAP.onMoveStart(() => { MOVED = true; });
    MAP.onTap(() => { popClose(); });
    addEventListener('pointerdown', () => { MOVED = false; }, true);
    layout(); render();
    if (sel) openCard({ g: sel[0], dong: sel[1] });
    if (window.jdjStat) jdjStat('feature_use', { feature: LAND() ? 'map_land' : 'map_bld' });
  }
  window.JDJ_BMAP = { start, isOn: () => /^(bld|land)$/.test(new URLSearchParams(location.search).get('k') || '') };
})();
