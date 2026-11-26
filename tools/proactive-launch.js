/* '집예보가 먼저 챙겨 드려요' 출시 — 한 번에 한 커밋 (설명: docs/launch_checklist.md)
   미리 보기(아무것도 안 바꿈):  node tools/proactive-launch.js </dev/null
   실제로 바꾸기:              node tools/proactive-launch.js --apply </dev/null

   하는 일(웹 저장소):
   ① assets/config.js PROACTIVE_ENABLED: false → true (화면의 '먼저 챙겨 드려요' 칸·소개 페이지·기억하는 것·구역 따라보기가 보이기 시작)
   ② tools/agent-backend.gs const PROACTIVE_ENABLED = false → true + 맨 위에 새 판 번호(지금 가장 큰 vNN + 1) 변경 요약
      (서버는 Apps Script 에 붙여 넣고 [배포 관리 → 수정 → 새 버전]으로 다시 배포해야 반영 — 따로 실행할 함수 없음)
   ③ alerts/index.html 검색 제외(noindex) 줄 지우기 → 다음 날 검색용 페이지 생성(엔진 seo_pages.py)이 sitemaps/pages.xml 에 저절로 넣음
   ④ sitemaps/pages.xml 에 alerts/ 주소를 바로 넣기(엔진이 다시 만들어도 같은 주소가 들어가요)
   ⑤ sw.js jdj-vNN + 1
   여러 번 돌려도 같은 결과(이미 바뀐 곳은 그대로). */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

function plan(opt) {
  opt = opt || {};
  const root = opt.root || ROOT, out = new Map(), notes = [];
  const rd = f => out.has(f) ? out.get(f) : fs.readFileSync(path.join(root, f), 'utf8');
  // ①
  const cfg = rd('assets/config.js');
  if (/PROACTIVE_ENABLED: false,/.test(cfg)) { out.set('assets/config.js', cfg.replace('PROACTIVE_ENABLED: false,', 'PROACTIVE_ENABLED: true,')); notes.push('① 화면 설정 PROACTIVE_ENABLED → true'); }
  else notes.push('① 화면 설정은 이미 켜져 있어요');
  // ②
  let gs = rd('tools/agent-backend.gs');
  if (/^const PROACTIVE_ENABLED = false;/m.test(gs)) {
    const nums = (gs.slice(0, 40000).match(/\* v(\d+) 변경 요약/g) || []).map(x => +x.match(/v(\d+)/)[1]), cur = Math.max.apply(null, nums.concat([0])), nx = cur + 1;
    gs = gs.replace(/^const PROACTIVE_ENABLED = false;/m, 'const PROACTIVE_ENABLED = true;');
    gs = gs.replace(` * v${cur} 변경 요약`, ` * v${nx} 변경 요약 (v${cur} 위에 다시 배포. 따로 실행할 함수 없음 — 시트 변경 없음)\n *  - '집예보가 먼저 챙겨 드려요' 출시: PROACTIVE_ENABLED = true (tools/proactive-launch.js). 화면 assets/config.js 도 함께 켜짐.\n *  - 검증: node tools/proactive-test.js </dev/null\n *\n * v${cur} 변경 요약`);
    out.set('tools/agent-backend.gs', gs); notes.push(`② 서버 PROACTIVE_ENABLED → true, 서버 판 v${nx}(다시 배포 필요, 따로 실행할 함수 없음)`);
  } else notes.push('② 서버는 이미 켜져 있어요');
  // ③
  const al = rd('alerts/index.html');
  if (/<meta name="robots" content="noindex">\n/.test(al)) { out.set('alerts/index.html', al.replace('<meta name="robots" content="noindex">\n', '')); notes.push('③ alerts/ 검색 제외 줄 지움'); }
  else notes.push('③ alerts/ 는 이미 검색에 열려 있어요');
  // ④
  const site = ((rd('assets/config.js').match(/SITE_URL:\s*'([^']+)'/) || [])[1] || '').replace(/\/$/, '');
  const sm = 'sitemaps/pages.xml', smx = fs.existsSync(path.join(root, sm)) ? rd(sm) : '';
  const loc = `<url><loc>${site}/alerts/</loc></url>`;
  if (smx && site && smx.indexOf(loc) < 0) {
    const lines = smx.split('\n'), i = lines.findIndex(l => /<url><loc>/.test(l) && l > loc && l !== `<url><loc>${site}/</loc></url>`);
    if (i >= 0) lines.splice(i, 0, loc); else lines.splice(lines.lastIndexOf('</urlset>'), 0, loc);
    out.set(sm, lines.join('\n')); notes.push('④ sitemaps/pages.xml 에 alerts/ 넣음');
  } else notes.push('④ sitemaps/pages.xml 에 이미 있거나 파일이 없어요(엔진이 다음 날 만들어요)');
  // ⑤
  if (out.size && !(out.size === 1 && out.has(sm))) {
    const sw = rd('sw.js'), m = sw.match(/const V = 'jdj-v(\d+)';/);
    if (m) { out.set('sw.js', sw.replace(m[0], `const V = 'jdj-v${+m[1] + 1}';`)); notes.push(`⑤ 서비스 워커 jdj-v${+m[1] + 1}`); }
  }
  return { out, notes };
}

if (require.main === module) {
  const apply = process.argv.includes('--apply'), P = plan();
  P.notes.forEach(n => console.log(n));
  if (!apply) { console.log(`\n미리 보기예요. 바뀔 파일 ${P.out.size}개: ${[...P.out.keys()].join(', ') || '없음'}\n실제로 바꾸려면: node tools/proactive-launch.js --apply </dev/null`); }
  else {
    P.out.forEach((v, f) => fs.writeFileSync(path.join(ROOT, f), v));
    console.log(`\n바꿨어요(${P.out.size}개 파일). 다음: node tools/proactive-test.js </dev/null 로 확인 → 커밋·푸시 → 서버(tools/agent-backend.gs)를 Apps Script 에 붙여 넣고 새 버전으로 배포.`);
  }
}
module.exports = { plan };
