// GET  /api/state?username=X            → returns the user's state blob
// POST /api/state  { username, state }   → upserts; requires Bearer session token
//
// Note: GET is unauthenticated by design. The data is non-sensitive
// (a user's volume preference, last-played track, etc.) and exposing it by
// username is the intent of the cross-device-sync feature.

import { USERNAME_RE, json, readJson, badRequest, notFound } from './_shared.js';
import { readSession } from './_auth.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const username = url.searchParams.get('username');
  if (!username || !USERNAME_RE.test(username)) {
    return badRequest('valid username required');
  }
  const record = await env.WHITENOISE_STATE.get(`user:${username}`, 'json');
  if (!record) return notFound('username not found');

  // Return only the state — never leak password hash, salt, or browserInstanceId.
  return json({
    username,
    state: record.state || {},
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export async function onRequestPost({ request, env }) {
  const session = await readSession(request, env);
  if (!session) return json({ error: 'unauthenticated' }, { status: 401 });

  const body = await readJson(request);
  if (!body) return badRequest('invalid json');

  const { username, state } = body;
  if (!username || !USERNAME_RE.test(username)) {
    return badRequest('valid username required');
  }
  if (!state || typeof state !== 'object') {
    return badRequest('state object required');
  }
  if (session.username !== username) {
    // Token belongs to a different user. Don't say which.
    return json({ error: 'forbidden' }, { status: 403 });
  }

  const key = `user:${username}`;
  const existing = await env.WHITENOISE_STATE.get(key, 'json');
  if (!existing) return notFound('username not registered');

  const record = {
    ...existing,
    state,
    updatedAt: new Date().toISOString(),
  };
  await env.WHITENOISE_STATE.put(key, JSON.stringify(record));

  return json({ ok: true, updatedAt: record.updatedAt });
}
