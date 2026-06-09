// Shared helpers for the /api/* Pages Functions.

export const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;

export function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

// Parse JSON body, return null on failure.
export async function readJson(req) {
  try { return await req.json(); } catch { return null; }
}

export function badRequest(msg) {
  return json({ error: msg }, { status: 400 });
}

export function notFound(msg = 'not found') {
  return json({ error: msg }, { status: 404 });
}
