// POST /api/login
// Body: { username, password }
//
// Verifies the password and returns a fresh session token. Used when the
// user has an account but is on a new browser / cleared storage.
//
// Returns 401 for either bad password or missing username (don't leak which).

import { USERNAME_RE, json, readJson, badRequest } from './_shared.js';
import { verifyPassword, createSession, PASSWORD_MIN_LENGTH } from './_auth.js';

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body) return badRequest('invalid json');

  const { username, password } = body;
  if (!username || !USERNAME_RE.test(username)) {
    return badRequest('valid username required');
  }
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return badRequest(`password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  const record = await env.WHITENOISE_STATE.get(`user:${username}`, 'json');

  // Same response for both "user doesn't exist" and "wrong password" so an
  // attacker can't enumerate usernames via timing or response codes. Still
  // run a hash op so timing is roughly the same on the absent-user path.
  if (!record || !record.passwordHash) {
    // Burn ~100k iterations against a dummy salt so the response timing
    // matches the real-user path. Doesn't compare to anything.
    await verifyPassword(password, 'dGltaW5n', 'YXR0YWNrcw');
    return json({ error: 'invalid credentials' }, { status: 401 });
  }

  const ok = await verifyPassword(password, record.salt, record.passwordHash);
  if (!ok) return json({ error: 'invalid credentials' }, { status: 401 });

  const session = await createSession(env, username);
  return json({
    ok: true,
    username,
    sessionToken: session.token,
    sessionExpiresAt: session.expiresAt,
  });
}
