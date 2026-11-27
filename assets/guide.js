/* 집예보 '고민 해결 길잡이' 화면 — 첫 화면 맨 위 입력창(mountTop)과 길잡이 화면 solve/(mountFlow).
   - 켜짐: assets/config.js GUIDE_ENABLED === true, 또는 대표 미리 보기(주소 끝 ?preview=guide 로 한 번 열면 이 기기에서만 · ?preview=off 로 끔).
     꺼져 있으면 어떤 칸·버튼도 만들지 않아요(첫 화면은 예전 '단지 이름으로 물어보기' 그대로).
   - 계산·분류는 assets/guide-core.js, 고민 목록·질문·출처는 assets/guide/scenarios.json, 낱말 사전은 assets/guide/lexicon.json(코드 수정 없이 늘림).
   - 기억: 이미 넣어 둔 값(내 집 마련 계산 jdj_fin · 지역 jdj_region · 달력 jdj_cal · 청약 jdj_cy · 내 집 jdj_myhome · 길잡이 jdj_guide)은 다시 묻지 않아요.
     진행 상태·금액은 이 기기(localStorage jdj_guide)에만 저장해요.
   - 서버로 보내는 것: 고민 종류를 못 알아들은 문장만 — 화면에서 개인정보를 가리고(guide-core mask) 서버에서 한 번 더 가려 익명 집계(gdMiss). 금액·답은 보내지 않아요.
   - AI 상담(대화창만): assets/config.js AI_ENABLED === true(서버 tools/agent-backend.gs AI_ENABLED 도 함께), 또는 운영자 미리 보기(?preview=ai — 서버가 운영자 카카오 계정만 받아요).
     규칙이 못 알아들었거나 애매할 때만 서버 guideAI 를 불러 '어느 고민인지·문장 속 값·되물을 질문'만 받아요. 숫자는 늘 이 화면의 계산 엔진 결과예요.
     보내는 것: 가린 문장(guide-core aiMask)·최근 대화 몇 줄·지금 고민·이미 아는 칸 이름(값은 안 보냄)·익명 기기 번호. 실패·한도·9초 넘으면 규칙 방식 그대로.
   window.JDJ_GUIDE = { on, load, mountTop, mountFlow } */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const BASE = JB.SITE, DATA = JB.DATA + 'data/', PV = 'jdj_guide_preview', KEY = 'jdj_guide', IN = 'jdj_guide_in';
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
  const jget = k => { try { return JSON.parse(ls.get(k) || 'null'); } catch (e) { return null; } };
  const PVAI = 'jdj_guide_ai', DEVK = 'jdj_gd_dev', AIOFF = 'jdj_gd_ai_off';
  (function () { try { const q = new URLSearchParams(location.search).get('preview'); if (q === 'guide') ls.set(PV, '1'); else if (q === 'ai') { ls.set(PV, '1'); ls.set(PVAI, '1'); ls.del(AIOFF); } else if (q === 'off') { ls.del(PV); ls.del(PVAI); } } catch (e) {} })();
  function on() { return !!(root.JDJ_SITE && root.JDJ_SITE.GUIDE_ENABLED === true) || ls.get(PV) === '1'; }
  const preview = () => !(root.JDJ_SITE && root.JDJ_SITE.GUIDE_ENABLED === true) && ls.get(PV) === '1';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const C = () => root.JDJ_GUIDE_CORE;
  const todayKst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const site = () => ((root.JDJ_SITE || {}).SITE_NAME || '').trim() || '집예보';
  const stat = (n, p) => { try { if (root.jdjStat) root.jdjStat('feature_use', Object.assign({ feature: n }, p || {})); } catch (e) {} };

  /* ---------- 자료 ---------- */
  const cache = {};
  const getJ = (k, url) => cache[k] || (cache[k] = fetch(url, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(url); return r.json(); }).catch(e => { delete cache[k]; throw e; }));
  function load() {
    return Promise.all([getJ('sc', BASE + 'assets/guide/scenarios.json?v=13'), getJ('lex', BASE + 'assets/guide/lexicon.json?v=3')])
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

  /* ---------- AI 상담(대화창 해석기 — 서버 guideAI) ---------- */
  const aiApi = () => (root.JDJ_AGENTS && root.JDJ_AGENTS.api) || '';
  const aiLive = () => !!(root.JDJ_SITE && root.JDJ_SITE.AI_ENABLED === true);
  /** AI 를 불러도 되는지: 켜짐(또는 운영자 미리 보기) + 서버 주소 + 오늘 한도로 멈추지 않음 */
  function aiOn() { return !!aiApi() && (aiLive() || ls.get(PVAI) === '1') && ls.get(AIOFF) !== todayKst(); }
  function devId() {
    let d = ls.get(DEVK); if (d && /^[a-z0-9]{12,40}$/.test(d)) return d;
    try { const b = new Uint8Array(12); root.crypto.getRandomValues(b); d = Array.from(b, x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { d = (Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 24).padEnd(12, '0'); }
    ls.set(DEVK, d); return d;
  }
  /** 서버에 한 번 묻기 → 해석 결과 r 또는 null(실패·한도·시간 초과 — 화면은 규칙 방식 그대로) */
  async function aiAsk(st, log, text, D) {
    if (!aiOn()) return null;
    const body = Object.assign({ action: 'guideAI', dev: devId() }, C().aiReq(st, log, text, D));
    if (!aiLive()) { try { const j = JSON.parse(ls.get('jdj_auth') || 'null'); if (j && /^[0-9a-f]{64}$/.test(String(j.s || ''))) body.s = j.s; } catch (e) {} }   // 미리 보기 동안만 운영자 확인용
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, tm = setTimeout(() => { if (ctl) ctl.abort(); }, 9000);
    try {
      const res = await fetch(aiApi(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined });
      const j = await res.json();
      if (j && j.ok && j.r) { stat('guide_ai', { r: 'ok' }); return j.r; }
      if (j && /^(cap|user|off)$/.test(String(j.code || ''))) ls.set(AIOFF, todayKst());   // 오늘은 더 부르지 않음
      stat('guide_ai', { r: String((j && j.code) || 'err').slice(0, 12) });
      return null;
    } catch (e) { stat('guide_ai', { r: 'timeout' }); return null; } finally { clearTimeout(tm); }
  }
  const AI_OFF_MSG = '죄송해요, 길잡이는 집·부동산 고민(사기·팔기·전월세·청약·세금·대출·재개발·이사)만 도와드려요.';

  /* ---------- 모양 ---------- */
  const CSS = `
.gtop{margin:16px 20px 0;padding:20px 18px 18px;border-radius:22px;background:linear-gradient(160deg,#F2F6FF 0%,#FFFFFF 70%);border:1.5px solid #D4D1F5;box-shadow:0 4px 18px rgba(67,56,202,.08)}
.gtop .ey{display:inline-block;margin:0 0 6px;font-size:12.5px;font-weight:800;color:#4338CA;background:#EEEDFB;border-radius:999px;padding:3px 10px}
.gtop h2{margin:0;font-size:22px;font-weight:900;letter-spacing:-.5px;line-height:1.35;color:#191F28;word-break:keep-all}
.gtop p.s{margin:6px 0 0;font-size:14.5px;line-height:1.55;color:#4E5968;word-break:keep-all}
.gtop form{display:flex;gap:8px;margin-top:14px}
.gtop input{flex:1;min-width:0;font:inherit;font-size:16.5px;min-height:54px;padding:0 16px;border:2px solid #D4D1F5;border-radius:16px;background:#fff;color:#191F28}
.gtop input:focus{outline:0;border-color:#4338CA;box-shadow:0 0 0 3px rgba(67,56,202,.15)}
.gtop form button{flex:none;font:inherit;font-size:16px;font-weight:800;min-height:54px;padding:0 20px;border:0;border-radius:16px;background:#4338CA;color:#fff;cursor:pointer}
.gtop .msg{margin:10px 0 0;font-size:14.5px;line-height:1.55;color:#3E4754}.gtop .msg:empty{display:none}.gtop .msg.err{color:#C2410C;font-weight:700}
.gchips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.gchips:empty{display:none}
.gchip{font:inherit;font-size:14px;font-weight:700;min-height:44px;padding:6px 14px;border:1.5px solid #D1D6DB;border-radius:999px;background:#fff;color:#3E4754;cursor:pointer;text-align:left;line-height:1.35;text-decoration:none;display:inline-flex;align-items:center}
.gchip:hover,.gchip.on{border-color:#4338CA;color:#3730A3;background:#F5F4FD}
.gsitq{margin:18px 0 8px;font-size:15.5px;font-weight:800;color:#191F28}
.gsits{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.gsits button{font:inherit;display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:64px;padding:10px 12px;border:1.5px solid #E5E8EB;border-radius:14px;background:#fff;color:#191F28;cursor:pointer;text-align:left}
.gsits button b{font-size:15px;font-weight:800;line-height:1.3;word-break:keep-all}.gsits button small{font-size:12.5px;color:#4E5968;line-height:1.35;word-break:keep-all}
.gsits button[aria-pressed="true"]{border-color:#4338CA;background:#F5F4FD}.gsits button[aria-pressed="true"] b{color:#3730A3}
.gsits button:hover{border-color:#4338CA}
.glist{display:grid;gap:8px;margin-top:10px}.glist:empty{display:none}
.glist a{display:flex;align-items:center;gap:10px;min-height:56px;padding:10px 14px;border-radius:14px;background:#fff;border:1.5px solid #D4D1F5;color:#191F28;text-decoration:none}
.glist a:hover{border-color:#4338CA}.glist a b{display:block;font-size:15.5px;font-weight:800;line-height:1.4}.glist a small{display:block;font-size:13px;color:#4E5968;margin-top:1px}.glist a .go{margin-left:auto;color:#4338CA;font-weight:800;font-size:20px;flex:none}
.gres{display:flex;align-items:center;gap:10px;margin-top:12px;padding:12px 14px;border-radius:14px;background:#FFF8E6;border:1.5px solid #F2D98B;color:#191F28;text-decoration:none;min-height:52px}
.gres b{font-size:15px}.gres small{display:block;font-size:13px;color:#6B5A1E}.gres .go{margin-left:auto;font-weight:800;color:#8A6D17}
.gpri{margin-top:14px}.gpri>span{display:block;font-size:13.5px;font-weight:800;color:#4E5968;margin-bottom:2px}

.ginst{margin:12px 0 0;padding:16px 16px 14px;border-radius:18px;background:#fff;border:2px solid #4338CA;box-shadow:0 4px 16px rgba(67,56,202,.10)}
.ginst .gi-hd{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 6px}.ginst .bd{font-size:12px;font-weight:800;border-radius:999px;padding:3px 10px}.ginst .bd.ok{background:#4338CA;color:#fff}.ginst .bd.ex{background:#FBF5E3;color:#7A5C0F}
.ginst .tt{font-size:13px;font-weight:700;color:#4E5968}
.ginst h3{margin:0;font-size:18.5px;font-weight:900;line-height:1.45;letter-spacing:-.3px;word-break:keep-all;color:#191F28}
.ginst .exn{margin:6px 0 0;font-size:13px;line-height:1.5;color:#7A5C0F;background:#FBF8EF;border-radius:10px;padding:6px 10px}
.ginst .gnums{margin-top:10px}.ginst .giref{list-style:none;margin:10px 0 0;padding:10px 12px;border-radius:12px;background:#FBF8EF;font-size:13.5px;line-height:1.5}.ginst .giref small{color:#6B5A1E}.ginst .giref .nt{font-size:12px;color:#6B5A1E;margin-top:4px}
.ginst .gw1{margin:8px 0 0;font-size:13.5px;color:#3E4754;line-height:1.5}.ginst .gsr{margin:6px 0 0;font-size:12.5px;color:#6B7684}.ginst .gsr a{color:#4E5968}
.gbtn{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.gbtn a{display:inline-flex;align-items:center;min-height:46px;padding:0 14px;border-radius:12px;border:1.5px solid #D4D1F5;background:#fff;color:#3730A3;font-weight:800;font-size:14.5px;text-decoration:none}.gbtn a.p{background:#4338CA;border-color:#4338CA;color:#fff}
.gfb{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13.5px;color:#4E5968}.gfb button{font-size:18px;min-width:44px;min-height:44px;border:1.5px solid #E5E8EB;border-radius:12px;background:#fff;cursor:pointer}.gfb button:hover{border-color:#4338CA}
.gfeat{margin:12px 0 0;display:grid;gap:6px}.gfeat .ft{margin:0;font-size:14px;font-weight:800;color:#191F28}.gfeat a{display:flex;align-items:center;gap:10px;min-height:54px;padding:8px 14px;border-radius:14px;border:1.5px solid #D4D1F5;background:#fff;color:#191F28;text-decoration:none}.gfeat a b{display:block;font-size:15px}.gfeat a small{display:block;font-size:13px;color:#4E5968}.gfeat a .go{margin-left:auto;color:#4338CA;font-weight:800;font-size:20px}
.gtw{margin:12px 0 0}.gtt{margin:0 0 4px;font-size:15px;font-weight:900}.gtn{margin:0 0 6px;font-size:12.5px;color:#6B7684;line-height:1.5}.gts{overflow-x:auto;-webkit-overflow-scrolling:touch}.gtbl2{min-width:560px;font-size:13.5px}.gtbl.gtbl2 tr:first-child td{font-weight:400;color:inherit}.gtbl2 a{color:#3730A3;font-weight:800}.gg{font-weight:800;white-space:nowrap}.gg.hi{color:#0F7B4F}.gg.mid{color:#B4540A}.gg.lo{color:#C2410C}
@media(max-width:600px){.gtbl2{min-width:0}.gtbl2 thead{display:none}.gtbl2,.gtbl2 tbody,.gtbl2 tr,.gtbl2 td{display:block;width:100%;box-sizing:border-box}.gtbl2 tr{border:1px solid #E5E8EB;border-radius:12px;padding:8px 12px;margin:0 0 8px}.gtbl.gtbl2 td{display:flex;justify-content:space-between;gap:10px;border:0;padding:3px 0;text-align:right}.gtbl2 td::before{content:attr(data-l);flex:none;color:#6B7684;font-size:12.5px;text-align:left}.gtbl.gtbl2 td:first-child{display:block;text-align:left;font-size:15px;font-weight:800;padding-bottom:4px}.gtbl2 td:first-child::before{content:none}}
.gdist{display:grid;gap:4px;margin:10px 0 0}.gdist div{display:grid;grid-template-columns:78px 1fr 64px;align-items:center;gap:8px;font-size:13.5px}.gdist i{display:block;height:10px;border-radius:99px;background:#D4D1F5;min-width:2px}.gdist div.on i{background:#4338CA}.gdist div.on span,.gdist div.on b{color:#3730A3;font-weight:800}.gdist b{text-align:right;font-variant-numeric:tabular-nums}
.gex{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:6px}.gex li a,.gex li{display:flex;align-items:center;gap:10px}.gex li a{flex:1;min-height:52px;padding:8px 12px;border-radius:12px;border:1px solid #E5E8EB;color:#191F28;text-decoration:none}.gex li>span.nm{flex:1;padding:6px 12px}.gex b{display:block;font-size:15px}.gex small{display:block;font-size:12.5px;color:#4E5968}.gex .v{margin-left:auto;font-weight:900;white-space:nowrap;font-variant-numeric:tabular-nums}
.gnq{margin:12px 0 0;padding:12px;border-radius:14px;background:#F5F4FD;border:1.5px solid #D4D1F5}.gnq .t{margin:0 0 8px;font-size:15.5px;font-weight:900}.gnq .o{display:flex;flex-wrap:wrap;gap:6px}.gnq .o button,.gnq .sk{font:inherit;font-size:14px;font-weight:800;min-height:44px;padding:0 14px;border-radius:999px;border:1.5px solid #C9C6F2;background:#fff;color:#3730A3;cursor:pointer}.gnq .fr{display:inline-flex;gap:4px}.gnq .fr input{width:110px;font:inherit;min-height:44px;padding:0 10px;border:1.5px solid #C9C6F2;border-radius:12px}.gnq select{font:inherit;min-height:44px;border:1.5px solid #C9C6F2;border-radius:12px;padding:0 8px;background:#fff}.gnq .sk{margin-top:8px;border-color:transparent;background:none;color:#4E5968;text-decoration:underline}
.galts .al{font-size:13.5px;font-weight:700;color:#4E5968;align-self:center}
@media(max-width:560px){.gsits{grid-template-columns:repeat(2,minmax(0,1fr))}.gsits button{min-height:48px;justify-content:center}.gsits button small{display:none}.gsits button:last-child:nth-child(odd){grid-column:1/-1}.gpri .gchips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin-right:-14px;padding-right:14px}.gpri .gchip{flex:none;white-space:nowrap}.gtop{margin:12px 16px 0;padding:18px 14px 16px}.gtop h2{font-size:20px}.gtop form button{padding:0 16px}}
@media(min-width:1024px){.gtop{margin:20px 0 0}}

.gflow{max-width:640px;margin:0 auto;padding:8px 20px 24px}
.gflow .ghd{display:flex;align-items:center;gap:10px;margin:8px 0 4px}
.gflow .ghd .k{font-size:12.5px;font-weight:800;color:#4338CA;background:#EEEDFB;border-radius:999px;padding:3px 10px;white-space:nowrap}
.gflow h1{margin:6px 0 2px;font-size:24px;font-weight:900;letter-spacing:-.6px;line-height:1.35;word-break:keep-all}
.gflow .gsub{margin:0;font-size:14.5px;color:#4E5968;line-height:1.55}
.gprog{display:flex;align-items:center;gap:10px;margin:16px 0 10px}.gprog .bar{flex:1;height:8px;border-radius:99px;background:#EEF1F5;overflow:hidden}.gprog .bar i{display:block;height:100%;background:#4338CA;border-radius:99px;transition:width .25s}
.gprog b{font-size:14px;font-weight:800;color:#4338CA;white-space:nowrap;font-variant-numeric:tabular-nums}
.gq{margin:0 0 14px;padding:18px 16px;border-radius:18px;background:#fff;border:1.5px solid #E5E8EB}
.gq label.t,.gq .t{display:block;font-size:17.5px;font-weight:800;line-height:1.45;margin:0 0 4px;color:#191F28;word-break:keep-all}
.gq .h{margin:0 0 10px;font-size:13.5px;color:#4E5968;line-height:1.5}
.gq .mem{margin:8px 0 0;font-size:13px;color:#0F7B4F;font-weight:700}
.gq input[type=text],.gq input[type=date],.gq input[type=number],.gq select{font:inherit;font-size:17px;min-height:52px;width:100%;box-sizing:border-box;padding:0 14px;border:1.5px solid #D1D6DB;border-radius:14px;background:#fff;color:#191F28}
.gq input:focus,.gq select:focus{outline:0;border-color:#4338CA;box-shadow:0 0 0 3px rgba(67,56,202,.15)}
.gq .unit{display:flex;align-items:center;gap:8px}.gq .unit span{font-size:16px;font-weight:700;color:#4E5968;white-space:nowrap}
.gq .pre{margin:6px 0 0;font-size:14px;font-weight:800;color:#3730A3;min-height:20px}
.gq .opts{display:grid;gap:8px}.gq .opts.two{grid-template-columns:1fr 1fr}.gq .opts.three{grid-template-columns:1fr 1fr 1fr}
.gq .opts button{font:inherit;font-size:15.5px;font-weight:700;min-height:52px;padding:8px 14px;border:1.5px solid #D1D6DB;border-radius:14px;background:#fff;color:#3E4754;cursor:pointer;text-align:left;line-height:1.4}
.gq .opts button[aria-pressed="true"]{border-color:#4338CA;background:#F5F4FD;color:#3730A3}
.gq .row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.gq .dj{display:flex;gap:8px}.gq .dj button{flex:none;font:inherit;font-weight:800;min-height:52px;padding:0 16px;border:0;border-radius:14px;background:#191F28;color:#fff;cursor:pointer}
.gq .djc{display:grid;gap:6px;margin-top:8px}.gq .djc button{font:inherit;text-align:left;min-height:52px;padding:8px 14px;border:1.5px solid #D1D6DB;border-radius:12px;background:#fff;cursor:pointer}.gq .djc button small{display:block;font-size:13px;color:#4E5968}
.gq .djc button[aria-pressed="true"]{border-color:#4338CA;background:#F5F4FD}
.gq .hs{border:1px dashed #D4D1F5;border-radius:14px;padding:12px;margin:0 0 10px;display:grid;gap:8px}.gq .hs b{font-size:15px}.gq .hs .lb{font-size:13px;color:#4E5968;font-weight:700;margin-bottom:-4px}
.gq .add{font:inherit;font-weight:800;min-height:48px;border:1.5px dashed #4338CA;background:#fff;color:#4338CA;border-radius:12px;cursor:pointer;width:100%}
.gnav{display:flex;gap:8px;margin-top:6px}.gnav button{font:inherit;font-size:16.5px;font-weight:800;min-height:56px;border-radius:16px;cursor:pointer}
.gnav .nx{flex:1;border:0;background:#4338CA;color:#fff}.gnav .bk{flex:none;padding:0 18px;border:1.5px solid #D1D6DB;background:#fff;color:#3E4754}
.gerr{margin:8px 0 0;font-size:14.5px;font-weight:700;color:#C2410C}.gerr:empty{display:none}
.gcard{margin:14px 0 0;padding:20px 18px;border-radius:20px;background:#fff;border:2px solid #4338CA;box-shadow:0 6px 22px rgba(67,56,202,.10)}
.gcard .gk{margin:0 0 6px;font-size:12.5px;font-weight:800;color:#fff;background:#4338CA;display:inline-block;border-radius:999px;padding:3px 10px}
.gcard h2{margin:0;font-size:21px;font-weight:900;line-height:1.42;letter-spacing:-.4px;word-break:keep-all}
.gnums{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0 0}
.gnums div{padding:12px 12px;border-radius:14px;background:#F5F4FD}.gnums small{display:block;font-size:13px;color:#4E5968;font-weight:700;line-height:1.4}.gnums b{display:block;font-size:18px;font-weight:900;margin:3px 0 2px;line-height:1.35;word-break:keep-all;font-variant-numeric:tabular-nums}.gnums span{display:block;font-size:12.5px;color:#4E5968;line-height:1.45}
.gtbl{width:100%;border-collapse:collapse;margin:14px 0 0;font-size:14px}.gtbl th,.gtbl td{text-align:left;padding:9px 6px;border-bottom:1px solid #EEF1F5;vertical-align:top;line-height:1.45}.gtbl th{font-size:13px;color:#4E5968}.gtbl tr:first-child td{font-weight:800;color:#3730A3}
.gref{margin:14px 0 0;padding:14px;border-radius:14px;background:#FBF8EF;border:1px solid #EFE2B8}.gref h3{margin:0 0 6px;font-size:14.5px;font-weight:900;color:#7A5C0F}.gref ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}.gref li{font-size:14px;line-height:1.5}.gref li b{font-weight:900}.gref li small{display:block;font-size:12.5px;color:#6B5A1E}.gref p{margin:8px 0 0;font-size:12.5px;color:#6B5A1E}
.ginfo{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:8px}.ginfo li{font-size:14px;line-height:1.55;padding:10px 12px;border-radius:12px;background:#F7F8FA}
.ginfo .bd{display:inline-block;font-size:11.5px;font-weight:800;border-radius:5px;padding:1px 6px;margin-right:6px;vertical-align:1px}.ginfo .bd.ok{background:#E6F6EE;color:#0F7B4F}.ginfo .bd.no{background:#FFF1E6;color:#B4540A}
.ginfo a{color:#3730A3;font-weight:700;white-space:nowrap}
.gwarn{margin:14px 0 0}.gwarn h3{margin:0 0 6px;font-size:15px;font-weight:900}.gwarn ul{margin:0;padding-left:20px}.gwarn li{font-size:14.5px;line-height:1.6;color:#3E4754;margin:2px 0}
.gnote{margin:12px 0 0;font-size:13px;color:#4E5968;line-height:1.55}.gnote button{font:inherit;font-size:13px;font-weight:800;color:#4338CA;background:none;border:0;padding:0 2px;cursor:pointer;min-height:32px}
.gsrc{margin:10px 0 0;font-size:13px;color:#4E5968}.gsrc summary{cursor:pointer;font-weight:800;min-height:40px;display:flex;align-items:center}.gsrc ul{margin:0;padding-left:18px}.gsrc li{margin:3px 0;line-height:1.5}.gsrc a{color:#3730A3}
.gsame{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0 0;min-height:52px;padding:10px 14px;border-radius:14px;border:1.5px solid var(--blue,#4338CA);background:#fff;color:var(--blue-d,#3730A3);text-decoration:none}.gsame b{font-size:15.5px;font-weight:800}.gsame small{display:block;font-size:13px;font-weight:500;color:var(--sub2,#4E5968);margin-top:2px}.gsame .go{flex:none;font-size:20px;font-weight:800}
.gn3{margin:18px 0 0}.gn3 h3{margin:0 0 8px;font-size:17px;font-weight:900}
.gn3 ol{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.gn3 a{display:flex;align-items:center;gap:12px;min-height:62px;padding:12px 16px;border-radius:16px;border:1.5px solid #D4D1F5;background:#fff;color:#191F28;text-decoration:none}
.gn3 a:hover{border-color:#4338CA}.gn3 a.main{background:#4338CA;border-color:#4338CA;color:#fff}.gn3 a.main small{color:#E3EBFF}.gn3 a.main .ic{background:rgba(255,255,255,.2);color:#fff}
.gn3 a .ic{flex:none;width:34px;height:34px;border-radius:10px;background:#EEEDFB;color:#4338CA;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px}
.gn3 a b{display:block;font-size:15.5px;font-weight:800;line-height:1.4}.gn3 a small{display:block;font-size:13px;color:#4E5968;margin-top:1px}.gn3 a .go{margin-left:auto;font-size:20px;font-weight:800;flex:none}
.gdis{margin:18px 0 0;font-size:12.5px;color:#6B7684;line-height:1.55}
.galt{margin:10px 0 0;padding:14px;border-radius:14px;background:#F7F8FA}.galt b{display:block;font-size:15px;margin-bottom:6px}
@media(max-width:420px){.gnums{grid-template-columns:1fr}.gflow{padding:6px 16px 20px}.gflow h1{font-size:21px}.gcard{padding:18px 14px}.gcard h2{font-size:19px}.gq .row2{grid-template-columns:1fr}}
@media(min-width:900px){.gnums{grid-template-columns:repeat(3,1fr)}}`;
  function css() { if (document.getElementById('gdCss')) return; const s = document.createElement('style'); s.id = 'gdCss'; s.textContent = CSS; document.head.appendChild(s); }

  const solveUrl = (id, extra) => BASE + 'solve/?s=' + encodeURIComponent(id) + (extra || '');

  /* ---------- 미리 불러오기(첫 카드를 1초 안에) ---------- */
  const ENGINES = ['assets/reg-zones.js?v=1', 'assets/sale-status.js?v=1', 'assets/loan-rules.js?v=4', 'tax/tax-engine.js?v=4', 'tax/adjusted-areas.js?v=3', 'assets/loan-core.js?v=6', 'assets/hug-core.js?v=1', 'chungyak/cy-engine.js?v=8', 'assets/redev-core.js?v=3', 'assets/guide-redev.js?v=6', 'assets/guide-budget.js?v=4'];
  const ENG_OK = { 'assets/reg-zones.js?v=1': 'JDJ_REG', 'assets/sale-status.js?v=1': 'JDJ_SALE', 'assets/loan-rules.js?v=4': 'JDJ_LOAN_RULES', 'tax/tax-engine.js?v=4': 'JDJ_TAX', 'tax/adjusted-areas.js?v=3': 'JDJ_ADJ', 'assets/loan-core.js?v=6': 'JDJ_LOAN', 'assets/hug-core.js?v=1': 'JDJ_HUG', 'chungyak/cy-engine.js?v=8': 'JDJ_CYE', 'assets/redev-core.js?v=3': 'JDJ_REDEV', 'assets/guide-redev.js?v=6': 'JDJ_GREDEV', 'assets/guide-budget.js?v=4': 'JDJ_GBUDGET' };
  function script(src) { return new Promise(res => { const x = document.createElement('script'); x.src = BASE + src; x.onload = res; x.onerror = res; document.head.appendChild(x); }); }
  let WARM = null;
  /** 계산 엔진·고민 자료·지역 자료·청약 당첨 가점(기억한 시·도 또는 서울)·서울 단지 목록을 쉬는 동안 미리 */
  function warm() {
    if (WARM) return WARM;
    WARM = (async () => {
      for (const e of ENGINES) if (!root[ENG_OK[e]]) await script(e);   // 차례가 중요(대출 계산이 세금·규칙 파일을 먼저 읽음)
      const [D, IX] = await Promise.all([load(), ix().catch(() => null), feats().catch(() => null)]);
      const mem = memory(IX).m;
      cyRows(mem.csido || '서울특별시').catch(() => null); cyNotices();
      return { D, IX };
    })();
    return WARM;
  }
  const feats = () => getJ('feat', BASE + 'assets/guide/features.json?v=3');
  function idle(f) { (root.requestIdleCallback || (g => setTimeout(g, 300)))(f, { timeout: 1500 }); }
  /* 재개발 예산·재건축 몸테크(scenarios.json ext:"redev") — 화면·계산은 assets/guide-redev.js, 여기서는 쓰는 도구만 넘겨요 */
  /* 보유 현금 + 대출로 살 수 있는 서울 아파트(대표 질문, scenarios.json ext:"budget") — 화면·계산은 assets/guide-budget.js */
  const XM = sc => !sc || !sc.ext ? null : sc.ext === 'budget' ? root.JDJ_GBUDGET || null : root.JDJ_GREDEV || null;
  const XSRC = { budget: 'assets/guide-budget.js?v=4', redev: 'assets/guide-redev.js?v=6', adcheck: 'assets/adcheck-view.js?v=1' };
  const GXon = sc => !!XM(sc);
  function unitsOf(sid) {
    const MC = root.JDJ_MINE;
    const pr = cache['u' + sid] || (cache['u' + sid] = fetch(DATA + sid + '.json', { cache: 'no-cache' }).then(r => r.json()).then(j => { pr.done = (j.units || []).map(u => { if (u[9] && typeof u[9] === 'object' && MC && MC.cleanFx) MC.cleanFx(u[9]); return u; }); return pr.done; }).catch(e => { delete cache['u' + sid]; throw e; }));
    return pr;
  }
  /** 단지 좌표(sNN_xy.json — 지도 map/ 과 같은 파일) */
  function xyOf(sd) { return getJ('xy' + sd.id, DATA + (sd.xy || sd.id + '_xy.json')).then(j => (j && j.xy) || null).catch(() => null); }
  function gxH(o, D, IX) {
    const R0 = root.JDJ_RANK;
    return Object.assign({ D, IX, BASE, DATA, getJ, MC: root.JDJ_MINE, L: root.JDJ_LOAN, unitsOf, script, stat, site, solveUrl, fbHtml, fbWire, tablesHtml, afterHtml, expertLink, live: () => true,
      hrefOf: (n, a) => hrefOf(n, a, o && o.sc && o.sc.id), regionOf: c => regionOf(IX, c),
      mineUrl: r => R0 ? R0.mineUrl('s00', [r.code, r.dong, r.u[8] || '', r.apt].join('|'), r.band) : BASE + 'mine/' }, o || {});
  }

  /* ---------- 즉답 카드 ---------- */
  const FB = 'jdj_guide_fb';
  function fbHtml(id, where) {
    const g = jget(FB) || {}, done = g[id];
    return `<div class="gfb" data-fb="${esc(id)}" data-w="${esc(where)}">${done ? '<span>의견 고마워요. 길잡이를 다듬는 데 쓸게요.</span>' : '<span>이 답이 도움이 됐나요?</span><button type="button" data-v="1" aria-label="도움이 됐어요">👍</button><button type="button" data-v="-1" aria-label="도움이 안 됐어요">👎</button>'}</div>`;
  }
  function fbWire(el) {
    el.querySelectorAll('.gfb').forEach(box => box.addEventListener('click', e => {
      const b = e.target.closest('[data-v]'); if (!b) return;
      const id = box.dataset.fb, v = +b.dataset.v, g = jget(FB) || {}; if (g[id]) return;
      g[id] = v; ls.set(FB, JSON.stringify(g));
      box.innerHTML = '<span>의견 고마워요. 길잡이를 다듬는 데 쓸게요.</span>';
      stat('guide_fb', { s: id, v });
      const api = (root.JDJ_AGENTS && root.JDJ_AGENTS.api) || ''; if (!api) return;
      try { fetch(api, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'gdFb', s: id, v, w: box.dataset.w, pv: preview() ? 1 : 0 }) }).catch(() => {}); } catch (x) {}
    }));
  }
  function instHtml(c, D, o) {
    const exact = !!o.exact, ex = c.ex || '';
    const nums = (c.nums || []).slice(0, 3).map(n => `<div><small>${esc(n.k)}</small><b>${esc(n.v)}</b>${n.s ? `<span>${esc(n.s)}</span>` : ''}</div>`).join('');
    const ref = (c.ref || []).slice(0, 3).map(x => `<li><b>${esc(x.k)}: ${esc(x.v)}</b> <small>${esc(x.s || '')}</small></li>`).join('');
    const src = (c.src || []).map(k => D.src[k]).filter(Boolean)[0];
    const btns = (o.btns || []).map((b, i) => `<a class="${i === 0 ? 'p' : ''}" href="${esc(b.href)}"${b.ext ? ' target="_blank" rel="noopener"' : ''}${b.go ? ` data-go="${esc(b.go)}"` : ''} data-track="${esc(b.tr || 'guide_inst')}">${esc(b.t)} ›</a>`).join('');
    return `<section class="ginst" aria-live="polite"><div class="gi-hd"><span class="bd ${exact ? 'ok' : 'ex'}">${exact ? '바로 답' : ex ? '예시로 먼저' : '먼저 보는 답'}</span>${o.title ? `<span class="tt">${esc(o.title)}</span>` : ''}</div>
      <h3>${esc(c.head)}</h3>${ex ? `<p class="exn">${esc(ex)}</p>` : ''}
      ${tablesHtml(c.tables, 3)}${nums ? `<div class="gnums">${nums}</div>` : ''}${ref ? `<ul class="giref">${ref}<li class="nt">지난 자료로 계산한 참고 값이에요. 앞으로의 가격을 약속하지 않아요.</li></ul>` : ''}
      ${c.warn && c.warn[0] ? `<p class="gw1">${esc(c.warn[0])}</p>` : ''}
      ${src ? `<p class="gsr">출처: <a href="${esc(/^https?:/.test(src.url) ? src.url : BASE + src.url)}" target="_blank" rel="noopener">${esc(src.nm)}</a>${(c.src || []).length > 1 ? ` 외 ${(c.src || []).length - 1}개` : ''}</p>` : ''}
      <div class="gbtn">${btns}</div>${o.fb ? fbHtml(o.fb, 'top') : ''}</section>`;
  }
  function featHtml(list, title) {
    if (!list.length) return '';
    return `<section class="gfeat"><p class="ft">${esc(title || '이 기능을 바로 열어 드릴게요')}</p>${list.map(f => `<a href="${esc(BASE + f.url)}" data-track="guide_feat_${esc(f.id)}"><span><b>${esc(f.t)}</b><small>${esc(f.d)}</small></span><span class="go">›</span></a>`).join('')}</section>`;
  }
  const featOn = f => !f.flag || (root.JDJ_SITE && root.JDJ_SITE[f.flag] === true) || preview();

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
        <p class="s">문장 그대로 적으면 ${esc(site())}가 바로 계산해 답하고, 내 조건으로 더 정확히 보는 길까지 안내해 드려요. 단지 이름을 넣으면 시세와 점수를 보여 드려요.</p>
        <form role="search" novalidate><label for="gdQ" style="position:absolute;left:-9999px">고민 입력</label>
          <input id="gdQ" type="search" enterkeyhint="search" autocomplete="off" placeholder="예: ${esc(EXAMPLES[0])}"><button type="submit">찾아보기</button></form>
        <div class="msg" role="status" aria-live="polite"></div><div class="gans"></div><div class="gchips galts"></div>
        ${R ? `<a class="gres" href="${esc(solveUrl(R.sc.id, '&resume=1'))}" data-track="guide_resume"><span><b>이어서 하기: ${esc(R.sc.t)}</b><small>지난번 답이 이 기기에 남아 있어요</small></span><span class="go">›</span></a>` : ''}
        <p class="gsitq">지금 어떤 상황이세요?</p>
        <div class="gsits" role="group" aria-label="상황 고르기">${D.cats.map(c => `<button type="button" data-cat="${esc(c.id)}" aria-pressed="false"><b>${esc(c.t)}</b><small>${esc(c.d)}</small></button>`).join('')}</div>
        <div class="glist" aria-live="polite"></div>
        <div class="gpri"><span>상담에서 가장 많이 받는 고민</span><div class="gchips">${D.sc.filter(s => s.pri).sort((x, y) => (y.lead ? 1 : 0) - (x.lead ? 1 : 0)).map(s => `<a class="gchip" href="${esc(solveUrl(s.id, '&from=top'))}" data-track="guide_pri_${esc(s.id)}">${esc(s.t)}</a>`).join('')}</div></div>`;
      el.hidden = false;
      idle(() => { warm().then(() => { if (root.JDJ_ASK) idle(() => root.JDJ_ASK.ask('헬리오시티').catch(() => null)); }); });   // 서울 단지 목록까지 미리
      const f = el.querySelector('form'), q = el.querySelector('input'), msg = el.querySelector('.msg'), alts = el.querySelector('.galts'), list = el.querySelector('.glist'), ans = el.querySelector('.gans');
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
      /* 길잡이로 넘길 값: 문장에서 뽑은 값 + 이미 채운 답(금액은 이 탭에만) */
      const hand = (id, text, a, from, slots) => { try { sessionStorage.setItem(IN, JSON.stringify({ q: text, a: a ? stripA(a) : null, from: from || null, slots: slots || null, t: Date.now() })); } catch (e) {} };
      ans.addEventListener('click', e => { const a = e.target.closest('a[data-go]'); if (a && ans._h) hand(a.dataset.go, ans._h.text, ans._h.a, ans._h.from, ans._h.slots); });
      let RUN = 0;
      async function instant(text, final) {
        const my = ++RUN, t0 = performance.now();
        const W = await warm(); if (my !== RUN) return;
        const IX = W.IX, ctx = Object.assign(ctxOf(IX), { today: todayKst() }), r = C().classify(text, D, ctx), F = await feats().catch(() => null);
        alts.innerHTML = ''; ans._h = null;
        const fl = F ? C().findFeatures(text, F, D.lex).filter(featOn) : [];
        const short = text.split(/\s+/).length <= 4;
        if (r.top && GXon(D.sc.find(s => s.id === r.top.id))) { say(''); const sc = D.sc.find(s => s.id === r.top.id); ans._h = null;
          return (sc.ext === 'budget' ? root.JDJ_GBUDGET.instant : root.JDJ_GREDEV.instant)(ans, gxH({ sc, slots: r.slots, live: () => my === RUN, hand: nf => { try { sessionStorage.setItem(IN, JSON.stringify({ q: text, nf, t: Date.now() })); } catch (e) {} } }, D, IX)); }
        if (r.top && r.top.id === 'find_home') { say(''); return narrow(D.sc.find(s => s.id === 'find_home'), C().narrowInit(r.slots, D, ''), IX, t0, my); }
        if (r.top) {
          const sc = D.sc.find(s => s.id === r.top.id), mem = memory(IX);
          let a = {}, from = {};
          (sc.ask || []).forEach(k => { if (mem.m[k] != null) { a[k] = mem.m[k]; from[k] = mem.from[k]; } });
          if (r.slots.region) r.slots.region = regionOf(IX, r.slots.region.code) || r.slots.region;
          const ap = C().apply(sc, r.slots, a); a = ap.a; Object.assign(from, ap.from);
          if (a.region && !a.region.sd && IX) a.region = regionOf(IX, a.region.code) || a.region;
          /* 단지가 필요한 고민이면 문장 속 단지 이름을 먼저(서울 목록은 미리 불러 둠) */
          if ((sc.ask || []).indexOf('danji') >= 0 && root.JDJ_ASK && !a.danji && text.split(/\s+/).length <= 5) {   // 긴 문장은 단지 이름 찾기를 건너뜀(빠르게)
            const d = await danjiOf(text); if (my !== RUN) return;
            if (d) { a.danji = d; from.danji = '찾은 단지'; if (!a.region) a.region = regionOf(IX, d.code); }
          }
          if (a.danji) { a.facts = await danjiFacts(a.danji, IX, { fast: true }); if (my !== RUN) return; ['salep', 'kb', 'value'].forEach(k => { if ((sc.ask || []).indexOf(k) >= 0 && a[k] == null && a.facts && a.facts.price) { a[k] = a.facts.price; from[k] = `${a.facts.apt} 최근 실거래 시세`; } }); }
          const E = Object.assign(ENG(), { IX, today: todayKst() });
          if (sc.id === 'cy_where') { const [cr, cn] = await Promise.all([cyRows(a.csido || '서울특별시').catch(() => []), cyNotices()]); E.cyRows = cr; E.cyNotices = cn; }
          if (my !== RUN) return;
          const Q = C().quick(sc, a, E);
          ans._h = { text, a, from, slots: r.slots };
          const go = { t: Q && Q.exact ? '자세히 보고 다음 단계로' : '내 조건으로 정확히 보기', href: solveUrl(sc.id, '&from=inst'), go: sc.id, tr: 'guide_inst_go' };
          const nx = (sc.next || []).find(n => n.k === 'calc');
          const btns = [go].concat(nx ? [{ t: nx.t, href: hrefOf(nx, a, sc.id), tr: 'guide_inst_calc' }] : []);
          if (Q && Q.card) {
            ans.innerHTML = instHtml(Q.card, D, { exact: Q.exact, title: sc.t, btns, fb: sc.id }) + featHtml(fl.slice(0, 2), '관련 화면');
            say(''); fbWire(ans);
          } else {
            const nd = ((Q && Q.need) || C().pending(sc, a)).map(k => D.q[k] && (LBL[k] || D.q[k].t)).filter(Boolean).slice(0, 4);
            ans.innerHTML = `<section class="ginst"><div class="gi-hd"><span class="bd ex">${esc(sc.t)}</span></div><h3>${nd.length ? `${esc(nd.join(' · '))}만 알려 주시면 바로 계산해 드려요` : '바로 계산해 드릴게요'}</h3><div class="gbtn"><a class="p" href="${esc(go.href)}" data-go="${esc(sc.id)}">${esc(go.t)} ›</a></div></section>` + featHtml(fl.slice(0, 2), '관련 화면');
            say('');
          }
          if (r.alts.length) alts.innerHTML = '<span class="al">혹시 이 고민인가요?</span>' + r.alts.map(x => { const s2 = D.sc.find(y => y.id === x.id); return `<a class="gchip" href="${esc(solveUrl(s2.id, '&from=alt'))}">${esc(s2.t)}</a>`; }).join('');
          ans.dataset.ms = String(Math.round(performance.now() - t0));
          if (final) stat('guide_ask', { hit: sc.id, ms: ans.dataset.ms });
          return;
        }
        /* 고민 종류를 못 찾으면: 단지 이름(짧은 문장) → 사이트 기능 → 기록 */
        if (short && root.JDJ_ASK && root.JDJ_MINE) {
          if (final) say('단지 이름인지 찾아보는 중이에요…');
          const res = await root.JDJ_ASK.ask(text).catch(() => null); if (my !== RUN) return;
          const picks = res && res.segs && (res.skipped || []).length <= 1 ? res.segs.filter(x => x.pick).map(x => x.pick) : [];
          if (picks.length) {
            const d0 = picks[0], dj = { sd: d0.sd, code: d0.code, dong: d0.dong, jibun: d0.jibun, apt: d0.apt, band: res.hint ? root.JDJ_ASK_CORE.pickBand(d0, res.hint) : '' };
            const F0 = await danjiFacts(dj, IX, { fast: true }); if (my !== RUN) return;
            const url = root.JDJ_ASK_CORE.target(picks.map(d => ({ d, band: dj.band })), res.hint, 'home');
            ans._h = { text, a: { danji: dj }, from: { danji: '찾은 단지' } };
            const card = danjiCard(F0, picks);
            ans.innerHTML = instHtml(card, D, { exact: true, title: picks.length > 1 ? '단지 비교' : '단지 시세', fb: 'danji', btns: [{ t: picks.length > 1 ? '나란히 비교하기' : '시세·점수 자세히 보기', href: url, tr: 'guide_danji_view' }, { t: '이 가격, 급매인지 보기', href: solveUrl('high_bargain', '&from=danji'), go: 'high_bargain' }, { t: '새 거래 알림 켜기', href: BASE + 'my/watch/', tr: 'guide_danji_watch' }] });
            say(''); fbWire(ans); ans.dataset.ms = String(Math.round(performance.now() - t0));
            if (F0 && F0.hasScore && !F0.fv) danjiFacts(dj, IX).then(F1 => { if (my !== RUN || !F1 || F1.fv == null) return; ans.innerHTML = instHtml(danjiCard(F1, picks), D, { exact: true, title: picks.length > 1 ? '단지 비교' : '단지 시세', fb: 'danji', btns: [{ t: picks.length > 1 ? '나란히 비교하기' : '시세·점수 자세히 보기', href: url }, { t: '이 가격, 급매인지 보기', href: solveUrl('high_bargain', '&from=danji'), go: 'high_bargain' }, { t: '새 거래 알림 켜기', href: BASE + 'my/watch/' }] }); fbWire(ans); });
            return;
          }
        }
        if (fl.length) { ans.innerHTML = featHtml(fl); say(''); ans.dataset.ms = String(Math.round(performance.now() - t0)); if (final) stat('guide_feat', { f: fl[0].id }); return; }
        ans.innerHTML = '';
        if (!final) { say(''); return; }
        logMiss(text, 'home');
        say(`‘${text.length > 30 ? text.slice(0, 30) + '…' : text}’는 아직 잘 모르겠어요. 위의 ‘지금 어떤 상황이세요?’에서 가장 가까운 것을 골라 주세요. 남겨 주신 고민은 길잡이를 늘리는 데 써요(개인정보는 가리고 저장해요).`, true);
        if (r.alts.length) alts.innerHTML = r.alts.map(x => { const s2 = D.sc.find(y => y.id === x.id); return `<a class="gchip" href="${esc(solveUrl(s2.id, '&from=weak'))}">혹시 ‘${esc(s2.t)}’인가요?</a>`; }).join('');
      }
      /* 넓은 질문 좁히기: 넓은 조건으로 먼저 보여 주고, 결과를 가장 크게 바꾸는 질문 하나씩(단추) */
      async function narrow(sc, st, IX, t0, my) {
        if (!st.sido) { const m = memory(IX).m; st.sido = (m.region && m.region.sido) || m.csido || '서울특별시'; st._sidoGuess = true; }
        const sd = ((IX && IX.sido) || []).find(x => x.name === st.sido) || {};
        const MC = root.JDJ_MINE, R0 = root.JDJ_RANK;
        let units = cache['u' + sd.id] && cache['u' + sd.id].done ? cache['u' + sd.id].done : null, xy = null;
        const draw = () => {
          if (my !== RUN) return;
          const nk = C().narrowNext(D, sc.id, st), NQ = nk ? D.narrow.q[nk] : null;
          const chips = C().findChips(st);   // 지도(map/) 필터 이름 그대로
          let body = '', R = null;
          if (units && MC) {
            R = C().findHomes(units, IX, st, MC, null, xy, sd.id);
            const mx = Math.max(1, ...R.dist.map(d => d.n));
            const inB = d => R.opt.price && d.id === R.opt.price;
            body = `<h3>${esc(chips.join(' · '))} 아파트 ${R.n.toLocaleString()}곳이에요</h3>
              <p class="exn">${st._sidoGuess ? '지역을 말씀하지 않아 ' + esc(st.sido) + '로 먼저 보여 드려요. ' : ''}지도와 같은 필터(평형·가격대·준공·역 거리)·같은 대표 평형이에요. 시세는 최근 3개월 실거래 중간값이고, 예시는 지도 목록처럼 거래가 많은 순이에요(추천 아님).</p>
              <div class="gdist">${R.dist.map(d => `<div class="${inB(d) ? 'on' : ''}"><span>${esc(d.t)}</span><i style="width:${Math.round(d.n / mx * 100)}%"></i><b>${d.n.toLocaleString()}곳</b></div>`).join('')}</div>
              ${R.ex.length ? `<ul class="gex">${R.ex.slice(0, 5).map(r => `<li><a href="${esc(R0 ? R0.mineUrl(sd.id, [r.code, r.dong, r.u[8] || '', r.apt].join('|'), r.band) : BASE + 'mine/')}"><b>${esc(r.apt)}</b><small>${esc(r.gu)} ${esc(r.dong)} · ${esc(r.band)}${r.by ? ` · ${r.by}년 준공` : ''}${r.sub != null ? ` · 역 도보 ${r.sub}분` : ''}</small><span class="v">${esc(r.price ? C().won(r.price) : '최근 거래 없음')}</span></a></li>`).join('')}</ul><p class="gtn">예시 ${R.ex.length}곳 · 조건에 맞는 전체 ${R.n.toLocaleString()}곳은 아래 ‘같은 조건으로 지도에서 보기’에서 볼 수 있어요.</p>` : '<p class="gtn">조건에 맞는 단지가 없어요. 조건을 하나 풀어 보세요.</p>'}`;
          } else {
            const pv = C().guPreview(IX, st);
            body = `<h3>${esc(chips.join(' · '))} — 구별 예상 가격부터 보여 드릴게요</h3><p class="exn">단지별 시세를 불러오는 중이에요. 먼저 구 실거래 중간값(3.3㎡당) × ${st.area || 84}㎡로 계산한 예시예요.</p>
              <ul class="gex">${pv.slice(0, 6).map(x => `<li><span class="nm"><b>${esc(x.name)}</b><small>3.3㎡당 ${esc(C().won(x.ppy))}</small></span><span class="v">${esc(C().won(x.price))}</span></li>`).join('')}</ul>${pv.length > 6 ? `<p class="gtn">외 ${pv.length - 6}개 구</p>` : ''}`;
          }
          const nq = NQ ? `<div class="gnq" data-nk="${esc(nk)}"><p class="t">${esc(NQ.t)}</p><div class="o">${NQ.opts.map(o => `<button type="button" data-nv="${esc(o[0])}">${esc(o[1])}</button>`).join('')}${NQ.free === 'money' ? '<span class="fr"><input type="text" inputmode="numeric" placeholder="직접: 예 8억" aria-label="예산 직접 입력"><button type="button" data-nfree="1">적용</button></span>' : ''}${NQ.free === 'gu' ? `<select aria-label="구 고르기" data-ngu="1"><option value="">다른 구 고르기</option>${Object.keys(IX.sgg).filter(c => IX.sgg[c].sido === st.sido).map(c => IX.sgg[c].name).sort((x, y) => x.localeCompare(y, 'ko')).map(n => `<option>${esc(n)}</option>`).join('')}</select>` : ''}</div><button type="button" class="sk" data-nskip="1">이대로 보기</button></div>` : '';
          ans.innerHTML = `<section class="ginst"><div class="gi-hd"><span class="bd ${units ? 'ok' : 'ex'}">${units ? '바로 답' : '예시로 먼저'}</span><span class="tt">${esc(sc.t)}</span></div>${body}${nq}
            <div class="gbtn"><a class="p" href="${esc(C().findMapUrl(st, R, BASE))}" data-track="guide_find_map">같은 조건으로 지도에서 보기 ›</a><a href="${esc(BASE + 'buy/report/')}">내 예산 맞춤 단지 ›</a></div>${fbHtml(sc.id, 'top')}</section>`;
          fbWire(ans); ans.dataset.ms = String(Math.round(performance.now() - t0));
          const box = ans.querySelector('.gnq'); if (!box) return;
          const set = v => { st = C().narrowSet(D, st, nk, v); stat('guide_narrow', { k: nk }); draw(); };
          box.querySelectorAll('[data-nv]').forEach(b => b.addEventListener('click', () => set(b.dataset.nv)));
          const fb2 = box.querySelector('[data-nfree]'); if (fb2) fb2.addEventListener('click', () => { const v = moneyIn(box.querySelector('input').value); if (v) set([0, v]); });
          const gs = box.querySelector('[data-ngu]'); if (gs) gs.addEventListener('change', () => { if (gs.value) set(gs.value); });
          box.querySelector('[data-nskip]').addEventListener('click', () => { st._skip = (st._skip || []).concat([nk]); draw(); });
        };
        draw();
        if (!units && sd.id) {
          const pr = cache['u' + sd.id] || (cache['u' + sd.id] = fetch(DATA + sd.id + '.json', { cache: 'no-cache' }).then(r => r.json()).then(j => { pr.done = (j.units || []).map(u => { if (u[9] && typeof u[9] === 'object' && MC.cleanFx) MC.cleanFx(u[9]); return u; }); return pr.done; }));
          try { units = await pr; } catch (e) { delete cache['u' + sd.id]; return; }
          draw();
        }
        if (sd.id && !xy) { xy = await xyOf(sd); if (xy) draw(); }
      }
      let tm = null;
      q.addEventListener('input', () => { clearTimeout(tm); const t = q.value.trim(); if (t.replace(/\s/g, '').length < 4) { ans.innerHTML = ''; alts.innerHTML = ''; return; } tm = setTimeout(() => instant(t, false), 450); });
      f.addEventListener('submit', e => {
        e.preventDefault(); clearTimeout(tm);
        const text = q.value.trim();
        if (text.replace(/\s/g, '').length < 2) { say('고민을 두 글자 이상 적어 주세요. 예: ' + EXAMPLES[1], true); return; }
        if (opt.chat === false) { instant(text, true); return; }
        /* 대화창으로: 첫 문장을 넘기고 길잡이 대화 화면을 열어요(입력하는 동안 보인 즉답 카드는 대화 첫 답으로 그대로 나와요) */
        try { sessionStorage.setItem(CIN, text); } catch (x) {}
        stat('guide_ask', { to: 'chat' }); location.href = BASE + 'solve/?chat=1';
      });
    }).catch(() => { el.hidden = true; if (ask) ask.hidden = false; });
    return true;
  }
  const stripA = a => { const o = {}; Object.keys(a).forEach(k => { if (k !== 'facts' && k[0] !== '_') o[k] = a[k]; }); return o; };
  /** 문장 속 단지 이름(거의 모든 낱말이 단지 이름으로 풀릴 때만 · 서울 → 경기·인천 → 나머지) */
  async function danjiOf(text) {
    if (!root.JDJ_ASK || text.split(/\s+/).length > 8) return null;
    const r = await root.JDJ_ASK.ask(text).catch(() => null);
    const s0 = r && r.segs ? r.segs.find(x => x.pick) : null;
    return s0 ? { sd: s0.pick.sd, code: s0.pick.code, dong: s0.pick.dong, jibun: s0.pick.jibun, apt: s0.pick.apt, band: r.hint ? root.JDJ_ASK_CORE.pickBand(s0.pick, r.hint) : '' } : null;
  }
  function danjiCard(F, picks) {
    const W = C().won;
    if (!F || !F.price) return { head: `${picks.map(d => d.apt).join(', ')}을 찾았어요`, nums: [{ k: '최근 3년 거래', v: `${Number(picks[0].n || 0).toLocaleString()}건`, s: '국토교통부 실거래' }], src: ['molit_rt'] };
    const at = F.at ? `${F.at.slice(0, 4)}년 ${+F.at.slice(4, 6)}월` : '';
    return { head: `${F.apt} ${F.band} 최근 실거래 시세는 ${W(F.price)}이에요`,
      nums: [{ k: '최근 시세', v: W(F.price), s: `${at}까지 3개월 실거래 중간값` }].concat(F.range ? [{ k: '최근 1년 거래 범위', v: `${W(F.range.lo)} ~ ${W(F.range.hi)}`, s: `거래 있던 ${F.range.months}개월 기준` }] : []).concat(picks.length > 1 ? [{ k: '함께 찾은 단지', v: picks.slice(1).map(d => d.apt).join(', '), s: '나란히 비교할 수 있어요' }] : []),
      ref: F.fv != null ? [{ k: '미래가치 점수', v: `${F.fv}점`, s: `${F.fvBase} 중 순위${F.track ? ` · 과거 성적 ${F.track.n}번 중 ${F.track.hit}번 맞음` : ''}` }] : [],
      src: ['molit_rt'] };
  }

  /* ---------- 길잡이 화면(solve/) ---------- */
  const ENG = () => ({ L: root.JDJ_LOAN, T: root.JDJ_TAX, H: root.JDJ_HUG, CY: root.JDJ_CYE, ADJ: root.JDJ_ADJ, RD: root.JDJ_REDEV, SALE: root.JDJ_SALE, RC: root.JDJ_RENT, KK: root.JDJ_KK, JS: root.JDJ_JSAFE });
  const cyNotices = () => getJ('cyn', DATA + 'chungyak/notices.json').then(j => j.rows || []).catch(() => []);
  const TAXSD = ['서울', '경기', '인천'];
  function taxRegion(rg) {
    if (!rg) return {};
    const sd = TAXSD.indexOf(rg.short) >= 0 ? rg.short : '그 밖의 지역';
    let gu = rg.name;
    if (sd === '경기' && root.JDJ_ADJ && root.JDJ_ADJ.guList('경기').indexOf(gu) < 0) gu = '그 밖의 시·군';
    return { sd, gu: sd === '그 밖의 지역' || sd === '인천' ? '' : gu };
  }
  async function danjiFacts(d, IX, opt) {
    const M = root.JDJ_MINE, A = root.JDJ_ASK_CORE, R = root.JDJ_RANK; if (!M || !d) return null;
    const P = root.JDJ_PRICE || { loadSgg: (c) => getJ('pg' + c, DATA + 'price/' + c + '.json').then(j => ({ units: j.units || [] })), scoreUnits: sd => getJ('sc' + sd, DATA + sd + '.json').then(j => j.units || []) };
    try {
      if (!IX) IX = await ix();
      const sg = await P.loadSgg(d.code, d.sd);
      const same = x => x[0] === d.code && x[1] === d.dong && x[2] === d.apt;
      const bands = sg.units.filter(same);
      if (!bands.length) return null;
      const band = d.band && bands.some(u => u[3] === d.band) ? d.band : (A ? A.pickBand({ bands }) : bands[0][3]);
      const u = bands.find(x => x[3] === band && String(x[8]) === String(d.jibun || x[8])) || bands.find(x => x[3] === band);
      const sm = u && u[6] ? M.bandSummary(u, IX.months) : null;
      let f = null;
      if (M.hasScore(u)) { if (u[9] && typeof u[9] === 'object') f = u[9]; else if (opt && opt.fast) f = null; else { const us = await P.scoreUnits(d.sd).catch(() => []); const v = us.find(x => M.unitKey(x) === M.unitKey(u)); f = v && v[9] && typeof v[9] === 'object' ? M.cleanFx(v[9]) : null; } }
      const sdo = (IX.sido || []).find(s => s.id === d.sd) || {};
      const MH = opt && opt.fast ? null : await getJ('mh', DATA + 'model_h.json').catch(() => null), tr = R && MH ? R.vcheck(MH, sdo.name) : null;
      const ok = !!(tr && tr.ok);
      return { apt: d.apt, band, price: sm && sm.price || null, at: sm && sm.at, ch1: sm && sm.ch1 ? { pct: sm.ch1.pct, fromAt: sm.ch1.fromAt, toAt: sm.ch1.toAt } : null, range: sm && sm.range && sm.range.hi ? { lo: sm.range.lo, hi: sm.range.hi, months: sm.range.months } : null,
        fv: ok && f && f.fv != null ? Math.min(99, f.fv) : null, fvBase: `${sdo.short || ''} 아파트`, track: ok ? { n: tr.n, hit: tr.hit } : null,
        n: u ? u[5] : null, hasScore: M.hasScore(u), mine: R ? R.mineUrl(d.sd, [d.code, d.dong, d.jibun || '', d.apt].join('|'), band) : BASE + 'mine/?sd=' + d.sd + '&d=' + encodeURIComponent([d.code, d.dong, d.jibun || '', d.apt].join('|')) };
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
    if (need.indexOf('cy') >= 0) { jobs.push(cyRows(a.csido || '서울특별시').then(r => { E.cyRows = r; })); jobs.push(cyNotices().then(r => { E.cyNotices = r; })); }
    if (need.indexOf('region') >= 0 && a.region && a.region.sd) jobs.push(getJ('rg' + a.region.sd, DATA + 'region/' + a.region.sd + '.json').then(j => { const g = j && j.gu && j.gu[a.region.code]; E.sup = g && g.sup ? { [a.region.code]: g.sup } : null; }).catch(() => {}));
    if (need.indexOf('jsafe') >= 0) { if (!root.JDJ_JSAFE) await script('assets/jsafe-core.js?v=2'); E.JS = root.JDJ_JSAFE; }
    if (need.indexOf('kk') >= 0 && a.danji) { if (!root.JDJ_KK) await script('assets/kk-core.js?v=1'); E.KK = root.JDJ_KK; jobs.push(getJ('kk', DATA + 'rent/kk.json').catch(() => getJ('kk2', BASE + 'data/kkang.json')).then(j => { E.kkData = j; }).catch(() => {})); }
    if (need.indexOf('units') >= 0) {   // 조건에 맞는 아파트 찾기: 지도와 같은 단지 자료 + 좌표(지도에 올라가는 단지만)
      const sd = ((IX && IX.sido) || []).find(x => x.name === ((a.region && a.region.sido) || '서울특별시'));
      if (sd) jobs.push(Promise.all([unitsOf(sd.id), xyOf(sd)]).then(([u, x]) => { E.units = u; E.xy = x; E.sd = sd.id; E.MC = root.JDJ_MINE; }).catch(() => {}));
    }
    if (need.indexOf('temp') >= 0) jobs.push((async () => {   // 이번 주 시장 온도(공개 temp/index.json — 지도·브리핑·내 집과 같은 숫자·문장)
      if (!root.JDJ_TEMP) await script('assets/temp-core.js?v=1');
      const j = await getJ('temp', DATA + 'temp/index.json').catch(() => null);
      if (j && root.JDJ_TEMP) E.tempRef = root.JDJ_TEMP.refItem(j, a.region && a.region.code ? a.region.code : 'kr');
    })().catch(() => {}));
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
      const nm = val && val.apt ? val.apt : (S.q0 && S.q0.split(/\s+/).length <= 5 ? S.q0 : '');
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
        const asks = sc.ask || [];
        if (inp.slots) { if (inp.slots.region && IX) inp.slots.region = regionOf(IX, inp.slots.region.code) || inp.slots.region; const ap = C().apply(sc, inp.slots, S.a); S.a = ap.a; Object.assign(S.from, ap.from); }
        if (inp.a) ['myscore', 'area', 'endMonth'].forEach(k => { if (inp.a[k] != null) S.a[k] = inp.a[k]; });
        if (inp.a) { Object.keys(inp.a).forEach(k => { if (asks.indexOf(k) >= 0 && inp.a[k] != null && inp.a[k] !== '') { S.a[k] = k === 'region' && inp.a.region && inp.a.region.code ? regionOf(IX, inp.a.region.code) : inp.a[k]; if (inp.from && inp.from[k]) S.from[k] = inp.from[k]; } }); }
        if (inp.danji && asks.indexOf('danji') >= 0) { S.a.danji = inp.danji; S.from.danji = '찾은 단지'; }
      }
      if (sc.ext) {   // 재개발 예산·재건축 몸테크(assets/guide-redev.js) · 현금 + 대출 서울 아파트(assets/guide-budget.js): 즉답 + 카드 안 좁히는 질문
        if (!root.JDJ_GREDEV) await script('assets/guide-redev.js?v=6');
        if (sc.ext === 'budget' && !root.JDJ_GBUDGET) await script(XSRC.budget);
        if (!root.JDJ_LOAN) await warm();
        stat('guide_open', { s: sc.id, from: qs.get('from') || '' });
        if (sc.ext === 'budget' && root.JDJ_GBUDGET) return root.JDJ_GBUDGET.flow(el, gxH({ sc, head: headHtml(sc, D), slots: inp && inp.slots ? inp.slots : (inp && inp.q ? C().extract(inp.q, ctxOf(IX)) : null), inSt: inp && inp.nf, mem }, D, IX));
        if (sc.ext === 'redev' && root.JDJ_GREDEV) return root.JDJ_GREDEV.flow(el, gxH({ sc, head: headHtml(sc, D), slots: inp && inp.slots ? inp.slots : (inp && inp.q ? C().extract(inp.q, ctxOf(IX)) : null), inSt: inp && inp.nf, mem }, D, IX));
      }
      /* 3) 기억 */
      (sc.ask || []).forEach(k => { if ((S.a[k] == null || S.a[k] === '') && mem.m[k] != null) { S.a[k] = mem.m[k]; S.from[k] = mem.from[k]; } });
      /* 묻는 칸: 기억·문장으로 채운 칸은 건너뛰고(결과에서 고칠 수 있음), 나머지를 최대 4단계로 */
      const CYF = ['birth', 'married', 'homeown', 'deps', 'accd'];
      const todo = (sc.ask || []).filter(k => (S.a[k] == null || S.a[k] === '') && !(k === 'adj' && S.a.region && S.a.region.code) && !(S.a.myscore != null && CYF.indexOf(k) >= 0));   // 가점을 적어 주셨으면 가점 계산 질문은 건너뜀   // 조정대상지역은 지역 + 날짜로 자동(공고 이력)
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
  function headHtml(sc, D) {
    return `<a class="gtochat" href="${esc(BASE + 'solve/?chat=1')}" style="float:right;font-size:13.5px;font-weight:800;color:#3730A3;text-decoration:none;min-height:40px;display:inline-flex;align-items:center">대화로 보기 ›</a><div class="ghd"><span class="k">${esc((D.cats.find(c => c.id === sc.cat) || {}).t || '')}</span>${sc.pri ? '<span class="k" style="background:#FBF5E3;color:#7A5C0F">자주 받는 고민</span>' : ''}</div><h1>${esc(sc.t)}</h1><p class="gsub">${esc(sc.sub || '')}</p>`;
  }
  function render(el, S, D, IX) {
    autoFill(S);
    const sc = S.sc, total = S.steps.length;
    while (S.si < total && S.steps[S.si].every(k => S.a[k] != null && S.a[k] !== '' && S.from[k] && /공고|시세|지역/.test(S.from[k]))) S.si++;   // 자동으로 채운 칸만 남은 단계는 건너뜀
    const head = headHtml(sc, D);
    const condOk = k => { const c = (sc.cond || {})[k]; return !c || c.slice(1).indexOf(String(S.a[c[0]])) >= 0; };   // 앞 답에 따라 필요 없는 질문은 건너뜀(예: 월세가 아니면 월세 금액)
    while (S.si < total && !S.steps[S.si].some(condOk)) S.si++;
    if (S.si < total) {
      const ids = S.steps[S.si].filter(condOk);
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
        if (S.q0 && S.q0.split(/\s+/).length <= 5 && !S.a.danji && root.JDJ_ASK) find();
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
    if (r.mount === 'adcheck') {   // 받은 분양 광고 확인하기(bunyang/check/)와 같은 화면 조각 — 같은 글이면 같은 결과
      el.innerHTML = `<div class="gflow">${head}<div class="gprog"><div class="bar"><i style="width:100%"></i></div><b>해법</b></div><div id="gAdc"></div>${next3Html(sc, a, D, r)}${afterHtml(sc, D)}
        <p class="gdis">${esc(site())}는 공공데이터와 법령을 정해진 규칙으로 계산해 보여 드리는 정보 제공 서비스이며, 특정 분양을 권하거나 말리지 않아요. 분양 조건은 입주자모집공고문과 분양 계약서가 최종 기준이에요.</p></div>`;
      try { if (!root.JDJ_ADCHKV) await script(XSRC.adcheck); root.JDJ_ADCHKV.mount(el.querySelector('#gAdc'), { base: BASE, from: 'guide' }); }
      catch (e) { el.querySelector('#gAdc').innerHTML = `<p class="gerr">화면을 불러오지 못했어요. <a href="${esc(BASE + 'bunyang/check/')}">받은 분양 광고 확인하기</a>에서 열어 주세요.</p>`; }
      return;
    }
    el.innerHTML = `<div class="gflow">${head}<div class="gprog"><div class="bar"><i style="width:100%"></i></div><b>해법</b></div>
      ${cardHtml(r, D, S)}${fbHtml(sc.id, 'solve')}${next3Html(sc, a, D, r)}${afterHtml(sc, D)}
      <p class="gdis">${esc(site())}는 공공데이터와 법령을 정해진 규칙으로 계산해 보여 드리는 정보 제공 서비스이며, 특정 부동산의 매수·매도를 권유하지 않아요. 세금·법률·대출의 최종 판단은 자격 있는 전문가와 확인해 주세요.</p></div>`;
    el.querySelector('[data-edit]') && el.querySelector('[data-edit]').addEventListener('click', () => { S.si = 0; S.done = false; S.steps = [(sc.ask || []).slice()].reduce((acc, all) => { const per = Math.max(1, Math.ceil(all.length / 4)); for (let i = 0; i < all.length; i += per) acc.push(all.slice(i, i + per)); return acc; }, []); render(el, S, D, IX); window.scrollTo(0, 0); });
    el.querySelectorAll('[data-save]').forEach(x => x.addEventListener('click', () => saveFor(x.dataset.save, S.a)));
    fbWire(el);
  }
  /** 표(여러 개) — 칸 값이 {t, href} 면 링크, {t, g} 면 판정 색 */
  function tablesHtml(T, lim) {
    return (T || []).map(tb => { const rows = lim ? tb.rows.slice(0, lim) : tb.rows;
      return `<div class="gtw"><h3 class="gtt">${esc(tb.title)}</h3>${tb.note ? `<p class="gtn">${esc(tb.note)}</p>` : ''}<div class="gts"><table class="gtbl gtbl2"><thead><tr>${tb.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((c, ci) => {
        const l = ` data-l="${esc(tb.head[ci] || '')}"`;
        if (c && typeof c === 'object') return c.href ? `<td${l}><a href="${esc(c.href)}" target="_blank" rel="noopener">${esc(c.t)}</a></td>` : `<td${l}><span class="gg ${esc(c.g || '')}">${esc(c.t)}</span></td>`;
        return `<td${l}>${esc(c)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>${lim && tb.rows.length > lim ? `<p class="gtn">외 ${tb.rows.length - lim}줄은 ‘자세히’에서 볼 수 있어요.</p>` : ''}</div>`; }).join('');
  }
  /** '같은 조건으로 검색 화면에서 보기'(길잡이 = 조건 검색 화면의 지름길 — 같은 계산·같은 결과) r.same = {t, s, href} */
  /* x.ss = [이 탭 저장 이름, 값] — 금액처럼 주소에 넣지 않을 값은 누를 때 이 탭(sessionStorage)에만 남겨 화면이 한 번 읽어요(전세 안전 점검 jdj_jsafe) */
  function sameHtml(x) { return x && x.href ? `<a class="gsame" href="${esc(/^https?:/.test(x.href) || x.href.indexOf(BASE) === 0 ? x.href : BASE + x.href)}"${x.ss ? ` data-ssk="${esc(x.ss[0])}" data-ssv="${esc(JSON.stringify(x.ss[1]))}"` : ''} data-track="guide_same"><span><b>${esc(x.t)}</b><small>${esc(x.s || '')}</small></span><span class="go" aria-hidden="true">›</span></a>` : ''; }
  if (root.document) root.document.addEventListener('click', e => { const x = e.target && e.target.closest ? e.target.closest('a[data-ssk]') : null; if (x) { try { root.sessionStorage.setItem(x.dataset.ssk, x.dataset.ssv); } catch (e2) {} } }, true);
  function cardHtml(r, D, S) {
    const nums = (r.nums || []).map(n => `<div><small>${esc(n.k)}</small><b>${esc(n.v)}</b>${n.s ? `<span>${esc(n.s)}</span>` : ''}</div>`).join('');
    const tbl = r.table ? `<table class="gtbl"><thead><tr>${r.table.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${r.table.rows.map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '';
    const ref = r.ref && r.ref.length ? `<div class="gref"><h3>참고 · 과거 성적이 확인된 점수와 실거래 흐름</h3><ul>${r.ref.map(x => `<li><b>${esc(x.k)}: ${esc(x.v)}</b><small>${esc(x.s || '')}</small></li>`).join('')}</ul><p>지난 자료로 계산한 값이에요. 앞으로의 가격을 약속하지 않아요.</p></div>` : '';
    const info = r.info && r.info.length ? `<ul class="ginfo">${r.info.map(x => { const s = D.src[x.src] || {}; return `<li><span class="bd ${x.ok ? 'ok' : 'no'}">${x.ok ? '법령 확인' : '확인 필요'}</span>${esc(x.t)} ${s.url ? `<a href="${esc(srcUrl(s.url))}" target="_blank" rel="noopener">근거 ›</a>` : ''}</li>`; }).join('')}</ul>` : '';
    const memo = Object.keys(S.from).filter(k => S.from[k] && (S.sc.ask || []).indexOf(k) >= 0).map(k => `${LBL[k] || D.q[k].t.replace(/[?？]$/, '').slice(0, 18)} ← ${S.from[k]}`);
    return `<section class="gcard" aria-labelledby="gHead"><span class="gk">해법</span><h2 id="gHead">${esc(r.head)}</h2>
      ${tablesHtml(r.tables)}${sameHtml(r.same)}${nums ? `<div class="gnums">${nums}</div>` : ''}${tbl}${ref}${info}
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
  function hrefOf(n, a, sc0) {
    if (n.href === '{mine}') return a.facts && a.facts.mine ? a.facts.mine : BASE + 'mine/';
    if (n.href === '{switch}') { const d = a.danji; return BASE + 'switch/' + (d && d.sd ? `?sd=${encodeURIComponent(d.sd)}&d=${encodeURIComponent([d.code, d.dong, d.jibun || '', d.apt].join('|'))}${a.facts && a.facts.band ? '&b=' + encodeURIComponent(a.facts.band) : ''}` : ''); }
    const h = C().linkFill(n, a, Object.assign(ENG(), { today: todayKst() }), sc0);   // 세금·청약 화면이 읽는 값까지 채움(assets/guide-core.js linkFill)
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
    return `<section class="gn3" aria-label="다음 단계"><h3>다음 단계</h3><ol>${out.map((n, i) => `<li><a class="${i === 0 ? 'main' : ''}" href="${esc(n.ext ? n.href : hrefOf(n, a, sc.id))}"${n.ext ? ' target="_blank" rel="noopener"' : ''}${n.save ? ` data-save="${esc(n.save)}"` : ''} data-track="guide_next_${esc(sc.id)}_${esc(n.k)}"><span class="ic" aria-hidden="true">${IC[n.k] || '›'}</span><span><b>${esc(n.t)}</b><small>${esc(n.s || (n.k === 'calc' && !(n.tax || n.save || /\{/.test(n.href || '')) ? '계산기로 바로 이동해요' : SUB[n.k]) || '')}</small></span><span class="go" aria-hidden="true">›</span></a></li>`).join('')}</ol></section>`;
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


  /* ---------- 대화로 묻고 답하기(solve/?chat=1) ----------
     집예보 상담사처럼 말풍선으로 하나씩 되묻고, 답할 때마다 결과 미니 카드를 새로 보여 줘요. 규칙 기반(guide-core chatStart·chatAnswer·chatNext).
     대화 기록(금액 포함)은 이 기기(localStorage jdj_guide_chat)에만 — 새로 고침해도 이어져요. [처음부터] · [양식으로 보기] */
  const CK = 'jdj_guide_chat', CIN = 'jdj_guide_chat_in';
  const CHAT_CSS = `
.gchat{max-width:680px;margin:0 auto;padding:6px 16px 0;display:flex;flex-direction:column;min-height:calc(100vh - 140px)}
.gch-hd{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0 10px}.gch-hd b{font-size:18px;font-weight:900;margin-right:auto}
.gch-hd button,.gch-hd a{font:inherit;font-size:13.5px;font-weight:800;min-height:40px;padding:0 12px;border-radius:999px;border:1.5px solid #D4D1F5;background:#fff;color:#3730A3;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.gch-log{flex:1;display:flex;flex-direction:column;gap:10px;padding-bottom:12px}
.gb{max-width:88%;padding:11px 14px;border-radius:18px;font-size:15.5px;line-height:1.55;word-break:keep-all;white-space:pre-line}
.gb.me{align-self:flex-end;background:#4338CA;color:#fff;border-bottom-right-radius:6px}
.gb.bot{align-self:flex-start;background:#F2F4F6;color:#191F28;border-bottom-left-radius:6px}
.gb.bot .who{display:block;font-size:12px;font-weight:800;color:#5B3FB0;margin-bottom:2px}
.gb.card{background:#fff;border:2px solid #4338CA;max-width:96%;white-space:normal}
.gb.card h3{margin:0 0 6px;font-size:16.5px;font-weight:900;line-height:1.45}.gb.card .exn{margin:0 0 6px;font-size:12.5px;color:#7A5C0F;background:#FBF8EF;border-radius:8px;padding:5px 8px}
.gb.card .mn{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0}.gb.card .mn div{background:#F5F4FD;border-radius:10px;padding:8px}.gb.card .mn small{display:block;font-size:12px;color:#4E5968}.gb.card .mn b{display:block;font-size:15.5px;font-weight:900}
.gb.card ul{list-style:none;margin:6px 0 0;padding:0;font-size:13.5px}.gb.card li{padding:5px 0;border-bottom:1px solid #EEF1F5;display:flex;gap:8px}.gb.card li span{margin-left:auto;font-weight:800;white-space:nowrap}
.gb.card .ac{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.gb.card .ac a{font-size:13.5px;font-weight:800;min-height:40px;padding:0 12px;border-radius:10px;border:1.5px solid #D4D1F5;color:#3730A3;text-decoration:none;display:inline-flex;align-items:center}.gb.card .ac a.p{background:#4338CA;color:#fff;border-color:#4338CA}
.gqk{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start;max-width:96%}.gqk button{font:inherit;font-size:14px;font-weight:800;min-height:42px;padding:0 14px;border-radius:999px;border:1.5px solid #C9C6F2;background:#fff;color:#3730A3;cursor:pointer}
.gch-in{position:sticky;bottom:0;background:#fff;padding:10px 0 calc(10px + env(safe-area-inset-bottom));border-top:1px solid #EEF1F5;display:flex;gap:8px;z-index:5}
.gch-in input{flex:1;min-width:0;font:inherit;font-size:16px;min-height:50px;padding:0 14px;border:1.5px solid #D4D1F5;border-radius:14px}.gch-in button{font:inherit;font-weight:800;min-height:50px;padding:0 18px;border:0;border-radius:14px;background:#4338CA;color:#fff;cursor:pointer}
.gtyping{align-self:flex-start;color:#6B7684;font-size:13px}
.gch-ai{margin:-4px 0 10px;font-size:12.5px;line-height:1.5;color:#4E5968;background:#F5F4FD;border-radius:10px;padding:6px 10px}
body.gchat-on .jtab{display:none!important}body.gchat-on .foot{display:none}
@media(max-width:600px){.gchat{min-height:calc(100vh - 120px);padding:4px 12px 0}.gch-in{position:fixed;left:0;right:0;bottom:0;padding:8px 12px calc(8px + env(safe-area-inset-bottom));box-shadow:0 -2px 10px rgba(0,0,0,.05)}.gch-log{padding-bottom:84px}}
@media(min-width:900px){.gchat{border:1px solid #E5E8EB;border-radius:22px;margin-top:10px;padding:10px 20px 0;box-shadow:0 4px 20px rgba(25,31,40,.06)}}`;
  function chatCss() { css(); if (document.getElementById('gdChatCss')) return; const x = document.createElement('style'); x.id = 'gdChatCss'; x.textContent = CHAT_CSS; document.head.appendChild(x); }
  function miniCard(c, links) {
    if (!c) return '';
    const nums = (c.nums || []).slice(0, 4).map(n => `<div><small>${esc(n.k)}</small><b>${esc(n.v)}</b></div>`).join('');
    const tb = (c.tables || [])[0], ki = tb ? (tb.head.indexOf('판정') >= 0 ? tb.head.indexOf('판정') : tb.head.length - 1) : 0, cv = x => x && typeof x === 'object' ? x.t : (x == null ? '' : x);
    const rows = tb ? tb.rows.slice(0, 4).map(r => `<li>${esc(cv(r[0]))}<span>${esc(cv(r[ki]))}</span></li>`).join('') : '';
    const ex = (c.ex2 || []).slice(0, 4).map(r => `<li>${esc(r[0])}<span>${esc(r[1])}</span></li>`).join('');
    return `<h3>${esc(c.head)}</h3>${c.ex ? `<p class="exn">${esc(c.ex)}</p>` : ''}${nums ? `<div class="mn">${nums}</div>` : ''}${rows || ex ? `<ul>${rows || ex}</ul>` : ''}<div class="ac">${(links || []).map((l, i) => `<a class="${i === 0 ? 'p' : ''}" href="${esc(l.href)}"${l.ext ? ' target="_blank" rel="noopener"' : ''}>${esc(l.t)} ›</a>`).join('')}</div>`;
  }
  function mountChat(el) {
    if (!el || !on()) return false;
    chatCss(); document.body.classList.add('gchat-on');   // 대화 중에는 아래 탭 줄을 숨겨 입력창이 가려지지 않게
    let ST = null, LOG = [];
    try { const sv = jget(CK); if (sv && sv.st && Date.now() - (sv.t || 0) < 30 * 864e5) { ST = sv.st; LOG = sv.log || []; } } catch (e) {}
    const save = () => ls.set(CK, JSON.stringify({ st: ST, log: LOG.slice(-60), t: Date.now() }));
    el.innerHTML = `<div class="gchat"><div class="gch-hd"><b>${esc(site())} 길잡이</b><a href="#" data-form="1">양식으로 보기</a><button type="button" data-reset="1">처음부터</button></div>${aiOn() ? `<p class="gch-ai">AI가 질문을 이해하는 데 도움을 받아요. 숫자는 ${esc(site())} 계산이에요</p>` : ''}
      <div class="gch-log" aria-live="polite"></div><form class="gch-in" novalidate><label for="gcIn" style="position:absolute;left:-9999px">답 입력</label><input id="gcIn" type="text" autocomplete="off" enterkeyhint="send" placeholder="자유롭게 적어 주세요"><button type="submit">보내기</button></form></div>`;
    el.hidden = false;
    const log = el.querySelector('.gch-log'), inp = el.querySelector('input');
    const DD = { D: null, IX: null };
    function paint() {
      log.innerHTML = LOG.map((m, i) => m.who === 'me' ? `<div class="gb me">${esc(m.t)}</div>`
        : m.card ? `<div class="gb bot card">${miniCard(m.card, m.links)}${i === LOG.length - 1 || LOG.slice(i + 1).every(x => x.who === 'bot') ? fbHtml(m.sid || 'chat', 'top') : ''}</div>`
        : `<div class="gb bot"><span class="who">${esc(site())}</span>${esc(m.t)}</div>${m.quick && i === LOG.length - 1 ? `<div class="gqk">${m.quick.map(qv => `<button type="button" data-qv="${esc(qv[0])}">${esc(qv[1])}</button>`).join('')}</div>` : ''}`).join('');
      fbWire(log);
      const last = log.lastElementChild; if (last && last.scrollIntoView) last.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }
    const bot = (t, extra) => LOG.push(Object.assign({ who: 'bot', t }, extra || {}));
    async function think(D, IX) {
      const sc = D.sc.find(x => x.id === ST.id); if (!sc) return;
      let card = null, Q = null;
      const a = Object.assign({}, ST.a); ['adj', 'oa', 'na'].forEach(k => { if (a[k] === '?') a[k] = null; });
      if (sc.id === 'find_home') {
        const sd = (IX.sido || []).find(x => x.name === (ST.nf.sido || '서울특별시')) || {};
        if (!ST.nf.sido) ST.nf.sido = sd.name || '서울특별시';
        let units = cache['u' + sd.id] && cache['u' + sd.id].done;
        if (!units) {
          const pv = C().guPreview(IX, ST.nf);
          bot('', { card: { head: `${ST.nf.gname || ST.nf.sido} ${ST.nf.area || 84}㎡대 구별 예상 가격부터 보여 드릴게요`, ex: '단지별 시세를 불러오는 중이라 구 실거래 중간값으로 먼저 계산했어요', ex2: pv.slice(0, 4).map(x => [x.name, C().won(x.price)]) }, sid: sc.id }); paint();
          const MC = root.JDJ_MINE;
          const pr = cache['u' + sd.id] || (cache['u' + sd.id] = fetch(DATA + sd.id + '.json', { cache: 'no-cache' }).then(r => r.json()).then(j => { pr.done = (j.units || []).map(u => { if (u[9] && typeof u[9] === 'object' && MC.cleanFx) MC.cleanFx(u[9]); return u; }); return pr.done; }));
          try { units = await pr; } catch (e) { units = null; }
          LOG.pop();
        }
        if (units) {
          const xy = await xyOf(sd);
          const R = C().findHomes(units, IX, ST.nf, root.JDJ_MINE, null, xy, sd.id), R0 = root.JDJ_RANK;
          const chips = C().findChips(ST.nf).join(' · ');
          card = { head: `${chips} 아파트는 ${R.n.toLocaleString()}곳이에요`, nums: R.n && R.lo ? [{ k: '가격 범위', v: `${C().won(R.lo)} ~ ${C().won(R.hi)}` }, { k: '가운데 값', v: C().won(R.med) }] : [], ex2: R.ex.slice(0, 4).map(r => [`${r.apt} (${r.gu})`, r.price ? C().won(r.price) : '최근 거래 없음']), ex: '지도와 같은 필터·같은 순서(거래 많은 순, 추천 아님)예요. 시세는 최근 3개월 실거래 중간값이에요.' };
          ST._n = R.n;
        }
      } else if (sc.ext) {
        if (!root.JDJ_GREDEV) await script('assets/guide-redev.js?v=6');
        if (sc.ext === 'budget' && !root.JDJ_GBUDGET) await script(XSRC.budget);
        if (sc.ext === 'budget' && root.JDJ_GBUDGET) { if (!ST.nf) ST.nf = root.JDJ_GBUDGET.init(sc.id, {}, D); try { card = await root.JDJ_GBUDGET.chatCard(ST, gxH({ sc }, D, IX)); } catch (e) { card = null; } ST._n = card ? card.n : 0; }
        else if (root.JDJ_GREDEV) { if (!ST.nf) ST.nf = root.JDJ_GREDEV.init(sc.id, {}, D); try { card = await root.JDJ_GREDEV.chatCard(ST, gxH({ sc }, D, IX)); } catch (e) { card = null; } ST._n = card ? card.n : 0; }
      } else {
        const E = await env(sc, a, IX);
        if (a.danji && !a.facts) a.facts = await danjiFacts(a.danji, IX, { fast: true });
        Q = C().quick(sc, a, E); card = Q && Q.card;
      }
      const nx = C().chatNext(ST, D, Q);
      const links = [{ t: '자세히 보기', href: solveUrl(sc.id, '&from=chat'), hand: 1 }];
      if (card) { const n0 = (sc.next || []).find(n => n.k === 'calc'); if (n0) links.push({ t: n0.t, href: hrefOf(n0, a, sc.id) }); bot('', { card, links, sid: sc.id }); }
      if (nx) {
        ST.asked = { key: nx.key, nf: nx.nf ? 1 : 0, ext: nx.ext ? 1 : 0 };
        const pre = card && Q && !Q.exact && card.ex ? '지금은 예시로 계산했어요. ' : (sc.id === 'find_home' || sc.ext) && ST._n ? '조금 더 좁혀 볼게요. ' : '';
        bot(pre + nx.q.t, { quick: nx.quick.map(x => [String(x[0]), x[1]]) });
      } else {
        ST.asked = null; ST.done = true;
        bot(card ? (sc.expert ? '말씀하신 조건으로 계산했어요. 세금·법률 판단은 자격 있는 전문가와 한 번 더 확인해 주세요. 다른 고민도 편하게 적어 주세요.' : '말씀하신 조건으로 계산했어요. 더 궁금한 점이나 다른 고민도 편하게 적어 주세요.') : '이 고민은 양식으로 넣으시면 정확히 계산해 드려요.');
      }
    }
    /** AI 가 고른 고민으로 새로 시작: 기억한 값 → 이번 문장 규칙 값 → (비어 있는 칸만) AI 가 문장에서 찾은 값 */
    function aiStart(P, t, D, ctx, mem) {
      const sc = D.sc.find(x => x.id === P.id), st = C().chatStart('', D, ctx, mem);
      st.id = sc.id; st.a = {}; st.from = {}; st.skip = []; st.tries = 0; st.ai = 1;
      (sc.ask || []).forEach(k => { if (mem.m[k] != null) { st.a[k] = mem.m[k]; st.from[k] = mem.from[k]; } });
      const sl = C().extract(t, ctx), ap = C().apply(sc, sl, st.a); st.a = ap.a; Object.assign(st.from, ap.from);
      Object.keys(P.a || {}).forEach(k => { if (st.a[k] == null || st.a[k] === '') { st.a[k] = P.a[k]; st.from[k] = '적어 주신 문장'; } });
      if (sc.id === 'find_home') st.nf = C().narrowInit(sl, D, '');
      else if (GXon(sc)) st.nf = XM(sc).init(sc.id, sl, D);
      if (st.a.region && st.a.region.code) st.a.region = regionOf(DD.IX, st.a.region.code) || st.a.region;
      return st;
    }
    const pri4 = D => D.sc.filter(x => x.pri).slice(0, 4).map(x => ['@' + x.id, x.t]);
    /** AI 가 되묻는 질문 · 단추는 누르면 그 글자를 문장으로 보냄(~) */
    const aiQuestion = P => bot((P.say ? P.say + ' ' : '') + P.ask, { quick: P.quick.length ? P.quick.map(x => ['~' + x, x]) : null });
    async function send(text, qv, qlabel) {
      if (qv !== undefined && String(qv)[0] === '~') { text = String(qv).slice(1); qv = undefined; }
      const t = String(text || '').trim(); if (!t && qv === undefined) return;
      const W = await warm(); const D = W.D, IX = W.IX, ctx = Object.assign(ctxOf(IX), { today: todayKst() }); DD.D = D; DD.IX = IX;
      const prev = LOG.slice();
      LOG.push({ who: 'me', t: qlabel || t }); paint();
      const mem = memory(IX);
      if (!ST || !ST.id || ST.done && qv === undefined) {
        const s0 = C().chatStart(t, D, ctx, mem);
        /* 규칙이 못 알아들었거나(고민 없음) 비슷한 고민이 여럿이라 애매할 때만 AI */
        const weak = s0.id && s0.r && s0.r.top && s0.r.top.score < 5 && (s0.r.alts || []).length > 0;
        if ((!s0.id || weak) && t && aiOn()) {
          LOG.push({ who: 'bot', t: '…', typing: 1 }); paint();
          const rr = await aiAsk(null, prev, t, D); LOG.pop();
          const P = rr ? C().aiPlan(rr, null, D, ctx, t) : null;
          if (P && P.kind === 'off') { bot(P.say || AI_OFF_MSG, { quick: pri4(D) }); ST = null; save(); paint(); return; }
          if (P && P.kind === 'start') {
            ST = aiStart(P, t, D, ctx, mem); const sc = D.sc.find(x => x.id === ST.id);
            bot((P.say ? P.say + ' ' : '') + `‘${sc.t}’ 기준으로 계산해 볼게요.`);
            LOG.push({ who: 'bot', t: '…', typing: 1 }); paint(); LOG.pop();
            await think(D, IX); save(); paint(); return;
          }
          if (P && P.kind === 'ask' && !s0.id) { aiQuestion(P); ST = null; save(); paint(); return; }
        }
        if (!s0.id) {
          const F = await feats().catch(() => null), fl = F ? C().findFeatures(t, F, D.lex).filter(featOn) : [];
          if (fl.length) bot('이 화면이 도움이 될 것 같아요.', { card: { head: fl[0].t, nums: [], ex: fl[0].d }, links: fl.slice(0, 3).map(f => ({ t: f.t, href: BASE + f.url })) });
          else { logMiss(t, 'solve'); bot('아직 이 고민은 잘 모르겠어요. 아래에서 가까운 것을 골라 주시거나, 예를 들어 ‘전세 만기 2월인데 재계약할까요?’처럼 말씀해 주세요.', { quick: D.sc.filter(x => x.pri).slice(0, 4).map(x => ['@' + x.id, x.t]) }); }
          ST = null; save(); paint(); return;
        }
        if (s0.r && s0.r.slots && s0.r.slots.region) s0.r.slots.region = regionOf(IX, s0.r.slots.region.code);
        ST = s0; delete ST.r;
        if (ST.a.region && ST.a.region.code) ST.a.region = regionOf(IX, ST.a.region.code) || ST.a.region;
        const sc = D.sc.find(x => x.id === ST.id);
        bot(`알겠어요. ‘${sc.t}’ 기준으로 바로 계산해 볼게요.`);
      } else {
        if (qv !== undefined && String(qv)[0] === '@') { ST = C().chatStart('', D, ctx, mem); ST.id = String(qv).slice(1); ST.a = {}; ST.from = {}; ST.skip = []; const sc = D.sc.find(x => x.id === ST.id); (sc.ask || []).forEach(k => { if (mem.m[k] != null) ST.a[k] = mem.m[k]; }); if (sc.id === 'find_home') ST.nf = C().narrowInit({}, D, ''); else if (GXon(sc)) ST.nf = XM(sc).init(sc.id, {}, D); bot(`알겠어요. ‘${sc.t}’ 기준으로 볼게요.`); }
        else {
          const r = C().chatAnswer(ST, t, D, ctx, qv);
          if (ST.a.region && ST.a.region.code && !ST.a.region.sd) ST.a.region = regionOf(IX, ST.a.region.code) || ST.a.region;
          if (r.switched) { ST = C().chatStart(t, D, ctx, mem); const sc = D.sc.find(x => x.id === ST.id); bot(`다른 고민이네요. ‘${sc.t}’ 기준으로 볼게요.`); }
          else if (!r.ok && t && aiOn()) {
            LOG.push({ who: 'bot', t: '…', typing: 1 }); paint();
            const rr = await aiAsk(ST, prev, t, D); LOG.pop();
            const P = rr ? C().aiPlan(rr, ST, D, ctx, t) : null;
            if (P && P.kind === 'fill') { Object.keys(P.a).forEach(k => { ST.a[k] = P.a[k]; ST.from[k] = '대화'; }); if (P.a.region && P.a.region.code) ST.a.region = regionOf(IX, P.a.region.code) || P.a.region; if (P.say) bot(P.say); }
            else if (P && P.kind === 'start') { ST = aiStart(P, t, D, ctx, mem); const sc = D.sc.find(x => x.id === ST.id); bot(`다른 고민이네요. ‘${sc.t}’ 기준으로 볼게요.`); }
            else if (P && P.kind === 'off') { bot(P.say || AI_OFF_MSG); save(); paint(); return; }
            else if (P && P.kind === 'ask') { aiQuestion(P); save(); paint(); return; }
            else r.ai = 0;
            if (r.ai !== 0) { LOG.push({ who: 'bot', t: '…', typing: 1 }); paint(); LOG.pop(); await think(D, IX); save(); paint(); return; }
          }
          if (!r.ok && !r.switched) {
            const nx = ST.asked ? (ST.asked.nf ? { key: ST.asked.key, nf: 1, q: ST.asked.ext && XM(D.sc.find(x => x.id === ST.id)) ? XM(D.sc.find(x => x.id === ST.id)).Q[ST.asked.key] : D.narrow.q[ST.asked.key] } : { key: ST.asked.key, q: D.q[ST.asked.key] }) : null;
            if (!nx) { ST.done = true; save(); return send(t); }
            bot('제가 잘 못 알아들었어요. ' + C().chatHint(nx), { quick: (C().chatNext(Object.assign({}, ST, { asked: null }), D, null) || { quick: [] }).quick.map(x => [String(x[0]), x[1]]) });
            save(); paint(); return;
          }
        }
      }
      LOG.push({ who: 'bot', t: '…', typing: 1 }); paint();
      LOG.pop();
      await think(D, IX); save(); paint();
    }
    el.querySelector('form').addEventListener('submit', e => { e.preventDefault(); const v = inp.value; inp.value = ''; send(v); });
    log.addEventListener('click', e => {
      const b = e.target.closest('[data-qv]'); if (b) { send('', b.dataset.qv, b.textContent); return; }
      const a = e.target.closest('a'); if (a && ST && ST.id && /solve\/\?s=/.test(a.getAttribute('href') || '')) { try { sessionStorage.setItem(IN, JSON.stringify({ a: stripA(ST.a), from: ST.from, nf: ST.nf && ST.nf.id ? ST.nf : undefined, t: Date.now() })); } catch (x) {} }
    });
    el.querySelector('[data-reset]').addEventListener('click', () => { ST = null; LOG = []; ls.del(CK); start0(); });
    el.querySelector('[data-form]').addEventListener('click', e => { e.preventDefault(); if (ST && ST.id) { try { sessionStorage.setItem(IN, JSON.stringify({ a: stripA(ST.a), from: ST.from, nf: ST.nf && ST.nf.id ? ST.nf : undefined, t: Date.now() })); } catch (x) {} location.href = solveUrl(ST.id, '&from=chat'); } else location.href = BASE + 'solve/'; });
    /* 휴대폰 키보드가 열리면 입력창을 키보드 위로 */
    if (root.visualViewport) { const vv = root.visualViewport, bar = el.querySelector('.gch-in'); const fit = () => { if (matchMedia('(max-width:600px)').matches) bar.style.bottom = Math.max(0, innerHeight - vv.height - vv.offsetTop) + 'px'; }; vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }
    function start0() {
      let first = null; try { first = sessionStorage.getItem(CIN); sessionStorage.removeItem(CIN); } catch (e) {}
      if (first) { ST = null; LOG = []; send(first); return; }
      if (!LOG.length) { bot(`안녕하세요, ${site()} 길잡이예요. 어떤 고민이 있으세요? 문장 그대로 적어 주시면 바로 계산해 드리고, 필요한 것만 하나씩 여쭤볼게요.`, { quick: [['@buy_when', '내 집 마련, 언제 살까'], ['@find_home', '조건에 맞는 아파트 찾기'], ['@jeonse_renew', '전세 만기 재계약'], ['@cy_where', '청약 당첨 가능성']] }); save(); }
      paint();
    }
    start0();
    warm();
    return true;
  }

  root.JDJ_GUIDE = { on, load, mountTop, mountFlow, mountChat, logMiss, memory, warm };
})(typeof window !== 'undefined' ? window : this);
