/* 광고 설계 도우미(assets/ad-plan-core.js · ad/plan/) 자동 확인 — 실행: node tools/ad-plan-test.js </dev/null
   ① 업종 규칙 위반 조합이 나오지 않음  ② 예산을 넘지 않음  ③ 측정값이 없으면 숫자를 보여 주지 않음  ④ 문의 폼에 값이 미리 채워짐
   ⑤ 가격은 assets/ad-prices.js 한 곳에서 읽음(하루 단위 없음)  ⑥ 화면 문구 규칙 */
const fs = require('fs'), path = require('path');
const A = require('../assets/ad-plan-core.js'), PR = require('../assets/ad-prices.js'), SL = require('../assets/ad-slot.js');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const rows = [], check = (name, ok, got) => rows.push({ name, ok: !!ok, got });

const BUD = [0, 10, 30, 50, 100, 150, 200, 300, 500, 1000];
const all = [];
for (const I of A.INDUSTRIES) for (const U of A.PURPOSES) for (const b of BUD) for (const w of A.PERIODS) {
  const q = { industry: I.id, purpose: U.id, monthMan: b, weeks: w, sido: '서울특별시', sgg: '강남구' };
  all.push([q, A.plan(q, {})]);
}

/* ① 업종 규칙 */
{
  let bad = null;
  for (const [q, r] of all) for (const x of r.items) {
    const it = A.ITEMS.find(i => i.id === x.id), I = A.INDUSTRIES.find(i => i.id === q.industry);
    const C = it.cat && SL.CATS[it.cat];
    const ok = I.ind.length && (!C || I.ind.every(n => C.ind.includes(n))) && (!it.ind || I.ind.every(n => it.ind.includes(n))) && (!I.only || I.only.includes(it.cat));
    if (!ok && !bad) bad = [q.industry, x.id];
  }
  check('모든 조합: 업종이 받을 수 없는 자리는 나오지 않음(ad-slot.js CATS·상품 업종)', !bad, bad);
  const tax = all.filter(([q]) => q.industry === 'tax').flatMap(([, r]) => r.items);
  check('세무사: 세금 화면 자리만', tax.length > 0 && tax.every(x => ['tax_top', 'tax_end'].includes(x.id)), [...new Set(tax.map(x => x.id))]);
  check('세무사: 세금 화면은 정액 광고만 받는 자리(flatOnly)', SL.CATS.tax.flatOnly === true, '');
  const dev = A.plan({ industry: 'dev', purpose: 'bunyang', monthMan: 300, weeks: 4, sido: '서울특별시' }, {});
  check('분양 목적: 분양·청약 화면 자리가 먼저', ['bun_list', 'chungyak_top', 'bunyang_top'].includes(dev.items[0].id) && dev.items.slice(0, 2).every(x => ['bun_list', 'chungyak_top', 'bunyang_top'].includes(x.id)), dev.items.map(x => x.id));
  const jg = all.filter(([q]) => q.industry === 'guar').flatMap(([, r]) => r.items.map(x => x.id));
  check('보증보험: 전월세 자리 포함, 세금·분양 자리 없음', jg.includes('jeonse_sponsor') && !jg.some(id => /^(tax_|bun_|chungyak_top|bunyang_top|map_pin)/.test(id)), [...new Set(jg)]);
  const mv = all.filter(([q]) => q.industry === 'move').flatMap(([, r]) => r.items.map(x => x.id));
  check('이사·인테리어: 두 업종을 모두 받는 자리만(전월세 화면은 인테리어를 안 받아 제외)', !mv.some(id => /^jeonse/.test(id)) && !mv.includes('tax_end'), [...new Set(mv)]);
  check('공인중개사: 광고 칸 없이 지역 제휴 중개사만', all.filter(([q]) => q.industry === 'broker').every(([, r]) => r.kind === 'broker' && !r.items.length), '');
  check('기타: 자동 구성 없이 문의로', all.filter(([q]) => q.industry === 'etc').every(([, r]) => r.kind === 'etc' && !r.items.length), '');
  check('같은 자리는 한 번만', all.every(([, r]) => new Set(r.items.map(x => x.id)).size === r.items.length), '');
}

