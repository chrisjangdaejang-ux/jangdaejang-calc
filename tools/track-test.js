/* 성적표(/track/)·점수 읽는 법(/guide/method/) 계산 자동 검증 — 실행: node tools/track-test.js [bt 자료 폴더(선택, 예: /tmp/site/data)]
   assets/track-core.js 가 공개 자료(bt/index.json·bt/g/{구}.json·excluded.json)를 숫자를 지어내지 않고 그대로 읽는지,
   화면 문장에 '시험·통과·검증·채점' 단어가 없는지, 약한 지역(서울 등)을 숨기지 않는지 손으로 계산한 값과 맞춰 본다.
   자료 폴더를 주면 실제 bt/index.json 으로 헤드라인 숫자 = 자료 값인지도 확인한다. */
const fs = require('fs'), path = require('path');
const T = require('../assets/track-core.js');
const rows = [];
function check(name, got, want) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want }); }
const BAN = /시험|통과|검증|채점|백테스트/;

/* ---------- 가상 성적 자료 ---------- */
const dec = [[8.62, 44.5, -2.49, 100], [9.41, 42.4, -1.14, 100], [9.29, 42.0, -0.81, 100], [8.85, 43.0, -0.84, 100], [8.46, 43.0, -0.75, 100],
  [9.25, 42.0, -0.64, 100], [9.47, 41.8, -0.47, 100], [10.08, 40.6, 0.26, 100], [11.52, 38.7, 1.79, 100], [14.42, 35.2, 4.77, 300]];
const BT = { kind: 'repro', note: '재현: …', h: 24, data_from: '2010-01', phases: [['down', '시장 평균이 2년 동안 내린 때'], ['up', '시장 평균이 0~10% 오른 때'], ['hot', '시장 평균이 10% 넘게 오른 때']],
  scopes: {
    서울특별시: { from: '201710', to: '202410', months: 85, units: 7890, cases: 233238, dec, sum: { top_beat: 56.5, down_x: 0.94, down_top: 23.2, down_bot: 21.8, win_months: 50, months: 85 } },
    전국: { from: '201710', to: '202410', months: 85, units: 49142, cases: 2013842, dec, sum: { top_beat: 60.6, down_x: 1.26, down_top: 35.2, down_bot: 44.5, win_months: 71, months: 85 },
      by_year: { 2019: { top: 39.1, bot: 29.5, all: 30.4, top_ex: 8.1, win_months: 12, months: 12 }, 2018: { top: 16.9, bot: 12.9, all: 9.4, top_ex: 7.1, win_months: 12, months: 12 } },
      by_phase: { hot: { top: 34.5, bot: 27.3, all: 27.7, top_ex: 5.9, win_months: 27, months: 30 }, down: { top: -3, bot: -12, all: -7.9, top_ex: 5.2, win_months: 22, months: 22 } } },
    경기도: { from: '201710', to: '202410', months: 85, units: 1, cases: 1, dec, sum: { top_beat: 61.6, down_x: 1.11, down_top: 32.9, down_bot: 36.6, win_months: 53, months: 85 } } } };
const IX = { sido: [{ id: 's00', name: '서울특별시', short: '서울' }, { id: 's08', name: '경기도', short: '경기' }] };

