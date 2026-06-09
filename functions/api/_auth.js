// Authentication helpers for the /api/* Pages Functions.
// Uses Web Crypto (native to Cloudflare Workers, no extra deps).
//
// Password hashing: PBKDF2-SHA256, 100,000 iterations, 16-byte random salt.
// 100k is on the low end of acceptable for 2026 but PBKDF2 in WebCrypto is
// pure-JS-equivalent in Workers and higher iterations would slow logins
// noticeably. Argon2 / scrypt aren't available without a WASM module.
//
// Sessions: 32-byte random token, base64url-encoded, 30-day KV TTL.

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const SESSION_TOKEN_BYTES = 32;
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;   // 30 days
export const PASSWORD_MIN_LENGTH = 8;

// ---- base64url helpers (Workers don't expose Buffer) ---------------------

export function bytesToBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ---- password hashing ----------------------------------------------------

async function pbkdf2(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    HASH_BYTES * 8
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(password, salt);
  return {
    salt: bytesToBase64Url(salt),
    hash: bytesToBase64Url(hash),
  };
}

// Returns true if password matches the stored hash. Constant-time compare.
export async function verifyPassword(password, storedSaltB64, storedHashB64) {
  const salt = base64UrlToBytes(storedSaltB64);
  const expected = base64UrlToBytes(storedHashB64);
  const computed = await pbkdf2(password, salt);
  return constantTimeEqual(computed, expected);
}

// Length-aware constant-time byte comparison. Returns false instantly on
// length mismatch (length itself isn't secret); the loop runs to the longer
// of the two lengths to avoid early exit on data mismatch.
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ---- session tokens ------------------------------------------------------

export function generateSessionToken() {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(SESSION_TOKEN_BYTES)));
}

// Read & validate a Bearer token from the Authorization header.
// Returns the session record { username, expiresAt } or null.
export async function readSession(request, env) {
  const auth = request.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  const token = m[1];
  const session = await env.WHITENOISE_STATE.get(`session:${token}`, 'json');
  if (!session) return null;
  // KV's TTL eviction is best-effort; double-check expiry.
  if (session.expiresAt && Date.parse(session.expiresAt) < Date.now()) return null;
  return session;
}

// Create a session, store it in KV with TTL, return the token.
export async function createSession(env, username) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await env.WHITENOISE_STATE.put(
    `session:${token}`,
    JSON.stringify({ username, expiresAt }),
    { expirationTtl: SESSION_TTL_SECONDS }
  );
  return { token, expiresAt };
}
