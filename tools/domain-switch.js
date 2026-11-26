/* 새 도메인으로 바꾸기 — 한 번에 한 커밋 (설명: docs/domain_switch.md)
   미리 보기(아무것도 안 바꿈):  node tools/domain-switch.js </dev/null
   실제로 바꾸기:              node tools/domain-switch.js --apply </dev/null
   엔진도 함께:                node tools/domain-switch.js --apply --engine ../jangdaejang-engine </dev/null
   다른 도메인:                --domain example.com   (기본 zipyebo.com)
   저장값 옮기기 다리 화면:      --bridge ../jangdaejang-timing/site   → site/move/index.html (공개 데이터 저장소 jangdaejang-data 에 실려 나감)
   저장값 옮기기 켜기:          --store-move-on   (다리 화면이 https://chrisjangdaejang-ux.github.io/jangdaejang-data/move/ 에서 열린 뒤에만)

   하는 일(웹 저장소):
   ① CNAME 파일 만들기(내용: 도메인 한 줄) — GitHub Pages 가 이 도메인으로 사이트를 열고, 예전 github.io 주소는 새 도메인으로 넘겨 줌
   ② assets/config.js SITE_URL → https://도메인
   ③ 화면 파일(html·js·xml·txt·webmanifest·json) 속 예전 대표 주소(https://chrisjangdaejang-ux.github.io/jangdaejang-calc) → 새 주소
      (단지·청약 검색용 페이지 apt/·cy/·sitemaps/ 는 매일 도는 검색용 페이지 생성이 SITE_URL 을 읽어 다시 만듦 — 여기선 건드리지 않음)
   ④ robots.txt 의 경로 앞부분 /jangdaejang-calc/ → /
   ⑤ 서버(tools/agent-backend.gs) WEB_ROOT 한 줄 → 새 주소(서버는 Apps Script 에 붙여 넣고 다시 배포해야 반영)
   ⑥ 바뀐 공용 JS 의 ?v= 판 번호 +1, sw.js jdj-vNN +1
   ⑦ assets/store-move.js 새 주소(DEST)·켜기(ON, --store-move-on 일 때만) — 바뀌면 track.js 가 붙이는 store-move.js?v= +1
   화면의 내부 경로는 이미 상대 경로·자동 감지(JB.SITE)라 바꿀 필요 없음. 공개 데이터는 계속 github.io/jangdaejang-data 에서 읽음. */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');

const OLD = 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc';
const DEFAULT_DOMAIN = 'zipyebo.com';
const ROOT = path.join(__dirname, '..');
const SKIP_DIR = /^(apt|cy|sitemaps|docs|design|\.git)\//;
const TEXT = /\.(html|js|xml|txt|webmanifest|json)$/;

