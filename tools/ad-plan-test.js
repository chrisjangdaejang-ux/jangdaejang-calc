/* 광고 설계 도우미(assets/ad-plan-core.js · ad/plan/) 자동 확인 — 실행: node tools/ad-plan-test.js </dev/null
   ① 업종 규칙 위반 조합이 나오지 않음  ② 세 안(오래·넓게·집중) 모두 고른 총액을 넘지 않음  ③ '오래 노출' 기간이 다른 안보다 짧지 않음
   ④ 측정값이 없으면 숫자·'최고 효율'을 보여 주지 않음  ⑤ [추천] 기준  ⑥ 지역 단가(동네 업체·특정 지역)  ⑦ 문의 폼 미리 채움
   ⑧ 가격은 assets/ad-prices.js 한 곳(하루 단위 없음)  ⑨ 화면 문구 규칙 */
const fs = require('fs'), path = require('path');
const A = require('../assets/ad-plan-core.js'), PR = require('../assets/ad-prices.js'), SL = require('../assets/ad-slot.js');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const rows = [], check = (name, ok, got) => rows.push({ name, ok: !!ok, got });
const page = read('ad/plan/index.html'), core = read('assets/ad-plan-core.js');

/* 조합: 1·2·4·8주 × 30~300만 원(10만 원 단위) + 작은·큰 금액, 모든 업종·목적, 지역 있음·없음 */
const BUD = [0, 10, 20].concat(Array.from({ length: 28 }, (_, i) => 30 + i * 10), [500, 1000]);
const all = [];
for (const I of A.INDUSTRIES) for (const U of A.PURPOSES) for (const b of BUD) for (const w of A.PERIODS) for (const rg of [{}, { sido: '서울특별시', sgg: '강남구' }, { sido: '서울특별시' }]) {
  const q = Object.assign({ industry: I.id, purpose: U.id, totalMan: b, weeks: w }, rg);
  all.push([q, A.plan(q, {})]);
}
const plansOf = r => (r.plans || []).filter(p => p.items);

/* ① 업종 규칙 */
{
  let bad = null;
  for (const [q, r] of all) for (const pl of plansOf(r)) for (const x of pl.items) {
    const it = A.ITEMS.find(i => i.id === x.id), I = A.INDUSTRIES.find(i => i.id === q.industry), C = it.cat && SL.CATS[it.cat];
    const ok = I.ind.length && (!C || I.ind.every(n => C.ind.includes(n))) && (!it.ind || I.ind.every(n => it.ind.includes(n))) && (!I.only || I.only.includes(it.cat));
    if (!ok && !bad) bad = [q.industry, pl.id, x.id];
  }
  check('모든 조합·세 안: 업종이 받을 수 없는 자리는 나오지 않음(ad-slot.js CATS·상품 업종)', !bad, bad);
  const tax = all.filter(([q]) => q.industry === 'tax').flatMap(([, r]) => plansOf(r).flatMap(p => p.items));
  check('세무사: 세금 화면 자리만', tax.length > 0 && tax.every(x => ['tax_top', 'tax_end'].includes(x.id)), [...new Set(tax.map(x => x.id))]);
  const mv = all.filter(([q]) => q.industry === 'move').flatMap(([, r]) => plansOf(r).flatMap(p => p.items.map(x => x.id)));
  check('이사·인테리어: 두 업종을 모두 받는 자리만(전월세 화면 제외)', !mv.some(id => /^jeonse/.test(id)) && !mv.includes('tax_end'), [...new Set(mv)]);
  check('공인중개사: 광고 칸 없이 지역 제휴 중개사만 · 기타: 문의로', all.every(([q, r]) => q.industry === 'broker' ? r.kind === 'broker' : q.industry === 'etc' ? r.kind === 'etc' : true), '');
  check('한 안 안에서 같은 자리는 한 번만', all.every(([, r]) => plansOf(r).every(p => new Set(p.items.map(x => x.id)).size === p.items.length)), '');
}

