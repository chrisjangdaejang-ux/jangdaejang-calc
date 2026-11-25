/* 내 부동산 달력 자동 확인 — 실행: node tools/cal-test.js </dev/null
   ① assets/cal-core.js 날짜 규칙(손으로 센 날짜와 같음): 6월 1일 과세기준일·재산세 7.16~7.31/9.16~9.30·종부세 고지 11.26·납부 12.1~12.15·
      취득세 60일·양도세 예정신고(양도일이 속한 달 말일부터 2개월)·계약갱신요구권(만기 6개월 전~2개월 전, 말일 맞춤)·전입·확정일자·전월세 신고 30일·청약 일정
   ② 확인하지 못한 규칙(일시적 2주택)은 만들지도 보여 주지도 않음 · 금액 칸은 저장하지 않음 · 메일 단계(30일·7일·1일 / 주 1회)
   ③ 서버(tools/agent-backend.gs v54): CAL-CORE 글자 그대로 · 저장 자료 cal 저장·불러오기 · 모닝 브리핑 안에 함께(하루 한 통) · 브리핑 없는 분은 주 1회 · 끄기 링크 · 광고 없음
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
check('일시적 2주택은 확인 전이라 꺼 둠(ok:false·이유 적음)', C.RULES.tmp2.ok === false && /확인/.test(C.RULES.tmp2.why));
check('확인 전 규칙은 어떤 경우에도 일정이 안 생김', !ev.concat(lease, mv, cy).some(e => e.k === 'tmp2'));
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
check('서버 v54 변경 요약 표시', /\* v54 변경 요약 \(/.test(gs) && gs.indexOf('v54 변경 요약') < gs.indexOf('v53 변경 요약'));
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
check('달력 화면: 계산·세금 엔진·공시가격·로그인 부품', /cal-core\.js\?v=1/.test(page) && /tax-engine\.js/.test(page) && /gongsi\.js/.test(page) && /auth\.js/.test(page) && /back\.js\?v=1/.test(page));
check('달력 화면: 예상 재산세는 "참고" 표시 + 계산 근거', /예상 재산세\(참고\)/.test(page) && /공시가격 중간값/.test(page));
check('달력 화면: 금액 입력칸 없음(날짜·종류·주택 수만)', !/type="number"/.test(page) && !/inputmode="numeric"/.test(page));
check('달력 화면: 로그인해야 날짜를 넣음', /AU\.gate\(/.test(page) && /loggedIn\(\)/.test(page));
check('달력 화면: 서비스 이름은 설정에서, 회사 이름·경쟁 앱 이름 없음', /SITE_NAME/.test(page) && !/장대장부동산그룹/.test(page) && !/호갱|직방|아실|리치고|네이버\s?부동산/.test(page));
check('알림 센터: 달력 메일 켜기(prefs.cal)·서버 새 판 확인', /id="calBox"/.test(center) && /P\.cal = \$\('calOn'\)\.checked/.test(center) && /MINE\.cal === 1/.test(center));
check('알림 계산: cal 설정은 직접 켠 경우에만', A.cleanPrefs({}).cal === false && A.cleanPrefs({ cal: true }).cal === true && A.cleanPrefs({ cal: 'y' }).cal === false);
check('내 집 시세 화면에서 달력으로 가는 길', /href="calendar\/"/.test(mine));
check('서비스 워커: 달력 화면·계산 파일', /'\.\/mine\/calendar\/'/.test(sw) && /cal-core\.js\?v=1/.test(sw));
check('공식 출처 주소가 계산 파일에 그대로', ['news.seoul.go.kr/gov/archives/200106', 'news.seoul.go.kr/gov/archives/200082', 'easylaw.go.kr', 'lsJoLnkSeq=1007847519', 'lsJoLnkSeq=1018577211', 'mediahub.seoul.go.kr/archives/2001807', 'lsiSeq=249983'].every(u => read('assets/cal-core.js').includes(u)));
const txt = Object.values(C.RULES).map(x => x.why || '').join(' ') + ev.concat(lease, mv2, cy).map(e => e.t + ' ' + e.s + ' ' + (e.p || '')).join(' ');
check('문구: ~요 말투, 딱딱한 말투·보장 표현 없음', !/습니다|십시오|보장|무조건/.test(txt));

console.log(`\n내 부동산 달력 확인: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
