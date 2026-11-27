/* 분양 광고 시안(assets/ads-proto.js) 시험 — node tools/ads-proto-test.js </dev/null
   이 기기 안 맞춤(지역·예산 구간·무주택·가점 구간), 하루 노출 제한, '왜 보이나요' 문장, 숨김 기본값(config ADS_PROTO=false)을 확인해요. */
'use strict';
const assert = require('assert');
const fs = require('fs'), path = require('path');
const P = require('../assets/ads-proto.js');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

/* 구간 */
ok(P.budgetBand(65000) === '6~9억', '예산 6.5억 → 6~9억');
ok(P.budgetBand(29999) === '~3억' && P.budgetBand(150000) === '15억~', '예산 끝 구간');
ok(P.budgetBand(0) === '' && P.budgetBand('x') === '', '예산 없음');
ok(P.cyBand(55) === '50~64점' && P.cyBand(0) === '~29점' && P.cyBand(84) === '65점~', '가점 구간');
ok(P.cyBand(90) === '' && P.cyBand('') === '', '가점 범위 밖');

const E = P.EXAMPLES, byId = id => E.find(a => a.id === id);
/* 모든 시안 광고는 '예시'·가상 광고주 */
ok(E.every(a => a.example === true && /가상/.test(a.advertiser) && /가상/.test(a.name)), '모두 예시·가상');

/* 지역 맞춤 */
const g = P.choose(E, { page: 'home', code: '11500' });
ok(g && g.a.id === 'ex_gangseo' && g.why.includes('region'), '강서구 보는 중 → 강서 현장');
ok(P.score(byId('ex_hanam'), { page: 'home', code: '26110' }) === 0, '부산 보는 중 → 하남 광고 없음');
const busan = P.choose(E, { page: 'home', code: '26110' });
ok(busan && busan.a.id === 'ex_small', '지역 조건 없는 광고만 남음');
ok(P.score(byId('ex_gangseo'), { page: 'home', sido: '서울특별시', sggName: '강서구' }).why.includes('region'), '이름으로도 같은 구');

/* 예산: 구간을 알면 살 수 없는 집 광고는 빼기 */
ok(P.score(byId('ex_gangseo'), { page: 'buy', budget: '~3억' }) === 0, '예산 3억 미만 → 강서(6~12억) 없음');
ok(P.choose(E, { page: 'buy', budget: '~3억' }).a.id === 'ex_small', '예산 3억 미만 → 소형');
ok(P.choose(E, { page: 'buy', budget: '3~6억', code: '41450' }).a.id === 'ex_hanam', '하남 + 3~6억');

/* 무주택 */
const nh = P.score(byId('ex_gangseo'), { page: 'home', noHome: true });
ok(nh && nh.why.includes('nohome'), '무주택 가산');
ok(P.score(Object.assign({}, byId('ex_gangseo'), { target: Object.assign({}, byId('ex_gangseo').target, { noHome: 'only' }) }), { page: 'home' }) === 0, 'only 인데 무주택 모름 → 없음');

/* 가점 */
ok(P.score(byId('ex_hanam'), { page: 'home', cy: '~29점' }) === 0, '하남 가점 조건 밖');

/* 자리 제한 */
ok(P.score(byId('ex_gangseo'), { page: 'report' }) === 0, '유료 리포트 등 정하지 않은 자리에는 안 실림');

/* 하루 노출 제한·같은 화면 중복 */
ok(P.choose(E, { page: 'home', code: '11500' }, [], { ex_gangseo: P.FC_MAX }).a.id !== 'ex_gangseo', '하루 제한 넘으면 다음 광고');
ok(P.choose(E, { page: 'home', code: '11500' }, [], { ex_gangseo: P.FC_MAX }, true).a.id === 'ex_gangseo', '미리 보기는 제한 무시');
ok(P.choose(E, { page: 'home', code: '11500' }, ['ex_gangseo']).a.id !== 'ex_gangseo', '같은 화면 중복 없음');
let st = P.bump(null, 'a', '2026-11-27'); st = P.bump(st, 'a', '2026-11-27');
ok(st.n.a === 2, '같은 날 누적'); ok(P.bump(st, 'a', '2026-11-28').n.a === 1, '날짜 바뀌면 새로');

/* 왜 보이나요: 이 기기 안에서만 맞춘다는 설명 + 값은 구간 이름만 */
const w = P.whyText(P.choose(E, { page: 'buy', code: '11500', budget: '6~9억' }), { sggName: '강서구', budget: '6~9억' });
ok(/강서구/.test(w) && /6~9억/.test(w) && /보내지 않아요/.test(w), '왜 보이나요 문장');

/* 숨김 기본값·경쟁 앱 이름 없음 */
const root = path.join(__dirname, '..');
ok(/ADS_PROTO:\s*false/.test(fs.readFileSync(path.join(root, 'assets/config.js'), 'utf8')), 'config ADS_PROTO=false');
const src = fs.readFileSync(path.join(root, 'assets/ads-proto.js'), 'utf8');
ok(!/직방|호갱|네이버|카카오|리치고|아실/.test(src), '경쟁 앱 이름 없음');
ok(/preview=ads/.test(src) && /preview=off/.test(src), '미리 보기 켜기·끄기');
['index.html', 'map/index.html', 'bunyang/index.html', 'buy/index.html'].forEach(f => {
  const t = fs.readFileSync(path.join(root, f), 'utf8');
  ok(/assets\/ads-proto\.js\?v=\d+" data-page="(home|map|bunyang|buy)"/.test(t), f + ' 시안 스크립트');
});
console.log('ads-proto-test: ' + n + ' passed');
