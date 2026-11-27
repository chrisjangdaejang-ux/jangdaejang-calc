/* 광고 지역 등급표(assets/ad-tiers.json) 다시 만들기 — 해마다 한 번(대표 승인 2026-11-27)
   규칙은 assets/leads-core.js LD_REGION 한 곳: 시·군·구별 최근 12개월 아파트 거래 금액 합계(건수 × 평균 거래가, 84㎡ 환산)
   상위 20% = 1등급 · 다음 30% = 2등급 · 나머지 50% = 3등급. 기간형 광고 지역 단가(/ad/)와 분양 상담 연결 단가가 같은 표를 써요.
   자료: 공개 자료 저장소 jangdaejang-data 의 data/index.json(sgg: 월별 3.3㎡당 평균가 s · 거래 건수 c).
   사용: node tools/ad-tiers-build.js <index.json 경로>            → 바뀌는 등급만 보여 줌(파일은 그대로)
         node tools/ad-tiers-build.js <index.json 경로> --apply    → assets/ad-tiers.json 을 새로 씀 */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('../assets/leads-core.js');
const OUT = path.join(__dirname, '..', 'assets', 'ad-tiers.json');

function build(ix) {
  const G = L.regionGrades(ix.sgg || {}), months = (ix.months || []).slice(-L.REGION.months);
  const tiers = Object.keys(G).sort((a, b) => G[a].rank - G[b].rank)
    .map(code => ({ sd: ix.sgg[code].sido, n: ix.sgg[code].name, t: G[code].g, g: code }));
  return {
    asof: String(ix.dataTo || months[months.length - 1] || '').replace(/^(\d{4})(\d{2})$/, '$1-$2'),
    basis: `최근 12개월(${months[0] ? months[0].replace(/^(\d{4})(\d{2})$/, '$1.$2') : ''}~${months.length ? months[months.length - 1].replace(/^(\d{4})(\d{2})$/, '$1.$2') : ''}) 아파트 거래 금액 합계(거래 건수 × 평균 거래가, 84㎡ 환산) 상위 ${L.REGION.top}% = 1등급, 다음 ${L.REGION.mid}% = 2등급, 나머지 ${100 - L.REGION.top - L.REGION.mid}% = 3등급 · 해마다 다시 계산`,
    rule: { top: L.REGION.top, mid: L.REGION.mid, months: L.REGION.months, premiumMan: L.REGION.premiumMan },
    tiers
  };
}
module.exports = { build };
if (require.main === module) {
  const src = process.argv[2];
  if (!src) { console.log('사용: node tools/ad-tiers-build.js <index.json 경로> [--apply]'); process.exit(1); }
  const next = build(JSON.parse(fs.readFileSync(src, 'utf8')));
  let prev = { tiers: [] }; try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}
  const P = {}; prev.tiers.forEach(t => { P[t.sd + '|' + t.n] = t.t; });
  const moved = next.tiers.filter(t => P[t.sd + '|' + t.n] !== t.t);
  const cnt = [1, 2, 3].map(g => next.tiers.filter(t => t.t === g).length);
  console.log(`시·군·구 ${next.tiers.length}곳 · 1등급 ${cnt[0]} · 2등급 ${cnt[1]} · 3등급 ${cnt[2]} · 등급이 바뀌는 곳 ${moved.length}곳`);
  moved.slice(0, 40).forEach(t => console.log(`  ${t.sd} ${t.n}: ${P[t.sd + '|' + t.n] || '-'} → ${t.t}`));
  if (process.argv.includes('--apply')) { fs.writeFileSync(OUT, JSON.stringify(next)); console.log('썼어요:', OUT); }
}
