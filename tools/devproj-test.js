/* 주변 개발사업 칸(assets/devproj-view.js) 검증: 단지 찾기·요약 한 줄·펼침 문단·출처 링크·설계값 비공개. node tools/devproj-test.js [devproj.json] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = {window: {}, document: {getElementById: () => true, createElement: () => ({}), head: {appendChild(){}}}, fetch: () => Promise.reject(new Error('x'))};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/devproj-view.js'), 'utf8'), ctx);
const V = ctx.window.JDJDev;
let ok = 0, bad = 0;
const t = (name, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); if (g === w) ok++; else { bad++; console.log('실패', name, '→', g, '기대', w); } };

const D = {asof: '2026-11-20', to: '202610', inModel: false, projects: [
  {id: 'm', name: '잠실 스포츠·MICE 복합공간(국제교류복합지구)', short: '잠실 국제교류복합지구(잠실종합운동장 MICE)', scale: '부지 290,939㎡',
   stages: [{s: '발표', d: '2014-04-01', note: '종합발전계획 발표', src: 0}, {s: '계획 결정', d: '2026-07-28', src: 1}],
   plan: [{s: '준공', d: '2032', note: '완공 목표', src: 1}],
   src: [['서울시 보도자료', 'https://news.seoul.go.kr/citybuild/archives/31913'], ['서울시 보도자료 2', 'https://www.seoul.go.kr/news/news_report.do?nttNo=462838']],
   cases: {'착공|0~1km': {v: 'b', t: '과거 비슷한 대형 업무·MICE 복합개발 사업 주변(사업지에서 0~1km) 단지는 착공 후 1년 동안 같은 구의 먼 단지보다 평균 0.4%p 더 올랐어요(사례 2건 모두 더 오름).'}}},
  {id: 'g', name: 'GBC', short: '현대차 GBC', delay: {note: '2023년 개통 목표는 지났어요.', src: 0}, stages: [{s: '발표', d: '2015-09-24', src: 0}], plan: [], src: [['서울시', 'https://mediahub.seoul.go.kr/a']], cases: {}},
  {id: 'x', name: '<b>나쁜</b>', short: '<i>', stages: [], plan: [], src: [], cases: {}}],
  units: {'11710|잠실동|19': [['m', 590, '0~1km', '201404', 267.3, 251.5], ['g', 1550, '1~2km', '201509', 240.8, 219.0]],
          '11710|잠실동|1': [['x', 2400, '2~3km']]}};
const u = {code: '11710', dong: '잠실동', jibun: '19'}, o = {apt: '잠실엘스', sggName: () => '송파구'};
t('가까운 순', V.forUnit(D, u).map(x => x.p.id), ['m', 'g']);
t('없는 단지', V.forUnit(D, {code: '11710', dong: '잠실동', jibun: '999'}), []);
t('자료 없음', V.summaryLine(null, u, o), null);
const sl = V.summaryLine(D, u, o);
t('요약: 거리', sl.includes('잠실 국제교류복합지구(잠실종합운동장 MICE)까지 약 0.6km'), true);
t('요약: 비교 기준(같은 구 중간값)·차이', sl.includes('송파구 단지 중간값보다 15.8%p 더 올랐어요'), true);
t('요약: 다음 단계', sl.includes('2032년 준공 목표'), true);
t('요약: 그 밖에', sl.includes('(그 밖에 1곳)'), true);
const h = V.detailHtml(D, u, o);
t('문단: 주어·조사', h.includes('잠실엘스는 잠실 국제교류복합지구(잠실종합운동장 MICE)에서 약 0.6km예요.'), true);
t('문단: 발표 달·이 단지·구 중간값', h.includes('2014.4 계획 발표 뒤 지금까지 이 단지는 267.3% 올라, 송파구 단지 중간값(+251.5%)보다 15.8%p 더 올랐어요'), true);
t('문단: 방어적 표현 없이 사실', h.includes('개발 기대가 이미 가격에 일부 들어간 거예요') && !/다만|수 있어요|어려워요|참고 정보/.test(h), true);
t('문단: 다음 단계 출처 기관', h.includes('2032년 준공 목표(서울시 발표)'), true);
t('문단: 과거 사례 문장(엔진 문장 그대로)', h.includes('사례 2건 모두 더 오름'), true);
t('문단: 일정 없으면 확인 불가', h.includes('다음 단계 일정: 공식 자료로 확인 불가예요.'), true);
t('문단: 사례 없으면 확인 불가', h.includes('통계 사례는 아직 확인 불가예요'), true);
t('문단: 원문 링크', h.includes('href="https://www.seoul.go.kr/news/news_report.do?nttNo=462838"'), true);
t('문단: 지연 안내(객체)', h.includes('지연: 2023년 개통 목표는 지났어요.(서울시)') && !h.includes('[object'), true);
t('문단: 점수 미반영 안내', h.includes('미래가치 점수에 넣지 않았어요'), true);
const hx = V.detailHtml(D, {code: '11710', dong: '잠실동', jibun: '1'}, {apt: 'A<b>', sggName: () => '송파구'});
t('HTML 이스케이프', hx.includes('<b>나쁜') || hx.includes('<i>'), false);
t('비교 자료 없으면 확인 불가', hx.includes('확인 불가'), true);
t('조사: 받침 없음', V.eun('잠실엘스'), '는');
t('조사: 받침 있음', V.eun('헬리오시티'), '는');
t('조사: 받침 있음2', V.eun('리센츠 단지'), '는');
t('조사: 받침 있음3', V.eun('트리지움'), '은');
t('덜 오름 문장', V.detailHtml({projects: D.projects, units: {'a|b|c': [['g', 300, '0~1km', '201509', 100, 110]]}}, {code: 'a', dong: 'b', jibun: 'c'}, o).includes('10.0%p 덜 올랐어요. 발표 효과가 아직 가격에 나타나지 않은 거예요.'), true);
t('사례: 다음 단계 우선, 없으면 지난 단계', V.caseOf({plan: [{s: '착공'}], stages: [{s: '발표'}], cases: {'발표|0~1km': {t: 'A'}, '착공|0~1km': {t: 'B'}}}, '0~1km').t, 'B');
t('사례: 지난 단계', V.caseOf({plan: [], stages: [{s: '발표'}], cases: {'발표|0~1km': {t: 'A'}}}, '0~1km').t, 'A');

// 실제 공개본이 있으면: 설계값(반경·가중치·감시 낱말·좌표) 비공개, 잠실엘스 문장
const pub = process.argv[2];
if (pub && fs.existsSync(pub)) {
  const J = JSON.parse(fs.readFileSync(pub, 'utf8')), s = JSON.stringify(J);
  t('공개본: 비공개 칸 없음', J.projects.some(p => p.watch || p.cluster || p.xy || p.grp || p.dongs), false);
  t('공개본: 설계값 이름 없음', /SHOW|FEAT_R|FEAT_W|"FAR"|가중치|임계/.test(s), false);
  const el = {code: '11710', dong: '잠실동', jibun: '19'};
  const s1 = V.summaryLine(J, el, o);
  t('공개본: 잠실엘스 주변에 잠실 MICE', !!s1 && s1.includes('잠실 국제교류복합지구'), true);
  console.log('\n[잠실엘스 요약]', s1, '\n[잠실엘스 자세히]', V.detailHtml(J, el, o).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
}
console.log(`\n${ok}/${ok + bad} 통과`);
t('사례 문장 예전 꼬리 → 사실', V.factCase('평균 1.0%p 더 올랐어요(사례 2건 모두 더 오름). 다만 사례가 적거나 일부는 통계로 뚜렷하지 않아 일반적인 영향으로 단정하기는 어려워요.'), '평균 1.0%p 더 올랐어요(사례 2건 모두 더 오름). 사례가 2건뿐이라 점수에는 넣지 않았어요.');
process.exit(bad ? 1 : 0);
