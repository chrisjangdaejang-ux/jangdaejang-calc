/* 동네 파트너 화면 점검용 가짜 서버 응답(운영자 미리 보기 상태) — tools/e2e/run.js 여정 dongne 과 미리 보기 그림이 함께 써요.
   사람·사무소 이름은 모두 지어낸 시험 값이에요. */
'use strict';
const C = require('../../assets/dongne-core.js');
const T = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const RULE = Object.assign({}, C.DP_RULE, { listingTier: true });
const card = (id, office, name, dn, found, extra) => Object.assign({ id, office, addr: '서울 강남구 개포로 ' + id.slice(-2) + ', 1층', tel: '02-555-01' + id.slice(-2), reg: '11680-2020-001' + id.slice(-2), name, ceo: name, kind: 'owner', intro: dn + ' 소식을 매주 전해요', dn, g: '11680', img: '', live: true, found }, extra || {});
const A = card('D000000011', '개포햇살공인중개사사무소', '김해솔', '개포동', true);
const B = card('D000000022', '대치나무공인중개사사무소', '이나래', '대치동', false);
const Cc = card('D000000033', '도곡바람공인중개사사무소', '박도윤', '도곡동', false, { kind: 'member', ceo: '정대표' });
const cfg = { ok: true, open: false, preview: true, admin: true, paid: false, billing: false, rule: RULE, topics: C.DP_TOPICS, terms: '2026-11-24 초안', agree: { rules: '글쓰기 규칙', ad: '광고 표시 규칙', privacy: '개인정보 수집·이용', terms: '동네 파트너 약관' },
  launch: T, bundleUntil: C.dpAddDays(C.dpAddMonths(T, 3), -1), bundleOk: true, listingTier: true, founding: true, foundingUntil: C.dpAddMonths(T, 3), firstCharge: C.dpFirstCharge(T), clientKey: '', plusPrice: 9900 };
const keys = [{ k: '11680|개포동', dn: '개포동', office: true, at: T, sw: '', swap: { ok: true, wait: 0 }, used: 2 }, { k: '11680|대치동', dn: '대치동', office: false, at: T, sw: '', swap: { ok: true, wait: 0 }, used: 3 },
  { k: '11680|일원동', dn: '일원동', office: false, at: T, sw: C.dpAddDays(T, -10), swap: { ok: false, wait: 20 }, used: 1 }];
const me = Object.assign({}, A, { st: '승인', chk: '', mail: 'partner@example.com', keys, waits: ['11680|도곡동'], code: 'P1A2B3C4', founding: true, foundOn: true, plan: 'm', pay: '시범', card: '', first: '', next: '', until: '', failAt: '', endAt: '', ck: '',
  payText: '', plusOn: true, plusUntil: '', bundle: true, listing: false, offers: [{ k: '11680|도곡동', dn: '도곡동', until: C.dpAddDays(T, 2) + ' 10:00' }], warn: 0, stopUntil: '', last: C.dpAddDays(T, -2), idle: false, imgSt: '', price: C.dpPrice(3, { founding: true }), applied: C.dpAddDays(T, -12) });
const at = d => Date.parse(d + 'T10:00:00+09:00');
const posts = [{ id: 'N000000001', at: at(C.dpAddDays(T, -1)), pid: A.id, key: '11680|개포동', topic: 'rent', tn: '전세·월세 동향', text: '이번 주는 전세 문의가 늘었어요. 새 학기 전에 이사하려는 가족이 많고, 84㎡ 전세 물건은 금방 계약돼요.', img: '', help: 12, rep: 0, day: T, st: '공개', imgSt: '', why: '' },
  { id: 'N000000002', at: at(T), pid: A.id, key: '11680|대치동', topic: 'rebuild', tn: '재건축·재개발 진행', text: '대치동 한 단지가 다음 달 조합 총회 날짜를 잡았어요. 안건은 시공사 계약 조건 변경이에요.', img: '', help: 0, rep: 0, day: C.dpAddDays(T, 1), st: '검토대기', imgSt: '', why: '' }];
const mine = { ok: true, cfg, me, stats: { imp: 1840, click: 37, help: 52, sub: 6, imp30: 612, click30: 14, help30: 19, sub30: 3 }, posts, today: T, nextBrief: C.dpAddDays(T, 1) };
const slots = keys => ({ ok: true, max: 3, slots: Object.fromEntries((keys || []).map((k, i) => [k, { used: i === 2 ? 3 : i % 3, free: i === 2 ? 0 : 3 - (i % 3), wait: i === 2 ? 1 : 0 }])) });
const sec = { list: [{ key: '11680|개포동', dn: '개포동', gn: '강남구', post: { id: 'N000000001', pid: A.id, tn: '전세·월세 동향', text: posts[0].text, img: '', at: posts[0].at, help: 12 }, partners: [A, Object.assign({}, Cc, { line: '도곡로 하수관 공사가 이번 주 금요일에 끝나요.' })], listing: [{ id: 'D000000044', office: '개포한빛공인중개사사무소', reg: '11680-2021-00044', name: '오한빛', verified: true }, { id: 'D000000055', office: '개포새벽공인중개사사무소', reg: '11680-2022-00055', name: '윤새벽', verified: true }] },
  { key: '11680|대치동', dn: '대치동', gn: '강남구', post: null, partners: [Object.assign({}, B, { line: '대치동 학원가 앞 횡단보도 공사가 끝났어요.' })], listing: [] }],
  best: { id: 'N000000009', dn: '도곡동', g: '11680', office: Cc.office, tn: '교통·공사', text: '도곡로 하수관 공사가 이번 주 금요일에 끝나요. 다음 주부터 출근길 정체가 줄어들 거예요.', help: 21, card: Cc } };
