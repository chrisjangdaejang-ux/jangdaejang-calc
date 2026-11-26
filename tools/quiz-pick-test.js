/* '오늘의 집값 맞혀 보기' 쉬운 문제·맞춤 고르기 자동 확인 — 실행: node tools/quiz-pick-test.js </dev/null
   assets/quiz-pick.js: 고르는 순서(관심 단지 → 근처 → 내 집 → 내 지역 → 눈에 띄는 거래), 같은 날 같은 문제·푼 문제 빼기, 직전 거래와 같은 금액·칸 빠진 후보 버림,
   예전 quiz.json 으로도 문제 만들기, 금액 보기 3개(실제 1개 + 5~12% 떨어진 2개, 1,000만 원 단위 차이), 집예보 예측은 시세가 있을 때만,
   기록(연속 정답·최근 10문제 오차 평균·연속 참여), 이번 주 예측 내 답(이 기기)·결과, 보상은 꺼져 있음. 화면 문구 점검. 금액 단위: 만원. */
const fs = require('fs'), path = require('path');
const K = require('../assets/quiz-pick.js');
const rows = [];
function check(name, got, want) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want }); }
const T = '2026-11-26';
const r = (id, o) => Object.assign({ id, d: '잠실동', j: '1', a: '가아파트', b: '84㎡대', ar: 84.9, f: 5, dt: 20261020, p: 104000, pp: 103000, ppd: 20261001, n: 6, nr: [[20261001, 5, 103000]] }, o || {});
const GF = {
  '11710': { g: '11710', gn: '송파구', sd: '서울', sid: 's00', qz: [r('a1'), r('a2', { a: '나아파트', d: '가락동', b: '59㎡대' }), r('a3', { a: '다아파트', d: '잠실동', j: '9' }), r('bad', { p: 103000 })] },
  '11680': { g: '11680', gn: '강남구', sd: '서울', sid: 's00', qz: [r('b1', { d: '대치동', a: '은마', b: '84㎡대', e: 250000, em: '202609', p: 260000, pp: 255000 })] }
};
const Q = { id: 'legacy1', date: T, q: { g: '41115', sid: 's08', sd: '경기', gn: '수원시 팔달구', d: '인계동', j: '1173', a: '수원센트럴아이파크자이', b: '74㎡대', ar: 73.97, f: 4, dt: 20261022, p: 83500, hi: 0 },
  near: [[20261031, 73.94, 5, 91500], [20261018, 73.97, 18, 87000], [20261017, 73.97, 14, 90000], [20261017, 73.97, 21, 89000]],
  pool: [Object.assign(r('p1', { a: '헬리오시티', d: '가락동' }), { g: '11710', sid: 's00', sd: '서울', gn: '송파구' }), Object.assign(r('p2', { a: '해운대아이파크', d: '우동' }), { g: '26350', sid: 's02', sd: '부산', gn: '해운대구' })] };

/* ---------- 후보 정리 ---------- */
check('후보: 칸 붙이기(구 이름·시·도)', [K.fromG(GF['11710']).length, K.fromG(GF['11710'])[0].gn, K.fromG(GF['11710'])[0].sid], [3, '송파구', 's00']);
check('후보: 직전 거래와 같은 금액은 버림', K.fromG(GF['11710']).some(c => c.id === 'bad'), false);
check('후보: 금액·직전 거래가 없으면 버림', [K.norm(r('x', { pp: 0 }), { g: '11710' }), K.norm(r('x', { p: null }), { g: '11710' })], [null, null]);
const L = K.fromLegacy(Q);
check('예전 quiz.json: 직전 거래 = 문제 계약일 앞 가장 최근 near', [L.id, L.pp, L.ppd, L.p], ['legacy1', 87000, 20261018, 83500]);
check('예전 quiz.json: 직전 날 값이 여럿이면 못 씀', K.fromLegacy(Object.assign({}, Q, { q: Object.assign({}, Q.q, { dt: 20261018 }) })), null);
check('전국 후보가 없으면 예전 문제로', K.poolOf({ id: Q.id, q: Q.q, near: Q.near }).map(c => c.id), ['legacy1']);

