/* 예측 맞히기 등급·시즌·보상·명예의 전당(v55) 자동 확인 — 실행: node tools/quiz-tier-test.js </dev/null
   ① PRED-CORE: 시즌(분기)·등급 기준(임장러 10 · 분석가 30·55% · 고수 50·60%·상위 10% · 달인 50·상위 1% 또는 10위)·설정 덮어쓰기·보상 목록(현금 없음)
   ② 서버: 시즌 끝 자동 마감 한 번('예측시즌'·'예측보상'), 유료가 닫혀 있으면 [보상 받기]는 보관(대기), 유료가 열리면 브리핑 연장·리포트 이용권 → 주문 열기(결제 없음),
      이용권은 단지 리포트·청약 리포트 1건씩, 남은 수 줄어듦, 이용권 쓰기도 유료 잠금과 같이 막힘
   ③ 등급 배지 숨기기 · 명예의 전당은 켠 분만·별명만 · 임장 모임 명단은 초대 받기를 켠 달인·고수만(운영자 시트)
   ④ 화면: quiz/ 등급 칸·명예의 전당 링크, quiz/hall/, 결제 화면 [이용권으로 열기], 내 계정 등급 줄, 이용약관(초안·변호사 검토 필요) */
'use strict';
const fs = require('fs'), path = require('path');
const P = require('../assets/predict-core.js');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } }

/* ---------- ① 계산 ---------- */
check('시즌: 분기', [P.season('2026-12-04'), P.season('2027-01-01'), P.season('2027-06-30'), P.prevSeason('2027-Q1')].join() === '2026-Q4,2027-Q1,2027-Q2,2026-Q4');
check('시즌 이름', P.seasonLabel('2027-Q1') === '2027년 1분기(1~3월) 시즌');
const T = (n, acc, rank, N) => P.tierOf({ n, acc, rank }, N).id;
check('새싹: 9번', T(9, 90, 1, 1000) === 'sprout');
check('임장러: 10번', T(10, 10, 999, 1000) === 'field');
check('분석가: 30번·55% / 54.9%면 임장러', T(30, 55, 500, 1000) === 'analyst' && T(30, 54.9, 500, 1000) === 'field');
check('고수: 50번·60%·상위 10%(1000명 중 100위) / 101위면 분석가', T(50, 60, 100, 1000) === 'pro' && T(50, 60, 101, 1000) === 'analyst');
check('부동산 달인: 50번·상위 1%(1000명 중 10위) 또는 10위 안 / 49번이면 아님', T(50, 50, 10, 1000) === 'master' && T(50, 50, 11, 1000) === 'pro' === false && T(49, 99, 1, 1000) === 'analyst');
check('부동산 달인: 3,000명이면 상위 1% = 30위까지', T(50, 50, 30, 3000) === 'master' && T(50, 50, 31, 3000) !== 'master');
check('설정으로 기준 바꾸기(임장러 5번)', P.tierOf({ n: 5, acc: 0, rank: 9 }, 10, P.cfg({ tiers: [{ id: 'field', n: 5 }] })).id === 'field');
check('설정: 모르는 보상 종류·현금은 버림', JSON.stringify(P.cfg({ rewards: { analyst: [{ k: 'cash', n: 1000 }, { k: 'report', n: 2 }] } }).rewards.analyst) === JSON.stringify([{ k: 'report', n: 2 }]));
check('보상: 분석가 리포트 1장 · 고수 브리핑 1개월 · 달인 브리핑 3개월 + 리포트 3장 · 새싹·임장러 없음',
  P.rewards('analyst').map(r => r.t).join() === '프리미엄 리포트 이용권 1장' && P.rewards('pro').map(r => r.t).join() === '모닝 브리핑 무료 1개월'
  && P.rewards('master').map(r => r.t).join() === '모닝 브리핑 무료 3개월,프리미엄 리포트 이용권 3장' && !P.rewards('field').length && !P.rewards('sprout').length);
