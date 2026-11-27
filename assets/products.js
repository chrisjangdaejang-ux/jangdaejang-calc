/* 집예보 유료 상품 안내 한 곳(대표 지시 2026-11-27: 돈을 내기 전에 무엇을 받는지 늘 분명하게)
   ─────────────────────────────────────────────────────────────
   - 유료 미리 보기 칸(assets/premium-teaser.js), 상품 안내(premium/), 결제 화면(premium/checkout/), 모닝 브리핑 이용권(brief/subscribe/),
     하트 충전(counsel/heart/), 동네 파트너(dongne/), 이사 파트너 충전(move/partner/), 전세 지킴이(jeonse/guard/)가 모두 이 파일을 읽어요.
     그래서 화면마다 담긴 내용·빠진 것·받는 방식·기간·환불 안내가 서로 달라질 수 없어요.
   - id 는 서버 상품 키 그대로예요(tools/agent-backend.gs PRICE·BRIEF_TIERS, assets/counsel-core.js CS_PACKS 등). 금액은 화면 표시용이고
     실제 결제 금액은 늘 서버가 정해요. 금액이 서버·화면 표와 같은지는 tools/products-test.js 가 대조해요.
   - includes: 결제하면 받는 것(구체적으로 3~5줄) · excludes: 들어 있지 않은 것(오해 막기) · delivery: 받는 방식 · validity: 이용·열람 기간
     refund: 환불·해지 한 줄 요약(전자상거래법 기준, 자세한 것은 refundHref 의 환불 정책) · sample: '예시 보기'(premium/sample/)에 보이는 가상 숫자
   - 내용을 바꿀 때는 실제 화면이 주는 것과 똑같이 적어 주세요. 안내와 다른 내용은 환불 사유예요(환불 정책 4항). */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var REPORT_REFUND = '리포트를 열거나 PDF로 저장하기 전에는 결제일부터 7일 안에 전액 환불돼요. 연 뒤에는 디지털 콘텐츠라 청약철회가 제한되지만(전자상거래법 제17조 제2항 제5호), 오류로 못 받았거나 안내와 내용이 다르면 전액 환불해 드려요.';
  var BRIEF_REFUND = '첫 브리핑을 받기 전에는 결제일부터 7일 안에 전액 환불, 받기 시작한 뒤에는 남은 날만큼 나눠서 환불해 드려요(위약금 없음). 자동으로 다시 결제되지 않아요.';
  var BRIEF_EX = ['자동 결제는 없어요. 30일이 지나면 그대로 끝나고, 끝나기 3일 전과 마지막 날에 알려 드려요.', '특정 단지를 사거나 팔라고 권하지 않아요. 공공 자료를 정리한 정보예요.'];
  var P = [
    { id: 'single', group: 'report', name: '미래가치 상세 리포트', sub: '관심 단지 1곳', amount: 9900, unit: '1회',
      includes: ['최근 3년 시세 흐름 그래프와 지금 시세·최근 6개월 변화·구 평균 대비 위치',
        '오를 이유·조심할 점마다 이 단지 숫자, 과거 비슷한 경우의 결과, 그 의미를 풀어 쓴 설명',
        '1·2·3·5·7년 보유 기간별 미래가치 점수와 과거에 얼마나 맞았는지(적중 기록)',
        '내 소득·현금·주택 수·금리로 다시 계산하는 대출 가능액·취득세·중개보수·필요 현금·월 상환액',
        'PDF 저장, 전문가라면 내 이름을 넣어 고객에게 보내기'],
      excludes: ['1~10년 가격 시나리오, 비슷한 과거 단지 사례 비교, 보유 기간별 양도세·보유세 계산은 아직 들어 있지 않아요. 준비되면 같은 리포트에 추가 비용 없이 더해 드려요.',
        '앞으로의 가격을 보장하거나 사고팔기를 권하지 않아요.'],
      delivery: '결제 즉시 웹 화면 + PDF 저장', validity: '결제일부터 1년 열람(PDF는 계속 보관)', refund: REPORT_REFUND, refundHref: 'refund/',
      href: 'premium/?p=single', cta: '단지 리포트 선택',
      sample: { title: '예시아파트 84㎡대', rows: [['지금 시세', '9억 8,000만 원(최근 3개월 실거래 중간값)'], ['최근 6개월', '평당가 +2.4%'], ['2년 미래가치 점수', '72점 · 같은 구 상위 30%'], ['오를 이유 ①', '역까지 걸어서 6분 — 과거 비슷한 단지 10곳 중 7곳이 2년 뒤 구 평균보다 더 올랐어요'], ['필요 현금', '3억 1,200만 원(대출 6억 7,000만 원 · 연 4.0% · 30년)'], ['월 상환액', '320만 원']] } },
    { id: 'pack', group: 'report', name: '비교 패키지', sub: '후보 단지 2~3곳', amount: 29000, unit: '1회',
      includes: ['고른 단지 2~3곳 각각의 미래가치 상세 리포트 전체',
        '한눈에 비교표: 추정 시세·2년 점수·필요 현금·월 상환·최근 6개월·준공·세대·지하철·하락기 방어',
        '2년 점수가 가장 높은 곳과 필요한 현금이 가장 적은 곳을 한 줄로 정리',
        '내 조건을 바꾸면 모든 단지의 대출·필요 현금이 한꺼번에 다시 계산',
        'PDF 저장, 전문가라면 내 이름을 넣어 고객에게 보내기'],
      excludes: ['1~10년 가격 시나리오, 비슷한 과거 단지 사례 비교, 보유 기간별 양도세·보유세 계산은 아직 들어 있지 않아요. 준비되면 추가 비용 없이 더해 드려요.',
        '어느 단지를 사라고 권하지 않아요. 비교는 공공 통계 기준이에요.'],
      delivery: '결제 즉시 웹 화면 + PDF 저장', validity: '결제일부터 1년 열람(PDF는 계속 보관)', refund: REPORT_REFUND, refundHref: 'refund/',
      href: 'premium/?p=pack', cta: '비교 패키지 선택',
      sample: { title: '예시아파트 A · B · C', rows: [['추정 시세', 'A 9억 8,000만 · B 8억 6,000만 · C 11억 2,000만'], ['2년 점수', 'A 72점 · B 64점 · C 58점'], ['필요 현금', 'A 3억 1,200만 · B 2억 4,500만 · C 4억 3,000만'], ['한 줄 정리', '2년 점수는 A가 가장 높고, 필요한 현금은 B가 가장 적어요']] } },
    { id: 'cy', group: 'report', name: '청약 당첨 플랜', sub: '청약 공고 1곳', amount: 9900, unit: '1회',
      includes: ['당첨되면 내 돈 계획표: 계약금·중도금 회차·잔금을 날짜별로 정리한 필요 현금표',
        '중도금 대출(이자후불제·무이자)과 잔금 대출 한도, 내 보증금·집 판 돈이 들어오는 날을 넣어 모자라는 날과 금액',
        '날짜별 낼 돈을 내 휴대폰 달력에 넣는 파일(.ics)',
        '내 가점으로 어디에 넣을까: 진행·예정 공고의 주택형을 예상 커트라인 여유 순으로 정리(해당지역·1순위·특별공급·재당첨 제한·같은 날 발표까지)',
        '입주 때 영향을 준 요인: 과거 실거래로 효과가 확인된 요인과 이 단지가 해당하는지'],
      excludes: ['입주 시점 시세 범위는 정확도 검증을 마치기 전이라 제공하지 않아요.', '당첨을 보장하지 않아요. 커트라인은 과거 결과로 잰 예상이에요.'],
      delivery: '결제 즉시 웹 화면 + PDF 저장 + 달력 파일', validity: '결제일부터 1년 열람(당첨자 발표 뒤 자료가 내려가면 요청 시 PDF로 보내 드려요)', refund: REPORT_REFUND, refundHref: 'refund/',
      href: 'chungyak/', cta: '청약 공고에서 고르기',
      sample: { title: '예시 공고 · 84A형', rows: [['계약일 2027. 1. 12.', '계약금 10% 8,900만 원'], ['중도금 1~6회', '회차마다 5,340만 원 — 중도금 대출(이자후불제)'], ['잔금 2029. 6.', '3억 5,600만 원 — 잔금 대출 한도 2억 4,000만 원'], ['모자라는 날', '2029. 6. 잔금일에 4,200만 원 부족'], ['넣을 곳 1순위', '예시 공고 59B형 — 예상 커트라인보다 내 가점 6점 여유']] } },
    { id: 'brief', group: 'brief', name: '모닝 브리핑 기본', sub: '1개월 이용권', amount: 3900, unit: '1개월',
      includes: ['매일 아침 7시대, 관심 지역 3곳의 새 실거래·신고가·급매 정리', '관심 단지 3개의 새 거래 알림', '오늘의 부동산 시장(전국)과 청약·정책 코너 7개'],
      excludes: BRIEF_EX, delivery: '매일 아침 이메일(받을 곳은 구독 관리에서 바꿔요)', validity: '결제일부터 30일', refund: BRIEF_REFUND, refundHref: 'refund/#brief',
      href: 'brief/subscribe/?p=brief', cta: '기본으로 받기',
      sample: { title: '예시 · 2026년 11월 27일 아침', rows: [['예시동 새 매매', '12건 · 그중 신고가 2건'], ['관심 단지', '예시아파트 84㎡ 9억 8,000만 원(11. 24. 계약)'], ['급매 신호', '최근 2년 최고가보다 10% 넘게 낮은 거래 1건'], ['이번 주 청약', '예시 공고 접수 2곳']] } },
    { id: 'brief_plus', group: 'brief', name: '모닝 브리핑 플러스', sub: '1개월 이용권', amount: 5900, unit: '1개월',
      includes: ['관심 지역 10곳·관심 단지 10개로 늘려 받기', '기본 요금제에 있는 것 모두', '매물 설명서 한 달 10장', '주간 블로그·인스타 글(지역 1곳)'],
      excludes: BRIEF_EX, delivery: '매일 아침 이메일 + 화면에서 만드는 글·설명서', validity: '결제일부터 30일', refund: BRIEF_REFUND, refundHref: 'refund/#brief',
      href: 'brief/subscribe/?p=brief_plus', cta: '플러스로 받기',
      sample: { title: '예시 · 관심 지역 10곳 묶음', rows: [['예시동 외 9곳', '새 매매 47건 · 신고가 6건'], ['관심 단지 10개', '새 거래 3건'], ['매물 설명서', '예시아파트 84㎡ 한 장 만들기(이번 달 10장 중 1장)']] } },
    { id: 'brief_pro', group: 'brief', name: '모닝 브리핑 중개사용', sub: '1개월 이용권 · 중개사무소 등록번호 필요', amount: 4900, unit: '1개월',
      includes: ['관심 지역 10곳·관심 단지 10개', '손님께 할 이야기 3줄(복사 버튼)', '손님에게 보낼 카드 이미지', '매물 설명서 한 달 30장', '주간 블로그·인스타 글(지역 1곳)'],
      excludes: BRIEF_EX.concat(['중개사무소 등록번호가 확인되어야 해요.']), delivery: '매일 아침 이메일 + 화면에서 만드는 카드·글', validity: '결제일부터 30일', refund: BRIEF_REFUND, refundHref: 'refund/#brief',
      href: 'brief/subscribe/?p=brief_pro', cta: '중개사용으로 받기',
      sample: { title: '예시 · 손님께 할 이야기', rows: [['1', '예시동 84㎡는 이번 주 2건이 9억 원대에 거래됐어요.'], ['2', '같은 평형 최근 2년 최고가보다 4% 낮은 수준이에요.'], ['3', '근처 예시 공고 청약 접수가 다음 주에 열려요.']] } },
    { id: 'brief_pro_plus', group: 'brief', name: '중개사 플러스', sub: '모닝 브리핑 1개월 이용권 · 중개사무소 등록번호 필요', amount: 9900, unit: '1개월',
      includes: ['관심 지역 20곳·관심 단지 30개, 중개사용에 있는 것 모두', '내 손님 브리핑: 손님 10명까지 손님별 브리핑', '급매 알림 기준 직접 정하기(5~20%, 기본 10%)', '주간 시장 리포트: 내 이름이 들어간 PDF', '매물 설명서 한 달 150장, 주간 블로그·인스타 글(지역 5곳)'],
      excludes: BRIEF_EX.concat(['중개사무소 등록번호가 확인되어야 해요.']), delivery: '매일 아침 이메일 + 주간 PDF + 화면에서 만드는 카드·글', validity: '결제일부터 30일', refund: BRIEF_REFUND, refundHref: 'refund/#brief',
      href: 'brief/subscribe/?p=brief_pro_plus', cta: '중개사 플러스로 받기',
      sample: { title: '예시 · 주간 시장 리포트(내 이름 PDF)', rows: [['표지', '예시공인중개사사무소 · 2026년 11월 넷째 주'], ['예시동 한 주', '매매 18건 · 평균 평당가 +0.6%'], ['손님 김○○ 님 관심 단지', '새 거래 1건 · 급매 기준(8%) 해당 없음']] } },
    { id: 'heart', group: 'pro', name: '전문가 하트', sub: '고민 상담 전문가용 묶음', amount: 3900, from: true, unit: '묶음',
      includes: ['하트 2개 3,900원 · 6개 9,900원 · 13개 19,900원 · 35개 49,000원 중 고르기', '질문한 분께 상담 제안 보내기(하트 2개)', '1:1 상담 채팅 수락(하트 2개)', '72시간 안에 제안을 열어 보지 않으면 하트 자동 반환'],
      excludes: ['질문하기·답변 보기·상담 채팅은 원래 무료라 하트가 필요 없어요.', '하트는 현금으로 바꾸거나 다른 사람에게 넘길 수 없어요.'],
      delivery: '결제 즉시 내 하트에 충전', validity: '충전한 날부터 5년', refund: '7일 안에 하나도 안 쓴 묶음은 전액, 일부를 썼으면 남은 하트만큼 환불해요(7일이 지나면 남은 하트 값의 10%를 빼요).', refundHref: 'refund/#heart',
      href: 'counsel/heart/', cta: '하트 충전',
      sample: { title: '예시 · 하트 6개 묶음', rows: [['충전', '하트 6개 · 9,900원'], ['상담 제안 2번', '하트 4개 사용'], ['남은 하트', '2개 · 2031. 11. 27.까지']] } },
    { id: 'dongne', group: 'pro', name: '동네 파트너', sub: '제휴 중개사 · 동마다 3자리', amount: 9900, unit: '1개월',
      includes: ['내 동네 모닝 브리핑 맨 아래 \'우리 동네 한마디\' 칸에 사무소 소개(제휴·광고 표시)', '사무소 동 포함 3개 동까지, 동 하나 더 월 5,000원', '중개사 플러스 이용권 포함', '연간 99,000원(2개월 할인)도 고를 수 있어요'],
      excludes: ['미래가치 점수·순위에는 광고비가 반영되지 않아요.', '중개 거래를 대신 연결하거나 성사를 보장하지 않아요.'],
      delivery: '승인 다음 날부터 브리핑·동네 화면에 노출', validity: '첫 달 무료, 둘째 달부터 매월(또는 매년) 자동 결제 · 해지는 버튼 하나, 그달 말까지 이용', refund: '해지하면 그달 말까지 쓰고 그 뒤로 결제되지 않아요. 환불은 동네 파트너 약관 7항을 따라요.', refundHref: 'refund/#autopay',
      href: 'dongne/', cta: '동네 파트너 신청',
      sample: { title: '예시 · 우리 동네 한마디', rows: [['예시공인중개사사무소', '예시동 15년 · 이번 주 84㎡ 급매 문의가 늘었어요'], ['표시', '제휴·광고']] } },
    { id: 'move_points', group: 'pro', name: '이사 파트너 포인트', sub: '이사업체 견적 요청 열람용', amount: 50000, unit: '충전',
      includes: ['5만 원 또는 10만 원 충전(10만 원은 10% 더)', '견적 요청 하나를 업체 최대 3곳까지만 열람', '연락처 열람 1건: 소형 3,000원 · 가정 8,000원 등 규모별', '승인 첫 달 무료 열람 10건', '잘못된 요청은 열람 뒤 72시간 안에 신고하면 확인 후 돌려 드려요'],
      excludes: ['견적이 계약으로 이어지는 것을 보장하지 않아요.'],
      delivery: '결제 즉시 포인트 충전', validity: '이사 파트너 이용 기간 동안', refund: '쓰지 않은 포인트는 고객문의로 요청하면 확인 후 환불해 드려요.', refundHref: 'refund/',
      href: 'move/partner/', cta: '포인트 충전',
      sample: { title: '예시 · 가정 이사 요청', rows: [['요청', '예시동 → 예시구 · 3룸 · 12월 20일'], ['연락처 열람', '8,000원 포인트 사용'], ['열어 본 업체', '3곳 중 2번째']] } },
    { id: 'watch', group: 'jeonse', name: '내 전셋집 지킴이', sub: '집 1곳 · 한 달(30일)', amount: 2900, unit: '1개월',
      includes: ['내 전셋집 등기를 매일 확인(근저당·압류·가압류·경매·신탁·집주인 바뀜 등)', '변동이 생기면 메일로 바로 알림(카카오톡은 준비되는 대로)', '변동 종류별 위험 정도와 다음 할 일을 쉬운 말로 안내',
        '변동 뒤 남은 기간은 저절로 다시 지켜봄', '계약 만기까지 필요한 달 수만큼 한 번에 결제(최대 24개월)'],
      excludes: ['자동 결제(정기 결제)가 아니에요. 고른 기간이 끝나면 그대로 끝나요.', '보증금 반환을 보장하지 않고 법률 판단이 아니에요. 필요하면 변호사·법무사와 상담해 주세요.'],
      delivery: '결제가 확인된 뒤 등록 · 첫 확인 결과 알림 · 메일 알림 + 내 지킴이 화면', validity: '고른 달 수 × 30일', refund: '결제한 날부터 7일 안, 첫 확인 전이면 전액 환불돼요. 등록에 실패하면 결제는 자동으로 취소돼요.', refundHref: 'refund/',
      href: 'jeonse/guard/', cta: '지킴이 신청하기',
      sample: { title: '예시 · 예시빌라 302호', rows: [['지켜보는 기간', '2026. 12. 1. ~ 2027. 11. 30.(12개월)'], ['마지막 확인', '오늘 아침 — 변동 없음'], ['알림 예시', '근저당 새로 설정 — 주의 · 집주인에게 사유를 묻고 보증보험 가입 여부를 확인해요']] } },
    { id: 'read', group: 'jeonse', name: '등기 바로 확인', sub: '등기부 1건', amount: 1900, unit: '1회',
      includes: ['등기 고유번호만 넣으면 지금 등기부를 바로 열어 확인', '근저당·압류·경매·신탁을 쉬운 말로 풀어 드림', '전세 안전 점검의 선순위 채권 칸을 자동으로 채움'],
      excludes: ['결과는 이 화면에 한 번만 보여 드리고 저장하지 않아요. 공식 발급본이 필요하면 인터넷등기소에서 따로 발급해요.', '법률 판단이 아니며 보증금 반환을 보장하지 않아요.'],
      delivery: '결제 즉시 이 화면에서', validity: '한 번 열람', refund: '열람 결과를 받기 전에는 전액 환불돼요. 받은 뒤에는 디지털 콘텐츠라 청약철회가 제한되지만, 오류로 못 받았으면 전액 환불해 드려요.', refundHref: 'refund/',
      href: 'jeonse/safety/', cta: '전세 안전 점검에서 확인',
      sample: { title: '예시 · 예시빌라 302호', rows: [['소유자', '김○○(2019년부터)'], ['근저당', '1건 · 채권최고액 1억 2,000만 원 — 주의'], ['압류·경매·신탁', '없음']] } },
    { id: 'corp', group: 'pro', name: '법인등기 확인', sub: '법인 소유 상가·오피스 · 1건', amount: 1900, unit: '1회',
      includes: ['법인등록번호로 지금 법인등기를 바로 열어 확인', '대표·임원·본점·자본금 같은 기본 사항을 한눈에', '결과를 PDF로 저장(인쇄)'],
      excludes: ['결과는 한 번만 보여 드리고 저장하지 않아요. 공식 발급본은 인터넷등기소에서 따로 발급해요.', '법률 판단이 아니에요.'],
      delivery: '결제 즉시 이 화면에서', validity: '한 번 열람', refund: '열람 결과를 받기 전에는 전액 환불돼요. 오류로 못 받았으면 전액 환불해 드려요.', refundHref: 'refund/',
      href: 'agent/pro/reg/', cta: '법인등기 확인',
      sample: { title: '예시 · 예시상사 주식회사', rows: [['대표이사', '박○○'], ['본점', '서울특별시 예시구 예시로 1'], ['자본금', '5,000만 원']] } }
  ];
  var BY = {}; P.forEach(function (p) { BY[p.id] = p; });
  function get(id) { return BY[id] || null; }
  function won(n) { return Number(n || 0).toLocaleString('ko-KR') + '원'; }
  function priceText(p) { return p ? won(p.amount) + (p.from ? '부터' : '') + (p.unit === '1개월' ? ' · 1개월' : p.unit === '1회' ? ' · 1회' : '') : ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function link(path) { return JB.SITE + String(path || '').replace(/^\//, ''); }
  function sampleHref(id) { return link('premium/sample/?p=' + encodeURIComponent(id)); }
  function cfg() { return root.JDJ_SITE || {}; }
  function soonOpen() { var c = cfg(); return c.PAID_OPEN !== true && c.PAY_REVIEW !== true; }
  function first(s) { s = String(s || '').replace(/\s+/g, ' ').trim(); if (!s) return ''; var m = s.match(/^.*?(?:요\.|다\.|[.!?])(?=\s|$)/); return m ? m[0] : s; }

  var CSS = '.jpt{margin:14px 0 4px;border:1px solid #E5E8EB;border-radius:14px;padding:14px 16px;background:#FAFBFC;text-align:left}'
    + '.jpt-ey{font-size:12px;font-weight:800;color:#4338CA;letter-spacing:.02em}'
    + '.jpt-h{font-size:15px;font-weight:800;color:#191F28;display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px}'
    + '.jpt-tag{font-size:12px;font-weight:800;color:#4338CA;background:#EEF0FF;border-radius:6px;padding:1px 7px}'
    + '.jpt-won{margin-left:auto;font-size:15px;font-weight:900;color:#191F28;white-space:nowrap}'
    + '.jpt-sub{font-size:12.5px;color:#6B7684;margin-top:2px}'
    + '.jpt-inc{margin:8px 0 0;padding:0 0 0 18px;font-size:13.5px;line-height:1.55;color:#3E4754;word-break:keep-all}.jpt-inc li{margin:2px 0}'
    + '.jpt-p{margin:8px 0 0;font-size:14px;line-height:1.6;color:#3E4754;word-break:keep-all}'
    + '.jpt-k{display:inline-block;font-size:12px;font-weight:800;color:#6B7684;border:1px solid #D1D6DB;border-radius:6px;padding:0 6px;margin-right:6px;vertical-align:1px}'
    + '.jpt-d{margin:6px 0 0;font-size:13px;color:#6B7684;line-height:1.55;word-break:keep-all}'
    + '.jpt-ex{margin:8px 0 0;font-size:12.5px;color:#6B7684;line-height:1.55;word-break:keep-all}.jpt-ex b{color:#4E5968}'
    + '.jpt-m{margin:8px 0 0;display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:12.5px;line-height:1.5;color:#4E5968;word-break:keep-all}.jpt-m dt{font-weight:800;color:#6B7684}.jpt-m dd{margin:0}'
    + '.jpt-m a{color:#4338CA}'
    + '.jpt-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin-top:10px}'
    + '.jpt-go{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:12px;background:#4338CA;color:#fff!important;font-size:14.5px;font-weight:800;text-decoration:none}'
    + '.jpt-sm{display:inline-flex;align-items:center;min-height:44px;font-size:13.5px;font-weight:700;color:#4338CA!important;text-decoration:underline;text-underline-offset:3px}'
    + '.jpt-go:focus-visible,.jpt-sm:focus-visible{outline:3px solid #191F28;outline-offset:2px}'
    + '.jpt-soon{display:block;margin-top:6px;font-size:12.5px;color:#6B7684}'
    + '.jpt.jpt-info{background:#F7F8FF;border-color:#DADFFB}'
    + '.jpc{width:100%;border-collapse:collapse;font-size:13.5px;line-height:1.5;word-break:keep-all}.jpc th,.jpc td{border-top:1px solid #E5E8EB;padding:10px 8px;text-align:left;vertical-align:top}'
    + '.jpc thead th{background:#F2F4F6;font-size:12.5px;color:#4E5968}.jpc ul{margin:0;padding-left:16px}.jpc .nm{font-weight:800;color:#191F28}.jpc .pr{font-weight:800;white-space:nowrap}.jpc small{color:#6B7684}'
    + '@media (max-width:640px){.jpc thead{display:none}.jpc tr{display:block;border-top:1px solid #E5E8EB;padding:8px 0}.jpc td{display:block;border:0;padding:4px 2px}.jpc td[data-k]:before{content:attr(data-k);display:block;font-size:12px;font-weight:800;color:#6B7684}}'
    + '@media print{.jpt{display:none}}';
  function style() {
    if (typeof document === 'undefined' || document.getElementById('jptCss')) return;
    var s = document.createElement('style'); s.id = 'jptCss'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s);
  }
  /** '유료로 보면' 표준 칸.
      id: 상품 키 · o = { preview: 실제 자료 문장(또는 [{k:'라벨', t:'문장'}] 여러 줄), href, key(단지 키 → 상품 안내), track, cls, desc(이 화면에서 덧붙일 한 줄),
                        mode: 'cta'(기본, 자세히 보기 단추) | 'info'(결제 단추가 이미 있는 화면 — 단추 없이 내용만) } */
  function box(id, o) {
    o = o || {}; var p = get(id); if (!p) return ''; style();
    var info = o.mode === 'info';
    var pvs = Array.isArray(o.preview) ? o.preview : (o.preview ? [{ t: o.preview }] : []);
    pvs = pvs.map(function (x) { return { k: x.k || '', t: first(x.t) }; }).filter(function (x) { return x.t; });
    var url = o.href || link(p.href);
    var ex = (p.excludes || []).slice(0, 2);
    return '<div class="jpt' + (info ? ' jpt-info' : '') + (o.cls ? ' ' + esc(o.cls) : '') + '" data-product="' + esc(p.id) + '">'
      + '<div class="jpt-ey">유료로 보면</div>'
      + '<div class="jpt-h">' + esc(p.name) + ' <span class="jpt-tag">유료</span><span class="jpt-won">' + esc(priceText(p)) + '</span></div>'
      + (p.sub ? '<div class="jpt-sub">' + esc(p.sub) + '</div>' : '')
      + '<ul class="jpt-inc" aria-label="담긴 내용">' + p.includes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'
      + pvs.map(function (x) { return '<p class="jpt-p"><span class="jpt-k">미리 보기' + (x.k ? ' · ' + esc(x.k) : '') + '</span>' + esc(x.t) + '</p>'; }).join('')
      + (o.desc ? '<p class="jpt-d">' + esc(o.desc) + '</p>' : '')
      + (ex.length ? '<p class="jpt-ex"><b>들어 있지 않아요</b> ' + ex.map(esc).join(' ') + '</p>' : '')
      + '<dl class="jpt-m"><dt>받는 방식</dt><dd>' + esc(p.delivery) + '</dd><dt>기간</dt><dd>' + esc(p.validity) + '</dd>'
      + '<dt>환불</dt><dd>' + esc(p.refund) + ' <a href="' + esc(link(p.refundHref)) + '" target="_blank" rel="noopener">환불 정책</a></dd></dl>'
      + '<div class="jpt-row">' + (info ? '' : '<a class="jpt-go" href="' + esc(url) + '"' + (o.track ? ' data-track="' + esc(o.track) + '"' : '') + '>자세히 보기 (유료)</a>')
      + '<a class="jpt-sm" href="' + esc(sampleHref(p.id)) + '" target="_blank" rel="noopener" data-track="paid_sample">예시 보기</a></div>'
      + (!info && soonOpen() ? '<span class="jpt-soon">결제는 곧 열려요. 위 미리 보기와 무료 기능은 지금 그대로 쓸 수 있어요.</span>' : '')
      + '</div>';
  }
  /** 모든 유료 상품 표(상품 안내 premium/) */
  function table(ids) {
    style(); ids = ids || P.map(function (p) { return p.id; });
    return '<table class="jpc"><thead><tr><th>상품</th><th>가격</th><th>담긴 내용</th><th>들어 있지 않은 것</th><th>받는 방식 · 기간 · 환불</th></tr></thead><tbody>'
      + ids.map(get).filter(Boolean).map(function (p) {
        return '<tr data-product="' + esc(p.id) + '"><td data-k="상품"><div class="nm">' + esc(p.name) + (p.soon ? ' <small>(준비 중)</small>' : '') + '</div><small>' + esc(p.sub) + '</small></td>'
          + '<td data-k="가격" class="pr">' + esc(priceText(p)) + '</td>'
          + '<td data-k="담긴 내용"><ul>' + p.includes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></td>'
          + '<td data-k="들어 있지 않은 것"><ul>' + p.excludes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></td>'
          + '<td data-k="받는 방식 · 기간 · 환불">' + esc(p.delivery) + '<br><small>' + esc(p.validity) + '</small><br><small>' + esc(p.refund) + '</small> <a href="' + esc(link(p.refundHref)) + '">환불 정책</a>'
          + '<br><a href="' + esc(sampleHref(p.id)) + '">예시 보기</a></td></tr>';
      }).join('') + '</tbody></table>';
  }
  /** 화면에 <div data-jdj-paid="상품키"></div> 를 두면 결제 단추 위에 '유료로 보면' 칸을 채워요(결제 단추가 이미 있는 화면용 — 단추 없이 내용만) */
  function fill(scope) {
    if (typeof document === 'undefined') return;
    (scope || document).querySelectorAll('[data-jdj-paid]').forEach(function (el) {
      var id = el.getAttribute('data-jdj-paid'); if (el.getAttribute('data-filled') === id) return;
      el.innerHTML = box(id, { mode: el.getAttribute('data-mode') || 'info' }); el.setAttribute('data-filled', id);
    });
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { fill(); }); else fill(); }

  /* ───────── 유료 구매 → 모닝 브리핑 잇기(대표 지시 2026-11-27 10:47: '부동산은 매일 공부해야 한다') ─────────
     구매·결과 화면 끝에 '매일 아침 이어서 받아 보세요' 칸. 이유 3가지는 산 상품(또는 무료 결과)에 맞춰 고르고, 미리 보기는 이 기기 안의 값(단지·동네·공고 이름)으로만 만들어요.
     이유 문구는 브리핑에 실제로 있는 칸(brief/index.html: 내 관심 단지·내 관심 지역 새 매매·신고가·큰 하락·급매 레이더·새 전세·전세가율 변화·
     미래가치 순위 변화·청약 기회·이번 주 청약 일정·새 분양 공고·정책·교통·공급 소식·금리·대출·세금·시장 온도)만 써요.
     구매 고객 30일 무료(대표 결정 2026-11-27 10:52): BUYER_TRIAL_ENABLED 가 true 이고 assets/config.js BILLING_OPEN·PAID_OPEN 이 모두 켜졌을 때만
     유료 구매 고객 칸이 '카드 등록하고 30일 무료'로 바뀌어요(서버 tools/agent-backend.gs v72 BUYER_TRIAL_ENABLED 도 함께). 꺼져 있으면 화면 어디에도 나오지 않고
     모두 지금처럼 카드 없이 7일 무료 체험. 유료 전환은 체험 8일째부터 따로 받은 동의가 있을 때만(전자상거래법 제13조 제6항). */
  var BUYER_TRIAL_ENABLED = false;
  function buyerTrialOn() { var c = cfg(); return (BUYER_TRIAL_ENABLED || c.BUYER_TRIAL_ENABLED === true) && c.BILLING_OPEN === true && c.PAID_OPEN === true; }
  var BRIEF_LINK = {
    why: '집값은 하루에 다 바뀌지 않지만, 거래 하나·발표 하나가 쌓여 흐름이 돼요. 아침 3분씩 꾸준히 보면 큰 결정을 할 때 흐름이 먼저 보여요.',
    trialDays: 7, from: 3900,
    buyerTrial: { days: 30, text: '유료 리포트를 산 분께 드리는 혜택: 30일 무료(카드만 등록, 지금 결제 없음). 30일 뒤 유료로 이어 가려면 체험 중에 따로 동의해야 하고, 동의하지 않으면 결제되지 않아요.' },
    R: {
      single: ['{apt}에 새 실거래가 신고되면 다음 날 아침 가격·층·계약일로 알려 드려요.', '{dn}의 신고가, 최근 2년 최고가보다 크게 내린 거래, 급매 신호를 매일 정리해 드려요.', '미래가치 순위가 크게 바뀐 단지, 새로 발표된 교통·공급·재건축 소식, 시장 온도를 함께 보내 드려요.'],
      pack: ['고르신 단지 {apt}의 새 실거래를 한곳에서 매일 아침 받아요.', '후보 동네({dn})의 신고가·큰 하락 거래·급매 신호로 단지 사이 흐름 차이가 보여요.', '미래가치 순위 변화와 금리·대출·세금 정책 변화를 함께 보내 드려 비교표를 계속 새로 볼 수 있어요.'],
      cy: ['이번 주 청약 일정과 새 분양 공고를 매일 아침 모아 드려요.', '가점을 저장해 두면 내 가점으로 넣어 볼 만한 공고를 골라 드려요.', '{dn} 주변 새 아파트 실거래와 신고가로 분양가가 비싼지 싼지를 계속 비교할 수 있어요.'],
      watch: ['{dn}의 새 전세 거래와 전세가율이 크게 바뀐 단지를 매일 알려 드려요.', '최근 2년 최고가보다 크게 내린 매매 거래로 깡통전세 위험 신호를 먼저 볼 수 있어요.', '전세대출·임대차 관련 정책 변화를 쉬운 말로 풀어 보내 드려요.'],
      read: ['{dn}의 새 전세 거래와 전세가율이 크게 바뀐 단지를 매일 알려 드려요.', '매매가가 내려가 보증금이 위험해지는 신호(큰 하락 거래)를 먼저 볼 수 있어요.', '전세대출·임대차 관련 정책 변화를 쉬운 말로 풀어 보내 드려요.'],
      /* 무료 결과 화면(가벼운 칸) */
      free_jeonse: ['{dn}의 새 전세 거래와 전세가율 변화를 매일 받아요.', '매매가가 크게 내린 거래로 보증금 위험 신호를 먼저 봐요.'],
      free_cy: ['이번 주 청약 일정과 새 분양 공고를 매일 아침 받아요.', '가점을 저장하면 넣어 볼 만한 공고를 골라 드려요.'],
      free_quiz: ['어제 신고된 실거래로 내 예측 감각을 매일 확인해요.', '신고가·큰 하락 거래와 시장 온도를 3분 안에 봐요.'],
      free_temp: ['시장 온도가 바뀌면 다음 날 아침 바로 받아요.', '{dn}의 신고가·큰 하락 거래로 온도가 왜 바뀌었는지 함께 봐요.']
    },
    /* 미리 보기 줄(예시 모양, 숫자 없이 — 실제 숫자는 그날 브리핑에서) */
    S: {
      single: ['내 관심 단지 · {apt}', '{dn} 새 매매·신고가·큰 하락', '미래가치 순위가 크게 바뀐 단지 · 시장 온도'],
      pack: ['내 관심 단지 · {apt}', '{dn} 새 매매·신고가', '금리·대출·세금 정책 변화'],
      cy: ['{notice} 일정·새 분양 공고', '내 가점으로 넣어 볼 만한 단지', '{dn} 주변 새 아파트 실거래'],
      watch: ['{dn} 새 전세 거래', '전세가율이 크게 바뀐 단지', '최근 2년 최고가보다 많이 내린 거래'],
      read: ['{dn} 새 전세 거래', '전세가율이 크게 바뀐 단지', '전세대출·임대차 정책 변화'],
      free_jeonse: ['{dn} 새 전세 거래', '전세가율이 크게 바뀐 단지'], free_cy: ['이번 주 청약 일정', '새 분양 공고'],
      free_quiz: ['어제 신고된 실거래', '신고가·큰 하락 거래'], free_temp: ['시장 온도', '{dn} 신고가·큰 하락 거래']
    }
  };
  var okG = function (g) { return /^\d{5}$/.test(String(g || '')); };
  var okDn = function (d) { return /^[가-힣0-9·.]{1,20}$/.test(String(d || '')); };
  var okApt = function (a) { return /^[^<>"'&\n]{1,40}$/.test(String(a || '')); };
  function fillT(t, c) {
    return String(t).replace(/\{apt\}/g, c.apt || '관심 단지').replace(/\{dn\}/g, c.dn || '관심 동네').replace(/\{notice\}/g, c.notice ? '이번 주 청약 일정 · ' + c.notice : '이번 주 청약 일정');
  }
  function subscribed() { try { return typeof localStorage !== 'undefined' && localStorage.getItem('jdj_brief_sub') === '1'; } catch (e) { return false; } }
  /** 구독 화면 주소: cta=buy_상품키(어느 자리에서 왔는지) + (미리 채우기에 동의했을 때만) d=구코드-동, ap=단지 이름들 */
  function briefUrl(at, c, pre) {
    var q = ['cta=' + encodeURIComponent(at)];
    if (pre && c) {
      if (okG(c.g)) q.push('d=' + encodeURIComponent(c.g + (okDn(c.dn) ? '-' + c.dn : '')));
      var ap = (c.apts || (c.apt ? [c.apt] : [])).filter(okApt).slice(0, 3);
      if (ap.length) q.push('ap=' + encodeURIComponent(ap.join(',')));
    }
    return link('brief/subscribe/?' + q.join('&'));
  }
  function track(n, at) { try { if (root.JDJ && root.JDJ.track) root.JDJ.track(n, { at: at }); } catch (e) {} }
  /** '매일 아침 이어서 받아 보세요' 칸. kind = 상품 키(single·pack·cy·watch·read) 또는 무료 결과(free_jeonse·free_cy·free_quiz·free_temp)
      c = { g: 구코드, dn: 동 이름, apt: 단지 이름, apts: [단지 이름…], notice: 공고 이름 } — 이 기기 안의 값만. o = { light: 가벼운 칸 } */
  function briefCard(kind, c, o) {
    c = c || {}; o = o || {}; var R = BRIEF_LINK.R[kind]; if (!R) return ''; style();
    var light = o.light || /^free_/.test(kind), at = (light ? 'res_' : 'buy_') + kind.replace(/^free_/, '');
    if (subscribed()) return '<div class="jbc jbc-on" data-brief-card="' + esc(kind) + '"><b>모닝 브리핑을 받고 계셔요.</b> ' + (c.apt || c.dn ? '관심 목록에 ' + esc((c.apt || c.dn)) + ' 소식도 넣어 두면 내일 아침부터 함께 받아요. ' : '')
      + '<a href="' + esc(link('brief/manage/')) + '">관심 목록 바꾸기</a></div>';
    var S = (BRIEF_LINK.S[kind] || []).map(function (t) { return fillT(t, c); });
    var canPre = okG(c.g) || (c.apts || (c.apt ? [c.apt] : [])).some(okApt);
    var preTxt = [(c.apts && c.apts.length ? c.apts : (c.apt ? [c.apt] : [])).slice(0, 3).join(', '), c.dn || ''].filter(Boolean).join(' · ');
    var bt = !light && buyerTrialOn() && !!get(kind);
    var perk = bt ? '<p class="jbc-perk">' + esc(BRIEF_LINK.buyerTrial.text) + '</p>' : '';
    var go = function (pre) { return briefUrl(at, c, pre) + (bt ? '&bbt=1' : ''); };
    return '<section class="jbc' + (light ? ' jbc-l' : '') + '" data-brief-card="' + esc(kind) + '" data-at="' + esc(at) + '" aria-label="모닝 브리핑">'
      + '<div class="jbc-ey">' + (light ? '내일 아침에도 이어서' : '매일 아침 이어서 받아 보세요') + '</div>'
      + '<h3 class="jbc-h">모닝 브리핑</h3>'
      + '<ul class="jbc-r">' + R.map(function (t) { return '<li>' + esc(fillT(t, c)) + '</li>'; }).join('') + '</ul>'
      + (light ? '' : '<div class="jbc-pv" aria-label="내 브리핑 미리 보기"><div class="jbc-pk">예시 · 내일 아침 7시대 내 브리핑</div><ol>' + S.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></div>'
        + '<p class="jbc-why">' + esc(BRIEF_LINK.why) + '</p>')
      + (canPre ? '<label class="jbc-ck"><input type="checkbox" data-jbc-pre checked> 브리핑 관심 목록에 미리 넣기: ' + esc(preTxt || '이 화면의 단지·동네') + '</label>' : '')
      + '<div class="jbc-row"><a class="jbc-go" href="' + esc(go(canPre)) + '" data-jbc-go data-pre="' + esc(go(true)) + '" data-nopre="' + esc(go(false)) + '">' + (bt ? '구매 고객 30일 무료로 받기' : BRIEF_LINK.trialDays + '일 무료로 받아 보기') + '</a>'
      + '<span class="jbc-pr">' + (bt ? '지금 결제 없음 · 따로 동의할 때만 유료(월 ' + won(BRIEF_LINK.from) + '부터)' : '체험 뒤 월 ' + won(BRIEF_LINK.from) + '부터 · 카드 등록 없이 시작 · 자동 결제 없음') + '</span></div>' + perk
      + '</section>';
  }
  var BCSS = '.jbc{margin:16px 0;border:1px solid #F0E6C8;border-radius:14px;padding:16px;background:#FFFBF0;text-align:left;word-break:keep-all}'
    + '.jbc.jbc-l{padding:12px 14px}.jbc.jbc-on{font-size:13.5px;color:#4E5968;padding:12px 14px}.jbc a{color:#4338CA}'
    + '.jbc-ey{font-size:12px;font-weight:800;color:#8A6D1E}.jbc-h{margin:2px 0 6px;font-size:16px;font-weight:900;color:#191F28}'
    + '.jbc-r{margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:#3E4754}.jbc-r li{margin:2px 0}'
    + '.jbc-pv{margin:10px 0 0;background:#fff;border:1px dashed #E2D3A3;border-radius:10px;padding:10px 12px}.jbc-pk{font-size:12px;font-weight:800;color:#8A6D1E;margin-bottom:4px}'
    + '.jbc-pv ol{margin:0;padding-left:18px;font-size:13.5px;line-height:1.6;color:#3E4754}'
    + '.jbc-why{margin:10px 0 0;font-size:13px;line-height:1.6;color:#6B7684}.jbc-perk{margin:8px 0 0;font-size:13px;font-weight:700;color:#8A6D1E}'
    + '.jbc-ck{display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:13.5px;color:#3E4754;min-height:44px;align-items:center}.jbc-ck input{width:18px;height:18px;flex:none}'
    + '.jbc-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin-top:8px}'
    + '.jbc-go{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:12px;background:#191F28;color:#fff!important;font-size:14.5px;font-weight:800;text-decoration:none}'
    + '.jbc-go:focus-visible{outline:3px solid #4338CA;outline-offset:2px}.jbc-pr{font-size:12.5px;color:#6B7684}@media print{.jbc{display:none}}';
  CSS += BCSS;
  /* 칸이 보이면 한 번 'brief_card_view', 누르면 'brief_card_click'(개인정보·금액 없이 자리 이름만). 동의 칸을 끄면 미리 채우기 없는 주소로 */
  if (typeof document !== 'undefined') {
    document.addEventListener('change', function (e) {
      var t = e.target; if (!t || !t.hasAttribute || !t.hasAttribute('data-jbc-pre')) return;
      var g = t.closest('.jbc') && t.closest('.jbc').querySelector('[data-jbc-go]'); if (g) g.href = t.checked ? g.getAttribute('data-pre') : g.getAttribute('data-nopre');
    });
    document.addEventListener('click', function (e) {
      var g = e.target && e.target.closest && e.target.closest('[data-jbc-go]'); if (g) track('brief_card_click', (g.closest('.jbc') || g).getAttribute('data-at') || '');
    });
    var seen = {};
    var watch = function () {
      document.querySelectorAll('.jbc[data-at]').forEach(function (el) {
        var at = el.getAttribute('data-at'); if (seen[at] || el.offsetParent === null) return;
        var r = el.getBoundingClientRect(); if (r.top < (window.innerHeight || 800) && r.bottom > 0) { seen[at] = 1; track('brief_card_view', at); }
      });
    };
    if (typeof window !== 'undefined') { window.addEventListener('scroll', watch, { passive: true }); setInterval(watch, 1500); }
  }
  /** 단지 키(시도id~구코드~동~단지~평형, assets/pay.js keyOf) 여러 개 → 브리핑 칸 맥락 { g, dn, apt, apts }. 청약 키(평형 자리 'cy'+공고번호)는 단지 이름이 공고 이름 */
  function ctxFromKeys(keys) {
    var c = { apts: [] };
    (keys || []).forEach(function (k) {
      var a = String(k || '').split('~'); if (a.length !== 5) return;
      try { a = a.map(decodeURIComponent); } catch (e) { return; }
      if (!c.g && okG(a[1])) { c.g = a[1]; if (okDn(a[2])) c.dn = a[2]; }
      if (okApt(a[3])) { c.apts.push(a[3]); if (/^cy\d+$/.test(a[4])) c.notice = a[3]; }
    });
    c.apt = c.apts[0] || ''; if (c.notice) { c.apts = []; c.apt = ''; }
    return c;
  }
  /** 서버 상품 이름(결제 완료 응답 j.product) → 상품 키 */
  function idOfServerName(n) { n = String(n || ''); if (root.JDJ_PAY && root.JDJ_PAY.prodName) n = root.JDJ_PAY.prodName(n);   // 옛 이름(재배포 전 서버)은 pay.js 변환표로
    return ({ '단지 리포트': 'single', '비교 패키지': 'pack', '청약 당첨 플랜': 'cy' })[n] || ''; }
  var api = { buyerTrialOn: buyerTrialOn, LIST: P, ctxFromKeys: ctxFromKeys, idOfServerName: idOfServerName, BRIEF_LINK: BRIEF_LINK, briefCard: briefCard, briefUrl: briefUrl, get: get, box: box, table: table, fill: fill, priceText: priceText, sampleHref: sampleHref, won: won, first: first, soon: soonOpen, style: style, CSS: CSS };
  root.JDJ_PRODUCTS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
