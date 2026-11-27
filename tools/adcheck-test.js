/* 받은 분양 광고 확인하기 자동 검증 — 실행: node tools/adcheck-test.js </dev/null
   모든 광고 글·현장·단지는 지어낸 예시예요(실제 현장 아님). 자료 모양은 공개 data/ 파일과 같게 만들었어요.
   ① 광고 읽기(금액·면적·조건·문구·호재·시공사·규모·유형) ② 개인정보 지우기 ③ 지역·공고 맞추기 ④ 주변 실거래·전세 ⑤ 잔금 유예·대출(대출 규칙표 값 그대로)
   ⑥ 리포트 판정(가격·실거주/전매·역 거리·호재·미분양·유형·시공사) ⑦ 말투·권유 금지·경쟁사 이름 없음 ⑧ 들어오는 길·같은 화면 조각·개인정보 규칙 ⑨ 광고 상품 안내 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const A = require('../assets/adcheck-core.js');
const R = require('../assets/loan-rules.js');
const P = require('../assets/cy-plan.js');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } }

/* ---------- 지어낸 광고 ---------- */
const AD1 = `(광고) [Web발신]
【가람숲 센트럴파크뷰】 잔여세대 선착순 분양
경기 안산시 단원구 신길동 일원
전용 84㎡ 분양가 4억 9,800만원 → 최대 3천만원 할인!
계약금 10% / 중도금 60% 무이자 / 잔금 30% 2년 유예
실거주 의무 없음! 전매 제한 없음!
신길온천역 도보 5분 초역세권, GTX-B 개통 예정, 초품아
전세가로 내 집 마련
시공 : 해솔건설 / 총 1,024세대 지하 2층~지상 29층 12개동
상담 김민수 실장 010-1234-5678 / 1600-0000
무료거부 080-123-4567`;
const AD2 = `[별빛나루 레지던스] 생활숙박시설 분양
서울 강서구 마곡동 · 마곡나루역 도보 3분
확정 수익 보장! 청약통장 필요 없음 · 주택수 미포함
분양가 3억2천만원 / 계약금 1천만원 정액제
문의 02-123-4567 박지훈 팀장`;
const AD3 = `☆한올빛 오피스텔☆ 34평형 아파텔 특별분양
서울시 송파구 문정동 / 문정역 걸어서 4분
분양가 9억대, 중도금 이자후불, 대출 100% 가능
문의 1588-0000`;
const AD4 = `<푸른들 지역주택조합> 조합원 모집
경기 수원시 장안구 정자동
59㎡ 3억 5천만원대 내 집 마련 · 신분당선 연장 수혜
상담 010 9876 5432`;
const AD5 = `【은하수 하늘채움】 분양 안내
서울 노원구 상계동
84㎡ 분양가 12억 · 할인 분양 5%
실거주 의무 없음, 전매제한 없음, 비규제
노원역 도보 7분 / 동북선 개통 예정 / 명문 학군
시공 다온건설 · 총 640세대`;

