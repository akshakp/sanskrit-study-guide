// Shared mobile section selector for pymdownx.tabbed study pages.
// Generalized from the approved Conversation implementation. All tabbed
// pages get the same mobile behavior: below 768px CSS hides the horizontal
// tab strip and this script shows one full-width native <select> that
// drives the SAME tab inputs/panels — no second content dataset, no page
// reload, and the option names can never drift from the desktop tab
// labels because they are read from the rendered tab labels themselves.
// Page caption is derived from the page h1, so Conversation keeps its
// existing accessible label verbatim ("Conversation section").
(function () {
  function pageCaption() {
    var h1 = document.querySelector('.md-content__inner h1, .md-content h1');
    var text = h1 ? h1.textContent : '';
    var paren = text.indexOf('(');
    if (paren > 0) text = text.slice(0, paren);
    text = text.replace(/\s+/g, ' ').trim();
    return text ? text + ' section' : 'Study section';
  }

  // Active tab label of a tabbed set (drives the nested caption text so
  // two selector levels remain distinguishable for screen readers).
  function activeLabel(set) {
    var labelsWrap = set.querySelector(':scope > .tabbed-labels') ||
                     set.querySelector(':scope > .tabbed-controls');
    if (!labelsWrap) return '';
    var inputs = Array.prototype.slice.call(
      set.querySelectorAll(':scope > input[type="checkbox"], :scope > input[type="radio"]'));
    var labels = labelsWrap.querySelectorAll(':scope > label, :scope > .tabbed-control > label');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].checked && labels[i]) { return labels[i].textContent.trim(); }
    }
    return labels[0] ? labels[0].textContent.trim() : '';
  }

  function buildSelect(set, parentSet, ordinal) {
    if (set.querySelector('.tab-select-wrap')) return; // idempotent

    var inputs = Array.prototype.slice.call(
      set.querySelectorAll(':scope > input[type="checkbox"], :scope > input[type="radio"]'));
    var labelsWrap = set.querySelector(':scope > .tabbed-labels') ||
                     set.querySelector(':scope > .tabbed-controls');
    if (!inputs.length || !labelsWrap) return;

    var wrap = document.createElement('div');
    wrap.className = 'tab-select-wrap';
    if (parentSet) { wrap.classList.add('tab-select-wrap--nested'); }

    var selectId = 'tabSectionSelect' + ordinal;
    var caption = document.createElement('label');
    caption.className = 'tab-select-caption';
    caption.setAttribute('for', selectId);

    var select = document.createElement('select');
    select.id = selectId;
    select.className = 'tab-select';
    // Semantic label per level: top-level uses the page caption
    // ("Sandhi section"); nested groups use the parent tab's name so the
    // two selectors can never be confused ("Within स्वर-सन्धिः").
    function syncCaption() {
      var text = parentSet ? ('Within ' + activeLabel(parentSet)) : pageCaption();
      caption.textContent = text;
      select.setAttribute('aria-label', text);
    }

    labelsWrap.querySelectorAll(':scope > label, :scope > .tabbed-control > label')
      .forEach(function (tabLabel, i) {
        if (!inputs[i]) return;
        var opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = tabLabel.textContent.trim();
        select.appendChild(opt);
      });
    if (select.options.length < 1) return;

    var syncing = false;
    function syncSelectToInputs() {
      if (syncing) return;
      syncing = true;
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].checked) { select.value = String(i); break; }
      }
      syncing = false;
    }
    function applyIndex(i) {
      var input = inputs[i];
      if (!input || input.checked) { syncSelectToInputs(); return; }
      input.checked = true;
      // Material's tab logic listens for 'change' on the tab inputs; the
      // dispatched event drives panel switching as-is.
      input.dispatchEvent(new Event('change', { bubbles: true }));
      syncSelectToInputs();
    }

    select.addEventListener('change', function () {
      applyIndex(parseInt(select.value, 10) || 0);
    });
    // Both directions: desktop tab clicks keep the select synchronized
    // (so the selection persists across mobile↔desktop viewport changes).
    inputs.forEach(function (input) {
      input.addEventListener('change', syncSelectToInputs);
    });

    // When the PARENT group changes, refresh the nested caption so it
    // always names the currently active parent section.
    if (parentSet) {
      var parentInputs = Array.prototype.slice.call(
        parentSet.querySelectorAll(':scope > input[type="checkbox"], :scope > input[type="radio"]'));
      parentInputs.forEach(function (pi) {
        pi.addEventListener('change', syncCaption);
      });
    }

    wrap.appendChild(caption);
    wrap.appendChild(select);
    set.insertBefore(wrap, labelsWrap);
    wrap.style.display = 'none';
    syncCaption();
    syncSelectToInputs();
    // Show only on mobile; desktop visibility is controlled by CSS media
    // queries (hidden ≥768px, visible <768px) with a rAF fallback guard so
    // the control never flashes on desktop pages before CSS settles.
    var mq = window.matchMedia('(min-width: 768px)');
    applyMedia();
    if (mq.addEventListener) mq.addEventListener('change', applyMedia);
    else mq.addListener(applyMedia);
    function applyMedia() { wrap.style.display = mq.matches ? 'none' : ''; }
  }

  function init() {
    // Content tab groups at ANY depth get a mobile selector. Nested groups
    // (e.g. Sandhi's दीर्घसन्धिः/गुणसन्धिः inside स्वर-सन्धिः, or the
    // Visarga subsections) get a contextually labeled second select that
    // lives inside their own block, so it is only ever visible while that
    // parent section is active — no hidden or unusable controls.
    var all = document.querySelectorAll('.md-content__inner .tabbed-set, .md-content .tabbed-set');
    var setIndex = 0;
    all.forEach(function (set) {
      var parentSet = set.parentElement && set.parentElement.closest('.tabbed-set') || null;
      buildSelect(set, parentSet, setIndex++);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
