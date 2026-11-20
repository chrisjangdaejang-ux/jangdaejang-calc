/* 지도 화면(map/) 계산 자동 검증 — 실행: node tools/map-test.js [자료 폴더(선택, 예: /tmp/dchk/data)]
   assets/map-core.js 의 단계·필터·대표 평형·묶음 평균·겹침 묶기·주소와 assets/map-engine.js 의 엔진 고르기를 손으로 계산한 값과 맞춰 본다.
   자료 폴더를 주면 실제 단지 자료로 '숫자를 지어내지 않는지'(말풍선 값 = 자료 값)도 확인한다. 금액 단위: 만원. */
const fs = require('fs'), path = require('path');
const C = require('../assets/map-core.js');
const E = require('../assets/map-engine.js');
const M = require('../assets/mine-core.js');
const rows = [];
function check(name, got, want, basis) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want, basis }); }
const months = []; for (let y = 2023, m = 11; months.length < 36; m++) { if (m > 12) { m = 1; y++; } months.push(String(y) + String(m).padStart(2, '0')); }
const ser = v => months.map(() => v);

/* 단계 */
check('줌 7 → 시·도', C.level(7), 'sido', '줌 8 이하');
check('줌 12 → 구', C.level(12), 'sgg', '줌 9~12');
check('줌 13 → 동', C.level(13), 'dong', '줌 12~13');
check('줌 14 → 단지', C.level(14), 'danji', '줌 14 이상');
check('카카오 레벨 3 ↔ 줌 17', [C.kakaoToZoom(3), C.zoomToKakao(17)], [17, 3], '레벨 = 20 − 줌');
check('카카오 레벨 범위 1~14', [C.zoomToKakao(22), C.zoomToKakao(2)], [1, 14], '넘치면 끝값');

/* 평형·가격 */
check('전용 59.9㎡ 소형 / 84.9㎡ 중형 / 85.0㎡ 중형 / 101㎡ 대형', [59.9, 84.9, 85.0, 101].map(C.sizeOf), ['s', 'm', 'm', 'l'], '60 미만 소형, 85.99 이하 중형');
check('가격대 경계: 9억 정확히 → 6억~9억', [C.priceOk('p9', 90000), C.priceOk('p15', 90000)], [true, false], '경계 금액은 아래 칸');
check('가격대: 시세 없음(0)은 어느 칸에도 안 맞음', C.priceOk('p6', 0), false, '최근 거래 없는 평형은 가격 필터에서 빠짐');
check('가격대 전체 → 모두 통과', C.priceOk('', 0), true, '');

/* 단지·대표 평형 */
const fx = (fv, jr, gs) => ({ fv, jr, gs, by: 2010, hh: 1000 });
const s84 = ser(3000), s59 = ser(3500), s114 = ser(0);   // 114㎡대는 최근 거래 없음
const units = [
  ['11710', '가락동', '테스트', '59㎡대', 59.9, 20, s59, '1'.repeat(36), '100', fx(60, 0.5, 40)],
  ['11710', '가락동', '테스트', '84㎡대', 84.9, 10, s84, '1'.repeat(36), '100', fx(72, 0.45, 40)],
  ['11710', '가락동', '테스트', '114㎡대', 114.5, 5, s114, '0'.repeat(36), '100', fx(50, null, 40)],
  ['11710', '문정동', '좌표없음', '84㎡대', 84.0, 3, s84, '1'.repeat(36), '200', null]
];
const xy = { '11710|가락동|100': [127.1, 37.5] };
const L = C.danjiList(units, xy, 's00');
check('좌표 없는 단지는 지도에서 뺌', L.map(d => d.apt), ['테스트'], 'xy 에 없는 지번');
check('단지 키 = 내 집 시세 키(구|동|지번|단지)', L[0].key, M.danjiKey(units[0]), 'mine-core danjiKey');
const d = L[0];
const b0 = C.pick(d, months, {});
check('전체 평형 대표 = 시세 있는 평형 중 84㎡에 가까운 것', b0.band, '84㎡대', '');
check('대표 평형 시세 = 평당가 × 전용㎡ ÷ 3.3058 (100만 원 단위)', b0.price, M.toPrice(3000, 84.9), `3000 × 84.9 / 3.3058 = ${3000 * 84.9 / 3.3058}`);
check('대형 필터 → 114㎡대(시세 없음 그대로 0)', [C.pick(d, months, { size: 'l' }).band, C.pick(d, months, { size: 'l' }).price], ['114㎡대', 0], '없는 시세를 메우지 않음');
check('대형 + 가격 필터 → 맞는 평형 없음(null)', C.pick(d, months, { size: 'l', price: 'p9' }), null, '시세 없는 평형은 가격 필터에서 빠짐');
check('소형 필터 → 59㎡대', C.pick(d, months, { size: 's' }).band, '59㎡대', '');
check('평형 지정이 먼저', C.pick(d, months, { band: '59㎡대' }).band, '59㎡대', '');

