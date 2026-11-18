/* 세금 계산 엔진 자동 검증 — 실행: node tools/tax-test.js
   기대값은 소득세법·지방세법 조문의 계산식과 국세청이 안내하는 세액 계산 흐름
   (양도차익 → 고가주택 안분 → 장기보유특별공제 → 기본공제 250만 → 세율·누진공제 → 지방소득세 10%)에 따라 손으로 계산한 값이다.
   (국세청 누리집 nts.go.kr 계산 사례 원문은 이 작업 환경에서 접속이 막혀 원문 숫자 대조는 하지 못함 — 운영자 확인 필요) */
const T = require('../tax/tax-engine.js');
const A = require('../tax/adjusted-areas.js');
const E = 100000000, M = 10000;
const rows = [];
function check(name, got, want, basis) {
  const ok = got === want;
  rows.push({ ok, name, got, want, basis });
}
const cg = o => T.calcCGT(Object.assign({ expenses: 0, residMonths: 0, houses: 1, acqAdj: false, saleAdj: false, tempTwo: null }, o));

// 1. 일반 과세(장특공 없음): 양도 5억, 취득 4억, 필요경비 1,000만, 2주택·비조정
let r = cg({ acqDate: '2024-06-01', acqPrice: 4 * E, saleDate: '2026-12-01', salePrice: 5 * E, expenses: 1000 * M, houses: 2 });
check('일반 과세 24% 구간 (과표 8,750만)', r.tax, 15240000, '8,750만×24%−576만 = 1,524만 (제55조)');
check('  └ 지방소득세 10%', r.local, 1524000, '산출세액의 10%');

// 2. 1세대1주택 고가주택: 양도 15억, 차익 6.7억, 보유·거주 10년 → 80%
r = cg({ acqDate: '2016-01-01', acqPrice: 8.3 * E, saleDate: '2026-12-01', salePrice: 15 * E, residMonths: 120, acqAdj: true, saleAdj: true });
check('고가주택 12억 초과분 과세 + 장특공 80%', r.tax, 2385000, '6.7억×(3억/15억)=1.34억, ×(1−80%)=2,680만, −250만=2,430만, ×15%−126만');
check('  └ 장기보유특별공제율', r.ltdRate, 0.8, '표2 보유 40% + 거주 40%');

// 3. 1세대1주택 12억 이하 전액 비과세 (취득 당시 비조정 → 거주요건 없음)
r = cg({ acqDate: '2023-06-01', acqPrice: 8 * E, saleDate: '2026-12-01', salePrice: 11 * E, acqAdj: false });
check('1주택 12억 이하 비과세 (거주 요건 없음)', r.total, 0, '제89조 제1항 제3호, 시행령 제154조');

// 4. 취득 당시 조정대상지역, 거주 1년 → 비과세 불가, 표1 14%
r = cg({ acqDate: '2019-03-01', acqPrice: 6 * E, saleDate: '2026-12-01', salePrice: 10 * E, residMonths: 12, acqAdj: true, saleAdj: true });
check('조정지역 취득 거주 2년 미만 → 과세, 표1 14%', r.tax, 110660000, '4억×86%=3.44억, −250만=3.415억, ×40%−2,594만');

// 5. 2주택 중과(+20%p), 장특공 배제
r = cg({ acqDate: '2016-01-01', acqPrice: 5 * E, saleDate: '2026-12-01', salePrice: 8 * E, houses: 2, saleAdj: true });
check('조정지역 2주택 중과 +20%p, 장특공 배제', r.tax, 152610000, '2.975억×(38%+20%)−1,994만 (제104조 제7항)');

// 6. 3주택 중과(+30%p)
r = cg({ acqDate: '2021-01-01', acqPrice: 5 * E, saleDate: '2026-12-01', salePrice: 6.025 * E, houses: 3, saleAdj: true });
check('조정지역 3주택 중과 +30%p', r.tax, 49560000, '1억×(35%+30%)−1,544만');

// 7. 단기 1년 미만 70%
r = cg({ acqDate: '2026-03-01', acqPrice: 5 * E, saleDate: '2026-12-01', salePrice: 6 * E });
check('보유 1년 미만 70%', r.tax, 68250000, '9,750만×70% (제104조 제1항 제3호)');

// 8. 1년 이상 2년 미만 60% vs 중과 비교
r = cg({ acqDate: '2025-06-01', acqPrice: 5 * E, saleDate: '2026-12-01', salePrice: 6 * E, houses: 2, saleAdj: true });
check('보유 1~2년 60%와 중과 중 큰 세액', r.tax, 58500000, 'max(9,750만×60%, 9,750만×55%−1,544만)');

