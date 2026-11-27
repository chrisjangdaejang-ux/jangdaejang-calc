/* 날짜별 규제지역 표(assets/reg-zones.js) 자동 확인 — 실행: node tools/reg-zones-test.js </dev/null
   ① 표 모양·출처(모든 줄에 출처 키, 공식 문서 주소)
   ② 지금(2026.11.27 확인) 지정 목록: 조정·투기과열 = 서울 25개 구 + 경기 15곳, 분양가상한제 = 강남·서초·송파·용산, 토지거래허가(아파트)
   ③ 같은 구라도 거래 날짜에 따라 판정이 다름(2025년 거래 vs 2026년 거래) — 세금(조정대상지역)·대출(규제지역)·토지거래허가
   ④ 이 표 하나만 씀: 세금 판정표·대출 규칙·지역 고르기·프리미엄 리포트가 이 표를 읽고, 다른 파일에 규제지역 코드 목록을 따로 두지 않음
   ⑤ 화면: 표를 쓰는 화면은 이 파일을 먼저 불러오고, sw.js 미리 저장 목록에 있음, 기준일 문구 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const R = require('../assets/reg-zones.js');
const ADJ = require('../tax/adjusted-areas.js');
const LR = require('../assets/loan-rules.js');
const T = require('../tax/tax-engine.js');
let pass = 0; const fail = [];
const check = (name, ok, info) => { if (ok) pass++; else fail.push(name + (info !== undefined ? ' → ' + JSON.stringify(info) : '')); };

/* ① 표 모양·출처 */
const isD = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
check('기준일(checked)이 날짜', isD(R.CHECKED));
check('모든 줄: 코드 5자리·종류·시작일·끝일 순서·범위', R.ROWS.every(r => /^\d{5}$/.test(r.c) && R.TYPES[r.t] && isD(r.f) && (r.e == null || (isD(r.e) && r.e >= r.f)) && (!r.until || isD(r.until)) && ['all', 'apt', 'dong', 'part'].includes(r.k)),
  R.ROWS.filter(r => !(/^\d{5}$/.test(r.c) && R.TYPES[r.t] && isD(r.f))).slice(0, 3));
