/* '지도에서 보기' 주소 규칙 자동 검증 — 실행: node tools/mapjump-test.js
   assets/mapjump.js 의 url()(결과 화면이 만드는 지도 주소) ↔ parse()(지도 화면이 읽는 값)가 서로 그대로 돌아오는지(왕복),
   돌아갈 주소가 사이트 안 상대 주소만인지, 경로가 JDJ_BASE 기준(새 도메인 '/', 예전 주소 '/jangdaejang-calc/')인지,
   좌표는 소수 셋째 자리로만 싣는지, 개통 전 신설역은 '예정 위치 기준 약 ○m'(50m 단위)로만 말하는지 본다.
   지도 화면(map/)이 원래 읽던 sd·d·b 값과 엔진 검색용 페이지(scripts/seo_pages.py map_href)도 같은 이름을 쓴다. */
const path = require('path');
const rows = [];
function check(name, got, want) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want }); }
function load(site) {                      // 열린 주소에 따라 JDJ_BASE 가 정해지므로 주소마다 새로 읽음
  const f = require.resolve('../assets/mapjump.js'); delete require.cache[f];
  global.location = { pathname: site + 'mine/', search: '' }; delete global.window;
  const MJ = require(f); delete global.location; return MJ;
}
const qOf = u => new URLSearchParams(u.split('?')[1]);

/* 1) 예전 주소(/jangdaejang-calc/) — 아파트 1곳 왕복 */
let MJ = load('/jangdaejang-calc/');
const key = '11680|개포동|12|래미안 블레스티지(1&2)';
const loc = { pathname: '/jangdaejang-calc/mine/', search: '?sd=s00&d=' + encodeURIComponent(key) + '&b=84%E3%8E%A1%EB%8C%80' };
const u1 = MJ.url({ items: [{ sd: 's00', d: key, b: '84㎡대' }], name: '래미안', price: 305000.4, ll: [37.481234, 127.061987] }, loc);
check('예전 주소: 지도 경로', u1.split('?')[0], '/jangdaejang-calc/map/');
const p1 = MJ.parse(qOf(u1));
check('아파트 왕복: 단지·평형', p1.items, [{ sd: 's00', d: key, b: '84㎡대' }]);
check('아파트 왕복: 종류·이름·가격', [p1.kind, p1.name, p1.price, p1.on], ['a', '래미안', 305000, true]);
check('좌표는 소수 셋째 자리', p1.ll, [37.481, 127.062]);
check('주소에도 셋째 자리까지만', qOf(u1).get('fl'), '37.481,127.062');
check('돌아갈 주소 = 지금 화면(사이트 안 상대)', p1.back, 'mine/' + loc.search);
check('돌아가기 링크 = 사이트 경로 + 상대', MJ.backHref(p1), '/jangdaejang-calc/mine/' + loc.search);
check('지도 화면이 원래 읽던 이름 그대로(sd·d·b)', [qOf(u1).get('sd'), qOf(u1).get('d'), qOf(u1).get('b')], ['s00', key, '84㎡대']);

/* 2) 새 도메인(맨 앞 /) — 오피스텔·통건물·비교 */
MJ = load('/');
const lo = { pathname: '/mine/', search: '?t=o&og=11680&ob=' + encodeURIComponent('역삼동|719-24') };
const u2 = MJ.url({ kind: 'o', g: '11680', dong: '역삼동', jibun: '719-24', name: '역삼역센트럴푸르지오시티', price: 23000 }, lo);
check('새 도메인: 지도 경로(/jangdaejang-calc/ 없음)', u2.split('?')[0], '/map/');
const p2 = MJ.parse(qOf(u2));
check('오피스텔 왕복', [p2.kind, p2.g, p2.dong, p2.jibun, p2.name, p2.price, p2.ll, p2.items.length], ['o', '11680', '역삼동', '719-24', '역삼역센트럴푸르지오시티', 23000, null, 0]);
check('오피스텔 돌아갈 주소', MJ.backHref(p2), '/mine/' + lo.search);
const p3 = MJ.parse(qOf(MJ.url({ kind: 'g', g: '11680', dong: '역삼동', name: '역삼동 통건물' }, { pathname: '/mine/', search: '?t=c&cg=11680&ck=g' })));
check('통건물 왕복(지번 없음 → 동 가운데)', [p3.kind, p3.dong, p3.jibun, p3.back], ['g', '역삼동', '', 'mine/?t=c&cg=11680&ck=g']);
const it = [{ sd: 's00', d: 'a|b|1|가', b: '84㎡대' }, { sd: 's08', d: 'c|d|2|나', b: '' }, { sd: 's00', d: 'e|f|3|다', b: '59㎡대' }, { sd: 's00', d: 'x', b: '' }];
const p4 = MJ.parse(qOf(MJ.url({ items: it }, { pathname: '/ask/', search: '?k=1' })));
check('비교 왕복(최대 3곳)', p4.items, it.slice(0, 3));
check('비교: 아파트 종류', p4.kind, 'a');

