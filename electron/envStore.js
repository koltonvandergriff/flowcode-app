import { app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import keytar from 'keytar';

// API keys / PATs are routed through the OS keychain (Win Credential Manager,
// macOS Keychain, libsecret on Linux) via keytar. Non-secret config still
// lives in the plain `.env` file because keychain entries are slower and
// pollute the user's keychain UI.
//
// On first run after the migration, any legacy secrets sitting in `.env` are
// pushed to keytar and stripped from the file.

const KEYCHAIN_SERVICE = 'flowade';

const SECRET_KEYS = new Set([
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GITHUB_PAT',
]);

function isSecretKey(key) {
  return SECRET_KEYS.has(key);
}

export class EnvStore {
  constructor() {
    const dataDir = join(app.getPath('userData'), 'flowade-data');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    this.filePath = join(dataDir, '.env');
    this.cache = this._loadFile();      // non-secret config
    this.secretCache = new Map();        // mirrors keychain so .get() stays sync
    this.ready = this._initSecrets();    // resolves once keychain is loaded
  }

  /** Resolves once keytar has populated the in-memory secret cache. */
  whenReady() { return this.ready; }

  async _initSecrets() {
    // Pull every secret already in the keychain.
    try {
      const creds = await keytar.findCredentials(KEYCHAIN_SERVICE);
      for (const { account, password } of creds) {
        this.secretCache.set(account, password);
      }
    } catch (err) {
      console.error('[EnvStore] keytar findCredentials failed:', err.message);
    }

    // Migrate any legacy secrets sitting in `.env` into the keychain.
    let migrated = 0;
    for (const key of Object.keys(this.cache)) {
      if (isSecretKey(key) && this.cache[key]) {
        try {
          await keytar.setPassword(KEYCHAIN_SERVICE, key, this.cache[key]);
          this.secretCache.set(key, this.cache[key]);
          delete this.cache[key];
          migrated++;
        } catch (err) {
          console.error(`[EnvStore] migrate ${key} failed:`, err.message);
        }
      }
    }
    if (migrated > 0) {
      this._saveFile();
      console.log(`[EnvStore] Migrated ${migrated} secrets from .env into the OS keychain.`);
    }
  }

  _loadFile() {
    try {
      const raw = readFileSync(this.filePath, 'utf8');
      const vars = {};
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        vars[key] = val;
      }
      return vars;
    } catch {
      return {};
    }
  }

  _saveFile() {
    const lines = ['# FlowADE local config — secrets live in your OS keychain, not here.', ''];
    const sections = {
      'GitHub': ['GITHUB_DEFAULT_ORG', 'GITHUB_DEFAULT_REPO'],
    };

    const written = new Set();
    for (const [heading, keys] of Object.entries(sections)) {
      const sectionKeys = keys.filter((k) => this.cache[k] !== undefined && this.cache[k] !== '');
      if (sectionKeys.length === 0) continue;
      lines.push(`# ${heading}`);
      for (const key of sectionKeys) {
        lines.push(`${key}="${this.cache[key]}"`);
        written.add(key);
      }
      lines.push('');
    }

    const remaining = Object.keys(this.cache).filter((k) => !written.has(k) && this.cache[k] !== '');
    if (remaining.length > 0) {
      lines.push('# Other');
      for (const key of remaining) {
        lines.push(`${key}="${this.cache[key]}"`);
      }
      lines.push('');
    }

    writeFileSync(this.filePath, lines.join('\n'), 'utf8');
  }

  /** Returns a flat snapshot of all keys (file + keychain). Used by the UI. */
  getAll() {
    const merged = { ...this.cache };
    for (const [key, val] of this.secretCache) merged[key] = val;
    return merged;
  }

  /**
   * Sync getter. Secret keys read from the in-memory keychain mirror first,
   * then fall back to process.env so dev-time `npm run dev` w/ exported
   * shell vars Just Works (no need to wire up the keychain on every machine).
   * In packaged production builds process.env won't have these keys, so the
   * keychain remains the single source of truth.
   */
  get(key) {
    if (isSecretKey(key)) {
      return this.secretCache.get(key) || process.env[key] || '';
    }
    return this.cache[key] || process.env[key] || '';
  }

  set(key, value) {
    if (isSecretKey(key)) {
      if (!value) {
        this.secretCache.delete(key);
        keytar.deletePassword(KEYCHAIN_SERVICE, key).catch((e) =>
          console.error('[EnvStore] keytar delete failed:', e.message));
      } else {
        this.secretCache.set(key, value);
        keytar.setPassword(KEYCHAIN_SERVICE, key, value).catch((e) =>
          console.error('[EnvStore] keytar set failed:', e.message));
      }
      return;
    }
    if (value === '' || value == null) {
      delete this.cache[key];
    } else {
      this.cache[key] = value;
    }
    this._saveFile();
  }

  setMany(pairs) {
    for (const [key, value] of Object.entries(pairs)) this.set(key, value);
  }

  has(key) {
    if (isSecretKey(key)) return !!(this.secretCache.get(key) || process.env[key]);
    return !!(this.cache[key] || process.env[key]);
  }
}
