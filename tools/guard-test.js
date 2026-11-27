/* 내 전셋집 지킴이 · 등기 바로 확인 · 내가 뗀 등기부 올리기 검증 — 실행: node tools/guard-test.js </dev/null
   ① 화면·서버 GUARD-CORE 같은 글자 ② 가격(설정 한 곳 = 서버 가격표)·원가·손익 ③ 변동 종류 ④ 등기부 글자 읽기(가짜 예시 — 실제 개인정보 없음)
   ⑤ 화면 단계(결제 열림/닫힘) ⑥ 서버 흐름(가짜 결제·가짜 업체): 결제 확인 뒤에만 업체 · 두 번 눌러도 한 번 · 실패 몫 자동 취소 · 변동 알림 한 번 · 다시 등록 · 열람은 이름 가림·저장 안 함
   ⑦ 화면에 비밀 키·업체 이름 없음 ⑧ 들어오는 길·무료 안내는 결제와 상관없이 보임 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
const check = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } };
const G = require('../assets/guard-core.js');
const GS = read('tools/agent-backend.gs'), CORE = read('assets/guard-core.js');
const blk = s => { const a = s.indexOf('/* GUARD-CORE BEGIN'), b = s.indexOf('/* GUARD-CORE END */'); return a >= 0 && b > a ? s.slice(a, b) : null; };

/* ① */
check('① GUARD-CORE 블록이 화면·서버에 같은 글자로', blk(CORE) && blk(CORE) === blk(GS));