/* ① 광고 읽기 */
const x1 = A.parse(AD1);
check('① 현장 이름(괄호 안, [Web발신] 건너뜀)', x1.name === '가람숲 센트럴파크뷰', x1.name);
check('① 유형 아파트(세대 수·분양 글)', x1.type === '아파트', x1.type);
check('① 주소 시·도·시·구·동', x1.addr && x1.addr.sd === '경기도' && x1.addr.a === '안산시' && x1.addr.b === '단원구' && x1.addr.dong === '신길동', x1.addr);
check('① 역·분', x1.station && x1.station.name === '신길온천' && x1.station.min === 5, x1.station);
check('① 면적 84㎡', x1.area && x1.area.m2 === 84);
check('① 분양가 4억 9,800만 원', x1.price && x1.price.v === 49800, x1.price);
check('① 할인 최대 3,000만 원', x1.disc && x1.disc.amt === 3000 && x1.disc.max, x1.disc);
check('① 계약금 10%·중도금 60% 무이자·잔금 30% 2년 유예', x1.pay.dp === 10 && x1.pay.mid === 60 && x1.pay.midFree && x1.pay.defer && x1.pay.defer.pct === 30 && x1.pay.defer.yrs === 2, x1.pay);
check('① 문구: 실거주 없음·전매 없음·전세가로·선착순', x1.claims.noLive && x1.claims.noResale && x1.claims.jeonse && x1.claims.firstCome, x1.claims);
check('① 호재 GTX-B · 학군 초품아', x1.dev.join() === 'GTX-B' && x1.school.join() === '초품아', [x1.dev, x1.school]);
check('① 시공사·세대수·층', x1.builder && x1.builder.name === '해솔건설' && x1.hh === 1024 && x1.floors && x1.floors.top === 29 && x1.dongs === 12, [x1.builder, x1.hh, x1.floors]);
const x2 = A.parse(AD2);
check('① 생활숙박시설 · 확정 수익·통장 불필요·주택 수 미포함', x2.type === '생활숙박시설' && x2.claims.promise && x2.claims.noBank && x2.claims.noCount, [x2.type, x2.claims]);
check('① 3억2천만원 = 32,000 · 계약금 정액 1,000', x2.price && x2.price.v === 32000 && x2.pay.dpAmt === 1000 && x2.pay.flat, [x2.price, x2.pay]);
check('① 이름 별빛나루 레지던스(유형 낱말 남김)', /별빛나루/.test(x2.name), x2.name);
const x3 = A.parse(AD3);
check('① 아파텔 = 오피스텔', x3.type === '오피스텔', x3.type);
check('① 34평형 → 전용 약 84㎡(어림) · 9억대 = 90,000부터', x3.area && x3.area.from === '평형' && x3.area.m2 === 84 && x3.price && x3.price.v === 90000 && x3.price.approx, [x3.area, x3.price]);
check('① 이자 후불·대출 100%', x3.pay.midAfter && x3.claims.loanEasy, [x3.pay, x3.claims]);
check('① 걸어서 4분', x3.station && x3.station.name === '문정' && x3.station.min === 4, x3.station);
const x4 = A.parse(AD4);
check('① 지역주택조합', x4.type === '지역주택조합', x4.type);
check('① 신분당선 호재', x4.dev.indexOf('신분당선') >= 0, x4.dev);
const x5 = A.parse(AD5);
check('① 할인 5% · 비규제 문구 · 명문 학군', x5.disc && x5.disc.pct === 5 && x5.claims.noReg && x5.school.some(s => /학군/.test(s)), [x5.disc, x5.claims, x5.school]);
check('① 동북선 호재', x5.dev.some(d => /동북선/.test(d)), x5.dev);
check('① 빈 글', !A.parse('').raw && A.parse('   ').found.length === 0);

/* 금액 */
[['4억 9,800만원', 49800], ['4억9천', 49000], ['1억2천만', 12000], ['3천만원', 3000], ['49,800만원', 49800], ['500만원', 500], ['5억', 50000], ['12억 5,000만', 125000], ['3.5억', 35000]].forEach(([t, v]) => check(`① 금액 ${t}`, A.money(t) === v, A.money(t)));

/* ② 개인정보 지우기 */
const sc1 = A.scrub(AD1), sc2 = A.scrub(AD2), sc4 = A.scrub(AD4);
check('② 휴대폰·대표번호·수신거부 번호 지움', !/010-1234-5678|1600-0000|080-123-4567/.test(sc1) && (sc1.match(/\[전화번호\]/g) || []).length === 3, sc1.slice(-120));
check('② 담당자 이름 지움(실장·팀장)', !/김민수|박지훈/.test(sc1 + sc2) && /○○○ 실장/.test(sc1) && /○○○ 팀장/.test(sc2));
check('② 띄어 쓴 번호도', !/9876/.test(sc4) && /\[전화번호\]/.test(sc4), sc4);
check('② 이메일', A.scrub('문의 a.b@example.co.kr') === '문의 [이메일]');
check('② 광고 내용은 남김(현장 이름·금액)', /가람숲 센트럴파크뷰/.test(sc1) && /4억 9,800만원/.test(sc1));

/* ③ 지역·공고 맞추기 */
const IX = { dataTo: '202610', price: { from: '200601' }, sido: [{ id: 's00', name: '서울특별시' }, { id: 's08', name: '경기도' }],
  sgg: { '41273': { sido: '경기도', name: '안산시 단원구' }, '41271': { sido: '경기도', name: '안산시 상록구' }, '11500': { sido: '서울특별시', name: '강서구' }, '11710': { sido: '서울특별시', name: '송파구' },
    '11350': { sido: '서울특별시', name: '노원구' }, '41111': { sido: '경기도', name: '수원시 장안구' }, '41113': { sido: '경기도', name: '수원시 권선구' }, '26140': { sido: '부산광역시', name: '서구' }, '11140': { sido: '서울특별시', name: '중구' }, '26110': { sido: '부산광역시', name: '중구' } } };
