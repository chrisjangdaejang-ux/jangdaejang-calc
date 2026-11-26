/* 청약 엔진 자동 검증 — 실행: node tools/chungyak-test.js
   기대값은 「주택공급에 관한 규칙」(국토교통부령 제1635호, 2026. 11. 24. 시행) 제28조(가점제·추첨제 비율)·제46조(노부모 부양)와
   별표 1(가점 산정, 2024. 12. 18. 개정 기준)을 보고 손으로 계산한 값이다.
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
check('노부모 부양: 실제로 함께 살아야 함을 안내(2026. 11. 24. 개정 제46조 제1항 — 2026. 12. 1. 공고)', /실제로 함께 살면서/.test(E.eligibility(base({ birth: '1975-01-01', accDate: '2005-01-01' }), { ...e0, pb: '20261201' }, CY.d8(REF)).find(x => x.id === 'old').items.join(' ')), true, '제46조 제1항');
/* 국토교통부령 제1635호 시행일 분기: 부칙 제1조(본문·단서)·제2조, 행정기본법 제7조 */
{ const o1 = E.oldParentRule('20261120'), o2 = E.oldParentRule('2026-12-01'), o0 = E.oldParentRule(null), oD = E.oldParentRule('2026-11-24');
  check('노부모 안내: 공고일 2026-11-20 → 그 전 공고(공고문 기준)', [o1.st, /2026\. 11\. 24\. 전 공고/.test(o1.txt) && /공고문 기준/.test(o1.txt)], ['old', true], '부칙 제1조 본문 — 공포일 시행');
  check('노부모 안내: 공고일 2026-12-01 → 실제로 함께 살아야 함', [o2.st, /실제로 함께 살아야/.test(o2.txt), /2026\. 12\. 1\./.test(o2.txt)], ['new', true, true], '제46조 제1항');
  check('노부모 안내: 2026-11-20 과 2026-12-01 문구가 다름', o1.txt !== o2.txt, true, '');
  check('노부모 안내: 시행일 당일(2026-11-24) 공고도 새 기준', oD.st, 'new', '공포한 날부터 시행');
  check('노부모 안내: 공고일 모르면 두 경우를 함께', [o0.st, o0.txt], ['unk', '2026. 11. 24. 이후 모집공고 단지부터 실제 함께 살아야 해요(그 전 공고는 공고문 기준)'], '');
  const el1 = E.eligibility(base({ birth: '1975-01-01', accDate: '2005-01-01' }), { ...e0, pb: '20261120' }, CY.d8(REF)).find(x => x.id === 'old');
  const el2 = E.eligibility(base({ birth: '1975-01-01', accDate: '2005-01-01' }), { ...e0, pb: '20261201' }, CY.d8(REF)).find(x => x.id === 'old');
  check('노부모 판정: 공고일 2026-11-20 / 2026-12-01 에서 안내(rule)·문구가 달라짐', [el1.rule.st, el2.rule.st, el1.items.join() !== el2.items.join()], ['old', 'new', true], '');
  check('노부모 판정: 공고일이 없으면 기준일(입주자모집공고일)로', E.eligibility(base({ birth: '1975-01-01', accDate: '2005-01-01' }), e0, CY.d8('2026-12-01')).find(x => x.id === 'old').rule.st, 'new', '');
  check('노부모 근거: 부칙 제1조·행정기본법 제7조', /부칙.*제1조/.test(el2.law) && /행정기본법 제7조/.test(el2.law), true, '');
  const p1 = E.depRule('2027-11-24'), p2 = E.depRule('20271125'), p3 = E.depRule('2026-11-26');
  check('부양가족 안내: 2027-11-24 공고 → 지금 기준(바뀌기 전 안내)', [p1.st, p1.txt], ['pre', '2027. 11. 25. 이후 모집공고분부터 부양가족 인정 기준·증빙이 바뀌어요(그 전 공고는 지금 기준)'], '부칙 제2조');
  check('부양가족 안내: 2027-11-25 공고부터 새 기준 안내로 자동 전환', [p2.st, p2.from], ['post', '2027-11-25'], '부칙 제1조 단서 — 공포 후 1년 경과한 날(행정기본법 제7조)');
  check('부양가족 안내: 오늘(2026-11-26)은 바뀌기 전', p3.st, 'pre', '');
  check('부양가족 근거: 부칙 제1조 단서·제2조, 행정기본법 제7조, 출처 주소', /부칙 제1조 단서·제2조/.test(p2.law) && /행정기본법 제7조/.test(p2.law) && p2.src === 'https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=292055', true, '');
  /* 대표 확인(2026. 11. 26.): 2027. 11. 25. 이후 공고는 새 기준으로 계산 — TODO·경고 해제 */
  check('새 기준 확인 완료(verified) · 2027-11-25 이후도 경고 없음', [E.DEP_RULE.verified, p2.needCheck, /계산했어요/.test(p2.txt)], [true, false, true], '부칙 제1조 단서');
  check('2026-11-24 이후 공고: 실제 동거·건강보험자격득실확인서 안내', [!!E.depRule('2026-12-01').now && /실제로 함께 살아야/.test(E.depRule('2026-12-01').now) && /자격득실확인서/.test(E.depRule('2026-12-01').now), E.depRule('2026-11-20').now], [true, ''], '제23조·별표 1(공포일 시행)');
  check('시행 예정 내용: 30세 이상 자녀 3년·해외 90일·요양급여 3년', E.DEP_RULE.changes.length === 3 && /3년 이상/.test(E.DEP_RULE.changes[0]) && /90일/.test(E.DEP_RULE.changes[1]) && /국내/.test(E.DEP_RULE.changes[1]) && /3년으로/.test(E.DEP_RULE.changes[2]), true, '');
  check('출처 링크 4개(원문·연혁·개정 이유·조문)', E.RULE_LINKS.map(x => x[1]), ['https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=292055', 'https://law.go.kr/LSW/lsRvsDocListP.do?chrClsCd=010102&lsId=008243', 'https://www.law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=008243', 'https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1033568277'], '');
  /* 예시: 만 35세 미혼 자녀 2년 동거 → 2027-11-24 공고 인정 / 2027-11-25 공고 불인정 → 5점 낮아짐 */
  { const kid35 = base({ deps: 1, dep: { sp: 0, par: 0, kid: 0, kid30: 1, gk: 0, kid30out: 1, parOut: 0, youngOut: 0 } });
    const t1 = CY.total(kid35, '2027-11-24'), t2 = CY.total(kid35, '2027-11-25');
    check('예시: 35세 미혼 자녀 2년 동거 — 2027-11-24 공고 인정(10점)', t1.d.pts, 10, '종전 규정(부칙 제2조): 30세 이상 자녀 1년 이상');
    check('예시: 35세 미혼 자녀 2년 동거 — 2027-11-25 공고 불인정(5점)', t2.d.pts, 5, '별표 1 개정: 3년 이상');
    check('예시: 가점 합계 5점 낮아짐 · 바뀌기 전 화면에 미리 안내', [t1.sum - t2.sum, /5점 낮아질 수 있어요/.test(t1.d.why)], [5, true], ''); }
  { const fam = d => base({ deps: 4, dep: Object.assign({ sp: 1, par: 1, kid: 2, kid30: 0, gk: 0, kid30out: 0, parOut: 0, youngOut: 0 }, d) });
    check('해외 체류: 부모 90일 초과 → 2027-11-25 공고에서 1명 빠짐', [CY.total(fam({ parOut: 1 }), '2027-11-24').d.pts, CY.total(fam({ parOut: 1 }), '2027-11-25').d.pts], [25, 20], '');
    check('해외 체류 예외: 30세 미만 자녀가 국내에 있으면 인정(youngOut 0) / 지금 해외면 빠짐', [CY.total(fam({}), '2027-11-25').d.pts, CY.total(fam({ youngOut: 1 }), '2027-11-25').d.pts], [25, 20], '');
    check('빠지는 인원은 해당 가족 수를 넘지 않음(배우자는 빠지지 않음)', CY.total(fam({ parOut: 5, youngOut: 9 }), '2027-11-25').d.pts, 10, '배우자 1명만 남음');
    check('질문 답이 없는 예전 저장값도 그대로 계산', CY.total(base({ deps: 3 }), '2027-11-25').d.pts, 20, ''); }
  check('가점 결과에 부양가족 기준 안내가 붙음(기준일로 분기)', [CY.total(base({}), '2027-11-24').d.rule.st, CY.total(base({}), '2027-11-25').d.rule.st], ['pre', 'post'], ''); }
