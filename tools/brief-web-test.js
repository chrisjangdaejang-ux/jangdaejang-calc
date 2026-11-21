/* 모닝 브리핑 화면 공용 계산(assets/brief-core.js) 자동 검증 — 실행: node tools/brief-web-test.js */
const B = require('../assets/brief-core.js');
let pass = 0, fail = 0;
const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : (fail++, console.log('  실패:', n, JSON.stringify(got), '≠', JSON.stringify(want))); };
check('주소 해석(구)', B.parseD('11710'), { g: '11710', dn: '' });
check('주소 해석(동)', B.parseD('11710-잠실동'), { g: '11710', dn: '잠실동' });
check('잘못된 주소', [B.parseD('1171'), B.parseD('11710-<b>'), B.parseD('')], [null, null, null]);
check('금액', [B.won(310000), B.won(312000), B.won(9500), B.wonS(312000), B.wonS(9500)], ['31억 원', '31억 2,000만 원', '9,500만 원', '31.2억', '9,500만']);
check('날짜', B.dateLabel('2026-11-21'), '11월 21일(토)');
check('기간 문구', [B.windowText({ from: '2026-11-19', to: '2026-11-20' }), B.windowText({ from: '2026-11-13', to: '2026-11-19' }), B.windowText({ to: '2026-11-19' })],
  ['어제 새로 올라온', '11/13 이후 새로 올라온', '처음 확인']);
check('기간 자세히', [B.windowDetail({ from: '2026-11-13', to: '2026-11-19' }), B.windowDetail({ none: true, to: '2026-11-19' })], ['11/13 확인 뒤 ~ 11/19 확인 사이에 처음 보인 거래', '새 확인 없음(마지막 확인 11/19)']);
check('꼬리표', [B.tags({ hi: 1 }), B.tags({ dr: -12.4 }), B.tags({ dr: -5, x: 1 })], [[{ c: 'hi', t: '신고가' }], [{ c: 'dn', t: '최근 2년 최고가보다 12% 낮음' }], [{ c: 'x', t: '직거래' }]]);
const S = { g: '11710', name: '송파구', sd: '서울', date: '2026-11-21', win: { t: { from: '2026-11-13', to: '2026-11-19' } },
  trades: [{ d: '잠실동', a: '가', b: '84㎡대', p: 300000, dt: 20261101, hi: 1 }, { d: '잠실동', a: '나', b: '59㎡대', p: 200000, dt: 20261102, dr: -15 }, { d: '가락동', a: '다', b: '84㎡대', p: 150000, dt: 20261103 }],
  rents: [{ d: '잠실동', a: '가', dep: 100000, mo: 0 }, { d: '가락동', a: '다', dep: 500, mo: 100 }], monthly: 4, nrent: 2,
  lines: { '': { fact: '구 전체' }, '잠실동': { fact: '잠실동 한 줄', cmp: '비교' } }, pro: { '': ['"구"'], '잠실동': ['"잠실 1"', '"잠실 2"'] },
  m30: { chg: -2.1, n: 10 }, m30_dong: {}, dongs: [['잠실동', 2, 1, 1], ['가락동', 1, 0, 1]], notices: [{ n: '공고', d: '신천동', rc: ['20261123', '20261124'] }] };
const v = B.scope(S, '잠실동');
check('동 거르기', [v.n, v.nhi, v.drops.length, v.jeonse.length, v.lines.fact, v.pro.length, v.m30], [2, 1, 1, 1, '잠실동 한 줄', 2, null]);
check('다른 동 공고는 같은 구로 표시', v.notices.map(n => !!n.near), [true]);
check('구 전체', [B.scope(S, '').n, B.scope(S, '').monthly, B.scope(S, '').lines.fact], [3, 4, '구 전체']);
const c = B.card(S, '잠실동', false);
check('카드 값', [c.area, c.top.name, c.top.tag, c.stats.map(s => s.v), c.line], ['송파구 잠실동', '가 84㎡대', '신고가', ['2건', '1건', '1건'], '잠실동 한 줄']);
check('카드(중개사) 첫 줄', B.card(S, '잠실동', true).line, '"잠실 1"');
check('관심 단지 먼저', B.sortMine(S.trades, ['다']).map(t => t.a), ['다', '가', '나']);
check('공고 문구', B.noticeText({ n: '공고', k: '아파트', rc: ['20261123', '20261124'], pw: '20261127', hh: 1200, new: true }), { name: '공고', kind: '아파트', when: '접수 11/23~11/24', pw: '발표 11/27', hh: '1,200세대', isNew: true });
check('이름: 서비스 이름 + 모닝 브리핑', [B.NAME, B.PRICE.brief.name, B.PRICE.brief_pro.name], [B.SITE + ' 모닝 브리핑', B.SITE + ' 모닝 브리핑', B.SITE + ' 모닝 브리핑 중개사용']);
check('시장 거래 한 줄(신고가)', B.topText({ sd: '서울', gn: '강남구', d: '압구정동', a: '현대7차', b: '245㎡대', p: 1150000, dt: 20261102, pm: 1050000, pmd: 20260301, up: 9.5 }),
  { name: '현대7차 245㎡대', where: '서울 강남구 압구정동', price: '115억 원', when: '11/2 계약', sub: '이전 최고 105억 원(2026.3)보다 +9.5%' });
