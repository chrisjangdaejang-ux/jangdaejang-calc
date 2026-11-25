/* 예측 맞히기 자동 확인 — 실행: node tools/predict-test.js </dev/null
   ① assets/predict-core.js: 포인트(맞히면 10점, 3연속부터 +5)·무효는 연속 기록에 영향 없음·배지·고른 비율(합 100%)·주간 순위(같은 점수 같은 등수)·ISO 주·별명 거르기
   ② 서버(tools/agent-backend.gs v54): PRED-CORE 글자 그대로 · 로그인해야 답함 · 받는 중 문제·마감 전·있는 보기만 · 마감 전 다시 고르기(한 줄) ·
      공개 결과를 '예측채점'에 한 번만 옮겨 적음(감사 기록) · 순위에는 별명만(카카오 닉네임·회원번호 없음) · 같은 별명 막기 · 탈퇴하면 답·별명 지움
   ③ 화면 quiz/·첫 화면 카드·서비스 워커·'포인트는 재미용' 문구·e2e 대체 자료 모양 */
'use strict';
const fs = require('fs'), path = require('path');
const P = require('../assets/predict-core.js');
const ROOT = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } }

/* ---------- ① 계산 ---------- */
check('ISO 주: 2026-01-01 W01 · 2026-12-28 W53 · 2027-01-03 W53 · 2027-01-04 W01', [P.week('2026-01-01'), P.week('2026-12-28'), P.week('2027-01-03'), P.week('2027-01-04')].join() === '2026-W01,2026-W53,2026-W53,2027-W01');
check('다음 주: 2026-W53 → 2027-W01, 2026-W48 → W49', P.nextWeek('2026-W53') === '2027-W01' && P.nextWeek('2026-W48') === '2026-W49');
const Q = (id, kind, ans, rat, st) => ({ id, kind, ans, st: st || 'done', rat });
const qs = [Q('a', 'rs', 'up', '2026-11-27T09:10'), Q('b', 'rg', 'x', '2026-11-27T09:10'), Q('c', 'rs', 'dn', '2026-12-04T09:10'), Q('v', 'rs', null, '2026-12-05T09:10', 'void'),
  Q('d', 'cy', 'b2', '2026-12-06T09:10'), Q('e', 'pm', 'a', '2026-12-07T09:10'), Q('f', 'rs', 'up', '2026-12-11T09:10')];
const ans = [{ id: 'a', k: 'up', wk: '2026-W48' }, { id: 'b', k: 'x', wk: '2026-W48' }, { id: 'c', k: 'dn', wk: '2026-W49' }, { id: 'v', k: 'up', wk: '2026-W49' }, { id: 'd', k: 'b2', wk: '2026-W50' }, { id: 'e', k: 'b', wk: '2026-W51' }, { id: 'f', k: 'up', wk: '2026-W51' }];
const S = P.score(ans, qs);
check('포인트: 10·10·15(3연속)·무효 0·15(4연속)·틀림 0·10 = 60', S.pts === 60 && S.hist.map(h => h.pts).join() === '10,10,15,0,15,0,10', S.hist.map(h => h.pts));
check('맞힘 5/6(무효는 세지 않음)·지금 연속 1·최고 4', S.ok === 5 && S.n === 6 && S.streak === 1 && S.best === 4, S);
check('배지: 첫 예측·3연속·4주 연속 참여 (5연속·10번·청약 3번·단지 대결은 아직)', S.badges.join() === 'first,s3,wk4', S.badges);
check('답하지 않은 문제·아직 정답 없는 문제는 채점 안 함', P.score([{ id: 'zz', k: 'up' }], qs).n === 0 && P.score([{ id: 'a', k: 'up' }], [Q('a', 'rs', 'up', '', 'open')]).n === 0);
check('단지 대결 맞히면 배지', P.score([{ id: 'e', k: 'a' }], qs).badges.indexOf('pm1') >= 0);
const sh = P.share([{ k: 'a', t: 'A' }, { k: 'b', t: 'B' }, { k: 'c', t: 'C' }], { a: 1, b: 1, c: 1 });
check('고른 비율: 1·1·1 → 합 100(34·33·33)', sh.map(x => x.pct).join() === '34,33,33' && sh.reduce((a, x) => a + x.pct, 0) === 100, sh);
check('고른 비율: 아무도 없으면 0', P.share([{ k: 'a' }, { k: 'b' }], {}).every(x => x.pct === 0 && x.n === 0));
const users = [{ nick: '가', answers: [{ id: 'f', k: 'up' }, { id: 'e', k: 'a' }] }, { nick: '나', answers: [{ id: 'f', k: 'up' }, { id: 'e', k: 'a' }] }, { nick: '다', answers: [{ id: 'f', k: 'dn' }] }, { nick: '라', answers: [{ id: 'e', k: 'a' }] }];
const B = P.board(users, qs, P.week('2026-12-11'), 10);
check('주간 순위: 그 주에 정답이 나온 문제만(W50: e 12/7, f 12/11)·같은 점수 같은 등수·0점 뺌', B.map(r => r.nick + r.rank + ':' + r.pts).join() === '가1:20,나1:20,라3:10', B);
check('별명: 2~10자·한글영문숫자만·긴 숫자·운영자 이름 막음', P.nick(' 집 박사 ') === '집 박사' && P.nick('a') === '' && P.nick('01012345678') === '' && P.nick('관리자') === '' && P.nick('<b>x</b>') === '' && P.nick('집예보왕') === '');
check('기본 별명은 확인값 앞 4자리로', P.defaultNick('0a1b2c3d') === '예측러 0A1B');
check('결과 문장: 맞힘·틀림·무효', /맞혔어요/.test(P.resultLine({ st: 'done', ans: 'up', opts: [{ k: 'up', t: '오른다' }] }, 'up')) && /아쉬워요/.test(P.resultLine({ st: 'done', ans: 'up', opts: [{ k: 'up', t: '오른다' }] }, 'dn')) && /무효예요/.test(P.resultLine({ st: 'void', why: '보합' }, 'up')));
check('안내 문구', P.NOTE === '포인트는 재미용이며 현금이나 상품으로 바꿀 수 없어요.');

