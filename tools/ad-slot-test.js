/* 광고 칸(assets/ad-slot.js) 자동 확인 — 실행: node tools/ad-slot-test.js </dev/null
   ① 세금 계산 결과 안에는 칸이 없다  ② 휴대폰 한 화면 광고 최대 2개  ③ 유료 광고가 없으면 자체 광고(빈 칸 없음)
   ④ 외부(유료) 광고 칸은 언제나 '광고' 표시 · 집예보 자체 안내는 '집예보 소식'  ⑤ 화면별 업종 규칙(세무사 정액만·심사 거절 업종 차단·기간)  ⑥ 페이지마다 스크립트·칸 이름·문서 표가 맞음 */
const fs = require('fs'), path = require('path');
const A = require('../assets/ad-slot.js');
const ROOT = path.join(__dirname, '..');
const rows = [];
const check = (name, ok, got) => rows.push({ name, ok: !!ok, got });
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const TODAY = '2026-12-10';
const ad = o => Object.assign({ id: 'a1', advertiser: '테스트 광고주', title: '제목', text: '설명', link: 'https://example.com/', start: '2026-12-01', end: '2026-12-31', fee: 'flat' }, o);

/* 칸이 있는 화면 */
const PAGES = {
  'index.html': ['home_top', 'home_end'], 'map/index.html': ['map_top'], 'rank/index.html': ['rank_top', 'rank_list', 'rank_end'],
  'mine/index.html': ['mine_end'], 'ask/index.html': ['ask_end'], 'tax/index.html': ['tax_top', 'tax_end'],
  'chungyak/index.html': ['chungyak_top', 'chungyak_end'], 'bunyang/index.html': ['bunyang_top', 'bunyang_list'],
  'villa/index.html': ['villa_top', 'villa_end'], 'jeonse/index.html': ['jeonse_top', 'jeonse_end'], 'jeonse/checklist/index.html': ['jeonse_check_end'],
  'switch/index.html': ['switch_top', 'switch_end'], 'brief/index.html': ['brief_end'], 'buy/index.html': ['buy_end'],
  'buy/report/index.html': ['report_end'], 'land/draft/index.html': ['land_end'], 'agent/index.html': ['agent_end'],
  'loan/index.html': ['loan_end']
};
const slotsOf = html => [...html.matchAll(/<div\b[^>]*data-ad-slot="([^"]+)"[^>]*>/g)].map(m => ({ id: m[1], tag: m[0], at: m.index }));
const doc = read('docs/ad_slots.md');

/* ① 세금: 계산 화면(vCgt·vOrder·vAcq·vProp·vCpt·vGift) 안, 결과 칸 안에 칸 없음 */
{
  const h = read('tax/index.html');
  const secs = [...h.matchAll(/<section id="(v\w+)"[\s\S]*?<\/section>/g)].map(m => ({ id: m[1], a: m.index, b: m.index + m[0].length }));
  const ss = slotsOf(h);
  check('세금: 칸 2개(상단·끝)', ss.length === 2, ss.map(s => s.id));
  ss.forEach(s => {
    const inSec = secs.find(x => s.at > x.a && s.at < x.b);
    check(`세금: ${s.id} 는 계산 화면 밖(첫 화면 메뉴 위 또는 모든 화면 아래)`, !inSec || inSec.id === 'vHome', inSec && inSec.id);
  });
  const home = secs.find(x => x.id === 'vHome'), top = ss.find(s => s.id === 'tax_top');
  check('세금: 상단 배너는 첫 화면 계산 메뉴(.rows)보다 위', top && top.at < h.indexOf('<div class="rows">', home.a), top && top.at);
  check('세금: 첫 화면(vHome)에는 입력 칸·결과 칸 없음', !/<input|<form|class="[^"]*result/.test(h.slice(home.a, home.b)), '');
  const last = Math.max(...secs.map(x => x.b)), end = ss.find(s => s.id === 'tax_end');
  check('세금: 끝 칸은 마지막 계산 화면이 끝난 뒤', end && end.at > last, end && end.at - last);
  check('세금: 업종은 세무사만', JSON.stringify(A.CATS.tax.ind) === '["세무사"]', A.CATS.tax.ind);
  check('세금: 유료 광고 칸 안 문구에 "세금 계산 결과와 관계없는 광고"', A.html(ad({ cat: 'tax', industry: '세무사' }), 'tax_end', 'tax').includes('세금 계산 결과와 관계없는 광고예요'), '');
  check('세금: 집예보 소식(자체 안내)에는 광고 문구 없음', !A.html(A.houseAd('brief'), 'tax_end', 'tax').includes('광고'), A.html(A.houseAd('brief'), 'tax_end', 'tax'));
  check('결과 칸 금지 목록에 #res·#result·.result·[aria-live]', ['#res', '#result', '.result', '[aria-live]'].every(x => A.BAN.split(',').includes(x)), A.BAN);
}

