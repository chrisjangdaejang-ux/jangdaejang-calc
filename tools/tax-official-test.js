/* 세금 엔진 — 공식 조문 산식 대조 테스트 (경계 사례 포함) — 실행: node tools/tax-official-test.js
   ───────────────────────────────────────────────────────────────────────────
   기대값은 엔진 코드를 쓰지 않고 따로 계산했다(엔진은 '세율 × 과표 − 누진공제' 방식, 여기 기대값은 조문 문언 그대로
   '누적세액 + 초과분 × 세율' 방식, 분수 정확 계산 → 원 미만 버림). 조문·세율 확인 출처와 확인일: docs/tax_rules_sources.md

   한계(정직하게): 국세청 「부동산과 세금」 책자·누리집(nts.go.kr)의 '계산 사례' 원문은 이 작업 환경에서 접속이 막혀
   (2026-11-20 확인: nts.go.kr·taxlaw.nts.go.kr 모두 차단) 책자 숫자를 직접 옮기지 못했다. 그래서 이 파일의 사례는
   '국가법령정보센터 현행 조문(2026-11-20 확인)의 산식으로 만든 공식 산식 사례'다. 책자 사례 원 단위 대조는
   책자 PDF를 받아 CASES_BOOKLET 에 넣으면 같은 방식으로 돈다(입력·기대값·쪽수만 채우면 됨).

   항목: 양도세(12억 경계·보유/거주 2년·3년 경계·단기세율·표1/표2·중과 재개일·45% 구간·일시적 2주택 기한),
        취득세(6억·9억 경계, 6~9억 산식 반올림, 중과 8%·12%), 재산세(공정시장가액비율 43/44/45%·특례세율 9억 경계),
        종부세(12억 공제 경계·세액공제·3주택 세율표), 증여세(과세최저한·1억 경계·세대생략 30/40%), 증여 취득세(3억 경계) */
const T = require('../tax/tax-engine.js');
const E = 100000000, M = 10000;
const rows = [];
function check(id, name, got, want, basis) { rows.push({ ok: got === want, id, name, got, want, basis }); }
const cg = o => T.calcCGT(Object.assign({ expenses: 0, residMonths: 0, houses: 1, acqAdj: false, saleAdj: false, tempTwo: null }, o));

