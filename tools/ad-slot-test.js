/* 광고 칸(assets/ad-slot.js) 자동 확인 — 실행: node tools/ad-slot-test.js </dev/null
   ① 세금 계산 결과 안에는 칸이 없다  ② 휴대폰 한 화면 광고 최대 2개  ③ 유료 광고가 없으면 자체 광고(빈 칸 없음)
   ④ 어떤 칸이든 '광고' 표시  ⑤ 화면별 업종 규칙(세무사 정액만·심사 거절 업종 차단·기간)  ⑥ 페이지마다 스크립트·칸 이름·문서 표가 맞음 */
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
  'buy/report/index.html': ['report_end'], 'land/draft/index.html': ['land_end'], 'agent/index.html': ['agent_end']
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
  check('세금: 칸 안 문구에 "세금 계산 결과와 관계없는 광고"', A.html(A.houseAd('brief'), 'tax_end', 'tax').includes('세금 계산 결과와 관계없는 광고예요'), '');
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

/* ④ '광고' 표시 */
{
  const paid = ad({ cat: 'jeonse', industry: '보증보험', image: 'https://example.com/a.png' });
  for (const c of Object.keys(A.CATS)) for (const top of [false, true]) for (const a of [A.houseAd(A.CATS[c].house[0]), paid]) {
    const h = A.html(a, c + '_x', c, top);
    check(`${c}${top ? ' 상단' : ''} ${a.house ? '자체' : '유료'}: '광고' 표시`, /<span class="jas-tag">광고<\/span>/.test(h), '');
  }
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

/* ⑥ 페이지·문서·자료 */
{
  for (const [f, want] of Object.entries(PAGES)) {
    const h = read(f), ss = slotsOf(h);
    check(`${f}: 칸 이름 ${want.join('·')}`, JSON.stringify(ss.map(s => s.id).sort()) === JSON.stringify(want.slice().sort()), ss.map(s => s.id));
    check(`${f}: ad-slot.js 포함`, /assets\/ad-slot\.js\?v=\d+/.test(h), '');
    check(`${f}: aplus.css?v=43 이상`, /aplus\.css\?v=(4[3-9]|[5-9]\d)/.test(h), '');
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
  check('sw.js: ad-slot.js·aplus v43 미리 저장', sw.includes('/assets/ad-slot.js?v=1') && sw.includes('/assets/aplus.css?v=43'), '');
  const adp = read('ad/index.html');
  check('/ad/: 광고 위치 안내 칸', adp.includes('id="slots"') && adp.includes('광고 위치 안내'), '');
  const slotSec = adp.slice(adp.indexOf('id="slots"'), adp.indexOf('id="target"'));
  check('/ad/: 홈 상단 = 가장 비싼 자리 · 확정가 1일 10만·1주 50만·4주 150만', adp.includes('가장 비싼 자리') && adp.includes("'1일 10만 · 1주 50만 · 4주 150만 원'"), '');
  check('/ad/: 카테고리 상단 1주 25만·4주 80만(분양·청약 1주 28만·4주 90만), 하루 단위 없음', adp.includes("'1주 25만 · 4주 80만 원'") && adp.includes("'1주 28만 · 4주 90만 원'") && !/'1일 [0-9]+만 · 1주 2[58]만/.test(adp), '');
  check('/ad/ 문의 폼: 상단 배너 가격 표시', adp.includes('카테고리 상단 배너<small class="pp">1주 25만 · 4주 80만 원</small><small class="pp">분양·청약 1주 28만 · 4주 90만 원</small>') && adp.includes('홈 상단 배너<small class="pp">1일 10만 · 1주 50만 · 4주 150만 원</small>'), '');
  const topRows = doc.split('\n').filter(l => /`\w+_top`/.test(l));
  check('문서: 상단 배너 줄 가격(홈 1일·1주·4주, 분양·청약 1주 28만·4주 90만, 나머지 1주 25만·4주 80만)', topRows.every(l => /`home_top`/.test(l) ? l.includes('1일 10만 · 1주 50만 · 4주 150만 원') : /`(bunyang|chungyak)_top`/.test(l) ? l.includes('| 1주 28만 · 4주 90만 원 |') : l.includes('| 1주 25만 · 4주 80만 원 |')) && topRows.length === 9, topRows.length);
  check("/ad/·문서: '제안가'·'확정 전' 문구 없음", !/제안가|확정 전/.test(adp + doc), '');
  check('/ad/ 문의 폼: 홈 상단 배너·카테고리 상단 배너', adp.includes('value="home_top"> <span>홈 상단 배너') && adp.includes('value="cat_top"> <span>카테고리 상단 배너'), '');
  const gs = read('tools/agent-backend.gs');
  check('서버 v36: 문의 관심 상품에 home_top·cat_top', /백엔드 \(v36:/.test(gs) && /AQ_PROD\.home_top = '홈 상단 배너'; AQ_PROD\.cat_top = '카테고리 상단 배너';/.test(gs), '');
  const all = Object.keys(PAGES).map(read).join('\n') + read('assets/ad-slot.js') + adp;
  check('화면 문구에 금지 단어 없음(시험·검증·채점)', !/[>'"][^<'"]*(시험|검증|채점)/.test(read('assets/ad-slot.js')) && !/(시험|검증|채점)/.test(adp.slice(adp.indexOf('id="slots"'), adp.indexOf('id="target"'))), '');
}

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log((r.ok ? '  ok  ' : '  FAIL') + ' ' + r.name + (r.ok ? '' : '  → ' + JSON.stringify(r.got))));
console.log(`\n${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
