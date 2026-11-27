/* 상담 신청서(구글 설문지) 주소에 금액·개인 금융값이 실리지 않는지 자동 검증 — 실행: node tools/consult-privacy-test.js
   - assets/consult-sheet.js: 주소 만들기(url)는 금액 모양 글자를 지우고, 예전 연소득·보유 현금 칸(entry.146176170·entry.1872979900)은 채우지 않음
   - 사이트 전체(손으로 만든 화면·공용 js): 설문지 칸(entry.*)에 금액 함수(fmtW·fmt·won·krw…)를 넣는 곳이 없음
   - 상담 버튼이 있는 화면은 '내 조건 요약' 창(consult-sheet.js)을 불러오고, sw.js 미리 저장 목록에도 있음
   - 내 집 마련 계산기 → 대출 한도 화면 링크에 최대 매수 금액(p)을 싣지 않음(이 탭 sessionStorage 로만)
   - 예외(승인됨): 길잡이 → 검색 화면 넘김은 주소 # 뒤·sessionStorage 로만(주소 ?query 아님) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const rows = [];
function check(name, got, want) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want }); }

/* 1) 공용 모듈 */
const C = require('../assets/consult-sheet.js');
const u1 = C.url({ kind: '1주택 갈아타기', region: '서울 강남구', memo: '[갈아타기] 최대 12억 3,000만 원 (대출 4억, 고정 4.2%·30년) 연소득 7,000만원 | 유입: 직접 · 3번째 방문' });
check('url: 금액 모양이 주소에 남지 않음', C.leak(u1), '');
check('url: 상담 종류·지역·출처는 남음', /entry\.1054811896=/.test(u1) && /entry\.397234060=/.test(u1) && decodeURIComponent(u1).includes('3번째 방문'), true);
check('url: 예전 연소득 칸 없음', /entry\.146176170|entry\.1872979900/.test(u1), false);
check('leak: 연소득 칸이 있으면 잡아냄', !!C.leak(C.FORM + '?usp=pp_url&entry.146176170=x'), true);
check('leak: 금액이 있으면 잡아냄', !!C.leak(C.FORM + '?entry.658364183=' + encodeURIComponent('최대 3억 2,000만 원')), true);
check('leak: 퍼센트(금리)도 잡아냄', !!C.leak(C.FORM + '?entry.658364183=' + encodeURIComponent('고정 4.2%')), true);
check('scrub: 지번·방문 횟수 같은 숫자는 그대로', C.scrub('역삼동 123-4 · 3번째 방문 · 1주택'), '역삼동 123-4 · 3번째 방문 · 1주택');
check('summary: 요약 머리말 + 빈 줄 빼기', C.summary(['연소득: 7,000만 원', '', '보유 현금: 4억 원']), '[집예보 · 내 조건 요약]\n연소득: 7,000만 원\n보유 현금: 4억 원');

/* 2) 사이트 전체 정적 검사 */
const SKIP = /^(data|tools|node_modules|\.git|assets\/leaflet|sitemaps)(\/|$)/;
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const r = d ? d + '/' + e.name : e.name;
    if (SKIP.test(r)) continue;
    if (e.isDirectory()) walk(r);
    else if (/\.(html|js)$/.test(e.name)) files.push(r);
  }
})('');
const AMT_FN = /\b(fmtW|fmtS|fmt|won|krw|comma|toLocaleString)\s*\(/;
const bad = [];
for (const f of files) {
  if (f === 'assets/consult-sheet.js') continue;
  const s = rd(f);
  if (!/docs\.google\.com\/forms|entry\.\d{6,}/.test(s)) continue;
  s.split('\n').forEach((ln, i) => {
    if (/entry\.146176170|entry\.1872979900/.test(ln)) bad.push(f + ':' + (i + 1) + ' 연소득·현금 칸');
    else if (/['"]entry\.\d{6,}['"]\s*,/.test(ln) && AMT_FN.test(ln)) bad.push(f + ':' + (i + 1) + ' 설문지 칸에 금액');
  });
}
check('사이트 전체: 설문지 주소에 금액·연소득·현금 넣는 곳 없음', bad, []);

/* 3) 상담 버튼 화면: 요약 창 연결 */
const sheetPages = ['buy/index.html', 'buy/report/index.html', 'switch/index.html', 'mine/index.html', 'tax/index.html', 'tax/transfer/index.html'];
for (const f of sheetPages) check(f + ': consult-sheet.js 불러옴', /assets\/consult-sheet\.js\?v=1"/.test(rd(f)), true);
for (const f of ['buy/index.html', 'buy/report/index.html', 'switch/index.html'])
  check(f + ': 상담 버튼은 data-consult + JDJ_CONSULT.url', /data-consult=/.test(rd(f)) && /JDJ_CONSULT\.url\(/.test(rd(f)), true);
check('tax-box: 금액 체크박스 없앰 + 요약 창', !/data-txc-amt/.test(rd('assets/tax-box.js')) && /JDJ_CONSULT\.bind/.test(rd('assets/tax-box.js')), true);
check('tax-trust: 화면 결과 금액은 요약 창으로', /JDJ_CONSULT\.bind/.test(rd('tax/tax-trust.js')) && !/memo[^\n]*big\.textContent/.test(rd('tax/tax-trust.js')), true);
check('sw.js 미리 저장 목록에 consult-sheet.js?v=1', rd('sw.js').indexOf("'./assets/consult-sheet.js?v=1'") > 0, true);

/* 4) 대출 한도 화면으로 넘길 때 최대 매수 금액 */
const buy = rd('buy/index.html'), loan = rd('loan/index.html');
check('buy → loan 링크에 p(금액) 없음', /lq\.set\('p'/.test(buy), false);
check('buy → loan: sessionStorage jdj_buyp 로 넘김', /sessionStorage\.setItem\('jdj_buyp'/.test(buy) && /sessionStorage\.getItem\('jdj_buyp'\)/.test(loan), true);

/* 5) 승인된 예외는 그대로: 길잡이 넘김은 sessionStorage(jdj_gfin) */
check('예외 유지: 길잡이 → 리포트 sessionStorage jdj_gfin', /sessionStorage\.getItem\('jdj_gfin'\)/.test(rd('buy/report/index.html')), true);

const fails = rows.filter(r => !r.ok);
fails.forEach(r => console.log('실패:', r.name, '| 결과', JSON.stringify(r.got), '| 기대', JSON.stringify(r.want)));
console.log(`consult-privacy 테스트 ${rows.length - fails.length}/${rows.length} 통과`);
process.exit(fails.length ? 1 : 0);
