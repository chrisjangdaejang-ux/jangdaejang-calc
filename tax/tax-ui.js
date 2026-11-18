/* 장대장 세금 계산기 화면 — 모든 계산은 이 브라우저 안에서만 (서버 전송 없음) */
(function () {
  'use strict';
  const T = window.JDJ_TAX, A = window.JDJ_ADJ;
  const $ = id => document.getElementById(id);
  const MAN = 10000;
  const TODAY = T.todayStr();
  const num = el => parseInt(String(el.value).replace(/[^0-9]/g, ''), 10) || 0;
  const fmtIn = el => { const raw = el.value.replace(/[^0-9]/g, '').slice(0, 7); el.value = raw ? Number(raw).toLocaleString('ko-KR') : ''; };
  function krw(w) {           // 원 → "1억 2,345만 원"
    w = Math.round(w / MAN); if (w === 0) return '0원';
    const neg = w < 0; w = Math.abs(w);
    const e = Math.floor(w / 10000), m = w % 10000;
    return (neg ? '−' : '') + (e ? e.toLocaleString('ko-KR') + '억' + (m ? ' ' : '') : '') + (m ? m.toLocaleString('ko-KR') + '만' : '') + ' 원';
  }
  const pct = r => (Math.round(r * 10000) / 100) + '%';
  const dKo = d => { const [y, m, dd] = d.split('-'); return y + '. ' + +m + '. ' + +dd + '.'; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let statSent = false;
  const stat = () => { if (!statSent && window.jdjStat) { statSent = true; jdjStat('feature_use', { feature: 'tax' }); } };

  /* ---------- 지역 선택 ---------- */
  function regionPicker(sidoEl, guEl, def) {
    sidoEl.innerHTML = A.SIDO.map(s => '<option>' + s + '</option>').join('');
    const fill = () => {
      const list = A.guList(sidoEl.value);
      guEl.innerHTML = list.length ? list.map(g => '<option>' + g + '</option>').join('') : '<option value="">전체</option>';
      guEl.disabled = !list.length;
    };
    sidoEl.addEventListener('change', fill);
    if (def) sidoEl.value = def.sido;
    fill();
    if (def && def.gu) guEl.value = def.gu;
    return { get: () => ({ sido: sidoEl.value, gu: guEl.value }), onChange: f => { sidoEl.addEventListener('change', f); guEl.addEventListener('change', f); } };
  }
  const adjFn = rg => d => A.isAdjusted(rg.sido, rg.gu, d);

  /* ---------- 화면 전환 ---------- */
  const VIEWS = { home: 'vHome', cgt: 'vCgt', order: 'vOrder', acq: 'vAcq', prop: 'vProp', cpt: 'vCpt', gift: 'vGift' };
  function show(v, push) {
    Object.entries(VIEWS).forEach(([k, id]) => { $(id).hidden = k !== v; });
    if (push !== false) history.pushState(null, '', v === 'home' ? location.pathname : '#' + v);
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { e.preventDefault(); show(b.dataset.go); } });
  window.addEventListener('popstate', () => show((location.hash || '#home').slice(1) in VIEWS ? (location.hash || '#home').slice(1) : 'home', false));

  /* ---------- 1. 양도세 한 질문씩 ---------- */
  const S = { houses: null, acqAdjAns: null };
  const rSel = regionPicker($('rSido'), $('rGu'), { sido: '서울', gu: '마포구' });
  const nSel = regionPicker($('nSido'), $('nGu'), { sido: '서울', gu: '마포구' });
  $('saleDate').value = TODAY;
  ['acqPrice', 'salePrice', 'expenses'].forEach(id => $(id).addEventListener('input', () => { fmtIn($(id)); const c = $(id + 'C'); if (c) c.textContent = num($(id)) ? krw(num($(id)) * MAN) : ''; }));
  $('residM').addEventListener('input', () => { $('residM').value = $('residM').value.replace(/[^0-9]/g, '').slice(0, 3); });
  function optGroup(el, key) {
    el.addEventListener('click', e => { const b = e.target.closest('.opt'); if (!b) return; el.querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === b)); S[key] = b.dataset.v; $('wErr').textContent = ''; setTimeout(next, 120); });
  }
  optGroup($('oHouses'), 'houses');
  optGroup($('oAcqAdj'), 'acqAdjAns');
  $('qResid').addEventListener('click', e => { const b = e.target.closest('button'); if (b) $('residM').value = b.dataset.v; });
  $('qExp').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.v === 'est') {
      const p = num($('acqPrice')) * MAN;
      if (!p) { $('wErr').textContent = '취득가를 먼저 넣어 주세요.'; return; }
      const est = T.acqTax({ price: p, houses: 1 }).total + Math.round(p * 0.004);   // 1주택 취득세 + 중개보수 0.4% 가정
      $('expenses').value = Math.round(est / MAN).toLocaleString('ko-KR');
    } else $('expenses').value = '0';
  });

  const acqAdjAuto = () => A.isAdjusted(rSel.get().sido, rSel.get().gu, $('acqDate').value);
  function flow() {
    const f = ['houses', 'region', 'acq'];
    if ($('acqDate').value && acqAdjAuto() === 'ask') f.push('acqAdj');
    f.push('sale', 'exp', 'resid');
    if (S.houses === 't') f.push('newHouse');
    return f;
  }
  let cur = 0;
  function render() {
    const f = flow(); cur = Math.min(cur, f.length - 1);
    document.querySelectorAll('#wiz .wq').forEach(q => { q.hidden = q.dataset.q !== f[cur]; });
    $('wStep').textContent = '질문 ' + (cur + 1) + ' / ' + f.length;
    $('wBar').style.width = Math.round((cur + 1) / f.length * 100) + '%';
    $('wPrev').style.visibility = cur ? 'visible' : 'hidden';
    $('wNext').textContent = cur === f.length - 1 ? '세금 계산하기' : '다음';
    $('wErr').textContent = '';
  }
  function validate(q) {
    if (q === 'houses' && !S.houses) return '주택 수를 골라 주세요.';
    if (q === 'acq') {
      if (!$('acqDate').value) return '취득일을 넣어 주세요.';
      if ($('acqDate').value > TODAY) return '취득일은 오늘 이전이어야 해요.';
      if (!num($('acqPrice'))) return '취득가를 넣어 주세요.';
    }
    if (q === 'acqAdj' && !S.acqAdjAns) return '하나를 골라 주세요.';
    if (q === 'sale') {
      if (!num($('salePrice'))) return '예상 매도가를 넣어 주세요.';
      if (!$('saleDate').value) return '매도 예정일을 넣어 주세요.';
      if ($('saleDate').value < '2023-01-12') return '이 계산기는 2023년 1월 12일 이후 양도분 기준이에요.';
      if ($('saleDate').value < $('acqDate').value) return '매도일은 취득일보다 뒤여야 해요.';
    }
    if (q === 'resid' && num($('residM')) > T.fullMonths($('acqDate').value, TODAY) + 1) return '거주 기간이 보유 기간보다 길어요. 다시 확인해 주세요.';
    if (q === 'newHouse') {
      if (!$('newAcq').value) return '새 집 취득일을 넣어 주세요.';
      if ($('newAcq').value <= $('acqDate').value) return '새 집 취득일은 기존 집 취득일보다 뒤여야 해요.';
    }
    return '';
  }
  function next() {
    const f = flow(), err = validate(f[cur]);
    if (err) { $('wErr').textContent = err; return; }
    if (cur < f.length - 1) { cur++; render(); const inp = document.querySelector('#wiz .wq:not([hidden]) input'); if (inp && inp.type !== 'checkbox' && window.innerWidth > 600) inp.focus(); }
    else runCgt(true);
  }
  $('wiz').addEventListener('submit', e => { e.preventDefault(); next(); });
  $('wPrev').addEventListener('click', () => { if (cur) { cur--; render(); } });
  $('cgtEdit').addEventListener('click', () => { $('wiz').hidden = false; $('cgtOut').hidden = true; cur = 0; render(); window.scrollTo(0, 0); });
  render();

  let growth = 0;
  function houseModel() {
    const rg = rSel.get(), acqDate = $('acqDate').value;
    let acqAdj = A.isAdjusted(rg.sido, rg.gu, acqDate);
    if (acqAdj === 'ask') acqAdj = S.acqAdjAns === 'y';
    const houses = S.houses === 't' ? 2 : +S.houses;
    let tempTwo = null;
    if (S.houses === 't') {
      const nd = $('newAcq').value, ng = nSel.get();
      tempTwo = { newAcqDate: nd, newAdj: A.isAdjusted(ng.sido, ng.gu, nd) === true, oldAdjAtNewAcq: A.isAdjusted(rg.sido, rg.gu, nd) === true };
    }
    return { acqDate, acqPrice: num($('acqPrice')) * MAN, price: num($('salePrice')) * MAN, expenses: num($('expenses')) * MAN,
      houses, acqAdj, adjAt: adjFn(rg), tempTwo, living: $('living').checked, residMonths: num($('residM')), region: rg };
  }
  function runCgt(scroll) {
    const h = houseModel(), saleDate = $('saleDate').value;
    const residAtSale = h.residMonths + (h.living && saleDate > TODAY ? T.fullMonths(TODAY, saleDate) : 0);
    const r = T.calcCGT({ acqDate: h.acqDate, acqPrice: h.acqPrice, saleDate, salePrice: h.price, expenses: h.expenses, residMonths: residAtSale,
      houses: h.houses, acqAdj: h.acqAdj, saleAdj: h.adjAt(saleDate) === true, tempTwo: h.tempTwo });
    const pill = r.exempt === 'full' ? '<span class="pill ok">비과세</span>' : r.exempt === 'partial' ? '<span class="pill mid">비과세 · 12억 초과분만 과세</span>'
      : r.heavy ? '<span class="pill no">다주택 중과 +' + r.heavy * 100 + '%p</span>' : '<span class="pill mid">과세</span>';
    const rows = [
      ['양도가액', krw(h.price)], ['취득가액', '−' + krw(h.acqPrice)], ['필요경비', '−' + krw(h.expenses)], ['양도차익', krw(r.gain)]
    ];
    if (r.exempt === 'partial') rows.push(['12억 초과분 과세 양도차익', krw(r.taxableGain)]);
    if (r.exempt !== 'full' && r.gain > 0) {
      rows.push(['장기보유특별공제 ' + pct(r.ltdRate), '−' + krw(r.ltd)], ['양도소득금액', krw(r.income)], ['기본공제', '−' + krw(Math.min(2500000, r.income))],
        ['과세표준', krw(r.base)], ['세율', r.rateText], ['양도소득세', krw(r.tax)], ['지방소득세 (10%)', krw(r.local)]);
    }
    rows.push(['합계', krw(r.total)]);
    $('cgtRes').innerHTML =
      '<div class="lbl">' + dKo(saleDate) + '에 ' + krw(h.price) + '에 팔면 예상 세금 (지방소득세 포함)</div>' +
      '<div class="big">' + krw(r.total) + '</div>' + pill +
      '<div class="stats"><div class="stat"><div class="k">양도차익</div><div class="v">' + krw(r.gain) + '</div></div>' +
      '<div class="stat"><div class="k">보유 · 거주</div><div class="v">' + r.holdY + '년 · ' + Math.floor(r.residM / 12) + '년 ' + (r.residM % 12) + '개월</div></div>' +
      '<div class="stat"><div class="k">장기보유특별공제</div><div class="v">' + pct(r.ltdRate) + '</div></div>' +
      '<div class="stat"><div class="k">조정대상지역 (취득 · 양도)</div><div class="v">' + (h.acqAdj ? '예' : '아니요') + ' · ' + (h.adjAt(saleDate) === true ? '예' : '아니요') + '</div></div></div>' +
      '<details class="how"><summary>계산 근거 펼쳐 보기</summary><table class="calc">' +
      rows.map((x, i) => '<tr' + (i === rows.length - 1 ? ' class="tot"' : '') + '><td>' + x[0] + '</td><td>' + x[1] + '</td></tr>').join('') +
      '</table><ul>' + r.reasons.concat(r.notes).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
      '<p class="law">세율: 소득세법 제55조(6~45%, 누진공제), 제104조(주택 1년 미만 70%, 2년 미만 60%, 조정대상지역 2주택 +20%p·3주택 +30%p — 한시 배제는 2026.5.9 종료). 비과세: 제89조, 시행령 제154조(2년 보유, 취득 당시 조정대상지역이면 2년 거주, 보유기간은 취득일부터 기산), 제155조(일시적 2주택). 장기보유특별공제: 제95조 표1·표2. 지방소득세: 지방세법 제103조의3.</p></details>';
    $('wiz').hidden = true; $('cgtOut').hidden = false;
    $('tlPanel').hidden = false;
    drawTimeline(h);
    stat();
    if (scroll) window.scrollTo(0, 0);
  }

  /* ---------- 타임라인 그래프 ---------- */
  let TL = null, TLH = null;
  $('gChips').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; growth = +b.dataset.g; $('gChips').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); drawTimeline(TLH); });
  function drawTimeline(h) {
    TLH = h;
    TL = T.timeline(Object.assign({}, h), { today: TODAY, months: 60, growth });
    const svg = $('tlChart'), W = 340, H = 190, L = 46, R = 10, Tp = 12, B = 30;
    const pts = TL.points, maxV = Math.max(10000, ...pts.map(p => p.total)) * 1.08;
    const x = m => L + (W - L - R) * m / 60, y = v => Tp + (H - Tp - B) * (1 - v / maxV);
    let g = '';
    // 눈금 (가로선 3개)
    [0, 0.5, 1].forEach(t => { const v = maxV / 1.08 * t, yy = y(v); g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '" stroke="#E5E8EB" stroke-width="1"/>' +
      '<text x="' + (L - 6) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="10" fill="#6B7684">' + axisMan(v) + '</text>'; });
    for (let yr = 0; yr <= 5; yr++) { const m = yr * 12, d = T.addMonths(TODAY, m); g += '<text x="' + x(m) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="10" fill="#6B7684">' + (yr === 0 ? '오늘' : d.slice(2, 4) + '.' + d.slice(5, 7)) + '</text>'; }
    // 선 (계단형: 세금은 날짜가 지나는 순간 바뀜)
    let dPath = '';
    pts.forEach((p, i) => { dPath += (i ? 'H' + x(p.m).toFixed(1) + 'V' : 'M' + x(p.m).toFixed(1) + ' ') + y(p.total).toFixed(1); });
    g += '<path d="' + dPath + '" fill="none" stroke="#2F6BFF" stroke-width="2" stroke-linejoin="round"/>';
    // 세금이 바뀌는 날 표시
    TL.events.forEach(ev => { const m = T.fullMonths(TODAY, ev.date) + 0.5; g += '<circle cx="' + x(Math.min(60, m)).toFixed(1) + '" cy="' + y(ev.after).toFixed(1) + '" r="4" fill="#fff" stroke="' + (ev.good ? '#0E7A4F' : '#C2410C') + '" stroke-width="2"/>'; });
    g += '<line id="tlCross" x1="0" x2="0" y1="' + Tp + '" y2="' + (H - B) + '" stroke="#191F28" stroke-width="1" stroke-dasharray="3 3"/><circle id="tlDot" r="5" fill="#2F6BFF" stroke="#fff" stroke-width="2"/>';
    svg.innerHTML = g;
    svg._x = x; svg._y = y; svg._L = L; svg._W = W - L - R;
    // 가장 유리한 시점
    const b = TL.best, now = TL.now;
    $('tlBest').innerHTML = b.total < now.total
      ? '<b>' + dKo(b.date) + '</b> 이후에 팔면 오늘보다 <b>' + krw(now.total - b.total) + '</b> 적게 계산됩니다(예상 ' + krw(b.total) + '). 그 사이 시세 변화와 보유 비용은 따로 따져 보세요.'
      : '앞으로 5년 안에서는 <b>오늘 파는 경우의 세금이 가장 적습니다</b>' + (TL.events.some(e => !e.good) ? '. 아래 표의 기한을 넘기면 세금이 늘어납니다.' : '.');
    $('tlEv').innerHTML = TL.events.length ? TL.events.map(ev => '<li><b>' + dKo(ev.date) + '</b><div>' + esc(ev.label) + '<small>' + krw(ev.before) + ' → <span class="' + (ev.good ? 'g' : 'w') + '">' + krw(ev.after) + '</span></small></div></li>').join('')
      : '<li><b>변동 없음</b><div>앞으로 5년 안에 비과세 요건이나 공제율이 바뀌는 날이 없습니다.<small>시세 변화 가정을 바꿔 보세요.</small></div></li>';
    pick(+$('tlSlider').value);
  }
  function axisMan(v) { const m = Math.round(v / MAN); return m >= 10000 ? (Math.round(m / 1000) / 10) + '억' : m.toLocaleString('ko-KR') + '만'; }
  function pick(m) {
    if (!TL) return;
    const p = TL.points[m], svg = $('tlChart');
    const cx = svg._x(m), cy = svg._y(p.total);
    const cr = $('tlCross'), dt = $('tlDot');
    cr.setAttribute('x1', cx); cr.setAttribute('x2', cx); dt.setAttribute('cx', cx); dt.setAttribute('cy', cy);
    $('pkD').textContent = (m ? m + '개월 뒤 ' : '오늘 ') + dKo(p.date) + ' 매도';
    $('pkT').textContent = krw(p.total);
    const diff = p.total - TL.now.total;
    $('pkC').textContent = m === 0 ? (p.r.exempt === 'full' ? '비과세' : '') : diff === 0 ? '오늘과 같음' : (diff < 0 ? '오늘보다 ' + krw(-diff) + ' 적음' : '오늘보다 ' + krw(diff) + ' 많음');
    $('pkC').className = 'c ' + (diff < 0 ? 'down' : diff > 0 ? 'up' : '');
  }
  $('tlSlider').addEventListener('input', e => pick(+e.target.value));
  $('tlChart').addEventListener('pointermove', e => {
    const svg = $('tlChart'), rect = svg.getBoundingClientRect();
    const vx = (e.clientX - rect.left) / rect.width * 340;
    const m = Math.max(0, Math.min(60, Math.round((vx - svg._L) / svg._W * 60)));
    $('tlSlider').value = m; pick(m);
  });

  /* ---------- 2. 매도 순서 ---------- */
  const HL = [];
  const NAMES = ['집 A', '집 B', '집 C', '집 D', '집 E'], MAXH = 5;
  function addHouse(def) {
    if (HL.length >= MAXH) return;
    const i = HL.length, el = document.createElement('div');
    el.className = 'house';
    el.innerHTML = '<h3><span>' + NAMES[i] + '</span>' + '<button type="button" class="rm"' + (i >= 2 ? '' : ' hidden') + '>빼기</button>' + '</h3>' +
      '<div class="selrow"><select class="sido" aria-label="' + NAMES[i] + ' 시·도"></select><select class="gu" aria-label="' + NAMES[i] + ' 시·군·구"></select></div>' +
      '<div class="f2"><div class="fl"><label>취득일</label><div class="box"><input type="date" class="acqDate"></div></div>' +
      '<div class="fl"><label>취득가</label><div class="box"><input class="acqPrice money" inputmode="numeric" placeholder="50,000"><span>만</span></div></div></div>' +
      '<div class="f2"><div class="fl"><label>지금 시세</label><div class="box"><input class="price money" inputmode="numeric" placeholder="80,000"><span>만</span></div></div>' +
      '<div class="fl"><label>필요경비</label><div class="box"><input class="exp money" inputmode="numeric" placeholder="0"><span>만</span></div></div></div>' +
      '<div class="f2"><div class="fl"><label>거주한 기간</label><div class="box"><input class="resid" inputmode="numeric" placeholder="0"><span>개월</span></div></div>' +
      '<div class="fl"><label>&nbsp;</label><label class="tog" style="min-height:48px;padding:8px 10px;font-size:13.5px"><input type="checkbox" class="living"> 지금 거주 중</label></div></div>' +
      '<div class="fl askw" hidden><label>사실 때 조정대상지역이었나요? (자동 판정이 어려운 지역·기간)</label><select class="s ask"><option value="y">네 (모르면 이쪽이 보수적)</option><option value="n">아니요</option></select></div>';
    $('hList').appendChild(el);
    const rp = regionPicker(el.querySelector('.sido'), el.querySelector('.gu'), def ? def.rg : { sido: '서울', gu: '강남구' });
    el.querySelectorAll('.money').forEach(m => m.addEventListener('input', () => fmtIn(m)));
    const upd = () => { const d = el.querySelector('.acqDate').value, g = rp.get(); el.querySelector('.askw').hidden = !(d && A.isAdjusted(g.sido, g.gu, d) === 'ask'); };
    rp.onChange(upd); el.querySelector('.acqDate').addEventListener('change', upd);
    if (def) {
      el.querySelector('.acqDate').value = def.acq;
      el.querySelector('.acqPrice').value = def.ap.toLocaleString('ko-KR'); el.querySelector('.price').value = def.p.toLocaleString('ko-KR');
      el.querySelector('.resid').value = def.r || ''; el.querySelector('.living').checked = !!def.l; upd();
    }
    const item = { el, rp };
    el.querySelector('.rm').addEventListener('click', () => { el.remove(); HL.splice(HL.indexOf(item), 1); renameHouses(); });
    HL.push(item);
    renameHouses();
  }
  function renameHouses() {   // 빼고 나면 A, B, C… 다시 매기기
    HL.forEach((h, i) => { h.el.querySelector('h3 span').textContent = NAMES[i]; h.el.querySelector('.rm').hidden = HL.length <= 2; });
    $('hAdd').hidden = HL.length >= MAXH;
    $('hAdd').textContent = '집 한 채 더 넣기 (' + HL.length + ' / ' + MAXH + '채)';
  }
  addHouse(); addHouse();
  $('hAdd').addEventListener('click', () => addHouse());
  $('oStart').value = T.addMonths(TODAY, 1);
  let interval = 12;
  $('oInt').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; interval = +b.dataset.v; $('oInt').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  function runOrder() {
    $('oErr').textContent = '';
    const start = $('oStart').value;
    if (!start || start < TODAY) { $('oErr').textContent = '첫 매도 예정일은 오늘 이후로 넣어 주세요.'; return; }
    const houses = [];
    for (let i = 0; i < HL.length; i++) {
      const el = HL[i].el, q = c => el.querySelector(c), rg = HL[i].rp.get();
      const acqDate = q('.acqDate').value;
      if (!acqDate || !num(q('.acqPrice')) || !num(q('.price'))) { $('oErr').textContent = NAMES[i] + '의 취득일·취득가·지금 시세를 넣어 주세요.'; return; }
      if (acqDate > TODAY) { $('oErr').textContent = NAMES[i] + '의 취득일이 오늘보다 뒤예요.'; return; }
      let acqAdj = A.isAdjusted(rg.sido, rg.gu, acqDate);
      if (acqAdj === 'ask') acqAdj = q('.ask').value === 'y';
      houses.push({ name: NAMES[i], acqDate, acqPrice: num(q('.acqPrice')) * MAN, price: num(q('.price')) * MAN, expenses: num(q('.exp')) * MAN,
        residMonths: num(q('.resid')), living: q('.living').checked, acqAdj, adjAt: adjFn(rg) });
    }
    if (houses.length < 2) { $('oErr').textContent = '두 채 이상 넣어 주세요.'; return; }
    const C = T.compareOrders(houses, { today: TODAY, start, interval, growth: 0 });
    $('oReason').innerHTML = C.reason.map(x => '<li>' + esc(x) + '</li>').join('');
    const maxT = Math.max(1, C.worst.total);
    const card = (res, k) =>
      '<div class="ord' + (k === 0 ? ' first' : '') + '"><div class="h"><span>' + (k + 1) + '. ' + res.sales.map(s => s.name).join(' → ') + '</span><span>' + krw(res.total) + '</span></div>' +
      '<div class="bar"><i style="width:' + Math.max(1, res.total / maxT * 100).toFixed(1) + '%"></i></div>' +
      '<details><summary>집별 세금 보기</summary><table>' + res.sales.map(s => {
        const b = s.r.exempt === 'full' ? '<span class="badge2 ok">비과세</span>' : s.r.exempt === 'partial' ? '<span class="badge2 mid">12억 초과분 과세</span>' : s.r.heavy ? '<span class="badge2 no">중과 +' + s.r.heavy * 100 + '%p</span>' : '';
        return '<tr><td>' + dKo(s.date) + ' ' + s.name + b + '<br><small style="color:var(--sub2)">' + s.remain + '채 보유 중 매도 · 차익 ' + krw(s.r.gain) + ' · 장특공 ' + pct(s.r.ltdRate) + '</small></td><td>' + krw(s.tax + Math.floor(s.tax * 0.1)) + '</td></tr>';
      }).join('') + (res.compared ? '<tr><td colspan="2"><small style="color:var(--sub2)">같은 해 합산 비교과세로 연도 합계가 집별 합보다 큽니다.</small></td></tr>' : '') + '</table></details></div>';
    const TOP = 3, n = C.results.length;
    $('oList').innerHTML = '<div class="help">가능한 순서 ' + n + '가지 중 세금이 적은 ' + Math.min(TOP, n) + '가지</div>' + C.results.slice(0, TOP).map(card).join('');
    $('oAllW').hidden = n <= TOP; $('oAllW').open = false;
    $('oAllS').textContent = '나머지 ' + (n - TOP) + '가지 순서 전체 보기';
    $('oAll').innerHTML = '';
    $('oAllW').ontoggle = () => { if ($('oAllW').open && !$('oAll').innerHTML) $('oAll').innerHTML = C.results.slice(TOP).map((r, k) => card(r, k + TOP)).join(''); };
    $('oOut').hidden = false;
    stat();
    $('oOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('oRun').addEventListener('click', runOrder);

  /* ---------- 3. 취득세 ---------- */
  const aSel = regionPicker($('aSido'), $('aGu'), { sido: '서울', gu: '마포구' });
  let aN = 1;
  const aAdj = () => A.isAdjusted(aSel.get().sido, aSel.get().gu, TODAY) === true;
  const aUpd = () => { $('aAdjTxt').textContent = '오늘 기준 ' + (aAdj() ? '조정대상지역입니다.' : '조정대상지역이 아닙니다.'); $('aTempW').hidden = !(aN === 2 && aAdj()); };
  aSel.onChange(aUpd); aUpd();
  $('aPrice').addEventListener('input', () => { fmtIn($('aPrice')); $('aPriceC').textContent = num($('aPrice')) ? krw(num($('aPrice')) * MAN) : ''; });
  $('aN').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; aN = +b.dataset.v; $('aN').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); aUpd(); });
  $('aRun').addEventListener('click', () => {
    const p = num($('aPrice')) * MAN;
    if (!p) { $('aErr').textContent = '매수 가격을 넣어 주세요.'; return; }
    $('aErr').textContent = '';
    const r = T.acqTax({ price: p, houses: aN, adj: aAdj(), temp: $('aTemp').checked && !$('aTempW').hidden, over85: $('aOver').checked });
    $('aRes').innerHTML = '<div class="lbl">' + krw(p) + ' 주택 취득 시 예상 세금</div><div class="big">' + krw(r.total) + '</div>' +
      '<span class="pill ' + (r.heavy ? 'no' : 'mid') + '">취득세율 ' + pct(r.rate) + '</span>' +
      '<details class="how" open><summary>계산 근거</summary><table class="calc">' +
      '<tr><td>취득세 ' + pct(r.rate) + '</td><td>' + krw(r.acq) + '</td></tr><tr><td>지방교육세 ' + pct(r.eduRate) + '</td><td>' + krw(r.edu) + '</td></tr>' +
      '<tr><td>농어촌특별세 ' + pct(r.farmRate) + '</td><td>' + krw(r.farm) + '</td></tr><tr class="tot"><td>합계</td><td>' + krw(r.total) + '</td></tr></table>' +
      '<ul><li>' + esc(r.why) + '</li><li>주택 수는 이번에 사는 집을 포함한 세대 기준입니다.</li></ul>' +
      '<p class="law">지방세법 제11조 제1항 제8호(6억~9억: (취득가액×2/3억 − 3)%), 제13조의2(다주택 중과), 제151조(지방교육세), 농어촌특별세법(85㎡ 초과).</p></details>';
    $('aRes').hidden = false;
    stat();
  });

  /* ---------- 공통: 한 화면 한 질문 (재산세·종부세·증여세) ---------- */
  function wizard(form, o) {
    const st = {}, q = sel => form.querySelector(sel), out = $(o.out);
    let cur = 0;
    form.querySelectorAll('.opts[data-key]').forEach(g => g.addEventListener('click', e => {
      const b = e.target.closest('.opt'); if (!b) return;
      g.querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === b));
      st[g.dataset.key] = b.dataset.v; q('.werr').textContent = '';
      setTimeout(next, 120);
    }));
    function render() {
      const f = o.flow(st); cur = Math.min(cur, f.length - 1);
      form.querySelectorAll('.wq').forEach(x => { x.hidden = x.dataset.q !== f[cur]; });
      q('.wstep').textContent = '질문 ' + (cur + 1) + ' / ' + f.length;
      q('.wbar').style.width = Math.round((cur + 1) / f.length * 100) + '%';
      q('.wprev').style.visibility = cur ? 'visible' : 'hidden';
      q('.wnext').textContent = cur === f.length - 1 ? o.last : '다음';
      q('.werr').textContent = '';
      if (o.onShow) o.onShow(f[cur], st);
    }
    function next() {
      const f = o.flow(st), err = o.validate(f[cur], st);
      if (err) { q('.werr').textContent = err; return; }
      if (cur < f.length - 1) { cur++; render(); return; }
      form.hidden = true; out.hidden = false; o.done(st); stat(); window.scrollTo(0, 0);
    }
    form.addEventListener('submit', e => { e.preventDefault(); next(); });
    q('.wprev').addEventListener('click', () => { if (cur) { cur--; render(); } });
    render();
    return { st, render, reset: () => { form.hidden = false; out.hidden = true; cur = 0; render(); window.scrollTo(0, 0); } };
  }
  const WZ = {};
  document.addEventListener('click', e => { const b = e.target.closest('.redo[data-wiz]'); if (b && WZ[b.dataset.wiz]) WZ[b.dataset.wiz].reset(); });
  function bindMoney(root) {
    root.querySelectorAll('input.money').forEach(m => {
      if (m._b) return; m._b = 1;
      m.addEventListener('input', () => { fmtIn(m); const c = m.id && $(m.id + 'C'); if (c) c.textContent = num(m) ? krw(num(m) * MAN) : ''; });
    });
  }
  ['vProp', 'vCpt', 'vGift'].forEach(id => bindMoney($(id)));
  ['cAge', 'cYears'].forEach(id => $(id).addEventListener('input', () => { $(id).value = $(id).value.replace(/[^0-9]/g, '').slice(0, 3); }));
  const table = rows => '<table class="calc">' + rows.map(x => '<tr' + (x[2] ? ' class="tot"' : '') + '><td>' + x[0] + '</td><td>' + x[1] + '</td></tr>').join('') + '</table>';
  const ul = list => '<ul>' + list.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  const won1 = w => w.toLocaleString('ko-KR') + '원';   // 원 단위 그대로 (소액 세금용)
  const ratePct = r => (Math.round(r * 100000) / 1000) + '%';

  /* ---------- 4. 재산세 ---------- */
  WZ.pWiz = wizard($('pWiz'), {
    out: 'pOut', last: '재산세 계산하기',
    flow: () => ['price', 'one', 'prev'],
    validate(q, st) {
      if (q === 'price' && !num($('pPrice'))) return '공시가격을 넣어 주세요.';
      if (q === 'one' && !st.one) return '하나를 골라 주세요.';
      return '';
    },
    done(st) {
      const price = num($('pPrice')) * MAN, one = st.one === 'y';
      const r = T.propertyTax({ price, one, prevPrice: num($('pPrev')) * MAN, prevTax: num($('pPrevTax')) * MAN });
      const why = [
        (one ? '1세대1주택이라 공정시장가액비율 ' + pct(r.ratio) + '(공시 3억 이하 43%, 6억 이하 44%, 6억 초과 45%)를 적용했습니다.' : '1세대1주택이 아니라 공정시장가액비율 60%를 적용했습니다.'),
        r.special ? '공시가격 9억 원 이하 1세대1주택이라 표준세율보다 0.05%p 낮은 특례세율(0.05~0.35%)을 적용했습니다.' : one ? '공시가격이 9억 원을 넘어 1주택 특례세율은 받지 못하고 표준세율(0.1~0.4%)을 적용했습니다.' : '표준세율(0.1~0.4%)을 적용했습니다.'
      ].concat(r.notes);
      if (!(num($('pPrev')) > 0)) why.push('작년 공시가격을 넣지 않아 과세표준상한제(작년 대비 약 5% 한도)는 따지지 않았습니다. 공시가격이 많이 올랐다면 실제 세금은 더 적을 수 있습니다.');
      why.push(r.lump ? '재산세(도시지역분 포함)가 20만 원 이하라 대부분 지자체 조례에 따라 7월에 한꺼번에 냅니다.' : '주택 재산세는 절반씩 7월(7.16~7.31)과 9월(9.16~9.30)에 나눠 냅니다.');
      $('pRes').innerHTML = '<div class="lbl">공시가격 ' + krw(price) + ' 주택의 2026년 재산세 (도시지역분·지방교육세 포함)</div>' +
        '<div class="big">' + krw(r.total) + '</div>' +
        '<span class="pill ' + (one ? 'ok' : 'mid') + '">' + (r.special ? '1세대1주택 특례세율' : one ? '1세대1주택 비율 ' + pct(r.ratio) : '표준세율 · 비율 60%') + '</span>' +
        '<div class="pay2"><div class="stat"><div class="k">7월 (7.16~7.31)</div><div class="v">' + won1(r.july) + '</div></div><div class="stat"><div class="k">9월 (9.16~9.30)</div><div class="v">' + won1(r.sept) + '</div></div></div>' +
        '<details class="how"><summary>계산 근거 펼쳐 보기</summary>' + table([
          ['공시가격', krw(price)], ['공정시장가액비율', pct(r.ratio)], ['과세표준' + (r.base < r.base0 ? ' (상한 적용)' : ''), won1(r.base)],
          ['세율', r.rate + ' · 이 구간 ' + ratePct(r.marginal)], ['재산세', won1(r.tax)], ['도시지역분 (과세표준 × 0.14%)', won1(r.urban)], ['지방교육세 (재산세 × 20%)', won1(r.edu)], ['합계', won1(r.total), 1]
        ]) + ul(why) +
        '<p class="law">지방세법 제110조(과세표준·과세표준상한), 시행령 제109조(공정시장가액비율 — 2026년분 1주택 43·44·45%는 2025년과 같게 유지), 제109조의2(상한율 5%), 제111조(표준세율), 제111조의2(1세대1주택 특례세율, 현행 2026년분까지), 제112조(도시지역분), 제115조(납기), 제122조(세부담상한 105·110·130%), 제151조(지방교육세). 지역자원시설세(소방분)는 건물 시가표준액이 따로 필요해 빠져 있습니다. 10원 미만은 버렸습니다.</p></details>';
    }
  });

  /* ---------- 5. 종합부동산세 ---------- */
  function cRow(v) {
    const list = $('cList');
    if (list.children.length >= 10) return;
    const d = document.createElement('div');
    d.className = 'box';
    d.innerHTML = '<b></b><input class="money" inputmode="numeric" autocomplete="off" placeholder="공시가격" aria-label="주택 공시가격(만 원)"><span>만 원</span><button type="button">빼기</button>';
    list.appendChild(d);
    if (v) d.querySelector('input').value = v.toLocaleString('ko-KR');
    bindMoney(d);
    d.querySelector('input').addEventListener('input', cSum);
    d.querySelector('button').addEventListener('click', () => { d.remove(); cSum(); });
    cSum();
  }
  const cPrices = () => [...$('cList').querySelectorAll('input')].map(i => num(i) * MAN).filter(x => x > 0);
  function cSum() {
    const rows = [...$('cList').children];
    rows.forEach((r, i) => { r.querySelector('b').textContent = (i + 1) + '번'; r.querySelector('button').hidden = rows.length <= 1; });
    $('cAdd').hidden = rows.length >= 10;
    const p = cPrices();
    $('cSum').innerHTML = p.length ? '합계 <b>' + krw(p.reduce((s, x) => s + x, 0)) + '</b> · ' + p.length + '채' + (p.length >= 3 ? ' (3주택 이상 세율)' : '') : '';
  }
  cRow(); $('cAdd').addEventListener('click', () => cRow());
  WZ.cWiz = wizard($('cWiz'), {
    out: 'cOut', last: '종부세 계산하기',
    flow(st) {
      const f = ['owner', 'list'];
      if (st.owner !== 'c' && cPrices().length === 1) f.push('one');
      if (st.owner !== 'c' && cPrices().length === 1 && st.cOne === 'y') f.push('age');
      if (st.owner !== 'c') f.push('prev');
      return f;
    },
    validate(q, st) {
      if (q === 'owner' && !st.owner) return '하나를 골라 주세요.';
      if (q === 'list' && !cPrices().length) return '공시가격을 한 채 이상 넣어 주세요.';
      if (q === 'one' && !st.cOne) return '하나를 골라 주세요.';
      if (q === 'age' && (!$('cAge').value || !$('cYears').value)) return '나이와 보유 기간을 넣어 주세요.';
      return '';
    },
    done(st) {
      const corp = st.owner === 'c', prices = cPrices(), n = prices.length;
      const one = !corp && n === 1 && st.cOne === 'y';
      const r = T.compTax({ prices, corp, one, age: num($('cAge')), years: num($('cYears')), prevTotal: corp ? 0 : num($('cPrev')) * MAN });
      const why = [];
      why.push(corp ? '법인은 기본공제가 없고 ' + (r.heavy ? '3주택 이상 5.0%' : '2주택 이하 2.7%') + ' 단일세율입니다.' : one ? '1세대1주택자라 공시가격에서 12억 원을 빼고 계산합니다.' : '1세대1주택자가 아니라 공시가격 합계에서 9억 원을 빼고 계산합니다' + (r.heavy ? '. 3주택 이상이라 12억 원 초과 과세표준 구간에 2.0~5.0% 세율이 붙습니다.' : '.'));
      if (r.base > 0) why.push('재산세와 겹치는 부분 ' + krw(r.propDed) + '은 종부세에서 뺍니다(올해 재산세 ' + krw(r.propSum) + ' 기준 추정).');
      if (one) why.push('세액공제: 나이 ' + Math.round(r.ageRate * 100) + '% + 보유 ' + Math.round(r.holdRate * 100) + '% = ' + Math.round(r.creditRate * 100) + '%' + (r.ageRate + r.holdRate > 0.8 ? ' (합계 80% 한도)' : '') + '.');
      why.push.apply(why, r.notes);
      if (!corp && !(num($('cPrev')) > 0)) why.push('작년 재산세+종부세를 넣지 않아 세부담상한(150%)은 따지지 않았습니다.');
      if (r.total > 0) why.push('납부: 12월 1일~15일. 종부세가 250만 원을 넘으면 일부를 6개월 안에 나눠 낼 수 있습니다.');
      $('cRes').innerHTML = (r.base > 0
        ? '<div class="lbl">' + (corp ? '법인' : one ? '1세대1주택' : n + '주택') + ' · 공시가격 합계 ' + krw(r.sum) + '의 2026년 종부세 (농어촌특별세 포함)</div><div class="big">' + krw(r.total) + '</div>' +
          '<span class="pill ' + (r.heavy || corp ? 'no' : 'mid') + '">세율 ' + r.rateText + '</span>'
        : '<div class="lbl">공시가격 합계 ' + krw(r.sum) + '</div><div class="big">종부세 없음</div><span class="pill ok">공제액 ' + krw(r.ded) + ' 이하</span>') +
        '<div class="stats"><div class="stat"><div class="k">과세표준</div><div class="v">' + krw(r.base) + '</div></div>' +
        '<div class="stat"><div class="k">올해 재산세 (추정, 도시지역분·교육세 포함)</div><div class="v">' + krw(r.props.reduce((s, x) => s + x.total, 0)) + '</div></div>' +
        '<div class="stat"><div class="k">세액공제</div><div class="v">' + (one ? Math.round(r.creditRate * 100) + '%' : '해당 없음') + '</div></div>' +
        '<div class="stat"><div class="k">보유세 합계 (재산세+종부세)</div><div class="v">' + krw(r.holdTotal) + '</div></div></div>' +
        '<details class="how"><summary>계산 근거 펼쳐 보기</summary>' + table([
          ['공시가격 합계 (' + n + '채)', krw(r.sum)], ['공제액', '−' + krw(r.ded)], ['공정시장가액비율', '60%'], ['과세표준', won1(r.base)], ['세율', r.rateText],
          ['산출세액', won1(r.calc)], ['재산세 중복분 공제', '−' + won1(r.propDed)], ['세액공제 ' + Math.round(r.creditRate * 100) + '%', '−' + won1(r.credit)],
          ['세부담상한 초과분', '−' + won1(r.capCut)], ['종합부동산세', won1(r.tax)], ['농어촌특별세 (20%)', won1(r.farm)], ['합계', won1(r.total), 1]
        ]) + ul(why) +
        '<p class="law">종합부동산세법 제8조(공제 1세대1주택 12억·그 밖 9억·법인 0, 공정시장가액비율 60% — 시행령 제2조의4), 제9조(세율, 재산세 공제 — 시행령 제4조의3, 고령자 20~40%·장기보유 20~50% 합계 80% 한도), 제10조(세부담상한 150%), 농어촌특별세법 제5조(20%). 임대주택 합산배제, 일시적 2주택·상속주택·지방 저가주택 1주택 특례, 부부 공동명의 1주택 특례 신청은 반영하지 않았습니다. 국회 심의 중인 2026년 세제개편안(1주택 공제 14억, 공정시장가액비율 70~80%, 세율 일원화 등, 2027년분부터)은 통과 전이라 넣지 않았습니다.</p></details>';
    }
  });

  /* ---------- 6. 증여세 ---------- */
  const gSel = regionPicker($('gSido'), $('gGu'), { sido: '서울', gu: '마포구' });
  const gAdj = () => A.isAdjusted(gSel.get().sido, gSel.get().gu, TODAY) === true;
  const gAdjUpd = () => { $('gAdjTxt').textContent = '오늘 기준 ' + (gAdj() ? '조정대상지역입니다. 공시가격 3억 원 이상이면 취득세 12% 중과 대상이 될 수 있어요.' : '조정대상지역이 아니라 취득세 3.5%입니다.'); };
  gSel.onChange(gAdjUpd); gAdjUpd();
  let gRecvN = 1;
  $('gRecv').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; gRecvN = +b.dataset.v; $('gRecv').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  $('gDebtQ').addEventListener('click', e => { if (e.target.closest('button')) { $('gDebt').value = '0'; $('gDonorW').hidden = true; } });
  $('gDebt').addEventListener('input', () => { $('gDonorW').hidden = !num($('gDebt')); });
  const CLOSE = { spouse: 1, child: 1, minor: 1, parent: 1 };
  WZ.gWiz = wizard($('gWiz'), {
    out: 'gOut', last: '증여세 계산하기',
    flow: () => ['rel', 'value', 'debt', 'prior', 'extra', 'acq'],
    onShow(q, st) {
      const down = st.rel === 'child' || st.rel === 'minor';
      $('gSkipW').hidden = !down; $('gMarW').hidden = !down;
      if (!down) { $('gSkip').checked = false; $('gMar').checked = false; }
      $('gOneW').hidden = !CLOSE[st.rel]; if (!CLOSE[st.rel]) $('gOne').checked = false;
      $('gRecvW').hidden = !num($('gDebt'));
    },
    validate(q, st) {
      if (q === 'rel' && !st.rel) return '하나를 골라 주세요.';
      if (q === 'value') { if (!num($('gValue'))) return '증여재산가액을 넣어 주세요.'; if (!num($('gStd'))) return '공시가격을 넣어 주세요. 모르시면 시세의 70% 정도로 넣어 보세요.'; }
      if (q === 'debt' && num($('gDebt')) >= num($('gValue'))) return '넘기는 채무가 집값보다 같거나 많아요. 다시 확인해 주세요.';
      return '';
    },
    done(st) {
      const value = num($('gValue')) * MAN, debt = num($('gDebt')) * MAN, stdPrice = num($('gStd')) * MAN;
      const g = T.giftTax({ value, debt, rel: st.rel, prior: num($('gPrior')) * MAN, priorTax: num($('gPriorTax')) * MAN, marriage: $('gMar').checked, skip: $('gSkip').checked, filed: $('gFiled').checked });
      const a = T.giftAcqTax({ value, stdPrice, debt, adj: gAdj(), donorOne: $('gOne').checked, close: !!CLOSE[st.rel], over85: $('gOver').checked, recvHouses: gRecvN });
      const dg = T.giftDebtGain(value, debt, num($('gDonorAcq')) * MAN);
      const why = ['관계: ' + g.relText + ' — 증여재산공제 ' + krw(g.ded) + (g.prior ? ' (10년 안 이전 증여와 합쳐 한 번만 공제)' : '') + '.'];
      if ($('gMar').checked) why.push('혼인·출산 증여재산공제 1억 원을 더했습니다(평생 한도 1억, 기본 공제와 별도).');
      if (g.prior) why.push('10년 안 이전 증여 ' + krw(g.prior) + '을 합산하고, 그때 낸 증여세 ' + krw(g.priorTax) + '을 뺐습니다.');
      if (g.skipRate) why.push('세대를 건너뛴 증여라 산출세액에 ' + Math.round(g.skipRate * 100) + '%를 더했습니다' + (g.skipRate === 0.4 ? ' (미성년자 20억 원 초과).' : '.'));
      why.push(g.filing ? '기한 안에 신고하면 3% 신고세액공제를 받습니다. 신고기한은 증여일이 속한 달의 말일부터 3개월입니다.' : '기한 안에 신고하지 않으면 신고세액공제가 없고 가산세가 붙습니다.');
      if (g.base === 0) why.push('공제 뒤 과세표준이 없어(또는 50만 원 미만) 증여세가 없습니다. 그래도 신고해 두면 나중에 취득자금 출처 소명에 도움이 됩니다.');
      const total = g.tax + a.total;
      let debtHtml = '';
      if (debt > 0) {
        debtHtml = '<details class="how" open><summary>부담부증여: 채무 ' + krw(debt) + ' 부분은 주는 분의 양도세</summary>' +
          (dg && num($('gDonorAcq')) ? table([['양도가액 (넘긴 채무)', krw(dg.salePrice)], ['취득가액 (취득가 × ' + (Math.round(dg.share * 10000) / 100) + '%)', '−' + krw(dg.acqPrice)], ['양도차익', krw(dg.gain), 1]]) : '') +
          ul(['주는 분이 이 채무 부분을 판 것으로 보고 양도세를 냅니다. 양도가액은 채무액, 취득가액은 원래 취득가 중 채무 비율만큼입니다(소득세법 시행령 제159조).',
            '주는 분이 1세대1주택 비과세 요건을 갖췄다면 이 부분도 비과세될 수 있고, 다주택자라면 조정대상지역 중과가 붙을 수 있습니다. 양도세 계산기에서 위 양도가액·취득가액으로 계산해 보세요.',
            '배우자·직계존비속 사이 부담부증여는 받는 분이 실제로 채무를 갚는지 국세청이 사후관리합니다.']) + '</details>';
      }
      $('gRes').innerHTML = '<div class="lbl">' + krw(value) + ' 주택 증여 시 받는 분이 낼 세금 (증여세 + 취득세)</div>' +
        '<div class="big">' + krw(total) + '</div><span class="pill ' + (a.heavy ? 'no' : 'mid') + '">' + (a.heavy ? '취득세 12% 중과' : '증여 취득세 3.5%') + '</span>' +
        '<div class="stats"><div class="stat"><div class="k">증여세</div><div class="v">' + krw(g.tax) + '</div></div><div class="stat"><div class="k">취득세 (교육세·농특세 포함)</div><div class="v">' + krw(a.total) + '</div></div></div>' +
        '<details class="how" open><summary>증여세 계산 근거</summary>' + table([
          ['증여재산가액', krw(value)], ['넘겨받은 채무', '−' + krw(g.debt)], ['10년 안 이전 증여 합산', '+' + krw(g.prior)], ['증여재산공제', '−' + krw(g.ded)],
          ['과세표준', krw(g.base)], ['세율', g.rate ? Math.round(g.rate * 100) + '% (누진공제 적용)' : '-'], ['산출세액', won1(g.calc)], ['세대생략 할증', '+' + won1(g.surcharge)],
          ['이전에 낸 증여세', '−' + won1(g.priorTax)], ['신고세액공제 3%', '−' + won1(g.filing)], ['증여세', won1(g.tax), 1]
        ]) + ul(why) +
        '<p class="law">상속세 및 증여세법 제47조(10년 합산·채무 차감), 제53조(공제 배우자 6억·직계존속 5천만·미성년 2천만·직계비속 5천만·기타친족 1천만), 제53조의2(혼인·출산 1억), 제55조(50만 원 미만 비과세), 제56조·제26조(10~50%, 누진공제 0·1천만·6천만·1.6억·4.6억), 제57조(세대생략 30·40%), 제58조(기납부세액), 제69조(신고세액공제 3%).</p></details>' +
        '<details class="how"><summary>취득세 계산 근거</summary>' + table([
          ['증여분 과세표준 (시가 − 채무)', krw(a.gift.base)], ['취득세 ' + ratePct(a.gift.rate), won1(a.gift.acq)], ['지방교육세 ' + ratePct(a.gift.eduRate), won1(a.gift.edu)], ['농어촌특별세 ' + ratePct(a.gift.farmRate), won1(a.gift.farm)]
        ].concat(a.debt ? [['채무분 (유상취득) ' + ratePct(a.debt.rate), won1(a.debt.acq)], ['채무분 지방교육세·농특세', won1(a.debt.edu + a.debt.farm)]] : []).concat([['합계', won1(a.total), 1]])) +
        ul([a.why + '.', '증여 취득세 과세표준은 시가인정액(비슷한 거래가)입니다. 중과 여부(3억 원)는 공시가격으로 판단합니다.']
          .concat(a.debt ? ['채무 부분은 돈을 주고 산 것(유상취득)으로 보아 받는 분 세대의 주택 수(' + gRecvN + '채)에 따른 1~3% 또는 중과세율을 적용했습니다. 세율 구간은 집 전체 가격 기준으로 잡았으니 위택스에서 확인해 주세요.'] : [])) +
        '<p class="law">지방세법 제10조의2(시가인정액), 제11조 제1항 제2호(무상취득 3.5%), 제13조의2 제2항·시행령 제28조의6(조정대상지역 3억 이상 12%, 1세대1주택자의 배우자·직계존비속 증여 제외), 제151조(지방교육세), 농어촌특별세법 제5조.</p></details>' +
        debtHtml;
    }
  });

  /* 주소의 #으로 바로 열기 */
  const h0 = (location.hash || '').slice(1);
  if (h0 in VIEWS) show(h0, false);
})();
