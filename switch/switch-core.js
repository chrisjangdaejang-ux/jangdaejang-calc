/* 장대장 갈아타기 계산 엔진 — 브라우저 안에서만 계산 (금액 단위: 만원)
   - 양도세·취득세: tax/tax-engine.js (JDJ_TAX) 그대로 사용 (소득세법·지방세법 조문 근거는 그 파일 머리말)
   - 단지 점수·순위: assets/rec-core.js (JDJ_REC) — 내 집 마련 리포트와 같은 기준
   - 대출: 2025.10.15 대책 기준 LTV, 수도권·규제지역 주담대 가격구간 한도(15억 이하 6억, 25억 이하 4억, 초과 2억),
           DSR 40%, 스트레스 금리(수도권·규제지역 3.0%, 지방 0.75%) × 금리유형 비율
   - 중개보수: 공인중개사법 시행규칙 [별표1] 주택 매매 상한요율 + 부가세 10% */
(function (root) {
  'use strict';
  const TAX = root.JDJ_TAX || (typeof require === 'function' ? require('../tax/tax-engine.js') : null);
  const REC = root.JDJ_REC || (typeof require === 'function' ? require('../assets/rec-core.js') : null);
  const ADJ = root.JDJ_ADJ || (typeof require === 'function' ? require('../tax/adjusted-areas.js') : null);
  const W = 10000;                // 만원 → 원
  const TYPE_RATIO = { var: 1, mix: 0.8, cyc: 0.4 };

  function brokerFee(P) {
    let br, cap = Infinity;
    if (P < 5000) { br = .6; cap = 25; } else if (P < 20000) { br = .5; cap = 80; } else if (P < 90000) br = .4;
    else if (P < 120000) br = .5; else if (P < 150000) br = .6; else br = .7;
    return { rate: br, fee: Math.min(P * br / 100, cap) * 1.1 };
  }

  /** 필요경비를 비워 두면: 산 가격 기준 1주택 취득세(현행 세율, tax-engine) + 살 때 중개보수 상한 */
  function expEstimate(acq) {
    if (!acq) return { rate: 0, tax: 0, broker: 0, total: 0 };
    const t = TAX.acqTax({ price: acq * W, houses: 1 });
    const tax = t.total / W, broker = brokerFee(acq).fee;
    return { rate: t.rate, tax, broker, total: tax + broker };
  }

  /**
   * 지금 집 매도 정산
   * h: { sale, acq, exp(null이면 추정), acqDate, saleDate, residMonths, houses(1|2|3), acqAdj, saleAdj, oldLoan }
   */
  function sell(h) {
    const est = expEstimate(h.acq);
    const exp = (h.exp === null || h.exp === undefined) ? Math.round(est.total) : h.exp;
    const r = TAX.calcCGT({ acqDate: h.acqDate, acqPrice: h.acq * W, saleDate: h.saleDate, salePrice: h.sale * W, expenses: exp * W,
      residMonths: h.residMonths || 0, houses: h.houses || 1, acqAdj: h.acqAdj === true, saleAdj: h.saleAdj === true, tempTwo: null });
    const cgt = r.total / W, fee = brokerFee(h.sale);
    const net = h.sale - (h.oldLoan || 0) - cgt - fee.fee;
    return { r, cgt, fee: fee.fee, feeRate: fee.rate, exp, est, expAuto: h.exp === null || h.exp === undefined, net };
  }

  /* ---------- 새 집 대출 ---------- */
  /** g: reg | capfree | local, o: { income, debt, rate, term, rtype, houses } */
  function ctx(g, o) {
    const capital = g !== 'local', regulated = g === 'reg';
    const own = (o.houses || 1) >= 2 ? 'multi' : 'one';
    const stressBase = capital ? 3.0 : 0.75;
    return { g, capital, regulated, own, ltv: REC.LTV[g][own], stressBase,
      stress: Math.round(stressBase * TYPE_RATIO[o.rtype || 'cyc'] * 100) / 100,
      income: o.income || 0, debt: o.debt || 0, rate: o.rate || 0, term: Math.min(o.term || 30, capital ? 30 : 40) };
  }
  function capByPrice(P, c) { if (!c.capital && !c.regulated) return Infinity; if (P <= 150000) return 60000; if (P <= 250000) return 40000; return 20000; }
  function dsrMax(c, stress) {
    const room = c.income * 0.40 - c.debt; if (room <= 0) return 0;
    const i = (c.rate + (stress === undefined ? c.stress : stress)) / 1200, n = c.term * 12;
    return room / 12 * (i === 0 ? n : (1 - Math.pow(1 + i, -n)) / i);
  }
  function monthly(L, rate, term) { const i = rate / 1200, n = term * 12; if (L <= 0) return 0; return i === 0 ? L / n : L * i / (1 - Math.pow(1 + i, -n)); }
  function loanAt(P, c, dsr) {
    const a = P * c.ltv, b = capByPrice(P, c), d = dsr, L = Math.max(0, Math.min(a, b, d));
    let by = 'LTV'; if (L === b && b < a && b <= d) by = 'CAP'; if (L === d && d < a && d < b) by = 'DSR'; if (c.ltv === 0) by = 'BAN';
    return { L, a, b, d, by };
  }

  /** 새 집 취득비용: 취득세(tax-engine) + 중개보수. 1주택자는 일시적 2주택(종전 주택 처분 조건) 일반세율 */
  function buyCost(P, c, o) {
    const houses = o.houses || 1;
    const t = TAX.acqTax({ price: P * W, houses: houses === 1 ? 2 : Math.min(4, houses), adj: c.regulated, temp: houses === 1, over85: !!o.large });
    const b = brokerFee(P);
    return { rate: t.rate, acqT: t.acq / W, edu: t.edu / W, farm: t.farm / W, heavy: t.heavy, why: t.why,
      broker: b.fee, brRate: b.rate, tax: t.total / W, total: t.total / W + b.fee };
  }
  /** 이 가격의 집을 사는 데 필요한 자기자본 = 집값 − 새 대출 + 취득비용 + 이사·등기 등 기타 */
  function need(P, c, dsr, o) {
    const l = loanAt(P, c, dsr), cost = buyCost(P, c, o);
    return { loan: l, cost, need: P - l.L + cost.total + (o.etc || 0) };
  }
  function maxPrice(c, dsr, o) {
    let best = 0;
    for (let P = 1000; P <= 800000; P += 100) if (need(P, c, dsr, o).need <= o.cash) best = P;
    return best;
  }
  /** 지역 구분 3가지 각각의 매수 가능 상한 */
  function budgets(o) {
    const out = {};
    ['reg', 'capfree', 'local'].forEach(g => {
      const c = ctx(g, o), d = dsrMax(c);
      out[g] = { c, dsr: d, max: maxPrice(c, d, Object.assign({}, o, { large: false })) };
    });
    return out;
  }

  /**
   * 예산 안에서 미래가치 점수가 높은 단지 (내 집 마련 리포트 pickCandidates와 같은 기준)
   * opt: { units, inArea(code)=>bool, bands(Set|null), B(budgets 결과), o, sggPpy(code)=>평당가, note(code)=>bool,
   *        exclude(u)=>bool, max, any(bool), sidoOf(code) }
   */
  function recommend(opt) {
    const out = [];
    for (const u of opt.units) {
      const [code, dong, apt, band, area, n, series, cnt] = u;
      if (!opt.inArea(code)) continue;
      if (opt.bands && opt.bands.size && !opt.bands.has(band)) continue;
      if (!REC.lastNZ(series) || REC.recentCnt(cnt) < 1) continue;
      if (opt.exclude && opt.exclude(u)) continue;
      const g = REC.groupOf(code), b = opt.B[g]; if (!b || !b.max) continue;
      const P = REC.unitPrice(u), large = area > 85;
      const nd = need(P, b.c, b.dsr, Object.assign({}, opt.o, { large }));
      if (nd.need > opt.o.cash) continue;
      const sc = REC.scoreUnit(u, P, b.max, opt.sggPpy ? opt.sggPpy(code) : 0, opt.note ? !!opt.note(code) : false);
      if (sc.fit < REC.MIN_FIT) continue;
      out.push(Object.assign({ u, code, dong, apt, band, area, n, series, P, g, c: b.c, nd, large, left: opt.o.cash - nd.need,
        mon: monthly(nd.loan.L, b.c.rate, b.c.term), ch3: REC.change3y(series) }, sc));
    }
    out.sort(REC.rankCmp);
    return { picked: REC.diversify(out, { max: opt.max || 5, perSgg: 3, perSido: opt.any ? 3 : 0, sidoOf: opt.sidoOf }), total: out.length };
  }

  /**
   * 지금 집 유지 vs 갈아타기 (오늘 기준 한 번에 드는 돈·매달 드는 돈·순자산)
   * keep: { price, oldLoan, oldMonthly(선택), extra }, sw: { S(sell 결과), P(새 집 값), nd(need 결과), c(ctx), etc, extra }
   */
  function compare(keep, sw) {
    const keepEquity = keep.price - keep.oldLoan + keep.extra;
    const oneOff = sw.S.cgt + sw.S.fee + sw.nd.cost.total + (sw.etc || 0);
    const cashLeft = sw.S.net + sw.extra - sw.nd.need;
    const swEquity = sw.P - sw.nd.loan.L + cashLeft;
    const newMonthly = monthly(sw.nd.loan.L, sw.c.rate, sw.c.term);
    return { keepEquity, swEquity, oneOff, cashLeft, equityDiff: swEquity - keepEquity,
      keepAsset: keep.price, swAsset: sw.P, keepDebt: keep.oldLoan, swDebt: sw.nd.loan.L,
      keepMonthly: keep.oldMonthly || null, newMonthly,
      per1pctKeep: keep.price * 0.01, per1pctSw: sw.P * 0.01 };
  }

  /* ---------- 조정대상지역 판정용 이름 바꾸기 (자료 index.json 이름 → tax/adjusted-areas.js 이름) ---------- */
  function adjKey(sidoName, guName) {
    /* 반환값을 그대로 JDJ_ADJ.isAdjusted(sido, gu, 날짜)에 넣는다 */
    const sh = /^서울/.test(sidoName) ? '서울' : /^경기/.test(sidoName) ? '경기' : /^인천/.test(sidoName) ? '인천' : '그 밖의 지역';
    let gu = guName || '';
    if (sh === '경기' && ADJ && !(ADJ.AREAS['경기'][gu])) gu = /^화성시/.test(gu) ? '화성시 그 밖의 구' : '그 밖의 시·군';
    return { sido: sh, gu };
  }

  function isAdj(sidoName, guName, date) { if (!ADJ || !sidoName) return 'ask'; const k = adjKey(sidoName, guName); return ADJ.isAdjusted(k.sido, k.gu, date); }

  const API = { isAdj, brokerFee, expEstimate, sell, ctx, capByPrice, dsrMax, monthly, loanAt, buyCost, need, maxPrice, budgets, recommend, compare, adjKey, TYPE_RATIO };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_SWITCH = API;
})(typeof self !== 'undefined' ? self : this);
