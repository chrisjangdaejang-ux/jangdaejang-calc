/* '내 집 시세' 집계 로직 자동 검증 — 실행: node tools/mine-test.js [자료 폴더(선택, 예: /tmp/dchk/data)]
   assets/mine-core.js 의 단순 집계(중간값·최저·최고·합계·변동률)와 환산, 내 집 저장 형식을 손으로 계산한 값과 맞춰 본다.
   금액 단위: 만원. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const M = require('../assets/mine-core.js');
const rows = [];
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol);
function check(name, got, want, basis, tol) {
  const ok = (typeof want === 'number' && typeof got === 'number') ? near(got, want, tol) : JSON.stringify(got) === JSON.stringify(want);
  rows.push({ ok, name, got, want, basis });
}
const months = []; for (let y = 2023, m = 11; months.length < 36; m++) { if (m > 12) { m = 1; y++; } months.push(String(y) + String(m).padStart(2, '0')); }
const cstr = a => a.map(n => String.fromCharCode(48 + n)).join('');

// 가짜 단지: 36개월 평당가 4000 → 매달 +10, 마지막 달만 거래 없음(0)
const s1 = months.map((_, i) => 4000 + i * 10); s1[35] = 0;
const c1 = months.map((_, i) => i % 3); c1[35] = 0;          // 0,1,2 반복
const u1 = ['11710', '가락동', '테스트아파트', '84㎡대', 84.9, 36, s1, cstr(c1), '100', { fv: 70, gs: 50, fvg: 80, by: 2000, hh: 1200 }];

check('월별 건수 해독', M.counts('0129'), [0, 1, 2, 9], "'0'=0 … '9'=9 (글자 코드 − 48)");
check('중간값(홀수)', M.median([3, 1, 2]), 2, '1,2,3의 가운데');
check('중간값(짝수)', M.median([4, 1, 3, 2]), 2.5, '(2+3)/2');
check('평당가 → 금액 환산', M.toPrice(10000, 84.9), 256800, '10,000 × 84.9 ÷ 3.3058 = 256,821 → 100만 원 단위 256,800');
check('만원 표시', M.won(256800), '25억 6,800만원', '');
check('만원 표시(억 딱 떨어짐)', M.won(90000), '9억원', '');
check('만원 표시(음수)', M.won(-1500), '-1,500만원', '');

let b = M.bandSummary(u1, months);
check('최근 시세: 마지막 달 거래 없으면 앞 달 값', b.ppy, 4340, 's[34] = 4000 + 34×10');
check('  └ 기준 월', b.at, months[34], '');
check('  └ 이후 거래 없음 표시', b.stale, true, '');
check('  └ 환산 시세', b.price, M.r100(4340 * 84.9 / 3.3058), '4,340 × 84.9 ÷ 3.3058 → 100만 원 단위');
check('최근 3개월 거래 합', b.recent3, c1[33] + c1[34] + c1[35], 'c[33]+c[34]+c[35] = 0+1+0');
check('1년 거래 합', b.cnt12, c1.slice(24).reduce((a, x) => a + x, 0), '마지막 12개월 합');
check('1년 범위 최저 평당가', b.range.loPpy, 4240, '최근 12개월 중 값 있는 달(24~34) 최저 = 4000+24×10');
check('1년 범위 최고 평당가', b.range.hiPpy, 4340, '최고 = 4000+34×10');
check('1년 범위 값 있는 달 수', b.range.months, 11, '12개월 중 마지막 달 0 제외');
check('1년 변동률', b.ch1.pct, (4340 - 4220) / 4220, 's[34] vs s[22] = (4340−4220)/4220');
check('  └ 비교 월', [b.ch1.fromAt, b.ch1.toAt], [months[22], months[34]], '');
check('3년 변동률(자료 처음 대비)', b.ch3, null, '마지막 값 위치 34 − 35 < 0 → 비교 불가(null)');
const b3 = M.changeBack(s1, months, 34);
check('34개월 전 대비 변동률', b3.pct, (4340 - 4000) / 4000, 's[34] vs s[0]');

// 비교 달 값이 0이면 그 뒤 2개월 안 첫 값, 없으면 null (추정으로 메우지 않음)
const s2 = s1.slice(); s2[22] = 0;
check('비교 달 거래 없음 → 다음 달 값', M.changeBack(s2, months, 12).fromAt, months[23], 's[22]=0 → s[23]');
const s3 = s1.slice(); s3[22] = s3[23] = s3[24] = 0;
check('비교 달 앞뒤 3개월 모두 없음 → null', M.changeBack(s3, months, 12), null, '');
check('최근 3개월 거래 전혀 없음 → 시세 없음', M.bandSummary(['1', 'd', 'a', 'b', 50, 12, months.map((_, i) => i < 30 ? 3000 : 0), cstr(months.map(() => 0)), 'j', null], months).price, 0, 'lastIdx 는 최근 3개월 안만 본다');

// 같은 동 비교: 같은 평형대 3개 이상이면 같은 평형끼리
const mk = (apt, band, p, dong) => ['11710', dong || '가락동', apt, band, 84, 20, months.map(() => p), cstr(months.map(() => 1)), apt, null];
const units = [u1, mk('A', '84㎡대', 4000), mk('B', '84㎡대', 5000), mk('C', '84㎡대', 3000), mk('D', '59㎡대', 9000), mk('E', '84㎡대', 9999, '문정동')];
let dp = M.dongPosition(units, u1);
check('같은 동·같은 평형 비교 대상 수', dp.n, 4, '테스트·A·B·C (59㎡대 D, 문정동 E 제외)');
check('  └ 동 중간값', dp.med, 4170, '3000·4000·4340·5000 → (4000+4340)/2');
check('  └ 중간값 대비', dp.diff, (4340 - 4170) / 4170, '');
check('  └ 순위(높은 순)', dp.rank, 2, '5000 > 4340 > 4000 > 3000');
check('  └ 같은 평형 비교 여부', dp.sameBand, true, '');
dp = M.dongPosition([u1, mk('A', '84㎡대', 4000), mk('D', '59㎡대', 9000)], u1);
check('같은 평형 3개 미만 → 동 전체 평형', [dp.sameBand, dp.n, dp.med], [false, 3, 4340], '4000·4340·9000 중간값 4340');

// 구 비교: 같은 달 값끼리
const sgg = { s: months.map(() => 5000), c: months.map((_, i) => i < 12 ? 10 : i < 24 ? 20 : 30) };
const gp = M.sggPosition(sgg, u1, months);
check('구 대비(같은 달)', gp.diff, (4340 - 5000) / 5000, 's[34] vs sgg.s[34]');
check('구 거래량 최근 12개월 vs 그 전', M.volumeCounts(sgg.c), { last12: 360, prev12: 240, pct: 0.5 }, '30×12 vs 20×12');
const v = M.volume(u1);
check('단지 거래량 최근 12개월', v.last12, c1.slice(24).reduce((a, x) => a + x, 0), '');
const t = M.trend(u1, sgg, months, 12);
check('1년 추이 구간 길이', [t.months.length, t.ppy.length, t.sgg.length, t.cnt.length], [12, 12, 12, 12], '');
check('1년 추이 첫 달', t.months[0], months[24], '');

// 단지 묶기·검색
const g = M.groupDanji([u1, ['11710', '가락동', '테스트아파트', '59㎡대', 59.9, 20, s1, cstr(c1), '100', null], mk('헬리오시티', '84㎡대', 1)]);
check('같은 단지 평형 묶기', g.get('11710|가락동|100|테스트아파트').bands.map(x => x[3]), ['59㎡대', '84㎡대'], '전용면적 순');
check('단지 이름 검색(공백 무시)', M.searchDanji(g, '헬리 오').map(d => d.apt), ['헬리오시티'], '');
check('단지 이름 검색(앞부분 일치 우선)', M.searchDanji(g, '아파트').map(d => d.apt), ['테스트아파트'], '');

// 시세 확인용 자료(price/): 청담 e편한세상 사례 — 검색 별칭·묶기·저거래 표시
const CD = ['청담대림이-편한세상', '청담2차이-편한세상(201동,202동,203동)', '청담2차이-편한세상(204동)', '청담2차이-편한세상(205동)', '청담3차이-편한세상(301동)', '청담4차이-편한세상', '청담자이'];
const hitsOf = q => CD.filter(n => M.matchName(n, q) >= 0);
check('별칭: e편한세상 = 이-편한세상 = 이편한세상', M.normName('청담 e-편한세상'), M.normName('청담이편한세상'), '하이픈·공백 제거, e→이');
check('별칭: 원래 이름은 그대로(정규화는 검색에만)', CD[0], '청담대림이-편한세상', '');
check("검색 '청담 e편한세상' → 1~4차 모두(청담자이 제외)", hitsOf('청담 e편한세상'), CD.slice(0, 6), "'대림' 표기 무시, 낱말별 포함");
check("검색 '청담이편한세상 4차' → 4차만", hitsOf('청담이편한세상 4차'), ['청담4차이-편한세상'], "'4차'는 이름의 차수와 맞춤");
check("검색 '청담4차' → 4차만", hitsOf('청담4차'), ['청담4차이-편한세상'], '');
check("검색 '청담 e편한세상 2차' → 2차 세 곳", hitsOf('청담 e편한세상 2차'), CD.slice(1, 4), '괄호 동 표기만 다른 2차 이름들');
check("검색 '청담 e편한세상 1차' → 차수 없는 1차 이름", hitsOf('청담 e편한세상 1차'), ['청담대림이-편한세상'], "이름에 '차'가 없으면 1차로 봄");
check("검색 '청담대림' → 대림 이름만", hitsOf('청담대림'), ['청담대림이-편한세상'], "검색어의 '대림'은 그대로 비교");
check("검색 '청담대림이편한세상 4차' → 4차(2~4차도 대림 단지)", hitsOf('청담대림이편한세상 4차'), ['청담4차이-편한세상'], "검색어에 '편'이 있으면 '대림' 표기 무시");
check("검색 '청담대림이편한세상4차'(붙여 씀) → 4차", hitsOf('청담대림이편한세상4차'), ['청담4차이-편한세상'], '');
check("검색 '청담대림이편' → 1~4차 모두(청담자이 제외)", hitsOf('청담대림이편'), CD.slice(0, 6), '');
check("검색 '청담 e편한세상 5차' → 없음", hitsOf('청담 e편한세상 5차'), [], '');
// 별칭·정규화(엔진 scripts/aliases.py norm 과 같은 규칙)
check('정규화: 이-편한세상 = e편한세상 = 이편한세상 = E편한세상', ['청담4차이-편한세상', '청담4차e편한세상', '청담4차 이편한세상', '청담4차E-편한세상'].map(x => M.normName(x)), Array(4).fill('청담4차이편한세상'), '');
check('정규화: 브랜드 앞 시공사 표기', ['현대힐스테이트', '삼성래미안', 'GS자이', '대우푸르지오', '현대아이파크', '포스코더샵', '에스케이뷰', 'SK VIEW', '한화꿈에그린', '동부센트레빌', '롯데 캐슬'].map(x => M.normName(x)),
  ['힐스테이트', '래미안', '자이', '푸르지오', '아이파크', '더샵', 'sk뷰', 'sk뷰', '꿈에그린', '센트레빌', '롯데캐슬'], '');
check('정규화: 차수 표기(Ⅳ·제4차·사차)', ['청담 Ⅳ', '청담 제4차', '청담 사차'].map(x => M.normName(x)), ['청담4', '청담4차', '청담4차'], '');
check('정규화: 가벼운 꼴은 시공사 표기 유지', M.normLight('청담대림이-편한세상'), '청담대림이편한세상', "'청담대림' 검색이 대림 단지만 찾게");
check("검색 '이편한세상청담4차'(브랜드가 앞, 붙여 씀) → 4차", hitsOf('이편한세상청담4차'), ['청담4차이-편한세상'], '브랜드 경계에서 낱말 나눔');
check("검색 '청담 e편한세상 사차'·'Ⅳ'·'4단지' → 4차", ['청담 e편한세상 사차', '청담 e편한세상 Ⅳ', '청담 e편한세상 4단지'].map(q => hitsOf(q).join()), Array(3).fill('청담4차이-편한세상'), "'N차'와 'N단지'는 같은 번호");
const AL = M.groupDanji([['11680', '청담동', '청담대림이-편한세상', '84㎡대', 81.8, 23, '30-33', 1, ['청담대림', '청담대림 e편한세상']],
  ['11680', '청담동', '청담4차이-편한세상', '84㎡대', 84.6, 8, '28-20', 0, ['청담 e편한세상 4차']], ['11680', '청담동', '청담자이', '84㎡대', 84, 30, '134-38', 1]].map(M.listRow));
check('별칭 칸(r[8]) → d.al', [...AL.values()].map(d => (d.al || []).length), [2, 1, 0], '');
check("별칭 검색: K-apt 이름 '청담대림' → 1차가 맨 앞", M.searchDanji(AL, '청담대림').map(d => d.apt)[0], '청담대림이-편한세상', '별칭과 똑같으면 앞');
check("별칭으로 찾은 이름 표시", M.matchedAlias([...AL.values()][0], '청담대림'), '', "표시 이름에도 '청담대림'이 들어 있으면 표시 안 함");
check("동 이름 + 지번 검색 '청담동 28-20'", M.searchDanji(AL, '청담동 28-20').map(d => d.apt), ['청담4차이-편한세상'], '');
check("동 이름 + 일부 '청담동 4차 이편한'", M.searchDanji(AL, '청담동 4차 이편한').map(d => d.apt), ['청담4차이-편한세상'], '');
check('결과 없을 때 같은 동 후보', M.suggestDanji(AL, '청담동 이펀한세상 4차', 3).map(c => c.d.apt)[0], '청담4차이-편한세상', '오타(펀)라도 같은 동에서 비슷한 이름');
check('K-apt 만 있는 단지 안내 행', M.missRows([['11680', '청담동', '청담르엘', '134-18', 2025, 'none', null]], '청담 르엘').map(r => r[5]), ['none'], '');
// 흔히 부르는 별명(NICK): 실제 이름(공개 자료 2026-11-25 그대로)에만 붙고, 묶음 별명은 묶인 단지가 모두 나옴
{
  const R = (g, d, a, j) => [g, d, a, '84㎡대', 84.9, 50, j || '1', 1];
  const NG = M.groupDanji([R('11710', '잠실동', '잠실엘스', '19'), R('11710', '잠실동', '리센츠', '27'), R('11710', '잠실동', '트리지움', '22'), R('11710', '잠실동', '주공아파트 5단지', '1'),
    R('11740', '둔촌동', '올림픽파크포레온', '170-1'), R('11680', '대치동', '은마', '316'), R('11710', '가락동', '헬리오시티', '913'), R('41196', '원종동', '엘리트', '5'),
    R('11440', '아현동', '마포래미안푸르지오1단지', '777'), R('11440', '아현동', '마포래미안푸르지오4단지', '778'), R('41135', '서현동', '시범한양', '1'), R('41135', '서현동', '시범우성', '2'),
    R('11650', '잠원동', '반포자이', '9')].map(M.listRow));
  const hit = q => M.searchDanji(NG, q).map(d => d.apt);
  check("별명 '엘리트' → 잠실엘스·리센츠·트리지움(같은 이름 단지는 앞)", hit('엘리트').sort(), ['리센츠', '엘리트', '잠실엘스', '트리지움'], '묶음 별명');
  check("별명 '둔촌주공' → 올림픽파크포레온", hit('둔촌주공'), ['올림픽파크포레온'], '옛 이름');
  check("별명 '잠실주공5단지' → 주공아파트 5단지", hit('잠실주공5단지'), ['주공아파트 5단지'], '');
  check("별명 '헬리오'·'은마'", [hit('헬리오'), hit('은마')], [['헬리오시티'], ['은마']], '');
  check("별명 '마래푸' → 1~4단지 모두", hit('마래푸').sort(), ['마포래미안푸르지오1단지', '마포래미안푸르지오4단지'], '');
  check("별명 '분당 시범단지'(1기 신도시)", hit('분당 시범단지').sort(), ['시범우성', '시범한양'], '');
  check('별명은 시군구·동·이름이 모두 맞을 때만(다른 동 같은 이름엔 안 붙음)', hit('반자'), [], "잠원동 '반포자이'는 반포동 표 이름과 동이 달라 안 붙음");
  check('별명으로 찾은 이름 표시', M.matchedAlias([...NG.values()].find(d => d.apt === '리센츠'), '엘리트'), '엘리트', '');
  check('별명 표 모양: [별명들, 5자리 코드, 동, 이름들], 별명·이름 비지 않음', M.NICK.every(x => Array.isArray(x[0]) && x[0].length && /^\d{5}$/.test(x[1]) && x[2] && Array.isArray(x[3]) && x[3].length), true, '');
  check('대표가 말한 별명 모두 표에 있음', ['은마', '엘리트', '헬리오', '둔촌주공', '잠실주공5단지'].every(n => M.NICK.some(x => x[0].includes(n))), true, '');
}
check('검색어 기록 안 함(서버 없는 환경)', M.logMiss('청담 4차'), false, '브라우저·제휴 서버가 있을 때만');
const PL = [['11680', '청담동', '청담4차이-편한세상', '84㎡대', 84.6, 8, '28-20', 0], ['11680', '청담동', '청담4차이-편한세상', '135㎡대', 136.4, 3, '28-20', 0],
  ['11680', '청담동', '청담대림이-편한세상', '84㎡대', 81.8, 23, '30-33', 1], ['11680', '청담동', '청담2차이-편한세상(204동)', '99㎡대', 98, 3, '15', 0]].map(M.listRow);
const pg = M.groupDanji(PL);
check('시세 목록 행 → 단지 묶기(지번 기준)', [...pg.values()].map(d => d.apt + ':' + d.bands.map(b => b[3]).join(',')), ['청담4차이-편한세상:84㎡대,135㎡대', '청담대림이-편한세상:84㎡대', '청담2차이-편한세상(204동):99㎡대'], '');
check("시세 목록 검색 '청담 e편한세상' 거래 많은 순", M.searchDanji(pg, '청담 e편한세상').map(d => d.apt), ['청담대림이-편한세상', '청담4차이-편한세상', '청담2차이-편한세상(204동)'], '1차 23건 > 4차 11건 > 2차 3건');
check('점수 자료 표시: 1 → 있음, 0 → 없음, fx 객체 → 있음', [M.hasScore(PL[2]), M.hasScore(PL[0]), M.hasScore(u1)], [true, false, true], '');
const smap = new Map([[M.unitKey(PL[2]), { fv: 61 }]]);
check('점수 묶음: 시세 행(1) → 점수용 Map 에서', M.scoreOf(PL[2], smap), { fv: 61 }, 'unitKey = 구|동|지번|단지|평형');
check('점수 묶음: 점수 자료 없는 행 → 없음', M.scoreOf(PL[0], smap), null, '');
const cz = months.map(() => 0); cz[20] = 1; cz[33] = 2;
const lowU = ['11680', '청담동', '청담4차이-편한세상', '135㎡대', 136.4, 3, months.map((_, i) => i >= 20 && i <= 22 ? 7658 : i >= 33 ? 8361 : 0), cstr(cz), '28-20', 0, [7658, 8361],
  [[Number(months[33] + '15'), 136.4, 9, 345000, 0], [Number(months[33] + '02'), 136.4, 4, 343000, 1], [Number(months[20] + '07'), 136.4, 12, 316000, 0]]];
check('저거래 판정: 3건 → 범위 표시(3건 미만만 목록 요약)', [M.isFew(lowU), M.isFew(Object.assign(lowU.slice(), { 5: 2 }))], [false, true], 'FEW = 3');
check('거래 있는 달(최신순, 그 달 중앙 평당가)', M.monthDeals(lowU, months).map(x => [x.at, x.n, x.ppy]), [[months[33], 2, 8361], [months[20], 1, 7658]], 'u[10] 은 오래된 달부터');
check('마지막 거래 환산', M.lastDeal(lowU, months).price, M.toPrice(8361, 136.4), '');
const tr = M.trades(lowU);
check('개별 거래 해독', [tr[0].date, tr[0].floor, tr[0].amt, tr[0].type, tr[1].type], [`${months[33].slice(0, 4)}.${months[33].slice(4)}.15`, 9, 345000, '중개', '직거래'], '유형 0 중개·1 직거래');
check('개별 거래 평당가', tr[0].ppy, Math.round(345000 / 136.4 * 3.3058), '');
check('개별 거래 없는 자료 → 빈 목록', M.trades(u1), [], '점수용 sNN 대신 쓸 때');
const PS = require('../assets/price-sheet.js');
check('시트: 괄호 동 표기 뗀 이름', PS.baseName('청담2차이-편한세상(201동,202동,203동)'), '청담2차이-편한세상', '엔진 base_name 과 같은 규칙');
check('시트: 단지 찾기(이름·평형·지번)', PS.findUnit([lowU, PL[0]], { sgg: '11680', dong: '청담동', apt: '청담4차이-편한세상', band: '135㎡대' }) === lowU, true, '');
check('시트: 괄호 동 표기 다른 이름으로도 찾기', PS.findUnit([PL[3]], { sgg: '11680', dong: '청담동', apt: '청담2차이-편한세상', band: '99㎡대' }) === PL[3], true, '');
const th = PS.tradesHtml(lowU, months, { show: 2 });
check('시트: 거래 표 최신 2건 + 더보기', [(th.match(/<tr>/g) || []).length, /더보기 \(1건 더\)/.test(th), /직거래/.test(th)], [3, true, true], '머리행 1 + 보이는 2행, 1건 숨김');
const bh = PS.btn({ sd: 's00', sgg: '11680', dong: '청담동', apt: '청담4차이-"편한"세상', band: '135㎡대', jibun: '28-20' }, 'report_top');
const bq = JSON.parse(bh.match(/data-jps="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'"));
check('시세 흐름 보기 단추: 시트가 받는 키 그대로', [bq, /data-jps-at="report_top"/.test(bh), /시세 흐름 보기/.test(bh)], [{ sd: 's00', sgg: '11680', dong: '청담동', apt: '청담4차이-"편한"세상', band: '135㎡대', jibun: '28-20' }, true, true], '따옴표 이름도 안전하게');
{ // 같은 평형 안 여러 전용 타입: 화면은 엔진이 대표 전용 기준으로 맞춘 평당가(칸 6) × 칸 4 그대로 — 근거 문구는 그 규칙을 말하되 기준 숫자는 없음
  const pg = fs.readFileSync(path.join(__dirname, '../mine/index.html'), 'utf8');
  const basis = (pg.match(/가장 많이 거래된 전용면적 기준[^)]*\)/) || [''])[0];
  check('근거 문구: 대표 전용면적 기준·다른 면적은 맞춰 씀', /가장 많이 거래된 전용면적 기준/.test(basis) && /이 면적 값으로 맞춰/.test(basis), true, '수서 까치마을 40㎡ 이하처럼 타입이 섞인 평형');
  check('근거 문구: 기준 건수·비율 숫자 없음', /\d/.test(basis), false, '엔진 SAME_MIN·ADJ_CLAMP 는 비공개');
  // 까치마을형 행: 엔진이 39.6㎡ 기준으로 맞춘 평당가 13,028 → 15억 6,100만(예전 섞인 14,638 × 39.6 = 17억 5,300만)
  const ku = ['11680', '수서동', '까치마을', '40㎡ 이하', 39.6, 188, months.map((_, i) => i === months.length - 1 ? 13028 : 0), cstr(months.map((_, i) => i === months.length - 1 ? 2 : 0)), '713', 1];
  check('까치마을형: 최근 시세 = 맞춘 평당가 × 39.6㎡', M.bandSummary(ku, months).price, 156100, '13,028 × 39.6 ÷ 3.3058 = 156,062 → 15억 6,100만');
  check('까치마을형: 리포트·갈아타기 환산도 같음', require('../assets/rec-core.js').unitPrice(ku), 156100, 'rec-core unitPrice');
}
check('공개 화면 문구에 내부 기준값 없음', /12건/.test(fs.readFileSync(path.join(__dirname, '../mine/index.html'), 'utf8')), false, '점수용 최소 거래 수는 노출하지 않음');

// 전체 기간 시세(price/h) · 신고가 · 최고가
check('연월 더하기', [M.ymAdd('201410', 3), M.ymAdd('201412', 1), M.ymAdd('202601', -1)], ['201501', '201501', '202512'], '');
check('연월 한국식', M.ymKo('200601'), '2006년 1월', '');
const HF = { hm: '201410', rm: '202201', to: '201503', v: 'V1', units: [['청담동', '청담4차이-편한세상', '84㎡대', '28-20', [2, 5000, 0, 5200, 5300], [0, 2000]], ['청담동', 'X', '84㎡대', '1', null, null]] };
const ds = M.decodeSeries(HF.units[0][4], HF.hm);
check('월별 시세 해독: 시작 칸 2 → 2014.12부터, 0 빼고', [...ds.entries()], [['201412', 5000], ['201502', 5200], ['201503', 5300]], '[시작 칸, 값…] 기준 달 hm');
const hu4 = ['11680', '청담동', '청담4차이-편한세상', '84㎡대', 84.6, 8, null, null, '28-20', 0, [], [], { f: '201412', hi: [350000, 20211015, 84.6], hi1: [330000, 20260107, 84.6] }];
check('h 행 찾기(순서 맞음)', M.histRow(HF, hu4, 0, 'V1') === HF.units[0], true, '');
check('h 행 찾기(생성본 달라도 앞 4칸으로)', M.histRow(HF, hu4, 1, 'V0') === HF.units[0], true, '동·표시명·평형·지번');
const hs = M.histSeries(HF, HF.units[0], 84.6);
check('전체 기간: 첫 달 = 매매·전세 중 이른 달, 끝 = to', [hs.months[0], hs.months[hs.months.length - 1], hs.months.length], ['201412', '201503', 4], '');
check('전체 기간: 매매 금액 환산(평당가 × 전용 ÷ 3.3058)', hs.s, [M.toPrice(5000, 84.6), 0, M.toPrice(5200, 84.6), M.toPrice(5300, 84.6)], '거래 없는 달 0');
check('전체 기간: 전세(기준 달 rm) 이 구간엔 없음', hs.j.every(v => v === 0), true, 'rm 2022.01 이후');
check('직거래만(null) 행 → 없음', M.histSeries(HF, HF.units[1], 84), null, '');
const HF2 = { hm: '202401', rm: '202401', to: '202403', units: [['d', 'a', 'b', 'j', [0, 4000, 4000, 4000], [1, 2000, 2400]]] };
const hs2 = M.histSeries(HF2, HF2.units[0], 33.058);
check('전세가율 = 전세 ÷ 매매(두 값 있는 달만)', hs2.jr, [0, 0.5, 0.6], '1월은 전세 없음');
check('기간 자르기', M.histWindow(hs, 2).months, ['201502', '201503'], '');
check('기간 단추: 자료보다 짧은 것 + 전체', M.histSpans({ months: new Array(50) }).map(b => b.label), ['1년', '3년', '전체'], '50개월 → 5년 단추 없음');
let hh = M.highs(hu4, { hm: '201410', cover: '201410' }, 315000);
check('최고가: 첫 거래가 수집 시작보다 늦으면 역대 최고가', [hh.label, hh.hi.amt, hh.hi.at, hh.hi1.amt], ['역대 최고가', 350000, '202110', 330000], 'f 201412 > cover 201410');
check('최고가 대비 지금 시세 %', hh.hi.vs, (315000 - 350000) / 350000, '(지금 − 최고) ÷ 최고');
hh = M.highs(Object.assign(hu4.slice(), { 12: { f: '201410', hi: [350000, 20211015, 84.6] } }), { hm: '201410', cover: '201410' }, 0);
check('최고가: 첫 거래 = 수집 시작이면 "YYYY년 M월 이후 최고가"', [hh.label, hh.hi1, hh.hi.vs], ['2014년 10월 이후 최고가', null, null], '그 전 자료가 없을 수 있음');
check('칸 12 없으면 최고가 없음(배포 전 자료)', M.highs(lowU, null, 1), null, '');
const nt = M.trades([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, [[20260115, 84.6, 10, 360000, 0, 1], [20260110, 84.6, 3, 340000, 0, 0], [20260101, 84.6, 3, 330000, 0]]]);
check('신고가 표시(6번째 칸 1)', nt.map(t => t.hi), [true, false, false], '없는 칸(예전 자료)은 아님');
const nth = PS.tradesHtml([0, 0, 0, 0, 84.6, 3, [], '', 0, 0, [], [[20260115, 84.6, 10, 360000, 0, 1], [20260110, 84.6, 3, 340000, 0, 0]]], months);
check('시트: 신고가 배지(빨간 작은 배지) 1개 + 설명', [(nth.match(/<\/b><br><span class="jps-new"[^>]*>신고가<\/span>/g) || []).length, /신고가<\/span> = 그 전날까지/.test(nth)], [1, true], '');
check('시트: 신고가 없으면 배지·설명 없음', /jps-new/.test(PS.tradesHtml(lowU, months)), false, '');
const hh2 = PS.highsHtml(M.highs(hu4, { hm: '201410', cover: '201410' }, 315000));
check('시트: 최고가 상자(금액·연월·지금 시세 대비)', [/35억원/.test(hh2), /2021\.10/.test(hh2), /10\.0% 낮아요/.test(hh2), /최근 1년 최고가/.test(hh2)], [true, true, true, true], '');
const hc = PS.histChart(hs, 400);
check('시트: 전체 기간 차트 두 선(매매만 있으면 전세 선 비어 있음)', (hc.match(/<path /g) || []).length, 2, '');
check('시트: 자료 기간 문구는 실제 수집 시작 달', PS.histNote({ hm: '200601', cover: '200601', rcover: '201101' }).startsWith('매매 2006년 1월부터 · 전세 2011년 1월부터'), true, '"2006년 1월부터"');
/* 2010년 이전 참고 구간(엔진 hist.mf = 예측 모델 자료 시작 달, 2026-11-26) */
const HN = PS.histNote({ hm: '200601', cover: '200601', rcover: '201101', mf: '201001' });
check('참고: 자료가 mf 보다 이르면 참고 기록 문장', HN.endsWith('2010년 이전 시세는 지난 흐름을 보여 드리는 참고 기록이에요(그래프에서 회색 칸). 미래가치 점수는 2010년 1월 이후 자료로만 계산해요.'), true, HN);
check('참고: 이 평형 첫 시세가 mf 이후면 참고 문장 없음', /참고 기록/.test(PS.histNote({ hm: '200601', cover: '200601', mf: '201001' }, { from: '201205' })), false, '');
check('참고: mf 없으면(배포 전 자료) 참고 문장 없음', /참고 기록/.test(PS.histNote({ hm: '200601', cover: '200601' })), false, '');
check('참고 칸 길이 = mf 앞 달 수', [PS.refCut(['200911', '200912', '201001', '201002'], '201001'), PS.refCut(['201001'], '201001'), PS.refCut(['200912'], ''), PS.refCut(['200912'], 'x')], [2, 0, 0, 0], '');
const ht6 = { months: ['200911', '200912', '201001', '201002'], s: [30000, 31000, 32000, 33000], j: [0, 0, 0, 0], jr: [0, 0, 0, 0] };
const c6 = PS.histChart(ht6, 400, { ref: '201001' }), c6n = PS.histChart(ht6, 400, {});
check('참고: 그래프 회색 칸 + "참고" 글씨(mf 있을 때만)', [/<rect class="ref"[^>]*fill="#F2F4F6"\/><text[^>]*>참고<\/text>/.test(c6), /class="ref"/.test(c6n)], [true, false], '');
check('참고: 2010년 이후만 보이는 기간이면 회색 칸 없음', /class="ref"/.test(PS.histChart(M.histWindow(ht6, 2), 400, { ref: '201001' })), false, '');
const tip6 = PS.histSpec(ht6, { ref: '201001', tip: true }).tip;
check('참고: 말풍선 날짜에 "참고 기록"(2010년 이전 달만)', [tip6(0).head, tip6(2).head], ['2009.11 · 참고 기록', '2010.01'], '');
const hR = M.highs(Object.assign(hu4.slice(), { 12: { f: '200603', hi: [350000, 20070415, 84.6] } }), { hm: '200601', cover: '200601', mf: '201001' }, 0);
check('참고: 역대 최고가가 2010년 이전 기록이면 참고 안내', [hR.ref, hR.note], [true, '첫 거래(2006년 3월) 이후 수집 자료 기준 · 2010년 이전 기록이라 참고로 보여 드려요'], '');
check('참고: 최고가 상자에 안내 표시', /2010년 이전 기록이라 참고로 보여 드려요/.test(PS.highsHtml(hR)), true, '');
check('참고: 2010년 이후 최고가는 안내 없음', M.highs(hu4, { hm: '200601', cover: '200601', mf: '201001' }, 315000).ref, false, '');

