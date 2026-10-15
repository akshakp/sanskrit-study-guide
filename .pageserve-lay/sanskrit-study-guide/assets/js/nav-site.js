// Study Topics header dropdown (desktop only).
// Scoped to the [data-menu-root] built by docs/overrides/partials/tabs-item.html.
// Behavior: click toggles; Escape closes and refocuses the trigger;
// outside click closes; moving focus outside closes (focusout).
(function () {
  function closeMenu(root, trigger, panel) {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    root.classList.remove('md-tabs__dd--open');
  }
  function setup(root) {
    var trigger = root.querySelector('[data-menu-trigger]');
    var panel = root.querySelector('[data-menu-panel]');
    if (!trigger || !panel) return;

    trigger.addEventListener('click', function () {
      var open = panel.hidden;
      // Close every other open dropdown (single instance in the header).
      document.querySelectorAll('[data-menu-panel]').forEach(function (p) {
        if (p !== panel) {
          p.hidden = true;
          var r = p.closest('[data-menu-root]');
          var t = r && r.querySelector('[data-menu-trigger]');
          if (t) t.setAttribute('aria-expanded', 'false');
          if (r) r.classList.remove('md-tabs__dd--open');
        }
      });
      panel.hidden = !open;
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      root.classList.toggle('md-tabs__dd--open', open);
    });

    trigger.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        closeMenu(root, trigger, panel);
        trigger.blur();
      }
      if (ev.key === 'ArrowDown' || ev.key === 'Enter' || ev.key === ' ') {
        if (panel.hidden) {
          ev.preventDefault();
          trigger.click();
        }
      }
    });

    panel.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        closeMenu(root, trigger, panel);
        trigger.focus();
      }
    });

    document.addEventListener('click', function (ev) {
      if (!panel.hidden && !root.contains(ev.target)) {
        closeMenu(root, trigger, panel);
      }
    });

    root.addEventListener('focusout', function (ev) {
      // Close when focus moves entirely outside the dropdown; a microtask
      // delay lets inside focus changes settle first.
      window.setTimeout(function () {
        var active = document.activeElement;
        if (!panel.hidden && (!active || !root.contains(active))) {
          closeMenu(root, trigger, panel);
        }
      }, 0);
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-menu-root]').forEach(setup);
  });
})();
