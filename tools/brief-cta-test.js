/* 모닝 브리핑 구독 권유(assets/brief-cta.js) 자동 확인 — 실행: node tools/brief-cta-test.js </dev/null
   ① 구독 링크: 동네(d=구코드-동)·자리(cta) — 이상한 값은 빼고  ② 바닥 띠: 하루 1번·닫으면 7일
   ③ 첫 화면 미리 보기는 market.json 숫자만(없는 값은 빼고 지어내지 않음)  ④ 문구: '광고' 꼬리표 없음·경쟁 앱 이름 없음·자동 결제 없음 안내
   ⑤ 화면 연결: 첫 화면 카드·옛 brieflink 정리·맞춤 권유 자리·★ 알림 줄·구독 화면 cta 기록·jdjStat 허용 목록 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const C = require('../assets/brief-cta.js');
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ok   ' + name); } else { bad++; console.log('  FAIL ' + name + (info !== undefined && info !== '' ? '  → ' + JSON.stringify(info) : '')); } }

/* ① 구독 링크 */
{
  const u = C.subUrl('mine_res', '11710', '잠실동');
  check('동네·자리가 들어간 구독 링크', /brief\/subscribe\/\?d=11710-%EC%9E%A0%EC%8B%A4%EB%8F%99&cta=mine_res$/.test(u), u);
  check('구 전체(동 없음)', /\?d=11680&cta=strip$/.test(C.subUrl('strip', '11680', '')), C.subUrl('strip', '11680', ''));
  check('지역을 모르면 d 없이', /brief\/subscribe\/\?cta=buy_res$/.test(C.subUrl('buy_res', '', '')), C.subUrl('buy_res', '', ''));
  check('이상한 구 코드·동 이름은 뺌', !/d=/.test(C.subUrl('mine_res', '11<x>', '')) && !/%3C/.test(C.subUrl('mine_res', '11710', '<b>')), C.subUrl('mine_res', '11710', '<b>'));
  check('모르는 자리 이름은 cta 를 붙이지 않음', !/cta=/.test(C.subUrl('evil"', '11710', '')), '');
  check('광고 칸 자리(slot_칸이름)는 받음', /cta=slot_home_end$/.test(C.subUrl('slot_home_end', '', '')), '');
  check('주소 이름 src(유입 채널)는 쓰지 않음', !/[?&]src=/.test(C.subUrl('home_card', '11710', '잠실동')), '');
  const S = read('brief/subscribe/index.html'), core = read('assets/brief-core.js');
  check('구독 화면이 d=구코드-동 을 첫 동네로 받음(brief-core parseD)', /parseD\(d\)/.test(core) && /const d0 = B\.parseD\(Q\.get\('d'\)\)/.test(S) && /st\.areas\.unshift\(\{ g: d0\.g/.test(S), '');
  check('구독 화면: cta 기억 → 체험 시작 때 brief_cta sub 기록', /const CTA = /.test(S) && /ctaStat\('sub'\)/.test(S) && /brief_trial_start', \{ n: st\.areas\.length, cta: CTA/.test(S), '');
}

/* ② 바닥 띠 */
{
  check('처음이면 보임', C.stripDue({}, '2026-11-26') && C.stripDue(null, '2026-11-26'), '');
  check('오늘 이미 봤으면 안 보임(하루 1번)', !C.stripDue({ day: '2026-11-26' }, '2026-11-26'), '');
  check('다음 날은 다시 보임', C.stripDue({ day: '2026-11-26' }, '2026-11-27'), '');
  const until = C.addDays('2026-11-26', C.HIDE_DAYS);
  check('닫으면 7일 동안 안 보임', until === '2026-12-03' && !C.stripDue({ day: '2026-11-26', until }, '2026-12-02') && C.stripDue({ day: '2026-11-26', until }, '2026-12-03'), until);
  check('첫 화면·지도·브리핑·로그인 화면에는 띠 없음', ['', 'map', 'brief', 'login', 'my'].every(p => C.STRIP_PAGES.indexOf(p) < 0), C.STRIP_PAGES);
  const J = read('assets/brief-cta.js');
  check('localStorage 는 try/catch 로만', /get: function \(k\) \{ try \{ return root\.localStorage\.getItem\(k\); \} catch/.test(J) && /set: function \(k, v\) \{ try \{ root\.localStorage\.setItem/.test(J) && !/[^.]localStorage\.(get|set)Item/.test(J.replace(/root\.localStorage/g, '')), '');
  check('기록을 못 남기는 브라우저면 띠를 아예 안 띄움(매번 뜨지 않게)', /if \(!ls\.set\(STRIP_KEY, JSON\.stringify\(st\)\)\) return;/.test(J), '');
  check('휴대폰 띠: 아래 탭 위, 높이 52px · PC 는 오른쪽 아래 작은 카드', /\.bcta-strip\{position:fixed;left:10px;right:10px;bottom:calc\(66px \+ env\(safe-area-inset-bottom\)\);[^}]*height:52px/.test(J) && /@media\(min-width:1024px\)\{\.bcta-strip\{left:auto;right:20px;bottom:20px;width:440px/.test(J), '');
  check('팝업·화면 가리개 없음(전체 덮는 칸 없음)', !/inset:0/.test(J), '');
}

/* ③ 미리 보기 = 자료 숫자 그대로 */
{
  const M = { date: '2026-11-26', kr: { n: 1443, nhi: 131, ndrop: 417 }, seoul: { n: 200, nhi: 66 }, cy: { n: 33, hh: 8345 } };
  const p = C.preview(M);
  check('전국 새 매매·신고가·크게 내린 거래 = 자료 값', JSON.stringify(p.stats) === JSON.stringify([[1443, '전국 새 매매'], [131, '신고가'], [417, '크게 내린 거래']]), p.stats);
  check('서울·청약 줄 = 자료 값', p.lines.length === 2 && p.lines[0].t === '새 매매 200건 중 신고가 66건' && p.lines[1].t === '이번 주 접수 33곳 · 8,345세대', p.lines);
  const e = C.preview({ kr: { n: 0 }, cy: {} });
  check('값이 없으면 줄을 빼고 지어내지 않음', e.stats.length === 0 && e.lines.length === 0, e);
  check('자료가 없으면 빈 미리 보기', C.preview(null).stats.length === 0, '');
  check('날짜 이름표', C.dateLabel('2026-11-26') === '11월 26일(목)', C.dateLabel('2026-11-26'));
  const h = C.homeHtml({ pv: p, date: '11월 26일(목)', g: '11710', place: '송파구' });
  check('첫 화면 카드: 7일 무료 단추 + 자동 결제 없음 + 미리 보기 숫자', h.includes('7일 무료로 받아 보기') && h.includes('자동 결제 없음') && h.includes('1,443건') && h.includes('오늘 브리핑 미리 보기'), '');
  check('첫 화면 카드: 매일 아침 7시 · 새 실거래·신고가·급매·청약', h.includes('매일 아침 7시') && h.includes('새 실거래·신고가·급매·청약'), '');
  check('첫 화면 카드: 홈 지역이 있으면 그 구를 미리 채움', h.includes('송파구 새 거래') && /cta=home_card/.test(h) && /d=11710&amp;cta=home_card/.test(h), '');
  check('구독 중이면 오늘 브리핑 보기', C.homeHtml({ pv: p, sub: true }).includes('오늘 브리핑 보기') && !C.homeHtml({ pv: p, sub: true }).includes('7일 무료로 받아 보기'), '');
  check('자료를 못 받았을 때 안내(숫자 없음)', C.homeHtml({ pv: C.preview(null), failed: true }).includes('불러오지 못했어요'), '');
}

/* ④ 문구 */
{
  const J = read('assets/brief-cta.js');
  const shown = [C.homeHtml({ pv: C.preview({ kr: { n: 1 } }) }), C.nudgeHtml('mine_res', '11710', '잠실동', '잠실동')].join('');
  check("자체 안내라 '광고' 꼬리표 없음", !/광고/.test(shown) && !/jas-tag/.test(shown), '');
  const RIVAL = /호갱노노|직방|다방|네이버\s*부동산|부동산\s*114|아실|리치고|KB\s*부동산|밸류맵|디스코/;
  check('경쟁 앱·업체 이름 없음', !RIVAL.test(J), (J.match(RIVAL) || [])[0]);
  check('서비스 이름은 집예보(SITE_NAME), 회사명 없음', !/장대장부동산/.test(J) && /JDJ_SITE\.SITE_NAME/.test(J), '');
  check('맞춤 권유 문구', C.nudgeHtml('mine_res', '11710', '잠실동', '잠실동').includes('잠실동 새 거래를 매일 아침 받아 보세요') && C.nudgeHtml('mine_res', '11710', '', '').includes('우리 동네 새 거래를 매일 아침 받아 보세요'), '');
  check('맞춤 권유에 닫기 단추', /data-bcta-x="mine_res"/.test(C.nudgeHtml('mine_res', '11710', '', '')), '');
  check('문구 이스케이프', !C.nudgeHtml('mine_res', '11710', '', '<b>x</b>').includes('<b>x</b>'), '');
}

/* ⑤ 화면 연결 */
{
  const H = read('index.html');
  /* 첫 화면 개편(대표 승인 시안 2026-11-26): 질문 칸 → 광고 → 내 집·할 일 → 브리핑 카드(오른쪽 칸 안, 첫 스크롤 안) */
  check('첫 화면: 내 집·할 일 바로 아래 브리핑 카드', /<\/section>\n\s*<section class="bcta-home" id="bctaHome" data-bcta-home/.test(H) && H.indexOf('class="myh"') < H.indexOf('data-bcta-home'), '');
  check('첫 화면: 오늘 소식·상황별로 찾기보다 위(첫 스크롤 안)', H.indexOf('data-bcta-home') < H.indexOf('id="t3"') && H.indexOf('data-bcta-home') < H.indexOf('class="svc"'), '');
  check('첫 화면: 옛 brieflink 정리(중복 없음)', !/class="brieflink"/.test(H) && !/\.brieflink\{/.test(H), '');
  check('첫 화면: brief-cta.js 실림', /<script src="\.\/assets\/brief-cta\.js\?v=2" defer><\/script>/.test(H), '');
  const mine = read('mine/index.html'), buy = read('buy/index.html'), cal = read('mine/calendar/index.html'), w = read('assets/watch.js');
  check('단지 시세 결과: 그 단지 동네를 채운 자리', /<div data-bcta="mine_res" data-g="\$\{esc\(d\.code\)\}" data-dn="\$\{esc\(d\.dong \|\| ''\)\}" hidden><\/div>/.test(mine), '');
  check('내 집 마련 계산 결과 하단 자리', /<div data-bcta="buy_res" hidden><\/div>\s*<div data-ad-slot="buy_end"/.test(buy), '');
  check('전세 만기 알림 켠 뒤(신청 완료) 자리: 희망 지역 첫 동', /data-bcta="ta_done" data-g="\$\{esc\(\(T\.areas\[0\] \|\| \{\}\)\.g/.test(cal), '');
  check('관심 단지 ★ 직후 한 줄(watch.js → starLine)', /JDJ_BRIEFCTA\.starLine\(/.test(w) && /brief-cta\.js\?v=2/.test(w), '');
  check('광고 칸 화면도 함께 불러옴(ad-slot.js)', /assets\/brief-cta\.js\?v=2/.test(read('assets/ad-slot.js')), '');
  const st = read('assets/stat.js');
  check('jdjStat 허용: brief_cta · cta_at · act', /brief_cta:12/.test(st) && /cta_at: +v =>/.test(st) && /act: +v => \['view','click','close','sub'\]/.test(st), '');
  check('jdjStat cta_at 목록 = brief-cta 자리 목록', C.AT.every(a => st.includes("'" + a + "'")), C.AT);
  check('누름 기록 data-track 자리별(bcta_자리)', /data-track="bcta_' \+ esc\(at\)/.test(read('assets/brief-cta.js')) && /data-track="bcta_home_card"/.test(read('assets/brief-cta.js')) && /data-track="bcta_strip"/.test(read('assets/brief-cta.js')), '');
  /* 서비스 대표 문구(2026-11-26 대표 확정) */
  const TG = '집값도, 할 일도 미리 알려 드려요';
  check('대표 문구: 첫 화면 맨 위(질문 칸 첫 줄)', /<section class="qh" id="q"[^>]*>\s*<p class="tagline">집값도, 할 일도 미리 알려 드려요<\/p>/.test(H), '');
  check('대표 문구: description·og·twitter 첫머리', ['<meta name="description" content="', '<meta property="og:description" content="', '<meta name="twitter:description" content="'].every(m => H.includes(m + TG + '.')), '');
  check('대표 문구: manifest 설명 첫머리', JSON.parse(read('manifest.webmanifest')).description.indexOf(TG) === 0, '');
  const sw = read('sw.js');
  check('sw.js 미리 받기 목록에 brief-cta.js', sw.includes("'./assets/brief-cta.js?v=2'"), '');
}

console.log(`\n${ok}/${ok + bad} 통과`);
if (bad) process.exitCode = 1;
