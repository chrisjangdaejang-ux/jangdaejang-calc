/* 내 부동산 달력 자동 확인 — 실행: node tools/cal-test.js </dev/null
   ① assets/cal-core.js 날짜 규칙(손으로 센 날짜와 같음): 6월 1일 과세기준일·재산세 7.16~7.31/9.16~9.30·종부세 고지 11.26·납부 12.1~12.15·
      취득세 60일·양도세 예정신고(양도일이 속한 달 말일부터 2개월)·계약갱신요구권(만기 6개월 전~2개월 전, 말일 맞춤)·전입·확정일자·전월세 신고 30일·청약 일정
   ② 확인하지 못한 규칙(일시적 2주택)은 만들지도 보여 주지도 않음 · 금액 칸은 저장하지 않음 · 메일 단계(30일·7일·1일 / 주 1회)
   ③ 서버(tools/agent-backend.gs v55): CAL-CORE 글자 그대로 · 저장 자료 cal 저장·불러오기 · 모닝 브리핑 안에 함께(하루 한 통) · 브리핑 없는 분은 주 1회 · 끄기 링크 · 광고 없음
   ④ 화면 mine/calendar/·알림 센터·서비스 워커·출처 주소 */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('../assets/cal-core.js'), A = require('../assets/alerts-core.js');
const ROOT = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } }

/* ---------- ① 날짜 계산 ---------- */
check('날짜 더하기·빼기', [C.add('2026-11-10', 60), C.add('2026-12-31', 1), C.diff('2026-11-25', '2026-12-01')].join() === '2027-01-09,2027-01-01,6');
check('달 더하기: 그 달에 그날이 없으면 말일', [C.addM('2026-08-31', -6), C.addM('2027-08-31', -2), C.addM('2026-03-31', -1), C.addM('2028-08-29', -6)].join() === '2026-02-28,2027-06-30,2026-02-28,2028-02-29');
check('말일', [C.monthEnd('2026-02-10'), C.monthEnd('2028-02-01'), C.monthEnd('2026-12-05')].join() === '2026-02-28,2028-02-29,2026-12-31');
check('없는 날짜는 받지 않음', !C.okDate('2026-02-30') && !C.okDate('2026-13-01') && !C.okDate('20261101') && C.okDate('2026-02-28'));
const HOME = { key: '11680|대치동|316|은마|84㎡대', name: '은마 84㎡대' };
const ev = C.events([Object.assign({}, HOME, { cal: { t: 'own', acq: '2026-11-10', sell: '2026-11-20' } })], '2026-11-25', {});
const by = k => ev.filter(e => e.k === k);
check('종부세 고지: 납부 시작 5일 전(11월 26일)', by('compN')[0].d === '2026-11-26');
check('종부세 납부: 12월 1일~15일', by('compP')[0].start === '2026-12-01' && by('compP')[0].d === '2026-12-15');
check('과세기준일: 다음 해 6월 1일', by('base')[0].d === '2027-06-01');
check('재산세 1기분 7월 16일~31일, 2기분 9월 16일~30일', by('prop1')[0].start === '2027-07-16' && by('prop1')[0].d === '2027-07-31' && by('prop2')[0].start === '2027-09-16' && by('prop2')[0].d === '2027-09-30');
check('취득세: 잔금일 11/10 다음 날부터 60일 → 2027-01-09', by('acq')[0].d === '2027-01-09' && /60일/.test(by('acq')[0].s));
check('양도세 예정신고: 11/20 양도 → 11월 말일부터 2개월 → 2027-01-31', by('cgt')[0].d === '2027-01-31');
check('양도세: 월말 양도(1/31)도 → 3월 31일', C.events([Object.assign({}, HOME, { cal: { t: 'own', sell: '2027-01-31' } })], '2027-01-01', {}).find(e => e.k === 'cgt').d === '2027-03-31');
check('날짜 순서대로', ev.every((e, i) => !i || ev[i - 1].d <= e.d));
const lease = C.events([Object.assign({}, HOME, { cal: { t: 'jeonse', cs: '2025-08-31', ce: '2027-08-31' } })], '2026-11-25', {});
const lo = lease.find(e => e.k === 'renewO'), lc = lease.find(e => e.k === 'renewC');
check('계약갱신요구권: 만기 8/31 → 6개월 전 2/28(말일 맞춤)부터 2개월 전 6/30까지', lo.d === '2027-02-28' && lo.end === '2027-06-30' && lc.d === '2027-06-30', [lo, lc]);
check('전세 만기일도 달력에', lease.some(e => e.k === 'end' && e.d === '2027-08-31'));
check('자가 정기 일정은 전세만 있으면 없음', !lease.some(e => e.k === 'base' || e.k === 'prop1'));
const mv = C.events([Object.assign({}, HOME, { cal: { t: 'wolse', cs: '2026-11-20', ce: '2028-11-19' } })], '2026-11-25', {});
check('새로 이사(5일 전): 전월세 신고(30일)는 계약 뒤 30일 동안 보이고, 이사한 날 알림은 지남', mv.some(e => e.k === 'rent') && !mv.some(e => e.k === 'move'));
check('전월세 신고 문구: 6,000만 원 초과·30만 원 초과·30일·확정일자', /6,000만 원 초과/.test(mv.find(e => e.k === 'rent').s) && /30만 원 초과/.test(mv.find(e => e.k === 'rent').s) && /30일/.test(mv.find(e => e.k === 'rent').s));
const mv2 = C.events([Object.assign({}, HOME, { cal: { t: 'wolse', cs: '2026-12-10', ce: '2028-12-09' } })], '2026-11-25', {});
check('이사할 날: 전입신고·확정일자·대항력(다음 날)', /전입신고/.test(mv2.find(e => e.k === 'move').s) && /다음 날부터 대항력/.test(mv2.find(e => e.k === 'move').s));
check('6월 1일 앞뒤 잔금이면 한 줄 더', /6월 1일 앞뒤/.test(C.events([Object.assign({}, HOME, { cal: { t: 'own', sell: '2027-06-03' } })], '2026-11-25', {}).find(e => e.k === 'base').p));
/* 청약 */
const N = [{ no: 'A1', n: '강남 공고', sd: '서울특별시', g: '강남구', pb: '20261120', r1: ['20261201', '20261202'], pw: '20261210', u: 'https://www.applyhome.co.kr/x', hh: 300 },
  { no: 'B1', n: '부산 공고', sd: '부산광역시', g: '해운대구', pb: '20261120', r1: ['20261201', '20261201'] }];