check('범위: 전국 먼저, 나머지 공개 순서', T.scopes(BT, IX).map(s => s.short), ['전국', '서울', '경기']);
check('짧은 이름 없으면 원래 이름', T.shortOf('경기도', {}), '경기도');
const H = T.head(BT.scopes['전국'], { where: '전국' });
check('헤드라인: 상위·하위 10% 같은 구 평균 대비(자료 dec[9][2]·dec[0][2])', H.title, '점수 상위 10% 단지는 2년 뒤 같은 구 평균보다 4.8%p 더 올랐고, 하위 10%는 2.5%p 덜 올랐어요');
check('헤드라인 둘째 줄: 2년 평균 상승률', H.sub, '2년 평균 상승률로는 상위 10% +14.4%, 하위 10% +8.6%였어요.');
check('규모 줄(자료 값 그대로, 천 단위 쉼표)', H.size, '전국 49,142개 단지·평형 · 기준 월 85개 · 2,013,842건');
check('전국 기준 탭: 비교 기준 이름', T.head(BT.scopes['전국'], { base: '전국 평균' }).title.includes('전국 평균보다'), true);
const P = T.period(BT, BT.scopes['전국']);
check('기간: 시작월(data_from)·기준 월 범위·개수', P.text, '2010년 1월부터 쌓인 공공 통계로, 2017년 10월부터 2024년 10월까지 85개 달마다 그때까지 나온 자료만으로 점수를 매겨 보고, 2년 뒤 실제 시세와 맞춰 봤어요.');
check('기간: data_from 없으면 model_h 의 값', T.period({}, BT.scopes['전국'], { data_from: '2006-01' }).from, '2006년 1월');
check('기간: 둘 다 없으면 시작월 생략', T.period({}, BT.scopes['전국']).text.startsWith('2017년 10월부터'), true);
const C = T.cards(BT.scopes['전국']);
check('요약 카드 3개(자료 sum 값)', C.map(c => c.big), ['60.6%', '1.26배', '71/85']);
check('카드 3: N번 중 M번 문구', C[2].note, '과거에 그대로 써 봤더니 85번 중 71번 상위 10%가 더 올랐어요.');
const CS = T.cards(BT.scopes['서울특별시']);
check('서울: 배수 < 1 이면 상위가 더 자주 내렸다고 그대로', CS[1].note, '오히려 상위 10%(23.2%)가 하위 10%(21.8%)보다 더 자주 내렸어요.');
check('약한 지역: 서울(배수 0.94·50/85)', T.weak(BT.scopes['서울특별시']), true);
check('약한 지역 아님: 전국(1.26·71/85)', T.weak(BT.scopes['전국']), false);
check('약한 지역 아님: 경기(1.11·53/85=62%)', T.weak(BT.scopes['경기도']), false);
check('약한 지역: 더 오른 달 60% 미만', T.weak({ sum: { down_x: 1.3, win_months: 50, months: 85 } }), true);
check('지역 표: 서울 약함 표시·전국 제외', T.regionRows(BT, IX).map(r => [r.short, r.weak, r.top]), [['서울', true, 4.77], ['경기', false, 4.77]]);
/* 가중 평균: 전체 평균 점선 */
const tot = dec.reduce((s, d) => s + d[0] * d[3], 0) / dec.reduce((s, d) => s + d[3], 0);
check('전체 평균 = 사례 수 가중 평균', Math.round(T.wavg(dec, 0) * 1000), Math.round(tot * 1000));
const G = T.grades(dec);
check('등급 5개, 상위 20% 먼저', G.map(g => g.label), ['상위 20%', '상위 20~40%', '가운데 20%', '상위 20~40%'.replace('상위 20~40%', '하위 20~40%'), '하위 20%']);
check('상위 20% = 9·10분위 가중 평균(사례 100·300)', Math.round(G[0].ex * 1000), Math.round((1.79 * 100 + 4.77 * 300) / 400 * 1000));
check('상위 20% 사례 수 합', G[0].cases, 400);
check('연도별: 해 순서', T.yearRows(BT.scopes['전국']).map(r => [r.label, r.win, r.months]), [['2018년', 12, 12], ['2019년', 12, 12]]);
check('연도별 없으면 빈 목록(섹션 숨김)', T.yearRows(BT.scopes['서울특별시']), []);
check('국면별: 공개 이름 순서·있는 것만', T.phaseRows(BT.scopes['전국'], BT.phases).map(r => r.k), ['down', 'hot']);
/* 그래프 */
const svg = T.bars(dec.map(d => d[2]), { hi: [9], neg: true, avg: 0.3 });
check('막대 10개', (svg.match(/<rect /g) || []).length, 10);
check('강조 칸 1개', (svg.match(/class="b hi"/g) || []).length, 1);
check('음수 막대 색', (svg.match(/class="b ng"/g) || []).length, 7);
check('평균 점선', svg.includes('class="avg"'), true);
check('SVG 가로는 viewBox 로', /viewBox="0 0 340 196"/.test(svg) && !/width="340"/.test(svg), true);
check('빈 값 칸은 건너뜀', (T.bars([1, null, 2], {}).match(/<rect /g) || []).length, 2);

