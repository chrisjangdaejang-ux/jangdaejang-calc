/* 집 살 때·팔 때 드는 돈(부대비용) + 잔금일 체크리스트 공용 계산 — 화면 없음.
   /tax/cost/(부대비용), /buy/(매수 총비용 한 장), /loan/checklist/(잔금일 체크리스트)가 같은 함수를 써요.
   금액 단위: 원. 입력값은 이 기기 안에서만 계산하고 어디로도 보내지 않아요.
   규칙 숫자는 모두 공식 표에서 옮겼어요(확인일 2026-11-26, 출처 SRC):
   · 국민주택채권 매입 비율 — 주택도시기금법 시행령 [별표] 제1종국민주택채권 매입대상자 및 매입기준, [부표] 15 부동산등기(2025.8.26 개정)
   · 인지세 — 인지세법 제3조 제1항 제1호(부동산 소유권 이전 증서), 제6조 제5호(주택 1억 원 이하 비과세)
   · 등기신청수수료 — 등기사항증명서 등 수수료규칙 제5조의2 제1항·제5조의5 제1항(대법원규칙 제3222호, 2025.8.1 시행)
   · 법무사 보수 — 대한법무사협회 「법무사보수기준」 제9조 제1항 기본보수표(2024.9.12 시행본 — 2026년 개정본도 기본보수 금액은 같음), 제7조(부가세 별도).
     2026년 회칙 개정으로 '상한' 문구가 '기준'으로 바뀌고 일부 사건 가산이 생겨, 화면에는 '기본보수 기준'으로만 보여 줘요
   · 중개보수 — assets/loan-core.js JDJ_LOAN.brokerSale(법정 상한 요율 + 부가세 10%)
   · 취득세 — tax/tax-engine.js JDJ_TAX.buyerAcqTax(세금 계산 화면과 같은 엔진)
   채권 할인율은 매일 바뀌어(은행 고시) 사용자가 그날 값을 넣을 때만 계산해요. 넣지 않으면 합계에 넣지 않고 '빠진 항목'으로 알려 드려요.
   window.JDJ_CLOSING */
