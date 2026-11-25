/* 같은 단지·평형 '최근 시세'가 지도 카드와 내 집 시세에서 같은지 — 실행: node tools/price-consistency-test.js [자료 폴더(선택, 예: /tmp/dchk/data)]
   원인 기록(2026-11-25): 헬리오시티 84㎡대가 지도 29억 2,200만 / 내 집 시세 29억으로 달랐던 것은 두 화면 계산 규칙 차이가 아니라,
   화면 점검 서버(tools/e2e/server.js)가 공개 데이터를 파일마다 처음 받은 때의 판으로 계속 써서 지도용 s00.json(평당 11,363만, 11월 16일 판)과
   내 집 시세용 price/11710.json(평당 11,280만, 뒤 판)이 섞였기 때문. 두 화면 모두 '최근 3개월 실거래 평당가 중간값 × 대표 전용 ÷ 3.3058, 100만 원 반올림'.
   ① 규칙: 지도(map-core bandInfo)와 내 집 시세(mine-core bandSummary·areaUnit 대표 타입)가 같은 행에서 같은 금액·기준 달
   ② 서버: 공개 데이터를 한 커밋 주소로 고정하고 캐시를 커밋마다 따로 둠
   ③ (자료 폴더를 주면) 같은 판의 sNN.json 과 price/{구}.json 의 모든 단지·평형 최근 시세가 같은지 */
const fs = require('fs'), path = require('path');
const M = require('../assets/mine-core.js');
global.JDJ_MINE = M;
const C = require('../assets/map-core.js');
const S = require('./e2e/server.js');
const rows = [];
function check(name, got, want) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want }); }
const months = []; for (let y = 2023, m = 11; months.length < 36; m++) { if (m > 12) { m = 1; y++; } months.push(String(y) + String(m).padStart(2, '0')); }
const ser = last => months.map((_, i) => i === 35 ? last : i === 34 ? 0 : 11000);
const mineOf = (u, ar) => { const v = M.areaUnit(u, ar, months); const b = M.bandSummary(v, months); return [b.price, b.at]; };
const mapOf = u => { const b = C.bandInfo(u, months); return [b.price, b.at]; };

/* ① 헬리오시티 84㎡대 모양(2026-11-25 판 값): 평당 11,280만 × 85.0㎡ */
const helio = ['11710', '가락동', '헬리오시티', '84㎡대', 85.0, 452, ser(11280), '0'.repeat(36), '913', 1];
check('헬리오시티 84㎡대: 지도 = 내 집 시세', mapOf(helio), mineOf(helio));
check('헬리오시티 84㎡대 금액 = 29억(11,280 × 85 ÷ 3.3058 → 100만 원 반올림)', mapOf(helio)[0], 290000);
check('옛 판 평당가(11,363)면 29억 2,200만 — 한 화면만 옛 판이면 이렇게 달라 보임', M.toPrice(11363, 85.0), 292200);
const last2 = ['11710', '가락동', 'X', '59㎡대', 59.9, 10, months.map((_, i) => i === 34 ? 15000 : 0), '0'.repeat(36), '1', 1];
check('마지막 달 거래 없으면 둘 다 앞 달 값·같은 기준 달', mapOf(last2), mineOf(last2));
/* 한 평형에 전용 타입이 여럿(칸 13): 고르지 않으면 둘 다 대표 타입(칸 4·6) */
const multi = helio.slice(0, 10).concat([null, [], {}, [[59.9, 30, 59, 60, ser(14000)], [84.9, 40, 84, 85, 0]]]);
multi[4] = 84.9;
check('전용 타입 여럿: 고르지 않으면 지도 = 내 집 시세(대표 타입)', mapOf(multi), mineOf(multi));

/* ② 서버 한 판 고정 */
const sha = 'a'.repeat(40);
check('공개 데이터를 커밋 주소에서 받음', S.snapOrigin(sha), `https://raw.githubusercontent.com/chrisjangdaejang-ux/jangdaejang-data/${sha}/`);
check('캐시 폴더가 커밋마다 다름', S.cacheDirFor(sha) !== S.cacheDirFor('b'.repeat(40)) && /snap-a{40}$/.test(S.cacheDirFor(sha)), true);

/* ③ 같은 판 실제 자료 */
const dir = process.argv[2];
if (dir && fs.existsSync(path.join(dir, 'index.json'))) {
  const ix = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  let n = 0, diff = [];
  for (const s of ix.sido) {
    const f = path.join(dir, s.id + '.json'); if (!fs.existsSync(f)) continue;
    const us = JSON.parse(fs.readFileSync(f, 'utf8')).units || [], P = {};
    for (const u of us) {
      const g = u[0]; if (!P[g]) { const pf = path.join(dir, 'price', g + '.json'); P[g] = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')).units : []; }
      const pu = P[g].find(x => x[1] === u[1] && x[2] === u[2] && x[3] === u[3] && String(x[8]) === String(u[8])); if (!pu) continue;
      n++; const a = C.bandInfo(u, ix.months), b = M.bandSummary(pu, ix.months);
      if (a.price !== b.price) diff.push(`${u[2]} ${u[3]} 지도 ${a.price} / 내 집 ${b.price}`);
    }
  }
  check(`같은 판 자료: 지도·내 집 시세 최근 시세가 모두 같음(${n.toLocaleString()}개)`, diff.slice(0, 5), []);
}
const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `  got=${JSON.stringify(r.got)} want=${JSON.stringify(r.want)}`)));
console.log(`${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