const pl1 = A.placeOf(x1, IX);
check('③ 안산시 단원구 → 41273·s08·신길동', pl1 && pl1.code === '41273' && pl1.sid === 's08' && pl1.dong === '신길동', pl1);
check('③ 서울 강서구', (A.placeOf(x2, IX) || {}).code === '11500');
check('③ 서울시 송파구', (A.placeOf(x3, IX) || {}).code === '11710');
check('③ 수원시 장안구', (A.placeOf(x4, IX) || {}).code === '41111');
const many = A.placeOf(A.parse('중구 신당동 오피스텔 분양'), IX);
check('③ 시·도 없는 같은 이름 구(중구)는 고르게(many)', many && many.many && many.many.length === 2, many);
check('③ 주소 없으면 null', A.placeOf(A.parse('좋은 아파트 분양'), IX) === null);
const NOTI = [
  { id: 'apt-1', no: '2099000001', k: '아파트', n: '가람숲 센트럴파크뷰', sd: '경기도', g: '41273', gn: '안산시 단원구', dg: '신길동', ad: '경기도 안산시 단원구 신길동 1', pb: '20260310', hh: 1024, bld: '해솔건설(주)', dev: '(주)가람개발', f: [], ty: [['084.9800A', 84.98, 500, 49800], ['059.9000A', 59.9, 300, 36000]], xy: [126.7905, 37.3320], u: 'https://www.applyhome.co.kr/x?1' },
  { id: 'apt-2', no: '2099000002', k: '아파트', n: '은하수 하늘채움', sd: '서울특별시', g: '11350', gn: '노원구', dg: '상계동', ad: '서울특별시 노원구 상계동 2', pb: '20261101', hh: 640, bld: '다온건설(주)', dev: '(주)은하', f: ['투기과열지구', '조정대상지역'], ty: [['084.9000A', 84.9, 200, 120000]], xy: [127.0610, 37.6560], u: 'https://www.applyhome.co.kr/x?2' },
  { id: 'apt-3', no: '2099000003', k: '아파트', n: '신길 하늘마루', sd: '경기도', g: '41273', gn: '안산시 단원구', dg: '신길동', pb: '20260101', hh: 300, bld: '다른건설', f: [], ty: [['084.0000A', 84, 100, 47000]] }
];
const m1 = A.matchNotice(x1, NOTI, pl1);
check('③ 같은 이름·지역·세대수 공고 찾음', m1 && m1.row.no === '2099000001', m1 && [m1.row.n, m1.score]);
check('③ 이름이 다르면 같은 지역이라도 안 찾음', A.matchNotice(A.parse('【해오름 리버뷰】 분양 경기 안산시 단원구 신길동 84㎡'), NOTI, pl1) === null);
check('③ 다른 지역 같은 이름은 낮게(지역 다르면 이름 거의 같아야)', A.matchNotice(Object.assign({}, x1), NOTI, { code: '11500' }) !== null && A.matchNotice(A.parse('【가람숲 파크】 분양 서울 강서구'), NOTI, { code: '11500' }) === null);
const m5 = A.matchNotice(x5, NOTI, A.placeOf(x5, IX));
check('③ 노원 공고 찾음', m5 && m5.row.no === '2099000002');

/* ④ 주변 실거래 · 전세 — price/{구}.json units 모양 */
const ser = (v, n) => Array.from({ length: 36 }, (_, i) => (i >= 36 - n ? v : 0));
const cnt = n => String.fromCharCode(48).repeat(24) + String.fromCharCode(48 + n).repeat(12);
const U = (dong, name, band, area, ppy, n, f) => ['41273', dong, name, band, area, n * 12, ser(ppy, 12), cnt(n), '1', 1, [], [], { f }];
const UNITS = [U('신길동', '신길새빛', '84㎡대', 84.9, 2400, 3, '201901'), U('신길동', '신길한빛', '84㎡대', 84.7, 2600, 2, '202003'), U('신길동', '신길푸른', '84㎡대', 84.5, 2500, 2, '202106'),
  U('신길동', '신길옛집', '84㎡대', 84.6, 1500, 5, '200601'), U('고잔동', '고잔새집', '84㎡대', 84.9, 3200, 4, '202201'), U('고잔동', '고잔신축', '84㎡대', 84.9, 3000, 3, '202305'),
  U('신길동', '신길작은', '59㎡대', 59.9, 2700, 4, '202001'), U('선부동', '선부오래', '84㎡대', 84.9, 1800, 6, '199001')];
