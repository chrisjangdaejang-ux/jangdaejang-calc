/* 장대장 '전월세 시세 & 전망' 공통 로직 — jeonse/ 화면과 tools/jeonse-test.js 가 함께 쓴다.
   자료(비공개 엔진 scripts/rent_site.py 가 만듦, 국토교통부 전월세 실거래 그대로 집계):
     jangdaejang-data data/rent/index.json  {v, to, m0, kinds:{a,v,o,d:{n, from, deals}}, sgg:{구코드:{k, js, m60, jr, sup, mig}}}
     rent/sNN.json            아파트 시·도 검색 목록(price/sNN.json 과 같은 모양 → JDJ_MINE.listRow)
     rent/{구}.json · rent/v/{구}.json · rent/o/{구}.json  units 행
       [0 동, 1 이름, 2 평형, 3 지번, 4 전용 중앙, 5 3년 전세 수, 6 3년 월세 수, 7 J, 8 WD, 9 WR, 10 계약 목록, 11 덧붙임]
       J/WD/WR = [시작 칸, 값…] (기준 달 m0, 월별 3개월 중앙값 — 전세 보증금 / 월세 보증금 / 월세, 만원, 0 = 계약 없음)
       계약 = [연월일, 전용, 층, 보증금, 월세, 0 신규·1 갱신·2 미기재, (계약기간, 종전 보증금, 종전 월세)]
       덧붙임 = {cv:{r,n,j} 전환율, jr:{r, at, s, j, ns, nj, b} 전세가율, jrs:[시작 칸, ‰…], by 준공, t 유형}
     rent/h/{구}.json 등       전체 기간 [동, 이름, 평형, 지번, J 전체, 전세가율 전체(‰)] (기준 달 rm)
     rent/d/{구}.json         단독·다가구 [동, 면적대, 3년 전세 수, 3년 월세 수, J 전체(기준 rm), WD, WR(기준 m0), 계약면적 중앙]
   여기서는 단순 집계·단위 환산·사용자가 넣은 값의 산수만 한다(추정·예측 없음). */
