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


/* 지역 흐름: index.json sgg[구].r 의 up/down 을 실제 이유로 (공개 자료 생성 뒤) */
const IX2 = JSON.parse(JSON.stringify(IX));
IX2.sido[0].r = { mom: 9.5, jr: 51.9, rz: 3.1 };
IX2.sgg['11710'].r = { mom: 26.8, jr: 36.5, rz: 16.3, rzn: 22, apts: 135, up: ['인구 증가', '미분양 물량(재고 대비)'], down: ['구 시세 최근 1년 흐름', '구 전세가율'] };
const f2 = { gs: 14, pg: 0.002, un: 0.0, jb: -0.01, sup: 0.0 };
const rg2 = P.regionText(f2, IX2, '11710', P.gloss());
eq(rg2.real, true, '실제 이유 모드');
eq(rg2.why[0], '최근 1년 구 전체 시세가 +26.8%로 이미 많이 올랐어요(서울 구 중앙값 +9.5%).', '하위권 첫 이유 = 내린 항목(시세 1년)');
has(rg2.why[1], '36.5%로 낮아요(서울 중앙값 51.9%)', '구 전세가율 비교');
has(rg2.why[1], '다만 재건축 단지가 많은 구(재건축 단계 단지 16.3%, 서울 중앙값 3.1%)는 전세가율이 낮게 나오기 쉬워요', '재건축 맥락');
has(rg2.mean, '최근 많이 오른 만큼', '해석 한 줄(많이 오른 구)');
has(rg2.other, '반대로 점수를 받쳐 준 쪽: 최근 1년 인구가 0.2% 늘었어요', '올린 항목은 뒤에');
eq(rg2.ref.join(' '), '앞으로 2년 새 아파트 입주 물량은 거의 없어요. 지역 일자리가 1년 새 1% 줄었어요.', 'up/down 에 없는 지표만 참고 지표');
const line2 = P.regionLine(rg2, '');
eq(line2.indexOf('이미 많이 올랐어요') < line2.indexOf('동네가 나쁘다는') && line2.indexOf('동네가 나쁘다는') < line2.indexOf('참고 지표:'), true, '순서: 이유 → 해석 → 참고 지표');
not(line2, '중앙값(여러 값을', '괄호 안 이중 풀이 없음');
const line1 = P.regionLine(P.regionText(f2, IX, '11710', P.gloss()), '');
has(line1, '참고 지표: 앞으로 2년 새 아파트 입주 물량은 거의 없어요.', 'r 없을 때(배포 전) 예전 동작');
not(line1, '이미 많이 올랐어요', 'r 없을 때 이유 문장 없음');
IX2.sgg['11710'].r.up = []; IX2.sgg['11710'].r.down = [];
eq(P.regionText(f2, IX2, '11710', P.gloss()).real, false, 'up/down 비면 예전 동작');
IX2.sgg['11110'].r = { mom: 1.0, jr: 60, rz: 0, up: ['구 시세 최근 1년 흐름'], down: ['일자리 밀집도(인구 대비)'] };
const rg3 = P.regionText({ gs: 95 }, IX2, '11110', P.gloss());
eq(rg3.pos, '상위권', '상위권');
has(rg3.why[0], '+1.0%로 덜 올랐어요', '상위권 이유 = 올린 항목');
has(rg3.other, '다만 점수를 낮춘 쪽: 인구 대비 일자리 수가 점수를 낮췄어요', '상위권 반대쪽');

/* 근거 등급 */
const EV = { sido: { s00: {
  jr: { '0': { n: 1406, ex: 2.26, hit: 57, per: [['202410', 622, 4.79, 66], ['202310', 480, 4.2, 60], ['202210', 304, -5.6, 30]] } },
  sch: { '2': { n: 4000, ex: 0.6, hit: 52, per: [['202410', 1000, 0.6, 52]] } },
  rel: { '4': { n: 1973, ex: 2.8, hit: 60, per: [['202410', 633, 4.6, 70], ['202310', 488, 7.5, 80], ['202210', 312, 0.7, 50], ['202110', 540, -2.1, 30]] } },
  mom: { '4': { n: 120, ex: -3.0, hit: 40, per: [['202410', 40, -3, 40], ['202310', 40, -3, 40], ['202210', 40, -3, 40]] } },
  dd: { '1': { n: 2000, ex: -0.02, hit: 50, per: [] } } } } };
