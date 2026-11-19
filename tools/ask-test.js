/* '단지 이름으로 물어보기' 검증: node tools/ask-test.js
   - 문장 → 단지 1~3곳 찾기(불용어·조사·평형 힌트·별칭·N차/N단지), 애매하면 후보
   - 요약 문장 템플릿: 숫자 모순 없음(다른 값을 '같다'고 하지 않음), 주어·비교 기준 표시
   - 화면 연결: 홈·내 집 시세에 입력창, 공유 모듈 재사용, 'AI' 단어 없음, 많이 찾는 단지는 집계 파일로만
   실제 단지 이름은 ../jangdaejang-data(자료 저장소)가 옆에 있으면 실제 자료로, 없으면 아래 작은 목록으로 확인 */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const M = require('../assets/mine-core.js'), A = require('../assets/ask-core.js');
let ok = 0, bad = 0;
function check(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { ok++; console.log('OK  ', name); } else { bad++; console.log('실패:', name, '\n  결과', g, '\n  기대', w); }
}

/* ---------- 단지 목록(시세 목록 행 모양: [구, 동, 단지, 평형, 전용, 거래수, 지번, 점수]) ---------- */
const ROWS = [
  ['11710', '잠실동', '잠실엘스', '84㎡대', 84.8, 300, '19', 1], ['11710', '잠실동', '잠실엘스', '59㎡대', 59.9, 163, '19', 1],
  ['11710', '가락동', '헬리오시티', '84㎡대', 85, 450, '913', 1], ['11710', '가락동', '헬리오시티', '59㎡대', 59.9, 359, '913', 1],
  ['11710', '잠실동', '리센츠', '84㎡대', 84.9, 557, '22', 1], ['11710', '신천동', '파크리오', '84㎡대', 84.9, 765, '17', 1],
  ['11470', '목동', '목동신시가지7', '74㎡대', 74.4, 219, '905', 1], ['11470', '목동', '목동신시가지3', '84㎡대', 84, 110, '903', 1],
  ['11470', '목동', '목동신시가지1', '84㎡대', 84, 143, '901', 1], ['11470', '신정동', '목동신시가지14', '84㎡대', 84, 174, '329', 1],
  ['11470', '목동', '목동동화옥시죤-7', '84㎡대', 84, 6, '950', 0],
  ['11680', '청담동', '청담대림이-편한세상', '84㎡대', 81.8, 39, '30-33', 1], ['11680', '청담동', '청담4차이-편한세상', '84㎡대', 84.6, 11, '28-20', 0],
  ['11680', '청담동', '청담자이', '84㎡대', 82.6, 71, '134-18', 1],
  ['11680', '대치동', '은마', '84㎡대', 84.4, 186, '316', 1], ['11680', '대치동', '래미안대치팰리스', '84㎡대', 84.9, 111, '1027', 1],
  ['11650', '반포동', '반포자이', '84㎡대', 84.9, 267, '20-43', 1], ['11650', '반포동', '아크로리버파크', '84㎡대', 84.9, 155, '2-12', 1],
  ['11650', '반포동', '래미안원베일리', '84㎡대', 84.9, 169, '1-1', 1], ['11740', '둔촌동', '올림픽파크포레온', '84㎡대', 84.9, 123, '170-1', 1],
  ['11200', '행당동', '대림e-편한세상', '84㎡대', 84.9, 293, '1', 1], ['11230', '이문동', '대림e-편한세상', '84㎡대', 84.9, 185, '2', 1],
  ['11440', '아현동', '마포래미안푸르지오1단지', '84㎡대', 84.6, 89, '1', 1], ['11440', '아현동', '마포래미안푸르지오2단지', '84㎡대', 84.6, 130, '2', 1],
  ['11590', '사당동', '래미안로이파크', '84㎡대', 84, 40, '9', 1], ['11650', '반포동', '래미안퍼스티지', '84㎡대', 84.9, 217, '18-1', 1],
  ['41190', '상동', '래미안부천중동', '84㎡대', 84, 30, '1', 1]
].map(M.listRow);
const G = new Map(); for (const [k, d] of M.groupDanji(ROWS)) { d.sd = d.code.startsWith('11') ? 's00' : 's08'; G.set(d.sd + '|' + k, d); }
const picks = q => A.parse(q, G).segs.map(s => s.pick ? s.pick.apt : 'cands:' + s.cands.map(d => d.apt + '@' + d.dong).join(','));

