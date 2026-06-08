const FADE_IN_DEFAULT_MS = 2000;

export class AudioEngine {
  constructor() {
    this._ctx = null;
    this._gain = null;
    this._source = null;
    this._buffers = new Map();   // id -> AudioBuffer
    this._volume = 0.7;
    this._currentId = null;
    this._loadingPromises = new Map();  // id -> Promise<AudioBuffer>
  }

  // Must be called from a user-gesture handler the first time.
  _ensureContext() {
    if (this._ctx) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    this._ctx = new Ctor();
    this._gain = this._ctx.createGain();
    this._gain.gain.value = 0;
    this._gain.connect(this._ctx.destination);
  }

  async _loadBuffer(track) {
    if (this._buffers.has(track.id)) return this._buffers.get(track.id);
    if (this._loadingPromises.has(track.id)) return this._loadingPromises.get(track.id);

    const promise = (async () => {
      const res = await fetch(track.file);
      if (!res.ok) throw new Error(`Failed to load ${track.file}: ${res.status}`);
      const data = await res.arrayBuffer();
      const buf = await this._ctx.decodeAudioData(data);
      this._buffers.set(track.id, buf);
      this._loadingPromises.delete(track.id);
      return buf;
    })();

    this._loadingPromises.set(track.id, promise);
    return promise;
  }

  _stopSource() {
    if (this._source) {
      try { this._source.stop(); } catch {}
      this._source.disconnect();
      this._source = null;
    }
  }

  async play(track, fadeInMs = FADE_IN_DEFAULT_MS) {
    this._ensureContext();
    if (this._ctx.state === 'suspended') await this._ctx.resume();

    const buf = await this._loadBuffer(track);
    this._stopSource();

    const src = this._ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this._gain);

    const now = this._ctx.currentTime;
    this._gain.gain.cancelScheduledValues(now);
    this._gain.gain.setValueAtTime(0, now);
    this._gain.gain.linearRampToValueAtTime(this._volume, now + fadeInMs / 1000);

    src.start(0);
    this._source = src;
    this._currentId = track.id;
  }

  pause() {
    if (!this._ctx) return;
    this._stopSource();
    this._currentId = null;
  }

  stop() {
    this.pause();
  }

  fadeOut(ms) {
    if (!this._ctx || !this._source) return;
    const now = this._ctx.currentTime;
    this._gain.gain.cancelScheduledValues(now);
    this._gain.gain.setValueAtTime(this._gain.gain.value, now);
    this._gain.gain.linearRampToValueAtTime(0, now + ms / 1000);
  }

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    this._gain.gain.cancelScheduledValues(now);
    this._gain.gain.linearRampToValueAtTime(this._volume, now + 0.1);
  }

  isPlaying() {
    return this._source !== null;
  }

  currentTrackId() {
    return this._currentId;
  }
}