/* ② 휴대폰 한 화면 최대 2개 */
{
  check('휴대폰 한 화면 최대 2개(MOBILE_MAX)', A.MOBILE_MAX === 2, A.MOBILE_MAX);
  check('같은 화면에 이미 2개면 더 넣지 않음', A.tooMany([100, 400], 600, 844) === true, '');
  check('같은 화면에 1개면 넣음', A.tooMany([100], 600, 844) === false, '');
  check('한 화면 넘게 떨어진 광고는 세지 않음', A.tooMany([100, 400], 1500, 844) === false, '');
  for (const [f, want] of Object.entries(PAGES)) {
    const ss = slotsOf(read(f)), tops = ss.filter(s => /data-ad-top/.test(s.tag));
    check(`${f}: 상단 배너 최대 1개`, tops.length <= 1, tops.length);
    check(`${f}: 칸 최대 3개(상단 1 + 아래 2, 아래 칸은 한 화면 이상 떨어져 있음)`, ss.length <= 3, ss.length);
    if (ss.length === 3) check(`${f}: 칸 3개면 그중 하나는 상단 배너, 하나는 목록 사이(내려가는 칸)`, tops.length === 1 && ss.some(s => /data-ad-list=/.test(s.tag)), ss.map(s => s.id));
  }
}

/* ③ 광고가 없으면 자체 광고 */
{
  for (const c of Object.keys(A.CATS)) {
    const p = A.pick([], c + '_end', c, TODAY, []);
    check(`${c}: 광고 없으면 자체 광고`, p && p.house && p.title && p.link, p && p.id);
  }
  check('분양 화면 자체 광고 = 분양가 비교 리포트(pro/developer)', A.pick([], 'bunyang_top', 'bunyang', TODAY).link.endsWith('/pro/developer/'), '');
  check('중개사 화면 자체 광고 = 중개사 플러스(요금제 바로 고름)', /중개사 플러스$/.test(A.pick([], 'agent_end', 'agent', TODAY).title) && A.pick([], 'agent_end', 'agent', TODAY).link.endsWith('brief/subscribe/?p=brief_pro_plus'), '');
  check('홈 자체 광고: 상단 = 내 집 시세(바로 아래 브리핑 카드와 겹치지 않게), 끝 = 모닝 브리핑 7일 무료', A.pick([], 'home_top', 'home', TODAY).id === 'house_mine' && /모닝 브리핑 7일 무료$/.test(A.pick([], 'home_end', 'home', TODAY, ['house_mine']).title), '');
  check('같은 화면 두 번째 칸은 다른 자체 광고', A.pick([], 'rank_end', 'rank', TODAY, ['house_brief']).id === 'house_mine', '');
  check('기간 지난 광고 → 자체 광고', A.pick([ad({ cat: 'mine', industry: '이사', end: '2026-12-05' })], 'mine_end', 'mine', TODAY).house, '');
  check('기간 안 광고 → 유료 광고', A.pick([ad({ cat: 'mine', industry: '이사' })], 'mine_end', 'mine', TODAY).id === 'a1', '');
  check('칸 이름을 정한 광고는 다른 칸에 안 나옴', A.pick([ad({ cat: 'mine', slot: 'mine_end', industry: '이사' })], 'mine_top', 'mine', TODAY).house, '');
  check('https 가 아닌 링크 → 자체 광고', A.pick([ad({ cat: 'mine', industry: '이사', link: 'http://x.com' })], 'mine_end', 'mine', TODAY).house, '');
}

