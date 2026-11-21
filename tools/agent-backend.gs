/**
 * 장대장 공인중개사 제휴 — 구글 시트 + Apps Script 백엔드 (v38: 광고 문의 희망 기간 8주(2개월) / v37: 광고 하루 단위 판매 없앰·브리핑광고 7일 미만 경고 / v36: 광고 문의 홈·카테고리 상단 배너 / v35: 보고서 받을 이메일 칸 / v34: 주간 현장 보고서 자동 발송 / v33: 공인중개사가 아닌 전문가 필수 칸 줄임 / v32: 시행사 새 상품 신청 키 — 주간 현장 보고서 기본·잠금형·광고 지역 추천 / v31: 메일 광고는 광고성 정보·이른 아침 두 동의 모두 / v30: 장대장TV 주간 유튜브 키트 / v29: 모닝 브리핑 메일 광고 — 이른 아침 광고 동의·(광고) 제목·수신 거부 / v28: 중개사 도구 이용 수 — 매물 설명서·주간 블로그·인스타 글 / v27: 중개사 플러스 — 내 손님 브리핑·주간 시장 리포트 / v26: 모닝 브리핑 요금제 4단계·요금제 바꾸기·중개사 등록번호 확인·친구 초대 보상 / v25: 모닝 브리핑 새 정책·교통·공급 발표 / v24: 모닝 브리핑 2단계·광고주용 익명 구독자 통계 / v23: 시행사 신청 상품 이름 — 분석 브로슈어·자료 팩 / v22: 집예보 모닝 브리핑 이름·전국 시장 칸 / v21: 전문가 이름 리포트 유형 확대 / v20: 집예보 분양대행 — 전속 의뢰·판매 파트너·계약 보고·정산 / v19: 중개사 업무 도구)
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
 *  - 광고·제휴 문의(adInquiry) 관심 상품에 시행사 페이지(pro/developer/) 상품 키 두 개 추가: brochure '집예보 분석 브로슈어(잠금형)',
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
const SITE_NAME = '집예보';
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
  if (act === 'briefConfig') return out({ ok: true, channels: briefChannels(), price: BRIEF_PRICE, trial: BRIEF_TRIAL });
  if (act === 'briefAreas') return out(briefAreas(e.parameter));
  if (act === 'briefInterest') return out(briefInterest(e.parameter));
  if (act === 'briefPublic') return out(briefPublic());
  if (act === 'briefAd') return out({ ok: true, ad: briefAdToday(new Date()) });     // v29 웹 브리핑 광고 자리(공개 정보만)
  if (act === 'briefAdOff') return briefAdOff(e.parameter);                         // v29 메일 광고 수신 거부(원클릭)
  if (act === 'briefStats') return out(briefStats(e.parameter));
  if (act === 'briefSeen') return out(briefSeen(e.parameter));
  if (act === 'bpPull') return out(bpPull(e.parameter));
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
  if (b.action === 'log') return out(logEvents(b));
  if (b.action === 'ytKitPut') return out(ytKitPut(b));            // v30 장대장TV 주간 유튜브 키트(엔진 → 시트)
  if (PAY_ACTIONS[b.action]) return out(payDispatch(b));
  if (b.action === 'adApply' || b.action === 'adInquiry' || b.action === 'adLead') return out(adDispatch(b));
  if (USER_ACTIONS[b.action]) return out(userDispatch(b));
  if (AGT_ACTIONS[b.action]) return out(agtDispatch(b));
  if (BRIEF_ACTIONS[b.action]) return out(briefDispatch(b));
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
function logEvents(b) {
  const ev = (b.events || []).slice(0, 40);
  const vid = str(b.vid, 40), now = new Date();
  const rows = [];
  ev.forEach(x => {
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
  return { ok: true, n: rows.length };
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
const SITE_URL = 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/switch/';
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
      to: email, name: '장대장 갈아타기 알림',
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
    <p><a href="${SITE_URL}">장대장 갈아타기 계산기로 가기</a></p></div>`);
}

function mailHtml(title, body, id, token) {
  const unsub = ScriptApp.getService().getUrl() + `?action=unsub&id=${id}&t=${token}`;
  return `<div style="font-family:'Noto Sans KR',sans-serif;max-width:560px;margin:auto;background:#FFFFFF;border:1px solid #E5E8EB;border-radius:12px;overflow:hidden">
    <div style="background:#2F6BFF;color:#FFFFFF;padding:14px 18px;font-weight:900"><span style="color:#F3E3B0">★</span> 집예보 <span style="color:#FBF8EF">갈아타기 알림</span></div>
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
        to: r[AC['이메일']], name: '장대장 갈아타기 알림',
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
  if (!contacted(a, vid)) throw new Error('이 공인중개사에게 장대장 리포트에서 전화·카카오톡으로 문의한 뒤 12시간이 지나야 리뷰를 남길 수 있어요.');
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
    MailApp.sendEmail(ad.mail, `[집예보 분양 상담 신청] ${ad.live.n}`,
      `집예보에서 ${ad.live.n} 분양 상담 신청이 들어왔어요.\n\n이름: ${name}\n연락처: ${phone}\n연락받기 좋은 시간: ${time}\n문의: ${memo || '-'}\n신청 번호: ${id} (${t0})\n\n`
      + `이 정보는 신청자가 '${co}'에 대한 제3자 제공에 동의해 전달하는 것입니다.\n`
      + `· 분양 상담 연락 목적 외에 쓰거나 다른 곳에 넘길 수 없습니다(문자·전화 광고 목록 등록 금지).\n· 연락은 오전 8시~오후 9시에만 해 주세요.\n`
      + `· 상담이 끝나거나 받은 날로부터 6개월이 지나면 파기해 주세요. 신청자가 삭제를 원하면 바로 지워 주세요.\n— 집예보 ((주)장대장부동산그룹)`);
    sent = '메일 전달';
  } catch (e) { sent = '전달 실패(수동 전달 필요)'; }
  row[LDC['전달상태']] = sent; row[LDC['전달일']] = sent === '메일 전달' ? now : '';
  row[LDC['파기예정일']] = ymd(new Date(now.getTime() + AD_LEAD_KEEP_DAYS * 86400000));
  ldSheet().appendRow(LDH.map((h, i) => row[i] === undefined ? '' : cellSafe(String(row[i] instanceof Date ? '' : row[i])) || row[i]));
  cache.put(dk, String(n + 1), 86400); cache.put(pk, String(pn + 1), 86400);
  if (NOTIFY) { try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[집예보 분양 상담] ${ad.live.n}`, `신청 번호 ${id} · 광고주 ${co} · ${sent}\n연락처는 '분양상담' 시트에서만 확인하세요(메일에는 넣지 않아요).\n${book().getUrl()}`); } catch (e) {} }
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
                  brochure: '집예보 분석 브로슈어(잠금형)', datapack: '현장 자료 팩(편집형)',
                  weekly_report: '주간 현장 보고서(기본)', weekly_locked: '주간 현장 보고서(잠금형)', ad_target: '광고 지역 추천 리포트' };   // pro/developer/ 신청(시행사·분양대행사) — 'etc'와 함께 와요 (v23 brochure·datapack, v32 weekly_report·weekly_locked·ad_target)
AQ_PROD.brief_ad = BRIEF_NAME + ' 지면 광고';
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
   카카오 로그인 회원 (v14) — 집예보 웹(login/ · mine/ · buy/report/)
   흐름: 화면에서 Kakao.Auth.authorize → login/ 으로 인가 코드(code) 도착 → kakaoLogin
         → 서버가 REST API 키로 토큰 받기 → /v2/user/me 로 회원번호·닉네임 확인 → 카카오 토큰은 바로 만료(저장 안 함)
         → 서버가 만든 무작위 세션 토큰을 화면에 주고, 시트에는 그 해시만 저장
   저장: '회원'(카카오 회원번호·닉네임·저장 자료) · '세션'(세션 해시) · '관심알림'(알림 신청) — 탈퇴 시 세 시트에서 바로 삭제
   ===================================================================== */