/* ---------- 고르는 순서 ---------- */
const W1 = [{ code: '11710', dong: '잠실동', jibun: '1', apt: '가아파트', band: '84㎡대' }];
check('① 관심 단지 같은 단지·평형', [K.pick({ watch: W1, gf: GF, Q, today: T }).c.id, K.pick({ watch: W1, gf: GF, Q, today: T }).why], ['a1', 'watch']);
check('① 관심 단지 다른 평형이면 같은 단지 다른 평형', K.pick({ watch: [Object.assign({}, W1[0], { band: '114㎡대' })], gf: GF, Q, today: T }).c.id, 'a1');
const near = K.pick({ watch: [{ code: '11710', dong: '잠실동', jibun: '5', apt: '없는아파트', band: '84㎡대' }], gf: GF, Q, today: T });
check('① 관심 단지 거래가 없으면 같은 동 가까운 단지', [['a1', 'a3'].includes(near.c.id), near.why], [true, 'watch_near']);
check('① 푼 문제는 빼고 같은 동 다른 단지', K.pick({ watch: W1, gf: GF, Q, today: T, done: { a1: 1 } }).c.id, 'a3');
const H1 = [{ code: '11680', dong: '대치동', jibun: '', apt: '은마', band: '84㎡대' }];
check('② 관심 단지가 없으면 내 집', [K.pick({ watch: [], homes: H1, gf: GF, Q, today: T }).c.id, K.pick({ homes: H1, gf: GF, Q, today: T }).why], ['b1', 'home']);
check('③ 내 지역(구)', [K.pick({ region: { sd: 's00', g: '11680' }, gf: GF, Q, today: T }).c.id, K.pick({ region: { sd: 's00', g: '11680' }, gf: GF, Q, today: T }).why], ['b1', 'region']);
check('③ 내 지역(시·도만) → 그 시·도의 눈에 띄는 거래', K.pick({ region: { sd: 's02' }, gf: {}, Q, today: T }).c.id, 'p2');
check('④ 아무것도 없으면 그날 눈에 띄는 거래 1위', [K.pick({ gf: {}, Q, today: T }).c.id, K.pick({ gf: {}, Q, today: T }).why], ['p1', 'news']);
check('④ 1위를 풀었으면 다음', K.pick({ gf: {}, Q, today: T, done: { p1: 1 } }).c.id, 'p2');
check('자료가 하나도 없으면 null', K.pick({ gf: {}, Q: null, today: T }), null);
const many = { '11710': { g: '11710', qz: Array.from({ length: 12 }, (_, i) => r('m' + i)) } };
const d1 = K.pick({ watch: W1, gf: many, today: '2026-11-26' }).c.id, d1b = K.pick({ watch: W1, gf: many, today: '2026-11-26' }).c.id;
const days = new Set(['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26'].map(t => K.pick({ watch: W1, gf: many, today: t }).c.id));
check('같은 날 같은 문제 · 날마다 바뀜', [d1 === d1b, days.size > 2], [true, true]);
check('필요한 구 파일(관심·내 집·지역, 겹치지 않게)', K.needG({ watch: W1, homes: H1, region: { g: '11710' } }), ['11710', '11680']);
check('공유 주소로 같은 문제 찾기', [K.findShared('11680-b1', GF, Q).id, K.findShared('11710-p1', {}, Q).id, K.findShared('bad', GF, Q), K.shareRef(K.fromG(GF['11680'])[0])], ['b1', 'p1', null, '11680-b1']);
const lk = K.pick({ watch: W1, gf: GF, Q, today: T });
check('오늘 문제 고정(다음 날은 풀림)', [K.lockGet(K.lockSet(lk, T), T).c.id, K.lockGet(K.lockSet(lk, T), '2026-11-27'), K.lockGet('{bad', T)], ['a1', null, null]);

/* ---------- 보기 3개 ---------- */
let bad = [];
const prices = [10000, 12500, 18900, 23000, 47500, 83500, 100000, 103500, 152500, 245000, 330000, 575000, 920000];
for (const P of prices) for (let k = 0; k < 40; k++) {
  const c = K.norm(r('c' + k + 'x' + P, { p: P, pp: P - 500 }), { g: '11710' }), o = K.choices(c), d = o.filter(x => !x.ok).map(x => x.v), why = [];
  if (o.length !== 3 || o.filter(x => x.ok && x.v === P).length !== 1) why.push('보기 수·정답');
  if (d.some(v => Math.abs(v / P - 1) < 0.05 - 1e-9 || Math.abs(v / P - 1) > 0.12 + 1e-9)) why.push('5~12% 밖');
  if (P >= 8400 && d.some(v => (v - P) % 1000 !== 0)) why.push('1,000만 원 단위 차이가 아님');
  if (new Set(o.map(x => x.v)).size !== 3) why.push('겹침');
  if (JSON.stringify(o) !== JSON.stringify(K.choices(c))) why.push('같은 문제 다른 보기');
  if (why.length) bad.push(P + ':' + why.join(','));
}
check('보기: 실제 금액 1개 + 5~12% 떨어진 2개(1,000만 원 단위 차이, 겹치지 않음, 늘 같음)', bad.slice(0, 5), []);
const pos = [0, 0, 0]; for (let k = 0; k < 300; k++) { const o = K.choices(K.norm(r('z' + k, { p: 150000, pp: 149000 }), { g: '11710' })); pos[o.findIndex(x => x.ok)]++; }
check('보기: 정답 자리가 한곳에 몰리지 않음', pos.every(n => n > 20), true);

