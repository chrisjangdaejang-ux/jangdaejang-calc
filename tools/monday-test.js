/* 월요일 하루 한 통(v55) 자동 확인 — 실행: node tools/monday-test.js </dev/null
   ① 모닝 브리핑(이메일) 구독자 + 성적표 켬: 7시 브리핑 안에 성적표가 함께, 따로 성적표 메일 없음
   ② 7시에 성적표 자료가 아직이면 그분 브리핑만 9시 실행으로 미루고(BRIEF_SENT 안 적음), 9시에 성적표와 함께 한 통
   ③ 브리핑 안 받는 분 + 성적표 켬: 7시대 성적표 메일 한 통(달력·알림을 그 안에), 7시 알림 메일은 건너뜀, 9시 알림 실행도 다시 안 보냄
   ④ 8시대에도 자료가 없으면 알림·달력만 한 통(있을 때) · 트리거 7·8시
   가짜 시트·메일·공개 자료 위에서만 돕니다. */
'use strict';
const A = require('../assets/alerts-core.js');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } }

const P = { sd: 's00', code: '11710', dong: '잠실동', jibun: '19', apt: '잠실엘스', band: '84㎡대' };
const KEY = '잠실동|19|잠실엘스|84㎡대';
let RIXDATE = '2026-11-23';
const RG = { v: 1, g: '11710', date: '2026-11-30', pd: '', wk: null, u: { [KEY]: [313000, 2, 70, 55.0, 9, 1, '202610', 30, [[20261020, 12, 313000, 0, 0]]] }, p: {}, d: {} };
const E = require('./gs-harness')({ now: '2026-11-30T07:10:00+09:00', data: {
  'index.json': { sgg: { '11710': { name: '송파구', sido: '서울특별시' } }, sido: [] }, 'chungyak/notices.json': { rows: [] },
  'report/index.json': () => ({ date: RIXDATE }), 'report/g/11710.json': () => Object.assign({}, RG, { date: RIXDATE }),
  'brief/index.json': () => ({ date: E.kday() }), 'brief/market.json': { date: '2026-11-30', lines: ['전국 요약'] },
  'brief/11710.json': { g: '11710', name: '송파구', trades: [], lines: { '': { fact: '송파구 새 거래 요약' } }, urgent: [], gap: [] } } });
const HOME = Object.assign({ t: '2026-11-20' }, P);
const BR = { areas: [{ g: '11710', gn: '송파구', sd: '서울특별시', dn: '' }], apts: [] };
/* B: 브리핑 구독 + 성적표, N: 브리핑 없음 + 성적표 + 달력(전세 만기 알림 대신 종부세 납부 날짜) */
const sB = E.member(1, { homes: [HOME], brief: BR }), sN = E.member(2, { homes: [HOME], cal: { h: { ['11710|잠실동|19|잠실엘스|84㎡대']: { t: 'own' } }, ms: 1 } });
let r = E.post({ action: 'alertJoin', s: sB, consent: true, email: 'b@example.com', v: A.V, prefs: { rp: true } });
check('B 알림 신청(성적표)', r.ok, r);
r = E.post({ action: 'briefTrial', s: sB, channel: 'email', contact: 'b@example.com', privacy: true });
check('B 모닝 브리핑 체험(이메일)', r.ok, r);
r = E.post({ action: 'alertJoin', s: sN, consent: true, email: 'n@example.com', v: A.V, prefs: { rp: true, cal: true } });
check('N 알림 신청(성적표·달력)', r.ok, r);
const to = (from, a) => E.mails.slice(from).filter(m => m.to === a);
const SETUP = E.mails.length;                       // 신청 확인 메일(신청한 그 순간 한 번)은 정기 메일이 아님