const brief = { ok: true, show: true, sec, day: T };
const best = { ok: true, best: sec.best, w: T };
const queue = { ok: true, billing: false, offers: [{ k: '11680|도곡동', dn: '도곡동', office: A.office, until: C.dpAddDays(T, 2) + ' 10:00' }], settings: { rule: RULE, bundleUntil: C.dpAddDays(C.dpAddMonths(T, 3), -1), bad: [] }, rulesReady: true, keyReady: true, open: false, prepQ: 2,
  tpl: { ban: [{ k: 'admin', name: '행정처분·휴업·폐업', body: '중개사무소 등록취소·업무정지 같은 행정처분이나 휴업·폐업 상태가 확인됐어요.' }, { k: 'fraud', name: '사기·전세사기·금전 사고', body: '사기·전세사기 연루나 고객 금전 사고가 확인됐어요.' }, { k: 'fake', name: '허위 정보 가입', body: '가입할 때 낸 정보가 사실과 다른 것으로 확인됐어요.' }, { k: 'harm', name: '서비스·다른 파트너 피해', body: '서비스나 다른 파트너에게 피해를 준 것으로 확인됐어요.' }],
    strike: [{ k: 'rules', name: '글쓰기 규칙 위반', body: '글쓰기 규칙을 지키지 않은 글이 있었어요.' }, { k: 'complaint', name: '고객 민원', body: '고객 민원이 접수돼 확인했어요.' }], steps: ['1차 경고 메일', '2차 7일 노출 중지', '3차 해지 + 창립 혜택 박탈'] },
  partners: [Object.assign({}, B, { st: '검토대기', chk: '공공 자료와 다름 · 공공 자료와 다른 칸: 사무소 이름', applied: T, keys: ['11680|대치동'], mail: 'pa***@example.com' })],
  hold: [Object.assign({}, posts[1], { office: A.office })],
  tmp: [Object.assign({}, posts[0], { id: 'N000000003', st: '임시조치', rep: 3, why: '신고 3건 — 임시조치', office: Cc.office })],
  photos: [],
  reported: [{ id: Cc.id, office: Cc.office, st: '승인', pay: '시범', plan: 'm', next: '', endAt: '', founding: false, warn: 1, stopUntil: '', keys: ['도곡동'], last: T, reps: 2, chk: '', why: ['사실이 아닌 정보', '무리한 영업'] }],
  live: [{ id: 'D000000044', office: '개포한빛공인중개사사무소', listing: true, st: '승인', pay: '시범', plan: 'm', next: '', endAt: '', founding: false, warn: 0, stopUntil: '', keys: ['개포동'], last: '', reps: 0, chk: '공공 자료와 맞음' }, { id: A.id, office: A.office, plusOn: true, base: 9900, st: '승인', pay: '시범', plan: 'm', next: '', endAt: '', founding: true, warn: 0, stopUntil: '', keys: ['개포동', '대치동', '일원동'], last: T, reps: 0, chk: '공공 자료와 맞음 · 사무소 이름·대표자·소재지가 맞아요' },
    { id: Cc.id, office: Cc.office, st: '승인', pay: '시범', plan: 'm', next: '', endAt: '', founding: false, warn: 1, stopUntil: '', keys: ['도곡동'], last: T, reps: 2, chk: '' }] };
/** 미리 보기 상태로 만들기: 로그인 + 운영자 미리 보기 표시 */
const PREVIEW_INIT = `try{localStorage.setItem('jdj_auth', JSON.stringify({ s: '${'e2e0'.repeat(16)}', nick: '시험회원', exp: '2099-12-31' })); localStorage.setItem('jdj_dp_preview','1');}catch(e){}`;
function install(mock) {
  mock.set('dpConfig', cfg).set('dpMine', mine).set('dpSlots', b => slots(b.keys)).set('dpBrief', brief).set('dpBestGet', best).set('dpAdminQueue', queue)
    .set('dpOffice', b => ({ ok: true, p: Object.assign({ id: b.id, office: '개포한빛공인중개사사무소', addr: '서울 강남구 개포로 44, 1층', reg: '11680-2021-00044', name: '오한빛', ceo: '오한빛', kind: 'owner', intro: '', img: '', verified: true, listing: true, found: false, dn: '개포동' }, b.reveal ? { tel: '02-555-0144' } : {}) })).set('dpInvite', { ok: true, p: { office: A.office, g: '11680', dn: '개포동', key: '11680|개포동', card: A } }).set('dpLog', { ok: true });
}
module.exports = { cfg, mine, brief, best, queue, install, PREVIEW_INIT, T };