const nb = A.nearPrice(UNITS, { dong: '신길동', area: 84, dataTo: '202610', from: '200601' });
check('④ 같은 동 첫 거래 10년 이내 84㎡대 3곳(자료 시작 달 단지는 빼요)', !nb.lack && nb.scope === '같은 동(신길동)' && nb.apts === 3 && nb.med === 2500 && nb.n === 84, nb);
check('④ 단지 목록·사분위', nb.list.length === 3 && nb.q[0] <= nb.q[1] && nb.q[1] <= nb.q[2]);
const nb2 = A.nearPrice(UNITS, { dong: '고잔동', area: 84, dataTo: '202610', from: '200601' });
check('④ 같은 동이 모자라면 같은 구로 넓힘', !nb2.lack && nb2.scope === '같은 구' && nb2.apts === 5, nb2);
const nb3 = A.nearPrice(UNITS, { dong: '신길동', area: 120, dataTo: '202610', from: '200601' });
check('④ 비교 자료 부족이면 lack(숫자 만들지 않음)', nb3.lack && !nb3.med, nb3);
const JE = A.nearJeonse([{ name: 'a', jppy: 1500, at: '202610' }, { name: 'b', jppy: 1600, at: '202609' }, { name: 'c', jppy: 1700, at: '202610' }]);
check('④ 전세 중간값', JE.med === 1600 && JE.apts === 3 && JE.at === '202610', JE);
check('④ 전세 2곳뿐이면 lack', A.nearJeonse([{ jppy: 1 }, { jppy: 2 }]).lack);

/* ⑤ 잔금 유예 · 대출(대출 규칙표 값 그대로) */
const D1 = A.deferCalc({ price: 46800, dp: 10, mid: 60, defer: { pct: 30, yrs: 2 }, code: '41273', near: null }, R);
check('⑤ 비규제 수도권 · 무주택 LTV = 규칙표 값', D1.g === 'capfree' && D1.ltv === R.ltvOf('capfree', 'none'), D1);
check('⑤ 미룬 잔금 = 분양가 × 30%', D1.lump === Math.round(46800 * 0.3));
check('⑤ 최대 대출 = min(분양가 × LTV, 가격대 최대)', D1.maxLoan === Math.round(Math.min(46800 * R.ltvOf('capfree', 'none'), R.capOf(46800, 'capfree'))), D1.maxLoan);
check('⑤ 중도금 대출 60%·남는 여유', D1.midLoan === 28080 && D1.room === Math.max(0, D1.maxLoan - 28080));
const D2 = A.deferCalc({ price: 120000, dp: 10, mid: 60, defer: { pct: 20, yrs: 3 }, code: '11350', near: 100000 }, R);
check('⑤ 서울(규제지역) · 시세가 낮으면 시세로 담보 · 부족액', D2.g === 'reg' && D2.base === 100000 && D2.maxLoan === Math.round(Math.min(100000 * R.ltvOf('reg', 'none'), R.capOf(100000, 'reg'))) && D2.short === 72000 - D2.maxLoan && D2.below > 0, D2);
check('⑤ 분양가 없으면 계산 안 함', A.deferCalc({ price: 0, defer: { pct: 30, yrs: 2 } }, R) === null);

/* ⑥ 리포트 */
const POI = { at: { st: '2026-11-27', sc: '2026-11-21' }, st: [['신길온천', 126.7950, 37.3380], ['노원', 127.0615, 37.6550], ['문정', 127.1224, 37.4858]], sc: [['신길중학교', 126.7915, 37.3330]] };
const DM = { checked: '2026-11-20', items: [
  { id: 'gtxb', type: 'line', name: 'GTX-B', short: 'GTX-B', stage: '공사 중', stage_at: '2024-03', stage_src: { org: '국토교통부', title: '착공', official: true }, path: [[126.70, 37.30], [126.80, 37.335], [127.20, 37.60]], due: [{ say: '2030년 개통 목표' }] },
  { id: 'dongbuk', type: 'line', name: '동북선 경전철', short: '동북선', stage: '공사 중', stage_at: '2020-02', stage_src: { org: '서울시', title: '공사', official: true }, path: [[127.061, 37.656], [127.07, 37.66]], due: [{ say: '2027년 개통 목표' }] },
  { id: 'zone1', type: 'area', name: '신길 가상 재정비구역', stage: '구역 지정', at: [126.7910, 37.3330] }] };
const ctx1 = { today: '2026-11-27', place: pl1, notice: null, R, rules: P.rules, dataTo: '202610', near: nb, poi: POI, dm: DM, uns: { now: 120, y1: 40, grp: 1, ym: '202609' }, xy: [126.7900, 37.3320], xyFrom: 'dong',
  jeonse: JE, unsold: [{ g: '41273', ar: [['84', 84, 1, 100, 12], ['59', 59, 0, 50, 3]] }] };