/* ---------- 타임머신 ---------- */
const GU = { tm: { '무악동|82|현대|59㎡대': [
  ['201710', 81, 7, 80, 2614, 54, 7, 56, 381, 248, 99, 366, 78, 80],
  ['202204', 30, 50, 80, 3000, 10, 5, 60, 20, 10, 55, -50, -40, 20],
  ['202407', 85, 3, 80, 3100, 20, 5, 60, 30, 10, 55, 100, 25, 70],
  ['202510', 90, 2, 80, 3500, null, null, null, null, null, null, null, null, null]],
  '교북동|1|경희궁자이(4단지)|84㎡대': [['202407', 10, 70, 80, 5000, null, null, null, null, null, null, -20, -30, 15]] } };
check('단지 목록 이름순', T.tmUnits(GU).map(u => u.apt), ['경희궁자이(4단지)', '현대']);
const tp = T.tmPick(GU, '무악동|82|현대|59㎡대');
check('2년 결과가 나온 가장 최근 기준 월', [tp.then.t0, tp.then.end], ['202407', '202607']);
check('점수·구 안 등수', [tp.then.score, tp.then.gr, tp.then.gn], [85, 3, 80]);
check('상승률 = ‰ ÷ 10, 같은 구 중간값 대비', [tp.then.chg, tp.then.vs], [10, 2.5]);
check('그 뒤 평당 시세 = p0 × (1 + 상승률)', tp.then.p1, 3410);
check('점수 높고 더 오름 → 맞음 문장', [tp.then.hit, tp.then.verdict], [true, '점수가 높았고, 실제로도 같은 구 중간보다 더 올랐어요.']);
check('가장 최근 점수·결과 나오는 달', [tp.now.t0, tp.now.score, tp.now.end], ['202510', 90, '202710']);
const tl = T.tmPick(GU, '교북동|1|경희궁자이(4단지)|84㎡대').then;
check('점수 낮고 덜 오름', [tl.hit, tl.verdict], [true, '점수가 낮았고, 실제로도 같은 구 중간보다 덜 올랐어요.']);
check('분기 기록: 결과 있는 것만, 최근 순', T.tmRows(GU, '무악동|82|현대|59㎡대').map(r => [r.t0, r.chg, r.vs]), [['202407', 10, 2.5], ['202204', -5, -4], ['201710', 36.6, 7.8]]);
check('없는 단지', T.tmPick(GU, 'x'), null);

/* ---------- 항목(excluded.json) ---------- */
const EX = { reasons: {}, used: { unit: { 2: [['mom', '최근 가격 흐름'], ['sch', '학군 수요']], 5: [['mom', '최근 가격 흐름']] }, region: [['sup', '향후 2년 입주 물량'], ['pop', '인구 증가']] },
  unit: { 2: [['sub', '역세권', 'unstable', '역세권은 넣어 봤는데 … 과거에 안 맞아서 뺐어요.'], ['vlo', '재건축 사업성', 'unstable', 'a'], ['land', '재건축 사업성', 'unstable', 'b'], ['zz', '어떤 자료', 'no_data', 'c']] },
  off: [['pol', '최근 정책 대상', 'no_gain', '최근 정책 대상은 넣어 봤는데 과거에 그대로 써 보니 더 잘 맞히지 못해 뺐어요.']],
  region: [['ob6', '외지인 매수 비중(6개월)', 'no_data', 'x'], ['nmr', '인구 순유입(1년)', 'no_gain', 'y']] };
const I = T.items(EX, 2);
check('쓰는 항목: 단지 → 지역 순(공개 목록 그대로)', I.use.map(x => [x.kind, x.name]), [['unit', '최근 가격 흐름'], ['unit', '학군 수요'], ['region', '향후 2년 입주 물량'], ['region', '인구 증가']]);
check('항목 설명: 자료·이유·출처 있음', ['d', 'w', 's'].every(k => I.use.every(x => x[k])), true);
check('뺀 항목: 같은 이름은 한 번, 자료 없음은 따로', I.out.map(x => x.name), ['역세권', '재건축 사업성', '최근 정책 대상', '인구 순유입(1년)']);
check('자료 없어 못 써 본 항목', I.nodata, ['어떤 자료', '외지인 매수 비중(6개월)']);
check('5년: 그 기간 목록', T.items(EX, 5).use.filter(x => x.kind === 'unit').map(x => x.key), ['mom']);
check('excluded.json 없으면 null(화면은 준비 중)', T.items(null), null);
check('항목에 가중치 없음', JSON.stringify(I).includes('"w":0'), false);

