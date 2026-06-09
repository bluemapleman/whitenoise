// Per-browser identity. Manages:
//   - browserInstanceId: a UUID generated on first visit, stable for the life
//     of this browser's localStorage. Same browser = same id; different
//     browser / different device / cleared data = different id. NOT a device
//     identifier — it's per browser-storage instance.
//   - visitCount: incremented on every page load. Used to defer the username
//     prompt until the second visit (better conversion than asking on cold
//     first load).
//   - username: optional cross-device sync handle the user picks. Stored
//     locally so we know who to fetch from the API on next load.
//   - sessionToken / sessionExpiresAt: opaque server-issued token (30-day
//     TTL) that authenticates write requests. Cleared on 401.
//
// Everything lives in localStorage under the whitenoise.identity key.

const STORAGE_KEY = 'whitenoise.identity';

export class Identity {
  constructor() {
    this._data = this._load();
    if (!this._data.browserInstanceId) {
      this._data.browserInstanceId = this._generateId();
      this._data.createdAt = new Date().toISOString();
    }
    this._data.visitCount = (this._data.visitCount || 0) + 1;
    this._save();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }

  _save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data)); } catch {}
  }

  _generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for ancient browsers — RFC4122-ish, not cryptographically strong
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  browserInstanceId() { return this._data.browserInstanceId; }
  createdAt() { return this._data.createdAt || null; }
  visitCount() { return this._data.visitCount; }
  username() { return this._data.username || null; }
  sessionToken() { return this._data.sessionToken || null; }
  sessionExpiresAt() { return this._data.sessionExpiresAt || null; }

  // True if there's a non-expired session token for the current username.
  hasValidSession() {
    if (!this._data.username || !this._data.sessionToken) return false;
    const exp = this._data.sessionExpiresAt;
    if (!exp) return true;     // pre-existing tokens without expiry → trust them
    return Date.parse(exp) > Date.now();
  }

  // Save credentials together — username and session always change as a pair.
  setSession({ username, sessionToken, sessionExpiresAt }) {
    this._data.username = username;
    this._data.sessionToken = sessionToken;
    this._data.sessionExpiresAt = sessionExpiresAt;
    this._save();
  }

  clearSession() {
    delete this._data.username;
    delete this._data.sessionToken;
    delete this._data.sessionExpiresAt;
    this._save();
  }

  // Returns the full identity record (used by the info panel).
  getAll() {
    return { ...this._data };
  }
}
