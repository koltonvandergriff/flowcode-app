// Reader for the credentials FlowADE's Electron EnvStore manages. Secret keys
// (API tokens, PATs) live in the OS keychain via keytar; non-secret config
// stays in the `.env` file. MCP runs in its own process — we hit keytar
// directly using the same service name as the Electron app.

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import keytar from 'keytar';

const KEYCHAIN_SERVICE = 'flowade';
const SECRET_KEYS = new Set([
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GITHUB_PAT',
]);

let _secretCache = null;
let _secretCachedAt = 0;
const SECRET_TTL_MS = 30_000;

async function loadSecrets() {
  const now = Date.now();
  if (_secretCache && now - _secretCachedAt < SECRET_TTL_MS) return _secretCache;
  try {
    const creds = await keytar.findCredentials(KEYCHAIN_SERVICE);
    const map = {};
    for (const { account, password } of creds) map[account] = password;
    _secretCache = map;
    _secretCachedAt = now;
  } catch {
    _secretCache = _secretCache || {};
    _secretCachedAt = now;
  }
  return _secretCache;
}

function getEnvPath() {
  const appData = process.platform === 'win32'
    ? join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'flowade')
    : process.platform === 'darwin'
      ? join(homedir(), 'Library', 'Application Support', 'flowade')
      : join(homedir(), '.config', 'flowade');
  return join(appData, 'flowade-data', '.env');
}

let _fileCache = null;
let _fileCachedAt = 0;
const FILE_TTL_MS = 5_000;

function loadFile() {
  const now = Date.now();
  if (_fileCache && now - _fileCachedAt < FILE_TTL_MS) return _fileCache;
  try {
    const raw = readFileSync(getEnvPath(), 'utf8');
    const vars = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      vars[k] = v;
    }
    _fileCache = vars;
  } catch {
    _fileCache = _fileCache || {};
  }
  _fileCachedAt = now;
  return _fileCache;
}

/**
 * Async reader. Secret keys come from the OS keychain (via keytar); everything
 * else comes from the `.env` file. process.env is consulted last so headless /
 * CI runs can inject credentials.
 */
export async function readEnvKeyAsync(key) {
  if (SECRET_KEYS.has(key)) {
    const secrets = await loadSecrets();
    if (secrets[key]) return secrets[key];
    // Fall through — legacy installs may still have the key in `.env`.
  }
  const file = loadFile();
  return file[key] || process.env[key] || '';
}

/**
 * Sync reader retained for callers that can't easily await. Secret keys are
 * served from the in-memory cache only — the first async caller (e.g. the
 * MCP startup path) is expected to warm the cache via readEnvKeyAsync or
 * warmSecretsCache before any sync reads happen.
 */
export function readEnvKey(key) {
  if (SECRET_KEYS.has(key) && _secretCache && _secretCache[key]) {
    return _secretCache[key];
  }
  const file = loadFile();
  return file[key] || process.env[key] || '';
}

export async function warmSecretsCache() {
  await loadSecrets();
}