/* ---------- ② 서버 ---------- */
const gs = read('tools/agent-backend.gs');
const blk = (s, n) => { const a = s.indexOf(`/* ${n}-CORE BEGIN`), b = s.indexOf(`/* ${n}-CORE END */`); return a >= 0 && b > a ? s.slice(a, b) : null; };
check('서버 PRED-CORE = 화면 predict-core.js(글자 그대로)', blk(gs, 'PRED') && blk(gs, 'PRED') === blk(read('assets/predict-core.js'), 'PRED'));
check('서버: 돈·상품으로 바꾸는 기능 없음(결제·지급 낱말이 예측 칸에 없음)', !/(지급|환전|상품권|쿠폰|결제)/.test(gs.slice(gs.indexOf('const QZ_ACTIONS'), gs.indexOf('function qzUserGone'))));
const OPEN = { id: 'rs-20261130', kind: 'rs', t: '이번 주 서울 아파트값, 오를까요 내릴까요?', s: '설명', opts: [{ k: 'up', t: '오른다' }, { k: 'dn', t: '내린다' }], close: '2026-12-02T23:59+09:00' };
const WEEK = { v: 1, at: '2026-11-27T09:10+09:00', open: [OPEN], wait: [], done: [] };
const E = require('./gs-harness')({ now: '2026-11-28T10:00:00+09:00', data: { 'quiz/week.json': () => WEEK } });
const s1 = E.member(1, {}), s2 = E.member(2, {}), s3 = E.member(3, {});
let r = E.post({ action: 'quizAnswer', id: OPEN.id, k: 'up' });
check('로그인 없이 답하면 거절', !r.ok, r);
r = E.post({ action: 'quizAnswer', s: s1, id: OPEN.id, k: 'zz' });
check('없는 보기는 거절', !r.ok && /보기/.test(r.err), r);
r = E.post({ action: 'quizAnswer', s: s1, id: 'nope', k: 'up' });
check('받는 중이 아닌 문제는 거절', !r.ok && /받는 문제가 아니/.test(r.err), r);
r = E.post({ action: 'quizAnswer', s: s1, id: OPEN.id, k: 'up' });
check('답 저장 + 그 문제 고른 수', r.ok && r.answers.length === 1 && r.counts.up === 1, r);
r = E.post({ action: 'quizAnswer', s: s1, id: OPEN.id, k: 'dn' });
check('마감 전 다시 고르기: 같은 줄을 고침', r.ok && r.counts.dn === 1 && !r.counts.up && E.sheets['예측답'].rows.length === 2, E.sheets['예측답'].rows.length);
E.post({ action: 'quizAnswer', s: s2, id: OPEN.id, k: 'dn' }); E.post({ action: 'quizAnswer', s: s3, id: OPEN.id, k: 'up' });
check('답 시트에 카카오 회원번호·닉네임 없음', !JSON.stringify(E.sheets['예측답'].rows).match(/k1|k2|회원1/), E.sheets['예측답'].rows[1]);
r = E.post({ action: 'quizNick', s: s1, nick: '집 박사' });
check('별명 저장', r.ok && r.nick === '집 박사');
r = E.post({ action: 'quizNick', s: s2, nick: '집 박사' });
check('같은 별명은 막음', !r.ok && /이미/.test(r.err));
r = E.post({ action: 'quizNick', s: s2, nick: '01099998888' });
check('연락처 같은 별명은 막음', !r.ok);
E.now = Date.parse('2026-12-03T00:00:00+09:00');
r = E.post({ action: 'quizAnswer', s: s2, id: OPEN.id, k: 'up' });
check('마감 지난 뒤에는 바꿀 수 없음', !r.ok && /마감/.test(r.err), r);
/* 정답 공개 → 채점 */
E.now = Date.parse('2026-12-04T10:00:00+09:00');
WEEK.open = []; WEEK.done = [Object.assign({}, OPEN, { st: 'done', ans: 'dn', why: '서울 −0.05% (103.400 → 103.350)', rat: '2026-12-04T09:10+09:00' })];
r = E.post({ action: 'quizBoard' });
check('공개 순위: 정답 나온 주·맞힌 두 분(별명만)·고른 수', r.ok && r.board.rows.map(x => x.nick).sort().join() === ['집 박사', E.T.qzUid('k2').slice(1, 5)].map((x, i) => i ? '예측러 ' + x.toUpperCase() : x).sort().join() && r.counts[OPEN.id].dn === 2 && r.counts[OPEN.id].up === 1, r);
check('공개 순위에 회원번호·닉네임 없음', !/k1|k2|회원1|회원2/.test(JSON.stringify(r)));
check('채점 기록(감사): 한 줄 · 정답·근거·참여 3·맞힘 2', E.sheets['예측채점'].rows.length === 2 && E.sheets['예측채점'].rows[1][1] === OPEN.id && E.sheets['예측채점'].rows[1][4] === 'dn' && E.sheets['예측채점'].rows[1][6] === 3 && E.sheets['예측채점'].rows[1][7] === 2 && /103\.350/.test(E.sheets['예측채점'].rows[1][5]), E.sheets['예측채점'].rows[1]);
E.post({ action: 'quizBoard' }); E.post({ action: 'quizMine', s: s3 });
check('여러 번 불러도 채점 기록은 한 번만', E.sheets['예측채점'].rows.length === 2);
r = E.post({ action: 'quizMine', s: s1 });
check('내 기록: 별명·포인트 10·맞힘 1/1·배지', r.ok && r.nick === '집 박사' && r.score.pts === 10 && r.score.ok === 1 && r.score.n === 1 && r.score.badges.indexOf('first') >= 0 && r.note === P.NOTE, r);
r = E.post({ action: 'quizMine', s: s3 });
check('틀린 분: 0점', r.ok && r.score.pts === 0 && r.score.n === 1);
/* 공개 파일에서 결과가 빠져도(8주 지남) 채점 기록으로 점수 유지 */
WEEK.done = [];
r = E.post({ action: 'quizMine', s: s1 });
check('공개 결과가 사라져도 채점 기록으로 점수 유지', r.ok && r.score.pts === 10, r.score);
/* 탈퇴 */
E.post({ action: 'userDelete', s: s1 });
check('탈퇴: 답·별명 지움', !E.sheets['예측답'].rows.some(x => x[2] === E.T.qzUid('k1')) && !E.sheets['예측별명'].rows.some(x => x[0] === E.T.qzUid('k1')));