/* ② 가격 */
const site = {}; vm.runInNewContext(read('assets/config.js').replace(/\(function \(\) \{[^]*$/, ''), { window: site });
const SC = site.JDJ_SITE.GUARD, SP = (GS.match(/const JG_PRICE = (\{[^;]*\});/) || [])[1];
const SPV = SP ? vm.runInNewContext('(' + SP + ')') : null;
check('② 화면 값(config GUARD) = 서버 가격표(JG_PRICE): 무료 수·추가 집·열람', SPV && ['freeHomes', 'freeHomesSubscriber', 'extra', 'read', 'maxMonths'].every(k => SC[k] === SPV[k]), [SC, SPV]);
check('② 대표 확정 값(11:01): 회원 1곳 · 구독자 3곳 무료 · 추가 집 월 900원 · 열람 1,500원', SC.freeHomes === 1 && SC.freeHomesSubscriber === 3 && SC.extra === 900 && SC.read === 1500 && SPV.corp === 1500);
{ const PW = {}; vm.runInNewContext(read('assets/products.js'), { window: PW, document: undefined, localStorage: undefined, console });
  const PC = PW.JDJ_PRODUCTS, gw = PC && PC.get('watch'), gr = PC && PC.get('read'), gc = PC && PC.get('corp');
  check('② 상품 안내(products.js) = 화면 설정 = 서버: 더 지킬 집 월 900원 · 등기 바로 확인 1,500원 · 법인등기 = 서버 corp', gw && gw.amount === SC.extra && gr && gr.amount === SC.read && gc && gc.amount === SPV.corp, [gw && gw.amount, gr && gr.amount, gc && gc.amount]);
  check('② 상품 안내: 무료 수(회원 1곳·구독자 3곳)와 쉽게 읽는 등기부를 담음', gw && /회원은 집 1곳 무료\(모닝 브리핑 구독자는 3곳 무료\)/.test(gw.includes.join(' ')) && gr && /쉽게 읽는 등기부/.test(gr.name + gr.includes.join(' '))); }
check('② 무료·확정 값에 "대표 확정 전"·"pending" 표시 없음', !/freeHomes[^\n]*(확정 전|pending|미정)/i.test(read('assets/config.js') + GS));
const C = G.cfgOf(SC);
check('② 무료 자리: 회원 1 · 구독자 3 · 다 쓰면 유료', G.plan(C, 0, false).left === 1 && G.plan(C, 1, false).pay && G.plan(C, 1, true).left === 2 && G.plan(C, 3, true).pay && G.cfgOf({ freeHomes: 0 }).freeHomes === 0);
check('② 추가 집 판매가 = 달 수 × 900원, 범위 밖은 0', G.price(12, C) === 10800 && G.price(0, C) === 0 && G.price(25, C) === 0);
/* 업체 원가표는 서버에만(JG_VCOST) */
const VC = vm.runInNewContext('(' + (GS.match(/const JG_VCOST = (\{[^;]*\});/) || [])[1] + ')');
const DG = VC.deunggigo, AP = VC.apick;
check('② 1순위 업체 원가: 열람 90 + 법원 1,100 = 1,190원 · 알림 월 100원(정가 1,000원) · 업체 문자 건별 0원', DG.readWon === DG.readSvc + DG.readCourt && G.readCostOf(DG) === 1190 && DG.monthWon === 100 && DG.monthList === 1000 && DG.sendWon === 0);
check('② 1순위 업체 지킴이 원가: 30일 100원 · 12개월 1,200원 · 정가 12,000원', G.costOf(DG, 30) === 100 && G.costOf(DG, 360) === 1200 && G.costOf(DG, 360, { list: true }) === 12000);
check('② 2순위 업체 원가(그대로): 30일 2,035원 · 다시 등록 +55원 · 열람 1,430원', G.costOf(AP, 30) === 2035 && G.costOf(AP, 30, { rereg: 1 }) - G.costOf(AP, 30) === 55 && G.readCostOf(AP) === 1430);
check('② 1순위 업체(할인가)면 추가 집 모든 기간에서 수수료 빼고 남음', [...Array(24)].every((_, i) => G.margin(i + 1, C, DG).left > 0), G.margin(1, C, DG));
check('② 열람 1,500원: 1순위 업체로 남음(1,500 − 1,190 − 수수료)', SC.read - G.readCostOf(DG) - Math.round(SC.read * 0.033) > 0);
check('② 알려 둘 손해(문서와 같게): 정가 1,000원이면 추가 집 900원은 손해 · 2순위 업체면 추가 집 손해', G.margin(1, C, DG, { list: true }).left < 0 && G.margin(1, C, AP).left < 0);
check('② 만기까지 달 수(30일 올림·최대 24)', G.monthsTo('2026-11-27', '2027-11-27', C) === 13 && G.monthsTo('2026-11-27', '2026-12-10', C) === 1 && G.monthsTo('2026-11-27', '2030-01-01', C) === 24 && G.monthsTo('2026-11-27', '2026-11-01', C) === 0);
if (SPV) {
  check('② 중개사 열람 묶음: 건당 1,500원보다 싸고 1순위 업체 원가+수수료보다 비쌈', SPV.pro.packs.every(p => p.won / p.n < SC.read && p.won / p.n - G.readCostOf(DG) - p.won / p.n * 0.033 > 0), SPV.pro.packs);
  check('② 중개사 지킴이 다건 할인도 1순위 업체(할인가)로 남음', SPV.pro.watchOff.every(o => SC.extra * (100 - o.pct) / 100 - G.costOf(DG, 30) - SC.extra * 0.033 > 0));
}
check('② 화면에 가격·무료 수를 직접 쓰지 않음(설정에서 읽음)', !/900원|1,500원|10,800|2,900|1,900원/.test(read('jeonse/guard/index.html').replace(/<head>[^]*<\/head>/, '')) && /data-gd-extra/.test(read('jeonse/guard/index.html')) && /data-gd-free/.test(read('jeonse/guard/index.html')));
const PREM = read('premium/index.html');
check('② 상품 안내(premium/#freepaid): 지킴이 회원 무료 · 등기 바로 확인 1,500원 · 추가 집 월 900원(설정과 같은 숫자)', /지킴이[^<]*회원 집 1곳 무료\(모닝 브리핑 구독자는 3곳\)/.test(PREM) && PREM.includes(`1건 ${SC.read.toLocaleString('ko-KR')}원`) && PREM.includes(`월 ${SC.extra.toLocaleString('ko-KR')}원`));
check('② 전세 안전 점검 미리 보기: 쉽게 읽는 등기부 · 가격은 설정에서', /쉽게 읽는 등기부/.test(read('jeonse/safety/index.html')) && /data-gd-read/.test(read('jeonse/safety/index.html')));

/* ③ 종류 */
const T = { '근저당권설정': 'mortgage', '1번근저당권설정등기말소': 'release', '가압류': 'seize', '압류': 'seize', '가처분': 'seize', '임의경매개시결정': 'auction', '강제경매개시결정': 'auction',
  '소유권이전': 'owner', '소유권이전청구권가등기': 'owner', '신탁': 'trust', '주택임차권': 'lease', '전세권설정': 'mortgage', '예고등기': 'notice', '등기명의인표시변경': 'other', '': 'other' };
check('③ 등기 목적 → 변동 종류', Object.keys(T).every(k => G.typeOf(k) === T[k]), Object.keys(T).filter(k => G.typeOf(k) !== T[k]));
check('③ 모든 종류에 쉬운 해석·할 일(최신 등기 열람 먼저)', G.ORDER.every(id => { const w = G.what(id); return w.head && w.why.length && w.todo.length && w.todo[0].id === 'read'; }));
check('③ 경매·압류·임차권 해석에 법률 상담·임차권등기명령·배당요구', G.what('auction').todo.some(t => t.id === 'claim') && G.what('auction').todo.some(t => t.id === 'legal') && G.what('seize').todo.some(t => t.id === 'leaseReg') && G.what('mortgage').todo.some(t => t.id === 'hug'));

/* ④ 등기부 글자 읽기(가짜 예시) */
const A = G.parseText(read('tools/fixtures/reg-sample-a.txt')), B = G.parseText(read('tools/fixtures/reg-sample-b.txt'));
const sa = G.parseReg(A), sb = G.parseReg(B);
check('④ 예시 A: 갑구 5줄·을구 4줄 · 열람일', A.ok && A.gap.length === 5 && A.eul.length === 4 && A.asof === '2026-11-27', [A.gap.length, A.eul.length, A.asof]);
check('④ 예시 A: 말소된 가압류·근저당은 빼고, 변경(3-1)된 최고액으로 · 요약 칸은 안 읽음', sa.senior === 18000 && sa.liens.length === 1 && !sa.flags.seize, sa);
check('④ 예시 A: 지금 집주인 = 마지막 소유권이전(가림) · 날짜', sa.owner === '박*험' && sa.ownerAt === '2025-09-01', [sa.owner, sa.ownerAt]);
check('④ 예시 B: 신탁·압류·경매·임차권 모두 위험 · 근저당+전세권+임차권 합계', sb.flags.trust && sb.flags.seize && sb.flags.auction && sb.flags.lease && sb.senior === 9600 + 15000 + 20000, sb);
check('④ 결과에 주민번호·전체 이름 없음', !/\d{6}-[\d*]{7}|김가상|박시험|이가짜|최가상|정허구/.test(JSON.stringify([sa, sb])));
check('④ 이름 가리기(법인·기관은 그대로)', G.maskName('홍길동') === '홍*동' && G.maskName('김수') === '김*' && G.maskName('주식회사가상은행') === '주식회사가상은행' && G.maskName('남궁가상') === '남**상');
check('④ 등기부가 아닌 글자는 ok=false', !G.parseText('아무 글자 2026년1월1일').ok && !G.parseText('').ok);
const ra = G.regReport(sa, { dep: 30000 }), rb = G.regReport(sb, {});
check('④ 진단: A 주의 · B 위험(신호 4개 이상) · 할 일에 무료 변동 알림·해석', ra.lv === 'y' && rb.lv === 'r' && rb.items.filter(i => i.lv === 'r').length >= 4 && ra.todo.some(t => t.id === 'free') && ra.todo.some(t => t.id === 'what'), [ra.lv, rb.lv]);
check('④ 쉽게 읽는 등기부: 지워진 기록 표시 · 실제 빚 범위는 "일반적으로" + 출처', /지워진 기록/.test(G.easyView(A)) && /일반적으로/.test(G.easyView(A)) && /fsc\.go\.kr/.test(G.easyView(A)) && !/김가상|박시험/.test(G.easyView(A)));
check('④ 쉽게 읽는 등기부: 중개사 이름·사무소 넣기', /가상공인중개사사무소/.test(G.easyView(A, { brand: { name: '홍길동', office: '가상공인중개사사무소', tel: '02-000-0000' } })));
const sim = G.simulate({ price: 50000, ratio: 0.8, dep: 30000, senior: 18000 });
check('④ 내 보증금 순서 참고 계산: 40,000 − 18,000 = 22,000(80%) · 70%면 17,000 · 모자람 13,000', sim.sale === 40000 && sim.back.hi === 22000 && sim.back.lo === 17000 && sim.short === 13000, sim);
check('④ 특약 예시: 근저당 있으면 말소 특약, 신탁 있으면 동의서 특약', /말소/.test(G.clauses(sa)[0]) && /신탁회사/.test(G.clauses(sb).join(' ')));

/* ⑤ 화면 단계 */
check('⑤ 결제 열림 = 화면 PAID_OPEN + 서버 open', G.cta({ PAID_OPEN: true }, { ok: true, open: true }) === 'open' && G.cta({ PAID_OPEN: false }, { ok: true, open: true }) === 'wait' && G.cta({ PAID_OPEN: true }, { ok: true, open: false }) === 'wait' && G.cta({ PAID_OPEN: true }, null) === 'wait');
check('⑤ 회원 무료는 결제 잠금과 상관없이 서버 준비(freeOpen)만', G.ctaFree({ ok: true, freeOpen: true }) === 'open' && G.ctaFree({ ok: true, freeOpen: false }) === 'wait' && G.ctaFree(null) === 'wait');
const GP = read('jeonse/guard/index.html');
check('⑤ 화면: 닫힘 안내 + 열림 알림 · 카카오 간편 로그인 단추 · 무료 시작(guardFree) · 무료 자리(guardQuota) · 다 쓰면 유료(guardOrder)', /지킴이가 열리면 바로 신청할 수 있어요/.test(GP) && /guardWait/.test(GP) && /카카오 간편 로그인하고 무료로 시작/.test(GP) && /'guardFree'/.test(GP) && /'guardQuota'/.test(GP) && /'guardOrder'/.test(GP) && /assets\/auth\.js/.test(GP));
check('⑤ 인터넷등기소 알림은 유료(수수료)라고 바르게 · "무료로 운영" 문구 없음 · 정해진 안내 문장', /수수료를 내는 유료 서비스/.test(GP) && !/무료로 운영/.test(GP) && GP.includes('다른 곳에서도 알림을 받을 수 있지만, 집예보는 알림이 오면 무슨 뜻인지와 할 일까지 알려 드려요') && G.FREE_STEPS.some(x => /수수료/.test(x)));
check('⑤ 등기소 알림을 "무료"라고 쓴 곳이 없음(다른 화면·할 일 포함)', !['assets/jsafe-core.js', 'alerts/index.html', 'assets/guard-core.js', 'jeonse/guard/index.html', 'assets/cal-core.js', 'assets/guide/scenarios.json', 'jeonse/guard/what/index.html', 'agent/pro/reg/index.html'].some(f => /(인터넷등기소|등기소)[^<\n'"]{0,25}(변동 알림|알림)[^<\n'"]{0,10}(\(무료\)|무료 신청|무료로)/.test(read(f))));

/* ⑥ 서버 흐름 */
const H = require('./gs-harness');
{ /* 기본(닫힘) */
  const E = H({});
  const cfg = JSON.parse(E.get({ action: 'guardConfig' }).s);
  check('⑥ 기본: guardConfig.open=false · 가격·무료 수 포함', cfg.ok && cfg.open === false && cfg.price.extra === 900 && cfg.price.freeHomes === 1 && cfg.price.freeHomesSubscriber === 3, cfg);
  check('⑥ 기본: 주문은 판매 잠금으로 거절', E.post({ action: 'guardOrder', product: 'watch' }).code === 'paid_closed');
  check('⑥ 기본: 회원 무료 시작도 닫힘(업체 키·GUARD_ENABLED 없음)', E.post({ action: 'guardFree', s: E.member(1) }).code === 'guard_closed');
  check('⑥ 기본: guardConfig 에 업체 이름·키 없음 · freeOpen=false', cfg.freeOpen === false && !/deunggigo|apick|dgg_|API_KEY/i.test(JSON.stringify(cfg)));
  check('⑥ 기본 업체는 등등기고(속성 없을 때)', E.ctx.jgVendorName() === 'deunggigo' && (E.props.GUARD_VENDOR = 'apick', E.ctx.jgVendorName() === 'apick') && (E.props.GUARD_VENDOR = 'x', E.ctx.jgVendorName() === 'deunggigo'));
  check('⑥ 기본: 주소 찾기도 닫힘(업체 호출 없음)', E.post({ action: 'guardFind', road: '서울 가상로 1' }).code === 'guard_closed');
  const w = E.post({ action: 'guardWait', email: 'wait@example.com', agree: true }), w2 = E.post({ action: 'guardWait', email: 'WAIT@example.com', agree: true });
  check('⑥ 기본: 열림 알림 신청은 받음(같은 메일 한 번) · 이메일은 암호화', w.ok && w2.again && !JSON.stringify(E.sheets['지킴이대기'].rows).includes('wait@example.com'), [w, w2]);
}
const calls = [];
let vendorFail = false, changed = [];
const E = H({ now: '2026-11-27T11:00:00+09:00',
  patch: g => g.replace('const GUARD_ENABLED = false;', 'const GUARD_ENABLED = true;').replace('const PAID_OPEN = false;', 'const PAID_OPEN = true;'),
  fetch(url, opt) {
    const send = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
    if (/tosspayments/.test(url)) {
      const p = opt.payload ? JSON.parse(opt.payload) : {}; calls.push({ k: /cancel/.test(url) ? 'cancel' : 'confirm', p, idem: (opt.headers || {})['Idempotency-Key'] });
      if (/cancel/.test(url)) return send(200, { status: 'PARTIAL_CANCELED' });
      return send(200, { status: 'DONE', orderId: p.orderId, totalAmount: p.amount, method: '카드', approvedAt: '2026-11-27T11:00:00+09:00' });
    }
    if (/apick\.app/.test(url)) {
      const pth = url.replace(/^https:\/\/apick\.app/, ''); calls.push({ k: 'v' + pth, p: opt.payload, h: opt.headers });
      if (pth === '/rest/iros_monitor') return vendorFail ? send(200, { success: false, message: '고유번호 오류' }) : send(200, { success: true, monitor_id: 'M' + calls.length });
      if (pth === '/rest/iros_monitor/changed') return send(200, { success: true, data: changed });
      if (pth === '/rest/iros_monitor/terminate') return send(200, { success: true });
      if (pth === '/rest/iros1') return send(200, { success: true, issue_date: '2026-11-27', gapgu: [{ no: 1, purpose: '소유권이전', receipt_date: '2020-01-02', holder: '김가상', cause: '매매' }], eulgu: [{ no: 1, purpose: '근저당권설정', receipt_date: '2020-01-02', amount: '금120,000,000원', holder: '주식회사가상은행' }] });
    }
    return null;
  } });
E.props.GUARD_VENDOR = 'apick'; E.props.APICK_API_KEY = 'test-vendor-key'; E.props.TOSS_SECRET_KEY = 'test_sk_fake';
check('⑥ 열림: guardConfig.open=true', JSON.parse(E.get({ action: 'guardConfig' }).s).open === true);
const bad = E.post({ action: 'guardOrder', product: 'watch', items: [{ no: '1234-5678-901234' }, { no: '1111-2222-333333' }], months: 12, email: 'me@example.com', agree: true });
check('⑥ 손님은 한 번에 한 곳(여러 곳은 중개사 도구)', !bad.ok && /한 곳씩/.test(bad.err), bad);
const o = E.post({ action: 'guardOrder', product: 'watch', items: [{ no: '1234-5678-901234', label: '가상아파트 101동' }], months: 12, email: 'me@example.com', phone: '010-1234-5678', agree: true });
check('⑥ 추가 집 주문 금액 = 서버 가격표(12개월 10,800원)', o.ok && o.amount === 10800, o);
const rowTxt = () => JSON.stringify(E.sheets['지킴이'].rows);
check('⑥ 시트에 이메일·휴대폰 원문 없음(암호화 + 가림)', !rowTxt().includes('me@example.com') && !rowTxt().includes('01012345678'));
calls.length = 0;
const wrong = E.post({ action: 'guardRegister', paymentKey: 'pk_1', orderId: o.orderId, amount: 100 });
check('⑥ 금액이 다르면 거절 · 결제 승인·업체 호출 없음', !wrong.ok && calls.length === 0, wrong);
const o2 = E.post({ action: 'guardOrder', product: 'watch', items: [{ no: '1234-5678-901234' }], months: 3, email: 'me@example.com', agree: true });
calls.length = 0;
const reg = E.post({ action: 'guardRegister', paymentKey: 'pk_2', orderId: o2.orderId, amount: o2.amount });
check('⑥ 결제 승인 먼저 → 업체 등록(키는 헤더로만)', reg.ok && calls[0].k === 'confirm' && calls[1].k === 'v/rest/iros_monitor' && calls[1].h.CL_AUTH_KEY === 'test-vendor-key' && calls[0].idem === 'confirm-' + o2.orderId, calls.map(c => c.k));
calls.length = 0;
const again = E.post({ action: 'guardRegister', paymentKey: 'pk_2', orderId: o2.orderId, amount: o2.amount });
check('⑥ 두 번 눌러도 다시 승인·등록 안 함(같은 열쇠)', again.ok && again.token === reg.token && calls.length === 0, calls);
check('⑥ 다른 결제키로는 거절', !E.post({ action: 'guardRegister', paymentKey: 'pk_x', orderId: o2.orderId, amount: o2.amount }).ok);
const st = E.post({ action: 'guardStatus', o: reg.orderId, t: reg.token });
check('⑥ 상태: 지켜보는 중 · 기간 3개월(90일)', st.ok && st.state === '지켜보는 중' && st.start === '2026-11-27' && st.end === '2027-02-25', st);
check('⑥ 상태: 열쇠가 틀리면 거절', !E.post({ action: 'guardStatus', o: reg.orderId, t: 'x'.repeat(40) }).ok);
/* 업체 실패 → 자동 취소 */
vendorFail = true;
const o3 = E.post({ action: 'guardOrder', product: 'watch', items: [{ no: '9999-8888-777777' }], months: 1, email: 'me@example.com', agree: true });
calls.length = 0;
const r3 = E.post({ action: 'guardRegister', paymentKey: 'pk_3', orderId: o3.orderId, amount: o3.amount });
check('⑥ 업체 등록 실패 → 결제 자동 취소(전액) · 안내', !r3.ok && /자동으로 취소/.test(r3.err) && calls.some(c => c.k === 'cancel' && c.p.cancelAmount === 900), [r3, calls.map(c => c.k)]);
vendorFail = false;
/* 매일 확인 */
const vid = String(E.sheets['지킴이'].rows.find(r => r[1] === o2.orderId)[16]);
changed = [{ monitor_id: vid, changes: [{ purpose: '근저당권설정', receipt_date: '2026-11-26' }] }];
const m0 = E.mails.length; calls.length = 0;
E.ctx.guardDaily();
const row2 = () => E.sheets['지킴이'].rows.find(r => r[1] === o2.orderId);
check('⑥ 변동 → 기록(종류·날짜만) · 메일 1통 · 남은 기간 다시 등록', JSON.parse(row2()[19]).length === 1 && JSON.parse(row2()[19])[0].type === 'mortgage' && E.mails.length === m0 + 1 && calls.some(c => c.k === 'v/rest/iros_monitor') && Number(row2()[17]) === 2, [row2()[19], E.mails.length - m0, row2()[17]]);
check('⑥ 알림 메일: 종류·해석 링크(무료 페이지)·내 지킴이 링크', /근저당/.test(E.mails[E.mails.length - 1].subject) && /jeonse\/guard\/what\/#mortgage/.test(E.mails[E.mails.length - 1].htmlBody) && /guard\/my\/\?o=/.test(E.mails[E.mails.length - 1].htmlBody));
const m1 = E.mails.length;
changed = [{ monitor_id: String(row2()[16]), changes: [{ purpose: '근저당권설정', receipt_date: '2026-11-26' }] }];
E.ctx.guardDaily();
check('⑥ 같은 변동은 두 번 알리지 않음', E.mails.length === m1 && JSON.parse(row2()[19]).length === 1);
/* 열람 */
const or = E.post({ action: 'guardOrder', product: 'read', items: [{ no: '1234-5678-901234' }], agree: true });
check('⑥ 열람 주문 1,500원', or.ok && or.amount === 1500, or);
const rr = E.post({ action: 'readRegistry', paymentKey: 'pk_r', orderId: or.orderId, amount: 1500 });
check('⑥ 열람: 결과 한 번 돌려줌 · 이름은 가림', rr.ok && rr.reg.gap[0].holder === '김*상' && G.parseReg(rr.reg).senior === 12000, rr);
check('⑥ 열람: 시트·기록 어디에도 이름·금액 없음', !/김가상|김\*상|120,000,000|가상은행/.test(JSON.stringify(E.sheets)), Object.keys(E.sheets));
const pl = (E.sheets['지킴이기록'] || { rows: [] }).rows.filter(r => r[1] === 'read');
check('⑥ 기록 시트에는 성공 여부·줄 수만', pl.length === 1 && pl[0][2] === 1 && pl[0][3] === 2, pl);
/* 중개사 목록은 로그인·확인 필요 */
check('⑥ 중개사 목록(guardList)은 확인된 회원만', !E.post({ action: 'guardList', s: 'nope' }).ok);
check('⑥ 업체 키는 스크립트 속성에서만(두 업체 모두)', /getProperty\('APICK_API_KEY'\)/.test(GS) && /getProperty\('DEUNGGIGO_API_KEY'\)/.test(GS) && !/(APICK|DEUNGGIGO)_API_KEY\s*[:=]\s*['"][^'"]+/.test(GS) && !/dgg_[A-Za-z0-9]{6,}/.test(GS));
check('⑥ 회원 무료 요청은 결제 잠금 목록에 없음(결제가 없어서)', !/guardFree: 1, guardRegister|PAID_ACTIONS = \{[^}]*guardFree/.test(GS));
check('⑥ 돈이 걸린 요청은 판매 잠금 목록에', /guardOrder: 1, guardRegister: 1, readRegistry: 1/.test(GS));

/* ⑥-2 회원 무료 · 1순위 업체(등등기고 모양 가짜) · 웹훅 · 같은 집 업체 알림 함께 쓰기 */
{
  const dcalls = []; let alertN = 0;
  const D = H({ now: '2026-11-27T11:00:00+09:00', cache: true,
    patch: g => g.replace('const GUARD_ENABLED = false;', 'const GUARD_ENABLED = true;'),
    fetch(url, opt) {
      const send = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
      if (!/^https:\/\/deunggigo\.kr\/api\/v1/.test(url)) return null;
      const pth = url.replace('https://deunggigo.kr/api/v1', ''), body = opt.payload ? JSON.parse(opt.payload) : null;
      dcalls.push({ m: opt.method, p: pth, body, h: opt.headers });
      if (opt.method === 'post' && pth === '/alerts') return send(201, { message: 'ok', alert: { id: 'A' + (++alertN), uniqueNumber: body.uniqueNumber, isActive: true, recipients: body.recipients } });
      if (opt.method === 'delete' && /^\/alerts\//.test(pth)) return send(200, { message: 'deleted' });
      if (opt.method === 'post' && pth === '/webhooks') return send(201, { webhook: { id: 'W1', url: body.url, events: body.events, isActive: true } });
      if (opt.method === 'get' && /^\/webhooks\/W1\/logs/.test(pth)) return send(200, { items: [] });
      if (opt.method === 'post' && pth === '/property-search') return send(200, { items: [{ uniqueNo: '11112222333333', address: '서울 가상구 가상로 1', propertyType: '집합건물', dong: '101동', ho: '1001호' }], total: 1 });
      if (opt.method === 'post' && pth === '/inquiries') return send(200, { message: 'ok', inquiry: { id: 'Q1', status: 'processing', cost: 1190 } });
      if (opt.method === 'get' && pth === '/inquiries/Q1') return send(200, { inquiry: { id: 'Q1', status: 'completed', completedAt: '2026-11-27T11:00:00+09:00',
        parsedData: { gapgu: [{ rank: '1', purpose: '소유권이전', receiptDate: '2020년 1월 2일', holder: '김가상' }], eulgu: [{ rank: '1', purpose: '근저당권설정', receiptDate: '2020-01-02', etc: '채권최고액 금120,000,000원 근저당권자 주식회사가상은행', holder: '주식회사가상은행' }] } } });
      return send(404, { error: 'not found' });
    } });
  D.props.DEUNGGIGO_API_KEY = 'dgg_test_fake'; D.props.TOSS_SECRET_KEY = 'test_sk_fake';
  const cfg = JSON.parse(D.get({ action: 'guardConfig' }).s);
  check('⑥-2 업체 키 + GUARD_ENABLED 면 회원 무료는 열림 · 유료는 PAID_OPEN 잠금 그대로', cfg.freeOpen === true && cfg.open === false, cfg);
  check('⑥-2 로그인 없이 무료 시작 → 로그인 안내', D.post({ action: 'guardFree', items: [{ no: '1234-5678-901234' }], months: 12, email: 'a@example.com', agree: true }).code === 'login');
  const s1 = D.member(1), s2 = D.member(2), s3 = D.member(3);
  const q1 = D.post({ action: 'guardQuota', s: s1 });
  check('⑥-2 무료 자리: 회원 1곳', q1.ok && q1.allow === 1 && q1.left === 1 && !q1.sub, q1);
  dcalls.length = 0;
  const f1 = D.post({ action: 'guardFree', s: s1, items: [{ no: '1234-5678-901234', label: '가상빌라 201호' }], months: 12, email: 'a@example.com', phone: '010-1111-2222', agree: true });
  check('⑥-2 무료 시작: 결제 없이 업체 알림 등록(Bearer 키 · 고유번호 숫자만) · 지켜보는 중', f1.ok && f1.left === 0 && dcalls.length === 1 && dcalls[0].p === '/alerts' && dcalls[0].h.Authorization === 'Bearer dgg_test_fake' && dcalls[0].body.uniqueNumber === '12345678901234', [f1, dcalls]);
  check('⑥-2 업체에는 손님 휴대폰·이메일을 넘기지 않음', !/01011112222|010-1111-2222|a@example\.com/.test(JSON.stringify(dcalls)));
  check('⑥-2 시트: 상품 free · 금액 0 · 회원은 카카오 번호가 아닌 바꾼 값 · 연락처 암호화', (() => { const r = D.sheets['지킴이'].rows.find(x => x[1] === f1.orderId); return r[3] === 'free' && r[9] === 0 && /^m[0-9a-f]{20}$/.test(r[20]) && !JSON.stringify(D.sheets['지킴이'].rows).includes('k1') && !JSON.stringify(D.sheets['지킴이'].rows).includes('a@example.com'); })());
  const f1b = D.post({ action: 'guardFree', s: s1, items: [{ no: '9999-0000-111111' }], months: 12, email: 'a@example.com', agree: true });
  check('⑥-2 무료 자리를 다 쓰면 free_full(월 900원 안내)', !f1b.ok && f1b.code === 'free_full' && /900원/.test(f1b.err), f1b);
  const dup = D.post({ action: 'guardFree', s: s1, items: [{ no: '1234-5678-901234' }], months: 12, email: 'a@example.com', agree: true });
  check('⑥-2 같은 집 두 번은 거절', !dup.ok && dup.code === 'dup', dup);
  /* 구독자 3곳 */
  const BH = D.T.BH, BC = D.T.BC; D.ctx.bSheet(); const br = []; br[BC['id']] = 'B1'; br[BC['상태']] = '이용중'; br[BC['카카오id']] = 'k2'; br[BC['상품']] = '모닝 브리핑'; br[BC['시작일']] = '2026-11-01'; br[BC['만료일']] = '2026-12-31';
  const BST = D.ctx.eval ? null : null; br[BC['상태']] = vm.runInContext('BST.on', D.ctx); D.sheets['브리핑구독'].appendRow(BH.map((h, k) => br[k] === undefined ? '' : br[k]));
  const q2 = D.post({ action: 'guardQuota', s: s2 });
  check('⑥-2 모닝 브리핑 구독자는 무료 3곳', q2.ok && q2.sub === true && q2.allow === 3, q2);
  dcalls.length = 0;
  const f2 = D.post({ action: 'guardFree', s: s2, items: [{ no: '1234-5678-901234' }], months: 6, email: 'b@example.com', agree: true });
  check('⑥-2 다른 회원이 같은 집을 지키면 업체 알림을 같이 씀(업체 호출 없음)', f2.ok && dcalls.length === 0 && D.sheets['지킴이'].rows.filter(r => r[4] === "'1234-5678-901234" && r[16] === 'A1').length === 2, dcalls);
  /* 무료 자리가 남았는데 유료 주문 → use_free (결제 열림 상태로) */
  const P = H({ patch: g => g.replace('const GUARD_ENABLED = false;', 'const GUARD_ENABLED = true;').replace('const PAID_OPEN = false;', 'const PAID_OPEN = true;') });
  P.props.DEUNGGIGO_API_KEY = 'dgg_test_fake';
  const uf = P.post({ action: 'guardOrder', product: 'watch', s: P.member(9), items: [{ no: '1234-5678-901234' }], months: 3, email: 'c@example.com', agree: true });
  check('⑥-2 로그인 회원이 무료 자리가 남았는데 유료 주문 → use_free', !uf.ok && uf.code === 'use_free', uf);
  /* 웹훅 */
  const hook = (k, body) => JSON.parse(D.ctx.doPost({ parameter: { guardhook: '1', k }, postData: { contents: JSON.stringify(body) } }).s);
  const inst = D.ctx.guardHookInstall();
  check('⑥-2 guardHookInstall: 비밀 값 만들고 웹훅 등록(주소에 비밀 값) · 번호 저장', inst.ok && D.props.GUARD_DG_HOOK_ID === 'W1' && D.props.GUARD_HOOK_TOKEN && dcalls.some(c => c.p === '/webhooks' && c.body.url.indexOf('guardhook=1&k=' + D.props.GUARD_HOOK_TOKEN) > 0 && c.body.events[0] === 'alert.detected'));
  check('⑥-2 웹훅: 비밀 값이 틀리면 거절', hook('wrong', {}).err === 'auth');
  const ev = { event: 'alert.detected', id: 'DLV1', created_at: '2026-11-28T09:00:00+09:00', data: { uniqueNumber: '12345678901234', address: '가상', changeSummary: '근저당권설정', detectedAt: '2026-11-28T08:59:00+09:00' } };
  const m0 = D.mails.length; dcalls.length = 0;
  const h1 = hook(D.props.GUARD_HOOK_TOKEN, ev);
  check('⑥-2 웹훅 변동 → 같은 집을 지키는 두 분께 메일 · 다시 등록 없음(알림이 계속 켜져 있음)', h1.ok && h1.changed === 2 && D.mails.length === m0 + 2 && !dcalls.some(c => c.p === '/alerts' && c.m === 'post') && /근저당/.test(D.mails[D.mails.length - 1].subject), [h1, D.mails.length - m0, dcalls]);
  const h2 = hook(D.props.GUARD_HOOK_TOKEN, ev);
  check('⑥-2 같은 배달 번호로 다시 와도 한 번만(업체 다시 보내기·302 대비)', h2.ok && h2.changed === 0 && D.mails.length === m0 + 2);
  const h3 = hook(D.props.GUARD_HOOK_TOKEN, Object.assign({}, ev, { id: 'DLV2' }));
  check('⑥-2 배달 번호가 달라도 같은 변동(종류·날짜)은 다시 알리지 않음', h3.changed === 0 && D.mails.length === m0 + 2);
  /* 그만두기: 같은 업체 알림을 다른 분이 쓰면 끄지 않음 → 마지막 분이 그만두면 끔 */
  dcalls.length = 0;
  const st1 = D.post({ action: 'guardStop', o: f1.orderId, t: f1.token });
  check('⑥-2 그만두기(다른 분이 같은 집 지키는 중) → 업체 알림은 그대로 · 무료 자리 돌려받음', st1.ok && !dcalls.some(c => c.m === 'delete') && D.post({ action: 'guardQuota', s: s1 }).left === 1, dcalls);
  D.post({ action: 'guardStop', o: f2.orderId, t: f2.token });
  check('⑥-2 마지막 분이 그만두면 업체 알림 끔(DELETE /alerts/A1)', dcalls.some(c => c.m === 'delete' && c.p === '/alerts/A1'));
  /* 내 지킴이(로그인) */
  const mine = D.post({ action: 'guardMine', s: s1 });
  check('⑥-2 guardMine: 내 주문 번호·보기 열쇠 · 무료 자리', mine.ok && mine.items.length === 1 && mine.items[0].o === f1.orderId && mine.items[0].t === f1.token && mine.allow === 1, mine);
  /* 매일 트리거(대체 길): 웹훅 배달 기록 읽기 · 기간 끝 정리 */
  const f3 = D.post({ action: 'guardFree', s: s3, items: [{ no: '5555-6666-777777' }], months: 1, email: 'd@example.com', agree: true });
  D.now += 31 * 86400000; dcalls.length = 0;
  const pd = D.ctx.guardDaily();
  check('⑥-2 매일 트리거: 배달 기록(logs) 읽고 · 기간 끝난 무료 지킴이 업체 알림 끔', pd.ok && dcalls.some(c => /\/webhooks\/W1\/logs/.test(c.p)) && dcalls.some(c => c.m === 'delete' && c.p === '/alerts/A2') && D.sheets['지킴이'].rows.find(r => r[1] === f3.orderId)[10] === '기간 끝', [pd, dcalls.map(c => c.m + c.p)]);
  /* 열람(1순위 업체) */
  const R = H({ now: '2026-11-27T11:00:00+09:00', patch: g => g.replace('const GUARD_ENABLED = false;', 'const GUARD_ENABLED = true;').replace('const PAID_OPEN = false;', 'const PAID_OPEN = true;'),
    fetch: (url, opt, env) => {
      const send = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
      if (/tosspayments/.test(url)) { const p = opt.payload ? JSON.parse(opt.payload) : {}; return send(200, { status: 'DONE', orderId: p.orderId, totalAmount: p.amount, approvedAt: '2026-11-27T11:00:00+09:00' }); }
      return null;
    } });
  R.props.DEUNGGIGO_API_KEY = 'dgg_test_fake'; R.props.TOSS_SECRET_KEY = 'test_sk_fake';
  const dfetch = (url, opt) => { const pth = url.replace('https://deunggigo.kr/api/v1', ''); const send = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
    if (opt.method === 'post' && pth === '/inquiries') return send(200, { inquiry: { id: 'Q1', status: 'processing' } });
    if (pth === '/inquiries/Q1') return send(200, { inquiry: { id: 'Q1', status: 'completed', completedAt: '2026-11-27', parsedData: { gapgu: [{ rank: '1', purpose: '소유권이전', receiptDate: '2020년 1월 2일', holder: '김가상' }], eulgu: [{ rank: '1', purpose: '근저당권설정', receiptDate: '2020-01-02', etc: '채권최고액 금120,000,000원', holder: '주식회사가상은행' }] } } });
    if (pth === '/property-search') return send(200, { items: [{ uniqueNo: '11112222333333', address: '서울 가상구 가상로 1', propertyType: '집합건물', dong: '101동', ho: '1001호' }] });
    return send(404, { error: 'x' }); };
  const UF = R.ctx.UrlFetchApp.fetch; R.ctx.UrlFetchApp.fetch = (u, o) => /deunggigo\.kr/.test(u) ? dfetch(u, o) : UF(u, o);
  const fd = R.post({ action: 'guardFind', road: '서울 가상구 가상로 1' });
  check('⑥-2 주소 → 고유번호(1순위 업체 property-search)', fd.ok && fd.list[0].no === '1111-2222-333333' && /101동 1001호/.test(fd.list[0].label), fd);
  const ro = R.post({ action: 'guardOrder', product: 'read', items: [{ no: '1234-5678-901234' }], agree: true });
  const rr2 = R.post({ action: 'readRegistry', paymentKey: 'pk_d', orderId: ro.orderId, amount: ro.amount });
  check('⑥-2 열람 1,500원 → 1순위 업체 결과(갑구·을구) · 이름 가림 · 금액 읽기', ro.amount === 1500 && rr2.ok && rr2.reg.gap[0].holder === '김*상' && rr2.reg.gap[0].at === '2020-01-02' && G.parseReg(rr2.reg).senior === 12000, rr2);
}

/* ⑦ 화면에 비밀·업체 이름 없음 */
const client = []; const walk = d => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).forEach(f => { const p = path.join(d, f.name); if (f.name[0] === '.' || f.name === 'tools' || f.name === 'node_modules' || p === path.join('assets', 'vendor')) return; if (f.isDirectory()) walk(p); else if (/\.(html|js|json|css)$/.test(f.name)) client.push(p); });
['jeonse', 'assets', 'agent', 'alerts', 'mine'].forEach(walk);
client.push('sw.js');
const leaks = client.filter(f => { const t = read(f); return /APICK_API_KEY|DEUNGGIGO_API_KEY|CL_AUTH_KEY|apick\.app|deunggigo|dgg_|GUARD_HOOK_TOKEN|test_sk_|live_sk_|TOSS_SECRET_KEY\s*[:=]/.test(t); });
check('⑦ 화면 파일에 업체 키·주소·결제 비밀키 없음', !leaks.length, leaks);
const NEW = ['premium/index.html', 'jeonse/guard/index.html', 'jeonse/guard/what/index.html', 'jeonse/guard/my/index.html', 'assets/guard-core.js', 'assets/reg-upload.js', 'agent/pro/reg/index.html'].filter(f => fs.existsSync(path.join(ROOT, f)));
const rival = /(직방|다방|호갱노노|아실|리치고|네이버\s*부동산|KB부동산|피터팬|부동산114|밸류맵|디스코|뱅크샐러드|카카오페이|핀다|세이프홈즈|에이픽|apick|코드에프|하이픈|등등기고|등기고|deunggigo|로브)/;
check('⑦ 새 화면에 다른 업체·경쟁 서비스 이름 없음', NEW.every(f => !rival.test(read(f))), NEW.filter(f => rival.test(read(f))));
check('⑦ 쉬운 말(~요체) — 합니다·입니다 없음', NEW.filter(f => f !== 'premium/index.html').every(f => !/합니다\.|입니다\./.test(read(f))), NEW.filter(f => /합니다\.|입니다\./.test(read(f))));
check('⑦ 올린 등기부 파일은 서버로 보내지 않음(fetch·POST 없음, pdf.js 는 이 사이트 안 파일)', !/fetch\(|XMLHttpRequest|sendBeacon/.test(read('assets/reg-upload.js')) && /assets\/vendor\/pdfjs\/pdf\.min\.mjs/.test(read('assets/reg-upload.js')) && fs.existsSync(path.join(ROOT, 'assets/vendor/pdfjs/pdf.worker.min.mjs')));

/* ⑧ 들어오는 길 · 무료 안내 */
const JS = require('../assets/jsafe-core.js'), td = JS.todoOf({ kind: 'a' }).map(t => t.id);
check('⑧ 전세 안전 점검 다음 할 일: 회원 무료 지킴이 → 해석(무료) → 인터넷등기소 알림(수수료) 순서', td.indexOf('guard') >= 0 && td.indexOf('guard') < td.indexOf('what') && td.indexOf('what') < td.indexOf('regalert') && /수수료/.test(JS.todoOf({ kind: 'a' }).find(t => t.id === 'regalert').t), td);
check('⑧ 전월세 화면·할 일 예보·고민 찾기에서 지킴이로', /href="guard\/" data-track="jeonse_to_guard"/.test(read('jeonse/index.html')) && /jeonse\/guard\//.test(read('alerts/index.html')) && JSON.parse(read('assets/guide/scenarios.json')).sc.find(s => s.id === 'deposit_safe').next.some(n => n.href === 'jeonse/guard/'));
check('⑧ 해석 화면은 결제·로그인 없이(무료) — 서버 호출 없음', !/fetch\(|PAID_OPEN|guardConfig/.test(read('jeonse/guard/what/index.html')));
check('⑧ 지킴이 화면: 무료 신청 순서·해석 링크·내가 뗀 등기부 올리기가 결제 칸 밖에', /id="free"/.test(read('jeonse/guard/index.html')) && /JDJ_REGUP\.mount/.test(read('jeonse/guard/index.html')) && /href="what\/"/.test(read('jeonse/guard/index.html')));
check('⑧ 달력: 세입자 전입·확정일자 확인(이사 7일 뒤) · 보증보험 확인(만기 3개월 전)', (() => { const CC = require('../assets/cal-core.js'); const ev = CC.events([{ key: '11440|망원동||가상|60㎡ 이하', name: '가상', cal: { t: 'jeonse', cs: '2026-12-01', ce: '2028-12-01' } }], '2026-11-27', { ahead: 800 }); return ev.some(e => e.k === 'tchk' && e.d === '2026-12-08') && ev.some(e => e.k === 'tins' && e.d === '2028-09-01'); })());
const SW = read('sw.js');
check('⑧ 서비스 워커: 지킴이 화면·파일', /'\.\/jeonse\/guard\/'/.test(SW) && /'\.\/jeonse\/guard\/what\/'/.test(SW) && /guard-core\.js\?v=3/.test(SW) && /guard\.css\?v=3/.test(SW) && /reg-upload\.js\?v=1/.test(SW));
check('⑧ 사이트맵: 지킴이·해석 화면', /jeonse\/guard\//.test(read('sitemap.xml') + (fs.existsSync(path.join(ROOT, 'sitemaps/pages.xml')) ? read('sitemaps/pages.xml') : '')));

console.log(`\n내 전셋집 지킴이 확인: ${pass}개 통과, ${fail}개 실패`);
process.exitCode = fail ? 1 : 0;
