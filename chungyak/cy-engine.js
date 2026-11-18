/* 장대장 청약 엔진 — 가점 계산 · 1순위/특별공급 간이 판정 · 예정 공고 예상 당첨 가점(커트라인) 범위
   브라우저 안에서만 계산합니다(입력값을 서버로 보내지 않음). node 테스트: node tools/chungyak-test.js
   근거: 「주택공급에 관한 규칙」(국토교통부령 제1592호, 2026. 6. 15. 시행) — 국가법령정보센터(law.go.kr)
     · 가점 산정: 별표 1(가점제 적용기준)
     · 가점제·추첨제 비율: 제28조 제2항(85㎡ 이하)·제4항(85㎡ 초과), 추첨 물량 무주택 우선: 제28조 제8항
     · 민영주택 신생아 특별공급 신설: 2026. 6. 15. 시행 개정(국토교통부 2026. 6. 14. 발표) */
(function (root) {
/* ===== 청약 가점 계산 (주택공급에 관한 규칙 별표 1, 2024.12.18 개정 — law.go.kr) ===== */
const CY = (() => {
  const d8 = s => { if (!s) return null; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? null : d; };
  const months = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0);
  const addYears = (d, n) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; };
  const ymTxt = m => { const y = Math.floor(m / 12), r = m % 12; return (y ? y + '년' : '') + (r ? (y ? ' ' : '') + r + '개월' : (y ? '' : '0개월')); };
  const fmtD = d => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  // 무주택기간: 1년 미만 2점, 1년마다 +2, 15년 이상 32점 (별표 1)
  function homeless(a, ref) {
    if (a.own) return { pts: 0, why: '세대원 중 주택을 가진 사람이 있어 무주택기간 점수는 0점으로 계산했습니다.' };
    const birth = d8(a.birth); if (!birth) return { pts: 0, why: '생년월일이 없습니다.' };
    const at30 = addYears(birth, 30);
    let start = at30, basis = `만 30세가 된 ${fmtD(at30)}`;
    const mar = a.married ? d8(a.marDate) : null;
    if (mar && mar < at30) { start = mar; basis = `30세 전 혼인신고일 ${fmtD(mar)}`; }
    const sold = a.soldDate ? d8(a.soldDate) : null;
    if (sold && sold > start) { start = sold; basis = `마지막으로 집을 처분한 ${fmtD(sold)}`; }
    if (start > ref) return { pts: 0, why: `무주택기간은 ${basis}부터 셉니다. 기준일에 아직 시작 전이라 0점입니다(만 30세 미만 미혼이면 0점).` };
    const m = months(start, ref), y = Math.floor(m / 12);
    const pts = Math.min(32, 2 + 2 * y);
    const band = y >= 15 ? '15년 이상' : (y === 0 ? '1년 미만' : `${y}년 이상 ${y + 1}년 미만`);
    return { pts, months: m, why: `${basis}부터 ${ymTxt(m)} → ‘${band}’ 구간 ${pts}점` };
  }
  // 부양가족: 0명 5점, 1명마다 +5, 6명 이상 35점
  function dependents(n) {
    n = Math.max(0, n | 0);
    const pts = Math.min(35, 5 + 5 * n);
    return { pts, why: `본인 제외 ${n}명 → ${n >= 6 ? '6명 이상' : n + '명'} ${pts}점` };
  }
  // 청약통장: 6개월 미만 1점, 6개월~1년 미만 2점, 이후 1년마다 +1, 15년 이상 17점
  function accScore(m) { return m < 6 ? 1 : m < 12 ? 2 : Math.min(17, 2 + Math.floor(m / 12)); }
  // 배우자 통장: 가입기간의 50%에 해당하는 기간으로 최대 3점 (1년 미만 1점, 1~2년 2점, 2년 이상 3점), 본인과 합쳐 17점 한도
  function spouseScore(m) { return m == null ? 0 : m < 12 ? 1 : m < 24 ? 2 : 3; }
  function account(a, ref) {
    const j = d8(a.accDate);
    if (!j || a.noAcc) return { pts: 0, why: '청약통장이 없으면 가점제 청약을 할 수 없습니다(0점으로 표시).' };
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
    const h = homeless(a, ref), d = dependents(a.deps), c = account(a, ref);
    return { h, d, c, sum: h.pts + d.pts + c.pts };
  }
  return { homeless, dependents, account, accScore, spouseScore, total, months, d8 };
})();

