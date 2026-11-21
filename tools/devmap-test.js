/* 지도 '개발·교통 예정'(assets/devmap-view.js) 확인 — 실행: node tools/devmap-test.js [devmap.json(선택)]
   ① 공식 출처·날짜 없는 예정 연도는 화면에 안 나옴 ② 공식 경계 자료 없는 면은 안 그림 ③ 공개 좌표는 소수 셋째 자리
   ④ 개통 전 역 위치는 공개 파일에 없음(선은 이미 운행 중인 역 점만 — 엔진 tests/test_devmap.py 가 비공개 표와 직접 대조)
   + 카드에 늘 '예정 시기는 사업 진행에 따라 바뀔 수 있어요.', 경계 없는 사업은 '공식 고시 도면에서 확인' 안내·공식 링크 */
const fs = require('fs');
const F = require('../assets/devmap-view.js');
const rows = [];
function check(name, got, want) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want }); }

const OFF = { org: '서울시', title: "서울시 '강북전성시대 2.0'(2026.2.19)", date: '2026-02-19', url: 'https://mediahub.seoul.go.kr/archives/2017184', official: true };
const due = { s: '개통', y: 2027, say: '2027년 개통 목표', src: OFF };
const line = { id: 'rail_x', type: 'line', name: '동북선 경전철', stage: '공사 중', stage_at: '2020-02', due: [due], path: [[127.037, 37.562], [127.035, 37.578]], stops: ['왕십리역', '제기동역'],
  stage_src: { org: '언론 보도', title: '기사', url: 'https://news.x.com/a', official: false } };

/* ① 연도 */
check('공식 출처·날짜 있는 연도는 보임', F.dues(line).map(d => d.say), ['2027년 개통 목표']);
check('출처가 공식이 아니면 연도 안 보임', F.dues({ due: [Object.assign({}, due, { src: Object.assign({}, OFF, { official: false }) })] }), []);
check('출처 날짜가 없으면 연도 안 보임', F.dues({ due: [Object.assign({}, due, { src: Object.assign({}, OFF, { date: null }) })] }), []);
check('출처 주소가 https 가 아니면 연도 안 보임', F.dues({ due: [Object.assign({}, due, { src: Object.assign({}, OFF, { url: 'javascript:alert(1)' }) })] }), []);
check('지도 글자: 이름 · 공식 연도', F.label(line), { name: '동북선 경전철', tail: '2027년 개통 목표', year: true });
check('지도 글자: 연도 없으면 단계만', F.label(Object.assign({}, line, { due: [] })), { name: '동북선 경전철', tail: '공사 중', year: false });
check('구역 글자: 괄호 빼고 짧게', F.label({ type: 'area', name: '잠실 스포츠·MICE', short: '잠실 국제교류복합지구(잠실종합운동장 MICE)', stage: '계획 확정' }).name, '잠실 국제교류복합지구');