/* ===== 양도소득세 (소득세법 제55조·제89조·제95조·제103조·제104조, 시행령 제154조·제155조·제160조, 지방세법 제103조의3) ===== */
let r;
r = cg({ acqDate: '2022-01-10', acqPrice: 8 * E, saleDate: '2026-12-01', salePrice: 12 * E });
check('C01', '1주택 양도가 정확히 12억 → 전액 비과세', r.total, 0, '제89조 제1항 제3호 "12억 원을 초과하는" 고가주택만 과세');
r = cg({ acqDate: '2021-11-01', acqPrice: 8 * E, saleDate: '2026-11-02', salePrice: 1200010000, residMonths: 60, acqAdj: true });
check('C02', '12억+1만 원 → 고가주택, 과세 차익 3,333원', r.taxableGain, 3333, '시행령 제160조: 4억 0001만 × 1만/12억 0001만, 원 미만 버림');
check('C02b', '  └ 기본공제 250만 뒤 세액 0', r.total, 0, '제103조');
r = cg({ acqDate: '2024-03-15', acqPrice: 9 * E, saleDate: '2026-03-15', salePrice: 11 * E });
check('C03', '보유 2년 응당일 양도 → 비과세(경계 안내 표시)', r.total === 0 && r.notes.some(x => x.includes('응당일')), true, '제95조 제4항 취득일~양도일, 응당일 경계는 세무사 확인 안내');
r = cg({ acqDate: '2024-03-15', acqPrice: 9 * E, saleDate: '2026-03-14', salePrice: 11 * E });
check('C04', '하루 모자람 → 1~2년 60% 단일세율', r.tax, 118500000, '제104조 제1항 제2호: (2억 − 250만) × 60%');
check('C04b', '  └ 지방소득세 10%', r.local, 11850000, '지방세법 제103조의3');
r = cg({ acqDate: '2026-03-01', acqPrice: 5 * E, saleDate: '2026-12-01', salePrice: 6 * E, houses: 2 });
check('C05', '보유 1년 미만 70%', r.tax, 68250000, '제104조 제1항 제3호: 9,750만 × 70%');
r = cg({ acqDate: '2023-06-01', acqPrice: 4 * E, saleDate: '2026-06-01', salePrice: 5 * E, houses: 2 });
check('C06', '보유 3년 응당일 → 표1 6%', r.tax, 16585000, '제95조 표1 3년 6%: 과표 9,150만 → 1,536만 + 350만×35%');
r = cg({ acqDate: '2023-06-01', acqPrice: 4 * E, saleDate: '2026-05-31', salePrice: 5 * E, houses: 2 });
check('C07', '3년 하루 전 → 장특공 0%', r.tax, 18685000, '과표 9,750만: 1,536만 + 950만 × 35%');
r = cg({ acqDate: '2023-01-02', acqPrice: 10 * E, saleDate: '2026-01-02', salePrice: 15 * E, residMonths: 24, acqAdj: true });
check('C08', '1주택 15억, 보유 3년·거주 2년 → 표2 12%+8%', r.tax, 12840000, '제95조 표2(거주 2~3년 8%, 보유 3년 이상): 과세차익 1억, 과표 7,750만');
check('C08b', '  └ 공제율 20%', r.ltdRate, 0.2, '');
r = cg({ acqDate: '2016-01-01', acqPrice: 10 * E, saleDate: '2026-12-01', salePrice: 20 * E, residMonths: 130, acqAdj: true });
check('C09', '1주택 20억, 보유·거주 10년 이상 → 80%', r.tax, 12840000, '표2 40%+40%: 10억×8/20=4억, ×20%=8천만, −250만');
r = cg({ acqDate: '2016-01-01', acqPrice: 5 * E, saleDate: '2026-12-01', salePrice: 15 * E, residMonths: 24, acqAdj: false });
check('C10', '보유 10년·거주 2년(비조정 취득) → 40%+8%=48%', r.tax, 20085000, '과세차익 2억 × 52% = 1.04억, 과표 1.015억');
r = cg({ acqDate: '2016-01-01', acqPrice: 5 * E, saleDate: '2026-12-01', salePrice: 15 * E, residMonths: 12, acqAdj: false });
check('C11', '비과세 되지만 거주 2년 미만 → 표2 못 쓰고 표1 20%', r.tax, 39910000, '제95조 제2항: 표2는 거주 2년 이상만. 과표 1.575억');
r = cg({ acqDate: '2021-01-01', acqPrice: 6 * E, saleDate: '2026-12-01', salePrice: 10 * E, residMonths: 23, acqAdj: true });
check('C12', '조정 취득 거주 23개월 → 비과세 불가, 표1 10%', r.tax, 117060000, '시행령 제154조 제1항 거주 2년: 과표 3.575억, 9,406만+5,750만×40%');
r = cg({ acqDate: '2021-01-01', acqPrice: 6 * E, saleDate: '2026-12-01', salePrice: 10 * E, residMonths: 24, acqAdj: true });
check('C13', '거주 24개월 → 비과세', r.total, 0, '시행령 제154조 제1항');
let tt = { newAcqDate: '2024-05-01', newAdj: true, oldAdjAtNewAcq: true };
r = cg({ acqDate: '2015-01-01', acqPrice: 5 * E, saleDate: '2027-05-01', salePrice: 9 * E, houses: 2, residMonths: 60, acqAdj: false, saleAdj: true, tempTwo: tt });
check('C14', '일시적 2주택 3년(2026.8.3 이전 신규 취득) 마지막 날 → 비과세', r.total, 0, '시행령 제155조 제1항, 2026.10.1 개정 경과규정');
r = cg({ acqDate: '2015-01-01', acqPrice: 5 * E, saleDate: '2027-05-02', salePrice: 9 * E, houses: 2, residMonths: 60, acqAdj: false, saleAdj: true, tempTwo: tt });
check('C15', '  └ 하루 지남 → 2주택 중과', r.heavy, 0.2, '제104조 제7항 제1호');
r = cg({ acqDate: '2026-01-10', acqPrice: 5 * E, saleDate: '2026-12-01', salePrice: 9 * E, houses: 2, saleAdj: false, tempTwo: { newAcqDate: '2026-06-01', newAdj: false, oldAdjAtNewAcq: false } });
check('C16', '종전 집 취득 1년 안에 새 집 취득 → 일시적 2주택 불가', r.exemptOK, false, '시행령 제155조 제1항 "1년 이상이 지난 후"');
check('C17', '일시적 2주택 조정→조정 2026.8.4 이후 취득 → 2년', T.tempTwoDeadline('2020-01-01', true, '2026-08-04', true).years, 2, '시행령 제155조 개정(2026.10.1 시행)');
check('C18', '  └ 2026.8.3 취득 → 3년', T.tempTwoDeadline('2020-01-01', true, '2026-08-03', true).years, 3, '경과규정');
r = cg({ acqDate: '2016-01-01', acqPrice: 5 * E, saleDate: '2026-05-09', salePrice: 8 * E, houses: 2, saleAdj: true });
check('C19', '중과 유예 마지막 날(2026.5.9) → 기본세율 + 표1 20%', r.tax, 70310000, '시행령 제167조의10 (2026.5.9까지 양도분)');
r = cg({ acqDate: '2016-01-01', acqPrice: 5 * E, saleDate: '2026-05-10', salePrice: 8 * E, houses: 2, saleAdj: true });
check('C20', '중과 재개 첫날(2026.5.10) → +20%p, 장특공 배제', r.tax, 152610000, '제104조 제7항, 제95조 제2항 단서: 과표 2.975억');
r = cg({ acqDate: '2025-06-01', acqPrice: 5 * E, saleDate: '2026-12-01', salePrice: 6 * E, houses: 3, saleAdj: true });
check('C21', '3주택 보유 1~2년: 60%와 +30%p 중 큰 세액', r.tax, 58500000, '제104조 제7항 후단: max(5,850만, 5,566.5만)');
r = cg({ acqDate: '2016-01-01', acqPrice: 5 * E, saleDate: '2026-12-01', salePrice: 8 * E, houses: 3, saleAdj: true });
check('C22', '3주택 중과 +30%p', r.tax, 182360000, '3,706만 + 1.475억×38% + 2.975억×30%');
r = cg({ acqDate: '2024-01-01', acqPrice: 5 * E, saleDate: '2026-12-01', salePrice: 20 * E, houses: 2 });
check('C23', '과표 10억 초과 45% 구간', r.tax, 607935000, '제55조: 3억8,406만 + 4.975억 × 45%');

