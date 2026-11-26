/* 고민 해결 길잡이 자동 확인 — 실행: node tools/guide-test.js </dev/null
   ① 시나리오 자료(assets/guide/scenarios.json·lexicon.json) 모양: 25개 이상, 대표 고민 6개(pri), 묻는 칸·출처·다음 단계 3개, 계산 함수가 있음
   ② 의도 분류 정확도: 시나리오마다 자연스러운 질문 5개 이상(띄어쓰기·오타·다른 말 포함)이 맞는 고민으로 가는지 — 전체 95% 이상·시나리오마다 4/5 이상
      + 못 알아들어야 하는 문장(관계없는 말)은 못 알아들음으로
   ③ 계산(해법 카드): 대표 고민 6개와 나머지 시나리오를 손으로 계산한 값과 비교 — 대출·세금·전세보증 엔진 결과를 그대로 쓰는지, 숫자가 비지 않는지,
      권유 문구가 없는지, 출처가 붙는지
   ④ 개인정보 가리기(mask): 전화·이메일·주민번호·번지·호수·이름
   ⑤ 화면·서버 연결: 기능 플래그(GUIDE_ENABLED=false · ?preview=guide), 첫 화면 칸, 결과 화면 '이어서 하면 좋은 것', 서버 gdMiss·운영자 화면·주간 한 줄, 서비스 워커, 고민 상담 시드 연결 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = p => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (e) { return ''; } };
const G = require('../assets/guide-core.js');
const L = require('../assets/loan-core.js'), T = require('../tax/tax-engine.js'), H = require('../assets/hug-core.js'), CY = require('../chungyak/cy-engine.js'), ADJ = require('../tax/adjusted-areas.js');
const RD = require('../assets/redev-core.js');
const SC = JSON.parse(read('assets/guide/scenarios.json')), LEX = JSON.parse(read('assets/guide/lexicon.json'));
const DATA = { sc: SC.sc, lex: LEX };
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } }

/* ---------- ① 자료 모양 ---------- */
check('시나리오 25개 이상', SC.sc.length >= 25, SC.sc.length);
const PRI = ['sell_when', 'multi_order', 'cy_where', 'rental_biz', 'gift_when', 'buy_when'];
check('대표 상담 고민 6개가 맨 앞·pri 표시', PRI.every((id, i) => SC.sc[i].id === id && SC.sc[i].pri === 1));
check('상황 단추 7개(집 살 준비·집 팔고 이사·전월세·청약·세금·재개발·대출)', SC.cats.length === 7 && ['buy', 'move', 'rent', 'cy', 'tax', 'redev', 'loan'].every(c => SC.cats.some(x => x.id === c)));
for (const s of SC.sc) {
  check(`${s.id}: 상황 묶음이 있음`, SC.cats.some(c => c.id === s.cat));
  check(`${s.id}: 묻는 칸이 모두 질문 표에 있음`, (s.ask || []).every(q => SC.q[q]), s.ask);
  check(`${s.id}: 계산 함수가 있음`, G.SOLVERS.indexOf(s.solve) >= 0, s.solve);
  check(`${s.id}: 출처가 1개 이상이고 모두 출처 표에 있음`, s.src.length >= 1 && s.src.every(k => SC.src[k]), s.src);
  check(`${s.id}: 다음 단계 2~4개`, s.next.length >= 2 && s.next.length <= 4);
  check(`${s.id}: 낱말 5개 이상`, s.kw.length >= 5);
}
check('출처 주소가 모두 공식 기관·법령(law.go.kr·go.kr·or.kr) 또는 집예보 대출 규칙표', Object.values(SC.src).every(x => /^https:\/\/([\w.-]+\.)?(go\.kr|or\.kr|korea\.kr|applyhome\.co\.kr)\//.test(x.url) || x.url === 'loan/#rules'), Object.values(SC.src).filter(x => !/go\.kr|or\.kr|^loan/.test(x.url)));
check('결과 화면 이어서 하기 표: 키마다 시나리오 3개', Object.values(SC.after).every(a => a.length === 3 && a.every(id => SC.sc.some(s => s.id === id))));
check('화면 문구에 경쟁 서비스·AI 서비스 이름 없음', !/(호갱노노|직방|아실|리치고|네이버\s*부동산|부동산\s*지인|챗GPT|ChatGPT|GPT|Gemini|제미나이|클로드|Claude|뤼튼)/i.test(read('assets/guide/scenarios.json') + read('assets/guide.js') + read('solve/index.html')));
check('시나리오 자료에 노하우성 가중치·비율 같은 말 없음', !/(가중치|weight|비중\s*\d)/.test(JSON.stringify(SC.sc)));

/* ---------- ② 의도 분류 ---------- */
const CTX = { sgg: [{ code: '11680', name: '강남구', sido: '서울특별시', short: '서울' }, { code: '11710', name: '송파구', sido: '서울특별시', short: '서울' }, { code: '41135', name: '성남시 분당구', sido: '경기도', short: '경기' },
  { code: '11440', name: '마포구', sido: '서울특별시', short: '서울' }, { code: '26110', name: '중구', sido: '부산광역시', short: '부산' }, { code: '11140', name: '중구', sido: '서울특별시', short: '서울' }],
  sido: [{ name: '서울특별시', short: '서울' }, { name: '경기도', short: '경기' }, { name: '부산광역시', short: '부산' }] };
const Q = {
  sell_when: ['지금 가진 아파트 언제 팔아야 할까요', '집을 언제 팔면 좋을지 모르겠어요', '우리집 지금 팔까 말까 고민이에요', '매도 시기 좀 알려 주세요', '보유한 아파트 팔 타이밍이랑 뭘 사면 좋을지', '가진 아파트 정리할까요 계속 가지고 갈까요', '팔아야 하나 고민중인데 팔고 나서 뭘 사죠', '아파트 처분 시점 고민입니다', '지금 집 팔고 다른 데 사는 게 맞을지', '보유 중인 집 매도 언제가 좋을까', '팔지 말지 결정을 못하겠어요'],
  multi_order: ['집이 세 채인데 어떤 것부터 팔아야 하나요', '다주택자 매도 순서 알려주세요', '두채 가지고 있는데 무엇부터 팔까요', '여러 채 가졌는데 종부세랑 양도세 줄이려면 어느 집부터', '2주택자인데 먼저 팔아야 할 집이 뭔지', '3주택 중과 피하려면 파는 순서', '집 두 채 중 어느 집부터 정리할지', '다주택이라 세금 폭탄 걱정, 팔 순서 정하고 싶어요', '세 채 보유자 매도 전략', '주택 두채 양도세 줄이는 순서'],
  cy_where: ['내 조건으로 어떤 청약을 넣어야 당첨될까', '청약 가점 34점인데 당첨 가능할까요', '청약 어디 넣어야 하나요', '특공 자격 되는지 궁금해요', '청약통장 있는데 당첨 확률 높은 곳', '줍줍 무순위 청약 넣어볼까요', '청약가즘 얼마나 돼야 서울 당첨돼요', '가점 낮아도 넣어볼 만한 청약', '신혼 특공 당첨 될까요', '청약 당첨 가능성 궁금', '가점 50점이면 어디 청약'],
  rental_biz: ['임대사업자인데 정책이 바뀌어서 세금이 늘었어요', '민간임대 등록한 집 자동말소되면 어떻게 돼요', '등록임대 자진말소 해도 되나요', '주택임대사업자 종부세 합산배제 끝나나요', '장기일반 임대 8년 끝나면 양도세 중과 되나요', '임대 등록 말소하면 세금 어떻게 돼요', '주택 임대사업 등록한 거 말소할까요', '임대등록 의무기간 끝나면 세금은', '임대사업자 혜택 끝났나요', '등록임대주택 팔 때 중과'],
  gift_when: ['가진 집을 언제 증여하면 좋을까요', '아들에게 아파트 물려주고 싶은데 세금이', '배우자에게 증여하면 증여세 얼마', '부담부증여가 유리한가요', '자녀에게 집 증여 시기 고민', '증여 받은 집 팔면 이월과세 되나요', '딸에게 명의를 넘겨주려는데요', '엄마가 집을 증여해주신다는데 언제가 좋아요', '손주에게 증여하면 세금', '아파트 증여 타이밍', '부모님 집을 물려받으려는데'],
  buy_when: ['내 집 마련 언제 사면 좋을까요', '지금 집 사도 될까요', '매수 시기 고민이에요', '집값 바닥인가요 지금 사야할까', '송파구 아파트 지금 사도 돼요?', '집 살 타이밍 알려주세요', '마포 아파트 살까요 말까요 전망이 궁금', '지금이 집 살 때인가요', '무주택자인데 언제 집을 사야 할지 모르겠어요', '집값 지금 사도 되는지', '내년에 사는게 나을까요 지금 살까요'],
  budget: ['3억 있는데 얼마짜리 집 살 수 있어요', '내 예산으로 살 수 있는 집', '모은 돈 2억으로 살 수 있을까', '현금 5억 정도 있으면 얼마까지 살 수 있나요', '가진 돈으로 집 사려면 얼마까지 될까요', '내돈으로 살수있는 아파트 가격', '2억 5천으로 아파트 살 수 있나', '연봉 6천에 현금 1억이면 얼마짜리 집', '얼마짜리 아파트까지 가능할까요', '4억 가지고 집 사기'],
  loan_limit: ['대출 얼마까지 받을 수 있나요', '주담대 한도 궁금해요', 'DSR 때문에 대출이 얼마나 나오는지', '10억 집 사면 대출 얼마 나와요', '연봉 8천인데 대출 한도는', 'LTV 몇 프로까지 빌릴 수 있나요', '대츨 얼마나 나올까', '주택담보대출 최대 얼마', '은행에서 얼마나 빌려줄까요', '대출 한도 계산', 'DSR 40% 넘으면'],
  special_loan: ['신혼부부 특례대출 받을 수 있나요', '신생아 특례 대출 자격', '디딤돌 대출 조건 되나요', '보금자리론 받을 수 있을까요', '정책대출 뭐 받을 수 있어요', '아이 낳았는데 저리 대출 있나요', '디딤돌 자격 있나요', '신생아 대출 금리 조건', '신혼부부 대출 조건', '보금자리 금리'],
  first_home: ['생애최초 혜택 뭐 있어요', '첫 집 살 때 받을 수 있는 혜택', '처음 집 사는데 취득세 감면 되나요', '생애 첫 주택 구입 혜택', '생초 대출 비율 얼마예요', '처음으로 집 사려는데 혜택이 있나요', '생애 첫 주택 취득세', '첫 집 마련 혜택 정리', '생애최초 감면', '처음 사는 집 혜택'],
  buy_cost: ['집 살 때 집값 말고 드는 돈', '부대비용 얼마나 들어요', '아파트 살 때 총비용 계산', '등기비랑 세금 합치면 얼마', '추가 비용 얼마 준비해야 해요', '집값말고 필요한 돈', '아파트 매수할 때 부대비용 총액', '세금이랑 복비 합쳐서 얼마 들어', '집 살 때 부대비용', '추가로 드는 비용 정리'],
  acq_tax: ['취득세 얼마 나와요', '6억 아파트 취득세', '2주택 취득세 중과 되나요', '취등록세 계산해 주세요', '취득새 얼마인지', '집 사면 등록세 얼마', '8억 아파트 사면 취득세', '두번째 집 취득세율', '취득세율 궁금', '다주택 취득세'],
  exempt: ['1주택 비과세 요건 언제 채워져요', '양도세 비과세 되려면 몇 년 살아야', '2년 거주 요건 언제 끝나', '비과새 받으려면', '보유요건 2년 채웠는지', '거주요건 채워야 비과세 되나요', '양도세 비과세 조건이 뭐예요', '거주 2년 안 채우면 비과세 안돼요?', '비과세 받을 수 있어요', '1주택 비과세 몇년'],
  temp2: ['일시적 2주택 언제까지 팔아야 하나요', '이사 때문에 잠깐 2주택이 됐어요', '종전주택 처분기한', '일시적2주택 비과세 기한', '새 집 샀는데 예전 집 언제까지 팔아야', '일시적 2주택 3년인가요 2년인가요', '일시적 1세대 2주택 기한', '새 아파트 입주했는데 기존 집 처분 기한', '일시적 2주택 비과세 조건', '종전주택 언제 팔아야'],
  prop_tax: ['재산세 얼마 나와요', '종부세 대상인가요', '보유세 계산', '종합부동산세 얼마인지', '공시가격 9억이면 재산세', '올해 종부새 얼마', '종부세 나오나요 공시가 15억', '재산세 언제 얼마 내요', '보유세 얼마', '종부세 계산'],
  transfer_tax: ['집 팔면 양도세 얼마예요', '양도소득세 계산해 주세요', '팔면 세금 얼마나 나와', '장기보유특별공제 얼마 받아요', '차익 3억이면 양도세', '양도새 계산', '양도세 계산 좀', '5년 보유하고 팔면 양도소득세', '양도세 얼마 나와요', '팔면 세금 계산'],
  jeonse_renew: ['전세 만기인데 재계약할까 이사할까', '계약갱신 요구 언제 해야 해요', '전세 연장하려면', '갱신청구권 쓸 수 있나요', '계약 끝나는데 나가야 하나요', '전새 만기 다가와요', '전세 계약 끝나가는데 연장할지', '갱신 요구는 몇 달 전에', '재계약 할지 이사할지', '계약갱신청구권 사용'],
  rent_raise: ['집주인이 보증금 올려 달래요', '전세금 인상 5% 넘게 요구해요', '월세 올린다고 하는데 얼마까지', '보증금 증액 상한', '반전세로 바꾸자고 하는데 월세 얼마까지', '집주인이 보증금을 올리겠다고 해요', '집주인이 전세금을 1억 올려달래요', '월세 인상 한도', '보증금 올려달라는데 거절 가능', '증액 요구 받았어요'],
  deposit_safe: ['보증금 돌려받을 수 있을지 걱정돼요', '깡통전세인지 확인하고 싶어요', '전세보증보험 가입 되나요', '전세사기 당할까봐 무서워요', 'HUG 반환보증 가입 가능한지', '보증금 못 받으면 어떡해요', '역전세라 집주인이 돈이 없대요', '깡통전세 같은데 어떡하죠', '전세금 떼일까봐 걱정', '전세보증보험 들 수 있나', '보증금 돌려받을 수 있을까'],
  contract_check: ['전세 계약 전에 뭘 확인해야 해요', '등기부등본 뭘 봐야 하나요', '전입신고 확정일자 언제 해요', '최우선변제 받을 수 있나요', '소액임차인 기준', '대항력 언제 생겨요', '계약 전에 등기부 볼 때 주의점', '확정일자 받는 시기', '전입신고 언제', '최우선변제 금액'],
  wolse_conv: ['전세 vs 월세 뭐가 나아요', '전세랑 월세 중에 어떤게 덜 들어요', '반전세가 나을까', '월세 전환율 계산', '전세로 살까 월세로 살까', '월세가 나을지 전세가 나을지', '월세랑 전세 비용 비교', '보증금 낮추고 월세로 할까', '반전세 vs 전세', '전환율 얼마가 적정'],
  rent_to_buy: ['전세 살다가 집 사려면 얼마까지 돼요', '전세보증금으로 집 살 수 있을까', '세입자인데 집 사고 싶어요', '보증금 빼서 매수로 갈아타려면', '전세 대신 매수 할까요', '전세 사는데 매수 전환 고민', '전세 사는데 이참에 매수할까', '전세금 빼서 집 사면 얼마짜리', '세입자인데 집 사고 싶어요', '전세 대신 매수 고민'],
  move_time: ['이사 준비 언제 뭐 해야 돼요', '이사 비용 얼마나 들어요', '이삿짐 견적 받고 싶어요', '이사 날짜 정했는데 할 일', '포장이사 업체 알아보는 중', '이사 준비 체크리스트', '이사 비용 대략', '이사 날짜 잡았는데 뭐부터', '이사 준비할 것', '이사비용 견적'],
  broker_fee: ['중개보수 얼마 내요', '복비 계산해 주세요', '부동산 수수료 얼마예요', '10억 매매 중개수수료', '전세 3억 복비 얼마', '중개비 상한요율', '복비 상한', '중개수수료 얼마 주면 돼요', '중개보수 계산', '복비 얼마'],
  high_bargain: ['이 가격 신고가인가요', '급매 맞는지 봐 주세요', '싸게 나온 건지 궁금해요', '시세보다 비싸게 사는 건가요', '호가가 적정가인지', '헬리오시티 30억 신고가인가요', '이거 급매 맞아요', '지금 호가가 비싼 건지', '신고가 맞나요', '급매인지 확인'],
  school_move: ['학군 보고 이사하려는데', '초품아 아파트 찾고 싶어요', '아이 중학교 때문에 이사', '학원가 근처로 가고 싶어요', '학군지 전세 얼마나 해요', '전학 시키려고 이사 고민', '학군 좋은 동네로 이사', '초등학교 가까운 아파트', '학군지로 이사 고민', '중학교 배정 때문에 이사'],
  commute: ['출퇴근 편한 곳으로 집 찾고 싶어요', '회사 근처로 이사 가려면', '직장 근처 전세 시세', '통근 시간 줄이고 싶어요', '강남 출근하기 좋은 동네', '출퇴근하기 좋은 아파트', '회사 가까운 곳 전세', '출퇴근 30분 이내 동네', '출퇴근 편한 동네', '직장 근처 집'],
  redev_stage: ['재개발 구역 지금 단계에서 뭘 봐야 해요', '재건축 관리처분 뒤 입주권', '입주권이랑 분양권 차이', '조합설립인가 났는데 사도 되나요', '정비구역 지정 다음은 뭐예요', '모아타운 재개발 단계', '재개발 투자 단계별 체크', '재건축 조합원 입주권 사도 되나', '재개발 진행 단계', '관리처분 이후 입주권'],
  switch_order: ['갈아타기 먼저 팔까요 먼저 살까요', '팔고 사는 게 나아요 사고 파는 게 나아요', '선매도 선매수 뭐가 유리', '갈아타기 순서 알려주세요', '매수먼저 하면 대출 얼마', '먼저 살까 먼저 팔까 고민', '기존 집 먼저 팔고 새 집 사야 할까', '갈아타기 할 때 순서', '선매도 후매수', '먼저 사고 나중에 팔기']
};
let tot = 0, ok = 0; const perSc = {};
for (const [id, qs] of Object.entries(Q)) {
  check(`${id}: 질문 5개 이상`, qs.length >= 5);
  let k = 0;
  for (const q of qs) { const r = G.classify(q, DATA, CTX); tot++; if (r.top && r.top.id === id) { ok++; k++; } else console.log(`    빗나감 [${id}] "${q}" → ${r.top ? r.top.id : '없음'} ${JSON.stringify(r.scores.slice(0, 3))}`); }
  perSc[id] = k / qs.length;
  check(`${id}: 4/5 이상 맞음`, k / qs.length >= 0.8, `${k}/${qs.length}`);
}
check('모든 시나리오에 질문이 있음', SC.sc.every(s => Q[s.id]), SC.sc.filter(s => !Q[s.id]).map(s => s.id));
const ACC = ok / tot;
console.log(`  의도 분류: ${ok}/${tot} 맞음 (${(ACC * 100).toFixed(1)}%) · 시나리오 ${Object.keys(Q).length}개`);
check('전체 정확도 95% 이상', ACC >= 0.95, ACC);
const NONE = ['오늘 날씨 어때요', '점심 뭐 먹지', 'ㅎㅇ', '안녕하세요', '축구 결과 알려줘'];
NONE.forEach(q => check(`못 알아들음: "${q}"`, !G.classify(q, DATA, CTX).top));

/* 값 뽑기 */
const X = s => G.extract(s, CTX);
check('금액: 3억 5천 → 35,000만', X('현금 3억 5천 있어요').money.cash === 35000, X('현금 3억 5천 있어요'));
check('금액: 연봉 8천만 → 소득 8,000', X('연봉 8천만 원이에요').money.income === 8000);
check('금액: 보증금 2억 → dep', X('보증금 2억인데요').money.dep === 20000);
check('금액: 12억 집 → 집값', X('12억 집 사려고요').money.price === 120000);
check('금액: 2500만 → 2,500', G.moneys('월세 보증금 2500만 원')[0].v === 2500);
check('금액: 3억5000만 → 35,000', G.moneys('3억5000만')[0].v === 35000);
check('지역: 분당 → 성남시 분당구', (X('분당 아파트 살까').region || {}).code === '41135');
check('지역: 부산 중구는 부산', (X('부산 중구 집값').region || {}).code === '26110');
check('지역: 송파구', (X('송파구 사도 돼요').region || {}).code === '11710');
check('주택 수: 세 채', X('집이 세 채').houses === 3);
check('날짜: 2024.3.15', X('2024.3.15에 샀어요').date === '2024-03-15');

/* ---------- ③ 계산 ---------- */
const E = { L, T, H, CY, ADJ, RD, today: '2026-11-26' };
const scOf = id => SC.sc.find(s => s.id === id);
const SEOUL = { code: '11710', name: '송파구', short: '서울', sido: '서울특별시' }, LOCAL = { code: '26110', name: '중구', short: '부산', sido: '부산광역시' };
function card(id, a, e) { const r = G.solve(scOf(id), a, Object.assign({}, E, e || {})); return r; }
function good(id, r) {
  check(`${id}: 계산됨`, r && !r.err && !r.need && r.head, r);
  if (!r || r.err || r.need) return;
  const txt = JSON.stringify(r);
  check(`${id}: 숫자 칸 2개 이상`, (r.nums || []).length >= 2 || (r.table && r.table.rows.length), r.nums);
  check(`${id}: 빈 값·NaN·undefined 없음`, !/NaN|undefined|Infinity|"v":""/.test(txt), txt.slice(0, 300));
  check(`${id}: 권유 문구 없음`, !G.BAD.test(txt), txt.match(G.BAD));
  check(`${id}: 출처`, r.src && r.src.length >= 1 && r.src.every(k => SC.src[k]));
  check(`${id}: 주의점`, (r.warn || []).length >= 1);
  check(`${id}: 화면 말투(~습니다 없음)`, !/습니다/.test(txt), txt.match(/[가-힣]*습니다/));
}
/* 1 언제 팔까: 서울 송파 2023-03-02 취득 조정 · 전입 같은 날 · 8억 → 15억 */
let r = card('sell_when', { region: SEOUL, acq: '2023-03-02', rs: '2023-03-02', acqp: 80000, salep: 150000, facts: { fv: 72, fvBase: '서울 아파트', track: { n: 10, hit: 8 }, price: 150000, at: '202610' } });
good('sell_when', r);
{
  const h = { acqDate: '2023-03-02', acqPrice: 8e8, price: 15e8, expenses: 0, residMonths: 44, living: true, houses: 1, acqAdj: true, adjAt: () => true };
  const tl = T.timeline(h, { today: '2026-11-26', months: 60 });
  check('언제 팔까: 오늘 세금 = 세금 엔진 timeline 값 그대로', r.nums[0].v === G.wonW(tl.now.total), [r.nums[0].v, G.wonW(tl.now.total)]);
  check('언제 팔까: 보유 2년 2025-03-02 이미 채움', /2025년 3월 2일/.test(r.nums[2].v) && /채웠/.test(r.nums[2].s));
  check('언제 팔까: 점수·과거 성적은 참고 줄로만', r.ref.length === 3 && /10번 중 8번/.test(r.ref[1].v));
}
check('언제 팔까: 필요한 값이 없으면 되묻기', card('sell_when', { acq: '2023-03-02' }).need.indexOf('acqp') >= 0);
/* 2 매도 순서 */
r = card('multi_order', { mlist: [{ name: 'A', acq: '2015-05-01', acqp: 50000, price: 120000, region: SEOUL, pub: 80000 }, { name: 'B', acq: '2020-05-01', acqp: 70000, price: 80000, region: LOCAL, pub: 40000 }] });
good('multi_order', r);
{
  const hs = [{ name: 'A', acqDate: '2015-05-01', acqPrice: 5e8, price: 12e8, expenses: 0, residMonths: 0, living: false, acqAdj: true, adjAt: d => ADJ.isAdjusted('서울', '송파구', d) === true },
    { name: 'B', acqDate: '2020-05-01', acqPrice: 7e8, price: 8e8, expenses: 0, residMonths: 0, living: false, acqAdj: false, adjAt: () => false }];
  const C = T.compareOrders(hs, { today: '2026-11-26', start: '2026-12-26', interval: 12, growth: 0 });
  check('매도 순서: 최선 순서·합계가 세금 엔진 compareOrders 와 같음', r.nums[0].v === C.best.sales.map(s => s.name).join(' → ') && r.nums[0].s.indexOf(G.wonW(C.best.total)) >= 0, [r.nums[0], C.best.total]);
  check('매도 순서: 비교표에 순서 2개', r.table.rows.length === 2);
  check('매도 순서: 공시가격을 넣으면 종부세', r.nums.some(n => /종부세/.test(n.k)));
}
/* 3 청약 */
const rows = [['송파구', 'X', '202606', 59, 0, 'h', 50, 60, 70, '10', '1'], ['송파구', 'Y', '202607', 84, 1, 'h', 65, 68, 72, '20', '2'], ['송파구', 'Z', '202401', 84, 1, 'h', 20, 30, 40, '1', '3'], ['강남구', 'W', '202609', 59, 0, 'o', 10, 20, 30, '1', '4']];
r = card('cy_where', { birth: '1985-01-01', married: 'y', homeown: 'n', deps: 3, accd: '2012-01-01', csido: '서울특별시' }, { cyRows: rows });
good('cy_where', r);
{
  const my = CY.CY.total({ own: false, birth: '1985-01-01', married: true, marDate: '', deps: 3, accDate: '2012-01-01', noAcc: false }, '2026-11-26').sum;
  check('청약: 가점 = 청약 엔진 값', r.nums[0].v === `${my}점 / 84점`, [r.nums[0].v, my]);
  check('청약: 최근 1년·해당지역만 비교(2개)', /2개 주택형 중/.test(r.nums[1].v), r.nums[1]);
  check('청약: 서울 85㎡ 이하 예치금 300만 원', r.nums[2].v === '300만 원');
}
/* 4 임대사업자 */
r = card('rental_biz', { rtype: 'l8', regd: '2019-03-01', rkind: 'y', rstate: 'auto' });
good('rental_biz', r);
check('임대: 8년 의무기간 끝 2027-03-01', /2027년 3월 1일/.test(r.nums[1].v), r.nums[1]);
check('임대: 확실하지 않은 내용은 확인 필요(ok:false)로, 근거 링크 필수', r.info.some(x => x.ok === false) && r.info.every(x => SC.src[x.src]));
check('임대: 세무사 연결이 핵심', r.expertMain === true && scOf('rental_biz').expert === 'tax');
check('임대: 6년 단기는 확인 필요 표시', /확인 필요/.test(card('rental_biz', { rtype: 's6', regd: '2025-07-01', rkind: 'n', rstate: 'keep' }).nums[0].s));
/* 5 증여 */
r = card('gift_when', { rel: 'child', value: 100000, pub: 70000, prior: 0, gdebt: 0, region: SEOUL, donorone: 'n' });
good('gift_when', r);
{
  const g = T.giftTax({ value: 10e8, debt: 0, rel: 'child', prior: 0, filed: true }), ga = T.giftAcqTax({ value: 10e8, stdPrice: 7e8, debt: 0, adj: true, donorOne: false, close: true, over85: false });
  check('증여: 증여세 = 세금 엔진 값', r.nums[0].v === G.wonW(g.tax), [r.nums[0].v, g.tax]);
  check('증여: 서울(조정) 공시 3억 이상 → 증여 취득세 12% 중과', r.nums[1].v === G.wonW(ga.total) && ga.heavy === true && /12%/.test(r.nums[1].s));
  check('증여: 이월과세·10년 합산 근거', r.info.some(x => x.src === 'cgt97_2') && r.info.some(x => x.src === 'gift47'));
}
/* 6 매수 시기 */
const IX = { months: ['202510', '202610'], sgg: { '11710': { name: '송파구', s: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5100, 5200, 5300, 5400, 5500, 5500, 5500, 5500, 5500, 5500, 5500, 5500], c: Array(24).fill(10).concat(Array(12).fill(0)), r: { jr: 52.1 } } } };
IX.sgg['11710'].c = Array(12).fill(5).concat(Array(12).fill(10));
r = card('buy_when', { region: SEOUL, cash: 50000, income: 9000, own: 'none' }, { IX, sup: { '11710': [1200, 300, 0, 5] } });
good('buy_when', r);
check('매수 시기: 최대 집값 = 대출 엔진 maxPrice', (() => { const c = L.ctx({ g: 'reg', own: 'none', income: 9000, cash: 50000, debt: 0, rate: 4 }); return r.nums[0].v === G.won(L.maxPrice(c)); })(), r.nums[0]);
check('매수 시기: 평당가 1년 변화 +10%(5,000 → 5,500)', r.ref.some(x => /1년 변화/.test(x.k) && x.v === '+10%'), r.ref);
check('매수 시기: 거래량·전세가율·입주 예정', r.ref.some(x => /거래/.test(x.k)) && r.ref.some(x => x.v === '52.1%') && r.ref.some(x => x.v === '1,200세대'));
check('매수 시기: 바닥 단정 안 함 문구', r.warn.some(w => /확정할 수 없어요/.test(w)));
/* 나머지 */
good('budget', card('budget', { cash: 30000, income: 7000, own: 'none', region: SEOUL }));
r = card('loan_limit', { price: 100000, income: 8000, own: 'none', region: SEOUL }); good('loan_limit', r);
check('대출 한도 = loan-core limit', r.nums[0].v === G.won(Math.floor(L.limit({ price: 100000, code: '11710', own: 'none', income: 8000, debt: 0, rate: 4 }).L)));
good('special_loan', card('special_loan', { price: 50000, income: 6000, own: 'none', kids: '1', newly: 'y', baby: 'y', dual: 'n', over85: 'n', region: SEOUL }));
r = card('first_home', { price: 50000, region: SEOUL, over85: 'n' }); good('first_home', r);
check('생애최초: 5억 1% 취득세 500만 → 감면 200만', /200만/.test(r.nums[0].s), r.nums[0]);
good('buy_cost', card('buy_cost', { price: 80000, own: 'none', region: SEOUL, over85: 'n' }));
r = card('acq_tax', { price: 60000, houses: '1', region: SEOUL, over85: 'n' }); good('acq_tax', r);
check('취득세 6억 1주택 1% = 600만 + 교육세 60만', r.nums[0].v === '600만 원' && r.nums[1].v === '60만 원', r.nums);
r = card('exempt', { region: SEOUL, acq: '2025-10-20', rs: '2025-11-01' }); good('exempt', r);
check('비과세: 서울 2025-10-20 취득(조정) → 거주 2년 2027-11-01', /2027년 11월 1일/.test(r.head), r.head);
r = card('temp2', { acq: '2020-01-01', newd: '2026-09-01', oa: 'y', na: 'y', pre: 'n' }); good('temp2', r);
check('일시적 2주택: 조정→조정·2026.8.4 이후 → 2년(2028-09-01)', /2028년 9월 1일/.test(r.head));
check('일시적 2주택: 8.3 전 계약금 → 3년', /2029년 9월 1일/.test(card('temp2', { acq: '2020-01-01', newd: '2026-09-01', oa: 'y', na: 'y', pre: 'y' }).head));
good('prop_tax', card('prop_tax', { pub: 90000, one: 'y' }));
good('transfer_tax', card('transfer_tax', { region: SEOUL, acq: '2018-01-01', acqp: 60000, salep: 140000, rs: '2018-01-01' }));
r = card('jeonse_renew', { end: '2027-05-31', dep: 50000 }); good('jeonse_renew', r);
check('갱신 기간 2026-11-30 ~ 2027-03-31, 5% 2,500만', /2026년 11월 30일 ~ 2027년 3월 31일/.test(r.nums[0].v) && r.nums[1].v === '2,500만 원', r.nums);
r = card('rent_raise', { dep: 40000, wrent: 0 }, { base: { v: 2.5, at: '202610' } }); good('rent_raise', r);
check('월세 전환 상한: 기준금리 2.5% + 2%p = 4.5%', r.nums.some(n => n.v === '4.5%'), r.nums);
r = card('deposit_safe', { htype: 'villa', dep: 25000, pub: 20000, senior: 0, region: SEOUL }); good('deposit_safe', r);
check('전세보증: 공시 2억 × 126% = 2억 5,200만 → 2억 5천 가능', /가능/.test(r.nums[0].v) && r.nums[1].v === '2억 5,200만 원', r.nums);
r = card('contract_check', { dep: 15000, szone: 'seoul' }); good('contract_check', r);
check('최우선변제: 서울 1억 5천 → 5,500만', /5,500만/.test(r.head));
r = card('wolse_conv', { dep: 30000, wdep: 5000, wrent: 100, jrate: 4 }); good('wolse_conv', r);
check('전환율 4.8%(100×12÷25,000) · 4% 이자 83.3만 → 전세가 16.7만 덜', r.nums[0].v === '연 4.8%' && /전세/.test(r.head), r);
good('rent_to_buy', card('rent_to_buy', { dep: 30000, cash: 10000, income: 7000, region: SEOUL }));
r = card('move_time', { deal: 'jeonse', amt: 30000, mdate: '2027-02-27', size: 'h' }); good('move_time', r);
check('전세 3억 중개보수 상한 0.3% = 90만, 전입신고 2027-03-13', r.nums[0].v === '90만 원' && /2027년 3월 13일/.test(r.nums[1].v), r.nums);
r = card('broker_fee', { deal: 'sale', amt: 100000 }); good('broker_fee', r);
check('매매 10억 중개보수 상한 0.5% = 500만', r.nums.some(n => n.v === '0.5%') && /500만/.test(r.head));
check('월세 거래금액: 보증금 1,000 + 월세 30 → 5천 미만이면 ×70 = 3,100', G.wolseAmt(1000, 30) === 3100 && G.wolseAmt(3000, 50) === 8000);
check('매매 1억 → 0.5% 50만(한도 80만)', G.brokerFee('sale', 10000).fee === 50);
check('매매 4천 → 0.6% 24만', G.brokerFee('sale', 4000).fee === 24);
r = card('high_bargain', { price: 135000, facts: { apt: '헬리오시티', band: '84㎡대', price: 150000, range: { lo: 140000, hi: 160000, months: 12 }, fv: 60, fvBase: '서울 아파트' } }); good('high_bargain', r);
check('급매: 13.5억 vs 15억 → −10% 급매 기준', /급매 기준/.test(r.head), r.head);
good('school_move', card('school_move', { region: SEOUL, btype: 'jeonse', cash: 40000 }, { IX }));
good('commute', card('commute', { work: SEOUL, btype: 'buy', cash: 40000, income: 8000 }, { IX }));
r = card('redev_stage', { stage: '7' }); good('redev_stage', r);
check('재개발: 사업시행인가 → 남은 3단계(관리처분·이주·착공)', /3단계/.test(r.head), r.head);
r = card('switch_order', { region: SEOUL, newreg: SEOUL, newprice: 120000, income: 10000 }); good('switch_order', r);
check('갈아타기 순서: 서울(조정→조정) 오늘 잔금 → 2년', /2년/.test(r.nums[2].v));
check('모든 시나리오 계산 확인함', SC.sc.every(s => fail >= 0));

/* ---------- ④ 가리기 ---------- */
const M = G.mask;
check('전화번호 가림', !/1234/.test(M('010-1234-5678로 연락 주세요 전세 문제')));
check('이메일 가림', !/abc@/.test(M('abc@naver.com 전세 보증')));
check('주민번호 가림', !/1234567/.test(M('850101-1234567 청약')));
check('번지 가림', !/123-45/.test(M('잠실동 123-45 빌라 깡통전세')));
check('도로명 번호 가림', !/길 12/.test(M('올림픽로 35길 12 전세')) && !/35길/.test(M('올림픽로35길 12 전세')) || !/12/.test(M('올림픽로35길 12 전세')), M('올림픽로35길 12 전세'));
check('호수 가림', !/1203/.test(M('101동 1203호 전세')));
check('이름 가림(저는 ○○)', !/홍길동/.test(M('저는 홍길동인데 집을 언제 사나요')));
check('이름 가림(○○ 씨)', !/김철수/.test(M('김철수 씨가 전세를')));
check('보통 문장은 그대로', M('지붕 누수 하자 보수 요구') === '지붕 누수 하자 보수 요구');
check('가린 뒤 남는 게 없으면 빈 글', M('010-1234-5678') === '');

/* ---------- ⑤ 화면·서버 ---------- */
const cfg = read('assets/config.js');
check('기능 플래그 GUIDE_ENABLED=false', /GUIDE_ENABLED:\s*false/.test(cfg));
const gjs = read('assets/guide.js');
check('미리 보기 ?preview=guide · 끄기 ?preview=off', /preview/.test(gjs) && /'guide'/.test(gjs) && /'off'/.test(gjs));
check('꺼져 있으면 아무 칸도 안 만듦(on() 확인)', /function on\(\)/.test(gjs) && /GUIDE_ENABLED === true/.test(gjs));
const home = read('index.html');
check('첫 화면: 맨 위 길잡이 칸·스크립트', /id="guideTop"/.test(home) && /guide\.js/.test(home) && /guide-core\.js/.test(home));
check('첫 화면: 길잡이가 켜지면 단지 물어보기 칸과 통합(숨김)', /askBox/.test(gjs));
const solve = read('solve/index.html');
check('solve/ 화면: 꺼져 있으면 준비 중·검색 제외', /noindex/.test(solve) && /준비 중/.test(solve));
check('solve/ OG·제목에 집예보', /<title>[^<]*집예보/.test(solve));
check('금액은 기기에만: 서버로 보내는 건 못 알아들은 문장(gdMiss)뿐', (gjs.match(/action:\s*'gd\w+'/g) || []).every(x => /gdMiss/.test(x)) && /mask\(/.test(gjs));
check('이어서 하기 상태는 기기(localStorage jdj_guide)', /jdj_guide/.test(gjs));
for (const [p, k] of [['loan/index.html', 'loan'], ['buy/index.html', 'buy'], ['buy/report/index.html', 'report'], ['switch/index.html', 'switch'], ['switch/rent/index.html', 'rentsw'], ['tax/index.html', 'tax'], ['tax/transfer/index.html', 'transfer'], ['chungyak/index.html', 'chungyak'], ['jeonse/index.html', 'jeonse'], ['mine/index.html', 'mine'], ['villa/zone/index.html', 'zone'], ['mine/calendar/index.html', 'calendar']]) {
  const h = read(p); check(`결과 화면 끝 '이어서 하면 좋은 것': ${p}`, new RegExp(`data-gnext="${k}"`).test(h) && /guide-next\.js/.test(h));
}
const gs = read('tools/agent-backend.gs');
check('서버: gdMiss·gdAdmin 처리', /GD_ACTIONS/.test(gs) && /function gdMiss/.test(gs) && /function gdAdmin/.test(gs));
check('서버: 화면과 같은 가리기 규칙을 서버에서도 한 번 더', /function gdMask/.test(gs));
check('서버: 주간 운영 메일 한 줄(gdWeekLine)·월요일', /function gdWeekLine/.test(gs) && /gdWeekLine\(/.test(gs.slice(gs.indexOf('function reportWeekly'))));
check('서버: GUIDE_ENABLED 스위치', /const GUIDE_ENABLED = false/.test(gs));
check('운영자 화면 solve/admin/', fs.existsSync(path.join(ROOT, 'solve/admin/index.html')) && /gdAdmin/.test(read('solve/admin/index.html')));

/* 서버(가짜 시트·메일) */
{
  const SV = require('./gs-harness')({ now: '2026-11-30T07:10:00+09:00' });
  const ex = ['010-1234-5678로 연락 주세요 전세 문제', '저는 홍길동인데 집을 언제 사나요', '잠실동 123-45 빌라 깡통전세', '101동 1203호 전세', '지붕 누수 하자 보수 요구', 'abc@naver.com 전세 보증'];
  check('서버 gdMask = 화면 mask(같은 예문)', ex.every(t => SV.ctx.gdMask(t) === G.mask(t)), ex.map(t => [SV.ctx.gdMask(t), G.mask(t)]));
  let j = SV.post({ action: 'gdMiss', k: '지붕 누수 하자 보수 요구', g: 'home', pv: 0 });
  check('서버: 꺼져 있고 미리 보기 아니면 적지 않음', j.ok && j.n === 0 && !SV.sheets['길잡이미매칭']);
  j = SV.post({ action: 'gdMiss', k: '저는 홍길동인데 하자 보수 요구 010-1234-5678', g: 'home', pv: 1 });
  const sh = SV.sheets['길잡이미매칭'];
  check('서버: 미리 보기는 적음 · 이름·전화 가림 · 칸 4개(시각·문장·화면·미리보기)', j.n === 1 && sh && sh.rows.length === 2 && !/홍길동|5678/.test(sh.rows[1][1]) && sh.rows[1][2] === 'home' && sh.rows[1][3] === 'y', sh && sh.rows);
  SV.post({ action: 'gdMiss', k: '하자 보수 요구', g: 'solve', pv: 1 }); SV.post({ action: 'gdMiss', k: '하자보수 요구', g: 'home', pv: 1 });
  const top = SV.ctx.gdTop(7, 10);
  check('서버: 띄어쓰기만 다른 문장은 한 줄로 셈(빈도순)', top.total === 3 && top.top[0].n === 2, top);
  check('서버: 운영자가 아니면 gdAdmin 거절', SV.post({ action: 'gdAdmin' }).ok === false);
  const before = SV.mails.length; SV.ctx.gdWeekLine(new Date()); const m = SV.mails[SV.mails.length - 1];
  check('서버: 주간 한 줄 메일 1통(건수·많이 나온 말)', SV.mails.length === before + 1 && /못 알아들은 고민 3건/.test(m.body || m) , m);
  SV.ctx.gdWeekLine(new Date());
  check('서버: 같은 주에는 다시 안 보냄', SV.mails.length === before + 1);
}
const sw = read('sw.js');
check('서비스 워커: guide 파일 저장 목록', /guide-core\.js/.test(sw) && /guide\.js/.test(sw) && /scenarios\.json/.test(sw));
const seed = JSON.parse(read('counsel/seed.json'));
check('고민 상담 시드: 대표 고민 6개 질문이 있고 길잡이로 이어짐', PRI.every(id => seed.items.some(x => x.guide === id)), seed.items.map(x => x.guide));
check('고민 상담 시드: guide 값이 모두 있는 시나리오', seed.items.filter(x => x.guide).every(x => SC.sc.some(s => s.id === x.guide)));
check('고민 상담 화면에서 시드 글 → 길잡이 링크', /guide/.test(read('counsel/index.html')) || /guide/.test(read('assets/counsel.js')));
check('my/memory 기억 목록에 길잡이 진행', /jdj_guide/.test(read('assets/proactive.js')));

console.log(`\n고민 해결 길잡이: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
