/* 집예보 '시장 온도' 계산·문장 — 화면(temp/·주간 동향·지도 지역 분석·내 집·단지 순위·모닝 브리핑·고민 해결 길잡이)과 tools/temp-test.js 가 함께 쓴다.
   자료(공개): temp/index.json (엔진 market_temp.py, 주 1회)
     asof 계산일 · week 계산 주(월요일) · lm 기준 달(창 마지막 달) · labels 단계 이름 · src 출처 · bt 지난 자료로 본 성적(요약)
     kr / sido[sNN] / g[시군구]: { nm, l(0~4 | null), lm, why(이유 문장), k{지표: 0 낮음·1 보통·2 높음},
        c: { v: {n3, base, from, to, est}, u: {r, dn, n, from, to}, nh: {r, n, from, to}, cx: {r, n, from, to} },
        rsd: {w, wd, v, v4, zone?} (부동산원 매매수급지수), wk: {w, wd, c1, c4} (부동산원 주간 매매가격지수 변동 %),
        jr: [지금 %, 1년 전 %], jm, uns: [최근, 1년 전], um, pend: [{ym, n, e?, r?[낮은, 높은], p}] (신고 진행 중 달), sid(구의 시·도) }
   temp/sNN.json · temp/kr.json: { hist: 시·도(전국) 월별 기록, gu: {시군구: 기록} } — 기록 {n, vn, l, u, nh}: [시작 연월, 값…]
   원칙: 숫자는 파일 값 그대로(더하기·빼기·나누기만). 사라·팔라는 말을 하지 않는다. 경쟁 서비스 이름을 쓰지 않는다.
   window.JDJ_TEMP */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const DATA = JB.DATA + 'data/temp/';
  const PAGE = JB.SITE + 'temp/';

  const LABELS = ['얼어붙음', '쌀쌀함', '보통', '따뜻함', '뜨거움'];
  /* 단계 색: 차가움(파랑) → 보통(회색) → 뜨거움(빨강). 글자 대비 4.5:1 이상(흰 바탕 위 글자색 fg) */
  const COLORS = ['#1D5FD1', '#4A8BE0', '#8B95A1', '#E8833A', '#D93A3F'];
  const FG = ['#174EAB', '#2C6CC4', '#4E5968', '#B25A12', '#C0272D'];
  const BG = ['#E8F0FC', '#EEF4FD', '#F2F4F6', '#FDF1E7', '#FDECEC'];
  const SHORT = ['아주 차가워요', '차가운 편이에요', '평소와 비슷해요', '따뜻한 편이에요', '아주 뜨거워요'];
  /** 단계 이름 쉬운 풀이(화면 '보는 법') */
  const MEANING = [
    '거래가 뜸하고 값을 낮춰 파는 거래가 많은, 그 지역 지난 기록 중 가장 조용한 쪽이에요.',
    '평소보다 거래가 적거나 내린 값 거래가 많은 편이에요.',
    '거래량·가격 움직임이 그 지역의 평소 수준이에요.',
    '평소보다 거래가 활발하거나 오른 값 거래·신고가가 많은 편이에요.',
    '거래가 몰리고 오른 값 거래·신고가가 잦은, 그 지역 지난 기록 중 가장 뜨거운 쪽이에요.'
  ];

  const n0 = v => Math.round(+v).toLocaleString('ko-KR');
  const ymTxt = ym => ym ? `${String(ym).slice(0, 4)}년 ${+String(ym).slice(4, 6)}월` : '';
  const mTxt = ym => ym ? `${+String(ym).slice(4, 6)}월` : '';
  const dotDate = d => d ? String(d).replace(/-/g, '.') : '';
  /** '2026년 8~10월' / '2025년 12월~2026년 2월' */
  function span(a, b) {
    if (!a || !b) return ymTxt(a || b);
    return String(a).slice(0, 4) === String(b).slice(0, 4) ? `${String(a).slice(0, 4)}년 ${+String(a).slice(4)}~${+String(b).slice(4)}월` : `${ymTxt(a)}~${ymTxt(b)}`;
  }
  const sgn = (v, d) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d == null ? 2 : d) + '%';

  /* ---------- 지역 고르기 ---------- */
  /** 코드('kr' | 'sNN' | 시군구 5자리) → 항목 / null */
  function region(I, code) {
    if (!I) return null;
    if (!code || code === 'kr' || code === '00') return I.kr || null;
    if (/^s\d\d$/.test(code)) return (I.sido || {})[code] || null;
    return (I.g || {})[code] || null;
  }
  /** 시군구의 시·도 id (항목 sid, 없으면 null) */
  const sidoOf = (I, g) => (((I || {}).g || {})[g] || {}).sid || null;
  /** 시·도 목록 [{id, nm, short, l}] — 파일 순서 */
  function sidoList(I) {
    return Object.keys((I && I.sido) || {}).map(id => ({ id, nm: I.sido[id].nm, short: I.sido[id].short || I.sido[id].nm, l: I.sido[id].l }));
  }
  /** 시·도 안 구 목록 [{g, nm, l}] — 이름 순 */
  function guList(I, sid) {
    return Object.keys((I && I.g) || {}).filter(g => I.g[g].sid === sid).map(g => ({ g, nm: I.g[g].nm, l: I.g[g].l }))
      .sort((a, b) => String(a.nm).localeCompare(String(b.nm), 'ko'));
  }

  /* ---------- 요약 한 줄 ---------- */
  /** 항목 → {l, t(단계 이름), short, color, fg, bg, why, basis(기준 문장), none(온도 없음 이유)} */
  function summary(I, r) {
    if (!r) return null;
    const l = r.l, has = l != null && l >= 0 && l <= 4;
    const c = (r.c && r.c.v) || {};
    return {
      l: has ? l : null, t: has ? LABELS[l] : '', short: has ? SHORT[l] : '', color: has ? COLORS[l] : '#B0B8C1', fg: has ? FG[l] : '#6B7684', bg: has ? BG[l] : '#F2F4F6',
      why: r.why || '', none: has ? '' : (r.why || '온도를 매길 자료가 모자라요.'),
      basis: `${span(c.from, c.to || r.lm || (I && I.lm))} 계약 실거래 기준 · ${dotDate(I && I.asof)} 계산`
    };
  }
  /** 고민 해결 길잡이·브리핑용 한 줄: "송파구 시장 온도: 따뜻함 — 이유" */
  function line(I, code) {
    const r = region(I, code), s = summary(I, r);
    if (!s || s.l == null) return '';
    return `${r.nm} 시장 온도는 '${s.t}'이에요. ${s.why}`;
  }
  /** 고민 해결 길잡이 참고 칸 {k, v, s} — 화면마다 같은 숫자 */
  function refItem(I, code) {
    const r = region(I, code), s = summary(I, r);
    if (!s || s.l == null) return null;
    return { k: `${r.nm} 이번 주 시장 온도`, v: s.t, s: `${s.why} (${s.basis}, 그 지역 지난 기록과 비교한 단계예요)` };
  }

  /* ---------- 지표 줄 ---------- */
  /** 항목 → [{id, t(이름), v(큰 글자), s(풀이), dir(0·1·2|null), ref(참고 여부)}] */
  function comps(r) {
    if (!r || !r.c) return [];
    const C = r.c, k = r.k || {}, out = [];
    const v = C.v || {};
    if (v.n3 != null) {
      const d = v.base > 0 ? (v.n3 / v.base - 1) * 100 : null;
      out.push({ id: 'v', t: '아파트 거래량', v: `${n0(v.n3)}건`,
        s: `${span(v.from, v.to)} 계약(해제 뺌)${v.base > 0 ? ` · 직전 3년 같은 길이 평균 ${n0(v.base)}건보다 ${d >= 0 ? `${Math.abs(d).toFixed(0)}% 많아요` : `${Math.abs(d).toFixed(0)}% 적어요`}` : ''}${v.est ? ' · 가장 최근 달은 신고가 끝나지 않아 예상 건수를 넣었어요' : ''}`,
        dir: k.v != null ? k.v : null });
    }
    const u = C.u || {};
    if (u.r != null) out.push({ id: 'u', t: '직전 거래보다 오른 거래', v: `${u.r.toFixed(1)}%`,
      s: `같은 단지·같은 면적의 1년 안 직전 거래와 비교 · 내린 거래 ${u.dn != null ? u.dn.toFixed(1) + '%' : '-'} · 비교한 거래 ${n0(u.n)}건`, dir: k.u != null ? k.u : null });
    else if (u.n != null) out.push({ id: 'u', t: '직전 거래보다 오른 거래', v: '-', s: `비교할 거래가 ${n0(u.n)}건뿐이라 비율을 내지 않았어요`, dir: null });
    const h = C.nh || {};
    if (h.r != null) out.push({ id: 'nh', t: '신고가 거래', v: `${h.r.toFixed(1)}%`, s: `그 집의 이전 최고가를 넘은 거래 비율(직거래 뺌) · 비교한 거래 ${n0(h.n)}건`, dir: k.nh != null ? k.nh : null });
    const x = C.cx || {};
    if (x.r != null) out.push({ id: 'cx', t: '계약 해제(취소)', v: `${x.r.toFixed(1)}%`,
      s: `${span(x.from, x.to)} 계약 중 해제 신고 비율 · 해제는 늦게 신고돼 석 달 앞 계약으로 봐요 · 급등기에 오히려 늘기도 해서 온도에는 넣지 않은 참고 값이에요`, dir: null, ref: true });
    return out;
  }
  /** 함께 보는 공식 통계·참고 → [{t, v, s}] */
  function official(I, r) {
    const out = [];
    if (!r) return out;
    if (r.rsd && r.rsd.v != null) {
      const d = r.rsd.v4 != null ? r.rsd.v - r.rsd.v4 : null;
      out.push({ t: `한국부동산원 매매수급지수${r.rsd.zone ? `(${r.rsd.zone})` : ''}`, v: r.rsd.v.toFixed(1),
        s: `100보다 높으면 사려는 사람이 팔려는 사람보다 많다는 뜻 · ${r.rsd.wd || ''}${d != null ? ` · 4주 전보다 ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}` : ''}${r.rsd.zone ? ' · 서울은 생활권 단위로만 발표돼요' : ''}` });
    }
    if (r.wk && r.wk.c4 != null) out.push({ t: '한국부동산원 주간 아파트값', v: `4주 ${sgn(r.wk.c4)}`, s: `지난주 ${sgn(r.wk.c1)} · ${r.wk.wd ? dotDate(r.wk.wd) + ' 조사' : ''} · 조사 기반 공식 지수로 계산(발표 변동률과 소수 둘째 자리에서 다를 수 있어요)` });
    if (r.jr && r.jr[0] != null) out.push({ t: '전세가율', v: `${r.jr[0].toFixed(1)}%`, s: `매매 평당가 대비 전세 평당가 · ${ymTxt(r.jm)}${r.jr[1] != null ? ` · 1년 전 ${r.jr[1].toFixed(1)}%` : ''}` });
    if (r.uns && r.uns[0] != null) out.push({ t: '미분양', v: `${n0(r.uns[0])}세대`, s: `${ymTxt(r.um)}${r.uns[1] != null ? ` · 1년 전 ${n0(r.uns[1])}세대` : ''} · 국토교통부 미분양주택현황` });
    return out;
  }
  /** 신고 진행 중 달 → [{ym, t}] */
  function pendList(r) {
    return ((r && r.pend) || []).map(p => ({ ym: p.ym, t: p.e != null && p.r
      ? `${mTxt(p.ym)} 계약: 지금까지 ${n0(p.n)}건 신고 · 신고 진행 중(예상 ${n0(p.r[0])}~${n0(p.r[1])}건)`
      : `${mTxt(p.ym)} 계약: 지금까지 ${n0(p.n)}건 신고 · ${p.p ? '아직 달이 끝나지 않았거나 신고 기간이라 계속 늘어요' : '거의 다 신고됐어요'}` }));
  }

  /* ---------- 지난 자료로 본 성적(공개 요약) ---------- */
  function backtestRows(I) {
    const b = I && I.bt;
    if (!b || !Array.isArray(b.rows)) return null;
    return { h: b.h, from: b.from, to: b.to, rho: b.rho, rhoPos: b.rho_pos, months: b.months,
      rows: b.rows.map(x => ({ l: x.l, t: LABELS[x.l], n: x.n, med: x.med, up: x.up, beat: x.beat })) };
  }
  /** 성적 한 문단(과장 없이) */
  function backtestText(I) {
    const B = backtestRows(I);
    if (!B || B.rows.length < 2) return '';
    const lo = B.rows[0], hi = B.rows[B.rows.length - 1];
    return `${B.from ? ymTxt(B.from) : ''}부터 ${B.to ? ymTxt(B.to) : ''}까지 구마다 매달 그때까지의 자료로만 온도를 매겨 보니, 1년 뒤 그 구 아파트 평당가(실거래 중간값)는 '${lo.t}'일 때 중간값 ${sgn(lo.med, 1)}, '${hi.t}'일 때 ${sgn(hi.med, 1)}였어요. `
      + `같은 시·도 다른 구들보다 더 오른 비율은 '${lo.t}' ${lo.beat != null ? lo.beat.toFixed(0) + '%' : '-'} → '${hi.t}' ${hi.beat != null ? hi.beat.toFixed(0) + '%' : '-'}로 차이는 있지만 크지 않아요. `
      + `온도는 지금 분위기를 요약한 것이지 앞으로의 가격을 맞히는 예측이 아니에요.`;
  }

  /* ---------- 그래프용 ---------- */
  /** [시작 연월, 값…] → [{ym, v}] (null 은 v=null 로 남김) */
  function series(a) {
    if (!Array.isArray(a) || a.length < 2) return [];
    const out = []; let y = +String(a[0]).slice(0, 4), m = +String(a[0]).slice(4, 6);
    for (let i = 1; i < a.length; i++) { out.push({ ym: y + String(m).padStart(2, '0'), v: a[i] }); m++; if (m > 12) { m = 1; y++; } }
    return out;
  }
  /** 기록 → 그래프 점 [{ym, n, l, vn}] (from 연월 이후) */
  function chartRows(h, from) {
    const n = series(h && h.n), l = {}, vn = {};
    series(h && h.l).forEach(p => { l[p.ym] = p.v; });
    series(h && h.vn).forEach(p => { vn[p.ym] = p.v; });
    return n.filter(p => !from || p.ym >= from).map(p => ({ ym: p.ym, n: p.v, l: l[p.ym] != null ? l[p.ym] : null, vn: vn[p.ym] != null ? vn[p.ym] : null }));
  }
  /** 기록 파일에서 지역 기록 찾기 */
  function histOf(F, code) {
    if (!F) return null;
    if (!code || code === 'kr' || /^s\d\d$/.test(code)) return F.hist || null;
    return (F.gu || {})[code] || null;
  }
  /** 기록 파일 이름 */
  function fileOf(I, code) {
    if (!code || code === 'kr' || code === '00') return 'kr';
    if (/^s\d\d$/.test(code)) return code;
    return sidoOf(I, code);
  }
  const pageUrl = code => PAGE + (code && code !== 'kr' ? '?g=' + encodeURIComponent(code) : '');

  const API = { DATA, PAGE, LABELS, COLORS, FG, BG, SHORT, MEANING, region, sidoOf, sidoList, guList, summary, line, refItem, comps, official, pendList,
    backtestRows, backtestText, series, chartRows, histOf, fileOf, pageUrl, span, ymTxt };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.JDJ_TEMP = API;
})(typeof window !== 'undefined' ? window : globalThis);