// 프리미엄 리포트 단지 키 = assets/pay.js JDJ_PAY.keyOf
const ctx = { window: {}, localStorage: { getItem: () => null, setItem() {} }, document: { readyState: 'loading', addEventListener() {} }, console };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/pay.js'), 'utf8'), ctx);
const P = ctx.window.JDJ_PAY;
const kp = { sd: 's00', code: '11710', dong: '가락동', apt: '헬리오시티~1!', band: '84㎡대' };
check('프리미엄 단지 키 = JDJ_PAY.keyOf', M.premiumKey(kp), P.keyOf(kp), 'pay.js 와 같은 형식');
check('프리미엄 단지 키 되읽기', P.keyParse(M.premiumKey(kp)), kp, 'pay.js keyParse');

// 내 집 저장 형식
let list = [];
for (let i = 0; i < 6; i++) { const r = M.addHome(list, { sd: 's00', code: '11710', dong: '가락동', jibun: String(i), apt: 'A' + i, band: '84㎡대', bp: 90000 + i, bd: '2020-05' }); if (r.ok) list = r.list; else check('6번째 저장 → 가득 참', r.full, true, '최대 5개'); }
check('최대 5개 저장', list.length, 5, '');
check('최근 저장이 맨 앞', list[0].apt, 'A4', '');
const r2 = M.addHome(list, { sd: 's00', code: '11710', dong: '가락동', jibun: '1', apt: 'A1', band: '84㎡대', bp: 100000 });
check('같은 집 다시 저장 → 고쳐서 맨 앞(가득 차도 가능)', [r2.ok, r2.list.length, r2.list[0].apt, r2.list[0].bp, r2.list[0].bd], [true, 5, 'A1', 100000, ''], '');
check('저장 → 읽기 그대로', M.parseStore(M.dumpStore(list)), list, '단순 JSON {v:1, list:[…]}');
check('깨진 저장값 → 빈 목록', M.parseStore('{oops'), [], '');
check('잘못된 항목 거름', M.parseStore(JSON.stringify({ v: 1, list: [{ sd: 'x', code: '1' }, { sd: 's01', code: '26110', dong: '중앙동', jibun: '1', apt: 'B', band: '59㎡대', bp: -5, bd: '2020-13' }] })).map(h => [h.apt, h.bp, h.bd]), [['B', null, '']], '시도·구 코드 형식, 음수 매수가, 13월 거름');
check('삭제', M.removeHome(list, M.homeId(list[0])).length, 4, '');
check('저장 키(서버 전송 없음, 브라우저 저장소 이름)', M.STORE_KEY, 'jdj_myhome', '');
check('매수가 대비 변동', M.vsBuy(110000, 100000), { diff: 10000, pct: 0.1 }, '11억 − 10억 = +1억, +10%');
check('매수가 없으면 변동 없음', M.vsBuy(110000, null), null, '');
check('보유 기간(개월)', M.heldMonths('2020-05', '202610'), 77, '2026.10 − 2020.05 = 6년 5개월');
check('미래 매수일 → 보유 기간 없음', M.heldMonths('2027-01', '202610'), null, '');
check('단지 키에서 단지 찾기', M.findUnit(units, { code: '11710', dong: '가락동', jibun: '100', apt: '테스트아파트', band: '84㎡대' }) === u1, true, '');

