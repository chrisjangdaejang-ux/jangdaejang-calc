/* 살아보니 화면 배치 확인(Playwright) — 실행: CM_DATA_DIR=<jangdaejang-data gh-pages 폴더> node tools/community-layout.js </dev/null
   - 꺼짐(기본): 내 집 시세(아파트·오피스텔·빌라·상가)에 살아보니 칸이 없고, community/ 는 '준비 중', 약관 초안은 숨김
   - 운영자 미리 보기: 네 종류 모두 칸이 생기고 휴대폰(390px)·PC(1280px)에서 가로로 넘치지 않음, 별점 단추가 한 줄
   - 서버(Apps Script)는 가짜 응답으로 바꿔 끼움(실제 서버에 접속하지 않음). 화면 사진: CM_SHOTS 폴더(기본 /tmp/community_shots)
   playwright 나 자료 폴더가 없으면 건너뜀(0으로 끝남). */
const fs = require('fs'), path = require('path'), http = require('http');
let pw; try { pw = require('playwright'); } catch (e) { console.log('playwright 없음 — 건너뜀'); process.exit(0); }
const ROOT = path.join(__dirname, '..'), DATA = process.env.CM_DATA_DIR || '', SHOTS = process.env.CM_SHOTS || '/tmp/community_shots';
if (!DATA || !fs.existsSync(path.join(DATA, 'data', 'index.json'))) { console.log('CM_DATA_DIR(공개 자료 폴더) 없음 — 건너뜀'); process.exit(0); }
fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.gz': 'application/gzip' };
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]), base = null;
  if (u.startsWith('/jangdaejang-calc/')) base = [ROOT, u.slice('/jangdaejang-calc/'.length)];
  else if (u.startsWith('/jangdaejang-data/')) base = [DATA, u.slice('/jangdaejang-data/'.length)];
  if (!base) { r.writeHead(404); return r.end(); }
  let p = path.join(base[0], base[1]); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
}).listen(0, '127.0.0.1');
const PORT = () => srv.address().port, B = () => `http://127.0.0.1:${PORT()}/jangdaejang-calc/`;