const r1 = A.build(x1, ctx1), I = id => r1.items.find(i => i.id === id) || {};
check('⑥ 공고 못 찾음 = 주의(아파트)', I('notice').lv === 'y');
check('⑥ 가격: 할인 뒤 평당가 vs 같은 동 중간값', I('price').lv === 'g' && /1,842만 원 vs 같은 동\(신길동\) 첫 거래 10년 이내 단지 중간값 2,500만 원/.test(I('price').s), I('price'));
check('⑥ 가격 근거에 단지 이름·기준 달', I('price').why.some(w => /신길새빛\(신길동\)/.test(w)) && I('price').why.some(w => /2026년 10월 실거래까지/.test(w)));
check('⑥ 할인: 공고 없으면 확인 필요 + 최대 할인 설명', I('disc').lv === 'n' && I('disc').why.some(w => /「최대」/.test(w)));
check('⑥ 전세가로: 주변 전세 vs 분양가 차이', I('jeonse').lv === 'y' && /주변 같은 면적 전세 약/.test(I('jeonse').s), I('jeonse'));
check('⑥ 잔금 유예: 금액·대출·가정', I('pay').lv === 'y' && /2년 뒤 1억 4,040만 원/.test(I('pay').v) && I('pay').why.some(w => /계산 가정: 무주택/.test(w)) && I('pay').why.some(w => /중도금 무이자/.test(w)), I('pay'));
check('⑥ 실거주·전매: 비규제 수도권 전매 6개월 → 광고 문구와 다를 수 있어요', I('rule').lv === 'y' && I('rule').v === '광고 문구와 다를 수 있어요' && /전매제한/.test(I('rule').s), I('rule'));
check('⑥ 역 거리: 동 가운데 기준은 참고용(확인 필요)', I('station').lv === 'n' && /신길온천역/.test(I('station').v) && /동 가운데/.test(I('station').s), I('station'));
check('⑥ 호재: GTX-B 공식 자료·단계, 초품아 확인되지 않은 내용', I('dev').why.some(w => /공식 자료 「GTX-B」: 지금 단계 공사 중/.test(w)) && I('dev').why.some(w => /「초품아」 → 확인되지 않은 내용/.test(w)) && I('dev').lv === 'n', I('dev').why);
check('⑥ 호재: 광고에 없는 주변 공식 사업도 참고로', I('dev').why.some(w => /신길 가상 재정비구역/.test(w)));
check('⑥ 미분양: 1년 새 크게 늘면 주의 · 경기 미분양 현장 수 · 선착순 설명', I('uns').lv === 'y' && I('uns').why.some(w => /미분양 현장 1곳, 남은 집 15호/.test(w)) && I('uns').why.some(w => /선착순/.test(w)), I('uns'));
check('⑥ 시공사·규모: 공고 없으면 확인 못 함', I('build').lv === 'n');
check('⑥ 결론: 확인한 사실·확인할 점 개수', /^확인한 사실 \d+가지, 확인할 점 \d+가지가 있어요$/.test(r1.head) && r1.lv === 'y', r1.head);
check('⑥ 다음 할 일: 공고·계약서·대출·분양보증·개발 원문·실거래', ['notice', 'contract', 'loan', 'hug', 'eum', 'map'].every(k => r1.todo.some(t => t.id === k)), r1.todo.map(t => t.id));
/* 공고를 찾은 경우 */
const ctx1b = Object.assign({}, ctx1, { notice: NOTI[0], xy: NOTI[0].xy, xyFrom: 'notice' });
const r1b = A.build(x1, ctx1b), Ib = id => r1b.items.find(i => i.id === id) || {};
check('⑥ 공고 찾음 = 괜찮아요 + 공고 링크', Ib('notice').lv === 'g' && r1b.todo[0].href === NOTI[0].u);
check('⑥ 할인 전 금액 = 공고 분양가면 괜찮아요', Ib('disc').lv === 'g', Ib('disc'));
check('⑥ 시공사·세대수 공고와 같음', Ib('build').lv === 'g', Ib('build').why);
check('⑥ 역 거리: 공고 좌표에서 직선·분당 67m', Ib('station').lv === 'y' && new RegExp('걸어서 약 ' + Math.round(A.distM(NOTI[0].xy, [126.7950, 37.3380]) / 67) + '분').test(Ib('station').v), Ib('station'));
check('⑥ 미분양: 공고 뒤 개월 수 + 할인·선착순 경향(중립)', Ib('uns').why.some(w => /약 8개월/.test(w)) && Ib('uns').why.some(w => /일반적인 경향/.test(w)), Ib('uns').why);
/* 서울 규제지역 · 공고에 분양가상한제 없음 */
const pl5 = A.placeOf(x5, IX), r5 = A.build(x5, { today: '2026-11-27', place: pl5, notice: NOTI[1], R, rules: P.rules, xy: NOTI[1].xy, xyFrom: 'notice', poi: POI, dm: DM }), I5 = id => r5.items.find(i => i.id === id) || {};
check('⑥ 서울 투기과열지구: 전매 3년 → 광고 「전매제한 없음」과 다름', I5('rule').lv === 'y' && I5('rule').why.some(w => /전매제한 3년/.test(w)), I5('rule').why);
check('⑥ 비규제 문구 → 서울은 규제지역(광고 문구와 다를 수 있어요)', I5('etc').lv === 'y' && I5('etc').why.some(w => /규제지역\(투기과열지구·조정대상지역\)이에요 — 광고 문구와 다를 수 있어요/.test(w)), I5('etc'));
check('⑥ 동북선: 공식 자료 공사 중', I5('dev').why.some(w => /동북선 경전철/.test(w)));
check('⑥ 학군: 확인되지 않은 내용', I5('dev').why.some(w => /명문 학군」 → 확인되지 않은 내용/.test(w)));
check('⑥ 할인 5%: 공고 분양가 12억에서 할인', /할인 6,000만 원을 빼면 11억 4,000만 원/.test(I5('price').why ? I5('price').why[0] : '') || I5('price').lv === 'n', I5('price'));
/* 분양가상한제 공고 — 실거주 의무 */
const N6 = Object.assign({}, NOTI[1], { f: ['분양가상한제', '투기과열지구'], dev: '서울주택도시공사' });
const r6 = A.build(A.parse('【은하수 하늘채움】 분양 서울 노원구 상계동 실거주 의무 없음'), { place: pl5, notice: N6, R, rules: P.rules });
check('⑥ 분양가상한제 수도권: 실거주 의무 있음 → 다를 수 있어요', (r6.items.find(i => i.id === 'rule') || {}).lv === 'y' && /실거주 의무/.test((r6.items.find(i => i.id === 'rule') || {}).s));
/* 유형 */
const r2 = A.build(x2, { place: A.placeOf(x2, IX), R, rules: P.rules }), I2 = id => r2.items.find(i => i.id === id) || {};
check('⑥ 생활숙박시설: 위험 + 이행강제금 설명 + 「주택 수」 문구 안내', I2('type').lv === 'r' && I2('type').why.some(w => /이행강제금/.test(w)) && I2('type').why.some(w => /청약통장 필요 없음/.test(w)), I2('type'));
check('⑥ 생활숙박시설: 공고 없음은 확인 필요(청약홈 대상 아님)', I2('notice').lv === 'n');
check('⑥ 확정 수익 문구 → 계약서 확인', I2('etc').lv === 'y' && I2('etc').why.some(w => /확정 수익/.test(w)));
const r3 = A.build(x3, { place: A.placeOf(x3, IX), R, rules: P.rules }), I3 = id => r3.items.find(i => i.id === id) || {};
check('⑥ 오피스텔: 청약통장·주택 수·취득세 4.6%·비주택 대출', I3('type').lv === 'y' && ['청약통장', '주택 수', '4.6%', '비주택'].every(k => I3('type').why.join(' ').indexOf(k) >= 0));
check('⑥ 오피스텔: 중도금 이자 후불 = 주의', I3('pay').lv === 'y' && /입주/.test(I3('pay').s));
check('⑥ 오피스텔: 다음 할 일 세움터', r3.todo.some(t => t.id === 'eais'));
check('⑥ 대출 100% 문구 → 지역 LTV 안내', I3('etc').why.some(w => /LTV 40%/.test(w)), I3('etc').why);
const r4 = A.build(x4, { place: A.placeOf(x4, IX), R, rules: P.rules });
check('⑥ 지역주택조합: 위험 + 조합 가입 설명', (r4.items.find(i => i.id === 'type') || {}).lv === 'r' && /조합 가입/.test((r4.items.find(i => i.id === 'type') || {}).s));
/* 분양가 없음 → 직접 넣기 안내, 넣으면 비교 */
const x7 = A.parse('【달빛정원】 분양 경기 안산시 단원구 신길동 전용 84㎡ 잔금 30% 2년 유예');
const r7 = A.build(x7, Object.assign({}, ctx1, { jeonse: null }));
check('⑥ 분양가 못 찾으면 숫자 만들지 않고 직접 넣기(ask)', (r7.items.find(i => i.id === 'price') || {}).ask === 'price' && (r7.items.find(i => i.id === 'pay') || {}).v === '분양가 필요');
const r7b = A.build(x7, Object.assign({}, ctx1, { userPrice: 52000 }));
check('⑥ 직접 넣은 분양가로 비교·잔금 계산', /직접 넣은 분양가/.test((r7b.items.find(i => i.id === 'price') || { why: [''] }).why[0]) && /1억 5,600만 원/.test((r7b.items.find(i => i.id === 'pay') || {}).v));
/* 가격 판정 경계 */
const pr = ppy => A.build(A.parse(`【시험】 분양 경기 안산시 단원구 신길동 전용 84㎡ 분양가 ${Math.round(ppy * 84 / 3.3058)}만원`), { place: pl1, near: nb, R });
check('⑥ 가격 +5% 이하 괜찮아요 · +5~20% 주의 · 20% 넘게 높음 위험', pr(2600).items.find(i => i.id === 'price').lv === 'g' && pr(2800).items.find(i => i.id === 'price').lv === 'y' && pr(3200).items.find(i => i.id === 'price').lv === 'r');
/* 기존 분양가 → 지금 금액 */
const x8 = A.parse('【시험2】 분양 경기 안산시 단원구 신길동 전용 84㎡ 기존 분양가 5억 → 분양가 4억 6천만원');
const f8 = A.build(x8, { place: pl1, near: nb, R }).facts;
check('⑥ 「기존 분양가 → 지금 분양가」는 지금 금액이 할인 뒤', f8.price === 50000 && f8.after === 46000 && f8.disc === 4000, f8);

