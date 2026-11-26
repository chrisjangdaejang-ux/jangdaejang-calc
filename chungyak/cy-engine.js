/* 장대장 청약 엔진 — 가점 계산 · 1순위/특별공급 간이 판정 · 예정 공고 예상 당첨 가점(커트라인) 범위
   브라우저 안에서만 계산해요(입력값을 서버로 보내지 않음). node 테스트: node tools/chungyak-test.js
   근거: 「주택공급에 관한 규칙」(국토교통부령 제1635호, 2026. 11. 24. 시행) — 국가법령정보센터(law.go.kr)에서 조문 대조
     · 1순위: 제27조(국민)·제28조 제1항(민영) / 특별공급: 제35조의3(신생아)·제40조(다자녀)·제41조(신혼부부)·제43조(생애최초)·제46조(노부모 부양)
       v8(2026. 11. 26. 제3장 제4절 제35조~제49조 대조): 기관추천 제35조 제1항(국민)·제36조(민영)·제45조(국가유공자 등), 청년 제35조의2(공공분양만),
       이전기관 종사자 등 제47조, 저축 요건 제48조 + 지역·사업 한정 유형 목록(제37·38·39·42·44·47조의3), 서류·소득 비율 안내
     · 제출 전 3대 실수 점검 mistakes(): 별표 1 제1호 가목·제27조 제3항(무주택기간), 제2조·제53조(세대원 주택), 제4조(거주지역·거주기간)
     · 가점제·추첨제 비율: 제28조 제2항(85㎡ 이하)·제4항(85㎡ 초과), 추첨 물량 무주택 우선: 제28조 제8항
     · 2026. 11. 24. 개정 중 이 엔진에 닿는 것: 제46조 제1항(노부모 부양 — 같은 등본에 올라 있고 실제로 같이 사는 경우로 한정).
       같은 개정의 제23조 제2항(신청 서류)·제52조(자격 전산검색)·제64조(규제 재검토 기한)는 계산·판정과 무관
     · 가점 산정: 별표 1(가점제 적용기준) — 2026. 11. 24. 개정(제1635호) 반영: 부양가족 실제 동거(공포일 시행), 30세 이상 자녀 3년 동거·해외 체류 제외(2027. 11. 25. 이후 공고)
     · 민영주택 신생아 특별공급(제35조의3 제3항): 2026. 6. 15. 시행 개정(국토교통부령 제1592호)으로 신설
     · 시행일(제1635호 부칙 제1조·제2조, 행정기본법 제7조 — https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=292055):
       ① 제46조 제1항(노부모 부양 실거주)은 부칙 제1조 단서(시행 유예) 대상이 아니라 공포한 날 2026. 11. 24.부터 시행
          → 원칙적으로 2026. 11. 24. 이후 입주자모집공고 단지부터 적용(그 전 공고는 공고문 기준) — oldParentRule()
       ② 일반공급 가점제 부양가족 인정 기준(별표 1 일부)·실거주 증빙서류(제23조 제2항) 개정은 부칙 제1조 단서에 따라
          공포 후 1년이 경과한 날 = 2027. 11. 25.(행정기본법 제7조) 시행, 부칙 제2조에 따라 그 전에 모집공고한 경우 종전 규정
          → depRule()·dependents(n, ref, det). 대표(부동산 전문가)가 공식 출처로 확인(2026. 11. 26.):
            · 만 30세 이상 미혼 자녀(직계비속) 부양가족 인정: 같은 등본 동거 1년 이상 → 3년 이상(직계존속은 기존처럼 3년 이상)
            · 직계존속·직계비속이 최근 3년 안에 연속 90일 넘게 해외 체류 → 원칙적으로 부양가족 제외
              (예외: 만 30세 미만 자녀가 모집공고일 현재 국내에 있으면 인정)
            · 증빙: 만 30세 이상 직계비속 실제 동거 확인용 건강보험 요양급여 내역 확인기간 과거 1년 → 3년
       ③ 2026. 11. 24.부터 이미 시행: 일반공급 가점제 부양가족 실제 동거 요건 명문화(별표 1), 노부모 특별공급 실제 동거(제46조),
          요양급여 내역 외 건강보험자격득실확인서 추가 제출(제23조)
       출처: law.go.kr 연혁 https://law.go.kr/LSW/lsRvsDocListP.do?chrClsCd=010102&lsId=008243 ·
             개정이유 https://www.law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=008243 ·
             조문 https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1033568277 */
