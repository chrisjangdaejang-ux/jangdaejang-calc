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
      dsrRatio: o.lender === 'nonbank' ? R.DSR.nonbank.v : R.DSR.bank.v, dtiRatio: R.dtiOf(g),
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
  /* DTI 한도(수도권·규제지역): 실제 금리(스트레스 없음), 다른 대출 1년 원리금을 빼고. 지방은 규칙을 넣지 않아 제한 없음 */
  function dtiMax(c) {
    var r = c.dtiRatio === undefined ? R.dtiOf(c.g) : c.dtiRatio; if (r == null) return Infinity;
    return Math.max(0, c.income * r - c.debt) / 12 * annuity(c.rate, c.term);
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
  /* 집값 P일 때 최대 대출 — 대출 한도 계산기(loan/)·내 집 마련(buy/)·리포트·갈아타기(switch/)가 모두 이 함수 하나로 계산해요.
     LTV·가격대별 최대(ab), DSR(d, 다른 대출이 없고 ab가 1억 원 이하면 따지지 않음), DTI(dti) 중 가장 작은 금액 */
  function loanAt(P, c, dsr) {
    if (dsr == null) dsr = dsrMax(c);
    var a = P * c.ltv, b = capByPrice(P, c), ab = Math.min(a, b), d = dsr;
    var dsrOff = ab <= R.DSR.over.v && !(c.debt > 0), dEff = dsrOff ? Infinity : d, dti = dtiMax(c);
    var L = Math.max(0, Math.min(ab, dEff, dti));
    var by = c.ltv === 0 ? 'BAN' : (dti < Math.min(ab, dEff) ? 'DTI' : dEff < ab ? 'DSR' : (b < a ? 'CAP' : 'LTV'));
    return { L: L, a: a, b: b, d: d, dti: dti, dsrOff: dsrOff, by: by };
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
    var annF = annuity(c.rate + c.stress, c.term);
    var la = loanAt(P, c), a = la.a, b = la.b, ab = Math.min(a, b), d = la.d, dsrOff = la.dsrOff, dti = la.dti, L = la.L, by = la.by, dtiR = c.dtiRatio;
    /* 소득 규칙(DSR·DTI) 때문에 덜 받을 때: LTV·가격대 한도(ab)까지 받으려면 필요한 연소득(두 규칙을 모두 넘는 소득) */
    var needDsr = dsrOff ? 0 : (ab / annF * 12 + c.debt) / c.dsrRatio, needDti = dtiR == null ? 0 : (ab / annuity(c.rate, c.term) * 12 + c.debt) / dtiR;
    var incomeNeed = by === 'DSR' || by === 'DTI' ? Math.ceil(Math.max(needDsr, needDti)) : null;
    /* 소득 기준(DSR)으로 1억 원 아래로 줄었는데 다른 대출이 없으면: 모든 대출이 1억 원 이하일 때는 DSR을 따지지 않아 1억 원까지는 받을 수도 있음(은행 자체 심사) — 금액은 바꾸지 않고 안내만 */
    var under1 = by === 'DSR' && !(c.debt > 0) && L < R.DSR.over.v;
    return { g: g, c: c, price: P, ltv: c.ltv, a: a, b: b, d: d, dti: dti, dtiRatio: dtiR, dsrOff: dsrOff, under1: under1, L: L, by: by,
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
      /* 규제지역 10%p 차감은 생애최초·실수요자(무주택·6억 이하·부부 합산 7,000만 이하)에는 하지 않음(한국주택금융공사 상품 안내) */
      var real = h.own === 'first' || (h.own === 'none' && price <= p.real.price && inc <= p.real.income);
      var minus = h.g === 'reg' && !real;
      var ltv = p.ltv.v - (minus ? p.ltv.regMinus : 0);
      out.push(pack(p, 'bogeum', conds, cap, ltv, price, '', Math.round((p.dti - (minus ? p.dtiRegMinus : 0)) * 100) / 100));
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
  function pack(p, id, conds, cap, ltv, price, extraCond, dti) {
    var ok = conds.every(function (x) { return x.ok; });
    return { id: id, name: p.name, org: p.org, ok: ok, conds: conds, cap: cap, ltv: ltv, est: Math.min(cap, Math.floor(price * ltv)), dti: dti == null ? p.dti : dti, rate: p.rate || null, extra: extraCond || '', src: p.src };
  }
  function fmtMan(v) { var e = Math.floor(v / 10000), m = v % 10000; return (e ? e + '억' : '') + (m ? (e ? ' ' : '') + m.toLocaleString('ko-KR') + '만' : '') + ' 원'; }

  var api = { R: R, LTV: LTV, TYPE_RATIO: TYPE_RATIO, TYPE_RATIO_LOCAL: TYPE_RATIO_LOCAL, ETC_DEFAULT: ETC_DEFAULT, ANY_GROUP: ANY_GROUP, ctx: ctx, capByPrice: capByPrice, annuity: annuity, dsrMax: dsrMax, dtiMax: dtiMax, monthly: monthly, costDetail: costDetail, extra: extra, loanAt: loanAt, need: need, maxPrice: maxPrice, limit: limit, policyLoans: policyLoans, fmtMan: fmtMan };
  root.JDJ_LOAN = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
