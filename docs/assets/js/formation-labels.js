// तद्धित mobile record labels (topics/krudant-tadvid page).
// The प्रत्यय formation table is authored as a Markdown table — the single
// authoritative dataset — so per-cell data-label attributes cannot carry
// through to the generated markup. Below 761px CSS turns the table into
// compact labeled record cards: the thead row is hidden and each cell is
// rendered with a ::before label taken from attr(data-label), which was
// always empty. This script derives the labels at load time from the
// table's own thead header row — the header row remains the only label
// source, so the mobile cards can never drift from the table's column
// semantics. No second dataset is created, and desktop (760px+) keeps
// the plain four-column formation table untouched.
(function () {
  function init() {
    var wrap = document.querySelector('.taddhit-formation');
    if (!wrap || wrap.dataset.labelsApplied === 'true') return;
    var table = wrap.querySelector('table');
    if (!table) return;
    var ths = table.querySelectorAll('thead th');
    if (!ths.length) return;

    var applied = false;
    table.querySelectorAll('tbody tr').forEach(function (row) {
      var cells = row.querySelectorAll('td');
      for (var i = 0; i < cells.length; i++) {
        var label = ths[i] ? ths[i].textContent.trim() : '';
        if (label) {
          cells[i].setAttribute('data-label', label);
          applied = true;
        }
      }
    });
    wrap.dataset.labelsApplied = applied ? 'true' : 'false';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
