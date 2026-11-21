/* 강점 문구(assets/strength.js) 검증: node tools/strength-test.js — 숫자는 공개 자료 값만, 없으면 그 부분만 빠지는지 */
const S = require('../assets/strength.js');
let ok = 0, bad = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { bad++; console.log('FAIL', m, '\n  got:', a, '\n  exp:', b); } };
const has = (a, b, m) => eq(String(a).includes(b), true, m + ' — "' + b + '" in "' + a + '"');
const not = (a, b, m) => eq(String(a).includes(b), false, m + ' — no "' + b + '" in "' + a + '"');

const MH = { '2': { data_from: '2010-12', oos_all: [{ top20: 1 }, { top20: 1 }, { top20: .7 }, { top20: 1.1 }], oos_hit: 4, oos_avg: 1.09 } };
const IX = { stats: { trades: 8380311, from: '201012' } };
const MT = { v: 1, n_tested: 52, n_used: 22 };          /* 개수는 meta.json 한 곳에서만 */
const F = S.facts(MH, IX, MT);
eq([F.nt, F.nu, F.y0, F.trades, F.n, F.hit, F.ok], [52, 22, 2010, 8380311, 4, 4, true], '사실값');
const LINE = '공공 통계 52가지를 살펴보고, 과거 자료로 효과가 확인된 22가지만 지금 점수에 써요';
eq(S.count(F), LINE, '개수 문장(모든 화면 같은 꼴)');
eq(S.text('hero', F), `집코드는 ${LINE}. 과거 자료는 2010년부터의 실거래 838만 건이에요.`, '홈 한 줄');
eq(S.text('card', F), `집코드는 ${LINE}. 과거 자료는 2010년부터의 실거래예요.`, '단지 카드');
for (const k of ['hero', 'card', 'report']) has(S.text(k, F), LINE, `같은 개수 문장(${k})`);
has(S.text('about', F)[1], LINE, '같은 개수 문장(about)');
has(S.text('report', F), '그럴듯한 이유가 아니라 과거에 맞았는지 확인한 근거만 담았어요.', '리포트 대비 문장');
const A = S.text('about', F);
eq(A.length, 3, '소개 3문단');
has(A[0], '이유를 그럴듯하게 쓰는 것', '소개: 이유 vs 근거 대비');
has(A[1], '2년 전망은 과거에 그대로 써 봤더니 4번 중 4번 맞았어요.', '소개: 과거 성적');
eq(S.text('share', F), '공공 통계 52가지 중 과거 자료로 효과가 확인된 22가지만 쓴 점수', '공유 카드 한 줄');

/* 모델 파일에 예전 개수가 남아 있어도 읽지 않음(한 곳: meta.json) */
eq(S.facts({ '2': Object.assign({ n_tested: 44, n_used: 25 }, MH['2']) }, IX, MT).nu, 22, '예전 model_h 개수 무시');
eq(S.facts({ '2': Object.assign({ n_tested: 44, n_used: 25 }, MH['2']) }, IX, null).nt, 0, 'meta 없으면 개수 없음');

/* 재학습 뒤 시작월이 바뀌면 화면도 따라감(하드코딩 없음) */
eq(S.facts({ '2': Object.assign({}, MH['2'], { data_from: '2006-01' }) }, IX, MT).y0, 2006, 'data_from 우선');
eq(S.facts({ '2': { oos_all: [] } }, IX, MT).y0, 2010, 'data_from 없으면 index stats.from');

/* meta.json 이 아직 공개되지 않았을 때: 숫자 부분만 빠짐 */
const F0 = S.facts(MH, IX, null);
eq(S.text('hero', F0), '집코드는 공공 통계를 살펴보고, 과거 자료로 효과가 확인된 것만 지금 점수에 써요. 과거 자료는 2010년부터의 실거래 838만 건이에요.', '개수 없음: 자연스럽게 빠짐');
eq(S.text('share', F0), '', '개수 없으면 공유 줄 없음(원래 문장 사용)');
const F00 = S.facts(null, null, null);
eq(S.text('hero', F00), '집코드는 공공 통계를 살펴보고, 과거 자료로 효과가 확인된 것만 지금 점수에 써요.', '자료 전혀 없음');
eq(/\d번 중/.test(S.text('about', F00).join(' ')), false, '성적 없으면 성적 문장 없음');
/* 이상한 값 */
eq(S.facts({}, {}, { n_tested: 10, n_used: 30 }).nu, 0, '쓴 수가 살펴본 수보다 크면 버림');
eq(S.count(S.facts({}, {}, { n_tested: 10, n_used: 10 })), '공공 통계 10가지를 살펴보고, 과거 자료로 효과가 확인된 10가지를 모두 지금 점수에 써요', '모두 쓴 경우');
eq(/\d번 중/.test(S.text('about', S.facts({ '2': { oos_all: [{ top20: -1 }, { top20: -1 }], oos_hit: 0, oos_avg: -1 } }, {}, MT)).join(' ')), false, '안 맞은 성적은 강점으로 쓰지 않음');
eq(S.man(98000), '10만', '만 단위'); eq(S.man(12345678), '1,235만', '천만 단위');
/* 금지어: 화면 문구에 시험·통과·검증·채점 없음 */
for (const k of ['hero', 'card', 'report', 'about', 'share']) for (const w of ['시험', '통과', '검증', '채점']) not([].concat(S.text(k, F)).join(' '), w, `금지어 ${w}(${k})`);
console.log(`${ok} ok, ${bad} fail`);
process.exit(bad ? 1 : 0);
