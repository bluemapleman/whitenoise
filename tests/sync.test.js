import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Sync } from '../src/sync.js';

// Minimal Identity / State stubs — exercises only the surface Sync touches.
function makeIdentity({ valid = true, username = 'tom', token = 'tok' } = {}) {
  let _user = username;
  let _tok = token;
  return {
    browserInstanceId: () => 'instance-uuid',
    username: () => _user,
    sessionToken: () => _tok,
    hasValidSession: () => valid && !!_user && !!_tok,
    setSession: vi.fn(({ username: u, sessionToken: t }) => { _user = u; _tok = t; }),
    clearSession: vi.fn(() => { _user = null; _tok = null; }),
  };
}

function makeState(initial = {}) {
  let s = {
    lastTrackId: null, lastTimer: 45, favorites: [], volume: 0.7, ...initial,
  };
  const subs = new Set();
  return {
    get: () => ({ ...s, favorites: [...s.favorites] }),
    update: vi.fn((patch) => {
      s = { ...s, ...patch };
      subs.forEach(fn => fn({ ...s }));
    }),
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
    _internal: () => s,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function jsonResponse(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('Sync', () => {
  describe('validators', () => {
    const sync = new Sync({ identity: makeIdentity(), state: makeState() });
    it('accepts valid usernames', () => {
      expect(sync.validUsername('tom')).toBe(true);
      expect(sync.validUsername('user_name-1')).toBe(true);
      expect(sync.validUsername('a'.repeat(30))).toBe(true);
    });
    it('rejects invalid usernames', () => {
      expect(sync.validUsername('ab')).toBe(false);                  // too short
      expect(sync.validUsername('a'.repeat(31))).toBe(false);        // too long
      expect(sync.validUsername('Tom')).toBe(false);                 // uppercase
      expect(sync.validUsername('with space')).toBe(false);
      expect(sync.validUsername('email@x')).toBe(false);
      expect(sync.validUsername('')).toBe(false);
      expect(sync.validUsername(null)).toBe(false);
    });
    it('accepts passwords ≥ 8 chars', () => {
      expect(sync.validPassword('12345678')).toBe(true);
      expect(sync.validPassword('1234567')).toBe(false);
      expect(sync.validPassword('')).toBe(false);
      expect(sync.validPassword(null)).toBe(false);
    });
  });

  describe('register', () => {
    it('rejects bad input before hitting network', async () => {
      const sync = new Sync({ identity: makeIdentity(), state: makeState() });
      await expect(sync.register({ username: 'X', password: '12345678' }))
        .rejects.toMatchObject({ code: 'INVALID' });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('on success stores the returned session', async () => {
      const id = makeIdentity({ username: null, token: null, valid: false });
      const sync = new Sync({ identity: id, state: makeState() });
      fetch.mockReturnValueOnce(jsonResponse(200, {
        ok: true, username: 'tom',
        sessionToken: 'fresh', sessionExpiresAt: '2027-01-01T00:00:00.000Z',
      }));

      const r = await sync.register({ username: 'tom', password: '12345678' });
      expect(r.username).toBe('tom');
      expect(id.setSession).toHaveBeenCalledWith({
        username: 'tom', sessionToken: 'fresh', sessionExpiresAt: '2027-01-01T00:00:00.000Z',
      });
    });

    it('throws TAKEN on 409', async () => {
      const sync = new Sync({ identity: makeIdentity(), state: makeState() });
      fetch.mockReturnValueOnce(Promise.resolve({ ok: false, status: 409 }));
      await expect(sync.register({ username: 'tom', password: '12345678' }))
        .rejects.toMatchObject({ code: 'TAKEN' });
    });

    it('throws NETWORK on 5xx', async () => {
      const sync = new Sync({ identity: makeIdentity(), state: makeState() });
      fetch.mockReturnValueOnce(Promise.resolve({ ok: false, status: 500 }));
      await expect(sync.register({ username: 'tom', password: '12345678' }))
        .rejects.toMatchObject({ code: 'NETWORK' });
    });
  });

  describe('login', () => {
    it('throws BAD_AUTH on 401', async () => {
      const sync = new Sync({ identity: makeIdentity(), state: makeState() });
      fetch.mockReturnValueOnce(Promise.resolve({ ok: false, status: 401 }));
      await expect(sync.login({ username: 'tom', password: 'wrongwrong' }))
        .rejects.toMatchObject({ code: 'BAD_AUTH' });
    });

    it('on success stores session', async () => {
      const id = makeIdentity();
      const sync = new Sync({ identity: id, state: makeState() });
      fetch.mockReturnValueOnce(jsonResponse(200, {
        ok: true, username: 'tom', sessionToken: 'new', sessionExpiresAt: 'x',
      }));
      await sync.login({ username: 'tom', password: '12345678' });
      expect(id.setSession).toHaveBeenCalled();
    });
  });

  describe('scheduleWriteBack debounce', () => {
    it('coalesces multiple changes inside the debounce window into one POST', async () => {
      const sync = new Sync({ identity: makeIdentity(), state: makeState() });
      fetch.mockReturnValue(jsonResponse(200, { ok: true }));

      sync.scheduleWriteBack();
      vi.advanceTimersByTime(500);
      sync.scheduleWriteBack();
      vi.advanceTimersByTime(500);
      sync.scheduleWriteBack();
      vi.advanceTimersByTime(1500);
      await Promise.resolve();   // let _flush's awaited fetch resolve

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, opts] = fetch.mock.calls[0];
      expect(url).toBe('/api/state');
      expect(opts.method).toBe('POST');
      expect(opts.headers.authorization).toBe('Bearer tok');
    });

    it('does not POST when there is no valid session', async () => {
      const id = makeIdentity({ valid: false });
      const sync = new Sync({ identity: id, state: makeState() });
      fetch.mockReturnValue(jsonResponse(200, { ok: true }));

      sync.scheduleWriteBack();
      vi.advanceTimersByTime(2000);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('on 401, clears session and fires onSessionExpired', async () => {
      const id = makeIdentity();
      const onSessionExpired = vi.fn();
      const sync = new Sync({ identity: id, state: makeState(), onSessionExpired });
      fetch.mockReturnValue(Promise.resolve({ ok: false, status: 401 }));

      sync.scheduleWriteBack();
      await vi.advanceTimersByTimeAsync(2000);

      expect(id.clearSession).toHaveBeenCalled();
      expect(onSessionExpired).toHaveBeenCalledTimes(1);
    });

    it('swallows network errors silently (offline = ok)', async () => {
      const sync = new Sync({ identity: makeIdentity(), state: makeState() });
      // Defer rejection inside mockImplementation so the rejected promise
      // is created only when fetch is called — not eagerly at .mockReturnValue.
      fetch.mockImplementation(() => Promise.reject(new Error('offline')));

      sync.scheduleWriteBack();
      // Should not throw — best-effort write-back.
      await expect(vi.advanceTimersByTimeAsync(2000)).resolves.not.toThrow();
    });
  });

  describe('pullAndMerge', () => {
    it('union-merges favorites from remote + local', async () => {
      const state = makeState({ favorites: ['ocean', 'rain-light'] });
      const sync = new Sync({ identity: makeIdentity(), state });
      fetch.mockReturnValueOnce(jsonResponse(200, {
        state: { favorites: ['fireplace', 'ocean'], volume: 0.4, lastTrackId: 'fireplace' },
      }));

      await sync.pullAndMerge();

      const merged = state._internal();
      expect(merged.favorites).toEqual(['fireplace', 'ocean', 'rain-light']);
      expect(merged.volume).toBe(0.4);
      expect(merged.lastTrackId).toBe('fireplace');
    });

    it('does nothing when remote returns null / 404', async () => {
      const state = makeState({ favorites: ['ocean'] });
      const sync = new Sync({ identity: makeIdentity(), state });
      fetch.mockReturnValueOnce(Promise.resolve({ ok: false, status: 404 }));
      await sync.pullAndMerge();
      expect(state._internal().favorites).toEqual(['ocean']);
    });

    it('suspends write-back during merge so the merge itself does not trigger a POST', async () => {
      const state = makeState({ favorites: ['ocean'] });
      const sync = new Sync({ identity: makeIdentity(), state });
      let firstCall = true;
      fetch.mockImplementation((url) => {
        if (firstCall) {
          firstCall = false;
          return jsonResponse(200, { state: { favorites: ['fireplace'] } });
        }
        return jsonResponse(200, { ok: true });
      });

      const promise = sync.pullAndMerge();
      // The state.update() inside merge would normally call subscribers →
      // scheduleWriteBack → POST. Suspended flag must prevent that.
      await promise;
      vi.advanceTimersByTime(2000);
      // Only the GET, no POST
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][0]).toContain('/api/state');
    });
  });
});
