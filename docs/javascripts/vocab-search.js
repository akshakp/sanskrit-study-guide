// Vocabulary Search & Filter
// Searches Sanskrit, English, and Gujarati across all tables on the page

document.addEventListener('DOMContentLoaded', function() {
  if (!document.querySelector('.vocab-search-box')) return;

  const searchInput = document.getElementById('vocabSearch');
  const filterBtns = document.querySelectorAll('.vocab-filter-btn');
  const sections = document.querySelectorAll('.vocab-section');
  const resultCount = document.getElementById('vocabResultCount');

  let currentFilter = 'all';

  function normalize(text) {
    if (!text) return '';
    return text.toLowerCase()
      .replace(/[āĀ]/g, 'a')
      .replace(/[īĪ]/g, 'i')
      .replace(/[ūŪ]/g, 'u')
      .replace(/[ṛṚ]/g, 'ri')
      .replace(/[ḷḶ]/g, 'li')
      .replace(/[ṃṅñṇn]/g, 'n')
      .replace(/[ḥ]/g, 'h')
      .replace(/[śṣs]/g, 'sh')
      .replace(/[čć]/g, 'ch')
      .replace(/[ǎ]/g, 'a')
      .trim();
  }

  function getGender(row) {
    const cells = row.querySelectorAll('td');
    for (let cell of cells) {
      const t = cell.textContent.trim();
      if (t === 'M' || t === '♂') return 'masc';
      if (t === 'F' || t === '♀') return 'fem';
      if (t === 'N' || t === '⚲') return 'neut';
    }
    return '';
  }

  function doSearch() {
    const query = normalize(searchInput.value);
    let totalVisible = 0;
    let totalRows = 0;

    sections.forEach(section => {
      const table = section.querySelector('table');
      if (!table) return;
      const rows = table.querySelectorAll('tbody tr');
      let sectionVisible = 0;

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;

        const rowText = normalize(row.textContent);
        const gender = getGender(row);

        totalRows++;

        const matchesQuery = !query || rowText.includes(query);

        let matchesFilter = currentFilter === 'all';
        if (!matchesFilter) {
          if (['masc','fem','neut'].includes(currentFilter)) {
            matchesFilter = gender === currentFilter;
          } else if (currentFilter === 'sans') {
            // First cell is likely Sanskrit
            matchesFilter = normalize(cells[0].textContent).includes(query);
          } else if (currentFilter === 'eng') {
            // Try to find English meaning cell (usually 2nd or 3rd)
            for (let c of cells) {
              const txt = c.textContent.trim();
              if (/^[A-Za-z][A-Za-z\s\/]+$/.test(txt) && txt.length < 40) {
                matchesFilter = normalize(txt).includes(query);
                if (matchesFilter) break;
              }
            }
            if (!matchesFilter) {
              // fallback: search all cells except first
              for (let i = 1; i < cells.length; i++) {
                if (normalize(cells[i].textContent).includes(query)) {
                  matchesFilter = true; break;
                }
              }
            }
          } else if (currentFilter === 'guj') {
            // Gujarati text contains specific Unicode range
            for (let c of cells) {
              const txt = c.textContent;
              if (/[઀-૿]/.test(txt)) {
                matchesFilter = normalize(txt).includes(query);
                if (matchesFilter) break;
              }
            }
          }
        }

        const visible = matchesQuery && matchesFilter;
        row.style.display = visible ? '' : 'none';
        if (visible) sectionVisible++;
      });

      totalVisible += sectionVisible;

      // Show/hide section heading based on visible rows
      const heading = section.previousElementSibling;
      if (heading && (heading.tagName === 'H2' || heading.tagName === 'H3')) {
        heading.style.display = sectionVisible > 0 ? '' : 'none';
      }
      section.style.display = sectionVisible > 0 ? '' : 'none';
    });

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
    searchInput.addEventListener('focus', function() {
      this.parentElement.classList.add('focused');
    });
    searchInput.addEventListener('blur', function() {
      this.parentElement.classList.remove('focused');
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      doSearch();
    });
  });

  // Initial count
  doSearch();
});
