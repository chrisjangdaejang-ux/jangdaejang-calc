/* 집예보 '전세 갈아타기'(switch/rent/) 공통 계산 — 화면과 tools/tswitch-test.js 가 함께 써요. 브라우저 window.JDJ_TSW, node require 둘 다.
   자료(모두 공개 자료, 추정·예측 없음):
     · 전세 시세: rent/{구}.json · rent/v/{구}.json · rent/o/{구}.json (국토교통부 전월세 실거래) — 계약 목록(u[10])에서
       최근 6개월 '월세 없는 신규 전세'(갱신 계약 제외)의 보증금 중간값. 계약 고르는 규칙은 전세 만기 알림(assets/cal-core.js calTaPairs)과 같고,
       한두 건으로 시세를 정하지 않도록 3건 이상일 때만 써요.
     · 준공 연도: 같은 행 덧붙임 by(건축물대장) · 전용면적: 같은 행 u[4](계약 전용 중간값)
     · 위치: assets/xy/{시·도 2자리}.json(실거래 주소 → 공공 지오코딩, 공동주택) → 없으면 assets/dong 동 가운데 점(그때는 '동 가운데 점 기준'이라고 적어요)
     · 지하철역: poi/sNN.json(서울 열린데이터광장 역사마스터, 수도권 전철역) — 직선 거리 ÷ 분당 67m(걷는 시간 어림, 실제 길은 더 길어요. assets/life-view.js 와 같은 값)
     · 학군: sNN.json 점수 자료 fx.sc(학교알리미 중학교 한 해 평균 순전입률) — 있는 단지끼리만 비교해요
     · 출퇴근: 출퇴근 API 가 없어 집 위치 → 출퇴근지 동 가운데 점 직선 거리(km). 시간(분)으로 바꾸지 않아요.
   금액 단위: 만원. */
