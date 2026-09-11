/* ==========================================================================
   自毛植毛の手引き - クリニックCTA共通コンポーネント
   /data/clinics.json を唯一のデータ源として、提携状況に応じたCTAを描画する。

   使い方：
   <div class="clinic-cta-slot" data-clinic-cta="clinic_id"></div>
   <script src="/js/clinic-cta.js"></script>

   affiliate_status が true かつ affiliate_url がある場合のみ広告CTA（「広告」表記付き）を表示する。
   それ以外は公式サイトへの通常リンクを表示する。

   提携の有無はDB（/data/clinics.json）内部でのみ管理し、CTAの出し分け以外の目的で
   画面上に「提携済み」「未提携」等のクリニックごとの提携状況を表示しないこと。
   ========================================================================== */

(function () {
  "use strict";

  function renderAffiliateCTA(container, clinic) {
    var a = document.createElement("a");
    a.className = "btn clinic-cta__btn";
    a.href = clinic.affiliate_url;
    a.target = "_blank";
    a.rel = "nofollow noopener sponsored";
    a.textContent = clinic.affiliate_cta_text || (clinic.clinic_name + " 公式サイトを見る");

    var note = document.createElement("p");
    note.className = "clinic-cta__note";
    note.textContent = "広告";

    container.classList.add("clinic-cta", "clinic-cta--affiliate");
    container.innerHTML = "";
    container.appendChild(a);
    container.appendChild(note);
  }

  function renderPlainCTA(container, clinic) {
    if (!clinic.official_url) {
      container.hidden = true;
      return;
    }
    var a = document.createElement("a");
    a.className = "btn btn--outline clinic-cta__btn";
    a.href = clinic.official_url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = (clinic.clinic_name || "") + " 公式サイトを見る";

    container.classList.add("clinic-cta", "clinic-cta--plain");
    container.innerHTML = "";
    container.appendChild(a);
  }

  function renderCTA(container, clinic) {
    var hasAffiliate = clinic.affiliate_status === true && !!clinic.affiliate_url;
    if (hasAffiliate) {
      renderAffiliateCTA(container, clinic);
    } else {
      renderPlainCTA(container, clinic);
    }
  }

  function init() {
    var containers = document.querySelectorAll("[data-clinic-cta]");
    if (!containers.length) return;

    fetch("/data/clinics.json")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var clinics = (data && data.clinics) || [];
        containers.forEach(function (el) {
          var id = el.getAttribute("data-clinic-cta");
          var clinic = null;
          for (var i = 0; i < clinics.length; i++) {
            if (clinics[i].clinic_id === id) { clinic = clinics[i]; break; }
          }
          if (clinic) renderCTA(el, clinic);
        });
      })
      .catch(function () {
        /* データ取得に失敗した場合は何もしない（元々ある静的リンクを壊さないため） */
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