// 9. 중과 유예기간(2026.5.9 이전) 양도: 중과 없음 + 장특공 표1 20%
r = cg({ acqDate: '2016-01-01', acqPrice: 5 * E, saleDate: '2026-03-01', salePrice: 8 * E, houses: 2, saleAdj: true });
check('중과 유예 종료 전(2026.3) 양도', r.tax, 70310000, '3억×80%=2.4억, −250만, ×38%−1,994만');

// 10. 보유기간 응당일
check('보유기간 응당일 2년 충족', T.fullYears('2024-03-15', '2026-03-15'), 2, '취득일부터 양도일까지(제95조 제4항)');
check('보유기간 하루 모자람', T.fullYears('2024-03-15', '2026-03-14'), 1, '');

// 11. 일시적 2주택: 조정→조정, 신규 2026.9.1 취득 → 2년
let tt = { newAcqDate: '2026-09-01', newAdj: true, oldAdjAtNewAcq: true };
r = cg({ acqDate: '2020-01-01', acqPrice: 7 * E, saleDate: '2028-08-31', salePrice: 11 * E, houses: 2, residMonths: 36, acqAdj: true, saleAdj: true, tempTwo: tt });
check('일시적 2주택 2년 안 양도 → 비과세', r.total, 0, '시행령 제155조 (2026.10.1 시행 개정)');
r = cg({ acqDate: '2020-01-01', acqPrice: 7 * E, saleDate: '2028-09-02', salePrice: 11 * E, houses: 2, residMonths: 36, acqAdj: true, saleAdj: true, tempTwo: tt });
check('일시적 2주택 2년 지나 양도 → 중과', r.heavy, 0.2, '기한 경과 시 2주택 중과');
tt = { newAcqDate: '2026-07-01', newAdj: true, oldAdjAtNewAcq: true };
check('2026.8.3 이전 신규 취득은 3년', T.tempTwoDeadline('2020-01-01', true, '2026-07-01', true).years, 3, '개정 시행령 경과규정');

// 12. 취득세
let a = T.acqTax({ price: 7.5 * E, houses: 1 });
check('취득세 1주택 7.5억 → 2%', a.acq, 15000000, '(7.5×2/3−3)% (지방세법 제11조 제1항 제8호)');
check('  └ 지방교육세 0.2%', a.edu, 1500000, '세율×1/2×20%');
a = T.acqTax({ price: 10 * E, houses: 2, adj: true, over85: true });
check('취득세 조정 2주택 8% + 교육 0.4% + 농특 0.6%', a.total, 90000000, '지방세법 제13조의2');
a = T.acqTax({ price: 10 * E, houses: 3, adj: false });
check('취득세 비조정 3주택 8%', a.acq, 80000000, '지방세법 제13조의2');

// 13. 조정대상지역 이력
check('마포구 2024.5 → 비조정', A.isAdjusted('서울', '마포구', '2024-05-01'), false, '공고 제2023-2호 해제');
check('마포구 2025.10.16 → 조정', A.isAdjusted('서울', '마포구', '2025-10-16'), true, '공고 제2025-1223호');
check('강남구 2024 → 조정', A.isAdjusted('서울', '강남구', '2024-05-01'), true, '해제된 적 없음');
check('동탄구 2026.6.30 → 비조정', A.isAdjusted('경기', '화성시 동탄구', '2026-06-30'), false, '');
check('동탄구 2026.7.1 → 조정', A.isAdjusted('경기', '화성시 동탄구', '2026-07-01'), true, '공고 제2026-882호');
check('성남 중원 2022.11.14 → 비조정', A.isAdjusted('경기', '성남시 중원구', '2022-11-14'), false, '2022.11.14 해제');

// 14. 매도 순서 비교: 경우의 수 6, 최솟값이 맨 앞, 손계산 1개와 일치
const adj = (s, g) => d => A.isAdjusted(s, g, d);
const H = [
  { name: 'A', acqDate: '2015-01-01', acqPrice: 10 * E, price: 20 * E, expenses: 0, residMonths: 60, living: false, acqAdj: false, adjAt: adj('서울', '강남구') },
  { name: 'B', acqDate: '2018-01-01', acqPrice: 3 * E, price: 4 * E, expenses: 0, residMonths: 0, living: false, acqAdj: false, adjAt: adj('경기', '그 밖의 시·군') },
  { name: 'C', acqDate: '2020-01-01', acqPrice: 6 * E, price: 9 * E, expenses: 0, residMonths: 0, living: false, acqAdj: true, adjAt: adj('서울', '마포구') }
];
const cmp = T.compareOrders(H, { today: '2026-11-17', start: '2027-01-15', interval: 12, growth: 0 });
check('매도 순서 경우의 수', cmp.results.length, 6, '3! = 6');
check('가장 적은 순서가 맨 앞', cmp.results.every(x => x.total >= cmp.best.total), true, '');
// 손계산: B(2027, 3주택, 비조정 → 중과 없음, 보유 9년 18%) → C(2028, 2주택 조정 → 중과) → A(2029, 1주택)
const bc = cmp.results.find(x => x.order.join('') === '120');
const tB = Math.floor((1 * E * 0.82 - 2500000) * 0.24 - 5760000);   // 보유 9년 18%, 7,950만×24%−576만
const tC = Math.floor((3 * E - 2500000) * 0.58 - 19940000);
// A: 1주택, 거주 5년, 보유 14년 → 40%+20%=60%, 과세차익 10억×8/20=4억
const tA = Math.floor((4 * E * 0.4 - 2500000) * 0.38 - 19940000);
check('순서 B→C→A 총세액(지방세 포함) 손계산 일치', bc.total, [tB, tC, tA].reduce((s, t) => s + t + Math.floor(t * 0.1), 0), '연도별 1건씩');

