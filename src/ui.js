import { LIBRARY, trackById } from './library.js';

const TIMER_PRESETS = [15, 30, 45, 60, 90, 0];   // 0 means ∞
const LONG_PRESS_MS = 500;

export class UI {
  constructor({ root, state, onPlay, onPause, onSelectTimer, onToggleFavorite, onSetVolume, onMiniPlayerTimerTap }) {
    this._root = root;
    this._state = state;
    this._on = { onPlay, onPause, onSelectTimer, onToggleFavorite, onSetVolume, onMiniPlayerTimerTap };
    this._countdownInterval = null;
    this._currentEndsAt = 0;
    this._isPlaying = false;
    this._render();
    this._state.subscribe(() => this._render());
  }

  _render() {
    const s = this._state.get();
    this._root.innerHTML = `
      <div class="install-hint" data-role="install-hint" hidden>
        <span>Install: tap Share → Add to Home Screen</span>
        <button data-role="dismiss-install">×</button>
      </div>

      <header class="hdr">
        <div class="title">Tonight</div>
      </header>

      <section>
        <div class="label">Sleep timer</div>
        <div class="chips" data-role="timer-chips"></div>
      </section>

      <section data-role="favorites-section" hidden>
        <div class="label">Favorites</div>
        <div class="grid" data-role="favorites-grid"></div>
      </section>

      <section>
        <div class="label">All sounds</div>
        <div class="grid" data-role="all-grid"></div>
      </section>

      <div class="miniplayer" data-role="miniplayer" hidden>
        <button class="mp-btn" data-role="play-pause">▶</button>
        <div class="mp-info">
          <div class="mp-title" data-role="mp-title">—</div>
          <div class="mp-sub" data-role="mp-sub">—</div>
        </div>
        <button class="mp-timer" data-role="mp-timer">⏱ ${s.lastTimer === 0 ? '∞' : s.lastTimer + 'm'}</button>
        <input class="mp-volume" type="range" min="0" max="1" step="0.01" value="${s.volume}" data-role="volume">
      </div>
    `;

    this._renderTimerChips(s);
    this._renderFavorites(s);
    this._renderAllGrid(s);
    this._wireMiniPlayer();
    this._wireInstallHint();
    this._restoreMiniPlayerState();
  }

  _renderTimerChips(s) {
    const host = this._root.querySelector('[data-role="timer-chips"]');
    host.innerHTML = '';
    for (const p of TIMER_PRESETS) {
      const chip = document.createElement('button');
      chip.className = 'chip' + (p === s.lastTimer ? ' active' : '');
      chip.textContent = p === 0 ? '∞' : String(p);
      chip.addEventListener('click', () => this._on.onSelectTimer(p));
      host.appendChild(chip);
    }
  }

  _renderFavorites(s) {
    const section = this._root.querySelector('[data-role="favorites-section"]');
    const grid = this._root.querySelector('[data-role="favorites-grid"]');
    if (s.favorites.length === 0) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    grid.innerHTML = '';
    for (const id of s.favorites) {
      const tr = trackById(id);
      if (tr) grid.appendChild(this._tile(tr, s));
    }
  }

  _renderAllGrid(s) {
    const grid = this._root.querySelector('[data-role="all-grid"]');
    grid.innerHTML = '';
    for (const tr of LIBRARY) grid.appendChild(this._tile(tr, s));
  }

  _tile(track, s) {
    const el = document.createElement('button');
    el.className = 'tile' + (track.id === s.lastTrackId ? ' active' : '');
    el.style.background = `linear-gradient(135deg, ${track.gradient[0]}, ${track.gradient[1]})`;
    el.innerHTML = `
      <span class="tile-label">${track.label}</span>
      ${s.favorites.includes(track.id) ? '<span class="tile-fav">♥</span>' : ''}
    `;
    el.addEventListener('click', () => this._on.onPlay(track.id));
    this._wireLongPress(el, () => this._on.onToggleFavorite(track.id));
    return el;
  }

  _wireLongPress(el, fn) {
    let timer = null;
    let triggered = false;
    const start = (e) => {
      triggered = false;
      timer = setTimeout(() => {
        triggered = true;
        fn();
      }, LONG_PRESS_MS);
    };
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', cancel);
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('pointerleave', cancel);
    el.addEventListener('click', (e) => { if (triggered) { e.stopImmediatePropagation(); } }, true);
  }

  _wireMiniPlayer() {
    const playPause = this._root.querySelector('[data-role="play-pause"]');
    const volume = this._root.querySelector('[data-role="volume"]');
    const timerBtn = this._root.querySelector('[data-role="mp-timer"]');

    playPause.addEventListener('click', () => {
      if (this._isPlaying) this._on.onPause();
      else this._on.onPlay(this._state.get().lastTrackId);
    });

    volume.addEventListener('input', (e) => this._on.onSetVolume(parseFloat(e.target.value)));
    timerBtn.addEventListener('click', () => this._on.onMiniPlayerTimerTap());
  }

  showMiniPlayer(track, endsAt) {
    const mp = this._root.querySelector('[data-role="miniplayer"]');
    mp.hidden = false;
    this._isPlaying = true;
    this._currentEndsAt = endsAt;
    this._root.querySelector('[data-role="mp-title"]').textContent = track.label;
    this._root.querySelector('[data-role="play-pause"]').textContent = '⏸';
    this._startCountdown();
  }

  hideMiniPlayer() {
    const mp = this._root.querySelector('[data-role="miniplayer"]');
    mp.hidden = true;
    this._isPlaying = false;
    this._stopCountdown();
  }

  setMiniPlayerPaused() {
    this._isPlaying = false;
    this._root.querySelector('[data-role="play-pause"]').textContent = '▶';
    this._stopCountdown();
  }

  _wireInstallHint() {
    const hint = this._root.querySelector('[data-role="install-hint"]');
    const dismiss = this._root.querySelector('[data-role="dismiss-install"]');
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const dismissed = localStorage.getItem('whitenoise.install.dismissed') === '1';
    if (isIos && !isStandalone && !dismissed) {
      hint.hidden = false;
    }
    dismiss.addEventListener('click', () => {
      hint.hidden = true;
      localStorage.setItem('whitenoise.install.dismissed', '1');
    });
  }

  _restoreMiniPlayerState() {
    const s = this._state.get();
    if (this._isPlaying) {
      const track = trackById(s.lastTrackId);
      const mp = this._root.querySelector('[data-role="miniplayer"]');
      mp.hidden = false;
      this._root.querySelector('[data-role="play-pause"]').textContent = '⏸';
      this._root.querySelector('[data-role="mp-title"]').textContent = track ? track.label : '—';
      this._startCountdown();
    }
  }

  _startCountdown() {
    this._stopCountdown();
    const tick = () => {
      const sub = this._root.querySelector('[data-role="mp-sub"]');
      if (!sub) return;
      if (!isFinite(this._currentEndsAt)) {
        sub.textContent = 'no timer';
        return;
      }
      const ms = Math.max(0, this._currentEndsAt - Date.now());
      const totalSec = Math.floor(ms / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      sub.textContent = `${m}:${String(s).padStart(2, '0')}`;
    };
    tick();
    this._countdownInterval = setInterval(tick, 1000);
  }

  _stopCountdown() {
    if (this._countdownInterval) clearInterval(this._countdownInterval);
    this._countdownInterval = null;
  }
}
