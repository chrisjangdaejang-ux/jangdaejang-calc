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
const RD = require('../assets/redev-core.js'), SALE = require('../assets/sale-status.js');
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
  find_home: ['서울 34평 아파트 찾아줘', '강남권 신축 아파트 보여줘', '10억 이하 아파트 찾아 주세요', '역세권 아파트 리스트', '마용성 84㎡ 아파트 골라줘', '송파구 아파트 목록'],
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
/* 청약 공고 예시(청약홈 notices.json 모양 · cut 은 데이터 갱신 때 미리 계산된 값) */
const NOTI = [
  { no: 'N1', n: '서울가단지', sd: '서울특별시', g: '중랑구', ad: '서울특별시 중랑구 1', k: '민영', pb: '20261120', sp: ['', ''], r1: ['20261201', '20261201'], rc: ['20261201', '20261203'], pw: '20261210', f: ['투기과열지구', '조정대상지역'], u: 'https://www.applyhome.co.kr/x1',
    ty: [['059.0000A', 59, 40, 20, 50000], ['084.0000A', 84, 30, 10, 80000]], cut: [{ band: 0, lo: 60, hi: 69, avg: 66, scope: '같은 시·도', nCx: 44, nRows: 182, from: '202411', to: '202608' }, { band: 1, lo: 56, hi: 62, avg: 60, scope: '같은 시·도', nCx: 34, nRows: 130, from: '202411', to: '202608' }] },
  { no: 'N2', n: '서울나단지', sd: '서울특별시', g: '강서구', ad: '서울특별시 강서구 2', k: '민영', pb: '20261125', sp: ['', ''], r1: ['20261208', '20261208'], rc: ['20261208', '20261210'], pw: '20261217', f: ['투기과열지구'], u: 'https://www.applyhome.co.kr/x2',
    ty: [['084.0000A', 84, 50, 10, 90000]], cut: [{ band: 1, lo: 66, hi: 72, avg: 69, scope: '같은 시·도', nCx: 30, nRows: 120, from: '202411', to: '202608' }] },
  { no: 'N3', n: '경기다단지', sd: '경기도', g: '수원시', ad: '경기도 수원시 3', k: '민영', pb: '20261125', sp: ['', ''], r1: ['20261208', '20261208'], rc: ['20261208', '20261210'], pw: '20261217', f: [], u: '',
    ty: [['084.0000A', 84, 50, 10, 60000]], cut: [{ band: 1, lo: 40, hi: 50, avg: 45, scope: '같은 시·도', nCx: 30, nRows: 120, from: '202411', to: '202608' }] },
  { no: 'N4', n: '끝난단지', sd: '서울특별시', g: '중구', ad: '서울특별시 중구 4', k: '민영', pb: '20260901', sp: ['', ''], r1: ['20260910', '20260910'], rc: ['20260910', '20260912'], pw: '20260920', f: [], ty: [['084.0000A', 84, 10, 0, 1]], cut: [] }
];
const E = { L, T, H, CY, ADJ, RD, SALE, today: '2026-11-26', cyNotices: NOTI };
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
  check('청약: 결론 = 진행·예정 공고 수와 높음·경합·낮음(끝난 공고 빼고)', /서울특별시 진행·예정 민영 공고 2곳 중/.test(r.head), r.head);
  check('청약: 공고별 표(단지·지역·일정·면적대·커트라인·판정·근거) — 커트라인은 cut 값 그대로', r.tables[0].head.length === 7 && r.tables[0].rows.some(x => x[4] === '60~69점') && r.tables[0].rows.every(x => /같은 시·도 과거/.test(x[6])), r.tables[0]);
  check('청약: 최근 끝난 단지 실제 당첨 가점 표(해당지역·1년 안)', r.tables[1] && r.tables[1].rows.length === 2, r.tables[1]);
  check('청약: 보조 통계·예치금 300만 원', r.nums.some(n => /보조/.test(n.k)) && r.nums.some(n => n.v === '300만 원'));
}
{
  const q = '내 청약가점이 64점인데 서울에서 분양 예정인 단지중 당첨 가능한 단지는?';
  const cr = G.classify(q, DATA, Object.assign({}, CTX, { today: '2026-11-26' })), sc = scOf(cr.top && cr.top.id), ap = G.apply(sc, cr.slots, {});
  check('청약 대표 질문 → 청약 시나리오 · 64점 · 서울', sc && sc.id === 'cy_where' && ap.a.myscore === 64 && ap.a.csido === '서울특별시', [cr.top, ap.a]);
  const Q = G.quick(sc, ap.a, Object.assign({}, E, { cyRows: rows }));
  const C0 = Q.card, d = (lo, hi) => CY.diag(64, CY.cutOf({ cut: [{ band: 0, lo, hi }] }, 0)).g;
  check('청약 대표 질문: 바로 답(질문 없이) · 공고별 판정 = cy-engine diag', Q.exact && /2곳 중 내 가점 64점으로 당첨 가능성 높음 1곳 · 경합 0곳 · 낮음 1곳/.test(C0.head) && d(60, 69) === 'mid' && d(56, 62) === 'hi', C0.head);
  check('청약 대표 질문: 가능성 높은 순(60~85㎡ 56~62점 높음이 맨 위) · 단지 누르면 공고', C0.tables[0].rows[0][5].g === 'hi' && C0.tables[0].rows[0][0].href === 'https://www.applyhome.co.kr/x1', C0.tables[0].rows[0]);
  const Q2 = G.quick(sc, Object.assign({}, ap.a, { area: 84 }), Object.assign({}, E, { cyRows: rows }));
  check('청약: 면적(84㎡)을 말하면 60~85㎡만', Q2.card.tables[0].rows.every(x => x[3] === '60~85㎡'), Q2.card.tables[0].rows.map(x => x[3]));
  const Q3 = G.quick(sc, Object.assign({}, ap.a, { csido: '부산광역시' }), Object.assign({}, E, { cyRows: [] }));
  check('청약: 그 지역 공고가 0곳이면 그렇게 말하고 가까운 지역·다음 접수일', /공고가 없어요/.test(Q3.card.head) && Q3.card.nums.some(n => /서울 2곳/.test(n.v)) && Q3.card.nums.some(n => n.v === '12월 1일'), Q3.card);
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
check('금액은 기기에만: 서버로 보내는 건 못 알아들은 문장(gdMiss)뿐', (gjs.match(/action:\s*'gd\w+'/g) || []).every(x => /gdMiss|gdFb/.test(x)) && !/action: 'gdFb'[^}]*(cash|income|price|dep)/.test(gjs) && /mask\(/.test(gjs));
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

/* ---------- ⑥ 즉답(입력하자마자 첫 카드) ---------- */
{
  const CTX2 = Object.assign({}, CTX, { today: '2026-11-26' });
  const IXq = { months: ['202610'], sgg: { '11710': { name: '송파구', sido: '서울특별시', s: Array(24).fill(5000).concat(Array(12).fill(6000)), c: Array(36).fill(10), r: { jr: 50.2 } } } };
  const E2 = { L, T, H, CY, ADJ, RD, SALE, today: '2026-11-26', IX: IXq, cyNotices: NOTI };
  const inst = (q, extra) => { const r = G.classify(q, DATA, CTX2); if (!r.top) return { r }; const sc = scOf(r.top.id); const ap = G.apply(sc, r.slots, {}); return Object.assign({ r, sc, a: ap.a, from: ap.from }, G.quick(sc, ap.a, Object.assign({}, E2, extra || {})) || {}); };
  let x = inst('15억에 산 송파 집 29억 되면 언제 팔아야');
  check('즉답: "15억에 산 송파 집 29억 되면 언제 팔아야" → 산 값·팔 값·지역 뽑음', x.a.acqp === 150000 && x.a.salep === 290000 && x.a.region && x.a.region.code === '11710', x.a);
  check('즉답: 산 날이 없으면 보유·거주 2·5·10년 예시(세금 엔진 값) + 예시 표시', x.card && !x.exact && /예시/.test(x.card.ex) && x.card.nums.length === 3 && x.card.nums[2].v === G.wonW(T.calcCGT({ acqDate: '2016-11-26', acqPrice: 15e8, saleDate: '2026-11-26', salePrice: 29e8, expenses: 0, residMonths: 120, houses: 1, acqAdj: false, saleAdj: false }).total), x.card && x.card.nums);
  x = inst('연봉 7천 신혼 대출 얼마');
  check('즉답: "연봉 7천 신혼 대출 얼마" → 정책 대출 소득 조건 바로', x.sc.id === 'special_loan' && x.a.income === 7000 && x.a.newly === 'y' && x.card && /소득 조건/.test(JSON.stringify(x.card.nums)), x.card);
  x = inst('청약 가점 59점 당첨될까', { cyRows: [['송파구', 'X', '202606', 59, 0, 'h', 50, 60, 70, '10', '1'], ['송파구', 'Y', '202607', 84, 1, 'h', 65, 68, 72, '20', '2']] });
  check('즉답: "청약 가점 59점" → 공고별 판정 바로', x.exact && /진행·예정 민영 공고/.test(x.card.head), x.card && x.card.head);
  x = inst('전세 만기 2월인데 재계약');
  check('즉답: "전세 만기 2월" → 갱신 요구 기간 날짜(2026-08-01 ~ 2026-12-28)', x.card && /2026년 8월 1일 ~ 2026년 12월 28일/.test(x.card.head), x.card && x.card.head);
  x = inst('3억 아파트 아들에게 증여하면');
  check('즉답: 증여 — 시가·받는 분 뽑아 바로 증여세', x.exact && x.a.value === 30000 && x.a.rel === 'child' && x.card.nums[0].v === G.wonW(T.giftTax({ value: 3e8, debt: 0, rel: 'child', prior: 0, filed: true }).tax), x.card && x.card.nums);
  x = inst('전세 3억 복비 얼마');
  check('즉답: "전세 3억 복비" → 90만 원', x.exact && /90만/.test(x.card.head), x.card && x.card.head);
  x = inst('공시가 15억 종부세 얼마');
  check('즉답: 공시가 15억 → 1주택 예시 보유세', x.card && /1세대 1주택으로 가정/.test(x.card.ex), x.card);
  x = inst('송파 아파트 대출 얼마까지');
  check('즉답: 집값 없으면 구 실거래 중간값 예시(84㎡) · 담보 기준', x.card && /예시 집값: 송파구/.test(x.card.ex) && /담보/.test(x.card.head), x.card);
  check('즉답: 예시 집값 = 평당가 6,000만 × 84 ÷ 3.3058', G.regionExample(E2, { code: '11710', name: '송파구' }).price === Math.round(6000 * 84 / 3.305785 / 100) * 100);
  x = inst('보증금 2억 깡통전세 걱정');
  check('즉답: 보증금만 있으면 보험에 필요한 공시가격 계산(2억 ÷ 126%)', x.card && x.card.nums[0].v === G.won(Math.ceil(20000 / 1.26)) + ' 이상', x.card && x.card.nums);
  x = inst('집 세 채 매도 순서');
  check('즉답: 다주택 규칙(법령) 먼저', x.card && /20%p/.test(JSON.stringify(x.card.nums)));
  x = inst('6억 아파트 취득세 2주택');
  check('즉답: 취득세 — 주택 수(2채) 뽑음', x.a.houses === '2' && x.exact, x.a);
  const t0 = Date.now(); for (let i = 0; i < 50; i++) inst('15억에 산 송파 집 29억 되면 언제 팔아야'); 
  const ms = (Date.now() - t0) / 50; console.log(`  즉답 계산 시간: 평균 ${ms.toFixed(1)}ms(분류+값 뽑기+계산)`);
  check('즉답 계산은 문장 하나에 100ms 안(화면은 자료를 미리 불러 1초 안)', ms < 100, ms);
  /* 사이트 전체 기능 찾기 */
  const FT = JSON.parse(read('assets/guide/features.json'));
  check('기능 색인 35개 이상 · 주소가 실제 화면', FT.items.length >= 35 && FT.items.every(f => fs.existsSync(path.join(ROOT, f.url.replace(/[?#].*$/, ''), 'index.html'))), FT.items.filter(f => !fs.existsSync(path.join(ROOT, f.url.replace(/[?#].*$/, ''), 'index.html'))).map(f => f.url));
  const FQ = [['구별 집값 순위 보고 싶어요', 'rank'], ['지도로 아파트 보기', 'map'], ['오피스텔 수익률', 'offi'], ['꼬마빌딩 시세', 'comm'], ['모닝 브리핑 구독', 'brief'], ['지난주 집값 동향', 'weekly'], ['예측 정확도 어때요', 'track'], ['분양 일정 보고 싶어요', 'bunyang'], ['분양가 비싼지', 'cyprice'], ['관심단지 모아보기', 'watch'], ['전세사기 체크리스트', 'check'], ['상속하면 세금 비교', 'transfer'], ['빌라 대지지분', 'villa'], ['광고 문의', 'ad'], ['회원가입 어떻게', 'login'], ['용어 무슨 뜻', 'terms']];
  let fo = 0; FQ.forEach(([q, id]) => { const f = G.findFeatures(q, FT, LEX); if (f[0] && f[0].id === id) fo++; else console.log(`    기능 빗나감 "${q}" → ${f[0] ? f[0].id : '없음'}`); });
  console.log(`  기능 찾기: ${fo}/${FQ.length}`);
  check('사이트 기능 찾기 15/16 이상', fo >= 15, fo);
  check('기능 찾기: 관계없는 말은 없음', !G.findFeatures('오늘 점심 뭐 먹지', FT, LEX).length);
  check('화면: 즉답 카드·예시 표시·내 조건으로 정확히 보기·만족도', /instHtml/.test(read('assets/guide.js')) && /예시로 먼저/.test(read('assets/guide.js')) && /내 조건으로 정확히 보기/.test(read('assets/guide.js')) && /gdFb/.test(read('assets/guide.js')));
  check('화면: 미리 불러오기(엔진·자료·서울 단지 목록)', /function warm\(\)/.test(read('assets/guide.js')) && /requestIdleCallback/.test(read('assets/guide.js')));
}

/* ---------- ⑦ 시나리오 전수 점검(질문 3개씩: 바로 답하는가 · 답 모양 · 화면과 같은 계산 · 다음 단계 링크) ---------- */
{
  const RC = require('../assets/rent-core.js'), KK = require('../assets/kk-core.js'), CAL = require('../assets/cal-core.js');
  const KD = JSON.parse(read('data/kkang.json'));
  const IXa = { months: ['202610'], sgg: { '11710': { name: '송파구', sido: '서울특별시', s: Array(24).fill(5000).concat(Array(12).fill(6000)), c: Array(36).fill(10), r: { jr: 50.2 } } } };
  const EA = { L, T, H, CY, ADJ, RD, SALE, RC, KK, kkData: KD, today: '2026-11-26', IX: IXa, cyNotices: NOTI, cyRows: rows };
  const CTXa = Object.assign({}, CTX, { today: '2026-11-26' });
  const FACT = { apt: '헬리오시티', band: '84㎡대', price: 150000, at: '202610', range: { lo: 140000, hi: 160000, months: 12 } };
  const DJ = { sd: 's00', code: '11710', dong: '가락동', jibun: '913', apt: '헬리오시티' };
  /* 원 = 금액, 일 = 날짜, 곳 = 목록, 점 = 점수 · 마지막 칸: 기억·단지 값(문장 밖에서 아는 값) */
  const AUD = {
    sell_when: [['15억에 산 송파 집 29억 되면 언제 팔아야', /원/], ['2019.6.20에 15억에 산 송파 집 29억 되면 언제 팔까', /일부터|오늘/, { rs: '2019-06-20' }], ['우리집 언제 팔아야 해요', /원/, { danji: DJ, facts: FACT, acq: '2020-01-10', acqp: 90000, region: { code: '11710', name: '송파구', short: '서울' } }]],
    multi_order: ['집 세 채 매도 순서', '다주택 어느 집부터 팔아요', '2주택 양도세 순서'].map(q => [q, /20%p|→/]),
    cy_where: [['청약 가점 64점 서울 당첨 가능한 단지', /곳/], ['가점 50점인데 청약 어디 넣죠', /곳/], ['서울 84㎡ 청약 가점 70점 당첨될까', /곳/]],
    rental_biz: [['장기일반 임대사업자 2019.3.1 등록 자동말소', /일/, { rkind: 'y', rstate: 'auto' }], ['단기 임대사업자 2018.5.1 등록 말소되면', /일/, { rkind: 'n', rstate: 'auto' }], ['임대사업자 자진말소 고민', null]],
    gift_when: [['3억 아파트 아들에게 증여하면', /원/], ['배우자에게 10억 집 증여 세금', /원/], ['딸에게 5억 증여 언제', /원/]],
    buy_when: [['송파 집 지금 사도 될까', /흐름|원/], ['현금 5억 연봉 1억 송파 집 언제 사', /원/], ['무주택인데 매수 시기', null]],
    budget: [['3억 있는데 얼마짜리 집 살 수 있어요', /원/], ['현금 5억 연봉 8천 송파 살 수 있는 집', /원/], ['모은 돈 2억으로 살 수 있을까', /원/]],
    loan_limit: [['10억 집 연봉 8천 대출 얼마', /원/], ['송파 아파트 대출 얼마까지', /원/], ['12억 집 주담대 한도', /원/]],
    special_loan: [['연봉 7천 신혼 대출 얼마', /소득/], ['신생아 특례 연봉 1억 3천 5억 집', /원|맞아요|없어요/], ['디딤돌 연봉 5천 3억 집', /원|맞아요|없어요/]],
    first_home: [['생애최초 5억 집 혜택', /원/], ['첫 집 9억 취득세 감면', /원/], ['생애 첫 주택 12억 넘으면', null]],
    buy_cost: [['8억 집 살 때 부대비용', /원/], ['6억 아파트 총비용', /원/], ['10억 집값 말고 드는 돈', /원/]],
    acq_tax: [['6억 아파트 취득세', /원/], ['9억 집 취득세 2주택', /원/], ['15억 취득세 3주택', /원/]],
    exempt: [['2024.3.2에 산 송파 집 비과세 언제', /일/], ['비과세 요건 2023.1.5 취득', /일/], ['비과세 언제 돼요', /일/, { acq: '2025-05-01' }]],
    temp2: [['일시적 2주택 새 집 2026.9.1 잔금 언제까지 팔아야', /일/, { acq: '2020-01-01' }], ['종전주택 처분기한 2025.3.1 새집', /일/, { acq: '2019-01-01' }], ['일시적 2주택 기한', /일/, { acq: '2020-01-01', newd: '2026-02-01' }]],
    prop_tax: [['공시가 15억 종부세 얼마', /원/], ['공시가격 6억 재산세', /원/], ['보유세 공시가 20억', /원/]],
    transfer_tax: [['10억에 산 집 15억에 팔면 양도세', /원/], ['양도세 얼마 5억에 사서 9억', /원/], ['양도소득세 계산 2018.1.1 취득', null]],
    jeonse_renew: [['전세 만기 2월인데 재계약', /일/], ['전세 만기 2027.5.31 갱신 언제', /일/], ['계약갱신 요구 내년 3월 만기', /일/]],
    rent_raise: [['보증금 3억인데 집주인이 올려 달래요', /원/], ['전세금 인상 5억 보증금 얼마까지', /원/], ['월세 올린다는데 보증금 1억', /원/]],
    deposit_safe: [['보증금 2억 깡통전세 걱정', /원/], ['전세보증보험 가입 보증금 3억', /원/], ['헬리오시티 보증금 12억 깡통전세', /원|%/, { htype: 'apt', danji: DJ, facts: FACT }]],
    contract_check: [['보증금 1억 5천 최우선변제', /원|대상/], ['서울 보증금 2억 소액임차인', /원|대상/], ['전입신고 확정일자 보증금 8천', /원|대상/]],
    wolse_conv: [['전세 3억 월세 보증금 5천 월세 100 비교', /%|원/, { jrate: 4 }], ['반전세 전세 4억 vs 보증금 1억 월세 120', /%|원/], ['전세와 월세 뭐가 나아요', null]],
    rent_to_buy: [['전세 보증금 3억 연봉 7천 집 사려면', /원/], ['보증금 2억 빼서 매수 연봉 6천', /원/], ['전세 대신 매수 고민 보증금 4억 연봉 9천', /원/]],
    move_time: [['전세 3억 이사 날짜 2027.2.27 준비', /일/], ['매매 9억 이사 2027.3.1 할 일', /일/], ['이사 준비 체크리스트', null]],
    broker_fee: [['전세 3억 복비 얼마', /원/], ['10억 매매 중개보수', /원/], ['월세 복비 보증금 1천 월세 50', /원/]],
    high_bargain: [['헬리오시티 13억 5천 급매인가요', /%|급매|원/, { danji: DJ, facts: FACT }], ['신고가 맞나요 17억', /원|최고가/, { danji: DJ, facts: FACT }], ['이 가격 시세보다 싼가요', /원/, { danji: DJ, facts: FACT }]],
    school_move: [['송파 학군 보고 이사', /원/], ['송파 초품아 전세 4억', /원|평/], ['학군지 이사 고민', null]],
    commute: [['송파 출퇴근 편한 곳', /원/], ['회사 근처 송파 전세 3억', /원|평/], ['출퇴근 편한 집', null]],
    redev_stage: [['관리처분 받은 재개발 구역', /단계/], ['조합설립인가 재건축 다음은', /단계/], ['사업시행인가 났어요 입주권', /단계/]],
    find_home: [['서울 34평 아파트 찾아줘', null], ['강남권 신축 아파트 보여줘', null], ['10억 이하 아파트 찾아 줘', null]],
    switch_order: [['갈아타기 송파 12억 집 연봉 1억 먼저 팔까', /원/], ['선매도 선매수 10억 집 연봉 8천', /원/], ['사고팔 순서 고민', null]]
  };
  let nAns = 0, nQ = 0; const miss = [];
  for (const sc0 of SC.sc) {
    const L0 = AUD[sc0.id]; check(`점검표: ${sc0.id} 질문 3개 이상`, L0 && L0.length >= 3);
    for (const [q, want, mem] of L0 || []) {
      nQ++;
      const r = G.classify(q, DATA, CTXa);
      const ok1 = r.top && r.top.id === sc0.id; if (!ok1) { miss.push(`${sc0.id} 분류 "${q}" → ${r.top && r.top.id}`); continue; }
      if (r.slots.region) r.slots.region = Object.assign({ short: '서울' }, r.slots.region);
      const ap = G.apply(sc0, r.slots, mem || {});
      if (mem && mem.facts) ap.a.facts = mem.facts;
      if (ap.a.facts && ['salep', 'kb', 'value'].some(k => (sc0.ask || []).indexOf(k) >= 0)) ['salep', 'kb', 'value'].forEach(k => { if ((sc0.ask || []).indexOf(k) >= 0 && ap.a[k] == null) ap.a[k] = ap.a.facts.price; });
      const Q = G.quick(sc0, ap.a, EA);
      if (!want) { check(`점검: ${sc0.id} "${q}" — 값이 없으면 되묻기(지어낸 숫자 없음)`, !Q || !Q.card || Q.card.ex || Q.exact, Q); continue; }
      const txt = Q && Q.card ? Q.card.head + ' ' + JSON.stringify(Q.card.nums || []) + JSON.stringify(Q.card.tables || []) : '';
      if (Q && Q.card && want.test(txt)) nAns++; else miss.push(`${sc0.id} 답 "${q}" → ${Q && Q.card ? Q.card.head : JSON.stringify(Q)}`);
      if (Q && Q.card) check(`점검: ${sc0.id} 권유 문구·NaN 없음 "${q}"`, !G.BAD.test(txt) && !/NaN|undefined/.test(txt), txt.slice(0, 200));
    }
  }
  miss.forEach(m => console.log('    점검 빗나감', m));
  console.log(`  시나리오 전수 점검: 숫자 답이 필요한 질문 ${nAns}개 바로 답 · 빗나감 ${miss.length}개 · 전체 질문 ${nQ}개`);
  check('전수 점검: 빗나감 없음', miss.length === 0, miss);
  /* 화면과 같은 계산 */
  const ex = card('exempt', { region: { code: '11710', name: '송파구', short: '서울' }, acq: '2025-10-20', rs: '2025-11-01' });
  const ce = CAL.events([{ key: '11710|가락동|913|헬리오시티|84㎡대', name: 'x', cal: { t: 'own', acq: '2025-10-20', adj: 'y', rs: '2025-11-01' } }], '2026-11-26', { pro: true, n: 1 });
  check('같은 계산: 비과세 보유·거주 2년 = 내 부동산 달력(cal-core hold2·live2)', ce.find(e => e.k === 'hold2').d === '2027-10-20' && ce.find(e => e.k === 'live2').d === '2027-11-01' && /2027년 10월 20일/.test(ex.nums[0].v) && /2027년 11월 1일/.test(ex.nums[1].v), [ex.nums, ce.filter(e => /2$/.test(e.k)).map(e => e.d)]);
  const jr = card('jeonse_renew', { end: '2027-05-31', dep: 50000 });
  const cj = CAL.events([{ key: '11710|가락동|913|헬리오시티|84㎡대', name: 'x', cal: { t: 'jeonse', cs: '2025-05-31', ce: '2027-05-31' } }], '2026-11-26', { n: 1 });
  check('같은 계산: 갱신 요구 기간 = 내 부동산 달력(cal-core renewO·renewC)', jr.nums[0].v === `${G.ko(cj.find(e => e.k === 'renewO').d)} ~ ${G.ko(cj.find(e => e.k === 'renewC').d)}`, [jr.nums[0].v, cj.filter(e => /renew/.test(e.k)).map(e => e.d)]);
  const wc = G.solve(scOf('wolse_conv'), { dep: 30000, wdep: 5000, wrent: 100, jrate: 4 }, EA), rc = RC.compare({ jeon: 30000, wDep: 5000, wRent: 100, rate: 4 });
  check('같은 계산: 전세 vs 월세 = 전월세 화면(rent-core compare)', wc.nums[1].v === G.won(Math.round(rc.jCost * 10) / 10) && Math.abs(rc.be - 4.8) < 1e-9, [wc.nums, rc]);
  const bf = G.brokerFee('sale', 80000), cd = L.costDetail(80000, L.ctx({ g: 'reg', own: 'none' }), false);
  check('같은 계산: 매매 중개보수 = 대출·내 집 마련 계산(loan-core costDetail)', Math.abs(bf.fee - cd.brokerBase) < 1e-9, [bf, cd.brokerBase]);
  const ds = G.solve(scOf('deposit_safe'), { htype: 'apt', dep: 120000, kb: 150000, senior: 0, danji: DJ, facts: FACT }, EA);
  const kk = KK.estimate({ kk: KD, code: '11710', dep: 120000, senior: 0, price: 150000 });
  check('같은 계산: 아파트 단지를 고르면 깡통전세 확률 = 전월세 화면(kk-core estimate)', ds.ref && ds.ref[0] && ds.ref[0].v === KK.pText(kk.p) && /참고/.test(ds.ref[0].k), ds.ref);
  /* 다음 단계 링크 */
  const scj = SC.sc;
  check('링크: 정책 대출 — 없는 #policy 대신 값 채운 대출 계산기', !JSON.stringify(scj).includes('loan/#policy') && scOf('special_loan').next[0].href === 'loan/?p={price}&g={region}&o={own}');
  check('링크: 증여 → 넘기는 방법 4가지 비교(tax/transfer)', scOf('gift_when').next.some(n => n.href === 'tax/transfer/'));
  check('링크: 갈아타기 계산기는 고른 단지로 채워서({switch})', scOf('sell_when').next[0].href === '{switch}' && /\{switch\}/.test(read('assets/guide.js')) && /switch\/' \+ \(d && d\.sd \? `\?sd=/.test(read('assets/guide.js')));
  check('링크: 양도세 계산기에 거주 개월(rm)·취득세에 주택 수(n)·생애최초(fh)까지', /P\.push\('rm='/.test(read('assets/guide.js')) && /P\.push\('n='/.test(read('assets/guide.js')) && /first_home'\) P\.push\('fh=1'\)/.test(read('assets/guide.js')));
  check('질문: 월세가 아니면 월세 금액은 안 물음(cond)', scOf('broker_fee').cond.wrent[0] === 'deal' && /condOk/.test(read('assets/guide.js')));
  check('즉답 링크도 같은 주소 규칙(hrefOf)', /hrefOf\(nx, a, sc\.id\)/.test(read('assets/guide.js')));
}

/* ---------- ⑧ 넓은 질문 좁히기 · 대화로 묻고 답하기 ---------- */
{
  const MC = require('../assets/mine-core.js');
  const DN = { sc: SC.sc, lex: LEX, narrow: SC.narrow, q: SC.q };
  const CTXn = { today: '2026-11-26', sgg: CTX.sgg.concat([{ code: '11650', name: '서초구', sido: '서울특별시', short: '서울' }, { code: '11680', name: '강남구', sido: '서울특별시', short: '서울' }, { code: '11170', name: '용산구', sido: '서울특별시', short: '서울' }]), sido: CTX.sido };
  /* 시험용 단지(점수 자료 sNN.json 모양: [구, 동, 단지, 평형, 전용, 거래 수, 평당가 36달, 거래 수 글자, 지번, fx]) */
  const U = (code, apt, band, area, ppy, by, sub) => [code, '동', apt, band, area, 100, Array(36).fill(ppy), String.fromCharCode(...Array(36).fill(50)), '1', { by, sub, fv: 50 }];
  const units = [U('11680', '강남A', '84㎡대', 84, 9000, 2022, 5), U('11650', '서초B', '84㎡대', 84, 7000, 2010, 15), U('11710', '송파C', '84㎡대', 84, 5000, 2023, 8), U('11440', '마포D', '84㎡대', 84, 4000, 2005, 4), U('11710', '송파E', '59㎡대', 59, 5200, 2015, 3), U('11140', '중구F', '84㎡대', 84, 2500, 1998, 20)];
  const IXn = { months: Array(36).fill(0).map((_, i) => String(202311 + i)), sgg: { '11680': { name: '강남구', sido: '서울특별시', s: [9000] }, '11650': { name: '서초구', sido: '서울특별시', s: [7000] }, '11710': { name: '송파구', sido: '서울특별시', s: [5000] }, '11440': { name: '마포구', sido: '서울특별시', s: [4000] }, '11140': { name: '중구', sido: '서울특별시', s: [2500] } }, sido: [{ id: 's00', name: '서울특별시', short: '서울' }] };
  const BROAD = [['서울 34평 아파트 찾아줘', 'budget'], ['강남권 신축 아파트 보여줘', 'budget'], ['10억 이하 34평 아파트 찾아 줘', 'gu'], ['송파구 아파트 찾아주세요', 'budget'], ['역세권 신축 아파트 리스트', 'budget'], ['마용성 84㎡ 아파트 골라줘', 'budget'], ['15억 이하 강남3구 아파트 찾아줘', 'age'], ['서울 59㎡ 아파트 목록', 'budget'], ['20억 넘게 신축 아파트 찾아 줘', 'gu'], ['노도강 5억 이하 역세권 신축 아파트 찾아줘', '']];
  let nb = 0;
  BROAD.forEach(([q, want]) => {
    const r = G.classify(q, DN, CTXn); const ok = r.top && r.top.id === 'find_home';
    const st = G.narrowInit(r.slots, DN, ''), nk = G.narrowNext(DN, 'find_home', st);
    if (ok && nk === want) nb++; else console.log(`    좁히기 빗나감 "${q}" → ${r.top && r.top.id} · ${nk} ${JSON.stringify(st)}`);
  });
  console.log(`  넓은 질문 좁히기: ${nb}/${BROAD.length} (집 찾기로 가고, 모르는 것 중 결과를 가장 크게 바꾸는 질문부터)`);
  check('넓은 질문 10개: 집 찾기 + 첫 좁히는 질문이 맞음(예산 → 지역 → 신축 → 역)', nb === BROAD.length, nb);
  let st0 = G.narrowInit(G.extract('서울 34평 아파트 찾아줘', CTXn), DN, '');
  check('34평 → 84㎡대', st0.area === 84 && st0.sido === '서울특별시');
  let R = G.findHomes(units, IXn, st0, MC, 2026);
  check('좁히기 전: 서울 84㎡대 5곳 · 가격대 분포 5칸', R.n === 5 && R.dist.length === 5 && R.dist.reduce((x, d) => x + d.n, 0) === 5, R);
  st0 = G.narrowSet(DN, st0, 'budget', '50000-100000'); R = G.findHomes(units, IXn, st0, MC, 2026);
  check('예산 5~10억 단추 → 바로 갱신(같은 시세 계산 mine-core bandSummary)', R.n === 1 && R.ex.every(r => r.price > 50000 && r.price <= 100000) && R.ex[0].price === MC.bandSummary(R.ex[0].u, IXn.months).price, R.ex.map(r => [r.apt, r.price]));
  st0 = G.narrowSet(DN, st0, 'gu', '강남3구'); check('강남3구 단추 → 강남·서초·송파', G.findHomes(units, IXn, st0, MC, 2026).ex.every(r => ['강남구', '서초구', '송파구'].indexOf(r.gu) >= 0));
  st0 = G.narrowSet(DN, st0, 'age', '5'); check('신축 5년 → 2021년 이후 준공만', G.findHomes(units, IXn, st0, MC, 2026).ex.every(r => r.by >= 2021));
  st0._skip = ['station']; check('[이대로 보기]로 건너뛰면 더 묻지 않음', G.narrowNext(DN, 'find_home', st0) === '');
  check('좁히는 질문 순서는 데이터(JSON)', Array.isArray(SC.narrow.order.find_home) && SC.narrow.q.budget.opts.length === 5);
  const pv = G.guPreview(IXn, G.narrowInit(G.extract('서울 34평 아파트', CTXn), DN, ''));
  check('자료 받기 전 구별 예시 가격(구 평당가 × 84㎡) 먼저', pv[0].name === '강남구' && pv[0].price === Math.round(9000 * 84 / 3.305785 / 100) * 100);

  /* 대화 10개 — UI 와 같은 순서(chatStart → 카드 → chatNext → chatAnswer …) */
  const MEM = { m: {}, from: {} };
  function converse(msgs, extraE) {
    const E9 = Object.assign({ L, T, H, CY, ADJ, RD, SALE, today: '2026-11-26', IX: IXa2, cyNotices: NOTI, cyRows: rows }, extraE || {});
    let st = G.chatStart(msgs[0], DN, CTXn, MEM), last = null, asked = [], cards = [];
    const step = () => {
      const sc = DN.sc.find(x => x.id === st.id); if (!sc) return null;
      let Q = null;
      if (sc.id === 'find_home') { const RR = G.findHomes(units, IXn, st.nf, MC, 2026); last = { head: `${RR.n}곳`, R: RR }; }
      else { const a = Object.assign({}, st.a); ['adj', 'oa', 'na'].forEach(k => { if (a[k] === '?') a[k] = null; }); Q = G.quick(sc, a, E9); last = Q && Q.card; }
      if (last) cards.push(last);
      const nx = G.chatNext(st, DN, Q); st.asked = nx ? { key: nx.key, nf: nx.nf ? 1 : 0 } : null; if (nx) asked.push(nx.key); return nx;
    };
    if (!st.id) return { st, cards, asked, last: null };
    step();
    for (const m of msgs.slice(1)) {
      const isQ = Array.isArray(m), r = G.chatAnswer(st, isQ ? '' : m, DN, CTXn, isQ ? m[0] : undefined);
      if (r.switched) { st = G.chatStart(m, DN, CTXn, MEM); }
      else if (!r.ok) { asked.push('?hint'); continue; }
      step();
    }
    return { st, cards, asked, last };
  }
  const IXa2 = { months: ['202610'], sgg: { '11710': { name: '송파구', sido: '서울특별시', s: Array(24).fill(5000).concat(Array(12).fill(6000)), c: Array(36).fill(10), r: { jr: 50.2 } } } };
  const CONV = [
    ['집 찾기: 넓게 → 예산 말 → 강남 쪽 → 몰라요 → 끝', ['서울 34평 아파트 찾아줘', '10억 정도', '강남3구면 좋겠어', '몰라요', '상관없어요'], c => c.st.nf.budget[1] === 100000 && c.st.nf.gname === '강남3구' && c.asked.join(',') === 'budget,gu,age,station' && c.last.R.n >= 0 && !c.st.asked],
    ['집 찾기: "5~7억" 범위 · 단추 신축', ['서울 34평 아파트 보여줘', '5~7억', '상관없어요', ['5'], '상관없어'], c => c.st.nf.budget[0] === 50000 && c.st.nf.budget[1] === 70000 && c.st.nf.age === 5],
    ['전세 만기: 달만 → 보증금 물음 → "3억이요" → 5% 계산', ['전세 만기 2월인데 재계약할까요'], c => /2026년 8월 1일/.test(c.cards[0].head)],
    ['대출: 집값·소득 없이 → 묻고 답하기', ['대출 얼마까지 받을 수 있어요', '10억', '연봉 8천이요', '무주택이에요'], c => c.st.a.price === 100000 && c.st.a.income === 8000 && /빌릴 수 있어요/.test(c.last.head)],
    ['청약: 가점 64점 서울 → 바로 공고별', ['내 청약가점이 64점인데 서울에서 분양 예정인 단지중 당첨 가능한 단지는?'], c => /2곳 중 내 가점 64점/.test(c.cards[0].head) && !c.st.asked],
    ['증여: 받는 분 모름 → 예시 → "딸이요" → 정확히', ['3억 아파트 증여하면 세금', '딸에게 줄 거예요'], c => c.st.a.rel === 'child' && /증여세/.test(c.last.head)],
    ['양도세: 산 값·팔 값 → 산 날 물음 → 날짜 답', ['15억에 산 송파 집 29억 되면 언제 팔아야', '2019년 6월 20일'], c => c.st.a.acq === '2019-06-20' && /세금이|팔아도/.test(c.last.head)],
    ['못 알아들으면 예시 안내 후 다시', ['대출 얼마까지 받을 수 있어요', '음…', '8억이요'], c => c.asked.indexOf('?hint') >= 0 && c.st.a.price === 80000],
    ['중간에 다른 고민으로 바뀜', ['대출 얼마까지 받을 수 있어요', '취득세는 얼마 나와요'], c => c.st.id === 'acq_tax'],
    ['복비: 거래 종류 단추 → 금액', ['중개보수 얼마예요', ['jeonse'], '3억'], c => c.st.a.deal === 'jeonse' && c.st.a.amt === 30000 && /90만/.test(c.last.head)]
  ];
  let nc = 0;
  CONV.forEach(([name, msgs, ok]) => { let c; try { c = converse(msgs); } catch (e) { c = { err: String(e.stack || e) }; } const pass2 = !c.err && ok(c); if (pass2) nc++; else console.log(`    대화 빗나감 ${name}: ${c.err || JSON.stringify({ id: c.st.id, a: c.st.a, nf: c.st.nf, asked: c.asked, head: c.last && c.last.head })}`); });
  console.log(`  대화 시나리오: ${nc}/${CONV.length} 끝까지 맞게`);
  check('대화 시나리오 10개 끝까지', nc === CONV.length, nc);
  const gj = read('assets/guide.js');
  check('대화 화면: 기기 저장(jdj_guide_chat)·처음부터·양식으로 보기·대화로 보기·빠른 답 단추·입력창 아래 고정', /jdj_guide_chat/.test(gj) && /처음부터/.test(gj) && /양식으로 보기/.test(gj) && /대화로 보기/.test(gj) && /data-qv/.test(gj) && /position:fixed;left:0;right:0;bottom:0/.test(gj) && /visualViewport/.test(gj));
  check('첫 화면 입력 → 대화창(solve/?chat=1)', /solve\/\?chat=1/.test(gj) && /mountChat/.test(read('solve/index.html')));
}
/* 서버 만족도 */
{
  const SV = require('./gs-harness')({ now: '2026-11-30T07:10:00+09:00' });
  check('서버: 꺼져 있으면 만족도 안 적음', SV.post({ action: 'gdFb', s: 'budget', v: 1, w: 'top', pv: 0 }).n === 0 && !SV.sheets['길잡이만족도']);
  SV.post({ action: 'gdFb', s: 'budget', v: 1, w: 'top', pv: 1 }); SV.post({ action: 'gdFb', s: 'budget', v: -1, w: 'solve', pv: 1 }); SV.post({ action: 'gdFb', s: 'cy_where', v: 1, w: 'top', pv: 1 });
  check('서버: 이상한 값은 거절', SV.post({ action: 'gdFb', s: 'x<y', v: 5, pv: 1 }).ok === false);
  const fs2 = SV.ctx.gdFbSum(7);
  check('서버: 시나리오별 👍·👎·비율', fs2.length === 2 && fs2[0].s === 'budget' && fs2[0].up === 1 && fs2[0].down === 1 && fs2[0].rate === 50, fs2);
  SV.ctx.gdWeekLine(new Date());
  check('서버: 주간 한 줄에 만족도', /만족도 👍2 👎1/.test((SV.mails[SV.mails.length - 1] || {}).body || ''), SV.mails[SV.mails.length - 1]);
  check('운영자 화면: 만족도 표', /답 만족도/.test(read('solve/admin/index.html')));
}
const sw = read('sw.js');
check('서비스 워커: guide 파일 저장 목록', /guide-core\.js/.test(sw) && /guide\.js/.test(sw) && /scenarios\.json/.test(sw) && /features\.json/.test(sw));
const seed = JSON.parse(read('counsel/seed.json'));
check('고민 상담 시드: 대표 고민 6개 질문이 있고 길잡이로 이어짐', PRI.every(id => seed.items.some(x => x.guide === id)), seed.items.map(x => x.guide));
check('고민 상담 시드: guide 값이 모두 있는 시나리오', seed.items.filter(x => x.guide).every(x => SC.sc.some(s => s.id === x.guide)));
check('고민 상담 화면에서 시드 글 → 길잡이 링크', /guide/.test(read('counsel/index.html')) || /guide/.test(read('assets/counsel.js')));
check('my/memory 기억 목록에 길잡이 진행', /jdj_guide/.test(read('assets/proactive.js')));

console.log(`\n고민 해결 길잡이: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
