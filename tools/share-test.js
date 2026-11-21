/* 공유 모듈 검증: node tools/share-test.js
   - 공유 링크에 개인값(연소득·현금·대출·이름·기타 비용·매수가·매수 시기)이 실리지 않는지
   - 요약 문장의 금액·'N점'을 거르는지
   - 결과 화면 8곳이 모두 같은 공용 모듈을 쓰는지, 통계 허용 목록에 공유 이벤트가 있는지
   - 가족과 자세히 공유(v4): 내 입력값은 # 뒤(#jv=)에만, ? 뒤에는 utm·공개 값만 / 받는 쪽은 GA 전에 # 을 지움 / 6개 화면 연결 */
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
check('10개 화면 이름', Object.keys(SH.TOOLS).sort(), ['ask', 'checklist', 'chungyak', 'jeonse', 'mine', 'rank', 'report', 'switch', 'tax', 'villa']);
Object.entries(SH.TOOLS).forEach(([k, t]) => check(k + ' 중간 카드 문구', /쉬워지는 집코드$/.test(t.easy) && !!t.try && !!t.label, true));

/* 요약 문장 거르기 */
check('금액 문장 버림', ['연소득 7,000만원', '현금 4억', '대출 1억 2,000만 원', '내 가점 54점', '가점 54 점'].map(SH.safeLine), ['', '', '', '', '']);
check('개수·기간 문장은 남김', ['당첨 가능성 높은 단지 3곳', '보유 2년 뒤 전망', '전국 공고 12곳'].map(SH.safeLine), ['당첨 가능성 높은 단지 3곳', '보유 2년 뒤 전망', '전국 공고 12곳']);
const s = SH.safeSummary({ head: '내 가점 54점으로 3곳', lines: ['a', '현금 2억', 'b', 'c', 'd'] });
check('요약 머리 금지 숫자', s.head, '');
check('요약 최대 3줄', s.lines, ['a', 'b', 'c']);
check('이전 기능: 개인값 감지', [SH.hasPersonal('?i=7000&o=none'), SH.hasPersonal('?o=none&sd=all')], [true, false]);
check('이전 기능: 개인값 지우기', SH.stripPersonal('?i=1&c=2&sd=all'), '?sd=all');

