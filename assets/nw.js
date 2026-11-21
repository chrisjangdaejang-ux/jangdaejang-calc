/* 집코드 공통: 금액이 '32억 / 9,500만원'·'20억 / 원'·'84.8 / ㎡' 처럼 중간에서 줄이 갈리지 않게.
   화면에 보이는 글자에서만 '억 9,500만' 의 띄어쓰기를 줄바꿈 없는 공백(U+00A0)으로 바꾼다.
   (금액 계산·공유 문구·저장 값은 그대로 — 화면 글자만 손댐. 나중에 그려지는 결과 칸도 MutationObserver 로 따라감) */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !document.createTreeWalker) return;
  /* ① '32억 9,500만' 의 억 뒤 공백, ② '20억 원'·'300만 원' 의 원 앞 공백 → 줄바꿈 없는 공백(U+00A0)
     ③ '84.8㎡'·'84㎡대' 가 ㎡ 앞뒤에서 갈리지 않게 → 폭 없는 이음표(U+2060, 눈에 안 보임) */
  var RE = /(\d억)[ \t]+(?=[\d,]+\s?만)/g, RW = /(\d[억만])[ \t]+(?=원)/g, RM = /(\d)(?=㎡)|(㎡)(?=[가-힣])/g,
    SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE|NOSCRIPT)$/;
  function fixText(t) {
    var v = t.nodeValue;
    if (!v || (v.indexOf('억') < 0 && v.indexOf('만') < 0 && v.indexOf('㎡') < 0)) return;
    var p = t.parentNode; if (!p || SKIP.test(p.nodeName) || p.isContentEditable) return;
    var w = v.replace(RE, '$1 ').replace(RW, '$1 ').replace(RM, function (m, d, q) { return (d || q) + '⁠'; });
    if (w !== v) t.nodeValue = w;
  }
  function fix(n) {
    if (!n) return;
    if (n.nodeType === 3) { fixText(n); return; }
    if (n.nodeType !== 1 && n.nodeType !== 11) return;
    if (n.nodeType === 1 && SKIP.test(n.nodeName)) return;
    var w = document.createTreeWalker(n, 4, null), t;
    while ((t = w.nextNode())) fixText(t);
  }
  function start() {
    fix(document.body);
    if (!window.MutationObserver) return;
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') fixText(m.target);
        else for (var k = 0; k < m.addedNodes.length; k++) fix(m.addedNodes[k]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
