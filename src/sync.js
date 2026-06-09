// Thin wrapper around /api endpoints. All methods return the parsed JSON or
// throw an Error with `code` set to one of:
//   'TAKEN'     — username already registered
//   'INVALID'   — username/password format wrong
//   'BAD_AUTH'  — wrong username/password on login
//   'NOT_FOUND' — fetch for unknown username
//   'UNAUTH'    — session expired or invalid
//   'NETWORK'   — connection / 5xx

const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;

export class Sync {
  constructor({ identity, state, onSessionExpired }) {
    this._identity = identity;
    this._state = state;
    this._onSessionExpired = onSessionExpired || (() => {});
    this._suspendWriteBack = false;
    this._writeTimer = null;
  }

  validUsername(u) { return typeof u === 'string' && USERNAME_RE.test(u); }
  validPassword(p) { return typeof p === 'string' && p.length >= 8; }

  // Create a new account. On success the identity is updated with the new
  // session token; caller doesn't need to handle that.
  async register({ username, password }) {
    if (!this.validUsername(username)) { const e = new Error('invalid username'); e.code = 'INVALID'; throw e; }
    if (!this.validPassword(password)) { const e = new Error('invalid password'); e.code = 'INVALID'; throw e; }
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        browserInstanceId: this._identity.browserInstanceId(),
        state: this._state.get(),
      }),
    });
    if (res.status === 409) { const e = new Error('username taken'); e.code = 'TAKEN'; throw e; }
    if (!res.ok) { const e = new Error('register failed'); e.code = 'NETWORK'; throw e; }
    const body = await res.json();
    this._identity.setSession({
      username: body.username,
      sessionToken: body.sessionToken,
      sessionExpiresAt: body.sessionExpiresAt,
    });
    return body;
  }

  // Sign in to an existing account.
  async login({ username, password }) {
    if (!this.validUsername(username)) { const e = new Error('invalid username'); e.code = 'INVALID'; throw e; }
    if (!this.validPassword(password)) { const e = new Error('invalid password'); e.code = 'INVALID'; throw e; }
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.status === 401) { const e = new Error('bad credentials'); e.code = 'BAD_AUTH'; throw e; }
    if (!res.ok) { const e = new Error('login failed'); e.code = 'NETWORK'; throw e; }
    const body = await res.json();
    this._identity.setSession({
      username: body.username,
      sessionToken: body.sessionToken,
      sessionExpiresAt: body.sessionExpiresAt,
    });
    return body;
  }

  // Fetch the latest stored state for a username. Returns null if not found.
  async fetchState(username) {
    if (!this.validUsername(username)) return null;
    const res = await fetch(`/api/state?username=${encodeURIComponent(username)}`);
    if (res.status === 404) return null;
    if (!res.ok) { const e = new Error('fetch failed'); e.code = 'NETWORK'; throw e; }
    return res.json();
  }

  // Push the current local state up to the server. Debounced.
  scheduleWriteBack(delayMs = 1500) {
    if (this._suspendWriteBack) return;
    if (!this._identity.hasValidSession()) return;
    if (this._writeTimer) clearTimeout(this._writeTimer);
    this._writeTimer = setTimeout(() => this._flush(), delayMs);
  }

  async _flush() {
    const username = this._identity.username();
    const token = this._identity.sessionToken();
    if (!username || !token) return;
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ username, state: this._state.get() }),
      });
      if (res.status === 401 || res.status === 403) {
        // Session expired or revoked. Clear locally and tell the app to
        // prompt for login (handled by main.js).
        this._identity.clearSession();
        this._onSessionExpired();
      }
    } catch {
      // Best-effort; offline is fine, next change will retry.
    }
  }

  // Pull remote state and merge into local. Suspends write-back during merge.
  async pullAndMerge() {
    const username = this._identity.username();
    if (!username) return;
    let remote;
    try {
      remote = await this.fetchState(username);
    } catch { return; }
    if (!remote || !remote.state) return;

    this._suspendWriteBack = true;
    try {
      const local = this._state.get();
      const merged = { ...local, ...remote.state };
      // Union favorites so a favorite added on either device is preserved.
      if (Array.isArray(local.favorites) && Array.isArray(remote.state.favorites)) {
        const seen = new Set();
        merged.favorites = [...remote.state.favorites, ...local.favorites]
          .filter(id => { if (seen.has(id)) return false; seen.add(id); return true; });
      }
      this._state.update(merged);
    } finally {
      this._suspendWriteBack = false;
    }
  }
}
