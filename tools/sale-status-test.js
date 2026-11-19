/* 분양·청약 공고 상태 공용 판정 검증 — 실행: node tools/sale-status-test.js */
const S = require('../assets/sale-status.js');
const fs = require('fs'), path = require('path');
const rows = [];
const check = (name, got, want) => rows.push({ ok: got === want, name, got, want });
// 고덕강일 3단지: 접수 10.26~11.06, 발표 11.26, 입주 2027.05
const g = { rc: ['20261026', '20261106'], sp: ['', ''], pw: '20261126', mv: '202705' };
check('접수 전 → 분양예정', S.status(g, '20261020'), 'pre');
check('접수 중 → 청약중', S.status(g, '2026-11-01'), 'on');
check('접수 마지막 날 → 청약중', S.status(g, '20261106'), 'on');
check('접수 끝~발표 → 발표 대기 (11.19)', S.status(g, '20261119'), 'wait');
check('발표 후 → 입주예정', S.status(g, '20261201'), 'mv');
check('특별공급이 먼저 시작', S.status({ sp: ['20261110', '20261111'], rc: ['20261112', '20261113'], pw: '20261120' }, '20261110'), 'on');
check('일정 없는 행은 원래 상태', S.status({ st: 'plan' }, '20261119'), 'plan');
check('발표·입주 정보 없이 지난 공고 → 마감', S.status({ rc: ['20261001', '20261002'] }, '20261119'), 'done');
check('발표 대기는 살아 있는 공고', S.isLive(g, '20261119'), true);
check('발표 후는 지난 공고', S.isLive(g, '20261201'), false);
check('라벨: 발표 대기', S.LABEL.wait, '발표 대기');
for (const f of ['bunyang/index.html', 'chungyak/index.html']) {
  const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  check(f + ' 공용 함수 사용', /JDJ_SALE\.status/.test(src) && /sale-status\.js/.test(src), true);
}
let pass = 0;
rows.forEach(r => { if (r.ok) pass++; console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ` got ${r.got} want ${r.want}`)); });
console.log('\n' + pass + '/' + rows.length + ' 통과');
if (pass !== rows.length) process.exit(1);
