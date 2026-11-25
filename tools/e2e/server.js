/* 화면 점검(E2E)용 작은 웹 서버 — 실제 사이트와 같은 주소 구조로 띄움
   /jangdaejang-calc/… → 이 저장소 파일, /jangdaejang-data/… → 실제 공개 데이터(처음 한 번 받아 E2E_CACHE 에 저장, 공개본에 아직 없으면 tools/e2e/fallback/)
   실행: node tools/e2e/server.js [포트]   (기본 8790)
   DATA_ORIGIN: 공개 데이터 원본(주면 그대로 — 기본은 아래 '한 판 고정')
   한 판 고정(2026-11-25): 공개 데이터는 하루 4번 새로 만들어져요. 예전에는 파일마다 '처음 받은 때'의 판을 캐시에 계속 써서,
     지도(s00.json)는 11월 16일 판·내 집 시세(price/11710.json)는 그 뒤 판이 섞였고, 같은 헬리오시티 84㎡대가
     29억 2,200만(평당 11,363만) / 29억(평당 11,280만)으로 달라 보였어요(두 화면 계산 규칙은 같음).
     그래서 시작할 때 gh-pages 의 지금 커밋(git ls-remote)을 한 번 읽고, 모든 파일을 그 커밋 주소에서 받고, 캐시도 커밋마다 따로 둬요.
     커밋을 못 읽으면 이번 실행만 쓰는 새 캐시 폴더(실행 안에서는 한 판)로 받아요. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const REPO = 'chrisjangdaejang-ux/jangdaejang-data', BRANCH = 'gh-pages';
const CACHE_ROOT = process.env.E2E_CACHE || path.join(require('os').tmpdir(), 'jdj-e2e-cache');
/** 공개 데이터 커밋 주소(한 판) */
const snapOrigin = sha => `https://raw.githubusercontent.com/${REPO}/${sha}/`;
/** 커밋마다 따로 쓰는 캐시 폴더(다른 판 파일이 섞이지 않게) */
const cacheDirFor = sha => path.join(CACHE_ROOT, 'snap-' + String(sha).replace(/[^0-9a-f]/gi, '').slice(0, 40));
function headSha() {
  try {
    const out = cp.execFileSync('git', ['ls-remote', `https://github.com/${REPO}`, 'refs/heads/' + BRANCH], { timeout: 30000, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const m = /^([0-9a-f]{40})\s/m.exec(out); return m ? m[1] : null;
  } catch (e) { return null; }
}
let ORIGIN = process.env.DATA_ORIGIN || '', CACHE = '', SNAP = '';
function pin() {
  if (CACHE) return;
  if (ORIGIN) { CACHE = path.join(CACHE_ROOT, 'origin-' + crypto.createHash('sha1').update(ORIGIN).digest('hex').slice(0, 12)); return; }
  const sha = headSha();
  if (sha) { SNAP = sha; ORIGIN = snapOrigin(sha); CACHE = cacheDirFor(sha); }
  else { ORIGIN = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/`; CACHE = path.join(CACHE_ROOT, 'run-' + Date.now()); }
  /* 지난 판 캐시는 최근 2개만 남김(디스크 아끼기) */
  try {
    const ds = fs.readdirSync(CACHE_ROOT).filter(d => /^(snap|run)-/.test(d)).map(d => ({ d, t: fs.statSync(path.join(CACHE_ROOT, d)).mtimeMs })).sort((a, b) => b.t - a.t);
    ds.filter(x => path.join(CACHE_ROOT, x.d) !== CACHE).slice(1).forEach(x => fs.rmSync(path.join(CACHE_ROOT, x.d), { recursive: true, force: true }));
    fs.readdirSync(CACHE_ROOT).filter(d => /^[0-9a-f]{40}(\.404)?$/.test(d)).forEach(f => fs.rmSync(path.join(CACHE_ROOT, f), { force: true }));   // 예전 방식(판 구분 없는) 캐시 파일
  } catch (e) {}
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.gz': 'application/gzip', '.webp': 'image/webp' };
const type = f => TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream';
const inflight = new Map();
function fetchData(rel) {
  const key = crypto.createHash('sha1').update(rel).digest('hex'), file = path.join(CACHE, key);
  if (fs.existsSync(file)) return Promise.resolve(fs.readFileSync(file));
  if (fs.existsSync(file + '.404')) return Promise.resolve(null);
  if (inflight.has(rel)) return inflight.get(rel);
  const p = fetch(ORIGIN + rel).then(async r => {
    fs.mkdirSync(CACHE, { recursive: true });
    if (r.status === 404) { fs.writeFileSync(file + '.404', ''); return null; }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const b = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(file, b); return b;
  }).finally(() => inflight.delete(rel));
  inflight.set(rel, p); return p;
}
function start(port) {
  pin();
  const srv = http.createServer(async (req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    const send = (code, body, t) => { res.writeHead(code, { 'Content-Type': t || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(body); };
    try {
      if (u.startsWith('/jangdaejang-data/')) {
        const rel = u.slice('/jangdaejang-data/'.length);
        if (rel.includes('..')) return send(400, 'bad');
        const b = await fetchData(rel);
        if (b) return send(200, b, type(rel));
        /* 공개 데이터에 아직 없는 새 파일(엔진이 다음 정기 실행에서 처음 만듦)은 tools/e2e/fallback/ 의 같은 경로 파일로 — 실제 엔진 결과를 줄인 것 */
        const fb = path.join(__dirname, 'fallback', rel);
        if (fb.startsWith(path.join(__dirname, 'fallback')) && fs.existsSync(fb)) return send(200, fs.readFileSync(fb), type(rel));
        return send(404, 'not found');
      }
      if (u === '/' ) { res.writeHead(302, { Location: '/jangdaejang-calc/' }); return res.end(); }
      if (!u.startsWith('/jangdaejang-calc/') && u !== '/jangdaejang-calc') return send(404, 'not found');
      let f = path.join(ROOT, u.slice('/jangdaejang-calc'.length));
      if (!f.startsWith(ROOT)) return send(400, 'bad');
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
        if (!u.endsWith('/')) { res.writeHead(301, { Location: u + '/' }); return res.end(); }
        f = path.join(f, 'index.html');
      }
      if (!fs.existsSync(f)) return send(404, '<!doctype html><title>404</title>404', 'text/html; charset=utf-8');
      return send(200, fs.readFileSync(f), type(f));
    } catch (e) { send(502, String(e && e.message || e)); }
  });
  return new Promise(r => srv.listen(port, '127.0.0.1', () => r(srv)));
}
module.exports = { start, snapOrigin, cacheDirFor, snapshot: () => ({ origin: ORIGIN, cache: CACHE, sha: SNAP }) };
if (require.main === module) start(+process.argv[2] || 8790).then(() => console.log('E2E 서버: http://127.0.0.1:' + (+process.argv[2] || 8790) + '/jangdaejang-calc/ · 공개 데이터 ' + (SNAP ? '커밋 ' + SNAP.slice(0, 12) : ORIGIN)));
