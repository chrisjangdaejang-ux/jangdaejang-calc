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
  const VIEWS = { home: 'vHome', cgt: 'vCgt', order: 'vOrder', acq: 'vAcq' };
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
  const NAMES = ['집 A', '집 B', '집 C'];
  function addHouse(def) {
    if (HL.length >= 3) return;
    const i = HL.length, el = document.createElement('div');
    el.className = 'house';
    el.innerHTML = '<h3><span>' + NAMES[i] + '</span>' + (i >= 2 ? '<button type="button" class="rm">빼기</button>' : '') + '</h3>' +
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
    const rm = el.querySelector('.rm'); if (rm) rm.addEventListener('click', () => { el.remove(); HL.pop(); $('hAdd').hidden = false; });
    HL.push({ el, rp });
    $('hAdd').hidden = HL.length >= 3;
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
    $('oList').innerHTML = C.results.map((res, k) =>
      '<div class="ord' + (k === 0 ? ' first' : '') + '"><div class="h"><span>' + (k + 1) + '. ' + res.sales.map(s => s.name).join(' → ') + '</span><span>' + krw(res.total) + '</span></div>' +
      '<div class="bar"><i style="width:' + Math.max(1, res.total / maxT * 100).toFixed(1) + '%"></i></div>' +
      '<details><summary>집별 세금 보기</summary><table>' + res.sales.map(s => {
        const b = s.r.exempt === 'full' ? '<span class="badge2 ok">비과세</span>' : s.r.exempt === 'partial' ? '<span class="badge2 mid">12억 초과분 과세</span>' : s.r.heavy ? '<span class="badge2 no">중과 +' + s.r.heavy * 100 + '%p</span>' : '';
        return '<tr><td>' + dKo(s.date) + ' ' + s.name + b + '<br><small style="color:var(--sub2)">' + s.remain + '채 보유 중 매도 · 차익 ' + krw(s.r.gain) + ' · 장특공 ' + pct(s.r.ltdRate) + '</small></td><td>' + krw(s.tax + Math.floor(s.tax * 0.1)) + '</td></tr>';
      }).join('') + (res.compared ? '<tr><td colspan="2"><small style="color:var(--sub2)">같은 해 합산 비교과세로 연도 합계가 집별 합보다 큽니다.</small></td></tr>' : '') + '</table></details></div>').join('');
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

  /* 주소의 #으로 바로 열기 */
  const h0 = (location.hash || '').slice(1);
  if (h0 in VIEWS) show(h0, false);
})();