/* ---------- 문장 파싱 ---------- */
check("'잠실엘스 헬리오시티 비교' → 두 곳", picks('잠실엘스 헬리오시티 비교'), ['잠실엘스', '헬리오시티']);
check("'목동 신시가지 3단지 지금 사도 될까?' → 한 곳(낱말 셋을 한 이름으로)", picks('목동 신시가지 3단지 지금 사도 될까?'), ['목동신시가지3']);
check("'청담대림이편한세상 4차' → 4차", picks('청담대림이편한세상 4차'), ['청담4차이-편한세상']);
check("'헬리오' → 헬리오시티(이름 일부)", picks('헬리오'), ['헬리오시티']);
check("'목동7단지' → 목동신시가지7(이름 끝 숫자 = N단지, 거래가 압도적으로 많은 곳)", picks('목동7단지'), ['목동신시가지7']);
check("'목동 1단지' → 1단지만(14단지 아님)", picks('목동 1단지'), ['목동신시가지1']);
check("'잠실엘스랑 리센츠 중 어디가 나아?' → 조사·불용어 빼고 두 곳", picks('잠실엘스랑 리센츠 중 어디가 나아?'), ['잠실엘스', '리센츠']);
check("'반포자이, 아크로리버파크, 래미안원베일리 비교' → 세 곳", picks('반포자이, 아크로리버파크, 래미안원베일리 비교'), ['반포자이', '아크로리버파크', '래미안원베일리']);
check("'은마 vs 래미안대치팰리스' → 두 곳", picks('은마 vs 래미안대치팰리스'), ['은마', '래미안대치팰리스']);
check("'은마랑 래미안 비교' → '은마 래미안'을 한 이름으로 붙이지 않음", picks('은마랑 래미안 비교')[0], '은마');
check("'둔촌주공 헬리오시티' → 옛 이름 별칭", picks('둔촌주공 헬리오시티'), ['올림픽파크포레온', '헬리오시티']);
check("'청담 e편한세상 1차 청담자이' → 1차(차수 없는 이름) + 청담자이", picks('청담 e편한세상 1차 청담자이'), ['청담대림이-편한세상', '청담자이']);
check("'대림e편한세상' → 같은 이름 여러 곳이면 후보", picks('대림e편한세상'), ['cands:대림e-편한세상@행당동,대림e-편한세상@이문동']);
check("'마포래미안푸르지오' → 1·2단지 후보", picks('마포래미안푸르지오')[0].startsWith('cands:마포래미안푸르지오2단지'), true);
check("'래미안' → 흔한 짧은 이름은 후보", picks('래미안')[0].startsWith('cands:'), true);
check("'비교해줘 지금' → 단지 없음", A.parse('비교해줘 지금', G).segs.length, 0);
check("'파크리오 34평' → 평형 힌트 84㎡", [picks('파크리오 34평'), A.parse('파크리오 34평', G).hint.area], [['파크리오'], 84]);
check("'헬리오시티 59' → 59㎡대 고름", A.pickBand([...G.values()].find(d => d.apt === '헬리오시티'), A.parse('헬리오시티 59', G).hint), '59㎡대');
check('평형 기본값 84㎡대', A.pickBand([...G.values()].find(d => d.apt === '잠실엘스'), null), '84㎡대');
check('네 곳 넘으면 3곳까지', [A.parse('잠실엘스 헬리오시티 리센츠 파크리오', G).segs.length, A.parse('잠실엘스 헬리오시티 리센츠 파크리오', G).more], [3, true]);
check('같은 단지 두 번 → 한 번', picks('헬리오시티 헬리오시티 잠실엘스'), ['헬리오시티', '잠실엘스']);

/* ---------- 주소 ---------- */
const hel = [...G.values()].find(d => d.apt === '헬리오시티'), els = [...G.values()].find(d => d.apt === '잠실엘스');
const u1 = new URL(A.target([{ d: hel, band: '' }], null, 'home'), 'https://x');
check('1곳 → 내 집 시세', [u1.pathname, u1.searchParams.get('sd'), u1.searchParams.get('d')], ['/jangdaejang-calc/mine/', 's00', '11710|가락동|913|헬리오시티']);
const u2 = new URL(A.target([{ d: hel, band: '' }, { d: els, band: '' }], null, 'home'), 'https://x');
check('2곳 → 단지 비교, 키 되살리기', [u2.pathname, A.unpackList(u2.searchParams.get('k')).map(A.parseKey).map(k => k.apt)], ['/jangdaejang-calc/ask/', ['헬리오시티', '잠실엘스']]);
check("이름 안 쉼표·느낌표도 그대로", A.unpackList(A.packList(['우장산아이파크,이편한세상', 'a!b%c'])), ['우장산아이파크,이편한세상', 'a!b%c']);