(function (root) {
  'use strict';
  const PY = 3.3058;
  const WALK = 67;              // 분당 m(직선 거리 기준 어림)
  const MIN_N = 3;              // 중간값을 쓰는 최소 계약 수(전세 만기 알림과 같음)
  /* '나아졌다'로 세는 최소 차이 — 이보다 작으면 같은 수준으로 봐요 */
  const TH = { commute: 0.5, st: 100, by: 1, area: 1, sch: 0.5 };   // km · m · 년 · 평 · 순전입률 %p
  const SRC = {
    rent: '국토교통부 전월세 실거래가(공공데이터포털) — 월세 없는 신규 전세 계약(갱신 제외) 보증금 중간값(아파트 최근 6개월 3건 이상, 빌라·오피스텔 최근 12개월 2건 이상)',
    by: '건축물대장 사용승인 연도(국토교통부 건축HUB)',
    xy: '국토교통부 실거래 공개 자료 주소를 공공 지오코딩으로 바꾼 공동주택 위치',
    dong: '국토교통부 실거래 공개 자료 위치(공동주택)로 만든 법정동 가운데 점',
    poi: '서울시 역사마스터 정보(서울 열린데이터광장, 수도권 전철역 위치)',
    sch: '학교알리미 중학교 전·출입 학생 수(한국교육학술정보원)',
    renew: { nm: '주택임대차보호법 제6조의3(국가법령정보센터)', url: 'https://law.go.kr/lsLawLinkInfo.do?lsJoLnkSeq=1007847519&chrClsCd=010202&ancYnChk=0' }
  };
  const KIND = { a: { label: '아파트', sub: '' }, v: { label: '빌라', sub: 'v/' }, o: { label: '오피스텔', sub: 'o/' } };
  const rentPath = (k, g) => 'rent/' + ((KIND[k] || KIND.a).sub) + g + '.json';

  /* ---------- 날짜 ---------- */
  function addM(iso, k) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1 + k, 1)), last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(+m[3], last)); return d.toISOString().slice(0, 10);
  }
  const i8 = iso => +String(iso).replace(/-/g, '');
  function med(a) { const v = a.slice().sort((x, y) => x - y), n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : Math.round((v[n / 2 - 1] + v[n / 2]) / 2)) : 0; }

  /** 빌라·오피스텔은 한 건물·평형 계약이 드물어 최근 12개월 · 2건 이상으로 봐요(카드에 기간·건수를 그대로 적어요) */
  /* 기간·건수 단계: 앞 단계로 시세가 안 잡히면 다음 단계로 넓혀요(카드에 실제로 쓴 기간·건수를 적어요).
     아파트: 최근 6개월 3건 → 안 되면 최근 12개월 2건. 빌라·오피스텔: 최근 12개월 2건. '기간 늘리기'를 누르면 최근 24개월 2건까지.
     (2026-11-25 실제 자료 점검: 강남구 청담·삼성·논현 114㎡대 84개 평형 중 6개월·3건으로 시세가 잡히는 곳은 1곳, 12개월·2건이면 20곳) */
  const WIN = { a: [[6, MIN_N], [12, 2]], v: [[12, 2]], o: [[12, 2]], long: [[24, 2]] };
  /** 예산 근처: '더 나은 집'은 보증금이 예산의 이 비율 이상인 곳만(그보다 싼 곳은 '더 싼 집'에) */
  const NEAR = 0.85;
  /** 평형 순서(넓히기용) */
  const BANDS = ['40㎡ 이하', '49㎡대', '59㎡대', '74㎡대', '84㎡대', '99㎡대', '114㎡대', '135㎡대', '150㎡ 이상'];
  /** 한 단계 위아래 평형까지 */
  function bandsNear(b) { const i = BANDS.indexOf(b); return i < 0 ? [b] : BANDS.slice(Math.max(0, i - 1), i + 2); }
  /** 단계대로 시세 찾기 */
  function recentAuto(u, today, steps) {
    let last = null;
    for (const st of steps) { const r = recentNew(u, today, st[0], st[1]); if (r.med > 0) return r; last = r; }
    return last || recentNew(u, today);
  }
  /** 최근 w개월(기본 6) 신규 순수 전세 보증금 중간값 {med, n, lo, hi, w} — min건(기본 3) 미만이면 med 0 */
  function recentNew(u, today, w, min) {
    w = w || 6; min = min || MIN_N;
    const t = i8(today), a6 = i8(addM(today, -w)), v = [];
    (Array.isArray(u && u[10]) ? u[10] : []).forEach(c => { if (!Array.isArray(c) || !(c[3] > 0) || c[4] || c[5] === 1) return; if (c[0] > a6 && c[0] <= t) v.push(c[3]); });
    const n = v.length;
    return { med: n >= min ? med(v) : 0, n, lo: n ? Math.min(...v) : 0, hi: n ? Math.max(...v) : 0, w, min };
  }
  /** 최근 1년 전세 시세 흐름(참고) — 월별 3개월 순수 전세 중간값 J 의 마지막 값과 12개월 전 값 비교. 없으면 null */
  function trend1(u, meta) {
    if (!u || !meta || !meta.m0 || !meta.to) return null;
    const J = u[7]; if (!Array.isArray(J) || J.length < 2) return null;
    const months = []; let ym = meta.m0;
    for (let k = 0; k < 600 && ym <= meta.to; k++) { months.push(ym); let y = +ym.slice(0, 4), m = +ym.slice(4) + 1; if (m > 12) { y++; m = 1; } ym = y + String(m).padStart(2, '0'); }
    const n = months.length, a = new Array(n).fill(0);
    for (let k = 1; k < J.length; k++) { const i = J[0] + k - 1; if (i >= 0 && i < n) a[i] = +J[k] || 0; }
    let li = -1; for (let i = n - 1; i >= Math.max(0, n - 3); i--) if (a[i] > 0) { li = i; break; }
    if (li < 0) return null;
    let pi = -1; for (const d of [0, 1, 2]) { const j = li - 12 + d; if (j >= 0 && j < li && a[j] > 0) { pi = j; break; } }
    if (pi < 0) return null;
    return { now: a[li], at: months[li], prev: a[pi], from: months[pi], pct: (a[li] - a[pi]) / a[pi] };
  }

  /* ---------- 거리 ---------- */
  /** 두 점 [경도, 위도] 사이 직선 거리(km) — 전세 만기 알림(mine/calendar)과 같은 식 */
  function km(a, b) {
    if (!a || !b) return null;
    const r = Math.PI / 180, dx = (b[0] - a[0]) * r * Math.cos((a[1] + b[1]) / 2 * r), dy = (b[1] - a[1]) * r;
    return 6371 * Math.sqrt(dx * dx + dy * dy);
  }
  /** 가장 가까운 지하철역 {nm, m(10m 단위), min(걷는 시간 어림)} — st = [[이름, 경도, 위도]…], max m 안에서만 */
  function nearSt(xy, st, max) {
    if (!xy || !Array.isArray(st) || !st.length) return null;
    let best = null;
    for (const s of st) { const d = km(xy, [s[1], s[2]]) * 1000; if (!best || d < best.d) best = { nm: s[0], d }; }
    if (!best || best.d > (max || 3000)) return null;
    const m = Math.round(best.d / 10) * 10;
    return { nm: best.nm, m, min: Math.max(1, Math.round(m / WALK)) };
  }
  /** 위치 찾기: 단지 좌표(xy 표) → 없으면 동 가운데 점. {p, by:'apt'|'dong'} 또는 null */
  function locate(g, d, j, xy, dong) {
    const k = g + '|' + d + '|' + j;
    const a = (xy && xy[k]) || null;
    if (a) return { p: [a[0], a[1]], by: 'apt' };
    const dn = String(d || '').trim().split(/\s+/)[0], c = dong && (dong[g + '|' + d] || dong[g + '|' + dn]);
    return c ? { p: [c[0], c[1]], by: 'dong' } : null;
  }

  /* ---------- 한 집(단지·평형) 줄 ---------- */
  /** u(전월세 행) → 비교에 쓰는 값. ctx = {g, kind, today, meta, xy, dong, st, work([경도, 위도]|null), fxOf(g,d,j,a,b)→fx|null} */
  function row(u, ctx) {
    const x = (u && u[11]) || {}, g = ctx.g, kind = ctx.kind || 'a';
    const steps = ctx.long ? WIN.long : (WIN[kind] || WIN.a), rn = recentAuto(u, ctx.today, steps), loc = locate(g, u[0], u[3], ctx.xy, ctx.dong);
    const r = { g, kind, d: u[0], a: u[1], b: u[2], j: String(u[3]), area: +u[4] || 0, by: +x.by || 0, med: rn.med, n: rn.n, lo: rn.lo, hi: rn.hi, w: rn.w,
      loc: loc ? loc.by : '', p: loc ? loc.p : null, tr: trend1(u, ctx.meta) };
    r.commute = ctx.work && r.p ? Math.round(km(r.p, ctx.work) * 10) / 10 : null;
    r.commute2 = ctx.work2 && r.p ? Math.round(km(r.p, ctx.work2) * 10) / 10 : null;
    r.cv = x.cv && x.cv.r > 0 && x.cv.n > 0 ? { r: x.cv.r, n: x.cv.n } : null;
    r.st = r.p && loc.by === 'apt' ? nearSt(r.p, ctx.st, 3000) : null;            // 동 가운데 점으로는 역 거리를 재지 않아요
    const fx = ctx.fxOf ? ctx.fxOf(g, r.d, r.j, r.a, r.b) : null;
    r.sc = fx && Array.isArray(fx.sc) && fx.sc[0] ? fx.sc : null;
    r.key = [g, r.d, r.j, r.a, r.b].join('|');
    return r;
  }
  /** 같은 평형인지: band 가 '' 이면 모두 */
  const sameBand = (u, band) => !band || u[2] === band;

  /** 나아진 점 — c 후보, cur 지금 집(row 모양). 같은 자료가 둘 다 있을 때만 비교해요.
      돌려줌 [{k, v(차이), t(짧은 글)}] */
  function gains(c, cur) {
    const out = [];
    if (!c || !cur) return out;
    if (c.commute != null && cur.commute != null && cur.commute - c.commute >= TH.commute) out.push({ k: 'commute', v: Math.round((cur.commute - c.commute) * 10) / 10 });
    if (c.commute2 != null && cur.commute2 != null && cur.commute2 - c.commute2 >= TH.commute) out.push({ k: 'commute2', v: Math.round((cur.commute2 - c.commute2) * 10) / 10 });
    if (c.st && cur.st && cur.st.m - c.st.m >= TH.st) out.push({ k: 'st', v: cur.st.m - c.st.m });
    if (c.by && cur.by && c.by - cur.by >= TH.by) out.push({ k: 'by', v: c.by - cur.by });
    if (c.area && cur.area) { const dp = (c.area - cur.area) / PY; if (dp >= TH.area) out.push({ k: 'area', v: Math.round(dp * 10) / 10 }); }
    if (c.sc && cur.sc && c.sc[1] - cur.sc[1] >= TH.sch) out.push({ k: 'sch', v: Math.round((c.sc[1] - cur.sc[1]) * 10) / 10 });
    if (c.safe === true) out.push({ k: 'safe', v: 1 });
    return out;
  }
  const GAIN_T = {
    commute: g => `출퇴근 직선 ${g.v}km 가까워요`,
    commute2: g => `두 번째 출퇴근지 직선 ${g.v}km 가까워요`,
    st: g => `역까지 직선 ${g.v.toLocaleString('ko-KR')}m 가까워요`,
    by: g => `${g.v}년 더 새 집이에요`,
    area: g => `전용 ${g.v}평 더 넓어요`,
    sch: g => `가까운 중학교 순전입률 ${g.v}%p 높아요`,
    safe: () => 'HUG 보증 기준 안이에요(추정)'
  };
  const GAIN_NAME = { commute: '출퇴근 가까움', commute2: '두 번째 출퇴근 가까움', st: '역 가까움', by: '더 새 집', area: '더 넓은 집', sch: '학군 지표', safe: '안전 점검 통과' };

  /** 후보 고르기(① 같은 보증금, 더 나은 집)
      rows: row() 결과들, cur: 지금 집 row(없어도 됨), budget: 보증금 + 전세대출(만원), need: 꼭 나아져야 할 항목 키 목록 */
  function better(rows, cur, budget, need) {
    need = need || [];
    const out = [];
    for (const r of rows) {
      if (!(r.med > 0) || !(budget > 0) || r.med > budget) continue;
      if (cur && r.key === cur.key) continue;
      const gs = gains(r, cur);
      if (need.length && !need.every(k => gs.some(x => x.k === k))) continue;
      out.push(Object.assign({}, r, { gains: gs, room: budget - r.med }));
    }
    out.sort((a, b) => b.gains.length - a.gains.length || (a.commute == null ? 1e9 : a.commute) - (b.commute == null ? 1e9 : b.commute) || b.by - a.by || a.med - b.med);
    return out;
  }
  /** ② 같은 조건, 더 싸게: 같은 평형(band), 출퇴근 거리대(지금 + 1km 안 — 출퇴근지가 없으면 지금 집에서 직선 2km 안), 전세 중간값이 기준보다 낮은 곳
      ref = 비교 기준 금액(지금 단지 최근 신규 전세 중간값, 없으면 내 보증금) → 절약액 = ref − 후보 중간값 */
  function cheaper(rows, cur, ref, o) {
    o = o || {};
    if (!(ref > 0)) return [];
    const out = [];
    for (const r of rows) {
      if (!(r.med > 0) || r.med >= ref || (cur && r.key === cur.key)) continue;
      if (o.band && r.b !== o.band) continue;
      let near = null;
      if (o.work) { if (r.commute == null || cur == null || cur.commute == null || r.commute > cur.commute + 1) continue; }
      else { if (!cur || !cur.p || !r.p) continue; const d = km(r.p, cur.p); if (d > 2) continue; near = Math.round(d * 10) / 10; }
      out.push(Object.assign({}, r, { save: ref - r.med, near, gains: gains(r, cur) }));
    }
    out.sort((a, b) => b.save - a.save || b.n - a.n);
    return out;
  }
  /** 걸러 보기: 그 항목이 나아진 후보만 */
  const filt = (list, keys) => !keys || !keys.length ? list : list.filter(r => keys.every(k => (r.gains || []).some(g => g.k === k)));


  /* ---------- 중개보수(주택 임대차 상한요율) ----------
     공인중개사법 시행규칙(2021.10.19 시행) · 시·도 조례 요율표 — 영등포구청 '부동산 중개보수 요율표'(2026-11-25 확인)·서울시 주택분야 누리집(2021.10.19 개편)으로 확인.
     거래금액: 전세 = 보증금, 월세 = 보증금 + 월세 × 100(이 값이 5천만 원 미만이면 보증금 + 월세 × 70). 실제 보수는 상한 안에서 협의해 정해요. */
  const FEE_SRC = { nm: '공인중개사법 시행규칙(2021.10.19 시행) 주택 임대차 중개보수 상한요율', url: 'https://www.ydp.go.kr/www/contents.do?key=2725&', checked: '2026-11-25' };
  /** 상한 중개보수(만원, 원 단위 반올림 → 만원 소수 1자리) {base 거래금액, rate, cap, fee} */
  /* 요율표·계산은 공용 함수(assets/loan-core.js brokerLease) — fee 는 부가세 10% 포함 최대 금액, feeBase 는 부가세 전 */
  const LOANC = () => root.JDJ_LOAN || (typeof require === 'function' ? require('./loan-core.js') : null);
  function brokerFee(dep, rent) { return LOANC().brokerLease(dep, rent); }
  /** 이사 계획: 후보 r 에 들어가는 돈.
      o = {dep 지금 보증금, cash 추가 현금, loan 전세대출, move 이사비, rentMax 월세 감당액}
      전세로 되면 {mode:'j', diff 보증금 차액, fee, move, cash 새로 필요한 현금(차액+보수+이사비, 차액이 −면 돌려받는 돈만큼 줄어요)}
      모자라면 이 단지 최근 1년 전월세 전환율(cv)로 반전세 {mode:'h', dep2 보증금, rent 월세, rate} — 월세 감당액 안일 때만. 둘 다 안 되면 null */
  function plan(r, o) {
    if (!r || !(r.med > 0)) return null;
    const dep = +o.dep || 0, avail = dep + (+o.cash || 0) + (+o.loan || 0), mv = +o.move || 0;
    const f = brokerFee(r.med, 0).fee, all = o.cost === 'all';
    /* 예산 계산: 'dep'(기본) 보증금만으로 거름 · 'all' 중개보수·이사비까지 뺀 금액으로 거름 — 어느 쪽이든 카드에는 이사에 드는 돈을 보여 줘요 */
    if (r.med + (all ? f + mv : 0) <= avail) return { mode: 'j', dep2: r.med, rent: 0, diff: r.med - dep, fee: f, move: mv, out: r.med - dep + f + mv };
    if (!(o.rentMax > 0) || !r.cv) return null;
    let fee = f, dep2 = 0, rent = 0;
    for (let i = 0; i < 4; i++) { dep2 = Math.max(0, Math.floor(avail - (all ? fee + mv : 0))); rent = Math.ceil((r.med - dep2) * r.cv.r / 12); fee = brokerFee(dep2, rent).fee; }
    if (!(dep2 > 0) || rent > o.rentMax) return null;
    return { mode: 'h', dep2, rent, rate: r.cv.r, n: r.cv.n, diff: dep2 - dep, fee, move: mv, out: dep2 - dep + fee + mv };
  }
  /** 조건 맞춤 가중치: 통근수단·가구 형태·신축 선호에 따라 나아진 점의 무게를 바꿔요 */
  function weights(o) {
    o = o || {};
    const w = { commute: 1, commute2: 1, st: 1, by: 1, area: 1, sch: 1, safe: 1 };
    if (o.mode === 'transit') w.st = 2;
    if (o.hh === 'mid' || o.hh === 'high') w.sch = 2;
    else if (o.hh === 'elem') w.sch = 1.5;
    if (o.ageMax > 0) w.by = 1.5;
    if (o.work2) { w.commute = 1.5; w.commute2 = 1.5; }
    return w;
  }
  /** 예산 근처 아래 끝: (보증금 + 현금 + 대출 − [이사 비용 포함이면 중개보수·이사비]) × NEAR */
  function nearLo(o) {
    const avail = (+o.dep || 0) + (+o.cash || 0) + (+o.loan || 0), cut = o.cost === 'all' ? (+o.move || 0) + brokerFee(avail).fee : 0;
    return Math.round(Math.max(0, avail - cut) * (o.near > 0 ? o.near : NEAR));
  }
  const scoreOf = (gs, w) => Math.round(gs.reduce((a, g) => a + (w[g.k] || 1), 0) * 10) / 10;
  /** 조건 넣어 고르기 — o = plan 값 + {lo, hi 원하는 보증금 범위, reduce 보증금 줄이기, ageMax 최대 연식, year 올해, cmax 최대 통근 직선 km, safeOnly, need, hh, mode, work2}
      돌려줌: 조건에 맞는 후보(나아진 점·이사 계획·맞춤 점수), 맞춤 점수 → 나아진 점 수 → 이사에 드는 현금 순 */
  function pick(rows, cur, o) {
    o = o || {};
    const w = weights(o), need = o.need || [], out = [];
    const hi = o.reduce ? Math.min(o.hi > 0 ? o.hi : Infinity, (+o.dep || 0) - 1) : (o.hi > 0 ? o.hi : Infinity);
    const lo = o.lo > 0 ? o.lo : (o.reduce || o.near === 0) ? 0 : nearLo(o);
    for (const r of rows) {
      if (!(r.med > 0) || (cur && r.key === cur.key)) continue;
      if (r.med < lo || r.med > hi) continue;
      if (o.ageMax > 0 && !(r.by > 0 && (o.year || 0) - r.by <= o.ageMax)) continue;
      if (o.cmax > 0 && ((r.commute != null && r.commute > o.cmax) || (r.commute2 != null && r.commute2 > o.cmax))) continue;
      if (o.safeOnly && r.safe !== true) continue;
      const pl = plan(r, o); if (!pl) continue;
      const gs = gains(r, cur);
      if (need.length && !need.every(k => gs.some(x => x.k === k))) continue;
      out.push(Object.assign({}, r, { gains: gs, plan: pl, score: scoreOf(gs, w), room: (+o.dep || 0) + (+o.cash || 0) + (+o.loan || 0) - r.med }));
    }
    out.sort((a, b) => b.score - a.score || b.gains.length - a.gains.length || (a.plan.mode === 'j' ? 0 : 1) - (b.plan.mode === 'j' ? 0 : 1) || a.plan.out - b.plan.out);
    return out;
  }

  /* ---------- 전세 안전 점검(추정) ---------- */
  /** HUG 기준 추정: 보증금 = 후보 최근 전세 중간값, 선순위채권 0(모름), 주택가격 = 공시가격 × 140%(KB시세는 공개 자료가 아니라 못 씀)
      HG = assets/hug-core.js, pub = 같은 평형 공시가격 중간값(만원) | null, metro = 수도권 여부 */
  function hugEst(HG, dep, pub, metro, kind) {
    if (!HG || !(dep > 0)) return null;
    const r = HG.check({ dep, senior: 0, pub: pub || 0, type: kind === 'o' ? 'offi' : kind === 'v' ? 'villa' : 'apt', metro: !!metro, months: 24 });
    return { ok: r.ok, need: r.need || '', price: r.price, limit: r.limit, maxDep: r.maxDep, cap: r.checks[0] ? r.checks[0].lim : null, capOk: r.checks[0] ? r.checks[0].ok : null };
  }
  /** 깡통전세 확률(참고) — KK = assets/kk-core.js, kk = 공개 요약, price = 지금 매매 시세(만원) */
  function kkEst(KK, kk, code, dep, price) {
    if (!KK || !kk || !(price > 0) || !(dep > 0)) return null;
    const e = KK.estimate({ kk, code, dep, senior: 0, price });
    return e.miss ? null : { p: e.p, t: KK.pText(e.p), ratio: e.ratio, st: e.st.t, ref: true };
  }
  /** 만기 타이밍: 지금 단지 최근 신규 전세 중간값이 내 보증금보다 낮으면 갱신 협상 안내(정보) */
  const renewHint = (curMed, dep) => curMed > 0 && dep > 0 && curMed < dep;

  /* ---------- 매수 전환(전세 만기 알림 '매수로 바꾸면'과 같은 규칙) ----------
     P = price/{구}.json, LN = assets/loan-core.js, M = assets/mine-core.js, areas = [{g, d}], band, dep 보증금, cash 보유 현금, inc 연소득 */
  function buyFit(P, g, LN, M, areas, band, dep, cash, inc, TG) {
    if (!P || !P.units || !LN || !M) return [];
    const c = LN.ctx({ g: LN.R.groupOf(g), own: 'none', income: inc || 0, cash: (dep || 0) + (cash || 0) }), out = [];
    P.units.forEach(u => {
      if (!areas.some(a => a.g === g && (!a.d || a.d === u[1]))) return;
      if (band && u[3] !== band) return;
      const bs = M.bandSummary(u, P.months); if (!(bs.price > 0) || bs.stale) return;
      const nd = LN.need(bs.price, c); if (nd.need > c.cash) return;
      const sv = ((TG && TG.u) || {})[[u[1], u[8], u[2], u[3]].join('|')] || [];
      out.push({ g, d: u[1], a: u[2], b: u[3], j: u[8], price: bs.price, at: bs.at, L: nd.loan.L, cashUse: nd.need, fv: sv[0] == null ? null : Math.min(99, sv[0]), rate: c.rate, grp: c.g });
    });
    return out;
  }
  const buySort = list => list.sort((a, b) => (b.fv == null ? -1 : b.fv) - (a.fv == null ? -1 : a.fv) || a.price - b.price);

  /* ---------- 찾을 곳 ---------- */
  /** 출퇴근지 둘레 동: dong 표({'구|동': [경도, 위도, 수]})에서 work 가까운 순 n곳(같은 시·도 코드 앞 2자리), 구 파일은 maxG 개까지 */
  function nearWork(dong, work, n, maxG) {
    if (!dong || !work) return [];
    const L = Object.keys(dong).map(k => ({ g: k.slice(0, 5), d: k.slice(6), km: km([dong[k][0], dong[k][1]], work) })).sort((a, b) => a.km - b.km);
    const gs = new Set(), out = [];
    for (const o of L) { if (out.length >= (n || 12)) break; if (!gs.has(o.g) && gs.size >= (maxG || 4)) continue; gs.add(o.g); out.push(o); }
    return out;
  }
  /** 지금 집 둘레 동(가까운 순 n곳, 지금 동 포함) */
  function nearHome(dong, g, d, n) {
    const me = dong && (dong[g + '|' + d] || dong[g + '|' + String(d || '').split(/\s+/)[0]]); if (!me) return [{ g, d, km: 0 }];
    return Object.keys(dong).map(k => ({ g: k.slice(0, 5), d: k.slice(6), km: km([dong[k][0], dong[k][1]], me) })).sort((a, b) => a.km - b.km).slice(0, n || 3);
  }
  const inAreas = (areas, g, d) => areas.some(a => a.g === g && (!a.d || a.d === d || String(d).split(/\s+/)[0] === a.d));

  /* ---------- 글자 ---------- */
  function won(m) { m = Math.round(+m || 0); const e = Math.floor(m / 10000), r = m % 10000; return e && r ? `${e}억 ${r.toLocaleString('ko-KR')}만 원` : e ? `${e}억 원` : `${r.toLocaleString('ko-KR')}만 원`; }
  const pyeong = a => Math.round(a / PY * 10) / 10;
  const pct = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v * 100).toFixed(1) + '%';

  const API = { PY, WALK, MIN_N, WIN, NEAR, BANDS, bandsNear, recentAuto, nearLo, TH, SRC, FEE_SRC, brokerFee, plan, weights, scoreOf, pick, KIND, rentPath, addM, med, recentNew, trend1, km, nearSt, locate, row, sameBand, gains, GAIN_T, GAIN_NAME, better, cheaper, filt,
    hugEst, kkEst, renewHint, buyFit, buySort, nearWork, nearHome, inAreas, won, pyeong, pct };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_TSW = API;
})(typeof window !== 'undefined' ? window : this);