// 근거 요약: 공개 점수 그대로, 쉬운 말(plain-words.js 재사용), 계산식·가중치 문구 없음
require('../assets/plain-words.js');
const PLW = globalThis.JDJ_PLAIN;
const rs = M.reasons({ fv: 70, gs: 50, fvg: 80, by: 2000, hh: 1200, dd: 0.05, why: { '2': ['liq+', 'dd-'] } }, { apt: 'X', dong: '가락동', sgg: '송파구', sido: '서울특별시', sidoShort: '서울', nfv: 4094, nfvg: 312, label: { liq: '거래 활발도', dd: '하락기 방어력' }, year: 2026, PL: PLW });
check('근거: 미래가치 점수 문구', rs[0], '이 단지는 미래가치 70점으로 서울 아파트 4,094곳 중 상위 30%예요 · 송파구 안에서는 아파트 312곳 중 상위 20%예요(과거에 그대로 써 보고 실제 시세와 맞춰 본 점수).', '주어 + 비교 대상(곳 수) 명시');
check('근거: 곳 수 없으면 이름만', M.reasons({ fv: 70, gs: 50 }, { sgg: '송파구', sido: '서울특별시', sidoShort: '서울', PL: PLW })[0], '이 단지는 미래가치 70점으로 서울 아파트 중 상위 30%예요(과거에 그대로 써 보고 실제 시세와 맞춰 본 점수).', '숫자 지어내지 않음');
check('근거: 점수를 움직인 요인(이름만 나열 대신 이 단지 값 + 방향)', rs[1], '내린 요인 · 하락기 방어: X은 최근 3년 하락기에 구 평균보다 5%p 덜 내렸어요. 하락기에 덜 내린 단지는 이후 회복 폭이 작은 경우가 많았어요. → 2년 점수를 낮췄어요.', '');
check('근거: 사실값이 없는 요인(거래량, wf 없음)은 싣지 않음', rs.some(x => /거래 활발도|거래량/.test(x)), false, '');
check('근거: 요인에 쓴 하락기 문장은 따로 반복하지 않음', rs.filter(x => /하락기에 구 평균보다/.test(x)).length, 1, '');
check('근거: 준공·세대(동사형)', rs[2], '2000년 준공(26년차) · 1,200세대 — 4년 뒤 재건축을 추진할 수 있는 나이(30년)가 돼요 · 대단지예요', '26년차 → 30−26=4년 뒤');
check('근거에 옛 문구 없음', rs.some(x => /100곳 중|등쯤|연한\(30년\) 도래|더 빠짐/.test(x)), false, '');
check('근거에 가중치 숫자 없음', rs.some(x => /가중|weight|0\.\d{2}/.test(x)), false, '');
const EVX = { sido: { s00: { dd: { '3': { n: 2000, ex: 1.5, hit: 58, per: [['202410', 600, 1.2, 55], ['202310', 600, 1.8, 60], ['202210', 600, 1.1, 57]] } } } } };
const it = M.reasonItems({ dd: 0.05, eb: { dd: 3 } }, { dong: '가락동', sido: '서울특별시', sidoShort: '서울', sid: 's00', ev: EVX, PL: PLW });
check('근거 등급 한 줄 붙음', it[0].ev && it[0].ev.grade, '근거 강함', 'evidence.json 같은 조건 사례');

