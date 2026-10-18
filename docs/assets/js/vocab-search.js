// Vocabulary / Dhatu Search & Filter
// Works on any page that has a search input with id="vocabSearch" or id="dhatuSearch"

document.addEventListener('DOMContentLoaded', function() {
  // Detect which page we're on
  var searchInput = document.getElementById('vocabSearch') || document.getElementById('dhatuSearch');
  if (!searchInput) return;

  var isVocabPage = searchInput.id === 'vocabSearch';
  var isDhatuPage = searchInput.id === 'dhatuSearch';

  var filterBtns = document.querySelectorAll('.vocab-filter-btn');
  var resultCount = document.getElementById('vocabResultCount') || document.getElementById('dhatuResultCount');

  // Find all tables within the main content area
  var contentArea = document.querySelector('.md-content__inner')
    || document.querySelector('.md-typeset')
    || document.querySelector('article')
    || document.body;
  var tables = contentArea.querySelectorAll('table');

  // ── Dhatu page scoping ────────────────────────────────────
  // The dhatu page has TWO searchable root tables (Parasmaipada and
  // Atmanepada) plus Guna-change *reference* tables that must stay
  // untouched by the search. Root tables are identified by their
  // section heading (Parasmaipada / Atmanepada in the h2 text).
  var rootTables = null; // null = not scoped (vocabulary page searches all)
  var rootEmptyMessages = null; // dhatu: per-group empty-state elements (index-mirrored to rootTables)

  function isRootTableHeading(text) {
    var t = text || '';
    return t.indexOf('\u092A\u0930\u0938\u094D\u092E\u0948\u092A\u0926\u0940') !== -1 || /* परस्मैपदी */
           t.indexOf('\u0906\u0924\u094D\u092E\u0928\u0947\u092A\u0926\u0940') !== -1;    /* आत्मनेपदी */
  }

  function groupHeading(table) {
    // Walk back from the table (or its wrap) to the section heading.
    // Material wraps content tables as .md-typeset__scrollwrap >
    // .md-typeset__table > table, so we climb wrapper layers until the
    // heading appears as a previous sibling (h2 direct or nested),
    // stopping at the content root to stay inside this group.
    var el = table.closest && table.closest('.vocab-table-wrap');
    el = el || table;
    while (el) {
      var sib = el.previousElementSibling;
      while (sib) {
        if (sib.tagName === 'H2') return sib;
        if (sib.querySelector && sib.querySelector('h2')) return sib.querySelector('h2');
        sib = sib.previousElementSibling;
      }
      el = el.parentElement;
      if (el === contentArea || el === document.body || !el) return null;
    }
    return null;
  }

  function determineRootTables() {
    if (!isDhatuPage) { rootTables = null; return; }
    var found = [];
    for (var i = 0; i < tables.length; i++) {
      var h = groupHeading(tables[i]);
      if (h && isRootTableHeading(h.textContent)) { found.push(tables[i]); }
    }
    // Fallback: if scoping failed to find both groups, search all tables
    // (old behavior) so the search box never goes dead.
    rootTables = found.length ? found : null;
  }

  function ensureRootGroupEmptyMessages() {
    if (!isDhatuPage || !rootTables) return null;
    var byTable = [];
    for (var i = 0; i < rootTables.length; i++) {
      var table = rootTables[i];
      var div = document.createElement('div');
      div.className = 'vocab-group-empty';
      div.hidden = true;
      div.setAttribute('role', 'status');
      div.textContent = 'No matching roots in this group — results from the other group are unaffected.';
      var wrap = (table.closest && table.closest('.vocab-table-wrap')) || table;
      var after = wrap.nextElementSibling;
      if (after && after.classList && after.classList.contains('vocab-cards')) {
        after = after.nextElementSibling;
      }
      wrap.parentNode.insertBefore(div, after);
      byTable.push(div);
    }
    return byTable;
  }

  var currentFilter = 'all';
  var emptyState = null;

  // ─── Mobile cards + card/table wrapping ────────────────────
  // Both pages share the card builder: each row's cells are re-rendered as
  // one mobile card from the SAME table row (no duplicated data source).

  // Maps a table-header label to a display role for the card fields.
  function fieldRole(label) {
    var l = (label || '').trim();
    var ll = l.toLowerCase();
    if (ll.indexOf('sanskrit') !== -1 || ll === 'male') return 'primary';
    if (ll === 'female') return 'female';
    if (ll.indexOf('gujarati') !== -1) return 'gujarati';
    if (ll.indexOf('gender') !== -1) return 'gender';
    if (ll.indexOf('synonym') !== -1) return 'synonyms';
    return 'meaning'; // Meaning / English / any remaining text column
  }

  function isPlaceholder(text) {
    var t = text.trim();
    return t === '\u2014' || t === '-' || t === '\u2013' || t === '';
  }

  function buildVocabCards() {
    for (var t = 0; t < tables.length; t++) {
      var table = tables[t];
      // Structure-aware column typing: read the real header labels, tag each
      // body cell with its role, then style via classes (no fragile column
      // index assumptions for language styling).
      var ths = table.querySelectorAll('thead th');
      var labels = [];
      for (var th = 0; th < ths.length; th++) {
        labels.push(ths[th].textContent.trim());
      }
      if (!labels.length) continue; // no real header — no cards

      var rows = table.querySelectorAll('tbody tr');
      for (var r = 0; r < rows.length; r++) {
        var prow = rows[r];
        var pcells = prow.querySelectorAll('td');
        for (var pc = 0; pc < pcells.length; pc++) {
          var prole = fieldRole(labels[pc] || '');
          pcells[pc].classList.add('vocab-cell-' + prole);
        }
      }

      // Card-style wrapper for the desktop table + the row-mirroring mobile
      // cards — both presentations come from the same table rows.
      var wrap = document.createElement('div');
      wrap.className = 'vocab-table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);

      var cardsWrap = document.createElement('div');
      cardsWrap.className = 'vocab-cards';
      cardsWrap.setAttribute('lang', 'sa');

      for (var rr = 0; rr < rows.length; rr++) {
        var row = rows[rr];
        var cells = row.querySelectorAll('td');
        if (cells.length < 2) continue;

        var card = document.createElement('article');
        card.className = 'vocab-card';
        // Identity of the card's mirror row must be THIS loop's row index.
        // (Pre-4C-2 bug: used the stale leftover `r` from the role-tagging
        // loop above, so every card of a table carried the same target and
        // per-row card filtering collapsed to one unnamed card per table.)
        card.dataset.targetsTable = String(t);
        card.dataset.targetsRow = String(rr);
        card.style.display = '';

        // Primary Devanagari term: always the first column (Sanskrit,
        // male profession form, or dhātu). The second column joins the term
        // only when labeled Female (vocabulary profession tables).
        // Card title is a styled non-heading (P3-02): an element at h4 made
        // the heading outline jump H2→H4 on Vocabulary and Verb Roots.
        // All sizing lives on the .vocab-card-term class, so visuals keep.
        var term = document.createElement('p');
        term.className = 'vocab-card-term';
        var main = document.createElement('span');
        main.textContent = cells[0].textContent.trim();
        term.appendChild(main);
        var femJoin = cells.length > 1 && fieldRole(labels[1]) === 'female';
        if (femJoin) {
          var fem = document.createElement('span');
          fem.className = 'vocab-card-fem';
          fem.textContent = cells[1].textContent.trim();
          term.appendChild(fem);
        }
        card.appendChild(term);

        var fields = document.createElement('dl');
        fields.className = 'vocab-card-fields';
        for (var c = 0; c < cells.length; c++) {
          if (c === 0 || (c === 1 && femJoin)) continue;
          var role = fieldRole(labels[c] || '');
          var value = cells[c].textContent.trim();
          if (role === 'synonyms' && isPlaceholder(value)) continue;

          var item = document.createElement('div');
          item.className = 'vocab-card-field';
          var dt = document.createElement('dt');
          dt.textContent = labels[c] || '';
          var dd = document.createElement('dd');
          dd.textContent = value;
          if (role === 'gujarati') { item.setAttribute('lang', 'gu'); dd.className = 'vocab-card-guj'; }
          if (role === 'gender') dd.className = 'vocab-card-gender';
          item.appendChild(dt);
          item.appendChild(dd);
          fields.appendChild(item);
        }
        card.appendChild(fields);
        cardsWrap.appendChild(card);
      }

      table.parentNode.parentNode.insertBefore(cardsWrap, table.parentNode.nextSibling);
    }
  }

  function cardLookup(t, r) {
    return document.querySelector('.vocab-card[data-targets-table="' + t + '"][data-targets-row="' + r + '"]');
  }

  function setGroupHidden(table, hidden, heading) {
    // Vocabulary page: collapse the ENTIRE empty section so a search/filter
    // shows only sections with matches, directly under the search panel:
    // the section heading, the Material table block (scrollwrap containing
    // the bordered table wrap AND the mobile cards) — no empty boxes, no
    // gaps. The dhatu page keeps its existing behavior (per-group inline
    // messages; cards hide; table shell stays).
    if (isVocabPage) {
      table.classList.toggle('vocab-group-hidden', hidden);
      if (heading) { heading.style.display = hidden ? 'none' : ''; }
      var scrollwrap = table.closest && table.closest('.md-typeset__scrollwrap');
      var wrapEl = table.closest && table.closest('.vocab-table-wrap');
      var target = scrollwrap || wrapEl;
      if (target) { target.style.display = hidden ? 'none' : ''; }
      // Also hide any prose between the section heading and the table block
      // (e.g. the indeclinables note): the section must collapse as a whole.
      // Guarded on target so the walk can never spill into later sections.
      if (heading && target) {
        var extra = heading.nextElementSibling;
        while (extra && extra !== target) {
          extra.style.display = hidden ? 'none' : '';
          extra = extra.nextElementSibling;
        }
      }
    }
    var cards = table.parentElement && table.parentElement.classList.contains('vocab-table-wrap')
      ? table.parentElement.nextElementSibling
      : table.nextElementSibling;
    if (cards && cards.classList.contains('vocab-cards')) {
      cards.hidden = hidden;
    }
  }

  function ensureEmptyState() {
    if ((!isVocabPage && !isDhatuPage) || emptyState) { return; }
    emptyState = document.createElement('div');
    emptyState.className = 'vocab-empty-state';
    emptyState.hidden = true;
    emptyState.setAttribute('role', 'status');
    emptyState.textContent = isVocabPage
      ? 'No matching vocabulary entries. Try a different spelling or filter — Devanagari and Latin spellings both work.'
      : 'No roots match your search or filters in either group. Try different spellings — Devanagari, English, or Gujarati.';
    searchInput.parentNode.parentNode.appendChild(emptyState);
  }

  // ── Vocabulary section map ───────────────────────────────
  // Sections on the vocabulary page are '## Heading' + table, separated by
  // '---' horizontal rules (each section's rule sits directly above its
  // heading). While a search/filter is active, every section with zero
  // matching rows collapses entirely, so only matching sections remain —
  // in their original order — starting right below the search/filter panel.
  // Built once, after buildVocabCards() has wrapped the tables.
  var vocabHeadings = []; // heading element per table index, or null
  var vocabHrBefore = []; // '---' separator directly above each section, or null

  function buildVocabSections() {
    vocabHeadings = [];
    vocabHrBefore = [];
    if (!isVocabPage) return;
    for (var t = 0; t < tables.length; t++) {
      var heading = groupHeading(tables[t]);
      vocabHeadings.push(heading || null);
      var hrb = heading && heading.previousElementSibling;
      vocabHrBefore.push(hrb && hrb.tagName === 'HR' ? hrb : null);
    }
  }

  function wireClearControls() {
    if (!isVocabPage) return;
    var clearSearch = document.getElementById('vocabClearSearch');
    var clearFilters = document.getElementById('vocabClearFilters');

    function reflectClearSearch() {
      if (clearSearch) { clearSearch.hidden = searchInput.value.length === 0; }
    }
    if (clearSearch) {
      clearSearch.addEventListener('click', function() {
        searchInput.value = '';
        reflectClearSearch();
        doSearch();
        searchInput.focus();
      });
    }
    searchInput.addEventListener('input', reflectClearSearch);

    function reflectClearFilters() {
      if (clearFilters) { clearFilters.hidden = currentFilter === 'all'; }
    }
    if (clearFilters) {
      clearFilters.addEventListener('click', function() {
        var allBtn = document.querySelector('.vocab-filter-btn[data-filter="all"]');
        if (allBtn) { allBtn.click(); } else {
          currentFilter = 'all'; reflectClearFilters(); doSearch();
        }
        reflectClearFilters();
      });
    }
    // expose reflect hooks for the filter wiring below
    wireClearControls._search = reflectClearSearch;
    wireClearControls._filters = reflectClearFilters;
    reflectClearSearch();
    reflectClearFilters();
  }

  // ── Transliteration helpers ───────────────────────────────

  // Convert Devanagari -> simplified Latin (for matching Latin queries)
  function devanagariToLatin(str) {
    if (!str) return '';
    var s = str;
    // Consonants
    s = s.replace(/\u0915\u094D\u0937/g, 'ksh');   // क्ष
    s = s.replace(/\u091C\u094D\u091E/g, 'jny');   // ज्ञ
    s = s.replace(/\u0924\u094D\u0930/g, 'tra');   // त्र
    s = s.replace(/\u0936\u094D\u0930/g, 'shra');  // श्र
    s = s.replace(/\u0916/g, 'kh');
    s = s.replace(/\u0918/g, 'gh');
    s = s.replace(/\u0919/g, 'ng');
    s = s.replace(/\u091B/g, 'chh');
    s = s.replace(/\u091A/g, 'ch');
    s = s.replace(/\u091D/g, 'jh');
    s = s.replace(/\u091C/g, 'j');
    s = s.replace(/\u091E/g, 'ny');
    s = s.replace(/\u0920/g, 'tth');
    s = s.replace(/\u091F/g, 'tt');
    s = s.replace(/\u0922/g, 'ddh');
    s = s.replace(/\u0921/g, 'dd');
    s = s.replace(/\u0923/g, 'nn');
    s = s.replace(/\u0925/g, 'th');
    s = s.replace(/\u0927/g, 'dh');
    s = s.replace(/\u092D/g, 'bh');
    s = s.replace(/\u092B/g, 'ph');
    s = s.replace(/\u0937/g, 'ss');
    s = s.replace(/\u0936/g, 'sh');
    s = s.replace(/\u0915/g, 'k');
    s = s.replace(/\u0917/g, 'g');
    s = s.replace(/\u0939/g, 'h');
    s = s.replace(/\u0924/g, 't');
    s = s.replace(/\u0926/g, 'd');
    s = s.replace(/\u0928/g, 'n');
    s = s.replace(/\u092A/g, 'p');
    s = s.replace(/\u092C/g, 'b');
    s = s.replace(/\u092E/g, 'm');
    s = s.replace(/\u092F/g, 'y');
    s = s.replace(/\u0930/g, 'r');
    s = s.replace(/\u0932/g, 'l');
    s = s.replace(/\u0935/g, 'v');
    s = s.replace(/\u0938/g, 's');
    // Vowels
    s = s.replace(/\u0905/g, 'a');
    s = s.replace(/\u0906/g, 'aa');
    s = s.replace(/\u0907/g, 'i');
    s = s.replace(/\u0908/g, 'ii');
    s = s.replace(/\u0909/g, 'u');
    s = s.replace(/\u090A/g, 'uu');
    s = s.replace(/\u090B/g, 'ri');
    s = s.replace(/\u090F/g, 'e');
    s = s.replace(/\u0910/g, 'ai');
    s = s.replace(/\u0913/g, 'o');
    s = s.replace(/\u0914/g, 'au');
    s = s.replace(/\u0902/g, 'm');
    s = s.replace(/\u0903/g, 'h');
    s = s.replace(/\u094D/g, '');   // virama
    // Matras
    s = s.replace(/\u093E/g, 'aa');
    s = s.replace(/\u093F/g, 'i');
    s = s.replace(/\u0940/g, 'ii');
    s = s.replace(/\u0941/g, 'u');
    s = s.replace(/\u0942/g, 'uu');
    s = s.replace(/\u0943/g, 'ri');
    s = s.replace(/\u0947/g, 'e');
    s = s.replace(/\u0948/g, 'ai');
    s = s.replace(/\u094B/g, 'o');
    s = s.replace(/\u094C/g, 'au');
    return s.toLowerCase();
  }

  // Convert Latin -> Devanagari (approximate, for reverse matching)
  function latinToDevanagari(str) {
    if (!str) return '';
    var s = str.toLowerCase();
    s = s.replace(/ksh/g, '\u0915\u094D\u0937');
    s = s.replace(/jny/g, '\u091C\u094D\u091E');
    s = s.replace(/tra/g, '\u0924\u094D\u0930');
    s = s.replace(/shra/g, '\u0936\u094D\u0930');
    s = s.replace(/sh/g, '\u0936');
    s = s.replace(/ss/g, '\u0937');
    s = s.replace(/chh/g, '\u091B');
    s = s.replace(/ch/g, '\u091A');
    s = s.replace(/kh/g, '\u0916');
    s = s.replace(/gh/g, '\u0918');
    s = s.replace(/ng/g, '\u0919');
    s = s.replace(/jh/g, '\u091D');
    s = s.replace(/ny/g, '\u091E');
    s = s.replace(/tth/g, '\u0920');
    s = s.replace(/th/g, '\u0925');
    s = s.replace(/tt/g, '\u091F');
    s = s.replace(/ddh/g, '\u0922');
    s = s.replace(/dh/g, '\u0927');
    s = s.replace(/dd/g, '\u0921');
    s = s.replace(/nn/g, '\u0923');
    s = s.replace(/ph/g, '\u092B');
    s = s.replace(/bh/g, '\u092D');
    s = s.replace(/aa/g, '\u0906');
    s = s.replace(/ai/g, '\u0910');
    s = s.replace(/au/g, '\u0914');
    s = s.replace(/ii/g, '\u0908');
    s = s.replace(/ee/g, '\u0908');
    s = s.replace(/uu/g, '\u090A');
    s = s.replace(/oo/g, '\u090A');
    s = s.replace(/ri/g, '\u090B');
    s = s.replace(/k/g, '\u0915');
    s = s.replace(/g/g, '\u0917');
    s = s.replace(/h/g, '\u0939');
    s = s.replace(/c/g, '\u091A');
    s = s.replace(/j/g, '\u091C');
    s = s.replace(/t/g, '\u0924');
    s = s.replace(/d/g, '\u0926');
    s = s.replace(/n/g, '\u0928');
    s = s.replace(/p/g, '\u092A');
    s = s.replace(/b/g, '\u092C');
    s = s.replace(/m/g, '\u092E');
    s = s.replace(/y/g, '\u092F');
    s = s.replace(/r/g, '\u0930');
    s = s.replace(/l/g, '\u0932');
    s = s.replace(/v/g, '\u0935');
    s = s.replace(/w/g, '\u0935');
    s = s.replace(/s/g, '\u0938');
    s = s.replace(/a/g, '\u0905');
    s = s.replace(/i/g, '\u0907');
    s = s.replace(/u/g, '\u0909');
    s = s.replace(/e/g, '\u090F');
    s = s.replace(/o/g, '\u0913');
    return s;
  }

  function normalize(text) {
    if (!text) return '';
    return text.toLowerCase()
      .replace(/[āĀ]/g, 'a')
      .replace(/[īĪ]/g, 'i')
      .replace(/[ūŪ]/g, 'u')
      .replace(/[ṛṚ]/g, 'ri')
      .replace(/[ḷḶ]/g, 'li')
      .replace(/[ṃṁṅñṇn]/g, 'n')
      .replace(/[ḥ]/g, 'h')
      .replace(/[śṣs]/g, 'sh')
      .replace(/[čć]/g, 'ch')
      .trim();
  }

  function getGender(row) {
    var cells = row.querySelectorAll('td');
    for (var i = 0; i < cells.length; i++) {
      var t = cells[i].textContent.trim();
      if (t === 'M' || t === '♂') return 'masc';
      if (t === 'F' || t === '♀') return 'fem';
      if (t === 'N' || t === '⚲') return 'neut';
    }
    return '';
  }

  function hasGujarati(cell) {
    return /[\u0A80-\u0AFF]/.test(cell.textContent);
  }

  function isEnglishCell(cell) {
    var txt = cell.textContent.trim();
    return /^[A-Za-z][A-Za-z\s\-/;,.()]+$/.test(txt) && txt.length < 50;
  }

  function findHeading(table) {
    var el = table.previousElementSibling;
    while (el) {
      if (el.tagName === 'H2') return el;
      if (el.querySelector && el.querySelector('h2')) return el.querySelector('h2');
      el = el.previousElementSibling;
    }
    return null;
  }

  function doSearch() {
    var query = normalize(searchInput.value);
    var totalVisible = 0;
    var totalRows = 0;
    var sectionCounts = {}; // dhatu: visible rows per table index, for per-group empty states

    for (var t = 0; t < tables.length; t++) {
      var table = tables[t];
      // Dhatu page: only the two root tables participate in the search;
      // Guna-change reference tables keep all their rows untouched.
      if (isDhatuPage && rootTables && rootTables.indexOf(table) === -1) { continue; }
      var rows = table.querySelectorAll('tbody tr');
      var sectionVisible = 0;

      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        var cells = row.querySelectorAll('td');
        if (cells.length < 2) continue;

        totalRows++;

        var sanskritText = '';
        var englishText = '';
        var gujaratiText = '';
        var allText = '';
        // Dhatu page: mixed meaning cells like "To wander / ભટકવું" hold an
        // English half too; capture only the Latin letters here so the
        // English filter can work even when the cell also has Gujarati.
        var latinHalfText = '';
        var gender = getGender(row);

        for (var c = 0; c < cells.length; c++) {
          var txt = cells[c].textContent;
          allText += ' ' + txt;

          if (c === 0) {
            sanskritText += ' ' + txt;
          } else if (hasGujarati(cells[c])) {
            gujaratiText += ' ' + txt;
            if (isDhatuPage) { latinHalfText += ' ' + txt.replace(/[\u0A80-\u0AFF\u00B7\u200C]/g, ' '); }
          } else if (isEnglishCell(cells[c])) {
            englishText += ' ' + txt;
          } else {
            sanskritText += ' ' + txt;
          }
        }

        var q = query;
        var latinQuery = devanagariToLatin(q);
        var devaQuery = latinToDevanagari(q);
        var normAll = normalize(allText);
        var latinSanskrit = devanagariToLatin(sanskritText);
        var matchesQuery = !q || normAll.indexOf(q) !== -1 || normAll.indexOf(latinQuery) !== -1 || normAll.indexOf(devaQuery) !== -1 || latinSanskrit.indexOf(q) !== -1;
        var matchesFilter = currentFilter === 'all';

        if (!matchesFilter) {
          if (['masc', 'fem', 'neut'].indexOf(currentFilter) !== -1) {
            matchesFilter = gender === currentFilter;
          } else if (currentFilter === 'sans') {
            matchesFilter = normalize(sanskritText).indexOf(q) !== -1 || devanagariToLatin(sanskritText).indexOf(q) !== -1 || normalize(sanskritText).indexOf(latinToDevanagari(q)) !== -1;
          } else if (currentFilter === 'eng') {
            matchesFilter = normalize(englishText).indexOf(q) !== -1;
            // Dhatu page: meaning cells mix English and Gujarati, so also
            // match against the Latin half captured above.
            if (!matchesFilter && isDhatuPage) {
              matchesFilter = normalize(latinHalfText).indexOf(q) !== -1;
            }
          } else if (currentFilter === 'guj') {
            matchesFilter = normalize(gujaratiText).indexOf(q) !== -1;
          }
        }

        var visible = matchesQuery && matchesFilter;
        if (visible) {
          row.style.display = '';
          sectionVisible++;
        } else {
          row.style.display = 'none';
        }
        // The vocabulary mobile card mirrors this exact row (1:1) — same data,
        // same visibility; no separate filtering pass, no duplicated results.
        var card = cardLookup(t, r);
        if (card) { card.style.display = visible ? '' : 'none'; }
      }

      totalVisible += sectionVisible;

      var heading = isVocabPage ? vocabHeadings[t] : findHeading(table);
      if (!isVocabPage && heading) {
        heading.style.display = sectionVisible > 0 ? '' : 'none';
      }
      // Hide the whole group (heading + table + cards) when nothing matches —
      // collapse at the Material scrollwrap level so no empty bordered box,
      // spacing, or separator remains (see setGroupHidden).
      setGroupHidden(table, sectionVisible === 0, heading);
      sectionCounts[t] = sectionVisible;
    }

    // Dhatu page: per-group inline empty state — shown for a group with no
    // matches ONLY while the other group still has results; when nothing
    // matches anywhere, the single overall empty-state message covers both.
    if (isDhatuPage && rootTables && rootEmptyMessages) {
      for (var g = 0; g < rootTables.length; g++) {
        var gt = rootTables[g];
        var gtIndex = -1;
        for (var x = 0; x < tables.length; x++) {
          if (tables[x] === gt) { gtIndex = x; break; }
        }
        var itsCount = gtIndex === -1 ? 0 : (sectionCounts[gtIndex] || 0);
        var othersCount = 0;
        for (var y = 0; y < rootTables.length; y++) {
          if (rootTables[y] === gt) { continue; }
          var yIndex = -1;
          for (var z = 0; z < tables.length; z++) {
            if (tables[z] === rootTables[y]) { yIndex = z; break; }
          }
          othersCount += (yIndex === -1 ? 0 : (sectionCounts[yIndex] || 0));
        }
        var msg = rootEmptyMessages[g];
        if (msg) {
          msg.hidden = !(itsCount === 0 && othersCount > 0 && (query || currentFilter !== 'all'));
        }
      }
    }

    // Vocabulary page: a '---' section separator stays visible only when BOTH
    // the section that precedes it and the section that follows it remain, so
    // collapsed sections leave no stray rules or double gaps behind.
    if (isVocabPage && vocabHeadings.length) {
      for (var s = 0; s < vocabHeadings.length; s++) {
        var hrEl = vocabHrBefore[s];
        if (!hrEl) continue;
        var beforeVisible = s > 0 ? sectionCounts[s - 1] > 0 : true;
        var afterVisible = sectionCounts[s] > 0;
        hrEl.style.display = beforeVisible && afterVisible ? '' : 'none';
      }
    }

    if ((isVocabPage || isDhatuPage) && emptyState) {
      emptyState.hidden = !(totalVisible === 0 && (query || currentFilter !== 'all'));
    }

    if (resultCount) {
      if (!query && currentFilter === 'all') {
        resultCount.textContent = 'Showing all ' + totalRows + ' entries — type to filter';
      } else if (totalVisible === 0) {
        resultCount.textContent = 'No matches found. Try a different spelling or filter.';
      } else {
        resultCount.textContent = 'Showing ' + totalVisible + ' of ' + totalRows + ' entries';
      }
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', doSearch);
  }

  for (var b = 0; b < filterBtns.length; b++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        for (var i = 0; i < filterBtns.length; i++) {
          filterBtns[i].classList.remove('active');
          if (isVocabPage) { filterBtns[i].setAttribute('aria-checked', 'false'); }
        }
        btn.classList.add('active');
        if (isVocabPage) { btn.setAttribute('aria-checked', 'true'); }
        currentFilter = btn.dataset.filter;
        if (wireClearControls._filters) { wireClearControls._filters(); }
        doSearch();
      });
    })(filterBtns[b]);
  }

  buildVocabCards();
  buildVocabSections();
  determineRootTables();
  rootEmptyMessages = ensureRootGroupEmptyMessages();
  ensureEmptyState();
  wireClearControls();
  doSearch();
});