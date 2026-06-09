// Sleep-timer progress bar. Sits above the mini-player, full viewport width.
// Fill grows left→right as time elapses. User can tap or drag to seek.
//
// Drag direction: drag the right edge inward (left) to shorten remaining time.
// (Or equivalently: tap further right = less remaining.)
//
// Uses both pointer events (modern) and touch events (iOS Safari fallback) —
// pointermove can be dropped by Safari during touch interactions in some
// gesture-eligible regions, so the touch handlers ensure smooth dragging.

const TICK_MS = 250;

export class TimerProgress {
  constructor({ root, onSeek }) {
    this._root = root;
    this._onSeek = onSeek;
    this._totalMs = 0;
    this._endsAt = 0;
    this._tickInterval = null;
    this._dragging = false;
    this._pendingFraction = null;
    this._rafId = null;

    root.innerHTML = `
      <div class="tp-fill" data-role="tp-fill"></div>
      <div class="tp-handle" data-role="tp-handle"></div>
    `;
    this._fillEl = root.querySelector('[data-role="tp-fill"]');
    this._handleEl = root.querySelector('[data-role="tp-handle"]');

    this._wireInput();
  }

  show({ totalMs, endsAt, paletteColor }) {
    if (!totalMs || !isFinite(endsAt)) {
      this.hide();
      return;
    }
    this._totalMs = totalMs;
    this._endsAt = endsAt;
    if (paletteColor) {
      this._root.style.setProperty('--tp-fill-color', paletteColor);
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

  _scheduleSetFraction(f) {
    this._pendingFraction = f;
    if (this._rafId !== null) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      if (this._pendingFraction !== null) {
        this._setFraction(this._pendingFraction);
        this._pendingFraction = null;
      }
    });
  }

  _fractionFromClientX(clientX) {
    const rect = this._root.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  _beginDrag(clientX) {
    if (!this._totalMs) return;
    this._dragging = true;
    this._root.classList.add('tp-active');
    this._scheduleSetFraction(this._fractionFromClientX(clientX));
  }

  _moveDrag(clientX) {
    if (!this._dragging) return;
    this._scheduleSetFraction(this._fractionFromClientX(clientX));
  }

  _endDrag(clientX) {
    if (!this._dragging) return;
    this._dragging = false;
    this._root.classList.remove('tp-active');
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
      this._pendingFraction = null;
    }
    const f = this._fractionFromClientX(clientX);
    this._setFraction(f);
    const newRemainingMs = (1 - f) * this._totalMs;
    this._onSeek(newRemainingMs);
  }

  _wireInput() {
    let activePointerId = null;

    // ---- Pointer events (works in modern Chrome, Firefox, Edge, modern iOS) ----

    const onPointerDown = (ev) => {
      if (ev.pointerType === 'touch') return;   // touch events handle this
      if (!this._totalMs) return;
      activePointerId = ev.pointerId;
      try { this._root.setPointerCapture(ev.pointerId); } catch {}
      this._beginDrag(ev.clientX);
      ev.preventDefault();
    };

    const onPointerMove = (ev) => {
      if (ev.pointerId !== activePointerId) return;
      this._moveDrag(ev.clientX);
      ev.preventDefault();
    };

    const onPointerUp = (ev) => {
      if (ev.pointerId !== activePointerId) return;
      activePointerId = null;
      try { this._root.releasePointerCapture(ev.pointerId); } catch {}
      this._endDrag(ev.clientX);
    };

    this._root.addEventListener('pointerdown', onPointerDown);
    this._root.addEventListener('pointermove', onPointerMove);
    this._root.addEventListener('pointerup', onPointerUp);
    this._root.addEventListener('pointercancel', onPointerUp);

    // ---- Touch events (iOS Safari fallback for reliable drag) ----
    // iOS sometimes silently swallows pointermove inside touch-action regions.
    // Touch events are more reliable on iOS for continuous drag tracking.

    const onTouchStart = (ev) => {
      if (!this._totalMs) return;
      const t = ev.changedTouches[0];
      if (!t) return;
      this._beginDrag(t.clientX);
      ev.preventDefault();
    };

    const onTouchMove = (ev) => {
      if (!this._dragging) return;
      const t = ev.changedTouches[0];
      if (!t) return;
      this._moveDrag(t.clientX);
      ev.preventDefault();
    };

    const onTouchEnd = (ev) => {
      if (!this._dragging) return;
      const t = ev.changedTouches[0];
      if (!t) return;
      this._endDrag(t.clientX);
    };

    this._root.addEventListener('touchstart', onTouchStart, { passive: false });
    this._root.addEventListener('touchmove', onTouchMove, { passive: false });
    this._root.addEventListener('touchend', onTouchEnd);
    this._root.addEventListener('touchcancel', onTouchEnd);
  }
}
