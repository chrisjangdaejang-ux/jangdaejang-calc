/* 청약 공고별 '분양가·입지 분석' 화면 — 청약(/chungyak/) 공고 카드·상세(/chungyak/price/)·유료 리포트(premium/view/)가 같은 함수를 씁니다.
   자료: /jangdaejang-data/data/chungyak/price.json(무료 요약) · chungyak/price/{공고번호}.json(상세) — 엔진 scripts/cy_price.py 가 시행사용
   분양가 적정성 리포트(dev_report.py)와 같은 계산으로 만든 공개 값입니다. 이 파일은 숫자를 새로 만들지 않고 고르기·더하기·나누기만 합니다.
   - 주변 시세 대비 위치: 하위·중간·상위 구간 '에 가까움'까지만(단정하지 않음). 표본이 모자라면 '비교 자료 부족'.
   - 주변 시세와의 차이(안전마진)는 범위로만: 주변 거래 중간 절반(하위 25%~상위 25%)이 분양가보다 몇 % 높고 낮은지 + 표본 수·범위·기간.
   - 광고 여부는 이 파일이 읽지 않아요(광고주 단지라도 같은 숫자).
   - 자금 계획: 대출은 내 집 마련 계산기와 같은 assets/loan-core.js(규제지역 구분은 rec-core.js) — 계약금·중도금 비율은 이용자가 공고문 값으로 바꿈. */
