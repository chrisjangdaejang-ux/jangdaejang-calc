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
  'map/', 'mine/', 'villa/', 'villa/zone/', 'comm/', 'jeonse/', 'jeonse/checklist/', 'brief/', 'brief/subscribe/', 'brief/manage/', 'brief/c/', 'brief/paid/',
  'my/alerts/', 'my/report/', 'my/watch/', 'track/', 'track/detail/', 'ad/', 'ad/plan/', 'agent/', 'agent/my/', 'agent/listing/', 'agent/content/',
  'agent/sheet/', 'login/', 'mine/calendar/', 'bunyang/', 'bunyang/agency/', 'bunyang/apply/', 'partner/', 'premium/', 'premium/pro/', 'quiz/', 'quiz/hall/', 'ask/', 'switch/', 'switch/rent/',
  'buy/', 'buy/report/', 'press/', 'guide/method/', 'guide/terms/', 'weekly/', 'pro/developer/', 'community/', 'dongne/', 'dongne/my/', 'dongne/terms/', 'dongne/office/', 'move/', 'move/partner/', 'move/terms/'];
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

  /* 점수 읽는 법: 뺀 항목 이유·과거 사례·표시가 서로 맞는지(계산 규칙은 tools/method-consistency-test.js, 여기서는 실제 화면 글자로 한 번 더) */
  async method(page, v) {
    if (!v.mobile) return;
    await open(page, 'guide/method/'); await sleep(2500);
    const R = await page.evaluate(() => [...document.querySelectorAll('#outBox .ex li')].map(li => ({
      name: (li.querySelector('b') || {}).innerText || '', reason: [...li.querySelectorAll(':scope > span:not(.tg):not(.xc)')].map(x => x.innerText).join(' '),
      cases: [...li.querySelectorAll('.xc')].map(x => x.innerText), tags: [...li.querySelectorAll('.tg')].map(x => x.innerText) })));
    ok(R.length > 0, '뺀 항목 목록이 보임');
    const flip = R.filter(x => /방향이 바뀌/.test(x.reason) && x.cases.some(c => /같은 방향/.test(c))).map(x => x.name);
    ok(!flip.length, '뺀 이유가 "방향이 바뀜"인데 과거 사례는 같은 방향인 항목 없음' + (flip.length ? ': ' + flip.join(', ') : ''));
    const seen = new Map(), dup = [];
    R.forEach(x => x.cases.forEach(c => { if (seen.has(c) && seen.get(c) !== x.name) dup.push(seen.get(c) + '·' + x.name); else seen.set(c, x.name); }));
    ok(!dup.length, '같은 과거 사례 문장이 두 항목에 붙지 않음' + (dup.length ? ': ' + dup.slice(0, 3).join(', ') : ''));
    const generic = R.filter(x => x.reason).map(x => x.reason.replace(x.name, '')).filter((t, i, a) => a.indexOf(t) !== i).length;
    ok(R.length < 4 || generic < R.length - 3, '뺀 이유가 모두 같은 한 문장이 아님');
    /* 집값에 영향을 준다는데 왜 안 쓰나요?(#why): 다섯 가지 이유·후보 수·표가 보이고, 표가 excluded.json 계산(T.why)과 같음 */
    const Wy = await page.evaluate(() => {
      const b = document.getElementById('why'); if (!b || b.hidden) return null;
      const rows = [...b.querySelectorAll('.wt tbody tr')].map(tr => [...tr.children].map(td => td.textContent.trim()));
      return { n: b.querySelectorAll('.wy > li').length, text: b.innerText, rows, top: b.getBoundingClientRect().top < document.getElementById('outBox').getBoundingClientRect().top,
        rec: window.JDJ_TRACK.RETRAIN, cnt: (b.querySelector('.wth + .wsum') || {}).innerText || '' };
    });
    ok(Wy && Wy.n === 5, '"집값에 영향을 준다는데 왜 안 쓰나요?" 다섯 가지 이유가 보임');
    if (Wy) {
      ok(Wy.top, '"왜 안 쓰나요?"가 뺀 항목 목록보다 위에 있음');
      ok(Wy.text.includes(`새 후보 ${Wy.rec.tried}개`) && Wy.text.includes(`새로 채택한 항목 ${Wy.rec.adopted}개`), `후보 ${Wy.rec.tried}개 · 채택 ${Wy.rec.adopted}개가 재학습 기록과 같음`);
      ok(/인구 증가/.test(Wy.text) && /향후 2년 입주 물량/.test(Wy.text), '① 구 점수에 쓰는 인구 증가·입주 물량 이름이 보임');
      ok(Wy.rows.length >= 10 && Wy.rows.every(r => r.length === 3 && /^(사용|구 점수에 사용|제외)/.test(r[1]) && r[2]), '표: 후보·결과(사용/구 점수에 사용/제외)·한 줄 이유');
      const c = (Wy.cnt.match(/사용 (\d+) · 구 점수에 사용 (\d+) · 제외 (\d+)/) || []).slice(1).map(Number), all = c.reduce((a, b) => a + b, 0);
      ok(all === Wy.rows.length, `표 위 개수 합(${all})이 표 줄 수(${Wy.rows.length})와 같음`);
      ok(!/undefined|NaN|null/.test(Wy.text) && !/\d+(\.\d+)?\s*%/.test(Wy.text), '"왜 안 쓰나요?"에 undefined·퍼센트 기준값 없음');
    }
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

  /* 전세 안전 점검 카드: 깡통전세 확률(근거 강도·과거 비슷한 계약)·HUG 가입 기준·예상 보증료·면책 문구, 보증금을 바꾸면 다시 계산 */
  async jeonseSafety(page, v) {
    await open(page, 'jeonse/'); await page.selectOption('#sido', 's03'); await sleep(2500);
    await page.fill('#q', '부평1,2차금호타운'); await sleep(1500);
    const hit = page.locator('#sres button').first();
    if (!ok(await hit.count() > 0, '전세 안전 점검: 단지 찾기 결과')) return;
    await hit.click(); await sleep(3000);
    const b59 = page.locator('#res .bands button', { hasText: '59' }).first(); if (await b59.count()) { await b59.click(); await sleep(4000); }
    const t = await txt(page, '#ksSec');
    ok(/깡통전세 확률/.test(t) && /근거 강도 (높음|보통|낮음)/.test(t) && /과거 비슷한 계약 [\d,]+건 중 [\d,]+건/.test(t), '전세 안전 점검: 깡통전세 확률·근거 강도·과거 비슷한 계약');
    ok(/HUG 전세보증 가입 가능성/.test(t) && /주택가격의 90% 이하/.test(t) && /HUG 심사로 정해져요/.test(t), '전세 안전 점검: HUG 가입 기준·면책 문구');
    await page.fill('#ksDep', '20000'); await sleep(800);
    const t2 = await txt(page, '#ksSec');
    ok(/예상 보증료 \(2년\) 약 [\d,]+원/.test(t2), '전세 안전 점검: 기준 안 보증금이면 예상 보증료');
    ok(!/NaN|undefined|Infinity/.test(t2), '전세 안전 점검: NaN·undefined 없음');
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

/* 재개발·재건축 구역 지도: 사업 종류·단계 거르기 → 구역 카드 → 단계 이력·착공 예상(맞힌 기록/참고)·이주 주변 전세·미래가치 링크
   (공개 데이터에 data/redev/zones.json 이 아직 없으면 server.js 가 tools/e2e/fallback/ 사본을 줌) */
JOURNEYS.redev = async function (page, v) {
  await open(page, 'villa/');
  ok(/구역 지도/.test(await txt(page, 'a.zmap')), '빌라 화면에서 구역 지도로 가는 칸');
  await open(page, 'villa/zone/'); await sleep(1500);
  ok(/구역 \d+곳/.test(await txt(page, '#sum')), '구역 수 요약');
  ok(await page.locator('#map .leaflet-container, #map.leaflet-container').count() > 0 || await page.locator('#map').count() > 0, '지도 칸');
  await page.locator('#fType button', { hasText: '재개발' }).first().click(); await sleep(400);
  const t1 = await txt(page, '#list');
  ok(/재개발/.test(t1) && !/NaN|undefined/.test(t1), '재개발로 거르면 재개발 구역 카드');
  await page.locator('#fType button', { hasText: '전체' }).first().click();
  await page.locator('#fStage button', { hasText: '관리처분·이주' }).click(); await sleep(400);
  ok(/지금 단계: (관리처분인가|이주)/.test(await txt(page, '#list')), '관리처분·이주로 거르면 그 단계 구역만');
  await page.locator('#fQuick button', { hasText: '맞힌 기록 있는 예상만' }).click(); await sleep(400);
  ok(/맞힌 기록 있음/.test(await txt(page, '#list')), '맞힌 기록 있는 예상만 보면 배지 보임');
  await page.locator('#fQuick button', { hasText: '이주 앞둔 구역 주변 전세' }).click(); await sleep(400);
  await page.locator('#list [data-more]').first().click(); await sleep(400);
  const det = await txt(page, '#list .det');
  ok(/단계 이력\(실제 날짜\)/.test(det) && /\d{4}년 \d{1,2}월/.test(det), '단계 이력에 실제 날짜');
  ok(/착공 예상/.test(det) && /번 중 \d+번 맞았어요/.test(det), '착공 예상 + 과거로 돌아가 맞혀 본 성적');
  ok(/이주 앞둔 구역 주변 전세/.test(det) && /이주 때문이라고 볼 근거는 아니에요/.test(det), '이주 주변 전세 + 원인 단정 없음');
  ok(/양도세/.test(det) && /취득세/.test(det), '세금 계산기 링크');
  await page.locator('#fQuick button', { hasText: '맞힌 기록 있는 예상만' }).click();
  await page.locator('#fQuick button', { hasText: '이주 앞둔 구역 주변 전세' }).click();
  await page.locator('#fStage button', { hasText: '전체' }).first().click(); await sleep(300);
  await page.locator('#fQuick button', { hasText: '착공 예상 빠른 순' }).click(); await sleep(300);
  ok(/참고/.test(await txt(page, '#list')), '검증 못 한 예상은 참고로 표시');
  await page.locator('#how summary').click(); await sleep(200);
  ok(/과거로 돌아가 맞혀 보기/.test(await txt(page, '#how')) && /번 중 \d+번 맞았어요/.test(await txt(page, '#how')), '방법 설명: 전체 맞힌 비율');
  if (process.env.REDEV_SHOT) {
    await page.locator('#how').evaluate(e => e.open = false);
    await page.evaluate(() => scrollTo(0, 0)); await sleep(800);
    await page.screenshot({ path: process.env.REDEV_SHOT.replace('{w}', v.width), fullPage: !v.mobile ? false : false });
  }
};

/* '← 이전으로' 줄(assets/back.js): 바로 들어오면 '← 홈으로', 우리 화면에서 오면 갈 곳 이름 + 뒤로 가기,
   내 집 시세 안에서 고른 건물·탭은 브라우저 기록에 한 칸씩(브라우저 뒤로 가기·단추 모두 바로 전 상태로) */
JOURNEYS.back = async function (page, v) {
  const btnTxt = async () => (await txt(page, '.jbk-btn')).trim();
  const noOverlap = async () => page.evaluate(() => {
    const b = document.querySelector('.jbk-btn'), h = document.querySelector('header.top'); if (!b || !h) return false;
    const r = b.getBoundingClientRect(), t = h.getBoundingClientRect();
    return r.top >= t.bottom - 1 && r.height >= 43.5 && r.left >= 0 && r.right <= innerWidth;
  });
  /* 1) 공유 링크·검색으로 내 집 시세에 바로 들어옴 */
  await open(page, 'mine/');
  ok(await btnTxt() === '← 홈으로', '바로 들어온 내 집 시세: ← 홈으로');
  ok(await page.locator('.jbk-btn').getAttribute('href') === L.SITE, '← 홈으로 = 홈 주소');
  ok(/홈\s*›\s*내 집 시세/.test(await txt(page, '.jbk-bc')), '위치 표시: 홈 › 내 집 시세');
  ok(await noOverlap(), '단추가 머리줄 아래·화면 안·44px 이상');
  /* 2) 홈 → 재개발·빌라 → 빌라 시세(내 집 시세 빌라 탭) */
  await open(page, '');
  await page.locator('a[href="villa/"]').first().click();
  await page.waitForURL(/\/villa\/(\?|$)/, { timeout: 15000 }); await sleep(800);
  ok(await btnTxt() === '← 홈으로' && await page.locator('.jbk-btn[data-mode="back"]').count() === 1, '재개발·빌라: 홈에서 옴 → 뒤로 가기 단추 ← 홈으로');
  ok(/홈\s*›\s*재개발·빌라/.test(await txt(page, '.jbk-bc')), '위치 표시: 홈 › 재개발·빌라');
  await page.locator('a[data-track="villa_lead_to_price"]').click();
  await page.waitForURL(/\/mine\/\?t=v/, { timeout: 15000 }); await sleep(1500);
  ok(await btnTxt() === '← 재개발·빌라로', '빌라 시세: ← 재개발·빌라로');
  ok(/내 집 시세\s*›\s*빌라 시세/.test(await txt(page, '.jbk-bc')), '위치 표시: 홈 › 내 집 시세 › 빌라 시세');
  /* 3) 양천구 → '대왕빌라' 찾기 → 건물 고르기 */
  await page.selectOption('#vlG', '11470'); await sleep(2500);
  await page.fill('#vlQ', '대왕빌라'); await sleep(1200);
  ok(/대왕빌라/.test(await txt(page, '#vlSres')), '대왕빌라 찾기 결과');
  await page.locator('#vlSres button[data-k]').first().click(); await sleep(2000);
  ok(!(await page.locator('#vlRes').isHidden()) && /대왕빌라/.test(await txt(page, '#vlRes')), '고른 빌라 시세 보임');
  ok(/[?&]vb=/.test(page.url()), '주소에 고른 건물(vb) 그대로');
  ok(await btnTxt() === '← 빌라 찾기로', '건물을 고른 뒤: ← 빌라 찾기로(같은 화면 안 바로 전 상태)');
  /* 4) 단추 → 찾기 상태 → 단추 → 재개발·빌라 */
  await page.locator('.jbk-btn').click(); await sleep(1200);
  ok(await page.locator('#vlRes').isHidden() && /\/mine\/\?t=v/.test(page.url()) && !/[?&]vb=/.test(page.url()), '단추 한 번: 같은 화면의 빌라 찾기로(결과 닫힘)');
  ok(await btnTxt() === '← 재개발·빌라로', '다시 ← 재개발·빌라로');
  if (process.env.BACK_SHOT) { await page.evaluate(() => scrollTo(0, 0)); await sleep(500); await page.screenshot({ path: process.env.BACK_SHOT.replace('{w}', v.width) }); }
  await page.locator('.jbk-btn').click();
  await page.waitForURL(/\/villa\/(\?|$)/, { timeout: 15000 }).catch(() => {}); await sleep(800);
  ok(/\/villa\/(\?|$)/.test(page.url()) && /재개발/.test(await txt(page, 'h1')), '단추 두 번: 재개발·빌라 화면으로 돌아옴');
  /* 5) 브라우저 뒤로 가기로 탭 되돌리기(아파트 ↔ 오피스텔) + 앞으로 가기로 빌라 결과 다시 */
  await page.goForward(); await sleep(2500);
  ok(/\/mine\/\?t=v/.test(page.url()), '앞으로 가기: 빌라 시세로');
  await page.locator('#mtabs [data-t="o"]').click(); await sleep(1500);
  ok(/[?&]t=o/.test(page.url()) && await btnTxt() === '← 빌라 찾기로', '오피스텔 탭으로 바꾸면 기록 한 칸(← 빌라 찾기로)');
  await page.goBack(); await sleep(1500);
  ok(/[?&]t=v/.test(page.url()) && await page.locator('#mtabs [data-t="v"].on').count() === 1 && !(await page.locator('#villaSec').isHidden()), '브라우저 뒤로 가기: 빌라 탭으로 돌아옴');
  await page.goForward(); await sleep(1500);
  ok(await page.locator('#mtabs [data-t="o"].on').count() === 1 && !(await page.locator('#offiSec').isHidden()), '앞으로 가기: 오피스텔 탭 다시');
  /* 6) 예전 공유 주소(?t=v&vg&vb) 바로 열기는 그대로 + 홈으로 */
  await open(page, 'mine/?t=v&vg=11470'); await sleep(1500);
  ok(await btnTxt() === '← 홈으로' && await page.locator('#mtabs [data-t="v"].on').count() === 1 && await page.inputValue('#vlG') === '11470', '공유 주소(?t=v&vg=)로 바로 들어옴: 빌라 탭·시군구 그대로 + ← 홈으로');
  /* 7) referrer 를 안 보내는 화면(동네 파트너)에서 우리 링크로 와도 갈 곳을 앎 */
  await open(page, 'dongne/');
  const a = page.locator('a[href*="mine/"]').first();
  if (await a.count()) { await a.click(); await page.waitForURL(/\/mine\//, { timeout: 15000 }).catch(() => {}); await sleep(1000); ok(await btnTxt() === '← 동네 파트너로', 'referrer 없는 화면에서 와도: ← 동네 파트너로'); }
  /* 8) 단지 검색용 페이지(위치 표시가 이미 있음): 단추만 하나, 위치 표시는 두 번 안 보임 */
  await open(page, 'apt/');
  ok(await page.locator('.jbk-btn').count() === 1 && await page.locator('.jbk-bc').count() === 0 && await page.locator('nav.bc').count() >= 1, '단지 검색용 페이지: 단추 + 원래 위치 표시만');
};

/* 공유(assets/share-head.js): 첫 화면 머리줄 [공유]·'집예보를 친구에게 알려 주세요' [공유하기]가 보이고, 누르면 utm_source=share 링크 복사 + '복사했어요' 알림
   + 다른 화면 머리줄에도 [공유] · 뒤로 가기·하단 탭과 겹치지 않음 · 결과가 나온 화면에서는 결과 요약 공유로 이어짐 · 개인 화면에는 없음 */
JOURNEYS.share = async function (page, v) {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  /* 휴대폰 공유창은 시험 브라우저에 없으니, 있으면 링크 복사 길로 가게 막음 */
  await page.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); } catch (e) {} });
  await open(page, '');
  const hb = page.locator('header.top .jsh-btn');
  ok(await hb.isVisible(), '첫 화면 머리줄에 [공유] 단추가 보임');
  ok(/공유/.test(await hb.innerText()), '머리줄 단추에 "공유" 글자');
  const box = await hb.boundingBox(), vw = v.width;
  ok(box && box.height >= 43.5 && box.x + box.width <= vw + 1, '머리줄 [공유]: 44px 이상 · 화면 안');
  /* 겹침: 머리줄 안의 다른 칸(로고·뒤로 가기·로그인·PC 탭)과 [공유]가 겹치지 않음 */
  const clash = await page.evaluate(() => {
    const b = document.querySelector('header.top .jsh-btn').getBoundingClientRect(), out = [];
    const hit = r => r.width && r.height && !(r.right <= b.left + 1 || r.left >= b.right - 1 || r.bottom <= b.top + 1 || r.top >= b.bottom - 1);
    document.querySelectorAll('header.top a, header.top button, .jtab a, .jbk a, .jbk-btn, [class*="back"]').forEach(el => {
      if (el.classList.contains('jsh-btn') || el.closest('.jsh-btn')) return;
      const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden') return;
      if (hit(el.getBoundingClientRect())) out.push((el.className || el.tagName) + ' ' + (el.innerText || '').trim().slice(0, 12));
    });
    return out;
  });
  ok(!clash.length, '머리줄 [공유]가 로고·뒤로 가기·로그인·탭과 겹치지 않음' + (clash.length ? ': ' + clash.join(' / ') : ''));
  const go = page.locator('#homeShare button[data-jsh="home_cta"]');
  await go.scrollIntoViewIfNeeded();
  ok(await go.isVisible() && /집예보를 친구에게 알려 주세요/.test(await txt(page, '#homeShare')), "첫 화면 '집예보를 친구에게 알려 주세요' [공유하기] 보임");
  await go.click(); await sleep(700);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  ok(/utm_source=share/.test(clip) && /utm_campaign=home/.test(clip), '[공유하기] → utm_source=share 첫 화면 링크 복사: ' + clip.slice(0, 120));
  ok(await feedbackNear(page, go, '복사했어요'), "[공유하기] → '복사했어요' 알림");
  ok(/카카오톡으로 보내기/.test(await txt(page, '#jshToast')) && /카드 이미지 저장/.test(await txt(page, '#jshToast')), '알림에 [카카오톡으로 보내기]·[카드 이미지 저장]');
  await page.locator('#jshToast button', { hasText: '카카오톡으로 보내기' }).click(); await sleep(500);
  const ks = await page.evaluate(() => window.__kakaoShare || null);
  ok(ks && ks.content && /utm_source=share/.test(ks.content.link.webUrl), '[카카오톡으로 보내기] → 카카오 공유(링크에 utm_source=share)');
  const log = await page.evaluate(() => (window.JDJ_STAT_LOG || []).filter(x => x[0] === 'share_click').map(x => x[1].place + ':' + x[1].method));
  ok(log.includes('home_cta:copy') && log.includes('home_cta:kakao'), '통계 share_click place=home_cta: ' + log.join(','));
  const card = await page.evaluate(async () => { const b = await JDJ_SHARE.cardBlob('home', JDJ_SHEAD.HOME_CARD, JDJ_SHEAD.pageLink(location)); const i = await createImageBitmap(b); return i.width + 'x' + i.height; });
  ok(card === '1080x1080', '첫 화면 소개 카드 이미지 1080×1080');
  await page.evaluate(() => scrollTo(0, 0)); await sleep(300);
  await hb.click(); await sleep(600);
  const log2 = await page.evaluate(() => (window.JDJ_STAT_LOG || []).filter(x => x[0] === 'share_click').map(x => x[1].place));
  ok(log2.includes('header'), '머리줄 [공유] → share_click place=header');
  /* 다른 화면: 머리줄 [공유] 하나씩(결과 화면 공용 아이콘과 겹쳐 두 개가 되지 않음) */
  for (const u of ['mine/', 'rank/', 'apt/11110/', 'weekly/']) {
    await open(page, u);
    const n = await page.locator('header.top .jsh-btn').count(), old = await page.locator('header.top .jshare-top').count();
    ok(n === 1 && old === 0 && await page.locator('header.top .jsh-btn').isVisible(), `${u} 머리줄 [공유] 하나만 보임`);
    const hs = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(hs <= 0, `${u} 가로 넘침 없음`);
  }
  await open(page, 'login/');
  ok(await page.locator('.jsh-btn').count() === 0, '개인 화면(login/)에는 [공유] 없음');
  /* 결과가 나온 화면: 머리줄 [공유] → 결과 요약 공유(share.js)로 */
  await open(page, 'mine/');
  await page.fill('#q', '헬리오시티'); await sleep(1500);
  await page.locator('#sres button, #sres li, #sres a').first().click(); await sleep(3000);
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator('header.top .jsh-btn').click(); await sleep(600);
  const chooser = await page.locator('.jshare-ch').count();
  if (chooser) { await page.locator('.jshare-ch .go').click(); await sleep(700); }
  const clip2 = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  ok(/utm_campaign=mine/.test(clip2) && !/[?&](bp|bd)=/.test(clip2), '결과 화면 머리줄 [공유] → 결과 요약 링크(개인값 없음): ' + clip2.replace(/\s+/g, ' ').slice(0, 120));
};

