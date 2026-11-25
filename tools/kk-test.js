/* 깡통전세 확률(assets/kk-core.js + data/kkang.json) 자동 검증 — 실행: node tools/kk-test.js
   ① 누적 분포 cdf 가 엔진 scripts/kkang.py cdf 와 같은 값(같은 공개 파일·같은 입력, 엔진에서 계산해 적은 값)
   ② 확률·과거 비슷한 계약·근거 강도 규칙 ③ 공개 파일 모양(가중치 없음, 판정 규칙과 상태가 맞음) */
const fs = require('fs'), path = require('path');
const K = require('../assets/kk-core.js');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'kkang.json'), 'utf8'));
const rows = [];
const near = (a, b, t) => typeof a === 'number' && Math.abs(a - b) <= (t == null ? 1e-9 : t);
function check(name, got, want, tol) { rows.push({ ok: typeof want === 'number' ? near(got, want, tol) : JSON.stringify(got) === JSON.stringify(want), name, got, want }); }

/* ① 엔진과 같은 값 — python: kkang.cdf(np.array(reg['28237'][2:])/1000, x) (2026-11-25 공개 파일) */
const q = D.reg['28237'].slice(2).map(v => v / 1000);
[[-0.3, 0.080625], [-0.2367, 0.13023076923076923], [-0.05, 0.336], [0.0, 0.44], [0.4, 0.9194444444444444]]
  .forEach(([x, p]) => check(`cdf(부평구, ${x}) = 엔진 ${p}`, K.cdf(q, D.grid, x), p, 1e-9));
const lin = []; for (let i = -50; i <= 50; i++) lin.push(i / 100);
check('cdf 가운데 50%', K.cdf(lin, D.grid, 0), 0.5);
check('cdf 첫 칸 아래 0.25%', K.cdf(lin, D.grid, -1), 0.0025);
check('cdf 끝 칸 위 99.75%', K.cdf(lin, D.grid, 1), 0.9975);
check('같은 값이 이어지면 그 값의 마지막 분위(엔진과 같음)', K.cdf([-0.3].concat(Array(49).fill(-0.2), Array(51).fill(0.1)), D.grid, -0.2), 0.49);

/* ② 계산 규칙 */
const e = K.estimate({ kk: D, code: '28237', dep: 26000, senior: 0, price: 34200 });
check('확률 = cdf(log(보증금 ÷ 시세))', e.p, K.cdf(q, D.grid, Math.log(26000 / 34200)), 1e-12);
check('선순위채권을 더하면 확률이 커짐', K.estimate({ kk: D, code: '28237', dep: 26000, senior: 3000, price: 34200 }).p > e.p, true);
check('과거 비슷한 계약: 전세가율 76% → 70~80% 구간', [e.sim.b, e.sim.label], [70, '70~80%']);
const row = D.sim['28237'].find(r => r[0] === 70);
check('과거 비슷한 계약 수 = 공개 파일 값 그대로', [e.sim.n, e.sim.k], [row[1], row[2]]);
check('근거 강도: 300건 이상 높음 / 50건 이상 보통 / 그 밖 낮음', [K.strength(300, 0).t, K.strength(299, 0).t, K.strength(49, 0).t], ['높음', '보통', '낮음']);
check('시·도 분포로 대신하면 한 단계 낮춤', K.strength(300, 1).t, '보통');
check('구간 이름', [K.jrLabel(D.jrb, 0), K.jrLabel(D.jrb, 80), K.jrLabel(D.jrb, 100)], ['60% 미만', '80~90%', '100% 이상']);
check('보증금 없으면 계산 안 함', K.estimate({ kk: D, code: '28237', dep: 0, price: 34200 }).miss, 'dep');
check('시세 없으면 계산 안 함(지어내지 않음)', K.estimate({ kk: D, code: '28237', dep: 26000, price: 0 }).miss, 'price');
check('확률 글자', [K.pText(0.004), K.pText(0.164), K.pText(0.995)], ['1% 미만', '16%', '99% 넘음']);

/* ③ 공개 파일 */
check('분위수 칸 수 = grid', Object.values(D.reg).every(r => r.length === D.grid.length + 2), true);
check('분위수는 오름차순', Object.values(D.reg).every(r => r.slice(2).every((v, i, a) => !i || a[i - 1] <= v)), true);
check('가중치·계수 키 없음', /"(w|weight|weights|coef|importance|beta|threshold)"/.test(JSON.stringify(D)), false);
const by = D.bt.byYear, rule = D.rule;
const pass = cal => cal.every(([a, b, n, p, r]) => n < rule.minN || p == null || Math.abs(r - p) <= Math.max(rule.gap, rule.rel / 100 * p));
const allOk = Object.values(by).every(y => y.ece <= rule.ece && pass(y.cal)) && D.bt.ece <= rule.ece && pass(D.bt.cal);
check('상태 = 공개 규칙 판정(보정 합격만 ok, 아니면 참고)', D.status, allOk ? 'ok' : 'ref');
check('백테스트 계약 기간 2019~2022', [D.bt.from, D.bt.to], ['201901', '202212']);
check('연도별 성적 4개', Object.keys(by).sort(), ['2019', '2020', '2021', '2022']);
check('50% 이상 구간 연도별 실제 비율(화면 문구) = 공개 파일 값', K.yearTop(D).map(x => Math.round(x.act * 100)), Object.keys(by).sort().map(y => Math.round(by[y].cal.find(c => c[0] === 50)[4] / 10)));

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `  got=${JSON.stringify(r.got)} want=${JSON.stringify(r.want)}`)));
console.log(`${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