// 실제 공개 자료로 확인 (선택)
const DIR = process.argv[2];
if (DIR && fs.existsSync(path.join(DIR, 'index.json'))) {
  const IX = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));
  const S = JSON.parse(fs.readFileSync(path.join(DIR, 's00.json'), 'utf8')).units;
  const hel = S.find(u => u[2] === '헬리오시티' && u[3] === '84㎡대');
  const bs = M.bandSummary(hel, IX.months), li = M.lastIdx(hel[6]);
  check('[실자료] 헬리오시티 84㎡대 최근 시세 = rec-core unitPrice', bs.price, require('../assets/rec-core.js').unitPrice(hel), '리포트·갈아타기와 같은 환산');
  check('[실자료] 최근 3개월 거래 = rec-core recentCnt', bs.recent3, require('../assets/rec-core.js').recentCnt(hel[7]), '');
  check('[실자료] 월별 건수 합 = 자료 기간 거래수', M.counts(hel[7]).reduce((a, x) => a + x, 0), hel[5], 'u[5] 와 일치');
  check('[실자료] 기준 월', bs.at, IX.months[li], '');
  const sp = M.sggPosition(IX.sgg[hel[0]], hel, IX.months);
  check('[실자료] 구 비교 같은 달 값', sp.sggPpy, IX.sgg[hel[0]].s[li], '');
  const grp = M.groupDanji(S);
  check('[실자료] 단지 묶기 후 평형 수 합 = 단지·평형 수', [...grp.values()].reduce((a, d) => a + d.bands.length, 0), S.length, '');
  const PDIR = path.join(DIR, 'price');
  if (fs.existsSync(path.join(PDIR, 's00.json'))) {
    const L = JSON.parse(fs.readFileSync(path.join(PDIR, 's00.json'), 'utf8')).units.map(M.listRow), pgr = M.groupDanji(L);
    const hit = M.searchDanji(pgr, '청담 e편한세상', 20).filter(d => d.dong === '청담동').map(d => d.apt).sort();
    check('[실자료] 시세 목록 검색 청담 e편한세상 → 1~4차', ['청담대림이', '청담2차', '청담3차', '청담4차'].every(k => hit.some(a => a.startsWith(k))), true, hit.join(', '));
    check('[실자료] 점수용 단지·평형은 시세 목록에 모두 있음', S.every(u => pgr.has(M.danjiKey(u))), true, '');
    check('[실자료] 시세 목록 점수 표시 수 = 점수용 단지·평형 수', L.filter(u => u[9] === 1).length, S.length, '');
    const G = JSON.parse(fs.readFileSync(path.join(PDIR, '11680.json'), 'utf8')).units;
    const c4 = G.find(u => u[2] === '청담4차이-편한세상' && u[3] === '84㎡대');
    check('[실자료] 청담4차 84㎡대 있음, 점수 자료 없음', !!c4 && c4[9], 0, '');
    check('[실자료] 월별 건수 합 = 거래 수', M.counts(c4[7]).reduce((a, x) => a + x, 0), c4[5], '');
    check('[실자료] 그 달 중앙 평당가 수 = 거래 있는 달 수', c4[10].length, M.counts(c4[7]).filter(x => x > 0).length, '');
    check('[실자료] 개별 거래(직거래 제외) 수 = 거래 수', c4[11].filter(t => t[4] !== 1).length, c4[5], '');

    const GJ = JSON.parse(fs.readFileSync(path.join(PDIR, '11680.json'), 'utf8'));
    if (GJ.hist && fs.existsSync(path.join(DIR, GJ.hist.file))) {
      const HJ = JSON.parse(fs.readFileSync(path.join(DIR, GJ.hist.file), 'utf8'));
      const ei = G.findIndex(u => u[2] === '은마' && u[3] === '84㎡대'), em = G[ei];
      const ht = M.histSeries(HJ, M.histRow(HJ, em, ei, GJ.hist.v), em[4]);
      check('[실자료] 은마 84㎡대 전체 기간: 끝 달 = hist.to', ht.months[ht.months.length - 1], GJ.hist.to, '');
      check('[실자료] 은마 84㎡대 전체 기간 마지막 매매 평당가 = 최근 3년 자료 마지막 값', M.toPrice(em[6][em[6].length - 1], em[4]), ht.s[ht.s.length - 1], '같은 3개월 중간값');
      check('[실자료] 은마 84㎡대 전체 기간이 최근 3년보다 김', ht.months.length > 36, true, ht.months[0]);
      const hx = M.highs(em, GJ.hist, 0);
      check('[실자료] 역대 최고가 ≥ 최근 3년 개별 거래(직거래 제외) 최고가', hx.hi.amt >= Math.max(...em[11].filter(t => t[4] !== 1).map(t => t[3])), true, M.won(hx.hi.amt));
      const nh = G.flatMap(u => u[11]).filter(t => t[5] === 1);
      check('[실자료] 강남구 신고가 거래 있음 · 직거래는 신고가 아님', [nh.length > 0, nh.every(t => t[4] !== 1)], [true, true], nh.length + '건');
    }
    const hu = G.find(u => u[9] === 1), su = S.find(x => M.unitKey(x) === M.unitKey(hu));
    check('[실자료] 점수 자료 있는 행의 시세 = 점수용 자료와 같음', [hu[5], hu[6], hu[7]], su && [su[5], su[6], su[7]], '같은 계산');
  }
}

