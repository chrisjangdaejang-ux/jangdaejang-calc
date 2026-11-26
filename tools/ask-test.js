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
S = A.summary([it('가', { gu: { diff: 0.5, name: '송파구 아파트 중간값' } }), it('나', { gu: { diff: -0.1, name: '송파구 아파트 중간값' } })]);
check('구 대비 위치 한 문장', S[0], '평당가로 보면 송파구 아파트 중간값보다 가(84㎡대)는 50% 높고, 나(84㎡대)는 10% 낮아요.');
S = A.summary([it('가', { band: '150㎡ 이상', jeon: { gap: 100000 } }), it('나', { jeon: { gap: 150000 } })]);
check('조사: 받침 있는 평형 이름 뒤 이/가', S[0].startsWith('전세를 끼고 살 때 필요한 돈(갭 = 매매 시세 − 전세 시세)은 가(150㎡ 이상)이 10억원으로'), true);
check('공유 머리글', A.shareHead([{ apt: '가' }, { apt: '나' }]), '가 vs 나, 통계로 비교했어요');

/* ---------- 비교 화면 표시값(오류 막기) ---------- */
check("입주년도: '2005년(21년차)' — 음수 연식 없음", [A.ageText(2005, 2026), A.ageText(2026, 2026), A.ageText(2028, 2026), A.ageText(0, 2026), A.ageText(1800, 2026)], ['2005년(21년차)', '2026년(올해 입주)', '2028년 입주 예정', '', '']);
check("날짜 원문 노출 없음: '20050518' → '2005년 5월'", [A.ymText('20050518'), A.ymText('202610'), A.ymText('20051318'), A.ymText('')], ['2005년 5월', '2026년 10월', '', '']);
check("'-0.01%' 같은 의미 없는 값 → 비슷", [A.pctDiff(-0.0001), A.pctDiff(0.334), A.pctDiff(null)], [{ p: 0, up: false, same: true }, { p: 33, up: true, same: false }, null]);
check('이긴 쪽: 같으면 없음, 값 하나뿐이면 없음, 작을수록', [A.winner([28, 28], 1), A.winner([10, null], 1), A.winner([5, 3, 9], -1), A.winner([5, 3, 9], 1)], [-1, -1, 1, 2]);
const cntsU = [0, 0, 0, 0, 85, 10, [], String.fromCharCode(48 + 2, 48 + 3, 48 + 5)];
check('거래 회전율 = 최근 12개월 건수 ÷ 세대수', A.turnover([cntsU], 100), { r: 0.1, n: 10, hh: 100 });
check('회전율: 세대수 없으면 없음', A.turnover([cntsU], null), null);
const cd = A.chartData('sale', { ht: { months: ['202609', '202610'], s: [0, 300000], j: [0, 0] }, u: [0, 0, 0, 0, 84, 0, [], '', 0, 0, 0, [[20261003, 84, 5, 299000, 0], [20261005, 84, 5, 200000, 1]]], months: ['202610'] });
check('그래프(매매): 선 = 시세, 점 = 실제 거래(직거래 제외)', [[...cd.line], cd.dots], [[['202610', 300000]], [['202610', 299000, 20261003]]]);
const cr = A.chartData('rent', { rent: [0, 0, 0, 0, 84, 0, 0, [0, 100000], [0, 20000], [1, 250], [[20261010, 84, 3, 20000, 250, 0], [20261011, 84, 3, 120000, 0, 0]]], rentBase: '202609' });
check('그래프(월세): 선 = 월세 중간값, 점 = 월세 계약만', [[...cr.line], cr.dots.map(d => d[1])], [[['202610', 250]], [250]]);
check('달 목록', A.monthsBetween('202511', '202602'), ['202511', '202512', '202601', '202602']);

