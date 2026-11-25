/* HUG 전세보증금반환보증 가입 가능성·예상 보증료 계산(정보 제공용 — 가입·심사는 HUG 가 해요). 브라우저 window.JDJ_HUG, node require 둘 다.
   규칙 출처(2026-11-25 확인): 주택도시보증공사 '전세반환보증 상품개요'(https://www.khug.or.kr/hug/web/ig/dr/igdr000001.jsp)
     · 보증금: 수도권 7억 원 이하, 그 외 5억 원 이하
     · 보증한도: 주택가격 × 전세가율(90%) − 선순위채권 등 / 선순위채권이 주택가격의 60% 이내
     · 주택가격(아파트): KB시세·부동산원 시세 → 없으면 공시가격의 140% … (연립·다세대·단독은 공시가격 140%가 첫 순위)
       → 공시가격으로 보면 보증금 + 선순위채권 ≤ 공시가격 × 140% × 90% = 126%
     · 가입 시기: 계약기간의 1/2 이 지나기 전
     · 보증료 = 보증금액 × 보증료율 × 계약기간(일) / 365
     · 부채비율 = (선순위 채권금액 + 전세보증금) / (주택가격 × 전세가율 90%)
     · 선순위채권금액이 주택가격 × 90% 의 50% 를 넘으면 보증료 10% 할증
     · 단독·다중·다가구로 타 전세계약확인서를 내지 않으면 그 보증금 구간 최고요율
     · 할인(중복 안 됨): 60%(연소득 5천만 원 이하 가구·1인 고령·한부모 등), 40%(다자녀·장애인·신혼부부 등)
   보증료율 표는 같은 날 서울주거포털(housing.seoul.go.kr 전세보증금반환보증 안내)의 표와 칸마다 같은지도 맞춰 봤어요.
   금액 단위: 만원. */
(function (root) {
  'use strict';
  const SRC = { name: '주택도시보증공사(HUG) 전세반환보증 상품개요', url: 'https://www.khug.or.kr/hug/web/ig/dr/igdr000001.jsp',
    apply: 'https://onestop.khug.or.kr/view/biz/apply/goods001', checked: '2026-11-25' };   // apply = HUG 전세보증반환 가입신청(예상 보증료 보기)
  const CAP = { metro: 70000, other: 50000 };       // 보증금 한도(만원)
  const PRICE_PUB = 1.4, RATIO = 0.9, SENIOR_MAX = 0.6, SURCHARGE = 0.1, SURCHARGE_AT = 0.5;
  /* 보증료율(연 %) — [보증금 구간 끝(만원), 아파트 [70% 이하, 80% 이하, 80% 초과], 기타 [같은 순서]] */
  const RATES = [
    [10000, [0.097, 0.117, 0.137], [0.111, 0.142, 0.172]],
    [20000, [0.102, 0.124, 0.146], [0.117, 0.151, 0.184]],
    [50000, [0.107, 0.131, 0.154], [0.124, 0.161, 0.197]],
    [Infinity, [0.113, 0.138, 0.164], [0.132, 0.172, 0.211]]
  ];
  const DISCOUNTS = [0, 0.4, 0.6];
  const METRO = ['서울특별시', '경기도', '인천광역시'];
  const isMetro = sido => METRO.includes(String(sido || ''));

  /** 주택가격: KB시세 등(kb, 아파트·오피스텔)을 넣었으면 그것, 아니면 공시가격 × 140% */
  function housePrice(o) {
    const kb = +o.kb || 0, pub = +o.pub || 0;
    if (kb > 0 && (o.type === 'apt' || o.type === 'offi')) return { v: kb, by: 'kb' };
    if (pub > 0) return { v: pub * PRICE_PUB, by: 'pub' };
    return null;
  }
  /** 보증료율: dep 보증금, type 'apt'|기타, debt 부채비율(0~1) */
  function rateOf(dep, type, debt, worst) {
    const row = RATES.find(r => dep <= r[0]) || RATES[RATES.length - 1];
    const col = type === 'apt' ? row[1] : row[2];
    if (worst) return col[2];
    return debt <= 0.7 ? col[0] : debt <= 0.8 ? col[1] : col[2];
  }
  /** 계약기간(개월) → 일수: 시작일을 주면 실제 날짜 차이, 아니면 개월 × 365 / 12 반올림(2년 = 730일) */
  function daysOf(months, start) {
    months = +months || 0; if (!(months > 0)) return 0;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start || '');
    if (m) { const a = Date.UTC(+m[1], +m[2] - 1, +m[3]), b = Date.UTC(+m[1], +m[2] - 1 + months, +m[3]); return Math.round((b - a) / 864e5); }
    return Math.round(months * 365 / 12);
  }
  /** 가입 가능성 점검 + 예상 보증료.
      o = {dep 보증금, senior 선순위채권, pub 공시가격, kb KB시세 등(선택), type 'apt'|'offi'|'villa'|'house', metro true/false, months 계약기간, start(선택), disc 0|0.4|0.6, multi 단독·다가구 타 전세계약확인서 안 냄}
      돌려줌 {ok 모두 통과, checks:[{k, ok, t 설명, need}], price, by, limit 주택가격×90%, maxDep 이 조건에서 가능한 최대 보증금, debt, rate, fee, feeBase, sur, days} */
  function check(o) {
    o = o || {};
    const dep = Math.max(0, +o.dep || 0), senior = Math.max(0, +o.senior || 0), hp = housePrice(o);
    const cap = o.metro ? CAP.metro : CAP.other;
    const checks = [];
    checks.push({ k: 'cap', ok: dep > 0 && dep <= cap, val: dep, lim: cap });
    if (!hp) return { ok: null, checks, price: null, need: 'pub' };
    const limit = hp.v * RATIO;
    checks.push({ k: 'limit', ok: dep + senior <= limit, val: dep + senior, lim: limit });
    checks.push({ k: 'senior', ok: senior <= hp.v * SENIOR_MAX, val: senior, lim: hp.v * SENIOR_MAX });
    const ok = checks.every(c => c.ok);
    const debt = limit > 0 ? (senior + dep) / limit : Infinity;
    const maxDep = Math.max(0, Math.min(cap, Math.floor(limit - senior + 1e-6)));   // 1e-6: 22,000 × 1.4 × 0.9 = 27,719.999… 같은 소수 오차
    const days = daysOf(o.months || 24, o.start);
    let rate = null, feeBase = null, fee = null, sur = false;
    if (ok && dep > 0 && days > 0) {
      rate = rateOf(dep, o.type === 'apt' ? 'apt' : 'etc', debt, !!o.multi);
      feeBase = dep * 10000 * rate / 100 * days / 365;                  // 원
      sur = senior > limit * SURCHARGE_AT;
      const withSur = feeBase * (sur ? 1 + SURCHARGE : 1);
      const disc = DISCOUNTS.includes(+o.disc) ? +o.disc : 0;
      fee = Math.round(withSur * (1 - disc));
      feeBase = Math.round(feeBase);
    }
    return { ok, checks, price: Math.round(hp.v), by: hp.by, limit: Math.round(limit), maxDep, debt, rate, fee, feeBase, sur, days, cap };
  }
  const API = { SRC, CAP, PRICE_PUB, RATIO, SENIOR_MAX, RATES, DISCOUNTS, isMetro, housePrice, rateOf, daysOf, check };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_HUG = API;
})(typeof window !== 'undefined' ? window : this);
