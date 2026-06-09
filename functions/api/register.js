// POST /api/register
// Body: { username, deviceId, state }
//
// Claims a username for the given deviceId. 409 if already taken by a
// different deviceId. State is the initial blob (whitenoise.state contents).

import { USERNAME_RE, json, readJson, badRequest } from './_shared.js';

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body) return badRequest('invalid json');

  const { username, deviceId, state } = body;
  if (!username || !USERNAME_RE.test(username)) {
    return badRequest('username must match [a-z0-9_-]{3,30}');
  }
  if (!deviceId || typeof deviceId !== 'string') {
    return badRequest('deviceId required');
  }

  const key = `user:${username}`;
  const existing = await env.WHITENOISE_STATE.get(key, 'json');

  if (existing && existing.deviceId !== deviceId) {
    return json({ error: 'username taken' }, { status: 409 });
  }

  const record = {
    deviceId,
    state: state || {},
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await env.WHITENOISE_STATE.put(key, JSON.stringify(record));

  return json({ ok: true, username, createdAt: record.createdAt });
}