// 차트 공백 연결: 거래 없는 달은 앞뒤 실제 값을 점선으로 잇기만 하고 값은 만들지 않음
{
  const a = [0, 100, 110, 0, 0, 130, 0, 140, 150, 0];
  const lp = M.lineParts(a);
  check('공백 연결: 실선 조각 = 값 있는 달끼리 붙은 묶음', lp.solid, [[1, 2], [5], [7, 8]], '1~2, 5, 7~8');
  check('공백 연결: 점선 = 앞뒤 실제 값 사이(2→5, 5→7)', lp.gaps, [[2, 5], [5, 7]], '맨 앞 0·맨 뒤 0은 잇지 않음');
  check('공백 연결: 원래 배열 그대로(값 지어내지 않음)', a, [0, 100, 110, 0, 0, 130, 0, 140, 150, 0], '');
  check('공백 연결: 빈 달 없으면 점선 없음', M.lineParts([1, 2, 3]), { solid: [[0, 1, 2]], gaps: [] }, '');
  check('공백 연결: 값 없음', M.lineParts([0, 0]), { solid: [], gaps: [] }, '');
  check('공백 연결: null 입력', M.lineParts(null), { solid: [], gaps: [] }, '');
  const sp = months.map((_, i) => i % 4 === 0 ? 100 : 0);           // 36개월 중 9달
  check('드문 거래: 36개월 중 9달 → 드묾', M.isSparse(sp), true, '9×3 < 36');
  const sp2 = months.map((_, i) => i % 3 === 0 ? 100 : 0);          // 12달
  check('드문 거래: 36개월 중 12달 → 드물지 않음(딱 1/3)', M.isSparse(sp2), false, '12×3 = 36');
  check('드문 거래: 마지막 36개월만 봄', M.isSparse(Array(60).fill(100).concat(sp)), true, '앞 24개월은 무시');
  check('드문 거래: 값 없음 → false', M.isSparse([0, 0, 0]), false, '');
}