/* ---------- 정답·집예보 예측 ---------- */
const cB = K.fromG(GF['11680'])[0], oB = K.choices(cB);
check('정답 방향', [K.dir(cB), K.dir(K.norm(r('d', { p: 90000, pp: 95000 }), { g: '11710' }))], ['up', 'dn']);
check('집예보 예측: 시세 25억 < 직전 25.5억 → 내렸을 거라 봄 · 보기 중 가까운 값', [K.ai(cB, oB).dir, K.ai(cB, oB).v, K.ai(cB, oB).em, oB.some(o => o.v === K.ai(cB, oB).near)], ['dn', 250000, '202609', true]);
check('집예보 예측: 시세가 없으면 null(지어내지 않음)', K.ai(K.fromG(GF['11710'])[0], []), null);
check('정답 한 줄', K.diffLine(cB), '직전 거래보다 5,000만 원(2.0%) 올랐어요');

/* ---------- 기록 ---------- */
let S = K.load(null);
const cs = ['s1', 's2', 's3'].map((id, i) => K.norm(r(id, { p: 100000 + i * 1000, pp: 99000 }), { g: '11710' }));
S = K.answer(S, cs[0], 'up', '2026-11-24'); S = K.answer(S, cs[0], 'dn', '2026-11-24');
check('한 문제 한 번만', [S.n, S.ok, S.a.s1.ud], [1, 1, 'up']);
S = K.answerPrice(S, cs[0], 110000); S = K.answerPrice(S, cs[0], 100000);
check('금액 보기 오차 %(한 번만)', [S.a.s1.v, S.a.s1.er, S.a.s1.pk], [110000, 10, 0]);
S = K.answer(S, cs[1], 'up', '2026-11-25'); S = K.answerPrice(S, cs[1], 101000);
S = K.answer(S, cs[2], 'dn', '2026-11-25'); S = K.answerPrice(S, cs[2], 0, true);
const st = K.stats(S, '2026-11-25');
check('시세 감각: 오차 평균(금액 푼 문제만)·연속 정답 끊김·최고·연속 참여', [st.avg, st.m, st.cs, st.cb, st.ok, st.n, st.streak], [5, 2, 0, 2, 2, 3, 2]);
check('연속 참여는 하루가 비면 0으로 보임', K.stats(S, '2026-11-28').streak, 0);
let S2 = K.load(null); for (let i = 0; i < 15; i++) { const c = K.norm(r('e' + i, { p: 100000, pp: 99000 }), { g: '11710' }); S2 = K.answer(S2, c, 'up', T); S2 = K.answerPrice(S2, c, i < 5 ? 120000 : 100000); }
check('최근 10문제만 평균(예전 5문제 오차 20%는 빠짐)', [K.stats(S2, T).avg, K.stats(S2, T).m, K.stats(S2, T).cs], [0, 10, 15]);
check('예전 기록(v1)도 그대로 읽음', [K.load(JSON.stringify({ last: '2026-11-25', streak: 3, best: 4, n: 5, ok: 2, h: {} })).streak, K.load('{bad').n], [3, 0]);
check('보상은 꺼져 있으면 없음 · 켜면 7번마다', [K.reward(S2, false), K.reward(K.load({ cs: 7 }), true).due, K.reward(K.load({ cs: 3 }), true).have], [null, true, 3]);

