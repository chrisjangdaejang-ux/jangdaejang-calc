/* 머리줄 '공유' 단추 검증: node tools/share-head-test.js
   - 공유 링크: 대표 주소 + 공개 값만 + utm_source=share(첫 화면 utm_campaign=home, 나머지 page) · 개인 금융값·# 뒤 값·모르는 값은 버림
   - 개인 화면(로그인·내 정보·결제·구독 관리·운영자·초안)에는 단추를 만들지 않음
   - 모든 화면에 붙는 길: track.js 가 share-head.js 를 붙임 · 첫 화면은 직접 불러오고 '집예보를 친구에게 알려 주세요' 칸
   - 결과 화면 공용 모듈(share.js)과 하나로: 머리줄 단추가 있으면 share.js 는 상단 아이콘을 따로 만들지 않고 headerRun 으로 결과 요약 공유
   - 통계 허용 목록(place=header·home_cta, method=kakao·link, tool=home·page) · 서비스 워커 캐시 · 첫 화면 카드 그림 요약에 숫자 없음
   - 화면 문구: ~요 말투 · 경쟁 서비스 이름 없음 · 친구 초대 혜택 문구가 서버·브리핑 화면과 같은 조건(이용권 결제 → 두 분 모두 1개월) */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const H = require('../assets/share-head.js');
const SH = require('../assets/share.js');
let ok = 0, bad = 0;
function check(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) ok++; else { bad++; console.log('실패:', name, '\n  결과', g, '\n  기대', w); }
}
const loc = (p, q) => ({ pathname: p, search: q || '' });