/* ④ '광고' 표시(외부 광고) · '집예보 소식'(자체 안내) */
{
  const paid = ad({ cat: 'jeonse', industry: '보증보험', image: 'https://example.com/a.png' });
  for (const c of Object.keys(A.CATS)) for (const top of [false, true]) for (const a of [A.houseAd(A.CATS[c].house[0]), paid]) {
    const h = A.html(a, c + '_x', c, top);
    if (a.house) check(`${c}${top ? ' 상단' : ''} 자체: '광고' 대신 '집예보 소식' 표시`, /<span class="jas-tag jas-own">집예보 소식<\/span>/.test(h) && !/<span class="jas-tag">광고<\/span>/.test(h) && !h.includes('sponsored'), h);
    else check(`${c}${top ? ' 상단' : ''} 유료: '광고' 표시`, /<span class="jas-tag">광고<\/span>/.test(h) && !h.includes('jas-own'), '');
  }
  check('자체 브리핑 안내 → 구독 화면, 어느 칸에서 왔는지(cta=slot_칸)', /href="[^"]*brief\/subscribe\/\?cta=slot_home_end"/.test(A.html(A.houseAd('brief'), 'home_end', 'home')) && /data-bcta-at="slot_home_end"/.test(A.html(A.houseAd('brief'), 'home_end', 'home')), A.html(A.houseAd('brief'), 'home_end', 'home'));
  check('유료 광고 링크에는 cta 를 붙이지 않음', !A.html(paid, 'jeonse_end', 'jeonse').includes('cta='), '');
  check('유료 광고 링크는 sponsored·새 창', /rel="sponsored noopener nofollow"/.test(A.html(paid, 'x', 'jeonse')), '');
  check('누름 기록용 data-track·data-ad-id', /data-track="adslot_jeonse_end" data-ad-id="a1"/.test(A.html(paid, 'jeonse_end', 'jeonse')), '');
  check('광고 문구는 이스케이프', !A.html(ad({ title: '<b>x</b>' }), 'x', 'home').includes('<b>x</b>'), '');
}

/* ⑤ 업종 규칙 */
{
  check('세금: 정액 세무사 광고는 실림', A.allowed(ad({ cat: 'tax', industry: '세무사' }), 'tax_end', 'tax', TODAY), '');
  check('세금: 소개 수수료 세무사 광고는 안 실림', !A.allowed(ad({ cat: 'tax', industry: '세무사', fee: 'referral' }), 'tax_end', 'tax', TODAY), '');
  check('세무사는 어느 화면이든 정액만(홈)', !A.allowed(ad({ cat: 'home', industry: '세무사', fee: 'referral' }), 'home_end', 'home', TODAY), '');
  check('세금 화면에 법무사 광고 안 실림', !A.allowed(ad({ cat: 'tax', industry: '법무사' }), 'tax_end', 'tax', TODAY), '');
  check('전월세: 보증보험·법무사·이사', ['보증보험', '법무사', '이사'].every(i => A.allowed(ad({ cat: 'jeonse', industry: i }), 'jeonse_end', 'jeonse', TODAY)), '');
  check('전월세: 대출 상담은 안 실림', !A.allowed(ad({ cat: 'jeonse', industry: '대출 상담' }), 'jeonse_end', 'jeonse', TODAY), '');
  check('청약·분양: 시행사·분양대행사만', ['chungyak', 'bunyang'].every(c => JSON.stringify(A.CATS[c].ind) === '["시행사","분양대행사"]'), '');
  check('중개사: 중개사 도구만', JSON.stringify(A.CATS.agent.ind) === '["중개사 도구"]', '');
  check('심사 거절 업종(대부업)은 막음', !A.allowed(ad({ cat: 'home', industry: '대부업' }), 'home_end', 'home', TODAY), '');
  check('시작 전 광고는 안 실림', !A.allowed(ad({ cat: 'mine', industry: '이사', start: '2026-12-11' }), 'mine_end', 'mine', TODAY), '');
  check('끝나는 날까지 실림', A.allowed(ad({ cat: 'mine', industry: '이사', end: TODAY }), 'mine_end', 'mine', TODAY), '');
  check('한국 날짜(UTC 15시 = 다음 날 0시)', A.kstToday(Date.UTC(2026, 10, 21, 15, 0)) === '2026-11-22', A.kstToday(Date.UTC(2026, 10, 21, 15, 0)));
}

