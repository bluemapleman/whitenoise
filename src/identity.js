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
//
// All three live in localStorage under the whitenoise.identity key.

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

  // Save the username locally. Caller is responsible for verifying it's
  // available on the server before calling this.
  setUsername(username) {
    this._data.username = username;
    this._save();
  }

  clearUsername() {
    delete this._data.username;
    this._save();
  }

  // Returns the full identity record (used by the info panel).
  getAll() {
    return { ...this._data };
  }
}