/* ---------- 화면 연결 ---------- */
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const home = rd('index.html'), mine = rd('mine/index.html'), ask = rd('ask/index.html'), askjs = rd('assets/ask.js'), core = rd('assets/ask-core.js');
check('홈·내 집 시세에 입력창', [/JDJ_ASK\.mount\(/.test(home), /JDJ_ASK\.mount\(/.test(mine), /assets\/ask\.js\?v=\d+/.test(home), /ask\.js\?v=\d+/.test(mine)], [true, true, true, true]);
check("화면 문구에 'AI' 단어 없음", [home, mine, ask, askjs].some(t => /\bAI\b|인공지능|챗봇/.test(t.replace(/<!--[\s\S]*?-->/g, ''))), false);
check("'통계로 답해요' 표현", /통계로 답해요/.test(askjs), true);
check('공유 모듈 재사용(setup·update)', /JDJ_SHARE\.setup\(\{tool:'ask'\}\)/.test(ask) && /JDJ_SHARE\.update\(/.test(ask), true);
{ const rs = ask.slice(ask.indexOf('function rowsOf'), ask.indexOf('function vsTable'));
  check("주차·초등학교 거리 줄: 두 단지 모두 자료 없으면 숨김(opt), 한 곳이라도 있으면 보여 줌", [/opt: 1, l: '주차'/.test(rs), /opt: 1, l: '초등학교 거리'/.test(rs), /rows\.filter\(r => !r\.opt \|\| r\.v\.some\(v => v !== NA\)\)/.test(rs), /자료 없음/.test(ask)], [true, true, true, true]);
  check('주차: 단지 시설 자료(fac-view) 연결', [/assets\/fac-view\.js\?v=\d+/.test(ask), /JDJ_FAC\.load\(DATA, k\.sd\)/.test(ask), /JDJ_FAC\.unit\(FC, `\$\{k\.code\}\|\$\{k\.dong\}\|\$\{k\.jibun\}`, k\.apt\)/.test(ask), /JDJ_FAC\.rows\(x\.fac\)/.test(rs)], [true, true, true, true]); }
/* 숨김 규칙 동작: opt 줄 거르기를 그대로 떼어 실행 */
{ const NA = '<span class="na">자료 없음</span>';
  const keep = rows => rows.filter(r => !r.opt || r.v.some(v => v !== NA));
  check('숨김 규칙: 둘 다 없으면 빠짐 · 한쪽만 있어도 남음 · 일반 줄은 그대로', keep([{ opt: 1, l: 'a', v: [NA, NA] }, { opt: 1, l: 'b', v: [NA, '세대당 1.2대'] }, { l: 'c', v: [NA, NA] }]).map(r => r.l), ['b', 'c']); }
{ const rs = ask.slice(ask.indexOf('function rowsOf'), ask.indexOf('function vsTable'));
  check('학업성취도는 공개 자료가 없어 표에 없음', /학업성취/.test(rs), false);
  check('학군 행: 가까운 중학교 순전입(fx.sc) + 자료 없으면 자료 없음', [/l: '학군'/.test(rs), /PL\.scParts\(x\.sc/.test(rs), /: NA; }\),\s*n: items\.map\(x => x\.sc/.test(rs)], [true, true, true]); }
check('아실형 화면: 기간 슬라이더 양끝·탭 4개·단지 패널·가운데 항목명', [/id="r0"/.test(ask) && /id="r1"/.test(ask), /\['sale', '매매'\], \['jeonse', '전세'\], \['rent', '월세'\], \['cnt', '건수'\]/.test(ask), /class="dp c\$\{i\}"/.test(ask), /v\(0\) \+ lb \+ v\(1\)/.test(ask), /다른 단지와 비교/.test(ask)], [true, true, true, true, true]);
check('집예보 강점 행이 맨 위(미래가치·보유 기간별·구 안 위치·우리 동네 흐름)', ['미래가치 점수', '보유 기간별 전망', '구 안 위치', '우리 동네 흐름'].every(l => ask.indexOf(`l: '${l}'`) > 0 && ask.indexOf(`l: '${l}'`) < ask.indexOf("l: '입주년도'")), true);
check('많이 찾는 단지: 집계 파일 + 예시 표시', /ask-popular\.json/.test(askjs) && /예시/.test(askjs), true);
const pop = JSON.parse(rd('assets/ask-popular.json'));
check('집계 파일 형식', [Array.isArray(pop.items), pop.min >= 1], [true, true]);
const stat = rd('assets/stat.js');
check('통계 허용: ask_use·danji·ask', /ask_use:\d+/.test(stat) && /danji:/.test(stat) && /'ask'\]/.test(stat), true);
check('노하우 수치(가중치·근거 코드) 화면에 안 씀', /\b(f|fx)\.(eb|why)\b/.test(core + ask), false);
const sw = rd('sw.js'), v = f => ((ask.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1]);
check('서비스 워커: 새 화면·파일 버전', [sw.includes("'./ask/'"), sw.includes(`ask-core.js?v=${v('ask-core.js')}'`), sw.includes(`ask.js?v=${v('ask.js')}'`), sw.includes(`mine-core.js?v=${v('mine-core.js')}'`), sw.includes(`stat.js?v=${v('stat.js')}'`)], [true, true, true, true, true]);

/* ---------- 단지 이름이 아닌 질문 → 이미 있는 화면으로 (2026-11-26: '서울 분양 예정 단지'가 '서울'이라는 이름의 단지 후보로 가던 문제) ---------- */
{
  const IX = { sido: [{ id: 's00', name: '서울특별시', short: '서울' }, { id: 's01', name: '부산광역시', short: '부산' }, { id: 's02', name: '대구광역시', short: '대구' },
    { id: 's04', name: '전남광주통합특별시', short: '전남광주' }, { id: 's08', name: '경기도', short: '경기' }, { id: 's13', name: '경상북도', short: '경북' }],
    sgg: { '11680': { sido: '서울특별시', name: '강남구' }, '11710': { sido: '서울특별시', name: '송파구' }, '11740': { sido: '서울특별시', name: '강동구' }, '11380': { sido: '서울특별시', name: '은평구' },
      '11500': { sido: '서울특별시', name: '강서구' }, '26440': { sido: '부산광역시', name: '강서구' }, '26350': { sido: '부산광역시', name: '해운대구' }, '26290': { sido: '부산광역시', name: '남구' },
      '47111': { sido: '경상북도', name: '포항시 남구' }, '41115': { sido: '경기도', name: '수원시 팔달구' }, '27200': { sido: '대구광역시', name: '수성구' } } };
  const T = q => { const t = A.topic(q, IX); return t ? [t.id, decodeURIComponent(t.url.replace(/^\/(jangdaejang-calc\/)?/, '')), t.where] : null; };
  check('대표 질문: 청약 가점 + 서울 분양 예정 → 내 청약 진단', T('내 청약가점이 64점인데 서울에서 분양 예정인 단지중 당첨 가능한 단지는?'), ['cy', 'chungyak/?score=64&sido=서울특별시', '서울']);   // 점수·지역을 채워 질문 없이 바로 단지별 진단(2026-11-26)
  check('청약 가점 없는 질문 → 청약 진단 첫 화면(점수 안 채움)', T('특별공급 자격 되나요?'), ['cy', 'chungyak/', '']);
  check('가점 범위 밖(90점)은 채우지 않음', T('청약 가점 90점 부산'), ['cy', 'chungyak/?sido=부산광역시', '부산']);
  check('서울 분양 예정 → 분양 화면(서울·분양예정 조건)', T('서울에서 분양 예정인 단지'), ['by', 'bunyang/?sd=서울&st=pre', '서울']);
  check('강동구 청약 중 아파트 → 분양(구·청약중·아파트)', T('강동구 청약 중인 아파트'), ['by', 'bunyang/?sd=서울&g=강동구&st=on&k=아파트', '서울 강동구']);
  check("'강남구'가 '포항시 남구'로 잡히지 않음", T('강남구 깡통전세'), ['jeonse', 'jeonse/?sd=s00&g=11680', '서울 강남구']);
  check("'해운대구'가 '대구'로 잡히지 않음", T('해운대구 집값 순위'), ['rank', 'rank/?sd=s01', '부산']);
  check('부산 많이 떨어진 구 → 순위(하락)', T('부산에서 제일 많이 떨어진 구'), ['rank', 'rank/?sd=s01&dir=down', '부산']);
  check('부산 강서구 → 부산(같은 이름 구)', A.regionOf('부산 강서구 순위', IX).g, '26440');
  check('광주 → 전남광주, 경기 광주 → 경기', [A.regionOf('광주 분양', IX).sd, A.regionOf('경기 광주 분양', IX).sd], ['s04', 's08']);
  check('전세가율 높은 단지 → 지도 전세가율(지역 조건)', T('강남구 전세가율 높은 아파트').slice(0, 2), ['mapjr', 'map/?m=jr&sd=s00&g=11680']);
  check('전세 시세 질문은 전월세 화면', T('강남구 전세 시세').slice(0, 2), ['jeonse', 'jeonse/?sd=s00&g=11680']);
  check('재개발 구역 → 구역 지도', T('우리 동네 재개발 구역'), ['zone', 'villa/zone/', '']);
  check('은평구 빌라 → 빌라 화면(구 코드)', T('은평구 빌라 시세'), ['villa', 'villa/?g=11380', '서울 은평구']);
  check('단지 이름만이면 주제 없음(단지 화면)', [A.topic('잠실엘스 헬리오시티 비교', IX), A.topic('헬리오시티', IX)], [null, null]);
  check('전세 + 단지 이름 → 단지 전월세로 갈 수 있는 주제', A.topic('헬리오시티 전세', IX).danjiOk, true);
  check('지역 낱말·주제 낱말은 단지 이름으로 쓰지 않음', [A.regionWord('서울', IX), A.regionWord('송파', IX), A.regionWord('헬리오시티', IX), A.topicWord('재건축'), A.topicWord('10억'), A.topicWord('은마')], [true, true, false, true, true, false]);
  const AJ = fs.readFileSync(path.join(root, 'assets/ask.js'), 'utf8'), BY = fs.readFileSync(path.join(root, 'bunyang/index.html'), 'utf8');
  check('입력창이 주제 질문을 화면 연결로(지역 낱말 후보 안 띄움)', [/A\.topic\(text, IX\)/.test(AJ), /regionWord\(sg\.q, IX\)/.test(AJ), /showTopic\(/.test(AJ)], [true, true, true]);
  /* 2026-11-26 결정: 휴대폰은 목록 먼저(지역·유형·분양가·정렬·관심 지역은 접힌 칸), '주변 시세보다 싼 순'(비교 자료 있는 공고만·참고·토지임대부 제외) */
  {
    const fx = /function gapOf\(x\) \{[\s\S]*?\n\}/.exec(BY)[0], gapOf = new Function(fx + '; return gapOf;')();
    check('싼 순: 면적대별 (분양가÷실거래−1) 평균, 자료 없으면 null, 토지임대부 제외',
      [Math.round(gapOf({ n: 'A', cmp: [[0, 3000, 4000], [1, 3300, 3000]] }) * 1000) / 1000, gapOf({ n: 'B', cmp: [] }), gapOf({ n: 'C 토지임대부', cmp: [[0, 1000, 4000]] })], [-0.075, null, null]);
    check('분양 화면: 접힌 칸·정렬 선택지·참고 표시', [/<details class="fold" id="fltDet">/.test(BY), /<details class="fold" id="areaDet">/.test(BY), /value="cheap">주변 시세보다 싼 순\(참고\)/.test(BY), /참고 · 같은 동네 실거래 중간값보다/.test(BY)], [true, true, true, true]);
  }
  check('분양 화면이 주소 조건(sd·g·st·k)을 읽음', [/function fromUrl\(\)/.test(BY), /q\.get\('st'\)/.test(BY), /q\.get\('k'\)/.test(BY), /fromUrl\(\);/.test(BY)], [true, true, true, true]);
}

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