/* 화면 연결 */
const pages = { chungyak: 'chungyak', report: 'buy/report', mine: 'mine', switch: 'switch', jeonse: 'jeonse', checklist: 'jeonse/checklist', tax: 'tax', villa: 'villa', ask: 'ask', rank: 'rank' };
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
/* 가족과 자세히 공유: # 뒤 값 만들기·읽기 */
{
  const p = { v: 1, t: 'report', q: { sd: '서울특별시', o: 'none', i: '7000', bp: '95000', utm_source: 'x' }, ls: { jdj_fin: '{"i":7000,"c":40000}', jdj_vid: 'abc', evil: 'x' }, h: 'cgt', x: { sg: ['11680'] } };
  const enc = SH.encodeDetail(p);
  check('자세히: jv= 로 시작·주소에 쓸 수 있는 글자만', /^jv=[A-Za-z0-9_-]+$/.test(enc), true);
  const d = SH.decodeDetail('#' + enc);
  check('자세히: 공개 값 q 에서 개인값·utm 버림', d.q, { sd: '서울특별시', o: 'none' });
  check('자세히: 저장값은 허용 목록만(jdj_vid 등 버림)', Object.keys(d.ls), ['jdj_fin']);
  check('자세히: 개인값은 ls 안에 그대로(# 뒤)', JSON.parse(d.ls.jdj_fin).i, 7000);
  check('자세히: 화면 #·추가 값', [d.h, d.x.sg[0]], ['cgt', '11680']);
  check('자세히: 리포트 밖에서는 d(단지 열쇠)는 남기고 bp·bd 는 버림', SH.decodeDetail('#' + SH.encodeDetail({ v: 1, t: 'mine', q: { d: 'k', bp: '1', bd: '2020-01' } })).q, { d: 'k' });
  check('자세히: 한글 그대로 왕복', SH.decodeDetail(SH.encodeDetail({ v: 1, t: 'mine', q: { d: '11680|대치동|316|은마' } })).q.d, '11680|대치동|316|은마');
  check('자세히: 망가진 값·모르는 화면·다른 버전은 버림', [SH.decodeDetail('#jv=@@'), SH.decodeDetail('#' + SH.encodeDetail({ v: 1, t: 'nope' })), SH.decodeDetail('#' + SH.encodeDetail({ v: 2, t: 'tax' })), SH.decodeDetail('#cgt')], [null, null, null, null]);
  check('자세히: 이상한 # 화면 이름 버림', SH.decodeDetail('#' + SH.encodeDetail({ v: 1, t: 'tax', h: 'x"><img' })).h, undefined);
  check('자세히: 너무 긴 값 버림', SH.decodeDetail('#jv=' + 'A'.repeat(7000)), null);
  check('저장값 보호 목록', ['jdj_fin', 'jdj_cy', 'jdj_myhome', 'jdj_region', 'jdj_hz', 'jdj_cmp'].every(k => SH.PROTECT.includes(k)) && !SH.PROTECT.includes('jdj_vid'), true);
}
/* 자세히 공유 화면 연결: 요약/자세히 고르기 · 개인값이 있는 6개 화면만 detail */
{
  const src = fs.readFileSync(path.join(root, 'assets', 'share.js'), 'utf8');
  check('고르기 문구', ['요약 공유', '추천', '개인 숫자 없이', '가족과 자세히 공유', '내 금액 포함', '받는 사람이 내 금액을 볼 수 있어요'].every(t => src.includes(t)), true);
  check('바텀시트·팝오버', /jshare-ch\.sheet/.test(src) && /jshare-ch\.pop/.test(src), true);
  check('공유받은 조건 바', src.includes('공유받은 조건으로 보고 있어요') && src.includes('내 조건으로 보기'), true);
  check('자세히 링크: 개인값은 # 뒤에만(u.hash)', /u\.hash = encodeDetail\(p\)/.test(src) && !/searchParams\.set\([^)]*encodeDetail/.test(src), true);
  check('카드 이미지는 요약 그대로(자세히도 같은 그림)', (src.match(/cardBlob\(ST\.tool, s, ST\.url\)/g) || []).length, 1);
  check('통계 mode 만(개인값 없음)', /share_click', \{ tool: ST\.tool, place: place, method: method, mode:/.test(src), true);
  const D = { report: 'buy/report', switch: 'switch', mine: 'mine', chungyak: 'chungyak', tax: 'tax', jeonse: 'jeonse' };
  Object.entries(D).forEach(([tool, p]) => {
    const html = fs.readFileSync(path.join(root, p, 'index.html'), 'utf8');
    check(p + ' 자세히 공유 연결', new RegExp(`setup\\(\\{\\s*tool:\\s*'${tool}'[^\\n]*detail`).test(html), true);
  });
  ['ask', 'jeonse/checklist', 'villa'].forEach(p => {
    const html = fs.readFileSync(path.join(root, p, 'index.html'), 'utf8');
    check(p + ' 요약만', /detail\s*[:(]/.test(html.slice(html.indexOf('setup('), html.indexOf('setup(') + 200)), false);
  });
  const tui = fs.readFileSync(path.join(root, 'tax', 'tax-ui.js'), 'utf8');
  check('세금: 입력 담기·다시 계산', /window\.JDJ_TAXUI = \{ snap, restore/.test(tui), true);
  const trk = fs.readFileSync(path.join(root, 'assets', 'track.js'), 'utf8');
  check('track.js: GA 켜기 전에 #jv 지움', trk.indexOf("'#jv='") > 0 && trk.indexOf("'#jv='") < trk.indexOf("gtag('js'") && /history\.replaceState/.test(trk.slice(0, trk.indexOf("gtag('js'"))), true);
  check('track.js: GA 주소에 # 없음(origin+pathname+?utm만)', /return x\.origin \+ x\.pathname \+ \(qs \? '\?'\+qs : ''\)/.test(trk), true);
  const auth = fs.readFileSync(path.join(root, 'assets', 'auth.js'), 'utf8');
  check('로그인 내 집 목록과 섞지 않음', /sharedView\(\)\) return Promise\.resolve\(null\)/.test(auth) && /sharedView\(\)\) return Promise\.resolve\(false\)/.test(auth), true);
  const sw0 = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  check('서비스 워커 track.js 버전', /track\.js\?v=\d+'/.test(sw0), true);
}

/* 통계 */
const stat = fs.readFileSync(path.join(root, 'assets', 'stat.js'), 'utf8');
check('통계 이벤트', /share_click:\d+/.test(stat) && /share_visit:\d+/.test(stat), true);
check('통계 위치·방법', /\['top','mid','bottom'\]/.test(stat) && /'image'/.test(stat), true);
check('통계 공유 방식(mode)', /mode:\s+v => \['summary','detail'\]/.test(stat), true);
check('공유 유입 감지', /utm_source'\) === 'share'/.test(stat), true);
/* 캐시 */
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const sv = (fs.readFileSync(path.join(root, 'chungyak', 'index.html'), 'utf8').match(/share\.js\?v=(\d+)/) || [])[1];
check('서비스 워커에 같은 버전', sw.includes(`/assets/share.js?v=${sv}'`), true);

console.log(`공유 모듈 검증: ${ok}/${ok + bad} 통과`);
if (bad) process.exit(1);
