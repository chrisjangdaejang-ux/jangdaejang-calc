/* HUG 전세보증 가입 가능성·보증료(assets/hug-core.js) 자동 검증 — 실행: node tools/hug-test.js
   기준: 주택도시보증공사 전세반환보증 상품개요(2026-11-25 확인) — 보증금 한도·126%·90%·60%·요율표·부채비율·할증·할인. 금액 단위: 만원(보증료만 원) */
const H = require('../assets/hug-core.js');
const rows = [];
function check(name, got, want) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want }); }

/* 요율표 24칸(상품개요 표 그대로) */
check('요율표: 1억 이하 아파트', H.RATES[0][1], [0.097, 0.117, 0.137]);
check('요율표: 1억 이하 기타', H.RATES[0][2], [0.111, 0.142, 0.172]);
check('요율표: 1억~2억 아파트·기타', [H.RATES[1][1], H.RATES[1][2]], [[0.102, 0.124, 0.146], [0.117, 0.151, 0.184]]);
check('요율표: 2억~5억 아파트·기타', [H.RATES[2][1], H.RATES[2][2]], [[0.107, 0.131, 0.154], [0.124, 0.161, 0.197]]);
check('요율표: 5억 초과 아파트·기타', [H.RATES[3][1], H.RATES[3][2]], [[0.113, 0.138, 0.164], [0.132, 0.172, 0.211]]);
check('구간 경계: 정확히 1억은 1억 이하, 2억 1만은 2억~5억', [H.rateOf(10000, 'apt', 0.5), H.rateOf(20001, 'apt', 0.5)], [0.097, 0.107]);
check('부채비율 경계: 70%·80%는 아래 칸', [H.rateOf(30000, 'apt', 0.7), H.rateOf(30000, 'apt', 0.8), H.rateOf(30000, 'apt', 0.8001)], [0.107, 0.131, 0.154]);

/* 126% 규칙: 공시가격 2억이면 보증금 2억 5,200만까지 */
const a = H.check({ dep: 25200, pub: 20000, type: 'villa', metro: true, months: 24 });
check('공시가격 × 140% × 90% = 126%: 2억 → 2억 5,200만 통과', [a.price, a.limit, a.checks[1].ok], [28000, 25200, true]);
check('1만 원 넘으면 불통과', H.check({ dep: 25201, pub: 20000, type: 'villa', metro: true }).checks[1].ok, false);
check('가능한 최대 보증금(소수 오차 없음)', H.check({ dep: 30000, pub: 22000, type: 'apt', metro: true }).maxDep, 27720);
check('선순위채권을 빼고 한도', H.check({ dep: 20000, senior: 5000, pub: 20000, type: 'villa', metro: true }).maxDep, 20200);
/* 보증금 한도 */
check('수도권 7억 이하', [H.check({ dep: 70000, kb: 100000, type: 'apt', metro: true }).checks[0].ok, H.check({ dep: 70001, kb: 100000, type: 'apt', metro: true }).checks[0].ok], [true, false]);
check('수도권 밖 5억 이하', H.check({ dep: 50001, kb: 100000, type: 'apt', metro: false }).checks[0].ok, false);
check('수도권 = 서울·경기·인천', ['서울특별시', '경기도', '인천광역시', '부산광역시'].map(H.isMetro), [true, true, true, false]);
/* 선순위 60% */
check('선순위채권이 주택가격 60% 넘으면 불통과', H.check({ dep: 1000, senior: 17000, pub: 20000, type: 'villa', metro: true }).checks[2].ok, false);
/* 주택가격: KB시세는 아파트·오피스텔만 */
check('아파트는 KB시세 먼저', H.housePrice({ kb: 50000, pub: 30000, type: 'apt' }), { v: 50000, by: 'kb' });
check('빌라는 KB시세 무시, 공시가격 140%', H.housePrice({ kb: 50000, pub: 30000, type: 'villa' }).v, 42000);
/* 보증료 */
const f = H.check({ dep: 35000, kb: 50000, type: 'apt', metro: true, months: 24 });
check('보증료 = 3.5억 × 0.131% × 730 ÷ 365 (부채비율 77.8%)', [f.rate, f.days, f.fee], [0.131, 730, 917000]);
const s = H.check({ dep: 10000, senior: 16000, pub: 25000, type: 'villa', metro: true, months: 24 });
check('선순위채권 > 주택가격 × 90% × 50% → 10% 할증', [s.sur, s.fee], [true, Math.round(10000 * 10000 * s.rate / 100 * 730 / 365 * 1.1)]);
check('60% 할인', H.check({ dep: 35000, kb: 50000, type: 'apt', metro: true, months: 24, disc: 0.6 }).fee, Math.round(917000 * 0.4));
check('단독·다가구 확인서 없으면 그 구간 최고 요율', H.check({ dep: 10000, pub: 20000, type: 'house', metro: true, multi: true }).rate, 0.172);
check('기준을 넘으면 보증료 계산 안 함', H.check({ dep: 30000, pub: 20000, type: 'villa', metro: true }).fee, null);
check('공시가격·시세가 없으면 판정 보류', H.check({ dep: 20000, type: 'villa', metro: true }).ok, null);
check('계약 시작일을 주면 실제 날수(윤년 포함)', H.daysOf(24, '2027-03-01'), 731);

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `  got=${JSON.stringify(r.got)} want=${JSON.stringify(r.want)}`)));
console.log(`${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
