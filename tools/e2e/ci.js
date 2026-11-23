/* 매일·푸시 뒤 자동 점검(정기 실행 jangdaejang-timing .github/workflows/site_qa.yml 이 부름)
   ① tools/*-test.js 계산·문구 검사 전부  ② tools/e2e/run.js 화면 여정 점검(휴대폰·PC)
   결과를 자료 원천 상태 한 줄(data/source_status 형식)로 씀 → 감시(watchdog)가 모아 대표 09:07 보고 줄에 실패만 보여 줌
   실행: node tools/e2e/ci.js <상태 파일 경로> </dev/null */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const OUTF = process.argv[2] || path.join(__dirname, 'out', 'site_qa.json');
const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16);
const sha = (() => { try { return cp.execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD']).toString().trim(); } catch (e) { return ''; } })();

/* ① 계산·문구 검사 */
const unitFails = [];
const tests = fs.readdirSync(path.join(ROOT, 'tools')).filter(f => /-test\.js$/.test(f)).sort();
for (const f of tests) {
  const r = cp.spawnSync(process.execPath, [path.join('tools', f)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], timeout: 300e3, encoding: 'utf8' });
  if (r.status !== 0) {
    const last = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').filter(Boolean);
    unitFails.push(`${f}: ${(last.find(l => /FAIL|실패|틀림/.test(l)) || last[last.length - 1] || '멈춤').trim().slice(0, 140)}`);
  }
  console.log((r.status === 0 ? 'ok   ' : 'FAIL ') + f);
}

/* ② 화면 여정 점검 */
const e2e = cp.spawnSync(process.execPath, [path.join(__dirname, 'run.js')], { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'], timeout: 40 * 60e3 });
let res = null;
try { res = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'result.json'), 'utf8')); } catch (e) {}
const e2eFails = res ? res.fails : ['화면 점검이 끝까지 돌지 못함(종료 코드 ' + e2e.status + ')'];

const bad = unitFails.length + e2eFails.length;
const parts = [];
if (unitFails.length) parts.push(`계산·문구 검사 ${tests.length}개 중 ${unitFails.length}개 실패(${unitFails.slice(0, 2).join(' / ')})`);
if (e2eFails.length) parts.push(`화면 점검 ${e2eFails.length}건(${e2eFails.slice(0, 3).join(' / ')})`);
const out = {
  k: 'site_qa', label: '사이트 화면 자동 점검(휴대폰·PC 여정)', status: bad ? 'failed' : 'ok',
  reason: bad ? parts.join(' · ').slice(0, 600) : '', at: kst(), every_h: 24, sha: sha.slice(0, 12),
  unit: { n: tests.length, fail: unitFails }, e2e: res ? { pass: res.pass, fail: res.fail, seconds: res.seconds } : null,
  fails: e2eFails.slice(0, 40)
};
if (!bad) out.last_ok = out.at;
else { try { const prev = JSON.parse(fs.readFileSync(OUTF, 'utf8')); if (prev.last_ok) out.last_ok = prev.last_ok; } catch (e) {} }
fs.mkdirSync(path.dirname(OUTF), { recursive: true });
fs.writeFileSync(OUTF, JSON.stringify(out) + '\n');
console.log(bad ? '자동 점검: 문제 ' + bad + '건 — ' + out.reason : '자동 점검: 모두 통과');
process.exit(bad ? 1 : 0);
