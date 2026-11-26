/* 고민 해결 길잡이 '3~5억으로 재개발 투자한다면?' 자료 만들기 — 구역 안 빌라(연립·다세대) 매매 실거래를 구역별로 모아요
   실행: node tools/redev-budget-build.js <jangdaejang-data 의 data 폴더> [출력 파일=data/redev-budget.json] </dev/null
   읽는 자료(엔진이 매일 만드는 공개 자료 그대로):
     data/villa/index.json      서울 구 목록·자료 기간(from~to)
     data/villa/{구}.json        z = 그 구 정비구역 [{n 이름, lv 단계, bd 공식 경계 있음}], b = 건물 카드 {d 동, j 지번, tr 최근 3년 매매 [계약일, 금액(만 원), 전용, 대지권, 층], z:[[구역 번호, 위치, 위험]]}
                                위치: 0 공식 경계 안 · 1 구역 대표 지번 · 2 같은 동(경계 자료 없음) · 3 같은 동 구역 밖(공식 경계)
   만드는 것: {v, from, to, src, z:{'구코드|구역 이름': {i:[[금액, 계약월, 전용, 대지권]…](위치 0·1 거래), ib(건물 수), d:{천만 원 단위 금액: 건수}(위치 2 거래), db, bd}}}
   - 숫자를 새로 만들지 않아요. 실거래 금액·날짜·면적을 그대로 옮기고, 같은 동(경계 미확인) 거래만 크기를 줄이려고 천만 원 단위로 묶어 셉니다.
   - 단독·다가구 실거래는 이 자료(연립·다세대)에 없어요 — 화면에 그렇게 적어요.
   - 엔진(scripts/redev_map.py)이 data/redev/budget.json 을 같은 모양으로 매일 만들면 화면은 그쪽을 먼저 읽어요(assets/guide-redev.js). */
'use strict';
const fs = require('fs'), path = require('path');
const dir = process.argv[2], out = process.argv[3] || path.join(__dirname, '..', 'data', 'redev-budget.json');
if (!dir || !fs.existsSync(path.join(dir, 'villa', 'index.json'))) { console.error('data 폴더를 넣어 주세요: node tools/redev-budget-build.js <data>'); process.exit(1); }
const IX = JSON.parse(fs.readFileSync(path.join(dir, 'villa', 'index.json'), 'utf8'));
const seoul = (IX.sido || []).find(s => s.n === '서울특별시');
const Z = {};
let nb = 0, nt = 0;
for (const g of (seoul ? seoul.g : [])) {
  const f = path.join(dir, 'villa', g.c + '.json'); if (!fs.existsSync(f)) continue;
  const V = JSON.parse(fs.readFileSync(f, 'utf8')), zs = V.z || [];
  zs.forEach(z => { Z[g.c + '|' + z.n] = Z[g.c + '|' + z.n] || { i: [], ib: 0, d: {}, db: 0, bd: z.bd ? 1 : 0 }; });
  for (const b of V.b || []) {
    for (const zz of b.z || []) {
      const z = zs[zz[0]]; if (!z) continue;
      const o = Z[g.c + '|' + z.n], gr = zz[1];
      if (gr === 3) continue;                                            // 공식 경계상 구역 밖
      const tr = (b.tr || []).filter(t => t && +t[1] > 0 && /^\d{8}$/.test(String(t[0])));
      if (!tr.length) continue;
      if (gr <= 1) { o.ib++; tr.forEach(t => { o.i.push([+t[1], String(t[0]).slice(0, 6), +t[2] || 0, +t[3] || 0]); nt++; }); }
      else { o.db++; tr.forEach(t => { const k = String(Math.floor(+t[1] / 1000)); o.d[k] = (o.d[k] || 0) + 1; }); }
      nb++;
    }
  }
}
Object.keys(Z).forEach(k => { const o = Z[k]; o.i.sort((a, b) => a[0] - b[0]); if (!o.i.length && !o.db) delete Z[k]; });
const res = { v: IX.updated || '', from: IX.from || '', to: IX.to || '', src: '국토교통부 연립·다세대 매매 실거래(최근 3년) · 서울시 정비사업 추진현황 구역 경계', note: '위치 0·1(공식 경계 안·구역 대표 지번) 거래는 i, 위치 2(같은 동, 구역 경계 자료 없음) 거래는 d 에 천만 원 단위로 셈', z: Z };
fs.writeFileSync(out, JSON.stringify(res));
console.log(`구역 ${Object.keys(Z).length}곳 · 구역 안 거래 ${nt.toLocaleString()}건 · 연결 ${nb.toLocaleString()}건 → ${out} (${Math.round(fs.statSync(out).size / 1024)}KB)`);
