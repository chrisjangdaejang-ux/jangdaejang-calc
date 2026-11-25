/* 내 집 시세 화면의 '오피스텔' 탭 — mine/index.html 의 #mtabs(아파트|오피스텔)·#offiSec 를 쓴다.
   계산 규칙은 assets/offi-core.js(JDJ_OFFI), 금액·날짜 표기는 assets/mine-core.js(JDJ_MINE).
   자료: jangdaejang-data data/offi/index.json, offi/{구}.json, index.json(시·도·구 이름)
   URL: ?t=o&og=구코드&ob=동|지번 (아파트 탭의 sd·d·b 와 겹치지 않게 따로 씀) */
(function () {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const DATA = JB.DATA + 'data/';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const C = {};
  const getJ = u => C[u] || (C[u] = fetch(DATA + u, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(u); return r.json(); }).catch(e => { delete C[u]; throw e; }));
  let M, O, IX = null, OX = null, CUR = null, inited = false;
  const S = { sd: '', g: '', d: '', key: '', span: 36, yspan: 60 };
  const won = v => M.won(v), ymL = v => M.ymLabel(v), ymK = v => M.ymKo(v);
  const updown = v => v == null ? '' : v > 0.0005 ? 'up' : v < -0.0005 ? 'dn' : '';
  const sggName = c => ((IX && IX.sgg[c]) || {}).name || c;
  const sidoName = c => ((IX && IX.sgg[c]) || {}).sido || '';
  const sdShort = c => { const s = IX && IX.sido.find(x => x.name === sidoName(c)); return (s && s.short) || sidoName(c); };
  const sdOf = c => { const s = IX && IX.sido.find(x => x.name === sidoName(c)); return s ? s.id : ''; };
  const ready = () => OX && OX.status && (OX.status.trade === 'ok' || OX.status.rent === 'ok');

  function css() {
    if ($('offiCss')) return;
    const st = document.createElement('style'); st.id = 'offiCss';
    st.textContent = `.of-def{background:#F5F8FF;border:1px solid #C9D8FF;border-radius:14px;padding:12px 14px;font-size:15px;line-height:1.65;margin:10px 0}
.of-def b{color:#1F56E0}
.of-rows{display:grid;gap:8px;margin-top:8px}
.of-row{border:1px solid var(--line);border-radius:14px;padding:10px 12px;min-width:0}
.of-row .k{font-size:14px;font-weight:700;color:#3E4754}
.of-row .v{font-size:17px;font-weight:900;word-break:keep-all;overflow-wrap:anywhere}
.of-row .d{font-size:13.5px;color:#4E5968;line-height:1.55;overflow-wrap:anywhere}
.of-row.no{background:#FAFAFB}
.of-row.no .v{font-size:15px;color:#8B95A1}
.of-row ul{margin:6px 0 0;padding-left:18px;font-size:14px;line-height:1.6}
.of-src{font-size:12.5px;color:#8B95A1;margin-top:2px}
.of-score{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
.of-score div{border:2px solid #B8942A;border-radius:14px;padding:6px 12px;text-align:center;min-width:84px}
.of-score b{display:block;font-size:24px;font-weight:900}
.of-score small{font-size:13px;color:#4E5968;font-weight:700}
.of-prep{border:1px dashed #C9D8FF;background:#F8FAFF;border-radius:16px;padding:14px 16px;font-size:15px;line-height:1.7}
.of-prep b{color:#1F56E0}
.of-chart{width:100%;min-height:140px}
.of-chart svg{display:block;width:100%;height:auto}
.of-lg{display:flex;gap:14px;flex-wrap:wrap;font-size:13.5px;color:#4E5968;margin-top:4px}
.of-lg i{display:inline-block;width:18px;height:3px;border-radius:2px;vertical-align:middle;margin-right:5px;background:#2560E8}
.of-lg i.y{background:#B8942A}
.of-lg i.g{background:repeating-linear-gradient(90deg,#8B95A1 0 5px,transparent 5px 8px)}
.of-lg i.j{background:#14A06B}
.of-lg i.r{background:#0E7A4F;height:2px}
.of-lg i.gap{background:repeating-linear-gradient(90deg,#2560E8 0 3px,transparent 3px 7px);opacity:.55}
.of-lg i.gap.y2{background:repeating-linear-gradient(90deg,#B8942A 0 3px,transparent 3px 7px)}
.of-fill{font-size:13px;color:#6B7684;margin:8px 0 0}`;
    document.head.appendChild(st);
  }

  /* ---------- 탭 ---------- */
  const HIDE = ['homesSec', 'findSec', 'res', 'src'];
  /* 숨김 기록은 상가·건물 탭(comm-view.js)과 같이 씀 — 아파트 탭으로 돌아올 때만 되살림 */
  function setTab(t, push) {
    const tabs = $('mtabs'); if (!tabs) return;
    const was = (window.JDJ_TABWAS = window.JDJ_TABWAS || {});
    tabs.querySelectorAll('[data-t]').forEach(b => { const on = b.dataset.t === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    const sec = $('offiSec');
    if (t === 'o') {
      HIDE.forEach(id => { const el = $(id); if (el) { if (!(id in was)) was[id] = el.hidden; el.hidden = true; } });
      sec.hidden = false;
      if (!inited) init();
    } else {
      sec.hidden = true;
      if (t === 'a') HIDE.forEach(id => { const el = $(id); if (el && id in was) { el.hidden = was[id]; delete was[id]; } });
    }
    if (push) {
      const u = new URL(location.href);
      if (t === 'o') u.searchParams.set('t', 'o'); else if (t === 'a') ['t', 'og', 'ob'].forEach(k => u.searchParams.delete(k)); else ['og', 'ob'].forEach(k => u.searchParams.delete(k));
      history.replaceState(null, '', u);
    }
  }

  /* ---------- 자료 ---------- */
  async function init() {
    inited = true; css();
    const sec = $('offiSec');
    sec.innerHTML = '<div class="loading">오피스텔 자료를 불러오는 중이에요…</div>';
    try { IX = await getJ('index.json'); } catch (e) { sec.innerHTML = '<div class="empty">자료를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.</div>'; return; }
    OX = await getJ('offi/index.json').catch(() => null);
    shell();
    const q = new URLSearchParams(location.search), og = q.get('og') || '', ob = q.get('ob') || '';
    const sd = /^\d{5}$/.test(og) && sdOf(og) ? sdOf(og) : (IX.sido.find(s => s.short === '서울') || IX.sido[0]).id;
    await pickSido(sd, og, ob);
  }
  function shell() {
    const st = OX && OX.status, n = OX && OX.n;
    $('offiSec').innerHTML = `
    <section class="panel" aria-labelledby="ofT">
      <h2 id="ofT">오피스텔 찾기<small>시·도 → 시·군·구 → 동 → 건물 순서로 고르거나, 시·군·구를 고른 뒤 건물 이름으로 찾아 주세요.</small></h2>
      ${ready() ? '' : `<div class="of-prep" id="ofPrep"><b>오피스텔 실거래 자료를 준비하고 있어요.</b><br>국토교통부 오피스텔 매매·전월세 실거래 자료 연결을 마치는 대로 건물별 시세·임대수익률을 자동으로 보여 드려요. 지금은 시·군·구를 고르면 그 지역 <b>임대수요·공급</b> 공식 통계를 먼저 볼 수 있어요.${st ? `<br><small style="color:#4E5968">매매 자료: ${st.trade === 'ok' ? '연결됨' : '준비 중'} · 전월세 자료: ${st.rent === 'ok' ? '연결됨' : '준비 중'}</small>` : ''}</div>`}
      <div class="pick" style="margin-top:10px">
        <div><label for="ofSd">시·도</label><select id="ofSd"></select></div>
        <div><label for="ofG">시·군·구</label><select id="ofG"><option value="">시·군·구 선택</option></select></div>
        <div><label for="ofD">동</label><select id="ofD" disabled><option value="">동 선택</option></select></div>
        <div><label for="ofB">건물</label><select id="ofB" disabled><option value="">건물 선택</option></select></div>
      </div>
      <p class="or">또는 건물 이름으로 찾기 <span style="font-weight:500">(선택한 시·군·구 안에서 찾아요)</span></p>
      <div class="pick"><div class="full"><label for="ofQ" style="position:absolute;left:-9999px">건물 이름</label><input id="ofQ" type="search" placeholder="예: 건물 이름 일부" autocomplete="off" enterkeyhint="search"></div></div>
      <div class="sres" id="ofSres" aria-live="polite"></div>
      <div id="ofMsg" class="note" aria-live="polite"></div>
      ${n && n.bld ? `<p class="note" style="margin-top:8px">건물 ${n.bld.toLocaleString()}곳 · 매매 ${n.trades.toLocaleString()}건 · 전월세 ${n.rents.toLocaleString()}건 (${ymL(OX.from && OX.from.trade || OX.hm)}~${ymL(OX.to)})</p>` : ''}
    </section>
    <section id="ofRes" hidden aria-live="polite"></section>
    <p class="disc">자료: ${esc(((OX && OX.src) || {}).trade || '국토교통부 오피스텔 매매 실거래가')} · ${esc(((OX && OX.src) || {}).rent || '국토교통부 오피스텔 전월세 실거래가')}. 해제(취소) 신고된 거래는 빼고, 직거래는 목록에만 보여 주고 시세 계산에서는 빼요. 원자료에는 주거용·업무용 구분이 없어요. 임대수익률은 세금·관리비·공실·중개보수를 빼기 전 '표면 수익률'이에요.</p>`;
    const first = ['서울', '경기', '인천'];
    const list = [...IX.sido].sort((a, b) => { const ia = first.indexOf(a.short), ib = first.indexOf(b.short); return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib) || a.name.localeCompare(b.name, 'ko'); });
    $('ofSd').innerHTML = list.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
    $('ofSd').onchange = () => pickSido($('ofSd').value);
    $('ofG').onchange = () => pickSgg($('ofG').value);
    $('ofD').onchange = () => pickDong($('ofD').value);
    $('ofB').onchange = () => { if ($('ofB').value) show($('ofB').value, { scroll: true }); };
    let qt = null;
    $('ofQ').addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(runSearch, 200); });
    $('ofQ').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } });
    $('ofSres').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; $('ofSres').innerHTML = ''; $('ofQ').value = ''; show(b.dataset.k, { scroll: true }); });
  }
  async function pickSido(id, keepG, keepB) {
    S.sd = id; $('ofSd').value = id;
    const nm = (IX.sido.find(s => s.id === id) || {}).name;
    const has = g => !ready() || ((OX.sgg[g] || {}).n > 0);
    const list = Object.keys(IX.sgg).filter(k => IX.sgg[k].sido === nm && has(k)).sort((a, b) => sggName(a).localeCompare(sggName(b), 'ko'));
    $('ofG').innerHTML = '<option value="">시·군·구 선택</option>' + list.map(k => `<option value="${k}">${esc(sggName(k))}</option>`).join('');
    ['ofD', 'ofB'].forEach(x => { $(x).disabled = true; });
    if (keepG && list.includes(keepG)) { $('ofG').value = keepG; await pickSgg(keepG, keepB); }
  }
  async function pickSgg(g, keepB) {
    S.g = g; CUR = null; $('ofSres').innerHTML = '';
    $('ofD').innerHTML = '<option value="">동 선택</option>'; $('ofB').innerHTML = '<option value="">건물 선택</option>';
    $('ofD').disabled = $('ofB').disabled = true;
    if (!g) { $('ofRes').hidden = true; return; }
    setUrl(g, '');
    if (!ready()) { regionOnly(g); return; }
    $('ofMsg').textContent = '건물 목록을 불러오는 중이에요…';
    let j; try { j = await getJ('offi/' + g + '.json'); $('ofMsg').textContent = ''; }
    catch (e) { $('ofMsg').textContent = '이 시·군·구에는 최근 3년 오피스텔 거래 자료가 없어요.'; regionOnly(g); return; }
    if (S.g !== g) return;
    C['u' + g] = j;
    const ds = O.dongs(j.units);
    $('ofD').innerHTML = `<option value="">동 선택 (${ds.length}개)</option>` + ds.map(d => `<option>${esc(d)}</option>`).join('');
    $('ofD').disabled = !ds.length;
    const kb = keepB || '';
    const kd = kb.split('|')[0];
    if (kd && ds.includes(kd)) { $('ofD').value = kd; pickDong(kd, kb); }
    else regionOnly(g);
    if ($('ofQ').value.trim()) runSearch();
  }
  function pickDong(d, keepB) {
    S.d = d; const j = C['u' + S.g]; if (!j) return;
    const list = O.inDong(j.units, d);
    $('ofB').innerHTML = `<option value="">건물 선택 (${list.length}곳)</option>` + list.map(u => `<option value="${esc(O.keyOf(u))}">${esc(O.nameOf(u))}${u.j ? ' · ' + esc(u.j) : ''}</option>`).join('');
    $('ofB').disabled = !list.length;
    if (keepB && list.some(u => O.keyOf(u) === keepB)) { $('ofB').value = keepB; show(keepB); }
  }
  function runSearch() {
    const q = $('ofQ').value.trim(), box = $('ofSres');
    if (!q) { box.innerHTML = ''; return; }
    const j = C['u' + S.g];
    if (!j) { box.innerHTML = `<div class="none">${ready() ? '먼저 시·군·구를 골라 주세요.' : '오피스텔 실거래 자료를 준비하고 있어요.'}</div>`; return; }
    const hits = O.search(j.units, q, 12);
    box.innerHTML = hits.length ? hits.map(u => `<button type="button" data-k="${esc(O.keyOf(u))}"><b>${esc(O.nameOf(u))}</b><small>${esc(sggName(S.g))} ${esc(u.d)} ${esc(u.j)} · 최근 3년 매매 ${(u.t || []).length}건 · 월세 ${(u.wr || []).length}건</small></button>`).join('')
      : `<div class="none">'${esc(q)}' 이름의 오피스텔을 ${esc(sggName(S.g))}에서 찾지 못했어요. 동을 고른 뒤 목록에서 골라 보세요. (최근 3년 매매·전월세 계약이 있었던 건물만 찾을 수 있어요)</div>`;
  }
  function setUrl(g, key) {
    const u = new URL(location.href); u.searchParams.set('t', 'o'); u.searchParams.set('og', g);
    if (key) u.searchParams.set('ob', key); else u.searchParams.delete('ob');
    history.replaceState(null, '', u);
  }

  /* ---------- 차트 ----------
     아파트 화면과 같은 공용 차트(assets/price-sheet.js JDJ_PRICE.mount): 세로 안내선·값 칸(달·값·거래 건수)·손가락으로 문지르기·화살표 키.
     오피스텔은 거래가 드물어 noFill — 거래 없던 달은 점·값을 만들지 않고 '거래 없음'으로 보여 줘요(점선은 앞뒤 실제 값을 잇기만). */
  const P = () => window.JDJ_PRICE;
  const spans = (n, cur, attr) => `<div class="seg2" role="group" aria-label="기간">${[12, 36].filter(m => m < n).map(m => ({ s: m, l: m / 12 + '년' })).concat([{ s: 0, l: '전체' }]).map(b => `<button type="button" data-${attr}="${b.s}" class="${b.s === cur || (!b.s && cur >= n) ? 'on' : ''}" aria-pressed="${b.s === cur}">${b.l}</button>`).join('')}</div>`;
  const pctY = v => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '') + '%';
  function drawCharts() {
    if (!CUR || !CUR.u || !P()) return;
    const u = CUR.u, j = CUR.j, el = $('ofCP'), ey = $('ofCY');
    if (el) {
      const h = O.histOf(u, j), w = M.histWindow(h, S.span);
      P().mountHist(el, w, { h: 240, fs: 13.5, sub: true, noFill: true, cnt: O.cntMap(u, j), aria: h.j.some(v => v > 0) ? '매매·전세 시세 추이' : '매매 시세 추이' });
    }
    if (ey) {
      const ys = O.yieldSeries(u, j), gs = (OX.sgg[S.g] || {}).ys, n = ys.months.length;
      const g = O.arr(gs, n).map(v => v > 0 ? v / 10 : 0), w = M.histWindow({ months: ys.months, s: ys.y, j: g, jr: g }, 60), has = w.j.some(v => v > 0);
      const rows = [{ k: '이 건물 수익률', sk: '이 건물', a: w.s, c: '#B8942A', fmt: pctY }];
      if (has) rows.push({ k: `${sggName(S.g)} 오피스텔 중간값`, sk: `${sggName(S.g)} 중간값`, a: w.j, c: '#8B95A1', fmt: pctY });
      P().mount(ey, { months: w.months, fs: 13.5, h: 200, L: 44, min: 2, noFill: true, fmtY: pctY, aria: '임대수익률 추이',
        lines: (has ? [{ a: w.j, c: '#8B95A1', w: 1.8, dash: true }] : []).concat([{ a: w.s, c: '#B8942A', w: 2.6 }]),
        empty: '차트로 보여 드릴 값이 적어요.', tip: P().tipFn({ months: w.months, rows, noFill: true }) });
    }
  }

  /* ---------- 결과 ---------- */
  function rowsHtml(rows) {
    return `<div class="of-rows">${rows.map(r => `<div class="of-row${r.ok ? '' : ' no'}"><div class="k">${esc(r.label)}</div>
      <div class="v">${r.ok ? esc(r.value) : '확인 불가'}</div>${r.note ? `<div class="d">${esc(r.note)}</div>` : ''}
      ${r.list && r.list.length ? `<ul>${r.list.slice(0, 8).map(x => `<li>${esc(x.name)} — ${x.n.toLocaleString()}실·세대 · ${esc(x.mv)} 입주 예정${x.k ? ` <small>(${esc(x.k)})</small>` : ''}</li>`).join('')}${r.list.length > 8 ? `<li>외 ${r.list.length - 8}곳</li>` : ''}</ul>` : ''}
      ${r.src ? `<div class="of-src">출처: ${esc(r.src)}</div>` : ''}</div>`).join('')}</div>`;
  }
  function regionPanels(g, u) {
    const s = OX ? OX.sgg[g] : null;
    const rate = OX && OX.rate, base = rate && O.lastRate(rate.base), mort = rate && O.lastRate(rate.mort);
    const sp = u && u.y && mort ? O.spread(u.y.r, mort.v) : null;
    return `
    <div class="panel"><h2>임대수요<small>오피스텔은 시세차익보다 월세 수입을 많이 봐서, 주변에 세입자가 될 사람이 얼마나 있는지가 중요해요. 공식 통계만 쓰고, 없는 자료는 '확인 불가'로 그대로 보여 드려요.</small></h2>
      ${rowsHtml(O.demandRows(s, OX, u, sggName(g)))}
      <p class="basis">일자리·사업체·세대 통계는 시·군·구 단위예요(건물 바로 옆 사정과 다를 수 있어요). 과거 자료와 맞춰 보지 않은 지표는 점수에 넣지 않고 사실로만 보여 드려요.</p></div>
    <div class="panel"><h2>공급 위험<small>주변에 새 오피스텔이 많이 들어오면 세입자를 구하기 어려워지고 월세가 눌릴 수 있어요.</small></h2>
      ${rowsHtml(O.supplyRows(s, OX))}
      <p class="basis">청약홈에 공고된 단지만 들어가요(청약홈을 거치지 않은 소규모 오피스텔·생활형숙박시설은 빠져요). 시·군·구 전체 합계예요.</p></div>
    <div class="panel"><h2>가격이 오를 여지<small>오피스텔은 아파트보다 가격이 덜 오르는 편이라, 수익률과 함께 가격을 끌어올릴 재료가 있는지 봐요.</small></h2>
      <div class="of-rows">
        <div class="of-row${u && u.rl ? '' : ' no'}"><div class="k">주변 신설역</div><div class="v">${u && u.rl ? u.rl.map(r => `${esc(r[0])} ${esc(r[5] ? (/역$/.test(r[1]) ? r[1] : r[1] + '역') + '(개통 예정)' : r[1])} · ${esc(r[2])}`).join('<br>') : u ? '해당 없음' : '건물을 고르면 보여 드려요'}</div>
          ${u && u.rl ? `<div class="d">${u.rl.map(r => `${esc(r[1])}: ${ymK(r[3])} '${esc(r[2])}' 단계${r[4] === 'dong' ? ' (건물 위치 대신 역세권 동으로 확인)' : r[5] ? ' (예정 위치 기준)' : ''}`).join(' · ')}</div>` : ''}
          <div class="of-src">출처: ${esc(((OX && OX.src) || {}).rail || '철도 사업 공식 발표')}</div></div>
        <div class="of-row no"><div class="k">업무지구 개발 단계</div><div class="v">확인 불가</div><div class="d">업무지구 개발 계획의 단계별 공식 자료를 아직 정리하지 못했어요.</div></div>
        <div class="of-row${mort || base ? '' : ' no'}"><div class="k">금리와 비교한 수익률</div>
          <div class="v">${sp != null ? `주택담보대출 금리보다 ${sp >= 0 ? '+' : ''}${sp.toFixed(2)}%p` : mort || base ? '건물을 고르면 계산해 드려요' : '확인 불가'}</div>
          <div class="d">${mort || base ? `${base ? `한국은행 기준금리 ${base.v}% (${ymK(base.at)})` : ''}${base && mort ? ' · ' : ''}${mort ? `예금은행 주택담보대출 금리 ${mort.v}% (${ymK(mort.at)}, 신규취급액 기준)` : ''}. 수익률이 대출 금리보다 낮으면 대출을 끼고 사면 월세로 이자를 다 못 낼 수 있어요.` : '한국은행 금리 자료를 아직 연결하지 못했어요.'}</div>
          ${mort || base ? `<div class="of-src">출처: ${esc(((OX && OX.src) || {}).rate || '한국은행')}</div>` : ''}</div>
      </div></div>`;
  }
  /* 분석 설명(assets/narrative.js cat.offi): 건물이 있으면 수익률 결론(같은 구·금리 대비), 없으면 지역 임대수요 결론 */
  function narO(g, u, id) {
    const NR = window.JDJ_NAR, PL = window.JDJ_PLAIN;
    if (!NR || !NR.cat || !PL || /[?&]nar=0(&|$)/.test(location.search)) return '';
    try {
      const N = NR.cat.offi(NR.cat.offiFrom({ u: u || null, OX, g, O, sggName: sggName(g), sidoShort: PL.regionInfo(IX, g).short || sdShort(g) }));
      return N.head ? NR.html(N, { id }) : '';
    } catch (e) { console.warn('nar', e); return ''; }
  }
  function narBind() { const NR = window.JDJ_NAR; if (NR) $('ofRes').querySelectorAll('.nar').forEach(el => NR.bind(el)); }
  function regionOnly(g) {
    const r = $('ofRes'); r.hidden = false;
    const s = OX ? OX.sgg[g] : null;
    r.innerHTML = `<div class="panel"><div class="dhead"><div><h2>${esc(sggName(g))} 오피스텔 지역 정보</h2><div class="loc">${esc(sidoName(g))} ${esc(sggName(g))}</div></div></div>
      ${narO(g, null, 'narOr')}
      ${s && s.y ? `<p class="basis">이 지역 오피스텔 임대수익률 중간값 <b>${O.pct(s.y[0])}</b> (수익률을 계산할 수 있는 건물 ${s.y[1]}곳)</p>` : ''}
      <p class="basis">${ready() ? '동과 건물을 고르면 건물별 시세·임대수익률을 보여 드려요.' : '건물별 시세·임대수익률은 실거래 자료 연결 뒤 보여 드려요.'}</p></div>${regionPanels(g, null)}`;
    narBind();
  }
  /* 전세·월세 칸: 이 건물 계약이 있으면 시세·전세가율·계약 수·최근 전세 계약, 없으면 같은 동(없으면 같은 시·군·구) 최근 1년 요약 */
  const filling = () => !OX || !OX.fill || !!OX.fill.rent;
  const FILL_NOTE = '<p class="of-fill">집예보는 예전 오피스텔 전월세 기록을 아직 채우고 있어요. 다 채우면 이 화면에 자동으로 반영돼요.</p>';
  function rentPanel(u, j) {
    const r = O.rentNow(u, j), hasJ = r.nj3 || r.nj || (u.js && u.js.length > 1);
    const from = OX && OX.from && OX.from.rent, since = from ? `${ymK(from)}부터 모은 국토교통부 전월세 신고 자료` : '국토교통부 전월세 신고 자료';
    const head = `<h2>전세·월세 시세<small>${since}로 정리했어요. 동·호수 같은 개인정보는 원자료에도 없어요.</small></h2>`;
    if (!hasJ) {
      const ar = O.areaRent(u, j, OX && OX.sgg[S.g], sggName(S.g)), nm = ar ? (ar.scope === 'dong' ? `같은 동(${ar.name})` : `${ar.name}`) : '';
      const far = a => a && u.a && (a < u.a * 0.6 || a > u.a * 1.6), aft = from ? ymK(from) + ' 이후 ' : '';
      return `<div class="panel">${head}
      <p class="note" style="font-size:15px">이 건물은 ${aft}신고된 전세 계약이 없어요. 그래서 이 건물의 전세 시세와 전세가율은 계산하지 않았어요. ${r.nw3 ? `월세 계약은 최근 3년 동안 ${r.nw3}건이 있어요(아래 '최근 월세 계약' 표).` : '이 건물은 최근 3년 월세 계약도 없어요.'}</p>
      ${ar ? `<p class="basis">대신 ${esc(nm)} 오피스텔의 최근 1년 계약을 정리했어요.${far((ar.j || ar.w || {}).area) ? ` 이 계약들의 전용면적 중간값은 ${(ar.j || ar.w).area}㎡라서, 전용 ${u.a}㎡인 이 건물과 크기가 많이 달라요. 참고로만 봐 주세요.` : ''}</p>
      <div class="stats">
        ${ar.j ? `<div class="st"><div class="k">전세 보증금 중간값</div><div class="v">${won(ar.j.dep)}</div><div class="d">전세 ${ar.j.n.toLocaleString()}건 · 전용 중간값 ${ar.j.area}㎡</div></div>
        <div class="st"><div class="k">전세 ㎡당 보증금</div><div class="v">${Math.round(ar.j.ppm).toLocaleString()}만 원</div><div class="d">전용 1㎡당 중간값</div></div>` : ''}
        ${ar.w ? `<div class="st"><div class="k">월세 중간값</div><div class="v">${won(ar.w.dep)} / 월 ${ar.w.rent.toLocaleString()}만</div><div class="d">월세 ${ar.w.n.toLocaleString()}건 · 전용 중간값 ${ar.w.area}㎡</div></div>` : ''}
      </div>` : `<p class="basis">${esc(sggName(S.g))} 오피스텔 전월세 요약은 다음 자료 갱신 때 함께 보여 드려요.</p>`}
      ${filling() ? FILL_NOTE : ''}</div>`;
    }
    const jl = O.jeonses(u), wNote = r.wFromY ? '수익률 계산에 쓴 계약과 같아요' : '최근 1년 계약 중간값';
    return `<div class="panel">${head}
      <div class="stats">
        <div class="st key"><div class="k">최근 전세 시세 (전용 ${u.a}㎡)</div><div class="v">${r.jNow ? won(r.jNow.v) : '확인 불가'}</div><div class="d">${r.jNow ? ymL(r.jNow.at) + ' 기준' : '최근 3개월 전세 계약이 없어요'}</div></div>
        <div class="st"><div class="k">전세가율</div><div class="v">${r.jr ? Math.round(r.jr.v * 100) + '%' : '확인 불가'}</div><div class="d">${r.jr ? `전세 ÷ 매매 · ${ymL(r.jr.at)} 기준` : '같은 시기 매매·전세 시세가 함께 있어야 계산해요'}</div></div>
        <div class="st"><div class="k">최근 1년 전세 계약</div><div class="v">${r.nj}건</div><div class="d">최근 3년 목록 ${r.nj3}건</div></div>
        <div class="st"><div class="k">최근 1년 월세 계약</div><div class="v">${r.nw}건</div><div class="d">${r.wDep != null && r.wRent != null ? `중간값 ${won(r.wDep)} / 월 ${r.wRent.toLocaleString()}만 · ${wNote}` : '계약이 없어요'}</div></div>
      </div>
      ${r.jr && P() ? P().jrChip(r.jr.v, r.jr.at, '../jeonse/checklist/') : ''}
      <p class="basis"><b>계산 근거</b> · 전세 시세 = 이 건물 최근 3개월 순수 전세(월세 0) 계약의 전용 ㎡당 보증금 중간값 × 전용 ${u.a}㎡ · 전세가율 = 같은 달 전세 시세 ÷ 매매 시세 · 계약 수 = 표본 수예요. 표본이 적으면 한두 건에 값이 크게 흔들려요.</p>
      ${jl.length ? `<h3 style="margin:14px 0 6px;font-size:16px">최근 전세 계약</h3><div class="tbl"><table><thead><tr><th>계약일</th><th class="num">전용·층</th><th class="num">보증금</th></tr></thead><tbody>${jl.slice(0, 10).map(t => `<tr><td>${esc(t.date)}${t.ct ? `<br><small>${t.ct}</small>` : ''}</td><td class="num">${t.area}㎡${t.floor != null ? `<br><small>${t.floor}층</small>` : ''}</td><td class="num"><b>${won(t.dep)}</b></td></tr>`).join('')}</tbody></table></div>
      ${jl.length > 10 ? `<p class="basis">최근 10건만 보여 드려요(최근 3년 ${jl.length}건).</p>` : ''}` : r.nj ? '' : '<p class="note">최근 3년 전세 계약이 없어요.</p>'}
      <p class="basis">월세 계약(보증금·월세)은 아래 '최근 월세 계약' 표에 있어요.</p>
      ${filling() ? FILL_NOTE : ''}</div>`;
  }
  function show(key, opt) {
    const j = C['u' + S.g]; if (!j) return;
    const u = j.units.find(x => O.keyOf(x) === key); if (!u) return;
    S.key = key; CUR = { u, j };
    if ($('ofD').value !== u.d) { $('ofD').value = u.d; pickDong(u.d); }
    $('ofB').value = key;
    setUrl(S.g, key);
    const ps = O.priceSeries(u, j), last = O.latest(ps.s, ps.months), any = O.lastAny(ps.s, ps.months);
    const c1 = O.change(ps.s, ps.months, 12), c3 = O.change(ps.s, ps.months, 36);
    const y = u.y, ex = O.example(u), s = OX.sgg[S.g] || {}, pass = O.passed(OX);
    const chTxt = c => c ? `<span class="${updown(c.pct)}">${M.pctTxt(c.pct)}</span>` : '-';
    const tr = O.trades(u), rn = O.rents(u), hasJ = O.histOf(u, j).j.some(v => v > 0);
    const hiBox = (k, h) => h ? `<div><div class="k">${k}</div><div class="v">${won(h[0])}</div><div class="d">${ymL(String(h[1]).slice(0, 6))} · 전용 ${h[2]}㎡</div></div>` : '';
    const sdId = sdOf(S.g);
    const jeonse = `../jeonse/?k=o&sd=${encodeURIComponent(sdId)}&g=${encodeURIComponent(S.g)}&d=${encodeURIComponent([u.d, u.j, u.n].join('|'))}`;
    const sc = u.sc && pass.filter(h => u.sc[h] != null);
    /* 지도에서 보기(assets/mapjump.js): 건물 좌표(u.xy, 공개 자료에 생기면)가 없으면 지도가 같은 동 가운데를 보여 줌 */
    const MJ = window.JDJ_MAPJ, mjo = { kind: 'o', g: S.g, dong: u.d, jibun: u.j, name: O.nameOf(u), price: last ? last.v : any ? any.v : 0, ll: Array.isArray(u.xy) ? [u.xy[1], u.xy[0]] : null };
    $('ofRes').hidden = false;
    $('ofRes').innerHTML = `
    <div class="panel">
      <div class="dhead"><div><h2>${esc(O.nameOf(u))}</h2><div class="loc">${esc(sidoName(S.g))} ${esc(sggName(S.g))} ${esc(u.d)} ${esc(u.j)}${window.JDJ_PLAIN && JDJ_PLAIN.ageText(u.by) ? ` · ${JDJ_PLAIN.ageText(u.by, null, '준공')}` : ''} · 대표 전용 ${u.a}㎡</div>${MJ ? `<div class="mapj-row">${MJ.btn(mjo, 'top', '', 'offi_to_map')}</div>` : ''}</div></div>
      ${narO(S.g, u, 'narOu')}
      <div class="stats">
        <div class="st key"><div class="k">${last ? '최근 시세' : '마지막 시세'} (전용 ${u.a}㎡)</div><div class="v">${last ? won(last.v) : any ? won(any.v) : '거래 없음'}</div><div class="d">${last ? ymL(last.at) + ' 기준' : any ? ymL(any.at) + ' · 최근 3개월 거래 없음' : '최근 매매가 없어요'}</div></div>
        <div class="st"><div class="k">임대수익률(표면)</div><div class="v">${y ? O.pct(y.r) : '확인 불가'}</div><div class="d">${y ? (u.rk && u.rk.g ? `${esc(sggName(S.g))} 오피스텔 ${u.rk.g[2]}곳 중 ${O.rankText(u.rk.g)}` : ymL(y.at) + ' 기준') : '매매·월세 계약이 적어요'}</div></div>
        <div class="st"><div class="k">1년 변동</div><div class="v">${chTxt(c1)}</div><div class="d">매매 시세 기준</div></div>
        <div class="st"><div class="k">3년 변동</div><div class="v">${chTxt(c3)}</div><div class="d">매매 시세 기준</div></div>
      </div>
      ${u.hi ? `<div class="hib">${hiBox(`최고가 (${ymK((OX.from && OX.from.trade) || j.hm)} 이후)`, u.hi)}${hiBox('최근 1년 최고가', u.hi1)}</div>` : ''}
      <p class="basis"><b>계산 근거</b> · 시세 = 이 건물 최근 3개월 매매 실거래의 전용 ㎡당 가격 중간값 × 대표 전용 ${u.a}㎡ (100만 원 단위 반올림, 직거래 제외) · 1년·3년 변동 = 같은 방식으로 12·36개월 전 달과 비교 · 최고가 = 수집한 실거래 중 직거래를 뺀 가장 높은 거래.</p>
    </div>

    <div class="panel">
      <div class="chead"><h3>${hasJ ? '매매·전세 시세 추이' : '매매 시세 추이'}</h3>${spans(ps.months.length, S.span, 'ofspan')}</div>
      <div class="of-chart" id="ofCP"></div>
      <div class="of-lg"><span><i></i>매매</span>${hasJ ? '<span><i class="j"></i>전세</span><span><i class="r"></i>전세가율(아래 작은 그래프)</span>' : ''}<span><i class="gap"></i>거래가 없던 기간</span></div>
      <p class="basis">전용 ${u.a}㎡ 기준이에요. 그래프 위에서 손가락이나 마우스를 움직이면 그 달의 시세와 매매 신고 건수가 위 칸에 나와요. 흐린 점선은 거래가 없던 기간이에요. 점선은 앞뒤 실제 거래만 이은 선이라, 점선 위의 달에는 시세 값이 없어요.</p>
      <p class="basis">각 달 값 = 그 달까지 3개월 실거래 ㎡당 가격 중간값 × 전용 ${u.a}㎡${hasJ ? '(전세는 월세 없는 순수 전세 보증금만)' : ''}.</p>
    </div>
${rentPanel(u, j)}

    <div class="panel">
      <h2>임대수익률<small>실제 월세 계약으로 계산해요</small></h2>
      <div class="of-def"><b>임대수익률(표면) = 1년 월세 ÷ (매매가 − 보증금)</b><br>보증금은 세입자에게 돌려줄 돈이라, 실제로 내 돈이 들어가는 금액은 '매매가 − 보증금'이에요. 그 돈으로 1년에 월세를 얼마나 받는지 보는 값이에요. 세금·관리비·공실·중개보수를 빼기 전이라 실제 손에 쥐는 수익은 이보다 낮아요.</div>
      ${y && ex ? `<div class="stats">
        <div class="st key"><div class="k">지금 수익률</div><div class="v">${O.pct(y.r)}</div><div class="d">${ymL(y.at)} 기준</div></div>
        <div class="st"><div class="k">같은 동</div><div class="v">${u.rk && u.rk.d ? O.rankText(u.rk.d) : '-'}</div><div class="d">${u.rk && u.rk.d ? `오피스텔 ${u.rk.d[2]}곳 중` : '비교할 건물이 적어요'}</div></div>
        <div class="st"><div class="k">같은 시·군·구</div><div class="v">${u.rk && u.rk.g ? O.rankText(u.rk.g) : '-'}</div><div class="d">${u.rk && u.rk.g ? `오피스텔 ${u.rk.g[2]}곳 중` : '비교할 건물이 적어요'}${s.y ? ` · 중간값 ${O.pct(s.y[0])}` : ''}</div></div>
        <div class="st"><div class="k">월세 계약</div><div class="v">${y.nw}건</div><div class="d">최근 1년 · 매매 ${y.ns}건 기준</div></div>
      </div>
      <p class="basis"><b>예시(전용 ${u.a}㎡)</b> · 매매가 약 ${won(ex.price)} − 보증금 ${won(ex.dep)} = 들어가는 돈 ${won(ex.cash)} · 월세 ${ex.rent.toLocaleString()}만 원 × 12 = 1년 ${won(ex.year)} → 약 ${O.pct(ex.r)} (보증금·월세는 최근 1년 월세 계약의 중간값)</p>
      <p class="basis"><b>계산 근거</b> · 매매가 = 이 건물 최근 매매 실거래 ㎡당 가격 중간값(${Math.round(y.p).toLocaleString()}만 원/㎡) × 각 월세 계약의 전용면적. 최근 1년 월세 계약 하나하나의 수익률을 구한 뒤 가운데 값(중간값)을 써요. 전세(월세 0) 계약은 빼요.</p>`
      : `<p class="note" style="font-size:15px">이 건물은 최근 매매나 월세 계약이 적어 수익률을 계산하지 않았어요(확인 불가). 계약 몇 건으로 계산하면 실제와 크게 다를 수 있어서예요.</p>`}
      ${u.ys ? `<div class="chead" style="margin-top:12px"><h3>수익률 추이 (최근 5년)</h3></div><div class="of-chart" id="ofCY"></div>
      <div class="of-lg"><span><i class="y"></i>이 건물</span>${s.ys ? `<span><i class="g"></i>${esc(sggName(S.g))} 오피스텔 중간값</span>` : ''}<span><i class="gap y2"></i>값이 없던 기간</span></div>
      <p class="basis">각 달 값 = 그 달 기준 최근 1년 월세 계약과 최근 매매로 계산한 수익률이에요. 흐린 점선은 값이 없던 기간이고, 점선 위의 달에는 값이 없어요.</p>` : ''}
    </div>

    ${regionPanels(S.g, u)}

    <div class="panel"><h2>종합 점수 (수익률 + 가격)<small>과거에 그대로 써 봐서 잘 맞은 보유 기간만 점수를 보여 드려요</small></h2>
      ${sc && sc.length ? `<div class="of-score">${sc.map(h => `<div><small>${h}년 보유</small><b>${u.sc[h]}점</b><small>${esc(sdShort(S.g))} 오피스텔 중 ${esc(O.scoreRank(u.sc[h]))}</small></div>`).join('')}</div>
        <ul class="why">${O.reasons(u, s, OX).map(t => `<li>${esc(t)}</li>`).join('')}${(u.why || []).map(w => `<li>${esc(w[0])}: 점수를 ${w[1] > 0 ? '올렸어요' : '내렸어요'}</li>`).join('')}</ul>
        <p class="basis">점수 = 과거 여러 때에 그때까지의 자료만으로 매긴 점수가 그 뒤 '가격 변화 + 월세 수입'(같은 시·군·구 평균 대비)을 잘 맞힌 방식으로 매긴 같은 시·도 오피스텔 안 순위예요(100점 만점, 50점이 가운데 · '상위 10%' = 같은 시·도 오피스텔 10곳 중 1등 쪽). 시장 전체가 내리면 점수가 높은 건물도 내릴 수 있어요.</p>`
      : `<p class="note" style="font-size:15px">아직 점수를 매기지 않아요. 과거에 써 봤을 때 맞은 횟수가 적거나 과거 자료가 짧으면 점수 없이 위의 사실 지표만 보여 드려요.</p>`}
      <ul class="why" style="font-size:14px">${['1', '2', '3'].map(h => `<li>${esc(O.btText(OX.bt && OX.bt[h], h))}</li>`).join('')}</ul>
    </div>

    <div class="panel"><h2>최근 매매 실거래<small>국토교통부 실거래 신고 그대로예요(최근 3년, 최신순).</small></h2>
      ${tr.length ? `<div class="tbl"><table><thead><tr><th>계약일</th><th class="num">전용</th><th class="num">층</th><th class="num">거래금액</th></tr></thead><tbody>${tr.slice(0, 30).map(t => `<tr><td>${esc(t.date)}</td><td class="num">${t.area}㎡</td><td class="num">${t.floor != null ? t.floor + '층' : '-'}</td><td class="num">${t.hi ? '<span class="jps-new">신고가</span> ' : ''}<b>${won(t.amt)}</b>${t.direct ? '<br><small class="jps-dir">직거래</small>' : ''}</td></tr>`).join('')}</tbody></table></div>
      <p class="basis"><span class="jps-new">신고가</span> = 그 전까지 같은 전용면적에서 가장 높았던 값보다 비싸게 거래된 경우(수집 자료 기준, 직거래 제외).${tr.length > 30 ? ` 최근 30건만 보여 드려요(전체 ${tr.length}건).` : ''}</p>` : '<p class="note">최근 3년 매매 거래가 없어요.</p>'}
    </div>

    <div class="panel"><h2>최근 월세 계약<small>수익률 계산에 쓴 실제 계약이에요(최근 3년, 최신순). 동·호수 같은 개인정보는 원자료에도 없어요.</small></h2>
      ${rn.length ? `<div class="tbl"><table><thead><tr><th>계약일</th><th class="num">전용·층</th><th class="num">보증금·월세</th><th class="num">수익률</th></tr></thead><tbody>${rn.slice(0, 20).map(t => { const cy = y ? O.contractYield(y.p, t.area, t.dep, t.rent) : null; return `<tr><td>${esc(t.date)}${t.ct ? `<br><small>${t.ct}</small>` : ''}</td><td class="num">${t.area}㎡${t.floor != null ? `<br><small>${t.floor}층</small>` : ''}</td><td class="num"><b>${won(t.dep)}</b><br><small>월 ${t.rent.toLocaleString()}만</small></td><td class="num">${cy != null && cy < 0.4 ? O.pct(cy) : '-'}</td></tr>`; }).join('')}</tbody></table></div>
      ${rn.length > 20 ? `<p class="basis">최근 20건만 보여 드려요(전체 ${rn.length}건).</p>` : ''}<p class="basis">수익률 = 이 계약의 월세 × 12 ÷ (이 건물 지금 ㎡당 매매 시세 × 계약 전용면적 − 보증금). 전세 계약은 위 '전세·월세 시세' 칸에 있어요.</p>` : '<p class="note">최근 3년 월세 계약이 없어요.</p>'}
    </div>

    ${window.JDJ_CM ? JDJ_CM.slot({ t: 'o', g: S.g, d: u.d, k: key, n: O.nameOf(u) }) : ''}
    ${window.JDJ_CS ? JDJ_CS.slot({ gu: sggName(S.g) }) : ''}

    ${MJ ? MJ.btn(mjo, 'bottom', '이 오피스텔 주변 시세와 개발·교통 예정, 역·학교를 지도에서 확인해 보세요', 'offi_to_map_end') : ''}

    <div class="panel"><h2>이어서 알아보기</h2>
      <div class="links">
        <a class="main" href="${esc(jeonse)}" data-track="offi_to_jeonse"><b>이 오피스텔 전월세 시세 →</b><small>전세·월세 추이, 전세가율, 깡통전세 체크</small></a>
        <a href="../tax/#acq" data-track="offi_to_tax"><b>오피스텔 취득세·주택 수 →</b><small>취득세 4.6%와 주거용 오피스텔의 주택 수 포함 여부</small></a>
        <a href="../buy/?src=offi"><b>살 수 있는 예산 계산 →</b><small>내 예산·대출로 필요한 돈</small></a>
      </div>
    </div>`;
    drawCharts(); narBind();
    $('ofRes').querySelectorAll('[data-ofspan]').forEach(b => b.onclick = () => { S.span = +b.dataset.ofspan || 0; $('ofRes').querySelectorAll('[data-ofspan]').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); drawCharts(); });
    if (opt && opt.scroll) $('ofRes').scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (window.JDJ_MAPJ) JDJ_MAPJ.restore();
    if (window.jdjStat) jdjStat('feature_use', { feature: 'mine_offi' });
  }

  /** 뒤로 가기(assets/back.js · mine/ 의 JDJ_BACK.inpage)로 돌아온 주소(og·ob) 상태로 다시 그림 */
  async function navRestore(q) {
    if (!inited || !IX || !$('ofSd')) return;          // 처음 여는 탭이면 init 이 지금 주소를 읽어 그림
    const og = q.get('og') || '', ob = q.get('ob') || '';
    if (og && og === S.g && C['u' + og]) {
      if (ob) { if (S.key !== ob || $('ofRes').hidden) show(ob); }
      else { S.key = ''; CUR = null; $('ofB').value = ''; regionOnly(og); }
      return;
    }
    if (/^\d{5}$/.test(og) && sdOf(og)) await pickSido(sdOf(og), og, ob);
    else { S.key = ''; CUR = null; $('ofRes').hidden = true; }
  }
  function boot() {
    M = window.JDJ_MINE; O = window.JDJ_OFFI;
    const tabs = $('mtabs'); if (!tabs || !M || !O) return;
    css();
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) setTab(b.dataset.t, true); });
    if (new URLSearchParams(location.search).get('t') === 'o') setTab('o', false);
    (window.JDJ_MINE_NAV = window.JDJ_MINE_NAV || {}).o = navRestore;
    let rz = null, lw = innerWidth;
    addEventListener('resize', () => { if (Math.abs(innerWidth - lw) < 8) return; lw = innerWidth; clearTimeout(rz); rz = setTimeout(drawCharts, 200); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