const USER_ACTIONS = { kakaoLogin: 1, userLoad: 1, userSave: 1, alertSubscribe: 1, userLogout: 1, userDelete: 1 };
const KAKAO_REDIRECTS = ['https://chrisjangdaejang-ux.github.io/jangdaejang-calc/login/'];
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
function cleanUserData(d) {
  d = d && typeof d === 'object' ? d : {};
  const uniq = (arr, key) => { const seen = {}; return arr.filter(x => { const k = key(x); if (seen[k]) return false; seen[k] = 1; return true; }); };
  const pk = x => [x.code, x.dong, x.jibun, x.apt, x.band].join('|');
  const out = {
    v: 1,
    homes: uniq((Array.isArray(d.homes) ? d.homes : []).slice(0, 10).map(x => cleanPlace(x, true)).filter(Boolean), pk).slice(0, 5),
    favs: uniq((Array.isArray(d.favs) ? d.favs : []).slice(0, 40).map(x => cleanPlace(x, false)).filter(Boolean), pk).slice(0, 30),
    reports: uniq((Array.isArray(d.reports) ? d.reports : []).slice(0, 20).map(cleanReport).filter(Boolean), x => x.id || x.t).slice(0, 10),
    areas: cleanAreas(d.areas),
    brief: cleanBrief(d.brief)
  };
  const json = JSON.stringify(out);
  if (json.length > USER_DATA_MAX) throw new Error('저장할 자료가 너무 많아요. 리포트나 관심 단지를 조금 지운 뒤 다시 저장해 주세요.');
  return out;
}
function userAlerts(k) {
  const sh = book().getSheetByName(SH_UA); if (!sh) return [];
  return sh.getDataRange().getValues().slice(1).filter(r => String(r[ALC['카카오id']]) === k && r[ALC['상태']] === '신청')
    .map(r => ({ id: String(r[ALC['id']]), kind: String(r[ALC['종류']]), key: String(r[ALC['대상키']]), name: String(r[ALC['대상이름']]).replace(/^'/, ''), at: r[ALC['신청일']] instanceof Date ? ymd(r[ALC['신청일']]) : String(r[ALC['신청일']]).slice(0, 10) }));
}

function userLoad(b) {
  const u = sessionUser(b.s);
  const d = u.data && typeof u.data === 'object' ? u.data : {};
  return { ok: true, nick: u.nick, data: { v: 1, homes: d.homes || [], favs: d.favs || [], reports: d.reports || [], areas: d.areas || { list: [], kinds: { notice: true, mu: true }, t: '' }, brief: cleanBrief(d.brief) }, alerts: userAlerts(u.k) };
}
function userSave(b) {
  const u = sessionUser(b.s);
  const data = cleanUserData(b.data);
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
  del(SH_UA, ALC['카카오id']); del(SH_S, SC['카카오id']); del(SH_U, UC['카카오id']);
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
   · 의견 글에는 '집예보 분석/의견'처럼 집예보가 쓴 것처럼 보이는 말을 넣을 수 없음
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
const PRO_FAKE = /집\s*예\s*보\s*(의\s*)?(분석|의견|공식|인증|보증|추천)|장대장\s*(분석|인증|보증)/;
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
  if ([f.office, f.ceo, f.name, f.title].some(x => PRO_FAKE.test(x))) throw new Error('이름·소속에는 집예보가 쓴 것처럼 보이는 말을 넣을 수 없어요.');
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
    if (PRO_FAKE.test(t)) throw new Error('의견에는 집예보가 쓴 것처럼 보이는 말(예: 집예보 분석·집예보 의견)을 넣을 수 없어요. 전문가 의견은 전문가 이름으로 따로 표시돼요.');
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
const BRIEF_ACTIONS = { briefAdPref: 1, briefTrial: 1, briefOrder: 1, briefConfirm: 1, briefMine: 1, briefUpdate: 1, briefStop: 1, briefRefund: 1, briefChangeQuote: 1, briefChange: 1, briefInvite: 1, toolQuota: 1, toolUse: 1 };
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
const BRIEF_WEB = 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/brief/';
const BRIEF_KEEP_DAYS = 30;       // 이용 끝난 뒤 연락처 원문 보관 일수
const BRIEF_MIN_VISITORS = 5;     // 관심도 집계: 방문자 5명 이상인 단지만

/* 회원 저장 자료의 brief: {areas:[{g 시군구 코드, gn 이름, sd 시·도, dn 동(빈 값 = 구 전체)}] 최대 10곳, apts:[관심 단지 이름] 최대 10, v:'pro'|'',
   cy:{score 청약 가점 0~84, nohome 무주택 기간(년)}(선택, 청약 기회 코너), budget·age(선택, 광고주용 익명 통계에만)} */
function cleanBrief(x) {
  x = x && typeof x === 'object' ? x : {};
  const seen = {};
  const areas = (Array.isArray(x.areas) ? x.areas : []).slice(0, BRIEF_MAX.areas + 10).map(a => a && ({ g: /^\d{5}$/.test(String(a.g || '')) ? String(a.g) : '', gn: uText(a.gn, 30), sd: uText(a.sd, 20), dn: uText(a.dn, 20) }))
    .filter(a => a && a.g && a.gn && (!a.dn || /^[가-힣0-9·.]{1,20}$/.test(a.dn)))
    .filter(a => { const k = a.g + '|' + a.dn; if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, BRIEF_MAX.areas);
  const apts = (Array.isArray(x.apts) ? x.apts : []).slice(0, BRIEF_MAX.apts + 10).map(s => uText(s, 40)).filter(Boolean).slice(0, BRIEF_MAX.apts);
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
  const nx = String(r[BC['다음요금제']] || '');
  return { id: String(r[BC['id']]), product: String(r[BC['상품']]), state: st, active: !!active, start: s ? ymd(s) : '', end: e ? ymd(e) : '',
    left: left, channel: String(r[BC['채널']]), contact: String(r[BC['연락처가림']]), ad: r[BC['광고동의']] === true, sent: sent,
    refund: String(r[BC['환불상태']] || ''), refundEst: refundEst, areas: P.areas, apts: P.apts, customers: P.customers || 0, urgPick: !!P.urgPick, weekly: !!P.weekly,
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
  const br = cleanBrief(u.data && u.data.brief);
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
  bConsentApply(c.u.k, { ad: c.ad, am: c.amAd }, '구독 신청 화면');
  const o = bRows().find(x => String(x.r[BC['id']]) === id), t = kstToday();
  setB(o.row, '시작일', ymd(t)); setB(o.row, '만료일', ymd(addDays(t, BRIEF_TRIAL.days - 1)));
  return { ok: true, ref: ref, sub: briefState(bRows().find(x => String(x.r[BC['id']]) === id), new Date()) };
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
  return { ok: true, orderId: id, amount: P.amount, orderName: ('집예보 ' + P.name).slice(0, 100), ref: bRefNote(c.u.k, b.ref) };
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

function briefMine(b) {
  const u = sessionUser(b.s), now = new Date();
  const list = myBriefs(u.k).filter(o => String(o.r[BC['상태']]) !== BST.wait).map(o => briefState(o, now));
  return { ok: true, subs: list, brief: cleanBrief(u.data && u.data.brief), channels: briefChannels(),
    trialUsed: myBriefs(u.k).some(o => bIsTrial(o.r[BC['상품']])), next: (list.filter(x => x.next).pop() || {}).next || '', amAd: bConsentPublic(u.k).am, adc: bConsentPublic(u.k).ad };
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
  return { ok: true, kind: 'now', orderId: id, amount: c.amount, orderName: ('집예보 ' + c.nxt.name + BRIEF_CHG_SUFFIX).slice(0, 100) };
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
function userBriefMap() {
  const sh = book().getSheetByName(SH_U), m = {};
  if (!sh) return m;
  sh.getDataRange().getValues().slice(1).forEach(r => { const d = parseJ(r[UC['저장자료']], {}); m[String(r[UC['카카오id']])] = cleanBrief(d && d.brief); });
  return m;
}
function briefAreas(p) {
  if (!pullOk(p)) return { ok: false, err: 'auth' };
  const now = new Date(), tomorrow = addDays(new Date(), 1), um = userBriefMap(), cnt = {};
  bRows().forEach(o => {
    const s = briefState(o, now), s2 = briefState(o, tomorrow);
    if (!s.active && !s2.active) return;
    ((um[String(o.r[BC['카카오id']])] || {}).areas || []).slice(0, s.areas).forEach(a => { cnt[a.g] = (cnt[a.g] || 0) + 1; });
  });
  try {   // v27 중개사 플러스: 손님 단지가 있는 동네도 매일 최신 두 달을 다시 받게(구독자 수에는 넣지 않음)
    const on = {}; bpActive(now).forEach(x => { on[x.k] = x; });
    bpRows(SH_BPC).forEach(o => { const x = on[String(o.r[BPCC['카카오id']])]; if (x) parseJ(o.r[BPCC['단지']], []).slice(0, x.lim.apts).forEach(a => { if (/^\d{5}$/.test(String(a.g))) cnt[a.g] = cnt[a.g] || 0; }); });
  } catch (e) {}
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
    const sds = {}; (ub.areas || []).slice(0, x.s.areas).forEach(a => { if (a.sd) sds[a.sd] = 1; });
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
    pn: S.pnews && (S.pnews.items || []).length ? S.pnews : null,
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
function briefMail(to, date, pieces, s, pro, M, ub, extra, ad) {
  const title = ((ad ? '(광고) ' : '') + `[${SITE_NAME}] ${date.slice(5).replace('-', '/')} ${BRIEF_NAME} — ${pieces.map(p => p.nm).join(', ')}`).slice(0, 120);
  const body = pieces.map(p => `<div style="border:1px solid #E5E8EB;border-radius:12px;padding:14px 16px;margin:0 0 12px">
      <div style="font-size:17px;font-weight:900;margin:0 0 6px">${bEsc(p.nm)} <span style="font-size:13px;color:#2F6BFF">새 매매 ${p.n}건 · 신고가 ${p.hi}건</span></div>
      ${p.pn ? `<div style="background:#FBF8EF;border:1px solid #EFE6CC;border-radius:10px;padding:10px 12px;margin:0 0 8px"><b style="color:#191F28">내 동네 관련 발표</b> <span style="font-size:12.5px;color:#4E5968">이 동네 이름이 나온 정부·지자체 보도자료</span>${briefPnHtml(p.pn, 3)}</div>` : ''}
      <p style="margin:0 0 6px;line-height:1.6">${bEsc(p.fact)}</p>${p.cmp ? `<p style="margin:0 0 6px;line-height:1.6;color:#3E4754">${bEsc(p.cmp)}</p>` : ''}${p.so ? `<p style="margin:0 0 6px;line-height:1.6;color:#3E4754">${bEsc(p.so)}</p>` : ''}
      ${p.items.length ? '<ul style="margin:6px 0;padding-left:18px;line-height:1.6">' + p.items.map(x => `<li>${bEsc(x)}</li>`).join('') + '</ul>' : ''}
      ${[['급매 레이더', p.urgent], ['전세가율 급변', p.gap], ['상승 전환 신호', p.rise]].filter(x => x[1] && x[1].length).map(x => `<div style="margin:6px 0 0"><b style="font-size:14px">${x[0]}</b><ul style="margin:2px 0 4px;padding-left:18px;line-height:1.6;font-size:14px">${x[1].map(y => `<li>${bEsc(y)}</li>`).join('')}</ul></div>`).join('')}
      ${p.pro.length ? '<div style="background:#F4F7FF;border-radius:10px;padding:10px 12px;margin:8px 0"><b>손님께 할 이야기</b><ol style="margin:6px 0 0;padding-left:18px;line-height:1.6">' + p.pro.map(x => `<li>${bEsc(x)}</li>`).join('') + '</ol></div>' : ''}
      <a href="${p.url}" style="display:inline-block;margin-top:6px;background:#2F6BFF;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:700">전체 브리핑 보기</a></div>`).join('');
  const html = `<div style="font-family:'Noto Sans KR',sans-serif;max-width:600px;margin:auto;color:#191F28">
    <div style="font-weight:900;font-size:19px;margin:6px 0 12px">${bEsc(SITE_NAME)} <span style="color:#2F6BFF">모닝 브리핑</span></div>${extra || ''}${briefMarketHtml(M, ub)}
    ${briefKitHtml(pieces, pro, date)}<div style="font-size:17px;font-weight:900;margin:4px 0 8px">② 내 관심 지역 · ③ 내 관심 단지</div>${body}
    <p style="font-size:12.5px;color:#4E5968;line-height:1.6">국토교통부 실거래 공개 자료에 새로 올라온 거래를 동네별로 모았어요. 신고가는 같은 단지·같은 평형의 이전 최고가를 넘은 거래예요.<br>
    이 메일은 ${bEsc(s.product)}(이용 기간 ${s.start} ~ ${s.end})을 신청하신 분께 보내 드려요. 받는 방법 바꾸기·해지: <a href="${BRIEF_WEB}manage/">${BRIEF_WEB}manage/</a></p>
    <a href="${BRIEF_WEB}manage/" style="display:block;text-align:center;margin:10px 0 0;border:1px solid #2F6BFF;color:#2F6BFF;padding:11px 16px;border-radius:10px;text-decoration:none;font-weight:700">지역·단지 바꾸기</a>${ad ? briefAdMailHtml(ad, s.id) : ''}</div>`;
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
  const um = userBriefMap(), now = new Date(), cache = {}, ch = briefChannels();
  const brief = g => (g in cache) ? cache[g] : (cache[g] = bFetchJson(BRIEF_DATA + g + '.json'));
  const M = bFetchJson(BRIEF_DATA + 'market.json');      // 전국 공통 — 하루 1번만 받아 모든 구독자에게 같은 내용
  const AD = briefAdToday(now);                         // v29 오늘 진행 중인 브리핑 광고(없으면 null) — 메일에는 이른 아침 광고 동의자에게만
  const cxc = {}, cxOf = g => (g in cxc) ? cxc[g] : (cxc[g] = bFetchJson(BRIEF_DATA + 'cx/' + g + '.json'));   // v27 손님 단지 자료 — 동네마다 한 번만 받음
  let sent = 0;
  bRows().forEach(o => {
    const s = briefState(o, now);
    if (!s.active || String(o.r[BC['최근발송일']]).slice(0, 10) === date) return;
    const ub = um[String(o.r[BC['카카오id']])] || { areas: [], apts: [] };
    const myApts = (ub.apts || []).slice(0, s.apts);      // 요금제 표의 관심 단지 수까지만(서버에서 지킴)
    const urg = s.urgPick && ub.urg ? ub.urg : BRIEF_URG.def;   // 급매 기준: 고를 수 있는 요금제만 저장값, 없으면 10%
    const pieces = (ub.areas || []).slice(0, s.areas).map(a => { const S = brief(a.g); return S ? briefPiece(S, a, s.pro, myApts, urg) : null; }).filter(Boolean);
    if (!pieces.length) { bLog([date, s.id, s.channel, '동네 자료 없음', 0]); return; }
    const to = String(o.r[BC['연락처']]).replace(/^'/, '');
    let res = { ok: false, why: '' };
    try {
      if (s.channel === 'email') { pieces.forEach(p => { p.url += `&src=mail&k=${bKey(s.id)}&day=${date}`; });
        let bx = ''; try { bx = bpMailHtml(String(o.r[BC['카카오id']]), cxOf, date); } catch (e) { bx = ''; }
        const withAd = AD && o.r[BC['광고동의']] === true && o.r[BC['아침광고동의']] === true ? AD : null;   // 두 동의(①항 광고성 정보·③항 이른 아침)가 모두 있을 때만
        briefMail(to, (pieces[0] && ix && ix.date) || date, pieces, s, s.pro, M, Object.assign({}, ub, { apts: myApts }), bx, withAd); res = { ok: true, ad: !!withAd }; }
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
    bLog([date, s.id, s.channel, res.ok ? (res.ad ? '보냄(광고 ' + AD.id + ')' : '보냄') : '못 보냄: ' + res.why, pieces.length]);
    if (res.ok) { setB(o.row, '최근발송일', date); setB(o.row, '발송수', s.sent + 1); sent++; }
  });
  briefExpiry(now);
  try { briefAmRecheck(now); } catch (e) {}
  briefCleanup(now);
  P.setProperty('BRIEF_SENT', date);
  return sent;
}
/* 만료 3일 전·마지막 날 안내 (자동 결제 없음 — 이어 받으려면 새 이용권) */
function briefExpiry(now) {
  bRows().forEach(o => {
    const s = briefState(o, now);
    if (!s.active) return;
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
   - 집예보는 중개하지 않고 보수도 받지 않는다: 이용자가 '중개사 연락 받기'에 따로 동의하고 고른(또는 공개 순번 규칙으로 정해진)
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
const AGENT_SITE = 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/agent/my/';

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
    MailApp.sendEmail({ to: to.mail, name: '집예보 중개사 도구', subject: '[집예보] ' + uText(msg.title, 80),
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
    <p>${done ? '중개사 화면에서도 더 이상 연락처가 보이지 않아요.' : '이미 취소했거나 보관 기간이 지나 지워졌을 수 있어요.'}</p><p><a href="https://chrisjangdaejang-ux.github.io/jangdaejang-calc/">집예보로 가기</a></p></div>`);
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
   집예보 분양대행(v20) — 시행사 전속 의뢰 · 분양 현장 · 판매 파트너(대대행) · 계약 보고 · 수수료 정산
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
const PARTNER_SITE = 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/partner/';

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
  ownerMail(`[집예보 분양대행 의뢰] ${company}`, [`접수 번호 ${id}`, `${role} · ${company}`, `현장 ${kind}${units ? ' ' + units + '세대·호실' : ''} · ${stage} · ${permit}`,
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
  ownerMail(`[집예보 판매 파트너 신청] ${name}`, [`파트너 ${id} · ${typeT} · ${area}`, type === 'broker' ? `중개사무소 등록번호 ${reg} — 국가공간정보포털 부동산중개업 조회로 확인하세요.` : '',
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
  ownerMail(`[집예보 분양대행] 현장 판매 신청 ${x['현장명']}`, [`${me['상호']}(${me.id}) → ${x['현장명']}(${x.id})`, `'${SH_PA}' 시트에서 [상태]를 '배정'으로 바꾸면 수수료 조건·자료가 파트너에게 보여요.`]);
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
    throw new Error('이 동·호수는 이미 보고됐어요. 다른 파트너와 겹치면 집예보 분양대행팀이 확인해 연락드려요.');
  const id = newDvId('DL'), r = [];
  r[DLC['id']] = id; r[DLC['보고일']] = new Date(); r[DLC['현장id']] = site; r[DLC['파트너id']] = me.id; r[DLC['계약일']] = date; r[DLC['동호']] = unit;
  r[DLC['계약금액만원']] = amt; r[DLC['고객표시']] = alias; r[DLC['상태']] = '보고'; r[DLC['메모']] = memo;
  sh.appendRow(DLH.map((h, i) => r[i] === undefined ? '' : r[i]));
  ownerMail(`[집예보 분양대행] 계약 보고 ${site}`, [`${me['상호']}(${me.id}) · 현장 ${site} · 계약일 ${date}${unit ? ' · ' + unit : ''}`,
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
/* 주간 리포트 PDF 받기(엔진 → 서버, BRIEF_PULL_TOKEN). 드라이브 '집예보 주간 리포트' 폴더, 링크가 있는 사람만 보기 */
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
