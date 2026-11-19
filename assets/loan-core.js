/* 장대장 대출·최대 매수액 공용 계산 — 내 집 마련 계산기(buy/)와 맞춤 매수 리포트(buy/report/)가 같은 함수를 씁니다.
   2026.11 기준: 규제지역(서울 전역+경기 15곳)·비규제 수도권·지방 비규제 3구분, 스트레스 DSR 3단계, 가격구간별 주담대 한도.
   금액 단위: 만원 */
(function (root) {
  'use strict';
  var LTV = { reg: { none: .40, first: .70, one: .40, multi: 0 }, capfree: { none: .70, first: .70, one: .70, multi: 0 }, local: { none: .70, first: .80, one: .70, multi: .60 } };
  var TYPE_RATIO = { var: 1, mix: .8, cyc: .4 };
  var ETC_DEFAULT = 1000;   // 기타 비용(이사·등기·수리) 기본 가정 — 계산기와 리포트 공통

  /* g: 'reg' | 'capfree' | 'local' */
  function ctx(o) {
    var g = o.g, capital = g !== 'local', regulated = g === 'reg';
    var stressBase = capital ? 3.0 : 0.75, maxTerm = capital ? 30 : 40;
    var own = o.own || 'none', rtype = o.rtype || 'cyc';
    return {
      g: g, capital: capital, regulated: regulated, own: own, rtype: rtype,
      ltv: LTV[g][own], stressBase: stressBase, stress: Math.round(stressBase * TYPE_RATIO[rtype] * 100) / 100,
      income: +o.income || 0, cash: +o.cash || 0, debt: +o.debt || 0, rate: o.rate == null ? 4 : +o.rate,
      term: Math.min(o.term || 30, maxTerm),
      etc: o.etc == null ? ETC_DEFAULT : +o.etc, costsOn: o.costsOn !== false, large: !!o.large
    };
  }
  function capByPrice(P, c) { if (!c.capital && !c.regulated) return Infinity; if (P <= 150000) return 60000; if (P <= 250000) return 40000; return 20000; }
  function dsrMax(c, stress, rate, term) {
    var room = c.income * 0.40 - c.debt; if (room <= 0) return 0;
    var i = ((rate == null ? c.rate : rate) + (stress == null ? c.stress : stress)) / 1200, n = (term == null ? c.term : term) * 12;
    return room / 12 * (i === 0 ? n : (1 - Math.pow(1 + i, -n)) / i);
  }
  function monthly(L, rate, term) { var i = rate / 1200, n = term * 12; if (L <= 0) return 0; return i === 0 ? L / n : L * i / (1 - Math.pow(1 + i, -n)); }
  function costDetail(P, c, large) {
    if (large == null) large = c.large;
    var rate, heavy = false;
    if (c.own === 'multi') { rate = c.regulated ? 12 : 8; heavy = true; }
    else if (P <= 60000) rate = 1; else if (P <= 90000) rate = Math.round(((P / 10000) * 2 / 3 - 3) * 100) / 100; else rate = 3;
    var acq = P * rate / 100, edu = heavy ? P * 0.4 / 100 : acq * 0.1;
    var farm = 0; if (large) farm = heavy ? P * (rate === 12 ? 1.0 : 0.6) / 100 : P * 0.2 / 100;
    var relief = 0; if (c.own === 'first' && P <= 120000) relief = Math.min(acq, 200);
    var br, cap = Infinity; if (P < 5000) { br = .6; cap = 25; } else if (P < 20000) { br = .5; cap = 80; } else if (P < 90000) br = .4; else if (P < 120000) br = .5; else if (P < 150000) br = .6; else br = .7;
    var brokerBase = Math.min(P * br / 100, cap), broker = brokerBase * 1.1;
    return { rate: rate, acq: acq, edu: edu, farm: farm, relief: relief, br: br, broker: broker, brokerBase: brokerBase, heavy: heavy, total: acq - relief + edu + farm + broker };
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

  var api = { LTV: LTV, TYPE_RATIO: TYPE_RATIO, ETC_DEFAULT: ETC_DEFAULT, ANY_GROUP: ANY_GROUP, ctx: ctx, capByPrice: capByPrice, dsrMax: dsrMax, monthly: monthly, costDetail: costDetail, extra: extra, loanAt: loanAt, need: need, maxPrice: maxPrice };
  root.JDJ_LOAN = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
