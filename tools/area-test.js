/* 관심 지역(assets/area-watch.js) 자동 검증 — 실행: node tools/area-test.js
   관심 지역·알림 종류에 맞는 '지금 분양예정·청약중' 공고 고르기, 저장 형식 정리, 화면 문구·연결을 확인합니다. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const A = require('../assets/area-watch.js');
const rows = [];
const check = (name, got, want) => rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want });
const d = n => { const t = new Date(Date.now() + n * 86400000); return `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}`; };
const R = [
  { id: 'a1', n: '강동 아파트', k: '아파트', sd: '서울특별시', g: '11740', gn: '강동구', st: 'pre', sp: ['', ''], rc: [d(5), d(7)], pb: d(-1) },
  { id: 'a2', n: '강동 무순위', k: '무순위·잔여세대', sd: '서울특별시', g: '11740', gn: '강동구', st: 'on', sp: ['', ''], rc: [d(-1), d(1)], pb: d(-3) },
  { id: 'a3', n: '강동 입주예정', k: '아파트', sd: '서울특별시', g: '11740', gn: '강동구', st: 'mv', sp: [], rc: [], pb: d(-90) },
  { id: 'a4', n: '송파 아파트', k: '아파트', sd: '서울특별시', g: '11710', gn: '송파구', st: 'pre', sp: [d(2), d(2)], rc: [d(3), d(4)], pb: d(-2) },
  { id: 'a5', n: '광주 아파트(옛 이름)', k: '민간임대', sd: '광주광역시', g: '', gn: '북구', st: 'on', sp: [], rc: [d(0), d(2)], pb: d(-5) },
  { id: 'a6', n: '정비 예정', k: '정비사업', sd: '서울특별시', g: '11740', gn: '강동구', st: 'plan' }
];
const P = (list, kinds) => A.clean({ list, kinds });
const ids = m => m.map(x => x.id);
check('관심 지역 없으면 아무것도 안 고름', ids(A.match(R, P([]))), []);
check('구 단위: 강동구의 분양예정·청약중만(입주예정·정비 예정 제외), 가까운 일정 순', ids(A.match(R, P([{ sd: '서울특별시', g: '11740', gn: '강동구' }]))), ['a2', 'a1']);
check('무순위 알림 끄면 무순위 제외', ids(A.match(R, P([{ sd: '서울특별시', g: '11740', gn: '강동구' }], { notice: true, mu: false }))), ['a1']);
check('새 분양 공고 끄면 무순위만', ids(A.match(R, P([{ sd: '서울특별시', g: '11740', gn: '강동구' }], { notice: false, mu: true }))), ['a2']);
check('시·도 전체', ids(A.match(R, P([{ sd: '서울특별시', g: '', gn: '' }]))).sort(), ['a1', 'a2', 'a4']);
check('옛 시·도 이름(광주광역시)도 통합 이름으로 맞춤', ids(A.match(R, P([{ sd: '전남광주통합특별시', g: '', gn: '' }]))), ['a5']);
const c = A.clean({ list: [{ sd: '서울특별시', g: '11740', gn: '강동구' }, { sd: '서울특별시', g: '11740', gn: '강동구' }, { sd: '경기도', g: 'abc' }, ...Array.from({ length: 12 }, (_, i) => ({ sd: '부산광역시', g: String(26100 + i), gn: 'x' }))] });
check('저장 정리: 중복 빼고 10곳까지, 알림 기본 둘 다 켬', [c.list.length, c.list[1], c.kinds], [10, { sd: '경기도', g: '', gn: '' }, { notice: true, mu: true }]);
check('빈 상태 문구(혜택형)', A.EMPTY_TXT, '관심 지역을 설정하면 새로운 분양 공고, 무순위 청약 일정을 가장 먼저 받아볼 수 있어요');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
check('분양 화면에 관심 지역 상자', [/id="areaBox"/.test(rd('bunyang/index.html')), /JDJ_AREA\.mountPanel/.test(rd('bunyang/index.html'))], [true, true]);
check('청약 화면 위쪽 표시', [/id="areaStrip"/.test(rd('chungyak/index.html')), /JDJ_AREA\.mountStrip/.test(rd('chungyak/index.html'))], [true, true]);
check('첫 화면 분양 링크 배지', /JDJ_AREA\.badge\(/.test(rd('index.html')), true);
const sw = rd('sw.js');
check('서비스 워커 캐시 목록', sw.includes("'./assets/area-watch.js?v=5'"), true);
check('공고 자료는 관심 지역이 있을 때만 받음', /if \(!p\.list\.length\) return Promise\.resolve\(\{ n: 0/.test(rd('assets/area-watch.js')), true);

const today = new Date().toISOString().slice(0, 10), old = new Date(Date.now() - 800 * 86400000).toISOString().slice(0, 10);
check('광고성 정보 수신 동의: 동의한 날만 저장, 없으면 칸 없음', ['mkt' in A.clean({ list: [] }), A.clean({ list: [], mkt: { at: today, x: 1 } }).mkt, 'mkt' in A.clean({ list: [], mkt: { at: 'y' } })], [false, { at: today }, false]);
check('광고성 정보 수신 동의: 2년 지나면 다시 여쭤봄', [A.mktOn({ mkt: { at: today } }), A.mktOn({ mkt: { at: old } }), A.mktOn({})], [true, false, false]);
check('동의 체크는 선택(기본 꺼짐)·야간 미발송 안내', [/id="jaK3"\$\{mktOn\(draft\)/.test(rd('assets/area-watch.js')), /오후 9시~오전 8시에는 보내지 않아요/.test(rd('assets/area-watch.js'))], [true, true]);

let bad = 0;
for (const r of rows) { if (!r.ok) bad++; console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : `  got=${JSON.stringify(r.got)} want=${JSON.stringify(r.want)}`)); }
console.log(`\n${rows.length - bad}/${rows.length} 통과`);
process.exit(bad ? 1 : 0);