(function (root) {
  'use strict';
  const M = () => root.JDJ_MINE || (typeof require === 'function' ? require('./mine-core.js') : null);
  const KINDS = [
    { id: 'a', label: '아파트', sub: '' },
    { id: 'v', label: '빌라', full: '빌라(연립·다세대)', sub: 'v/' },
    { id: 'o', label: '오피스텔', sub: 'o/' },
    { id: 'd', label: '단독·다가구', sub: 'd/' }
  ];
  const kindOf = id => KINDS.find(k => k.id === id) || KINDS[0];
  /** HUG 전세보증금반환보증 가입 기준(주택도시보증공사 상품개요): 보증금 + 선순위채권 ≤ 주택가격 × 90%,
      연립·다세대·단독·다가구 주택가격 = 공시가격 × 140%(첫 순위), 선순위채권 ≤ 주택가격 × 60% */
  const HUG = { ratio: 0.9, pub: 1.4, senior: 0.6,
    url: 'https://www.khug.or.kr/hug/web/ig/dr/igdr000001.jsp', name: '주택도시보증공사(HUG) 전세보증금반환보증 상품개요' };

  /** [시작 칸, 값…] → 길이 n 배열(앞은 0으로 채움, 뒤도 0) */
  function arr(a, n) {
    const out = new Array(n).fill(0); if (!Array.isArray(a) || a.length < 2) return out;
    for (let k = 1; k < a.length; k++) { const i = a[0] + k - 1; if (i >= 0 && i < n) out[i] = +a[k] || 0; }
    return out;
  }
  /** 'YYYYMM' 부터 'YYYYMM' 까지 */
  function monthsFrom(a, b) { const m = M(), out = []; if (!a || !b) return out; for (let ym = a; ym <= b; ym = m.ymAdd(ym, 1)) out.push(ym); return out; }
  /** 한 단지·평형의 최근 창(37개월) 시계열: {months, j, wd, wr, jr(0~1)} */
  function series(u, meta) {
    const months = monthsFrom(meta.m0, meta.to), n = months.length, x = (u && u[11]) || {};
    return { months, j: arr(u[7], n), wd: arr(u[8], n), wr: arr(u[9], n), jr: arr(x.jrs, n).map(v => v / 1000) };
  }
  /** 전체 기간(h 파일 행): {months, j, jr} */
  function seriesFull(row, h) {
    if (!row || !h) return null;
    const months = monthsFrom(h.rm, h.to), n = months.length;
    return { months, j: arr(row[4], n), jr: arr(row[5], n).map(v => v / 1000) };
  }
  /** h 파일에서 같은 단지·평형 행 찾기 */
  const histRow = (h, u) => (h && Array.isArray(h.units)) ? h.units.find(r => r[0] === u[0] && r[1] === u[1] && r[2] === u[2] && String(r[3]) === String(u[3])) || null : null;
  /** 최근 값(마지막 3개월 안) {v, at, stale} 또는 null */
  function latest(a, months) {
    const i = M().lastIdx(a); if (i < 0) return null;
    return { v: a[i], at: months[i], stale: i < a.length - 1 };
  }
  /** back 개월 전과 비교(JDJ_MINE.changeBack 그대로 — 그 달 값이 없으면 2달 뒤까지만 찾고, 없으면 null) */
  const change = (a, months, back) => M().changeBack(a, months, back);

  /** 전세가율 위험 표시. r = 0~1. 공식 기준으로 확인한 것은 HUG 보증 가입 기준 90% 하나뿐이라 두 단계만 쓴다 */
  function risk(r) {
    if (!(r > 0)) return null;
    const pct = Math.round(r * 1000) / 10;
    return { pct, over: r >= HUG.ratio, level: r >= HUG.ratio ? 'hi' : 'ok' };
  }
  /** 공시가격(만원) → HUG 보증 가입 가능한 보증금 상한(만원) = 공시가격 × 140% × 90% − 선순위채권 */
  function hugCap(pub, senior) {
    pub = +pub || 0; senior = +senior || 0; if (!(pub > 0)) return null;
    const price = pub * HUG.pub, cap = price * HUG.ratio - senior;
    return { price: Math.round(price), cap: Math.round(cap), seniorOver: senior > price * HUG.senior };
  }
  /** 전월세 전환율 (월세×12)/(전세 − 월세 보증금). 계산 안 되면 null */
  function convRate(jeon, wDep, wRent) {
    jeon = +jeon || 0; wDep = +wDep || 0; wRent = +wRent || 0;
    return (jeon > wDep && wRent > 0) ? wRent * 12 / (jeon - wDep) : null;
  }
  /** 전세 vs 월세 매달 비용 비교(사용자가 넣은 값만).
      전세는 월세 보증금보다 더 내는 돈(전세 − 월세 보증금)을 전세대출 금리(연 %)로 빌린다고 보고 매달 이자를 비용으로 본다.
      → {gap, jCost, wRent, diff(월세 − 전세 이자, +면 전세가 쌈), cheaper 'j'|'w'|'same', be(손익분기 금리 % = 전환율)} */
  function compare(o) {
    const J = +o.jeon || 0, D = +o.wDep || 0, W = +o.wRent || 0, rate = o.rate === '' || o.rate == null ? null : +o.rate;
    if (!(J > 0) || !(W > 0) || !(J > D)) return null;
    const gap = J - D, be = W * 12 / gap * 100;
    if (rate == null || !isFinite(rate) || rate < 0) return { gap, be, rate: null };
    const jCost = gap * rate / 100 / 12, diff = W - jCost;
    return { gap, be, rate, jCost, wRent: W, diff, cheaper: Math.abs(diff) < 0.5 ? 'same' : diff > 0 ? 'j' : 'w' };
  }
  /** 계약 목록 → 보기 좋은 모양(최신순 그대로) */
  const CT = ['신규', '갱신', ''];
  function deals(u) {
    return (Array.isArray(u && u[10]) ? u[10] : []).map(t => {
      const s = String(t[0]);
      return { ymd: t[0], date: `${s.slice(0, 4)}.${s.slice(4, 6)}` + (s.slice(6, 8) !== '00' ? '.' + s.slice(6, 8) : ''), area: t[1], floor: t[2],
        dep: t[3], rent: t[4], jeonse: !(t[4] > 0), ct: CT[t[5]] || '', term: t[6] || '', pre: t[7] != null ? t[7] : null, preRent: t[8] != null ? t[8] : null };
    });
  }
  /** 한 평형 요약 */
  function summary(u, meta) {
    const t = series(u, meta), x = u[11] || {};
    return { t, j: latest(t.j, t.months), wd: latest(t.wd, t.months), wr: latest(t.wr, t.months),
      ch1: change(t.j, t.months, 12), ch3: change(t.j, t.months, 36), nj: u[5], nw: u[6], cv: x.cv || null, jr: x.jr || null, by: x.by || null, type: x.t || '' };
  }
  /** 구 전세 추이(평당 보증금): {months, s} */
  function guSeries(g) {
    if (!g || !g.js || !g.m60) return null;
    const m = M(), n = g.js[0] + g.js.length - 1, months = []; for (let i = 0; i < n; i++) months.push(m.ymAdd(g.m60, i));
    return { months, s: arr(g.js, n) };
  }
  /** 같은 구 건물 목록(빌라·오피스텔): 동 → [건물 묶음] (평형을 묶음) */
  function groupBld(units) {
    const m = new Map();
    for (const u of units || []) {
      const k = [u[0], u[3], u[1]].join('|');
      let d = m.get(k); if (!d) { d = { key: k, dong: u[0], jibun: u[3], name: u[1], bands: [], n: 0 }; m.set(k, d); }
      d.bands.push(u); d.n += (u[5] || 0) + (u[6] || 0);
    }
    for (const d of m.values()) d.bands.sort((a, b) => a[4] - b[4]);
    return m;
  }
  /** 이름 검색(빌라·오피스텔, 한 구 안): JDJ_MINE.matchName 규칙 */
  function searchBld(groups, q, limit) {
    const m = M(); if (!m.normName(q)) return [];
    const out = [];
    for (const d of groups.values()) { const r = m.matchName(d.name || d.jibun, q); if (r >= 0) out.push([r, -d.n, d]); }
    out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return out.slice(0, limit || 20).map(x => x[2]);
  }
  /** 이름 없는 건물(빌라 원자료에 이름이 비거나 '(지번)' 꼴) 표시 */
  const bldName = d => (d.name && !/^\(?[\d\-]+\)?$/.test(d.name)) ? d.name : `${d.dong} ${d.jibun} 건물`;
  /** 앞으로 n개월 입주 예정 문장용: 'YYYYMM' → '2027년 3월' */
  const ymKo = ym => M().ymKo(ym);

  const API = { KINDS, kindOf, HUG, arr, monthsFrom, series, seriesFull, histRow, latest, change, risk, hugCap, convRate, compare, deals, summary, guSeries,
    groupBld, searchBld, bldName, ymKo };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_RENT = API;
})(typeof self !== 'undefined' ? self : this);
