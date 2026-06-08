const FADE_OUT_MS = 30_000;

export class SleepTimer {
  constructor({ onFadeOut, onStop }) {
    this._onFadeOut = onFadeOut;
    this._onStop = onStop;
    this._fadeId = null;
    this._stopId = null;
    this._endsAt = 0;          // epoch ms; 0 = not running
    this._infinite = false;
  }

  start(durationMin) {
    this.cancel();
    if (durationMin <= 0) {
      this._infinite = true;
      this._endsAt = Infinity;
      return;
    }
    this._infinite = false;
    const totalMs = durationMin * 60 * 1000;
    const fadeAt = totalMs - FADE_OUT_MS;
    this._endsAt = Date.now() + totalMs;

    this._fadeId = setTimeout(() => {
      this._fadeId = null;
      this._onFadeOut(FADE_OUT_MS);
    }, Math.max(0, fadeAt));

    this._stopId = setTimeout(() => {
      this._stopId = null;
      this._endsAt = 0;
      this._onStop();
    }, totalMs);
  }

  cancel() {
    if (this._fadeId !== null) clearTimeout(this._fadeId);
    if (this._stopId !== null) clearTimeout(this._stopId);
    this._fadeId = null;
    this._stopId = null;
    this._endsAt = 0;
    this._infinite = false;
  }

  remainingMs() {
    if (this._infinite) return Infinity;
    if (this._endsAt === 0) return 0;
    return Math.max(0, this._endsAt - Date.now());
  }
}
