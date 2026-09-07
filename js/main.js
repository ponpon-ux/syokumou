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

  // 全記事一覧ページ：カテゴリ絞り込み
  var articleFilter = document.querySelector("[data-article-filter]");
  var articleGrid = document.querySelector("[data-article-grid]");
  if (articleFilter && articleGrid) {
    var filterButtons = articleFilter.querySelectorAll("[data-filter]");
    var articleCards = articleGrid.querySelectorAll("[data-category]");
    var emptyMessage = document.querySelector("[data-article-empty]");

    articleFilter.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-filter]");
      if (!btn) return;

      var target = btn.getAttribute("data-filter");
      var visibleCount = 0;

      for (var i = 0; i < filterButtons.length; i++) {
        var isActive = filterButtons[i] === btn;
        filterButtons[i].classList.toggle("is-active", isActive);
        filterButtons[i].setAttribute("aria-pressed", isActive ? "true" : "false");
      }

      for (var j = 0; j < articleCards.length; j++) {
        var match = target === "all" || articleCards[j].getAttribute("data-category") === target;
        articleCards[j].hidden = !match;
        if (match) visibleCount++;
      }

      if (emptyMessage) {
        emptyMessage.hidden = visibleCount !== 0;
      }
    });
  }
})();
