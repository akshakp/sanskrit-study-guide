// ============================================
// Vibhakti Table Explorer (Nouns & Cases page)
// Two dependent selectors: Ending (शब्दान्त) → Gender (लिङ्ग).
// Renders the complete 8-case × 3-number table for the
// representative noun of the selected combination.
// Data: docs/assets/data/nouns-explorer.json — every form transcribed
// exactly from the verified declension tables in nouns.md (AARSH
// Book 1); no rule generation, unsupported combos absent by design.
// ============================================

(function () {
  "use strict";

  var container = null;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function showErrorState(error) {
    console.error("Declension explorer failed to load:", error);
    container.innerHTML = "";
    var box = el("div", "decl-error");
    box.appendChild(el("p", null,
      "⚠️ Failed to load declension data. Refresh the page and try again."
    ));
    if (error && error.message) {
      box.appendChild(el("p", "decl-error__detail", error.message));
    }
    container.appendChild(box);
  }

  function fillOptions(select, options, keepIfValid) {
    select.innerHTML = "";
    options.forEach(function (opt) {
      var o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      select.appendChild(o);
    });
    var has = options.some(function (opt) { return opt.value === keepIfValid; });
    return has ? keepIfValid : (options.length ? options[0].value : "");
  }

  function init() {
    container = document.getElementById("declension-explorer");
    if (!container) { return; }

    var dataUrl = container.getAttribute("data-explorer-data");
    if (!dataUrl) {
      showErrorState(new Error("Missing data-explorer-data attribute."));
      return;
    }

    container.innerHTML =
      '<div class="decl-loading">Loading declension explorer…</div>';

    fetch(dataUrl, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            "Could not load " + dataUrl + ". HTTP " + response.status
          );
        }
        return response.json();
      })
      .then(function (data) { render(data); })
      .catch(showErrorState);
  }

  function render(data) {
    container.innerHTML = "";

    // ── Compact control area: two aligned selectors ──
    var title = el("div", "decl-explorer__title", "शब्दरूप अन्वेषक · Declension Explorer");
    container.appendChild(title);

    var picks = el("div", "decl-selects");

    var endWrap = el("div", "decl-control");
    var endLabel = el("label", null, "Ending (शब्दान्त)");
    endLabel.setAttribute("for", "decl-ending-select");
    var endSel = el("select", "decl-select");
    endSel.id = "decl-ending-select";

    var genWrap = el("div", "decl-control");
    var genLabel = el("label", null, "Gender (लिङ्ग)");
    genLabel.setAttribute("for", "decl-gender-select");
    var genSel = el("select", "decl-select");
    genSel.id = "decl-gender-select";

    endWrap.appendChild(endLabel);
    endWrap.appendChild(endSel);
    genWrap.appendChild(genLabel);
    genWrap.appendChild(genSel);
    picks.appendChild(endWrap);
    picks.appendChild(genWrap);
    container.appendChild(picks);

    // ── Prominent centered noun display (announced on change) ──
    var hero = el("div", "decl-hero");
    hero.setAttribute("role", "status");
    hero.setAttribute("aria-live", "polite");

    var heroNoun = el("div", "decl-hero__noun");
    heroNoun.setAttribute("lang", "sa");
    var heroSub = el("div", "decl-hero__sub");
    heroSub.setAttribute("lang", "sa");
    hero.appendChild(heroNoun);
    hero.appendChild(heroSub);
    container.appendChild(hero);

    // ── Small caption above the table (ending label + same-paradigm nouns) ──
    var cap = el("div", "decl-table-cap");
    var capMain = el("span", "decl-table-cap__label", "विभक्ति-सारणी");
    capMain.setAttribute("lang", "sa");
    var capNote = el("span", "decl-table-cap__note");
    capNote.setAttribute("lang", "sa");
    cap.appendChild(capMain);
    cap.appendChild(capNote);
    container.appendChild(cap);

    // ── Complete table (desktop/wide) + stacked case cards (mobile) ──
    var scroll = el("div", "decl-scroll");
    var table = el("table", "decl-table");
    table.setAttribute("lang", "sa");
    scroll.appendChild(table);
    container.appendChild(scroll);

    var cards = el("div", "decl-cards");
    container.appendChild(cards);

    // Rule markers: explicit metadata from the verified data file.
    var markers = {};
    (data.natvaMarkers || []).forEach(function (m) {
      var key = m.ending + "|" + m.gender + "|" + m.case + "|" + m.number;
      markers[key] = m;
    });

    function natvaInfo(noun, caseKey, numKey) {
      var key = endSel.value + "|" + genSel.value + "|" + caseKey + "|" + numKey;
      var marker = markers[key];
      if (!marker || marker.form === undefined) { return null; }
      // Extra guard: only mark the form the data file itself documents.
      var current = containers.currentForms[key];
      if (current !== undefined && current !== marker.form) { return null; }
      return marker;
    }

    function attachNatva(cellWrap, noun, caseKey, numKey) {
      var marker = natvaInfo(noun, caseKey, numKey);
      if (!marker) { return cellWrap; }
      var btn = el("button", "decl-natva", "णत्व नियम");
      btn.setAttribute("lang", "sa");
      btn.type = "button";
      btn.title = marker.evidence || "णत्व नियम applies to this form.";
      btn.setAttribute("aria-label",
        "णत्व नियम applies to this form. Show the rule.");
      btn.addEventListener("click", function () {
        navToNatva();
      });
      cellWrap.appendChild(btn);
      return cellWrap;
    }

    // ── Rule navigation: switch to the Rules tab, find the णत्व section,
    //    keep selector state (it lives outside the tabs), and provide a back path.
    function tabLabels() {
      return document.querySelectorAll(
        ".tabbed-set .tabbed-labels > label");
    }

    function navToNatva() {
      var labels = tabLabels();
      if (labels.length >= 4) {
        labels[2].click(); // Rules tab
      }
      var target = document.getElementById("natva-rule");
      if (!target) {
        var hs = document.querySelectorAll("h2");
        for (var i = 0; i < hs.length; i++) {
          if (hs[i].textContent.indexOf("णत्व") !== -1) { target = hs[i]; break; }
        }
      }
      ensureBackButton();
      if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    function ensureBackButton() {
      if (document.getElementById("decl-rules-back")) { return; }
      var blocks = document.querySelectorAll(".tabbed-set .tabbed-block");
      var rulesPanel = blocks.length >= 3 ? blocks[2] : null;
      if (!rulesPanel) { return; }
      var back = el("button", "decl-back-btn", "← Back to Declension Explorer");
      back.type = "button";
      back.id = "decl-rules-back";
      back.addEventListener("click", function () {
        var labels = tabLabels();
        if (labels.length) { labels[0].click(); }
        var ex = container;
        if (ex && ex.scrollIntoView) {
          ex.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      rulesPanel.insertBefore(back, rulesPanel.firstChild);
    }

    var containers = { currentForms: {} };

    function buildFormCell(noun, c, n, v, caseKey, numKey) {
      var cell;
      if (typeof v === "string" && v !== "") {
        cell = el("td", "decl-cell-form", v);
        cell.setAttribute("lang", "sa");
        var wrapOuter = cell;
        attachNatva(cell, noun, caseKey, numKey);
      } else {
        cell = el("td", "decl-cell-form decl-cell-missing", "—");
      }
      return cell;
    }

    function recordForm(key, form) {
      containers.currentForms[key] = form;
    }

    // Selectors ────────────────────────────────────
    endSel.innerHTML = "";
    data.endings.forEach(function (ending) {
      var supported = data.tables.some(function (t) {
        return t.ending === ending.key;
      });
      if (supported) {
        var o = document.createElement("option");
        o.value = ending.key;
        o.label = ending.label; // plain Devanagari option text
        o.textContent = ending.label;
        endSel.appendChild(o);
      }
    });

    function tablesForEnding(endingKey) {
      return data.tables.filter(function (t) {
        return t.ending === endingKey;
      });
    }

    function endingLabel(endingKey) {
      var found = data.endings.filter(function (e) {
        return e.key === endingKey;
      })[0];
      return found ? found.label : endingKey;
    }

    function repopulateGenders(keepValue) {
      var tables = tablesForEnding(endSel.value);
      var previous = keepValue || genSel.value;
      genSel.innerHTML = "";
      tables.forEach(function (t) {
        var o = document.createElement("option");
        o.value = t.gender;
        o.textContent = t.gender;
        genSel.appendChild(o);
      });
      var valid = tables.some(function (t) { return t.gender === previous; });
      if (!valid && tables.length) {
        genSel.value = tables[0].gender;
      }
    }

    function renderTable() {
      var tables = tablesForEnding(endSel.value);
      var selected = null;
      tables.forEach(function (t) {
        if (t.gender === genSel.value) { selected = t; }
      });

      var numCols = data.numbers;

      // hero — dictionary/stem label, large and centered
      heroNoun.textContent = selected ? selected.stem : "—";
      heroSub.textContent =
        endingLabel(endSel.value) + " · " + genSel.value;

      // caption note — same-paradigm nouns from the approved tables
      capNote.innerHTML = "";
      if (selected && selected.also && selected.also.length) {
        capNote.textContent = " · same paradigm: " + selected.also.join(", ");
      }

      // table
      table.innerHTML = "";
      var thead = el("thead");
      var headRow = el("tr");
      var th0 = el("th", null, "विभक्तिः");
      th0.setAttribute("scope", "col");
      headRow.appendChild(th0);
      numCols.forEach(function (n) {
        var th = el("th", null, n.label);
        th.setAttribute("scope", "col");
        th.setAttribute("lang", "sa");
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      var tbody = el("tbody");
      var missing = false;
      cards.innerHTML = "";
      containers.currentForms = {};
      if (selected) {
        data.cases.forEach(function (c) {
          var cell = selected.forms[c.key];
          var tr = el("tr");
          var tdCase = el("td", "decl-cell-case");
          tdCase.setAttribute("lang", "sa");
          tdCase.appendChild(el("span", "decl-case-name", c.label));
          var q = el("span", "decl-case-question");
          q.setAttribute("lang", "sa");
          q.textContent = c.question;
          tdCase.appendChild(q);
          tr.appendChild(tdCase);

          // Mobile case card — same single verified data source as the table
          var card = el("div", "decl-card");
          var cardHead = el("div", "decl-card__head");
          cardHead.setAttribute("lang", "sa");
          cardHead.textContent = c.label;
          card.appendChild(cardHead);

          numCols.forEach(function (n) {
            var v = cell ? cell[n.key] : undefined;
            var key = endSel.value + "|" + genSel.value + "|" + c.key + "|" + n.key;
            recordForm(key, typeof v === "string" ? v : undefined);
            var td = buildFormCell(selected.noun, c, n, v, c.key, n.key);
            if (!(typeof v === "string" && v !== "")) { missing = true; }
            tr.appendChild(td);

            var row = el("div", "decl-card__row");
            var lab = el("span", "decl-card__label", n.label);
            lab.setAttribute("lang", "sa");
            row.appendChild(lab);
            if (typeof v === "string" && v !== "") {
              var val = el("span", "decl-card__value", v);
              val.setAttribute("lang", "sa");
              row.appendChild(val);
              attachNatva(row, selected.noun, c.key, n.key);
            } else {
              row.appendChild(el("span", "decl-card__value decl-cell-missing", "—"));
            }
            card.appendChild(row);
          });
          tbody.appendChild(tr);
          cards.appendChild(card);
        });
      } else {
        var tr = el("tr");
        var td = el("td", "decl-cell-missing");
        td.setAttribute("colspan", String(numCols.length + 1));
        td.textContent = "No approved table for this ending/gender combination.";
        tr.appendChild(td);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);

      if (missing) {
        capNote.textContent =
          (capNote.textContent || "") +
          " · one or more entries are not present in the approved tables.";
      }
    }

    function onEndingChange() {
      // refresh gender options; auto-select first supported gender
      repopulateGenders();
      renderTable();
    }

    endSel.addEventListener("change", onEndingChange);
    genSel.addEventListener("change", renderTable);

    repopulateGenders();
    renderTable();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
