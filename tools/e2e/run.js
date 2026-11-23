/* 화면 점검(E2E) — 사람이 실제로 누르는 순서대로 모든 화면을 휴대폰(390×844)·PC(1280×800) 두 크기로 확인
   실행: node tools/e2e/run.js </dev/null            (전부)
         node tools/e2e/run.js --only=mine,login </dev/null   (이름에 들어간 것만)
   - 서버(Apps Script)는 가짜 응답(tools/e2e/lib.js makeMock), 시세·점수는 실제 공개 데이터(jangdaejang-data)
   - 결과: 화면에 한 줄씩 + tools/e2e/out/result.json(실패 목록·한 줄 요약). 실패가 있으면 종료 코드 1
   - 확인 항목: docs/qa_checklist.md  ·  새 기능을 만들면 이 파일 JOURNEYS 에 여정 하나를 꼭 더해요 */
'use strict';
const fs = require('fs'), path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/npm-tools/node_modules/playwright')); }
const L = require('./lib');
const { start } = require('./server');

const PORT = +(process.env.E2E_PORT || 8791);
const BASE = `http://127.0.0.1:${PORT}${L.SITE}`;
const ONLY = ((process.argv.find(a => a.startsWith('--only=')) || '').slice(7)).split(',').filter(Boolean);
const OUT = path.join(__dirname, 'out');
const VIEWS = [{ name: '휴대폰', width: 390, height: 844, mobile: true }, { name: 'PC', width: 1280, height: 800, mobile: false }];

/* ---------- 1) 화면 한 장씩: 처음 열었을 때 ---------- */
const PAGES = ['', 'about/', 'terms/', 'privacy/', 'refund/', 'rank/', 'loan/', 'tax/', 'tax/transfer/', 'chungyak/', 'chungyak/price/',
  'map/', 'mine/', 'villa/', 'comm/', 'jeonse/', 'jeonse/checklist/', 'brief/', 'brief/subscribe/', 'brief/manage/', 'brief/c/', 'brief/paid/',
  'my/alerts/', 'my/report/', 'my/watch/', 'track/', 'track/detail/', 'ad/', 'ad/plan/', 'agent/', 'agent/my/', 'agent/listing/', 'agent/content/',
  'agent/sheet/', 'login/', 'bunyang/', 'bunyang/agency/', 'bunyang/apply/', 'partner/', 'premium/', 'premium/pro/', 'quiz/', 'ask/', 'switch/',
  'buy/', 'buy/report/', 'press/', 'guide/method/', 'guide/terms/', 'weekly/', 'pro/developer/', 'community/', 'dongne/', 'dongne/my/', 'dongne/terms/', 'dongne/office/'];
/* 법률 문서(약관·개인정보·환불)는 ~습니다 문장이 정상 */
const LEGAL = /^(terms|privacy|refund|guide\/terms)\//;
/* 문장 속 용어 풀이 단추(jp-tip)·지도 핀(mpin)·지도 저작권 표시는 글자 링크와 같게 봄 */
const SMALL_OK = /^button\.(jp-tip|mpin)|leaflet/;

