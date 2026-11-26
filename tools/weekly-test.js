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
check('최근 4주는 4주 값', K.chgCell(K.row(V, '11710'), 'm', 30), { t: '+0.80%', sub: '+0.10% ~ +1.50%', med: '', cls: 'up' });
check('변동률 칸에 중간값(보조)', K.chgCell({ chg: -0.14, lo: -0.34, hi: 0.06, med: 0, np: 3813 }, 'w', 30).med, '중간값 0.00%');
check('방법 이름: 판 2 = 가운데 50% 평균, 판 1(예전 판) = 중간값', [K.methodName({ method: { m: 2 } }), K.methodName({ method: { m: 1 } }), K.methodName({})], ['가운데 50% 평균', '중간값', '중간값']);
const Cz = K.cmpSummary({ from: '2025-01', to: '2026-41', m: 2, all: { n: 1350, same: 771, pct: 57.11, nz: 1226, nz_pct: 62.72, ours0: 9, gap_med: 0.1 }, m1: { all: { n: 1350, same: 475, pct: 35.19, nz: 605, nz_pct: 67.6, ours0: 694, gap_med: 0.09 } } });
check('방법 변경 설명 숫자는 기록 그대로', [K.zeroText(Cz).m1, K.zeroText(Cz).m2], ['2025-01~2026-41 주를 같은 규칙으로 다시 계산해 보니 전국·시·도 1,350번 중 694번이 0.00%였어요.', '같은 기간에 가운데 50% 평균은 1,350번 중 9번만 0.00%였어요.']);
check('기록이 없으면 설명 숫자도 없음', K.zeroText(K.cmpSummary(null)), null);
check('자료 늦은 곳은 숫자 대신 안내', K.chgCell(K.row(V, '11680'), 'w', 30).t, '자료 확인 늦음');
check('같은 신고 기간 판이 없으면 거래량 비교 없음', K.volCell(K.row(V, '00'), V), { t: '—', why: '같은 신고 기간 비교 준비 중' });
check('같은 신고 기간 거래량', K.volCell({ vc: -12.34, vp: 5600 }, V), { t: '−12.3%', why: '지난주 5,600건(같은 신고 기간)' });
const C = K.cite(V, '집예보');
check('인용 첫 줄 형식', C.line, '자료: 집예보 주간 실거래 동향(국토교통부 실거래가 분석, 2026.11.27 기준)');
check('인용에 주·판·잠정', C.detail.startsWith('2026년 46번째 주(11/9~11/15 계약) 제2판 · 잠정'), true);
check('인용 고정 주소에 판 번호', C.url, 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/weekly/2026-46/?v=2');
check('내려받기 주소', K.urls(V, 1), { csv: '/jangdaejang-data/data/weekly/2026-46/v1.csv', json: '/jangdaejang-data/data/weekly/2026-46/v1.json',
  page: '/jangdaejang-calc/weekly/2026-46/', perma: '/jangdaejang-calc/weekly/2026-46/?v=1' });
check('큰 제목', K.headline(V), '11/9~11/15 전국 아파트, 같은 집 직전 거래보다 +0.12%');
check('큰 제목(전국 표본 부족이면 건수만)', K.headline({ ...V, rows: [{ c: '00', n: 12, np: 3 }] }), '11/9~11/15 전국 아파트 매매 12건');
check('그래프 눈금은 보이는 값만', K.scaleMax(V.rows.filter(r => r.lv !== 'kr'), 'w'), 1);
check('시·군·구 고르기', K.levelRows(V, 'sgg', '서울').map(r => r.c), ['11710', '11680']);
check('잠정 안내에 확정 날짜', K.finalNote(V).includes('12/20 이후 자료로 확정'), true);

/* 보관 주소 복사본 */
const main = fs.readFileSync(path.join(ROOT, 'weekly/index.html'), 'utf8');
const ws = P.weeks(P.FIRST, P.LAST);
const copy = P.copyOf(main);
const diff = ws.filter(w => { const f = path.join(ROOT, 'weekly', w, 'index.html'); return !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== copy; });
check('보관 주소 복사본 = weekly/index.html 의 한 칸 깊은 복사(다르면 node tools/weekly-pages.js)', diff, []);
const today = new Date(), mon = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
const left = ws.filter(w => { const y = +w.slice(0, 4), n = +w.slice(5), j4 = new Date(Date.UTC(y, 0, 4)), d = (j4.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(y, 0, 4 - d + (n - 1) * 7)) > mon; }).length;
check('앞으로 남은 보관 주소 8주 넘음(모자라면 WEEKLY_LAST 늘려 다시 만들기)', left > 8, true);
check('화면 경로는 상대 경로(예전 주소·새 도메인 모두) — 사이트 절대 경로 없음', [/(src|href)="\/jangdaejang-calc\//.test(main), /(src|href)="\.\.\/assets\//.test(main), /(src|href)="\.\.\/\.\.\/assets\//.test(copy)], [false, true, true]);
check('서비스 이름 칸·config.js', main.includes('data-site-name') && main.includes('/assets/config.js'), true);
check('공유 JS 판 번호', ['weekly-core.js?v=', 'weekly-view.js?v=', 'weekly.css?v='].every(s => main.includes(s)), true);
const txt = main + fs.readFileSync(path.join(ROOT, 'assets/weekly-view.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'assets/weekly-core.js'), 'utf8');
check('금지 낱말 없음(시험·검증·채점)', ['시험', '검증', '채점'].filter(w => txt.includes(w)), []);
check('다른 회사 이름 없음', ['리치고', '호갱', '직방', '아실', '밸류맵', '다방', '네이버', 'KB'].filter(w => txt.includes(w)), []);
check('통계 설명에 방법·신고 기한·표본 기준·확정', ['같은 단지·같은 전용면적', '30일 안에', '표본 부족', '확정', '한국부동산원'].every(w => main.includes(w)), true);
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const vOf = f => (main.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1];
check('서비스 워커에 화면·공유 JS(판 번호 같음)', ["'./weekly/'", "'./press/'", 'press-view.js?v=3'].concat(['weekly-core.js', 'weekly-view.js', 'weekly.css'].map(f => f + '?v=' + vOf(f))).every(x => sw.includes(x)), true);
/* 발표 시각·다른 지표·보도자료실 */
check('발표 시각 전이면 숨김', [K.released({ release: '2026-11-23T07:00+09:00' }, Date.parse('2026-11-23T06:59+09:00')), K.released({ release: '2026-11-23T07:00+09:00' }, Date.parse('2026-11-23T07:00+09:00')), K.released({})], [false, true, true]);
check('발표 시각 글', K.whenText('2026-11-23T07:00+09:00'), '11월 23일(월) 오전 7시');
check('고침 일정: 확정 월요일', K.scheduleText({ status: 'prov', final_on: '2026-12-20', ver: 1 }).includes('12월 21일(월) 오전 7시 판에서 확정'), true);
check('외지인 칸', [K.obCell({ ob: { ym: '202609', n: 3915, sd: 17.73 } }).t, K.obCell({ ob: { ym: '202609', n: 12 } }).t, K.obCell({}).t], ['17.7%', '표본 부족', '—']);
check('급매 칸', [K.usCell({ ub: 317, nu: 2, us: 0.63 }).t, K.usCell({ ub: 10, nu: 1 }).t], ['0.6%', '표본 부족']);
const Vs = Object.assign({}, V, { seg: { '00': { age: [{ nm: '신축(5년 이하)', w: { n: 10, np: 6 }, m: { n: 50, np: 40, chg: 0.3, lo: 0, hi: 0.6 } }] } } });
check('연식별 줄(표본 부족은 ok=false)', [K.segRows(Vs, '00', 'age', 'w')[0].ok, K.segRows(Vs, '00', 'age', 'm')[0].chg], [false, 0.3]);
const Vp = Object.assign({}, V, { top: { m: { up: [{ sd: '서울', nm: '중랑구', chg: 2.31, np: 95 }], down: [] } } });
check('기사 제목 후보는 자료 숫자만', K.pressTitles(Vp), ['지난주 서울 아파트, 같은 집 직전 거래보다 +0.50%', '지난주 전국 아파트 실거래 +0.12%…비교 거래 4,000건', '최근 4주 아파트값 가장 많이 오른 곳은 서울 중랑구(+2.31%, 비교 거래 30건 이상인 시·군·구 중)']);
check('기사 제목: 표본 기준 값이 없는 옛 판도 순위 범위를 밝힘', K.pressTitles(Object.assign({}, Vp, { method: undefined }))[2], '최근 4주 아파트값 가장 많이 오른 곳은 서울 중랑구(+2.31%, 표본 기준을 넘은 시·군·구 중)');
const pl = K.pressLines(Vp, '집예보');
check('기사 문장: 칼럼체·기간·잠정·표본 수', [pl[0], pl.every(x => /다\.$|다\)\.$|\)\.$|였다\(.*\)\.$/.test(x)), pl.some(x => x.includes('잠정치')), pl.some(x => x.includes('비교한 거래는 4,000건'))],
  ['집예보 주간 실거래 동향에 따르면 지난주(11월 9~15일 계약) 전국 아파트 매매는 5,000건 신고됐다(잠정).', true, true, true]);
check('기사 문장 조사(로/으로)', pl.find(x => x.includes('중랑구')), '비교 거래 30건 이상인 시·군·구 중 최근 4주 기준 가장 많이 오른 곳은 서울 중랑구로 +2.31%였다(비교 95건).');
check('방법 변경 안내: /weekly/·/press/ 모두, 숫자는 기록에서 채움', [main.includes('계산 방법을 바꿨어요'), main.includes('data-cz="m2"'), fs.readFileSync(path.join(ROOT, 'press/index.html'), 'utf8').includes('방법 변경(2026.11.21, 방법 판 2)')], [true, true, true]);
const press = fs.readFileSync(path.join(ROOT, 'press/index.html'), 'utf8') + fs.readFileSync(path.join(ROOT, 'assets/press-view.js'), 'utf8');
check('보도자료실: 광고 독립 문구·문의처 칸·발표 시각·CSV·지난 발표', ['광고는 통계에 영향을 주지 않아요', 'data-biz="contact"', '매주 월요일 오전 7시', '.csv', 'id="past"', '통계 설명 한 장'].every(w => press.includes(w)), true);
check('보도자료실: 금지 낱말·다른 회사 이름 없음', ['시험', '검증', '채점', '리치고', '호갱', '직방', '아실', '네이버', 'KB'].filter(w => press.includes(w)), []);
check('통계 설명: 공식 지수와 방향이 같았던 비율·발표 시각', ['공식 주간 지수와 방향이 같았던 비율', '매주 월요일 오전 7시'].every(w => main.includes(w)), true);

/* 2026-11-26: 자료 없는 주(이번 주·앞으로 올 주) 주소에서 '통계를 찾지 못했어요'만 나오던 문제 → 진행 중·발표 시각 안내 + 가장 최근 주 링크 */
{
  const KK = require('../assets/weekly-core.js'), at = s => Date.parse(s);
  check('주 날짜: 2026-48 = 11/23~11/29, 발표 11/30 오전 7시', KK.weekDates('2026-48'), { from: '2026-11-23', to: '2026-11-29', release: '2026-11-30T07:00:00+09:00' });
  check('진행 중인 주', KK.missingText('2026-48', '2026-47', at('2026-11-26T12:00:00+09:00')), '2026-48 주(11/23~11/29)는 아직 진행 중이에요. 이 주 통계는 11월 30일(월) 오전 7시에 발표해요.');
  check('아직 오지 않은 주는 진행 중이라고 하지 않음', /아직 오지 않은 주예요/.test(KK.missingText('2027-10', '2026-47', at('2026-11-26T12:00:00+09:00'))), true);
  check('끝났지만 발표 전', /오전 7시에 발표해요/.test(KK.missingText('2026-48', '2026-47', at('2026-11-30T03:00:00+09:00'))), true);
  const VW = fs.readFileSync(path.join(__dirname, '..', 'assets/weekly-view.js'), 'utf8');
  check('화면: 자료 없는 주에 안내 문구 + 가장 최근 주 링크', [/K\.missingText\(/.test(VW), /가장 최근 주\(/.test(VW)], [true, true]);
}

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log(r.ok ? 'PASS' : 'FAIL', r.name, r.ok ? '' : `→ ${JSON.stringify(r.got)} (기대 ${JSON.stringify(r.want)})`));
console.log(`${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
