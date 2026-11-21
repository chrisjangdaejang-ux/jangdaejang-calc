/* 장대장 대출·최대 매수액 공용 계산 — 내 집 마련 계산기(buy/)·맞춤 매수 리포트(buy/report/)·대출 한도 계산기(loan/)가 같은 함수를 씁니다.
   규칙 숫자(LTV·가격대별 최대 금액·DSR·스트레스 금리·만기)는 모두 assets/loan-rules.js 한 곳에서 읽어요(출처·적용일 포함).
   금액 단위: 만원 */
(function (root) {
  'use strict';
  var R = root.JDJ_LOAN_RULES || (typeof require === 'function' ? require('./loan-rules.js') : null);
  var LTV = {}; ['reg', 'capfree', 'local'].forEach(function (g) { LTV[g] = {}; ['none', 'first', 'one', 'multi'].forEach(function (o) { LTV[g][o] = R.LTV[g][o].v; }); });
  /* 금리 유형별 스트레스 비율(만기 30년·고정 5~9년 또는 5년 주기 기준) — 수도권·규제지역(3단계)과 지방(2단계) */
  var TYPE_RATIO = { var: R.typeRatio(3, 'var'), mix: R.typeRatio(3, 'mix', '5-9'), cyc: R.typeRatio(3, 'cyc', '5-9') };
  var TYPE_RATIO_LOCAL = { var: R.typeRatio(2, 'var'), mix: R.typeRatio(2, 'mix', '5-9'), cyc: R.typeRatio(2, 'cyc', '5-9') };
  var ETC_DEFAULT = 1000;   // 기타 비용(이사·등기·수리) 기본 가정 — 계산기와 리포트 공통
  var MAX_TERM_LOCAL = 40;  // 지방은 만기 규제가 없어 화면에서 고를 수 있는 가장 긴 기간(규칙 아님)

  /* g: 'reg' | 'capfree' | 'local' */
  function ctx(o) {
    var g = o.g, capital = g !== 'local', regulated = g === 'reg';
    var own = o.own || 'none', rtype = o.rtype || 'cyc';
    var sp = R.stressPeriod(g, o.date), stressBase = Math.round(sp.rate * sp.base * 10000) / 10000;
    var maxTerm = capital ? R.TERM.metroRegMax.v : MAX_TERM_LOCAL;
    return {
      g: g, capital: capital, regulated: regulated, own: own, rtype: rtype,
      ltv: LTV[g][own], stressBase: stressBase, stress: R.stressAdd(g, rtype, o.band || '5-9', o.date),
      income: +o.income || 0, cash: +o.cash || 0, debt: +o.debt || 0, rate: o.rate == null ? 4 : +o.rate,
      dsrRatio: o.lender === 'nonbank' ? R.DSR.nonbank.v : R.DSR.bank.v,
      term: Math.min(o.term || 30, maxTerm),
      etc: o.etc == null ? ETC_DEFAULT : +o.etc, costsOn: o.costsOn !== false, large: !!o.large
    };
  }
  function capByPrice(P, c) { return R.capOf(P, c.capital || c.regulated ? (c.regulated ? 'reg' : 'capfree') : 'local'); }
  /* 연금 현가 계수: 매달 1을 n개월 갚을 때 빌릴 수 있는 돈 */
  function annuity(ratePct, term) { var i = ratePct / 1200, n = term * 12; return i === 0 ? n : (1 - Math.pow(1 + i, -n)) / i; }
  function dsrMax(c, stress, rate, term) {
    var room = c.income * (c.dsrRatio || R.DSR.bank.v) - c.debt; if (room <= 0) return 0;
    return room / 12 * annuity((rate == null ? c.rate : rate) + (stress == null ? c.stress : stress), term == null ? c.term : term);
  }
  function monthly(L, rate, term) { var i = rate / 1200, n = term * 12; if (L <= 0) return 0; return i === 0 ? L / n : L * i / (1 - Math.pow(1 + i, -n)); }
  /* 취득세는 세금 계산 화면과 같은 엔진(tax/tax-engine.js buyerAcqTax)으로 계산 — 이 파일에 세율을 따로 두지 않음.
     무주택 1~3%, 생애최초(12억 이하) 감면 200만 원 한도(지방세특례제한법 제36조의3, 85㎡ 초과는 감면분 농특세 20%),
     1주택(처분조건) 일시적 2주택 1~3%, 다주택(3주택째) 조정 12%·비조정 8%. 엔진 단위는 원 → 여기서 만원으로 바꿈 */
  var TAX = root.JDJ_TAX || (typeof require === 'function' ? require('../tax/tax-engine.js') : null);
  function costDetail(P, c, large) {
    if (large == null) large = c.large;
    var t = TAX.buyerAcqTax(P * 10000, { own: c.own, regulated: c.regulated, large: !!large });
    var rate = Math.round(t.rate * 10000) / 100, heavy = t.heavy;
    var acq = t.acq / 10000, edu = t.edu / 10000, farm = t.farm / 10000, relief = t.relief / 10000;
    var br, cap = Infinity; if (P < 5000) { br = .6; cap = 25; } else if (P < 20000) { br = .5; cap = 80; } else if (P < 90000) br = .4; else if (P < 120000) br = .5; else if (P < 150000) br = .6; else br = .7;
    var brokerBase = Math.min(P * br / 100, cap), broker = brokerBase * 1.1;
    return { rate: rate, acq: acq, edu: edu, farm: farm, relief: relief, br: br, broker: broker, brokerBase: brokerBase, heavy: heavy, notes: t.notes, total: acq - relief + edu + farm + broker };
  }
  /* 부대비용(취득세·중개보수) + 기타 비용. 계산기에서 '부대비용 포함'을 끄면 0 */
  function extra(P, c, large) { return c.costsOn ? costDetail(P, c, large).total + c.etc : 0; }
  function loanAt(P, c, dsr) {
    var a = P * c.ltv, b = capByPrice(P, c), d = dsr, L = Math.max(0, Math.min(a, b, d));
    var by = 'LTV'; if (L === b && b < a && b <= d) by = 'CAP'; if (L === d && d < a && d < b) by = 'DSR'; if (c.ltv === 0) by = 'BAN';
    return { L: L, a: a, b: b, d: d, by: by };
  }
  function need(P, c, dsr, large) { var l = loanAt(P, c, dsr), cd = costDetail(P, c, large); return { loan: l, cost: cd, need: P - l.L + extra(P, c, large) }; }
  function maxPrice(c, dsr, large) {
    if (dsr == null) dsr = dsrMax(c);
    var best = 0;
    for (var P = 1000; P <= 800000; P += 100) { if (need(P, c, dsr, large).need <= c.cash) best = P; }
    return best;
  }
  /* 지역 상관없음일 때 요약에 쓰는 대출 기준(계산기와 리포트 공통): 비규제 수도권 */
  var ANY_GROUP = 'capfree';

  /* ---------- 대출 한도 계산기(loan/): 집값이 정해졌을 때 최대 대출 ----------
     o: { price, code(시·군·구 5자리) 또는 g, own, income, debt(다른 대출 1년 원리금), rtype(var|mix|cyc|fixed), band, term, rate, lender(bank|nonbank), date }
     돌려줌: 세 한도(ltv·cap·dsr)와 가장 작은 값 L, 막는 규칙 by(LTV|CAP|DSR|BAN), 월 상환, 필요 현금, DSR 한도까지 필요한 소득 */
  function limit(o) {
    var g = o.g || R.groupOf(o.code), P = +o.price || 0;
    var c = ctx({ g: g, own: o.own, rtype: o.rtype || 'var', band: o.band, income: o.income, debt: o.debt, rate: o.rate, term: o.term, lender: o.lender, date: o.date });
    var a = P * c.ltv, b = capByPrice(P, c), ab = Math.min(a, b);
    var annF = annuity(c.rate + c.stress, c.term);
    var d = dsrMax(c), dsrOff = ab <= R.DSR.over.v && !(c.debt > 0);   // 다른 대출이 없고 이 대출이 1억 원 이하면 DSR 적용 안 함
    var dEff = dsrOff ? Infinity : d, L = Math.max(0, Math.min(ab, dEff));
    var by = c.ltv === 0 ? 'BAN' : (dEff < ab ? 'DSR' : (b < a ? 'CAP' : 'LTV'));
    /* DSR 때문에 덜 받을 때: LTV·가격대 한도(ab)까지 받으려면 필요한 연소득 */
    var incomeNeed = by === 'DSR' ? Math.ceil((ab / annF * 12 + c.debt) / c.dsrRatio) : null;
    return { g: g, c: c, price: P, ltv: c.ltv, a: a, b: b, d: d, dsrOff: dsrOff, L: L, by: by,
      stress: c.stress, dsrRate: Math.round((c.rate + c.stress) * 10000) / 10000, term: c.term,
      pay: monthly(L, c.rate, c.term), cashNeed: Math.max(0, P - L),
      incomeNeed: incomeNeed, incomeMore: incomeNeed == null ? null : Math.max(0, incomeNeed - c.income) };
  }
  /* 정책 대출 자격·예상 한도(상품 기준 최대 금액과 LTV만으로 — DTI 60% 심사는 따로)
     h: { price, g, own, income, kids(0~3), newly(혼인 7년 이내), baby(2년 안 출산·입양), dual(맞벌이), small(전용 85㎡ 이하, 모르면 null) } */
  function policyLoans(h) {
    var P = R.POLICY, out = [], price = +h.price || 0, inc = +h.income || 0, kids = +h.kids || 0, mr = h.g !== 'local';
    var why = function (ok, txt) { return { ok: ok, t: txt }; };
    var own = function (p) { return p.own.indexOf(h.own) >= 0; };
    /* 보금자리론 */
    (function () {
      var p = P.bogeum, lim = p.income.v;
      if (kids >= 2) lim = Math.max(lim, p.income.multiKid);
      if (h.newly) lim = Math.max(lim, p.income.newly[Math.min(kids, 2)]);
      var conds = [why(own(p), p.ownNote), why(price <= p.price.v, '집값 ' + p.price.v / 10000 + '억 원 이하'), why(inc <= lim || (h.newly && h.selfIncome != null && h.selfIncome <= p.income.newlyOne), '부부 합산 연소득 ' + fmtMan(lim) + ' 이하')];
      var cap = h.own === 'first' ? p.cap.first : kids >= 2 ? p.cap.multiKid : p.cap.v;
      var ltv = p.ltv.v - (h.g === 'reg' && h.own !== 'first' ? p.ltv.regMinus : 0);
      out.push(pack(p, 'bogeum', conds, cap, ltv, price));
    })();
    /* 디딤돌 */
    (function () {
      var p = P.didim, special = h.newly || kids >= 2;
      var lim = h.newly ? p.income.newly : (h.own === 'first' || kids >= 2) ? p.income.first : p.income.v;
      var pmax = special ? p.price.newlyOrTwoKid : p.price.v;
      var conds = [why(own(p), p.ownNote), why(price <= pmax, '집값 ' + pmax / 10000 + '억 원 이하'), why(inc <= lim, '부부 합산 연소득 ' + fmtMan(lim) + ' 이하'), why(h.small !== false, '전용 ' + p.area + '㎡ 이하')];
      var cap = special ? p.cap.newlyOrTwoKid : h.own === 'first' ? p.cap.first : p.cap.v;
      var ltv = h.own === 'first' ? (mr ? p.ltv.firstMetroReg : p.ltv.first) : p.ltv.v;
      out.push(pack(p, 'didim', conds, cap, ltv, price, '순자산 ' + fmtMan(p.asset) + ' 이하'));
    })();
    /* 신생아 특례 */
    (function () {
      var p = P.baby, lim = h.dual ? p.income.dual : p.income.v;
      var conds = [why(!!h.baby, p.need), why(own(p), p.ownNote), why(price <= p.price.v, '집값 ' + p.price.v / 10000 + '억 원 이하'), why(inc <= lim, '부부 합산 연소득 ' + fmtMan(lim) + ' 이하' + (h.dual ? '(맞벌이)' : '')), why(h.small !== false, '전용 ' + p.area + '㎡ 이하')];
      var ltv = h.own === 'first' ? (mr ? p.ltv.firstMetroReg : p.ltv.first) : p.ltv.v;
      out.push(pack(p, 'baby', conds, p.cap.v, ltv, price, '순자산 ' + fmtMan(p.asset) + ' 이하'));
    })();
    return out;
  }
  function pack(p, id, conds, cap, ltv, price, extraCond) {
    var ok = conds.every(function (x) { return x.ok; });
    return { id: id, name: p.name, org: p.org, ok: ok, conds: conds, cap: cap, ltv: ltv, est: Math.min(cap, Math.floor(price * ltv)), dti: p.dti, rate: p.rate || null, extra: extraCond || '', src: p.src };
  }
  function fmtMan(v) { var e = Math.floor(v / 10000), m = v % 10000; return (e ? e + '억' : '') + (m ? (e ? ' ' : '') + m.toLocaleString('ko-KR') + '만' : '') + ' 원'; }

  var api = { R: R, LTV: LTV, TYPE_RATIO: TYPE_RATIO, TYPE_RATIO_LOCAL: TYPE_RATIO_LOCAL, ETC_DEFAULT: ETC_DEFAULT, ANY_GROUP: ANY_GROUP, ctx: ctx, capByPrice: capByPrice, annuity: annuity, dsrMax: dsrMax, monthly: monthly, costDetail: costDetail, extra: extra, loanAt: loanAt, need: need, maxPrice: maxPrice, limit: limit, policyLoans: policyLoans, fmtMan: fmtMan };
  root.JDJ_LOAN = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
