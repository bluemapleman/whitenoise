import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub the global Audio constructor before importing the engine.
class FakeAudio {
  constructor() {
    this.src = '';
    this.volume = 1;
    this.loop = false;
    this.preload = 'auto';
    this.crossOrigin = null;
    this.paused = true;
    this.currentTime = 0;
    this.readyState = 0;
    this.duration = NaN;
    this._listeners = new Map();
    FakeAudio.lastInstance = this;
  }
  addEventListener(type, fn, opts) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push({ fn, opts });
  }
  removeEventListener(type, fn) {
    if (!this._listeners.has(type)) return;
    this._listeners.set(type, this._listeners.get(type).filter(x => x.fn !== fn));
  }
  _emit(type) {
    const list = (this._listeners.get(type) || []).slice();
    for (const { fn, opts } of list) {
      fn();
      if (opts && opts.once) this.removeEventListener(type, fn);
    }
  }
  // Simulate metadata becoming available
  _supplyMetadata(duration) {
    this.duration = duration;
    this.readyState = 1;
    this._emit('loadedmetadata');
  }
  async play() {
    this.paused = false;
  }
  pause() {
    this.paused = true;
  }
}

beforeEach(() => {
  globalThis.Audio = FakeAudio;
  FakeAudio.lastInstance = null;
});

const TRACK = { id: 'rain-light', file: 'audio/rain-light.m4a', label: 'Rain' };

async function freshEngine() {
  // Re-import per test so module-level state never leaks across cases.
  vi.resetModules();
  const mod = await import('../src/audio-engine.js');
  return new mod.AudioEngine();
}