/* ⑤-2 대출 상담 광고: 등록번호 필수·화면에 표시 · 대출 한도 화면은 대출 상담(정액)만 */
{
  const loanAd = o => ad(Object.assign({ cat: 'loan', slot: 'loan_end', industry: '대출 상담', regno: '제2026-01234호' }, o));
  check('대출 한도: 업종은 대출 상담만', JSON.stringify(A.CATS.loan.ind) === '["대출 상담"]', A.CATS.loan.ind);
  check('대출 한도: 등록번호 있는 정액 대출 상담 광고는 실림', A.allowed(loanAd(), 'loan_end', 'loan', TODAY), '');
  check('대출 한도: 등록번호 없으면 안 실림', !A.allowed(loanAd({ regno: '' }), 'loan_end', 'loan', TODAY) && !A.allowed(loanAd({ regno: undefined }), 'loan_end', 'loan', TODAY), '');
  check('대출 한도: 숫자 없는·이상한 등록번호는 안 실림', !A.allowed(loanAd({ regno: '등록 예정' }), 'loan_end', 'loan', TODAY) && !A.allowed(loanAd({ regno: '<b>12</b>' }), 'loan_end', 'loan', TODAY), '');
  check('대출 한도: 건당 수수료 광고는 안 실림(정액만)', !A.allowed(loanAd({ fee: 'referral' }), 'loan_end', 'loan', TODAY), '');
  check('대출 한도: 다른 업종(이사·법무사) 안 실림', ['이사', '법무사'].every(i => !A.allowed(loanAd({ industry: i }), 'loan_end', 'loan', TODAY)), '');
  check('다른 화면(홈)도 대출 상담 광고는 등록번호 필수', !A.allowed(ad({ cat: 'home', industry: '대출 상담' }), 'home_end', 'home', TODAY) && A.allowed(ad({ cat: 'home', industry: '대출 상담', regno: '제2026-01234호' }), 'home_end', 'home', TODAY), '');
  const h = A.html(loanAd(), 'loan_end', 'loan'), ht = A.html(loanAd(), 'loan_end', 'loan', true);
  check('대출 상담 광고 칸에 등록번호 표시(카드)', h.includes('대출성 상품 판매대리·중개업자 등록번호 제2026-01234호'), h);
  check('대출 상담 광고 칸에 등록번호 표시(상단 배너)', ht.includes('대출성 상품 판매대리·중개업자 등록번호 제2026-01234호'), ht);
  check('대출 한도: 칸 안 문구 "계산 결과와 관계없는 광고"', h.includes('계산 결과와 관계없는 광고예요'), '');
  check('자체 광고에는 등록번호 줄 없음', !A.html(A.houseAd('brief'), 'loan_end', 'loan').includes('등록번호'), '');
  const bad = JSON.parse(read('data/ads.json')).ads.filter(a => a.industry === '대출 상담' && !A.okRegno(a.regno));
  check('data/ads.json: 대출 상담 광고는 모두 등록번호 있음', bad.length === 0, bad.map(a => a.id));
  check('문서: regno 필드·대출 한도 칸', doc.includes('"regno"') && doc.includes('`loan_end`') && doc.includes('대출성 상품 판매대리·중개업자 등록번호'), '');
}