/* ---------- v55 내 부동산 달력: 로그인 → 내 집에 자가·취득일·주택 수 → 날짜(취득세 기한·재산세 예상)·출처 → 저장(단추 옆 반응·계정 저장 요청) ---------- */
const E2E_HOME = { sd: 's00', code: '11710', dong: '가락동', jibun: '913', apt: '헬리오시티', band: '84㎡대', bp: null, bd: '', t: '2026-11-20' };
async function loginAs(page, mock, data) {
  await page.addInitScript(([h]) => {
    try { localStorage.setItem('jdj_auth', JSON.stringify({ s: 'e2e0'.repeat(16), nick: '시험회원', exp: '2099-12-31' })); localStorage.setItem('jdj_myhome', JSON.stringify({ v: 1, list: [h] })); } catch (e) {}
  }, [E2E_HOME]);
  let saved = Object.assign({ homes: [E2E_HOME] }, data || {});
  mock.set('userLoad', () => ({ ok: true, nick: '시험회원', data: saved }));
  mock.set('userSave', b => { saved = b.data; return { ok: true, data: b.data }; });
}
const SHOTS = process.env.E2E_SHOT_DIR || '';
async function shot(page, name, v) { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await page.evaluate(() => scrollTo(0, 0)); await sleep(300); await page.screenshot({ path: path.join(SHOTS, `${name}_${v.width}.png`), fullPage: false }); }
JOURNEYS.calendar = async function (page, v, mock) {
  await loginAs(page, mock, {});
  await open(page, 'mine/calendar/'); await sleep(2500);
  ok(/헬리오시티/.test(await txt(page, '#homes')), '달력: 등록한 내 집(헬리오시티)이 보임');
  ok(/과세기준일|재산세/.test(await txt(page, '#evs')), '달력: 정보를 넣기 전에도 집을 가진 분 모두의 세금 날짜가 보임');
  await page.locator('#homes .seg button', { hasText: '자가' }).first().click(); await sleep(800);
  const acq = new Date(Date.now() + 9 * 3600000 - 10 * 864e5).toISOString().slice(0, 10);
  await page.locator('#homes input[data-f="acq"]').fill(acq); await page.locator('#homes input[data-f="acq"]').dispatchEvent('change'); await sleep(800);
  await page.locator('#homes button[data-n="1"]').click(); await sleep(3000);
  const evs = await txt(page, '#evs');
  ok(/취득세 신고·납부 기한/.test(evs) && /50일 남음/.test(evs), '달력: 취득일을 넣으면 취득세 기한(60일 → 진행 중 · 50일 남음)이 생김');
  ok(/종합부동산세|재산세/.test(evs) && /출처/.test(evs), '달력: 세금 날짜마다 출처 링크');
  await page.locator('#flt button', { hasText: '세금' }).click(); await sleep(500);
  ok(!/계약갱신/.test(await txt(page, '#evs')), "달력: [세금]을 누르면 계약 날짜는 숨김");
  await page.locator('#flt button', { hasText: '전체' }).click(); await sleep(500);
  const est = await page.locator('#evs .est').count();
  ok(est === 0 || /예상 재산세\(참고\)/.test(await txt(page, '#evs .est')), '달력: 예상 재산세는 "참고"로만 표시' + (est ? '' : '(공시가격 자료 없음 — 표시 안 함)'));
  ok(!/NaN|undefined|null/.test(await txt(page, 'main')), '달력: NaN·undefined 없음');
  await shot(page, 'calendar', v);
  const sv = page.locator('#calSave'); await sv.click(); await sleep(1500);
  ok(await feedbackNear(page, sv, '저장했어요'), '[이대로 저장하기] → 단추 가까이 "저장했어요"');
  const last = mock.last('userSave');
  ok(last && last.body.data && last.body.data.cal && Object.values(last.body.data.cal.h)[0].t === 'own' && !JSON.stringify(last.body.data.cal).match(/"(bp|price|amt)"/), '계정 저장 요청에 달력 칸(cal) — 금액 없이');
  ok(/알림 센터/.test(await txt(page, '#mail')), '메일로 받기: 알림 센터로 가는 길');
  await open(page, 'my/alerts/'); await sleep(1500);
  ok(/내 부동산 달력 메일/.test(await txt(page, 'main')), '알림 센터: [내 부동산 달력 메일] 켜기 칸');
};

