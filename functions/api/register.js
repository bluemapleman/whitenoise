// POST /api/register
// Body: { username, password, browserInstanceId, state }
//
// Creates a new user with a hashed password. Returns a session token so the
// caller is logged in immediately. 409 if the username is already taken.

import { USERNAME_RE, json, readJson, badRequest } from './_shared.js';
import { hashPassword, createSession, PASSWORD_MIN_LENGTH } from './_auth.js';

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body) return badRequest('invalid json');

  const { username, password, browserInstanceId, state } = body;
  if (!username || !USERNAME_RE.test(username)) {
    return badRequest('username must match [a-z0-9_-]{3,30}');
  }
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return badRequest(`password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!browserInstanceId || typeof browserInstanceId !== 'string') {
    return badRequest('browserInstanceId required');
  }

  const key = `user:${username}`;
  const existing = await env.WHITENOISE_STATE.get(key, 'json');
  if (existing) {
    return json({ error: 'username taken' }, { status: 409 });
  }

  const { salt, hash } = await hashPassword(password);
  const now = new Date().toISOString();
  const record = {
    passwordHash: hash,
    salt,
    browserInstanceId,    // kept for debug visibility, not used for auth
    state: state || {},
    createdAt: now,
    updatedAt: now,
  };
  await env.WHITENOISE_STATE.put(key, JSON.stringify(record));

  const session = await createSession(env, username);

  return json({
    ok: true,
    username,
    createdAt: now,
    sessionToken: session.token,
    sessionExpiresAt: session.expiresAt,
  });
}
