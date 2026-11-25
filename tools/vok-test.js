/* 보유 기간 판정(VOK) 자동 점검 — 실행: node tools/vok-test.js </dev/null
   대표 기준(2026-11-20): 과거에 그대로 써 본 횟수 2번 이상 · 점수 상위 20% 평균 초과 상승이 + · 절반 이상 맞음 → 결론에 씀, 아니면 '참고'(흐린 글씨).
   엔진 build_site._vok · features.reg_pass 와 같은 규칙인지, 화면 여러 곳에 복사된 판정이 모두 같은 글자·같은 결과인지,
   성적이 없는 기간(과거 자료가 더 필요한 7년 등)이 '참고로만'으로 흐리게 나오는지 확인해요. 매일 자동 점검(ci.js → 09:07 보고)에 함께 돌아요. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : `\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`)); };

/* 엔진 규칙(build_site._vok) 그대로 옮긴 것 */
const ENGINE = m => { const O = (m || {}).oos_all || []; const hit = m && m.oos_hit != null ? m.oos_hit : O.filter(o => (o.top20 || 0) > 0).length;
  return !!(O.length >= 2 && ((m || {}).oos_avg || 0) > 0 && 2 * hit >= O.length); };
const run = (n, hit, avg) => ({ oos_all: Array.from({ length: n }, (_, i) => ({ t0: String(201010 + i * 100), top20: i < hit ? 1 : -1 })), oos_hit: hit, oos_avg: avg });
const CASES = [['3번 중 3번·평균 +(5년, 누수 고친 뒤)', run(3, 3, 2.1), true], ['4번 중 2번(딱 절반)·평균 +', run(4, 2, 0.5), true],
  ['8번 중 2번(절반 미만)·평균 +', run(8, 2, 0.25), false], ['4번 중 4번·평균 −', run(4, 4, -0.1), false], ['1번뿐', run(1, 1, 4.9), false],
  ['성적 없음(과거 자료가 더 필요 — 7년)', { oos_all: [], oos_hit: 0, oos_avg: null }, false], ['모델 자체가 없음', undefined, false], ['5번 중 2번·평균 +', run(5, 2, 0.8), false]];

/* 화면에 복사된 VOK 정의 — 모두 같은 글자여야 함 */
const SRC = ['assets/plain-words.js', 'assets/strength.js', 'assets/narrative.js', 'about/index.html', 'buy/report/index.html'];
const defs = SRC.map(f => { const t = fs.readFileSync(path.join(ROOT, f), 'utf8'); const m = t.match(/const VOK\s*=\s*(m\s*=>[^\n;]*\);?)/); return [f, m ? m[1].replace(/\s+/g, '').replace(/;$/, '') : null]; });
check('VOK 정의가 다섯 곳 모두 있음', defs.filter(d => !d[1]).map(d => d[0]), []);
check('VOK 정의가 모두 같은 글자', [...new Set(defs.map(d => d[1]))].length, 1);
const VOK = eval('(' + defs[0][1] + ')');
check('VOK 에 "절반 이상 맞음" 조건이 있음', /2\*\(/.test(defs[0][1]) && />=\(m\.oos_all\|\|\[\]\)\.length/.test(defs[0][1]), true);
for (const [nm, m, want] of CASES) check(`판정 ${nm}: 엔진과 같음(${want ? '씀' : '참고'})`, [VOK(m), ENGINE(m)], [want, want]);

/* 같은 규칙을 따로 쓰는 곳: 순위(rank-core vcheck)·갈아타기(switch-core validity) */
const RK = require('../assets/rank-core.js'), SW = require('../switch/switch-core.js'), PL = (require('../assets/plain-words.js'), globalThis.JDJ_PLAIN);
for (const [nm, m, want] of CASES.filter(c => c[1] && c[1].oos_all.length)) {
  check(`순위 화면 판정 ${nm}`, !!(RK.vcheck && RK.vcheck({ 2: m }, null) || {}).ok, want);
  check(`갈아타기 판정 ${nm}`, !!((SW.validity({ 5: m }, null) || {})[5] || {}).ok, want);
}
check('짧은 표기: 성적 없는 기간은 "참고만"', PL.hzLabel({ oos_all: [], oos_hit: 0, oos_avg: null }), '아직 써 본 적 없음 · 참고만');
check('짧은 표기: 모델이 없어도 "참고만"(멈추지 않음)', PL.hzLabel(undefined), '아직 써 본 적 없음 · 참고만');
check('짧은 표기: 5년 3번 중 3번', PL.hzLabel(run(3, 3, 2.1)), '과거 3번 중 3번 맞음');

/* 단지 문장(narrative): 7년 성적이 없으면 7년은 '참고로만 보여 드리는 기간'(흐린 글씨 nar-dim)으로, 결론 문장에는 안 씀 */
const NAR = require('../assets/narrative.js');
const nsrc = fs.readFileSync(path.join(ROOT, 'assets', 'narrative.js'), 'utf8');
check('단지 문장: 성적이 없는 기간도 참고(흐림)로 — 모델 유무와 상관없이', /out\.dim = \[1, 2, 3, 5, 7\]\.filter\(h => \(h === 2 \? f\.fv : fh\[h\]\) != null && !VR\(MV\(h\)\)\)/.test(nsrc), true);
check('흐린 글씨 칸 모양(nar-dim)', /\.nar-dim\{[^}]*color:#9A9A9A/.test(nsrc), true);
check('narrative 불러오기', typeof NAR.build, 'function');
/* 프리미엄 리포트 표: 기준 미달·성적 없는 기간 줄은 jp-ref(흐린 글씨) + '참고만' */
const PR = fs.readFileSync(path.join(ROOT, 'assets', 'premium-report.js'), 'utf8');
check('프리미엄 리포트: 기준 미달 줄은 흐린 글씨(jp-ref)', /class="jp-ref"/.test(PR) && /const ok = PL\.VOK\(mm\)/.test(PR), true);
const AB = fs.readFileSync(path.join(ROOT, 'about', 'index.html'), 'utf8');
check('서비스 소개 성적표: 참고 칸 이름이 실제 까닭과 맞음(횟수 적음·맞은 횟수 적음·평균으로는 덜 오름)', /'써 본 횟수 적음' : 2 \* hit < n \? '맞은 횟수 적음' : '평균으로는 덜 오름'/.test(AB), true);

console.log(`보유 기간 판정 점검: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