check('신생아 특별공급 근거 조문 = 제35조의3', el.find(x => x.id === 'baby').law, '규칙 제35조의3', '제35조의3');
check('과거 주택 소유 이력 → 생애최초 어려움', el.find(x => x.id === 'first').g, 'no', '제43조');
check('유주택 세대 → 신혼부부 어려움', E.eligibility(base({ own: true, birth: '1993-01-01', married: true, marDate: '2024-01-01', accDate: '2020-01-01' }), Object.assign({}, e0, { house: '1' }), CY.d8(REF)).find(x => x.id === 'new').g, 'no', '무주택세대구성원');

/* ---------- 6. 지역 정리 ---------- */
check('공고 시·도 칸이 주소와 다르면 주소 우선(논산 → 충청남도)', E.noticeSido({ sd: '충청북도', ad: '충청남도 논산시 내동' }), '충청남도', '');
check('옛 이름 광주광역시 → 전남광주통합특별시', E.noticeSido({ sd: '광주광역시', ad: '광주광역시 북구' }), '전남광주통합특별시', '');
check('전국 16개 시·도 목록', E.SIDO.length, 16, '');

/* ---------- 7. 가점만 바로 넣기(?score=64) — 2026-11-26 품질 점검: '가점 64점인데 서울 분양 단지 중 당첨 가능한 곳?'에 질문 7개를 다 답해야만 단지별 진단이 나오던 문제 ---------- */
check('가점 64 바로 넣기', E.quickTotal('64').sum, 64, '');
check('가점 84 바로 넣기(만점)', E.quickTotal(84).sum, 84, '');
check('85점은 거절(만점 84)', E.quickTotal('85'), null, '');
check('음수·소수·빈칸·글자 거절', [E.quickTotal('-1'), E.quickTotal('6.5'), E.quickTotal(''), E.quickTotal('abc')], [null, null, null, null], '');
check('항목별 점수는 모름(null)', E.quickTotal('64').h.pts, null, '');
const qa = Object.assign(base({ married: null, own: null }), { quick: 64 });
check('가점만 넣으면 몇 년 뒤 계산 안 함(undefined)', E.yearsTo(qa, REF, 70), undefined, '');
{ const q = E.eligibility(qa, Object.assign({}, e0, { sido: '서울특별시', reg: 'y' }), CY.d8(REF));
  check('가점만 넣으면 통장 없음(어려움)이 아니라 확인 필요', q.find(x => x.id === 'rank1').g, 'chk2', '');
  check('가점만 넣으면 신혼부부도 확인 필요(미혼 단정 안 함)', q.find(x => x.id === 'new').g, 'chk2', ''); }
