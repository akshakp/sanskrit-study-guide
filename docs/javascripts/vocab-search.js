// Vocabulary / Dhatu Search & Filter
// Works on any page that has a search input with id="vocabSearch" or id="dhatuSearch"

document.addEventListener('DOMContentLoaded', function() {
  // Detect which page we're on
  var searchInput = document.getElementById('vocabSearch') || document.getElementById('dhatuSearch');
  if (!searchInput) return;

  var filterBtns = document.querySelectorAll('.vocab-filter-btn');
  var resultCount = document.getElementById('vocabResultCount') || document.getElementById('dhatuResultCount');

  // Find all tables within the main content area
  var contentArea = document.querySelector('.md-content__inner')
    || document.querySelector('.md-typeset')
    || document.querySelector('article')
    || document.body;
  var tables = contentArea.querySelectorAll('table');

  var currentFilter = 'all';

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
        var matchesQuery = !q || normalize(allText).indexOf(q) !== -1;
        var matchesFilter = currentFilter === 'all';

        if (!matchesFilter) {
          if (['masc', 'fem', 'neut'].indexOf(currentFilter) !== -1) {
            matchesFilter = gender === currentFilter;
          } else if (currentFilter === 'sans') {
            matchesFilter = normalize(sanskritText).indexOf(q) !== -1;
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
      }

      totalVisible += sectionVisible;

      var heading = findHeading(table);
      if (heading) {
        heading.style.display = sectionVisible > 0 ? '' : 'none';
      }
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
        }
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        doSearch();
      });
    })(filterBtns[b]);
  }

  doSearch();
});
