/* 장대장 부동산 세금 계산 엔진 (양도소득세 · 취득세)  — 브라우저 안에서만 계산, 서버 전송 없음
   ───────────────────────────────────────────────────────────────────────────
   기준: 2026년 11월 17일 현재 시행 법령 (확인일 2026-11-17)

   [양도소득세] 소득세법 (법률), 소득세법 시행령 (대통령령)
   - 기본세율: 소득세법 제55조 제1항 (2023.1.1 이후 양도분 구간: 1,400만/5,000만/8,800만/1.5억/3억/5억/10억)
       6% / 15%(누진공제 126만) / 24%(576만) / 35%(1,544만) / 38%(1,994만) / 40%(2,594만) / 42%(3,594만) / 45%(6,594만)
   - 주택 단기 양도: 제104조 제1항 제2호·제3호 — 보유 1년 미만 70%, 1년 이상 2년 미만 60% (2021.6.1 이후 양도분)
   - 다주택 중과: 제104조 제7항 — 조정대상지역 주택, 1세대 2주택 기본세율+20%p, 3주택 이상 +30%p.
       단기세율과 비교해 큰 세액(같은 항 단서). 중과 대상은 장기보유특별공제 배제(제95조 제2항 단서).
       한시 배제(유예)는 2022.5.10~2026.5.9 양도분까지였고 연장 없이 종료
       (소득세법 시행령 제167조의10·제167조의11, 대통령령 제36129호 2026.3.1 시행 / 2026.4.23 공포 개정령의
        경과규정: 2026.5.9까지 계약·토지거래허가 신청분은 2026.9.9 또는 2026.11.9까지 양도 시 배제 — 두 기한 모두 지남).
   - 1세대1주택 비과세: 제89조 제1항 제3호, 시행령 제154조 — 2년 이상 보유, 취득 당시 조정대상지역이면 2년 이상 거주
       (2017.8.3 이후 취득분). 보유기간은 취득일부터 기산(최종 1주택 재기산 규정은 시행령 제154조 제5항 단서 삭제,
       2022.5.10 이후 양도분부터 폐지 — 대통령령 제32654호 2022.5.31).
   - 고가주택: 제89조 제1항 제3호, 시행령 제156조 — 양도가액 12억 원 초과분만 과세
       과세 양도차익 = 양도차익 × (양도가액 − 12억) ÷ 양도가액 (시행령 제160조)
   - 일시적 2주택: 시행령 제155조 제1항 — 종전주택 취득 후 1년 이상 지나 신규주택 취득, 신규주택 취득일부터 3년 이내 종전주택 양도.
       2026.10.1 시행 개정 시행령(국무회의 2026.9.29 의결): 조정대상지역 종전주택 보유 중 조정대상지역 신규주택을
       2026.8.4 이후 취득한 경우 2026.10.1 이후 양도분은 2년 이내 (2026.8.3 이전 취득·계약금 지급분은 3년 유지).
   - 장기보유특별공제: 제95조 제2항 표1(보유 3년 이상 연 2%, 15년 이상 30%),
       표2(1세대1주택·2년 이상 거주: 보유 연 4% 최대 40% + 거주 연 4% 최대 40%, 거주 2~3년은 보유 3년 이상일 때 8%)
   - 기본공제 연 250만 원: 제103조. 같은 해 둘 이상 양도 시 비교과세: 제104조 제5항.
   - 지방소득세(양도소득분): 지방세법 제103조의3 — 양도소득 과세표준 × 국세 세율의 10분의 1.
   - 2026 세제개편 정부안(2027년 중과 +5·10%p 완화, 2028년 장기보유특별공제 거주 중심 개편 등)은
       2026.11 현재 국회 심의 중이라 반영하지 않음.

   [취득세] 지방세법 제11조 제1항 제8호(주택 유상거래 1~3%), 제13조의2(다주택 중과 8%·12%),
       지방세법 제151조(지방교육세), 농어촌특별세법 제5조(전용 85㎡ 초과 주택). 일시적 2주택: 지방세법 시행령 제28조의5(3년). */
