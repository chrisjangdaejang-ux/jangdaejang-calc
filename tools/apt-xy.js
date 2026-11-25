/* 전세 갈아타기(switch/rent/) 거리 계산용 — 공동주택 위치 표(assets/xy/{시·도 코드 2자리}.json) 만들기
   원자료: 공개 저장소 jangdaejang-timing data/coords.json(국토교통부 실거래 공개 자료의 시군구·법정동·지번 → 공공 지오코딩 좌표, 공동주택 위치)
   — 동 가운데 점(tools/dong-center.js, assets/dong/)과 같은 원자료예요. 점수 자료가 있는 단지만 담긴 공개 데이터 sNN_xy.json 보다 단지가 많아요.
   실행: node tools/apt-xy.js ../jangdaejang-timing/data/coords.json </dev/null
         (경로를 안 주면 https://raw.githubusercontent.com/chrisjangdaejang-ux/jangdaejang-timing/main/data/coords.json 을 받아요)
   결과 파일에는 '구코드|동|지번' → [경도, 위도](소수 5자리)만 들어가요(개인 정보 없음). */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'xy');
const SRC_URL = 'https://raw.githubusercontent.com/chrisjangdaejang-ux/jangdaejang-timing/main/data/coords.json';
const KEY = /^\d{5}\|[가-힣0-9·. ]{1,30}\|[0-9A-Za-z가-힣\-]{1,20}$/;

function build(coords) {
  const by = {};
  Object.keys(coords).sort().forEach(k => {
    const v = coords[k];
    if (!KEY.test(k) || !Array.isArray(v) || !isFinite(v[0]) || !isFinite(v[1])) return;
    const lon = +v[0], lat = +v[1];
    if (lon < 124 || lon > 132 || lat < 33 || lat > 39) return;                 // 대한민국 범위 밖은 버림
    (by[k.slice(0, 2)] = by[k.slice(0, 2)] || {})[k] = [Math.round(lon * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5];
  });
  return by;
}
async function main() {
  const arg = process.argv[2];
  let coords;
  if (arg) coords = JSON.parse(fs.readFileSync(arg, 'utf8'));
  else { const r = await fetch(SRC_URL); if (!r.ok) throw new Error('원자료를 받지 못했어요: ' + r.status); coords = await r.json(); }
  const by = build(coords), at = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  fs.mkdirSync(OUT, { recursive: true });
  const index = {};
  Object.keys(by).forEach(sd => {
    fs.writeFileSync(path.join(OUT, sd + '.json'), JSON.stringify({ src: '국토교통부 실거래 공개 자료 주소를 공공 지오코딩으로 바꾼 공동주택 위치', at, rows: by[sd] }) + '\n');
    index[sd] = Object.keys(by[sd]).length;
  });
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ at, sido: index }) + '\n');
  console.log('공동주택 위치:', Object.values(index).reduce((a, b) => a + b, 0), '곳 ·', Object.keys(index).length, '개 시·도');
}
if (require.main === module) main().catch(e => { console.error(String(e.message || e)); process.exit(1); });
module.exports = { build };
