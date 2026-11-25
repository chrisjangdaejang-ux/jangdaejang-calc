/* 점수 읽는 법(/guide/method/) 일관성 자동 점검 — 실행: node tools/method-consistency-test.js </dev/null
   매일 자동 점검(tools/e2e/ci.js → 09:07 보고)에 함께 돌아요. 실패하는 경우:
     ① 뺀 이유가 '방향이 바뀌었다'는데 그 항목만 따로 떼어 본 과거 사례는 같은 방향이 뚜렷함
     ② 같은 과거 사례 문장이 두 항목에 붙음(예: 신축 프리미엄·재건축 기대감이 같은 '연식' 사례를 나눠 가짐)
     ③ 뺀 항목인데 다른 곳(구 점수·다른 보유 기간 점수)에 쓰면서 그 표시가 없음
     ④ '집값에 영향을 준다는데 왜 안 쓰나요?'(#why) 표·이름·개수가 excluded.json 과 다름(구 점수에 쓰는 항목 누락, 뺀 구 후보 누락, 결과 칸 어긋남,
        개수 합 불일치, 빠질 항목 표시, 한 줄 이유에 숫자 기준·가중치·금지 단어)
   1부: 만든 자료로 규칙 확인(항상)  2부: 실제 공개 자료(excluded.json·evidence.json)로 화면과 같은 계산 — 받지 못하면 건너뜀(실패 아님) */
'use strict';
const fs = require('fs'), path = require('path'), https = require('https');
const T = require('../assets/track-core.js');
const NAR = require('../assets/narrative.js');
let pass = 0, fail = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else fail++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : `\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`));
}

/* ---------- 1부: 규칙 ---------- */
const FLIP = n => `${n}은 시기마다 집값에 주는 방향이 바뀌어(어떤 때는 오르는 쪽, 어떤 때는 내리는 쪽) 과거에 안 맞아서 뺐어요.`;
const EX = { reasons: {},
  used: { unit: { 1: [['stg', '재건축 진행 단계'], ['sch', '학군 수요']], 2: [['mom', '최근 가격 흐름'], ['stg', '재건축 진행 단계'], ['sch', '학군 수요']],
    3: [['stg', '재건축 진행 단계']], 5: [['mom', '최근 가격 흐름'], ['stg', '재건축 진행 단계']] },
    region: [['sup', '향후 2년 입주 물량'], ['dd', '구 하락기 방어력']] },
  unit: { 1: [['mom', '최근 가격 흐름', 'unstable', FLIP('최근 가격 흐름')]],
    2: [['dd', '하락기 방어력', 'unstable', FLIP('하락기 방어력')], ['sub', '역세권', 'unstable', FLIP('역세권')], ['new', '신축 프리미엄', 'unstable', FLIP('신축 프리미엄')],
      ['old', '재건축 기대감', 'unstable', FLIP('재건축 기대감')], ['size', '단지 규모', 'unstable', FLIP('단지 규모')], ['liq', '거래 활발도', 'no_gain', '거래 활발도는 넣어 봤는데 더 잘 맞히지 못해 뺐어요.']],
    3: [['sch', '학군 수요', 'no_data', 'x']] },
  off: [['pol', '최근 정책 대상', 'no_gain', '최근 정책 대상은 넣어 봤는데 과거에 그대로 써 보니 더 잘 맞히지 못해 뺐어요.']], region: [] };
/* 과거 사례(가짜): 역세권은 같은 방향 뚜렷, 연식은 새 아파트 구간·재건축 연한 구간이 따로, 단지 규모는 비슷 */
const CS = { sd: [{ b: 'd300', ok: true, up: true, text: '역까지 직선 거리가 300m 이내였던 서울 단지 1,000건 중 600건이 더 올랐어요.' }],
  ag: [{ b: 'n5', ok: true, up: true, text: '지은 지 5년 이내였던 전국 단지 …' }, { b: 'm19', ok: false, up: true, text: '지은 지 11~19년이었던 전국 단지 …' },
    { b: 'r30', ok: true, up: true, text: '지은 지 30년 이상이었던 전국 단지 …' }],
  hh: [{ b: 'h4', ok: false, up: true, text: '세대수가 1,000세대 넘었던 전국 단지 … 비슷했어요.' }] };
