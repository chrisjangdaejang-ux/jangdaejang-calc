/* 맞춤 리포트 돈 계산 로그인 없이 보기(대표 승인 2026-11-27) — 실행: node tools/report-open-test.js </dev/null
   ① buy/report: 대출·필요 현금·월 상환 상세에 로그인 잠금 없음, 금액은 통계·주소로 안 나감
   ② buy/ '매수 총비용 한 장': 로그인과 무관, 통계에 금액 없음
   ③ 무료 로그인 잠금은 실거래 '더보기'에만, 문구 '무료 로그인하면 전부 볼 수 있어요. 결제는 필요 없어요'
   ④ 로그인·약관 안내 문구가 바뀐 기준과 맞음 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let ok = 0, bad = 0;
const check = (m, c, x) => { if (c) ok++; else { bad++; console.log('실패:', m, x !== undefined ? JSON.stringify(x) : ''); } };

const br = read('buy/report/index.html'), buy = read('buy/index.html'), bt = read('assets/buy-total.js'), ps = read('assets/price-sheet.js');
const MONEY = /\b(loan|need|mon|cash|income|debt|nd)\b\s*:/;

/* ① */
check('리포트: 상세 잠금 함수·클래스 없음', !/repLocked|jdj-locked|cgate|report_detail/.test(br));
check('리포트: 상세 칸에 로그인 안내 없음', !/JDJ_AUTH\.gate\(/.test(br));
check('리포트: 상세 칸에 대출·필요 현금·월 상환', /<div class="cmore" id="pm\$\{i\}" hidden>[\s\S]*?대출[\s\S]*?필요 현금[\s\S]*?월 상환/.test(br));
check('리포트: 자세한 리포트 단추가 바로 펼침', /data-more[\s\S]{0,120}m\.hidden=!m\.hidden/.test(br));
const tracks = (s) => (s.match(/(?:JDJ\.track|jdjStat)\([^)]*\)/g) || []);
check('리포트: 통계에 금액 없음', tracks(br).every(t => !MONEY.test(t)), tracks(br).filter(t => MONEY.test(t)));
check('리포트: 저장 스냅숏은 개인 금융값을 뺀 주소만', /JDJ_SHARE\.stripPersonal\(location\.search\)/.test(br));
check('리포트: 리포트 저장만 로그인', /JDJ_AUTH\.login\('report_save'\)/.test(br));

/* ② */
check('총비용 한 장: 로그인과 무관', !/JDJ_AUTH|auth\(/.test(bt));
check('총비용 한 장: 통계·주소에 금액 안 실음', !/JDJ\.track|jdjStat|location\.|history\.|localStorage|sessionStorage|fetch\(/.test(bt));
check('buy: 통계에 금액 없음', tracks(buy).every(t => !MONEY.test(t)), tracks(buy).filter(t => MONEY.test(t)));
check('buy: 리포트 주소에 연소득·현금·대출 없음', /const q=new URLSearchParams\(\{o:own,t:rtype,rt:c\.rate,tm:c\.term,r:\$\('region'\)\.value\}\)/.test(buy) && !/q\.set\('(i|c|d)'/.test(buy.slice(buy.indexOf('function updateReport'), buy.indexOf('function statBuy'))));

/* ③ */
const gates = [];
for (const f of ['buy/report/index.html', 'buy/index.html', 'assets/buy-total.js', 'assets/loan-core.js', 'assets/closing-core.js', 'loan/index.html', 'loan/checklist/index.html', 'mine/index.html', 'my/report/index.html']) {
  if (fs.existsSync(path.join(ROOT, f)) && /\.gate\(/.test(read(f))) gates.push(f);
}
check('돈 계산 화면에 로그인 잠금 없음', gates.length === 0, gates);
check('실거래 더보기 잠금 문구', /무료 로그인하면 전부 볼 수 있어요<\/b>\. 결제는 필요 없어요\./.test(ps) && /카카오 간편 로그인\(무료\)하고 전부 보기/.test(ps));

/* ④ */
const lg = read('login/index.html'), tm = read('terms/index.html');
check('로그인 안내: 상세 보기 혜택 문구 없음', !/리포트 상세|대출·필요 현금·월 상환과 추천 이유 전체/.test(lg));
check('로그인 안내: 로그인 없이 리포트 전체(대출 포함)', /맞춤 분석 리포트 전체\(대출·필요 현금·월 상환 포함\)/.test(lg));
check('약관: 리포트 상세 보기를 회원 기능으로 적지 않음', !/맞춤 리포트 상세 보기/.test(tm));

console.log(`리포트 돈 계산 공개 검증: ${ok}개 통과, ${bad}개 실패`);
if (bad) process.exitCode = 1;