/* ⑥ 페이지·문서·자료 */
{
  for (const [f, want] of Object.entries(PAGES)) {
    const h = read(f), ss = slotsOf(h);
    check(`${f}: 칸 이름 ${want.join('·')}`, JSON.stringify(ss.map(s => s.id).sort()) === JSON.stringify(want.slice().sort()), ss.map(s => s.id));
    check(`${f}: ad-slot.js 포함`, /assets\/ad-slot\.js\?v=\d+/.test(h), '');
    check(`${f}: aplus.css?v=48 이상`, /aplus\.css\?v=(4[3-9]|[5-9]\d)/.test(h), '');
    ss.forEach(s => {
      const c = (s.tag.match(/data-ad-cat="([^"]+)"/) || [])[1];
      check(`${f}: ${s.id} 화면 종류 '${c}' 있음`, !!A.CATS[c], c);
      check(`${f}: ${s.id} 문서 표에 있음`, doc.includes('`' + s.id + '`'), '');
      if (!/data-ad-top/.test(s.tag)) check(`${f}: ${s.id} 아래 칸은 처음에 숨김(결과·목록이 그려진 뒤 보임)`, /\bhidden\b/.test(s.tag), '');
    });
  }
  const j = JSON.parse(read('data/ads.json'));
  check('data/ads.json: ads 배열', Array.isArray(j.ads), typeof j.ads);
  const sw = read('sw.js');
  check('sw.js: ad-slot.js v5·aplus v46 미리 저장', sw.includes('/assets/ad-slot.js?v=7') && sw.includes('/assets/aplus.css?v=50'), '');
  const adp = read('ad/index.html');
  check('/ad/: 광고 위치 안내 칸', adp.includes('id="slots"') && adp.includes('광고 위치 안내'), '');
  const slotSec = adp.slice(adp.indexOf('id="slots"'), adp.indexOf('id="target"'));
  const PX = require('../assets/ad-prices.js').PRICES, wk = k => JSON.stringify(PX[k] && PX[k].weeks);
  check('/ad/: 홈 상단 = 가장 비싼 자리 · 단가표 1주 50만·4주 150만(위치 안내는 단가표에서 읽음)', adp.includes('가장 비싼 자리') && adp.includes("WK('home_top'), '가장 비싼 자리', 1]") && wk('home_top') === '{"1":500000,"4":1500000}', wk('home_top'));
  check('단가표: 브리핑 지면 광고 1주(7일) 25만·4주 80만, /ad/ 과금 1주·4주', /text: '1주\(7일\) 25만 원 · 4주 80만 원'/.test(read('assets/ad-prices.js')) && wk('brief_ad') === '{"1":250000,"4":800000}' && adp.includes('<td data-l="과금">1주 · 4주 정액(7일 단위)</td>'), wk('brief_ad'));
  check('/ad/: 브리핑 광고 하루 1개 노출 규칙은 그대로', adp.includes('하루 한 광고주만 실려요') && adp.includes('(하루 1개 광고주)'), '');
  check('단가표: 카테고리 상단 1주 25만·4주 80만, 분양·청약 1주 28만·4주 90만(하루 단위 없음) · 위치 안내가 단가표에서 읽음', wk('cat_top') === '{"1":250000,"4":800000}' && wk('cat_top_bun') === '{"1":280000,"4":900000}' && adp.includes("WK('cat_top')]") && adp.includes("WK('cat_top_bun')]"), [wk('cat_top'), wk('cat_top_bun')]);
  check('/ad/ 문의 폼: 상단 배너 가격 표시(단가표에서 채움)', adp.includes('홈 상단 배너<small class="pp" data-wk="home_top"></small>') && adp.includes('<small class="pp" data-wk="cat_top"></small><small class="pp" data-wk="cat_top_bun" data-pre="분양·청약 "></small>') && /el\.textContent = \(el\.dataset\.pre \|\| ''\) \+ WK\(el\.dataset\.wk\)/.test(adp), '');
  const topRows = doc.split('\n').filter(l => /`\w+_top`/.test(l));
  check('문서: 상단 배너 줄 가격(홈 1주 50만·4주 150만, 분양·청약 1주 28만·4주 90만, 나머지 1주 25만·4주 80만)', topRows.every(l => /`home_top`/.test(l) ? l.includes('1주 50만 · 4주 150만 원') && !l.includes('1일') : /`(bunyang|chungyak)_top`/.test(l) ? l.includes('| 1주 28만 · 4주 90만 원 |') : l.includes('| 1주 25만 · 4주 80만 원 |')) && topRows.length === 9, topRows.length);
  check("/ad/·문서: '제안가'·'확정 전' 문구 없음", !/제안가|확정 전/.test(adp + doc), '');
  check('/ad/ 문의 폼: 홈 상단 배너·카테고리 상단 배너', adp.includes('value="home_top"> <span>홈 상단 배너') && adp.includes('value="cat_top"> <span>카테고리 상단 배너'), '');
  const gs = read('tools/agent-backend.gs');
  /* 하루 단위 광고 가격 표시가 남아 있으면 실패 ('1일 5만 원', '1일 10만 ·', '하루 5만원' 등. '하루 1개 광고주'·'하루 4번' 같은 노출 규칙은 괜찮음) */
  const DAY = /(?:1일|하루)\s*\(?\s*[0-9][0-9,.]*\s*(?:만\s*원|만|원)/;
  const dayFiles = ['ad/index.html', 'ad/plan/index.html', 'assets/ad-prices.js', 'assets/ad-plan-core.js', 'docs/ad_slots.md', 'pro/developer/index.html', 'tools/agent-backend.gs', 'assets/ad-slot.js', 'assets/brief-core.js', 'assets/brief-ad.js', 'assets/brief-stat.js',
    ...['brief', 'bunyang/apply', 'bunyang/agency', 'agent', 'premium'].flatMap(d => fs.readdirSync(path.join(ROOT, d), { recursive: true }).filter(f => /\.html$/.test(f)).map(f => d + '/' + f))];
  for (const f of dayFiles) { if (!fs.existsSync(path.join(ROOT, f))) continue; const m = read(f).match(DAY); check(`${f}: '1일·하루 …원' 광고 가격 표시 없음`, !m, m && m[0]); }
  check('하루 단위 검사 자체 확인(1일 5만 원 → 걸림, 하루 1개 광고주 → 통과)', DAY.test('1일 5만 원 · 1주') && DAY.test('1일 10만 · 1주') && !DAY.test('하루 1개 광고주') && !DAY.test('하루 4번 갱신'), '');
  check('서버 v37: 브리핑광고 7일 미만 경고', /v37: 광고 하루 단위 판매 없앰/.test(gs) && /const BA_MIN_DAYS = 7;/.test(gs) && /try \{ briefAdWarn\(sh, v\); \}/.test(gs), '');
  { const src = gs.match(/function baDays\(a, b\) \{[\s\S]*?\n\}/)[0];
    const baDays = new Function('ymd', src + '; return baDays;')(d => d.toISOString().slice(0, 10));
    check('7일 = 1주(경고 없음), 6일 = 경고', baDays('2026-12-01', '2026-12-07') === 7 && baDays('2026-12-01', '2026-12-06') < 7 && baDays('2026-12-01', '2026-12-28') === 28 && baDays('x', '2026-12-01') === 0, ''); }
  check('서버 v36: 문의 관심 상품에 home_top·cat_top', /v36: 광고 문의 홈·카테고리 상단 배너/.test(gs) && /AQ_PROD\.home_top = '홈 상단 배너'; AQ_PROD\.cat_top = '카테고리 상단 배너';/.test(gs), '');
  const all = Object.keys(PAGES).map(read).join('\n') + read('assets/ad-slot.js') + adp;
  check('화면 문구에 금지 단어 없음(시험·검증·채점)', !/[>'"][^<'"]*(시험|검증|채점)/.test(read('assets/ad-slot.js')) && !/(시험|검증|채점)/.test(adp.slice(adp.indexOf('id="slots"'), adp.indexOf('id="target"'))), '');
}

/* ⑦ 지역 광고: 그 지역 광고(시·군·구 → 시·도) → 전국 → 자체 광고 · 같은 자리·같은 지역 한 광고주 */
{
  const base = { cat: 'mine', industry: '이사', slot: 'mine_end' };
  const ads = [ad(Object.assign({ id: 'nat', advertiser: '전국이사', start: '2026-12-01' }, base)), ad(Object.assign({ id: 'sd11', advertiser: '서울이사', region: '11', start: '2026-12-02' }, base)),
    ad(Object.assign({ id: 'g11680', advertiser: '강남이사', region: '11680', start: '2026-12-03' }, base)), ad(Object.assign({ id: 'g26', advertiser: '부산이사', region: '26', start: '2026-12-01' }, base))];
  check('지역: 강남구 화면 → 강남구 광고', A.pick(ads, 'mine_end', 'mine', TODAY, [], { sido: '11', sgg: '11680' }).id === 'g11680', '');
  check('지역: 서초구 화면 → 서울(시·도) 광고', A.pick(ads, 'mine_end', 'mine', TODAY, [], { sido: '11', sgg: '11650' }).id === 'sd11', '');
  check('지역: 대구 화면 → 전국 광고(다른 지역 광고는 안 보임)', A.pick(ads, 'mine_end', 'mine', TODAY, [], { sido: '27', sgg: '27110' }).id === 'nat', '');
  check('지역 정보가 없는 화면 → 전국 광고', A.pick(ads, 'mine_end', 'mine', TODAY, [], {}).id === 'nat' && A.pick(ads, 'mine_end', 'mine', TODAY).id === 'nat', '');
  check('지역 광고만 있고 화면 지역을 모르면 → 자체 광고', A.pick(ads.filter(a => a.region), 'mine_end', 'mine', TODAY, [], {}).house, '');
  check('시·군·구만 알아도 시·도 광고에 맞음', A.regionScore('11', { sgg: '11680' }) === 2 && A.regionScore('11680', { sido: '11' }) === 0, '');
  check('지역 코드 형식(2자리·5자리만)', A.normRegion('11680') === '11680' && A.normRegion('11') === '11' && A.normRegion('서울') === '' && A.normRegion('116') === '', '');
  const c1 = A.conflicts([ad({ id: 'x1', advertiser: 'A', slot: 'tax_end', cat: 'tax', region: '11680', start: '2026-12-01', end: '2026-12-28' }), ad({ id: 'x2', advertiser: 'B', slot: 'tax_end', cat: 'tax', region: '11680', start: '2026-12-20', end: '2027-01-16' })]);
  check('같은 자리·같은 지역·기간 겹침 → 충돌', JSON.stringify(c1) === '[["x1","x2"]]', c1);
  const c2 = A.conflicts([ad({ id: 'y1', advertiser: 'A', slot: 'tax_end', region: '11680', start: '2026-12-01', end: '2026-12-28' }), ad({ id: 'y2', advertiser: 'B', slot: 'tax_end', region: '11650', start: '2026-12-01', end: '2026-12-28' }),
    ad({ id: 'y3', advertiser: 'C', slot: 'tax_end', region: '11680', start: '2026-12-29', end: '2027-01-25' }), ad({ id: 'y4', advertiser: 'D', slot: 'tax_top', region: '11680', start: '2026-12-01', end: '2026-12-28' })]);
  check('다른 지역·이어지는 기간·다른 자리는 충돌 아님', c2.length === 0, c2);
  const c3 = A.conflicts([ad({ id: 'z1', advertiser: 'A', cat: 'tax', start: '2026-12-01', end: '2026-12-28' }), ad({ id: 'z2', advertiser: 'B', slot: 'tax_end', start: '2026-12-10', end: '2026-12-17' })]);
  check('화면 전체(cat) 광고와 그 화면 칸 광고가 같은 지역·기간이면 충돌', c3.length === 1, c3);
  check('data/ads.json: 같은 자리·같은 지역에 겹치는 광고주 없음', A.conflicts(JSON.parse(read('data/ads.json')).ads).length === 0, A.conflicts(JSON.parse(read('data/ads.json')).ads));
  const js = read('assets/ad-slot.js');
  check('GA4 노출·누름 기록에 region', /track\('ad_slot_view', \{[^}]*region: el\._rgv \|\| '전국'/.test(js) && /track\('ad_slot_click', \{[^}]*region: el\._rgv \|\| '전국'/.test(js), '');
  check('화면 지역: 주소 g·d·k(5자리)·sd, 홈 지역, data-ad-region, setRegion', /q\.get\('g'\)/.test(js) && /jdj_home_region/.test(js) && /data-ad-region/.test(js) && /api\.setRegion = setRegion/.test(js), '');
  check('세금 화면: 고른 주소로 setRegion · 브리핑: 관심 지역 data-ad-region', /JDJ_ADSLOT\.setRegion\(\{ sido: sd\.value, gu: gu\.value \}\)/.test(read('tax/index.html')) && /document\.body\.setAttribute\('data-ad-region', String\(S\.g\)\)/.test(read('brief/index.html')), '');
}

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log((r.ok ? '  ok  ' : '  FAIL') + ' ' + r.name + (r.ok ? '' : '  → ' + JSON.stringify(r.got))));
console.log(`\n${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
