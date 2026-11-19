/* 정책 칸(assets/policy-view.js) 검증: 지역 판정·단계 배지·가격 조건·전월세 모드. node tools/policy-test.js [policy.json] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = {window: {}, document: {getElementById: () => true, createElement: () => ({}), head: {appendChild(){}}}, fetch: () => Promise.reject(new Error('x'))};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/policy-view.js'), 'utf8'), ctx);
const P = ctx.window.JDJPolicy;
let ok = 0, bad = 0;
const t = (name, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); if (g === w) ok++; else { bad++; console.log('실패', name, '→', g, '기대', w); } };

t('구 단위 일치', P.applies({in: ['11680']}, '11680', '압구정동'), 'yes');
t('다른 구', P.applies({in: ['11680']}, '11650', ''), false);
t('시도 2자리', P.applies({in: ['11']}, '11440', ''), 'yes');
t('수도권', P.applies({in: ['metro']}, '41135', ''), 'yes');
t('수도권 밖', P.applies({in: ['nonmetro']}, '41135', ''), false);
t('제외 목록', P.applies({in: ['11'], not: ['11680']}, '11680', ''), false);
t('동 단위: 그 동', P.applies({in: ['11680:압구정동']}, '11680', '압구정동'), 'yes');
t('동 단위: 다른 동', P.applies({in: ['11680:압구정동']}, '11680', '역삼동'), false);
t('동 단위: 동 모름 → 일부 동', P.applies({in: ['11680:압구정동']}, '11680', ''), 'part');
t('배지: 법안', P.badge({status: 'bill', stages: [{s: '발표'}, {s: '입법예고'}]}), ['입법예고 단계 · 확정 아님', 'bill']);
t('배지: 시행 중', P.badge({status: 'active', stages: [{s: '발표'}, {s: '시행'}]}), ['시행 중', 'on']);
t('배지: 해제', P.badge({status: 'past', stages: [{s: '발표'}, {s: '시행'}, {s: '해제'}]}), ['해제됨', 'off']);
t('배지: 철회', P.badge({status: 'past', stages: [{s: '발표'}, {s: '철회'}]}), ['철회', 'off']);
t('배지: 발표만', P.badge({status: 'active', stages: [{s: '발표'}]}), ['발표', 'ann']);

const D = {asof: '2026-11-19', recent: {}, policies: [
  {id: 'a', name: '법안', date: '2026-08-03', status: 'bill', types: ['세금-양도'], stages: [{s: '발표', d: '2026-08-03'}], in: ['all'], plain: 'x', price: '20억 원 초과', ptier: [20, null], src: [['원문', 'https://www.korea.kr/x']]},
  {id: 'b', name: '대출', date: '2025-06-27', status: 'active', types: ['대출'], stages: [{s: '시행', d: '2025-06-28'}], in: ['metro'], plain: 'y', rent: true, src: []},
  {id: 'c', name: '지난', date: '2020-06-23', status: 'past', types: ['토허'], stages: [{s: '해제', d: '2025-02-13'}], in: ['11680:대치동'], plain: 'z', src: []}]};
const g = P.forCodes(D, [{sgg: '11680', dong: '대치동'}], 'mine');
t('진행 중: 법안 먼저', g.now.map(x => x.p.id), ['a', 'b']);
t('지난 정책 분리', g.past.map(x => x.p.id), ['c']);
t('전월세 모드는 rent 정책만', P.forCodes(D, [{sgg: '11680', dong: '대치동'}], 'jeonse').now.map(x => x.p.id), ['b']);
const h1 = P.html(D, {mode: 'mine', codes: [{sgg: '11680', dong: '대치동'}], price: 250000});
t('25억 → 20억 초과 조건에 듦', h1.includes('가격 조건에 들어요'), true);
t('법안 경고 문구', h1.includes('아직 국회를 통과하지 않은 안이에요'), true);
const h2 = P.html(D, {mode: 'mine', codes: [{sgg: '11680', dong: '대치동'}], price: 120000});
t('12억 → 조건 밖', h2.includes('가격 조건(20억 원 초과)에는 들지 않아요'), true);
t('HTML 이스케이프', P.html({policies: [{id: 'x', name: '<b>', date: '2026-01-01', status: 'active', stages: [{s: '발표'}], in: ['all'], plain: 'p', src: []}]}, {mode: 'mine', codes: [{sgg: '11110'}]}).includes('&lt;b&gt;'), true);
t('자료 없음 안내', P.html(null, {mode: 'mine', codes: []}).includes('불러오지 못했어요'), true);

/* 실제 공개 자료(있으면): 모든 정책에 쉬운 말·출처, 미확정 법안은 confirmed=false, 정치 평가 단어 없음 */
const f = process.argv[2] || '/tmp/site/jangdaejang-data/data/policy.json';
if (fs.existsSync(f)) {
  const R = JSON.parse(fs.readFileSync(f, 'utf8'));
  t('실자료: 쉬운 말 대상', R.policies.every(p => p.plain), true);
  t('실자료: 출처 링크 https', R.policies.every(p => (p.src || []).length && p.src.every(s => /^https:\/\//.test(s[1]))), true);
  t('실자료: 법안은 확정 아님', R.policies.filter(p => p.status === 'bill').every(p => p.confirmed === false), true);
  const txt = JSON.stringify(R);
  t('실자료: 평가 단어 없음', ['실패한', '잘못된', '졸속', '포퓰리즘', '성공적'].filter(w => txt.includes(w)), []);
  const html = P.html(R, {mode: 'mine', codes: [{sgg: '11680', dong: '압구정동'}], price: 300000});
  t('실자료: 강남구 압구정동 칸에 정책 있음', /pol-card/.test(html), true);
}
console.log(`${ok}/${ok + bad} 통과`);
process.exit(bad ? 1 : 0);
