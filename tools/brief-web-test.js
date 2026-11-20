/* 아침 브리핑 화면 공용 계산(assets/brief-core.js) 자동 검증 — 실행: node tools/brief-web-test.js */
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
console.log(`아침 브리핑 화면 계산 검증: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
