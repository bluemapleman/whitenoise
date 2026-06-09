// Full-viewport ambient background. Two large radial gradients drift slowly
// across a black canvas in the active track's palette. Fade between palettes
// when the track changes; dim on pause; ramp out with audio fade-out.

const FADE_MS = 3000;          // cross-fade between tracks
const PAUSE_OPACITY = 0.45;
const VOLUME_FLOOR = 0.4;      // even at volume 0, blooms stay this visible

export class AmbientBg {
  constructor(rootEl) {
    this._root = rootEl;
    this._volume = 0.7;
    this._fadeTimer = null;
    this._volumeBase = 1.0;     // multiplied with volume mapping for fade-out
    this._setOpacityNow(0);
  }

  setTrack(track) {
    if (!track) return;
    const [c1, c2] = track.palette;
    // Update CSS custom properties — the transitions in CSS handle the fade.
    this._root.style.setProperty('--ambient-c1', c1);
    this._root.style.setProperty('--ambient-c2', c2);
    this._volumeBase = 1.0;
    this._applyOpacity();
  }

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    this._applyOpacity();
  }

  setPaused() {
    this._root.classList.add('ambient-paused');
  }

  setPlaying() {
    this._root.classList.remove('ambient-paused');
  }

  fadeOut(ms) {
    // Ramp the multiplier to 0 over ms via CSS transition.
    if (this._fadeTimer) clearTimeout(this._fadeTimer);
    this._root.style.setProperty('--ambient-fade-duration', `${ms}ms`);
    this._volumeBase = 0;
    this._applyOpacity();
    this._fadeTimer = setTimeout(() => {
      this._root.style.setProperty('--ambient-fade-duration', `${FADE_MS}ms`);
      this._fadeTimer = null;
    }, ms);
  }

  clear() {
    if (this._fadeTimer) { clearTimeout(this._fadeTimer); this._fadeTimer = null; }
    this._volumeBase = 0;
    this._applyOpacity();
  }

  show() {
    this._volumeBase = 1.0;
    this._applyOpacity();
  }

  _applyOpacity() {
    // Map volume 0..1 → VOLUME_FLOOR..1, multiply by base (used for fade-out).
    const op = (VOLUME_FLOOR + (1 - VOLUME_FLOOR) * this._volume) * this._volumeBase;
    this._setOpacityNow(op);
  }

  _setOpacityNow(op) {
    this._root.style.setProperty('--ambient-opacity', String(op));
  }
}