const qs = []; for (let i = 0; i < 60; i++) qs.push({ id: 'q' + i, kind: 'rs', st: 'done', ans: 'up', rat: `2026-${10 + (i % 3)}-${String(1 + (i % 27)).padStart(2, '0')}T09:10` });
const users = [{ uid: 'qa', nick: '가', answers: qs.slice(0, 55).map((q, j) => ({ id: q.id, k: j % 10 < 8 ? 'up' : 'dn' })) },
  { uid: 'qb', nick: '나', answers: qs.slice(0, 35).map((q, j) => ({ id: q.id, k: j % 10 < 6 ? 'up' : 'dn' })) },
  { uid: 'qc', nick: '다', answers: qs.slice(0, 12).map(q => ({ id: q.id, k: 'dn' })) }];
const TB = P.seasonTable(users, qs, '2026-Q4');
check('시즌표: 참여자 3명(100명 미만)이면 달인은 뽑지 않고 고수까지만', TB.map(r => r.nick + ':' + r.tier).join() === '가:pro,나:analyst,다:field', TB);
check('시즌표: 달인 최소 참여자 기준을 0으로 바꾸면(QZ_TIER_CFG) 달인', P.seasonTable(users, qs, '2026-Q4', P.cfg({ tiers: [{ id: 'master', minN: 0 }] })).map(r => r.nick + ':' + r.tier).join() === '가:master,나:analyst,다:field');
check('부동산 달인: 기본은 시즌 참여자 100명 이상일 때만(99명이면 고수까지)', P.TIER_CFG.tiers[0].minN === 100 && T(50, 90, 1, 99) === 'pro' && T(50, 90, 1, 100) === 'master');
check('다음 등급 안내: 달인은 참여자 100명 이상일 때 뽑는다고 알려 줌', (P.next({ tier: 'pro', n: 60, acc: 70 }).need || []).some(x => /참여자 100명 이상/.test(x)));
check('다음 등급 안내', JSON.stringify(P.next(TB[2]).need) === JSON.stringify(['예측 18번 더', '정확도 55% 이상']));

/* ---------- ② 서버 ---------- */
const mk = paid => require('./gs-harness')({ now: '2027-01-04T10:00:00+09:00', patch: paid ? g => g.replace('const PAID_OPEN = false;', 'const PAID_OPEN = true;') : null,
  data: { 'quiz/week.json': { v: 1, open: [], wait: [], done: qs.map(q => Object.assign({ t: '문제', opts: [{ k: 'up', t: '오른다' }, { k: 'dn', t: '내린다' }], why: '근거' }, q)) } } });
