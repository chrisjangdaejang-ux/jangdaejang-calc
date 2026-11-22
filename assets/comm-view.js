/* 내 집 시세 화면의 '상가·건물' 탭 — mine/index.html 의 #mtabs(아파트|오피스텔|상가·건물)·#commSec 를 쓴다.
   계산 규칙은 assets/comm-core.js(JDJ_COMM), 금액·날짜 표기는 assets/mine-core.js(JDJ_MINE).
   자료: jangdaejang-data data/comm/index.json, comm/{구}.json, index.json(시·도·구 이름)
   URL: ?t=c&cg=구코드&ck=c|g&cb=동|지번 (아파트 탭의 sd·d·b, 오피스텔 탭의 og·ob 와 겹치지 않게 따로 씀) */
(function () {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const DATA = JB.DATA + 'data/';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const C = {};
  const getJ = u => C[u] || (C[u] = fetch(DATA + u, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(u); return r.json(); }).catch(e => { delete C[u]; throw e; }));
  let M, K, IX = null, CX = null, DOC = null, inited = false;
  const S = { sd: '', g: '', k: 'c', d: '', key: '', span: 0 };
  const won = v => M.won(v), ymL = v => M.ymLabel(v), ymK = v => M.ymKo(v);
  const sggName = c => ((IX && IX.sgg[c]) || {}).name || c;
  const sidoName = c => ((IX && IX.sgg[c]) || {}).sido || '';
  const sdOf = c => { const s = IX && IX.sido.find(x => x.name === sidoName(c)); return s ? s.id : ''; };
  const sdShort = c => { const s = IX && IX.sido.find(x => x.name === sidoName(c)); return (s && s.short) || sidoName(c); };
  const ready = () => CX && CX.status === 'ok';
  const pct = v => v == null ? '-' : (v > 0 ? '+' : '') + (v * 100).toFixed(1) + '%';
  const updown = v => v == null ? '' : v > 0.0005 ? 'up' : v < -0.0005 ? 'dn' : '';
  const TN = k => K.TYPES[k].short;

  function css() {
    if ($('commCss')) return;
    const st = document.createElement('style'); st.id = 'commCss';
    st.textContent = `.cm-seg{display:inline-grid;grid-template-columns:1fr 1fr;gap:4px;background:#F2F4F6;border-radius:12px;padding:4px;margin:4px 0 2px;width:100%;max-width:420px}
.cm-seg button{font:inherit;font-size:15px;font-weight:700;border:0;background:transparent;color:#4E5968;min-height:44px;border-radius:9px;cursor:pointer;padding:0 6px;word-break:keep-all}
.cm-seg button.on{background:#fff;color:#2560E8;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.cm-def{background:#F5F8FF;border:1px solid #C9D8FF;border-radius:14px;padding:12px 14px;font-size:15px;line-height:1.65;margin:10px 0}
.cm-def b{color:#1F56E0}
.cm-rows{display:grid;gap:8px;margin-top:8px}
.cm-row{border:1px solid var(--line);border-radius:14px;padding:10px 12px;min-width:0}
.cm-row .k{font-size:14px;font-weight:700;color:#3E4754}
.cm-row .v{font-size:17px;font-weight:900;word-break:keep-all;overflow-wrap:anywhere}
.cm-row .d{font-size:13.5px;color:#4E5968;line-height:1.55;overflow-wrap:anywhere}
.cm-row.no{background:#FAFAFB}
.cm-row.no .v{font-size:15px;color:#8B95A1}
.cm-src{font-size:12.5px;color:#8B95A1;margin-top:2px}
.cm-prep{border:1px dashed #C9D8FF;background:#F8FAFF;border-radius:16px;padding:14px 16px;font-size:15px;line-height:1.7}
.cm-prep b{color:#1F56E0}
.cm-wait{border:2px dashed #D9C27A;background:#FFFBEF;border-radius:14px;padding:12px 14px;font-size:15.5px;font-weight:800;line-height:1.6;color:#6B5310}
.cm-chart{width:100%;min-height:150px}
.cm-chart svg{display:block;width:100%;height:auto}
.cm-lg{display:flex;gap:14px;flex-wrap:wrap;font-size:13.5px;color:#4E5968;margin-top:4px}
.cm-lg i{display:inline-block;width:18px;height:3px;border-radius:2px;vertical-align:middle;margin-right:5px}
.cm-lg i.gap{background:repeating-linear-gradient(90deg,#4E5968 0 3px,transparent 3px 7px);opacity:.55}
.cm-one{font-size:16.5px;font-weight:800;line-height:1.6;margin:6px 0 10px;word-break:keep-all}
.cm-score{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
.cm-score div{border:2px solid #B8942A;border-radius:14px;padding:6px 12px;text-align:center;min-width:84px}
.cm-score b{display:block;font-size:24px;font-weight:900}
.cm-score small{font-size:13px;color:#4E5968;font-weight:700}
.cm-tbl td small{display:block;color:#6B7684;font-size:12.5px;line-height:1.4}
.cm-tbl td{vertical-align:top}
.cm-tbl table{font-size:14px}
.cm-mapl{display:inline-flex;align-items:center;min-height:32px;padding:0 8px;margin-left:4px;border:1px solid #C9D8FF;border-radius:999px;font-size:12.5px;font-weight:700;color:#2560E8;text-decoration:none}
.cm-trs{margin-top:6px}
.cm-tr{border-bottom:1px solid var(--line);padding:9px 2px}
.cm-tr .a{display:flex;justify-content:space-between;gap:10px;align-items:baseline;font-size:15px}
.cm-tr .a>span{min-width:0;overflow-wrap:anywhere}
.cm-tr .a b{white-space:nowrap;font-size:16px}
.cm-tr .b{font-size:13.5px;color:#4E5968;line-height:1.5;margin-top:2px;word-break:keep-all;overflow-wrap:anywhere}
.cm-tbl td,.cm-tbl th{padding:8px 4px}
.cm-tbl td:first-child{word-break:keep-all}
.cm-det{border-top:1px solid var(--line);margin:0}
.cm-det:first-of-type{border-top:0}
.cm-det>summary{list-style:none;cursor:pointer;padding:12px 2px;min-height:44px;display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center}
.cm-det>summary::-webkit-details-marker{display:none}
.cm-det>summary .t{font-size:16px;font-weight:800;color:#191F28}
.cm-det>summary .s{grid-column:1;font-size:14px;color:#4E5968;line-height:1.5;word-break:keep-all;overflow-wrap:anywhere}
.cm-det>summary .m{grid-column:2;grid-row:1/span 2;font-size:13.5px;font-weight:700;color:#2560E8;white-space:nowrap}
.cm-det[open]>summary .m::after{content:' 접기'}
.cm-det[open]>summary .m span{display:none}
.cm-det>.cm-db{padding:0 0 12px}
.cm-more{font:inherit;font-size:14.5px;font-weight:700;color:#2560E8;background:#F5F8FF;border:1px solid #C9D8FF;border-radius:10px;min-height:44px;width:100%;margin-top:8px;cursor:pointer}
.cm-x{display:none}
.cm-open .cm-x{display:revert}
.cm-q>summary{cursor:pointer;font-size:14.5px;font-weight:700;color:#2560E8;padding:10px 0 4px}
.cm-sum{margin:0;padding-left:18px;font-size:15px;line-height:1.65}
.cm-sum li{margin:2px 0;word-break:keep-all}
.cm-pick{grid-template-columns:1fr 1fr!important;gap:8px 10px}
.cm-pick select{min-width:0;width:100%}
.cm-links{display:flex;flex-wrap:wrap;gap:8px}
.cm-links a{flex:1 1 100px;border:1px solid var(--line);border-radius:12px;padding:10px 6px;font-size:13.5px;word-break:keep-all;font-weight:700;text-decoration:none;color:#191F28;text-align:center}
.cm-links a.main{border-color:#C9D8FF;background:#F5F8FF;color:#1F56E0}
.cm-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}
.cm-stats .st{padding:10px 12px}
@media(min-width:720px){.cm-stats{grid-template-columns:repeat(4,1fr)}}
.cm-mask{display:inline-block;font-size:12px;font-weight:700;color:#6B7684;background:#F2F4F6;border-radius:6px;padding:0 5px;margin-left:3px}
.cm-est{border-style:dashed;white-space:nowrap}`;
    document.head.appendChild(st);
  }

  /* ---------- 탭 (오피스텔 탭과 같은 숨김 기록을 같이 씀: window.JDJ_TABWAS) ---------- */
  const HIDE = ['homesSec', 'findSec', 'res', 'src'];
  function setTab(t, push) {
    const tabs = $('mtabs'), sec = $('commSec'); if (!tabs || !sec) return;
    const was = (window.JDJ_TABWAS = window.JDJ_TABWAS || {});
    tabs.querySelectorAll('[data-t]').forEach(b => { const on = b.dataset.t === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    if (t === 'c') {
      HIDE.forEach(id => { const el = $(id); if (el) { if (!(id in was)) was[id] = el.hidden; el.hidden = true; } });
      sec.hidden = false;
      if (!inited) init();
      ['askBox'].concat([...document.querySelectorAll('main > p.lead')].map(x => (x.id = x.id || 'mineLead'))).forEach(id => { const el = $(id); if (el && !el.hidden) { el.hidden = true; el.dataset.cmHid = '1'; } });
    } else {
      sec.hidden = true;
      document.querySelectorAll('[data-cm-hid]').forEach(el => { el.hidden = false; delete el.dataset.cmHid; });
    }
    if (push) {
      const u = new URL(location.href);
      ['cg', 'ck', 'cb'].forEach(k => u.searchParams.delete(k));
      if (t === 'c') { u.searchParams.set('t', 'c'); ['og', 'ob'].forEach(k => u.searchParams.delete(k)); }
      history.replaceState(null, '', u);
    }
  }

  /* ---------- 자료 ---------- */
  async function init() {
    inited = true; css();
    const sec = $('commSec');
    sec.innerHTML = '<div class="loading">상가·건물 자료를 불러오는 중이에요…</div>';
    try { IX = await getJ('index.json'); } catch (e) { sec.innerHTML = '<div class="empty">자료를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.</div>'; return; }
    CX = await getJ('comm/index.json').catch(() => null);
    shell();
    const q = new URLSearchParams(location.search), cg = q.get('cg') || '', cb = q.get('cb') || '';
    if (q.get('ck') === 'g') S.k = 'g';
    segOn();
    const sd = /^\d{5}$/.test(cg) && sdOf(cg) ? sdOf(cg) : (IX.sido.find(s => s.short === '서울') || IX.sido[0]).id;
    await pickSido(sd, cg, cb);
  }
  function shell() {
    const n = CX && CX.n;
    $('commSec').innerHTML = `
    <section class="panel" aria-labelledby="cmT">
      <h2 id="cmT">상가·건물 찾기<small>시·군·구를 고르면 그 지역 상가·건물 시세를 보여 드려요.</small></h2>
      ${ready() ? '' : `<div class="cm-prep"><b>상가·건물 실거래 자료를 준비하고 있어요.</b><br>국토교통부 상업업무용 부동산 실거래 자료가 들어오는 대로 시세를 자동으로 보여 드려요. 지금은 시·군·구를 고르면 그 지역 상권·수요 공식 통계를 먼저 볼 수 있어요.</div>`}
      <div class="cm-seg" role="group" aria-label="상가·건물 종류" id="cmSeg"><button type="button" data-k="c" aria-pressed="true">구분상가·사무실<br><small style="font-weight:600">건물 안 한 칸</small></button><button type="button" data-k="g" aria-pressed="false">통건물<br><small style="font-weight:600">건물 한 채 전체</small></button></div>
      <div class="pick cm-pick" style="margin-top:10px">
        <div><label for="cmSd">시·도</label><select id="cmSd"></select></div>
        <div><label for="cmG">시·군·구</label><select id="cmG"><option value="">시·군·구 선택</option></select></div>
        <div id="cmDw"><label for="cmD">동</label><select id="cmD" disabled><option value="">동 선택</option></select></div>
        <div id="cmBw"><label for="cmB">건물(지번)</label><select id="cmB" disabled><option value="">건물 선택</option></select></div>
      </div>
      <details id="cmQw" class="cm-q"><summary>지번으로 건물 찾기</summary>
      <div class="pick"><div class="full"><label for="cmQ" style="position:absolute;left:-9999px">지번</label><input id="cmQ" type="search" inputmode="numeric" placeholder="예: 828-10 (선택한 시·군·구 안)" autocomplete="off" enterkeyhint="search"></div></div>
      <div class="sres" id="cmSres" aria-live="polite"></div></details>
      <div id="cmMsg" class="note" aria-live="polite"></div>
    </section>
    <section id="cmRes" hidden aria-live="polite"></section>
    <p class="disc">자료: ${esc(((CX && CX.src) || {}).trade || '국토교통부 상업업무용 부동산 매매 실거래가')}${n && (n.c || n.g) ? ` — 구분상가·사무실 ${n.c.toLocaleString()}건 · 통건물 ${n.g.toLocaleString()}건(${ymL(CX.hm)}~${ymL(CX.to)} 계약)` : ''}. 해제(취소) 신고된 거래는 빼고, 직거래와 지분 거래는 목록에만 보여 주고 시세 계산에서는 빼요. 상가·사무실 임대료는 실거래처럼 신고되는 공개 자료가 없어요.</p>`;
    const first = ['서울', '경기', '인천'];
    const list = [...IX.sido].sort((a, b) => { const ia = first.indexOf(a.short), ib = first.indexOf(b.short); return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib) || a.name.localeCompare(b.name, 'ko'); });
    $('cmSd').innerHTML = list.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
    $('cmSd').onchange = () => pickSido($('cmSd').value);
    $('cmG').onchange = () => pickSgg($('cmG').value);
    $('cmD').onchange = () => pickDong($('cmD').value);
    $('cmB').onchange = () => { if ($('cmB').value) showUnit($('cmB').value, { scroll: true }); else { S.key = ''; render(); } };
    $('cmSeg').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b || b.dataset.k === S.k) return; S.k = b.dataset.k; S.key = ''; segOn(); fillDong(); setUrl(); render(); });
    let qt = null;
    $('cmQ').addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(runSearch, 200); });
    $('cmQ').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } });
    $('cmSres').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; $('cmSres').innerHTML = ''; $('cmQ').value = ''; showUnit(b.dataset.k, { scroll: true }); });
  }
  function segOn() {
    $('cmSeg').querySelectorAll('[data-k]').forEach(b => { const on = b.dataset.k === S.k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    const c = S.k === 'c';
    ['cmDw', 'cmBw', 'cmQw'].forEach(id => { $(id).hidden = !c; });
  }
  async function pickSido(id, keepG, keepB) {
    S.sd = id; $('cmSd').value = id;
    const nm = (IX.sido.find(s => s.id === id) || {}).name;
    const has = g => !ready() || !!(CX.sgg[g]);
    const list = Object.keys(IX.sgg).filter(k => IX.sgg[k].sido === nm && has(k)).sort((a, b) => sggName(a).localeCompare(sggName(b), 'ko'));
    $('cmG').innerHTML = '<option value="">시·군·구 선택</option>' + list.map(k => `<option value="${k}">${esc(sggName(k))}</option>`).join('');
    ['cmD', 'cmB'].forEach(x => { $(x).disabled = true; });
    if (keepG && list.includes(keepG)) { $('cmG').value = keepG; await pickSgg(keepG, keepB); }
  }
  async function pickSgg(g, keepB) {
    S.g = g; S.key = ''; DOC = null; $('cmSres').innerHTML = '';
    $('cmD').innerHTML = '<option value="">동 선택</option>'; $('cmB').innerHTML = '<option value="">건물 선택</option>';
    $('cmD').disabled = $('cmB').disabled = true;
    if (!g) { $('cmRes').hidden = true; return; }
    if (window.JDJ_ADSLOT && JDJ_ADSLOT.setRegion) JDJ_ADSLOT.setRegion({ code: g });
    $('cmMsg').textContent = '자료를 불러오는 중이에요…';
    try { DOC = await getJ('comm/' + g + '.json'); } catch (e) { DOC = { units: [] }; }
    $('cmMsg').textContent = '';
    if (S.g !== g) return;
    fillDong();
    const kd = (keepB || '').split('|')[0];
    if (keepB && kd) { S.k = 'c'; segOn(); fillDong(); if (K.dongs(DOC.units).includes(kd)) { $('cmD').value = kd; pickDong(kd, keepB); return; } }
    setUrl(); render();
  }
  function fillDong() {
    if (!DOC) return;
    const ds = K.dongs(DOC.units);
    $('cmD').innerHTML = `<option value="">동 선택 (${ds.length}개)</option>` + ds.map(d => `<option>${esc(d)}</option>`).join('');
    $('cmD').disabled = !ds.length; $('cmB').disabled = true;
    $('cmB').innerHTML = '<option value="">건물 선택</option>';
  }
  function pickDong(d, keepB) {
    S.d = d; if (!DOC) return;
    const list = K.inDong(DOC.units, d);
    $('cmB').innerHTML = `<option value="">건물 선택 (${list.length}곳)</option>` + list.map(u => `<option value="${esc(K.keyOf(u))}">${esc(u.j)}${u.u ? ' · ' + esc(u.u) : ''} · 3년 ${u.t.length}건</option>`).join('');
    $('cmB').disabled = !list.length;
    if (keepB && list.some(u => K.keyOf(u) === keepB)) { $('cmB').value = keepB; showUnit(keepB); }
    else if (!keepB) { S.key = ''; render(); }
  }
  function runSearch() {
    const q = $('cmQ').value.trim(), box = $('cmSres');
    if (!q) { box.innerHTML = ''; return; }
    if (!DOC) { box.innerHTML = '<div class="none">먼저 시·군·구를 골라 주세요.</div>'; return; }
    const hits = K.findJibun(DOC.units, q);
    box.innerHTML = hits.length ? hits.map(u => `<button type="button" data-k="${esc(K.keyOf(u))}"><b>${esc(u.d)} ${esc(u.j)}</b><small>${esc(u.u || '')} · ${esc(u.lu || '')} · 최근 3년 거래 ${u.t.length}건</small></button>`).join('')
      : `<div class="none">'${esc(q)}' 지번의 구분상가·사무실 건물을 ${esc(sggName(S.g))}에서 찾지 못했어요. 최근 3년 안에 거래가 있었던 건물만 찾을 수 있어요.</div>`;
  }
  function setUrl() {
    const u = new URL(location.href); u.searchParams.set('t', 'c');
    if (S.g) u.searchParams.set('cg', S.g); else u.searchParams.delete('cg');
    if (S.k === 'g') u.searchParams.set('ck', 'g'); else u.searchParams.delete('ck');
    if (S.key) u.searchParams.set('cb', S.key); else u.searchParams.delete('cb');
    history.replaceState(null, '', u);
  }
  function showUnit(key, opt) {
    if (!DOC) return;
    const u = (DOC.units || []).find(x => K.keyOf(x) === key); if (!u) return;
    S.k = 'c'; segOn(); S.key = key;
    if ($('cmD').value !== u.d) { $('cmD').value = u.d; pickDong(u.d, key); return; }
    $('cmB').value = key; setUrl(); render();
    if (opt && opt.scroll) $('cmRes').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- 차트 ----------
     아파트·오피스텔 화면과 같은 공용 차트(assets/price-sheet.js JDJ_PRICE.mount): 세로 안내선·값 칸(달·값·거래 건수)·손가락으로 문지르기·화살표 키.
     거래가 드물어 noFill — 거래 없던 달은 값을 만들지 않고 '거래 없음'(점선은 앞뒤 실제 값을 잇기만). */
  const P = () => window.JDJ_PRICE;
  function chart(el, lines, months, rows, cnt, aria, h) {
    if (!P()) return;
    P().mount(el, { months, fs: 13.5, h: h || 220, L: 44, min: 2, pad: 0.12, noFill: true, fmtY: m2fmt, aria, empty: '차트로 보여 드릴 값이 적어요.',
      lines, tip: P().tipFn({ months, rows, cnt, cntK: '매매', noFill: true }) });
  }
  const COL = { all: '#2560E8', com: '#B8942A', res: '#0E9F6E', etc: '#8B95A1' };
  const spans = (n, cur) => `<div class="seg2" role="group" aria-label="기간">${[12, 36].filter(m => m < n).map(m => ({ s: m, l: m / 12 + '년' })).concat([{ s: 0, l: '전체' }]).map(b => `<button type="button" data-cmspan="${b.s}" class="${b.s === cur || (!b.s && (!cur || cur >= n)) ? 'on' : ''}" aria-pressed="${b.s === cur}">${b.l}</button>`).join('')}</div>`;
  const cut = (a, months, span) => { if (!span || span >= months.length) return { a, months }; const k = months.length - span; return { a: a.map(x => x.slice(k)), months: months.slice(k) }; };
  const m2fmt = v => Math.round(v).toLocaleString() + '만';
  const perM2 = v => '㎡당 ' + K.perM2(v);
  function drawCharts() {
    if (!DOC || !DOC.ser) return;
    const el = $('cmCP');
    if (el) {
      const rs = K.regionSeries(DOC, S.k), keys = ['etc', 'res', 'com', 'all'].filter(k => rs.lines[k] && rs.lines[k].some(v => v > 0));
      const w = cut(keys.map(k => rs.lines[k]).concat([rs.counts]), rs.months, S.span), cnt = new Map(w.months.map((ym, i) => [ym, w.a[keys.length][i] || 0]));
      chart(el, keys.map((k, i) => ({ a: w.a[i], c: COL[k], w: k === 'all' ? 2.8 : 1.8 })), w.months,
        keys.slice().reverse().map(k => ({ k: K.LU[k], a: w.a[keys.indexOf(k)], c: COL[k], fmt: perM2 })), cnt, '용도지역별 전용 ㎡당 가격 추이');
    }
    const eu = $('cmCU'), u = S.key && (DOC.units || []).find(x => K.keyOf(x) === S.key);
    if (eu && u) {
      const us = K.unitSeries(u, DOC), w = cut([us.s], us.months, S.span), from = M.ymAdd(DOC.to, -35), c = {};
      (u.t || []).forEach(t => { const ym = String(t[0]).slice(0, 6); c[ym] = (c[ym] || 0) + 1; });
      const cnt = new Map(w.months.filter(ym => ym >= from).map(ym => [ym, c[ym] || 0]));   // 거래 목록은 최근 3년만 있어서 그 3년만 셈
      chart(eu, [{ a: w.a[0], c: '#2560E8', w: 2.6 }], w.months, [{ k: '이 건물', a: w.a[0], c: '#2560E8', fmt: perM2 }], cnt, '이 건물 전용 ㎡당 가격 추이', 200);
    }
  }

  /* ---------- 화면 ---------- */
  function rowsHtml(rows) {
    return `<div class="cm-rows">${rows.map(r => `<div class="cm-row${r.ok ? '' : ' no'}"><div class="k">${esc(r.label)}</div>
      <div class="v">${r.ok ? esc(r.value) : '확인 불가'}</div>${r.note ? `<div class="d">${esc(r.note)}</div>` : ''}
      ${r.src ? `<div class="cm-src">출처: ${esc(r.src)}</div>` : ''}</div>`).join('')}</div>`;
  }
  /* 지도에서 보기(assets/mapjump.js): 구분상가 건물은 동·지번(좌표 u.xy 가 공개 자료에 생기면 그 자리), 통건물은 지번이 가려져 있어 동 가운데(동을 안 골랐으면 시·군·구 가운데) */
  function mjOf(u) {
    if (u) { const us = K.unitSeries(u, DOC), l = K.latest(us.s, us.months) || K.lastAny(us.s, us.months);
      return { kind: 'c', g: S.g, dong: u.d, jibun: u.j, name: `${u.d} ${u.j}${u.u ? ' ' + u.u : ''}`, price: l ? Math.round(l.v * u.a / 100) * 100 : 0, ll: Array.isArray(u.xy) ? [u.xy[1], u.xy[0]] : null }; }
    const dn = S.k === 'g' ? '' : (S.d || '');
    return { kind: S.k === 'g' ? 'g' : 'c', g: S.g, dong: dn, name: `${sggName(S.g)}${dn ? ' ' + dn : ''} ${S.k === 'g' ? '통건물' : '상가·사무실'}` };
  }
  function unitPanel(u) {
    const us = K.unitSeries(u, DOC), last = K.latest(us.s, us.months), any = K.lastAny(us.s, us.months), tr = K.unitTrades(u);
    const val = p => Math.round(p * u.a / 100) * 100;
    const hiBox = (k, h) => h ? `<div><div class="k">${k}</div><div class="v">${won(h[0])}</div><div class="d">${ymL(String(h[1]).slice(0, 6))} · 전용 ${h[2]}㎡ · ㎡당 ${K.perM2(h[0] / h[2])}</div></div>` : '';
    return `<div class="panel cm-list">
      <div class="dhead"><div><h2>${esc(u.d)} ${esc(u.j)}${u.u ? ` <small style="font-size:15px;color:#4E5968">${esc(u.u)}</small>` : ''}</h2><div class="loc">${esc(sidoName(S.g))} ${esc(sggName(S.g))} ${esc(u.d)} ${esc(u.j)} · ${esc(u.lu || '')}${u.by ? ` · ${u.by}년 준공` : ''} · 대표 전용 ${u.a}㎡</div>${window.JDJ_MAPJ ? `<div class="mapj-row">${JDJ_MAPJ.btn(mjOf(u), 'top', '', 'comm_to_map')}</div>` : ''}</div></div>
      <p class="cm-one">이 건물의 구분상가·사무실은 ${last ? `최근 3개월 거래 기준 전용 ㎡당 ${K.perM2(last.v)}(3.3㎡당 약 ${K.perPy(last.v)})에 거래됐어요.` : any ? `${ymK(any.at)}에 마지막으로 전용 ㎡당 ${K.perM2(any.v)}에 거래됐고, 최근 3개월에는 거래가 없어요.` : '시세에 쓸 수 있는 거래(직거래·지분 거래 제외)가 없어요.'}</p>
      <div class="stats">
        <div class="st key"><div class="k">대표 전용 ${u.a}㎡ 환산</div><div class="v">${last ? won(val(last.v)) : any ? won(val(any.v)) : '확인 불가'}</div><div class="d">${last ? ymL(last.at) + ' 기준' : any ? ymL(any.at) + ' 마지막 거래 기준' : '시세 계산에 쓸 거래가 없어요'}</div></div>
        <div class="st"><div class="k">최근 3년 거래</div><div class="v">${tr.length}건</div><div class="d">수집한 전체 ${u.n}건</div></div>
      </div>
      ${u.hi ? `<div class="hib">${hiBox(`㎡당 최고가 (${ymK(DOC.hm)} 이후)`, u.hi)}${hiBox('최근 1년 ㎡당 최고가', u.hi1)}</div>` : ''}
      <div class="chead" style="margin-top:12px"><h3>이 건물 전용 ㎡당 가격 추이</h3></div><div class="cm-chart" id="cmCU"></div>
      <p class="basis">각 달 값 = 이 건물의 그 달까지 3개월 매매 실거래 전용 ㎡당 가격 중간값(직거래·지분 거래 제외). 그래프 위에서 손가락이나 마우스를 움직이면 그 달의 값과 거래 건수가 위 칸에 나와요. 흐린 점선은 거래가 없던 기간이고, 점선 위의 달에는 값이 없어요. 같은 건물이라도 층·위치(1층 길가인지)에 따라 값 차이가 커요.</p>
      ${tr.length ? `<div class="tbl cm-tbl"><table><thead><tr><th>계약일</th><th class="num">전용·층</th><th class="num">거래금액</th></tr></thead><tbody>${moreBox(tr.slice(0, 30).map(t => `<tr><td>${esc(t.date)}</td><td class="num">${t.area}㎡<small>${t.floor != null ? t.floor + '층' : '층 정보 없음'}</small></td><td class="num">${t.hi ? '<span class="jps-new">신고가</span> ' : ''}<b>${won(t.amt)}</b><small>㎡당 ${K.perM2(t.amt / t.area)}${t.direct ? ' · 직거래' : ''}${t.share ? ' · 지분' : ''}</small></td></tr>`), 5)}</tbody></table></div>${moreBtn(5, Math.min(30, tr.length), '거래')}
      <p class="basis"><span class="jps-new">신고가</span> = 같은 건물 같은 전용면적에서 그 전까지 가장 높았던 값보다 비싸게 거래된 경우(수집 자료 기준, 직거래·지분 거래 제외).</p>` : ''}
    </div>`;
  }
  /* 접는 칸: 제목 · 한 줄 요약 · '자세히 보기' (리포트 분석 설명과 같은 순서: 결론 → 요약 → 자세히) */
  const det = (t, sum, body, open) => `<details class="cm-det"${open ? ' open' : ''}><summary><span class="t">${esc(t)}</span><span class="s">${esc(sum)}</span><span class="m"><span>자세히 보기</span></span></summary><div class="cm-db">${body}</div></details>`;
  /* 목록 앞 n개만, 나머지는 '더보기' */
  const moreBox = (items, n, label) => items.length <= n ? items.join('')
    : items.slice(0, n).join('') + items.slice(n).map(x => x.replace(/^<(\w+) class="/, '<$1 class="cm-x ').replace(/^<(\w+)>/, '<$1 class="cm-x">')).join('');
  const moreBtn = (n, all, label) => all > n ? `<button type="button" class="cm-more" data-cmmore aria-expanded="false">${esc(label)} 더보기 (${(all - n).toLocaleString()}건 더)</button>` : '';
  function render() {
    const r = $('cmRes'); if (!S.g) { r.hidden = true; return; }
    const g = S.g, k = S.k, s = (CX && CX.sgg[g]) || {}, sk = (s.k || {})[k] || null, sum = ((DOC && DOC.sum) || {})[k] || null;
    const nm = sggName(g), tn = TN(k), u = S.key && DOC && (DOC.units || []).find(x => K.keyOf(x) === S.key);
    const rs = DOC && DOC.ser ? K.regionSeries(DOC, k) : null, last = rs ? K.latest(rs.lines.all || [], rs.months) : null;
    const y = sum && sum.y, yb = sum && sum.yb;
    const one = !ready() ? `${nm}의 상가·건물 실거래 자료를 준비하고 있어요. 아래 상권·수요 통계를 먼저 확인해 보세요.`
      : !sum ? `${nm}에는 최근 ${tn} 매매 거래가 없어요.`
      : `${nm} ${tn}은 ${last ? `최근 3개월 거래 기준 ${K.TYPES[k].unit} ${K.perM2(last.v)}(3.3㎡당 약 ${K.perPy(last.v)})이에요` : '최근 3개월 동안 시세를 낼 만큼 거래가 없었어요'}${y && y.c != null ? `. 최근 1년 중간값은 그 전 1년보다 ${Math.abs(y.c * 100).toFixed(1)}% ${y.c >= 0 ? '올랐어요' : '내렸어요'}` : ''}.`;
    const hiBox = (lab, t) => { if (!t) return ''; const x = K.trades([t])[0], p = K.tradePpm(x, k); return `<div><div class="k">${lab}</div><div class="v">${won(x.amt)}</div><div class="d">${esc(x.date)} · ${esc(x.dong)} ${esc(x.jibun)} · ${esc(x.use)}${p ? ` · ${K.TYPES[k].unit} ${K.perM2(p)}` : ''}</div></div>`; };
    const lg = rs ? ['all', 'com', 'res', 'etc'].filter(x => rs.lines[x] && rs.lines[x].some(v => v > 0)) : [];
    const dongAll = ((DOC && DOC.dong) || []).filter(x => x[1] === k);
    const trs = K.trades(((DOC && DOC.tr) || {})[k]).slice(0, 30);
    const sc = sk && sk.sc && K.passed(CX).filter(h => sk.sc[h] != null);
    const skr = K.skRows(DOC && DOC.sk), sks = K.skSummary(DOC && DOC.sk), shop = DOC && DOC.shop, rone = K.roneRows(DOC && DOC.rone);
    const av = (CX && CX.avail) || {}, src = (CX && CX.src) || {};
    const isSeoul = sidoName(g) === '서울특별시';
    const dem = K.demandRows(s, CX, DOC), sup = K.supplyRow(s, CX);
    const lastOf = rs ? (key => { const a = rs.lines[key]; const l = a && K.latest(a, rs.months); return l ? K.perM2(l.v) : null; }) : () => null;
    /* 한 줄 요약들 */
    const sumTrend = rs && lg.length ? lg.filter(x => x !== 'all' && lastOf(x)).map(x => `${K.LU[x]} ${lastOf(x)}`).join(' · ') || `전체 ${lastOf('all') || '-'}` : '';
    const sumSk = skr.length ? (sks ? `서울시 지정 상권 ${sks.n}곳 중 ${sks.up}곳은 매출이 늘고 ${sks.down}곳은 줄었어요(${K.qLabel(sks.q)}).` : '상권 매출 변화를 계산할 만큼 자료가 없어요.')
      : (isSeoul ? '이 구의 상권 자료를 아직 받지 못했어요.' : '상권별 매출은 서울만 있어 이 지역은 확인 불가예요.');
    const sumRone = rone.length ? rone[0].items.slice(0, 2).map(i => `${i.label} ${i.v}${i.unit}`).join(' · ') + ` (${rone[0].area})` : '확인 불가 — 상가 임대료는 신고되는 공개 자료가 없어요.';
    const okDem = dem.filter(x => x.ok);
    const sumDem = okDem.length ? okDem.slice(0, 2).map(x => `${x.label.replace(/\(.*\)/, '').trim()} ${x.value}`).join(' · ') : '확인 가능한 통계가 아직 없어요.';
    r.hidden = false;
    r.innerHTML = `${u ? unitPanel(u) : ''}
    <div class="panel">
      <div class="dhead"><div><h2>${esc(nm)} ${esc(tn)} 시세</h2><div class="loc">${esc(K.TYPES[k].long)}</div>${!u && window.JDJ_MAPJ ? `<div class="mapj-row">${JDJ_MAPJ.btn(mjOf(null), 'top', '', 'comm_to_map')}</div>` : ''}</div></div>
      <p class="cm-one">${esc(one)}</p>
      ${sum ? `<div class="cm-stats">
        <div class="st key"><div class="k">${esc(K.TYPES[k].unit)}</div><div class="v">${last ? K.perM2(last.v) : '확인 불가'}</div><div class="d">${last ? `3.3㎡당 약 ${K.perPy(last.v)}` : '최근 3개월 거래가 적어요'}</div></div>
        <div class="st"><div class="k">1년 변화</div><div class="v">${y && y.c != null ? `<span class="${updown(y.c)}">${pct(y.c)}</span>` : '-'}</div><div class="d">1년 중간값 비교</div></div>
        <div class="st"><div class="k">최근 1년 거래</div><div class="v">${sum.n1.toLocaleString()}건</div><div class="d">${last ? ymL(last.at) + ' 기준' : ''}</div></div>
        ${k === 'g' ? `<div class="st"><div class="k">연면적 ㎡당</div><div class="v">${yb && yb.now ? K.perM2(yb.now) : '확인 불가'}</div><div class="d">최근 1년 중간값</div></div>`
          : `<div class="st"><div class="k">신고가</div><div class="v">${(sum.nh1 || 0).toLocaleString()}건</div><div class="d">최근 1년</div></div>`}
      </div>` : ''}
      ${rs && lg.length ? det('용도지역별 가격 추이', sumTrend, `${spans(rs.months.length, S.span)}<div class="cm-chart" id="cmCP"></div>
        <div class="cm-lg">${lg.map(x => `<span><i style="background:${COL[x]}"></i>${esc(K.LU[x])}</span>`).join('')}<span><i class="gap"></i>거래가 적던 기간</span></div>
        <p class="basis">각 선은 땅의 용도(용도지역)별로 나눠 계산했어요. 상업지역은 큰길가 상가·빌딩이 많은 곳, 주거지역은 주택가 안 근린상가가 많은 곳이에요. 거래가 적던 달은 값을 비우고 흐린 점선으로 앞뒤만 이어요(점선 위의 달에는 값이 없어요). 그래프 위에서 손가락이나 마우스를 움직이면 그 달의 값과 거래 건수가 위 칸에 나와요.${CX && CX.hm ? ` 이 화면의 실거래는 ${ymK(CX.hm)}부터 모았어요.` : ''}</p>`) : ''}
      ${sum ? det('최고가와 계산 근거', `최근 1년 ${K.TYPES[k].unit} 최고 ${sum.hip ? K.perM2(K.tradePpm(K.trades([sum.hip])[0], k)) : '-'}`, `<div class="hib">${hiBox('최근 1년 최고 거래금액', sum.hi1)}${hiBox(`최근 1년 ${K.TYPES[k].unit} 최고`, sum.hip)}</div>
        <p class="basis"><b>계산 근거</b> · ${k === 'c' ? '구분상가·사무실은 전용면적(혼자 쓰는 넓이) 1㎡당 가격으로 비교해요.' : '통건물은 값의 대부분이 땅값이라 대지면적(땅 넓이) 1㎡당 가격으로 비교해요.'} 시세 = 그 달까지 3개월 매매 실거래 ㎡당 가격의 중간값(가운데 값)이에요. 3개월 동안 거래가 3건보다 적으면 값을 비워 둬요. 해제(취소)·직거래·지분 거래는 빼요.${k === 'c' ? ' 신고가 = 같은 건물·같은 면적의 이전 최고가보다 비싸게 거래된 경우예요.' : ''}</p>`) : ''}

      ${det('상권 흐름', sumSk, (skr.length ? `<div class="tbl cm-tbl"><table><thead><tr><th>상권</th><th class="num">분기 매출(추정)</th><th class="num">1년 변화</th></tr></thead><tbody>
        ${skr.slice(0, 10).map(x => `<tr><td>${esc(x.name)}<small>${esc(x.kind || '')}${x.stores != null ? ` · 가게 ${x.stores.toLocaleString()}곳` : ''}</small></td><td class="num">${K.eokWon(x.sales)}<small>${esc(K.qLabel(x.q))}</small></td><td class="num">${x.c != null ? `<span class="${updown(x.c)}">${pct(x.c)}</span>` : '-'}</td></tr>`).join('')}</tbody></table></div>
        <p class="basis">분기 매출은 서울시가 카드 결제 등으로 추정한 값이에요(실제 장부 매출이 아니에요). 매출 많은 순 10곳이에요.${av.stor ? '' : ' 상권별 가게 수·개업·폐업은 서울시 점포 자료를 받는 중이라 아직 확인 불가예요.'}</p><div class="cm-src">출처: ${esc(src.sk || '')}</div>` : '')
        + (shop ? `<div class="cm-row" style="margin-top:8px"><div class="k">영업 중인 가게 업종 구성</div><div class="v">${shop.n.toLocaleString()}곳 (${esc(K.qLabel(shop.at))})</div>
          <div class="d">${shop.mix.slice(0, 8).map(x => `${esc(x[0])} ${x[1].toLocaleString()}곳${x[2] != null ? `(${x[2] >= 0 ? '+' : ''}${x[2].toLocaleString()})` : ''}`).join(' · ')}${shop.prev ? ` — 괄호는 ${esc(K.qLabel(shop.prev))}보다 늘거나 준 수예요.` : ' — 업종별 변화는 다음 분기 자료가 쌓이면 비교해 드려요.'}</div><div class="cm-src">출처: ${esc(src.shop || '')}</div></div>`
          : `<div class="cm-row no" style="margin-top:8px"><div class="k">영업 중인 가게 수·업종 구성</div><div class="v">확인 불가</div><div class="d">${av.shop ? '이 지역 자료가 없어요.' : '소상공인시장진흥공단 상가(상권)정보를 받는 중이에요. 이 자료는 지금 영업 중인 가게만 알려 줘서, 변화는 분기마다 쌓은 뒤부터 비교할 수 있어요.'}</div><div class="cm-src">출처: ${esc(src.shop || '')}</div></div>`))}
      ${det('임대료·빈 가게 비율·수익률', sumRone, `<div class="cm-def"><b>상가 임대료는 실거래처럼 신고되는 공개 자료가 없어요.</b> 그래서 집코드는 한국부동산원이 분기마다 표본 건물을 조사해 발표하는 지역 평균(상업용부동산 임대동향조사)을 그대로 보여 드려요. <b>공실률</b>은 비어 있는 가게·사무실 비율, <b>투자수익률</b>은 1년 동안 받은 임대 수입과 건물값 변화를 합친 수익률이에요.</div>
        ${rone.length ? `<div class="cm-rows">${rone.map(x => `<div class="cm-row"><div class="k">${esc(x.area)} <small style="font-weight:600;color:#6B7684">(${esc(K.HOW[x.how] || '')})</small></div>
          <div class="d">${x.items.map(i => `${esc(i.label)} <b>${esc(i.v)}${esc(i.unit)}</b>${i.at ? ` (${esc(i.at)})` : ''}`).join(' · ')}</div></div>`).join('')}</div>
          <p class="basis">부동산원 조사 지역(상권)은 공식 경계 자료가 없어 이름이 이 시·군·구의 동 이름과 같은 곳만 이어 보여 드려요.</p><div class="cm-src">출처: ${esc(src.rone || '')}${CX.rone_at ? ` · ${esc(CX.rone_at)} 받음` : ''}</div>`
          : `<div class="cm-row no"><div class="k">지역 임대료·공실률·투자수익률</div><div class="v">확인 불가</div><div class="d">${av.rone ? '이 시·군·구와 이름이 이어지는 부동산원 조사 지역이 없어요.' : '한국부동산원 자료 연결을 마치는 대로 지역 평균을 보여 드려요.'}</div><div class="cm-src">출처: ${esc(src.rone || '')}</div></div>`}`)}
      ${det('일자리·지하철·새 상가', sumDem, `${rowsHtml(dem.concat([sup]))}<p class="basis">일자리·세대 통계는 시·군·구 단위예요(건물 바로 옆 사정과 다를 수 있어요). 과거 자료와 맞춰 보지 않은 지표는 점수에 넣지 않고 사실로만 보여 드려요.</p>`)}
      <h3 style="margin:14px 0 6px;font-size:16px">앞으로의 가격 점수</h3>
      ${sc && sc.length ? `<div class="cm-score">${sc.map(h => `<div><small>${h}년 보유</small><b>${sk.sc[h]}점</b><small>${esc(sdShort(g))} ${esc(tn)} 지역 중 ${esc(K.scoreRank(sk.sc[h]))}</small></div>`).join('')}</div>
        ${sk.why ? `<ul class="why">${sk.why.map(w => `<li>${esc(w[0])}: 점수를 ${w[1] > 0 ? '올렸어요' : '내렸어요'}</li>`).join('')}</ul>` : ''}`
        : `<div class="cm-wait">${esc(K.scoreHead(CX))}</div>`}
      ${det('점수를 보여 주는 기준', sc && sc.length ? '과거에 잘 맞은 보유 기간만 보여 드려요' : '과거에 절반 넘게 맞은 보유 기간만 점수를 보여 드려요', `${sc && sc.length ? `<p class="basis">점수 = ${esc(sdShort(g))}의 시·군·구별 ${esc(tn)} 시세를 서로 비교한 순위예요(100점 만점, 50점이 가운데). 시장 전체가 내리면 점수가 높은 지역도 내릴 수 있어요.</p>` : ''}
        <p class="basis">집코드는 과거 여러 때에 그때까지의 자료만으로 점수를 매겨 보고, 그 뒤 실제 가격과 절반 넘게 맞고 평균보다 나은 보유 기간에만 점수를 보여 드려요. 그 전에는 위의 사실 지표만 보여 드려요.</p>
        <ul class="why" style="font-size:14px">${K.btLines(CX && CX.bt).map(t => `<li>${esc(t)}</li>`).join('')}</ul>`)}
    </div>

    ${dongAll.length ? `<div class="panel cm-list"><h2>동별 ${esc(tn)} 거래<small>최근 3년 · 거래 많은 순 · ㎡당은 3건 이상인 동만</small></h2>
      <div class="tbl cm-tbl"><table><thead><tr><th>동</th><th class="num">3년 거래</th><th class="num">${esc(K.TYPES[k].unit)}<br><small>3년 중간</small></th></tr></thead><tbody>
      ${moreBox(dongAll.slice(0, 30).map(x => `<tr><td>${esc(x[0])}${window.JDJ_MAPJ ? ` <a class="cm-mapl" href="${esc(JDJ_MAPJ.url({ kind: k, g, dong: x[0], name: `${x[0]} ${tn}` }))}" data-track="comm_dong_to_map" aria-label="${esc(x[0])} 지도에서 보기">지도</a>` : ''}</td><td class="num">${x[2].toLocaleString()}건</td><td class="num">${x[3] ? K.perM2(x[3]) : '-'}</td></tr>`), 5)}</tbody></table></div>
      ${moreBtn(5, Math.min(30, dongAll.length), '동')}
      </div>` : ''}

    ${trs.length ? `<div class="panel cm-list"><h2>최근 ${esc(tn)} 매매 실거래<small>국토교통부 신고 그대로예요(최근 3년, 최신순)</small></h2>
      <div class="cm-trs">${moreBox(trs.map(t => { const p = K.tradePpm(t, k); return `<div class="cm-tr"><div class="a"><span>${esc(t.date)} · ${esc(t.dong)} ${esc(t.jibun)}${t.masked ? '<span class="cm-mask">일부 가림</span>' : ''}${t.est && window.JDJ_MAPJ ? ` <a class="cm-mapl cm-est" href="${esc(JDJ_MAPJ.url({ kind: 'g', g, dong: t.dong, name: `${t.dong} 통건물 (추정)`, price: t.amt, ll: [t.est.lat, t.est.lng], est: t.est.src, facts: K.estFacts(t.est) }))}" data-track="comm_est_to_map" aria-label="${esc(t.dong)} 통건물 추정 위치 지도에서 보기">추정 위치</a>` : ''}</span><b>${won(t.amt)}</b></div>
        <div class="b">${t.hi ? '<span class="jps-new">신고가</span> ' : ''}${esc(t.use)} · ${k === 'g' ? `대지 ${t.la ? t.la.toLocaleString() + '㎡' : '-'} · 연면적 ${t.ba.toLocaleString()}㎡` : `전용 ${t.ba}㎡${t.floor != null ? ' · ' + t.floor + '층' : ''}`}${p ? ` · ㎡당 ${K.perM2(p)}` : ''}${t.direct ? ' · <b>직거래</b>' : ''}${t.share ? ' · <b>지분</b>' : ''}</div></div>`; }), 5)}</div>
      ${moreBtn(5, trs.length, '거래')}
      ${k === 'g' ? det('지번이 일부 가려진 이유', '국토교통부가 통건물 지번을 첫 자리만 남기고 공개해요', '<p class="basis">국토교통부는 통건물(일반 건물) 거래의 지번을 첫 자리만 남기고 가려서 공개해요(예: 5**). 그래서 집코드도 건물별로 묶지 않고 동·시·군·구 단위로만 모아 보여 드려요. 같은 이유로 통건물은 건물별 신고가를 확인할 수 없어요.</p><p class="basis"><b>추정 위치</b> 표시가 붙은 거래는 신고된 대지면적·연면적·준공 연도·용도가 같은 동의 공개 건축물대장에서 딱 한 건물과 맞은 경우예요. 그 건물 자리를 약 100m 단위로 지도에 보여 드리고, 지번은 공개하지 않아요. 맞춰 본 결과라 실제 거래 건물과 다를 수 있어요. 비슷한 건물이 여럿이거나 맞는 건물이 없으면 동 가운데로 보여 드려요. 위치는 행정안전부 주소정보 좌표가 있으면 그것을, 아직 없으면 지도 서비스 좌표를 기준으로 추정해요.</p>') : ''}
    </div>` : ''}

    ${u && window.JDJ_CM ? JDJ_CM.slot({ t: 'c', g, d: u.d, k: K.keyOf(u), n: K.nameOf(u) }) : ''}
    ${window.JDJ_MAPJ ? JDJ_MAPJ.btn(mjOf(u || null), 'bottom', u ? '이 건물 주변 시세와 개발·교통 예정, 역·학교를 지도에서 확인해 보세요' : `${mjOf(null).dong || nm} 주변을 지도에서 확인해 보세요${k === 'g' ? ' (통건물은 지번이 가려져 있어 동별 표의 지도 링크로 동 가운데를 볼 수 있어요)' : ''}`, 'comm_to_map_end') : ''}
    <div class="cm-links" style="margin:12px 0">
      <a class="main" href="../loan/?src=comm" data-track="comm_to_loan">대출 한도 계산 →</a>
      <a href="../tax/" data-track="comm_to_tax">세금 계산 →</a>
      <a href="../map/" data-track="comm_to_map">개발·교통 지도 →</a>
    </div>`;
    r.querySelectorAll('details.cm-det').forEach(d => d.addEventListener('toggle', () => { if (d.open && d.querySelector('#cmCP,#cmCU')) drawCharts(); }));
    r.querySelectorAll('[data-cmmore]').forEach(b => b.onclick = () => { const box = b.closest('.cm-list, .panel'); const on = !box.classList.contains('cm-open'); box.classList.toggle('cm-open', on); b.setAttribute('aria-expanded', on); b.textContent = on ? '접기' : b.dataset.lab || b.textContent; });
    r.querySelectorAll('[data-cmmore]').forEach(b => { b.dataset.lab = b.textContent; });
    drawCharts();
    if (window.JDJ_MAPJ) JDJ_MAPJ.restore();
    r.querySelectorAll('[data-cmspan]').forEach(b => b.onclick = () => { S.span = +b.dataset.cmspan || 0; r.querySelectorAll('[data-cmspan]').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); drawCharts(); });
    if (window.jdjStat) jdjStat('feature_use', { feature: 'mine_comm' });
  }

  function boot() {
    M = window.JDJ_MINE; K = window.JDJ_COMM;
    const tabs = $('mtabs'); if (!tabs || !M || !K || !$('commSec')) return;
    css();
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) setTab(b.dataset.t, true); });
    if (new URLSearchParams(location.search).get('t') === 'c') setTab('c', false);
    let rz = null, lw = innerWidth;
    addEventListener('resize', () => { if (Math.abs(innerWidth - lw) < 8) return; lw = innerWidth; clearTimeout(rz); rz = setTimeout(drawCharts, 200); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