const xcs = k => CS[k] || [];
const I = T.method(EX, 2, xcs);
const O = n => I.out.find(x => x.name === n);
check('역세권: 따로 떼어 본 사례는 같은 방향 → "함께 넣었을 때 더 잘 맞히지 못함"(방향이 바뀐다고 하지 않음)', [O('역세권').why, /방향이 바뀌/.test(O('역세권').reason), /따로 떼어 본 과거 사례에서는 같은 방향이 뚜렷/.test(O('역세권').reason)], ['combo', false, true]);
check('단지 규모: 사례도 비슷 → 방향이 바뀌었고 사례도 비슷', [O('단지 규모').why, /방향이 바뀌/.test(O('단지 규모').reason)], ['flip_mixed', true]);
check('하락기 방어력: 사례 없음 → 엔진 결과(방향이 바뀜) 그대로', O('하락기 방어력').why, 'flip');
check('거래 활발도(no_gain, 사례 없음) → 더 잘 맞히지 못함', O('거래 활발도').why, 'gain');
check('신축 프리미엄 = 새 아파트 구간만, 재건축 기대감 = 재건축 연한 구간만(같은 사례 문장 없음)', [O('신축 프리미엄').cases.map(c => c.b), O('재건축 기대감').cases.map(c => c.b)], [['n5'], ['r30']]);
check('하락기 방어력: "단지 점수에서는 뺐지만 구 점수에는 써요" 표시', O('하락기 방어력').tags.map(t => t.t), ['region']);
check('최근 가격 흐름: 2년 보유에선 쓰는 항목 → 쓰는 항목 쪽에 "2·5년 보유에서만 써요"', I.use.find(x => x.key === 'mom').tags.map(t => t.text), ['2·5년 보유에서만 써요']);
check('재건축 진행 단계: 모든 보유 기간에 씀 → 표시 없음', I.use.find(x => x.key === 'stg').tags, []);
const I3 = T.method(EX, 1, xcs);
check('1년 보유: 최근 가격 흐름은 뺐지만 2·5년 보유에서는 씀 → 표시', (I3.out.find(x => x.key === 'mom') || {}).tags.map(t => t.text), ['2·5년 보유에서만 써요(1년 보유 점수에서는 뺐어요)']);
check('정리된 자료는 점검 통과', [T.audit(I, EX, 2), T.audit(I3, EX, 1)], [[], []]);
/* 점검이 문제를 잡아내는지(일부러 망가뜨린 자료) */
const bad1 = JSON.parse(JSON.stringify(I)); bad1.out.find(x => x.name === '역세권').reason = FLIP('역세권');
check('① 이유는 방향이 바뀐다는데 사례는 같은 방향 → 잡아냄', T.audit(bad1, EX, 2).some(t => /역세권: 이유는 '방향이 바뀜'/.test(t)), true);
const bad2 = JSON.parse(JSON.stringify(I)); bad2.out.find(x => x.name === '재건축 기대감').cases = bad2.out.find(x => x.name === '신축 프리미엄').cases.slice();
check('② 같은 과거 사례 문장이 두 항목에 → 잡아냄', T.audit(bad2, EX, 2).some(t => /두 항목에/.test(t)), true);
const bad3 = JSON.parse(JSON.stringify(I)); bad3.out.find(x => x.name === '하락기 방어력').tags = [];
check('③ 구 점수에 쓰는데 표시 없음 → 잡아냄', T.audit(bad3, EX, 2).some(t => /구 점수에는 쓰는데/.test(t)), true);
const bad4 = JSON.parse(JSON.stringify(I3)); bad4.out.find(x => x.key === 'mom').tags = [];
check('③ 다른 보유 기간에 쓰는데 표시 없음 → 잡아냄', T.audit(bad4, EX, 1).some(t => /다른 보유 기간/.test(t)), true);
check('예전 방식(엔진 같은 틀 문장 그대로)은 점검에 걸림', T.audit(Object.assign({}, I, { out: I.out.map(x => Object.assign({}, x, { reason: x.plain, tags: [] })) }), EX, 2).length > 0, true);
check('화면 문장에 금지 단어 없음(시험·통과·검증·채점)', I.out.map(x => x.reason).filter(t => /시험|통과|검증|채점|백테스트/.test(t)), []);
const page = fs.readFileSync(path.join(__dirname, '..', 'guide', 'method', 'index.html'), 'utf8');
check('방법 화면이 같은 계산(T.method·xcsOf)과 표시를 씀', [/T\.method\(EX, 2, xcs\)/.test(page), /T\.xcsOf\(NAR, EVD\)/.test(page), /x\.reason/.test(page), /tagHtml\(x\)/.test(page), !/esc\(x\.plain\)/.test(page)], [true, true, true, true, true]);

