import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production build hardening. Electron bundles ship readable JS to every
// installed device, so anything we can do to mangle identifier names and
// remove dev-only helpers tightens the IP exposure surface. ESBuild is
// already part of Vite, so we configure it instead of pulling in terser
// separately (smaller install, faster builds).
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Use ESBuild's minifier — also mangles identifiers when 'mangle' is on.
    minify: mode === 'production' ? 'esbuild' : false,
    sourcemap: mode === 'production' ? false : 'inline',
    // Code splitting kept on so the React vendor bundle can be cached
    // across releases, reducing release-day update bytes.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  esbuild: {
    // Drop console.* and debugger statements from production bundles.
    // Keeps the bundle smaller and removes accidental information
    // disclosure (we've seen API key prefixes get logged during dev).
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    // Strip license comments — keeps the LICENSE-style banners in the
    // root LICENSE file, not duplicated in every bundle chunk.
    legalComments: mode === 'production' ? 'none' : 'inline',
    // Mangle private (underscore-prefixed) properties so internal class
    // structure isn't trivially readable in the shipped bundle. Public
    // API names (anything without a leading underscore) stay intact so
    // hot-reload, debugger breakpoints, and library interop keep working.
    mangleProps: mode === 'production' ? /^_/ : undefined,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
}));
