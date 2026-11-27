/* 분담금·수익 계산기 화면(villa/calc/) — 계산·판정은 assets/redev-calc.js 함수만 써요(node tools/redev-calc-test.js).
   ?z=구역 id 가 있으면: 구역 상세(data/redev/zone/{id}.json)·재개발 지도(zones.json)·정책 표(policy.json)·가까운 새 아파트 실거래(price/{구}.json) */
(function () {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var C = window.JDJ_RCALC, R = window.JDJ_REDEV, esc = R.esc, $ = function (i) { return document.getElementById(i); };
  var DATA = JB.DATA + 'data/', TODAY = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  var get = function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); }); };
  var track = function (n, p) { try { if (window.JDJ_TRACK) window.JDJ_TRACK.event(n, p || {}); } catch (e) {} };
  var F = ['appr', 'ratio', 'mem', 'area', 'buy', 'prem', 'dep', 'tax', 'loan', 'rate', 'months'], MONEY = { appr: 1, mem: 1, buy: 1, prem: 1, dep: 1, tax: 1, loan: 1 };
  var KEY = 'jdj_rcalc', S = { mode: 'buy', z: null, comps: null, pol: null, ZIX: null };

  function val(k) { var v = $(k).value; return MONEY[k] ? C.money(v) : C.num(v); }
  function inputs() { var o = {}; F.forEach(function (k) { o[k] = val(k); }); if (S.mode === 'buy') o.prem = null; else o.buy = null; return o; }
  function save() { try { var o = { mode: S.mode }; F.forEach(function (k) { o[k] = $(k).value; }); localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!o) return; F.forEach(function (k) { if (o[k] != null) $(k).value = o[k]; }); setMode(o.mode === 'prem' ? 'prem' : 'buy'); } catch (e) {} }
  function setMode(m) { S.mode = m; $('mBuy').classList.toggle('on', m === 'buy'); $('mPrem').classList.toggle('on', m === 'prem'); $('fBuy').hidden = m !== 'buy'; $('fPrem').hidden = m !== 'prem'; }

  function draw() {
    var i = inputs(), r = C.calc(i);
    document.querySelectorAll('.eok').forEach(function (el) { var v = val(el.dataset.for); el.textContent = v ? '= ' + C.won(v) : ''; });
    var o = '<h2>계산 결과</h2>';
    if (!r.ok) o += '<div class="miss">' + esc(r.miss.join(', ')) + '을(를) 넣으면 계산해 드려요.</div>';
    else {
      o += '<div class="res"><div class="big"><span>총 투입금</span><b>' + esc(C.won(r.total)) + '</b></div>' +
        '<div><span>권리가액</span><b>' + esc(C.won(r.right)) + '</b></div>' +
        '<div><span>' + (r.burden >= 0 ? '분담금' : '환급금') + '</span><b>' + esc(C.won(Math.abs(r.burden))) + '</b></div>' +
        '<div><span>' + (S.mode === 'buy' ? '프리미엄(P)' : '매수가') + '</span><b>' + esc(C.won(S.mode === 'buy' ? r.prem : r.buy)) + '</b></div>' +
        '<div><span>처음 필요한 현금</span><b>' + esc(C.won(r.cash)) + '</b></div></div>' +
        '<p class="note">이 숫자는 넣은 값으로 계산한 거예요. 분담금은 보통 이주·입주 때 나눠 내요.</p>' +
        '<details class="how" open><summary>계산식 보기</summary><ul class="stp">' + r.steps.map(function (s) { return '<li><b>' + esc(s.k) + ' = ' + esc(C.won(s.v)) + '</b><code>' + esc(s.f) + '</code></li>'; }).join('') + '</ul></details>' +
        '<details class="how"><summary>숫자가 바뀌면 어떻게 될까요</summary><table class="ztr"><thead><tr><th>바뀐 값</th><th class="num">분담금</th><th class="num">총 투입금</th></tr></thead><tbody>' +
        C.sens(i).map(function (x) { return '<tr><td>' + esc(x.t) + '</td><td class="num">' + esc(C.won(x.burden)) + '</td><td class="num">' + esc(C.won(x.total)) + '</td></tr>'; }).join('') + '</tbody></table><p class="note">비례율은 사업비·분양 수입이 바뀌면 달라져요. 넣은 값에서 위아래로 바꿔 계산했어요.</p></details>';
    }
    $('out').innerHTML = o;
    after(r);
    save();
  }
  function after(r) {
    var el = $('after');
    if (!S.z) { el.hidden = true; return; }
    el.hidden = false;
    var h = '<h2>완공 뒤 비교 기준</h2>';
    if (!S.comps) { el.innerHTML = h + '<p class="note">가까운 새 아파트 실거래를 불러오는 중이에요…</p>'; return; }
    var area = val('area'), cs = S.comps === true ? C.comps(S.units, S.nb, TODAY, area) : S.comps;
    if (!cs.length) { el.innerHTML = h + '<p class="note">' + (S.z.in_map ? '가까운 새 아파트에서 ' + (area > 0 ? '받을 집과 비슷한 크기(±20%)의 ' : '') + '최근 1년 거래가 적어(단지마다 3건 미만)' : '이 구역은 가까운 새 아파트 자료(재개발 지도)가 없어') + ' 비교 기준을 만들지 않았어요. 집예보는 숫자를 지어내지 않아요.</p>'; return; }
    var rg = C.afterRange(cs, area);
    h += '<p class="note">가까운 새 아파트(준공 10년 안, 1.5km 안)의 최근 1년 실거래 중 받을 집과 비슷한 크기(전용 ±20%) 거래의 ㎡당 중간값 × 받을 집 전용면적이에요.</p>';
    if (!rg) h += '<div class="miss">받을 집 전용면적을 넣으면 범위를 보여 드려요.</div>';
    else {
      h += '<div class="res"><div class="big"><span>같은 면적 새 아파트 시세 범위(' + rg.n + '개 단지)</span><b>' + esc(C.won(rg.lo)) + (rg.hi > rg.lo ? ' ~ ' + esc(C.won(rg.hi)) : '') + '</b></div></div>';
      if (r && r.ok) {
        var lo = Math.min(rg.lo, r.total), hi = Math.max(rg.hi, r.total), w = hi - lo || 1, pc = function (v) { return Math.max(0, Math.min(100, (v - lo) / w * 100)); };
        h += '<div class="rng" aria-hidden="true"><div class="bar" style="left:' + pc(rg.lo) + '%;width:' + Math.max(2, pc(rg.hi) - pc(rg.lo)) + '%"></div><div class="tick" style="left:' + pc(r.total) + '%"></div><span class="lab" style="left:' + Math.min(88, Math.max(12, pc(r.total))) + '%;color:#C2410C">총 투입금</span></div>' +
          '<p class="note">총 투입금 ' + esc(C.won(r.total)) + ' — 막대는 지금 새 아파트 시세 범위예요. 완공 때 시세는 이와 다를 수 있고, 수익을 보장하지 않아요.</p>';
      }
    }
    h += '<table class="ztr"><thead><tr><th>단지</th><th class="num">㎡당 중간값</th></tr></thead><tbody>' + cs.map(function (c) { return '<tr><td>' + esc(c.n) + '<small>' + c.by + '년 준공 · ' + c.km + 'km · 최근 1년 ' + c.cnt + '건</small></td><td class="num">' + esc(C.won(c.med)) + '</td></tr>'; }).join('') + '</tbody></table><p class="note">국토교통부 아파트 매매 실거래(직거래 제외), ' + esc(TODAY) + ' 기준 최근 1년.</p>';
    el.innerHTML = h;
  }
  function rules() {
    var el = $('rules'); if (!S.z) { el.hidden = true; return; }
    var lv = typeof (S.z.st && S.z.st.v) === 'number' ? S.z.st.v : (S.z.lv || null);
    var RT = C.rights(S.pol, { t: S.z.t, lv: lv, g: S.z.g, dong: S.z.umd, kind: S.z.t === 'rb' ? 'apt' : '' });
    el.hidden = false;
    el.innerHTML = '<h2>이 구역 판정</h2>' + RT.cards.map(function (c) { return '<div class="zrule ' + c.v + '"><h3>' + esc(c.t) + '</h3><p class="rh">' + esc(c.head) + '</p><p>' + esc(c.body || '') + '</p><p class="zsrc">' + (c.law || []).map(function (l) { return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.nm) + ' ↗</a>'; }).join(' · ') + (c.src ? ' · 정책: <a href="' + esc(c.src.url) + '" target="_blank" rel="noopener">' + esc(c.src.nm) + ' ↗</a>' : '') + '</p></div>'; }).join('') + '<p class="note">' + (RT.basis ? esc(RT.basis) + '. ' : '') + '규제지역 표와 법 조문의 일반 규칙으로만 판정했어요. 예외·시점은 구청·전문가에게 확인해 주세요.</p>';
  }
  function zoneInfo(D) {
    var z = S.z, mz = D && (D.z || []).find(function (x) { return x.id === z.id; });
    var lv = typeof (z.st && z.st.v) === 'number' ? z.st.v : (z.lv || null);
    $('zinfo').innerHTML = '<p style="margin:0 0 8px;font-size:16px"><b>' + esc(z.n) + '</b> <small style="color:var(--muted)">' + esc([z.sido, z.gn].filter(Boolean).join(' ')) + ' · ' + esc((z.st && z.st.nm) || z.sn || (lv ? R.STAGES[lv] : '') || '단계 확인 필요') + '</small></p><p class="note" style="margin:0 0 8px"><a href="' + JB.SITE + 'villa/z/?id=' + encodeURIComponent(z.id) + '">이 구역 페이지 보기 ›</a></p>';
    if (mz && mz.sp && mz.sp.y && !R.started(mz)) $('mHint').innerHTML = '참고: 과거 비슷한 구역 기준 이 구역 착공은 ' + (mz.sp.y[0] === mz.sp.y[1] ? mz.sp.y[0] : mz.sp.y[0] + '~' + mz.sp.y[1]) + '년 무렵이에요' + (mz.sp.ok ? '(맞힌 기록 있음)' : '(참고)') + '. 입주는 착공 뒤 공사 기간이 더해져요. 기간은 직접 넣어 주세요.';
    if (mz && mz.nb && mz.nb.length) {
      var gs = Array.from(new Set(mz.nb.map(function (x) { return x.g; })));
      Promise.all(gs.map(function (g) { return get(DATA + 'price/' + g + '.json').then(function (j) { return j.units || []; }).catch(function () { return []; }); }))
        .then(function (us) { S.units = [].concat.apply([], us); S.nb = mz.nb; S.comps = true; draw(); });
    } else { S.comps = []; }
    rules(); draw();
  }
  function pickZone(id) {
    if (!id) return;
    Promise.all([get(DATA + 'redev/zone/' + encodeURIComponent(id) + '.json').catch(function () { return null; }), get(DATA + 'redev/zones.json').catch(function () { return null; }), S.pol ? Promise.resolve(S.pol) : get(DATA + 'policy.json').catch(function () { return null; }), (window.JDJ_RCALC && JDJ_RCALC.regReady ? JDJ_RCALC.regReady() : null)])
      .then(function (a) {
        var z = a[0], D = a[1]; S.pol = a[2];
        if (!z && D) { var m = (D.z || []).find(function (x) { return x.id === id; }); if (m) z = { id: m.id, n: m.n, t: m.t, g: m.g, gn: m.gn, sido: '서울특별시', lv: m.st, sn: m.sn, umd: m.umd, in_map: 1 }; }
        if (!z) { $('zinfo').innerHTML = '<p class="note">이 구역 자료를 찾지 못했어요.</p>'; return; }
        if (D && z.in_map) { var mm = (D.z || []).find(function (x) { return x.id === id; }); if (mm && !z.umd) z.umd = mm.umd; }
        S.z = z; S.comps = null; track('redev_calc_zone', { id: id }); zoneInfo(D);
        try { var u = new URL(location.href); u.searchParams.set('z', id); history.replaceState(null, '', u); } catch (e) {}
      });
  }
  function bind() {
    document.querySelector('main').addEventListener('input', function (e) { if (e.target.id === 'zq') return; draw(); });
    $('mBuy').onclick = function () { setMode('buy'); draw(); };
    $('mPrem').onclick = function () { setMode('prem'); draw(); };
    $('zq').addEventListener('change', function () { var v = $('zq').value.trim(); var id = S.ZIX && S.ZIX[v]; if (id) pickZone(id); });
  }
  function zoneList() {
    get(DATA + 'redev/zone/index.json').then(function (j) {
      S.ZIX = {}; $('zlist').innerHTML = (j.z || []).map(function (z) { var k = z.n + ' (' + [z.sido, z.gn].filter(Boolean).join(' ') + ')'; S.ZIX[k] = z.id; return '<option value="' + esc(k) + '">'; }).join('');
    }).catch(function () {
      get(DATA + 'redev/zones.json').then(function (D) { S.ZIX = {}; $('zlist').innerHTML = (D.z || []).map(function (z) { var k = z.n + ' (' + (z.gn || '') + ')'; S.ZIX[k] = z.id; return '<option value="' + esc(k) + '">'; }).join(''); }).catch(function () {});
    });
  }
  if (!C || !R) return;
  bind(); load(); draw(); zoneList();
  var q = ''; try { q = new URLSearchParams(location.search).get('z') || ''; } catch (e) {}
  if (q) pickZone(q);
})();
