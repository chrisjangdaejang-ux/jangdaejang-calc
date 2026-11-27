/* '← 이전으로' 줄(assets/back.js) 이름표·조사·판단 규칙 자동 검증 — 실행: node tools/back-test.js
   - 아는 화면 경로 → 한국어 이름('villa/' → '재개발·빌라'), 내 집 시세 탭(?t=v → '빌라 시세')
   - 받침에 맞는 조사(로/으로), 긴 이름·모르는 화면 → '← 이전 화면'
   - 같은 사이트에서 왔으면 뒤로 가기(글자에 갈 곳), 바로 들어왔으면 '← 홈으로', 한 화면 안 기록(history.state.jbn)이면 그 이름
   - 위치 표시(홈 › 카테고리 › 지금 화면)
   - 모든 손으로 만든 화면(index.html)이 back.js 를 넣었는지, sw.js 미리 저장 목록에 있는지 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const rows = [];
function check(name, got, want) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want }); }

global.location = { pathname: '/jangdaejang-calc/mine/', search: '' };
const BK = require('../assets/back.js');
delete global.location;
const O = 'https://chrisjangdaejang-ux.github.io', S = O + '/jangdaejang-calc/';

/* 1) 경로 정리 */
check('경로: 폴더', BK.relOf('/jangdaejang-calc/villa/'), 'villa/');
check('경로: index.html 떼기', BK.relOf('/jangdaejang-calc/villa/zone/index.html'), 'villa/zone/');
check('경로: 홈', BK.relOf('/jangdaejang-calc/'), '');
check('경로: 다른 저장소(같은 github.io)는 사이트 밖', BK.relOf('/jangdaejang-data/x.json'), null);

/* 2) 이름표 */
const nm = (r, q) => BK.info(r, q || '').name;
check('재개발·빌라', nm('villa/'), '재개발·빌라');
check('구역 지도 + 카테고리', BK.info('villa/zone/', ''), { name: '재개발 구역 지도', parent: 'villa/' });
check('내 집 시세', nm('mine/'), '내 집 시세');
check('내 집 시세 빌라 탭', BK.info('mine/', '?t=v&vg=11440'), { name: '빌라 시세', parent: 'mine/' });
check('오피스텔 탭', nm('mine/', '?sd=s00&t=o'), '오피스텔 시세');
check('상가·건물 탭', nm('mine/', '?t=c'), '상가·건물 시세');
check('단지 페이지 → 지역 목록이 위 단계', BK.info('apt/41593/7c7c1651-스타캐슬/', ''), { name: '단지 정보', parent: 'apt/41593/' });
check('청약 공고 상세', BK.info('cy/2026000521/', ''), { name: '청약 공고 상세', parent: 'cy/' });
check('주간 동향 지난 호', BK.info('weekly/2026-35/', ''), { name: '지난 주간 동향', parent: 'weekly/' });
check('모르는 화면', nm('zzz/'), '');
/* 손으로 만든 화면은 모두 이름이 있음 */
const pages = [];
(function walk(d, rel) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (f.name.startsWith('.') || ['node_modules', 'tools', 'docs', 'data', 'sitemaps', 'assets'].includes(f.name)) continue;
    if (f.isDirectory()) { if (rel === '' && ['apt', 'comm', 'cy'].includes(f.name)) continue; if (rel === 'weekly/' && /^\d{4}-\d{2}$/.test(f.name)) continue; walk(path.join(d, f.name), rel + f.name + '/'); }
    else if (f.name === 'index.html') pages.push(rel);
  }
})(ROOT, '');
const noName = pages.filter(r => !nm(r));
check(`손으로 만든 화면 ${pages.length}개 모두 이름표 있음`, noName, []);

/* 3) 조사 */
check('받침 없음 → 로', BK.josa('재개발·빌라'), '로');
check('받침 → 으로', BK.josa('홈'), '으로');
check('ㄹ 받침 → 로', BK.josa('살아보니 글'), '로');
check('ㄹ 받침(지도 목록 아님) → 로', BK.josa('알림 센터 메일'), '로');
check('세금 → 으로', BK.josa('세금'), '으로');
check('끝 기호는 빼고 봄', BK.josa('청약(공고)'), '로');
check('숫자 3 → 으로', BK.josa('2단지 3'), '으로');