check('모든 줄: 출처 키가 출처 표에 있음', R.ROWS.every(r => ['s', 'se', 's2'].every(k => !r[k] || R.D.src[r[k]])));
check('모든 줄의 시·군·구 이름이 있음', R.ROWS.every(r => R.NAMES[r.c]));
check('출처: 주소가 있으면 https', Object.values(R.D.src).every(s => !s.u || /^https:\/\//.test(s.u)));
check('출처: 2023·2025·2026 국토교통부공고 원문(국가법령정보센터) 주소', ['g2023', 'g2025', 'g2026'].every(k => /law\.go\.kr/.test(R.D.src[k].u)));
check('같은 지역·종류·범위의 기간이 겹치지 않음', (() => { const by = {}; for (const r of R.ROWS) (by[r.c + r.t + r.sub] = by[r.c + r.t + r.sub] || []).push(r);
  return Object.values(by).every(a => a.sort((x, y) => x.f < y.f ? -1 : 1).every((r, i) => i === 0 || (a[i - 1].e && a[i - 1].e < r.f))); })());

/* ② 지금 지정 목록 (2026-11-27 확인: 국토교통부공고 제2025-1223호·제2026-882호) */
const D0 = '2026-11-27';
const SEOUL = R.listAt('ovh', D0).filter(c => c.slice(0, 2) === '11');
const GG15 = ['41111', '41115', '41117', '41131', '41133', '41135', '41173', '41210', '41290', '41310', '41430', '41450', '41463', '41465', '41597'];
check('투기과열지구: 서울 25개 구', SEOUL.length === 25, SEOUL.length);
check('투기과열지구: 경기 15곳(10·15 12곳 + 동탄구·기흥구·구리시)', JSON.stringify(R.listAt('ovh', D0).filter(c => c.slice(0, 2) === '41')) === JSON.stringify(GG15), R.listAt('ovh', D0));
check('조정대상지역 = 투기과열지구와 같은 40곳', JSON.stringify(R.listAt('adj', D0)) === JSON.stringify(R.listAt('ovh', D0)));
check('규제지역 목록(regList) 40곳', R.regList(D0).length === 40);
check('분양가상한제(민간택지): 강남·서초·송파·용산만', JSON.stringify(R.listAt('cap', D0)) === JSON.stringify(['11170', '11650', '11680', '11710']));
check('토지거래허가(아파트): 서울 25개 구 + 경기 15곳', R.listAt('thp', D0, true).length === 40, R.listAt('thp', D0, true).length);
check('토지거래허가 기간: 서울·경기 12곳 2026.12.31까지, 동탄구·기흥구·구리시 2027.12.31까지',
  R.thpRows('11440', D0).apt.until === '2026-12-31' && R.thpRows('41465', D0).apt.until === '2026-12-31' && ['41597', '41463', '41310'].every(c => R.thpRows(c, D0).apt.until === '2027-12-31'));
check('토지거래허가: 압구정·여의도·목동·성수 동 단위 2027.4.26까지', ['11680:압구정동', '11560:여의도동', '11470:목동', '11200:성수동1가'].every(x => { const [c, d] = x.split(':'); const r = R.thpRows(c, D0, d).dong; return r && r.until === '2027-04-26'; }));
check('인천·부산은 지금 규제지역 아님', R.regulated('28185', D0) === false && R.regulated('26350', D0) === false);
check('기간 끝날(연장 확인 필요) 안내: 2026.12.31 토지거래허가', (R.nextUntil(D0) || {}).d === '2026-12-31');

/* ③ 같은 구, 거래 날짜에 따라 다름 */
const S = (c, d) => R.status(c, d, { kind: 'apt' });
// 화성 동탄구: 2025년 거래는 규제 없음, 2026.7.1부터 투기과열·조정, 2026.7.5부터 토지거래허가
check('동탄구 2025.11.1 거래: 조정·투기과열·토허 모두 아님', (s => s.adj === false && s.ovh === false && s.thp === false && s.reg === false)(S('41597', '2025-11-01')));
check('동탄구 2026.7.2 거래: 조정·투기과열 맞음, 토허는 아직(7.5부터)', (s => s.adj === true && s.ovh === true && s.thp === false)(S('41597', '2026-07-02')));
check('동탄구 2026.8.1 거래: 토허(아파트) 맞음', S('41597', '2026-08-01').thp === true);
check('동탄구 빌라 2026.8.1: 토허 아님(아파트만 지정)', R.at('41597', 'thp', '2026-08-01', { kind: 'other' }) === false);
check('동탄구 2028.1.1: 토허 기간 끝(연장 발표 전)', R.at('41597', 'thp', '2028-01-01', { kind: 'apt' }) === false);
// 서울 마포구: 2024년 거래는 규제 없음(2023.1.5 해제), 2025.10.16부터 다시 지정
check('마포구 2024.5.1 거래: 조정·투기과열 아님', (s => s.adj === false && s.ovh === false)(S('11440', '2024-05-01')));
check('마포구 2025.10.15 거래(지정 전날): 아님 · 2025.10.16: 맞음', S('11440', '2025-10-15').reg === false && S('11440', '2025-10-16').reg === true);
check('마포구 2025.10.17 거래: 토허는 2025.10.20부터', S('11440', '2025-10-17').thp === false && S('11440', '2025-10-20').thp === true);
check('강남구: 2017.8.3부터 해제된 적 없음(2024년에도 규제지역)', S('11680', '2024-05-01').reg === true && S('11680', '2019-01-01').reg === true);
check('2023.1.4까지 표에 없는 지역(인천)은 이용자 확인', R.at('28185', 'adj', '2021-01-01') === 'ask' && R.at('28185', 'adj', '2023-01-05') === false);
// 세금(조정대상지역 판정 — tax/adjusted-areas.js 가 이 표를 읽음)
check('세금: 용인 기흥구 2025.12.1 취득 = 조정 아님, 2026.7.1 취득 = 조정', ADJ.isAdjusted('경기', '용인시 기흥구', '2025-12-01') === false && ADJ.isAdjusted('경기', '용인시 기흥구', '2026-07-01') === true);
check('세금: 구리시 2026.6.30 = 아님(지정 전날)', ADJ.isAdjusted('경기', '구리시', '2026-06-30') === false);
check('세금: 영통구 2019년(광교지구 일부만) = 이용자 확인', ADJ.isAdjusted('경기', '수원시 영통구', '2019-05-01') === 'ask');
// 양도세: 같은 동탄구 집, 2주택자가 2025년에 팔면 중과 없음, 2026년 8월에 팔면 중과(조정대상지역 양도)
{
  const base = { salePrice: 900000000, acqPrice: 600000000, acqDate: '2018-03-01', houses: 2, residMonths: 0 };
  const cgt = d => T.calcCGT(Object.assign({}, base, { saleDate: d, saleAdj: ADJ.isAdjusted('경기', '화성시 동탄구', d) === true, acqAdj: ADJ.isAdjusted('경기', '화성시 동탄구', base.acqDate) === true }));
  const a = cgt('2025-11-03'), b = cgt('2026-08-03');
  check('양도세: 동탄구 2주택 2025.11 양도 = 중과 없음(조정 아님), 2026.8 양도 = +20%p 중과(2026.7.1 조정 지정 뒤)', a.heavy === 0 && b.heavy === 0.2, [a.heavy, b.heavy]);
}
// 대출(규제지역 LTV)
check('대출: 기흥구 2026.6.30 = 비규제 수도권, 2026.7.1 = 규제지역', LR.groupOf('41463', '2026-06-30') === 'capfree' && LR.groupOf('41463', '2026-07-01') === 'reg');
check('대출: 오늘 규제지역 목록(REGION.reg) = 표와 같음', JSON.stringify(Object.keys(LR.REGION.reg.v.gg).sort()) === JSON.stringify(GG15) && LR.REGION.reg.v.seoulAll === true);
check('대출: 기준일이 표의 기준일', LR.REG_CHECKED === R.CHECKED);

/* ④ 이 표 하나만 — 다른 파일에 규제지역 코드 목록·날짜를 따로 두지 않음 */
const LIST = /\[\s*'41(290|597|463|310|465)'\s*,\s*'41\d{3}'/;
const scan = ['assets', 'tax', 'switch', 'chungyak'].flatMap(d => fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.js')).map(f => d + '/' + f)).filter(f => f !== 'assets/reg-zones.js');
check('assets·tax·switch·chungyak 에 경기 규제지역 코드 목록을 따로 두지 않음', scan.filter(f => LIST.test(read(f))), []);
check('세금 판정표(tax/adjusted-areas.js)에 지정 날짜를 두지 않음', !/'20(17|18|20|22|23|25|26)-\d\d-\d\d'/.test(read('tax/adjusted-areas.js')));
check('대출 규칙(loan-rules.js)의 규제지역은 이 표에서', /REG\.regList|regGG\(/.test(read('assets/loan-rules.js')) && !/'41597': '화성시 동탄구'/.test(read('assets/loan-rules.js')));

/* ⑤ 화면·캐시 */
const htmls = []; (function walk(d) { for (const f of fs.readdirSync(path.join(ROOT, d))) { const p = d ? d + '/' + f : f; if (/^(node_modules|data|apt|villa\/z|tools|\.git|sitemaps|cy)$/.test(p)) continue; const st = fs.statSync(path.join(ROOT, p)); if (st.isDirectory()) walk(p); else if (f === 'index.html') htmls.push(p); } })('');
const NEED = /(assets\/region-pick|assets\/loan-rules|adjusted-areas|assets\/premium-report)\.js/;
const badOrder = htmls.filter(h => { const s = read(h), i = s.search(NEED); if (i < 0) return false; const j = s.indexOf('assets/reg-zones.js?v='); return j < 0 || j > i; });
check('표를 쓰는 화면은 reg-zones.js 를 먼저 불러옴', badOrder, []);
const V = (read('assets/guide.js').match(/assets\/reg-zones\.js\?v=(\d+)/) || [])[1];
check('sw.js 미리 저장 목록에 reg-zones.js(최신 번호)', read('sw.js').includes("'./assets/reg-zones.js?v=" + V + "'"));
check('화면 기준일 문구', /규제지역 기준일 \d{4}\.\d{1,2}\.\d{1,2}/.test(R.basis()) && /regBasis\(\)/.test(read('loan/index.html')) && /JDJ_REG\.basis\(\)/.test(read('assets/tax-box.js')));

/* 기간이 끝난 지정이 있으면 경고(연장·해제 발표 확인 필요) — 실패로 세지는 않음 */
const nu = R.nextUntil(R.ko ? R.CHECKED : D0), today = R.today();
if (nu && nu.d < today) console.log('주의: ' + R.ko(nu.d) + ' 끝난 ' + nu.t + ' 기간 — 연장·해제 발표를 확인해 표를 고쳐 주세요.');

const bad = fail.length;
console.log(fail.length ? fail.map(x => '  실패: ' + x).join('\n') : '');
console.log('reg-zones-test: ' + pass + ' 통과, ' + bad + ' 실패');
process.exit(bad ? 1 : 0);