/* ---------- 1부-2: '왜 안 쓰나요?'(#why) ---------- */
const EXW = JSON.parse(JSON.stringify(EX));
EXW.used.region = [['sup', '향후 2년 입주 물량'], ['pop', '인구 증가'], ['dd', '구 하락기 방어력'], ['ob6', '외지인 매수 비중(6개월)']];
EXW.region = [['pop3', '인구 증감(3년)', 'no_gain', 'x'], ['uns', '미분양 물량(재고 대비)', 'no_gain', 'x'], ['h12', '1·2인 세대 비중', 'no_data', 'x']];
const IW = T.method(EXW, 2, xcs), W = T.why(EXW, IW, 2);
const row = n => W.rows.find(r => r.name === n) || {};
check('#why: 구 점수에 쓰는 항목은 "구 점수에만"', [row('인구 증가').label, row('향후 2년 입주 물량').label], ['구 점수에만', '구 점수에만']);
check('#why: 뺀 구 후보(자료 부족 포함)는 "뺐다"', [row('인구 증감(3년)').label, row('미분양 물량(재고 대비)').label, row('1·2인 세대 비중').label], ['뺐다', '뺐다', '뺐다']);
check('#why: 단지 점수에 쓰는 항목은 "쓴다"', [row('학군 수요').label, row('재건축 진행 단계').label], ['쓴다', '쓴다']);
check('#why: 단지에서는 뺐지만 구 점수에 쓰는 하락기 방어력 → 한 줄로 합쳐 "구 점수에만"(구 줄 따로 없음)', [row('하락기 방어력').label, !!W.rows.find(r => r.name === '구 하락기 방어력')], ['구 점수에만', false]);
check('#why: 역세권(따로 보면 뚜렷·함께 넣으면 못 맞힘) → ③ 겹침 예시', [row('역세권').label, W.combo.includes('역세권')], ['뺐다', true]);
check('#why: 외지인 매수 비중이 아직 구 점수에 있으면 "곧 빠져요"(다음 정기 업데이트부터)', [row('외지인 매수 비중(6개월)').pending, W.drop[0].pending, W.regionUsed.includes('외지인 매수 비중(6개월)')], [true, true, false]);
const EXW2 = JSON.parse(JSON.stringify(EXW)); EXW2.used.region = EXW2.used.region.filter(x => x[0] !== 'ob6'); EXW2.region.push(['ob6', '외지인 매수 비중(6개월)', 'no_gain', 'x']);
const W2 = T.why(EXW2, T.method(EXW2, 2, xcs), 2);
check('#why: 엔진이 빼면 "뺐다"로 바뀜(빠짐 표시도 "뺐어요")', [(W2.rows.find(r => r.key === 'ob6') || {}).label, W2.drop[0].pending], ['뺐다', false]);
check('#why: ① 이름은 구 점수에 쓰는 인구·세대·입주 물량만', W.regionBig, ['인구 증가', '향후 2년 입주 물량']);
check('#why: 후보 수·채택 수는 재학습 기록 그대로(28개 중 0개)', [W.rec.tried, W.rec.adopted, W.rec.day], [28, 0, '2026-11-25']);
check('#why: 결과별 개수 합 = 표 줄 수', W.counts.use + W.counts.region + W.counts.out, W.rows.length);
check('#why: 정리된 자료는 점검 통과', [T.whyAudit(W, EXW, 2), T.whyAudit(W2, EXW2, 2)], [[], []]);
const wb1 = JSON.parse(JSON.stringify(W)); wb1.rows = wb1.rows.filter(r => r.name !== '인구 증가');
check('④ 구 점수에 쓰는 항목이 표에서 빠지면 잡아냄', T.whyAudit(wb1, EXW, 2).some(t => /인구 증가/.test(t)), true);
const wb2 = JSON.parse(JSON.stringify(W)); wb2.rows.find(r => r.name === '미분양 물량(재고 대비)').res = 'use';
check('④ 뺀 후보를 "쓴다"로 적으면 잡아냄', T.whyAudit(wb2, EXW, 2).some(t => /미분양/.test(t)), true);
const wb3 = JSON.parse(JSON.stringify(W)); wb3.rows[0].why = '개선 폭이 0.5%p 보다 커서 써요';
check('④ 한 줄 이유에 숫자 기준이 들어가면 잡아냄', T.whyAudit(wb3, EXW, 2).some(t => /숫자 기준/.test(t)), true);
const wb4 = JSON.parse(JSON.stringify(W2)); wb4.drop[0].pending = false;
check('④ 빠졌다는데 아직 구 점수에 쓰면 잡아냄', T.whyAudit(Object.assign({}, wb4), EXW, 2).some(t => /빠졌다는데/.test(t)), true);
check('#why 화면이 같은 계산(T.why)과 기록 개수(R.tried·R.adopted)를 쓰고 숫자를 손으로 적지 않음',
  [/T\.why\(EX, I, 2\)/.test(page), /R\.tried/.test(page), /R\.adopted/.test(page), !/후보 28개|28개 살펴봄|채택 0개/.test(page), /id="why"/.test(page)], [true, true, true, true, true]);

