/* 주택 수 판정 도우미 — 세목(취득세·양도세·종부세)마다 '주택 수'를 따로 세어 이유와 조문을 붙여요. 화면: /tax/count/
   계산만 하고, 입력값은 이 기기 밖으로 보내지 않아요. 확인일 2026-11-26.
   한 줄(item)마다: { kind: 'house'(아파트·빌라·단독 등 주택) | 'presale'(분양권) | 'ticket'(조합원 입주권) | 'offi'(오피스텔),
     since: 'pre0812'(2020.8.11 이전 취득) | 'h2020'(2020.8.12~12.31 취득) | 'y2021'(2021.1.1 이후 취득),
     inh: 'no' | 'in5'(상속받은 지 5년 안) | 'over5'(5년 지남),
     price: 'le1'(공시가격·시가표준액 1억 이하) | 'le3'(1억 초과 3억 이하) | 'gt3'(3억 초과),
     area: 'metro'(수도권·광역시·특별자치시의 동 지역) | 'rural'(그 밖 — 도 지역, 광역시·특별자치시의 군·읍·면),
     redev: 정비구역(재개발·재건축 등) 안(bool), rent: 임대사업자 등록 + 종부세 합산배제 신고(bool),
     taxHome: 오피스텔 재산세를 '주택'으로 내요 'y'|'n'|'?', live: 오피스텔에 사람이 살아요(전입 포함) 'y'|'n'|'?', small: 2024.1.10 이후 산 전용 60㎡ 이하 소형 오피스텔(bool) }
   결과 상태: 'in'(주택 수에 들어가요) · 'out'(빠져요) · 'check'(조건에 따라 달라요 — 세무서·세무사 확인)
   이 파일의 규칙은 아래 조문을 그대로 옮긴 것만 써요. 조문이 '중과 제외'(세율만 낮아짐)인 것과 '주택 수 제외'인 것을 섞지 않아요. */