/* ② 총액 */
{
  let bad = null;
  for (const [q, r] of all) {
    const B = Math.max(0, q.totalMan) * 10000;
    for (const p of plansOf(r)) { const s = p.items.reduce((a, x) => a + x.cost, 0); if (s > B || p.total !== s || p.left !== B - s) bad = bad || [q, p.id, s, B]; }
    if (r.kind === 'broker' && r.pick && r.pick.year > B) bad = bad || [q, 'broker', r.pick.year];
    if (r.shorter && r.shorter.cost > B) bad = bad || [q, 'shorter', r.shorter.cost];
  }
  check(`전 조합(${all.length}가지): 세 안 모두 합계 ≤ 고른 총액, 합계 = 자리 금액의 합, 남는 돈 = 총액 − 합계`, !bad, bad);
  check('총액은 기간과 관계없이 그대로(100만 원 → 100만 원)', A.budgetFor(100) === 1e6, '');
  const r8 = A.plan({ industry: 'dev', purpose: 'bunyang', totalMan: 100, weeks: 8, sido: '서울특별시' }, {});
  check('100만 원·8주: 어느 안도 100만 원을 넘지 않음(예전 180만 원 문제)', plansOf(r8).every(p => p.total <= 1e6), plansOf(r8).map(p => p.total));
}

/* ③ 오래 노출 */
{
  let bad = null;
  for (const [q, r] of all) {
    const L = plansOf(r).find(p => p.id === 'long'); if (!L) continue;
    if (plansOf(r).some(p => p.weeks > L.weeks) || L.weeks < q.weeks) bad = bad || [q, plansOf(r).map(p => [p.id, p.weeks])];
  }
  check("전 조합: '오래 노출' 기간 ≥ 다른 안 기간, ≥ 원하는 기간", !bad, bad);
  const r = A.plan({ industry: 'tax', purpose: 'consult', totalMan: 30, weeks: 4, sido: '서울특별시', sgg: '강남구' }, {});
  const L = r.plans.find(p => p.id === 'long');
  check("오래 노출 문구: '○만 원으로 최대 ○주 동안 실려요'", L && L.head === '30만 원으로 최대 ' + L.weeks + '주 동안 실려요' && L.weeks === 8, L && L.head);
}

/* ④ 측정값·최고 효율 */
{
  const anyStat = all.some(([, r]) => plansOf(r).some(p => p.items.some(x => x.stat) || p.cpc));
  check('측정값이 없으면 어떤 안에도 노출 수·클릭당 비용을 붙이지 않음', !anyStat, '');
  check("측정값이 없으면 '최고 효율' 없음(전 조합)", all.every(([, r]) => !r.best), '');
  const q = { industry: 'loan', purpose: 'consult', totalMan: 200, weeks: 4 };
  const base = A.plan(q, {}), ids = [...new Set(base.plans.flatMap(p => p.items.map(x => x.id)))];
  const S = { slots: Object.fromEntries(ids.map((id, i) => [id, { weeks: 4, views: 1000 * (i + 1), clicks: 10 * (i + 1) }])) };
  const m = A.plan(q, S);
  check("실제 4주 클릭 수가 모든 자리에 있으면 클릭당 비용이 가장 낮은 안에 '최고 효율'", m.best && m.plans.find(p => p.id === m.best).cpc === Math.min(...m.plans.map(p => p.cpc)), m.plans.map(p => [p.id, p.cpc]));
  const one = A.plan(q, { slots: { [ids[0]]: { weeks: 4, views: 10, clicks: 1 } } });
  check("클릭 수가 일부 자리에만 있으면 '최고 효율' 없음", !one.best, one.plans.map(p => [p.id, p.cpc]));
  check("화면: '최고 효율(실제 클릭당 비용 기준)'은 r.best 일 때만", /\$\{r\.best === pl\.id \? '<span class="tagb">최고 효율\(실제 클릭당 비용 기준\)<\/span>' : ''\}/.test(page) && (page.match(/최고 효율/g) || []).length === 1, '');
  check("'최고' 문구는 계산 파일에서 측정값 조건 안에만", !/최고 효율/.test(core.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), '');
  const b = A.plan({ industry: 'dev', purpose: 'brand', totalMan: 500, weeks: 4 }, { briefSubs: 9 });
  check('브리핑 구독자 10명 미만이면 숨김', plansOf(b).every(p => p.items.every(x => !x.stat)), '');
  check('측정값이 없을 때 문구: "집행 후 노출·클릭 수를 매주 알려 드려요"', page.includes('집행 후 노출·클릭 수를 매주 알려 드려요.'), '');
}

