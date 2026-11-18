/* 청약 엔진 자동 검증 — 실행: node tools/chungyak-test.js
   기대값은 「주택공급에 관한 규칙」(2026. 6. 15. 시행) 별표 1(가점 산정)·제28조(가점제·추첨제 비율)를 보고 손으로 계산한 값이다.
   예상 당첨 가점 범위는 데이터 갱신 때 미리 계산되어 notices.json 의 cut 으로 들어오며, 여기서는 그 값을 읽어 진단하는 부분만 확인한다. */
const E = require('../chungyak/cy-engine.js');
const { CY } = E;
const rows = [];
const check = (name, got, want, basis) => rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want, basis });
const base = o => Object.assign({ own: false, birth: '', married: false, marDate: '', soldDate: '', deps: 0, accDate: '', noAcc: false, spAcc: '' }, o);
const REF = '2026-11-18';

/* ---------- 1. 가점 (별표 1) ---------- */
let a = base({ birth: '1985-03-10', married: true, marDate: '2012-05-01', deps: 3, accDate: '2010-01-15' });
let r = CY.total(a, REF);
check('30세 전 혼인: 혼인신고일부터 14년 6개월 → 무주택 30점', r.h.pts, 30, '2 + 2×14 = 30');
check('부양가족 3명 → 20점', r.d.pts, 20, '5 + 5×3');
check('통장 16년 10개월 → 17점(15년 이상)', r.c.pts, 17, '15년 이상 17점');
check('합계 67점', r.sum, 67, '30 + 20 + 17');

a = base({ birth: '1996-06-01', deps: 0, accDate: '2024-01-01' });
r = CY.total(a, REF);
check('미혼 만 30세 5개월째 → 무주택 1년 미만 2점', r.h.pts, 2, '30세 된 2026.06.01부터 5개월');
check('통장 2년 10개월 → 4점', r.c.pts, 4, '2 + floor(34/12)=2 → 4');
check('합계 11점', r.sum, 11, '2 + 5 + 4');

check('만 30세 미만 미혼 → 무주택 0점', CY.total(base({ birth: '2000-01-01', accDate: '2020-01-01' }), REF).h.pts, 0, '시작 전');
check('유주택 → 무주택 0점', CY.total(base({ own: true, birth: '1980-01-01', accDate: '2020-01-01' }), REF).h.pts, 0, '세대원 주택 소유');
check('처분일부터 재기산 4년 8개월 → 10점', CY.total(base({ birth: '1980-01-01', soldDate: '2022-03-01', accDate: '2020-01-01' }), REF).h.pts, 10, '2 + 2×4');
check('무주택 15년 이상 상한 32점', CY.total(base({ birth: '1970-01-01', accDate: '2020-01-01' }), REF).h.pts, 32, '26년 → 32점');

check('통장 5개월 1점', CY.accScore(5), 1, '6개월 미만');
check('통장 6개월 2점', CY.accScore(6), 2, '6개월~1년 미만');
check('통장 11개월 2점', CY.accScore(11), 2, '6개월~1년 미만');
check('통장 12개월 3점', CY.accScore(12), 3, '1년~2년 미만');
check('통장 179개월 16점', CY.accScore(179), 16, '14년~15년 미만');
check('통장 180개월 17점', CY.accScore(180), 17, '15년 이상');
check('부양가족 6명 35점', CY.dependents(6).pts, 35, '6명 이상');
check('부양가족 8명도 35점', CY.dependents(8).pts, 35, '상한');

a = base({ birth: '1985-01-01', married: true, marDate: '2016-01-01', accDate: '2016-11-01', spAcc: '2024-05-01' });
check('본인 10년(12점) + 배우자 2년 6개월(3점) = 15점', CY.total(a, REF).c.pts, 15, '배우자 2년 이상 3점');
a = base({ birth: '1985-01-01', married: true, marDate: '2016-01-01', accDate: '2010-01-01', spAcc: '2020-01-01' });
check('본인 17점 + 배우자 3점 → 17점 한도', CY.total(a, REF).c.pts, 17, '합계 17점 한도');