check('시장 거래 한 줄(하락)', B.topText({ sd: '경기', gn: '화성시', a: '예시', b: '84㎡대', p: 60000, dt: 20261101, m2: 80000, m2d: 20250501, dr: -25 }).sub, '최근 2년 최고 8억 원(2025.5)보다 −25.0%');
check('금리 문구(자료 있을 때만)', [B.rateText(null), B.rateText({ base: { ym: '202610', v: 2.25, chg: -0.25 }, mort: { ym: '202609', v: 4.1 } })],
  [[], ['한국은행 기준금리 2.25%(2026.10) · 지난달보다 −0.25%p', '은행 주택담보대출 신규 금리 4.10%(2026.9)']]);
check('이번 주 청약 한 줄', B.cyText({ n: '단지', sd: '서울', gn: '송파구', k: '아파트', sp: ['20261117', ''], rc: ['20261118', '20261119'], hh: 300 }),
  { name: '단지', where: '서울 송파구', kind: '아파트', when: '특별공급 11/17 · 접수 11/18~11/19', hh: '300세대' });
check('내 관심 단지만', (m => [m.trades.map(t => t.a), m.rents.map(r => r.a)])(B.mine(S, ['가'])), [['가'], ['가']]);
check('관심 단지 없으면 빈 칸', B.mine(S, []).trades, []);
check('급매 한 줄·표시', B.urgentText({ a: '가', b: '84㎡대', p: 65000, dt: 20261102, med: 100000, n3: 3, disc: -35, sus: 1, x: 1 }),
  { name: '가 84㎡대', price: '6억 5,000만 원', when: '11/2 계약', sub: '최근 3개월 같은 평형 중간값 10억 원(3건)보다 35% 낮아요', tags: ['직거래', '특수 거래 의심'] });
check('전세가율: 오르면 갭 기회·전세 위험 둘 다', (x => [x.val, x.dlt, /갭 기회/.test(x.why) && /전세 위험/.test(x.why)])(B.gapText({ a: '가', b: '84㎡대', jr0: 50, jr: 60, dlt: 10 })), ['50% → 60%', '+10.0%p', true]);
check('전세가율: 내리면 보증금 안전·갭 부담', /더 안전/.test(B.gapText({ a: '가', b: '', jr0: 60, jr: 50, dlt: -10 }).why), true);
check('순위 한 줄', B.rankText({ a: '가', b: '84㎡대', sd: '서울', d: '잠실동', r0: 120, r1: 45, mv: 75 }), { name: '가 84㎡대', where: '서울 잠실동', val: '120위 → 45위', up: true, mv: '▲75' });
check('근거 문장(사례 있을 때만)', [B.evText(null), /4,000곳 중 57%가 2년 뒤/.test(B.evText({ n: 4000, hit: 57, ex: 1.6, from: '202110', to: '202410', h: 24, np: 4 }, '서울'))], ['', true]);
const CYL = [{ n: 'A', cut: [{ b: 1, lo: 40, hi: 50 }, { b: 2, lo: 60, hi: 70 }] }, { n: 'B', cut: [{ b: 0, lo: 30, hi: 44 }] }];
check('청약 기회: 저장 가점 비교(가능성 높음 먼저)', B.cyMatch(CYL, 45).map(x => [x.n.n, x.band, x.label]), [['B', '60㎡ 이하', '가능성 높음'], ['A', '60~85㎡', '경합']]);
check('청약 기회: 저장값 없으면 생략', [B.cyMatch(CYL, '').length, B.cyMatch(CYL, null).length, B.cyMatch(CYL, 99).length], [0, 0, 0]);
const TC = B.taxCal([{ apt: '가', bd: '2025-03' }, { apt: '나', bd: '' }], '2026-11-21');
check('세금 캘린더: 비과세 보유 2년·장특공 3년·6/1 기준일 D-day 순', TC.map(x => [x.k, x.date, x.dday]), [['nontax', '2027-03-01', 100], ['base', '2027-06-01', 192], ['ltd', '2028-03-01', 466]]);
check('세금 캘린더: 집 정보 없으면 기준일만', B.taxCal([], '2026-05-30').map(x => [x.k, x.dday]), [['base', 2]]);
const PNM = { n: 3, win: ['2026-11-20', '2026-11-21'], note: { 정책: '정책 문장', 공급: '공급 문장' }, items: [
  { t: "[참고] '27년 부동산 공시가격 시세반영률은 전년 수준 유지", d: '2026-11-20', org: '국토교통부', u: 'https://www.korea.kr/briefing/pressReleaseView.do?newsId=1', c: '정책', sub: '세금', terms: [['공시가격', '정부가 세금 계산에 쓰려고 …']] },
  { t: '[서남권] 동작구 흑석동 204-104 일대 재개발', d: '2026-11-18', org: '서울특별시', u: 'https://news.seoul.go.kr/citybuild/archives/543916', c: '공급', rg: '서울 동작구', terms: [['재개발', '낡은 집…']] },
  { t: '나쁜 링크', d: '2026-11-21', org: '국토교통부', u: 'javascript:alert(1)', c: '공급' }] };
