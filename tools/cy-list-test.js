/* 청약 공고 목록(/cy/) 자동 검증 — 실행: node tools/cy-list-test.js
   상태·D-day·마감 임박 순·달력 파일(.ics)·달력 칸·LH 자료 모양을 손으로 센 날짜와 대조한다(오늘 = 2026-11-26). */
const L = require('../assets/cy-list.js');
const fs = require('fs'), path = require('path');
const rows = [];
const check = (name, got, want) => rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want });
const T = '20261126';
const N = { no: '2026000505', n: '경희궁 에피트', sd: '서울특별시', g: '종로구', k: '민영', pb: '20261113', sp: ['20261125', '20261125'], r1: ['20261126', '20261127'], rc: ['20261125', '20261130'], pw: '20261204', ct: ['20261215', '20261217'], hh: 134,
  ty: [['039.9342', 39.93, 5, 0, 118241], ['084.9794A', 84.98, 25, 28, 257484]], u: 'https://www.applyhome.co.kr/x' };

/* 1. 상태: 접수 11/25~11/30, 발표 12/4, 계약 12/15~17 */
check('접수 시작 전날 11/24 → 접수 예정', L.stOf(N, '20261124'), 'pre');
check('11/26 → 접수 중', L.stOf(N, T), 'on');
check('접수 마지막 날 11/30 → 접수 중', L.stOf(N, '20261130'), 'on');
check('12/1 → 발표 대기', L.stOf(N, '20261201'), 'wait');
check('발표일 12/4 → 발표 대기', L.stOf(N, '20261204'), 'wait');
check('12/5 → 계약', L.stOf(N, '20261205'), 'ct');
check('계약 끝 다음 날 12/18 → 마감', L.stOf(N, '20261218'), 'done');
check('계약일 모르면 발표 뒤 바로 마감(날짜를 짐작하지 않음)', L.stOf(Object.assign({}, N, { ct: [] }), '20261205'), 'done');
check('날짜 형식 2026-11-26도 같게', L.stOf(N, '2026-11-26'), 'on');

/* 2. D-day */
check('11/24: 접수 시작 D-1', L.dday(N, '20261124').txt, '접수 시작 D-1');
check('11/26: 마감 D-4(11/30)', L.dday(N, T).txt, '마감 D-4');
check('11/30: 오늘 접수 마감', L.dday(N, '20261130').txt, '오늘 접수 마감');
check('12/1: 발표 D-3', L.dday(N, '20261201').txt, '발표 D-3');
check('12/10: 계약 시작 D-5', L.dday(N, '20261210').txt, '계약 시작 D-5');
check('12/16: 계약 마감 D-1', L.dday(N, '20261216').txt, '계약 마감 D-1');
check('12월 31일을 넘는 날짜 계산(12/28 → 1/2 = D-5)', L.dday({ sp: [], rc: ['20270102', '20270104'] }, '20261228').txt, '접수 시작 D-5');

/* 3. 마감 임박 순: 접수 중(남은 날 적은 순) → 접수 예정 → 발표 대기 → 계약 → 마감 */
const R = [
  { no: 'a', n: '가', rc: ['20261201', '20261203'], pb: '20261120' },         // 예정 D-5
  { no: 'b', n: '나', rc: ['20261120', '20261127'], pb: '20261110' },         // 접수 중 D-1
  { no: 'c', n: '다', rc: ['20261110', '20261115'], pw: '20261128', pb: '20261101' },   // 발표 대기
  { no: 'd', n: '라', rc: ['20261125', '20261130'], pb: '20261118' },         // 접수 중 D-4
  { no: 'e', n: '마', rc: ['20261001', '20261005'], pw: '20261010', pb: '20260925' }    // 마감
];
check('마감 임박 순', L.sortRows(R, 'due', T).map(x => x.no), ['b', 'd', 'a', 'c', 'e']);
check('최신 공고 순(공고일 늦은 순)', L.sortRows(R, 'new', T).map(x => x.no), ['a', 'd', 'b', 'c', 'e']);

/* 4. 분양가 범위·주변 신축 비교 문장 */
check('분양가 범위 = 주택형 최고가의 최저~최고(만원)', L.priceRange(N), { lo: 118241, hi: 257484 });
check('주택형 금액 없으면 숨김', L.priceRange({ ty: [['x', 59, 1, 0, null]] }), null);
check('주변 신축 비교: 중간 구간 문장', L.nearTxt({ bands: [{ b: 1, ppy: 5200, tier: 1, scope: '반경 1km', n: 34 }] }).t, '60~85㎡ 3.3㎡당 5,200만 원 · 주변 신축 거래(반경 1km 34건) 대비 중간 구간에 가까워요');
check('토지임대부는 비교하지 않음', L.nearTxt({ bands: [{ b: 0, lease: true }] }).tier, null);
check('분석 자료 없으면 숨김', L.nearTxt(undefined), null);