/* 1) 공유 링크 */
const home = new URL(H.pageLink(loc('/jangdaejang-calc/', '?ext=1&utm_source=yt')));
check('첫 화면 링크 경로', home.origin + home.pathname, 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/');
check('첫 화면 utm', [home.searchParams.get('utm_source'), home.searchParams.get('utm_medium'), home.searchParams.get('utm_campaign')], ['share', 'user_share', 'home']);
check('첫 화면: 모르는 값(ext)·다른 utm 버림', [home.searchParams.has('ext'), [...home.searchParams.keys()].filter(k => /^utm_/.test(k)).length], [false, 3]);
check('index.html 도 첫 화면', new URL(H.pageLink(loc('/jangdaejang-calc/index.html'))).searchParams.get('utm_campaign'), 'home');
const mine = new URL(H.pageLink(loc('/jangdaejang-calc/mine/', '?d=11710|헬리오시티&sd=서울&bp=150000&bd=2020-01&i=7000&c=1&n=홍길동&e=5&s=abc&token=zz')));
check('내 집 시세: 공개 값(d·sd)만 남김', [...mine.searchParams.keys()].sort(), ['d', 'sd', 'utm_campaign', 'utm_medium', 'utm_source']);
check('내 집 시세: utm_campaign=page', mine.searchParams.get('utm_campaign'), 'page');
const rep = new URL(H.pageLink(loc('/jangdaejang-calc/buy/report/', '?sd=서울&d=1200&i=7000&c=40000')));
check('맞춤 리포트: d(대출)·i·c 버림', [...rep.searchParams.keys()].filter(k => !/^utm_/.test(k)), ['sd']);
check('# 뒤 값은 싣지 않음', /#/.test(H.pageLink(Object.assign(loc('/jangdaejang-calc/tax/'), { hash: '#jv=abc' }))), false);
check('너무 긴 값은 버림', new URL(H.pageLink(loc('/jangdaejang-calc/rank/', '?g=' + 'x'.repeat(200)))).searchParams.has('g'), false);
check('새 도메인(맨 앞 /)도 같은 경로', new URL(H.pageLink(loc('/jangdaejang-calc/apt/11110/'), { base: 'https://zipcode.works/' })).pathname, '/apt/11110/');

/* 2) 개인 화면 */
const priv = ['login/', 'my/watch/', 'my/report/', 'premium/checkout/', 'premium/success/', 'premium/view/', 'premium/r/', 'brief/manage/', 'brief/paid/', 'brief/c/', 'brief/subscribe/', 'agent/my/', 'agent/sheet/', 'dongne/admin/', 'dongne/my/', 'community/admin/', 'sell/draft/', 'land/draft/', 'jeonse/safety/draft/'];
check('개인 화면에는 단추 없음', priv.filter(p => !H.isPrivate('/jangdaejang-calc/' + p)), []);
const pub = ['', 'mine/', 'rank/', 'map/', 'buy/', 'buy/report/', 'brief/', 'premium/', 'agent/', 'dongne/office/', 'apt/11110/', 'weekly/2026-34/', 'tax/', 'about/'];
check('공개 화면에는 단추 있음', pub.filter(p => H.isPrivate('/jangdaejang-calc/' + p)), []);

/* 3) 모든 화면에 붙는 길 */
const trk = rd('assets/track.js');
check('track.js 가 share-head.js 를 붙임(한 번만)', /share-head\.js\?v=\d+/.test(trk) && /JDJ_SHEAD \|\| document\.querySelector\('script\[src\*="share-head\.js"\]'\)/.test(trk), true);
check('track.js: 붙이는 코드는 GA 를 켜는 코드와 따로(실패해도 통계에 영향 없음)', trk.lastIndexOf('share-head.js') > trk.indexOf("gtag('js'"), true);
const idx = rd('index.html');
check('첫 화면: share.js·share-head.js 불러옴', /assets\/share\.js\?v=\d+/.test(idx) && /assets\/share-head\.js\?v=\d+/.test(idx), true);
check("첫 화면: '집예보를 친구에게 알려 주세요' + [공유하기](place=home_cta)", /<h2 id="hshareT">집예보를 친구에게 알려 주세요<\/h2>/.test(idx) && /data-jsh="home_cta"[^>]*>[\s\S]{0,400}?공유하기<\/button>/.test(idx), true);
const sec = (idx.match(/<section class="hshare"[\s\S]*?<\/section>/) || [''])[0];
check('첫 화면 칸 문구: ~요 말투(습니다 없음)', /습니다/.test(sec.replace(/<[^>]+>/g, '')), false);

/* 4) 친구 초대 혜택: 서버·브리핑 화면과 같은 조건 */
const bc = rd('assets/brief-core.js'), gs = rd('tools/agent-backend.gs'), bm = rd('brief/manage/index.html');
check('보상 1개월(brief-core REF.months)', /REF: \{ months: 1,/.test(bc), true);
check('서버: 초대받은 사람이 유료 결제하면 두 사람 모두 1개월', /두 사람 모두 1개월/.test(gs), true);
check('첫 화면 혜택 문구 = 이용권 결제 조건', /초대 링크로 온 친구가 이용권을 결제하면 두 분 모두 1개월 무료예요/.test(sec), true);
check('첫 화면 혜택 문구: 구독만으로 무료라고 하지 않음', /구독하면/.test(sec), false);
check('혜택 링크 = 브리핑 관리의 친구 초대 칸(#inv)', /href="brief\/manage\/#inv"/.test(sec) && /id="inv"/.test(bm), true);
check('혜택 줄은 유료 이용권이 열린 뒤에만(PAID_OPEN)', /id="hshareRef" hidden/.test(sec) && /S\.PAID_OPEN\) document\.getElementById\('hshareRef'\)\.hidden = false/.test(idx), true);

/* 5) share.js 와 하나로 */
const shs = rd('assets/share.js');
check('share.js: 머리줄 단추가 있으면 상단 아이콘 따로 안 만듦', /if \(root\.JDJ_SHEAD \|\| h\.querySelector\('\.jsh-btn'\)\) return null;/.test(shs), true);
check('share.js: headerRun 공개', typeof SH.headerRun, 'function');
check('share.js: 결과 없으면 headerRun=false(지금 화면 공유로)', SH.headerRun(null), false);
check('share.js: header 위치 통계', /PLACES = \['top', 'mid', 'bottom', 'header'\]/.test(shs), true);

/* 6) 첫 화면 카드 그림: 개인 숫자 없음 */
const hc = H.HOME_CARD, safe = SH.safeSummary(hc);
check('카드 요약: 금액·점수 없음(안전장치를 거쳐도 그대로)', [safe.head, safe.lines.length], [hc.head.replace(/\s+/g, ' ').trim(), 3]);
check('카드 요약: 숫자 없음', /\d/.test(hc.head + hc.lines.join('')), false);
check('카드 요약: 서비스 문구(집값의 내일)', /내 집값의 내일을/.test(hc.head), true);

/* 7) 통계·캐시 */
const stat = rd('assets/stat.js');
check('통계: place header·home_cta', /'header','home_cta'/.test(stat), true);
check('통계: method kakao·link', /'link','kakao'/.test(stat), true);
check('통계: tool home·page', /'home','page'/.test(stat), true);
const hs = rd('assets/share-head.js');
check("share-head: share_click 통계(place·method·tool)", /jdjStat\('share_click', p\)/.test(hs), true);
const sw = rd('sw.js'), hv = (idx.match(/share-head\.js\?v=(\d+)/) || [])[1], tv = (trk.match(/share-head\.js\?v=(\d+)/) || [])[1];
check('서비스 워커·첫 화면·track.js 같은 버전', [sw.includes(`./assets/share-head.js?v=${hv}'`), hv === tv], [true, true]);
check('카카오 공유: 키가 있을 때만(config.js KAKAO_JS_KEY), SDK 는 누를 때', /function kakaoKey\(\)/.test(hs) && /if \(!kakaoKey\(\)\) return null;/.test(hs) && !/<script[^>]+kakao_js_sdk/.test(idx), true);
check('카카오 SDK 무결성 확인(SRI)이 로그인과 같음', (hs.match(/sha384-[\w/+]+/) || [])[0], (rd('assets/auth.js').match(/sha384-[\w/+]+/) || [])[0]);

/* 8) 화면 문구 */
const ko = (hs.match(/'[^']*[가-힣][^']*'/g) || []).join(' ');
check('share-head 문구: ~습니다 없음', /습니다/.test(ko.replace(/풉니다/g, '')), false);
check("share-head: '복사했어요' 알림", /링크를 복사했어요/.test(hs), true);
const RIVAL = /호갱|리치고|직방|다방(?!면)|밸류맵|디스코|땅집고|네이버\s?부동산|KB\s?부동산/;
check('경쟁 서비스 이름 없음', RIVAL.test(hs + sec), false);

console.log(`머리줄 공유 검증: ${ok}/${ok + bad} 통과`);
if (bad) process.exit(1);
