// Glasshouse is now the default (and only) theme. The previous classic shell
// has been retired; this module stays only so call sites that imported it
// (App.jsx auth gate, terminal pane chrome, sidenav) keep compiling.
//
// `applyTheme(true)` is invoked at boot from main.jsx so `body[data-theme]
// = "glasshouse"` is always set, which keeps the tokens.css scanline + font
// rules active.

export function isGlasshouseEnabled() {
  return true;
}

export function applyTheme(on) {
  if (on) {
    document.body.setAttribute('data-theme', 'glasshouse');
  } else {
    document.body.removeAttribute('data-theme');
  }
}

export function initGlasshouseTheme() {
  applyTheme(true);
}