/* ===== 취득세 (지방세법 제11조 제1항 제8호, 제13조의2, 제151조, 농어촌특별세법 제5조) ===== */
let a = T.acqTax({ price: 6 * E, houses: 1 });
check('A01', '6억 정확히 → 1%', a.acq + a.edu, 6600000, '"6억원 이하" 1천분의 10, 지방교육세 세율×50%×20% = 0.1%');
a = T.acqTax({ price: 600010000, houses: 1 });
check('A02', '6억+1만 → 산식 1.00006% → 넷째 자리 1.00%', a.acq, 6000100, '제11조 제1항 제8호 나목, 소수점 다섯째 자리 반올림');
a = T.acqTax({ price: 7 * E, houses: 1 });
check('A03', '7억 → 1.67%', a.acq, 11690000, '(7억×2/3억 − 3)×1/100 = 0.016666… → 0.0167');
check('A03b', '  └ 지방교육세 0.167%', a.edu, 1169000, '제151조 제1항 제1호');
a = T.acqTax({ price: 8 * E, houses: 1 });
check('A04', '8억 → 2.33%', a.acq, 18640000, '0.023333… → 0.0233');
a = T.acqTax({ price: 6.5 * E, houses: 1 });
check('A05', '6.5억 → 1.33%', a.acq, 8645000, '0.013333… → 0.0133');
a = T.acqTax({ price: 9 * E, houses: 1, over85: true });
check('A06', '9억 85㎡ 초과 → 3% + 0.3% + 농특 0.2%', a.total, 31500000, '산식 정확히 3%, 농어촌특별세법 제5조 제1항 제6호');
a = T.acqTax({ price: 5 * E, houses: 2, adj: true });
check('A07', '조정 2주택 8% + 교육 0.4%', a.total, 42000000, '제13조의2: 4% + 중과기준세율 2%×200%');
a = T.acqTax({ price: 5 * E, houses: 2, adj: true, temp: true });
check('A08', '조정 일시적 2주택 → 1%', a.total, 5500000, '시행령 제28조의5');
a = T.acqTax({ price: 5 * E, houses: 3, adj: false });
check('A09', '비조정 3주택 8%', a.acq, 40000000, '제13조의2 제1항 제2호');
a = T.acqTax({ price: 10 * E, houses: 3, adj: true, over85: true });
check('A10', '조정 3주택 12% + 0.4% + 농특 1.0%', a.total, 134000000, '제13조의2: 4% + 2%×400%');
a = T.acqTax({ price: 5 * E, houses: 4, adj: false });
check('A11', '비조정 4주택 12%', a.acq, 60000000, '제13조의2 제1항 제3호');

