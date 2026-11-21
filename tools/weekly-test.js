/* 주간 실거래 동향(/weekly/) 자동 확인 — 실행: node tools/weekly-test.js </dev/null
   assets/weekly-core.js: 주소 → 주·판, 변동률 글(+/−, 소수 둘째 자리), 표본 부족 칸, 같은 신고 기간 거래량, 인용 문구 형식, 내려받기 주소.
   weekly/YYYY-WW/ 복사본이 weekly/index.html 과 같은지, 앞으로 8주 넘게 남았는지, 화면에 서비스 이름 칸·금지 낱말·다른 회사 이름이 없는지. */
const fs = require('fs'), path = require('path');
const K = require('../assets/weekly-core.js');
const P = require('./weekly-pages.js');
const ROOT = path.join(__dirname, '..');
const rows = [];
function check(name, got, want) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want }); }

/* 주소 */
check('보관 주소 → 주', K.weekFrom('/jangdaejang-calc/weekly/2026-46/', ''), '2026-46');
check('최신 주소 → 없음', K.weekFrom('/jangdaejang-calc/weekly/', ''), null);
check('?w= 도 됨', K.weekFrom('/jangdaejang-calc/weekly/', '?w=2026-45'), '2026-45');
check('이상한 주 거절', K.weekFrom('/jangdaejang-calc/weekly/', '?w=2026-4x'), null);
check('판 번호', [K.verFrom('?v=2'), K.verFrom('?v=0'), K.verFrom('?v=a'), K.verFrom('')], [2, null, null, null]);
/* 글 */
check('변동률 글', [K.pct(0.256), K.pct(-0.1), K.pct(0), K.pct(null), K.pct(1.234, 1)], ['+0.26%', '−0.10%', '0.00%', '—', '+1.2%']);
check('날짜', [K.md('2026-11-09'), K.dot('2026-11-19')], ['11/9', '2026.11.19']);
const V = { w: '2026-46', from: '2026-11-09', to: '2026-11-15', ver: 2, status: 'prov', asof: '2026-11-27', final_on: '2026-12-20', method: { min: 30 },
  vol_basis: null, rows: [
    { c: '00', nm: '전국', lv: 'kr', n: 5000, np: 4000, chg: 0.12, lo: 0, hi: 0.3, up: 49, dn: 46, m: { n: 30000, np: 24000, chg: 0.1 } },
    { c: '11', nm: '서울', lv: 'sd', n: 300, np: 200, chg: 0.5, lo: 0.1, hi: 0.9, m: { np: 900, chg: 0.4 } },
    { c: '11710', nm: '송파구', lv: 'sgg', sd: '서울', n: 20, np: 12, m: { np: 45, chg: 0.8, lo: 0.1, hi: 1.5 } },
    { c: '11680', nm: '강남구', lv: 'sgg', sd: '서울', n: 40, np: 33, chg: -0.4, lo: -1, hi: 0.2, old: 1, m: { np: 100, chg: -0.2 } }] };