check('질문으로 계산한 경우는 그대로 통장 없음 = 어려움', E.eligibility(base({ birth: '1980-01-01', noAcc: true }), Object.assign({}, e0, { reg: 'y' }), CY.d8(REF)).find(x => x.id === 'rank1').g, 'no', '');
check('주소 시·도 표기 서울/서울시/충북/광주', ['서울', '서울시', '충북', '광주', '없는곳'].map(E.sidoFrom), ['서울특별시', '서울특별시', '충청북도', '전남광주통합특별시', ''], '');
check('시·군·구 이름 맞추기(고양시 덕양구 = 고양덕양구)', [E.sggKey('고양시 덕양구'), E.sggKey('고양덕양구'), E.sggKey('파주시')], ['고양덕양구', '고양덕양구', '파주시'], '');
{ const html = require('fs').readFileSync(require('path').join(__dirname, '../chungyak/index.html'), 'utf8');
  check('청약 화면: 가점 바로 넣기 칸·주소 ?score 처리', /id="qScore"/.test(html) && /UP\.get\('score'\)/.test(html), true, '');
  check('청약 화면: 가점만 넣으면(칸·?score) 단지별 진단을 맨 위로, 질문으로 계산하면 원래 순서', /function placeGen\(top\)/.test(html) && /placeGen\(!!r\.quick\)/.test(html) && /id="genH"/.test(html) && /id="eligH"/.test(html), true, '2026-11-26 결정');
  check('청약 화면: 공고 전 분양 예정에도 내 가점 비교', /planGuTxt\(x\)/.test(html), true, '');
  check('청약 화면: 공고 카드마다 공고일(pb)로 노부모·부양가족 기준 안내', /function ruleLine\(n\)/.test(html) && /oldParentRule\(n\.pb\)/.test(html) && /depRule\(n\.pb\)/.test(html) && /\$\{ruleLine\(n\)\}/.test(html), true, '');
  check('청약 화면: 부양가족 점수 옆 안내 + 시행 예정 접힌 칸(확인된 바뀌는 내용·출처 링크) · 경고 문구 제거', /function depNote\(ref\)/.test(html) && /시행 예정 · 2027\. 11\. 25\./.test(html) && /DEP_RULE\.changes/.test(html) && /DEP_RULE\.links/.test(html) && !/아직 대조하지 못해/.test(html) && !/needCheck/.test(html), true, '');
  check('청약 화면: 새 기준에서 빠지는 가족 질문은 해당 가족이 있을 때만(30세 이상 자녀·부모·30세 미만 자녀)', /const DEPX = \[/.test(html) && /kid30out/.test(html) && /parOut/.test(html) && /youngOut/.test(html) && /DEPX\.filter\(r => r\[3\]\(\) > 0\)/.test(html), true, '');
  check('청약 화면: 부양가족 합계는 가족 칸만(빠지는 인원 칸 제외)', /const depSum = \(\) => DEPS\.reduce/.test(html), true, '');
  check('청약 화면: 근거에 제23조·별표 1·개정 연혁·이유·조문 링크', /lsRvsDocListP/.test(html) && /lsRvsRsnListP/.test(html) && /lsJoLnkSeq=1033568277/.test(html) && /제23조/.test(html), true, '');
  check('청약 화면: 근거에 부칙 제1조·제2조·행정기본법 제7조', /부칙 제1조 단서/.test(html) && /부칙 제2조/.test(html) && /행정기본법 제7조/.test(html), true, '');
  check('청약 화면: cy-engine 최신 번호(v7)', /cy-engine\.js\?v=7/.test(html), true, '');
  check('청약 화면: 공공분양 개수는 진단 범위(내 시·도)만 셈', /n\.k !== '민영' && \(scope === 'all' \|\| noticeSido\(n\) === mine\)/.test(html), true, ''); }
{ const N = require('../assets/narrative.js');
  const nar = (N.cat ? N : (global.JDJ_NAR || {})).cat;
  if (nar && nar.cy) { const o = nar.cy({ my: 64, h: null, d: null, cc: null, items: [], cnt: { hi: 0, mid: 0, lo: 0 } });
    check('가점만 넣으면 분석 설명에 null 점수 줄이 없음', JSON.stringify(o).includes('null점'), false, ''); } }

const bad = rows.filter(x => !x.ok);
rows.forEach(x => console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : `  → 결과 ${JSON.stringify(x.got)} / 기대 ${JSON.stringify(x.want)} (${x.basis})`}`));
console.log(`\n${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
