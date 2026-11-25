/* 전세 '오를까·내릴까' 단순 방향 규칙 과거 시험(전세 갈아타기 화면의 '2년 뒤 전세가 전망' 공개 여부를 정함)
   규칙(가중치·학습 없음): 지금 전세 시세가 1년 전보다 높으면 '2년 뒤에도 오른다', 낮으면 '내린다'.
   비교 기준(실력 없는 기준): 그때 알 수 있던 시장 전체 방향(최근 2년 동안 오른 평형이 절반 이상이면 모두 '오른다')을 모든 평형에 똑같이 붙임.
   자료: 공개 데이터 rent/h/{구}.json (국토교통부 아파트 전월세 실거래, 월별 3개월 순수 전세 중간값 J) — 그 시점까지의 값만 씀.
   판정(엔진 전국 점수 공개 규칙 features.py fit_national 과 같은 틀):
     · 시험 시점 = 6개월마다, 결과(2년 뒤)가 확정된 시점만
     · 가장 최근 시험 시점 2개는 잠금 시험(판정에만 따로 쓰고 고르기에 안 씀)
     · 통과 = 잠금 전 시점들의 '규칙 적중률 − 기준 적중률' 평균 ÷ 표준오차 ≥ 2, 절반 이상 시점에서 +, 잠금 시험 평균도 +
       그리고 권역(수도권·광역시·도) 3곳 중 2곳 이상에서 평균 + (엔진 region.py GATE_GROUPS)
   실행: node tools/rent-dir-backtest.js <rent/h 파일 폴더> </dev/null  → data/rent-dir-bt.json */
'use strict';
const fs = require('fs'), path = require('path');
const DIR = process.argv[2];
const OUT = path.join(__dirname, '..', 'data', 'rent-dir-bt.json');
const H = 24, BACK = 12, STEP = 6, LOCK = 2, T_MIN = 2;
const CAP = ['11', '28', '41'], METRO = ['26', '27', '29', '30', '31', '36', '46'];
const gwon = g => CAP.includes(g.slice(0, 2)) ? 'cap' : METRO.includes(g.slice(0, 2)) ? 'metro' : 'do';
const ymAdd = (ym, k) => { let y = +String(ym).slice(0, 4), m = +String(ym).slice(4, 6) - 1 + k; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y * 100 + m + 1 + ''; };
const ymIdx = (base, ym) => (+ym.slice(0, 4) - +base.slice(0, 4)) * 12 + (+ym.slice(4, 6) - +base.slice(4, 6));
function arr(a, n) { const o = new Array(n).fill(0); if (!Array.isArray(a) || a.length < 2) return o; for (let k = 1; k < a.length; k++) { const i = a[0] + k - 1; if (i >= 0 && i < n) o[i] = +a[k] || 0; } return o; }
const mean = v => v.reduce((a, b) => a + b, 0) / v.length;
const sd = v => { const m = mean(v); return Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / (v.length - 1)); };

