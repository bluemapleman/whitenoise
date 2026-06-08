export const STORAGE_KEY = 'whitenoise.state';

const DEFAULTS = Object.freeze({
  lastTrackId: null,
  lastTimer: 45,        // minutes; 0 means ∞
  favorites: [],
  volume: 0.7,
});

export class State {
  constructor() {
    this._state = this._load();
    this._subs = new Set();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    } catch {
      return { ...DEFAULTS };
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
    } catch {
      // localStorage full or disabled — silently degrade
    }
  }

  get() {
    return { ...this._state, favorites: [...this._state.favorites] };
  }

  update(patch) {
    this._state = { ...this._state, ...patch };
    this._save();
    this._notify();
  }

  toggleFavorite(id) {
    const favs = this._state.favorites.filter(f => f !== id);
    if (favs.length === this._state.favorites.length) {
      favs.unshift(id);  // newly added → front
    }
    this.update({ favorites: favs });
  }

  subscribe(fn) {
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  }

  _notify() {
    const snap = this.get();
    for (const fn of this._subs) fn(snap);
  }
}