/* 가짜 서버 응답 */
const RV = (id, who, v, r, x, mine) => ({ id, at: '2026-11-2' + (id.charCodeAt(9) % 9), who, v, k: 'r', r, x, n: '', mine: !!mine });
function place(pid, many) {
  const reviews = many ? [
    RV('M00000000A', '이웃 3F2A', true, { tr: 5, no: 3, pk: 2, sc: 4, mg: 4 }, '역까지 걸어서 7분이라 출퇴근이 편해요. 밤에는 큰길 차 소리가 조금 들려요.'),
    RV('M00000000B', '이웃 A1C9', false, { tr: 4, no: 4, pk: 3, sc: 5, mg: 4 }, '학원가가 가까워서 아이 키우기 좋아요'),
    RV('M00000000C', '이웃 77DE', false, { tr: 4, no: 2, pk: 1, sc: 4, mg: 3 }, '주차는 저녁 8시 넘으면 자리 찾기 힘들어요', true),
    RV('M00000000D', '이웃 0B4F', true, { tr: 5, no: 4, pk: 3, sc: 4, mg: 5 }, '관리사무소가 민원 처리를 빨리 해 줘요')] : [];
  const avg = {}; ['tr', 'no', 'pk', 'sc', 'mg'].forEach(k => { avg[k] = reviews.length ? reviews.reduce((s, x) => s + x.r[k], 0) / reviews.length : null; });
  return { ok: true, open: true, preview: true, n: reviews.length, avg, reviews, board: false, boardMin: 5, posts: [],
    near: many ? [] : [Object.assign(RV('M00000000E', '이웃 C2D8', false, { tr: 5, no: 4, pk: 4, sc: 3, mg: 4 }, '같은 동네라 버스 노선이 많아서 편해요'), { n: '개포자이르네' })],
    me: { alias: '이웃 77DE', v: false, vWait: false, review: many ? reviews[2] : null, held: [] } };
}
async function mockApi(page) {
  await page.route(/script\.google\.com/, async rt => {
    let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch (e) {}
    let j = { ok: false, err: 'unknown' };
    if (b.action === 'cmPlace') j = place(b.pid, /^a\|/.test(b.pid));
    if (b.action === 'list') j = { ok: true, agents: [] };
    if (b.action === 'cmAdminQueue') {
      const it = (id, st, x, why, reps) => Object.assign(RV(id, '이웃 9A0' + id.slice(-1), false, { tr: 3, no: 2, pk: 3, sc: 3, mg: 2 }, x), { pid: 'a|11680|개포동|1283|개포자이르네', n: '개포자이르네', st, why, reps, days: 2 });
      j = { ok: true, cfg: { ready: true, open: false, reportHide: 3 }, hold: [it('M00000001A', '검토대기', '관리비가 지난달보다 많이 올랐는데 이유를 모르겠어요', 'watch', [])],
        tmp: [it('M00000001B', '임시조치', '경비 아저씨가 너무 불친절해요 바꿔야 해요', '신고 3건 — 임시조치 2026-11-22', ['욕설·비방', '욕설·비방', '사실이 아닌 내용'])],
        rep: [it('M00000001C', '공개', '주차장이 좁아서 사고가 잦아요', '', ['사실이 아닌 내용'])],
        verify: [{ id: 'V00000001A', at: '2026-11-22', pid: 'a|11680|개포동|1283|개포자이르네', n: '개포자이르네', img: 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'assets/icons/icon-192.png')).toString('base64') }] };
    }
    await rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(j) });
  });
  await page.route(/googletagmanager|google-analytics|clarity|kakaocdn|dapi\.kakao|tile\.openstreetmap|vworld|fonts\.(googleapis|gstatic)/, rt => rt.abort());
}
const TYPES = [
  ['apt', 'mine/?sd=s00&d=11680|개포동|1283|개포자이르네&b=49㎡대'],
  ['offi', 'mine/?t=o&og=11680&ob=' + encodeURIComponent('개포동|13-3')],
  ['villa', 'mine/?t=v&vg=11680&vb=' + encodeURIComponent('개포동|1265-3|꿈꾸지오')],
  ['comm', 'mine/?t=c&cg=11680&ck=c&cb=' + encodeURIComponent('개포동|14-1')]
];
const overflow = page => page.evaluate(() => {
  const W = document.documentElement.clientWidth, bad = [];
  document.querySelectorAll('.cm-box, .cm-box *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) bad.push((el.className || el.tagName) + ':' + Math.round(r.right)); });
  return { doc: document.documentElement.scrollWidth > W + 1, bad: bad.slice(0, 5) };
});

(async () => {
  const br = await pw.chromium.launch();
  for (const [vw, tag] of [[390, '390'], [1280, '1280']]) {
    /* 꺼짐 */
    let ctx = await br.newContext({ viewport: { width: vw, height: 900 }, serviceWorkers: 'block' });
    let pg = await ctx.newPage(); await mockApi(pg);
    for (const [k, u] of TYPES) {
      await pg.goto(B() + u + (u.includes('?') ? '&' : '?') + 'preview=community', { waitUntil: 'networkidle' }).catch(() => {});
      await pg.waitForTimeout(600);
      check(`꺼짐 ${tag} ${k}: 살아보니 칸 없음(주소에 preview 를 붙여도)`, (await pg.$$('.cm-box')).length === 0 && !(await pg.content()).includes('살아보니'));
    }
    await pg.goto(B() + 'community/?p=' + encodeURIComponent('a|11680|개포동|1283|개포자이르네'), { waitUntil: 'networkidle' });
    check(`꺼짐 ${tag}: community/ 는 준비 중`, /준비 중이에요/.test(await pg.textContent('main')));
    if (tag === '390') await pg.screenshot({ path: path.join(SHOTS, 'community_off_390.png') });
    await pg.goto(B() + 'terms/', { waitUntil: 'domcontentloaded' });
    check(`꺼짐 ${tag}: 약관 초안 숨김`, await pg.$eval('#community', el => el.hidden && el.offsetHeight === 0));
    await ctx.close();

    /* 운영자 미리 보기 */
    ctx = await br.newContext({ viewport: { width: vw, height: 900 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { localStorage.setItem('jdj_cm_preview', '1'); localStorage.setItem('jdj_cm_admin', 'a'.repeat(64)); localStorage.setItem('jdj_auth', JSON.stringify({ s: 'b'.repeat(64), nick: '테스트', exp: '2099-01-01' })); } catch (e) {} });
    pg = await ctx.newPage(); await mockApi(pg);
    for (const [k, u] of TYPES) {
      await pg.goto(B() + u + '&preview=community', { waitUntil: 'networkidle' }).catch(() => {});
      const box = await pg.waitForSelector('.cm-box .cm-acts', { timeout: 15000 }).catch(() => null);
      check(`미리 보기 ${tag} ${k}: 살아보니 칸이 보임`, !!box);
      if (!box) { await pg.screenshot({ path: path.join(SHOTS, `community_${k}_${tag}_missing.png`), fullPage: true }); continue; }
      const el = await pg.$('.cm-box');
      await el.scrollIntoViewIfNeeded();
      if (k === 'apt') { await pg.click('.cm-box [data-cm-open="r"]'); await pg.waitForTimeout(200); await pg.click('.cm-box [data-cm-rep]'); await pg.waitForTimeout(200); }
      const o = await overflow(pg);
      check(`미리 보기 ${tag} ${k}: 가로로 넘치지 않음`, !o.doc && !o.bad.length, o);
      if (k === 'apt') {
        const rows = await pg.$$eval('.cm-rate', rs => rs.map(r => { const a = r.querySelectorAll('.cm-rst button'); return a.length === 5 && Math.abs(a[0].getBoundingClientRect().top - a[4].getBoundingClientRect().top) < 2 && r.getBoundingClientRect().height < 60; }));
        check(`미리 보기 ${tag}: 별점 다섯 개가 한 줄`, rows.length === 5 && rows.every(Boolean), rows);
      }
      await pg.addStyleTag({ content: 'header.top,.jtab,.jtab *{visibility:hidden!important}' });   // 붙어 있는 머리줄·탭이 사진을 가리지 않게
      await (await pg.$('.cm-box')).screenshot({ path: path.join(SHOTS, `community_${k}_${tag}.png`) });
    }
    await pg.goto(B() + 'community/?p=' + encodeURIComponent('a|11680|개포동|1283|개포자이르네') + '&n=' + encodeURIComponent('개포자이르네') + '&preview=community', { waitUntil: 'networkidle' });
    await pg.waitForSelector('.cm-box .cm-acts', { timeout: 15000 }).catch(() => null);
    const o = await overflow(pg);
    check(`미리 보기 ${tag}: community/ 전체 보기 넘치지 않음`, !o.doc && !o.bad.length, o);
    await pg.screenshot({ path: path.join(SHOTS, `community_page_${tag}.png`), fullPage: true });
    await pg.goto(B() + 'community/admin/', { waitUntil: 'networkidle' });
    await pg.waitForSelector('.card .it', { timeout: 15000 }).catch(() => null);
    const oa = await pg.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    check(`운영자 검토 화면 ${tag}: 넘치지 않음·목록 보임`, !oa && (await pg.$$('.card .it')).length === 4);
    await pg.screenshot({ path: path.join(SHOTS, `community_admin_${tag}.png`), fullPage: true });
    await pg.goto(B() + 'terms/?preview=community', { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(300);
    check(`미리 보기 ${tag}: 약관 초안 보임`, await pg.$eval('#community', el => !el.hidden));
    await pg.$eval('#community', el => { el.scrollIntoView(); window.scrollBy(0, -90); });
    await pg.screenshot({ path: path.join(SHOTS, `community_terms_${tag}.png`) });
    await ctx.close();
  }
  await br.close(); srv.close();
  console.log(`살아보니 화면 배치: ${pass}개 통과${fail ? `, ${fail}개 실패` : ''} · 사진 ${SHOTS}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log(e); srv.close(); process.exit(1); });
