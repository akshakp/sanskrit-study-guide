// Search & mobile cards for topics/krudant-tadvid — two independent sections:
// कृदन्त Formation Reference (#krudantSearch) and तद्धित Examples (#taddhitSearch).
// Each section reads its own rendered Markdown tables as the ONE dataset and
// mirrors rows into compact mobile cards from the same pass — no JS-side data
// copy, no second source of truth. Shared Devanagari/Latin matching helpers
// come from vocab-search.js (window.VocabSearchUtil).

document.addEventListener('DOMContentLoaded', function() {
  initKrudantSearch();
  initTaddhitSearch();
});

function initKrudantSearch() {
  var searchInput = document.getElementById('krudantSearch');
  if (!searchInput || searchInput.dataset.searchInit) return; // guard duplicate listeners
  searchInput.dataset.searchInit = '1';

  var util = matchUtil();
  var resultCount = document.getElementById('krudantResultCount');
  var clearSearch = document.getElementById('krudantClearSearch');
  var searchBox = searchInput.closest('.vocab-search-box') || searchInput.parentNode;
  // Scope: only the Formation Reference tables inside .krudant-ref — the
  // कृदन्त Examples table and the तद्धित section are out of scope.
  var scope = document.querySelector('.krudant-ref') ||
              searchInput.closest('.md-content__inner') || document.body;
  var tables = Array.prototype.slice.call(scope.querySelectorAll('table'));
  // Parallel to `tables`: per-table hide references, so the search pass never
  // re-derives a sibling relationship that the wrapping changed.
  var tableCards = [];
  var tableScrollraps = [];
  var emptyState = null;

  // Row-mirroring mobile cards: one card per row from THAT row's cells.
  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    var ths = table.querySelectorAll('thead th');
    var secondLabel = ths.length > 1 ? ths[1].textContent.trim() : 'कृदन्तम्';

    var wrap = document.createElement('div');
    wrap.className = 'vocab-table-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);

    var cardsWrap = document.createElement('div');
    cardsWrap.className = 'vocab-cards';
    cardsWrap.setAttribute('lang', 'sa');

    var rows = table.querySelectorAll('tbody tr');
    for (var r = 0; r < rows.length; r++) {
      var cells = rows[r].querySelectorAll('td');
      if (cells.length < 2) continue;
      var card = document.createElement('article');
      card.className = 'vocab-card';
      card.dataset.targetsTable = 'krudant-' + t;
      card.dataset.targetsRow = String(r);
      card.style.display = '';

      var term = document.createElement('p');
      term.className = 'vocab-card-term';
      term.textContent = cells[0].textContent.trim();
      card.appendChild(term);

      var fields = document.createElement('dl');
      fields.className = 'vocab-card-fields';
      var item = document.createElement('div');
      item.className = 'vocab-card-field';
      var dt = document.createElement('dt');
      dt.textContent = secondLabel;
      var dd = document.createElement('dd');
      dd.textContent = cells[1].textContent.trim();
      item.appendChild(dt);
      item.appendChild(dd);
      fields.appendChild(item);
      card.appendChild(fields);
      cardsWrap.appendChild(card);
    }
    var scrollwrap = (table.closest && table.closest('.md-typeset__scrollwrap')) || wrap;
    scrollwrap.parentNode.insertBefore(cardsWrap, scrollwrap.nextSibling);
    tableCards[t] = cardsWrap;
    // Whole-group hide-set: the scrollwrap stays block-visible around a
    // display:none table and would otherwise reserve blank space.
    tableScrollraps[t] = scrollwrap;
  }

  function cardLookup(t, r) {
    return document.querySelector('.vocab-card[data-targets-table="krudant-' + t + '"][data-targets-row="' + r + '"]');
  }

  // Group heading for a table: walk previous siblings for an h3/h2.
  function findHeading(table) {
    var el = (table.closest && table.closest('.md-typeset__scrollwrap')) || table;
    while (el) {
      var sib = el.previousElementSibling;
      while (sib) {
        if (sib.tagName === 'H2' || sib.tagName === 'H3') return sib;
        sib = sib.previousElementSibling;
      }
      el = el.parentElement;
    }
    return null;
  }

  emptyState = makeEmptyState(searchBox);

  function reflectClear() {
    if (clearSearch) { clearSearch.hidden = searchInput.value.length === 0; }
  }

  function doSearch() {
    var q = util.normalize(searchInput.value.trim());
    var latinQ = util.devanagariToLatin(q);
    var devaQ = util.latinToDevanagari(q);
    var totalRows = 0;
    var totalVisible = 0;

    // Tab scope: tables inside an inactive Material content-tab panel are
    // out of the rendered scope and count toward neither total.
    var tScope = [];
    for (var ts = 0; ts < tables.length; ts++) {
      var tabBlock = tables[ts].closest && tables[ts].closest('.tabbed-block');
      tScope[ts] = !tabBlock || (tabBlock.offsetParent !== null && !tabBlock.hidden);
    }

    for (var t = 0; t < tables.length; t++) {
      if (!tScope[t]) continue;
      var table = tables[t];
      var rows = table.querySelectorAll('tbody tr');
      var sectionVisible = 0;

      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        var cells = row.querySelectorAll('td');
        if (cells.length < 2) continue;
        totalRows++;

        var allText = util.normalize(row.textContent);
        var sanskritLatin = util.normalize(util.devanagariToLatin(row.textContent));
        var visible = !q || matchesRow(allText, sanskritLatin, latinQ, devaQ, q);

        row.style.display = visible ? '' : 'none';
        var card = cardLookup(t, r);
        if (card) { card.style.display = visible ? '' : 'none'; }
        if (visible) sectionVisible++;
      }

      totalVisible += sectionVisible;
      // Hide empty groups (heading + table + cards + wrapper chain) while
      // searching; restoring happens on the next pass (query clears/widens).
      var heading = findHeading(table);
      var empty = sectionVisible === 0 && q !== '';
      if (heading) { heading.hidden = empty; }
      table.classList.toggle('vocab-group-hidden', empty);
      if (tableCards[t]) { tableCards[t].hidden = empty; }
      if (tableScrollraps[t]) { tableScrollraps[t].hidden = empty; }
    }

    if (emptyState) { emptyState.hidden = !(q !== '' && totalVisible === 0); }

    if (resultCount) {
      if (!q) {
        resultCount.textContent = 'Showing all ' + totalRows + ' धातु–कृदन्त pairs — type to filter';
      } else if (totalVisible === 0) {
        resultCount.textContent = 'No matches found. Try a different spelling.';
      } else {
        resultCount.textContent = 'Showing ' + totalVisible + ' of ' + totalRows + ' धातु–कृदन्त pairs';
      }
    }
  }

  reflectClear();
  doSearch();

  markBlankParagraphs(searchBox);

  var krudantRef = document.querySelector('.krudant-ref');
  if (krudantRef) {
    var ps = krudantRef.querySelectorAll(':scope > p');
    for (var pi = 0; pi < ps.length; pi++) {
      if (!ps[pi].textContent.trim() && !ps[pi].children.length) {
        ps[pi].classList.add('krudant-blank-p');
      }
    }
  }

  bindInputEvents(searchInput, reflectClear, doSearch, clearSearch);
  searchInput._recompute = doSearch; // shared tab-switch hook (set once, guarded)
}