check('표본 부족 칸(변동률 대신)', K.chgCell(K.row(V, '11710'), 'w', 30), { t: '표본 부족', sub: '기준 30건', cls: 'na' });
check('최근 4주는 4주 값', K.chgCell(K.row(V, '11710'), 'm', 30), { t: '+0.80%', sub: '+0.10% ~ +1.50%', cls: 'up' });
check('자료 늦은 곳은 숫자 대신 안내', K.chgCell(K.row(V, '11680'), 'w', 30).t, '자료 확인 늦음');
check('같은 신고 기간 판이 없으면 거래량 비교 없음', K.volCell(K.row(V, '00'), V), { t: '—', why: '같은 신고 기간 비교 준비 중' });
check('같은 신고 기간 거래량', K.volCell({ vc: -12.34, vp: 5600 }, V), { t: '−12.3%', why: '지난주 5,600건(같은 신고 기간)' });
const C = K.cite(V, '집예보');
check('인용 첫 줄 형식', C.line, '자료: 집예보 주간 실거래 동향(국토교통부 실거래가 분석, 2026.11.27 기준)');
check('인용에 주·판·잠정', C.detail.startsWith('2026년 46번째 주(11/9~11/15 계약) 제2판 · 잠정'), true);
check('인용 고정 주소에 판 번호', C.url, 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/weekly/2026-46/?v=2');
check('내려받기 주소', K.urls(V, 1), { csv: '/jangdaejang-data/data/weekly/2026-46/v1.csv', json: '/jangdaejang-data/data/weekly/2026-46/v1.json',
  page: '/jangdaejang-calc/weekly/2026-46/', perma: '/jangdaejang-calc/weekly/2026-46/?v=1' });
check('큰 제목', K.headline(V), '11/9~11/15 전국 아파트, 같은 집 직전 거래보다 중간값 +0.12%');
check('큰 제목(전국 표본 부족이면 건수만)', K.headline({ ...V, rows: [{ c: '00', n: 12, np: 3 }] }), '11/9~11/15 전국 아파트 매매 12건');
check('그래프 눈금은 보이는 값만', K.scaleMax(V.rows.filter(r => r.lv !== 'kr'), 'w'), 1);
check('시·군·구 고르기', K.levelRows(V, 'sgg', '서울').map(r => r.c), ['11710', '11680']);
check('잠정 안내에 확정 날짜', K.finalNote(V).includes('12/20 이후 자료로 확정'), true);

/* 보관 주소 복사본 */
const main = fs.readFileSync(path.join(ROOT, 'weekly/index.html'), 'utf8');
const ws = P.weeks(P.FIRST, P.LAST);
const diff = ws.filter(w => { const f = path.join(ROOT, 'weekly', w, 'index.html'); return !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== main; });
check('보관 주소 복사본 = weekly/index.html (다르면 node tools/weekly-pages.js)', diff, []);
const today = new Date(), mon = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
const left = ws.filter(w => { const y = +w.slice(0, 4), n = +w.slice(5), j4 = new Date(Date.UTC(y, 0, 4)), d = (j4.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(y, 0, 4 - d + (n - 1) * 7)) > mon; }).length;
check('앞으로 남은 보관 주소 8주 넘음(모자라면 WEEKLY_LAST 늘려 다시 만들기)', left > 8, true);
check('화면 경로는 모두 절대 경로(복사본에서도 같게)', /(src|href)="\.\.?\//.test(main), false);
check('서비스 이름 칸·config.js', main.includes('data-site-name') && main.includes('/assets/config.js'), true);
check('공유 JS 판 번호', ['weekly-core.js?v=', 'weekly-view.js?v=', 'weekly.css?v='].every(s => main.includes(s)), true);
const txt = main + fs.readFileSync(path.join(ROOT, 'assets/weekly-view.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'assets/weekly-core.js'), 'utf8');
check('금지 낱말 없음(시험·검증·채점)', ['시험', '검증', '채점'].filter(w => txt.includes(w)), []);
check('다른 회사 이름 없음', ['리치고', '호갱', '직방', '아실', '밸류맵', '다방', '네이버', 'KB'].filter(w => txt.includes(w)), []);
check('통계 설명에 방법·신고 기한·표본 기준·확정', ['같은 단지·같은 전용면적', '30일 안에', '표본 부족', '확정', '한국부동산원'].every(w => main.includes(w)), true);
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
check('서비스 워커에 화면·공유 JS', ['/jangdaejang-calc/weekly/', 'weekly-core.js?v=1', 'weekly-view.js?v=1', 'weekly.css?v=1'].every(s => sw.includes(s)), true);

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log(r.ok ? 'PASS' : 'FAIL', r.name, r.ok ? '' : `→ ${JSON.stringify(r.got)} (기대 ${JSON.stringify(r.want)})`));
console.log(`${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
