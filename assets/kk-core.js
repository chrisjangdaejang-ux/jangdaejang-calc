/* 깡통전세 확률(아파트) — 2년 뒤 이 단지·평형 매매 시세가 '보증금 + 선순위채권'보다 낮을 확률. 브라우저 window.JDJ_KK, node require 둘 다.
   자료: data/kkang.json (엔진 scripts/kkang.py 가 만든 공개 요약 — 가중치·계수 없음)
     reg[구코드] = [표본 수, 시·도 분포로 대신 1/0, 2년 로그 수익률 분위수(‰) × grid 칸]  — 이 구 단지·평형들의 과거 5년 2년 수익률 분포
     bt  = 2019~2022 실제 전세 계약 백테스트 결과(표본·역전 수·확률 구간별 예측 평균·실제 비율·연도별 성적)
     sim[구코드] = [[전세가율 구간 시작 %, 계약 수, 2년 뒤 역전 수]…] — 화면 '과거 비슷한 계약 ○건 중 ○건'
     status = 'ok'(보정 합격 → 확률 공개) | 'ref'(불합격 → '참고'로만)
   계산(백테스트와 같은 식): 확률 = P(2년 로그 수익률 < log((보증금 + 선순위채권) ÷ 지금 매매 시세)), 분위수 요약을 선으로 이은 누적 분포(cdf).
   지금 매매 시세는 '내 집 시세'와 같은 값(price/{구}.json, mine-core bandSummary). 금액 단위: 만원. */
(function (root) {
  'use strict';
  /** 분위수 요약 q(오름차순, grid % 위치)에서 P(X < x) — 엔진 kkang.cdf 와 같은 식(양 끝 밖은 끝 구간의 절반) */
  function cdf(q, grid, x) {
    const n = q.length;
    if (!n || n !== grid.length) return null;
    if (x <= q[0]) return grid[0] / 200;
    if (x >= q[n - 1]) return 1 - (100 - grid[n - 1]) / 200;
    let j = 1; while (j < n - 1 && q[j] <= x) j++;            // q[j-1] <= x < q[j]
    const lo = q[j - 1], hi = q[j];
    const f = hi > lo ? (x - lo) / (hi - lo) : 0;
    return (grid[j - 1] + f * (grid[j] - grid[j - 1])) / 100;
  }
  /** 근거 강도: 과거 비슷한 계약 수(300 이상 높음, 50 이상 보통, 그 밖 낮음), 구 표본이 모자라 시·도 분포를 썼으면 한 단계 낮춤 */
  function strength(n, fb) {
    let s = n >= 300 ? 2 : n >= 50 ? 1 : 0;
    if (fb) s = Math.max(0, s - 1);
    return { lv: s, t: ['낮음', '보통', '높음'][s] };
  }
  /** 전세가율(0~) → sim 구간 시작 % */
  function jrStart(jrb, r) { let b = jrb[0]; for (const e of jrb) if (r * 100 >= e) b = e; return b; }
  /** 구간 이름: 80 → '80~90%', 마지막 → '100% 이상' */
  function jrLabel(jrb, b) { const i = jrb.indexOf(b); return i < 0 ? '' : i === jrb.length - 1 ? `${b}% 이상` : i === 0 ? `${jrb[1]}% 미만` : `${b}~${jrb[i + 1]}%`; }

  /** o = {kk(공개 파일), code 구코드, dep 보증금, senior 선순위채권, price 지금 매매 시세(만원)} → 결과 또는 {miss 이유} */
  function estimate(o) {
    const K = o && o.kk; if (!K || !K.reg) return { miss: 'data' };
    const dep = +o.dep || 0, sen = Math.max(0, +o.senior || 0), price = +o.price || 0;
    if (!(dep > 0)) return { miss: 'dep' };
    if (!(price > 0)) return { miss: 'price' };
    const r = K.reg[o.code]; if (!r) return { miss: 'reg' };
    const q = r.slice(2).map(v => v / 1000);
    const owe = dep + sen, x = Math.log(owe / price);
    const p = cdf(q, K.grid, x);
    if (p == null) return { miss: 'data' };
    const ratio = owe / price;
    const b = jrStart(K.jrb, ratio), row = ((K.sim || {})[o.code] || []).find(s => s[0] === b) || [b, 0, 0];
    const st = strength(row[1], r[1]);
    /* 2년 뒤 시세 범위(참고): 분포의 10%·50%·90% 위치 */
    const at = pct => { const i = K.grid.indexOf(pct); return i < 0 ? null : Math.round(price * Math.exp(q[i]) / 100) * 100; };
    return { p, ratio, owe, x, pool: r[0], fb: !!r[1], sim: { b, label: jrLabel(K.jrb, b), n: row[1], k: row[2] }, st,
      range: { p10: at(10), p50: at(50), p90: at(90) }, status: K.status, ref: K.status !== 'ok' };
  }
  /** 확률 글자: 1% 미만 / 99% 초과 / 정수 % */
  function pText(p) { return p < 0.01 ? '1% 미만' : p > 0.99 ? '99% 넘음' : Math.round(p * 100) + '%'; }
  /** 백테스트 한 줄 요약에 쓸 숫자(공개 파일 그대로): 연도별 '50% 이상' 구간 실제 비율 */
  function yearTop(K) {
    const by = (K && K.bt && K.bt.byYear) || {};
    return Object.keys(by).sort().map(y => { const c = (by[y].cal || []).find(x => x[0] === 50); return c && c[2] ? { y, n: c[2], pred: c[3] / 1000, act: c[4] / 1000 } : null; }).filter(Boolean);
  }
  const API = { cdf, strength, jrStart, jrLabel, estimate, pText, yearTop };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_KK = API;
})(typeof window !== 'undefined' ? window : this);
