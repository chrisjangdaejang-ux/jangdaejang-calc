/* '넘기는 방법 비교' 계산 자동 검증 — 실행: node tools/transfer-test.js
   기대값은 조문 계산식대로 손으로 계산한 값이다 (근거는 tax/transfer-engine.js 머리말).
   - 저가 양도 예시 20억 → 14억, 10억 → 6억: 한경 2026.1.6 '가족에게 싸게 부동산 팔았다간…' 기사 숫자(취득세 2억 4천만, 1억 2천만)와 대조 */
const X = require('../tax/transfer-engine.js');
const T = require('../tax/tax-engine.js');
const E = 1e8, M = 1e4;
const rows = [];
const check = (name, got, want, basis) => rows.push({ ok: got === want, name, got, want, basis });

// 1. 저가 양도 세 기준
let L = X.lowPrice(10 * E, 8 * E);
check('10억→8억: 양도세는 시가로 (차이 2억 ≥ 5%)', L.cgtAtMarket, true, '소득세법 시행령 제167조 제3항');
check('  └ 증여세 없음 (기준 3억 미만)', L.giftValue, 0, '상증령 제26조 제2항 min(30%, 3억)');
check('  └ 취득세 증여의제 아님 (2억 < 3억·30%)', L.acqDeemedGift, false, '지방세법 제7조 제11항 제4호');
check('  └ 취득세 과세표준은 시가 (차이 ≥ 5%)', L.acqAtMarket, true, '지방세법 시행령 제18조의2');
L = X.lowPrice(10 * E, 9.6 * E);
check('10억→9.6억: 차이 4천만 < 5% → 거래가 그대로', L.cgtAtMarket || L.acqAtMarket, false, '5천만 미만');
L = X.lowPrice(5 * E, 3.5 * E);
check('5억→3.5억: 증여세 0 (차액 1.5억 − 기준 1.5억)', L.giftValue, 0, '(시가−대가) − min(30%, 3억)');
check('  └ 그래도 취득세는 증여의제 (차이 30%)', L.acqDeemedGift, true, '2026.1.1 이후 취득분');
L = X.lowPrice(20 * E, 14 * E);
check('20억→14억: 증여재산가액 6억 − 3억 = 3억', L.giftValue, 3 * E, '상증법 제35조');
check('  └ 증여세 없는 최저가 = 시가 − 3억', L.giftFreeMin, 17 * E, '기준금액 min(6억, 3억)');

// 2. 상속세
let I = X.inheritTax({ house: 15 * E, spouse: true });
check('상속 15억, 배우자 있음 → 공제 10억', I.tax, 87300000, '5억×20%−1천만=9천만, 신고공제 3%');
I = X.inheritTax({ house: 15 * E });
check('상속 15억, 배우자 없음 → 일괄공제 5억', I.tax, 232800000, '10억×30%−6천만=2.4억 × 97%');
I = X.inheritTax({ house: 10 * E, cohab: true });
check('상속 10억 + 동거주택 상속공제 6억 → 0원', I.tax, 0, '제23조의2, 제24조 한도');
I = X.inheritTax({ house: 10 * E, prior: 3 * E, priorDed: 5000 * M });
check('사전증여 3억 합산, 한도 10.5억', I.limit, 10.5 * E, '제24조: 13억 − (3억 − 5천만)');
check('  └ 상속세 (증여세 산출세액 4천만 공제)', I.tax, 135800000, '8억×30%−6천만=1.8억 − 4천만 = 1.4억 × 97%');
I = X.inheritTax({ house: 5.004 * E });
check('과세표준 50만 원 미만 → 0원', I.tax, 0, '제25조 제2항');

// 3. 상속 취득세 (과세표준 = 공시가격)
let A = X.inheritAcqTax({ std: 6 * E });
check('상속 취득세 공시 6억 2.8% + 교육 0.16%', A.total, 17760000, '지방세법 제11조 제1항 제1호');
A = X.inheritAcqTax({ std: 6 * E, oneHouse: true });
check('  └ 상속으로 1가구 1주택 0.8% + 0.16%', A.total, 5760000, '지방세법 제15조 제1항');
check('공시가격 없으면 계산 안 함', X.inheritAcqTax({ std: 0 }), null, '숫자 지어내기 금지');

// 4. 네 가지 비교 — 한경 기사 숫자 대조 (20억 → 14억, 조정대상지역 다주택자)
const base = { today: '2026-11-20', market: 20 * E, std: 14 * E, over85: false, adjNow: true,
  owner: { acqDate: '2016-01-01', acqPrice: 8 * E, expenses: 0, residMonths: 0, houses: 2, acqAdj: true, saleAdj: true },
  child: { minor: false, houses: 0, prior: 0 }, low: { price: 14 * E }, gift: { debt: 0 }, inh: {} };
let C = X.compareTransfer(base);
const low = C.paths.find(p => p.key === 'low');
check('20억→14억 자녀 증여세', low.recv.items[0].v, 38800000, '2.5억×20%−1천만=4천만 × 97%');
check('  └ 자녀 취득세 12% + 교육 0.4% (기사: 취득세 2억 4천만)', low.recv.items[1].v, 248000000, '20억 × 12.4%');
check('  └ 부모 양도세는 시가 20억으로', low.cgt.gain, 12 * E, '차익 20억 − 8억');
C = X.compareTransfer(Object.assign({}, base, { market: 10 * E, std: 7 * E, low: { price: 6 * E } }));
check('10억→6억 자녀 취득세 (기사: 1억 2천만)', C.paths.find(p => p.key === 'low').recv.items[1].v, 124000000, '10억 × (12% + 0.4%)');

