/* 화면 점검(E2E)용 작은 웹 서버 — 실제 사이트와 같은 주소 구조로 띄움
   /jangdaejang-calc/… → 이 저장소 파일, /jangdaejang-data/… → 실제 공개 데이터(처음 한 번 받아 E2E_CACHE 에 저장)
   실행: node tools/e2e/server.js [포트]   (기본 8790)
   DATA_ORIGIN: 공개 데이터 원본(기본 raw.githubusercontent.com 의 jangdaejang-data gh-pages) */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const ORIGIN = process.env.DATA_ORIGIN || 'https://raw.githubusercontent.com/chrisjangdaejang-ux/jangdaejang-data/gh-pages/';
const CACHE = process.env.E2E_CACHE || path.join(require('os').tmpdir(), 'jdj-e2e-cache');
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
  const srv = http.createServer(async (req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    const send = (code, body, t) => { res.writeHead(code, { 'Content-Type': t || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(body); };
    try {
      if (u.startsWith('/jangdaejang-data/')) {
        const rel = u.slice('/jangdaejang-data/'.length);
        if (rel.includes('..')) return send(400, 'bad');
        const b = await fetchData(rel);
        return b ? send(200, b, type(rel)) : send(404, 'not found');
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
module.exports = { start };
if (require.main === module) start(+process.argv[2] || 8790).then(() => console.log('E2E 서버: http://127.0.0.1:' + (+process.argv[2] || 8790) + '/jangdaejang-calc/'));
