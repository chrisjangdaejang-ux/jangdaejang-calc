/* 진단 리포트 공용 틀(assets/diag.js · diag.css) 점검 · 실행: node tools/diag-test.js </dev/null
   ① 순서: 한 줄 결론 → 신호등 카드 → '왜 이런 결과인가요?' → 다음 할 일 → 공유·저장 → 정보 문구
   ② 판정 칩: 아이콘 + 글자(색만으로 구분하지 않음) · 모르는 판정은 '확인 필요' · 개수 칩
   ③ 글자 이스케이프 · 바깥 링크 새 창 · 사이트 안 링크에 base · 출처 확인일
   ④ 공유·인쇄 단추는 opt 가 있을 때만 · 공유 문구에 금액 칸 없음
   ⑤ 색: 상태색 3가지(#0E7A4F·#A15C07·#B42318)만 판정에 · 남색은 누르는 것에만
   ⑥ 머리 주석에 API 설명 · 쓰는 화면·서비스 워커 파일 번호 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const D = require('../assets/diag.js');
let pass = 0, fail = 0;
const check = (n, c, x) => { if (c) pass++; else { fail++; console.log('  실패:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

const rep = {
  title: '전세 안전 점검', lv: 'r', head: '위험 신호 1개 — 계약 전에 꼭 다시 확인하세요', sub: '전세가율에서 위험 신호가 나왔어요', asof: '2026.10 실거래 기준',
  items: [
    { id: 'jr', t: '전세가율', lv: 'r', v: '91%', s: '보증금 ÷ 매매 시세', why: ['이유 <b>하나</b>'], src: [{ n: '국토교통부 실거래가 공개시스템', u: 'https://rt.molit.go.kr/', at: '2026-11-27' }] },
    { id: 'hug', t: 'HUG 전세보증 가입', lv: 'g', v: '기준 안이에요', s: '한도 안', why: ['126%'] },
    { id: 'kk', t: '깡통전세 위험', lv: 'y', v: '98건 중 23건', s: '과거 계약' },
    { id: 'x', t: '모르는 판정', lv: 'zz', v: '?', s: '' }
  ],
  todo: [{ id: 'reg', t: '등기부등본', s: '두 번', href: 'https://www.iros.go.kr/', ext: 1, ln: '대법원 인터넷등기소' }, { id: 'ck', t: '체크리스트', href: 'jeonse/checklist/', ln: '체크리스트' },
    { id: 'hug', t: '반환보증', href: 'https://www.khug.or.kr/', ext: 1, ln: 'HUG', alt: { n: '안심전세 앱', u: 'https://apps.apple.com/kr/app/id1633013098' } }],
  note: '정보 제공용이에요.'
};
const h = D.html(rep, { base: '/jangdaejang-calc/', share: { url: 'https://x/jeonse/safety/?k=a', title: 't', text: 's' }, shareNote: '금액은 들어가지 않아요.', print: true, track: 'jsafe' });

/* ① 순서 */
const at = k => h.indexOf(k);
check('① 순서: 결론 → 카드 → 왜 → 할 일 → 공유 → 문구', at('dg-head') < at('dg-cards') && at('dg-cards') < at('dg-why') && at('dg-why') < at('dg-todo') && at('dg-todo') < at('dg-share') && at('dg-share') < at('dg-note') && at('dg-head') > 0);
check('① 결론 카드에 전체 판정 색·아이콘·제목·기준일', /class="dg-head dg-r"/.test(h) && /<i class="dg-ic" aria-hidden="true">✕<\/i>/.test(h) && /2026\.10 실거래 기준/.test(h) && /전세 안전 점검/.test(h));
check('① 카드 수 = 항목 수', (h.match(/class="dg-card /g) || []).length === rep.items.length);

/* ② 칩 */
check('② 판정 칩: 아이콘 + 글자', /<span class="dg-chip dg-r"><i aria-hidden="true">✕<\/i>위험<\/span>/.test(h) && /dg-chip dg-g"><i aria-hidden="true">✓<\/i>괜찮아요/.test(h) && /dg-chip dg-y"><i aria-hidden="true">!<\/i>주의/.test(h));
check('② 모르는 판정은 확인 필요(?)', /dg-card dg-n" data-dg="x"/.test(h) && /dg-chip dg-n"><i aria-hidden="true">\?<\/i>확인 필요/.test(h));
check('② 개수 칩: 위험 1 · 주의 1 · 괜찮아요 1 · 확인 필요 1 (위험부터)', /dg-cnt dg-r">위험 1<\/span><span class="dg-cnt dg-y">주의 1<\/span><span class="dg-cnt dg-g">괜찮아요 1<\/span><span class="dg-cnt dg-n">확인 필요 1/.test(h));
check('② 전체 판정이 이상하면 확인 필요', /class="dg-head dg-n"/.test(D.html(Object.assign({}, rep, { lv: 'q' }))));
check('② LV 글자', D.LV.g === '괜찮아요' && D.LV.y === '주의' && D.LV.r === '위험' && D.LV.n === '확인 필요');

/* ③ 링크·이스케이프·출처 */
check('③ 글자는 이스케이프', /이유 &lt;b&gt;하나&lt;\/b&gt;/.test(h) && !/<b>하나<\/b>/.test(h));
check('③ 바깥 링크 새 창 ↗ · 사이트 안 링크 base + ›', /href="https:\/\/www\.iros\.go\.kr\/" target="_blank" rel="noopener" data-track="jsafe_todo_reg">대법원 인터넷등기소 ↗/.test(h) && /href="\/jangdaejang-calc\/jeonse\/checklist\/" data-track="jsafe_todo_ck">체크리스트 ›/.test(h));
check('③ 두 번째 바깥 링크(alt)', /href="https:\/\/apps\.apple\.com\/kr\/app\/id1633013098" target="_blank" rel="noopener"[^>]*>안심전세 앱 ↗/.test(h));
check('③ 출처 + 확인일', /국토교통부 실거래가 공개시스템 ↗<\/a> <small>\(2026\.11\.27 확인\)<\/small>/.test(h));
check("③ '왜 그런가요?'는 이유가 있는 항목에만 · 펼침 칸 id 연결", /data-why="jr" aria-controls="dgw-jr"/.test(h) && /id="dgw-jr"/.test(h) && !/data-why="kk"/.test(h));
check('③ 할 일 체크 + 진행 표시', (h.match(/data-todo="/g) || []).length === 3 && /<b data-dg-done>0<\/b> \/ 3 확인/.test(h));

/* ④ 공유·인쇄 */
check('④ 공유·PDF 단추와 안내 줄', /data-dg-share data-track="jsafe_share">공유하기/.test(h) && /data-dg-print data-track="jsafe_print">PDF로 저장 · 인쇄/.test(h) && /금액은 들어가지 않아요/.test(h));
const h2 = D.html(rep, {});
check('④ opt 가 없으면 공유·인쇄 칸 없음 · 집계 이름 기본값', !/dg-share/.test(h2) && /data-track="diag_todo_reg"/.test(h2));
check('④ 할 일·왜가 없으면 그 칸 없음', !/dg-todo|dg-why/.test(D.html({ lv: 'g', head: 'x', items: [{ id: 'a', t: 'a', lv: 'g', v: '1' }] })));

/* ⑤ 색 */
const CSS = read('assets/diag.css'), JSRC = read('assets/diag.js');
check('⑤ 판정 상태색 3가지', /--dg-g:#0E7A4F/.test(CSS) && /--dg-y:#A15C07/.test(CSS) && /--dg-r:#B42318/.test(CSS));
const blueSel = CSS.split('}').filter(r => /var\(--blue/.test(r)).map(r => r.split('{')[0].trim());
check('⑤ 남색은 누르는 것(왜 그런가요·펼치기·출처 링크·할 일 링크·공유 단추)에만', blueSel.length > 0 && blueSel.every(sel => ['.dg-wb', '.dg-why>summary::after', '.dg-src a', '.dg-tl a', '.dg-btn'].includes(sel)), blueSel);
check('⑤ 작은 글씨 12.5px 아래 없음', !/font-size:(1[0-1](\.\d+)?|12(\.[0-4]\d*)?)px/.test(CSS));
check('⑤ 누르는 자리 44px 이상(할 일 링크·체크 줄·단추)', /\.dg-tl a\{[^}]*min-height:44px/.test(CSS) && /\.dg-todo label\{[^}]*min-height:44px/.test(CSS) && /\.dg-btn\{[^}]*min-height:48px/.test(CSS));
check('⑤ 인쇄 때 공유·링크 단추 숨김', /@media print\{\.dg-share,\.dg-wb,\.dg-tl\{display:none!important\}/.test(CSS));

/* ⑥ 문서·파일 번호 */
check('⑥ 머리 주석에 API(mount·html·LV·rep·opt)', /JDJ_DIAG\.mount\(el, rep, opt\)/.test(JSRC) && /JDJ_DIAG\.html\(rep, opt\)/.test(JSRC) && /rep = \{/.test(JSRC) && /opt = \{/.test(JSRC));
check('⑥ 서버로 보내는 코드 없음(체크 상태는 이 기기 localStorage)', !/fetch\(|XMLHttpRequest|sendBeacon/.test(JSRC) && /localStorage/.test(JSRC));
const PG = read('jeonse/safety/index.html'), SW = read('sw.js');
check('⑥ 쓰는 화면·서비스 워커: diag.js v1 · diag.css v1(페이지 style 뒤)', /diag\.js\?v=1/.test(PG) && PG.indexOf('diag.css?v=1') > PG.indexOf('</style>') && /'\.\/assets\/diag\.js\?v=1'/.test(SW) && /'\.\/assets\/diag\.css\?v=1'/.test(SW));
check('⑥ 권유 문구 없음', !/(계약하세요|계약하지\s*마세요|사세요|파세요)/.test(JSRC));

console.log(`\n진단 리포트 공용 틀: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
