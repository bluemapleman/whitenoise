// Thin wrapper around /api endpoints. All methods return the parsed JSON or
// throw an Error with `code` set to 'TAKEN' / 'NOT_FOUND' / 'NETWORK' / etc.

const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;

export class Sync {
  constructor({ identity, state }) {
    this._identity = identity;
    this._state = state;
    this._suspendWriteBack = false;
    this._writeTimer = null;
  }

  validUsername(u) {
    return typeof u === 'string' && USERNAME_RE.test(u);
  }

  // Register a username for this device. Resolves to {ok:true} or throws
  // an Error with code='TAKEN' if it's already someone else's.
  async register(username) {
    if (!this.validUsername(username)) {
      const e = new Error('invalid username'); e.code = 'INVALID'; throw e;
    }
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username,
        deviceId: this._identity.deviceId(),
        state: this._state.get(),
      }),
    });
    if (res.status === 409) { const e = new Error('username taken'); e.code = 'TAKEN'; throw e; }
    if (!res.ok) { const e = new Error('register failed'); e.code = 'NETWORK'; throw e; }
    return res.json();
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
    const username = this._identity.username();
    if (!username) return;
    if (this._writeTimer) clearTimeout(this._writeTimer);
    this._writeTimer = setTimeout(() => this._flush(), delayMs);
  }

  async _flush() {
    const username = this._identity.username();
    if (!username) return;
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username,
          deviceId: this._identity.deviceId(),
          state: this._state.get(),
        }),
      });
    } catch {
      // Best-effort; offline is fine, next change will retry.
    }
  }

  // Called once after registration or on load if username is already set.
  // Pulls remote state, merges into local. Suspends write-back during merge
  // to avoid the merge itself triggering a no-op POST.
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
      // Last-write-wins merge: remote takes precedence for fields it has.
      // For favorites array, we union (unique) so cross-device favoriting works.
      const local = this._state.get();
      const merged = { ...local, ...remote.state };
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
