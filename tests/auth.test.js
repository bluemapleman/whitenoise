import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  bytesToBase64Url,
  base64UrlToBytes,
  hashPassword,
  verifyPassword,
  generateSessionToken,
  readSession,
  createSession,
  SESSION_TTL_SECONDS,
  PASSWORD_MIN_LENGTH,
} from '../functions/api/_auth.js';

// jsdom provides a partial WebCrypto. Confirm the shape we need is there;
// otherwise pull in node:crypto.webcrypto.
beforeAll(async () => {
  if (!globalThis.crypto?.subtle) {
    const { webcrypto } = await import('node:crypto');
    globalThis.crypto = webcrypto;
  }
});

describe('base64url roundtrip', () => {
  it('encodes and decodes back to the same bytes', () => {
    const cases = [
      new Uint8Array([0]),
      new Uint8Array([0, 1, 2, 253, 254, 255]),
      crypto.getRandomValues(new Uint8Array(32)),
      crypto.getRandomValues(new Uint8Array(33)),  // ensures padding handling
    ];
    for (const bytes of cases) {
      const s = bytesToBase64Url(bytes);
      const round = base64UrlToBytes(s);
      expect(round.length).toBe(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        expect(round[i]).toBe(bytes[i]);
      }
    }
  });

  it('base64url output has no +, /, or = characters', () => {
    const random = crypto.getRandomValues(new Uint8Array(32));
    const s = bytesToBase64Url(random);
    expect(s).not.toMatch(/[+/=]/);
  });
});

describe('hashPassword + verifyPassword', () => {
  it('verifies the same password against its own hash', async () => {
    const { salt, hash } = await hashPassword('correct horse battery staple');
    expect(salt).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
    const ok = await verifyPassword('correct horse battery staple', salt, hash);
    expect(ok).toBe(true);
  }, 30_000);

  it('rejects wrong passwords', async () => {
    const { salt, hash } = await hashPassword('right-password');
    expect(await verifyPassword('wrong-password', salt, hash)).toBe(false);
    expect(await verifyPassword('', salt, hash)).toBe(false);
    expect(await verifyPassword('right-password ', salt, hash)).toBe(false);
  }, 30_000);

  it('produces different salts for the same password (no rainbow tables)', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  }, 30_000);

  it('supports unicode passwords', async () => {
    const pwd = '密码🐱密码-passphrase';
    const { salt, hash } = await hashPassword(pwd);
    expect(await verifyPassword(pwd, salt, hash)).toBe(true);
  }, 30_000);
});

describe('generateSessionToken', () => {
  it('returns a base64url string with no padding', () => {
    const t = generateSessionToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32 bytes → 43 base64url chars (no padding)
    expect(t.length).toBeGreaterThanOrEqual(40);
    expect(t.length).toBeLessThanOrEqual(44);
  });

  it('produces unique tokens', () => {
    const set = new Set();
    for (let i = 0; i < 50; i++) set.add(generateSessionToken());
    expect(set.size).toBe(50);
  });
});

// ---- KV-backed session helpers ------------------------------------------

function makeFakeKV() {
  const store = new Map();
  return {
    store,
    get: vi.fn(async (key, type) => {
      if (!store.has(key)) return null;
      const v = store.get(key);
      return type === 'json' ? JSON.parse(v) : v;
    }),
    put: vi.fn(async (key, value, opts) => {
      store.set(key, value);
      // We don't enforce TTL here; expiration is asserted in createSession test.
      if (opts) store.set(key + '::ttl', opts.expirationTtl);
    }),
  };
}

describe('createSession + readSession', () => {
  it('stores a record under session:<token> with the configured TTL', async () => {
    const kv = makeFakeKV();
    const env = { WHITENOISE_STATE: kv };
    const { token, expiresAt } = await createSession(env, 'tom');

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(kv.put).toHaveBeenCalledTimes(1);
    const [key, value, opts] = kv.put.mock.calls[0];
    expect(key).toBe(`session:${token}`);
    expect(opts.expirationTtl).toBe(SESSION_TTL_SECONDS);
    const stored = JSON.parse(value);
    expect(stored.username).toBe('tom');
    expect(stored.expiresAt).toBe(expiresAt);
  });

  it('readSession returns the session for a valid Bearer token', async () => {
    const kv = makeFakeKV();
    const env = { WHITENOISE_STATE: kv };
    const { token } = await createSession(env, 'tom');

    const req = new Request('https://example.com/api/state', {
      headers: { authorization: `Bearer ${token}` },
    });
    const session = await readSession(req, env);
    expect(session).not.toBeNull();
    expect(session.username).toBe('tom');
  });

  it('readSession returns null when no Authorization header', async () => {
    const env = { WHITENOISE_STATE: makeFakeKV() };
    const req = new Request('https://example.com/');
    expect(await readSession(req, env)).toBeNull();
  });

  it('readSession returns null when token is malformed', async () => {
    const env = { WHITENOISE_STATE: makeFakeKV() };
    const req = new Request('https://example.com/', {
      headers: { authorization: 'Bearer not a token!' },   // contains spaces/!
    });
    expect(await readSession(req, env)).toBeNull();
  });

  it('readSession returns null when the token is unknown to KV', async () => {
    const env = { WHITENOISE_STATE: makeFakeKV() };
    const req = new Request('https://example.com/', {
      headers: { authorization: 'Bearer unknown_token_xyz' },
    });
    expect(await readSession(req, env)).toBeNull();
  });

  it('readSession returns null when the stored session is past expiry', async () => {
    const kv = makeFakeKV();
    const env = { WHITENOISE_STATE: kv };
    // Manually plant an expired session
    kv.store.set('session:expired-token', JSON.stringify({
      username: 'tom',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    }));
    const req = new Request('https://example.com/', {
      headers: { authorization: 'Bearer expired-token' },
    });
    expect(await readSession(req, env)).toBeNull();
  });

  it('readSession requires a Bearer scheme', async () => {
    const env = { WHITENOISE_STATE: makeFakeKV() };
    const req = new Request('https://example.com/', {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });
    expect(await readSession(req, env)).toBeNull();
  });
});

describe('exported constants', () => {
  it('SESSION_TTL_SECONDS is 30 days', () => {
    expect(SESSION_TTL_SECONDS).toBe(30 * 24 * 60 * 60);
  });
  it('PASSWORD_MIN_LENGTH is 8', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });
});
