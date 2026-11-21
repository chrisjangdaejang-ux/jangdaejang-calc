/* 집예보 광고 단가 — 한 곳(/ad/ 상품 카드·단가표·위치 안내·문의 폼, /ad/plan/ 광고 설계 도우미가 같이 읽음).
   하루 단위 판매는 없고 1주부터예요. 모든 금액은 원 단위 숫자, VAT 별도. */
/* PRICE-CORE:START ─────────────────────────────────────────────
   ★ 단가·할인·할증·집행 기준은 아래 PRICES 한 곳에서만 고치면 페이지 전체(상품 카드·단가표·기간 선택·패키지·집행 가이드)에 반영돼요.
     모든 금액은 원 단위 숫자, VAT 별도. (tools/ad-test.js 가 이 구간을 떼어 계산을 검증해요)
     weeks : 주 단위 상품 금액 {주 수: 금액}            — 분양 단지 광고·분양 집중 패키지
     tiers : 월 단가 상품 [{label, month}]               — 기간 할인표(period)를 따라 1주~1년 금액 계산
     text  : 금액 대신 그대로 보여 줄 문구(고정 요금)    — 지역 제휴 중개사
     비어 있으면 '문의 시 안내'로 보여요.
   ───────────────────────────────────────────────────────────── */
const PRICES = {
  bunyang:      { weeks: { 1: 300000, 2: 500000, 4: 900000 }, pass3: 10, launchOff: 50 },   // 분양 단지 광고(목록 상단 카드·추천 현장) · pass3 = 3회 이용권 할인(%) · launchOff = 창립 광고주 할인(%)
  /* 분양 프리미엄 — tiers[].month = 정가(월), launch = 창립 광고주 런칭가(월). 기간 할인(period)은 둘 다 똑같이 적용 */
  bunyang_pin:    { tiers: [{ label: '시·군·구 1곳', month: 1500000 }], launch: 490000 },                     // 지도 프리미엄 마커
  bunyang_alert:  { tiers: [{ label: '시·군·구 1곳 · 사이트 알림', month: 600000 }], launch: 190000, per: { label: '카카오톡 1건(준비 중)', list: 300, launch: 150 } },
  bunyang_lead:   { tiers: [{ label: '월 정액(건수 제한 없음)', month: 1500000 }], launch: 490000, per: { label: '상담 신청 1건', list: 50000, launch: 20000 } },
  bunyang_report: { once: { label: '현장 1곳 · 1회', list: 990000, launch: 290000 } },
  pkg_found:      { tiers: [{ label: '', month: 4000000 }], launch: 1290000 },                                 // 창립 광고주 분양 패키지(마커+상단 카드+상담 월정액+리포트)
  bunyang_more: { perWeek: 200000 },                                         // 분양 광고 노출 화면 확장(청약·내 집 마련·갈아타기) — 준비 중, 1주당 추가
  agent:        { plans: [{ label: '기본', month: 29000, year: 348000 }, { label: '프리미엄', month: 49000, year: 588000 }], text: '기본 월 29,000원 · 프리미엄 월 49,000원 · 1년 결제', note: '연 348,000원 · 588,000원 (소속 공인중개사 상담 전용 월 19,000원) · 제휴 페이지 공개 요금 그대로예요' },  // agent/ 페이지와 같게
  agent_top:    { soon: true, tiers: [{ label: '1등급 구', month: 150000 }, { label: '2등급 구', month: 90000 }, { label: '3등급 구', month: 50000 }] },   // 시·군·구 우선 노출 — 준비 중
  native:       { tiers: [{ label: '전국', month: 500000 }, { label: '시·도', month: 300000 }, { label: '시·군·구', month: 150000 }] },  // 결과 하단 카드 — 바로 가능(광고 칸 assets/ad-slot.js, 지역 칸 region)
  jeonse:       { tiers: [{ label: '전국 단독', month: 800000 }], note: '1년 계약 시 다음 해 업종 우선 연장권' },   // 체크리스트 스폰서(업종당 1구좌) — 바로 가능
  pkg_bunyang:  { weeks: { 4: 1500000 } },                    // 패키지: 분양 집중
  pkg_local:    { tiers: [{ label: '', month: 200000 }] },     // 패키지: 지역 밀착
  pkg_jeonse:   { tiers: [{ label: '', month: 1100000 }] },    // 패키지: 전월세 안심
  period:       { w1: 30, w2: 55, m3: 10, m6: 15, y1: 25 },   // 1주·2주 = 월 단가의 %, 3개월·6개월·1년 = 할인 %
  roundTo:      1000,                                          // 계산 금액은 천 원 단위 반올림
  surcharge:    { region: 0, near: 20, service: 10, kind: 10 },  // 타겟팅 할증(%) — region 0 = 없음(지역 상품을 따로 둠)
  brief_ad:     { text: '1주(7일) 25만 원 · 4주 80만 원', note: '구독자 1,000명까지 기준 · 1주(7일) 단위', weeks: { 1: 250000, 4: 800000 } },
  /* 광고 칸(assets/ad-slot.js, docs/ad_slots.md) 상단 배너 — 1주부터(하루 단위 없음). 대표 승인 2026-11-21 */
  home_top:     { weeks: { 1: 500000, 4: 1500000 } },          // 홈 상단 배너(가장 비싼 자리)
  cat_top:      { weeks: { 1: 250000, 4: 800000 } },           // 카테고리 상단 배너(지도·순위·세금·빌라·전월세·갈아타기)
  cat_top_bun:  { weeks: { 1: 280000, 4: 900000 } },           // 분양·청약 상단 배너   // 모닝 브리핑 지면 광고 — 정식 상품(대표 승인 2026-11-21)
  /* 광고 칸 카드 두 자리(docs/ad_slots.md 표 가격 그대로) — 월 단가, 기간 할인(period) 똑같이 적용 */
  list_card:    { tiers: [{ label: '시·도', month: 300000 }] },                                                            // 목록 사이 카드(순위·분양 목록 10번째 뒤)
  end_card:     { tiers: [{ label: '전국', month: 500000 }, { label: '시·도', month: 300000 }, { label: '중개사 화면', month: 150000 }] },   // 페이지 끝 카드(홈·순위·세금·빌라·갈아타기·중개사 화면 맨 아래 · 브리핑 화면은 브리핑 지면 광고에 포함)
  guide:        { minSpend: 0, minWeeks: 1, firstWeekOff: 50 }   // 최소 집행 금액(0 = 없음), 최소 기간(주), 첫 광고 첫 주 할인(%)
};
const PERIODS = [
  { id: 'w1', label: '1주', weeks: 1 }, { id: 'w2', label: '2주', weeks: 2 }, { id: 'm1', label: '1개월', months: 1 },
  { id: 'm3', label: '3개월', months: 3 }, { id: 'm6', label: '6개월', months: 6 }, { id: 'y1', label: '1년', months: 12 }
];
function rnd(n) { const u = PRICES.roundTo || 1; return Math.round(n / u) * u; }
/* 450만 원 · 37.5만 원 · 6.75만 원 · 5,000원 · 1억 2,000만 원 */
function man(n) {
  n = Math.round(+n); if (!(n > 0)) return '0원';
  if (n >= 1e8) { const e = Math.floor(n / 1e8), r = n % 1e8; return e + '억' + (r ? ' ' + man(r) : ' 원'); }
  if (n >= 1e4 && n % 100 === 0) { const v = n / 1e4; return (Number.isInteger(v) ? v.toLocaleString('ko-KR') : String(+v.toFixed(2))) + '만 원'; }
  return n.toLocaleString('ko-KR') + '원';
}
/* 할인율(%): 그 기간 이하에서 가장 긴 할인 구간 (예: 4개월 → 3개월 할인율) */
function rateOf(months) { const R = PRICES.period; return months >= 12 ? R.y1 : months >= 6 ? R.m6 : months >= 3 ? R.m3 : 0; }
/* 월 단가 상품의 기간 금액 → { total, list(정가), off(할인액), rate, perMonth(월 꼴), pct(1·2주: 월 단가의 %) } */
function periodPrice(month, pid) {
  const p = PERIODS.find(x => x.id === pid), R = PRICES.period;
  if (!p || !(month > 0)) return null;
  if (p.weeks) { const pct = p.weeks === 1 ? R.w1 : R.w2; return { total: rnd(month * pct / 100), pct, weeks: p.weeks, months: 0, off: 0, rate: 0 }; }
  const list = month * p.months, rate = rateOf(p.months), total = rnd(list * (100 - rate) / 100);
  return { total, list, off: list - total, rate, months: p.months, perMonth: Math.round(total / p.months) };
}
/* 주 단위 상품: 고른 기간에 맞는 주 수(1주·2주·그 외 4주, 없으면 가장 긴 것) */
function weekKey(p, pid) {
  const want = pid === 'w1' ? 1 : pid === 'w2' ? 2 : 4, ks = Object.keys(p.weeks).map(Number).sort((a, b) => a - b);
  return ks.includes(want) ? want : ks[ks.length - 1];
}
function launchWeek(amount) { return rnd(amount * (100 - (PRICES.bunyang.launchOff || 0)) / 100); }
function passPrice(amount) { const list = amount * 3; return { list, total: rnd(list * (100 - (PRICES.bunyang.pass3 || 0)) / 100) }; }
/* 첫 광고 첫 주 할인 금액 */
function firstWeekPrice(oneWeek) { return rnd(oneWeek * (100 - (PRICES.guide.firstWeekOff || 0)) / 100); }
/* 1주 광고 뒤 1개월 이상 연장: 연장 금액 − 첫 주 결제액 */
function extendPrice(month, pid, paidFirstWeek) { const q = periodPrice(month, pid); return q && q.months >= 1 ? Math.max(0, q.total - paidFirstWeek) : null; }
/* 주 단위 상품 n주 금액: 정해진 주 수가 있으면 그 값, 없으면 긴 묶음부터 채워 더함(8주 = 4주×2, 2주 = 1주×2). 못 맞추면 null */
function weeksPrice(p, n) {
  if (!p || !p.weeks || !(n > 0)) return null;
  if (p.weeks[n]) return p.weeks[n];
  const ks = Object.keys(p.weeks).map(Number).sort((a, b) => b - a); let left = n, sum = 0;
  for (const k of ks) while (left >= k) { sum += p.weeks[k]; left -= k; }
  return left ? null : sum;
}
/* 월 단가 상품 n주 금액: 1주·2주는 기간표(월 단가의 %), 4주 = 1개월, 8주 = 1개월×2. 그 밖은 null */
function tierWeeks(month, n) {
  if (n === 1 || n === 2) { const q = periodPrice(month, 'w' + n); return q && q.total; }
  if (n > 0 && n % 4 === 0) { const q = periodPrice(month, 'm1'); return q && q.total * (n / 4); }
  return null;
}
/* PRICE-CORE:END */
var JDJ_AD_PRICE_API = { PRICES, PERIODS, rnd, man, rateOf, periodPrice, weekKey, weeksPrice, tierWeeks };
if (typeof window !== 'undefined') window.JDJ_AD_PRICES = JDJ_AD_PRICE_API;
if (typeof module !== 'undefined' && module.exports) module.exports = JDJ_AD_PRICE_API;