(function (root) {
  'use strict';
  var AS_OF = '2026-11-26';
  var LAW = {
    acqHouse: { nm: '지방세법 제13조의3(주택 수의 판단 범위)', url: 'https://www.law.go.kr/법령/지방세법' },
    acqCount: { nm: '지방세법 시행령 제28조의4(주택 수의 산정방법)', url: 'https://www.law.go.kr/법령/지방세법시행령' },
    acqLow: { nm: '지방세법 시행령 제28조의4 제6항 제1호·제28조의2 제1호(시가표준액 1억 원 이하, 정비구역 밖)', url: 'https://www.law.go.kr/법령/지방세법시행령' },
    acqInh: { nm: '지방세법 시행령 제28조의4 제6항 제3호(상속개시일부터 5년 안)', url: 'https://www.law.go.kr/법령/지방세법시행령' },
    acqOffiLow: { nm: '지방세법 시행령 제28조의4 제6항 제4호(시가표준액 1억 원 이하 오피스텔)', url: 'https://www.law.go.kr/법령/지방세법시행령' },
    acqOffiSmall: { nm: '지방세법 시행령 제28조의4 제6항 제8호·제9호(2024.1.10~2027.12.31 소형 오피스텔)', url: 'https://www.law.go.kr/법령/지방세법시행령' },
    acqSince: { nm: '지방세법 부칙(법률 제17474호, 2020.8.12 시행) — 2020.8.12 이후 취득한 입주권·분양권·오피스텔부터', url: 'https://www.law.go.kr/법령/지방세법' },
    cgtHouse: { nm: '소득세법 제88조 제7호(주택 = 실제 주거용으로 쓰는 건물)', url: 'https://www.law.go.kr/법령/소득세법' },
    cgtRight: { nm: '소득세법 제89조 제2항(조합원입주권·분양권이 있으면 비과세 제한)', url: 'https://www.law.go.kr/법령/소득세법' },
    cgtInh: { nm: '소득세법 시행령 제155조 제2항(상속받은 집과 일반 주택)', url: 'https://www.law.go.kr/법령/소득세법시행령' },
    cgtRent: { nm: '소득세법 시행령 제155조 제20항(장기임대주택과 거주주택)', url: 'https://www.law.go.kr/법령/소득세법시행령' },
    cgtHeavy: { nm: '소득세법 제104조 제7항, 시행령 제167조의3 제1항 제1호·제167조의10 제1항 제1호(지방 기준시가 3억 원 이하 주택은 주택 수에서 뺌)', url: 'https://law.go.kr/lsLinkCommonInfo.do?lspttninfSeq=132787' },
    cgtHeavyEx: { nm: '소득세법 시행령 제167조의3 제1항 각 호(장기임대·상속 5년 안 등은 이 집을 팔 때 중과 제외)', url: 'https://www.law.go.kr/법령/소득세법시행령' },
    cptHouse: { nm: '종합부동산세법 제2조 제3호(재산세 과세 대상 주택)', url: 'https://www.law.go.kr/법령/종합부동산세법' },
    cpt1: { nm: '종합부동산세법 제8조 제4항(일시적 2주택·상속주택·지방 저가주택이 있어도 1세대 1주택자로 봄 — 9월 신청)', url: 'https://www.law.go.kr/법령/종합부동산세법' },
    cptCount: { nm: '종합부동산세법 시행령 제4조의3 제3항 제3호(세율을 정할 때 주택 수에서 빼는 주택)', url: 'https://www.law.go.kr/법령/종합부동산세법시행령' },
    cptRent: { nm: '종합부동산세법 제8조 제2항, 시행령 제2조의3 제2항 제1호(합산배제 임대주택)', url: 'https://www.law.go.kr/법령/종합부동산세법시행령' }
  };
  var KIND = { house: '주택', presale: '분양권', ticket: '조합원 입주권', offi: '오피스텔' };
  var TAXES = [
    { k: 'acq', name: '취득세', when: '새 집을 사는 날(잔금일) 기준', calc: '../#acq', calcName: '취득세 계산' },
    { k: 'cgt', name: '양도세 비과세(1세대 1주택)', when: '파는 날(잔금일) 기준', calc: '../#cgt', calcName: '양도세 · 매도 타이밍' },
    { k: 'heavy', name: '양도세 중과(다주택)', when: '파는 날(잔금일) 기준 · 조정대상지역 집을 팔 때만 따져요', calc: '../#order', calcName: '다주택 매도 순서 비교' },
    { k: 'cpt', name: '종부세 세율', when: '6월 1일 기준 · 명의자 한 사람씩', calc: '../#cpt', calcName: '종합부동산세 계산' }
  ];
  function R(st, why, law) { return { st: st, why: why, law: law ? [].concat(law).map(function (k) { return LAW[k]; }) : [] }; }

  /* 오피스텔이 주택인지: 취득세·종부세는 재산세를 주택으로 내는지(공부·과세 기준), 양도세는 실제로 사람이 사는지(사실상 용도) */
  function offiTaxHome(it) { return it.taxHome === 'y' ? 'y' : it.taxHome === 'n' ? 'n' : '?'; }
  function offiLive(it) { return it.live === 'y' ? 'y' : it.live === 'n' ? 'n' : '?'; }

  /* ---------- 취득세: 새 집을 살 때 이미 가진 것 중 무엇을 세나 ---------- */
  function acqOf(it) {
    var lateRight = it.since === 'h2020' || it.since === 'y2021';
    if (it.kind === 'house') {
      if (it.inh === 'in5') return R('out', '상속받은 지 5년이 안 된 집은 빼고 세요.', 'acqInh');
      if (it.price === 'le1' && !it.redev) return R('out', '공시가격 1억 원 이하(재개발·재건축 구역 밖) 집은 빼고 세요.', 'acqLow');
      if (it.price === 'le1' && it.redev) return R('in', '공시가격 1억 원 이하라도 재개발·재건축 구역 안이면 세요.', 'acqLow');
      if (it.rent) return R('check', '임대 등록 주택은 원칙적으로 세요. 다만 일부 공공지원 임대 등은 빠질 수 있어 확인이 필요해요.', 'acqCount');
      return R('in', '가진 주택은 세대 전체를 합쳐 세요.', 'acqCount');
    }
    if (it.kind === 'presale' || it.kind === 'ticket') {
      if (!lateRight) return R('out', '2020년 8월 11일까지 얻은 ' + KIND[it.kind] + '은 세지 않아요.', 'acqSince');
      if (it.inh === 'in5') return R('out', '상속받은 지 5년이 안 된 ' + KIND[it.kind] + '은 빼고 세요.', 'acqInh');
      return R('in', '2020년 8월 12일 이후 얻은 ' + KIND[it.kind] + '은 아직 집이 아니어도 주택 수에 들어가요.', ['acqHouse', 'acqSince']);
    }
    if (it.kind === 'offi') {
      if (!lateRight) return R('out', '2020년 8월 11일까지 산 오피스텔은 세지 않아요.', 'acqSince');
      var th = offiTaxHome(it);
      if (th === 'n') return R('out', '재산세를 주택이 아닌 건물로 내는(업무용) 오피스텔은 세지 않아요.', 'acqHouse');
      if (th === '?') return R('check', '재산세 고지서에 "주택"으로 나오면 세고, 아니면 빼요. 고지서를 확인해 주세요.', 'acqHouse');
      if (it.inh === 'in5') return R('out', '상속받은 지 5년이 안 된 오피스텔은 빼고 세요.', 'acqInh');
      if (it.price === 'le1') return R('out', '시가표준액 1억 원 이하 오피스텔은 빼고 세요.', 'acqOffiLow');
      if (it.small) return R('check', '2024년 1월 10일~2027년 12월 31일에 산 전용 60㎡ 이하 소형 오피스텔은 신축을 처음 샀거나 60일 안에 임대 등록했으면 빠져요. 조건이 많아 확인이 필요해요.', 'acqOffiSmall');
      return R('in', '재산세를 주택으로 내는(주거용) 오피스텔은 주택 수에 들어가요.', 'acqHouse');
    }
    return R('out', '', null);
  }
  /* ---------- 양도세 1세대 1주택 비과세 판정 ---------- */
  function cgtOf(it) {
    if (it.kind === 'house') {
      if (it.inh === 'in5' || it.inh === 'over5') return R('check', '상속받기 전부터 가진 집을 팔 때는 상속받은 집을 없는 것으로 보는 특례가 있어요(언제 받았는지와 상관없이). 다른 경우엔 세요.', 'cgtInh');
      if (it.rent) return R('check', '장기임대주택으로 등록해 요건을 채우면, 2년 이상 산 거주주택을 팔 때 빼고 볼 수 있어요. 요건이 많아 확인이 필요해요.', 'cgtRent');
      return R('in', '집값·지역과 관계없이 세요(지방 저가주택도 비과세 판정에는 들어가요).', 'cgtHouse');
    }
    if (it.kind === 'ticket') return R('in', '조합원 입주권이 있으면 1세대 1주택 비과세가 제한돼요. 주택처럼 따져요.', 'cgtRight');
    if (it.kind === 'presale') {
      if (it.since === 'y2021') return R('in', '2021년 1월 1일 이후 얻은 분양권은 주택처럼 따져요.', 'cgtRight');
      return R('out', '2020년 12월 31일까지 얻은 분양권은 세지 않아요.', 'cgtRight');
    }
    if (it.kind === 'offi') {
      var lv = offiLive(it);
      if (lv === 'y') return R('in', '서류상 업무시설이어도 실제로 사람이 살면(전입 포함) 주택으로 봐요.', 'cgtHouse');
      if (lv === 'n') return R('out', '실제로 사무실 등 업무용으로만 쓰면 주택이 아니에요.', 'cgtHouse');
      return R('check', '실제로 사람이 사는지로 판단해요. 세입자가 전입해 살고 있으면 주택이에요.', 'cgtHouse');
    }
    return R('out', '', null);
  }
  /* ---------- 양도세 중과(다주택) 판정: 주택 수에서 '빼는' 것과 '중과만 안 하는' 것을 구분 ---------- */
  function heavyOf(it) {
    var low3 = it.price === 'le1' || it.price === 'le3';
    if (it.kind === 'house') {
      if (it.area === 'rural' && low3) return R('out', '수도권·광역시·특별자치시(군·읍·면 제외) 밖의 기준시가 3억 원 이하 집은 중과 판정 주택 수에서 빼요.', 'cgtHeavy');
      if (it.inh === 'in5' || it.rent) return R('in', '주택 수에는 들어가요. 다만 이 집을 팔 때는 중과하지 않을 수 있어요(' + (it.rent ? '장기임대' : '상속 5년 안') + ').', ['cgtHeavy', 'cgtHeavyEx']);
      return R('in', '중과 여부를 정할 때 세요.', 'cgtHeavy');
    }
    if (it.kind === 'ticket') {
      if (it.area === 'rural' && low3) return R('out', '지방의 3억 원 이하(종전 주택 가격 기준) 입주권은 빼요.', 'cgtHeavy');
      return R('in', '조합원 입주권은 주택 수에 들어가요.', 'cgtHeavy');
    }
    if (it.kind === 'presale') {
      if (it.since !== 'y2021') return R('out', '2020년 12월 31일까지 얻은 분양권은 세지 않아요.', 'cgtHeavy');
      if (it.area === 'rural' && low3) return R('out', '지방의 3억 원 이하(공급가격 기준) 분양권은 빼요.', 'cgtHeavy');
      return R('in', '2021년 1월 1일 이후 얻은 분양권은 주택 수에 들어가요.', 'cgtHeavy');
    }
    if (it.kind === 'offi') {
      var c = cgtOf(it); if (c.st !== 'in') return c;
      if (it.area === 'rural' && low3) return R('out', '실제 주거용이어도 지방의 기준시가 3억 원 이하면 빼요.', 'cgtHeavy');
      return R('in', '실제로 사람이 사는 오피스텔은 주택 수에 들어가요.', ['cgtHouse', 'cgtHeavy']);
    }
    return R('out', '', null);
  }
  /* ---------- 종부세(세율 정할 때 주택 수, 명의자 기준) — 1세대 1주택 특례는 전체를 보고 결론에서 ---------- */
  function cptOf(it) {
    if (it.kind === 'presale') return R('out', '분양권은 아직 집이 아니라 종부세 주택 수에 들어가지 않아요.', 'cptHouse');
    if (it.kind === 'ticket') return R('out', '입주권은 집이 헐린 뒤 땅으로 과세돼 주택 수에 들어가지 않아요(집이 남아 있으면 확인 필요).', 'cptHouse');
    if (it.kind === 'offi') {
      var th = offiTaxHome(it);
      if (th === 'y') return R('in', '재산세를 주택으로 내는 오피스텔은 종부세 주택이에요.', 'cptHouse');
      if (th === 'n') return R('out', '재산세를 업무용 건물로 내면 종부세 주택이 아니에요.', 'cptHouse');
      return R('check', '재산세 고지서에 "주택"으로 나오면 세요.', 'cptHouse');
    }
    if (it.kind === 'house') {
      if (it.rent) return R('out', '임대 등록 후 9월에 합산배제 신고를 한 임대주택은 빼요(요건을 채워야 해요).', 'cptRent');
      if (it.inh === 'in5') return R('out', '상속받은 지 5년이 안 된 집은 세율을 정할 때 빼요(신고 필요).', 'cptCount');
      if (it.inh === 'over5') return R('check', '5년이 지나도 상속 지분 40% 이하이거나 지분 공시가격이 수도권 6억·그 밖 3억 원 이하면 빼요.', 'cptCount');
      return R('in', '명의자가 가진 주택은 세요(공동명의는 각자 1채로).', 'cptHouse');
    }
    return R('out', '', null);
  }

  /** items → { taxes: [{k, name, when, n(확실히 세는 수), nMax(확인 필요까지 넣은 수), rows:[{i, st, why, law}], note, calc}], items } */
  function judge(items, opt) {
    items = (items || []).filter(function (x) { return x && KIND[x.kind]; }).slice(0, 12);
    opt = opt || {};
    var F = { acq: acqOf, cgt: cgtOf, heavy: heavyOf, cpt: cptOf };
    var out = TAXES.map(function (t) {
      var rows = items.map(function (it, i) { var r = F[t.k](it); r.i = i; return r; });
      var n = rows.filter(function (r) { return r.st === 'in'; }).length, nMax = n + rows.filter(function (r) { return r.st === 'check'; }).length;
      return { k: t.k, name: t.name, when: t.when, calc: t.calc, calcName: t.calcName, n: n, nMax: nMax, rows: rows, note: '' };
    });
    var by = {}; out.forEach(function (t) { by[t.k] = t; });
    /* 취득세: 새로 사는 집을 더해 몇 번째 집인지 */
    if (opt.buying) { by.acq.after = by.acq.n + 1; by.acq.afterMax = by.acq.nMax + 1;
      by.acq.note = '새로 사는 집을 더하면 ' + rng(by.acq.after, by.acq.afterMax) + '번째 집이에요. 취득세 계산의 "사고 나면 세대의 주택 수"에 이 숫자를 넣어 주세요.'; }
    else by.acq.note = '새 집을 사면 이 숫자에 1을 더해 몇 번째 집인지 정해요.';
    /* 양도세 비과세 */
    by.cgt.note = by.cgt.nMax <= 1 && by.cgt.n <= 1 ? (by.cgt.n === 1 ? '1세대 1주택이에요. 2년 보유(취득 때 조정대상지역이면 2년 거주) 요건을 채우면 비과세를 받을 수 있어요.' : '양도세 비과세를 따질 주택이 없어요.')
      : by.cgt.n >= 2 ? '2채 이상으로 봐요. 일시적 2주택 같은 특례에 해당하지 않으면 비과세가 안 될 수 있어요.' : '확인 필요한 것에 따라 1채가 될 수도, 2채 이상이 될 수도 있어요.';
    /* 양도세 중과 */
    by.heavy.note = by.heavy.nMax <= 1 ? '중과 대상이 아니에요(1채 이하).' : by.heavy.n >= 3 ? '3채 이상으로 봐요. 조정대상지역 집을 팔면 기본세율에 30%p를 더할 수 있어요(중과 제외 주택은 빼요).' : by.heavy.n === 2 ? '2채로 봐요. 조정대상지역 집을 팔면 기본세율에 20%p를 더할 수 있어요(중과 제외 주택은 빼요).' : '확인 필요한 것에 따라 중과 여부가 달라져요.';
    /* 종부세 1세대 1주택 특례: 일반 주택 1채 + 지방 저가주택(공시 3억 이하, 1채) 또는 상속주택 → 1세대 1주택자로 봄(9월 신청) */
    var cp = by.cpt, inRows = cp.rows.filter(function (r) { return r.st === 'in'; });
    var ruralLow = items.map(function (it, i) { return it.kind === 'house' && it.area === 'rural' && (it.price === 'le1' || it.price === 'le3') && cp.rows[i].st === 'in' ? i : -1; }).filter(function (i) { return i >= 0; });
    if (cp.n === 2 && ruralLow.length === 1) {
      cp.rows[ruralLow[0]] = Object.assign(R('out', '다른 집 1채와 함께 가진 지방 저가주택(공시가격 3억 원 이하) 1채는 1세대 1주택 특례로 빼요(9월 16~30일 신청).', ['cpt1', 'cptCount']), { i: ruralLow[0] });
      cp.n = 1; cp.nMax -= 1; cp.special = true;
    }
    cp.note = cp.n <= 1 && cp.nMax <= 1 ? (cp.n === 1 ? '1채로 봐요. 세대원 모두 다른 집이 없으면 1세대 1주택 공제(12억 원)와 나이·보유 공제를 받을 수 있어요' + (cp.special ? '(특례 신청 필요).' : '.') : '종부세 주택이 없어요.')
      : cp.n >= 3 ? '3채 이상이에요. 공시가격 합계가 공제를 넘으면 높은 세율표가 적용돼요.' : cp.n === 2 ? '2채예요. 9억 원 공제, 2주택 이하 세율표를 써요.' : '확인 필요한 것에 따라 달라져요.';
    cp.note += ' 종부세는 명의자 한 사람씩 따로 세요(1세대 1주택 판정만 세대 기준).';
    return { asOf: AS_OF, taxes: out, items: items };
  }
  function rng(a, b) { return a === b ? a + '' : a + '~' + b; }

  /* 오피스텔 함정 — 화면에 쉬운 말로 보여 주는 예시(숫자 없이, 조문 기준) */
  var TRAP = {
    title: '오피스텔 때문에 비과세가 깨지는 경우',
    story: ['아파트 한 채를 오래 갖고 살다가 팔면서 "1주택이니 비과세"라고 생각했어요.',
      '그런데 자녀가 학교 근처 오피스텔에 전입해서 살고 있었어요. 서류(건축물대장)에는 업무시설로 적혀 있었지요.',
      '양도세는 서류가 아니라 실제로 어떻게 쓰는지로 봐요. 사람이 살았으니 이 오피스텔은 주택이 되고, 세대는 2주택이 돼요.',
      '그래서 아파트 비과세가 안 되고, 신고하지 않은 만큼 가산세까지 붙을 수 있어요.'],
    tip: '팔기 전에 오피스텔·분양권·입주권까지 세대 전체를 이 도우미로 한 번 세어 보고, 걸리는 것이 있으면 세무서(국번 없이 126)나 세무사에게 확인하세요.',
    law: [LAW.cgtHouse]
  };

  var api = { AS_OF: AS_OF, LAW: LAW, KIND: KIND, TAXES: TAXES, TRAP: TRAP, acqOf: acqOf, cgtOf: cgtOf, heavyOf: heavyOf, cptOf: cptOf, judge: judge };
  root.JDJ_HCOUNT = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
