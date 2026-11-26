/* '땅 위험 신호 체크'(land/) 출시 — 한 번에 한 커밋 (설명: docs/launch_checklist.md '땅 위험 신호 체크 출시하는 날')
   미리 보기(아무것도 안 바꿈):  node tools/land-launch.js </dev/null
   실제로 바꾸기:              node tools/land-launch.js --apply </dev/null

   하는 일(웹 저장소만 — 서버·엔진 설정 없음):
   ① assets/config.js LAND_ENABLED: false → true, land/index.html 의 config.js?v= + 1(휴대폰에 남은 예전 설정 대신 새로 받게 — 같은 번호를 쓰던 첫 화면·solve/ 도 함께,
      tools/guide-test.js 가 solve/ 는 가장 높은 번호를 쓰는지 봐요)
   ② land/index.html 검색 제외(noindex) 줄 지우기
   ③ 첫 화면 상황 단추: '상가·건물' 다음에 '토지' 단추 → 3칸 × 3줄(9개) 그대로, '전체 기능'은 그 아래 한 줄 전체 너비 단추(sit-all)로
      (지금 9개 = 3×3 이라 단추 하나를 더하면 혼자 남는 줄이 생겨서 — '전체 기능'을 칸 밖 한 줄로 빼면 3×3 이 유지돼요)
      + '상황별로 찾기' 시세·지도 묶음에 '땅 위험 신호 체크' 줄
   ④ 전체 기능(all/) '재개발·빌라·상가' 묶음 → '재개발·빌라·상가·토지' + '땅 위험 신호 체크' 줄
   ⑤ sitemaps/pages.xml 에 land/ 주소
   ⑥ sw.js jdj-vNN + 1
   여러 번 돌려도 같은 결과(이미 바뀐 곳은 그대로). */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const ICON = '<span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2.5 19.5 9 9.5l4 5.5 3-3.5 5.5 8z"/><path d="M15 4.5v5M15 4.5h4l-1 1.5 1 1.5h-4"/></svg></span>';
const HOME_TILE = `<a href="land/" data-track="home_to_land">${ICON}토지</a>`;
const HOME_SROW = `<a class="srow" href="land/" data-track="home_svc_land">${ICON}<span class="tx"><b>땅 위험 신호 체크</b><small>기획부동산 지분거래·주변 땅 실거래 비교</small></span><span class="go" aria-hidden="true">›</span></a>`;
const ALL_ROW = `<a class="arow" href="../land/" data-track="all_land">${ICON}<span class="tx"><b>땅 위험 신호 체크</b><small>기획부동산 피해 예방 · 지분거래 급증·주변 실거래 비교</small></span><span class="go" aria-hidden="true">›</span></a>`;
const SIT_ALL_CSS = '.sit>a.sit-all{grid-column:1/-1;flex-direction:row;min-height:46px;gap:8px}';