/* ---------- ③ 화면 ---------- */
const page = read('quiz/index.html'), home = read('index.html'), sw = read('sw.js');
check('예측 화면: 계산 파일·로그인·안내 문구(포인트는 재미용)', /predict-core\.js\?v=1/.test(page) && /auth\.js/.test(page) && page.includes('포인트는 재미용이며 현금이나 상품으로 바꿀 수 없어요'));
check('예측 화면: 기존 하루 한 문제도 그대로(quiz-core)', /quiz-core\.js\?v=1/.test(page) && /id="app"/.test(page) && /today\/quiz\.json/.test(page));
check('예측 화면: 공개 문제 파일·서버 창구', /quiz\/week\.json/.test(page) && /'quizBoard'/.test(page) && /'quizAnswer'/.test(page) && /'quizMine'/.test(page) && /'quizNick'/.test(page));
check('예측 화면: 집예보 예측은 자료에 있을 때만', /q\.ai \?/.test(page));
check('예측 화면: 경쟁 앱 이름·회사 이름 없음', !/호갱|직방|아실|리치고|네이버\s?부동산|장대장부동산그룹/.test(page));
check('첫 화면: 작은 카드 "이번 주 예측 맞히기"(받는 문제가 있을 때만)', /id="pqCard" href="quiz\/#predict"/.test(home) && /이번 주 예측 맞히기/.test(home) && /quiz\/week\.json/.test(home));
check('서비스 워커: 계산 파일', /predict-core\.js\?v=1/.test(sw) && /'\.\/quiz\/'/.test(sw));
const fb = JSON.parse(read('tools/e2e/fallback/data/quiz/week.json'));
check('e2e 대체 자료: 엔진 결과 모양(open·wait·done·note)', Array.isArray(fb.open) && Array.isArray(fb.done) && fb.note === P.NOTE && fb.open.every(q => q.id && q.opts && q.close && q.t));

console.log(`\n예측 맞히기 확인: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
