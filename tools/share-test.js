/* 공유 모듈 검증: node tools/share-test.js
   - 공유 링크에 개인값(연소득·현금·대출·이름·기타 비용·매수가·매수 시기)이 실리지 않는지
   - 요약 문장의 금액·'N점'을 거르는지
   - 결과 화면 8곳이 모두 같은 공용 모듈을 쓰는지, 통계 허용 목록에 공유 이벤트가 있는지 */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const SH = require('../assets/share.js');
let ok = 0, bad = 0;
function check(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) ok++; else { bad++; console.log('실패:', name, '\n  결과', g, '\n  기대', w); }
}

/* 링크 */
const u = new URL(SH.link('report', { params: { sd: '서울특별시', i: 7000, c: 40000, d: 1200, n: '홍길동', e: 500, bp: 95000, bd: '2020-01', utm_source: 'x' } }));
check('리포트 링크 경로', u.pathname, '/jangdaejang-calc/buy/');
check('개인값 없음', ['i', 'c', 'd', 'n', 'e', 'bp', 'bd'].filter(k => u.searchParams.has(k)), []);
check('공개 값은 남김', u.searchParams.get('sd'), '서울특별시');
check('유입 집계 utm', [u.searchParams.get('utm_source'), u.searchParams.get('utm_medium'), u.searchParams.get('utm_campaign')], ['share', 'user_share', 'report']);
check('세금 해시', new URL(SH.link('tax', { hash: 'cgt' })).hash, '#cgt');
check('9개 화면 이름', Object.keys(SH.TOOLS).sort(), ['ask', 'checklist', 'chungyak', 'jeonse', 'mine', 'report', 'switch', 'tax', 'villa']);
Object.entries(SH.TOOLS).forEach(([k, t]) => check(k + ' 중간 카드 문구', /쉬워지는 집예보$/.test(t.easy) && !!t.try && !!t.label, true));

/* 요약 문장 거르기 */
check('금액 문장 버림', ['연소득 7,000만원', '현금 4억', '대출 1억 2,000만 원', '내 가점 54점', '가점 54 점'].map(SH.safeLine), ['', '', '', '', '']);
check('개수·기간 문장은 남김', ['당첨 가능성 높은 단지 3곳', '보유 2년 뒤 전망', '전국 공고 12곳'].map(SH.safeLine), ['당첨 가능성 높은 단지 3곳', '보유 2년 뒤 전망', '전국 공고 12곳']);
const s = SH.safeSummary({ head: '내 가점 54점으로 3곳', lines: ['a', '현금 2억', 'b', 'c', 'd'] });
check('요약 머리 금지 숫자', s.head, '');
check('요약 최대 3줄', s.lines, ['a', 'b', 'c']);
check('이전 기능: 개인값 감지', [SH.hasPersonal('?i=7000&o=none'), SH.hasPersonal('?o=none&sd=all')], [true, false]);
check('이전 기능: 개인값 지우기', SH.stripPersonal('?i=1&c=2&sd=all'), '?sd=all');

/* 화면 연결 */
const pages = { chungyak: 'chungyak', report: 'buy/report', mine: 'mine', switch: 'switch', jeonse: 'jeonse', checklist: 'jeonse/checklist', tax: 'tax', villa: 'villa', ask: 'ask' };
Object.entries(pages).forEach(([tool, p]) => {
  const html = fs.readFileSync(path.join(root, p, 'index.html'), 'utf8');
  check(p + ' 공용 모듈', /assets\/share\.js\?v=\d+/.test(html), true);
  check(p + ' setup', new RegExp(`setup\\(\\{\\s*tool:\\s*'${tool}'`).test(html), true);
  check(p + ' update', /JDJ_SHARE\.update\(|SH\.update\(/.test(html), true);
  check(p + ' 예전 공유 단추 없음', /id="share(Cy|Sw|Mine|Btn)"|data-share>/.test(html), false);
});
/* 청약: 공유 문구에 내 가점 숫자를 쓰지 않음(LAST.sum·my 를 공유 함수에 넣지 않음) */
{
  const html = fs.readFileSync(path.join(root, 'chungyak', 'index.html'), 'utf8');
  const fn = html.slice(html.indexOf('function shareCy()'), html.indexOf('\n}', html.indexOf('function shareCy()')));
  check('청약 공유에 가점 숫자 없음', /LAST\.sum|\bmy\b|A\.birth/.test(fn), false);
  check('청약 첫 화면 강점 문구', /당첨 가능성 높은 단지/.test(html) && /예상 당첨 커트라인/.test(html), true);
  check('보장 표현 없음', /무조건|100% 당첨|당첨 보장|확실히 당첨/.test(html), false);
}
/* 통계 */
const stat = fs.readFileSync(path.join(root, 'assets', 'stat.js'), 'utf8');
check('통계 이벤트', /share_click:\d+/.test(stat) && /share_visit:\d+/.test(stat), true);
check('통계 위치·방법', /\['top','mid','bottom'\]/.test(stat) && /'image'/.test(stat), true);
check('공유 유입 감지', /utm_source'\) === 'share'/.test(stat), true);
/* 캐시 */
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const sv = (fs.readFileSync(path.join(root, 'chungyak', 'index.html'), 'utf8').match(/share\.js\?v=(\d+)/) || [])[1];
check('서비스 워커에 같은 버전', sw.includes(`/assets/share.js?v=${sv}'`), true);

console.log(`공유 모듈 검증: ${ok}/${ok + bad} 통과`);
if (bad) process.exit(1);
