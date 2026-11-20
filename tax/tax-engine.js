/* 장대장 부동산 세금 계산 엔진 (양도소득세 · 취득세)  — 브라우저 안에서만 계산, 서버 전송 없음
   ───────────────────────────────────────────────────────────────────────────
   기준: 2026년 11월 20일 현재 시행 법령 (최초 확인 2026-11-17, 전수 재점검 2026-11-20 — 출처·확인일은 docs/tax_rules_sources.md,
   공식 산식 대조 테스트 tools/tax-official-test.js). 이 엔진이 정확히 계산하지 못하는 경우는 SCOPE(아래)로 화면에 '세무사 확인 필요' 안내.

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
    // 보유기간 응당일 경계(2년 비과세·1년/2년 단기세율·3년 장특공): 하루 차이로 결과가 갈리므로 확인 권고
    for (const n of [1, 2, 3]) { const ann = addYears(p.acqDate, n);
      if (p.saleDate === ann || p.saleDate === addDays(ann, -1)) { R.notes.push('양도일(잔금일)이 취득 ' + n + '년 응당일(' + ann + ') 바로 전후라 보유기간 계산 방식(초일 산입)에 따라 결과가 달라질 수 있어요. 응당일 다음 날 이후로 잔금일을 잡거나 세무사 확인이 필요해요.'); break; } }
    if (p.saleDate < '2023-01-12') R.notes.push('2023년 1월 12일 이전 양도분은 일시적 2주택 기한 등 당시 규정이 달라 이 계산과 다를 수 있습니다.');

    // 1) 1세대1주택(또는 일시적 2주택 종전주택) 비과세 요건
    let oneHouse = p.houses === 1, tt = null;
    if (!oneHouse && p.houses === 2 && p.tempTwo && p.tempTwo.newAcqDate) {
      tt = tempTwoDeadline(p.acqDate, p.tempTwo.oldAdjAtNewAcq, p.tempTwo.newAcqDate, p.tempTwo.newAdj);
      R.tempTwo = tt;
      if (tt.before1y) R.reasons.push('일시적 2주택 특례 불가: 새 집을 종전 집 취득 후 1년이 지나기 전에 취득했습니다 (시행령 제155조 제1항).');
      else if (p.saleDate > tt.end) R.reasons.push('일시적 2주택 특례 불가: 새 집 취득일부터 ' + tt.years + '년(' + tt.end + '까지) 안에 팔아야 합니다.');
      else { oneHouse = true; R.reasons.push('일시적 2주택: 새 집 취득일부터 ' + tt.years + '년 안(' + tt.end + '까지)에 종전 집을 팔면 1주택처럼 비과세 판정을 받습니다' + (tt.shortRule ? ' (조정대상지역끼리 2026.8.4 이후 취득분이라 2년 적용).' : '.'));
        if (tt.shortRule) R.notes.push('새 집을 2026년 8월 3일 이전에 계약하고 계약금을 냈다면, 또는 새 집을 산 뒤에 그 지역이 조정대상지역으로 지정됐다면 3년이 적용돼요(개정 시행령 경과규정). 이 계산은 취득일만 보고 2년으로 잡았으니 해당하면 세무사 확인이 필요해요.'); }
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
      else if (p.saleDate >= '2018-04-01') { R.heavy = p.houses >= 3 ? 0.30 : 0.20; R.reasons.push('양도일에 조정대상지역이고 ' + (p.houses >= 3 ? '3주택 이상' : '2주택') + '이라 기본세율에 ' + (R.heavy * 100) + '%p를 더합니다 (소득세법 제104조 제7항, 2026.5.10 이후 양도분 중과 재개).');
        R.notes.push('중과 제외 주택(수도권·광역시·세종 밖 공시가격 3억 원 이하 주택, 장기임대주택, 상속주택, 혼인·봉양 합가 등 — 소득세법 시행령 제167조의10·제167조의11)이나 주택 수에서 빠지는 집이 있으면 중과가 안 될 수 있어요. 해당하면 세무사 확인이 필요해요.'); }
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
    else if (n === 2 && (!a.adj || a.temp)) { rate = normal(); why = a.adj ? '일시적 2주택(종전 주택을 기한 안에 처분하는 조건 — 지방세법 시행령 제28조의5 현행 3년, 기한 안에 못 팔면 8% 중과로 추징)이라 1주택 세율' : '비조정대상지역 2주택은 1주택과 같은 세율'; }
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

  /* ---------- 재산세 (주택) ----------
     기준: 2026년 과세분(과세기준일 2026.6.1) 시행 법령, 확인일 2026-11-18
     - 과세표준: 지방세법 제110조 제1항 = 시가표준액(공시가격) × 공정시장가액비율.
         공정시장가액비율: 지방세법 시행령 제109조 — 주택 60%, 1세대1주택(가격 무관) 공시 3억 이하 43%, 6억 이하 44%, 6억 초과 45%.
         2026년분 1주택 비율은 2025년과 같게 유지(행정안전부 2026.4.21 입법예고, 2026.6.1 시행 — 파이낸셜뉴스 2026.4.21, 삼일PwC 2026.5).
     - 과세표준상한제: 지방세법 제110조 제3항(2024.1.1 시행), 시행령 제109조의2 — 상한액 = 직전 연도 과세표준 상당액
         (직전 연도 공시가격 × 올해 공정시장가액비율) + 올해 공시가격 기준 과세표준 × 상한율 5%.
     - 세율: 지방세법 제111조 제1항 제3호 나목 — 6천만 이하 0.1%, 1.5억 이하 6만+0.15%, 3억 이하 19.5만+0.25%, 초과 57만+0.4%.
     - 1세대1주택 특례세율: 지방세법 제111조의2 — 공시가격 9억 이하, 표준세율보다 0.05%p 낮음(0.05/0.1/0.2/0.35%).
         현행 적용기한 2026년 과세분까지. 2029년까지 3년 연장안은 2026.8.26 지방세제 개편안(입법예고, 국회 제출 예정)이라 미반영.
     - 세부담상한: 지방세법 제122조 — 주택은 공시 3억 이하 105%, 6억 이하 110%, 초과 130%. 과세표준상한제 도입 후 2028년까지
         함께 적용(둘 중 적은 세액) — 법무법인 세종(Shin & Kim) 뉴스레터 2024 vol.220 해설 기준(부칙 원문은 확인 필요). 직전 연도 세액은 사용자가 넣은 값으로 근사.
     - 도시지역분: 지방세법 제112조 제1항 제2호 — 과세표준 × 0.14% (도시계획구역 안 주택, 대부분 도시 아파트 해당).
     - 지방교육세: 지방세법 제151조 제1항 제6호 — 재산세액(도시지역분 제외)의 20%.
     - 납기: 지방세법 제115조 제1항 제3호 — 1/2은 7.16~7.31, 1/2은 9.16~9.30. 해당 연도 세액 20만 원 이하는 조례로 7월에 한꺼번에.
     - 지방세 10원 미만 버림(지방세기본법·국고금관리법 단수 처리). 지역자원시설세(소방분)는 건축물 시가표준액이 따로 필요해 미반영. */
  const PT_BRK = [[60000000, 0.001, 0], [150000000, 0.0015, 30000], [300000000, 0.0025, 180000], [Infinity, 0.004, 630000]];
  const PT_BRK_ONE = [[60000000, 0.0005, 0], [150000000, 0.001, 30000], [300000000, 0.002, 180000], [Infinity, 0.0035, 630000]];
  const ten = v => Math.floor(v / 10 + 1e-6) * 10;
  const progressive = (base, table) => { if (base <= 0) return 0; for (const [cap, r, d] of table) if (base <= cap) return base * r - d; return 0; };
  const ptRatio = (price, one) => !one ? 0.60 : price <= 3 * EOK ? 0.43 : price <= 6 * EOK ? 0.44 : 0.45;
  /** p: { price(올해 공시가격), one(1세대1주택), prevPrice(작년 공시가격, 선택), prevTax(작년 재산세 본세, 선택), urban(도시지역분, 기본 true) } */
  function propertyTax(p) {
    const R = { notes: [] };
    const ratio = ptRatio(p.price, p.one);
    const base0 = won(p.price * ratio);
    let base = base0, capBase = null;
    if (p.prevPrice > 0) {
      capBase = won(p.prevPrice * ratio + base0 * 0.05);
      if (capBase < base0) { base = capBase; R.notes.push('과세표준상한제: 작년 공시가격 기준 과세표준에 올해 과세표준의 5%를 더한 ' + man(capBase) + '이 상한이라 이 금액을 과세표준으로 씁니다.'); }
    }
    const special = !!p.one && p.price <= 9 * EOK;
    const table = special ? PT_BRK_ONE : PT_BRK;
    let tax = ten(progressive(base, table));
    const stdTax = ten(progressive(base, PT_BRK));
    let burdenRate = null;
    if (p.prevTax > 0) {
      burdenRate = p.price <= 3 * EOK ? 1.05 : p.price <= 6 * EOK ? 1.10 : 1.30;
      const lim = ten(p.prevTax * burdenRate);
      if (lim < tax) { R.notes.push('세부담상한: 작년 재산세의 ' + Math.round(burdenRate * 100) + '%(' + man(lim) + ')를 넘지 않게 줄였습니다.'); tax = lim; }
    }
    const urban = p.urban === false ? 0 : ten(base * 0.0014);
    const edu = ten(tax * 0.2);
    const total = tax + urban + edu;
    const lump = tax + urban <= 200000;
    const july = lump ? total : ten(total / 2), sept = total - july;
    return Object.assign(R, { ratio, base0, capBase, base, special, rate: special ? '특례세율' : '표준세율', tax, stdTax, burdenRate, urban, edu, total, july, sept, lump,
      marginal: (table.find(([cap]) => base <= cap) || table[3])[1] });
  }

  /* ---------- 종합부동산세 (주택분) ----------
     기준: 2026년 과세분(과세기준일 2026.6.1, 납부 2026.12.1~12.15) 시행 법령, 확인일 2026-11-18
     - 과세표준: 종합부동산세법 제8조 제1항 — (공시가격 합계 − 공제액) × 공정시장가액비율 60%(시행령 제2조의4, 2023년~ 유지).
         공제액: 1세대1주택자 12억, 그 밖의 개인 9억, 법인 0 (2023.1.1 시행).
     - 세율: 같은 법 제9조 제1항(2023.1.1 시행) — 2주택 이하 3억 0.5% / 6억 0.7% / 12억 1.0% / 25억 1.3% / 50억 1.5% / 94억 2.0% / 초과 2.7%,
         3주택 이상 12억까지 같고 25억 2.0% / 50억 3.0% / 94억 4.0% / 초과 5.0%. 법인(제9조 제2항) 2주택 이하 2.7%, 3주택 이상 5.0% 단일.
     - 재산세 중복분 공제: 같은 법 제9조 제3항, 시행령 제4조의3 — 재산세 부과세액(도시지역분 제외) × [(공시합계 − 공제액) × 60% × 재산세 공정시장가액비율
         × 재산세 표준세율] ÷ 재산세 표준세율로 계산한 재산세 상당액. 분자의 표준세율은 과세기준 초과 부분에 해당하는 최고세율 0.4%로 계산(신고서 부표 작성요령).
         재산세 공정시장가액비율이 주택마다 다르면 공시가격 가중평균(국세청 유권해석) — 이 계산기에서는 1세대1주택 45%(6억 초과), 그 밖 60%.
     - 1세대1주택 세액공제: 제9조 제6항(연령 만 60~65세 20%, 65~70세 30%, 70세 이상 40%), 제8항(보유 5~10년 20%, 10~15년 40%, 15년 이상 50%),
         두 공제 합계 80% 한도(제9조 제9항).
     - 세부담상한: 제10조 — 개인, 직전 연도 총세액상당액(재산세+종부세)의 150%. 법인(2.7%·5% 세율 적용)은 적용 없음.
     - 농어촌특별세: 농어촌특별세법 제5조 제1항 제8호 — 종부세 납부세액의 20%.
     - 국회 심의 중인 2026 세제개편안(1주택 공제 14억, 공정시장가액비율 70~80%, 세율 일원화, 세액공제 거주 기준 등, 2027년분~)은 미반영. */
  const CPT_BRK = [[3e8, 0.005, 0], [6e8, 0.007, 600000], [12e8, 0.010, 2400000], [25e8, 0.013, 6000000], [50e8, 0.015, 11000000], [94e8, 0.020, 36000000], [Infinity, 0.027, 101800000]];
  const CPT_BRK3 = [[3e8, 0.005, 0], [6e8, 0.007, 600000], [12e8, 0.010, 2400000], [25e8, 0.020, 14400000], [50e8, 0.030, 39400000], [94e8, 0.040, 89400000], [Infinity, 0.050, 183400000]];
  const CPT_FMR = 0.60;
  const ageCredit = a => a >= 70 ? 0.40 : a >= 65 ? 0.30 : a >= 60 ? 0.20 : 0;
  const holdCredit = y => y >= 15 ? 0.50 : y >= 10 ? 0.40 : y >= 5 ? 0.20 : 0;
  /** p: { prices:[공시가격...], corp(법인), one(1세대1주택), age(만 나이), years(보유 연수), prevTotal(작년 재산세+종부세, 선택) } */
  function compTax(p) {
    const prices = (p.prices || []).filter(x => x > 0), n = prices.length, sum = prices.reduce((s, x) => s + x, 0);
    const one = !p.corp && !!p.one && n === 1;
    const ded = p.corp ? 0 : one ? 12 * EOK : 9 * EOK;
    const R = { n, sum, one, ded, notes: [] };
    const base = Math.max(0, won((sum - ded) * CPT_FMR));
    const heavy = n >= 3;
    let calc;
    if (p.corp) calc = won(base * (heavy ? 0.05 : 0.027));
    else calc = won(progressive(base, heavy ? CPT_BRK3 : CPT_BRK));
    // 재산세 (주택별)
    const props = prices.map(pr => propertyTax({ price: pr, one }));
    const propSum = props.reduce((s, x) => s + x.tax, 0);
    const propStd = props.reduce((s, x) => s + x.stdTax, 0);
    const ptr = one ? ptRatio(sum, true) : 0.60;
    let propDed = 0;
    if (base > 0 && propStd > 0) propDed = Math.min(calc, propSum, won(propSum * (base * ptr * 0.004) / propStd));
    const afterDed = calc - propDed;
    let creditRate = 0, credit = 0;
    if (one) { creditRate = Math.min(0.8, ageCredit(p.age || 0) + holdCredit(p.years || 0)); credit = won(afterDed * creditRate); }
    let tax = afterDed - credit, capCut = 0;
    if (!p.corp && p.prevTotal > 0) {
      const lim = won(p.prevTotal * 1.5), now = propSum + tax;
      if (now > lim) { capCut = Math.min(tax, now - lim); tax -= capCut; R.notes.push('세부담상한: 올해 재산세+종부세가 작년 합계의 150%(' + man(lim) + ')를 넘는 부분 ' + man(capCut) + '을 뺐습니다.'); }
    }
    const farm = won(tax * 0.2);
    return Object.assign(R, { base, heavy, rateText: p.corp ? (heavy ? '5.0%' : '2.7%') + ' 단일' : Math.round(((heavy ? CPT_BRK3 : CPT_BRK).find(([c]) => base <= c) || [0, 0])[1] * 1000) / 10 + '%' + (heavy ? ' (3주택 이상)' : ''),
      calc, props, propSum, propDed, ptr, afterDed, creditRate, ageRate: one ? ageCredit(p.age || 0) : 0, holdRate: one ? holdCredit(p.years || 0) : 0, credit, capCut, tax, farm, total: tax + farm,
      holdTotal: tax + farm + props.reduce((s, x) => s + x.total, 0) });
  }

  /* ---------- 증여세 (상속세 및 증여세법) ----------
     기준: 2026년 11월 현재 시행, 확인일 2026-11-18
     - 증여재산공제: 제53조(10년 합산) — 배우자 6억, 직계존속→직계비속 5천만(수증자 미성년 2천만), 직계비속→직계존속 5천만,
         그 밖의 친족(6촌 이내 혈족·4촌 이내 인척) 1천만. 제53조의2 혼인·출산 증여재산공제 1억(2024.1.1 이후 증여, 직계존속→직계비속).
     - 10년 합산: 제47조 제2항 — 같은 사람(증여자가 직계존속이면 그 배우자 포함)에게 10년 안에 받은 1천만 원 이상 증여 합산, 제58조 기납부세액 공제.
     - 세율: 제56조 → 제26조 — 1억 이하 10%, 5억 이하 20%(누진공제 1천만), 10억 이하 30%(6천만), 30억 이하 40%(1.6억), 초과 50%(4.6억).
         최고세율 인하 등 개편안은 시행되지 않음(2024 정부안 국회 부결, 이후 확정 없음).
     - 과세최저한: 제55조 제2항 — 과세표준 50만 원 미만 비과세.
     - 세대생략 할증: 제57조 — 30%, 수증자가 미성년자이고 증여재산가액 20억 초과면 40%.
     - 신고세액공제: 제69조 제2항 — 신고기한(증여일이 속한 달 말일부터 3개월) 안 신고 시 산출세액(공제·감면 뒤)의 3%.
     - 부담부증여: 제47조 제1항 — 수증자가 인수한 채무는 증여재산가액에서 빼고, 그 채무 부분은 증여자의 양도(소득세법 제88조 제1호 후단).
         양도가액 = 채무액, 취득가액 = 증여자 취득가액 × 채무액 ÷ 증여재산가액(소득세법 시행령 제159조).
     [증여 취득세] 지방세법 제11조 제1항 제2호 무상취득 3.5%, 지방교육세 0.3%, 농어촌특별세 0.2%(85㎡ 초과).
         제13조의2 제2항, 시행령 제28조의6 — 조정대상지역 안 시가표준액 3억 이상 주택 무상취득 12%(지방교육세 0.4%, 농특세 1.0%),
         1세대1주택자가 배우자·직계존비속에게 증여하면 제외(2026.1.1 시행 개정법에서도 유지 — 행정안전부 2025.12.31 안내).
         과세표준: 제10조의2 시가인정액(2023.1.1~). 부담부증여 채무 부분은 유상취득(제7조 제11항·제12항, 배우자·직계존비속은 채무 상환능력 증명 시). */
  const GIFT_BRK = [[1e8, 0.10, 0], [5e8, 0.20, 10000000], [10e8, 0.30, 60000000], [30e8, 0.40, 160000000], [Infinity, 0.50, 460000000]];
  const GIFT_DED = { spouse: 6e8, child: 5e7, minor: 2e7, parent: 5e7, relative: 1e7, other: 0 };
  const GIFT_REL = { spouse: '배우자', child: '직계존속(부모·조부모) → 성년 자녀', minor: '직계존속(부모·조부모) → 미성년 자녀', parent: '직계비속(자녀) → 부모', relative: '그 밖의 친족', other: '친족 아님' };
  /** p: { value(증여재산가액 시가), debt(인수 채무), rel, prior(10년 안 같은 증여자 합산액), priorTax(그때 낸 증여세), marriage(혼인·출산 공제), skip(세대생략), filed(기한 내 신고) } */
  function giftTax(p) {
    const R = { notes: [] };
    const debt = Math.min(p.debt || 0, p.value);
    const net = p.value - debt;
    const prior = p.prior || 0;
    const total = net + prior;
    const canMarry = p.rel === 'child' || p.rel === 'minor';
    const ded = Math.min(total, (GIFT_DED[p.rel] || 0) + (p.marriage && canMarry ? 1e8 : 0));
    let base = Math.max(0, total - ded);
    if (base < 500000) base = 0;
    const calc = won(progressive(base, GIFT_BRK));
    const skip = !!p.skip && canMarry;
    const skipRate = skip ? (p.rel === 'minor' && p.value > 20 * EOK ? 0.4 : 0.3) : 0;
    const surcharge = won(calc * skipRate);
    const priorTax = Math.min(p.priorTax || 0, calc + surcharge);
    const after = calc + surcharge - priorTax;
    const filing = p.filed === false ? 0 : won(after * 0.03);
    const tax = after - filing;
    return Object.assign(R, { debt, net, prior, total, ded, base, calc, skipRate, surcharge, priorTax, filing, tax,
      rate: base ? (GIFT_BRK.find(([c]) => base <= c)[1]) : 0, relText: GIFT_REL[p.rel] || '' });
  }
  /** 부담부증여 채무 부분 양도차익 안분 (증여자의 양도세 계산 재료) */
  function giftDebtGain(value, debt, donorAcq) {
    if (!(debt > 0) || !(value > 0)) return null;
    const acq = won(donorAcq * debt / value);
    return { salePrice: debt, acqPrice: acq, gain: debt - acq, share: debt / value };
  }
  /** a: { value(시가인정액), stdPrice(공시가격), debt, adj(조정대상지역), donorOne(증여자 1세대1주택), close(배우자·직계존비속), over85, recvHouses(받은 뒤 수증자 주택 수) } */
  function giftAcqTax(a) {
    const debt = Math.min(a.debt || 0, a.value), giftPart = a.value - debt;
    const heavy = !!a.adj && a.stdPrice >= 3 * EOK && !(a.donorOne && a.close);
    const rate = heavy ? 0.12 : 0.035, eduRate = heavy ? 0.004 : 0.003, farmRate = a.over85 ? (heavy ? 0.01 : 0.002) : 0;
    const g = { base: giftPart, rate, acq: won(giftPart * rate), eduRate, edu: won(giftPart * eduRate), farmRate, farm: won(giftPart * farmRate) };
    g.total = g.acq + g.edu + g.farm;
    let d = null;
    if (debt > 0) {
      const t = acqTax({ price: a.value, houses: a.recvHouses || 1, adj: !!a.adj, over85: !!a.over85 });
      d = { base: debt, rate: t.rate, acq: won(debt * t.rate), eduRate: t.eduRate, edu: won(debt * t.eduRate), farmRate: t.farmRate, farm: won(debt * t.farmRate), heavy: t.heavy };
      d.total = d.acq + d.edu + d.farm;
    }
    return { heavy, gift: g, debt: d, total: g.total + (d ? d.total : 0),
      why: heavy ? '조정대상지역 안 공시가격 3억 원 이상 주택 증여라 12% 중과' : a.adj && a.stdPrice >= 3 * EOK ? '조정대상지역 3억 이상이지만 1세대1주택자가 배우자·직계존비속에게 증여해 중과 제외, 3.5%' : '무상취득 기본세율 3.5%' };
  }

  /* ---------- 기준일 · 적용 조항 · 지원 범위 (화면 결과마다 표시: tax/tax-trust.js) ----------
     세법이 바뀌면 AS_OF 와 해당 항목을 고치고 tools/tax-official-test.js 를 다시 돌린다. 출처: docs/tax_rules_sources.md */
  const AS_OF = '2026-11-20';
  const LAW = {
    cgt: { name: '양도소득세', arts: ['소득세법 제55조(세율)', '제89조 제1항 제3호(1세대1주택 비과세·12억)', '제95조(장기보유특별공제 표1·표2)', '제103조(기본공제 250만)', '제104조(단기·중과세율)', '시행령 제154조·제155조·제160조·제167조의10·제167조의11', '지방세법 제103조의3(지방소득세 10%)'] },
    acq: { name: '취득세', arts: ['지방세법 제11조 제1항 제8호(주택 유상 1~3%)', '제13조의2(다주택 중과)', '시행령 제28조의5(일시적 2주택)', '제151조(지방교육세)', '농어촌특별세법 제5조'] },
    prop: { name: '재산세', arts: ['지방세법 제110조·시행령 제109조(공정시장가액비율)', '제111조·제111조의2(세율·1주택 특례)', '제112조(도시지역분)', '제122조(세부담상한)', '제151조(지방교육세)'] },
    cpt: { name: '종합부동산세', arts: ['종합부동산세법 제8조(과세표준·공제 12억/9억)', '제9조(세율·세액공제)', '제10조(세부담상한)', '시행령 제2조의4(공정시장가액비율 60%)·제4조의3', '농어촌특별세법 제5조'] },
    gift: { name: '증여세', arts: ['상속세 및 증여세법 제26조·제56조(세율)', '제47조(10년 합산·부담부증여)', '제53조·제53조의2(증여재산공제)', '제57조(세대생략 할증)', '제69조(신고세액공제 3%)', '지방세법 제11조 제1항 제2호·제13조의2 제2항(증여 취득세)'] }
  };
  LAW.order = { name: '다주택 매도 순서', arts: LAW.cgt.arts.concat(['소득세법 제104조 제5항(같은 해 비교과세)']) };
  /** 이 계산기가 정확히 계산하지 못하는 경우: [경우, 이유 한 줄] — 결과 숫자를 단정하지 않고 세무사 확인을 안내 */
  const SCOPE = {
    cgt: [
      ['상생임대주택 특례', '직전 임대료 5% 이내 증액 등 요건 판정이 필요하고, 특례가 2026년 말 종료돼 적용 여부가 계약 시점에 따라 달라요.'],
      ['조합원입주권·분양권이 있거나 그것을 파는 경우', '주택 수 산정·세율(1년 미만 70%, 그 밖 60%)·비과세 특례가 주택과 달라 이 계산에 넣지 않았어요.'],
      ['공동명의(부부 등 지분 보유)', '지분별로 사람마다 따로 계산하고 기본공제도 각자 받아요. 한 사람 기준인 이 계산과 달라요.'],
      ['취득가액을 모르는 경우(환산취득가액·기준시가)', '환산취득가액과 필요경비 개산공제(3%) 계산, 가산세 여부를 확인해야 해요.'],
      ['필요경비', '취득세·중개보수·자본적 지출(샷시·확장 등)은 넣을 수 있지만, 도배·수리 같은 수익적 지출과 대출이자는 경비가 아니에요. 넣으신 금액은 증빙이 있다고 보고 계산해요.'],
      ['상속·증여받은 집', '취득가액(신고가액)과 보유기간 기산일, 배우자·직계존비속 증여 후 10년 안 양도 시 이월과세가 달라요.'],
      ['부담부증여의 양도세', '채무 부분 양도차익 안분은 보여 드리지만 주택 수·비과세·중과 판정은 세무사 확인이 필요해요.'],
      ['다가구·겸용주택, 농어촌·장기임대·감면주택, 1세대 판정(분가·합가)', '시행령의 별도 특례 판정이 필요해 이 계산에 넣지 않았어요.'],
      ['비거주자·법인, 미등기 양도', '세율과 공제가 달라 이 계산 범위 밖이에요.']
    ],
    acq: [
      ['생애최초·출산 가구 등 감면', '지방세특례제한법 감면(한도·요건)을 빼고 계산했어요.'],
      ['공시가격 1억 원 이하 주택, 법인 취득, 오피스텔·분양권·입주권의 주택 수', '중과 제외·주택 수 산정 규정이 따로 있어요.'],
      ['조정대상지역 일시적 2주택의 처분 기한', '현행 3년(지방세법 시행령 제28조의5)으로 안내해요. 2026년 지방세제 개편안에 2026.10.1 이후 취득분 2년 단축이 들어 있어, 시행 여부를 세무사·구청 세무과에 확인해 주세요.'],
      ['고급주택 중과, 상속·원시취득', '세율이 달라 이 계산 범위 밖이에요.']
    ],
    prop: [
      ['부부 공동명의·다가구·겸용주택', '지분·용도별로 나눠 과세돼 이 계산과 달라요.'],
      ['지역자원시설세(소방분)', '건축물 시가표준액이 필요해 넣지 않았어요.'],
      ['세부담상한(작년 세액 기준)', '작년 세액을 넣으셨을 때만 근사로 반영해요.']
    ],
    cpt: [
      ['부부 공동명의 1주택 특례 신청', '1주택자 방식(12억 공제·세액공제)과 각자 9억 공제 중 유리한 쪽을 골라야 해서 따로 계산이 필요해요.'],
      ['합산배제 임대주택·일시적 2주택·상속주택·지방 저가주택 특례', '주택 수와 1세대1주택 판정이 달라져요.'],
      ['재산세 세부담상한이 적용된 경우의 재산세 공제', '실제 부과된 재산세로 공제하므로 고지서와 다를 수 있어요.']
    ],
    gift: [
      ['시가(매매사례가액·감정가액) 판정', '넣으신 금액을 시가로 보고 계산해요. 비슷한 아파트 거래가·감정가와 다르면 세액이 달라져요.'],
      ['부담부증여에서 채무 인수가 인정되는지', '배우자·직계존비속 간에는 채무 상환능력 입증이 필요해요.'],
      ['창업자금·가업승계 특례, 비거주자, 저가양수·고가양도', '이 계산 범위 밖이에요.']
    ]
  };
  SCOPE.order = SCOPE.cgt;

  const API = { calcCGT, timeline, compareOrders, acqTax, basicTax, tempTwoDeadline, fullYears, fullMonths, addMonths, addYears, addDays, todayStr, permutations, combineYear,
    propertyTax, compTax, giftTax, giftDebtGain, giftAcqTax, AS_OF, LAW, SCOPE,
    CONST: { HIGH_PRICE, BASIC_DED, GRACE_FROM, GRACE_TO, BRACKETS, PT_BRK, PT_BRK_ONE, CPT_BRK, CPT_BRK3, CPT_FMR, GIFT_BRK, GIFT_DED, CHECKED: AS_OF } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_TAX = API;
})(typeof self !== 'undefined' ? self : this);
