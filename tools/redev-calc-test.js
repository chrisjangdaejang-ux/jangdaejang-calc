/* 분담금·수익 계산기·판정 카드·구역 페이지 공용 함수(assets/redev-calc.js) + 구역 페이지 틀(villa/z/index.html) 확인: node tools/redev-calc-test.js
   ① 금액 글자 읽기 ② 계산식(권리가액·분담금·총 투입금·처음 현금) — 빠진 칸이면 계산하지 않음 ③ 민감도 ④ 완공 뒤 비교 기준은 실거래로만(직거래·1년 밖·3건 미만 제외)
   ⑤ 실거주 의무·지위 양도 판정(길잡이 guide-redev limit 과 같은 결론) ⑥ 주소 조각(엔진 seo_pages.zone_slug 와 같은 규칙, 겹치면 -2) ⑦ 개월 수
   ⑧ 틀: 엔진이 바꾸는 표시가 모두 있음 ⑨ 화면 문구: 경쟁 서비스 이름·투자 권유 없음, 숨은 가정값(기대 차익) 없음 */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('../assets/redev-calc.js');
const GR = require('../assets/guide-redev.js');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let ok = 0, bad = 0;
const eq = (a, b, m) => { const s = JSON.stringify(a) === JSON.stringify(b); if (s) ok++; else { bad++; console.log('FAIL', m, '\n  got:', JSON.stringify(a), '\n  exp:', JSON.stringify(b)); } };
const near = (a, b, m) => eq(Math.abs(a - b) < 1e-6, true, m + ` (${a} ≈ ${b})`);
const has = (a, b, m) => eq(String(a).includes(b), true, m + ' — "' + b + '"');
const not = (a, b, m) => eq(String(a).includes(b), false, m + ' — 없어야 함 "' + b + '"');

/* ① 금액 */
eq(['3억', '3억 2,000', '2억5천', '30,000', '1.5억', '5000만', 'abc', '', null].map(C.money), [30000, 32000, 25000, 30000, 15000, 5000, null, null, null], '금액 글자 → 만원');

/* ② 계산식 */
const I = { appr: 30000, ratio: 100, mem: 80000, buy: 60000, loan: 20000, rate: 4, months: 60, dep: 10000, tax: 700 };
const r = C.calc(I);
eq(r.ok, true, '다 넣으면 계산');
near(r.right, 30000, '권리가액 = 감정가 × 비례율');
near(r.prem, 30000, '프리미엄 = 매수가 − 권리가액');
near(r.burden, 50000, '분담금 = 조합원 분양가 − 권리가액');
near(r.interest, 20000 * 0.04 * 5, '기간 이자 = 대출 × 이자율 × 개월/12');
near(r.total, 60000 + 50000 + 4000 + 700, '총 투입금 = 매수가 + 분담금 + 이자 + 취득세 등');
near(r.cash, 60000 - 20000 - 10000 + 700, '처음 필요한 현금 = 매수가 − 대출 − 전세 + 취득세 등');
eq(r.steps.map(s => s.k), ['권리가액', '프리미엄(P)', '분담금', '기간 이자', '총 투입금', '처음 필요한 현금'], '계산식 단계 이름');
has(r.steps[0].f, '감정평가액 3억 원 × 비례율 100%', '계산식에 넣은 값 그대로');
const r2 = C.calc({ appr: 30000, ratio: 120, mem: 30000, prem: 10000 });
near(r2.right, 36000, '비례율 120%'); near(r2.buy, 46000, '프리미엄 방식: 매수가 = 권리가액 + P'); near(r2.burden, -6000, '권리가액이 더 크면 환급(음수)');
eq(r2.steps[2].k, '환급금', '음수 분담금 이름은 환급금');
const r3 = C.calc({ appr: 30000, mem: 80000, buy: 60000 });
eq([r3.ok, r3.miss], [false, ['비례율']], '비례율 빠지면 계산하지 않음(기본값 없음)');
eq(C.calc({ appr: 30000, ratio: 100, mem: 80000 }).miss, ['매수가 또는 프리미엄'], '매수가·프리미엄 둘 다 없으면 계산 안 함');
eq(C.calc({}).miss.length, 4, '아무것도 없으면 4칸 안내');

/* ③ 민감도 */
const S = C.sens(I);
eq(S.map(x => x.t), ['비례율 90%', '넣은 값 그대로', '비례율 110%', '조합원 분양가 10% 오르면', '조합원 분양가 10% 내리면'], '민감도 줄');
near(S[0].burden, 80000 - 27000, '비례율 −10%p'); near(S[3].burden, 88000 - 30000, '분양가 +10%');

