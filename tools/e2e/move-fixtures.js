/* 이사 견적 받기(숨김 기능) 화면 점검용 가짜 서버 응답(운영자 미리 보기 상태) — tools/e2e/run.js 여정 move 가 써요.
   사람·업체 이름·번호는 모두 지어낸 시험 값이에요. */
'use strict';
const C = require('../../assets/move-core.js');
const T = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const RULE = JSON.parse(JSON.stringify(C.MV_RULE));
const cfg = { ok: true, open: false, preview: true, admin: true, paid: false, billing: false, rule: RULE, report: C.MV_REPORT, elev: C.MV_ELEV,
  permit: { trans: '화물자동차 운송사업', broker: '화물자동차 운송주선사업' }, terms: '2026-11-25 초안', consentV: 'move-2026-11-25', consent: '견적을 위해 제휴 이사업체 최대 3곳에 연락처가 전달돼요',
  agree: { terms: '이사업체 제휴 약관', privacy: '개인정보 수집·이용', points: '포인트·환불 규칙' }, today: T };
const me = { id: 'V00000000A', st: '승인', name: '한결이사', ceo: '정한결', biz: '220-81-62517', permitKind: '화물자동차 운송주선사업', permit: '서울강남-주선-2021-0007', insNo: 'INS-2026-0007', insFile: false, insUntil: C.mvAddDays(T, 300),
  gus: [{ g: '11680', n: '강남구' }, { g: '11650', n: '서초구' }, { g: '11710', n: '송파구' }], tel: '02-555-0107', mail: 'move@example.com', intro: '강남·서초 포장이사 12년', applied: C.mvAddDays(T, -9), approved: C.mvAddDays(T, -7),
  warn: 0, stopUntil: '', live: true, free: 7, freeUntil: C.mvAddDays(T, 22), rating: 4.6, rn: 9, resp: 82, contract: 41 };
const leads = [
  { id: 'M0000000A1', at: '오늘 09:12', from: '강남구 대치동', to: '송파구 잠실동', date: C.mvAddDays(T, 14), size: 'h', elev: 'y', memo: '', price: 8000, openN: 1, mine: false, name: '홍*동', tel: '010-****-5678', gone: false, openedAt: '', paidBy: '', rep: '', repDone: '', canReport: false },
  { id: 'M0000000A2', at: '오늘 08:40', from: '서초구 반포동', to: '경기 성남시 분당구 정자동', date: C.mvAddDays(T, 30), size: 'l', elev: 'n', memo: '', price: 15000, openN: 2, mine: false, name: '김*', tel: '010-****-2210', gone: false, openedAt: '', paidBy: '', rep: '', repDone: '', canReport: false },
  { id: 'M0000000A3', at: '어제 19:05', from: '송파구 가락동', to: '강동구 고덕동', date: C.mvAddDays(T, 6), size: 's', elev: 'u', memo: '오후 통화가 편해요', price: 3000, openN: 3, mine: true, name: '이수진', tel: '01033334444', gone: false, openedAt: '어제 19:20', paidBy: '무료', rep: '', repDone: '', canReport: true }
];
const partner = { ok: true, cfg, me, points: 42000, ledger: [{ at: T + ' 09:30', kind: '무료 열람', pts: 0, free: -1, memo: '소형' }, { at: C.mvAddDays(T, -7) + ' 10:00', kind: '무료 열람 지급', pts: 0, free: 10, memo: '첫 달 무료 열람' }, { at: C.mvAddDays(T, -3) + ' 14:00', kind: '운영자 조정', pts: 42000, free: 0, memo: '시험' }],
  reviews: [{ star: 5, text: '약속 시간보다 일찍 와서 꼼꼼하게 포장해 주셨어요.', date: C.mvAddDays(T, -4), size: '가정' }] };
const mine = { ok: true, items: [{ id: 'M0000000B1', date: C.mvAddDays(T, -2), size: 'h', from: '강남구 역삼동', to: '서초구 서초동', st: '마감', opened: [{ id: 'V00000000A', name: '한결이사', tel: '02-555-0107' }, { id: 'V00000000B', name: '바른이사', tel: '02-555-0201' }], reviewOpen: true, review: null }] };
const queue = { ok: true, open: false, paid: false, keyReady: false, reviewTpl: false, settings: { rule: RULE, bad: [] },
  tpl: { ban: [{ k: 'permit', name: '허가 취소·영업 정지·폐업', body: '허가 취소·사업 정지나 폐업이 확인됐어요.' }, { k: 'misuse', name: '연락처 목적 외 사용', body: '견적 요청 연락처를 다른 목적에 쓴 것이 확인됐어요.' }],
    strike: [{ k: 'complaint', name: '고객 민원', body: '고객 민원이 접수돼 확인했어요.' }, { k: 'noshow', name: '연락 없음', body: '연락처를 열람하고도 연락하지 않았어요.' }] },
  week: { leads: 23, opened: 51, full: 14, none: 2 },
  apps: [Object.assign({}, me, { id: 'V00000000C', st: '검토대기', name: '새길이사', ceo: '오새길', chk: '자동 확인 키(DATA_GO_KR_KEY)가 없어 운영자 확인만', img: '', mail: 'ne***@example.com', free: 0, rating: null, rn: 0, resp: null, contract: null })],
  reports: [{ pid: 'V00000000A', name: '한결이사', lid: 'M0000000A9', why: 'wrong', at: T + ' 11:02', paidBy: '포인트', amt: 8000, mask: '010-****-9911', others: 2, otherReps: 2 }],
  live: [Object.assign({ points: 42000 }, me), Object.assign({}, me, { id: 'V00000000D', name: '늘봄이사', rating: 2.7, rn: 6, resp: 40, contract: 10, warn: 1, points: 3000 })],
  low: [Object.assign({}, me, { id: 'V00000000D', name: '늘봄이사', rating: 2.7, rn: 6, resp: 40, contract: 10, warn: 1 })] };
const PREVIEW_INIT = `try{localStorage.setItem('jdj_auth', JSON.stringify({ s: '${'e2e0'.repeat(16)}', nick: '시험회원', exp: '2099-12-31' })); localStorage.setItem('jdj_mv_preview','1'); localStorage.setItem('jdj_mv_mine', JSON.stringify([{ id: 'M0000000B1', t: '${'ab'.repeat(16)}' }]));}catch(e){}`;
function install(mock) {
  mock.set('mvConfig', cfg).set('mvPartner', partner).set('mvLeads', { ok: true, leads, points: 42000, free: 7, live: true }).set('mvMine', mine).set('mvAdminQueue', queue)
    .set('mvLead', { ok: true, id: 'M0000000C1', t: 'cd'.repeat(16), n: 3, date: C.mvAddDays(T, 14) })
    .set('mvOpen', { ok: true, name: '홍길동', tel: '01012345678', memo: '', paidBy: '무료', price: 0, points: 42000, free: 6 });
}
module.exports = { cfg, partner, mine, queue, leads, install, PREVIEW_INIT, T };
