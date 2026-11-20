/* 세금 엔진 — 공식 조문 산식 대조 테스트 (경계 사례 포함) — 실행: node tools/tax-official-test.js
   ───────────────────────────────────────────────────────────────────────────
   기대값은 엔진 코드를 쓰지 않고 따로 계산했다(엔진은 '세율 × 과표 − 누진공제' 방식, 여기 기대값은 조문 문언 그대로
   '누적세액 + 초과분 × 세율' 방식, 분수 정확 계산 → 원 미만 버림). 조문·세율 확인 출처와 확인일: docs/tax_rules_sources.md

   앞부분 58건은 '국가법령정보센터 현행 조문(2026-11-20 확인)의 산식으로 만든 공식 산식 사례'.
   뒷부분 CASES_BOOKLET 은 대표가 받은 공식 책자 원문 사례(국세청·행정안전부 「2026 주택과 세금」, 서울시 「2026 알기 쉬운 지방세」)의
   입력·숫자를 옮긴 것(쪽수 표기). 책자 대조로 고친 엔진 항목: 종부세 재산세 공제 분모, 상속 공제 한도(5억 이하), 증여공제 소진(dedUsed),
   소방분 지역자원시설세 계산식 추가. 결과 보고: preview/tax_booklet_check.md (웹 저장소 밖).

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
check('K03', '2주택 합계 15억 (9억 공제)', c.total, 1487127, '과표 3.6억: 192만 − 재산세 공제 234만×86.4만/297만(합산 과표 9억 표준세율)=680,727, ×1.2 [2026-11-20 책자 114쪽 산식으로 기대값 수정]');
c = T.compTax({ prices: [10 * E, 10 * E, 15 * E] });
check('K04', '3주택 합계 35억 → 3주택 세율표(25억 이하 2%)', c.total, 16395763, '과표 15.6억: 1,680만 − 651만×374.4만/777만=3,136,864, ×1.2 [2026-11-20 기대값 수정]');

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
check('S02', '세금 종류마다 적용 조항·지원 범위 목록', ['cgt', 'order', 'acq', 'prop', 'cpt', 'gift', 'xfer'].every(k => T.LAW[k].arts.length && T.SCOPE[k].length), true, '화면 tax-trust.js');

/* ===== 공식 책자 원문 사례 대조 (2026-11-20) =====
   NTS = 국세청·행정안전부 「2026 주택과 세금」(e북, 쪽수는 책에 인쇄된 쪽 — e북 화면 번호는 +2)
   SEOUL = 서울특별시 「2026 알기 쉬운 지방세」(PDF, 인쇄된 쪽 — PDF 쪽 번호는 +1)
   책자 문장은 옮기지 않고 입력 조건·숫자만 적었다. kind: '사례'(책자에 계산 과정이 나온 예시) / '세율표'(책자 표의 세율로 만든 값) /
   '규칙'(책자에 적힌 규칙을 그대로 적용한 경계값). explained: 책자와 엔진이 다른 이유가 확인된 경우(실패로 세지 않고 따로 표시). */
