/* 프리미엄 단지 리포트 추가 칸 3개 (assets/premium-report.js 가 단지마다 부름)
   ① 보유 기간별 세금 표(1·2·3·5·7년 보유 뒤 팔 때): 보유세(재산세+종부세) 한 해·합계, 양도세
      - 계산은 세금 계산 화면과 같은 엔진 tax/tax-engine.js(JDJ_TAX) 그대로 — 이 파일에 세율·공제 규칙을 두지 않아요.
      - 공시가격은 국토교통부 공시가격(같은 평형 호별 중간값, assets/gongsi.js)을 미리 넣고 고칠 수 있어요. 시세×비율 추정은 하지 않아요.
      - 산 가격 기본값 = 지금 시세, 팔 가격 기본값 = 지금 시세(오른다고 가정하지 않음). 이용자가 바꿀 수 있어요.
      - 넣은 금액은 이 기기(localStorage)에만 저장하고 주소(URL)·서버로 보내지 않아요.
   ② 비슷한 과거 단지 사례: 엔진이 공개 실거래로 미리 골라 둔 jangdaejang-data data/analog/{구코드}.json 의 사례를 그대로 보여 줘요.
      고르는 기준값은 공개 파일에 없어요(비공개 엔진). 지번은 싣지 않아요.
   ③ 1~10년 가격 시나리오(보수·기준·낙관 = 비슷한 과거 사례 결과의 하위 25%·중간·상위 25%): 과거 검증(analog/meta.json)에서
      가운데 범위 적중률이 기준 안에 든 기간만 보여 주고, 나머지는 '아직 믿을 만한 범위가 나오지 않아 싣지 않았어요'.
   window.JDJ_PREX = { load, taxHtml, bindTax, casesHtml, scenHtml, soonText, css } */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var HOLD = [1, 2, 3, 5, 7], HZ = [1, 3, 5, 7, 10], CASE_HZ = [1, 3, 5];
  var KEY = 'jdj_prem_tax';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var num = function (v) { return parseInt(String(v == null ? '' : v).replace(/[^0-9]/g, ''), 10) || 0; };
  var comma = function (v) { return (+v || 0).toLocaleString('ko-KR'); };
  /* 원 → 표 칸용 금액(만 원 아래 반올림): 0원 · 38만 · 1,234만 · 1억 4,390만 · 12억 */
  function wonS(w) {
    var m = Math.round((w || 0) / 10000);
    if (m <= 0) return '0원';
    if (m < 10000) return comma(m) + '만';
    var e = Math.floor(m / 10000), r = m % 10000; return e + '억' + (r ? ' ' + comma(r) + '만' : '');
  }
  /* 만 원 → '9억 8,000만 원' */
  function manL(v) {
    v = Math.round(+v || 0); if (v <= 0) return '0원';
    var e = Math.floor(v / 10000), r = v % 10000;
    return (e ? e + '억' + (r ? ' ' : '') : '') + (r ? comma(r) + '만' : '') + ' 원';
  }
  var sgn = function (v) { return v == null ? '-' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '%'; };
  var ymKo = function (s) { return s ? s.slice(0, 4) + '년 ' + (+s.slice(4, 6)) + '월' : ''; };
  var dayKo = function (s) { var p = String(s || '').split('-'); return p.length === 3 ? p[0] + '년 ' + (+p[1]) + '월 ' + (+p[2]) + '일' : ''; };

  /* ---------------- 자료 받기 ---------------- */
  var cache = {};
  function getJSON(u) {
    if (!cache[u]) cache[u] = (typeof fetch === 'function' ? fetch(u).then(function (r) { return r.ok ? r.json() : null; }) : Promise.resolve(null)).catch(function () { return null; });
    return cache[u];
  }
  /** DATA(…/data/) 와 구 코드 목록 → { meta, by: {구코드: 파일} } — 파일이 아직 없으면 null 칸 */
  function load(DATA, codes) {
    var uniq = Array.from(new Set(codes || []));
    return Promise.all([getJSON(DATA + 'analog/meta.json')].concat(uniq.map(function (c) { return getJSON(DATA + 'analog/' + c + '.json'); })))
      .then(function (a) { var by = {}; uniq.forEach(function (c, i) { by[c] = a[i + 1]; }); return { meta: a[0], by: by }; });
  }
  function recOf(AN, x) {
    var f = AN && AN.by && AN.by[x.code];
    return f && f.u ? f.u[x.dong + '|' + x.apt + '|' + x.band] || null : null;
  }

  /* ---------------- ① 보유 기간별 세금 ---------------- */
  function loadSt() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function saveSt(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  var ukey = function (x) { return [x.code, x.dong, x.apt, x.band].join('|'); };

  /** 순수 계산(테스트용): o = { T, price(만원, 지금 시세), buy(만원), sale(만원), std(만원 공시가격|0), houses(1|2|3), resid(년), today, adj(true|false|'ask') }
      → { rows: [{h, hold1, holdSum, holdNote, cgt, tag, total}], adjAsk, cpt } (금액은 원) */
  function taxRows(o) {
    var T = o.T, today = o.today || T.todayStr(), adj = o.adj === true || o.adj === 'ask';
    var one = o.houses === 1, std = (o.std || 0) * 10000;
    var rows = HOLD.map(function (h) {
      var hold1 = null, holdSum = null;
      if (std > 0) {
        holdSum = 0;
        for (var k = 1; k <= h; k++) {
          var pt = T.propertyTax({ price: std, one: one }).total;
          var ct = one ? T.compTax({ prices: [std], one: true, age: 0, years: k - 1 }).total : 0;
          if (k === 1) hold1 = pt + ct;
          holdSum += pt + ct;
        }
      }
      var sale = T.addDays(T.addYears(today, h), 1);      // 보유 h년이 확실히 지난 다음 날 판다고 봄(응당일 경계 피함)
      var r = T.calcCGT({ acqDate: today, acqPrice: o.buy * 10000, saleDate: sale, salePrice: o.sale * 10000, expenses: 0,
        residMonths: Math.min(o.resid || 0, h) * 12, houses: Math.min(3, Math.max(1, o.houses || 1)), acqAdj: adj, saleAdj: adj, tempTwo: null });
      var tag = r.gain <= 0 ? '차익 없음' : r.exempt === 'full' ? '비과세' : r.exempt === 'partial' ? '12억 넘는 부분만' : r.heavy ? '중과 +' + Math.round(r.heavy * 100) + '%p'
        : r.kind === 'short70' ? '1년 안 70%' : r.kind === 'short60' ? '2년 안 60%' : r.ltdRate ? '장기보유공제 ' + Math.round(r.ltdRate * 100) + '%' : '';
      return { h: h, hold1: hold1, holdSum: holdSum, cgt: r.total, tag: tag, total: (holdSum || 0) + r.total, gain: r.gain, exempt: r.exempt };
    });
    return { rows: rows, one: one, adjAsk: o.adj === 'ask' };
  }

  function lawText(T) {
    var L = T.LAW || {}, a = [];
    ['cgt', 'prop', 'cpt'].forEach(function (k) { if (L[k]) a.push(L[k].name + ': ' + L[k].arts.join(', ')); });
    return a.join(' · ');
  }

  function taxHtml(x, i) {
    var T = root.JDJ_TAX;
    if (!T) return '';
    return '<div class="pr-sec" data-sec="tax" data-tx="' + i + '"><h3>보유 기간별 세금 <small>(보유세·양도세, 1·2·3·5·7년 보유 뒤 팔 때)</small></h3>' +
      '<div class="px-in noprint">' +
      '<label>주택 수(이 집 포함)<select data-k="houses"><option value="1">1주택</option><option value="2">2주택</option><option value="3">3주택 이상</option></select></label>' +
      '<label>실거주(년)<input data-k="resid" inputmode="numeric" maxlength="2"></label>' +
      '<label>산 가격(만원)<input data-k="buy" inputmode="numeric"></label>' +
      '<label>팔 가격(만원)<input data-k="sale" inputmode="numeric"></label>' +
      '<label class="px-wide">공시가격(만원)<input data-k="std" inputmode="numeric" placeholder="공시가격을 넣으면 보유세가 나와요"></label>' +
      '</div><p class="px-gs" data-gsn hidden></p>' +
      '<p class="px-cond" data-o="cond"></p><div data-o="tbl"></div>' +
      '<details class="jp-check"><summary>어떻게 계산했나요?</summary><p data-o="how"></p></details></div>';
  }

  /** 그린 뒤 칸마다 연결: items(리포트 단지 목록), opt.persist(이 기기에 저장할지) */
  function bindTax(box, items, opt) {
    var T = root.JDJ_TAX; if (!T || !box) return;
    opt = opt || {};
    var st = loadSt();
    st.u = st.u || {};
    box.querySelectorAll('[data-tx]').forEach(function (sec) {
      var x = items[+sec.getAttribute('data-tx')]; if (!x) return;
      var k = ukey(x), mine = st.u[k] || {};
      var q = function (n) { return sec.querySelector('[data-k="' + n + '"]'); };
      q('houses').value = String(st.houses || 1);
      q('resid').value = st.resid != null ? st.resid : 2;
      q('buy').value = comma(mine.buy || x.P);
      q('sale').value = comma(mine.sale || x.P);
      if (mine.std) q('std').value = comma(mine.std);
      var adj = root.JDJ_REG ? root.JDJ_REG.at(String(x.code), 'adj', T.todayStr(), { dong: x.dong, kind: 'apt' }) : 'ask';
      var gs = null;
      function upd(save) {
        var o = { T: T, price: x.P, buy: num(q('buy').value) || x.P, sale: num(q('sale').value) || x.P, std: num(q('std').value), houses: +q('houses').value || 1,
          resid: Math.min(30, num(q('resid').value)), adj: adj };
        var R = taxRows(o), saleSame = o.sale === x.P;
        sec.querySelector('[data-o="cond"]').innerHTML = '<b>' + (saleSame ? '팔 가격 = 지금 시세 그대로(오른다고 가정하지 않았어요)' : '팔 가격 = 직접 넣은 ' + esc(manL(o.sale))) + '</b> · 산 가격 ' + esc(manL(o.buy)) +
          ' · ' + (o.houses >= 3 ? '3주택 이상' : o.houses + '주택') + ' · 실거주 ' + o.resid + '년' + (o.std ? ' · 공시가격 ' + esc(manL(o.std)) + '(해마다 같다고 봄)' : '') +
          ' · ' + (adj === true ? '조정대상지역' : adj === 'ask' ? '조정대상지역 일부 — 조정대상지역으로 계산' : '비조정대상지역') + ' · 오늘 사서 표의 기간만큼 가진 뒤 판다고 봤어요';
        var head = '<tr><th>보유 기간</th><th>보유세<br><small>기간 합계</small></th><th>양도세<br><small>지방소득세 포함</small></th><th>세금 합계</th></tr>';
        var body = R.rows.map(function (r) {
          return '<tr><td><b>' + r.h + '년</b></td>' +
            '<td>' + (r.holdSum == null ? '-' : '<b>' + wonS(r.holdSum) + '</b><br><small>한 해 ' + wonS(r.hold1) + '</small>') + '</td>' +
            '<td><b>' + wonS(r.cgt) + '</b>' + (r.tag ? '<br><small>' + esc(r.tag) + '</small>' : '') + '</td>' +
            '<td>' + (r.holdSum == null ? wonS(r.total) + '<br><small>보유세 빼고</small>' : '<b>' + wonS(r.total) + '</b>') + '</td></tr>';
        }).join('');
        var notes = [];
        if (!o.std) notes.push('공시가격을 넣으면 보유세(재산세·종합부동산세)가 나와요. 우리 집 공시가격은 부동산공시가격알리미에서 확인할 수 있어요.');
        if (!R.one && o.std) notes.push('2주택 이상이면 종합부동산세는 가진 집 공시가격을 모두 합쳐 계산해서, 이 표의 보유세에는 재산세만 넣었어요. 종합부동산세는 집예보 세금 계산(종합부동산세)에서 따로 계산해 보세요.');
        if (R.one && o.std) notes.push('종합부동산세는 나이 공제 없이, 보유 5년부터 보유기간 공제를 넣었어요.');
        if (saleSame && o.buy === o.sale) notes.push('산 가격과 팔 가격이 같으면 차익이 없어 양도세가 0원이에요. 팔 가격을 바꾸면 기간별 양도세가 바로 다시 계산돼요.');
        sec.querySelector('[data-o="tbl"]').innerHTML = '<div class="tblwrap"><table class="pr-tbl px-tax"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
          (notes.length ? '<ul class="px-notes">' + notes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '');
        sec.querySelector('[data-o="how"]').textContent = '세금 계산 화면과 같은 계산 엔진으로 ' + dayKo(T.AS_OF) + ' 시행 법령 기준으로 계산했어요. ' +
          '1주택 비과세(2년 보유, 조정대상지역에서 산 집은 2년 거주)·12억 원 넘는 부분 과세·장기보유특별공제(보유 3년부터)·단기 보유 세율·다주택 중과는 엔진 규칙 그대로예요. ' +
          '양도세는 필요경비 0원, 기본공제 250만 원, 지방소득세 10% 포함이에요. 팔 때도 지금 규제지역 지정이 그대로라고 봤어요. 법이 바뀌면 결과도 달라져요. ' +
          '적용 조항 — ' + lawText(T) + '. 실제 신고 전에는 홈택스·위택스나 세무사와 확인해 주세요.';
        if (save && opt.persist !== false) {
          st.houses = o.houses; st.resid = o.resid;
          st.u[k] = { buy: o.buy !== x.P ? o.buy : undefined, sale: o.sale !== x.P ? o.sale : undefined, std: gs && gs.info && o.std === +gs.info.v ? undefined : (o.std || undefined) };
          saveSt(st);
        }
      }
      sec.querySelectorAll('input').forEach(function (inp) {
        inp.addEventListener('input', function () { if (inp.getAttribute('data-k') !== 'resid') { var v = num(inp.value); inp.value = v ? comma(v) : ''; } else inp.value = inp.value.replace(/[^0-9]/g, '').slice(0, 2); upd(true); });
      });
      q('houses').addEventListener('change', function () { upd(true); });
      upd(false);
      /* 공시가격: 같은 평형 호별 중간값을 미리 넣기(자료가 없으면 직접 입력) */
      var G = root.JDJ_GONGSI;
      if (G && x.jb != null) G.get({ code: x.code, dong: x.dong, jibun: x.jb, apt: x.apt, band: x.band, area: x.area }).then(function (info) {
        if (!info || !sec.isConnected) return;
        gs = G.attach(q('std'), info, sec.querySelector('[data-gsn]'));
        upd(false);
      }).catch(function () {});
    });
  }

  /* ---------------- ② 비슷한 과거 단지 사례 ---------------- */
  function med(a) { var s = a.slice().sort(function (p, q) { return p - q; }), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : Math.round((s[n / 2 - 1] + s[n / 2]) / 2)) : null; }
  function relText(v) { return v == null ? '' : v === 0 ? '구 평균과 비슷' : '구 평균보다 ' + Math.abs(v) + '% ' + (v > 0 ? '비쌈' : '쌈'); }
  function caseStats(cs) {
    return CASE_HZ.map(function (h, j) {
      var v = cs.map(function (c) { return c[10 + j]; }).filter(function (z) { return z != null; });
      return { h: h, med: med(v), lo: v.length ? Math.min.apply(null, v) : null, hi: v.length ? Math.max.apply(null, v) : null, n: v.length };
    });
  }
  function casesHtml(x, AN, IX) {
    var head = '<div class="pr-sec" data-sec="cases"><h3>비슷했던 과거 단지 사례 <small>(그 뒤 1·3·5년 실제 변화)</small></h3>';
    var file = AN && AN.by ? AN.by[x.code] : null;
    if (!file) return head + '<p class="px-empty">과거 사례 자료를 준비하고 있어요. 자료가 올라오면 이 리포트에 자동으로 보여요(같은 링크, 추가 비용 없음).</p></div>';
    var rec = recOf(AN, x), cs = rec && rec.c || [];
    if (cs.length < 5) return head + '<p class="px-empty">이 단지와 조건이 비슷했던 과거 사례가 5곳보다 적어 싣지 않았어요. 사례가 적으면 우연에 크게 흔들려서예요.</p></div>';
    var S = caseStats(cs), s5 = S[2], nw = rec.now || [], sggName = function (c) { return ((IX && IX.sgg && IX.sgg[c]) || {}).name || ''; };
    var short = function (n) { return String(n || '').replace(/특별자치시|특별자치도|특별시|광역시|통합특별시/, '').replace(/^(충청|전라|경상)(북|남)도$/, function (m, a, b) { return { 충청: '충', 전라: '전', 경상: '경' }[a] + b; }).replace(/도$/, '') || n; };
    var easy = '지금 이 단지와 모습이 비슷했던 과거 단지 ' + cs.length + '곳은 그 뒤 5년 동안 가운데 값으로 보면 ' + (s5.med === 0 ? '거의 그대로였어요' : Math.abs(s5.med) + '% ' + (s5.med > 0 ? '올랐어요' : '내렸어요')) +
      '(가장 낮은 곳 ' + sgn(s5.lo) + ' ~ 가장 높은 곳 ' + sgn(s5.hi) + '). 지난 일이라 앞으로도 그렇다는 보장은 없어요.';
    var now = nw.length ? '<p class="px-now"><b>이 단지 지금(' + esc(ymKo(file.to)) + ')</b> 지은 지 ' + nw[0] + '년' + (x.f && x.f.hh ? ' · ' + comma(x.f.hh) + '세대' : '') + ' · ' + esc(relText(nw[1])) + ' · 최근 3년 ' + sgn(nw[2]) + '</p>' : '';
    var li = cs.map(function (c) {
      var at = ymKo(c[5]) + ' 그때: 지은 지 ' + c[6] + '년 · ' + (c[7] ? comma(c[7]) + '세대' : '세대수 자료 없음') + ' · ' + relText(c[8]) + ' · 직전 3년 ' + sgn(c[9]);
      return '<li><div class="px-cn"><b>' + esc(c[3]) + '</b> <span>' + esc(c[4]) + '</span></div><div class="px-cl">' + esc(short(c[0]) + ' ' + sggName(c[1]) + ' ' + c[2]) + '</div>' +
        '<div class="px-ca">' + esc(at) + '</div><div class="px-co">' + CASE_HZ.map(function (h, j) { var v = c[10 + j]; return '<span class="' + (v > 0 ? 'up' : v < 0 ? 'dn' : '') + '">' + h + '년 뒤 <b>' + sgn(v) + '</b></span>'; }).join('') + '</div></li>';
    }).join('');
    var sum = '<div class="tblwrap"><table class="pr-tbl px-sum"><thead><tr><th>' + cs.length + '곳 모아 보면</th>' + S.map(function (s) { return '<th>' + s.h + '년 뒤</th>'; }).join('') + '</tr></thead><tbody>' +
      '<tr><td>가운데 값</td>' + S.map(function (s) { return '<td><b>' + sgn(s.med) + '</b></td>'; }).join('') + '</tr>' +
      '<tr><td>가장 낮은 곳 ~ 높은 곳</td>' + S.map(function (s) { return '<td>' + sgn(s.lo) + ' ~ ' + sgn(s.hi) + '</td>'; }).join('') + '</tr></tbody></table></div>';
    return head + '<p class="jp-easy"><b>쉽게 말하면:</b> ' + esc(easy) + '</p>' + now + '<ol class="px-cases">' + li + '</ol>' + sum +
      '<details class="jp-check"><summary>어떻게 골랐나요?</summary><p>국토교통부 실거래(해제·직거래 제외)로 2009년부터 해마다 4월·10월 시점의 단지 모습을 재고, 지금 이 단지와 가장 비슷했던 과거 단지를 골랐어요. ' +
      '비교한 것은 같은 시·도(사례가 모자라면 가까운 지역), 그때 지은 지 몇 년이었는지, 세대수, 같은 구 평균 대비 3.3㎡당 가격, 직전 3년 가격 흐름이에요. 그때 모습은 그 시점까지의 자료로만 쟀어요. ' +
      '변화는 그 평형 3.3㎡당 실거래 3개월 가운데 값 기준이고, 실제로 거래된 숫자만 썼어요. 5년 뒤 결과가 이미 나온 시점만 골랐고, 한 단지는 한 번만, 같은 해 시점은 두 곳까지만 넣었어요. ' +
      '단지 이름과 동까지만 보여 드리고 지번은 싣지 않아요.</p></details></div>';
  }

  /* ---------------- ③ 1~10년 가격 시나리오 ---------------- */
  function covText(b) { return !b || !b.n ? '검증할 과거 결과가 아직 없어요' : '4월 기준 ' + b['04'] + '% · 10월 기준 ' + b['10'] + '%'; }
  function scenHtml(x, AN) {
    var head = '<div class="pr-sec" data-sec="scen"><h3>1~10년 가격 시나리오 <small>(보수·기준·낙관)</small></h3>';
    var M = AN && AN.meta;
    if (!M || !M.bt) return head + '<p class="px-empty">가격 시나리오 검증 자료를 준비하고 있어요. 검증을 마친 기간부터 이 리포트에 자동으로 보여요(같은 링크, 추가 비용 없음).</p></div>';
    var ship = M.ship || [], rec = recOf(AN, x), q = rec && rec.q || {}, tg = M.target || [40, 60];
    var bt = function (h) { var g = M.bt[String(h)] || {}, a = g['04'] || {}, b = g['10'] || {}; return { n: (a.n || 0) + (b.n || 0), '04': a.cov, '10': b.cov }; };
    var shown = HZ.filter(function (h) { return ship.indexOf(h) >= 0 && q[String(h)]; });
    var easy = shown.length
      ? '한 값으로 맞히려는 예측이 아니에요. 지금 이 단지와 비슷했던 과거 단지들이 실제로 걸어간 결과를 모아, 아래쪽 4분의 1 지점(보수)·가운데(기준)·위쪽 4분의 1 지점(낙관)을 보여 드려요. 과거 검증에서 실제 결과가 보수~낙관 사이에 절반쯤 들어간 기간만 실었어요.'
      : '과거 자료로 검증해 보니 아직 어느 기간도 범위가 실제 결과를 충분히 맞히지 못해서, 이번에는 가격 범위를 싣지 않았어요. 매달 새 자료로 다시 검증해 기준을 채운 기간부터 이 자리에 보여 드려요(같은 링크, 추가 비용 없음).';
    var rows = HZ.map(function (h) {
      var v = q[String(h)], ok = shown.indexOf(h) >= 0, b = bt(h);
      var p = function (c) { return '<b>' + sgn(c) + '</b><br><small>' + esc(manL(Math.round(x.P * (1 + c / 100) / 100) * 100)) + '</small>'; };
      return '<tr' + (ok ? '' : ' class="jp-ref"') + '><td><b>' + h + '년 뒤</b></td>' +
        (ok ? '<td>' + p(v[0]) + '</td><td>' + p(v[1]) + '</td><td>' + p(v[2]) + '</td>' : '<td colspan="3">아직 믿을 만한 범위가 나오지 않아 싣지 않았어요</td>') +
        '<td><small>' + esc(covText(b)) + '</small></td></tr>';
    }).join('');
    return head + '<p class="jp-easy"><b>쉽게 말하면:</b> ' + esc(easy) + '</p>' +
      '<div class="tblwrap"><table class="pr-tbl px-scen"><thead><tr><th>기간</th><th>보수<br><small>하위 25%</small></th><th>기준<br><small>가운데</small></th><th>낙관<br><small>상위 25%</small></th><th>과거 검증<br><small>범위 안에 든 비율</small></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="px-small">금액은 지금 추정 시세(' + esc(manL(x.P)) + ')에 비율을 곱한 값이에요. 실거래 자료 ' + esc(ymKo(M.to)) + '까지 기준.</p>' +
      '<details class="jp-check"><summary>어떻게 검증했나요?</summary><p>과거의 4월·10월 시점마다 그때까지 나온 자료만으로 범위를 만들어 보고, 그 뒤 실제 결과가 보수~낙관 사이에 들어갔는지 세었어요. ' +
      '범위가 제대로라면 절반쯤 들어가야 해요. 4월 시점과 10월 시점 두 묶음 모두 ' + tg[0] + '~' + tg[1] + '% 안에 든 기간만 실어요. ' +
      '이보다 낮으면 범위가 너무 좁아 실제 결과가 자주 벗어났다는 뜻이에요. 10년은 과거 결과가 확정된 시점이 아직 모자라 검증하지 못했어요. 과거 결과는 앞으로를 보장하지 않으며, 사고팔기를 권하는 정보가 아니에요.</p></details></div>';
  }

  /** 'pr-soon' 칸 문구: 아직 빠진 것이 없으면 '' */
  function soonText(AN) {
    var M = AN && AN.meta, ship = (M && M.ship) || [];
    var miss = HZ.filter(function (h) { return ship.indexOf(h) < 0; });
    if (M && !miss.length) return '';
    return (M ? miss.map(function (h) { return h + '년'; }).join('·') + ' 가격 시나리오는 과거 검증 기준을 아직 채우지 못해 범위 대신 검증 결과만 보여 드려요.' : '가격 시나리오와 과거 사례 자료를 준비하고 있어요.') +
      ' 매달 새 자료로 다시 검증해 기준을 채운 기간부터 이 리포트에 더해져요. 같은 링크(또는 주문번호)로 열람 기간 동안 추가 비용 없이 보실 수 있어요.';
  }

  function css() {
    if (typeof document === 'undefined' || document.getElementById('pxCss')) return;
    var s = document.createElement('style'); s.id = 'pxCss';
    s.textContent = '.px-in{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:4px 0 6px}' +
      '.px-in label{font-size:12.5px;font-weight:700;color:var(--sub,#3E4754);min-width:0}.px-in .px-wide{grid-column:1/-1}' +
      '.px-in input,.px-in select{width:100%;box-sizing:border-box;font:inherit;font-size:15px;border:1px solid var(--line,#E5E8EB);border-radius:10px;padding:8px 10px;min-height:44px;margin-top:3px;background:#fff}' +
      '@media(max-width:560px){.px-in{grid-template-columns:1fr 1fr}}' +
      '.px-cond{font-size:13px;color:var(--sub2,#4E5968);line-height:1.6;margin:4px 0 8px;overflow-wrap:anywhere}.px-cond b{color:var(--text,#191F28)}' +
      '.px-tax td,.px-scen td{white-space:nowrap}.px-sum td{white-space:normal}.px-sum td:first-child{min-width:84px}.px-tax th,.px-scen th,.px-sum th{white-space:normal;vertical-align:bottom}.px-tax th,.px-tax td,.px-sum th,.px-sum td{padding:8px 5px}.px-tax td small,.px-scen td small{color:var(--sub2,#4E5968);font-size:12px}' +
      '.px-scen td[colspan]{white-space:normal;color:var(--sub2,#4E5968)}.px-scen td:last-child{white-space:normal;min-width:96px}' +
      '.px-notes{margin:8px 0 0;padding-left:18px;font-size:13px;color:var(--sub2,#4E5968);line-height:1.6}' +
      '.px-empty,.px-small{font-size:13.5px;color:var(--sub2,#4E5968);line-height:1.6}.px-small{font-size:12.5px;margin:6px 0 0}' +
      '.px-now{font-size:13.5px;margin:6px 0 8px;line-height:1.6;color:var(--sub,#3E4754)}' +
      '.px-cases{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px}' +
      '.px-cases li{border:1px solid var(--line2,#EEF0F3);border-radius:12px;padding:10px 12px;background:var(--gray2,#F7F8FA);min-width:0}' +
      '.px-cn b{font-size:15px}.px-cn span{font-size:12.5px;color:var(--sub2,#4E5968)}.px-cl{font-size:12.5px;color:var(--sub2,#4E5968)}' +
      '.px-ca{font-size:12.5px;color:var(--sub,#3E4754);margin:4px 0 6px;line-height:1.5}' +
      '.px-co{display:flex;gap:6px;flex-wrap:wrap}.px-co span{font-size:12.5px;background:#fff;border:1px solid var(--line,#E5E8EB);border-radius:8px;padding:3px 8px}' +
      '.px-co .up b{color:var(--up,#CC2536)}.px-co .dn b{color:var(--down,#1D63D8)}.px-sum{margin-top:10px}' +
      '.px-gs{margin:0 0 6px}' +
      '@media print{.px-cases{grid-template-columns:1fr 1fr}.px-cases li{break-inside:avoid}}';
    document.head.appendChild(s);
  }

  var api = { load: load, recOf: recOf, taxRows: taxRows, taxHtml: taxHtml, bindTax: bindTax, casesHtml: casesHtml, caseStats: caseStats, scenHtml: scenHtml, soonText: soonText, css: css, HOLD: HOLD, HZ: HZ, KEY: KEY };
  root.JDJ_PREX = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