const cy = C.events([], '2026-11-25', { notices: N, areas: [{ sd: '서울특별시', gn: '강남구' }] });
check('청약: 내 지역 공고만 — 새 공고(나온 뒤 7일 동안)·1순위 접수·당첨자 발표', cy.map(e => e.id).join() === 'cy|A1|pb,cy|A1|r1,cy|A1|pw', cy.map(e => e.id));
check('청약: 새 공고는 나온 뒤 7일 안에 한 번 메일 단계', C.due(cy, 'daily', {}).map(e => e.id + ':' + e.stage).join() === 'cy|A1|pb:d1,cy|A1|r1:d7,cy|A1|pw:d30');
check('청약: 청약홈 주소만 링크로', cy.every(e => e.u === 'https://www.applyhome.co.kr/x'));

/* ---------- ② 확인 못 한 규칙·금액·메일 단계 ---------- */
check('일시적 2주택(2026-11-26 법령 원문 확인)은 \'먼저 챙겨 드려요\'(pro) 규칙 — 기능이 꺼져 있으면 일정이 안 생김(자세한 확인은 tools/proactive-test.js)', C.RULES.tmp2.ok === true && C.RULES.tmp2.pro === 1 && !ev.concat(lease, mv, cy).some(e => e.k === 'tmp2' || e.k === 'hold2'));
check('확인 전 규칙(ok:false)은 어떤 경우에도 일정이 안 생김', Object.keys(C.RULES).filter(k => !C.RULES[k].ok).every(k => !ev.concat(lease, mv, cy).some(e => e.k === k)));
check('보여 주는 규칙은 모두 출처가 있음', Object.keys(C.RULES).filter(k => C.RULES[k].ok).every(k => C.RULES[k].src.length && C.RULES[k].src.every(s => C.SRC[s] && /^https:\/\//.test(C.SRC[s].url))));
const cl = C.cleanAll({ h: { [HOME.key]: { t: 'own', acq: '2026-11-10', price: 150000, bp: 1, loan: 3 }, 'bad<key': { t: 'own' }, '11680|대치동|316|은마|59㎡대': { t: 'zz' } }, n: 2, ms: 5, x: 1 });
check('저장 정리: 금액·모르는 칸은 버리고 날짜만', JSON.stringify(cl) === JSON.stringify({ h: { [HOME.key]: { t: 'own', acq: '2026-11-10', sell: '' } }, n: 2, t: '', ms: 5 }), cl);
check('저장 정리: 만기가 시작보다 앞이면 만기 지움', C.clean({ t: 'jeonse', cs: '2026-05-01', ce: '2026-04-01' }).ce === '');
check('메일 단계: 매일(30·7·1일 전) / 주 1회(1주·5주 안)', [C.stage(30, 'daily'), C.stage(7, 'daily'), C.stage(1, 'daily'), C.stage(31, 'daily'), C.stage(8, 'weekly'), C.stage(37, 'weekly'), C.stage(38, 'weekly'), C.stage(-1, 'daily')].join() === 'd30,d7,d1,,d7,d30,,');
const ev2 = ev.map(e => Object.assign({}, e));
const due0 = C.due(ev2, 'daily', {});
check('보낼 것: 오늘 기준 30일 안 (종부세 고지·납부)', due0.map(e => e.k).join() === 'compN,compP', due0.map(e => [e.k, e.dd, e.stage]));
check('이미 보낸 단계는 다시 안 감(7일 단계를 보냈으면 30일 단계도 안 감)', C.due(ev2, 'daily', { [due0[1].id + '|d7']: 1, [due0[0].id + '|d1']: 1 }).length === 0);
const mh = C.mailHtml(due0, { site: '집예보', web: 'https://w/', off: 'https://x/?cal=1', date: '2026-11-25' });
check('메일: 제목·달력 링크·끄기 링크·광고 아님', /\[집예보\] 11월 25일 내 부동산 달력/.test(mh.subject) && /mine\/calendar\//.test(mh.html) && /cal=1/.test(mh.html) && /광고가 아니에요/.test(mh.html) && !/\(광고\)/.test(mh.subject), mh.subject);
check('메일(브리핑 안): 바깥 머리·꼬리 없이 칸만', !/보낸 사람/.test(C.mailHtml(due0, { merged: true }).html));

/* ---------- ③ 서버 ---------- */
const gs = read('tools/agent-backend.gs');
const blk = (s, n) => { const a = s.indexOf(`/* ${n}-CORE BEGIN`), b = s.indexOf(`/* ${n}-CORE END */`); return a >= 0 && b > a ? s.slice(a, b) : null; };
check('서버 CAL-CORE = 화면 cal-core.js(글자 그대로)', blk(gs, 'CAL') && blk(gs, 'CAL') === blk(read('assets/cal-core.js'), 'CAL'));
check('서버 v55 변경 요약 표시', /\* v55 변경 요약 \(/.test(gs) && gs.indexOf('v55 변경 요약') < gs.indexOf('v53 변경 요약'));
const E = require('./gs-harness')({ now: '2026-11-25T07:10:00+09:00', data: { 'index.json': { sgg: { '11680': { name: '강남구', sido: '서울특별시' } }, sido: [] }, 'chungyak/notices.json': { rows: N } } });
const PL = { sd: 's00', code: '11680', dong: '대치동', jibun: '316', apt: '은마', band: '84㎡대', t: '2026-11-20' };
const calA = { h: { [HOME.key]: { t: 'own', acq: '2026-11-10' } }, n: 1, ms: 10 };
const sA = E.member(1, { homes: [PL], cal: calA }), sB = E.member(2, { homes: [PL], cal: calA });
let r = E.post({ action: 'userLoad', s: sA });
check('서버: 불러오기에 달력 칸(cal)', r.ok && r.data.cal && r.data.cal.h[HOME.key].t === 'own' && r.data.cal.n === 1, r.data && r.data.cal);
r = E.post({ action: 'userSave', s: sA, data: { homes: [PL], cal: { h: { [HOME.key]: { t: 'own', acq: '2026-11-10', amt: 99999 } }, n: 1, ms: 11 } } });
check('서버: 저장 때 금액 칸은 버림', r.ok && r.data.cal.h[HOME.key].amt === undefined && r.data.cal.ms === 11, r.data && r.data.cal);
r = E.post({ action: 'alertJoin', s: sA, consent: true, email: 'a@example.com', v: A.V, prefs: { cal: true } });
check('서버: 관심 단지 없이 내 집 + 달력 메일만 켜도 신청됨 · alertMine cal:1', r.ok && r.sub.prefs.cal === true && r.cal === 1, r);
E.post({ action: 'alertJoin', s: sB, consent: true, email: 'b@example.com', v: A.V, prefs: { cal: true } });
/* B 는 모닝 브리핑(이메일) 구독자로 — 브리핑 메일 안에 함께 */
const M = E.T.axMorning(new Date(E.now));
const xb = M.forUser('k2');
check('브리핑 안에 넣을 달력 칸(30일 안: 종부세 고지·납부 + 내 지역 청약)', xb && xb.CI.map(e => e.k).sort().join() === 'compN,compP,cy,cy,cy' && /내 부동산 달력/.test(xb.html) && !xb.D, xb && xb.CI.map(e => e.k));
M.done(xb);
const M2 = E.T.axMorning(new Date(E.now));
check('같은 날 다시: 이미 보낸 단계라 안 넣음', M2.forUser('k2') === null);
/* A 는 브리핑 없음 → alertsDaily 가 주 1회 따로 */
let n0 = E.mails.length; E.T.alertsDaily();
const mA = E.mails.slice(n0).filter(m => m.to === 'a@example.com');
check('브리핑 없는 분: 달력 메일 한 통(광고 없음·끄기 링크)', mA.length === 1 && /내 부동산 달력/.test(mA[0].subject) && /action=alertOff[^"]*cal=1/.test(mA[0].htmlBody) && !/\(광고\)/.test(mA[0].subject), mA.map(m => m.subject));
E.now += 86400000; n0 = E.mails.length; E.T.alertsDaily();
check('다음 날(같은 주): 다시 안 보냄(일주일에 한 번까지)', !E.mails.slice(n0).some(m => m.to === 'a@example.com'));
E.now += 6 * 86400000; n0 = E.mails.length; E.T.alertsDaily();
const mA2 = E.mails.slice(n0).filter(m => m.to === 'a@example.com');
check('다음 주: 지난주 보낸 단계는 빼고 새 단계만(당첨자 발표 7일 단계, 종부세는 안 감)', mA2.length === 1 && /당첨자 발표/.test(mA2[0].htmlBody) && !/종합부동산세/.test(mA2[0].htmlBody), mA2.map(m => m.subject));
E.now += 7 * 86400000; n0 = E.mails.length; E.T.alertsDaily();
const mA3 = E.mails.slice(n0).filter(m => m.to === 'a@example.com');
check('그다음 주: 종부세 납부 마감 1주 안(7일 단계)', mA3.length === 1 && /종합부동산세 납부/.test(mA3[0].htmlBody), mA3.map(m => m.subject));
const idA = E.sheets['알림구독'].rows.slice(1).find(x => x[E.T.AXC['카카오id']] === 'k1')[E.T.AXC['id']];
const h = E.get({ action: 'alertOff', id: idA, t: E.T.axTok(idA), cal: '1' }).s;
check('끄기 링크: 달력 메일만 꺼짐', /달력 메일을 껐어요/.test(h) && JSON.parse(E.sheets['알림구독'].rows.slice(1).find(x => x[E.T.AXC['카카오id']] === 'k1')[E.T.AXC['설정']]).cal === false);
check('보낸 기록에 연락처·날짜 원문 없음', !JSON.stringify(E.sheets['알림기록'].rows).includes('@') && !JSON.stringify(E.sheets['알림기록'].rows).includes('2026-11-10'));

/* ---------- ④ 화면 ---------- */
const page = read('mine/calendar/index.html'), center = read('my/alerts/index.html'), sw = read('sw.js'), mine = read('mine/index.html');
check('달력 화면: 계산·세금 엔진·공시가격·로그인 부품', /cal-core\.js\?v=4/.test(page) && /tax-engine\.js/.test(page) && /gongsi\.js/.test(page) && /auth\.js/.test(page) && /back\.js\?v=3/.test(page));
check('달력 화면: 예상 재산세는 "참고" 표시 + 계산 근거', /예상 재산세\(참고\)/.test(page) && /공시가격 중간값/.test(page));
check('달력 화면: 금액(보증금·현금·소득)은 이 기기(jdj_ta_me)에만 — 계정 저장(d.cal)에는 달력 칸만', /const TK = 'jdj_ta_me'/.test(page) && /d\.cal = Object\.assign\(\{\}, CAL/.test(page) && !/d\.cal[^;]*ME\./.test(page) && !/(dep|cash|inc)=/.test(page.replace(/data-ta-(dep|cash|inc)/g, '')));
check('달력 화면: 로그인해야 날짜를 넣음', /AU\.gate\(/.test(page) && /loggedIn\(\)/.test(page));
check('달력 화면: 서비스 이름은 설정에서, 회사 이름·경쟁 앱 이름 없음', /SITE_NAME/.test(page) && !/장대장부동산그룹/.test(page) && !/호갱|직방|아실|리치고|네이버\s?부동산/.test(page));
check('알림 센터: 달력 메일 켜기(prefs.cal)·서버 새 판 확인', /id="calBox"/.test(center) && /P\.cal = \$\('calOn'\)\.checked/.test(center) && /MINE\.cal === 1/.test(center));
check('알림 계산: cal 설정은 직접 켠 경우에만', A.cleanPrefs({}).cal === false && A.cleanPrefs({ cal: true }).cal === true && A.cleanPrefs({ cal: 'y' }).cal === false);
check('내 집 시세 화면에서 달력으로 가는 길', /href="calendar\/"/.test(mine));
check('서비스 워커: 달력 화면·계산 파일', /'\.\/mine\/calendar\/'/.test(sw) && /cal-core\.js\?v=4/.test(sw));
check('공식 출처 주소가 계산 파일에 그대로', ['news.seoul.go.kr/gov/archives/200106', 'news.seoul.go.kr/gov/archives/200082', 'easylaw.go.kr', 'lsJoLnkSeq=1007847519', 'lsJoLnkSeq=1018577211', 'mediahub.seoul.go.kr/archives/2001807', 'lsiSeq=249983'].every(u => read('assets/cal-core.js').includes(u)));
const txt = Object.values(C.RULES).map(x => x.why || '').join(' ') + ev.concat(lease, mv2, cy).map(e => e.t + ' ' + e.s + ' ' + (e.p || '')).join(' ');
check('문구: ~요 말투, 딱딱한 말투·보장 표현 없음', !/습니다|십시오|보장|무조건/.test(txt));

/* ---------- ⑤ 전세 만기 알림(세입자) ---------- */
const TA = C.cleanTa({ on: true, areas: [{ g: '11710', d: '가락동' }, { g: '11710', d: '문정동' }, { g: '11710', d: '송파동' }, { g: '11680', d: '대치동' }], work: { g: '11680', d: '역삼동' }, ty: 'a', band: '84㎡대', buy: true, down: 'y', dep: 60000, cash: 1, income: 7000 });
check('만기 알림 설정 정리: 희망 지역 3곳까지·체크는 true 만·보증금·현금·소득은 버림', JSON.stringify(TA) === JSON.stringify({ on: true, areas: [{ g: '11710', d: '가락동' }, { g: '11710', d: '문정동' }, { g: '11710', d: '송파동' }], work: { g: '11680', d: '역삼동' }, ty: 'a', band: '84㎡대', buy: true, down: false }), TA);
check('저장 정리: 전세 집에만 만기 알림 칸', C.clean({ t: 'jeonse', ce: '2027-08-31', ta: TA }).ta.on === true && C.clean({ t: 'own', ta: TA }).ta === undefined);
const tev = C.events([Object.assign({}, HOME, { cal: { t: 'jeonse', cs: '2025-08-31', ce: '2027-08-31', ta: TA } })], '2026-11-25', {}).filter(e => e.k === 'ta');
check('만기 6·4·2개월 전 알림 날짜(2/28·4/30·6/30)', tev.map(e => e.d).join() === '2027-02-28,2027-04-30,2027-06-30', tev.map(e => e.d));
check('알림을 끄면 만기 알림 날짜 없음', !C.events([Object.assign({}, HOME, { cal: { t: 'jeonse', ce: '2027-08-31', ta: Object.assign({}, TA, { on: false }) } })], '2026-11-25', {}).some(e => e.k === 'ta'));
const tev2 = C.events([Object.assign({}, HOME, { cal: { t: 'jeonse', ce: '2027-05-30', ta: TA } })], '2026-12-05', {});
check('메일 단계: 알림 날짜(6개월 전 11/30)가 지나고 14일 안이면 한 번(ta)', C.due(tev2, 'weekly', {}).filter(e => e.k === 'ta').map(e => e.m + ':' + e.stage).join() === '6:ta' && !C.due(tev2, 'weekly', { [tev2.find(e => e.k === 'ta').id + '|ta']: 1 }).some(e => e.k === 'ta'));
/* 공개 전월세 실거래 모양(rent/{구}.json units)으로 손 계산: 신규·순수 전세만, 최근 6개월(2026-05-25 이후) vs 그 전 6개월 */
const c_ = (d, dep, mo, kind) => [d, 84.9, 5, dep, mo || 0, kind == null ? 0 : kind];
const RF = { units: [
  ['가락동', 'A단지', '84㎡대', '1', 84.9, 0, 0, [], [], [], [c_(20261020, 80000), c_(20261001, 82000), c_(20260901, 84000), c_(20260910, 50000, 100), c_(20260920, 70000, 0, 1),
    c_(20260401, 90000), c_(20260301, 92000), c_(20260101, 94000)], {}],
  ['가락동', 'B단지', '84㎡대', '2', 84.9, 0, 0, [], [], [], [c_(20261010, 70000), c_(20261011, 71000), c_(20261012, 72000), c_(20260201, 69000), c_(20260202, 70000), c_(20260203, 71000)], {}],
  ['문정동', 'C단지', '84㎡대', '3', 84.9, 0, 0, [], [], [], [c_(20261010, 55000), c_(20260110, 54000)], {}],
  ['문정동', 'D단지', '59㎡대', '4', 59, 0, 0, [], [], [], [c_(20261010, 30000), c_(20261011, 30000), c_(20261012, 30000), c_(20260110, 40000), c_(20260111, 40000), c_(20260112, 40000)], {}] ] };
const sc = C.taScan({ '11710': RF }, [{ g: '11710', d: '가락동' }, { g: '11710', d: '문정동' }], '84㎡대', '2026-11-25', 72000);
check('내린 단지: A 82,000(3건) vs 92,000(3건) → −10.9% (월세·갱신 계약 뺌), B 는 올라서 빠짐', JSON.stringify(sc.apts.map(a => [a.a, a.nr, a.np, a.mr, a.mp, a.chg])) === JSON.stringify([['A단지', 3, 3, 82000, 92000, -10.9]]), sc.apts);
check('내린 동: 가락동 최근 6건 중간값 (72,000+80,000)/2 = 76,000 vs 그 전 6건 (71,000+90,000)/2 = 80,500 → −5.6%', JSON.stringify(sc.dongs.map(d => [d.d, d.nr, d.np, d.mr, d.mp, d.chg])) === JSON.stringify([['가락동', 6, 6, 76000, 80500, -5.6]]), sc.dongs);
check('표본이 적은 곳(C: 1건·1건)은 변화율을 내지 않음, 다른 평형(D 59㎡)은 뺌', !sc.apts.some(a => a.a === 'C단지' || a.a === 'D단지') && !sc.dongs.some(d => d.d === '문정동'));
check('내 보증금 7억 2,000만으로 갈 수 있는 단지: B(71,000)·C(55,000) = 2곳', sc.fit === 2 && sc.fitList.map(a => a.a).sort().join() === 'B단지,C단지', sc.fitList);
check('보증금을 안 넣으면 0곳(서버 메일은 보증금 없이 계산)', C.taScan({ '11710': RF }, [{ g: '11710', d: '가락동' }], '84㎡대', '2026-11-25', 0).fit === 0);
const own = C.taOwn(RF, { dong: '가락동', apt: 'A단지', band: '84㎡대', jibun: '1' }, '2026-11-25');
check('내 단지 전세 시세(최근 6개월 82,000 · 그 전 92,000)', own && own.mr === 82000 && own.mp === 92000 && own.chg === -10.9, own);
const tm = C.taMailHtml('A단지 84㎡대', sc, own, { gname: () => '송파구', web: 'https://w/' });
check('메일 칸: 내린 동(건수)·내 단지 시세·갱신 요구권 법 조문·전세 안전 점검 링크·보증금 비교는 화면에서', /송파구 가락동 −/.test(tm) && /6건/.test(tm) && /계약갱신요구권/.test(tm) && /lsJoLnkSeq=1007847519/.test(tm) && /jeonse\//.test(tm) && /mine\/calendar\/#ta/.test(tm) && /정보 안내/.test(tm), tm.slice(0, 300));
/* 서버: 달력 메일은 안 켜고 만기 알림만 켠 세입자 → 주 1회 메일에 만기 준비 칸 */
const E2 = require('./gs-harness')({ now: '2026-12-04T07:10:00+09:00', data: { 'index.json': { sgg: { '11710': { name: '송파구', sido: '서울특별시' } }, sido: [] }, 'chungyak/notices.json': { rows: [] }, 'rent/11710.json': RF } });
const TP = { sd: 's00', code: '11710', dong: '가락동', jibun: '1', apt: 'A단지', band: '84㎡대', t: '2026-11-20' }, TK2 = '11710|가락동|1|A단지|84㎡대';
const sT = E2.member(9, { homes: [TP], cal: { h: { [TK2]: { t: 'jeonse', cs: '2025-05-30', ce: '2027-05-30', ta: Object.assign({}, TA, { areas: [{ g: '11710', d: '가락동' }, { g: '11710', d: '문정동' }] }) } }, ms: 3 } });
let rT = E2.post({ action: 'alertJoin', s: sT, consent: true, email: 't@example.com', v: A.V, prefs: {} });
check('서버: 관심 단지·달력 메일 없이 만기 알림만 켜도 알림 메일 신청됨', rT.ok && rT.ta === 1, rT);
rT = E2.post({ action: 'userLoad', s: sT });
check('서버: 저장된 만기 알림 설정에 보증금·현금·소득 칸 없음', rT.ok && rT.data.cal.h[TK2].ta.on === true && !/dep|cash|income/.test(JSON.stringify(rT.data.cal)), rT.data && rT.data.cal);
const n9 = E2.mails.length; E2.T.alertsDaily();
const mT = E2.mails.slice(n9).filter(m => m.to === 't@example.com');
check('서버: 만기 6개월 전(11/30) 지난 주 → 만기 준비 칸(내린 동·내 단지 시세·법 조문) 한 통, 광고 없음', mT.length === 1 && /만기 준비/.test(mT[0].htmlBody) && /가락동/.test(mT[0].htmlBody) && /내 단지 전세 시세/.test(mT[0].htmlBody) && /lsJoLnkSeq=1007847519/.test(mT[0].htmlBody) && !/\(광고\)/.test(mT[0].subject), mT.map(m => m.subject));
check('서버: 달력 메일을 안 켰으니 세금 날짜는 안 들어감', mT.length === 1 && !/종합부동산세|재산세/.test(mT[0].htmlBody));
E2.now += 7 * 86400000; const n10 = E2.mails.length; E2.T.alertsDaily();
check('서버: 같은 만기 알림은 다시 안 보냄', !E2.mails.slice(n10).some(m => m.to === 't@example.com'));
/* 화면·안내 */
const jeon = read('jeonse/index.html'), homeP = read('index.html'), priv = read('privacy/index.html');
check("가입 유도: 전월세 화면·첫 화면에 '전세 만기 알림 받기'", /href="\.\.\/mine\/calendar\/#ta"[^>]*>[\s\S]{0,200}전세 만기 알림 받기/.test(jeon) && /id="taCard" href="mine\/calendar\/#ta"[\s\S]{0,200}전세 만기 알림 받기/.test(homeP));
check('개인정보처리방침: 만기 알림 설정 항목·보증금·현금·소득은 기기에만', /전세 만기 알림을 켠 경우 그 설정/.test(priv) && /보증금·보유 현금·연소득은 이용자 기기에만/.test(priv));
check('달력 화면: 매수 비교는 내 집 마련 계산 규칙(loan-core)·모두 참고 표시', /loan-core\.js/.test(page) && /LN\.need\(/.test(page) && /③ 매수로 바꾸면\(참고\)/.test(page) && /한 달 비용 비교\(참고\)/.test(page));

console.log(`\n내 부동산 달력 확인: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