const X = require('../tax/transfer-engine.js');
const NTS = 'NTS', SEOUL = 'SEOUL';
const cgB = o => cg(o);
const CASES_BOOKLET = [
  /* --- 취득세 --- */
  { id: 'B-A01', src: NTS, page: 23, kind: '사례', name: '10억 유상 85㎡ 초과: 취득세', got: () => T.acqTax({ price: 10 * E, houses: 1, over85: true }).acq, want: 30000000 },
  { id: 'B-A02', src: NTS, page: 23, kind: '사례', name: '  └ 지방교육세 0.3%', got: () => T.acqTax({ price: 10 * E, houses: 1, over85: true }).edu, want: 3000000 },
  { id: 'B-A03', src: NTS, page: 23, kind: '사례', name: '  └ 농특세 0.2% · 총 납부세액', got: () => T.acqTax({ price: 10 * E, houses: 1, over85: true }).total, want: 35000000 },
  { id: 'B-A04', src: NTS, page: 23, kind: '세율표', name: '6.5억 세율 1.33%', got: () => T.acqTax({ price: 6.5 * E, houses: 1 }).rate, want: 0.0133 },
  { id: 'B-A05', src: NTS, page: 23, kind: '세율표', name: '7억 세율 1.67%', got: () => T.acqTax({ price: 7 * E, houses: 1 }).rate, want: 0.0167 },
  { id: 'B-A06', src: NTS, page: 23, kind: '세율표', name: '7.5억 세율 2.0%', got: () => T.acqTax({ price: 7.5 * E, houses: 1 }).rate, want: 0.02 },
  { id: 'B-A07', src: NTS, page: 23, kind: '세율표', name: '8억 세율 2.33%', got: () => T.acqTax({ price: 8 * E, houses: 1 }).rate, want: 0.0233 },
  { id: 'B-A08', src: NTS, page: 23, kind: '세율표', name: '8.5억 세율 2.67%', got: () => T.acqTax({ price: 8.5 * E, houses: 1 }).rate, want: 0.0267 },
  { id: 'B-A09', src: NTS, page: 23, kind: '세율표', name: '9억 세율 3.0%', got: () => T.acqTax({ price: 9 * E, houses: 1 }).rate, want: 0.03 },
  { id: 'B-A10', src: NTS, page: 30, kind: '사례', name: '6.5억 매매 → 산출세액', got: () => T.acqTax({ price: 6.5 * E, houses: 1 }).acq, want: 8645000 },
  { id: 'B-A11', src: NTS, page: 59, kind: '사례', name: '100㎡ 5억 유상(1주택) 총세액', got: () => T.acqTax({ price: 5 * E, houses: 1, over85: true }).total, want: 6500000 },
  { id: 'B-A12', src: NTS, page: 59, kind: '사례', name: '1주택 세대 조정지역 100㎡ 5억 추가 취득 8% 총세액', got: () => T.acqTax({ price: 5 * E, houses: 2, adj: true, over85: true }).total, want: 45000000 },
  { id: 'B-A13', src: NTS, page: 59, kind: '세율표', name: '12% 중과 85㎡ 초과 합계 13.4% (5억)', got: () => T.acqTax({ price: 5 * E, houses: 3, adj: true, over85: true }).total, want: 67000000 },
  { id: 'B-A14', src: NTS, page: 59, kind: '세율표', name: '상속 85㎡ 이하 2.96% (공시 5억)', got: () => X.inheritAcqTax({ std: 5 * E, oneHouse: false, over85: false }).total, want: 14800000 },
  { id: 'B-A15', src: NTS, page: 59, kind: '세율표', name: '상속 85㎡ 초과 3.16% (공시 5억)', got: () => X.inheritAcqTax({ std: 5 * E, oneHouse: false, over85: true }).total, want: 15800000 },
  { id: 'B-A16', src: NTS, page: 59, kind: '세율표', name: '증여 85㎡ 이하 3.8% (5억, 비조정)', got: () => T.giftAcqTax({ value: 5 * E, stdPrice: 4 * E, adj: false }).total, want: 19000000 },
  { id: 'B-A17', src: NTS, page: 59, kind: '세율표', name: '증여 85㎡ 초과 4.0% (5억, 비조정)', got: () => T.giftAcqTax({ value: 5 * E, stdPrice: 4 * E, adj: false, over85: true }).total, want: 20000000 },
  { id: 'B-A18', src: NTS, page: 30, kind: '규칙', name: '상속으로 무주택 세대 1주택 0.8%', got: () => X.inheritAcqTax({ std: 5 * E, oneHouse: true }).rate, want: 0.008 },
  { id: 'B-A19', src: NTS, page: 48, kind: '사례', name: '조정 2주택 부모 → 자녀 증여: 공시 5억 주택 12%', got: () => T.giftAcqTax({ value: 5 * E, stdPrice: 5 * E, adj: true, donorOne: false, close: true }).gift.rate, want: 0.12 },
  { id: 'B-A20', src: NTS, page: 48, kind: '사례', name: '  └ 공시 9천만 주택 3.5%', got: () => T.giftAcqTax({ value: 0.9 * E, stdPrice: 0.9 * E, adj: true, donorOne: false, close: true }).gift.rate, want: 0.035 },
  { id: 'B-A21', src: NTS, page: 24, kind: '규칙', name: '가족 저가 취득 증여의제(시가 30억·대가 20억)', got: () => X.lowPrice(30 * E, 20 * E).acqDeemedGift, want: true },
  { id: 'B-A22', src: SEOUL, page: 37, kind: '사례', name: '7억 1주택 유상(2023.3) 취득세', got: () => T.acqTax({ price: 7 * E, houses: 1 }).acq, want: 11666900,
    explained: '자료 간 표기 차이: 서울시 책자는 세율을 1.6667%로 적어 계산. 법 문언(제11조 제1항 제8호 "소수점 이하 다섯째 자리 반올림, 넷째 자리까지")·행정안전부 2019.8 발표(7억 1.67%)·국세청-행정안전부 공동 책자(23·30쪽)는 1.67% → 엔진 11,690,000원 유지' },
  { id: 'B-A23', src: SEOUL, page: 124, kind: '사례', name: '다세대 증여 시가인정액 1.3억 → 취득세+교육세', got: () => T.giftAcqTax({ value: 1.3 * E, stdPrice: 0.9 * E, adj: false }).total, want: 4940000 },
  { id: 'B-A24', src: SEOUL, page: 124, kind: '사례', name: '단독 200㎡ 2.3억 유상 → 취득세+농특세+교육세', got: () => T.acqTax({ price: 2.3 * E, houses: 1, over85: true }).total, want: 2990000 },
  { id: 'B-A25', src: SEOUL, page: 124, kind: '사례', name: '  └ 농특세(표준세율 2% 기준 취득세의 10%)', got: () => T.acqTax({ price: 2.3 * E, houses: 1, over85: true }).farm, want: 460000 },

  /* --- 재산세 · 지역자원시설세 --- */
  { id: 'B-P01', src: NTS, page: 77, kind: '사례', name: '공시 10억(60%) → 과세표준', got: () => T.propertyTax({ price: 10 * E, one: false }).base, want: 600000000 },
  { id: 'B-P02', src: NTS, page: 77, kind: '사례', name: '  └ 재산세 본세', got: () => T.propertyTax({ price: 10 * E, one: false }).tax, want: 1770000 },
  { id: 'B-P03', src: NTS, page: 77, kind: '사례', name: '  └ 도시지역분 0.14%', got: () => T.propertyTax({ price: 10 * E, one: false }).urban, want: 840000 },
  { id: 'B-P04', src: NTS, page: 96, kind: '규칙', name: '  └ 지방교육세 = 본세 × 20%', got: () => T.propertyTax({ price: 10 * E, one: false }).edu, want: 354000 },
  { id: 'B-P05', src: NTS, page: 86, kind: '사례', name: '공시 4.2억(60%) 표준세율', got: () => T.propertyTax({ price: 4.2 * E, one: false }).tax, want: 450000 },
  { id: 'B-P06', src: NTS, page: 86, kind: '사례', name: '공시 1.4억(60%) 표준세율', got: () => T.propertyTax({ price: 1.4 * E, one: false }).tax, want: 96000 },
  { id: 'B-P07', src: NTS, page: 86, kind: '사례', name: '과세표준 2.52억 1주택 특례세율(세율표)', got: () => won0(T.CONST.PT_BRK_ONE, 252000000), want: 324000 },
  { id: 'B-P08', src: NTS, page: 86, kind: '사례', name: '과세표준 8,400만 1주택 특례세율(세율표)', got: () => won0(T.CONST.PT_BRK_ONE, 84000000), want: 54000 },
  { id: 'B-P09', src: SEOUL, page: 44, kind: '사례', name: '2주택 이상, 공시 3억 → 본세', got: () => T.propertyTax({ price: 3 * E, one: false }).tax, want: 270000 },
  { id: 'B-P10', src: SEOUL, page: 44, kind: '사례', name: '  └ 도시지역분', got: () => T.propertyTax({ price: 3 * E, one: false }).urban, want: 252000 },
  { id: 'B-P11', src: SEOUL, page: 45, kind: '사례', name: '  └ 지방교육세', got: () => T.propertyTax({ price: 3 * E, one: false }).edu, want: 54000 },
  { id: 'B-P12', src: SEOUL, page: 45, kind: '사례', name: '  └ 소방분 지역자원시설세(건물 과표 6,700만)', got: () => T.fireTax(67000000), want: 52700 },
  { id: 'B-P13', src: SEOUL, page: 45, kind: '사례', name: '  └ 합계(본세+도시+소방+교육)', got: () => { const r = T.propertyTax({ price: 3 * E, one: false }); return r.total + T.fireTax(67000000); }, want: 628700 },
  { id: 'B-P14', src: SEOUL, page: 45, kind: '사례', name: '1세대1주택 공시 3억(43%) → 본세', got: () => T.propertyTax({ price: 3 * E, one: true }).tax, want: 99000 },
  { id: 'B-P15', src: SEOUL, page: 45, kind: '사례', name: '  └ 본세+도시지역분', got: () => { const r = T.propertyTax({ price: 3 * E, one: true }); return r.tax + r.urban; }, want: 279600 },

  /* --- 종합부동산세 --- */
  { id: 'B-K01', src: NTS, page: 101, kind: '사례', name: '1주택 15억 → 과세표준 1.8억', got: () => T.compTax({ prices: [15 * E], one: true, age: 70, years: 15 }).base, want: 180000000 },
  { id: 'B-K02', src: NTS, page: 101, kind: '사례', name: '  └ 종부세액 0.5%', got: () => T.compTax({ prices: [15 * E], one: true, age: 70, years: 15 }).calc, want: 900000 },
  { id: 'B-K03', src: NTS, page: 101, kind: '사례', name: '  └ 공제할 재산세(45% 가정)', got: () => T.compTax({ prices: [15 * E], one: true, age: 70, years: 15 }).propDed, want: 324000 },
  { id: 'B-K04', src: NTS, page: 101, kind: '사례', name: '  └ 세액공제 80%', got: () => T.compTax({ prices: [15 * E], one: true, age: 70, years: 15 }).credit, want: 460800 },
  { id: 'B-K05', src: NTS, page: 101, kind: '사례', name: '  └ 납부할 종부세', got: () => T.compTax({ prices: [15 * E], one: true, age: 70, years: 15 }).tax, want: 115200 },
  { id: 'B-K06', src: NTS, page: 101, kind: '사례', name: '  └ 농어촌특별세 20%', got: () => T.compTax({ prices: [15 * E], one: true, age: 70, years: 15 }).farm, want: 23040 },
  { id: 'B-K07', src: NTS, page: 108, kind: '사례', name: '(감면 뒤) 공시 15억, 개인 → 과세표준 3.6억', got: () => T.compTax({ prices: [15 * E] }).base, want: 360000000 },
  { id: 'B-K08', src: NTS, page: 114, kind: '사례', name: '6억+10억 개인 → 재산세 부과세액 합', got: () => T.compTax({ prices: [6 * E, 10 * E] }).propSum, want: 2580000 },
  { id: 'B-K09', src: NTS, page: 114, kind: '사례', name: '  └ 공제할 재산세액', got: () => T.compTax({ prices: [6 * E, 10 * E] }).propDed, want: 810160,
    explained: '끝수 차이 8원: 정확한 값은 2,580,000 × 1,008,000 ÷ 3,210,000 = 810,168.2원. 책자는 10원 미만을 버린 숫자로 적음(법령상 중간값 10원 절사 근거는 찾지 못해 엔진은 원 미만 버림 유지). 분모를 합산 과세표준 기준으로 고친 뒤의 차이' },
  { id: 'B-K10', src: NTS, page: 116, kind: '규칙', name: '세부담상한: 직전 총세액 300만 × 150% (2주택 10억+10억)', got: () => { const r = T.compTax({ prices: [10 * E, 10 * E], prevTotal: 3000000 }); return r.propSum + r.tax; }, want: 4500000 },

  /* --- 양도소득세 --- */
  { id: 'B-C01', src: NTS, page: 189, kind: '사례', name: '다주택·비조정, 보유 7년, 8억−3억−경비 7천만 → 장특공 14%', got: () => cgB({ acqDate: '2019-01-01', acqPrice: 3 * E, saleDate: '2026-01-02', salePrice: 8 * E, expenses: 7e7, houses: 2 }).ltd, want: 60200000 },
  { id: 'B-C02', src: NTS, page: 189, kind: '사례', name: '  └ 과세표준', got: () => cgB({ acqDate: '2019-01-01', acqPrice: 3 * E, saleDate: '2026-01-02', salePrice: 8 * E, expenses: 7e7, houses: 2 }).base, want: 367300000 },
  { id: 'B-C03', src: NTS, page: 189, kind: '사례', name: '  └ 산출세액(전자신고세액공제 2만 원 전)', got: () => cgB({ acqDate: '2019-01-01', acqPrice: 3 * E, saleDate: '2026-01-02', salePrice: 8 * E, expenses: 7e7, houses: 2 }).tax, want: 120980000 },
  { id: 'B-C04', src: NTS, page: 206, kind: '사례', name: '부담부증여(5억, 보증금 3억, 취득 1억) 채무분 취득가액', got: () => T.giftDebtGain(5 * E, 3 * E, 1 * E).acqPrice, want: 60000000 },
  { id: 'B-C05', src: NTS, page: 206, kind: '사례', name: '  └ 채무분 양도차익', got: () => T.giftDebtGain(5 * E, 3 * E, 1 * E).gain, want: 240000000 },
  { id: 'B-C06', src: NTS, page: 206, kind: '사례', name: '  └ 증여세 과세가액(5억 − 인수채무 3억)', got: () => T.giftTax({ value: 5 * E, debt: 3 * E, rel: 'child' }).net, want: 200000000 },
  { id: 'B-C07', src: NTS, page: 207, kind: '사례', name: '1세대1주택 고가주택 15억(취득 5억) 과세 양도차익', got: () => cgB({ acqDate: '2020-01-01', acqPrice: 5 * E, saleDate: '2026-01-02', salePrice: 15 * E }).taxableGain, want: 200000000 },
  { id: 'B-C08', src: NTS, page: 213, kind: '세율표', name: '표2: 보유 3년·거주 2년 → 20%', got: () => cgB({ acqDate: '2023-01-02', acqPrice: 10 * E, saleDate: '2026-01-02', salePrice: 15 * E, residMonths: 24 }).ltdRate, want: 0.2 },
  { id: 'B-C09', src: NTS, page: 213, kind: '세율표', name: '표2: 보유·거주 5년 → 40%', got: () => cgB({ acqDate: '2021-01-02', acqPrice: 10 * E, saleDate: '2026-01-02', salePrice: 15 * E, residMonths: 60 }).ltdRate, want: 0.4 },
  { id: 'B-C10', src: NTS, page: 213, kind: '세율표', name: '표2: 보유·거주 10년 → 80%', got: () => cgB({ acqDate: '2016-01-02', acqPrice: 10 * E, saleDate: '2026-01-02', salePrice: 15 * E, residMonths: 120 }).ltdRate, want: 0.8 },
  { id: 'B-C11', src: NTS, page: 215, kind: '사례', name: '2주택·조정 1년 미만 보유, 소득금액 3억 → 70%와 중과 중 큰 세액', got: () => cgB({ acqDate: '2026-03-01', acqPrice: 5 * E, saleDate: '2026-12-01', salePrice: 8 * E, houses: 2, saleAdj: true }).tax, want: 208250000 },
  { id: 'B-C12', src: NTS, page: 215, kind: '사례', name: '  └ 비교 대상: 기본세율+20%p 세액', got: () => won0(null, 297500000, 0.2), want: 152610000 },
  { id: 'B-C13', src: NTS, page: 229, kind: '사례', name: '다운계약서 → 비과세 배제, 보유 2년 6개월 산출세액', got: () => cgB({ acqDate: '2021-07-20', acqPrice: 5 * E, saleDate: '2024-01-20', salePrice: 8 * E, houses: 2 }).tax, want: 93110000 },
  { id: 'B-C14', src: NTS, page: 349, kind: '사례', name: '부모 저가 양도(시가 30억·대가 20억) → 시가로 양도 재계산', got: () => X.lowPrice(30 * E, 20 * E).cgtAtMarket, want: true },
  { id: 'B-C15', src: NTS, page: 349, kind: '사례', name: '  └ 당초(차익 5억) 약식 세액', got: () => won0(null, 5 * E), want: 174060000 },
  { id: 'B-C16', src: NTS, page: 349, kind: '사례', name: '  └ 재계산(차익 15억) 약식 세액', got: () => won0(null, 15 * E), want: 609060000 },

  /* --- 증여세 --- */
  { id: 'B-G01', src: NTS, page: 325, kind: '사례', name: '시가 25억, 채무 10억, 부→자 → 과세표준', got: () => T.giftTax({ value: 25 * E, debt: 10 * E, rel: 'child' }).base, want: 1450000000 },
  { id: 'B-G02', src: NTS, page: 325, kind: '사례', name: '  └ 납부세액', got: () => T.giftTax({ value: 25 * E, debt: 10 * E, rel: 'child' }).tax, want: 407400000 },
  { id: 'B-G03', src: NTS, page: 326, kind: '사례', name: '혼인 증여 10억, 보증금 6억, 7년 전 1억 → 과세표준', got: () => T.giftTax({ value: 10 * E, debt: 6 * E, rel: 'child', prior: 1 * E, priorTax: 5000000, marriage: true }).base, want: 350000000 },
  { id: 'B-G04', src: NTS, page: 326, kind: '사례', name: '  └ 납부세액(납부세액공제 500만 + 신고공제 3%)', got: () => T.giftTax({ value: 10 * E, debt: 6 * E, rel: 'child', prior: 1 * E, priorTax: 5000000, marriage: true }).tax, want: 53350000 },
  { id: 'B-G05', src: NTS, page: 340, kind: '사례', name: '성년 자녀 15억 주택(2020) 납부세액', got: () => T.giftTax({ value: 15 * E, rel: 'child' }).tax, want: 407400000 },
  { id: 'B-G06', src: NTS, page: 340, kind: '사례', name: '  └ 뒤이어 혼인자금 2억(15억 합산) 납부세액', got: () => T.giftTax({ value: 2 * E, rel: 'child', prior: 15 * E, priorTax: 420000000, marriage: true }).tax, want: 38800000 },
  { id: 'B-G07', src: NTS, page: 340, kind: '사례', name: '미성년 손자 7.2억(세대생략 30%) 납부세액', got: () => T.giftTax({ value: 7.2 * E, rel: 'minor', skip: true }).tax, want: 189150000 },
  { id: 'B-G08', src: NTS, page: 337, kind: '사례', name: '아버지 1억 증여 → 과세표준', got: () => T.giftTax({ value: 1 * E, rel: 'child' }).base, want: 50000000 },
  { id: 'B-G09', src: NTS, page: 337, kind: '사례', name: '  └ 뒤이어 할아버지 5천만(공제 이미 사용) → 과세표준', got: () => T.giftTax({ value: 0.5 * E, rel: 'child', dedUsed: 5e7 }).base, want: 50000000 },
  { id: 'B-G10', src: NTS, page: 349, kind: '사례', name: '저가 양수(시가 30억·대가 20억) 증여재산가액', got: () => X.lowPrice(30 * E, 20 * E).giftValue, want: 700000000 },
  { id: 'B-G11', src: NTS, page: 349, kind: '사례', name: '  └ 자녀 증여세', got: () => T.giftTax({ value: X.lowPrice(30 * E, 20 * E).giftValue, rel: 'child' }).tax, want: 130950000 },
  { id: 'B-G12', src: NTS, page: 351, kind: '사례', name: '시가 15억 주택 무상사용 5년 이익 113,723,601원 → 증여세', got: () => T.giftTax({ value: 113723601, rel: 'child' }).tax, want: 6181190 },
  { id: 'B-G13', src: NTS, page: 353, kind: '사례', name: '무상 담보 이익 4,600만(1년차) → 과세미달', got: () => T.giftTax({ value: 46000000, rel: 'child' }).tax, want: 0 },
  { id: 'B-G14', src: NTS, page: 353, kind: '사례', name: '  └ 2년차(1년차 4,600만 합산)', got: () => T.giftTax({ value: 46000000, rel: 'child', prior: 46000000, priorTax: 0 }).tax, want: 4074000 },

  /* --- 상속세 --- */
  { id: 'B-I01', src: NTS, page: 363, kind: '사례', name: '25억, 일괄 5억 + 배우자 5억 → 과세표준', got: () => X.inheritTax({ house: 25 * E, spouse: true }).base, want: 1500000000 },
  { id: 'B-I02', src: NTS, page: 363, kind: '사례', name: '  └ 산출세액', got: () => X.inheritTax({ house: 25 * E, spouse: true }).calc, want: 440000000 },
  { id: 'B-I03', src: NTS, page: 363, kind: '사례', name: '  └ 납부세액(신고세액공제 3%)', got: () => X.inheritTax({ house: 25 * E, spouse: true }).tax, want: 426800000 },
  { id: 'B-I04', src: NTS, page: 372, kind: '규칙', name: '동거주택 상속공제 6억 한도(주택 10억)', got: () => X.inheritTax({ house: 10 * E, cohab: true }).cohabDed, want: 600000000 },
  { id: 'B-I05', src: NTS, page: 374, kind: '규칙', name: '공제 한도: 과세가액 5억 이하면 사전증여 과세표준 안 뺌', got: () => X.inheritTax({ house: 4 * E, prior: 1 * E, priorDed: 5e7 }).limit, want: 500000000 },
  { id: 'B-I06', src: NTS, page: 374, kind: '규칙', name: '  └ 과세가액 5억 초과면 뺌(주택 9억 + 사전증여 1억)', got: () => X.inheritTax({ house: 9 * E, prior: 1 * E, priorDed: 5e7 }).limit, want: 950000000 }
];
/* 세율표만으로 계산(엔진 상수 대조) — table 없으면 양도세 기본세율 */
function won0(table, base, add) { if (!table) return Math.floor(T.basicTax(base, add || 0) + 1e-6); for (const [cap, r, d] of table) if (base <= cap) return Math.floor(base * r - d + 1e-6); return 0; }
/* 책자에 있으나 엔진이 계산하지 않아 대조에서 뺀 사례(숫자를 옮기지 않음, 쪽만 기록) */
const BOOKLET_SKIPPED = [
  [NTS, 28, '주상복합 1억 주택·상가 과세표준 안분 — 엔진은 주택만'],
  [NTS, 145, '주택임대소득세 계산 사례(간주임대료 156·157쪽, 분리과세 180쪽 등) — 임대소득 엔진 없음'],
  [NTS, 204, '환산취득가액·환산가산세 — 엔진 범위 밖(SCOPE 안내)'],
  [NTS, 207, '공동소유 고가주택 지분별 양도차익 — 엔진은 한 사람 기준(SCOPE 안내)'],
  [NTS, 226, '상생임대주택 장특공(보유만 10년 → 40%) — 엔진 범위 밖(SCOPE 안내)'],
  [NTS, 351, '무상사용 이익(연 2%·10% 할인) 자체 계산 — 증여세만 대조(B-G12)'],
  [NTS, 371, '그 밖의 인적공제(자녀·미성년·장애인 8.73억) — 비교 화면은 일괄공제 5억만(SCOPE xfer 안내)'],
  [SEOUL, 37, '취득세 과소신고 가산세 — 엔진 범위 밖'],
  [SEOUL, 125, '상가 상속 취득세 — 주택 아님'],
  [SEOUL, 79, '생애최초 주택 취득세 감면 — 책자에 숫자 계산 사례 없음, 엔진은 감면 미반영(SCOPE 안내). 80쪽 요약표의 소형/소형 외 한도(200만/300만)가 79쪽 본문·93쪽 표(일반 200만, 소형 300만)와 거꾸로 적혀 있음']
];
let explainedN = 0;
CASES_BOOKLET.forEach(x => {
  const got = x.got(), basis = (x.src === NTS ? '「2026 주택과 세금」 ' : '서울시 「2026 알기 쉬운 지방세」 ') + x.page + '쪽 · ' + x.kind;
  if (x.explained && got !== x.want) { explainedN++; rows.push({ ok: true, id: x.id, name: x.name + ' [설명된 차이]', got, want: x.want, basis: basis + ' · 책자 ' + x.want.toLocaleString() + ' — ' + x.explained }); }
  else check(x.id, x.name, got, x.want, basis);
});

const pad = (s, n) => { s = String(s); let w = 0; for (const ch of s) w += ch.charCodeAt(0) > 255 ? 2 : 1; return s + ' '.repeat(Math.max(0, n - w)); };
let fail = 0;
rows.forEach(x => { if (!x.ok) fail++; console.log(pad(x.ok ? 'PASS' : 'FAIL', 5) + pad(x.id, 6) + pad(x.name, 50) + pad(typeof x.got === 'number' ? x.got.toLocaleString() : x.got, 14) + (x.ok ? '' : ' 기대 ' + x.want) + '  ' + x.basis); });
console.log(`\n전체 ${rows.length}건 중 ${rows.length - fail}건 통과 (조문 산식 ${rows.length - CASES_BOOKLET.length}건 + 책자 원문 ${CASES_BOOKLET.length}건, 그중 설명된 차이 ${explainedN}건 · 엔진 범위 밖이라 뺀 책자 사례 ${BOOKLET_SKIPPED.length}곳)`);
process.exit(fail ? 1 : 0);
