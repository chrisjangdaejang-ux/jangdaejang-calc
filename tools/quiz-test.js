/* '집값 맞혀 보기' 자동 확인 — 실행: node tools/quiz-test.js </dev/null
   assets/quiz-core.js: 보기 만들기(진짜 금액은 꼭 한 번, 다른 보기는 진짜와 다르고 그럴듯한 범위 안·서로 겹치지 않음·같은 문제는 같은 보기),
   설명(가운데 값·차이 % 를 손으로 계산한 값과 맞춤), 연속 참여 기록. 화면(quiz/)에 금지어·지어낸 숫자 없는지. 금액 단위: 만원. */
const fs = require('fs'), path = require('path');
const Z = require('../assets/quiz-core.js');
const rows = [];
function check(name, got, want, basis) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want, basis }); }

/* ---------- 보기: 여러 금액 × 여러 문제 id ---------- */
const prices = [10000, 12500, 18900, 23000, 31000, 47500, 52000, 64900, 79000, 80000, 99000, 100000, 103500, 129000, 150000, 152500, 199000, 245000, 330000, 700000, 920000];
let bad = [], posCount = [0, 0, 0, 0];
for (const P of prices) for (let k = 0; k < 60; k++) {
  const Q = { id: 'q' + k + 'x' + P, q: { p: P } };
  const o = Z.options(Q), vs = o.map(x => x.v), decoys = o.filter(x => !x.ok).map(x => x.v);
  const why = [];
  if (o.length !== 4) why.push('보기 수 ' + o.length);
  if (o.filter(x => x.ok).length !== 1 || !o.some(x => x.ok && x.v === P)) why.push('진짜 금액이 정확히 한 번이 아님');
  if (decoys.some(v => v === P)) why.push('다른 보기가 진짜와 같음');
  if (decoys.some(v => Math.abs(v / P - 1) < 0.05)) why.push('진짜와 5% 미만 차이');
  if (decoys.some(v => v < P * 0.7 || v > P * 1.35)) why.push('그럴듯한 범위(0.7~1.35배) 밖');
  if (new Set(vs).size !== 4) why.push('같은 보기 두 번');
  for (let i = 1; i < vs.length; i++) if (vs[i] / vs[i - 1] - 1 < 0.04) why.push('서로 4% 미만 차이');
  if (vs.some((v, i) => i && v < vs[i - 1])) why.push('작은 금액부터가 아님');
  if (decoys.some(v => v % 100)) why.push('1백만 원 단위가 아님');
  if (why.length) bad.push(`${P}/${Q.id}: ${why.join(', ')} ${JSON.stringify(vs)}`);
  posCount[o.findIndex(x => x.ok)]++;
}
check('보기 1,260세트: 진짜 1번·다른 보기 ≠ 진짜·5% 이상 차이·0.7~1.35배·서로 4% 이상·작은 금액부터', bad.slice(0, 3), [], '');
check('정답 위치가 네 칸 모두에 나옴(늘 가운데가 아님)', posCount.every(n => n > 100), true, JSON.stringify(posCount));
check('같은 문제 = 같은 보기(누구에게나)', JSON.stringify(Z.options({ id: 'abc', q: { p: 79000 } })) === JSON.stringify(Z.options({ id: 'abc', q: { p: 79000 } })), true, '');
check('딱 떨어지는 진짜 금액이면 보기도 같은 단위', Z.options({ id: 'r1', q: { p: 150000 } }).every(x => x.v % 10000 === 0), true, '15억 → 1억 단위');
check('단위: 15억 → 1억, 7억 9천 → 1천만, 15억 2,500 → 5백만, 1억 2,500 → 5백만', [Z.unit(150000), Z.unit(79000), Z.unit(152500), Z.unit(12500)], [10000, 1000, 500, 500], '');
check('금액 없으면 보기 없음', Z.options({ id: 'x', q: { p: 0 } }), [], '');

/* ---------- 설명 ---------- */
const Q = { id: 't', q: { p: 79000, f: 9, dt: 20261002, hi: 0 },
  near: [[20260904, 59.61, 9, 79000], [20260903, 59.61, 11, 78800], [20260615, 59.61, 10, 70000], [20260528, 59.61, 15, 77000], [20260509, 59.61, 11, 73000],
    [20260429, 59.61, 13, 76500], [20260416, 59.61, 2, 71000], [20260322, 59.61, 3, 66000], [20260314, 59.61, 15, 73500], [20260303, 59.61, 9, 73000], [20251230, 59.61, 3, 68000], [20251018, 59.61, 8, 70000]] };