(function (root) {
  'use strict';
  const EOK = 100000000;          // 1억
  const HIGH_PRICE = 12 * EOK;    // 고가주택 기준 12억
  const BASIC_DED = 2500000;      // 기본공제 250만
  const GRACE_FROM = '2022-05-10', GRACE_TO = '2026-05-09';  // 중과 한시 배제 기간(종료)
  const BRACKETS = [ // [상한, 세율, 누진공제]
    [14000000, 0.06, 0], [50000000, 0.15, 1260000], [88000000, 0.24, 5760000], [150000000, 0.35, 15440000],
    [300000000, 0.38, 19940000], [500000000, 0.40, 25940000], [1000000000, 0.42, 35940000], [Infinity, 0.45, 65940000]
  ];

  /* ---------- 날짜 ---------- */
  const pad = n => String(n).padStart(2, '0');
  const toStr = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; };
  const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  function addMonths(s, n) {
    const { y, m, d } = parse(s);
    const t = (y * 12 + (m - 1)) + n, ny = Math.floor(t / 12), nm = t % 12 + 1;
    return ny + '-' + pad(nm) + '-' + pad(Math.min(d, lastDay(ny, nm)));
  }
  const addYears = (s, n) => addMonths(s, n * 12);
  const addDays = (s, n) => { const { y, m, d } = parse(s); return toStr(new Date(Date.UTC(y, m - 1, d + n))); };
  /** 만 기간(년): 취득일의 응당일이 양도일 이전이거나 같으면 1년 (보유기간 취득일~양도일, 소득세법 제95조 제4항) */
  function fullYears(a, b) { let n = 0; while (addYears(a, n + 1) <= b) n++; return n; }
  function fullMonths(a, b) { let n = 0; if (b < a) return 0; while (addMonths(a, n + 1) <= b) n++; return n; }
  const todayStr = () => { const t = new Date(); return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()); };

  /* ---------- 세율 ---------- */
  function basicTax(base, addPt) {
    if (base <= 0) return 0;
    for (const [cap, r, ded] of BRACKETS) if (base <= cap) return base * (r + (addPt || 0)) - ded;
    return 0;
  }
  function bracketRate(base) { for (const [cap, r] of BRACKETS) if (base <= cap) return r; return 0.45; }
  /** 자산 하나의 산출세액 (세율 종류에 따라) */
  function taxBy(kind, heavy, base) {
    if (base <= 0) return 0;
    const heavyTax = basicTax(base, heavy);
    if (kind === 'short70') return Math.max(base * 0.70, heavy ? heavyTax : 0);
    if (kind === 'short60') return Math.max(base * 0.60, heavy ? heavyTax : 0);
    return heavyTax;
  }
  const won = v => Math.floor(v + 1e-6);   // 원 미만 버림 (부동소수 오차 보정)
  const man = v => { const w = Math.round(Math.abs(v) / 10000), e = Math.floor(w / 10000), m = w % 10000;
    return (e ? e.toLocaleString('ko-KR') + '억' + (m ? ' ' : '') : '') + (m || !e ? m.toLocaleString('ko-KR') + '만' : '') + ' 원'; };

  /* ---------- 일시적 2주택 ---------- */
  function tempTwoDeadline(oldAcq, oldAdjAtNewAcq, newAcq, newAdj) {
    // 2026.10.1 이후 양도 + 조정→조정 + 신규 2026.8.4 이후 취득 → 2년, 그 밖 3년
    const short = oldAdjAtNewAcq === true && newAdj === true && newAcq >= '2026-08-04';
    const years = short ? 2 : 3;
    let end = addDays(addYears(newAcq, years), 0);
    return { years, end, shortRule: short, before1y: newAcq < addYears(oldAcq, 1) };
  }

  /**
   * 양도소득세 1건 계산
   * p: { acqDate, acqPrice, saleDate, salePrice, expenses, residMonths, houses(1|2|3), acqAdj(bool), saleAdj(bool),
   *      tempTwo: null | { newAcqDate, newAdj(bool), oldAdjAtNewAcq(bool) }, noBasicDed(bool) }
   */
  function calcCGT(p) {
    const R = { reasons: [], notes: [], exempt: 'none', heavy: 0, kind: 'basic', ltdRate: 0, ltdTable: 0 };
    const gain = p.salePrice - p.acqPrice - (p.expenses || 0);
    const holdY = fullYears(p.acqDate, p.saleDate);
    const residM = Math.max(0, Math.floor(p.residMonths || 0)), residY = Math.floor(residM / 12);
    Object.assign(R, { gain, holdY, residY, residM });
    if (p.saleDate < '2023-01-12') R.notes.push('2023년 1월 12일 이전 양도분은 일시적 2주택 기한 등 당시 규정이 달라 이 계산과 다를 수 있습니다.');

    // 1) 1세대1주택(또는 일시적 2주택 종전주택) 비과세 요건
    let oneHouse = p.houses === 1, tt = null;
    if (!oneHouse && p.houses === 2 && p.tempTwo && p.tempTwo.newAcqDate) {
      tt = tempTwoDeadline(p.acqDate, p.tempTwo.oldAdjAtNewAcq, p.tempTwo.newAcqDate, p.tempTwo.newAdj);
      R.tempTwo = tt;
      if (tt.before1y) R.reasons.push('일시적 2주택 특례 불가: 새 집을 종전 집 취득 후 1년이 지나기 전에 취득했습니다 (시행령 제155조 제1항).');
      else if (p.saleDate > tt.end) R.reasons.push('일시적 2주택 특례 불가: 새 집 취득일부터 ' + tt.years + '년(' + tt.end + '까지) 안에 팔아야 합니다.');
      else { oneHouse = true; R.reasons.push('일시적 2주택: 새 집 취득일부터 ' + tt.years + '년 안(' + tt.end + '까지)에 종전 집을 팔면 1주택처럼 비과세 판정을 받습니다' + (tt.shortRule ? ' (조정대상지역끼리 2026.8.4 이후 취득분이라 2년 적용).' : '.')); }
    }
    let exemptOK = false;
    if (oneHouse) {
      const needResid = p.acqAdj === true && p.acqDate >= '2017-08-03';
      const holdOK = holdY >= 2, residOK = !needResid || residM >= 24;
      exemptOK = holdOK && residOK;
      if (!holdOK) R.reasons.push('비과세 요건 미충족: 2년 이상 보유해야 합니다 (현재 계산상 보유 ' + holdY + '년).');
      if (needResid && !residOK) R.reasons.push('비과세 요건 미충족: 취득 당시 조정대상지역이라 2년 이상 거주해야 합니다 (거주 ' + residM + '개월).');
      if (exemptOK) R.reasons.push('1세대1주택 비과세 요건 충족: 보유 ' + holdY + '년' + (needResid ? ', 거주 ' + residY + '년 (취득 당시 조정대상지역이라 거주 요건 적용)' : ' (취득 당시 비조정대상지역이라 거주 요건 없음)') + '.');
    }
    R.exemptOK = exemptOK;

    if (gain <= 0) { R.reasons.push('양도차익이 없어 낼 세금이 없습니다.'); return finish(R, 0, 0, 0, 0, p); }
    let taxable = gain;
    if (exemptOK) {
      if (p.salePrice <= HIGH_PRICE) { R.exempt = 'full'; R.reasons.push('양도가액 12억 원 이하라 전액 비과세입니다.'); return finish(R, 0, 0, 0, 0, p); }
      R.exempt = 'partial';
      taxable = won(gain * (p.salePrice - HIGH_PRICE) / p.salePrice);
      R.reasons.push('양도가액이 12억 원을 넘는 고가주택이라 12억 초과 비율(' + ((p.salePrice - HIGH_PRICE) / p.salePrice * 100).toFixed(2) + '%)만큼만 과세합니다.');
    }

    // 2) 중과 판정 (양도일 기준 조정대상지역)
    if (!exemptOK && p.houses >= 2 && p.saleAdj === true) {
      if (p.saleDate >= GRACE_FROM && p.saleDate <= GRACE_TO) R.reasons.push('다주택 중과 한시 배제 기간(2022.5.10~2026.5.9) 양도분이라 중과하지 않습니다.');
      else if (p.saleDate >= '2018-04-01') { R.heavy = p.houses >= 3 ? 0.30 : 0.20; R.reasons.push('양도일에 조정대상지역이고 ' + (p.houses >= 3 ? '3주택 이상' : '2주택') + '이라 기본세율에 ' + (R.heavy * 100) + '%p를 더합니다 (소득세법 제104조 제7항, 2026.5.10 이후 양도분 중과 재개).'); }
    } else if (!exemptOK && p.houses >= 2) R.reasons.push('양도일에 조정대상지역이 아니어서 다주택이어도 중과하지 않습니다.');

    // 3) 장기보유특별공제
    if (R.heavy > 0) R.reasons.push('중과 대상이라 장기보유특별공제를 받을 수 없습니다.');
    else if (holdY < 3) R.reasons.push('보유 3년 미만이라 장기보유특별공제가 없습니다.');
    else if (exemptOK && residY >= 2) {
      const hold = Math.min(holdY, 10) * 0.04;
      const res = residY >= 3 ? Math.min(residY, 10) * 0.04 : 0.08;
      R.ltdRate = Math.round((hold + res) * 100) / 100; R.ltdTable = 2; R.ltdHold = hold; R.ltdResid = res;
      R.reasons.push('장기보유특별공제 표2(1세대1주택): 보유 ' + holdY + '년 ' + Math.round(hold * 100) + '% + 거주 ' + residY + '년 ' + Math.round(res * 100) + '% = ' + Math.round(R.ltdRate * 100) + '%.');
    } else {
      R.ltdRate = Math.round(Math.min(holdY, 15) * 0.02 * 100) / 100; R.ltdTable = 1;
      R.reasons.push('장기보유특별공제 표1(일반): 보유 ' + holdY + '년 ' + Math.round(R.ltdRate * 100) + '%' + (exemptOK ? ' (거주 2년 미만이라 표2를 쓰지 못합니다)' : '') + '.');
    }
    const ltd = won(taxable * R.ltdRate);
    const income = taxable - ltd;
    const base = Math.max(0, income - (p.noBasicDed ? 0 : BASIC_DED));

    // 4) 세율
    R.kind = holdY < 1 ? 'short70' : holdY < 2 ? 'short60' : 'basic';
    if (R.kind === 'short70') R.reasons.push('보유 1년 미만 주택이라 70% 단일세율' + (R.heavy ? '과 중과세율 중 큰 세액' : '') + '을 적용합니다.');
    if (R.kind === 'short60') R.reasons.push('보유 1년 이상 2년 미만 주택이라 60% 단일세율' + (R.heavy ? '과 중과세율 중 큰 세액' : '') + '을 적용합니다.');
    const tax = won(taxBy(R.kind, R.heavy, base));
    return finish(R, taxable, ltd, income, base, p, tax);
  }
  function finish(R, taxable, ltd, income, base, p, tax) {
    tax = tax || 0;
    const local = won(tax * 0.1);
    Object.assign(R, { taxableGain: taxable, ltd, income, base, tax, local, total: tax + local });
    R.rateText = !base ? '-' : R.kind === 'short70' ? '70%' + (R.heavy ? ' 또는 중과' : '') : R.kind === 'short60' ? '60%' + (R.heavy ? ' 또는 중과' : '')
      : Math.round(bracketRate(base) * 100) + '%' + (R.heavy ? ' + ' + R.heavy * 100 + '%p' : '');
    return R;
  }

  /* ---------- 매도 시점 타임라인 ---------- */
  /**
   * h: { acqDate, acqPrice, price(현재 시세), expenses, residMonths(오늘까지), living(bool), houses, acqAdj, adjAt(date)=>bool,
   *      tempTwo }, opt: { today, months, growth(연 %) }
   */
  function scenario(h, date, opt) {
    const yrs = Math.max(0, fullMonths(opt.today, date)) / 12;
    const price = Math.round(h.price * Math.pow(1 + (opt.growth || 0) / 100, yrs) / 10000) * 10000;
    const resid = (h.residMonths || 0) + (h.living ? fullMonths(opt.today, date) : 0);
    return calcCGT({ acqDate: h.acqDate, acqPrice: h.acqPrice, saleDate: date, salePrice: price, expenses: h.expenses,
      residMonths: resid, houses: h.houses, acqAdj: h.acqAdj, saleAdj: h.adjAt(date), tempTwo: h.tempTwo });
  }
  function timeline(h, opt) {
    const months = opt.months || 60, points = [];
    for (let m = 0; m <= months; m++) {
      const d = addMonths(opt.today, m), r = scenario(h, d, opt);
      points.push({ m, date: d, total: r.total, r });
    }
    const end = addMonths(opt.today, months);
    // 세금이 바뀌는 정확한 날(응당일)을 찾는다
    const cands = new Set();
    for (let n = 1; n <= 16; n++) cands.add(addYears(h.acqDate, n));
    if (h.living) for (let k = 1; k <= 11; k++) { const need = k * 12 - (h.residMonths || 0); if (need > 0) cands.add(addMonths(opt.today, need)); }
    if (h.tempTwo && h.tempTwo.newAcqDate) { const t = tempTwoDeadline(h.acqDate, h.tempTwo.oldAdjAtNewAcq, h.tempTwo.newAcqDate, h.tempTwo.newAdj); cands.add(addDays(t.end, 1)); }
    const events = [];
    [...cands].filter(d => d > opt.today && d <= end).sort().forEach(d => {
      const before = scenario(h, addDays(d, -1), opt), after = scenario(h, d, opt);
      const label = describeChange(before, after, h);
      if (label) events.push({ date: d, label, before: before.total, after: after.total, good: after.total <= before.total });
    });
    let best = points[0];
    points.forEach(p => { if (p.total < best.total) best = p; });
    events.forEach(e => { if (e.after < best.total) best = { m: fullMonths(opt.today, e.date), date: e.date, total: e.after, r: scenario(h, e.date, opt) }; });
    return { points, events, best, now: points[0] };
  }
  function describeChange(a, b, h) {
    const out = [];
    if (a.exemptOK !== b.exemptOK) out.push(b.exemptOK ? '1세대1주택 비과세 요건 충족' : (h.tempTwo ? '일시적 2주택 처분 기한 지남 (비과세 불가)' : '비과세 요건 상실'));
    if (a.kind !== b.kind) out.push(b.kind === 'short60' ? '보유 1년: 단기세율 70% → 60%' : b.kind === 'basic' ? '보유 2년: 단기세율 끝, 기본세율 적용' : '');
    if (a.ltdRate !== b.ltdRate && b.ltdRate > 0) out.push('장기보유특별공제 ' + Math.round(a.ltdRate * 100) + '% → ' + Math.round(b.ltdRate * 100) + '%');
    if (!out.length && a.total !== b.total && Math.abs(a.total - b.total) > 100000) out.push('세액 변동');
    return out.filter(Boolean).join(' · ');
  }

  /* ---------- 다주택 매도 순서 비교 ---------- */
  function permutations(arr) {
    if (arr.length <= 1) return [arr.slice()];
    const out = [];
    arr.forEach((x, i) => permutations(arr.slice(0, i).concat(arr.slice(i + 1))).forEach(p => out.push([x].concat(p))));
    return out;
  }
  /** 같은 해 여러 건: 기본공제 1회(먼저 판 자산부터), 비교과세(제104조 제5항) */
  function combineYear(items) {
    const taxedItems = items.filter(it => it.r.income > 0);
    let dedLeft = BASIC_DED;
    taxedItems.forEach(it => { const d = Math.min(dedLeft, it.r.income); dedLeft -= d; it.base = it.r.income - d; it.tax = won(taxBy(it.r.kind, it.r.heavy, it.base)); });
    items.filter(it => !(it.r.income > 0)).forEach(it => { it.base = 0; it.tax = 0; });
    const sum = taxedItems.reduce((s, it) => s + it.tax, 0);
    let yearTax = sum, compared = false;
    if (taxedItems.length >= 2) {
      const all = won(basicTax(taxedItems.reduce((s, it) => s + it.base, 0), 0));
      if (all > sum) { yearTax = all; compared = true; }
    }
    return { tax: yearTax, local: won(yearTax * 0.1), compared };
  }
  /**
   * houses: [{ id, name, acqDate, acqPrice, price, expenses, residMonths, living, acqAdj, adjAt(date) }]
   * opt: { today, start, interval(개월), growth }
   */
  function compareOrders(houses, opt) {
    const results = permutations(houses.map((_, i) => i)).map(order => {
      const sales = order.map((idx, i) => {
        const h = houses[idx], date = addMonths(opt.start, i * (opt.interval || 0));
        const remain = order.slice(i).map(j => houses[j]);
        let tempTwo = null;
        if (remain.length === 2) {
          const other = remain[1];
          if (other.acqDate > h.acqDate) tempTwo = { newAcqDate: other.acqDate, newAdj: other.adjAt(other.acqDate) === true, oldAdjAtNewAcq: h.adjAt(other.acqDate) === true };
        }
        const r = scenario(Object.assign({}, h, { houses: remain.length >= 3 ? 3 : remain.length, tempTwo }), date, opt);
        return { idx, name: h.name, date, r, remain: remain.length };
      });
      const byYear = {};
      sales.forEach(s => { (byYear[s.date.slice(0, 4)] = byYear[s.date.slice(0, 4)] || []).push(s); });
      let total = 0, compared = false;
      Object.values(byYear).forEach(list => { const y = combineYear(list); total += y.tax + y.local; compared = compared || y.compared; });
      return { order, sales, total, compared };
    });
    results.sort((a, b) => a.total - b.total);
    const best = results[0], worst = results[results.length - 1];
    return { results, best, worst, reason: explainBest(best, worst) };
  }
  function explainBest(best, worst) {
    const name = s => s.name;
    const seq = r => r.sales.map(name).join(' → ');
    const lines = [];
    lines.push('세금이 가장 적은 순서는 ' + seq(best) + '입니다' + (worst.total > best.total ? ' (가장 많은 순서 ' + seq(worst) + '보다 ' + man(worst.total - best.total) + ' 적음).' : '. 어떤 순서로 팔아도 총 세금이 같습니다.'));
    const last = best.sales[best.sales.length - 1];
    if (last.r.exempt === 'full') lines.push('마지막에 남는 ' + last.name + '가 1세대1주택 비과세(양도가 12억 원 이하)를 받습니다.');
    else if (last.r.exempt === 'partial') lines.push('마지막에 남는 ' + last.name + '는 12억 원 초과분만 과세되고 장기보유특별공제 ' + Math.round(last.r.ltdRate * 100) + '%를 받습니다.');
    const tt = best.sales.find(s => s.r.tempTwo && s.r.exemptOK && s.remain === 2);
    if (tt) lines.push(tt.name + '는 일시적 2주택 특례로 비과세 판정을 받습니다.');
    const hb = best.sales.filter(s => s.r.heavy > 0).length, hw = worst.sales.filter(s => s.r.heavy > 0).length;
    if (hb < hw) lines.push('다주택 중과(+20·30%p)가 붙는 매도가 ' + hb + '건으로, 가장 불리한 순서(' + hw + '건)보다 적습니다.');
    else if (hb > 0) lines.push('중과가 붙는 매도(' + best.sales.filter(s => s.r.heavy > 0).map(name).join(', ') + ')는 양도차익이 작은 집이 먼저 나가도록 배치됐습니다.');
    if (best.compared) lines.push('같은 해에 두 채 이상 팔면 합산 비교과세(소득세법 제104조 제5항)로 세금이 늘 수 있어, 매도 간격을 해를 넘기게 잡으면 더 줄어들 수 있습니다.');
    return lines;
  }

  /* ---------- 취득세 ---------- */
  /** a: { price, houses(취득 후 주택 수 1~4), adj(취득 주택이 조정대상지역), temp(일시적 2주택), over85(전용 85㎡ 초과) } */
  function acqTax(a) {
    const P = a.price, n = Math.min(4, Math.max(1, a.houses || 1));
    let rate, heavy = false, why;
    const normal = () => {
      if (P <= 6 * EOK) return 0.01;
      if (P <= 9 * EOK) return Math.round(((P * 2 / (3 * EOK)) - 3) / 100 * 10000) / 10000; // 소수점 넷째 자리까지(다섯째 반올림)
      return 0.03;
    };
    if (n === 1) { rate = normal(); why = '1주택 유상거래 세율(6억 이하 1%, 6억~9억 구간 비례, 9억 초과 3%)'; }
    else if (n === 2 && (!a.adj || a.temp)) { rate = normal(); why = a.adj ? '일시적 2주택(종전 주택을 3년 안에 처분하는 조건)이라 1주택 세율' : '비조정대상지역 2주택은 1주택과 같은 세율'; }
    else if (n === 2) { rate = 0.08; heavy = true; why = '조정대상지역 2주택 중과 8%'; }
    else if (n === 3) { rate = a.adj ? 0.12 : 0.08; heavy = true; why = a.adj ? '조정대상지역 3주택 중과 12%' : '비조정대상지역 3주택 중과 8%'; }
    else { rate = 0.12; heavy = true; why = '4주택 이상 중과 12%'; }
    const acq = won(P * rate);
    const eduRate = heavy ? 0.004 : Math.round(rate * 0.1 * 1e6) / 1e6; // 중과 시 (4%-2%)×20%=0.4%, 유상거래 특례는 세율×1/2×20%
    const edu = won(P * eduRate);
    const farmRate = a.over85 ? (heavy ? (rate === 0.12 ? 0.01 : 0.006) : 0.002) : 0;
    const farm = won(P * farmRate);
    return { rate, acq, eduRate, edu, farmRate, farm, total: acq + edu + farm, heavy, why };
  }

  const API = { calcCGT, timeline, compareOrders, acqTax, basicTax, tempTwoDeadline, fullYears, fullMonths, addMonths, addYears, addDays, todayStr, permutations, combineYear,
    CONST: { HIGH_PRICE, BASIC_DED, GRACE_FROM, GRACE_TO, BRACKETS, CHECKED: '2026-11-17' } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_TAX = API;
})(typeof self !== 'undefined' ? self : this);
