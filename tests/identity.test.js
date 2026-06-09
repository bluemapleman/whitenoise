import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Identity } from '../src/identity.js';

const KEY = 'whitenoise.identity';

describe('Identity', () => {
  beforeEach(() => { localStorage.clear(); });

  describe('initialization', () => {
    it('generates a UUID on first construction', () => {
      const id = new Identity();
      const uuid = id.browserInstanceId();
      expect(uuid).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('persists the UUID across instances', () => {
      const a = new Identity();
      const b = new Identity();
      expect(b.browserInstanceId()).toBe(a.browserInstanceId());
    });

    it('records createdAt as an ISO timestamp on first run', () => {
      const id = new Identity();
      expect(() => new Date(id.createdAt()).toISOString()).not.toThrow();
    });

    it('does not change createdAt on subsequent runs', () => {
      const a = new Identity();
      const created = a.createdAt();
      const b = new Identity();
      expect(b.createdAt()).toBe(created);
    });
  });

  describe('visit count', () => {
    it('starts at 1', () => {
      expect(new Identity().visitCount()).toBe(1);
    });

    it('increments on every construction', () => {
      new Identity();
      new Identity();
      const third = new Identity();
      expect(third.visitCount()).toBe(3);
    });
  });

  describe('session', () => {
    it('hasValidSession is false when no session is set', () => {
      const id = new Identity();
      expect(id.hasValidSession()).toBe(false);
    });

    it('hasValidSession is true for a future-dated session', () => {
      const id = new Identity();
      id.setSession({
        username: 'tom',
        sessionToken: 'tok',
        sessionExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      });
      expect(id.hasValidSession()).toBe(true);
    });

    it('hasValidSession is false for an expired session', () => {
      const id = new Identity();
      id.setSession({
        username: 'tom',
        sessionToken: 'tok',
        sessionExpiresAt: new Date(Date.now() - 3600_000).toISOString(),
      });
      expect(id.hasValidSession()).toBe(false);
    });

    it('hasValidSession trusts a session with no expiry', () => {
      const id = new Identity();
      id.setSession({ username: 'tom', sessionToken: 'tok' });
      expect(id.hasValidSession()).toBe(true);
    });

    it('clearSession removes username, token, and expiry', () => {
      const id = new Identity();
      id.setSession({
        username: 'tom',
        sessionToken: 'tok',
        sessionExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      });
      id.clearSession();
      expect(id.username()).toBeNull();
      expect(id.sessionToken()).toBeNull();
      expect(id.sessionExpiresAt()).toBeNull();
    });

    it('persists session through reconstruction', () => {
      const a = new Identity();
      a.setSession({
        username: 'tom',
        sessionToken: 'tok',
        sessionExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      });
      const b = new Identity();
      expect(b.username()).toBe('tom');
      expect(b.sessionToken()).toBe('tok');
    });
  });

  describe('storage corruption', () => {
    it('survives malformed JSON in storage', () => {
      localStorage.setItem(KEY, 'not-json');
      const id = new Identity();
      expect(id.browserInstanceId()).toMatch(/^[0-9a-f-]{36}$/i);
      expect(id.visitCount()).toBe(1);
    });
  });

  describe('getAll', () => {
    it('returns a snapshot of the full identity record', () => {
      const id = new Identity();
      id.setSession({
        username: 'tom',
        sessionToken: 'tok',
        sessionExpiresAt: '2027-01-01T00:00:00.000Z',
      });
      const snap = id.getAll();
      expect(snap.username).toBe('tom');
      expect(snap.browserInstanceId).toBe(id.browserInstanceId());
      // Mutating the snapshot must not affect internal state
      snap.username = 'tampered';
      expect(id.username()).toBe('tom');
    });
  });
});