const eb = { jr: 0, sch: 2, rel: 4, mom: 4, dd: 1 };
const ej = P.evid(EV, 's00', eb, 'jr', '서울', P.gloss());
eq(ej.text, '과거 같은 조건(전세가율 서울 단지 중 가장 낮은 20%) 단지 1,406건이 2년 뒤 같은 구 평균보다 평균 2.3%p(퍼센트포인트: 두 비율의 차이) 더 올랐어요(10건 중 6건 더 오름).', '근거 한 줄');
eq(ej.grade, '근거 보통', '시기 방향 엇갈림(2/3) → 보통');
eq(P.evid(EV, 's00', eb, 'sch', '서울').grade, '영향 작음', '|ex|<1 → 영향 작음');
eq(P.evid(EV, 's00', eb, 'rel', '서울').grade, '근거 강함', '4시기 중 3시기 같은 방향 + n 충분 → 기준 경계(75%) 통과');
eq(P.evid(EV, 's00', eb, 'mom', '서울').grade, '근거 보통', '사례 수 적으면 강함 아님');
has(P.evid(EV, 's00', eb, 'dd', '서울').text, '같은 구 평균보다 거의 같게 올랐어요', '차이 0 문구');
eq(P.evid(EV, 's00', eb, 'rail', '서울'), null, '구간 없으면 없음');
eq(P.evid(null, 's00', eb, 'jr', '서울'), null, '자료 없으면 없음(배포 전)');
const eh = P.evHtml(ej, false), ehf = P.evHtml(ej, true);
has(eh, '근거 보통', '무료: 등급'); not(eh, 'jp-per', '무료: 시기별 없음');
has(ehf, '2022년 10월부터 2년: 304건, 5.6%p 덜', '프리미엄: 시기별');
not(ehf + eh, '300', '등급 기준 숫자 노출 없음'); not(ehf + eh, '75%', '등급 기준 비율 노출 없음');

/* 일정 지연 문구(엔진 schedule.py 와 같은 규칙) */
eq(P.delayText({ orig: '202412', cur: '202709', orig_s: '2024', cur_s: '2027-09', delay: 33, state: 'postponed' }, '개통'), '당초 2024년 개통 목표 → 현재 2027년 9월 예정(약 2년 9개월 늦어짐)', '연기 발표');
eq(P.delayText({ orig: '202512', cur: '202512', orig_s: '2025', cur_s: '2025', delay: 10, state: 'overdue' }), '당초 2025년 목표 → 아직 공식 기록이 없어요(목표보다 약 10개월 지남)', '목표 경과 자동 지연');
eq(P.delayText({ orig: '202106', cur: '202106', orig_s: '2021-06', cur_s: '2021-06', actual: '202307', delay: 25, state: 'done_late' }, '개통'), '당초 2021년 6월 개통 목표 → 실제 2023년 7월(약 2년 늦어짐)', '실제 지연');
eq(P.delayText({ orig: null, cur: '202711', cur_s: '2027-11', state: 'planned' }), '2027년 11월 예정(당초 목표 미확인)', '당초 모름');
eq(P.delayText({ state: 'cancel' }, '개통'), '개통 공식 취소', '취소');
eq(P.unitsKo(38000), '3만 8천', '가구 수'); eq(P.unitsKo(9000), '9천', '가구 수 천'); eq(P.unitsKo(74736), '약 7만 5천', '가구 수 반올림');