// 15. 재산세 (지방세법 제110조·제111조·제111조의2·제112조·제151조, 시행령 제109조)
let p = T.propertyTax({ price: 5 * E, one: true });
check('재산세 1주택 공시 5억 (비율 44%, 특례세율)', p.tax, 260000, '2.2억×0.2%−18만 = 26만');
check('  └ 도시지역분 0.14% + 지방교육세 20% 합계', p.total, 620000, '26만 + 30.8만 + 5.2만');
check('  └ 7월 절반', p.july, 310000, '제115조 1/2씩');
p = T.propertyTax({ price: 5 * E, one: false });
check('재산세 다주택 공시 5억 (비율 60%, 표준세율)', p.total, 1104000, '3억×0.25%−18만=57만, +42만, +11.4만');
p = T.propertyTax({ price: 12 * E, one: true });
check('재산세 1주택 공시 12억 (45%, 9억 초과 표준세율)', p.total, 2592000, '5.4억×0.4%−63만=153만, +75.6만, +30.6만');
p = T.propertyTax({ price: 8 * E, one: true, prevPrice: 6 * E });
check('재산세 과세표준상한 (작년 6억 → 올해 8억)', p.tax, 396000, '상한 6억×45%+3.6억×5%=2.88억, ×0.2%−18만');
p = T.propertyTax({ price: 2 * E, one: false, prevTax: 80000 });
check('재산세 세부담상한 105% (공시 3억 이하)', p.tax, 84000, '15만 > 8만×105%=8.4만');
p = T.propertyTax({ price: 1 * E, one: true });
check('재산세 20만 원 이하 7월 한꺼번에', p.july, 86000, '4,300만×0.05%=21,500 → 10원 미만 버림, 합계 86,000');

// 16. 종합부동산세 (종부세법 제8조·제9조·제10조, 시행령 제4조의3)
let c = T.compTax({ prices: [15 * E], one: true, age: 60, years: 8 });
check('종부세 1주택 15억, 60세·8년 (40% 공제)', c.total, 414720, '1.8억×0.5%=90만, 재산세공제 32.4만, ×60%, 농특 20%');
c = T.compTax({ prices: [10 * E, 15 * E] });
check('종부세 2주택 합계 25억 (9억 공제, 1.0% 구간)', c.total, 5875200, '9.6억×1%−240만=720만, −230.4만, ×1.2');
c = T.compTax({ prices: [10 * E, 10 * E, 20 * E] });
check('  └ 3주택 합계 40억 산출세액 (2.0% 구간)', c.calc, 22800000, '18.6억×2%−1,440만');
check('종부세 3주택 40억 합계', c.total, 22003200, '2,280만 − 446.4만, ×1.2');
c = T.compTax({ prices: [10 * E], corp: true });
check('종부세 법인 1주택 10억 (공제 없음 2.7%)', c.total, 17712000, '6억×2.7%=1,620만 − 144만, ×1.2');
c = T.compTax({ prices: [30 * E], one: true, age: 72, years: 16 });
check('종부세 1주택 30억, 공제 40%+50% → 80% 한도', c.total, 1549440, '840만 − 194.4만 = 645.6만, ×20%, ×1.2');
c = T.compTax({ prices: [10 * E, 15 * E], prevTotal: 6000000 });
check('종부세 세부담상한 150%', c.tax, 4260000, '재산세 474만+종부 489.6만 − 900만 = 63.6만 차감');

