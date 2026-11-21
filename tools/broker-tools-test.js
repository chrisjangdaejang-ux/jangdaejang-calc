/* 중개사 도구(매물 설명서 · 주간 블로그·인스타 글) 검사 — 실행: node tools/broker-tools-test.js </dev/null
   지어낸 숫자 없음(자료가 없으면 안내 문장) · 공인중개사 표시 정보 · 확인·설명서 안내 문장 · 단정·보장 표현 없음 · 문장 틀 다양성 · 이용 수 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
global.JDJ_PRO = require('../assets/pro-report.js');
global.JDJ_BRIEF = require('../assets/brief-core.js');
const T = require('../assets/broker-tools.js');
const M = require('../assets/mine-core.js');
const TAX = require('../tax/tax-engine.js');
const ADJ = require('../tax/adjusted-areas.js');
let ok = 0, bad = 0;
const check = (name, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); if (g === w) ok++; else { bad++; console.log('틀림:', name, '\n  나옴:', g, '\n  기대:', w); } };
const yes = (name, v) => check(name, !!v, true);

const BROKER = { role: 'agent', office: '가락한빛공인중개사사무소', ceo: '홍길동', reg: '11710-2020-00123', addr: '서울 송파구 송파대로 000, 1층', phone: '02-000-0000' };
const MEMBER = Object.assign({}, BROKER, { role: 'member', name: '김민수' });
const SELLER = { role: 'seller', office: '한빛분양', name: '이영희', phone: '010-0000-0000' };

/* ---------- 1. 확인·설명서 안내 문장 ---------- */
const DIS = '이 자료는 참고용이며 법정 서류인 중개대상물 확인·설명서를 대신하지 않습니다.';
check('안내 문장 그대로', T.DISCLAIM, DIS);
const LP = fs.readFileSync(path.join(ROOT, 'agent/listing/index.html'), 'utf8');
yes('설명서 화면이 안내 문장을 그림', /ls-dis">\$\{esc\(S\.disclaim\)\}/.test(LP));

/* ---------- 2. 매물 설명서: 자료 있음 / 없음 ---------- */
const IX = { months: Array.from({ length: 36 }, (_, i) => M.ymAdd('202311', i)), dataTo: '202610', updated: '2026-11-21',
  sgg: { '11710': { name: '송파구', sido: '서울특별시' } }, sido: [{ id: 's00', name: '서울특별시', short: '서울' }] };
const ser = Array.from({ length: 36 }, (_, i) => 8000 + i * 100);
const cnt = '1'.repeat(36);
const U = ['11710', '가락동', '가단지', '84㎡대', 84.9, 30, ser, cnt, '1', 0, 0, [[20261020, 84.9, 12, 290000, 0, 0], [20261001, 84.9, 5, 280000, 0, 1]]];
const N1 = ['11710', '가락동', '나단지', '84㎡대', 84.8, 10, ser, cnt, '2', 0, 0, [[20261010, 84.8, 7, 250000, 0, 0]]];
const xy = { '11710|가락동|1': [127.1, 37.5], '11710|가락동|2': [127.105, 37.5] };
const poi = { sc: [['가중학교', 127.102, 37.5]], st: [['송파', 127.1, 37.503]], at: { sc: '2026-11-15', st: '2026-11-21' }, src: { sc: '학교알리미', st: '서울 열린데이터광장' } };
const fx = { fv: 44, fvg: 65 };
const vc = { n: 4, hit: 1, ok: false, where: '서울' };
const S = T.listing({ u: U, IX, M, fx, vc, units: [U, N1], xy, poi, TAX, ADJ, ask: 290000, memo: '남향', date: '2026-11-21' });
check('같은 평형 실거래 2건', S.trades.rows.length, 2);
check('주변 단지 1곳(직선 거리 m)', S.near.rows.map(r => [r.apt, r.m]), [['나단지', 440]]);
check('역·학교 직선 거리', [S.poi.st[0].nm, S.poi.st[0].m, S.poi.sc[0].nm], ['송파', 330, '가중학교']);
yes('칸마다 출처', S.trades.src && S.near.src && S.trend.src && S.poi.src && S.fv.src && S.tax.src);
yes('칸마다 기준일', S.trades.asOf.to && S.poi.asOf.st && S.fv.asOf.to && S.tax.asOf);
check('취득세: 호가 기준·4가지', [S.tax.baseKind, S.tax.rows.length], ['ask', 4]);
check('취득세 = 세금 계산기와 같은 값(무주택)', S.tax.rows[0].total, TAX.buyerAcqTax(290000 * 10000, { own: 'none', regulated: true, large: false }).total);
check('송파구는 조정대상지역', S.tax.regulated, true);
yes('미래가치: 화면 문장 그대로', S.fv.head === '미래가치 점수 44점(100점 만점, 같은 시·도 단지와 비교) · 송파구 안 점수 65점');
check('과거 성적(절반 미만) → 참고로만', S.fv.past, '이 점수 방법을 과거에 그대로 써 봤더니 4번 중 1번 맞아, 참고로만 보세요(서울 기준).');
check('과거 성적(조건 맞음) → 결론 문장', T.fvText(44, null, { n: 4, hit: 4, ok: true, where: '서울' }).past, '이 점수 방법을 과거에 그대로 써 봤더니 4번 중 4번 맞았어요(서울 기준).');
yes('쉬운 말 풀이 10개 이상', S.gloss.length >= 10 && S.gloss.every(g => g[1].length > 10));
const banned = /시험|검증|채점|백테스트|표본 외/;
yes('화면 문구에 내부 용어 없음', !banned.test(JSON.stringify(S)) && !banned.test(LP.replace(/<script[\s\S]*?<\/script>/g, '')));

/* 자료가 없으면 숫자를 채우지 않고 안내 */
const U0 = ['11710', '가락동', '빈단지', '59㎡대', 59.9, 0, Array(36).fill(0), '0'.repeat(36), '9', 0, 0, []];
const E = T.listing({ u: U0, IX, M, fx: null, vc: null, units: [U0], xy: null, poi: null, TAX, ADJ, ask: 0, date: '2026-11-21' });
check('실거래 없음 → 안내', [E.trades.rows.length, !!E.trades.miss], [0, true]);
check('위치 없음 → 주변 단지 안내', [E.near.rows.length, !!E.near.miss], [0, true]);
check('위치 없음 → 역·학교 안내(숫자 없음)', [E.poi.st.length, E.poi.sc.length, !!E.poi.stMiss, !!E.poi.scMiss], [0, 0, true, true]);
check('점수 없음 → 안내', [E.fv.has, !!E.fv.miss], [false, true]);
check('가격 없음 → 취득세 계산 안 함', [E.tax.rows.length, !!E.tax.miss], [0, true]);
check('가격 흐름 없음 → 안내', !!E.trend.miss, true);
check('호가 안 넣으면 비움', E.ask, null);
const P2 = Object.assign({}, poi, { st: [] });
const E2 = T.listing({ u: U, IX, M, fx, vc, units: [U], xy, poi: P2, TAX, ADJ, date: '2026-11-21' });
check('역 위치 자료가 없는 지역 → 그렇게 안내', E2.poi.stMiss, '이 지역은 지하철역 위치 자료가 아직 없어요.');

/* ---------- 3. 공인중개사 표시 정보 ---------- */
const A1 = T.adBlock(BROKER);
check('공인중개사 표시 5가지', A1.lines.map(x => x[0]), ['중개사무소', '소재지', '등록번호', '대표 공인중개사', '전화']);
check('공인중개사 오류 없음', A1.err, '');
check('소속공인중개사는 본인 이름도', T.adBlock(MEMBER).lines.map(x => x[0]), ['중개사무소', '소재지', '등록번호', '대표 공인중개사', '소속공인중개사', '전화']);
yes('등록번호 빠지면 막음', T.adBlock(Object.assign({}, BROKER, { reg: '' })).err.includes('등록번호'));
yes('전화 빠지면 막음', T.adBlock(Object.assign({}, BROKER, { phone: '' })).err.includes('연락처'));
const A2 = T.adBlock(SELLER);
check('분양대행: 이름·소속과 연락 방법만', [A2.broker, A2.err, A2.lines.map(x => x[0])], [false, '', ['이름', '분양대행사', '전화']]);
check('비중개사: 이름 + 카카오톡만으로 됨(상호·사업자번호 없이)', ['seller', 'consult', 'licensed'].map(r => T.adBlock({ role: r, name: '김민수', kakao: 'https://pf.kakao.com/_abc' }).err), ['', '', '']);
check('비중개사: 이름·연락처 둘 다 없으면 두 줄 안내', JDJ_PRO.profileErrors(JDJ_PRO.cleanProfile({ role: 'consult' })).length, 2);

/* 공인중개사가 아니면 '단지 분석 자료'(호가·동·층·메모 없음) */
check('자료 종류: 공인중개사 → 매물 설명서', [T.kindOf(BROKER), T.kindOf(MEMBER)], ['listing', 'listing']);
check('자료 종류: 비중개사 → 단지 분석 자료', ['seller', 'consult', 'licensed'].map(r => T.kindOf({ role: r, name: 'a', phone: '010-1111-2222' })), ['danji', 'danji', 'danji']);
const D = T.listing({ u: U, IX, M, fx, vc, units: [U, N1], xy, poi, TAX, ADJ, ask: 290000, memo: '남향', bd: '101동', fl: '12층', date: '2026-11-21', kind: 'danji' });
check('단지 분석 자료: 제목', D.title, '단지 분석 자료');
check('단지 분석 자료: 호가·동·층·메모 안 실림', [D.ask, D.bd, D.fl, D.memo], [null, '', '', '']);
check('단지 분석 자료: 세금은 평형 시세 기준', D.tax.baseKind, 'band');
yes('단지 분석 자료: 단지 단위 칸은 그대로', D.trades.rows.length && D.trend.price && D.poi.st.length && D.fv.has);
check('안내 문장', T.DANJI_NOTE, '특정 매물 광고(호가·동호수)는 개업공인중개사만 할 수 있어 공인중개사가 아니면 단지 분석 자료로 만들어져요.');
yes('화면: 비중개사면 매물 칸 숨김·안내', /\$\('lot'\)\.hidden = danji/.test(LP) && /T\.DANJI_NOTE/.test(LP) && /kind: T\.kindOf\(prof\)/.test(LP));
yes('중개사가 아닌데 중개사무소 이름 → 막음', T.adBlock({ role: 'consult', office: '행복공인중개사', phone: '010-1111-2222' }).err.includes('공인중개사법'));

/* ---------- 4. 주간 글 ---------- */
const K = { v: 1, g: '11710', name: '송파구', sido: '서울특별시', sd: '서울', built: '2026-11-23', seed: 1234567,
  wk: { from: '2026-11-16', to: '2026-11-22', basis: 'new', p0: '2026-11-16', p1: '2026-11-22' },
  n: 12, nx: 1, cancels: 0, nhi: 2, ndrop: 1, nurg: 1, nsus: 0,
  top: [{ d: '잠실동', a: '잠실엘스', b: '84㎡대', ar: 84.8, p: 310000, dt: 20261109, f: 22 }],
  hi: [{ d: '잠실동', a: '리센츠', b: '84㎡대', ar: 84.9, p: 335000, dt: 20261110, f: 15, hi: 1, pm: 320000, pmd: 20250901 },
       { d: '가락동', a: '헬리오시티', b: '59㎡대', ar: 59.9, p: 235000, dt: 20261112, f: 9, hi: 1, pm: 230000, pmd: 20260301 }],
  drop: [{ d: '잠실동', a: '잠실엘스', b: '84㎡대', ar: 84.8, p: 310000, dt: 20261109, f: 22, dr: -16.2, m2: 370000, m2d: 20260220 }],
  urg: [{ d: '가락동', a: '헬리오시티', b: '40㎡ 이하', ar: 39.1, f: 22, p: 143000, dt: 20261104, med: 199000, n3: 3, disc: -28.1 }],
  dongs: [['잠실동', 6, 1], ['가락동', 4, 1], ['문정동', 2, 0]], bands: [['84㎡대', 6, 290000]],
  m30: { n: 108, chg: -2.1, up: 34, days: 30, base: 90, from: '2026-10-13', to: '2026-11-11' }, ref: '2026-11-11',
  cy: [{ n: '잠실 래미안아이파크', k: '무순위·잔여세대', d: '신천동', pb: '20261117', rc: ['20261123', '20261124'], hh: 3, new: true }],
  pol: [], asof: { t: '2026-11-19', cy: '2026-11-21', pol: '2026-11-21' }, src: [['국토교통부', ''], ['청약홈', '']] };
const b = T.blog(K, { profile: BROKER });
yes('블로그 길이 1,200~1,800자(공백 포함)', b.len >= 1200 && b.len <= 1800);
yes('다체(칼럼) 문장', /했다\.|이다\.|없다\./.test(b.body) && (b.body.match(/요\./g) || []).length <= 3);
yes('블로그에 중개사무소 표시 정보', ['가락한빛공인중개사사무소', '서울 송파구 송파대로 000, 1층', '11710-2020-00123', '홍길동', '02-000-0000'].every(x => b.text.includes(x)));
yes('블로그에 출처·기간', b.src.includes('국토교통부') && b.src.includes('11/16~11/22'));
/* 지어낸 숫자 없음: 글의 모든 숫자가 자료 값(또는 그 값을 억·만·날짜로 나눈 조각)이거나 고정 기준(2년·3개월·10%·30일·2주)이어야 함 */
function allowed(K) {
  const s = new Set(['2', '3', '10', '30', '1', '0']);
  const add = v => { if (v == null) return; s.add(String(v)); };
  const walk = o => { if (o == null) return; if (typeof o === 'number') { add(o); add(Math.abs(o)); add(Math.abs(o).toFixed(1)); add(Math.floor(o / 10000)); add(o % 10000); return; }
    if (typeof o === 'string') { (o.match(/\d+/g) || []).forEach(add); const d = o.replace(/-/g, ''); if (/^\d{8}$/.test(d)) { add(d.slice(0, 4)); add(+d.slice(4, 6)); add(+d.slice(6, 8)); add(d.slice(4, 6)); add(d.slice(6, 8)); } return; }
    if (Array.isArray(o)) return o.forEach(walk); if (typeof o === 'object') Object.values(o).forEach(walk); };
  walk(K);
  const walkD = o => { if (o && typeof o === 'object') Object.values(o).forEach(walkD); else if (typeof o === 'number' && /^20\d{6}$/.test(String(o))) { const d = String(o); add(d.slice(0, 4)); add(+d.slice(4, 6)); add(+d.slice(6, 8)); add(d.slice(4, 6)); add(d.slice(6, 8)); } };
  walkD(K);
  return s;
}
const AL = allowed(K);
const nums = t => (t.replace(/(\d),(\d{3})/g, '$1$2').replace(/(\d{4})\.(\d{2})\.(\d{2})/g, '$1 $2 $3').match(/\d+(\.\d+)?/g) || []);
for (let sd = 0; sd < 12; sd++) {
  const bb = T.blog(K, { seed: sd * 7919 }), cc = T.caption(K, { seed: sd * 7919 });
  const stray = nums(bb.body + ' ' + bb.title + ' ' + cc.text).filter(x => !AL.has(x) && !AL.has(String(+x)));
  check(`지어낸 숫자 없음(문장 틀 ${sd})`, stray, []);
  check(`단정·보장 표현 없음(문장 틀 ${sd})`, T.banHit(bb.text + cc.text), '');
}
/* 자료가 없는 주 */
const K0 = Object.assign({}, K, { n: 0, nx: 0, nhi: 0, ndrop: 0, nurg: 0, top: [], hi: [], drop: [], urg: [], dongs: [], bands: [], m30: null, cy: [] });
const b0 = T.blog(K0, {});
yes('거래 없는 주: 없다고 씀', /아직 보이지 않는다/.test(b0.body) && /신고가 거래는 없었다|나오지 않았다/.test(b0.body));
check('거래 없는 주: 숫자 0과 고정 기준 밖 숫자 없음', nums(b0.body).filter(x => !AL.has(x)), []);
check('청약 없으면 없다고', /청약 공고는 없다/.test(b0.body), true);
/* 최근 30일 기준(목록이 짧은 처음 몇 주) */
const KR = Object.assign({}, K, { wk: { from: '2026-11-16', to: '2026-11-22', basis: 'recent30', p0: '2026-10-13', p1: '2026-11-11' } });
const br = T.blog(KR, {});
yes('30일 기준이면 기간·신고 기한을 밝힘', br.body.includes('최근 30일(10월 13일~11월 11일)') && br.body.includes('신고 기한'));
yes('30일 기준이면 "이번 주" 제목 안 씀', !/이번 주/.test(br.title) && !/이번 주/.test(T.cards(KR, {})[0].title));

/* 문장 틀 다양성 */
const titles = new Set(), intros = new Set(), bodies = new Set();
for (let sd = 0; sd < 16; sd++) { const x = T.blog(K, { seed: sd * 104729 + 3 }); titles.add(x.title); intros.add(x.body.split('\n\n')[0]); bodies.add(x.body); }
yes('제목 3가지 이상', titles.size >= 3);
yes('첫 문단 3가지 이상', intros.size >= 3);
yes('본문 10가지 이상', bodies.size >= 10);
const wks = [0, 1, 2, 3].map(i => T.blog(Object.assign({}, K, { seed: 1000 + i * 7 }), {}).body.split('\n\n').slice(0, 3).join());
yes('연속 4주가 모두 다른 글로 시작', new Set(wks).size >= 3);

/* 인스타 설명글·카드 */
const c = T.caption(K, { profile: BROKER });
yes('설명글에 표시 정보·해시태그', c.text.includes('등록번호: 11710-2020-00123') && c.tags.includes('#송파구') && c.tags.length >= 6);
yes('설명글: 독자에게 하는 말은 존칭', /(보세요|주세요|했어요)/.test(c.text));
const cs = T.cards(K, { profile: BROKER });
yes('카드 4~6장', cs.length >= 4 && cs.length <= 6);
yes('카드마다 출처', cs.every(x => /자료:/.test(x.foot)));
yes('카드마다 표시 정보(마지막 장은 본문에)', cs.slice(0, -1).every(x => x.ad.includes('등록번호 11710-2020-00123')) && cs[cs.length - 1].lines.some(l => l.includes('11710-2020-00123')));
yes('비중개사 카드에는 등록번호 없음', T.cards(K, { profile: SELLER }).every(x => !/등록번호/.test(x.ad)));
yes('자료 적은 주에도 카드 4장 이상', T.cards(K0, {}).length >= 4);

/* ---------- 5. 메모 ---------- */
check('메모: 연도·층 숫자는 됨', T.cleanMemo('남향, 2023년 욕실 수리, 12층').ok, true);
check('메모: 전화번호 막음', T.cleanMemo('010-1234-5678 연락').ok, false);
check('메모: 보장 표현 막음', T.cleanMemo('수익 보장 매물').ok, false);
check('메모: 무조건 막음', T.cleanMemo('무조건 오릅니다').ok, false);

/* ---------- 6. 공유 주소 ---------- */
const st = { sd: 's00', g: '11710', d: '가락동', j: '913', a: '헬리오시티', b: '84㎡대', ask: 290000, bd: '101동', fl: '12층', memo: '남향' };
check('설명서 주소 왕복', T.decodeListing('?' + T.encodeListing(st)), st);
check('표시 정보 왕복(# 뒤)', T.unpackProfile(T.packProfile(BROKER)).reg, '11710-2020-00123');
check('주소에 보장 표현 메모는 안 실림', T.decodeListing('?' + T.encodeListing(Object.assign({}, st, { memo: '무조건 오름' }))).memo, '');

/* ---------- 7. 이용 수 ---------- */
const GS = fs.readFileSync(path.join(ROOT, 'tools/agent-backend.gs'), 'utf8');
const srv = {}; (GS.match(/\{ id: '(brief[a-z_]*)',[^}]*listing: (\d+), kitAreas: (\d+)/g) || []).forEach(l => { const m = l.match(/id: '([a-z_]+)'.*listing: (\d+), kitAreas: (\d+)/); srv[m[1]] = [+m[2], +m[3]]; });
const web = {}; JDJ_BRIEF.TIERS.forEach(t => { web[t.id] = [t.listing, t.kitAreas]; });
check('화면·서버 이용 수 표가 같음', web, srv);
check('요금제별 이용 수', ['brief', 'brief_plus', 'brief_pro', 'brief_pro_plus'].map(t => [T.limitsFor(t).listing, T.limitsFor(t).kitAreas]), [[0, 0], [10, 1], [30, 1], [150, 5]]);
check('대체 표도 같음', Object.keys(T.FALLBACK).map(k => [T.FALLBACK[k].listing, T.FALLBACK[k].kitAreas]), Object.keys(T.FALLBACK).map(k => srv[k]));
check('구독 없음 → 못 씀', T.left({ tier: '' }, 'listing').ok, false);
check('설명서 29/30 → 됨', T.left({ tier: 'brief_pro', used: { listing: 29 } }, 'listing').ok, true);
check('설명서 30/30 → 안 됨', T.left({ tier: 'brief_pro', used: { listing: 30 } }, 'listing'), { ok: false, why: 'limit', limit: 30, used: 30 });
check('주간 글: 중개사용 두 번째 지역 → 안 됨', T.left({ tier: 'brief_pro', used: { kit: ['11710'] } }, 'kit', '11680').ok, false);
check('주간 글: 같은 지역 다시 → 됨', T.left({ tier: 'brief_pro', used: { kit: ['11710'] } }, 'kit', '11710').ok, true);
check('주간 글: 중개사 플러스 5곳', T.left({ tier: 'brief_pro_plus', used: { kit: ['1', '2', '3', '4'] } }, 'kit', '11680').ok, true);
yes('서버: toolUse 가 한도에서 막음', /이번 달 매물 설명서 \$\{out\.limits\.listing\}장을 모두 썼어요/.test(GS) && /이번 주에는 지역 \$\{out\.limits\.kitAreas\}곳까지/.test(GS));
yes('서버: 같은 지역 다시 만들기는 세지 않음', /if \(used\.kit\.indexOf\(g\) < 0\)/.test(GS));
yes('서버: 월요일 메일 링크', /briefKitHtml\(pieces, pro, date\)/.test(GS) && /agent\/content\//.test(GS));
yes('서버 버전 v28 이상(머리말에 v28 몫 포함)', /백엔드 \((v2[89]|v[3-9]\d):[^\n]*/.test(GS) && /v28: 중개사 도구/.test(GS));

/* ---------- 8. zip ---------- */
check('crc32', T.crc32(new TextEncoder().encode('123456789')).toString(16), 'cbf43926');
const z = T.zip([{ name: '카드1.png', data: new Uint8Array([1, 2, 3]) }]);
check('zip 머리·끝 표시', [z[0], z[1], z[2], z[3], z[z.length - 22], z[z.length - 21]], [0x50, 0x4b, 3, 4, 0x50, 0x4b]);

/* ---------- 9. 화면·캐시 ---------- */
const CP = fs.readFileSync(path.join(ROOT, 'agent/content/index.html'), 'utf8');
yes('주간 글 화면: 복사·내려받기', ['cpBlog', 'dlTxt', 'dlMd', 'dlZip', 'cpCap'].every(id => CP.includes(`id="${id}"`)));
yes('화면 문구에 회사명 없음', !/장대장부동산그룹/.test(CP + LP));
const SW = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
yes('sw: 새 파일 저장 목록', SW.includes('/assets/broker-tools.js?v=2') && SW.includes('/agent/listing/') && SW.includes('/agent/content/'));
yes('페이지가 같은 판 번호를 씀', LP.includes('broker-tools.js?v=2') && CP.includes('broker-tools.js?v=2') && CP.includes('brief-core.js?v=7'));

console.log(`중개사 도구 검사: ${ok}개 맞음, ${bad}개 틀림`);
process.exit(bad ? 1 : 0);