(function (root) {
  'use strict';
  var BAND = ['60㎡ 이하', '60~85㎡', '85㎡ 초과'];
  var TIER = ['하위', '중간', '상위'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return Number(n).toLocaleString('ko-KR'); };
  function won(m) {             // 만원 → '8억 4,500만 원'
    if (m == null || isNaN(m)) return '–';
    m = Math.round(m); var neg = m < 0; m = Math.abs(m);
    var e = Math.floor(m / 10000), r = m % 10000;
    return (neg ? '-' : '') + (e ? e + '억' + (r ? ' ' + fmt(r) + '만' : '') + ' 원' : fmt(r) + '만 원');
  }
  var ymd = function (s) { s = String(s || ''); return s.length >= 8 ? s.slice(0, 4) + '.' + (+s.slice(4, 6)) + '.' + (+s.slice(6, 8)) : ym(s); };
  var ym = function (s) { s = String(s || ''); return s.length >= 6 ? s.slice(0, 4) + '년 ' + (+s.slice(4, 6)) + '월' : ''; };
  var pctTxt = function (v) { return (v > 0 ? v + '% 높음' : v < 0 ? Math.abs(v) + '% 낮음' : '같음'); };

  /* ---------- 문장 ---------- */
  function posTxt(b) {
    if (b.lease) return '토지임대부라 분양가에 땅값이 빠져 있어, 땅값이 들어간 주변 아파트 거래와 같은 조건으로 비교하지 않았어요.';
    if (b.lack) return '같은 구까지 넓혀도 준공 10년 이내 비교 거래가 10건이 안 돼 위치를 정하지 않았어요(비교 자료 부족).';
    var who = '주변 신축·준신축 거래(' + b.scope + ' ' + fmt(b.n) + '건)';
    if (b.pct >= 99.5) return '분양가가 ' + who + ' 모두보다 높아요.';
    if (b.pct <= 0.5) return '분양가가 ' + who + ' 모두보다 낮아요.';
    return '분양가가 ' + who + ' 중 ' + Math.round(b.pct) + '%보다 높아요.';
  }
  function tierPill(b) {
    if (b.lease) return '<span class="cyp-t cyp-na">비교 조건 다름</span>';
    if (b.lack || b.tier == null) return '<span class="cyp-t cyp-na">비교 자료 부족</span>';
    return '<span class="cyp-t cyp-t' + b.tier + '">주변 시세 대비 ' + TIER[b.tier] + ' 구간에 가까워요</span>';
  }
  /* 주변 시세와의 차이(범위): 주변 거래 중간 절반이 분양가보다 a%~b% — 대표 주택형 금액으로도 */
  function marginTxt(b) {
    if (!b.m) return '';
    var a = b.m[0], c = b.m[1], p = b.rep && b.rep.price;
    var t = '주변 거래 가운데 중간 절반(하위 25%~상위 25%)은 이 분양가보다 ' + pctTxt(a) + ' ~ ' + pctTxt(c) + '이에요.';
    if (p) t += ' 전용 ' + Math.floor(b.rep.area) + '㎡ 분양가 ' + won(p) + ' 기준으로 ' + won(p * a / 100) + ' ~ ' + won(p * c / 100) + ' 차이예요.';
    return t;
  }
  function basisTxt(b, r) {
    if (b.lease || b.lack) return '';
    return '근거: ' + b.scope + ' 준공 10년 이내 아파트 매매 ' + fmt(b.n) + '건·' + fmt(b.apts) + '개 단지' + (b.span ? '(' + ymd(b.span[0]) + '~' + ymd(b.span[1]) + ' 계약)' : '')
      + ', 같은 면적 주택형 최고 분양가의 3.3㎡당 중앙값 ' + fmt(b.ppy) + '만 원 vs 주변 중앙값 ' + fmt((b.q || [])[1]) + '만 원.';
  }
  function compTxt(c) {
    if (!c || !c.n) return '최근 2년 같은 구·반경 3km 안 아파트 분양이 없어 비교 자료가 부족해요.';
    var t = '최근 2년 주변 분양 ' + c.n + '곳';
    var top = (c.top || []).filter(function (x) { return x.rate != null; });
    if (top.length) {
      var rs = top.map(function (x) { return x.rate; });
      t += ' · 가까운 곳 1순위 최고 경쟁률 ' + Math.min.apply(null, rs) + '~' + Math.max.apply(null, rs) + '대 1';
      var lo = top.filter(function (x) { return x.lo != null; }).map(function (x) { return x.lo; });
      if (lo.length) t += ' · 당첨 가점 최저 ' + Math.min.apply(null, lo) + '~' + Math.max.apply(null, lo) + '점';
    }
    if (c.low) t += ' · 1순위 미달 ' + c.low + '곳';
    return t;
  }
  function fvTxt(f, gn) {
    if (!f || !f.near) return f && f.gu ? gn + ' 아파트 ' + f.gu_n + '곳의 미래가치 점수 중앙값 ' + f.gu[1] + '점(같은 시·도 안 백분위)' : '주변 미래가치 점수 자료가 부족해요.';
    return '반경 2km 아파트 ' + f.near_n + '곳의 미래가치 점수 중앙값 ' + f.near[1] + '점(같은 시·도 안 백분위)';
  }
  function pastTxt(p, sd) {
    if (!p) return '';
    return '과거에 그대로 써 봤더니: ' + sd + '에서 ' + ym(p.from) + '~' + ym(p.to) + ' 기준 월 ' + p.months + '번 중 ' + p.win + '번, 점수 상위 10% 단지가 하위 10%보다 이후 ' + p.h + '개월 동안 더 올랐어요.';
  }
  function supTxt(r) {
    var a = [];
    if (r.sup) a.push(r.gn + ' 입주 예정 1년 안 ' + fmt(r.sup[0]) + '세대 · 1~2년 ' + fmt(r.sup[1]) + ' · 2~3년 ' + fmt(r.sup[2]));
    if (r.uns) a.push('미분양 ' + fmt(r.uns.now) + '호(' + ym(r.uns.ym) + (r.uns.y1 != null ? ', 1년 전 ' + fmt(r.uns.y1) + '호' : '') + ')');
    if (r.und && r.und.now) a.push('준공 후 미분양 ' + fmt(r.und.now) + '호');
    return a.length ? a.join(' · ') : '입주 예정·미분양 자료가 아직 없어요.';
  }

  /* ---------- 공고 카드 안 무료 요약 ---------- */
  var BASE = '/jangdaejang-calc/';
  function card(r) {
    if (!r) return '';
    var h = '<div class="cyp" data-cyp="' + esc(r.no) + '"><div class="cyp-h"><b>분양가·입지 분석</b><span class="cyp-src">집예보 분석 · 광고와 무관</span></div>';
    (r.bands || []).forEach(function (b) {
      h += '<div class="cyp-b"><div class="cyp-bh"><b>' + BAND[b.b] + '</b> 3.3㎡당 ' + fmt(b.ppy) + '만 원 ' + tierPill(b) + '</div>'
        + '<div class="cyp-s">' + esc(posTxt(b)) + '</div>' + (b.m ? '<div class="cyp-s">' + esc(marginTxt(b)) + '</div>' : '') + '</div>';
    });
    h += '<ul class="cyp-l"><li><b>주변 청약</b> ' + esc(compTxt(r.comp)) + '</li><li><b>미래가치</b> ' + esc(fvTxt(r.fv, r.gn)) + '</li><li><b>수요·공급</b> ' + esc(supTxt(r)) + '</li>'
      + (r.risks && r.risks.length ? '<li><b>살펴볼 점</b> ' + esc(r.risks.filter(function (x, i, a) { return a.indexOf(x) === i; }).join(' · ')) + '</li>' : '') + '</ul>'
      + '<a class="cyp-go" href="' + BASE + 'chungyak/price/?no=' + encodeURIComponent(r.no) + '" data-track="cy_price_open">분석 자세히 보기 · 자금 계획 ›</a></div>';
    return h;
  }

  /* ---------- 자금 계획: 계약금·중도금·잔금 시점별 필요 현금 ---------- */
  function groupOf(g) { var R = root.JDJ_REC; return R && R.groupOf ? R.groupOf(g) : (String(g).indexOf('11') === 0 ? 'reg' : 'local'); }
  /* o: {price 만원, g 구 코드, own none|first|one, income 만원(0이면 DSR 빼고), dp 계약금 %, mid 중도금 %, midLoan 중도금 대출 쓰나, large 85㎡ 초과} */
  function fund(o) {
    var L = root.JDJ_LOAN; if (!L) return null;
    var P = +o.price, dp = Math.max(0, Math.min(100, +o.dp)), mid = Math.max(0, Math.min(100 - dp, +o.mid));
    var c = L.ctx({ g: groupOf(o.g), own: o.own || 'none', income: +o.income || 0, cash: 0, rate: o.rate == null ? 4 : +o.rate, term: 30, etc: 0, costsOn: true, large: !!o.large });
    var dsr = (+o.income > 0) ? L.dsrMax(c) : Infinity;
    var ln = L.loanAt(P, c, dsr), cd = L.costDetail(P, c, !!o.large);
    var tax = cd.acq - cd.relief + cd.edu + cd.farm;          // 분양은 중개보수가 없어 취득세·지방교육세·농특세만
    var down = P * dp / 100, midAmt = P * mid / 100, bal = P - down - midAmt;
    var midCash = o.midLoan ? 0 : midAmt;
    var paidBefore = down + midCash;                           // 입주 전까지 내 돈으로 낸 금액
    var moveCash = Math.max(0, P - paidBefore - ln.L);         // 잔금 대출(주담대)로 중도금 대출까지 갚는다고 보고 남는 금액
    return { P: P, down: down, mid: midAmt, midCash: midCash, bal: bal, loan: ln.L, by: ln.by, ltv: c.ltv, g: c.g, tax: tax, moveCash: moveCash, total: down + midCash + moveCash + tax,
      short: o.midLoan && ln.L < midAmt ? midAmt - ln.L : 0 };
  }
  var BY_TXT = { LTV: 'LTV(집값 대비 비율)', CAP: '가격 구간별 주담대 한도', DSR: '소득(DSR 40%)', BAN: '주택 구입 주담대 불가' };
  var G_TXT = { reg: '규제지역(투기과열지구·조정대상지역)', capfree: '비규제 수도권', local: '지방' };
  function fundHTML(D, o, F) {
    if (!F) return '<div class="cyp-na">대출 계산 모듈을 불러오지 못했어요.</div>';
    var row = function (t, w, v, s) { return '<tr><td><b>' + t + '</b><br><span class="cyp-s">' + w + '</span></td><td class="num">' + won(v) + (s ? '<br><span class="cyp-s">' + s + '</span>' : '') + '</td></tr>'; };
    return '<table class="cyp-tb cyp-fund"><tr><th>시점</th><th class="num">내 돈으로 낼 금액</th></tr>'
      + row('계약할 때', D.ct && D.ct[0] ? ymd(D.ct[0]) + ' 계약 예정(공고 기준)' : '계약일은 공고문 확인', F.down, '계약금 ' + o.dp + '%')
      + row('중도금 기간', '계약 뒤 ~ 입주 전, 보통 여러 번 나눠 내요', F.midCash, o.midLoan ? '중도금 ' + won(F.mid) + '은 중도금 대출로 냈다고 봤어요' : '중도금 ' + o.mid + '%를 모두 내 돈으로')
      + row('입주할 때(잔금)', D.mv ? ym(D.mv) + ' 입주 예정(공고 기준)' : '입주 시기는 공고문 확인', F.moveCash, '잔금 주담대 ' + won(F.loan) + ' 가능(' + (BY_TXT[F.by] || '') + ' 기준) — 중도금 대출도 이 대출로 갚는다고 봤어요')
      + row('취득세 등', '입주(잔금) 때 함께', F.tax, '취득세·지방교육세·농어촌특별세')
      + '<tr class="cyp-sum"><td><b>모두 합쳐 필요한 내 돈</b></td><td class="num"><b>' + won(F.total) + '</b></td></tr></table>'
      + (F.short ? '<div class="cyp-warn">잔금 대출 한도(' + won(F.loan) + ')가 중도금 대출(' + won(F.mid) + ')보다 작아 입주 때 ' + won(F.short) + '을 더 갚아야 해요(위 금액에 들어 있어요).</div>' : '')
      + '<div class="cyp-s">대출 기준: ' + G_TXT[F.g] + ' · ' + ({ none: '무주택', first: '생애최초', one: '1주택(처분 조건)' }[o.own] || '') + ' LTV ' + Math.round(F.ltv * 100) + '% · 금리 4% 30년 가정. '
      + '계약금·중도금 비율, 중도금 대출(집단대출) 가능 여부와 이자 방식은 단지마다 달라 입주자모집공고문이 기준이에요. 발코니 확장·옵션 금액은 빠져 있어요.</div>';
  }

  /* ---------- 상세(무료) + 유료 리포트 ---------- */
  function section(t, body, id) { return '<section class="cyp-sec"' + (id ? ' id="' + id + '"' : '') + '><h2>' + t + '</h2>' + body + '</section>'; }
  function detail(r, D, opt) {
    opt = opt || {}; var paid = !!opt.paid, h = '';
    var bands = (D.bands || []).map(function (b) {
      var q = b.q || [];
      return '<div class="cyp-b"><div class="cyp-bh"><b>' + BAND[b.b] + '</b> ' + b.types + '개 주택형 · ' + fmt(b.hh) + '세대 ' + tierPill(b) + '</div>'
        + '<div class="cyp-s">분양가(최고가) ' + won(b.pmin) + (b.pmin === b.pmax ? '' : ' ~ ' + won(b.pmax)) + ' · 3.3㎡당 ' + fmt(b.ppy) + '만 원'
        + (b.sale_med ? ' · 최근 2년 주변 분양 ' + fmt(b.sale_med) + '만 원(' + b.sale_n + '곳 중앙값)' : '') + '</div>'
        + (q[1] && !b.lease ? bar(b) : '')
        + '<div class="cyp-s cyp-k">' + esc(posTxt(b)) + '</div>' + (b.m ? '<div class="cyp-s cyp-k">' + esc(marginTxt(b)) + ' 지금 거래 기준이고, 입주 때 가격이 아니에요.</div>' : '')
        + (basisTxt(b) ? '<div class="cyp-s">' + esc(basisTxt(b)) + '</div>' : '') + '</div>';
    }).join('');
    h += section('1. 분양가, 주변 시세와 비교하면', bands + '<div class="cyp-s">분양가에는 발코니 확장·옵션이 빠진 경우가 많고, 실거래가는 그것이 들어간 값이라 같은 조건이 아니에요. 층·향·브랜드·단지 규모 차이도 숫자에 담기지 않았어요.</div>', 'cyp1');
    if (paid && D.table && D.table.length) {
      h += section('1-1. 연식·범위별 주변 거래', '<table class="cyp-tb"><tr><th>면적</th><th>연식</th><th>범위</th><th class="num">하위 25%</th><th class="num">중앙값</th><th class="num">상위 25%</th><th class="num">거래</th></tr>'
        + D.table.map(function (t) { var q = t.q || []; return '<tr><td>' + BAND[t.band] + '</td><td>' + esc(t.grp) + '</td><td>' + esc(t.scope) + '</td><td class="num">' + (q[0] == null ? '–' : fmt(q[0])) + '</td><td class="num"><b>' + fmt(q[1]) + '</b></td><td class="num">' + (q[2] == null ? '–' : fmt(q[2])) + '</td><td class="num">' + t.n + '</td></tr>'; }).join('') + '</table>'
        + (D.complexes && D.complexes.length ? '<h3>가까운 비교 단지</h3><table class="cyp-tb"><tr><th>단지</th><th class="num">준공</th><th>면적</th><th class="num">거리</th><th class="num">3.3㎡당</th></tr>'
          + D.complexes.map(function (c) { return '<tr><td>' + esc(c.name) + '<br><span class="cyp-s">' + esc(c.dong) + ' · 거래 ' + c.n + '건</span></td><td class="num">' + c.by + '</td><td>' + BAND[c.band] + '</td><td class="num">' + (c.d >= 99 ? '–' : c.d.toFixed(1) + 'km') + '</td><td class="num">' + fmt(c.med) + '</td></tr>'; }).join('') + '</table>' : ''), 'cyp1b');
    }
    var comp = D.comp || [], cs = paid ? comp : comp.slice(0, 3);
    h += section('2. 주변 최근 분양 경쟁률·당첨 가점', (cs.length ? '<table class="cyp-tb"><tr><th>단지</th><th class="num">1순위 최고 경쟁률</th><th class="num">당첨 가점 최저/평균</th></tr>'
      + cs.map(function (c) { return '<tr><td>' + esc(c.name) + '<br><span class="cyp-s">' + ymd(c.pb) + ' 공고' + (c.d != null ? ' · ' + c.d.toFixed(1) + 'km' : '') + '</span></td><td class="num">' + (c.rate == null ? '–' : c.rate + ' : 1') + '</td><td class="num">' + (c.lo == null ? '–' : c.lo + (c.avg != null ? ' / ' + c.avg : '')) + '</td></tr>'; }).join('') + '</table>'
      : '<div class="cyp-na">최근 2년 같은 구·반경 3km 안 아파트 분양이 없어 비교 자료가 부족해요.</div>')
      + (!paid && comp.length > 3 ? '<div class="cyp-s">가까운 3곳만 보여 드려요(전체 ' + comp.length + '곳은 유료 리포트).</div>' : '')
      + '<div class="cyp-s">경쟁률·가점이 –이면 발표 전이거나 공공데이터에 없는 공고예요. 해당 지역 1순위 기준이에요.</div>', 'cyp2');
    var f = D.fv || {}, fv = '';
    [['반경 2km 아파트', f.near, f.near_n], ['그중 준공 10년 이내', f.newer, f.newer_n], [D.gn + ' 전체', f.gu, f.gu_n]].forEach(function (x) {
      fv += '<div class="cyp-st"><span>' + esc(x[0]) + ' ' + (x[2] || 0) + '곳</span>' + (x[1] ? '<b>중앙 ' + x[1][1] + '점</b><small>하위 25% ' + (x[1][0] == null ? '–' : x[1][0]) + ' · 상위 25% ' + (x[1][2] == null ? '–' : x[1][2]) + '</small>' : '<b class="cyp-na">자료 부족</b>') + '</div>';
    });
    h += section('3. 미래가치 — 주변 단지 점수 분포', '<div class="cyp-g3">' + fv + '</div>' + (f.past ? '<div class="cyp-s cyp-k">' + esc(pastTxt(f.past, D.sd)) + ' (평균 상위 ' + (f.past.top > 0 ? '+' : '') + f.past.top + '% · 하위 ' + (f.past.bot > 0 ? '+' : '') + f.past.bot + '%) 앞으로도 같다는 보장은 없어요.</div>' : '<div class="cyp-s">과거 성적 자료를 정리하고 있어요.</div>')
      + '<div class="cyp-s">점수는 집예보 공개 점수 그대로(같은 시·도 아파트 안 백분위)예요. 새 단지 자체 점수가 아니라 주변 단지들의 분포예요.</div>', 'cyp3');
    var sup = '<div class="cyp-g3">'
      + '<div class="cyp-st"><span>입주 예정(청약홈 공고)</span>' + (D.sup ? '<b>' + fmt(D.sup[0] + D.sup[1] + D.sup[2]) + '세대</b><small>1년 안 ' + fmt(D.sup[0]) + ' · 1~2년 ' + fmt(D.sup[1]) + ' · 2~3년 ' + fmt(D.sup[2]) + '</small>' : '<b class="cyp-na">자료 없음</b>') + '</div>'
      + ['uns', 'und'].map(function (k) { var u = D[k]; return '<div class="cyp-st"><span>' + (k === 'uns' ? '미분양' : '준공 후 미분양') + '(국토교통부)</span>' + (u ? '<b>' + fmt(u.now) + '호</b><small>' + ym(u.ym) + (u.y1 != null ? ' · 1년 전 ' + fmt(u.y1) + '호' : '') + (u.grp > 1 ? ' · 시 단위' : '') + '</small>' : '<b class="cyp-na">최근 자료 없음</b>') + '</div>'; }).join('') + '</div>';
    if (paid && D.uns_series) sup += unsBars(D.uns_series);
    if (paid && D.pp) {
      var a = D.pp.a3049 || {}, nm = D.pp.nm || {};
      sup += '<table class="cyp-tb"><tr><th>인구(통계청)</th><th class="num">값</th><th>비교</th></tr>'
        + (a.v != null ? '<tr><td>30~40대 인구 3년 증감</td><td class="num">' + (a.v > 0 ? '+' : '') + a.v + '%</td><td>' + (a.of ? a.of + '곳 중 ' + a.rk + '위' : '') + ' · ' + ym(a.ym) + '</td></tr>' : '')
        + (nm.v != null ? '<tr><td>순이동(전입−전출, 1년)</td><td class="num">' + (nm.v > 0 ? '+' : '') + fmt(nm.v) + '명</td><td>' + (nm.of ? nm.of + '곳 중 ' + nm.rk + '위' : '') + ' · ' + ym(nm.ym) + '</td></tr>' : '') + '</table>';
    }
    h += section('4. 수요·공급 — ' + esc(D.gn), sup, 'cyp4');
    h += section('5. 대출 규제·자금 계획', '<div class="cyp-s">' + esc(D.gn) + ' 규제지역: <b>' + (D.reg ? '투기과열지구·조정대상지역' : '해당 없음') + '</b>' + (D.pol_at ? ' (정책 ' + esc(D.pol_at) + ' 확인)' : '') + '</div>'
      + (paid && D.pol && D.pol.length ? '<ul class="cyp-l">' + D.pol.map(function (p) { return '<li><b>' + esc(p.date) + ' ' + esc(p.name) + '</b> ' + esc(p.plain) + '</li>'; }).join('') + '</ul>' : '')
      + '<div id="cypFund"></div>', 'cyp5');
    var rk = D.risks || [];
    h += section('6. 살펴볼 점(리스크)', rk.length ? '<ol class="cyp-rk">' + rk.map(function (x) { return '<li><b>' + esc(x[0]) + '</b> — ' + esc(x[1]) + '</li>'; }).join('') + '</ol>' : '<div class="cyp-s">공개 자료에서 따로 확인되는 리스크 항목은 없어요. 공고문의 분양 조건·현장은 직접 확인하세요.</div>', 'cyp6');
    h += '<div class="cyp-note">집예보는 광고주 단지라도 모든 공고를 같은 방식으로 계산해요. 광고 여부는 분석 숫자에 영향을 주지 않아요. 자료 기준: 실거래 ' + ym(D.dataTo) + '까지 · 공개 자료 ' + esc(D.updated) + ' 받음.</div>';
    return h;
  }
  function bar(b) {
    var q = b.q, v = [q[0], q[2], b.ppy, b.sale_med].filter(function (x) { return x; }), lo = Math.min.apply(null, v) * 0.93, hi = Math.max.apply(null, v) * 1.06, W = 340;
    if (q[0] == null || q[2] == null) return '';
    var X = function (x) { return 12 + (x - lo) / (hi - lo) * (W - 24); };
    /* 분양가 글자는 위, 주변 중앙값 글자는 아래 — 두 값이 가까워도 겹치지 않게 */
    return '<svg class="cyp-bar" viewBox="0 0 ' + W + ' 62" role="img" aria-label="주변 거래 분포와 분양가"><line x1="6" y1="30" x2="' + (W - 6) + '" y2="30" stroke="#E5E8EB" stroke-width="2"/>'
      + '<rect x="' + X(q[0]).toFixed(1) + '" y="23" width="' + (X(q[2]) - X(q[0])).toFixed(1) + '" height="14" rx="4" fill="#E8F0FF" stroke="#9DB5F5"/>'
      + '<line x1="' + X(q[1]).toFixed(1) + '" y1="19" x2="' + X(q[1]).toFixed(1) + '" y2="41" stroke="#4E5968" stroke-width="2"/>'
      + '<text x="' + Math.min(W - 40, Math.max(40, X(q[1]))).toFixed(1) + '" y="56" font-size="10" text-anchor="middle" fill="#4E5968">주변 중앙 ' + fmt(q[1]) + '</text>'
      + '<circle cx="' + X(b.ppy).toFixed(1) + '" cy="30" r="6.5" fill="#2F6BFF" stroke="#fff" stroke-width="2"/>'
      + '<text x="' + Math.min(W - 40, Math.max(40, X(b.ppy))).toFixed(1) + '" y="13" font-size="10" font-weight="700" text-anchor="middle" fill="#2F6BFF">분양가 ' + fmt(b.ppy) + '</text></svg>';
  }
  function unsBars(s) {
    var pts = s.filter(function (x) { return x[1] != null; }); if (!pts.length) return '';
    var mx = Math.max.apply(null, pts.map(function (x) { return x[1]; })) || 1, W = 340, H = 90, bw = (W - 10) / s.length;
    return '<svg class="cyp-bar" viewBox="0 0 ' + W + ' ' + (H + 14) + '" role="img" aria-label="최근 24개월 미분양">' + s.map(function (x, i) {
      if (x[1] == null) return ''; var h = Math.max(1, (H - 14) * x[1] / mx);
      return '<rect x="' + (5 + i * bw + 1).toFixed(1) + '" y="' + (H - h).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + (i === s.length - 1 ? '#2F6BFF' : '#C9D7FB') + '"><title>' + ym(x[0]) + ' ' + fmt(x[1]) + '호</title></rect>'
        + (i % 6 === 0 ? '<text x="' + (5 + i * bw).toFixed(1) + '" y="' + (H + 12) + '" font-size="9" fill="#6B7684">' + x[0].slice(2, 4) + '.' + (+x[0].slice(4, 6)) + '</text>' : '');
    }).join('') + '</svg><div class="cyp-s">최근 24개월 미분양(호, 마지막 달 진한 막대)</div>';
  }

  /* 자금 계획 입력칸: 주택형·보유 주택·연소득·계약금/중도금 비율·중도금 대출 */
  function mountFund(el, D) {
    if (!el) return;
    var tys = (D.types || []).slice().sort(function (a, b) { return a.area - b.area || a.price - b.price; });
    if (!tys.length) { el.innerHTML = '<div class="cyp-na">주택형 분양가 자료가 없어 자금 계획을 계산하지 못했어요.</div>'; return; }
    var pick = tys.reduce(function (a, t) { return (Math.abs(t.area - 84.9) < Math.abs(a.area - 84.9)) ? t : a; }, tys[0]);
    el.innerHTML = '<div class="cyp-fi"><label>주택형<select id="cfTy">' + tys.map(function (t, i) { return '<option value="' + i + '"' + (t === pick ? ' selected' : '') + '>' + esc(t.ty.replace(/^0+/, '')) + ' · 최고 ' + won(t.price) + '</option>'; }).join('') + '</select></label>'
      + '<label>집 보유<select id="cfOwn"><option value="none">무주택</option><option value="first">무주택 · 생애최초</option><option value="one">1주택(입주 전 처분 조건)</option></select></label>'
      + '<label>연소득(만 원, 비우면 소득 한도 빼고)<input id="cfInc" type="number" inputmode="numeric" min="0" placeholder="예: 7000"></label>'
      + '<label>계약금 %<input id="cfDp" type="number" inputmode="numeric" min="0" max="100" value="10"></label>'
      + '<label>중도금 %<input id="cfMid" type="number" inputmode="numeric" min="0" max="100" value="60"></label>'
      + '<label class="cyp-ck"><input id="cfML" type="checkbox" checked> 중도금은 중도금 대출로</label></div>'
      + '<div class="cyp-s">계약금 10%·중도금 60%·잔금 30%는 처음 보여 드리는 예시 비율이에요. 공고문 비율로 바꿔 보세요.</div><div id="cfOut"></div>';
    var $ = function (id) { return el.querySelector('#' + id); };
    function run() {
      var t = tys[+$('cfTy').value] || pick;
      var o = { price: t.price, g: D.g, own: $('cfOwn').value, income: +$('cfInc').value || 0, dp: +$('cfDp').value || 0, mid: +$('cfMid').value || 0, midLoan: $('cfML').checked, large: t.area > 85 };
      $('cfOut').innerHTML = fundHTML(D, o, fund(o));
    }
    el.querySelectorAll('select,input').forEach(function (x) { x.addEventListener(x.tagName === 'INPUT' && x.type !== 'checkbox' ? 'input' : 'change', run); });
    run();
  }

  /* 유료 리포트 키: 결제 서버의 단지 키 형식(시도~구~동~이름~평형) 그대로, 평형 자리에 'cy'+공고번호 */
  /* 상품 이름·금액은 assets/pay.js PRODUCTS.cy · 서버 PRICE.cy 와 같아야 함(tools/cy-price-test.js 가 대조). 상세 화면은 결제 모듈 없이 이 값만 씀 */
  var PRODUCT = { key: 'cy', name: '청약 분양가 리포트', amount: 9900 };
  var enc = function (v) { return encodeURIComponent(v).replace(/~/g, '%7E').replace(/!/g, '%21'); };   // pay.js keyOf 와 같은 형식
  function keyOf(r) {
    if (!r || !r.sid || !r.g || !r.no) return '';
    return [r.sid, r.g, r.dg || r.gn || '-', String(r.name).slice(0, 80), 'cy' + r.no].map(enc).join('~');
  }
  function parse(k) { var a = String(k || '').split('~'); if (a.length !== 5) return null; try { return a.map(decodeURIComponent); } catch (e) { return null; } }
  var isCyKey = function (k) { var p = parse(k); return !!(p && /^s\d{2}$/.test(p[0]) && /^\d{5}$/.test(p[1]) && /^cy\d{6,16}$/.test(p[4])); };
  var noOfKey = function (k) { var p = parse(k); return p && isCyKey(k) ? p[4].slice(2) : ''; };

  var DATA = '/jangdaejang-data/data/chungyak/', _ix = null, _d = {};
  function load() { if (!_ix) _ix = fetch(DATA + 'price.json').then(function (r) { if (!r.ok) throw new Error('price'); return r.json(); }).catch(function (e) { _ix = null; throw e; }); return _ix; }
  function loadOne(no) { if (!_d[no]) _d[no] = fetch(DATA + 'price/' + encodeURIComponent(no) + '.json').then(function (r) { if (!r.ok) throw new Error('nf'); return r.json(); }).catch(function (e) { delete _d[no]; throw e; }); return _d[no]; }

  /* 유료 리포트 화면(premium/view/) */
  async function renderPaid(el, key, order) {
    var no = noOfKey(key), D = await loadOne(no);
    el.innerHTML = '<article class="cyp-rep"><div class="eyebrow">청약 분양가 리포트</div><h1 style="margin:4px 0 6px">' + esc(D.name) + '</h1>'
      + '<div class="cyp-s">' + esc(D.sd) + ' ' + esc(D.gn) + ' ' + esc(D.dg || '') + ' · 총 ' + fmt(D.hh || 0) + '세대 · 모집공고 ' + ymd(D.pb) + (D.mv ? ' · 입주 예정 ' + ym(D.mv) : '') + '</div>'
      + detail(D, D, { paid: true })
      + '<div class="cyp-s" style="margin-top:14px">출처: 국토교통부 아파트 매매 실거래가(공공데이터포털) · 한국부동산원 청약홈 분양정보·경쟁률·당첨 가점 · 국토교통부 미분양주택현황(KOSIS) · 통계청 주민등록인구·국내인구이동 · 정책브리핑. 청약 자격·일정·분양 조건은 입주자모집공고문과 청약홈이 기준이에요.</div></article>';
    mountFund(el.querySelector('#cypFund'), D);
    return D;
  }

  var api = { PRODUCT: PRODUCT, BAND: BAND, won: won, posTxt: posTxt, marginTxt: marginTxt, basisTxt: basisTxt, compTxt: compTxt, fvTxt: fvTxt, pastTxt: pastTxt, supTxt: supTxt,
    card: card, detail: detail, fund: fund, fundHTML: fundHTML, mountFund: mountFund, keyOf: keyOf, isCyKey: isCyKey, noOfKey: noOfKey, load: load, loadOne: loadOne, renderPaid: renderPaid };
  root.JDJ_CYP = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