function initTaddhitSearch() {
  var searchInput = document.getElementById('taddhitSearch');
  if (!searchInput || searchInput.dataset.searchInit) return; // guard duplicate listeners
  searchInput.dataset.searchInit = '1';

  var util = matchUtil();
  var resultCount = document.getElementById('taddhitResultCount');
  var clearSearch = document.getElementById('taddhitClearSearch');
  var searchBox = searchInput.closest('.vocab-search-box') || searchInput.parentNode;
  // Scope: ONLY the Examples reference inside .taddhit-examples. The taddhit
  // Formation table (ता/त्व explanation) stays visible regardless of query.
  var scope = document.querySelector('.taddhit-examples') ||
              searchInput.closest('.md-content__inner') || document.body;
  var tables = Array.prototype.slice.call(scope.querySelectorAll('table'));
  var emptyState;

  // Mirror the Examples table rows into compact mobile cards once, from the
  // same rows: card term = ता form; labelled fields = त्व form + Gujarati.
  var table = tables[0];
  var tableCard = null;
  var tableScrollwrap = null;
  if (table) {
    var ths = table.querySelectorAll('thead th');
    var labels = [];
    for (var i = 0; i < ths.length; i++) labels.push(ths[i].textContent.trim());

    var wrap = document.createElement('div');
    wrap.className = 'vocab-table-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);

    var cardsWrap = document.createElement('div');
    cardsWrap.className = 'vocab-cards';
    cardsWrap.setAttribute('lang', 'sa');

    var rows = table.querySelectorAll('tbody tr');
    for (var r = 0; r < rows.length; r++) {
      var cells = rows[r].querySelectorAll('td');
      if (cells.length < 2) continue;
      var card = document.createElement('article');
      card.className = 'vocab-card';
      card.dataset.targetsTable = 'taddhit-0';
      card.dataset.targetsRow = String(r);
      card.style.display = '';

      var term = document.createElement('p');
      term.className = 'vocab-card-term';
      term.textContent = cells[0].textContent.trim();
      card.appendChild(term);

      var fields = document.createElement('dl');
      fields.className = 'vocab-card-fields';
      for (var c = 1; c < cells.length; c++) {
        var item = document.createElement('div');
        item.className = 'vocab-card-field';
        var dt = document.createElement('dt');
        dt.textContent = labels[c] || '';
        var dd = document.createElement('dd');
        dd.textContent = cells[c].textContent.trim();
        if (/[\u0A80-\u0AFF]/.test(cells[c].textContent)) {
          dd.classList.add('vocab-card-guj');
          item.setAttribute('lang', 'gu');
        }
        item.appendChild(dt);
        item.appendChild(dd);
        fields.appendChild(item);
      }
      card.appendChild(fields);
      cardsWrap.appendChild(card);
    }
    tableScrollwrap = (table.closest && table.closest('.md-typeset__scrollwrap')) || wrap;
    tableScrollwrap.parentNode.insertBefore(cardsWrap, tableScrollwrap.nextSibling);
    tableCard = cardsWrap;
  }

  emptyState = makeEmptyState(searchBox);

  function reflectClear() {
    if (clearSearch) { clearSearch.hidden = searchInput.value.length === 0; }
  }

  function doSearch() {
    var q = util.normalize(searchInput.value.trim());
    var latinQ = util.devanagariToLatin(q);
    var devaQ = util.latinToDevanagari(q);
    var totalRows = 0;
    var totalVisible = 0;

    // A row stays visible if the query appears in ANY of its three fields
    // (ता form / त्व form / Gujarati); the whole-row text search below
    // implements "any one" correctly — never inverted: visible ⇔ match.
    if (table) {
      var rows = table.querySelectorAll('tbody tr');
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        var cells = row.querySelectorAll('td');
        if (cells.length < 2) continue;
        totalRows++;

        var allText = util.normalize(row.textContent);
        var sanskritLatin = util.normalize(util.devanagariToLatin(row.textContent));
        var visible = !q || matchesRow(allText, sanskritLatin, latinQ, devaQ, q);

        row.style.display = visible ? '' : 'none';
        var card = document.querySelector('.vocab-card[data-targets-table="taddhit-0"][data-targets-row="' + r + '"]');
        if (card) { card.style.display = visible ? '' : 'none'; }
        if (visible) totalVisible++;
      }
    }

    // No-results: hide the empty Examples group entirely (heading + table +
    // cards + wrapper chain) so no blank space remains; neutral state: show all.
    var heading = table ? findHeading(table) : null;
    var empty = table && q !== '' && totalVisible === 0;
    if (heading) { heading.hidden = empty; }
    if (table) { table.classList.toggle('vocab-group-hidden', empty); }
    if (tableScrollwrap) { tableScrollwrap.hidden = empty; }
    if (tableCard) { tableCard.hidden = empty; }

    if (emptyState) { emptyState.hidden = !(q !== '' && totalVisible === 0); }

    if (resultCount) {
      if (!q) {
        resultCount.textContent = 'Showing all ' + totalRows + ' तद्धित examples — type to filter';
      } else if (totalVisible === 0) {
        resultCount.textContent = 'No matches found. Try a different spelling.';
      } else {
        resultCount.textContent = 'Showing ' + totalVisible + ' of ' + totalRows + ' तद्धित examples';
      }
    }
  }

  reflectClear();
  doSearch();
  markBlankParagraphs(searchBox);
  bindInputEvents(searchInput, reflectClear, doSearch, clearSearch);
  searchInput._recompute = doSearch; // shared tab-switch hook (set once, guarded)
}