/* ② 예산 */
{
  const over = all.find(([q, r]) => r.total > A.budgetFor(q.monthMan, q.weeks) || r.items.reduce((s, x) => s + x.cost, 0) !== r.total || r.left !== r.budget - r.total);
  check('모든 조합: 합계 ≤ 쓸 수 있는 돈, 합계 = 자리 금액의 합, 남는 돈 = 예산 − 합계', !over, over && [over[0], over[1].total, over[1].budget]);
  check('쓸 수 있는 돈: 4주 이하는 월 예산, 8주는 2배', A.budgetFor(100, 1) === 1e6 && A.budgetFor(100, 4) === 1e6 && A.budgetFor(100, 8) === 2e6, '');
  const t = A.plan({ industry: 'tax', purpose: 'consult', monthMan: 30, weeks: 4 }, {});
  check('예산 부족(세무사 30만·4주): 자리 없음 + 가장 싼 자리·필요 금액', t.kind === 'short' && !t.items.length && t.cheapest && t.cheapest.cost === PR.tierWeeks(PR.PRICES.native.tiers[0].month, 4), t.cheapest);
  check('예산 부족: 기간을 줄이면 들어가는 자리(예산 안)', t.shorter && t.shorter.cost <= A.budgetFor(30, t.shorter.weeks) && t.shorter.weeks < 4, t.shorter);
  const d = A.plan({ industry: 'dev', purpose: 'bunyang', monthMan: 100, weeks: 4, sido: '서울특별시' }, {});
  check('예시(시행사·분양·100만·4주): 분양 목록 맨 위 카드 90만, 남는 10만', d.items.length === 1 && d.items[0].id === 'bun_list' && d.total === 900000 && d.left === 100000, d.items.map(x => [x.id, x.cost]));
  check('분양 목적이면 광고 지역 추천 리포트를 함께(합계에는 넣지 않음)', d.adTarget && d.total === 900000, '');
  const br = A.plan({ industry: 'broker', purpose: 'region', monthMan: 3, weeks: 4 }, {});
  check('공인중개사: 월로 나눈 금액이 월 예산 안인 요금제만 추천(3만 원 → 기본)', br.pick && br.pick.label === '기본' && br.pick.month <= 30000, br.pick);
}

/* ③ 측정값 */
{
  const any = all.flatMap(([, r]) => r.items).filter(x => x.stat);
  check('측정값이 없으면 어떤 자리에도 숫자(노출·구독자)를 붙이지 않음', any.length === 0, any.slice(0, 2));
  const q = { industry: 'dev', purpose: 'brand', monthMan: 500, weeks: 4 };
  const r1 = A.plan(q, { slots: { home_top: { weeks: 4, views: 12345, clicks: 67 } }, briefSubs: 9 });
  const h = r1.items.find(x => x.id === 'home_top'), b = r1.items.find(x => x.id === 'brief');
  check('실제 4주 집계가 있으면 "최근 4주 실제 노출 ○회"', h && h.stat === '최근 4주 실제 노출 12,345회 · 누름 67회', h && h.stat);
  check('브리핑 구독자 10명 미만이면 숨김', b && !b.stat, b && b.stat);
  const r2 = A.plan(q, { briefSubs: 120, slots: { home_top: { weeks: 2, views: 10 } } });
  check('브리핑 구독자 10명 이상이면 실제 집계 수', (r2.items.find(x => x.id === 'brief') || {}).stat === '지금 구독자 120명(실제 집계)', '');
  check('4주 집계가 아니면 노출 수를 보여 주지 않음', !(r2.items.find(x => x.id === 'home_top') || {}).stat, '');
  const page = read('ad/plan/index.html');
  check('측정값이 없을 때 문구: "집행 후 노출·클릭 수를 매주 알려 드려요"', page.includes('집행 후 노출·클릭 수를 매주 알려 드려요.'), '');
}