// 5. 1주택 부모, 10억, 10년 보유·거주, 서울
const one = { today: '2026-11-20', market: 10 * E, std: 6 * E, over85: false, adjNow: true,
  owner: { acqDate: '2016-01-01', acqPrice: 5 * E, expenses: 0, residMonths: 120, houses: 1, acqAdj: true, saleAdj: true },
  child: { minor: false, houses: 0, prior: 0 }, low: { price: 8 * E }, gift: { debt: 0 }, inh: {} };
C = X.compareTransfer(one);
const P = k => C.paths.find(p => p.key === k);
check('제3자 양도: 1세대1주택 12억 이하 비과세', P('sell').owner.total, 0, '소득세법 제89조');
check('저가 8억: 부모 양도세 0 (시가 10억으로 봐도 비과세)', P('low').owner.total, 0, '제101조 + 제89조');
check('  └ 자녀 취득세: 시가 10억 과세표준, 1주택 3% + 0.3%', P('low').recv.items[1].v, 33000000, '지방세법 제10조의3, 제11조 제1항 제8호');
check('  └ 자녀가 준비할 돈 = 대금 + 세금', P('low').cash, 8 * E + 33000000, '');
check('증여: 증여세 10억 성년 자녀', P('gift').recv.items[0].v, 218250000, '9.5억×30%−6천만=2.25억 × 97%');
check('  └ 증여 취득세 1세대1주택자의 자녀 증여 3.8%', P('gift').recv.items[1].v, 38000000, '시행령 제28조의6 중과 제외');
check('상속: 상속세 + 상속 1주택 취득세', P('inherit').family, 87300000 + 5760000, '9천만×97% + 공시 6억×0.96%');
check('  └ 해마다 보유세(재산세, 종부세 0)', P('inherit').hold.total, T.propertyTax({ price: 6 * E, one: true }).total, '공시 6억 1주택');
check('세금 합계가 가장 적은 방법', C.best.key, 'sell', '비과세라 0원');

// 6. 공시가격이 없으면 중과 여부를 지어내지 않음
C = X.compareTransfer(Object.assign({}, base, { std: 0 }));
check('공시가격 없음 + 조정 다주택 → 증여 취득세 비움', C.paths.find(p => p.key === 'gift').recv.items[1].v, null, '');
check('  └ 그 방법은 합계도 비움', C.paths.find(p => p.key === 'gift').family, null, '');

// 7. 부담부증여: 다주택 부모, 채무 3억 → 채무 부분 양도세
C = X.compareTransfer(Object.assign({}, base, { market: 8 * E, std: 5.5 * E, gift: { debt: 3 * E }, owner: Object.assign({}, base.owner, { acqPrice: 4 * E, houses: 2 }) }));
const gp = C.paths.find(p => p.key === 'gift');
check('부담부증여 증여세 (8억 − 채무 3억)', gp.recv.items[0].v, T.giftTax({ value: 8 * E, debt: 3 * E, rel: 'child' }).tax, '제47조 제1항');
check('  └ 채무 부분 양도차익 3억 − 4억×3/8', gp.debtCgt.gain, 1.5 * E, '시행령 제159조');

// 8. 상속공제 입력(2026-11-21): 자녀 4명·미성년 2명이면 기초+인적이 일괄 5억보다 커져 상속세가 줄어듦 (상증법 제18조·제20조·제21조)
const many = Object.assign({}, one, { market: 20 * E, std: 12 * E, inh: { children: 4, minorAges: [3, 5], funeral: 0 } });
C = X.compareTransfer(many);
const ih = C.paths.find(p => p.key === 'inherit').inh;
check('상속: 자녀 4·미성년 3·5세 → 공제 7억(일괄 5억보다 큼)', ih.lump, 7 * E, '2억 + 4×5천만 + (16+14)×1천만');
check('  └ 과세표준 = 20억 − 장례비 500만 − 7억', ih.base, 1295000000, '제14조·시행령 제9조(최소 500만)');
check('  └ 카드 설명에 기초+인적 표시', /기초 2억 \+ 인적/.test(C.paths.find(p => p.key === 'inherit').recv.items[0].sub), true, '');
C = X.compareTransfer(Object.assign({}, one, { market: 30 * E, std: 18 * E, inh: { spouse: true, spouseGets: 15 * E, children: 2 } }));
check('상속: 배우자 실제 15억 → 법정상속분 30억×3/7 한도', C.paths.find(p => p.key === 'inherit').inh.spouseDed, 1285714285, '제19조, 민법 제1009조');
C = X.compareTransfer(Object.assign({}, base, { low: { price: 14 * E } }));
check('저가 양도(20억→14억): 10년 안 상속 시 더해지는 증여재산 3억 안내', C.paths.find(p => p.key === 'low').cautions.some(c => /이익 3억 원이 상속재산에 다시 더해/.test(c)), true, '상증법 제13조 제1항');

const pad = (s, n) => { s = String(s); let w = 0; for (const ch of s) w += ch.charCodeAt(0) > 255 ? 2 : 1; return s + ' '.repeat(Math.max(0, n - w)); };
let fail = 0;
rows.forEach((x, i) => { if (!x.ok) fail++; console.log(pad(x.ok ? 'PASS' : 'FAIL', 5) + pad(i + 1, 4) + pad(x.name, 52) + pad(typeof x.got === 'number' ? x.got.toLocaleString() : x.got, 14) + (x.ok ? '' : ' 기대 ' + x.want) + '  ' + x.basis); });
console.log(`\n${rows.length - fail}/${rows.length} 통과`);
process.exit(fail ? 1 : 0);
