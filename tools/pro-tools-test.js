/* 중개사 프로 도구(agent/pro/ — 손님용 단지 리포트 · 동네 블로그·인스타 글) 검사 — 실행: node tools/pro-tools-test.js </dev/null
   ① 거래 판정(엔진 brief.py·brief_plus.py 와 같은 기준) ② 전세가율·입주 물량 ③ 리포트 화면(확인된 중개사만 이름·Powered by·안내 문장·세 장)
   ④ 문장 자체 검사(엔진 claim_check.py 와 같은 규칙 + 최상급 숫자 문장 빼기) ⑤ 과장·개인정보 거르기 ⑥ 동네 글(묶음·직거래·매물 광고 아님·카드 2~4장)
   ⑦ 숨김 플래그·화면 ⑧ 서버 v66(확인된 중개사만 이름·손님 링크·로고) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
global.JDJ_PRO = require('../assets/pro-report.js');
global.JDJ_BRIEF = require('../assets/brief-core.js');
global.JDJ_BT = require('../assets/broker-tools.js');
const T = global.JDJ_BT;
const PT = require('../assets/pro-tools-core.js');
const M = require('../assets/mine-core.js');
let ok = 0, bad = 0;
const check = (name, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); if (g === w) ok++; else { bad++; console.log('틀림:', name, '\n  나옴:', g, '\n  기대:', w); } };
const yes = (name, v, info) => { if (v) ok++; else { bad++; console.log('틀림:', name, info !== undefined ? JSON.stringify(info).slice(0, 400) : ''); } };
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ---------- ① 거래 판정 ---------- */
{
  const tr = (ymd, amt, o) => Object.assign({ ymd, amt, area: 84.9, floor: 10, type: '', hi: false }, o || {});
  /* 급매: 앞 90일 3건 중간값 10억 → 8.9억(−11%) 급매, 6.9억(−31%) 특수 거래 의심, 9.5억 보통 */
  const L = [tr(20260801, 100000), tr(20260810, 99000), tr(20260820, 101000), tr(20260901, 89000), tr(20260902, 69000), tr(20260903, 95000)];
  const J = PT.judge(L), by = a => J.find(t => t.amt === a);
  yes('급매(10% 넘게 쌈)', by(89000).urg && !by(89000).sus && by(89000).disc === -11);
  yes('특수 거래 의심(30% 넘게 쌈)', by(69000).sus && !by(69000).urg);
  yes('보통 거래', !by(95000).urg && !by(95000).sus);
  check('최신 거래가 맨 앞', J[0].ymd, 20260903);
  /* 비교 거래 3건 미만이면 판정 안 함 */
  yes('앞 3개월 2건뿐 → 급매 판정 없음', !PT.judge([tr(20260801, 100000), tr(20260810, 100000), tr(20260901, 80000)])[0].urg);
  /* 직거래: 신고가·급매 판단에서 뺌(비교 대상에서도 뺌) */
  const X = PT.judge([tr(20260801, 100000), tr(20260802, 100000), tr(20260803, 100000), tr(20260901, 50000, { type: '직거래', hi: true })]);
  yes('직거래: 신고가·급매 꼬리표 없음', X[0].x && !X[0].hi && !X[0].urg && !X[0].sus);
  check('직거래 꼬리표 글자', PT.tags(X[0]).map(x => x[1]), ['직거래']);
  /* 신고가 쪽: 앞 1년 3건 이상 + 중간값보다 60% 넘게 비쌈 → 특수 거래 의심 / 앞 1년 3건 미만 + 이전 최고보다 30% 이상 → 비교 거래 적음 */
  const H = PT.judge([tr(20260101, 100000), tr(20260201, 100000), tr(20260301, 100000), tr(20260901, 170000, { hi: true })]);
  yes('신고가 특수 거래 의심(+60% 넘음)', H[0].hi && H[0].sus);
  const H2 = PT.judge([tr(20190101, 100000), tr(20260901, 140000, { hi: true })]);
  yes('신고가 비교 거래 적음(앞 1년 거래 없음·+40%)', H2[0].hi && H2[0].thin && !H2[0].sus);
  check('비교 거래 적음 꼬리표', PT.tags(H2[0]).map(x => x[1]), ['신고가', '비교 거래 적음']);
  const H3 = PT.judge([tr(20260101, 100000), tr(20260201, 100000), tr(20260301, 100000), tr(20260901, 110000, { hi: true })]);
  yes('보통 신고가(앞 1년 거래 넉넉·+10%)', H3[0].hi && !H3[0].sus && !H3[0].thin);
  check('엔진과 같은 기준값', PT.RULE, { HI_JUMP: 0.6, HI_JUMP_N: 3, HI_JUMP_DAYS: 365, HI_THIN_UP: 0.3, URG_DISC: -0.1, URG_SUS: -0.3, URG_N: 3, URG_DAYS: 90, MIN_AREA: 30 });
}