// ─── Shared helpers (single definitions — no per-section duplication) ─────

function matchUtil() {
  return (typeof window.VocabSearchUtil === 'object' && window.VocabSearchUtil)
    ? window.VocabSearchUtil
    : { // graceful fallback: plain case-insensitive matching only
        normalize: function(t) { return (t || '').trim().toLowerCase(); },
        devanagariToLatin: function(t) { return t || ''; },
        latinToDevanagari: function(t) { return t || ''; }
      };
}

// Corrected (non-inverted) filter: a row is visible if the query matches its
// normalized text, either transliteration direction, or — because Devanagari
// codepoints omit the inherent 'a' (रमनम् ≈ 'rmnm' vs typed 'rom'/'ramanam') —
// the vowel-stripped consonant skeletons on both sides.
function matchesRow(allText, sanskritLatin, latinQ, devaQ, q) {
  return allText.indexOf(q) !== -1 ||
         allText.indexOf(latinQ) !== -1 ||
         allText.indexOf(devaQ) !== -1 ||
         sanskritLatin.indexOf(q) !== -1 ||
         matchSkeleton(sanskritLatin, latinQ);
}

function matchSkeleton(sanskritLatin, latinQ) {
  return stripVowels(sanskritLatin).indexOf(stripVowels(latinQ)) !== -1;
}

