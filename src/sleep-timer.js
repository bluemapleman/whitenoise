const FADE_OUT_MS = 30_000;

export class SleepTimer {
  constructor({ onFadeOut, onStop }) {
    this._onFadeOut = onFadeOut;
    this._onStop = onStop;
    this._fadeId = null;
    this._stopId = null;
    this._endsAt = 0;          // epoch ms; 0 = not running
    this._totalMs = 0;         // original total — drives the progress bar
    this._infinite = false;
  }

  start(durationMin) {
    this.cancel();
    if (durationMin <= 0) {
      this._infinite = true;
      this._endsAt = Infinity;
      this._totalMs = 0;
      return;
    }
    const totalMs = durationMin * 60 * 1000;
    this._totalMs = totalMs;
    this._schedule(totalMs);
  }

  // Reschedule the timer to a given remaining duration. Used when the user
  // drags the progress bar to extend or shorten the remaining time.
  // Does NOT change _totalMs — the bar fraction stays consistent with the
  // user's original preset choice. (If you drag the timer all the way down,
  // the bar reaches its end naturally rather than rescaling.)
  seekRemaining(newRemainingMs) {
    if (this._infinite) return;
    if (this._endsAt === 0) return;   // not running — ignore

    // Clamp to [0, totalMs]
    const ms = Math.max(0, Math.min(this._totalMs, newRemainingMs));

    if (this._fadeId !== null) clearTimeout(this._fadeId);
    if (this._stopId !== null) clearTimeout(this._stopId);
    this._fadeId = null;
    this._stopId = null;

    if (ms <= 0) {
      this._endsAt = 0;
      this._onStop();
      return;
    }
    this._schedule(ms);
  }

  cancel() {
    if (this._fadeId !== null) clearTimeout(this._fadeId);
    if (this._stopId !== null) clearTimeout(this._stopId);
    this._fadeId = null;
    this._stopId = null;
    this._endsAt = 0;
    this._totalMs = 0;
    this._infinite = false;
  }

  remainingMs() {
    if (this._infinite) return Infinity;
    if (this._endsAt === 0) return 0;
    return Math.max(0, this._endsAt - Date.now());
  }

  totalMs() {
    return this._totalMs;
  }

  _infinite_get() { return this._infinite; }

  _schedule(remainingMs) {
    this._infinite = false;
    const fadeAt = remainingMs - FADE_OUT_MS;
    this._endsAt = Date.now() + remainingMs;

    if (fadeAt > 0) {
      this._fadeId = setTimeout(() => {
        this._fadeId = null;
        this._onFadeOut(FADE_OUT_MS);
      }, fadeAt);
    } else {
      // Already inside the fade window — fire immediately with shorter fade
      this._fadeId = null;
      this._onFadeOut(remainingMs);
    }

    this._stopId = setTimeout(() => {
      this._stopId = null;
      this._endsAt = 0;
      this._onStop();
    }, remainingMs);
  }
}