/* ⑦ 말투·권유 금지·경쟁사 이름 없음 */
const ALL = [r1, r1b, r2, r3, r4, r5, r6, r7, r7b];
const TXT = JSON.stringify(ALL);
check('⑦ 사라·말라·추천 같은 권유 없음', !A.BAD.test(TXT), TXT.match(A.BAD));
check('⑦ 화면 말투(~습니다 없음)', !/습니다/.test(TXT), TXT.match(/[가-힣]*습니다/));
check('⑦ NaN·undefined·Infinity 없음', !/NaN|undefined|Infinity|null원/.test(TXT), TXT.match(/.{40}(NaN|undefined|Infinity).{10}/));
check('⑦ 광고주·현장 비방 낱말 없음(사기·허위·불법 단정)', !/(사기 분양|허위 광고예요|불법이에요|속이|믿지 마)/.test(TXT));
check('⑦ 경쟁 서비스 이름 없음', !/(호갱노노|직방|아실|리치고|네이버\s*부동산|부동산\s*지인|다방|KB부동산)/.test(TXT + read('assets/adcheck-core.js') + read('assets/adcheck-view.js') + read('bunyang/check/index.html')));
check('⑦ 리포트에 전화번호·담당자 이름 없음', !/010-|1600-|김민수|박지훈/.test(TXT));
check('⑦ 공유 글: 항목·신호만(금액·현장·번호 없음)', (() => { const t = A.shareText(r1b); return /^받은 분양 광고 확인 결과 — /.test(t) && !/\d{3,}|가람숲|억|만 원/.test(t); })(), A.shareText(r1b));
check('⑦ 판정 이유 문장마다 출처 또는 기준(가격·잔금·실거주·호재)', ['price', 'pay', 'rule', 'dev'].every(id => { const i = r1b.items.find(x => x.id === id); return i && i.src && i.src.length; }));
check('⑦ 결과 아래 정보 제공 문구(권하거나 말리지 않아요)', /권하거나 말리지 않아요/.test(r1.note));

