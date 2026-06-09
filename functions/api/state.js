// GET  /api/state?username=X            → returns the user's state blob
// POST /api/state  { username, deviceId, state }  → upserts (deviceId must match)

import { USERNAME_RE, json, readJson, badRequest, notFound } from './_shared.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const username = url.searchParams.get('username');
  if (!username || !USERNAME_RE.test(username)) {
    return badRequest('valid username required');
  }
  const record = await env.WHITENOISE_STATE.get(`user:${username}`, 'json');
  if (!record) return notFound('username not found');

  // Only return the state — never leak the deviceId.
  return json({
    username,
    state: record.state || {},
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body) return badRequest('invalid json');

  const { username, deviceId, state } = body;
  if (!username || !USERNAME_RE.test(username)) {
    return badRequest('valid username required');
  }
  if (!deviceId) return badRequest('deviceId required');
  if (!state || typeof state !== 'object') return badRequest('state object required');

  const key = `user:${username}`;
  const existing = await env.WHITENOISE_STATE.get(key, 'json');
  if (!existing) return notFound('username not registered');
  if (existing.deviceId !== deviceId) {
    return json({ error: 'deviceId mismatch' }, { status: 403 });
  }

  const record = {
    ...existing,
    state,
    updatedAt: new Date().toISOString(),
  };
  await env.WHITENOISE_STATE.put(key, JSON.stringify(record));

  return json({ ok: true, updatedAt: record.updatedAt });
}