/* ---------- v55 예측 맞히기: 첫 화면 카드 → quiz/ 문제(고른 비율·마감) → 로그인 전 안내 → 로그인 뒤 고르기 → 순위·배지·재미용 안내 ---------- */
JOURNEYS.predict = async function (page, v, mock) {
  const fb = JSON.parse(fs.readFileSync(path.join(__dirname, 'fallback', 'data', 'quiz', 'week.json'), 'utf8'));
  const later = new Date(Date.now() + 9 * 3600000 + 3 * 864e5).toISOString().slice(0, 10) + 'T23:59+09:00';
  const W = Object.assign({}, fb, { open: fb.open.map(q => Object.assign({}, q, { close: later })) });
  await page.addInitScript(() => { try { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.resolve({}); } catch (e) {} });   // 서비스 워커가 받아 가면 page.route 가 못 바꿈
  await page.route(/jangdaejang-data\/data\/quiz\/week\.json/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(W) }));
  const q0 = W.open[0];
  mock.set('quizBoard', { ok: true, v: 1, counts: { [q0.id]: { [q0.opts[0].k]: 12, [q0.opts[1].k]: 8 } }, board: { week: '2026-W48', label: '11/23~11/29 정답이 나온 문제', rows: [{ rank: 1, nick: '집 박사', pts: 25, ok: 2, n: 2 }, { rank: 2, nick: '예측러 E2E0', pts: 10, ok: 1, n: 2 }] }, n: 20 });
  await open(page, ''); await sleep(2500);
  ok(await page.locator('#pqCard').isVisible() && /이번 주 예측 맞히기/.test(await txt(page, '#pqCard')), '첫 화면: 작은 카드 "이번 주 예측 맞히기"');
  await open(page, 'quiz/'); await sleep(2500);
  ok(/카카오 간편 로그인하고 예측하기/.test(await txt(page, '#pqMe')), '로그인 전: 예측은 로그인 뒤에 남긴다는 안내·단추');
  ok(await page.locator('#pqOpen .pc').count() === W.open.length, `받는 문제 ${W.open.length}개가 보임`);
  ok(/60%/.test(await txt(page, '#pqOpen .pc')) && /40%/.test(await txt(page, '#pqOpen .pc')), '고른 사람 비율(12:8 → 60%·40%)');
  ok(/마감/.test(await txt(page, '#pqOpen .pc .kd')), '문제마다 마감 시각');
  ok(/포인트는 재미용이며 현금이나 상품으로 바꿀 수 없어요/.test(await txt(page, '#predict')), "'포인트는 재미용이며 현금이나 상품으로 바꿀 수 없어요' 문구");
  ok(/집 박사/.test(await txt(page, '#pqBoard')), '이번 주 순위(별명만)');
  ok(await page.locator('#pqDone .pc').count() >= 1 && /정답은/.test(await txt(page, '#pqDone')), '지난 결과: 정답과 근거');
  /* 로그인 뒤 */
  await loginAs(page, mock, {});
  mock.set('quizAnswer', b => ({ ok: true, answers: [{ id: b.id, k: b.k }], counts: { [b.k]: 13 } }));
  mock.set('quizMine', { ok: true, nick: '집 박사', answers: [], score: { pts: 25, n: 3, ok: 2, streak: 1, best: 2, hist: [], badges: ['first'] },
    season: { id: '2027-Q1', label: '2027년 1분기(1~3월) 시즌', n: 120, me: { n: 12, ok: 8, acc: 66.7, pts: 85, rank: 9, tier: 'field', t: '임장러' }, next: { id: 'analyst', t: '분석가', need: ['예측 18번 더'] } },
    prefs: { hide: false, hall: false, meet: false }, grants: [{ id: 'R1', season: '2026-Q4', tier: '분석가', k: 'report', n: 1, left: 1, st: '대기', t: '프리미엄 리포트 이용권 1장' }], vouchers: 0, paid: false });
  await open(page, 'quiz/'); await sleep(2500);
  ok(/내 포인트/.test(await txt(page, '#pqMe')) && /별명/.test(await txt(page, '#pqMe')), '로그인 뒤: 내 포인트·연속 적중·별명');
  const b0 = page.locator('#pqOpen .pc').first().locator('.ops button').first();
  await b0.click(); await sleep(1200);
  const la = mock.last('quizAnswer');
  ok(la && la.body.id === q0.id && la.body.k === q0.opts[0].k, '보기를 누르면 서버에 그 문제·보기로 답함');
  ok(/✓/.test(await page.locator('#pqOpen .pc').first().locator('.ops button').first().innerText()) && /다시 고를 수 있어요/.test(await txt(page, '#pqOpen .pc')), '고른 보기에 ✓ · 마감 전 다시 고를 수 있다는 안내');
  ok(await page.locator('#pqBadges .bgs span').count() === 7, '배지 7개가 보임(아직 못 받은 것은 흐리게)');
  const tb = await txt(page, '#tierBox');
  ok(/임장러/.test(tb) && /분석가/.test(tb) && /18번 더/.test(tb), '등급 칸: 지금 등급(임장러)·다음 등급까지 남은 것');
  ok(/시즌 달인께는 임장 모임 초대 소식을 보내 드려요/.test(tb), "'시즌 달인께는 임장 모임 초대 소식을 보내 드려요'");
  await page.locator('#claimBtn').click(); await sleep(800);
  ok(/유료 서비스가 열리면/.test(await txt(page, '#claimMsg')), '[보상 받기] → 유료가 열리기 전에는 보관 안내');
  await page.locator('#pfHall').check(); await sleep(800);
  ok(mock.last('quizPrefs') && mock.last('quizPrefs').body.hall === true, '[명예의 전당에 별명 올리기] → 서버에 저장');
  ok(/임장러/.test(await txt(page, '#pqMe .nk')), '별명 옆 등급 배지');
  ok(!/NaN|undefined/.test(await txt(page, 'main')), '예측 화면: NaN·undefined 없음');
  await shot(page, 'quiz', v);
};