/* ===== 재산세 (지방세법 제110조·시행령 제109조, 제111조, 제111조의2, 제112조, 제151조) ===== */
let p = T.propertyTax({ price: 3 * E, one: true });
check('P01', '1주택 공시 3억 정확히 → 43%, 특례세율', p.total, 299400, '과표 1.29억: 3만 + 6,900만×0.1% = 9.9만, 도시 18.06만, 교육 1.98만');
p = T.propertyTax({ price: 300010000, one: true });
check('P02', '3억+1만 → 44%', p.total, 307200, '과표 1억3,200만4,400원, 10원 미만 버림');
p = T.propertyTax({ price: 9 * E, one: true });
check('P03', '1주택 9억 정확히 → 특례세율 유지', p.total, 1512000, '제111조의2 "9억원 이하": 42만 + 1.05억×0.35%');
p = T.propertyTax({ price: 900010000, one: true });
check('P04', '9억+1만 → 표준세율', p.total, 1755010, '57만 + 1억500만4,500원×0.4% → 99만 10원');
p = T.propertyTax({ price: 6 * E, one: true });
check('P05', '1주택 공시 6억 → 44%', p.total, 787200, '과표 2.64억: 12만 + 1.14억×0.2%');
p = T.propertyTax({ price: 4 * E, one: false });
check('P06', '다주택 공시 4억 → 60%, 표준세율', p.total, 840000, '과표 2.4억: 19.5만 + 9천만×0.25%');

/* ===== 종합부동산세 (종부세법 제8조·제9조, 시행령 제2조의4·제4조의3, 농어촌특별세 20%) ===== */
let c = T.compTax({ prices: [12 * E], one: true });
check('K01', '1주택 공시 12억 정확히 → 0', c.total, 0, '제8조 제1항 1세대1주택 12억 공제');
c = T.compTax({ prices: [20 * E], one: true, age: 65, years: 10 });
check('K02', '1주택 20억, 65세·10년 → 공제 70%', c.total, 682560, '과표 4.8억: 150만+1.8억×0.7%=276만, 재산세공제 86.4만, ×30%, 농특 20%');
c = T.compTax({ prices: [7 * E, 8 * E] });
check('K03', '2주택 합계 15억 (9억 공제)', c.total, 1267200, '과표 3.6억: 150만+6천만×0.7%=192만, −86.4만, ×1.2');
c = T.compTax({ prices: [10 * E, 10 * E, 15 * E] });
check('K04', '3주택 합계 35억 → 3주택 세율표(25억 이하 2%)', c.total, 15667200, '과표 15.6억: 960만+3.6억×2%=1,680만, −374.4만, ×1.2');