/* ④ 완공 뒤 비교 기준 — 실거래로만 */
const T = '20261127';
const U = [
  ['11110', '홍파동', '경희궁자이(2단지)', '84㎡대', 84.8, 5, [], 'x', '199', 1, [], [[20261014, 84.9, 3, 260000, 0, 0], [20260723, 84.8, 9, 273000, 0, 1], [20260616, 84.9, 7, 277000, 0, 0], [20260601, 84.8, 2, 200000, 1, 0], [20251101, 84.8, 2, 240000, 0, 0]]],
  ['11110', '평동', '경희궁자이(3단지)', '84㎡대', 84.8, 2, [], 'x', '233', 1, [], [[20261001, 84.9, 3, 250000, 0, 0], [20260901, 84.9, 3, 251000, 0, 0]]]
];
const NB = [{ g: '11110', d: '홍파동', n: '경희궁자이(2단지)', by: 2017, km: 0.3 }, { g: '11110', d: '평동', n: '경희궁자이(3단지)', by: 2017, km: 0.1 }];
const cs = C.comps(U, NB, T);
eq(cs.length, 1, '최근 1년 거래 3건 미만 단지는 뺌');
eq(cs[0].cnt, 3, '직거래·1년 넘은 거래는 셈에서 뺌');
near(cs[0].med, Math.round(273000 / 84.8 * 10) / 10, '㎡당 중간값은 실제 거래로');
eq([cs[0].from, cs[0].to], ['20260616', '20261014'], '거래 기간 표시');
const ar = C.afterRange(cs, 84);
near(ar.lo, cs[0].med * 84, '범위 = ㎡당 중간값 × 받을 면적'); eq(ar.n, 1, '단지 수');
eq(C.afterRange([], 84), null, '실거래 없으면 범위 없음(숫자 만들지 않음)');
eq(C.afterRange(cs, null), null, '면적 없으면 범위 없음');
eq(C.comps(U, NB, 'bad'), [], '오늘 날짜가 없으면 계산 안 함');
eq(C.comps(U, NB, T, 84).length, 1, '받을 면적과 비슷한(±20%) 거래만 — 84㎡ 그대로');
eq(C.comps(U, NB, T, 150).length, 0, '받을 면적과 크기가 다른 거래만 있으면 비교 단지 없음');