function stripVowels(latin) {
  return (latin || '').replace(/[aeiouy\u0101\u012B\u016B\u1E5B\u1E63\u1E35]/g, '');
}

// Find the group heading (h2/h3) that precedes a wrapped table.
function findHeading(table) {
  var el = (table.closest && table.closest('.md-typeset__scrollwrap')) || table;
  while (el) {
    var sib = el.previousElementSibling;
    while (sib) {
      if (sib.tagName === 'H2' || sib.tagName === 'H3') return sib;
      sib = sib.previousElementSibling;
    }
    el = el.parentElement;
  }
  return null;
}

function makeEmptyState(searchBox) {
  var emptyState = document.createElement('div');
  emptyState.className = 'vocab-empty-state';
  emptyState.hidden = true;
  emptyState.setAttribute('role', 'status');
  emptyState.textContent = 'No matches found. Try a different spelling — Devanagari, Gujarati, or Latin forms all work.';
  searchBox.appendChild(emptyState);
  return emptyState;
}

// md_in_html emits empty <p> artifacts around bare raw-HTML search boxes in
// tab content; they carry only margins, so mark them once for the CSS.
function markBlankParagraphs(searchBox) {
  var sibEls = [searchBox.previousElementSibling, searchBox.nextElementSibling];
  for (var si = 0; si < sibEls.length; si++) {
    var s = sibEls[si];
    if (s && s.tagName === 'P' && !s.textContent.trim() && !s.children.length) {
      s.classList.add('krudant-blank-p');
    }
  }
}

function bindInputEvents(searchInput, reflectClear, doSearch, clearSearch) {
  searchInput.addEventListener('input', function() {
    reflectClear();
    doSearch();
  });
  if (clearSearch) {
    clearSearch.addEventListener('click', function() {
      searchInput.value = '';
      reflectClear();
      doSearch();
      searchInput.focus();
    });
  }
}

// A single shared tab-switch recompute hook (capture, registered once): the
// कृदन्त and तद्धित controllers re-derive their scoped totals when a panel
// becomes active — no duplicate per-section listeners.
document.addEventListener('click', function(e) {
  if (e.target.closest && e.target.closest('.tabbed-set label, .tabbed-labels label')) {
    setTimeout(function() {
      var kIn = document.getElementById('krudantSearch');
      var tIn = document.getElementById('taddhitSearch');
      if (kIn && kIn._recompute) kIn._recompute();
      if (tIn && tIn._recompute) tIn._recompute();
    }, 60);
  }
}, true);
