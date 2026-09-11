/* ==========================================================================
   自毛植毛の手引き - クリニック比較ページ（/comparison/）ロジック
   /data/clinics.json を唯一のデータ源とし、新しい料金・術式・医師データを
   このファイル内にハードコードしない。DBに存在する情報のみを表示する。

   重要：クリニックごとのアフィリエイト提携状況（affiliate_status等）は
   このページのどの表示にも一切使用しない（評価・並び順・表示から独立させる）。
   ========================================================================== */

(function () {
  "use strict";

  var METHOD_LABELS = {
    shaved: "刈り上げ",
    unshaven: "非刈り上げ",
    unshaven_re_ark: "Re Ark（非刈り上げ）",
    mirai: "MIRAI法（刈り上げ）",
    nc_mirai: "NC-MIRAI法（非刈り上げ）",
    smart_fue: "スマートFUE（刈り上げ）",
    nonshaven: "ノンシェーブン（非刈り上げ）",
    two_block_cut: "ツーブロック（刈り上げ）",
    hydro_cut: "ハイドカット（非刈り上げ）",
    no_cut: "ノーカット（非刈り上げ）",
    long_hair: "ロングヘア（非刈り上げ）"
  };

  var GRAFT_OPTIONS = [500, 1000, 1500, 2000];
  var MAX_PICK = 3;

  var state = {
    region: "all",
    flags: {},           // { unshaven_fue: true, female_supported: true, travel: true }
    budget: "all",
    grafts: 1000,
    picked: []            // clinic_id[]
  };

  var ALL_CLINICS = [];

  /* ---------------- ユーティリティ ---------------- */

  function yen(n) {
    return Math.round(n / 10000).toLocaleString("ja-JP") + "万円";
  }

  function formatBool(v) {
    if (v === true) return "対応";
    if (v === false) return "非対応";
    return "確認できない";
  }

  function el(tag, className, html) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  // 指定株数の料金エントリを取得。{label, value}[] または null（要確認）
  function priceEntries(clinic, grafts) {
    var obj = clinic.pricing && clinic.pricing["price_" + grafts];
    if (!obj || typeof obj !== "object") return null;
    var out = [];
    for (var key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      if (typeof obj[key] !== "number") continue;
      out.push({ label: METHOD_LABELS[key] || key, value: obj[key] });
    }
    return out.length ? out : null;
  }

  function minPrice(clinic, grafts) {
    var entries = priceEntries(clinic, grafts);
    if (!entries) return null;
    var min = null;
    entries.forEach(function (e) {
      if (min === null || e.value < min) min = e.value;
    });
    return min;
  }

  // 表示用の料金テキスト（要確認の場合も含む）
  function priceText(clinic, grafts) {
    var entries = priceEntries(clinic, grafts);
    if (entries) {
      return entries.map(function (e) { return e.label + " " + yen(e.value); }).join(" / ");
    }
    if (clinic.pricing && clinic.pricing.pricing_model) {
      var pp = clinic.pricing.package_prices;
      if (pp && typeof pp.flexible === "number") {
        return "パッケージ制 " + yen(pp.flexible) + "〜（株数連動の料金ではないため個別記事で要確認）";
      }
    }
    if (clinic.pricing && clinic.pricing.menu_pricing && clinic.pricing.menu_pricing.length) {
      return "部位別パッケージ料金のみ公表（個別記事で要確認）";
    }
    return "要確認（個別記事参照）";
  }

  function travelSupportText(clinic) {
    var s = clinic.support || {};
    if (s.travel_support) return s.travel_support;
    return null;
  }

  /* ---------------- フィルタ判定 ---------------- */

  function matchesFilters(clinic) {
    if (state.region !== "all") {
      var regions = clinic.regions || [];
      if (regions.indexOf(state.region) === -1) return false;
    }
    if (state.flags.unshaven_fue && clinic.procedures.unshaven_fue !== true) return false;
    if (state.flags.female_supported && clinic.procedures.female_supported !== true) return false;
    if (state.flags.travel_support) {
      var s = clinic.support || {};
      if (!s.travel_support && !s.accommodation_support) return false;
    }
    if (state.budget !== "all") {
      var mp = minPrice(clinic, 1000);
      // 料金が不明な院は「予算オーバーと確認できない」ため除外しない
      if (mp !== null && mp > Number(state.budget)) return false;
    }
    return true;
  }

  function filteredClinics() {
    return ALL_CLINICS.filter(matchesFilters);
  }

  /* ---------------- 描画：フィルタ結果件数 ---------------- */

  function renderResultCount(list) {
    var out = document.getElementById("filter-result-count");
    if (!out) return;
    out.textContent = "条件に合うクリニック：" + list.length + " / " + ALL_CLINICS.length + "院";
  }

  /* ---------------- 描画：クリニックカード ---------------- */

  function renderCards(list) {
    var wrap = document.getElementById("clinic-cards");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (!list.length) {
      wrap.appendChild(el("p", "filter-empty", "条件に合うクリニックが見つかりませんでした。条件を減らしてお試しください。"));
      return;
    }
    list.forEach(function (clinic) {
      var card = el("div", "card compare-clinic-card");

      var body = el("div", "card__body");

      var title = el("p", "card__title");
      var titleLink = document.createElement("a");
      titleLink.href = clinic.article_url;
      titleLink.textContent = clinic.clinic_name;
      title.appendChild(titleLink);
      body.appendChild(title);

      var pickLabel = document.createElement("label");
      pickLabel.className = "compare-pick";
      var pickCb = document.createElement("input");
      pickCb.type = "checkbox";
      pickCb.setAttribute("data-compare-id", clinic.clinic_id);
      pickCb.checked = state.picked.indexOf(clinic.clinic_id) !== -1;
      pickCb.addEventListener("change", function () { onTogglePick(clinic.clinic_id, pickCb); });
      pickLabel.appendChild(pickCb);
      pickLabel.appendChild(document.createTextNode(" 比較に追加"));
      body.appendChild(pickLabel);

      var facts = el("ul", "clinic-facts");
      facts.appendChild(el("li", null, (clinic.regions || []).join(" / ") || "地域確認中"));
      facts.appendChild(el("li", null, state.grafts.toLocaleString("ja-JP") + "株：" + priceText(clinic, state.grafts)));
      if (clinic.procedures && clinic.procedures.unique_method_name) {
        facts.appendChild(el("li", null, clinic.procedures.unique_method_name));
      }
      body.appendChild(facts);

      if (clinic.key_features && clinic.key_features[0]) {
        body.appendChild(el("p", "card__excerpt", clinic.key_features[0]));
      }
      if (clinic.recommended_for && clinic.recommended_for[0]) {
        body.appendChild(el("p", "card__excerpt", "<strong>向いている人：</strong>" + clinic.recommended_for[0]));
      }

      var actions = el("div", "compare-clinic-card__actions");

      var link = document.createElement("a");
      link.className = "card__cta";
      link.href = clinic.article_url;
      link.textContent = "個別記事を見る";
      actions.appendChild(link);

      body.appendChild(actions);
      card.appendChild(body);
      wrap.appendChild(card);
    });
  }

  /* ---------------- 描画：横断比較表 ---------------- */

  function renderTable(list) {
    var wrap = document.getElementById("compare-table-output");
    if (!wrap) return;
    wrap.innerHTML = "";

    var table = document.createElement("table");
    table.className = "compare-table";

    var caption = document.createElement("caption");
    caption.textContent = "自毛植毛クリニック比較表（" + state.grafts.toLocaleString("ja-JP") + "株の目安）";
    table.appendChild(caption);

    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    ["クリニック", "地域", "主な術式", state.grafts.toLocaleString("ja-JP") + "株の目安", "刈り上げない植毛", "女性対応", "交通費・宿泊費補助", "主な医師"].forEach(function (h) {
      var th = document.createElement("th");
      th.setAttribute("scope", "col");
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    list.forEach(function (clinic) {
      var tr = document.createElement("tr");

      var thName = document.createElement("th");
      thName.setAttribute("scope", "row");
      thName.className = "compare-table__name-cell";
      var a = document.createElement("a");
      a.href = clinic.article_url;
      a.textContent = clinic.clinic_name;
      thName.appendChild(a);

      var pickLabel = document.createElement("label");
      pickLabel.className = "compare-pick compare-pick--table";
      var pickCb = document.createElement("input");
      pickCb.type = "checkbox";
      pickCb.setAttribute("data-compare-id", clinic.clinic_id);
      pickCb.checked = state.picked.indexOf(clinic.clinic_id) !== -1;
      pickCb.addEventListener("change", function () { onTogglePick(clinic.clinic_id, pickCb); });
      pickLabel.appendChild(pickCb);
      pickLabel.appendChild(document.createTextNode(" 比較に追加"));
      thName.appendChild(pickLabel);

      tr.appendChild(thName);

      var doctor = (clinic.doctors && clinic.doctors[0]) ? clinic.doctors[0].name + (clinic.doctors[0].role ? "（" + clinic.doctors[0].role + "）" : "") : "確認できない";
      var travel = travelSupportText(clinic) || (clinic.support && clinic.support.accommodation_support) || "確認できない";
      var methodName = (clinic.procedures && (clinic.procedures.unique_method_name || (clinic.procedures.methods || []).join(" / "))) || "確認できない";

      [
        (clinic.regions || []).join(" / ") || "確認できない",
        methodName,
        priceText(clinic, state.grafts),
        formatBool(clinic.procedures && clinic.procedures.unshaven_fue),
        formatBool(clinic.procedures && clinic.procedures.female_supported),
        travel,
        doctor
      ].forEach(function (text) {
        var td = document.createElement("td");
        td.textContent = text;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
  }

  /* ---------------- 描画：条件別に比較したい院（テーマ別リンク集） ---------------- */

  function renderTopicGroups() {
    var wrap = document.getElementById("topic-groups");
    if (!wrap) return;
    wrap.innerHTML = "";

    var topics = [
      {
        title: "刈り上げない植毛を比較したい人向け",
        clinics: ALL_CLINICS.filter(function (c) { return c.procedures && c.procedures.unshaven_fue === true; })
      },
      {
        title: "女性の薄毛治療を比較したい人向け",
        clinics: ALL_CLINICS.filter(function (c) { return c.procedures && c.procedures.female_supported === true; })
      },
      {
        title: "交通費・宿泊費補助がある院を比較したい人向け",
        clinics: ALL_CLINICS.filter(function (c) {
          var s = c.support || {};
          return !!(s.travel_support || s.accommodation_support);
        })
      },
      {
        title: (state.grafts.toLocaleString("ja-JP")) + "株の料金が公式に確認できる院",
        clinics: ALL_CLINICS.filter(function (c) { return priceEntries(c, state.grafts) !== null; })
      },
      {
        title: "全国に複数の院がある大手クリニック",
        clinics: ALL_CLINICS.filter(function (c) { return (c.regions || []).length >= 3; })
      }
    ];

    topics.forEach(function (topic) {
      if (!topic.clinics.length) return;
      var block = el("div", "topic-group");
      block.appendChild(el("p", "topic-group__title", topic.title));
      var list = el("ul", "topic-group__list");
      topic.clinics.forEach(function (c) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = c.article_url;
        a.textContent = c.clinic_name;
        li.appendChild(a);
        list.appendChild(li);
      });
      block.appendChild(list);
      wrap.appendChild(block);
    });
  }

  /* ---------------- 選択比較（2〜3院） ---------------- */

  function onTogglePick(clinicId, checkboxEl) {
    var idx = state.picked.indexOf(clinicId);
    if (checkboxEl.checked) {
      if (idx === -1) {
        if (state.picked.length >= MAX_PICK) {
          checkboxEl.checked = false;
          showPickMessage("比較は最大" + MAX_PICK + "院まで選べます。他の院のチェックを外してからお試しください。");
          return;
        }
        state.picked.push(clinicId);
      }
    } else {
      if (idx !== -1) state.picked.splice(idx, 1);
    }
    syncCheckboxes();
    renderPicked();
  }

  function syncCheckboxes() {
    var boxes = document.querySelectorAll("[data-compare-id]");
    boxes.forEach(function (box) {
      box.checked = state.picked.indexOf(box.getAttribute("data-compare-id")) !== -1;
    });
  }

  function showPickMessage(msg) {
    var out = document.getElementById("pick-message");
    if (!out) return;
    out.textContent = msg;
    out.hidden = false;
    window.clearTimeout(showPickMessage._t);
    showPickMessage._t = window.setTimeout(function () { out.hidden = true; }, 4000);
  }

  function renderTray() {
    var tray = document.getElementById("compare-tray");
    var countEl = document.getElementById("compare-tray-count");
    if (!tray || !countEl) return;
    countEl.textContent = state.picked.length;
    tray.hidden = state.picked.length === 0;
    document.body.classList.toggle("has-compare-tray", state.picked.length > 0);
  }

  function renderPicked() {
    renderTray();

    var emptyEl = document.getElementById("picked-compare-empty");
    var resultEl = document.getElementById("picked-compare-result");
    if (!emptyEl || !resultEl) return;

    if (!state.picked.length) {
      emptyEl.hidden = false;
      resultEl.hidden = true;
      resultEl.innerHTML = "";
      return;
    }
    emptyEl.hidden = true;
    resultEl.hidden = false;
    resultEl.innerHTML = "";

    var clinics = state.picked
      .map(function (id) { return ALL_CLINICS.filter(function (c) { return c.clinic_id === id; })[0]; })
      .filter(Boolean);

    var rows = [
      { label: "地域", get: function (c) { return (c.regions || []).join(" / ") || "確認できない"; } },
      { label: "主な術式", get: function (c) { return (c.procedures && (c.procedures.unique_method_name || (c.procedures.methods || []).join(" / "))) || "確認できない"; } },
      { label: state.grafts.toLocaleString("ja-JP") + "株の目安", get: function (c) { return priceText(c, state.grafts); } },
      { label: "刈り上げない植毛", get: function (c) { return formatBool(c.procedures && c.procedures.unshaven_fue); } },
      { label: "女性対応", get: function (c) { return formatBool(c.procedures && c.procedures.female_supported); } },
      { label: "交通費補助", get: function (c) { return (c.support && c.support.travel_support) || "確認できない"; } },
      { label: "宿泊費補助", get: function (c) { return (c.support && c.support.accommodation_support) || "確認できない"; } },
      { label: "アフターケア", get: function (c) { return (c.support && c.support.aftercare) || "確認できない"; } },
      { label: "主な医師", get: function (c) { return (c.doctors && c.doctors[0] && c.doctors[0].name) || "確認できない"; } },
      { label: "特徴", get: function (c) { return (c.key_features && c.key_features[0]) || "確認できない"; } }
    ];

    var table = document.createElement("table");
    table.className = "compare-table";
    var caption = document.createElement("caption");
    caption.textContent = "選択した" + clinics.length + "院の比較";
    table.appendChild(caption);

    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    headRow.appendChild(el("th", null, "比較項目"));
    clinics.forEach(function (c) {
      var th = document.createElement("th");
      var a = document.createElement("a");
      a.href = c.article_url;
      a.textContent = c.clinic_name;
      th.appendChild(a);
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      var th = document.createElement("th");
      th.setAttribute("scope", "row");
      th.textContent = row.label;
      tr.appendChild(th);
      clinics.forEach(function (c) {
        var td = document.createElement("td");
        td.textContent = row.get(c);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    resultEl.appendChild(table);
  }

  /* ---------------- 再描画まとめ ---------------- */

  function renderAll() {
    var list = filteredClinics();
    renderResultCount(list);
    renderCards(list);
    renderTable(list);
    renderTopicGroups();
    renderPicked();
  }

  /* ---------------- フィルタUIの初期化 ---------------- */

  function initRegionChips() {
    var container = document.querySelector('[data-filter-group="region"]');
    if (!container) return;
    var regions = [];
    ALL_CLINICS.forEach(function (c) {
      (c.regions || []).forEach(function (r) {
        if (regions.indexOf(r) === -1) regions.push(r);
      });
    });
    var allBtn = makeChip("すべて", "all", true);
    container.appendChild(allBtn);
    regions.forEach(function (r) {
      container.appendChild(makeChip(r, r, false));
    });

    function makeChip(label, value, active) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-chip" + (active ? " is-active" : "");
      btn.textContent = label;
      btn.addEventListener("click", function () {
        state.region = value;
        container.querySelectorAll(".filter-chip").forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        renderAll();
      });
      return btn;
    }
  }

  function initFlagChips() {
    var buttons = document.querySelectorAll("[data-flag]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var flag = btn.getAttribute("data-flag");
        state.flags[flag] = !state.flags[flag];
        btn.classList.toggle("is-active", !!state.flags[flag]);
        renderAll();
      });
    });
  }

  function initBudgetSelect() {
    var select = document.getElementById("budget-select");
    if (!select) return;
    select.addEventListener("change", function () {
      state.budget = select.value;
      renderAll();
    });
  }

  function initGraftToggle() {
    var buttons = document.querySelectorAll("[data-grafts]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.grafts = Number(btn.getAttribute("data-grafts"));
        buttons.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        renderAll();
      });
    });
  }

  function initReset() {
    var btn = document.getElementById("filter-reset");
    if (!btn) return;
    btn.addEventListener("click", function () {
      state.region = "all";
      state.flags = {};
      state.budget = "all";
      document.querySelectorAll('[data-filter-group="region"] .filter-chip').forEach(function (b, i) {
        b.classList.toggle("is-active", i === 0);
      });
      document.querySelectorAll("[data-flag]").forEach(function (b) { b.classList.remove("is-active"); });
      var select = document.getElementById("budget-select");
      if (select) select.value = "all";
      renderAll();
    });
  }

  function initCompareTray() {
    var btn = document.getElementById("compare-tray-btn");
    var target = document.getElementById("pick-compare");
    if (!btn || !target) return;
    btn.addEventListener("click", function () {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function init() {
    var loadingEl = document.getElementById("comparison-loading");
    fetch("/data/clinics.json")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        ALL_CLINICS = (data && data.clinics) || [];
        if (loadingEl) loadingEl.hidden = true;
        initRegionChips();
        initFlagChips();
        initBudgetSelect();
        initGraftToggle();
        initReset();
        initCompareTray();
        renderAll();
      })
      .catch(function () {
        if (loadingEl) loadingEl.textContent = "データの読み込みに失敗しました。時間をおいて再度お試しください。";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