/* ④ 문의 폼 */
{
  const q = { industry: 'dev', purpose: 'bunyang', monthMan: 100, weeks: 4, sido: '서울특별시' };
  const f = A.formFill(q, A.plan(q, {}));
  check('폼 채우기: 관심 상품·지역·기간', JSON.stringify(f.prods) === '["bunyang"]' && f.region === '서울특별시' && f.period === '1개월', f);
  check('폼 채우기: 문의 내용에 업종·목적·자리·기간·금액·합계', ['업종: 시행사·분양대행사', '목적: 분양 현장 알리기', '구성: 분양 목록 맨 위 카드 · 4주 · 90만 원', '합계: 90만 원 (VAT 별도)'].every(s => f.memo.includes(s)), f.memo);
  const ad = read('ad/index.html');
  const prodBoxes = [...ad.matchAll(/<input type="checkbox" value="([a-z_]+)">/g)].map(m => m[1]);
  check('폼 채우기: 상품 키는 모두 /ad/ 문의 폼에 있는 칸', A.ITEMS.every(it => prodBoxes.includes(it.prod)) && prodBoxes.includes('agent') && prodBoxes.includes('etc'), A.ITEMS.map(i => i.prod).filter(p => !prodBoxes.includes(p)));
  const opts = (ad.match(/<select id="period">([\s\S]*?)<\/select>/) || [])[1] || '';
  check('폼 채우기: 기간 값은 /ad/ 희망 기간 목록에 있는 것', [1, 2, 4, 8].every(w => opts.includes('<option>' + A.formFill(q, Object.assign(A.plan(Object.assign({}, q, { weeks: w }), {}))).period + '</option>')), '');
  check('/ad/: ?plan= 으로 오면 상품·지역·기간·문의 내용 채움', /URLSearchParams\(location\.search\)\.get\('plan'\)/.test(ad) && /set\('region', q\.r\); set\('memo', q\.m\)/.test(ad), '');
  check('도우미 화면: [이 구성으로 문의하기] → ../?plan=…#ask', read('ad/plan/index.html').includes('href="../?plan=${encodeURIComponent(JSON.stringify({ p: f.prods, r: f.region, per: f.period, m: f.memo }))}#ask"'), '');
  check('/ad/ 맨 위: [예산만 넣으면 광고 구성을 짜 드려요] → plan/', /<a class="planbox" href="plan\/"[\s\S]{0,400}예산만 넣으면 광고 구성을 짜 드려요/.test(ad) && ad.indexOf('class="planbox"') < ad.indexOf('id="why"'), '');
}

/* ⑤ 가격 한 곳 */
{
  const priced = A.ITEMS.map(it => [it.id, A.priceOf(it, 1), A.priceOf(it, 4)]);
  check('모든 자리 1주·4주 금액이 단가표에서 나옴', priced.every(p => p[1] > 0 && p[2] > 0), priced.filter(p => !(p[1] > 0 && p[2] > 0)));
  check('홈 위쪽 배너 1주 50만·4주 150만, 분양·청약 위쪽 28만·90만, 다른 위쪽 25만·80만', A.priceOf(A.ITEMS.find(i => i.id === 'home_top'), 1) === 500000 && A.priceOf(A.ITEMS.find(i => i.id === 'home_top'), 4) === 1500000
    && A.priceOf(A.ITEMS.find(i => i.id === 'chungyak_top'), 1) === 280000 && A.priceOf(A.ITEMS.find(i => i.id === 'tax_top'), 4) === 800000, '');
  check('8주 = 4주 × 2, 2주 = 1주 × 2(주 단위 상품)', A.priceOf(A.ITEMS.find(i => i.id === 'home_top'), 8) === 3000000 && A.priceOf(A.ITEMS.find(i => i.id === 'tax_top'), 2) === 500000, '');
  check('하루 단위 없음(기간 1·2·4·8주)', JSON.stringify(A.PERIODS) === '[1,2,4,8]', A.PERIODS);
  const core = read('assets/ad-plan-core.js');
  check('도우미 계산에 금액 숫자를 직접 쓰지 않음(가격은 ad-prices.js)', !/\b[1-9]\d{4,}\b/.test(core.replace(/10000/g, '')), (core.match(/\b[1-9]\d{4,}\b/g) || []).filter(x => x !== '10000'));
  const page = read('ad/plan/index.html');
  check('도우미 화면이 ad-prices.js·ad-slot.js·ad-plan-core.js 를 읽음', ['ad-prices.js?v=', 'ad-slot.js?v=', 'ad-plan-core.js?v='].every(s => page.includes(s)), '');
}

/* ⑥ 화면 문구 */
{
  const page = read('ad/plan/index.html'), core = read('assets/ad-plan-core.js');
  const vis = (page + core).replace(/<script[\s\S]*?src=[^>]*><\/script>/g, '');
  check("금지어 없음(시험·검증·채점)", !/시험|검증|채점/.test(vis), (vis.match(/시험|검증|채점/g) || []));
  check('회사명 대신 서비스 이름(data-site-name)', !/장대장부동산그룹/.test(page) && page.includes('data-site-name'), '');
  check("추천 구성 자리마다 '광고' 표시", page.includes('<span class="adlbl">광고</span>'), '');
  check('A+ 테마(aplus.css)', /aplus\.css\?v=\d+/.test(page), '');
}

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log((r.ok ? '  ok  ' : '  FAIL') + ' ' + r.name + (r.ok ? '' : '  → ' + JSON.stringify(r.got))));
console.log(`\n${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