/* ---------- ② 전세가율·입주 물량 ---------- */
{
  const h = { months: ['202606', '202607', '202608', '202609', '202610'], s: [100000, 0, 102000, 104000, 0], j: [60000, 0, 61000, 62400, 0], jr: [0.6, 0, 0.598, 0.6, 0] };
  check('전세가율: 최근 6개월 안 마지막 달', PT.jeonse(h), { pct: 60, at: '202609', s: 104000, j: 62400 });
  yes('전세 자료 없으면 안내(숫자 없음)', PT.jeonse(null).miss && PT.jeonse({ months: ['202610'], s: [1], j: [0], jr: [0] }).miss);
  const reg = { gu: { '11710': { sup: [391, 1856, 135, 6] } }, src: { sup: { nm: '청약홈 분양 모집공고(입주예정월·공급 세대)', at: '2026-11-26' } } };
  check('입주 예정 물량', PT.supply(reg, '11710'), { y1: 391, y2: 1856, y3: 135, n: 6, tot: 2382, src: '청약홈 분양 모집공고(입주예정월·공급 세대)', at: '2026-11-26' });
  yes('입주 자료 없으면 안내', PT.supply(reg, '11680').miss && PT.supply(null, '11710').miss);
  const reg2 = { used: { sup: true }, gu: { '11710': { s: [] } }, src: reg.src };
  yes('구는 있는데 입주 예정 공고 없음 → 0세대가 아니라 \'잡힌 단지 없음\'', PT.supply(reg2, '11710').none === true && !PT.supply(reg2, '11710').miss);
}

/* ---------- ③ 손님용 단지 리포트 ---------- */
const IX = { months: Array.from({ length: 36 }, (_, i) => M.ymAdd('202311', i)), dataTo: '202610', updated: '2026-11-21',
  sgg: { '11710': { name: '송파구', sido: '서울특별시' } }, sido: [{ id: 's00', name: '서울특별시', short: '서울' }] };
const ser = Array.from({ length: 36 }, (_, i) => 8000 + i * 100);
const U = ['11710', '가락동', '가단지', '84㎡대', 84.9, 30, ser, '1'.repeat(36), '1', 0, 0,
  [[20261020, 84.9, 12, 290000, 0, 1], [20261001, 84.9, 5, 250000, 0, 0], [20260920, 84.9, 7, 280000, 0, 0], [20260910, 84.9, 9, 282000, 0, 0], [20260901, 84.9, 3, 281000, 0, 0], [20250101, 84.9, 3, 200000, 0, 0]]];
