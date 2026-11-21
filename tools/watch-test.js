/* 관심 목록 자동 확인 — 실행: node tools/watch-test.js </dev/null
   assets/watch-core.js: 저장 칸 정리·넣기/빼기·합치기, 변화 계산(어제·오늘 새 거래·신고가·큰 하락·어제 대비 순위·전세가율,
   지난 방문 뒤 새 거래·순위·전세가율), 배지 수, 브리핑 ③ 이름 합치기·들어가는지. 화면(my/watch/)·첫 화면 연결도 본다. 금액 단위: 만원. */
const fs = require('fs'), path = require('path');
const C = require('../assets/watch-core.js');
const rows = [];
function check(name, got, want, basis) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want, basis }); }

/* ---------- 저장 ---------- */
const A = { sd: 's00', code: '11710', dong: '잠실동', jibun: '35', apt: '잠실엘스', band: '84㎡대' };
const Bp = { sd: 's00', code: '11680', dong: '대치동', jibun: '316', apt: '은마', band: '74㎡대' };
check('칸 정리: 빈 이름·잘못된 코드 버림, 꺾쇠 지움', [C.clean({ sd: 's00', code: '1171', apt: 'x', band: 'y' }), C.clean(Object.assign({}, A, { apt: '<b>잠실엘스</b>' })).apt], [null, 'b잠실엘스/b'], '서버 cleanPlace 와 같은 칸');
let r = C.toggle([], A, '2026-11-21');
check('넣기: 맨 앞, 넣은 날', [r.added, r.list.length, r.list[0].t], [true, 1, '2026-11-21'], '');
r = C.toggle(r.list, Bp, '2026-11-21');
check('두 번째도 맨 앞', r.list.map(x => x.apt), ['은마', '잠실엘스'], '');
r = C.toggle(r.list, A);
check('같은 단지·평형 다시 누르면 빼기', [r.added, r.list.map(x => x.apt)], [false, ['은마']], '');
check('다른 평형은 다른 항목', C.has([A], Object.assign({}, A, { band: '59㎡대' })), false, '');
const full = Array.from({ length: 30 }, (_, i) => Object.assign({}, A, { jibun: String(i) }));
check('30곳이 차면 넣지 않음', [C.toggle(full, Bp).full, C.toggle(full, Bp).list.length], [true, 30], '');
check('저장 글 → 목록(망가진 글은 빈 목록)', [C.parse(C.dump([A, A, Bp])).length, C.parse('{oops').length, C.parse('null').length], [2, 0, 0], '');
check('계정 합치기: 이 기기 먼저, 겹치면 한 번', C.merge([A], [Bp, A]).map(x => x.apt), ['잠실엘스', '은마'], '');
check('키 = 구|동|지번|단지|평형 (auth.js placeId 와 같음)', C.idOf(A), '11710|잠실동|35|잠실엘스|84㎡대', '');

/* ---------- 기기 간 맞추기(할 일만 적용) ---------- */
const X = A, Y = Bp, Z = Object.assign({}, A, { jibun: '99', apt: '리센츠' });
let opsA = C.addOp([], 'del', X, 1);
const serverAfterA = C.applyOps([X, Y], opsA);
check('A기기에서 뺌 → 계정 목록에서 빠짐', serverAfterA.map(x => x.apt), ['은마'], '');
const opsB = C.addOp([], 'add', Z, 2);
check('B기기(전에 맞춘 적 있음, X가 남아 있음)에서 다른 단지를 넣어도 X는 되살아나지 않음', C.applyOps(serverAfterA, opsB).map(x => x.apt), ['리센츠', '은마'], '계정 목록 + B의 할 일만');
check('같은 항목 할 일은 마지막 것만', C.addOp(C.addOp([], 'add', X, 1), 'del', X, 2).map(o => o.op), ['del'], '');
check('B가 직접 다시 넣은 것은 들어감(B의 뜻)', C.applyOps(serverAfterA, C.addOp([], 'add', X, 3)).map(x => x.apt), ['잠실엘스', '은마'], '');
check('예전 판 기기(맞춘 적 없음)의 목록만 넣기로 바꿈', C.legacyOps([X, Y], [Y]).map(o => [o.op, o.p.apt]), [['add', '잠실엘스']], '');
check('할 일 기록 읽기: 망가진 줄 버림', C.parseOps(JSON.stringify([{ op: 'add', p: X }, { op: 'zap', p: X }, { op: 'del', p: {} }, null])).length, 1, '');