// 차트 안내선(말풍선): 갭 = 매매 − 전세, 갭 비율 = 갭 ÷ 매매, 전세가율 = 전세 ÷ 매매 — 둘 다 실제 값인 달만
{
  const g = M.gapOf(148713, 37105);
  check('갭: 14억 8,713 − 3억 7,105 = 11억 1,608', g.gap, 111608, '호갱노노 예시 값');
  check('갭 비율: 갭 ÷ 매매 = 75.0%', Math.round(g.pct * 1000) / 10, 75, '111608 ÷ 148713');
  check('전세가율: 전세 ÷ 매매 = 25.0%', Math.round(g.jr * 1000) / 10, 25, '37105 ÷ 148713');
  check('갭: 전세 없으면 없음', M.gapOf(100000, 0), null, '');
  check('갭: 매매 없으면 없음', M.gapOf(0, 50000), null, '');
  check('갭: 역전(전세 > 매매) → 음수', M.gapOf(30000, 33000).gap, -3000, '깡통 전세 신호');
  const a = [0, 100, 0, 0, 160, 0];
  check('안내선 값: 실제 달', M.valAt(a, 1), { v: 100, real: true }, '');
  check('안내선 값: 거래 없는 달 = 앞뒤 실제 값을 이은 선 위(표시용)', M.valAt(a, 2), { v: 120, real: false, from: 1, to: 4 }, '100 + (160 − 100) × 1/3');
  check('안내선 값: 맨 앞·맨 뒤 빈 달은 없음', [M.valAt(a, 0), M.valAt(a, 5)], [null, null], '점선도 없는 곳');
  check('안내선 값: 원래 배열 그대로', a, [0, 100, 0, 0, 160, 0], '값을 지어 넣지 않음');
  const t = { months: ['201705', '201706', '201707'], s: [148713, 150000, 0], j: [37105, 0, 0], jr: [0.25, 0, 0] };
  const p0 = M.monthPoint(t, 0), p1 = M.monthPoint(t, 1);
  check('한 달 값: 매매·전세 모두 실제 → 갭 있음', [p0.ym, p0.gap && p0.gap.gap], ['201705', 111608], '');
  check('한 달 값: 전세가 없는 달 → 갭 없음', [p1.s.v, p1.j, p1.gap], [150000, null, null], '맨 뒤 빈 달은 잇지 않음');
  const t2 = { months: ['1', '2', '3'], s: [100, 110, 120], j: [50, 0, 70] };
  check('한 달 값: 전세가 이은 값이면 갭 계산 안 함', [M.monthPoint(t2, 1).j.real, M.monthPoint(t2, 1).gap], [false, null], '지어낸 갭 방지');
  const tf = PS.histTip({ months: ['201705', '201706', '201707'], s: [148713, 0, 152000], j: [37105, 0, 38000], jr: [0.25, 0, 0.25] }, new Map([['201705', 3]]));
  const o0 = tf(0), o1 = tf(1);
  check('말풍선: 연월·매매·전세·갭·전세가율·건수', [o0.head, o0.rows.map(r => r.v), o0.gap, o0.extra], ['2017.05', ['14억 8,713만원', '3억 7,105만원'], { v: '11억 1,608만원', pct: 75, jr: 25 }, ['이 달 매매 신고 3건']], '');
  check('말풍선: 거래 없는 달 = "약 …" + 이은 값 안내, 갭 없음', [o1.rows.map(r => [r.v, r.fill]), o1.gap, o1.extra[0]], [[['약 15억 400만원', true], ['약 3억 7,600만원', true]], undefined, '매매·전세 거래 없음 — 앞뒤 거래로 이은 값이에요'], '100만 원 단위 반올림');
  check('말풍선: 화면 읽기 문장', /갭 11억 1,608만원, 매매가의 75%/.test(o0.say), true, o0.say);
}