/* 5. 달력 파일(.ics) */
const ev = L.events(N);
check('일정 5개: 특별공급·1순위 해당·1순위 기타·발표·계약', ev.map(e => e.k), ['sp', 'r1', 'r1e', 'pw', 'ct']);
const I = L.ics(N, { now: '20261126', url: 'https://example.org/cy/2026000505/' });
check('.ics 시작·끝', [I.startsWith('BEGIN:VCALENDAR\r\n'), I.endsWith('END:VCALENDAR\r\n')], [true, true]);
check('하루 종일 일정: 계약 12/15~17 → DTEND 12/18(다음 날, RFC 5545)', /DTSTART;VALUE=DATE:20261215\r\nDTEND;VALUE=DATE:20261218/.test(I), true);
check('특별공급 하루 → DTEND 다음 날', /DTSTART;VALUE=DATE:20261125\r\nDTEND;VALUE=DATE:20261126/.test(I), true);
check('일정 이름에 단지명·종류', /SUMMARY:\[청약\] 경희궁 에피트 당첨자 발표/.test(I), true);
check('쉼표·세미콜론 이스케이프', /SUMMARY:\[청약\] A\\, B\\; C 당첨자 발표/.test(L.ics({ no: 'z', n: 'A, B; C', pw: '20261204' })), true);
check('VEVENT 5개 · 알림(전날 오전 9시 = 0시 기준 15시간 전)', [(I.match(/BEGIN:VEVENT/g) || []).length, /TRIGGER:-PT15H/.test(I)], [5, true]);
check('줄바꿈은 CRLF', /[^\r]\n/.test(I), false);
check('UID 공고번호로 고정(다시 넣어도 겹치지 않음)', /UID:2026000505-pw@jipyebo/.test(I), true);
check('12월 31일 하루 일정 → DTEND 다음 해 1월 1일', /DTEND;VALUE=DATE:20270101/.test(L.ics({ no: 'y', n: 'Y', pw: '20261231' })), true);

/* 6. 달력 칸 */
const W = L.monthGrid([N], 2026, 12);
check('2026년 12월: 첫 칸 11/29(일)', W[0][0].d, '20261129');
check('12월 4일 칸에 발표', W[0].find(c => c.d === '20261204').ev.map(e => e.k), ['pw']);
check('계약 12/15~17 사흘 모두 표시', ['20261215', '20261216', '20261217'].map(d => W.flat().find(c => c.d === d).ev.length), [1, 1, 1]);
check('2026년 12월은 5주', W.length, 5);

/* 7. LH 공고 자료 모양(활용신청 뒤 엔진이 data/lh/notices.json 으로) */
const LH = L.fromLH({ rows: [{ id: '0000060789', n: '화성태안3 A-2 행복주택', sd: '경기도', g: '화성시', kind: '행복주택', pb: '20261120', rc: ['20261201', '20261203'], pw: '20270115', u: 'https://apply.lh.or.kr/x' }, { id: '7', n: 'LH 분양', kind: '공공분양' }, { n: '아이디 없음' }] });
check('LH 행 2개(아이디 없는 행 뺌)', LH.length, 2);
check('행복주택 → 공공임대', [LH[0].rent, LH[0].k, LH[0].no], [true, '공공임대', 'lh-0000060789']);
check('공공분양 → LH 공공분양', [LH[1].rent, LH[1].k], [false, 'LH 공공분양']);
check('LH 공고도 같은 상태 판정', L.stOf(LH[0], T), 'pre');
check('LH 켬(활용신청 승인·실제 응답 확인 2026-11-27)', L.LH_ENABLED, true);

/* 8. 화면 */
const H = fs.readFileSync(path.join(__dirname, '../cy/index.html'), 'utf8');
check('/cy/ 화면: cy-list 최신 번호·자리·정적 표(자바스크립트 없이도 읽힘)', [/cy-list\.js\?v=3/.test(H), /cy-list\.css\?v=1/.test(H), /id="cyList"/.test(H), /<table>/.test(H)], [true, true, true, true]);
const C = L.card(N, T, {});
check('카드: 상태·D-day·분양가·달력 단추·자세히 링크', [/접수 중/.test(C), /마감 D-4/.test(C), /11억 8,241만~25억 7,484만원/.test(C), /data-ics="2026000505"/.test(C), /href="2026000505\/"/.test(C)], [true, true, true, true, true]);
check('카드 문구에 투자 권유 표현 없음', /사세요|투자하세요|강력 추천|무조건/.test(C), false);

const bad = rows.filter(x => !x.ok);
rows.forEach(x => console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : `  → 결과 ${JSON.stringify(x.got)} / 기대 ${JSON.stringify(x.want)}`}`));
console.log(`\n청약 공고 목록: ${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