// 17. 증여세 (상증세법 제53조·제56조·제57조·제69조)
let g = T.giftTax({ value: 5 * E, rel: 'child' });
check('증여세 성년 자녀 5억', g.tax, 77600000, '4.5억×20%−1천만=8천만, 신고공제 3%');
g = T.giftTax({ value: 10 * E, rel: 'spouse' });
check('증여세 배우자 10억 (6억 공제)', g.tax, 67900000, '4억×20%−1천만=7천만 × 97%');
g = T.giftTax({ value: 3 * E, rel: 'minor', skip: true });
check('증여세 미성년 손자녀 3억 세대생략 30%', g.tax, 58006000, '2.8억 → 4,600만 ×1.3 = 5,980만 × 97%');
g = T.giftTax({ value: 8 * E, debt: 3 * E, rel: 'child', prior: 5000 * M });
check('부담부증여 8억·채무 3억 + 10년 합산 5천만', g.tax, 87300000, '5억+5천만−5천만=5억, ×20%−1천만, ×97%');
g = T.giftTax({ value: 1.5 * E, rel: 'child', marriage: true });
check('혼인 공제 1억 + 기본 5천만 → 0원', g.tax, 0, '제53조의2');
g = T.giftTax({ value: 5040 * M, rel: 'relative', filed: false });
check('기타친족 1천만 공제, 기한 후 신고', g.tax, 4040000, '4,040만×10%, 신고공제 없음');
let ga = T.giftAcqTax({ value: 8 * E, stdPrice: 5.5 * E, adj: true, donorOne: false, close: true });
check('증여 취득세 조정 3억 이상 12% + 교육 0.4%', ga.total, 99200000, '지방세법 제13조의2 제2항');
ga = T.giftAcqTax({ value: 8 * E, stdPrice: 5.5 * E, adj: true, donorOne: true, close: true });
check('  └ 1세대1주택자의 자녀 증여 → 3.5% + 0.3%', ga.total, 30400000, '시행령 제28조의6');
ga = T.giftAcqTax({ value: 8 * E, stdPrice: 5.5 * E, debt: 3 * E, adj: false, over85: true, recvHouses: 1 });
check('부담부증여 취득세 (증여 5억 3.5%·채무 3억 유상 2.33%)', ga.total, 28289000, '2,000만 + 3억×(2.33+0.233+0.2)%');
const dg = T.giftDebtGain(8 * E, 3 * E, 4 * E);
check('부담부증여 양도차익 안분', dg.gain, 150000000, '3억 − 4억×3/8');

// 18. 매도 순서 5채: 120가지, 성능, 손계산
const nonAdj = adj('경기', '그 밖의 시·군');
const H5 = [['A', 3], ['B', 4], ['C', 5], ['D', 2.5], ['E', 6]].map(([n, pr]) => ({ name: n, acqDate: '2015-01-01', acqPrice: 2 * E, price: pr * E, expenses: 0, residMonths: 0, living: false, acqAdj: false, adjAt: nonAdj }));
const t0 = Date.now();
const c5 = T.compareOrders(H5, { today: '2026-11-17', start: '2027-01-15', interval: 12, growth: 0 });
const ms = Date.now() - t0;
check('매도 순서 5채 경우의 수', c5.results.length, 120, '5! = 120');
check('  └ 120가지 계산 1초 이내 (' + ms + 'ms)', ms < 1000, true, '');
check('  └ 가장 적은 순서가 맨 앞', c5.results.every(x => x.total >= c5.best.total), true, '');
// 손계산 A→B→C→D→E: 매년 1채, 비조정 → 중과 없음, 장특공 표1 24·26·28·30%, 마지막 E(6억)는 1주택 비과세
const tl = [Math.floor((1 * E * 0.76 - 2500000) * 0.24 - 5760000), Math.floor((2 * E * 0.74 - 2500000) * 0.35 - 15440000),
  Math.floor((3 * E * 0.72 - 2500000) * 0.38 - 19940000), Math.floor((0.5 * E * 0.70 - 2500000) * 0.15 - 1260000)];
const o5 = c5.results.find(x => x.order.join('') === '01234');
check('  └ 순서 A→B→C→D→E 총세액 손계산 일치', o5.total, tl.reduce((s, t) => s + t + Math.floor(t * 0.1), 0), '4채 과세 + 마지막 비과세');
check('  └ 가장 유리한 순서의 마지막은 차익 큰 E', c5.best.sales[4].name, 'E', '마지막 1주택 비과세');

// 출력
const pad = (s, n) => { s = String(s); let w = 0; for (const ch of s) w += ch.charCodeAt(0) > 255 ? 2 : 1; return s + ' '.repeat(Math.max(0, n - w)); };
let fail = 0;
rows.forEach((x, i) => { if (!x.ok) fail++; console.log(pad(x.ok ? 'PASS' : 'FAIL', 5) + pad(i + 1, 4) + pad(x.name, 48) + pad(typeof x.got === 'number' ? x.got.toLocaleString() : x.got, 14) + (x.ok ? '' : ' 기대 ' + x.want) + '  ' + x.basis); });
console.log(`\n${rows.length - fail}/${rows.length} 통과`);
process.exit(fail ? 1 : 0);