const E = Z.explain(Q);
check('가운데 값 = 12건 중간(정렬 후 6·7번째 73,000·73,000)', [E.n, E.med], [12, 73000], '66,000…79,000');
check('차이 % = 79,000 ÷ 73,000 − 1 = 8.2%', E.diff, 8.2, '');
check('판정: 3% 넘게 높으면 high', E.verdict, 'high', '');
check('첫 줄 문장', E.lines[0], '같은 단지·같은 평형의 앞뒤 1년 거래 12건 가운데 값은 7억 3,000만 원이에요. 이번 거래는 그보다 8.2% 높아요.', '');
check('최근 흐름: 계약 전 3개월(2건: 79,000·78,800) vs 그 전(10건) 가운데 값', E.lines.some(l => l.includes('전 3개월 거래(2건)') && l.includes('그 전(10건)')), true, '');
const E2 = Z.explain({ q: { p: 70000, f: 2, dt: 20261002 }, near: [[20260901, 84, 10, 71000], [20260801, 84, 12, 70500], [20260701, 84, 8, 69000]] });
check('비슷하면 mid, 저층이면 저층 설명', [E2.verdict, E2.lines.some(l => l.includes('2층 저층'))], ['mid', true], '');
check('주변 거래 없으면 비교 못 함 문장', Z.explain({ q: { p: 1 }, near: [] }).lines.length, 1, '');
check('금액 글', [Z.won(79000), Z.won(150000), Z.won(9850)], ['7억 9,000만 원', '15억 원', '9,850만 원'], '');

/* ---------- 연속 참여 ---------- */
const QQ = d => ({ id: 'id' + d, q: { p: 79000 } });
let S = Z.load(null);
S = Z.record(S, QQ(1), 79000, '2026-11-19');
S = Z.record(S, QQ(2), 70000, '2026-11-20');
check('이틀 연속: 연속 2·푼 2·맞힘 1', [S.streak, S.n, S.ok, S.best], [2, 2, 1, 2], '');
const S2 = Z.record(S, QQ(2), 79000, '2026-11-20');
check('같은 날 다시 답해도 그대로(하루 한 번)', [S2.n, S2.ok, S2.h['2026-11-20'].pick], [2, 1, 70000], '');
S = Z.record(S, QQ(3), 79000, '2026-11-22');
check('하루 거르면 1부터, 최고 기록은 남음', [S.streak, S.best], [1, 2], '');
check('화면 연속 일수: 어제·오늘 기록 없으면 0', [Z.streakNow(S, '2026-11-23'), Z.streakNow(S, '2026-11-25')], [1, 0], '');
check('오늘 풀었는지(같은 문제 id)', [Z.answered(S, QQ(3), '2026-11-22'), Z.answered(S, { id: 'other' }, '2026-11-22')], [true, false], '');
check('망가진 기록도 안전하게 읽음', Z.load('{"streak":"x","h":5}'), { v: 1, last: '', streak: 0, best: 0, n: 0, ok: 0, h: {} }, '');
let S3 = Z.load(null); for (let i = 1; i <= 20; i++) S3 = Z.record(S3, QQ(i), 1, `2026-11-${String(i).padStart(2, '0')}`);
check('기록은 최근 14일만', [Object.keys(S3.h).length, S3.streak], [14, 20], '');

/* ---------- 화면 ---------- */
const page = fs.readFileSync(path.join(__dirname, '..', 'quiz', 'index.html'), 'utf8');
const vis = page.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
check('화면 금지어(시험·검증·채점) 없음', ['시험', '검증', '채점'].filter(w => page.includes(w)), [], '');
check('화면에 직접 써 넣은 금액 없음', /\d+억|\d+만 원/.test(vis), false, '숫자는 자료에서만');
check('상품·포인트 없음', /포인트|경품|상금|적립/.test(page), false, '');
check('공유는 링크 먼저(JDJ_SHARE.sendLink)', /sendLink\(/.test(page), true, '');
check('공유 글에 정답 금액 없음', /text:[^\n]*won\(/.test(page), false, '');
check('서비스 이름은 SITE_NAME 에서', /SITE_NAME/.test(page), true, '');

const fail = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `\n      got ${JSON.stringify(r.got)}\n      want ${JSON.stringify(r.want)}  (${r.basis})`));
console.log(`\n${rows.length - fail.length}/${rows.length} 통과`);
process.exit(fail.length ? 1 : 0);
