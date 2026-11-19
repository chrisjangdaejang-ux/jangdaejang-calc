/* 리포트 '쉬운 말' 문구 도우미(assets/plain-words.js) 검증: node tools/plain-test.js */
require('../assets/plain-words.js');
const P = globalThis.JDJ_PLAIN;
let ok = 0, bad = 0;
const eq = (a, b, m) => { if (a === b) ok++; else { bad++; console.log('FAIL', m, '\n  got:', a, '\n  exp:', b); } };
const has = (a, b, m) => eq(String(a).includes(b), true, m + ' — "' + b + '" in "' + a + '"');
const not = (a, b, m) => eq(String(a).includes(b), false, m + ' — no "' + b + '" in "' + a + '"');

eq(P.won(392705), '39억 2,705만원', '금액 한국식');
eq(P.won(390000), '39억원', '금액 억 단위');
eq(P.won(8500), '8,500만원', '금액 만원');
eq(P.eokR(392705), '39억', '대략 금액 10억 이상');
eq(P.eokR(53450), '5억 3,000만원', '대략 금액 10억 미만');
eq(P.rank(80), '100곳 중 상위 20등쯤', '점수 상위');
eq(P.rank(38), '100곳 중 하위 38등쯤', '점수 하위');
eq(P.rank(100), '100곳 중 상위 1등쯤', '점수 최고');
eq(P.J('송파구', '은', '는'), '송파구는', '조사 받침 없음');
eq(P.J('양천구청', '은', '는'), '양천구청은', '조사 받침 있음');
eq(P.more(1.6), '1.6%p 더', '%p 더');
eq(P.more(-0.5), '0.5%p 덜', '%p 덜');
const r = P.regionRank(14, 25); eq(r.r, 22, '구 순위'); eq(r.pos, '하위권', '하위권');
eq(P.regionRank(94, 25).pos, '상위권', '상위권');

const IX = { sido: [{ name: '서울특별시', short: '서울' }], sgg: {} };
['11110', '11140', '11170', '11710', '11680'].forEach((c, i) => IX.sgg[c] = { sido: '서울특별시', name: ['종로구', '중구', '용산구', '송파구', '강남구'][i] });
const G = P.gloss();
const rg = P.regionText({ gs: 14, pg: -0.0094, un: 0.0, jb: -0.003, sup: 0.01 }, IX, '11710', G);
eq(rg.fact, '서울 5개 구 중 송파구는 앞으로 2년 지역 흐름 점수가 하위권이에요(약 4위).', '지역 흐름 사실');
has(rg.mean, '동네가 나쁘다는 뜻이 아니라', '지역 흐름 해석');
not(rg.why.join(' '), '재고 대비', '내부 기준 표현 없음');
has(rg.why.join(' '), '인구가 0.9% 줄었어요', '인구 동사형');

const G2 = P.gloss();
const jt = P.jrText({ jr: 0.12, rz: { lv: 5 } }, 392705, { rz: [0.26, 273], all: 0.47 }, '서울', G2, 1978);
has(jt, '전세가율(집값 대비 전셋값 비율) 12%', '전세가율 첫 풀이');
has(jt, '재건축 단지는 건물이 낡아 전셋값이 낮은 편이에요', '재건축 맥락');
has(jt, '39억 중 약 35억을 내 돈과 대출로 마련해야 해요', '내 돈 몫');
has(jt, '서울 재건축 단지 273곳(평형별)의 전세가율 중앙값(', '재건축 중앙값 비교 + 중앙값 첫 풀이');
eq(G2('전세가율'), '전세가율', '두 번째부터는 풀이 없음');
eq(P.gloss()('평당'), '평당(전용 3.3㎡당)', '평당 첫 1회 병기');

eq(P.hzLabel({ oos_all: [1, 2, 3, 4], oos_hit: 4, oos_avg: 1.09 }), '과거 시험 4번 중 4번 통과', '통과');
eq(P.hzLabel({ oos_all: [1, 2, 3, 4], oos_hit: 1, oos_avg: -0.39 }), '과거 시험 4번 중 1번 통과 · 참고만', '미달 참고만');
eq(P.hzLabel({ oos_all: [1], oos_hit: 1, oos_avg: 4.9 }), '과거 시험 1번뿐 · 참고만', '1번뿐');
const ck = P.checkText({ oos_all: [{ t0: '202110' }, { t0: '202210' }, { t0: '202310' }, { t0: '202410' }], oos_hit: 4, oos_avg: 1.09 }, 2, P.gloss());
has(ck, '2021·2022·2023·2024년 4개 시점', '검증 시점');
has(ck, '4번 모두 그랬어요', '검증 결과');
has(ck, '시장 전체가 내리면 점수가 높은 단지도 내릴 수 있어요', '정보성 문장');
not(ck, '반드시 오른다는 뜻은 아니에요', '변명성 반복 없음');
eq(P.ddText(0.14), '최근 3년 하락기에 구 평균보다 14%p 덜 내렸어요', '하락기 동사형');
eq(P.rcText(-0.05), '직전 최고가에서 내린 뒤 구 평균보다 5%p 덜 회복했어요', '고점 회복 동사형');
not(P.momText(0.12), '추격', '권유성 표현 없음');
has(P.schText(-0.021, ['잠신중학교'], P.gloss()), '떠난 학생이 전학 온 학생보다 많아요. 순전입률(', '학군 쉬운 말');

console.log(`쉬운 말 문구 검증: ${ok}개 통과, ${bad}개 실패`);
process.exit(bad ? 1 : 0);
