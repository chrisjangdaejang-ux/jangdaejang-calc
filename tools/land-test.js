/* 땅 위험 신호 체크(land/) 자동 확인 — 실행: node tools/land-test.js </dev/null
   ① 숨김: LAND_ENABLED=false · 검색 제외 · 꺼져 있으면 준비 중 · 첫 화면·전체 기능·사이트맵 어디에도 링크 없음 · 예전 시안 주소는 land/ 로 넘김
   ② 시안 흔적 없음: 예시 값·'연결 후'·'[차트 자리]'·화면에 둔 기준 수치(배수 구간) 없음 · 다른 회사 이름 없음 · ~요 말투
   ③ 계산(assets/land-core.js): 지분 비율·임야·밭·논 최근 6개월 vs 그 전·급증 달 묶음·막대·가격 위치(4분위 그대로)·지목 자료 모자라면 시·군·구·주소 찾기
   ④ 출시 도우미(tools/land-launch.js): 한 번에 6곳 · 첫 화면 3×3 유지(전체 기능은 아래 한 줄) · 두 번 돌려도 같은 결과 */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const L = require('../assets/land-core.js');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---------- ① 숨김 ---------- */
const cfg = read('assets/config.js'), page = read('land/index.html');
check('config: LAND_ENABLED=false', /LAND_ENABLED: false,/.test(cfg) && !/LAND_ENABLED: true/.test(cfg));
check('land/: 검색 제외(noindex)', /<meta name="robots" content="noindex, nofollow">/.test(page));
check('land/: 꺼져 있으면 준비 중 · 미리 보기 ?preview=land / ?preview=off', /준비 중이에요/.test(page) && /CFG\.LAND_ENABLED === true \|\| preview\(\)/.test(page) && /preview=land/.test(page) && /preview=off/.test(page));
check('land/: config.js 를 불러옴(설정 값 읽기)', /assets\/config\.js\?v=\d+/.test(page) && /assets\/land-core\.js\?v=\d+/.test(page));
const walk = (d, out) => { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { if (e.name.startsWith('.') || e.name === 'node_modules') return; const p = path.join(d, e.name); if (e.isDirectory()) { if (!(d === ROOT && /^(apt|cy|comm|sitemaps|data|tools|docs|design|land)$/.test(e.name))) walk(p, out); } else if (/\.html$/.test(e.name)) out.push(p); }); return out; };
const linking = walk(ROOT, []).map(p => path.relative(ROOT, p)).filter(p => /href="(\.\.\/|\.\/)?land\//.test(read(p)));
check('꺼짐: land/ 밖 화면에 land/ 로 가는 링크 없음(첫 화면·전체 기능 포함)', linking.length === 0, linking);
const sm = ['sitemap.xml'].concat(fs.readdirSync(path.join(ROOT, 'sitemaps')).map(f => 'sitemaps/' + f)).filter(f => /\.xml$/.test(f));
check('사이트맵에 land 주소 없음', sm.every(f => !/\/land\//.test(read(f))));
const draft = read('land/draft/index.html');
check('예전 시안 주소: 검색 제외 + land/ 로 넘김(주소 뒤 값 그대로)', /noindex/.test(draft) && /location\.replace\('\.\.\/' \+ location\.search\)/.test(draft) && draft.length < 1500);
check('광고 칸 land_end 는 결과 뒤', /data-ad-slot="land_end"[^>]*data-ad-after="#res"/.test(page));

/* ---------- ② 시안 흔적·문구 ---------- */
const text = page.replace(/<script[\s\S]*?<\/script>/g, s => s.replace(/\/\/[^\n]*/g, ''));
['연결 후', '연결 예정', '[차트 자리]', '예시 값', '가상', '시안', '자동 조회 예정', '준비 중)', 'pubHi', 'nearHi', 'demo'].forEach(w => check('시안 흔적 없음: ' + w, text.indexOf(w) < 0));
check('화면 코드에 배수 기준 구간 없음(가격 위치는 실제 거래 4분위로만)', !/T\s*=\s*\{/.test(page) && !/>=\s*\d+(\.\d+)?\s*\?\s*'r'/.test(page + read('assets/land-core.js')));
check('엔진 급증 기준값 이름 없음', !/_SIG|'mul'|'rise'|min_base/.test(page + read('assets/land-core.js')));
const RIVAL = /직방|호갱노노|아실|네이버 ?부동산|리치고|밸류맵|디스코|땅야|부동산플래닛|KB ?부동산|다방|피터팬/;
check('다른 회사 이름 없음', !RIVAL.test(page + read('assets/land-core.js')));
check('~요 말투(습니다 없음)', !/습니다|합니다/.test(page));
check('투자 권유 없음(사세요·추천 매물·수익 보장)', !/사세요|추천 매물|수익 보장|투자하세요/.test(page));
check('맹지·용도지역·공시지가: 공식 사이트 링크로 직접 확인', /토지이음에서 지적도 확인하기/.test(page) && /토지이음에서 토지이용계획 확인하기/.test(page) && /부동산 공시가격 알리미 열기/.test(page));
check('자료가 적을 때 문장', (page.match(/자료가 부족해요/g) || []).length >= 3);
check('서비스 이름은 data-site-name 으로(하드코딩 없음 — 머리 로고 aria 제외)', !/집예보/.test(page));

/* ---------- ③ 계산 ---------- */
const M = []; for (let m = '202301'; m <= '202610'; m = L.ymAdd(m, 1)) M.push(m);
const z = v => M.map(() => v);
const D = { c: '41999', n: '가상시', sd: '경기도', from: '202301', to: '202610', pfrom: '202311', src: 's', v: '2026-11-26',
  s: { n: z(20), h: z(5), a: { n: z(10), h: z(2) } },
  e: { '가나면': { n: z(4).map((x, i) => i >= M.length - 6 ? 14 : x), h: z(1).map((x, i) => i >= M.length - 6 ? 11 : x),
                  a: { n: z(2).map((x, i) => i >= M.length - 6 ? 12 : x), h: z(0).map((x, i) => i >= M.length - 6 ? 10 : x) },
                  f: { '202605': 1, '202606': 2, '202607': 2, '202609': 1, '202301': 1 }, fz: 2,
                  pj: { '임야': [40, 30000, 50000, 80000, 120000, 60, 20000], '전': [3, null, null, null, null, 0, null] }, pu: {}, y: {} },
       '다라동': { n: z(0).map((x, i) => i === M.length - 1 ? 3 : 0), h: z(0), a: { n: z(0), h: z(0) }, f: {}, fz: 0, pj: {}, pu: {}, y: {} } },
  pj: { '전': [30, 40000, 60000, 90000, 150000, 2, null] }, pu: {}, y: {} };
const st = L.shareStat(D, '가나면', 12);
check('최근 1년 지분 비율: 이 동네 vs 시·군·구', eq([st.n, st.h, Math.round(st.r * 1000), st.sn, st.sh, st.sr, st.enough, st.from, st.to], [108, 72, 667, 240, 60, 0.25, true, '202511', '202610']), st);
check('거래가 적으면 enough=false(자료가 부족해요)', L.shareStat(D, '다라동', 12).enough === false && L.shareStat(D, '없는동') === null);
const ru = L.ruralStat(D, '가나면');
check('임야·밭·논 최근 6개월 vs 그 전 3년', eq([ru.n, ru.h, ru.pm, ru.ph, ru.avgPrev, Math.round(ru.avgNow * 10), ru.sr, ru.from, ru.to, ru.pfrom, ru.pto, ru.enough], [72, 60, 36, 0, 0, 100, 0.2, '202605', '202610', '202305', '202604', true]), ru);
const fl = L.flags(D, '가나면');
check('급증 달 묶음(최근 3년만, 이어진 달은 하나로)', eq(fl, { lv: 2, runs: [['202605', '202607'], ['202609', '202609']] }), fl);
check('기간 문장', L.span('202605', '202607') === '2026년 5월~7월' && L.span('202511', '202602') === '2025년 11월~2026년 2월' && L.span('202609', '202609') === '2026년 9월');
const mb = L.monthBars(D, '가나면', 36), yb = L.yearBars(D, '가나면');
check('월별 막대 36칸 · 연도별 막대(셈한 달 수)', mb.length === 36 && mb[35].t === '202610' && mb[35].h === 11 && eq(yb.map(r => [r.t, r.mo]), [['2023', 12], ['2024', 12], ['2025', 12], ['2026', 10]]));
const svg = L.barsSvg(mb, { label: '가나면 막대' });
check('막대 그래프 SVG: 막대 36개 + 지분 막대 · 설명(aria-label)', (svg.match(/class="bn"/g) || []).length === 36 && (svg.match(/class="bh"/g) || []).length === 36 && /aria-label="가나면 막대"/.test(svg));
const S = D.e['가나면'].pj['임야'];
check('가격 위치: 90% 넘음 → 위험 신호', eq(L.compare(S, 130000), { per: 130000, mult: 2.6, pos: 'p90', lv: 'r' }));
check('가격 위치: 75% 넘음 → 주의 · 가운데 절반 → 양호 · 25% 아래 → 양호', L.compare(S, 90000).lv === 'y' && L.compare(S, 50000).pos === 'mid' && L.compare(S, 10000).pos === 'low' && L.compare(S, 10000).lv === 'g');
check('가격 없거나 자료 부족이면 비교 안 함', L.compare(S, 0) === null && L.compare([3, null, null, null, null, 0, null], 50000) === null);
const pk = L.pickStats(D, '가나면', '전');
check('이 동네 지목 자료가 모자라면 시·군·구 전체로', pk.scope === 'sgg' && pk.emdN === 3 && pk.st[2] === 60000 && L.pickStats(D, '가나면', '임야').scope === 'emd' && L.pickStats(D, '가나면', '대').scope === null);
const IX = { sido: [{ n: '경기도', g: [{ c: '41461', n: '용인시 처인구', e: ['포곡읍', '모현읍', '역북동'] }, { c: '41463', n: '용인시 기흥구', e: ['구갈동'] }] },
  { n: '서울특별시', g: [{ c: '11680', n: '강남구', e: ['개포동', '역삼동'] }, { c: '11140', n: '중구', e: ['신당동'] }] }, { n: '부산광역시', g: [{ c: '26110', n: '중구', e: ['광복동'] }] }] };
const fp = q => { const r = L.findPlace(IX, q); return r ? [r.c, r.e] : null; };
check('주소 찾기: 지번 주소 그대로', eq(fp('경기도 용인시 처인구 포곡읍 마성리 산 12-3'), ['41461', '포곡읍']));
check('주소 찾기: 줄임말 시·도 + 구', eq(fp('서울 강남구 개포동 12'), ['11680', '개포동']) && eq(fp('부산 중구'), ['26110', null]) && eq(fp('서울 중구 신당동'), ['11140', '신당동']));
check('주소 찾기: 구 이름만', eq(fp('처인구 모현읍'), ['41461', '모현읍']));
check('주소 찾기: 못 찾으면 null', fp('아무 말') === null && fp('') === null);
check('금액·면적 글자', L.won(30000000) === '3,000만 원' && L.won(123456789) === '1억 2,346만 원' && L.perM2(100000) === '㎡당 10만 원(평당 33만 원)' && L.pct(0.2554) === '25.5%' && L.times(2.64) === '2.6배' && L.num('30,000,000원') === 30000000);

/* ---------- ④ 출시 도우미 ---------- */
const LL = require('./land-launch.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'land-launch-'));
['assets/config.js', 'land/index.html', 'index.html', 'solve/index.html', 'all/index.html', 'sitemaps/pages.xml', 'sw.js'].forEach(f => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.copyFileSync(path.join(ROOT, f), path.join(tmp, f)); });
const P = LL.plan({ root: tmp });
check('출시: 7개 파일', eq([...P.out.keys()].sort(), ['all/index.html', 'assets/config.js', 'index.html', 'land/index.html', 'sitemaps/pages.xml', 'solve/index.html', 'sw.js']), [...P.out.keys()]);
const o = f => P.out.get(f);
check('출시: 첫 화면·solve/ 설정 파일 번호도 land/ 와 같게', [o('index.html'), o('solve/index.html')].every(t => /config\.js\?v=(\d+)/.exec(t)[1] === /config\.js\?v=(\d+)/.exec(o('land/index.html'))[1]));
check('출시: LAND_ENABLED=true · land/ 검색 열림 · config.js 판 +1', /LAND_ENABLED: true,/.test(o('assets/config.js')) && !/<meta name="robots"/.test(o('land/index.html')) && +(o('land/index.html').match(/config\.js\?v=(\d+)/) || [])[1] === +(page.match(/config\.js\?v=(\d+)/) || [])[1] + 1);
const h = o('index.html'), sit = (h.match(/<nav class="sit" id="sit"[\s\S]*?<\/nav>/) || [''])[0], tiles = sit.match(/<a [^>]*data-track="home_to_[a-z]+"/g) || [];
check('출시: 첫 화면 토지 단추는 상가·건물 바로 다음 · 3×3 + 전체 기능 한 줄', /data-track="home_to_comm">[^\n]*<\/a>\n\s*<a href="land\/" data-track="home_to_land">/.test(sit) && tiles.filter(t => !/sit-all/.test(t)).length === 9 && /class="sit-all" href="all\/"/.test(tiles[tiles.length - 1]) && /\.sit>a\.sit-all\{grid-column:1\/-1/.test(h), tiles);
check('출시: 상황별로 찾기 줄 · 전체 기능 줄 · 사이트맵 · sw +1', /data-track="home_svc_land"/.test(h) && /href="\.\.\/land\/" data-track="all_land"/.test(o('all/index.html')) && /재개발·빌라·상가·토지/.test(o('all/index.html')) && /\/land\/<\/loc>/.test(o('sitemaps/pages.xml')) && /jdj-v(\d+)/.exec(o('sw.js'))[1] - /jdj-v(\d+)/.exec(read('sw.js'))[1] === 1);
P.out.forEach((v, f) => fs.writeFileSync(path.join(tmp, f), v));
const P2 = LL.plan({ root: tmp });
check('출시: 두 번 돌려도 같은 결과(바뀔 파일 없음)', P2.out.size === 0, [...P2.out.keys()]);
fs.rmSync(tmp, { recursive: true, force: true });
const doc = read('docs/launch_checklist.md');
check('출시 체크리스트: 땅 위험 신호 체크 절차', /## '땅 위험 신호 체크' 출시하는 날/.test(doc) && /node tools\/land-launch\.js --apply/.test(doc));

console.log(`\n땅 위험 신호 체크: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
