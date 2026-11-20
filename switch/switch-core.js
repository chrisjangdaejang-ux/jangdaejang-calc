/* 장대장 갈아타기 계산 엔진 — 브라우저 안에서만 계산 (금액 단위: 만원)
   - 양도세·취득세: tax/tax-engine.js (JDJ_TAX) 그대로 사용 (소득세법·지방세법 조문 근거는 그 파일 머리말)
   - 단지 점수·순위: assets/rec-core.js (JDJ_REC) — 내 집 마련 리포트와 같은 기준
   - 대출 (확인일 2026-11-20): 2025.10.15 대책 LTV(규제지역 40%·비규제 70%), 수도권·규제지역 주담대 가격구간 한도
           (15억 이하 6억, 15억 초과 25억 이하 4억, 25억 초과 2억), 은행권 DSR 40% — 금융위원회 '부동산 시장 안정을 위한
           금융 종합대책'(2026.8.13)에서 '대출규제 유지'로 다시 확인. 스트레스 금리: 수도권·규제지역 3.0%(3단계, 기본 적용 100%),
           지방 1.5% × 기본 적용 50% = 0.75% — 금융위원회 행정지도에 따른 은행연합회 '2026년 하반기 스트레스 DSR 운영방안'
           (2026.7.1~12.31). 금리유형 비율: 변동형 100%, 주기형 수도권·규제지역 20~40%·지방 10~30%(각 상한을 써서 보수적으로)
   - 중개보수: 공인중개사법 시행규칙 [별표1] 주택 매매 상한요율 + 부가세 10% */
