/* 단지 검색 전국 시험 — 모든 K-apt 단지와 모든 실거래 단지가 검색으로 찾아지는지 센다.
   실행: node tools/search-coverage.js <시험 입력 cases.json> <공개 자료 data 폴더> [mine-core.js 경로] [--fail 실패목록.json] </dev/null
     cases.json: 엔진 `python scripts/aliases.py cases <data> cases.json` 결과 — K-apt 단지마다 {kc, sd, nm, dong, molit:[실거래 이름], disp:[표시 단지 키], why}
       disp = 시세 목록(price/sNN.json)에 있는 표시 단지 중 그 K-apt 단지와 이어진 것(시군구·법정동·지번 먼저, 그다음 이름)
       why  = disp 가 비었을 때 까닭: old 예전 거래만 / rent 임대로 보임 / none 실거래 이름을 찾지 못함
   검사(한 단지가 세 가지 모두 통과해야 '찾아짐'):
     ① K-apt 공식 이름으로  ② 실거래(국토부) 이름으로  ③ 사람들이 흔히 치는 꼴(아래 variant)로
   실거래 단지(시세 목록의 모든 단지)도 ② 표시 이름 ③ 흔히 치는 꼴 두 가지로 따로 센다.
   검색 결과 20위 안에 그 단지가 있으면 찾은 것으로 본다(검색 화면은 12~20개를 보여 줌). */
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const failOut = args.includes('--fail') ? args[args.indexOf('--fail') + 1] : null;
const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--fail');
const [CASES, DATA, CORE] = pos;
if (!CASES || !DATA) { console.log('사용법: node tools/search-coverage.js cases.json data폴더 [mine-core.js] [--fail 실패.json]'); process.exit(1); }
const M = require(path.resolve(CORE || path.join(__dirname, '..', 'assets', 'mine-core.js')));
const cases = JSON.parse(fs.readFileSync(CASES, 'utf8')).cases;
const LIMIT = 20;

/** 사람들이 흔히 치는 꼴: '아파트' 빼기, e편한세상↔이편한세상, 차수는 띄어서 맨 뒤로('청담2차e편한세상' → '청담 이편한세상 2차'),
    시공사 앞말 넣고 빼기(힐스테이트↔현대힐스테이트, 푸르지오↔대우푸르지오, 래미안↔삼성래미안, 자이↔GS자이, 아이파크↔현대아이파크, 더샵↔포스코더샵),
    동 이름으로 시작하면 동 이름 뒤에 띄어쓰기 */
const MAKER = [['힐스테이트', '현대힐스테이트'], ['푸르지오', '대우푸르지오'], ['래미안', '삼성래미안'], ['자이', 'GS자이'], ['아이파크', '현대아이파크'],
  ['더샵', '포스코더샵'], ['꿈에그린', '한화꿈에그린'], ['센트레빌', '동부센트레빌'], ['e편한세상', '대림e편한세상'], ['SK뷰', 'SK VIEW']];
function variant(nm, dong) {
  let v = String(nm || '').replace(/\s*\([^()]*\)\s*$/, '').replace(/아파트$/, '').trim();
  if (/e\s*-?\s*편한세상/i.test(v)) v = v.replace(/e\s*-?\s*편한세상/i, '이편한세상');
  else if (/이\s*-?\s*편한세상/.test(v)) v = v.replace(/이\s*-?\s*편한세상/, ' e편한세상 ');
  else {
    for (const [a, b] of MAKER) {
      if (v.indexOf(b) >= 0) { v = v.replace(b, ' ' + a + ' '); break; }
      if (v.indexOf(a) >= 0) { v = v.replace(a, ' ' + b + ' '); break; }
    }
  }
  const m = v.match(/^(.*?)(\d+)\s*(차|단지)(.*)$/);
  if (m && m[4].trim()) v = `${m[1]} ${m[4].trim()} ${m[2]}${m[3]}`;
  const st = String(dong || '').split(/\s+/).pop().replace(/(\d+가)?(동|읍|면|리)$/, '');
  if (st.length >= 2 && v.replace(/\s/g, '').indexOf(st) === 0 && v.indexOf(st + ' ') !== 0) v = st + ' ' + v.replace(/\s/g, '').slice(st.length);
  return v.replace(/\s+/g, ' ').trim();
}

