/**
 * 장대장 공인중개사 제휴 — 구글 시트 + Apps Script 백엔드 (v42: 전문가 리포트 링크 대출 조건에 금리 유형·대출 기간 저장 / v41: 모닝 브리핑 메일 '지난주 우리 지역은?'(주간 실거래 동향) / v40: 갈아타기 알림 메일 보내는 이름·수신 거부 화면 링크를 SITE_NAME 으로 / v39: 광고 문의 관심 상품 목록 사이·페이지 끝 카드 / v38: 광고 문의 희망 기간 8주(2개월) / v37: 광고 하루 단위 판매 없앰·브리핑광고 7일 미만 경고 / v36: 광고 문의 홈·카테고리 상단 배너 / v35: 보고서 받을 이메일 칸 / v34: 주간 현장 보고서 자동 발송 / v33: 공인중개사가 아닌 전문가 필수 칸 줄임 / v32: 시행사 새 상품 신청 키 — 주간 현장 보고서 기본·잠금형·광고 지역 추천 / v31: 메일 광고는 광고성 정보·이른 아침 두 동의 모두 / v30: 장대장TV 주간 유튜브 키트 / v29: 모닝 브리핑 메일 광고 — 이른 아침 광고 동의·(광고) 제목·수신 거부 / v28: 중개사 도구 이용 수 — 매물 설명서·주간 블로그·인스타 글 / v27: 중개사 플러스 — 내 손님 브리핑·주간 시장 리포트 / v26: 모닝 브리핑 요금제 4단계·요금제 바꾸기·중개사 등록번호 확인·친구 초대 보상 / v25: 모닝 브리핑 새 정책·교통·공급 발표 / v24: 모닝 브리핑 2단계·광고주용 익명 구독자 통계 / v23: 시행사 신청 상품 이름 — 분석 브로슈어·자료 팩 / v22: 집코드 모닝 브리핑 이름·전국 시장 칸 / v21: 전문가 이름 리포트 유형 확대 / v20: 집코드 분양대행 — 전속 의뢰·판매 파트너·계약 보고·정산 / v19: 중개사 업무 도구)
 *
 * v50 변경 요약 (다음 재배포에 함께 들어감. 따로 실행할 함수 없음 — 시트 '동네파트너'·'동네파트너대기'·'동네한마디'·'동네파트너기록'·'동네파트너동의'와 사진 드라이브 폴더는 첫 사용 때 저절로 생김)
 *  - 동네 중개사 파트너(맨 아래 'v50' 칸): 숨김 상태로 미리 넣어 둠. DONGNE_ENABLED=false(맨 아래 칸)·화면 assets/config.js PARTNER_ENABLED=false 라서
 *    모닝 브리핑 운영자 모드 카카오 계정(BRIEF_ADMIN_IDS) 말고는 아무도 보거나 쓸 수 없어요. 문을 여는 날 두 값을 함께 true 로.
 *  - 바로 승인용 공공 자료 키: 스크립트 속성 DATA_GO_KR_KEY(공공데이터포털 '전국공인중개사사무소표준데이터' 활용 신청한 일반 인증키). 없으면 모든 신청이 '검토대기'.
 *    VWORLD_KEY(선택)가 있으면 휴업·폐업도 확인. 거르는 낱말은 비공개 엔진 data/dongne/rules.json → 매일 dpRulesPut(BRIEF_PULL_TOKEN). 없으면 모든 글이 '검토대기'.
 *  - 모닝 브리핑 메일 맨 아래 '우리 동네 중개사 한마디 (제휴)'(광고성 정보·이른 아침 광고 두 동의가 모두 있는 사람만, 제목 앞 (광고)), 무료 체험 신청의 초대 코드(dp) 기록,
 *    회원 탈퇴 때 파트너 정보 지우기, 브리핑 발송 끝에 dpDaily(월요일 안내·우수 동네 소식·기간 안내·4주 무소식 안내) — 모두 DONGNE_ENABLED 가 켜져야 돌아요.
 *  - 요금(바뀐 값): 카드 등록(토스 자동결제) · 첫 달 무료 · 둘째 달부터 월 9,900원(동 하나 더 월 5,000원) · 연간 99,000원(동 하나 더 연 50,000원).
 *    BILLING_OPEN=false(맨 아래 칸, 토스 빌링 계약 전) 동안은 빌링키 발급·정기 결제를 모두 거절하고 카드 없이 무료 '시범 파트너'로만 받아요.
 *    창립 파트너 혜택(표시·같은 동 우선·추가 동 20%)은 구독이 끊기지 않고 제재가 없는 동안만, 끊긴 뒤 30일 지나면 사라짐. 제재: 중대 위반 박탈 · 단계 제재 1→2→3차.
 *    매달 1일 공공 자료로 등록 상태 다시 확인(문제가 있으면 노출 멈춤 + 운영자 메일). 묶음 혜택(BUNDLE: DP_RULE.bundleMode 'off'|'include'|'discount') 자리 — 지금 'off'.
 *  - 모닝 브리핑 자동결제(같은 빌링 모듈, BILLING_OPEN 잠금): 체험 5일째 카드 등록 안내 1번, 체험 중 등록하면 첫 달 반값, 결제 7일 전 안내, [자동 결제 해지] 버튼 하나,
 *    체험 끝·카드 없음이면 멈추고 안내 딱 1번, 실패 3일 다시 시도. 일회성 이용권 결제는 그대로. 빌링키는 스크립트 속성 BK_* 에만.
 *  - 검증: node tools/dongne-test.js </dev/null
 *
 * v48 변경 요약 (따로 실행할 함수 없음 — 코드 바꾸고 저장 → 배포 관리 → 수정 → 새 버전. 안내 docs/redeploy_admin.md)
 *  - 운영자(대표) 모드: 모닝 브리핑 받는 지역·관심 단지 수 제한 없음(지역 300곳·단지 100개까지 — 전국 시·군·구는 약 250곳). 요금제·결제·PAID_OPEN 과 무관(유료 기능을 열지 않음).
 *    켜기: 구독 관리 화면(brief/manage/?op=1) [운영자 모드 켜기] → 이 스크립트 주인 메일로 30분짜리 1회용 링크 → 같은 계정으로 카카오 간편 로그인한 채 열면 켜짐.
 *    저장: 스크립트 속성 BRIEF_ADMIN_IDS(카카오 회원번호 목록). 화면 [운영자 모드 끄기] 또는 속성을 지우면 꺼짐.
 *  - 운영자 계정 발송: 다른 구독자를 먼저 보내고 마지막에, 메일 한 통에 지역 20곳씩 나눠 보냄(메일 크기 한도). 4분 30초가 넘거나 하루 메일 한도가 10통 아래면
 *    멈췄다가 9시 실행에서 이어 보냄. briefAreas(엔진 호출 예산)·광고주용 통계에는 운영자 지역을 앞 3곳만 넣음(진짜 구독자 몫을 빼앗지 않게).
 *  - pullTokenNew(편집기에서 한 번 실행): 엔진 연결 비밀값 BRIEF_PULL_TOKEN 을 새로 만들어 스크립트 속성에 넣고 실행 로그에 보여 줌 → 깃허브 비밀값에 붙여 넣기.
 *  - 검증: node tools/brief-admin-test.js </dev/null
 *
 * v49 변경 요약 (다음 재배포에 함께 들어감 — 안내 docs/alerts.md 6절. 재배포 뒤 편집기에서 alertsInstall 한 번 실행: 매일 알림 트리거 + 월요일 성적표 트리거를 함께 만듦)
 *  - 내 집 전용면적(homes[].ar, 함께 재배포): 한 평형에 전용면적이 여럿인 단지에서 사용자가 고른 내 집 면적을 계정에 저장(cleanPlace), 성적표 메일 '최근 시세'가 그 면적 값(report/g u 10번째 칸). 재배포 전에는 이 기기에만 저장돼요.
 *  - 내 집 성적표 주간 메일(맨 아래 'v49' 칸): 알림 센터에서 '내 집 성적표 메일'을 켠 알림 구독자(prefs.rp)에게만, 매주 월요일 오전 9시대(못 보내면 11시대)
 *    내 집(homes)·관심 단지(favs) 최대 6곳의 성적표(공개 data/report/g/{구}.json — 엔진 home_report.py, 월요일 07:52)를 한 통으로. 계산·문장은 REPORT-CORE 블록
 *    (웹 assets/report-core.js 와 같은 글자). 그날 자료(report/index.json date)가 아니면 보내지 않고 다음 실행에. 같은 주에 두 번 안 보냄('알림기록' rp|날짜).
 *    메일마다 '성적표 메일만 끄기'(GET alertOff &rp=1)·'모든 알림 끄기'. 순자산·보정 값은 메일에 싣지 않음. 광고 없음.
 *  - 알림 종류 추가(ALERTS-CORE): 전세가율 80%·90% 선 넘음/내려옴, 관심 단지 500m 안 신축 허가(newbuild.json + sNN_xy.json), 관심 단지와 같은 시·군·구 새 청약 공고.
 *    새 두 종류(근처 신축 허가·근처 청약)는 사용자가 알림 센터에서 켠 경우에만(AX_OPTIN). 하루 한 통 묶음·같은 알림 다시 안 보내기는 그대로.
 *  - 회원 저장 자료에 rp(내 집 정보 보정: 층·확장·리모델링 / 대출 잔액 / 순자산 기록)를 받아 둠(cleanRp). 그 사람만 읽고, 공개 자료·메일·시트 다른 칸에는 쓰지 않음.
 *  - 카카오 알림톡: RP_ALIMTALK=false(자리만). 비즈 채널·템플릿 심사가 끝나면 스크립트 속성 SOLAPI_TPL_REPORT·SOLAPI_TPL_ALERT 를 넣고 true 로(docs/alerts.md).
 *  - 검증: node tools/report-test.js </dev/null · node tools/alerts-test.js </dev/null
 *
 * v47 변경 요약 (오늘 밤 앞당겨 하는 재배포에 v20~v46 과 함께 들어감 — 안내 docs/redeploy_tonight.md. 따로 실행할 함수: briefInstall(브리핑 아침 발송 트리거가 없을 때))
 *  - 유료 판매 잠금 PAID_OPEN=false(맨 위): 통신판매업 신고번호가 나오기 전까지 PAID_ACTIONS(리포트 결제·브리핑 이용권 주문·승인·요금제 바꾸기)를
 *    '유료 이용권은 곧 열려요. 지금은 7일 무료 체험만 할 수 있어요.'(code 'paid_closed')로 거절. 무료 체험(briefTrial)·문의·알림 신청·해지·환불 요청은 그대로.
 *    briefConfig 에 paid(지금 판매 중인지) 추가. 화면은 assets/config.js PAID_OPEN 으로 결제 버튼을 숨김. 여는 날 두 값을 함께 true 로.
 *  - 검증: node tools/paid-lock-test.js </dev/null
 *
 * v46 변경 요약 (v20~v45와 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — 시트 '커뮤니티글'·'커뮤니티신고'·'커뮤니티인증'과 인증 사진 드라이브 폴더는 첫 사용 때 저절로 생김)
 *  - 살아보니(건물별 짧은 후기·이야기, 맨 아래 'v46' 칸): 숨김 상태로 미리 넣어 둠. 화면 assets/config.js COMMUNITY_ENABLED=false 이고
 *    서버 설정 open 도 꺼져 있어서, 운영자 미리 보기 말고는 아무도 읽거나 쓸 수 없어요. 문을 여는 날 두 값을 함께 켬.
 *  - 거르는 낱말·스팸 점수 무게와 기준은 이 파일에 없음(비공개 엔진 data/community/rules.json → 매일 cmRulesPut, BRIEF_PULL_TOKEN).
 *    설정이 아직 안 들어왔으면 모든 글이 '검토대기'(운영자가 보고 올림). 재배포 전에는 cmRulesPut 이 'unknown' 으로 무시됨.
 *  - 실거주 인증 사진은 운영자만 보는 드라이브 폴더에 두었다가 승인·거절 때 바로 휴지통으로(드라이브가 30일 뒤 완전 삭제), 14일 동안 검토 안 되면 지움.
 *  - 회원 탈퇴(userDelete) 때 그 사람 글·인증 기록도 지움. 드라이브 권한은 v27·v34 에서 이미 승인됨.
 *  - 검증: node tools/community-test.js </dev/null
 *
 * v45 변경 요약 (재배포만 하면 됨 — 따로 실행할 함수 없음. 시트 '검색실패'는 첫 기록 때 저절로 생김)
 *  - 단지 검색 결과가 없을 때 검색어 글자만 '검색실패' 시트에 남김(logEvents 의 t:'sq'). 방문자 번호·연락처는 남기지 않고,
 *    전화번호·이메일처럼 보이는 글은 버림. 새 별칭(사람들이 부르는 단지 이름)을 배우는 용도. 재배포 전에는 그냥 무시됨.
 *  - 검증: node tools/mine-test.js </dev/null
 *
 * v44 변경 요약 (v20~v43과 같은 11/28 재배포에 함께 들어감. 재배포 뒤 편집기에서 alertsInstall 한 번 실행 — 시트 '알림구독'·'알림기록'·'알림발송'과 매일 오전 7시대·9시대 트리거)
 *  - 관심 단지·청약 알림 1단계(맨 아래 'v44' 칸, 안내 docs/alerts.md): 알림 센터(my/alerts/)에서 카카오 로그인 + 동의 체크 + 이메일로 신청(alertJoin·alertMine·alertPrefs·alertLeave).
 *    관심 목록 단지의 새 실거래·신고가·급매·큰 하락·전세가율 변화와 청약 맞춤(새 공고·접수 하루 전·발표일)을 하루 한 번(오전 7시대) 묶음 메일로.
 *    모닝 브리핑을 이메일로 받는 사람은 브리핑 메일 맨 위에 함께(한 통만). 같은 알림은 다시 안 보냄. 메일마다 '이 단지 알림 끄기'·'청약 알림 끄기'·'모든 알림 끄기'(GET alertOff).
 *    광고는 넣지 않음(모닝 브리핑 두 광고 동의가 모두 있는 사람만 브리핑과 같은 규칙). 답장 주소는 BRIEF_SENDER.email. 이메일 원문은 '알림구독' 시트에만.
 *  - briefAreas 에 알림 구독자 관심 단지 동네를 더함(엔진이 그 동네 급매·전세가율 급변 자료를 만들게).
 *  - 검증: node tools/alerts-test.js </dev/null
 *
 * v43 변경 요약 (v20~v42와 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — 시트 변경 없음)
 *  - 새 도메인(zipcode.works) 준비: 메일·알림 속 웹 링크를 모두 WEB_ROOT 한 줄에서 만들고(지금은 예전 주소 그대로),
 *    카카오 로그인 돌아올 주소(KAKAO_REDIRECTS)에 https://zipcode.works/login/ 을 미리 허용 — 예전 주소도 계속 허용.
 *    도메인을 바꾸는 날엔 WEB_ROOT 한 줄만 바꿔 다시 배포(docs/domain_switch.md). 안 바꿔도 예전 주소 링크는 새 도메인으로 넘어가요.
 *  - 검증: node tools/domain-test.js
 *
 * v42 변경 요약 (v20~v41과 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — 시트 변경 없음, 기존 '조건' 칸 JSON에 두 값이 더해짐)
 *  - 전문가 이름 리포트 대출 조건(proCond): 금리 유형 rtype(var 변동·mix 혼합·cyc 주기형)과 대출 기간 term(10~40년, 5년 단위)도 저장하고 proOpen 이 그대로 돌려줌.
 *    전에는 연소득·현금·보유·금리만 남기고 버려서, 고객이 링크를 열면 그 기기 기본값(주기형·30년)으로 대출 한도가 계산될 수 있었음.
 *    두 값이 없는 예전 링크·이상한 값은 그 칸만 빼고 저장(화면이 기본값 사용) — 예전 링크는 그대로 열림.
 *  - 검증: node tools/pro-test.js
 *
 * v41 변경 요약 (v20~v40과 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — 시트 변경 없음)
 *  - 모닝 브리핑 메일 맨 위(① 오늘의 부동산 시장 앞)에 '지난주 우리 지역은?' 칸(briefWeeklyHtml): 엔진 brief.py 가 월요일 새벽 주간 실거래 동향 계산 뒤
 *    만들고 월요일 오전 7시 발표 단계가 공개하는 brief/wk/{시군구}.json(내 지역·그 시·도 문장)·wk/market.json(전국 문장)을, 그날 브리핑과 날짜가 같을 때만
 *    그대로 싣는다 — 내 지역 먼저, 그다음 전국. 7시 발표 전에 메일이 나가면 그날은 칸이 빠짐(숫자를 미리 내보내지 않음).
 *    문장·숫자는 엔진이 만든 그대로(서버에서 새 숫자를 만들지 않음). 자료에 wk 가 없는 날은 칸 자체가 없음. 웹 브리핑(brief/)은 재배포 없이 바로 보임.
 *  - 검증: node tools/brief-test.js
 *
 * v40 변경 요약 (v20~v39와 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — 시트 변경 없음)
 *  - 갈아타기 갭 알림 메일 보내는 이름 '장대장 갈아타기 알림' → '{SITE_NAME} 갈아타기 알림', 수신 거부 화면 링크 글자 '{SITE_NAME} 갈아타기 계산기로 가기', 중개사 리뷰 안내 '{SITE_NAME} 리포트에서'(예전 서비스 이름 정리)
 *  - 검증: node tools/rival-name-test.js
 *
 * v39 변경 요약 (v20~v38과 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — 시트 변경 없음)
 *  - 광고·제휴 문의(adInquiry) 관심 상품에 list_card '목록 사이 카드'(월 시·도 30만 원), end_card '페이지 끝 카드'(월 전국 50만·시·도 30만·중개사 화면 15만 원) 추가 — 가격은 assets/ad-prices.js.
 *    재배포 전 서버는 이 키를 버리고 함께 보내는 'etc'(기타·제휴)로 접수해요(문의 내용 첫 줄에 상품 이름).
 *  - 검증: node tools/ad-test.js
 *
 * v38 변경 요약 (v20~v37과 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — 시트 변경 없음)
 *  - 광고·제휴 문의(adInquiry) 희망 기간에 '8주(2개월)' 추가(AQ_PERIOD). 광고 설계 도우미(/ad/plan/)의 8주 구성이 그대로 [희망기간]에 들어가요.
 *    재배포 전 서버는 이 값을 거절하므로, 화면(ad/)이 '미정·협의'로 다시 보내고 문의 내용 첫 줄에 '[희망 기간: 8주(2개월)]'을 적어요.
 *  - 검증: node tools/ad-test.js · node tools/ad-slot-test.js · node tools/ad-plan-test.js
 *
 * v37 변경 요약 (v20~v36과 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — 시트 칸 변경 없음)
 *  - 모든 광고 상품 하루 단위 판매 없앰(대표 승인 2026-11-21): 홈 상단 배너 1주 50만·4주 150만 원, 브리핑 지면 광고 1주 25만·4주 80만 원(VAT 별도).
 *    브리핑 광고 '하루 1개 광고주' 노출 규칙은 그대로.
 *  - '브리핑광고' 시트: 상태 '게재' 줄의 시작일~종료일(끝 날 포함)이 7일 미만이면 [메모]에 경고 문구, 시작일·종료일 칸을 연한 빨강으로,
 *    운영자에게 메일 한 번(briefAdWarn — briefAdToday 가 읽을 때 함께 확인). 광고 노출은 막지 않아요.
 *  - 검증: node tools/brief-test.js · node tools/ad-slot-test.js
 *
 * v36 변경 요약 (v20~v35와 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — 시트 변경 없음)
 *  - 광고·제휴 문의(adInquiry) 관심 상품에 home_top '홈 상단 배너', cat_top '카테고리 상단 배너' 추가(대표 가격 승인 2026-11-21:
 *    홈 상단 1주 50만·4주 150만 원, 카테고리 상단 1주 25만·4주 80만 원·분양·청약 1주 28만·4주 90만 원, VAT 별도 — 위치는 docs/ad_slots.md).
 *    재배포 전 서버는 이 키를 버리고 함께 보내는 'etc'(기타·제휴)로 접수해요(문의 내용 첫 줄에 상품 이름이 있어 놓치지 않음).
 *  - 검증: node tools/ad-test.js · node tools/ad-slot-test.js
 *
 * v35 변경 요약 (v20~v34와 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — '광고문의' 시트 맨 뒤 [보고서 이메일] 칸은 첫 사용 때 머리 줄만 채움)
 *  - adInquiry: 주간 현장 보고서(기본·잠금형)·광고 지역 추천(AQ_REPORT_PROD)을 고르면 reportEmail(보고서 받을 이메일) 필수, 서버에서 형식 확인 → [보고서 이메일]에 저장([연락처]와 따로).
 *  - dwPut: 받는 주소는 [보고서 이메일]을 먼저, 비었거나 이메일이 아니면 [연락처]에서. 둘 다 아니면 운영자 알림(그대로).
 *  - 검증: node tools/devpro-test.js · node tools/devweekly-test.js
 *
 * v34 변경 요약 (v20~v33과 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — '주간현장보고서' 시트·드라이브 폴더는 첫 발송 때 자동 생성.
 *   드라이브 권한은 v27(중개사 플러스 주간 리포트)에서 이미 승인 — 재배포 때 권한 화면이 나오면 '허용')
 *  - POST dwPut(BRIEF_PULL_TOKEN): 엔진(scripts/dev_weekly.py batch, 매주 월요일)이 만든 주간 현장 보고서 PDF를 받아
 *    드라이브 '{SITE_NAME} 주간 현장 보고서' 폴더(링크가 있는 사람만 보기)에 두고, 신청 시트 '광고문의'의 신청 행(id = AQ…)의 [연락처] 이메일로
 *    "[현장 이름] 주간 현장 보고서 · M/D" 메일(1쪽 요약 몇 줄 + PDF 링크)을 보냄. 연락처는 엔진·깃에 없고 시트에만 있음.
 *  - 멈춤: [처리상태]가 '해지'면 [처리일]이 속한 달까지만 보내고 다음 달 1일부터 멈춤(처리일이 비면 바로 멈춤), '취소'면 바로 멈춤.
 *  - 운영자 알림 메일: PDF를 못 만듦(엔진이 fail 로 알림)·신청 행 없음·[연락처]가 이메일이 아님·발송 실패. 같은 신청·같은 날짜는 한 번만 보냄(다시 돌려도 중복 없음).
 *  - 기록 시트 '주간현장보고서'(날짜·신청id·현장·파일id·보낸날·결과, 연락처 없음). 8주 지난 PDF는 파일·줄 모두 지움.
 *  - 검증: node tools/devweekly-test.js
 *
 * v33 변경 요약 (v20~v32와 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — 시트 변경 없음)
 *  - 전문가 표시 정보(proProfile): 공인중개사가 아닌 유형(분양대행·컨설팅·자격사)은 '이름 또는 활동명'(이름·상호 중 하나)과
 *    연락처(전화나 카카오톡 채널) 하나만 필수. 상호·사업자등록번호·자격은 선택(자격은 적으면 목록 안에서만). 공인중개사 법정 표시 항목은 그대로 필수.
 *    안내 문장에 이유를 붙임('법으로 꼭 표시해야 해요(공인중개사법)'). 화면 assets/pro-report.js profileErrors 와 같은 기준.
 *  - 검증: node tools/pro-test.js · node tools/broker-tools-test.js
 *
 * v32 변경 요약 (v20~v31과 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — 시트 변경 없음)
 *  - 광고·제휴 문의(adInquiry) 관심 상품에 시행사 페이지(pro/developer/) 새 판매 상품 키 세 개(대표 가격 승인 2026-11-21):
 *    weekly_report '주간 현장 보고서(기본)', weekly_locked '주간 현장 보고서(잠금형)', ad_target '광고 지역 추천 리포트'.
 *    신청이 들어오면 기존 흐름 그대로 '광고문의' 시트에 [접수]로 저장되고 시트 주인에게 알림 메일(연락처 제외, NOTIFY)이 가요.
 *    재배포 전 서버는 이 키를 버리고 함께 보내는 'etc'(기타·제휴)로 접수해요(문의 내용 첫 줄에 상품 이름이 그대로 있어 놓치지 않음).
 *  - 화면이 보내는 문의 내용에 '회사 색: #RRGGBB'(자료 팩·주간 기본·광고 지역 추천) 줄이 붙을 수 있어요 — 시트 칸 변경 없음.
 *  - 운영: 주간 보고서 현장 등록은 비공개 엔진 docs/dev_b2b_ops.md. 검증: node tools/devpro-test.js
 *
 * v31 변경 요약 (v20~v30과 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음)
 *  - 정보통신망법 제50조 ①항(광고성 정보 수신 동의)·③항(오후 9시~오전 8시 전송 별도 동의): 메일 속 광고는 '광고동의'와 '아침광고동의'가 모두 켜졌을 때만.
 *    이른 아침 동의는 광고성 정보 동의가 있어야 켜지고(서버에서 거절), 광고성 정보를 끄면 함께 꺼짐. 광고성 정보 동의도 사람 단위·동의·철회 일시 기록.
 *  - '브리핑구독' 뒤 칸(아직 배포 전이라 이름 정리): 아침광고동의 · 아침광고동의시각 · 아침광고철회시각 · 광고확인시각(두 동의 공통 2년 확인) · 광고동의시각 · 광고철회시각.
 *  - 원클릭 수신 거부는 두 동의 모두 끔(그대로). 2년 확인 안내는 두 동의 모두(동의 날짜를 각각 적음). 광고주 통계 amAd = 두 동의 모두 한 사람 수.
 *  - briefAdPref { ad, on } · briefMine 에 adc(광고성 정보 동의 상태) 추가. 처리 결과 메일은 바뀐 항목을 모두 적음.
 *  - 검증: node tools/brief-test.js
 *
 * v30 변경 요약 (v20~v29와 같은 11/28 재배포에 함께 들어감. 재배포 뒤 편집기에서 ytKitInstall 한 번 실행)
 *  - 장대장TV 주간 유튜브 키트: POST ytKitPut(BRIEF_PULL_TOKEN, 엔진 youtube_kit.py → 시트 '유튜브키트', 첫 사용 때 자동 생성)
 *    + 월요일 오전 6시대 ytKitSend(트리거 ytKitInstall) — 대표에게 메일(대본·쇼츠·제목·썸네일 문구·설명란·광고용 설명란·고정 댓글·커뮤니티 글 + 그림 zip 첨부).
 *  - 받는 주소: 스크립트 속성 YT_KIT_EMAIL(필수, 코드에 주소 없음). 미리 보기: ytKitSendLatest.
 *  - 그림은 공개 데이터 저장소의 추측 불가능한 폴더(data/yt/{32자리 난수}/)에서만 받음(주소 형식 검사). 글은 공개 저장소에 올리지 않음.
 *  - 검증: node tools/ytkit-test.js
 *
 * v29 변경 요약 (v20~v28과 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — '브리핑광고' 시트·'브리핑구독' 뒤 4칸 머리 줄은 첫 사용 때 자동)
 *  - 정보통신망법 제50조: 브리핑 메일(오전 7시대, 8시 전)에 광고는 '이른 아침(오전 7시) 브리핑 메일 속 광고 받기'(선택·기본 꺼짐)에 동의한 사람에게만.
 *    '브리핑구독' 뒤 4칸: 아침광고동의 · 아침광고동의시각 · 아침광고철회시각 · 확인시각(사람의 모든 행을 같게 — v30에서 칸 이름 정리). 바뀔 때마다 처리 결과 메일.
 *    2년마다 동의 사실 안내 메일(아침 발송 뒤 briefAmRecheck). 신청(briefTrial·briefOrder 의 amAd)·구독 관리(briefAdPref)에서 켜고 끔.
 *  - 광고: '브리핑광고' 시트(운영자 입력, 상태 '게재'·기간 안·제목 20자·설명 60자·https 링크) 중 맨 위 1개. 광고가 실린 날만 제목 맨 앞 '(광고)',
 *    본문 끝에 보낸 사람 정보(BRIEF_SENDER = assets/biz.js)와 원클릭 수신 거부(GET briefAdOff, 행 id + 비밀 토큰 → 메일 광고·광고성 정보 받기 모두 끔).
 *    알림톡에는 광고 없음. 메일은 하루 한 번 그대로(재발송 없음). 웹 브리핑 광고 자리는 GET briefAd(공개 정보만).
 *  - 광고주용 익명 통계 briefPublic 에 amAd(메일 광고 동의자 수, 10명 미만이면 숨김).
 *  - 검증: node tools/brief-test.js
 *
 * v28 변경 요약 (v20~v27과 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — '도구사용' 시트는 첫 사용 때 자동 생성)
 *  - 요금제 표 BRIEF_TIERS 에 listing(매물 설명서 한 달 장수)·kitAreas(주간 블로그·인스타 글 한 주 지역 수) 칸:
 *    기본 0·0 · 플러스 10·1(분양·컨설팅 등 중개사가 아닌 전문가용) · 중개사용 30·1 · 중개사 플러스 150·5. 화면 assets/brief-core.js TIERS 와 같아야 함.
 *  - toolQuota(남은 수 보기) · toolUse(쓸 때 하나 셈: 설명서는 달마다, 주간 글은 주마다 지역 수 — 같은 지역 다시 만들기는 세지 않음).
 *    시트 '도구사용': 기간·회원 해시·도구·수·지역·갱신일만(설명서 내용·표시 정보·연락처 없음). 재배포 전에는 화면이 세지 않고 그대로 열림.
 *  - 월요일 모닝 브리핑 메일(중개사 요금제): 관심 지역마다 '이번 주 블로그·인스타 글' 링크(agent/content/?g=…).
 *  - 검증: node tools/broker-tools-test.js
 *
 * v27 변경 요약 (v20~v26과 같은 11/28 재배포에 함께 들어감. 드라이브 권한이 새로 필요 — 재배포 때 나오는 권한 승인 화면에서 한 번 '허용')
 *  - 중개사 플러스(요금제 표에 customers·weekly 가 있는 요금제): 내 손님 브리핑 — bpMine·bpSave·bpRelink(로그인) · bpOpen(손님 링크, 로그인 없음).
 *    손님 정보는 이름표(20자)·단지 5곳·지역(선택)·목적(선택)만. 전화번호·이메일·실명 모양은 거절. 시트 '플러스중개사'·'내손님'(첫 사용 때 자동 생성).
 *  - 손님 링크 토큰은 서버 비밀값으로 만든 64자리(저장하지 않음, [링크 새로 만들기]로 예전 링크 막기). 손님 화면은 카드 내용·중개사 표시 정보만.
 *  - GET bpPull(BRIEF_PULL_TOKEN): 엔진용 손님 단지 목록(모든 손님을 합쳐 단지마다 한 번) + 주간 리포트 중개사 목록. 이름표는 보내지 않음.
 *    briefAreas 에 손님 단지 동네도 넣음(매일 '어제 올라온 거래'용).
 *  - POST bpPut(BRIEF_PULL_TOKEN): 엔진이 월요일에 만든 주간 리포트 PDF → 드라이브 폴더(링크가 있는 사람만 보기) + 시트 '주간리포트'.
 *  - 아침 메일 맨 위에 '내 손님 카드'(손님별 카드 + [손님에게 보내기] + 손님용 링크), 월요일엔 [이번 주 시장 리포트(PDF) 받기].
 *  - 검증: node tools/client-brief-test.js
 *
 * v26 변경 요약 (v20~v25와 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — '브리핑구독' 시트 뒤 4칸 머리 줄은 첫 사용 때 자동으로 채움)
 *  - 모닝 브리핑 요금제 표 BRIEF_TIERS 한 곳: 기본 3,900원(지역 3·단지 3) · 플러스 5,900원(지역 10·단지 10, 새 상품 brief_plus) · 중개사용 4,900원(지역 10·단지 10 + 중개사 내용)
 *    · 중개사 플러스 9,900원(brief_pro_plus: 지역 20·단지 30·내 손님 10명·급매 기준 5~20% 직접·주간 리포트 표시).
 *    새 요금제는 표에 줄 하나(show:false 면 주문을 받지 않음). 화면 assets/brief-core.js TIERS 와 숫자가 같아야 함(tools/brief-web-test.js 가 대조).
 *    발송할 때 관심 지역·관심 단지는 요금제 수까지만 씀(서버에서 지킴).
 *  - 요금제 바꾸기: briefChangeQuote(금액 미리 보기) · briefChange. 올리기는 오늘 바로, 남은 날만큼 차액만 결제(기존 토스 승인 흐름 briefConfirm 재사용,
 *    금액·날짜·이용권 상태를 승인 전에 서버가 다시 확인). 내리기는 다음 이용권부터('다음요금제' 칸). 자동 환불 없음.
 *  - 중개사용: 신청·올리기 때 중개사무소 등록번호 필수(형식만 확인, 외부 조회 없음) → '중개사번호'·'중개사확인'(확인 대기) 칸 + 운영자 메일.
 *    운영자가 직접 확인하고 '중개사확인' 칸을 '확인됨' 또는 '확인 안 됨'으로 바꿈.
 *  - 시트 '브리핑구독' 뒤에 칸 4개: 결제액 · 다음요금제 · 중개사번호 · 중개사확인. 환불 예정액은 낸 돈(결제액) 기준.
 *  - 급매 기준: 회원 저장 자료 brief.urg(5~20). urgPick 요금제만 그 값, 아니면 10%. 자료의 urgent(10%↑) + urgent_lo(5~10%, 엔진이 따로 실음)에서 고름.
 *  - 친구 초대 보상: briefInvite(초대 링크) · 체험·주문 때 ref → '브리핑초대' 시트(첫 사용 때 자동 생성) → 초대받은 사람 첫 유료 결제 때 두 사람 모두 1개월(0원 이용권을 다음 날부터 붙임).
 *    계정당 한 번·자기 초대 안 됨·체험만 하면 없음·연 12개월 한도. 현금 환급 없음.
 *  - 광고 문의 관심 상품에 brief_ad(모닝 브리핑 지면 광고) 추가.
 *  - 검증: node tools/brief-test.js
 *
 * v25 변경 요약 (v20~v24와 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — 시트 변경 없음)
 *  - 모닝 브리핑 메일 ① 오늘의 부동산 시장에 '새로 발표된 정책·교통·공급 소식'(market.json pnews: 정부·지자체 공식 보도자료 제목·부처·날짜·원문 링크,
 *    종류별 고정 안내 한 줄, 제목에 나온 용어의 쉬운 풀이). 최대 6건. 자료에 pnews 가 없으면(새 발표 없음) 칸 자체를 넣지 않음.
 *  - ② 내 관심 지역마다 그 동네 이름이 나온 새 발표({시군구}.json pnews)를 '내 동네 관련 발표'로 동네 칸 맨 위에(최대 3건). 없으면 생략.
 *  - 재배포 전에는 메일에 이 칸만 빠지고 나머지는 그대로(웹 /brief/ 화면은 바로 보임).
 *  - 검증: node tools/brief-test.js
 *
 * v24 변경 요약 (v20~v23과 같은 11/28 재배포에 함께 들어감. 따로 실행할 함수 없음 — '브리핑열람' 시트는 첫 사용 때 자동 생성)
 *  - 모닝 브리핑 메일에 급매 레이더·전세가율 급변·상승 전환 신호(동네), 상승 전환 TOP·순위 변화·청약 기회·지난 예측 성적(전국) 추가.
 *    구독자가 저장한 청약 가점(brief.cy.score)이 있으면 '넣어 볼 만한 단지'(예상 최저 당첨 가점 범위와 비교). 없으면 그 칸 생략.
 *  - 회원 저장 자료 brief 에 cy{score,nohome}·budget·age(선택) 추가 — 구독 관리 화면에서 지역·관심 단지와 함께 바꿈.
 *  - 광고주용 익명 통계: GET briefPublic(누구나, 구독자 10명 미만이면 숫자 없음·칸마다 10명 미만 숨김) · briefStats(BRIEF_PULL_TOKEN, 12주 추이 포함)
 *    · briefSeen(메일 링크로 웹 브리핑을 연 날 기록 — 구독 id 해시만, 연락처 없음) → 열람률.
 *  - 메일 맨 아래 [지역·단지 바꾸기] 버튼(구독 관리로).
 *  - 검증: node tools/brief-test.js
 *
 * v23 변경 요약 (v20·v21·v22와 같은 11/28 재배포에 함께 들어감. v23 몫으로 따로 실행할 함수 없음)
 *  - 광고·제휴 문의(adInquiry) 관심 상품에 시행사 페이지(pro/developer/) 상품 키 두 개 추가: brochure '집코드 분석 브로슈어(잠금형)',
 *    datapack '현장 자료 팩(편집형)'. 재배포 전에는 이 키가 버려지고 함께 보내는 'etc'(기타·제휴)로 접수돼요(문의 내용에 상품 이름이 그대로 있어 놓치지 않음).
 *  - 자료 팩 이용 조건 동의 여부는 문의 내용 줄('자료 팩 이용 조건 동의: 예 (판 날짜)')로 남아요 — 시트 칸 변경 없음.
 *  - 검증: node tools/devpro-test.js
 *
 * v22 변경 요약 (v20·v21과 같은 11/28 재배포에 함께 들어감. v22 몫으로 따로 실행할 함수 없음)
 *  - '우리 동네 아침 브리핑' → '{SITE_NAME} 모닝 브리핑'. 서비스 이름은 이 파일 맨 위 SITE_NAME 한 곳(웹 assets/config.js·엔진 scripts/brand.py 와 같은 값).
 *    상품명(1개월·중개사용·7일 체험)·메일 제목·메일 머리·만료 안내·환불 요청 메일·알림톡 변수가 모두 이 이름을 따라감.
 *  - 예전 이름으로 저장된 '브리핑구독'·'주문' 시트 행도 그대로 인식(BRIEF_OLD_NAMES) — 이미 신청한 분의 이용 기간·체험 1회 제한 유지.
 *  - 발송 메일 맨 위에 ① 오늘의 부동산 시장(전국 공통 data/brief/market.json, 하루 1번 받아 모든 구독자에게 같은 내용):
 *    전국·서울 신고가 TOP·큰 하락 TOP, 금리·대출·세금 정책 변화, 이번 주 청약 일정. 이어서 ② 내 관심 지역 ③ 내 관심 단지(새 거래가 있을 때).
 *  - 검증: node tools/brief-test.js
 *
 * v21 변경 요약 (v20과 같은 11/28 재배포에 함께 들어감: 배포 → 배포 관리 → 수정 → 새 버전 → 배포. v21 몫으로 따로 실행할 함수 없음)
 *  - 전문가 이름 리포트(proSave·proOpen) 유형을 공인중개사로 한정하지 않음: 개업·소속공인중개사(법정 표기 필수 그대로) ·
 *    분양대행사(상호·사업자등록번호·대표자·연락처 필수, 사업자번호 체크섬 검사) · 부동산 컨설팅·전문가(유튜브·방송·세미나 등, 상호 또는 활동명·연락처 필수) ·
 *    세무사·법무사 등 자격사(자격명·이름 필수, 세무사는 수임료 비교·할인·금전 혜택 문구 거절). 중개보조원은 계속 제외.
 *  - 공인중개사가 아닌 유형이 '공인중개사'·'중개사무소' 명칭을 쓰면 거절(공인중개사법 제18조).
 *  - '전문가리포트' 시트 오른쪽에 '직함'·'사업자번호' 칸 추가(첫 저장 때 제목줄만 자동으로 늘어남). 예전 '전문가' 유형 행은 컨설팅·전문가로 읽음.
 *  - 관리용 시트 제목줄·갈아타기 알림 메일 색을 사이트 테마(파랑 #2F6BFF)로 맞춤.
 *  - 검증: node tools/pro-test.js
 *
 * v20 변경 요약 (재배포 필요: 배포 → 배포 관리 → 수정 → 새 버전 → 배포, 그다음 편집기에서 setupAgency 한 번 실행)
 *  - 분양대행 전속 의뢰 agencyApply(bunyang/agency/): '분양대행의뢰' 시트. 광고 신청(adApply)과 별개. 연락처는 메일에 넣지 않음.
 *  - 판매 파트너(partner/): partnerApply(관리코드는 한 번만 보여 주고 해시만 저장) · partnerLogin · partnerLogout · partnerHome · partnerJoin · partnerDeal
 *    파트너 유형은 분양대행사·공인중개사·부동산 전문가/유튜버·세미나 업체(공인중개사로 한정 안 함). [승인] + [계약서일](판매 위탁 계약서) 뒤에만 현장이 보임.
 *  - '분양현장' 시트: 운영자가 만듦. [승인]+[위탁계약일]+[재위탁승낙](시행사 서면 승낙)+[상태]=모집 중+위탁기간 안일 때만 파트너에게 보임.
 *    [파트너수수료]·[자료링크]는 '현장배정' [상태]=배정인 파트너에게만. [총수수료조건]·[내부메모]는 어디에도 안 나감.
 *  - 계약 보고는 고객 이름·연락처를 받지 않음(이니셜·별칭만). '수수료정산' 시트는 매일 오전 6시 settleSheet 가 정산월×파트너로 다시 만듦.
 *  - 광고·점수와 무관(미래가치 점수·순위에 반영 안 함). 검증: node tools/agency-test.js
 *  - 같은 재배포에 함께 들어가는 것: 청약 분양가 리포트 결제 상품(PRICE.cy, 청약 분양가 분석 작업에서 추가).
 *
 * v19 변경 요약 (재배포 필요: 배포 → 배포 관리 → 수정 → 새 버전 → 배포, 그다음 편집기에서 setupAgentTools 한 번 실행)
 *  - 매수·매도 문의 연결: 이용자가 '중개사 연락 받기'에 따로 동의하면 고른(또는 공개 순번 규칙으로 정해진) 제휴 중개사에게만 전달.
 *    연락처는 암호화(스크립트 속성 LEAD_KEY 자동 생성)·가린 값·해시만 저장, 90일 뒤 또는 이용자 취소 시 바로 삭제.
 *  - 중개사 대시보드(agent/my/): agentLogin(세션 해시만 저장)·agentInbox·agentLeadUpdate·agentPrefs
 *  - 고객 관심 단지 알림: watchSave·watchList·watchRemove + 매일 오전 8시 agentDaily(새 실거래·신고가·큰 하락 거래)
 *  - 발송은 sendNotice(채널 추상화): 메일 + 카카오 알림톡(아침 브리핑의 solapiSend 재사용, 스크립트 속성 SOLAPI_TPL_AGENT 템플릿을 넣으면 켜짐). 검증: node tools/agent-tools-test.js
 *  - 리포트 공개 목록(list)에 lead 칸이 생기면 화면의 '중개사 연락 받기'가 켜집니다(재배포 전에는 화면에 안 나옴).
 *
 * v18 변경 요약
 *  - 우리 동네 아침 브리핑(유료 구독) 추가. 기존 기능은 그대로입니다. (검증: node tools/brief-test.js)
 *  - 새 요청(POST, 카카오 로그인 필요): briefTrial(7일 체험) · briefOrder(1개월 이용권 주문) · briefConfirm(결제 승인) · briefMine · briefUpdate · briefStop(해지) · briefRefund
 *    (GET) briefConfig(쓸 수 있는 발송 채널) · briefAreas·briefInterest(워크플로용 집계, 스크립트 속성 BRIEF_PULL_TOKEN 필요)
 *  - 회원 저장 자료에 brief(받을 동네·관심 단지) 추가. '브리핑구독'·'발송기록' 시트는 첫 사용 때 자동 생성.
 *  - 발송: 함수 briefInstall 을 한 번 실행하면 매일 오전 7시대(늦으면 9시대) briefDaily 가 보냄. 알림톡은 솔라피 키 5개를 스크립트 속성에 넣으면 켜짐.
 *
 * 이전: v17: 전문가 이름 리포트 — 중개사·전문가가 고객에게 보내는 읽기 전용 링크 · v16 분양 광고 상품
 *
 * v17 변경 요약
 *  - 전문가 이름 리포트(premium/pro/ 편집 → premium/r/ 고객 보기) 서버 기능 추가. 기존 기능은 그대로입니다. (검증: node tools/pro-test.js)
 *  - 새 요청(action, 모두 POST): proSave(만들기·고치기) · proList(이 주문으로 만든 링크 목록) · proRevoke(링크 멈추기)
 *                                · proOpen(고객이 링크 열기, 읽기 전용) · proClick(고객의 문의 버튼 누름 횟수만)
 *  - 만들 수 있는 사람: 결제 완료 + 이미 열어 본(열람한) + 환불 요청 없는 주문의 주인(주문번호 + 열람 토큰 확인).
 *  - 고객 링크: 무작위 토큰을 주소의 # 뒤에만 싣고(서버·통계로 가지 않음) 시트에는 토큰 해시만 저장. 만료 30/90일(주문 열람 기간 안).
 *    주문이 환불 요청되거나 열람 기간이 끝나면 고객 링크도 함께 닫힙니다.
 *  - 저장: 전문가가 적은 표시 정보(사무소명·이름·등록번호·주소·업무 연락처·로고 작은 이미지)와 의견 글, 고른 섹션 순서.
 *    고객 연락처는 받지 않습니다. 고객 이름은 선택(20자, 예: '김○○'). 숫자·점수·순위는 저장하지 않고 열 때마다 공개 자료로 다시 계산.
 *  - '전문가리포트' 시트(탭)는 첫 저장 때 자동으로 만들어집니다.
 *
 * v16 변경 요약
 *  - 분양 광고 신청(adApply)에 상품 선택(top 목록 상단 카드·추천 현장 / pin 지도 프리미엄 마커 / alert 관심 지역 알림 / lead 분양 상담 연결 / report 현장 수요 리포트)
 *    과 법정·필수 표기 항목(사업주체·시공사·분양대행사·청약홈 공고번호·분양신고번호·분양보증/신탁·분양가 VAT) 추가. '분양광고' 시트 오른쪽에 열이 늘어나며
 *    예전 시트는 첫 신청 때 제목줄만 자동으로 늘어납니다(기존 행·열 위치 그대로).
 *  - 공개 목록(adList): 주택(아파트·도시형·민간임대·무순위)은 [모집공고승인]='승인'일 때만, 오피스텔·기타는 분양신고번호(또는 '신고 대상 아님')가 있을 때만 노출.
 *    새 공개 필드: prod(상품) · dev·bld·agc(사업주체·시공사·대행사) · no(청약홈 공고번호) · dn·dd(분양신고) · gt(보증·신탁) · vat · gx(추가 노출 구) · xy·rk(지도 좌표·반경) · lead · pr(판매 파트너 모집)
 *  - 새 요청 adLead(POST): 현장 카드의 [분양 상담 신청] → '분양상담' 시트 저장 + 광고주 [상담받을이메일]로 전달(이용자가 제3자 제공에 동의한 이름·연락처·희망 시간·문의만).
 *    연락처는 시트 주인 알림 메일·로그에 넣지 않습니다. 전달 후 6개월이 지나면 cleanLeads()가 행을 지웁니다(매일 트리거: setupAds 한 번 실행).
 *  - 기록(log): 광고 노출 adv · 지도 마커 노출 adm · 클릭 adc · 상담 신청 adl 를 광고 id(AD…)로 받습니다(개인 정보 없음). adReport() → '광고보고서' 시트.
 *  - 관심 지역(areas)에 광고성 정보 수신 동의(mkt: {at 동의일}) 저장 — 동의한 경우에만 칸이 생기고, 없으면 미동의. adDemand(시도, 시군구) → 익명 집계(10명 미만은 숨김).
 *  - 검증: node tools/ad-test.js
 *
 * v15 변경 요약
 *  - 회원 저장 자료(userSave·userLoad)에 관심 지역(areas) 추가: 시·도/시·군·구 최대 10곳 + 알림 종류(새 분양 공고·무순위/잔여세대).
 *    관심 지역 저장 = 알림 신청. 카카오톡 발송은 카카오 비즈 인증 뒤 '회원' 시트 저장자료의 areas 로 보냄. 기존 기능은 그대로입니다.
 *
 * v14 변경 요약
 *  - 카카오 로그인 회원 기능 추가. 기존 기능은 그대로입니다. (검증: node tools/auth-test.js)
 *  - 새 요청(action, 모두 POST): kakaoLogin(인가 코드 → 로그인) · userLoad(저장 자료 불러오기) · userSave(저장)
 *                                · alertSubscribe(관심 단지·지역 알림 신청/취소) · userLogout(로그아웃) · userDelete(탈퇴)
 *  - 카카오에서 받는 정보는 회원번호(id)와 닉네임뿐입니다. 이메일·전화번호는 요청하지도 저장하지도 않습니다.
 *  - 카카오 토큰은 서버에서 /v2/user/me 확인에만 쓰고 바로 만료(로그아웃) 처리하며, 시트에 저장하지 않습니다.
 *    로그인 유지는 서버가 만든 무작위 세션 토큰으로 하고, 시트에는 그 해시만 저장합니다(90일 뒤 만료).
 *  - 스크립트 속성(프로젝트 설정 → 스크립트 속성): KAKAO_REST_KEY(필수, REST API 키) · KAKAO_CLIENT_SECRET(클라이언트 시크릿을 켰으면)
 *    · KAKAO_ADMIN_KEY(선택: 탈퇴 때 카카오 연결 끊기까지 하려면 어드민 키)
 *  - '회원'·'세션'·'관심알림' 시트(탭)는 첫 로그인 때 자동으로 만들어집니다. 탈퇴하면 세 시트에서 그 회원 행을 바로 지웁니다.
 *
 * v13 변경 요약
 *  - 광고 상품 안내 페이지(ad/)의 문의 접수 추가. 기존 기능은 그대로입니다.
 *  - 새 요청(action): adInquiry(POST, type:'inquiry') → '광고문의' 시트(첫 문의 때 자동 생성)에 저장 + 시트 주인에게 메일
 *  - 연락처는 시트에만 저장하고, 알림 메일·로그·통계에는 넣지 않습니다(메일에는 '시트에서 확인'만).
 *  - 입력 검증: 길이 제한, 전화번호 또는 이메일 형식, 관심 상품 허용 목록, 개인정보 동의 필수, 셀 수식 주입 차단, 하루 상한.
 *  - 보관: 문의 처리 완료 후 1년(개인정보처리방침과 같음) — '처리상태'·'처리일' 열로 관리
 *
 * v12 변경 요약
 *  - 분양 광고(시행사·분양대행사) 신청·노출 기능 추가. 기존 제휴·알림·리뷰·결제(v11) 기능은 그대로입니다.
 *  - 새 요청(action): adApply(POST, 광고 신청) · adList(GET, 승인 + 시작일≤오늘≤종료일 인 광고만 공개 필드로)
 *  - '분양광고' 시트(탭)는 첫 신청 때 자동으로 만들어집니다. 운영자가 [승인] 체크 + [시작일]·[종료일] 입력 → 5분 안에 노출.
 *  - 연락처·사업자등록번호·담당자는 시트에만 저장하고 공개 목록(adList)에는 절대 넣지 않습니다.
 *  - 입력 검증: 길이 제한, https 주소만, 사업자등록번호 검증, 셀 수식 주입 차단(=,+,-,@ 로 시작하는 글 거절), 꺾쇠(<>) 제거.
 *  - 광고는 어떤 점수·추천 순위에도 반영하지 않습니다(화면에는 항상 '광고' 표시).
 *  - 검증: node tools/ad-test.js (광고) · node tools/pay-test.js (결제, 49개)
 *
 * v11 변경 요약
 *  - 프리미엄 리포트 유료 결제(토스페이먼츠 결제위젯) 서버 기능 추가. 기존 제휴·알림·리뷰 기능은 그대로입니다.
 *  - 새 요청(action): createOrder(주문 만들기) · confirmPayment(결제 승인) · openReport(리포트 열람/상태 확인)
 *                    · refundRequest(환불 요청 접수, 자동 환불 없음) · findOrder(주문번호+연락처로 다시 보기)
 *  - '주문' 시트(탭)는 첫 주문 때 자동으로 만들어집니다. 금액은 아래 PRICE 표(서버 기준)와 대조하고,
 *    토스 시크릿 키는 코드가 아니라 스크립트 속성 TOSS_SECRET_KEY 에서 읽습니다.
 *  - 연락처는 가린 형태(010-****-1234)와 확인용 해시만, 열람 토큰은 해시만 시트에 저장합니다.
 *  - 운영 안내: tools/payment-setup.md
 *  - 카카오톡 채팅 링크 서버 검증 kakaoUrl(): 제휴 신청·정보 수정 저장 때 open.kakao.com / pf.kakao.com 주소만 저장(tools/chat-backend-patch.md)
 *
 * 설치: 구글 시트 새로 만들기 → 확장 프로그램 → Apps Script → 이 코드 전체 붙여넣기 → 저장
 *       → 위쪽 함수 선택에서 setup 실행(권한 허용) → 배포 → 새 배포 → 유형: 웹 앱
 *       → 실행: 나, 액세스 권한: 모든 사용자 → 배포 → 웹 앱 URL 복사
 *
 * 운영: '중개사' 시트에서 입금 확인 후 [승인] 체크 + [만료일] 입력 → 5분 안에 리포트에 노출
 *       '로그' 시트에 노출·열람·전화·카톡 클릭이 쌓이고, 중개사는 관리 화면에서 본인 성과를 확인
 */

const SLOT = 9999;         // 한 구에 받을 수 있는 제휴 중개사 수 (9999 = 제한 없음, 선택한 중개사 전부 노출)
const MAX_EXTRA = 2;       // 사무소 구 외 추가 구 수
const MAX_DANJI = 10;      // 매물 보유 단지 최대 수
const CONFIRM_DAYS = 30;   // 매물 보유 재확인 주기(일)
const NOTIFY = true;       // 새 신청 시 시트 주인에게 메일 알림
/* v47 유료 판매 잠금 — 통신판매업 신고번호가 나오기 전까지 false. false 면 결제(토스) 주문·승인·요금제 올리기를 모두 거절(무료 체험·문의·알림 신청은 그대로).
   신고번호를 받은 날: 이 값을 true 로 + 화면 assets/config.js PAID_OPEN 도 true 로 바꾸고 다시 배포(배포 관리 → 수정 → 새 버전). */
const PAID_OPEN = false;
const PAID_CLOSED_MSG = '유료 이용권은 곧 열려요. 지금은 7일 무료 체험만 할 수 있어요.';
/* 돈을 받는(토스 주문·승인) 요청 전부 — 리포트 결제(createOrder·confirmPayment)·모닝 브리핑 이용권(briefOrder·briefConfirm)·요금제 바꾸기(briefChangeQuote·briefChange).
   이미 산 주문 보기·환불 요청(openReport·findOrder·refundRequest·briefRefund·briefStop)은 막지 않음. 새 결제 요청을 만들면 여기에도 꼭 넣기(tools/paid-lock-test.js 가 확인). */
const PAID_ACTIONS = { createOrder: 1, confirmPayment: 1, briefOrder: 1, briefConfirm: 1, briefChangeQuote: 1, briefChange: 1 };
/* 시트 메뉴에서 Apps Script를 열지 못해 script.google.com에서 따로 만든 경우에만,
   시트 주소의 /d/ 와 /edit 사이 문자열(시트 ID)을 아래 따옴표 안에 넣으세요. */
const SHEET_ID = '';
function book() { return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActive(); }

const SH_A = '중개사', SH_L = '로그';
const H = ['id','등록번호','사무소명','대표자','전화','카카오','소개','시도','사무소구코드','사무소구','사무소동',
           '추가구','단지','관리코드','신청일','승인','만료일','메모','수정일','상품','사업자번호','계산서메일','노출지역',
           '유형','중개사명','자격증번호'];
/* 대표(개업공인중개사): 기본 월 29,000원 · 프리미엄 월 49,000원 / 소속공인중개사: 상담 월 19,000원 (연간 결제, 부가세 별도) */
const PLAN = { basic: '기본', premium: '프리미엄', member: '소속 상담' };
const TYPE = { owner: '대표', member: '소속' };
const COL = Object.fromEntries(H.map((h, i) => [h, i]));

/* ---------- 최초 1회 실행 ---------- */
function setup() {
  const ss = book();
  let a = ss.getSheetByName(SH_A) || ss.insertSheet(SH_A);
  a.getRange(1, 1, 1, H.length).setValues([H]).setFontWeight('bold').setBackground('#2F6BFF').setFontColor('#FFFFFF');
  a.setFrozenRows(1);
  a.getRange(2, COL['만료일'] + 1, 999, 1).setNumberFormat('yyyy-mm-dd');
  a.getRange(2, COL['신청일'] + 1, 999, 1).setNumberFormat('yyyy-mm-dd');
  a.getRange(2, COL['수정일'] + 1, 999, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  let l = ss.getSheetByName(SH_L) || ss.insertSheet(SH_L);
  l.getRange(1, 1, 1, 6).setValues([['시각','유형','중개사id','구코드','단지','방문자']]).setFontWeight('bold');
  l.setFrozenRows(1);
  const s1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('시트1');
  if (s1 && ss.getSheets().length > 2) ss.deleteSheet(s1);
}

/* ---------- 공통 ---------- */
/* 서비스 이름 — 여기 한 곳(웹 assets/config.js SITE_NAME · 엔진 scripts/brand.py 와 같은 값). 모닝 브리핑 이름은 이 값으로 조합 */
const SITE_NAME = '집코드';
/* 웹 사이트 주소(끝에 / 붙임) — 메일·알림 속 링크가 모두 이 값을 따름. 도메인을 바꾸면 이 한 줄만 'https://zipcode.works/' 로(docs/domain_switch.md).
   바꾸기 전이라도 예전 주소는 GitHub 가 새 도메인으로 넘겨 줘서 링크가 끊기지 않아요. */
const WEB_ROOT = 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/';
const BRIEF_NAME = SITE_NAME + ' 모닝 브리핑';
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function ymd(d) { return Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd'); }
function str(v, n) { return String(v == null ? '' : v).trim().slice(0, n || 200); }
/* 카카오톡 채팅 링크: 오픈채팅(open.kakao.com) 또는 채널(pf.kakao.com)만, 아니면 빈 값 */
function kakaoUrl(v) {
  const s = str(v, 200).trim();
  return /^https:\/\/(open|pf)\.kakao\.com\/[^\s"'<>\\`]+$/.test(s) ? s : '';
}
function parseJ(v, d) { try { return v ? JSON.parse(v) : d; } catch (e) { return d; } }

function agents() {
  const sh = book().getSheetByName(SH_A);
  const vals = sh.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    if (!r[COL['id']]) continue;
    list.push({
      row: i + 1, id: String(r[COL['id']]), reg: String(r[COL['등록번호']]), office: String(r[COL['사무소명']]),
      ceo: String(r[COL['대표자']]), phone: String(r[COL['전화']]), kakao: String(r[COL['카카오']]), intro: String(r[COL['소개']]),
      sido: String(r[COL['시도']]), og: String(r[COL['사무소구코드']]), ogName: String(r[COL['사무소구']]), dong: String(r[COL['사무소동']]),
      extras: parseJ(r[COL['추가구']], []), danji: parseJ(r[COL['단지']], []), code: String(r[COL['관리코드']]),
      applied: r[COL['신청일']], approved: r[COL['승인']] === true, expires: r[COL['만료일']], memo: String(r[COL['메모']]),
      plan: String(r[COL['상품']] || PLAN.premium), biz: String(r[COL['사업자번호']] || ''), mail: String(r[COL['계산서메일']] || ''),
      type: String(r[COL['유형']] || TYPE.owner), name: String(r[COL['중개사명']] || ''), lic: String(r[COL['자격증번호']] || '')
    });
  }
  return list;
}
function isActive(a) {
  if (!a.approved) return false;
  if (a.expires instanceof Date && a.expires < today()) return false;
  return true;
}
function regionsOf(a) { return [a.og].concat(a.extras || []); }
function freshDanji(a) {
  const lim = today().getTime() - CONFIRM_DAYS * 86400000;
  return (a.danji || []).filter(d => d.at && new Date(d.at).getTime() >= lim);
}
function slotCount(gu, exceptId, list) {
  return list.filter(a => a.id !== exceptId && isActive(a) && regionsOf(a).indexOf(gu) >= 0).length;
}
function statusOf(a) {
  if (!a.approved) return '승인 대기';
  if (a.expires instanceof Date && a.expires < today()) return '기간 만료';
  return '노출 중';
}

/* ---------- 요청 처리 ---------- */
function doGet(e) {
  const act = (e.parameter || {}).action;
  if (act === 'list') return out(listPublic());
  if (act === 'adList') return out(adList());
  if (act === 'reviews') return out(reviewsPublic(e.parameter.a));
  if (act === 'unsub') return unsubscribe(e.parameter);
  if (act === 'leadCancel') return leadCancel(e.parameter);
  if (act === 'briefConfig') return out({ ok: true, channels: briefChannels(), price: BRIEF_PRICE, trial: BRIEF_TRIAL, paid: PAID_OPEN });
  if (act === 'briefAreas') return out(briefAreas(e.parameter));
  if (act === 'briefInterest') return out(briefInterest(e.parameter));
  if (act === 'briefPublic') return out(briefPublic());
  if (act === 'briefAd') return out({ ok: true, ad: briefAdToday(new Date()) });     // v29 웹 브리핑 광고 자리(공개 정보만)
  if (act === 'briefAdOff') return briefAdOff(e.parameter);                         // v29 메일 광고 수신 거부(원클릭)
  if (act === 'briefStats') return out(briefStats(e.parameter));
  if (act === 'briefSeen') return out(briefSeen(e.parameter));
  if (act === 'bpPull') return out(bpPull(e.parameter));
  if (act === 'alertOff') return alertOff(e.parameter);                              // v44 알림 메일의 끄기 링크(원클릭)
  return out({ ok: false, err: 'unknown' });
}

/* 예전 시트에 새 열 제목(상품·사업자번호·계산서메일·노출지역)이 없으면 채움 */
function ensureHeader() {
  const sh = book().getSheetByName(SH_A);
  const cur = sh.getRange(1, 1, 1, H.length).getValues()[0];
  if (cur[H.length - 1] !== H[H.length - 1]) sh.getRange(1, 1, 1, H.length).setValues([H]).setFontWeight('bold').setBackground('#2F6BFF').setFontColor('#FFFFFF');
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (x) { return out({ ok: false, err: '요청 형식 오류' }); }
  if (!PAID_OPEN && PAID_ACTIONS[b && b.action]) return out({ ok: false, err: PAID_CLOSED_MSG, code: 'paid_closed' });   // v47 유료 판매 잠금
  if (b.action === 'log') return out(logEvents(b));
  if (b.action === 'ytKitPut') return out(ytKitPut(b));            // v30 장대장TV 주간 유튜브 키트(엔진 → 시트)
  if (PAY_ACTIONS[b.action]) return out(payDispatch(b));
  if (b.action === 'adApply' || b.action === 'adInquiry' || b.action === 'adLead') return out(adDispatch(b));
  if (USER_ACTIONS[b.action]) return out(userDispatch(b));
  if (AGT_ACTIONS[b.action]) return out(agtDispatch(b));
  if (BRIEF_ACTIONS[b.action]) return out(briefDispatch(b));
  if (AX_ACTIONS[b.action]) return out(axDispatch(b));             // v44 관심 단지·청약 알림 메일
  if (CM_ACTIONS[b.action]) return out(cmDispatch(b));             // v46 살아보니(건물별 후기·이야기, 숨김)
  if (DP_ACTIONS[b.action]) return out(dpDispatch(b));             // v50 동네 중개사 파트너(숨김)
  if (BR_BILL_ACTIONS[b.action]) return out(baBillDispatch(b));    // v50 모닝 브리핑 자동결제(BILLING_OPEN 잠금)
  if (PRO_ACTIONS[b.action]) return out(proDispatch(b));
  if (BP_ACTIONS[b.action]) return out(bpDispatch(b));
  if (b.action === 'bpPut') { try { return out(bpPut(b)); } catch (x) { return out({ ok: false, err: String(x.message || x) }); } }
  if (b.action === 'dwPut') { try { return out(dwPut(b)); } catch (x) { dwAlert('서버 오류', ['주간 현장 보고서를 처리하다 멈췄어요: ' + String(x.message || x).slice(0, 200)]); return out({ ok: false, err: 'server' }); } }   // v34
  if (DV_ACTIONS[b.action]) return out(dvDispatch(b));
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    ensureHeader();
    if (b.action === 'alert_sub') return out(alertSub(b));
    if (b.action === 'apply') return out(apply(b));
    if (b.action === 'review') return out(addReview(b));
    if (b.action === 'flag') return out(flagReview(b));
    if (b.action === 'reply') return out(replyReview(b));
    if (b.action === 'login') return out(login(b));
    if (b.action === 'update') return out(update(b));
    return out({ ok: false, err: 'unknown' });
  } catch (x) {
    return out({ ok: false, err: String(x.message || x) });
  } finally {
    lock.releaseLock();
  }
}

/* 리포트용 공개 목록: 승인·기간 내 중개사만, 공개 정보만 */
function listPublic() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('list');
  if (hit) return JSON.parse(hit);
  const RS = reviewStats();
  const res = {
    ok: true, slot: SLOT, at: ymd(new Date()), lead: { v: LEAD_CONSENT_V, pick: LEAD_PICK_MAX, turn: LEAD_TURN_N, keep: LEAD_KEEP_DAYS },
    agents: agents().filter(isActive).map(a => ({
      id: a.id, n: a.office, ceo: a.ceo, ph: a.phone, kk: a.kakao, intro: a.intro, reg: a.reg,
      og: a.og, ogn: a.ogName, dong: a.dong, r: regionsOf(a), dj: a.plan === PLAN.premium ? freshDanji(a).map(d => d.k) : [], pl: a.plan === PLAN.premium ? 'p' : 'b',
      t: a.type === TYPE.member ? 'm' : 'o', nm: a.type === TYPE.member ? a.name : a.ceo,
      rv: RS[a.id] || null
    }))
  };
  cache.put('list', JSON.stringify(res), 300);
  return res;
}

/* 구 코드 → 이름 (신청 화면이 보내 준 이름 사용, 없으면 코드 그대로) */
function regionNames(codes, names) {
  names = names || {};
  return codes.map(c => str(names[c], 20) || c).join(', ');
}

function validRegions(og, extras) {
  if (!/^\d{5}$/.test(og)) throw new Error('사무소 구를 선택해 주세요.');
  extras = (extras || []).map(String).filter(x => /^\d{5}$/.test(x));
  extras = extras.filter((x, i) => extras.indexOf(x) === i && x !== og);
  if (extras.length > MAX_EXTRA) throw new Error(`추가 지역은 ${MAX_EXTRA}개 구까지 고를 수 있습니다.`);
  if (extras.some(x => x.slice(0, 2) !== og.slice(0, 2))) throw new Error('추가 지역은 사무소와 같은 시·도 안에서 고를 수 있습니다.');
  return extras;
}
function validDanji(list, regions, prev) {
  list = (list || []).slice(0, MAX_DANJI + 5).map(d => ({ k: str(d.k, 120), n: str(d.n, 60) }))
    .filter(d => d.k.split('|').length === 3);
  const seen = {};
  list = list.filter(d => (seen[d.k] ? false : (seen[d.k] = true)));
  if (list.length > MAX_DANJI) throw new Error(`매물 보유 단지는 ${MAX_DANJI}개까지 등록할 수 있습니다.`);
  if (list.some(d => regions.indexOf(d.k.split('|')[0]) < 0)) throw new Error('매물 보유 단지는 선택한 3개 구 안의 단지만 등록할 수 있습니다.');
  const old = {}; (prev || []).forEach(d => old[d.k] = d.at);
  return list.map(d => ({ k: d.k, n: d.n, at: old[d.k] || ymd(new Date()) }));
}

function apply(b) {
  ensureHeader();
  const type = b.type === 'member' ? TYPE.member : TYPE.owner;
  const reg = str(b.reg, 40), office = str(b.office, 40), ceo = str(b.ceo, 20), phone = str(b.phone, 20);
  const name = str(b.name, 20), lic = str(b.lic, 30);
  if (!reg || !office || !ceo || !phone) throw new Error('등록번호·사무소명·대표자·전화번호는 꼭 입력해 주세요.');
  if (type === TYPE.member && (!name || !lic)) throw new Error('소속공인중개사는 본인 이름과 공인중개사 자격증 번호를 꼭 입력해 주세요.');
  if (!b.agree) throw new Error('유의사항 동의가 필요합니다.');
  const list = agents(), R = x => x.replace(/\s/g, '');
  if (type === TYPE.owner && list.some(a => a.type !== TYPE.member && R(a.reg) === R(reg))) throw new Error('이미 신청된 등록번호입니다. [내 관리]에서 로그인해 수정해 주세요.');
  if (type === TYPE.member && list.some(a => a.type === TYPE.member && R(a.reg) === R(reg) && R(a.name) === R(name))) throw new Error('이 사무소에서 같은 이름으로 이미 신청되었습니다. [내 관리]에서 로그인해 수정해 주세요.');
  const og = str(b.og, 5), extras = validRegions(og, b.extras);
  const regions = [og].concat(extras);
  const plan = type === TYPE.member ? PLAN.member : (b.plan === 'premium' ? PLAN.premium : PLAN.basic);
  const danji = plan === PLAN.premium ? validDanji(b.danji, regions, []) : [];
  const full = regions.filter(g => slotCount(g, '', list) >= SLOT);
  const id = 'A' + Utilities.getUuid().replace(/-/g, '').slice(0, 7).toUpperCase();
  const code = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  const row = [];
  row[COL['id']] = id; row[COL['등록번호']] = reg; row[COL['사무소명']] = office; row[COL['대표자']] = ceo;
  row[COL['전화']] = phone; row[COL['카카오']] = kakaoUrl(b.kakao); row[COL['소개']] = str(b.intro, 120);
  row[COL['시도']] = str(b.sido, 20); row[COL['사무소구코드']] = og; row[COL['사무소구']] = str(b.ogName, 30);
  row[COL['사무소동']] = str(b.dong, 30); row[COL['추가구']] = JSON.stringify(extras); row[COL['단지']] = JSON.stringify(danji);
  row[COL['관리코드']] = code; row[COL['신청일']] = new Date(); row[COL['승인']] = false; row[COL['만료일']] = '';
  row[COL['메모']] = full.length ? '대기(자리 마감): ' + full.join(',') : ''; row[COL['수정일']] = new Date();
  row[COL['상품']] = plan; row[COL['사업자번호']] = str(b.biz, 20); row[COL['계산서메일']] = str(b.mail, 80);
  const rname = regionNames(regions, b.names);
  row[COL['노출지역']] = rname;
  row[COL['유형']] = type; row[COL['중개사명']] = type === TYPE.member ? name : ''; row[COL['자격증번호']] = lic;
  const sh = book().getSheetByName(SH_A);
  sh.appendRow(row);
  sh.getRange(sh.getLastRow(), COL['승인'] + 1).insertCheckboxes();   // 승인 칸을 체크박스로
  if (NOTIFY) {
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[장대장 제휴] 새 신청: ${office}`,
        `[${type}] ${type === TYPE.member ? name + ' (소속) · ' : ''}${office} (대표 ${ceo}) ${phone}\n상품 ${plan}\n등록번호 ${reg}${lic ? ' · 자격증번호 ' + lic : ''}\n`
        + `확인: 사무소 등록·영업 상태는 국가공간정보포털(부동산중개업 조회), ${type === TYPE.member ? '소속 여부·자격은 같은 조회 화면의 소속공인중개사 목록과 큐넷 자격증 진위확인으로 ' : ''}확인하세요.\n`
        + `사업자번호 ${str(b.biz, 20)} / 계산서 ${str(b.mail, 80)}\n지역 ${rname} (사무소 ${str(b.ogName, 30)} ${str(b.dong, 30)})\n시트에서 확인 후 승인 체크와 만료일을 입력하세요.\n${book().getUrl()}`);
    } catch (e) {}
  }
  return { ok: true, id: id, code: code, waitlist: full };
}

function findMe(b, list) {
  const reg = str(b.reg, 40).replace(/\s/g, ''), code = str(b.code, 20).toUpperCase();
  const me = list.find(a => a.reg.replace(/\s/g, '') === reg && a.code.toUpperCase() === code);   // 소속은 같은 등록번호가 여럿 → 관리코드로 구분
  if (!me) throw new Error('등록번호 또는 관리코드가 맞지 않습니다.');
  return me;
}
function slotsFor(prefix, me, list) {
  const gus = {};
  list.filter(isActive).forEach(a => regionsOf(a).forEach(g => {
    if (g.slice(0, 2) === prefix && a.id !== me.id) gus[g] = (gus[g] || 0) + 1;
  }));
  return gus;
}
function meOut(me, list) {
  const fresh = freshDanji(me).map(d => d.k);
  return {
    ok: true, slot: SLOT, maxExtra: MAX_EXTRA, maxDanji: MAX_DANJI, confirmDays: CONFIRM_DAYS,
    me: {
      id: me.id, reg: me.reg, office: me.office, ceo: me.ceo, type: me.type, name: me.name, phone: me.phone, kakao: me.kakao, intro: me.intro,
      sido: me.sido, og: me.og, ogName: me.ogName, dong: me.dong, extras: me.extras,
      danji: (me.danji || []).map(d => ({ k: d.k, n: d.n, at: d.at, fresh: fresh.indexOf(d.k) >= 0 })),
      reviews: reviews().filter(r => r.a === me.id).reverse().slice(0, 50).map(r => ({ id: r.id, at: ymd(r.at), s: r.s, tags: r.tags, text: r.text, show: r.show, reply: r.reply })),
      rv: reviewStats()[me.id] || null,
      status: statusOf(me), expires: me.expires instanceof Date ? ymd(me.expires) : '', waitMemo: me.memo,
      plan: me.plan, biz: me.biz, mail: me.mail
    },
    used: slotsFor(me.og.slice(0, 2), me, list),
    stats: statsFor(me.id)
  };
}
function login(b) { const list = agents(); return meOut(findMe(b, list), list); }

function update(b) {
  const list = agents();
  const me = findMe(b, list);
  const extras = validRegions(me.og, b.extras);
  const regions = [me.og].concat(extras);
  if (isActive(me)) {
    const added = extras.filter(g => (me.extras || []).indexOf(g) < 0);
    const full = added.filter(g => slotCount(g, me.id, list) >= SLOT);
    if (full.length) throw new Error('선택한 구 중 자리가 마감된 곳이 있습니다: ' + full.join(', '));
  }
  let danji = me.plan === PLAN.premium ? validDanji(b.danji, regions, me.danji) : [];
  if (b.reconfirm) danji = danji.map(d => ({ k: d.k, n: d.n, at: ymd(new Date()) }));
  const sh = book().getSheetByName(SH_A);
  const set = (h, v) => sh.getRange(me.row, COL[h] + 1).setValue(v);
  set('추가구', JSON.stringify(extras));
  set('단지', JSON.stringify(danji));
  if (b.phone) set('전화', str(b.phone, 20));
  set('카카오', kakaoUrl(b.kakao));
  set('소개', str(b.intro, 120));
  if (b.names) set('노출지역', regionNames(regions, b.names));
  if (b.biz != null) set('사업자번호', str(b.biz, 20));
  if (b.mail != null) set('계산서메일', str(b.mail, 80));
  set('수정일', new Date());
  CacheService.getScriptCache().remove('list');
  const list2 = agents();
  return meOut(list2.find(a => a.id === me.id), list2);
}

/* 기록: rec = 추천 단지 카드에 표시(펼치기 전, 한 줄에 여러 중개사 id), imp = [공인중개사 연결하기]로 목록 펼침,
   view = 정보 창 열람, call = 전화 버튼, kakao = 카톡 버튼 */
const TYPES = ['rec', 'imp', 'view', 'call', 'kakao'];
const AD_LOG = ['adv', 'adm', 'adc'];   // 분양 광고: 목록·추천 노출 · 지도 마커 노출 · 클릭
const ID_RE = /^A[0-9A-F]{7}$/;
/* v45 단지 검색 결과 없음(t: 'sq'): 검색어 글자만 '검색실패' 시트에 — 새 별칭을 배우는 용도.
   방문자 번호(vid)·주소·이름 등은 남기지 않는다(같은 요청에 vid 가 와도 이 시트에는 쓰지 않음).
   전화번호·이메일·주소처럼 보이는 글, 40자 넘는 글은 버린다. 화면 이름(g)은 영문 소문자 12자까지만. */
const SH_SQ = '검색실패';
function cleanQuery(q) {
  const t = String(q == null ? '' : q).replace(/\s+/g, ' ').trim();
  if (t.length < 2 || t.length > 40) return '';
  if (/\d{6,}|\d{2,4}[-.\s]\d{3,4}[-.\s]\d{4}|@|https?:/i.test(t) || !/[가-힣a-z]/i.test(t)) return '';
  return t.replace(/[<>=+]/g, '');                                   // 시트 수식으로 읽히지 않게
}
function logMiss(rows) {
  if (!rows.length) return;
  const ss = book();
  let sh = ss.getSheetByName(SH_SQ);
  if (!sh) { sh = ss.insertSheet(SH_SQ); sh.appendRow(['시각', '검색어', '화면']); }
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, 3).setValues(rows);
}
function logEvents(b) {
  const ev = (b.events || []).slice(0, 40);
  const vid = str(b.vid, 40), now = new Date();
  const rows = [], miss = [];
  ev.forEach(x => {
    if (x.t === 'sq') {                                              // v45 검색 결과 없음 — 검색어만(vid 없이)
      const q = cleanQuery(x.k), g = String(x.g || '');
      if (q) miss.push([now, q, /^[a-z]{1,12}$/.test(g) ? g : '']);
      return;
    }
    if (AD_LOG.indexOf(x.t) >= 0) {                         // v16 분양 광고 노출·클릭(광고 id만, 개인 정보 없음)
      if (!/^AD[0-9A-F]{8}$/.test(String(x.a || '')) || !/^(\d{5})?$/.test(String(x.g || ''))) return;
      rows.push([now, x.t, String(x.a), String(x.g || ''), str(x.k, 20), vid]); return;
    }
    if (TYPES.indexOf(x.t) < 0 || !/^\d{5}$/.test(x.g)) return;
    const ids = String(x.a || '').split(',').filter(id => ID_RE.test(id)).slice(0, 80);
    if (!ids.length || (x.t !== 'rec' && ids.length > 1)) return;
    rows.push([now, x.t, ids.join(','), x.g, str(x.k, 120), vid]);
  });
  if (rows.length) {
    const sh = book().getSheetByName(SH_L);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
  }
  logMiss(miss.slice(0, 5));
  return { ok: true, n: rows.length + Math.min(miss.length, 5) };
}

/* 이번 달·지난 달 성과 */
function zero() { return { rec: 0, imp: 0, view: 0, call: 0, kakao: 0 }; }
function statsFor(id) {
  const sh = book().getSheetByName(SH_L);
  const n = sh.getLastRow();
  const res = {};
  const now = new Date();
  const keep = [Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM'),
                Utilities.formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 15), 'Asia/Seoul', 'yyyy-MM')];
  keep.forEach(m => res[m] = { tot: zero(), gu: {}, dj: {} });
  if (n < 2) return res;
  const vals = sh.getRange(2, 1, n - 1, 5).getValues();
  for (const r of vals) {
    if (!(r[0] instanceof Date)) continue;
    if (String(r[2]).split(',').indexOf(id) < 0) continue;
    const m = Utilities.formatDate(r[0], 'Asia/Seoul', 'yyyy-MM');
    if (!res[m]) continue;
    const t = String(r[1]), g = String(r[3]), k = String(r[4] || '');
    res[m].tot[t] = (res[m].tot[t] || 0) + 1;
    const G = res[m].gu[g] = res[m].gu[g] || zero();
    G[t] = (G[t] || 0) + 1;
    if (k && (t === 'rec' || t === 'imp')) {
      const D = res[m].dj[k] = res[m].dj[k] || { rec: 0, imp: 0 };
      D[t]++;
    }
  }
  return res;
}


/* =====================================================================
   갈아타기 갭 알림 (이메일)
   - 고객이 갈아타기 계산기에서 '지금 집'과 '갈아탈 집'(단지·평형)을 고르고 조건을 정하면 '알림' 시트에 저장
   - checkAlerts()가 매일 실거래 데이터로 두 단지 가격 차이(갭)를 다시 계산해 조건을 만족하면 메일 발송
   - 최초 1회: 편집기에서 setupAlerts 실행 → 매일 오전 10시 자동 점검 트리거 생성
   ===================================================================== */
const SH_AL = '알림';
const AL_H = ['id','이메일','지금집','지금집키','지금집시도','지금집면적','갈아탈집','갈아탈집키','갈아탈집시도','갈아탈집면적',
              '조건','조건값','기준갭','최근갭','등록일','최근점검','최근알림','상태','토큰','마케팅동의','마케팅동의일'];
const AC = Object.fromEntries(AL_H.map((h, i) => [h, i]));
const DATA_URL = 'https://chrisjangdaejang-ux.github.io/jangdaejang-timing/data/';
const SITE_URL = WEB_ROOT + 'switch/';
const MAX_ALERTS_PER_EMAIL = 5;

function alertSheet() {
  const ss = book();
  let sh = ss.getSheetByName(SH_AL);
  if (!sh) {
    sh = ss.insertSheet(SH_AL);
    sh.getRange(1, 1, 1, AL_H.length).setValues([AL_H]).setFontWeight('bold').setBackground('#2F6BFF').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  if (sh.getRange(1, AL_H.length).getValue() !== AL_H[AL_H.length - 1])     // 예전 시트면 새 열 제목 채움
    sh.getRange(1, 1, 1, AL_H.length).setValues([AL_H]).setFontWeight('bold').setBackground('#2F6BFF').setFontColor('#FFFFFF');
  return sh;
}

/* 최초 1회 실행: '알림' 시트 + 매일 점검 트리거 */
function setupAlerts() {
  alertSheet();
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'checkAlerts').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('checkAlerts').timeBased().everyDays(1).atHour(10).inTimezone('Asia/Seoul').create();
}

function eok(man) {
  man = Math.round(man);
  const sign = man < 0 ? '-' : '';
  man = Math.abs(man);
  const e = Math.floor(man / 10000), r = man % 10000;
  return sign + (e ? e + '억' + (r ? ' ' + r.toLocaleString() + '만' : '') : r.toLocaleString() + '만') + '원';
}

function alertSub(b) {
  const email = str(b.email, 80).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('이메일 주소를 확인해 주세요.');
  if (!b.agree) throw new Error('개인정보 수집·이용 동의가 필요합니다.');
  const m = b.mine || {}, t = b.target || {};
  const okUnit = u => u && /^\d{5}\|[^|]+\|[^|]+\|[^|]+$/.test(str(u.key, 160)) && str(u.sido, 20) && Number(u.area) > 0;
  if (!okUnit(m) || !okUnit(t)) throw new Error('지금 집과 갈아탈 집을 모두 골라 주세요.');
  if (m.key === t.key) throw new Error('두 집이 같습니다.');
  const cond = b.cond === 'below' ? 'below' : 'change';
  const val = Number(b.val);
  if (!(val > 0)) throw new Error('알림 조건 값을 입력해 주세요.');
  const sh = alertSheet();
  const rows = sh.getDataRange().getValues().slice(1);
  if (rows.filter(r => String(r[AC['이메일']]) === email && r[AC['상태']] === '활성').length >= MAX_ALERTS_PER_EMAIL)
    throw new Error(`한 이메일로 알림은 ${MAX_ALERTS_PER_EMAIL}개까지 받을 수 있습니다.`);
  const id = 'L' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase();
  const token = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  const base = Number(b.baseGap) || 0;
  const row = [];
  row[AC['id']] = id; row[AC['이메일']] = email;
  row[AC['지금집']] = str(m.name, 80); row[AC['지금집키']] = str(m.key, 160); row[AC['지금집시도']] = str(m.sido, 20); row[AC['지금집면적']] = Number(m.area);
  row[AC['갈아탈집']] = str(t.name, 80); row[AC['갈아탈집키']] = str(t.key, 160); row[AC['갈아탈집시도']] = str(t.sido, 20); row[AC['갈아탈집면적']] = Number(t.area);
  row[AC['조건']] = cond; row[AC['조건값']] = val; row[AC['기준갭']] = base; row[AC['최근갭']] = base;
  row[AC['등록일']] = new Date(); row[AC['최근점검']] = ''; row[AC['최근알림']] = ''; row[AC['상태']] = '활성'; row[AC['토큰']] = token;
  row[AC['마케팅동의']] = b.marketing ? 'Y' : 'N'; row[AC['마케팅동의일']] = b.marketing ? new Date() : '';
  sh.appendRow(row);
  const condTxt = cond === 'below' ? `갭이 ${eok(val)} 이하로 좁혀지면` : `갭이 지금보다 ${val}% 이상 줄거나 늘면`;
  try {
    MailApp.sendEmail({
      to: email, name: SITE_NAME + ' 갈아타기 알림',
      subject: '[장대장] 갈아타기 갭 알림이 등록되었습니다',
      htmlBody: mailHtml('갭 알림 등록 완료',
        `<p><b>${str(m.name, 80)}</b> → <b>${str(t.name, 80)}</b></p>
         <p>지금 갭 <b>${eok(base)}</b> · 조건: ${condTxt} 메일을 보내 드립니다.</p>
         <p style="color:#4E5968;font-size:13px">국토교통부 실거래가(최근 3개월 중앙값)로 매일 오전 다시 계산합니다.</p>`, id, token)
    });
  } catch (x) {}
  return { ok: true, id: id };
}

function unsubscribe(p) {
  const sh = alertSheet();
  const vals = sh.getDataRange().getValues();
  let done = false;
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][AC['id']]) === String(p.id) && String(vals[i][AC['토큰']]) === String(p.t)) {
      sh.getRange(i + 1, AC['상태'] + 1).setValue('해지'); done = true;
    }
  }
  return HtmlService.createHtmlOutput(`<div style="font-family:sans-serif;padding:40px;text-align:center">
    <h2>${done ? '알림이 해지되었습니다' : '알림을 찾지 못했습니다'}</h2>
    <p><a href="${SITE_URL}">${SITE_NAME} 갈아타기 계산기로 가기</a></p></div>`);
}

function mailHtml(title, body, id, token) {
  const unsub = ScriptApp.getService().getUrl() + `?action=unsub&id=${id}&t=${token}`;
  return `<div style="font-family:'Noto Sans KR',sans-serif;max-width:560px;margin:auto;background:#FFFFFF;border:1px solid #E5E8EB;border-radius:12px;overflow:hidden">
    <div style="background:#2F6BFF;color:#FFFFFF;padding:14px 18px;font-weight:900"><span style="color:#F3E3B0">★</span> 집코드 <span style="color:#FBF8EF">갈아타기 알림</span></div>
    <div style="padding:20px 22px;color:#191F28"><h2 style="margin:0 0 10px">${title}</h2>${body}
      <p style="margin-top:18px"><a href="${SITE_URL}" style="background:#2F6BFF;color:#FFFFFF;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:900">갈아타기 계산기에서 다시 계산하기</a></p>
      <p style="font-size:11px;color:#4E5968;margin-top:20px;border-top:1px solid #EFE6CC;padding-top:10px">추정 시세는 같은 단지·평형대 최근 3개월 실거래 중앙값이며 호가와 다를 수 있습니다. 매수·매도 권유가 아닙니다.<br>
      <a href="${unsub}" style="color:#4E5968">알림 해지</a></p></div></div>`;
}

/* 매일 실행: 실거래 데이터로 갭 재계산 → 조건 만족 시 메일 */
function checkAlerts() {
  const sh = alertSheet();
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return;
  const ix = JSON.parse(UrlFetchApp.fetch(DATA_URL + 'index.json').getContentText());
  const sidoId = {}; ix.sido.forEach(x => sidoId[x.name] = x.id);
  const cache = {};
  const unitMap = sido => {
    if (cache[sido]) return cache[sido];
    const id = sidoId[sido]; const map = {};
    if (id) {
      const j = JSON.parse(UrlFetchApp.fetch(DATA_URL + id + '.json').getContentText());
      j.units.forEach(u => { map[[u[0], u[1], u[2], u[3]].join('|')] = u; });
    }
    return cache[sido] = map;
  };
  const priceOf = (sido, key, area) => {
    const u = unitMap(sido)[key]; if (!u) return null;
    const s = u[6]; let ppy = 0;
    for (let i = s.length - 1; i >= Math.max(0, s.length - 3); i--) if (s[i] > 0) { ppy = s[i]; break; }
    return ppy ? Math.round(ppy * (Number(area) || u[4]) / 3.3058) : null;
  };
  const now = new Date();
  let sent = 0;
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    if (r[AC['상태']] !== '활성') continue;
    const pm = priceOf(r[AC['지금집시도']], r[AC['지금집키']], r[AC['지금집면적']]);
    const pt = priceOf(r[AC['갈아탈집시도']], r[AC['갈아탈집키']], r[AC['갈아탈집면적']]);
    sh.getRange(i + 1, AC['최근점검'] + 1).setValue(now);
    if (pm == null || pt == null) continue;
    const gap = pt - pm, base = Number(r[AC['기준갭']]) || gap, prev = Number(r[AC['최근갭']]);
    const val = Number(r[AC['조건값']]);
    let hit = false, why = '';
    if (r[AC['조건']] === 'below') {
      hit = gap <= val && !(prev <= val);          // 조건선을 새로 넘을 때 한 번
      why = `갭이 설정하신 ${eok(val)} 이하로 좁혀졌습니다.`;
    } else {
      const pct = base ? (gap - base) / Math.abs(base) * 100 : 0;
      hit = Math.abs(pct) >= val;
      why = `갭이 기준(${eok(base)}) 대비 ${pct > 0 ? '+' : ''}${pct.toFixed(1)}% ${pct < 0 ? '좁혀졌습니다' : '벌어졌습니다'}.`;
    }
    if (hit && (sent >= 80 || MailApp.getRemainingDailyQuota() < 5)) continue;   // 한도 초과분은 최근갭을 그대로 둬서 내일 다시 보냄
    sh.getRange(i + 1, AC['최근갭'] + 1).setValue(gap);
    if (!hit) continue;
    try {
      MailApp.sendEmail({
        to: r[AC['이메일']], name: SITE_NAME + ' 갈아타기 알림',
        subject: `[장대장] ${r[AC['지금집']]} → ${r[AC['갈아탈집']]} 갭 ${eok(gap)}`,
        htmlBody: mailHtml(why,
          `<table style="width:100%;border-collapse:collapse;font-size:15px">
            <tr><td style="padding:6px 0">지금 집 · ${r[AC['지금집']]}</td><td style="text-align:right"><b>${eok(pm)}</b></td></tr>
            <tr><td style="padding:6px 0">갈아탈 집 · ${r[AC['갈아탈집']]}</td><td style="text-align:right"><b>${eok(pt)}</b></td></tr>
            <tr><td style="padding:8px 0;border-top:1px solid #DCCFA8"><b>가격 차이(갭)</b></td><td style="text-align:right;border-top:1px solid #DCCFA8;color:#A23B2A"><b>${eok(gap)}</b></td></tr>
            <tr><td style="color:#4E5968;font-size:13px">등록할 때 갭</td><td style="text-align:right;color:#4E5968;font-size:13px">${eok(base)}</td></tr>
          </table>`, r[AC['id']], r[AC['토큰']])
      });
      sent++;
      sh.getRange(i + 1, AC['최근알림'] + 1).setValue(now);
      if (r[AC['조건']] === 'change') sh.getRange(i + 1, AC['기준갭'] + 1).setValue(gap);   // 다음 알림은 지금 갭 기준
    } catch (x) {}
  }
}


/* ================= 상담 리뷰 =================
   · 우리 사이트에서 그 중개사에게 [전화하기]·[카카오톡 문의]를 누른 기록(로그 시트, 같은 방문자 id)이 있고
     12시간이 지난 방문자만 리뷰를 남길 수 있다 — 상담하지 않은 사람의 리뷰·자작 리뷰를 막는 장치
   · 중개사 1명당 방문자 1명은 리뷰 1개(수정은 새로 쓰면 덮어씀)
   · 별점과 상관없이 모든 리뷰를 공개. 욕설·개인정보·허위 비방은 신고를 받아 시트 '공개' 칸을 FALSE로 바꿔 숨김
   · 순서 점수: 리뷰 수를 반영한 보정 별점(리뷰가 적으면 전체 평균 쪽으로 당김) + 답글 응답률 가산 */
const SH_R = '리뷰';
const RH = ['시각', 'id', '중개사id', '방문자', '별점', '태그', '내용', '공개', '신고', '답글', '답글시각'];
const RTAGS = ['친절해요', '설명이 자세해요', '연락이 빨라요', '전문적이에요', '부담 없이 상담해요'];
const RC = Object.fromEntries(RH.map((h, i) => [h, i]));
function reviewSheet() {
  const ss = book();
  let sh = ss.getSheetByName(SH_R);
  if (!sh) {
    sh = ss.insertSheet(SH_R);
    sh.getRange(1, 1, 1, RH.length).setValues([RH]).setFontWeight('bold').setBackground('#2F6BFF').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}
function reviews() {
  const v = reviewSheet().getDataRange().getValues(), out = [];
  for (let i = 1; i < v.length; i++) {
    const r = v[i]; if (!r[RC['id']]) continue;
    out.push({ row: i + 1, at: r[RC['시각']], id: String(r[RC['id']]), a: String(r[RC['중개사id']]), vid: String(r[RC['방문자']]),
      s: Number(r[RC['별점']]) || 0, tags: parseJ(r[RC['태그']], []), text: String(r[RC['내용']] || ''),
      show: r[RC['공개']] !== false, flags: Number(r[RC['신고']]) || 0, reply: String(r[RC['답글']] || '') });
  }
  return out;
}
function reviewStats() {
  const cache = CacheService.getScriptCache(), hit = cache.get('rstats');
  if (hit) return JSON.parse(hit);
  const all = reviews().filter(r => r.show), by = {};
  const M = all.length ? all.reduce((t, r) => t + r.s, 0) / all.length : 4.3, C = 5;   // 전체 평균, 보정 강도
  all.forEach(r => { (by[r.a] = by[r.a] || []).push(r); });
  const res = {};
  Object.keys(by).forEach(a => {
    const L = by[a], n = L.length, sum = L.reduce((t, r) => t + r.s, 0), rep = L.filter(r => r.reply).length;
    const rr = n ? rep / n : 0;
    res[a] = { n: n, avg: Math.round(sum / n * 10) / 10, sc: Math.round(((C * M + sum) / (C + n) + (n >= 3 && rr >= .8 ? .1 : 0)) * 100) / 100,
      rr: Math.round(rr * 100), good: n >= 3 && rr >= .8 };
  });
  cache.put('rstats', JSON.stringify(res), 300);
  return res;
}
function reviewsPublic(a) {
  a = str(a, 10); if (!ID_RE.test(a)) return { ok: false, err: 'bad id' };
  const L = reviews().filter(r => r.a === a && r.show).reverse().slice(0, 20)
    .map(r => ({ id: r.id, at: ymd(r.at), s: r.s, tags: r.tags, text: r.text, reply: r.reply }));
  return { ok: true, reviews: L, rv: reviewStats()[a] || null, tags: RTAGS };
}
function contacted(a, vid) {
  const sh = book().getSheetByName(SH_L), last = sh.getLastRow();
  if (last < 2) return false;
  const from = Math.max(2, last - 30000), v = sh.getRange(from, 1, last - from + 1, 6).getValues();
  const limit = new Date(Date.now() - 12 * 3600 * 1000);
  return v.some(r => (r[1] === 'call' || r[1] === 'kakao') && String(r[2]) === a && String(r[5]) === vid && r[0] instanceof Date && r[0] <= limit);
}
function addReview(b) {
  const a = str(b.a, 10), vid = str(b.vid, 40), s = Math.round(Number(b.s));
  if (!ID_RE.test(a) || vid.length < 8) throw new Error('잘못된 요청입니다.');
  if (!(s >= 1 && s <= 5)) throw new Error('별점을 골라 주세요.');
  const tags = (b.tags || []).filter(t => RTAGS.indexOf(t) >= 0).slice(0, 5);
  const text = str(b.text, 300).replace(/\d{2,3}-?\d{3,4}-?\d{4}/g, '***');   // 전화번호 같은 개인정보는 가림
  if (!contacted(a, vid)) throw new Error('이 공인중개사에게 ' + SITE_NAME + ' 리포트에서 전화·카카오톡으로 문의한 뒤 12시간이 지나야 리뷰를 남길 수 있어요.');
  const sh = reviewSheet(), prev = reviews().find(r => r.a === a && r.vid === vid);
  const row = [new Date(), prev ? prev.id : 'R' + Utilities.getUuid().replace(/-/g, '').slice(0, 7).toUpperCase(), a, vid, s, JSON.stringify(tags), text, true, prev ? prev.flags : 0, prev ? prev.reply : '', ''];
  if (prev) sh.getRange(prev.row, 1, 1, RH.length).setValues([row]); else sh.appendRow(row);
  CacheService.getScriptCache().removeAll(['rstats', 'list']);
  if (NOTIFY && s <= 2) { try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '[장대장 제휴] 낮은 별점 리뷰 확인', `중개사 ${a} · 별점 ${s}\n${text}\n${book().getUrl()}`); } catch (e) {} }
  return { ok: true, id: row[1] };
}
function flagReview(b) {
  const id = str(b.id, 10), why = str(b.why, 100);
  const r = reviews().find(x => x.id === id); if (!r) throw new Error('리뷰를 찾지 못했습니다.');
  reviewSheet().getRange(r.row, RC['신고'] + 1).setValue(r.flags + 1);
  if (NOTIFY) { try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '[장대장 제휴] 리뷰 신고', `리뷰 ${id} (중개사 ${r.a})\n사유: ${why}\n내용: ${r.text}\n숨기려면 리뷰 시트의 '공개' 칸을 FALSE로 바꾸세요.\n${book().getUrl()}`); } catch (e) {} }
  return { ok: true };
}
function replyReview(b) {
  const list = agents(), me = findMe(b, list), id = str(b.id, 10), text = str(b.text, 300);
  const r = reviews().find(x => x.id === id && x.a === me.id); if (!r) throw new Error('리뷰를 찾지 못했습니다.');
  const sh = reviewSheet();
  sh.getRange(r.row, RC['답글'] + 1, 1, 2).setValues([[text, new Date()]]);
  CacheService.getScriptCache().removeAll(['rstats', 'list']);
  return login(b);
}


/* =====================================================================
   프리미엄 리포트 결제 (토스페이먼츠 결제위젯) — v11
   흐름: 사이트 checkout 에서 createOrder(서버가 주문번호·금액 결정) → 토스 결제창 → success 페이지가
         confirmPayment(금액을 서버 가격표·주문과 대조 → 토스 승인 API) → 열람 토큰 발급
         → view 페이지가 openReport 로 확인(처음 열 때 '최초열람시각' 기록 = 환불 기준)
   · 시크릿 키: 스크립트 속성 TOSS_SECRET_KEY (코드에 쓰지 않음)
   · 연락처: 가린 값 + 확인용 해시만 저장 / 열람 토큰: 해시만 저장(다시 보기 때 새 토큰 발급)
   · 환불: 자동으로 하지 않음. 요청을 시트에 기록하고 시트 주인에게 메일 → 운영자가 토스 상점관리자에서 취소
   ===================================================================== */
const SH_O = '주문';
const OH = ['주문번호','생성시각','상품','단지키','단지명','금액','상태','연락처','연락처확인값','결제키','결제수단','승인시각',
            '열람토큰','최초열람시각','최근열람시각','열람횟수','환불상태','환불요청시각','환불사유','메모'];
const OC = Object.fromEntries(OH.map((h, i) => [h, i]));
/* 서버 기준 가격표 — 사이트에 보이는 가격과 반드시 같게. 결제 금액은 항상 이 표와 대조합니다. */
const PRICE = {
  single: { name: '단지 리포트', amount: 9900, min: 1, max: 1 },
  pack:   { name: '비교 패키지', amount: 29000, min: 2, max: 3 },
  cy:     { name: '청약 분양가 리포트', amount: 9900, min: 1, max: 1, cy: true }   // 청약 공고 1곳 — 키의 평형 자리가 'cy'+공고번호
};
const REFUND_DAYS = 7;       // 열람 전 전액 환불 가능 기간(결제일부터)
const VIEW_DAYS = 365;       // 열람 기간
const TOSS_API = 'https://api.tosspayments.com/v1/payments/';
const PAY_ACTIONS = { createOrder: 1, confirmPayment: 1, openReport: 1, refundRequest: 1, findOrder: 1 };
const ST = { wait: '결제대기', paid: '결제완료', fail: '승인실패', bad: '금액불일치', vbank: '입금대기' };

function payDispatch(b) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (b.action === 'createOrder') return createOrder(b);
    if (b.action === 'confirmPayment') return confirmPayment(b);
    if (b.action === 'openReport') return openReport(b);
    if (b.action === 'refundRequest') return refundRequest(b);
    if (b.action === 'findOrder') return findOrder(b);
    return { ok: false, err: 'unknown' };
  } catch (x) {
    return { ok: false, err: String(x.message || x) };
  } finally {
    lock.releaseLock();
  }
}

function orderSheet() {
  const ss = book();
  let sh = ss.getSheetByName(SH_O);
  if (!sh) {
    sh = ss.insertSheet(SH_O);
    sh.getRange(1, 1, 1, OH.length).setValues([OH]).setFontWeight('bold').setBackground('#2F6BFF').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}
function orderRows() {
  const v = orderSheet().getDataRange().getValues(), list = [];
  for (let i = 1; i < v.length; i++) if (v[i][OC['주문번호']]) list.push({ row: i + 1, r: v[i] });
  return list;
}
function findRow(id) {
  id = str(id, 40);
  if (!/^JDJ\d{6}-[0-9A-F]{10}$/.test(id)) return null;
  return orderRows().find(x => String(x.r[OC['주문번호']]) === id) || null;
}
function setO(row, h, v) { orderSheet().getRange(row, OC[h] + 1).setValue(v); }

/* 해시·비교 */
function hex(bytes) { return bytes.map(b => ('0' + (b & 255).toString(16)).slice(-2)).join(''); }
function salt() {
  const P = PropertiesService.getScriptProperties();
  let s = P.getProperty('ORDER_SALT');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); P.setProperty('ORDER_SALT', s); }
  return s;
}
function hashOf(s) { return 'h' + hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt() + '|' + s, Utilities.Charset.UTF_8)); }   // 앞의 h: 시트가 숫자로 바꾸지 않도록
/* 길이가 같으면 끝까지 다 비교(상수시간 흉내) */
function safeEq(a, b) {
  a = String(a == null ? '' : a); b = String(b == null ? '' : b);
  let d = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
function newToken() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }
function newOrderId() {
  return 'JDJ' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyMMdd') + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
}

/* 연락처: 휴대폰 또는 이메일 1개 */
function parseContact(c) {
  c = str(c, 100);
  const d = c.replace(/[^0-9]/g, '');
  if (/^01[016789]\d{7,8}$/.test(d) && !/@/.test(c)) return { kind: 'phone', norm: d, mask: d.slice(0, 3) + '-****-' + d.slice(-4), last4: d.slice(-4) };
  const e = c.toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    const [u, dom] = e.split('@');
    return { kind: 'email', norm: e, mask: u.slice(0, Math.min(2, u.length)) + '***@' + dom, last4: '' };
  }
  return null;
}

/* 단지 키: 사이트 단지 비교와 같은 형식 (시도id~구코드~동~단지~평형, 각 칸 URL 인코딩) */
function parseKey(k) {
  k = str(k, 300);
  const a = k.split('~');
  if (a.length !== 5) return null;
  let p;
  try { p = a.map(decodeURIComponent); } catch (e) { return null; }
  if (!/^s\d{2}$/.test(p[0]) || !/^\d{5}$/.test(p[1]) || !p[2] || !p[3] || p[3].length > 80 || !p[4] || p[4].length > 20) return null;
  return { k: k, name: p[3] + ' ' + p[4] };
}

/* ---------- 1) 주문 만들기: 서버가 주문번호와 금액을 정함 ---------- */
function createOrder(b) {
  const P = PRICE[b.product];
  if (!P) throw new Error('상품을 다시 선택해 주세요.');
  const seen = {};
  const keys = (Array.isArray(b.keys) ? b.keys : []).slice(0, 5).map(parseKey).filter(x => x && !seen[x.k] && (seen[x.k] = true));
  if (keys.some(x => /~cy\d+$/.test(x.k)) !== !!P.cy) throw new Error(P.cy ? '청약 공고를 다시 골라 주세요.' : '단지를 다시 골라 주세요.');
  if (keys.length < P.min || keys.length > P.max)
    throw new Error(P.min === P.max ? `${P.name}는 단지 ${P.min}곳을 골라 주세요.` : `${P.name}는 단지 ${P.min}~${P.max}곳을 골라 주세요.`);
  const ct = parseContact(b.contact);
  if (!ct) throw new Error('휴대폰 번호 또는 이메일을 정확히 입력해 주세요.');
  if (!b.agree) throw new Error('청약철회 제한 안내에 동의해 주세요.');
  const cache = CacheService.getScriptCache(), ck = 'co:' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMddHHmm');
  const n = Number(cache.get(ck) || 0);
  if (n >= 30) throw new Error('잠시 후 다시 시도해 주세요.');
  cache.put(ck, String(n + 1), 120);
  const id = newOrderId();
  const names = keys.map(x => x.name).join(', ');
  const row = [];
  row[OC['주문번호']] = id; row[OC['생성시각']] = new Date(); row[OC['상품']] = P.name;
  row[OC['단지키']] = JSON.stringify(keys.map(x => x.k)); row[OC['단지명']] = names.slice(0, 300);
  row[OC['금액']] = P.amount; row[OC['상태']] = ST.wait;
  row[OC['연락처']] = ct.mask; row[OC['연락처확인값']] = hashOf(ct.norm);
  ['결제키','결제수단','승인시각','열람토큰','최초열람시각','최근열람시각','환불상태','환불요청시각','환불사유','메모'].forEach(h => row[OC[h]] = '');
  row[OC['열람횟수']] = 0;
  orderSheet().appendRow(row);
  return { ok: true, orderId: id, amount: P.amount, orderName: ('장대장 ' + P.name + ' · ' + names).slice(0, 100) };
}

function productKeyOf(name) { return Object.keys(PRICE).find(k => PRICE[k].name === String(name)) || ''; }

/* 토스 API 호출 (테스트에서는 UrlFetchApp 을 바꿔 끼워 검증) */
function tossCall(path, payload, idem) {
  const secret = PropertiesService.getScriptProperties().getProperty('TOSS_SECRET_KEY');
  if (!secret) throw new Error('결제 서버 설정이 아직 끝나지 않았습니다. 운영자에게 문의해 주세요.');
  const opt = { method: payload ? 'post' : 'get', muteHttpExceptions: true,
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(secret + ':') } };
  if (payload) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(payload); }
  if (idem) opt.headers['Idempotency-Key'] = idem;
  const res = UrlFetchApp.fetch(TOSS_API + path, opt);
  let j = {}; try { j = JSON.parse(res.getContentText()); } catch (e) {}
  return { code: res.getResponseCode(), j: j };
}

/* ---------- 2) 결제 승인 ---------- */
function confirmPayment(b) {
  const paymentKey = str(b.paymentKey, 200), amount = Number(b.amount);
  if (!paymentKey || !/^[A-Za-z0-9_\-=.]+$/.test(paymentKey)) throw new Error('결제 정보가 올바르지 않습니다.');
  const o = findRow(b.orderId);
  if (!o) throw new Error('주문을 찾지 못했습니다.');
  const r = o.r, P = PRICE[productKeyOf(r[OC['상품']])];
  const status = String(r[OC['상태']]);
  /* 이미 승인된 주문: 같은 결제키면 새 열람 토큰을 다시 발급(성공 화면 새로고침 대비) */
  if (status === ST.paid) {
    if (!safeEq(r[OC['결제키']], paymentKey)) throw new Error('이미 처리된 주문입니다.');
    return paidOut(o);
  }
  if (status !== ST.wait && status !== ST.fail) throw new Error('처리할 수 없는 주문 상태입니다: ' + status);
  /* 위변조 방지: 요청 금액 = 주문 금액 = 서버 가격표 */
  if (!P || !(amount === Number(r[OC['금액']]) && amount === P.amount)) {
    setO(o.row, '상태', ST.bad); setO(o.row, '메모', `요청 금액 ${amount} / 주문 금액 ${r[OC['금액']]}`);
    throw new Error('결제 금액이 주문 금액과 달라 승인하지 않았습니다. 결제는 진행되지 않았습니다.');
  }
  let res = tossCall('confirm', { paymentKey: paymentKey, orderId: o.r[OC['주문번호']], amount: amount }, 'confirm-' + o.r[OC['주문번호']]);
  if (res.code !== 200 && res.j && res.j.code === 'ALREADY_PROCESSED_PAYMENT') res = tossCall(encodeURIComponent(paymentKey));   // 이전 승인 응답을 못 받은 경우 조회로 확인
  const j = res.j || {};
  if (res.code !== 200) {
    setO(o.row, '상태', ST.fail); setO(o.row, '메모', str(j.code + ' ' + j.message, 200));
    return { ok: false, code: str(j.code, 60), err: str(j.message, 200) || '결제 승인에 실패했습니다.' };
  }
  if (String(j.orderId) !== String(r[OC['주문번호']]) || Number(j.totalAmount) !== P.amount) {
    setO(o.row, '상태', ST.bad); setO(o.row, '메모', '승인 응답 금액/주문번호 불일치 — 토스 상점관리자에서 확인·취소 필요');
    throw new Error('결제 확인 중 문제가 생겼습니다. 운영자가 확인 후 연락드리거나 취소해 드립니다.');
  }
  setO(o.row, '결제키', paymentKey);
  setO(o.row, '결제수단', str(j.method, 30));
  if (j.status === 'WAITING_FOR_DEPOSIT') {
    setO(o.row, '상태', ST.vbank);
    return { ok: false, code: 'WAITING_FOR_DEPOSIT', err: '가상계좌 입금 확인 후 리포트를 열 수 있습니다.' };
  }
  if (j.status !== 'DONE') {
    setO(o.row, '상태', ST.fail); setO(o.row, '메모', '승인 상태 ' + str(j.status, 30));
    return { ok: false, code: str(j.status, 40), err: '결제가 완료되지 않았습니다.' };
  }
  setO(o.row, '상태', ST.paid);
  setO(o.row, '승인시각', j.approvedAt ? new Date(j.approvedAt) : new Date());
  setO(o.row, '메모', '');
  return paidOut(findRow(o.r[OC['주문번호']]));
}
function paidOut(o) {
  const t = newToken();
  setO(o.row, '열람토큰', hashOf(t));
  const r = o.r;
  return { ok: true, orderId: String(r[OC['주문번호']]), token: t, product: String(r[OC['상품']]), amount: Number(r[OC['금액']]),
    names: String(r[OC['단지명']]), paidAt: r[OC['승인시각']] instanceof Date ? ymd(r[OC['승인시각']]) : ymd(new Date()) };
}

/* 주문번호 + 토큰 검증 (실패 이유는 구분하지 않음) */
function authOrder(b) {
  const o = findRow(b.o);
  const t = str(b.t, 100);
  const ok = !!o && t.length >= 32 && safeEq(String(o.r[OC['열람토큰']]), hashOf(t));
  if (!ok) throw new Error('주문 정보를 확인할 수 없습니다. 링크를 다시 확인하시거나 [구매한 리포트 다시 보기]를 이용해 주세요.');
  if (String(o.r[OC['상태']]) !== ST.paid) throw new Error('결제가 완료된 주문이 아닙니다.');
  return o;
}
function orderState(o, now) {
  const r = o.r, paid = r[OC['승인시각']] instanceof Date ? r[OC['승인시각']] : new Date(r[OC['승인시각']]);
  const first = r[OC['최초열람시각']] instanceof Date ? r[OC['최초열람시각']] : null;
  const refund = String(r[OC['환불상태']] || '');
  const until = new Date(paid.getTime() + REFUND_DAYS * 86400000), exp = new Date(paid.getTime() + VIEW_DAYS * 86400000);
  return {
    orderId: String(r[OC['주문번호']]), product: String(r[OC['상품']]), amount: Number(r[OC['금액']]), names: String(r[OC['단지명']]),
    paidAt: ymd(paid), viewed: !!first, firstViewAt: first ? Utilities.formatDate(first, 'Asia/Seoul', 'yyyy-MM-dd HH:mm') : '',
    refund: refund, refundUntil: ymd(until), refundable: !first && !refund && now <= until,
    expires: ymd(exp), expired: now > exp
  };
}

/* ---------- 3) 리포트 열람 / 상태 확인 ----------
   open:false → 상태만(열람 기록 안 함) / open:true → 최초 열람 시각 기록 후 단지 키 반환 */
function openReport(b) {
  const o = authOrder(b), now = new Date(), s = orderState(o, now);
  if (!b.open) return { ok: true, order: s };
  if (s.refund) throw new Error('환불 요청이 접수된 주문이라 열람할 수 없습니다. 요청을 취소하시려면 고객문의로 연락해 주세요.');
  if (s.expired) throw new Error('열람 기간(결제일부터 1년)이 지났습니다.');
  if (!s.viewed) setO(o.row, '최초열람시각', now);
  setO(o.row, '최근열람시각', now);
  setO(o.row, '열람횟수', (Number(o.r[OC['열람횟수']]) || 0) + 1);
  const s2 = orderState(findRow(s.orderId), now);
  return { ok: true, order: s2, keys: parseJ(o.r[OC['단지키']], []) };
}

/* ---------- 4) 환불 요청 (기록 + 운영자 메일, 자동 환불 없음) ---------- */
function refundRequest(b) {
  const o = authOrder(b), now = new Date(), s = orderState(o, now);
  if (s.refund) return { ok: true, order: s, already: true };
  const reason = str(b.reason, 300);
  const label = s.refundable ? '요청(열람 전·7일 이내 — 전액 환불 대상)' : '요청(검토 필요 — 열람 후 또는 7일 경과)';
  setO(o.row, '환불상태', label);
  setO(o.row, '환불요청시각', now);
  setO(o.row, '환불사유', reason);
  try {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[장대장 결제] 환불 요청 ${s.orderId}`,
      `주문번호 ${s.orderId}\n상품 ${s.product} · ${s.amount.toLocaleString()}원 · 결제일 ${s.paidAt}\n단지 ${s.names}\n`
      + `열람 여부: ${s.viewed ? '열람함(' + s.firstViewAt + ')' : '열람 전'}\n구분: ${label}\n사유: ${reason || '(없음)'}\n\n`
      + `처리 방법: 토스페이먼츠 상점관리자 → 결제 내역에서 주문번호로 찾아 결제 취소 → '주문' 시트의 환불상태를 '환불완료'로 바꿔 주세요.\n`
      + `(영업일 3일 이내 처리 약속)\n${book().getUrl()}`);
  } catch (e) {}
  return { ok: true, order: orderState(findRow(s.orderId), now) };
}

/* ---------- 5) 다시 보기: 주문번호 + 휴대폰 뒤 4자리(또는 이메일) → 새 열람 토큰 ---------- */
function findOrder(b) {
  const id = str(b.o, 40).toUpperCase(), c = str(b.c, 100);
  const cache = CacheService.getScriptCache(), ck = 'fo:' + id;
  const tries = Number(cache.get(ck) || 0);
  if (tries >= 5) throw new Error('확인 시도가 많아 1시간 뒤에 다시 시도해 주세요.');
  const o = findRow(id);
  let ok = false;
  if (o && String(o.r[OC['상태']]) === ST.paid) {
    const mask = String(o.r[OC['연락처']]), d = c.replace(/[^0-9]/g, '');
    if (/^\d{4}$/.test(d) && !/@/.test(c)) ok = /^\d{3}-\*{4}-\d{4}$/.test(mask) && safeEq(mask.slice(-4), d);
    else { const ct = parseContact(c); ok = !!ct && safeEq(String(o.r[OC['연락처확인값']]), hashOf(ct.norm)); }
  }
  if (!ok) {
    cache.put(ck, String(tries + 1), 3600);
    throw new Error('주문번호 또는 연락처가 맞지 않습니다.');
  }
  cache.remove(ck);
  const t = newToken();
  setO(o.row, '열람토큰', hashOf(t));
  return { ok: true, orderId: id, token: t };
}


/* =====================================================================
   분양 광고 (시행사·분양대행사) — v12
   흐름: 사이트 bunyang/apply/ 에서 adApply → '분양광고' 시트에 [승인 대기]로 저장 + 시트 주인에게 메일
         → 운영자가 입주자모집공고·사업자 확인 후 [승인] 체크, [시작일]·[종료일] 입력
         → 사이트(assets/ads.js)가 adList 로 승인·기간 내 광고만 받아 '광고' 표시와 함께 노출
   · 공개 목록에는 회사명·단지·지역·유형·세대수·분양가 범위·공고 정보·URL·이미지·노출 위치·기간만 (연락처·사업자번호·담당자 제외)
   ===================================================================== */
const SH_AD = '분양광고';
const ADH = ['id','신청일','회사명','사업자등록번호','담당자','연락처','단지명','시도','시군구','유형','세대수',
             '분양가최저(만원)','분양가최고(만원)','모집공고승인','모집공고일','공고문URL','노출위치','희망시작일','희망종료일',
             '대표이미지URL','동의','승인','시작일','종료일','메모',
             /* v16 — 오른쪽에 덧붙임(기존 열 위치 유지) */
             '상품','사업주체','시공사','분양대행사','청약홈공고번호','분양신고번호','분양신고일','분양보증신탁','분양가VAT',
             '추가노출구','상담받을이메일','창립광고주','판매파트너모집','좌표','노출반경km'];
const ADC = Object.fromEntries(ADH.map((h, i) => [h, i]));
const AD_SIDO = ['서울특별시','부산광역시','대구광역시','인천광역시','전남광주통합특별시','대전광역시','울산광역시','세종특별자치시','경기도',
                 '강원특별자치도','충청북도','충청남도','전북특별자치도','경상북도','경상남도','제주특별자치도'];
const AD_KIND = ['아파트','오피스텔','도시형생활주택','민간임대','무순위·잔여세대','기타'];
const AD_POS = { bunyang: '분양', buy: '내집마련', switch: '갈아타기', villa: '재개발·빌라', chungyak: '청약', tax: '세금' };
/* v16 분양 광고 상품 — 화면 위치는 assets/ads.js, 가격은 ad/index.html PRICES */
const AD_PROD = { top: '목록 상단 카드·추천 현장', pin: '지도 프리미엄 마커', alert: '관심 지역 알림', lead: '분양 상담 연결', report: '현장 수요 리포트' };
const AD_HOUSING = ['아파트', '도시형생활주택', '민간임대', '무순위·잔여세대'];   // 주택법·주택공급에 관한 규칙: 입주자모집공고 승인 뒤에만 노출
const AD_VAT = ['포함', '별도', '해당 없음'];
const AD_LEAD_KEEP_DAYS = 183;   // 상담 신청 정보: 광고주 전달 후 6개월 보관 뒤 파기(개인정보처리방침과 같음)
const AD_MAX_DAYS = 366;      // 한 번에 신청할 수 있는 최대 노출 기간(일)
const AD_DAILY = 30;          // 하루 전체 신청 상한(스팸 방지)

function adDispatch(b) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    if (b.action === 'adApply') return adApply(b);
    if (b.action === 'adInquiry') return adInquiry(b);
    if (b.action === 'adLead') return adLead(b);
    return { ok: false, err: 'unknown' };
  } catch (x) {
    return { ok: false, err: String(x.message || x) };
  } finally {
    lock.releaseLock();
  }
}
function adSheet() {
  const ss = book();
  let sh = ss.getSheetByName(SH_AD);
  if (!sh) {
    sh = ss.insertSheet(SH_AD);
    sh.getRange(1, 1, 1, ADH.length).setValues([ADH]).setFontWeight('bold').setBackground('#2F6BFF').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    sh.getRange(2, ADC['시작일'] + 1, 999, 2).setNumberFormat('yyyy-mm-dd');
  } else {
    const head = sh.getRange(1, 1, 1, ADH.length).getValues()[0];        // v15 이전 시트: 오른쪽 새 열 제목만 채움
    if (String(head[ADH.length - 1] || '') !== ADH[ADH.length - 1]) sh.getRange(1, 1, 1, ADH.length).setValues([ADH]).setFontWeight('bold').setBackground('#2F6BFF').setFontColor('#FFFFFF');
  }
  return sh;
}
const adMail = v => { const x = String(v == null ? '' : v).trim().toLowerCase(); return /^[a-z0-9._%+-]{1,64}@[a-z0-9.-]+\.[a-z]{2,}$/.test(x) && x.length <= 80 ? x : ''; };
/* 글자 정리: 제어문자·꺾쇠 제거, 길이 제한, 셀 수식으로 읽힐 수 있는 시작 문자(= + - @) 거절 */
function adText(v, max, label, need) {
  let x = String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F<>]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!x) { if (need) throw new Error(label + '을(를) 입력해 주세요.'); return ''; }
  if (x.length > max) throw new Error(`${label}은(는) ${max}자 이내로 입력해 주세요.`);
  if (/^[=+\-@\t\r]/.test(x)) throw new Error(`${label}은(는) = + - @ 기호로 시작할 수 없습니다.`);
  return x;
}
function adUrl(v, label, need) {
  const x = String(v == null ? '' : v).trim();
  if (!x) { if (need) throw new Error(label + '을(를) 입력해 주세요.'); return ''; }
  if (x.length > 300 || !/^https:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(:\d{2,5})?(\/[^\s"'<>\\`]*)?$/.test(x)) throw new Error(label + '은(는) https:// 로 시작하는 올바른 주소만 입력할 수 있습니다.');
  return x;
}
function adDate(v, label, need) {
  const x = String(v == null ? '' : v).trim();
  if (!x) { if (need) throw new Error(label + '을(를) 입력해 주세요.'); return ''; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) throw new Error(label + ' 형식이 올바르지 않습니다(예: 2026-12-01).');
  const d = new Date(x + 'T00:00:00');
  if (isNaN(d.getTime()) || ymd(d) !== x) throw new Error(label + '이(가) 올바른 날짜가 아닙니다.');
  return x;
}
function adInt(v, label, lo, hi, need) {
  const s = String(v == null ? '' : v).replace(/,/g, '').trim();
  if (!s) { if (need) throw new Error(label + '을(를) 입력해 주세요.'); return ''; }
  if (!/^\d{1,9}$/.test(s) || +s < lo || +s > hi) throw new Error(`${label}은(는) ${lo.toLocaleString()}~${hi.toLocaleString()} 사이 숫자로 입력해 주세요.`);
  return +s;
}
/* 사업자등록번호 10자리 검증(국세청 검증식) */
function bizOk(v) {
  const d = String(v || '').replace(/[^0-9]/g, '');
  if (d.length !== 10) return '';
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * w[i];
  s += Math.floor(+d[8] * 5 / 10);
  return (10 - s % 10) % 10 === +d[9] ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : '';
}
function adPhone(v) {
  const d = String(v || '').replace(/[^0-9]/g, '');
  if (!/^(01[016789]\d{7,8}|0[2-6]\d{7,9}|1[5-9]\d{6})$/.test(d)) throw new Error('담당자 연락처(휴대폰 또는 회사 전화번호)를 확인해 주세요.');
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  if (d.startsWith('02')) return `02-${d.slice(2, -4)}-${d.slice(-4)}`;
  return `${d.slice(0, 3)}-${d.slice(3, -4)}-${d.slice(-4)}`;
}
function adApply(b) {
  const cache = CacheService.getScriptCache(), dk = 'adday:' + ymd(new Date());
  const n = Number(cache.get(dk) || 0);
  if (n >= AD_DAILY) throw new Error('오늘 신청이 많아 내일 다시 신청해 주세요.');
  if (String(b.hp || '')) throw new Error('신청을 처리하지 못했습니다.');            // 자동 입력 방지용 숨은 칸
  const company = adText(b.company, 60, '회사명', true);
  const biz = bizOk(b.biz);
  if (!biz) throw new Error('사업자등록번호 10자리를 확인해 주세요.');
  const manager = adText(b.manager, 30, '담당자 이름', true);
  const phone = adPhone(b.phone);
  const danji = adText(b.danji, 60, '단지명', true);
  const sido = String(b.sido || '');
  if (AD_SIDO.indexOf(sido) < 0) throw new Error('시·도를 선택해 주세요.');
  const sgg = adText(b.sgg, 30, '시·군·구', true);
  if (!/^[가-힣0-9 ]{1,30}$/.test(sgg)) throw new Error('시·군·구는 한글로 입력해 주세요(예: 강동구).');
  const kind = String(b.kind || '');
  if (AD_KIND.indexOf(kind) < 0) throw new Error('주택 유형을 선택해 주세요.');
  const hh = adInt(b.hh, '세대수', 1, 100000, true);
  const pmin = adInt(b.pmin, '분양가 최저(만원)', 100, 10000000, false), pmax = adInt(b.pmax, '분양가 최고(만원)', 100, 10000000, false);
  if (pmin !== '' && pmax !== '' && pmin > pmax) throw new Error('분양가 최저가 최고보다 클 수 없습니다.');
  const approved = b.approved === true || b.approved === 'y';
  const pdate = adDate(b.pdate, '입주자모집공고일', approved);
  const url = adUrl(b.url, '공고문·홈페이지 주소', true);
  const img = adUrl(b.img, '대표 이미지 주소', false);
  const pos = (Array.isArray(b.pos) ? b.pos : []).map(String).filter((p, i, a) => AD_POS[p] && a.indexOf(p) === i);
  if (!pos.length) throw new Error('희망 노출 위치를 하나 이상 골라 주세요.');
  const start = adDate(b.start, '희망 시작일', true), end = adDate(b.end, '희망 종료일', true);
  const t0 = ymd(new Date());
  if (start < t0) throw new Error('희망 시작일은 오늘 이후로 골라 주세요.');
  if (end < start) throw new Error('희망 종료일은 시작일 이후로 골라 주세요.');
  if ((new Date(end + 'T00:00:00') - new Date(start + 'T00:00:00')) / 86400000 > AD_MAX_DAYS) throw new Error('노출 기간은 한 번에 1년까지 신청할 수 있습니다.');
  const ag = b.agree || {};
  if (!(ag.label === true && ag.score === true && ag.stop === true)) throw new Error('필수 동의 3가지에 모두 동의해 주세요.');
  /* v16: 상품·필수 표기 */
  const prod = (Array.isArray(b.prod) ? b.prod : ['top']).map(String).filter((p, i, a) => AD_PROD[p] && a.indexOf(p) === i);
  if (!prod.length) throw new Error('광고 상품을 하나 이상 골라 주세요.');
  const housing = AD_HOUSING.indexOf(kind) >= 0;
  const dev = adText(b.dev, 60, '사업주체(시행사)', true);
  const bld = adText(b.bld, 80, '시공사', housing);
  const agc = adText(b.agc, 60, '분양대행사', false);
  const no = String(b.no == null ? '' : b.no).replace(/[^0-9]/g, '');
  if (no && !/^\d{10}$/.test(no)) throw new Error('청약홈 공고번호는 숫자 10자리예요(예: 2026000373).');
  let dn = '', dd = '', gt = '', vat = '';
  if (!housing) {
    const na = b.dnNa === true;
    dn = na ? '신고 대상 아님' : adText(b.dn, 40, '분양신고번호', true);
    dd = na ? '' : adDate(b.dd, '분양신고일', true);
    gt = adText(b.gt, 60, '분양보증기관 또는 신탁회사', !na);
    vat = String(b.vat || '');
    if (AD_VAT.indexOf(vat) < 0) throw new Error('분양가 부가가치세 포함 여부를 골라 주세요.');
  }
  const gx = (Array.isArray(b.gx) ? b.gx : []).map(x => adText(x, 30, '추가 노출 구', false)).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i && x !== sgg);
  if (gx.length > 2 || gx.some(x => !/^[가-힣0-9 ]{1,30}$/.test(x))) throw new Error('추가 노출 시·군·구는 한글로 2곳까지 입력해 주세요.');
  const leadMail = adMail(b.leadMail);
  if (prod.indexOf('lead') >= 0 && !leadMail) throw new Error('분양 상담 연결을 고르면 상담 신청을 받을 이메일을 입력해 주세요.');
  if (ag.legal !== true) throw new Error('연결 페이지의 법정 표기사항 게시에 동의해 주세요.');
  if (prod.indexOf('lead') >= 0 && ag.lead !== true) throw new Error('상담 신청자 정보 처리 기준에 동의해 주세요.');
  const sh = adSheet();
  const dup = sh.getDataRange().getValues().slice(1).some(r => String(r[ADC['사업자등록번호']]) === biz && String(r[ADC['단지명']]) === danji && r[ADC['승인']] !== true);
  if (dup) throw new Error('같은 단지로 승인 대기 중인 신청이 있습니다. 확인 후 연락드릴게요.');
  const id = 'AD' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  const row = [];
  row[ADC['id']] = id; row[ADC['신청일']] = new Date(); row[ADC['회사명']] = company; row[ADC['사업자등록번호']] = biz;
  row[ADC['담당자']] = manager; row[ADC['연락처']] = phone; row[ADC['단지명']] = danji; row[ADC['시도']] = sido; row[ADC['시군구']] = sgg;
  row[ADC['유형']] = kind; row[ADC['세대수']] = hh; row[ADC['분양가최저(만원)']] = pmin; row[ADC['분양가최고(만원)']] = pmax;
  row[ADC['모집공고승인']] = approved ? '승인' : '승인 전'; row[ADC['모집공고일']] = pdate; row[ADC['공고문URL']] = url;
  row[ADC['노출위치']] = pos.map(p => AD_POS[p]).join(','); row[ADC['희망시작일']] = start; row[ADC['희망종료일']] = end;
  row[ADC['대표이미지URL']] = img; row[ADC['동의']] = '광고 표시·점수 무관·허위과장 시 중단 동의 ' + t0;
  row[ADC['승인']] = false; row[ADC['시작일']] = ''; row[ADC['종료일']] = ''; row[ADC['메모']] = '';
  row[ADC['상품']] = prod.map(p => AD_PROD[p]).join(','); row[ADC['사업주체']] = dev; row[ADC['시공사']] = bld; row[ADC['분양대행사']] = agc;
  row[ADC['청약홈공고번호']] = no ? "'" + no : ''; row[ADC['분양신고번호']] = dn; row[ADC['분양신고일']] = dd; row[ADC['분양보증신탁']] = gt; row[ADC['분양가VAT']] = vat;
  row[ADC['추가노출구']] = gx.join(','); row[ADC['상담받을이메일']] = leadMail; row[ADC['창립광고주']] = b.founding === true ? '신청' : '';
  row[ADC['판매파트너모집']] = b.partner === true ? '희망' : ''; row[ADC['좌표']] = ''; row[ADC['노출반경km']] = '';
  row[ADC['동의']] += ' · 법정 표기 게시' + (prod.indexOf('lead') >= 0 ? ' · 상담 정보 목적 외 사용 금지·6개월 파기' : '');
  sh.appendRow(ADH.map((h, i) => row[i] === undefined ? '' : row[i]));
  sh.getRange(sh.getLastRow(), ADC['승인'] + 1).insertCheckboxes();
  cache.put(dk, String(n + 1), 86400);
  if (NOTIFY) {
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[장대장 분양광고] 새 신청: ${danji}`,
        `${company} (${biz}) · 담당 ${manager} ${phone}\n단지 ${danji} · ${sido} ${sgg} · ${kind} · ${hh}세대\n`
        + `모집공고 ${approved ? '승인 ' + pdate : '승인 전'} · ${url}\n노출 ${row[ADC['노출위치']]} · ${start}~${end}\n상품 ${row[ADC['상품']]}${b.founding === true ? ' · 창립 광고주 신청' : ''}\n`
        + `지도 마커를 고른 경우 [좌표]에 위도,경도(예: 37.5512,127.1468)를 넣으세요(청약홈 공고번호가 있으면 자동 위치를 씀).\n`
        + `확인: 사업자 상태(국세청 홈택스)·입주자모집공고(청약홈) 내용과 광고 내용이 일치하는지 확인 후 [승인] 체크, [시작일]·[종료일]을 입력하세요.\n${book().getUrl()}`);
    } catch (e) {}
  }
  return { ok: true, id: id };
}
function adDay(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : ymd(v);
  const s = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}
/* 공개 목록: 승인 + 시작일≤오늘≤종료일, 공개 필드만 (연락처·사업자등록번호·담당자 제외) */
function adList() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('adlist');
  if (hit) return JSON.parse(hit);
  const sh = book().getSheetByName(SH_AD);
  const t0 = ymd(new Date()), ads = [];
  const back = Object.fromEntries(Object.entries(AD_POS).map(([k, v]) => [v, k]));
  if (sh) {
    const v = sh.getDataRange().getValues();
    for (let i = 1; i < v.length; i++) {
      const r = v[i];
      if (!r[ADC['id']] || r[ADC['승인']] !== true) continue;
      const s0 = adDay(r[ADC['시작일']]), e0 = adDay(r[ADC['종료일']]);
      if (!s0 || !e0 || s0 > t0 || e0 < t0) continue;
      const safeUrl = u => /^https:\/\/[^\s"'<>\\`]+$/.test(String(u || '')) ? String(u) : '';
      const u = safeUrl(r[ADC['공고문URL']]);
      if (!u) continue;
      const kind = String(r[ADC['유형']]);
      if (AD_HOUSING.indexOf(kind) >= 0 && String(r[ADC['모집공고승인']]) !== '승인') continue;          // 주택: 입주자모집공고 승인 전에는 노출 안 함
      if (AD_HOUSING.indexOf(kind) < 0 && ADC['분양신고번호'] < r.length && !String(r[ADC['분양신고번호']] || '')) continue;   // 오피스텔·기타: 분양신고(또는 대상 아님) 확인 뒤
      const back2 = Object.fromEntries(Object.entries(AD_PROD).map(([k, v]) => [v, k]));
      const prod = String(r[ADC['상품']] || '').split(',').map(x => back2[x.trim()]).filter(Boolean);
      const ll = String(r[ADC['좌표']] || '').split(',').map(Number);
      const xy = ll.length === 2 && ll[0] > 32 && ll[0] < 39.5 && ll[1] > 124 && ll[1] < 132 ? [ll[1], ll[0]] : null;
      const s1 = v => String(v == null ? '' : v).replace(/^'/, '');
      ads.push({
        id: String(r[ADC['id']]), co: String(r[ADC['회사명']]), n: String(r[ADC['단지명']]), sd: String(r[ADC['시도']]), sg: String(r[ADC['시군구']]),
        k: String(r[ADC['유형']]), hh: Number(r[ADC['세대수']]) || null,
        pmin: Number(r[ADC['분양가최저(만원)']]) || null, pmax: Number(r[ADC['분양가최고(만원)']]) || null,
        ap: String(r[ADC['모집공고승인']]) === '승인', pd: adDay(r[ADC['모집공고일']]), u: u, img: safeUrl(r[ADC['대표이미지URL']]),
        pos: String(r[ADC['노출위치']]).split(',').map(x => back[x.trim()]).filter(Boolean), s: s0, e: e0,
        prod: prod.length ? prod : ['top'], dev: s1(r[ADC['사업주체']]), bld: s1(r[ADC['시공사']]), agc: s1(r[ADC['분양대행사']]),
        no: /^\d{10}$/.test(s1(r[ADC['청약홈공고번호']])) ? s1(r[ADC['청약홈공고번호']]) : '', dn: s1(r[ADC['분양신고번호']]), dd: adDay(r[ADC['분양신고일']]),
        gt: s1(r[ADC['분양보증신탁']]), vat: s1(r[ADC['분양가VAT']]), gx: s1(r[ADC['추가노출구']]).split(',').map(x => x.trim()).filter(Boolean).slice(0, 2),
        xy: xy, rk: Math.max(1, Math.min(20, Number(r[ADC['노출반경km']]) || 5)),
        lead: prod.indexOf('lead') >= 0 && !!adMail(r[ADC['상담받을이메일']]), pr: String(r[ADC['판매파트너모집']] || '') === '희망' || r[ADC['판매파트너모집']] === true
      });
    }
  }
  const res = { ok: true, at: t0, ads: ads };
  cache.put('adlist', JSON.stringify(res), 300);
  return res;
}


/* =====================================================================
   분양 상담 신청 연결 (v16) — 현장 카드 [분양 상담 신청] → '분양상담' 시트 + 광고주 이메일 전달
   · 이용자가 화면에서 (필수) 수집·이용 + (필수) 제3자 제공(받는 자 = 광고주 회사명) 에 동의한 경우만
   · 광고주에게는 이름·연락처·희망 연락 시간·문의만. 시트 주인 알림 메일·로그에는 연락처를 넣지 않음
   · 보관: 전달일로부터 6개월(AD_LEAD_KEEP_DAYS) 뒤 cleanLeads()가 행 삭제
   ===================================================================== */
const SH_LD = '분양상담';
const LDH = ['id','신청일','광고id','단지명','광고주','이름','연락처','희망시간','문의','동의','전달상태','전달일','파기예정일'];
const LDC = Object.fromEntries(LDH.map((h, i) => [h, i]));
const LEAD_TIME = ['오전(9~12시)', '오후(12~18시)', '저녁(18~21시)', '상관없음'];
const LEAD_DAILY = 300, LEAD_PER_PHONE = 3;
function ldSheet() {
  const ss = book();
  let sh = ss.getSheetByName(SH_LD);
  if (!sh) {
    sh = ss.insertSheet(SH_LD);
    sh.getRange(1, 1, 1, LDH.length).setValues([LDH]).setFontWeight('bold').setBackground('#2F6BFF').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}
/* 광고 행(비공개 칸 포함) 찾기: 승인·기간 내·공개 조건을 만족하는 광고만 */
function adRowLive(id) {
  if (!/^AD[0-9A-F]{8}$/.test(String(id || ''))) return null;
  const live = (adList().ads || []).find(a => a.id === id);
  if (!live) return null;
  const sh = book().getSheetByName(SH_AD); if (!sh) return null;
  const r = sh.getDataRange().getValues().find(x => String(x[ADC['id']]) === id);
  return r ? { live: live, mail: adMail(r[ADC['상담받을이메일']]) } : null;
}
function adLead(b) {
  if (String(b.hp || '')) throw new Error('신청을 처리하지 못했습니다.');
  const cache = CacheService.getScriptCache(), dk = 'ldday:' + ymd(new Date());
  const n = Number(cache.get(dk) || 0);
  if (n >= LEAD_DAILY) throw new Error('오늘 신청이 많아 내일 다시 신청해 주세요.');
  const ad = adRowLive(b.ad);
  if (!ad || !ad.live.lead || !ad.mail) throw new Error('이 현장은 지금 상담 신청을 받지 않아요. 공고문의 분양 문의 전화로 연락해 주세요.');
  const name = adText(b.name, 20, '이름', true);
  if (!/^[가-힣A-Za-z ]{2,20}$/.test(name)) throw new Error('이름은 한글 또는 영문으로 입력해 주세요.');
  const d = String(b.phone || '').replace(/[^0-9]/g, '');
  if (!/^01[016789]\d{7,8}$/.test(d)) throw new Error('휴대폰 번호를 확인해 주세요.');
  const phone = `${d.slice(0, 3)}-${d.slice(3, -4)}-${d.slice(-4)}`;
  const time = String(b.time || '');
  if (LEAD_TIME.indexOf(time) < 0) throw new Error('연락받기 좋은 시간을 골라 주세요.');
  const memo = adText(b.memo, 200, '문의 내용', false);
  const ag = b.agree || {};
  if (!(ag.collect === true && ag.third === true)) throw new Error('필수 동의 2가지에 모두 동의해 주세요.');
  const pk = 'ldph:' + ymd(new Date()) + ':' + hashOf('lead|' + d).slice(0, 16), pn = Number(cache.get(pk) || 0);
  if (pn >= LEAD_PER_PHONE) throw new Error('오늘은 이 번호로 더 신청할 수 없어요. 내일 다시 신청해 주세요.');
  const now = new Date(), t0 = ymd(now), co = ad.live.co;
  const id = 'LD' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  const row = [];
  row[LDC['id']] = id; row[LDC['신청일']] = now; row[LDC['광고id']] = ad.live.id; row[LDC['단지명']] = ad.live.n; row[LDC['광고주']] = co;
  row[LDC['이름']] = name; row[LDC['연락처']] = phone; row[LDC['희망시간']] = time; row[LDC['문의']] = memo;
  row[LDC['동의']] = `수집·이용 동의 + 제3자 제공 동의(받는 자 ${co}, 목적 분양 상담 연락, 보유 6개월) ${t0}`;
  let sent = '대기';
  try {
    MailApp.sendEmail(ad.mail, `[집코드 분양 상담 신청] ${ad.live.n}`,
      `집코드에서 ${ad.live.n} 분양 상담 신청이 들어왔어요.\n\n이름: ${name}\n연락처: ${phone}\n연락받기 좋은 시간: ${time}\n문의: ${memo || '-'}\n신청 번호: ${id} (${t0})\n\n`
      + `이 정보는 신청자가 '${co}'에 대한 제3자 제공에 동의해 전달하는 것입니다.\n`
      + `· 분양 상담 연락 목적 외에 쓰거나 다른 곳에 넘길 수 없습니다(문자·전화 광고 목록 등록 금지).\n· 연락은 오전 8시~오후 9시에만 해 주세요.\n`
      + `· 상담이 끝나거나 받은 날로부터 6개월이 지나면 파기해 주세요. 신청자가 삭제를 원하면 바로 지워 주세요.\n— 집코드 ((주)장대장부동산그룹)`);
    sent = '메일 전달';
  } catch (e) { sent = '전달 실패(수동 전달 필요)'; }
  row[LDC['전달상태']] = sent; row[LDC['전달일']] = sent === '메일 전달' ? now : '';
  row[LDC['파기예정일']] = ymd(new Date(now.getTime() + AD_LEAD_KEEP_DAYS * 86400000));
  ldSheet().appendRow(LDH.map((h, i) => row[i] === undefined ? '' : cellSafe(String(row[i] instanceof Date ? '' : row[i])) || row[i]));
  cache.put(dk, String(n + 1), 86400); cache.put(pk, String(pn + 1), 86400);
  if (NOTIFY) { try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[집코드 분양 상담] ${ad.live.n}`, `신청 번호 ${id} · 광고주 ${co} · ${sent}\n연락처는 '분양상담' 시트에서만 확인하세요(메일에는 넣지 않아요).\n${book().getUrl()}`); } catch (e) {} }
  return { ok: true, id: id, co: co };
}
/* 매일: 파기예정일이 지난 상담 신청 행 삭제 */
function cleanLeads() {
  const sh = book().getSheetByName(SH_LD); if (!sh) return 0;
  const v = sh.getDataRange().getValues(), t0 = ymd(new Date());
  let k = 0;
  for (let i = v.length - 1; i >= 1; i--) { const due = adDay(v[i][LDC['파기예정일']]); if (due && due < t0) { sh.deleteRow(i + 1); k++; } }
  return k;
}
function setupAds() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'cleanLeads').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('cleanLeads').timeBased().everyDays(1).atHour(4).create();
}
/* 광고 성과 보고서: '로그' 시트의 광고 기록(adv 목록 노출 · adm 지도 마커 노출 · adc 클릭) + '분양상담' 신청 수 → '광고보고서' 시트(광고·월별) */
function adReport() {
  const res = {}, key = (id, m) => (res[id + '|' + m] = res[id + '|' + m] || { id: id, m: m, adv: 0, adm: 0, adc: 0, adl: 0 });
  const lg = book().getSheetByName(SH_L);
  if (lg && lg.getLastRow() > 1) lg.getDataRange().getValues().slice(1).forEach(r => {
    if (!(r[0] instanceof Date) || ['adv', 'adm', 'adc'].indexOf(String(r[1])) < 0) return;
    key(String(r[2]), Utilities.formatDate(r[0], 'Asia/Seoul', 'yyyy-MM'))[String(r[1])]++;
  });
  const ld = book().getSheetByName(SH_LD);
  if (ld) ld.getDataRange().getValues().slice(1).forEach(r => { if (r[LDC['신청일']] instanceof Date) key(String(r[LDC['광고id']]), Utilities.formatDate(r[LDC['신청일']], 'Asia/Seoul', 'yyyy-MM')).adl++; });
  const names = {}; const ad = book().getSheetByName(SH_AD);
  if (ad) ad.getDataRange().getValues().slice(1).forEach(r => { names[String(r[ADC['id']])] = [r[ADC['회사명']], r[ADC['단지명']]]; });
  const out = [['광고id', '광고주', '단지명', '월', '목록·추천 노출', '지도 마커 노출', '클릭', '상담 신청', '클릭률(%)']];
  Object.values(res).sort((a, b) => (a.id + a.m).localeCompare(b.id + b.m)).forEach(x => {
    const imp = x.adv + x.adm, nm = names[x.id] || ['', ''];
    out.push([x.id, nm[0], nm[1], x.m, x.adv, x.adm, x.adc, x.adl, imp ? Math.round(x.adc / imp * 1000) / 10 : '']);
  });
  let sh = book().getSheetByName('광고보고서'); if (sh) book().deleteSheet(sh);
  sh = book().insertSheet('광고보고서');
  sh.getRange(1, 1, out.length, out[0].length).setValues(out);
  sh.getRange(1, 1, 1, out[0].length).setFontWeight('bold');
  return out.length - 1;
}
/* 현장 수요 리포트용 익명 집계: 관심 지역에 이 시·도/시·군·구를 넣은 회원 수, 그중 광고성 정보 수신 동의 수. 10명 미만은 '10명 미만'으로만 */
const AD_MIN_CELL = 10;
function adDemand(sido, sggCode) {
  const sh = book().getSheetByName(SH_U); let all = 0, mkt = 0;
  if (sh) sh.getDataRange().getValues().slice(1).forEach(r => {
    const d = parseJ(r[UC['저장자료']], {}), a = d && d.areas;
    if (!a || !Array.isArray(a.list)) return;
    if (!a.list.some(x => x.sd === sido && (!sggCode || !x.g || x.g === sggCode))) return;
    all++; if (a.mkt && a.mkt.at) mkt++;
  });
  const hide = v => v < AD_MIN_CELL ? `${AD_MIN_CELL}명 미만` : v;
  return { sido: sido, sgg: sggCode || '', watchers: hide(all), adConsent: hide(mkt), at: ymd(new Date()) };
}


/* =====================================================================
   광고 문의 (ad/ 광고 상품 안내 페이지) — v13
   흐름: 사이트 ad/ 문의 폼 → adInquiry → '광고문의' 시트에 [접수]로 저장 + 시트 주인에게 메일(연락처 제외)
         → 운영자가 연락 후 [처리상태]·[처리일] 입력. 처리일로부터 1년 지나면 행 삭제(개인정보처리방침 보관 기간)
   ===================================================================== */
const SH_AQ = '광고문의';
const AQH = ['id','접수일','유형','회사명','담당자','연락처','관심상품','지역','희망기간','문의내용','동의','처리상태','처리일','메모','보고서 이메일'];   // v35: 맨 뒤 '보고서 이메일'(예전 시트는 첫 사용 때 머리 줄만 채움)
const AQ_REPORT_PROD = ['weekly_report', 'weekly_locked', 'ad_target'];   // v35: 보고서를 이메일로 받는 상품 — 고르면 '보고서 이메일' 필수
const AQC = Object.fromEntries(AQH.map((h, i) => [h, i]));
const AQ_PROD = { bunyang: '분양 단지 광고', bunyang_pro: '분양 프리미엄', agent: '지역 제휴 중개사', native: '결과 하단 카드', jeonse: '전세사기 예방 체크리스트 스폰서', package: '패키지', etc: '기타·제휴',
                  dev_report: '분양가 적정성·입지 분석 리포트', unsold_pack: '미분양 해소 패키지',
                  brochure: '집코드 분석 브로슈어(잠금형)', datapack: '현장 자료 팩(편집형)',
                  weekly_report: '주간 현장 보고서(기본)', weekly_locked: '주간 현장 보고서(잠금형)', ad_target: '광고 지역 추천 리포트' };   // pro/developer/ 신청(시행사·분양대행사) — 'etc'와 함께 와요 (v23 brochure·datapack, v32 weekly_report·weekly_locked·ad_target)
AQ_PROD.brief_ad = BRIEF_NAME + ' 지면 광고';
AQ_PROD.list_card = '목록 사이 카드'; AQ_PROD.end_card = '페이지 끝 카드';   // v39: ad/ 문의 폼 광고 칸 카드 두 자리(재배포 전 서버는 함께 보내는 'etc'로 접수)
AQ_PROD.home_top = '홈 상단 배너'; AQ_PROD.cat_top = '카테고리 상단 배너';   // v36: ad/ 문의 폼 상단 배너 두 자리(재배포 전 서버는 함께 보내는 'etc'로 접수)   // v26: ad/ 문의 폼 '모닝 브리핑 지면 광고'(재배포 전 서버는 함께 보내는 'etc'로 접수)
const AQ_PERIOD = ['', '1주', '2주', '1개월', '8주(2개월)', '3개월', '6개월', '1년', '미정·협의'];   // v38: 8주(2개월) — 광고 설계 도우미 8주 구성
const AQ_DAILY = 40;          // 하루 전체 문의 상한(스팸 방지)

function aqSheet() {
  const ss = book();
  let sh = ss.getSheetByName(SH_AQ);
  if (!sh) {
    sh = ss.insertSheet(SH_AQ);
    sh.getRange(1, 1, 1, AQH.length).setValues([AQH]).setFontWeight('bold').setBackground('#2F6BFF').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  if (String(sh.getRange(1, AQH.length).getValue() || '') !== AQH[AQH.length - 1]) sh.getRange(1, AQH.length).setValue(AQH[AQH.length - 1]);   // v35 이전 시트: 뒤 칸 머리만
  return sh;
}

/* =====================================================================
   주간 현장 보고서 자동 발송 (v34) — 엔진 dev_weekly.py batch → dwPut → 드라이브(링크가 있는 사람만 보기) + 신청 업체 메일
   연락처(이메일)는 '광고문의' 시트 [연락처]에만 있고 엔진·깃에는 신청 id(AQ…)만 있음.
   멈춤: [처리상태] '해지' → [처리일]이 속한 달까지 보내고 다음 달 1일부터 멈춤(처리일 없으면 바로) · '취소' → 바로.
   ===================================================================== */
const SH_DW = '주간현장보고서';
const DWH = ['날짜', '신청id', '현장', '파일id', '보낸날', '결과'];
const DWC = Object.fromEntries(DWH.map((h, i) => [h, i]));
const DW_EMAIL = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const dwEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function dwAlert(title, lines) {
  try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '[주간 현장 보고서 확인 필요] ' + title, lines.concat(['', '신청 시트: ' + book().getUrl()]).join('\n')); } catch (e) {}
}
/* 보낼지: { send, why } */
function dwStatus(r, now) {
  const st = String(r[AQC['처리상태']] || '').trim();
  if (st === '취소') return { send: false, why: '취소' };
  if (st !== '해지') return { send: true, why: '' };
  const d = r[AQC['처리일']] ? new Date(r[AQC['처리일']]) : null;
  if (!d || isNaN(d)) return { send: false, why: '해지(처리일 없음)' };
  const kst = new Date(d.getTime() + 9 * 3600000), next = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() + 1, 1) - 9 * 3600000;   // 해지한 달의 다음 달 1일 0시(한국 시각)
  return now.getTime() < next ? { send: true, why: '해지 예정(다음 달 1일부터 멈춤)' } : { send: false, why: '해지' };
}
const dwDay = v => v instanceof Date ? ymd(v) : String(v || '').slice(0, 10);   // 시트가 날짜 글자를 날짜로 바꿔도 같게 읽기
function dwLog(row) { uSheet(SH_DW, DWH).appendRow(DWH.map((h, i) => row[i] === undefined ? '' : row[i])); }
function dwPut(b) {
  if (!pullOk(b)) return { ok: false, err: 'auth' };
  const aq = String(b.aq || ''), date = String(b.date || ''), site = uText(b.site, 60) || '현장';
  if (!/^AQ[0-9A-F]{8}$/.test(aq) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, err: 'bad' };
  const now = new Date(), md = Number(date.slice(5, 7)) + '/' + Number(date.slice(8, 10));
  const r = aqSheet().getDataRange().getValues().find(x => String(x[AQC['id']]) === aq);
  if (!r) { dwAlert(site + ' · 신청 행 없음', [`신청 id ${aq}가 '광고문의' 시트에 없어요. weekly_sites.json 의 aq 칸을 확인해 주세요. (${date})`]); return { ok: false, err: 'no-row' }; }
  const done = uSheet(SH_DW, DWH).getDataRange().getValues().some(x => String(x[DWC['신청id']]) === aq && dwDay(x[DWC['날짜']]) === date && String(x[DWC['결과']]) === '보냄');
  if (done) return { ok: true, sent: false, why: 'already' };
  if (b.fail) {
    dwAlert(site + ' · PDF 못 만듦', [`${date} 주간 현장 보고서 PDF를 만들지 못해 메일을 보내지 않았어요.`, '이유: ' + uText(b.fail, 300), `신청 id ${aq} · ${r[AQC['회사명']]}`]);
    dwLog([date, aq, site, '', now, 'PDF 없음']); return { ok: true, sent: false, why: 'fail' };
  }
  const S = dwStatus(r, now);
  if (!S.send) { dwLog([date, aq, site, '', now, '멈춤(' + S.why + ')']); return { ok: true, sent: false, why: S.why }; }
  const re = String(r[AQC['보고서 이메일']] || '').trim(), ct = String(r[AQC['연락처']] || '').trim();   // v35: [보고서 이메일] 먼저, 비었거나 틀리면 [연락처]
  const to = DW_EMAIL.test(re) ? re : ct;
  if (!DW_EMAIL.test(to)) {
    dwAlert(site + ' · 받는 이메일 없음', [`신청 id ${aq}(${r[AQC['회사명']]})의 [보고서 이메일]·[연락처]에 이메일이 없어 보내지 못했어요. 업체에 이메일을 받아 [보고서 이메일] 칸에 적어 주세요.`]);
    dwLog([date, aq, site, '', now, '이메일 없음']); return { ok: false, err: 'no-email' };
  }
  const bytes = Utilities.base64Decode(String(b.b64 || ''));
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) {
    dwAlert(site + ' · PDF 없음', [`${date} 보고서 파일이 비었거나 너무 커서(8MB 넘음) 보내지 못했어요. 신청 id ${aq}`]);
    dwLog([date, aq, site, '', now, 'PDF 없음']); return { ok: false, err: 'size' };
  }
  const P = PropertiesService.getScriptProperties();
  let folder = null; const fid = P.getProperty('DW_FOLDER');
  try { folder = fid ? DriveApp.getFolderById(fid) : null; } catch (e) { folder = null; }
  if (!folder) { folder = DriveApp.createFolder(SITE_NAME + ' 주간 현장 보고서'); P.setProperty('DW_FOLDER', folder.getId()); }
  const f = folder.createFile(Utilities.newBlob(bytes, 'application/pdf', site.replace(/[\\/:*?"<>|]/g, ' ') + '_주간현장보고서_' + date + '.pdf'));
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = 'https://drive.google.com/file/d/' + f.getId() + '/view';
  const lines = (Array.isArray(b.lines) ? b.lines : []).map(x => uText(x, 220)).filter(Boolean).slice(0, 6);
  const subject = `[${site}] 주간 현장 보고서 · ${md}`;
  const text = [`${r[AQC['회사명']]} ${r[AQC['담당자']]}님, ${site} 주간 현장 보고서(${date})예요.`, '', ...lines.map(x => '· ' + x), '', 'PDF 보기: ' + url,
                '', '공개 자료로 만든 보고서예요. 받기를 멈추시려면 이 메일에 회신해 주세요(다음 달부터 멈춰요). PDF 링크는 8주 동안 열려요.'].join('\n');
  const html = `<div style="font-family:'Noto Sans KR',sans-serif;max-width:560px;margin:auto;color:#191F28;line-height:1.65">
    <p style="margin:0 0 10px">${dwEsc(r[AQC['회사명']])} ${dwEsc(r[AQC['담당자']])}님, <b>${dwEsc(site)}</b> 주간 현장 보고서(${dwEsc(date)})예요.</p>
    <ul style="padding-left:18px;margin:0 0 14px">${lines.map(x => `<li style="margin:0 0 4px">${dwEsc(x)}</li>`).join('')}</ul>
    <a href="${url}" style="display:inline-block;background:#2F6BFF;color:#fff;padding:11px 18px;border-radius:10px;text-decoration:none;font-weight:700">보고서 PDF 보기</a>
    <p style="font-size:12.5px;color:#6B7684;margin:14px 0 0">공개 자료로 만든 보고서예요. 받기를 멈추시려면 이 메일에 회신해 주세요(다음 달부터 멈춰요). PDF 링크는 8주 동안 열려요.</p></div>`;
  let res = '보냄';
  try { MailApp.sendEmail({ to: to, subject: subject, body: text, htmlBody: html, name: SITE_NAME + ' 보고서' }); }
  catch (e) { res = '발송 실패'; dwAlert(site + ' · 발송 실패', [`${date} 메일을 보내지 못했어요: ${String(e.message || e).slice(0, 200)}`, `신청 id ${aq} · PDF는 드라이브에 있어요: ${url}`]); }
  return withLock(() => {
    const sh = uSheet(SH_DW, DWH);
    dwLog([date, aq, site, f.getId(), now, res]);
    const old = ymd(addDays(now, -56));   // 8주 지난 보고서는 파일·줄 모두 지움(중개사 플러스 주간 리포트와 같음)
    sh.getDataRange().getValues().map((x, i) => ({ x, row: i + 1 })).filter(o => o.row > 1 && dwDay(o.x[DWC['날짜']]) < old).sort((p, q) => q.row - p.row)
      .forEach(o => { try { if (o.x[DWC['파일id']]) DriveApp.getFileById(String(o.x[DWC['파일id']])).setTrashed(true); } catch (e) {} sh.deleteRow(o.row); });
    return { ok: res === '보냄', sent: res === '보냄', err: res === '보냄' ? undefined : 'mail' };
  });
}
/* 연락처: 전화번호(휴대폰·지역번호·070·대표번호) 또는 이메일 */
function aqContact(v) {
  const x = String(v == null ? '' : v).trim();
  if (!x) throw new Error('연락처(전화번호 또는 이메일)를 입력해 주세요.');
  if (x.length > 80) throw new Error('연락처를 확인해 주세요.');
  if (/^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(x)) return x.toLowerCase();
  if (/[A-Za-z@]/.test(x)) throw new Error('전화번호 또는 이메일 형식을 확인해 주세요.');
  const d = x.replace(/[^0-9]/g, '');
  if (/^070\d{8}$/.test(d)) return `070-${d.slice(3, 7)}-${d.slice(7)}`;
  try { return adPhone(d); } catch (e) { throw new Error('전화번호 또는 이메일 형식을 확인해 주세요.'); }
}
function adInquiry(b) {
  const cache = CacheService.getScriptCache(), dk = 'aqday:' + ymd(new Date());
  const n = Number(cache.get(dk) || 0);
  if (n >= AQ_DAILY) throw new Error('오늘 문의가 많아 카카오톡 채널이나 전화로 문의해 주세요.');
  if (String(b.hp || '')) throw new Error('문의를 처리하지 못했습니다.');               // 자동 입력 방지용 숨은 칸
  const type = String(b.type || 'inquiry');
  if (type !== 'inquiry') throw new Error('문의 유형이 올바르지 않습니다.');
  const company = adText(b.company, 60, '회사명', true);
  const manager = adText(b.manager, 30, '담당자 이름', true);
  const contact = aqContact(b.contact);
  const products = (Array.isArray(b.products) ? b.products : []).map(String).filter((p, i, a) => AQ_PROD[p] && a.indexOf(p) === i);
  if (!products.length) throw new Error('관심 상품을 하나 이상 골라 주세요.');
  const region = adText(b.region, 60, '지역', false);
  const period = String(b.period || '');
  if (AQ_PERIOD.indexOf(period) < 0) throw new Error('희망 기간을 다시 골라 주세요.');
  const memo = String(b.memo == null ? '' : b.memo).replace(/[\u0000-\u0009\u000B-\u001F\u007F<>]/g, ' ').trim();
  if (memo.length > 1000) throw new Error('문의 내용은 1,000자 이내로 입력해 주세요.');
  if (/^[=+\-@\t\r]/.test(memo)) throw new Error('문의 내용은 = + - @ 기호로 시작할 수 없습니다.');
  if (!(b.agree && b.agree.privacy === true)) throw new Error('개인정보 수집·이용에 동의해 주세요.');
  const remail = String(b.reportEmail == null ? '' : b.reportEmail).trim();
  if (products.some(p => AQ_REPORT_PROD.indexOf(p) >= 0)) {
    if (!remail) throw new Error('보고서를 받을 이메일을 입력해 주세요.');
    if (remail.length > 80 || !DW_EMAIL.test(remail)) throw new Error('보고서 받을 이메일 형식을 확인해 주세요(예: name@company.com).');
  } else if (remail && (remail.length > 80 || !DW_EMAIL.test(remail))) throw new Error('보고서 받을 이메일 형식을 확인해 주세요(예: name@company.com).');
  const t0 = ymd(new Date());
  const id = 'AQ' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  const row = [];
  row[AQC['id']] = id; row[AQC['접수일']] = new Date(); row[AQC['유형']] = '광고 문의'; row[AQC['회사명']] = company; row[AQC['담당자']] = manager;
  row[AQC['연락처']] = contact; row[AQC['관심상품']] = products.map(p => AQ_PROD[p]).join(','); row[AQC['지역']] = region; row[AQC['희망기간']] = period;
  row[AQC['문의내용']] = memo; row[AQC['동의']] = '개인정보 수집·이용 동의(문의 처리 후 1년 보관) ' + t0;
  row[AQC['처리상태']] = '접수'; row[AQC['처리일']] = ''; row[AQC['메모']] = ''; row[AQC['보고서 이메일']] = remail;
  const sh = aqSheet();
  sh.appendRow(AQH.map((h, i) => row[i] === undefined ? '' : row[i]));
  cache.put(dk, String(n + 1), 86400);
  if (NOTIFY) {
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[장대장 광고 문의] ${company}`,
        `접수 번호 ${id}\n회사 ${company} · 담당 ${manager}\n관심 상품 ${row[AQC['관심상품']]}\n지역 ${region || '-'} · 희망 기간 ${period || '-'}\n`
        + `연락처는 '광고문의' 시트에서 확인하세요(메일에는 넣지 않아요).\n연락 후 [처리상태]·[처리일]을 적어 주세요. 처리일로부터 1년이 지나면 행을 삭제합니다.\n${book().getUrl()}`);
    } catch (e) {}
  }
  return { ok: true, id: id };
}


/* =====================================================================
   카카오 로그인 회원 (v14) — 집코드 웹(login/ · mine/ · buy/report/)
   흐름: 화면에서 Kakao.Auth.authorize → login/ 으로 인가 코드(code) 도착 → kakaoLogin
         → 서버가 REST API 키로 토큰 받기 → /v2/user/me 로 회원번호·닉네임 확인 → 카카오 토큰은 바로 만료(저장 안 함)
         → 서버가 만든 무작위 세션 토큰을 화면에 주고, 시트에는 그 해시만 저장
   저장: '회원'(카카오 회원번호·닉네임·저장 자료) · '세션'(세션 해시) · '관심알림'(알림 신청) — 탈퇴 시 세 시트에서 바로 삭제
   ===================================================================== */
const USER_ACTIONS = { kakaoLogin: 1, userLoad: 1, userSave: 1, alertSubscribe: 1, userLogout: 1, userDelete: 1 };
// 카카오 로그인 돌아올 주소: 예전 주소와 새 도메인 둘 다 허용(바꾸는 날 로그인이 끊기지 않게). 카카오 개발자 콘솔 [Redirect URI]에도 둘 다 등록.
const KAKAO_REDIRECTS = [WEB_ROOT + 'login/', 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/login/', 'https://zipcode.works/login/'].filter((u, i, a) => a.indexOf(u) === i);
const SH_U = '회원', SH_S = '세션', SH_UA = '관심알림';
const UH = ['카카오id', '닉네임', '가입일', '최근로그인', '저장자료', '수정일'];
const SSH = ['세션해시', '카카오id', '만든날', '만료일'];
const ALH = ['id', '카카오id', '종류', '대상키', '대상이름', '신청일', '상태'];
const UC = Object.fromEntries(UH.map((h, i) => [h, i])), SC = Object.fromEntries(SSH.map((h, i) => [h, i])), ALC = Object.fromEntries(ALH.map((h, i) => [h, i]));
const SESSION_DAYS = 90, MAX_SESSIONS = 10, MAX_USER_ALERTS = 20, USER_DATA_MAX = 40000;
const ALERT_KIND = { trade: '이 단지 새 실거래', high: '이 단지 신고가', area: '지역 시세 흐름' };

function userDispatch(b) {
  try {
    if (b.action === 'kakaoLogin') return kakaoLogin(b);           // 카카오 확인(네트워크)은 잠금 밖, 시트 쓰기만 잠금 안
    if (b.action === 'userLoad') return userLoad(b);
    return withLock(() => {
      if (b.action === 'userSave') return userSave(b);
      if (b.action === 'alertSubscribe') return alertSubscribe(b);
      if (b.action === 'userLogout') return userLogout(b);
      if (b.action === 'userDelete') return userDelete(b);
      return { ok: false, err: 'unknown' };
    });
  } catch (x) {
    return { ok: false, err: String(x.message || x), code: x.code || '' };
  }
}
function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function uSheet(name, head) {
  const ss = book();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#2F6BFF').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}
const uKey = id => 'k' + String(id);                       // 시트가 큰 숫자를 지수 표기로 바꾸지 않게 앞에 k
const cellSafe = s => /^[=+\-@\t\r]/.test(s) ? "'" + s : s; // 셀 수식 주입 막기
function uText(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F<>]/g, ' ').trim().slice(0, n); }
function authErr(msg) { const e = new Error(msg || '로그인이 끝났어요. 다시 로그인해 주세요.'); e.code = 'auth'; return e; }

/* 카카오 API 호출 */
function kakaoFetch(url, opt) {
  let r, last;
  for (let i = 0; i < 3 && !r; i++) {                       // 구글 쪽 일시 연결 실패('사용할 수 없는 주소')는 잠깐 쉬고 다시
    try { r = UrlFetchApp.fetch(url, Object.assign({ muteHttpExceptions: true }, opt)); }
    catch (e) { last = e; if (i < 2) Utilities.sleep(400 * (i + 1) + Math.floor(Math.random() * 300)); }
  }
  if (!r) throw last;
  let j = {}; try { j = JSON.parse(r.getContentText() || '{}'); } catch (e) {}
  return { code: r.getResponseCode(), j };
}

function kakaoLogin(b) {
  const code = String(b.code || '');
  if (!/^[A-Za-z0-9_\-]{10,200}$/.test(code)) throw new Error('로그인 정보를 확인하지 못했어요. 다시 시도해 주세요.');
  const redirect = String(b.redirectUri || '');
  if (KAKAO_REDIRECTS.indexOf(redirect) < 0) throw new Error('로그인 주소가 등록된 주소와 달라요.');
  const P = PropertiesService.getScriptProperties();
  const rest = P.getProperty('KAKAO_REST_KEY'), secret = P.getProperty('KAKAO_CLIENT_SECRET');
  if (!rest) throw new Error('카카오 간편 로그인 서버 설정이 아직 끝나지 않았어요.');
  const payload = { grant_type: 'authorization_code', client_id: rest, redirect_uri: redirect, code: code };
  if (secret) payload.client_secret = secret;
  const t = kakaoFetch('https://kauth.kakao.com/oauth/token', { method: 'post', payload: payload });
  const at = t.j && t.j.access_token;
  if (t.code !== 200 || !at) {
    const ec = uText((t.j && (t.j.error_code || t.j.error)) || ('HTTP ' + t.code), 40);   // 예: KOE010(클라이언트 시크릿), KOE006(리다이렉트 URI), KOE320(코드 재사용)
    throw new Error('카카오 간편 로그인을 마치지 못했어요. 다시 시도해 주세요. (' + ec + ')');
  }
  let me;
  try {
    me = kakaoFetch('https://kapi.kakao.com/v2/user/me', { method: 'get', headers: { Authorization: 'Bearer ' + at } });
  } finally {
    try { kakaoFetch('https://kapi.kakao.com/v1/user/logout', { method: 'post', headers: { Authorization: 'Bearer ' + at } }); } catch (e) {}   // 받은 토큰은 바로 만료
  }
  const id = me && me.code === 200 && me.j && me.j.id;
  if (!id || !/^\d{1,20}$/.test(String(id))) throw new Error('카카오 회원 정보를 확인하지 못했어요. 다시 시도해 주세요.');
  const prof = (me.j.kakao_account && me.j.kakao_account.profile) || {};
  const nick = uText(prof.nickname || (me.j.properties && me.j.properties.nickname) || '', 30) || '카카오 회원';
  return withLock(() => {
    const k = uKey(id), sh = uSheet(SH_U, UH), rows = sh.getDataRange().getValues();
    let row = 0, isNew = false;
    for (let i = 1; i < rows.length; i++) if (String(rows[i][UC['카카오id']]) === k) { row = i + 1; break; }
    const now = new Date();
    if (row) {
      sh.getRange(row, UC['닉네임'] + 1).setValue(cellSafe(nick));
      sh.getRange(row, UC['최근로그인'] + 1).setValue(now);
    } else {
      isNew = true;
      const r = []; r[UC['카카오id']] = k; r[UC['닉네임']] = cellSafe(nick); r[UC['가입일']] = now; r[UC['최근로그인']] = now; r[UC['저장자료']] = ''; r[UC['수정일']] = '';
      sh.appendRow(UH.map((h, i) => r[i] === undefined ? '' : r[i]));
    }
    const s = newToken();
    const ss = uSheet(SH_S, SSH), exp = new Date(now.getTime() + SESSION_DAYS * 86400000);
    /* 같은 회원 세션이 많으면 오래된 것부터 지움 */
    const sv = ss.getDataRange().getValues(), mine = [];
    for (let i = 1; i < sv.length; i++) if (String(sv[i][SC['카카오id']]) === k) mine.push({ row: i + 1, at: new Date(sv[i][SC['만든날']]).getTime() || 0 });
    mine.sort((a, c) => a.at - c.at).slice(0, Math.max(0, mine.length - MAX_SESSIONS + 1)).map(x => x.row).sort((a, c) => c - a).forEach(r => ss.deleteRow(r));
    const r = []; r[SC['세션해시']] = hashOf('ses|' + s); r[SC['카카오id']] = k; r[SC['만든날']] = now; r[SC['만료일']] = exp;
    ss.appendRow(SSH.map((h, i) => r[i] === undefined ? '' : r[i]));
    return { ok: true, s: s, nick: nick, isNew: isNew, exp: ymd(exp) };
  });
}

/* 세션 토큰 → 회원 {k, row, nick, data} (없거나 만료면 auth 오류) */
function sessionUser(s) {
  s = String(s || '');
  if (!/^[0-9a-f]{64}$/.test(s)) throw authErr();
  const h = hashOf('ses|' + s), ss = book().getSheetByName(SH_S);
  if (!ss) throw authErr();
  const sv = ss.getDataRange().getValues();
  let k = '';
  for (let i = 1; i < sv.length; i++) if (safeEq(String(sv[i][SC['세션해시']]), h)) {
    const exp = new Date(sv[i][SC['만료일']]);
    if (!(exp.getTime() > Date.now())) { ss.deleteRow(i + 1); throw authErr(); }
    k = String(sv[i][SC['카카오id']]); break;
  }
  if (!k) throw authErr();
  const sh = book().getSheetByName(SH_U), rows = sh ? sh.getDataRange().getValues() : [];
  for (let i = 1; i < rows.length; i++) if (String(rows[i][UC['카카오id']]) === k)
    return { k: k, row: i + 1, nick: String(rows[i][UC['닉네임']]).replace(/^'/, ''), data: parseJ(rows[i][UC['저장자료']], {}) };
  throw authErr();
}

/* 저장 자료 정리: 허용한 칸만, 길이·개수 제한 (이메일·전화 같은 칸은 들어와도 버림) */
const UD_CODE = /^\d{5}$/, UD_SD = /^[0-9A-Za-z_-]{1,12}$/;
function cleanPlace(x, withBuy) {
  if (!x || typeof x !== 'object') return null;
  const o = { sd: uText(x.sd, 12), code: uText(x.code, 5), dong: uText(x.dong, 30), jibun: uText(x.jibun, 30), apt: uText(x.apt, 60), band: uText(x.band, 20), t: uText(x.t, 10) };
  if (!UD_SD.test(o.sd) || !UD_CODE.test(o.code) || !o.apt || !o.band) return null;
  const ar = Math.round(Number(x.ar) * 10) / 10;
  if (isFinite(ar) && ar >= 5 && ar <= 400) o.ar = ar;             // v49: 내 집에 고른 전용면적(㎡) — 성적표 메일이 그 면적 시세를 씀
  if (withBuy) {
    const bp = Math.round(Number(x.bp));
    o.bp = bp > 0 && bp < 10000000 ? bp : null;
    o.bd = /^\d{4}-\d{2}$/.test(String(x.bd || '')) ? String(x.bd) : '';
  }
  return o;
}
function cleanReport(x) {
  if (!x || typeof x !== 'object') return null;
  const q = String(x.q == null ? '' : x.q).slice(0, 400);
  if (q && !/^[A-Za-z0-9_\-.%=&~!*'()+]*$/.test(q)) return null;   // 주소 검색 문자열(인코딩된 값)만
  if (/(^|&)(i|c|d|n|e)=/.test(q)) return null;                  // 연소득·현금·대출·이름·기타 비용은 저장하지 않음
  const picks = (Array.isArray(x.picks) ? x.picks : []).slice(0, 10).map(p => p && ({
    apt: uText(p.apt, 60), area: uText(p.area, 40), band: uText(p.band, 20), P: Math.max(0, Math.round(Number(p.P) || 0)), fv: p.fv == null || p.fv === '' ? null : Math.max(0, Math.min(100, Math.round(Number(p.fv) || 0)))
  })).filter(p => p && p.apt);
  return { id: uText(x.id, 20), t: uText(x.t, 16), title: uText(x.title, 60), q: q, picks: picks };
}
/* 관심 지역: [{sd 시·도 이름, g 시·군·구 코드(빈 값 = 시·도 전체), gn 이름}] 최대 10곳 + kinds{notice, mu} */
function cleanAreas(a) {
  a = a && typeof a === 'object' ? a : {};
  const seen = {};
  const list = (Array.isArray(a.list) ? a.list : []).slice(0, 20).map(x => x && ({ sd: uText(x.sd, 20), g: /^\d{5}$/.test(String(x.g || '')) ? String(x.g) : '', gn: uText(x.gn, 30) }))
    .filter(x => x && /^[가-힣]{2,12}$/.test(x.sd) && (!x.g || x.gn))
    .filter(x => { const k = x.sd + '|' + x.g; if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 10);
  const k = a.kinds && typeof a.kinds === 'object' ? a.kinds : {};
  const o = { list: list, kinds: { notice: k.notice !== false, mu: k.mu !== false }, t: /^\d{4}-\d{2}-\d{2}$/.test(String(a.t || '')) ? String(a.t) : '' };
  /* v16 광고성 정보(새 분양 광고 소식) 수신 동의 — 동의한 경우에만 {at: 동의일}. 없으면 미동의 */
  if (a.mkt && typeof a.mkt === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(String(a.mkt.at || ''))) o.mkt = { at: String(a.mkt.at) };
  return o;
}
function cleanUserData(d, blim) {
  d = d && typeof d === 'object' ? d : {};
  const uniq = (arr, key) => { const seen = {}; return arr.filter(x => { const k = key(x); if (seen[k]) return false; seen[k] = 1; return true; }); };
  const pk = x => [x.code, x.dong, x.jibun, x.apt, x.band].join('|');
  const out = {
    v: 1,
    homes: uniq((Array.isArray(d.homes) ? d.homes : []).slice(0, 10).map(x => cleanPlace(x, true)).filter(Boolean), pk).slice(0, 5),
    favs: uniq((Array.isArray(d.favs) ? d.favs : []).slice(0, 40).map(x => cleanPlace(x, false)).filter(Boolean), pk).slice(0, 30),
    reports: uniq((Array.isArray(d.reports) ? d.reports : []).slice(0, 20).map(cleanReport).filter(Boolean), x => x.id || x.t).slice(0, 10),
    areas: cleanAreas(d.areas),
    brief: cleanBrief(d.brief, blim),
    rp: cleanRp(d.rp)                                                    // v49 내 집 정보 보정·대출 잔액·순자산 기록(그 사람만 읽음)
  };
  const json = JSON.stringify(out);
  if (json.length > USER_DATA_MAX) throw new Error('저장할 자료가 너무 많아요. 리포트나 관심 단지를 조금 지운 뒤 다시 저장해 주세요.');
  return out;
}
/* v49 내 집 성적표 개인 칸: adj{집키: {fl 층, ext 확장 y/n, rem 리모델링 y/n}} · loan{집키: 대출 잔액(만원)} · hist[[날짜, 집키, 집값, 대출]] · t 마지막 수정(ms)
   집키 = 시군구코드|동|지번|단지|평형(웹 mine-core homeId). 숫자 범위·글자 모양만 확인하고 그대로 둔다. 공개 자료·메일에는 쓰지 않는다. */
const RP_KEY = /^\d{5}\|[^|<>\u0000-\u001F]{1,30}\|[^|<>\u0000-\u001F]{0,30}\|[^|<>\u0000-\u001F]{1,60}\|[^|<>\u0000-\u001F]{1,20}$/;
function cleanRp(x) {
  x = x && typeof x === 'object' ? x : {};
  const yn = v => v === 'y' || v === 'n' ? v : '', adj = {}, loan = {};
  Object.keys(x.adj && typeof x.adj === 'object' ? x.adj : {}).filter(k => RP_KEY.test(k)).slice(0, 10).forEach(k => {
    const a = x.adj[k] || {}, fl = Math.round(Number(a.fl));
    const o = { fl: a.fl !== '' && a.fl != null && isFinite(fl) && fl >= -5 && fl <= 120 ? fl : null, ext: yn(a.ext), rem: yn(a.rem) };
    if (o.fl != null || o.ext || o.rem) adj[k] = o;
  });
  Object.keys(x.loan && typeof x.loan === 'object' ? x.loan : {}).filter(k => RP_KEY.test(k)).slice(0, 10).forEach(k => {
    const v = Math.round(Number(x.loan[k])); if (isFinite(v) && v >= 0 && v < 10000000) loan[k] = v;
  });
  const hist = (Array.isArray(x.hist) ? x.hist : []).filter(h => Array.isArray(h) && /^\d{4}-\d{2}-\d{2}$/.test(String(h[0])) && RP_KEY.test(String(h[1])))
    .map(h => [String(h[0]), String(h[1]), Math.round(Number(h[2])) || 0, Math.round(Number(h[3])) || 0]).filter(h => h[2] > 0 && h[2] < 10000000 && h[3] >= 0 && h[3] < 10000000).slice(-120);
  const t = Math.round(Number(x.t)); return { adj: adj, loan: loan, hist: hist, t: isFinite(t) && t > 0 ? t : 0 };
}
function userAlerts(k) {
  const sh = book().getSheetByName(SH_UA); if (!sh) return [];
  return sh.getDataRange().getValues().slice(1).filter(r => String(r[ALC['카카오id']]) === k && r[ALC['상태']] === '신청')
    .map(r => ({ id: String(r[ALC['id']]), kind: String(r[ALC['종류']]), key: String(r[ALC['대상키']]), name: String(r[ALC['대상이름']]).replace(/^'/, ''), at: r[ALC['신청일']] instanceof Date ? ymd(r[ALC['신청일']]) : String(r[ALC['신청일']]).slice(0, 10) }));
}

function userLoad(b) {
  const u = sessionUser(b.s);
  const d = u.data && typeof u.data === 'object' ? u.data : {};
  return { ok: true, nick: u.nick, data: { v: 1, homes: d.homes || [], favs: d.favs || [], reports: d.reports || [], areas: d.areas || { list: [], kinds: { notice: true, mu: true }, t: '' }, brief: cleanBrief(d.brief, bLim(bIsAdmin(u.k))), rp: cleanRp(d.rp) }, alerts: userAlerts(u.k) };
}
function userSave(b) {
  const u = sessionUser(b.s);
  const data = cleanUserData(b.data, bLim(bIsAdmin(u.k)));
  const sh = book().getSheetByName(SH_U);
  sh.getRange(u.row, UC['저장자료'] + 1).setValue(JSON.stringify(data));
  sh.getRange(u.row, UC['수정일'] + 1).setValue(new Date());
  return { ok: true, data: data };
}

/* 알림 신청: op 'add'(items: [{kind, key, name}]) · 'remove'(ids) — 카카오 알림 발송을 시작하면 '신청' 상태 행으로 보냄 */
function alertSubscribe(b) {
  const u = sessionUser(b.s), sh = uSheet(SH_UA, ALH);
  if (b.op === 'remove') {
    const ids = (Array.isArray(b.ids) ? b.ids : []).map(String);
    const v = sh.getDataRange().getValues();
    for (let i = v.length - 1; i >= 1; i--) if (String(v[i][ALC['카카오id']]) === u.k && ids.indexOf(String(v[i][ALC['id']])) >= 0) sh.deleteRow(i + 1);
    return { ok: true, alerts: userAlerts(u.k) };
  }
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 5).map(x => {
    const kind = String(x && x.kind || ''), key = String(x && x.key || '').slice(0, 160), name = uText(x && x.name, 60);
    if (!ALERT_KIND[kind] || !name) return null;
    if (kind === 'area' ? !UD_CODE.test(key) : !/^\d{5}\|[^|]{1,30}\|[^|]{0,30}\|[^|]{1,60}$/.test(key)) return null;
    return { kind, key, name };
  }).filter(Boolean);
  if (!items.length) throw new Error('알림 받을 내용을 하나 이상 골라 주세요.');
  const cur = userAlerts(u.k), has = x => cur.some(a => a.kind === x.kind && a.key === x.key);
  const add = items.filter(x => !has(x));
  if (cur.length + add.length > MAX_USER_ALERTS) throw new Error(`알림은 ${MAX_USER_ALERTS}개까지 신청할 수 있어요. 내 계정에서 몇 개를 지운 뒤 다시 신청해 주세요.`);
  add.forEach(x => {
    const r = []; r[ALC['id']] = 'U' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase(); r[ALC['카카오id']] = u.k;
    r[ALC['종류']] = x.kind; r[ALC['대상키']] = cellSafe(x.key); r[ALC['대상이름']] = cellSafe(x.name); r[ALC['신청일']] = new Date(); r[ALC['상태']] = '신청';
    sh.appendRow(ALH.map((h, i) => r[i] === undefined ? '' : r[i]));
  });
  return { ok: true, added: add.length, alerts: userAlerts(u.k) };
}

function userLogout(b) {
  const s = String(b.s || ''); if (!/^[0-9a-f]{64}$/.test(s)) return { ok: true };
  const h = hashOf('ses|' + s), ss = book().getSheetByName(SH_S); if (!ss) return { ok: true };
  const sv = ss.getDataRange().getValues();
  for (let i = sv.length - 1; i >= 1; i--) if (safeEq(String(sv[i][SC['세션해시']]), h)) ss.deleteRow(i + 1);
  return { ok: true };
}

/* 탈퇴: 회원·세션·알림 행을 바로 삭제. 어드민 키가 있으면 카카오 연결 끊기까지 */
function userDelete(b) {
  const u = sessionUser(b.s);
  const del = (name, col) => {
    const sh = book().getSheetByName(name); if (!sh) return;
    const v = sh.getDataRange().getValues();
    for (let i = v.length - 1; i >= 1; i--) if (String(v[i][col]) === u.k) sh.deleteRow(i + 1);
  };
  const axIds = (book().getSheetByName(SH_AX) ? axRows() : []).filter(o => String(o.r[AXC['카카오id']]) === u.k).map(o => String(o.r[AXC['id']]));   // v44 알림 구독·기록
  [SH_AXL, SH_AXS].forEach(n => { const sh = book().getSheetByName(n); if (!sh) return; const v = sh.getDataRange().getValues(); for (let i = v.length - 1; i >= 1; i--) if (axIds.indexOf(String(v[i][1])) >= 0) sh.deleteRow(i + 1); });
  del(SH_AX, AXC['카카오id']);
  del(SH_UA, ALC['카카오id']); del(SH_S, SC['카카오id']); del(SH_U, UC['카카오id']);
  try { cmUserGone(u.k); } catch (e) {}   // v46 살아보니: 그 사람 글·인증 기록 지우기
  try { dpUserGone(u.k); } catch (e) {}   // v50 동네 파트너: 해지·연락처 지우기·글 지우기
  try { baStopAll(u.k); } catch (e) {}    // v50 자동결제 멈춤·빌링키 지우기
  del('플러스중개사', 0); del('내손님', 1);   // v27 중개사 플러스: 표시 정보·손님 이름표·단지(시트 이름은 아래 SH_BPP·SH_BPC 와 같음)
  let unlinked = false;
  const admin = PropertiesService.getScriptProperties().getProperty('KAKAO_ADMIN_KEY');
  if (admin) {
    try {
      const r = kakaoFetch('https://kapi.kakao.com/v1/user/unlink', { method: 'post', headers: { Authorization: 'KakaoAK ' + admin }, payload: { target_id_type: 'user_id', target_id: u.k.slice(1) } });
      unlinked = r.code === 200;
    } catch (e) {}
  }
  return { ok: true, unlinked: unlinked };
}


/* =====================================================================
   전문가 이름 리포트 — v17
   흐름: 리포트를 산 중개사·전문가가 premium/pro/ 에서 이름·등록번호·연락처·로고·의견을 적고 섹션을 골라 proSave
         → 서버가 링크 id + 무작위 토큰을 만들고 토큰 해시만 저장 → 고객 링크 premium/r/#id.토큰 (# 뒤라 서버·통계로 안 감)
         → 고객이 열면 proOpen: 토큰 해시·만료·주문 상태(환불·열람 기간) 확인 후 표시 정보·의견·단지 키만 돌려줌
   · 숫자(시세·점수·순위·대출)는 저장하지 않음: 고객 화면이 공개 자료로 다시 계산 → 전문가가 숫자를 바꿀 방법이 없음
   · 의견 글에는 '집코드 분석/의견'처럼 집코드가 쓴 것처럼 보이는 말을 넣을 수 없음
   ===================================================================== */
const SH_P = '전문가리포트';
const PH = ['id','만든시각','고친시각','주문번호','토큰해시','만료일','상태','자료기준','유형','사무소명','대표','이름','등록번호','주소',
            '연락처','카카오','로고','고객이름','섹션','의견','조건','열람횟수','최근열람','문의클릭','메모','직함','사업자번호'];
const PCX = Object.fromEntries(PH.map((h, i) => [h, i]));
const PRO_ACTIONS = { proSave: 1, proList: 1, proRevoke: 1, proOpen: 1, proClick: 1 };
const PRO_MAX_LINKS = 20;            // 주문 1건으로 만들 수 있는 고객 링크 수(요금제 정하기 전 임시 상한)
const PRO_DAYS = [30, 90];           // 고객 링크 열람 기간(일)
/* v21: 공인중개사로 한정하지 않음 — 분양대행사·부동산 컨설팅/방송·세미나 전문가·세무사 등 자격사도 보냄(중개보조원은 계속 제외).
   시트 '유형' 칸 값. 예전 '전문가'(v17~v20 pro) 행은 직함이 자격명이면 자격사, 아니면 컨설팅·전문가로 읽음. */
const PRO_ROLE = { agent: '개업공인중개사', member: '소속공인중개사', seller: '분양대행사', consult: '부동산컨설팅·전문가', licensed: '자격사' };
const PRO_QUALS = ['세무사', '법무사', '감정평가사', '변호사', '공인회계사', '행정사'];
const PRO_BROKER_WORD = /공인\s*중개|중개\s*사무소|부동산\s*중개/, PRO_ASSIST = /중개\s*보조/;
const PRO_TAX_AD = /(수임료|보수|수수료|기장료|신고\s*대행료)[^\n]{0,12}(할인|무료|최저|저렴|싸게|비교|면제|반값|0\s*원)|(최저|저렴한|무료)\s*(수임료|보수|기장|신고\s*대행)|현금\s*(지급|제공|사은)|상품권|사은품|경품|캐시백|페이백/;
function proRoleOf(r, title) { return PRO_ROLE[r] ? r : r === 'pro' ? (PRO_QUALS.indexOf(String(title || '').trim()) >= 0 ? 'licensed' : 'consult') : ''; }
function proBizOk(d) {
  d = String(d || '').replace(/[^0-9]/g, ''); if (d.length !== 10) return false;
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5]; let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * w[i];
  s += Math.floor(+d[8] * 5 / 10);
  return (10 - s % 10) % 10 === +d[9];
}
const PRO_SECS = ['cmp', 'sum', 'trend', 'fv', 'hz', 'money'];
const PRO_NOTE_MAX = 800, PRO_NOTES_TOTAL = 9000, PRO_LOGO_MAX = 45000;
const PRO_ST = { on: '보냄', off: '멈춤' };

function proDispatch(b) {
  try {
    if (b.action === 'proOpen') return proOpen(b);
    return withLock(() => {
      if (b.action === 'proSave') return proSave(b);
      if (b.action === 'proList') return proList(b);
      if (b.action === 'proRevoke') return proRevoke(b);
      if (b.action === 'proClick') return proClick(b);
      return { ok: false, err: 'unknown' };
    });
  } catch (x) {
    return { ok: false, err: String(x.message || x), code: x.code || '' };
  }
}
function proSheet() {
  const sh = uSheet(SH_P, PH);
  /* v21: 오른쪽에 '직함'·'사업자번호' 칸이 늘어남 — 예전 시트는 제목줄만 늘림(기존 행·열 위치 그대로) */
  const cur = sh.getRange(1, 1, 1, PH.length).getValues()[0];
  if (String(cur[PH.length - 1] || '') !== PH[PH.length - 1]) sh.getRange(1, 1, 1, PH.length).setValues([PH]).setFontWeight('bold').setBackground('#2F6BFF').setFontColor('#FFFFFF');
  return sh;
}
function proRows() {
  const sh = book().getSheetByName(SH_P); if (!sh) return [];
  const v = sh.getDataRange().getValues(), list = [];
  for (let i = 1; i < v.length; i++) if (v[i][PCX['id']]) list.push({ row: i + 1, r: v[i] });
  return list;
}
const PRO_ID = /^P[0-9A-F]{11}$/;
function proFind(id) { id = String(id || ''); return PRO_ID.test(id) ? proRows().find(x => String(x.r[PCX['id']]) === id) || null : null; }
function setP(row, h, v) { proSheet().getRange(row, PCX[h] + 1).setValue(v); }

/* 주문 주인 확인: 결제 완료 + 열어 본 주문 + 환불 요청 없음 + 열람 기간 안 */
function proOrder(b) {
  const o = authOrder(b), s = orderState(o, new Date());
  if (s.refund) throw new Error('환불 요청이 접수된 주문으로는 고객 리포트를 만들 수 없어요.');
  if (s.expired) throw new Error('열람 기간이 지난 주문이에요.');
  if (!s.viewed) throw new Error('리포트를 먼저 한 번 열어 본 뒤에 고객에게 보낼 수 있어요.');
  return { o, s };
}

/* 표시 정보 검사 — 공인중개사는 중개사무소 명칭·소재지·연락처·등록번호·개업공인중개사 성명이 꼭 필요(공인중개사법 시행령 제17조의2) */
function proText(v, n) { return cellSafe(uText(v, n)); }
function proPhone(v) {
  const s = uText(v, 20), d = s.replace(/[^0-9]/g, '');
  return /^0\d{8,10}$/.test(d) || /^1[5-9]\d{6}$/.test(d) ? s.replace(/[^0-9-]/g, '') : '';
}
const PRO_FAKE = /(집\s*코\s*드|집\s*예\s*보|zip\s*code)\s*(의\s*)?(분석|의견|공식|인증|보증|추천)|장대장\s*(분석|인증|보증)/i;
function proProfile(p) {
  p = p && typeof p === 'object' ? p : {};
  const role = proRoleOf(p.role, p.title);
  if (!role) throw new Error('어떤 전문가인지 골라 주세요.');
  const broker = role === 'agent' || role === 'member';
  const f = { role, office: proText(p.office, 40), ceo: proText(p.ceo, 20), name: proText(p.name, 20), reg: proText(p.reg, 30).replace(/[^0-9A-Za-z가-힣-]/g, ''),
    addr: proText(p.addr, 80), phone: proPhone(p.phone), kakao: kakaoUrl(p.kakao), title: proText(p.title, 20), biz: String(p.biz || '').replace(/[^0-9]/g, '').slice(0, 10), logo: '' };
  if ([f.office, f.ceo, f.name, f.title].some(x => PRO_ASSIST.test(x))) throw new Error('중개보조원은 이름을 넣어 보낼 수 없어요. 개업·소속공인중개사 이름으로 보내 주세요.');
  /* v33: 공인중개사는 중개사무소 이름 필수(법정 표시), 그 밖의 유형은 '이름 또는 활동명' 한 칸(이름·상호 중 하나)만 필수 — 화면 assets/pro-report.js profileErrors 와 같은 기준 */
  if (broker && !f.office) throw new Error('중개사무소 이름을 적어 주세요. 법으로 꼭 표시해야 해요(공인중개사법).');
  if (!broker && !f.office && !f.name) throw new Error('이름 또는 활동명을 적어 주세요. 손님이 누가 보낸 자료인지 알 수 있어야 해요.');
  /* 법정 표기 의무는 공인중개사(중개대상물 표시·광고)만. 그 밖의 유형은 고객이 문의할 연락 방법 하나(전화 또는 카카오톡 채널)만 있으면 됨 — 대표 결정 11/21 */
  if (broker && !f.phone) throw new Error('연락처(전화번호)를 적어 주세요. 법으로 꼭 표시해야 해요(공인중개사법).');
  if (!broker && !f.phone && !f.kakao) throw new Error('전화번호나 카카오톡 채널 주소 중 하나를 적어 주세요. 손님이 문의할 곳이 있어야 해요.');
  if (!broker && p.phone && String(p.phone).replace(/[^0-9]/g, '') && !f.phone) throw new Error('전화번호를 다시 확인해 주세요.');
  if (broker) {
    /* 공인중개사법 제18조의2(중개대상물 표시·광고)·시행령 제17조의2: 명칭·소재지·연락처·등록번호·개업공인중개사 성명 */
    if (!f.reg || f.reg.replace(/[^0-9]/g, '').length < 5) throw new Error('중개사무소 등록번호를 적어 주세요. 법으로 꼭 표시해야 해요(공인중개사법).');
    if (!f.ceo) throw new Error('개업공인중개사(대표) 이름을 적어 주세요. 법으로 꼭 표시해야 해요(공인중개사법).');
    if (!f.addr) throw new Error('중개사무소 소재지(주소)를 적어 주세요. 법으로 꼭 표시해야 해요(공인중개사법).');
    if (role === 'member' && !f.name) throw new Error('소속공인중개사 본인 이름을 적어 주세요.');
    if (role === 'agent') f.name = '';
    f.biz = '';
  } else {
    if ([f.office, f.name, f.title].some(x => PRO_BROKER_WORD.test(x))) throw new Error("공인중개사가 아니면 '공인중개사'·'중개사무소' 같은 이름을 쓸 수 없어요(공인중개사법 제18조). 공인중개사라면 공인중개사 유형을 골라 주세요.");
    if (f.biz && !proBizOk(f.biz)) throw new Error('사업자등록번호 10자리를 다시 확인해 주세요. 비워 둬도 돼요.');
    if (role === 'licensed' && f.title && PRO_QUALS.indexOf(f.title) < 0) throw new Error('자격은 목록(세무사·법무사 등)에서 골라 주세요. 비워 둬도 돼요.');
    if (role !== 'seller') f.ceo = '';
  }
  if ([f.office, f.ceo, f.name, f.title].some(x => PRO_FAKE.test(x))) throw new Error('이름·소속에는 집코드가 쓴 것처럼 보이는 말을 넣을 수 없어요.');
  const logo = String(p.logo || '');
  if (logo) {
    if (logo.length > PRO_LOGO_MAX || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(logo)) throw new Error('로고 이미지가 너무 크거나 형식이 맞지 않아요. 다시 올려 주세요.');
    f.logo = logo;
  }
  return f;
}
/* 의견 글: 요약 아래(summary) · 맺음말(closing) · 항목별 메모(단지번호.섹션) */
function proNotes(n, prof) {
  n = n && typeof n === 'object' ? n : {};
  const taxAd = prof && prof.role === 'licensed' && prof.title === '세무사';
  const out = {}; let total = 0;
  Object.keys(n).slice(0, 40).forEach(k => {
    if (!(k === 'summary' || k === 'closing' || /^[0-2]\.(sum|trend|fv|hz|money)$/.test(k) || k === 'cmp')) return;
    const t = String(n[k] == null ? '' : n[k]).replace(/[\u0000-\u0009\u000B-\u001F\u007F<>]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, PRO_NOTE_MAX);
    if (!t) return;
    if (taxAd && PRO_TAX_AD.test(t)) throw new Error('세무사 광고 규정상 수임료 비교·할인·무료 문구나 현금·상품권 같은 금전 혜택 문구는 넣을 수 없어요. 해당 문장을 빼 주세요.');
    if (PRO_FAKE.test(t)) throw new Error('의견에는 집코드가 쓴 것처럼 보이는 말(예: 집코드 분석·집코드 의견)을 넣을 수 없어요. 전문가 의견은 전문가 이름으로 따로 표시돼요.');
    total += t.length; out[k] = t;
  });
  if (total > PRO_NOTES_TOTAL) throw new Error('의견 글이 너무 길어요. 조금 줄여 주세요.');
  return out;
}
function proSecs(a) {
  const seen = {};
  const s = (Array.isArray(a) ? a : []).map(String).filter(k => PRO_SECS.indexOf(k) >= 0 && !seen[k] && (seen[k] = 1));
  if (!s.filter(k => k !== 'cmp').length) throw new Error('보낼 항목을 하나 이상 골라 주세요.');
  return s;
}
/* 대출 계산 조건: '대출·필요 현금'을 넣을 때만, 숫자 4개만(어림값) */
function proCond(c, secs) {
  if (secs.indexOf('money') < 0 || !c || typeof c !== 'object') return '';
  const n = (v, lo, hi) => { v = Number(v); return isFinite(v) && v >= lo && v <= hi ? Math.round(v * 10) / 10 : null; };
  const o = { income: n(c.income, 0, 1000000), cash: n(c.cash, 0, 10000000), own: ['none', 'first', 'one', 'multi'].indexOf(c.own) >= 0 ? c.own : 'none', rate: n(c.rate, 0.5, 20) };
  if (o.income == null || o.cash == null || o.rate == null) return '';
  /* v42: 금리 유형·대출 기간(대출 한도가 달라지는 값) — 맞는 값일 때만 저장 */
  if (['var', 'mix', 'cyc'].indexOf(c.rtype) >= 0) o.rtype = c.rtype;
  const tm = Number(c.term); if ([10, 15, 20, 25, 30, 35, 40].indexOf(tm) >= 0) o.term = tm;
  return JSON.stringify(o);
}

function proOut(x, withMeta) {
  const r = x.r, p = {
    role: '', office: String(r[PCX['사무소명']]), ceo: String(r[PCX['대표']]), name: String(r[PCX['이름']]),
    reg: String(r[PCX['등록번호']]), addr: String(r[PCX['주소']]), phone: String(r[PCX['연락처']]), kakao: String(r[PCX['카카오']]), logo: String(r[PCX['로고']]),
    title: String(r[PCX['직함']] == null ? '' : r[PCX['직함']]), biz: String(r[PCX['사업자번호']] == null ? '' : r[PCX['사업자번호']]).replace(/[^0-9]/g, '')
  };
  p.role = Object.keys(PRO_ROLE).find(k => PRO_ROLE[k] === String(r[PCX['유형']])) || proRoleOf('pro', p.title);
  const o = { id: String(r[PCX['id']]), profile: p, client: String(r[PCX['고객이름']]), secs: parseJ(r[PCX['섹션']], []), notes: parseJ(r[PCX['의견']], {}),
    cond: parseJ(r[PCX['조건']], null), dataTo: String(r[PCX['자료기준']]), created: ymd(r[PCX['만든시각']] instanceof Date ? r[PCX['만든시각']] : new Date(r[PCX['만든시각']])),
    expires: r[PCX['만료일']] instanceof Date ? ymd(r[PCX['만료일']]) : String(r[PCX['만료일']]).slice(0, 10) };
  if (withMeta) { o.status = String(r[PCX['상태']]); o.views = Number(r[PCX['열람횟수']]) || 0; o.clicks = Number(r[PCX['문의클릭']]) || 0; }
  return o;
}

/* 만들기(id 없음) · 고치기(id 있음 — 같은 주문의 링크만, 링크 주소는 그대로) */
function proSave(b) {
  const { o, s } = proOrder(b);
  const prof = proProfile(b.profile), secs = proSecs(b.secs), notes = proNotes(b.notes, prof);
  const client = proText(b.client, 20), cond = proCond(b.cond, secs), dataTo = /^\d{6}$/.test(String(b.dataTo || '')) ? String(b.dataTo) : '';
  const days = PRO_DAYS.indexOf(Number(b.days)) >= 0 ? Number(b.days) : PRO_DAYS[0];
  const now = new Date(), orderExp = new Date(s.expires + 'T23:59:59+09:00');
  let exp = new Date(now.getTime() + days * 86400000); if (exp > orderExp) exp = orderExp;
  const put = (row, h, v) => { row[PCX[h]] = v; };
  const fill = row => {
    put(row, '고친시각', now); put(row, '만료일', exp); put(row, '자료기준', dataTo); put(row, '유형', PRO_ROLE[prof.role]);
    put(row, '사무소명', prof.office); put(row, '대표', prof.ceo); put(row, '이름', prof.name); put(row, '등록번호', prof.reg); put(row, '주소', prof.addr);
    put(row, '연락처', prof.phone); put(row, '카카오', prof.kakao); put(row, '로고', prof.logo); put(row, '고객이름', client);
    put(row, '섹션', JSON.stringify(secs)); put(row, '의견', JSON.stringify(notes)); put(row, '조건', cond);
    put(row, '직함', prof.title); put(row, '사업자번호', prof.biz ? "'" + prof.biz : '');
  };
  const oid = String(o.r[OC['주문번호']]);
  if (b.id) {
    const x = proFind(b.id);
    if (!x || String(x.r[PCX['주문번호']]) !== oid) throw new Error('고칠 링크를 찾지 못했어요.');
    const row = x.r.slice(); fill(row);
    proSheet().getRange(x.row, 1, 1, PH.length).setValues([PH.map((h, i) => row[i] === undefined ? '' : row[i])]);
    return { ok: true, id: String(x.r[PCX['id']]), expires: ymd(exp), updated: true };
  }
  const mine = proRows().filter(x => String(x.r[PCX['주문번호']]) === oid);
  if (mine.length >= PRO_MAX_LINKS) throw new Error(`리포트 1건으로는 고객 링크를 ${PRO_MAX_LINKS}개까지 만들 수 있어요. 안 쓰는 링크를 고쳐서 다시 써 주세요.`);
  const id = 'P' + Utilities.getUuid().replace(/-/g, '').slice(0, 11).toUpperCase(), tk = newToken();
  const row = []; put(row, 'id', id); put(row, '만든시각', now); put(row, '주문번호', oid); put(row, '토큰해시', hashOf('pro|' + tk));
  put(row, '상태', PRO_ST.on); put(row, '열람횟수', 0); put(row, '문의클릭', 0); fill(row);
  proSheet().appendRow(PH.map((h, i) => row[i] === undefined ? '' : row[i]));
  return { ok: true, id, token: tk, expires: ymd(exp) };
}
function proList(b) {
  const { o } = proOrder(b), oid = String(o.r[OC['주문번호']]);
  return { ok: true, max: PRO_MAX_LINKS, links: proRows().filter(x => String(x.r[PCX['주문번호']]) === oid).map(x => proOut(x, true)).reverse() };
}
function proRevoke(b) {
  const o = authOrder(b), x = proFind(b.id);
  if (!x || String(x.r[PCX['주문번호']]) !== String(o.r[OC['주문번호']])) throw new Error('링크를 찾지 못했어요.');
  setP(x.row, '상태', b.on ? PRO_ST.on : PRO_ST.off);
  return { ok: true, id: String(x.r[PCX['id']]), status: b.on ? PRO_ST.on : PRO_ST.off };
}
/* 고객 열기 (실패 이유는 구분하지 않음 — 링크 맞히기 막기) */
function proAuth(b) {
  const id = String(b.id || ''), tk = String(b.tk || '');
  const cache = CacheService.getScriptCache(), ck = 'po:' + id.slice(0, 12), tries = Number(cache.get(ck) || 0);
  const bad = () => { cache.put(ck, String(tries + 1), 3600); return new Error('링크가 맞지 않거나 열람 기간이 끝났어요. 보내 준 분께 새 링크를 요청해 주세요.'); };
  if (tries >= 20) throw new Error('확인 시도가 많아 1시간 뒤에 다시 열어 주세요.');
  const x = proFind(id);
  if (!x || !/^[0-9a-fA-F]{64}$/.test(tk) || !safeEq(String(x.r[PCX['토큰해시']]), hashOf('pro|' + tk))) throw bad();
  if (String(x.r[PCX['상태']]) !== PRO_ST.on) throw bad();
  const exp = x.r[PCX['만료일']] instanceof Date ? x.r[PCX['만료일']] : new Date(x.r[PCX['만료일']]);
  if (!(exp > new Date())) throw bad();
  const o = findRow(String(x.r[PCX['주문번호']]));
  if (!o || String(o.r[OC['상태']]) !== ST.paid) throw bad();
  const s = orderState(o, new Date());
  if (s.refund || s.expired) throw bad();
  return { x, o };
}
function proOpen(b) {
  const { x, o } = proAuth(b);
  withLock(() => { setP(x.row, '열람횟수', (Number(x.r[PCX['열람횟수']]) || 0) + 1); setP(x.row, '최근열람', new Date()); });
  const v = proOut(x, false);
  v.keys = parseJ(o.r[OC['단지키']], []);
  return { ok: true, report: v };
}
function proClick(b) {
  const { x } = proAuth(b);
  setP(x.row, '문의클릭', (Number(x.r[PCX['문의클릭']]) || 0) + 1);
  return { ok: true };
}

/* =====================================================================
   모닝 브리핑 (BRIEF_NAME = '{SITE_NAME} 모닝 브리핑', 유료 구독) — v18, 이름·전국 시장 칸 v22
   · 동네별 브리핑은 GitHub Actions(jangdaejang-timing brief.yml)가 매일 새벽 만들어 공개 데이터(data/brief/{시군구}.json)에 올림.
     이 서버는 '누구에게 어떤 동네를 어떤 채널로' 보낼지만 관리하고, 아침(트리거 briefDaily)에 발송.
   · 구독 = 카카오 로그인 회원만. 동네는 회원 저장 자료(userSave)의 brief.areas(시군구·동, 최대 10곳)를 그대로 씀 → 동네 바꾸기는 저장만 하면 다음 날부터.
   · 결제: 지금은 '1개월 이용권'(자동 연장 없음) — 기존 토스 결제창·'주문' 시트 그대로. 만료 3일 전·당일 안내.
   · 7일 무료 체험: 카카오 계정당 1번(결제수단 등록 없음 → 자동 유료 전환 없음).
   · 발송 채널(키만 넣으면 켜짐): email(MailApp) · kakao(알림톡, 솔라피 SOLAPI_API_KEY·SOLAPI_API_SECRET·SOLAPI_PFID·SOLAPI_TPL_BRIEF·SOLAPI_TPL_EXPIRE
     + 선택 SOLAPI_FROM: 실패 시 문자 대체 발신번호) · webpush(준비 중). 카카오 채널을 골랐는데 키가 없으면 그날은 보내지 않고 '발송기록'에 남김.
   · 개인정보: 발송용 연락처 원문은 '브리핑구독' 시트에만(가린 값·해시와 함께), 이용 끝난 뒤 30일이 지나면 원문을 지움. 광고성 정보는 따로 동의한 사람에게만(지금은 보내지 않음).
   · 공개 집계(GET, 스크립트 속성 BRIEF_PULL_TOKEN 이 맞을 때만): briefAreas(동네 코드별 구독 수), briefInterest(단지별 최근 7일 방문자 수, 5명 이상만)
   ===================================================================== */
const SH_B = '브리핑구독', SH_BL = '발송기록';
const BH = ['id', '생성시각', '상품', '상태', '주문번호', '카카오id', '채널', '연락처', '연락처가림', '연락처확인값', '광고동의', '시작일', '만료일',
            '최근발송일', '발송수', '만료알림', '해지일', '환불상태', '환불요청시각', '메모',
            '결제액', '다음요금제', '중개사번호', '중개사확인',    // v26: 4칸 추가(기존 시트는 첫 사용 때 머리 줄만 채움)
            '아침광고동의', '아침광고동의시각', '아침광고철회시각', '광고확인시각', '광고동의시각', '광고철회시각'];   // v29·v31: 메일 광고 동의 2가지(정보통신망법 제50조) 4칸
const BC = Object.fromEntries(BH.map((h, i) => [h, i]));
const BLH = ['날짜', '구독id', '채널', '결과', '동네수'];
/* ★ 요금제 표(v26) — 서버는 이 표 한 곳만 봐요. 화면 assets/brief-core.js 의 TIERS 와 숫자가 같아야 해요(tools/brief-web-test.js 가 대조).
   amount: 한 달 금액(원) · areas: 관심 지역 수 · apts: 관심 단지 수(발송할 때 이 수까지만 씀) · pro: 중개사 내용 · broker: 중개사무소 등록번호 필요
   customers: 내 손님 브리핑 손님 수(0 = 없음) · urgPick: 급매 기준(5~20%)을 직접 고름(아니면 10%) · weekly: 주간 시장 리포트(내 이름 PDF)
   show: false 면 주문·요금제 바꾸기를 받지 않아요(표에 미리 넣어 두는 새 요금제용). 새 요금제는 줄 하나만 더하면 돼요.
   listing: 매물 설명서(agent/listing/) 한 달 장수 · kitAreas: 주간 블로그·인스타 글(agent/content/) 한 주에 만들 수 있는 지역 수 (v28) */
const BRIEF_TIERS = [
  { id: 'brief',          label: '기본',         name: BRIEF_NAME + ' 1개월',               amount: 3900, areas: 3,  apts: 3,  customers: 0,  urgPick: false, weekly: false, pro: false, broker: false, listing: 0, kitAreas: 0, show: true },
  { id: 'brief_plus',     label: '플러스',       name: BRIEF_NAME + ' 플러스 1개월',        amount: 5900, areas: 10, apts: 10, customers: 0,  urgPick: false, weekly: false, pro: false, broker: false, listing: 10, kitAreas: 1, show: true },
  { id: 'brief_pro',      label: '중개사용',     name: BRIEF_NAME + ' 중개사용 1개월',      amount: 4900, areas: 10, apts: 10, customers: 0,  urgPick: false, weekly: false, pro: true,  broker: true,  listing: 30, kitAreas: 1, show: true },
  { id: 'brief_pro_plus', label: '중개사 플러스', name: BRIEF_NAME + ' 중개사 플러스 1개월', amount: 9900, areas: 20, apts: 30, customers: 10, urgPick: true,  weekly: true,  pro: true,  broker: true,  listing: 150, kitAreas: 5, show: true }
];
const BRIEF_MAX = { areas: Math.max.apply(null, BRIEF_TIERS.map(t => t.areas)), apts: Math.max.apply(null, BRIEF_TIERS.map(t => t.apts)) };   // 회원 저장 자료에 둘 수 있는 최대 수
/* v48 운영자(대표) 모드 — 받는 지역·관심 단지 수만 늘림(요금제·결제·중개사 내용·PAID_OPEN 과 무관). 화면 assets/brief-core.js ADMIN 과 숫자가 같아야 해요.
   켜는 법: 구독 관리 [운영자 모드 켜기] → 스크립트 주인 메일의 1회용 링크(30분)를 같은 카카오 계정으로 열기. 목록: 스크립트 속성 BRIEF_ADMIN_IDS(카카오 회원번호 JSON 배열) */
const BRIEF_ADMIN_LIM = { areas: 300, apts: 100 };
const BRIEF_ADM_LINK_MIN = 30, BRIEF_ADM_CHUNK = 20, BRIEF_ADM_PULL = 3, BRIEF_ADM_TIME = 270000, BRIEF_ADM_MAIL_MIN = 10;
function bAdminIds() { const v = parseJ(PropertiesService.getScriptProperties().getProperty('BRIEF_ADMIN_IDS'), []); return Array.isArray(v) ? v.map(String).filter(Boolean) : []; }
function bIsAdmin(k) { k = String(k == null ? '' : k); return !!k && bAdminIds().indexOf(k) >= 0; }
function bLim(adm) { return adm ? BRIEF_ADMIN_LIM : BRIEF_MAX; }
const BRIEF_URG = { def: 10, lo: 5, hi: 20 };   // 급매 기준(%): 기본 10, 고를 수 있으면 5~20
const BRIEF_PRICE = Object.fromEntries(BRIEF_TIERS.map(t => [t.id, Object.assign({ days: 30 }, t)]));
const BRIEF_TRIAL = { name: BRIEF_NAME + ' 7일 체험', label: '무료 체험', amount: 0, areas: 3, apts: 3, customers: 0, days: 7 };
const BRIEF_CHG_SUFFIX = ' 변경 차액';    // 요금제 올리기 차액 주문의 상품명 = 새 요금제 이름 + 이 글자
const BRIEF_MIN_PAY = 100;               // 차액이 이보다 적으면 결제 없이 바로 바꿔 드림(카드 최소 결제 금액)
/* 예전 상품명(시트에 이미 저장된 행) → 상품 키. 이름이 또 바뀌면 바뀌기 전 이름을 여기에 더해 두면 됨 */
const BRIEF_OLD_NAMES = { '아침 브리핑 1개월': 'brief', '아침 브리핑 중개사용 1개월': 'brief_pro', '아침 브리핑 7일 체험': 'trial' };
function bProdKey(name) {
  name = String(name || '');
  if (name === BRIEF_TRIAL.name) return 'trial';
  const k = Object.keys(BRIEF_PRICE).find(x => BRIEF_PRICE[x].name === name);
  return k || BRIEF_OLD_NAMES[name] || '';
}
function bIsTrial(name) { return bProdKey(name) === 'trial'; }
const BST = { wait: '결제대기', on: '이용', trial: '체험', stop: '해지', refund: '환불', chg: '변경' };   // 변경 = 요금제를 올려 새 행으로 넘어간 이전 행
const BRIEF_ACTIONS = { briefAdPref: 1, briefTrial: 1, briefOrder: 1, briefConfirm: 1, briefMine: 1, briefUpdate: 1, briefStop: 1, briefRefund: 1, briefChangeQuote: 1, briefChange: 1, briefInvite: 1, toolQuota: 1, toolUse: 1, briefAdminMail: 1, briefAdminEnter: 1, briefAdminOff: 1 };
const BROKER_REVIEW = { wait: '확인 대기', ok: '확인됨', no: '확인 안 됨' };   // 운영자가 '중개사확인' 칸을 직접 바꿔요(외부 조회 없음)
/* 중개사무소 등록번호 형식 확인 — 화면 assets/brief-core.js brokerNo 와 같은 규칙 */
function bBrokerNo(s, year) {
  const t = String(s == null ? '' : s).replace(/\s+/g, '').replace(/[‐‑–—−]/g, '-').replace(/^제/, '').replace(/호$/, '');
  const Y = year || Number(Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy')), bad = m => ({ ok: false, err: m });
  if (!t) return bad('중개사무소 등록번호를 적어 주세요.');
  if (t.length > 30) return bad('등록번호가 너무 길어요. 다시 확인해 주세요.');
  if (/^01[016789]-?\d{3,4}-?\d{4}$/.test(t)) return bad('전화번호가 아니라 중개사무소 등록번호를 적어 주세요.');
  if (/^\d{3}-?\d{2}-?\d{5}$/.test(t)) return bad('사업자등록번호가 아니라 중개사무소 등록번호를 적어 주세요.');
  const m = t.match(/^([1-5]\d{4})-?(\d{4})-?(\d{4,5})$/);
  if (m) return +m[2] >= 1984 && +m[2] <= Y ? { ok: true, norm: m[1] + '-' + m[2] + '-' + m[3], kind: 'new' } : bad('등록 연도(가운데 4자리)를 다시 확인해 주세요.');
  if (/^\d{5}-?\d{4}-?\d{4,5}$/.test(t)) return bad('앞 5자리(시·군·구 코드)를 다시 확인해 주세요.');
  if (/^[가-힣0-9]+(-[가-힣0-9]+){0,4}$/.test(t) && /[가-힣-]/.test(t) && (t.match(/\d/g) || []).length >= 4) return { ok: true, norm: t, kind: 'old' };
  return bad('중개사무소 등록번호 형식이 맞지 않아요. 예: 11680-2020-00123');
}
/* 요금제 올리기 차액: (새 금액 − 지금 금액) × 남은 날 / 30, 10원 미만 버림(이용자에게 유리하게). 내리기·같은 값이면 0 */
function bChangeAmt(cur, nxt, left) {
  const d = Number(nxt.amount) - Number(cur.amount), days = cur.days || 30;
  if (!(d > 0) || !(left > 0)) return 0;
  return Math.floor(d * Math.min(left, days) / days / 10) * 10;
}
const BRIEF_DATA = 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/data/brief/';
const BRIEF_WEB = WEB_ROOT + 'brief/';
const BRIEF_KEEP_DAYS = 30;       // 이용 끝난 뒤 연락처 원문 보관 일수
const BRIEF_MIN_VISITORS = 5;     // 관심도 집계: 방문자 5명 이상인 단지만

/* 회원 저장 자료의 brief: {areas:[{g 시군구 코드, gn 이름, sd 시·도, dn 동(빈 값 = 구 전체)}] 최대 10곳, apts:[관심 단지 이름] 최대 10, v:'pro'|'',
   cy:{score 청약 가점 0~84, nohome 무주택 기간(년)}(선택, 청약 기회 코너), budget·age(선택, 광고주용 익명 통계에만)} */
function cleanBrief(x, lim) {
  x = x && typeof x === 'object' ? x : {};
  lim = lim || BRIEF_MAX;                 // v48 운영자 계정은 bLim(true)
  const seen = {};
  const areas = (Array.isArray(x.areas) ? x.areas : []).slice(0, lim.areas + 10).map(a => a && ({ g: /^\d{5}$/.test(String(a.g || '')) ? String(a.g) : '', gn: uText(a.gn, 30), sd: uText(a.sd, 20), dn: uText(a.dn, 20) }))
    .filter(a => a && a.g && a.gn && (!a.dn || /^[가-힣0-9·.]{1,20}$/.test(a.dn)))
    .filter(a => { const k = a.g + '|' + a.dn; if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, lim.areas);
  const apts = (Array.isArray(x.apts) ? x.apts : []).slice(0, lim.apts + 10).map(s => uText(s, 40)).filter(Boolean).slice(0, lim.apts);
  const n = (v, lo, hi) => { if (v === '' || v == null) return null; v = Math.round(Number(v)); return isFinite(v) && v >= lo && v <= hi ? v : null; };
  const cy = x.cy && typeof x.cy === 'object' ? { score: n(x.cy.score, 0, 84), nohome: n(x.cy.nohome, 0, 40) } : { score: null, nohome: null };
  return { areas: areas, apts: apts, v: x.v === 'pro' ? 'pro' : '', cy: cy, urg: n(x.urg, BRIEF_URG.lo, BRIEF_URG.hi),
    budget: BRIEF_BUDGETS.indexOf(x.budget) >= 0 ? x.budget : '', age: BRIEF_AGES.indexOf(x.age) >= 0 ? x.age : '' };
}
/* 선택 입력(광고주용 익명 통계에만): 예산대·연령대 — 화면 brief/manage 의 목록과 같음 */
const BRIEF_BUDGETS = ['3억 미만', '3억~6억', '6억~9억', '9억~15억', '15억 이상'], BRIEF_AGES = ['20대', '30대', '40대', '50대', '60대 이상'];

function briefDispatch(b) {
  try {
    if (b.action === 'briefConfirm') return briefConfirm(b);       // 토스 승인(네트워크)은 잠금 밖에서 하고 시트 쓰기만 잠금
    return withLock(() => {
      if (b.action === 'briefTrial') return briefTrial(b);
      if (b.action === 'briefOrder') return briefOrder(b);
      if (b.action === 'briefMine') return briefMine(b);
      if (b.action === 'briefUpdate') return briefUpdate(b);
      if (b.action === 'briefStop') return briefStop(b);
      if (b.action === 'briefRefund') return briefRefund(b);
      if (b.action === 'briefChangeQuote') return briefChangeQuote(b);
      if (b.action === 'briefChange') return briefChange(b);
      if (b.action === 'briefInvite') return briefInvite(b);
      if (b.action === 'toolQuota') return toolQuota(b);
      if (b.action === 'toolUse') return toolUse(b);
      if (b.action === 'briefAdPref') return briefAdPref(b);
      if (b.action === 'briefAdminMail') return briefAdminMail(b);
      if (b.action === 'briefAdminEnter') return briefAdminEnter(b);
      if (b.action === 'briefAdminOff') return briefAdminOff(b);
      return { ok: false, err: 'unknown' };
    });
  } catch (x) {
    return { ok: false, err: String(x.message || x), code: x.code || '' };
  }
}
function bSheet() {
  const sh = uSheet(SH_B, BH);
  if (!bSheet.ok) {                 // v26 이전에 만든 시트: 뒤에 붙은 칸의 머리 줄만 채움(기존 자료는 그대로)
    const h = sh.getRange(1, 1, 1, BH.length).getValues()[0] || [];
    if (String(h[BH.length - 1] || '') !== BH[BH.length - 1]) sh.getRange(1, 1, 1, BH.length).setValues([BH]);
    bSheet.ok = 1;
  }
  return sh;
}
function bRows() {
  const v = bSheet().getDataRange().getValues(), out = [];
  for (let i = 1; i < v.length; i++) if (v[i][BC['id']]) out.push({ row: i + 1, r: v[i] });
  return out;
}
function setB(row, h, v) { bSheet().getRange(row, BC[h] + 1).setValue(v); }
function dOnly(v) { if (!v) return null; const d = v instanceof Date ? new Date(v.getTime()) : new Date(String(v).slice(0, 10) + 'T00:00:00+09:00'); return isNaN(d) ? null : d; }
function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }
function kstToday() { return dOnly(ymd(new Date())); }
function briefChannels() {
  const P = PropertiesService.getScriptProperties();
  return { email: true, kakao: !!(P.getProperty('SOLAPI_API_KEY') && P.getProperty('SOLAPI_API_SECRET') && P.getProperty('SOLAPI_PFID') && P.getProperty('SOLAPI_TPL_BRIEF')), webpush: false };
}
/* 채널별 연락처: kakao = 휴대폰, email = 이메일 */
function briefContact(channel, c) {
  const ct = parseContact(c);
  if (!ct) return null;
  if (channel === 'kakao' && ct.kind !== 'phone') return null;
  if (channel === 'email' && ct.kind !== 'email') return null;
  return ct;
}
function briefState(o, now) {
  const r = o.r, st = String(r[BC['상태']]), s = dOnly(r[BC['시작일']]), e = dOnly(r[BC['만료일']]), t = dOnly(ymd(now));
  const active = (st === BST.on || st === BST.trial) && s && e && s <= t && t <= e;
  const pk = bProdKey(r[BC['상품']]), P = BRIEF_PRICE[pk] || BRIEF_TRIAL;
  const left = e && t <= e ? Math.round((e - (s && s > t ? s : t)) / 86400000) + 1 : 0;   // 시작 전이면 시작일부터 센 날 수
  const sent = Number(r[BC['발송수']]) || 0;
  /* 환불 예정액: 첫 브리핑 발송 전이면 낸 돈 전부, 이용 중이면 남은 날만큼(일할, 위약금 없음). 낸 돈(결제액)이 비어 있으면 상품 금액(v26 이전 행) */
  const pv = r[BC['결제액']], paid = pv === '' || pv == null ? P.amount : Number(pv) || 0;   // 0 = 친구 초대 보상(무료 1개월)
  const refundEst = st === BST.chg || !P.amount ? 0 : sent === 0 ? paid : Math.min(paid, Math.floor(P.amount * Math.min(left, P.days) / P.days / 10) * 10);
  const nx = String(r[BC['다음요금제']] || ''), adm = bIsAdmin(r[BC['카카오id']]);   // v48 운영자: 받는 지역·단지 수만 늘림(요금제·중개사 내용은 그대로)
  return { id: String(r[BC['id']]), product: String(r[BC['상품']]), state: st, active: !!active, start: s ? ymd(s) : '', end: e ? ymd(e) : '',
    left: left, channel: String(r[BC['채널']]), contact: String(r[BC['연락처가림']]), ad: r[BC['광고동의']] === true, sent: sent,
    refund: String(r[BC['환불상태']] || ''), refundEst: refundEst, areas: adm ? BRIEF_ADMIN_LIM.areas : P.areas, apts: adm ? BRIEF_ADMIN_LIM.apts : P.apts, adm: adm, customers: P.customers || 0, urgPick: !!P.urgPick, weekly: !!P.weekly,
    pro: !!P.pro, orderId: String(r[BC['주문번호']] || ''), reward: !String(r[BC['주문번호']] || '') && pk !== 'trial' && BRIEF_PRICE[pk] ? true : false,
    tier: pk, label: P.label || '', next: BRIEF_PRICE[nx] ? nx : '', nextLabel: BRIEF_PRICE[nx] ? BRIEF_PRICE[nx].label : '',
    broker: P.broker ? { no: String(r[BC['중개사번호']] || ''), review: String(r[BC['중개사확인']] || BROKER_REVIEW.wait) } : null };
}
function myBriefs(k) { return bRows().filter(o => String(o.r[BC['카카오id']]) === k); }
/* 같은 회원의 가장 늦은 이용 끝날(이용·체험 중) — 새 이용권은 그다음 날부터 */
function lastEnd(k) {
  let e = null;
  myBriefs(k).forEach(o => { const st = String(o.r[BC['상태']]); const d = dOnly(o.r[BC['만료일']]); if ((st === BST.on || st === BST.trial) && d && (!e || d > e)) e = d; });
  return e;
}
function newBriefRow(u, P, st, channel, ct, ad, orderId) {
  const r = [];
  r[BC['id']] = 'B' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase(); r[BC['생성시각']] = new Date(); r[BC['상품']] = P.name; r[BC['상태']] = st;
  r[BC['주문번호']] = orderId || ''; r[BC['카카오id']] = u.k; r[BC['채널']] = channel; r[BC['연락처']] = cellSafe(ct.norm); r[BC['연락처가림']] = ct.mask;
  r[BC['연락처확인값']] = hashOf(ct.norm); r[BC['광고동의']] = !!ad; r[BC['발송수']] = 0;
  ['시작일', '만료일', '최근발송일', '만료알림', '해지일', '환불상태', '환불요청시각', '메모', '결제액', '다음요금제', '중개사번호', '중개사확인',
   '아침광고동의', '아침광고동의시각', '아침광고철회시각', '광고확인시각', '광고동의시각', '광고철회시각'].forEach(h => r[BC[h]] = '');
  const cs = bConsentOf(u.k);                // 광고 동의 2가지는 사람 단위: 이미 동의했으면 새 행도 그대로 이어받음(바꾸기는 bConsentApply)
  r[BC['광고동의']] = cs.ad.on; r[BC['광고동의시각']] = cs.ad.at || ''; r[BC['광고철회시각']] = cs.ad.off || '';
  r[BC['아침광고동의']] = cs.am.on; r[BC['아침광고동의시각']] = cs.am.at || ''; r[BC['아침광고철회시각']] = cs.am.off || ''; r[BC['광고확인시각']] = cs.chk || '';
  bSheet().appendRow(BH.map((h, i) => r[i] === undefined ? '' : r[i]));
  return r[BC['id']];
}
function briefCommon(b) {
  const u = sessionUser(b.s);
  const channel = b.channel === 'kakao' ? 'kakao' : b.channel === 'email' ? 'email' : '';
  if (!channel) throw new Error('받을 방법(카카오톡 또는 이메일)을 골라 주세요.');
  if (channel === 'kakao' && !briefChannels().kakao) throw new Error('카카오톡 발송은 준비 중이에요. 지금은 이메일로 받아 주세요.');
  const ct = briefContact(channel, b.contact);
  if (!ct) throw new Error(channel === 'kakao' ? '카카오톡을 받을 휴대폰 번호를 정확히 입력해 주세요.' : '받을 이메일 주소를 정확히 입력해 주세요.');
  if (!b.privacy) throw new Error('발송용 연락처 수집·이용에 동의해 주세요.');
  const br = cleanBrief(u.data && u.data.brief, bLim(bIsAdmin(u.k)));
  if (!br.areas.length) throw new Error('받을 동네를 먼저 하나 이상 골라 저장해 주세요.');
  const tri = v => v === true ? true : v === false ? false : null;
  return { u: u, channel: channel, ct: ct, ad: tri(b.ad), br: br, amAd: tri(b.amAd) };
}

/* 7일 무료 체험 (카카오 계정당 1번) */
function briefTrial(b) {
  const c = briefCommon(b);
  if (myBriefs(c.u.k).some(o => bIsTrial(o.r[BC['상품']]))) throw new Error('무료 체험은 계정마다 한 번만 쓸 수 있어요. 이용권으로 이어서 받아 보세요.');
  if (myBriefs(c.u.k).some(o => briefState(o, new Date()).active)) throw new Error('이미 받고 있는 브리핑이 있어요.');
  const ref = bRefNote(c.u.k, b.ref);
  const id = newBriefRow(c.u, BRIEF_TRIAL, BST.trial, c.channel, c.ct, c.ad, '');
  let dp = ''; if (b.dp && (DONGNE_ENABLED || bIsAdmin(c.u.k))) try { dp = dpAttrib(c.u.k, b.dp); } catch (e) { dp = ''; }   // v50 동네 파트너 초대 링크로 온 사람
  bConsentApply(c.u.k, { ad: c.ad, am: c.amAd }, '구독 신청 화면');
  const o = bRows().find(x => String(x.r[BC['id']]) === id), t = kstToday();
  setB(o.row, '시작일', ymd(t)); setB(o.row, '만료일', ymd(addDays(t, BRIEF_TRIAL.days - 1)));
  return { ok: true, ref: ref, dp: dp, sub: briefState(bRows().find(x => String(x.r[BC['id']]) === id), new Date()) };
}

/* 이용권 주문 만들기: '주문' 시트(기존 결제 흐름) + '브리핑구독' 결제대기 행 */
function briefOrder(b) {
  const P = BRIEF_PRICE[b.product];
  if (!P || !P.show) throw new Error('상품을 다시 골라 주세요.');
  if (!b.agree) throw new Error('이용권·환불 안내에 동의해 주세요.');
  const bn = P.broker ? bBrokerNo(b.broker) : null;
  if (bn && !bn.ok) throw new Error(bn.err + ' 중개사 요금제는 중개사 전용 할인가라서 등록번호를 확인해요.');
  const c = briefCommon(b);
  const cache = CacheService.getScriptCache(), ck = 'bo:' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMddHHmm');
  const n = Number(cache.get(ck) || 0);
  if (n >= 30) throw new Error('잠시 후 다시 시도해 주세요.');
  cache.put(ck, String(n + 1), 120);
  const id = newOrderId();
  const names = c.br.areas.slice(0, P.areas).map(a => a.gn + (a.dn ? ' ' + a.dn : '')).join(', ');
  const row = [];
  row[OC['주문번호']] = id; row[OC['생성시각']] = new Date(); row[OC['상품']] = P.name;
  row[OC['단지키']] = JSON.stringify(c.br.areas.slice(0, P.areas).map(a => a.g + (a.dn ? '|' + a.dn : ''))); row[OC['단지명']] = names.slice(0, 300);
  row[OC['금액']] = P.amount; row[OC['상태']] = ST.wait;
  row[OC['연락처']] = c.ct.mask; row[OC['연락처확인값']] = hashOf(c.ct.norm);
  ['결제키', '결제수단', '승인시각', '열람토큰', '최초열람시각', '최근열람시각', '환불상태', '환불요청시각', '환불사유', '메모'].forEach(h => row[OC[h]] = '');
  row[OC['열람횟수']] = 0;
  orderSheet().appendRow(row);
  const bid = newBriefRow(c.u, P, BST.wait, c.channel, c.ct, c.ad, id);
  bConsentApply(c.u.k, { ad: c.ad, am: c.amAd }, '구독 신청 화면');
  if (bn) { const o = bRows().find(x => String(x.r[BC['id']]) === bid); setB(o.row, '중개사번호', cellSafe(bn.norm)); setB(o.row, '중개사확인', BROKER_REVIEW.wait); }
  return { ok: true, orderId: id, amount: P.amount, orderName: ('집코드 ' + P.name).slice(0, 100), ref: bRefNote(c.u.k, b.ref) };
}

/* 결제 승인 → 이용권 시작(이미 받고 있으면 그 끝난 다음 날부터) */
function briefConfirm(b) {
  const paymentKey = str(b.paymentKey, 200), amount = Number(b.amount);
  if (!paymentKey || !/^[A-Za-z0-9_\-=.]+$/.test(paymentKey)) throw new Error('결제 정보가 올바르지 않아요.');
  const o = findRow(b.orderId);
  if (!o) throw new Error('주문을 찾지 못했어요.');
  if (String(o.r[OC['상품']]).slice(-BRIEF_CHG_SUFFIX.length) === BRIEF_CHG_SUFFIX) return briefChangeConfirm(b, o, paymentKey, amount);
  const pk = bProdKey(o.r[OC['상품']]);
  if (!BRIEF_PRICE[pk]) throw new Error(BRIEF_NAME + ' 주문이 아니에요.');
  const P = BRIEF_PRICE[pk];
  const subOf = () => bRows().find(x => String(x.r[BC['주문번호']]) === String(o.r[OC['주문번호']]));
  if (String(o.r[OC['상태']]) === ST.paid) {
    if (!safeEq(o.r[OC['결제키']], paymentKey)) throw new Error('이미 처리된 주문이에요.');
    const s0 = subOf(); return { ok: true, orderId: String(o.r[OC['주문번호']]), sub: s0 ? briefState(s0, new Date()) : null };
  }
  if (String(o.r[OC['상태']]) !== ST.wait && String(o.r[OC['상태']]) !== ST.fail) throw new Error('처리할 수 없는 주문 상태예요.');
  if (!(amount === Number(o.r[OC['금액']]) && amount === P.amount)) {
    withLock(() => { setO(o.row, '상태', ST.bad); setO(o.row, '메모', `요청 금액 ${amount} / 주문 금액 ${o.r[OC['금액']]}`); });
    throw new Error('결제 금액이 주문 금액과 달라 승인하지 않았어요. 결제는 진행되지 않았어요.');
  }
  let res = tossCall('confirm', { paymentKey: paymentKey, orderId: String(o.r[OC['주문번호']]), amount: amount }, 'confirm-' + o.r[OC['주문번호']]);
  if (res.code !== 200 && res.j && res.j.code === 'ALREADY_PROCESSED_PAYMENT') res = tossCall(encodeURIComponent(paymentKey));
  const j = res.j || {};
  return withLock(() => {
    const o2 = findRow(b.orderId);
    if (res.code !== 200 || j.status !== 'DONE') {
      setO(o2.row, '상태', ST.fail); setO(o2.row, '메모', str((j.code || j.status || '') + ' ' + (j.message || ''), 200));
      return { ok: false, code: str(j.code || j.status, 60), err: str(j.message, 200) || '결제가 완료되지 않았어요.' };
    }
    if (String(j.orderId) !== String(o2.r[OC['주문번호']]) || Number(j.totalAmount) !== P.amount) {
      setO(o2.row, '상태', ST.bad); setO(o2.row, '메모', '승인 응답 금액/주문번호 불일치 — 토스 상점관리자에서 확인·취소 필요');
      throw new Error('결제 확인 중 문제가 생겼어요. 운영자가 확인 후 연락드리거나 취소해 드려요.');
    }
    setO(o2.row, '결제키', paymentKey); setO(o2.row, '결제수단', str(j.method, 30)); setO(o2.row, '상태', ST.paid);
    setO(o2.row, '승인시각', j.approvedAt ? new Date(j.approvedAt) : new Date()); setO(o2.row, '메모', '');
    const s = subOf();
    if (!s) throw new Error('구독 정보를 찾지 못했어요. 고객문의로 주문번호를 알려 주세요.');
    const k = String(s.r[BC['카카오id']]), t = kstToday(), le = lastEnd(k);
    const start = le && le >= t ? addDays(le, 1) : t;
    setB(s.row, '상태', BST.on); setB(s.row, '시작일', ymd(start)); setB(s.row, '만료일', ymd(addDays(start, P.days - 1))); setB(s.row, '결제액', P.amount);
    if (P.broker) briefBrokerMail(s, P);
    const rw = bRefReward(k);
    return { ok: true, orderId: String(o2.r[OC['주문번호']]), sub: briefState(subOf(), new Date()), reward: rw };
  });
}

/* v48 운영자 모드 켜기: ① 로그인한 회원이 [운영자 모드 켜기] → 스크립트 주인 메일로 1회용 링크(30분, 해시만 저장, 누른 카카오 계정 기억)
   ② 그 링크(구독 관리 화면 #adm=…)를 같은 계정으로 카카오 간편 로그인한 채 열면 BRIEF_ADMIN_IDS 에 더함. 메일을 받는 사람(시트 주인)만 켤 수 있어요. */
function briefAdminMail(b) {
  const u = sessionUser(b.s);
  if (bIsAdmin(u.k)) return { ok: true, already: true };
  const c = CacheService.getScriptCache(), n = Number(c.get('brAM')) || 0;
  if (n >= 3) return { ok: false, err: '방금 보냈어요. 메일함을 확인하거나 1시간 뒤에 다시 눌러 주세요.' };
  c.put('brAM', String(n + 1), 3600);
  const t = newToken(), P = PropertiesService.getScriptProperties();
  P.setProperty('BRIEF_ADM_LINK', JSON.stringify({ h: hashOf('bral|' + t), k: u.k, exp: Date.now() + BRIEF_ADM_LINK_MIN * 60000 }));
  const url = BRIEF_WEB + 'manage/#adm=' + t;
  try {
    MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), subject: `[${SITE_NAME}] 모닝 브리핑 운영자 모드 켜기 링크`, name: SITE_NAME,
      body: `카카오 닉네임 '${String(u.nick || '').slice(0, 30)}' 계정을 운영자로 켜는 링크예요(${BRIEF_ADM_LINK_MIN}분 동안 한 번만 쓸 수 있어요).
${url}

` +
        `운영자가 되면 모닝 브리핑 받는 지역·관심 단지 수 제한이 없어져요(요금제·결제와는 상관없어요).
` +
        `이 링크는 버튼을 누른 그 계정으로 카카오 간편 로그인한 화면에서만 켜져요.
직접 누르지 않았다면 이 메일은 지워 주세요.` });
  } catch (e) { return { ok: false, err: '메일을 보내지 못했어요. 잠시 뒤 다시 눌러 주세요.' }; }
  return { ok: true, sent: true };
}
function briefAdminEnter(b) {
  const u = sessionUser(b.s), t = String(b.t || ''), P = PropertiesService.getScriptProperties(), L = parseJ(P.getProperty('BRIEF_ADM_LINK'), null);
  if (!/^[0-9a-f]{64}$/.test(t) || !L || !(Number(L.exp) > Date.now()) || !safeEq(String(L.h), hashOf('bral|' + t))) return { ok: false, err: '링크가 맞지 않거나 시간이 지났어요. 구독 관리 화면에서 [운영자 모드 켜기]를 다시 눌러 주세요.' };
  if (String(L.k) !== u.k) return { ok: false, err: '[운영자 모드 켜기]를 누른 그 계정으로 카카오 간편 로그인한 뒤 메일의 링크를 다시 열어 주세요.' };
  P.setProperty('BRIEF_ADM_LINK', '');
  const ids = bAdminIds(); if (ids.indexOf(u.k) < 0) ids.push(u.k);
  P.setProperty('BRIEF_ADMIN_IDS', JSON.stringify(ids));
  return { ok: true, adm: true, lim: BRIEF_ADMIN_LIM };
}
function briefAdminOff(b) {
  const u = sessionUser(b.s), P = PropertiesService.getScriptProperties();
  P.setProperty('BRIEF_ADMIN_IDS', JSON.stringify(bAdminIds().filter(x => x !== u.k)));
  /* 저장된 지역·단지가 요금제 최대보다 많으면 그대로 두지만 발송은 요금제 수까지만(briefState) — 다음 저장 때 정리됨 */
  return { ok: true, adm: false };
}

function briefMine(b) {
  const u = sessionUser(b.s), now = new Date();
  const list = myBriefs(u.k).filter(o => String(o.r[BC['상태']]) !== BST.wait).map(o => briefState(o, now));
  const adm = bIsAdmin(u.k);
  return { ok: true, subs: list, brief: cleanBrief(u.data && u.data.brief, bLim(adm)), channels: briefChannels(), adm: adm, admLim: adm ? BRIEF_ADMIN_LIM : null,
    trialUsed: myBriefs(u.k).some(o => bIsTrial(o.r[BC['상품']])), next: (list.filter(x => x.next).pop() || {}).next || '', amAd: bConsentPublic(u.k).am, adc: bConsentPublic(u.k).ad,
    bill: (() => { try { return baBillPub(u.k); } catch (e) { return { on: false, st: '' }; } })() };   // v50 자동결제 상태(빌링키 없음)
}
function mySub(u, id) {
  const o = myBriefs(u.k).find(x => String(x.r[BC['id']]) === String(id || ''));
  if (!o) throw new Error('구독 정보를 찾지 못했어요.');
  return o;
}
/* 받는 방법·연락처·광고 동의 바꾸기 (동네는 userSave 의 brief.areas 로) */
function briefUpdate(b) {
  const u = sessionUser(b.s), o = mySub(u, b.id);
  const channel = b.channel === 'kakao' ? 'kakao' : 'email';
  if (channel === 'kakao' && !briefChannels().kakao) throw new Error('카카오톡 발송은 준비 중이에요.');
  if (b.contact != null && String(b.contact).trim()) {
    const ct = briefContact(channel, b.contact);
    if (!ct) throw new Error(channel === 'kakao' ? '휴대폰 번호를 정확히 입력해 주세요.' : '이메일 주소를 정확히 입력해 주세요.');
    setB(o.row, '연락처', cellSafe(ct.norm)); setB(o.row, '연락처가림', ct.mask); setB(o.row, '연락처확인값', hashOf(ct.norm));
  } else if (channel !== String(o.r[BC['채널']])) throw new Error('받는 방법을 바꾸면 새 연락처를 입력해 주세요.');
  setB(o.row, '채널', channel);
  if (b.ad != null) bConsentApply(u.k, { ad: !!b.ad }, '내 구독 관리');
  return { ok: true, sub: briefState(mySub(u, b.id), new Date()) };
}
/* 해지 = 발송 중단(자동 결제가 없어 다음 결제도 없음). 남은 기간 환불은 briefRefund */
function briefStop(b) {
  const u = sessionUser(b.s), o = mySub(u, b.id);
  setB(o.row, '상태', BST.stop); setB(o.row, '해지일', new Date());
  try { baStopAll(u.k); } catch (e) {}                    // v50 구독을 해지하면 자동결제도 함께 멈춤
  return { ok: true, sub: briefState(mySub(u, b.id), new Date()) };
}
function briefRefund(b) {
  const u = sessionUser(b.s), o = mySub(u, b.id), now = new Date(), s = briefState(o, now);
  if (!s.orderId) throw new Error('무료 체험은 환불할 금액이 없어요.');
  if (s.refund) return { ok: true, sub: s, already: true };
  const reason = str(b.reason, 300);
  setB(o.row, '환불상태', `요청(예정 ${s.refundEst.toLocaleString()}원)`); setB(o.row, '환불요청시각', now);
  if (s.state !== BST.stop) { setB(o.row, '상태', BST.stop); setB(o.row, '해지일', now); }
  const ord = findRow(s.orderId);
  if (ord) { setO(ord.row, '환불상태', `브리핑 환불 요청(예정 ${s.refundEst.toLocaleString()}원)`); setO(ord.row, '환불요청시각', now); setO(ord.row, '환불사유', reason); }
  try {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[${SITE_NAME} 결제] ${BRIEF_NAME} 환불 요청 ${s.orderId}`,
      `주문번호 ${s.orderId}${String(o.r[BC['메모']] || '') ? ' (' + String(o.r[BC['메모']]) + ')' : ''}\n상품 ${s.product}\n이용 기간 ${s.start} ~ ${s.end} (남은 날 ${s.left}일, 보낸 브리핑 ${s.sent}회)\n`
      + `환불 예정액 ${s.refundEst.toLocaleString()}원 (첫 브리핑 전이면 전액, 이용 중이면 남은 날만큼 일할)\n사유: ${reason || '(없음)'}\n\n`
      + `처리: 토스페이먼츠 상점관리자 → 결제 내역에서 주문번호로 찾아 '부분 취소'(예정액) 또는 '전액 취소' → '브리핑구독'·'주문' 시트 환불상태를 '환불완료'로.\n${book().getUrl()}`);
  } catch (e) {}
  return { ok: true, sub: briefState(mySub(u, b.id), now) };
}

/* ---------- 요금제 바꾸기 (v26) ----------
   · 올리기(더 비싼 요금제): 오늘 바로 바뀜. 지금 이용권의 남은 날만큼 차액만 결제(서버가 계산, bChangeAmt).
     결제 승인 뒤 이전 행은 '변경'(발송·환불 대상 아님), 새 요금제 행이 같은 끝날까지 이어받음(보낸 횟수·낸 돈 합계도 이어받음).
     차액이 100원 미만(남은 날이 아주 짧을 때)이면 결제 없이 바로 바꿔 드림.
   · 내리기(더 싼 요금제): 지금 이용권은 끝날까지 그대로, 다음 이용권부터 바뀜('다음요금제' 칸에 적어 두고 신청 화면·만료 안내에 반영). 자동 결제는 없음.
   · 환불은 지금처럼 요청만 받고 운영자가 처리(자동 환불 없음). */
function briefChangePlan(u, b) {
  const o = mySub(u, b.id), s = briefState(o, new Date());
  if (s.state !== BST.on || !s.orderId) throw new Error('결제한 이용권을 받는 중일 때만 요금제를 바꿀 수 있어요. 무료 체험 중이면 신청 화면에서 이용권을 골라 주세요.');
  if (s.left <= 0) throw new Error('이용 기간이 끝났어요. 신청 화면에서 새 이용권을 골라 주세요.');
  const cur = BRIEF_PRICE[s.tier], nxt = BRIEF_PRICE[b.product];
  if (!cur || !nxt || !nxt.show) throw new Error('바꿀 요금제를 다시 골라 주세요.');
  const up = nxt.amount > cur.amount && nxt.id !== cur.id;
  return { o: o, s: s, cur: cur, nxt: nxt, up: up, amount: up ? bChangeAmt(cur, nxt, s.left) : 0 };
}
function bHasBroker(o) { return !!String(o.r[BC['중개사번호']] || '').replace(/^'/, ''); }
/* 결제 전에 보여 줄 금액·바뀌는 때 */
function briefChangeQuote(b) {
  const u = sessionUser(b.s), c = briefChangePlan(u, b);
  if (c.nxt.id === c.cur.id) return { ok: true, kind: 'same', to: c.nxt.id, label: c.nxt.label };
  if (!c.up) return { ok: true, kind: 'next', to: c.nxt.id, label: c.nxt.label, from: c.cur.label, at: ymd(addDays(dOnly(c.s.end), 1)), end: c.s.end, amount: 0 };
  return { ok: true, kind: 'now', to: c.nxt.id, label: c.nxt.label, from: c.cur.label, left: c.s.left, end: c.s.end, amount: c.amount,
    free: c.amount < BRIEF_MIN_PAY, monthly: { from: c.cur.amount, to: c.nxt.amount }, broker: !!c.nxt.broker && !bHasBroker(c.o) };
}
/* 바꾸기 실행: 내리기 = 다음 요금제만 적어 둠 · 올리기 = 차액 주문 만들기(차액이 아주 작으면 바로 바꿈) */
function briefChange(b) {
  const u = sessionUser(b.s), c = briefChangePlan(u, b);
  if (c.nxt.id === c.cur.id) { setB(c.o.row, '다음요금제', ''); return { ok: true, kind: 'same', sub: briefState(mySub(u, b.id), new Date()) }; }
  if (!c.up) { setB(c.o.row, '다음요금제', c.nxt.id); return { ok: true, kind: 'next', sub: briefState(mySub(u, b.id), new Date()) }; }
  if (!b.agree) throw new Error('요금제 바꾸기·환불 안내에 동의해 주세요.');
  const bn = c.nxt.broker && (String(b.broker || '').trim() || !bHasBroker(c.o)) ? bBrokerNo(b.broker) : null;   // 이미 적어 둔 등록번호가 있으면 그대로 씀
  if (bn && !bn.ok) throw new Error(bn.err + ' 중개사 요금제는 중개사 전용 할인가라서 등록번호를 확인해요.');
  if (c.amount < BRIEF_MIN_PAY) { const id = bApplyChange(c.o, c.nxt, 0, '', bn); return { ok: true, kind: 'now', free: true, sub: briefState(bRows().find(x => String(x.r[BC['id']]) === id), new Date()) }; }
  const id = newOrderId(), row = [];
  row[OC['주문번호']] = id; row[OC['생성시각']] = new Date(); row[OC['상품']] = c.nxt.name + BRIEF_CHG_SUFFIX;
  row[OC['단지키']] = JSON.stringify({ sub: c.s.id, from: c.cur.id, to: c.nxt.id, left: c.s.left, broker: bn ? bn.norm : '' });
  row[OC['단지명']] = `${c.cur.label} → ${c.nxt.label} (남은 ${c.s.left}일, ~${c.s.end})`;
  row[OC['금액']] = c.amount; row[OC['상태']] = ST.wait;
  row[OC['연락처']] = String(c.o.r[BC['연락처가림']]); row[OC['연락처확인값']] = String(c.o.r[BC['연락처확인값']]);
  ['결제키', '결제수단', '승인시각', '열람토큰', '최초열람시각', '최근열람시각', '환불상태', '환불요청시각', '환불사유', '메모'].forEach(h => row[OC[h]] = '');
  row[OC['열람횟수']] = 0;
  orderSheet().appendRow(row);
  return { ok: true, kind: 'now', orderId: id, amount: c.amount, orderName: ('집코드 ' + c.nxt.name + BRIEF_CHG_SUFFIX).slice(0, 100) };
}
/* 올리기 적용: 이전 행 '변경' + 새 요금제 행(같은 끝날·연락처·보낸 횟수, 낸 돈 = 이전 낸 돈 + 차액) → 새 행 id */
function bApplyChange(o, nxt, amount, orderId, bn) {
  const r = o.r, pv = r[BC['결제액']], prevPaid = pv === '' || pv == null ? (BRIEF_PRICE[bProdKey(r[BC['상품']])] || {}).amount || 0 : Number(pv) || 0;
  const t = kstToday(), s0 = dOnly(r[BC['시작일']]), start = s0 && s0 > t ? s0 : t;
  const n = r.slice();
  n[BC['id']] = 'B' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase(); n[BC['생성시각']] = new Date(); n[BC['상품']] = nxt.name; n[BC['상태']] = BST.on;
  n[BC['주문번호']] = orderId || String(r[BC['주문번호']]); n[BC['시작일']] = ymd(start); n[BC['결제액']] = prevPaid + amount; n[BC['다음요금제']] = '';
  n[BC['메모']] = `요금제 변경: ${String(r[BC['id']])}(주문 ${String(r[BC['주문번호']])})에서` + (amount ? ` · 차액 ${amount.toLocaleString()}원` : ' · 차액 없음');
  n[BC['중개사번호']] = bn ? cellSafe(bn.norm) : (nxt.broker ? String(r[BC['중개사번호']] || '') : '');
  n[BC['중개사확인']] = nxt.broker ? (bn && bn.norm !== String(r[BC['중개사번호']] || '').replace(/^'/, '') ? BROKER_REVIEW.wait : String(r[BC['중개사확인']] || BROKER_REVIEW.wait)) : '';
  ['환불상태', '환불요청시각', '해지일'].forEach(h => n[BC[h]] = '');
  bSheet().appendRow(BH.map((h, i) => n[i] === undefined ? '' : n[i]));
  setB(o.row, '상태', BST.chg); setB(o.row, '해지일', new Date()); setB(o.row, '메모', (String(r[BC['메모']] || '') + ` → ${n[BC['id']]}로 요금제 변경`).trim());
  const no = bRows().find(x => String(x.r[BC['id']]) === n[BC['id']]);
  if (nxt.broker) briefBrokerMail(no, nxt);
  return n[BC['id']];
}
/* 차액 결제 승인: 금액·날짜·이전 행 상태를 토스 승인 전에 다시 확인(맞지 않으면 승인하지 않아 돈이 나가지 않음) */
function briefChangeConfirm(b, o, paymentKey, amount) {
  const meta = parseJ(o.r[OC['단지키']], {}) || {}, nxt = BRIEF_PRICE[meta.to];
  const prev = () => bRows().find(x => String(x.r[BC['id']]) === String(meta.sub || ''));
  const newOf = () => bRows().find(x => String(x.r[BC['주문번호']]) === String(o.r[OC['주문번호']]));
  if (String(o.r[OC['상태']]) === ST.paid) {
    if (!safeEq(o.r[OC['결제키']], paymentKey)) throw new Error('이미 처리된 주문이에요.');
    const s0 = newOf(); return { ok: true, change: true, orderId: String(o.r[OC['주문번호']]), sub: s0 ? briefState(s0, new Date()) : null };
  }
  if (String(o.r[OC['상태']]) !== ST.wait && String(o.r[OC['상태']]) !== ST.fail) throw new Error('처리할 수 없는 주문 상태예요.');
  const p0 = prev(), made = o.r[OC['생성시각']] instanceof Date ? o.r[OC['생성시각']] : new Date(o.r[OC['생성시각']]);
  const stop = why => { withLock(() => { setO(o.row, '상태', ST.bad); setO(o.row, '메모', why); }); throw new Error('요금제를 바꾸지 못했어요. 결제는 진행되지 않았어요. ' + why); };
  if (!nxt || !p0 || String(p0.r[BC['상태']]) !== BST.on || bProdKey(p0.r[BC['상품']]) !== meta.from) stop('이용권 상태가 바뀌었어요. 내 구독 관리에서 다시 해 주세요.');
  if (ymd(made) !== ymd(new Date())) stop('주문한 날이 지나 남은 날 수가 바뀌었어요. 다시 해 주세요.');
  const exp = bChangeAmt(BRIEF_PRICE[meta.from], nxt, briefState(p0, new Date()).left);
  if (!(amount === Number(o.r[OC['금액']]) && amount === exp)) stop(`결제 금액이 차액과 달라요(요청 ${amount}원 / 차액 ${exp}원).`);
  let res = tossCall('confirm', { paymentKey: paymentKey, orderId: String(o.r[OC['주문번호']]), amount: amount }, 'confirm-' + o.r[OC['주문번호']]);
  if (res.code !== 200 && res.j && res.j.code === 'ALREADY_PROCESSED_PAYMENT') res = tossCall(encodeURIComponent(paymentKey));
  const j = res.j || {};
  return withLock(() => {
    const o2 = findRow(b.orderId);
    if (res.code !== 200 || j.status !== 'DONE') {
      setO(o2.row, '상태', ST.fail); setO(o2.row, '메모', str((j.code || j.status || '') + ' ' + (j.message || ''), 200));
      return { ok: false, code: str(j.code || j.status, 60), err: str(j.message, 200) || '결제가 완료되지 않았어요.' };
    }
    if (String(j.orderId) !== String(o2.r[OC['주문번호']]) || Number(j.totalAmount) !== amount) {
      setO(o2.row, '상태', ST.bad); setO(o2.row, '메모', '승인 응답 금액/주문번호 불일치 — 토스 상점관리자에서 확인·취소 필요');
      throw new Error('결제 확인 중 문제가 생겼어요. 운영자가 확인 후 연락드리거나 취소해 드려요.');
    }
    setO(o2.row, '결제키', paymentKey); setO(o2.row, '결제수단', str(j.method, 30)); setO(o2.row, '상태', ST.paid);
    setO(o2.row, '승인시각', j.approvedAt ? new Date(j.approvedAt) : new Date()); setO(o2.row, '메모', '');
    const bn = meta.broker ? bBrokerNo(meta.broker) : null;
    bApplyChange(prev(), nxt, amount, String(o2.r[OC['주문번호']]), bn && bn.ok ? bn : null);
    return { ok: true, change: true, orderId: String(o2.r[OC['주문번호']]), sub: briefState(newOf(), new Date()) };
  });
}
/* 중개사용 시작 알림(운영자 메일) — 등록번호를 직접 확인하고 '중개사확인' 칸을 '확인됨' 또는 '확인 안 됨'으로 바꿔 주세요 */
function briefBrokerMail(o, P) {
  if (!o) return;
  try {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[${SITE_NAME}] ${BRIEF_NAME} 중개사용 등록번호 확인 ${String(o.r[BC['id']])}`,
      `${P.name}\n구독 id ${String(o.r[BC['id']])} · 주문 ${String(o.r[BC['주문번호']])}\n중개사무소 등록번호 ${String(o.r[BC['중개사번호']] || '(없음)').replace(/^'/, '')}\n\n`
      + `국가공간정보포털 '부동산중개업 조회' 등에서 직접 확인한 뒤 '브리핑구독' 시트의 '중개사확인' 칸을 '${BROKER_REVIEW.ok}' 또는 '${BROKER_REVIEW.no}'으로 바꿔 주세요.\n`
      + `확인되지 않으면 연락해 일반 요금제로 바꾸거나 환불을 안내해요(자동 처리 없음).\n${book().getUrl()}`);
  } catch (e) {}
}

/* ---------- 친구 초대 보상 (v26) ----------
   · 유료 이용권을 산 적이 있는 회원(환불한 것 제외)이 초대 링크(브리핑 주소 ?ref=코드)를 보냄. 코드 = 카카오 id 해시 앞 8자리(id 원문 없음).
   · 초대받은 사람이 체험·주문할 때 코드가 함께 오면 '브리핑초대' 시트에 [대기]로 적음. 그 사람이 처음으로 유료 결제를 마치면(briefConfirm)
     두 사람 모두 1개월 무료 = 다음 결제를 1개월 미룸(지금 이용권 끝난 다음 날부터 30일짜리 0원 이용권을 붙임). 현금 환급 없음.
   · 남용 방지: 초대받는 사람은 카카오 계정당 한 번만 · 자기 자신 초대 안 됨 · 이미 유료로 쓴 적 있는 사람은 대상 아님 ·
     무료 체험만 하고 결제하지 않으면 보상 없음 · 한 사람이 받는 보상은 최근 1년(365일) 12개월까지. */
const SH_BR = '브리핑초대';
const BRH = ['시각', '초대코드', '초대한id', '받은id', '상태', '처리일', '초대한보상', '받은보상', '메모'];
const BRC = Object.fromEntries(BRH.map((h, i) => [h, i]));
const BRIEF_REF = { months: 1, days: 30, yearMax: 12 };
function brSheet() { return uSheet(SH_BR, BRH); }
function brRows() { const v = brSheet().getDataRange().getValues(), out = []; for (let i = 1; i < v.length; i++) if (v[i][BRC['초대코드']]) out.push({ row: i + 1, r: v[i] }); return out; }
function bRefCode(k) { return 'R' + hashOf('ref|' + k).slice(1, 9).toUpperCase(); }
/* 유료 이용권을 산 적이 있음(환불한 것·결제대기 제외, 초대 보상 이용권 제외) */
function bPaidEver(k) {
  return myBriefs(k).some(o => String(o.r[BC['주문번호']] || '') && [BST.on, BST.chg, BST.stop].indexOf(String(o.r[BC['상태']])) >= 0 && !String(o.r[BC['환불상태']] || ''));
}
/* 최근 365일 받은 보상 개월 수 */
function bRefUsed(k, now) {
  const lo = addDays(now || new Date(), -365);
  return brRows().reduce((n, x) => {
    const d = x.r[BRC['처리일']] instanceof Date ? x.r[BRC['처리일']] : new Date(x.r[BRC['처리일']]);
    if (!(d >= lo)) return n;
    return n + (String(x.r[BRC['초대한id']]) === k && String(x.r[BRC['초대한보상']]) === '1개월' ? 1 : 0) + (String(x.r[BRC['받은id']]) === k && String(x.r[BRC['받은보상']]) === '1개월' ? 1 : 0);
  }, 0);
}
/* 초대 링크 만들기(유료 이용자만) */
function briefInvite(b) {
  const u = sessionUser(b.s);
  if (!bPaidEver(u.k)) throw new Error('유료 이용권을 쓰는 분만 친구를 초대할 수 있어요.');
  const code = bRefCode(u.k), used = bRefUsed(u.k);
  const done = brRows().filter(x => String(x.r[BRC['초대한id']]) === u.k && String(x.r[BRC['상태']]) === '지급').length;
  const wait = brRows().filter(x => String(x.r[BRC['초대한id']]) === u.k && String(x.r[BRC['상태']]) === '대기').length;
  return { ok: true, code: code, url: BRIEF_WEB + '?ref=' + code, done: done, wait: wait, used: used, left: Math.max(0, BRIEF_REF.yearMax - used) };
}
/* 초대받은 사람이 체험·주문할 때: 조건이 맞으면 [대기]로 적고 이유를 돌려줌(체험·주문은 그대로 진행) */
function bRefNote(k, ref) {
  ref = String(ref || '').trim().toUpperCase();
  if (!/^R[0-9A-F]{8}$/.test(ref)) return '';
  const seenK = {}; let inviter = '';
  bRows().some(o => { const kk = String(o.r[BC['카카오id']]); if (seenK[kk]) return false; seenK[kk] = 1; if (bRefCode(kk) === ref) { inviter = kk; return true; } return false; });
  if (!inviter) return 'none';
  if (inviter === k) return 'self';
  if (brRows().some(x => String(x.r[BRC['받은id']]) === k)) return 'once';
  if (bPaidEver(k)) return 'paid';
  if (!bPaidEver(inviter)) return 'none';
  const r = []; r[BRC['시각']] = new Date(); r[BRC['초대코드']] = ref; r[BRC['초대한id']] = inviter; r[BRC['받은id']] = k; r[BRC['상태']] = '대기';
  ['처리일', '초대한보상', '받은보상', '메모'].forEach(h => r[BRC[h]] = '');
  brSheet().appendRow(BRH.map((h, i) => r[i] === undefined ? '' : r[i]));
  return 'ok';
}
/* 초대받은 사람이 처음 유료 결제를 마쳤을 때(잠금 안): 두 사람에게 1개월씩(연 12개월 한도) */
function bRefReward(k) {
  const x = brRows().find(y => String(y.r[BRC['받은id']]) === k && String(y.r[BRC['상태']]) === '대기');
  if (!x) return null;
  const inviter = String(x.r[BRC['초대한id']]), now = new Date();
  const give = who => bRefUsed(who, now) < BRIEF_REF.yearMax && bGrantMonth(who) ? '1개월' : '연 한도';
  const a = give(inviter), c = give(k);
  brSheet().getRange(x.row, BRC['상태'] + 1).setValue('지급'); brSheet().getRange(x.row, BRC['처리일'] + 1).setValue(now);
  brSheet().getRange(x.row, BRC['초대한보상'] + 1).setValue(a); brSheet().getRange(x.row, BRC['받은보상'] + 1).setValue(c);
  return { inviter: a, me: c };
}
/* 1개월 무료 = 다음 결제 1개월 미룸: 가장 늦게 끝나는 이용권 다음 날(없으면 오늘)부터 30일짜리 0원 이용권. 요금제·연락처는 가장 최근 유료 이용권 그대로 */
function bGrantMonth(k) {
  const rows = myBriefs(k).filter(o => [BST.on, BST.chg, BST.stop].indexOf(String(o.r[BC['상태']])) >= 0 && BRIEF_PRICE[bProdKey(o.r[BC['상품']])]);
  if (!rows.length) return false;
  const last = rows.slice().sort((p, q) => (dOnly(p.r[BC['만료일']]) || 0) - (dOnly(q.r[BC['만료일']]) || 0)).pop();
  const t = kstToday(), le = lastEnd(k), start = le && le >= t ? addDays(le, 1) : t;
  const n = last.r.slice(), P = BRIEF_PRICE[bProdKey(last.r[BC['상품']])];
  n[BC['id']] = 'B' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase(); n[BC['생성시각']] = new Date(); n[BC['상품']] = P.name; n[BC['상태']] = BST.on;
  n[BC['주문번호']] = ''; n[BC['시작일']] = ymd(start); n[BC['만료일']] = ymd(addDays(start, BRIEF_REF.days - 1)); n[BC['결제액']] = 0; n[BC['발송수']] = 0;
  n[BC['메모']] = '친구 초대 보상(1개월 무료, 현금 환급 없음)'; n[BC['다음요금제']] = '';
  ['최근발송일', '만료알림', '해지일', '환불상태', '환불요청시각'].forEach(h => n[BC[h]] = '');
  bSheet().appendRow(BH.map((h, i) => n[i] === undefined ? '' : n[i]));
  return true;
}

/* ---------- 브리핑 광고·이른 아침 광고 동의 (v29, 정보통신망법 제50조) ----------
   · 브리핑 메일은 오전 7시대(8시 전)에 나가므로, 메일 안 광고는 '이른 아침(오전 7시) 브리핑 메일 속 광고 받기'에 따로 동의한 사람에게만(선택, 기본 꺼짐).
     동의하지 않아도 브리핑은 똑같이 받고, 광고는 웹 브리핑 화면에만 보임. 카카오 알림톡(정보성)에는 광고를 넣지 않음.
   · 동의·철회 일시는 '브리핑구독' 행(사람의 모든 행을 같게)에 남기고, 바뀔 때마다 처리 결과를 메일로 알림(제50조 제7항).
   · 메일 속 광고는 '광고성 정보 받기'(제50조 ①항)와 '이른 아침 광고 받기'(③항, 오후 9시~오전 8시 전송) 두 동의가 모두 켜졌을 때만. 이른 아침 동의는 광고성 정보 동의가 있어야 켜지고, 광고성 정보를 끄면 함께 꺼짐.
   · 2년마다 동의 사실 다시 알림(시행령 제62조의3, 두 동의 모두): 동의(또는 지난 확인)일부터 2년이 되면 아침 발송 뒤 안내 메일 + '아침광고확인시각'.
   · 광고가 들어간 날만 메일 제목 맨 앞 '(광고)', 본문 끝에 보낸 사람 정보와 원클릭 수신 거부 링크(briefAdOff).
   · 광고는 '브리핑광고' 시트(첫 사용 때 자동 생성)에 운영자가 한 줄씩: 시작일·종료일·광고주·제목(20자)·설명(60자)·https 링크·상태 '게재'. 하루 1개(맨 위 것).
   · v37: 판매는 1주(7일) 단위(1주 25만·4주 80만 원). 시작일~종료일이 7일보다 짧으면 [메모]에 경고·칸 표시·운영자 메일(노출은 그대로). */
const SH_BA = '브리핑광고', BAH = ['id', '시작일', '종료일', '광고주', '제목', '설명', '링크', '상태', '메모'];
const BAC = Object.fromEntries(BAH.map((h, i) => [h, i]));
const BRIEF_SENDER = { name: '(주)장대장부동산그룹', site: SITE_NAME, addr: '서울특별시 강남구 삼성로146길 10, 5층(청담동, 다인빌딩)', tel: '02-3444-5008', email: 'chris938@naver.com' };   // assets/biz.js 와 같게
const BRIEF_AM_RECHECK = 730;   // 일: 2년마다 동의 사실 다시 알림
/* 오늘 진행 중인 광고 1개(공개 정보만) */
/* v37: 게재 기간(시작일~종료일, 끝 날 포함) 일수. 날짜가 아니면 0. 1주(7일) 단위로만 팔므로 7 미만이면 경고 */
const BA_MIN_DAYS = 7;
function baDays(a, b) {
  const d = x => x instanceof Date ? ymd(x) : String(x || '').slice(0, 10), A = d(a), B = d(b);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(A) || !/^\d{4}-\d{2}-\d{2}$/.test(B)) return 0;
  return Math.round((Date.UTC(+B.slice(0, 4), +B.slice(5, 7) - 1, +B.slice(8, 10)) - Date.UTC(+A.slice(0, 4), +A.slice(5, 7) - 1, +A.slice(8, 10))) / 864e5) + 1;
}
const BA_WARN = '⚠ 7일 미만 — 브리핑 지면 광고는 1주(7일) 단위로만 팔아요. 시작일·종료일을 확인해 주세요';
/* '게재' 줄 중 기간이 7일 미만이면 [메모]에 경고를 남기고 칸을 빨갛게, 운영자에게 메일 한 번(같은 줄·같은 기간은 다시 안 보냄). 광고 노출은 막지 않음 */
function briefAdWarn(sh, v) {
  const bad = [];
  v.forEach((r, i) => {
    if (String(r[BAC['상태']]).trim() !== '게재') return;
    const n = baDays(r[BAC['시작일']], r[BAC['종료일']]);
    if (n >= BA_MIN_DAYS) return;
    const memo = String(r[BAC['메모']] || '');
    if (memo.indexOf(BA_WARN) < 0) {
      sh.getRange(i + 2, BAC['메모'] + 1).setValue((memo ? memo + ' / ' : '') + BA_WARN);
      sh.getRange(i + 2, BAC['시작일'] + 1, 1, 2).setBackground('#FDECE4');
      bad.push(`${i + 2}번째 줄 ${String(r[BAC['광고주']] || '')} · ${n}일`);
    }
  });
  if (bad.length && NOTIFY) { try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[${SITE_NAME}] 브리핑광고 기간이 7일보다 짧아요`, `브리핑 지면 광고는 1주(7일) 단위로만 팔아요. '브리핑광고' 시트에서 시작일·종료일을 확인해 주세요.\n\n${bad.join('\n')}\n\n${book().getUrl()}`); } catch (e) {} }
  return bad;
}
function briefAdToday(now) {
  const sh = uSheet(SH_BA, BAH), t = ymd(now || new Date());
  const v = sh.getDataRange().getValues().slice(1);
  try { briefAdWarn(sh, v); } catch (e) {}
  for (let i = 0; i < v.length; i++) {
    const r = v[i], d = x => x instanceof Date ? ymd(x) : String(x || '').slice(0, 10);
    if (String(r[BAC['상태']]).trim() !== '게재' || !(d(r[BAC['시작일']]) <= t && t <= d(r[BAC['종료일']]))) continue;
    const title = uText(r[BAC['제목']], 20), desc = uText(r[BAC['설명']], 60), url = String(r[BAC['링크']] || '').trim(), adv = uText(r[BAC['광고주']], 30);
    if (!title || !adv || !/^https:\/\/[^\s<>"']{4,300}$/.test(url)) continue;
    return { id: String(r[BAC['id']] || ('A' + (i + 2))), adv: adv, title: title, desc: desc, url: url };
  }
  return null;
}
/* 이 웹 앱 주소(수신 거부 링크용). 못 읽으면 사이트 assets/agents.js 의 주소 */
function bApi() { try { const u = ScriptApp.getService().getUrl(); if (u) return u; } catch (e) {} return 'https://script.google.com/macros/s/AKfycbyFwqwleAfwHoVSfWHyFVnszvc0fCjsG-WcEVkxRqUz_FmmL4bL-RymfPc3Eh_aNcrRpQ/exec'; }
function bAmToken(id) { return hashOf('amoff|' + id).slice(1, 17); }
/* 메일 속 광고 칸 + 보낸 사람 정보 + 원클릭 수신 거부 */
function briefAdMailHtml(ad, subId) {
  const off = `${bApi()}?action=briefAdOff&id=${encodeURIComponent(subId)}&t=${bAmToken(subId)}`;
  return `<div style="margin:16px 0 0;border:1px solid #E5E8EB;border-radius:12px;padding:12px 14px">
    <span style="display:inline-block;font-size:12px;font-weight:800;color:#4E5968;background:#F2F4F6;border-radius:6px;padding:1px 7px">광고</span> <span style="font-size:12.5px;color:#4E5968">${bEsc(ad.adv)}</span>
    <div style="font-size:16px;font-weight:800;margin:6px 0 2px"><a href="${bEsc(ad.url)}" style="color:#191F28;text-decoration:none">${bEsc(ad.title)}</a></div>
    ${ad.desc ? `<div style="font-size:14px;color:#3E4754;line-height:1.55">${bEsc(ad.desc)}</div>` : ''}
    <div style="font-size:12px;color:#8B95A1;margin:6px 0 0">브리핑의 숫자·순위는 광고와 관계없이 똑같이 계산해요.</div></div>
    <p style="font-size:12px;color:#4E5968;line-height:1.6;margin:12px 0 0">보낸 사람: ${bEsc(BRIEF_SENDER.site)}(${bEsc(BRIEF_SENDER.name)}) · ${bEsc(BRIEF_SENDER.addr)} · 전화 ${bEsc(BRIEF_SENDER.tel)} · 이메일 ${bEsc(BRIEF_SENDER.email)}<br>
    이 광고는 '이른 아침(오전 7시) 브리핑 메일 속 광고 받기'에 동의하신 분께만 보내요. 더 받지 않으려면 <a href="${off}" style="color:#1F4FD1">광고 수신 거부(한 번 누르면 끝)</a>를 누르거나 <a href="${BRIEF_WEB}manage/" style="color:#1F4FD1">내 구독 관리</a>에서 끌 수 있어요. 수신 거부해도 브리핑은 똑같이 받아요.</p>`;
}
/* 사람 단위 동의 상태(그 사람의 행은 늘 같이 바뀜). ad = 광고성 정보 받기(제50조 ①항), am = 이른 아침 브리핑 메일 속 광고 받기(③항) */
function bConsentOf(k) {
  const c = { ad: { on: false, at: '', off: '' }, am: { on: false, at: '', off: '' }, chk: '' };
  myBriefs(k).forEach(o => { const r = o.r;
    if (r[BC['광고동의']] === true) { c.ad.on = true; c.ad.at = r[BC['광고동의시각']] || c.ad.at || r[BC['생성시각']] || ''; }
    if (r[BC['광고철회시각']]) c.ad.off = r[BC['광고철회시각']];
    if (r[BC['아침광고동의']] === true) { c.am.on = true; c.am.at = r[BC['아침광고동의시각']] || c.am.at; }
    if (r[BC['아침광고철회시각']]) c.am.off = r[BC['아침광고철회시각']];
    if (r[BC['광고확인시각']]) c.chk = r[BC['광고확인시각']]; });
  if (!c.ad.on) c.am.on = false;          // 이른 아침 동의는 광고성 정보 동의가 있을 때만 유효
  return c;
}
function bConsentPublic(k) {
  const c = bConsentOf(k), f = x => x instanceof Date ? Utilities.formatDate(x, 'Asia/Seoul', 'yyyy-MM-dd HH:mm') : String(x || '');
  return { ad: { on: c.ad.on, at: f(c.ad.at), off: f(c.ad.off) }, am: { on: c.am.on, at: f(c.am.at), off: f(c.am.off) } };
}
/* 동의·철회 적용(그 사람의 모든 행) + 처리 결과 메일(제50조 ⑦항). want = { ad, am }: true·false, null 이면 그대로.
   이른 아침은 광고성 정보 동의가 있어야 켜지고, 광고성 정보를 끄면 함께 꺼짐. 바뀐 게 있으면 true */
function bConsentApply(k, want, how) {
  const rows = myBriefs(k), now = new Date(), cur = bConsentOf(k);
  if (!rows.length) return false;
  const ad = want.ad === true || want.ad === false ? want.ad : cur.ad.on;
  let am = want.am === true || want.am === false ? want.am : cur.am.on;
  if (!ad) am = false;
  const chg = [];
  if (ad !== cur.ad.on) chg.push(`광고성 정보 받기: ${ad ? '동의' : '수신 거부'}`);
  if (am !== cur.am.on) chg.push(`이른 아침(오전 7시) 브리핑 메일 속 광고 받기: ${am ? '동의' : '수신 거부'}`);
  if (!chg.length) return false;
  rows.forEach(o => {
    if (ad !== cur.ad.on) { setB(o.row, '광고동의', ad); setB(o.row, ad ? '광고동의시각' : '광고철회시각', now); }
    if (am !== cur.am.on) { setB(o.row, '아침광고동의', am); setB(o.row, am ? '아침광고동의시각' : '아침광고철회시각', now); }
    if ((ad && !cur.ad.on) || (am && !cur.am.on)) setB(o.row, '광고확인시각', '');
  });
  const em = rows.filter(o => String(o.r[BC['채널']]) === 'email' && String(o.r[BC['연락처']] || '')).pop();
  if (em) try {
    MailApp.sendEmail({ to: String(em.r[BC['연락처']]).replace(/^'/, ''), name: SITE_NAME, subject: `[${SITE_NAME}] 광고 수신 ${ad || am ? '동의' : '거부'} 처리 결과`,
      htmlBody: `<div style="font-family:sans-serif;line-height:1.7">${Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}에 ${bEsc(how || '')}에서 요청하신 대로 처리했어요.<br>${chg.map(bEsc).join('<br>')}<br>
      ${ad && am ? '브리핑 메일에 광고가 있는 날은 제목 맨 앞에 (광고)가 붙어요. ' : '브리핑 메일에는 광고가 들어가지 않아요. 브리핑은 똑같이 받아요. '}언제든 메일 맨 아래 링크나 내 구독 관리에서 바꿀 수 있어요.<br>
      보낸 사람: ${bEsc(BRIEF_SENDER.site)}(${bEsc(BRIEF_SENDER.name)}) · 전화 ${bEsc(BRIEF_SENDER.tel)} · <a href="${BRIEF_WEB}manage/">${BRIEF_WEB}manage/</a></div>` });
  } catch (e) {}
  return true;
}
/* 구독 관리 화면에서 켜고 끄기(로그인): { ad: 광고성 정보 받기, on: 이른 아침 광고 받기 } */
function briefAdPref(b) {
  const u = sessionUser(b.s);
  if (!myBriefs(u.k).length) throw new Error('구독 정보를 찾지 못했어요.');
  const ad = b.ad === true ? true : b.ad === false ? false : null;
  if (b.on === true && (ad === false || (ad === null && !bConsentOf(u.k).ad.on))) throw new Error("먼저 '광고성 정보 받기'에 동의해야 고를 수 있어요.");
  bConsentApply(u.k, { ad: ad, am: b.on === true }, '내 구독 관리');
  const c = bConsentPublic(u.k);
  return { ok: true, amAd: c.am, adc: c.ad };
}
/* 메일의 원클릭 수신 거부(로그인 없음, 행 id + 서버 비밀값으로 만든 토큰) — 광고성 정보 받기·이른 아침 광고 받기를 모두 끔 */
function briefAdOff(p) {
  const id = String(p.id || ''), t = String(p.t || '');
  let done = false;
  if (/^B[0-9A-F]{9}$/.test(id) && safeEq(t, bAmToken(id))) withLock(() => {
    const o = bRows().find(x => String(x.r[BC['id']]) === id);
    if (!o) return;
    bConsentApply(String(o.r[BC['카카오id']]), { ad: false, am: false }, '메일의 수신 거부 링크');
    done = true;
  });
  return HtmlService.createHtmlOutput(`<div style="font-family:sans-serif;padding:40px 20px;text-align:center;line-height:1.7">
    <h2>${done ? '광고 수신 거부를 처리했어요' : '처리하지 못했어요'}</h2>
    <p>${done ? '앞으로 브리핑 메일에 광고를 넣지 않고, 광고성 안내도 보내지 않아요. 브리핑은 똑같이 받아요. 처리 결과는 메일로도 알려 드려요.' : '링크가 바뀌었거나 이미 끝난 구독이에요. 내 구독 관리에서 직접 끌 수 있어요.'}</p>
    <p><a href="${BRIEF_WEB}manage/">내 구독 관리로 가기</a></p></div>`);
}
/* 2년마다 동의 사실 다시 알림 — 두 동의 모두. 기준 = 지난 확인일, 없으면 켜져 있는 동의 중 가장 이른 동의일 */
function briefAmRecheck(now) {
  const seen = {}, d = x => x instanceof Date ? x : new Date(x);
  bRows().forEach(o => {
    const k = String(o.r[BC['카카오id']]); if (seen[k]) return; seen[k] = 1;
    const c = bConsentOf(k); if (!c.ad.on) return;
    const ats = [c.ad.at, c.am.on ? c.am.at : ''].filter(Boolean).map(d).filter(x => !isNaN(x));
    const base = c.chk ? d(c.chk) : (ats.length ? new Date(Math.min.apply(null, ats.map(Number))) : null);
    if (!base || isNaN(base) || now - base < BRIEF_AM_RECHECK * 86400000) return;
    const em = myBriefs(k).filter(x => String(x.r[BC['채널']]) === 'email' && String(x.r[BC['연락처']] || '')).pop();
    if (!em) return;
    const dt = x => x ? Utilities.formatDate(d(x), 'Asia/Seoul', 'yyyy-MM-dd') : '';
    const lines = [`광고성 정보 받기: ${dt(c.ad.at)}에 동의`, c.am.on ? `이른 아침(오전 7시) 브리핑 메일 속 광고 받기: ${dt(c.am.at)}에 동의` : ''].filter(Boolean);
    try {
      MailApp.sendEmail({ to: String(em.r[BC['연락처']]).replace(/^'/, ''), name: SITE_NAME, subject: `[${SITE_NAME}] 광고 수신 동의 확인 안내`,
        htmlBody: `<div style="font-family:sans-serif;line-height:1.7">법에 따라 2년마다 광고 수신 동의 상태를 알려 드려요.<br>${lines.map(bEsc).join('<br>')}<br>
        계속 받으시려면 아무것도 하지 않으셔도 돼요. 더 받지 않으려면 <a href="${bApi()}?action=briefAdOff&id=${encodeURIComponent(String(em.r[BC['id']]))}&t=${bAmToken(String(em.r[BC['id']]))}">광고 수신 거부</a>를 누르거나 <a href="${BRIEF_WEB}manage/">내 구독 관리</a>에서 끌 수 있어요.<br>
        보낸 사람: ${bEsc(BRIEF_SENDER.site)}(${bEsc(BRIEF_SENDER.name)}) · 전화 ${bEsc(BRIEF_SENDER.tel)}</div>` });
      myBriefs(k).forEach(x => setB(x.row, '광고확인시각', now));
    } catch (e) {}
  });
}

/* ---------- 공개 집계 (워크플로가 읽음, 개인정보 없음) ---------- */
function pullOk(p) { const t = PropertiesService.getScriptProperties().getProperty('BRIEF_PULL_TOKEN'); return !!t && safeEq(String(p.k || ''), t); }
/* v48 엔진 연결 비밀값 새로 만들기 — 편집기에서 이 함수를 한 번 실행하면 무작위 64자리 값을 스크립트 속성 BRIEF_PULL_TOKEN 에 넣고 실행 로그에 보여 줌.
   그 값을 깃허브 jangdaejang-timing 저장소 Settings → Secrets and variables → Actions 의 BRIEF_PULL_TOKEN 에 그대로 붙여 넣으면 끝(안내 docs/redeploy_admin.md).
   다시 실행하면 값이 바뀌므로 깃허브 쪽도 새 값으로 바꿔야 해요. 값은 메일로 보내지 않아요. */
function pullTokenNew() {
  const t = newToken();
  PropertiesService.getScriptProperties().setProperty('BRIEF_PULL_TOKEN', t);
  Logger.log('BRIEF_PULL_TOKEN 새 값(이 줄의 64자리만 복사해 깃허브에 붙여 넣으세요):\n' + t);
  return t.length;
}
function userBriefMap() {
  const sh = book().getSheetByName(SH_U), m = {};
  if (!sh) return m;
  const ad = bAdminIds();
  sh.getDataRange().getValues().slice(1).forEach(r => { const d = parseJ(r[UC['저장자료']], {}), k = String(r[UC['카카오id']]); m[k] = cleanBrief(d && d.brief, bLim(ad.indexOf(k) >= 0)); });
  return m;
}
function briefAreas(p) {
  if (!pullOk(p)) return { ok: false, err: 'auth' };
  const now = new Date(), tomorrow = addDays(new Date(), 1), um = userBriefMap(), cnt = {};
  bRows().forEach(o => {
    const s = briefState(o, now), s2 = briefState(o, tomorrow);
    if (!s.active && !s2.active) return;
    ((um[String(o.r[BC['카카오id']])] || {}).areas || []).slice(0, s.adm ? BRIEF_ADM_PULL : s.areas).forEach(a => { cnt[a.g] = (cnt[a.g] || 0) + 1; });   // v48 운영자는 앞 3곳만(엔진 호출 예산은 진짜 구독자 몫, 나머지 지역도 전국 자료로 매일 만들어짐)
  });
  try {   // v27 중개사 플러스: 손님 단지가 있는 동네도 매일 최신 두 달을 다시 받게(구독자 수에는 넣지 않음)
    const on = {}; bpActive(now).forEach(x => { on[x.k] = x; });
    bpRows(SH_BPC).forEach(o => { const x = on[String(o.r[BPCC['카카오id']])]; if (x) parseJ(o.r[BPCC['단지']], []).slice(0, x.lim.apts).forEach(a => { if (/^\d{5}$/.test(String(a.g))) cnt[a.g] = cnt[a.g] || 0; }); });
  } catch (e) {}
  try { axAreaCodes().forEach(g => { if (/^\d{5}$/.test(g)) cnt[g] = cnt[g] || 0; }); } catch (e) {}   // v44 알림 구독자 관심 단지 동네(구독자 수에는 넣지 않음)
  return { ok: true, at: ymd(now), areas: Object.keys(cnt).sort().map(g => ({ g: g, n: cnt[g] })) };
}
/* 최근 7일 vs 그 전 7일, 단지별 서로 다른 방문자 수(추천·내 집·비교 화면에 단지가 보인 기록 'rec') — 5명 이상만 */
function briefInterest(p) {
  if (!pullOk(p)) return { ok: false, err: 'auth' };
  const sh = book().getSheetByName(SH_L); if (!sh) return { ok: true, gu: {} };
  const n = sh.getLastRow(); if (n < 2) return { ok: true, gu: {} };
  const from = Math.max(2, n - 30000 + 1);
  const vals = sh.getRange(from, 1, n - from + 1, 6).getValues();
  const now = Date.now(), d7 = now - 7 * 86400000, d14 = now - 14 * 86400000;
  const cur = {}, prev = {};
  vals.forEach(r => {
    if (!(r[0] instanceof Date) || String(r[1]) !== 'rec') return;
    const t = r[0].getTime(), k = String(r[4] || ''), vid = String(r[5] || '');
    if (!k || !vid || t < d14) return;
    const box = t >= d7 ? cur : prev;
    (box[k] = box[k] || {})[vid] = 1;
  });
  const gu = {};
  Object.keys(cur).forEach(k => {
    const nn = Object.keys(cur[k]).length; if (nn < BRIEF_MIN_VISITORS) return;
    const a = k.split('|'); if (a.length < 3 || !/^\d{5}$/.test(a[0])) return;
    (gu[a[0]] = gu[a[0]] || []).push([a[1], a[2], nn, prev[k] ? Object.keys(prev[k]).length : 0]);
  });
  Object.keys(gu).forEach(g => { gu[g].sort((x, y) => y[2] - x[2]); gu[g] = gu[g].slice(0, 5); });
  return { ok: true, at: ymd(new Date()), days: 7, min: BRIEF_MIN_VISITORS, gu: gu };
}


/* ---------- 광고주용 익명 구독자 통계 (v23) ----------
   · 개인을 알 수 없는 숫자만: 구독자 수(유료·체험)·추이, 관심 지역(시·도) 분포, 예산대·연령대(입력한 사람만), 웹 열람률.
   · 칸 하나라도 BRIEF_STAT_MIN(10)명 미만이면 그 칸은 숨김(공개 요약은 구독자 수 자체가 10명 미만이면 숫자를 내지 않음).
   · 열람률 = 메일의 [전체 브리핑 보기] 링크로 웹 브리핑을 연 날 ÷ 보낸 날(최근 30일). 링크의 k 는 구독 id 해시 앞 10자리(연락처 아님).
   · briefPublic(누구나): 광고 안내(/ad/)·시행사 페이지(/pro/developer/)가 읽음. briefStats(BRIEF_PULL_TOKEN): 운영자용 자세한 표. */
const BRIEF_STAT_MIN = 10, SH_BS = '브리핑열람', BSH = ['날짜', 'k'];
function bKey(id) { return hashOf('brief|' + id).slice(1, 11); }
function briefSeen(p) {
  const k = String((p && p.k) || ''), d = String((p && p.d) || '');
  if (!/^[0-9a-f]{10}$/.test(k) || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return { ok: false };
  const sh = uSheet(SH_BS, BSH);
  const n = sh.getLastRow(), from = Math.max(2, n - 3000 + 1);
  const recent = n >= 2 ? sh.getRange(from, 1, n - from + 1, 2).getValues() : [];
  if (!recent.some(r => String(r[0]).slice(0, 10) === d && String(r[1]) === k)) sh.appendRow([d, k]);
  return { ok: true };
}
function bHide(obj) { const o = {}; Object.keys(obj).forEach(k => { if (obj[k] >= BRIEF_STAT_MIN) o[k] = obj[k]; }); return o; }
function briefAgg(now) {
  now = now || new Date();
  const um = userBriefMap(), rows = bRows();
  const act = rows.map(o => ({ o: o, s: briefState(o, now) })).filter(x => x.s.active);
  const paid = act.filter(x => !bIsTrial(x.o.r[BC['상품']])).length;
  const sido = {}, budget = {}, age = {}, seenU = {}, amU = {};
  act.forEach(x => { if (x.o.r[BC['광고동의']] === true && x.o.r[BC['아침광고동의']] === true && x.s.channel === 'email') amU[String(x.o.r[BC['카카오id']])] = 1; });   // 메일 광고 동의자(사람 수)
  act.forEach(x => {
    const ub = um[String(x.o.r[BC['카카오id']])]; if (!ub) return;
    const u = String(x.o.r[BC['카카오id']]); if (seenU[u]) return; seenU[u] = 1;
    const sds = {}; (ub.areas || []).slice(0, x.s.adm ? BRIEF_ADM_PULL : x.s.areas).forEach(a => { if (a.sd) sds[a.sd] = 1; });   // v48 운영자 계정이 모든 시·도를 부풀리지 않게
    Object.keys(sds).forEach(k => { sido[k] = (sido[k] || 0) + 1; });
    if (ub.budget) budget[ub.budget] = (budget[ub.budget] || 0) + 1;
    if (ub.age) age[ub.age] = (age[ub.age] || 0) + 1;
  });
  /* 추이: 최근 12주 매주 월요일 기준 이용 중 수 */
  const trend = [];
  for (let i = 11; i >= 0; i--) {
    const d = addDays(kstToday(), -7 * i);
    trend.push([ymd(d), rows.filter(o => briefState(o, d).active).length]);
  }
  /* 열람률(최근 30일) */
  let sends = 0, seen = 0;
  const lo = ymd(addDays(kstToday(), -30));
  const lg = book().getSheetByName(SH_BL), seenSh = book().getSheetByName(SH_BS);
  const sentDays = {};
  if (lg && lg.getLastRow() > 1) lg.getRange(2, 1, lg.getLastRow() - 1, 4).getValues().forEach(r => {
    const d = String(r[0]).slice(0, 10); if (d < lo || String(r[3]) !== '보냄') return; sends++; sentDays[d + '|' + bKey(String(r[1]))] = 1; });
  if (seenSh && seenSh.getLastRow() > 1) seenSh.getRange(2, 1, seenSh.getLastRow() - 1, 2).getValues().forEach(r => {
    if (sentDays[String(r[0]).slice(0, 10) + '|' + String(r[1])]) seen++; });
  return { n: act.length, paid: paid, trial: act.length - paid, amAd: Object.keys(amU).length, sido: sido, budget: budget, age: age, trend: trend, sends: sends, seen: seen };
}
function briefPublic() {
  const A = briefAgg(new Date());
  if (A.n < BRIEF_STAT_MIN) return { ok: true, name: BRIEF_NAME, n: null, at: ymd(new Date()) };
  return { ok: true, name: BRIEF_NAME, at: ymd(new Date()), n: A.n, paid: A.paid >= BRIEF_STAT_MIN ? A.paid : null, amAd: A.amAd >= BRIEF_STAT_MIN ? A.amAd : null,
    sido: bHide(A.sido), budget: bHide(A.budget), age: bHide(A.age),
    open: A.sends >= 100 ? Math.round(A.seen / A.sends * 1000) / 10 : null };
}
function briefStats(p) {
  if (!pullOk(p)) return { ok: false, err: 'auth' };
  const A = briefAgg(new Date());
  return { ok: true, name: BRIEF_NAME, at: ymd(new Date()), n: A.n, paid: A.paid, trial: A.trial, trend: A.trend,
    sido: bHide(A.sido), budget: bHide(A.budget), age: bHide(A.age), sends: A.sends, seen: A.seen,
    open: A.sends ? Math.round(A.seen / A.sends * 1000) / 10 : null, hidden: '칸마다 ' + BRIEF_STAT_MIN + '명 미만은 숨김' };
}

/* ---------- 아침 발송 (트리거: briefInstall 을 한 번 실행하면 매일 오전 7시대) ---------- */
function briefInstall() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'briefDaily').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('briefDaily').timeBased().everyDays(1).atHour(7).inTimezone('Asia/Seoul').create();
  ScriptApp.newTrigger('briefDaily').timeBased().everyDays(1).atHour(9).inTimezone('Asia/Seoul').create();   // 7시에 자료가 늦으면 9시에 한 번 더
}
function bFetchJson(url) {
  try { const r = UrlFetchApp.fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 'v=' + Date.now(), { muteHttpExceptions: true }); return r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) : null; }
  catch (e) { return null; }
}
const bWon = m => { m = Math.round(Number(m) || 0); const e = Math.floor(m / 10000), r = m % 10000; return e && r ? `${e}억 ${r.toLocaleString()}만 원` : e ? `${e}억 원` : `${r.toLocaleString()}만 원`; };
const bEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* 동네 하나 요약(발송용): 한 줄 해설 + 숫자 + 대표 거래 3건 */
/* 급매 목록: 기준(%)이 10이면 자료의 urgent 그대로, 다르면 urgent + urgent_lo(5~10%) 에서 기준 이상만 — 화면 brief-core urgentFor 와 같음 */
function bUrgent(S, thr) {
  thr = Number(thr) || BRIEF_URG.def;
  const all = thr === BRIEF_URG.def ? (S.urgent || []) : (S.urgent || []).concat(thr < BRIEF_URG.def ? (S.urgent_lo || []) : []);
  return all.filter(u => Math.abs(Number(u.disc)) >= thr).sort((x, y) => x.disc - y.disc);
}
function briefPiece(S, a, pro, apts, thr) {
  const dn = a.dn || '', tr = (S.trades || []).filter(t => !dn || t.d === dn), lines = (S.lines || {})[dn] || (S.lines || {})[''] || {};
  const nm = S.name + (dn ? ' ' + dn : ''), mine = tr.filter(t => apts.indexOf(t.a) >= 0);
  const pick = mine.concat(tr.filter(t => t.hi && mine.indexOf(t) < 0)).concat(tr.filter(t => !t.hi && mine.indexOf(t) < 0)).slice(0, 3);
  return { nm: nm, n: tr.length, hi: tr.filter(t => t.hi).length, fact: lines.fact || '', cmp: lines.cmp || '', so: lines.so || '',
    mine: mine.length, items: pick.map(t => `${apts.indexOf(t.a) >= 0 ? '[관심 단지] ' : ''}${t.a} ${t.b} ${bWon(t.p)}${t.hi ? ' (신고가)' : t.dr != null && t.dr <= -10 ? ` (최근 2년 최고가보다 ${Math.abs(t.dr).toFixed(0)}% 낮음)` : ''}`),
    urgent: bUrgent(S, thr).filter(u => (!dn || u.d === dn) && !u.sus).slice(0, 2).map(u => `${apts.indexOf(u.a) >= 0 ? '[관심 단지] ' : ''}${u.a} ${u.b} ${bWon(u.p)} — 최근 3개월 같은 평형 중간값 ${bWon(u.med)}보다 ${Math.abs(u.disc).toFixed(0)}% 낮음${u.x ? ' (직거래)' : ''}`),
    gap: (S.gap || []).filter(g => (!dn || g.d === dn) && (apts.indexOf(g.a) >= 0 || (S.gap || []).indexOf(g) < 2)).slice(0, 2).map(g => `${g.a} ${g.b} 전세가율 ${Math.round(g.jr0)}% → ${Math.round(g.jr)}% (${g.dlt > 0 ? '갭 기회·전세 위험 함께 확인' : '보증금은 더 안전, 갭 부담 커짐'})`),
    rise: (S.rise || []).filter(r => !dn || r.d === dn).slice(0, 2).map(r => `${r.a} ${r.b} 최근 3개월 ${r.chg > 0 ? '+' : ''}${r.chg}% (거래량 증가 상위 20%, 내리다 반등)`),
    pn: S.pnews && (S.pnews.items || []).length ? S.pnews : null, wk: S.wk && (S.wk.lines || []).length ? S.wk : null,
    g: S.g, gn: S.name, pro: pro ? (((S.pro || {})[dn] || (S.pro || {})['']) || []) : [], url: BRIEF_WEB + '?d=' + S.g + (dn ? '-' + encodeURIComponent(dn) : '') + (pro ? '&v=pro' : '') };
}
/* 새로 발표된 정책·교통·공급 소식(엔진 policy_news.py — 공식 보도자료 제목 그대로 + 고정 용어 풀이) → 메일 조각. 없으면 '' */
const BPN_HEAD = { '정책': '대출·세금·청약·규제', '교통': '철도·도로·역', '공급': '새 집·신도시·정비사업' };
function briefPnHtml(P, max) {
  if (!P || !(P.items || []).length) return '';
  let n = 0;
  return ['정책', '교통', '공급'].map(c => {
    const its = P.items.filter(x => x.c === c); if (!its.length || n >= max) return '';
    const take = its.slice(0, max - n); n += take.length;
    return `<div style="margin:8px 0 0"><b style="font-size:14px;color:#1F56E0">${c}</b> <span style="font-size:13px;color:#4E5968">${BPN_HEAD[c]}</span>
      ${(P.note || {})[c] ? `<p style="margin:2px 0 4px;font-size:13px;color:#4E5968;line-height:1.55">${bEsc(P.note[c])}</p>` : ''}
      <ul style="margin:2px 0 4px;padding-left:18px;line-height:1.6;font-size:14px">${take.map(x => `<li style="margin:0 0 6px">${/^https:\/\//.test(x.u || '') ? `<a href="${bEsc(x.u)}" style="color:#191F28;font-weight:700">${bEsc(x.t)}</a>` : `<b>${bEsc(x.t)}</b>`}<br><span style="font-size:12.5px;color:#4E5968">${bEsc([x.org, x.d ? +String(x.d).slice(5, 7) + '/' + +String(x.d).slice(8, 10) + ' 발표' : '', x.sub, x.rg].filter(Boolean).join(' · '))}</span>${(x.terms || []).map(t => `<br><span style="font-size:13px;color:#3E4754">· <b>${bEsc(t[0])}</b> — ${bEsc(t[1])}</span>`).join('')}</li>`).join('')}</ul></div>`;
  }).join('');
}
/* ① 오늘의 부동산 시장(전국 공통, data/brief/market.json) → 메일 머리 칸. 숫자는 자료 그대로 */
function bTop(x) {
  const ym = i => `${Math.floor(i / 10000)}.${Math.floor(i / 100) % 100}`;
  const sub = x.up != null ? ` (이전 최고 ${bWon(x.pm)}·${ym(x.pmd)} 대비 +${x.up}%)` : x.dr != null ? ` (최근 2년 최고 ${bWon(x.m2)}·${ym(x.m2d)} 대비 ${x.dr}%)` : '';
  return `${[x.sd, x.gn, x.d].filter(Boolean).join(' ')} ${x.a} ${x.b} ${bWon(x.p)}${sub}${x.x ? ' · 직거래' : ''}${x.sus ? ' · 특수 거래 의심' : ''}`;
}
function briefMarketHtml(M, ub) {
  if (!M) return '';
  const li = a => a.length ? '<ol style="margin:4px 0 8px;padding-left:20px;line-height:1.6">' + a.map(x => `<li>${bEsc(x)}</li>`).join('') + '</ol>' : '<p style="margin:4px 0 8px;color:#4E5968">이번에는 없어요.</p>';
  const kr = M.kr || {}, se = M.seoul || {}, cy = M.cy || {};
  const BN = ['60㎡ 이하', '60~85㎡', '85㎡ 초과'];
  const cyo = (M.cyopp || []).filter(n => (n.low || []).length).slice(0, 3).map(n => `${n.n} (${[n.sd, n.g].filter(Boolean).join(' ')}) · ${n.low.map(b => BN[b.b]).join('·')} · 접수 ${String(n.rc[0]).slice(4, 6)}/${String(n.rc[0]).slice(6, 8)}`);
  const sc = ub && ub.cy && ub.cy.score != null ? ub.cy.score : null, my = [];
  if (sc != null) (M.cyopp || []).forEach(n => (n.cut || []).forEach(c => { if (sc >= c.lo && my.length < 4) my.push(`${n.n} ${BN[c.b]} — 예상 최저 당첨 가점 ${c.lo}~${c.hi}점, ${sc >= c.hi ? '가능성 높음' : '경합'}`); }));
  const pol = (M.policy || []).map(p => `${p.name} — ${p.stage} ${String(p.d).slice(5).replace('-', '/')} (${p.scope})`);
  const rate = M.rate ? ['base', 'mort'].filter(k => M.rate[k]).map(k => `${k === 'base' ? '한국은행 기준금리' : '은행 주택담보대출 신규 금리'} ${M.rate[k].v}% (${M.rate[k].ym.slice(0, 4)}.${+M.rate[k].ym.slice(4)})${M.rate[k].chg != null ? ` · 지난달보다 ${M.rate[k].chg > 0 ? '+' : ''}${M.rate[k].chg}%p` : ''}`) : [];
  const cys = (cy.rows || []).slice(0, 5).map(n => `${n.n} (${[n.sd, n.gn].filter(Boolean).join(' ')}) · 접수 ${String((n.sp && n.sp[0]) || (n.rc || [])[0] || '').slice(4, 6)}/${String((n.sp && n.sp[0]) || (n.rc || [])[0] || '').slice(6, 8)}`);
  return `<div style="border:2px solid #191F28;border-radius:12px;padding:14px 16px;margin:0 0 14px">
    <div style="font-size:17px;font-weight:900;margin:0 0 6px">① 오늘의 부동산 시장 <span style="font-size:12.5px;color:#4E5968;font-weight:500">전국 공통</span></div>
    ${(M.lines || []).map(x => `<p style="margin:0 0 6px;line-height:1.6">${bEsc(x)}</p>`).join('')}
    ${M.pnews && (M.pnews.items || []).length ? `<div style="margin:6px 0 10px"><b>새로 발표된 정책·교통·공급 소식</b> <span style="font-size:12.5px;color:#4E5968">정부·지자체 공식 보도자료 ${M.pnews.n}건 · 제목은 원문 그대로</span>${briefPnHtml(M.pnews, 6)}</div>` : ''}
    <b>전국 신고가 TOP</b>${li((kr.hi || []).slice(0, 3).map(bTop))}<b>전국 큰 하락 TOP</b>${li((kr.drop || []).filter(x => !x.sus && !x.x).slice(0, 3).map(bTop))}
    <b>서울 신고가 TOP</b>${li((se.hi || []).slice(0, 3).map(bTop))}
    ${(M.rise || []).length ? `<b>상승 전환 신호 TOP</b>${li(M.rise.slice(0, 3).map(r => `${r.sd} ${r.d} ${r.a} ${r.b} 최근 3개월 ${r.chg > 0 ? '+' : ''}${r.chg}%`))}` : ''}
    ${M.rank && (M.rank.up || []).length ? `<b>미래가치 순위가 크게 오른 단지</b>${li(M.rank.up.slice(0, 3).map(r => `${r.sd} ${r.d} ${r.a} ${r.b} ${r.r0}위 → ${r.r1}위`))}` : ''}
    ${cyo.length ? `<b>청약 기회(주변 시세 대비 분양가 하위 구간에 가까움)</b>${li(cyo)}` : ''}${my.length ? `<b>내 가점 ${ub.cy.score}점으로 넣어 볼 만한 단지</b>${li(my)}` : ''}
    ${M.score ? `<p style="margin:4px 0 8px;font-size:13.5px">지난 예측 성적: ${bEsc(M.score.m)}에 공개한 ${M.score.h}년 예측을 실제 결과와 맞춰 보니 상위 20% 단지가 하위 20%보다 ${M.score.diff}%p ${M.score.hit ? '더 올랐어요' : '덜 올랐어요'}.</p>` : ''}
    <b>금리·대출·세금</b>${li(rate.concat(pol))}<b>이번 주 청약 일정${cy.n ? ` · 전국 ${cy.n}곳` : ''}</b>${li(cys)}
    <a href="${BRIEF_WEB}" style="font-size:13.5px;color:#2F6BFF">오늘의 시장 전체 보기</a></div>`;
}
/* ---------- 중개사 도구 이용 수 (v28) — 매물 설명서(agent/listing/) · 주간 블로그·인스타 글(agent/content/) ----------
   이용 중인 모닝 브리핑 요금제의 listing(한 달 장수)·kitAreas(한 주 지역 수)까지. 시트 '도구사용'(첫 사용 때 자동 생성)에
   회원 해시·기간(월 'YYYY-MM' 또는 주 'W'+그 주 월요일)·도구·수·지역만 남김(이름·연락처 없음). 설명서 내용·표시 정보는 서버로 오지 않음. */
const SH_TU = '도구사용', TUH = ['기간', 'k', '도구', '수', '지역', '갱신'];
const TUC = Object.fromEntries(TUH.map((h, i) => [h, i]));
function tuPeriod(tool, now) {
  if (tool === 'listing') return Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM');
  const d = dOnly(ymd(now)), w = (Number(Utilities.formatDate(now, 'Asia/Seoul', 'u')) + 6) % 7;   // 월요일 0
  return 'W' + ymd(addDays(d, -w));
}
function tuBest(k, now) {
  let best = null;
  myBriefs(k).forEach(o => { const st = briefState(o, now), P = BRIEF_PRICE[st.tier]; if (!st.active || !P) return;
    if (!best || (P.listing || 0) + (P.kitAreas || 0) * 100 > (best.P.listing || 0) + (best.P.kitAreas || 0) * 100) best = { st: st, P: P }; });
  return best;
}
function tuRow(hk, per, tool) {
  const sh = uSheet(SH_TU, TUH), v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][TUC['기간']]) === per && String(v[i][TUC['k']]) === hk && String(v[i][TUC['도구']]) === tool) return { sh: sh, row: i + 1, r: v[i] };
  return { sh: sh, row: 0, r: null };
}
function toolQuota(b, use) {
  const u = sessionUser(b.s), now = new Date(), best = tuBest(u.k, now), hk = hashOf('tool|' + u.k);
  const lr = tuRow(hk, tuPeriod('listing', now), 'listing'), kr = tuRow(hk, tuPeriod('kit', now), 'kit');
  const used = { listing: lr.r ? Number(lr.r[TUC['수']]) || 0 : 0, kit: kr.r ? String(kr.r[TUC['지역']] || '').split(',').filter(Boolean) : [] };
  const out = { ok: true, tier: best ? best.st.tier : '', label: best ? best.P.label : '', limits: { listing: best ? best.P.listing || 0 : 0, kitAreas: best ? best.P.kitAreas || 0 : 0 }, used: used };
  if (!use) return out;
  const tool = b.tool === 'kit' ? 'kit' : b.tool === 'listing' ? 'listing' : '';
  if (!tool) throw new Error('도구를 다시 골라 주세요.');
  if (!best || !(tool === 'listing' ? out.limits.listing : out.limits.kitAreas)) throw new Error(tool === 'listing' ? '매물 설명서는 모닝 브리핑 플러스·중개사용·중개사 플러스에 들어 있어요.' : '주간 글은 모닝 브리핑 플러스·중개사용·중개사 플러스에 들어 있어요.');
  const now2 = ymd(now);
  if (tool === 'listing') {
    if (used.listing >= out.limits.listing) throw new Error(`이번 달 매물 설명서 ${out.limits.listing}장을 모두 썼어요. 다음 달 1일에 다시 채워져요.`);
    if (lr.row) { lr.sh.getRange(lr.row, TUC['수'] + 1).setValue(used.listing + 1); lr.sh.getRange(lr.row, TUC['갱신'] + 1).setValue(now2); }
    else lr.sh.appendRow([tuPeriod('listing', now), hk, 'listing', 1, '', now2]);
    used.listing += 1;
  } else {
    const g = String(b.g || ''); if (!/^\d{5}$/.test(g)) throw new Error('지역을 다시 골라 주세요.');
    if (used.kit.indexOf(g) < 0) {
      if (used.kit.length >= out.limits.kitAreas) throw new Error(`이번 주에는 지역 ${out.limits.kitAreas}곳까지 만들 수 있어요. 이미 만든 지역은 몇 번이든 다시 만들 수 있어요.`);
      used.kit.push(g);
      if (kr.row) { kr.sh.getRange(kr.row, TUC['지역'] + 1).setValue(used.kit.join(',')); kr.sh.getRange(kr.row, TUC['수'] + 1).setValue(used.kit.length); kr.sh.getRange(kr.row, TUC['갱신'] + 1).setValue(now2); }
      else kr.sh.appendRow([tuPeriod('kit', now), hk, 'kit', 1, g, now2]);
    }
  }
  return out;
}
function toolUse(b) { return toolQuota(b, true); }
/* 월요일 메일(중개사 요금제): 관심 지역 이번 주 글 재료 링크 */
const BRIEF_KIT_WEB = BRIEF_WEB.replace(/brief\/$/, '') + 'agent/content/';
function briefKitHtml(pieces, pro, date) {
  if (!pro || new Date(date + 'T12:00:00+09:00').getDay() !== 1) return '';
  const gs = []; pieces.forEach(p => { const g = String(p.g || ''); if (g && gs.indexOf(g) < 0) gs.push(g); });
  if (!gs.length) return '';
  return `<div style="background:#F2F6FF;border-radius:12px;padding:12px 14px;margin:0 0 14px"><b>이번 주 블로그·인스타 글 재료가 준비됐어요</b>
    <p style="margin:4px 0 8px;font-size:13.5px;color:#4E5968;line-height:1.55">관심 지역의 실거래·신고가·청약 일정을 공개 자료로 정리한 블로그 글, 카드 이미지, 설명글을 바로 만들 수 있어요.</p>
    ${gs.slice(0, 5).map(g => `<a href="${BRIEF_KIT_WEB}?g=${g}&go=1" style="display:inline-block;margin:0 6px 6px 0;background:#2F6BFF;color:#fff;padding:9px 14px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">${bEsc((pieces.find(p => p.g === g) || {}).gn || g)} 글 만들기</a>`).join('')}</div>`;
}
/* v41 지난주 우리 지역은?(주간 실거래 동향) — 내 지역 문장(그 시·도 문장 포함) 먼저, 그다음 전국. 자료가 없으면 '' */
function briefWeeklyHtml(pieces, M) {
  const seen = {}, lines = [];
  pieces.forEach(p => (p.wk ? p.wk.lines : []).forEach(x => { if (!seen[x]) { seen[x] = 1; lines.push(x); } }));
  const m = M && M.wk, w = (pieces.find(p => p.wk) || {}).wk || m;
  if (!w || (!lines.length && !(m && m.line))) return '';
  if (m && m.line) lines.push(m.line);
  const md = x => `${+String(x).slice(5, 7)}/${+String(x).slice(8, 10)}`;
  return `<div style="border:2px solid #2F6BFF;border-radius:12px;padding:14px 16px;margin:0 0 14px">
    <div style="font-size:17px;font-weight:900;margin:0 0 6px">지난주 우리 지역은? <span style="font-size:12.5px;color:#4E5968;font-weight:500">${md(w.from)}~${md(w.to)} 계약 · ${w.status === 'final' ? '확정' : '잠정(신고 진행 중)'}</span></div>
    ${lines.map(x => `<p style="margin:0 0 6px;line-height:1.6">${bEsc(x)}</p>`).join('')}
    <p style="margin:4px 0 6px;font-size:12.5px;color:#4E5968;line-height:1.55">${bEsc(SITE_NAME)} 주간 실거래 동향(국토교통부 실거래가 분석, ${bEsc(String(w.asof).replace(/-/g, '.'))} 기준, 제${Number(w.ver) || 1}판). 같은 단지·같은 면적의 직전 거래와 비교한 값이라 조사 기반 공식 주간 지수와 다를 수 있어요.</p>
    ${/^https:\/\//.test(w.url || '') ? `<a href="${bEsc(w.url)}" style="font-size:13.5px;color:#2F6BFF">지역별 표·계산 방법 보기</a>` : ''}</div>`;
}
function briefMail(to, date, pieces, s, pro, M, ub, extra, ad, tail) {
  const title = ((ad || tail ? '(광고) ' : '') + `[${SITE_NAME}] ${date.slice(5).replace('-', '/')} ${BRIEF_NAME} — ${pieces.map(p => p.nm).join(', ')}`).slice(0, 120);
  const body = pieces.map(p => `<div style="border:1px solid #E5E8EB;border-radius:12px;padding:14px 16px;margin:0 0 12px">
      <div style="font-size:17px;font-weight:900;margin:0 0 6px">${bEsc(p.nm)} <span style="font-size:13px;color:#2F6BFF">새 매매 ${p.n}건 · 신고가 ${p.hi}건</span></div>
      ${p.pn ? `<div style="background:#FBF8EF;border:1px solid #EFE6CC;border-radius:10px;padding:10px 12px;margin:0 0 8px"><b style="color:#191F28">내 동네 관련 발표</b> <span style="font-size:12.5px;color:#4E5968">이 동네 이름이 나온 정부·지자체 보도자료</span>${briefPnHtml(p.pn, 3)}</div>` : ''}
      <p style="margin:0 0 6px;line-height:1.6">${bEsc(p.fact)}</p>${p.cmp ? `<p style="margin:0 0 6px;line-height:1.6;color:#3E4754">${bEsc(p.cmp)}</p>` : ''}${p.so ? `<p style="margin:0 0 6px;line-height:1.6;color:#3E4754">${bEsc(p.so)}</p>` : ''}
      ${p.items.length ? '<ul style="margin:6px 0;padding-left:18px;line-height:1.6">' + p.items.map(x => `<li>${bEsc(x)}</li>`).join('') + '</ul>' : ''}
      ${[['급매 레이더', p.urgent], ['전세가율 급변', p.gap], ['상승 전환 신호', p.rise]].filter(x => x[1] && x[1].length).map(x => `<div style="margin:6px 0 0"><b style="font-size:14px">${x[0]}</b><ul style="margin:2px 0 4px;padding-left:18px;line-height:1.6;font-size:14px">${x[1].map(y => `<li>${bEsc(y)}</li>`).join('')}</ul></div>`).join('')}
      ${p.pro.length ? '<div style="background:#F4F7FF;border-radius:10px;padding:10px 12px;margin:8px 0"><b>손님께 할 이야기</b><ol style="margin:6px 0 0;padding-left:18px;line-height:1.6">' + p.pro.map(x => `<li>${bEsc(x)}</li>`).join('') + '</ol></div>' : ''}
      <a href="${p.url}" style="display:inline-block;margin-top:6px;background:#2F6BFF;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:700">전체 브리핑 보기</a></div>`).join('');
  const html = `<div style="font-family:'Noto Sans KR',sans-serif;max-width:600px;margin:auto;color:#191F28">
    <div style="font-weight:900;font-size:19px;margin:6px 0 12px">${bEsc(SITE_NAME)} <span style="color:#2F6BFF">모닝 브리핑</span></div>${extra || ''}${briefWeeklyHtml(pieces, M)}${briefMarketHtml(M, ub)}
    ${briefKitHtml(pieces, pro, date)}<div style="font-size:17px;font-weight:900;margin:4px 0 8px">② 내 관심 지역 · ③ 내 관심 단지</div>${body}
    <p style="font-size:12.5px;color:#4E5968;line-height:1.6">국토교통부 실거래 공개 자료에 새로 올라온 거래를 동네별로 모았어요. 신고가는 같은 단지·같은 평형의 이전 최고가를 넘은 거래예요.<br>
    이 메일은 ${bEsc(s.product)}(이용 기간 ${s.start} ~ ${s.end})을 신청하신 분께 보내 드려요. 받는 방법 바꾸기·해지: <a href="${BRIEF_WEB}manage/">${BRIEF_WEB}manage/</a></p>
    <a href="${BRIEF_WEB}manage/" style="display:block;text-align:center;margin:10px 0 0;border:1px solid #2F6BFF;color:#2F6BFF;padding:11px 16px;border-radius:10px;text-decoration:none;font-weight:700">지역·단지 바꾸기</a>${tail || ''}${ad ? briefAdMailHtml(ad, s.id) : ''}</div>`;
  MailApp.sendEmail({ to: to, subject: title, htmlBody: html, name: SITE_NAME });
}
/* 솔라피 알림톡(정보성 템플릿). 실패하면 SOLAPI_FROM 이 있을 때 문자로 대체 */
function solapiSend(to, tplKey, vars, url) {
  const P = PropertiesService.getScriptProperties();
  const key = P.getProperty('SOLAPI_API_KEY'), sec = P.getProperty('SOLAPI_API_SECRET'), pf = P.getProperty('SOLAPI_PFID'), tpl = P.getProperty(tplKey), from = P.getProperty('SOLAPI_FROM');
  if (!key || !sec || !pf || !tpl) return { ok: false, why: 'nokey' };
  const date = new Date().toISOString(), salt = Utilities.getUuid().replace(/-/g, '');
  const sig = Utilities.computeHmacSha256Signature(date + salt, sec).map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
  const msg = { to: to, kakaoOptions: { pfId: pf, templateId: tpl, variables: vars, disableSms: !from } };
  if (from) msg.from = from;
  const r = UrlFetchApp.fetch('https://api.solapi.com/messages/v4/send-many/detail', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${sig}` }, payload: JSON.stringify({ messages: [msg] }) });
  return { ok: r.getResponseCode() === 200, why: 'http ' + r.getResponseCode() };
}
function bLog(row) { const sh = uSheet(SH_BL, BLH); sh.appendRow(row); }
function briefDaily() {
  const P = PropertiesService.getScriptProperties(), date = ymd(new Date());
  if (P.getProperty('BRIEF_SENT') === date) return;
  const ix = bFetchJson(BRIEF_DATA + 'index.json');
  if (!ix || ix.date !== date) { if (new Date().getHours() < 9) return; }   // 오늘 자료가 아직 없으면 9시에 다시(9시에도 없으면 어제 자료 그대로 보내고 날짜를 밝힘)
  try { baBillDaily(new Date()); } catch (e) {}           // v50 자동결제(잠겨 있으면 아무것도 안 함): 오늘 결제된 사람은 오늘 아침부터 받게 먼저
  const um = userBriefMap(), now = new Date(), cache = {}, ch = briefChannels();
  const wkc = {}, wkOf = g => (g in wkc) ? wkc[g] : (wkc[g] = bFetchJson(BRIEF_DATA + 'wk/' + g + '.json'));   // v41 지난주 우리 지역은?(월요일 오전 7시 공개분)
  const brief = g => { if (g in cache) return cache[g]; const S = bFetchJson(BRIEF_DATA + g + '.json'); if (S) { const w = wkOf(g); if (w && w.date === S.date) S.wk = w; } return (cache[g] = S); };
  brief.has = g => (g in cache); brief.put = (g, S, W) => { wkc[g] = W || null; if (S && W && W.date === S.date) S.wk = W; cache[g] = S; };   // v48 운영자 계정 미리 받기(bPrefetch)
  const M = bFetchJson(BRIEF_DATA + 'market.json');      // 전국 공통 — 하루 1번만 받아 모든 구독자에게 같은 내용
  const WKM = M ? bFetchJson(BRIEF_DATA + 'wk/market.json') : null; if (M && WKM && WKM.date === M.date) M.wk = WKM;   // v41 전국 문장(7시 공개분, 날짜가 같을 때만)
  const AD = briefAdToday(now);                         // v29 오늘 진행 중인 브리핑 광고(없으면 null) — 메일에는 이른 아침 광고 동의자에게만
  const cxc = {}, cxOf = g => (g in cxc) ? cxc[g] : (cxc[g] = bFetchJson(BRIEF_DATA + 'cx/' + g + '.json'));   // v27 손님 단지 자료 — 동네마다 한 번만 받음
  let AXM = null; try { AXM = axMorning(now); } catch (e) { AXM = null; }   // v44 관심 단지·청약 알림 — 이메일 브리핑에 함께 넣어 한 통만
  let sent = 0, admStop = false;
  const t0 = Date.now(), adIds = bAdminIds(), isAdmRow = o => adIds.indexOf(String(o.r[BC['카카오id']])) >= 0;
  const dpImp = {}, dpOn = !!book().getSheetByName(SH_DP);   // v50 동네 파트너 칸(광고성 정보·이른 아침 두 동의가 모두 있는 사람만, DONGNE_ENABLED 또는 운영자 계정)
  const dpTail = (o, s, ub, myApts, first) => {
    if (!dpOn || !first || s.channel !== 'email' || !(DONGNE_ENABLED || s.adm) || o.r[BC['광고동의']] !== true || o.r[BC['아침광고동의']] !== true) return '';
    try {
      const sec = dpSection((ub.areas || []).slice(0, s.areas), myApts, date, (g, n) => { const S = brief(g); const t = S && (S.trades || []).find(x => x.a === n); return t ? t.d : ''; });
      sec.list.forEach(x => x.partners.forEach(c => { dpImp[c.id] = (dpImp[c.id] || 0) + 1; }));
      return dpMailHtml(sec, s.id);
    } catch (e) { return ''; }
  };
  const rows = bRows(); rows.sort((x, y) => (isAdmRow(x) ? 1 : 0) - (isAdmRow(y) ? 1 : 0));   // v48 운영자 계정(지역이 아주 많을 수 있음)은 맨 마지막
  rows.forEach(o => {
    if (admStop) return;
    const s = briefState(o, now);
    if (!s.active || String(o.r[BC['최근발송일']]).slice(0, 10) === date) return;
    if (s.adm && s.channel === 'email') {        // v48 운영자: 메일 한 통에 20곳씩 나눠 보내고, 시간·메일 한도가 모자라면 멈췄다가 다음 실행(9시)에서 이어서
      const r1 = bAdminSend(o, s, um, date, t0, brief, M, AD, ix, AXM, cxOf, dpTail);
      if (r1 === 'stop') { admStop = true; return; }
      if (r1) { setB(o.row, '최근발송일', date); setB(o.row, '발송수', s.sent + 1); sent++; }
      return;
    }
    let AXU = null; if (AXM && s.channel === 'email') try { AXU = AXM.forUser(String(o.r[BC['카카오id']])); } catch (e) { AXU = null; }
    const ub = um[String(o.r[BC['카카오id']])] || { areas: [], apts: [] };
    const myApts = (ub.apts || []).slice(0, s.apts);      // 요금제 표의 관심 단지 수까지만(서버에서 지킴)
    const urg = s.urgPick && ub.urg ? ub.urg : BRIEF_URG.def;   // 급매 기준: 고를 수 있는 요금제만 저장값, 없으면 10%
    const pieces = (ub.areas || []).slice(0, s.areas).map(a => { const S = brief(a.g); return S ? briefPiece(S, a, s.pro, myApts, urg) : null; }).filter(Boolean);
    if (!pieces.length) { bLog([date, s.id, s.channel, '동네 자료 없음', 0]); if (AXU) try { AXM.alone(AXU); } catch (e) {} return; }   // 브리핑을 못 보내는 날은 알림만 따로
    const to = String(o.r[BC['연락처']]).replace(/^'/, '');
    let res = { ok: false, why: '' };
    try {
      if (s.channel === 'email') { pieces.forEach(p => { p.url += `&src=mail&k=${bKey(s.id)}&day=${date}`; });
        let bx = ''; try { bx = bpMailHtml(String(o.r[BC['카카오id']]), cxOf, date); } catch (e) { bx = ''; }
        const withAd = AD && o.r[BC['광고동의']] === true && o.r[BC['아침광고동의']] === true ? AD : null;   // 두 동의(①항 광고성 정보·③항 이른 아침)가 모두 있을 때만
        const dx = dpTail(o, s, ub, myApts, true);
        briefMail(to, (pieces[0] && ix && ix.date) || date, pieces, s, s.pro, M, Object.assign({}, ub, { apts: myApts }), (AXU ? AXU.html : '') + bx, withAd, dx); res = { ok: true, ad: !!withAd, dp: !!dx };
        if (AXU) try { AXM.done(AXU); } catch (e) {} }
      else if (s.channel === 'kakao') {
        if (!ch.kakao) res = { ok: false, why: '알림톡 키 없음' };
        else {
          const p = pieces[0];
          res = solapiSend(to, 'SOLAPI_TPL_BRIEF', { '#{날짜}': date.slice(5).replace('-', '/'), '#{동네}': pieces.map(x => x.nm).join(', ').slice(0, 40),
            '#{건수}': String(pieces.reduce((n, x) => n + x.n, 0)), '#{신고가}': String(pieces.reduce((n, x) => n + x.hi, 0)), '#{한줄}': p.fact.slice(0, 120),
            '#{만료일}': s.end, '#{링크}': p.url.replace(/^https:\/\//, '') });
        }
      } else res = { ok: false, why: '웹 알림 준비 중' };
    } catch (e) { res = { ok: false, why: String(e.message || e).slice(0, 60) }; }
    bLog([date, s.id, s.channel, res.ok ? (res.ad ? '보냄(광고 ' + AD.id + ')' : '보냄') + (res.dp ? ' · 동네 파트너' : '') : '못 보냄: ' + res.why, pieces.length]);
    if (res.ok) { setB(o.row, '최근발송일', date); setB(o.row, '발송수', s.sent + 1); sent++; }
  });
  try { dpImpFlush(date, dpImp); } catch (e) {}
  if (admStop) { bLog([date, '', 'email', '운영자 계정: 시간·메일 한도 때문에 멈춤 — 다음 실행에서 이어서', 0]); return sent; }   // BRIEF_SENT 를 적지 않아 9시 실행이 이어 보냄
  briefExpiry(now);
  try { baTrialEnded(now); } catch (e) {}                // v50 체험 끝·카드 없음 → 딱 한 번 안내(자동결제가 열려 있을 때만)
  try { dpDaily(now); } catch (e) {}                     // v50 동네 파트너 매일 할 일(DONGNE_ENABLED 일 때만)
  try { briefAmRecheck(now); } catch (e) {}
  briefCleanup(now);
  P.setProperty('BRIEF_SENT', date);
  return sent;
}
/* v48 운영자 계정 발송: 지역 자료를 한꺼번에 받아(fetchAll) 메일 한 통에 BRIEF_ADM_CHUNK 곳씩. 어디까지 보냈는지 스크립트 속성 BRIEF_ADM_PROG 에 적어 두고 이어 보냄.
   돌려줌: true(다 보냄) · false(보낼 지역 자료 없음) · 'stop'(시간·메일 한도 — 다음 실행에서 이어서) */
function bAdminSend(o, s, um, date, t0, brief, M, AD, ix, AXM, cxOf, dpTail) {
  const P = PropertiesService.getScriptProperties(), k = String(o.r[BC['카카오id']]);
  const ub = um[k] || { areas: [], apts: [] }, myApts = (ub.apts || []).slice(0, s.apts), urg = s.urgPick && ub.urg ? ub.urg : BRIEF_URG.def;
  const areas = (ub.areas || []).slice(0, s.areas);
  bPrefetch(areas.map(a => a.g), brief);
  const pieces = areas.map(a => { const S = brief(a.g); return S ? briefPiece(S, a, s.pro, myApts, urg) : null; }).filter(Boolean);
  if (!pieces.length) { bLog([date, s.id, s.channel, '동네 자료 없음', 0]); return false; }
  const to = String(o.r[BC['연락처']]).replace(/^'/, ''), n = Math.ceil(pieces.length / BRIEF_ADM_CHUNK);
  const pg = parseJ(P.getProperty('BRIEF_ADM_PROG'), {}) || {};
  let i = pg.d === date && pg.id === s.id ? Number(pg.i) || 0 : 0;
  pieces.forEach(p => { p.url += `&src=mail&k=${bKey(s.id)}&day=${date}`; });
  const withAd = AD && o.r[BC['광고동의']] === true && o.r[BC['아침광고동의']] === true ? AD : null;
  let AXU = null; if (AXM && i === 0) try { AXU = AXM.forUser(k); } catch (e) { AXU = null; }   // 관심 단지·청약 알림·손님 단지는 첫 메일에만
  let bx = ''; if (i === 0) try { bx = bpMailHtml(k, cxOf, date); } catch (e) { bx = ''; }
  const dx = i === 0 && dpTail ? dpTail(o, s, ub, myApts, true) : '';   // v50 동네 파트너 칸은 첫 메일에만
  for (; i < n; i++) {
    const quota = MailApp.getRemainingDailyQuota ? MailApp.getRemainingDailyQuota() : 999;
    if (Date.now() - t0 > BRIEF_ADM_TIME || quota < BRIEF_ADM_MAIL_MIN) { P.setProperty('BRIEF_ADM_PROG', JSON.stringify({ d: date, id: s.id, i: i })); return 'stop'; }
    const part = pieces.slice(i * BRIEF_ADM_CHUNK, (i + 1) * BRIEF_ADM_CHUNK);
    try { briefMail(to, (ix && ix.date) || date, part, s, s.pro, M, Object.assign({}, ub, { apts: myApts }), (n > 1 ? `<div style="font-size:13px;color:#4E5968;margin:0 0 10px">운영자 모드 · ${n}통 중 ${i + 1}번째 메일 (지역 ${pieces.length}곳을 ${BRIEF_ADM_CHUNK}곳씩 나눠 보내요)</div>` : '') + (i === 0 ? (AXU ? AXU.html : '') + bx : ''), withAd, i === 0 ? dx : '');
      if (i === 0 && AXU) try { AXM.done(AXU); } catch (e) {} }
    catch (e) { bLog([date, s.id, s.channel, '못 보냄: ' + String(e.message || e).slice(0, 60), part.length]); P.setProperty('BRIEF_ADM_PROG', JSON.stringify({ d: date, id: s.id, i: i })); return 'stop'; }
    bLog([date, s.id, s.channel, `보냄(운영자 ${i + 1}/${n})`, part.length]);
    P.setProperty('BRIEF_ADM_PROG', JSON.stringify({ d: date, id: s.id, i: i + 1 }));
  }
  return true;
}
/* 여러 동네 자료를 한 번에 받아 brief() 캐시에 채움(UrlFetchApp.fetchAll, 30개씩) — 지역 수백 곳을 하나씩 받으면 6분 실행 한도에 걸릴 수 있어서 */
function bPrefetch(gs, brief) {
  if (!UrlFetchApp.fetchAll) return;
  const todo = gs.filter((g, i) => /^\d{5}$/.test(g) && gs.indexOf(g) === i && !brief.has(g));
  for (let i = 0; i < todo.length; i += 30) {
    const part = todo.slice(i, i + 30), v = Date.now();
    let res = [];
    try { res = UrlFetchApp.fetchAll(part.map(g => ({ url: BRIEF_DATA + g + '.json?v=' + v, muteHttpExceptions: true }))
      .concat(part.map(g => ({ url: BRIEF_DATA + 'wk/' + g + '.json?v=' + v, muteHttpExceptions: true })))); } catch (e) { return; }
    const js = r => { try { return r && r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) : null; } catch (e) { return null; } };
    part.forEach((g, j) => { const S = js(res[j]); if (S) brief.put(g, S, js(res[part.length + j])); });
  }
}
/* 만료 3일 전·마지막 날 안내 (자동 결제 없음 — 이어 받으려면 새 이용권) */
function briefExpiry(now) {
  bRows().forEach(o => {
    const s = briefState(o, now);
    if (!s.active) return;
    try { if (baTrialMail(o, s, now)) return; } catch (e) {}   // v50 자동결제가 열려 있으면 체험은 5일째 카드 등록 안내 한 번만
    const tag = s.left === 3 ? 'D-3' : s.left === 1 ? 'D-0' : '';
    if (!tag || String(o.r[BC['만료알림']]).indexOf(tag) >= 0) return;
    const to = String(o.r[BC['연락처']]).replace(/^'/, '');
    try {
      if (s.channel === 'email') MailApp.sendEmail({ to: to, name: SITE_NAME, subject: `[${SITE_NAME}] ${BRIEF_NAME} 이용 기간이 ${s.left === 1 ? '오늘' : s.left + '일 뒤'} 끝나요`,
        htmlBody: `<div style="font-family:sans-serif;line-height:1.7">${bEsc(s.product)} 이용 기간이 ${s.end}에 끝나요. 자동으로 결제되지 않아요.<br>${s.next ? `다음 이용권은 고르신 대로 ${bEsc(s.nextLabel)} 요금제로 준비해 두었어요.<br>` : ''}계속 받으시려면 이용권을 새로 구매해 주세요: <a href="${BRIEF_WEB}subscribe/${s.next ? '?p=' + s.next : ''}">${BRIEF_WEB}subscribe/</a></div>` });
      else if (s.channel === 'kakao') solapiSend(to, 'SOLAPI_TPL_EXPIRE', { '#{상품}': s.product, '#{만료일}': s.end, '#{링크}': (BRIEF_WEB + 'subscribe/').replace(/^https:\/\//, '') });
      setB(o.row, '만료알림', (String(o.r[BC['만료알림']] || '') + ' ' + tag).trim());
    } catch (e) {}
  });
}
/* 이용 끝난 뒤 30일 지난 연락처 원문 지우기 + 하루 넘은 결제대기 행 정리 */
function briefCleanup(now) {
  const t = dOnly(ymd(now)), del = [];
  bRows().forEach(o => {
    const st = String(o.r[BC['상태']]), e = dOnly(o.r[BC['만료일']]), made = o.r[BC['생성시각']] instanceof Date ? o.r[BC['생성시각']] : null;
    if (st === BST.wait && made && now - made > 2 * 86400000) { del.push(o.row); return; }
    const endish = st === BST.stop ? dOnly(o.r[BC['해지일']]) || e : e;
    if (endish && addDays(endish, BRIEF_KEEP_DAYS) < t && String(o.r[BC['연락처']])) setB(o.row, '연락처', '');
  });
  del.sort((a, b) => b - a).forEach(r => bSheet().deleteRow(r));
}


/* =====================================================================
   v19 중개사 업무 도구 — ① 매수·매도 문의 연결 ② (적정 가격 근거표는 화면만, 서버 없음) ③ 고객 관심 단지 변화 알림
   원칙
   - 집코드는 중개하지 않고 보수도 받지 않는다: 이용자가 '중개사 연락 받기'에 따로 동의하고 고른(또는 공개 순번 규칙으로 정해진)
     제휴 중개사에게 문의를 '전달'만 한다. 매물을 게시하지 않고, 건별 수수료·성과 보수를 받지 않는다(정액 제휴 이용료만).
   - 연락처 원값은 시트에 쓰지 않는다: 서버 비밀키(스크립트 속성 LEAD_KEY, 처음 쓸 때 자동 생성)로 암호화한 값 + 가린 값(010-****-1234)
     + 중복 확인용 해시만. 받은 중개사가 로그인한 대시보드에서만 풀어서 보여 준다. 90일 뒤(또는 이용자가 취소하면 바로) 지운다.
   - 중개사 로그인 유지: 등록번호+관리코드 확인 뒤 무작위 세션 토큰 발급, 시트에는 해시만(30일).
   - 고객 관심 단지: 서버에는 중개사가 붙인 별칭(이름·전화번호 모양은 거절)과 고객 구분값 해시, 단지 키만. 고객 이름은 중개사 기기에만.
   - 순번 배정 규칙(공개): 그 구를 노출 지역으로 고른 승인·기간 내 제휴 중개사 중 '순번 문의를 가장 오래전에 받은 곳'부터 LEAD_TURN_N곳,
     같으면 무작위. 상품(기본·프리미엄)·요금·리뷰·미래가치 점수와 무관.
   새 요청(POST): leadCreate(누구나, 동의 필수) · agentLogin · agentLogout · agentInbox · agentLeadUpdate · agentPrefs
                 · watchList · watchSave · watchRemove   (GET) leadCancel(이용자 취소 링크)
   최초 1회: 편집기에서 setupAgentTools 실행 → '중개문의'·'중개사세션'·'고객관심'·'고객알림'·'중개사설정' 시트 + 매일 오전 8시 점검 트리거
   ===================================================================== */
const AGT_ACTIONS = { leadCreate: 1, agentLogin: 1, agentLogout: 1, agentInbox: 1, agentLeadUpdate: 1, agentPrefs: 1, watchList: 1, watchSave: 1, watchRemove: 1 };
const SH_AGQ = '중개문의', SH_AS = '중개사세션', SH_W = '고객관심', SH_WE = '고객알림', SH_AP = '중개사설정';
const AGQH = ['id', '시각', '출처', '종류', '구코드', '단지키', '단지명', '평형', '방식', '받은중개사', '진행', '연락처암호', '연락처가림', '연락처해시',
             '연락시간', '메모', '동의문구', '동의시각', '취소토큰해시', '삭제예정일', '상태'];
const ASH = ['세션해시', '중개사id', '만든날', '만료일'];
const WH = ['id', '중개사id', '별칭', '고객해시', '단지', '종류', '본거래', '만든날', '수정일', '최근점검'];
const WEH = ['시각', '중개사id', '관심id', '종류', '단지키', '단지명', '내용', '읽음'];
const APH = ['중개사id', '알림메일', '메일알림', '수정일'];
const AGQC = Object.fromEntries(AGQH.map((h, i) => [h, i])), ASC = Object.fromEntries(ASH.map((h, i) => [h, i])), WC = Object.fromEntries(WH.map((h, i) => [h, i])),
      WEC = Object.fromEntries(WEH.map((h, i) => [h, i])), APC = Object.fromEntries(APH.map((h, i) => [h, i]));
const LEAD_PICK_MAX = 3, LEAD_TURN_N = 2, LEAD_KEEP_DAYS = 90, LEAD_PHONE_DAY = 3, LEAD_DAY_MAX = 300, LEAD_SAME_DAYS = 7;
const AGENT_SESSION_DAYS = 30, WATCH_MAX = 50, WATCH_KEYS = 10, WATCH_FP_DAYS = 150, DROP_PCT = 10;
const LEAD_KIND = { buy: '매수 문의', sell: '매도 문의', both: '매수·매도 문의' };
const LEAD_SRC = { report: '맞춤 매수 리포트', mine: '내 집 시세', alert: '관심 단지 알림', sell: '집 내놓기', compare: '단지 비교' };
const LEAD_STEP = { new: '새 문의', contacted: '연락함', meeting: '상담 중', done: '마무리', pass: '못 맡음' };
const LEAD_CONSENT_V = 'lead-2026-11-21';   // 화면 동의 문구 판(assets/lead.js CONSENT_V 와 같아야 함)
const PRICE_URL = 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/data/price/';
const AGENT_SITE = WEB_ROOT + 'agent/my/';

function agtDispatch(b) {
  try {
    if (b.action === 'leadCreate') return withLock(() => leadCreate(b));
    if (b.action === 'agentLogin') return withLock(() => agentLogin(b));
    return withLock(() => {
      const me = agentSession(b.s);
      if (b.action === 'agentLogout') return agentLogout(b);
      if (b.action === 'agentInbox') return agentInbox(me);
      if (b.action === 'agentLeadUpdate') return agentLeadUpdate(me, b);
      if (b.action === 'agentPrefs') return agentPrefs(me, b);
      if (b.action === 'watchList') return watchList(me);
      if (b.action === 'watchSave') return watchSave(me, b);
      if (b.action === 'watchRemove') return watchRemove(me, b);
      return { ok: false, err: 'unknown' };
    });
  } catch (x) {
    return { ok: false, err: String(x.message || x), code: x.code || '' };
  }
}

/* ---------- 발송 채널 추상화 ----------
   to = {mail, kakao}, msg = {title, lines[], url, button}. 채널마다 보낼 수 있으면 보내고 결과를 돌려준다.
   카카오 알림톡은 아침 브리핑과 같은 발송 모듈(solapiSend, 솔라피 키)을 그대로 쓴다. 중개사용 템플릿 id 는 스크립트 속성 SOLAPI_TPL_AGENT
   (변수 #{제목}·#{내용}·#{링크}) — 없으면 알림톡은 건너뛰고 메일만 보낸다. 받는 번호는 중개사 등록 전화가 휴대폰일 때만. */
const AGT_CHANNELS = {
  mail(to, msg) {
    if (!to.mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.mail)) return false;
    if (MailApp.getRemainingDailyQuota && MailApp.getRemainingDailyQuota() < 5) return false;
    const li = (msg.lines || []).map(t => `<li style="margin:4px 0">${uText(t, 300)}</li>`).join('');
    MailApp.sendEmail({ to: to.mail, name: '집코드 중개사 도구', subject: '[집코드] ' + uText(msg.title, 80),
      htmlBody: `<div style="font-family:'Noto Sans KR',sans-serif;max-width:560px;margin:auto;color:#191F28"><h2 style="font-size:18px">${uText(msg.title, 80)}</h2><ul style="padding-left:18px">${li}</ul>`
        + `<p><a href="${msg.url || AGENT_SITE}" style="background:#2F6BFF;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:700">${uText(msg.button || '중개사 대시보드 열기', 30)}</a></p>`
        + `<p style="font-size:12px;color:#6B7684">고객 연락처는 메일에 넣지 않아요. 대시보드에 로그인해서 확인해 주세요. 알림을 끄려면 대시보드 [설정]에서 [메일 알림]을 끄세요.</p></div>` });
    return true;
  },
  kakao(to, msg) {
    if (!to.kakao || typeof solapiSend !== 'function') return false;
    const r = solapiSend(to.kakao, 'SOLAPI_TPL_AGENT', { '#{제목}': uText(msg.title, 60), '#{내용}': (msg.lines || []).map(t => uText(t, 120)).join('\n').slice(0, 600), '#{링크}': msg.url || AGENT_SITE }, msg.url || AGENT_SITE);
    return !!(r && r.ok);
  }
};
function sendNotice(to, msg) {
  const res = {};
  Object.keys(AGT_CHANNELS).forEach(ch => { try { res[ch] = AGT_CHANNELS[ch](to || {}, msg || {}); } catch (e) { res[ch] = false; } });
  return res;
}

/* ---------- 연락처 암호화 (HMAC-SHA256 키 흐름 + 위변조 확인) ---------- */
function leadKey() {
  const P = PropertiesService.getScriptProperties();
  let k = P.getProperty('LEAD_KEY');
  if (!k) { k = newToken() + newToken(); P.setProperty('LEAD_KEY', k); }
  return k;
}
const hmac = (s, key) => Utilities.computeHmacSha256Signature(s, key);
function sealText(plain) {
  const key = leadKey(), nonce = newToken().slice(0, 24);
  const pb = Utilities.newBlob(String(plain)).getBytes(), out = [];
  for (let i = 0; i < pb.length; i += 32) {
    const ks = hmac('ks|' + nonce + '|' + (i / 32), key);
    for (let j = 0; j < 32 && i + j < pb.length; j++) out.push(((pb[i + j] ^ ks[j]) << 24) >> 24);
  }
  const ct = Utilities.base64EncodeWebSafe(out);
  return 'e1.' + nonce + '.' + ct + '.' + hex(hmac('mac|' + nonce + '|' + ct, key)).slice(0, 32);
}
function openText(sealed) {
  const p = String(sealed || '').split('.');
  if (p.length !== 4 || p[0] !== 'e1') return '';
  const key = leadKey();
  if (!safeEq(hex(hmac('mac|' + p[1] + '|' + p[2], key)).slice(0, 32), p[3])) return '';
  const cb = Utilities.base64DecodeWebSafe(p[2]), out = [];
  for (let i = 0; i < cb.length; i += 32) {
    const ks = hmac('ks|' + p[1] + '|' + (i / 32), key);
    for (let j = 0; j < 32 && i + j < cb.length; j++) out.push(((cb[i + j] ^ ks[j]) << 24) >> 24);
  }
  return Utilities.newBlob(out).getDataAsString();
}

/* ---------- 중개사 로그인 (등록번호 + 관리코드 → 세션) ---------- */
function agentLogin(b) {
  const list = agents(), me = findMe(b, list);
  const s = newToken(), now = new Date(), exp = new Date(now.getTime() + AGENT_SESSION_DAYS * 86400000);
  const sh = uSheet(SH_AS, ASH), v = sh.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) {                       // 만료된 세션 정리 + 같은 중개사 세션은 최근 5개만
    if (!(new Date(v[i][ASC['만료일']]).getTime() > now.getTime())) sh.deleteRow(i + 1);
  }
  const mine = sh.getDataRange().getValues().map((r, i) => ({ r, row: i + 1 })).slice(1).filter(x => String(x.r[ASC['중개사id']]) === me.id);
  mine.slice(0, Math.max(0, mine.length - 4)).map(x => x.row).sort((a, c) => c - a).forEach(r => sh.deleteRow(r));
  const r = []; r[ASC['세션해시']] = hashOf('agt|' + s); r[ASC['중개사id']] = me.id; r[ASC['만든날']] = now; r[ASC['만료일']] = exp;
  sh.appendRow(ASH.map((h, i) => r[i] === undefined ? '' : r[i]));
  return { ok: true, s: s, exp: ymd(exp), me: agentPublic(me) };
}
function agentSession(s) {
  s = String(s || '');
  if (!/^[0-9a-f]{64}$/.test(s)) throw authErr('중개사 로그인이 끝났어요. 다시 로그인해 주세요.');
  const h = hashOf('agt|' + s), sh = book().getSheetByName(SH_AS);
  if (!sh) throw authErr('중개사 로그인이 끝났어요. 다시 로그인해 주세요.');
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (safeEq(String(v[i][ASC['세션해시']]), h)) {
    if (!(new Date(v[i][ASC['만료일']]).getTime() > Date.now())) { sh.deleteRow(i + 1); break; }
    const me = agents().find(a => a.id === String(v[i][ASC['중개사id']]));
    if (me) return me;
  }
  throw authErr('중개사 로그인이 끝났어요. 다시 로그인해 주세요.');
}
function agentLogout(b) {
  const h = hashOf('agt|' + String(b.s || '')), sh = book().getSheetByName(SH_AS); if (!sh) return { ok: true };
  const v = sh.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) if (safeEq(String(v[i][ASC['세션해시']]), h)) sh.deleteRow(i + 1);
  return { ok: true };
}
function agentPublic(a) {
  return { id: a.id, office: a.office, name: a.type === TYPE.member ? a.name : a.ceo, type: a.type, plan: a.plan, og: a.og, ogName: a.ogName, dong: a.dong,
    regions: regionsOf(a), status: statusOf(a), expires: a.expires instanceof Date ? ymd(a.expires) : '', phone: a.phone };
}
function agentPrefRow(id) {
  const sh = uSheet(SH_AP, APH), v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][APC['중개사id']]) === id) return { row: i + 1, mail: String(v[i][APC['알림메일']] || ''), on: v[i][APC['메일알림']] !== 'N' };
  return { row: 0, mail: '', on: true };
}
function agentPrefs(me, b) {
  const p = agentPrefRow(me.id);
  if (b.set) {
    const mail = str(b.mail, 80).toLowerCase();
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) throw new Error('알림 받을 메일 주소를 확인해 주세요.');
    const sh = uSheet(SH_AP, APH), r = []; r[APC['중개사id']] = me.id; r[APC['알림메일']] = cellSafe(mail); r[APC['메일알림']] = b.on === false ? 'N' : 'Y'; r[APC['수정일']] = new Date();
    const row = APH.map((h, i) => r[i] === undefined ? '' : r[i]);
    if (p.row) sh.getRange(p.row, 1, 1, APH.length).setValues([row]); else sh.appendRow(row);
    return { ok: true, mail: mail, on: b.on !== false };
  }
  return { ok: true, mail: p.mail || me.mail || '', on: p.on };
}
function noticeTo(a) { const p = agentPrefRow(a.id); return p.on ? { mail: p.mail || a.mail || '', kakao: leadPhone(a.phone) } : {}; }

/* ---------- ① 문의 만들기 (이용자) ---------- */
function leadPhone(v) {
  const d = String(v == null ? '' : v).replace(/[^0-9]/g, '');
  return /^01[016789]\d{7,8}$/.test(d) ? d : '';
}
const maskPhone = d => d.slice(0, 3) + '-****-' + d.slice(-4);
const CUT_NAME = /\d{4,}|@|https?:/i;
/* 순번 배정: 공개 규칙 그대로 (가장 오래전에 순번 문의를 받은 곳부터, 같으면 무작위) */
function turnPick(cands, lastTurn, n, rnd) {
  rnd = rnd || Math.random;
  return cands.map(a => ({ a, t: lastTurn[a.id] || 0, r: rnd() })).sort((x, y) => x.t - y.t || x.r - y.r).slice(0, n).map(x => x.a);
}
function leadRows() { const sh = uSheet(SH_AGQ, AGQH); return { sh, v: sh.getDataRange().getValues() }; }
function leadCreate(b) {
  if (!b.agree || String(b.cv || '') !== LEAD_CONSENT_V) throw new Error('개인정보 제3자 제공(고른 중개사에게 연락처 전달)에 동의해 주세요.');
  const phone = leadPhone(b.phone);
  if (!phone) throw new Error('휴대폰 번호를 정확히 입력해 주세요.');
  const g = str(b.g, 5); if (!/^\d{5}$/.test(g)) throw new Error('지역을 다시 골라 주세요.');
  const kind = LEAD_KIND[b.kind] ? b.kind : '';
  if (!kind) throw new Error('매수 문의인지 매도 문의인지 골라 주세요.');
  const src = LEAD_SRC[b.src] ? b.src : 'report';
  const key = str(b.k, 160), apt = uText(b.apt, 60), band = uText(b.band, 20);
  if (key && (!/^\d{5}\|[^|]{1,30}\|[^|]{1,60}$/.test(key) || key.slice(0, 5) !== g)) throw new Error('단지 정보를 다시 골라 주세요.');
  const memo = uText(b.memo, 100), when = uText(b.when, 20);
  const list = agents().filter(isActive), cands = list.filter(a => regionsOf(a).indexOf(g) >= 0);
  if (!cands.length) throw new Error('이 지역에는 아직 제휴 중개사가 없어요.');
  const mode = b.mode === 'turn' ? 'turn' : 'pick';
  const { sh, v } = leadRows(), now = new Date(), day = ymd(now), ph = hashOf('lead|' + phone);
  const rows = v.slice(1);
  if (rows.filter(r => r[AGQC['시각']] instanceof Date && ymd(r[AGQC['시각']]) === day).length >= LEAD_DAY_MAX) throw new Error('오늘 문의가 많아 잠시 받을 수 없어요. 내일 다시 시도해 주세요.');
  if (rows.filter(r => String(r[AGQC['연락처해시']]) === ph && r[AGQC['시각']] instanceof Date && ymd(r[AGQC['시각']]) === day).length >= LEAD_PHONE_DAY) throw new Error(`같은 번호로는 하루 ${LEAD_PHONE_DAY}건까지 문의할 수 있어요.`);
  if (rows.some(r => String(r[AGQC['연락처해시']]) === ph && String(r[AGQC['구코드']]) === g && String(r[AGQC['단지키']]) === key && String(r[AGQC['상태']]) === '진행'
      && r[AGQC['시각']] instanceof Date && now - r[AGQC['시각']] < LEAD_SAME_DAYS * 86400000)) throw new Error(`같은 곳 문의는 ${LEAD_SAME_DAYS}일에 한 번만 보낼 수 있어요. 이미 보낸 문의는 중개사가 확인하고 있어요.`);
  let to;
  if (mode === 'pick') {
    const ids = (Array.isArray(b.ids) ? b.ids : []).map(String).filter((x, i, a) => ID_RE.test(x) && a.indexOf(x) === i);
    if (!ids.length) throw new Error('연락받을 중개사를 1곳 이상 골라 주세요.');
    if (ids.length > LEAD_PICK_MAX) throw new Error(`중개사는 ${LEAD_PICK_MAX}곳까지 고를 수 있어요.`);
    to = ids.map(id => cands.find(a => a.id === id)).filter(Boolean);
    if (to.length !== ids.length) throw new Error('고른 중개사 중 지금 이 지역 문의를 받지 않는 곳이 있어요. 화면을 새로 고쳐 다시 골라 주세요.');
  } else {
    const last = {};
    rows.forEach(r => { if (String(r[AGQC['방식']]) !== 'turn' || !(r[AGQC['시각']] instanceof Date)) return;
      parseJ(r[AGQC['받은중개사']], []).forEach(id => { last[id] = Math.max(last[id] || 0, r[AGQC['시각']].getTime()); }); });
    to = turnPick(cands, last, LEAD_TURN_N);
  }
  const id = 'Q' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase(), cancel = newToken().slice(0, 32);
  const prog = {}; to.forEach(a => prog[a.id] = { s: 'new', at: '' });
  const r = [];
  r[AGQC['id']] = id; r[AGQC['시각']] = now; r[AGQC['출처']] = src; r[AGQC['종류']] = kind; r[AGQC['구코드']] = g; r[AGQC['단지키']] = cellSafe(key); r[AGQC['단지명']] = cellSafe(apt);
  r[AGQC['평형']] = cellSafe(band); r[AGQC['방식']] = mode; r[AGQC['받은중개사']] = JSON.stringify(to.map(a => a.id)); r[AGQC['진행']] = JSON.stringify(prog);
  r[AGQC['연락처암호']] = sealText(phone); r[AGQC['연락처가림']] = maskPhone(phone); r[AGQC['연락처해시']] = ph; r[AGQC['연락시간']] = cellSafe(when); r[AGQC['메모']] = cellSafe(memo);
  r[AGQC['동의문구']] = LEAD_CONSENT_V; r[AGQC['동의시각']] = now; r[AGQC['취소토큰해시']] = hashOf('lc|' + cancel);
  r[AGQC['삭제예정일']] = new Date(now.getTime() + LEAD_KEEP_DAYS * 86400000); r[AGQC['상태']] = '진행';
  sh.appendRow(AGQH.map((h, i) => r[i] === undefined ? '' : r[i]));
  const gn = uText(b.gn, 20) || (cands.find(a => a.og === g) || {}).ogName || g;
  const where = (apt ? apt + (band ? ' ' + band : '') + ' · ' : '') + gn;
  to.forEach(a => { try { sendNotice(noticeTo(a), { title: `새 ${LEAD_KIND[kind]}가 도착했어요`, lines: [where, `${LEAD_SRC[src]}에서 이용자가 ${mode === 'pick' ? '직접 고른' : '순번으로 정해진'} 문의예요.`, '연락처는 대시보드에서만 볼 수 있어요.'] }); } catch (e) {} });
  return { ok: true, id: id, cancel: cancel, to: to.map(a => ({ id: a.id, n: a.type === TYPE.member ? a.name + ' 공인중개사' : a.office })), keep: LEAD_KEEP_DAYS };
}
/* 이용자 취소 링크(완료 화면에서 준 주소): 연락처를 바로 지우고 문의를 닫는다 */
function leadCancel(p) {
  const id = String(p.id || ''), t = String(p.t || '');
  let done = false;
  if (/^Q[0-9A-F]{9}$/.test(id) && /^[0-9a-f]{32}$/.test(t)) {
    withLock(() => {
      const { sh, v } = leadRows();
      for (let i = 1; i < v.length; i++) if (String(v[i][AGQC['id']]) === id && safeEq(String(v[i][AGQC['취소토큰해시']]), hashOf('lc|' + t))) {
        ['연락처암호', '연락처가림', '연락시간', '메모'].forEach(h => sh.getRange(i + 1, AGQC[h] + 1).setValue(''));
        sh.getRange(i + 1, AGQC['상태'] + 1).setValue('취소'); done = true;
      }
    });
  }
  return HtmlService.createHtmlOutput(`<div style="font-family:sans-serif;padding:40px;text-align:center"><h2>${done ? '문의를 취소하고 연락처를 지웠어요' : '문의를 찾지 못했어요'}</h2>
    <p>${done ? '중개사 화면에서도 더 이상 연락처가 보이지 않아요.' : '이미 취소했거나 보관 기간이 지나 지워졌을 수 있어요.'}</p><p><a href="${WEB_ROOT}">${SITE_NAME}로 가기</a></p></div>`);
}

/* ---------- ① 중개사: 받은 문의 · 응답 처리 ---------- */
function leadOut(r, me) {
  const prog = parseJ(r[AGQC['진행']], {}), mine = prog[me.id] || { s: 'new' }, open = String(r[AGQC['상태']]) === '진행';
  const others = Object.keys(prog).filter(id => id !== me.id).length;
  return { id: String(r[AGQC['id']]), at: r[AGQC['시각']] instanceof Date ? Utilities.formatDate(r[AGQC['시각']], 'Asia/Seoul', 'yyyy-MM-dd HH:mm') : '',
    src: LEAD_SRC[r[AGQC['출처']]] || '', kind: LEAD_KIND[r[AGQC['종류']]] || '', g: String(r[AGQC['구코드']]), k: String(r[AGQC['단지키']]).replace(/^'/, ''),
    apt: String(r[AGQC['단지명']]).replace(/^'/, ''), band: String(r[AGQC['평형']]).replace(/^'/, ''), mode: String(r[AGQC['방식']]), others: others,
    phone: open && mine.s !== 'pass' ? openText(r[AGQC['연락처암호']]) : '', mask: open ? String(r[AGQC['연락처가림']]) : '',
    when: open ? String(r[AGQC['연락시간']]).replace(/^'/, '') : '', memo: open ? String(r[AGQC['메모']]).replace(/^'/, '') : '',
    step: mine.s, stepAt: mine.at || '', state: String(r[AGQC['상태']]), until: r[AGQC['삭제예정일']] instanceof Date ? ymd(r[AGQC['삭제예정일']]) : '' };
}
function agentInbox(me) {
  const { v } = leadRows(), out = [];
  for (let i = v.length - 1; i >= 1 && out.length < 200; i--) if (parseJ(v[i][AGQC['받은중개사']], []).indexOf(me.id) >= 0) out.push(leadOut(v[i], me));
  const cnt = {}; out.filter(x => x.state === '진행').forEach(x => cnt[x.step] = (cnt[x.step] || 0) + 1);
  const prefs = agentPrefs(me, {});
  return { ok: true, me: agentPublic(me), leads: out, count: cnt, steps: LEAD_STEP, prefs: { mail: prefs.mail, on: prefs.on } };
}
function agentLeadUpdate(me, b) {
  const step = String(b.step || '');
  if (!LEAD_STEP[step] || step === 'new') throw new Error('처리 상태를 다시 골라 주세요.');
  const { sh, v } = leadRows();
  for (let i = 1; i < v.length; i++) if (String(v[i][AGQC['id']]) === String(b.id)) {
    const prog = parseJ(v[i][AGQC['진행']], {});
    if (!prog[me.id]) break;
    if (String(v[i][AGQC['상태']]) !== '진행') throw new Error('이용자가 취소했거나 보관 기간이 지난 문의예요.');
    prog[me.id] = { s: step, at: Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm') };
    sh.getRange(i + 1, AGQC['진행'] + 1).setValue(JSON.stringify(prog));
    v[i][AGQC['진행']] = JSON.stringify(prog);
    return { ok: true, lead: leadOut(v[i], me) };
  }
  throw new Error('문의를 찾지 못했어요.');
}

/* ---------- ③ 고객 관심 단지 ---------- */
const WKEY = /^\d{5}\|[^|]{1,30}\|[^|]{1,60}\|[^|]{0,20}$/;          // 구코드|동|단지|평형(빈 값 = 모든 평형)
function cleanAlias(v) {
  const s = uText(v, 12);
  if (!s) throw new Error('고객 별칭을 적어 주세요(예: 고객 A, 학군 이사).');
  if (CUT_NAME.test(s)) throw new Error('별칭에는 전화번호·메일 주소를 넣을 수 없어요. 고객 이름은 이 기기에만 저장돼요.');
  return s;
}
function watchRowsOf(id) {
  const sh = uSheet(SH_W, WH), v = sh.getDataRange().getValues(), out = [];
  for (let i = 1; i < v.length; i++) if (String(v[i][WC['중개사id']]) === id) out.push({ row: i + 1, r: v[i] });
  return { sh, out };
}
function watchOut(x) {
  const r = x.r;
  return { id: String(r[WC['id']]), alias: String(r[WC['별칭']]).replace(/^'/, ''), keys: parseJ(r[WC['단지']], []), kinds: parseJ(r[WC['종류']], {}),
    at: r[WC['수정일']] instanceof Date ? ymd(r[WC['수정일']]) : '', checked: r[WC['최근점검']] instanceof Date ? Utilities.formatDate(r[WC['최근점검']], 'Asia/Seoul', 'yyyy-MM-dd HH:mm') : '' };
}
function watchList(me) {
  const { out } = watchRowsOf(me.id);
  const es = uSheet(SH_WE, WEH).getDataRange().getValues().slice(1).filter(r => String(r[WEC['중개사id']]) === me.id).slice(-100).reverse()
    .map(r => ({ at: r[WEC['시각']] instanceof Date ? Utilities.formatDate(r[WEC['시각']], 'Asia/Seoul', 'yyyy-MM-dd HH:mm') : '', w: String(r[WEC['관심id']]), kind: String(r[WEC['종류']]),
      k: String(r[WEC['단지키']]).replace(/^'/, ''), n: String(r[WEC['단지명']]).replace(/^'/, ''), d: parseJ(r[WEC['내용']], {}) }));
  return { ok: true, watches: out.map(watchOut), events: es, max: WATCH_MAX, maxKeys: WATCH_KEYS, dropPct: DROP_PCT };
}
function watchSave(me, b) {
  const alias = cleanAlias(b.alias);
  const seen = {};
  const keys = (Array.isArray(b.keys) ? b.keys : []).slice(0, WATCH_KEYS + 5).map(x => ({ k: String(x && x.k || '').slice(0, 140), n: uText(x && x.n, 60) }))
    .filter(x => WKEY.test(x.k) && x.n && !seen[x.k] && (seen[x.k] = 1));
  if (!keys.length) throw new Error('관심 단지를 1곳 이상 골라 주세요.');
  if (keys.length > WATCH_KEYS) throw new Error(`고객 1명당 관심 단지는 ${WATCH_KEYS}곳까지예요.`);
  const k = b.kinds || {}, kinds = { trade: k.trade !== false, high: k.high !== false, drop: k.drop !== false };
  const ref = String(b.ref || ''); if (!/^[0-9a-f]{16,32}$/.test(ref)) throw new Error('고객 구분값이 올바르지 않아요. 화면을 새로 고쳐 주세요.');
  const { sh, out } = watchRowsOf(me.id), now = new Date();
  const hit = b.id ? out.find(x => String(x.r[WC['id']]) === String(b.id)) : null;
  if (!hit && out.length >= WATCH_MAX) throw new Error(`고객 관심 단지 목록은 ${WATCH_MAX}명까지 저장할 수 있어요.`);
  const r = hit ? hit.r.slice() : [];
  if (!hit) { r[WC['id']] = 'W' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase(); r[WC['중개사id']] = me.id; r[WC['만든날']] = now; r[WC['본거래']] = '{}'; r[WC['최근점검']] = ''; }
  r[WC['별칭']] = cellSafe(alias); r[WC['고객해시']] = hashOf('cref|' + me.id + '|' + ref); r[WC['단지']] = JSON.stringify(keys); r[WC['종류']] = JSON.stringify(kinds); r[WC['수정일']] = now;
  /* 새로 넣은 단지는 지금 있는 거래를 '본 거래'로 채워 둔다(첫 점검 때 옛 거래로 알림이 쏟아지지 않게) — 점검 때 채움 표시만 */
  const fp = parseJ(r[WC['본거래']], {}); Object.keys(fp).forEach(x => { if (!keys.some(y => y.k === x)) delete fp[x]; });
  keys.forEach(x => { if (!fp[x.k]) fp[x.k] = { seed: 1, f: [] }; });
  r[WC['본거래']] = JSON.stringify(fp);
  const row = WH.map((h, i) => r[i] === undefined ? '' : r[i]);
  if (hit) sh.getRange(hit.row, 1, 1, WH.length).setValues([row]); else sh.appendRow(row);
  return Object.assign(watchList(me), { saved: String(r[WC['id']]) });
}
function watchRemove(me, b) {
  const { sh, out } = watchRowsOf(me.id);
  out.filter(x => String(x.r[WC['id']]) === String(b.id)).map(x => x.row).sort((a, c) => c - a).forEach(r => sh.deleteRow(r));
  return watchList(me);
}

/* 한 단지 키의 새 거래 찾기 — units = price/{구}.json units, state = {seed, f:[지문]} → {events, state}
   지문 = 계약일|전용㎡|층|금액. 최근 WATCH_FP_DAYS 일 안 거래만 기억(늦게 신고된 거래도 새 거래로 잡힘).
   종류: high(신고가 표시 거래) · drop(직거래 제외, 그 평형 최근 3개월 평당 시세보다 DROP_PCT% 이상 낮은 거래) · trade(그 밖의 새 거래) */
function watchScan(units, key, state, today0, kinds) {
  const [g, dong, apt, band] = key.split('|');
  const us = (units || []).filter(u => u[0] === g && u[1] === dong && u[2] === apt && (!band || u[3] === band));
  const lim = Number(Utilities.formatDate(new Date(today0.getTime() - WATCH_FP_DAYS * 86400000), 'Asia/Seoul', 'yyyyMMdd'));
  const old = {}; (state && state.f || []).forEach(x => old[x] = 1);
  const f = [], events = [];
  us.forEach(u => {
    const s = u[6] || []; let ref = 0; for (let i = s.length - 1; i >= Math.max(0, s.length - 3); i--) if (s[i] > 0) { ref = s[i]; break; }
    (u[11] || []).forEach(t => {
      if (!(Number(t[0]) >= lim)) return;
      const id = [t[0], t[1], t[2], t[3]].join('|'); f.push(id);
      if (!state || state.seed || old[id]) return;
      const ppy = t[1] > 0 ? t[3] / t[1] * 3.3058 : 0, pct = ref > 0 && ppy > 0 ? Math.round((ppy - ref) / ref * 1000) / 10 : null;
      const kind = t[5] === 1 ? 'high' : (t[4] !== 1 && pct != null && pct <= -DROP_PCT ? 'drop' : 'trade');
      if (kinds && kinds[kind] === false) return;
      events.push({ kind, band: u[3], d: t[0], area: t[1], floor: t[2], amt: t[3], type: t[4], pct });
    });
  });
  return { events, state: { f: f.slice(0, 300) } };
}
function agentDaily() {
  const now = new Date();
  /* 보관 기간 지난 문의 연락처 지우기 */
  withLock(() => {
    const { sh, v } = leadRows();
    for (let i = 1; i < v.length; i++) if (String(v[i][AGQC['상태']]) === '진행' && v[i][AGQC['삭제예정일']] instanceof Date && v[i][AGQC['삭제예정일']] < now) {
      ['연락처암호', '연락처가림', '연락시간', '메모'].forEach(h => sh.getRange(i + 1, AGQC[h] + 1).setValue(''));
      sh.getRange(i + 1, AGQC['상태'] + 1).setValue('보관 끝');
    }
  });
  /* 고객 관심 단지 점검 */
  const sh = uSheet(SH_W, WH), v = sh.getDataRange().getValues(); if (v.length < 2) return;
  const act = {}; agents().filter(isActive).forEach(a => act[a.id] = a);
  const gus = {}; v.slice(1).forEach(r => { if (act[String(r[WC['중개사id']])]) parseJ(r[WC['단지']], []).forEach(x => gus[x.k.slice(0, 5)] = 1); });
  const units = {};
  Object.keys(gus).forEach(g => { try { units[g] = JSON.parse(UrlFetchApp.fetch(PRICE_URL + g + '.json').getContentText()).units || []; } catch (e) { units[g] = null; } });
  const es = uSheet(SH_WE, WEH), add = [], perAgent = {};
  for (let i = 1; i < v.length; i++) {
    const r = v[i], a = act[String(r[WC['중개사id']])]; if (!a) continue;
    const keys = parseJ(r[WC['단지']], []), kinds = parseJ(r[WC['종류']], {}), fp = parseJ(r[WC['본거래']], {});
    keys.forEach(x => {
      const us = units[x.k.slice(0, 5)]; if (!us) return;                   // 자료를 못 받은 구는 다음 날 다시
      const res = watchScan(us, x.k, fp[x.k], now, kinds);
      fp[x.k] = res.state;
      res.events.slice(0, 20).forEach(e => {
        add.push([now, a.id, String(r[WC['id']]), e.kind, cellSafe(x.k), cellSafe(x.n), JSON.stringify(e), '']);
        (perAgent[a.id] = perAgent[a.id] || []).push({ alias: String(r[WC['별칭']]).replace(/^'/, ''), n: x.n, e });
      });
    });
    sh.getRange(i + 1, WC['본거래'] + 1).setValue(JSON.stringify(fp));
    sh.getRange(i + 1, WC['최근점검'] + 1).setValue(now);
  }
  if (add.length) es.getRange(es.getLastRow() + 1, 1, add.length, WEH.length).setValues(add);
  const KN = { trade: '새 실거래', high: '신고가', drop: '큰 하락 거래' };
  Object.keys(perAgent).forEach(id => {
    const L = perAgent[id];
    try { sendNotice(noticeTo(act[id]), { title: `고객 관심 단지에 새 거래 ${L.length}건`, lines: L.slice(0, 10).map(x => `[${KN[x.e.kind]}] ${x.alias} · ${x.n} ${x.e.band} ${x.e.floor}층 ${eok(x.e.amt)}`).concat(L.length > 10 ? [`그 밖에 ${L.length - 10}건은 대시보드에서 볼 수 있어요.`] : []) }); } catch (e) {}
  });
}
function setupAgentTools() {
  [[SH_AGQ, AGQH], [SH_AS, ASH], [SH_W, WH], [SH_WE, WEH], [SH_AP, APH]].forEach(x => uSheet(x[0], x[1]));
  leadKey();
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'agentDaily').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('agentDaily').timeBased().everyDays(1).atHour(8).inTimezone('Asia/Seoul').create();
}


/* =====================================================================
   집코드 분양대행(v20) — 시행사 전속 의뢰 · 분양 현장 · 판매 파트너(대대행) · 계약 보고 · 수수료 정산
   운영 주체: (주)장대장부동산그룹(사업자 업종 '분양대행'). 신축 최초 분양(사업주체가 파는 것)의 판매 대행이며 중개가 아님.
   기존 주택·분양권 전매 알선(중개)은 이 흐름에 넣지 않는다 — 화면·계약서에 명시.
   원칙
   - 수수료 나눔은 우리 회사가 시행사와 맺은 분양대행 계약 범위 안에서만: 파트너에게 보이는 현장은 [승인] + [위탁계약일] + [재위탁승낙]
     (시행사가 판매 재위탁을 서면으로 승낙, 민법 제682조) + [상태]=모집 중 + 위탁기간 안인 현장뿐.
   - 현장 정보·수수료 조건은 공개하지 않는다: 로그인한(승인 + 판매 위탁 계약서 서명일이 있는) 파트너에게만, 수수료 조건은 그 현장에 배정된 파트너에게만.
   - 판매 파트너는 공인중개사로 한정하지 않음(분양대행사·공인중개사·부동산 전문가/유튜버·세미나 업체). 공인중개사 파트너도 이 현장 판매는
     분양대행의 재위탁이며 중개보수와 섞지 않는다.
   - 광고(분양 광고 v16)와 별개이고, 어떤 경우에도 미래가치 점수·순위에 반영하지 않는다.
   - 개인정보 최소: 계약 보고에 고객 이름·연락처를 받지 않는다(고객 표시는 이니셜·별칭 10자, 이름·전화번호 모양은 거절).
     파트너 관리코드는 해시만 저장(신청할 때 한 번만 보여 줌), 세션은 해시만(30일).
   새 요청(POST): agencyApply(시행사 의뢰, 누구나·동의 필수) · partnerApply(판매 파트너 신청, 누구나·동의 필수)
                 · partnerLogin · partnerLogout · partnerHome · partnerJoin(현장 판매 신청) · partnerDeal(계약 보고)
   최초 1회: 편집기에서 setupAgency 실행 → 시트 7개 + 매일 오전 6시 수수료 정산표 다시 만들기(settleSheet)
   검증: node tools/agency-test.js
   ===================================================================== */
const DV_ACTIONS = { agencyApply: 1, partnerApply: 1, partnerLogin: 1, partnerLogout: 1, partnerHome: 1, partnerJoin: 1, partnerDeal: 1 };
const SH_DV = '분양대행의뢰', SH_ST = '분양현장', SH_PT = '판매파트너', SH_PS = '파트너세션', SH_PA = '현장배정', SH_DL = '계약보고', SH_SE = '수수료정산';
const DVH = ['id', '접수일', '회사명', '사업자번호', '회사구분', '담당자', '연락처', '현장주소', '현장종류', '규모', '공사단계', '인허가구분', '분양시작희망',
             '희망조건', '문의내용', '동의', '처리상태', '처리일', '메모'];
const STH = ['id', '승인', '현장명', '종류', '시도', '시군구', '동', '규모', '분양가범위', '인허가구분', '위탁계약일', '위탁기간끝', '재위탁승낙',
             '파트너업무', '파트너수수료', '자료링크', '상태', '의뢰id', '총수수료조건', '내부메모'];
const PTH = ['id', '신청일', '유형', '상호', '사업자번호', '중개등록번호', '담당자', '연락처', '이메일', '활동지역', '채널', '소개', '관리코드해시',
             '승인', '계약서일', '정산방법', '동의', '상태', '메모'];
const PSH = ['세션해시', '파트너id', '만든날', '만료일'];
const PAH = ['id', '현장id', '파트너id', '신청일', '상태', '메모'];
const DLH = ['id', '보고일', '현장id', '파트너id', '계약일', '동호', '계약금액만원', '고객표시', '상태', '회사수수료원', '파트너몫원', '지급일', '메모'];
const SEH = ['정산월', '파트너id', '상호', '정산방법', '보고건수', '확인건수', '회사수수료원', '파트너몫원', '지급완료원', '미지급원', '만든시각'];
const DVC = Object.fromEntries(DVH.map((h, i) => [h, i])), STC = Object.fromEntries(STH.map((h, i) => [h, i])), PTC = Object.fromEntries(PTH.map((h, i) => [h, i])),
      PSC = Object.fromEntries(PSH.map((h, i) => [h, i])), PAC = Object.fromEntries(PAH.map((h, i) => [h, i])), DLC = Object.fromEntries(DLH.map((h, i) => [h, i]));
const DV_KIND = { villa: '빌라(다세대·연립)', dosi: '도시형생활주택', offi: '오피스텔', shop: '상가', apt: '아파트', mixed: '주상복합', etc: '그 밖' };
const DV_ROLE = { dev: '시행사', owner: '건축주(법인)', trust: '신탁사', agency: '분양대행사', build: '시공사', etc: '그 밖' };
const DV_STAGE = { pre: '착공 전', build: '공사 중', done: '준공(사용승인) 뒤', unsold: '분양 중(미분양)' };
const DV_PERMIT = { hs: '주택법 사업계획승인', bd: '건축물분양법 분양신고', free: '건축허가만', unk: '모름' };
const PT_TYPE = { agency: '분양대행사', broker: '공인중개사', expert: '부동산 전문가·유튜버', seminar: '세미나·교육 업체', etc: '그 밖' };
const PT_PAY = { invoice: '세금계산서(사업자)', income: '사업소득 3.3% 원천징수(개인)' };
const DL_STEP = ['보고', '시행사확인', '정산대기', '지급완료', '취소'];
const DV_DAILY = 50, PT_DAILY = 50, PT_SESSION_DAYS = 30, PT_JOIN_MAX = 20, DL_DAY_MAX = 30;
const DV_CONSENT_V = 'dv-2026-11-21', PT_CONSENT_V = 'pt-2026-11-21';
const PARTNER_SITE = WEB_ROOT + 'partner/';

function dvDispatch(b) {
  try {
    if (b.action === 'agencyApply') return withLock(() => agencyApply(b));
    if (b.action === 'partnerApply') return withLock(() => partnerApply(b));
    if (b.action === 'partnerLogin') return withLock(() => partnerLogin(b));
    return withLock(() => {
      if (b.action === 'partnerLogout') return partnerLogout(b);
      const me = partnerSession(b.s);
      if (b.action === 'partnerHome') return partnerHome(me);
      if (b.action === 'partnerJoin') return partnerJoin(me, b);
      if (b.action === 'partnerDeal') return partnerDeal(me, b);
      return { ok: false, err: 'unknown' };
    });
  } catch (x) {
    return { ok: false, err: String(x.message || x), code: x.code || '' };
  }
}
function dvRows(name, head) {
  const sh = uSheet(name, head);
  return { sh, v: sh.getDataRange().getValues() };
}
function dvDay(key, max, msg) {
  const cache = CacheService.getScriptCache(), dk = key + ':' + ymd(new Date()), n = Number(cache.get(dk) || 0);
  if (n >= max) throw new Error(msg);
  cache.put(dk, String(n + 1), 86400);
}
function dvPick(v, map, label, need) {
  const x = String(v == null ? '' : v);
  if (!x) { if (need) throw new Error(label + '을(를) 골라 주세요.'); return ''; }
  if (!map[x]) throw new Error(label + '을(를) 다시 골라 주세요.');
  return map[x];
}
function dvMemo(v, n, label) {
  const m = String(v == null ? '' : v).replace(/[\u0000-\u0009\u000B-\u001F\u007F<>]/g, ' ').trim();
  if (m.length > n) throw new Error(`${label}은(는) ${n.toLocaleString()}자 이내로 입력해 주세요.`);
  if (/^[=+\-@\t\r]/.test(m)) throw new Error(`${label}은(는) = + - @ 기호로 시작할 수 없습니다.`);
  return m;
}
const newDvId = p => p + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
function ownerMail(subject, lines) {
  if (!NOTIFY) return;
  try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), subject, lines.concat(['', book().getUrl()]).join('\n')); } catch (e) {}
}

/* ---------- ① 시행사 전속 분양대행 의뢰 ---------- */
function agencyApply(b) {
  if (String(b.hp || '')) throw new Error('의뢰를 처리하지 못했습니다.');
  if (!(b.agree === true && b.cv === DV_CONSENT_V)) throw new Error('개인정보 수집·이용에 동의해 주세요.');
  const company = adText(b.company, 60, '회사명', true);
  const biz = bizOk(b.biz);
  if (!biz) throw new Error('사업자등록번호 10자리를 확인해 주세요.');
  const role = dvPick(b.role, DV_ROLE, '회사 구분', true);
  const manager = adText(b.manager, 30, '담당자 이름', true);
  const contact = aqContact(b.contact);
  const addr = adText(b.addr, 80, '현장 주소', true);
  const kind = dvPick(b.kind, DV_KIND, '현장 종류', true);
  const units = adInt(b.units, '세대·호실 수', 1, 99999, false);
  const stage = dvPick(b.stage, DV_STAGE, '공사 단계', true);
  const permit = dvPick(b.permit || 'unk', DV_PERMIT, '인허가 구분', true);
  const start = adText(b.start, 30, '분양 시작 희망 시기', false);
  const terms = dvMemo(b.terms, 300, '희망 조건');
  const memo = dvMemo(b.memo, 1000, '문의 내용');
  dvDay('dvday', DV_DAILY, '오늘 의뢰가 많아 카카오톡 채널이나 전화로 연락해 주세요.');
  const id = newDvId('DV'), r = [];
  r[DVC['id']] = id; r[DVC['접수일']] = new Date(); r[DVC['회사명']] = company; r[DVC['사업자번호']] = biz; r[DVC['회사구분']] = role;
  r[DVC['담당자']] = manager; r[DVC['연락처']] = contact; r[DVC['현장주소']] = addr; r[DVC['현장종류']] = kind; r[DVC['규모']] = units;
  r[DVC['공사단계']] = stage; r[DVC['인허가구분']] = permit; r[DVC['분양시작희망']] = start; r[DVC['희망조건']] = terms; r[DVC['문의내용']] = memo;
  r[DVC['동의']] = `${DV_CONSENT_V} 개인정보 수집·이용 동의 ${ymd(new Date())}`; r[DVC['처리상태']] = '접수';
  uSheet(SH_DV, DVH).appendRow(DVH.map((h, i) => r[i] === undefined ? '' : r[i]));
  ownerMail(`[집코드 분양대행 의뢰] ${company}`, [`접수 번호 ${id}`, `${role} · ${company}`, `현장 ${kind}${units ? ' ' + units + '세대·호실' : ''} · ${stage} · ${permit}`,
    `담당자 연락처는 '${SH_DV}' 시트에서 확인하세요(메일에는 넣지 않아요).`, `계약하면 '${SH_ST}' 시트에 현장을 만들고 [의뢰id]에 ${id} 를 적어 주세요.`]);
  return { ok: true, id: id };
}

/* ---------- ② 판매 파트너 신청·로그인 ---------- */
function partnerApply(b) {
  if (String(b.hp || '')) throw new Error('신청을 처리하지 못했습니다.');
  if (!(b.agree === true && b.cv === PT_CONSENT_V)) throw new Error('개인정보 수집·이용에 동의해 주세요.');
  const type = String(b.type || '');
  const typeT = dvPick(type, PT_TYPE, '파트너 유형', true);
  const name = adText(b.name, 60, '상호(또는 활동명)', true);
  const biz = String(b.biz || '').trim() ? bizOk(b.biz) : '';
  if (String(b.biz || '').trim() && !biz) throw new Error('사업자등록번호 10자리를 확인해 주세요.');
  if ((type === 'agency' || type === 'seminar') && !biz) throw new Error('분양대행사·세미나 업체는 사업자등록번호가 필요해요.');
  const reg = adText(b.reg, 30, '중개사무소 등록번호', type === 'broker');
  const manager = adText(b.manager, 30, '담당자 이름', true);
  const phone = adPhone(b.phone);
  const email = String(b.email || '').trim();
  if (email && !/^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) throw new Error('이메일 형식을 확인해 주세요.');
  const area = adText(b.area, 60, '활동 지역', true);
  const channel = adUrl(b.channel, '채널 주소', false);
  const intro = dvMemo(b.intro, 500, '소개');
  const pay = dvPick(b.pay || (biz ? 'invoice' : 'income'), PT_PAY, '정산 방법', true);
  if (pay === PT_PAY.invoice && !biz) throw new Error('세금계산서 정산은 사업자등록번호가 필요해요.');
  dvDay('ptday', PT_DAILY, '오늘 신청이 많아 내일 다시 시도해 주세요.');
  const { v } = dvRows(SH_PT, PTH);
  if (v.slice(1).some(r => String(r[PTC['연락처']]) === phone && String(r[PTC['상태']]) !== '해지')) throw new Error('이 연락처로 이미 신청했어요. 관리코드를 잃어버렸으면 카카오톡 채널로 문의해 주세요.');
  const id = newDvId('P'), code = newToken().slice(0, 10).toUpperCase(), r = [];
  r[PTC['id']] = id; r[PTC['신청일']] = new Date(); r[PTC['유형']] = typeT; r[PTC['상호']] = name; r[PTC['사업자번호']] = biz; r[PTC['중개등록번호']] = reg;
  r[PTC['담당자']] = manager; r[PTC['연락처']] = phone; r[PTC['이메일']] = email.toLowerCase(); r[PTC['활동지역']] = area; r[PTC['채널']] = channel; r[PTC['소개']] = intro;
  r[PTC['관리코드해시']] = hashOf('ptc|' + id + '|' + code); r[PTC['승인']] = false; r[PTC['계약서일']] = ''; r[PTC['정산방법']] = pay;
  r[PTC['동의']] = `${PT_CONSENT_V} 개인정보 수집·이용 동의 ${ymd(new Date())}`; r[PTC['상태']] = '심사 중';
  uSheet(SH_PT, PTH).appendRow(PTH.map((h, i) => r[i] === undefined ? '' : r[i]));
  ownerMail(`[집코드 판매 파트너 신청] ${name}`, [`파트너 ${id} · ${typeT} · ${area}`, type === 'broker' ? `중개사무소 등록번호 ${reg} — 국가공간정보포털 부동산중개업 조회로 확인하세요.` : '',
    `확인 뒤 '${SH_PT}' 시트에서 [승인] 체크 + 판매 위탁 계약서 서명 뒤 [계약서일]을 적으면 로그인해서 현장을 볼 수 있어요.`]);
  return { ok: true, id: id, code: code };
}
function partners() {
  const sh = book().getSheetByName(SH_PT); if (!sh) return [];
  return sh.getDataRange().getValues().slice(1).map(r => Object.fromEntries(PTH.map((h, i) => [h, r[i]]))).filter(p => p.id);
}
const ptActive = p => p['승인'] === true && !!p['계약서일'] && String(p['상태']) !== '해지' && String(p['상태']) !== '중지';
function ptPublic(p) { return { id: p.id, name: p['상호'], type: p['유형'], area: p['활동지역'], ready: ptActive(p), approved: p['승인'] === true, contract: !!p['계약서일'] }; }
function partnerLogin(b) {
  const id = String(b.id || '').trim().toUpperCase(), code = String(b.code || '').trim().toUpperCase();
  const cache = CacheService.getScriptCache(), fk = 'ptfail:' + id, fails = Number(cache.get(fk) || 0);
  if (fails >= 5) throw new Error('로그인을 여러 번 틀렸어요. 10분 뒤에 다시 해 주세요.');
  const p = partners().find(x => String(x.id) === id);
  if (!p || !safeEq(String(p['관리코드해시']), hashOf('ptc|' + id + '|' + code))) { cache.put(fk, String(fails + 1), 600); throw new Error('파트너 번호 또는 관리코드가 맞지 않아요.'); }
  if (String(p['상태']) === '해지') throw new Error('해지된 파트너예요.');
  const s = newToken(), now = new Date(), exp = new Date(now.getTime() + PT_SESSION_DAYS * 86400000);
  const sh = uSheet(SH_PS, PSH), v = sh.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) if (!(new Date(v[i][PSC['만료일']]).getTime() > now.getTime())) sh.deleteRow(i + 1);
  const mine = sh.getDataRange().getValues().map((r, i) => ({ r, row: i + 1 })).slice(1).filter(x => String(x.r[PSC['파트너id']]) === id);
  mine.slice(0, Math.max(0, mine.length - 4)).map(x => x.row).sort((a, c) => c - a).forEach(r => sh.deleteRow(r));
  const r = []; r[PSC['세션해시']] = hashOf('pts|' + s); r[PSC['파트너id']] = id; r[PSC['만든날']] = now; r[PSC['만료일']] = exp;
  sh.appendRow(PSH.map((h, i) => r[i] === undefined ? '' : r[i]));
  return { ok: true, s: s, exp: ymd(exp), me: ptPublic(p) };
}
function partnerSession(s) {
  s = String(s || '');
  const bad = () => authErr('파트너 로그인이 끝났어요. 다시 로그인해 주세요.');
  if (!/^[0-9a-f]{64}$/.test(s)) throw bad();
  const sh = book().getSheetByName(SH_PS); if (!sh) throw bad();
  const h = hashOf('pts|' + s), v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (safeEq(String(v[i][PSC['세션해시']]), h)) {
    if (!(new Date(v[i][PSC['만료일']]).getTime() > Date.now())) { sh.deleteRow(i + 1); break; }
    const p = partners().find(x => String(x.id) === String(v[i][PSC['파트너id']]));
    if (p && String(p['상태']) !== '해지') return p;
  }
  throw bad();
}
function partnerLogout(b) {
  const sh = book().getSheetByName(SH_PS); if (!sh) return { ok: true };
  const h = hashOf('pts|' + String(b.s || '')), v = sh.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) if (safeEq(String(v[i][PSC['세션해시']]), h)) sh.deleteRow(i + 1);
  return { ok: true };
}

/* ---------- ③ 판매 가능한 현장 · 배정 · 계약 보고 ---------- */
function sites() {
  const sh = book().getSheetByName(SH_ST); if (!sh) return [];
  return sh.getDataRange().getValues().slice(1).map(r => Object.fromEntries(STH.map((h, i) => [h, r[i]]))).filter(x => x.id);
}
const dOf = v => Object.prototype.toString.call(v) === '[object Date]' ? v : (v ? new Date(String(v).slice(0, 10) + 'T00:00:00') : null);
/* 파트너에게 보여도 되는 현장: 우리 회사가 위탁 계약을 맺었고(위탁계약일), 시행사가 재위탁을 승낙했고, 모집 중이고, 위탁 기간 안 */
function siteOpen(x, now) {
  const a = dOf(x['위탁계약일']), z = dOf(x['위탁기간끝']), t = now || new Date();
  return x['승인'] === true && x['재위탁승낙'] === true && !!a && !isNaN(a.getTime()) && a.getTime() <= t.getTime()
    && (!z || isNaN(z.getTime()) || z.getTime() + 86400000 > t.getTime()) && String(x['상태'] || '') === '모집 중';
}
function assigns() {
  const sh = book().getSheetByName(SH_PA); if (!sh) return [];
  return sh.getDataRange().getValues().slice(1).map((r, i) => Object.assign(Object.fromEntries(PAH.map((h, j) => [h, r[j]])), { _row: i + 2 })).filter(x => x.id);
}
function siteOut(x, my) {
  const o = { id: x.id, name: x['현장명'], kind: x['종류'], sido: x['시도'], sgg: x['시군구'], dong: x['동'], scale: x['규모'], price: x['분양가범위'],
              permit: x['인허가구분'], work: x['파트너업무'], until: x['위탁기간끝'] ? ymd(dOf(x['위탁기간끝'])) : '', my: my ? my['상태'] : '' };
  if (my && my['상태'] === '배정') {                                   // 수수료 조건·자료는 배정된 파트너에게만
    o.fee = x['파트너수수료']; o.doc = /^https:\/\//.test(String(x['자료링크'] || '')) ? x['자료링크'] : '';
  }
  return o;
}
function partnerHome(me) {
  const ready = ptActive(me), now = new Date();
  const my = assigns().filter(a => String(a['파트너id']) === me.id && a['상태'] !== '중단');
  const L = ready ? sites().filter(x => siteOpen(x, now)).map(x => siteOut(x, my.find(a => String(a['현장id']) === x.id))) : [];
  const dsh = book().getSheetByName(SH_DL);
  const deals = dsh ? dsh.getDataRange().getValues().slice(1).filter(r => String(r[DLC['파트너id']]) === me.id).map(r => ({
    id: r[DLC['id']], site: r[DLC['현장id']], date: r[DLC['계약일']] ? ymd(dOf(r[DLC['계약일']])) : '', unit: r[DLC['동호']], step: r[DLC['상태']],
    share: r[DLC['상태']] === '정산대기' || r[DLC['상태']] === '지급완료' ? r[DLC['파트너몫원']] : '', paid: r[DLC['지급일']] ? ymd(dOf(r[DLC['지급일']])) : '' })).reverse().slice(0, 100) : [];
  return { ok: true, me: ptPublic(me), sites: L, deals: deals,
           why: ready ? '' : me['승인'] !== true ? '심사 중이에요. 승인되면 판매 위탁 계약서를 보내 드려요.' : '판매 위탁 계약서 서명이 끝나면 현장이 보여요.' };
}
function partnerJoin(me, b) {
  if (!ptActive(me)) throw new Error('승인과 판매 위탁 계약서 서명이 끝나야 현장 판매를 신청할 수 있어요.');
  const x = sites().find(s => s.id === String(b.site || ''));
  if (!x || !siteOpen(x)) throw new Error('지금 판매 파트너를 모집하는 현장이 아니에요.');
  const L = assigns(), mine = L.filter(a => String(a['파트너id']) === me.id && a['상태'] !== '중단');
  if (mine.some(a => String(a['현장id']) === x.id)) throw new Error('이미 신청한 현장이에요.');
  if (mine.length >= PT_JOIN_MAX) throw new Error(`현장은 한 번에 ${PT_JOIN_MAX}곳까지 신청할 수 있어요.`);
  const id = newDvId('PA'), r = [];
  r[PAC['id']] = id; r[PAC['현장id']] = x.id; r[PAC['파트너id']] = me.id; r[PAC['신청일']] = new Date(); r[PAC['상태']] = '신청';
  uSheet(SH_PA, PAH).appendRow(PAH.map((h, i) => r[i] === undefined ? '' : r[i]));
  ownerMail(`[집코드 분양대행] 현장 판매 신청 ${x['현장명']}`, [`${me['상호']}(${me.id}) → ${x['현장명']}(${x.id})`, `'${SH_PA}' 시트에서 [상태]를 '배정'으로 바꾸면 수수료 조건·자료가 파트너에게 보여요.`]);
  return { ok: true, id: id };
}
/* 고객 표시: 이니셜·별칭만. 이름(한글 2~4자 단독)·전화번호·이메일 모양은 거절 */
function dlAlias(v) {
  const x = adText(v, 10, '고객 표시', false);
  if (!x) return '';
  if (/\d{3,}/.test(x) || /@/.test(x) || /^[가-힣]{2,4}$/.test(x)) throw new Error('고객 이름·전화번호는 적지 말아 주세요. 이니셜이나 별칭(예: 김○○, A고객)만 적어 주세요.');
  return x;
}
function partnerDeal(me, b) {
  if (!ptActive(me)) throw new Error('승인과 판매 위탁 계약서 서명이 끝나야 계약을 보고할 수 있어요.');
  const site = String(b.site || '');
  const as = assigns().find(a => String(a['파트너id']) === me.id && String(a['현장id']) === site && a['상태'] === '배정');
  if (!as) throw new Error('배정된 현장만 계약을 보고할 수 있어요.');
  const date = adDate(b.date, '계약일', true);
  if (new Date(date + 'T00:00:00').getTime() > Date.now() + 86400000) throw new Error('계약일이 오늘보다 뒤예요.');
  const unit = adText(b.unit, 30, '동·호수', false);
  const amt = adInt(b.amt, '계약 금액(만 원)', 1, 9999999, false);
  const alias = dlAlias(b.alias);
  const memo = dvMemo(b.memo, 300, '메모');
  dvDay('dlday:' + me.id, DL_DAY_MAX, '오늘 보고가 많아요. 내일 이어서 보고해 주세요.');
  const sh = uSheet(SH_DL, DLH), v = sh.getDataRange().getValues();
  if (unit && v.slice(1).some(r => String(r[DLC['현장id']]) === site && String(r[DLC['동호']]) === unit && r[DLC['상태']] !== '취소'))
    throw new Error('이 동·호수는 이미 보고됐어요. 다른 파트너와 겹치면 집코드 분양대행팀이 확인해 연락드려요.');
  const id = newDvId('DL'), r = [];
  r[DLC['id']] = id; r[DLC['보고일']] = new Date(); r[DLC['현장id']] = site; r[DLC['파트너id']] = me.id; r[DLC['계약일']] = date; r[DLC['동호']] = unit;
  r[DLC['계약금액만원']] = amt; r[DLC['고객표시']] = alias; r[DLC['상태']] = '보고'; r[DLC['메모']] = memo;
  sh.appendRow(DLH.map((h, i) => r[i] === undefined ? '' : r[i]));
  ownerMail(`[집코드 분양대행] 계약 보고 ${site}`, [`${me['상호']}(${me.id}) · 현장 ${site} · 계약일 ${date}${unit ? ' · ' + unit : ''}`,
    `시행사 계약 확인 뒤 '${SH_DL}' 시트의 [상태]를 '시행사확인' → '정산대기'로, [회사수수료원]·[파트너몫원]을 적어 주세요. 정산표는 매일 아침 '${SH_SE}' 시트에 다시 만들어져요.`]);
  return { ok: true, id: id };
}

/* ---------- ④ 수수료 정산표(시트) — 계약보고를 정산월(계약일 기준) × 파트너로 묶음. 매일 다시 만듦 ---------- */
function settleSheet() {
  const dsh = book().getSheetByName(SH_DL);
  const rows = dsh ? dsh.getDataRange().getValues().slice(1) : [];
  const P = Object.fromEntries(partners().map(p => [p.id, p])), g = {};
  rows.forEach(r => {
    if (!r[DLC['id']] || r[DLC['상태']] === '취소') return;
    const d = dOf(r[DLC['계약일']]); if (!d || isNaN(d.getTime())) return;
    const k = Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM') + '|' + r[DLC['파트너id']];
    const o = g[k] = g[k] || { n: 0, ok: 0, co: 0, sh: 0, paid: 0 };
    const co = Number(r[DLC['회사수수료원']]) || 0, sh = Number(r[DLC['파트너몫원']]) || 0, st = r[DLC['상태']];
    o.n++; if (st !== '보고') o.ok++;
    o.co += co; o.sh += sh; if (st === '지급완료') o.paid += sh;
  });
  const now = new Date();
  const out = Object.keys(g).sort().map(k => { const [m, pid] = k.split('|'), o = g[k], p = P[pid] || {};
    return [m, pid, p['상호'] || '', p['정산방법'] || '', o.n, o.ok, o.co, o.sh, o.paid, o.sh - o.paid, now]; });
  const ss = book(); let sh = ss.getSheetByName(SH_SE);
  if (sh) ss.deleteSheet(sh);
  sh = uSheet(SH_SE, SEH);
  if (out.length) sh.getRange(2, 1, out.length, SEH.length).setValues(out);
  return out.length;
}
function setupAgency() {
  [[SH_DV, DVH], [SH_ST, STH], [SH_PT, PTH], [SH_PS, PSH], [SH_PA, PAH], [SH_DL, DLH], [SH_SE, SEH]].forEach(x => uSheet(x[0], x[1]));
  const st = book().getSheetByName(SH_ST), pt = book().getSheetByName(SH_PT);
  try { st.getRange(2, STC['승인'] + 1, 500, 1).insertCheckboxes(); st.getRange(2, STC['재위탁승낙'] + 1, 500, 1).insertCheckboxes(); pt.getRange(2, PTC['승인'] + 1, 500, 1).insertCheckboxes(); } catch (e) {}
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'settleSheet').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('settleSheet').timeBased().everyDays(1).atHour(6).inTimezone('Asia/Seoul').create();
  settleSheet();
}

/* =====================================================================
   중개사 플러스 (v27) — ① 내 손님 브리핑 ② 주간 시장 리포트 PDF
   · 몇 명·몇 곳·주간 리포트: 요금제 표(BRIEF_PRICE)의 customers·weekly 값을 읽음(값이 없는 요금제는 손님 카드 없음). 손님 1명 단지 수 BP_APTS(5).
   · 손님 정보는 중개사가 정한 이름표(예: 김○○ 손님·302호 손님, 20자) · 단지 5곳 · 지역(선택) · 목적(선택)만. 전화번호·이메일·실명 모양은 거절(bpLabel —
     화면 assets/client-brief.js cleanLabel 과 같은 규칙). 시트 '내손님'에 저장, 연락처 칸 자체가 없음.
   · 손님 링크: BRIEF_WEB + 'c/#' + 손님id + '.' + 토큰(64자리). 토큰 = 서버 비밀값(ORDER_SALT)으로 만든 해시 — 저장하지 않고 열 때마다 다시 계산해 비교.
     [링크 새로 만들기] 는 '링크판' 숫자를 올려 예전 링크를 막음. 손님 화면(bpOpen)은 로그인 없이 그 카드 내용(중개사 표시·단지 목록·목적)만 돌려줌. 이름표는 보내지 않음.
   · 엔진(bpPull, BRIEF_PULL_TOKEN): 모든 중개사·손님 단지를 (시군구, 동, 단지) 한 번씩으로 합친 목록 cx + 주간 리포트용 중개사 목록(id 해시·표시 정보·관심 지역).
     이름표는 엔진으로 보내지 않음. 엔진이 매일 cx/{시군구}.json(공개, 단지 수치만)을 만들고, 메일(briefDaily)·화면이 손님 단지만 골라 카드를 그림.
   · 주간 리포트: 엔진이 월요일에 PDF 를 만들어 bpPut 으로 올림 → 드라이브 폴더(링크가 있는 사람만 보기)·'주간리포트' 시트 → 내 구독 관리·월요일 메일에 받기 링크.
     (드라이브 권한이 새로 필요해서 11/28 재배포 때 한 번 승인해야 함)
   ===================================================================== */
const BP_ACTIONS = { bpMine: 1, bpSave: 1, bpRelink: 1, bpOpen: 1 };
const BP_APTS = 5, BP_LABEL_MAX = 20;
const SH_BPP = '플러스중개사', BPPH = ['카카오id', '프로필', '고친시각'];
const SH_BPC = '내손님', BPCH = ['id', '카카오id', '이름표', '지역', '지역이름', '목적', '단지', '링크판', '만든시각', '고친시각', '열람횟수', '최근열람'];
const SH_BPW = '주간리포트', BPWH = ['날짜', '중개사키', '파일id', '만든시각'];
const BPPC = Object.fromEntries(BPPH.map((h, i) => [h, i])), BPCC = Object.fromEntries(BPCH.map((h, i) => [h, i])), BPWC = Object.fromEntries(BPWH.map((h, i) => [h, i]));
const BP_PURPOSE = { '': '', buy: '매수', sell: '매도', jeonse: '전세' };
const BP_ID = /^C[0-9A-F]{11}$/;
const BP_SURNAME = '김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경사부태';
const BP_PHONE = /(?:\d[\s.\-)(]*){7,}|01[016789]\s*[-.)]?\s*\d{3,4}/;

function bpDispatch(b) {
  try {
    if (b.action === 'bpOpen') return bpOpen(b);
    return withLock(() => {
      if (b.action === 'bpMine') return bpMine(b);
      if (b.action === 'bpSave') return bpSave(b);
      if (b.action === 'bpRelink') return bpRelink(b);
      return { ok: false, err: 'unknown' };
    });
  } catch (x) {
    return { ok: false, err: String(x.message || x), code: x.code || '' };
  }
}
/* 이름표 검사 — 화면 JDJ_CBRIEF.cleanLabel 과 같은 규칙 */
function bpLabel(s) {
  const t = String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F<>"'`\\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) throw new Error('손님을 부를 이름을 적어 주세요. 예: 김○○ 손님, 302호 손님');
  if (t.length > BP_LABEL_MAX) throw new Error('이름은 ' + BP_LABEL_MAX + '자까지 적을 수 있어요.');
  if (BP_PHONE.test(t)) throw new Error('전화번호는 적지 말아 주세요. 손님 연락처는 저장하지 않아요.');
  if (/@|https?:|www\./i.test(t)) throw new Error('이메일·주소 링크는 적지 말아 주세요. 손님 연락처는 저장하지 않아요.');
  const nm = t.split(' ').map(w => w.replace(/(손님|고객님|고객|님|씨)$/, '')).filter(w => w.length === 3 && /^[가-힣]{3}$/.test(w) && BP_SURNAME.indexOf(w[0]) >= 0 && !/[구동시군읍면리역로길층호집점관원단]$/.test(w));
  if (nm.length) throw new Error("손님 실명은 적지 말아 주세요. '" + nm[0][0] + "○○ 손님'처럼 가려서 적어 주세요.");
  return t;
}
/* 이 회원의 손님 카드 한도: 받는 중·시작 예정 구독 중 요금제 표에 customers 가 있는 것 */
function bpLimit(k, now) {
  now = now || new Date();
  const t = ymd(now);
  let best = { customers: 0, apts: 0, weekly: false, sub: null };
  myBriefs(k).forEach(o => {
    const s = briefState(o, now);
    if (s.state === BST.stop || s.state === BST.refund || s.state === BST.wait || !(s.active || s.start > t)) return;
    const P = BRIEF_PRICE[bProdKey(o.r[BC['상품']])] || {};
    const n = Math.max(0, Math.floor(Number(P.customers) || 0));
    if (n > best.customers || (n && P.weekly && !best.weekly)) best = { customers: n, apts: n ? Math.max(1, Math.min(BP_APTS, Math.floor(Number(P.custApts) || BP_APTS))) : 0, weekly: !!P.weekly, sub: s };
  });
  return best;
}
function bpKey(k) { return hashOf('bp|' + k).slice(1, 13); }                       // 엔진·PDF 파일 이름용 중개사 키(카카오 id 아님)
function bpToken(id, ver) { return hashOf('bpc|' + id + '|' + (Number(ver) || 1)).slice(1); }   // 64자리, 서버 비밀값으로만 만들 수 있음
function bpLink(id, ver) { return BRIEF_WEB + 'c/#' + id + '.' + bpToken(id, ver); }
function bpRows(sh, head) { const s = book().getSheetByName(sh); if (!s) return []; const v = s.getDataRange().getValues(), out = []; for (let i = 1; i < v.length; i++) if (v[i][0]) out.push({ row: i + 1, r: v[i] }); return out; }
function bpProfileOf(k) { const x = bpRows(SH_BPP).find(o => String(o.r[BPPC['카카오id']]) === k); return x ? parseJ(x.r[BPPC['프로필']], null) : null; }
function bpApts(a, max) {
  const seen = {}, out = [];
  (Array.isArray(a) ? a : []).slice(0, 20).forEach(x => {
    if (!x) return;
    const g = String(x.g || ''), d = uText(x.d, 20), nm = uText(x.a, 40).replace(/["'`\\]/g, '');
    if (!/^\d{5}$/.test(g) || !nm || (d && !/^[가-힣0-9·.]{1,20}$/.test(d))) return;
    const key = g + '|' + d + '|' + nm; if (seen[key]) return; seen[key] = 1; out.push({ g: g, d: d, a: nm });
  });
  if (!out.length) throw new Error('관심 단지를 하나 이상 골라 주세요.');
  if (out.length > max) throw new Error('손님 한 분에 단지는 ' + max + '곳까지예요.');
  return out;
}
function bpCustOut(o) {
  const r = o.r, id = String(r[BPCC['id']]);
  return { id: id, label: String(r[BPCC['이름표']]).replace(/^'/, ''), g: String(r[BPCC['지역']] || ''), gn: String(r[BPCC['지역이름']] || ''),
    purpose: Object.keys(BP_PURPOSE).find(k => BP_PURPOSE[k] === String(r[BPCC['목적']])) || '', apts: parseJ(r[BPCC['단지']], []),
    link: bpLink(id, r[BPCC['링크판']]), views: Number(r[BPCC['열람횟수']]) || 0 };
}
function bpWeekly(k) {
  const key = bpKey(k);
  return bpRows(SH_BPW).filter(o => String(o.r[BPWC['중개사키']]) === key).map(o => ({ date: String(o.r[BPWC['날짜']]).slice(0, 10), url: 'https://drive.google.com/uc?export=download&id=' + String(o.r[BPWC['파일id']]) }))
    .sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 8);
}
function bpMine(b) {
  const u = sessionUser(b.s), L = bpLimit(u.k);
  return { ok: true, limit: { customers: L.customers, apts: L.apts, weekly: L.weekly }, profile: bpProfileOf(u.k),
    customers: bpRows(SH_BPC).filter(o => String(o.r[BPCC['카카오id']]) === u.k).map(bpCustOut), weekly: L.weekly ? bpWeekly(u.k) : [] };
}
/* 저장: 표시 정보 + 손님 목록 전체(목록에 없는 손님은 지움 — 그 손님 링크도 바로 막힘) */
function bpSave(b) {
  const u = sessionUser(b.s), L = bpLimit(u.k);
  if (!L.customers) throw new Error('내 손님 브리핑은 중개사 플러스 요금제에서 쓸 수 있어요.');
  const prof = proProfile(b.profile);
  if (prof.role !== 'agent' && prof.role !== 'member') throw new Error('중개사 플러스는 공인중개사(개업·소속)용이에요.');
  const list = Array.isArray(b.customers) ? b.customers : [];
  if (list.length > L.customers) throw new Error('손님은 ' + L.customers + '명까지 등록할 수 있어요.');
  const clean = list.map((c, i) => {
    c = c && typeof c === 'object' ? c : {};
    try {
      return { id: BP_ID.test(String(c.id || '')) ? String(c.id) : '', label: bpLabel(c.label), g: /^\d{5}$/.test(String(c.g || '')) ? String(c.g) : '',
        gn: uText(c.gn, 30), purpose: BP_PURPOSE.hasOwnProperty(c.purpose) ? c.purpose : '', apts: bpApts(c.apts, L.apts) };
    } catch (e) { throw new Error((i + 1) + '번째 손님: ' + e.message); }
  });
  /* 표시 정보 */
  const psh = uSheet(SH_BPP, BPPH), px = bpRows(SH_BPP).find(o => String(o.r[BPPC['카카오id']]) === u.k), now = new Date();
  if (px) psh.getRange(px.row, 1, 1, BPPH.length).setValues([[u.k, JSON.stringify(prof), now]]); else psh.appendRow([u.k, JSON.stringify(prof), now]);
  /* 손님 */
  const csh = uSheet(SH_BPC, BPCH), mine = bpRows(SH_BPC).filter(o => String(o.r[BPCC['카카오id']]) === u.k);
  const keep = {};
  clean.forEach(c => {
    const o = c.id && mine.find(x => String(x.r[BPCC['id']]) === c.id);
    const r = o ? o.r.slice() : [];
    if (!o) { r[BPCC['id']] = 'C' + Utilities.getUuid().replace(/-/g, '').slice(0, 11).toUpperCase(); r[BPCC['카카오id']] = u.k; r[BPCC['링크판']] = 1; r[BPCC['만든시각']] = now; r[BPCC['열람횟수']] = 0; r[BPCC['최근열람']] = ''; }
    r[BPCC['이름표']] = cellSafe(c.label); r[BPCC['지역']] = c.g; r[BPCC['지역이름']] = c.g ? cellSafe(c.gn) : ''; r[BPCC['목적']] = BP_PURPOSE[c.purpose];
    r[BPCC['단지']] = JSON.stringify(c.apts); r[BPCC['고친시각']] = now;
    const line = BPCH.map((h, i) => r[i] === undefined ? '' : r[i]);
    if (o) csh.getRange(o.row, 1, 1, BPCH.length).setValues([line]); else csh.appendRow(line);
    keep[String(r[BPCC['id']])] = 1;
  });
  mine.filter(o => !keep[String(o.r[BPCC['id']])]).sort((a, z) => z.row - a.row).forEach(o => csh.deleteRow(o.row));
  return bpMine(b);
}
function bpRelink(b) {
  const u = sessionUser(b.s), o = bpRows(SH_BPC).find(x => String(x.r[BPCC['id']]) === String(b.id || '') && String(x.r[BPCC['카카오id']]) === u.k);
  if (!o) throw new Error('손님을 찾지 못했어요.');
  uSheet(SH_BPC, BPCH).getRange(o.row, BPCC['링크판'] + 1).setValue((Number(o.r[BPCC['링크판']]) || 1) + 1);
  return bpMine(b);
}
/* 손님 화면(로그인 없음): 링크가 맞고 중개사 구독이 이어지는 동안만. 실패 이유는 구분하지 않음(링크 맞히기 막기) */
function bpOpen(b) {
  const id = String(b.id || ''), tk = String(b.tk || '');
  const cache = CacheService.getScriptCache(), ck = 'bo:' + id.slice(0, 12), tries = Number(cache.get(ck) || 0);
  const bad = () => { cache.put(ck, String(tries + 1), 3600); return { ok: false, err: '링크가 맞지 않거나 볼 수 있는 기간이 끝났어요. 보내 준 중개사님께 새 링크를 요청해 주세요.' }; };
  if (tries >= 20) return { ok: false, err: '확인 시도가 많아 1시간 뒤에 다시 열어 주세요.' };
  if (!BP_ID.test(id) || !/^[0-9a-f]{64}$/.test(tk)) return bad();
  const o = bpRows(SH_BPC).find(x => String(x.r[BPCC['id']]) === id);
  if (!o || !safeEq(bpToken(id, o.r[BPCC['링크판']]), tk)) return bad();
  const k = String(o.r[BPCC['카카오id']]), L = bpLimit(k), prof = bpProfileOf(k);
  if (!L.customers || !L.sub || !L.sub.active || !prof) return bad();
  try { withLock(() => { const sh = uSheet(SH_BPC, BPCH); sh.getRange(o.row, BPCC['열람횟수'] + 1).setValue((Number(o.r[BPCC['열람횟수']]) || 0) + 1); sh.getRange(o.row, BPCC['최근열람'] + 1).setValue(new Date()); }); } catch (e) {}
  const c = bpCustOut(o);
  return { ok: true, card: { profile: prof, apts: c.apts, purpose: c.purpose } };
}
/* 엔진용 목록(BRIEF_PULL_TOKEN): 단지는 모든 중개사·손님을 합쳐 한 번씩, 이름표는 보내지 않음 */
function bpActive(now) {
  now = now || new Date();
  const tomorrow = addDays(now, 1), um = userBriefMap(), seen = {}, out = [];
  bRows().forEach(o => {
    const k = String(o.r[BC['카카오id']]); if (seen[k]) return;
    const L = bpLimit(k, now), L2 = bpLimit(k, tomorrow);
    const lim = L.customers ? L : L2;
    if (!lim.customers || !((L.sub && L.sub.active) || (L2.sub && L2.sub.active))) return;
    seen[k] = 1;
    out.push({ k: k, lim: lim, areas: ((um[k] || {}).areas || []).slice(0, (lim.sub || {}).areas || 10) });
  });
  return out;
}
function bpPull(p) {
  if (!pullOk(p)) return { ok: false, err: 'auth' };
  const act = bpActive(new Date()), on = {}, cx = [], seen = {};
  act.forEach(x => { on[x.k] = x; });
  bpRows(SH_BPC).forEach(o => {
    const x = on[String(o.r[BPCC['카카오id']])]; if (!x) return;
    parseJ(o.r[BPCC['단지']], []).slice(0, x.lim.apts).forEach(a => { const key = a.g + '|' + (a.d || '') + '|' + a.a; if (seen[key]) return; seen[key] = 1; cx.push({ g: a.g, d: a.d || '', a: a.a }); });
  });
  const brokers = act.filter(x => x.lim.weekly).map(x => {
    const prof = bpProfileOf(x.k); if (!prof) return null;
    const regs = []; x.areas.forEach(a => { if (regs.indexOf(a.g) < 0) regs.push(a.g); });
    return { bid: bpKey(x.k), profile: { role: prof.role, office: prof.office, ceo: prof.ceo, name: prof.name, reg: prof.reg, addr: prof.addr, phone: prof.phone }, regions: regs };
  }).filter(Boolean);
  return { ok: true, at: ymd(new Date()), cx: cx, brokers: brokers };
}
/* 주간 리포트 PDF 받기(엔진 → 서버, BRIEF_PULL_TOKEN). 드라이브 '집코드 주간 리포트' 폴더, 링크가 있는 사람만 보기 */
function bpPut(b) {
  if (!pullOk(b)) return { ok: false, err: 'auth' };
  const bid = String(b.bid || ''), date = String(b.date || '');
  if (!/^[0-9a-f]{12}$/.test(bid) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || b.kind !== 'weekly') return { ok: false, err: 'bad' };
  const bytes = Utilities.base64Decode(String(b.b64 || ''));
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) return { ok: false, err: 'size' };
  const P = PropertiesService.getScriptProperties();
  let folder = null; const fid = P.getProperty('BP_WEEKLY_FOLDER');
  try { folder = fid ? DriveApp.getFolderById(fid) : null; } catch (e) { folder = null; }
  if (!folder) { folder = DriveApp.createFolder(SITE_NAME + ' 주간 리포트'); P.setProperty('BP_WEEKLY_FOLDER', folder.getId()); }
  const f = folder.createFile(Utilities.newBlob(bytes, 'application/pdf', SITE_NAME + '_주간시장리포트_' + date + '.pdf'));
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return withLock(() => {
    const sh = uSheet(SH_BPW, BPWH);
    bpRows(SH_BPW).filter(o => String(o.r[BPWC['중개사키']]) === bid && String(o.r[BPWC['날짜']]).slice(0, 10) === date).sort((a, z) => z.row - a.row)
      .forEach(o => { try { DriveApp.getFileById(String(o.r[BPWC['파일id']])).setTrashed(true); } catch (e) {} sh.deleteRow(o.row); });
    sh.appendRow([date, bid, f.getId(), new Date()]);
    const old = ymd(addDays(new Date(), -56));   // 8주 지난 리포트는 파일·줄 모두 지움
    bpRows(SH_BPW).filter(o => String(o.r[BPWC['날짜']]).slice(0, 10) < old).sort((x, z) => z.row - x.row)
      .forEach(o => { try { DriveApp.getFileById(String(o.r[BPWC['파일id']])).setTrashed(true); } catch (e) {} sh.deleteRow(o.row); });
    return { ok: true };
  });
}
/* ---------- 메일 '내 손님 카드' (숫자는 cx 파일 그대로 — 화면 JDJ_CBRIEF.rows 와 같은 문장) ---------- */
function bpSince(w) {
  if (!w || !w.to) return '';
  if (!w.from) return '처음 확인한';
  const a = new Date(w.from + 'T00:00:00Z'), z = new Date(w.to + 'T00:00:00Z');
  return (z - a) / 86400000 <= 1 ? '어제' : (a.getUTCMonth() + 1) + '/' + a.getUTCDate() + ' 이후';
}
function bpRowsOf(C, apt) {
  const md = i => Math.floor(i / 100) % 100 + '/' + i % 100;
  const x = C && C.cx ? C.cx[(apt.d || '') + '|' + apt.a] : null, name = apt.a + (apt.d ? ' (' + apt.d + ')' : ''), out = [];
  if (!C) return { name: name, lines: ['오늘 자료를 아직 받지 못했어요.'] };
  if (!x) return { name: name, lines: ['오늘 이 단지 자료가 없어요. 내일 아침 카드부터 들어가요.'] };
  const w = bpSince(C.win);
  if (x.none) out.push('공개된 매매 기록이 아직 없어요.');
  else if (x.nn) {
    const t = (x.new || []).slice().sort((a, z) => (z.hi ? 1 : 0) - (a.hi ? 1 : 0) || z.dt - a.dt)[0];
    out.push(w + ' 새 거래 ' + x.nn + '건 · ' + t.b + ' ' + bWon(t.p) + '(' + md(t.dt) + ' 계약' + (t.f != null ? ', ' + t.f + '층' : '') + ')' + (t.hi ? ' · 신고가' : t.dr != null && t.dr <= -10 ? ' · 최근 2년 최고가보다 ' + Math.abs(t.dr).toFixed(0) + '% 낮음' : ''));
  } else {
    const l = (x.last || [])[0];
    out.push(w + ' 새 거래 없음' + (l ? ' · 가장 최근 거래 ' + l.b + ' ' + bWon(l.p) + '(' + String(l.dt).slice(0, 4) + '.' + md(l.dt).replace('/', '.') + ' 계약)' : ''));
  }
  if (x.chg) { const c = x.chg; out.push(c.b + ' 최근 3개월 가운데 값 ' + bWon(c.m1) + '(' + c.n1 + '건) · 그 전 3개월 ' + bWon(c.m0) + '(' + c.n0 + '건)보다 ' + (c.pct > 0 ? '+' : c.pct < 0 ? '−' : '') + Math.abs(c.pct).toFixed(1) + '%'); }
  (x.urg || []).slice(0, 1).forEach(u => out.push('급매로 보이는 거래: ' + u.b + ' ' + bWon(u.p) + ' — 최근 3개월 같은 평형 가운데 값 ' + bWon(u.med) + '보다 ' + Math.abs(u.disc).toFixed(0) + '% 낮아요'));
  (x.rk || []).slice(0, 1).forEach(r => out.push('미래가치 등수(' + r.b + ') ' + r.r0.toLocaleString() + '위 → ' + r.r1.toLocaleString() + '위 ' + (r.mv > 0 ? '▲' : '▼') + Math.abs(r.mv).toLocaleString()));
  return { name: name, lines: out };
}
/* 메일 칸: 중개사의 손님별 카드(이름표는 중개사 메일에만) + [손님에게 보내기](내 구독 관리 카드 화면) + 월요일이면 주간 리포트 받기 */
function bpMailHtml(k, cx, date) {
  const L = bpLimit(k); if (!L.customers) return '';
  const prof = bpProfileOf(k), list = bpRows(SH_BPC).filter(o => String(o.r[BPCC['카카오id']]) === k).map(bpCustOut).slice(0, L.customers);
  const wk = L.weekly ? bpWeekly(k).filter(w => w.date === date) : [];
  if (!list.length && !wk.length) return '';
  const cards = list.map(c => {
    const items = c.apts.slice(0, L.apts).map(a => bpRowsOf(cx(a.g), a));
    return `<div style="border:1px solid #D6E2FF;border-radius:12px;padding:12px 14px;margin:0 0 10px">
      <div style="font-weight:800;color:#8A6D1C;margin:0 0 6px">${bEsc(c.label)}${c.purpose ? ` · ${BP_PURPOSE[c.purpose]}` : ''}</div>
      ${items.map(it => `<div style="margin:0 0 6px"><b>${bEsc(it.name)}</b>${it.lines.map(l => `<div style="font-size:14px;line-height:1.55;color:#333D4B">${bEsc(l)}</div>`).join('')}</div>`).join('')}
      <a href="${BRIEF_WEB}manage/?card=${c.id}#cards" style="display:inline-block;margin-top:4px;background:#2F6BFF;color:#fff;padding:9px 14px;border-radius:10px;text-decoration:none;font-weight:700">손님에게 보내기</a>
      <div style="font-size:12px;color:#6B7684;margin-top:6px;word-break:break-all">손님용 링크: ${bEsc(c.link)}</div></div>`;
  }).join('');
  return `<div style="border:2px solid #2F6BFF;border-radius:12px;padding:14px 16px;margin:0 0 14px">
    <div style="font-size:17px;font-weight:900;margin:0 0 4px">내 손님 카드 <span style="font-size:12.5px;color:#4E5968;font-weight:500">${list.length}명 · 공공자료(국토교통부 실거래가)</span></div>
    <p style="margin:0 0 10px;font-size:13px;color:#4E5968;line-height:1.6">손님 이름표는 중개사님께만 보여요. 손님에게는 링크로 카드 내용과 ${bEsc(prof ? prof.office : '')} 표시 정보만 보여요.</p>
    ${wk.length ? `<a href="${wk[0].url}" style="display:block;text-align:center;margin:0 0 10px;border:1px solid #B8942A;color:#8A6D1C;background:#FBF8EF;padding:11px 16px;border-radius:10px;text-decoration:none;font-weight:800">이번 주 시장 리포트(PDF) 받기</a>` : ''}
    ${cards}</div>`;
}

/* =====================================================================
   장대장TV 주간 유튜브 키트 (v30) — 엔진 scripts/youtube_kit.py 가 일요일 밤(jangdaejang-timing youtube_kit.yml) 만들어
   POST ytKitPut(BRIEF_PULL_TOKEN)으로 보내면 시트 '유튜브키트'에 주차별 한 줄로 저장, 월요일 오전 6시대 ytKitSend 가 대표에게 메일.
   · 받는 사람: 스크립트 속성 YT_KIT_EMAIL (코드에 주소를 적지 않음). 비어 있으면 보내지 않고 실행 기록에 남김.
   · 메일: 광고 추천 한 줄 · 주제 후보 3개 · 제목 5 · 썸네일 문구 5 · 대본(프롬프터용) · 쇼츠 5 · 설명란(자연·광고용) · 고정 댓글 · 커뮤니티 글 2
     + 첨부: 글 파일(txt) + B-roll 그림 zip(공개 데이터 저장소의 추측 불가능한 폴더 data/yt/{128비트 난수}/ 에서 받아 묶음 — 선택용).
   · 그 주 키트가 없으면(일요일 실행 실패) '이번 주 키트 없음' 안내를 한 번만 보냄.
   · 처음 한 번: 재배포 뒤 편집기에서 ytKitInstall 실행(월요일 오전 6시대 트리거). 미리 보기: ytKitSendLatest(가장 최근 키트를 지금 보냄).
   ===================================================================== */
const SH_YT = '유튜브키트';
const YTH = ['주차', '받은시각', '그림주소', '발송시각', '자료1', '자료2', '자료3', '자료4', '자료5'];
const YT_CHUNK = 45000;                 // 시트 한 칸 5만 자 제한 → 나눠 저장(각 칸 앞에 'J' 를 붙여 수식으로 읽히지 않게)
const YT_IMG_RE = /^https:\/\/chrisjangdaejang-ux\.github\.io\/jangdaejang-data\/data\/yt\/[0-9a-f]{32}\/$/;
const YT_IMG_NAME = /^(long|short|community|thumb)_\d{2}\.png$/;

function ytIsoWeek(d) {                  // 한국 날짜 기준 ISO 주 '2026-W48'
  const s = Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd').split('-').map(Number);
  const t = new Date(Date.UTC(s[0], s[1] - 1, s[2]));
  const dow = (t.getUTCDay() + 6) % 7;                       // 월=0
  t.setUTCDate(t.getUTCDate() - dow + 3);                    // 그 주 목요일
  const y = t.getUTCFullYear(), jan4 = new Date(Date.UTC(y, 0, 4));
  const w = 1 + Math.round(((t - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return y + '-W' + (w < 10 ? '0' : '') + w;
}
function ytKitPut(b) {
  if (!pullOk(b)) return { ok: false, err: 'auth' };
  const k = b.kit && typeof b.kit === 'object' ? b.kit : null;
  if (!k || !/^\d{4}-W\d{2}$/.test(String(k.week || ''))) return { ok: false, err: 'week' };
  const base = String((k.img || {}).base || '');
  if (base && !YT_IMG_RE.test(base)) return { ok: false, err: 'img' };
  const js = JSON.stringify(k);
  if (js.length > YT_CHUNK * 5) return { ok: false, err: 'too big' };
  const parts = [0, 1, 2, 3, 4].map(i => { const c = js.slice(i * YT_CHUNK, (i + 1) * YT_CHUNK); return c ? 'J' + c : ''; });
  return withLock(() => {
    const sh = uSheet(SH_YT, YTH), v = sh.getDataRange().getValues();
    let row = 0;
    for (let i = 1; i < v.length; i++) if (String(v[i][0]) === k.week) row = i + 1;
    const vals = [k.week, new Date(), base, ''].concat(parts);
    if (row) sh.getRange(row, 1, 1, vals.length).setValues([vals]); else sh.appendRow(vals);
    return { ok: true, week: k.week, n: js.length };
  });
}
function ytRows() {
  const sh = book().getSheetByName(SH_YT);
  if (!sh) return [];
  return sh.getDataRange().getValues().slice(1).map((r, i) => ({ row: i + 2, week: String(r[0]), base: String(r[2] || ''), sent: r[3],
    kit: parseJ(r.slice(4, 9).map(x => String(x || '').replace(/^J/, '')).join(''), null) })).filter(o => o.week);
}
function ytKitInstall() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'ytKitSend').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('ytKitSend').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(6).inTimezone('Asia/Seoul').create();
}
function ytKitSendLatest() { return ytKitSend(true); }
function ytKitSend(latest) {
  const P = PropertiesService.getScriptProperties(), to = String(P.getProperty('YT_KIT_EMAIL') || '').trim();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to)) { console.log('YT_KIT_EMAIL 없음 — 유튜브 키트 메일을 보내지 않음'); return { ok: false, err: 'YT_KIT_EMAIL' }; }
  const week = ytIsoWeek(new Date()), rows = ytRows();
  const o = latest === true ? rows[rows.length - 1] : rows.filter(x => x.week === week).pop();
  if (!o || !o.kit) {
    if (latest !== true && P.getProperty('YT_KIT_MISS') !== week) {
      MailApp.sendEmail({ to: to, name: '장대장TV 주간 키트', subject: `[장대장TV] ${week} 유튜브 키트가 아직 없어요`,
        body: `일요일 밤 자동 생성이 끝나지 않았거나 실패했어요(${week}).\nGitHub Actions jangdaejang-timing '장대장TV 주간 유튜브 키트' 실행 기록을 확인해 주세요. 비공개 엔진 저장소 data/youtube_kit/ 에 글 파일이 남아 있을 수 있어요.` });
      P.setProperty('YT_KIT_MISS', week);
    }
    return { ok: false, err: 'no kit', week: week };
  }
  if (latest !== true && o.sent) return { ok: true, already: true };
  const k = o.kit, files = [];
  const txt = (name, s) => files.push(Utilities.newBlob(String(s || ''), 'text/plain', name));
  txt('script.txt', k.script);
  (k.shorts || []).forEach(s => txt(`shorts_${s.i}.txt`, s.text));
  txt('description.txt', k.description); txt('description_ads.txt', k.description_ads); txt('pinned.txt', k.pinned);
  (k.community || []).forEach(c => txt(`community_${c.i}.txt`, c.text + (c.poll && c.poll.length ? '\n\n투표 선택지\n' + c.poll.join('\n') : '')));
  txt('titles.txt', '제목 후보\n' + (k.titles || []).join('\n') + '\n\n썸네일 문구 후보\n' + (k.thumbs || []).join('\n'));
  const img = k.img || {}, names = [].concat(img.long || [], img.short || [], img.community || [], img.thumb || []).filter(n => YT_IMG_NAME.test(n));
  let zipNote = '';
  if (o.base && YT_IMG_RE.test(o.base) && names.length) {
    const blobs = [];
    names.forEach(n => { try { const r = UrlFetchApp.fetch(o.base + n, { muteHttpExceptions: true }); if (r.getResponseCode() === 200) blobs.push(r.getBlob().setName(n)); } catch (e) {} });
    if (blobs.length) { files.push(Utilities.zip(blobs, `broll_${k.week}.zip`)); zipNote = `그림 ${blobs.length}장을 broll_${k.week}.zip 으로 첨부했어요.`; }
    if (blobs.length < names.length) zipNote += ` 받지 못한 그림은 아래 링크에서 받아 주세요.`;
  }
  const E = bEsc, sec = (t, h) => `<h3 style="margin:22px 0 8px;font-size:16px;color:#3D4225">${E(t)}</h3>${h}`;
  const pre = s => `<div style="white-space:pre-wrap;background:#F5EFDC;padding:12px 14px;border-radius:8px;font-size:14px;line-height:1.7">${E(s)}</div>`;
  const cands = (k.candidates || []).map(c => `<div style="margin:0 0 12px"><b>${c.rank}위 ${E(c.name)}</b> — ${E(c.hook)}<br><span style="color:#5B5642">${E(c.why)}</span><ul style="margin:6px 0 0 18px;padding:0">`
    + (c.points || []).map(p => `<li>${E(p.t)} <span style="color:#8a8470">(${E(p.src)}, ${E(p.per)})</span></li>`).join('') + '</ul></div>').join('');
  const links = names.map(n => `<a href="${E(o.base + n)}">${E(n)}</a>`).join(' · ');
  const html = `<div style="font-family:sans-serif;max-width:760px;color:#2B2A22">
    <div style="background:#3D4225;color:#F5EFDC;padding:12px 16px;font-weight:900">★ 장대장TV 주간 유튜브 키트 · ${E(k.week)}</div>
    <p style="background:#B8942A;color:#1F1D14;padding:10px 14px;font-weight:700;margin:0">${E((k.ads || {}).line || '')}</p>
    ${sec('주제 후보(순위)', cands)}
    ${sec('제목 후보', '<ol>' + (k.titles || []).map(t => `<li>${E(t)}</li>`).join('') + '</ol>')}
    ${sec('썸네일 문구 후보(12자 이하)', '<ol>' + (k.thumbs || []).map(t => `<li>${E(t)}</li>`).join('') + '</ol>')}
    ${sec(`1위 주제 대본 — 프롬프터용(${k.script_chars || ''}자, 첨부 script.txt)`, pre(k.script))}
    ${(k.shorts || []).map(s => sec(`쇼츠 ${s.i} · ${s.label} · 약 ${s.sec}초`, pre(s.text))).join('')}
    ${sec('설명란(자연 유입 utm_source=youtube)', pre(k.description))}
    ${sec('광고용 설명란·최종 URL(utm_source=youtube_ads)', pre(k.description_ads) + `<p>광고 최종 URL: ${E((k.ads || {}).url || '')}</p>`)}
    ${sec('고정 댓글', pre(k.pinned))}
    ${(k.community || []).map(c => sec(`커뮤니티 글 ${c.i} · ${c.when} 올리기`, pre(c.text + (c.poll && c.poll.length ? '\n\n투표 선택지\n' + c.poll.join('\n') : '')))).join('')}
    ${sec('B-roll 그림(선택용 — 쇼츠·커뮤니티 글·썸네일 배경에도)', `<p>${E(zipNote)}</p><p style="font-size:13px">${links}</p>`)}
    <p style="font-size:12px;color:#8a8470;margin-top:24px">숫자는 모두 ${E(SITE_NAME)}에서 모으는 공개 자료(국토부 실거래가·청약홈·공식 보도자료)에서 그대로 계산한 값이에요. 그림 폴더 주소는 이 메일에만 있어요.</p></div>`;
  MailApp.sendEmail({ to: to, name: '장대장TV 주간 키트', subject: `[장대장TV] ${k.week} 유튜브 키트 — ${(k.candidates || [])[0] ? k.candidates[0].hook : ''}`.slice(0, 120),
    htmlBody: html, attachments: files });
  if (latest !== true) book().getSheetByName(SH_YT).getRange(o.row, 4).setValue(new Date());
  return { ok: true, week: k.week, files: files.length };
}


/* =====================================================================
   v44 관심 단지·청약 알림 1단계 — 하루 한 번 묶음 메일 (안내: docs/alerts.md)
   - 받는 사람: 카카오 간편 로그인 + 알림 센터(my/alerts/)에서 '알림 메일 받기' 동의 체크 + 이메일. 동의 시각·동의 문구 판을 시트에 남김.
   - 보내는 것: 관심 목록(회원 저장 자료 favs) 단지의 새 실거래·신고가·급매·큰 하락·전세가율 변화 + 청약 맞춤(새 공고·접수 하루 전·발표일).
     계산은 위 ALERTS-CORE 블록(웹 assets/alerts-core.js 와 같은 글자). 숫자는 공개 자료 그대로.
   - 하루 한 번(오전 7시대). 모닝 브리핑을 이메일로 받는 사람은 브리핑 메일 맨 위에 함께 넣어 메일이 두 통 가지 않게 함(briefDaily).
   - 같은 알림은 다시 보내지 않음('알림기록' 시트: 구독 번호·알림 id·날짜만, 90일 보관). 메일 하루 한도가 AX_RESERVE 만큼 남으면 멈추고 다음 날 이어서.
   - 정보 알림이라 광고를 넣지 않음. 단, 모닝 브리핑의 두 광고 동의(광고성 정보·이른 아침 메일 속 광고)가 모두 있는 사람만 브리핑과 같은 규칙으로 광고 1개.
   - 끄기: 메일마다 '이 단지 알림 끄기'·'청약 알림 끄기'·'모든 알림 끄기'(GET alertOff, 로그인 없이 한 번 누르면 끝) + 알림 센터.
   - 보내는 길(AX_SENDERS): 지금은 이메일만. 웹 푸시(VAPID)·카카오 알림톡은 자리만 있음(docs/alerts.md 할 일).
   - 시트(첫 사용 때 자동 생성): '알림구독'(이메일 원문은 여기에만) · '알림기록' · '알림발송'(연락처 없음)
   - 재배포 뒤 편집기에서 alertsInstall 한 번 실행(매일 오전 7시대·9시대 alertsDaily 트리거). 검증: node tools/alerts-test.js
   ===================================================================== */
/* ALERTS-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/alerts-test.js 가 비교). */
const AX_V = 'alerts-2026-11-21';                 // 메일 알림 동의 문구 판(화면 문구를 바꾸면 날짜를 바꿈)
const AX_KINDS = { high: '신고가', trade: '새 실거래', drop: '급매·큰 하락', jeonse: '전세가율', nb: '근처 신축 허가', cynear: '근처 청약 공고' };
const AX_OPTIN = { nb: 1, cynear: 1 };            // 나중에 생긴 종류 — 사용자가 직접 켠 경우에만 보냄(먼저 신청한 분께 묻지 않은 알림이 가지 않게)
const AX_JR_LINES = [80, 90];                     // 전세가율이 이 선을 넘거나 내려오면 알림(%)
const AX_NB_M = 500, AX_NB_MONTHS = 3, AX_NEAR_DAYS = 14;   // 신축 허가: 관심 단지에서 이 거리(m) 안·최근 이 달 수 안 허가 · 근처 청약: 공고 뒤 이 날 수 안
const AX_CY_KINDS = { cy_new: '새 청약 공고', cy_eve: '청약 접수 하루 전', cy_win: '당첨자 발표일' };
const AX_URG = 10, AX_DROP = -10, AX_JR = 5;       // 급매(%) · 큰 하락(%) · 전세가율 변화(%p) — 위 설명의 기존 기준
const AX_MAX_PLACES = 30, AX_MAX_REGIONS = 10, AX_MAX_LINES = 40;
const AX_BN = ['60㎡ 이하', '60~85㎡', '85㎡ 초과'];
const AX_SIDO_OLD = { '광주광역시': '전남광주통합특별시', '전라남도': '전남광주통합특별시', '강원도': '강원특별자치도', '전라북도': '전북특별자치도', '제주도': '제주특별자치도' };
function axEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function axTxt(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F<>]/g, ' ').trim().slice(0, n); }
function axWon(m) { m = Math.round(Number(m) || 0); const e = Math.floor(m / 10000), r = m % 10000; return e && r ? `${e}억 ${r.toLocaleString('en-US')}만 원` : e ? `${e}억 원` : `${r.toLocaleString('en-US')}만 원`; }
function axPid(p) { return [p.code, p.dong, p.jibun || '', p.apt, p.band].join('|'); }          // watch-core idOf 와 같음
function axRowKey(p) { return [p.dong, p.jibun || '', p.apt, p.band].join('|'); }              // today/g 의 u 키
function axIso(d8) { d8 = String(d8 || ''); return /^\d{8}$/.test(d8) ? `${d8.slice(0, 4)}-${d8.slice(4, 6)}-${d8.slice(6, 8)}` : ''; }
function axAddDay(iso, n) { const t = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + n * 864e5, d = new Date(t); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; }
function axMd(x) { const s = String(x || '').replace(/-/g, ''); return s.length >= 8 ? `${+s.slice(4, 6)}/${+s.slice(6, 8)}` : ''; }
function axPct(v) { return (Math.round(Math.abs(v) * 10) / 10).toFixed(1); }
/** 키 → 짧은 글자(같은 알림을 두 번 보내지 않으려고 기록하는 값). 서버·화면이 같은 값을 만든다 */
function axKeyId(s) {
  s = String(s); let a = 0x811c9dc5, b = 0x01000193 ^ s.length;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = Math.imul(b ^ c, 2246822519) >>> 0; }
  return ('0000000' + a.toString(16)).slice(-8) + ('0000000' + b.toString(16)).slice(-8);
}
function axSido(s) { s = String(s || ''); return AX_SIDO_OLD[s] || s; }

/** 알림 설정 정리(서버·화면 같은 규칙). kinds = 관심 단지 알림 종류, mute = 알림을 끈 단지(키), cy = 청약 맞춤 알림 */
function axCleanPrefs(x) {
  x = x && typeof x === 'object' ? x : {};
  const k = x.kinds && typeof x.kinds === 'object' ? x.kinds : {}, kinds = {};
  Object.keys(AX_KINDS).forEach(n => { kinds[n] = AX_OPTIN[n] ? k[n] === true : k[n] !== false; });
  const mute = (Array.isArray(x.mute) ? x.mute : []).map(v => axTxt(v, 160)).filter(v => v.split('|').length === 5).filter((v, i, a) => a.indexOf(v) === i).slice(0, AX_MAX_PLACES);
  const c = x.cy && typeof x.cy === 'object' ? x.cy : {}, seen = {};
  const regions = (Array.isArray(c.regions) ? c.regions : []).map(r => r && ({ sd: axSido(axTxt(r.sd, 20)), g: /^\d{5}$/.test(String(r.g || '')) ? String(r.g) : '', gn: axTxt(r.gn, 30) }))
    .filter(r => r && /^[가-힣]{2,12}$/.test(r.sd) && (!r.g || r.gn)).filter(r => { const q = r.sd + '|' + r.g; if (seen[q]) return false; seen[q] = 1; return true; }).slice(0, AX_MAX_REGIONS);
  const n = v => { if (v === '' || v == null) return null; v = Math.round(Number(v)); return isFinite(v) && v >= 0 && v <= 84 ? v : null; };
  let lo = n(c.lo), hi = n(c.hi);
  if (lo != null && hi != null && lo > hi) { const t = lo; lo = hi; hi = t; }
  const ck = c.kinds && typeof c.kinds === 'object' ? c.kinds : {}, cyk = {};
  Object.keys(AX_CY_KINDS).forEach(q => { cyk[q] = ck[q] !== false; });
  return { kinds: kinds, mute: mute, cy: { on: c.on === true && regions.length > 0, regions: regions, nohome: c.nohome === true ? true : c.nohome === false ? false : null, lo: lo, hi: hi, kinds: cyk }, rp: x.rp === true };
}

/* ---------- 관심 단지 한 곳의 알림 ----------
   거래 하나는 알림 하나: 신고가 > 급매·큰 하락 > 새 실거래 순으로 하나만 고른다. 거래 키 = 단지|계약일|층|금액(두 자료에서 같은 거래를 한 번만) */
function axPlaceEvents(p, G, S) {
  const pid = axPid(p), out = {}, order = [];
  const put = (key, ev) => { if (!out[key]) order.push(key); out[key] = Object.assign({ key: key, id: axKeyId(key), pid: pid }, ev); };
  const tkey = t => `t|${pid}|${t.dt}|${t.f == null ? '' : t.f}|${t.p}`;
  const fl = t => (t.f != null && t.f !== '' ? `${t.f}층 ` : '');
  const tags = t => [t.x ? '직거래' : '', t.sus ? '특수 거래 의심' : ''].filter(Boolean);
  ((G && G.rows) || []).forEach(t => {
    if (t.d !== p.dong || (t.j || '') !== (p.jibun || '') || t.a !== p.apt || t.b !== p.band || !(t.p > 0)) return;
    const base = { dt: t.dt, p: t.p, f: t.f, day: t.day || '', tags: tags(t) };
    if (t.hi) put(tkey(t), Object.assign(base, { k: 'high', t: `신고가 거래가 나왔어요: ${axMd(t.dt)} 계약 ${fl(t)}${axWon(t.p)}`,
      s: t.pm > 0 ? `같은 단지·같은 면적의 그 전 최고가 ${axWon(t.pm)}보다 ${axPct((t.p / t.pm - 1) * 100)}% 높아요.` : '같은 단지·같은 면적의 그 전 최고가보다 높아요.' }));
    else if (t.dr != null && t.dr <= AX_DROP && !t.sus) put(tkey(t), Object.assign(base, { k: 'drop', t: `큰 하락 거래가 나왔어요: ${axMd(t.dt)} 계약 ${fl(t)}${axWon(t.p)}`,
      s: `이 거래는 최근 2년 최고가${t.m2 > 0 ? ' ' + axWon(t.m2) : ''}보다 ${axPct(t.dr)}% 낮아요.` }));
    else put(tkey(t), Object.assign(base, { k: 'trade', t: `새 실거래가 올라왔어요: ${axMd(t.dt)} 계약 ${fl(t)}${axWon(t.p)}`, s: '국토교통부 실거래 공개 자료에 새로 보인 거래예요.' }));
  });
  ((S && S.urgent) || []).forEach(u => {
    if (u.d !== p.dong || u.a !== p.apt || u.b !== p.band || u.sus || !(Math.abs(Number(u.disc)) >= AX_URG) || !(u.p > 0)) return;
    const key = tkey(u);
    if (out[key] && out[key].k === 'high') return;
    put(key, { k: 'drop', dt: u.dt, p: u.p, f: u.f, day: '', tags: u.x ? ['직거래'] : [], t: `급매 수준 거래가 나왔어요: ${axMd(u.dt)} 계약 ${fl(u)}${axWon(u.p)}`,
      s: `이 거래는 최근 3개월 같은 평형 중간값 ${axWon(u.med)}${u.n3 ? `(${u.n3}건)` : ''}보다 ${axPct(u.disc)}% 낮아요.` });
  });
  ((S && S.gap) || []).forEach(g => {
    if (g.d !== p.dong || g.a !== p.apt || g.b !== p.band || g.jr == null || g.jr0 == null || !(Math.abs(Number(g.dlt)) >= AX_JR)) return;
    put(`j|${pid}|${g.to || ''}|${g.jr}`, { k: 'jeonse', jr: g.jr, jr0: g.jr0, t: `전세가율이 ${g.jr0}%에서 ${g.jr}%로 ${axPct(g.dlt)}%p ${g.dlt > 0 ? '올랐어요' : '내려갔어요'}`,
      s: `전세가율은 매매가 대비 전세 보증금 비율이에요(최근 거래 기준${g.to ? ', ' + axMd(g.to) + '까지' : ''}). ${g.dlt > 0 ? '갭 기회와 전세 위험을 함께 확인해 보세요.' : '보증금은 더 안전해졌고, 갭 부담은 커졌어요.'}` });
  });
  const u = G && G.u && G.u[axRowKey(p)], u0 = G && G.u0 && G.u0[axRowKey(p)];
  if (u && u0 && u[2] != null && u0[2] != null && Math.abs(u[2] - u0[2]) >= AX_JR) {
    const d = u[2] - u0[2];
    put(`j|${pid}|${G.date || ''}|${u[2]}`, { k: 'jeonse', jr: u[2], jr0: u0[2], t: `전세가율이 ${u0[2].toFixed(1)}%에서 ${u[2].toFixed(1)}%로 ${axPct(d)}%p ${d > 0 ? '올랐어요' : '내려갔어요'}`,
      s: `전세가율은 매매가 대비 전세 보증금 비율이에요${G.d0 ? `(${axMd(G.d0)} 값과 비교)` : ''}. ${d > 0 ? '갭 기회와 전세 위험을 함께 확인해 보세요.' : '보증금은 더 안전해졌고, 갭 부담은 커졌어요.'}` });
  }
  if (u && u0 && u[2] != null && u0[2] != null) AX_JR_LINES.forEach(L => {          // 80%·90% 선을 넘거나 내려옴(같은 방향은 90일에 한 번)
    const up = u0[2] < L && u[2] >= L, dn = u0[2] >= L && u[2] < L;
    if (!up && !dn) return;
    put(`jx|${pid}|${L}|${up ? 'u' : 'd'}`, { k: 'jeonse', jr: u[2], jr0: u0[2],
      t: up ? `전세가율이 ${L}%를 넘었어요: ${u0[2].toFixed(1)}% → ${u[2].toFixed(1)}%` : `전세가율이 ${L}% 아래로 내려왔어요: ${u0[2].toFixed(1)}% → ${u[2].toFixed(1)}%`,
      s: up ? `전세가율이 ${L}%를 넘으면 집값이 조금만 내려도 전세 보증금을 다 돌려받기 어려워질 수 있어요. 전세로 들어가신다면 보증보험 가입이 되는지 먼저 확인해 보세요.`
        : `전세 보증금 부담이 조금 줄었어요. 갭(매매가 − 전세가)은 그만큼 커졌어요.` });
  });
  return order.map(q => out[q]);
}

/* ---------- 관심 단지 근처 신축 허가(newbuild.json — 건축HUB 건축 인허가 공개 자료) ----------
   xy = 관심 단지 좌표 [경도, 위도](공개 sNN_xy.json), nb = { rows, kinds, asof }. 허가 단계(아직 공사 전)이고, 허가 달이 최근 AX_NB_MONTHS 달 안이며
   신청한 달(since) 이후인 현장만. 현장 좌표는 약 100m 범위로 둥글린 값이라 거리도 대략(50m 단위)으로 적는다. */
function axYm(iso, back) { const y = +String(iso).slice(0, 4), m = +String(iso).slice(5, 7) - (back || 0), t = y * 12 + m - 1; return `${Math.floor(t / 12)}${String(t % 12 + 1).padStart(2, '0')}`; }
function axDist(a, b) { const r = Math.PI / 180, dx = (b[0] - a[0]) * r * Math.cos((a[1] + b[1]) / 2 * r), dy = (b[1] - a[1]) * r; return 6371000 * Math.sqrt(dx * dx + dy * dy); }
function axNbEvents(p, xy, nb, since) {
  if (!Array.isArray(xy) || xy.length < 2 || !nb || !Array.isArray(nb.rows) || !nb.asof) return [];
  const pid = axPid(p), lo = [axYm(nb.asof, AX_NB_MONTHS - 1), since ? axYm(since, 0) : ''].sort().pop(), out = [];
  nb.rows.forEach(r => {
    if (!r || r.st !== 'permit' || !/^\d{6}$/.test(String(r.pm || '')) || r.pm < lo || !Array.isArray(r.xy)) return;
    const m = axDist(xy, r.xy); if (!(m <= AX_NB_M)) return;
    const kn = ((nb.kinds || {})[r.k]) || '건물', cnt = r.u > 0 ? ` ${r.u}${r.k === 'offi' ? '실' : r.k === 'shop' ? '호' : '세대'}` : '';
    out.push({ k: 'nb', key: `n|${pid}|${r.id}`, id: axKeyId(`n|${pid}|${r.id}`), pid: pid, m: Math.max(50, Math.round(m / 50) * 50),
      t: `관심 단지에서 약 ${Math.max(50, Math.round(m / 50) * 50)}m 거리에 신축 허가가 났어요: ${axTxt(r.dn, 30)} ${kn}${cnt}`,
      s: `${String(r.pm).slice(0, 4)}년 ${+String(r.pm).slice(4, 6)}월 허가, 아직 공사 시작 전이에요. 국토교통부 건축HUB 건축 인허가 공개 자료이고, 위치는 약 100m 범위라 거리도 대략이에요. 분양 여부는 이 자료로 알 수 없어요.` });
  });
  return out.sort((a, b) => a.m - b.m);
}
/* ---------- 관심 단지와 같은 시·군·구의 새 청약 공고 ----------
   sg = 관심 단지 시·군·구 {sido, name}(공개 index.json sgg). 공고일이 오늘 이전·최근 AX_NEAR_DAYS 일 안·신청한 날 이후이고 접수가 끝나지 않은 공고만. */
function axCyNear(p, sg, notices, today, since) {
  if (!sg || !sg.name || !today) return [];
  const pid = axPid(p), lo = axAddDay(today, -AX_NEAR_DAYS), out = [];
  (notices || []).forEach(n => {
    if (!n || axSido(n.sd) !== axSido(sg.sido) || n.g !== sg.name) return;
    const pb = axIso(n.pb), st = axCyStages(n);
    if (!pb || pb > today || pb < lo || (since && pb < since) || (st.length && st[st.length - 1].d < today)) return;
    const pw = axIso(n.pw), sub = [pb ? `공고 ${axMd(pb)}` : '', st.map(x => `${x.lab} 접수 ${axMd(x.d)}`).join(' · '), pw ? `발표 ${axMd(pw)}` : ''].filter(Boolean).join(' · ');
    out.push({ k: 'cynear', key: `c|${n.no}|near`, id: axKeyId(`c|${n.no}|near`), pid: pid, no: n.no, n: n.n, u: /^https:\/\//.test(n.u || '') ? n.u : '',
      t: `관심 단지와 같은 ${n.g}에 ${n.n} 청약 공고가 나왔어요`, s: [sub ? sub + '.' : '', n.k === '국민' ? '국민주택이라 무주택 세대구성원만 신청할 수 있어요.' : '', '접수는 청약홈에서 해요.'].filter(Boolean).join(' ') });
  });
  return out;
}

/* ---------- 청약 ----------
   지역: 공고의 시·도(sd)와 시·군·구 이름(g)이 고른 지역과 같을 때. 시·군·구를 비우면 시·도 전체.
   무주택: '집 있음'을 고르면 국민주택(공공) 공고는 뺀다 — 국민주택 일반공급은 무주택 세대구성원만 신청할 수 있어요(주택공급에 관한 규칙).
   가점 범위: 민영 공고에 예상 당첨 가점 범위(cut)가 있으면, 내 가점 범위의 위쪽 끝이 어느 면적대 예상 범위의 아래쪽 끝 이상일 때만.
             예상 범위가 없는 공고(국민주택·자료 부족)는 그대로 알리고 '예상 범위 없음'이라고 적는다. 확률처럼 보이는 말은 쓰지 않는다. */
function axCyMatch(n, cy) {
  if (!n || !cy || !cy.on) return null;
  const sd = axSido(n.sd);
  if (!(cy.regions || []).some(r => r.sd === sd && (!r.g || r.gn === n.g))) return null;
  if (cy.nohome === false && n.k === '국민') return null;
  const cuts = (n.cut || []).filter(c => c && !c.insufficient && c.lo != null && c.hi != null);
  if (cy.lo == null && cy.hi == null) return { fit: '', cuts: cuts };
  if (!cuts.length) return { fit: '이 공고는 예상 당첨 가점 범위가 없어요(국민주택이거나 비교할 과거 자료가 적어요).', cuts: cuts };
  const lo = cy.lo != null ? cy.lo : cy.hi, hi = cy.hi != null ? cy.hi : cy.lo;
  const ok = cuts.filter(c => hi >= c.lo);
  if (!ok.length) return null;
  const c = ok[0];
  return { fit: `${AX_BN[c.band] || ''} 예상 당첨 가점은 ${c.lo}~${c.hi}점이고, 내 가점 범위(${lo}~${hi}점)는 ${lo >= c.hi ? '그보다 높아요' : '그 범위와 겹쳐요'}.`, cuts: ok };
}
/** 접수 단계: 특별공급 시작일, 1순위 시작일(같은 날이면 하나로) */
function axCyStages(n) {
  const out = [], sp = axIso((n.sp || [])[0]), r1 = axIso((n.r1 || [])[0] || (n.rc || [])[0]);
  if (sp) out.push({ lab: '특별공급', d: sp });
  if (r1) { if (out.length && out[0].d === r1) out[0].lab = '특별공급·1순위'; else out.push({ lab: '1순위', d: r1 }); }
  return out;
}
/** 공고 하나 → 오늘 보낼 청약 알림. today = 'YYYY-MM-DD'(한국 날짜), since = 알림을 신청한 날(그 전에 나온 공고는 '새 공고'로 보내지 않음) */
function axCyEvents(n, cy, today, since) {
  const m = axCyMatch(n, cy); if (!m) return [];
  const out = [], kinds = (cy && cy.kinds) || {}, tmr = axAddDay(today, 1), pb = axIso(n.pb), pw = axIso(n.pw), place = [n.sd, n.g].filter(Boolean).join(' ');
  const st = axCyStages(n), first = st[0];
  const sub = [place, pb ? `공고 ${axMd(pb)}` : '', st.map(x => `${x.lab} 접수 ${axMd(x.d)}`).join(' · '), pw ? `발표 ${axMd(pw)}` : ''].filter(Boolean).join(' · ');
  const ev = (k, key, t, extra) => out.push(Object.assign({ k: k, key: key, id: axKeyId(key), no: n.no, n: n.n, u: /^https:\/\//.test(n.u || '') ? n.u : '', t: t, s: [sub ? sub + '.' : '', extra || '', m.fit].filter(Boolean).join(' ') }));
  const live = !first || st[st.length - 1].d >= today;                    // 접수가 모두 끝난 공고는 '새 공고'로 알리지 않음
  if (kinds.cy_new !== false && pb && pb <= today && (!since || pb >= since) && live) ev('cy_new', `c|${n.no}|new`, `${n.n} 청약 공고가 나왔어요`, n.k === '국민' ? '국민주택이라 무주택 세대구성원만 신청할 수 있어요.' : '');
  if (kinds.cy_eve !== false) st.filter(x => x.d === tmr).forEach(x => ev('cy_eve', `c|${n.no}|eve|${x.d}`, `내일(${axMd(x.d)}) ${n.n} ${x.lab} 접수가 시작돼요`, '접수는 청약홈에서 해요.'));
  if (kinds.cy_win !== false && pw && pw === today) ev('cy_win', `c|${n.no}|win`, `오늘(${axMd(pw)}) ${n.n} 당첨자 발표가 있어요`, '당첨 여부는 청약홈에서 확인해요.');
  return out;
}

/* ---------- 하루 묶음 ----------
   o = { places, g:{구: today/g}, s:{구: brief}, notices:[청약 공고], prefs, today, since, sent:{알림id:1},
         xy(p) → 단지 좌표 [경도, 위도] | null, nb: { rows, kinds, asof }(newbuild.json), sg(code) → { sido, name } | null(index.json sgg) }
   → { groups:[{p, pid, ev[]}], cy:[ev], n, ids[] } — 끈 단지·끈 종류·이미 보낸 알림(sent)은 뺀다.
   같은 청약 공고는 한 번만: 청약 맞춤(새 공고)으로 알리는 공고는 근처 청약으로 또 알리지 않고, 근처 청약은 그 공고와 같은 구의 첫 관심 단지에만 붙인다. */
function axDigest(o) {
  o = o || {};
  const P = axCleanPrefs(o.prefs), sent = o.sent || {}, mute = {}, groups = [], ids = [];
  P.mute.forEach(x => { mute[x] = 1; });
  let cy = [];
  if (P.cy.on && o.today) (o.notices || []).forEach(n => { cy = cy.concat(axCyEvents(n, P.cy, o.today, o.since || '').filter(e => !sent[e.id])); });
  const cyNew = {}, nearDone = {};
  cy.forEach(e => { if (e.k === 'cy_new') cyNew[e.no] = 1; });
  (o.places || []).slice(0, AX_MAX_PLACES).forEach(p => {
    const pid = axPid(p); if (mute[pid]) return;
    let ev = axPlaceEvents(p, (o.g || {})[p.code], (o.s || {})[p.code]);
    if (P.kinds.nb && o.nb && o.xy) ev = ev.concat(axNbEvents(p, o.xy(p), o.nb, o.since || ''));
    if (P.kinds.cynear && o.sg) ev = ev.concat(axCyNear(p, o.sg(p.code), o.notices, o.today, o.since || '').filter(e => !cyNew[e.no] && !nearDone[e.no] && (nearDone[e.no] = 1)));
    ev = ev.filter(e => P.kinds[e.k] && !sent[e.id]);
    if (ev.length) { groups.push({ p: p, pid: pid, ev: ev }); ev.forEach(e => ids.push(e.id)); }
  });
  cy.forEach(e => ids.push(e.id));
  return { groups: groups, cy: cy, n: ids.length, ids: ids };
}
/** 화면 배지 수: 이 기기에서 아직 안 본 알림 */
function axUnread(D, seen) { seen = seen || {}; return (D.ids || []).filter(id => !seen[id]).length; }

/* ---------- 받는 사람 확인(동의) ----------
   sub = { state, consent, consentAt, v, email } — 상태 '활성' + 동의 체크 + 동의 시각 + 동의 문구 판 + 이메일 형식이 모두 있어야 보낸다 */
function axCanSend(sub) {
  if (!sub || sub.state !== '활성' || sub.consent !== true) return false;
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(sub.consentAt || '')) || !String(sub.v || '')) return false;
  return /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(String(sub.email || ''));
}
/** 메일 속 광고: 모닝 브리핑과 같은 규칙 — 광고성 정보 받기(①항)와 이른 아침 메일 속 광고 받기(③항) 동의가 모두 있을 때만 */
function axAdOk(c) { return !!(c && c.ad && c.ad.on === true && c.am && c.am.on === true); }

/* ---------- 끄기 링크 ----------
   api = 서버 주소, id = 알림 구독 번호, tok(id) = 서버 비밀값으로 만든 확인값, ph(pid) = 단지 키를 줄인 값 */
function axLinks(api, id, tok, ph) {
  const b = `${api}?action=alertOff&id=${encodeURIComponent(id)}&t=${encodeURIComponent(tok(id))}`;
  return { all: b + '&all=1', cy: b + '&cy=1', place: pid => b + '&p=' + encodeURIComponent(ph(pid)) };
}

/* ---------- 메일 ----------
   o = { site 서비스 이름, web 사이트 주소(끝 /), links(axLinks 결과), since 신청 시각 글자, sender {name, tel, email}, merged(모닝 브리핑 안에 넣을 때), date 'YYYY-MM-DD', gname(코드 → 구 이름) }
   → { subject, html, text }. 광고는 넣지 않는다(광고는 따로 붙임 — 붙일 때 제목 앞 (광고)는 보내는 쪽에서) */
function axMailHtml(D, o) {
  o = o || {};
  const site = o.site || '집코드', web = o.web || '', L = o.links, gname = o.gname || (() => ''), lines = [];
  let left = AX_MAX_LINES, cut = 0;
  const btn = (href, label) => href ? `<a href="${axEsc(href)}" style="font-size:13px;color:#4E5968;text-decoration:underline;white-space:nowrap">${axEsc(label)}</a>` : '';
  const tag = k => `<span style="display:inline-block;font-size:11.5px;font-weight:800;color:${k === 'high' ? '#C2410C' : k === 'drop' ? '#1F56E0' : '#4E5968'};background:${k === 'high' ? '#FDECE4' : k === 'drop' ? '#E8F0FF' : '#F2F4F6'};border-radius:6px;padding:1px 6px;margin-right:4px">${axEsc(AX_KINDS[k] || AX_CY_KINDS[k] || '')}</span>`;
  const li = e => { if (left <= 0) { cut++; return ''; } left--; lines.push(e.t);
    return `<li style="margin:0 0 8px;line-height:1.55">${tag(e.k)}<b style="color:#191F28">${axEsc(e.t)}</b>${(e.tags || []).length ? ` <span style="font-size:12px;color:#4E5968">(${axEsc(e.tags.join(', '))})</span>` : ''}<br><span style="font-size:13.5px;color:#4E5968">${axEsc(e.s)}</span>${e.u ? `<br><a href="${axEsc(e.u)}" style="font-size:13px;color:#2F6BFF">청약홈 공고 보기</a>` : ''}</li>`; };
  const blocks = D.groups.map(g => `<div style="border:1px solid #E5E8EB;border-radius:12px;padding:12px 14px;margin:0 0 10px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap"><div style="font-size:16px;font-weight:900">${axEsc(g.p.apt)} <span style="font-size:13px;font-weight:500;color:#4E5968">${axEsc([gname(g.p.code), g.p.dong, g.p.band].filter(Boolean).join(' · '))}</span></div>${L ? btn(L.place(g.pid), '이 단지 알림 끄기') : ''}</div>
      <ul style="list-style:none;margin:8px 0 0;padding:0">${g.ev.map(li).join('')}</ul>
      ${web ? `<a href="${axEsc(web)}mine/?sd=${encodeURIComponent(g.p.sd)}&d=${encodeURIComponent([g.p.code, g.p.dong, g.p.jibun || '', g.p.apt].join('|'))}&b=${encodeURIComponent(g.p.band)}" style="font-size:13.5px;color:#2F6BFF">이 단지 시세·미래가치 보기</a>` : ''}</div>`).join('');
  const cyb = D.cy.length ? `<div style="border:1px solid #EFE6CC;background:#FBF8EF;border-radius:12px;padding:12px 14px;margin:0 0 10px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap"><div style="font-size:16px;font-weight:900">청약 맞춤 알림</div>${L ? btn(L.cy, '청약 알림 끄기') : ''}</div>
      <ul style="list-style:none;margin:8px 0 0;padding:0">${D.cy.map(e => li(e)).join('')}</ul></div>` : '';
  const more = cut ? `<p style="font-size:13.5px;color:#4E5968;margin:0 0 10px">이 밖에 알림 ${cut}건은 <a href="${axEsc(web)}my/alerts/" style="color:#2F6BFF">알림 센터</a>에서 볼 수 있어요.</p>` : '';
  const head = `<div style="font-size:18px;font-weight:900;margin:0 0 4px">내가 고른 것의 새 소식 <span style="font-size:13px;font-weight:700;color:#2F6BFF">${D.n}건</span></div>
    <p style="margin:0 0 10px;font-size:13.5px;color:#4E5968;line-height:1.55">관심 목록에 넣은 단지와 직접 고른 청약 조건에 생긴 변화 가운데, 알림 센터에서 켜 둔 종류만 모았어요. 숫자는 국토교통부 공개 자료와 청약홈 공고 그대로예요.</p>`;
  const offAll = L ? `<a href="${axEsc(L.all)}" style="color:#4E5968">모든 알림 끄기(한 번 누르면 끝)</a>` : '';
  const foot = `<p style="font-size:12px;color:#4E5968;line-height:1.65;margin:12px 0 0;border-top:1px solid #E5E8EB;padding-top:10px">
    이 메일은 ${axEsc(site)}에서 관심 단지·청약 메일 알림을 신청하신 분께만 보내는 정보 알림이에요${o.since ? `(신청 ${axEsc(o.since)})` : ''}. 알림이 있는 날만 하루 한 번, 오전 7시대에 보내요.<br>
    ${offAll}${offAll ? ' · ' : ''}<a href="${axEsc(web)}my/alerts/" style="color:#4E5968">알림 설정 바꾸기</a><br>
    보낸 사람: ${axEsc(site)}${o.sender ? `(${axEsc(o.sender.name)}) · 전화 ${axEsc(o.sender.tel)} · 답장은 ${axEsc(o.sender.email)}로 가요` : ''}</p>`;
  const body = head + blocks + cyb + more;
  const subject = (`[${site}] ${axMd(o.date || '')} 관심 단지·청약 새 소식 ${D.n}건 — ` + D.groups.map(g => g.p.apt).concat(D.cy.length ? ['청약'] : []).join(', ')).slice(0, 120);
  const html = o.merged ? `<div style="border:2px solid #B8942A;border-radius:12px;padding:14px 16px;margin:0 0 14px">${body}<p style="font-size:12px;color:#4E5968;margin:6px 0 0">${offAll}${offAll ? ' · ' : ''}<a href="${axEsc(web)}my/alerts/" style="color:#4E5968">알림 설정 바꾸기</a></p></div>`
    : `<div style="font-family:'Noto Sans KR',sans-serif;max-width:600px;margin:auto;color:#191F28"><div style="font-weight:900;font-size:19px;margin:6px 0 12px">${axEsc(site)} <span style="color:#2F6BFF">알림</span></div>${body}${foot}</div>`;
  return { subject: subject, html: html, text: lines.join('\n') };
}
/* ALERTS-CORE END */

const SH_AX = '알림구독', AXH = ['id', '카카오id', '상태', '이메일', '이메일가림', '이메일확인값', '동의', '동의시각', '화면동의시각', '동의문구판', '철회시각', '설정', '구독시작일', '최근발송일', '발송수', '만든시각', '수정시각'];
const AXC = Object.fromEntries(AXH.map((h, i) => [h, i]));
const SH_AXL = '알림기록', AXLH = ['날짜', '구독id', '알림id', '종류'];
const SH_AXS = '알림발송', AXSH = ['날짜', '구독id', '방법', '결과', '건수'];
const AX_ACTIONS = { alertMine: 1, alertJoin: 1, alertPrefs: 1, alertLeave: 1 };
const AX_ST = { on: '활성', off: '해지' };
const AX_KEEP_DAYS = 90;          // 보낸 알림 기록 보관 일수(같은 알림을 다시 보내지 않으려고)
const AX_RESERVE = 5;             // 메일 하루 한도가 이만큼 남으면 멈춤(중개사 알림 AGT_CHANNELS 와 같은 기준)
const AX_DATA = BRIEF_DATA.replace(/brief\/$/, '');   // 공개 자료 data/ 주소(모닝 브리핑과 같은 길)
const AX_WEB = WEB_ROOT + 'my/alerts/';

function axSheet() { return uSheet(SH_AX, AXH); }
function axRows() { const v = axSheet().getDataRange().getValues(), out = []; for (let i = 1; i < v.length; i++) if (v[i][AXC['id']]) out.push({ row: i + 1, r: v[i] }); return out; }
function setAX(row, h, v) { axSheet().getRange(row, AXC[h] + 1).setValue(v); }
function axTok(id) { return hashOf('axoff|' + id).slice(1, 17); }
function axPh(pid) { return hashOf('axp|' + pid).slice(1, 11); }
function axFmt(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Seoul', 'yyyy-MM-dd HH:mm') : String(v || ''); }
/** 시트 행 → 구독 정보 */
function axSubOf(o) {
  const r = o.r;
  return { row: o.row, id: String(r[AXC['id']]), k: String(r[AXC['카카오id']]), state: String(r[AXC['상태']]), email: String(r[AXC['이메일']] || '').replace(/^'/, ''),
    mask: String(r[AXC['이메일가림']] || ''), consent: r[AXC['동의']] === true, consentAt: axFmt(r[AXC['동의시각']]), v: String(r[AXC['동의문구판']] || ''),
    prefs: axCleanPrefs(parseJ(r[AXC['설정']], {})), since: String(r[AXC['구독시작일']] instanceof Date ? ymd(r[AXC['구독시작일']]) : r[AXC['구독시작일']] || '').slice(0, 10),
    last: String(r[AXC['최근발송일']] instanceof Date ? ymd(r[AXC['최근발송일']]) : r[AXC['최근발송일']] || '').slice(0, 10), sent: Number(r[AXC['발송수']]) || 0 };
}
function axMine(k) { const o = axRows().filter(x => String(x.r[AXC['카카오id']]) === k).pop(); return o ? axSubOf(o) : null; }
function axPublic(s) { return s ? { id: s.id, state: s.state, mask: s.mask, at: s.consentAt, v: s.v, prefs: s.prefs, since: s.since, last: s.last } : null; }
/** 이용 중인 모닝 브리핑(이메일) 행 — 있으면 알림은 브리핑 메일에 함께 들어감 */
function axBriefMail(k, now) {
  return myBriefs(k).filter(o => { const s = briefState(o, now || new Date()); return s.active && s.channel === 'email' && String(o.r[BC['연락처']] || ''); }).pop() || null;
}
/** 회원 저장 자료의 관심 단지(favs). m 을 주면 한 번 읽은 표에서(하루 발송 때) */
function axFavsMap() {
  const sh = book().getSheetByName(SH_U), m = {}; if (!sh) return m;
  sh.getDataRange().getValues().slice(1).forEach(x => { const d = parseJ(x[UC['저장자료']], {}); m[String(x[UC['카카오id']])] = (Array.isArray(d && d.favs) ? d.favs : []).map(y => cleanPlace(y, false)).filter(Boolean).slice(0, AX_MAX_PLACES); });
  return m;
}
function axFavs(k, m) { return (m || axFavsMap())[k] || []; }
/** v49 회원 저장 자료의 내 집(homes) — 성적표 메일용 */
function axHomesMap() {
  const sh = book().getSheetByName(SH_U), m = {}; if (!sh) return m;
  sh.getDataRange().getValues().slice(1).forEach(x => { const d = parseJ(x[UC['저장자료']], {}); m[String(x[UC['카카오id']])] = (Array.isArray(d && d.homes) ? d.homes : []).map(y => cleanPlace(y, false)).filter(Boolean).slice(0, 5); });
  return m;
}
function axHomes(k, m) { return (m || axHomesMap())[k] || []; }

function axDispatch(b) {
  try {
    return withLock(() => {
      if (b.action === 'alertMine') return alertMine(b);
      if (b.action === 'alertJoin') return alertJoin(b);
      if (b.action === 'alertPrefs') return alertPrefs(b);
      if (b.action === 'alertLeave') return alertLeave(b);
      return { ok: false, err: 'unknown' };
    });
  } catch (x) {
    return { ok: false, err: String(x.message || x), code: x.code || '' };
  }
}
function alertMine(b) {
  const u = sessionUser(b.s), bm = axBriefMail(u.k);
  return { ok: true, v: AX_V, sub: axPublic(axMine(u.k)), brief: bm ? { mask: String(bm.r[BC['연락처가림']] || '') } : null, favs: axFavs(u.k).length, homes: axHomes(u.k).length, rp: 1 };
}
/** 알림 메일 신청(동의 필수) — 이미 있으면 같은 행을 다시 켬 */
function alertJoin(b) {
  const u = sessionUser(b.s), now = new Date();
  if (b.consent !== true) throw new Error('알림 메일 받기에 동의해 주셔야 보내 드릴 수 있어요.');
  if (String(b.v || '') !== AX_V) throw new Error('알림 안내 문구가 바뀌었어요. 화면을 새로 고친 뒤 다시 신청해 주세요.');
  let email = '';
  if (b.useBrief === true) { const bm = axBriefMail(u.k, now); if (!bm) throw new Error('모닝 브리핑을 이메일로 받고 있지 않아요. 받을 이메일을 적어 주세요.'); email = String(bm.r[BC['연락처']]).replace(/^'/, ''); }
  else { const ct = parseContact(b.email); if (!ct || ct.kind !== 'email') throw new Error('알림을 받을 이메일 주소를 정확히 적어 주세요.'); email = ct.norm; }
  const ct = parseContact(email), prefs = axCleanPrefs(b.prefs);
  if (!axFavs(u.k).length && !prefs.cy.on && !(prefs.rp && axHomes(u.k).length)) throw new Error('관심 목록에 단지를 넣거나, 청약 알림 지역을 고르거나, 내 집을 등록해야 알림을 보낼 수 있어요.');
  const at = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(b.at || '')) ? String(b.at).slice(0, 25) : '';
  const cur = axRows().filter(x => String(x.r[AXC['카카오id']]) === u.k).pop();
  let row;
  if (cur) {
    row = cur.row;
    if (String(cur.r[AXC['상태']]) !== AX_ST.on) setAX(row, '구독시작일', ymd(now));
  } else {
    const r = []; r[AXC['id']] = 'X' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase(); r[AXC['카카오id']] = u.k; r[AXC['만든시각']] = now; r[AXC['구독시작일']] = ymd(now); r[AXC['발송수']] = 0;
    axSheet().appendRow(AXH.map((h, i) => r[i] === undefined ? '' : r[i]));
    row = axSheet().getLastRow();
  }
  setAX(row, '상태', AX_ST.on); setAX(row, '이메일', cellSafe(ct.norm)); setAX(row, '이메일가림', ct.mask); setAX(row, '이메일확인값', hashOf(ct.norm));
  setAX(row, '동의', true); setAX(row, '동의시각', now); setAX(row, '화면동의시각', cellSafe(at)); setAX(row, '동의문구판', AX_V); setAX(row, '철회시각', '');
  setAX(row, '설정', JSON.stringify(prefs)); setAX(row, '수정시각', now);
  const s = axMine(u.k);
  if (MailApp.getRemainingDailyQuota() > AX_RESERVE) try {
    const L = axLinks(bApi(), s.id, axTok, axPh), bm = axBriefMail(u.k, now);
    axSend('email', s, { subject: `[${SITE_NAME}] 관심 단지·청약 알림 메일 신청을 받았어요`,
      html: `<div style="font-family:sans-serif;line-height:1.7;max-width:560px">${Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}에 알림 메일 신청을 받았어요.<br>
        관심 목록 단지와 고르신 청약 조건에 새 소식이 생긴 날만, 하루 한 번 오전 7시대에 메일을 보내 드려요. 광고가 아닌 정보 알림이에요.<br>
        ${bm ? '모닝 브리핑을 이메일로 받고 계셔서, 알림은 브리핑 메일 맨 위에 함께 넣어 드려요(메일이 두 통 가지 않아요).<br>' : ''}
        <a href="${AX_WEB}">알림 설정 바꾸기</a> · <a href="${L.all}">모든 알림 끄기</a><br>
        보낸 사람: ${bEsc(SITE_NAME)}(${bEsc(BRIEF_SENDER.name)}) · 전화 ${bEsc(BRIEF_SENDER.tel)}</div>` });
  } catch (e) {}
  return alertMine(b);
}
function alertPrefs(b) {
  const u = sessionUser(b.s), prefs = axCleanPrefs(b.prefs), o = axRows().filter(x => String(x.r[AXC['카카오id']]) === u.k).pop();
  if (!o) return { ok: true, saved: false, prefs: prefs };
  setAX(o.row, '설정', JSON.stringify(prefs)); setAX(o.row, '수정시각', new Date());
  return { ok: true, saved: true, sub: axPublic(axMine(u.k)) };
}
function axStop(o, how) {
  const s = axSubOf(o), now = new Date();
  if (s.state === AX_ST.off) return false;
  setAX(o.row, '상태', AX_ST.off); setAX(o.row, '철회시각', now); setAX(o.row, '수정시각', now);
  if (s.email && MailApp.getRemainingDailyQuota() > AX_RESERVE) try {
    axSend('email', s, { subject: `[${SITE_NAME}] 알림 메일을 껐어요`, html: `<div style="font-family:sans-serif;line-height:1.7">${Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm')}에 ${bEsc(how)}에서 요청하신 대로 관심 단지·청약 알림 메일을 모두 껐어요. 받던 이메일 주소는 30일 뒤 지워요.<br>다시 받으시려면 <a href="${AX_WEB}">알림 센터</a>에서 신청해 주세요.</div>` });
  } catch (e) {}
  return true;
}
function alertLeave(b) {
  const u = sessionUser(b.s), o = axRows().filter(x => String(x.r[AXC['카카오id']]) === u.k).pop();
  if (o) axStop(o, '알림 센터');
  return alertMine(b);
}
/* 메일의 한 번 누르는 끄기(로그인 없음): all = 모든 알림, cy = 청약 알림, p = 단지 하나(단지 키를 줄인 값) */
function alertOff(p) {
  const id = String(p.id || ''), t = String(p.t || '');
  let msg = '';
  if (/^X[0-9A-F]{9}$/.test(id) && safeEq(t, axTok(id))) withLock(() => {
    const o = axRows().find(x => String(x.r[AXC['id']]) === id); if (!o) return;
    const s = axSubOf(o);
    if (p.all) { axStop(o, '메일의 끄기 링크'); msg = '관심 단지·청약 알림 메일을 모두 껐어요. 다시 받으시려면 알림 센터에서 신청해 주세요.'; return; }
    const prefs = s.prefs;
    if (p.rp) { prefs.rp = false; msg = '내 집 성적표 메일을 껐어요. 관심 단지·청약 알림은 그대로 받아요.'; }
    else if (p.cy) { prefs.cy.on = false; msg = '청약 알림을 껐어요. 관심 단지 알림은 그대로 받아요.'; }
    else if (p.p) {
      const f = axFavs(s.k).find(x => safeEq(axPh(axPid(x)), String(p.p)));
      if (f) { if (prefs.mute.indexOf(axPid(f)) < 0) prefs.mute.push(axPid(f)); msg = `${f.apt} ${f.band} 알림을 껐어요. 다른 알림은 그대로 받아요.`; }
    }
    if (msg) { setAX(o.row, '설정', JSON.stringify(axCleanPrefs(prefs))); setAX(o.row, '수정시각', new Date()); }
  });
  return HtmlService.createHtmlOutput(`<div style="font-family:sans-serif;padding:40px 20px;text-align:center;line-height:1.7">
    <h2>${msg ? '알림을 껐어요' : '처리하지 못했어요'}</h2><p>${bEsc(msg || '링크가 바뀌었거나 이미 꺼진 알림이에요. 알림 센터에서 직접 끌 수 있어요.')}</p>
    <p><a href="${AX_WEB}">알림 센터로 가기</a></p></div>`);
}

/* ---------- 보내는 길(채널) — 지금은 이메일만. 나중에 웹 푸시·카카오 알림톡을 여기에 한 칸씩 더함(docs/alerts.md) ----------
   msg = { subject, html, text } · sub = 알림 구독(axSubOf) · 결과 { ok, why } */
const AX_SENDERS = {
  email: {
    ready: () => true,
    send(sub, msg) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sub.email || '')) return { ok: false, why: '이메일 없음' };
      MailApp.sendEmail({ to: sub.email, name: SITE_NAME, replyTo: BRIEF_SENDER.email, subject: msg.subject, htmlBody: msg.html });
      return { ok: true };
    }
  },
  webpush: { ready: () => false, send: () => ({ ok: false, why: '웹 푸시 준비 중' }) },   // TODO(docs/alerts.md): VAPID 키·구독 저장·서명 발송
  kakao: { ready: () => false, send: () => ({ ok: false, why: '알림톡 준비 중' }) }       // TODO(docs/alerts.md): solapiSend + 심사받은 정보성 템플릿 SOLAPI_TPL_ALERT
};
function axSend(ch, sub, msg) {
  const S = AX_SENDERS[ch];
  if (!S || !S.ready()) return { ok: false, why: '준비 중' };
  try { return S.send(sub, msg); } catch (e) { return { ok: false, why: String(e.message || e).slice(0, 60) }; }
}

/* ---------- 하루 묶음 만들기 ---------- */
/** 공개 자료를 한 번씩만 받는 상자 */
function axCtx(now) {
  const date = ymd(now || new Date()), gc = {}, sc = {}, xc = {};
  const ix = bFetchJson(AX_DATA + 'index.json');
  const N = (bFetchJson(AX_DATA + 'chungyak/notices.json') || {}).rows || [];
  let nbP;                                                                    // v49: 근처 신축 허가 — 켠 사람이 있을 때만 한 번 받음
  return { date: date, now: now || new Date(), notices: N, favs: axFavsMap(),
    g: c => (c in gc) ? gc[c] : (gc[c] = bFetchJson(AX_DATA + 'today/g/' + c + '.json')),
    s: c => (c in sc) ? sc[c] : (sc[c] = bFetchJson(BRIEF_DATA + c + '.json')),
    gname: c => (((ix || {}).sgg || {})[c] || {}).name || '',
    sg: c => { const x = ((ix || {}).sgg || {})[c]; return x ? { sido: x.sido, name: x.name } : null; },
    nb: () => nbP === undefined ? (nbP = bFetchJson(AX_DATA + 'newbuild.json') || null) : nbP,
    xy: p => { const f = /^s\d{2}$/.test(String(p.sd || '')) ? p.sd : ''; if (!f) return null; if (!(f in xc)) xc[f] = ((bFetchJson(AX_DATA + f + '_xy.json') || {}).xy) || {}; return xc[f][[p.code, p.dong, p.jibun || ''].join('|')] || null; } };
}
/** 보낸 알림 기록 → { 구독id: { 알림id: 1 } } (보관 기간 안만) */
function axSentAll(now) {
  const sh = book().getSheetByName(SH_AXL), out = {}; if (!sh || sh.getLastRow() < 2) return out;
  const lo = ymd(addDays(now || new Date(), -AX_KEEP_DAYS));
  sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().forEach(r => { const d = r[0] instanceof Date ? ymd(r[0]) : String(r[0]).slice(0, 10); if (d >= lo) (out[String(r[1])] = out[String(r[1])] || {})[String(r[2])] = 1; });
  return out;
}
/** 한 사람의 오늘 묶음. 보낼 것이 없으면 null */
function axBuild(s, ctx, sent) {
  if (!axCanSend(s) || s.last === ctx.date) return null;
  const places = axFavs(s.k, ctx.favs), g = {}, sx = {};
  places.forEach(p => { if (!(p.code in g)) { g[p.code] = ctx.g(p.code); sx[p.code] = ctx.s(p.code); } });
  const nb = s.prefs.kinds.nb ? ctx.nb() : null;
  const D = axDigest({ places: places, g: g, s: sx, notices: ctx.notices, prefs: s.prefs, today: ctx.date, since: s.since, sent: (sent || {})[s.id] || {},
    nb: nb ? { rows: nb.rows, kinds: nb.kinds, asof: nb.asof } : null, xy: ctx.xy, sg: ctx.sg });
  return D.n ? D : null;
}
function axMsg(s, D, ctx, merged) {
  return axMailHtml(D, { site: SITE_NAME, web: WEB_ROOT, links: axLinks(bApi(), s.id, axTok, axPh), since: s.consentAt, sender: BRIEF_SENDER, merged: !!merged, date: ctx.date, gname: ctx.gname });
}
/** 보낸 뒤: 기록 + 최근발송일 */
function axDone(s, D, ctx, how) {
  const sh = uSheet(SH_AXL, AXLH), kinds = {};
  D.groups.forEach(g => g.ev.forEach(e => { kinds[e.id] = e.k; })); D.cy.forEach(e => { kinds[e.id] = e.k; });
  D.ids.forEach(id => sh.appendRow([ctx.date, s.id, id, kinds[id] || '']));
  setAX(s.row, '최근발송일', ctx.date); setAX(s.row, '발송수', s.sent + 1);
  uSheet(SH_AXS, AXSH).appendRow([ctx.date, s.id, how, '보냄', D.n]);
}
/** 알림만 따로 보내기(모닝 브리핑을 이메일로 받지 않는 사람, 또는 그날 브리핑을 못 보낸 사람) */
function axSendAlone(s, D, ctx) {
  const m = axMsg(s, D, ctx, false), AD = briefAdToday(ctx.now), c = bConsentOf(s.k);
  let subject = m.subject, html = m.html;
  if (AD && axAdOk(c)) {   // 모닝 브리핑과 같은 규칙: 두 동의가 모두 있을 때만, 제목 앞 (광고), 보낸 사람 정보와 원클릭 수신 거부
    const last = myBriefs(s.k).pop();
    if (last) { subject = ('(광고) ' + subject).slice(0, 120); html = html.replace(/<\/div>$/, briefAdMailHtml(AD, String(last.r[BC['id']])) + '</div>'); }
  }
  const r = axSend('email', s, { subject: subject, html: html, text: m.text });
  if (r.ok) axDone(s, D, ctx, '이메일'); else uSheet(SH_AXS, AXSH).appendRow([ctx.date, s.id, '이메일', '못 보냄: ' + r.why, D.n]);
  return r;
}
/** 모닝 브리핑(briefDaily)이 부르는 창구: forUser(k) → {s, D, html} | null · done(x) · alone(x) */
function axMorning(now) {
  const ctx = axCtx(now), sent = axSentAll(now), subs = {};
  axRows().forEach(o => { const s = axSubOf(o); if (s.state === AX_ST.on) subs[s.k] = s; });
  return {
    ctx: ctx,
    forUser(k) { const s = subs[k]; if (!s) return null; const D = axBuild(s, ctx, sent); return D ? { s: s, D: D, html: axMsg(s, D, ctx, true).html } : null; },
    done(x) { axDone(x.s, x.D, ctx, '모닝 브리핑에 함께'); x.s.last = ctx.date; },
    alone(x) { const r = axSendAlone(x.s, x.D, ctx); if (r.ok) x.s.last = ctx.date; return r; }
  };
}
/* ---------- 매일 오전 7시대(늦으면 9시대) — alertsInstall 이 트리거를 만듦 ----------
   모닝 브리핑을 이메일로 받는 사람은 건너뜀(briefDaily 가 브리핑 메일에 함께 넣음). 한 사람에게 하루 한 통. */
function alertsInstall() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'alertsDaily').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('alertsDaily').timeBased().everyDays(1).atHour(7).inTimezone('Asia/Seoul').create();
  ScriptApp.newTrigger('alertsDaily').timeBased().everyDays(1).atHour(9).inTimezone('Asia/Seoul').create();   // 7시에 한도·오류로 못 보낸 사람만 다시
  reportInstall();                                                                                               // v49 월요일 내 집 성적표(9시대·11시대)
  axSheet(); uSheet(SH_AXL, AXLH); uSheet(SH_AXS, AXSH);
}
function alertsDaily() {
  const now = new Date(), ctx = axCtx(now), sent = axSentAll(now);
  let n = 0, stop = false;
  axRows().forEach(o => {
    if (stop) return;
    const s = axSubOf(o);
    if (s.state !== AX_ST.on || s.last === ctx.date || !axCanSend(s)) return;
    if (axBriefMail(s.k, now)) return;                         // 모닝 브리핑 메일에 함께 들어감
    if (MailApp.getRemainingDailyQuota() <= AX_RESERVE) { stop = true; uSheet(SH_AXS, AXSH).appendRow([ctx.date, '', '이메일', '하루 한도에 닿아 멈춤 — 남은 분은 다음 실행에', 0]); return; }
    const D = axBuild(s, ctx, sent); if (!D) return;
    if (axSendAlone(s, D, ctx).ok) n++;
  });
  axCleanup(now);
  return n;
}
/* 오래된 기록 지우기 + 끈 지 30일 지난 이메일 원문 지우기(모닝 브리핑 연락처 보관 기간과 같음) */
function axCleanup(now) {
  const sh = book().getSheetByName(SH_AXL);
  if (sh && sh.getLastRow() > 1) {
    const lo = ymd(addDays(now, -AX_KEEP_DAYS)), v = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    let k = 0; while (k < v.length && (v[k][0] instanceof Date ? ymd(v[k][0]) : String(v[k][0]).slice(0, 10)) < lo) k++;
    for (let i = k; i >= 1; i--) sh.deleteRow(i + 1);
  }
  const lim = addDays(now, -BRIEF_KEEP_DAYS);
  axRows().forEach(o => { const off = o.r[AXC['철회시각']]; if (String(o.r[AXC['상태']]) === AX_ST.off && off instanceof Date && off < lim && String(o.r[AXC['이메일']] || '')) setAX(o.row, '이메일', ''); });
}
/** 모닝 브리핑 자료를 만들 동네에 알림 구독자의 관심 단지 동네를 더함(급매·전세가율 급변 칸) — 구독자 수에는 넣지 않음 */
function axAreaCodes() {
  const out = {}, fm = axFavsMap();
  axRows().forEach(o => { const s = axSubOf(o); if (s.state !== AX_ST.on) return; axFavs(s.k, fm).forEach(p => { out[p.code] = 1; }); });
  return Object.keys(out);
}


/* =====================================================================
   v49 내 집 성적표 주간 메일 (안내 docs/alerts.md 6절)
   - 받는 사람: 알림 구독(v44 '알림구독' 시트, 동의·이메일 확인 그대로) 가운데 알림 센터에서 '내 집 성적표 메일'(prefs.rp)을 켠 분만.
   - 싣는 집: 회원 저장 자료의 내 집(homes) 먼저, 관심 단지(favs) 다음, 최대 RP_MAX(6)곳. 끈 단지(mute)는 뺌.
   - 자료: 공개 data/report/index.json 의 date 가 오늘(월요일)일 때만 — 엔진 home_report.py(월요일 07:52, 예비 08:12·08:37·09:22)가 만든 그날 판.
     숫자·문장은 아래 REPORT-CORE(웹 assets/report-core.js 와 같은 글자) 그대로. 순자산·보정 값은 싣지 않음. 광고 없음.
   - 같은 날 두 번 안 보냄('알림기록'에 rp|날짜 한 줄). 메일 하루 한도가 AX_RESERVE 만큼 남으면 멈추고 11시대 실행에 이어서.
   - 끄기: '성적표 메일만 끄기'(GET alertOff &rp=1) · '모든 알림 끄기'(&all=1) · 알림 센터.
   - 카카오 알림톡: RP_ALIMTALK=false — 심사 끝나면 SOLAPI_TPL_REPORT 를 넣고 true(지금은 이메일만).
   - 트리거: alertsInstall 이 reportInstall 을 함께 부름(월요일 오전 9시대·11시대 reportWeekly). 검증: node tools/report-test.js
   ===================================================================== */
const RP_ALIMTALK = false;                         // 카카오 알림톡(비즈 채널·템플릿 심사 끝난 뒤에만 true)
const RP_DATA = AX_DATA + 'report/';
/* REPORT-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/report-test.js 가 비교). */
const RP_MAX = 6;                       // 메일 한 통에 싣는 집 수(내 집 먼저, 그다음 관심 단지)
const RP_JR_LINES = [90, 80];
const RP_FLOOR_NEAR = 3, RP_FLOOR_MIN = 3, RP_FLOOR_DAYS = 365;   // 층 참고값: 내 층 ±3층 · 3건 이상 · 최근 1년
function rpEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function rpWon(m) { m = Math.round(Number(m) || 0); const neg = m < 0; m = Math.abs(m); const e = Math.floor(m / 10000), r = m % 10000; const t = e && r ? `${e}억 ${r.toLocaleString('en-US')}만 원` : e ? `${e}억 원` : `${r.toLocaleString('en-US')}만 원`; return (neg ? '−' : '') + t; }
function rpKey(p) { return [p.dong, p.jibun || '', p.apt, p.band].join('|'); }
function rpPid(p) { return [p.code, p.dong, p.jibun || '', p.apt, p.band].join('|'); }
function rpMd(x) { const s = String(x || '').replace(/-/g, ''); return s.length >= 8 ? `${+s.slice(4, 6)}/${+s.slice(6, 8)}` : ''; }
function rpYm(ym) { ym = String(ym || ''); return /^\d{6}$/.test(ym) ? `${ym.slice(0, 4)}년 ${+ym.slice(4, 6)}월` : ''; }
function rpPct(v) { v = Math.round(Number(v) * 100) / 100; return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%'; }
function rpTrade(t) { return { dt: t[0], f: t[1], p: t[2], x: t[3] === 1, hi: t[4] === 1 }; }
function rpRow(t) { return { apt: t[0], band: t[1], dt: t[2], f: t[3], p: t[4], x: t[5] === 1, hi: t[6] === 1 }; }
/** 전용면적별 시세 목록([[전용㎡, 시세, 연월], …] — 한 평형에 전용 타입이 여럿일 때만)에서 고른 전용㎡와 가장 가까운 것(2㎡ 안). 없으면 null */
function rpArea(list, ar) {
  ar = Number(ar); if (!Array.isArray(list) || !(ar > 0)) return null;
  let b = null;
  list.forEach(x => { if (Array.isArray(x) && x[0] > 0 && (!b || Math.abs(x[0] - ar) < Math.abs(b[0] - ar))) b = x; });
  return b && Math.abs(b[0] - ar) <= 2 ? b : null;
}

/** 한 집의 성적표 카드(공식 숫자만). R = report/g/{구}.json, 없거나 그 집이 없으면 null */
function rpCard(p, R) {
  if (!p || !R || !R.u) return null;
  const u = R.u[rpKey(p)]; if (!u) return null;
  const q = (R.p || {})[rpKey(p)] || null, d = (R.d || {})[p.dong] || null, cap = v => v == null ? null : Math.min(99, v);
  const ta = p.ar ? rpArea(u[9], p.ar) : null, qa = ta && q ? rpArea(q[4], ta[0]) : null;   // 내 집에 고른 전용면적이 있으면 그 면적 시세
  const wk = R.wk && R.wk.w ? { w: R.wk.w, from: R.wk.from, to: R.wk.to, st: R.wk.st, g: R.wk.g || null, sd: R.wk.sd || null, kr: R.wk.kr || null } : null;
  let near = null;
  if (d && Array.isArray(d.nw)) near = { mode: 'new', n: d.nn || 0, list: d.nw.map(rpRow) };
  else if (d && Array.isArray(d.rc)) near = { mode: 'recent', n: d.nr || 0, list: d.rc.map(rpRow) };
  return {
    p: p, pid: rpPid(p), date: R.date || '', pd: R.pd || '',
    price: ta ? (ta[1] ? { v: ta[1], at: ta[2] || '', v0: qa && qa[1] ? qa[1] : null, ar: ta[0] } : null)
      : u[0] ? { v: u[0], at: u[6] || '', v0: q && q[0] ? q[0] : null } : null,
    rank: u[1] ? { r: u[1], n: u[4], same: u[5] === 1, r0: q && q[1] ? q[1] : null } : null,
    fv: u[2] != null ? { v: cap(u[2]), v0: q && q[2] != null ? cap(q[2]) : null, sr: u[7] || null } : null,
    jr: u[3] != null ? { v: u[3], v0: q && q[3] != null ? q[3] : null, line: RP_JR_LINES.find(L => u[3] >= L) || 0 } : null,
    trades: (u[8] || []).map(rpTrade), wk: wk, near: near
  };
}
/** 차이 글자: 지난 성적표 값이 있을 때만 */
function rpDiff(v, v0, unit) {
  if (v == null || v0 == null) return '';
  const d = Math.round((v - v0) * 10) / 10;
  if (!d) return '지난번과 같아요';
  return unit === '위' ? `지난번 ${v0}위 → ${Math.abs(d)}계단 ${d < 0 ? '올랐어요' : '내려갔어요'}`
    : unit === '원' ? `지난번보다 ${rpWon(Math.abs(d))} ${d > 0 ? '올랐어요' : '내렸어요'}`
    : `지난번 ${v0}${unit} → ${d > 0 ? '+' : '−'}${Math.abs(d)}${unit === '%' ? '%p' : unit}`;
}
/** 카드 → 쉬운 말 줄 [{k, h(제목), t(큰 글), s(설명)}] — 메일과 화면이 같은 문장을 쓴다. gname = 구 이름 */
function rpLines(c, gname) {
  const out = [], g = gname || '우리 구';
  const W = c.wk;
  if (W && W.g) {
    const x = W.g, per = `지난주(${rpMd(W.from)}~${rpMd(W.to)})`;
    let t, s;
    if (x.chg != null && !x.old) {
      t = `${per} ${g} 아파트값은 같은 집끼리 비교해 ${rpPct(x.chg)} ${x.chg > 0 ? '올랐어요' : x.chg < 0 ? '내렸어요' : '그대로였어요'}`;
      s = `석 달 안에 다시 팔린 같은 집 ${Number(x.np).toLocaleString('en-US')}쌍의 값 차이에서, 가장 많이 오르고 내린 4분의 1씩을 빼고 평균 낸 값이에요(${W.st === 'final' ? '확정' : '신고가 더 들어오면 바뀔 수 있는 잠정'} 숫자).`;
    } else {
      t = `${per} ${g}는 같은 집 다시 거래가 ${Number(x.np || 0).toLocaleString('en-US')}쌍이라 변동률을 내지 않았어요`;
      s = `30쌍 이상일 때만 내요.${x.mchg != null ? ` 최근 4주를 합쳐 보면 ${rpPct(x.mchg)}예요.` : ''}`;
    }
    const sd = W.sd && W.sd.chg != null ? `${W.sd.nm} 전체 ${rpPct(W.sd.chg)}` : '', kr = W.kr && W.kr.chg != null ? `전국 ${rpPct(W.kr.chg)}` : '';
    if (sd || kr) s += ` 같은 주 ${[sd, kr].filter(Boolean).join(' · ')}.`;
    out.push({ k: 'wk', h: '이번 주 가격 흐름', t: t, s: s });
  } else out.push({ k: 'wk', h: '이번 주 가격 흐름', t: '이번 주 가격 흐름 자료가 아직 없어요', s: '주간 실거래 동향이 나오면 함께 보여 드려요.' });
  if (c.price) out.push({ k: 'price', h: '최근 시세', t: rpWon(c.price.v) + (c.price.v0 ? ` · ${rpDiff(c.price.v, c.price.v0, '원')}` : ''),
    s: `${rpYm(c.price.at)}까지 3개월 동안 이 단지·이 평형의 ${c.price.ar ? `전용 ${c.price.ar}㎡(내가 고른 면적)` : '같은 전용면적'} 실거래 3.3㎡당 값 중간값으로 계산했어요(같은 면적 거래가 모자라면 다른 면적 거래를 이 면적 값으로 맞춰 함께 써요).` });
  const tr = c.trades.slice(0, 3).map(t => `${rpMd(t.dt)} ${t.f != null ? t.f + '층 ' : ''}${rpWon(t.p)}${t.hi ? '(신고가)' : ''}${t.x ? '(직거래)' : ''}`);
  out.push({ k: 'trade', h: '최근 실거래', t: tr.length ? tr.join(' · ') : '최근 3년 거래가 없어요', s: '계약일 · 층 · 금액이에요. 국토교통부 실거래 신고 자료 그대로예요.' });
  if (c.rank) out.push({ k: 'rank', h: '동네 순위', t: `${c.p.dong} ${c.rank.same ? '같은 평형대 ' : ''}아파트 ${c.rank.n}곳 중 ${c.rank.r}위` + (c.rank.r0 ? ` · ${rpDiff(c.rank.r, c.rank.r0, '위')}` : ''),
    s: '최근 3.3㎡당 실거래 값이 높은 순서예요.' });
  if (c.fv) out.push({ k: 'fv', h: '미래가치 점수', t: `${c.fv.v}점` + (c.fv.v0 != null ? ` · ${rpDiff(c.fv.v, c.fv.v0, '점')}` : '') + (c.fv.sr ? ` · 시·도 안 ${Number(c.fv.sr).toLocaleString('en-US')}위` : ''),
    s: '공개 자료로 따져 본 참고 점수예요. 앞으로의 집값을 정해 주는 숫자는 아니에요.' });
  if (c.jr) out.push({ k: 'jr', h: '전세가율', t: `${Number(c.jr.v).toFixed(1)}%` + (c.jr.v0 != null ? ` · ${rpDiff(Math.round(c.jr.v * 10) / 10, Math.round(c.jr.v0 * 10) / 10, '%')}` : ''),
    s: c.jr.line ? `매매가 대비 전세 보증금 비율이 ${c.jr.line}%를 넘었어요. 이 정도면 집값이 조금만 내려도 보증금을 다 돌려받기 어려워질 수 있어요.` : '매매가 대비 전세 보증금 비율이에요. 높을수록 갭(매매가 − 전세가)이 작아요.' });
  if (c.near) {
    const L = c.near.list.slice(0, 3).map(r => `${r.apt} ${r.band} ${rpMd(r.dt)} ${r.f != null ? r.f + '층 ' : ''}${rpWon(r.p)}${r.hi ? '(신고가)' : ''}`);
    out.push({ k: 'near', h: '우리 동네 새 거래',
      t: c.near.mode === 'new' ? (c.near.n ? `지난 성적표(${rpMd(c.pd)}) 뒤 ${c.p.dong}에 새로 올라온 아파트 거래 ${c.near.n}건` : `지난 성적표(${rpMd(c.pd)}) 뒤 ${c.p.dong}에 새로 올라온 아파트 거래는 없어요`)
        : (c.near.n ? `최근 2주 ${c.p.dong}에서 계약된 아파트 거래 ${c.near.n}건` : `최근 2주 ${c.p.dong}에서 신고된 아파트 거래는 아직 없어요`),
      s: (L.length ? L.join(' · ') + '. ' : '') + (c.near.mode === 'new' ? '공개 자료에 처음 보인 거래예요.' : '지금까지 신고된 것만 세었어요(신고는 계약 뒤 30일 안에 해요).') });
  }
  return out;
}
/** 순자산 = 집값 − 대출 잔액(사용자가 적은 값). 둘 다 있어야 계산 */
function rpNet(price, loan) {
  price = Number(price); loan = Number(loan);
  if (!(price > 0) || !(loan >= 0) || !isFinite(loan)) return null;
  return { net: price - loan, ratio: Math.round(loan / price * 1000) / 10 };
}
/** 층 참고값: 같은 단지·같은 평형 실거래(price/{구}.json units[11]) 가운데 내 층 ±3층 · 최근 1년 · 직거래 뺀 거래의 중간값. 3건 미만이면 null */
function rpFloorRef(trades, fl, today) {
  fl = Math.round(Number(fl)); if (!isFinite(fl) || fl < -5 || fl > 120 || !Array.isArray(trades)) return null;
  const t = String(today || '').replace(/-/g, ''), lo = (+t.slice(0, 4) - 1) * 10000 + +t.slice(4, 8);
  const v = trades.filter(x => Array.isArray(x) && x[0] >= lo && x[4] !== 1 && x[2] != null && Math.abs(x[2] - fl) <= RP_FLOOR_NEAR && x[3] > 0).map(x => x[3]).sort((a, b) => a - b);
  if (v.length < RP_FLOOR_MIN) return { n: v.length, med: null };
  const n = v.length, med = n % 2 ? v[(n - 1) / 2] : Math.round((v[n / 2 - 1] + v[n / 2]) / 2);
  return { n: n, med: med, lo: v[0], hi: v[n - 1] };
}
/** 메일에 실을 집: 내 집(homes) 먼저, 관심 단지(favs) 다음, 같은 집은 한 번, RP_MAX 곳까지 */
function rpPlaces(homes, favs) {
  const seen = {}, out = [];
  (homes || []).concat(favs || []).forEach(p => { if (!p || !p.code) return; const id = rpPid(p); if (seen[id] || out.length >= RP_MAX) return; seen[id] = 1; out.push(p); });
  return out;
}
/* 메일: cards = [{c(카드), g(구 이름), mine(내 집이면 true)}], o = { site, web(끝 /), links: { rp(성적표만 끄기), all(모든 알림 끄기) }, sender, date }
   → { subject, html, text }. 광고 없음. 순자산·보정 값은 싣지 않는다(메일은 전달될 수 있어서) */
function rpMailHtml(cards, o) {
  o = o || {};
  const site = o.site || '집코드', web = o.web || '', L = o.links || {}, text = [];
  const blocks = cards.map(x => {
    const c = x.c, lines = rpLines(c, x.g);
    text.push(`■ ${c.p.apt} ${c.p.band}`); lines.forEach(l => text.push(`${l.h}: ${l.t}`));
    const rows = lines.map(l => `<tr><td style="padding:7px 0;border-top:1px solid #F2F4F6;vertical-align:top;width:92px;font-size:13px;color:#4E5968;font-weight:700">${rpEsc(l.h)}</td>
      <td style="padding:7px 0 7px 8px;border-top:1px solid #F2F4F6"><b style="font-size:14.5px;color:#191F28;line-height:1.5">${rpEsc(l.t)}</b><br><span style="font-size:12.5px;color:#4E5968;line-height:1.55">${rpEsc(l.s)}</span></td></tr>`).join('');
    const url = web ? `${web}my/report/?sd=${encodeURIComponent(c.p.sd)}&d=${encodeURIComponent([c.p.code, c.p.dong, c.p.jibun || '', c.p.apt].join('|'))}&b=${encodeURIComponent(c.p.band)}${c.p.ar ? '&a=' + encodeURIComponent(c.p.ar) : ''}` : '';
    return `<div style="border:1px solid #E5E8EB;border-radius:14px;padding:14px 16px;margin:0 0 12px">
      <div style="font-size:12px;font-weight:800;color:${x.mine ? '#8A6A12' : '#4E5968'}">${x.mine ? '내 집' : '관심 단지'}</div>
      <div style="font-size:17px;font-weight:900;margin:2px 0 6px">${rpEsc(c.p.apt)} <span style="font-size:13px;font-weight:500;color:#4E5968">${rpEsc([x.g, c.p.dong, c.p.band].filter(Boolean).join(' · '))}</span></div>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      ${url ? `<a href="${rpEsc(url)}" style="display:inline-block;margin-top:8px;font-size:13.5px;color:#2F6BFF">성적표 크게 보기·공유하기</a>` : ''}</div>`;
  }).join('');
  const off = [L.rp ? `<a href="${rpEsc(L.rp)}" style="color:#4E5968">성적표 메일만 끄기(한 번 누르면 끝)</a>` : '', L.all ? `<a href="${rpEsc(L.all)}" style="color:#4E5968">모든 알림 끄기</a>` : '',
    web ? `<a href="${rpEsc(web)}my/alerts/" style="color:#4E5968">알림 설정 바꾸기</a>` : ''].filter(Boolean).join(' · ');
  const html = `<div style="font-family:'Noto Sans KR',sans-serif;max-width:600px;margin:auto;color:#191F28">
    <div style="font-weight:900;font-size:19px;margin:6px 0 2px">${rpEsc(site)} <span style="color:#B8942A">내 집 성적표</span> <span style="font-size:13px;font-weight:700;color:#4E5968">${rpMd(o.date)}</span></div>
    <p style="margin:0 0 12px;font-size:13.5px;color:#4E5968;line-height:1.55">등록하신 내 집과 관심 단지의 한 주를 공개 자료로만 정리했어요. 지난 성적표와 달라진 점을 함께 적었어요.</p>
    ${blocks}
    <p style="font-size:12px;color:#4E5968;line-height:1.65;margin:12px 0 0;border-top:1px solid #E5E8EB;padding-top:10px">
    자료: 국토교통부 아파트 매매 실거래가 공개 자료, ${rpEsc(site)} 주간 실거래 동향. 과거 자료로 만든 참고 정보예요.<br>
    이 메일은 ${rpEsc(site)} 알림 센터에서 '내 집 성적표 메일'을 켜신 분께만 매주 월요일 오전에 보내는 정보 메일이에요. 광고가 아니에요.<br>
    ${off}<br>보낸 사람: ${rpEsc(site)}${o.sender ? `(${rpEsc(o.sender.name)}) · 전화 ${rpEsc(o.sender.tel)} · 답장은 ${rpEsc(o.sender.email)}로 가요` : ''}</p></div>`;
  const first = cards[0] ? cards[0].c.p.apt : '';
  const subject = `[${site}] ${rpMd(o.date)} 내 집 성적표 — ${first}${cards.length > 1 ? ` 외 ${cards.length - 1}곳` : ''}`.slice(0, 120);
  return { subject: subject, html: html, text: text.join('\n') };
}
/* REPORT-CORE END */
function reportInstall() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'reportWeekly').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('reportWeekly').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).inTimezone('Asia/Seoul').create();
  ScriptApp.newTrigger('reportWeekly').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(11).inTimezone('Asia/Seoul').create();   // 9시대에 자료가 늦거나 한도로 못 보낸 분
}
/** 월요일 성적표 메일. 반환: 보낸 수(자료가 그날 것이 아니면 -1) */
function reportWeekly() {
  const now = new Date(), date = ymd(now), ix = bFetchJson(RP_DATA + 'index.json');
  if (!ix || ix.date !== date) { uSheet(SH_AXS, AXSH).appendRow([date, '', '성적표', '자료가 아직 없어 다음 실행에(' + String((ix || {}).date || '없음') + ')', 0]); return -1; }
  const sent = axSentAll(now), hm = axHomesMap(), fm = axFavsMap(), gc = {}, idx = bFetchJson(AX_DATA + 'index.json') || {};
  const rid = axKeyId('rp|' + date), gfile = c => (c in gc) ? gc[c] : (gc[c] = bFetchJson(RP_DATA + 'g/' + c + '.json'));
  const gname = c => ((idx.sgg || {})[c] || {}).name || '';
  let n = 0, stop = false;
  axRows().forEach(o => {
    if (stop) return;
    const s = axSubOf(o);
    if (s.state !== AX_ST.on || !s.prefs.rp || !axCanSend(s) || ((sent[s.id] || {})[rid])) return;
    if (MailApp.getRemainingDailyQuota() <= AX_RESERVE) { stop = true; uSheet(SH_AXS, AXSH).appendRow([date, '', '성적표', '하루 한도에 닿아 멈춤 — 남은 분은 다음 실행에', 0]); return; }
    const mute = {}; s.prefs.mute.forEach(x => { mute[x] = 1; });
    const homes = axHomes(s.k, hm), mine = {}; homes.forEach(p => { mine[rpPid(p)] = 1; });
    const cards = rpPlaces(homes, axFavs(s.k, fm).filter(p => !mute[rpPid(p)])).map(p => ({ c: rpCard(p, gfile(p.code)), g: gname(p.code), mine: !!mine[rpPid(p)] })).filter(x => x.c);
    if (!cards.length) return;
    const L = axLinks(bApi(), s.id, axTok, axPh);
    const m = rpMailHtml(cards, { site: SITE_NAME, web: WEB_ROOT, links: { rp: L.all.replace(/&all=1$/, '&rp=1'), all: L.all }, sender: BRIEF_SENDER, date: date });
    const r = axSend('email', s, m);
    if (r.ok) { uSheet(SH_AXL, AXLH).appendRow([date, s.id, rid, 'report']); uSheet(SH_AXS, AXSH).appendRow([date, s.id, '성적표', '보냄', cards.length]); n++; }
    else uSheet(SH_AXS, AXSH).appendRow([date, s.id, '성적표', '못 보냄: ' + r.why, cards.length]);
    if (RP_ALIMTALK && AX_SENDERS.kakao.ready()) { /* 심사받은 템플릿(SOLAPI_TPL_REPORT)으로 요약 한 줄 + 성적표 링크 — docs/alerts.md 알림톡 템플릿 안 */ }
  });
  return n;
}


/* =====================================================================
   v46 살아보니(건물별 이야기) — 아파트 단지·오피스텔·빌라·상가 건물마다 짧은 후기와 이야기 (숨김 상태로 미리 만듦)
   화면: assets/community.js(내 집 시세 화면 '살아보니' 칸) · community/(건물별 전체 보기) · community/admin/(운영자 검토, 링크 없음)
   켜기: 화면 assets/config.js COMMUNITY_ENABLED + 서버 설정 open(비공개 엔진 data/community/rules.json → cmRulesPut). 둘 다 꺼져 있으면
         운영자 미리 보기(관리 화면에서 받은 운영자 토큰)만 읽고 쓸 수 있어요.
   누가: 기존 카카오 간편 로그인 회원만 글·신고·인증(sessionUser). 카카오 회원번호는 이 칸 시트에 넣지 않고 cmUid(해시)만.
         화면에 보이는 이름은 닉네임이 아니라 건물마다 다른 '이웃 3F2A' 같은 별명(같은 사람을 건물끼리 이어 볼 수 없게).
   거르기: 전화번호·인터넷 주소·이메일·동·호수는 여기서 바로 막고, 집값 담합·광고·욕설·개인정보 낱말과 스팸 점수 가중치·기준은
         비공개 설정(스크립트 속성 CM_RULES_*, 엔진이 BRIEF_PULL_TOKEN 으로 넣음)에만 있어요. 설정이 아직 없으면 모든 글을 '검토대기'로.
   임시조치(정보통신망법 제44조의2): 신고가 설정한 수 이상 쌓이면 바로 숨기고(임시조치) 운영자가 검토 화면에서 다시 보이기·삭제.
   실거주 인증: 관리비 고지서 같은 사진을 받아 운영자만 보는 드라이브 폴더(공유 안 함)에 두고, 운영자가 승인·거절하면 그 자리에서
         파일을 휴지통으로 옮김(드라이브가 30일 뒤 완전히 지움). 남는 것은 '이 건물 실거주 인증됨' 표시 하나. 14일 동안 검토 안 된 사진도 지움.
   ===================================================================== */
const CM_ACTIONS = { cmPlace: 1, cmWrite: 1, cmReport: 1, cmMine: 1, cmDelete: 1, cmVerify: 1, cmAdminMail: 1, cmAdminEnter: 1, cmAdminQueue: 1, cmAdminAct: 1, cmAdminVerify: 1, cmRulesPut: 1 };
const SH_CMP = '커뮤니티글', SH_CMR = '커뮤니티신고', SH_CMV = '커뮤니티인증';
const CMPH = ['id', '시각', '회원', '장소', '장소이름', '종류', '별점', '내용', '상태', '신고', '이유', '수정일'];
const CMRH = ['시각', '글id', '신고자', '사유'];
const CMVH = ['id', '시각', '회원', '장소', '장소이름', '파일', '상태', '처리일'];
const CMPC = Object.fromEntries(CMPH.map((h, i) => [h, i])), CMRC = Object.fromEntries(CMRH.map((h, i) => [h, i])), CMVC = Object.fromEntries(CMVH.map((h, i) => [h, i]));
const CM_ST = { on: '공개', hold: '검토대기', tmp: '임시조치', del: '삭제' };
const CM_CATS = { tr: '교통', no: '소음', pk: '주차', sc: '학군·학원', mg: '관리' };
const CM_WHY = { abuse: '욕설·비방', pi: '개인 정보', ad: '광고·홍보', dam: '집값 담합', false: '사실이 아닌 내용', etc: '기타' };
const CM_TEXT = { r: [4, 100], p: [10, 500] };            // 후기 한 줄 · 이야기 글 길이(글자)
const CM_IMG_MAX = 2500000, CM_VERIFY_KEEP = 14, CM_ADMIN_DAYS = 30, CM_LINK_MIN = 30;
const CM_PID = /^[aovc]\|\d{5}\|[^|<>\u0000-\u001F]{1,30}\|[^<>\u0000-\u001F]{1,130}$/;
/* 늘 켜 두는 기본 거르기(누구나 아는 형식만 — 낱말 목록·점수는 비공개 설정에) */
const CM_GEN = [
  { id: 'phone', re: /(?:\+?82[\s.\-]*|0)\d{1,2}[\s.\-)]*\d{3,4}[\s.\-]*\d{4}/, msg: '전화번호는 쓸 수 없어요.' },
  { id: 'mail', re: /[\w.+-]+@[\w-]+\.[\w.]+/, msg: '이메일 주소는 쓸 수 없어요.' },
  { id: 'url', re: /(https?:\/\/|www\.|open\.kakao|pf\.kakao|[a-z0-9-]{2,}\.(com|net|org|kr|co|me|ly|io|link|site|xyz|shop|app)\b)/i, msg: '인터넷 주소(링크)는 쓸 수 없어요.' },
  { id: 'unit', re: /\d{1,4}\s*동\s*\d{1,4}\s*호|\d{3,4}\s*호(?!선)/, msg: '동·호수는 쓸 수 없어요. 누가 사는지 알 수 있어서예요.' }
];
const CM_MSG = {
  dam: '집값을 얼마 아래로는 팔지 말자는 식의 글은 쓸 수 없어요. 집값 담합은 법으로 금지돼 있어요(공인중개사법).',
  ad: '광고나 중개 홍보 글은 쓸 수 없어요.',
  prof: '욕설이나 남을 깎아내리는 말은 쓸 수 없어요.',
  pi: '이름·연락처·동·호수처럼 누군지 알 수 있는 내용은 쓸 수 없어요.',
  spam: '같은 글을 너무 자주 올렸거나 광고처럼 보여서 올리지 못했어요. 잠시 뒤 다시 써 주세요.',
  hold: '운영자가 확인한 뒤 올라가요.'
};

function cmDispatch(b) {
  try {
    if (b.action === 'cmRulesPut') return cmRulesPut(b);
    if (b.action === 'cmPlace') return cmPlace(b);
    if (b.action === 'cmAdminMail') return cmAdminMail(b);
    if (b.action === 'cmVerify') return cmVerify(b);                 // 사진 저장(드라이브)은 잠금 밖에서 하고 시트 쓰기만 잠금
    return withLock(() => {
      if (b.action === 'cmWrite') return cmWrite(b);
      if (b.action === 'cmReport') return cmReport(b);
      if (b.action === 'cmMine') return cmMine(b);
      if (b.action === 'cmDelete') return cmDelete(b);
      if (b.action === 'cmAdminEnter') return cmAdminEnter(b);
      if (b.action === 'cmAdminQueue') return cmAdminQueue(b);
      if (b.action === 'cmAdminAct') return cmAdminAct(b);
      if (b.action === 'cmAdminVerify') return cmAdminVerify(b);
      return { ok: false, err: 'unknown' };
    });
  } catch (x) {
    return { ok: false, err: String(x.message || x), code: x.code || '' };
  }
}

/* ---------- 비공개 설정(엔진 → 스크립트 속성) ---------- */
const CM_CHUNK = 8000;
function cmRules() {
  const c = CacheService.getScriptCache(), hit = c.get('cmrules');
  if (hit) return hit === '-' ? null : parseJ(hit, null);
  const P = PropertiesService.getScriptProperties(), n = Number(P.getProperty('CM_RULES_N')) || 0;
  let js = ''; for (let i = 0; i < n; i++) js += P.getProperty('CM_RULES_' + i) || '';
  const r = js ? parseJ(js, null) : null;
  try { c.put('cmrules', r ? js : '-', 300); } catch (e) {}
  return r;
}
function cmNum(v, d, lo, hi) { v = Number(v); return isFinite(v) && v >= lo && v <= hi ? v : d; }
/** 설정 값(설정이 없을 때의 값은 일부러 보수적으로 — 실제 값은 비공개 설정) */
function cmCfg() {
  const r = cmRules() || {}, L = r.lim && typeof r.lim === 'object' ? r.lim : {};
  const lim = k => { const a = Array.isArray(L[k]) ? L[k] : []; return [cmNum(a[0], 1, 1, 100), cmNum(a[1], 2, 1, 500)]; };
  return { ready: !!cmRules(), open: r.open === true, boardMin: cmNum(r.boardMin, 10, 1, 1000), reportHide: cmNum(r.reportHide, 2, 1, 50),
    nearMin: cmNum(r.nearMin, 3, 0, 50), lim: { r: lim('review'), p: lim('post'), rep: lim('report'), v: lim('verify') } };
}
function cmRulesPut(b) {
  if (!pullOk(b)) return { ok: false, err: 'auth' };
  const r = b.rules && typeof b.rules === 'object' ? b.rules : null;
  if (!r || !Array.isArray(r.groups)) return { ok: false, err: 'rules' };
  let n = 0;
  for (const g of r.groups) {
    if (!g || !/^[a-z]{2,10}$/.test(String(g.id || '')) || ['block', 'hold'].indexOf(g.act) < 0 || !Array.isArray(g.re)) return { ok: false, err: 'group' };
    for (const s of g.re) { try { new RegExp(String(s), 'i'); n++; } catch (e) { return { ok: false, err: 'regex ' + g.id }; } }
  }
  const js = JSON.stringify(r);
  if (js.length > CM_CHUNK * 20) return { ok: false, err: 'too big' };
  const P = PropertiesService.getScriptProperties(), old = Number(P.getProperty('CM_RULES_N')) || 0, parts = Math.ceil(js.length / CM_CHUNK);
  for (let i = 0; i < parts; i++) P.setProperty('CM_RULES_' + i, js.slice(i * CM_CHUNK, (i + 1) * CM_CHUNK));
  for (let i = parts; i < old; i++) { try { P.deleteProperty('CM_RULES_' + i); } catch (e) {} }
  P.setProperty('CM_RULES_N', String(parts));
  try { CacheService.getScriptCache().remove('cmrules'); } catch (e) {}
  return { ok: true, n: n, parts: parts, open: r.open === true };
}

/* ---------- 거르기 ---------- */
function cmNorm(s) { return String(s || '').toLowerCase().replace(/[\s​-‍﻿.,·•~!?\-_*'"`^|/\\()[\]{}:;]/g, ''); }
function cmRe(src) { try { return new RegExp(String(src), 'i'); } catch (e) { return null; } }
/** 글 한 개 거르기 → { act: 'ok'|'hold'|'block', why, msg }. ctx: { rules, recent:[같은 사람 최근 7일 글], join:가입일, hour:최근 1시간 글 수, r:별점 } */
function cmCheck(text, ctx) {
  ctx = ctx || {};
  const raw = String(text || ''), norm = cmNorm(raw), rules = ctx.rules;
  for (const g of CM_GEN) if (g.re.test(raw)) return { act: 'block', why: g.id, msg: g.msg };
  if (/(?:^|\D)0\d{8,10}(?:\D|$)/.test(norm)) return { act: 'block', why: 'phone', msg: CM_GEN[0].msg };   // 띄어 쓰거나 점으로 끊은 전화번호
  if (!rules) return { act: 'hold', why: 'norules', msg: CM_MSG.hold };          // 비공개 설정이 아직 없으면 모두 검토 뒤 공개
  let hold = '';
  for (const g of rules.groups || []) {
    const hit = (g.re || []).some(s => { const re = cmRe(s); return re && (re.test(raw) || (g.norm !== false && re.test(norm))); });   // norm:false = 띄어쓰기를 붙이면 엉뚱하게 걸리는 낱말
    if (!hit) continue;
    if (g.act === 'block') return { act: 'block', why: g.id, msg: CM_MSG[g.id] || CM_MSG.pi };
    hold = hold || g.id;
  }
  const sc = rules.score && typeof rules.score === 'object' ? rules.score : null;
  if (sc && sc.w) {
    const w = sc.w, f = cmFeatures(raw, norm, ctx);
    let s = 0; Object.keys(f).forEach(k => { s += (Number(w[k]) || 0) * f[k]; });
    if (isFinite(Number(sc.block)) && s >= Number(sc.block)) return { act: 'block', why: 'spam', msg: CM_MSG.spam };
    if (isFinite(Number(sc.hold)) && s >= Number(sc.hold)) hold = hold || 'spam';
  }
  return hold ? { act: 'hold', why: hold, msg: CM_MSG.hold } : { act: 'ok', why: '', msg: '' };
}
/** 스팸 점수에 쓰는 특징(0~1). 무게·기준은 비공개 설정에 */
function cmFeatures(raw, norm, ctx) {
  const L = Math.max(1, norm.length), cnt = re => (norm.match(re) || []).length;
  const r = ctx.r || null, vals = r ? Object.keys(CM_CATS).map(k => r[k]) : [];
  const joinMs = ctx.join instanceof Date ? ctx.join.getTime() : 0;
  return {
    dup: (ctx.recent || []).some(t => cmNorm(t) === norm) ? 1 : 0,
    rep: /(.)\1{4,}/.test(norm) ? 1 : 0,
    digit: Math.min(1, cnt(/\d/g) / L * 2),
    latin: Math.min(1, cnt(/[a-z]/g) / L * 1.5),
    newbie: joinMs && Date.now() - joinMs < 86400000 ? 1 : 0,
    burst: Math.min(1, (ctx.hour || 0) / 5),
    flat: vals.length && vals.every(v => v === vals[0]) && (vals[0] === 1 || vals[0] === 5) ? 1 : 0,
    short: norm.length < 8 ? 1 : 0
  };
}

/* ---------- 공통 ---------- */
function cmUid(k) { return 'u' + hashOf('cmU|' + k).slice(1, 25); }
function cmAlias(uh, pid) { return '이웃 ' + hashOf('cmA|' + uh + '|' + pid).slice(1, 5).toUpperCase(); }
function cmPid(v) { const s = uText(v, 180); return CM_PID.test(s) ? s : ''; }
function cmDongKey(pid) { const p = pid.split('|'); return p[1] + '|' + p[2]; }
function cmSheet(n) { return n === SH_CMP ? uSheet(SH_CMP, CMPH) : n === SH_CMR ? uSheet(SH_CMR, CMRH) : uSheet(SH_CMV, CMVH); }
function cmRows(n) { const sh = book().getSheetByName(n); if (!sh) return []; const v = sh.getDataRange().getValues(), out = []; for (let i = 1; i < v.length; i++) if (v[i][0]) out.push({ row: i + 1, r: v[i] }); return out; }
function cmCell(s) { return cellSafe(String(s || '')); }
function cmTxt(v) { return String(v == null ? '' : v).replace(/^'/, ''); }
function cmDay(d) { return d instanceof Date ? ymd(d) : String(d || '').slice(0, 10); }
function cmIsAdmin(as) {
  as = String(as || ''); if (!/^[0-9a-f]{64}$/.test(as)) return false;
  const h = hashOf('cmas|' + as), L = parseJ(PropertiesService.getScriptProperties().getProperty('CM_ADM_SESS'), []);
  return L.some(x => x && safeEq(String(x.h), h) && Number(x.exp) > Date.now());
}
function cmGate(b) {
  if (cmCfg().open || cmIsAdmin(b.as)) return true;
  const e = new Error('아직 문을 열지 않은 기능이에요.'); e.code = 'closed'; throw e;
}
function cmOptUser(b) { try { return b.s ? sessionUser(b.s) : null; } catch (e) { return null; } }
/** 사람마다 한 시간·하루 횟수 제한(캐시 — 지워져도 시트 쪽 제한(후기는 건물마다 하나)은 그대로) */
function cmLimit(uh, kind, lim) {
  const c = CacheService.getScriptCache(), now = new Date(), hk = 'cmL|' + kind + '|' + uh + '|' + Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMddHH'), dk = 'cmL|' + kind + '|' + uh + '|' + ymd(now);
  const h = Number(c.get(hk)) || 0, d = Number(c.get(dk)) || 0;
  if (h >= lim[0] || d >= lim[1]) { const e = new Error('짧은 시간에 너무 많이 했어요. 조금 뒤에 다시 해 주세요.'); e.code = 'limit'; throw e; }
  c.put(hk, String(h + 1), 3700); c.put(dk, String(d + 1), 86400);
  return h + 1;
}
function cmVerifiedSet() {
  const s = {}; cmRows(SH_CMV).forEach(o => { if (String(o.r[CMVC['상태']]) === '승인') s[o.r[CMVC['회원']] + '#' + o.r[CMVC['장소']]] = 1; }); return s;
}
function cmPub(o, V, me) {
  const r = o.r, uh = String(r[CMPC['회원']]), pid = String(r[CMPC['장소']]);
  return { id: String(r[CMPC['id']]), at: cmDay(r[CMPC['시각']]), who: cmAlias(uh, pid), v: !!V[uh + '#' + pid], k: String(r[CMPC['종류']]) === 'p' ? 'p' : 'r',
    r: parseJ(r[CMPC['별점']], null), x: cmTxt(r[CMPC['내용']]), n: cmTxt(r[CMPC['장소이름']]), mine: !!me && me === uh };
}
function cmPlaceKey(pid) { return 'cmP|' + hashOf('pid|' + pid).slice(1, 33); }
function cmBust(pids) { try { CacheService.getScriptCache().removeAll(pids.map(cmPlaceKey).concat(pids.map(p => 'cmD|' + hashOf('dong|' + cmDongKey(p)).slice(1, 33)))); } catch (e) {} }

/* ---------- 읽기 ---------- */
function cmPlace(b) {
  const pid = cmPid(b.pid); if (!pid) return { ok: false, err: '건물 정보를 확인하지 못했어요.' };
  const cfg = cmCfg(), admin = cmIsAdmin(b.as);
  if (!cfg.open && !admin) return { ok: true, open: false };
  const u = cmOptUser(b), me = u ? cmUid(u.k) : '';
  const c = CacheService.getScriptCache(), ck = cmPlaceKey(pid);
  let pub = !me ? parseJ(c.get(ck), null) : null;
  if (!pub) {
    const all = cmRows(SH_CMP), V = cmVerifiedSet(), dk = cmDongKey(pid);
    const here = all.filter(o => String(o.r[CMPC['장소']]) === pid && String(o.r[CMPC['상태']]) === CM_ST.on).reverse();
    const rv = here.filter(o => String(o.r[CMPC['종류']]) !== 'p'), ps = here.filter(o => String(o.r[CMPC['종류']]) === 'p');
    const avg = {};
    Object.keys(CM_CATS).forEach(k => { const a = rv.map(o => (parseJ(o.r[CMPC['별점']], {}) || {})[k]).filter(v => v >= 1 && v <= 5); avg[k] = a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length * 10) / 10 : null; });
    const near = rv.length < cfg.nearMin ? all.filter(o => String(o.r[CMPC['장소']]) !== pid && cmDongKey(String(o.r[CMPC['장소']])) === dk && String(o.r[CMPC['상태']]) === CM_ST.on && String(o.r[CMPC['종류']]) !== 'p').reverse().slice(0, 5) : [];
    pub = { n: rv.length, avg: avg, reviews: rv.slice(0, 50).map(o => cmPub(o, V, '')), board: rv.length >= cfg.boardMin, boardMin: cfg.boardMin,
      posts: rv.length >= cfg.boardMin ? ps.slice(0, 50).map(o => cmPub(o, V, '')) : [], near: near.map(o => cmPub(o, V, '')) };
    if (!me) { try { c.put(ck, JSON.stringify(pub), 120); } catch (e) {} }
  }
  const res = Object.assign({ ok: true, open: true, preview: !cfg.open }, pub);
  if (me) {
    const all = cmRows(SH_CMP), V = cmVerifiedSet();
    const mine = all.filter(o => String(o.r[CMPC['장소']]) === pid && String(o.r[CMPC['회원']]) === me && String(o.r[CMPC['상태']]) !== CM_ST.del);
    const myRv = mine.find(o => String(o.r[CMPC['종류']]) !== 'p');
    res.me = { alias: cmAlias(me, pid), v: !!V[me + '#' + pid], vWait: cmRows(SH_CMV).some(o => String(o.r[CMVC['회원']]) === me && String(o.r[CMVC['장소']]) === pid && String(o.r[CMVC['상태']]) === '대기'),
      review: myRv ? Object.assign(cmPub(myRv, V, me), { st: String(myRv.r[CMPC['상태']]) }) : null,
      held: mine.filter(o => String(o.r[CMPC['상태']]) !== CM_ST.on).map(o => ({ id: String(o.r[CMPC['id']]), st: String(o.r[CMPC['상태']]), k: String(o.r[CMPC['종류']]) === 'p' ? 'p' : 'r' })) };
    res.reviews = res.reviews.map(x => Object.assign({}, x, { mine: mine.some(o => String(o.r[CMPC['id']]) === x.id) }));
    res.posts = res.posts.map(x => Object.assign({}, x, { mine: mine.some(o => String(o.r[CMPC['id']]) === x.id) }));
  }
  return res;
}

/* ---------- 쓰기 ---------- */
function cmWrite(b) {
  cmGate(b);
  const u = sessionUser(b.s), uh = cmUid(u.k), cfg = cmCfg();
  const pid = cmPid(b.pid); if (!pid) throw new Error('건물 정보를 확인하지 못했어요.');
  const name = uText(b.name, 60) || pid.split('|')[2];
  const kind = b.kind === 'p' ? 'p' : 'r', text = uText(b.text, 600).replace(/\s+/g, ' ');
  const [lo, hi] = CM_TEXT[kind];
  if (text.length < lo) throw new Error(kind === 'r' ? `한 줄 후기를 ${lo}글자 이상 적어 주세요.` : `이야기를 ${lo}글자 이상 적어 주세요.`);
  if (text.length > hi) throw new Error(`${hi}글자까지 쓸 수 있어요.`);
  let r = null;
  if (kind === 'r') {
    r = {}; for (const k of Object.keys(CM_CATS)) { const v = Math.round(Number((b.r || {})[k])); if (!(v >= 1 && v <= 5)) throw new Error(`${CM_CATS[k]} 별점을 골라 주세요.`); r[k] = v; }
  }
  const all = cmRows(SH_CMP), now = new Date(), wk = addDays(now, -7), hr = addDays(now, -1 / 24);
  if (kind === 'p') {
    const nrv = all.filter(o => String(o.r[CMPC['장소']]) === pid && String(o.r[CMPC['상태']]) === CM_ST.on && String(o.r[CMPC['종류']]) !== 'p').length;
    if (nrv < cfg.boardMin) throw new Error('이 건물은 아직 후기가 적어서 이야기 글을 쓸 수 없어요. 먼저 한 줄 후기를 남겨 주세요.');
  }
  const myAll = all.filter(o => String(o.r[CMPC['회원']]) === uh);
  const recent = myAll.filter(o => o.r[CMPC['시각']] instanceof Date && o.r[CMPC['시각']] > wk).map(o => cmTxt(o.r[CMPC['내용']]));
  const hour = myAll.filter(o => o.r[CMPC['시각']] instanceof Date && o.r[CMPC['시각']] > hr).length;
  const prev = kind === 'r' ? myAll.find(o => String(o.r[CMPC['장소']]) === pid && String(o.r[CMPC['종류']]) !== 'p' && String(o.r[CMPC['상태']]) !== CM_ST.del) : null;
  let join = null; try { join = book().getSheetByName(SH_U).getRange(u.row, UC['가입일'] + 1).getValue(); } catch (e) {}
  const chk = cmCheck(text, { rules: cmRules(), recent: prev ? recent.filter(t => t !== cmTxt(prev.r[CMPC['내용']])) : recent, join: join, hour: hour, r: r });
  if (chk.act === 'block') { const e = new Error(chk.msg); e.code = 'filter'; throw e; }
  if (prev && String(prev.r[CMPC['상태']]) === CM_ST.tmp) throw new Error('신고로 잠시 가려진 후기는 운영자가 확인할 때까지 고칠 수 없어요.');
  cmLimit(uh, kind, cfg.lim[kind]);
  const st = chk.act === 'hold' ? CM_ST.hold : CM_ST.on, sh = cmSheet(SH_CMP);
  const id = prev ? String(prev.r[CMPC['id']]) : 'M' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase();
  const row = [id, prev ? prev.r[CMPC['시각']] : now, uh, pid, cmCell(name), kind, r ? JSON.stringify(r) : '', cmCell(text), st, prev ? Number(prev.r[CMPC['신고']]) || 0 : 0, chk.why, prev ? now : ''];
  if (prev) sh.getRange(prev.row, 1, 1, CMPH.length).setValues([row]); else sh.appendRow(row);
  cmBust([pid]);
  if (st === CM_ST.hold) cmNotify('hold', '검토할 글이 있어요');
  return { ok: true, id: id, st: st, held: st === CM_ST.hold, msg: st === CM_ST.hold ? CM_MSG.hold : '' };
}
function cmReport(b) {
  cmGate(b);
  const u = sessionUser(b.s), uh = cmUid(u.k), cfg = cmCfg(), id = str(b.id, 12), why = CM_WHY[b.why] ? b.why : '';
  if (!/^M[0-9A-F]{9}$/.test(id) || !why) throw new Error('신고 이유를 골라 주세요.');
  const o = cmRows(SH_CMP).find(x => String(x.r[CMPC['id']]) === id);
  if (!o || String(o.r[CMPC['상태']]) === CM_ST.del) throw new Error('글을 찾지 못했어요.');
  if (String(o.r[CMPC['회원']]) === uh) throw new Error('내 글은 신고하지 않고 지울 수 있어요.');
  if (cmRows(SH_CMR).some(x => String(x.r[CMRC['글id']]) === id && String(x.r[CMRC['신고자']]) === uh)) return { ok: true, again: true };
  cmLimit(uh, 'rep', cfg.lim.rep);
  cmSheet(SH_CMR).appendRow([new Date(), id, uh, why]);
  const n = (Number(o.r[CMPC['신고']]) || 0) + 1, sh = cmSheet(SH_CMP);
  sh.getRange(o.row, CMPC['신고'] + 1).setValue(n);
  let hidden = false;
  if (n >= cfg.reportHide && String(o.r[CMPC['상태']]) === CM_ST.on) {
    sh.getRange(o.row, CMPC['상태'] + 1).setValue(CM_ST.tmp);
    sh.getRange(o.row, CMPC['이유'] + 1).setValue('신고 ' + n + '건 — 임시조치 ' + ymd(new Date()));
    hidden = true; cmNotify('tmp', '신고가 쌓여 잠시 가린 글이 있어요(임시조치)');
  }
  cmBust([String(o.r[CMPC['장소']])]);
  return { ok: true, hidden: hidden };
}
function cmMine(b) {
  const u = sessionUser(b.s), uh = cmUid(u.k), V = cmVerifiedSet();
  return { ok: true, list: cmRows(SH_CMP).filter(o => String(o.r[CMPC['회원']]) === uh && String(o.r[CMPC['상태']]) !== CM_ST.del).reverse().slice(0, 100)
    .map(o => Object.assign(cmPub(o, V, uh), { st: String(o.r[CMPC['상태']]), pid: String(o.r[CMPC['장소']]) })) };
}
function cmDelete(b) {
  const u = sessionUser(b.s), uh = cmUid(u.k), id = str(b.id, 12);
  const o = cmRows(SH_CMP).find(x => String(x.r[CMPC['id']]) === id && String(x.r[CMPC['회원']]) === uh);
  if (!o) throw new Error('글을 찾지 못했어요.');
  cmErase(o, '본인 삭제');
  return { ok: true };
}
/** 지우기: 글·별점·건물 이름을 비우고 상태만 남김(신고 기록과 맞춰 보려고 id 는 남김) */
function cmErase(o, why) {
  const sh = cmSheet(SH_CMP);
  ['장소이름', '별점', '내용'].forEach(h => sh.getRange(o.row, CMPC[h] + 1).setValue(''));
  sh.getRange(o.row, CMPC['상태'] + 1).setValue(CM_ST.del);
  sh.getRange(o.row, CMPC['이유'] + 1).setValue(why + ' ' + ymd(new Date()));
  sh.getRange(o.row, CMPC['수정일'] + 1).setValue(new Date());
  cmBust([String(o.r[CMPC['장소']])]);
}
/** 탈퇴(userDelete)할 때: 그 사람 글은 모두 지우고, 인증 사진·기록·신고 기록에서도 뺌 */
function cmUserGone(k) {
  const uh = cmUid(k);
  if (book().getSheetByName(SH_CMP)) cmRows(SH_CMP).filter(o => String(o.r[CMPC['회원']]) === uh && String(o.r[CMPC['상태']]) !== CM_ST.del).forEach(o => cmErase(o, '탈퇴'));
  const vs = book().getSheetByName(SH_CMV);
  if (vs) { const v = vs.getDataRange().getValues(); for (let i = v.length - 1; i >= 1; i--) if (String(v[i][CMVC['회원']]) === uh) { cmTrash(v[i][CMVC['파일']]); vs.deleteRow(i + 1); } }
  const rs = book().getSheetByName(SH_CMR);
  if (rs) { const v = rs.getDataRange().getValues(); for (let i = v.length - 1; i >= 1; i--) if (String(v[i][CMRC['신고자']]) === uh) rs.getRange(i + 1, CMRC['신고자'] + 1).setValue('탈퇴'); }
}

/* ---------- 실거주 인증 ---------- */
function cmFolder() {
  const P = PropertiesService.getScriptProperties(); let f = null; const id = P.getProperty('CM_VERIFY_FOLDER');
  try { f = id ? DriveApp.getFolderById(id) : null; } catch (e) { f = null; }
  if (!f) { f = DriveApp.createFolder(SITE_NAME + ' 실거주 인증 사진(검토 뒤 자동 삭제)'); P.setProperty('CM_VERIFY_FOLDER', f.getId()); }   // 공유 설정 없음 = 운영자만
  return f;
}
function cmTrash(fid) { fid = String(fid || ''); if (!fid) return; try { DriveApp.getFileById(fid).setTrashed(true); } catch (e) {} }
function cmVerify(b) {
  cmGate(b);
  const u = sessionUser(b.s), uh = cmUid(u.k), cfg = cmCfg();
  const pid = cmPid(b.pid); if (!pid) throw new Error('건물 정보를 확인하지 못했어요.');
  const m = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.img || ''));
  if (!m) throw new Error('사진 파일(JPG·PNG)만 올릴 수 있어요.');
  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > CM_IMG_MAX) throw new Error('사진이 너무 커요. 조금 작게 찍어서 올려 주세요.');
  if (bytes.length < 2000) throw new Error('사진을 읽지 못했어요. 다시 골라 주세요.');
  const V = cmVerifiedSet(); if (V[uh + '#' + pid]) return { ok: true, already: true };
  if (cmRows(SH_CMV).some(o => String(o.r[CMVC['회원']]) === uh && String(o.r[CMVC['장소']]) === pid && String(o.r[CMVC['상태']]) === '대기')) return { ok: true, waiting: true };
  cmLimit(uh, 'v', cfg.lim.v);
  const id = 'V' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase();
  const f = cmFolder().createFile(Utilities.newBlob(bytes, 'image/' + m[1], id + '.' + (m[1] === 'png' ? 'png' : 'jpg')));   // 파일 이름에 사람·주소 정보 없음
  withLock(() => cmSheet(SH_CMV).appendRow([id, new Date(), uh, pid, cmCell(uText(b.name, 60)), f.getId(), '대기', '']));
  cmNotify('verify', '실거주 인증 요청이 있어요');
  return { ok: true, id: id, waiting: true };
}

/* ---------- 운영자(관리 화면 community/admin/) ----------
   운영자 확인 = 이 스크립트 주인 메일로만 가는 1회용 링크(30분) → 운영자 토큰(30일, 해시만 저장). 다른 관리 기능과 같이 '시트 주인 메일'을 기준으로 해요. */
function cmAdminMail(b) {
  const c = CacheService.getScriptCache(), n = Number(c.get('cmAM')) || 0;
  if (n >= 3) return { ok: false, err: '방금 보냈어요. 메일함을 확인하거나 1시간 뒤에 다시 눌러 주세요.' };
  c.put('cmAM', String(n + 1), 3600);
  const t = newToken(), P = PropertiesService.getScriptProperties();
  P.setProperty('CM_ADM_LINK', JSON.stringify({ h: hashOf('cmal|' + t), exp: Date.now() + CM_LINK_MIN * 60000 }));
  const url = WEB_ROOT + 'community/admin/#t=' + t;
  try {
    MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), subject: `[${SITE_NAME}] 살아보니 운영자 확인 링크`, name: SITE_NAME,
      body: `살아보니 운영자 화면을 여는 링크예요(${CM_LINK_MIN}분 동안 한 번만 쓸 수 있어요).\n${url}\n\n직접 누르지 않았다면 이 메일은 지워 주세요. 링크가 없으면 아무도 운영자 화면을 열 수 없어요.` });
  } catch (e) { return { ok: false, err: '메일을 보내지 못했어요. 잠시 뒤 다시 눌러 주세요.' }; }
  return { ok: true, sent: true };
}
function cmAdminEnter(b) {
  const t = String(b.t || ''), P = PropertiesService.getScriptProperties(), L = parseJ(P.getProperty('CM_ADM_LINK'), null);
  if (!/^[0-9a-f]{64}$/.test(t) || !L || !(Number(L.exp) > Date.now()) || !safeEq(String(L.h), hashOf('cmal|' + t))) return { ok: false, err: '링크가 맞지 않거나 시간이 지났어요. 확인 메일을 다시 받아 주세요.' };
  P.deleteProperty('CM_ADM_LINK');
  const as = newToken(), exp = Date.now() + CM_ADMIN_DAYS * 86400000;
  const S = parseJ(P.getProperty('CM_ADM_SESS'), []).filter(x => x && Number(x.exp) > Date.now()).slice(-4);
  S.push({ h: hashOf('cmas|' + as), exp: exp });
  P.setProperty('CM_ADM_SESS', JSON.stringify(S));
  return { ok: true, as: as, exp: ymd(new Date(exp)) };
}
function cmAdminNeed(b) { if (!cmIsAdmin(b.as)) { const e = new Error('운영자 확인이 끝났어요. 확인 메일을 다시 받아 주세요.'); e.code = 'admin'; throw e; } }
function cmAdminQueue(b) {
  cmAdminNeed(b);
  cmVerifyCleanup(); cmOldCleanup();
  const cfg = cmCfg(), V = cmVerifiedSet(), R = cmRows(SH_CMR), now = Date.now();
  const reps = {}; R.forEach(o => { const id = String(o.r[CMRC['글id']]); (reps[id] = reps[id] || []).push(CM_WHY[o.r[CMRC['사유']]] || '기타'); });
  const pick = st => cmRows(SH_CMP).filter(o => String(o.r[CMPC['상태']]) === st || (st === 'rep' && String(o.r[CMPC['상태']]) === CM_ST.on && Number(o.r[CMPC['신고']]) > 0)).reverse().slice(0, 100)
    .map(o => Object.assign(cmPub(o, V, ''), { pid: String(o.r[CMPC['장소']]), st: String(o.r[CMPC['상태']]), why: cmTxt(o.r[CMPC['이유']]), reps: reps[String(o.r[CMPC['id']])] || [],
      days: o.r[CMPC['수정일']] instanceof Date || o.r[CMPC['시각']] instanceof Date ? Math.floor((now - (o.r[CMPC['수정일']] || o.r[CMPC['시각']]).getTime()) / 86400000) : null }));
  const vs = cmRows(SH_CMV).filter(o => String(o.r[CMVC['상태']]) === '대기').slice(0, 10).map(o => {
    let img = ''; try { const bl = DriveApp.getFileById(String(o.r[CMVC['파일']])).getBlob(); img = 'data:' + bl.getContentType() + ';base64,' + Utilities.base64Encode(bl.getBytes()); } catch (e) {}
    return { id: String(o.r[CMVC['id']]), at: cmDay(o.r[CMVC['시각']]), pid: String(o.r[CMVC['장소']]), n: cmTxt(o.r[CMVC['장소이름']]), img: img };
  });
  return { ok: true, cfg: { ready: cfg.ready, open: cfg.open, reportHide: cfg.reportHide }, hold: pick(CM_ST.hold), tmp: pick(CM_ST.tmp), rep: pick('rep'), verify: vs };
}
function cmAdminAct(b) {
  cmAdminNeed(b);
  const id = str(b.id, 12), op = String(b.op || ''), o = cmRows(SH_CMP).find(x => String(x.r[CMPC['id']]) === id);
  if (!o) throw new Error('글을 찾지 못했어요.');
  const sh = cmSheet(SH_CMP);
  if (op === 'show') { sh.getRange(o.row, CMPC['상태'] + 1).setValue(CM_ST.on); sh.getRange(o.row, CMPC['신고'] + 1).setValue(0); sh.getRange(o.row, CMPC['이유'] + 1).setValue('운영자 확인 공개 ' + ymd(new Date())); }
  else if (op === 'hide') { sh.getRange(o.row, CMPC['상태'] + 1).setValue(CM_ST.tmp); sh.getRange(o.row, CMPC['이유'] + 1).setValue('운영자 임시조치 ' + ymd(new Date())); }
  else if (op === 'del') cmErase(o, '운영자 삭제');
  else throw new Error('할 일을 골라 주세요.');
  cmBust([String(o.r[CMPC['장소']])]);
  return { ok: true };
}
function cmAdminVerify(b) {
  cmAdminNeed(b);
  const id = str(b.id, 12), ok = b.op === 'ok', o = cmRows(SH_CMV).find(x => String(x.r[CMVC['id']]) === id);
  if (!o || String(o.r[CMVC['상태']]) !== '대기') throw new Error('인증 요청을 찾지 못했어요.');
  cmTrash(o.r[CMVC['파일']]);                                        // 승인이든 거절이든 사진은 바로 지움
  cmSheet(SH_CMV).getRange(o.row, CMVC['파일'] + 1, 1, 3).setValues([['', ok ? '승인' : '거절', new Date()]]);
  cmBust([String(o.r[CMVC['장소']])]);
  return { ok: true };
}
/** 14일 동안 검토 안 된 인증 사진 지우기 */
function cmVerifyCleanup() {
  const lim = addDays(new Date(), -CM_VERIFY_KEEP), sh = book().getSheetByName(SH_CMV); if (!sh) return 0;
  let n = 0;
  cmRows(SH_CMV).forEach(o => { if (String(o.r[CMVC['상태']]) === '대기' && o.r[CMVC['시각']] instanceof Date && o.r[CMVC['시각']] < lim) { cmTrash(o.r[CMVC['파일']]); sh.getRange(o.row, CMVC['파일'] + 1, 1, 3).setValues([['', '기간만료', new Date()]]); n++; } });
  return n;
}
/** 1년 지난 신고 기록·지운 글 처리 기록 지우기(운영정책 초안 6항) */
function cmOldCleanup() {
  const lim = addDays(new Date(), -365);
  const rs = book().getSheetByName(SH_CMR);
  if (rs) { const v = rs.getDataRange().getValues(); for (let i = v.length - 1; i >= 1; i--) if (v[i][CMRC['시각']] instanceof Date && v[i][CMRC['시각']] < lim) rs.deleteRow(i + 1); }
  const ps = book().getSheetByName(SH_CMP);
  if (ps) { const v = ps.getDataRange().getValues(); for (let i = v.length - 1; i >= 1; i--) { const t = v[i][CMPC['수정일']] instanceof Date ? v[i][CMPC['수정일']] : v[i][CMPC['시각']]; if (String(v[i][CMPC['상태']]) === CM_ST.del && t instanceof Date && t < lim) ps.deleteRow(i + 1); } }
}
/** 운영자 알림 메일(종류마다 한 시간에 한 번, 글 내용·사람 정보 없이) */
function cmNotify(kind, title) {
  if (!NOTIFY) return;
  const c = CacheService.getScriptCache(); if (c.get('cmN|' + kind)) return;
  c.put('cmN|' + kind, '1', 3600);
  try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[${SITE_NAME} 살아보니] ${title}`, `운영자 화면에서 확인해 주세요: ${WEB_ROOT}community/admin/\n(운영자 확인 메일을 받은 기기에서 열려요)\n시트: ${book().getUrl()}`); } catch (e) {}
}


/* =====================================================================
   v50 동네 중개사 파트너(숨김) — 동마다 3자리 선착순 제휴 중개사가 '이번 주 우리 동네 한마디'를 쓰면
   광고성 정보에 동의한 모닝 브리핑 구독자에게 맨 아래 '우리 동네 중개사 한마디 (제휴)' 칸으로 보여 줘요.
   화면: dongne/(소개·신청) · dongne/my/(내 파트너 화면·글쓰기·동 바꾸기) · dongne/admin/(운영자 검토, 링크 없음) · dongne/terms/(약관 초안)
         brief/(웹 브리핑 맨 아래) · 첫 화면(이번 주 우수 동네 소식) · brief/subscribe/?dp=초대코드(초대 링크)
   켜기: 이 파일 DONGNE_ENABLED + 화면 assets/config.js PARTNER_ENABLED 를 함께 true 로. 둘 다 꺼져 있으면 운영자(모닝 브리핑 운영자 모드 —
         스크립트 속성 BRIEF_ADMIN_IDS 의 카카오 계정)만 미리 보고 써 볼 수 있어요.
   누가: 카카오 간편 로그인 회원. 시트에는 카카오 회원번호 대신 해시만. 사무소 연락처·이메일은 이 시트에만(깃·공개 자료에 없음).
   확인: 신청한 등록번호를 공공데이터포털 '전국공인중개사사무소표준데이터' API(스크립트 속성 DATA_GO_KR_KEY)로 바로 찾아
         사무소 이름·대표자·주소가 맞으면 바로 승인, 다르거나 못 찾거나 키가 없으면 '검토대기'(운영자가 승인·거절, 이유 메일).
         브이월드 중개업 API(스크립트 속성 VWORLD_KEY, 선택)가 있으면 휴업·폐업도 확인해 '검토대기'로.
   거르기: 전화번호·인터넷 주소·이메일은 바로 막고, 가격 예측·담합·매물 홍보·욕설·비방 낱말은 비공개 설정(엔진 data/dongne/rules.json → dpRulesPut,
         스크립트 속성 DP_RULES_*)에만. 설정이 없으면 모든 글이 '검토대기'. 걸린 글도 '검토대기'로 운영자에게.
   요금(대표 승인 2026-11-23 바뀐 값): 가입 때 카드 등록(토스 자동결제 — 0원 카드 인증으로 빌링키 발급), 첫 달 무료, 둘째 달부터 월 9,900원 자동 결제,
         동 하나 더 월 5,000원(최대 10개 동). 연간 12개월 99,000원·동 하나 더 연 50,000원. 해지는 버튼 하나(그달 말까지 이용).
         결제 실패는 3일 동안 날마다 다시 시도·안내 → 그래도 안 되면 노출을 멈추고 자리는 14일 지킴 → 그 뒤 해지. 안내 메일: 월간 첫 결제 7일 전, 연간 결제 30일·7일 전.
   창립 파트너(문 연 날부터 3개월 안 가입): '창립 파트너' 표시·같은 동 안 노출 순서 우선·추가 동 20% 할인 — 구독이 끊기지 않고 제재가 없는 동안에만.
         해지·결제 끊김 뒤 30일이 지나면 혜택이 사라지고 다시 가입해도 돌려받지 못해요. 중대 위반 박탈·3차 제재 해지면 바로 사라져요.
   잠금: BILLING_OPEN=false(토스 빌링 계약 전) — 빌링키 발급·정기 청구는 모두 거절하고, 카드 등록 없이 무료 '시범 파트너'로만 받아요(사무소 동 포함 3개 동까지).
         빌링을 여는 날 BILLING_OPEN 과 PAID_OPEN 이 둘 다 true 여야 해요. 빌링키·고객키는 스크립트 속성 DP_BK_{파트너id} 에만(시트·깃에 없음).
         토스 시크릿 키: 스크립트 속성 TOSS_BILLING_SECRET_KEY(빌링 전용 상점이 따로 나오면) 또는 TOSS_SECRET_KEY. 화면 키: TOSS_BILLING_CLIENT_KEY.
   매일 할 일(dpDaily)은 모닝 브리핑 발송(briefDaily) 끝에 함께 돌아요(새 트리거 없음): 월요일 글쓰기 안내·우수 동네 소식 고르기, 결제 안내·정기 결제·실패 다시 시도,
         해지 예정일 지나면 자리 비우기(대기 1번에게 넘김), 4주 동안 글이 없으면 안내, 매달 등록 상태 다시 확인(문제가 있으면 노출 멈춤 + 운영자 알림).
   ===================================================================== */
const DONGNE_ENABLED = false;
/* DONGNE-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/dongne-test.js 가 비교). */
const DP_RULE = { slots: 3, incl: 3, max: 10, base: 9900, extra: 5000, yearBase: 99000, yearExtra: 50000, freeMonths: 1, foundMonths: 3, foundExtraOff: 0.2,
  retryDays: 3, holdDays: 14, noticeM: [7], noticeY: [30, 7], foundKeepDays: 30, swapDays: 30,
  /* 묶음 혜택(기존 중개사 제휴 = 검색 결과 노출 함께 쓰는 사무소) — 지금은 끔. 시범 운영 뒤 대표가 정해요.
     'off' 없음 · 'include' 제휴 가입자는 기본 3개 동 무료(추가 동만 결제) · 'discount' 둘 다 가입하면 bundlePct% 할인 */
  bundleMode: 'off', bundlePct: 0, cutoffH: 22, textMax: 200, nearK: 8, postDays: 7, idleDays: 28, bestBoost: 2, reportW: 3 };
const DP_TOPICS = [['deal', '거래 분위기'], ['rent', '전세·월세 동향'], ['rebuild', '재건축·재개발 진행'], ['life', '학군·생활'], ['traffic', '교통·공사']];
function dpTopicName(id) { for (let i = 0; i < DP_TOPICS.length; i++) if (DP_TOPICS[i][0] === id) return DP_TOPICS[i][1]; return ''; }
/** 동 열쇠: '시군구코드|법정동 이름' (브리핑이 쓰는 동 단위와 같음) */
function dpKey(g, dn) {
  g = String(g == null ? '' : g); dn = String(dn == null ? '' : dn).replace(/[|<>\u0000-\u001F]/g, '').trim();
  return /^\d{5}$/.test(g) && /^[가-힣0-9·.]{1,20}$/.test(dn) ? g + '|' + dn : '';
}
function dpSplit(key) { const i = String(key || '').indexOf('|'); return i < 0 ? { g: '', dn: '' } : { g: key.slice(0, i), dn: key.slice(i + 1) }; }
/** 날짜 글자 'YYYY-MM-DD' → 그날 한국 0시의 ms */
function dpDayMs(ymdS) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymdS || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) - 9 * 3600000 : NaN; }
function dpYmd(ms) { const d = new Date(ms + 9 * 3600000); return d.toISOString().slice(0, 10); }
function dpAddDays(ymdS, n) { return dpYmd(dpDayMs(ymdS) + n * 86400000); }
function dpAddMonths(ymdS, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymdS || '')); if (!m) return '';
  const y = +m[1], mo = +m[2] - 1 + n, d = +m[3], last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, mo, Math.min(d, last))).toISOString().slice(0, 10);
}
/** 그날 아침 브리핑에 실을 수 있는 글의 마감: 전날 22시(한국) */
function dpCutoff(ymdS) { return dpDayMs(ymdS) - (24 - DP_RULE.cutoffH) * 3600000; }
/** 이 시각에 쓴 글이 실리는 브리핑 날짜(22시 전이면 다음 날 아침, 22시부터는 그다음 날 아침) */
function dpBriefDay(ms) { const k = dpYmd(ms), next = dpAddDays(k, 1); return ms < dpCutoff(next) ? next : dpAddDays(k, 2); }
/** 창립 파트너: 문 연 날(launch)부터 3개월 안에 가입 */
function dpFounding(launchYmd, joinYmd) { return !!launchYmd && !!joinYmd && joinYmd >= launchYmd && joinYmd < dpAddMonths(launchYmd, DP_RULE.foundMonths); }
/** 한 번 결제 금액: n = 고른 동 수(사무소 동 포함), o = { plan: 'm'(월간)|'y'(연간), founding(창립 혜택이 살아 있음), affiliate(중개사 제휴도 함께) }.
    창립 파트너는 추가 동만 20% 할인(10원 아래 버림). 묶음 혜택은 DP_RULE.bundleMode 를 따름(지금 'off') */
function dpPrice(n, o) {
  o = o || {};
  n = Math.max(1, Math.min(DP_RULE.max, Math.round(Number(n) || 1)));
  const y = o.plan === 'y', extraN = Math.max(0, n - DP_RULE.incl), one = y ? DP_RULE.yearExtra : DP_RULE.extra;
  const each = o.founding ? Math.floor(one * (1 - DP_RULE.foundExtraOff) / 10) * 10 : one, base0 = y ? DP_RULE.yearBase : DP_RULE.base;
  const bm = o.affiliate ? DP_RULE.bundleMode : 'off', pct = Math.max(0, Math.min(100, Number(DP_RULE.bundlePct) || 0));
  const base = bm === 'include' ? 0 : base0, sum = base + extraN * each;
  const total = bm === 'discount' && pct ? Math.floor(sum * (1 - pct / 100) / 10) * 10 : sum;
  return { n: n, plan: y ? 'y' : 'm', incl: Math.min(n, DP_RULE.incl), extraN: extraN, extraEach: each, base: base, baseList: base0, extraSum: extraN * each, total: total,
    bundle: bm !== 'off' ? bm : '', bundleOff: sum - total + (base0 - base), months: y ? 12 : 1, monthly: y ? Math.round(total / 12) : total };
}
/** 묶음 혜택 안내 문장(화면용). 꺼져 있으면 빈 글자 */
function dpBundleText() {
  if (DP_RULE.bundleMode === 'include') return '중개사 제휴(검색 결과 노출)를 함께 쓰는 사무소는 기본 3개 동이 무료예요.';
  if (DP_RULE.bundleMode === 'discount' && Number(DP_RULE.bundlePct) > 0) return `중개사 제휴(검색 결과 노출)를 함께 쓰면 ${Number(DP_RULE.bundlePct)}% 할인해요.`;
  return '';
}
/** 첫 결제일: 가입일 + 무료 1개월(같은 날짜, 없는 날이면 그달 말일) */
function dpFirstCharge(joinYmd) { return dpAddMonths(joinYmd, DP_RULE.freeMonths); }
/** 다음 결제일: 이번 결제일 + 1개월(월간) 또는 12개월(연간) */
function dpNextCharge(chargeYmd, plan) { return dpAddMonths(chargeYmd, plan === 'y' ? 12 : 1); }
/** 그달 말일(해지하면 이날까지 이용) */
function dpMonthEnd(ymdS) { const m = /^(\d{4})-(\d{2})/.exec(String(ymdS || '')); return m ? new Date(Date.UTC(+m[1], +m[2], 0)).toISOString().slice(0, 10) : ''; }
/** 오늘 보내야 할 결제 안내(며칠 전): 월간은 첫 결제만 7일 전, 연간은 결제마다 30일·7일 전. 없으면 0 */
function dpNoticeDue(plan, chargeYmd, todayYmd, first) {
  if (!chargeYmd || !todayYmd) return 0;
  const left = Math.round((dpDayMs(chargeYmd) - dpDayMs(todayYmd)) / 86400000);
  const list = plan === 'y' ? DP_RULE.noticeY : first ? DP_RULE.noticeM : [];
  return list.indexOf(left) >= 0 ? left : 0;
}
/** 결제 실패 뒤: 실패한 날부터 3일 동안 날마다 다시 시도, 그다음은 노출 멈춤(자리는 14일 지킴), 그 뒤 해지. 돌려줌 'retry'|'stop'|'end' */
function dpFailStep(failYmd, todayYmd) {
  const d = Math.round((dpDayMs(todayYmd) - dpDayMs(failYmd)) / 86400000);
  return d <= DP_RULE.retryDays ? 'retry' : d <= DP_RULE.retryDays + DP_RULE.holdDays ? 'stop' : 'end';
}
/** 두 점([경도, 위도]) 사이 거리(km) */
function dpDist(a, b) {
  const R = 6371, r = x => x * Math.PI / 180, dLa = r(b[1] - a[1]), dLo = r(b[0] - a[0]);
  const h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(r(a[1])) * Math.cos(r(b[1])) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
/** 이웃 동: 가운데 점끼리 가까운 순 k개(자기 동 빼고). pts = { '시군구|동': [경도, 위도, …] } */
function dpNear(key, pts, k) {
  const c = pts && pts[key]; if (!c) return [];
  return Object.keys(pts).filter(x => x !== key && pts[x] && isFinite(pts[x][0]) && isFinite(pts[x][1]))
    .map(x => ({ k: x, d: dpDist(c, pts[x]) })).sort((a, b) => a.d - b.d || (a.k < b.k ? -1 : 1)).slice(0, k || DP_RULE.nearK)
    .map(x => ({ key: x.k, km: Math.round(x.d * 10) / 10 }));
}
/** 동 슬롯 바꾸기: 그 자리에서 마지막으로 바꾼 뒤 30일이 지나야 해요. 돌려줌 { ok, wait(남은 날) } */
function dpSwapOk(lastSwapYmd, todayYmd) {
  if (!lastSwapYmd) return { ok: true, wait: 0 };
  const left = DP_RULE.swapDays - Math.round((dpDayMs(todayYmd) - dpDayMs(lastSwapYmd)) / 86400000);
  return left > 0 ? { ok: false, wait: left } : { ok: true, wait: 0 };
}
/** 같은 입력이면 늘 같은 값(돌려 보여 주기용) */
function dpHash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** 글 점수 = 최근일수록(7일 안, 하루에 1점씩 줄어듦) + 도움돼요 − 신고×3 + 지난달 우수 동네 소식 가산 */
function dpScore(p, dayYmd) {
  const age = (dpCutoff(dayYmd) - Number(p.at)) / 86400000;
  const rec = Math.max(0, DP_RULE.postDays - age);
  return Math.round((rec + (Number(p.help) || 0) - (Number(p.rep) || 0) * DP_RULE.reportW + (p.boost ? DP_RULE.bestBoost : 0)) * 100) / 100;
}
/** 한 동에서 그날 실을 글 하나 고르기. posts = [{ id, pid(파트너), at(ms), help, rep, boost }], prevPid = 어제 실린 파트너.
    p.found = 창립 파트너(점수가 같을 때 먼저). 마감 전(전날 22시 전)·최근 7일 글만. 점수가 높은 순, 어제와 같은 파트너는 다른 파트너 글이 있으면 뒤로. 같으면 날짜로 섞음 */
function dpPickPost(posts, dayYmd, prevPid) {
  const cut = dpCutoff(dayYmd), from = cut - DP_RULE.postDays * 86400000;
  const ok = (posts || []).filter(p => p && Number(p.at) < cut && Number(p.at) >= from)
    .map(p => ({ p: p, s: dpScore(p, dayYmd), t: dpHash(dayYmd + '|' + p.id) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || (b.p.found ? 1 : 0) - (a.p.found ? 1 : 0) || a.t - b.t);   // 점수가 같으면 창립 파트너 먼저
  if (!ok.length) return null;
  const other = ok.find(x => x.p.pid !== prevPid);
  return (ok[0].p.pid === prevPid && other ? other : ok[0]).p;
}
/** 한 동의 파트너 순서: 오늘 글이 실린 파트너 먼저, 다음은 창립 파트너, 다음은 최근 7일 안에 글을 쓴 파트너, 글이 없는 파트너는 이름 카드로 뒤에(날마다 순서를 돌려요) */
function dpOrder(pids, pickPid, activeSet, dayYmd, foundSet) {
  const f = x => foundSet && foundSet[x] ? 1 : 0, a2 = x => activeSet && activeSet[x] ? 1 : 0;
  return (pids || []).slice().sort((a, b) => (b === pickPid) - (a === pickPid) || f(b) - f(a) || a2(b) - a2(a) || dpHash(dayYmd + '|' + a) - dpHash(dayYmd + '|' + b));
}
/** 구독자 한 지역에서 보여 줄 동: 동을 골랐으면 그 동. 구 전체면 관심 단지가 있는 동 먼저, 그다음 파트너가 있는 동을 날마다 돌아가며 하나 */
function dpAreaDongs(area, partnerKeys, aptDongs, dayYmd) {
  const g = String(area && area.g || ''), dn = String(area && area.dn || '');
  if (dn) { const k = dpKey(g, dn); return partnerKeys.indexOf(k) >= 0 ? [k] : []; }
  const inG = partnerKeys.filter(k => k.slice(0, 6) === g + '|').sort();
  if (!inG.length) return [];
  const first = (aptDongs || []).map(d => dpKey(g, d)).filter((k, i, a) => k && inG.indexOf(k) >= 0 && a.indexOf(k) === i).slice(0, 1);
  const rest = inG.filter(k => first.indexOf(k) < 0);
  const rot = rest.length ? [rest[Math.floor(dpDayMs(dayYmd) / 86400000) % rest.length]] : [];
  return first.concat(rot);
}
/** 주 열쇠: 그 주 월요일 날짜 */
function dpWeek(ymdS) { const ms = dpDayMs(ymdS), wd = new Date(ms + 9 * 3600000).getUTCDay(); return dpYmd(ms - ((wd + 6) % 7) * 86400000); }
/** 이번 주 우수 동네 소식: 지난 7일 공개 글 중 도움돼요 − 신고×3 이 가장 높은 글(도움돼요 1 이상). 시군구마다 하나 + 전체에서 하나 */
function dpBest(posts, weekYmd) {
  const from = dpDayMs(weekYmd) - 7 * 86400000, to = dpDayMs(weekYmd);
  const ok = (posts || []).filter(p => Number(p.at) >= from && Number(p.at) < to && (Number(p.help) || 0) >= 1)
    .map(p => ({ p: p, s: (Number(p.help) || 0) - (Number(p.rep) || 0) * DP_RULE.reportW, t: dpHash(weekYmd + '|' + p.id) }))
    .filter(x => x.s > 0).sort((a, b) => b.s - a.s || a.t - b.t);
  const byG = {};
  ok.forEach(x => { const g = String(x.p.key || '').slice(0, 5); if (g && !byG[g]) byG[g] = x.p.id; });
  return { top: ok.length ? ok[0].p.id : '', byG: byG };
}
/** 공인중개사법 표시 의무(제18조의2, 시행령 제17조의2): 사무소 명칭·소재지·연락처·등록번호·개업공인중개사 성명(소속이면 소속공인중개사 성명도) */
function dpLegal(c) {
  c = c || {};
  const who = c.kind === 'member' ? `대표 ${c.ceo || ''} · 소속공인중개사 ${c.name || ''}` : `대표 ${c.name || ''}`;
  return [c.office || '', c.addr || '', c.tel || '', '등록번호 ' + (c.reg || ''), who];
}
/* DONGNE-CORE END */
const BILLING_OPEN = false;                                           // 토스 자동결제(빌링) 계약 전 — 빌링키 발급·정기 청구 잠금
function dpBillOn() { return BILLING_OPEN && PAID_OPEN; }
const DP_ACTIONS = { dpConfig: 1, dpSlots: 1, dpApply: 1, dpMine: 1, dpWrite: 1, dpPostDel: 1, dpSwap: 1, dpWait: 1, dpMove: 1, dpProfile: 1, dpAdd: 1, dpCancel: 1, dpBillingIssue: 1, dpPlan: 1,
  dpBrief: 1, dpBestGet: 1, dpHelp: 1, dpReport: 1, dpLog: 1, dpInvite: 1, dpAdminQueue: 1, dpAdminAct: 1, dpRulesPut: 1 };
const SH_DP = '동네파트너', SH_DPW = '동네파트너대기', SH_DPP = '동네한마디', SH_DPE = '동네파트너기록', SH_DPA = '동네파트너동의', SH_DPB = '동네파트너결제';
const DPH = ['id', '회원', '상태', '구분', '사무소명', '등록번호', '대표자', '성명', '전화', '이메일', '주소', '시군구', '사무소동', '동목록', '사진', '사진상태', '소개',
  '초대코드', '확인결과', '신청일', '승인일', '창립', '요금제', '결제상태', '카드', '첫결제일', '다음결제일', '만료일', '실패일', '해지예정일',
  '경고', '노출중지', '마지막글', '알림', '메모', '수정일'];
const DPBH = ['시각', '파트너', '주문번호', '금액', '요금제', '결과', '메시지', '결제키'];
/* 결제 상태: 시범(카드 없이 무료 — 빌링 잠금 동안) · 카드대기(신청 뒤 카드 등록 전, 노출 안 함) · 정상 · 재시도(결제 실패, 3일 동안 다시) · 실패(노출 멈춤, 자리 14일) · 해지예정(그달 말까지) */
const DP_PAY = { trial: '시범', card: '카드대기', ok: '정상', retry: '재시도', fail: '실패', bye: '해지예정' };
const DP_PLAN = { m: '월간', y: '연간' };
const DP_CARD_WAIT_H = 24;                                            // 카드대기로 하루가 지나면 신청을 지우고 자리를 비움
const DPWH = ['시각', '동', '파트너', '상태', '안내일'];
const DPPH = ['id', '시각', '파트너', '동', '주제', '내용', '사진', '사진상태', '상태', '이유', '도움', '신고', '수정일'];
const DPEH = ['날짜', '종류', '파트너', '글', '수', '방문자'];
const DPAH = ['시각', '파트너', '회원', '항목', '판', '확인값'];
const DPC = Object.fromEntries(DPH.map((h, i) => [h, i])), DPWC = Object.fromEntries(DPWH.map((h, i) => [h, i])), DPPC = Object.fromEntries(DPPH.map((h, i) => [h, i]));
const DPEC = Object.fromEntries(DPEH.map((h, i) => [h, i]));
const DP_ST = { wait: '검토대기', on: '승인', no: '거절', stop: '노출중지', end: '해지' };
const DP_HOLD = [DP_ST.wait, DP_ST.on, DP_ST.stop];                 // 자리를 차지하는 상태
const DP_PST = { on: '공개', hold: '검토대기', tmp: '임시조치', del: '삭제' };
const DP_TERMS_V = '2026-11-23 초안';                                 // 약관·규칙 판(화면 dongne/terms/ 와 같은 값)
const DP_AGREE = { rules: '글쓰기 규칙', ad: '광고 표시 규칙', privacy: '개인정보 수집·이용', terms: '동네 파트너 약관' };
const DP_PAY_AGREE = '정기 결제(자동결제) 동의';                       // 빌링이 열려 있을 때만 따로 받는 동의
const DP_WHY = { price: '가격 예측', dam: '집값 담합', ad: '매물 홍보', prof: '욕설', defame: '비방', pi: '개인 정보', false: '사실이 아닌 내용', etc: '기타' };
const DP_MSG = {
  price: '앞으로 얼마가 된다는 식의 가격 예측은 쓸 수 없어요.',
  dam: '가격을 맞추자는 식의 글은 쓸 수 없어요. 집값 담합은 법으로 금지돼 있어요(공인중개사법).',
  ad: '매물 홍보·중개 수수료 안내는 이 칸에 쓸 수 없어요. 동네 소식만 적어 주세요.',
  prof: '욕설이나 거친 말은 쓸 수 없어요.',
  defame: '다른 사무소·사람을 깎아내리는 말은 쓸 수 없어요.',
  hold: '운영자가 확인한 뒤 올라가요. 보통 하루 안에 확인해요.'
};
const DP_IMG_MAX = 1500000, DP_REPORT_HIDE = 3, DP_STOP_DAYS = 7, DP_GRACE = 7, DP_POST_MIN = 10;

function dpDispatch(b) {
  try {
    if (b.action === 'dpRulesPut') return dpRulesPut(b);
    if (b.action === 'dpConfig') return dpConfig(b);
    if (b.action === 'dpBestGet') return dpBestGet(b);
    if (b.action === 'dpInvite') return dpInvite(b);
    if (b.action === 'dpSlots') return dpSlots(b);
    if (b.action === 'dpBrief') return dpBrief(b);
    if (b.action === 'dpApply') return dpApply(b);                    // 공공 자료 확인(네트워크)·사진 저장은 잠금 밖, 시트 쓰기만 잠금
    if (b.action === 'dpWrite') return dpWrite(b);
    if (b.action === 'dpBillingIssue') return dpBillingIssue(b);     // 토스 호출(네트워크)은 잠금 밖
    return withLock(() => {
      if (b.action === 'dpMine') return dpMine(b);
      if (b.action === 'dpPostDel') return dpPostDel(b);
      if (b.action === 'dpSwap') return dpSwap(b);
      if (b.action === 'dpWait') return dpWaitJoin(b);
      if (b.action === 'dpMove') return dpMove(b);
      if (b.action === 'dpProfile') return dpProfile(b);
      if (b.action === 'dpAdd') return dpAdd(b);
      if (b.action === 'dpCancel') return dpCancel(b);
      if (b.action === 'dpPlan') return dpPlan(b);
      if (b.action === 'dpHelp') return dpHelp(b);
      if (b.action === 'dpReport') return dpReport(b);
      if (b.action === 'dpLog') return dpLog(b);
      if (b.action === 'dpAdminQueue') return dpAdminQueue(b);
      if (b.action === 'dpAdminAct') return dpAdminAct(b);
      return { ok: false, err: 'unknown' };
    });
  } catch (x) {
    return { ok: false, err: String(x.message || x), code: x.code || '' };
  }
}

/* ---------- 켜짐·운영자 ---------- */
function dpOptUser(b) { try { return b.s ? sessionUser(b.s) : null; } catch (e) { return null; } }
function dpIsAdmin(b) { const u = dpOptUser(b); return !!u && bIsAdmin(u.k); }
function dpGate(b) {
  if (DONGNE_ENABLED || dpIsAdmin(b)) return true;
  const e = new Error('아직 문을 열지 않은 기능이에요.'); e.code = 'closed'; throw e;
}
function dpAdminNeed(b) { if (!dpIsAdmin(b)) { const e = new Error('운영자 계정으로 카카오 간편 로그인해 주세요(모닝 브리핑 운영자 모드).'); e.code = 'admin'; throw e; } }
/** 문 연 날(창립 파트너 기준) — 처음 문을 연 뒤 첫 신청 때 저장. 열기 전(미리 보기)에는 오늘 기준 */
function dpLaunch() {
  const P = PropertiesService.getScriptProperties();
  let v = P.getProperty('DP_LAUNCH');
  if (!v && DONGNE_ENABLED) { v = ymd(new Date()); P.setProperty('DP_LAUNCH', v); }
  return v || ymd(new Date());
}

/* ---------- 시트 ---------- */
function dpSheet(n) { return n === SH_DP ? uSheet(SH_DP, DPH) : n === SH_DPW ? uSheet(SH_DPW, DPWH) : n === SH_DPP ? uSheet(SH_DPP, DPPH) : n === SH_DPE ? uSheet(SH_DPE, DPEH) : n === SH_DPB ? uSheet(SH_DPB, DPBH) : uSheet(SH_DPA, DPAH); }
function dpRows(n) { const sh = book().getSheetByName(n); if (!sh) return []; const v = sh.getDataRange().getValues(), out = []; for (let i = 1; i < v.length; i++) if (v[i][0] !== '' && v[i][0] != null) out.push({ row: i + 1, r: v[i] }); return out; }
function dpUid(k) { return 'p' + hashOf('dpU|' + k).slice(1, 25); }
function dpTxt(v) { return String(v == null ? '' : v).replace(/^'/, ''); }
function dpDay(d) { return d instanceof Date ? ymd(d) : String(d || '').slice(0, 10); }
function dpP(o) {                                                    // 파트너 행 → 쓰기 쉬운 모양
  const r = o.r, x = k => dpTxt(r[DPC[k]]);
  return { row: o.row, id: x('id'), uh: x('회원'), st: x('상태'), kind: x('구분') === '소속' ? 'member' : 'owner', office: x('사무소명'), reg: x('등록번호'),
    ceo: x('대표자'), name: x('성명'), tel: x('전화'), mail: x('이메일'), addr: x('주소'), g: x('시군구'), dn: x('사무소동'),
    keys: (parseJ(x('동목록'), []) || []).filter(s => s && s.k), img: x('사진'), imgSt: x('사진상태'), intro: x('소개'), code: x('초대코드'), chk: x('확인결과'),
    applied: dpDay(r[DPC['신청일']]), approved: dpDay(r[DPC['승인일']]), founding: r[DPC['창립']] === true || x('창립') === 'Y', foundLost: x('창립') === '박탈',
    plan: x('요금제') === DP_PLAN.y ? 'y' : 'm', pay: x('결제상태') || DP_PAY.trial, card: x('카드'), first: dpDay(r[DPC['첫결제일']]), next: dpDay(r[DPC['다음결제일']]),
    until: dpDay(r[DPC['만료일']]), failAt: dpDay(r[DPC['실패일']]), endAt: dpDay(r[DPC['해지예정일']]), made: r[DPC['신청일']] instanceof Date ? r[DPC['신청일']].getTime() : 0, warn: Number(r[DPC['경고']]) || 0, stopUntil: dpDay(r[DPC['노출중지']]), last: dpDay(r[DPC['마지막글']]), notes: x('알림') };
}
function dpAll() { return dpRows(SH_DP).map(dpP); }
function dpSet(row, h, v) { dpSheet(SH_DP).getRange(row, DPC[h] + 1).setValue(typeof v === 'string' ? cellSafe(v) : v); }
function dpMeOf(u, all) { const uh = dpUid(u.k); return (all || dpAll()).filter(p => p.uh === uh && p.st !== DP_ST.end && p.st !== DP_ST.no).pop() || null; }
/** 노출 가능: 승인 + 노출 중지 기간이 아님 + 카드 등록을 마쳤고 결제가 멈추지 않음 + 해지 예정일 전 */
function dpLive(p, today) {
  today = today || ymd(new Date());
  return p.st === DP_ST.on && !(p.stopUntil && today <= p.stopUntil) && p.pay !== DP_PAY.card && p.pay !== DP_PAY.fail && !(p.endAt && today > p.endAt);
}
/** 창립 파트너 혜택이 지금 살아 있는지: 창립(박탈 아님) + 노출 중 + 결제가 끊기지 않음(시범·정상·해지 예정 말일까지) */
function dpFoundOn(p, today) { return !!p.founding && !p.foundLost && dpLive(p, today) && [DP_PAY.trial, DP_PAY.ok, DP_PAY.bye].indexOf(p.pay) >= 0; }
function dpCap() { return dpBillOn() ? DP_RULE.max : DP_RULE.incl; }
/** 묶음 혜택: 기존 중개사 제휴(검색 결과 노출) 승인·기간 안 사무소인지(같은 등록번호). 설정 DP_RULE.bundleMode 가 'off' 면 늘 false */
function dpAffiliate(p) {
  if (DP_RULE.bundleMode === 'off') return false;
  try { const rn = dpRegNorm(p.reg); return agents().some(a => isActive(a) && dpRegNorm(a.reg) === rn); } catch (e) { return false; }
}
function dpPriceOf(p, n, plan, t) { return dpPrice(n == null ? p.keys.length : n, { plan: plan || p.plan, founding: dpFoundOn(p, t) || (p.founding && !p.foundLost && p.pay !== DP_PAY.fail), affiliate: dpAffiliate(p) }); }
function dpHolds(p) { return DP_HOLD.indexOf(p.st) >= 0; }
function dpTaken(all, exceptId) { const m = {}; all.filter(p => dpHolds(p) && p.id !== exceptId).forEach(p => p.keys.forEach(s => { m[s.k] = (m[s.k] || 0) + 1; })); return m; }
function dpWaits() { return dpRows(SH_DPW).filter(o => String(o.r[DPWC['상태']]) === '대기'); }

/* ---------- 비공개 거르기 설정(엔진 → 스크립트 속성) ---------- */
function dpRules() {
  const c = CacheService.getScriptCache(), hit = c.get('dprules');
  if (hit) return hit === '-' ? null : parseJ(hit, null);
  const P = PropertiesService.getScriptProperties(), n = Number(P.getProperty('DP_RULES_N')) || 0;
  let js = ''; for (let i = 0; i < n; i++) js += P.getProperty('DP_RULES_' + i) || '';
  const r = js ? parseJ(js, null) : null;
  try { c.put('dprules', r ? js : '-', 300); } catch (e) {}
  return r;
}
function dpRulesPut(b) {
  if (!pullOk(b)) return { ok: false, err: 'auth' };
  const r = b.rules && typeof b.rules === 'object' ? b.rules : null;
  if (!r || !Array.isArray(r.groups)) return { ok: false, err: 'rules' };
  let n = 0;
  for (const g of r.groups) {
    if (!g || !/^[a-z]{2,10}$/.test(String(g.id || '')) || ['block', 'hold'].indexOf(g.act) < 0 || !Array.isArray(g.re)) return { ok: false, err: 'group' };
    for (const s of g.re) { try { new RegExp(String(s), 'i'); n++; } catch (e) { return { ok: false, err: 'regex ' + g.id }; } }
  }
  const js = JSON.stringify(r);
  if (js.length > CM_CHUNK * 20) return { ok: false, err: 'too big' };
  const P = PropertiesService.getScriptProperties(), old = Number(P.getProperty('DP_RULES_N')) || 0, parts = Math.ceil(js.length / CM_CHUNK);
  for (let i = 0; i < parts; i++) P.setProperty('DP_RULES_' + i, js.slice(i * CM_CHUNK, (i + 1) * CM_CHUNK));
  for (let i = parts; i < old; i++) { try { P.deleteProperty('DP_RULES_' + i); } catch (e) {} }
  P.setProperty('DP_RULES_N', String(parts));
  try { CacheService.getScriptCache().remove('dprules'); } catch (e) {}
  return { ok: true, n: n, parts: parts };
}
/** 글 거르기 → { act: ok|hold|block, why, msg }. 전화·주소·이메일은 살아보니와 같은 기본 거르기, 나머지는 비공개 설정 */
function dpCheck(text) {
  const x = cmCheck(text, { rules: dpRules() });
  if (x.act === 'block' && DP_MSG[x.why]) x.msg = DP_MSG[x.why];
  if (x.act === 'hold') x.msg = DP_MSG.hold;
  return x;
}

/* ---------- 공공 자료로 중개사무소 확인 ---------- */
function dpNorm(s) { return String(s || '').replace(/\(주\)|주식회사|공인중개사사무소|공인중개사|중개사무소|부동산중개|부동산|중개법인|[\s()\-·.,]/g, '').toLowerCase(); }
function dpRegNorm(s) { return String(s || '').replace(/[^0-9A-Za-z가-힣]/g, ''); }
function dpGetJson(url) {
  const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (r.getResponseCode() !== 200) return { http: r.getResponseCode() };
  try { return JSON.parse(r.getContentText()); } catch (e) { return { bad: String(r.getContentText()).slice(0, 80) }; }
}
function dpKeyParam(k) { k = String(k || '').trim(); return /%[0-9A-Fa-f]{2}/.test(k) ? k : encodeURIComponent(k); }
/** 등록번호로 찾아서 맞춰 보기. 돌려줌 { st: 'match'|'mismatch'|'notfound'|'closed'|'unknown', why, src } — 'match' 만 바로 승인 */
function dpVerify(a) {
  const P = PropertiesService.getScriptProperties(), key = P.getProperty('DATA_GO_KR_KEY'), vw = P.getProperty('VWORLD_KEY');
  if (!key) return { st: 'unknown', why: '자동 확인 키(DATA_GO_KR_KEY)가 아직 없어요', src: '' };
  let items = [];
  try {
    const j = dpGetJson('https://api.data.go.kr/openapi/tn_pubr_public_med_office_api?serviceKey=' + dpKeyParam(key) + '&pageNo=1&numOfRows=20&type=json&estblRegNo=' + encodeURIComponent(a.reg));
    const h = j && j.response && j.response.header, body = j && j.response && j.response.body;
    if (!h) return { st: 'unknown', why: '공공 자료 응답을 읽지 못했어요(' + (j && j.http ? 'http ' + j.http : '형식') + ')', src: 'std' };
    if (String(h.resultCode) !== '00' && String(h.resultCode) !== '03') return { st: 'unknown', why: '공공 자료 오류 ' + String(h.resultCode) + ' ' + String(h.resultMsg || '').slice(0, 40), src: 'std' };
    const it = body && body.items; items = Array.isArray(it) ? it : it && Array.isArray(it.item) ? it.item : it && it.item ? [it.item] : [];
  } catch (e) { return { st: 'unknown', why: '공공 자료에 연결하지 못했어요', src: 'std' }; }
  const want = dpRegNorm(a.reg);
  const hit = items.filter(x => dpRegNorm(x.estblRegNo) === want);
  if (!hit.length) return { st: 'notfound', why: '등록번호를 공공 자료에서 찾지 못했어요(자료는 한 달에 한 번 바뀌어 새로 연 사무소는 늦게 보일 수 있어요)', src: 'std' };
  const x = hit[0], on = dpNorm(a.office), xn = dpNorm(x.medOfficeNm);
  const nameOk = !!on && !!xn && (on === xn || on.indexOf(xn) >= 0 || xn.indexOf(on) >= 0);
  const ceoOk = String(x.rprsvNm || '').replace(/\s/g, '') === String(a.kind === 'member' ? a.ceo : a.name).replace(/\s/g, '');
  const addr = String(x.lctnRoadNmAddr || '') + ' ' + String(x.lctnLotnoAddr || ''), gn = String(a.gn || '').split(' ').pop();
  const addrOk = !gn || addr.indexOf(gn) >= 0;
  const bad = [nameOk ? '' : '사무소 이름', ceoOk ? '' : '대표자 성명', addrOk ? '' : '소재지(시·군·구)'].filter(Boolean);
  if (bad.length) return { st: 'mismatch', why: '공공 자료와 다른 칸: ' + bad.join(', '), src: 'std' };
  if (vw) {                                                           // 선택: 휴업·폐업 확인(브이월드 부동산중개업 API)
    try {
      const host = WEB_ROOT.replace(/^https:\/\//, '').split('/')[0];
      const j = dpGetJson('https://api.vworld.kr/ned/data/getEBOfficeInfo?key=' + encodeURIComponent(vw) + '&domain=' + encodeURIComponent(host) + '&format=json&numOfRows=10&pageNo=1&jurirno=' + encodeURIComponent(a.reg));
      const f = j && (j.EDOffices || j.EBOffices || j.response) ? ((j.EDOffices || j.EBOffices || {}).field || []) : [];
      const row = (Array.isArray(f) ? f : [f]).find(y => y && dpRegNorm(y.jurirno) === want);
      const sv = row ? String(row.sttusSeCodeNm || row.sttusSeCode || '') : '';
      if (sv && !/영업/.test(sv)) return { st: 'closed', why: '영업 상태가 ' + sv + '(으)로 나와요', src: 'vworld' };
    } catch (e) {}
  }
  return { st: 'match', why: '공공 자료와 사무소 이름·대표자·소재지가 맞아요(' + String(x.crtrYmd || '').slice(0, 10) + ' 기준)', src: 'std' };
}

/* ---------- 법정동 가운데 점(이웃 동 확인) ---------- */
function dpSidoSet(sd) { return ['11', '28', '41'].indexOf(sd) >= 0 ? ['11', '28', '41'] : [sd]; }
function dpPts(sd) {
  const c = CacheService.getScriptCache(), ck = 'dpPts|' + sd, hit = c.get(ck);
  if (hit) return parseJ(hit, {});
  let rows = {};
  dpSidoSet(sd).forEach(s => { const j = bFetchJson(WEB_ROOT + 'assets/dong/' + s + '.json'); if (j && j.rows) Object.assign(rows, j.rows); });
  try { c.put(ck, JSON.stringify(rows), 21600); } catch (e) {}
  return rows;
}
/** 사무소 동에서 고를 수 있는 이웃 동 목록(가까운 8곳). 가운데 점 자료를 못 받으면 같은 시·군·구 안이면 받아 줌(운영자가 나중에 볼 수 있게 표시) */
function dpNearOk(officeKey, key) {
  if (key === officeKey) return true;
  const pts = dpPts(officeKey.slice(0, 2));
  if (!pts || !pts[officeKey]) return key.slice(0, 5) === officeKey.slice(0, 5);
  return dpNear(officeKey, pts, DP_RULE.nearK).some(x => x.key === key);
}

/* ---------- 사진(드라이브) ---------- */
function dpFolder() {
  const P = PropertiesService.getScriptProperties(); let f = null; const id = P.getProperty('DP_PHOTO_FOLDER');
  try { f = id ? DriveApp.getFolderById(id) : null; } catch (e) { f = null; }
  if (!f) { f = DriveApp.createFolder(SITE_NAME + ' 동네 파트너 사진'); P.setProperty('DP_PHOTO_FOLDER', f.getId()); }   // 공유 없음 — 운영자가 확인한 사진만 파일마다 링크 공개
  return f;
}
function dpSavePhoto(img, prefix) {
  if (!img) return '';
  const m = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(String(img));
  if (!m) throw new Error('사진 파일(JPG·PNG)만 올릴 수 있어요.');
  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > DP_IMG_MAX) throw new Error('사진이 너무 커요. 조금 작게 해서 올려 주세요.');
  if (bytes.length < 1000) throw new Error('사진을 읽지 못했어요. 다시 골라 주세요.');
  const id = prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase();
  return dpFolder().createFile(Utilities.newBlob(bytes, 'image/' + m[1], id + (m[1] === 'png' ? '.png' : '.jpg'))).getId();
}
function dpShare(fid) { try { DriveApp.getFileById(String(fid)).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); return true; } catch (e) { return false; } }
function dpImgUrl(fid, st) { return fid && st === '공개' ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fid) + '&sz=w480' : ''; }

/* ---------- 공개 정보 ---------- */
function dpCard(p, today) {
  return { id: p.id, office: p.office, addr: p.addr, tel: p.tel, reg: p.reg, name: p.name, ceo: p.ceo, kind: p.kind, intro: p.intro, dn: p.dn, g: p.g,
    img: dpImgUrl(p.img, p.imgSt), live: dpLive(p, today), found: dpFoundOn(p, today) };
}
function dpConfig(b) {
  const admin = dpIsAdmin(b), open = DONGNE_ENABLED;
  if (!open && !admin) return { ok: true, open: false };
  const launch = dpLaunch(), t = ymd(new Date());
  return { ok: true, open: open, preview: !open, admin: admin, paid: PAID_OPEN, billing: dpBillOn(), rule: DP_RULE, topics: DP_TOPICS, terms: DP_TERMS_V, agree: DP_AGREE,
    launch: launch, founding: dpFounding(launch, t) || !open, foundingUntil: dpAddMonths(launch, DP_RULE.foundMonths), firstCharge: dpFirstCharge(t),
    clientKey: dpBillOn() ? String(PropertiesService.getScriptProperties().getProperty('TOSS_BILLING_CLIENT_KEY') || '') : '', plusPrice: (BRIEF_PRICE.brief_pro_plus || {}).amount || DP_RULE.base };
}
/** 동마다 자리(3자리 중 찬 수·대기 수) */
function dpSlots(b) {
  dpGate(b);
  const keys = (Array.isArray(b.keys) ? b.keys : []).slice(0, 40).map(String).filter(k => /^\d{5}\|[가-힣0-9·.]{1,20}$/.test(k));
  const all = dpAll(), taken = dpTaken(all, ''), waits = dpWaits(), out = {};
  keys.forEach(k => { out[k] = { used: taken[k] || 0, free: Math.max(0, DP_RULE.slots - (taken[k] || 0)), wait: waits.filter(o => String(o.r[DPWC['동']]) === k).length }; });
  return { ok: true, slots: out, max: DP_RULE.slots };
}

/* ---------- 신청 ---------- */
function dpClean(b) {
  const kind = b.kind === 'member' ? 'member' : 'owner';
  const a = { kind: kind, office: uText(b.office, 40), reg: uText(b.reg, 30), name: uText(b.name, 20), ceo: kind === 'member' ? uText(b.ceo, 20) : uText(b.name, 20),
    tel: uText(b.tel, 20), mail: uText(b.mail, 80).toLowerCase(), addr: uText(b.addr, 120), g: String(b.g || ''), gn: uText(b.gn, 30), dn: uText(b.dn, 20), intro: uText(b.intro, 40).replace(/\s+/g, ' ') };
  if (!a.office) throw new Error('사무소 이름을 적어 주세요.');
  const rn = bBrokerNo(a.reg); if (!rn.ok) throw new Error(rn.err); a.reg = rn.norm;
  if (!a.name) throw new Error('성명을 적어 주세요.');
  if (kind === 'member' && !a.ceo) throw new Error('소속공인중개사는 대표(개업공인중개사) 성명도 적어 주세요. 광고에 함께 보여야 해요(공인중개사법).');
  const ph = a.tel.replace(/[^0-9]/g, '');
  if (!/^0\d{8,10}$/.test(ph)) throw new Error('사무소 전화번호를 다시 확인해 주세요. 예: 02-1234-5678');
  a.tel = ph.length === 8 ? ph : ph.replace(/^(02)(\d{3,4})(\d{4})$/, '$1-$2-$3').replace(/^(0\d{2})(\d{3,4})(\d{4})$/, '$1-$2-$3');
  if (!/^[a-z0-9._%+-]{1,64}@[a-z0-9.-]+\.[a-z]{2,}$/.test(a.mail)) throw new Error('알림을 받을 이메일 주소를 다시 확인해 주세요.');
  if (!a.addr || a.addr.length < 6) throw new Error('사무소 주소를 적어 주세요.');
  a.key = dpKey(a.g, a.dn);
  if (!a.key) throw new Error('사무소 동을 골라 주세요. [주소 찾기]를 누르면 저절로 골라져요.');
  if (a.intro) { const c = dpCheck(a.intro); if (c.act === 'block') throw new Error('한 줄 소개: ' + c.msg); }
  return a;
}
function dpAgreeOk(b) {
  const ag = b.agree && typeof b.agree === 'object' ? b.agree : {};
  const miss = Object.keys(DP_AGREE).filter(k => ag[k] !== true);
  if (miss.length) throw new Error(miss.map(k => DP_AGREE[k]).join('·') + '에 동의해 주세요.');
  if (String(b.v || '') !== DP_TERMS_V) { const e = new Error('약관이 바뀌었어요. 화면을 새로 고친 뒤 다시 동의해 주세요.'); e.code = 'terms'; throw e; }
}
function dpAgreeLog(pid, uh, payText) {
  const sh = dpSheet(SH_DPA), now = new Date();
  Object.keys(DP_AGREE).forEach(k => sh.appendRow([now, pid, uh, DP_AGREE[k], DP_TERMS_V, hashOf('dpag|' + pid + '|' + k + '|' + DP_TERMS_V + '|' + now.getTime()).slice(0, 17)]));
  if (payText) sh.appendRow([now, pid, uh, DP_PAY_AGREE + ': ' + payText, DP_TERMS_V, hashOf('dpag|' + pid + '|pay|' + payText + '|' + now.getTime()).slice(0, 17)]);
}
/** 자동 결제 안내 문장(가입 화면에 크게 보이는 글과 같은 글을 동의 기록에 남김) */
function dpPayText(pr, firstYmd) {
  const plan = pr.plan, d = String(firstYmd).split('-');
  return `${+d[1]}월 ${+d[2]}일부터 ${plan === 'y' ? '매년' : '매월'} ${pr.total.toLocaleString()}원이 자동 결제돼요`;
}
function dpApply(b) {
  dpGate(b);
  const u = sessionUser(b.s), uh = dpUid(u.k);
  dpAgreeOk(b);
  const a = dpClean(b);
  const picks = (Array.isArray(b.picks) ? b.picks : []).map(String).filter((k, i, x) => /^\d{5}\|[가-힣0-9·.]{1,20}$/.test(k) && k !== a.key && x.indexOf(k) === i);
  const cap = dpCap(), bill = dpBillOn(), plan = b.plan === 'y' ? 'y' : 'm';
  if (picks.length + 1 > cap) throw new Error(bill ? `동은 사무소 동을 합쳐 ${DP_RULE.max}개까지 고를 수 있어요.` : `지금은 시범 운영이라 사무소 동을 합쳐 ${DP_RULE.incl}개 동까지 고를 수 있어요. 동 추가(월 ${DP_RULE.extra.toLocaleString()}원)는 정식 결제가 열리면 할 수 있어요.`);
  const far = picks.filter(k => !dpNearOk(a.key, k));
  if (far.length) throw new Error('사무소 동과 가까운 동만 고를 수 있어요: ' + far.map(k => dpSplit(k).dn).join(', '));
  const launch = dpLaunch(), t = ymd(new Date());
  const hist = dpHistory(dpAll(), dpUid(u.k), a.reg, t);              // 예전 기록: 박탈·중대 위반이면 창립 혜택 없음 + 운영자 확인
  const founding = hist.carry || (!hist.lost && !hist.any && (dpFounding(launch, t) || !DONGNE_ENABLED));
  const first = dpFirstCharge(t), payText = bill ? dpPayText(dpPrice(picks.length + 1, { plan: plan, founding: founding, affiliate: dpAffiliate({ reg: a.reg }) }), first) : '';
  if (bill && (!b.agree || b.agree.pay !== true)) throw new Error(`정기 결제 동의에 따로 체크해 주세요. (${payText})`);
  const vr0 = dpVerify(a), vr = hist.ban ? { st: 'review', why: '예전에 중대 위반으로 해지된 기록이 있어요 — 운영자 확인 필요 · ' + vr0.why } : vr0;                                             // 잠금 밖(네트워크)
  let photo = ''; try { photo = dpSavePhoto(b.photo, 'DPI'); } catch (e) { throw e; }
  return withLock(() => {
    const all = dpAll();
    if (dpMeOf(u, all)) throw new Error('이미 신청했어요. 내 파트너 화면에서 확인해 주세요.');
    if (all.some(p => dpHolds(p) && p.kind === a.kind && dpRegNorm(p.reg) === dpRegNorm(a.reg) && (a.kind === 'owner' || p.name === a.name))) throw new Error('이 등록번호로 이미 신청된 파트너가 있어요. 확인이 필요하면 카카오톡 상담으로 알려 주세요.');
    const taken = dpTaken(all, ''), want = [a.key].concat(picks);
    const got = want.filter(k => (taken[k] || 0) < DP_RULE.slots), wait = want.filter(k => got.indexOf(k) < 0);
    const auto = vr.st === 'match';
    const id = 'D' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase(), code = 'P' + Utilities.getUuid().replace(/-/g, '').slice(0, 7).toUpperCase();
    const r = [];
    r[DPC['id']] = id; r[DPC['회원']] = uh; r[DPC['상태']] = auto ? DP_ST.on : DP_ST.wait; r[DPC['구분']] = a.kind === 'member' ? '소속' : '개업';
    r[DPC['사무소명']] = cellSafe(a.office); r[DPC['등록번호']] = cellSafe(a.reg); r[DPC['대표자']] = cellSafe(a.ceo); r[DPC['성명']] = cellSafe(a.name);
    r[DPC['전화']] = cellSafe(a.tel); r[DPC['이메일']] = cellSafe(a.mail); r[DPC['주소']] = cellSafe(a.addr); r[DPC['시군구']] = a.g; r[DPC['사무소동']] = a.dn;
    r[DPC['동목록']] = JSON.stringify(got.map(k => ({ k: k, at: t, sw: '' }))); r[DPC['사진']] = photo; r[DPC['사진상태']] = photo ? '확인대기' : '';
    r[DPC['소개']] = cellSafe(a.intro); r[DPC['초대코드']] = code; r[DPC['확인결과']] = cellSafe(vr.st + ' · ' + vr.why);
    r[DPC['신청일']] = new Date(); r[DPC['승인일']] = auto ? new Date() : ''; r[DPC['창립']] = founding ? 'Y' : '';
    r[DPC['요금제']] = DP_PLAN[plan]; r[DPC['결제상태']] = bill ? DP_PAY.card : DP_PAY.trial; r[DPC['경고']] = 0;
    ['카드', '첫결제일', '다음결제일', '만료일', '실패일', '해지예정일', '노출중지', '마지막글', '알림', '메모'].forEach(h => r[DPC[h]] = '');
    r[DPC['수정일']] = new Date();
    dpSheet(SH_DP).appendRow(DPH.map((h, i) => r[i] === undefined ? '' : r[i]));
    const ws = dpSheet(SH_DPW); wait.forEach(k => ws.appendRow([new Date(), k, id, '대기', '']));
    dpAgreeLog(id, uh, payText);
    let ck = '';
    if (bill) { ck = Utilities.getUuid() + '_' + id; dpBkPut(id, { ck: ck, bk: '' }); }   // 고객키(토스 규칙: 22자 이상·특수문자 포함·짐작할 수 없는 값)는 스크립트 속성에만
    if (!bill) dpMailTo(a.mail, auto ? `[${SITE_NAME}] 동네 파트너 승인됐어요` : `[${SITE_NAME}] 동네 파트너 신청을 받았어요`,
      (auto ? `${a.office} 동네 파트너 신청이 공공 자료로 바로 확인돼서 승인됐어요.` : `${a.office} 동네 파트너 신청을 받았어요. 확인이 필요해서 2영업일 안에 결과를 알려 드려요.`)
      + `<br>받은 동: ${got.map(k => bEsc(dpSplit(k).dn)).join(', ') || '없음'}${wait.length ? `<br>자리가 차서 대기한 동: ${wait.map(k => bEsc(dpSplit(k).dn)).join(', ')} (자리가 나면 메일로 알려 드려요)` : ''}`
      + `<br>지금은 시범 파트너라서 카드 등록 없이 무료예요. 정식 결제가 열리면 미리 알려 드리고, 카드를 등록하고 따로 동의하신 경우에만 결제돼요.`
      + (founding ? '<br>창립 파트너예요. 구독을 이어 가는 동안 창립 파트너 표시와 같은 동 안 우선 노출, 추가 동 20% 할인을 드려요.' : '') + `<br><a href="${WEB_ROOT}dongne/my/">내 파트너 화면 열기</a>`);
    if (!auto || photo) dpNotify('apply', auto ? '새 동네 파트너(사진 확인 필요)' : '동네 파트너 검토 대기');
    return { ok: true, id: id, st: auto ? DP_ST.on : DP_ST.wait, auto: auto, got: got, wait: wait, founding: founding, pay: bill ? DP_PAY.card : DP_PAY.trial,
      ck: ck, first: bill ? first : '', payText: payText, plan: plan };
  });
}

/* ---------- 내 파트너 화면 ---------- */
function dpStatsFor(pid) {
  const now = Date.now(), m30 = ymd(new Date(now - 30 * 86400000)), s = { imp: 0, click: 0, help: 0, sub: 0, imp30: 0, click30: 0, help30: 0, sub30: 0 };
  dpRows(SH_DPE).forEach(o => {
    if (String(o.r[DPEC['파트너']]) !== pid) return;
    const t = String(o.r[DPEC['종류']]), n = Number(o.r[DPEC['수']]) || 1, d = dpDay(o.r[DPEC['날짜']]);
    const k = t === 'imp' ? 'imp' : t === 'call' || t === 'web' ? 'click' : t === 'help' ? 'help' : t === 'sub' ? 'sub' : '';
    if (!k) return; s[k] += n; if (d >= m30) s[k + '30'] += n;
  });
  return s;
}
function dpMine(b) {
  dpGate(b);
  const u = sessionUser(b.s), all = dpAll(), me = dpMeOf(u, all);
  const cfg = dpConfig(b);
  if (!me) return { ok: true, me: null, cfg: cfg };
  const taken = dpTaken(all, ''), waits = dpWaits(), t = ymd(new Date());
  const myWaits = waits.filter(o => String(o.r[DPWC['파트너']]) === me.id).map(o => String(o.r[DPWC['동']]));
  const posts = dpRows(SH_DPP).filter(o => String(o.r[DPPC['파트너']]) === me.id && String(o.r[DPPC['상태']]) !== DP_PST.del).reverse().slice(0, 20).map(o => dpPostPub(o, true));
  const pr = dpPriceOf(me, null, null, t);
  return { ok: true, cfg: cfg, me: Object.assign(dpCard(me, t), { st: me.st, chk: me.st === DP_ST.wait ? '확인 중이에요. 2영업일 안에 알려 드려요.' : '', mail: me.mail,
    keys: me.keys.map((s, i) => ({ k: s.k, dn: dpSplit(s.k).dn, office: i === 0 && s.k === dpKey(me.g, me.dn), at: s.at, sw: s.sw, swap: dpSwapOk(s.sw, t), used: taken[s.k] || 0 })),
    waits: myWaits, code: me.code, founding: me.founding && !me.foundLost, foundOn: dpFoundOn(me, t), plan: me.plan, pay: me.pay, card: me.card, first: me.first, next: me.next, until: me.until, failAt: me.failAt, endAt: me.endAt,
    ck: me.pay === DP_PAY.card || me.pay === DP_PAY.retry || me.pay === DP_PAY.fail ? (dpBkGet(me.id) || {}).ck || '' : '',
    payText: me.next && [DP_PAY.ok, DP_PAY.retry].indexOf(me.pay) >= 0 ? dpPayText(pr, me.next) : '', warn: me.warn, stopUntil: me.stopUntil, last: me.last,
    idle: !me.last || (Date.now() - dpDayMs(me.last)) / 86400000 >= DP_RULE.idleDays, imgSt: me.imgSt, price: pr, applied: me.applied }),
    stats: dpStatsFor(me.id), posts: posts, today: t, nextBrief: dpBriefDay(Date.now()) };
}
function dpPostPub(o, mine) {
  const r = o.r, img = dpTxt(r[DPPC['사진']]), ist = dpTxt(r[DPPC['사진상태']]);
  const x = { id: dpTxt(r[DPPC['id']]), at: r[DPPC['시각']] instanceof Date ? r[DPPC['시각']].getTime() : Number(new Date(r[DPPC['시각']])) || 0, pid: dpTxt(r[DPPC['파트너']]),
    key: dpTxt(r[DPPC['동']]), topic: dpTxt(r[DPPC['주제']]), tn: dpTopicName(dpTxt(r[DPPC['주제']])), text: dpTxt(r[DPPC['내용']]), img: dpImgUrl(img, ist),
    help: Number(r[DPPC['도움']]) || 0, rep: Number(r[DPPC['신고']]) || 0 };
  x.day = dpBriefDay(x.at);
  if (mine) { x.st = dpTxt(r[DPPC['상태']]); x.imgSt = img ? ist : ''; x.why = x.st === DP_PST.on ? '' : dpTxt(r[DPPC['이유']]); }
  return x;
}

/* ---------- 이번 주 우리 동네 한마디 ---------- */
function dpWrite(b) {
  dpGate(b);
  const u = sessionUser(b.s);
  const topic = dpTopicName(b.topic) ? String(b.topic) : '';
  if (!topic) throw new Error('주제를 골라 주세요.');
  const text = uText(b.text, DP_RULE.textMax + 20).replace(/\s+/g, ' ');
  if (text.length < DP_POST_MIN) throw new Error(`${DP_POST_MIN}글자 이상 적어 주세요.`);
  if (text.length > DP_RULE.textMax) throw new Error(`${DP_RULE.textMax}글자까지 쓸 수 있어요.`);
  const chk = dpCheck(text);
  if (chk.act === 'block') { const e = new Error(chk.msg); e.code = 'filter'; throw e; }
  const photo = b.photo ? dpSavePhoto(b.photo, 'DPP') : '';           // 잠금 밖
  return withLock(() => {
    const all = dpAll(), me = dpMeOf(u, all), t = ymd(new Date());
    if (!me) throw new Error('파트너 신청을 먼저 해 주세요.');
    if (me.st === DP_ST.wait) throw new Error('승인된 뒤에 쓸 수 있어요. 보통 바로 승인돼요. 확인이 필요하면 2영업일 안에 알려 드려요.');
    if (!dpLive(me, t)) throw new Error(me.stopUntil && t <= me.stopUntil ? `${me.stopUntil}까지 노출이 멈춰 있어서 쓸 수 없어요.` : '이용 기간이 끝나서 쓸 수 없어요.');
    const key = b.key && me.keys.some(s => s.k === String(b.key)) ? String(b.key) : (me.keys[0] || {}).k;
    if (!key) throw new Error('받은 동이 없어서 쓸 수 없어요. 자리가 나면 메일로 알려 드려요.');
    const today = dpRows(SH_DPP).filter(o => String(o.r[DPPC['파트너']]) === me.id && String(o.r[DPPC['상태']]) !== DP_PST.del && dpDay(o.r[DPPC['시각']]) === t);
    if (today.length) throw new Error('하루에 한 개만 쓸 수 있어요. 오늘 쓴 글을 지우고 다시 쓰거나 내일 써 주세요.');
    const id = 'N' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase(), st = chk.act === 'hold' ? DP_PST.hold : DP_PST.on;
    dpSheet(SH_DPP).appendRow([id, new Date(), me.id, key, topic, cellSafe(text), photo, photo ? '확인대기' : '', st, chk.why || '', 0, 0, '']);
    dpSet(me.row, '마지막글', ymd(new Date()));
    if (st === DP_PST.hold || photo) dpNotify('post', st === DP_PST.hold ? '확인할 동네 한마디가 있어요' : '동네 한마디 사진 확인');
    return { ok: true, id: id, st: st, held: st === DP_PST.hold, msg: st === DP_PST.hold ? DP_MSG.hold : '', day: dpBriefDay(Date.now()), photoWait: !!photo };
  });
}
function dpPostDel(b) {
  const u = sessionUser(b.s), me = dpMeOf(u); if (!me) throw new Error('파트너 정보를 찾지 못했어요.');
  const o = dpRows(SH_DPP).find(x => String(x.r[DPPC['id']]) === String(b.id) && String(x.r[DPPC['파트너']]) === me.id);
  if (!o) throw new Error('글을 찾지 못했어요.');
  dpErasePost(o, '본인 삭제');
  return { ok: true };
}
function dpErasePost(o, why) {
  const sh = dpSheet(SH_DPP);
  const fid = dpTxt(o.r[DPPC['사진']]); if (fid) cmTrash(fid);
  sh.getRange(o.row, DPPC['내용'] + 1).setValue(''); sh.getRange(o.row, DPPC['사진'] + 1).setValue(''); sh.getRange(o.row, DPPC['사진상태'] + 1).setValue('');
  sh.getRange(o.row, DPPC['상태'] + 1).setValue(DP_PST.del); sh.getRange(o.row, DPPC['이유'] + 1).setValue(why + ' ' + ymd(new Date())); sh.getRange(o.row, DPPC['수정일'] + 1).setValue(new Date());
  dpPickReset();
}

/* ---------- 동 바꾸기·대기·소재지 변경·정보 고치기·그만두기 ---------- */
function dpSwap(b) {
  dpGate(b);
  const u = sessionUser(b.s), all = dpAll(), me = dpMeOf(u, all), t = ymd(new Date());
  if (!me || !dpHolds(me)) throw new Error('파트너 정보를 찾지 못했어요.');
  const from = String(b.from || ''), to = String(b.to || ''), i = me.keys.findIndex(s => s.k === from);
  if (i < 0) throw new Error('바꿀 동을 다시 골라 주세요.');
  const officeKey = dpKey(me.g, me.dn);
  if (from === officeKey) throw new Error('사무소가 있는 동은 바꿀 수 없어요. 사무소를 옮겼다면 [사무소 주소 바꾸기]를 눌러 주세요.');
  if (!/^\d{5}\|[가-힣0-9·.]{1,20}$/.test(to) || me.keys.some(s => s.k === to)) throw new Error('새 동을 다시 골라 주세요.');
  if (!dpNearOk(officeKey, to)) throw new Error('사무소 동과 가까운 동으로만 바꿀 수 있어요.');
  const sw = dpSwapOk(me.keys[i].sw, t);
  if (!sw.ok) throw new Error(`같은 자리는 30일에 한 번만 바꿀 수 있어요. ${sw.wait}일 뒤에 바꿀 수 있어요.`);
  if ((dpTaken(all, me.id)[to] || 0) >= DP_RULE.slots) throw new Error('그 동은 자리가 다 찼어요. [대기 걸기]를 누르면 자리가 날 때 메일로 알려 드려요.');
  const keys = me.keys.slice(); keys[i] = { k: to, at: t, sw: t };
  dpSet(me.row, '동목록', JSON.stringify(keys)); dpSet(me.row, '수정일', new Date());
  dpWaitDrop(me.id, to);
  dpRelease(from, me.id);
  dpPickReset();
  return { ok: true, keys: keys };
}
function dpWaitJoin(b) {
  dpGate(b);
  const u = sessionUser(b.s), me = dpMeOf(u); if (!me || !dpHolds(me)) throw new Error('파트너 정보를 찾지 못했어요.');
  const k = String(b.key || '');
  if (!/^\d{5}\|[가-힣0-9·.]{1,20}$/.test(k) || me.keys.some(s => s.k === k)) throw new Error('대기할 동을 다시 골라 주세요.');
  if (!dpNearOk(dpKey(me.g, me.dn), k)) throw new Error('사무소 동과 가까운 동만 대기할 수 있어요.');
  if (b.off) { dpWaitDrop(me.id, k); return { ok: true, off: true }; }
  if (dpWaits().some(o => String(o.r[DPWC['파트너']]) === me.id && String(o.r[DPWC['동']]) === k)) return { ok: true, already: true };
  dpSheet(SH_DPW).appendRow([new Date(), k, me.id, '대기', '']);
  const n = dpWaits().filter(o => String(o.r[DPWC['동']]) === k).findIndex(o => String(o.r[DPWC['파트너']]) === me.id) + 1;
  return { ok: true, n: n };
}
function dpWaitDrop(pid, k) { dpWaits().forEach(o => { if (String(o.r[DPWC['파트너']]) === pid && (!k || String(o.r[DPWC['동']]) === k)) dpSheet(SH_DPW).getRange(o.row, DPWC['상태'] + 1).setValue('취소'); }); }
/** 자리 하나가 비면: 대기 1번(아직 자리를 더 받을 수 있는 파트너)에게 넣어 주고 메일. 원하지 않으면 그 파트너가 내 화면에서 빼면 돼요 */
function dpRelease(k, exceptPid) {
  const all = dpAll(), taken = dpTaken(all, ''); if ((taken[k] || 0) >= DP_RULE.slots) return '';
  const cap = dpCap(), sh = dpSheet(SH_DPW);
  for (const o of dpWaits().filter(x => String(x.r[DPWC['동']]) === k)) {
    const p = all.find(x => x.id === String(o.r[DPWC['파트너']]));
    if (!p || !dpHolds(p) || p.id === exceptPid || p.keys.some(s => s.k === k)) { sh.getRange(o.row, DPWC['상태'] + 1).setValue('취소'); continue; }
    if (p.keys.length >= cap) continue;                               // 자리가 꽉 찬 파트너는 건너뛰고 다음 사람(대기는 그대로)
    const keys = p.keys.concat([{ k: k, at: ymd(new Date()), sw: '' }]);
    dpSet(p.row, '동목록', JSON.stringify(keys));
    sh.getRange(o.row, DPWC['상태'] + 1, 1, 2).setValues([['안내함', new Date()]]);
    dpMailTo(p.mail, `[${SITE_NAME}] 기다리던 동에 자리가 났어요`, `${bEsc(dpSplit(k).dn)}에 자리가 나서 대기 1번인 ${bEsc(p.office)}에 넣어 드렸어요. 내일 아침 브리핑부터 이 동 구독자에게도 보여요.<br>원하지 않으면 내 파트너 화면에서 빼 주세요: <a href="${WEB_ROOT}dongne/my/">${WEB_ROOT}dongne/my/</a>`);
    dpPickReset();
    return p.id;
  }
  return '';
}
function dpMove(b) {
  dpGate(b);
  const u = sessionUser(b.s), all = dpAll(), me = dpMeOf(u, all);
  if (!me || !dpHolds(me)) throw new Error('파트너 정보를 찾지 못했어요.');
  const addr = uText(b.addr, 120), key = dpKey(b.g, b.dn);
  if (!addr || addr.length < 6 || !key) throw new Error('새 사무소 주소와 동을 골라 주세요.');
  const oldKey = dpKey(me.g, me.dn);
  if (key === oldKey) { dpSet(me.row, '주소', addr); dpSet(me.row, '수정일', new Date()); return { ok: true, same: true }; }
  if ((dpTaken(all, me.id)[key] || 0) >= DP_RULE.slots && !me.keys.some(s => s.k === key)) throw new Error('새 사무소 동은 자리가 다 찼어요. [대기 걸기]를 누르면 자리가 날 때 알려 드려요.');
  const keep = me.keys.filter(s => s.k !== oldKey && s.k !== key && dpNearOk(key, s.k)), drop = me.keys.filter(s => s.k !== key && keep.indexOf(s) < 0).map(s => s.k);
  const keys = [{ k: key, at: ymd(new Date()), sw: '' }].concat(keep).slice(0, dpCap());
  dpSet(me.row, '주소', addr); dpSet(me.row, '시군구', String(b.g)); dpSet(me.row, '사무소동', uText(b.dn, 20)); dpSet(me.row, '동목록', JSON.stringify(keys));
  dpSet(me.row, '확인결과', '소재지 변경 ' + ymd(new Date()) + ' — 등록관청 변경 신고 확인 필요'); dpSet(me.row, '수정일', new Date());
  drop.forEach(k => dpRelease(k, me.id));
  dpNotify('move', '동네 파트너 소재지 변경(확인)');
  dpPickReset();
  return { ok: true, keys: keys, dropped: drop };
}
function dpProfile(b) {
  dpGate(b);
  const u = sessionUser(b.s), me = dpMeOf(u); if (!me) throw new Error('파트너 정보를 찾지 못했어요.');
  if (b.intro != null) { const s = uText(b.intro, 40).replace(/\s+/g, ' '); const c = s ? dpCheck(s) : { act: 'ok' }; if (c.act === 'block') throw new Error('한 줄 소개: ' + c.msg); dpSet(me.row, '소개', s); }
  if (b.mail != null) { const m = uText(b.mail, 80).toLowerCase(); if (!/^[a-z0-9._%+-]{1,64}@[a-z0-9.-]+\.[a-z]{2,}$/.test(m)) throw new Error('이메일 주소를 다시 확인해 주세요.'); dpSet(me.row, '이메일', m); }
  if (b.tel != null) { const ph = String(b.tel).replace(/[^0-9]/g, ''); if (!/^0\d{8,10}$/.test(ph)) throw new Error('사무소 전화번호를 다시 확인해 주세요.'); dpSet(me.row, '전화', ph.replace(/^(02)(\d{3,4})(\d{4})$/, '$1-$2-$3').replace(/^(0\d{2})(\d{3,4})(\d{4})$/, '$1-$2-$3')); }
  if (b.drop) {                                                       // 받은 동 하나 빼기(사무소 동 빼고)
    const k = String(b.drop); if (k === dpKey(me.g, me.dn)) throw new Error('사무소가 있는 동은 뺄 수 없어요.');
    if (!me.keys.some(s => s.k === k)) throw new Error('뺄 동을 다시 골라 주세요.');
    dpSet(me.row, '동목록', JSON.stringify(me.keys.filter(s => s.k !== k))); dpRelease(k, me.id); dpPickReset();
  }
  dpSet(me.row, '수정일', new Date());
  return { ok: true };
}
/** 동 하나 더 받기(가까운 동, 빈 자리). 빌링이 잠긴 동안은 3개 동까지. 늘어난 요금은 다음 결제부터 */
function dpAdd(b) {
  dpGate(b);
  const u = sessionUser(b.s), all = dpAll(), me = dpMeOf(u, all); if (!me || !dpHolds(me)) throw new Error('파트너 정보를 찾지 못했어요.');
  const k = String(b.key || '');
  if (!/^\d{5}\|[가-힣0-9·.]{1,20}$/.test(k) || me.keys.some(s => s.k === k)) throw new Error('더할 동을 다시 골라 주세요.');
  if (me.keys.length >= dpCap()) throw new Error(dpBillOn() ? `동은 ${DP_RULE.max}개까지예요.` : `지금은 시범 운영이라 ${DP_RULE.incl}개 동까지예요. 동 추가는 정식 결제가 열리면 할 수 있어요.`);
  if (!dpNearOk(dpKey(me.g, me.dn), k)) throw new Error('사무소 동과 가까운 동만 더할 수 있어요.');
  if ((dpTaken(all, me.id)[k] || 0) >= DP_RULE.slots) throw new Error('그 동은 자리가 다 찼어요. [대기 걸기]를 누르면 자리가 날 때 알려 드려요.');
  const keys = me.keys.concat([{ k: k, at: ymd(new Date()), sw: '' }]);
  dpSet(me.row, '동목록', JSON.stringify(keys)); dpSet(me.row, '수정일', new Date()); dpWaitDrop(me.id, k); dpPickReset();
  const pr = dpPriceOf(me, keys.length);
  return { ok: true, keys: keys, price: pr, from: me.next || '' };
}
/** 해지: 버튼 하나로 바로 접수. 그달 말일까지 이용, 그 뒤 결제 없음. undo:true 면 말일 전에 되돌리기 */
function dpCancel(b) {
  const u = sessionUser(b.s), me = dpMeOf(u); if (!me || !dpHolds(me)) throw new Error('파트너 정보를 찾지 못했어요.');
  const t = ymd(new Date());
  if (b.undo) {
    if (me.pay !== DP_PAY.bye) throw new Error('해지 예정이 아니에요.');
    const back = (billKeyGet('DP', me.id) || {}).bk ? DP_PAY.ok : DP_PAY.trial;
    dpSet(me.row, '결제상태', back); dpSet(me.row, '해지예정일', ''); dpSet(me.row, '수정일', new Date());
    return { ok: true, pay: back };
  }
  if (me.pay === DP_PAY.bye) return { ok: true, endAt: me.endAt, again: true };
  if (me.pay === DP_PAY.card) { dpEnd(me, '본인 해지(카드 등록 전)'); return { ok: true, endAt: t, now: true }; }
  const endAt = dpMonthEnd(t);
  dpSet(me.row, '결제상태', DP_PAY.bye); dpSet(me.row, '해지예정일', endAt); dpSet(me.row, '수정일', new Date());
  let refund = '';
  if (me.plan === 'y' && me.until && me.until > endAt) {                     // 연간: 남은 기간은 약관(초안)대로 운영자가 환불 처리
    refund = `연간 결제 해지 — ${endAt}까지 이용, ${me.until}까지 남은 기간 환불 확인 필요(약관 초안: 쓴 달은 월 요금으로 계산해 뺀 나머지)`;
    dpNotify('refund', '동네 파트너 연간 결제 해지(환불 확인)');
    dpSet(me.row, '메모', refund);
  }
  dpMailTo(me.mail, `[${SITE_NAME}] 동네 파트너 해지를 접수했어요`, `${endAt}까지 지금처럼 보이고, 그 뒤에는 결제되지 않아요.${refund ? '<br>연간 결제의 남은 기간은 약관에 따라 환불해 드려요. 처리 결과를 메일로 알려 드려요.' : ''}<br>${me.founding ? `창립 파트너 혜택은 끊긴 날부터 ${DP_FOUND_KEEP}일이 지나면 사라지고, 다시 가입해도 돌려받지 못해요.<br>` : ''}마음이 바뀌면 ${endAt}까지 내 파트너 화면에서 [해지 취소]를 누르면 돼요.<br><a href="${WEB_ROOT}dongne/my/">${WEB_ROOT}dongne/my/</a>`);
  return { ok: true, endAt: endAt, refund: !!refund };
}
/** 요금제 바꾸기(월간 ↔ 연간): 다음 결제일부터 */
function dpPlan(b) {
  const u = sessionUser(b.s), me = dpMeOf(u); if (!me || !dpHolds(me)) throw new Error('파트너 정보를 찾지 못했어요.');
  const plan = b.plan === 'y' ? 'y' : 'm';
  dpSet(me.row, '요금제', DP_PLAN[plan]); dpSet(me.row, '수정일', new Date());
  return { ok: true, plan: plan, from: me.next || '', price: dpPriceOf(me, null, plan) };
}

/* ---------- 토스 자동결제(빌링) 공용 — 동네 파트너(DP)·모닝 브리핑(BR)이 함께 써요. BILLING_OPEN·PAID_OPEN 이 모두 켜져야 돌아요 ----------
   ① 화면: 토스 SDK v2 TossPayments(클라이언트 키).payment({ customerKey }).requestBillingAuth({ method: 'CARD', successUrl, failUrl, customerEmail, customerName }) — 0원 카드 인증
   ② 돌아온 주소의 authKey·customerKey → 서버 POST https://api.tosspayments.com/v1/billing/authorizations/issue { authKey, customerKey } → billingKey
   ③ 정기 결제: POST https://api.tosspayments.com/v1/billing/{billingKey} { customerKey, amount, orderId, orderName, customerEmail, customerName, taxFreeAmount } → status 'DONE'
   인증 머리글: Basic base64(시크릿 키 + ':'). 빌링키·고객키는 스크립트 속성 BK_{DP|BR}_{id} 에만(시트·깃·화면 응답에 빌링키는 절대 없음). */
const BILL_LOG = '자동결제기록', BILL_LOGH = ['시각', '종류', '대상', '주문번호', '금액', '결과', '메시지', '결제키'];
const BILL_AGREE = '자동결제동의', BILL_AGREEH = ['시각', '종류', '대상', '동의 문구', '판', '확인값'];
function billOn() { return BILLING_OPEN && PAID_OPEN; }
function billKeyGet(ns, id) { return parseJ(PropertiesService.getScriptProperties().getProperty('BK_' + ns + '_' + id), null); }
function billKeyPut(ns, id, v) { const P = PropertiesService.getScriptProperties(); if (v) P.setProperty('BK_' + ns + '_' + id, JSON.stringify(v)); else P.deleteProperty('BK_' + ns + '_' + id); }
/** 고객키: 토스 규칙(22~255자, 영문·숫자·- _ = . @, 특수문자 1개 이상, 짐작할 수 없는 값) */
function billNewCk(ns, id) { const ck = Utilities.getUuid() + '_' + ns; billKeyPut(ns, id, { ck: ck, bk: '' }); return ck; }
function billToss(path, body) {
  const P = PropertiesService.getScriptProperties(), sec = P.getProperty('TOSS_BILLING_SECRET_KEY') || P.getProperty('TOSS_SECRET_KEY');
  if (!sec) return { code: 0, j: { message: '시크릿 키 없음' } };
  const r = UrlFetchApp.fetch('https://api.tosspayments.com/v1/' + path, { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(sec + ':') }, payload: JSON.stringify(body) });
  let j = {}; try { j = JSON.parse(r.getContentText()); } catch (e) {}
  return { code: r.getResponseCode(), j: j };
}
function billClosedErr() { const e = new Error('정식 자동 결제는 아직 열리지 않았어요.'); e.code = 'billing_closed'; return e; }
/** authKey → billingKey. 돌려줌 { ok, card, msg } */
function billIssue(ns, id, authKey, ck) {
  const k0 = billKeyGet(ns, id) || {};
  if (!authKey || !k0.ck || !safeEq(String(ck || ''), k0.ck)) return { ok: false, msg: '카드 등록 정보가 맞지 않아요. [카드 등록하기]를 다시 눌러 주세요.' };
  const r = billToss('billing/authorizations/issue', { authKey: String(authKey), customerKey: k0.ck });
  if (r.code !== 200 || !r.j.billingKey) return { ok: false, msg: '카드를 등록하지 못했어요. ' + (/[가-힣]/.test(String(r.j.message || '')) ? String(r.j.message).slice(0, 80) : '잠시 뒤 다시 시도해 주세요.') };
  billKeyPut(ns, id, { ck: k0.ck, bk: String(r.j.billingKey) });
  const c = r.j.card || {}, no = String(c.number || '').replace(/[^0-9*]/g, '').slice(-4);
  return { ok: true, card: ('카드 ' + String(r.j.cardCompany || c.issuerCode || '') + (no ? ' ' + no : '')).trim() };
}
/** 한 번 청구. 돌려줌 { ok, msg, key, oid } — 기록은 '자동결제기록' 시트(빌링키 없음) */
function billCharge(ns, id, amount, orderName, email, name) {
  const k = billKeyGet(ns, id) || {}, oid = ns + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyMMdd') + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
  let ok = false, msg = '', key = '';
  if (!k.bk) msg = '등록된 카드 없음';
  else {
    try {
      const r = billToss('billing/' + encodeURIComponent(k.bk), { customerKey: k.ck, amount: amount, orderId: oid, orderName: String(orderName).slice(0, 100),
        customerEmail: email || undefined, customerName: String(name || '').slice(0, 30) || undefined, taxFreeAmount: 0 });
      ok = r.code === 200 && r.j.status === 'DONE' && Number(r.j.totalAmount) === Number(amount);
      key = String(r.j.paymentKey || ''); msg = ok ? '' : String(r.j.message || ('http ' + r.code)).slice(0, 120);
    } catch (e) { msg = '연결 오류'; }
  }
  uSheet(BILL_LOG, BILL_LOGH).appendRow([new Date(), ns, id, oid, amount, ok ? '결제완료' : '실패', cellSafe(msg), key]);
  return { ok: ok, msg: msg, key: key, oid: oid };
}
function billAgreeLog(ns, id, text) { const now = new Date(); uSheet(BILL_AGREE, BILL_AGREEH).appendRow([now, ns, id, cellSafe(text), DP_TERMS_V, hashOf('bill|' + ns + '|' + id + '|' + text + '|' + now.getTime()).slice(0, 17)]); }

/* ---------- 동네 파트너 빌링 ---------- */
function dpBkGet(id) { return billKeyGet('DP', id); }
function dpBkPut(id, v) { billKeyPut('DP', id, v); }
function dpBillingIssue(b) {
  if (!dpBillOn()) { const e = new Error('정식 결제는 아직 열리지 않았어요. 지금은 시범 파트너로 카드 등록 없이 이용해요.'); e.code = 'billing_closed'; throw e; }
  dpGate(b);
  const u = sessionUser(b.s), me = dpMeOf(u); if (!me || !dpHolds(me)) throw new Error('파트너 정보를 찾지 못했어요.');
  if (b.start) return { ok: true, ck: (dpBkGet(me.id) || {}).ck || billNewCk('DP', me.id) };   // 카드 다시 등록: 고객키 받기
  const x = billIssue('DP', me.id, b.authKey, b.customerKey);
  if (!x.ok) throw new Error(x.msg);
  return withLock(() => {
    dpSet(me.row, '카드', x.card || '등록됨');
    const t = ymd(new Date());
    if (me.pay === DP_PAY.card || me.pay === DP_PAY.trial) {
      const first = dpFirstCharge(t);
      dpSet(me.row, '결제상태', DP_PAY.ok); dpSet(me.row, '첫결제일', first); dpSet(me.row, '다음결제일', first); dpSet(me.row, '만료일', dpAddDays(first, -1));
      dpMailTo(me.mail, `[${SITE_NAME}] 카드 등록을 마쳤어요`, `첫 달은 무료예요. <b>${bEsc(dpPayText(dpPriceOf(me, null, null, t), first))}</b>. 결제 7일 전에 다시 알려 드려요. 해지는 내 파트너 화면의 [해지하기] 한 번이면 돼요.`);
      dpPickReset();
      return { ok: true, pay: DP_PAY.ok, first: first };
    }
    if (me.pay === DP_PAY.retry || me.pay === DP_PAY.fail) { const y = dpCharge(dpAll().find(p => p.id === me.id), t); return { ok: true, pay: y.ok ? DP_PAY.ok : me.pay, charged: y.ok, msg: y.msg }; }
    return { ok: true, pay: me.pay };
  });
}
/** 정기 결제 한 번. 성공하면 다음 결제일·이용 기간을 늘리고, 실패하면 재시도(실패일 기록) */
function dpCharge(p, t) {
  const pr = dpPriceOf(p, null, null, t);
  const x = billCharge('DP', p.id, pr.total, `${SITE_NAME} 동네 파트너 ${DP_PLAN[p.plan]}(${p.keys.length}개 동)`, p.mail, p.office);
  if (x.ok) {
    const from = p.next && p.next >= t ? p.next : t, next = dpNextCharge(from, p.plan);
    dpSet(p.row, '결제상태', DP_PAY.ok); dpSet(p.row, '다음결제일', next); dpSet(p.row, '만료일', dpAddDays(next, -1)); dpSet(p.row, '실패일', '');
    dpMailTo(p.mail, `[${SITE_NAME}] 동네 파트너 ${pr.total.toLocaleString()}원 결제했어요`, `${DP_PLAN[p.plan]} 이용료 ${pr.total.toLocaleString()}원(${p.keys.length}개 동)을 결제했어요. 다음 결제일은 ${next}예요.<br>해지는 내 파트너 화면의 [해지하기] 한 번이면 돼요: <a href="${WEB_ROOT}dongne/my/">${WEB_ROOT}dongne/my/</a>`);
  } else {
    dpSet(p.row, '결제상태', DP_PAY.retry); if (!p.failAt) dpSet(p.row, '실패일', t);
    dpMailTo(p.mail, `[${SITE_NAME}] 동네 파트너 결제가 되지 않았어요`, `${pr.total.toLocaleString()}원 결제가 되지 않았어요(${bEsc(x.msg || '카드사 거절')}). ${DP_RULE.retryDays}일 동안 날마다 다시 시도해요.<br>카드를 바꾸려면 내 파트너 화면에서 [카드 다시 등록하기]를 눌러 주세요. 그래도 안 되면 노출이 멈추고, 자리는 ${DP_RULE.holdDays}일 동안 지켜 드려요.<br><a href="${WEB_ROOT}dongne/my/">${WEB_ROOT}dongne/my/</a>`);
  }
  dpPickReset();
  return { ok: x.ok, msg: x.msg };
}
/** 해지: 자리를 비우고(대기 1번에게), 대기를 지우고, 사진을 지움. 글은 브리핑에서 빠짐 */
function dpEnd(p, why, lose) {
  try { dpBkPut(p.id, null); } catch (e) {}                             // 빌링키 지우기(더는 결제 안 함)
  dpSet(p.row, '해지예정일', p.failAt || p.endAt || ymd(new Date()));   // 끊긴 날: 창립 혜택 30일 기준
  if (lose && p.founding) dpSet(p.row, '창립', '박탈');
  dpSet(p.row, '상태', DP_ST.end); dpSet(p.row, '메모', why + ' ' + ymd(new Date())); dpSet(p.row, '동목록', '[]'); dpSet(p.row, '수정일', new Date());
  if (p.img) { cmTrash(p.img); dpSet(p.row, '사진', ''); dpSet(p.row, '사진상태', ''); }
  dpWaitDrop(p.id, '');
  p.keys.forEach(s => dpRelease(s.k, p.id));
  dpPickReset();
}
/** 회원 탈퇴(userDelete): 파트너 해지 + 연락처·이메일·주소 지우기 + 글 지우기 */
function dpUserGone(k) {
  if (!book().getSheetByName(SH_DP)) return;
  const uh = dpUid(k);
  dpAll().filter(p => p.uh === uh).forEach(p => {
    if (dpHolds(p)) dpEnd(p, '탈퇴');
    ['전화', '이메일', '주소', '성명', '대표자'].forEach(h => dpSet(p.row, h, ''));
    dpRows(SH_DPP).filter(o => String(o.r[DPPC['파트너']]) === p.id && String(o.r[DPPC['상태']]) !== DP_PST.del).forEach(o => dpErasePost(o, '탈퇴'));
  });
}

/* ---------- 브리핑에 실을 글 고르기 ---------- */
function dpPickReset() { try { CacheService.getScriptCache().remove('dpPick'); } catch (e) {} }
function dpBoostSet(day) {
  const L = parseJ(PropertiesService.getScriptProperties().getProperty('DP_BEST_LOG'), {}) || {}, prev = dpAddMonths(day.slice(0, 7) + '-01', -1).slice(0, 7), s = {};
  Object.keys(L).forEach(pid => { if ((L[pid] || []).indexOf(prev) >= 0) s[pid] = 1; });
  return s;
}
/** 그날 고른 결과: { day, by: { 동열쇠: { post(공개 글 하나 또는 null), pids(그 동 파트너 순서) } }, best } — 하루 한 번 계산해 스크립트 속성에(어제 결과로 같은 파트너 연속을 피함) */
function dpPickDay(day) {
  const c = CacheService.getScriptCache(), hit = parseJ(c.get('dpPick'), null);
  if (hit && hit.day === day) return hit;
  const P = PropertiesService.getScriptProperties(), st = parseJ(P.getProperty('DP_PICK'), {}) || {};
  const prevDay = dpAddDays(day, -1), prev = st[prevDay] || {};
  const all = dpAll().filter(p => dpLive(p, day)), boost = dpBoostSet(day), from = dpCutoff(day) - DP_RULE.postDays * 86400000;
  const byKey = {}, found = {}; all.forEach(p => { if (dpFoundOn(p, day)) found[p.id] = 1; p.keys.forEach(s => { (byKey[s.k] = byKey[s.k] || []).push(p.id); }); });
  const posts = dpRows(SH_DPP).filter(o => String(o.r[DPPC['상태']]) === DP_PST.on).map(o => dpPostPub(o, false)).filter(x => x.at >= from);
  const by = {}, picked = {};
  Object.keys(byKey).forEach(k => {
    const mine = posts.filter(x => x.key === k && byKey[k].indexOf(x.pid) >= 0).map(x => Object.assign({}, x, { boost: !!boost[x.pid], found: !!found[x.pid] }));
    const p = dpPickPost(mine, day, prev[k] || '');
    const active = {}; mine.forEach(x => { active[x.pid] = 1; });
    by[k] = { post: p ? { id: p.id, pid: p.pid, tn: p.tn, text: p.text, img: p.img, at: p.at, help: p.help } : null, pids: dpOrder(byKey[k], p ? p.pid : '', active, day, found) };
    if (p) picked[k] = p.pid;
  });
  if (!(day in st)) { const keep = {}; keep[day] = picked; if (st[prevDay]) keep[prevDay] = st[prevDay]; try { P.setProperty('DP_PICK', JSON.stringify(keep)); } catch (e) {} }
  const cards = {}; all.forEach(p => { cards[p.id] = dpCard(p, day); });
  const res = { day: day, by: by, cards: cards, best: parseJ(P.getProperty('DP_BEST'), null) };
  try { c.put('dpPick', JSON.stringify(res), 1800); } catch (e) {}
  return res;
}
/** 구독자 한 명의 칸: areas = 받는 지역, apts = 관심 단지 이름, aptDong(g, 이름) → 그 단지 동 이름 */
function dpSection(areas, apts, day, aptDong) {
  const D = dpPickDay(day), keys = Object.keys(D.by), out = [], seen = {};
  (areas || []).forEach(a => {
    const ad = (apts || []).map(n => aptDong ? aptDong(a.g, n) : '').filter(Boolean);
    dpAreaDongs(a, keys, ad, day).forEach(k => {
      if (seen[k]) return; seen[k] = 1;
      const x = D.by[k]; if (!x) return;
      out.push({ key: k, dn: dpSplit(k).dn, gn: a.gn || '', post: x.post, partners: x.pids.map(id => D.cards[id]).filter(Boolean).slice(0, DP_RULE.slots) });
    });
  });
  const best = D.best && D.best.w ? D.best : null, gs = (areas || []).filter(a => !a.dn).map(a => a.g);
  const bestFor = best ? gs.map(g => best.byG && best.byG[g]).filter(Boolean)[0] || '' : '';
  return { list: out.slice(0, 4), best: bestFor && best.posts && best.posts[bestFor] ? best.posts[bestFor] : null };
}
/** 메일 칸(이른 아침 광고 동의자만 — briefDaily 가 확인). 맨 아래 따로, (제휴)·광고 표시와 수신 거부 */
function dpMailHtml(sec, subId) {
  if (!sec || (!sec.list.length && !sec.best)) return '';
  const card = c => `<div style="font-size:12.5px;color:#4E5968;line-height:1.55;margin:4px 0 0">${dpLegal(c).map(bEsc).join(' · ')}</div>`;
  const items = sec.list.map(x => {
    const top = x.partners[0];
    const post = x.post && top && x.post.pid === top.id ? `<div style="font-size:12.5px;font-weight:800;color:#8A6A12">${bEsc(x.post.tn)}</div><p style="margin:2px 0 4px;line-height:1.6">${bEsc(x.post.text)}</p>${x.post.img ? `<img src="${bEsc(x.post.img)}" alt="" style="max-width:100%;border-radius:8px;margin:2px 0 4px">` : ''}` : '';
    return `<div style="border-top:1px solid #EFE6CC;padding:10px 0 4px"><div style="font-size:15px;font-weight:900">${bEsc(x.dn)}</div>${post}
      ${x.partners.map((c, i) => `<div style="margin:${i ? 8 : 2}px 0 0"><b style="font-size:14px">${bEsc(c.office)}</b> <span style="font-size:11.5px;font-weight:800;color:#8A6A12;background:#F6EDD3;border-radius:6px;padding:1px 6px">${c.found ? '창립 파트너' : '동네 파트너'}</span>${c.intro ? `<div style="font-size:13px;color:#3E4754">${bEsc(c.intro)}</div>` : ''}${card(c)}</div>`).join('')}</div>`;
  }).join('');
  const best = sec.best ? `<div style="background:#FFF;border:1px solid #EFE6CC;border-radius:10px;padding:10px 12px;margin:6px 0 8px"><b>이번 주 우수 동네 소식</b> · ${bEsc(sec.best.dn)} · ${bEsc(sec.best.office)}<p style="margin:4px 0 0;line-height:1.6">${bEsc(sec.best.text)}</p></div>` : '';
  const off = `${bApi()}?action=briefAdOff&id=${encodeURIComponent(subId)}&t=${bAmToken(subId)}`;
  return `<div style="margin:16px 0 0;background:#FBF8EF;border:1px solid #EFE6CC;border-radius:12px;padding:12px 14px">
    <div style="font-size:16px;font-weight:900">우리 동네 중개사 한마디 <span style="font-size:12px;font-weight:800;color:#4E5968;background:#F2F4F6;border-radius:6px;padding:1px 7px">제휴</span></div>
    <div style="font-size:12.5px;color:#4E5968;margin:2px 0 6px">제휴 중개사가 직접 쓴 동네 소식이에요. 브리핑의 숫자·순위는 제휴와 관계없이 똑같이 계산해요.</div>${best}${items}
    <p style="font-size:12px;color:#4E5968;line-height:1.6;margin:10px 0 0">이 칸은 광고성 정보 받기와 이른 아침 광고 받기에 동의하신 분께만 보여요. 더 받지 않으려면 <a href="${off}" style="color:#1F4FD1">광고 수신 거부(한 번 누르면 끝)</a>를 누르거나 <a href="${BRIEF_WEB}manage/" style="color:#1F4FD1">내 구독 관리</a>에서 끌 수 있어요. 브리핑은 똑같이 받아요.<br>
    보낸 사람: ${bEsc(BRIEF_SENDER.site)}(${bEsc(BRIEF_SENDER.name)}) · ${bEsc(BRIEF_SENDER.addr)} · 전화 ${bEsc(BRIEF_SENDER.tel)} · 이메일 ${bEsc(BRIEF_SENDER.email)}</p></div>`;
}
/** 웹 브리핑 칸: 메일 속 링크(k) 또는 카카오 로그인(s)으로 구독자를 확인하고, 광고성 정보 받기 동의자에게만 */
function dpBrief(b) {
  const admin = dpIsAdmin(b);
  if (!DONGNE_ENABLED && !admin) return { ok: true, show: false };
  let kk = '';
  const k = String(b.k || '');
  if (/^[0-9a-f]{10}$/.test(k)) { const o = bRows().find(x => bKey(String(x.r[BC['id']])) === k); if (o) kk = String(o.r[BC['카카오id']]); }
  if (!kk) { const u = dpOptUser(b); if (u) kk = u.k; }
  if (!kk || !bConsentOf(kk).ad.on) return { ok: true, show: false, why: kk ? 'consent' : 'who' };
  const g = String(b.g || ''), dn = uText(b.dn, 20);
  if (!/^\d{5}$/.test(g)) return { ok: true, show: false };
  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(b.day || '')) ? String(b.day) : ymd(new Date());
  const ub = userBriefMap()[kk] || { apts: [] };
  const S = !dn && (ub.apts || []).length ? bFetchJson(BRIEF_DATA + g + '.json') : null;
  const sec = dpSection([{ g: g, dn: dn, gn: '' }], ub.apts || [], day, (gg, n) => { const t = S && (S.trades || []).find(x => x.a === n); return t ? t.d : ''; });
  return { ok: true, show: true, sec: sec, day: day };
}
function dpBestGet(b) {
  if (!DONGNE_ENABLED && !dpIsAdmin(b)) return { ok: true, best: null };
  const B = parseJ(PropertiesService.getScriptProperties().getProperty('DP_BEST'), null);
  return { ok: true, best: B && B.top && B.posts ? B.posts[B.top] || null : null, w: B ? B.w : '' };
}
function dpInvite(b) {
  if (!DONGNE_ENABLED && !dpIsAdmin(b)) return { ok: true, p: null };
  const c = String(b.c || '').toUpperCase(); if (!/^P[0-9A-F]{7}$/.test(c)) return { ok: true, p: null };
  const p = dpAll().find(x => x.code === c && dpLive(x)); if (!p) return { ok: true, p: null };
  return { ok: true, p: { office: p.office, g: p.g, dn: p.dn, key: dpKey(p.g, p.dn), card: dpCard(p) } };
}
/** 무료 체험 신청(briefTrial)에서: 초대 링크로 온 사람을 그 파트너에게 기록(사람마다 한 번) */
function dpAttrib(k, code) {
  code = String(code || '').toUpperCase(); if (!/^P[0-9A-F]{7}$/.test(code) || !book().getSheetByName(SH_DP)) return '';
  const p = dpAll().find(x => x.code === code && dpLive(x)); if (!p) return '';
  const vh = hashOf('dpsub|' + k).slice(1, 17);
  if (dpRows(SH_DPE).some(o => String(o.r[DPEC['종류']]) === 'sub' && String(o.r[DPEC['방문자']]) === vh)) return 'once';
  dpSheet(SH_DPE).appendRow([ymd(new Date()), 'sub', p.id, '', 1, vh]);
  return 'ok';
}

/* ---------- 도움돼요·신고·누름 기록 ---------- */
function dpVid(b) { const v = String(b.v || ''); const u = dpOptUser(b); return u ? hashOf('dpv|k' + u.k).slice(1, 17) : /^[A-Za-z0-9_-]{8,64}$/.test(v) ? hashOf('dpv|' + v).slice(1, 17) : ''; }
function dpPostRow(id) { return dpRows(SH_DPP).find(o => String(o.r[DPPC['id']]) === String(id || '')); }
function dpHelp(b) {
  const vh = dpVid(b); if (!vh) throw new Error('잠시 뒤 다시 눌러 주세요.');
  const o = dpPostRow(b.id); if (!o || String(o.r[DPPC['상태']]) !== DP_PST.on) throw new Error('글을 찾지 못했어요.');
  if (dpRows(SH_DPE).some(x => String(x.r[DPEC['종류']]) === 'help' && String(x.r[DPEC['글']]) === String(b.id) && String(x.r[DPEC['방문자']]) === vh)) return { ok: true, again: true };
  const n = (Number(o.r[DPPC['도움']]) || 0) + 1;
  dpSheet(SH_DPP).getRange(o.row, DPPC['도움'] + 1).setValue(n);
  dpSheet(SH_DPE).appendRow([ymd(new Date()), 'help', dpTxt(o.r[DPPC['파트너']]), String(b.id), 1, vh]);
  return { ok: true, n: n };
}
function dpReport(b) {
  const vh = dpVid(b); if (!vh) throw new Error('잠시 뒤 다시 눌러 주세요.');
  const why = DP_WHY[b.why] ? String(b.why) : ''; if (!why) throw new Error('신고 이유를 골라 주세요.');
  if (b.pid) {                                                        // 파트너 카드 신고(사람·사무소에 대한 신고) → 쌓이면 운영자 검토 대기열
    const p = dpAll().find(x => x.id === String(b.pid)); if (!p || !dpHolds(p)) throw new Error('파트너를 찾지 못했어요.');
    if (dpRows(SH_DPE).some(x => /^prep/.test(String(x.r[DPEC['종류']])) && String(x.r[DPEC['파트너']]) === p.id && String(x.r[DPEC['방문자']]) === vh)) return { ok: true, again: true };
    dpSheet(SH_DPE).appendRow([ymd(new Date()), 'prep', p.id, 'p|' + why, 1, vh]);
    const n = dpPartnerReps(p.id);
    if (n >= DP_PREP_Q) dpNotify('prep', '신고가 쌓인 동네 파트너가 있어요');
    return { ok: true, n: n };
  }
  const o = dpPostRow(b.id); if (!o || String(o.r[DPPC['상태']]) === DP_PST.del) throw new Error('글을 찾지 못했어요.');
  if (dpRows(SH_DPE).some(x => String(x.r[DPEC['종류']]) === 'rep' && String(x.r[DPEC['글']]) === String(b.id) && String(x.r[DPEC['방문자']]) === vh)) return { ok: true, again: true };
  const n = (Number(o.r[DPPC['신고']]) || 0) + 1, sh = dpSheet(SH_DPP);
  sh.getRange(o.row, DPPC['신고'] + 1).setValue(n);
  dpSheet(SH_DPE).appendRow([ymd(new Date()), 'rep', dpTxt(o.r[DPPC['파트너']]), String(b.id) + '|' + why, 1, vh]);
  let hidden = false;
  if (n >= DP_REPORT_HIDE && String(o.r[DPPC['상태']]) === DP_PST.on) {
    sh.getRange(o.row, DPPC['상태'] + 1).setValue(DP_PST.tmp); sh.getRange(o.row, DPPC['이유'] + 1).setValue('신고 ' + n + '건 — 임시조치 ' + ymd(new Date()));
    hidden = true; dpPickReset(); dpNotify('rep', '신고가 쌓여 잠시 가린 동네 한마디가 있어요');
  }
  return { ok: true, hidden: hidden };
}
/** 웹에서 보인 수·연락 누름: t = imp(칸이 보임, 파트너 여러 명) · call(전화) · web(사무소 정보 열기). 같은 사람·같은 날·같은 파트너는 한 번만 */
function dpLog(b) {
  const t = ['imp', 'call', 'web'].indexOf(b.t) >= 0 ? b.t : ''; if (!t) return { ok: false };
  const vh = dpVid(b) || 'anon', d = ymd(new Date()), c = CacheService.getScriptCache(), sh = dpSheet(SH_DPE);
  const ids = (Array.isArray(b.ids) ? b.ids : [b.id]).slice(0, 12).map(String).filter(x => /^D[0-9A-F]{9}$/.test(x));
  ids.forEach(id => { const ck = 'dpL|' + t + '|' + id + '|' + vh + '|' + d; if (c.get(ck)) return; c.put(ck, '1', 86400); sh.appendRow([d, t, id, '', 1, vh]); });
  return { ok: true };
}

/* ---------- 운영자 ---------- */
function dpPhotoData(fid) { try { const bl = DriveApp.getFileById(String(fid)).getBlob(); return 'data:' + bl.getContentType() + ';base64,' + Utilities.base64Encode(bl.getBytes()); } catch (e) { return ''; } }
function dpAdminQueue(b) {
  dpAdminNeed(b);
  const all = dpAll(), t = ymd(new Date());
  const P = all.filter(p => p.st === DP_ST.wait).slice(0, 50).map(p => Object.assign(dpCard(p, t), { st: p.st, chk: p.chk, applied: p.applied, keys: p.keys.map(s => s.k), mail: p.mail.replace(/^(.{2}).*(@.*)$/, '$1***$2') }));
  const posts = dpRows(SH_DPP), name = id => (all.find(p => p.id === id) || {}).office || '';
  const pick = f => posts.filter(f).reverse().slice(0, 100).map(o => Object.assign(dpPostPub(o, true), { office: name(dpTxt(o.r[DPPC['파트너']])) }));
  const hold = pick(o => String(o.r[DPPC['상태']]) === DP_PST.hold), tmp = pick(o => String(o.r[DPPC['상태']]) === DP_PST.tmp);
  const photos = [];
  all.filter(p => p.img && p.imgSt === '확인대기' && dpHolds(p)).slice(0, 10).forEach(p => photos.push({ kind: 'p', id: p.id, office: p.office, img: dpPhotoData(p.img) }));
  posts.filter(o => dpTxt(o.r[DPPC['사진']]) && dpTxt(o.r[DPPC['사진상태']]) === '확인대기' && String(o.r[DPPC['상태']]) !== DP_PST.del).slice(0, 10)
    .forEach(o => photos.push({ kind: 'n', id: dpTxt(o.r[DPPC['id']]), office: name(dpTxt(o.r[DPPC['파트너']])), img: dpPhotoData(dpTxt(o.r[DPPC['사진']])) }));
  const live = all.filter(p => p.st === DP_ST.on || p.st === DP_ST.stop).slice(0, 200).map(p => ({ id: p.id, office: p.office, st: p.st, pay: p.pay, plan: p.plan, next: p.next, endAt: p.endAt, founding: dpFoundOn(p, t), warn: p.warn, stopUntil: p.stopUntil, keys: p.keys.map(s => dpSplit(s.k).dn), last: p.last, reps: dpPartnerReps(p.id), chk: p.chk }));
  const reported = live.filter(x => x.reps >= DP_PREP_Q).concat(live.filter(x => x.reps > 0 && x.reps < DP_PREP_Q)).map(x => Object.assign({}, x, { why: dpRows(SH_DPE).filter(o => String(o.r[DPEC['종류']]) === 'prep' && String(o.r[DPEC['파트너']]) === x.id).map(o => DP_WHY[String(o.r[DPEC['글']]).split('|')[1]] || '기타') }));
  return { ok: true, billing: dpBillOn(), tpl: DP_TPL_PUB(), reported: reported, prepQ: DP_PREP_Q, rulesReady: !!dpRules(), keyReady: !!PropertiesService.getScriptProperties().getProperty('DATA_GO_KR_KEY'), open: DONGNE_ENABLED, partners: P, hold: hold, tmp: tmp, photos: photos, live: live };
}
/* ---------- 제재·박탈(운영자) ----------
   중대 위반(바로 박탈): 노출 중지 + 결제 중지(빌링키 지움) + 창립 혜택 박탈 + 해지를 한꺼번에. 환불 없음(약관 초안).
   단계 제재(글쓰기 규칙 위반·고객 민원): 1차 경고 메일 → 2차 7일 노출 중지 → 3차 해지 + 혜택 박탈. 메일 문구는 아래 틀(사유 칸은 운영자가 덧붙임). */
const DP_FOUND_KEEP = 30;                                             // 해지·결제 끊김 뒤 창립 혜택을 지켜 주는 날 수
const DP_BAN = {
  admin: { name: '행정처분·휴업·폐업', body: '중개사무소 등록취소·업무정지 같은 행정처분이나 휴업·폐업 상태가 확인됐어요.' },
  fraud: { name: '사기·전세사기·금전 사고', body: '사기·전세사기 연루나 고객 금전 사고가 확인됐어요.' },
  fake: { name: '허위 정보 가입', body: '가입할 때 낸 정보가 사실과 다른 것으로 확인됐어요.' },
  harm: { name: '서비스·다른 파트너 피해', body: '서비스나 다른 파트너에게 피해를 준 것으로 확인됐어요.' }
};
const DP_STRIKE = {
  rules: { name: '글쓰기 규칙 위반', body: '글쓰기 규칙(가격 예측·담합·매물 홍보·연락처·욕설·비방 금지)을 지키지 않은 글이 있었어요.' },
  complaint: { name: '고객 민원', body: '파트너 활동과 관련해 고객 민원이 접수돼 확인했어요.' }
};
function DP_TPL_PUB() {
  const m = o => Object.keys(o).map(k => ({ k: k, name: o[k].name, body: o[k].body }));
  return { ban: m(DP_BAN), strike: m(DP_STRIKE), steps: ['1차 경고 메일', '2차 7일 노출 중지', '3차 해지 + 창립 혜택 박탈'] };
}
/** 사유 메일 틀 */
function dpSanctionMail(p, kind, cat, step, extra) {
  const c = (kind === 'ban' ? DP_BAN : DP_STRIKE)[cat], add = extra ? '<br>운영자 메모: ' + bEsc(extra) : '', rules = `<br>규칙 보기: <a href="${WEB_ROOT}dongne/terms/">${WEB_ROOT}dongne/terms/</a>`;
  if (kind === 'ban') return dpMailTo(p.mail, `[${SITE_NAME}] 동네 파트너 이용이 바로 끝났어요`, `${bEsc(p.office)} 동네 파트너를 약관에 따라 바로 해지했어요.<br>사유: ${bEsc(c.name)} — ${bEsc(c.body)}${add}<br>노출과 자동 결제를 멈췄고, 창립 파트너 혜택도 없어졌어요. 중대 위반에 따른 해지라 남은 기간 이용료는 돌려 드리지 않아요(약관).<br>사실과 다르면 이 메일에 답장으로 알려 주세요.${rules}`);
  const head = step === 1 ? '경고 1회를 드려요. 한 번 더 어기면 7일 동안 노출을 멈춰요.' : step === 2 ? `${DP_STOP_DAYS}일 동안 노출을 멈춰요(자리는 그대로). 한 번 더 어기면 해지돼요.` : '세 번째 위반이라 해지했어요. 창립 파트너 혜택도 없어졌어요.';
  return dpMailTo(p.mail, `[${SITE_NAME}] 동네 파트너 ${step === 1 ? '경고' : step === 2 ? '노출 중지' : '해지'} 안내 (${step}차)`, `${bEsc(p.office)} · 사유: ${bEsc(c.name)} — ${bEsc(c.body)}${add}<br>${head}${rules}`);
}
/** 같은 사람(카카오)·같은 등록번호의 예전 기록: carry(해지 30일 안 — 창립 이어 받기) · lost(박탈) · ban(중대 위반) · any(예전 기록 있음) */
function dpHistory(all, uh, reg, t) {
  const rn = dpRegNorm(reg), old = all.filter(p => (p.uh === uh || dpRegNorm(p.reg) === rn) && (p.st === DP_ST.end || p.st === DP_ST.no));
  const ban = old.some(p => /^중대 위반/.test(p.chk) || /^중대 위반/.test(String(p.notes || '')));
  const lost = old.some(p => p.foundLost);
  const carry = !lost && !ban && old.some(p => p.st === DP_ST.end && p.founding && p.endAt && (dpDayMs(t) - dpDayMs(p.endAt)) / 86400000 <= DP_FOUND_KEEP);
  return { any: old.some(p => p.st === DP_ST.end), lost: lost, ban: ban, carry: carry };
}
/** 구독자가 파트너 카드에서 누른 신고 수(처리 안 된 것) */
function dpPartnerReps(pid) { return dpRows(SH_DPE).filter(o => String(o.r[DPEC['종류']]) === 'prep' && String(o.r[DPEC['파트너']]) === pid).length; }
const DP_PREP_Q = 2;                                                  // 파트너 신고가 이만큼 쌓이면 운영자 검토 대기열로
/** 매달: 공공 자료로 등록 상태 다시 확인. 휴업·폐업·못 찾음 → 노출을 바로 멈추고(검토대기) 운영자에게. 한 번에 40곳씩 나눠서 */
function dpMonthlyCheck(t) {
  const P = PropertiesService.getScriptProperties(), m = t.slice(0, 7);
  if (!P.getProperty('DATA_GO_KR_KEY')) return 0;
  const done = parseJ(P.getProperty('DP_CHK'), {}) || {}, seen = done.m === m ? done.ids || [] : [];
  const todo = dpAll().filter(p => (p.st === DP_ST.on || p.st === DP_ST.stop) && seen.indexOf(p.id) < 0).slice(0, 40);
  let n = 0, bad = [];
  todo.forEach(p => {
    seen.push(p.id);
    const v = dpVerify({ reg: p.reg, office: p.office, name: p.name, ceo: p.ceo, kind: p.kind, gn: (p.addr.match(/[가-힣]+(시|군|구)(?=\s)/g) || []).pop() || '' });
    dpSet(p.row, '확인결과', '매달 확인 ' + t + ' · ' + v.st + ' · ' + v.why);
    if (v.st === 'closed' || v.st === 'notfound') {
      dpSet(p.row, '상태', DP_ST.wait); dpSet(p.row, '메모', '매달 확인에서 노출 멈춤(' + v.st + ') ' + t); bad.push(p.office + ' — ' + v.why); n++;
      dpMailTo(p.mail, `[${SITE_NAME}] 동네 파트너 노출을 잠시 멈췄어요`, `매달 하는 공공 자료 확인에서 사무소 등록 상태를 확인하지 못했어요(${bEsc(v.why)}). 운영자가 확인하는 동안 노출을 멈춰요. 휴업·폐업이 아니라면 이 메일에 답장으로 알려 주세요.`);
    }
  });
  P.setProperty('DP_CHK', JSON.stringify({ m: m, ids: seen }));
  P.setProperty('DP_CHK_M', m + (todo.length === 40 ? '|go' : '|done'));   // 남았으면 다음 날 이어서
  if (bad.length) { dpPickReset(); dpNotify('chk', '매달 등록 확인에서 노출을 멈춘 파트너 ' + bad.length + '곳'); }
  return n;
}
const DP_ADMIN_OPS = ['approve', 'reject', 'show', 'hide', 'photoOk', 'photoNo', 'strike', 'ban', 'end', 'unstop', 'trial', 'repClear'];
function dpAdminAct(b) {
  dpAdminNeed(b);
  const op = String(b.op || ''); if (DP_ADMIN_OPS.indexOf(op) < 0) throw new Error('할 일을 다시 골라 주세요.');
  const why = uText(b.why, 200), t = ymd(new Date());
  if (op === 'show' || op === 'hide' || (op.indexOf('photo') === 0 && b.kind === 'n')) {
    const o = dpPostRow(b.id); if (!o) throw new Error('글을 찾지 못했어요.');
    const sh = dpSheet(SH_DPP);
    if (op === 'show') { sh.getRange(o.row, DPPC['상태'] + 1).setValue(DP_PST.on); sh.getRange(o.row, DPPC['신고'] + 1).setValue(0); sh.getRange(o.row, DPPC['이유'] + 1).setValue('운영자 확인 공개 ' + t); }
    if (op === 'hide') { dpErasePost(o, '운영자 삭제' + (why ? ': ' + why : '')); const p = dpAll().find(x => x.id === dpTxt(o.r[DPPC['파트너']])); if (p && why) dpMailTo(p.mail, `[${SITE_NAME}] 동네 한마디를 내렸어요`, `쓰신 글을 운영 원칙에 따라 내렸어요.<br>이유: ${bEsc(why)}<br>규칙: <a href="${WEB_ROOT}dongne/terms/">${WEB_ROOT}dongne/terms/</a>`); }
    if (op === 'photoOk') { if (dpShare(o.r[DPPC['사진']])) sh.getRange(o.row, DPPC['사진상태'] + 1).setValue('공개'); }
    if (op === 'photoNo') { cmTrash(o.r[DPPC['사진']]); sh.getRange(o.row, DPPC['사진'] + 1).setValue(''); sh.getRange(o.row, DPPC['사진상태'] + 1).setValue('거절'); }
    dpPickReset();
    return { ok: true };
  }
  const p = dpAll().find(x => x.id === String(b.id || '')); if (!p) throw new Error('파트너를 찾지 못했어요.');
  let res = { ok: true };
  if (op === 'approve') {
    if (p.st !== DP_ST.wait) throw new Error('검토 대기인 파트너만 승인할 수 있어요.');
    dpSet(p.row, '상태', DP_ST.on); if (!p.approved) dpSet(p.row, '승인일', new Date()); dpSet(p.row, '확인결과', p.chk + ' → 운영자 승인 ' + t);
    dpMailTo(p.mail, `[${SITE_NAME}] 동네 파트너 승인됐어요`, `${bEsc(p.office)} 동네 파트너를 확인하고 승인했어요. 이제 '이번 주 우리 동네 한마디'를 쓸 수 있어요.<br><a href="${WEB_ROOT}dongne/my/">내 파트너 화면 열기</a>`);
  } else if (op === 'reject') {
    if (!why) throw new Error('거절 이유를 적어 주세요. 신청한 분께 메일로 보내요.');
    try { dpBkPut(p.id, null); } catch (e) {}
    dpSet(p.row, '상태', DP_ST.no); dpSet(p.row, '메모', '거절: ' + why); dpSet(p.row, '동목록', '[]');
    if (p.img) { cmTrash(p.img); dpSet(p.row, '사진', ''); dpSet(p.row, '사진상태', ''); }
    dpWaitDrop(p.id, ''); p.keys.forEach(s => dpRelease(s.k, p.id));
    dpMailTo(p.mail, `[${SITE_NAME}] 동네 파트너 신청 결과`, `${bEsc(p.office)} 동네 파트너 신청을 이번에는 받지 못했어요.<br>이유: ${bEsc(why)}<br>고쳐서 다시 신청할 수 있어요: <a href="${WEB_ROOT}dongne/">${WEB_ROOT}dongne/</a>`);
  } else if (op === 'photoOk') { if (dpShare(p.img)) dpSet(p.row, '사진상태', '공개'); }
  else if (op === 'photoNo') { cmTrash(p.img); dpSet(p.row, '사진', ''); dpSet(p.row, '사진상태', '거절'); }
  else if (op === 'ban') {                                             // 중대 위반: 한꺼번에(노출 중지·결제 중지·혜택 박탈·해지), 환불 없음
    const cat = DP_BAN[b.cat] ? String(b.cat) : ''; if (!cat) throw new Error('박탈 사유를 골라 주세요.');
    dpSet(p.row, '확인결과', '중대 위반 박탈 ' + t + ' · ' + DP_BAN[cat].name + (why ? ' · ' + why : ''));
    dpEnd(p, '중대 위반 박탈(' + DP_BAN[cat].name + ') — 환불 없음', true);
    dpSet(p.row, '알림', '중대 위반');
    dpRows(SH_DPP).filter(o => String(o.r[DPPC['파트너']]) === p.id && String(o.r[DPPC['상태']]) !== DP_PST.del).forEach(o => dpErasePost(o, '중대 위반 박탈'));
    dpSanctionMail(p, 'ban', cat, 0, why);
    res.step = 'ban';
  } else if (op === 'strike') {                                        // 단계 제재: 1차 경고 → 2차 7일 노출 중지 → 3차 해지 + 혜택 박탈
    const cat = DP_STRIKE[b.cat] ? String(b.cat) : ''; if (!cat) throw new Error('제재 사유를 골라 주세요.');
    const step = Math.min(3, p.warn + 1);
    dpSet(p.row, '경고', step); dpSet(p.row, '메모', `${step}차 제재(${DP_STRIKE[cat].name}) ${t}${why ? ': ' + why : ''}`);
    if (step === 2) { dpSet(p.row, '상태', DP_ST.stop); dpSet(p.row, '노출중지', dpAddDays(t, DP_STOP_DAYS)); }
    if (step === 3) dpEnd(p, `3차 제재 해지(${DP_STRIKE[cat].name})`, true);
    dpSanctionMail(p, 'strike', cat, step, why);
    res.step = step;
  } else if (op === 'unstop') { dpSet(p.row, '상태', DP_ST.on); dpSet(p.row, '노출중지', ''); }
  else if (op === 'trial') {                                           // 운영자가 고른 시범 파트너: 카드 등록 없이 무료(결제 안 함)
    try { dpBkPut(p.id, null); } catch (e) {}
    dpSet(p.row, '결제상태', DP_PAY.trial); dpSet(p.row, '다음결제일', ''); dpSet(p.row, '실패일', ''); dpSet(p.row, '해지예정일', '');
    dpMailTo(p.mail, `[${SITE_NAME}] 시범 파트너로 바꿨어요`, '카드 등록 없이 무료로 이용해요. 결제는 되지 않아요.');
  } else if (op === 'repClear') {                                      // 파트너 신고 확인 끝(기록에서 처리 표시)
    const sh = dpSheet(SH_DPE); dpRows(SH_DPE).forEach(o => { if (String(o.r[DPEC['종류']]) === 'prep' && String(o.r[DPEC['파트너']]) === p.id) sh.getRange(o.row, DPEC['종류'] + 1).setValue('prep-ok'); });
  } else if (op === 'end') {                                           // 일반 해지(위반 아님 — 창립 혜택은 30일 규칙대로)
    if (!why) throw new Error('해지 이유를 적어 주세요. 파트너에게 메일로 보내요.');
    dpEnd(p, '운영자 해지: ' + why);
    dpMailTo(p.mail, `[${SITE_NAME}] 동네 파트너가 해지됐어요`, `${bEsc(p.office)} 동네 파트너를 해지했어요.<br>이유: ${bEsc(why)}<br>남은 기간 이용료는 약관에 따라 처리해 드려요.`);
  }
  dpPickReset();
  return res;
}
function dpNotify(kind, title) {
  if (!NOTIFY) return;
  const c = CacheService.getScriptCache(); if (c.get('dpN|' + kind)) return;
  c.put('dpN|' + kind, '1', 3600);
  try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[${SITE_NAME} 동네 파트너] ${title}`, `운영자 화면에서 확인해 주세요: ${WEB_ROOT}dongne/admin/\n(모닝 브리핑 운영자 모드를 켠 계정으로 카카오 간편 로그인을 해야 열려요)\n시트: ${book().getUrl()}`); } catch (e) {}
}
function dpMailTo(to, subject, html) {
  if (!to || !/@/.test(to)) return false;
  try { MailApp.sendEmail({ to: to, name: SITE_NAME, subject: subject, htmlBody: `<div style="font-family:sans-serif;line-height:1.7">${html}<br><br><span style="font-size:12px;color:#4E5968">보낸 사람: ${bEsc(BRIEF_SENDER.site)}(${bEsc(BRIEF_SENDER.name)}) · 전화 ${bEsc(BRIEF_SENDER.tel)}</span></div>` }); return true; } catch (e) { return false; }
}

/* ---------- 매일 할 일(briefDaily 끝에서) ---------- */
function dpDaily(now) {
  if (!DONGNE_ENABLED || !book().getSheetByName(SH_DP)) return 0;
  const P = PropertiesService.getScriptProperties(), t = ymd(now || new Date());
  if (P.getProperty('DP_DAILY') === t) return 0;
  P.setProperty('DP_DAILY', t);
  let n = 0;
  const mon = new Date(dpDayMs(t) + 9 * 3600000).getUTCDay() === 1, wk = dpWeek(t);
  if (mon) dpBestPick(wk);
  const bill = dpBillOn();
  if (new Date(dpDayMs(t) + 9 * 3600000).getUTCDate() === 1 || P.getProperty('DP_CHK_M') === t.slice(0, 7) + '|go') { try { n += dpMonthlyCheck(t); } catch (e) {} }   // 매달 1일: 등록 상태 다시 확인(나눠서)
  dpAll().forEach(p => {
    if (!dpHolds(p)) return;
    const note = k => p.notes.indexOf(k) >= 0, add = k => { p.notes = (p.notes + ' ' + k).trim().split(' ').slice(-12).join(' '); dpSet(p.row, '알림', p.notes); };
    /* 결제·해지 */
    if (p.pay === DP_PAY.bye && p.endAt && t > p.endAt) { dpEnd(p, '해지(말일 지남)'); n++; return; }
    if (p.pay === DP_PAY.card && p.made && Date.now() - p.made > DP_CARD_WAIT_H * 3600000) { dpEnd(p, '카드 등록 안 함'); return; }
    if (bill && (p.pay === DP_PAY.ok || p.pay === DP_PAY.retry || p.pay === DP_PAY.fail)) {
      const due = p.pay === DP_PAY.ok ? dpNoticeDue(p.plan, p.next, t, p.next === p.first) : 0;
      if (due && !note('pay' + due + '|' + p.next)) {
        dpMailTo(p.mail, `[${SITE_NAME}] ${due}일 뒤 동네 파트너 이용료가 자동 결제돼요`, `<b>${bEsc(dpPayText(dpPriceOf(p, null, null, t), p.next))}</b>. (${DP_PLAN[p.plan]} · ${p.keys.length}개 동)<br>원하지 않으면 그 전에 내 파트너 화면에서 [해지하기]를 한 번 누르면 돼요. 그달 말까지는 지금처럼 보여요.<br><a href="${WEB_ROOT}dongne/my/">${WEB_ROOT}dongne/my/</a>`);
        add('pay' + due + '|' + p.next); n++;
      }
      if (p.pay === DP_PAY.ok && p.next && p.next <= t) { dpCharge(p, t); n++; return; }
      if (p.pay === DP_PAY.retry || p.pay === DP_PAY.fail) {
        const step = dpFailStep(p.failAt || t, t);
        if (step === 'retry') { if (!note('try|' + t)) { add('try|' + t); dpCharge(p, t); n++; } return; }
        if (step === 'stop' && p.pay !== DP_PAY.fail) {
          dpSet(p.row, '결제상태', DP_PAY.fail); dpPickReset();
          dpMailTo(p.mail, `[${SITE_NAME}] 결제가 되지 않아 노출을 멈췄어요`, `${DP_RULE.retryDays}일 동안 다시 시도했지만 결제가 되지 않아 브리핑·웹에서 잠시 내렸어요. 자리는 ${dpAddDays(p.failAt || t, DP_RULE.retryDays + DP_RULE.holdDays)}까지 지켜 드려요.${p.founding ? ` 창립 파트너 혜택은 결제가 끊긴 날부터 ${DP_FOUND_KEEP}일이 지나면 사라져요.` : ''}<br>카드를 다시 등록하면 바로 결제하고 다시 보여요: <a href="${WEB_ROOT}dongne/my/">${WEB_ROOT}dongne/my/</a>`);
          n++; return;
        }
        if (step === 'end') { dpEnd(p, '결제 실패(14일 지남)'); dpMailTo(p.mail, `[${SITE_NAME}] 동네 파트너가 해지됐어요`, '결제가 되지 않은 채 자리를 지키는 기간이 끝나 해지됐어요. 언제든 다시 신청할 수 있어요.'); n++; return; }
        return;
      }
    }
    if (p.st !== DP_ST.on || !dpLive(p, t)) return;
    if (mon && !note('mon|' + wk)) { dpMailTo(p.mail, `[${SITE_NAME}] 이번 주 우리 동네 한마디를 남겨 주세요`, `${p.keys.map(s => bEsc(dpSplit(s.k).dn)).join(', ')} 소식을 200자 안으로 남기면, 밤 10시 전에 쓴 글은 다음 날 아침 브리핑에 실려요.<br><a href="${WEB_ROOT}dongne/my/#write">글 쓰러 가기</a>`); add('mon|' + wk); n++; }
    const since = p.last || p.approved || p.applied;
    if (since && (dpDayMs(t) - dpDayMs(since)) / 86400000 >= DP_RULE.idleDays && !note('idle|' + since)) {
      dpMailTo(p.mail, `[${SITE_NAME}] 4주 동안 동네 한마디가 없었어요`, `글이 없으면 이름 카드만 뒤쪽에 보여요. 짧은 동네 소식 하나면 충분해요.<br><a href="${WEB_ROOT}dongne/my/#write">글 쓰러 가기</a>`); add('idle|' + since); n++;
    }
  });
  /* 끊긴 지 30일 지난 창립 혜택은 영영 사라짐(다시 가입해도 없음) */
  dpAll().filter(p => p.st === DP_ST.end && p.founding && !p.foundLost && p.endAt && (dpDayMs(t) - dpDayMs(p.endAt)) / 86400000 > DP_FOUND_KEEP).forEach(p => dpSet(p.row, '창립', '박탈'));
  return n;
}
/** 월요일: 지난주 우수 동네 소식 고르기 → DP_BEST(브리핑·첫 화면), 고른 파트너는 다음 달 순위 가산(DP_BEST_LOG) */
function dpBestPick(wk) {
  const P = PropertiesService.getScriptProperties(), all = dpAll();
  const posts = dpRows(SH_DPP).filter(o => String(o.r[DPPC['상태']]) === DP_PST.on).map(o => dpPostPub(o, false));
  const B = dpBest(posts, wk), ids = [B.top].concat(Object.keys(B.byG).map(g => B.byG[g])).filter((x, i, a) => x && a.indexOf(x) === i);
  const pub = {}, L = parseJ(P.getProperty('DP_BEST_LOG'), {}) || {}, mon = wk.slice(0, 7);
  ids.forEach(id => {
    const x = posts.find(y => y.id === id), p = x && all.find(y => y.id === x.pid); if (!x || !p) return;
    pub[id] = { id: id, dn: dpSplit(x.key).dn, g: x.key.slice(0, 5), office: p.office, tn: x.tn, text: x.text, help: x.help, card: dpCard(p) };
    L[p.id] = (L[p.id] || []).filter(m => m >= dpAddMonths(wk, -3).slice(0, 7)).concat(L[p.id] && L[p.id].indexOf(mon) >= 0 ? [] : [mon]);
  });
  P.setProperty('DP_BEST', JSON.stringify({ w: wk, top: B.top, byG: B.byG, posts: pub }));
  P.setProperty('DP_BEST_LOG', JSON.stringify(L));
  dpPickReset();
  return ids.length;
}
/** 브리핑 메일 보낸 뒤: 파트너마다 그날 보인 수를 한 줄로 */
function dpImpFlush(day, cnt) {
  const ids = Object.keys(cnt || {}); if (!ids.length) return;
  const sh = dpSheet(SH_DPE); ids.forEach(id => sh.appendRow([day, 'imp', id, 'mail', cnt[id], '']));
}


/* ---------- 모닝 브리핑 자동결제(빌링) — 위 공용 빌링(billToss·billIssue·billCharge)을 함께 써요. BILLING_OPEN·PAID_OPEN 이 모두 켜져야 돌아요 ----------
   ① 7일 무료 체험은 지금처럼 카드 없이 시작(briefTrial 그대로).
   ② 체험 5일째(남은 날 3일)에 한 번: "이틀 뒤 체험이 끝나요. 카드를 등록하면 끊김 없이 계속 받아요." + 카드 등록 링크(구독 관리 ?card=1).
   ③ 체험 중에 카드를 등록하면 첫 달 반값(요금제마다 50%, 10원 아래 버림 — 기본 3,900원 → 1,950원). 체험이 끝난 뒤 등록하면 바로 정가 결제.
   ④ 등록할 때 "○월 ○일부터 매월 ○○원 자동 결제"(첫 달 반값이면 함께) 동의를 따로 받고 '자동결제동의' 시트에 문구 그대로 남김. 결제마다 7일 전 안내 메일
      (등록한 날부터 첫 결제까지 7일이 안 되면 등록 확인 메일이 그 안내를 겸함). 해지는 [자동 결제 해지] 버튼 하나 — 이미 낸 기간 끝까지 받음.
   ⑤ 체험이 끝났는데 카드가 없으면 브리핑은 멈추고 "다시 받으려면 카드 등록" 메일을 딱 한 번만(브리핑구독 [만료알림] 칸 END1). 그 뒤로는 아무 메일도 안 보냄.
   ⑥ 결제 실패: 3일 동안 날마다 다시 시도·안내 → 그래도 안 되면 멈춤(메일 한 번). 일회성 이용권 결제(briefOrder·briefConfirm)는 그대로 남김.
   한 번 결제할 때마다 '브리핑구독'에 이용 행(30일)을 새로 만들고, 다음 결제일 = 그 행 끝난 다음 날. */
const SH_BRA = '브리핑자동결제';
const BRAH = ['회원', '상태', '요금제', '카드', '첫결제일', '다음결제일', '첫달반값', '실패일', '해지예정일', '등록일', '수정일', '알림', '중개사번호', '메모'];
const BRAC = Object.fromEntries(BRAH.map((h, i) => [h, i]));
const BRA_ST = { card: '카드대기', ok: '정상', retry: '재시도', stop: '멈춤', bye: '해지예정', end: '해지' };
const BR_BILL_ACTIONS = { briefBillStart: 1, briefBillIssue: 1, briefBillCancel: 1 };
const BR_HALF = 0.5, BR_NOTICE = 7;
function baUid(k) { return 'b' + hashOf('brU|' + k).slice(1, 25); }
function baRows() { return dpRows(SH_BRA); }
function baOf(k) { const uh = baUid(k); return baRows().filter(o => String(o.r[BRAC['회원']]) === uh).pop() || null; }
function baSet(row, h, v) { uSheet(SH_BRA, BRAH).getRange(row, BRAC[h] + 1).setValue(v); }
function baAmt(P, half) { return half ? Math.floor(P.amount * BR_HALF / 10) * 10 : P.amount; }
function baPayText(P, firstYmd, half) {
  const d = String(firstYmd).split('-');
  return `${+d[1]}월 ${+d[2]}일부터 매월 ${P.amount.toLocaleString()}원이 자동 결제돼요` + (half ? `(첫 달은 반값 ${baAmt(P, true).toLocaleString()}원)` : '');
}
/** 화면에 보여 줄 자동결제 상태(빌링키 없음) */
function baBillPub(k) {
  const o = baOf(k); if (!o) return { on: billOn(), st: '' };
  const r = o.r, P = BRIEF_PRICE[String(r[BRAC['요금제']])] || null, nx = dpDay(r[BRAC['다음결제일']]), half = r[BRAC['첫달반값']] === true || String(r[BRAC['첫달반값']]) === 'Y';
  const first = dpDay(r[BRAC['첫결제일']]), st = String(r[BRAC['상태']]);
  return { on: billOn(), st: st, product: String(r[BRAC['요금제']]), label: P ? P.label : '', card: dpTxt(r[BRAC['카드']]), next: nx, endAt: dpDay(r[BRAC['해지예정일']]),
    payText: P && nx && (st === BRA_ST.ok || st === BRA_ST.retry) ? baPayText(P, nx, half && nx === first) : '' };
}
/** 지금 받는 중인 행(체험·이용)의 끝 다음 날, 없으면 오늘 — 첫 결제일. 체험 중이고 예전에 자동 결제를 한 적 없으면 첫 달 반값 */
function baFirst(k) {
  const now = new Date(), act = myBriefs(k).map(o => briefState(o, now)).filter(s => s.active);
  const le = lastEnd(k), t = kstToday(), first = le && le >= t ? ymd(addDays(le, 1)) : ymd(t);
  const inTrial = act.some(s => s.tier === 'trial'), ever = !!baOf(k) && !!dpDay(baOf(k).r[BRAC['첫결제일']]) && String(baOf(k).r[BRAC['상태']]) !== BRA_ST.card;
  return { first: first, half: inTrial && !ever, now: first <= ymd(t) };
}
function baBillDispatch(b) {
  try {
    if (!billOn()) throw billClosedErr();
    if (b.action === 'briefBillIssue') return baBillIssue(b);           // 토스 호출은 잠금 밖
    return withLock(() => {
      if (b.action === 'briefBillStart') return baBillStart(b);
      if (b.action === 'briefBillCancel') return baBillCancel(b);
      return { ok: false, err: 'unknown' };
    });
  } catch (x) { return { ok: false, err: String(x.message || x), code: x.code || '' }; }
}
/** 카드 등록 시작: 요금제·자동 결제 동의를 받아 고객키를 줌(화면이 토스 카드 인증 창을 엶) */
function baBillStart(b) {
  const u = sessionUser(b.s), P = BRIEF_PRICE[b.product];
  if (!P || !P.show) throw new Error('요금제를 다시 골라 주세요.');
  if (!myBriefs(u.k).length) throw new Error('먼저 7일 무료 체험을 시작해 주세요.');
  let bn = ''; if (P.broker) { const x = bBrokerNo(b.broker); if (!x.ok) throw new Error(x.err + ' 중개사 요금제는 중개사 전용 할인가라서 등록번호를 확인해요.'); bn = x.norm; }
  const f = baFirst(u.k), text = baPayText(P, f.first, f.half);
  if (b.agree !== true) throw new Error(`자동 결제 동의에 따로 체크해 주세요. (${text})`);
  const sh = uSheet(SH_BRA, BRAH), uh = baUid(u.k), o = baOf(u.k), now = new Date();
  if (o && [BRA_ST.ok, BRA_ST.retry].indexOf(String(o.r[BRAC['상태']])) >= 0 && !b.recard) throw new Error('이미 자동 결제를 쓰고 있어요. 카드를 바꾸려면 [카드 바꾸기]를 눌러 주세요.');
  const vals = { '회원': uh, '상태': o && b.recard ? String(o.r[BRAC['상태']]) : BRA_ST.card, '요금제': String(b.product), '첫결제일': o && b.recard ? o.r[BRAC['첫결제일']] : f.first,
    '다음결제일': o && b.recard ? o.r[BRAC['다음결제일']] : f.first, '첫달반값': o && b.recard ? o.r[BRAC['첫달반값']] : (f.half ? 'Y' : ''), '등록일': now, '수정일': now, '중개사번호': bn };
  if (o) Object.keys(vals).forEach(h => baSet(o.row, h, vals[h]));
  else sh.appendRow(BRAH.map(h => h in vals ? vals[h] : ''));
  billAgreeLog('BR', uh, text + ' · ' + P.name);
  const ck = (o && b.recard && (billKeyGet('BR', uh) || {}).ck) || billNewCk('BR', uh);
  return { ok: true, ck: ck, payText: text, first: f.first, half: f.half, clientKey: String(PropertiesService.getScriptProperties().getProperty('TOSS_BILLING_CLIENT_KEY') || '') };
}
/** 카드 인증 뒤: authKey → billingKey. 첫 결제일이 오늘이면(체험이 이미 끝남) 바로 결제 */
function baBillIssue(b) {
  const u = sessionUser(b.s), uh = baUid(u.k), o = baOf(u.k);
  if (!o) throw new Error('카드 등록을 처음부터 다시 해 주세요.');
  const x = billIssue('BR', uh, b.authKey, b.customerKey);
  if (!x.ok) throw new Error(x.msg);
  return withLock(() => {
    const o2 = baOf(u.k), st = String(o2.r[BRAC['상태']]);
    baSet(o2.row, '카드', x.card || '등록됨'); baSet(o2.row, '수정일', new Date());
    if (st === BRA_ST.card || st === BRA_ST.stop || st === BRA_ST.end || st === BRA_ST.bye) { baSet(o2.row, '상태', BRA_ST.ok); baSet(o2.row, '해지예정일', ''); }
    const P = BRIEF_PRICE[String(o2.r[BRAC['요금제']])], nx = dpDay(o2.r[BRAC['다음결제일']]), t = ymd(new Date());
    let charged = null;
    if (nx <= t || st === BRA_ST.retry || st === BRA_ST.stop) charged = baCharge(baOf(u.k), t);
    const pub = baBillPub(u.k), to = baEmail(u.k);
    if (to && !charged) dpMailTo(to, `[${SITE_NAME}] 자동 결제 카드를 등록했어요`, `<b>${bEsc(pub.payText)}</b>.<br>${BRIEF_NAME}이 끊김 없이 이어져요. 결제 7일 전에 다시 알려 드려요(첫 결제가 7일 안이면 이 메일이 그 안내예요).<br>해지는 내 구독 관리의 [자동 결제 해지] 버튼 하나면 돼요: <a href="${BRIEF_WEB}manage/">${BRIEF_WEB}manage/</a>`);
    return { ok: true, bill: baBillPub(u.k), charged: charged ? charged.ok : null, msg: charged && !charged.ok ? charged.msg : '' };
  });
}
/** 자동 결제 해지(버튼 하나): 다음 결제부터 멈춤, 이미 낸 기간 끝까지 받음. undo 면 되돌리기 */
function baBillCancel(b) {
  const u = sessionUser(b.s), o = baOf(u.k); if (!o) throw new Error('자동 결제 정보를 찾지 못했어요.');
  const st = String(o.r[BRAC['상태']]);
  if (b.undo) { if (st !== BRA_ST.bye) throw new Error('해지 예정이 아니에요.'); baSet(o.row, '상태', BRA_ST.ok); baSet(o.row, '해지예정일', ''); return { ok: true, bill: baBillPub(u.k) }; }
  if (st === BRA_ST.card) { baSet(o.row, '상태', BRA_ST.end); billKeyPut('BR', baUid(u.k), null); return { ok: true, bill: baBillPub(u.k) }; }
  const le = lastEnd(u.k), endAt = le ? ymd(le) : ymd(new Date());
  baSet(o.row, '상태', BRA_ST.bye); baSet(o.row, '해지예정일', endAt); baSet(o.row, '수정일', new Date());
  const to = baEmail(u.k); if (to) dpMailTo(to, `[${SITE_NAME}] 자동 결제 해지를 접수했어요`, `${endAt}까지 지금처럼 받고, 그 뒤에는 결제되지 않아요. 마음이 바뀌면 그 전에 내 구독 관리에서 [해지 취소]를 누르면 돼요.<br><a href="${BRIEF_WEB}manage/">${BRIEF_WEB}manage/</a>`);
  return { ok: true, endAt: endAt, bill: baBillPub(u.k) };
}
function baEmail(k) { const em = myBriefs(k).filter(x => String(x.r[BC['채널']]) === 'email' && String(x.r[BC['연락처']] || '')).pop(); return em ? String(em.r[BC['연락처']]).replace(/^'/, '') : ''; }
function baKOf(uh) { const s = {}; let k = ''; bRows().some(o => { const kk = String(o.r[BC['카카오id']]); if (s[kk]) return false; s[kk] = 1; if (baUid(kk) === uh) { k = kk; return true; } return false; }); return k; }
/** 한 번 결제 → 성공하면 '브리핑구독'에 30일 이용 행을 만들고 다음 결제일을 그 끝 다음 날로 */
function baCharge(o, t) {
  const r = o.r, uh = String(r[BRAC['회원']]), k = baKOf(uh), P = BRIEF_PRICE[String(r[BRAC['요금제']])];
  if (!k || !P) { baSet(o.row, '상태', BRA_ST.stop); baSet(o.row, '메모', '회원·요금제를 찾지 못함'); return { ok: false, msg: '회원 정보 없음' }; }
  const first = dpDay(r[BRAC['첫결제일']]), nx = dpDay(r[BRAC['다음결제일']]), half = (String(r[BRAC['첫달반값']]) === 'Y' || r[BRAC['첫달반값']] === true) && nx === first;
  const amt = baAmt(P, half), last = myBriefs(k).filter(x => String(x.r[BC['연락처']] || '')).pop();
  const x = billCharge('BR', uh, amt, P.name + (half ? ' (첫 달 반값)' : '') + ' 자동 결제', baEmail(k), '');
  if (x.ok && last) {
    const ct = { norm: String(last.r[BC['연락처']]).replace(/^'/, ''), mask: String(last.r[BC['연락처가림']]) };
    const id = newBriefRow({ k: k }, P, BST.on, String(last.r[BC['채널']]), ct, last.r[BC['광고동의']] === true, x.oid);
    const row = bRows().find(y => String(y.r[BC['id']]) === id), le = lastEnd(k), tt = kstToday();
    const start = le && le >= tt ? addDays(le, 1) : tt;
    setB(row.row, '시작일', ymd(start)); setB(row.row, '만료일', ymd(addDays(start, P.days - 1))); setB(row.row, '결제액', amt);
    if (String(r[BRAC['중개사번호']] || '')) { setB(row.row, '중개사번호', String(r[BRAC['중개사번호']])); setB(row.row, '중개사확인', BROKER_REVIEW.wait); }
    baSet(o.row, '상태', BRA_ST.ok); baSet(o.row, '다음결제일', ymd(addDays(start, P.days))); baSet(o.row, '실패일', ''); baSet(o.row, '수정일', new Date());
    const to = baEmail(k); if (to) dpMailTo(to, `[${SITE_NAME}] ${BRIEF_NAME} ${amt.toLocaleString()}원 결제했어요`, `${bEsc(P.name)}${half ? '(첫 달 반값)' : ''} ${amt.toLocaleString()}원을 자동 결제했어요. 이용 기간 ${ymd(start)} ~ ${ymd(addDays(start, P.days - 1))}.<br>해지는 내 구독 관리의 [자동 결제 해지] 버튼 하나면 돼요: <a href="${BRIEF_WEB}manage/">${BRIEF_WEB}manage/</a>`);
    return { ok: true };
  }
  if (!dpDay(r[BRAC['실패일']])) baSet(o.row, '실패일', t);
  baSet(o.row, '상태', BRA_ST.retry); baSet(o.row, '수정일', new Date());
  const to = baEmail(k); if (to) dpMailTo(to, `[${SITE_NAME}] ${BRIEF_NAME} 결제가 되지 않았어요`, `${amt.toLocaleString()}원 결제가 되지 않았어요(${bEsc(x.msg || '카드사 거절')}). ${DP_RULE.retryDays}일 동안 날마다 다시 시도해요. 카드를 바꾸려면 내 구독 관리에서 [카드 바꾸기]를 눌러 주세요.<br><a href="${BRIEF_WEB}manage/">${BRIEF_WEB}manage/</a>`);
  return { ok: false, msg: x.msg };
}
/** 매일(briefDaily 맨 앞 — 결제된 사람은 그날 아침 브리핑부터 받게): 결제 7일 전 안내·정기 결제·실패 다시 시도·해지 예정 마무리·카드대기 정리 */
function baBillDaily(now) {
  if (!billOn() || !book().getSheetByName(SH_BRA)) return 0;
  const t = ymd(now || new Date());
  let n = 0;
  baRows().forEach(o => {
    const r = o.r, st = String(r[BRAC['상태']]), nx = dpDay(r[BRAC['다음결제일']]), notes = String(r[BRAC['알림']] || '');
    const add = k => baSet(o.row, '알림', (notes + ' ' + k).trim().split(' ').slice(-12).join(' '));
    if (st === BRA_ST.card && r[BRAC['등록일']] instanceof Date && Date.now() - r[BRAC['등록일']].getTime() > 86400000) { baSet(o.row, '상태', BRA_ST.end); billKeyPut('BR', String(r[BRAC['회원']]), null); return; }
    if (st === BRA_ST.bye) { if (dpDay(r[BRAC['해지예정일']]) < t) { baSet(o.row, '상태', BRA_ST.end); billKeyPut('BR', String(r[BRAC['회원']]), null); } return; }
    if (st === BRA_ST.ok && nx) {
      const left = Math.round((dpDayMs(nx) - dpDayMs(t)) / 86400000);
      if (left === BR_NOTICE && notes.indexOf('pay|' + nx) < 0) {
        const k = baKOf(String(r[BRAC['회원']])), P = BRIEF_PRICE[String(r[BRAC['요금제']])], half = String(r[BRAC['첫달반값']]) === 'Y' && nx === dpDay(r[BRAC['첫결제일']]);
        const to = k ? baEmail(k) : '';
        if (to && P) { dpMailTo(to, `[${SITE_NAME}] 7일 뒤 ${BRIEF_NAME} 이용료가 자동 결제돼요`, `<b>${nx.slice(5).replace('-', '월 ')}일에 ${baAmt(P, half).toLocaleString()}원</b>이 자동 결제돼요(${bEsc(P.name)}${half ? ', 첫 달 반값' : ''}).<br>원하지 않으면 그 전에 내 구독 관리에서 [자동 결제 해지]를 한 번 누르면 돼요. 이미 받은 기간은 끝까지 받아요.<br><a href="${BRIEF_WEB}manage/">${BRIEF_WEB}manage/</a>`); add('pay|' + nx); n++; }
      }
      if (nx <= t) { baCharge(o, t); n++; }
      return;
    }
    if (st === BRA_ST.retry) {
      const step = dpFailStep(dpDay(r[BRAC['실패일']]) || t, t);
      if (step === 'retry') { if (notes.indexOf('try|' + t) < 0) { add('try|' + t); baCharge(baRows().find(x => x.row === o.row), t); n++; } return; }
      baSet(o.row, '상태', BRA_ST.stop);
      const k = baKOf(String(r[BRAC['회원']])), to = k ? baEmail(k) : '';
      if (to) dpMailTo(to, `[${SITE_NAME}] 결제가 되지 않아 ${BRIEF_NAME}을 멈췄어요`, `${DP_RULE.retryDays}일 동안 다시 시도했지만 결제가 되지 않았어요. 카드를 다시 등록하면 바로 이어서 받아요: <a href="${BRIEF_WEB}manage/?autopay=1">${BRIEF_WEB}manage/?autopay=1</a><br>이 메일 뒤로는 결제 안내를 보내지 않아요.`);
      n++;
    }
  });
  return n;
}
/** 체험 안내(빌링이 열려 있을 때만, briefExpiry 에서): 5일째 한 번 + 체험이 끝났는데 카드가 없으면 딱 한 번. 돌려줌: 처리했으면 true(기존 D-3·D-0 안내는 건너뜀) */
function baTrialMail(o, s, now) {
  if (!billOn() || s.tier !== 'trial') return false;
  const k = String(o.r[BC['카카오id']]), bs = baOf(k), has = bs && [BRA_ST.ok, BRA_ST.retry, BRA_ST.card].indexOf(String(bs.r[BRAC['상태']])) >= 0;
  const tags = String(o.r[BC['만료알림']] || ''), to = String(o.r[BC['연락처']] || '').replace(/^'/, '');
  if (s.active && s.left === 3 && !has && tags.indexOf('T5') < 0 && s.channel === 'email' && to) {
    const P = BRIEF_PRICE.brief;
    dpMailTo(to, `[${SITE_NAME}] 이틀 뒤 ${BRIEF_NAME} 체험이 끝나요`, `이틀 뒤(${s.end}) 무료 체험이 끝나요. <b>카드를 등록하면 끊김 없이 계속 받아요.</b><br>체험 중에 등록하면 첫 달은 반값이에요(기본 요금제 ${baAmt(P, true).toLocaleString()}원, 다른 요금제도 첫 달 50%). 결제일·금액은 등록 화면에 크게 보여 드리고 따로 동의를 받아요.<br><a href="${BRIEF_WEB}manage/?autopay=1" style="display:inline-block;margin-top:8px;background:#2F6BFF;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:700">카드 등록하고 계속 받기</a><br>등록하지 않으면 체험이 끝나는 날 브리핑이 멈추고, 그 뒤 한 번만 안내를 드려요.`);
    setB(o.row, '만료알림', (tags + ' T5').trim());
    return true;
  }
  return s.active;                                                    // 체험 중에는 기존 D-3·D-0 안내 대신 이 안내만
}
/** 체험이 끝난 사람(카드 없음·다른 이용 없음)에게 딱 한 번: 브리핑을 멈췄고 다시 받으려면 카드 등록. 그 뒤로는 보내지 않음 */
function baTrialEnded(now) {
  if (!billOn()) return 0;
  const t = kstToday(); let n = 0;
  bRows().forEach(o => {
    const s = briefState(o, now); if (s.tier !== 'trial' || s.active) return;
    const e = dOnly(o.r[BC['만료일']]); if (!e || e >= t || addDays(e, 3) < t) return;          // 끝난 뒤 3일 안에만(늦게 켜도 오래전 체험자에게 보내지 않게)
    const tags = String(o.r[BC['만료알림']] || ''), k = String(o.r[BC['카카오id']]), to = String(o.r[BC['연락처']] || '').replace(/^'/, '');
    if (tags.indexOf('END1') >= 0 || s.channel !== 'email' || !to) return;
    if (myBriefs(k).some(x => briefState(x, now).active)) { setB(o.row, '만료알림', (tags + ' END1').trim()); return; }
    const bs = baOf(k); if (bs && [BRA_ST.ok, BRA_ST.retry].indexOf(String(bs.r[BRAC['상태']])) >= 0) return;
    dpMailTo(to, `[${SITE_NAME}] ${BRIEF_NAME} 체험이 끝나 발송을 멈췄어요`, `무료 체험이 끝나서 브리핑 발송을 멈췄어요. 다시 받으려면 카드를 등록해 주세요: <a href="${BRIEF_WEB}manage/?autopay=1">${BRIEF_WEB}manage/?autopay=1</a><br>이 안내는 한 번만 보내요. 앞으로 따로 메일을 보내지 않아요.`);
    setB(o.row, '만료알림', (tags + ' END1').trim()); n++;
  });
  return n;
}
/** 자동결제 바로 멈춤(구독 해지·회원 탈퇴): 상태 '해지' + 빌링키 지우기 */
function baStopAll(k) {
  if (!book().getSheetByName(SH_BRA)) return;
  const o = baOf(k); if (!o) return;
  if (String(o.r[BRAC['상태']]) !== BRA_ST.end) { baSet(o.row, '상태', BRA_ST.end); baSet(o.row, '수정일', new Date()); }
  billKeyPut('BR', baUid(k), null);
}
