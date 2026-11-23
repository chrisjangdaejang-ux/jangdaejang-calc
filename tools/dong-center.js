/* 동네 파트너 이웃 동 계산용 — 법정동 가운데 점 표(assets/dong/{시·도 코드 2자리}.json) 만들기
   원자료: 공개 저장소 jangdaejang-timing data/coords.json(국토교통부 실거래 공개 자료의 시군구·법정동·지번 → 공공 지오코딩 좌표, 공동주택 위치)
   가운데 점 = 그 동 안 공동주택 위치들의 가운데 값(중앙값) — 법정동 경계 파일이 공개 저장소에 없어서 쓰는 대신 값이에요.
   읍·면 아래 '리'(예: '배방읍 공수리')는 읍·면 하나로 묶어요(브리핑 동 이름 칸이 띄어쓰기를 받지 않아서).
   실행: node tools/dong-center.js ../jangdaejang-timing/data/coords.json </dev/null
         (경로를 안 주면 https://raw.githubusercontent.com/chrisjangdaejang-ux/jangdaejang-timing/main/data/coords.json 을 받아요)
   결과 파일에는 동 이름·가운데 점·공동주택 수만 들어가요(개인 정보 없음). */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'dong');
const SRC_URL = 'https://raw.githubusercontent.com/chrisjangdaejang-ux/jangdaejang-timing/main/data/coords.json';
const NAME = /^[가-힣0-9·.]{1,20}$/;

function build(coords) {
  const pts = {};
  Object.keys(coords).forEach(k => {
    const p = k.split('|'), v = coords[k];
    if (p.length < 3 || !/^\d{5}$/.test(p[0]) || !Array.isArray(v) || !isFinite(v[0]) || !isFinite(v[1])) return;
    const dn = String(p[1]).trim().split(/\s+/)[0];
    if (!NAME.test(dn)) return;
    (pts[p[0] + '|' + dn] = pts[p[0] + '|' + dn] || []).push([+v[0], +v[1]]);
  });
  const med = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const bySido = {};
  Object.keys(pts).sort().forEach(k => {
    const a = pts[k], sd = k.slice(0, 2);
    (bySido[sd] = bySido[sd] || {})[k] = [Math.round(med(a.map(x => x[0])) * 1e5) / 1e5, Math.round(med(a.map(x => x[1])) * 1e5) / 1e5, a.length];
  });
  return bySido;
}

async function main() {
  const arg = process.argv[2];
  let coords;
  if (arg) coords = JSON.parse(fs.readFileSync(arg, 'utf8'));
  else { const r = await fetch(SRC_URL); if (!r.ok) throw new Error('원자료를 받지 못했어요: ' + r.status); coords = await r.json(); }
  const bySido = build(coords), at = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  fs.mkdirSync(OUT, { recursive: true });
  const index = {};
  Object.keys(bySido).forEach(sd => {
    const rows = bySido[sd];
    fs.writeFileSync(path.join(OUT, sd + '.json'), JSON.stringify({ src: '국토교통부 실거래 공개 자료 위치(공동주택)로 만든 법정동 가운데 점', at, rows }) + '\n');
    index[sd] = Object.keys(rows).length;
  });
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ at, sido: index }) + '\n');
  console.log('법정동 가운데 점:', Object.values(index).reduce((a, b) => a + b, 0), '곳 ·', Object.keys(index).length, '개 시·도');
}
if (require.main === module) main().catch(e => { console.error(String(e.message || e)); process.exit(1); });
module.exports = { build };
