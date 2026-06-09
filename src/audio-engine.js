// HTMLAudioElement-based engine. Chosen over Web Audio API because iOS
// Safari aggressively suspends AudioContext when the screen locks or the
// tab backgrounds — <audio> elements survive lock-screen and integrate
// with the MediaSession lock-screen widget. AAC + loop=true is rock-solid
// across all browsers.
//
// Fade-in / fade-out is driven by a JS interval ramping audio.volume
// linearly. ~16ms tick gives a smooth ramp that's indistinguishable from
// Web Audio's GainNode for our use case (long fades, no audible discontinuities).

const FADE_IN_DEFAULT_MS = 2000;
const FADE_TICK_MS = 16;          // ~60fps; smooth to the ear

export class AudioEngine {
  constructor() {
    this._audio = null;            // single reused HTMLAudioElement
    this._volume = 0.7;            // user's "max" volume; 0..1
    this._currentId = null;
    this._fadeTimer = null;
  }

  _ensureElement() {
    if (this._audio) return;
    const a = new Audio();
    a.loop = true;
    a.preload = 'auto';
    a.crossOrigin = 'anonymous';   // harmless on same-origin; lets us cache via SW
    // Critical iOS hints: playsinline keeps audio out of fullscreen,
    // and we set volume directly. We do NOT set src yet — that happens
    // in play() so the user gesture chain stays intact.
    this._audio = a;
  }

  async play(track, fadeInMs = FADE_IN_DEFAULT_MS) {
    this._ensureElement();
    this._cancelFade();

    // If already playing this track, just ramp volume back up
    if (this._currentId === track.id && !this._audio.paused) {
      this._fadeTo(this._volume, fadeInMs);
      return;
    }

    // Switch source. Setting src + load() during a user gesture (tile tap)
    // is what unlocks iOS audio for subsequent programmatic playback.
    this._audio.src = track.file;
    this._audio.volume = 0;
    this._currentId = track.id;

    // Start from a random point in the loop so two sessions back-to-back
    // don't open with the same intro. duration isn't known until metadata
    // loads — wait for that, then seek before play() so we never hear the
    // first frame.
    await this._whenMetadataReady();
    const dur = this._audio.duration;
    if (isFinite(dur) && dur > 1) {
      // Stay 0.5s away from each edge so a brief decode hiccup doesn't
      // land us on a near-end gap before loop wraps.
      const offset = 0.5 + Math.random() * Math.max(0.1, dur - 1);
      try { this._audio.currentTime = offset; } catch {}
    }

    // play() returns a promise — must await so we can surface load failures
    // (e.g. 404, decode error) up to main.js's catch.
    await this._audio.play();
    this._fadeTo(this._volume, fadeInMs);
  }

  pause() {
    this._cancelFade();
    if (this._audio) this._audio.pause();
    this._currentId = null;
  }

  stop() {
    this.pause();
  }

  // Linear ramp this._audio.volume to 0 over `ms`. Used by SleepTimer.
  fadeOut(ms) {
    this._fadeTo(0, ms);
  }

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (!this._audio) return;
    // Snap to new max immediately if no fade is active. If a fade is active
    // (e.g. mid fade-out), don't override it — the ramp will end at its
    // own target and subsequent plays will use the new max.
    if (!this._fadeTimer) {
      this._audio.volume = this._volume;
    }
  }

  isPlaying() {
    return this._audio !== null && !this._audio.paused;
  }

  currentTrackId() {
    return this._currentId;
  }

  // ---- internals ----

  // Resolves once duration is known. readyState >= 1 (HAVE_METADATA) means
  // we can seek. If metadata is already there, resolve synchronously.
  _whenMetadataReady() {
    return new Promise((resolve) => {
      if (this._audio.readyState >= 1 && isFinite(this._audio.duration)) {
        resolve(); return;
      }
      const done = () => {
        this._audio.removeEventListener('loadedmetadata', done);
        this._audio.removeEventListener('error', done);
        resolve();
      };
      this._audio.addEventListener('loadedmetadata', done, { once: true });
      this._audio.addEventListener('error', done, { once: true });
    });
  }

  _cancelFade() {
    if (this._fadeTimer) {
      clearInterval(this._fadeTimer);
      this._fadeTimer = null;
    }
  }

  _fadeTo(target, ms) {
    this._cancelFade();
    if (!this._audio) return;

    const start = this._audio.volume;
    const delta = target - start;
    if (Math.abs(delta) < 0.001 || ms <= 0) {
      this._audio.volume = target;
      return;
    }

    const startedAt = performance.now();
    this._fadeTimer = setInterval(() => {
      const t = Math.min(1, (performance.now() - startedAt) / ms);
      this._audio.volume = Math.max(0, Math.min(1, start + delta * t));
      if (t >= 1) this._cancelFade();
    }, FADE_TICK_MS);
  }
}