const N1 = ['11710', '가락동', '나단지', '84㎡대', 84.8, 10, ser, '1'.repeat(36), '2', 0, 0, [[20261010, 84.8, 7, 250000, 0, 0]]];
const xy = { '11710|가락동|1': [127.1, 37.5], '11710|가락동|2': [127.105, 37.5] };
const poi = { sc: [['가중학교', 127.102, 37.5]], st: [['송파', 127.1, 37.503]], at: { sc: '2026-11-15', st: '2026-11-21' }, src: { sc: '학교알리미', st: '서울 열린데이터광장' } };
const L = T.listing({ u: U, IX, M, fx: { fv: 61, fvg: 70 }, vc: { n: 4, hit: 3, ok: true, where: '서울' }, units: [U, N1], xy, poi, TAX: null, ADJ: null, kind: 'danji', date: '2026-11-26' });
const hist = { months: ['202608', '202609', '202610'], s: [270000, 281000, 280000], j: [160000, 165000, 168000], jr: [0.593, 0.587, 0.6], from: '200601' };
const region = { gu: { '11710': { sup: [391, 1856, 135, 6] } }, src: { sup: { nm: '청약홈 분양 모집공고', at: '2026-11-26' } } };
const S = PT.report({ L, list: M.trades(U), hist, region, g: '11710', vc: { n: 4, hit: 3, ok: true, where: '서울' }, client: '김OO' });
{
  check('최근 1년 거래만(2025년 거래 뺌)', S.rows.map(t => t.ymd), [20261020, 20261001, 20260920, 20260910, 20260901]);
  yes('급매 판정(앞 3개월 중간값 28.1억 → 25억)', S.rows.find(t => t.amt === 250000).urg);
  check('최근 1년 요약', S.y1, { n: 5, hi: 1, urg: 1, sus: 0, x: 0 });
  check('전세가율', S.jr.pct, 60);
  yes('미래가치: 과거 성적이 기준을 넘은 지역만 점수', S.fv.show && /61점/.test(S.fv.head));
  const S2 = PT.report({ L, list: M.trades(U), hist: null, region: null, g: '11710', vc: { n: 4, hit: 1, ok: false, where: '서울' } });
  yes('과거 성적 미달 → 점수 싣지 않음', !S2.fv.show && /싣지 않았어요/.test(S2.fv.why));
  yes('전세·입주 자료 없으면 안내', S2.jr.miss && S2.sup.miss);
  check('출처 5가지', S.src.length, 5);
  const CARD = { role: 'agent', office: '가락한빛공인중개사사무소', ceo: '홍길동', reg: '11710-2020-00123', addr: '서울 송파구 송파대로 000', phone: '02-000-0000' };
  const H = PT.reportHtml(S, { card: CARD, logo: 'data:image/png;base64,AAAA', shared: true });
  check('세 장', (H.match(/class="pt-page"/g) || []).length, 3);
  check('머리글 세 장 모두 사무소 이름', (H.match(/<b>가락한빛공인중개사사무소<\/b>/g) || []).length, 3);
  yes('꼬리말: 법정 표시 항목(등록번호·대표·소재지·전화)', /중개사무소 가락한빛/.test(H) && /등록번호 11710-2020-00123/.test(H) && /대표 공인중개사 홍길동/.test(H) && /소재지 서울 송파구/.test(H) && /전화 02-000-0000/.test(H));
  yes('공유 화면: Powered by 집예보(작게)', /class="pt-pw">Powered by 집예보</.test(H));
  yes('편집 화면에는 Powered by 없음', !/Powered by/.test(PT.reportHtml(S, { card: CARD })));
  yes('로고(이미지 자료만)', /<img class="pt-lg" src="data:image\/png;base64,AAAA"/.test(H) && !/<img/.test(PT.reportHtml(S, { card: CARD, logo: 'javascript:alert(1)' })));
  yes('손님 이름', /김OO 님께 드리는 단지 리포트/.test(H));
  yes('안내 문장(광고·확인설명서 아님)', H.includes(PT.DISCLAIM));
  yes('판정 꼬리표·말 풀이', /tg urg">급매로 볼 만한 거래/.test(H) && /특수 거래 의심/.test(H) && /비교 거래 적음/.test(H));
  yes('미래가치 참고 표시', /class="ref">참고</.test(H));
  const H0 = PT.reportHtml(S, {});
  yes('확인 안 된 사람: 이름·로고 없음', !/가락한빛/.test(H0) && !/<img/.test(H0) && /<b>단지 리포트<\/b>/.test(H0));
  yes('리포트에 지번·동호수 없음', !/\d+동 \d+호/.test(H));
  yes('공유 키 모양', PT.parseShare('v=T0123456789A.' + 'a'.repeat(64)).id === 'T0123456789A' && !PT.parseShare('v=P0123456789A.' + 'a'.repeat(64)) && !PT.parseShare('v=T0123456789A.zz'));
  check('단지 키 되돌리기', PT.decodeUnit('?' + PT.encodeUnit({ sd: 's00', g: '11710', d: '가락동', j: '1', a: '가단지', b: '84㎡대' })), { sd: 's00', g: '11710', d: '가락동', j: '1', a: '가단지', b: '84㎡대' });
  check('이상한 단지 키 버림', [PT.decodeUnit('?sd=x&g=abc').sd, PT.decodeUnit('?sd=x&g=abc').g], ['', '']);
}

/* ---------- ④ 문장 자체 검사(엔진 claim_check.py 와 같은 규칙) ---------- */
const rows = [
  { d: '가락동', a: '헬리오시티', b: '84㎡대', ar: 84.9, p: 245000, dt: 20261120, f: 12, hi: 1, pm: 230000, pmd: 20211001 },
  { d: '가락동', a: '헬리오시티', b: '59㎡대', ar: 59.9, p: 190000, dt: 20261119, f: 3 },
  { d: '잠실동', a: '잠실엘스', b: '84㎡대', ar: 84.8, p: 300000, dt: 20261118, f: 20, hi: 1, pm: 290000, pmd: 20250101, sus: 1 },
  { d: '잠실동', a: '리센츠', b: '84㎡대', ar: 84.9, p: 280000, dt: 20261118, f: 9, hi: 1, pm: 200000, pmd: 20150101, thin: 1 },
  { d: '문정동', a: '올림픽훼밀리타운', b: '84㎡대', ar: 84.9, p: 150000, dt: 20261117, f: 5, dr: -14.2, m2: 175000, m2d: 20250501 },
  { d: '문정동', a: '문정래미안', b: '59㎡대', ar: 59.9, p: 80000, dt: 20261117, f: 2, x: 1, j: '150-1' }
];
const urg = [{ d: '문정동', a: '올림픽훼밀리타운', b: '84㎡대', ar: 84.9, f: 5, p: 150000, dt: 20261117, med: 172000, n3: 4, disc: -12.8 }];
{
  const c = { rows, urg };
  const R = (s) => PT.claimCheck([s], c).kept.length === 1;
  yes('맞음: 매매는 6건', R('강남구 아파트 매매는 6건이다.'));
  yes('틀림: 매매는 5건 → 뺌', !R('강남구 아파트 매매는 5건이다.'));
  yes('맞음: 그중 신고가가 3건(의심 포함 — 엔진과 같음)', R('그중 신고가가 3건이다.'));
  yes('맞음: 가장 비싼 신고가는 특수 거래 의심을 뺀 값(비교 거래 적음은 금액 비교에 남김 — 엔진과 같음, 28억)', R('가장 비싼 신고가는 리센츠 84㎡대 28억 원이다.'));
  yes('틀림: 28억이 있는데 24억 5,000만 원을 가장 비싼 신고가로', !R('가장 비싼 신고가는 헬리오시티 84㎡대 24억 5,000만 원이다.'));
  yes('틀림: 의심 거래(30억)를 가장 비싼 신고가로', !R('가장 비싼 신고가는 잠실엘스 84㎡대 30억 원이다.'));
  yes('맞음: 가장 많이 오른 곳(비교 거래 적음 뺌, +6.5%)', R('이전 최고가 대비 가장 많이 오른 곳은 헬리오시티 84㎡대(+6.5%)이다.'));
  yes('틀림: 비교 거래 적은 리센츠(+40%)를 가장 많이 오른 곳으로', !R('가장 많이 오른 곳은 리센츠 84㎡대(+40%)이다.'));
  yes('맞음: 가장 비싼 거래(모든 거래 중 30억)', R('가장 비싼 거래는 잠실엘스 84㎡대 30억 원이다.'));
  yes('맞음: 최근 2년 최고가보다 10% 넘게 낮은 거래가 1건', R('최근 2년 최고가보다 10% 넘게 낮은 거래가 1건이다.'));
  yes('맞음: 할인 폭이 가장 큰 곳 12.8%', R('할인 폭이 가장 큰 곳은 올림픽훼밀리타운 84㎡대로 최근 3개월 중간값 17억 2,000만 원보다 12.8% 낮았다.'));
  yes('틀림: 할인 폭 15%', !R('할인 폭이 가장 큰 곳은 올림픽훼밀리타운 84㎡대로 15.0% 낮았다.'));
  yes('맞음: 거래가 가장 많은 단지(직거래 뺌)', R('거래가 가장 많은 단지는 헬리오시티(2건)이다.'));
  yes('틀림: 거래가 가장 많은 단지 이름', !R('거래가 가장 많은 단지는 잠실엘스(2건)이다.'));
  yes('확인 규칙이 없는 최상급 숫자 문장은 뺌', !R('송파구에서 가장 오래된 단지는 1978년에 지었다.'));
  yes('숫자 없는 최상급 풀이는 남김', R('신고가는 같은 단지에서 가장 높았던 가격을 넘은 거래다.'));
  const k = PT.claimCheck(['매매는 6건이다. 그중 신고가가 9건이다. 끝.'], c);
  check('틀린 문장만 빼고 같은 줄 나머지는 남김', k.kept, ['매매는 6건이다. 끝.']);
  check('만원 읽기', [PT.parseWon('31억 2,000만 원'), PT.parseWon('4억 원'), PT.parseWon('9,500만 원'), PT.parseWon('원')], [312000, 40000, 9500, null]);
  /* 엔진 규칙 이름과 같은지(공개 저장소에는 엔진이 없어 이름 목록으로 비교) */
  const src = rd('assets/pro-tools-core.js');
  ['hi_max', 'hi_up', 'top_any', 'drop_n', 'count', 'count_hi', 'urg_max', 'jr_max', 'apt_most'].forEach(n => yes('규칙 ' + n, src.includes(`['${n}',`)));
}

/* ---------- ⑤ 과장·개인정보 거르기 ---------- */
{
  ['무조건 오릅니다', '지금이 기회예요', '폭등 직전', '역대급 급매', '수익 보장', '놓치면 후회', '강력 추천 단지', '로또 청약', '초급매 나왔어요'].forEach(s => yes('과장: ' + s, PT.hypeHit(s)));
  ['신고가 거래가 있었다', '최근 3개월 중간값보다 10% 넘게 쌌다', '급매로 볼 만한 거래'].forEach(s => yes('보통 문장: ' + s, !PT.hypeHit(s)));
  const g = PT.guard(['좋은 단지다. 무조건 오른다. 101동 1203호가 나왔다. 2호선 역이 가깝다.'], 't');
  check('과장·동호수 문장만 뺌', g.kept, ['좋은 단지다. 2호선 역이 가깝다.']);
  check('뺀 이유', g.probs.map(p => p.kind), ['hype', 'priv']);
}

/* ---------- ⑥ 동네 글 ---------- */
const DAY = { v: 1, g: '11710', name: '송파구', sd: '서울', date: '2026-11-26', win: { t: { from: '2026-11-25', to: '2026-11-26' } }, trades: rows, urgent: urg };
{
  const src = PT.source(DAY, 'day');
  const o = PT.compose({ src, bundle: { g: '11710' }, areaName: '송파구', card: null, seed: 1 });
  const all = o.blog.text + '\n' + o.caption.text + '\n' + JSON.stringify(o.cards);
  check('자체 검사: 뺀 문장 없음(만든 문장이 모두 자료와 맞음)', o.probs, []);
  yes('매매 건수·신고가 건수 문장', /매매는 6건이다/.test(o.blog.body) && /그중 신고가가 3건이다/.test(o.blog.body));
  yes('직거래는 판단에서 뺌 문장', /직거래\(중개 없이 당사자끼리 한 거래\) 1건은 신고가·급매 판단에서 뺐다/.test(o.blog.body));
  yes('특수 거래 의심·비교 거래 적음 안내', /특수 거래 의심 1건/.test(o.blog.body) && /비교 거래가 적은 신고가 1건/.test(o.blog.body));
  yes('가장 비싼 신고가 = 의심 뺀 값', /가장 비싼 신고가는 리센츠 84㎡대 28억 원이다/.test(o.blog.body), o.blog.body);
  yes('가장 많이 오른 곳 = 비교 거래 적음 뺀 값', /가장 많이 오른 곳은 헬리오시티 84㎡대\(\+6\.5%\)/.test(o.blog.body));
  yes('급매 문장', /급매로 보는 거래\)는 1건이다/.test(o.blog.body));
  yes('매물 광고 아님: 블로그·설명글·카드', o.blog.text.includes(PT.NOT_AD) && o.caption.text.includes(PT.NOT_AD) && o.cards.every(c => c.foot.includes(PT.NOT_AD_CARD)));
  yes('출처 표기', /자료: 국토교통부 아파트 매매 실거래가 공개 자료/.test(o.blog.text) && /자료: 국토교통부 실거래가 공개 자료/.test(o.caption.text));
  yes('지번·동호수 없음', !/150-1/.test(all) && !/\d+동 \d+호/.test(all));
  yes('과장 표현 없음', !PT.hypeHit(all));
  yes('카드 2~4장', o.cards.length >= 2 && o.cards.length <= 4, o.cards.length);
  yes('확인 안 된 사람: 사무소 정보 없음', !/중개사무소 정보/.test(o.blog.text));
  yes('독자에게 말을 거는 문장은 존칭', /(보세요|주세요|됩니다)\.$/.test(o.blog.body.trim()));
  const CARD = { role: 'member', office: '가락한빛공인중개사사무소', ceo: '홍길동', name: '김민수', reg: '11710-2020-00123', addr: '서울 송파구 송파대로 000', phone: '02-000-0000' };
  const o2 = PT.compose({ src, bundle: { g: '11710' }, areaName: '송파구', card: CARD, seed: 1 });
  yes('확인된 중개사: 법정 표시 항목 모두', ['중개사무소: 가락한빛공인중개사사무소', '대표 공인중개사: 홍길동', '소속공인중개사: 김민수', '등록번호: 11710-2020-00123', '소재지: 서울 송파구 송파대로 000', '전화: 02-000-0000'].every(s => o2.blog.text.includes(s)));
  yes('카드 끝장: 사무소 이름', o2.cards[o2.cards.length - 1].title === '가락한빛공인중개사사무소');
  /* 묶음: 동·단지 */
  const ob = PT.compose({ src, bundle: { g: '11710', dongs: ['문정동'] }, areaName: '송파구 문정동', seed: 1 });
  yes('동 묶음: 문정동 2건만', /매매는 2건이다/.test(ob.blog.body) && /그중 신고가가 0건이다/.test(ob.blog.body) && !/헬리오시티/.test(ob.blog.body), ob.blog.body);
  check('동 묶음 자체 검사 통과', ob.probs, []);
  const oa = PT.compose({ src, bundle: { g: '11710', dongs: ['문정동'], apts: ['헬리오시티'] }, areaName: '송파구', seed: 1 });
  yes('동 + 단지 묶음: 4건', /매매는 4건이다/.test(oa.blog.body));
  /* 다른 문장 틀도 모두 통과 */
  for (let s = 0; s < 30; s++) { const x = PT.compose({ src, bundle: { g: '11710' }, areaName: '송파구', seed: s * 7919 }); if (x.probs.length) { bad++; console.log('틀림: 씨앗', s, x.probs); break; } }
  ok++;
  /* 거래 없는 날 */
  const oz = PT.compose({ src: PT.source(Object.assign({}, DAY, { trades: [], urgent: [] }), 'day'), bundle: { g: '11710' }, areaName: '송파구', seed: 3 });
  yes('거래 없음: 숫자 지어내지 않음', oz.empty && /아직 보이지 않는다/.test(oz.blog.body) && oz.cards.length >= 2);
  /* 주간: 재료 v1(rows 없음)은 만들지 않고 안내 */
  yes('주간 재료 v1 → 안내', !PT.source({ v: 1, wk: {} }, 'week').rows && /다음 주 월요일/.test(PT.source({ v: 1, wk: {} }, 'week').miss));
  const W = PT.source({ v: 2, g: '11710', name: '송파구', wk: { from: '2026-11-16', to: '2026-11-22', basis: 'new' }, rows, urg, seed: 5 }, 'week');
  const ow = PT.compose({ src: W, bundle: { g: '11710' }, areaName: '송파구' });
  yes('주간 글 통과', !ow.probs.length && /이번 주/.test(ow.title), ow.probs);
  check('묶음 정리(중복·빈칸·개수)', PT.bundle({ g: '11710', dongs: ['가락동', '가락동', '', '<x>'], apts: Array(30).fill(0).map((_, i) => 'a' + i) }).dongs, ['가락동', 'x']);
}