/* 말 */
check('금액 줄임: 11.4억 / 9,800만 / 125억', [C.eokShort(114000), C.eokShort(9800), C.eokShort(1250000)], ['11.4억', '9,800만', '125억'], '');
check('평당가 문구', C.ppyText(4520), '평당 4,520만', '');
check('점수 색 구간(narrative.js 와 같은 70·55·45·30)', [70, 69, 55, 54, 46, 45, 31, 30, null].map(C.tone), ['t5', 't4', 't4', 't3', 't3', 't2', 't2', 't1', 'na'], '');
check('말풍선 값: 시세/점수/전세가율', [C.mainText('price', b0), C.mainText('fv', b0), C.mainText('jr', b0)], [C.eokShort(b0.price), '72점', '전세 45%'], '');
check('자료 없는 값은 빈칸', C.mainText('jr', C.pick(d, months, { size: 'l' })), '', '전세가율 자료 없음');

/* 묶음 평균 */
const it = [{ d: { code: '1', dong: 'a', lat: 1, lng: 1 }, b: { ppy: 1000, fv: 60, jr: 0.5, u: [0, 0, 0, 0, 0, 0, 0, 0, 0, { gs: 70 }] } },
  { d: { code: '1', dong: 'a', lat: 3, lng: 3 }, b: { ppy: 0, fv: 80, jr: null, u: [] } },
  { d: { code: '1', dong: 'b', lat: 5, lng: 5 }, b: { ppy: 2000, fv: null, jr: 0.7, u: [] } }];
const gd = C.groups(it, 'dong'), gs = C.groups(it, 'sgg');
check('동 묶음 2개', gd.map(g => [g.dong, g.n]), [['a', 2], ['b', 1]], '');
check('동 평균: 시세 없는 단지는 평당가 평균에서 뺌', [gd[0].ppy, gd[0].fv, gd[0].jr, gd[0].lat], [1000, 70, 0.5, 2], '평당 (1000) / 점수 (60+80)/2 / 전세가율 0.5 / 위도 (1+3)/2');
check('구 묶음 평균·지역 점수', [gs[0].n, gs[0].ppy, gs[0].gs], [3, 1500, 70], '(1000+2000)/2');

/* 겹침 묶기 */
const cl = C.cluster([{ x: 10, y: 10, w: 1 }, { x: 20, y: 20, w: 5 }, { x: 200, y: 10, w: 1 }], 80, 50);
check('같은 칸 2개 → 1묶음, 먼 1개 따로', cl.map(c => c.list.length).sort(), [1, 2], '칸 80×50px');
check('묶음 안은 거래 많은 단지 먼저', cl.find(c => c.list.length === 2).list[0].w, 5, '');

const ga = C.gather([{ x: 0, y: 0, w: 1, id: 'a' }, { x: 50, y: 0, w: 9, id: 'b' }, { x: 100, y: 0, w: 2, id: 'c' }, { x: 300, y: 0, w: 0, id: 'd' }], 80, 40);
check('욕심 묶기: 무게 큰 b 가 자리 잡고 가까운 a·c 를 담음', ga.map(g => g.list.map(p => p.id).join('')), ['bca', 'd'], '상자 80×40px 안');

/* 겹치는 묶음 말풍선 숨기기 */
const dc = C.declutter([{ x: 0, y: 0, w: 60, h: 30, p: 1, id: 'a' }, { x: 30, y: 10, w: 60, h: 30, p: 9, id: 'b' }, { x: 200, y: 0, w: 60, h: 30, p: 0, id: 'c' }]);
check('겹치면 단지 많은 쪽만 남김', dc.map(b => b.id).sort(), ['b', 'c'], '가로 30px 차이 < 폭 60');

/* 말풍선 겹침 정리(벽 + 합치기) */
const bx = (l, t, w, h) => ({ l, t, r: l + w, b: t + h });
const st = C.settle([
  { id: 'a', p: 1, box: bx(0, 100, 80, 30), list: ['a'] },
  { id: 'b', p: 9, box: bx(40, 110, 80, 30), list: ['b'] },
  { id: 'c', p: 5, box: bx(300, 100, 80, 30), list: ['c'] },
  { id: 'd', p: 7, box: bx(0, -10, 80, 30), list: ['d'] }
], [bx(-1e5, -1e5, 2e5, 1e5)]);
check('settle: 위쪽 벽에 걸린 d 는 숨김, 겹친 a 는 b 에 합침', st.map(s => s.id + ':' + s.list.join('')), ['b:ba', 'c:c'], '벽 = 지도 위쪽 바깥, 점수 b9 > a1');
check('글자 폭 어림: 한글 > 숫자', [C.textW('가나', 10), +C.textW('12', 10).toFixed(1)], [20, 11.2], '한글 1.0 · 숫자 0.56');

/* 지역 분석 */
check("보기 4가지: 시세·미래가치·전세가율·지역 분석", C.MODES.map(m => m.id), ['price', 'fv', 'jr', 'reg'], '');
check('구 동그라미 자리 = 가운데 ± 반지름', C.circleBox(100, 50, 60), { l: 70, t: 20, r: 130, b: 80 }, '');
check("동그라미 구 이름: '수원시 장안구' → '장안구'", [C.shortGu('수원시 장안구'), C.shortGu('강남구')], ['장안구', '강남구'], '');

