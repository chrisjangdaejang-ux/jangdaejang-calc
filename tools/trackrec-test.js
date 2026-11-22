/* 예측 적중 기록(/track/) 자동 확인 — 실행: node tools/trackrec-test.js [trackrecord.json(선택)] </dev/null
   ① 계산(assets/trackrec-core.js) ② 화면 규칙: 서비스 이름은 config.js 에서만, 안내 문구, '오를' 금지, 다른 회사 이름 없음, 성적 숫자 하드코딩 없음, 노하우 단어 없음 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const C = require(path.join(ROOT, 'assets', 'trackrec-core.js'));
const rows = [];
const check = (name, got, want) => rows.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), got, want });

const bk = (hit, ex, avg) => ({ n: 100, cx: 50, avg, med: avg, ex, hit, down: 30 });
const T = { end: '202610', h: [6, 12, 24], asof: ['202310', '202604'], assets: {
  apt: { name: '아파트', score: '2년 점수', scopes: {
    전국: { 12: { from: '202310', to: '202510', months: 25, b: { top: bk(59, 1.5, 2.5), mid: bk(49, 0, 2), bot: bk(41.6, -1.3, 2.3) }, gap: 2.8, win: 25, top_win: 25, worst: [] } },
    서울: { 24: { from: '202310', to: '202410', months: 13, b: { top: bk(50, -0.1, 20), mid: bk(48, -0.3, 24), bot: bk(54, 1, 28) }, gap: -1.1, win: 5, top_win: 6, worst: [] },
           12: { from: '202310', to: '202510', months: 25, b: { top: bk(50.8, 0.2, 9.7), mid: bk(47, 0, 11), bot: bk(49, 0.1, 14.5) }, gap: 0.07, win: 14, top_win: 17, worst: [] } } } },
  offi: { name: '오피스텔', score: '1년 점수', scopes: { 전국: { 6: { from: '202506', to: '202604', months: 11, b: { top: bk(57, 2, 1.6), mid: bk(47, 0, -0.8), bot: bk(41, -1.7, -2.4) }, gap: 3.9, win: 11, top_win: 11, worst: [] } } } } },
  holding: { 1: { checks: 4, avg: -0.64, hit: 0, from: '202210', to: '202510', overlap: false }, 5: { checks: 4, avg: 2.67, hit: 4, from: '201810', to: '202110', overlap: true } } };

check('제목: 고른 범위 상위 20% 비율 그대로', C.head(T, 'apt', '전국', 12).title, '점수 상위 20% 아파트, 1년 뒤 같은 구 평균보다 더 오른 비율 59.0%');
check('제목: 없는 범위는 아직 없음', /아직 없어요/.test(C.head(T, 'offi', '전국', 24).title), true);
check('막대: 세 묶음 순서·값', C.bars(C.pick(T, 'apt', '전국', 12)).map(b => [b.k, b.v]), [['top', 59], ['mid', 49], ['bot', 41.6]]);
check('판정: 반대', C.judge(C.pick(T, 'apt', '서울', 24)).includes('rev'), true);
check('판정: 약함(차이 < 1%p)', C.judge(C.pick(T, 'apt', '서울', 12)).includes('weak'), true);
check('판정: 전국 1년은 약하지 않음', C.judge(C.pick(T, 'apt', '전국', 12)).filter(x => x === 'rev' || x === 'weak'), []);
check('판정: 가격 자체는 하위가 더 큼 → 따로 알림', C.judge(C.pick(T, 'apt', '서울', 12)).includes('price'), true);
check('판정: 11개월 → 짧음', C.judge(C.pick(T, 'offi', '전국', 6)).includes('short'), true);
const W = C.weak(T);
check('약한 곳: 반대가 맨 앞', W[0].lv, 'rev');
check('약한 곳: 오피스텔 2년 없음 알림', W.some(w => w.lv === 'none' && /오피스텔 · 전국 · 2년/.test(w.t)), true);
const H = C.hold(T);
check('보유 기간: 1년 잘 안 맞음', H.find(r => r.h === 1).ok, false);
check('보유 기간: 5년 겹침 표시', H.find(r => r.h === 5).overlap, true);
const allText = W.map(w => w.t).concat(H.map(r => r.line), [C.head(T, 'apt', '서울', 24).title, C.head(T, 'apt', '서울', 24).sub]).join(' ');
check('계산 문장: \'오를\' 없음', /오를/.test(allText), false);
check('계산 문장: 금지 단어 없음', allText.match(/시험|통과|검증|채점|백테스트/g), null);

/* 화면 파일 */
const page = fs.readFileSync(path.join(ROOT, 'track', 'index.html'), 'utf8');
const site = (fs.readFileSync(path.join(ROOT, 'assets', 'config.js'), 'utf8').match(/SITE_NAME:\s*'([^']*)'/) || [])[1];
const vis = page.replace(/<script[\s\S]*?<\/script>/g, s => s.replace(/\/\*[\s\S]*?\*\//g, '')).replace(/<!--[\s\S]*?-->/g, '');
check('서비스 이름을 파일에 쓰지 않음(config.js SITE_NAME)', !!site && page.includes(site), false);
check('config.js 불러옴 + data-site-name 칸', /assets\/config\.js/.test(page) && /data-site-name/.test(page), true);
check('안내 문구 있음', page.includes('과거 결과이며 미래를 보장하지 않아요'), true);
check('\'오를\' 없음', /오를/.test(page), false);
check('다른 회사 이름 없음', /리치고|호갱|직방|네이버|아실|밸류맵|다방|부동산114|KB부동산/.test(page), false);
check('화면 글 금지 단어 없음', (vis.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<[^>]+>/g, ' ').match(/[^\s]*(시험|통과|검증|채점|백테스트)[^\s]*/g) || []), []);
check('성적 숫자 하드코딩 없음', (vis.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<[^>]+>/g, ' ').match(/\d+\.\d+%|\d+번 중 \d+번/g) || []), []);
check('노하우 단어 없음(가중치·기준값·지표 이름)', /가중치\s*[:=]|(^|[^-])weights?\s*[:=]|threshold|importance/i.test(page), false);
check('공개 파일은 trackrecord.json 하나', (page.match(/data\/[a-z_/]+\.json/g) || []), ['data/trackrecord.json']);
check('자세한 기록 링크', page.includes('href="detail/"'), true);

/* 실제 자료(선택): 묶음 숫자만 있고 단지 키·가중치 없음 */
const src = process.argv[2];
if (src && fs.existsSync(src)) {
  const R = JSON.parse(fs.readFileSync(src, 'utf8')), s = JSON.stringify(R);
  check('실제: 아파트 전국 1년 있음', !!C.pick(R, 'apt', '전국', 12), true);
  check('실제: 단지 이름·지번 같은 키 없음', /"(umd|jibun|key|keys|units|w|wf|feats|stats|score_by_unit)"\s*:/.test(s), false);
  check('실제: 제목 숫자 = 자료', C.head(R, 'apt', '전국', 12).title.endsWith(C.f1(R.assets.apt.scopes['전국']['12'].b.top.hit) + '%'), true);
}

const bad = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? 'OK  ' : 'FAIL') + ' ' + r.name + (r.ok ? '' : `\n     got=${JSON.stringify(r.got)}\n    want=${JSON.stringify(r.want)}`));
console.log(`${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
