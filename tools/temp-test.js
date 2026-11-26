/* 시장 온도(assets/temp-core.js·temp-view.js·temp/) 자동 검증 — 실행: node tools/temp-test.js [temp 자료 폴더(선택, 예: /tmp/site/data/temp)] </dev/null
   ① 숫자·문장이 자료 그대로인지(새 숫자를 만들지 않음), 자료 없는 칸은 숨기는지
   ② 고민 해결 길잡이·지도·내 집·단지 순위·모닝 브리핑이 같은 파일(temp/index.json)·같은 문장 함수를 쓰는지
   ③ 사라·팔라는 말, 경쟁 서비스 이름, 비공개 경계값이 화면 글자에 없는지
   ④ 화면들이 같은 버전(?v=)으로 불러오고 서비스 워커 목록과 맞는지 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const T = require('../assets/temp-core.js');
const rows = [];
const check = (name, got, want) => rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want });
const ok = (name, cond, info) => rows.push({ ok: !!cond, name, got: info, want: true });
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const I = {
  v: 1, asof: '2026-11-27', week: '2026-11-23', lm: '202610', labels: T.LABELS,
  src: { deal: { nm: '국토교통부 아파트 매매 실거래가(공공데이터포털)' } },
  bt: { h: 12, from: '201203', to: '202510', rho: 0.13, rho_pos: 93.3, months: 164,
        rows: [{ l: 0, n: 3606, med: 1.09, up: 55.1, beat: 39.2 }, { l: 2, n: 11761, med: 3.95, up: 70.2, beat: 45.9 }, { l: 4, n: 2911, med: 11.66, up: 82.8, beat: 58.5 }] },
  kr: { nm: '전국', l: 2, lm: '202610', c: { v: { n3: 108388, base: 118775, from: '202608', to: '202610', est: true } }, why: '거래는 평소 수준이에요.' },
  sido: { s00: { nm: '서울특별시', short: '서울', l: 3, c: { v: { n3: 11513, base: 15936, from: '202608', to: '202610' } }, why: 'w' } },
  g: {
    '11710': { nm: '송파구', sid: 's00', l: 3, lm: '202610', why: '신고가가 평소보다 자주 나와요.', k: { v: 0, u: 2, nh: 2 },
      c: { v: { n3: 745, base: 1100, from: '202608', to: '202610', est: true }, u: { r: 53.6, dn: 40.9, n: 474 }, nh: { r: 31.2, n: 520 }, cx: { r: 2.2, n: 1228, from: '202605', to: '202607' } },
      rsd: { w: '202647', wd: '2026년 11월 3주', v: 104.0, v4: 100.5, zone: '동남권' }, wk: { w: '202648', wd: '2026-11-23', c1: -0.5, c4: -1.43 },
      jr: [38.7, 42.7], jm: '202610', uns: [0, 0], um: '202609',
      pend: [{ ym: '202610', n: 242, e: 248, r: [245, 252], p: 1 }, { ym: '202611', n: 83, p: 1 }] },
    '11680': { nm: '강남구', sid: 's00', l: null, why: '최근 석 달 거래가 너무 적어 온도를 매기지 않았어요.' },
    '26110': { nm: '중구', sid: 's01', l: 1, why: 'x', c: {} }
  }
};

/* ① 지역·요약 */
check('지역 찾기: 전국·시·도·구', [T.region(I, 'kr').nm, T.region(I, 's00').nm, T.region(I, '11710').nm, T.region(I, '99999')], ['전국', '서울특별시', '송파구', null]);
const s = T.summary(I, T.region(I, '11710'));
check('요약: 단계 이름·색·기준 문장', [s.t, s.color, s.basis], ['따뜻함', T.COLORS[3], '2026년 8~10월 계약 실거래 기준 · 2026.11.27 계산']);
check('온도 없는 구: 단계 없음 + 이유', [T.summary(I, T.region(I, '11680')).l, T.summary(I, T.region(I, '11680')).none], [null, '최근 석 달 거래가 너무 적어 온도를 매기지 않았어요.']);
check('구 목록: 시·도 안만, 이름 순', T.guList(I, 's00').map(x => x.g), ['11680', '11710']);
check('시·도 id', T.sidoOf(I, '11710'), 's00');
check('기록 파일: 구 → 시·도 파일, 시·도 → 자기, 전국 → kr', [T.fileOf(I, '11710'), T.fileOf(I, 's01'), T.fileOf(I, 'kr')], ['s00', 's01', 'kr']);