const G = {}, IX = {};
function groups(sd) {
  if (G[sd]) return G[sd];
  const f = path.join(DATA, 'price', sd + '.json');
  const L = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).units.map(M.listRow) : [];
  G[sd] = M.groupDanji(L);
  // 속도용 거르개(결과는 같음): 검색어 글자(숫자 빼고)가 이름·별칭·동 이름 글자에 모두 있어야 맞을 수 있다 → 그런 단지만 실제 검색 함수에 넣는다
  const post = new Map();
  for (const d of G[sd].values()) {
    const cs = new Set();
    for (const t of [d.apt, d.dong].concat(d.al || [])) for (const f of [M.normName, M.normLight].filter(Boolean)) for (const ch of f(t)) cs.add(ch);
    for (const ch of cs) { let a = post.get(ch); if (!a) post.set(ch, a = []); a.push(d); }
    d._cs = cs;
  }
  IX[sd] = post;
  return G[sd];
}
function search(sd, q) {
  const g = groups(sd), qc = [...new Set(M.normName(q, true).replace(/[\d-]/g, ''))];
  if (!qc.length) return M.searchDanji(g, q, LIMIT);
  let best = null;
  for (const ch of qc) { const a = IX[sd].get(ch) || []; if (!best || a.length < best.length) best = a; }
  const sub = new Map();
  for (const d of best) if (qc.every(ch => d._cs.has(ch))) sub.set(d.key, d);
  return M.searchDanji(sub, q, LIMIT);
}
const found = (sd, q, keys) => { if (!q) return false; return search(sd, q).some(d => keys.includes(d.key)); };

const T = { all: 0, ok: 0, byK: 0, byM: 0, byV: 0, linked: 0, linkedOk: 0, why: {} };
const fails = [];
for (const c of cases) {
  T.all++;
  if (!c.disp.length) { T.why[c.why || 'none'] = (T.why[c.why || 'none'] || 0) + 1; fails.push({ kc: c.kc, nm: c.nm, dong: c.dong, why: c.why || 'none' }); continue; }
  T.linked++;
  const k = found(c.sd, c.nm, c.disp), m = found(c.sd, c.molit[0], c.disp), v = found(c.sd, variant(c.nm, c.dong), c.disp);
  if (k) T.byK++; if (m) T.byM++; if (v) T.byV++;
  if (k && m && v) { T.ok++; T.linkedOk++; }
  else { const why = 'search'; T.why[why] = (T.why[why] || 0) + 1; fails.push({ kc: c.kc, nm: c.nm, dong: c.dong, molit: c.molit[0], variant: variant(c.nm, c.dong), k, m, v, why }); }
}
// 실거래 단지(시세 목록 전부)
const U = { all: 0, byM: 0, byV: 0, ok: 0 };
const ufails = [];
const sds = [...new Set(cases.map(c => c.sd))].sort();
for (const sd of sds) {
  for (const d of groups(sd).values()) {
    U.all++;
    const m = found(sd, d.apt, [d.key]), v = found(sd, variant(d.apt, d.dong), [d.key]);
    if (m) U.byM++; if (v) U.byV++;
    if (m && v) U.ok++; else if (ufails.length < 3000) ufails.push({ key: d.key, variant: variant(d.apt, d.dong), m, v });
  }
}
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '-';
console.log(`K-apt 단지 ${T.all.toLocaleString()}곳: 세 가지 모두 찾아짐 ${T.ok.toLocaleString()}곳 (${pct(T.ok, T.all)})`);
console.log(`  최근 3년 시세 목록과 이어진 ${T.linked.toLocaleString()}곳 중 ${pct(T.linkedOk, T.linked)} — K-apt 이름 ${pct(T.byK, T.linked)}, 실거래 이름 ${pct(T.byM, T.linked)}, 흔한 꼴 ${pct(T.byV, T.linked)}`);
console.log(`  못 찾는 까닭: ${Object.entries(T.why).map(([k, v]) => `${{ old: '최근 3년 매매 없음', rent: '임대 단지', none: '실거래 이름과 이어지지 않음', search: '검색 규칙' }[k] || k} ${v.toLocaleString()}`).join(' · ')}`);
console.log(`실거래 단지 ${U.all.toLocaleString()}곳: 이름·흔한 꼴 모두 ${pct(U.ok, U.all)} — 이름 ${pct(U.byM, U.all)}, 흔한 꼴 ${pct(U.byV, U.all)}`);
if (failOut) fs.writeFileSync(failOut, JSON.stringify({ T, U, fails, ufails }, null, 1));
if (module.parent == null && process.env.COVERAGE_MIN && T.linkedOk / T.linked * 100 < +process.env.COVERAGE_MIN) process.exit(2);
module.exports = { variant };
