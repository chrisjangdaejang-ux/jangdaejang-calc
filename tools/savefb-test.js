/* 저장 버튼 반응(assets/savefb.js) 확인(Playwright) — 실행: node tools/savefb-test.js </dev/null
   - 공통 도우미: '저장 중…'+누를 수 없음 → '✓ 저장했어요'(초록) 2.5초 → 원래 글자, 버튼 바로 아래 초록 안내(role=status),
     실패는 빨간 안내(role=alert)·버튼 원래대로, 휴대폰(390px)만 토스트, 화면 밖 버튼이면 그 자리로만 스크롤(맨 위로 튀지 않음)
   - 모닝 브리핑 내 구독 관리(brief/manage): [저장하기]를 아래쪽에서 눌러도 맨 위로 가지 않고 버튼 바로 아래에 '내일 아침 브리핑부터…' 가 보임, 실패도 버튼 아래 빨간 안내
   - 서버(Apps Script)·공개 자료는 가짜 응답(실제 서버에 접속하지 않음). 화면 사진: SAVEFB_SHOTS 폴더(주면 그때만 저장)
   playwright 가 없으면 건너뜀(0으로 끝남). */
const fs = require('fs'), path = require('path'), http = require('http');
let pw; try { pw = require('playwright'); } catch (e) { console.log('playwright 없음 — 건너뜀'); process.exit(0); }
const ROOT = process.env.SAVEFB_ROOT || path.join(__dirname, '..'), SHOTS = process.env.SAVEFB_SHOTS || '', TAG = process.env.SAVEFB_TAG || 'after';
const ONLY_SHOTS = process.env.SAVEFB_ONLY_SHOTS === '1';   // 예전 코드(도우미 없음)로 '전' 사진만 찍을 때
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (!u.startsWith('/jangdaejang-calc/')) { r.writeHead(404); return r.end(); }
  let p = path.join(ROOT, u.slice('/jangdaejang-calc/'.length)); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
}).listen(0, '127.0.0.1');
const B = () => `http://127.0.0.1:${srv.address().port}/jangdaejang-calc/`;

/* 가짜 공개 자료(시·군·구 목록) */
const IX = { sgg: { '11680': { name: '강남구', sido: '서울특별시' }, '11710': { name: '송파구', sido: '서울특별시' } }, sido: [{ id: '11', name: '서울특별시' }] };
const SUBS = [{ id: 'B1', product: '모닝 브리핑 1개월', label: '기본', tier: 'brief', state: '이용', active: true, start: '2026-11-10', end: '2026-12-09', left: 19, channel: 'email', contact: 'ab***@naver.com', sent: 11, refund: '', refundEst: 0, orderId: '' }];
async function mock(ctx, saveFail) {
  await ctx.route(/script\.google\.com/, async rt => {
    let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch (e) {}
    const a = b.action; let r = { ok: true };
    if (a === 'briefMine') r = { ok: true, subs: SUBS, brief: { areas: [{ g: '11680', gn: '강남구', sd: '서울특별시', dn: '' }], apts: [] }, channels: { kakao: false }, adc: { on: true, at: '2026-11-10' }, amAd: { on: false } };
    else if (a === 'userLoad') r = { ok: true, nick: '테스트', data: { homes: [], favs: [], reports: [] } };
    else if (a === 'userSave') { if (saveFail) r = { ok: false, error: '잠시 서버가 바빠요. 잠시 뒤 다시 해 주세요.' }; else r = { ok: true, data: b.data }; }
    else if (a === 'bpMine') r = { ok: true, limit: { customers: 0 }, customers: [] };
    await new Promise(z => setTimeout(z, 250));   // '저장 중…' 이 보이게 조금 늦게
    await rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r) });
  });
  await ctx.route(/jangdaejang-data\/.*index\.json/, rt => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(IX) }));
  await ctx.route(/jangdaejang-data\/(?!.*index\.json)/, rt => rt.fulfill({ status: 404, body: '' }));
  await ctx.route(u => /googletagmanager|kakaocdn|fonts\.g|clarity|t1\.kakaocdn/.test(String(u)), rt => rt.abort());
}