/* 실제 watch.js 로 두 기기 흉내(가짜 서버·가짜 브라우저 저장소) — 로그인 부품이 없는 화면(순위)처럼 토큰으로 직접 저장 */
const vm = require('vm');
const SERVER = { favs: [] };
function device(name, store) {
  store = store || {}; const docEvents = {};
  const el = () => ({ style: {}, setAttribute() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [], classList: { toggle() {} } });
  const ctx = { console, JSON, Promise, Date, Set, Math, setTimeout: f => f(), clearTimeout() {},
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    sessionStorage: { getItem: () => null, setItem() {} },
    location: { pathname: '/jangdaejang-calc/rank/' }, addEventListener() {},
    document: { readyState: 'complete', addEventListener: (t, f) => { docEvents[t] = f; }, querySelectorAll: () => [], querySelector: () => null, getElementById: () => null,
      createElement: el, head: el(), body: el() },
    JDJ_AGENTS: { api: 'https://example.invalid/api' },
    fetch: (u, o) => {
      if (!o) return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
      const b = JSON.parse(o.body);
      let out = { ok: true };
      if (b.action === 'userLoad') out.data = JSON.parse(JSON.stringify({ favs: SERVER.favs }));
      else if (b.action === 'userSave') { SERVER.favs = (b.data.favs || []).map(C.clean).filter(Boolean); out.data = { favs: SERVER.favs }; }
      else out = { ok: false };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(out) });
    } };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.localStorage.setItem('jdj_auth', JSON.stringify({ s: 'a'.repeat(64), nick: name }));
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'watch-core.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'watch.js'), 'utf8'), ctx);
  return { W: ctx.JDJ_WATCH, store };
}
const devA = device('A'); let devB;
const flushAll = () => new Promise(r => setImmediate(r));
(async () => {
  await devA.W.toggle(X); await devA.W.toggle(Y); await flushAll();
  check('A에서 넣자마자 계정에 저장(로그인 부품 없는 화면)', SERVER.favs.map(x => x.apt).sort(), ['은마', '잠실엘스'], 'userSave');
  devB = device('B'); await devB.W.sync(); await flushAll();        // B 기기에서 화면을 엶
  check('B가 맞추면 A가 넣은 두 곳', devB.W.list().map(x => x.apt).sort(), ['은마', '잠실엘스'], '');
  await devA.W.toggle(X); await flushAll();
  check('A에서 뺌 → 계정에서 바로 빠짐', SERVER.favs.map(x => x.apt), ['은마'], '');
  devB.store[C.KEY] = C.dump([X, Y]);       // B 는 아직 예전 목록(X 포함)을 들고 있음(A 에서 뺀 뒤 B 화면을 다시 열지 않음)
  await devB.W.toggle(Z); await flushAll();
  check('A에서 지운 단지가 B에서 합칠 때 되살아나지 않음', SERVER.favs.map(x => x.apt).sort(), ['리센츠', '은마'], 'B 할 일(리센츠 넣기)만 적용');
  check('B 기기 목록도 계정 목록으로 맞춰짐', devB.W.list().map(x => x.apt).sort(), ['리센츠', '은마'], '');
  check('저장한 할 일은 비움', JSON.parse(devB.store[C.OPS] || '[]').length, 0, '');
  const st = Object.assign({}, devB.store); st[C.KEY] = C.dump([X, Y, Z]);
  const devB2 = device('B', st); await devB2.W.sync(); await flushAll();     // B 가 예전 목록을 들고 화면을 다시 엶
  check('B 화면을 다시 열어 맞춰도 A에서 지운 단지는 계정·B 목록 모두 없음', [SERVER.favs.some(x => x.apt === '잠실엘스'), devB2.W.list().some(x => x.apt === '잠실엘스')], [false, false], '');
  finish();
})();

/* ---------- 변화 ---------- */
const row = (o) => Object.assign({ d: '잠실동', j: '35', a: '잠실엘스', b: '84㎡대', ar: 84.8, day: '2026-11-21', s: '14:02' }, o);
const G = { date: '2026-11-21', at: '2026-11-21T14:02+09:00', d0: '2026-11-20',
  rows: [row({ dt: 20261103, f: 20, p: 300000, hi: 1, pm: 285000, pmd: 20260920 }), row({ dt: 20261030, f: 2, p: 250000, dr: -14.5, m2: 292500, m2d: 20260601, day: '2026-11-20', s: '21:40' }),
    row({ a: '리센츠', dt: 20261101, f: 9, p: 280000 })],
  u: { '잠실동|35|잠실엘스|84㎡대': [88, 120, 52.4] }, u0: { '잠실동|35|잠실엘스|84㎡대': [86, 150, 51.0] } };