(function (root) {
  'use strict';
  var TAX = root.JDJ_TAX || (typeof require === 'function' ? require('../tax/tax-engine.js') : null);
  var LOAN = root.JDJ_LOAN || (typeof require === 'function' ? require('./loan-core.js') : null);
  var CHECKED = '2026-11-26';

  var SRC = {
    bond: { nm: '주택도시기금법 시행령 [별표] 제1종국민주택채권 매입기준 · [부표] 15 부동산등기(2025.8.26 개정)', url: 'https://www.law.go.kr/LSW/flDownload.do?flSeq=170789201' },
    bondRate: { nm: '주택도시기금 — 국민주택채권 매입대상금액 조회', url: 'https://nhuf.molit.go.kr/FP/FP07/FP0705/FP070504.jsp' },
    stamp: { nm: '인지세법 제3조 제1항 제1호 · 제6조 제5호', url: 'https://www.law.go.kr/법령/인지세법' },
    reg: { nm: '등기사항증명서 등 수수료규칙 제5조의2·제5조의5(대법원규칙 제3222호, 2025.8.1 시행)', url: 'https://law.go.kr/LSW/lsLinkCommonInfo.do?lspttninfSeq=112847' },
    scr: { nm: '대한법무사협회 「법무사보수기준」 제9조 제1항 기본보수표·제7조(부가세 별도)', url: null },
    iros: { nm: '대법원 인터넷등기소', url: 'https://www.iros.go.kr/' },
    acq: { nm: '지방세법 제11조·제20조(취득세 세율·신고 기한 60일)', url: 'https://www.law.go.kr/법령/지방세법' },
    regDue: { nm: '부동산등기 특별조치법 제2조 제1항(잔금 낸 날부터 60일 안에 소유권이전등기 신청)', url: 'https://www.law.go.kr/법령/부동산등기특별조치법' },
    deal: { nm: '부동산 거래신고 등에 관한 법률 제3조(계약일부터 30일 안에 거래 신고)', url: 'https://www.law.go.kr/법령/부동산거래신고등에관한법률' },
    rentRep: { nm: '부동산 거래신고 등에 관한 법률 제6조의2(주택 임대차 계약 신고, 계약일부터 30일)', url: 'https://www.law.go.kr/법령/부동산거래신고등에관한법률' },
    jumin: { nm: '주민등록법 제16조 제1항(새 주소로 옮긴 날부터 14일 안에 전입신고)', url: 'https://www.law.go.kr/법령/주민등록법' },
    lease: { nm: '주택임대차보호법 제3조 제1항·제3조의2 제2항(전입+이사 다음 날 대항력, 확정일자 우선변제)', url: 'https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1018577211&chrClsCd=010202&ancYnChk=' },
    base61: { nm: '종합부동산세법 제3조·제16조, 지방세법 제114조(6월 1일 과세기준일)', url: 'https://www.law.go.kr/LSW/lsPdfPrint.do?ancYnChk=0&lsiSeq=249983&efYd=20230418&efGubun=Y&joAllCheck=Y&joEfOutPutYn=on&mokChaChk=N&bylChaChk=N' },
    broker: { nm: '공인중개사법 시행규칙 제20조·시·도 조례(주택 중개보수 상한 요율)', url: 'https://www.law.go.kr/법령/공인중개사법시행규칙' }
  };

  /* ---------- 국민주택채권(제1종) 매입 — 주택 소유권 이전등기 ----------
     [시가표준액 이상, 미만, 특별시·광역시 1천분의, 그 밖의 지역 1천분의]. 시가표준액 2천만 원 미만은 표에 없어 매입 대상이 아니에요.
     세종특별자치시·제주특별자치도 등 '특별시·광역시'가 아닌 곳은 '그 밖의 지역'. 시가표준액 = 주택공시가격(공시 전 새 아파트는 취득당시가액). */
  var BOND = [[2e7, 5e7, 13, 13], [5e7, 1e8, 19, 14], [1e8, 1.6e8, 21, 16], [1.6e8, 2.6e8, 23, 18], [2.6e8, 6e8, 26, 21], [6e8, Infinity, 31, 26]];
  function bond(std, metro) {
    std = Math.max(0, +std || 0);
    var row = null; for (var i = 0; i < BOND.length; i++) if (std >= BOND[i][0] && std < BOND[i][1]) { row = BOND[i]; break; }
    if (!row) return { permil: 0, amount: 0, none: true };
    var pm = metro ? row[2] : row[3];
    return { permil: pm, amount: Math.floor(std * pm / 1000), none: false };
  }
  /** 바로 팔 때 내 부담(할인 비용) = 매입액 × 그날 할인율(%) — 할인율을 모르면 null */
  function bondCost(amount, pct) {
    if (pct == null || pct === '' || !isFinite(+pct) || +pct < 0 || +pct > 30) return null;
    return Math.round((+amount || 0) * (+pct) / 100);
  }

  /* ---------- 인지세(부동산 소유권 이전 증서 = 매매계약서) — 계약서 1통마다, 보통 사는 사람·파는 사람이 절반씩 ----------
     [기재금액 초과, 이하, 세액]. 주택 계약서는 1억 원 이하면 비과세(제6조 제5호). */
  var STAMP = [[1e7, 3e7, 20000], [3e7, 5e7, 40000], [5e7, 1e8, 70000], [1e8, 1e9, 150000], [1e9, Infinity, 350000]];
  function stampTax(price, house) {
    price = Math.max(0, +price || 0);
    if (house !== false && price <= 1e8) return 0;
    for (var i = 0; i < STAMP.length; i++) if (price > STAMP[i][0] && price <= STAMP[i][1]) return STAMP[i][2];
    return 0;
  }

  /* ---------- 등기신청수수료(소유권 이전, 부동산 1개마다) ---------- */
  var REG_FEE = { paper: 18000, eform: 15000, e: 10000 };
  var REG_NAME = { paper: '등기소에 서류로 신청', eform: '인터넷으로 서류 작성 후 등기소 제출', e: '인터넷등기소 전자신청' };

  /* ---------- 법무사 기본보수(소유권 이전, 과세표준액 기준, 부가세 별도) ----------
     [이 금액까지, 앞 구간 끝 보수, 앞 구간 끝 금액, 초과액에 곱할 1만분의] */
  var SCR = [[5e7, 210000, 0, 0], [1e8, 210000, 5e7, 10], [3e8, 260000, 1e8, 9], [5e8, 440000, 3e8, 8], [1e9, 600000, 5e8, 7], [2e9, 950000, 1e9, 5], [2e10, 1450000, 2e9, 4], [Infinity, 8650000, 2e10, 1]];
  function scrivener(base) {
    base = Math.max(0, +base || 0);
    for (var i = 0; i < SCR.length; i++) if (base <= SCR[i][0]) {
      var fee = Math.floor(SCR[i][1] + (base - SCR[i][2]) * SCR[i][3] / 10000);
      return { fee: fee, vat: Math.floor(fee * 0.1), max: fee + Math.floor(fee * 0.1) };
    }
    return { fee: 0, vat: 0, max: 0 };
  }

  /* ---------- 사는 쪽 부대비용 ----------
     o: { price 매매가(원), std 공시가격(원, 모르면 null), metro 특별시·광역시(bool), own none|first|one|multi, regulated, large(85㎡ 초과),
          discount 채권 할인율 %(모르면 null), method paper|eform|e, self 등기를 직접 하면 true(법무사 0원) }
     돌려줌: { items:[{k, name, v(원|null), lo, hi, note, src}], lo, hi, missing:[항목 이름] } — lo·hi는 값이 있는 항목만 더한 범위 */
  function buyCosts(o) {
    o = o || {};
    var P = Math.max(0, Math.round(+o.price || 0)), items = [], missing = [];
    var t = TAX.buyerAcqTax(P, { own: o.own || 'none', regulated: !!o.regulated, large: !!o.large });
    var acqTotal = t.acq - t.relief + t.edu + t.farm;
    items.push({ k: 'acq', name: '취득세', v: acqTotal, lo: acqTotal, hi: acqTotal,
      note: '세율 ' + (Math.round(t.rate * 10000) / 100) + '%' + (t.heavy ? ' 중과' : '') + ' · 지방교육세' + (t.farm ? '·농어촌특별세' : '') + ' 포함' + (t.relief ? ' · 생애최초 감면 ' + won(t.relief) + ' 뺌' : ''), src: SRC.acq });
    var bf = LOAN.brokerSale(P / 10000), br = Math.round(bf.broker * 10000);
    items.push({ k: 'broker', name: '중개보수', v: br, lo: br, hi: br, note: '법정 상한 ' + bf.br + '% + 부가세 10%(최대 금액). 협의해서 낮출 수 있어요', src: SRC.broker });
    var stamp = stampTax(P, true), half = Math.floor(stamp / 2);
    items.push({ k: 'stamp', name: '인지세(계약서)', v: half, lo: half, hi: stamp,
      note: stamp ? '계약서 1통 ' + won(stamp) + ' — 보통 사는 분·파는 분이 절반씩' : '주택 매매가 1억 원 이하는 비과세', src: SRC.stamp });
    var bd = o.std == null || o.std === '' ? null : bond(o.std, !!o.metro);
    if (!bd) { items.push({ k: 'bond', name: '국민주택채권', v: null, lo: null, hi: null, note: '공시가격을 넣으면 사야 하는 채권 금액을 계산해요', src: SRC.bond }); missing.push('국민주택채권'); }
    else if (bd.none) items.push({ k: 'bond', name: '국민주택채권', v: 0, lo: 0, hi: 0, note: '공시가격 2천만 원 미만은 매입 대상이 아니에요', src: SRC.bond });
    else {
      var bc = bondCost(bd.amount, o.discount);
      items.push({ k: 'bond', name: '국민주택채권 바로 팔 때 부담', v: bc, lo: bc, hi: bc, buy: bd.amount, permil: bd.permil,
        note: '사야 하는 채권 ' + won(bd.amount) + '(공시가격의 1천분의 ' + bd.permil + ')' + (bc == null ? ' — 그날 할인율을 넣으면 부담액을 계산해요' : ' × 할인율 ' + o.discount + '%'), src: SRC.bond });
      if (bc == null) missing.push('채권 할인 비용');
    }
    var m = REG_FEE[o.method] ? o.method : 'e';
    items.push({ k: 'reg', name: '등기신청수수료', v: REG_FEE[m], lo: REG_FEE.e, hi: REG_FEE.paper, note: REG_NAME[m] + ' 기준(부동산 1개). 서류 신청 1만 8천 원 · 전자신청 1만 원', src: SRC.reg });
    var sc = scrivener(P);
    items.push({ k: 'scr', name: '법무사 보수', v: o.self ? 0 : sc.max, lo: 0, hi: sc.max,
      note: o.self ? '직접 등기하면 0원' : '보수기준의 기본보수 ' + won(sc.fee) + ' + 부가세 ' + won(sc.vat) + ' — 법무사마다 달라 미리 견적을 받아 보세요. 서류 대행비가 따로 붙을 수 있어요', src: SRC.scr });
    var lo = 0, hi = 0, val = 0;
    items.forEach(function (x) { if (x.lo != null) lo += x.lo; if (x.hi != null) hi += x.hi; if (x.v != null) val += x.v; });
    return { price: P, items: items, total: val, lo: lo, hi: hi, missing: missing, acq: t, checked: CHECKED };
  }
  /* ---------- 파는 쪽 부대비용(양도세는 세금 계산기에서) ---------- */
  function sellCosts(o) {
    o = o || {};
    var P = Math.max(0, Math.round(+o.price || 0)), items = [];
    var bf = LOAN.brokerSale(P / 10000), br = Math.round(bf.broker * 10000);
    items.push({ k: 'broker', name: '중개보수', v: br, lo: br, hi: br, note: '법정 상한 ' + bf.br + '% + 부가세 10%(최대 금액)', src: SRC.broker });
    var stamp = stampTax(P, true), half = Math.floor(stamp / 2);
    items.push({ k: 'stamp', name: '인지세(계약서)', v: half, lo: half, hi: stamp, note: stamp ? '계약서 1통 ' + won(stamp) + ' — 보통 절반씩' : '주택 매매가 1억 원 이하는 비과세', src: SRC.stamp });
    var lo = 0, hi = 0, val = 0; items.forEach(function (x) { lo += x.lo; hi += x.hi; val += x.v; });
    return { price: P, items: items, total: val, lo: lo, hi: hi };
  }

  /* ---------- 매수 총비용 한 장: 집값 + 부대비용 + 이사비 − 대출 = 필요한 현금 ---------- */
  function totalCash(o) {
    var bc = buyCosts(o), mv = Math.max(0, Math.round(+o.move || 0)), loan = Math.max(0, Math.round(+o.loan || 0));
    var need = bc.price + bc.total + mv - loan;
    return { costs: bc, move: mv, loan: loan, need: Math.max(0, need), needHi: Math.max(0, bc.price + bc.hi + mv - loan), cash: o.cash == null ? null : Math.round(+o.cash), gap: o.cash == null ? null : Math.round(+o.cash) - need };
  }

  /* ---------- 날짜 ---------- */
  function T(iso) { return Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)); }
  function iso(t) { var d = new Date(t); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
  function add(d, n) { return iso(T(d) + n * 864e5); }
  function okDate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && iso(T(String(v))) === String(v); }
  function ko(d) { return d ? (+d.slice(0, 4)) + '년 ' + (+d.slice(5, 7)) + '월 ' + (+d.slice(8, 10)) + '일' : ''; }

  /* ---------- 잔금일 체크리스트 ----------
     o: { mode 'buy'(집을 사요)|'rent'(전세·월세로 들어가요), balance 잔금일(필수), contract 계약일(선택), loan 대출 받음(bool), moveIn 산 집에 들어가 삶(bool) }
     돌려줌: [{ d, t, s, kind:'law'(법정 기한)|'tip'(권장 — 법정 기한 아님), src }] 날짜순 */
  function checklist(o) {
    o = o || {}; var out = [], B = o.balance;
    if (!okDate(B)) return out;
    var C = okDate(o.contract) && o.contract <= B ? o.contract : '';
    var push = function (d, t, s, kind, src) { out.push({ d: d, t: t, s: s, kind: kind, src: src || null }); };
    if (o.mode === 'rent') {
      if (C) push(add(C, 30), '전월세 신고 기한(대상이면)', '계약일부터 30일 안에 주민센터나 부동산거래관리시스템에서 신고해요. 보증금 6천만 원 넘거나 월세 30만 원 넘는 계약이 대상이고, 신고하면 확정일자도 함께 받아져요.', 'law', SRC.rentRep);
      if (o.loan) push(add(B, -30), '전세대출 신청', '은행 심사와 보증 기관 심사에 시간이 걸려요. 보통 잔금 한 달 전쯤 신청하니 거래 은행에 꼭 날짜를 물어보세요(법정 기한은 아니에요).', 'tip');
      push(add(B, -7), '등기부등본 다시 보기', '집주인 이름, 새로 생긴 대출(근저당)·압류가 없는지 다시 확인해요. 인터넷등기소에서 누구나 볼 수 있어요.', 'tip', SRC.iros);
      push(B, '잔금 당일: 등기부 확인 → 잔금 → 전입신고 + 확정일자', '잔금 직전에 등기부를 한 번 더 보고, 이사한 날 바로 전입신고와 확정일자를 받아요. 전입과 이사를 마친 다음 날 0시부터 보증금을 지킬 힘(대항력)이 생겨요.', 'law', SRC.lease);
      push(add(B, 14), '전입신고 마감(늦어도)', '새 주소로 옮긴 날부터 14일 안에 해야 해요. 보증금을 지키려면 이사한 날 바로 하는 게 좋아요.', 'law', SRC.jumin);
    } else {
      if (C) push(add(C, 30), '부동산 거래 신고 기한', '계약일부터 30일 안에 신고해요. 중개사무소를 통해 계약했으면 보통 중개사가 신고해요. 자금조달계획서를 내야 하는 지역·가격이면 같이 내요.', 'law', SRC.deal);
      if (o.loan) push(add(B, -30), '주택담보대출 신청', '은행 심사와 집 가치 평가(감정)에 시간이 걸려요. 보통 잔금 한 달 전쯤 신청하니 거래 은행에 꼭 날짜를 물어보세요(법정 기한은 아니에요).', 'tip');
      push(add(B, -7), '등기부등본 다시 보기 · 관리비 정산 요청', '파는 분 이름, 새로 생긴 대출·압류가 없는지 확인하고, 관리사무소에 잔금일 기준 관리비 정산을 부탁해 두세요.', 'tip', SRC.iros);
      push(B, '잔금 당일: 등기부 확인 → 잔금 → 등기 서류 받기', '잔금 직전에 등기부를 한 번 더 보고, 잔금을 내면서 등기에 필요한 서류를 받아요. 등기할 때 국민주택채권을 사요.', 'tip', SRC.iros);
      if (o.moveIn) push(add(B, 14), '전입신고 마감', '이사한 날부터 14일 안에 전입신고를 해요.', 'law', SRC.jumin);
      push(add(B, 60), '취득세 신고·납부 · 소유권이전등기 신청 기한', '잔금일(취득일)부터 60일 안에 취득세를 신고·납부하고, 소유권이전등기도 60일 안에 신청해야 해요. 보통 잔금 날 법무사가 함께 처리해요.', 'law', SRC.acq);
      var y = B.slice(0, 4), b61 = y + '-06-01';
      if (Math.abs((T(B) - T(b61)) / 864e5) <= 31) push(b61, '6월 1일 — 그해 재산세·종부세 내는 사람이 정해지는 날', '잔금일이 6월 1일이거나 그 전이면 산 분이, 6월 2일부터면 판 분이 그해 재산세·종부세를 내요(잔금 전에 등기를 먼저 하면 등기일 기준).', 'law', SRC.base61);
    }
    out.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
    return out;
  }

  /* ---------- 달력 파일(.ics) — 하루 종일 일정, 알림은 하루 전 ---------- */
  function icsEsc(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function icsFold(line) { var out = '', s = line; while (utf8Len(s) > 74) { var n = 0, i = 0; for (; i < s.length; i++) { var l = utf8Len(s[i]); if (n + l > 74) break; n += l; } out += s.slice(0, i) + '\r\n '; s = s.slice(i); } return out + s; }
  function utf8Len(s) { var n = 0; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xD800 && c <= 0xDBFF) ? (i++, 4) : 3; } return n; }
  /** events: [{d, t, s, url}] → .ics 글자 */
  function ics(events, calName, stamp) {
    var st = (stamp || '20261126T000000Z');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//zipyebo//checklist//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEsc(calName || '집예보 일정')];
    (events || []).forEach(function (e, i) {
      if (!okDate(e.d)) return;
      var d = e.d.replace(/-/g, ''), d2 = add(e.d, 1).replace(/-/g, '');
      L.push('BEGIN:VEVENT', 'UID:' + d + '-' + i + '-' + hash(e.t) + '@zipyebo', 'DTSTAMP:' + st, 'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + d2,
        'SUMMARY:' + icsEsc(e.t), 'DESCRIPTION:' + icsEsc((e.s || '') + (e.url ? '\n근거: ' + e.url : '')));
      if (e.url) L.push('URL:' + e.url);
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.t), 'TRIGGER:-P1D', 'END:VALARM', 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(icsFold).join('\r\n') + '\r\n';
  }
  function hash(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36); }

  function won(v) {
    v = Math.round(+v || 0); if (!v) return '0원';
    var neg = v < 0; v = Math.abs(v);
    var e = Math.floor(v / 1e8), m = Math.floor((v % 1e8) / 1e4), r = v % 1e4;
    var s = (e ? e.toLocaleString('ko-KR') + '억' : '') + (m ? (e ? ' ' : '') + m.toLocaleString('ko-KR') + '만' : '') + (r && !e ? (e || m ? ' ' : '') + r.toLocaleString('ko-KR') : '');
    return (neg ? '−' : '') + s + '원';
  }

  var api = { SRC: SRC, CHECKED: CHECKED, BOND: BOND, STAMP: STAMP, REG_FEE: REG_FEE, SCR: SCR, bond: bond, bondCost: bondCost, stampTax: stampTax, scrivener: scrivener,
    buyCosts: buyCosts, sellCosts: sellCosts, totalCash: totalCash, checklist: checklist, ics: ics, add: add, okDate: okDate, ko: ko, won: won };
  root.JDJ_CLOSING = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
