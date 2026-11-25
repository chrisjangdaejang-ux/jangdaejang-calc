/* 화면 점검(E2E) 여정 move — 이사 견적 받기(숨김 기능): 꺼져 있으면 준비 중 · 운영자 미리 보기에서
   이용자 요청서(빈칸 안내·동의·보내기·내 요청 후기) · 업체 화면(가린 연락처 → [이 고객 연락처 보기]) · 운영자 화면 · 내 부동산 달력 버튼.
   E2E_SHOT_DIR 이 있으면 move_{user,partner,admin}_{390,1280}.png 를 남겨요. tools/e2e/run.js 가 불러요. */
'use strict';
module.exports = function (H) {
  const { open, txt, ok, feedbackNear, sleep, fs, path, loginAs } = H;
  const FX = require('./move-fixtures');
  async function shot(page, name, v) {
    const dir = H.SHOTS(); if (!dir) return;
    fs.mkdirSync(dir, { recursive: true });
    await page.evaluate(() => scrollTo(0, 0)); await sleep(300);
    await page.screenshot({ path: path.join(dir, `move_${name}_${v.width}.png`), fullPage: true });
  }
  return async function (page, v, mock) {
    await open(page, 'move/');
    ok(/준비 중이에요/.test(await txt(page, 'main')), '이사 견적: 꺼져 있으면 준비 중');
    await open(page, 'move/partner/');
    ok(/준비 중이에요/.test(await txt(page, 'main')), '이사업체 제휴: 꺼져 있으면 준비 중');
    FX.install(mock); await page.context().addInitScript(FX.PREVIEW_INIT);

    /* 이용자 */
    await open(page, 'move/?preview=move&fg=11680&fd=' + encodeURIComponent('대치동') + '&date=' + FX.leads[0].date + '&src=cal'); await sleep(1500);
    const main = await txt(page, 'main');
    ok(/운영자 미리 보기/.test(main) && /이사 견적, 한 번에 받아 보세요/.test(main) && /최대 3곳/.test(main), '이용자: 소개·최대 3곳');
    ok(/견적을 위해 제휴 이사업체 최대 3곳에 연락처가 전달돼요/.test(main), '이용자: 연락처 전달 동의 문구 그대로');
    ok(await page.locator('#frSg').inputValue() === '11680' && await page.locator('#frDn').inputValue() === '대치동' && await page.locator('#date').inputValue() === FX.leads[0].date, '이용자: 달력에서 오면 출발지 동·날짜가 미리 채워짐');
    ok(/어느 업체와 이사하셨나요/.test(await txt(page, '#mine')) && /한결이사/.test(await txt(page, '#mine')), '이용자: 이사 다음 날 후기(연락처를 받은 업체 중 고르기)');
    const go = page.locator('#go');
    await go.click(); await sleep(500);
    ok(await feedbackNear(page, go, '골라 주세요'), '이용자: 빈칸이면 [견적 받기] 가까이 안내');
    await page.locator('#toSd').selectOption('서울특별시'); await sleep(300);
    await page.locator('#toSg').selectOption('11710'); await sleep(900);
    await page.locator('#toDn').selectOption('잠실동').catch(async () => { const o = await page.locator('#toDn option').nth(1).getAttribute('value').catch(() => ''); if (o !== null) await page.locator('#toDn').selectOption({ index: 1 }); });
    await page.locator('#sizes [data-s="h"]').click();
    await page.locator('#nm').fill('홍길동'); await page.locator('#ph').fill('010-1234-5678');
    await go.click(); await sleep(400);
    ok(await feedbackNear(page, go, '동의에 체크'), '이용자: 동의 없으면 보내지 않음');
    ok(!mock.last('mvLead'), '이용자: 동의 전에는 서버로 보내지 않음');
    await shot(page, 'user', v);
    await page.locator('#agree').check(); await go.click(); await sleep(900);
    const sent = mock.last('mvLead');
    ok(sent && sent.body.agree === true && sent.body.cv === 'move-2026-11-25' && sent.body.size === 'h' && sent.body.fg === '11680' && sent.body.tg === '11710', '이용자: 요청 내용·동의 판을 서버로');
    ok(/견적 요청을 보냈어요/.test(await txt(page, 'main')), '이용자: 보낸 뒤 안내');
    const stored = await page.evaluate(() => localStorage.getItem('jdj_mv_mine') || '');
    ok(/M0000000C1/.test(stored) && !/01012345678|010-1234-5678|홍길동/.test(stored), '이용자: 이 기기에는 요청 열쇠만(이름·번호 없음)');

    /* 업체 */
    await open(page, 'move/partner/?preview=move'); await sleep(1800);
    const pm = await txt(page, 'main');
    ok(/한결이사/.test(pm) && /남은 포인트/.test(pm) && /무료 열람/.test(pm) && /응답률/.test(pm) && /계약률/.test(pm), '업체: 포인트·무료 열람·평점·응답률·계약률');
    ok(/홍\*동 · 010-\*\*\*\*-5678/.test(pm) && !/01012345678/.test(await txt(page, '#leads .lead-it:first-child')), '업체: 열기 전 연락처는 가림(홍*동 · 010-****-5678)');
    ok(/잘못된 요청 신고/.test(pm), '업체: 연 요청은 72시간 안 신고');
    ok(/포인트 충전은 정식 결제가 열리면/.test(pm), '업체: 유료 잠금 동안 충전은 안내만');
    await shot(page, 'partner', v);
    const rv = page.locator('[data-open="M0000000A1"]'); await rv.click(); await sleep(700);
    ok(mock.last('mvOpen') && mock.last('mvOpen').body.id === 'M0000000A1', '업체: [이 고객 연락처 보기] → 서버 열람');
    ok(await feedbackNear(page, rv, '무료 열람 1건을 썼어요'), '업체: 차감 안내가 단추 가까이');

    /* 운영자 */
    await open(page, 'move/admin/'); await sleep(1500);
    const am = await txt(page, 'main');
    ok(/검토 대기 신청/.test(am) && /잘못된 요청 신고/.test(am) && /평점이 낮은 업체/.test(am) && /중대 위반 바로 해지/.test(am) && /돌려 드리기/.test(am), '운영자: 승인·신고 돌려 드리기·평점·제재');
    await shot(page, 'admin', v);

    /* 내 부동산 달력: 전월세 만기일에 버튼 */
    const ce = new Date(Date.now() + 9 * 3600e3 + 60 * 864e5).toISOString().slice(0, 10);
    await loginAs(page, mock, { cal: { h: { '11710|가락동|913|헬리오시티|84㎡대': { t: 'jeonse', cs: '2025-05-20', ce } }, n: null, t: '', ms: 1 } });
    await open(page, 'mine/calendar/?preview=move'); await sleep(3000);
    const cta = page.locator('#evs .mv-cta a').first();
    ok(await cta.isVisible().catch(() => false) && /move\/\?fg=11710&fd=/.test(await cta.getAttribute('href') || ''), '달력: 만기일 칸에 [이사 견적 받기](출발 동·날짜 채움)');
  };
};
