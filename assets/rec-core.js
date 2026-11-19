/* 장대장 단지 추천 공통 로직 — 내 집 마련 리포트(buy/report)와 갈아타기(switch)가 함께 쓴다.
   자료: /jangdaejang-data/data/sNN.json 의 units
     u = [시군구코드, 동, 단지, 평형대, 전용㎡, 최근1년 거래수, 월별 평당가(만원) 36개, 월별 거래수 문자열, 지역 일자리, 미래가치 등 fx]
   규제지역(2026.7.1 기준): 서울 전역 + 경기 15곳 (국토교통부공고 제2025-1223호, 제2026-882호)
   ※ 점수 계산 세부 기준은 내부 기준이라 화면에 숫자로 보여 주지 않는다. */
(function (root) {
  'use strict';
  const PY = 3.3058;
  const REG_GG = ['41290', '41210', '41135', '41131', '41133', '41117', '41111', '41115', '41173', '41465', '41430', '41450', '41597', '41463', '41310'];
  const isReg = c => String(c).startsWith('11') || REG_GG.includes(String(c));
  const isCap = c => { c = String(c); return c.startsWith('11') || c.startsWith('41') || c.startsWith('28'); };
  const groupOf = c => isReg(c) ? 'reg' : (isCap(c) ? 'capfree' : 'local');
  /* 주택담보대출 LTV (2025.10.15 대책·2026.11 기준): 보유 상황별 */
  const LTV = { reg: { none: .40, first: .70, one: .40, multi: 0 }, capfree: { none: .70, first: .70, one: .70, multi: 0 }, local: { none: .70, first: .80, one: .70, multi: .60 } };
  const r100 = m => Math.round(m / 100) * 100;
  function lastNZ(arr) { for (let i = arr.length - 1; i >= Math.max(0, arr.length - 3); i--) if (arr[i] > 0) return arr[i]; return 0; }
  function firstNZ(arr) { for (let i = 0; i < Math.min(arr.length, 3); i++) if (arr[i] > 0) return arr[i]; return 0; }
  function recentCnt(cnt) { let s = 0; for (const ch of String(cnt).slice(-3)) s += ch.charCodeAt(0) - 48; return s; }
  function change6(arr) { const n = arr.length, a = arr[n - 1] || arr[n - 2], b = arr[n - 7] || arr[n - 8]; return (a > 0 && b > 0) ? (a - b) / b : null; }
  /** 자료 기간(약 3년) 처음과 끝 평당가 변동률 — 과거 실거래 기록 */
  function change3y(arr) { const a = lastNZ(arr), b = firstNZ(arr); return (a > 0 && b > 0) ? (a - b) / b : null; }
  /** 단지·평형 추정 시세(만원): 최근 3개월 실거래 평당가 중앙값(월별 값이 3개월 중앙값) × 전용면적 */
  function unitPrice(u) { const p = lastNZ(u[6]); return p ? r100(p * u[4] / PY) : 0; }
  const MIN_FIT = 0.55;   // 매수 가능액 대비 너무 낮은 단지는 추천에서 뺀다
  /** '너무 싼 단지' 제외를 지역 시세 기준으로 완화: 예산 대비 낮아도 그 시·군·구 같은 면적 시세(구 평당가 × 전용) 이상이면 남긴다.
      예산이 큰 사람이 시세가 낮은 지방을 고르면 결과가 0곳이 되던 문제(갈아타기) 해결용. refP 없으면 기존 기준 그대로 */
  function tooCheap(fit, P, refP) { return fit < MIN_FIT && !(refP > 0 && P >= refP); }

  /** 내부 정렬용 보조 점수(화면에 표시하지 않음) p: { fit, n, ch, rel, note(bool), fv(null|0~100) } */
  function scoreOf(p) {
    const sBudget = Math.max(0, 1 - Math.abs(0.93 - p.fit) * 2.2);
    const sLiq = Math.min(1, Math.log(p.n) / Math.log(160));
    // 완만한 상승이 가장 좋고, 급등은 추격 위험으로 감점, 하락은 중립 이하
    let sMom = 0.5;
    if (p.ch !== null && p.ch !== undefined) {
      if (p.ch < 0) sMom = Math.max(0.2, 0.55 + p.ch * 2);
      else if (p.ch <= 0.06) sMom = 0.7 + p.ch * 5;
      else sMom = Math.max(0.2, 1 - (p.ch - 0.06) * 5);
    }
    const sVal = Math.max(0, Math.min(1, 0.5 + (p.rel || 0)));
    const sNote = p.note ? 1 : 0.4;
    const fvS = (p.fv !== null && p.fv !== undefined) ? p.fv / 100 : null;
    // 미래가치 점수(표본 외 검증)가 있으면 그게 중심, 없으면 기존 기준
    return fvS !== null ? 0.42 * fvS + 0.25 * sBudget + 0.20 * sLiq + 0.13 * sNote
      : 0.28 * sBudget + 0.30 * sLiq + 0.16 * sMom + 0.14 * sVal + 0.12 * sNote;
  }
  /* 순위: 미래가치 점수가 있는 단지 먼저 점수 높은 순 → 같은 점수면 추천 점수 순 → 미래가치 점수가 없는 단지는 그 뒤 */
  const rankCmp = (a, b) => (b.hasFv - a.hasFv) || ((b.sortv != null ? b.sortv : b.disp) - (a.sortv != null ? a.sortv : a.disp)) || (b.score - a.score);
  /** 한 단지·한 구·한 시·도에 몰리지 않게 고른다. opt: { max, perSgg, perSido(지역 상관없음일 때), sidoOf(code) } */
  function diversify(sorted, opt) {
    const max = opt.max || 10, perSgg = opt.perSgg || 3, perSido = opt.perSido || 0;
    const picked = [], bySgg = {}, bySd = {}, seen = new Set();
    for (const x of sorted) {
      const key = x.code + '|' + x.apt; if (seen.has(key)) continue;
      if ((bySgg[x.code] || 0) >= perSgg) continue;
      const sd = perSido && opt.sidoOf ? opt.sidoOf(x.code) : '';
      if (sd && (bySd[sd] || 0) >= perSido) continue;
      picked.push(x); seen.add(key); bySgg[x.code] = (bySgg[x.code] || 0) + 1; if (sd) bySd[sd] = (bySd[sd] || 0) + 1;
      if (picked.length >= max) break;
    }
    return picked;
  }
  /** 점수 계산에 쓰는 한 단지 값 묶음 (P: 시세, M: 그 지역 매수 가능 상한, sggPpy: 구 평균 평당가) */
  function scoreUnit(u, P, M, sggPpy, note) {
    const fit = P / M, ch = change6(u[6]), ppy = lastNZ(u[6]);
    const rel = sggPpy ? (sggPpy - ppy) / sggPpy : 0;
    const fx = u[9] || null, hasFv = !!(fx && fx.fv != null);
    const score = scoreOf({ fit, n: u[5], ch, rel, note, fv: hasFv ? fx.fv : null });
    const disp = hasFv ? fx.fv : Math.min(99, Math.round(score * 100));
    return { fit, ch, rel, fx, hasFv, score, disp, sortv: hasFv && fx.fvSort != null ? fx.fvSort : disp };
  }

  const API = { PY, REG_GG, isReg, isCap, groupOf, LTV, r100, lastNZ, firstNZ, recentCnt, change6, change3y, unitPrice, MIN_FIT, tooCheap, scoreOf, scoreUnit, rankCmp, diversify };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_REC = API;
})(typeof self !== 'undefined' ? self : this);