/* ---------- 이번 주 예측: 이 기기 ---------- */
const WK = { open: [{ id: 'rs-1', t: '이번 주 서울 아파트값, 오를까요 내릴까요?', opts: [{ k: 'up', t: '오른다' }, { k: 'dn', t: '내린다' }] }],
  done: [{ id: 'rg-1', t: '서초구 vs 용산구', opts: [{ k: 'a' }, { k: 'b' }], st: 'done', ans: 'a', rat: '2026-11-26' }, { id: 'rs-0', t: 'x', opts: [{ k: 'up' }, { k: 'dn' }], st: 'void', rat: '2026-11-20' },
    { id: 'cy-1', t: 'y', opts: [{ k: 'b1' }, { k: 'b2' }, { k: 'b3' }], st: 'done', ans: 'b2', rat: '2026-11-25' }] };
let W = K.wLoad(null);
W = K.wSet(W, WK.open[0], 'up', '2026-11-24T10:00'); W = K.wSet(W, WK.open[0], 'zz', '2026-11-24T10:00');
check('내 답 남기기(없는 보기는 무시)', W.p['rs-1'].k, 'up');
W = K.wMerge(W, [{ id: 'rg-1', k: 'a' }, { id: 'rs-0', k: 'up' }, { id: 'cy-1', k: 'b3' }], WK);
const R = K.wResults(W, WK);
check('결과: 맞힘·틀림·무효, 아직 안 본 결과', R.map(x => [x.q.id, x.ok, x.fresh]), [['rg-1', true, true], ['cy-1', false, true], ['rs-0', null, true]]);
W = K.wSeen(W, ['rg-1']);
check('본 결과는 새 결과가 아님', K.wResults(W, WK).filter(x => x.fresh).map(x => x.q.id), ['cy-1', 'rs-0']);
check('공유 요약: 이번 주 2문제 중 1개', K.wSummary(W, WK, T), { n: 2, ok: 1, week: true });

/* ---------- 화면 문구 ---------- */
const page = fs.readFileSync(path.join(__dirname, '..', 'quiz', 'index.html'), 'utf8');
const home = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const brief = fs.readFileSync(path.join(__dirname, '..', 'brief', 'index.html'), 'utf8');
const core = fs.readFileSync(path.join(__dirname, '..', 'assets', 'quiz-pick.js'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const ver = (s) => (s.match(/quiz-pick\.js\?v=(\d+)/g) || []);
check('quiz-pick.js 를 퀴즈·첫 화면·브리핑·서비스 워커가 같은 버전으로', [ver(page).length > 0, new Set([].concat(ver(page), ver(home), ver(brief), ver(sw))).size], [true, 1]);
check('한 번 누르기 단추 [올랐어요] [내렸어요]', /올랐어요 ⬆/.test(page) && /내렸어요 ⬇/.test(page), true);
check('직전 거래 문장', /직전 거래/.test(page), true);
check('집예보 예측 줄은 시세가 있을 때만(K.ai 결과로)', /K\.ai\(/.test(page) && /AI \?/.test(page), true);
check('화면 금지어(시험·검증·채점·경쟁 서비스 이름) 없음', ['시험', '검증', '채점', '호갱', '직방', '아실', '네이버 부동산', 'KB부동산'].filter(w => page.includes(w) || core.includes(w)), []);
check('투자 권유 말 없음', /사세요|매수하세요|투자하세요|지금 사야/.test(page + core), false);
check('공유 글에 정답 금액 없음', /text:[^\n]*won\(/.test(page), false);
check('공유는 링크 먼저(JDJ_SHARE.sendLink)', /sendLink\(/.test(page), true);
check('기록은 이 기기에만(서버로 보내지 않음 안내)', /이 기기에만/.test(page), true);
check('보상 칸은 QUIZ_REWARD_ENABLED·PAID_OPEN 둘 다 켜야', /QUIZ_REWARD_ENABLED/.test(page) && /PAID_OPEN/.test(page), true);
check('첫 화면 카드: 쉬운 문제(직전 거래)', /JDJ_QPICK/.test(home) && /직전/.test(home), true);
check('모닝 브리핑: 내 예측 결과(이 기기)', /JDJ_QPICK/.test(brief) && /wResults/.test(brief), true);

const fail = rows.filter(x => !x.ok);
for (const x of rows) console.log((x.ok ? 'ok   ' : 'FAIL ') + x.name + (x.ok ? '' : `\n      got ${JSON.stringify(x.got)}\n      want ${JSON.stringify(x.want)}`));
console.log(`\n${rows.length - fail.length}/${rows.length} 통과`);
process.exit(fail.length ? 1 : 0);
