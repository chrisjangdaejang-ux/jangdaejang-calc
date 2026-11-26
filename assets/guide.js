/* 집예보 '고민 해결 길잡이' 화면 — 첫 화면 맨 위 입력창(mountTop)과 길잡이 화면 solve/(mountFlow).
   - 켜짐: assets/config.js GUIDE_ENABLED === true, 또는 대표 미리 보기(주소 끝 ?preview=guide 로 한 번 열면 이 기기에서만 · ?preview=off 로 끔).
     꺼져 있으면 어떤 칸·버튼도 만들지 않아요(첫 화면은 예전 '단지 이름으로 물어보기' 그대로).
   - 계산·분류는 assets/guide-core.js, 고민 목록·질문·출처는 assets/guide/scenarios.json, 낱말 사전은 assets/guide/lexicon.json(코드 수정 없이 늘림).
   - 기억: 이미 넣어 둔 값(내 집 마련 계산 jdj_fin · 지역 jdj_region · 달력 jdj_cal · 청약 jdj_cy · 내 집 jdj_myhome · 길잡이 jdj_guide)은 다시 묻지 않아요.
     진행 상태·금액은 이 기기(localStorage jdj_guide)에만 저장해요.
   - 서버로 보내는 것: 고민 종류를 못 알아들은 문장만 — 화면에서 개인정보를 가리고(guide-core mask) 서버에서 한 번 더 가려 익명 집계(gdMiss). 금액·답은 보내지 않아요.
   window.JDJ_GUIDE = { on, load, mountTop, mountFlow } */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const BASE = JB.SITE, DATA = JB.DATA + 'data/', PV = 'jdj_guide_preview', KEY = 'jdj_guide', IN = 'jdj_guide_in';
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
  const jget = k => { try { return JSON.parse(ls.get(k) || 'null'); } catch (e) { return null; } };
  (function () { try { const q = new URLSearchParams(location.search).get('preview'); if (q === 'guide') ls.set(PV, '1'); else if (q === 'off') ls.del(PV); } catch (e) {} })();
  function on() { return !!(root.JDJ_SITE && root.JDJ_SITE.GUIDE_ENABLED === true) || ls.get(PV) === '1'; }
  const preview = () => !(root.JDJ_SITE && root.JDJ_SITE.GUIDE_ENABLED === true) && ls.get(PV) === '1';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const C = () => root.JDJ_GUIDE_CORE;
  const site = () => ((root.JDJ_SITE || {}).SITE_NAME || '').trim() || '집예보';
  const stat = (n, p) => { try { if (root.jdjStat) root.jdjStat('feature_use', Object.assign({ feature: n }, p || {})); } catch (e) {} };

  /* ---------- 자료 ---------- */
  const cache = {};
  const getJ = (k, url) => cache[k] || (cache[k] = fetch(url, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(url); return r.json(); }).catch(e => { delete cache[k]; throw e; }));
  function load() {
    return Promise.all([getJ('sc', BASE + 'assets/guide/scenarios.json?v=1'), getJ('lex', BASE + 'assets/guide/lexicon.json?v=1')])
      .then(([sc, lex]) => Object.assign({}, sc, { lex }));
  }
  const ix = () => getJ('ix', DATA + 'index.json');
  function ctxOf(IX) {
    if (!IX) return { sgg: [], sido: [] };
    const sd = n => (IX.sido || []).find(s => s.name === n) || {};
    return { sgg: Object.keys(IX.sgg || {}).map(c => ({ code: c, name: IX.sgg[c].name, sido: IX.sgg[c].sido, short: sd(IX.sgg[c].sido).short })), sido: (IX.sido || []).map(s => ({ name: s.name, short: s.short, id: s.id })) };
  }
  function regionOf(IX, code) {
    const g = IX && IX.sgg && IX.sgg[code]; if (!g) return null;
    const s = (IX.sido || []).find(x => x.name === g.sido) || {};
    return { code, name: g.name, sido: g.sido, short: s.short || '', sd: s.id || '' };
  }

  /* ---------- 기억(이미 아는 값) ---------- */
  function memory(IX) {
    const m = {}, from = {};
    const put = (k, v, f) => { if (v != null && v !== '' && m[k] == null) { m[k] = v; from[k] = f; } };
    const g = jget(KEY) || {}, gm = g.mem || {};
    Object.keys(gm).forEach(k => put(k, k === 'region' && gm.region && gm.region.code ? regionOf(IX, gm.region.code) : gm[k], '길잡이에 넣은 값'));
    const fin = jget('jdj_fin');
    if (fin) { put('cash', +fin.c > 0 ? +fin.c : null, '내 집 마련 계산'); put('income', +fin.i > 0 ? +fin.i : null, '내 집 마련 계산'); put('debt', fin.d != null && fin.d !== '' ? +fin.d || 0 : null, '내 집 마련 계산'); }
    const rg = jget('jdj_region');
    if (rg && rg.sgg && IX) { const code = Object.keys(IX.sgg).find(c => IX.sgg[c].sido === rg.sido && IX.sgg[c].name === rg.sgg); if (code) put('region', regionOf(IX, code), '고른 지역'); }
    if (rg && rg.sido && rg.sido !== '지역 상관없음') put('csido', rg.sido, '고른 지역');
    const cal = jget('jdj_cal');
    if (cal && cal.h) {
      const hs = Object.keys(cal.h).map(k => cal.h[k]);
      const own = hs.find(h => h.t === 'own' && h.acq), ten = hs.find(h => (h.t === 'jeonse' || h.t === 'wolse') && h.ce);
      if (own) { put('acq', own.acq, '내 부동산 달력'); if (own.rs) put('rs', own.rs, '내 부동산 달력'); if (own.adj) put('adj', own.adj, '내 부동산 달력'); if (own.t2 && own.t2.d) put('newd', own.t2.d, '내 부동산 달력'); }
      if (ten) put('end', ten.ce, '내 부동산 달력');
    }
    const cy = jget('jdj_cy');
    if (cy) { if (cy.birth) put('birth', cy.birth, '청약 가점 계산'); if (typeof cy.married === 'boolean') put('married', cy.married ? 'y' : 'n', '청약 가점 계산'); if (typeof cy.own === 'boolean') put('homeown', cy.own ? 'y' : 'n', '청약 가점 계산'); if (cy.deps != null && cy.deps !== '') put('deps', +cy.deps || 0, '청약 가점 계산'); if (cy.accDate) put('accd', cy.accDate, '청약 가점 계산'); }
    try {
      const M = root.JDJ_MINE, homes = M ? M.parseStore(ls.get(M.STORE_KEY)) : [];
      if (homes && homes[0] && homes[0].apt) put('danji', { sd: homes[0].sd, code: homes[0].code, dong: homes[0].dong, jibun: homes[0].jibun || '', apt: homes[0].apt, band: homes[0].band || '' }, '내 집 시세');
    } catch (e) {}
    return { m, from };
  }
  const MEM_KEEP = ['cash', 'income', 'debt', 'region', 'lrate', 'csido', 'birth', 'married', 'homeown', 'deps', 'accd', 'own'];
  function saveProgress(S) {
    const g = jget(KEY) || {};
    g.mem = g.mem || {};
    MEM_KEEP.forEach(k => { if (S.a[k] != null && S.a[k] !== '') g.mem[k] = k === 'region' ? { code: S.a.region.code } : S.a[k]; });
    g.cur = { s: S.sc.id, a: strip(S.a), si: S.si, t: Date.now(), done: !!S.done };
    ls.set(KEY, JSON.stringify(g));
  }
  const strip = a => { const o = {}; Object.keys(a).forEach(k => { if (k !== 'facts') o[k] = a[k]; }); return o; };
  function resumeInfo(D) {
    const g = jget(KEY); const c = g && g.cur; if (!c || c.done || !c.s || Date.now() - (c.t || 0) > 30 * 864e5) return null;
    const sc = D.sc.find(s => s.id === c.s); return sc ? { sc, cur: c } : null;
  }

  /* ---------- 못 알아들은 문장 ---------- */
  const SENT = new Set();
  function logMiss(text, where) {
    const k = C().mask(text); if (!k || SENT.has(k)) return;
    SENT.add(k);
    const api = (root.JDJ_AGENTS && root.JDJ_AGENTS.api) || ''; if (!api) return;
    try { fetch(api, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'gdMiss', k, g: String(where || '').replace(/[^\w]/g, '').slice(0, 12), pv: preview() ? 1 : 0 }) }).catch(() => {}); } catch (e) {}
  }

  /* ---------- 모양 ---------- */
  const CSS = `
.gtop{margin:16px 20px 0;padding:20px 18px 18px;border-radius:22px;background:linear-gradient(160deg,#F2F6FF 0%,#FFFFFF 70%);border:1.5px solid #C9D8FF;box-shadow:0 4px 18px rgba(37,96,232,.08)}
.gtop .ey{display:inline-block;margin:0 0 6px;font-size:12.5px;font-weight:800;color:#2560E8;background:#E8F0FF;border-radius:999px;padding:3px 10px}
.gtop h2{margin:0;font-size:22px;font-weight:900;letter-spacing:-.5px;line-height:1.35;color:#191F28;word-break:keep-all}
.gtop p.s{margin:6px 0 0;font-size:14.5px;line-height:1.55;color:#4E5968;word-break:keep-all}
.gtop form{display:flex;gap:8px;margin-top:14px}
.gtop input{flex:1;min-width:0;font:inherit;font-size:16.5px;min-height:54px;padding:0 16px;border:2px solid #C9D8FF;border-radius:16px;background:#fff;color:#191F28}
.gtop input:focus{outline:0;border-color:#2560E8;box-shadow:0 0 0 3px rgba(47,107,255,.15)}
.gtop form button{flex:none;font:inherit;font-size:16px;font-weight:800;min-height:54px;padding:0 20px;border:0;border-radius:16px;background:#2560E8;color:#fff;cursor:pointer}
.gtop .msg{margin:10px 0 0;font-size:14.5px;line-height:1.55;color:#3E4754}.gtop .msg:empty{display:none}.gtop .msg.err{color:#C2410C;font-weight:700}
.gchips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.gchips:empty{display:none}
.gchip{font:inherit;font-size:14px;font-weight:700;min-height:44px;padding:6px 14px;border:1.5px solid #D1D6DB;border-radius:999px;background:#fff;color:#3E4754;cursor:pointer;text-align:left;line-height:1.35;text-decoration:none;display:inline-flex;align-items:center}
.gchip:hover,.gchip.on{border-color:#2560E8;color:#1F56E0;background:#F4F7FF}
.gsitq{margin:18px 0 8px;font-size:15.5px;font-weight:800;color:#191F28}
.gsits{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.gsits button{font:inherit;display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:64px;padding:10px 12px;border:1.5px solid #E5E8EB;border-radius:14px;background:#fff;color:#191F28;cursor:pointer;text-align:left}
.gsits button b{font-size:15px;font-weight:800;line-height:1.3;word-break:keep-all}.gsits button small{font-size:12.5px;color:#4E5968;line-height:1.35;word-break:keep-all}
.gsits button[aria-pressed="true"]{border-color:#2560E8;background:#F4F7FF}.gsits button[aria-pressed="true"] b{color:#1F56E0}
.gsits button:hover{border-color:#2560E8}
.glist{display:grid;gap:8px;margin-top:10px}.glist:empty{display:none}
.glist a{display:flex;align-items:center;gap:10px;min-height:56px;padding:10px 14px;border-radius:14px;background:#fff;border:1.5px solid #D6E2FF;color:#191F28;text-decoration:none}
.glist a:hover{border-color:#2560E8}.glist a b{display:block;font-size:15.5px;font-weight:800;line-height:1.4}.glist a small{display:block;font-size:13px;color:#4E5968;margin-top:1px}.glist a .go{margin-left:auto;color:#2560E8;font-weight:800;font-size:20px;flex:none}
.gres{display:flex;align-items:center;gap:10px;margin-top:12px;padding:12px 14px;border-radius:14px;background:#FFF8E6;border:1.5px solid #F2D98B;color:#191F28;text-decoration:none;min-height:52px}
.gres b{font-size:15px}.gres small{display:block;font-size:13px;color:#6B5A1E}.gres .go{margin-left:auto;font-weight:800;color:#8A6D17}
.gpri{margin-top:14px}.gpri>span{display:block;font-size:13.5px;font-weight:800;color:#4E5968;margin-bottom:2px}
@media(max-width:560px){.gsits{grid-template-columns:repeat(2,minmax(0,1fr))}.gsits button{min-height:48px;justify-content:center}.gsits button small{display:none}.gsits button:last-child:nth-child(odd){grid-column:1/-1}.gpri .gchips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin-right:-14px;padding-right:14px}.gpri .gchip{flex:none;white-space:nowrap}.gtop{margin:12px 16px 0;padding:18px 14px 16px}.gtop h2{font-size:20px}.gtop form button{padding:0 16px}}
@media(min-width:1024px){.gtop{margin:20px 0 0}}

.gflow{max-width:640px;margin:0 auto;padding:8px 20px 24px}
.gflow .ghd{display:flex;align-items:center;gap:10px;margin:8px 0 4px}
.gflow .ghd .k{font-size:12.5px;font-weight:800;color:#2560E8;background:#E8F0FF;border-radius:999px;padding:3px 10px;white-space:nowrap}
.gflow h1{margin:6px 0 2px;font-size:24px;font-weight:900;letter-spacing:-.6px;line-height:1.35;word-break:keep-all}
.gflow .gsub{margin:0;font-size:14.5px;color:#4E5968;line-height:1.55}
.gprog{display:flex;align-items:center;gap:10px;margin:16px 0 10px}.gprog .bar{flex:1;height:8px;border-radius:99px;background:#EEF1F5;overflow:hidden}.gprog .bar i{display:block;height:100%;background:#2560E8;border-radius:99px;transition:width .25s}
.gprog b{font-size:14px;font-weight:800;color:#2560E8;white-space:nowrap;font-variant-numeric:tabular-nums}
.gq{margin:0 0 14px;padding:18px 16px;border-radius:18px;background:#fff;border:1.5px solid #E5E8EB}
.gq label.t,.gq .t{display:block;font-size:17.5px;font-weight:800;line-height:1.45;margin:0 0 4px;color:#191F28;word-break:keep-all}
.gq .h{margin:0 0 10px;font-size:13.5px;color:#4E5968;line-height:1.5}
.gq .mem{margin:8px 0 0;font-size:13px;color:#0F7B4F;font-weight:700}
.gq input[type=text],.gq input[type=date],.gq input[type=number],.gq select{font:inherit;font-size:17px;min-height:52px;width:100%;box-sizing:border-box;padding:0 14px;border:1.5px solid #D1D6DB;border-radius:14px;background:#fff;color:#191F28}
.gq input:focus,.gq select:focus{outline:0;border-color:#2560E8;box-shadow:0 0 0 3px rgba(47,107,255,.15)}
.gq .unit{display:flex;align-items:center;gap:8px}.gq .unit span{font-size:16px;font-weight:700;color:#4E5968;white-space:nowrap}
.gq .pre{margin:6px 0 0;font-size:14px;font-weight:800;color:#1F56E0;min-height:20px}
.gq .opts{display:grid;gap:8px}.gq .opts.two{grid-template-columns:1fr 1fr}.gq .opts.three{grid-template-columns:1fr 1fr 1fr}
.gq .opts button{font:inherit;font-size:15.5px;font-weight:700;min-height:52px;padding:8px 14px;border:1.5px solid #D1D6DB;border-radius:14px;background:#fff;color:#3E4754;cursor:pointer;text-align:left;line-height:1.4}
.gq .opts button[aria-pressed="true"]{border-color:#2560E8;background:#F4F7FF;color:#1F56E0}
.gq .row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.gq .dj{display:flex;gap:8px}.gq .dj button{flex:none;font:inherit;font-weight:800;min-height:52px;padding:0 16px;border:0;border-radius:14px;background:#191F28;color:#fff;cursor:pointer}
.gq .djc{display:grid;gap:6px;margin-top:8px}.gq .djc button{font:inherit;text-align:left;min-height:52px;padding:8px 14px;border:1.5px solid #D1D6DB;border-radius:12px;background:#fff;cursor:pointer}.gq .djc button small{display:block;font-size:13px;color:#4E5968}
.gq .djc button[aria-pressed="true"]{border-color:#2560E8;background:#F4F7FF}
.gq .hs{border:1px dashed #C9D8FF;border-radius:14px;padding:12px;margin:0 0 10px;display:grid;gap:8px}.gq .hs b{font-size:15px}.gq .hs .lb{font-size:13px;color:#4E5968;font-weight:700;margin-bottom:-4px}
.gq .add{font:inherit;font-weight:800;min-height:48px;border:1.5px dashed #2560E8;background:#fff;color:#2560E8;border-radius:12px;cursor:pointer;width:100%}
.gnav{display:flex;gap:8px;margin-top:6px}.gnav button{font:inherit;font-size:16.5px;font-weight:800;min-height:56px;border-radius:16px;cursor:pointer}
.gnav .nx{flex:1;border:0;background:#2560E8;color:#fff}.gnav .bk{flex:none;padding:0 18px;border:1.5px solid #D1D6DB;background:#fff;color:#3E4754}
.gerr{margin:8px 0 0;font-size:14.5px;font-weight:700;color:#C2410C}.gerr:empty{display:none}
.gcard{margin:14px 0 0;padding:20px 18px;border-radius:20px;background:#fff;border:2px solid #2560E8;box-shadow:0 6px 22px rgba(37,96,232,.10)}
.gcard .gk{margin:0 0 6px;font-size:12.5px;font-weight:800;color:#fff;background:#2560E8;display:inline-block;border-radius:999px;padding:3px 10px}
.gcard h2{margin:0;font-size:21px;font-weight:900;line-height:1.42;letter-spacing:-.4px;word-break:keep-all}
.gnums{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0 0}
.gnums div{padding:12px 12px;border-radius:14px;background:#F4F7FF}.gnums small{display:block;font-size:13px;color:#4E5968;font-weight:700;line-height:1.4}.gnums b{display:block;font-size:18px;font-weight:900;margin:3px 0 2px;line-height:1.35;word-break:keep-all;font-variant-numeric:tabular-nums}.gnums span{display:block;font-size:12.5px;color:#4E5968;line-height:1.45}
.gtbl{width:100%;border-collapse:collapse;margin:14px 0 0;font-size:14px}.gtbl th,.gtbl td{text-align:left;padding:9px 6px;border-bottom:1px solid #EEF1F5;vertical-align:top;line-height:1.45}.gtbl th{font-size:13px;color:#4E5968}.gtbl tr:first-child td{font-weight:800;color:#1F56E0}
.gref{margin:14px 0 0;padding:14px;border-radius:14px;background:#FBF8EF;border:1px solid #EFE2B8}.gref h3{margin:0 0 6px;font-size:14.5px;font-weight:900;color:#7A5C0F}.gref ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}.gref li{font-size:14px;line-height:1.5}.gref li b{font-weight:900}.gref li small{display:block;font-size:12.5px;color:#6B5A1E}.gref p{margin:8px 0 0;font-size:12.5px;color:#6B5A1E}
.ginfo{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:8px}.ginfo li{font-size:14px;line-height:1.55;padding:10px 12px;border-radius:12px;background:#F7F8FA}
.ginfo .bd{display:inline-block;font-size:11.5px;font-weight:800;border-radius:5px;padding:1px 6px;margin-right:6px;vertical-align:1px}.ginfo .bd.ok{background:#E6F6EE;color:#0F7B4F}.ginfo .bd.no{background:#FFF1E6;color:#B4540A}
.ginfo a{color:#1F56E0;font-weight:700;white-space:nowrap}
.gwarn{margin:14px 0 0}.gwarn h3{margin:0 0 6px;font-size:15px;font-weight:900}.gwarn ul{margin:0;padding-left:20px}.gwarn li{font-size:14.5px;line-height:1.6;color:#3E4754;margin:2px 0}
.gnote{margin:12px 0 0;font-size:13px;color:#4E5968;line-height:1.55}.gnote button{font:inherit;font-size:13px;font-weight:800;color:#2560E8;background:none;border:0;padding:0 2px;cursor:pointer;min-height:32px}
.gsrc{margin:10px 0 0;font-size:13px;color:#4E5968}.gsrc summary{cursor:pointer;font-weight:800;min-height:40px;display:flex;align-items:center}.gsrc ul{margin:0;padding-left:18px}.gsrc li{margin:3px 0;line-height:1.5}.gsrc a{color:#1F56E0}
.gn3{margin:18px 0 0}.gn3 h3{margin:0 0 8px;font-size:17px;font-weight:900}
.gn3 ol{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.gn3 a{display:flex;align-items:center;gap:12px;min-height:62px;padding:12px 16px;border-radius:16px;border:1.5px solid #D6E2FF;background:#fff;color:#191F28;text-decoration:none}
.gn3 a:hover{border-color:#2560E8}.gn3 a.main{background:#2560E8;border-color:#2560E8;color:#fff}.gn3 a.main small{color:#E3EBFF}.gn3 a.main .ic{background:rgba(255,255,255,.2);color:#fff}
.gn3 a .ic{flex:none;width:34px;height:34px;border-radius:10px;background:#E8F0FF;color:#2560E8;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px}
.gn3 a b{display:block;font-size:15.5px;font-weight:800;line-height:1.4}.gn3 a small{display:block;font-size:13px;color:#4E5968;margin-top:1px}.gn3 a .go{margin-left:auto;font-size:20px;font-weight:800;flex:none}
.gdis{margin:18px 0 0;font-size:12.5px;color:#6B7684;line-height:1.55}
.galt{margin:10px 0 0;padding:14px;border-radius:14px;background:#F7F8FA}.galt b{display:block;font-size:15px;margin-bottom:6px}
@media(max-width:420px){.gnums{grid-template-columns:1fr}.gflow{padding:6px 16px 20px}.gflow h1{font-size:21px}.gcard{padding:18px 14px}.gcard h2{font-size:19px}.gq .row2{grid-template-columns:1fr}}
@media(min-width:900px){.gnums{grid-template-columns:repeat(3,1fr)}}`;
  function css() { if (document.getElementById('gdCss')) return; const s = document.createElement('style'); s.id = 'gdCss'; s.textContent = CSS; document.head.appendChild(s); }

  const solveUrl = (id, extra) => BASE + 'solve/?s=' + encodeURIComponent(id) + (extra || '');

  /* ---------- 첫 화면 맨 위 ---------- */
  const EXAMPLES = ['전세 만기 어떡하죠?', '3억 있는데 얼마짜리 집 살 수 있어요?', '일시적 2주택 언제까지 팔아야 해요?'];
  function mountTop(el, opt) {
    if (!el || !on()) return false;
    opt = opt || {}; css();
    const ask = document.getElementById('askBox'); if (ask && opt.hideAsk !== false) ask.hidden = true;   // 단지 이름 물어보기와 하나로(단지 이름도 이 칸에서)
    load().then(D => {
      const R = resumeInfo(D);
      el.classList.add('gtop');
      el.innerHTML = `<span class="ey">고민 해결 길잡이</span><h2>무엇이 고민이세요?</h2>
        <p class="s">문장 그대로 적으면 ${esc(site())}가 내 조건으로 계산해 해법과 다음 단계까지 안내해 드려요. 단지 이름을 넣으면 시세와 점수를 보여 드려요.</p>
        <form role="search" novalidate><label for="gdQ" style="position:absolute;left:-9999px">고민 입력</label>
          <input id="gdQ" type="search" enterkeyhint="search" autocomplete="off" placeholder="예: ${esc(EXAMPLES[0])}"><button type="submit">찾아보기</button></form>
        <div class="msg" role="status" aria-live="polite"></div><div class="gchips galts"></div>
        ${R ? `<a class="gres" href="${esc(solveUrl(R.sc.id, '&resume=1'))}" data-track="guide_resume"><span><b>이어서 하기: ${esc(R.sc.t)}</b><small>지난번 답이 이 기기에 남아 있어요</small></span><span class="go">›</span></a>` : ''}
        <p class="gsitq">지금 어떤 상황이세요?</p>
        <div class="gsits" role="group" aria-label="상황 고르기">${D.cats.map(c => `<button type="button" data-cat="${esc(c.id)}" aria-pressed="false"><b>${esc(c.t)}</b><small>${esc(c.d)}</small></button>`).join('')}</div>
        <div class="glist" aria-live="polite"></div>
        <div class="gpri"><span>상담에서 가장 많이 받는 고민</span><div class="gchips">${D.sc.filter(s => s.pri).map(s => `<a class="gchip" href="${esc(solveUrl(s.id, '&from=top'))}" data-track="guide_pri_${esc(s.id)}">${esc(s.t)}</a>`).join('')}</div></div>`;
      el.hidden = false;
      const f = el.querySelector('form'), q = el.querySelector('input'), msg = el.querySelector('.msg'), alts = el.querySelector('.galts'), list = el.querySelector('.glist');
      const say = (t, err) => { msg.textContent = t || ''; msg.classList.toggle('err', !!err); };
      el.querySelector('.gsits').addEventListener('click', e => {
        const b = e.target.closest('[data-cat]'); if (!b) return;
        const was = b.getAttribute('aria-pressed') === 'true';
        el.querySelectorAll('.gsits button').forEach(x => x.setAttribute('aria-pressed', 'false'));
        if (was) { list.innerHTML = ''; return; }
        b.setAttribute('aria-pressed', 'true');
        const cat = b.dataset.cat;
        list.innerHTML = D.sc.filter(s => s.cat === cat).map(s => `<a href="${esc(solveUrl(s.id, '&from=sit'))}" data-track="guide_sit_${esc(s.id)}"><span><b>${esc(s.t)}</b><small>${esc(s.sub || '')}</small></span><span class="go">›</span></a>`).join('');
        stat('guide_sit', { cat });
      });
      const go = (id, text, slots) => { try { sessionStorage.setItem(IN, JSON.stringify({ q: text, slots: slots || null, t: Date.now() })); } catch (e) {} location.href = solveUrl(id, '&from=q'); };
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const text = q.value.trim(); alts.innerHTML = '';
        if (text.replace(/\s/g, '').length < 2) { say('고민을 두 글자 이상 적어 주세요. 예: ' + EXAMPLES[1], true); return; }
        const IX = await ix().catch(() => null);
        const r = C().classify(text, D, ctxOf(IX));
        stat('guide_ask', { hit: r.top ? r.top.id : 'none' });
        if (r.top && !r.alts.length) { say(`‘${D.sc.find(s => s.id === r.top.id).t}’ 길잡이로 갈게요…`); go(r.top.id, text, r.slots); return; }
        if (r.top) {
          say('이 중에서 가장 가까운 고민을 골라 주세요.');
          alts.innerHTML = [r.top].concat(r.alts).map(x => { const s = D.sc.find(y => y.id === x.id); return `<button type="button" class="gchip" data-go="${esc(s.id)}">${esc(s.t)}</button>`; }).join('');
          alts.onclick = ev => { const b = ev.target.closest('[data-go]'); if (b) go(b.dataset.go, text, r.slots); };
          return;
        }
        /* 고민 종류를 못 찾으면: 단지 이름인지 먼저(예전 '단지 이름으로 물어보기'와 같은 길) */
        /* 단지 이름 질문은 보통 짧아요(예: '헬리오시티', '은마 래미안대치팰리스 비교'). 긴 문장까지 전국 단지 목록을 뒤지면 느리고 엉뚱한 단지가 걸려요 */
        if (root.JDJ_ASK && root.JDJ_ASK_CORE && root.JDJ_MINE && text.split(/\s+/).length <= 4) {
          say('단지 이름인지 찾아보는 중이에요…');
          let a = null; try { a = await root.JDJ_ASK.ask(text); } catch (x) { a = null; }
          const picks = a && a.segs && (a.skipped || []).length <= 1 ? a.segs.filter(s => s.pick).map(s => s.pick) : [];   // 거의 모든 낱말이 단지 이름으로 풀릴 때만
          if (picks.length) {
            const url = root.JDJ_ASK_CORE.target(picks.map(d => ({ d, band: '' })), a.hint, 'home');
            const nmz = picks.map(d => d.apt).join(', '), lc = nmz.charCodeAt(nmz.length - 1), jo = lc >= 0xAC00 && lc <= 0xD7A3 ? ((lc - 0xAC00) % 28 ? '을' : '를') : '을(를)';
            say(`${nmz}${jo} 찾았어요. 무엇을 볼까요?`);
            const dj = picks[0];
            try { sessionStorage.setItem(IN, JSON.stringify({ q: text, danji: { sd: dj.sd, code: dj.code, dong: dj.dong, jibun: dj.jibun, apt: dj.apt }, t: Date.now() })); } catch (x) {}
            alts.innerHTML = `<a class="gchip" href="${esc(url)}" data-track="guide_danji_view">${picks.length > 1 ? '나란히 비교하기' : '시세·점수 보기'}</a>`
              + ['buy_when', 'high_bargain', 'sell_when'].map(id => { const s = D.sc.find(y => y.id === id); return `<a class="gchip" href="${esc(solveUrl(id, '&from=danji'))}">${esc(s.t)}</a>`; }).join('');
            return;
          }
          if (a && a.segs && (a.skipped || []).length <= 1 && a.segs.some(s => s.cands && s.cands.length)) { say('단지 후보가 여러 곳이에요. 아래 단지 이름으로 물어보기 칸에서 골라 주세요.'); const ab = document.getElementById('askBox'); if (ab) { ab.hidden = false; if (root.JDJ_ASK && ab.querySelector('input')) { ab.querySelector('input').value = text; ab.querySelector('form').requestSubmit && ab.querySelector('form').requestSubmit(); } } return; }
        }
        logMiss(text, 'home');
        say(`‘${text.length > 30 ? text.slice(0, 30) + '…' : text}’는 아직 잘 모르겠어요. 위의 ‘지금 어떤 상황이세요?’에서 가장 가까운 것을 골라 주세요. 남겨 주신 고민은 길잡이를 늘리는 데 써요(개인정보는 가리고 저장해요).`, true);
        if (r.alts.length) alts.innerHTML = r.alts.map(x => { const s = D.sc.find(y => y.id === x.id); return `<a class="gchip" href="${esc(solveUrl(s.id, '&from=weak'))}">혹시 ‘${esc(s.t)}’인가요?</a>`; }).join('');
      });
    }).catch(() => { el.hidden = true; if (ask) ask.hidden = false; });
    return true;
  }

  /* ---------- 길잡이 화면(solve/) ---------- */
  const ENG = () => ({ L: root.JDJ_LOAN, T: root.JDJ_TAX, H: root.JDJ_HUG, CY: root.JDJ_CYE, ADJ: root.JDJ_ADJ, RD: root.JDJ_REDEV });
  const TAXSD = ['서울', '경기', '인천'];
  function taxRegion(rg) {
    if (!rg) return {};
    const sd = TAXSD.indexOf(rg.short) >= 0 ? rg.short : '그 밖의 지역';
    let gu = rg.name;
    if (sd === '경기' && root.JDJ_ADJ && root.JDJ_ADJ.guList('경기').indexOf(gu) < 0) gu = '그 밖의 시·군';
    return { sd, gu: sd === '그 밖의 지역' || sd === '인천' ? '' : gu };
  }
  async function danjiFacts(d, IX) {
    const M = root.JDJ_MINE, P = root.JDJ_PRICE, A = root.JDJ_ASK_CORE, R = root.JDJ_RANK; if (!M || !P || !d) return null;
    try {
      const sg = await P.loadSgg(d.code, d.sd);
      const same = x => x[0] === d.code && x[1] === d.dong && x[2] === d.apt;
      const bands = sg.units.filter(same);
      if (!bands.length) return null;
      const band = d.band && bands.some(u => u[3] === d.band) ? d.band : (A ? A.pickBand({ bands }) : bands[0][3]);
      const u = bands.find(x => x[3] === band && String(x[8]) === String(d.jibun || x[8])) || bands.find(x => x[3] === band);
      const sm = u && u[6] ? M.bandSummary(u, IX.months) : null;
      let f = null;
      if (M.hasScore(u)) { if (u[9] && typeof u[9] === 'object') f = u[9]; else { const us = await P.scoreUnits(d.sd).catch(() => []); const v = us.find(x => M.unitKey(x) === M.unitKey(u)); f = v && v[9] && typeof v[9] === 'object' ? M.cleanFx(v[9]) : null; } }
      const sdo = (IX.sido || []).find(s => s.id === d.sd) || {};
      const MH = await getJ('mh', DATA + 'model_h.json').catch(() => null), tr = R && MH ? R.vcheck(MH, sdo.name) : null;
      const ok = !!(tr && tr.ok);
      return { apt: d.apt, band, price: sm && sm.price || null, at: sm && sm.at, range: sm && sm.range && sm.range.hi ? { lo: sm.range.lo, hi: sm.range.hi, months: sm.range.months } : null,
        fv: ok && f && f.fv != null ? Math.min(99, f.fv) : null, fvBase: `${sdo.short || ''} 아파트`, track: ok ? { n: tr.n, hit: tr.hit } : null,
        mine: R ? R.mineUrl(d.sd, [d.code, d.dong, d.jibun || '', d.apt].join('|'), band) : BASE + 'mine/' };
    } catch (e) { return null; }
  }
  async function cyRows(sidoName) {
    const I = await getJ('cyix', DATA + 'chungyak/index.json').catch(() => null);
    const files = I && I.scores && I.scores.sido ? I.scores.sido.filter(x => (root.JDJ_CYE ? root.JDJ_CYE.sidoNorm(x.n) : x.n) === sidoName) : [];
    const all = await Promise.all(files.map(f => getJ('cys' + f.f, DATA + 'chungyak/scores/' + f.f + '.json').then(j => j.rows || []).catch(() => [])));
    return [].concat.apply([], all);
  }
  async function env(sc, a, IX) {
    const E = Object.assign(ENG(), { IX });
    const need = sc.need || [];
    const jobs = [];
    if (need.indexOf('cy') >= 0 && a.csido) jobs.push(cyRows(a.csido).then(r => { E.cyRows = r; }));
    if (need.indexOf('region') >= 0 && a.region && a.region.sd) jobs.push(getJ('rg' + a.region.sd, DATA + 'region/' + a.region.sd + '.json').then(j => { const g = j && j.gu && j.gu[a.region.code]; E.sup = g && g.sup ? { [a.region.code]: g.sup } : null; }).catch(() => {}));
    if (need.indexOf('base') >= 0) jobs.push(getJ('offi', DATA + 'offi/index.json').then(j => { const s = j && j.rate && j.rate.base; if (s) { const ks = Object.keys(s).filter(k => /^\d{6}$/.test(k)).sort(); if (ks.length) E.base = { v: +s[ks[ks.length - 1]], at: ks[ks.length - 1] }; } }).catch(() => {}));
    await Promise.all(jobs);
    return E;
  }

  /* 칸 하나 그리기 */
  function fieldHtml(id, q, val, IX, S) {
    const memNote = S.from[id] ? `<p class="mem">✓ ${esc(S.from[id])}에서 가져온 값이에요. 바꿔도 돼요.</p>` : '';
    const hint = q.hint ? `<p class="h">${esc(q.hint)}</p>` : '';
    const lid = 'gq_' + id;
    if (q.type === 'money') {
      const v = val != null && val !== '' ? Number(val).toLocaleString('ko-KR') : '';
      return `<div class="gq" data-q="${id}"><label class="t" for="${lid}">${esc(q.t)}</label>${hint}<div class="unit"><input id="${lid}" type="text" inputmode="numeric" autocomplete="off" placeholder="예: 30000 또는 3억" value="${esc(v)}"><span>만 원</span></div><p class="pre" aria-live="polite">${v ? esc(C().won(+val)) : ''}</p>${memNote}</div>`;
    }
    if (q.type === 'num') return `<div class="gq" data-q="${id}"><label class="t" for="${lid}">${esc(q.t)}</label>${hint}<div class="unit"><input id="${lid}" type="number" inputmode="decimal" step="any" value="${esc(val != null ? val : (q.def != null ? q.def : ''))}"><span>${esc(q.unit || '')}</span></div>${memNote}</div>`;
    if (q.type === 'date') return `<div class="gq" data-q="${id}"><label class="t" for="${lid}">${esc(q.t)}</label>${hint}<input id="${lid}" type="date" min="1990-01-01" max="2100-12-31" value="${esc(val || '')}">${memNote}</div>`;
    if (q.type === 'choice' || q.type === 'yesno' || q.type === 'yesno3') {
      const opts = q.type === 'choice' ? q.opts : q.type === 'yesno' ? [['y', '예'], ['n', '아니요']] : [['y', '예'], ['n', '아니요'], ['?', '잘 모르겠어요']];
      const cur = val != null ? val : q.def;
      const cls = q.type === 'yesno' ? 'two' : q.type === 'yesno3' ? 'three' : '';
      return `<div class="gq" data-q="${id}" role="group" aria-labelledby="${lid}"><p class="t" id="${lid}">${esc(q.t)}</p>${hint}<div class="opts ${cls}">${opts.map(o => `<button type="button" data-v="${esc(o[0])}" aria-pressed="${String(cur) === String(o[0])}">${esc(o[1])}</button>`).join('')}</div>${memNote}</div>`;
    }
    if (q.type === 'region' || q.type === 'sido') {
      const sidos = (IX && IX.sido || []).slice().sort((x, y) => (['서울', '경기', '인천'].indexOf(x.short) + 10 || 99) - (['서울', '경기', '인천'].indexOf(y.short) + 10 || 99) || x.name.localeCompare(y.name, 'ko'));
      if (q.type === 'sido') return `<div class="gq" data-q="${id}"><label class="t" for="${lid}">${esc(q.t)}</label>${hint}<select id="${lid}"><option value="">시·도 고르기</option>${sidos.map(s => `<option value="${esc(s.name)}"${val === s.name ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>${memNote}</div>`;
      const sdName = val && val.sido ? val.sido : '';
      return `<div class="gq" data-q="${id}"><p class="t" id="${lid}">${esc(q.t)}</p>${hint}<div class="row2"><select aria-label="시·도" data-r="sd"><option value="">시·도</option>${sidos.map(s => `<option value="${esc(s.name)}"${sdName === s.name ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
        <select aria-label="시·군·구" data-r="g">${guOpts(IX, sdName, val && val.code)}</select></div>${memNote}</div>`;
    }
    if (q.type === 'danji') {
      const nm = val && val.apt ? val.apt : (S.q0 || '');
      return `<div class="gq" data-q="${id}"><label class="t" for="${lid}">${esc(q.t)}</label>${hint}<div class="dj"><input id="${lid}" type="text" autocomplete="off" placeholder="예: 헬리오시티" value="${esc(nm)}"><button type="button" data-dj="find">찾기</button></div>
        <div class="djc" aria-live="polite">${val && val.apt ? `<button type="button" aria-pressed="true">${esc(val.apt)}<small>골랐어요${S.facts && S.facts.price ? ` · 최근 시세 ${esc(C().won(S.facts.price))}` : ''}</small></button>` : ''}</div>${memNote}</div>`;
    }
    if (q.type === 'houses') {
      const L = Array.isArray(val) && val.length ? val : [{}, {}];
      return `<div class="gq" data-q="${id}"><p class="t">${esc(q.t)}</p>${hint}<div class="hsl">${L.map((h, i) => houseHtml(h, i, IX)).join('')}</div>${L.length < 3 ? '<button type="button" class="add" data-hadd="1">집 한 채 더 넣기</button>' : ''}</div>`;
    }
    return '';
  }
  function guOpts(IX, sdName, code) {
    if (!IX || !sdName) return '<option value="">시·군·구</option>';
    const gs = Object.keys(IX.sgg).filter(c => IX.sgg[c].sido === sdName).sort((x, y) => IX.sgg[x].name.localeCompare(IX.sgg[y].name, 'ko'));
    return '<option value="">시·군·구</option>' + gs.map(c => `<option value="${c}"${c === code ? ' selected' : ''}>${esc(IX.sgg[c].name)}</option>`).join('');
  }
  function houseHtml(h, i, IX) {
    const N = 'ABC'[i], sidos = (IX && IX.sido || []);
    return `<div class="hs" data-h="${i}"><b>${N} 집</b>
      <div class="lb">지역</div><div class="row2"><select aria-label="${N} 집 시·도" data-hf="sd"><option value="">시·도</option>${sidos.map(s => `<option value="${esc(s.name)}"${h.region && h.region.sido === s.name ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select><select aria-label="${N} 집 시·군·구" data-hf="g">${guOpts(IX, h.region && h.region.sido, h.region && h.region.code)}</select></div>
      <div class="lb">산 날(잔금일)</div><input type="date" aria-label="${N} 집 산 날" data-hf="acq" value="${esc(h.acq || '')}">
      <div class="row2"><div><div class="lb">산 가격(만 원)</div><input type="text" inputmode="numeric" aria-label="${N} 집 산 가격(만 원)" data-hf="acqp" value="${h.acqp ? Number(h.acqp).toLocaleString('ko-KR') : ''}"></div>
      <div><div class="lb">지금 시세(만 원)</div><input type="text" inputmode="numeric" aria-label="${N} 집 지금 시세(만 원)" data-hf="price" value="${h.price ? Number(h.price).toLocaleString('ko-KR') : ''}"></div></div>
      <div class="lb">공시가격(만 원, 선택 — 종부세 계산)</div><input type="text" inputmode="numeric" aria-label="${N} 집 공시가격(만 원)" data-hf="pub" value="${h.pub ? Number(h.pub).toLocaleString('ko-KR') : ''}"></div>`;
  }
  /* 금액 글자 → 만원: '30000', '3억 5천', '3억', '2,500' */
  function moneyIn(t) {
    t = String(t || '').trim(); if (!t) return null;
    if (/^[\d,]+(\.\d+)?$/.test(t)) return Math.round(parseFloat(t.replace(/,/g, '')));
    const m = C().moneys(t + (/[억천만]$/.test(t) ? '' : '만')); return m.length ? m[0].v : null;
  }

  function mountFlow(el) {
    if (!el) return;
    if (!on()) return false;
    css();
    const qs = new URLSearchParams(location.search), id0 = qs.get('s'), resume = qs.get('resume') === '1';
    Promise.all([load(), ix().catch(() => null)]).then(async ([D, IX]) => {
      let sc = D.sc.find(s => s.id === id0);
      const mem = memory(IX);
      if (!sc) { el.innerHTML = pickHtml(D); el.hidden = false; return; }
      const S = { sc, a: {}, from: {}, si: 0, facts: null, q0: '', done: false };
      /* 1) 이어서 하기 */
      const g = jget(KEY);
      if (resume && g && g.cur && g.cur.s === sc.id) { S.a = Object.assign({}, g.cur.a); S.si = g.cur.si || 0; if (S.a.region && S.a.region.code) S.a.region = regionOf(IX, S.a.region.code); }
      /* 2) 첫 화면에서 넘어온 문장·값 */
      let inp = null; try { inp = JSON.parse(sessionStorage.getItem(IN) || 'null'); sessionStorage.removeItem(IN); } catch (e) {}
      if (inp && Date.now() - (inp.t || 0) < 10 * 60e3) {
        S.q0 = inp.q || '';
        const sl = inp.slots || {}, asks = sc.ask || [];
        Object.keys(sl.money || {}).forEach(k => { const tgt = k === 'price' && asks.indexOf('price') < 0 ? (asks.indexOf('salep') >= 0 ? 'salep' : asks.indexOf('value') >= 0 ? 'value' : asks.indexOf('amt') >= 0 ? 'amt' : asks.indexOf('newprice') >= 0 ? 'newprice' : null) : k; if (tgt && asks.indexOf(tgt) >= 0) { S.a[tgt] = sl.money[k]; S.from[tgt] = '적어 주신 문장'; } });
        if (sl.region) { const tgt = asks.indexOf('region') >= 0 ? 'region' : asks.indexOf('work') >= 0 ? 'work' : null; if (tgt) { S.a[tgt] = regionOf(IX, sl.region.code); S.from[tgt] = '적어 주신 문장'; } }
        if (sl.sido && asks.indexOf('csido') >= 0) { S.a.csido = sl.sido; S.from.csido = '적어 주신 문장'; }
        if (sl.date) { const tgt = ['acq', 'end', 'mdate', 'newd', 'regd'].find(k => asks.indexOf(k) >= 0); if (tgt) { S.a[tgt] = sl.date; S.from[tgt] = '적어 주신 문장'; } }
        if (sl.kids != null && asks.indexOf('kids') >= 0) { S.a.kids = String(Math.min(3, sl.kids)); S.from.kids = '적어 주신 문장'; }
        if (sl.newly && asks.indexOf('newly') >= 0) { S.a.newly = 'y'; S.from.newly = '적어 주신 문장'; }
        if (inp.danji && asks.indexOf('danji') >= 0) { S.a.danji = inp.danji; S.from.danji = '찾은 단지'; }
      }
      /* 3) 기억 */
      (sc.ask || []).forEach(k => { if ((S.a[k] == null || S.a[k] === '') && mem.m[k] != null) { S.a[k] = mem.m[k]; S.from[k] = mem.from[k]; } });
      /* 묻는 칸: 기억·문장으로 채운 칸은 건너뛰고(결과에서 고칠 수 있음), 나머지를 최대 4단계로 */
      const todo = (sc.ask || []).filter(k => S.a[k] == null || S.a[k] === '');
      const per = Math.max(1, Math.ceil(todo.length / 4));
      S.steps = []; for (let i = 0; i < todo.length; i += per) S.steps.push(todo.slice(i, i + per));
      if (S.si > S.steps.length) S.si = S.steps.length;
      if (S.a.danji && !S.facts) S.facts = await danjiFacts(S.a.danji, IX);
      stat('guide_open', { s: sc.id, from: qs.get('from') || '' });
      el.hidden = false;
      render(el, S, D, IX);
    }).catch(() => { el.innerHTML = '<p class="gerr">길잡이 자료를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>'; el.hidden = false; });
    return true;
  }
  function pickHtml(D) {
    return `<div class="gflow"><h1>무엇이 고민이세요?</h1><p class="gsub">가장 가까운 고민을 골라 주세요.</p>${D.cats.map(c => `<p class="gsitq" style="margin:18px 0 6px;font-weight:800">${esc(c.t)}</p><div class="glist">${D.sc.filter(s => s.cat === c.id).map(s => `<a href="${esc(solveUrl(s.id))}"><span><b>${esc(s.t)}</b><small>${esc(s.sub || '')}</small></span><span class="go">›</span></a>`).join('')}</div>`).join('')}</div>`;
  }
  /** 자동으로 채울 수 있는 칸: 조정대상지역(지역 + 날짜) · 시세(단지) · 최우선변제 지역(서울) */
  function autoFill(S) {
    const a = S.a, E = ENG();
    if ((S.sc.ask || []).indexOf('adj') >= 0 && a.adj == null && a.region && a.acq && E.ADJ) {
      const sd = a.region.short === '서울' || a.region.short === '경기' ? a.region.short : '그 밖의 지역';
      const v = E.ADJ.isAdjusted(sd, a.region.name, a.acq); if (v === true || v === false) { a.adj = v ? 'y' : 'n'; S.from.adj = '국토교통부 조정대상지역 공고 이력'; }
    }
    if ((S.sc.ask || []).indexOf('szone') >= 0 && a.szone == null && a.region && /^11/.test(a.region.code)) { a.szone = 'seoul'; S.from.szone = '고른 지역'; }
    if (S.facts && S.facts.price) ['salep', 'kb', 'value'].forEach(k => { if ((S.sc.ask || []).indexOf(k) >= 0 && (a[k] == null || a[k] === '')) { a[k] = S.facts.price; S.from[k] = `${S.facts.apt} 최근 실거래 시세`; } });
  }
  function render(el, S, D, IX) {
    autoFill(S);
    const sc = S.sc, total = S.steps.length;
    while (S.si < total && S.steps[S.si].every(k => S.a[k] != null && S.a[k] !== '' && S.from[k] && /공고|시세|지역/.test(S.from[k]))) S.si++;   // 자동으로 채운 칸만 남은 단계는 건너뜀
    const head = `<div class="ghd"><span class="k">${esc((D.cats.find(c => c.id === sc.cat) || {}).t || '')}</span>${sc.pri ? '<span class="k" style="background:#FBF5E3;color:#7A5C0F">자주 받는 고민</span>' : ''}</div><h1>${esc(sc.t)}</h1><p class="gsub">${esc(sc.sub || '')}</p>`;
    if (S.si < total) {
      const ids = S.steps[S.si];
      el.innerHTML = `<div class="gflow">${head}<div class="gprog"><div class="bar"><i style="width:${Math.round(S.si / total * 100)}%"></i></div><b>${S.si + 1} / ${total}</b></div>
        ${ids.map(k => fieldHtml(k, D.q[k], S.a[k], IX, S)).join('')}
        <p class="gerr" role="alert"></p>
        <div class="gnav">${S.si > 0 ? '<button type="button" class="bk">이전</button>' : ''}<button type="button" class="nx">${S.si === total - 1 ? '해법 보기' : '다음'}</button></div></div>`;
      wire(el, S, D, IX, ids);
      return;
    }
    showResult(el, S, D, IX, head);
  }
  function wire(el, S, D, IX, ids) {
    const err = el.querySelector('.gerr');
    el.querySelectorAll('.gq').forEach(box => {
      const k = box.dataset.q, q = D.q[k];
      if (q.type === 'money') { const i = box.querySelector('input'), pre = box.querySelector('.pre'); i.addEventListener('input', () => { const v = moneyIn(i.value); pre.textContent = v != null ? C().won(v) : ''; }); }
      if (q.type === 'choice' || q.type === 'yesno' || q.type === 'yesno3') box.querySelector('.opts').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; box.querySelectorAll('.opts button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
      if (q.type === 'region') { const sd = box.querySelector('[data-r="sd"]'), g = box.querySelector('[data-r="g"]'); sd.addEventListener('change', () => { g.innerHTML = guOpts(IX, sd.value, ''); }); }
      if (q.type === 'danji') {
        const inp = box.querySelector('input'), list = box.querySelector('.djc'), btn = box.querySelector('[data-dj]');
        let run = 0;
        const find = async () => {
          const t = inp.value.trim(), my = ++run; if (t.length < 2 || !root.JDJ_ASK) { list.innerHTML = '<p class="h">단지 이름을 두 글자 이상 넣어 주세요.</p>'; return; }
          list.innerHTML = '<p class="h">찾는 중이에요…</p>';
          let r = null; try { r = await root.JDJ_ASK.ask(t); } catch (e) { r = null; }
          if (my !== run) return;                                     // 더 새로 누른 찾기가 있으면 이 결과는 버림
          const c = []; (r && r.segs || []).forEach(s => { if (s.pick) c.push(s.pick); else (s.cands || []).forEach(x => c.push(x)); });
          if (!c.length) { list.innerHTML = '<p class="h">찾지 못했어요. 실거래 신고 이름처럼 넣어 보세요(예: 헬리오시티). 건너뛰어도 돼요.</p>'; return; }
          S._cands = c.slice(0, 6);
          list.innerHTML = S._cands.map((d, i) => `<button type="button" data-pick="${i}" aria-pressed="false">${esc(d.apt)}<small>${esc(d.dong)} · 최근 3년 거래 ${Number(d.n || 0).toLocaleString()}건</small></button>`).join('');
        };
        btn.addEventListener('click', find);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); find(); } });
        list.addEventListener('click', async e => {
          const b = e.target.closest('[data-pick]'); if (!b) return;
          list.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          run++;
          const d = S._cands[+b.dataset.pick]; S.a.danji = { sd: d.sd, code: d.code, dong: d.dong, jibun: d.jibun, apt: d.apt }; S.from.danji = '';
          if (!S.a.region && IX) S.a.region = regionOf(IX, d.code);
          b.querySelector('small').textContent = '시세·점수를 불러오는 중이에요…';
          S.facts = await danjiFacts(S.a.danji, IX);
          b.querySelector('small').textContent = S.facts && S.facts.price ? `골랐어요 · 최근 시세 ${C().won(S.facts.price)}` : '골랐어요';
        });
        if (S.q0 && !S.a.danji && root.JDJ_ASK) find();
      }
      if (q.type === 'houses') {
        box.addEventListener('change', e => { const s = e.target.closest('[data-hf="sd"]'); if (s) s.parentNode.querySelector('[data-hf="g"]').innerHTML = guOpts(IX, s.value, ''); });
        const add = box.querySelector('[data-hadd]'); if (add) add.addEventListener('click', () => { const n = box.querySelectorAll('.hs').length; if (n >= 3) return; box.querySelector('.hsl').insertAdjacentHTML('beforeend', houseHtml({}, n, IX)); if (n + 1 >= 3) add.remove(); });
      }
    });
    const read = () => {
      for (const k of ids) {
        const q = D.q[k], box = el.querySelector(`.gq[data-q="${k}"]`); let v = null;
        if (q.type === 'money') { v = moneyIn(box.querySelector('input').value); if (v == null && q.def != null) v = q.def; }
        else if (q.type === 'num') { const t = box.querySelector('input').value; v = t === '' ? (q.def != null ? q.def : null) : +t; }
        else if (q.type === 'date') { v = box.querySelector('input').value || null; if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) v = null; }
        else if (q.type === 'choice' || q.type === 'yesno' || q.type === 'yesno3') { const b = box.querySelector('[aria-pressed="true"]'); v = b ? b.dataset.v : null; }
        else if (q.type === 'sido') v = box.querySelector('select').value || null;
        else if (q.type === 'region') { const c = box.querySelector('[data-r="g"]').value; v = c ? regionOf(IX, c) : null; }
        else if (q.type === 'danji') v = S.a.danji || null;
        else if (q.type === 'houses') {
          v = [...box.querySelectorAll('.hs')].map(h => { const f = n => h.querySelector(`[data-hf="${n}"]`); const c = f('g').value; return { region: c ? regionOf(IX, c) : null, acq: f('acq').value, acqp: moneyIn(f('acqp').value), price: moneyIn(f('price').value), pub: moneyIn(f('pub').value) }; })
            .filter(h => h.acq && h.acqp && h.price);
          if (v.length < 2) { err.textContent = '두 채 이상, 집마다 산 날·산 가격·지금 시세를 넣어 주세요.'; return false; }
        }
        if (v === '?' ) v = null;
        if ((v == null || v === '') && !q.opt && q.type !== 'yesno3') { err.textContent = `‘${q.t}’에 답해 주세요.${q.type === 'danji' ? '' : ''}`; return false; }
        if (q.type === 'yesno3' && !box.querySelector('[aria-pressed="true"]')) { err.textContent = `‘${q.t}’에 답해 주세요. 모르면 ‘잘 모르겠어요’를 골라 주세요.`; return false; }
        S.a[k] = v == null ? (q.type === 'yesno3' ? '?' : '') : v; S.from[k] = '';
      }
      return true;
    };
    el.querySelector('.nx').addEventListener('click', () => { err.textContent = ''; if (!read()) return; S.si++; saveProgress(S); render(el, S, D, IX); window.scrollTo(0, 0); });
    const bk = el.querySelector('.bk'); if (bk) bk.addEventListener('click', () => { S.si = Math.max(0, S.si - 1); render(el, S, D, IX); });
  }

  async function showResult(el, S, D, IX, head) {
    el.innerHTML = `<div class="gflow">${head}<div class="gprog"><div class="bar"><i style="width:100%"></i></div><b>해법</b></div><p class="gsub">숫자를 계산하는 중이에요…</p></div>`;
    const sc = S.sc, a = Object.assign({}, S.a, { facts: S.facts });
    ['adj', 'oa', 'na'].forEach(k => { if (a[k] === '?') a[k] = null; });
    const E = await env(sc, a, IX);
    const r = C().solve(sc, a, E);
    if (r && r.need && r.need.length) {    // 계산에 더 필요한 칸이 있으면 한 단계 더 묻기
      S.steps.push(r.need.filter(k => D.q[k])); render(el, S, D, IX); return;
    }
    if (!r || r.err) { el.querySelector('.gsub').textContent = '계산하지 못했어요. 넣은 값을 한 번 더 확인해 주세요.'; return; }
    S.done = true; saveProgress(S);
    stat('guide_solve', { s: sc.id });
    el.innerHTML = `<div class="gflow">${head}<div class="gprog"><div class="bar"><i style="width:100%"></i></div><b>해법</b></div>
      ${cardHtml(r, D, S)}${next3Html(sc, a, D, r)}${afterHtml(sc, D)}
      <p class="gdis">${esc(site())}는 공공데이터와 법령을 정해진 규칙으로 계산해 보여 드리는 정보 제공 서비스이며, 특정 부동산의 매수·매도를 권유하지 않아요. 세금·법률·대출의 최종 판단은 자격 있는 전문가와 확인해 주세요.</p></div>`;
    el.querySelector('[data-edit]') && el.querySelector('[data-edit]').addEventListener('click', () => { S.si = 0; S.done = false; S.steps = [(sc.ask || []).slice()].reduce((acc, all) => { const per = Math.max(1, Math.ceil(all.length / 4)); for (let i = 0; i < all.length; i += per) acc.push(all.slice(i, i + per)); return acc; }, []); render(el, S, D, IX); window.scrollTo(0, 0); });
    el.querySelectorAll('[data-save]').forEach(x => x.addEventListener('click', () => saveFor(x.dataset.save, S.a)));
  }
  function cardHtml(r, D, S) {
    const nums = (r.nums || []).map(n => `<div><small>${esc(n.k)}</small><b>${esc(n.v)}</b>${n.s ? `<span>${esc(n.s)}</span>` : ''}</div>`).join('');
    const tbl = r.table ? `<table class="gtbl"><thead><tr>${r.table.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${r.table.rows.map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '';
    const ref = r.ref && r.ref.length ? `<div class="gref"><h3>참고 · 과거 성적이 확인된 점수와 실거래 흐름</h3><ul>${r.ref.map(x => `<li><b>${esc(x.k)}: ${esc(x.v)}</b><small>${esc(x.s || '')}</small></li>`).join('')}</ul><p>지난 자료로 계산한 값이에요. 앞으로의 가격을 약속하지 않아요.</p></div>` : '';
    const info = r.info && r.info.length ? `<ul class="ginfo">${r.info.map(x => { const s = D.src[x.src] || {}; return `<li><span class="bd ${x.ok ? 'ok' : 'no'}">${x.ok ? '법령 확인' : '확인 필요'}</span>${esc(x.t)} ${s.url ? `<a href="${esc(srcUrl(s.url))}" target="_blank" rel="noopener">근거 ›</a>` : ''}</li>`; }).join('')}</ul>` : '';
    const memo = Object.keys(S.from).filter(k => S.from[k] && (S.sc.ask || []).indexOf(k) >= 0).map(k => `${LBL[k] || D.q[k].t.replace(/[?？]$/, '').slice(0, 18)} ← ${S.from[k]}`);
    return `<section class="gcard" aria-labelledby="gHead"><span class="gk">해법</span><h2 id="gHead">${esc(r.head)}</h2>
      ${nums ? `<div class="gnums">${nums}</div>` : ''}${tbl}${ref}${info}
      ${r.warn && r.warn.length ? `<div class="gwarn"><h3>손해 피하는 주의점</h3><ul>${r.warn.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
      <p class="gnote">계산에 넣은 값: ${esc(r.note || '')}${memo.length ? `<br>미리 채운 값: ${esc(memo.join(' · '))}` : ''} <button type="button" data-edit="1">값 고치기</button></p>
      <details class="gsrc"><summary>출처 ${(r.src || []).length}개 보기</summary><ul>${(r.src || []).map(k => D.src[k]).filter(Boolean).map(s => `<li><a href="${esc(srcUrl(s.url))}" target="_blank" rel="noopener">${esc(s.nm)}</a></li>`).join('')}</ul></details></section>`;
  }
  const LBL = { danji: '단지', region: '지역', own: '보유 주택', cash: '가진 돈', income: '연 소득', debt: '다른 대출', price: '집값', acq: '산 날', adj: '조정대상지역', rs: '전입일', acqp: '취득가', salep: '팔 가격', newd: '새 집 잔금일', end: '만기일', dep: '보증금', kb: '시세', value: '시가', szone: '지역 구분', csido: '청약 지역', birth: '생년월일', married: '혼인', homeown: '주택 보유', deps: '부양가족', accd: '통장 가입일', work: '직장 지역', kids: '자녀', newly: '신혼', mdate: '이사 날짜', regd: '등록일' };
  const srcUrl = u => /^https?:/.test(u) ? u : BASE + u;
  /* 다음 단계 3개: 값 채운 계산기 · 알림 켜기 · 확인된 전문가(세금·법률·대출) 또는 이사 견적 */
  function expertLink(kind) {
    const SITE = root.JDJ_SITE || {}, nm = { tax: '세무사', legal: '법무사', loan: '대출상담사', redev: '재개발 전문가' }[kind] || '부동산 전문가';
    const c = { tax: 'tax', legal: 'legal', loan: 'loan', redev: 'redev' }[kind] || 'buy';
    if (SITE.COUNSEL_ENABLED === true) return { t: `확인된 ${nm}에게 물어보기`, s: '자격을 확인한 전문가만 답해요', href: BASE + 'counsel/pros/?c=' + c, k: 'pro' };
    return { t: `${nm} 상담 연결`, s: '카카오톡으로 상담을 신청해요', href: 'https://pf.kakao.com/_UxnzuV', k: 'pro', ext: 1 };
  }
  function hrefOf(n, a) {
    if (n.href === '{mine}') return a.facts && a.facts.mine ? a.facts.mine : BASE + 'mine/';
    let h = C().fill(n.href, Object.assign({}, a, { price: a.price || a.newprice || '' }));
    if (n.tax) {
      const tr = taxRegion(a.region), P = [];
      if (n.tax === 'cgt') { if (tr.sd) P.push('sd=' + encodeURIComponent(tr.sd)); if (tr.gu) P.push('gu=' + encodeURIComponent(tr.gu)); if (a.acq) P.push('ad=' + a.acq); if (a.acqp) P.push('ap=' + a.acqp); if (a.salep) P.push('sp=' + a.salep); P.push('hs=1'); if (a.adj === 'y' || a.adj === 'n') P.push('ask=' + a.adj); }
      if (n.tax === 'acq') { if (a.price) P.push('pr=' + a.price); if (tr.sd) P.push('sd=' + encodeURIComponent(tr.sd)); if (tr.gu) P.push('gu=' + encodeURIComponent(tr.gu)); if (a.over85 === 'y') P.push('o85=1'); if (a.own === 'first' || /생애/.test(String(a.own))) P.push('fh=1'); }
      if (n.tax === 'prop') { if (a.pub) P.push('std=' + a.pub); if (a.one) P.push('one=' + a.one); }
      if (P.length) h = h.replace(/#.*$/, '') + '#' + n.tax + ';' + P.join(';');   // 주소 # 뒤에만(서버·통계로 가지 않고 세금 화면이 읽은 뒤 바로 지움)
    }
    return /^https?:/.test(h) ? h : BASE + h;
  }
  function next3Html(sc, a, D, r) {
    const SITE = root.JDJ_SITE || {}, nx = (sc.next || []).filter(n => n.k !== 'move' || SITE.MOVE_ENABLED === true || preview()).map(n => n.k === 'pro' ? Object.assign(expertLink(n.pro), { main: false }) : n);
    const calc = nx.find(n => n.k === 'calc'), alert = nx.find(n => n.k === 'alert'), mv = nx.find(n => n.k === 'move'), pro = sc.expert ? expertLink(sc.expert) : nx.find(n => n.k === 'pro');
    let out = [calc, alert, pro || mv].filter(Boolean);
    nx.forEach(n => { if (out.length < 3 && out.indexOf(n) < 0) out.push(n); });
    out = out.slice(0, 3);
    if (r.expertMain && pro) out = [pro].concat(out.filter(x => x !== pro));
    const IC = { calc: '계', alert: '알', pro: '전', move: '이' }, SUB = { calc: '넣은 값을 채워서 열어요', alert: '놓치기 전에 먼저 알려 드려요', move: '제휴 이사업체 견적을 비교해요' };
    return `<section class="gn3" aria-label="다음 단계"><h3>다음 단계</h3><ol>${out.map((n, i) => `<li><a class="${i === 0 ? 'main' : ''}" href="${esc(n.ext ? n.href : hrefOf(n, a))}"${n.ext ? ' target="_blank" rel="noopener"' : ''}${n.save ? ` data-save="${esc(n.save)}"` : ''} data-track="guide_next_${esc(sc.id)}_${esc(n.k)}"><span class="ic" aria-hidden="true">${IC[n.k] || '›'}</span><span><b>${esc(n.t)}</b><small>${esc(n.s || (n.k === 'calc' && !(n.tax || n.save || /\{/.test(n.href || '')) ? '계산기로 바로 이동해요' : SUB[n.k]) || '')}</small></span><span class="go" aria-hidden="true">›</span></a></li>`).join('')}</ol></section>`;
  }
  /** 값을 채워서 기존 계산기로: 그 계산기가 읽는 이 기기 저장값에 넣음(금액은 이 기기에만) */
  function saveFor(kind, a) {
    if (kind === 'fin') { const cur = jget('jdj_fin') || {}; if (a.income != null) cur.i = +a.income; if (a.cash != null || a.dep != null) cur.c = (+a.cash || 0) + (+a.dep || 0); if (a.debt != null) cur.d = +a.debt || 0; ls.set('jdj_fin', JSON.stringify(cur)); }
    if (kind === 'cy') { const cur = jget('jdj_cy') || {}; if (a.birth) cur.birth = a.birth; if (a.married) cur.married = a.married === 'y'; if (a.homeown) cur.own = a.homeown === 'y'; if (a.deps != null) cur.deps = +a.deps || 0; if (a.accd) cur.accDate = a.accd; ls.set('jdj_cy', JSON.stringify(cur)); }
  }
  function afterHtml(sc, D) {
    const ids = D.sc.filter(s => s.cat === sc.cat && s.id !== sc.id).slice(0, 3);
    if (!ids.length) return '';
    return `<section class="gnx" style="padding:0;margin:22px 0 0"><h2 style="margin:0 0 8px;font-size:17px;font-weight:900">이어서 하면 좋은 것</h2><ol style="list-style:none;margin:0;padding:0;display:grid;gap:8px">${ids.map((s, i) => `<li><a class="gchip" style="display:flex;width:100%;box-sizing:border-box;border-radius:14px;min-height:52px" href="${esc(solveUrl(s.id, '&from=after'))}">${i + 1}. ${esc(s.t)}</a></li>`).join('')}</ol></section>`;
  }

  root.JDJ_GUIDE = { on, load, mountTop, mountFlow, logMiss, memory };
})(typeof window !== 'undefined' ? window : this);