/* 2-1) 통건물 추정 위치: fe=1 + 사실 한 줄, 좌표는 셋째 자리 — 좌표 없으면 추정 표시도 없음 */
const pe = MJ.parse(qOf(MJ.url({ kind: 'g', g: '11680', dong: '논현동', name: '논현동 통건물 (추정)', ll: [37.51123, 127.02912], est: 1, facts: '업무시설 · 연면적 1,400㎡ · 2001년 준공' }, lo)));
check('추정 위치 왕복', [pe.kind, pe.ll, pe.est, pe.facts, pe.jibun], ['g', [37.511, 127.029], true, '업무시설 · 연면적 1,400㎡ · 2001년 준공', '']);
check('좌표 없으면 추정 표시 없음', MJ.parse(qOf(MJ.url({ kind: 'g', g: '11680', dong: '논현동', est: 1, facts: 'x' }, lo))).est, false);

/* 3) 돌아갈 주소는 사이트 안 상대 주소만 */
check('다른 사이트 주소 거부', ['https://evil.example/', '//evil.example', '/abs/path', 'javascript:alert(1)', '../up/', 'a/../../b', 'a b', 'a"b'].map(MJ.back), ['', '', '', '', '', '', '', '']);
check('사이트 안 주소 허용', MJ.back('apt/11680/abcd1234-래미안/'), 'apt/11680/abcd1234-래미안/');
check('주소에 넣은 나쁜 돌아갈 주소는 버림', MJ.parse('f=1&bk=' + encodeURIComponent('https://evil.example/')).back, '');
check('사이트 밖 화면에서는 돌아갈 주소 없음', MJ.here({ pathname: '/other/', search: '' }), 'other/');
check('이상한 좌표·코드 무시', (p => [p.ll, p.g])(MJ.parse('fl=0,0&fg=abc')), [null, '']);
check('f=1 없으면 보통 지도', MJ.parse('sd=s00&d=x').on, false);

/* 4) 처음 확대 단계 */
check('점 1개 → 기본 확대', MJ.fitZoom([[37.5, 127]], 390, 600, 17), 17);
const z2 = MJ.fitZoom([[37.48, 127.06], [37.52, 127.10]], 390, 600);
check('비교 두 곳(약 5km) → 둘 다 보이는 확대(12~14)', z2 >= 12 && z2 <= 14, true);
check('먼 두 곳 → 더 넓게', MJ.fitZoom([[37.5, 127], [35.1, 129]], 390, 600) < z2, true);

/* 5) 신설역: 개통 전 예정 위치는 좌표 없이 50m 단위 '예정 위치 기준 약' */
check('개통 전 예정 위치 50m 단위', MJ.railText({ line: '신안산선', st: '도림사거리', pl: 1, m: 562 }), '신안산선 도림사거리역(개통 예정) · 예정 위치 기준 약 550m');
check('운행 중인 역은 직선 거리', MJ.railText({ line: '동북선 경전철', st: '상계역', m: 649 }), '동북선 경전철 상계역 · 직선 649m');
check('점검 중(x) 자료는 말하지 않음', MJ.railText({ st: 'a', x: 1 }), '');

/* 6) 버튼 HTML: 위·아래 같은 주소 */
global.location = { pathname: '/mine/', search: '?sd=s00' };
const top = MJ.btn({ items: [{ sd: 's00', d: 'k', b: '' }] }, 'top'), bot = MJ.btn({ items: [{ sd: 's00', d: 'k', b: '' }] }, 'bottom', '이 단지 주변을 지도에서 확인해 보세요');
const href = h => (h.match(/href="([^"]+)"/) || [])[1];
check('위·아래 버튼 같은 주소', href(top) === href(bot) && !!href(top), true);
check('버튼 글자', [/지도에서 보기<\/a>$/.test(top), /이 단지 주변을 지도에서 확인해 보세요/.test(bot)], [true, true]);
delete global.location;

const fail = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `\n      got ${JSON.stringify(r.got)}\n      want ${JSON.stringify(r.want)}`));
console.log(`\n${rows.length - fail.length}/${rows.length} 통과`);
process.exit(fail.length ? 1 : 0);
void path;