/* ---------- 비교 값 ---------- */
const months = ['202606', '202607', '202608', '202609', '202610'];
const tu = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, [[20261020, 84.9, 10, 300000, 0], [20261003, 84.9, 5, 280000, 1], [20260815, 84.9, 7, 290000, 0], [20260610, 84.9, 7, 250000, 0]]];
check('실거래 평균: 최근 3개월, 직거래 제외', A.avgDeal(tu, months), { v: 295000, n: 2, from: '202608', to: '202610', span: 3 });
check('전세가율·갭: 매매·전세 모두 있는 최근 달', A.jeonseOf({ months: ['202609', '202610'], s: [300000, 300000], j: [120000, 0] }, null), { jr: 0.4, gap: 180000, sale: 300000, jeonse: 120000, at: '202609', src: 'hist' });

/* ---------- 요약 문장 ---------- */
const base = { fvBase: '서울 아파트', hzOk: { 1: false, 2: true, 3: true, 5: true, 7: false } };
const it = (apt, o) => Object.assign({ apt, band: '84㎡대' }, base, o);
let S = A.summary([it('가', { price: { v: 295000 }, avg: { v: 290000, span: 3 }, fv: 72 }), it('나', { price: { v: 261000 }, avg: { v: 290000, span: 3 }, fv: 72 })]);
check('시세가 다르면 차이 금액을 그대로(같다고 하지 않음)', S[0], '최근 시세는 가(84㎡대)가 29억 5,000만원으로, 나(84㎡대) 26억 1,000만원보다 3억 4,000만원 높아요.');
check('점수가 같을 때만 같다고, 비교 기준 표시', S[1], '미래가치 점수(2년 보유 기준)는 가(84㎡대)와 나(84㎡대)가 모두 서울 아파트 중 상위 28%로 같아요.');
check("요약에 '동률' 같은 말 없음", S.some(t => /동률|비긴|무승부/.test(t)), false);
S = A.summary([it('가', { price: { v: 300000 }, fv: 90, fh: { 5: 40 } }), it('나', { price: { v: 300000 }, fv: 60, fh: { 5: 80 } })]);
check('같은 시세는 같다고', S[0], '최근 시세는 가(84㎡대)와 나(84㎡대) 모두 30억원으로 같아요.');
check('점수 차이: 높은 쪽이 주어, 상대값 함께', S[1], '미래가치 점수(2년 보유 기준)는 가(84㎡대)가 서울 아파트 중 상위 10%로, 나(84㎡대)의 상위 40%보다 순위가 높아요.');
check('검증 통과한 5년에서 1위가 바뀌면 알려 줌', S[2], '다만 5년 보유 기준으로는 나(84㎡대)가 상위 20%로, 가(84㎡대)의 하위 40%보다 앞서요.');
S = A.summary([it('가', { avg: { v: 200000, span: 3 } }), it('나', { price: { v: 260000 }, avg: { v: 250000, span: 3 } })]);
check('시세가 한쪽만 있으면 시세 대신 같은 기준(실거래 평균)끼리', S[0], '최근 실거래 평균은 나(84㎡대)가 25억원으로, 가(84㎡대) 20억원보다 5억원 높아요(거래가 적어 시세 대신 평균으로 비교했어요).');
S = A.summary([it('가', { avg: { v: 200000, span: 3 } }), it('나', { avg: { v: 250000, span: 12 } })]);
check('평균 기간이 다르면 견주지 않음', S.length, 0);
S = A.summary([it('가', { fv: 70, fvBase: '서울 아파트' }), it('나', { fv: 80, fvBase: '경기 아파트' })]);
check('시·도가 다르면 점수로 승부를 가르지 않음', /바로 견주기 어려워요/.test(S[0]) && /가\(84㎡대\)는 서울 아파트 중 상위 30%/.test(S[0]), true);
S = A.summary([it('가', { gu: { diff: 0.5, name: '송파구 아파트 중앙값' } }), it('나', { gu: { diff: -0.1, name: '송파구 아파트 중앙값' } })]);
check('구 대비 위치 한 문장', S[0], '평당가로 보면 송파구 아파트 중앙값보다 가(84㎡대)는 50% 높고, 나(84㎡대)는 10% 낮아요.');
S = A.summary([it('가', { band: '150㎡ 이상', jeon: { gap: 100000 } }), it('나', { jeon: { gap: 150000 } })]);
check('조사: 받침 있는 평형 이름 뒤 이/가', S[0].startsWith('전세를 끼고 살 때 필요한 돈(갭 = 매매 시세 − 전세 시세)은 가(150㎡ 이상)이 10억원으로'), true);
check('공유 머리글', A.shareHead([{ apt: '가' }, { apt: '나' }]), '가 vs 나, 통계로 비교했어요');

