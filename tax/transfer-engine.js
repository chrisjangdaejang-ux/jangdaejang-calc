/* 집예보 '이 집 어떻게 넘기는 게 유리할까?' — 제3자 양도 / 자녀에게 저가 양도 / 증여 / 상속까지 보유
   브라우저 안에서만 계산(서버 전송 없음). 양도세·증여세·취득세·재산세·종부세 계산식은 tax-engine.js(JDJ_TAX)를 그대로 쓴다.
   ───────────────────────────────────────────────────────────────────────────
   기준일: 2026년 11월 21일 현재 시행 법령 (확인일 2026-11-20, 상속공제 2026-11-21)

   [저가 양도 — 세 가지 기준이 서로 다르다]
   1) 부모(파는 쪽) 양도세: 소득세법 제101조 제1항(양도소득의 부당행위계산), 같은 법 시행령 제167조 제3항
        특수관계인에게 시가보다 낮게 팔고 "시가와 거래가액의 차액이 3억원 이상이거나 시가의 100분의 5에 상당하는 금액 이상"이면
        양도가액을 시가로 다시 계산. (시행령 원문 인용 확인: sootax.co.kr/3682, 2017.2.3 개정 문언)
   2) 자녀(사는 쪽) 증여세: 상속세 및 증여세법 제35조 제1항(저가 양수에 따른 이익의 증여), 같은 법 시행령 제26조 제2항
        특수관계인 사이 시가와 대가의 차액이 기준금액(시가의 100분의 30과 3억원 중 적은 금액) 이상이면
        증여재산가액 = (시가 − 대가) − 기준금액. (korea.legal 시행령 제26조 현행 문언, 2026.2.27 개정 표시)
        제35조 이익은 합산배제 증여재산(제47조 제1항)이 아니라 10년 합산 대상.
   3) 자녀 취득세: 지방세법 제7조 제11항 제4호(법률 제21308호, 2025.12.31 개정, 2026.1.1 이후 취득분부터 — 부칙 제3조)
        배우자·직계존비속에게서 취득하면서 대가가 시가인정액보다 3억원 이상 또는 시가인정액의 30% 이상 낮으면 증여로 보아
        무상취득 세율(주택 3.5%, 조정대상지역 시가표준액 3억 이상은 12% — 제13조의2 제2항) + 과세표준 시가인정액.
        (법률신문 2026.2.6 '가족 간 저가양도 시 증여의제에 따른 취득세 부과', 뉴시스 2025.12.31 행정안전부 개정 안내, 한경 2026.1.6)
        증여의제가 아니어도 특수관계인 유상취득 부당행위: 지방세법 제10조의3 제2항, 시행령 제18조의2(2025.12.31 개정 표시)
        — 시가인정액과 사실상취득가격의 차액이 3억원 이상이거나 시가인정액의 100분의 5 이상이면 시가인정액을 과세표준으로.
   [상속세] 상속세 및 증여세법 (2026-11-20 현재 — 기초공제 2억·일괄공제 5억·배우자공제 5억~30억은 1997년 이후 그대로,
        자녀공제 1인 5천만: 머니투데이 2026.10.5. 2025.12.2 국회 통과 상증법 개정에 공제·세율 변경 없음: 법률신문 2025.12.9,
        삼일PwC Tax News Flash 2026.1.16. 정부 유산취득세 전환안·여야 공제 확대안은 국회 계류 — 미반영)
     - 과세가액: 제13조 제1항 — 상속개시일 전 10년 이내 상속인에게 증여한 재산 가산(상속인 아닌 자는 5년)
     - 일괄공제 5억: 제21조 (기초공제 2억 제18조 + 그 밖의 인적공제 제20조와 비교해 큰 쪽 — 2026-11-21부터 자녀 수·미성년·65세 이상·장애인 입력으로 비교)
     - 배우자 상속공제: 제19조 — 실제 상속받은 금액(법정상속분 한도, 30억 한도), 5억 미만이면 5억. 배우자가 받을 금액을 넣으면 반영(없으면 5억).
     - 금융재산 상속공제 제22조, 장례비용 제14조 — 아래 inheritTax 머리말.
     - 동거주택 상속공제: 제23조의2 — 10년 이상 계속 동거·1세대1주택·상속인 무주택 등, 주택가액(담보 채무 차감)의 100%, 6억 한도
       (한경머니 2026.9.16)
     - 공제 종합한도: 제24조 — 과세가액에서 가산한 사전증여재산가액(증여재산공제 차감 뒤)을 뺀 금액까지만 공제
       (사전증여분을 빼는 것은 과세가액이 5억 원을 넘을 때만 — 같은 조 단서)
     - 과세최저한: 제25조 제2항 — 과세표준 50만 원 미만 비과세
     - 세율: 제26조 — 1억 10% / 5억 20%(1천만) / 10억 30%(6천만) / 30억 40%(1.6억) / 초과 50%(4.6억)
     - 증여세액공제: 제28조 — 합산한 사전증여재산의 증여세 산출세액 공제(한도 비율 계산은 단순화: 산출세액 범위 안)
     - 신고세액공제: 제69조 제1항 — 3%
   [상속 취득세] 지방세법 제11조 제1항 제1호 나목 2.8%, 제15조 제1항(상속으로 1가구 1주택이 되면 세율특례 0.8%),
        과세표준은 시가표준액(공시가격) — 제10조의2 제2항 제1호(법률신문 2026.2.6), 지방교육세 0.16%, 농어촌특별세 0.2%(85㎡ 초과)
        (KB 2026.10.6 '상속주택 양도세, 취득세 특례'). 0.8% 특례 때 농어촌특별세 비과세 여부는 확인 못 함 → 0으로 두고 '세무사 확인 필요'.
   [증여 뒤 양도 이월과세] 소득세법 제97조의2 — 배우자·직계존비속에게 받은 부동산을 10년(2022.12.31 이전 증여분 5년) 안에 팔면
        증여한 사람의 취득가액으로 계산 (삼일PwC 2025.2 이슈브리프).
   [증여 추정] 상속세 및 증여세법 제44조 — 배우자·직계존비속에게 양도한 재산은 증여로 추정, 대가를 실제로 받은 사실이 명백하면 제외.
   [상속·증여받은 자산의 취득가액] 소득세법 시행령 제163조 제9항·제10항(2026.10.1 시행본) — 상속·증여 당시 평가액,
        저가 양수로 증여세를 낸 이익은 취득가액에 더함. */
