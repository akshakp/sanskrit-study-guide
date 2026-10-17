// Reusable table → mobile-record converter.
// A small explicit opt-in list below (keyed by page path + heading id) marks
// the reference tables whose mobile presentation is converted to compact
// labeled record cards below 768px. Everything is derived at runtime from
// the authoritative rendered table — the SAME table keeps serving desktop
// unchanged, cells are never annotated, and the mobile cards clone the
// row values as-is (links, bold, <del> etc. survive), so there is one
// educational dataset and labels always match the real table headers.
// Bases: approved Conversation card pattern + Material .md-typeset wrappers.
(function () {
  // page-path-suffix → conversion config. A plain array of heading ids uses
  // the original stacked-label card; an object with gridLayout:true renders
  // the approved two-column label/value grid (currently Language Essentials
  // only, pending visual approval). Headings whose FOLLOWING table is
  // converted:
  var RECORD_TABLES = {
    'topics/language-essentials/': {
      gridLayout: true,
      headings: [
        '#five-parts-of-a-sentence',
        '#vowels',
        '#consonants',
        '#pronunciation-places',
        '#gender',
        '#number',
        '#person',
        '#core-pronouns'
      ]
    },
    'topics/nouns/': ['#3rd-case-singular', '#6th-case-plural'],
    'topics/verbs/': [
      '#6-when-is-the-action',
      '#based-on-number-of-objects',
      '#formation-rules-for-parasmaipada-verb-forms',
      '#examples'
    ],
    'topics/writing-rules/': ['#when-a-word-ends-in', '#sandhi-1-3-rule'],
    'topics/sandhi/': ['#master-summary-table']
  };

  function pathKey() {
    // '/topics/nouns/' → 'topics/nouns/'
    var path = location.pathname;
    for (var key in RECORD_TABLES) {
      if (path.endsWith('/' + key) || path.endsWith(key)) return key;
    }
    return null;
  }

  function tableAfterHeading(heading) {
    // First table between this heading and the next heading of same-or-
    // higher level in its container; skips nothing else.
    var el = heading.nextElementSibling;
    while (el) {
      if (el.tagName === 'TABLE') return el;
      if (/^H[1-4]$/.test(el.tagName)) return null;
      // tables are wrapped by Material: .md-typeset__scrollwrap/.md-typeset__table
      if (el.tagName === 'DIV' && el.querySelector !== undefined) {
        var t = el.querySelector('table');
        if (t && el.contains(t)) return t;
      }
      el = el.nextElementSibling;
    }
    return null;
  }

  // Exceptionally long labels get a deliberate full-width stacked row
  // instead of squeezing the value column against the viewport width.
  var LONG_LABEL_CHARS = 24;

  function labelFor(table, colIdx) {
    var th = table.querySelectorAll('thead th');
    if (th && th[colIdx]) return th[colIdx].textContent.trim();
    var firstRow = table.querySelector('tbody tr');
    if (firstRow && firstRow.children[colIdx]) return '';
    return '';
  }

  function buildRecords(table, useGrid) {
    if (table.dataset.recordsBuilt) return;
    var rows = table.querySelectorAll('tbody > tr');
    var thead = table.querySelectorAll('thead th');
    if (!rows.length || !thead.length) return;
    // skip tables that already carry per-cell labels (Conversation pattern)
    if (table.querySelector('td[data-label]')) return;
    var block = document.createElement('div');
    block.className = 'md-records';

    rows.forEach(function (tr) {
      if (!tr.querySelector('td,th')) return;
      var card = document.createElement('div');
      card.className = 'md-record';
      var cells = [...tr.children];
      // Primary anchor = the first cell that actually carries content; a
      // leading empty/dash grouping cell is kept as a labeled field instead,
      // so no original value is dropped or invented.
      var isPlaceholder = function (el) {
        var s = el.textContent.replace(/\s|\u00A0/g, '');
        return s === '' || s === '-' || s === '\u2014';
      };
      var headIdx = cells.findIndex(function (c) { return !isPlaceholder(c); });
      if (headIdx === -1) headIdx = 0;
      var gridRows = null;
      if (useGrid) {
        gridRows = document.createElement('div');
        gridRows.className = 'md-record-grid';
        card.appendChild(gridRows);
      }
      cells.forEach(function (cell, i) {
        if (i === headIdx) {
          var head = document.createElement('span');
          head.className = 'md-record-head';
          head.innerHTML = cell.innerHTML; // cloned authoritative value
          card.appendChild(head);
          return;
        }
        var labelText = labelFor(table, i);
        if (useGrid) {
          // Two-column label/value grid: all labels and all values share
          // identical column starts. A long label opts itself and its value
          // into a deliberate full-width stacked row.
          var wide = labelText.length > LONG_LABEL_CHARS;
          var lab = document.createElement('span');
          lab.className = 'md-record-label';
          if (wide) lab.classList.add('md-record-widerow');
          lab.textContent = labelText;
          lab.setAttribute('data-label', labelText);
          var val = document.createElement('p');
          val.className = 'md-record-value';
          if (wide) val.classList.add('md-record-widerow');
          val.innerHTML = cell.innerHTML;
          gridRows.appendChild(lab);
          gridRows.appendChild(val);
        } else {
          var field = document.createElement('p');
          field.className = 'md-record-field';
          field.setAttribute('data-label', labelText);
          field.innerHTML = cell.innerHTML;
          card.appendChild(field);
        }
      });
      block.appendChild(card);
    });
    // insert after the Material wrapper; hide the wrapper on mobile only
    var wrap = table.closest('.md-typeset__scrollwrap') || table.parentElement;
    if (wrap) {
      wrap.classList.add('md-record-source');
      wrap.insertAdjacentElement('afterend', block);
    } else {
      table.insertAdjacentElement('afterend', block);
    }
    table.dataset.recordsBuilt = '1';
  }

  function init() {
    var key = pathKey();
    if (!key) return;
    var cfg = RECORD_TABLES[key];
    var ids = Array.isArray(cfg) ? cfg : (cfg && cfg.headings) || [];
    var useGrid = !!(cfg && !Array.isArray(cfg) && cfg.gridLayout);
    var matched = 0;
    ids.forEach(function (id) {
      var heading = document.getElementById(id.replace(/^#/, ''));
      if (!heading) return;
      var table = tableAfterHeading(heading);
      if (!table) return;
      buildRecords(table, useGrid);
      matched++;
    });
    if (useGrid && matched) {
      // Page-scoped grid styling: the class enables the label/value grid CSS
      // only on pages whose config opted in, so other pages keep their
      // approved card look until the new pattern is approved.
      var content = document.querySelector('.md-content');
      if (content) content.classList.add('md-record-grid-page');
    }
    document.documentElement.dataset.recordsApplied = String(matched);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