/* 보이는 시·도 */
const geo = { sido: { s00: { b: [126.7, 37.4, 127.2, 37.7] }, s01: { b: [128.8, 35.0, 129.3, 35.4] } } };
check('서울만 보이는 상자 → s00', C.sidosIn(geo, { w: 126.9, s: 37.5, e: 127.0, n: 37.6 }), ['s00'], '');
check('지도 자료 없으면 null(모두 읽기)', C.sidosIn(null, { w: 0, s: 0, e: 1, n: 1 }), null, '');

/* 주소 */
check('내 집 시세 주소', C.mineUrl(d, '84㎡대'), '/jangdaejang-calc/mine/?sd=s00&d=' + encodeURIComponent(d.key).replace(/%20/g, '+') + '&b=' + encodeURIComponent('84㎡대'), 'mine/ 의 sd·d·b');
let cmp = [];
for (const n of ['A', 'B', 'C', 'D']) cmp = C.cmpAdd(cmp, { sd: 's00', code: '11710', dong: '가락동', jibun: '1', apt: n, band: '' });
check('비교함 최대 3곳(오래된 것부터 빠짐)', cmp.map(x => x.apt), ['B', 'C', 'D'], '단지 비교 화면 한도 3');
check('같은 단지 다시 담으면 중복 없이 맨 뒤로', C.cmpAdd(cmp, cmp[0]).map(x => x.apt), ['C', 'D', 'B'], '');
const A = require('../assets/ask-core.js');
const au = new URL('http://x' + C.askUrl(cmp.slice(0, 2)));
check('단지 비교 주소를 ask-core 가 그대로 읽음', A.unpackList(au.searchParams.get('k')).map(A.parseKey).map(k => k && k.apt), ['B', 'C'], 'ask-core parseKey');

/* 엔진 고르기 */
check('키 없음 → Leaflet + OSM 미리 보기', E.plan({}), { kind: 'leaflet', tiles: 'osm' }, '');
check('브이월드 키만 → Leaflet + 브이월드', E.plan({ VWORLD_KEY: 'k' }), { kind: 'leaflet', tiles: 'vworld' }, '');
check('카카오 키 → 카카오맵', E.plan({ KAKAO_JS_KEY: 'k', VWORLD_KEY: 'v' }), { kind: 'kakao' }, '');
check("MAP_ENGINE 'leaflet' 이면 카카오 키가 있어도 Leaflet", E.plan({ KAKAO_JS_KEY: 'k', MAP_ENGINE: 'leaflet' }), { kind: 'leaflet', tiles: 'osm' }, '');
check('설정 파일: 카카오 JavaScript 키(공개용)는 비었거나 32자리, 브이월드 키는 비어 있음', (() => { const s = fs.readFileSync(path.join(__dirname, '..', 'assets', 'config.js'), 'utf8'); return [/KAKAO_JS_KEY:\s*'([0-9a-f]{32})?'/.test(s), /VWORLD_KEY:\s*''/.test(s)]; })(), [true, true], 'assets/config.js');

/* 실제 자료 (선택) */
const dir = process.argv[2];
if (dir && fs.existsSync(path.join(dir, 'index.json'))) {
  const IX = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  let n = 0, bad = 0, nxy = 0;
  for (const s of IX.sido) {
    const u = JSON.parse(fs.readFileSync(path.join(dir, s.id + '.json'), 'utf8')).units, x = JSON.parse(fs.readFileSync(path.join(dir, s.xy), 'utf8')).xy;
    const list = C.danjiList(u, x, s.id); nxy += list.length;
    for (const dd of list) {
      for (const sz of ['', 's', 'm', 'l']) {
        const b = C.pick(dd, IX.months, { size: sz }); if (!b) continue; n++;
        const li = M.lastIdx(b.u[6]);
        const want = li >= 0 ? M.toPrice(b.u[6][li], b.u[4]) : 0;
        if (b.price !== want || (b.fv != null && b.fv !== b.u[9].fv) || (sz && C.sizeOf(b.area) !== sz)) bad++;
      }
    }
  }
  check(`실제 자료: 대표 평형 ${n.toLocaleString()}건의 시세·점수 = 자료 값 그대로`, bad, 0, `지도에 올린 단지 ${nxy.toLocaleString()}곳`);
  const geoF = path.join(__dirname, '..', 'assets', 'map-geo.json');
  if (fs.existsSync(geoF)) {
    const G = JSON.parse(fs.readFileSync(geoF, 'utf8'));
    check('map-geo.json 에 모든 시·도 상자', IX.sido.filter(s => !G.sido[s.id]).map(s => s.id), [], 'tools/map-bounds.js');
  }
}

const fail = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `\n      got ${JSON.stringify(r.got)}\n      want ${JSON.stringify(r.want)}  (${r.basis})`));
console.log(`\n${rows.length - fail.length}/${rows.length} 통과`);
process.exit(fail.length ? 1 : 0);