/* ---------- 2부: 실제 공개 자료 ---------- */
const ORIGIN = (process.env.DATA_ORIGIN || 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/').replace(/\/?$/, '/');
const LOCAL = process.env.METHOD_DATA_DIR;   // 손으로 받아 둔 공개 자료 폴더로 확인할 때(선택)
const get = f => LOCAL ? Promise.resolve((() => { try { return JSON.parse(fs.readFileSync(path.join(LOCAL, f), 'utf8')); } catch (e) { return null; } })()) : new Promise(res => {
  const req = https.get(ORIGIN + 'data/' + f, { timeout: 20000 }, r => {
    if (r.statusCode !== 200) { r.resume(); return res(null); }
    let b = ''; r.setEncoding('utf8'); r.on('data', c => b += c); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { res(null); } });
  });
  req.on('error', () => res(null)); req.on('timeout', () => { req.destroy(); res(null); });
});
(async () => {
  const [REX, EVD] = await Promise.all([get('excluded.json'), get('evidence.json')]);
  if (!REX || !EVD) console.log('건너뜀: 실제 공개 자료를 받지 못했어요(인터넷 없음) — 1부 규칙 확인만');
  else {
    const xr = T.xcsOf(NAR, EVD);
    for (const h of ['1', '2', '3', '5']) {
      if (!((REX.used || {}).unit || {})[h]) continue;
      const P = T.audit(T.method(REX, h, xr), REX, h);
      check(`실제 자료 ${h}년 보유: 이유·과거 사례·표시가 서로 맞음`, P, []);
    }
    const RW = T.why(REX, T.method(REX, 2, xr), 2);
    check('실제 자료 #why: 표·이름·개수가 excluded.json 과 맞음', T.whyAudit(RW, REX, 2), []);
    check('실제 자료 #why: 구 점수에 쓰는 항목이 모두 표에 "구 점수에만"으로 있음', (REX.used.region || []).filter(([k]) => !RW.rows.some(r => r.key === k && r.res === 'region')).map(x => x[1]), []);
    check('실제 자료 #why: ①·표의 구 점수 항목 수 = excluded.json used.region 수', RW.regionUsed.length + RW.drop.filter(d => d.pending).length, (REX.used.region || []).length);
  }
  console.log(`점수 읽는 법 일관성 점검: ${pass}개 통과, ${fail}개 실패`);
  process.exit(fail ? 1 : 0);
})();
