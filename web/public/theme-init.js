// Theme initialization script - runs BEFORE React hydration
// This prevents flash/black screen on initial page load

(function() {
  try {
    // Get theme from localStorage or use system preference
    const storageKey = 'continuum-theme';
    const rawTheme = localStorage.getItem(storageKey);
    let theme = rawTheme === 'light' || rawTheme === 'dark' || rawTheme === 'system'
      ? rawTheme
      : null;
    
    // Match RootLayout defaultTheme="dark" when nothing is stored yet.
    if (!theme) {
      theme = 'dark';
    } else if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = isDark ? 'dark' : 'light';
    }
    
    // Apply theme class to html element BEFORE React renders
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    // Fail open - if anything goes wrong, let React handle it
    console.warn('Theme init error:', e);
  }
})();