/* ---------- ⑦ 숨김 플래그·화면 ---------- */
{
  const cfg = rd('assets/config.js');
  yes('config: PRO_TOOLS_ENABLED=false', /PRO_TOOLS_ENABLED: false,/.test(cfg));
  const gs = rd('tools/agent-backend.gs');
  yes('서버: PRO_TOOLS_ENABLED=false', /const PRO_TOOLS_ENABLED = false;/.test(gs));
  ['agent/pro/index.html', 'agent/pro/report/index.html', 'agent/pro/post/index.html'].forEach(f => {
    const h = rd(f);
    yes(f + ': 검색 제외', h.includes('<meta name="robots" content="noindex">'));
    yes(f + ': 꺼져 있으면 준비 중', /id="closed"/.test(h) && /PT\.on\(\)/.test(h));
    yes(f + ': pro-tools-core 불러옴', /assets\/pro-tools-core\.js\?v=1/.test(h));
    yes(f + ': 이전으로 줄', /assets\/back\.js/.test(h));
    yes(f + ': 무료 체험 문구 없음', !/무료 체험/.test(h));
  });
  const sm = rd('sitemap.xml');
  yes('sitemap 에 없음', !/agent\/pro/.test(sm));
  const sw = rd('sw.js');
  yes('sw: 새 화면·파일 저장 목록', ['./agent/pro/', './agent/pro/report/', './agent/pro/post/', './assets/pro-tools-core.js?v=1', './assets/pro-tools.css?v=1'].every(x => sw.includes(`'${x}'`)));
  /* 다른 화면 어디에도 링크 없음(꺼져 있는 동안) */
  const linked = ['index.html', 'agent/index.html', 'agent/my/index.html', 'dongne/index.html'].filter(f => fs.existsSync(path.join(ROOT, f)) && /agent\/pro\//.test(rd(f)));
  check('다른 화면에 링크 없음', linked, []);
  /* 미리 보기 키는 다른 미리 보기와 겹치지 않음 */
  yes('미리 보기 ?preview=pro-tools', /'pro-tools'/.test(rd('assets/pro-tools-core.js')) && PT.LS_PV === 'jdj_pt_preview');
  const rep = rd('agent/pro/report/index.html');
  yes('리포트: 이름은 서버 확인 정보로만(화면 입력 칸 없음)', !/id="office"|id="reg"|mountProfile/.test(rep) && /ptMe/.test(rep) && /ptShare/.test(rep) && /ptOpen/.test(rep));
  yes('리포트: 인쇄 단추', /window\.print\(\)/.test(rep));
}

/* ---------- ⑧ 서버 v66 ---------- */
{
  const mk = closed => {
    const E = require('./gs-harness')({ now: '2026-11-26T10:00:00+09:00', patch: g => closed ? g : g.replace('const PRO_TOOLS_ENABLED = false;', 'const PRO_TOOLS_ENABLED = true;') });
    E.props.BRIEF_ADMIN_IDS = JSON.stringify(['k99']);
    return E;
  };
  const partner = (E, k, o) => {
    const sh = E.ctx.dpSheet('동네파트너'), H = sh.rows[0], row = [];
    const put = (h, v) => { const i = H.indexOf(h); if (i < 0) throw new Error('칸 없음 ' + h); row[i] = v; };
    const x = Object.assign({ id: 'D' + k, 상태: '승인', 구분: '대표', 사무소명: '가락한빛공인중개사사무소', 등록번호: '11710-2020-00123', 대표자: '홍길동', 성명: '홍길동', 전화: '02-000-0000', 이메일: 'a@example.com', 주소: '서울 송파구 송파대로 000', 시군구: '11710', 사무소동: '가락동', 동목록: '[]', 확인결과: '공공 자료와 맞음' }, o || {});
    put('회원', E.ctx.dpUid('k' + k)); Object.keys(x).forEach(h => put(h, x[h]));
    sh.appendRow(H.map((h, i) => row[i] === undefined ? '' : row[i]));
  };
  const UNIT = { sd: 's00', g: '11710', d: '가락동', j: '913', a: '헬리오시티', b: '84㎡대' };
  /* 닫힘: 일반 회원 거절, 운영자는 미리 써 봄 */
  {
    const E = mk(true), s = E.member(1), a = E.member(99);
    let r = E.post({ action: 'ptMe', s }); yes('닫힘: 일반 회원 거절(closed)', !r.ok && r.code === 'closed', r);
    r = E.post({ action: 'ptMe', s: a }); yes('닫힘: 운영자는 미리 보기 + 요금 자리', r.ok && r.admin === true && r.open === false && !!r.price && r.verified === false, r);
  }
  const E = mk(false), s1 = E.member(1), s2 = E.member(2), s3 = E.member(3);
  partner(E, 1); partner(E, 2, { 상태: '검토대기' }); partner(E, 3, { 상태: '승인', 노출중지: '2026-12-31' });
  let r = E.post({ action: 'ptMe', s: s1 });
  check('확인된 중개사: 시트 값 그대로', [r.ok, r.verified, r.card && r.card.office, r.card && r.card.reg, r.card && r.card.phone, r.price === undefined], [true, true, '가락한빛공인중개사사무소', '11710-2020-00123', '02-000-0000', true]);
  r = E.post({ action: 'ptMe', s: s2 }); check('검토대기: 이름 못 넣음', [r.verified, r.why, r.card], [false, 'wait', null]);
  r = E.post({ action: 'ptMe', s: s3 }); check('노출 중지: 이름 못 넣음', [r.verified, r.why], [false, 'stop']);
  r = E.post({ action: 'ptMe', s: E.member(4) }); check('파트너 아님', [r.verified, r.why], [false, 'none']);
  r = E.post({ action: 'ptShare', s: s2, unit: UNIT }); yes('확인 전: 손님 링크(이름) 거절', !r.ok && /동네 파트너 확인/.test(r.err), r);
  r = E.post({ action: 'ptShare', s: s1, unit: Object.assign({}, UNIT, { sd: 'x' }) }); yes('단지 키 검사', !r.ok && /단지와 평형/.test(r.err), r);
  r = E.post({ action: 'ptLogo', s: s1, logo: 'data:image/svg+xml;base64,AAAA' }); yes('로고: 그림 형식만', !r.ok, r);
  r = E.post({ action: 'ptLogo', s: s1, logo: 'data:image/png;base64,' + 'A'.repeat(50000) }); yes('로고: 너무 크면 거절', !r.ok, r);
  r = E.post({ action: 'ptLogo', s: s1, logo: 'data:image/png;base64,iVBORw0KGgo=' }); yes('로고 저장', r.ok);
  const sh = E.post({ action: 'ptShare', s: s1, unit: UNIT, client: '김OO 010-1234-5678', days: 30 });
  yes('손님 링크 만들기', sh.ok && /^T[0-9A-F]{11}$/.test(sh.id) && /^[0-9a-f]{64}$/.test(sh.token) && sh.expires === '2026-12-26', sh);
  const row = E.sheets['프로도구링크'].rows[1];
  yes('시트에는 토큰 원문 없음(해시만)', !row.some(v => String(v).includes(sh.token)));
  yes('손님 이름에서 숫자(연락처) 지움', !/\d/.test(String(row[6])), row[6]);
  const op = E.post({ action: 'ptOpen', id: sh.id, tk: sh.token });
  check('손님 열기: 단지·사무소·로고', [op.ok, op.unit && op.unit.a, op.card && op.card.office, op.logo], [true, '헬리오시티', '가락한빛공인중개사사무소', 'data:image/png;base64,iVBORw0KGgo=']);
  r = E.post({ action: 'ptOpen', id: sh.id, tk: 'b'.repeat(64) }); yes('틀린 토큰 거절', !r.ok);
  r = E.post({ action: 'ptLinks', s: s1 }); check('내 링크 목록·열람 수', [r.links.length, r.links[0].views], [1, 1]);
  r = E.post({ action: 'ptOff', s: s2, id: sh.id }); yes('남의 링크는 못 멈춤', !r.ok);
  r = E.post({ action: 'ptOff', s: s1, id: sh.id }); yes('링크 멈춤', r.ok && r.status === '멈춤');
  r = E.post({ action: 'ptOpen', id: sh.id, tk: sh.token }); yes('멈춘 링크 거절', !r.ok);
  E.post({ action: 'ptOff', s: s1, id: sh.id, on: true });
  /* 보낸 중개사가 노출 중지되면 이름 없이 단지만 */
  const P = E.sheets['동네파트너'], hi = P.rows[0].indexOf('노출중지'); P.rows[1][hi] = '2027-01-31';
  r = E.post({ action: 'ptOpen', id: sh.id, tk: sh.token }); check('보낸 분 노출 중지 → 이름·로고 없이', [r.ok, r.card, r.logo], [true, null, '']);
  E.now = Date.parse('2027-03-01T10:00:00+09:00'); P.rows[1][hi] = '';
  r = E.post({ action: 'ptOpen', id: sh.id, tk: sh.token }); yes('기간 지난 링크 거절', !r.ok);
}

console.log(`pro-tools-test: ${ok} 통과, ${bad} 실패`);
process.exit(bad ? 1 : 0);
