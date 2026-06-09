import { LIBRARY, trackById } from './library.js';

const TIMER_PRESETS = [1, 15, 30, 45, 60, 90, 0];   // 1 = test preset; 0 means ∞
const LONG_PRESS_MS = 500;

export class UI {
  constructor({ root, state, identity, onPlay, onPause, onSelectTimer, onToggleFavorite, onSetVolume, onMiniPlayerTimerTap }) {
    this._root = root;
    this._state = state;
    this._identity = identity || null;
    this._on = { onPlay, onPause, onSelectTimer, onToggleFavorite, onSetVolume, onMiniPlayerTimerTap };
    this._countdownInterval = null;
    this._currentEndsAt = 0;
    this._frozenRemainingMs = null;   // when paused, what to display
    this._isPlaying = false;
    this._miniPlayerVisible = false;
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
        <div class="title" data-role="title">${this._titleHtml()}</div>
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
        <button class="mp-fav" data-role="mp-fav" aria-label="Toggle favorite" type="button" aria-pressed="false">
          <svg class="mp-fav-outline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.099 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
          </svg>
          <svg class="mp-fav-solid" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001z"/>
          </svg>
        </button>
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

  // Build the page title. Personalized when a username is set; generic
  // otherwise. Username is restricted to [a-z0-9_-] server-side, but we
  // escape regardless — defence in depth and keeps the regex change-safe.
  _titleHtml() {
    const username = this._identity?.username();
    if (username) {
      const safe = String(username).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[ch]));
      return `Hey <span class="title-username">${safe}</span>, have a sweet night!`;
    }
    return 'Have a sweet night!';
  }

  // Called externally after a successful username registration so the title
  // updates without forcing a full state-induced re-render.
  refreshTitle() {
    const el = this._root.querySelector('[data-role="title"]');
    if (el) el.innerHTML = this._titleHtml();
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
    if (track.image) {
      el.classList.add('tile-image');
      el.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.65) 100%), url('${track.image}')`;
    } else {
      el.style.background = `linear-gradient(135deg, ${track.gradient[0]}, ${track.gradient[1]})`;
    }
    const isFav = s.favorites.includes(track.id);
    el.innerHTML = `
      <span class="tile-label">${track.label}</span>
      ${isFav ? `
        <svg class="tile-fav" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001z"/>
        </svg>` : ''}
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
    const favBtn = this._root.querySelector('[data-role="mp-fav"]');

    playPause.addEventListener('click', () => {
      if (this._isPlaying) this._on.onPause();
      else this._on.onPlay(this._state.get().lastTrackId);
    });

    volume.addEventListener('input', (e) => this._on.onSetVolume(parseFloat(e.target.value)));
    timerBtn.addEventListener('click', () => this._on.onMiniPlayerTimerTap());
    favBtn.addEventListener('click', () => {
      const id = this._state.get().lastTrackId;
      if (id) this._on.onToggleFavorite(id);
    });
    this._refreshFavButton();
  }

  _refreshFavButton() {
    const favBtn = this._root.querySelector('[data-role="mp-fav"]');
    if (!favBtn) return;
    const s = this._state.get();
    const id = s.lastTrackId;
    const on = id && s.favorites.includes(id);
    favBtn.classList.toggle('mp-fav-on', !!on);
    favBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  showMiniPlayer(track, endsAt) {
    const mp = this._root.querySelector('[data-role="miniplayer"]');
    mp.hidden = false;
    this._isPlaying = true;
    this._miniPlayerVisible = true;
    this._frozenRemainingMs = null;
    this._currentEndsAt = endsAt;
    this._root.querySelector('[data-role="mp-title"]').textContent = track.label;
    this._root.querySelector('[data-role="play-pause"]').textContent = '⏸';
    this._refreshFavButton();
    this._startCountdown();
  }

  hideMiniPlayer() {
    const mp = this._root.querySelector('[data-role="miniplayer"]');
    mp.hidden = true;
    this._isPlaying = false;
    this._miniPlayerVisible = false;
    this._stopCountdown();
  }

  setMiniPlayerPaused() {
    this._isPlaying = false;
    // Freeze the remaining time at pause moment so re-renders (e.g. volume
    // slider) keep showing the same value instead of an empty placeholder
    // or a continuing countdown.
    if (isFinite(this._currentEndsAt) && this._currentEndsAt > 0) {
      this._frozenRemainingMs = Math.max(0, this._currentEndsAt - Date.now());
    } else if (this._currentEndsAt === Infinity) {
      this._frozenRemainingMs = Infinity;
    }
    this._root.querySelector('[data-role="play-pause"]').textContent = '▶';
    this._stopCountdown();
    this._paintCountdown();
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
    const track = trackById(s.lastTrackId);
    if (!track) return;
    // _render() rebuilt the DOM; restore both visible state AND title.
    // Title must survive the paused state too — otherwise toggling volume
    // (which triggers a re-render via state.update) wipes the label to "—".
    const mp = this._root.querySelector('[data-role="miniplayer"]');
    if (this._miniPlayerVisible) {
      mp.hidden = false;
      this._root.querySelector('[data-role="mp-title"]').textContent = track.label;
      this._root.querySelector('[data-role="play-pause"]').textContent = this._isPlaying ? '⏸' : '▶';
      this._refreshFavButton();
      this._paintCountdown();   // paint frozen value even when paused
      if (this._isPlaying) this._startCountdown();
    }
  }

  // Write the current countdown value into mp-sub once. Used both by the
  // 1Hz interval and by _restoreMiniPlayerState so a paused mini-player
  // keeps its remaining-time label after a re-render.
  _paintCountdown() {
    const sub = this._root.querySelector('[data-role="mp-sub"]');
    if (!sub) return;
    // When paused, display the frozen value captured at pause time.
    // When playing, compute live from _currentEndsAt.
    let ms;
    if (this._isPlaying) {
      if (this._currentEndsAt === Infinity) { sub.textContent = 'no timer'; return; }
      if (!this._currentEndsAt) { sub.textContent = 'no timer'; return; }
      ms = Math.max(0, this._currentEndsAt - Date.now());
    } else {
      if (this._frozenRemainingMs === null) { sub.textContent = '—'; return; }
      if (this._frozenRemainingMs === Infinity) { sub.textContent = 'no timer'; return; }
      ms = this._frozenRemainingMs;
    }
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    sub.textContent = `${m}:${String(s).padStart(2, '0')}`;
  }

  _startCountdown() {
    this._stopCountdown();
    this._paintCountdown();
    this._countdownInterval = setInterval(() => this._paintCountdown(), 1000);
  }

  _stopCountdown() {
    if (this._countdownInterval) clearInterval(this._countdownInterval);
    this._countdownInterval = null;
  }
}