/* ---------- v55 전세 만기 알림(세입자): 첫 화면·전월세 화면 [전세 만기 알림 받기] → 달력에서 전세·만기 → 알림 켜기(희망 지역 기본값) → 보증금(기기에만)·매수 비교 ---------- */
JOURNEYS.tenant = async function (page, v, mock) {
  await open(page, ''); await sleep(1500);
  ok(await page.locator('#taCard').isVisible() && /전세 만기 알림 받기/.test(await txt(page, '#taCard')), "첫 화면: '전세 만기 알림 받기' 카드가 보임");
  await open(page, 'jeonse/'); await sleep(1500);
  ok(await page.locator('a.tacta').isVisible(), "전월세 화면: '전세 만기 알림 받기'가 보임");
  const ce = new Date(Date.now() + 9 * 3600000 + 170 * 864e5).toISOString().slice(0, 10);
  await loginAs(page, mock, { cal: { h: { '11710|가락동|913|헬리오시티|84㎡대': { t: 'jeonse', cs: '2025-05-20', ce } }, n: null, t: '', ms: 1 } });
  await page.locator('a.tacta').click(); await page.waitForURL(/mine\/calendar\//, { timeout: 15000 }).catch(() => {}); await sleep(3000);
  ok(/전세 만기 알림/.test(await txt(page, '#homes')), '달력: 전세 집 카드에 [전세 만기 알림]');
  await page.locator('#homes [data-ta-on]').check(); await sleep(3500);
  const hm = await txt(page, '#homes');
  ok(/희망 지역 \(3\/3\)/.test(hm) && /가락동/.test(hm), '알림을 켜면 희망 지역 기본값: 지금 동 + 가까운 동 2곳');
  ok(await page.locator('#ta').isVisible() && /① 전세 보증금이 내린 곳/.test(await txt(page, '#ta')) && /② 갱신 협상 정보/.test(await txt(page, '#ta')), '만기 준비: ① 내린 곳 · ② 갱신 협상 정보');
  await page.locator('#homes [data-ta-dep]').fill('100000'); await page.locator('#homes [data-ta-dep]').dispatchEvent('change'); await sleep(2500);
  ok(/지금 내 보증금으로 갈 수 있는 단지 \d+곳/.test(await txt(page, '#ta')), "보증금을 넣으면 '지금 내 보증금으로 갈 수 있는 단지 ○곳'");
  await page.locator('#homes [data-ta-buy]').check(); await sleep(1500);
  await page.locator('#homes [data-ta-cash]').fill('30000'); await page.locator('#homes [data-ta-cash]').dispatchEvent('change'); await sleep(500);
  await page.locator('#homes [data-ta-inc]').fill('9000'); await page.locator('#homes [data-ta-inc]').dispatchEvent('change'); await sleep(4000);
  const ta = await txt(page, '#ta');
  ok(/③ 매수로 바꾸면\(참고\)/.test(ta) && (/살 수 있는 단지 \d+곳/.test(ta) || /살 수 있는 단지가 없어요/.test(ta)), '매수도 생각해요 → ③ 매수 전환 비교(참고)');
  ok(!/NaN|undefined|Infinity/.test(ta), '만기 준비: NaN·undefined 없음');
  await page.waitForTimeout(2200);
  const sv = mock.calls.filter(c => c.action === 'userSave').map(c => JSON.stringify(c.body.data || {}));
  ok(sv.length && sv.every(x => !/100000|30000|9000/.test(x)) && sv.some(x => /"ta":\{"on":true/.test(x)), '계정 저장에는 만기 알림 설정만 — 보증금·현금·소득은 보내지 않음');
  const reqs = mock.calls.map(c => JSON.stringify(c.body));
  ok(!reqs.some(x => /"dep"|"cash"|"inc"/.test(x)), '서버 요청 어디에도 보증금·현금·소득 칸 없음');
  ok(!/[?&](dep|cash|inc)=/.test(page.url()), '주소에도 금액 없음');
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.locator('#ta').scrollIntoViewIfNeeded(); await page.evaluate(() => { const t = document.getElementById('ta'); scrollTo(0, t.getBoundingClientRect().top + scrollY - 70); }); await sleep(400); await page.screenshot({ path: path.join(SHOTS, `tenant_alert_${v.width}.png`) }); }
};

/* ---------- 전세 갈아타기: 전월세 → [전세 갈아타기] → 결과(더 나은 집·더 싼 집·매수 전환) ---------- */
JOURNEYS.tswitch = async function (page, v, mock) {
  const ce = new Date(Date.now() + 9 * 3600000 + 170 * 864e5).toISOString().slice(0, 10);
  await page.addInitScript(([h, ce]) => { try {
    localStorage.setItem('jdj_myhome', JSON.stringify({ v: 1, list: [h] }));
    localStorage.setItem('jdj_cal', JSON.stringify({ h: { '11710|가락동|913|헬리오시티|84㎡대': { t: 'jeonse', cs: '2025-05-20', ce, ta: { on: true, areas: [{ g: '11710', d: '가락동' }, { g: '11710', d: '문정동' }, { g: '11710', d: '송파동' }], work: { g: '11680', d: '역삼동' }, ty: 'a', band: '84㎡대' } } }, n: null, t: '', ms: 1 }));
  } catch (e) {} }, [E2E_HOME, ce]);
  await open(page, 'switch/'); await sleep(800);
  ok(await page.locator('nav.swtabs a[aria-current]').innerText().then(t => /자가/.test(t)).catch(() => false), "갈아타기: '자가' 탭이 지금 화면");
  ok(await page.locator('nav.swtabs a[href="rent/"]').isVisible(), "갈아타기: '전월세' 탭이 보임");
  await open(page, 'jeonse/'); await sleep(800);
  const cta = page.locator('#tswCta');
  ok(await cta.isVisible() && /전세 갈아타기/.test(await cta.innerText()), "전월세 첫 화면: '전세 갈아타기' 단추가 보임");
  const cb = await cta.boundingBox(), tb = await page.locator('a.tacta').boundingBox();
  ok(cb && tb && cb.y < tb.y, "'전세 갈아타기' 단추가 '전세 만기 알림 받기'보다 위(먼저 보임)");
  await cta.click(); await page.waitForURL(/switch\/rent\//, { timeout: 15000 }).catch(() => {}); await sleep(3000);
  ok(/switch\/rent\//.test(page.url()), '[전세 갈아타기] → 전세 갈아타기 화면');
  ok(/전월세/.test(await txt(page, 'nav.swtabs a[aria-current]')), "전세 갈아타기: '전월세' 탭이 지금 화면");
  ok(/헬리오시티/.test(await txt(page, '#homeNow')), '저장한 전세 집(헬리오시티)을 지금 집으로 골라 둠');
  ok(await page.locator('#taIn').isVisible(), '전세 만기 알림의 희망 지역·출퇴근지·집 형태·평형을 불러왔다는 안내');
  ok(/송파구 가락동/.test(await txt(page, '#areas')) && /문정동/.test(await txt(page, '#areas')), '희망 지역 칩 = 알림 설정(가락동·문정동·송파동)');
  await page.locator('#goBtn').click(); await sleep(600);
  ok(await feedbackNear(page, page.locator('#goBtn'), '보증금을 넣어'), '보증금 없이 누르면 단추 가까이 "보증금을 넣어 주세요"');
  ok(!(await page.locator('#cash2').isVisible()), "기본 칸만 보이고 나머지는 '조건 더 넣기' 안에 접혀 있음");
  await page.fill('#dep', '120000');
  await page.locator('#moreCond > summary').click(); await sleep(300);
  await page.fill('#cash2', '3000'); await page.locator('#useLoan').check(); await page.fill('#jl', '2000'); await page.fill('#mv', '300'); await page.fill('#rentMax', '150');
  await page.locator('[data-pol="youth"]').check(); await sleep(200);
  ok(/주택도시기금/.test(await txt(page, '#loanNote')) && /추정하지 않아요/.test(await txt(page, '#loanNote')), '청년 체크 → 정책 전세대출 안내(공식 링크·추정 안 함)');
  await page.locator('#cmode [data-c="transit"]').click(); await page.selectOption('#hh', 'mid'); await page.locator('#park').check(); await page.locator('#pet').check();
  ok(/2027|20\d\d-/.test(await page.locator('#moveAt').inputValue()), '이사 희망 시기 = 전세 만기일로 미리 넣음');
  await page.locator('#goBtn').click(); await sleep(9000);
  let r = await txt(page, '#res');
  ok(/내 예산 12억 5,000만 원/.test(r), '예산 = 보증금 + 현금 + 전세대출(12억 5,000만 원)');
  ok(/예산 근처 더 나은 집 \d+곳/.test(r) && /지금 단지 최근 전세/.test(r), '결과: 예산 근처 더 나은 집 수 · 지금 단지 최근 전세');
  ok(/보증금만으로 찾아요/.test(r) && await page.locator('#costSeg [data-cost="dep"][aria-pressed="true"]').count() === 1, "예산 계산 기본 = '보증금만으로 찾기', 내 예산 칸에 한 줄 표시");
  const near = await page.locator('#res .cand').evaluateAll(cs => cs.filter(c => !/반전세로 가능해요/.test(c.innerText)).map(c => (c.querySelector('.pr b') || {}).innerText || ''));
  ok(near.map(won).every(v => v != null && v >= 125000 * 0.85 - 1 && v <= 125000) && /예산 근처\(10억 6,250만 원 이상/.test(r), "더 나은 집(전세)은 예산의 85~100%인 곳만 · 기준 금액 안내");
  ok(!(await page.locator('#res .cand h3').allInnerTexts()).some(t => /^건영1/.test(t)), "6억짜리(건영1)처럼 예산보다 많이 싼 곳은 '더 나은 집'에 안 나옴");
  await page.locator('#costSeg [data-cost="all"]').click(); await sleep(400);
  ok(/중개보수·이사비를 뺀 금액으로 찾아요/.test(await txt(page, '#res')), "'이사 비용까지 포함해서 찾기' → 내 예산 칸 문구가 바뀜");
  await page.locator('#costSeg [data-cost="dep"]').click(); await sleep(300);
  ok(/중개보수\(상한\) [\d억만 ,원]+/.test(r) && /이사비 300만 원/.test(r) && /(이사에 새로 드는 돈|이사하고 남는 돈)/.test(r), '카드마다 이사에 드는 돈(보증금 차액·중개보수·이사비)');
  ok(/주차 대수 자료가 아직 없어/.test(r) && /반려동물 허용 여부는 공개 자료가 없어요/.test(r), '주차·반려동물: 자료 없음 안내(걸러 내는 척하지 않음)');
  ok(/대중교통: 역 거리 두 배/.test(r) && /자녀 중·고: 학군 두 배/.test(r), '통근수단·가구 형태에 맞춘 무게 안내');
  ok(await page.locator('#res .cand').count() > 0, '더 나은 집 카드가 하나 이상');
  ok(/나아지는 점 \d가지/.test(r) && /최근 \d+개월 신규 계약 \d+건/.test(r), '카드: 나아지는 점 수 · 실제로 쓴 기간·계약 건수');
  ok(/출퇴근지까지 직선/.test(r) && /걸어서 약 \d+분\(어림\)/.test(r), '카드: 출퇴근 직선 거리 · 역까지 걷는 시간(어림) 표시');
  ok(/HUG 전세보증\(추정\)/.test(r) && /깡통전세 확률/.test(r) && /참고/.test(r), '카드: HUG 기준(추정) · 깡통전세 확률(참고)');
  ok(/국토교통부 전월세 실거래 최근 \d+개월 신규 전세 \d+건 중간값/.test(r) && /중개보수: 공인중개사법 시행규칙/.test(r), '카드마다 출처 줄(중개보수 요율 포함)');
  ok(!/NaN|undefined|Infinity/.test(r), '결과에 NaN·undefined 없음');
  /* 보증보험 가입 가능한 곳만 */
  await page.locator('#safeOnly').check(); await page.locator('#goBtn').click(); await sleep(8000);
  ok(await page.locator('#res .cand').evaluateAll(cs => cs.every(c => /HUG 보증 기준 안이에요/.test(c.innerText))), "'보증보험 가입 가능한 곳만' → HUG 기준 안인 곳만");
  await page.locator('#safeOnly').uncheck(); await page.locator('#goBtn').click(); await sleep(8000);
  /* 걸러 보기 */
  const n0 = await page.locator('#res .cand').count();
  await page.locator('#res [data-n="safe"]').click(); await sleep(500);
  r = await txt(page, '#res');
  ok(await page.locator('#res [data-n="safe"][aria-pressed="true"]').count() === 1, "걸러 보기 '안전 점검 통과' 단추가 눌림 상태");
  ok((await page.locator('#res .cand').count()) === 0 ? /고른 점이 모두 나아진 곳이 없어요/.test(r) : (await page.locator('#res .cand').evaluateAll(cs => cs.every(c => /HUG 보증 기준 안이에요/.test(c.innerText)))), '걸러 보기: 안전 점검 통과한 곳만');
  await page.locator('#res [data-n="safe"]').click(); await sleep(400);
  ok((await page.locator('#res .cand').count()) === n0, '걸러 보기를 끄면 다시 모두');
  /* 더 싼 집 */
  await page.locator('#rtabs [data-t="cheap"]').click(); await sleep(500);
  r = await txt(page, '#res');
  ok(/덜 들어요/.test(r) || /조건에 맞는 더 싼 곳이 없어요/.test(r), "더 싼 집: '○○ 덜 들어요' 또는 없음 안내");
  /* 출퇴근지 가까운 곳 */
  await page.locator('#mode [data-m="work"]').click(); await page.locator('#goBtn').click(); await sleep(10000);
  ok(/출퇴근지\(강남구 역삼동\) 가까운 동 12곳/.test(await txt(page, '#res')), '찾을 곳: 출퇴근지 가까운 동 12곳');
  /* 2년 뒤 전망: 시험 불합격이면 숫자 대신 이유 */
  const fc = await txt(page, '#fcSec');
  ok(/2년 뒤 전세가 전망/.test(fc) && /참고/.test(fc) && (/전망 숫자는 보여 드리지 않아요/.test(fc) || /통과/.test(fc)), '2년 뒤 전망: 과거 시험 결과와 함께 참고로만');
  /* 매수 전환 */
  await page.fill('#cash', '30000'); await page.fill('#inc', '9000'); await page.locator('#buyBtn').click(); await sleep(6000);
  const by = await txt(page, '#buyRes');
  ok(/살 수 있는 단지 [\d,]+곳/.test(by) || /살 수 있는 단지가 없어요/.test(by), "매수 전환: '이 보증금 + 대출이면 살 수 있는 단지'");
  /* 개인 금액은 기기에만 */
  const reqs = mock.calls.map(c => JSON.stringify(c.body));
  ok(!reqs.some(x => /\b(120000|125000|30000|9000|150)\b/.test(x) || /"(dep|cash|jl|rentMax|mv)"/.test(x)), '서버 요청 어디에도 보증금·대출·현금·소득·월세 감당액 없음');
  ok(!/[?&](dep|jl|cash|inc|rent|mv)=/.test(page.url()), '주소에도 금액 없음');
  const stored = await page.evaluate(() => localStorage.getItem('jdj_ta_me') || '');
  ok(/120000/.test(stored), '보증금은 이 기기(전세 만기 알림과 같은 칸)에 저장');
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.locator('#mode [data-m="areas"]').click(); await page.locator('#goBtn').click(); await sleep(9000); await page.locator('#rtabs [data-t="better"]').click(); await sleep(400);
    await page.evaluate(() => { const t = document.getElementById('res'); scrollTo(0, t.getBoundingClientRect().top + scrollY - 70); }); await sleep(400); await page.screenshot({ path: path.join(SHOTS, `tenant_switch_${v.width}.png`) }); }
};

/* ---------- v55 명예의 전당 ---------- */
JOURNEYS.hall = async function (page, v, mock) {
  await open(page, 'quiz/hall/'); await sleep(1500);
  const t = await txt(page, 'main');
  ok(/전체 기간 포인트 상위/.test(t) && /2026년 4분기/.test(t) && /집 박사/.test(t) && /부동산 달인/.test(t), '명예의 전당: 전체 기간·시즌별 위 10명(별명·등급·정확도·참여)');
  ok(/켠 분만, 별명으로만/.test(t), '명예의 전당: 켠 분만·별명만 안내');
  mock.set('quizHall', { ok: true, seasons: [], all: [] }); await page.reload(); await sleep(1500);
  ok(/아직 명예의 전당에 오른 분이 없어요/.test(await txt(page, 'main')), '아직 없으면 빈 안내');
};

/* v57 이사 견적 받기(숨김) — 여정은 tools/e2e/move-journey.js */
JOURNEYS.move = require('./move-journey')({ open, txt, ok: (c, m) => ok(c, m), feedbackNear, sleep, fs, path, loginAs, SHOTS: () => SHOTS });

/* ---------- 첫 화면 '이사 갈 집 구하기' → [집이 있어요]·[전월세 살아요] 펼침(assets/switch-pick.js) ---------- */
JOURNEYS.swpick = async function (page, v) {
  await open(page, '');
  const a = page.locator('a[data-track="home_to_switch"]');
  await a.focus(); await page.keyboard.press('Enter'); await sleep(300);
  const st = await page.evaluate(() => { const a = document.querySelector('a[data-track="home_to_switch"]'), b = document.getElementById('swPick');
    const hs = b ? [...b.querySelectorAll('a[data-pick]')].map(x => x.getBoundingClientRect().height) : [];
    const last = document.querySelector('nav.menu>a:last-of-type').getBoundingClientRect().width;
    return { path: location.pathname, exp: a.getAttribute('aria-expanded'), pick: document.activeElement.dataset.pick, hs, full: !!b && Math.abs(b.getBoundingClientRect().width - last) < 2, over: document.documentElement.scrollWidth > innerWidth }; });
  ok(/\/$/.test(st.path) && st.exp === 'true' && st.pick === 'own', '이사 갈 집 칸: Enter 로 두 단추 펼침·첫 단추로 포커스(이동 안 함)');
  ok(st.hs.length === 2 && st.hs.every(h => h >= 44), '펼친 두 단추 높이 44px 이상');
  ok(st.full && !st.over, '펼친 칸이 한 줄 전체·마지막 메뉴 칸도 한 줄 전체(격자 안 깨짐)');
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.evaluate(() => document.getElementById('swPick').scrollIntoView({ block: 'center' })); await sleep(300); await page.screenshot({ path: path.join(SHOTS, `home_switch_pick_${v.width}.png`) }); }
  await page.keyboard.press('Escape'); await sleep(100);
  ok(await page.evaluate(() => document.activeElement.dataset.track === 'home_to_switch' && document.activeElement.getAttribute('aria-expanded') === 'false'), 'Escape 로 접고 칸으로 포커스');
  await a.focus(); await page.keyboard.press(' '); await sleep(200);
  await Promise.all([page.waitForNavigation(), page.locator('#swPick a[data-pick="rent"]').click()]);
  ok(/\/switch\/rent\/$/.test(new URL(page.url()).pathname), '[전월세 살아요] → 전월세 갈아타기 화면');
  await open(page, '');
  await Promise.all([page.waitForNavigation(), page.locator('a[data-track="home_to_switch"]').click()]);
  ok(/\/switch\/rent\/$/.test(new URL(page.url()).pathname), '고른 값 기억 → 다음부터 칸을 누르면 바로 전월세 화면');
  ok(/자가/.test(await txt(page, '.swtabs')), '이동한 화면에 자가 | 전월세 탭 그대로');
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