function seed(E) {
  const ss = [1, 2, 3].map(i => E.member(i, {}));
  const A = E.sheets['예측답'] || (E.sheets['예측답'] = null);
  users.forEach((u, i) => { u.answers.forEach(a => E.post({ action: 'quizAnswer', s: ss[i], id: a.id, k: a.k })); });
  return ss;
}
/* 답은 마감 전에만 받으므로 시트에 직접 넣음(가짜 서버) */
function seedDirect(E) {
  const ss = [1, 2, 3].map(i => E.member(i, {})), uid = i => E.T.qzUid('k' + (i + 1));
  E.ctx.uSheet('예측답', ['시각', '문제id', '회원', '보기', '주']);
  users.forEach((u, i) => u.answers.forEach(a => E.sheets['예측답'].appendRow([new Date(E.now), a.id, uid(i), a.k, '2026-W44'])));
  return ss;
}
let E = mk(false); E.props.QZ_TIER_CFG = JSON.stringify({ tiers: [{ id: 'master', minN: 0 }] });   // 아래 시나리오는 참여자 3명이라 달인 최소 참여자 기준을 끈 설정으로(기본 100명 규칙은 위에서 따로 확인)
let ss = seedDirect(E);
E.post({ action: 'quizNick', s: ss[0], nick: '집 박사' }); E.post({ action: 'quizNick', s: ss[1], nick: '분석왕' });
E.post({ action: 'quizPrefs', s: ss[0], hall: true, meet: true });
E.post({ action: 'quizPrefs', s: ss[1], hide: true, hall: false });
let r = E.post({ action: 'quizBoard' });
check('지난 시즌(2026-Q4) 자동 마감: 시즌표 3줄 · 보상 기록(달인 2줄 + 분석가 1줄)', r.ok && E.sheets['예측시즌'].rows.length === 4 && E.sheets['예측보상'].rows.length === 4, [E.sheets['예측시즌'] && E.sheets['예측시즌'].rows.length, E.sheets['예측보상'] && E.sheets['예측보상'].rows.length]);
E.post({ action: 'quizBoard' }); E.post({ action: 'quizMine', s: ss[0] });
check('마감은 한 번만', E.sheets['예측시즌'].rows.length === 4 && E.sheets['예측보상'].rows.length === 4);
check('보상 기록: 회원 확인값만(카카오 회원번호 없음)·상태 대기·현금 없음', !/k1|k2|회원1/.test(JSON.stringify(E.sheets['예측보상'].rows)) && E.sheets['예측보상'].rows.slice(1).every(x => x[7] === '대기' && /report|brief/.test(x[4])));
r = E.post({ action: 'quizClaim', s: ss[0] });
check('유료가 닫혀 있으면 [보상 받기]는 보관(대기 그대로)', r.ok && r.pending === true && r.grants.every(g => g.st === '대기') && /유료 서비스가 열리면/.test(r.msg), r);
r = E.post({ action: 'quizVoucherUse', s: ss[1], orderId: 'X' });
check('유료가 닫혀 있으면 이용권 쓰기도 막힘', !r.ok && r.code === 'paid_closed', r);
r = E.post({ action: 'quizMine', s: ss[0] });
check('내 기록: 지난 시즌 보상 2건(대기) · 이번 시즌 등급 새싹부터', r.ok && r.grants.length === 2 && r.season.id === '2027-Q1' && r.season.me.tier === 'sprout' && r.prefs.hall === true, r.season);
r = E.post({ action: 'quizHall' });
check('명예의 전당: 켠 분(집 박사)만·별명·등급·정확도·참여', r.ok && r.seasons.length === 1 && r.seasons[0].rows.map(x => x.nick).join() === '집 박사' && r.seasons[0].rows[0].tier === '부동산 달인' && r.seasons[0].rows[0].acc === 81.8 && r.seasons[0].rows[0].n === 55 && r.all.map(x => x.nick).join() === '집 박사', r);
check('명예의 전당에 회원 확인값·회원번호 없음', !/"q[0-9a-f]{12}"|k1|k2/.test(JSON.stringify(r)));
check('임장 모임 명단: 초대 받기를 켠 시즌 달인(집 박사)만, 운영자 시트에', E.sheets['예측임장모임'].rows.length === 2 && E.sheets['예측임장모임'].rows[1][1] === '집 박사');
check('임장 모임 다시 정리(quizMeetExport): 같은 결과', E.T.quizMeetExport() === 1 && E.sheets['예측임장모임'].rows.length === 2);
/* 순위 배지 숨기기: 이번 시즌 순위표에서 '나'는 등급을 숨김 */
const W2 = { v: 1, open: [], wait: [], done: [{ id: 'n1', kind: 'rs', st: 'done', ans: 'up', rat: '2027-01-04T09:10', t: '문제', opts: [{ k: 'up', t: '오른다' }, { k: 'dn', t: '내린다' }] }] };
E.data['quiz/week.json'] = W2;
E.sheets['예측답'].appendRow([new Date(E.now), 'n1', E.T.qzUid('k1'), 'up', '2027-W01']); E.sheets['예측답'].appendRow([new Date(E.now), 'n1', E.T.qzUid('k2'), 'up', '2027-W01']);
r = E.post({ action: 'quizBoard' });
const rowA = r.board.rows.find(x => x.nick === '집 박사'), rowB = r.board.rows.find(x => x.nick === '분석왕');
check('순위표 등급 배지: 보이는 분은 등급, 숨긴 분은 빈칸', rowA && rowA.tier === '새싹' && rowB && rowB.tier === '', r.board.rows);
/* 유료가 열린 뒤 */
E = mk(true); ss = seedDirect(E);
E.post({ action: 'quizBoard' });
r = E.post({ action: 'quizClaim', s: ss[1] });
check('유료 열림: 분석가 보상 받기 → 리포트 이용권 사용 가능', r.ok && !r.pending && r.grants.some(g => g.k === 'report' && g.st === '사용 가능' && g.left === 1), r);
r = E.post({ action: 'quizClaim', s: ss[0] });
check('유료 열림: 브리핑 신청이 없으면 브리핑 보상은 대기로 남고 안내', r.ok && r.grants.some(g => g.k === 'brief' && g.st === '대기') && /브리핑을 한 번 신청/.test(r.msg), r);
const ord = E.post({ action: 'createOrder', product: 'single', keys: ['s00~11680~%EB%8C%80%EC%B9%98%EB%8F%99~%EC%9D%80%EB%A7%88~84%E3%8E%A1%EB%8C%80'], contact: 'v@example.com', agree: true });
check('시험 주문 만들기', ord.ok, ord);
r = E.post({ action: 'quizVoucherUse', s: ss[1], orderId: ord.orderId });
check('이용권으로 주문 열기: 결제 없이 열람 토큰·남은 수 0(다 씀)', r.ok && r.token && E.sheets['예측보상'].rows.some(x => x[2] === E.T.qzUid('k2') && x[4] === 'report' && x[6] === 0 && x[7] === '다 씀'), r);
r = E.post({ action: 'quizVoucherUse', s: ss[1], orderId: ord.orderId });
check('같은 주문·다 쓴 이용권은 다시 못 씀', !r.ok);
const ord2 = E.post({ action: 'createOrder', product: 'pack', keys: ['s00~11680~%EB%8C%80%EC%B9%98%EB%8F%99~%EC%9D%80%EB%A7%88~84%E3%8E%A1%EB%8C%80', 's00~11710~%EC%9E%A0%EC%8B%A4%EB%8F%99~%EC%9E%A0%EC%8B%A4%EC%97%98%EC%8A%A4~84%E3%8E%A1%EB%8C%80'], contact: 'v@example.com', agree: true });
r = E.post({ action: 'quizVoucherUse', s: ss[0], orderId: ord2.orderId });
check('비교 패키지에는 이용권을 못 씀', !r.ok && /한 건/.test(r.err), r);

