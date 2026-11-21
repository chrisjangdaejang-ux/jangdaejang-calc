/* 주간 실거래 동향 보관 주소 /weekly/YYYY-WW/ 만들기 — 실행: node tools/weekly-pages.js </dev/null
   GitHub Pages 는 고정 파일만 열 수 있어, weekly/index.html 을 주마다 복사해 둔다(화면은 주소에서 주를 읽음).
   화면 경로는 상대 경로라(예전 주소·새 도메인 모두 동작) 한 칸 더 깊은 복사본에서는 '../' 를 '../../' 로 바꿔 넣는다(copyOf).
   weekly/index.html 을 고치면 이 스크립트를 다시 돌려 주세요(tools/weekly-test.js 가 복사본이 같은지·앞으로 남은 주가 충분한지 확인). */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', 'weekly');
const FIRST = '2026-34', LAST = process.env.WEEKLY_LAST || '2027-52';
function weeks(a, b) {
  const out = [];
  const mon = w => { const y = +w.slice(0, 4), n = +w.slice(5), j4 = new Date(Date.UTC(y, 0, 4)), d = (j4.getUTCDay() + 6) % 7;
    return new Date(Date.UTC(y, 0, 4 - d + (n - 1) * 7)); };
  const id = d => { const t = new Date(d); t.setUTCDate(t.getUTCDate() + 3); const y = t.getUTCFullYear(), j4 = new Date(Date.UTC(y, 0, 4));
    const n = 1 + Math.round(((t - j4) / 86400000 - 3 + ((j4.getUTCDay() + 6) % 7)) / 7); return `${y}-${String(n).padStart(2, '0')}`; };
  for (let d = mon(a); id(d) <= b; d = new Date(+d + 7 * 86400000)) out.push(id(d));
  return out;
}
/** weekly/index.html → weekly/YYYY-WW/index.html (속성 안의 상대 경로만 한 칸 더 위로) */
function copyOf(html) { return String(html).replace(/(\b(?:src|href|action|poster|data-[\w-]+)=)(["'])\.\.\//g, '$1$2../../'); }
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ws = weeks(FIRST, LAST);
if (require.main === module) {
  const out = copyOf(src);
  ws.forEach(w => { fs.mkdirSync(path.join(ROOT, w), { recursive: true }); fs.writeFileSync(path.join(ROOT, w, 'index.html'), out); });
  console.log(`weekly/${ws[0]}/ ~ weekly/${ws[ws.length - 1]}/ ${ws.length}개`);
}
module.exports = { weeks, copyOf, FIRST, LAST };