const tr = (d, p, f, hi) => [d, 84.8, f, p, 0, hi ? 1 : 0];
const unit = ['11710', '잠실동', '잠실엘스', '84㎡대', 84.8, 30, [], '', '35', 1, [], [tr(20261103, 300000, 20, 1), tr(20261030, 250000, 2), tr(20261012, 287000, 11), tr(20260920, 285000, 15)], {}];
const D0 = C.diff(A, { g: G, unit });
check('어제·오늘 새 거래 = 이 단지·평형 줄만(다른 단지 빼고)', D0.yday.trades.map(t => t.p), [300000, 250000], 'today/g rows');
check('신고가·큰 하락(−10% 이하) 나눔', [D0.yday.hi.map(t => t.p), D0.yday.drop.map(t => t.p)], [[300000], [250000]], 'hi·dr');
check('어제 대비 순위(엔진 u0 → u)', D0.yday.rank, { from: 150, to: 120 }, '등수 작을수록 높음');
check('어제 대비 전세가율', D0.yday.jr, { from: 51.0, to: 52.4 }, '');
check('처음 보는 항목: 지난 방문 비교 없음', D0.visit, null, '');
check('새 소식 수 = 새 거래 2 + 순위 1 + 전세가율 1', D0.n, 4, '');
check('지금 값', D0.now, { fv: 88, fvr: 120, jr: 52.4 }, '');
/* 지난 방문 기록: 11/12 에 본 상태(11/03·10/30 거래는 아직 없었음, 순위 130·전세가율 52.4) */
const prevUnit = unit.slice(); prevUnit[11] = unit[11].slice(2);
const P = Object.assign(C.snap(A, prevUnit, { u: { '잠실동|35|잠실엘스|84㎡대': [87, 130, 52.4] } }, 1762900000000));
check('기록: 최근 거래 서명·점수·등수·전세가율', [P.sig, P.fv, P.fvr, P.jr], [['20261012|84.8|11|287000', '20260920|84.8|15|285000'], 87, 130, 52.4], '');
const D1 = C.diff(A, { g: G, unit, prev: P });
check('지난 방문 뒤 새 거래 = 공개 목록에서 기록에 없던 것(어제·오늘 줄 꼬리표 붙음)', D1.visit.trades.map(t => [t.p, !!t.hi, t.dr || null]), [[300000, true, null], [250000, false, -14.5]], '');
check('지난 방문 뒤 순위 130 → 120, 전세가율은 그대로라 없음', [D1.visit.rank, D1.visit.jr], [{ from: 130, to: 120 }, null], '');
check('새 소식 수: 두 비교에 겹친 거래는 한 번', D1.n, 4, '거래 2 + 순위 + 전세가율(어제 대비)');
/* 기록의 가장 오래된 거래보다 앞선 거래는 판단하지 않음 */
const P2 = { at: 1, sig: ['20261012|84.8|11|287000'], fvr: 120, jr: 52.4 };
check('기록보다 오래된 거래는 새 거래로 안 셈', C.diff(A, { g: { rows: [] }, unit, prev: P2 }).visit.trades.map(t => t.dt), [20261103, 20261030], '20260920 은 기록 범위 밖');
/* 같은 금액 거래가 두 번이면 개수까지 */
const u2 = unit.slice(); u2[11] = [tr(20261012, 287000, 11), tr(20261012, 287000, 11)];
check('같은 서명 거래 두 번째 건은 새 거래', C.diff(A, { g: { rows: [] }, unit: u2, prev: P2 }).visit.trades.length, 1, '');
check('자료 없으면 변화 없음', C.diff(A, {}).n, 0, '');
check('기록 새로 바꾸기: 없거나 1시간 지났을 때만', [C.shouldRoll(null, 5), C.shouldRoll({ at: 1000 }, 1000 + 3599000), C.shouldRoll({ at: 1000 }, 1000 + 3600000)], [true, false, true], '');

