// Glasshouse theme toggle. Sets data-theme on <body> based on user pref so
// CSS in `src/styles/tokens.css` activates the new chrome (scanlines, fonts,
// background gradients). Existing palette system in `themes.js` keeps doing
// its thing; the two layers don't conflict because tokens.css uses a `--gh-*`
// namespace and only paints body chrome.
//
// Default: classic theme. Users opt in via Settings → Appearance → "Glasshouse
// (preview)" toggle, or via the dev shortcut `localStorage.gh_theme = "1"`.

const STORAGE_KEY = 'flowade.theme.glasshouse';

export function isGlasshouseEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setGlasshouseEnabled(on) {
  try {
    if (on) localStorage.setItem(STORAGE_KEY, '1');
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
  applyTheme(on);
}

export function applyTheme(on) {
  if (on) {
    document.body.setAttribute('data-theme', 'glasshouse');
  } else {
    document.body.removeAttribute('data-theme');
  }
}

export function initGlasshouseTheme() {
  applyTheme(isGlasshouseEnabled());
}