(function (root) {
/* ===== 2026. 11. 24. 공포 개정(국토교통부령 제1635호)의 시행일 분기 =====
   날짜는 입주자모집공고일 기준. 공고일을 모르면(null) 두 경우를 함께 안내한다. */
const RULE_SRC = 'https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=292055';
const RULE_LINKS = [
  ['국토교통부령 제1635호 원문', RULE_SRC],
  ['개정 연혁', 'https://law.go.kr/LSW/lsRvsDocListP.do?chrClsCd=010102&lsId=008243'],
  ['개정 이유', 'https://www.law.go.kr/LSW/lsRvsRsnListP.do?chrClsCd=010102&lsId=008243'],
  ['관련 조문', 'https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1033568277']
];
const OLD_LIVE_FROM = '2026-11-24';   // 제46조 제1항 실거주 요건 — 부칙 제1조 본문(공포한 날부터 시행)
const DEP_RULE = {
  from: '2027-11-25',                 // 부칙 제1조 단서: 공포(2026. 11. 24.) 후 1년이 경과한 날(행정기본법 제7조)
  live: OLD_LIVE_FROM,                // 가점제 부양가족 실제 동거 명문화·건강보험자격득실확인서(제23조) — 공포한 날부터
  verified: true,                     // 대표가 공식 출처로 개정 별표 1 내용 확인(2026. 11. 26.) → 2027. 11. 25. 이후 공고는 새 기준으로 계산
  law: '주택공급에 관한 규칙(국토교통부령 제1635호) 제23조·별표 1, 부칙 제1조 단서·제2조, 행정기본법 제7조',
  src: RULE_SRC, links: RULE_LINKS,
  /* 2027. 11. 25. 이후 공고에 바뀌는 것(접힌 칸 '시행 예정'에 그대로) */
  changes: [
    '만 30세 이상 미혼 자녀는 최근 3년 이상 같은 등본에서 함께 살아야 부양가족으로 인정돼요(지금은 1년 이상). 부모·조부모는 지금처럼 3년 이상이에요',
    '부모·조부모나 자녀·손자녀가 최근 3년 안에 연속 90일 넘게 해외에 머물렀다면 원칙적으로 부양가족에서 빠져요. 다만 만 30세 미만 자녀가 모집공고일 현재 국내에 있으면 인정돼요',
    '만 30세 이상 자녀가 실제로 함께 살았는지 확인하는 건강보험 요양급여 내역의 확인 기간이 과거 1년에서 3년으로 늘어나요'
  ],
  /* 2026. 11. 24.부터 이미 시행 중인 것 */
  now: [
    '부양가족은 등본에 올라 있을 뿐 아니라 실제로 함께 살아야 인정돼요',
    '당첨 뒤 건강보험 요양급여 내역과 함께 건강보험자격득실확인서도 내야 해요(제23조)'
  ]
};
/* 'YYYYMMDD' · 'YYYY-MM-DD' · Date → 'YYYY-MM-DD' (모르면 null) */
function ymd(x) {
  if (!x) return null;
  if (x instanceof Date) return isNaN(x) ? null : `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const t = String(x).replace(/\D/g, '');
  return t.length >= 8 ? `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}` : null;
}
const dotK = d => { const [y, m, dd] = d.split('-'); return `${y}. ${+m}. ${+dd}.`; };
/* 노부모 부양 특별공급 실거주 요건: 공고일이 2026. 11. 24. 이후인가 */
function oldParentRule(pb) {
  const d = ymd(pb);
  const base = '2026. 11. 24. 이후 모집공고 단지부터 실제 함께 살아야 해요(그 전 공고는 공고문 기준)';
  if (!d) return { st: 'unk', txt: base, law: '규칙 제46조 제1항(2026. 11. 24. 개정), 부칙(제1635호) 제1조', src: RULE_SRC };
  if (d >= OLD_LIVE_FROM) return { st: 'new', date: d, txt: `${dotK(d)} 모집공고 단지예요 — 2026. 11. 24. 이후 공고라 부모님과 같은 등본에 올라 있고 실제로 함께 살아야 해요`, law: '규칙 제46조 제1항(2026. 11. 24. 개정), 부칙(제1635호) 제1조', src: RULE_SRC };
  return { st: 'old', date: d, txt: `${dotK(d)} 모집공고 단지예요 — 2026. 11. 24. 전 공고라 실제 함께 사는지까지 따지는지는 입주자모집공고문 기준이에요`, law: '규칙 제46조 제1항(2026. 11. 24. 개정 전 공고), 부칙(제1635호) 제1조', src: RULE_SRC };
}
/* 일반공급 가점제 부양가족 인정 기준·증빙: 공고일 기준 안내
   st: 'pre'(2027. 11. 25. 전 공고 — 지금 기준) · 'post'(2027. 11. 25. 이후 공고 — 새 기준으로 계산), live: 2026. 11. 24. 이후 공고(실제 동거·자격득실확인서) */
function depRule(pb) {
  const d = ymd(pb);
  const after = !!d && d >= DEP_RULE.from, live = !d || d >= DEP_RULE.live;
  const base = { from: DEP_RULE.from, live, needCheck: false, law: DEP_RULE.law, src: DEP_RULE.src };
  if (!after) return Object.assign(base, { st: 'pre',
    txt: '2027. 11. 25. 이후 모집공고분부터 부양가족 인정 기준·증빙이 바뀌어요(그 전 공고는 지금 기준)',
    now: live ? '부양가족은 등본에 올라 있을 뿐 아니라 실제로 함께 살아야 인정되고, 당첨 뒤 요양급여 내역과 건강보험자격득실확인서로 확인해요' : '' });
  return Object.assign(base, { st: 'post',
    txt: '2027. 11. 25. 이후 모집공고분이라 바뀐 부양가족 인정 기준(30세 이상 자녀 3년 이상 동거·해외 체류 제외)으로 계산했어요',
    now: '부양가족은 실제로 함께 살아야 인정되고, 당첨 뒤 요양급여 내역(30세 이상 자녀는 과거 3년)과 건강보험자격득실확인서로 확인해요' });
}

/* ===== 청약 가점 계산 (주택공급에 관한 규칙 별표 1, 2024.12.18 개정 — law.go.kr) ===== */
const CY = (() => {
  const d8 = s => { if (!s) return null; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? null : d; };
  const months = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0);
  const addYears = (d, n) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; };
  const ymTxt = m => { const y = Math.floor(m / 12), r = m % 12; return (y ? y + '년' : '') + (r ? (y ? ' ' : '') + r + '개월' : (y ? '' : '0개월')); };
  const fmtD = d => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  // 무주택기간: 1년 미만 2점, 1년마다 +2, 15년 이상 32점 (별표 1)
  function homeless(a, ref) {
    if (a.own) return { pts: 0, why: '세대원 중 주택을 가진 사람이 있어 무주택기간 점수는 0점으로 계산했어요.' };
    const birth = d8(a.birth); if (!birth) return { pts: 0, why: '생년월일이 없어요.' };
    const at30 = addYears(birth, 30);
    let start = at30, basis = `만 30세가 된 ${fmtD(at30)}`;
    const mar = a.married ? d8(a.marDate) : null;
    if (mar && mar < at30) { start = mar; basis = `30세 전 혼인신고일 ${fmtD(mar)}`; }
    const sold = a.soldDate ? d8(a.soldDate) : null;
    if (sold && sold > start) { start = sold; basis = `마지막으로 집을 처분한 ${fmtD(sold)}`; }
    if (start > ref) return { pts: 0, why: `무주택기간은 ${basis}부터 세요. 기준일에 아직 시작 전이라 0점이에요(만 30세 미만 미혼이면 0점).` };
    const m = months(start, ref), y = Math.floor(m / 12);
    const pts = Math.min(32, 2 + 2 * y);
    const band = y >= 15 ? '15년 이상' : (y === 0 ? '1년 미만' : `${y}년 이상 ${y + 1}년 미만`);
    return { pts, months: m, why: `${basis}부터 ${ymTxt(m)} → ‘${band}’ 구간 ${pts}점` };
  }
  // 부양가족: 0명 5점, 1명마다 +5, 6명 이상 35점
  // det(선택, 화면의 A.dep): par·kid·kid30·gk 인원과 2027. 11. 25. 이후 공고에서 빠지는 인원
  //   kid30out: 30세 이상 미혼 자녀 중 최근 3년 이상 함께 살지 않았거나 최근 3년 안에 연속 90일 넘게 해외에 머문 자녀
  //   parOut: 부모·조부모 중 최근 3년 안에 연속 90일 넘게 해외에 머문 분
  //   youngOut: 30세 미만 자녀·손자녀 중 모집공고일 현재 해외에 있고 최근 3년 안에 연속 90일 넘게 해외에 머문 사람
  const ptsOf = n => Math.min(35, 5 + 5 * n);
  function depOut(det) {
    if (!det) return 0;
    const c = (v, max) => Math.max(0, Math.min(+v || 0, +max || 0));
    return c(det.kid30out, det.kid30) + c(det.parOut, det.par) + c(det.youngOut, (+det.kid || 0) + (+det.gk || 0));
  }
  function dependents(n, ref, det) {
    n = Math.max(0, n | 0);
    const rule = depRule(ref), out = Math.min(n, depOut(det));
    const cnt = rule.st === 'post' ? n - out : n, pts = ptsOf(cnt);
    let why;
    if (rule.st === 'post' && out) why = `본인 제외 ${n}명 중 2027. 11. 25. 이후 공고 기준에서 빠지는 ${out}명(30세 이상 자녀 3년 미만 동거·해외 체류)을 빼고 ${cnt >= 6 ? '6명 이상' : cnt + '명'} → ${pts}점`;
    else why = `본인 제외 ${n}명 → ${n >= 6 ? '6명 이상' : n + '명'} ${pts}점`;
    if (rule.st === 'pre' && out) why += ` · 2027. 11. 25. 이후 공고라면 ${out}명이 빠져 ${ptsOf(n - out)}점(${pts - ptsOf(n - out)}점 낮아질 수 있어요)`;
    const r = { pts, why, cnt, out };
    if (rule.st === 'post' && !det && n) r.why += ' · 30세 이상 자녀의 3년 동거·가족 해외 체류 여부는 질문으로 답하면 반영해 드려요';
    return r;
  }
  // 청약통장: 6개월 미만 1점, 6개월~1년 미만 2점, 이후 1년마다 +1, 15년 이상 17점
  function accScore(m) { return m < 6 ? 1 : m < 12 ? 2 : Math.min(17, 2 + Math.floor(m / 12)); }
  // 배우자 통장: 가입기간의 50%에 해당하는 기간으로 최대 3점 (1년 미만 1점, 1~2년 2점, 2년 이상 3점), 본인과 합쳐 17점 한도
  function spouseScore(m) { return m == null ? 0 : m < 12 ? 1 : m < 24 ? 2 : 3; }
  function account(a, ref) {
    const j = d8(a.accDate);
    if (!j || a.noAcc) return { pts: 0, why: '청약통장이 없으면 가점제 청약을 할 수 없어요(0점으로 표시).' };
    const m = Math.max(0, months(j, ref)), own = accScore(m);
    let why = `본인 가입 ${fmtD(j)}부터 ${ymTxt(m)} → ${own}점`;
    let sp = 0;
    const sj = a.married && a.spAcc ? d8(a.spAcc) : null;
    if (sj) { const sm = Math.max(0, months(sj, ref)); sp = spouseScore(sm); why += ` · 배우자 가입 ${ymTxt(sm)} → ${sp}점 합산`; }
    const pts = Math.min(17, own + sp);
    if (own + sp > 17) why += ' (17점 한도 적용)';
    return { pts, months: m, why };
  }
  function total(a, refStr) {
    const ref = d8(refStr) || new Date(new Date().toDateString());
    const h = homeless(a, ref), d = dependents(a.deps, ref, a.dep), c = account(a, ref);
    d.rule = depRule(ref);   // 공고일(기준일)로 부양가족 인정 기준 분기 — 2027. 11. 25. 이후는 새 기준으로 계산
    return { h, d, c, sum: h.pts + d.pts + c.pts };
  }
  return { homeless, dependents, depOut, account, accScore, spouseScore, total, months, d8 };
})();

/* ===== 1순위·특별공급 간이 체크 (주택공급에 관한 규칙, 국토교통부령 제1635호 2026. 11. 24. 시행 — law.go.kr) ===== */
const SIDO = ['서울특별시','부산광역시','대구광역시','인천광역시','전남광주통합특별시','대전광역시','울산광역시','세종특별자치시','경기도','강원특별자치도','충청북도','충청남도','전북특별자치도','경상북도','경상남도','제주특별자치도'];
const CAPITAL = ['서울특별시','인천광역시','경기도'];
/* 옛 이름 → 지금 이름 (광주광역시·전라남도는 2026년 전남광주통합특별시로 통합). 공고·가점 자료에 옛 이름이 와도 같은 지역으로 묶는다 */
const SIDO_OLD = {'광주광역시':'전남광주통합특별시','전라남도':'전남광주통합특별시','강원도':'강원특별자치도','전라북도':'전북특별자치도','제주도':'제주특별자치도'};
const SIDO_ALIAS = {'전남광주통합특별시':'광주·전남','강원특별자치도':'옛 강원도','전북특별자치도':'옛 전라북도'};
const sidoNorm = s => SIDO_OLD[s] || s;
const sidoLbl = s => s + (SIDO_ALIAS[s] ? ` (${SIDO_ALIAS[s]})` : '');
// 민영주택 예치기준금액(만원) [85㎡ 이하, 102㎡ 이하, 135㎡ 이하, 모든 면적] — 규칙 별표 2(입주자모집공고문 인용 기준)
const DEPOSIT = { sb: [300, 600, 1000, 1500], metro: [250, 400, 700, 1000], etc: [200, 300, 400, 500] };
const depGroup = s => (s === '서울특별시' || s === '부산광역시') ? 'sb' : /광역시|특별시|통합특별시/.test(s) && s !== '세종특별자치시' ? 'metro' : 'etc';

const INCOME_TXT = '소득·자산 기준(전년도 도시근로자 가구원 수별 월평균소득 대비 비율, 공급 단계·주택 종류별로 달라요)은 입주자모집공고문과 청약홈에서 확인하세요';
function eligibility(a, e, ref) {
  const out = [];
  const acc = a.noAcc || !a.accDate ? 0 : Math.max(0, CY.months(CY.d8(a.accDate), ref));
  const cap = CAPITAL.includes(e.sido);
  const regs = e.reg === 'u' ? ['n', 'y'] : [e.reg];
  const noHouse = !a.own && e.house === '0';
  const homelessTxt = noHouse ? null : '무주택세대구성원 요건을 확인하세요(세대 주택 수 ' + (e.house === '2' ? '2채 이상' : e.house + '채') + ')';
  const grade = (bad, unk) => bad.length ? 'no' : unk.length ? 'chk2' : 'ok';
  /* 가점만 바로 넣은 경우(a.quick): 통장 가입일·혼인 여부를 묻지 않았으니 '없음'이 아니라 '확인 필요'로 */
  const quick = a.quick != null;
  const accUnknown = quick && !a.accDate && !a.noAcc;

  // 민영주택 1순위 (제28조 제1항 제1호)
  function priv(reg) {
    const bad = [], unk = [], ok = [];
    const need = reg === 'y' ? 24 : cap ? 12 : 6;
    if (accUnknown) unk.push(`청약통장 가입기간 ${need}개월 이상인지 확인하세요`);
    else if (a.noAcc || !a.accDate) bad.push('청약통장이 없어요');
    else if (acc < need) bad.push(`가입 ${acc}개월 — ${need}개월 이상 필요`);
    else ok.push(`가입 ${acc}개월(필요 ${need}개월)`);
    if (reg !== 'y' && cap) unk.push('시·도지사가 가입기간을 최대 24개월까지 늘려 공고할 수 있어요');
    const dep = DEPOSIT[depGroup(e.sido)][e.size];
    if (e.dep === '') unk.push(`예치기준금액 ${dep.toLocaleString()}만원 이상 납입 여부를 확인하세요`);
    else if (+e.dep < dep) bad.push(`납입 인정금액 ${(+e.dep).toLocaleString()}만원 — 예치기준 ${dep.toLocaleString()}만원 이상 필요`);
    else ok.push(`납입 인정금액이 예치기준 ${dep.toLocaleString()}만원 이상`);
    if (reg === 'y') {
      if (e.head === 'n') bad.push('세대주만 1순위가 될 수 있어요'); else if (e.head === 'u') unk.push('세대주인지 확인하세요');
      if (e.win === 'y') bad.push('과거 5년 이내 세대원 당첨 이력이 있으면 1순위가 안 돼요'); else if (e.win === 'u') unk.push('과거 5년 이내 세대원 당첨 이력을 확인하세요');
      if (e.house === '2') bad.push('2주택 이상 세대는 1순위가 안 돼요');
    } else if (e.house === '2') unk.push('공공주택지구(개발제한구역 해제 50% 이상) 공급이면 2주택 이상 세대는 1순위가 안 돼요');
    return { bad, unk, ok };
  }
  // 국민주택 1순위 (제27조 제1항 제1호)
  function pub(reg) {
    const bad = [], unk = [], ok = [];
    const need = reg === 'y' ? 24 : cap ? 12 : 6;
    if (accUnknown) unk.push(`청약통장 가입기간 ${need}개월 이상인지 확인하세요`);
    else if (a.noAcc || !a.accDate) bad.push('청약통장이 없어요');
    else if (acc < need) bad.push(`가입 ${acc}개월 — ${need}개월 이상 필요`);
    else ok.push(`가입 ${acc}개월(필요 ${need}개월)`);
    if (e.cnt === '') unk.push(`월납입금 ${need}회 이상 납입 여부를 확인하세요`);
    else if (+e.cnt < need) bad.push(`납입 ${e.cnt}회 — ${need}회 이상 필요`);
    else ok.push(`납입 ${e.cnt}회(필요 ${need}회)`);
    if (reg === 'y') {
      if (e.head === 'n') bad.push('세대주만 1순위가 될 수 있어요'); else if (e.head === 'u') unk.push('세대주인지 확인하세요');
      if (!noHouse) bad.push('무주택세대구성원이어야 해요');
      if (e.win === 'y') bad.push('과거 5년 이내 무주택세대구성원 당첨 이력이 있으면 안 돼요'); else if (e.win === 'u') unk.push('과거 5년 이내 당첨 이력을 확인하세요');
    } else if (!noHouse) unk.push('국민주택은 무주택세대구성원 공급이 원칙이에요 — 공고문을 확인하세요');
    return { bad, unk, ok };
  }
  const first = e.kind === 'p' ? priv : pub;
  const rk = regs.map(r => ({ r, ...first(r) }));
  rk.forEach(x => out.push({
    k: '1순위', id: 'rank1', t: `${e.kind === 'p' ? '민영' : '국민'}주택 1순위 · ${x.r === 'y' ? '투기과열지구·청약과열지역' : (cap ? '수도권' : '수도권 밖') + ' 일반 지역'}`,
    g: grade(x.bad, x.unk), items: [...x.bad, ...x.unk, ...x.ok],
    law: e.kind === 'p' ? '규칙 제28조 제1항 제1호, 별표 2(예치기준금액 — 입주자모집공고문 기준)' : '규칙 제27조 제1항 제1호'
  }));
  const first1 = rk.every(x => !x.bad.length);       // 모든 경우에 1순위 결격이 없음

  // 신혼부부 (제41조)
  { const bad = [], unk = [];
    const mar = a.married ? CY.d8(a.marDate) : null;
    if (!mar && quick && a.married == null) unk.push('혼인신고 7년 이내 부부(예비 신혼부부·한부모 가족 포함)인지 확인하세요');
    else if (!mar) bad.push('혼인 중인 경우에 해당해요(예비 신혼부부·한부모 가족 등은 공고문 확인)');
    else { const m = CY.months(mar, ref); if (m >= 84) bad.push(`혼인기간 ${Math.floor(m / 12)}년 — 7년 이내여야 해요`); }
    if (!noHouse) bad.push('무주택세대구성원이어야 해요');
    unk.push(INCOME_TXT);
    out.push({ k: '특별공급', id: 'new', how: e.kind === 'p' ? '소득 구간별 단계 안에서 미성년 자녀(태아 포함)가 많은 순, 같으면 추첨으로 뽑아요(민영주택).' : '국민주택은 선정 방식(배점 등)이 공고마다 달라요. 입주자모집공고문을 확인하세요.', t: '신혼부부 특별공급', g: grade(bad, unk), items: [...bad, ...unk], law: '규칙 제41조' }); }
  // 생애최초 (제43조, 민영은 제3항)
  { const bad = [], unk = [];
    if (!noHouse || e.ever === 'n') bad.push('세대원 모두 과거에 주택을 가진 적이 없어야 해요'); else if (e.ever === 'u') unk.push('세대원 모두 과거 주택 소유 이력이 없는지 확인하세요');
    if (!first1) unk.push('1순위에 해당해야 해요(위 1순위 결과 확인)');
    if (e.tax === 'n') bad.push('근로자·자영업자로 소득세를 5년 이상 납부해야 해요'); else if (e.tax === 'u') unk.push('소득세 5년 이상 납부 여부를 확인하세요');
    if (e.kind === 'p' && !a.married && !(quick && a.married == null) && +e.kids === 0) unk.push('민영주택은 혼인 중이거나 자녀가 있는 경우가 기본이에요. 1인 가구 등 다른 기준은 공고문을 확인하세요');
    if (e.kind === 'g') unk.push('국민주택은 저축액이 선납금 포함 600만원 이상이어야 해요');
    unk.push(INCOME_TXT);
    out.push({ k: '특별공급', id: 'first', how: e.kind === 'p' ? '소득 구간별 단계 안에서 추첨으로 뽑아요. 청약 가점과는 관계없어요(민영주택).' : '추첨 방식이 기본이에요. 소득 단계 등 세부 방식은 입주자모집공고문을 확인하세요.', t: '생애최초 특별공급', g: grade(bad, unk), items: [...bad, ...unk], law: '규칙 제43조' }); }
  // 다자녀 (제40조)
  { const bad = [], unk = [];
    if (+e.kids < 2) bad.push('미성년 자녀가 2명 이상이어야 해요');
    if (!noHouse) bad.push('무주택세대구성원이어야 해요');
    unk.push('청약통장·소득·자산 요건과 배점 기준은 공고문에서 확인하세요');
    out.push({ k: '특별공급', id: 'multi', how: '자녀 수·영유아 자녀 수·세대 구성·무주택기간·해당 시·도 거주기간·청약통장 가입기간 배점을 더해 높은 순으로 뽑아요.', t: '다자녀가구 특별공급', g: grade(bad, unk), items: [...bad, ...unk], law: '규칙 제40조' }); }
  // 노부모 부양 (제46조 — 제1항 2026. 11. 24. 개정: 같은 세대별 주민등록표에 올라 있고 같이 거주하는 경우로 한정)
  { const bad = [], unk = [];
    const orule = oldParentRule(e.pb || ref);   // 공고일(e.pb)이 없으면 기준일(입주자모집공고일)로 판단
    if (e.old !== 'y') bad.push(orule.st === 'old' ? '만 65세 이상 직계존속(배우자 직계존속 포함)을 같은 등본에 올리고 3년 이상 계속 부양해야 해요(실제로 함께 살아야 하는지는 공고문 기준)' : '만 65세 이상 직계존속(배우자 직계존속 포함)을 같은 등본에 올리고 실제로 함께 살면서 3년 이상 계속 부양해야 해요');   // 질문(eOld)에서 '실제로 함께 사는 경우'로 물어 '예'면 충족으로 본다
    if (e.head === 'n') bad.push('세대주여야 해요'); else if (e.head === 'u') unk.push('세대주인지 확인하세요');
    if (!noHouse) bad.push('무주택세대구성원이어야 해요(피부양자의 배우자도 무주택)');
    if (!first1) unk.push('1순위에 해당해야 해요(위 1순위 결과 확인)');
    out.push({ k: '특별공급', id: 'old', how: e.kind === 'p' ? '일반공급처럼 청약 가점이 높은 순으로 뽑아요(민영주택). 위에서 계산한 내 가점이 그대로 쓰여요.' : '국민주택은 일반공급처럼 납입 인정 금액·횟수 순(순차제)이 기본이에요. 입주자모집공고문을 확인하세요.', t: '노부모 부양 특별공급', g: grade(bad, unk), items: [...bad, ...unk], rule: orule, law: '규칙 제46조 제1항·제2항, 부칙(국토교통부령 제1635호) 제1조, 행정기본법 제7조' }); }
  // 신생아
  { const bad = [], unk = [];
    if (e.baby !== 'y') bad.push('기준일 현재 2세 미만(태아·입양 포함) 자녀가 있어야 해요');
    if (!noHouse) bad.push('무주택세대구성원이어야 해요');
    if (!first1) unk.push('1순위에 해당해야 해요(위 1순위 결과 확인)');
    unk.push(INCOME_TXT);
    out.push({ k: '특별공급', id: 'baby', how: e.kind === 'p' ? '2026년 6월 15일 시행 규칙 개정으로 민영주택에도 생긴 유형이에요(혼인 여부와 무관). 소득 단계·추첨 등 세부 선정 방식은 입주자모집공고문을 확인하세요.' : '공공분양(국민주택)에서 운영해 온 유형이에요. 세부 선정 방식은 입주자모집공고문을 확인하세요.', t: '신생아 특별공급', g: grade(bad, unk), items: [...bad, ...unk], law: '규칙 제35조의3' }); }
  /* ===== v8: 공식 특별공급 전체 목록으로 넓힘(국토교통부령 제1635호, 2026. 11. 24. 시행 — 제3장 제4절 제35조~제49조 대조, 2026. 11. 26.) =====
     e.inst(기관추천 대상 분류)·e.reloc(이전기관 등 종사자 확인) 값이 없으면 '해당 없음'으로 봐서 예전 화면·길잡이 결과는 그대로예요. */
  // 기관추천 (국민주택 제35조 제1항 · 민영주택 제36조 · 국가유공자 등 제45조)
  { const bad = [], unk = [], inst = e.inst || 'n';
    if (inst === 'n') bad.push('국가유공자·장애인·장기복무 군인·중소기업 근로자·북한이탈주민·다문화가족 등 규칙이 정한 대상이고, 해당 기관의 추천을 받아야 해요');
    else {
      const T = INST_TYPES[inst];
      if (inst === 'u') unk.push('규칙이 정한 기관추천 대상(국가유공자·장애인·장기복무 군인·중소기업 근로자 등)인지 확인하세요');
      else unk.push(`${T.t} — ${T.org}에 먼저 신청해 추천을 받아야 해요(추천 명단에 올라야 신청할 수 있어요)`);
      if (inst === 'etc' && e.kind === 'p') unk.push('다문화가족·한부모가족 등 일부 대상은 국민주택(공공분양)에서만 추천 대상이에요(제35조 제1항, 제36조 제4호)');
    }
    if (!noHouse) bad.push('무주택세대구성원이어야 해요');
    if (inst !== 'n') unk.push(e.kind === 'p' ? '청약통장 가입 6개월이 지나고 예치기준금액을 넣었어야 해요(제48조 — 일부 대상은 통장이 필요 없어요)' : '청약통장 가입 6개월이 지나고 월납입금을 6회 이상 냈어야 해요(제48조 — 일부 대상은 통장이 필요 없어요)');
    out.push({ k: '특별공급', id: 'inst', t: '기관추천 특별공급', g: grade(bad, unk), items: [...bad, ...unk],
      how: '추천 기관이 정한 순서로 대상자를 정하고, 사업주체는 그 명단으로 공급해요. 일반 청약자와 경쟁하지 않아요.',
      law: e.kind === 'p' ? '규칙 제36조(85㎡ 이하 민영주택, 건설량 10% 범위)·제45조(국가유공자 등, 5% 범위)·제48조' : '규칙 제35조 제1항(국민주택, 건설량 10% 범위)·제45조(국가유공자 등, 5% 범위)·제48조' }); }
  // 청년 (제35조의2 — 공공주택사업자가 짓는 국민주택만)
  { const bad = [], unk = [];
    if (e.kind === 'p') bad.push('민영주택에는 청년 특별공급이 없어요(공공주택사업자가 짓는 국민주택·공공분양만)');
    const b = CY.d8(a.birth);
    if (b) { const age = Math.floor(CY.months(b, ref) / 12); if (age < 19 || age > 39) bad.push(`만 ${age}세 — 만 19세 이상 39세 이하여야 해요`); }
    else unk.push('만 19세 이상 39세 이하인지 확인하세요');
    if (a.married) bad.push('혼인 중이 아니어야 해요(미혼 청년 대상)');
    else if (a.married == null) unk.push('혼인 중이 아닌지 확인하세요');
    if (e.ever !== 'y') unk.push('본인이 과거에 집을 가진 적이 없어야 해요(부모 등 다른 세대원이 집이 있어도 청년 본인은 무주택으로 봐요)');
    if (accUnknown) unk.push('청약통장 가입 6개월·월납입금 6회 이상인지 확인하세요');
    else if (a.noAcc || !a.accDate) bad.push('청약통장이 없어요(가입 6개월·6회 이상 납입 필요)');
    else if (acc < 6) bad.push(`가입 ${acc}개월 — 6개월 이상 필요`);
    if (e.cnt !== '' && e.cnt != null && +e.cnt < 6) bad.push(`납입 ${e.cnt}회 — 6회 이상 필요`);
    unk.push('소득·자산 기준과 공급 비율은 「공공주택 특별법 시행규칙」과 입주자모집공고문을 따라요');
    out.push({ k: '특별공급', id: 'youth', t: '청년 특별공급(공공분양)', g: grade(bad, unk), items: [...bad, ...unk],
      how: '공공분양에서 미혼 청년에게 따로 떼어 둔 물량이에요. 선정 방식은 「공공주택 특별법 시행규칙」과 공고문을 따라요.',
      law: '규칙 제35조의2·제48조, 공공주택 특별법 시행규칙' }); }
  // 이전기관 종사자 등 (제47조)
  { const bad = [], unk = [], rl = e.reloc || 'n';
    if (rl === 'n') bad.push('세종시·혁신도시·산업단지·기업도시 등으로 옮겨 온 기관·학교·기업의 종사자로 확인을 받은 경우만이에요');
    else {
      unk.push(rl === 'u' ? '세종시·혁신도시·산업단지·기업도시 등으로 옮겨 온 기관·기업의 종사자인지 확인하세요' : '소속 기관이 시·도에서 특별공급 대상 확인을 받았는지 확인하세요');
      unk.push('그 지역(이전한 도시·산업단지 등)에 짓는 주택 공고에만 있어요');
      if (e.house === '2') bad.push('2주택 이상 세대에 속하면 안 돼요(혁신도시 등)');
      else if (e.house === '1') unk.push('1세대 1주택 기준이라 이미 집이 있는 세대는 공고문 조건을 확인하세요');
    }
    out.push({ k: '특별공급', id: 'reloc', t: '이전기관 종사자 등 특별공급', g: grade(bad, unk), items: [...bad, ...unk],
      how: '기관·시·도가 확인한 대상자에게 한 번만 공급해요. 일반 청약자와 경쟁하지 않아요.',
      law: '규칙 제47조' }); }
  out.forEach(r => { r.docs = DOCS[r.id] || []; r.why = whyOf(r); if (INCOME_PCT[r.id]) r.inc = INCOME_PCT[r.id](e.kind); });
  return out;
}
/* 기관추천 대상 분류(화면 고르기) — 규칙 제35조 제1항 각 호·제36조·제45조 */
const INST_TYPES = {
  merit: { t: '국가유공자·보훈보상대상자·5·18·특수임무·참전 유공자와 유족', org: '국가보훈부(지방 보훈관서)' },
  dis: { t: '장애인(등록 장애인)', org: '시·도(장애인 담당 부서)' },
  mil: { t: '10년 이상 복무 군인·장기복무 제대군인', org: '국군복지단·국가보훈부' },
  sme: { t: '중소기업 근로자', org: '중소벤처기업부(지방 중소벤처기업청)' },
  etc: { t: '북한이탈주민·납북피해자·다문화가족·우수선수·우수기능인·국외 근무 귀국자 등', org: '해당 법률의 담당 기관' },
  u: { t: '잘 모르겠음', org: '입주자모집공고문의 기관추천 안내' }
};
/* 소득 기준(전년도 도시근로자 가구당 월평균소득 대비 비율) — 금액은 해마다 바뀌어 공고문 기준 */
const INCOME_PCT = {
  new: () => '소득 기준: 140% 이하(맞벌이 160%) — 물량의 50%는 100%(맞벌이 120%) 이하, 20%는 140%(160%) 이하에 먼저, 나머지는 자산 기준을 채우면 추첨(규칙 제41조)',
  first: k => k === 'p' ? '소득 기준(민영): 160% 이하 — 물량의 50%는 130% 이하, 20%는 160% 이하에 먼저, 나머지는 추첨(규칙 제43조)' : '소득 기준(국민): 130% 이하 — 물량의 50%는 100% 이하, 20%는 130% 이하에 먼저, 나머지는 추첨(규칙 제43조)',
  baby: k => k === 'p' ? '소득 기준(민영): 160% 이하 — 물량의 50%는 130% 이하(우선), 20%는 160% 이하에 먼저, 나머지 30%는 자산 기준을 채운 모든 신청자 추첨(규칙 제35조의3 제3항)' : '소득 기준(국민): 130% 이하 — 물량의 50%는 100% 이하(우선), 20%는 130% 이하에 먼저, 나머지 30%는 자산 기준을 채운 모든 신청자 추첨(규칙 제35조의3 제1항)',
  multi: k => k === 'p' ? '' : '공공(규칙 제18조 사업주체)이 짓는 85㎡ 이하는 소득 120% 이하(규칙 제40조)',
  old: k => k === 'p' ? '' : '공공(규칙 제18조 사업주체)이 짓는 85㎡ 이하 별도 물량은 소득 120% 이하(규칙 제46조 제2항)'
};
/* 당첨 뒤 흔히 내는 서류 — 최종 목록·양식은 입주자모집공고문 기준 */
const DOCS_NOTE = '흔히 내는 서류예요. 정확한 목록·발급 기준일은 입주자모집공고문을 따르세요.';
const DOCS = {
  rank1: ['청약통장 순위(가입)확인서', '주민등록표등본·초본(거주지역·거주기간 확인)'],
  new: ['혼인관계증명서(상세)', '가족관계증명서(자녀 확인)', '임신진단서 또는 입양관계증명서(태아·입양 자녀가 있으면)', '소득 확인 서류(건강보험자격득실확인서·소득금액증명 등)'],
  first: ['소득세 5년 이상 납부 증빙(소득금액증명·납세사실증명 등)', '혼인관계증명서 또는 자녀가 나오는 가족관계증명서', '소득 확인 서류(건강보험자격득실확인서 등)'],
  multi: ['가족관계증명서(미성년 자녀 확인)', '주민등록표등본·초본(해당 시·도 거주기간)', '다자녀 배점표(공고문 양식)', '임신진단서·입양관계증명서·한부모가족증명서(해당하면)'],
  old: ['부양하는 부모님의 주민등록표초본(3년 이상 같은 등본 확인)', '가족관계증명서', '건강보험 요양급여 내역·건강보험자격득실확인서(실제로 함께 사는지 확인, 2026. 11. 24. 이후 공고)'],
  baby: ['가족관계증명서 또는 출생증명서(2세 미만 자녀)', '임신진단서 또는 입양관계증명서(태아·입양이면)', '소득·자산 확인 서류'],
  inst: ['추천 기관에서 받은 추천(기관이 사업주체에 명단을 보내요)', '자격 증명 서류(국가유공자증·장애인증명서·재직증명서 등 기관이 정한 것)'],
  youth: ['가족관계증명서·혼인관계증명서(미혼 확인)', '본인 주택 소유 이력 확인', '소득·자산 확인 서류(「공공주택 특별법 시행규칙」 기준)'],
  reloc: ['소속 기관·시·도가 발급한 특별공급 대상자 확인서', '재직증명서']
};
/* 판정 한 줄 이유 */
function whyOf(r) {
  const lead = r.items[0] || '';
  if (r.g === 'no') return lead;
  if (r.g === 'ok') return '이 화면에서 확인한 조건은 모두 채웠어요';
  const n = r.items.length;
  return n > 1 ? `확인할 것 ${n}가지 · ${lead}` : lead;
}
/* 공식 특별공급 중 일반 신청자가 고르는 유형이 아닌 것(지역·사업 한정) — 화면에는 목록으로만 안내 */
const SPECIAL_OTHER = [
  { t: '개발제한구역 해제 택지 등 철거민', law: '규칙 제37조' },
  { t: '경제자유구역 안 민영주택(외국인 투자기업 종사자 등)', law: '규칙 제38조' },
  { t: '비수도권 민영주택(시·도지사 시책 대상)', law: '규칙 제39조' },
  { t: '지역균형발전(외국인 투자 촉진 대상 외국인 포함)', law: '규칙 제42조' },
  { t: '도시개발사업 철거주택 소유자', law: '규칙 제44조' },
  { t: '불법전매 등으로 계약 취소된 주택의 재공급', law: '규칙 제47조의3' }
];
const FOREIGN_TXT = '외국인만을 위한 일반 특별공급 유형은 없어요. 경제자유구역(제38조)·지역균형발전 시책(제42조)·제주 영어교육도시(제47조 제5항)처럼 정해진 지역·사업에서만 외국인이 대상이 될 수 있어요.';
const SPECIAL_LAW = { name: '주택공급에 관한 규칙(국토교통부령 제1635호)', from: '2026-11-24', checked: '2026-11-26', part: '제3장 제4절 특별공급(제35조~제49조)', src: RULE_SRC };

/* ===== 제출 전 3대 실수 점검 — 부적격 당첨 주요 사유(국토교통부·청약홈 자료, 2022~2026. 8.):
   ① 본인·배우자 무주택기간 산정 오류 ② 세대원 주택·분양권 소유 ③ 거주지역 선택 오류
   m: { spSold, right, spHouse: 'y'|'n'|'u', mySido, mySgg, nSido, nSgg, pick: 'here'|'etc'|'', stay: 'y'|'n'|'u' }
   결과 g: ok(좋음) · warn(주의) · risk(위험) */
const SIDO_WIDE = s => s !== '전남광주통합특별시' && /특별시$|광역시$|특별자치시$/.test(s);   // 특별시·광역시·세종은 시 전체가 해당 주택건설지역(제4조) — 통합특별시·도는 시·군 단위
function mistakes(a, m, ref) {
  m = m || {}; ref = ref || new Date(new Date().toDateString());
  const out = [];
  // ① 무주택기간
  { let g = 'ok', head, items = [];
    if (a.quick != null || !a.birth) { g = 'warn'; head = '질문에 답해 가점을 계산해야 무주택기간을 점검할 수 있어요'; }
    else if (a.own) { head = '세대에 집이 있어 무주택기간은 0점이에요 — 청약홈에도 0점(유주택)으로 넣으세요'; }
    else {
      const h = CY.homeless(a, ref);
      head = `무주택기간 ${h.pts}점 — ${h.why}`;
      if (m.spSold === 'y' && !a.soldDate) { g = 'risk'; items.push('배우자(또는 본인)가 집을 가졌다가 판 적이 있으면 마지막으로 판 날부터 다시 세야 해요. 질문의 ‘처분한 적’에 그 날짜를 넣어 다시 계산하세요'); }
      else if (m.spSold === 'u' || m.spSold == null) { g = 'warn'; items.push('배우자가 혼인 전후로 집을 가졌다가 판 적이 있는지 확인하세요 — 무주택기간은 본인과 배우자가 모두 집이 없던 기간이에요'); }
      if (a.married && a.marDate && CY.d8(a.marDate) < new Date(CY.d8(a.birth).getFullYear() + 30, CY.d8(a.birth).getMonth(), CY.d8(a.birth).getDate())) items.push('만 30세 전에 혼인신고를 해서 혼인신고일부터 세었어요(혼인관계증명서의 신고일 기준)');
      else items.push('만 30세 전 미혼 기간은 무주택기간에 들어가지 않아요');
    }
    out.push({ id: 'home', t: '무주택기간 계산', g, head, items, law: '규칙 별표 1 제1호 가목(무주택기간)·제27조 제3항' }); }
  // ② 세대원 주택·분양권
  { let g = 'ok', head, items = [];
    const yes = m.right === 'y' || m.spHouse === 'y', unk = m.right !== 'n' || m.spHouse !== 'n';
    if (a.own) head = '세대에 집이 있다고 답했어요 — 무주택 조건이 필요한 특별공급·우선공급은 신청할 수 없어요';
    else if (yes) { g = 'risk'; head = '무주택으로 신청하면 부적격이 될 수 있어요';
      if (m.right === 'y') items.push('세대원의 분양권·입주권도 주택으로 봐요(2018. 12. 11. 이후 계약·취득분). 무주택이 아니라 유주택으로 답하고 다시 계산하세요');
      if (m.spHouse === 'y') items.push('배우자는 주민등록이 따로여도 같은 세대로 봐요. 배우자 집이 있으면 무주택이 아니에요'); }
    else if (unk) { g = 'warn'; head = '세대원 전원의 주택·분양권을 확인하세요'; items.push('세대원 = 본인·배우자(등본이 달라도)·같은 등본의 부모·조부모·자녀·손자녀예요'); }
    else head = '세대원 모두 집·분양권·입주권이 없다고 답했어요';
    items.push('예외(무주택으로 봄): 60세 이상 부모·조부모의 집, 20㎡ 이하 1채, 소형·저가주택 1채(공고문 기준) 등');
    out.push({ id: 'house', t: '세대원 주택 보유', g, head, items, law: '규칙 제2조 제2호의3·제4호, 제53조(주택소유 여부 판정기준)' }); }
  // ③ 거주지역
  { let g = 'ok', head, items = [];
    const ns = m.nSido ? sidoNorm(m.nSido) : '', ms = m.mySido ? sidoNorm(m.mySido) : '';
    let here = null, sure = true;
    if (ns && ms) {
      if (ms !== ns) here = false;
      else if (SIDO_WIDE(ns)) here = true;
      else if (m.nSgg && m.mySgg) { here = sggCity(m.nSgg) === sggCity(m.mySgg); sure = here; }   // 도: 시·군이 다르면 보통 기타지역(공고문이 넓게 정할 수 있어 단정 안 함)
    }
    if (here == null) { g = 'warn'; head = ns && ms ? '같은 시·도예요 — 시·군까지 같아야 해당지역이에요' : '내 주민등록 주소와 공고 지역을 고르면 해당지역인지 알려 드려요'; }
    else {
      head = here ? `해당지역이에요(${ns === ms && SIDO_WIDE(ns) ? ns + ' 전체가 같은 지역' : '같은 시·군'})` : '해당지역이 아니에요 — 기타지역(또는 공고문이 정한 인근 지역)으로 신청해요';
      if (!sure) head = '시·군이 달라 보통 기타지역이에요 — 공고문이 해당지역을 시·도 전체 등으로 넓혔는지 확인하세요';
      if (m.pick === 'here' && !here) { g = sure ? 'risk' : 'warn'; items.push(sure ? '해당지역이 아닌데 해당지역으로 신청하면 부적격이에요' : '공고문이 해당지역을 넓히지 않았다면 해당지역으로 신청하면 부적격이에요'); }
      else if (m.pick === 'etc' && here) { g = 'warn'; items.push('해당지역 주민이라 해당지역으로 신청할 수 있어요. 해당지역이 먼저 뽑혀 기타지역으로 넣으면 불리할 수 있어요'); }
      if (here && m.stay === 'n') { g = 'risk'; items.push('공고문이 정한 거주기간(예: 수도권 투기과열지구 2년 이상)을 못 채웠으면 해당지역 우선공급이 아니라 기타지역으로 신청해야 해요'); }
      else if (here && m.stay !== 'y') { if (g === 'ok') g = 'warn'; items.push('공고문의 ‘거주기간’ 요건(입주자모집공고일 현재 계속 거주)을 채웠는지 확인하세요'); }
    }
    items.push('기준은 입주자모집공고일 현재 주민등록표상 주소예요. 공고일 뒤에 전입하면 인정되지 않아요');
    out.push({ id: 'area', t: '거주지역 선택', g, head, items, law: '규칙 제4조(주택의 공급대상, 제5항 거주기간)' }); }
  const cnt = { risk: out.filter(x => x.g === 'risk').length, warn: out.filter(x => x.g === 'warn').length };
  return { rows: out, cnt, src: MISTAKE_SRC };
}
const sggCity = s => { const t = String(s || '').replace(/\s/g, ''); const m = t.match(/^(.+?시)(?=.+구$)/); return m ? m[1] : t; };   // '고양시 덕양구' → 고양시(시 단위)
const MISTAKE_SRC = { t: '부적격 당첨 주요 사유: 무주택기간 산정 오류·세대원 주택 소유·거주지역 선택 오류 순(국토교통부 자료, 청약홈 2022~2026. 8. 집계, 2026. 9. 25. 보도)', url: 'https://www.applyhome.co.kr/' };


/* ===== 특별공급: 내 조건에 맞는 유형 고르기 =====
   해당 가능성이 있는 유형만 골라 선정 방식과 내 조건을 맞대어 순서를 정한다(정렬용 내부 값은 화면에 쓰지 않음). */
function bestSpecial(rows, a, e, sum) {
  const kids = +e.kids || 0, out = [];
  rows.filter(r => r.k === '특별공급' && r.g !== 'no').forEach(r => {
    let w = r.g === 'ok' ? 10 : 0, why = '';
    if (r.id === 'baby') { w += 6; why = '2세 미만 자녀(태아 포함)가 있으면 혼인 여부와 관계없이 신청할 수 있는 유형이에요.'; }
    else if (r.id === 'multi') { w += kids >= 3 ? 6 : 3; why = `미성년 자녀 ${kids >= 4 ? '4명 이상' : kids + '명'} — 자녀 수 배점이 클수록 앞서요.`; }
    else if (r.id === 'new') { w += kids >= 1 ? 5 : 2; why = kids >= 1 ? `자녀(태아 포함) ${kids >= 4 ? '4명 이상' : kids + '명'}이 있어 자녀 수 순 선정에서 앞설 수 있어요.` : '자녀가 없으면 자녀 수 순 선정에서 뒤로 밀리고 추첨에 기대게 돼요.'; }
    else if (r.id === 'first') { w += sum < 50 ? 5 : 3; why = '추첨으로 뽑는 유형이라 청약 가점이 낮아도 같은 기회예요.'; }
    else if (r.id === 'old') { w += sum >= 60 ? 5 : 1; why = `가점 순 선정이라 내 가점(${sum}점)이 높을수록 유리해요.`; }
    else if (r.id === 'inst') { w += 4; why = '추천 기관이 대상자를 정해 일반 청약자와 경쟁하지 않아요. 기관에 먼저 신청해야 해요.'; }
    else if (r.id === 'youth') { w += 2; why = '공공분양에서 미혼 청년 몫으로 따로 떼어 둔 물량이에요.'; }
    else if (r.id === 'reloc') { w += 2; why = '이전한 도시·산업단지 공고에서 종사자 몫으로 따로 떼어 둔 물량이에요.'; }
    out.push({ id: r.id, t: r.t, g: r.g, why, w });
  });
  return out.sort((x, y) => y.w - x.w).map(({ w, ...x }) => x);
}

/* ===== 가점제·추첨제 비율 (규칙 제28조 제2항·제4항, 국토교통부령 제1635호 2026. 11. 24. 시행 — 제28조는 이번 개정으로 바뀌지 않음) =====
   flags: 청약홈 공고의 규제 표시(투기과열지구, 조정대상지역 등). 조정대상지역은 청약과열지역으로 본다. */
const METRO = s => /광역시/.test(s);
function lottery(flags, band, sido) {
  flags = flags || [];
  const tg = flags.includes('투기과열지구'), ov = flags.includes('조정대상지역') || flags.includes('청약과열지역');
  const pub = flags.includes('공공주택지구') && CAPITAL.includes(sido);
  let txt, area;
  if (tg || ov) {
    area = tg ? '투기과열지구' : '청약과열지역(조정대상지역)';
    const g = band === 0 ? 40 : band === 1 ? 70 : tg ? 80 : 50;
    txt = `가점제 ${g}% · 추첨제 ${100 - g}%`;
  } else if (pub) {
    area = '수도권 공공주택지구';
    txt = band === 0 ? '가점제 40% · 추첨제 60%' : band === 1 ? '가점제 70% · 추첨제 30%' : '가점제 80% 이하(시장·군수·구청장 공고) · 나머지 추첨제';
  } else {
    area = '그 밖의 지역';
    txt = band <= 1 ? '가점제 40% 이하(시장·군수·구청장 공고) · 나머지 추첨제' : '추첨제 100%(가점제 없음)';
  }
  const note = [];
  if (pub) note.push('공공주택지구 비율은 개발제한구역 해제 면적이 지구의 50% 이상일 때 적용돼요');
  if (tg || ov || CAPITAL.includes(sido) || METRO(sido)) note.push('추첨 물량의 75%는 무주택세대구성원에게 먼저 공급해요(규칙 제28조 제8항)');
  else if (sido === '전남광주통합특별시') note.push('추첨 물량 무주택 우선 공급(규칙 제28조 제8항) 적용 여부는 공고문을 확인하세요');
  return { area, txt, note, noGajum: !tg && !ov && !pub && band === 2 };
}

/* ===== 예정·진행 공고의 예상 당첨 가점(커트라인) 범위 =====
   범위(lo~hi)·평균·근거 요약은 데이터 갱신 때 미리 계산되어 notices.json 각 민영 공고의 cut 에 들어온다.
   cut: [{band, lo, hi, avg, scope, nCx, nRows, from, to}] 또는 [{band, insufficient: true, nCx, nRows, none?}] — 화면은 읽어서 보여 주기만 한다. */
/* 공고 시·도: 청약홈 공고의 시·도 칸이 주소와 다르게 들어온 경우(예: 충청남도 주소인데 충청북도) 주소 앞부분을 우선한다 */
function noticeSido(n) {
  const ad = String(n.ad || '').trim();
  for (const s of SIDO.concat(Object.keys(SIDO_OLD))) if (ad.startsWith(s + ' ') || ad === s) return sidoNorm(s);
  return sidoNorm(n.sd);
}
const bandOf = ar => ar <= 60 ? 0 : ar <= 85 ? 1 : 2;
/* 미리 계산된 면적대 결과 → 화면용 {ok, lo, hi, avg, scope, nCx, nRows, from, to}. 새 필드가 아직 없으면 null(준비 중) */
function cutOf(notice, band) {
  if (!notice || !Array.isArray(notice.cut)) return null;
  const c = notice.cut.find(x => x && +x.band === band);
  if (!c) return null;
  if (c.insufficient) return { ok: false, nRows: +c.nRows || 0, nCx: +c.nCx || 0, none: !!c.none };
  if (c.lo == null || c.hi == null) return null;
  return { ok: true, lo: +c.lo, hi: Math.max(+c.lo, +c.hi), avg: c.avg == null ? +c.lo : +c.avg, scope: c.scope || '', nRows: +c.nRows || 0, nCx: +c.nCx || 0, from: c.from || '', to: c.to || '' };
}
/* 내 가점과 예상 범위 비교: hi 가능성 높음 / mid 경합 / lo 낮음 */
function diag(my, p) {
  if (!p || !p.ok) return null;
  if (my >= p.hi) return { g: 'hi', need: 0 };
  if (my >= p.lo) return { g: 'mid', need: p.hi - my };
  return { g: 'lo', need: p.lo - my, needHi: p.hi - my };
}
/* 지금 조건이 그대로 이어질 때 몇 년 뒤 목표 점수에 닿는지(무주택기간·통장 가입기간만 늘어남, 부양가족은 그대로) */
function yearsTo(a, refStr, target, maxY) {
  if (a && a.quick != null) return undefined;   // 가점만 넣은 경우: 항목별 점수를 몰라 몇 년 뒤인지 계산하지 않음
  maxY = maxY || 15;
  const ref = CY.d8(refStr) || new Date(new Date().toDateString());
  for (let y = 0; y <= maxY; y++) {
    const d = new Date(ref); d.setFullYear(d.getFullYear() + y);
    const s = CY.total(a, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`).sum;
    if (s >= target) return y;
  }
  return null;
}

