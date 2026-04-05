/* ═══════════════════════════════════════════════════
   KANTO TCG — THEME SWITCHER
   Toggles FireRed/LeafGreen dark ↔ Game Boy green
   ═══════════════════════════════════════════════════ */
(function () {
  const KEY = 'kanto-theme';

  function getSaved() {
    try { return localStorage.getItem(KEY) || 'frlg'; } catch(e) { return 'frlg'; }
  }
  function setSaved(v) {
    try { localStorage.setItem(KEY, v); } catch(e) {}
  }

  function applyTheme(theme) {
    if (theme === 'gb') {
      document.documentElement.setAttribute('data-theme', 'gb');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  /* Apply immediately to prevent flash */
  applyTheme(getSaved());

  function injectButton() {
    const existing = document.getElementById('theme-toggle-btn');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.id = 'theme-toggle-btn';
    btn.className = 'theme-toggle';

    function updateBtn(theme) {
      if (theme === 'gb') {
        btn.innerHTML = '<span class="theme-toggle-icon">🔴</span>FR/LG Mode';
        btn.title = 'Switch to FireRed / LeafGreen dark theme';
      } else {
        btn.innerHTML = '<span class="theme-toggle-icon">🟢</span>GB Mode';
        btn.title = 'Switch to Game Boy green theme';
      }
    }

    updateBtn(getSaved());

    btn.addEventListener('click', function () {
      const next = getSaved() === 'frlg' ? 'gb' : 'frlg';
      setSaved(next);
      applyTheme(next);
      updateBtn(next);
    });

    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }
})();
