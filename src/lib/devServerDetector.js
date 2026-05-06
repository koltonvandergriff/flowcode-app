/**
 * devServerDetector.js
 *
 * Parses terminal output to detect local development server URLs.
 * Returns the first detected URL or null.
 */

// Ordered patterns — more specific matchers come first so they
// capture the canonical URL from the framework's output, while the
// generic fallback catches everything else.
const PATTERNS = [
  // Vite:  Local:   http://localhost:5173/
  /Local:\s+(https?:\/\/localhost:\d+\S*)/,
  // Vite (Network):  Network:   http://192.168.x.x:5173/
  /Network:\s+(https?:\/\/\d+\.\d+\.\d+\.\d+:\d+\S*)/,
  // Next.js:  ready - started server on 0.0.0.0:3000, url: http://localhost:3000
  /url:\s*(https?:\/\/localhost:\d+\S*)/,
  // Next.js 13+:  - Local:        http://localhost:3000
  /[-▶]\s*Local:\s+(https?:\/\/localhost:\d+\S*)/,
  // Create React App:  Local:            http://localhost:3000
  /Local:\s+(https?:\/\/localhost:\d+\S*)/,
  // Webpack Dev Server:  Project is running at http://localhost:8080/
  /running at\s+(https?:\/\/localhost:\d+\S*)/i,
  // Astro:  Local    http://localhost:4321/
  /Local\s+(https?:\/\/localhost:\d+\S*)/,
  // SvelteKit / Remix / generic frameworks
  /server.*?(https?:\/\/localhost:\d+\S*)/i,
  // Generic localhost
  /(https?:\/\/localhost:\d+)/,
  // Generic 127.0.0.1
  /(https?:\/\/127\.0\.0\.1:\d+)/,
];

/**
 * Scan terminal output text for a dev-server URL.
 *
 * @param {string} terminalOutput  Raw terminal output (may contain ANSI codes).
 * @returns {string|null}          The detected URL, or null.
 */
export function detectDevServerUrl(terminalOutput) {
  if (!terminalOutput) return null;

  // Strip ANSI escape sequences so colours/styles don't interfere
  const clean = terminalOutput.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

  for (const re of PATTERNS) {
    const m = clean.match(re);
    if (m && m[1]) {
      // Trim trailing punctuation that may have been captured
      return m[1].replace(/[,;)}\]]+$/, '');
    }
  }
  return null;
}
