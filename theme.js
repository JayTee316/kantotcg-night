/* ═══════════════════════════════════════════════════
   KANTO TCG — THEME SWITCHER
   Toggles between FireRed/LeafGreen dark and Game Boy
   Preference saved to localStorage
   ═══════════════════════════════════════════════════ */

(function () {
  const STORAGE_KEY = 'kanto-tcg-theme';
  const THEMES = {
    frlg: { icon: '🔴', label: 'GB Mode',  attr: null   },
    gb:   { icon: '🟢', label: 'FR/LG Mode', attr: 'gb' },
  };

  /* Apply theme immediately on script load (before paint) */
  const saved = localStorage.getItem(STORAGE_KEY) || 'frlg';
  if (saved === 'gb') {
    document.documentElement.setAttribute('data-theme', 'gb');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  /* Inject toggle button once DOM is ready */
  function injectButton() {
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.id = 'theme-toggle-btn';
    updateButton(btn, saved);
    btn.addEventListener('click', () => {
      const current = localStorage.getItem(STORAGE_KEY) || 'frlg';
      const next = current === 'frlg' ? 'gb' : 'frlg';
      localStorage.setItem(STORAGE_KEY, next);
      if (next === 'gb') {
        document.documentElement.setAttribute('data-theme', 'gb');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      updateButton(btn, next);
    });
    document.body.appendChild(btn);
  }

  function updateButton(btn, theme) {
    const t = THEMES[theme];
    btn.innerHTML = `<span class="theme-toggle-icon">${t.icon}</span>${t.label}`;
    btn.title = theme === 'frlg'
      ? 'Switch to Game Boy green theme'
      : 'Switch to FireRed / LeafGreen dark theme';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }
})();
