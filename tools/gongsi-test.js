/* 공시가격 자동 채우기(assets/gongsi.js) 검증 — 실행: node tools/gongsi-test.js
   단지·평형 찾기(한 지번 여러 단지·평형 없을 때 가까운 전용면적), 출처 문구, 화면 연결(세금 칸·/tax/·/tax/transfer/), 캐시 버전 */
const G = require('../assets/gongsi.js');
const fs = require('fs'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const rows = [];
const check = (name, got, want) => rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want });

const F = { y: 2026, d: '2026-01-01', u: {
  '11710|가락동|913': [['59㎡대', 179800, 766, 167500, 187400, 175800, 179800, 181700, 60.0], ['84㎡대', 198800, 5132, 179900, 211500, 194200, 199500, 203500, 85.0]],
  '11410|남가좌동|385|DMC파크뷰자이1단지': [['84㎡대', 96800, 1438, 90000, 100000, 0, 0, 0, 84.9]],
  '11410|남가좌동|385|DMC파크뷰자이2단지': [['84㎡대', 88800, 866, 80000, 90000, 0, 0, 0, 84.9]] } };
const o = { code: '11710', dong: '가락동', jibun: '913', apt: '헬리오시티', band: '84㎡대', area: 84.9 };
const p = G.pick(F, o);
check('같은 평형 중간값', [p.v, p.n, p.min, p.max, p.lo, p.hi, p.exact, p.d], [198800, 5132, 179900, 211500, 194200, 203500, true, '2026-01-01']);
check('한 지번 여러 단지는 단지명으로', G.pick(F, { code: '11410', dong: '남가좌동', jibun: '385', apt: 'DMC파크뷰자이2단지', band: '84㎡대' }).v, 88800);
check('한 지번 여러 단지인데 이름이 없으면 채우지 않음', G.pick(F, { code: '11410', dong: '남가좌동', jibun: '385', apt: '다른단지', band: '84㎡대' }), null);
const nb = G.pick(F, Object.assign({}, o, { band: '74㎡대', area: 79.5 }));
check('평형이 없으면 가장 가까운 전용(±10㎡)', [nb.v, nb.exact], [198800, false]);
check('가까운 전용도 없으면 채우지 않음', G.pick(F, Object.assign({}, o, { band: '150㎡ 이상', area: 160 })), null);
check('단지가 없으면 채우지 않음(직접 입력)', G.pick(F, Object.assign({}, o, { jibun: '1' })), null);
check('파일이 없으면 null', G.pick(null, o), null);
check('만 원 표기', G.man(198800), '19억 8,800만 원');
check('기준일 표기', G.dayKo('2026-01-01'), '2026년 1월 1일');

const plain = h => h.replace(/<[^>]+>/g, '').replace(/ ↗/g, '');
const n0 = plain(G.noteHtml(p, false));
check('출처 한 줄 문구', n0.indexOf('2026년 1월 1일 공시가격(국토교통부), 같은 평형 호별 중간값 — 우리 집 공시가격은 부동산공시가격알리미에서 확인') === 0, true);
check('알리미 링크', G.noteHtml(p, false).indexOf('href="https://www.realtyprice.kr/notice/main/mainBody.htm"') > 0, true);
check('호 수·범위·저/고층', n0.indexOf('이 평형 5,132호 · 17억 9,900만~21억 1,500만 원') > 0 && n0.indexOf('저층 19억 4,200만 · 고층 20억 3,500만') > 0, true);
check('고치면 고친 값 안내 + 다시 넣기', /직접 고친 값으로 계산해요 \(중간값 19억 8,800만 원\)/.test(plain(G.noteHtml(p, true))) && /data-gs-reset/.test(G.noteHtml(p, true)), true);
check('다른 화면에서 넘어온 값(기준일만)도 출처 표시', plain(G.noteHtml({ v: 198800, d: '2026-01-01' }, false)).indexOf('2026년 1월 1일 공시가격(국토교통부)') === 0, true);

// 화면 연결
const tb = rd('assets/tax-box.js');
check('세금 칸: gongsi.js 불러옴', /assets\/gongsi\.js\?v=4/.test(tb), true);
check('세금 칸: 받은 값으로 채우고 출처', /JDJ_GONGSI\.attach\(\$i\('s'\), info, q\('\[data-gsn\]'\)\)/.test(tb), true);
check('세금 칸: 재산세·종부세·넘기기 화면에 gs 전달', (tb.match(/gs: std \? gsd\(\) : ''/g) || []).length, 3);
check('내 집 화면: 단지 키 전달', /code: d\.code, dong: d\.dong, jibun: d\.jibun/.test(rd('mine/index.html')), true);
check('맞춤 리포트: 단지 키 전달', /code:x\.code, dong:x\.dong, jibun:x\.jb/.test(rd('buy/report/index.html')), true);
const ui = rd('tax/tax-ui.js'), th = rd('tax/index.html');
check('/tax/ 재산세·종부세: 출처 칸', /id="pGs"/.test(th) && /id="cGs"/.test(th) && /gsAttach\(\$\('pPrice'\), P, \$\('pGs'\)\)/.test(ui) && /gsAttach\(first, P, \$\('cGs'\)\)/.test(ui), true);
check('/tax/ 공시가격 안내: 1월 1일 기준', /공동주택 공시가격\(매년 1월 1일 기준/.test(th) && !/6월 1일 기준 공시가격/.test(th), true);
check('/tax/transfer/: 출처 칸', /id="stdGs"/.test(rd('tax/transfer/index.html')) && /JDJ_GONGSI\.attach\(\$\('std'\)/.test(rd('tax/transfer/transfer-ui.js')), true);
const sw = rd('sw.js');
for (const [f, v] of [['assets/gongsi.js', 4], ['assets/tax-box.js', 11], ['tax/tax-ui.js', 10], ['tax/transfer/transfer-ui.js', 5]])
  check('sw.js 캐시 목록 ' + f + '?v=' + v, sw.indexOf("'./" + f + '?v=' + v + "'") > 0, true);
for (const f of ['mine/index.html', 'buy/report/index.html', 'tax/transfer/index.html'])
  check(f + ' tax-box ?v=11', /assets\/tax-box\.js\?v=11/.test(rd(f)), true);

const bad = rows.filter(r => !r.ok);
bad.forEach(r => console.log('실패:', r.name, '| 결과', JSON.stringify(r.got), '| 기대', JSON.stringify(r.want)));
console.log(`gongsi 테스트 ${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