/* ---------- 배지 ---------- */
const GF = { '11710': G };
check('배지: 관심 단지의 어제·오늘 새 거래 수', C.badge([A], GF, []), 2, '');
const seen = C.seenSigs([A], GF);
check('관심 목록 화면을 본 뒤에는 0', C.badge([A], GF, seen), 0, '');
const G2 = JSON.parse(JSON.stringify(G)); G2.rows.unshift(row({ dt: 20261105, f: 7, p: 296000, s: '17:30' }));
check('그 뒤 새로 올라온 거래만 다시 셈', C.badge([A], { '11710': G2 }, seen), 1, '');
check('관심 목록이 비면 0', C.badge([], GF, []), 0, '');

/* ---------- 브리핑 ③ ---------- */
check('브리핑 이름 합치기: 원래 이름 앞, 관심 목록 이름 뒤, 겹치면 한 번', C.briefApts(['리센츠', '은마'], ['잠실엘스', '은마'], [], []), ['리센츠', '은마', '잠실엘스'], '');
check('관심 목록에서 뺀 이름: 우리가 넣은 것만 뺌', C.briefApts(['리센츠', '잠실엘스', '은마'], ['은마'], ['잠실엘스', '은마'], ['잠실엘스', '리센츠']), ['리센츠', '은마'], '리센츠는 원래 있던 이름');
const BR = { areas: [{ g: '11710', dn: '' }, { g: '11680', dn: '개포동' }], apts: ['리센츠', '잠실엘스', '은마'] };
check('브리핑에 들어가는지: 관심 지역 안 + 요금제 수 안', [C.briefFit(A, BR, 3), C.briefFit(A, BR, 1), C.briefFit(Bp, BR, 3)],
  [{ inArea: true, inList: true, listed: true }, { inArea: true, inList: false, listed: true }, { inArea: false, inList: true, listed: true }], '대치동은 관심 지역(개포동)과 다름');

/* ---------- 화면 ---------- */
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const page = read('my/watch/index.html'), home = read('index.html'), mine = read('mine/index.html'), wj = read('assets/watch.js');
check('관심 목록 화면: 금지어 없음', ['시험', '검증', '채점'].filter(w => page.includes(w) || wj.includes(w)), [], '');
check('비구독자 안내 단추 문구', page.includes('매일 아침 받아 보기 (7일 무료)'), true, '');
check('로그인 단추 문구', /AU\.btn\('카카오 간편 로그인'/.test(page), true, '');
check('localStorage 는 try/catch 안에서만', (wj.match(/localStorage\.(get|set)Item/g) || []).length === (wj.match(/try \{ (return )?localStorage\./g) || []).length, true, '');
check('새 발송 채널 없음(메일·푸시 호출 없음)', /sendEmail|PushManager|Notification\(/.test(wj + page), false, '');
check('첫 화면: 관심 목록 한 줄·별 단추', home.includes('id="wRow"') && /JDJ_WATCH\.star\(/.test(home), true, '');
check('단지 화면: 별 단추(로그인 없이도)', /JDJ_WATCH\.star\(favPlace\(d\), \{label: true\}\)/.test(mine) && !mine.includes('id="favBtn"'), true, '');
const rank = read('rank/index.html'), map = read('map/index.html');
check('순위 화면: 단지 순위·점수 변화 목록에 별', (rank.match(/\$\{wstar\(x\)\}/g) || []).length, 2, '');
check('지도 카드: 단지 이름 옆 별', /JDJ_WATCH\.star\(\{ sd: d\.sd, code: d\.code/.test(map), true, '');
check('단지 비교·리포트 추천 단지·조금만 더 준비하면 가능한 단지·성적표 단지 찾기에도 별', [/JDJ_WATCH\.star\(\{ sd: x\.sd/.test(read('ask/index.html')), (read('buy/report/index.html').match(/\$\{WS\(x\)\}/g) || []).length, /JDJ_WATCH\.star\(\{ sd: wsd/.test(read('track/index.html'))], [true, 2, true], '');
check('별을 다는 화면은 모두 같은 부품(watch.js)', ['index.html', 'mine/index.html', 'rank/index.html', 'map/index.html', 'my/watch/index.html', 'ask/index.html', 'buy/report/index.html', 'track/index.html'].every(f => read(f).includes('assets/watch.js?v=5')), true, '');
check('화면 문구에 회사 이름 대신 서비스 이름', /장대장부동산그룹/.test(page), false, '');

function finish(){
const fail = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `\n      got ${JSON.stringify(r.got)}\n      want ${JSON.stringify(r.want)}  (${r.basis})`));
console.log(`\n${rows.length - fail.length}/${rows.length} 통과`);
process.exit(fail.length ? 1 : 0);
}
