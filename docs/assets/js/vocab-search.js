// Vocabulary / Dhatu Search & Filter
// Works on any page that has a search input with id="vocabSearch" or id="dhatuSearch"

document.addEventListener('DOMContentLoaded', function() {
  // Detect which page we're on
  var searchInput = document.getElementById('vocabSearch') || document.getElementById('dhatuSearch');
  if (!searchInput) return;

  var isVocabPage = searchInput.id === 'vocabSearch';

  var filterBtns = document.querySelectorAll('.vocab-filter-btn');
  var resultCount = document.getElementById('vocabResultCount') || document.getElementById('dhatuResultCount');

  // Find all tables within the main content area
  var contentArea = document.querySelector('.md-content__inner')
    || document.querySelector('.md-typeset')
    || document.querySelector('article')
    || document.body;
  var tables = contentArea.querySelectorAll('table');

  var currentFilter = 'all';
  var emptyState = null;

  // ─── Vocabulary-page only: mobile cards + clear controls ────
  // The dhatu page shares this script with dhatuSearch and must not change.

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
    if (!isVocabPage) return;
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
        card.dataset.targetsTable = String(t);
        card.dataset.targetsRow = String(r);
        card.style.display = '';

        // Primary Devanagari term(s): the first column (Sanskrit or the male
        // profession form); second column joins it when labeled Female.
        var term = document.createElement('h4');
        term.className = 'vocab-card-term';
        var main = document.createElement('span');
        main.textContent = cells[0].textContent.trim();
        term.appendChild(main);
        if (cells.length > 1 && fieldRole(labels[1]) === 'female') {
          var fem = document.createElement('span');
          fem.className = 'vocab-card-fem';
          fem.textContent = cells[1].textContent.trim();
          term.appendChild(fem);
        }
        card.appendChild(term);

        var fields = document.createElement('dl');
        fields.className = 'vocab-card-fields';
        for (var c = 0; c < cells.length; c++) {
          var role = fieldRole(labels[c] || '');
          if (role === 'primary' || role === 'female') continue;
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

  function setGroupHidden(table, hidden) {
    // Vocabulary page only: hide the whole empty group (table + cards).
    // The dhatu page keeps its existing behavior (heading hides, table stays).
    if (!isVocabPage) { return; }
    if (hidden) {
      table.classList.add('vocab-group-hidden');
    } else {
      table.classList.remove('vocab-group-hidden');
    }
    var cards = table.parentElement && table.parentElement.classList.contains('vocab-table-wrap')
      ? table.parentElement.nextElementSibling
      : table.nextElementSibling;
    if (cards && cards.classList.contains('vocab-cards')) {
      cards.hidden = hidden;
    }
  }

  function ensureEmptyState() {
    if (!isVocabPage || emptyState) { return; }
    emptyState = document.createElement('div');
    emptyState.className = 'vocab-empty-state';
    emptyState.hidden = true;
    emptyState.setAttribute('role', 'status');
    emptyState.textContent = 'No vocabulary matches your search or filters. Try different spellings — Devanagari or Latin forms both work.';
    searchInput.parentNode.parentNode.appendChild(emptyState);
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

    for (var t = 0; t < tables.length; t++) {
      var table = tables[t];
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
        var gender = getGender(row);

        for (var c = 0; c < cells.length; c++) {
          var txt = cells[c].textContent;
          allText += ' ' + txt;

          if (c === 0) {
            sanskritText += ' ' + txt;
          } else if (hasGujarati(cells[c])) {
            gujaratiText += ' ' + txt;
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

      var heading = findHeading(table);
      if (heading) {
        heading.style.display = sectionVisible > 0 ? '' : 'none';
      }
      // Hide the whole group (table + cards) when nothing matches — do this via
      // a class so the desktop-table / mobile-cards decision stays in CSS.
      setGroupHidden(table, sectionVisible === 0);
    }

    if (isVocabPage && emptyState) {
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
  ensureEmptyState();
  wireClearControls();
  doSearch();
});