/* 장대장 계산기 공통 바닥글: 사업자 정보(전자상거래법 표시 사항)
   ─────────────────────────────────────────────────────────────
   ★ 사업자 정보는 아래 BIZ 한 곳에서만 고치면 모든 페이지에 반영됩니다.
     값이 빈 문자열('')이면 그 항목은 화면에 나오지 않습니다(가짜 번호를 넣지 마세요).
     - mailOrderNo : 통신판매업 신고번호 (예: '제2026-서울강남-00000호')
     - tel         : 고객문의 전화 (예: '02-000-0000')
     - email       : 고객문의 이메일 (회사 대표 메일)
   ───────────────────────────────────────────────────────────── */
(function () {
  const BIZ = {
    name: '(주)장대장부동산그룹',
    ceo: '장용석',
    bizNo: '114-87-22721',
    mailOrderNo: '',
    addr: '서울특별시 강남구 삼성로146길 10, 5층(청담동, 다인빌딩)',
    tel: '02-3444-5008',
    email: 'chris938@naver.com',
    ftcUrl: 'https://www.ftc.go.kr/bizCommPop.do?wrkr_no=1148722721'
  };
  window.JDJ_BIZ = BIZ;

  const ROOT = '/jangdaejang-calc/';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const item = (k, v) => v ? `<span><em>${k}</em> ${v}</span>` : '';

  function html() {
    const contact = [BIZ.tel ? `<a href="tel:${esc(BIZ.tel.replace(/[^0-9+]/g, ''))}">${esc(BIZ.tel)}</a>` : '',
                     BIZ.email ? `<a href="mailto:${esc(BIZ.email)}">${esc(BIZ.email)}</a>` : ''].filter(Boolean).join(' · ');
    return `<div class="bizinfo" id="bizinfo">
  <nav class="bizlinks" aria-label="약관과 정책">
    <a href="${ROOT}terms/">이용약관</a><a href="${ROOT}privacy/"><b>개인정보처리방침</b></a><a href="${ROOT}refund/">환불 정책</a><a href="${ROOT}premium/">프리미엄 리포트</a>
  </nav>
  <p class="bizrows">
    ${item('상호', esc(BIZ.name))}${item('대표', esc(BIZ.ceo))}${item('사업자등록번호', esc(BIZ.bizNo) + ` <a href="${esc(BIZ.ftcUrl)}" target="_blank" rel="noopener">사업자 정보 확인</a>`)}${item('통신판매업 신고번호', esc(BIZ.mailOrderNo))}${item('주소', esc(BIZ.addr))}${item('고객문의', contact)}
  </p>
</div>`;
  }

  function mount() {
    if (document.getElementById('bizinfo')) return;
    const feet = document.querySelectorAll('body > footer, body > .foot');
    let host = feet[feet.length - 1];
    if (!host) {
      host = document.createElement('footer');
      host.className = 'foot';
      const toast = document.querySelector('body > .toast');
      toast ? document.body.insertBefore(host, toast) : document.body.appendChild(host);
    }
    host.insertAdjacentHTML('beforeend', html());
    /* 본문의 <span data-biz="contact">기본 문구</span> 자리에 고객문의 연락처를 채움(값이 없으면 기본 문구 유지) */
    const c = [BIZ.tel, BIZ.email].filter(Boolean).join(' · ');
    if (c) document.querySelectorAll('[data-biz="contact"]').forEach(el => { el.textContent = c; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