const C = T.comps(T.region(I, '11710'));
check('지표 줄: 거래량·오른 거래·신고가·해제(참고)', C.map(c => c.id), ['v', 'u', 'nh', 'cx']);
check('거래량 증감 = 745 ÷ 1,100 − 1 → 32% 적어요', /1,100건보다 32% 적어요/.test(C[0].s), true);
check('비율은 자료 값 그대로(소수 첫째 자리)', [C[1].v, C[2].v, C[3].v], ['53.6%', '31.2%', '2.2%']);
check('해제 비율은 참고 표시(방향 배지 없음)', [C[3].ref, C[3].dir], [true, null]);
check('자료 없는 지표 칸은 숨김', T.comps(T.region(I, '26110')).length, 0);
const O = T.official(I, T.region(I, '11710'));
check('공식 통계: 수급지수·주간 변동·전세가율·미분양', O.map(o => o.t), ['한국부동산원 매매수급지수(동남권)', '한국부동산원 주간 아파트값', '전세가율', '미분양']);
ok('수급지수 4주 변화 = 104.0 − 100.5', /4주 전보다 \+3\.5/.test(O[0].s), O[0].s);
check('주간 변동 그대로', O[1].v, '4주 −1.43%');
const P = T.pendList(T.region(I, '11710'));
check('신고 진행 중: 받은 건수와 예상 범위 그대로, 이번 달은 범위 없음',
  P.map(p => p.t), ['10월 계약: 지금까지 242건 신고 · 신고 진행 중(예상 245~252건)', '11월 계약: 지금까지 83건 신고 · 아직 달이 끝나지 않았거나 신고 기간이라 계속 늘어요']);

/* ② 같은 문장 */
const ref = T.refItem(I, '11710');
check('길잡이 참고 칸', [ref.k, ref.v], ['송파구 이번 주 시장 온도', '따뜻함']);
ok('길잡이 참고 칸에 이유 문장·기준 그대로', ref.s.indexOf(I.g['11710'].why) === 0 && ref.s.includes('2026.11.27 계산'), ref.s);
check('온도 없는 구는 참고 칸 없음', T.refItem(I, '11680'), null);
check('한 줄', T.line(I, '11710'), "송파구 시장 온도는 '따뜻함'이에요. 신고가가 평소보다 자주 나와요.");
check('그래프 점: 시작 연월부터 한 달씩, 온도·빌라 짝', T.chartRows({ n: ['202511', 10, 20, 30], l: ['202512', 2, 3], vn: ['202511', 1] }),
  [{ ym: '202511', n: 10, l: null, vn: 1 }, { ym: '202512', n: 20, l: 2, vn: null }, { ym: '202601', n: 30, l: 3, vn: null }]);
const bt = T.backtestText(I);
ok('성적 문장: 숫자 그대로 + 예측 아님을 밝힘', bt.includes('+1.1%') && bt.includes('+11.7%') && bt.includes('예측이 아니에요'), bt);

/* ③ 금지 말 */
const BAN = /사세요|파세요|매수 적기|매도 적기|지금 사야|추천 매수|투자 기회|저가 매수|사야 할 때/;
const RIVAL = /호갱노노|아실|직방|다방|네이버\s*부동산|부동산\s*지인|KB\s*부동산|리치고|밸류맵/;
const texts = [rd('assets/temp-core.js'), rd('assets/temp-view.js'), rd('temp/index.html'), T.MEANING.join(' '), T.SHORT.join(' '), bt];
ok('사라·팔라는 말 없음', !texts.some(t => BAN.test(t)), texts.map(t => (t.match(BAN) || [''])[0]).join('|'));
ok('경쟁 서비스 이름 없음', !texts.some(t => RIVAL.test(t)), '');
ok('화면 코드에 비공개 경계값 이름 없음(CUT·thr)', !/\bCUT\b|thresholds?/.test(rd('assets/temp-core.js') + rd('assets/temp-view.js')), '');