/* 카드 */
const c1 = F.cardHtml(line);
check('카드: 연도·출처 이름·날짜·원문 링크', [c1.includes('2027년 개통 목표'), c1.includes('(2026.2.19)'), c1.includes('href="https://mediahub.seoul.go.kr/archives/2017184"')], [true, true, true]);
check('카드: 고정 문장', c1.includes(F.CHANGE) && F.CHANGE === '예정 시기는 사업 진행에 따라 바뀔 수 있어요.', true);
check('카드: 단계 근거가 언론이면 그렇다고 적음(링크 안 붙임)', [c1.includes('언론 보도로 확인'), c1.includes('news.x.com')], [true, false]);
check('카드: 쉬운 풀이(개통)', c1.includes('개통은 열차가 실제로 다니기 시작하는 것'), true);
const c2 = F.cardHtml({ id: 'a', type: 'area', kind: '산업단지', name: '용인 반도체 국가산단', stage: '계획 확정', due: [], at: [127.2, 37.2], at_basis: '공공 좌표', notice: { title: '정책브리핑', url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148937933' } });
check('카드: 연도 없으면 연도 안 만듦(안내 문장)', [/20\d\d년/.test(c2.replace(/\d{4}\.\d/g, '')), c2.includes('예정 연도가 없어')], [false, true]);
check('카드: 경계 없는 사업 → 공식 고시 도면 안내 + 공식 링크', [c2.includes(F.NOBOUND), c2.includes('href="https://www.korea.kr/news/policyNewsView.do?newsId=148937933"')], [true, true]);
check('카드: 국가산단·착공 쉬운 풀이', [c2.includes('국가산업단지(국가산단)'), F.STAGE['공사 중'].includes('착공(공사를 시작함)')], [true, true]);
check('카드: 글자 이스케이프', F.cardHtml({ type: 'area', name: '<b>x</b>', stage: '계획' }).includes('&lt;b&gt;x&lt;/b&gt;'), true);
check('보는 법: 점선·면·연도 설명 + 못 그린 목록', (() => { const h = F.infoHtml({ omitted: [{ name: 'GTX-C', stage: '공사 중', why: '공식 자료로 정거장 순서를 확인하지 못해' }] }); return [h.includes('점선은 개통 예정 노선'), h.includes('칠한 면은 개발 구역'), h.includes('못 그린 예정 사업 1곳'), h.includes('GTX-C')]; })(), [true, true, true, true]);

/* 보이는 확대 */
check('노선: 확대 9부터 선, 10부터 글자', [F.show(line, 8).shape, F.show(line, 9).shape, F.show(line, 9).text, F.show(line, 10).text], [false, true, false, true]);
check('정비구역(작은 구역): 자료의 zoom(15)부터', [F.show({ type: 'area', zoom: 15, poly: [[]] }, 14).shape, F.show({ type: 'area', zoom: 15, poly: [[]] }, 15).shape], [false, true]);
check('선 위 글자 기준점: 가운데부터', F.linePoints([[0, 0], [2, 0], [4, 0]])[0], [2, 0]);

/* 실제 공개 파일(주면) */
const file = process.argv[2];
if (file && fs.existsSync(file)) {
  const D = JSON.parse(fs.readFileSync(file, 'utf8'));
  const all = D.items.concat(D.omitted || []);
  const OK = u => /^https:\/\/([a-z0-9-]+\.)*(go\.kr|korea\.kr)\//.test(u);
  check('실제: 연도마다 공식 주소·날짜(① 연도는 출처와 함께만)', all.every(it => (it.due || []).every(d => OK(d.src.url) && d.src.date && d.say.includes(String(d.y)))), true);
  check('실제: 면은 공식 경계 자료에서만(②)', D.items.filter(it => it.poly).every(it => it.poly_src && it.poly_src.official && /^https:\/\/([a-z0-9-]+\.)*(vworld\.kr|go\.kr)/.test(it.poly_src.url)), true);
  const pts = []; const walk = a => { if (Array.isArray(a) && a.length === 2 && typeof a[0] === 'number') pts.push(a); else if (Array.isArray(a)) a.forEach(walk); };
  D.items.forEach(it => { walk(it.path || []); walk(it.poly || []); walk(it.at || []); });
  check('실제: 좌표 소수 셋째 자리(③)', pts.every(p => p.every(v => Math.round(v * 1000) / 1000 === v)), true);
  check('실제: 지도에서 뺀 목록엔 좌표 없음(④)', (D.omitted || []).every(it => !it.path && !it.poly && !it.at), true);
  check('실제: 이미 개통한 노선 없음', D.items.every(it => it.type !== 'line' || it.stage !== '개통'), true);
  check('실제: 안내 문장', D.note.includes('바뀔 수 있어요'), true);
}

const bad = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? '통과 ' : '실패 ') + r.name + (r.ok ? '' : `\n   받은 값: ${JSON.stringify(r.got)}\n   기대 값: ${JSON.stringify(r.want)}`));
console.log(`${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
