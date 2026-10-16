// Conversation page: native section selector on mobile (below 768px).
// The horizontal pymdownx.tabbed strip stays for 768px+; below 768px CSS
// hides it and this script shows a full-width native <select> that drives
// the SAME tab inputs/panels — no second content dataset, no page reload.
// The <select> is built from the tab labels themselves, so the option
// names can never drift from the desktop tab labels.
(function () {
  function init() {
    // Conversation-page scoping: only pages with the conv reference tables.
    var set = document.querySelector('.tabbed-set');
    if (!set || !set.querySelector('.conv-ref')) return;
    if (set.querySelector('.conv-select')) return; // idempotent

    var inputs = Array.prototype.slice.call(set.querySelectorAll(':scope > input[type="checkbox"], :scope > input[type="radio"]'));
    var labelsWrap = set.querySelector('.tabbed-labels');
    if (!inputs.length || !labelsWrap) return;

    var wrap = document.createElement('div');
    wrap.className = 'conv-section-select';

    var label = document.createElement('label');
    label.className = 'conv-select-caption';
    label.textContent = 'Conversation section';
    label.setAttribute('for', 'convSectionSelect');

    var select = document.createElement('select');
    select.id = 'convSectionSelect';
    select.className = 'conv-select';
    select.setAttribute('aria-label', 'Conversation section');
    labelsWrap.querySelectorAll(':scope > label').forEach(function (tabLabel, i) {
      if (!inputs[i]) return;
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = tabLabel.textContent.trim();
      select.appendChild(opt);
    });

    var syncing = false;
    function applyIndex(i) {
      var input = inputs[i];
      if (!input || input.checked) { syncSelectToInputs(); return; }
      input.checked = true;
      // Material's tab logic listens for 'change' on the inputs; the
      // dispatch triggers panel switching and label linking as-is.
      input.dispatchEvent(new Event('change', { bubbles: true }));
      syncSelectToInputs();
    }
    function syncSelectToInputs() {
      if (syncing) return;
      syncing = true;
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].checked) { select.value = String(i); break; }
      }
      syncing = false;
    }

    select.addEventListener('change', function () {
      applyIndex(parseInt(select.value, 10) || 0);
    });

    // Both directions: desktop tab clicks keep the select synchronized
    // (so the selection persists across mobile↔desktop viewport changes).
    inputs.forEach(function (input) {
      input.addEventListener('change', syncSelectToInputs);
    });

    wrap.appendChild(label);
    wrap.appendChild(select);
    set.insertBefore(wrap, labelsWrap);
    syncSelectToInputs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
