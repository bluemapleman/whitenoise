// POST /api/register
// Body: { username, browserInstanceId, state }
//
// Claims a username for the given browserInstanceId. 409 if already taken
// by a different browserInstanceId. State is the initial blob (whitenoise.state contents).

import { USERNAME_RE, json, readJson, badRequest } from './_shared.js';

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body) return badRequest('invalid json');

  const { username, browserInstanceId, state } = body;
  if (!username || !USERNAME_RE.test(username)) {
    return badRequest('username must match [a-z0-9_-]{3,30}');
  }
  if (!browserInstanceId || typeof browserInstanceId !== 'string') {
    return badRequest('browserInstanceId required');
  }

  const key = `user:${username}`;
  const existing = await env.WHITENOISE_STATE.get(key, 'json');

  if (existing && existing.browserInstanceId !== browserInstanceId) {
    return json({ error: 'username taken' }, { status: 409 });
  }

  const record = {
    browserInstanceId,
    state: state || {},
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await env.WHITENOISE_STATE.put(key, JSON.stringify(record));

  return json({ ok: true, username, createdAt: record.createdAt });
}