function plan(opt) {
  opt = opt || {};
  const root = opt.root || ROOT;
  const domain = String(opt.domain || DEFAULT_DOMAIN).trim().toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) throw new Error('도메인 형식 오류: ' + domain);
  const NEW = 'https://' + domain;
  const files = cp.execFileSync('git', ['-C', root, 'ls-files', '-z'], { maxBuffer: 1 << 28 }).toString().split('\0').filter(Boolean);
  const out = new Map();     // 경로 → 새 내용
  const rd = f => out.has(f) ? out.get(f) : fs.readFileSync(path.join(root, f), 'utf8');
  // ①
  out.set('CNAME', domain + '\n');
  // ②
  const cfg = rd('assets/config.js');
  const cfg2 = cfg.replace(/(\bSITE_URL\s*:\s*')[^']*(')/, '$1' + NEW + '$2');
  if (cfg2 === cfg && !cfg.includes("SITE_URL: '" + NEW + "'")) throw new Error('config.js SITE_URL 줄을 찾지 못함');
  out.set('assets/config.js', cfg2);
  // ③
  for (const f of files) {
    if (SKIP_DIR.test(f) || !TEXT.test(f) || f === 'assets/config.js') continue;
    if (/^tools\//.test(f)) continue;                     // 검사·도구 파일은 그대로
    const s = rd(f);
    if (!s.includes(OLD)) continue;
    out.set(f, s.split(OLD + '/').join(NEW + '/').split(OLD).join(NEW));
  }
  // ④
  if (files.includes('robots.txt')) {
    const s = rd('robots.txt');
    out.set('robots.txt', s.replace(/^((?:Allow|Disallow):\s*)\/jangdaejang-calc\//gm, '$1/').split(OLD).join(NEW));
  }
  // ⑤
  const gs = 'tools/agent-backend.gs';
  if (files.includes(gs)) {
    const s = rd(gs), t = s.replace(/^const WEB_ROOT = '[^']*';/m, "const WEB_ROOT = '" + NEW + "/';");
    if (t === s && !s.includes("const WEB_ROOT = '" + NEW + "/';")) throw new Error('agent-backend.gs WEB_ROOT 줄을 찾지 못함');
    out.set(gs, t);
  }
  // ⑦ 저장값 옮기기(store-move.js): 새 주소, 켜기
  const smf = 'assets/store-move.js';
  if (files.includes(smf)) {
    const s = rd(smf);
    let t = s.replace(/^(\s*DEST:\s*')[^']*(')/m, '$1' + NEW + '$2');
    if (opt.storeMoveOn) t = t.replace(/^(\s*ON:\s*)false\b/m, '$1true');
    if (t !== s) {
      out.set(smf, t);
      const tr = rd('assets/track.js'), tr2 = tr.replace(/store-move\.js\?v=(\d+)/, (m0, n) => 'store-move.js?v=' + (+n + 1));
      if (tr2 === tr) throw new Error('track.js 의 store-move.js?v= 를 찾지 못함');
      out.set('assets/track.js', tr2);
    }
  }
  // ⑥ 바뀐 공용 JS 판 번호
  const changedJs = [...out.keys()].filter(f => /\.js$/.test(f) && f !== 'sw.js' && !/^tools\//.test(f) && rd(f) !== fs.readFileSync(path.join(root, f), 'utf8'));
  const refFiles = files.filter(f => /\.(html|js)$/.test(f) && !SKIP_DIR.test(f) && !/^tools\//.test(f));
  for (const js of changedJs) {
    const re = new RegExp('((?:^|[/"\'`])' + js.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\?v=(\\d+)', 'g');
    let max = 0;
    for (const f of refFiles) { const s = rd(f); let m; re.lastIndex = 0; while ((m = re.exec(s))) max = Math.max(max, +m[2]); }
    if (!max) continue;
    for (const f of refFiles) { const s = rd(f), t = s.replace(re, (m0, a) => a + '?v=' + (max + 1)); if (t !== s) out.set(f, t); }
  }
  const sw = rd('sw.js'), m = sw.match(/const V = 'jdj-v(\d+)';/);
  if (!m) throw new Error('sw.js 판 번호를 찾지 못함');
  out.set('sw.js', sw.replace(m[0], "const V = 'jdj-v" + (+m[1] + 1) + "';"));
  // 실제로 바뀌는 것만
  for (const [f, s] of [...out]) { const p = path.join(root, f); if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === s) out.delete(f); }
  return { domain, NEW, out };
}

function engine(dir, NEW, apply) {
  const p = path.join(dir, 'scripts', 'brand.py');
  const s = fs.readFileSync(p, 'utf8'), t = s.replace(/^(SITE_URL = \(os\.environ\.get\('JDJ_SITE_URL'\) or ''\)\.strip\(\)\.rstrip\('\/'\) or ')[^']*(')/m, '$1' + NEW + '$2');
  if (t === s && !s.includes("or '" + NEW + "'")) throw new Error('엔진 scripts/brand.py SITE_URL 줄을 찾지 못함');
  if (apply && t !== s) fs.writeFileSync(p, t);
  return t !== s;
}

if (require.main === module) {
  const a = process.argv.slice(2), arg = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const apply = a.includes('--apply');
  const P = plan({ domain: arg('--domain') || DEFAULT_DOMAIN, storeMoveOn: a.includes('--store-move-on') });
  console.log((apply ? '바꿈' : '미리 보기') + ': ' + OLD + ' → ' + P.NEW + ' · 파일 ' + P.out.size + '개');
  for (const f of [...P.out.keys()].slice(0, 40)) console.log('  ' + f);
  if (P.out.size > 40) console.log('  … 외 ' + (P.out.size - 40) + '개');
  if (apply) for (const [f, s] of P.out) fs.writeFileSync(path.join(ROOT, f), s);
  const eng = arg('--engine');
  if (eng) console.log('엔진 scripts/brand.py SITE_URL: ' + (engine(eng, P.NEW, apply) ? (apply ? '바꿈' : '바꿀 예정') : '이미 같음'));
  const br = arg('--bridge');
  if (br) {
    const html = require('../assets/store-move.js').buildBridge(P.NEW), f = path.join(br, 'move', 'index.html');
    console.log('저장값 옮기기 다리 화면: ' + f + (apply ? ' 저장함' : ' 저장 예정') + ' (' + html.length + '자)');
    if (apply) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); }
  }
  if (!apply) console.log('실제로 바꾸려면 --apply 를 붙여 다시 실행하세요.');
}
module.exports = { plan, engine, OLD, DEFAULT_DOMAIN };