/* ---------- 말투: 화면 문장에 '시험·통과·검증·채점' 없음 ---------- */
const texts = [H.title, H.sub, P.text, ...C.map(c => c.label + c.note), ...CS.map(c => c.note), tp.then.verdict, tl.verdict,
  ...Object.values(T.ITEM).map(x => (x.d || '') + (x.w || '') + (x.s || ''))];
check('계산 문장에 금지 단어 없음', texts.filter(t => BAN.test(t)), []);
const root = path.join(__dirname, '..');
for (const f of ['track/index.html', 'guide/method/index.html']) {
  const body = fs.readFileSync(path.join(root, f), 'utf8').replace(/<script[\s\S]*?<\/script>/g, s => s.replace(/\/\*[\s\S]*?\*\//g, '')).replace(/<!--[\s\S]*?-->/g, '');
  const vis = body.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<[^>]+>/g, ' ');
  check(`${f}: 화면 글에 금지 단어 없음`, (vis.match(/[^\s]*(시험|통과|검증|채점|백테스트)[^\s]*/g) || []), []);
  check(`${f}: 숫자 하드코딩 없음(성적 수치)`, (vis.match(/\d+\.\d+%|\d+\/\d+|\d+번 중 \d+번/g) || []), []);
  check(`${f}: 가중치 공개 없음`, /가중치\s*[:=]|importance/.test(vis), false);
}
check('방법 페이지: 박사논문 근거 없음', /박사|학위논문|dissertation/i.test(fs.readFileSync(path.join(root, 'guide/method/index.html'), 'utf8')), false);
check('방법 페이지: 연구는 점수 계산에 쓰지 않는다고 명시', fs.readFileSync(path.join(root, 'guide/method/index.html'), 'utf8').includes('점수 계산에는 쓰지 않아요'), true);

/* ---------- 실제 자료(선택) ---------- */
const dir = process.argv[2];
if (dir && fs.existsSync(path.join(dir, 'bt', 'index.json'))) {
  const R = JSON.parse(fs.readFileSync(path.join(dir, 'bt', 'index.json'), 'utf8')), s = R.scopes['전국'];
  const h = T.head(s, { where: '전국' });
  check('실제: 헤드라인 상위 10% 값 = 자료 dec[9][2]', h.title.includes(Math.abs(Math.round(s.dec[9][2] * 10) / 10).toFixed(1) + '%p'), true);
  check('실제: 카드 = 자료 sum', T.cards(s).map(c => c.big), [`${s.sum.top_beat}%`, `${s.sum.down_x}배`, `${s.sum.win_months}/${s.sum.months}`]);
  check('실제: 서울 약함 여부 = 배수<1 또는 60% 미만', T.weak(R.scopes['서울특별시']), R.scopes['서울특별시'].sum.down_x < 1 || R.scopes['서울특별시'].sum.win_months * 100 / R.scopes['서울특별시'].sum.months < 60);
  const g = fs.readdirSync(path.join(dir, 'bt', 'g'))[0], GJ = JSON.parse(fs.readFileSync(path.join(dir, 'bt', 'g', g), 'utf8'));
  const k = Object.keys(GJ.tm).find(k => GJ.tm[k].some(r => r[11] != null));
  if (k) { const t = T.tmPick(GJ, k).then, raw = GJ.tm[k].filter(r => r[11] != null).pop(); check('실제: 타임머신 상승률 = ‰/10', t.chg, raw[11] / 10); }
}

const bad = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? 'OK  ' : 'FAIL') + ' ' + r.name + (r.ok ? '' : `\n     got=${JSON.stringify(r.got)}\n    want=${JSON.stringify(r.want)}`));
console.log(`${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
