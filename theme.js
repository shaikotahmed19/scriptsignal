(() => {
  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const storageKey = 'scriptsignal.theme';
  let preference = 'system';

  try {
    const savedTheme = window.localStorage.getItem(storageKey);
    if (savedTheme === 'light' || savedTheme === 'dark') preference = savedTheme;
  } catch {
    // Theme changes still work for the current page when storage is blocked.
  }

  function applyTheme() {
    const detectedTheme = systemTheme.matches ? 'dark' : 'light';
    root.dataset.theme = preference === 'system' ? detectedTheme : preference;
  }

  applyTheme();
  systemTheme.addEventListener('change', () => {
    if (preference === 'system') applyTheme();
  });

  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('theme-select');
    select.value = preference;
    select.addEventListener('change', () => {
      preference = select.value;
      applyTheme();

      try {
        window.localStorage.setItem(storageKey, preference);
      } catch {
        // The selection remains active until the page is reloaded.
      }
    });
  }, { once: true });
})();