// 구 전체 비교선(같은 면적 환산) · 예비 평당가 차트 말풍선
{
  const gl = M.sggLine([7914, 8012, 0, 8291], ['202311', '202312', '202401', '202402'], ['202310', '202311', '202401', '202402'], 84.9);
  check('구 비교선: 구 평당가 × 전용 ÷ 3.3058, 달 맞춤', gl, [0, M.toPrice(7914, 84.9), 0, M.toPrice(8291, 84.9)], '구 자료 없는 달(시작 전·0) = 0');
  check('구 비교선: 환산 값', M.toPrice(12782, 84.9), Math.round(12782 * 84.9 / 3.3058 / 100) * 100, '100만 원 반올림');
  check('단지 대 구: 높아요·낮아요·비슷해요', [M.vsSgg(330000, 300000).txt, M.vsSgg(270000, 300000).txt, M.vsSgg(301000, 300000).txt, M.vsSgg(0, 1)], ['이 단지가 10% 높아요', '이 단지가 10% 낮아요', '이 단지가 비슷해요', null], '(단지 − 구) ÷ 구');
  const t = { months: ['202311', '202312', '202401'], s: [330000, 0, 340000], j: [0, 0, 0], jr: [0, 0, 0] };
  const sp = PS.histSpec(t, { tip: true, gu: { name: '강남구', s: [10000, 11000], months: ['202312', '202401'], area: 99.174 } });
  check('구 비교선: 회색 점선 한 줄 추가(구 자료 있는 달만)', [sp.lines.length, sp.lines[0].dash, sp.lines[0].a], [3, true, [0, 300000, 330000]], '202311 은 구 자료 전');
  const o = sp.tip(2), o0 = sp.tip(0), o1 = sp.tip(1);
  check('말풍선: 구 전체 줄 + 차이', [o.rows[1].k, o.rows[1].v, o.vs.txt], ['강남구 전체(같은 면적 환산)', '33억원', '이 단지가 3% 높아요'], '340000 ÷ 330000');
  check('말풍선: 구 자료 전 달 / 단지 거래 없는 달 → 차이 없음', [o0.rows[1].v, o0.vs, o1.vs], ['자료 없음(2023.12부터)', undefined, undefined], '이은 값으로는 비교하지 않음');
  check('구 비교선 설명: 보이는 첫 달이 구 자료보다 이르면 시작 달 안내', [/2023년 12월부터/.test(PS.guNote({ name: '강남구', s: [1, 2], months: ['202312', '202401'], area: 84.9 }, '201410')), /부터/.test(PS.guNote({ name: '강남구', s: [1, 2], months: ['202312', '202401'], area: 84.9 }, '202312'))], [true, false], '');
  const pp = PS.ppySpec({ months: ['202401', '202402', '202403'], ppy: [9000, 0, 9900], sgg: [9000, 9100, 9000], cnt: [2, 0, 1] }, { name: '강남구' });
  const q0 = pp.tip(0), q1 = pp.tip(1), q2 = pp.tip(2);
  check('예비 차트: 단지·구 평당가 + 차이', [q2.rows.map(r => r.v), q2.vs.txt, q0.vs.txt], [['9,900만', '9,000만'], '이 단지가 10% 높아요', '이 단지가 비슷해요'], '만원/3.3㎡');
  check('예비 차트: 거래 없는 달 표시', [q1.rows[0].v, q1.rows[0].fill, q1.vs, q1.extra], ['약 9,450만', true, undefined, ['이 단지 거래 없음 — 앞뒤 거래로 이은 값이에요', '이 달 매매 신고 없음 · 값은 앞 3개월 거래 기준']], '');
  check('예비 차트: 구 점선 + 단지 선', [pp.lines.length, pp.lines[0].dash, !!PS.plot(pp, 400).model], [2, true, true], '');
}

