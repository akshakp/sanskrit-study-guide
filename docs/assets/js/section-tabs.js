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

  function init() {
    // Top-level tab sets in the article content only; nested tab groups
    // (any set inside another set) are left completely untouched.
    var all = document.querySelectorAll('.md-content__inner .tabbed-set, .md-content .tabbed-set');
    var setIndex = 0;
    all.forEach(function (set) {
      if (set.closest('.tabbed-set') && set.closest('.tabbed-set') !== set) return; // nested
      if (set.querySelector('.tab-select-wrap')) return; // idempotent

      var inputs = Array.prototype.slice.call(
        set.querySelectorAll(':scope > input[type="checkbox"], :scope > input[type="radio"]'));
      var labelsWrap = set.querySelector(':scope > .tabbed-labels') ||
                       set.querySelector(':scope > .tabbed-controls');
      if (!inputs.length || !labelsWrap) return;

      var wrap = document.createElement('div');
      wrap.className = 'tab-select-wrap';

      var selectId = 'tabSectionSelect' + (setIndex++);
      var caption = document.createElement('label');
      caption.className = 'tab-select-caption';
      caption.textContent = pageCaption();
      caption.setAttribute('for', selectId);

      var select = document.createElement('select');
      select.id = selectId;
      select.className = 'tab-select';
      select.setAttribute('aria-label', caption.textContent);
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

      wrap.appendChild(caption);
      wrap.appendChild(select);
      set.insertBefore(wrap, labelsWrap);
      wrap.style.display = 'none';
      syncSelectToInputs();
      // Show only on mobile; desktop visibility is controlled by CSS media
      // queries (hidden ≥768px, visible <768px) with a rAF fallback guard so
      // the control never flashes on desktop pages before CSS settles.
      var mq = window.matchMedia('(min-width: 768px)');
      applyMedia();
      if (mq.addEventListener) mq.addEventListener('change', applyMedia);
      else mq.addListener(applyMedia);
      function applyMedia() { wrap.style.display = mq.matches ? 'none' : ''; }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