/* 4) 단추 글자 */
check('단추: 재개발·빌라로', BK.label('재개발·빌라'), '← 재개발·빌라로');
check('단추: 내 집 시세로', BK.label('내 집 시세'), '← 내 집 시세로');
check('단추: 세금으로', BK.label('세금'), '← 세금으로');
check('단추: 이름 없음', BK.label(''), '← 이전 화면');
check('단추: 너무 긴 이름', BK.label('아주 아주 긴 이름의 단지 화면입니다요'), '← 이전 화면');
check('건물 키 이름: 아파트', BK.keyName('11710|송파동|100|헬리오시티'), '헬리오시티');
check('건물 키 이름: 괄호 떼기', BK.keyName('11680|개포동|12|래미안 블레스티지(1&2)'), '래미안 블레스티지');
check('건물 키 이름: 빌라', BK.keyName('망원동|459-15|대왕빌라'), '대왕빌라');
check('건물 키 이름: 지번만(상가)', BK.keyName('역삼동|123-4'), '');
check('건물 키 이름: 오피스텔 지번 없는 #이름', BK.keyName('역삼동|#센터빌'), '센터빌');

/* 5) 어디로 돌아갈지 */
const here = { rel: 'mine/', search: '?t=v' }, now = 1e12;
const D = o => BK.decide(Object.assign({ here, origin: O, now, histLen: 3, state: null, nav: null, ref: '' }, o));
check('재개발·빌라에서 옴 → 뒤로 가기 + 글자', D({ ref: S + 'villa/' }), { mode: 'back', text: '← 재개발·빌라로', href: 'villa/', from: 'villa/' });
check('홈에서 옴 → 뒤로 가기 + 홈으로', D({ ref: S }), { mode: 'back', text: '← 홈으로', href: '', from: '' });
check('빌라 시세 탭에서 옴(주소 값 그대로)', D({ here: { rel: 'villa/', search: '' }, ref: S + 'mine/?t=v&vg=11440' }).text, '← 빌라 시세로');
check('바로 들어옴(검색·공유) → 홈으로', D({ ref: '' }), { mode: 'home', text: '← 홈으로', href: '', from: null });
check('다른 사이트에서 옴 → 홈으로', D({ ref: 'https://search.naver.com/search.naver?query=x' }).mode, 'home');
check('같은 github.io 의 다른 저장소 → 홈으로', D({ ref: O + '/other-repo/' }).mode, 'home');
check('새 탭으로 열림(기록 1칸) → 홈으로', D({ ref: S + 'villa/', histLen: 1 }).mode, 'home');
check('referrer 를 안 보내는 화면에서 우리 링크를 눌러 옴', D({ nav: { to: 'mine/', from: 'dongne/my/', t: now - 5000 } }), { mode: 'back', text: '← 내 파트너 화면으로', href: 'dongne/my/', from: 'dongne/my/' });
check('오래된 링크 기록(30분 넘음)은 안 씀', D({ nav: { to: 'mine/', from: 'villa/', t: now - 31 * 60000 } }).mode, 'home');
check('다른 화면으로 가던 기록은 안 씀', D({ nav: { to: 'map/', from: 'villa/', t: now - 1000 } }).mode, 'home');
check('모르는 화면에서 옴 → 이전 화면', D({ ref: S + 'zzz/' }).text, '← 이전 화면');
check('단지 화면에서 옴(저장해 둔 제목)', D({ ref: S + 'apt/41593/7c7c1651-%EC%8A%A4%ED%83%80%EC%BA%90%EC%8A%AC/', names: { 'apt/41593/7c7c1651-스타캐슬/': '스타캐슬' } }).text, '← 스타캐슬로');
check('단지 화면에서 옴(제목 모름)', D({ ref: S + 'apt/41593/7c7c1651-x/' }).text, '← 단지 정보로');
check('한 화면 안 기록(고른 건물) → 그 이름', D({ ref: S + 'villa/', state: { jbn: 1, jbl: '빌라 찾기' } }), { mode: 'back', text: '← 빌라 찾기로', href: '', from: 'state' });
check('한 화면 안 기록(질문 단계)', D({ state: { cyq: 2, jbn: 2, jbl: '이전 질문' } }).text, '← 이전 질문으로');
check('이 기록 칸에 적어 둔 출발 화면(jbf, 새로 고침)', D({ state: { jbf: 'dongne/' } }).text, '← 동네 파트너로');
check('jbf 가 있어도 기록 1칸이면 홈으로', D({ state: { jbf: 'dongne/' }, histLen: 1 }).mode, 'home');
check('시세 표 시트 칸', D({ state: { jps: 1 } }).text, '← 이전 화면');
check('기록 0칸 상태는 referrer 기준', D({ ref: S + 'villa/', state: { jbn: 0 } }).text, '← 재개발·빌라로');
check('새 도메인(사이트 경로 /)도 같은 규칙', (() => {
  const f = require.resolve('../assets/back.js'); delete require.cache[f];
  global.location = { pathname: '/mine/', search: '' }; const B2 = require(f); delete global.location;
  return B2.decide({ here, origin: 'https://zip.example', ref: 'https://zip.example/villa/', histLen: 2, now }).text;
})(), '← 재개발·빌라로');