function load() {
  const S = [];   // {g, j[], base}
  let rm = null, to = null;
  for (const f of fs.readdirSync(DIR).filter(f => /^\d{5}\.json$/.test(f))) {
    const h = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); if (!h || !h.units) continue;
    rm = rm || h.rm; to = to || h.to;
    const n = ymIdx(h.rm, h.to) + 1, g = f.slice(0, 5);
    for (const u of h.units) S.push({ g, j: arr(u[4], n), off: ymIdx(rm, h.rm) });
  }
  return { S, rm, to };
}
function run() {
  const { S, rm, to } = load();
  const last = ymAdd(to, -H), tests = [];
  for (let t = ymAdd(rm, BACK + H); t <= last; t = ymAdd(t, STEP)) tests.push(t);
  const per = [];
  for (const t0 of tests) {
    const i = ymIdx(rm, t0);
    /* 시장 방향(그때 알 수 있던 것): 최근 2년 동안 오른 평형 비율 */
    let up2 = 0, n2 = 0;
    for (const s of S) { const a = s.j[i - s.off], b = s.j[i - H - s.off]; if (a > 0 && b > 0) { n2++; if (a > b) up2++; } }
    const mkt = n2 && up2 * 2 >= n2;
    const by = { all: [0, 0, 0], cap: [0, 0, 0], metro: [0, 0, 0], do: [0, 0, 0] };   // [n, 규칙 맞음, 기준 맞음]
    for (const s of S) {
      const now = s.j[i - s.off], past = s.j[i - BACK - s.off], fut = s.j[i + H - s.off];
      if (!(now > 0 && past > 0 && fut > 0) || fut === now || now === past) continue;
      const act = fut > now, pr = now > past;
      for (const k of ['all', gwon(s.g)]) { const b = by[k]; b[0]++; b[1] += pr === act; b[2] += mkt === act; }
    }
    if (by.all[0] < 500) continue;
    const x = k => by[k][0] ? Math.round((by[k][1] - by[k][2]) / by[k][0] * 10000) / 100 : null;
    per.push({ t0, n: by.all[0], acc: Math.round(by.all[1] / by.all[0] * 1000) / 10, base: Math.round(by.all[2] / by.all[0] * 1000) / 10, ex: x('all'), g: { cap: x('cap'), metro: x('metro'), do: x('do') } });
  }
  const dev = per.slice(0, -LOCK), lock = per.slice(-LOCK), v = dev.map(p => p.ex);
  const se = v.length > 1 ? sd(v) / Math.sqrt(v.length) : Infinity, m = v.length ? mean(v) : 0;
  const t = se > 0 ? m / se : 0;
  const gm = k => { const a = dev.map(p => p.g[k]).filter(x => x != null); return a.length ? Math.round(mean(a) * 100) / 100 : null; };
  const groups = { cap: gm('cap'), metro: gm('metro'), do: gm('do') };
  const gOk = Object.values(groups).filter(x => x > 0).length >= 2;
  const lockM = lock.length ? mean(lock.map(p => p.ex)) : 0;
  const ok = v.length >= 2 && t >= T_MIN && 2 * v.filter(x => x > 0).length >= v.length && lock.length === LOCK && lockM > 0 && gOk;
  const out = { v: 1, at: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), rule: 'momentum12_dir24', src: '국토교통부 아파트 전월세 실거래(공개 데이터 rent/h, 월별 3개월 순수 전세 중간값)',
    data: { from: rm, to }, h: H, back: BACK, step: STEP, tests: per.length, dev: { mean: Math.round(m * 100) / 100, se: Math.round(se * 100) / 100, t: Math.round(t * 100) / 100, pos: v.filter(x => x > 0).length, n: v.length },
    lock: lock.map(p => ({ t0: p.t0, ex: p.ex })), lockMean: Math.round(lockM * 100) / 100, groups, ok,
    why: ok ? '통과' : t < T_MIN ? '시점마다 흔들림이 커서 우연과 구별되지 않음' : lockM <= 0 ? '가장 최근 잠금 시험에서 기준보다 못함' : !gOk ? '권역 2곳 이상에서 나아지지 않음' : '절반 이상 시점에서 기준보다 못함',
    per };
  fs.writeFileSync(OUT, JSON.stringify(out) + '\n');
  console.log(`시험 시점 ${per.length}개 · 잠금 전 평균 ${out.dev.mean}%p (표준오차 ${out.dev.se}, t=${out.dev.t}, + ${out.dev.pos}/${out.dev.n}) · 잠금 ${out.lockMean}%p · 권역 ${JSON.stringify(groups)} → ${ok ? '통과' : '불합격: ' + out.why}`);
}
if (require.main === module) { if (!DIR) { console.error('rent/h 폴더 경로를 주세요'); process.exit(2); } run(); }
module.exports = { ymAdd, ymIdx };