/* 1) 공통 도우미만 빈 화면에서 */
async function unit(br) {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 800 } });
    await pg.goto(B() + 'assets/icons/');   // 같은 주소(404 화면)
    await pg.setContent(`<!doctype html><meta charset="utf-8"><div style="height:1400px">위</div><div class="row2" style="display:flex;gap:8px"><button id="s">저장하기</button><a href="#">다른 링크</a></div><div style="height:1400px">아래</div>`);
    await pg.addScriptTag({ path: path.join(ROOT, 'assets/savefb.js') });
    const S = await pg.evaluate(() => { const b = document.getElementById('s'); JDJ_SAVEFB.busy(b); return { t: b.textContent, d: b.disabled, busy: b.getAttribute('aria-busy') }; });
    check(`${w} busy 글자`, S.t === '저장 중…', S); check(`${w} busy 누를 수 없음`, S.d === true);
    await pg.evaluate(() => { window.scrollTo(0, 0); JDJ_SAVEFB.ok('s', '저장했어요. 내일부터 바뀌어요.'); });
    await pg.waitForTimeout(700);
    const O = await pg.evaluate(() => { const b = document.getElementById('s'), m = b.parentElement.nextElementSibling, r = m.getBoundingClientRect(), t = document.querySelector('.sf-toast');
      return { t: b.textContent, d: b.disabled, ok: b.classList.contains('sf-ok'), bg: getComputedStyle(b).backgroundColor, mc: m.className, role: m.getAttribute('role'), mt: m.textContent,
        inView: r.top >= 0 && r.bottom <= innerHeight, y: scrollY, toast: !!t && !t.hidden && getComputedStyle(t).display !== 'none' }; });
    check(`${w} ok 버튼 글자`, O.t === '✓ 저장했어요', O); check(`${w} ok 초록`, O.ok && O.bg === 'rgb(14, 122, 79)', O.bg);
    check(`${w} ok 버튼 줄 바로 아래 안내`, /sf-msg sf-g/.test(O.mc) && O.role === 'status' && O.mt === '저장했어요. 내일부터 바뀌어요.', O);
    check(`${w} ok 안내가 화면 안(그 자리로만 스크롤)`, O.inView && O.y > 600, O);
    check(`${w} 토스트는 휴대폰만`, O.toast === (w <= 640), O.toast);
    await pg.waitForTimeout(2100);
    const R = await pg.evaluate(() => { const b = document.getElementById('s'); return { t: b.textContent, ok: b.classList.contains('sf-ok'), d: b.disabled }; });
    check(`${w} 2.5초 뒤 원래 글자`, R.t === '저장하기' && !R.ok && !R.d, R);
    const E = await pg.evaluate(() => { const b = document.getElementById('s'); JDJ_SAVEFB.busy(b); JDJ_SAVEFB.err(b, '저장하지 못했어요.'); const m = b.parentElement.nextElementSibling;
      return { t: b.textContent, d: b.disabled, mc: m.className, role: m.getAttribute('role'), col: getComputedStyle(m).color, n: document.querySelectorAll('.sf-msg').length }; });
    check(`${w} err 버튼 원래대로`, E.t === '저장하기' && !E.d, E); check(`${w} err 빨간 안내 role=alert`, /sf-r/.test(E.mc) && E.role === 'alert' && E.col === 'rgb(180, 35, 24)', E);
    check(`${w} 안내 칸은 하나만(다시 써도 늘지 않음)`, E.n === 1, E.n);
    /* 버튼이 다시 그려져도(id 로 다시 찾기) + next 글자 */
    const N = await pg.evaluate(() => { const r = document.querySelector('.row2'); r.innerHTML = '<button id="s">내 집으로 저장</button>'; JDJ_SAVEFB.ok('s', '', { next: '내 집 정보 고치기' }); return document.getElementById('s').textContent; });
    check(`${w} 다시 그린 버튼도 ✓`, N === '✓ 저장했어요', N);
    await pg.waitForTimeout(2600);
    check(`${w} next 글자로 바뀜`, await pg.textContent('#s') === '내 집 정보 고치기');
    await pg.close();
  }
}

