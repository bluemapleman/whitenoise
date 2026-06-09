// Sleep-timer progress bar. Sits above the mini-player, full viewport width.
// Fill grows left→right as time elapses. User can tap or drag to seek.
//
// Drag direction: drag the right edge inward (left) to shorten remaining time.
// (Or equivalently: tap further right = less remaining.)

const TICK_MS = 250;

export class TimerProgress {
  constructor({ root, onSeek }) {
    this._root = root;
    this._onSeek = onSeek;
    this._totalMs = 0;
    this._endsAt = 0;
    this._tickInterval = null;
    this._dragging = false;
    this._paletteColor = '';

    root.innerHTML = `
      <div class="tp-fill" data-role="tp-fill"></div>
      <div class="tp-handle" data-role="tp-handle"></div>
    `;
    this._fillEl = root.querySelector('[data-role="tp-fill"]');
    this._handleEl = root.querySelector('[data-role="tp-handle"]');

    this._wirePointer();
  }

  show({ totalMs, endsAt, paletteColor }) {
    if (!totalMs || !isFinite(endsAt)) {
      this.hide();
      return;
    }
    this._totalMs = totalMs;
    this._endsAt = endsAt;
    this._paletteColor = paletteColor || '';
    if (this._paletteColor) {
      this._root.style.setProperty('--tp-fill-color', this._paletteColor);
    }
    this._root.classList.add('tp-visible');
    this._tick();
    this._startTicking();
  }

  hide() {
    this._root.classList.remove('tp-visible');
    this._stopTicking();
    this._totalMs = 0;
    this._endsAt = 0;
  }

  // Called by main.js when a seek lands and the new endsAt is known.
  syncEnd(endsAt) {
    this._endsAt = endsAt;
    this._tick();
  }

  _startTicking() {
    this._stopTicking();
    this._tickInterval = setInterval(() => this._tick(), TICK_MS);
  }

  _stopTicking() {
    if (this._tickInterval) clearInterval(this._tickInterval);
    this._tickInterval = null;
  }

  _tick() {
    if (this._dragging) return;     // user is in control while dragging
    if (!this._totalMs) return;
    const remaining = Math.max(0, this._endsAt - Date.now());
    this._setFraction(1 - remaining / this._totalMs);
  }

  _setFraction(f) {
    const pct = Math.max(0, Math.min(1, f)) * 100;
    this._fillEl.style.width = pct + '%';
    this._handleEl.style.left = pct + '%';
  }

  _fractionFromEvent(ev) {
    const rect = this._root.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }

  _wirePointer() {
    let activePointerId = null;

    const onDown = (ev) => {
      if (!this._totalMs) return;
      activePointerId = ev.pointerId;
      this._dragging = true;
      this._root.setPointerCapture(ev.pointerId);
      this._root.classList.add('tp-active');
      const f = this._fractionFromEvent(ev);
      this._setFraction(f);
      ev.preventDefault();
    };

    const onMove = (ev) => {
      if (ev.pointerId !== activePointerId) return;
      const f = this._fractionFromEvent(ev);
      this._setFraction(f);
    };

    const onUp = (ev) => {
      if (ev.pointerId !== activePointerId) return;
      activePointerId = null;
      this._dragging = false;
      this._root.classList.remove('tp-active');
      try { this._root.releasePointerCapture(ev.pointerId); } catch {}
      const f = this._fractionFromEvent(ev);
      const newRemainingMs = (1 - f) * this._totalMs;
      // Tell the controller; it will call syncEnd() with the resulting endsAt
      // (or hide() if the seek lands at 0).
      this._onSeek(newRemainingMs);
    };

    this._root.addEventListener('pointerdown', onDown);
    this._root.addEventListener('pointermove', onMove);
    this._root.addEventListener('pointerup', onUp);
    this._root.addEventListener('pointercancel', onUp);
  }
}