/* 6) 위치 표시 */
const C = (r, q, n) => BK.crumbs(r, q || '', n || {});
check('위치: 구역 지도', C('villa/zone/'), [['홈', ''], ['재개발·빌라', 'villa/'], ['재개발 구역 지도', null]]);
check('위치: 빌라 시세 탭', C('mine/', '?t=v'), [['홈', ''], ['내 집 시세', 'mine/'], ['빌라 시세', null]]);
check('위치: 맨 위 단계 화면', C('villa/'), [['홈', ''], ['재개발·빌라', null]]);
check('위치: 청약 공고 상세(청약 › 청약 공고 › 상세)', C('cy/2026000521/'), [['홈', ''], ['청약', 'chungyak/'], ['청약 공고', 'cy/'], ['청약 공고 상세', null]]);
check('위치: 모르는 화면은 안 보임', C('zzz/'), []);

/* 7) 화면에 들어갔는지 */
const missing = pages.filter(r => !fs.readFileSync(path.join(ROOT, r, 'index.html'), 'utf8').includes(`<script src="${'../'.repeat(r.split('/').length - 1)}assets/back.js?v=3" defer></script>`));
check('모든 손으로 만든 화면에 back.js(상대 경로 맞음)', missing, []);
const wk = fs.readFileSync(path.join(ROOT, 'weekly', '2026-35', 'index.html'), 'utf8');
check('주간 동향 보관 화면에도', wk.includes('<script src="../../assets/back.js?v=3" defer></script>'), true);
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
check('sw.js 미리 저장 목록에 back.js', sw.includes("'./assets/back.js?v=3'"), true);
const src = fs.readFileSync(path.join(ROOT, 'assets', 'back.js'), 'utf8');
check('단추 높이 44px 이상', /\.jbk-btn\{[^}]*min-height:44px/.test(src) && /\.jbk-bc a\{[^}]*min-height:44px/.test(src), true);
const mine = fs.readFileSync(path.join(ROOT, 'mine', 'index.html'), 'utf8');
check('내 집 시세: 탭·건물 바꿈을 기록에 쌓음(inpage)', /BK\.inpage\(/.test(mine) && ['villa-view', 'offi-view', 'comm-view'].every(f => /JDJ_MINE_NAV[^;]*=\s*navRestore/.test(fs.readFileSync(path.join(ROOT, 'assets', f + '.js'), 'utf8'))), true);

const bad = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `\n     got  ${JSON.stringify(r.got)}\n     want ${JSON.stringify(r.want)}`));
console.log(`\n${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
