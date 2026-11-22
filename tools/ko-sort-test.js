/* 지역 고르기 목록 가나다순 자동 검증 — 실행: node tools/ko-sort-test.js
   assets/region-pick.js 의 JDJ_KO(시·도: 서울·경기·인천 먼저 + 나머지 가나다순, 시·군·구·동: 가나다순)와
   그 도우미를 쓰는 화면이 region-pick.js 를 실제로 불러오는지, 고정 시·도 목록(area-watch)이 같은 순서인지 확인한다. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const K = require('../assets/region-pick.js');
const rows = [];
function check(name, got, want, basis) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want, basis }); }

/* 1. 정렬 도우미 */
check('시·군·구 가나다순(행정 코드 순 아님)', K.sortBy(['종로구', '중구', '용산구', '성동구', '광진구', '강남구']), ['강남구', '광진구', '성동구', '용산구', '종로구', '중구'], 'localeCompare ko');
check('객체 목록도 이름으로', K.sortBy([{ n: '중구' }, { n: '강서구' }], x => x.n).map(x => x.n), ['강서구', '중구'], 'key 함수');
check('원래 배열은 그대로 둠', (() => { const a = ['나', '가']; K.sortBy(a); return a; })(), ['나', '가'], '복사해서 정렬');
check('Set·빈 값도 받음', [K.sortBy(new Set(['다', '가'])), K.sortBy(undefined)], [['가', '다'], []], 'Array.from');
const SD = ['부산광역시', '대구광역시', '인천광역시', '전남광주통합특별시', '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '경상북도', '경상남도', '제주특별자치도', '서울특별시'];
const WANT = ['서울특별시', '경기도', '인천광역시', '강원특별자치도', '경상남도', '경상북도', '대구광역시', '대전광역시', '부산광역시', '세종특별자치시', '울산광역시', '전남광주통합특별시', '전북특별자치도', '제주특별자치도', '충청남도', '충청북도'];
check('시·도: 서울·경기·인천 먼저, 나머지 가나다순', K.sortSido(SD), WANT, 'FIRST + localeCompare');
check('시·도 줄임말도 같은 순서', K.sortSido(['부산', '인천', '강원', '경기', '서울']), ['서울', '경기', '인천', '강원', '부산'], '앞글자 비교');

/* 2. 고정 시·도 목록(area-watch.js)도 같은 순서 */
const aw = fs.readFileSync(path.join(ROOT, 'assets/area-watch.js'), 'utf8').match(/const SIDOS = (\[[^\]]+\])/);
check('area-watch.js 시·도 목록 순서', aw && JSON.parse(aw[1].replace(/'/g, '"')), WANT, 'assets/area-watch.js SIDOS');

/* 3. 세금 화면 구 목록: 가나다순, '그 밖의 시·군'은 맨 끝 */
const A = require('../tax/adjusted-areas.js');
const gg = A.guList('경기'), se = A.guList('서울');
check('세금: 경기 목록 끝은 그 밖의 시·군', gg[gg.length - 1], '그 밖의 시·군', 'tax/adjusted-areas.js guList');
check('세금: 경기 목록 가나다순', gg.slice(0, -1), K.sortBy(gg.slice(0, -1)), 'guList');
check('세금: 서울 구 가나다순', se, K.sortBy(se), 'guList');

/* 4. JDJ_KO 를 쓰는 화면은 region-pick.js 를 불러옴(defer 로 부르는 화면은 없을 때 대비가 있어야 함) */
const skip = /^(apt|weekly|dong|gu|danji|node_modules|tools|\.git)\//;
const miss = [];
(function walk(d) {
  for (const f of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const rel = d ? d + '/' + f.name : f.name;
    if (f.isDirectory()) { if (!skip.test(rel + '/')) walk(rel); continue; }
    if (!/\.html$/.test(f.name)) continue;
    const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (!/JDJ_KO\b/.test(s) && !/villa-view\.js/.test(s)) continue;
    const tag = s.match(/<script[^>]*region-pick\.js[^>]*>/);
    if (!tag) miss.push(rel + ' (안 불러옴)');
    else if (/\bdefer\b/.test(tag[0]) && /JDJ_KO\.sort/.test(s.replace(/window\.JDJ_KO\s*\?\s*JDJ_KO\.sort\w+/g, ''))) miss.push(rel + ' (defer 인데 대비 없음)');
  }
})('');
check('JDJ_KO 쓰는 화면은 region-pick.js 를 먼저 불러옴', miss, [], 'assets/region-pick.js');

/* 5. 예전 정렬 안 된 패턴이 다시 생기지 않았는지(브리핑 구독·관리) */
for (const p of ['brief/subscribe/index.html', 'brief/manage/index.html', 'brief/index.html']) {
  const s = fs.readFileSync(path.join(ROOT, p), 'utf8');
  check(p + ': 구·동 목록 정렬', /innerHTML\s*=\s*Object\.entries\(SG\)\.filter|\(S\.dongs \|\| \[\]\)\.map/.test(s), false, 'JDJ_KO.sortBy');
}

const fail = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `\n      got ${JSON.stringify(r.got)}\n      want ${JSON.stringify(r.want)}  (${r.basis})`));
console.log(`\n${rows.length - fail.length}/${rows.length} 통과`);
process.exit(fail.length ? 1 : 0);