describe('AudioEngine', () => {
  describe('basic playback', () => {
    it('starts at volume 0 and ramps up to engine volume', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] });
      const eng = await freshEngine();
      eng.setVolume(0.6);
      const p = eng.play(TRACK, 200);

      // Resolve metadata so play() can proceed past the await.
      await Promise.resolve();           // let _ensureElement + src assignment land
      FakeAudio.lastInstance._supplyMetadata(300);
      await p;

      const audio = FakeAudio.lastInstance;
      expect(audio.paused).toBe(false);
      expect(audio.src).toContain('audio/rain-light.m4a');
      expect(audio.loop).toBe(true);
      expect(audio.volume).toBeCloseTo(0, 3);

      // Advance the fade interval to completion
      vi.advanceTimersByTime(220);
      expect(audio.volume).toBeCloseTo(0.6, 2);
      vi.useRealTimers();
    });

    it('isPlaying reflects underlying audio.paused', async () => {
      const eng = await freshEngine();
      expect(eng.isPlaying()).toBe(false);

      const p = eng.play(TRACK, 0);
      await Promise.resolve();
      FakeAudio.lastInstance._supplyMetadata(300);
      await p;
      expect(eng.isPlaying()).toBe(true);

      eng.pause();
      expect(eng.isPlaying()).toBe(false);
    });

    it('currentTrackId tracks the active track', async () => {
      const eng = await freshEngine();
      expect(eng.currentTrackId()).toBe(null);

      const p = eng.play(TRACK, 0);
      await Promise.resolve();
      FakeAudio.lastInstance._supplyMetadata(300);
      await p;

      expect(eng.currentTrackId()).toBe('rain-light');
      eng.pause();
      expect(eng.currentTrackId()).toBe(null);
    });
  });

  describe('random start offset', () => {
    it('seeks to a point inside [0.5, duration-0.5] before play', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);   // deterministic
      const eng = await freshEngine();
      const p = eng.play(TRACK, 0);

      await Promise.resolve();
      FakeAudio.lastInstance._supplyMetadata(300);
      await p;

      const audio = FakeAudio.lastInstance;
      // 0.5 + 0.5 * (300 - 1) = 150.0
      expect(audio.currentTime).toBeCloseTo(150, 1);
      Math.random.mockRestore();
    });

    it('clamps so start never falls in last 0.5s of file', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999);
      const eng = await freshEngine();
      const p = eng.play(TRACK, 0);
      await Promise.resolve();
      FakeAudio.lastInstance._supplyMetadata(300);
      await p;
      expect(FakeAudio.lastInstance.currentTime).toBeLessThanOrEqual(299.5);
      Math.random.mockRestore();
    });

    it('does NOT seek when duration is unknown / very short', async () => {
      const eng = await freshEngine();
      const p = eng.play(TRACK, 0);
      await Promise.resolve();
      // Supply a 0.5s duration — too short to seek into safely
      FakeAudio.lastInstance._supplyMetadata(0.5);
      await p;
      expect(FakeAudio.lastInstance.currentTime).toBe(0);
    });

    it('two consecutive plays land at different offsets', async () => {
      const eng = await freshEngine();

      const p1 = eng.play(TRACK, 0);
      await Promise.resolve();
      FakeAudio.lastInstance._supplyMetadata(300);
      await p1;
      const t1 = FakeAudio.lastInstance.currentTime;

      const p2 = eng.play({ ...TRACK, id: 'forest', file: 'audio/forest.m4a' }, 0);
      await Promise.resolve();
      FakeAudio.lastInstance._supplyMetadata(300);
      await p2;
      const t2 = FakeAudio.lastInstance.currentTime;

      // Random.random() can theoretically return the same value twice in a row,
      // but with two independent calls into a [~0.5, 299.5] range, identical
      // currentTime is astronomically unlikely. If this flakes, swap to a
      // mocked Math.random returning two distinct values.
      expect(t1).not.toBe(t2);
    });
  });

  describe('volume', () => {
    it('setVolume clamps to [0,1]', async () => {
      const eng = await freshEngine();
      eng.setVolume(2);
      // We can't read engine volume directly, but we can re-play and check
      // the fade target lands at 1.
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] });
      const p = eng.play(TRACK, 100);
      await Promise.resolve();
      FakeAudio.lastInstance._supplyMetadata(300);
      await p;
      vi.advanceTimersByTime(120);
      expect(FakeAudio.lastInstance.volume).toBeCloseTo(1, 2);
      vi.useRealTimers();
    });

    it('setVolume clamps negative values to 0', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] });
      const eng = await freshEngine();
      eng.setVolume(-1);
      const p = eng.play(TRACK, 100);
      await Promise.resolve();
      FakeAudio.lastInstance._supplyMetadata(300);
      await p;
      vi.advanceTimersByTime(120);
      expect(FakeAudio.lastInstance.volume).toBeCloseTo(0, 2);
      vi.useRealTimers();
    });
  });

  describe('fadeOut', () => {
    it('linearly drops volume to 0 over the requested duration', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] });
      const eng = await freshEngine();
      eng.setVolume(1);
      const p = eng.play(TRACK, 0);
      await Promise.resolve();
      FakeAudio.lastInstance._supplyMetadata(300);
      await p;
      // Fast-forward past initial fade so volume = 1
      vi.advanceTimersByTime(50);
      expect(FakeAudio.lastInstance.volume).toBeCloseTo(1, 2);

      eng.fadeOut(1000);
      vi.advanceTimersByTime(500);
      expect(FakeAudio.lastInstance.volume).toBeGreaterThan(0.4);
      expect(FakeAudio.lastInstance.volume).toBeLessThan(0.6);

      vi.advanceTimersByTime(600);
      expect(FakeAudio.lastInstance.volume).toBeCloseTo(0, 2);
      vi.useRealTimers();
    });
  });

  describe('reuse on same track', () => {
    it('re-playing the active track does NOT swap src or reseek', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] });
      const eng = await freshEngine();
      eng.setVolume(1);
      const p1 = eng.play(TRACK, 0);
      await Promise.resolve();
      FakeAudio.lastInstance._supplyMetadata(300);
      await p1;
      const audio = FakeAudio.lastInstance;
      const srcBefore = audio.src;
      const tBefore = audio.currentTime;

      // Mid fade-out, user taps again — should ramp back up, not reload.
      eng.fadeOut(1000);
      vi.advanceTimersByTime(500);
      const p2 = eng.play(TRACK, 200);
      await p2;
      vi.advanceTimersByTime(220);

      expect(audio.src).toBe(srcBefore);
      expect(audio.currentTime).toBe(tBefore);
      expect(audio.volume).toBeCloseTo(1, 2);
      vi.useRealTimers();
    });
  });
});