/* ===== 1순위·특별공급 간이 체크 (주택공급에 관한 규칙, 2026.6.15 시행 — law.go.kr) ===== */
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

  // 민영주택 1순위 (제28조 제1항 제1호)
  function priv(reg) {
    const bad = [], unk = [], ok = [];
    const need = reg === 'y' ? 24 : cap ? 12 : 6;
    if (a.noAcc || !a.accDate) bad.push('청약통장이 없습니다');
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
    if (a.noAcc || !a.accDate) bad.push('청약통장이 없습니다');
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
    law: e.kind === 'p' ? '규칙 제28조 제1항 제1호, 별표 2' : '규칙 제27조 제1항 제1호'
  }));
  const first1 = rk.every(x => !x.bad.length);       // 모든 경우에 1순위 결격이 없음

  // 신혼부부 (제41조)
  { const bad = [], unk = [];
    const mar = a.married ? CY.d8(a.marDate) : null;
    if (!mar) bad.push('혼인 중인 경우에 해당해요(예비 신혼부부·한부모 가족 등은 공고문 확인)');
    else { const m = CY.months(mar, ref); if (m >= 84) bad.push(`혼인기간 ${Math.floor(m / 12)}년 — 7년 이내여야 해요`); }
    if (!noHouse) bad.push('무주택세대구성원이어야 해요');
    unk.push(INCOME_TXT);
    out.push({ k: '특별공급', id: 'new', how: e.kind === 'p' ? '소득 구간별 단계 안에서 미성년 자녀(태아 포함)가 많은 순, 같으면 추첨으로 뽑아요(민영주택).' : '국민주택은 선정 방식(배점 등)이 공고마다 달라요. 입주자모집공고문을 확인하세요.', t: '신혼부부 특별공급', g: grade(bad, unk), items: [...bad, ...unk], law: '규칙 제41조' }); }
  // 생애최초 (제43조, 민영은 제3항)
  { const bad = [], unk = [];
    if (!noHouse || e.ever === 'n') bad.push('세대원 모두 과거에 주택을 가진 적이 없어야 해요'); else if (e.ever === 'u') unk.push('세대원 모두 과거 주택 소유 이력이 없는지 확인하세요');
    if (!first1) unk.push('1순위에 해당해야 해요(위 1순위 결과 확인)');
    if (e.tax === 'n') bad.push('근로자·자영업자로 소득세를 5년 이상 납부해야 해요'); else if (e.tax === 'u') unk.push('소득세 5년 이상 납부 여부를 확인하세요');
    if (e.kind === 'p' && !a.married && +e.kids === 0) unk.push('민영주택은 혼인 중이거나 자녀가 있는 경우가 기본이에요. 1인 가구 등 다른 기준은 공고문을 확인하세요');
    if (e.kind === 'g') unk.push('국민주택은 저축액이 선납금 포함 600만원 이상이어야 해요');
    unk.push(INCOME_TXT);
    out.push({ k: '특별공급', id: 'first', how: e.kind === 'p' ? '소득 구간별 단계 안에서 추첨으로 뽑아요. 청약 가점과는 관계없어요(민영주택).' : '추첨 방식이 기본이에요. 소득 단계 등 세부 방식은 입주자모집공고문을 확인하세요.', t: '생애최초 특별공급', g: grade(bad, unk), items: [...bad, ...unk], law: '규칙 제43조' }); }
  // 다자녀 (제40조)
  { const bad = [], unk = [];
    if (+e.kids < 2) bad.push('미성년 자녀가 2명 이상이어야 해요');
    if (!noHouse) bad.push('무주택세대구성원이어야 해요');
    unk.push('청약통장·소득·자산 요건과 배점 기준은 공고문에서 확인하세요');
    out.push({ k: '특별공급', id: 'multi', how: '자녀 수·영유아 자녀 수·세대 구성·무주택기간·해당 시·도 거주기간·청약통장 가입기간 배점을 더해 높은 순으로 뽑아요.', t: '다자녀가구 특별공급', g: grade(bad, unk), items: [...bad, ...unk], law: '규칙 제40조' }); }
  // 노부모 부양 (제46조)
  { const bad = [], unk = [];
    if (e.old !== 'y') bad.push('만 65세 이상 직계존속(배우자 직계존속 포함)을 3년 이상 계속 부양해야 해요');
    if (e.head === 'n') bad.push('세대주여야 해요'); else if (e.head === 'u') unk.push('세대주인지 확인하세요');
    if (!noHouse) bad.push('무주택세대구성원이어야 해요(피부양자의 배우자도 무주택)');
    if (!first1) unk.push('1순위에 해당해야 해요(위 1순위 결과 확인)');
    out.push({ k: '특별공급', id: 'old', how: e.kind === 'p' ? '일반공급처럼 청약 가점이 높은 순으로 뽑아요(민영주택). 위에서 계산한 내 가점이 그대로 쓰여요.' : '국민주택은 일반공급처럼 납입 인정 금액·횟수 순(순차제)이 기본이에요. 입주자모집공고문을 확인하세요.', t: '노부모 부양 특별공급', g: grade(bad, unk), items: [...bad, ...unk], law: '규칙 제46조' }); }
  // 신생아
  { const bad = [], unk = [];
    if (e.baby !== 'y') bad.push('기준일 현재 2세 미만(태아·입양 포함) 자녀가 있어야 해요');
    if (!noHouse) bad.push('무주택세대구성원이어야 해요');
    if (!first1) unk.push('1순위에 해당해야 해요(위 1순위 결과 확인)');
    unk.push(INCOME_TXT);
    out.push({ k: '특별공급', id: 'baby', how: e.kind === 'p' ? '2026년 6월 15일 시행 규칙 개정으로 민영주택에도 생긴 유형이에요(혼인 여부와 무관). 소득 단계·추첨 등 세부 선정 방식은 입주자모집공고문을 확인하세요.' : '공공분양(국민주택)에서 운영해 온 유형이에요. 세부 선정 방식은 입주자모집공고문을 확인하세요.', t: '신생아 특별공급', g: grade(bad, unk), items: [...bad, ...unk], law: '규칙 신생아 특별공급 조항' }); }
  return out;
}


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
    out.push({ id: r.id, t: r.t, g: r.g, why, w });
  });
  return out.sort((x, y) => y.w - x.w).map(({ w, ...x }) => x);
}

/* ===== 가점제·추첨제 비율 (규칙 제28조 제2항·제4항, 2026. 6. 15. 시행) =====
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
  maxY = maxY || 15;
  const ref = CY.d8(refStr) || new Date(new Date().toDateString());
  for (let y = 0; y <= maxY; y++) {
    const d = new Date(ref); d.setFullYear(d.getFullYear() + y);
    const s = CY.total(a, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`).sum;
    if (s >= target) return y;
  }
  return null;
}

const API = { CY, SIDO, CAPITAL, SIDO_OLD, SIDO_ALIAS, sidoNorm, sidoLbl, DEPOSIT, depGroup, eligibility, bestSpecial, lottery, cutOf, diag, yearsTo, bandOf, noticeSido, INCOME_TXT };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.JDJ_CYE = API;
})(typeof self !== 'undefined' ? self : this);