/* 생활권 대규모 공급 문구 */
const SPD = { zones: { changneung: { n: '고양창릉(3기 신도시)', u: 38000, st: 2, h: [['201905', 'ann'], ['202003', 'desig'], ['202112', 'sale']], plan: '202712',
    dl: { orig: '202710', cur: '202712', orig_s: '2027-10', cur_s: '2027-12', actual: null, delay: 2, state: 'postponed' }, src: ['https://example.org/a'] },
  daegok: { n: '고양대곡역세권 공공주택지구', u: 9000, st: 1, h: [['202411', 'ann']], plan: '2031', src: ['https://example.org/b'] } },
  ring: { life: { sale: { n: 12, ex: -1.4, sig: false } }, near: { ann: { n: 20, ex: 0.6, sig: false } } } };
const sl = P.supplyLines({ sl: [['daegok', 'n', 0], ['changneung', 'l', 0]] }, SPD, null);
eq(sl.length, 2, '공급 두 줄');
eq(sl[1][1], '같은 생활권 대규모 공급: 고양창릉(3기 신도시) 3만 8천 가구 — 2019년 발표 → 2020년 지구 지정 → 2021년 첫 분양·사전청약 → 첫 입주: 당초 2027년 10월 목표 → 현재 2027년 12월 예정(약 2개월 늦어짐). 과거 비슷한 단계(분양·착공)의 대규모 공급 같은 생활권에 있던 단지는 이후 2년 같은 구 평균보다 평균 1.4%p 덜 올랐어요(사례 12건, 차이가 뚜렷하지는 않아요). 점수에는 아직 넣지 않았어요(과거 영향이 뚜렷하지 않아서) · 참고 정보.', '생활권 문구(강선마을 예)');
has(sl[0][1], '가까운 공공택지 공급: 고양대곡역세권 공공주택지구 9천 가구 — 2024년 발표 → 첫 입주 목표 2031년.', '가까운 소규모 지구');
not(sl.map(x => x[1]).join(' '), 'km', '거리 숫자 없음');
has(P.supplyLines({ sl: [['changneung', 'n', 1]] }, SPD, null)[0][1], '점수에 반영돼요', '점수 반영 표시');
eq(P.supplyLines({ sl: [['nope', 'n', 0]] }, SPD, null).length, 0, '모르는 지구 무시');

/* 1기 신도시 정비 선도지구 */
const RN = { renewal: { labels: { select: '선도지구 선정', zone: '특별정비구역 지정', impl: '사업시행계획 인가' },
  zones: { is_hugok: { town: '일산', n: '후곡마을 3·4·10·15단지', hh: 2564, st: 'select', h: [['202411', 'select']], next: 'zone', far: 300, v: { select: 'official' }, done: '2030',
    dl: { orig: '202512', cur: '202512', orig_s: '2025', cur_s: '2025', delay: 10, state: 'overdue' } } },
  stats: { ilsan: { town: '일산', n_sel: 6, n_oth: 300, sel: 3.1, oth: 1.2, from: '202411', to: '202610' } } } };
const rn = P.renewalLine({ nr: 'is_hugok', vl: 190 }, RN, null, null);
eq(rn.text, '일산 노후계획도시 정비 — 이 단지는 후곡마을 3·4·10·15단지 선도지구에 포함돼요(2024년 11월 선정, 공식 확인됨) · 현재 단계: 선도지구 선정 · 다음 단계 특별정비구역 지정: 당초 2025년 목표 → 아직 공식 기록이 없어요(목표보다 약 10개월 지남) · 정부 목표 입주 2030년 · 일산 기준용적률 300%(보도로 확인), 이 단지 지금 용적률 약 190%. 선정(2024년 11월) 이후 2026년 10월까지 일산 선도지구 단지는 평균 +3.1%, 같은 도시 선정 안 된 노후 단지는 +1.2% 움직였어요(단지·평형 6곳 vs 300곳, 사실 통계 · 점수에는 넣지 않았어요).', '선도지구 문구');
eq(P.renewalLine({}, RN, null, null), null, '선도지구 아님');

console.log(`쉬운 말 문구 검증: ${ok}개 통과, ${bad}개 실패`);
process.exit(bad ? 1 : 0);