/* ---------- ④ 화면 ---------- */
const qz = read('quiz/index.html'), hall = read('quiz/hall/index.html'), co = read('premium/checkout/index.html'), lg = read('login/index.html'), tm = read('terms/index.html'), sw = read('sw.js');
check('예측 화면: 등급 칸·보상 받기·설정 3개·명예의 전당 링크·임장 모임 문구', /id="tierBox"/.test(qz) && /'quizClaim'/.test(qz) && /pfHide/.test(qz) && /pfHall/.test(qz) && /pfMeet/.test(qz) && /href="hall\/"/.test(qz) && qz.includes('시즌 달인께는 임장 모임 초대 소식을 보내 드려요'));
check('명예의 전당 화면: 서버 quizHall·별명만 안내·재미용 문구', /'quizHall'/.test(hall) && /별명으로만/.test(hall) && hall.includes('포인트는 재미용이며 현금이나 상품으로 바꿀 수 없어요'));
check('결제 화면: [이용권으로 열기](로그인·유료 열림·단지/청약 리포트만)', /id="vcBtn"/.test(co) && /'quizVoucherUse'/.test(co) && /\['single', 'cy'\]/.test(co) && /if \(!PAID \|\| REVIEW/.test(co));
check('내 계정: 등급 줄(숨기기 켜면 안 보임)', /id="qzTier"/.test(lg) && /j\.prefs && j\.prefs\.hide/.test(lg));
check('이용약관: 예측 맞히기 절(초안·변호사 검토 필요, 현금 없음, 회수)', /id="quiz"/.test(tm) && /초안 · 변호사 검토 필요/.test(tm.slice(tm.indexOf('id="quiz"'))) && /현금·상품·다른 포인트로 바꾸거나/.test(tm) && /취소하거나 회수/.test(tm));
check('서비스 워커: 명예의 전당·계산 파일 v3', /'\.\/quiz\/hall\/'/.test(sw) && /predict-core\.js\?v=3/.test(sw));

console.log(`\n예측 맞히기 등급·보상 확인: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
