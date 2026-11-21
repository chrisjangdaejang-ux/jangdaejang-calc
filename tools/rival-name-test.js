/* 소개·안내 화면에 다른 부동산 앱·회사 이름이 없는지, '집코드만의 강점' 칸이 제대로 있는지: node tools/rival-name-test.js
   다른 회사 이름을 쓰면 그 회사를 홍보하는 셈이라 about/·guide/ 아래 모든 파일에서 막아요. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let ok = 0, bad = 0;
const check = (m, c) => { if (c) ok++; else { bad++; console.log('FAIL', m); } };

const files = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(d, e.name)) : [path.join(d, e.name)]);
const RIVALS = [
  ['리치고', /리치고/], ['호갱노노', /호갱/], ['직방', /직방/], ['KB', /(^|[^A-Za-z])KB(?![A-Za-z])/i], ['국민은행', /국민은행/],
  ['네이버', /네이버|naver/i], ['아실', /아실(?=[\s·,.)]|$)|asil/i], ['부동산지인', /부동산\s*지인|지인\s*앱/], ['밸류맵', /밸류맵/],
  ['플래닛', /플래닛/], ['다방', /다방/], ['디스코', /디스코/], ['땅집고', /땅집고/], ['부동산114', /부동산\s*R?114/], ['한국부동산원 앱', /부동산테크/],
];
for (const dir of ['about', 'guide']) for (const f of files(path.join(ROOT, dir))) {
  const t = fs.readFileSync(f, 'utf8'), rel = path.relative(ROOT, f);
  for (const [n, re] of RIVALS) check(`${rel}: 다른 회사 이름 '${n}' 없음`, !re.test(t));
  for (const w of ['국내 유일', '업계 유일', '국내 최초', '업계 최초']) check(`${rel}: 증명할 수 없는 비교 문구 '${w}' 없음`, !t.includes(w));
}

/* 강점 칸: 소개 화면 위쪽(항목 사전보다 앞), 서비스 이름은 SITE_NAME 칸, 링크한 화면은 모두 있음 */
const about = fs.readFileSync(path.join(ROOT, 'about/index.html'), 'utf8');
const sec = (about.match(/<section class="stg2" id="strengths"[\s\S]*?<\/section>/) || [''])[0];
check('소개: 강점 칸 있음', !!sec);
check('소개: 강점 칸이 항목 사전보다 앞', about.indexOf('id="strengths"') > 0 && about.indexOf('id="strengths"') < about.indexOf('<span class="n">01</span>'));
check('소개: 제목은 SITE_NAME 칸 + 만의 강점', /<span data-site-name>[^<]*<\/span>만의 강점/.test(sec));
check('소개: 강점 10가지', (sec.match(/<li[ >]/g) || []).length === 10);
check('소개: config.js(SITE_NAME) 불러옴', /assets\/config\.js/.test(about));
const method = fs.readFileSync(path.join(ROOT, 'guide/method/index.html'), 'utf8');
const sv = (method.match(/<section class="stv"[\s\S]*?<\/section>/) || [''])[0];
check('점수 읽는 법: 짧은 강점 칸 + 전체 보기 링크', !!sv && sv.includes('/about/#strengths') && /<span data-site-name>/.test(sv));
check('점수 읽는 법: config.js(SITE_NAME) 불러옴', /assets\/config\.js/.test(method));
check("점수 읽는 법: '뺀 항목' 바로가기 자리(#out)", /<h2 id="out"/.test(method));
for (const [name, block, base] of [['about', sec, 'about/'], ['guide/method', sv, 'guide/method/']]) {
  check(`${name}: 강점 문구에 회사명 없음`, !/장대장부동산그룹/.test(block));
  for (const w of ['시험', '검증', '채점', '통과']) check(`${name}: 강점 문구 금지어 '${w}' 없음`, !block.includes(w));
  for (const [, href] of block.matchAll(/href="([^"]+)"/g)) {
    const [p, hash] = href.split('#');
    const abs = p.startsWith('/jangdaejang-calc/') ? p.slice('/jangdaejang-calc/'.length) : path.posix.normalize(path.posix.join(base, p));
    const file = path.join(ROOT, abs, 'index.html');
    check(`${name}: 링크한 화면 있음 ${href}`, fs.existsSync(file));
    if (hash && fs.existsSync(file)) check(`${name}: 링크한 자리 있음 ${href}`, fs.readFileSync(file, 'utf8').includes(`id="${hash}"`));
  }
}
/* 예전 서비스 이름(장대장 데이터랩·장대장 계산기·장대장 리포트·장대장 프리미엄 리포트)이 화면 글자·title·og 태그·화면 JS 문구에 다시 나오지 않게.
   주석은 빼고 봐요. 회사명(법적 표기 '(주)장대장부동산그룹')·유튜브 채널 '장대장TV'는 이 검사 대상이 아니에요. */
{
  const OLD = [['데이터랩', /데이터\s*랩/], ['장대장 계산기', /장대장\s*(내 집 마련\s*|갈아타기\s*|부동산\s*)?계산기/], ['장대장 리포트', /장대장\s*(맞춤\s*(매수\s*)?|프리미엄\s*)?리포트/],
    /* 상담 이름은 '부동산 전문가 상담'(대표 결정 2026-11-21). '장대장TV'(채널)·'(주)장대장부동산그룹'(법적 표기)은 아래 표현에 걸리지 않아요 */
    ['장대장 상담', /장대장\s*상담/], ['장대장에게', /장대장에게/], ['장대장 갈아타기', /장대장\s*갈아타기/], ['장대장이 직접', /장대장이\s*직접/],
    /* 가칭 '집예보' → 서비스 이름 '집코드'(대표 결정 2026-11-21). 화면·메일·SEO 페이지(apt/·cy/·weekly/)에 다시 나오지 않게 */
    ['집예보(예전 가칭)', /집예보/]];
  const strip = t => t.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
  const SKIP = /^(tools|docs|\.git|node_modules|data)$|^vendor$|^leaflet$/;
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (SKIP.test(e.name) ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
  const hits = [];
  for (const f of walk(ROOT).concat([path.join(ROOT, 'tools', 'agent-backend.gs')])) {   // 서버 메일·화면 문구도(주석 제외)
    if (!/\.(html|js|webmanifest|gs)$/.test(f)) continue;
    const t = strip(fs.readFileSync(f, 'utf8'));
    for (const [n, re] of OLD) if (re.test(t)) hits.push(`${path.relative(ROOT, f)}: ${n}`);
  }
  check(`예전 서비스 이름이 화면·title·og 에 없음 ${hits.join(', ')}`, hits.length === 0);
  /* 예전 가칭은 주석까지 포함해 화면 파일·서버·바깥에 보이는 문서(스토어 등록 초안·검색 등록 안내)에 없음. 변경 기록은 이 검사 밖(필요하면 docs/ 의 내부 메모에만) */
  const OLD_NAME = /집예보/, nameHits = [];
  for (const f of walk(ROOT).concat(['tools/agent-backend.gs', 'docs/android_app.md', 'docs/search_registration.md', 'docs/well-known/assetlinks.json'].map(x => path.join(ROOT, x)))) {
    if (!/\.(html|js|css|json|webmanifest|gs|md|xml|txt)$/.test(f)) continue;
    if (OLD_NAME.test(fs.readFileSync(f, 'utf8'))) nameHits.push(path.relative(ROOT, f));
  }
  check(`예전 가칭 '집예보' 없음(주석 포함) ${nameHits.slice(0, 10).join(', ')}`, nameHits.length === 0);
  check('검사가 예전 가칭을 잡아냄', OLD.some(([, re]) => re.test('집예보 모닝 브리핑')));
  check('예외는 그대로: 장대장TV 채널·회사명 법적 표기는 검사에 걸리지 않음', !OLD.some(([, re]) => re.test('장대장TV 보기 · 상호 (주)장대장부동산그룹')));
  check('소개 화면 title 은 SITE_NAME(집코드) 기준', /<title>서비스 소개 · 집코드는 이렇게 분석해요<\/title>/.test(about) && /<h1><span data-site-name>[^<]*<\/span>는<br>이렇게 분석해요<\/h1>/.test(about));
}
console.log(`${ok} ok, ${bad} fail`);
process.exit(bad ? 1 : 0);