(function (root) {
  'use strict';
  const T = root.JDJ_TAX || (typeof require !== 'undefined' ? require('./tax-engine.js') : null);
  const EOK = 1e8;
  const won = v => Math.floor(v + 1e-6);
  const INH_BRK = [[1e8, 0.10, 0], [5e8, 0.20, 10000000], [10e8, 0.30, 60000000], [30e8, 0.40, 160000000], [Infinity, 0.50, 460000000]];
  const progressive = (base, table) => { if (base <= 0) return 0; for (const [cap, r, d] of table) if (base <= cap) return base * r - d; return 0; };
  const RULE = {
    CHECKED: '2026-11-21',
    LUMP: 5 * EOK, SPOUSE_MIN: 5 * EOK, COHAB_MAX: 6 * EOK, MIN_BASE: 500000, FILING: 0.03,
    LOW_CGT_RATE: 0.05, LOW_CGT_AMT: 3 * EOK,      // 소득세법 시행령 제167조 제3항
    LOW_GIFT_RATE: 0.30, LOW_GIFT_AMT: 3 * EOK,    // 상증법 시행령 제26조 제2항 (적은 금액)
    LOW_ACQ_RATE: 0.30, LOW_ACQ_AMT: 3 * EOK,      // 지방세법 제7조 제11항 제4호 (2026.1.1~)
    ACQ_FAIR_RATE: 0.05, ACQ_FAIR_AMT: 3 * EOK,    // 지방세법 시행령 제18조의2
    ACQ_DEEMED_FROM: '2026-01-01',
    CARRYOVER_YEARS: 10                            // 소득세법 제97조의2
  };

  /* ---------- 저가 양도 판정 ---------- */
  /** market: 시가, price: 실제 받는 대가 */
  function lowPrice(market, price) {
    const diff = Math.max(0, market - price);
    const cgtLine = Math.min(RULE.LOW_CGT_AMT, market * RULE.LOW_CGT_RATE);
    const giftLine = Math.min(RULE.LOW_GIFT_AMT, market * RULE.LOW_GIFT_RATE);
    const cgtAtMarket = diff > 0 && diff >= cgtLine;
    const giftValue = diff > 0 && diff >= giftLine ? won(diff - giftLine) : 0;
    const acqDeemedGift = diff > 0 && (diff >= RULE.LOW_ACQ_AMT || diff >= market * RULE.LOW_ACQ_RATE);
    const acqAtMarket = diff > 0 && (diff >= RULE.ACQ_FAIR_AMT || diff >= market * RULE.ACQ_FAIR_RATE);
    return { diff, cgtLine, giftLine, cgtAtMarket, giftValue, giftTaxed: giftValue > 0, acqDeemedGift, acqAtMarket,
      /* 증여세가 안 붙는 가장 낮은 값(기준금액만큼 싸게) — 이 선에 걸리면 취득세는 증여의제가 될 수 있음 */
      giftFreeMin: Math.ceil((market - giftLine) / 10000) * 10000 };
  }

  /* ---------- 상속세 ----------
     공제(상속세 및 증여세법, 「2026 주택과 세금」 362·370·371·372·374쪽으로 대조, 2026-11-21):
     - 제18조 기초공제 2억 + 제20조 그 밖의 인적공제(자녀 1인 5천만 · 상속인(배우자 제외)·동거가족 중 미성년자 1천만 × 19세까지 연수 ·
       65세 이상 5천만 · 장애인(배우자 포함) 1천만 × 기대여명 연수) ↔ 제21조 일괄공제 5억 중 큰 금액. 배우자 단독상속이면 일괄공제 불가.
     - 제19조 배우자 상속공제: 실제 상속받은 금액(없거나 5억 미만이면 5억), 한도 = Min(상속재산가액 × 법정상속분 − 배우자 사전증여 과세표준, 30억).
       상속재산가액 = 상속재산 + 상속인 사전증여 − 채무(시행령 제17조). 법정상속분(민법 제1009조): 배우자 1.5 : 자녀(없으면 직계존속) 각 1.
       5억 넘게 공제받으려면 신고기한 다음 날부터 9개월 안에 분할·등기(제19조 제2항) — notes 안내.
     - 제22조 금융재산 상속공제: 순금융재산 2천만 이하 전액, 1억 이하 2천만, 초과 20%(2억 한도).
     - 제14조·시행령 제9조 장례비용: 500만 미만이면 500만, 1천만 한도(봉안시설·자연장지 500만 별도 — 미반영). funeral 을 안 넘기면 0.
     - 제23조의2 동거주택 상속공제: 주택가액 − 담보 채무, 6억 한도(요건은 화면 안내).
     - 제24조 공제 종합한도. */
  const INH = { BASIC: 2 * EOK, CHILD: 5e7, MINOR_Y: 1e7, ELDER: 5e7, DISABLED_Y: 1e7, SPOUSE_MAX: 30 * EOK, FIN_MIN: 2e7, FIN_RATE: 0.2, FIN_MAX: 2 * EOK, FUNERAL_MIN: 5e6, FUNERAL_MAX: 1e7 };
  function finDeduction(fin) { fin = Math.max(0, fin || 0); return fin <= INH.FIN_MIN ? fin : Math.min(INH.FIN_MAX, Math.max(INH.FIN_MIN, won(fin * INH.FIN_RATE))); }
  /** p: { house, other, fin(순금융재산), debt, funeral(실제 장례비 — 넘기면 500만~1천만), prior(10년 안 상속인 사전증여), priorDed,
   *       spouse(bool), spouseGets(배우자가 실제 상속받을 금액, 선택), children(자녀 수, 기본 1), parents(자녀가 없을 때 상속받는 직계존속 수),
   *       minorAges([미성년 상속인·동거가족 만 나이]), elderly(65세 이상 상속인(배우자 제외)·동거가족 수), disabledYears(장애인 기대여명 연수 합계),
   *       cohab(bool), houseDebt, filed } */
  function inheritTax(p) {
    const R = { notes: [] };
    const house = p.house || 0, other = Math.max(0, p.other || 0), fin = Math.max(0, p.fin || 0), debt = Math.max(0, p.debt || 0);
    const prior = Math.max(0, p.prior || 0), priorDed = prior ? Math.min(prior, p.priorDed == null ? 5e7 : p.priorDed) : 0;
    const funeralDed = p.funeral == null ? 0 : Math.min(INH.FUNERAL_MAX, Math.max(INH.FUNERAL_MIN, p.funeral || 0));
    const assets = house + other + fin;
    const estate = Math.max(0, assets - debt - funeralDed);
    const gross = estate + prior;
    // 그 밖의 인적공제(제20조)
    const children = p.children == null ? 1 : Math.max(0, Math.floor(p.children));
    const parents = Math.max(0, Math.floor(p.parents || 0));
    const minorYears = (p.minorAges || []).filter(a => a >= 0 && a < 19).reduce((s, a) => s + (19 - Math.floor(a)), 0);
    const pers = { child: children * INH.CHILD, minor: minorYears * INH.MINOR_Y, elder: Math.max(0, Math.floor(p.elderly || 0)) * INH.ELDER,
      disabled: won(Math.max(0, p.disabledYears || 0) * INH.DISABLED_Y) };
    pers.sum = pers.child + pers.minor + pers.elder + pers.disabled;
    const basic = INH.BASIC, items = basic + pers.sum;
    const soleSpouse = !!p.spouse && children === 0 && parents === 0;
    const lumpUsed = !soleSpouse && RULE.LUMP > items;
    const lump = soleSpouse ? items : Math.max(RULE.LUMP, items);
    if (soleSpouse) R.notes.push('배우자 혼자 상속받으면 일괄공제(5억)를 쓸 수 없어 기초공제 2억 + 그 밖의 인적공제로 계산했어요 (제21조 제2항).');
    // 배우자 상속공제(제19조)
    let spouseDed = 0, spouseLimit = 0, spouseShare = 0;
    if (p.spouse) {
      spouseShare = 1.5 / (1.5 + (children > 0 ? children : parents));
      spouseLimit = Math.min(INH.SPOUSE_MAX, won(Math.max(0, assets + prior - debt) * spouseShare));
      const gets = p.spouseGets == null ? 0 : Math.max(0, p.spouseGets);
      spouseDed = Math.max(RULE.SPOUSE_MIN, Math.min(gets, spouseLimit));
      if (gets > spouseLimit && gets > RULE.SPOUSE_MIN) R.notes.push('배우자가 받는 금액이 법정상속분 한도(' + man(spouseLimit) + ')를 넘어 한도까지만 공제했어요 (제19조 제1항).');
      if (spouseDed > RULE.SPOUSE_MIN) R.notes.push('배우자 공제를 5억 원 넘게 받으려면 상속세 신고기한 다음 날부터 9개월 안에 배우자 몫을 나누고 등기·명의이전까지 마쳐야 해요 (제19조 제2항).');
    }
    const finDed = finDeduction(fin);
    const cohabDed = p.cohab ? Math.min(RULE.COHAB_MAX, Math.max(0, house - Math.max(0, p.houseDebt || 0))) : 0;
    // 제24조 제3호 단서: 사전증여재산 과세표준을 빼는 한도는 상속세 과세가액이 5억 원을 넘을 때만 적용
    //   (국세청·행정안전부 「2026 주택과 세금」 374쪽. 2026-11-20 책자 대조로 수정 — 그전에는 5억 이하에도 빼서 공제가 줄었음)
    const limit = Math.max(0, gross - (gross > 5 * EOK ? Math.max(0, prior - priorDed) : 0));
    const dedWant = lump + spouseDed + finDed + cohabDed;
    const ded = Math.min(dedWant, limit);
    let base = Math.max(0, gross - ded);
    if (base < RULE.MIN_BASE) base = 0;
    const calc = won(progressive(base, INH_BRK));
    const priorCalc = prior ? won(progressive(Math.max(0, prior - priorDed), INH_BRK)) : 0;   // 증여세 세율표는 상속세와 같음(상증법 제56조 → 제26조)
    const giftCredit = Math.min(priorCalc, calc);
    const after = calc - giftCredit;
    const filing = p.filed === false ? 0 : won(after * RULE.FILING);
    const tax = after - filing;
    if (dedWant > limit) R.notes.push('공제 합계가 공제 한도(상속세 과세가액 − 미리 증여한 재산)를 넘어 한도까지만 뺐어요 (상속세 및 증여세법 제24조).');
    return Object.assign(R, { assets, estate, prior, gross, funeralDed, basic, pers, items, lumpUsed, soleSpouse, lump, spouseDed, spouseLimit, spouseShare,
      finDed, cohabDed, limit, ded, base, calc, priorCalc, giftCredit, filing, tax,
      rate: base ? INH_BRK.find(([c]) => base <= c)[1] : 0 });
  }
  /** 상속 취득세 — p: { std(시가표준액=공시가격), oneHouse(상속으로 1가구 1주택), over85 } */
  function inheritAcqTax(p) {
    if (!(p.std > 0)) return null;
    const rate = p.oneHouse ? 0.008 : 0.028, eduRate = 0.0016;
    const farmRate = p.over85 && !p.oneHouse ? 0.002 : 0;
    const acq = won(p.std * rate), edu = won(p.std * eduRate), farm = won(p.std * farmRate);
    return { base: p.std, rate, acq, eduRate, edu, farmRate, farm, total: acq + edu + farm, farmUnsure: !!(p.over85 && p.oneHouse) };
  }

  /* ---------- 네 가지 방법 비교 ---------- */
  /**
   * p: { today, market(시가), std(공시가격, 없으면 0), over85, adjNow(지금 조정대상지역),
   *      owner: { acqDate, acqPrice, expenses, residMonths, houses(1|2|3), acqAdj, saleAdj },
   *      child: { minor(bool), houses(받기 전 자녀 세대 주택 수 0~3), prior(10년 안 부모에게 받은 증여) },
   *      low: { price }, gift: { debt }, inh: { other, debt, spouse, cohab } }
   * 반환: { paths:[{ key, owner:{items,total}, recv:{items,total}, cash, ownerKeeps, family, need:[], cautions:[], unsure:[] }], assumptions }
   */
  function compareTransfer(p) {
    const o = p.owner, c = p.child, M = p.market, today = p.today;
    const rel = c.minor ? 'minor' : 'child';
    const childAfter = Math.min(4, (c.houses || 0) + 1);
    const donorOne = o.houses === 1;
    const giftDed = c.minor ? 2e7 : 5e7;
    const prior = Math.max(0, c.prior || 0);
    const priorTax = prior ? won(progressive(Math.max(0, prior - giftDed), INH_BRK)) : 0;
    const cgt = (salePrice, acqPrice, expenses) => T.calcCGT({ acqDate: o.acqDate, acqPrice, saleDate: today, salePrice, expenses: expenses || 0,
      residMonths: o.residMonths || 0, houses: o.houses, acqAdj: !!o.acqAdj, saleAdj: !!o.saleAdj, tempTwo: null });
    const item = (k, v, law, sub) => ({ k, v, law, sub: sub || '' });
    const paths = [];

    /* 1. 제3자에게 시세대로 팔기 */
    {
      const r = cgt(M, o.acqPrice, o.expenses);
      const P = { key: 'sell', owner: { items: [item('양도소득세 + 지방소득세', r.total, '소득세법 제55조·제89조·제95조·제104조, 지방세법 제103조의3', r.exempt === 'full' ? '1세대1주택 비과세' : r.exempt === 'partial' ? '12억 초과분만 과세' : r.heavy ? '다주택 중과 +' + Math.round(r.heavy * 100) + '%p' : '')], total: r.total },
        recv: { items: [], total: 0 }, cash: 0, ownerKeeps: M - r.total, cgt: r, need: [], cautions: [], unsure: [] };
      P.cautions.push('판 돈을 자녀에게 주면 그 돈에 다시 증여세가 붙어요 (상속세 및 증여세법 제53조 공제 넘는 부분).');
      paths.push(P);
    }

    /* 2. 자녀에게 시세보다 싸게 팔기 */
    {
      const price = Math.min(M, Math.max(0, p.low && p.low.price || 0));
      const L = lowPrice(M, price);
      const r = cgt(L.cgtAtMarket ? M : price, o.acqPrice, o.expenses);
      const P = { key: 'low', price, L, cgt: r, need: [], cautions: [], unsure: [] };
      P.owner = { items: [item('양도소득세 + 지방소득세', r.total, '소득세법 제101조, 시행령 제167조 제3항', L.cgtAtMarket ? '시가와 차이가 3억 원 또는 시가의 5% 이상이라 시가 ' + man(M) + '에 판 것으로 계산' : '거래가로 계산 (차이가 시가의 5%·3억 원 미만)')], total: r.total };
      let gift = null;
      if (L.giftValue > 0) gift = T.giftTax({ value: L.giftValue, rel, prior, priorTax, filed: true });
      const giftTax = gift ? gift.tax : 0;
      let acq, acqUnsure = false;
      if (L.acqDeemedGift && today >= RULE.ACQ_DEEMED_FROM) {
        if (p.adjNow && !donorOne && !(p.std > 0)) { acq = null; acqUnsure = true; }
        else { const a = T.giftAcqTax({ value: M, stdPrice: p.std || 0, debt: 0, adj: !!p.adjNow, donorOne, close: true, over85: !!p.over85 }); acq = { total: a.total, sub: '증여로 봐요(차이 3억 원 또는 30% 이상) · ' + a.why + ' · 과세표준 시가 ' + man(M), law: '지방세법 제7조 제11항 제4호(2026.1.1~), 제11조 제1항 제2호, 제13조의2 제2항' }; }
      } else {
        const base = L.acqAtMarket ? M : price;
        const a = T.acqTax({ price: base, houses: childAfter, adj: !!p.adjNow, over85: !!p.over85 });
        acq = { total: a.total, sub: (L.acqAtMarket ? '특수관계인 부당행위라 시가 ' + man(M) + '을 과세표준으로 · ' : '') + a.why, law: '지방세법 제10조의3, 시행령 제18조의2, 제11조 제1항 제8호, 제13조의2' };
      }
      P.recv = { items: [item('증여세 (싸게 산 이익)', giftTax, '상속세 및 증여세법 제35조, 시행령 제26조', L.giftValue > 0 ? '차액 ' + man(L.diff) + ' − 기준 ' + man(L.giftLine) + ' = ' + man(L.giftValue) + '에 과세' : '차액 ' + man(L.diff) + '이 기준(' + man(L.giftLine) + ') 미만이라 0원')], total: giftTax };
      if (acq) { P.recv.items.push(item('취득세 (교육세·농특세 포함)', acq.total, acq.law, acq.sub)); P.recv.total += acq.total; }
      else { P.recv.items.push(item('취득세', null, '지방세법 제13조의2 제2항', '공시가격을 넣어야 3.5%인지 12%인지 정할 수 있어요')); P.unsure.push('공시가격이 없어 자녀 취득세를 계산하지 못했어요.'); }
      P.cash = price + P.recv.total;
      P.ownerKeeps = price - r.total;
      P.need.push('자녀가 실제로 대금 ' + man(price) + '을 부모님 계좌로 보낸 기록');
      P.cautions.push('가족 사이 매매는 증여로 추정돼요. 대금을 실제로 주고받은 기록(계좌 이체)과 자녀의 자금 출처가 있어야 매매로 인정돼요 (상속세 및 증여세법 제44조).');
      if (L.acqDeemedGift) P.cautions.push('2026년 1월 1일 취득분부터 시가와 차이가 3억 원 또는 30% 이상이면 취득세는 증여로 봐서 시가에 3.5%(조정대상지역 다주택 등은 12%)를 내요.');
      if (gift && prior) P.cautions.push('최근 10년 안에 부모님께 받은 증여 ' + man(prior) + '과 합쳐 증여세를 계산했어요 (상속세 및 증여세법 제47조 제2항).');
      if (L.giftValue > 0) P.cautions.push('부모님이 10년 안에 돌아가시면 증여세를 매긴 이익 ' + man(L.giftValue) + '이 상속재산에 다시 더해지고, 그때 낸 증여세는 상속세에서 빼 줘요 (상속세 및 증여세법 제13조 제1항·제28조 — 저가 양수 이익(제35조)은 제47조 제1항의 합산배제 증여재산이 아님).');
      else P.cautions.push('차액이 증여세 기준(' + man(L.giftLine) + ') 미만이라 증여재산이 없어, 나중에 상속이 생겨도 이 거래로 상속재산에 더해지는 금액은 없어요(상속세 및 증여세법 제13조 제1항은 증여재산가액을 더함). 다만 실제 대금을 주고받지 않았으면 전체가 증여로 추정돼요(제44조).');
      if (acqUnsure) P.unsure.push('자녀 취득세(조정대상지역 12% 중과 여부)');
      paths.push(P);
    }

    /* 3. 증여 (전세보증금·대출을 함께 넘기면 부담부증여) */
    {
      const debt = Math.min(Math.max(0, p.gift && p.gift.debt || 0), M - 1);
      const g = T.giftTax({ value: M, debt, rel, prior, priorTax, filed: true });
      const P = { key: 'gift', debt, gift: g, need: [], cautions: [], unsure: [] };
      let acqTotal = null;
      if (p.adjNow && !donorOne && !(p.std > 0)) P.unsure.push('공시가격이 없어 자녀 취득세(3.5% 또는 12%)를 계산하지 못했어요.');
      else { const a = T.giftAcqTax({ value: M, stdPrice: p.std || 0, debt, adj: !!p.adjNow, donorOne, close: true, over85: !!p.over85, recvHouses: childAfter }); acqTotal = a.total; P.acq = a; }
      P.recv = { items: [item('증여세', g.tax, '상속세 및 증여세법 제47조·제53조·제56조·제69조', (debt ? '시가 − 넘긴 채무 ' + man(debt) + ' = ' + man(g.net) + ' · ' : '') + '공제 ' + man(g.ded) + (prior ? ' (10년 합산)' : '') + ' · 신고세액공제 3% 반영'),
        item('취득세 (교육세·농특세 포함)', acqTotal, '지방세법 제10조의2, 제11조 제1항 제2호, 제13조의2 제2항', acqTotal == null ? '공시가격을 넣어 주세요' : P.acq.why + (debt ? ' · 채무 부분은 유상취득 세율' : ''))], total: g.tax + (acqTotal || 0) };
      let ownerTotal = 0, ownerSub = '증여하는 쪽은 세금이 없어요';
      if (debt > 0) {
        const full = cgt(M, o.acqPrice, o.expenses);
        const dg = T.giftDebtGain(M, debt, o.acqPrice);
        if (full.exemptOK && M <= T.CONST.HIGH_PRICE) { ownerSub = '넘긴 채무 부분도 1세대1주택 비과세(집값 12억 원 이하)'; }
        else if (full.exemptOK) { ownerTotal = null; ownerSub = '12억 원 넘는 1주택의 부담부증여는 세무사 확인 필요'; P.unsure.push('부모님 양도세(12억 원 넘는 1세대1주택의 채무 부분)'); }
        else { const r = cgt(debt, dg.acqPrice, won((o.expenses || 0) * dg.share)); ownerTotal = r.total; ownerSub = '채무 ' + man(debt) + '을 양도가액, 취득가 × ' + (Math.round(dg.share * 1000) / 10) + '%를 취득가액으로' + (r.heavy ? ' · 중과 +' + Math.round(r.heavy * 100) + '%p' : ''); P.debtCgt = r; }
      }
      P.owner = { items: [item(debt ? '양도소득세 (넘긴 채무 부분)' : '증여하는 쪽 세금', ownerTotal, debt ? '소득세법 제88조 제1호, 시행령 제159조' : '상속세 및 증여세법 제4조의2(증여세는 받는 사람이 냄)', ownerSub)], total: ownerTotal };
      P.cash = acqTotal == null ? null : P.recv.total;
      P.ownerKeeps = 0;
      if (debt) P.need.push('자녀가 넘겨받은 채무 ' + man(debt) + '을 앞으로 직접 갚아야 해요 (국세청이 사후관리)');
      P.cautions.push('증여세는 받는 사람이 현금으로 내요. 부모님이 대신 내 주면 그 돈도 증여로 봐요.');
      P.cautions.push('증여받은 집을 ' + RULE.CARRYOVER_YEARS + '년 안에 팔면 부모님이 산 값을 취득가로 계산해 양도세가 커질 수 있어요 (소득세법 제97조의2 이월과세).');
      P.cautions.push('증여 뒤 10년 안에 부모님이 돌아가시면 이 집이 상속재산에 다시 합쳐져요(그때 낸 증여세는 빼 줌, 상속세 및 증여세법 제13조·제28조).');
      P.cautions.push('같은 분(부모님은 두 분을 한 사람으로 봄)에게 10년 안에 받은 증여는 합쳐서 계산하고 공제(성년 5천만·미성년 2천만 원)도 10년에 한 번이에요 (제47조 제2항, 제53조).');
      P.cautions.push('배우자에게 주면 10년 합산 6억 원까지 공제돼요 (제53조) — 이 비교는 자녀에게 넘기는 경우만 계산했어요.');
      paths.push(P);
    }

    /* 4. 상속까지 보유 */
    {
      const inh = p.inh || {};
      const it = inheritTax({ house: M, other: inh.other, fin: inh.fin, debt: inh.debt, funeral: inh.funeral, prior, priorDed: prior ? giftDed : 0, spouse: !!inh.spouse, spouseGets: inh.spouseGets,
        children: inh.children, parents: inh.parents, minorAges: inh.minorAges, elderly: inh.elderly, disabledYears: inh.disabledYears,
        cohab: !!inh.cohab && (c.houses || 0) === 0, filed: true });
      const ia = inheritAcqTax({ std: p.std, oneHouse: (c.houses || 0) === 0, over85: !!p.over85 });
      const P = { key: 'inherit', inh: it, iacq: ia, need: [], cautions: [], unsure: [] };
      P.recv = { items: [item('상속세', it.tax, '상속세 및 증여세법 제13조·제14조·제18조~제22조·제23조의2·제24조·제26조·제69조',
        '공제 ' + man(it.ded) + ' (' + dedText(it) + ')' + (it.funeralDed ? ' · 장례비 ' + man(it.funeralDed) + ' 차감' : '') + (it.giftCredit ? ' · 미리 낸 증여세 빼 줌' : '')),
        item('취득세 (교육세·농특세 포함)', ia ? ia.total : null, '지방세법 제10조의2 제2항, 제11조 제1항 제1호, 제15조 제1항', ia ? (ia.rate === 0.008 ? '상속으로 1가구 1주택 특례 0.8%' : '상속 2.8%') + ' · 과세표준 공시가격 ' + man(ia.base) : '공시가격을 넣어 주세요(상속 취득세는 공시가격 기준)')],
        total: it.tax + (ia ? ia.total : 0) };
      if (!ia) P.unsure.push('공시가격이 없어 상속 취득세를 계산하지 못했어요.');
      if (inh.cohab && (c.houses || 0) > 0) P.unsure.push('자녀 세대에 집이 있어 동거주택 상속공제(상속인 무주택 요건)를 빼고 계산했어요');
      if (ia && ia.farmUnsure) P.unsure.push('85㎡ 초과 주택 상속 1주택 특례 때 농어촌특별세(0원으로 둠)');
      // 보유하는 동안 매년 보유세(올해 기준) — 1주택이고 공시가격이 있을 때만
      let hold = null;
      if (p.std > 0 && donorOne) { const pt = T.propertyTax({ price: p.std, one: true }), ct = T.compTax({ prices: [p.std], one: true, age: 0, years: 0 }); hold = { prop: pt.total, comp: ct.total, total: pt.total + ct.total }; }
      P.hold = hold;
      P.owner = { items: [item('지금 낼 세금', 0, '', '대신 보유하는 동안 해마다 보유세를 내요'),
        item('해마다 내는 보유세 (올해 기준, 재산세+종부세)', hold ? hold.total : null, '지방세법 제110조·제111조, 종합부동산세법 제8조·제9조', hold ? '1세대1주택, 나이·보유 세액공제 없이' : (p.std > 0 ? '다른 집 공시가격까지 있어야 계산돼요' : '공시가격을 넣으면 계산돼요'))], total: 0 };
      P.cash = ia ? P.recv.total : null;
      P.ownerKeeps = 0;
      P.cautions.push('상속세는 집만이 아니라 돌아가신 분의 모든 재산(예금·다른 부동산 등)을 합쳐 계산해요. 다른 재산을 넣지 않으면 실제보다 적게 나와요.');
      P.cautions.push('상속 당시 시세로 평가해요(상속세 및 증여세법 제60조). 그때까지 집값이 오르면 상속세도 늘어요.');
      it.notes.forEach(n => P.cautions.push(n));
      if (it.spouseDed && !(inh.spouseGets > 0)) P.cautions.push('배우자 공제는 배우자가 실제 상속받은 금액(법정상속분 한도 ' + man(it.spouseLimit) + ', 최대 30억 원)만큼 늘 수 있어요. 배우자가 받을 금액을 넣지 않아 최소 5억 원으로 계산했어요 (제19조).');
      if (inh.cohab) P.cautions.push('동거주택 상속공제는 ① 돌아가신 분과 자녀가 상속 전 10년 이상(자녀가 미성년인 기간 제외) 계속 한집에 살았고 ② 그 10년 동안 1세대 1주택이었으며 ③ 상속받는 자녀가 상속일에 무주택이어야 받아요 (제23조의2, 「주택과 세금」 372쪽).');
      P.cautions.push('상속받은 집은 상속 당시 평가액이 취득가가 돼 나중에 팔 때 양도세가 줄어요 (소득세법 시행령 제163조 제9항).');
      P.cautions.push('상속세가 2천만 원을 넘으면 나눠 내는 연부연납을 신청할 수 있어요 (상속세 및 증여세법 제71조).');
      paths.push(P);
    }

    paths.forEach(P => {
      P.family = (P.owner.total == null || P.recv.items.some(x => x.v == null)) ? null : P.owner.total + P.recv.total;
    });
    const done = paths.filter(P => P.family != null);
    const best = done.length ? done.reduce((a, b) => (b.family < a.family ? b : a)) : null;
    const assumptions = [
      '오늘(' + today + ') 시세 ' + man(M) + '으로 넘긴다고 가정했어요. 상속은 그때 시세로 평가하니 실제로는 달라져요.',
      '받는 사람은 ' + (c.minor ? '미성년' : '성년') + ' 자녀 한 명, 넘기기 전 자녀 세대 주택 ' + (c.houses || 0) + '채예요.' + ((c.houses || 0) === 0 ? ' 그래서 상속 취득세는 1가구 1주택 특례(0.8%)로 계산했어요.' : ''),
      '부모님 세대 주택 ' + (o.houses >= 3 ? '3채 이상' : o.houses + '채') + ', 증여세·상속세는 기한 안에 신고(3% 공제)한다고 가정했어요.',
      '2026년 11월 21일 현재 시행 법령으로 계산했어요. 국회에서 논의 중인 상속세 공제 확대·유산취득세 전환, 2026년 세제개편안은 넣지 않았어요.'
    ];
    return { paths, best, assumptions, rule: RULE };
  }
  /** 상속공제 내역 한 줄 */
  function dedText(it) {
    const parts = [];
    if (it.soleSpouse) parts.push('기초 2억 + 인적 ' + man(it.pers.sum));
    else if (it.lumpUsed) parts.push('일괄 5억');
    else parts.push('기초 2억 + 인적 ' + man(it.pers.sum) + ' (일괄 5억보다 큼)');
    if (it.spouseDed) parts.push('배우자 ' + man(it.spouseDed));
    if (it.finDed) parts.push('금융재산 ' + man(it.finDed));
    if (it.cohabDed) parts.push('동거주택 ' + man(it.cohabDed));
    return parts.join(' + ');
  }
  function man(v) {
    const w = Math.round(Math.abs(v) / 10000), e = Math.floor(w / 10000), m = w % 10000;
    return (v < 0 ? '−' : '') + (e ? e.toLocaleString('ko-KR') + '억' + (m ? ' ' : '') : '') + (m || !e ? m.toLocaleString('ko-KR') + '만' : '') + ' 원';
  }

  const API = { lowPrice, inheritTax, inheritAcqTax, finDeduction, compareTransfer, man, RULE, INH, INH_BRK };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_XFER = API;
})(typeof self !== 'undefined' ? self : this);
