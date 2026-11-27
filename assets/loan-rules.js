/* 집예보 주택담보대출 규칙 — 대출 한도 계산기(loan/)·내 집 마련(buy/)·갈아타기(switch/)·리포트가 모두 이 파일 하나를 읽어요.
   규칙을 바꿀 때는 이 파일만 고치면 됩니다. 모든 규칙에는 값(v)·공식 출처(src → SRC 표)·적용 기간(eff: from~to)이 붙어 있어요.
   원칙: 공식 발표(금융위원회·국토교통부·정책브리핑·한국주택금융공사·주택도시기금)에서 원문을 확인한 숫자만 넣는다.
         확인하지 못한 규칙은 넣지 않고 맨 아래 EXCLUDED 에 이유를 적는다. 금액 단위: 만원, 비율: 0~1, 금리: %(연).
   tools/loan-rules-test.js 가 출처·날짜가 모두 붙어 있는지, 계산 예시가 손으로 계산한 값과 같은지 확인해요. */
(function (root) {
  'use strict';
  var ASOF = '2026-11-21';   // 기준일: 아래 공식 출처를 마지막으로 확인한 날

  /* ---------- 공식 출처 ---------- (pub: 발표·게시일. 게시일이 따로 없는 상품 안내 페이지는 checked: 확인한 날) */
  var SRC = {
    fsc220617: { org: '금융위원회', title: '새정부 가계대출 관리방향 — 단계적 규제 정상화방안(차주단위 DSR 3단계)', pub: '2022-06-17', url: 'https://www.fsc.go.kr/no040101?cnId=1185' },
    fsc230302: { org: '금융위원회', title: '「은행업 감독규정」 등 5개 규정 개정안 의결 — 다주택자 규제지역 내 주택담보대출 허용', pub: '2023-03-02', url: 'https://www.fsc.go.kr/no010101/79514' },
    fsc231227: { org: '금융위원회', title: '전 금융권의 변동·혼합·주기형 대출상품에 대하여 스트레스 DSR 제도가 시행됩니다', pub: '2023-12-27', url: 'https://www.fsc.go.kr/no010101/81343' },
    fsc250520: { org: '금융위원회', title: '3단계 스트레스 DSR 시행방안 확정·발표', pub: '2025-05-20', url: 'https://www.fsc.go.kr/no010101/84617' },
    fsc250627: { org: '금융위원회', title: '「긴급 가계부채 점검회의」를 개최하여 수도권 중심의 「가계부채 관리 강화 방안」 발표', pub: '2025-06-27', url: 'https://www.fsc.go.kr/edu/news/84845' },
    fsc251015: { org: '금융위원회', title: '「주택시장 안정화 대책」 관련 「긴급 가계부채 점검회의」 개최 — 주택시장 안정화를 위한 대출수요 관리 방안 발표', pub: '2025-10-15', url: 'https://www.fsc.go.kr/po010101/85432' },
    fscfaq251015: { org: '금융위원회', title: '대출수요 관리 방안 FAQ', pub: '2025-10-15', url: 'https://fsc.go.kr/po020201/85518' },
    fscfaq251017: { org: '금융위원회', title: '「10.15 주택시장 안정화 대책」 관련 FAQ', pub: '2025-10-17', url: 'https://fsc.go.kr/po020201/85466' },
    kr251015: { org: '국토교통부·정책브리핑', title: '서울 전역·경기 12곳 투기과열지구·토지거래허가구역 지정', pub: '2025-10-15', url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148950973' },
    kr251015b: { org: '정책브리핑(관계부처 합동 브리핑)', title: '주택시장 안정화 대책 — 부처 브리핑', pub: '2025-10-15', url: 'https://www.korea.kr/briefing/policyBriefingView.do?newsId=156722073' },
    fsc251210: { org: '금융위원회', title: '2025년 11월중 가계대출 동향(잠정) 및 「가계부채 점검회의」 개최(2026년 상반기 스트레스 DSR)', pub: '2025-12-10', url: 'https://www.fsc.go.kr/no010101/85824' },
    fsc260618: { org: '금융위원회', title: '스트레스DSR 3단계 행정지도 변경시행 예고(2026.7.1 시행)', pub: '2026-06-18', url: 'https://better.fsc.go.kr/fsc_new/status/adminMap/PrvntcDetail.do?muNo=144&postNo=5349&stNo=11' },
    fsc260630: { org: '금융위원회', title: '규제지역 추가 지정 관련 「긴급 가계부채 점검회의」 개최', pub: '2026-06-30', url: 'https://www.fsc.go.kr/no010101/87222' },
    kr260630: { org: '국토교통부·정책브리핑', title: "'동탄·기흥·구리' 3곳 투기과열지구·조정대상지역 지정", pub: '2026-06-30', url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148967354' },
    fsc260813: { org: '금융위원회', title: '부동산 시장 안정을 위한 금융 종합대책 ② — 일관된 수요 관리기조, 청년 등 실수요자 금융지원 강화', pub: '2026-08-13', url: 'https://fsc.go.kr/no040000?cnId=3374' },
    kr260814: { org: '금융위원회·정책브리핑', title: '일관된 수요 관리기조, 청년 등 실수요자 금융지원 강화', pub: '2026-08-14', url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148970085' },
    hfBogeum: { org: '한국주택금융공사', title: '보금자리론 상품소개(일반)', checked: '2026-11-21', url: 'https://www.hf.go.kr/ko/sub01/sub01_01_01.do' },
    hfRate: { org: '한국주택금융공사', title: '보금자리론 금리안내(2026.11.9 공시)', pub: '2026-11-09', url: 'https://www.hf.go.kr/ko/sub01/sub01_01_04.do' },
    hfDidim: { org: '한국주택금융공사', title: '내집마련 디딤돌대출 상품소개', checked: '2026-11-21', url: 'https://hf.go.kr/ko/sub01/sub01_02_01.do' },
    nhufBaby: { org: '주택도시기금', title: '신생아 특례 디딤돌대출 대출 안내', checked: '2026-11-21', url: 'https://nhuf.molit.go.kr/FP/FP05/FP0503/FP05030801.jsp' }
  };

  /* ---------- 지역 ---------- */
  var REG = root.JDJ_REG || (typeof require === 'function' ? require('./reg-zones.js') : null);
  function regGG(date) { var o = {}; REG.regList(date).forEach(function (c) { if (c.slice(0, 2) === '41') o[c] = REG.NAMES[c][1]; }); return o; }
  var REGION = {
    /* 수도권 = 서울(11)·인천(28)·경기(41) */
    metro: { v: ['11', '28', '41'], src: ['fsc250627'], eff: { from: '2025-06-28' } },
    /* 규제지역(투기과열지구·조정대상지역): 지정 목록·날짜는 assets/reg-zones.js(JDJ_REG) 한 곳에서 읽어요 — 이 파일보다 먼저 불러와야 해요.
       gg = 오늘 규제지역인 경기 시·군·구(코드: 이름). 서울은 지금 25개 구 전역 */
    reg: {
      v: { seoulAll: REG.listAt('ovh', REG.today()).filter(function (c) { return c.slice(0, 2) === '11'; }).length === 25, gg: regGG(REG.today()) },
      src: ['kr251015', 'fsc251015', 'kr260630', 'fsc260630'],
      eff: { from: '2025-10-16', note: '서울 전역·경기 12곳 2025.10.16부터, 화성 동탄구·용인 기흥구·구리시 2026.7.1부터 (' + REG.basis() + ')' },
      checked: REG.CHECKED
    }
  };

  /* ---------- LTV(집값 대비 대출 비율) ----------
     own: none 무주택 · first 생애최초(세대원 모두 집을 가진 적 없음) · one 1주택(기존 집 6개월 안에 팔기로 약정) · multi 2주택 이상(또는 1주택인데 안 팖)
     g: reg 규제지역 · capfree 규제지역이 아닌 수도권 · local 지방(규제지역 아님) */
  var LTV = {
    reg: {
      none:  { v: 0.40, src: ['fsc251015', 'fscfaq251015'], eff: { from: '2025-10-16' } },
      one:   { v: 0.40, src: ['fsc251015', 'fscfaq251015', 'fsc250627'], eff: { from: '2025-10-16' }, cond: '기존 집을 대출받은 날부터 6개월 안에 팔기로 약정' },
      first: { v: 0.70, src: ['fsc250627', 'fscfaq251017', 'fsc260630'], eff: { from: '2025-06-28' }, cond: '6개월 안에 전입' },
      multi: { v: 0, src: ['fsc250627', 'fsc260630'], eff: { from: '2025-06-28' } }
    },
    capfree: {
      none:  { v: 0.70, src: ['fsc251015', 'fsc260813'], eff: { from: '2025-06-28' } },
      one:   { v: 0.70, src: ['fsc250627'], eff: { from: '2025-06-28' }, cond: '기존 집을 6개월 안에 팔기로 약정' },
      first: { v: 0.70, src: ['fsc250627'], eff: { from: '2025-06-28' }, cond: '6개월 안에 전입' },
      multi: { v: 0, src: ['fsc250627', 'fsc260630'], eff: { from: '2025-06-28' } }
    },
    local: {
      none:  { v: 0.70, src: ['fsc250627', 'fsc260813'], eff: { from: '2025-06-28' } },
      one:   { v: 0.70, src: ['fsc250627'], eff: { from: '2025-06-28' }, cond: '기존 집을 6개월 안에 팔기로 약정' },
      first: { v: 0.80, src: ['fsc250627'], eff: { from: '2025-06-28' } },
      multi: { v: 0.60, src: ['fsc230302'], eff: { from: '2023-03-02' } }
    }
  };

  /* ---------- 집값에 따른 주택 구입 주담대 최대 금액(수도권·규제지역) ---------- 정책대출(보금자리론·디딤돌 등)은 각 상품 한도를 따름 */
  var CAP = {
    v: [{ upTo: 150000, max: 60000 }, { upTo: 250000, max: 40000 }, { upTo: null, max: 20000 }],
    scope: '수도권·규제지역',
    src: ['fsc251015', 'fscfaq251015', 'fsc260813'], eff: { from: '2025-10-16' }
  };

  /* ---------- DSR(1년 동안 갚는 모든 대출 원리금 ÷ 연소득) ---------- */
  var DSR = {
    bank:    { v: 0.40, src: ['fsc220617', 'fsc260813'], eff: { from: '2022-07-01' } },
    nonbank: { v: 0.50, src: ['fsc220617', 'fsc260813'], eff: { from: '2022-07-01' } },
    /* 모든 대출(주담대·신용대출 등) 합계가 1억 원을 넘는 사람에게 적용 */
    over:    { v: 10000, src: ['fsc220617'], eff: { from: '2022-07-01' } }
  };

  /* ---------- DTI(1년 동안 갚는 이 주담대 원리금 + 다른 대출 이자 ÷ 연소득) ----------
     DSR(스트레스 금리 포함)보다 대개 느슨하지만, DSR을 따지지 않는 1억 원 이하 대출이나 2금융권(DSR 50%)·고정금리에서는 DTI가 먼저 막을 수 있어요.
     계산에서는 다른 대출의 1년 원리금 전체를 넣어 보수적으로 봐요(실제 DTI는 다른 대출의 이자만 넣음). 스트레스 금리는 더하지 않아요. */
  var DTI = {
    reg:     { v: 0.40, src: ['fscfaq251017'], eff: { from: '2025-10-16' }, note: '투기과열지구 기준(지금 규제지역은 모두 투기과열지구)' },
    capfree: { v: 0.60, src: ['fscfaq251017'], eff: { from: '2025-10-16' }, note: '수도권(규제지역 아님) 아파트' }
  };

  /* ---------- 대출 기간 ---------- */
  var TERM = { metroRegMax: { v: 30, src: ['fsc250627'], eff: { from: '2025-06-28' }, scope: '수도권·규제지역 주담대' } };

  /* ---------- 스트레스 DSR ----------
     한도를 계산할 때만 실제 금리에 '스트레스 금리'를 더해 한도를 줄여요(실제로 내는 이자와는 상관없음).
     더하는 금리 = 스트레스 금리(rate) × 기본 적용 비율(base) × 금리 유형별 비율(type) */
  var STRESS = {
    periods: [
      { id: 'metroReg', scope: '수도권·규제지역 주담대', rate: 3.0, base: 1, stage: 3, src: ['fsc251015', 'fscfaq251015', 'fsc251210', 'fsc260618'], eff: { from: '2025-10-16' } },
      { id: 'local', scope: '지방 주담대(규제지역 아님)', rate: 1.5, base: 0.5, stage: 2, src: ['fsc250520', 'fsc251210', 'fsc260618'], eff: { from: '2026-07-01', to: '2026-12-31' },
        note: '지방 주담대는 3단계 대신 기본 적용 50%(2단계)를 2026.12.31까지 유지' }
    ],
    /* 금리 유형별 비율 — 금융위원회 표의 '만기 30년' 예시(고정 기간·금리 바뀌는 주기 구간별). 단계 2·3 */
    type: {
      2: { var: 1, fixed: 0, mix: { '5-9': 0.6, '9-15': 0.4, '15-21': 0.2, '21+': 0 }, cyc: { '5-9': 0.3, '9-15': 0.2, '15-21': 0.1 } },
      3: { var: 1, fixed: 0, mix: { '5-9': 0.8, '9-15': 0.6, '15-21': 0.4, '21+': 0 }, cyc: { '5-9': 0.4, '9-15': 0.3, '15-21': 0.2 } }
    },
    typeSrc: ['fsc231227', 'fsc250520', 'fsc251210'], typeEff: { from: '2025-07-01' },
    typeNote: '만기 30년 기준 비율이에요. 고정 기간(주기)이 만기에서 차지하는 비중으로 정해져서 만기가 다르면 비율이 달라질 수 있어요. 전 기간 고정금리는 스트레스 금리를 더하지 않아요.'
  };

  /* ---------- 정책 대출(나라에서 낮은 금리로 빌려주는 대출) ----------
     은행 주담대의 가격대별 최대 금액(6억·4억·2억)이 아니라 상품마다 정한 한도를 따르고, DSR 대신 DTI 60% 이내로 심사해요. */
  var POLICY = {
    bogeum: {
      name: '보금자리론', org: '한국주택금융공사', src: ['hfBogeum', 'hfRate', 'fsc250627', 'fsc260813'], eff: { from: '2026-10-19', note: '상품 설명서 개정(2026.10.19) 기준' },
      own: ['none', 'first', 'one'], ownNote: '무주택 또는 일시적 2주택(기존 집을 3년 안에 처분)',
      income: { v: 7000, newly: [8500, 9000, 10000], multiKid: 10000, newlyOne: 7000, note: '부부 합산. 신혼(혼인 7년 이내)은 자녀 없음 8,500만·1명 9,000만·2명 이상 1억, 다자녀 1억. 신혼은 신청인 1명 소득이 7,000만 이하여도 돼요' },
      price: { v: 60000 },
      cap: { v: 36000, multiKid: 40000, first: 42000 },
      ltv: { v: 0.70, regMinus: 0.10, note: '아파트 기준. 규제지역은 10%p 낮음. 다만 생애최초와 실수요자(무주택·집값 6억 이하·부부 합산 연소득 7,000만 이하)는 낮추지 않음' },
      real: { income: 7000, price: 60000 },
      dti: 0.60, dtiRegMinus: 0.10,
      rate: { v: 5.20, term: 30, kind: '아낌e보금자리론 30년 고정', pub: '2026-11-09', regPlus: 0.2 },   /* 규제지역 담보 0.2%p 가산(hfRate) */
      movein: '수도권·규제지역은 대출 후 6개월 안에 전입'
    },
    didim: {
      name: '내집마련 디딤돌대출', org: '주택도시기금(한국주택금융공사 안내)', src: ['hfDidim', 'fsc250627', 'fscfaq251017'], eff: { from: '2025-06-28', note: '한도 축소(2025.6.27 발표) 반영' },
      own: ['none', 'first'], ownNote: '무주택 세대주',
      income: { v: 6000, first: 7000, twoKid: 7000, newly: 8500 },
      asset: 51100,
      price: { v: 50000, newlyOrTwoKid: 60000 },
      area: 85,
      cap: { v: 20000, first: 24000, newlyOrTwoKid: 32000 },
      ltv: { v: 0.70, first: 0.80, firstMetroReg: 0.70 },
      dti: 0.60
    },
    baby: {
      name: '신생아 특례 디딤돌대출', org: '주택도시기금', src: ['nhufBaby', 'fsc250627'], eff: { from: '2025-06-28', note: '2025.6.27 이후 계약은 한도 4억(그 전 계약 5억)' },
      own: ['none', 'first'], ownNote: '무주택 세대주(1주택은 갈아타기 대출만)',
      need: '대출 신청일 기준 2년 안에 출산·입양(2023.1.1 이후 출생아)',
      income: { v: 13000, dual: 20000, note: '부부 합산. 맞벌이는 2억 이하(각자 1.3억 이하)' },
      asset: 51100,
      price: { v: 90000 },
      area: 85,
      cap: { v: 40000 },
      ltv: { v: 0.70, first: 0.80, firstMetroReg: 0.70 },
      dti: 0.60,
      rate: { lo: 1.8, hi: 4.5, note: '특례 금리 범위(소득·기간별), 지방 주택 0.2%p 인하' }
    }
  };

  /* ---------- 함께 알아 둘 규칙(계산에는 넣지 않고 안내만) ---------- scope: metroReg 수도권·규제지역 / reg 규제지역만 */
  var NOTES = [
    { id: 'movein', scope: 'metroReg', t: '수도권·규제지역에서 집을 사려고 주담대를 받으면 6개월 안에 그 집으로 이사(전입)해야 해요. 어기면 대출을 갚아야 하고 3년 동안 주택 관련 대출이 막혀요.', src: ['fsc250627'], eff: { from: '2025-06-28' } },
    { id: 'living', scope: 'metroReg', t: '집을 담보로 생활비(생활안정자금)를 빌릴 때 수도권·규제지역 1주택자는 최대 1억 원, 2채 이상은 금지예요.', src: ['fsc250627'], eff: { from: '2025-06-28' } },
    { id: 'jeonse', scope: 'metroReg', t: '1주택자가 수도권·규제지역에서 전세대출을 받으면 그 이자가 DSR에 들어가요(원금은 빼요).', src: ['fsc251015', 'fscfaq251015'], eff: { from: '2025-10-29' } },
    { id: 'credit', scope: 'reg', t: '1억 원이 넘는 신용대출을 받으면 그날부터 1년 동안 규제지역에서 집을 살 수 없어요.', src: ['fsc251015'], eff: { from: '2025-10-16' } },
    { id: 'toheo', scope: 'reg', t: '규제지역 아파트는 대부분 토지거래허가구역으로도 묶여 있어, 허가를 받아 산 뒤 2년 동안 직접 살아야(실거주) 해요. 지역별 지정 여부와 기간은 시·도 공고를 확인해 주세요.', src: ['kr251015', 'kr251015b'], eff: { from: '2025-10-20' } }
  ];

  /* ---------- 다가오는 변경(정해진 날짜) ---------- 화면 '곧 바뀌는 규칙'과 모닝 브리핑 정책 목록(엔진 data/policy.json plan)에 같은 날짜로 들어가요 */
  var UPCOMING = [
    { d: '2026-12-31', t: '지방 주담대 스트레스 DSR 2단계(기본 적용 50%) 유지 기간이 끝나요. 연장 여부는 새 발표를 확인해 반영해요.', src: ['fsc260618'] },
    { d: '2027-01-01', t: 'DSR 소득 계산이 바뀌어요: 소득이 20% 넘게 늘면 최근 2년 평균, 30% 넘게 늘면 최근 3년 평균으로 봐요.', src: ['fsc260813', 'kr260814'] },
    { d: '2027-01-01', t: '1주택자 전세대출 보증 비율이 수도권·규제지역 70%, 그 밖의 지역 80%로 낮아져요.', src: ['fsc260813', 'kr260814'] }
  ];

  /* ---------- 공식 출처로 확인하지 못해 넣지 않은 것 ---------- */
  var EXCLUDED = [
    '규제지역 서민·실수요자 LTV 우대 — FAQ 표에서 비율·조건을 정확히 읽을 수 없어 넣지 않음(일반 무주택 기준으로 계산)',
    '한국은행 예금은행 주택담보대출 평균 금리(2026년 9월) — 공식 보도자료 본문에서 숫자를 확인하지 못해 기본 금리로 쓰지 않음(이용자가 입력)',
    '내집마련 디딤돌대출 금리 — 공식 안내 페이지끼리 금리 범위가 달라 넣지 않음',
    '혼합형·주기형 스트레스 비율의 만기 30년 외 구간표 — 공식 표의 칸 배치를 확인하지 못해 30년 기준 비율만 씀',
    '2027년 1월 이후 스트레스 금리 — 아직 발표 전',
    '지방(규제지역 아님) DTI — 공식 표에서 확인하지 못해 넣지 않음(DSR로만 계산)',
    '지방에서 1주택자가 기존 집을 팔지 않고 집을 더 살 때 LTV — 공식 발표에서 60%·70% 중 어느 쪽인지 확인하지 못해 2주택 이상(60%)으로 보수적으로 계산하고 화면에 참고로 알림'
  ];

  /* ---------- 판정 함수 ---------- */
  /** 규제지역인가(date 없으면 오늘). 날짜별 지정·해제는 reg-zones.js 표 그대로 */
  function regulated(code, date) { return REG.regulated(String(code || ''), date || REG.today()) === true; }
  function metro(code) { return REGION.metro.v.indexOf(String(code || '').slice(0, 2)) >= 0; }
  /** 시·군·구 코드(5자리) → 'reg' | 'capfree' | 'local' */
  function groupOf(code, date) { return regulated(code, date) ? 'reg' : metro(code) ? 'capfree' : 'local'; }
  /** 그 지역에 해당하는 안내(NOTES) */
  function notesFor(g) { return NOTES.filter(function (n) { return n.scope === 'reg' ? g === 'reg' : g === 'reg' || g === 'capfree'; }); }
  /** 그 지역 DTI 비율. 규칙을 넣지 않은 지방이면 null */
  function dtiOf(g) { return DTI[g] ? DTI[g].v : null; }
  function ltvOf(g, own) { var r = LTV[g] && LTV[g][own]; return r ? r.v : null; }
  /** 수도권·규제지역 가격대별 최대 금액(만원). 지방이면 Infinity */
  function capOf(price, g) {
    if (g === 'local') return Infinity;
    for (var i = 0; i < CAP.v.length; i++) if (CAP.v[i].upTo == null || price <= CAP.v[i].upTo) return CAP.v[i].max;
    return Infinity;
  }
  /** 그 날(date, 'YYYY-MM-DD') 그 지역 주담대에 적용되는 스트레스 기간 규칙. 지방 유예가 끝난 뒤엔 3단계 원칙(기본 적용 100%)으로 보고 confirmed:false */
  function stressPeriod(g, date) {
    date = date || ASOF;
    var P = g === 'local' ? STRESS.periods[1] : STRESS.periods[0];
    if (g === 'local' && P.eff.to && date > P.eff.to) return { id: 'localAfter', scope: P.scope, rate: P.rate, base: 1, stage: 3, src: ['fsc250520', 'fsc260618'], eff: { from: '2027-01-01' }, confirmed: false };
    return Object.assign({ confirmed: true }, P);
  }
  /** 유형별 비율: rtype var|mix|cyc|fixed, band '5-9'|'9-15'|'15-21'|'21+' */
  function typeRatio(stage, rtype, band) {
    var T = STRESS.type[stage] || STRESS.type[3];
    if (rtype === 'var' || rtype === 'fixed') return T[rtype];
    var t = T[rtype]; if (!t) return 1;
    var v = t[band || '5-9']; return v == null ? t['5-9'] : v;
  }
  /** 한도 계산에 더하는 금리(%p) */
  function stressAdd(g, rtype, band, date) {
    var p = stressPeriod(g, date);
    return Math.round(p.rate * p.base * typeRatio(p.stage, rtype, band) * 10000) / 10000;
  }

  var API = { ASOF: ASOF, REG_CHECKED: REG.CHECKED, regBasis: REG.basis, SRC: SRC, REGION: REGION, LTV: LTV, CAP: CAP, DSR: DSR, DTI: DTI, TERM: TERM, STRESS: STRESS, POLICY: POLICY, NOTES: NOTES, UPCOMING: UPCOMING, EXCLUDED: EXCLUDED,
    regulated: regulated, metro: metro, groupOf: groupOf, notesFor: notesFor, ltvOf: ltvOf, dtiOf: dtiOf, capOf: capOf, stressPeriod: stressPeriod, typeRatio: typeRatio, stressAdd: stressAdd };
  root.JDJ_LOAN_RULES = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
