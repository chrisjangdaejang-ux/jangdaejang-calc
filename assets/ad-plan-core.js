/* 집코드 '광고 설계 도우미'(/ad/plan/) 계산 — 화면·테스트(tools/ad-plan-test.js) 공용, DOM 없음.
   - 가격은 assets/ad-prices.js(PRICES) 한 곳에서 읽어요. 하루 단위는 없고 1주부터.
   - 자리별 받을 수 있는 업종은 assets/ad-slot.js 의 CATS(= docs/ad_slots.md 표)와 /ad/ 업종 심사를 그대로 따라요. 맞는 자리만 조합해요.
   - 숫자를 지어내지 않아요: 노출·클릭 수는 실제 집계(stats)가 있을 때만, 브리핑 구독자 수는 서버 공개 집계(10명 미만이면 없음)일 때만 보여 줘요.
   - 구성안 3개(오래 노출·넓게 노출·집중 노출)와 [추천]. '최고 효율'은 실제 최근 4주 클릭당 비용이 있을 때만.
   window.JDJ_ADPLAN = { INDUSTRIES, PURPOSES, PERIODS, ITEMS, plan, formFill, budgetFor } */
(function (root) {
  'use strict';
  var PR = root.JDJ_AD_PRICES || (typeof require === 'function' ? require('./ad-prices.js') : null);
  var SL = root.JDJ_ADSLOT || (typeof require === 'function' ? require('./ad-slot.js') : null);

  var INDUSTRIES = [
    { id: 'dev', label: '시행사·분양대행사', ind: ['시행사', '분양대행사'] },
    { id: 'broker', label: '공인중개사', ind: [], local: true },
    { id: 'tax', label: '세무사', ind: ['세무사'], only: ['tax'], local: true },          // 세무사: 세금 화면만, 정액 광고만(세무사법)
    { id: 'law', label: '법무사', ind: ['법무사'], local: true },
    { id: 'loan', label: '대출 상담', ind: ['대출 상담'] },
    { id: 'guar', label: '보증보험', ind: ['보증보험'] },
    { id: 'move', label: '이사·인테리어', ind: ['이사', '인테리어'], local: true },
    { id: 'etc', label: '기타', ind: [] }
  ];
  var PURPOSES = [
    { id: 'bunyang', label: '분양 현장 알리기', region: 'sido' },
    { id: 'consult', label: '상담 문의 받기' },
    { id: 'brand', label: '브랜드 알리기' },
    { id: 'region', label: '특정 지역 고객 모으기', region: 'sgg' }
  ];
  var PERIODS = [1, 2, 4, 8];   // 주 (고르는 기간)
  var LONG = [52, 26, 12, 8, 4, 2, 1];   // 52주(1년)·26주(6개월)·12주(3개월)는 장기 할인 금액(ad-prices.js longWeeks·period)으로 계산 
  var QUICK = [30, 50, 100, 200, 300];   // 만 원

  /* 자리 목록. cat 이 있으면 광고 칸(ad-slot.js CATS 업종 규칙), ind 가 있으면 그 상품의 업종 규칙(/ad/ 상품 설명).
     score: 목적별 효과 순서(클수록 먼저). why: 목적별 쉬운 이유(없으면 why.all) */
  var ITEMS = [
    { id: 'bun_list', prod: 'bunyang', name: '분양 목록 맨 위 카드', where: '분양 화면에서 고른 지역의 공고 목록 바로 위', key: 'bunyang', kind: 'weeks', ind: ['시행사', '분양대행사'], region: 'sido',
      score: { bunyang: 100, consult: 75, brand: 45, region: 70 },
      why: { bunyang: '분양 화면에서 그 지역 공고를 찾아보는 사람에게 목록 바로 위에 보여요. 지금 분양을 알아보는 사람이라 현장 광고에 가장 잘 맞아요.',
        all: '분양 화면에서 그 지역 공고를 보는 사람에게 보여요.' } },
    { id: 'chungyak_top', prod: 'cat_top', name: '청약 화면 상단 한 줄 배너', where: '청약 화면 제목 바로 아래', key: 'cat_top_bun', kind: 'weeks', cat: 'chungyak',
      score: { bunyang: 92, consult: 60, brand: 55, region: 30 },
      why: { bunyang: '청약 화면은 지금 분양을 알아보는 사람이 보는 곳이라 분양 현장 광고에 잘 맞아요.', all: '청약 가점을 계산하러 온 사람이 처음 보는 자리예요.' } },
    { id: 'bunyang_top', prod: 'cat_top', name: '분양 화면 상단 한 줄 배너', where: '분양 화면 제목 바로 아래', key: 'cat_top_bun', kind: 'weeks', cat: 'bunyang',
      score: { bunyang: 88, consult: 55, brand: 55, region: 30 },
      why: { all: '분양 공고를 둘러보러 온 사람이 화면을 열자마자 보는 자리예요.' } },
    { id: 'map_pin', prod: 'bunyang_pro', name: '지도 프리미엄 분양 마커', where: '시세 지도에서 현장 주변을 볼 때 현장 위치에', key: 'bunyang_pin', kind: 'tier', ind: ['시행사', '분양대행사'], region: 'sgg',
      score: { bunyang: 70, consult: 50, brand: 50, region: 85 },
      why: { region: '현장 주변 지도를 보는 사람에게 현장 위치가 바로 보여요. 그 동네에 관심 있는 사람을 모으기 좋아요.', all: '현장 주변 지도를 보는 사람에게 현장 위치가 바로 보여요.' } },
    { id: 'home_top', prod: 'home_top', name: '홈 상단 한 줄 배너', where: '첫 화면 소개 글 바로 아래(가장 많이 보는 자리)', key: 'home_top', kind: 'weeks', cat: 'home',
      score: { bunyang: 50, consult: 40, brand: 100, region: 20 },
      why: { brand: '모든 방문자가 처음 여는 화면이라 이름을 알리기에 가장 좋아요.', all: '모든 방문자가 처음 여는 화면이에요. 대신 관심 분야가 섞여 있어요.' } },
    { id: 'brief', prod: 'brief_ad', name: '모닝 브리핑 지면 광고', where: '매일 아침 브리핑 메일·웹 브리핑 맨 아래(하루 1개 광고주)', key: 'brief_ad', kind: 'weeks', cat: 'brief', stat: 'brief',
      score: { bunyang: 72, consult: 55, brand: 75, region: 40 },
      why: { all: '매일 아침 시장을 챙겨 보는 구독자가 읽는 자리예요. 결정을 앞둔 사람이 많아요.' } },
    { id: 'jeonse_sponsor', prod: 'jeonse', name: '전세사기 체크리스트 아래 카드', where: '전세사기 예방 체크리스트 다음(업종당 1곳 단독)', key: 'jeonse', kind: 'tier', cat: 'jeonse', ind: ['보증보험', '법무사'],
      score: { consult: 96, brand: 80, region: 40 },
      why: { all: '전세 계약 직전의 세입자가 위험 신호를 확인한 바로 다음에 보는 자리라, 보증·등기 상담이 가장 필요한 때예요.' } },
    { id: 'tax_end', prod: 'native', name: '세금 화면 아래 카드', where: '세금 계산을 다 한 뒤, 모든 계산 화면 아래(계산 결과와 떨어진 곳)', key: 'native', kind: 'tier', regional: true, cat: 'tax',
      score: { consult: 95, brand: 60, region: 40 },
      why: { consult: '세금을 직접 계산해 본 사람이 "전문가에게 물어볼까" 하는 때에 보이는 자리예요.', all: '세금을 계산해 본 사람이 보는 자리예요.' } },
    { id: 'tax_top', prod: 'cat_top', name: '세금 화면 상단 한 줄 배너', where: '세금 계산기 첫 화면 제목 아래(입력·결과 화면에는 없음)', key: 'cat_top', kind: 'weeks', cat: 'tax',
      score: { consult: 85, brand: 90, region: 30 },
      why: { all: '세금 계산기를 연 사람이 처음 보는 자리예요. 세금이 궁금한 사람만 모여요.' } },
    { id: 'jeonse_top', prod: 'cat_top', name: '전월세 화면 상단 한 줄 배너', where: '전월세 화면 제목 바로 아래', key: 'cat_top', kind: 'weeks', cat: 'jeonse',
      score: { consult: 80, brand: 85, region: 30 },
      why: { all: '전세·월세 계약을 앞둔 사람이 처음 보는 자리예요.' } },
    { id: 'jeonse_end', prod: 'native', name: '전월세 결과 아래 카드', where: '전월세 시세 결과를 다 본 뒤', key: 'native', kind: 'tier', regional: true, cat: 'jeonse',
      score: { consult: 88, brand: 50, region: 35 },
      why: { all: '우리 집 전세 시세를 확인한 사람이 다음 할 일을 찾는 때에 보여요.' } },
    { id: 'mine_end', prod: 'native', name: '내 집 시세 결과 아래 카드', where: '내 집 시세·전망 결과를 다 본 뒤', key: 'native', kind: 'tier', regional: true, cat: 'mine',
      score: { consult: 84, brand: 50, region: 35 },
      why: { all: '집을 가진 사람이 시세를 확인한 다음에 보는 자리예요. 대출·이사·세금 상담과 잘 맞아요.' } },
    { id: 'switch_top', prod: 'cat_top', name: '갈아타기 화면 상단 한 줄 배너', where: '갈아타기 화면 제목 아래, 입력 칸 위', key: 'cat_top', kind: 'weeks', cat: 'switch',
      score: { consult: 75, brand: 70, region: 25 },
      why: { all: '지금 집을 팔고 새 집으로 옮기려는 사람이 보는 자리예요. 대출·이사 수요가 커요.' } },
    { id: 'report_end', prod: 'native', name: '내 집 마련 리포트 아래 카드', where: '내 집 마련 계산·리포트를 다 본 뒤', key: 'native', kind: 'tier', regional: true, cat: 'report',
      score: { bunyang: 40, consult: 86, brand: 45, region: 30 },
      why: { all: '살 수 있는 집과 대출을 계산해 본 사람이 보는 자리예요. 대출 상담과 가장 잘 맞아요.' } },
    { id: 'chungyak_end', prod: 'native', name: '청약 결과 아래 카드', where: '청약 가점·당첨 가능성 결과를 다 본 뒤', key: 'native', kind: 'tier', regional: true, cat: 'chungyak',
      score: { bunyang: 80, consult: 65, brand: 40, region: 30 },
      why: { all: '내 청약 가점을 확인한 사람이 "어디에 넣을까" 고민하는 때에 보여요.' } },
    { id: 'villa_top', prod: 'cat_top', name: '빌라·재개발 화면 상단 한 줄 배너', where: '빌라·재개발 화면 제목 아래', key: 'cat_top', kind: 'weeks', cat: 'villa',
      score: { consult: 70, brand: 75, region: 30 },
      why: { all: '빌라를 사기 전에 재개발 가능성을 확인하는 사람이 보는 자리예요.' } },
    { id: 'map_top', prod: 'cat_top', name: '지도 화면 상단 한 줄 배너', where: '지도 검색·보기 버튼 아래', key: 'cat_top', kind: 'weeks', cat: 'map',
      score: { bunyang: 55, consult: 40, brand: 70, region: 30 },
      why: { all: '시세 지도를 둘러보는 사람이 계속 보는 자리예요.' } },
    { id: 'rank_top', prod: 'cat_top', name: '순위 화면 상단 한 줄 배너', where: '순위 화면 제목 아래', key: 'cat_top', kind: 'weeks', cat: 'rank',
      score: { bunyang: 52, consult: 35, brand: 65, region: 25 },
      why: { all: '우리 구 순위를 보러 온 사람이 처음 보는 자리예요.' } },
    { id: 'ask_end', prod: 'native', name: '단지 비교 결과 아래 카드', where: '단지 비교 결과를 다 본 뒤', key: 'native', kind: 'tier', regional: true, cat: 'ask',
      score: { consult: 78, brand: 40, region: 25 },
      why: { all: '살 단지를 두고 비교하는 사람이 결과를 다 본 다음 보는 자리예요.' } },
    { id: 'land_end', prod: 'native', name: '땅 위험 신호 결과 아래 카드', where: '땅 위험 신호 결과를 다 본 뒤', key: 'native', kind: 'tier', regional: true, cat: 'land',
      score: { consult: 82, brand: 40, region: 25 },
      why: { all: '땅을 사기 전에 위험 신호를 확인한 사람이 보는 자리예요. 감정평가·법률 상담과 잘 맞아요.' } }
  ];

  function indOf(id) { for (var i = 0; i < INDUSTRIES.length; i++) if (INDUSTRIES[i].id === id) return INDUSTRIES[i]; return null; }
  function purOf(id) { for (var i = 0; i < PURPOSES.length; i++) if (PURPOSES[i].id === id) return PURPOSES[i]; return null; }
  /** 이 업종이 이 자리에 실릴 수 있는지 — 광고 칸 규칙(CATS) + 상품 업종 + 업종별 화면 제한. 이사·인테리어처럼 여러 업종이면 모두 받는 자리만 */
  function allowedFor(industry, it) {
    var I = indOf(industry); if (!I || !I.ind.length) return false;
    if (I.only && (!it.cat || I.only.indexOf(it.cat) < 0)) return false;
    var ok = function (list) { return I.ind.every(function (x) { return list.indexOf(x) >= 0; }); };
    if (it.cat) { var C = SL && SL.CATS[it.cat]; if (!C || !ok(C.ind)) return false; }
    if (it.ind && !ok(it.ind)) return false;
    if (SL && SL.BLOCK.some(function (b) { return I.ind.some(function (x) { return x.indexOf(b) >= 0; }); })) return false;
    return true;
  }
  /** 지역 단가를 쓸지: 동네 업체(세무사·법무사·중개사·이사·인테리어)이거나 목적이 '특정 지역'일 때, 고른 지역 범위(시·군·구 > 시·도) */
  function scopeOf(q) {
    var I = indOf(q.industry) || {};
    if (!(I.local || q.purpose === 'region')) return '';
    return q.sgg ? 'sgg' : q.sido ? 'sido' : '';
  }
  var TIER_IX = { '': 0, sido: 1, sgg: 2 };
  /** 자리 n주 금액(원). 결과 아래 카드는 지역 단가(전국·시·도·시·군·구, 광고 칸이 그 지역 화면에 먼저 보여 줌), 나머지는 전국 */
  function priceOf(it, n, scope) {
    var P = PR.PRICES[it.key]; if (!P) return null;
    if (it.kind === 'weeks') return PR.weeksPrice(P, n);
    if (it.kind === 'tier') { var t = P.tiers && P.tiers[it.regional ? (TIER_IX[scope || ''] || 0) : 0]; return t ? PR.tierWeeks(t.month, n) : null; }
    return null;
  }
  function tierLabel(it, scope) { return it.regional && scope ? (scope === 'sgg' ? '시·군·구 단가' : '시·도 단가') : ''; }
  /** 이번 광고에 쓸 돈(총액, 만 원 → 원). 기간과 관계없이 이 금액을 넘는 구성은 만들지 않아요 */
  function budgetFor(totalMan) { return Math.max(0, Math.round(+totalMan || 0)) * 10000; }

  function statOf(it, stats) {
    stats = stats || {};
    var s = stats.slots && stats.slots[it.id];
    return s && s.weeks === 4 && s.views > 0 ? s : null;
  }
  function statLine(it, stats) {
    var s = statOf(it, stats);
    if (s) return '최근 4주 실제 노출 ' + s.views.toLocaleString('ko-KR') + '회' + (s.clicks > 0 ? ' · 누름 ' + s.clicks.toLocaleString('ko-KR') + '회' : '');
    if (it.stat === 'brief' && (stats || {}).briefSubs >= 10) return '지금 구독자 ' + stats.briefSubs.toLocaleString('ko-KR') + '명(실제 집계)';
    return '';
  }
  var isTop = function (it) { return /_top$/.test(it.id); };
  /* 후보 → 예산 B 안에서 순서대로 채움(같은 자리 한 번, 최대 5곳) */
  function fillPlan(list, n, B, U, scope, stats) {
    var items = [], left = B;
    list.forEach(function (c) {
      var cost = priceOf(c, n, scope);
      if (!(cost > 0) || items.length >= 5 || cost > left) return;
      left -= cost;
      items.push({ id: c.id, prod: c.prod, name: c.name, where: c.where, weeks: n, cost: cost, tier: tierLabel(c, scope),
        why: c.why[U.id] || c.why.all, stat: statLine(c, stats), soon: !!(PR.PRICES[c.key] || {}).soon });
    });
    return { items: items, total: B - left, left: left, weeks: n };
  }
  /* 실제 클릭당 비용: 구성의 모든 자리에 최근 4주 실제 누름이 있을 때만(기간에 맞춰 누름 수를 늘려 셈) */
  function cpcOf(pl, stats) {
    if (!pl.items.length) return null;
    var clicks = 0;
    for (var i = 0; i < pl.items.length; i++) {
      var s = statOf(ITEMS.filter(function (it) { return it.id === pl.items[i].id; })[0], stats);
      if (!s || !(s.clicks > 0)) return null;
      clicks += s.clicks * (pl.items[i].weeks / 4);
    }
    return Math.round(pl.total / clicks);
  }

  /**
   * 추천 구성안 3개. q = { industry, purpose, totalMan(광고에 쓸 돈 총액, 만 원, VAT 별도), weeks(원하는 기간 1·2·4·8주), sido, sgg, soon('near'|'far'|'') — 분양 목적일 때 청약 접수가 4주 안인지 }
   * stats(선택) = { slots: {자리 id: {weeks:4, views, clicks}}, briefSubs }
   * → { ok, kind: 'items'|'broker'|'etc'|'short'|'none', budget, weeks, scope, plans:[{id:'long'|'wide'|'focus', label, head, items, total, left, weeks, cpc}],
   *     rec, recWhy, best(실제 클릭당 비용이 가장 낮은 안 id, 측정값 없으면 null), cheapest, shorter, adTarget }
   */
  function plan(q, stats, extra) {
    q = q || {}; extra = extra || {};
    var I = indOf(q.industry), U = purOf(q.purpose), n = PERIODS.indexOf(+q.weeks) >= 0 ? +q.weeks : 4, budget = budgetFor(q.totalMan), scope = scopeOf(q);
    var out = { ok: false, kind: 'items', plans: [], items: [], total: 0, left: budget, budget: budget, weeks: n, scope: scope, rec: '', recWhy: '', best: null };
    if (!I || !U) { out.kind = 'none'; return out; }
    if (I.id === 'etc') { out.kind = 'etc'; return out; }
    if (I.id === 'broker') {   // 공인중개사: 광고 칸이 아니라 지역 제휴 중개사(1년 결제). 1년 금액이 총액 안이어야
      out.kind = 'broker';
      var plans = (PR.PRICES.agent && PR.PRICES.agent.plans) || [];
      var fit = plans.filter(function (p) { return p.year <= budgetFor(q.totalMan); });   // 1년 결제 금액이 총액 안
      out.plans = plans; out.pick = fit.length ? fit[fit.length - 1] : null; out.ok = !!out.pick;
      out.cheapest = plans.length ? plans[0] : null;
      return out;
    }
    var cands = ITEMS.filter(function (it) { return allowedFor(I.id, it) && (it.score[U.id] || 0) > 0; });
    var byScore = cands.slice().sort(function (a, b) { return (b.score[U.id] - a.score[U.id]) || (priceOf(a, n, scope) - priceOf(b, n, scope)); });
    /* 1) 오래 노출: 같은 총액(budget)으로 가장 긴 기간(원하는 기간 이상) — 긴 기간부터 효과 순으로 채워 보고 한 곳이라도 들어가면 그 기간 */
    var long = null;
    for (var k = 0; k < LONG.length && !long; k++) { var W = LONG[k]; if (W < n) continue; var t = fillPlan(byScore, W, budget, U, scope, stats); if (t.items.length) long = t; }
    /* 2) 넓게 노출: 고른 기간에 가장 많은 자리 — 싼 자리부터(같으면 효과 순) */
    var wide = fillPlan(cands.slice().sort(function (a, b) { return (priceOf(a, n, scope) - priceOf(b, n, scope)) || (b.score[U.id] - a.score[U.id]); }), n, budget, U, scope, stats);
    /* 3) 집중 노출: 고른 기간에 가장 눈에 띄는 자리 — 위쪽 한 줄 배너 먼저(효과 순), 그다음 나머지 */
    var focus = fillPlan(byScore.filter(isTop).concat(byScore.filter(function (it) { return !isTop(it); })), n, budget, U, scope, stats);
    var won1 = function (x) { return won(x); };
    if (long) out.plans.push(Object.assign({ id: 'long', label: '오래 노출', head: won(budget) + '으로 최대 ' + long.weeks + '주 동안 실려요' }, long));
    if (wide.items.length) out.plans.push(Object.assign({ id: 'wide', label: '넓게 노출', head: wide.weeks + '주 동안 자리 ' + wide.items.length + '곳에 실려요' }, wide));
    if (focus.items.length) out.plans.push(Object.assign({ id: 'focus', label: '집중 노출', head: focus.weeks + '주 동안 ' + (focus.items.some(function (x) { return /_top$/.test(x.id); }) ? '상단 배너 위주로 눈에 띄게' : '가장 잘 맞는 자리에') + ' 실려요' }, focus));
    /* 구성이 같은 안은 하나로 합침(제목 '넓게·집중 노출'처럼). 합친 안의 id 는 맨 앞 안, ids 에 모두 */
    var merged = [];
    out.plans.forEach(function (p) {
      var sig = p.items.map(function (x) { return x.id + '@' + x.weeks + '@' + x.cost; }).join('|');
      var same = merged.filter(function (m) { return m.sig === sig; })[0];
      if (!same) { p.sig = sig; p.ids = [p.id]; merged.push(p); return; }
      same.ids.push(p.id);
      same.label = same.ids.map(function (id) { return { long: '오래', wide: '넓게', focus: '집중' }[id]; }).join('·') + ' 노출';
    });
    out.plans = merged;
    out.plans.forEach(function (p) { p.cpc = cpcOf(p, stats); delete p.sig; });
    var planOf = function (id) { return out.plans.filter(function (p) { return p.ids.indexOf(id) >= 0; })[0]; };
    out.ok = out.plans.length > 0;
    if (out.ok) {
      var near = U.id === 'bunyang' && q.soon === 'near' && !!planOf('focus');
      out.rec = (planOf(near ? 'focus' : 'long') || out.plans[0]).id;
      out.recWhy = near ? '청약 접수 전 짧은 기간에 많이 보이는 게 중요해요.' : planOf('long') && planOf('long').id === out.rec ? '처음 광고하시면 오래 실어 반응을 보는 게 좋아요.' : '';
      /* '최고 효율'은 실제 클릭당 비용이 두 안 이상에서 측정되고 가장 낮은 안이 하나일 때만 */
      var m = out.plans.filter(function (p) { return p.cpc > 0; }).sort(function (a, b) { return a.cpc - b.cpc; });
      if (m.length >= 2 && m[0].cpc < m[1].cpc) out.best = m[0].id;
      var R = out.plans.filter(function (p) { return p.id === out.rec; })[0];
      out.items = R.items; out.total = R.total; out.left = R.left;
    } else {
      out.kind = 'short';
      if ((I.local || U.id === 'region') && !scope) { var nt = PR.PRICES.native && PR.PRICES.native.tiers; if (nt && nt[2]) out.regionHint = { month: nt[2].month, sidoMonth: nt[1] && nt[1].month }; }
      var cheap = cands.map(function (c) { return { c: c, cost: priceOf(c, n, scope) }; }).filter(function (x) { return x.cost > 0; }).sort(function (a, b) { return a.cost - b.cost; })[0];
      if (cheap) out.cheapest = { name: cheap.c.name, weeks: n, cost: cheap.cost };
      for (var j = PERIODS.indexOf(n) - 1; j >= 0 && !out.shorter; j--) {
        var w = PERIODS[j], best = null;
        cands.forEach(function (c) { var p = priceOf(c, w, scope); if (p > 0 && p <= budgetFor(q.totalMan) && (!best || c.score[U.id] > best.s)) best = { s: c.score[U.id], weeks: w, name: c.name, cost: p }; });
        if (best) out.shorter = { weeks: best.weeks, name: best.name, cost: best.cost };
      }
      if (!cands.length) out.kind = 'none';
    }
    if (U.id === 'bunyang' && I.id === 'dev') out.adTarget = extra.adTarget || { price: null };
    return out;
  }

  /** [이 구성으로 문의하기] → /ad/ 문의 폼에 채울 값 */
  var PERIOD_TXT = { 1: '1주', 2: '2주', 4: '1개월', 8: '8주(2개월)', 12: '3개월', 26: '6개월', 52: '1년' };   // /ad/ 문의 폼 희망 기간 목록과 같게(서버 v38 AQ_PERIOD)
  function won(n) { n = Math.round(+n || 0); var m = n / 10000; return (Number.isInteger(m) ? m.toLocaleString('ko-KR') : String(+m.toFixed(1))) + '만 원'; }
  /** r: plan() 결과(추천 안) 또는 그 안의 구성안 하나(plans[i]) */
  function formFill(q, r) {
    if (r && r.plans && r.rec && !r.id) { var R = r.plans.filter(function (p) { return p.id === r.rec; })[0]; if (R) r = Object.assign({ kind: r.kind, adTarget: r.adTarget }, R); }
    var I = indOf(q.industry) || {}, U = purOf(q.purpose) || {};
    var prods = [];
    (r.items || []).forEach(function (x) { if (prods.indexOf(x.prod) < 0) prods.push(x.prod); });
    if (r.kind === 'broker') prods = ['agent'];
    if (!prods.length) prods = ['etc'];
    var region = [q.sido, q.sgg].filter(Boolean).join(' ');
    var lines = ['[광고 설계 도우미]', '업종: ' + (I.label || ''), '목적: ' + (U.label || ''), region ? '지역: ' + region : '', '기간: ' + (r.kind === 'broker' ? '1년(지역 제휴 중개사는 1년 결제)' : r.weeks + '주'), '광고에 쓸 돈(총액): ' + (+q.totalMan || 0) + '만 원'];
    if (r.kind === 'broker' && r.pick) lines.push('구성: 지역 제휴 중개사 ' + r.pick.label + ' — 1년 ' + won(r.pick.year) + '(월 ' + won(r.pick.month) + ' 꼴)');
    if (r.label) lines.push('구성안: ' + r.label + (r.head ? ' — ' + r.head : ''));
    (r.items || []).forEach(function (x) { lines.push('구성: ' + x.name + ' · ' + x.weeks + '주 · ' + won(x.cost) + (x.tier ? ' (' + x.tier + ')' : '')); });
    if ((r.items || []).length) lines.push('합계: ' + won(r.total) + ' (VAT 별도)');
    if (r.kind === 'short' && r.shorter) lines.push('참고: ' + r.shorter.weeks + '주로 줄이면 ' + r.shorter.name + ' ' + won(r.shorter.cost));
    if (r.adTarget) lines.push('함께 보고 싶은 것: 광고 지역 추천 리포트');
    return { prods: prods, region: region, period: r.kind === 'broker' ? '1년' : (PERIOD_TXT[r.weeks] || '미정·협의'),   // 공인중개사(지역 제휴 중개사)는 1년 결제
      memo: lines.filter(Boolean).join('\n').slice(0, 1000) };
  }

  var API = { INDUSTRIES: INDUSTRIES, PURPOSES: PURPOSES, PERIODS: PERIODS, LONG: LONG, QUICK: QUICK, ITEMS: ITEMS, plan: plan, formFill: formFill, budgetFor: budgetFor, allowedFor: allowedFor, priceOf: priceOf, scopeOf: scopeOf, won: won };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.JDJ_ADPLAN = API;
})(typeof window !== 'undefined' ? window : globalThis);