/* ---------- 화면 연결 ---------- */
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const home = rd('index.html'), mine = rd('mine/index.html'), ask = rd('ask/index.html'), askjs = rd('assets/ask.js'), core = rd('assets/ask-core.js');
check('홈·내 집 시세에 입력창', [/JDJ_ASK\.mount\(/.test(home), /JDJ_ASK\.mount\(/.test(mine), /assets\/ask\.js\?v=\d+/.test(home), /ask\.js\?v=\d+/.test(mine)], [true, true, true, true]);
check("화면 문구에 'AI' 단어 없음", [home, mine, ask, askjs].some(t => /\bAI\b|인공지능|챗봇/.test(t.replace(/<!--[\s\S]*?-->/g, ''))), false);
check("'통계로 답해요' 표현", /통계로 답해요/.test(askjs), true);
check('공유 모듈 재사용(setup·update)', /JDJ_SHARE\.setup\(\{tool:'ask'\}\)/.test(ask) && /JDJ_SHARE\.update\(/.test(ask), true);
check("없는 자료는 '자료 없음'", /자료 없음/.test(ask) && /case 'park': return NA/.test(ask) && /case 'school': return NA/.test(ask), true);
check('많이 찾는 단지: 집계 파일 + 예시 표시', /ask-popular\.json/.test(askjs) && /예시/.test(askjs), true);
const pop = JSON.parse(rd('assets/ask-popular.json'));
check('집계 파일 형식', [Array.isArray(pop.items), pop.min >= 1], [true, true]);
const stat = rd('assets/stat.js');
check('통계 허용: ask_use·danji·ask', /ask_use:\d+/.test(stat) && /danji:/.test(stat) && /'ask'\]/.test(stat), true);
check('노하우 수치(가중치·근거 코드) 화면에 안 씀', /\b(f|fx)\.(eb|why)\b/.test(core + ask), false);
const sw = rd('sw.js'), v = f => ((ask.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1]);
check('서비스 워커: 새 화면·파일 버전', [sw.includes("'/jangdaejang-calc/ask/'"), sw.includes(`ask-core.js?v=${v('ask-core.js')}'`), sw.includes(`ask.js?v=${v('ask.js')}'`), sw.includes(`mine-core.js?v=${v('mine-core.js')}'`), sw.includes(`stat.js?v=${v('stat.js')}'`)], [true, true, true, true, true]);

/* ---------- 실제 자료(있으면) ---------- */
const DD = path.join(root, '..', 'jangdaejang-data', 'data', 'price', 's00.json');
if (fs.existsSync(DD)) {
  const RG = new Map(); for (const [k, d] of M.groupDanji(JSON.parse(fs.readFileSync(DD, 'utf8')).units.map(M.listRow))) { d.sd = 's00'; RG.set('s00|' + k, d); }
  const rp = q => A.parse(q, RG).segs.map(s => s.pick ? s.pick.apt : 'cands');
  check('실제 자료: 잠실엘스 헬리오시티', rp('잠실엘스 헬리오시티 비교'), ['잠실엘스', '헬리오시티']);
  check('실제 자료: 목동 신시가지 3단지', rp('목동 신시가지 3단지 지금 사도 될까?'), ['목동신시가지3']);
  check('실제 자료: 청담대림이편한세상 4차', rp('청담대림이편한세상 4차'), ['청담4차이-편한세상']);
  check('실제 자료: 목동7단지', rp('목동7단지'), ['목동신시가지7']);
} else console.log('(실제 자료 저장소가 옆에 없어 실제 이름 확인은 건너뜀)');

console.log(`\n단지 이름으로 물어보기 검증: ${ok}/${ok + bad} 통과`);
if (bad) process.exit(1);