/* ④ 화면 연결·버전 */
const ver = f => { const m = rd(f).match(/temp-core\.js\?v=(\d+)/), n = rd(f).match(/temp-view\.js\?v=(\d+)/); return [m && m[1], n && n[1]]; };
const pages = ['temp/index.html', 'weekly/index.html', 'map/index.html', 'mine/index.html', 'rank/index.html'];
const V0 = ver('temp/index.html');
pages.forEach(f => check(`${f}: temp-core·temp-view 같은 버전`, ver(f), V0));
const sw = rd('sw.js');
ok('서비스 워커 목록에 같은 버전·temp/ 화면', sw.includes(`./assets/temp-core.js?v=${V0[0]}`) && sw.includes(`./assets/temp-view.js?v=${V0[1]}`) && sw.includes("'./temp/'"), '');
ok('지도 지역 분석: 고른 구에 한 줄 칸', /JDJ_TEMPV\.mini\(\$\('rpTemp'\), cur\.code/.test(rd('map/index.html')), '');
ok('내 집: 그 구 한 줄 칸', /JDJ_TEMPV\.mini\(\$\('tmpMine'\), d\.code/.test(rd('mine/index.html')), '');
ok('단지 순위: 시·도 한 줄 칸 + 구 이름 아래 단계', /JDJ_TEMPV\.mini\(\$\('tmpRank'\), S\.sd/.test(rd('rank/index.html')) && /tmpTxt\(x\.code\)/.test(rd('rank/index.html')), '');
ok('주간 동향: 전국·시·도 한눈에', /JDJ_TEMPV\.overview\(document\.getElementById\('tmpOv'\)\)/.test(rd('weekly/index.html')), '');
ok('모닝 브리핑 화면: 엔진 temp 칸 그리기', /function tempHtml\(S, M\)/.test(rd('brief/index.html')) && /\$\{tempHtml\(S, M\)\}/.test(rd('brief/index.html')), '');
const sc = JSON.parse(rd('assets/guide/scenarios.json')).sc.find(x => x.id === 'buy_when');
ok('고민 해결 길잡이: 매수 시기 고민이 시장 온도 자료를 받음', sc.need.includes('temp') && sc.kw.some(k => k[0] === '시장분위기'), sc.need);
ok('길잡이: 같은 함수(refItem)로 참고 칸', /JDJ_TEMP\.refItem\(j,/.test(rd('assets/guide.js')) && (rd('assets/guide-core.js').match(/ref\.unshift\(E\.tempRef\)/g) || []).length === 2, '');
check('단계 이름 5개(엔진 market_temp.LABELS·brief.TEMP_LABELS 와 같은 순서)', T.LABELS, ['얼어붙음', '쌀쌀함', '보통', '따뜻함', '뜨거움']);


/* 고민 해결 길잡이 계산(guide-core): 매수 시기 답의 참고 칸 맨 앞이 같은 함수(refItem) 결과 */
try {
  const G = require('../assets/guide-core.js'), SC = JSON.parse(rd('assets/guide/scenarios.json'));
  const E = { L: require('../assets/loan-core.js'), T: require('../tax/tax-engine.js'), H: require('../assets/hug-core.js'), CY: require('../chungyak/cy-engine.js'),
    ADJ: require('../tax/adjusted-areas.js'), RD: require('../assets/redev-core.js'), SALE: require('../assets/sale-status.js'), today: '2026-11-26', tempRef: T.refItem(I, '11710') };
  const r = G.solve(SC.sc.find(x => x.id === 'buy_when'), { region: { code: '11710', name: '송파구', short: '서울', sido: '서울특별시' }, cash: 50000, income: 9000, own: 'none' }, E);
  check('길잡이 매수 시기 답: 참고 칸 맨 앞 = 시장 온도(같은 값)', (r.ref || [])[0], T.refItem(I, '11710'));
} catch (e) { ok('길잡이 계산 불러오기', false, String(e).slice(0, 200)); }

/* 실제 자료(선택) */
const dir = process.argv[2];
if (dir && fs.existsSync(path.join(dir, 'index.json'))) {
  const R = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  const gs = Object.keys(R.g || {});
  ok(`실제 자료: 구 ${gs.length}곳 모두 시·도 id 있음`, gs.every(g => R.g[g].sid && R.sido[R.g[g].sid]), '');
  ok('실제 자료: 단계는 0~4 또는 없음', gs.every(g => R.g[g].l == null || [0, 1, 2, 3, 4].includes(R.g[g].l)), '');
  ok('실제 자료: 단계 있는 구는 이유 문장이 있음', gs.every(g => R.g[g].l == null || R.g[g].why), '');
  ok('실제 자료: 화면 문장 만들기 오류 없음', gs.every(g => { T.comps(R.g[g]); T.official(R, R.g[g]); T.pendList(R.g[g]); return true; }), '');
  const raw = fs.readFileSync(path.join(dir, 'index.json'), 'utf8');
  ok('실제 자료: 비공개 칸(경계값·지표 자리·곡선) 없음', !/"(cut|thr|rk|F|comps|weights?)":/.test(raw), '');
}

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log((r.ok ? 'OK   ' : 'FAIL ') + r.name + (r.ok ? '' : `\n     결과 ${JSON.stringify(r.got).slice(0, 400)}\n     기대 ${JSON.stringify(r.want)}`)));
console.log(`${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