/* ⑤ 추천 */
{
  const r = A.plan({ industry: 'dev', purpose: 'bunyang', totalMan: 100, weeks: 4, sido: '서울특별시' }, {});
  check("기본 [추천] = 오래 노출 + 이유 한 줄", r.rec === 'long' && r.recWhy === '처음 광고하시면 오래 실어 반응을 보는 게 좋아요.', [r.rec, r.recWhy]);
  const n = A.plan({ industry: 'dev', purpose: 'bunyang', totalMan: 100, weeks: 4, sido: '서울특별시', soon: 'near' }, {});
  check("분양 + 청약 접수 4주 안 → [추천] = 집중 노출", n.rec === 'focus' && n.recWhy === '청약 접수 전 짧은 기간에 많이 보이는 게 중요해요.', [n.rec, n.recWhy]);
  check('세 안: 오래·넓게·집중(들어가는 자리가 있을 때)', JSON.stringify(r.plans.map(p => p.id)) === '["long","wide","focus"]', r.plans.map(p => p.id));
  check('집중 노출: 위쪽 배너가 들어가면 먼저', r.plans.find(p => p.id === 'focus').items[0].id.endsWith('_top'), r.plans.find(p => p.id === 'focus').items.map(x => x.id));
  const w = A.plan({ industry: 'loan', purpose: 'consult', totalMan: 200, weeks: 4 }, {});
  check('넓게 노출: 자리 수가 다른 안보다 적지 않음', w.plans.every(p => p.items.length <= w.plans.find(x => x.id === 'wide').items.length || p.id === 'long'), w.plans.map(p => [p.id, p.items.length]));
  check("화면: 휴대폰에서 추천 안을 맨 위(order), '추천' 표시", page.includes("style=\"order:${order.indexOf(pl)}\"") && page.includes('<span class="tagr">추천</span>'), '');
}

/* ⑥ 지역 단가 */
{
  const t = A.plan({ industry: 'tax', purpose: 'consult', totalMan: 30, weeks: 4, sido: '서울특별시', sgg: '강남구' }, {});
  const w = t.plans.find(p => p.id === 'wide');
  check("예시 세무사·상담·30만 원·4주·강남구: 세금 화면 아래 카드가 시·군·구 단가로 들어감", w && w.items[0].id === 'tax_end' && w.items[0].cost === PR.tierWeeks(PR.PRICES.native.tiers[2].month, 4) && w.items[0].tier === '시·군·구 단가', w && w.items);
  const sd = A.plan({ industry: 'tax', purpose: 'consult', totalMan: 30, weeks: 4, sido: '서울특별시' }, {});
  check('시·도만 고르면 시·도 단가', plansOf(sd).some(p => p.items.some(x => x.id === 'tax_end' && x.cost === PR.tierWeeks(PR.PRICES.native.tiers[1].month, 4))), '');
  const no = A.plan({ industry: 'tax', purpose: 'consult', totalMan: 30, weeks: 4 }, {});
  check('지역을 안 고른 동네 업체: 전국 단가 → 부족하면 지역을 고르라는 안내(시·군·구 월 단가)', no.kind === 'short' && no.regionHint && no.regionHint.month === PR.PRICES.native.tiers[2].month, no.regionHint);
  const dev = A.plan({ industry: 'dev', purpose: 'brand', totalMan: 300, weeks: 4, sido: '서울특별시', sgg: '강남구' }, {});
  check('동네 업체가 아니고 목적도 특정 지역이 아니면 전국 단가', A.scopeOf({ industry: 'dev', purpose: 'brand', sido: '서울특별시', sgg: '강남구' }) === '' && plansOf(dev).every(p => p.items.every(x => !x.tier)), '');
  check("목적이 '특정 지역'이면 지역 단가", A.scopeOf({ industry: 'loan', purpose: 'region', sido: '서울특별시', sgg: '강남구' }) === 'sgg', '');
}

