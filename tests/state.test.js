import { describe, it, expect, beforeEach } from 'vitest';
import { State, STORAGE_KEY } from '../src/state.js';

describe('State', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when nothing is stored', () => {
    const s = new State();
    expect(s.get()).toEqual({
      lastTrackId: null,
      lastTimer: 45,
      favorites: [],
      volume: 0.7,
    });
  });

  it('persists changes to localStorage', () => {
    const s = new State();
    s.update({ lastTrackId: 'forest', volume: 0.5 });
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(raw.lastTrackId).toBe('forest');
    expect(raw.volume).toBe(0.5);
  });

  it('restores state from localStorage on construction', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      lastTrackId: 'rain-light', lastTimer: 30, favorites: ['ocean'], volume: 0.3,
    }));
    const s = new State();
    expect(s.get().lastTrackId).toBe('rain-light');
    expect(s.get().favorites).toEqual(['ocean']);
  });

  it('toggleFavorite adds when missing, removes when present', () => {
    const s = new State();
    s.toggleFavorite('forest');
    expect(s.get().favorites).toEqual(['forest']);
    s.toggleFavorite('forest');
    expect(s.get().favorites).toEqual([]);
  });

  it('toggleFavorite places newly added items at the front', () => {
    const s = new State();
    s.toggleFavorite('forest');
    s.toggleFavorite('rain-light');
    expect(s.get().favorites).toEqual(['rain-light', 'forest']);
  });

  it('subscribers are notified on update', () => {
    const s = new State();
    const calls = [];
    s.subscribe(snap => calls.push(snap.lastTrackId));
    s.update({ lastTrackId: 'forest' });
    s.update({ lastTrackId: 'ocean' });
    expect(calls).toEqual(['forest', 'ocean']);
  });

  it('survives malformed localStorage data', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    const s = new State();
    expect(s.get().lastTimer).toBe(45);
  });
});
