/* 내 집 시세 화면의 '빌라' 탭 — mine/index.html 의 #mtabs(아파트|빌라|오피스텔|상가·건물)·#villaSec 를 쓴다.
   계산 규칙은 assets/villa-core.js(JDJ_VILLA), 전세가율 문구는 assets/rent-core.js(JDJ_RENT vj…), 금액·날짜 표기는 assets/mine-core.js(JDJ_MINE).
   재개발 정보(정비구역 안/밖·대지지분·사업 단계)는 재개발·빌라 화면(villa/)에 두고 서로 링크한다.
   자료: data/villa/index.json · villa/{구}.json · villa/h/{구}.json(다음 자료 갱신부터) · rent/v/{구}.json · rent/v/h/{구}.json
   URL: ?t=v&vg=구코드&vb=동|지번|이름 (아파트 sd·d·b, 오피스텔 og·ob 와 겹치지 않게 따로 씀) */
(function () {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const DATA = JB.DATA + 'data/';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const C = {};
  const getJ = u => C[u] || (C[u] = fetch(DATA + u, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(u); return r.json(); }).catch(e => { delete C[u]; throw e; }));
  let M, V, R, VX = null, DOC = null, H = null, RD = null, RH = null, CUR = null, inited = false;
  const S = { si: 0, g: '', d: '', key: '', span: 0 };
  const won = v => M.won(v), ymL = v => M.ymLabel(v), ymK = v => M.ymKo(v);
  const py = a => a ? (a / 3.3058).toFixed(1) : '';
  const fmt = n => Number(n).toLocaleString('ko-KR');
  const updown = v => v == null ? '' : v > 0.0005 ? 'up' : v < -0.0005 ? 'dn' : '';
  const sgOf = c => { for (const s of (VX && VX.sido) || []) { const g = s.g.find(x => x.c === c); if (g) return { sido: s.n, name: g.n }; } return { sido: '', name: c }; };
  const P = () => window.JDJ_PRICE;

  function css() {
    if ($('vlCss')) return;
    const st = document.createElement('style'); st.id = 'vlCss';
    st.textContent = `.vl-chart{width:100%;min-height:140px}
.vl-chart svg{display:block;width:100%;height:auto}
.vl-lg{display:flex;gap:14px;flex-wrap:wrap;font-size:13.5px;color:#4E5968;margin-top:4px}
.vl-lg i{display:inline-block;width:18px;height:3px;border-radius:2px;vertical-align:middle;margin-right:5px;background:#2560E8}
.vl-lg i.j{background:#14A06B}
.vl-lg i.r{background:#0E7A4F;height:2px}
.vl-lg i.g{background:repeating-linear-gradient(90deg,#8B95A1 0 5px,transparent 5px 8px)}
.vl-lg i.gap{background:repeating-linear-gradient(90deg,#2560E8 0 3px,transparent 3px 7px);opacity:.55}
.vl-fill{font-size:13.5px;color:#6B7684;margin:8px 0 0}
.vl-jr{border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-top:10px}
.vl-jr .t{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px}
.vl-jr .t .k{font-size:14px;font-weight:700;color:#4E5968}
.vl-jr .t b{font-size:24px;font-weight:900;letter-spacing:-.03em;line-height:1.2}
.vl-jr .t b.hi{color:#C81E1E}
.vl-jr .t small{font-size:13.5px;color:#4E5968}
.vl-jr p{font-size:14px;line-height:1.6;color:#4E5968;margin:6px 0 0;word-break:keep-all}
.vl-jr .jps-jrc{margin:10px 0 2px}
.jps-jrc.jrm{border-color:#D5DCE6;background:#F7F9FC}.jps-jrc.jrm b{color:#3E4754}
.vl-few{background:#F5F8FF;border:1px solid #C9D8FF;border-radius:14px;padding:12px 14px;font-size:15px;line-height:1.65;margin:10px 0}
.vl-prep{border:1px dashed #C9D8FF;background:#F8FAFF;border-radius:16px;padding:14px 16px;font-size:15px;line-height:1.7}
.vl-road{font-size:13.5px;color:#4E5968;margin-top:2px}
.vl-land{font-size:13.5px;color:#4E5968}
.vl-sub{font-size:16px;margin:14px 0 6px}
.vl-tag{display:inline-block;font-size:12.5px;font-weight:700;color:#4E5968;border:1px solid var(--line);border-radius:999px;padding:1px 7px;margin-left:4px}
@media(max-width:400px){.mtabs button{font-size:15px;padding:0 2px}}`;
    document.head.appendChild(st);
  }

  /* ---------- 탭 (오피스텔·상가·건물 탭과 같은 숨김 기록 window.JDJ_TABWAS, 설명·질문 칸은 상가·건물 탭과 같은 data-cm-hid 표시) ---------- */
  const HIDE = ['homesSec', 'findSec', 'res', 'src'];
  function setTab(t, push) {
    const tabs = $('mtabs'), sec = $('villaSec'); if (!tabs || !sec) return;
    const was = (window.JDJ_TABWAS = window.JDJ_TABWAS || {});
    tabs.querySelectorAll('[data-t]').forEach(b => { const on = b.dataset.t === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    if (t === 'v') {
      HIDE.forEach(id => { const el = $(id); if (el) { if (!(id in was)) was[id] = el.hidden; el.hidden = true; } });
      sec.hidden = false;
      ['askBox'].concat([...document.querySelectorAll('main > p.lead')].map(x => (x.id = x.id || 'mineLead'))).forEach(id => { const el = $(id); if (el && !el.hidden) { el.hidden = true; el.dataset.cmHid = '1'; } });
      if (!inited) init();
    } else sec.hidden = true;
    if (push) {
      const u = new URL(location.href);
      if (t === 'v') { u.searchParams.set('t', 'v'); ['og', 'ob', 'cg', 'ck', 'cb'].forEach(k => u.searchParams.delete(k)); }
      else ['vg', 'vb'].forEach(k => u.searchParams.delete(k));
      history.replaceState(null, '', u);
    }
  }

  /* ---------- 자료·찾기 ---------- */
  async function init() {
    inited = true; css();
    const sec = $('villaSec');
    sec.innerHTML = '<div class="loading">빌라 자료를 불러오는 중이에요…</div>';
    try { VX = await getJ('villa/index.json'); } catch (e) { sec.innerHTML = '<div class="empty">빌라 자료를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.</div>'; return; }
    shell();
    const q = new URLSearchParams(location.search), vg = q.get('vg') || '', vb = q.get('vb') || '';
    let si = VX.sido.findIndex(s => s.g.some(x => x.c === vg));
    if (si < 0) si = Math.max(0, VX.sido.findIndex(s => /^서울/.test(s.n)));
    await pickSido(si, vg, vb);
  }
  function shell() {
    $('villaSec').innerHTML = `
    <section class="panel" aria-labelledby="vlT">
      <h2 id="vlT">빌라 찾기<small>빌라(연립·다세대)는 이름이 비슷한 건물이 많아요. 시·군·구를 고른 뒤 건물 이름, 지번, 도로명 주소 중 아는 것으로 찾아 주세요. 동 → 건물 순서로 골라도 돼요.</small></h2>
      <div class="pick" style="margin-top:10px">
        <div><label for="vlSd">시·도</label><select id="vlSd"></select></div>
        <div><label for="vlG">시·군·구</label><select id="vlG"></select></div>
        <div><label for="vlD">동</label><select id="vlD" disabled><option value="">동 선택</option></select></div>
        <div><label for="vlB">건물</label><select id="vlB" disabled><option value="">건물 선택</option></select></div>
      </div>
      <p class="or">또는 건물 이름·지번·도로명 주소로 찾기 <span style="font-weight:500">(지번·이름은 선택한 시·군·구 안에서 찾아요)</span></p>
      <div class="pick"><div class="full"><label for="vlQ" style="position:absolute;left:-9999px">건물 이름, 지번 또는 도로명 주소</label><input id="vlQ" type="search" placeholder="예: 신원빌라 · 망원동 459-15 · 월드컵로12길 34" autocomplete="off" enterkeyhint="search"></div></div>
      <div class="sres" id="vlSres" aria-live="polite"></div>
      <div id="vlMsg" class="note" aria-live="polite"></div>
      ${V.fillNote(VX) ? '<p class="vl-fill">집코드는 예전 기록을 채우는 중이에요. 다 채우면 이 화면에 자동으로 반영돼요.</p>' : ''}
    </section>
    <section id="vlRes" hidden aria-live="polite"></section>
    <p class="disc">자료: 국토교통부 연립·다세대 매매 실거래가 · 국토교통부 연립·다세대 전월세 실거래가(공공데이터포털). 해제(취소) 신고된 거래는 빼요. 원자료에는 동·호수가 없어서 같은 건물 안 다른 호수의 거래도 함께 보여요.</p>`;
    $('vlSd').innerHTML = VX.sido.map((s, i) => `<option value="${i}">${esc(s.n)}</option>`).join('');
    $('vlSd').onchange = () => pickSido(+$('vlSd').value);
    $('vlG').onchange = () => pickSgg($('vlG').value);
    $('vlD').onchange = () => pickDong($('vlD').value);
    $('vlB').onchange = () => { if ($('vlB').value) show($('vlB').value, { scroll: true }); };
    let qt = null;
    $('vlQ').addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(runSearch, 250); });
    $('vlQ').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(true); } });
    $('vlSres').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; $('vlSres').innerHTML = ''; $('vlQ').value = ''; show(b.dataset.k, { scroll: true }); });
  }
  async function pickSido(si, keepG, keepB) {
    S.si = si; $('vlSd').value = si;
    const gs = (VX.sido[si] || { g: [] }).g;
    $('vlG').innerHTML = '<option value="">시·군·구 선택</option>' + gs.map(g => `<option value="${g.c}">${esc(g.n)} (${fmt(g.b)}곳)</option>`).join('');
    if (keepG && gs.some(g => g.c === keepG)) { $('vlG').value = keepG; await pickSgg(keepG, keepB); }
    else { $('vlD').disabled = $('vlB').disabled = true; $('vlRes').hidden = true; }
  }
  async function pickSgg(g, keepB) {
    S.g = g; CUR = null; DOC = H = RD = RH = null; $('vlSres').innerHTML = '';
    $('vlD').innerHTML = '<option value="">동 선택</option>'; $('vlB').innerHTML = '<option value="">건물 선택</option>';
    $('vlD').disabled = $('vlB').disabled = true; $('vlRes').hidden = true;
    if (!g) return;
    setUrl(g, '');
    $('vlMsg').textContent = '건물 목록을 불러오는 중이에요…';
    let d; try { [d, H] = await Promise.all([getJ('villa/' + g + '.json'), getJ('villa/h/' + g + '.json').catch(() => null)]); $('vlMsg').textContent = ''; }
    catch (e) { $('vlMsg').textContent = '이 시·군·구의 빌라 자료를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.'; return; }
    if (S.g !== g) return;
    DOC = d;
    const ds = V.dongs(d.b);
    $('vlD').innerHTML = `<option value="">동 선택 (${ds.length}개)</option>` + ds.map(x => `<option>${esc(x)}</option>`).join('');
    $('vlD').disabled = !ds.length;
    const kd = (keepB || '').split('|')[0];
    if (kd && ds.includes(kd)) { $('vlD').value = kd; pickDong(kd, keepB); }
    if ($('vlQ').value.trim()) runSearch();
  }
  function pickDong(d, keepB) {
    S.d = d; if (!DOC) return;
    const list = V.inDong(DOC.b, d);
    $('vlB').innerHTML = `<option value="">건물 선택 (${list.length}곳)</option>` + list.map(b => `<option value="${esc(V.keyOf(b))}">${esc(V.nameOf(b))} · ${esc(b.j)}</option>`).join('');
    $('vlB').disabled = !list.length;
    if (keepB && list.some(b => V.keyOf(b) === keepB)) { $('vlB').value = keepB; show(keepB); }
  }
  const hitBtn = b => `<button type="button" data-k="${esc(V.keyOf(b))}"><b>${esc(V.nameOf(b))}</b><small>${esc(sgOf(S.g).name)} ${esc(b.d)} ${esc(b.j)} · ${esc(b.t || '빌라')}${b.y ? ' · ' + b.y + '년 준공' : ''} · 최근 거래 ${esc(ymL(String(b.dt).slice(0, 6)))}</small></button>`;
  async function runSearch(enter) {
    const q = $('vlQ').value.trim(), box = $('vlSres');
    if (!q) { box.innerHTML = ''; return; }
    if (V.isRoad(q)) { box.innerHTML = '<div class="none">도로명 주소를 지번으로 바꿔 찾는 중이에요…</div>'; return roadSearch(q); }
    if (!DOC) { box.innerHTML = '<div class="none">먼저 시·군·구를 골라 주세요.</div>'; return; }
    const hits = V.search(DOC.b, q, 12);
    if (hits.length === 1 && enter) { box.innerHTML = ''; return show(V.keyOf(hits[0]), { scroll: true }); }
    box.innerHTML = hits.length ? hits.map(hitBtn).join('')
      : `<div class="none">'${esc(q)}'에 맞는 빌라를 ${esc(sgOf(S.g).name)}에서 찾지 못했어요. 지번(예: 망원동 459-15)이나 도로명 주소(예: 월드컵로12길 34)로 찾아 보세요. 최근 3년 안에 매매 신고가 있었던 건물만 찾을 수 있어요.</div>`;
  }

  /* ---------- 도로명 주소 ↔ 지번 (카카오 지도 주소 찾기, 브라우저에서 바로 — 서버에 따로 보내지 않음) ---------- */
  let geoP = null;
  function geocoder() {
    if (geoP) return geoP;
    const key = String((window.JDJ_SITE && window.JDJ_SITE.KAKAO_JS_KEY) || '').trim();
    geoP = new Promise((ok, no) => {
      if (!key) return no(new Error('nokey'));
      const done = () => window.kakao.maps.load(() => window.kakao.maps.services ? ok(new window.kakao.maps.services.Geocoder()) : no(new Error('nosvc')));
      if (window.kakao && window.kakao.maps) return done();
      const s = document.createElement('script');
      s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services&appkey=' + encodeURIComponent(key);
      s.onload = () => (window.kakao && window.kakao.maps ? done() : no(new Error('sdk')));
      s.onerror = () => no(new Error('sdk'));
      document.head.appendChild(s);
    }).catch(e => { geoP = null; throw e; });
    return geoP;
  }
  const addr = (gc, q) => new Promise(ok => { try { gc.addressSearch(q, (r, st) => ok(st === 'OK' ? r : []), { size: 5 }); } catch (e) { ok([]); } });
  async function roadSearch(q) {
    const box = $('vlSres'), fail = '<div class="none">도로명 주소를 지번으로 바꾸지 못했어요. 지번(예: 망원동 459-15)이나 건물 이름으로 찾아 주세요.</div>';
    let gc; try { gc = await geocoder(); } catch (e) { box.innerHTML = fail; return; }
    const sg = sgOf(S.g), qs = /(시|군|구)\s/.test(q) ? [q] : [`${sg.sido} ${sg.name} ${q}`, q];
    let docs = [];
    for (const x of qs) { docs = await addr(gc, x); if (docs.length) break; }
    const hits = [];
    for (const d0 of docs) {
      const a = d0.address; if (!a) continue;
      const g = String(a.b_code || '').slice(0, 5), j = (a.mountain_yn === 'Y' ? '산' : '') + a.main_address_no + (a.sub_address_no && a.sub_address_no !== '0' ? '-' + a.sub_address_no : '');
      const dong = a.region_3depth_name || '';
      if (g && g !== S.g && VX.sido.some(s => s.g.some(x => x.c === g))) {
        const si = VX.sido.findIndex(s => s.g.some(x => x.c === g));
        await pickSido(si, g);
      }
      if (!DOC) continue;
      V.search(DOC.b, `${dong} ${j}`, 12).filter(b => V.jibunOf(b.j) === V.jibunOf(j)).forEach(b => { if (!hits.includes(b)) hits.push(b); });
      if (hits.length) { hits.road = d0.road_address ? d0.road_address.address_name : q; hits.jb = `${dong} ${j}`; break; }
      hits.jb = hits.jb || `${dong} ${j}`;
    }
    if (hits.length === 1) { box.innerHTML = ''; $('vlQ').value = ''; return show(V.keyOf(hits[0]), { scroll: true, road: hits.road }); }
    box.innerHTML = hits.length ? `<div class="none">'${esc(q)}' = ${esc(hits.jb)} — 이 지번의 빌라예요.</div>` + hits.map(hitBtn).join('')
      : docs.length ? `<div class="none">'${esc(q)}'는 지번 ${esc(hits.jb || '')}이에요. 그런데 이 지번에는 최근 3년 매매 신고가 있는 빌라가 없어요.</div>` : fail;
  }
  /** 고른 건물의 도로명 주소를 위치 줄에 덧붙임(찾지 못하면 그대로 둠) */
  async function roadLine(b, known) {
    const el = $('vlRoad'); if (!el) return;
    if (known) { el.textContent = '도로명 ' + known; return; }
    try {
      const gc = await geocoder(), sg = sgOf(S.g), r = await addr(gc, `${sg.sido} ${sg.name} ${b.d} ${b.j}`);
      const ra = r.find(x => x.road_address) ; if (ra && $('vlRoad') === el && CUR && CUR.b === b) el.textContent = '도로명 ' + ra.road_address.address_name;
    } catch (e) { /* 지도 키가 이 주소에서 안 되면 지번만 보여 줌 */ }
  }
  function setUrl(g, key) {
    const u = new URL(location.href); u.searchParams.set('t', 'v'); u.searchParams.set('vg', g);
    if (key) u.searchParams.set('vb', key); else u.searchParams.delete('vb');
    history.replaceState(null, '', u);
  }

  /* ---------- 차트 (아파트 화면과 같은 공용 차트 JDJ_PRICE.mountHist: 안내선·말풍선·거래 없던 달 한 줄·둥근 눈금) ---------- */
  function hist() {
    if (!CUR) return null;
    const { tr, area } = CUR, to = (H && H.to) || VX.to;
    const start = tr.full ? ((H && H.hm) || VX.hm || VX.from) : VX.from;
    const months = V.monthsFrom(start, to), ps = V.priceSeries(tr, months, area);
    const jl = RD ? V.jeonseLine(CUR.rows, RD, RH, months, area) : null;
    const j = jl ? jl.a : months.map(() => 0);
    return { months, s: ps.s, j, jr: ps.s.map((v, i) => v > 0 && j[i] > 0 ? j[i] / v : 0), cnt: ps.cnt, jl };
  }
  const spans = (n, cur) => `<div class="seg2" role="group" aria-label="기간">${[12, 36, 60].filter(m => m < n).map(m => ({ s: m, l: m / 12 + '년' })).concat([{ s: 0, l: '전체' }]).map(b => `<button type="button" data-vlspan="${b.s}" class="${b.s === cur || (!b.s && !cur) ? 'on' : ''}" aria-pressed="${b.s === cur}">${b.l}</button>`).join('')}</div>`;
  function drawCharts() {
    const el = $('vlCP'); if (!el || !CUR || !P()) return;
    const h = CUR.h = hist(), w = M.histWindow(h, S.span), gu = V.dongLine(H, CUR.b.d, CUR.area);
    P().mountHist(el, w, { h: 240, fs: 13.5, sub: true, noFill: true, cnt: h.cnt, gu, aria: h.jl ? '매매·전세 시세 추이' : '매매 시세 추이' });
  }

  /* ---------- 결과 ---------- */
  const tdDate = t => `${esc(t.date)}${t.ct ? `<br><small>${esc(t.ct)}</small>` : ''}`;
  function jrHtml(b) {
    const list = b.jr || [], j = R.vjPick(list, b.a);
    let h;
    if (j && j.r > 0) {
      const lv = R.vjLevel(j.r);
      h = `<div class="t"><span class="k">전세가율</span><b class="${lv === 'hi' ? 'hi' : ''}">${Math.round(j.r * 100)}%</b><small>${esc(j.bd)} · 전용 ${j.a}㎡ · ${j.b === 'd' ? '같은 동 비슷한 빌라 기준' : '같은 건물 매매 기준'}${j.jw === 12 ? ' · ' + esc(R.vjWin(j)) : ''}</small></div>
        <p><b>전세 시세</b> ${won(j.j)} · <b>매매 시세</b> ${won(j.s)}</p>
        <p><b>계산 근거</b> · ${esc(R.vjBasis(j, b.d))}</p>${R.vjNote(j.r, j.at, '../jeonse/checklist/?k=v')}`;
    } else h = `<div class="t"><span class="k">전세가율</span></div><p style="color:var(--ink,#191F28);font-size:14.5px">${esc(R.vjMiss(j, !list.length))}</p>`;
    const oth = list.filter(x => x !== j && x.r > 0);
    if (oth.length) h += `<p>다른 평형 · ${oth.map(x => `${esc(x.bd)}(전용 ${x.a}㎡) ${Math.round(x.r * 100)}%${x.b === 'd' ? '(같은 동 비슷한 빌라 기준)' : ''}${x.jw === 12 ? '(최근 1년 전세 기준)' : ''}${R.bandTag(x.r)}`).join(' · ')}</p>`;
    /* 대표 평형이 아니어도 80% 이상인 평형은 맨 위에 그 평형 이름으로 안내(세입자 보호) */
    return `<div class="vl-jr">${R.bandTop(oth.map(x => ({ bd: x.bd, r: x.r, at: x.at })), '../jeonse/checklist/?k=v')}${h}</div>`;
  }
  function rentPanel(b) {
    const head = `<h2>전세·월세<small>국토교통부 전월세 신고 자료로 정리했어요. 원자료에는 동·호수 같은 개인정보가 없어요.</small></h2>`;
    let lists;
    if (!RD) lists = `<p class="note" id="vlRentWait">${RD === false ? '전월세 계약 목록을 불러오지 못했어요. 아래 \'이 빌라 전월세 시세 자세히 보기\'에서 확인해 주세요.' : '이 건물 전월세 계약을 불러오는 중이에요…'}</p>`;
    else {
      const c = V.contracts(CUR.rows);
      const jl = c.j.length ? c.j : (b.jl || []).map(t => { const s = String(t[0]); return { date: `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`, area: t[1], floor: t[2], dep: t[3], ct: ['신규', '갱신', ''][t[4]] || '' }; });
      lists = `<h3 class="vl-sub">최근 전세 계약</h3>${jl.length ? `<div class="tbl"><table><thead><tr><th>계약일</th><th class="num">전용·층</th><th class="num">보증금</th></tr></thead><tbody>${jl.slice(0, 10).map(t => `<tr><td>${tdDate(t)}</td><td class="num">${t.area}㎡${t.floor != null ? `<br><small>${t.floor}층</small>` : ''}</td><td class="num"><b>${won(t.dep)}</b>${t.pre != null ? `<br><small>종전 ${won(t.pre)}</small>` : ''}</td></tr>`).join('')}</tbody></table></div>${jl.length > 10 ? `<p class="basis">최근 10건만 보여 드려요(최근 3년 ${jl.length}건).</p>` : ''}` : '<p class="note">이 건물은 최근 3년 순수 전세 계약이 없어요.</p>'}
      <h3 class="vl-sub">최근 월세 계약</h3>${c.w.length ? `<div class="tbl"><table><thead><tr><th>계약일</th><th class="num">전용·층</th><th class="num">보증금·월세</th></tr></thead><tbody>${c.w.slice(0, 10).map(t => `<tr><td>${tdDate(t)}</td><td class="num">${t.area}㎡${t.floor != null ? `<br><small>${t.floor}층</small>` : ''}</td><td class="num"><b>${won(t.dep)}</b><br><small>월 ${fmt(t.rent)}만</small></td></tr>`).join('')}</tbody></table></div>${c.w.length > 10 ? `<p class="basis">최근 10건만 보여 드려요(최근 3년 ${c.w.length}건).</p>` : ''}` : '<p class="note">이 건물은 최근 3년 월세 계약이 없어요.</p>'}`;
    }
    return `<div class="panel" id="vlRent">${head}${jrHtml(b)}${lists}
      <p class="basis"><a href="${esc(jeonseHref(b))}" data-track="villa_tab_to_jeonse">이 빌라 전월세 시세 자세히 보기 →</a></p></div>`;
  }
  const jeonseHref = b => `../jeonse/?k=v&g=${encodeURIComponent(S.g)}&d=${encodeURIComponent([b.d, b.j, b.n].join('|'))}`;
  const redevHref = b => `../villa/?g=${encodeURIComponent(S.g)}&d=${encodeURIComponent(b.d)}&q=${encodeURIComponent(b.j)}&f=all`;
  function dongPanel(b, few) {
    const s = V.dongSum(DOC, H, b.d), nm = `${b.d} 빌라`;
    const rows = [];
    if (s && s.n != null) rows.push(`<div class="st"><div class="k">${esc(nm)} 최근 1년 매매</div><div class="v">${fmt(s.n)}건</div><div class="d">거래된 건물 ${fmt(s.nb)}곳 · 직거래 제외</div></div>`,
      `<div class="st"><div class="k">${esc(nm)} 거래가 중간값</div><div class="v">${won(s.price)}</div><div class="d">최근 1년</div></div>`,
      `<div class="st"><div class="k">${esc(nm)} 전용 ㎡당 가격</div><div class="v">${fmt(Math.round(s.ppm))}만 원</div><div class="d">이 건물 전용 ${CUR.area}㎡로 환산하면 약 ${won(Math.round(s.ppm * CUR.area / 100) * 100)}</div></div>`);
    if (s && s.landPy) rows.push(`<div class="st"><div class="k">${esc(nm)} 대지지분 평당가</div><div class="v">${fmt(s.landPy.m)}만 원</div><div class="d">최근 1년 중간값 · ${fmt(s.landPy.c)}건</div></div>`);
    if (s && s.jr) rows.push(`<div class="st"><div class="k">${esc(nm)} 전체 전세가율</div><div class="v">${Math.round(s.jr.r * 100)}%</div><div class="d">${ymL(s.jr.at)} 기준 · 전세 ${fmt(s.jr.nj)}건, 매매 ${fmt(s.jr.ns)}건</div></div>`);
    const lead = few ? `<div class="vl-few">이 건물은 최근 1년 매매가 ${few.n}건${few.n ? '뿐' : '도 없'}이라 이 건물 숫자만으로는 시세를 판단하기 어려워요. 그래서 같은 동 빌라 전체 숫자를 함께 보여 드려요.</div>` : '';
    return `<div class="panel" id="vlDong"><h2>${esc(b.d)} 빌라 전체<small>같은 동 연립·다세대 실거래를 모두 모은 숫자예요. 같은 건물끼리 맞춘 값이 아니라 동네 흐름을 보는 참고값이에요.</small></h2>${lead}
      ${rows.length ? `<div class="stats">${rows.join('')}</div>` : `<p class="note">${esc(b.d)}는 최근 1년 빌라 거래가 적어서 동 전체 숫자를 계산하지 않았어요.</p>`}
      ${s && s.n == null ? `<p class="basis">${esc(b.d)} 빌라 전체의 최근 1년 매매 수와 거래가 중간값은 다음 자료 갱신 때 함께 보여 드려요.</p>` : ''}</div>`;
  }
  function show(key, opt) {
    if (!DOC) return;
    const b = DOC.b.find(x => V.keyOf(x) === key); if (!b) return;
    S.key = key;
    if ($('vlD').value !== b.d) { $('vlD').value = b.d; pickDong(b.d); }
    $('vlB').value = key; setUrl(S.g, key);
    const to = (H && H.to) || VX.to, tr = V.markHighs(V.tradesOf(b, H)), area = V.repArea(b, tr, to);
    CUR = { b, tr, area, rows: RD ? V.rentRows(RD, b) : [] };
    const h = hist(), last = V.latest(h.s, h.months), any = V.lastAny(h.s, h.months);
    const c1 = M.changeBack(h.s, h.months, 12), c3 = M.changeBack(h.s, h.months, 36);
    const chTxt = c => c ? `<span class="${updown(c.pct)}">${M.pctTxt(c.pct)}</span>` : '-';
    const hi = V.highs(tr, to), n1 = V.n12(tr, to), few = M.isFew({ 5: n1 }) ? { n: n1 } : null;
    const sg = sgOf(S.g), lt = tr.list[0];
    const hiBox = (k, x) => x ? `<div><div class="k">${k}</div><div class="v">${won(x.amt)}</div><div class="d">${ymL(x.ymd.slice(0, 6))} · 전용 ${x.area}㎡</div></div>` : '';
    const hiFrom = tr.full ? ((H && H.hm) || VX.hm) : VX.from;
    const MJ = window.JDJ_MAPJ, mjo = { kind: 'v', g: S.g, dong: b.d, jibun: b.j, name: V.nameOf(b), price: b.p, ll: Array.isArray(b.xy) ? [b.xy[1], b.xy[0]] : null };
    const sc = V.scoreHead(VX, b), fill = V.fillNote(VX);
    $('vlRes').hidden = false;
    $('vlRes').innerHTML = `
    <div class="panel">
      <div class="dhead"><div><h2>${esc(V.nameOf(b))}</h2><div class="loc">${esc(sg.sido)} ${esc(sg.name)} ${esc(b.d)} ${esc(b.j)}${b.y ? ` · ${window.JDJ_PLAIN && JDJ_PLAIN.ageText(b.y) ? JDJ_PLAIN.ageText(b.y, null, '준공') : b.y + '년 준공'}` : ''} · ${esc(b.t || '빌라')} · 대표 전용 ${area}㎡</div><div class="vl-road" id="vlRoad"></div>${MJ ? `<div class="mapj-row">${MJ.btn(mjo, 'top', '', 'villa_tab_to_map')}</div>` : ''}</div></div>
      <div class="stats">
        <div class="st key"><div class="k">최근 거래가</div><div class="v">${lt ? won(lt.amt) : '-'}</div><div class="d">${lt ? `${esc(lt.date)} · 전용 ${lt.area}㎡${lt.floor != null ? ` · ${lt.floor}층` : ''}${lt.direct ? ' · 직거래' : ''}` : '최근 매매가 없어요'}</div></div>
        <div class="st"><div class="k">${last ? '최근 시세' : '마지막 시세'} (전용 ${area}㎡)</div><div class="v">${last ? won(last.v) : any ? won(any.v) : '확인 불가'}</div><div class="d">${last ? ymL(last.at) + ' 기준 · 3개월 거래 중간값' : any ? ymL(any.at) + ' · 최근 3개월 거래 없음' : '거래가 적어요'}</div></div>
        <div class="st"><div class="k">대지권(대지지분)</div><div class="v">${b.l ? `${b.l}㎡` : '확인 불가'}</div><div class="d">${b.l ? `약 ${py(b.l)}평${b.pp ? ` · 대지지분 평당가 ${fmt(b.pp)}만 원` : ''}` : '최근 거래 신고에 대지권 면적이 없어요'}</div></div>
        <div class="st"><div class="k">최근 1년 매매</div><div class="v">${n1}건</div><div class="d">1년 변동 ${chTxt(c1)} · 3년 ${chTxt(c3)}</div></div>
      </div>
      ${hi.hi ? `<div class="hib">${hiBox(`최고가 (${ymK(hiFrom)} 이후)`, hi.hi)}${hiBox('최근 1년 최고가', hi.hi1)}</div>` : ''}
      <p class="basis"><b>계산 근거</b> · 시세 = 이 건물의 그 달까지 3개월 매매 실거래 전용 ㎡당 가격 중간값 × 대표 전용 ${area}㎡ (100만 원 단위 반올림${tr.full ? ', 직거래 제외' : ''}) · 1년·3년 변동 = 같은 방식으로 12·36개월 전 달과 비교 · 최고가 = ${tr.full ? '수집한 실거래 중 직거래를 뺀 가장 높은 거래' : '최근 3년 실거래 중 가장 높은 거래'} · 대지권 = 이 건물 최근 거래 신고에 적힌 땅 지분 면적.</p>
    </div>
    ${few ? dongPanel(b, few) : ''}
    <div class="panel">
      <div class="chead"><h3 id="vlCT">매매 시세 추이</h3>${spans(h.months.length, S.span)}</div>
      <div class="vl-chart" id="vlCP"></div>
      <div class="vl-lg" id="vlLg"></div>
      <p class="basis">전용 ${area}㎡ 기준이에요. 그래프 위에서 손가락이나 마우스를 움직이면 그 달의 시세와 매매 신고 건수가 위 칸에 나와요. 흐린 점선은 거래가 없던 기간이고, 점선 위의 달에는 시세 값이 없어요.</p>
      <p class="basis" id="vlCB"></p>
      ${tr.full ? '' : `<p class="basis">지금은 이 건물의 최근 3년 거래 ${tr.list.length}건으로 그렸어요. 다음 자료 갱신부터 수집한 모든 기간의 거래로 그려요.</p>`}
      ${fill ? '<p class="vl-fill">집코드는 예전 기록을 채우는 중이에요. 다 채우면 이 그래프 앞부분이 자동으로 늘어나요.</p>' : ''}
    </div>
    ${rentPanel(b)}
    ${few ? '' : dongPanel(b, null)}
    <div class="panel"><h2>미래가치 점수<small>과거 자료에 그대로 써 봐서 잘 맞은 보유 기간만 점수를 보여 드려요</small></h2>
      ${sc.ok ? `<div class="of-score">${sc.hs.map(x => `<div><small>${x}년 보유</small><b>${b.sc[x]}점</b></div>`).join('')}</div>` : `<p class="note" style="font-size:15px">${esc(sc.text)}</p>`}
      <p class="basis">빌라 점수가 나오기 전에는 위의 실거래·전세가율 같은 사실 숫자만 보여 드려요.</p>
    </div>
    <div class="panel"><h2>최근 매매 실거래<small>국토교통부 실거래 신고 그대로예요(최신순).</small></h2>
      ${tr.list.length ? `<div class="tbl"><table><thead><tr><th>계약일</th><th class="num">전용·대지권</th><th class="num">층</th><th class="num">거래금액</th></tr></thead><tbody>${tr.list.slice(0, 30).map(t => `<tr><td>${esc(t.date)}</td><td class="num">${t.area}㎡${t.land ? `<br><small>대지 ${t.land}㎡</small>` : ''}</td><td class="num">${t.floor != null ? t.floor + '층' : '-'}</td><td class="num">${t.hi ? '<span class="jps-new">신고가</span> ' : ''}<b>${won(t.amt)}</b>${t.direct ? '<br><small class="jps-dir">직거래</small>' : ''}</td></tr>`).join('')}</tbody></table></div>
      <p class="basis">${tr.full ? `<span class="jps-new">신고가</span> = 그 전까지 같은 전용면적에서 가장 높았던 값보다 비싸게 거래된 경우예요(수집 자료 기준, 직거래 제외).${tr.list.length > 30 ? ` 최근 30건만 보여 드려요(전체 ${tr.list.length}건).` : ''}` : `지금은 최근 3년 거래를 ${tr.list.length}건까지 보여 드려요. 신고가 표시는 다음 자료 갱신부터 수집한 모든 기간의 거래와 비교해 붙여요.`}</p>` : '<p class="note">최근 3년 매매 거래가 없어요.</p>'}
    </div>
    ${MJ ? MJ.btn(mjo, 'bottom', '이 빌라 주변 시세와 개발·교통 예정, 역·학교를 지도에서 확인해 보세요', 'villa_tab_to_map_end') : ''}
    <div class="panel"><h2>이어서 알아보기</h2>
      <div class="links">
        <a class="main" href="${esc(redevHref(b))}" data-track="villa_tab_to_redev"><b>이 빌라의 재개발 정보 보기 →</b><small>정비구역 안·밖, 대지지분 평당가, 사업 단계, 입주권 확인</small></a>
        <a href="${esc(jeonseHref(b))}" data-track="villa_tab_to_jeonse"><b>이 빌라 전월세 시세 →</b><small>전세·월세 추이, 전세가율, 깡통전세 체크</small></a>
        <a href="../jeonse/checklist/?k=v" data-track="villa_tab_to_checklist"><b>빌라 전세 계약 전 체크리스트 →</b><small>등기부등본·공시가격·보증보험 확인 순서</small></a>
        <a href="../buy/?src=villa"><b>살 수 있는 예산 계산 →</b><small>내 예산·대출로 필요한 돈</small></a>
      </div>
    </div>`;
    legend(); drawCharts(); roadLine(b, opt && opt.road);
    $('vlRes').querySelectorAll('[data-vlspan]').forEach(x => x.onclick = () => { S.span = +x.dataset.vlspan || 0; $('vlRes').querySelectorAll('[data-vlspan]').forEach(y => { const on = y === x; y.classList.toggle('on', on); y.setAttribute('aria-pressed', on); }); drawCharts(); });
    if (opt && opt.scroll) $('vlRes').scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (window.JDJ_MAPJ) JDJ_MAPJ.restore();
    if (window.jdjStat) jdjStat('feature_use', { feature: 'mine_villa' });
    loadRent(b);
  }
  /** 범례·차트 설명(전세 선·동 비교선이 있을 때만 그 줄) */
  function legend() {
    if (!CUR || !$('vlLg')) return;
    const h = CUR.h = hist(), gu = V.dongLine(H, CUR.b.d, CUR.area);
    $('vlCT').textContent = h.jl ? '매매·전세 시세 추이' : '매매 시세 추이';
    $('vlLg').innerHTML = `<span><i></i>매매</span>${h.jl ? '<span><i class="j"></i>전세</span><span><i class="r"></i>전세가율(아래 작은 그래프)</span>' : ''}${gu ? `<span><i class="g"></i>${esc(gu.name)} 전체</span>` : ''}<span><i class="gap"></i>거래가 없던 기간</span>`;
    $('vlCB').innerHTML = `각 달 값 = 그 달까지 3개월 실거래 ㎡당 가격 중간값 × 전용 ${CUR.area}㎡.${h.jl ? ` 전세는 월세 없는 순수 전세만 써요. 이 건물 ${esc(h.jl.band)} 평형(전용 ${h.jl.area}㎡) 계약의 3개월 보증금 중간값을 전용 ${CUR.area}㎡로 환산했어요.` : ''}${gu ? ` 회색 점선은 ${esc(gu.name)} 전체의 3개월 매매 ㎡당 가격 중간값을 같은 전용으로 환산한 값이에요(거래가 충분한 달만).` : ''}`;
  }
  /** 전월세 자료(구 파일이 커서 건물을 고른 뒤 받음) → 전월세 칸·차트 전세 선 다시 그림 */
  async function loadRent(b) {
    if (RD) return;
    const g = S.g;
    try {
      const [rd, rh] = await Promise.all([getJ('rent/v/' + g + '.json'), getJ('rent/v/h/' + g + '.json').catch(() => null)]);
      if (S.g !== g) return;
      RD = rd; RH = rh;
    } catch (e) { if (S.g === g) RD = false; }
    if (!CUR || CUR.b !== b || !$('vlRent')) return;
    CUR.rows = RD ? V.rentRows(RD, b) : [];
    const box = document.createElement('div'); box.innerHTML = rentPanel(b);
    $('vlRent').replaceWith(box.firstElementChild);
    if (RD === false) RD = null;
    legend(); drawCharts();
  }

  function boot() {
    M = window.JDJ_MINE; V = window.JDJ_VILLA; R = window.JDJ_RENT;
    const tabs = $('mtabs'); if (!tabs || !M || !V || !R || !$('villaSec')) return;
    css();
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) setTab(b.dataset.t, true); });
    if (new URLSearchParams(location.search).get('t') === 'v') setTab('v', false);
    let rz = null, lw = innerWidth;
    addEventListener('resize', () => { if (Math.abs(innerWidth - lw) < 8) return; lw = innerWidth; clearTimeout(rz); rz = setTimeout(drawCharts, 200); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