/* ---------- 2. 몇 년 뒤 가능한지 ---------- */
a = base({ birth: '1996-06-01', deps: 0, accDate: '2024-01-01' });   // 지금 11점, 해마다 +3(무주택 +2, 통장 +1)
check('11점 → 20점: 3년 뒤', E.yearsTo(a, REF, 20), 3, '11 + 3×3 = 20');
check('이미 넘은 목표 → 0년', E.yearsTo(a, REF, 10), 0, '');
check('유주택·부양 0명·통장 17점 → 40점은 15년 안 불가', E.yearsTo(base({ own: true, birth: '1980-01-01', accDate: '2000-01-01' }), REF, 40), null, '0 + 5 + 17 = 22 고정');

/* ---------- 3. 가점제·추첨제 비율 (제28조 제2항·제4항) ---------- */
check('투기과열 60㎡ 이하', E.lottery(['투기과열지구', '조정대상지역'], 0, '서울특별시').txt, '가점제 40% · 추첨제 60%', '제28조 제2항');
check('투기과열 60~85㎡', E.lottery(['투기과열지구'], 1, '서울특별시').txt, '가점제 70% · 추첨제 30%', '제28조 제2항');
check('투기과열 85㎡ 초과', E.lottery(['투기과열지구', '조정대상지역'], 2, '서울특별시').txt, '가점제 80% · 추첨제 20%', '제28조 제4항');
check('청약과열(조정) 85㎡ 초과', E.lottery(['조정대상지역'], 2, '경기도').txt, '가점제 50% · 추첨제 50%', '제28조 제4항');
check('그 밖의 지역 85㎡ 초과 → 전부 추첨', E.lottery([], 2, '울산광역시').noGajum, true, '제28조 제4항 본문');
check('그 밖의 지역 85㎡ 이하', E.lottery([], 1, '경기도').txt, '가점제 40% 이하(시장·군수·구청장 공고) · 나머지 추첨제', '제28조 제2항');
check('수도권 공공주택지구 60㎡ 이하', E.lottery(['공공주택지구'], 0, '경기도').txt, '가점제 40% · 추첨제 60%', '제28조 제2항');
check('지방 비규제는 75% 무주택 우선 안내 없음', E.lottery([], 1, '경상북도').note.length, 0, '제28조 제8항: 규제지역·수도권·광역시');
check('광역시는 75% 무주택 우선 안내', E.lottery([], 1, '부산광역시').note.length, 1, '제28조 제8항');

/* ---------- 4. 미리 계산된 예상 범위(cut) 읽기 ---------- */
const NC = { no: 'X1', cut: [{ band: 0, lo: 45, hi: 55, avg: 54, scope: '같은 시·도', nCx: 5, nRows: 5, from: '202609', to: '202609' }, { band: 1, insufficient: true, nCx: 2, nRows: 3 }, { band: 2, insufficient: true, nCx: 0, nRows: 0, none: true }] };
p = E.cutOf(NC, 0);
check('cut 읽기: 범위 45~55, 평균 54', [p.ok, p.lo, p.hi, p.avg], [true, 45, 55, 54], '');
check('cut 읽기: 근거 요약(비교 범위·단지 수·기간)', [p.scope, p.nCx, p.nRows, p.from, p.to], ['같은 시·도', 5, 5, '202609', '202609'], '');
check('cut 읽기: 자료 부족', E.cutOf(NC, 1), { ok: false, nRows: 3, nCx: 2, none: false }, '');
check('cut 읽기: 시·도 자료 없음', E.cutOf(NC, 2).none, true, '');
check('새 필드가 없는 예전 데이터 → null(준비 중)', E.cutOf({ no: 'Y' }, 0), null, '배포 전 데이터');
check('해당 면적대 cut 없음 → null', E.cutOf({ cut: [] }, 1), null, '');
check('공개 엔진에 추정 함수·내부 값 없음', [typeof E.predict, typeof E.P_], ['undefined', 'undefined'], '비공개 엔진으로 이전');
check('진단: 56점 ≥ 위쪽 55 → 가능성 높음', E.diag(56, { ok: true, lo: 45, hi: 55 }).g, 'hi', '');
check('진단: 50점 → 경합, 5점 차이', E.diag(50, { ok: true, lo: 45, hi: 55 }), { g: 'mid', need: 5 }, '');
check('진단: 40점 → 낮음, 하단까지 5점 부족', E.diag(40, { ok: true, lo: 45, hi: 55 }).need, 5, '');
check('진단: 자료 부족이면 진단 없음', E.diag(40, { ok: false }), null, '');