/* ===== 증여세 (상증세법 제26조·제53조·제55조·제56조·제57조·제69조) ===== */
let g = T.giftTax({ value: 1.5 * E, rel: 'child' });
check('G01', '성년 자녀 1.5억 → 과표 1억, 10%', g.tax, 9700000, '1천만 × 97%(신고세액공제 3%)');
g = T.giftTax({ value: 150010000, rel: 'child' });
check('G02', '과표 1억+1만 → 20% 구간 첫 1만 원', g.tax, 9701940, '1,000만 + 1만×20% = 1,000.2만, 3% 공제 300,060원');
g = T.giftTax({ value: 50400000, rel: 'child' });
check('G03', '과표 40만 원 → 과세최저한 50만 미만', g.tax, 0, '제55조 제2항');
g = T.giftTax({ value: 25 * E, rel: 'minor', skip: true });
check('G04', '미성년 손자녀 25억(20억 초과) → 할증 40%', g.tax, 1129856000, '제57조: 8.32억 × 1.4 × 97%');
g = T.giftTax({ value: 20 * E, rel: 'minor', skip: true });
check('G05', '미성년 손자녀 정확히 20억 → 할증 30%', g.tax, 796952000, '제57조 "20억원을 초과" 일 때만 40%');
g = T.giftTax({ value: 35 * E, rel: 'child' });
check('G06', '30억 초과 50% 구간', g.tax, 1227050000, '제26조: 10.4억 + 4.5억×50% = 12.65억 × 97%');
let ga = T.giftAcqTax({ value: 5 * E, stdPrice: 299990000, adj: true });
check('G07', '증여 취득세: 조정지역 공시 3억 미만 → 3.5%+0.3%', ga.total, 19000000, '지방세법 시행령 제28조의6 "3억원 이상"만 중과');
ga = T.giftAcqTax({ value: 5 * E, stdPrice: 3 * E, adj: true });
check('G08', '  └ 공시 정확히 3억 → 12%+0.4%', ga.total, 62000000, '제13조의2 제2항');

/* ===== 지원 범위·기준일 메타데이터 ===== */
check('S01', '기준일 표시값', T.AS_OF, '2026-11-20', 'docs/tax_rules_sources.md 확인일');
check('S02', '세금 종류마다 적용 조항·지원 범위 목록', ['cgt', 'order', 'acq', 'prop', 'cpt', 'gift'].every(k => T.LAW[k].arts.length && T.SCOPE[k].length), true, '화면 tax-trust.js');

/* 국세청 책자 사례 자리 — 책자 PDF 확보 시 { id, page, input, want } 를 넣으면 같은 방식으로 대조 */
const CASES_BOOKLET = [];
CASES_BOOKLET.forEach(x => check(x.id, x.name, T[x.fn](x.input)[x.field], x.want, '국세청 책자 ' + x.page + '쪽'));

const pad = (s, n) => { s = String(s); let w = 0; for (const ch of s) w += ch.charCodeAt(0) > 255 ? 2 : 1; return s + ' '.repeat(Math.max(0, n - w)); };
let fail = 0;
rows.forEach(x => { if (!x.ok) fail++; console.log(pad(x.ok ? 'PASS' : 'FAIL', 5) + pad(x.id, 6) + pad(x.name, 50) + pad(typeof x.got === 'number' ? x.got.toLocaleString() : x.got, 14) + (x.ok ? '' : ' 기대 ' + x.want) + '  ' + x.basis); });
console.log(`\n공식 산식 사례 ${rows.length}건 중 ${rows.length - fail}건 일치 (국세청 책자 원문 사례 ${CASES_BOOKLET.length}건)`);
process.exit(fail ? 1 : 0);