function plan(opt) {
  opt = opt || {};
  const root = opt.root || ROOT, out = new Map(), notes = [];
  const rd = f => out.has(f) ? out.get(f) : fs.readFileSync(path.join(root, f), 'utf8');
  // ①
  const cfg = rd('assets/config.js');
  if (/LAND_ENABLED: false,/.test(cfg)) { out.set('assets/config.js', cfg.replace('LAND_ENABLED: false,', 'LAND_ENABLED: true,')); notes.push('① 화면 설정 LAND_ENABLED → true'); }
  else notes.push('① 화면 설정은 이미 켜져 있어요');
  let lp = rd('land/index.html');
  if (out.has('assets/config.js')) {
    const m = lp.match(/assets\/config\.js\?v=(\d+)/);
    if (m) {
      lp = lp.replace(m[0], `assets/config.js?v=${+m[1] + 1}`); notes.push(`① 설정 파일 판 번호 config.js?v=${+m[1] + 1}(land/ · 같은 번호를 쓰던 첫 화면·길잡이도)`);
      ['index.html', 'solve/index.html'].forEach(f => { const t = rd(f); if (t.indexOf(m[0]) >= 0) out.set(f, t.split(m[0]).join(`assets/config.js?v=${+m[1] + 1}`)); });
    }
  }
  // ②
  if (/<meta name="robots" content="noindex, nofollow">\n/.test(lp)) { lp = lp.replace('<meta name="robots" content="noindex, nofollow">\n', ''); notes.push('② land/ 검색 제외 줄 지움'); }
  else notes.push('② land/ 는 이미 검색에 열려 있어요');
  if (lp !== rd('land/index.html')) out.set('land/index.html', lp);
  // ③
  let h = rd('index.html');
  if (h.indexOf('data-track="home_to_land"') < 0) {
    const comm = h.match(/\n(\s*)<a href="mine\/\?t=c" data-track="home_to_comm">[^\n]*<\/a>/);
    if (!comm) throw new Error('첫 화면에서 상가·건물 단추를 못 찾았어요');
    h = h.replace(comm[0], comm[0] + '\n' + comm[1] + HOME_TILE);
    h = h.replace('<a href="all/" data-track="home_to_all">', '<a class="sit-all" href="all/" data-track="home_to_all">');
    h = h.replace(/(\.sit>a:hover,\.sit>a\.swpick-on\{[^}]*\}\n)/, '$1' + SIT_ALL_CSS + '\n');
    const srow = h.match(/\n(\s*)<a class="srow" href="mine\/\?t=c" data-track="home_svc_comm">[^\n]*<\/a>/);
    if (srow) h = h.replace(srow[0], srow[0] + '\n' + srow[1] + HOME_SROW);
    out.set('index.html', h); notes.push("③ 첫 화면: '토지' 단추(3×3 유지, 전체 기능은 아래 한 줄) + 상황별로 찾기 줄");
  } else notes.push('③ 첫 화면에는 이미 토지 단추가 있어요');
  // ④
  let a = rd('all/index.html');
  if (a.indexOf('data-track="all_land"') < 0) {
    const row = a.match(/\n(\s*)<a class="arow" href="\.\.\/comm\/" data-track="all_comm">[^\n]*<\/a>/);
    if (!row) throw new Error('전체 기능에서 상가·건물 실거래가 줄을 못 찾았어요');
    a = a.replace(row[0], row[0] + '\n' + row[1] + ALL_ROW).replace('<h2 id="g-redevT">재개발·빌라·상가</h2>', '<h2 id="g-redevT">재개발·빌라·상가·토지</h2>');
    out.set('all/index.html', a); notes.push("④ 전체 기능: '땅 위험 신호 체크' 줄");
  } else notes.push('④ 전체 기능에는 이미 있어요');
  // ⑤
  const site = ((rd('assets/config.js').match(/SITE_URL:\s*'([^']+)'/) || [])[1] || '').replace(/\/$/, '');
  const sm = 'sitemaps/pages.xml', smx = fs.existsSync(path.join(root, sm)) ? rd(sm) : '';
  const loc = `<url><loc>${site}/land/</loc></url>`;
  if (smx && site && smx.indexOf(loc) < 0) {
    const lines = smx.split('\n'), i = lines.findIndex(l => /<url><loc>/.test(l) && l > loc && l !== `<url><loc>${site}/</loc></url>`);
    if (i >= 0) lines.splice(i, 0, loc); else lines.splice(lines.lastIndexOf('</urlset>'), 0, loc);
    out.set(sm, lines.join('\n')); notes.push('⑤ sitemaps/pages.xml 에 land/ 넣음');
  } else notes.push('⑤ sitemaps/pages.xml 에 이미 있거나 파일이 없어요');
  // ⑥
  if (out.size && !(out.size === 1 && out.has(sm))) {
    const sw = rd('sw.js'), m = sw.match(/const V = 'jdj-v(\d+)';/);
    if (m) { out.set('sw.js', sw.replace(m[0], `const V = 'jdj-v${+m[1] + 1}';`)); notes.push(`⑥ 서비스 워커 jdj-v${+m[1] + 1}`); }
  }
  return { out, notes };
}

if (require.main === module) {
  const apply = process.argv.includes('--apply'), P = plan();
  P.notes.forEach(n => console.log(n));
  if (!apply) console.log(`\n미리 보기예요. 바뀔 파일 ${P.out.size}개: ${[...P.out.keys()].join(', ') || '없음'}\n실제로 바꾸려면: node tools/land-launch.js --apply </dev/null`);
  else {
    P.out.forEach((v, f) => fs.writeFileSync(path.join(ROOT, f), v));
    console.log(`\n바꿨어요(${P.out.size}개 파일). 다음: node tools/land-test.js </dev/null · node tools/home-test.js </dev/null 로 확인 → 커밋·푸시(sw.js 판 번호는 원격 최신 + 1).`);
  }
}
module.exports = { plan, HOME_TILE };