/* ⑧ 들어오는 길·같은 화면 조각·개인정보 */
const pg = read('bunyang/check/index.html'), vw = read('assets/adcheck-view.js'), gj = read('assets/guide.js'), gc = read('assets/guide-core.js'), scj = JSON.parse(read('assets/guide/scenarios.json'));
check('⑧ 화면: 같은 조각 mount · 진단 틀 · 계산 파일', /JDJ_ADCHKV\.mount/.test(pg) && /adcheck-core\.js\?v=1/.test(pg) && /adcheck-view\.js\?v=1/.test(pg) && /diag\.js\?v=1/.test(pg) && /cy-plan\.js\?v=4/.test(pg) && /loan-rules\.js\?v=4/.test(pg));
check('⑧ 길잡이: ad_check 시나리오 → 같은 조각(adcheck-view) mount', scj.sc.some(s => s.id === 'ad_check' && s.solve === 'adCheck' && s.cat === 'cy' && (s.ask || []).length === 0) && /r\.mount === 'adcheck'/.test(gj) && /adcheck: 'assets\/adcheck-view\.js\?v=1'/.test(gj) && /JDJ_ADCHKV\.mount\(el\.querySelector\('#gAdc'\)/.test(gj) && /S\.adCheck = /.test(gc));
check('⑧ 길잡이 질문 「분양 문자 받았는데 괜찮은 조건이야?」', (() => { const G = require('../assets/guide-core.js'); const r = G.classify('분양 문자 받았는데 괜찮은 조건이야?', scj, { sgg: [], sido: [] }); return r.top && r.top.id === 'ad_check'; })());
check('⑧ 첫 화면 분양·청약 묶음 · 분양 화면 · 청약 공고 목록 · 전체 기능 · 찾기 칸 · 기능 색인 · 사이트맵', /href="bunyang\/check\/" data-track="home_svc_adcheck"/.test(read('index.html')) && /href="check\/" data-track="bunyang_to_adcheck"/.test(read('bunyang/index.html'))
  && /bunyang\/check\/" data-track="cy_to_adcheck"/.test(read('assets/cy-list.js')) && /href="\.\.\/bunyang\/check\/" data-track="all_adcheck"/.test(read('all/index.html')) && /path: 'bunyang\/check\/'/.test(read('assets/ask-core.js'))
  && JSON.parse(read('assets/guide/features.json')).items.some(i => i.url === 'bunyang/check/') && /bunyang\/check\/<\/loc>/.test(read('sitemaps/pages.xml')));
check('⑧ 찾기 칸: 「분양 문자 받았어요」 → 받은 분양 광고 확인하기', (() => { const K = require('../assets/ask-core.js'); const t = K.topic ? K.topic('분양 문자 받았어요 괜찮나', { sgg: {}, sido: [] }) : null; return !K.topic || (t && t.url && /bunyang\/check\//.test(t.url)) || (t && t.id === 'adchk'); })());
check('⑧ 서비스 워커에 화면·파일', /'\.\/bunyang\/check\/'/.test(read('sw.js')) && /adcheck-core\.js\?v=1/.test(read('sw.js')) && /adcheck-view\.js\?v=1/.test(read('sw.js')));
check('⑧ 개인정보: 광고 글을 기기에 남기지 않음(localStorage·sessionStorage 없음)·서버로 보내지 않음(POST 없음)', !/localStorage|sessionStorage/.test(vw) && !/method:\s*'POST'|sendBeacon|XMLHttpRequest/.test(vw) && !/localStorage|sessionStorage|fetch\(/.test(read('assets/adcheck-core.js')));
check('⑧ 개인정보: 진단 체크 상태도 남기지 않음(key 빈 값)', /key: ''/.test(vw));
check('⑧ 집계는 단추 이름만(data-track) — 글 내용 없음', !/jdjStat\(|gtag\(/.test(vw) && /data-track="\$\{tr\}_run"/.test(vw));
check('⑧ 오류 기록은 개인정보 지운 뒤에만', /JDJ_ADCHK\.scrub\(/.test(vw) && !/console\.(log|warn|error)\((?!'\[adcheck\]')/.test(vw));
check('⑧ 캡처 글자 읽기는 누를 때만 이 기기 브라우저에서(tesseract.js) · 실패하면 붙여 넣기 안내', /Tesseract\.recognize/.test(vw) && /사진은 이 기기 밖으로 보내지 않아요/.test(vw) && /복사한 뒤 붙여 넣어 주세요/.test(vw));
check('⑧ 예시 광고는 지어낸 현장이라고 표시', /예시로 지어낸 광고예요\(실제 현장 아님\)/.test(vw));
check('⑧ 화면 문구에 회사명 대신 서비스명', !/장대장부동산그룹/.test(pg + vw));

/* ⑨ 광고 상품 안내 */
const ad = read('ad/index.html');
check('⑨ 광고 상품: ‘집예보 확인을 마친 분양 정보’ 배지(준비 중) · 추천·보증 아님', /id="p-verified"/.test(ad) && /‘집예보 확인을 마친 분양 정보’ 배지<\/h3><\/div><span class="st soon">준비 중/.test(ad) && /추천하거나 가격이 적정하다고 보증하는 표시가 아니에요/.test(ad));
check('⑨ 광고 상품: 관심 분양 소식(광고 수신 동의자만·하루 한 번·준비 중)', /id="p-briefnews"/.test(ad) && /광고성 정보 수신에 따로 동의한 분에게만/.test(ad) && /하루 한 번 원칙/.test(ad) && /모닝 브리핑 관심 분양 소식<\/h3><\/div><span class="st soon">준비 중/.test(ad));
check('⑨ 단가표에도 두 상품(준비 중)', /<b>‘집예보 확인을 마친 분양 정보’ 배지<\/b><\/td><td data-l="상태"><span><span class="st soon">준비 중/.test(ad) && /<b>모닝 브리핑 관심 분양 소식<\/b><\/td><td data-l="상태"><span><span class="st soon">준비 중/.test(ad));

console.log(`\n받은 분양 광고 확인하기: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