/* ---------- 도우미 ---------- */
const fails = [], passes = [];
let cur = '';
function ok(cond, msg) { if (cond) passes.push(cur + ' ' + msg); else fails.push(cur + ' — ' + msg); return !!cond; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function newCtx(browser, v, mock) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.mobile, hasTouch: v.mobile, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  await L.blockOutside(ctx); await mock.install(ctx);
  return ctx;
}
async function open(page, url) {
  await page.goto(BASE + url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await sleep(600);
}
const txt = async (page, sel) => (await page.locator(sel).first().innerText({ timeout: 5000 }).catch(() => '')).replace(/\s+/g, ' ');
/* 누른 단추 가까이(위아래 260px 안) 또는 떠 있는 알림(토스트)에 글이 보이는지 */
async function feedbackNear(page, btn, re) {
  const b = await btn.boundingBox(); if (!b) return false;
  return page.evaluate(({ b, src }) => {
    const re = new RegExp(src);
    for (const el of document.querySelectorAll('body *')) {
      if (el.children.length > 3) continue;
      const t = (el.innerText || '').trim(); if (!t || !re.test(t)) continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none') continue;
      if (s.position === 'fixed' && r.top >= 0 && r.bottom <= innerHeight) return true;          // 토스트
      if (Math.abs(r.top - b.y) < 260 || Math.abs(r.bottom - (b.y + b.height)) < 260) return true;
    }
    return false;
  }, { b, src: re.source });
}
const won = s => { const m = String(s).match(/(\d+)억(?:\s*([\d,]+)만)?/); return m ? +m[1] * 10000 + (m[2] ? +m[2].replace(/,/g, '') : 0) : null; };

async function auditPage(page, url, v, errs) {
  const r = await L.inspect(page, { allowText: LEGAL.test(url) ? '습니다|십시오' : '' });
  const tag = `[${v.name}] ${url || '(첫 화면)'}`;
  cur = tag;
  ok(!errs.length, '콘솔·스크립트 오류 없음' + (errs.length ? ': ' + [...new Set(errs)].slice(0, 3).join(' / ') : ''));
  if (v.mobile) ok(r.hscroll <= 1, `가로로 밀리지 않음(넘친 폭 ${r.hscroll}px)`);
  ok(!r.overflow.length, '화면 밖으로 삐져나온 칸 없음' + (r.overflow.length ? ': ' + r.overflow.slice(0, 3).join(' / ') : ''));
  const small = r.small.filter(s => !SMALL_OK.test(s));
  ok(!small.length, '누르는 칸 44px 이상' + (small.length ? ': ' + small.slice(0, 4).join(' / ') : ''));
  ok(!r.cut.length, '말줄임 없이 잘린 글자 없음' + (r.cut.length ? ': ' + r.cut.slice(0, 3).join(' / ') : ''));
  ok(!r.text.length, '보이면 안 되는 문구 없음' + (r.text.length ? ': ' + r.text.slice(0, 3).join(' / ') : ''));
  ok(!r.rival.length, '다른 부동산 앱·회사 이름 없음' + (r.rival.length ? ': ' + r.rival.slice(0, 3).join(' / ') : ''));
  const bl = await L.brokenLinks(page);
  ok(!bl.length, '깨진 링크 없음' + (bl.length ? ': ' + bl.slice(0, 4).join(' ') : ''));
}

/* ---------- 2) 여정: 사람이 누르는 순서 ---------- */
const JOURNEYS = {
  /* 첫 화면 '단지 이름으로 물어보기': 없는 이름·한 단지·두 단지 비교 */
  async ask(page, v) {
    await open(page, '');
    const q = page.locator('#jaskQ'), go = page.locator('button:has-text("물어보기")').first();
    await q.fill('ㅇ'); await go.click(); await sleep(500);
    ok(await feedbackNear(page, go, '두 글자 이상'), '한 글자만 넣으면 단추 가까이 "두 글자 이상" 안내');
    await q.fill('zzzz없는단지'); await go.click(); await sleep(5000);
    ok(await feedbackNear(page, go, '찾지 못했어요'), '없는 단지는 단추 가까이 "찾지 못했어요" + 예시');
    await q.fill('잠실엘스 헬리오시티 비교'); await go.click();
    await page.waitForURL(/\/ask\//, { timeout: 20000 }).catch(() => {}); await sleep(2500);
    const t = await txt(page, 'main');
    ok(/잠실엘스/.test(t) && /헬리오시티/.test(t), '두 단지 비교 화면으로 감');
    ok(!/NaN|undefined/.test(t), '비교 숫자에 NaN·undefined 없음');
  },

  /* 내 집 시세: 이름으로 찾기 → 시세 → 내 집으로 저장(단추 옆 반응) → 매수가 단위 안내 → 다시 열어도 남아 있음 */
  async mine(page, v) {
    await open(page, 'mine/');
    await page.fill('#q', '헬리오시티'); await sleep(1500);
    ok(/헬리오시티/.test(await txt(page, '#sres')), '단지 이름 찾기 결과에 헬리오시티');
    await page.locator('#sres button, #sres li, #sres a').first().click(); await sleep(3000);
    const res = await txt(page, '#res');
    ok(/최근 시세/.test(res) && /\d+억/.test(res), '단지 시세(억 단위) 보임');
    await page.fill('#bp', '15'); await sleep(300);
    ok(/만원 단위로/.test(await txt(page, '#bpHint')), '매수가에 15처럼 작은 수를 넣으면 "만원 단위로" 다시 알려 줌');
    await page.fill('#bp', '150000'); await sleep(200);
    ok(/15억/.test(await txt(page, '#bpHint')), '매수가 150,000 → "15억" 으로 읽어 줌');
    const save = page.locator('#saveBtn'); await save.click(); await sleep(1200);
    ok(await feedbackNear(page, save, '저장'), '[내 집으로 저장] 누르면 단추 가까이 저장 안내');
    await page.reload(); await sleep(3500);
    ok(/헬리오시티/.test(await txt(page, '#homesSec')), '다시 열어도 내 집 목록에 남아 있음');
    ok(/15억/.test(await txt(page, '#homesSec')), '내 집 목록에 매수가 15억');
  },

  /* 빌라·오피스텔·상가 탭: 시·도 → 시·군·구 → 동 → 건물 순서로 고르면 시세가 나옴 */
  async tabs(page, v) {
    await open(page, 'mine/');
    for (const [t, sec] of [['빌라', '#villaSec'], ['오피스텔', '#offiSec'], ['상가·건물', '#commSec']]) {
      await page.locator('#mtabs button', { hasText: t }).click(); await sleep(1500);
      for (let i = 0; i < 4; i++) for (const s of await page.$$(sec + ' select')) {
        const [val, n, en] = await s.evaluate(x => [x.value, x.options.length, !x.disabled]);
        if (!val && n > 1 && en) { await s.selectOption({ index: 1 }); await sleep(1500); }
      }
      await sleep(2000);
      const t2 = await txt(page, sec);
      ok(/만원|억/.test(t2), `${t} 탭: 끝까지 고르면 시세(만원·억)가 나옴`);
      ok(!/NaN|undefined/.test(t2), `${t} 탭: NaN·undefined 없음`);
    }
  },

  /* 지도: 단지 이름 찾기 → 카드 → 닫기, 없는 이름 안내 */
  async map(page, v) {
    await open(page, 'map/'); await sleep(1500);
    await page.fill('#q', '헬리오시티'); await sleep(1500);
    await page.locator('#sres button, #sres li, #sres a').first().click(); await sleep(3000);
    const card = await txt(page, '#sheet');
    ok(/헬리오시티/.test(card) && /최근 시세/.test(card), '지도 카드에 단지 이름·최근 시세');
    const x = page.locator('#sheet button[aria-label*="닫"]').first();
    ok(await x.count() > 0, '지도 카드에 닫기(×) 단추');
    if (await x.count()) { await x.click(); await sleep(800); ok(!(await page.locator('#sheet').isVisible()) || !/헬리오시티/.test(await txt(page, '#sheet')), '닫기를 누르면 카드가 닫힘'); }
    await page.fill('#q', '없는단지zz'); await sleep(1500);
    ok(/찾지 못했어요/.test(await txt(page, '#sres')), '없는 이름은 "찾지 못했어요" + 다음에 할 일 안내');
  },

  /* 같은 단지 숫자가 화면마다 같은지: 지도 카드 ↔ 내 집 시세 (헬리오시티 84㎡대 최근 시세) */
  async consistency(page, v) {
    if (!v.mobile) return;
    await open(page, 'map/'); await page.fill('#q', '헬리오시티'); await sleep(1500);
    await page.locator('#sres button, #sres li, #sres a').first().click(); await sleep(3000);
    const a = won((await txt(page, '#sheet')).split('최근 시세')[1] || '');
    await open(page, 'mine/'); await page.fill('#q', '헬리오시티'); await sleep(1500);
    await page.locator('#sres button, #sres li, #sres a').first().click(); await sleep(3000);
    const b84 = page.locator('#res button', { hasText: '84' }).first(); if (await b84.count()) { await b84.click(); await sleep(1500); }
    const b = won((await txt(page, '#res')).split('최근 시세')[1] || '');
    ok(a && b && a === b, `헬리오시티 84㎡대 최근 시세가 지도(${a}만)와 내 집 시세(${b}만)에서 같음`);
  },

  /* 순위: 탭·기간 단추를 누르면 목록이 바뀜 */
  async rank(page, v) {
    await open(page, 'rank/');
    const before = await txt(page, 'main');
    await page.locator('main button', { hasText: '미래가치 순위' }).first().click(); await sleep(1500);
    const after = await txt(page, 'main');
    ok(before !== after && !/NaN|undefined/.test(after), '[미래가치 순위]를 누르면 목록이 바뀜');
  },

  /* 계산기: 빈칸이면 할 일을 알려 주고, 채우면 숫자가 나옴 */
  async calculators(page, v) {
    await open(page, 'loan/');
    ok(/넣으면 바로 계산해요/.test(await txt(page, 'main')), '대출: 빈칸이면 무엇을 넣을지 안내');
    ok(!/을\(를\)|은\(는\)/.test(await txt(page, 'main')), '대출: "을(를)" 같은 조사 표기 없음');
    await page.selectOption('select >> nth=0', { index: 1 }).catch(() => {}); await sleep(500);
    for (const t of ['8억', '생애최초', '7천', '4.5%']) { await page.locator('button', { hasText: t }).first().click().catch(() => {}); await sleep(300); }
    await sleep(800);
    const t = await txt(page, 'main');
    ok(!/NaN|undefined|Infinity/.test(t), '대출: 계산 결과에 NaN·Infinity 없음');
    await open(page, 'tax/transfer/');
    const b = page.locator('button', { hasText: '네 가지 방법 비교하기' }); await b.click(); await sleep(600);
    ok(await feedbackNear(page, b, '넣어 주세요'), '증여·양도 비교: 빈칸으로 누르면 단추 가까이 안내');
    await open(page, 'chungyak/');
    const n = page.locator('button', { hasText: '다음' }).first(); await n.click(); await sleep(500);
    ok(await feedbackNear(page, n, '골라 주세요'), '청약 가점: 고르지 않고 [다음]을 누르면 단추 가까이 안내');
  },

  /* 전월세: 집 종류를 고르면 찾기 칸이 맞게 바뀜, 체크리스트 체크가 유지 */
  async jeonse(page, v) {
    await open(page, 'jeonse/');
    await page.locator('button', { hasText: '빌라' }).first().click(); await sleep(800);
    ok(!/NaN|undefined/.test(await txt(page, 'main')), '전월세: 빌라 탭에 NaN·undefined 없음');
    await open(page, 'jeonse/checklist/');
    const cb = page.locator('input[type=checkbox]').first();
    if (await cb.count()) { await cb.check({ force: true }); await page.reload(); await sleep(800); ok(await page.locator('input[type=checkbox]').first().isChecked(), '체크리스트: 다시 열어도 체크가 남아 있음'); }
  },

  /* 카카오 로그인(가짜 서버) → 구독 관리·알림 센터·구독 신청, 서버 오류·연결 끊김 때 쉬운 한글 안내 */
  async login(page, v, mock) {
    const td = Date.now(), d = n => new Date(td + n * 864e5).toISOString().slice(0, 10);
    const sub = { id: 'B1', product: '모닝 브리핑 7일 무료 체험', state: '체험', active: true, start: d(-1), end: d(5), left: 6, channel: 'email', contact: 'a***@mail.kr', ad: false, sent: 1, refund: '', refundEst: 0, areas: 3, apts: 3, adm: false, customers: 0, pro: false, orderId: '', reward: false, tier: 'trial', label: '무료 체험', next: '', nextLabel: '', broker: null };
    mock.set('briefMine', { ok: true, subs: [sub], brief: { areas: [{ g: '11710', gn: '송파구', sd: '서울특별시', dn: '' }], apts: ['헬리오시티'], v: '', cy: { score: null, nohome: null }, urg: null, budget: '', age: '' }, channels: { email: true, kakao: false, webpush: false }, adm: false, admLim: null, trialUsed: true, next: '', amAd: false, adc: false });
    await open(page, 'login/');
    await page.locator('button:has-text("카카오 간편 로그인")').first().click(); await sleep(600);
    const st = await page.evaluate(() => (window.__kakaoAuthorize || {}).state);
    ok(!!st, '[카카오 간편 로그인]을 누르면 카카오 로그인으로 넘어감');
    await open(page, 'login/?code=E2E&state=' + st); await sleep(2500);
    ok(!!mock.last('kakaoLogin'), '돌아오면 서버에 로그인 확인 요청');
    ok(await page.evaluate(() => !!localStorage.getItem('jdj_auth')), '로그인 상태가 이 기기에 저장됨');
    await open(page, 'brief/manage/'); await sleep(1500);
    const m = await txt(page, 'main');
    ok(/내 구독 관리/.test(m) && /송파구/.test(m), '구독 관리: 받는 지역(송파구)이 보임');
    const sv = page.locator('main button', { hasText: '저장하기' }).first();
    if (await sv.count()) { await sv.click(); await sleep(1500); ok(await feedbackNear(page, sv, '저장'), '구독 관리 [저장하기]: 단추 가까이 반응'); }
    mock.set('briefMine', { ok: false, err: 'auth' }); await page.reload(); await sleep(2000);
    let t = await txt(page, 'main');
    ok(/[가-힣]/.test(t) && !/\bauth\b/.test(t), '서버가 영어 코드(auth)를 줘도 한글 안내로 보임');
    mock.set('briefMine', { __abort: 1 }); await page.reload(); await sleep(2000);
    t = await txt(page, 'main');
    ok(/연결|잠시 뒤|다시/.test(t) && !/Failed to fetch|TypeError/.test(t), '인터넷이 끊겨도 한글 안내(영어 오류 없음)');
    mock.reset();
    await open(page, 'my/alerts/'); await sleep(1500);
    ok(/메일 알림 신청|메일로 받기/.test(await txt(page, 'main')), '알림 센터: 로그인하면 메일 알림 신청 칸');
    await open(page, 'brief/subscribe/'); await sleep(1500);
    const s = await txt(page, 'main');
    const iFree = s.indexOf('무료'), iPaid = s.search(/\d{1,3},\d{3}원/);
    ok(iFree >= 0 && (iPaid < 0 || iFree < iPaid), '구독 신청: 무료 체험이 유료 요금보다 먼저 보임');
  },

  /* 알림 센터(로그인 전): 지역 없이 [지역 넣기] → 안내 */
  async alerts(page, v) {
    await open(page, 'my/alerts/');
    const b = page.locator('button', { hasText: '지역 넣기' }).first();
    if (await b.count()) { await b.click(); await sleep(500); ok(await feedbackNear(page, b, '골라 주세요'), '알림 센터: 시·도 없이 [지역 넣기] → 단추 가까이 안내'); }
    await open(page, 'my/report/');
    ok(/내 집 등록하기/.test(await txt(page, 'main')), '성적표: 집이 없을 때 다음에 할 일(내 집 등록하기) 안내');
    await open(page, 'my/watch/');
    ok(/관심 단지가 없어요/.test(await txt(page, 'main')), '관심 목록: 비었을 때 안내');
  },

  /* 광고 문의·중개사 제휴·파트너: 빈칸으로 보내면 단추 가까이 안내, 보내면 접수 안내 */
  async forms(page, v, mock) {
    await open(page, 'ad/');
    const send = page.locator('button', { hasText: '문의 보내기' }).first(); await send.click(); await sleep(600);
    ok(await feedbackNear(page, send, '입력해 주세요'), '광고 문의: 빈칸이면 [문의 보내기] 가까이 안내');
    ok(!/을\(를\)/.test(await txt(page, 'main')), '광고 문의: "을(를)" 표기 없음');
    const memo = page.locator('textarea:visible').last();
    if (await memo.count()) { await memo.fill('입력 유지 확인'); await send.click(); await sleep(600); ok(await memo.inputValue() === '입력 유지 확인', '광고 문의: 오류가 나도 적어 둔 내용이 지워지지 않음'); }
    await open(page, 'agent/');
    const ap = page.locator('button', { hasText: '제휴 신청하기' }).first(); await ap.click(); await sleep(600);
    ok(await feedbackNear(page, ap, '주세요'), '중개사 제휴: 빈칸이면 [제휴 신청하기] 가까이 안내');
    await open(page, 'partner/');
    const ps = page.locator('button', { hasText: '신청 보내기' }).first(); await ps.click(); await sleep(600);
    ok(await feedbackNear(page, ps, '주세요'), '파트너: 빈칸이면 [신청 보내기] 가까이 안내');
  }
};

/* 동네 파트너(숨김 기능): 꺼져 있으면 준비 중 · 운영자 미리 보기에서 신청(빈칸 안내)·내 화면 글쓰기(주제 안내)·브리핑 칸·운영자 검토 */
JOURNEYS.dongne = async function (page, v, mock) {
  await open(page, 'dongne/');
  ok(/준비 중이에요/.test(await txt(page, 'main')), '동네 파트너: 꺼져 있으면 준비 중');
  const FX = require('./dongne-fixtures');
  FX.install(mock); await page.context().addInitScript(FX.PREVIEW_INIT);
  mock.set('dpMine', { ok: true, me: null, cfg: FX.cfg });
  await open(page, 'dongne/?preview=dongne'); await sleep(1200);
  ok(/운영자 미리 보기/.test(await txt(page, 'main')) && /월 9,900원에 우리 동네 구독자 홍보 \+ 중개사 플러스 도구 전부/.test(await txt(page, 'main')) && /까지 가입하면 중개사 플러스 포함/.test(await txt(page, 'main')), '미리 보기: 소개·요금·플러스 포함 마감일');
  const go = page.locator('#go'); await go.click(); await sleep(500);
  ok(await feedbackNear(page, go, '적어 주세요'), '신청: 빈칸이면 [파트너 신청하기] 가까이 안내');
  mock.set('dpMine', FX.mine);
  await open(page, 'dongne/my/?preview=dongne'); await sleep(1200);
  ok(/최근 30일 성과/.test(await txt(page, 'main')) && /초대 링크/.test(await txt(page, 'main')) && /중개사 플러스 포함/.test(await txt(page, 'main')) && /자리 받기/.test(await txt(page, 'main')), '내 파트너 화면: 성과·초대 링크·플러스 포함·48시간 자리 받기');
  const wg = page.locator('#wgo'); await wg.click(); await sleep(500);
  ok(await feedbackNear(page, wg, '주제를'), '글쓰기: 주제 없이 [올리기]면 가까이 안내');
  const bp = await page.context().newPage();   /* 웹 브리핑은 주간 자료(wk/*.json)가 없는 날 404 가 정상이라 따로 연 화면에서 확인 */
  await open(bp, 'brief/?d=11680-' + encodeURIComponent('개포동') + '&k=abcdef0123&preview=dongne'); await sleep(2500);
  ok(/우리 동네 중개사 한마디/.test(await txt(bp, '[data-dp-brief]')) && /등록번호/.test(await txt(bp, '[data-dp-brief]')), '웹 브리핑: 맨 아래 제휴 칸 + 법정 표시');
  ok(/이 동네 중개사/.test(await txt(bp, '[data-dp-brief]')) && /사무소 보기/.test(await txt(bp, '[data-dp-brief]')), '웹 브리핑: 일반 등록 \'이 동네 중개사\' 목록 + 사무소 보기');
  await bp.close();
  await open(page, 'dongne/office/?id=D000000044&preview=dongne'); await sleep(1000);
  const rv = page.locator('#rv'); ok(!/02-555-0144/.test(await txt(page, 'main')), '사무소 보기: 처음에는 전화번호 숨김');
  await rv.click(); await sleep(600); ok(/02-555-0144/.test(await txt(page, 'main')), '사무소 보기: [전화번호 보기]를 누르면 보임');
  await open(page, 'dongne/admin/'); await sleep(1200);
  ok(/검토 대기 신청/.test(await txt(page, 'main')) && /중대 위반 박탈/.test(await txt(page, 'main')), '운영자 검토: 신청·제재 버튼');
};

/* ---------- 실행 ---------- */
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await start(PORT);
  const browser = await chromium.launch();
  const t0 = Date.now();
  try {
    for (const v of VIEWS) {
      const mock = L.makeMock();
      if (!ONLY.length || ONLY.includes('pages')) {
        const ctx = await newCtx(browser, v, mock);
        for (const url of PAGES) {
          const page = await ctx.newPage(), errs = L.watch(page);
          try { await open(page, url); await auditPage(page, url, v, errs); }
          catch (e) { cur = `[${v.name}] ${url}`; ok(false, '화면 열기 실패: ' + String(e.message).split('\n')[0]); }
          await page.close();
        }
        await ctx.close();
      }
      for (const [name, fn] of Object.entries(JOURNEYS)) {
        if (ONLY.length && !ONLY.includes(name)) continue;
        mock.reset();
        const ctx = await newCtx(browser, v, mock), page = await ctx.newPage(), errs = L.watch(page);
        cur = `[${v.name}] 여정 ${name}`;
        try { await fn(page, v, mock); }
        catch (e) { ok(false, '여정이 중간에 멈춤: ' + String(e.message).split('\n')[0].slice(0, 200)); await page.screenshot({ path: path.join(OUT, `${name}-${v.width}.png`) }).catch(() => {}); }
        cur = `[${v.name}] 여정 ${name}`;
        ok(!errs.length, '여정 중 콘솔·스크립트 오류 없음' + (errs.length ? ': ' + [...new Set(errs)].slice(0, 3).join(' / ') : ''));
        await ctx.close();
      }
    }
  } finally { await browser.close(); srv.close(); }
  const sec = Math.round((Date.now() - t0) / 1000);
  const summary = fails.length ? `화면 점검 ${passes.length + fails.length}개 중 ${fails.length}개 문제` : `화면 점검 ${passes.length}개 모두 통과`;
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ at: new Date().toISOString(), ok: !fails.length, pass: passes.length, fail: fails.length, seconds: sec, summary, fails }, null, 1));
  for (const f of fails) console.log('FAIL ' + f);
  console.log(`${summary} (${sec}초)`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
