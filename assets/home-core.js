/* 집예보 첫 화면 호기심 카드 계산 — 화면(index.html)·테스트(tools/home-test.js) 공용, DOM 없음.
   자료: 공개 요약 home/sNN.json(엔진 scripts/home_pulse.py — 공개 실거래·점수 파일만 읽어 줄 세운 것),
         track.json·index.json track(엔진 scripts/track.py — 시세 추정 정확도). 여기서는 새 숫자를 만들지 않고 읽어서 고르기·표시만 한다.
   window.JDJ_HOME = { SIZES, SIZE_TXT, race, acc, regionPick, eok, md, qSpark, rule, heroFacts } */
(function (root) {
  'use strict';
  const SIZES = [['a', '전체'], ['s', '20평 미만'], ['m', '20평대'], ['l', '30평대'], ['x', '40평 이상']];
  const SIZE_TXT = { a: '전체 평형', s: '20평 미만', m: '20평대', l: '30평대', x: '40평 이상' };

  /* 하락 레이스·신고가 레이스: kind 'drop'|'high', g 'all'|구 코드, sz 'a'|'s'|'m'|'l'|'x'
     → null(자료 없음) 또는 { n(기준을 채운 단지·평형 수), rows:[…] }
       drop 줄: { code, dong, jibun, apt, band, area, q(분기 중간값 9개, 백만 원), peak, peakD, med, nRecent, last, lastD, rate(%) }
       high 줄: { …, amt, d, prevMax, prevMaxD, nHigh, rise(%) } */
  function race(H, kind, g, sz) {
    const R = H && H.race; if (!R || !R[kind]) return null;
    const cell = (R[kind][g || 'all'] || {})[sz || 'a'];
    if (!cell) return { n: 0, rows: [] };
    const cols = kind === 'drop' ? R.dcols : R.hcols;
    const rows = cell[1].map(v => {
      const u = R.units[v[0]] || [], o = { code: u[0], dong: u[1], jibun: u[2], apt: u[3], band: u[4], area: u[5], q: u[6] || [] };
      cols.forEach((c, i) => { if (i) o[c] = v[i]; });
      o.key = [u[0], u[1], u[2], u[3]].join('|');
      return o;
    });
    return { n: cell[0], rows };
  }

  /* 기준 한 줄에 쓰는 기간: drop → '2024년 8월~2026년 7월 최고가 → 2026년 8~10월 거래' 재료 */
  function rule(H) {
    const R = H && H.race; if (!R) return null;
    const ym = s => ({ y: +String(s).slice(0, 4), m: +String(s).slice(4, 6) });
    const p0 = ym(R.prior[0]), p1 = ym(R.prior[1]), r0 = ym(R.recent[0]), r1 = ym(R.recent[1]);
    const rec = r0.y === r1.y ? `${r0.y}년 ${r0.m}~${r1.m}월` : `${r0.y}년 ${r0.m}월~${r1.y}년 ${r1.m}월`;
    return { prior: `${p0.y}년 ${p0.m}월~${p1.y}년 ${p1.m}월`, recent: rec, hiFrom: md(R.hiFrom), hiTo: md(R.hiTo),
      minRecent: R.rule.minRecent, minPrior: R.rule.minPrior, minAmt: R.rule.minAmt, minArea: R.rule.minArea };
  }

  /* 시세 추정 정확도: 스냅숏(그때 실제로 공개한 시세) 성적이 있으면 그것, 없으면 과거 재계산(acc) — 둘 다 없으면 null(카드 숨김)
     TR = track.json, sido = 시·도 이름. 시·도 성적이 없으면 전국.
     → { kind:'snap'|'re', m(실제 거래 달 YYYYMM), med(중앙 오차율 %), w5, w10(이내 비율 %), n(거래 수), where } */
  function acc(TR, sido) {
    if (!TR) return null;
    const S = TR.acc_snap || {}, ks = Object.keys(S).sort();
    for (let i = ks.length - 1; i >= 0; i--) {
      const a = S[ks[i]], by = (a && a.by) || {}, w = by[sido] ? sido : by['전국'] ? '전국' : null;
      if (w) { const v = by[w]; return { kind: 'snap', m: a.m, med: v[0], w5: v[1], w10: v[2], n: v[3], where: w, snap: ks[i] }; }
    }
    const A = TR.acc || {}, w = (A[sido] || []).length ? sido : (A['전국'] || []).length ? '전국' : null;
    if (!w) return null;
    const v = A[w][A[w].length - 1];
    return { kind: 're', m: v[0], med: v[1], w5: v[2], w10: v[3], n: v[4], where: w };
  }

  /* 처음 보여 줄 지역: 첫 화면에서 마지막으로 고른 지역 → 다른 화면에서 고른 지역(jdj_region) → 서울 전체 */
  function regionPick(IX, saved, other) {
    const sido = (IX && IX.sido) || [], has = id => sido.some(s => s.id === id);
    if (saved && has(saved.sd)) return { sd: saved.sd, g: saved.g && IX.sgg[saved.g] && sidoName(IX, saved.sd) === IX.sgg[saved.g].sido ? saved.g : 'all' };
    if (other && other.sido) {
      const s = sido.find(x => x.name === other.sido);
      if (s) return { sd: s.id, g: other.sgg && IX.sgg[other.sgg] && IX.sgg[other.sgg].sido === s.name ? other.sgg : 'all' };
    }
    return { sd: has('s00') ? 's00' : (sido[0] && sido[0].id) || 's00', g: 'all' };
  }
  const sidoName = (IX, id) => ((IX.sido || []).find(s => s.id === id) || {}).name;

  /* 만원 → '13.6억' / '9,850만' (카드 안 짧은 금액) */
  function eok(man) {
    man = Math.round(+man || 0); if (!(man > 0)) return '';
    if (man < 10000) return man.toLocaleString('ko-KR') + '만';
    const v = Math.round(man / 1000) / 10;
    return (v % 1 ? v.toFixed(1) : String(v)) + '억';
  }
  /* 20261031 → '10월 31일' */
  const md = d => { const s = String(d || ''); return s.length >= 8 ? `${+s.slice(4, 6)}월 ${+s.slice(6, 8)}일` : ''; };
  /* 분기 중간값(백만 원, null 허용) → 작은 추세선 path. 마지막 점(최근 3개월) 좌표도 돌려줌 */
  function qSpark(q, w, h) {
    const v = (q || []).map((x, i) => [i, x]).filter(p => p[1] > 0);
    if (v.length < 2) return null;
    const lo = Math.min(...v.map(p => p[1])), hi = Math.max(...v.map(p => p[1])), n = Math.max(1, q.length - 1);
    const X = i => +(i / n * (w - 4) + 2).toFixed(1), Y = x => +(hi === lo ? h / 2 : h - 2 - (x - lo) / (hi - lo) * (h - 4)).toFixed(1);
    const d = v.map((p, k) => (k ? 'L' : 'M') + X(p[0]) + ',' + Y(p[1])).join('');
    const l = v[v.length - 1];
    return { d, x: X(l[0]), y: Y(l[1]), lastIsRecent: l[0] === q.length - 1 };
  }

  /* 첫 화면 소개 글 숫자: 공개 index.json 값만 읽음(직접 쓴 숫자 없음). 없는 값은 null·빈 목록 → 화면은 숫자 없는 문장으로
     → { trades: '838만'|null, eyebrow: '2010년부터 쌓은 공공 통계로 만든 부동산 미래 예보'|null, facts: ['아파트 1.6만 단지', '하루 4번 갱신'] } — 시작 연도는 eyebrow 에만(겹치지 않게) */
  function heroFacts(IX) {
    const S = (IX && IX.stats) || {}, facts = [];
    const man = n => n >= 1e4 ? `${(n / 1e4).toFixed(n >= 1e6 ? 0 : 1).replace(/\.0$/, '')}만` : n.toLocaleString('ko-KR');
    let trades = null, eyebrow = null;
    if (S.trades > 0) trades = man(S.trades);
    else if (IX && IX.total > 0) trades = man(IX.total);
    if (S.apts > 0) facts.push(`아파트 ${man(S.apts)} 단지`);
    else { const nu = ((IX && IX.sido) || []).reduce((a, x) => a + (x.units || 0), 0); if (nu) facts.push(`단지·평형 ${man(nu)} 개`); }
    if (/^\d{6}$/.test(S.from || '')) {
      const y0 = +S.from.slice(0, 4);   // 연수(○년간)는 반올림 혼란이 있어 쓰지 않고 시작 연도만
      eyebrow = `${y0}년부터 쌓은 공공 통계로 만든 부동산 미래 예보`;
    }
    facts.push('하루 4번 갱신');
    return { trades, eyebrow, facts };
  }

  const API = { SIZES, SIZE_TXT, race, rule, acc, regionPick, eok, md, qSpark, heroFacts };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.JDJ_HOME = API;
})(typeof window !== 'undefined' ? window : globalThis);