/* ---------- 5. 특별공급 판정 (제40·41·43·46조, 신생아) ---------- */
const e0 = { sido: '경기도', reg: 'n', kind: 'p', size: 0, dep: '300', cnt: '', head: 'y', win: 'n', house: '0', ever: 'y', kids: '1', baby: 'y', tax: 'y', old: 'n' };
a = base({ birth: '1993-01-01', married: true, marDate: '2023-03-01', deps: 2, accDate: '2020-01-01' });
let el = E.eligibility(a, e0, CY.d8(REF));
const g = id => el.find(x => x.id === id).g;
check('민영 1순위 수도권 비규제: 가입 82개월·예치금 300만 → 결격 없음, 가입기간 연장 공고 확인 필요', g('rank1'), 'chk2', '제28조: 12개월(시·도지사 24개월까지 연장 가능), 경기 85㎡ 이하 200만원');
check('비수도권 비규제 1순위(6개월) → 가능성 있음', E.eligibility(a, Object.assign({}, e0, { sido: '경상북도' }), CY.d8(REF)).find(x => x.id === 'rank1').g, 'ok', '제28조: 6개월');
check('신혼부부(혼인 3년 8개월) → 해당 가능(소득 확인 필요)', g('new'), 'chk2', '제41조: 7년 이내');
check('다자녀: 자녀 1명 → 어려움', g('multi'), 'no', '제40조: 2명 이상');
check('노부모 부양: 해당 없음 → 어려움', g('old'), 'no', '제46조');
check('신생아: 2세 미만 자녀 있음 → 해당 가능(소득 확인)', g('baby'), 'chk2', '2세 미만');
check('생애최초: 무주택 이력 없음·소득세 5년 → 해당 가능(소득 확인)', g('first'), 'chk2', '제43조');
let best = E.bestSpecial(el, a, e0, 30);
check('먼저 살펴볼 유형 1순위: 신생아', best[0].id, 'baby', '혼인 여부 무관·2세 미만 자녀');
check('먼저 살펴볼 유형에 어려움(다자녀·노부모) 제외', best.map(x => x.id).sort(), ['baby', 'first', 'new'], '');
el = E.eligibility(base({ birth: '1993-01-01', married: true, marDate: '2016-01-01', deps: 2, accDate: '2020-01-01' }), Object.assign({}, e0, { baby: 'n', kids: '3' }), CY.d8(REF));
check('혼인 10년 → 신혼부부 어려움', el.find(x => x.id === 'new').g, 'no', '7년 초과');
check('자녀 3명 → 다자녀 해당 가능', el.find(x => x.id === 'multi').g, 'chk2', '2명 이상');
check('자녀 3명이면 다자녀가 먼저', E.bestSpecial(el, a, Object.assign({}, e0, { kids: '3' }), 30)[0].id, 'multi', '');
el = E.eligibility(base({ birth: '1975-01-01', deps: 4, accDate: '2005-01-01' }), Object.assign({}, e0, { kids: '0', baby: 'n', old: 'y', ever: 'n' }), CY.d8(REF));
check('노부모 부양 3년·세대주·무주택 → 가능성 있음', el.find(x => x.id === 'old').g, 'ok', '제46조');
check('과거 주택 소유 이력 → 생애최초 어려움', el.find(x => x.id === 'first').g, 'no', '제43조');
check('유주택 세대 → 신혼부부 어려움', E.eligibility(base({ own: true, birth: '1993-01-01', married: true, marDate: '2024-01-01', accDate: '2020-01-01' }), Object.assign({}, e0, { house: '1' }), CY.d8(REF)).find(x => x.id === 'new').g, 'no', '무주택세대구성원');

/* ---------- 6. 지역 정리 ---------- */
check('공고 시·도 칸이 주소와 다르면 주소 우선(논산 → 충청남도)', E.noticeSido({ sd: '충청북도', ad: '충청남도 논산시 내동' }), '충청남도', '');
check('옛 이름 광주광역시 → 전남광주통합특별시', E.noticeSido({ sd: '광주광역시', ad: '광주광역시 북구' }), '전남광주통합특별시', '');
check('전국 16개 시·도 목록', E.SIDO.length, 16, '');

const bad = rows.filter(x => !x.ok);
rows.forEach(x => console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : `  → 결과 ${JSON.stringify(x.got)} / 기대 ${JSON.stringify(x.want)} (${x.basis})`}`));
console.log(`\n${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