(function (root) {
  'use strict';
  const TAX = root.JDJ_TAX || (typeof require === 'function' ? require('../tax/tax-engine.js') : null);
  const REC = root.JDJ_REC || (typeof require === 'function' ? require('../assets/rec-core.js') : null);
  const ADJ = root.JDJ_ADJ || (typeof require === 'function' ? require('../tax/adjusted-areas.js') : null);
  const W = 10000;                // 만원 → 원
  const TYPE_RATIO = { var: 1, mix: 0.8, cyc: 0.4 };
  const TYPE_RATIO_LOCAL = { var: 1, mix: 0.8, cyc: 0.3 };   // 지방 주기형 10~30% 상한 (2026 하반기 운영방안)

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
      stress: Math.round(stressBase * (capital ? TYPE_RATIO : TYPE_RATIO_LOCAL)[o.rtype || 'cyc'] * 1000) / 1000,
      income: o.income || 0, debt: o.debt || 0, rate: o.rate || 0, term: Math.min(o.term || 30, capital ? 30 : 40) };
  }
  function capByPrice(P, c) { if (!c.capital && !c.regulated) return Infinity; if (P <= 150000) return 60000; if (P <= 250000) return 40000; return 20000; }
  function dsrMax(c, stress) {
    const room = c.income * 0.40 - c.debt; if (room <= 0) return 0;
    const i = (c.rate + (stress === undefined ? c.stress : stress)) / 1200, n = c.term * 12;
    return room / 12 * (i === 0 ? n : (1 - Math.pow(1 + i, -n)) / i);
  }
  /** 월 상환을 소득의 pct 까지로 할 때 빌릴 수 있는 돈(실제 금리, 다른 대출 원리금 빼고) */
  function payMax(c, pct) {
    const room = c.income * pct - c.debt; if (room <= 0) return 0;
    const i = c.rate / 1200, n = c.term * 12;
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
    /* 월 상환 부담(o.burden: 소득 대비 0.2·0.3·0.4) — 실제 금리 기준 월 상환이 그 비율을 넘지 않게. 규제 한도(LTV·가격구간·DSR)는 그대로 상한.
       o.noLoan: 대출 없이(막내 독립 뒤 집 줄이기 단계) */
    if (o.noLoan) { l.full = l.L; l.L = 0; l.by = 'NONE'; }
    else if (o.burden) { const pb = payMax(c, o.burden); if (pb < l.L) { l.full = l.L; l.L = Math.max(0, pb); l.by = 'PAY'; } }
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
      const gp = opt.sggPpy ? opt.sggPpy(code) : 0;
      const sc = REC.scoreUnit(u, P, b.max, gp, opt.note ? !!opt.note(code) : false);
      if (REC.tooCheap ? REC.tooCheap(sc.fit, P, gp ? REC.r100(gp * area / REC.PY) : 0) : sc.fit < REC.MIN_FIT) continue;
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

  /* =====================================================================
     갈아타기 루트 (가족 일정·자산/가족/안심 우선·지금 갈 수 있는 단지·조금만 더 있으면 되는 단지·미래가치)
     - 금액은 모두 오늘 시세 기준. 집값이 몇 % 오른다는 숫자는 넣지 않는다.
     - 미래가치는 공개 자료 fx(fv: 2년 점수, fh: 1·3·5·7년 점수, fvg: 같은 구 안 백분위)와 model_h.json 기간별 성적만 쓴다.
     ===================================================================== */
  const NEAR = 10000;                       // '조금만 더 있으면 되는 단지': 부족 금액 1억 이내
  const HH_STEPS = [0, 100, 300, 1000];     // 세대수 필터
  const HORIZONS = [1, 2, 3, 5, 7];

  /** 주담대 가격구간 한도 구간: 'b15'(15억 이하·6억) | 'b25'(25억 이하·4억) | 'over'(25억 초과·2억) */
  function capBand(P) { return P <= 150000 ? 'b15' : P <= 250000 ? 'b25' : 'over'; }

  /** 원리금균등: t년 상환 뒤 남은 원금 */
  function balance(L, rate, term, years) {
    if (!(L > 0)) return 0;
    const i = rate / 1200, n = term * 12, k = Math.min(n, Math.max(0, Math.round(years * 12)));
    if (i === 0) return L * (1 - k / n);
    const m = monthly(L, rate, term);
    return Math.max(0, L * Math.pow(1 + i, k) - m * (Math.pow(1 + i, k) - 1) / i);
  }

  /** 기간별 과거 성적 (narrative.js MR 과 같은 규칙): 시·도 성적(reg)이 있으면 그것, 없거나 전국 대체(fb='all')면 전국.
      ok = 평균 초과 수익(oos_avg) > 0 이고 절반 이상 맞음 (시·도 성적은 엔진이 정한 ok 그대로) */
  function validity(MH, sido) {
    const out = {};
    for (const h of HORIZONS) {
      const m = MH && MH[String(h)]; if (!m) continue;
      const r = m.reg && sido ? m.reg[sido] : null;
      if (r && r.fb !== 'all' && (r.oos_all || []).length) { out[h] = { h, n: r.oos_all.length, hit: r.hit || 0, ok: !!r.ok, where: r.name || sido }; continue; }
      const O = m.oos_all || []; if (!O.length) continue;
      const hit = m.oos_hit != null ? m.oos_hit : O.filter(o => (o.top20 || 0) > 0).length;
      out[h] = { h, n: O.length, hit, ok: O.length >= 2 && m.oos_avg > 0 && 2 * hit >= O.length, where: '전국' };
    }
    return out;
  }
  /** 단지 점수(0~100, 시·도 안 백분위) h년 — 2년은 fv, 나머지는 fh */
  const scoreAt = (f, h) => !f ? null : h === 2 ? (f.fv != null ? f.fv : null) : (f.fh && f.fh[h] != null ? f.fh[h] : null);
  /** 점수 → 말 (narrative.js lean 과 같은 구간) */
  function lean(s) {
    if (s == null) return '';
    return s >= 70 ? '평균보다 더 오를 가능성이 커요' : s >= 55 ? '평균보다 더 오를 쪽이에요' : s > 45 ? '평균과 비슷하게 움직일 쪽이에요'
      : s > 30 ? '평균보다 덜 오를 쪽이에요' : '평균보다 덜 오를 가능성이 커요';
  }
  /** 보유 예정 기간(years)에 맞는 전망: 기준을 넘은 기간 중 가장 가까운 것(같으면 긴 쪽). 없으면 가장 가까운 기간을 '참고'로
      → null 또는 { h, s(점수), ok, n, hit, text } */
  function outlook(f, V, years) {
    const hs = HORIZONS.filter(h => scoreAt(f, h) != null && V && V[h]);
    if (!hs.length) return null;
    const d = h => Math.abs(h - years) - h / 100;
    const okH = hs.filter(h => V[h].ok).sort((a, b) => d(a) - d(b));
    const h = okH.length ? okH[0] : hs.slice().sort((a, b) => d(a) - d(b))[0];
    const s = scoreAt(f, h), v = V[h];
    return { h, s, ok: !!v.ok, n: v.n, hit: v.hit, text: lean(s) };
  }
  /** 보유 예정 기간에 맞춰 볼 기간: 기준을 넘은 기간 중 가장 가까운 것(같으면 긴 쪽), 없으면 2 */
  function horizonFor(V, years) {
    const okH = HORIZONS.filter(h => V && V[h] && V[h].ok);
    if (!okH.length) return 2;
    return okH.slice().sort((a, b) => (Math.abs(a - years) - a / 100) - (Math.abs(b - years) - b / 100))[0];
  }
  /** 학군 좋은 편: 가까운 중학교가 같은 구 중학교 3곳 이상 중 순전입 상위 30% 안 (fx.sc = 학교알리미 공시 전·출입) */
  const schoolGood = f => !!(f && Array.isArray(f.sc) && f.sc[5] >= 3 && f.sc[4] >= 1 && f.sc[4] / f.sc[5] <= 0.3);
  /** 공개 시계열(월별 3개월 실거래 평당가 중앙값, 약 3년)에서 가장 크게 떨어진 폭: 앞선 최고점 대비 이후 최저점.
      값이 있는 달이 24개 미만이면 null. → { d(음수 비율, 0이면 떨어진 적 없음), hi, lo (달 순번) } */
  const DD_MIN = 24;
  function maxDrop(series) {
    let peak = 0, pi = -1, best = 0, bi = -1, bj = -1, cnt = 0;
    (series || []).forEach((v, i) => {
      if (!(v > 0)) return; cnt++;
      if (v > peak) { peak = v; pi = i; }
      const d = v / peak - 1; if (d < best) { best = d; bi = pi; bj = i; }
    });
    return cnt >= DD_MIN ? { d: best, hi: bi, lo: bj } : null;
  }
  /** 안심 우선 후보: 최근 1년 거래 12건 이상(시계열이 몇 건에 흔들리지 않게), 낙폭 계산 가능, 전세가율 80% 미만(자료 있을 때) */
  const SAFE_MIN_TRADES = 12, SAFE_JR = 0.8;
  const safeOk = x => x.n >= SAFE_MIN_TRADES && x.dd != null && !(x.jr != null && x.jr >= SAFE_JR);
  /** 점수 대(0~4: 하위 20% … 상위 20%) */
  const qOf = s => s == null ? null : Math.min(4, Math.max(0, Math.floor(s / 20)));
  /**
   * 루트 목적 세 갈래 — 같은 예산·같은 단계에서 무엇을 먼저 보느냐만 다르다.
   *  asset  자산 우선: 그 기간(기준을 넘은 기간) 미래가치 높은 순
   *  family 가족 우선: 가까운 중학교가 학군 좋은 편인 단지 안에서 미래가치 높은 순(자녀가 없으면 자산 우선과 같은 기준)
   *  safe   안심 우선: 최근 3년 가장 크게 떨어진 폭이 작은 순(0.5%p 단위) → 미래가치. 거래 적은 단지·전세가율 80% 이상 제외
   */
  const GOALS = {
    asset: { name: '자산 우선', desc: '같은 예산에서 앞으로 더 오를 가능성(과거에 맞은 기간의 점수)이 높은 단지로 가요' },
    family: { name: '가족 우선', desc: '자녀 학교 시기에 맞춰, 가까운 중학교로 전학 오는 학생이 많은 단지 안에서 미래가치가 높은 곳으로 가요' },
    safe: { name: '안심 우선', desc: '최근 3년 시세가 떨어졌을 때 덜 떨어진 단지, 전세가율이 지나치게 높지 않은 단지로 가요' }
  };
  function pickFor(list, st, cur, h, goal, kids) {
    let L = list;
    const after = st && st.key === 'after';
    if (after && cur) L = L.filter(x => x.P < cur.P);
    if (goal === 'family' && kids && !after) {
      if (cur && schoolGood(cur.f) && st && st.key !== 'now') return cur;
      L = L.filter(x => schoolGood(x.f));
    }
    if (goal === 'safe') {
      L = L.filter(safeOk);
      const r = x => Math.round(x.dd.d * 200);           // 0.5%p 단위
      return L.slice().sort((a, b) => r(b) - r(a) || ((scoreAt(b.f, h) || 0) - (scoreAt(a.f, h) || 0)) || a.need - b.need)[0] || null;
    }
    return sortList(L, 'fv', h)[0] || null;
  }
  /**
   * 지금 옮길까, 2년 뒤 다시 볼까 — 지금 집(cur)과 갈 집(x)의 2년 점수 대(qOf)를 비교하고,
   * 근거는 model_h.json 2년 q5(점수 대별 [평균 초과 %p, 회차 수, 평균보다 더 오른 회차, 단지 수])의 실제 회차 수.
   * 2년 성적이 기준을 넘지 못했으면 ok=false('참고'). → null 또는 { v:'now'|'later'|'same', ok, a(지금 집 점수), b(갈 집 점수), qa, qb, ea, eb }
   */
  function timing(curF, xF, MH, V) {
    const a = scoreAt(curF, 2), b = scoreAt(xF, 2); if (a == null || b == null) return null;
    const q5 = MH && MH['2'] && MH['2'].q5, qa = qOf(a), qb = qOf(b);
    const ea = q5 && q5[qa] ? q5[qa] : null, eb = q5 && q5[qb] ? q5[qb] : null;
    let v = 'same';
    if (qa !== qb && ea && eb && eb[0] !== ea[0]) v = eb[0] > ea[0] ? 'now' : 'later';
    return { v, ok: !!(V && V[2] && V[2].ok), a, b, qa, qb, ea, eb };
  }
  /** 같은 구 안 순위: 단지별(시군구|동|단지) 가장 높은 fvg 로 줄 세움 → { r, n } (같은 점수는 같은 등수) */
  function guRanks(units) {
    const best = new Map();
    for (const u of units || []) { const f = u && u[9]; if (!f || f.fvg == null) continue; const k = u[0] + '|' + u[1] + '|' + u[2]; if (!best.has(k) || best.get(k) < f.fvg) best.set(k, f.fvg); }
    const byGu = new Map();
    for (const [k, v] of best) { const g = k.split('|')[0]; if (!byGu.has(g)) byGu.set(g, []); byGu.get(g).push(v); }
    for (const a of byGu.values()) a.sort((x, y) => y - x);
    return function (u) {
      const k = u[0] + '|' + u[1] + '|' + u[2], v = best.get(k), a = byGu.get(u[0]); if (v == null || !a) return null;
      let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] > v) lo = m + 1; else hi = m; }
      return { r: lo + 1, n: a.length };
    };
  }

  /**
   * 예산으로 갈 수 있는 단지 전부 + 1억 이내로 모자란 단지
   * opt: { units, inArea, bands, B, o(cash 포함; burden·noLoan 선택), exclude, hhMin, cap('b15'|'b25'|'over'|''), sggPpy, note, cheap(false면 너무 싼 단지도 남김), guS(code)=>구 평당가 시계열 }
   * → { can:[...], near:[...] } 항목: { u, code, dong, apt, band, area, n, P, g, c, nd, large, need, left, short, mon, hh, f, hasFv, fv, fvg, cap, ch3, disp, sortv, score }
   */
  function scan(opt) {
    const can = [], near = [], o = opt.o, lim = opt.near == null ? NEAR : opt.near;
    for (const u of opt.units) {
      const [code, dong, apt, band, area, n, series, cnt] = u;
      if (!opt.inArea(code)) continue;
      if (opt.bands && opt.bands.size && !opt.bands.has(band)) continue;
      if (!REC.lastNZ(series) || REC.recentCnt(cnt) < 1) continue;
      if (opt.exclude && opt.exclude(u)) continue;
      const f = u[9] || null, hh = f && f.hh ? f.hh : 0;
      if (opt.hhMin && !(hh >= opt.hhMin)) continue;
      const g = REC.groupOf(code), b = opt.B[g]; if (!b) continue;
      const P = REC.unitPrice(u); if (!P) continue;
      const cap = capBand(P); if (opt.cap && cap !== opt.cap) continue;
      const large = area > 85;
      const nd = need(P, b.c, b.dsr, Object.assign({}, o, { large }));
      const mon = monthly(nd.loan.L, b.c.rate, b.c.term);
      const short = nd.need - o.cash;
      if (short > lim) continue;
      const gp = opt.sggPpy ? opt.sggPpy(code) : 0;
      const sc = REC.scoreUnit(u, P, Math.max(b.max || 0, P), gp, opt.note ? !!opt.note(code) : false);
      if (short <= 0 && opt.cheap !== false && b.max && REC.tooCheap(REC.scoreUnit(u, P, b.max, gp, false).fit, P, gp ? REC.r100(gp * area / REC.PY) : 0)) continue;
      const x = Object.assign({ u, code, dong, apt, band, area, n, series, P, g, c: b.c, nd, large, need: nd.need, left: o.cash - nd.need, short: Math.max(0, short), mon,
        hh, f, fv: f && f.fv != null ? f.fv : null, fvg: f && f.fvg != null ? f.fvg : null, cap, ch3: REC.change3y(series),
        dd: maxDrop(series), guDd: opt.guS ? maxDrop(opt.guS(code) || []) : null, jr: f && f.jr != null ? f.jr : null }, sc);
      (short <= 0 ? can : near).push(x);
    }
    return { can, near };
  }
  /** 정렬(h: 미래가치를 볼 기간, 없으면 2년): 'fv' 미래가치 높은 순 | 'cash' 필요 현금 적은 순 | 'price' 가격 높은 순 | 'short' 부족 금액 적은 순 */
  function sortList(list, key, h) {
    const sv = x => h && h !== 2 ? scoreAt(x.f, h) : x.fv;
    const fvC = (a, b) => (sv(b) != null) - (sv(a) != null) || (sv(b) || 0) - (sv(a) || 0) || (b.fv || 0) - (a.fv || 0) || (b.fvg || 0) - (a.fvg || 0) || a.need - b.need;
    const cmp = key === 'cash' ? (a, b) => a.need - b.need || fvC(a, b)
      : key === 'price' ? (a, b) => b.P - a.P || fvC(a, b)
      : key === 'short' ? (a, b) => a.short - b.short || fvC(a, b) : fvC;
    return list.slice().sort(cmp);
  }

  /** 가족 일정: 자녀 만 나이 → 학교 시기 (생일이 지났다고 보고 출생연도 = 올해 − 만 나이).
      초등 입학: 만 6세가 된 해의 다음 해 3월 (초·중등교육법 제13조 제1항) → 출생연도 + 7.
      중학교 입학 출생연도 + 13, 고등학교 + 16, 대학 + 19 (학년제 그대로, 조기·유예 입학은 반영 안 함) */
  function schedule(kids, year) {
    return (kids || []).filter(a => a != null && a >= 0 && a <= 30).map(a => {
      const by = year - a;
      return { age: a, by, elem: by + 7, mid: by + 13, high: by + 16, univ: by + 19 };
    });
  }
  /** 루트 단계(연도·이름·이유). 첫째 기준으로 학군 시기를, 막내 기준으로 독립 시기를 잡는다. 자녀가 없으면 지금 → 5년 뒤 */
  function stages(kids, year) {
    const S = schedule(kids, year), out = [{ key: 'now', year, title: '지금', why: '' }];
    if (!S.length) { out.push({ key: 'later', year: year + 5, title: '5년 뒤', why: '대출을 갚아 늘어난 자기자본으로 한 번 더 옮길 수 있는지 봐요' }); return out; }
    const first = S.slice().sort((a, b) => b.age - a.age)[0], last = S.slice().sort((a, b) => a.age - b.age)[0];
    if (first.elem > year) out[0].why = `첫째 초등학교 입학(${first.elem}년 3월) 전에 옮기면 입학 뒤 전학 없이 다닐 수 있어요`;
    else if (first.mid - 1 === year) out[0].why = '첫째가 6학년이라 중학교 배정 전 마지막 이사 시기예요';
    else if (first.mid - 1 < year && first.high + 2 >= year) out[0].why = '첫째가 중·고등학생이라 졸업 전 이사는 전학이 따라요. 옮긴다면 학년이 바뀌는 때가 좋아요';
    const midY = first.mid - 1;                                  // 6학년 해: 중학교는 보통 이때 사는 곳 기준으로 배정
    if (midY > year) out.push({ key: 'school', year: midY, title: `${midY}년 · 중학교 배정 전`, why: `첫째가 6학년이 되는 해예요. 중학교는 보통 6학년 때 사는 주소를 기준으로 배정돼요(기준일은 교육청마다 달라요)` });
    const outY = last.univ;
    if (outY > year && outY > (out[out.length - 1].year)) out.push({ key: 'after', year: outY, title: `${outY}년 · 막내 대학 진학 뒤`, why: '학군이 더는 필요 없는 때예요. 대출 없이 살 수 있는 집으로 줄이면 현금을 마련할 수 있어요' });
    return out;
  }
  /**
   * 루트 계산 — 금액은 오늘 시세 그대로(집값 변화 0)로 이어 계산하고, 단계 사이 집값 흐름은 outlook(기준을 넘은 기간 점수)으로 말로만.
   * a: { goal:'asset'|'family'|'safe', kids(bool), year, stages, cash(지금 쓸 수 있는 자기자본), save(한 해 모을 돈), o(대출 조건, burden 포함),
   *      pick(o, st, cur, h, goal) => 후보 or null (보통 scan → pickFor) (o.cash = 그 단계에 쓸 수 있는 자기자본), V(validity) }
   * → [{ st, x(고른 단지)|null, stay(그대로 삶), pool(그 단계 자기자본), sale(이전 집 정산)|null, cur(그대로 사는 집), out(전망), left(매수 뒤 현금) }]
   */
  function route(a) {
    const res = [];
    let cash = a.cash, cashY = a.year, cur = null, curY = a.year;
    a.stages.forEach((st, i) => {
      const nextY = a.stages[i + 1] ? a.stages[i + 1].year : st.year + 5;
      const liquid = cash + (i > 0 ? (a.save || 0) * Math.max(0, st.year - cashY) : 0);
      let sale = null, pool = liquid;
      if (cur) {
        const t = st.year - curY, bal = balance(cur.nd.loan.L, cur.c.rate, cur.c.term, t);
        const S = sell({ sale: cur.P, acq: cur.P, exp: Math.round(cur.nd.cost.total), acqDate: curY + '-03-01', saleDate: st.year + '-03-01',
          residMonths: t * 12, houses: 1, acqAdj: !!cur.c.regulated, saleAdj: !!cur.c.regulated, oldLoan: bal });
        sale = { P: cur.P, bal, cgt: S.cgt, fee: S.fee, net: S.net, paid: cur.nd.loan.L - bal, years: t };
        pool = liquid + S.net;
      }
      const after = st.key === 'after';
      const o = Object.assign({}, a.o, { cash: Math.max(0, pool), noLoan: after });
      const x = a.pick(o, st, cur, horizonFor(a.V, nextY - st.year), a.goal);
      if (!x || (cur && x.u === cur.u)) {
        res.push({ st, x: null, stay: !!cur, pool, sale, cur, out: cur && cur.f ? outlook(cur.f, a.V, nextY - st.year) : null });
        cash = liquid; cashY = st.year;
        return;
      }
      res.push({ st, x, stay: false, pool, sale, out: x.f ? outlook(x.f, a.V, nextY - st.year) : null, left: pool - x.need });
      cash = pool - x.need; cashY = st.year; cur = x; curY = st.year;
    });
    return res;
  }

  const API = { isAdj, brokerFee, expEstimate, sell, ctx, capByPrice, dsrMax, monthly, loanAt, buyCost, need, maxPrice, budgets, recommend, compare, adjKey, TYPE_RATIO, TYPE_RATIO_LOCAL,
    NEAR, HH_STEPS, HORIZONS, capBand, balance, validity, scoreAt, lean, outlook, guRanks, scan, sortList, schedule, stages, GOALS, route, horizonFor, schoolGood, pickFor, payMax, maxDrop, safeOk, qOf, timing, SAFE_MIN_TRADES, SAFE_JR, DD_MIN };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_SWITCH = API;
})(typeof self !== 'undefined' ? self : this);
