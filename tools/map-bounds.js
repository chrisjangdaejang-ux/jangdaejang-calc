/* 지도 화면(map/)용 시·도 경계 상자와 구·시 가운데 좌표 만들기 — 실행: node tools/map-bounds.js [자료 폴더, 기본 /tmp/dchk/data]
   공개 자료의 단지 좌표(data/sNN_xy.json)만 읽어서 assets/map-geo.json 을 쓴다. (점수·시세 값은 넣지 않음 — 위치만)
   - sido[id] = { b: [서, 남, 동, 북] 단지 좌표를 모두 담는 상자(조금 여유), c: [경도, 위도] 단지 좌표 중앙값 }
   - sgg[구코드] = [경도, 위도] 그 구 단지 좌표 중앙값 (구 묶음 말풍선 자리)
   단지 좌표가 바뀌거나 새 시·도가 생기면 다시 실행한다. 지도는 이 파일이 없어도 시·도 파일을 모두 읽어 동작한다(느릴 뿐). */
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || '/tmp/dchk/data';
const IX = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
const med = a => { const v = a.slice().sort((x, y) => x - y), n = v.length; return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2; };
const r5 = v => Math.round(v * 1e5) / 1e5;
const out = { _doc: 'tools/map-bounds.js 로 만든 파일(단지 좌표의 상자·중앙값). 손으로 고치지 말 것', sido: {}, sgg: {} };
const bySgg = {};
for (const s of IX.sido) {
  const f = path.join(dir, s.xy || (s.id + '_xy.json'));
  if (!fs.existsSync(f)) continue;
  const xy = JSON.parse(fs.readFileSync(f, 'utf8')).xy || {};
  const xs = [], ys = [];
  for (const [k, p] of Object.entries(xy)) {
    if (!Array.isArray(p) || !isFinite(p[0]) || !isFinite(p[1])) continue;
    xs.push(p[0]); ys.push(p[1]);
    const code = k.split('|')[0];
    (bySgg[code] = bySgg[code] || [[], []])[0].push(p[0]); bySgg[code][1].push(p[1]);
  }
  if (!xs.length) continue;
  const pad = 0.02;
  out.sido[s.id] = { b: [r5(Math.min(...xs) - pad), r5(Math.min(...ys) - pad), r5(Math.max(...xs) + pad), r5(Math.max(...ys) + pad)], c: [r5(med(xs)), r5(med(ys))] };
}
for (const [code, [xs, ys]] of Object.entries(bySgg)) out.sgg[code] = [r5(med(xs)), r5(med(ys))];
const dst = path.join(__dirname, '..', 'assets', 'map-geo.json');
fs.writeFileSync(dst, JSON.stringify(out));
console.log(`시·도 ${Object.keys(out.sido).length}곳, 구·시 ${Object.keys(out.sgg).length}곳 → ${dst}`);
