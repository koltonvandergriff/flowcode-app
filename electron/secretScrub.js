// Secret-pattern scrubber. Defense-in-depth against users pasting API
// keys, PATs, or private-key blobs into memory entries (which would
// otherwise be stored in Supabase, embedded by OpenAI, and categorized
// by Anthropic — three exfiltration paths).
//
// This is best-effort. Adversarial input can bypass any regex. We layer
// it: client-side store ▶ pre-embed ▶ pre-categorize, plus a server-side
// scrub in the Supabase Edge Function. The first to detect blocks.
//
// API:
//   detectSecrets(text) → { hits: [{ name, sample }], scrubbed: string }
//
// `scrubbed` replaces matches with `[REDACTED:<name>]` so downstream
// code paths can still operate on safe text if a caller chooses to
// proceed (e.g. server-side fallback). UI code should prefer blocking
// the write entirely and surfacing the toast.

// Patterns ordered most-specific first so multi-format keys (e.g.
// sk-ant-...) match their provider-specific pattern rather than the
// generic "sk-" rule.
const PATTERNS = [
  { name: 'anthropic',     regex: /\bsk-ant-[a-zA-Z0-9_-]{20,}\b/g },
  { name: 'openai',        regex: /\bsk-(?:proj-)?[a-zA-Z0-9_-]{20,}\b/g },
  { name: 'github-pat',    regex: /\bghp_[a-zA-Z0-9]{20,}\b/g },
  { name: 'github-app',    regex: /\bghs_[a-zA-Z0-9]{20,}\b/g },
  { name: 'github-oauth',  regex: /\bgho_[a-zA-Z0-9]{20,}\b/g },
  { name: 'github-refresh',regex: /\bghr_[a-zA-Z0-9]{20,}\b/g },
  { name: 'aws-akid',      regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'aws-secret',    regex: /\b(?:aws_)?secret[_-]?access[_-]?key\s*[=:]\s*['"]?[a-zA-Z0-9/+=]{40}['"]?/gi },
  { name: 'gcp-sa',        regex: /"type"\s*:\s*"service_account"/g },
  { name: 'slack-bot',     regex: /\bxox[bpsra]-[a-zA-Z0-9-]{10,}\b/g },
  { name: 'stripe-live',   regex: /\b(?:sk|rk|pk)_live_[a-zA-Z0-9]{20,}\b/g },
  { name: 'stripe-test',   regex: /\b(?:sk|rk|pk)_test_[a-zA-Z0-9]{20,}\b/g },
  { name: 'supabase-jwt',  regex: /\beyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\b/g },
  { name: 'pem-private',   regex: /-----BEGIN (?:RSA |DSA |EC |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY( BLOCK)?-----[\s\S]+?-----END[\s\S]+?-----/g },
  { name: 'jwt',           regex: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  // Generic catchall — captures `API_KEY=...` env-style lines. Lower
  // confidence; only triggers on the assignment pattern, not bare
  // strings, to keep false-positives down.
  { name: 'env-assignment', regex: /\b(?:[A-Z][A-Z0-9_]{2,}_(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|PWD))\s*=\s*["']?[A-Za-z0-9_\-+/=.]{16,}["']?/g },
];

function maskSample(s) {
  if (!s) return '';
  if (s.length <= 8) return '***';
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

/**
 * Scan text for secret patterns.
 * @param {string} text
 * @returns {{ hits: Array<{ name: string, sample: string }>, scrubbed: string, hasSecrets: boolean }}
 */
export function detectSecrets(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { hits: [], scrubbed: text || '', hasSecrets: false };
  }
  const hits = [];
  let scrubbed = text;
  for (const { name, regex } of PATTERNS) {
    // Reset stateful regex; PATTERNS use `g` flag.
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(scrubbed)) !== null) {
      hits.push({ name, sample: maskSample(m[0]) });
      // Avoid infinite loop on zero-length matches.
      if (m.index === regex.lastIndex) regex.lastIndex++;
    }
    if (hits.some(h => h.name === name)) {
      scrubbed = scrubbed.replace(regex, `[REDACTED:${name}]`);
    }
  }
  return { hits, scrubbed, hasSecrets: hits.length > 0 };
}

/**
 * Convenience helper: scan multiple fields at once. Returns combined hits.
 * @param {Record<string, string>} fields
 */
export function detectSecretsInFields(fields) {
  const hits = [];
  for (const [field, value] of Object.entries(fields)) {
    const r = detectSecrets(value);
    for (const h of r.hits) hits.push({ ...h, field });
  }
  return { hits, hasSecrets: hits.length > 0 };
}
