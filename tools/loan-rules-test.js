/* 대출 한도 계산기(loan/)·대출 규칙(assets/loan-rules.js) 자동 확인 — 실행: node tools/loan-rules-test.js </dev/null
   ① 모든 규칙에 공식 출처(주소·제목·날짜)와 적용일이 붙어 있음
   ② 지역 판정(규제지역·수도권·지방)
   ③ 스트레스 금리: 지역 × 금리 방식(변동·혼합·주기·고정) — 금융위원회 표 값
   ④ 공개된 계산 예시(KB국민은행 KB Think '스트레스 DSR 3단계' 예시: 연소득 1억, 금리 4%, 30년, 수도권) 그대로 나오는지
   ⑤ 어느 규칙이 한도를 막는지(LTV·가격대별 최대 금액·DSR·금지)와 DSR 1억 원 기준
   ⑥ 정책 대출 자격 경계값(이하/초과)
   ⑦ 손으로 계산한 세 가지 예시(서울·경기·지방)
   ⑧ 화면: 기준일 문구·용어 풀이·정보 제공 문구·광고 칸·연결 링크·금지 단어 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const R = require('../assets/loan-rules.js'), L = require('../assets/loan-core.js');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const rows = [];
const check = (name, got, want, basis) => rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want, basis });
const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));

/* ① 출처·날짜 */
{
  let bad = [];
  for (const [id, s] of Object.entries(R.SRC)) if (!/^https:\/\//.test(s.url) || !s.title || !s.org || !(isDate(s.pub) || isDate(s.checked))) bad.push(id);
  check('출처 표: 주소(https)·제목·기관·날짜', bad, []);
  const rules = [];
  ['reg', 'capfree', 'local'].forEach(g => ['none', 'first', 'one', 'multi'].forEach(o => rules.push(['LTV ' + g + ' ' + o, R.LTV[g][o]])));
  rules.push(['가격대별 최대 금액', R.CAP], ['DSR 은행', R.DSR.bank], ['DSR 2금융권', R.DSR.nonbank], ['DSR 1억', R.DSR.over], ['만기', R.TERM.metroRegMax],
    ['수도권 지역', R.REGION.metro], ['규제지역', R.REGION.reg]);
  R.STRESS.periods.forEach(p => rules.push(['스트레스 ' + p.id, p]));
  Object.entries(R.POLICY).forEach(([k, p]) => rules.push(['정책 대출 ' + k, p]));
  R.NOTES.forEach(n => rules.push(['안내 ' + n.id, n]));
  bad = rules.filter(([, r]) => !(r && r.src && r.src.length && r.src.every(id => R.SRC[id]) && r.eff && isDate(r.eff.from))).map(([n]) => n);
  check('모든 규칙에 공식 출처·적용 시작일', bad, []);
  check('스트레스 금리 방식별 비율에 출처·적용일', R.STRESS.typeSrc.every(id => R.SRC[id]) && isDate(R.STRESS.typeEff.from), true);
  check('곧 바뀌는 규칙: 날짜·출처', R.UPCOMING.every(u => isDate(u.d) && u.src.every(id => R.SRC[id])), true);
  check('기준일', R.ASOF, '2026-11-21');
  check('지방 2단계 유예 끝 2026-12-31', R.STRESS.periods[1].eff.to, '2026-12-31', '금융위 행정지도 변경시행 예고(2026.6.18)');
  check('넣지 못한 규칙 목록 있음', R.EXCLUDED.length >= 1, true);
  const official = /(fsc\.go\.kr|korea\.kr|hf\.go\.kr|molit\.go\.kr)/;
  check('출처는 모두 공식 기관 주소', Object.values(R.SRC).every(s => official.test(s.url)), true);
}

/* ② 지역 */
{
  check('서울 송파구 → 규제지역', R.groupOf('11710'), 'reg');
  check('서울 도봉구 → 규제지역(서울 전역)', R.groupOf('11320'), 'reg');
  check('경기 과천 → 규제지역', R.groupOf('41290'), 'reg');
  check('화성 동탄구(2026.7.1 지정) → 규제지역', R.groupOf('41597'), 'reg');
  check('용인 기흥구·구리(2026.7.1 지정) → 규제지역', [R.groupOf('41463'), R.groupOf('41310')], ['reg', 'reg']);
  check('고양 일산동구 → 수도권(규제지역 아님)', R.groupOf('41285'), 'capfree');
  check('인천 연수구 → 수도권', R.groupOf('28185'), 'capfree');
  check('대구 수성구 → 지방', R.groupOf('27260'), 'local');
  check('경기 규제지역 15곳', Object.keys(R.REGION.reg.v.gg).length, 15);
  check('가격대별 최대: 15억 이하 6억·15억 초과 4억·25억 초과 2억·지방 없음', [R.capOf(150000, 'reg'), R.capOf(150001, 'capfree'), R.capOf(250000, 'reg'), R.capOf(250001, 'reg'), R.capOf(999999, 'local')], [60000, 40000, 40000, 20000, Infinity], '금융위 2025.10.15');
}

/* ③ 스트레스 금리 */
{
  const s = (g, t, b, d) => R.stressAdd(g, t, b, d);
  check('수도권·규제지역 변동 3.0%p', [s('reg', 'var'), s('capfree', 'var')], [3, 3], '3.0% × 100% × 100%');
  check('수도권 혼합(고정 5~9년) 2.4%p · 주기형(5~9년) 1.2%p', [s('reg', 'mix', '5-9'), s('reg', 'cyc', '5-9')], [2.4, 1.2], '3단계 80%·40%');
  check('수도권 혼합 9~15년 1.8 · 15~21년 1.2 · 21년 이상 0', [s('reg', 'mix', '9-15'), s('reg', 'mix', '15-21'), s('reg', 'mix', '21+')], [1.8, 1.2, 0], '3단계 60·40·미적용');
  check('수도권 주기형 9~15년 0.9 · 15~21년 0.6', [s('reg', 'cyc', '9-15'), s('reg', 'cyc', '15-21')], [0.9, 0.6], '3단계 30%·20%');
  check('지방 변동 0.75%p', s('local', 'var'), 0.75, '1.5% × 기본 50%');
  check('지방 혼합 0.45 · 주기형 0.225(2단계 비율 60%·30%)', [s('local', 'mix', '5-9'), s('local', 'cyc', '5-9')], [0.45, 0.225], '2단계 표');
  check('전 기간 고정금리 0', [s('reg', 'fixed'), s('local', 'fixed')], [0, 0]);
  check('지방 유예 기간 안(2026-12-31)', R.stressPeriod('local', '2026-12-31').base, 0.5);
  check('지방 유예가 끝난 뒤(2027-01-01): 3단계 원칙·확정 아님 표시', [R.stressPeriod('local', '2027-01-01').base, R.stressPeriod('local', '2027-01-01').confirmed], [1, false]);
  check('내 집 마련 계산기 공용 비율(수도권 3단계·지방 2단계)', [L.TYPE_RATIO, L.TYPE_RATIO_LOCAL], [{ var: 1, mix: 0.8, cyc: 0.4 }, { var: 1, mix: 0.6, cyc: 0.3 }]);
}

/* ④ 공개 예시: KB Think '스트레스 DSR 3단계 시행, 대출 한도 얼만큼 줄었을까?' — 연소득 1억, 금리 4%, 30년 원리금균등, 수도권, 다른 대출 없음 */
{
  const eok = v => Math.round(v / 100) / 100;     // 만원 → 억(소수 둘째)
  const base = { price: 100000, g: 'capfree', own: 'none', income: 10000, rate: 4, term: 30 };
  check('예시: 변동 스트레스 3.0% → 5.01억', eok(L.limit(Object.assign({ rtype: 'var' }, base)).L), 5.01, 'KB Think 표');
  check('예시: 혼합형(5년) → 5.33억', eok(L.limit(Object.assign({ rtype: 'mix', band: '5-9' }, base)).L), 5.33, 'KB Think 표');
  check('예시: 주기형(5년) → 6억(가격대별 최대에 걸림)', [eok(L.limit(Object.assign({ rtype: 'cyc', band: '5-9' }, base)).L), L.limit(Object.assign({ rtype: 'cyc', band: '5-9' }, base)).by], [6, 'CAP'], 'KB Think 표(*6억 한도)');
  const c = L.ctx({ g: 'capfree', income: 10000, rate: 4, term: 30, rtype: 'var' });
  check('예시: 예전 스트레스 1.5%면 5.87억', eok(L.dsrMax(c, 1.5)), 5.87, 'KB Think 표');
}

/* ⑤ 막는 규칙 */
{
  const lim = o => L.limit(Object.assign({ income: 30000, rate: 4, term: 30, rtype: 'fixed', own: 'none' }, o));
  check('LTV가 막음(소득 충분, 10억 규제지역 → 4억)', [lim({ price: 100000, g: 'reg' }).by, lim({ price: 100000, g: 'reg' }).L], ['LTV', 40000]);
  check('가격대별 최대가 막음(20억 수도권 → 4억)', [lim({ price: 200000, g: 'capfree' }).by, lim({ price: 200000, g: 'capfree' }).L], ['CAP', 40000]);
  check('25억 넘으면 2억', lim({ price: 300000, g: 'reg' }).L, 20000);
  const d = lim({ price: 100000, g: 'reg', income: 3000, rtype: 'var' });
  check('DSR이 막음 + 필요한 소득 계산', [d.by, d.incomeNeed > 3000, near(L.dsrMax(L.ctx({ g: 'reg', income: d.incomeNeed, rate: 4, term: 30, rtype: 'var' })), 40000, 3)], ['DSR', true, true]);
  check('2주택 이상 수도권·규제지역 → 금지(0원)', [lim({ price: 50000, g: 'reg', own: 'multi' }).by, lim({ price: 50000, g: 'capfree', own: 'multi' }).L], ['BAN', 0]);
  check('2주택 이상 지방 → LTV 60%', lim({ price: 30000, g: 'local', own: 'multi' }).L, 18000, '금융위 2023.3.2');
  check('생애최초 규제지역 70%(그래도 가격대 최대 6억)', [lim({ price: 50000, g: 'reg', own: 'first' }).L, lim({ price: 100000, g: 'reg', own: 'first' }).L], [35000, 60000]);
  check('생애최초 지방 80%', lim({ price: 30000, g: 'local', own: 'first' }).L, 24000);
  check('2금융권 DSR 50%', L.limit({ price: 100000, g: 'reg', income: 3000, rate: 4, term: 30, rtype: 'var', lender: 'nonbank' }).c.dsrRatio, 0.5);
  const small = L.limit({ price: 14000, g: 'local', own: 'none', income: 1000, rate: 5, term: 30, rtype: 'var' });
  check('DSR 1억 기준: 다른 대출 없고 1억 이하면 DSR 안 따짐', [small.dsrOff, small.by, small.L], [true, 'LTV', 9800]);
  const small2 = L.limit({ price: 14000, g: 'local', own: 'none', income: 1000, debt: 100, rate: 5, term: 30, rtype: 'var' });
  check('다른 대출이 있으면 DSR 따짐', small2.dsrOff, false);
  check('수도권·규제지역 만기 30년까지', L.limit({ price: 50000, g: 'reg', income: 9000, rate: 4, term: 40 }).term, 30);
}

/* ⑥ 정책 대출 경계 */
{
  const pol = h => Object.fromEntries(L.policyLoans(Object.assign({ g: 'capfree', own: 'none', kids: 0 }, h)).map(p => [p.id, p]));
  check('보금자리론: 집값 6억 이하 OK · 6억 초과 안 됨', [pol({ price: 60000, income: 7000 }).bogeum.ok, pol({ price: 60001, income: 7000 }).bogeum.ok], [true, false]);
  check('보금자리론: 소득 7,000 이하 OK · 7,001 안 됨', [pol({ price: 50000, income: 7000 }).bogeum.ok, pol({ price: 50000, income: 7001 }).bogeum.ok], [true, false]);
  check('보금자리론: 신혼 자녀 1명 9,000까지', [pol({ price: 50000, income: 9000, newly: true, kids: 1 }).bogeum.ok, pol({ price: 50000, income: 9001, newly: true, kids: 1 }).bogeum.ok], [true, false]);
  check('보금자리론 한도: 일반 3.6억·생애최초 4.2억·다자녀 4억', [pol({ price: 60000, income: 5000 }).bogeum.cap, pol({ price: 60000, income: 5000, own: 'first' }).bogeum.cap, pol({ price: 60000, income: 5000, kids: 2 }).bogeum.cap], [36000, 42000, 40000]);
  /* 리뷰 수정: 한국주택금융공사 상품 안내 — 규제지역 10%p 차감은 생애최초·실수요자(무주택·6억 이하·부부 합산 7,000만 이하)에는 하지 않음 */
  check('보금자리론 규제지역 LTV: 실수요자 무주택 70% · 생애최초 70% · 1주택(일시적 2주택) 60% · 신혼 소득 8,000 60%',
    [pol({ price: 50000, income: 5000, g: 'reg' }).bogeum.ltv, pol({ price: 50000, income: 5000, g: 'reg', own: 'first' }).bogeum.ltv, pol({ price: 50000, income: 5000, g: 'reg', own: 'one' }).bogeum.ltv, pol({ price: 50000, income: 8000, g: 'reg', newly: true }).bogeum.ltv], [0.7, 0.7, 0.6, 0.6], 'hf.go.kr 보금자리론 상품소개');
  check('보금자리론 DTI: 보통 60% · 규제지역 차감 대상 50% · 실수요자는 60%',
    [pol({ price: 50000, income: 5000 }).bogeum.dti, pol({ price: 50000, income: 5000, g: 'reg', own: 'one' }).bogeum.dti, pol({ price: 50000, income: 5000, g: 'reg' }).bogeum.dti], [0.6, 0.5, 0.6], 'hf.go.kr · 금융위 10.15 FAQ');
  check('보금자리론: 2주택 이상은 안 됨', pol({ price: 50000, income: 5000, own: 'multi' }).bogeum.ok, false);
  check('디딤돌: 집값 5억 이하 OK · 초과 안 됨(신혼은 6억)', [pol({ price: 50000, income: 6000 }).didim.ok, pol({ price: 50001, income: 6000 }).didim.ok, pol({ price: 60000, income: 6000, newly: true }).didim.ok], [true, false, true]);
  check('디딤돌: 소득 6,000 이하 · 생애최초 7,000 이하', [pol({ price: 40000, income: 6001 }).didim.ok, pol({ price: 40000, income: 7000, own: 'first' }).didim.ok, pol({ price: 40000, income: 7001, own: 'first' }).didim.ok], [false, true, false]);
  check('디딤돌 한도: 2억·생애최초 2.4억·신혼 3.2억', [pol({ price: 50000, income: 5000 }).didim.cap, pol({ price: 50000, income: 5000, own: 'first' }).didim.cap, pol({ price: 50000, income: 5000, newly: true }).didim.cap], [20000, 24000, 32000]);
  check('디딤돌 생애최초 LTV: 수도권 70%·지방 80%', [pol({ price: 30000, income: 5000, own: 'first' }).didim.ltv, pol({ price: 30000, income: 5000, own: 'first', g: 'local' }).didim.ltv], [0.7, 0.8]);
  check('디딤돌: 1주택은 안 됨 · 85㎡ 초과 안 됨', [pol({ price: 30000, income: 5000, own: 'one' }).didim.ok, pol({ price: 30000, income: 5000, small: false }).didim.ok], [false, false]);
  check('신생아 특례: 출산·입양 없으면 안 됨', pol({ price: 50000, income: 5000 }).baby.ok, false);
  check('신생아 특례: 집값 9억 이하 · 소득 1.3억 이하(맞벌이 2억)', [pol({ price: 90000, income: 13000, baby: true }).baby.ok, pol({ price: 90001, income: 5000, baby: true }).baby.ok, pol({ price: 50000, income: 13001, baby: true }).baby.ok, pol({ price: 50000, income: 20000, baby: true, dual: true }).baby.ok], [true, false, false, true]);
  check('신생아 특례 한도 4억(2025.6.27 이후 계약)', pol({ price: 90000, income: 5000, baby: true }).baby.est, 40000);
  check('정책 대출은 가격대별 최대(6억·4억·2억)를 따르지 않음 — 상품 한도와 LTV만', pol({ price: 60000, income: 5000, own: 'first' }).bogeum.est, 42000);
}

/* ⑤-2 리뷰 수정: DTI(규제지역 40%·수도권 60%, 스트레스 금리 없음) — DSR을 안 따지는 1억 이하·2금융권 고정금리에서 먼저 막을 수 있음 */
{
  check('DTI 규칙: 규제지역 40% · 수도권 60% · 지방은 넣지 않음', [R.dtiOf('reg'), R.dtiOf('capfree'), R.dtiOf('local')], [0.4, 0.6, null], '금융위 10.15 FAQ 표');
  const nb = L.limit({ price: 100000, g: 'reg', own: 'none', income: 6000, rate: 5, term: 30, rtype: 'fixed', lender: 'nonbank' });
  check('규제지역·2금융권·고정금리·연소득 6,000·10억: DTI 40%가 막음 → 3억 7,256만', [nb.by, Math.round(nb.L)], ['DTI', 37256], '6000×0.4÷12×186.28');
  check('위 경우 4억까지 받으려면 연소득 6,442만', nb.incomeNeed, 6442, '(40000÷186.28×12)÷0.4');
  const sm = L.limit({ price: 20000, g: 'reg', own: 'none', income: 1000, rate: 5, term: 30, rtype: 'var' });
  check('규제지역 2억·연소득 1,000: DSR은 안 따져도(1억 이하) DTI 40%로 6,209만', [sm.dsrOff, sm.by, Math.round(sm.L)], [true, 'DTI', 6209], '1000×0.4÷12×186.28');
  const loc = L.limit({ price: 14000, g: 'local', own: 'none', income: 1000, rate: 5, term: 30, rtype: 'var' });
  check('지방은 DTI 없음 → 1억 이하면 LTV대로', [loc.by, loc.L, loc.dti], ['LTV', 9800, Infinity]);
  const u1 = L.limit({ price: 30000, g: 'local', own: 'none', income: 1500, rate: 5, term: 30, rtype: 'var' });
  check('DSR로 1억 아래가 되면(다른 대출 없음) 1억까지 가능할 수 있다는 참고 표시', [u1.by, u1.under1, Math.round(u1.L)], ['DSR', true, 8568]);
  const sp = L.limit({ price: 100000, code: '11710', own: 'none', income: 7000, rate: 5, term: 30, rtype: 'var' });
  check('은행·변동금리에서는 DTI보다 DSR이 먼저(서울 예시 그대로)', [sp.by, Math.round(sp.dti)], ['DSR', 43466]);
}

/* ⑤-3 세 화면이 같은 함수: 같은 입력이면 대출 한도 계산기(loan/)·내 집 마련(buy/·리포트)·갈아타기(switch/)의 최대 대출액이 같음 */
{
  const SW = require('../switch/switch-core.js');
  const cases = [
    ['서울 10억·1주택 처분·7천·변동', { g: 'reg', code: '11710', P: 100000, income: 7000, rtype: 'var' }],
    ['서울 20억·1주택 처분·2억·주기형', { g: 'reg', code: '11710', P: 200000, income: 20000, rtype: 'cyc' }],
    ['고양 5억·1주택 처분·5천·혼합', { g: 'capfree', code: '41285', P: 50000, income: 5000, rtype: 'mix' }],
    ['대구 3억·1주택 처분·6천·변동', { g: 'local', code: '27260', P: 30000, income: 6000, rtype: 'var' }],
    ['규제지역 2억·1주택 처분·1천(DTI가 막음)', { g: 'reg', code: '11710', P: 20000, income: 1000, rtype: 'var' }],
    ['수도권 3억·1주택 처분·1,500·다른 대출 300', { g: 'capfree', code: '41285', P: 30000, income: 1500, debt: 300, rtype: 'var' }]
  ];
  for (const [name, x] of cases) {
    const base = { income: x.income, debt: x.debt || 0, rate: 5, term: 30, rtype: x.rtype };
    const loan = L.limit(Object.assign({ price: x.P, code: x.code, own: 'one', band: '5-9' }, base));
    const bc = L.ctx(Object.assign({ g: x.g, own: 'one' }, base)), buy = L.loanAt(x.P, bc, L.dsrMax(bc));
    const sc = SW.ctx(x.g, Object.assign({ houses: 1 }, base)), sw = SW.loanAt(x.P, sc, SW.dsrMax(sc));
    check('세 화면 같은 최대 대출: ' + name, [Math.round(buy.L), Math.round(sw.L), buy.by, sw.by], [Math.round(loan.L), Math.round(loan.L), loan.by, loan.by]);
  }
  const dc = SW.ctx('reg', { houses: 1, income: 1000, rate: 5, term: 30, rtype: 'var' });
  check('갈아타기도 DTI 반영(규제지역 2억·1천 → 6,209만, DTI)', [Math.round(SW.loanAt(20000, dc, SW.dsrMax(dc)).L), SW.loanAt(20000, dc, SW.dsrMax(dc)).by], [6209, 'DTI']);
  const mc = SW.ctx('reg', { houses: 2, income: 9000, rate: 5, term: 30 });
  check('갈아타기 2주택 이상 규제지역 → 0원(BAN)', [SW.loanAt(80000, mc, SW.dsrMax(mc)).L, SW.loanAt(80000, mc, SW.dsrMax(mc)).by], [0, 'BAN']);
  const swSrc = read('switch/switch-core.js'), prSrc = read('assets/premium-report.js');
  check('갈아타기·프리미엄 리포트에 따로 만든 LTV·DSR·가격대 계산 없음(loan-core 사용)',
    [/LOAN\.loanAt\(/.test(swSrc), /RULES\.DSR\.bank/.test(swSrc), /LOAN\(\)\.loanAt\(/.test(prSrc), /none:\.40|0\.40 - S\.debt|p <= 150000 \? 60000/.test(prSrc)], [true, false, true, false]);
  for (const f of ['premium/pro/index.html', 'premium/r/index.html', 'premium/view/index.html']) check(f + ': loan-rules·loan-core 불러옴', /loan-rules\.js\?v=3/.test(read(f)) && /loan-core\.js\?v=5/.test(read(f)), true);
  check('프리미엄 리포트: 계산 조건 줄에 실제 금리 유형(주기형 고정 문구 아님)·공유 조건에 금리 유형·기간', [/· 주기형 \$\{S\.rate\}%/.test(prSrc), /TYPE_NAME\[S\.rtype\]/.test(prSrc), /cond = \(\) => \(\{[^}]*rtype: S\.rtype, term: S\.term/.test(prSrc)], [false, true, true]);
  check('갈아타기 화면: 막는 규칙 이름에 DTI', /DTI:'소득\(DTI\)이 한도 결정'/.test(read('switch/index.html')), true);
  check('막는 규칙 이름에 DTI(내 집 마련·리포트·프리미엄·설명)', ['buy/index.html', 'buy/report/index.html', 'assets/premium-report.js', 'assets/narrative.js'].every(f => /DTI:\s*'/.test(read(f))), true);
}

/* ⑦ 손으로 계산한 예시(금리 5%, 30년, 변동, 은행, 다른 대출 없음) — 계산식은 아래 주석 */
{
  /* 서울 송파 무주택, 연소득 7,000, 집값 10억:
     LTV 40% → 4억, 가격대 최대 6억, DSR: 연 2,800 → 월 233.33만, 심사 금리 5+3=8%, 30년 연금 계수 136.28 → 3억 1,799만(DSR이 막음)
     매달 갚을 돈: 3억 1,799만 ÷ 186.28(5% 30년 계수) = 170.7만 */
  const a = L.limit({ price: 100000, code: '11710', own: 'none', income: 7000, rate: 5, term: 30, rtype: 'var' });
  check('서울 10억·무주택·7천: 3억 1,799만, DSR이 막음', [Math.round(a.L), a.by], [31799, 'DSR']);
  check('서울: 매달 약 171만', Math.round(L.monthly(a.L, 5, 30)), 171);
  check('서울: 4억까지 받으려면 연소득 8,806만', a.incomeNeed, 8806, '(40000 ÷ 136.28 × 12 + 0) ÷ 0.4');
  /* 경기 고양 일산동구 생애최초, 연소득 5,000, 집값 5억: LTV 70% → 3억 5,000, DSR: 월 166.67만 × 136.28 = 2억 2,714만(DSR) */
  const b = L.limit({ price: 50000, code: '41285', own: 'first', income: 5000, rate: 5, term: 30, rtype: 'var' });
  check('경기 5억·생애최초·5천: 2억 2,714만, DSR이 막음', [Math.round(b.L), b.by, b.a], [22714, 'DSR', 35000]);
  /* 대구 수성 1주택(처분 조건), 연소득 6,000, 집값 3억: LTV 70% → 2억 1,000만, DSR 심사 금리 5.75% → 월 200만 × 171.36 = 3억 4,272만 → LTV가 막음 */
  const c = L.limit({ price: 30000, code: '27260', own: 'one', income: 6000, rate: 5, term: 30, rtype: 'var' });
  check('지방 3억·1주택·6천: 2억 1,000만, LTV가 막음', [Math.round(c.L), c.by, Math.round(c.d)], [21000, 'LTV', 34272]);
}

/* ⑧ 화면 */
{
  const h = read('loan/index.html');
  check('화면: 기준일 문구', h.includes('실제 한도는 은행 심사·신용·다른 대출에 따라 달라질 수 있어요. 기준일: ${R.ASOF}'), true);
  check('화면: 용어 풀이 LTV·DSR·스트레스 DSR·생애최초', ['LTV란?', 'DSR이란?', '스트레스 DSR이란?', '생애최초란?'].every(t => h.includes(t)), true);
  check('화면: 막는 규칙 쉬운 말', ['소득 기준(DSR)이 가장 먼저 막혀요', '집값 기준(LTV)이 가장 먼저 막혀요', '집값 구간별 최대 금액이 가장 먼저 막혀요'].every(t => h.includes(t)), true);
  check('화면: 정보 제공·연결하지 않음 문구', h.includes('특정 금융회사나 상품을 권하거나 대출을 연결해 드리지 않아요'), true);
  check('화면: 규칙은 loan-rules.js 한 곳에서', h.includes('assets/loan-rules.js?v=') && !/0\.40|LTV\s*=\s*\{/.test(h.replace(/<style[\s\S]*?<\/style>/g, '')), true);
  check('화면: 광고 칸은 대출 상담 업종(loan) 하나', (h.match(/data-ad-slot=/g) || []).length === 1 && h.includes('data-ad-slot="loan_end" data-ad-cat="loan"'), true);
  check('화면: 규제가 바뀌면 알려 드려요 → 모닝 브리핑', h.includes('규제가 바뀌면 알려 드려요') && h.includes('href="../brief/?src=loan"'), true);
  check('화면: 서비스 이름은 SITE_NAME 칸', h.includes('data-site-name') && !h.includes('장대장부동산그룹'), true);
  check('화면: DTI 막힘 문구·DTI 막대·용어 풀이', ['소득 기준(DTI)이 가장 먼저 막혀요', 'DTI란?', '④ 소득 기준(DTI)'].every(t => h.includes(t)), true);
  check('화면: 지방 2주택 이상 60%는 참고 문구(1주택 유지는 은행 확인)', h.includes('60%는 이미 집이 2채 이상인 경우예요'), true);
  check('화면: 정책 대출 DTI는 상품별 비율로 표시(60% 고정 문구 없음)', !h.includes('DTI) 60% 이내 심사가 따로') && h.includes('DTI ${pct(p.dti)} 이내 심사 따로'), true);
  check('화면: 금지 단어 없음(시험·검증·채점)', /(시험|검증|채점)/.test(h), false);
  check('화면: 주소로 받은 값(p·g·n·b·a·o)만 채우고 연소득은 주소에 없음', h.includes("Q.get('p')") && !/Q\.get\('(i|income)'\)/.test(h), true);
  const home = read('index.html');
  check('홈: 메뉴 대출 한도 · 카드 "내 대출 한도는 얼마?"', home.includes('href="loan/" data-track="home_to_loan"') && home.includes('내 대출 한도는 얼마?'), true);
  check('홈: 첫 화면 순서(소개 → 광고 배너 → 지도 버튼) 앞에 대출 카드 없음', home.indexOf('data-ad-slot="home_top"') < home.indexOf('class="maplink"') && home.indexOf('class="maplink"') < home.indexOf('home_card_loan'), true);
  check('단지 시세 시트·내 집 시세·리포트·갈아타기·내 집 마련 → 대출 한도', [read('assets/price-sheet.js').includes('이 집 대출 한도 계산하기'), read('mine/index.html').includes('mine_to_loan'), read('assets/premium-report.js').includes('premium_to_loan'), read('switch/index.html').includes('switch_to_loan'), read('buy/index.html').includes('buy_to_loan'), read('buy/report/index.html').includes('report_to_loan')], [true, true, true, true, true, true]);
  const PS = require('../assets/price-sheet.js');
  check('대출 한도 주소: 집값·지역·단지만', PS.loanHref({ src: 'mine', price: 100000, code: '11710', apt: '헬리오시티', band: '84㎡대', area: 84.9 }), '/jangdaejang-calc/loan/?src=mine&p=100000&g=11710&n=%ED%97%AC%EB%A6%AC%EC%98%A4%EC%8B%9C%ED%8B%B0&b=84%E3%8E%A1%EB%8C%80&a=84.9');
  for (const f of ['buy/index.html', 'buy/report/index.html', 'switch/index.html', 'premium/view/index.html', 'chungyak/price/index.html', 'loan/index.html']) {
    const s = read(f), i = s.indexOf('loan-rules.js'), j = Math.min(...['rec-core.js', 'loan-core.js'].map(x => s.indexOf(x)).filter(x => x >= 0));
    check(`${f}: loan-rules.js 를 rec-core·loan-core 보다 먼저`, i >= 0 && i < j, true);
  }
  const sw = read('sw.js');
  check('sw.js: 대출 한도 화면·규칙 파일 미리 저장', sw.includes("'./loan/'") && sw.includes('/assets/loan-rules.js?v=3') && sw.includes('/assets/loan-core.js?v=5'), true);
}

let pass = 0;
rows.forEach(r => { if (r.ok) pass++; console.log((r.ok ? '  ok  ' : '  FAIL') + ' ' + r.name + (r.ok ? '' : `  → ${JSON.stringify(r.got)} (기대 ${JSON.stringify(r.want)})`) + (r.basis && !r.ok ? ' · ' + r.basis : '')); });
console.log(`\n대출 한도 계산기: ${pass}/${rows.length} 통과`);
process.exit(pass === rows.length ? 0 : 1);