/* ⑦ 문의 폼 */
{
  const q = { industry: 'dev', purpose: 'bunyang', totalMan: 100, weeks: 4, sido: '서울특별시' }, r = A.plan(q, {});
  for (const pl of r.plans) {
    const f = A.formFill(q, Object.assign({ kind: r.kind, adTarget: r.adTarget }, pl));
    check(`폼 채우기(${pl.label}): 구성안·자리·기간·금액·합계`, f.memo.includes('구성안: ' + pl.label) && pl.items.every(x => f.memo.includes('구성: ' + x.name + ' · ' + x.weeks + '주 · ' + A.won(x.cost))) && f.memo.includes('합계: ' + A.won(pl.total)) && f.region === '서울특별시', f.memo);
  }
  const ad = read('ad/index.html'), boxes = [...ad.matchAll(/<input type="checkbox" value="([a-z_]+)">/g)].map(m => m[1]);
  check('상품 키는 모두 /ad/ 문의 폼에 있는 칸', A.ITEMS.every(it => boxes.includes(it.prod)), A.ITEMS.map(i => i.prod).filter(p => !boxes.includes(p)));
  check('세 안 모두 [이 구성으로 문의하기] → ../?plan=…#ask', /data-plan="\$\{pl\.id\}"/.test(page) && page.includes('이 구성으로 문의하기'), '');
  check('/ad/: ?plan= 으로 오면 상품·지역·기간·문의 내용 채움', /URLSearchParams\(location\.search\)\.get\('plan'\)/.test(ad) && /set\('region', q\.r\); set\('memo', q\.m\)/.test(ad), '');
}

/* ⑧ 가격 한 곳 */
{
  check('모든 자리 1·2·4·8주 금액이 단가표에서 나옴', A.ITEMS.every(it => [1, 2, 4, 8].every(n => A.priceOf(it, n) > 0)), '');
  check('하루 단위 없음(원하는 기간 1·2·4·8주)', JSON.stringify(A.PERIODS) === '[1,2,4,8]', '');
  check('계산 파일에 금액 숫자를 직접 쓰지 않음', !/\b[1-9]\d{4,}\b/.test(core.replace(/10000/g, '')), (core.match(/\b[1-9]\d{4,}\b/g) || []).filter(x => x !== '10000'));
}

/* ⑨ 화면 문구 */
{
  const vis = page + core;
  check('금지어 없음(시험·검증·채점)', !/시험|검증|채점/.test(vis), '');
  check('"광고에 쓸 돈(총액)" 칸, 두 배 안내 없음, 제목 "○만 원 안에서 고른 구성"', page.includes('<label for="bud">광고에 쓸 돈(총액)</label>') && !page.includes('두 배') && !page.includes('한 달 예산') && page.includes('${S.totalMan}만 원 안에서 고른 구성'), '');
  check('회사명 대신 서비스 이름, 자리마다 광고 표시, A+ 테마', !/장대장부동산그룹/.test(page) && page.includes('data-site-name') && page.includes('<span class="adlbl">광고</span>') && /aplus\.css\?v=\d+/.test(page), '');
}

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log((r.ok ? '  ok  ' : '  FAIL') + ' ' + r.name + (r.ok ? '' : '  → ' + JSON.stringify(r.got).slice(0, 400))));
console.log(`\n${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