/* 7시대: 자료가 아직(지난주 판) */
let n0 = E.mails.length;
E.T.alertsDaily(); E.T.briefDaily(); E.ctx.reportWeekly();
check('② 7시 자료 없음: B 브리핑을 미룸(아직 안 감)', to(n0, 'b@example.com').length === 0);
check('② 7시 자료 없음: 브리핑 실행 완료 표시를 적지 않아 9시에 이어 보냄', E.props.BRIEF_SENT !== E.kday());
check('③ 7시 알림 실행은 성적표를 켠 N 을 건너뜀(성적표 메일에 함께)', to(n0, 'n@example.com').length === 0);
/* 8시대: 자료가 나옴 → N 에게 성적표 + 달력 한 통 */
RIXDATE = '2026-11-30'; E.now = Date.parse('2026-11-30T08:10:00+09:00'); n0 = E.mails.length;
E.ctx.reportWeekly();
const mN = to(n0, 'n@example.com');
check('③ N: 성적표 메일 한 통 안에 이번 주 달력', mN.length === 1 && /내 집 성적표/.test(mN[0].subject) && /잠실엘스/.test(mN[0].htmlBody) && /내 부동산 달력/.test(mN[0].htmlBody), mN.map(m => m.subject));
check('① 성적표 메일은 브리핑 구독자 B 에게 따로 가지 않음', to(n0, 'b@example.com').length === 0);
/* 9시대: 브리핑 재실행 → B 브리핑 안에 성적표 · 알림 9시 실행은 N 에게 다시 안 보냄 */
E.now = Date.parse('2026-11-30T09:10:00+09:00'); n0 = E.mails.length;
E.T.briefDaily(); E.T.alertsDaily(); E.ctx.reportWeekly();
const mB = to(n0, 'b@example.com');
check('①② B: 9시 브리핑 한 통 안에 이번 주 내 집 성적표', mB.length === 1 && /모닝 브리핑/.test(mB[0].subject) && /이번 주 <span[^>]*>내 집 성적표/.test(mB[0].htmlBody) && /잠실엘스/.test(mB[0].htmlBody), mB.map(m => m.subject));
check('③ N: 9시 알림·성적표 실행에서 두 번째 메일 없음', to(n0, 'n@example.com').length === 0);
const all = d => E.mails.slice(SETUP).filter(m => m.to === d).length;
check('월요일 하루 정기 메일: B 한 통 · N 한 통', all('b@example.com') === 1 && all('n@example.com') === 1, [all('b@example.com'), all('n@example.com')]);
n0 = E.mails.length; E.T.briefDaily(); E.T.alertsDaily(); E.ctx.reportWeekly();
check('같은 날 다시 돌려도 더 안 감', E.mails.length === n0);

/* ④ 다음 주: 8시대에도 자료가 없으면 N 에게 알림·달력만 한 통 */
E.now = Date.parse('2026-12-07T07:10:00+09:00'); n0 = E.mails.length;
E.ctx.reportWeekly(); E.T.alertsDaily();
check('④ 7시: 자료 없음 → N 에게 아무것도 안 감', to(n0, 'n@example.com').length === 0);
E.now = Date.parse('2026-12-07T08:10:00+09:00'); E.ctx.reportWeekly();
const m4 = to(n0, 'n@example.com');
check('④ 8시대에도 자료 없음 → 달력만 한 통(성적표 없이)', m4.length === 1 && /내 부동산 달력/.test(m4[0].htmlBody) && !/내 집 성적표/.test(m4[0].subject), m4.map(m => m.subject));
E.now = Date.parse('2026-12-07T09:10:00+09:00'); E.T.alertsDaily();
check('④ 9시 알림 실행도 다시 안 보냄(하루 한 통)', to(n0, 'n@example.com').length === 1);
/* 트리거 */
const gs = E.gs;
check('reportInstall: 월요일 7시대·8시대', /onWeekDay\(ScriptApp\.WeekDay\.MONDAY\)\.atHour\(7\)/.test(gs) && /onWeekDay\(ScriptApp\.WeekDay\.MONDAY\)\.atHour\(8\)/.test(gs) && !/MONDAY\)\.atHour\(9\)/.test(gs) && !/MONDAY\)\.atHour\(11\)/.test(gs));

console.log(`\n월요일 하루 한 통 확인: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