/* ⑤ 판정 */
const POL = { policies: [
  { id: 'p1', status: 'active', stage: '시행', types: ['규제지역', '토허'], dir: 'tight', name: '10·15 대책(서울 전역 투기과열지구·토지거래허가구역)', plain: '서울 전역 아파트 토지거래허가', in: ['11', '41290'], src: [['정책브리핑', 'https://www.korea.kr/x']] },
  { id: 'p2', status: 'active', stage: '시행', types: ['토허'], dir: 'tight', name: '압구정·목동 토지거래허가', in: ['11680:압구정동', '11470:목동'], src: [['서울시', 'https://news.seoul.go.kr/x']] },
  { id: 'p3', status: 'active', stage: '시행', types: ['토허'], dir: 'ease', name: '토지거래허가구역 실거주 의무 유예 특례 1년 연장', in: ['11'], src: [['정책브리핑', 'https://www.korea.kr/y']] }
] };
const card = (z, k) => C.rights(POL, z).cards.find(c => c.k === k);
eq(card({ t: 'rb', lv: 5, g: '11680', kind: 'apt' }, 'transfer').v, 'on', '서울 재건축 조합설립인가 뒤 → 제한');
eq(card({ t: 'rb', lv: 4, g: '11680', kind: 'apt' }, 'transfer').v, 'pre', '재건축 추진위 단계 → 제한 전');
eq(card({ t: 'rd', lv: 7, g: '11290' }, 'transfer').v, 'pre', '재개발 사업시행인가 → 관리처분 전이라 제한 전');
eq(card({ t: 'rd', lv: 8, g: '11290' }, 'transfer').v, 'on', '재개발 관리처분인가 → 제한');
has(card({ t: 'rd', lv: 8, g: '11290' }, 'transfer').body, '2018년 1월 24일', '재개발은 부칙 적용 시점 확인 필요');
eq(card({ t: 'rd', lv: 8, g: '26110' }, 'transfer').v, 'free', '투기과열지구 밖 → 이 규칙으로는 제한 없음');
eq(card({ t: 'moa', lv: 5, g: '11290' }, 'transfer').v, 'skip', '모아타운은 판정하지 않음');
eq(card({ t: 'nt', lv: 3, g: '41135' }, 'transfer').v, 'skip', '1기 신도시는 판정하지 않음');
eq(card({ t: 'rd', lv: null, g: '11290' }, 'transfer').v, 'chk', '단계를 모르면 판정 못 함');
eq(card({ t: 'rb', lv: 5, g: '11680', kind: 'apt' }, 'live').v, 'on', '서울 재건축(아파트) → 허가·실거주');
has(card({ t: 'rb', lv: 5, g: '11680', kind: 'apt' }, 'live').body, '유예 특례', '유예 특례 안내');
eq(card({ t: 'rd', lv: 8, g: '11290' }, 'live').v, 'chk', '재개발 빌라는 구 아파트 지정 → 확인 필요');
eq(card({ t: 'rd', lv: 8, g: '11470', dong: '목동' }, 'live').v, 'on', '동 단위 지정이면 빌라도 해당');
eq(card({ t: 'rd', lv: 8, g: '26110' }, 'live').v, 'none', '지정 없으면 none');
eq(!!card({ t: 'rd', lv: 8, g: '11290' }, 'again'), true, '투기과열지구 → 재당첨 제한 안내');
eq(!!card({ t: 'rd', lv: 8, g: '26110' }, 'again'), false, '투기과열지구 밖 → 재당첨 안내 없음');
for (const c of C.rights(POL, { t: 'rd', lv: 8, g: '11290' }).cards) for (const l of c.law || []) eq(/^https:\/\/www\.law\.go\.kr\//.test(l.url), true, '법령 링크는 국가법령정보센터 — ' + c.k);
// 길잡이(guide-redev limit)와 같은 결론
const MAP = { on: 'on', pre: 'pre', free: 'none' };
for (const t of ['rd', 'rb', 'ct', 'dd']) for (let lv = 1; lv <= 10; lv++) for (const g of ['11290', '26110']) {
  const a = card({ t, lv, g, kind: t === 'rb' ? 'apt' : '' }, 'transfer').v, b = GR.limit(POL, { t, g, st: lv }).v;
  eq(MAP[a] || a, b, `지위 양도 판정이 길잡이와 같음 ${t} ${lv}단계 ${g}`);
}

/* ⑥ 주소 조각 — 엔진 seo_pages.zone_slug: re.sub(r'[^0-9A-Za-z가-힣]+', '-', id).strip('-')[:40].strip('-') or 'zone' */
eq(C.slug('11110돈의문2'), '11110돈의문2', '그대로');
eq(C.slug('11290 장위4(재개발)'), '11290-장위4-재개발', '기호 → -');
eq(C.slug('---'), 'zone', '빈 조각 → zone');
eq(C.slug('a'.repeat(39) + ' b'), 'a'.repeat(39), '40자에서 자르고 끝 - 뺌');
eq(C.slugs(['a b', 'a-b', 'a b', 'c']), { 'a b': 'a-b', 'a-b': 'a-b-2', c: 'c' }, '겹치면 목록 순서대로 -2(같은 id 는 한 번)');

/* ⑦ 개월 수 */
eq(C.monthsIn('202405', '2026-11-27'), 30, 'YYYYMM → 개월');
eq(C.monthsIn('2026-05-28', '2026-11-27'), 5, '날짜가 덜 지났으면 내림');
eq(C.monthsIn('', '2026-11-27'), null, '날짜 없으면 null');
eq(C.monthsIn('202701', '2026-11-27'), null, '미래 날짜는 null');

/* ⑧ 구역 페이지 틀: 엔진 _ztpl 이 바꾸는 표시 */
const TPL = read('villa/z/index.html');
for (const re of [/<title>.*?<\/title>/s, /<meta name="description" content="[^"]*">/, /<link rel="canonical" href="[^"]*">/, /<meta property="og:title" content="[^"]*">/,
  /<meta property="og:description" content="[^"]*">/, /<meta property="og:url" content="[^"]*">/, /<script type="application\/ld\+json" id="zld">.*?<\/script>/s,
  /<main class="wrap" id="zmain" data-id="[^"]*">/, /<!--zs-->.*?<!--\/zs-->/s, /<!-- 이 파일은 구역 목록 화면이면서.*?-->\n/s])
  eq(re.test(TPL), true, '틀 표시 ' + re.source.slice(0, 40));
eq((TPL.match(/(?:href|src)="\.\.\/\.\.\//g) || []).length > 8, true, '틀 경로는 ../../ 기준(엔진이 한 단계 깊게 바꿈)');
for (const m of TPL.match(/assets\/[\w.-]+\?v=\d+/g)) eq(fs.existsSync(path.join(__dirname, '..', m.split('?')[0])), true, '틀이 부르는 파일 있음 ' + m);

/* ⑨ 화면 문구 */
const UI = ['assets/redev-zone.js', 'assets/redev-calc.js', 'assets/redev-calc-page.js', 'villa/calc/index.html', 'villa/z/index.html', 'villa/zone/index.html'].map(read).join('\n');
for (const w of ['재개발닷컴', '호갱노노', '리치고', '아실', '직방', '다방', '네이버 부동산', '사세요', '유망']) not(UI, w, '화면 문구');
not(read('assets/premium-report.js'), 'eg.b', '리포트: 비공개 가정 분담금(eg.b) 안 씀');
not(read('buy/report/index.html'), 'eg.b', '맞춤 리포트: 비공개 가정 분담금(eg.b) 안 씀');
not(read('assets/premium-report.js'), '기대 차익', '리포트: 기대 차익 단일 숫자 없음');
has(read('assets/premium-report.js'), '계산식: 같은 구 새 아파트 3.3㎡당 시세 중간값 × 이 평형 전용면적', '리포트: 비교 기준 계산식 공개');
not(read('assets/narrative.js'), "'조합이 생겨 사업 주체가 정해졌어요'", '빌라 카드: 다음 단계 문장에 지금 단계 설명을 섞지 않음');
has(read('villa/zone/index.html'), 'id="fSheet"', '구역 지도: 휴대폰 거르기 시트');
has(read('sw.js'), "'./villa/z/'", '서비스 워커: 구역 페이지');

console.log(`redev-calc-test: ${ok} 통과, ${bad} 실패`);
process.exit(bad ? 1 : 0);
