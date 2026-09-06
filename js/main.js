/* ==========================================================================
   自毛植毛の手引き - 共通スクリプト
   派手な演出は使わず、最低限のUI操作のみを行います。
   ========================================================================== */

(function () {
  "use strict";

  // モバイル用ナビゲーションの開閉
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-nav]");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // ナビ内リンクをクリックしたら閉じる（モバイル）
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A" && window.innerWidth < 860) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // フッターの年号を自動更新
  var yearEl = document.querySelector("[data-current-year]");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();