/* 2) 모닝 브리핑 내 구독 관리: 아래쪽에서 [저장하기] */
async function manage(br, saveFail) {
  for (const w of [390, 1280]) {
    const ctx = await br.newContext({ viewport: { width: w, height: 800 } });
    await ctx.addInitScript(() => { localStorage.setItem('jdj_auth', JSON.stringify({ s: 'a'.repeat(64), nick: '테스트', exp: '2099-01-01' })); });
    await mock(ctx, saveFail);
    const pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', e => errs.push(String(e)));
    await pg.goto(B() + 'brief/manage/', { waitUntil: 'networkidle' });
    await pg.waitForSelector('#saveEd'); await pg.waitForTimeout(400);
    await pg.locator('#saveEd').scrollIntoViewIfNeeded();
    await pg.evaluate(() => window.scrollBy(0, Math.min(200, document.documentElement.scrollHeight)));   // 버튼이 화면 중간쯤(실제로 누르는 모습)
    const y0 = await pg.evaluate(() => scrollY);
    await pg.click('#saveEd');
    await pg.waitForTimeout(120);
    const busy = await pg.evaluate(() => { const b = document.getElementById('saveEd'); return { t: b.textContent, d: b.disabled }; });
    await pg.waitForTimeout(1300);
    const st = await pg.evaluate(() => { const b = document.getElementById('saveEd'), m = document.getElementById('edMsg'), r = m.getBoundingClientRect(), br = b.getBoundingClientRect();
      return { bt: b.textContent, mt: m.hidden ? '' : m.textContent, role: m.getAttribute('role'), cls: m.className, mIn: !m.hidden && r.top >= 0 && r.bottom <= innerHeight, bIn: br.top >= 0 && br.bottom <= innerHeight, y: scrollY }; });
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `savefb_${TAG}${saveFail ? '_err' : ''}_${w}.png`) });
    if (!ONLY_SHOTS) {
      const nm = `${w}${saveFail ? ' 실패' : ''}`;
      check(`${nm} 누르는 동안 '저장 중…'`, busy.t === '저장 중…' && busy.d, busy);
      check(`${nm} 맨 위로 튀지 않음`, st.y > 100 && Math.abs(st.y - y0) < 700, { y0, y: st.y });
      check(`${nm} 버튼과 안내가 화면 안`, st.mIn && st.bIn, st);
      if (saveFail) { check(`${nm} 빨간 안내 role=alert`, /err/.test(st.cls) && st.role === 'alert' && st.mt.length > 5, st); check(`${nm} 버튼 원래대로`, st.bt === '저장하기', st.bt); }
      else { check(`${nm} 버튼 아래 성공 안내`, st.mt === '내일 아침 브리핑부터 바뀐 지역으로 보내 드려요.' && st.role === 'status' && /ok/.test(st.cls), st); check(`${nm} 버튼 '✓ 저장했어요'`, st.bt === '✓ 저장했어요', st.bt);
        check(`${nm} 맨 위 안내도 그대로`, (await pg.locator('#main > .msg.info').first().textContent()) === '내일 아침 브리핑부터 바뀐 지역으로 보내 드려요.'); }
      check(`${nm} 화면 오류 없음`, !errs.length, errs);
    }
    await ctx.close();
  }
}

(async () => {
  const br = await pw.chromium.launch();
  try {
    if (!ONLY_SHOTS) await unit(br);
    await manage(br, false); await manage(br, true);
  } finally { await br.close(); srv.close(); }
  if (ONLY_SHOTS) { console.log('사진만 찍었어요:', SHOTS); return; }
  console.log(`savefb: 통과 ${pass} · 실패 ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