/* 가점만 바로 넣기(질문을 건너뜀): 0~84 정수만. 항목별 점수는 모름(null) */
function quickTotal(v) {
  const s = String(v == null ? '' : v).trim();
  if (!/^\d{1,2}$/.test(s)) return null;
  const n = +s; if (n > 84) return null;
  const u = { pts: null, why: '' };
  return { quick: true, sum: n, h: u, d: u, c: u };
}
/* 주소의 시·도 표기(서울·서울시·서울특별시 등) → 엔진 시·도 이름 */
function sidoFrom(q) {
  let t = String(q || '').replace(/\s/g, ''); if (!t) return '';
  t = ({ 충북: '충청북도', 충남: '충청남도', 경북: '경상북도', 경남: '경상남도', 전북: '전북특별자치도' })[t] || t;
  const all = SIDO.concat(Object.keys(SIDO_OLD));
  const hit = all.find(s => s === t) || all.find(s => s.startsWith(t.replace(/(특별|광역)?시$|도$/, '')) && t.length >= 2);
  return hit ? sidoNorm(hit) : '';
}
/* 시·군·구 이름 맞추기: '고양시 덕양구'와 '고양덕양구'를 같게 */
const sggKey = s => String(s || '').replace(/\s/g, '').replace(/시(?=[^시]+구$)/, '');

const API = { INST_TYPES, INCOME_PCT, DOCS, DOCS_NOTE, SPECIAL_OTHER, FOREIGN_TXT, SPECIAL_LAW, mistakes, MISTAKE_SRC, sggCity, oldParentRule, depRule, DEP_RULE, OLD_LIVE_FROM, RULE_SRC, RULE_LINKS, ymd, quickTotal, sidoFrom, sggKey, CY, SIDO, CAPITAL, SIDO_OLD, SIDO_ALIAS, sidoNorm, sidoLbl, DEPOSIT, depGroup, eligibility, bestSpecial, lottery, cutOf, diag, yearsTo, bandOf, noticeSido, INCOME_TXT };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.JDJ_CYE = API;
})(typeof self !== 'undefined' ? self : this);
