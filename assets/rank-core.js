/* 집코드 순위 화면(/rank/) 계산 — 화면·테스트(tools/rank-test.js) 공용, DOM 없음.
   자료는 공개 파일 그대로: index.json sgg[구].s(그 달까지 3개월 실거래 평당가 중앙값, 만원)·c(월별 거래 수)·gs(지역 흐름 점수 0~100),
   model.json region(지역 점수 검증), rank.json(지난달 스냅숏 대비 점수 변화 — 아직 없음). 여기서 새 숫자를 만들지 않고 두 달 값의 비율·정렬만 한다.
   단지 미래가치 순위(첫 화면 'TOP 3'·/rank/ 단지별)는 공개 요약 home/sNN.json top(엔진 scripts/home_pulse.py 가 sNN.json 점수로 줄 세운 것)을 그대로 읽는다
   → 두 화면의 등수·점수가 같은 파일에서 나와 어긋나지 않는다.
   window.JDJ_RANK = { PERIODS, MIN_TRADES, sidoOf, price, future, check, mapUrl, gsFromUnits, moves, mineUrl, ym, won, pct, spark, danji, danjiRule, vcheck, danjiKey } */
(function (root) {
  'use strict';
  const PERIODS = [1, 3, 6, 12];
  const MIN_TRADES = 10;            // 비교하는 두 시점 모두 3개월 거래가 10건 이상인 구·시·군만 순위에 넣음(몇 건으로 평당가가 크게 출렁이는 곳 제외)
  const SPARK = 12;
  const BASE = '/jangdaejang-calc/';

  const sum3 = (c, i) => (c[i] || 0) + (c[i - 1] || 0) + (c[i - 2] || 0);
  const r1 = v => Math.round(v * 10) / 10;

  /* 시·도 목록(index.json sido) + 전국. id·name·short */
  function sidoOf(IX) {
    return ((IX && IX.sido) || []).map(s => ({ id: s.id, name: s.name, short: s.short }));
  }

  /* 구별 시세 순위
     sido: 시·도 이름(index.json sgg[].sido) 또는 'all'(전국), k: 비교 개월(1·3·6·12), dir: 'up'|'down'
     → { at(기준 달 YYYYMM), from(비교 달), rows:[{code, name, sido, r(등수), p(평당가 만원), ch(변동률 %, 소수 1자리), spark(최근 12개월)}],
         up, down, flat(소수 1자리로 0.0%), skip(거래가 적어 뺀 곳 수) } */
  function price(IX, sido, k, dir) {
    const months = (IX && IX.months) || [], i = months.length - 1, j = i - k;
    const out = { at: months[i] || null, from: months[j] || null, rows: [], up: 0, down: 0, flat: 0, skip: 0 };
    if (i < 0 || j < 0) return out;
    for (const [code, g] of Object.entries((IX && IX.sgg) || {})) {
      if (sido !== 'all' && g.sido !== sido) continue;
      const s = g.s || [], c = g.c || [];
      const a = s[j], b = s[i];
      if (!(a > 0 && b > 0) || sum3(c, i) < MIN_TRADES || sum3(c, j) < MIN_TRADES) { out.skip++; continue; }
      const ch = r1((b / a - 1) * 100);
      out.rows.push({ code, name: g.name, sido: g.sido, p: b, ch, spark: s.slice(Math.max(0, i - SPARK + 1), i + 1) });
      if (ch > 0) out.up++; else if (ch < 0) out.down++; else out.flat++;
    }
    const sg = dir === 'down' ? 1 : -1;
    out.rows.sort((x, y) => sg * (x.ch - y.ch) || sg * (x.p - y.p) || x.name.localeCompare(y.name, 'ko'));
    out.rows.forEach((x, n) => { x.r = n && out.rows[n - 1].ch === x.ch ? out.rows[n - 1].r : n + 1; });   // 같은 변동률은 같은 등수
    return out;
  }

  /* 지역 흐름 점수(gs) 순위 — 같은 시·도 안, 점수가 있는 구·시·군끼리 실제로 줄 세운 등수(같은 점수는 같은 등수).
     gsMap: {구 코드: gs} (시·도 단지 자료에서 모은 값 — gsFromUnits). index.json sgg[].gs 가 있으면 그것도 씀.
     → { n, rows:[{code, name, gs, r, pos(상위권·중위권·하위권)}] } 점수 높은 순. n<3 이면 rows 빈 배열(순위를 매기지 않음) */
  function future(IX, sido, gsMap) {
    const rows = [];
    for (const [code, g] of Object.entries((IX && IX.sgg) || {})) {
      if (g.sido !== sido) continue;
      const gs = gsMap && gsMap[code] != null ? gsMap[code] : g.gs;
      if (gs == null) continue;
      rows.push({ code, name: g.name, gs });
    }
    /* 엔진 곳 수(sido.ngs)가 있으면 엔진이 매긴 실제 등수(gs = round(100·(i+0.5)/n) 를 되돌림 — plain-words regionRank 와 같은 계산,
       지도·내 집 시세·리포트의 'N위'와 같다). 단지 자료가 없는 구는 목록에 없어도 등수·곳 수는 엔진 기준 그대로 */
    const sd = ((IX && IX.sido) || []).find(s => s.name === sido), ngs = sd && sd.ngs > 0 ? sd.ngs : 0;
    const n = ngs || rows.length;
    if (n < 3 || !rows.length) return { n, rows: [] };
    rows.sort((a, b) => b.gs - a.gs || a.name.localeCompare(b.name, 'ko'));
    rows.forEach((x, i) => {
      x.r = ngs ? Math.min(n, Math.max(1, n - Math.round(x.gs * n / 100 - 0.5))) : i && rows[i - 1].gs === x.gs ? rows[i - 1].r : i + 1;
      x.pos = x.r <= n / 3 ? '상위권' : x.r > n * 2 / 3 ? '하위권' : '중위권';
    });
    return { n, rows };
  }

  /* 지역 흐름 점수 성적(model.json region): 엔진이 쓰기로 한(used) 때만 순위를 보여 줌.
     → null 또는 { n(과거에 써 본 횟수), hit(상위 20%가 평균보다 더 오른 횟수), y0, y1(예측 시점 연도), oos(가장 최근 회차를 그 전 자료만으로 예측했을 때 상위 20% 초과 %p), t0(그 회차 시점) } */
  function check(MJ) {
    const R = MJ && MJ.region;
    if (!R || !R.used) return null;
    const P = (R.periods || []).filter(p => p && p.top20 != null);
    if (!P.length) return null;
    const ys = P.map(p => +String(p.t0).slice(0, 4));
    return { n: P.length, hit: P.filter(p => p.top20 > 0).length, y0: Math.min(...ys), y1: Math.max(...ys), oos: R.oos && R.oos.top20 != null ? R.oos.top20 : null, t0: R.oos && R.oos.t0 ? String(R.oos.t0) : null };
  }

  /* 구 → 지도 화면 주소(그 구 가운데, 동 묶음이 보이는 줌). GEO = assets/map-geo.json, m = 'price'|'fv' */
  function mapUrl(GEO, code, m) {
    const c = GEO && GEO.sgg && GEO.sgg[code];
    if (!c) return BASE + 'map/' + (m && m !== 'price' ? '?m=' + m : '');
    return BASE + 'map/?lat=' + c[1].toFixed(5) + '&lng=' + c[0].toFixed(5) + '&z=13' + (m && m !== 'price' ? '&m=' + m : '');
  }

  /* 시·도 단지 자료(sNN.json units: [sgg, …, fpack(9번째 칸)]) → {구: gs} (같은 구 단지는 모두 같은 gs) */
  function gsFromUnits(units) {
    const out = {};
    for (const u of units || []) { const f = u && u[9]; if (f && f.gs != null && out[u[0]] == null) out[u[0]] = f.gs; }
    return out;
  }

  /* rank.json(월별 점수 스냅숏 두 달치가 생기면 데이터 쪽에서 만듦) → 화면 줄. ready 가 아니면 null(화면은 '다음 달부터 공개')
     형식: { ready:true, from:'YYYYMM', to:'YYYYMM', sido:{ s00:{ up:[[key, apt, 구 코드, 동, 평형, 지난달 점수, 이번 달 점수], …], down:[…] } } }
     → { from, to, up:[{key, apt, code, dong, band, a, b, d}], down:[…] } (d = b − a, 정렬은 자료 순서 그대로) */
  function moves(RK, sid) {
    if (!RK || !RK.ready || !RK.sido) return null;
    const S = RK.sido[sid] || { up: [], down: [] };
    const m = r => ({ key: r[0], apt: r[1], code: r[2], dong: r[3], band: r[4], a: r[5], b: r[6], d: r[6] - r[5] });
    return { from: RK.from, to: RK.to, up: (S.up || []).map(m), down: (S.down || []).map(m) };
  }
  /* 단지 미래가치 순위(home/sNN.json top) — g: 'all' 또는 구 코드, n: 보여 줄 줄 수(없으면 전부)
     → null(자료 없음) 또는 { n(비교한 단지 수), min(후보 기준), order('rank' 엔진 등수 | 'score' 예전 자료), rows:[{r(등수 = 파일 순서), tie(같은 등수가 있으면), code, dong, jibun, apt, band, fv, fvg, trades, key}] } */
  function danji(H, g, n) {
    const T = H && H.top; if (!T || !T.lists || !T.rows) return null;
    const L = T.lists[g || 'all']; if (!L) return { n: (T.n && T.n[g]) || 0, min: T.min, order: T.order, rows: [] };
    const all = L.map(([i, r]) => { const x = T.rows[i] || []; return { r, code: x[0], dong: x[1], jibun: x[2], apt: x[3], band: x[4], fv: x[5], fvg: x[6], trades: x[7], key: danjiKey(x) }; });
    all.forEach(x => { x.tie = all.filter(y => y.r === x.r).length > 1; });
    return { n: (T.n && T.n[g || 'all']) || all.length, min: T.min, order: T.order, rows: n ? all.slice(0, n) : all };
  }
  /* 단지 순위 기준·순서 한 줄(첫 화면·/rank/ 같은 문장) — 파일에 적힌 기준값만 씀 */
  function danjiRule(o) {
    const m = o && o.min; if (m == null) return '';
    const base = typeof m === 'object'
      ? `${m.hh}세대 이상(세대수 자료가 없으면 단지 전체 최근 3년 거래 ${m.danji3y}건 이상), 그 평형 최근 1년 거래 ${m.y1}건 이상인 단지만`
      : `최근 3년 거래 ${m}건 이상인 단지만`;
    const ord = o.order === 'rank' ? '같은 점수는 엔진이 매긴 실제 등수 순이에요' : o.order === 'score' ? '같은 점수는 구 안 점수·최근 1년 거래가 많은 순이에요' : '같은 점수는 같은 등수예요';
    return `${base}, 단지마다 순위가 가장 높은 평형으로 줄 세웠어요. ${ord}.`;
  }
  /* 단지 키(내 집 시세 주소 d): 시군구|동|지번|단지 — mine-core danjiKey 와 같은 순서 */
  const danjiKey = x => [x[0], x[1], x[2], x[3]].join('|');
  /* 2년 미래가치 점수 검증 성적(model_h.json '2', 시·도 성적 reg 가 있으면 그것) — narrative.js MR 과 같은 규칙
     → null 또는 { n(표본 외 검증 수), hit(점수 상위 20%가 같은 구 평균보다 더 오른 수), ok(엔진 통과 판정), where(성적을 낸 곳) } */
  function vcheck(MH, sido) {
    const m = MH && MH['2']; if (!m) return null;
    const r = m.reg && sido ? m.reg[sido] : null;
    if (r && r.fb !== 'all' && (r.oos_all || []).length) return { n: r.oos_all.length, hit: r.hit || 0, ok: !!r.ok, where: r.name || sido };
    const O = m.oos_all || []; if (!O.length) return null;
    const hit = m.oos_hit != null ? m.oos_hit : O.filter(o => (o.top20 || 0) > 0).length;
    return { n: O.length, hit, ok: O.length >= 2 && m.oos_avg > 0 && 2 * hit >= O.length, where: '전국' };
  }
  /* 단지 → 내 집 시세 주소 */
  function mineUrl(sid, key, band) {
    const q = new URLSearchParams(); q.set('sd', sid); q.set('d', key); if (band) q.set('b', band);
    return BASE + 'mine/?' + q.toString();
  }

  /* 만원 → '1억 2,782만' / '9,850만' (평당가 표시) */
  function won(man) {
    man = Math.round(man); if (!(man > 0)) return '';
    const e = Math.floor(man / 10000), r = man % 10000;
    return !e ? r.toLocaleString('ko-KR') + '만' : e + '억' + (r ? ' ' + r.toLocaleString('ko-KR') + '만' : '');
  }
  /* 'YYYYMM' → '2026년 10월' */
  const ym = s => s ? `${String(s).slice(0, 4)}년 ${parseInt(String(s).slice(4, 6), 10)}월` : '';
  /* 변동률 → '+1.2%' / '−0.4%' / '0.0%' */
  const pct = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + '%';

  /* 작은 추세선(SVG path 좌표) — 값이 없는 달은 건너뜀. → 'M0,12L6,10…' */
  function spark(vals, w, h) {
    const v = (vals || []).map((x, i) => [i, x]).filter(p => p[1] > 0);
    if (v.length < 2) return '';
    const lo = Math.min(...v.map(p => p[1])), hi = Math.max(...v.map(p => p[1])), n = Math.max(1, (vals.length - 1));
    const y = x => hi === lo ? h / 2 : h - 1 - (x - lo) / (hi - lo) * (h - 2);
    return v.map((p, k) => (k ? 'L' : 'M') + (p[0] / n * w).toFixed(1) + ',' + y(p[1]).toFixed(1)).join('');
  }

  const API = { PERIODS, MIN_TRADES, sidoOf, price, future, check, mapUrl, gsFromUnits, moves, mineUrl, ym, won, pct, spark, danji, danjiRule, vcheck, danjiKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.JDJ_RANK = API;
})(typeof window !== 'undefined' ? window : globalThis);