const PG = B.pnewsGroups(PNM);
check('새 발표: 종류 순(정책→교통→공급), 빈 종류 빼고, 고정 문장', PG.map(g => [g.c, g.note, g.items.length]), [['정책', '정책 문장', 1], ['공급', '공급 문장', 2]]);
check('새 발표: 작은 줄(부처·날짜·작은 종류·지역)·용어', [PG[0].items[0].meta, PG[1].items[0].meta, PG[0].items[0].terms.length], ['국토교통부 · 11/20 발표 · 세금', '서울특별시 · 11/18 발표 · 서울 동작구', 1]);
check('새 발표: https 가 아닌 링크는 버림', PG[1].items[1].u, '');
check('새 발표: 없으면 빈 목록(칸 숨김)', [B.pnewsGroups(null).length, B.pnewsGroups({ items: [] }).length], [0, 0]);
check('새 발표 기간', [B.pnewsWin(PNM), B.pnewsWin(null)], ['11/20~11/21', '']);
const AU = {}; new Function('window', 'addEventListener', 'localStorage', require('fs').readFileSync(require('path').join(__dirname, '../assets/auth.js'), 'utf8'))(AU, () => {}, { getItem: () => null, setItem() {} });
check('머리줄 이름: 기호·빈 값이면 내 정보', ['장대장', '.', '', ' ..', 'kim', '홍길동이름이아주아주긴사람입니다'].map(AU.JDJ_AUTH.chipName), ['장대장 님', '내 정보', '내 정보', '내 정보', 'kim 님', '홍길동이름이아주아주긴사 님']);
/* v25 요금제 표·등록번호·급매 기준 */
check('요금제: 화면에 4개(기본·플러스·중개사용·중개사 플러스) 순서·가격', B.shownTiers().map(t => [t.id, t.label, t.amount]),
  [['brief', '기본', 3900], ['brief_plus', '플러스', 5900], ['brief_pro', '중개사용', 4900], ['brief_pro_plus', '중개사 플러스', 9900]]);
check('요금제 한도: 지역·단지·손님', B.TIERS.map(t => [t.areas, t.apts, t.customers]), [[3, 3, 0], [10, 10, 0], [10, 10, 0], [20, 30, 10]]);
check('중개사 요금제만 등록번호·런칭가, 급매 기준·주간 리포트는 중개사 플러스만', B.TIERS.map(t => [t.broker, t.launch, t.urgPick, t.weekly]),
  [[false, false, false, false], [false, false, false, false], [true, true, false, false], [true, true, true, true]]);
check('저장 최대 = 가장 큰 요금제', B.MAX, { areas: 20, apts: 30 });
check('show:false 요금제는 화면에서 빠짐', (() => { B.TIERS.push({ id: 'x', show: false }); const n = B.shownTiers().length; B.TIERS.pop(); return n; })(), 4);
check('요금제 설명은 쉬운 말(내부 용어 없음)', B.TIERS.every(t => t.inc.every(x => !/tier|plan|id|API|시험|검증|채점/i.test(x))), true);
check('등록번호: 새 형식·옛 형식·틀린 것', ['11680-2020-00123', '제 11680 2020 00123 호', '서울강남-1234', '11680-2030-00123', '99999-2020-00123', '010-1234-5678', '123-45-67890', 'abcd'].map(x => { const r = B.brokerNo(x, 2026); return r.ok ? r.kind + ':' + r.norm : 'X'; }),
  ['new:11680-2020-00123', 'new:11680-2020-00123', 'old:서울강남-1234', 'X', 'X', 'X', 'X', 'X']);
const SU = { urgent: [{ a: '가', disc: -12 }, { a: '나', disc: -25 }], urgent_lo: [{ a: '다', disc: -7 }, { a: '라', disc: -5.2 }] };
check('급매 기준: 기본 10%는 자료 그대로, 6%면 넓게, 15%면 좁게', [10, 6, 5, 15, undefined].map(t => B.urgentFor(SU, t).map(u => u.a).join('')), ['나가', '나가다', '나가다라', '나', '나가']);
check('내 관심 단지 급매도 같은 기준', B.mine(SU, ['다'], 6).urgent.map(u => u.a), ['다']);
check('급매 기준 저장값 없으면 10%', B.myUrg(), 10);
console.log(`모닝 브리핑 화면 계산 검증: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