// 이상값 방어(엔진 far_ok·land_ok 와 같은 기준): 용적률 1% → 근거·사업성 순위에서 빠짐
{
  const f1 = M.cleanFx({ vl: 0.8, rbp: 99, land: 12, landavg: 14, lrk: 60, area: 59 });
  check('이상값: 용적률 0.8% → 지움', f1.vl, null, '50~1000% 밖');
  check('이상값: 용적률로 만든 사업성 순위도 지움', f1.rbp, null, '상위 1% 문구 방지');
  check('이상값: 정상 대지지분은 그대로', f1.land, 12, '');
  const f2 = M.cleanFx({ vl: 180, rbp: 70, land: 103, landavg: 12, area: 41 });
  check('정상 용적률 유지', f2.vl, 180, '');
  check('이상값: 전용 41㎡에 대지지분 103평 → 지움', f2.land, null, '전용의 5배 초과');
  check('빈 값 그대로', M.cleanFx(null), null, '');
}

{ // 구 전체 비교선 자료: price/h 의 sgg(전체 기간)가 있으면 그것, 없으면 index.json 최근 3년
  const ixs = { name: '강남구', s: [0, 9000, 9100] }, ixm = ['202408', '202409', '202410'];
  const g1 = PS.guOf({ hm: '201410', to: '201503', sgg: [1, 3206, 0, 3313] }, ixs, ixm, 84.9);
  check('구 비교선: h 파일 sgg 해독(시작 칸 1 = 201411, 0 은 빈 달, to 까지 채움)', g1 && [g1.name, g1.months, g1.s, g1.area], ['강남구', ['201411', '201412', '201501', '201502', '201503'], [3206, 0, 3313, 0, 0], 84.9], '');
  check('구 비교선: 설명 문구 시작 달 = 실제 첫 달', /2014년 11월부터/.test(PS.guNote(g1, '201410')), true, '');
  const g2 = PS.guOf({ hm: '201410', units: [] }, ixs, ixm, 84.9, '강남');
  check('구 비교선: sgg 없으면 index.json 36개월로 대신', g2 && [g2.name, g2.months, g2.s], ['강남', ixm, ixs.s], '');
  check('구 비교선: 둘 다 없으면 null', [PS.guOf(null, null, ixm, 84.9), PS.guOf(null, { s: [0, 0] }, ixm, 84.9)], [null, null], '');
}

{ // 동 이름을 붙여 쓴 검색(2026-11-24 대표 제보: '잠실주공5단지' → '주공아파트 5단지'(잠실동))
  const mk = (apt, dong) => ({ apt, dong, jibun: '', al: [], n: 100 });
  const G = new Map([['a', mk('주공아파트 5단지', '잠실동')], ['b', mk('잠실엘스', '잠실동')], ['c', mk('주공5단지', '개포동')]]);
  const f = q => M.searchDanji(G, q).map(x => x.dong + ' ' + x.apt);
  check('동 이름 붙여 쓴 검색: 잠실주공5단지', f('잠실주공5단지'), ['잠실동 주공아파트 5단지'], '앞의 동 이름(잠실)을 떼고 이름 비교');
  check('동 이름 붙여 쓴 검색: 잠실동주공5단지', f('잠실동주공5단지'), ['잠실동 주공아파트 5단지'], '동 전체 이름도');
  check('동 이름 붙여 쓴 검색: 다른 동 단지는 안 섞임', f('개포주공5단지'), ['개포동 주공5단지'], '개포동만');
  check('이름에 동 이름이 든 단지는 그대로', f('잠실엘스'), ['잠실동 잠실엘스'], '이름 그대로 맞음');
}

/* 2026-11-26 전세가율 화면 통일: 내 집 시세·지도·관심 목록·성적표가 같은 규칙(jrNow) — 예전 지도·관심 목록은 모델 칸(41%), 내 집 시세는 43% */
{
  const z = n => new Array(n).fill(0);
  const H = { hm: '202601', rm: '202601', to: '202610', units: [
    ['가락동', '헬리오시티', '84㎡대', '913', [0].concat(z(9), [11280]), [0].concat(z(9), [4863])],
    ['가락동', '헬리오시티', '59㎡대', '913', [0].concat(z(8), [9000, 0]), [0].concat(z(8), [3600, 0])],
    ['가락동', '오래된', '84㎡대', '1', [0, 5000].concat(z(9)), [0, 2000].concat(z(9))]] };
  const J = M.histJrMap(H);
  check('전세가율: 자료 끝 달 전세 ÷ 매매', Math.round(J.get('가락동|913|헬리오시티|84㎡대') * 1000) / 10, 43.1, 'mine-core jrNow');
  check('전세가율: 끝 달에 없으면 3개월 안 가장 최근 달', J.get('가락동|913|헬리오시티|59㎡대'), 0.4, 'jrNow 3개월');
  check('전세가율: 3개월보다 오래된 값은 쓰지 않음', J.has('가락동|1|오래된|84㎡대'), false, 'jrNow 3개월');
  const fs = require('fs'), path = require('path'), rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  check('화면이 같은 함수: 내 집 시세·지도', [/M\.jrNow\(t\)/.test(rd('mine/index.html')), /M\.histJrMap\(h\)/.test(rd('map/index.html'))], [true, true], 'mine/·map/');
  check('관심 목록·성적표에 전세가율 기준 한 줄', [rd('my/watch/index.html'), rd('my/report/index.html')].map(s => s.includes('내 집 시세·지도와 같은 기준')), [true, true], 'my/watch·my/report');
}

let bad = 0;
for (const r of rows) { if (!r.ok) bad++; console.log((r.ok ? 'OK  ' : 'FAIL') + ' ' + r.name + (r.ok ? '' : `\n     got ${JSON.stringify(r.got)}\n    want ${JSON.stringify(r.want)}  (${r.basis})`)); }
console.log(`\n${rows.length - bad}/${rows.length} 통과`);
process.exit(bad ? 1 : 0);
