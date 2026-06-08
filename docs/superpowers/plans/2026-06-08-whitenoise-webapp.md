# White-Noise Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page web app for falling asleep to ambient sounds, with seamless looping audio, sleep timer with fade-out, favorites, PWA offline support, and persistent state — all as static files with no build step.

**Architecture:** Vanilla HTML/CSS/JS. Web Audio API for seamless looping (not `<audio loop>`). Service worker for offline. `localStorage` for persistence. ES modules for code organization. Vitest for unit tests of pure logic (SleepTimer, State).

**Tech Stack:** HTML5, CSS3 (custom properties, grid), ES2022 modules, Web Audio API, Service Worker API, `MediaSession` API, Vitest (dev-only).

---

## File Structure

```
whitenoise/
├── index.html                      # Single page, all UI markup
├── styles.css                      # Dark theme, layout, tile gradients
├── manifest.json                   # PWA manifest
├── service-worker.js               # Offline asset caching
├── icons/
│   ├── icon-192.png                # PWA icon
│   └── icon-512.png                # PWA icon
├── audio/
│   ├── LICENSES.md                 # Per-track attribution
│   ├── rain-light.m4a
│   ├── ... (12 more tracks)
├── src/
│   ├── library.js                  # Static list of 13 tracks
│   ├── state.js                    # localStorage-backed state
│   ├── audio-engine.js             # Web Audio: load, loop, fade, volume
│   ├── sleep-timer.js              # Pure timer logic (no DOM)
│   ├── media-session.js            # navigator.mediaSession bindings
│   ├── ui.js                       # DOM rendering + event wiring
│   └── main.js                     # App entry point — wires modules together
├── tests/
│   ├── sleep-timer.test.js         # Vitest unit tests
│   └── state.test.js               # Vitest unit tests
├── tools/
│   ├── loop-test.html              # Manual loop-seam verification page
│   └── serve.sh                    # Local dev server
├── package.json                    # Dev dependencies only (vitest)
├── .gitignore
└── README.md
```

**File responsibilities:**

| File | Responsibility | Notes |
|---|---|---|
| `src/library.js` | Static track metadata: id, label, gradient colors, file path | Pure data, no logic |
| `src/state.js` | Read/write `localStorage` under one key; in-memory cache; pub/sub | Pure logic, easy to unit-test |
| `src/audio-engine.js` | `AudioContext` lifecycle, buffer load/cache, play/pause/stop, gain ramps | Touches Web Audio only, no DOM |
| `src/sleep-timer.js` | Track active duration, schedule fade-out & stop callbacks; cancellable | Pure logic, no DOM, no Web Audio — calls callbacks |
| `src/media-session.js` | Set metadata + action handlers when playback starts | Touches `navigator.mediaSession` only |
| `src/ui.js` | Render timer chips, grids, mini-player; bind click/long-press; subscribe to State | Single source of DOM truth |
| `src/main.js` | Construct each module, wire them, call initial render | ~30 lines |
| `service-worker.js` | Precache shell + audio on install; cache-first on fetch | Standalone, runs in SW context |

Each module is tiny and has one responsibility. Tests target pure modules (`state`, `sleep-timer`); audio + UI are validated manually.

---

## Task 1: Initialize project skeleton

**Files:**
- Create: `~/Projects/whitenoise/package.json`
- Create: `~/Projects/whitenoise/README.md`
- Create: `~/Projects/whitenoise/index.html`
- Create: `~/Projects/whitenoise/styles.css`
- Create: `~/Projects/whitenoise/tools/serve.sh`
- Modify: `~/Projects/whitenoise/.gitignore`

- [ ] **Step 1: Write `package.json` with dev-only deps**

```json
{
  "name": "whitenoise",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "serve": "bash tools/serve.sh"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Write `tools/serve.sh`**

```bash
#!/usr/bin/env bash
# Simple local dev server with no caching headers
cd "$(dirname "$0")/.."
python3 -m http.server 8000
```

Then make it executable:

```bash
chmod +x ~/Projects/whitenoise/tools/serve.sh
```

- [ ] **Step 3: Write minimal `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0d1117">
  <title>Tonight</title>
  <link rel="manifest" href="manifest.json">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main id="app"></main>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Write minimal `styles.css` with theme variables**

```css
:root {
  --bg: #0d1117;
  --surface: #1a2332;
  --surface-2: #0a0e14;
  --accent: #5a8dff;
  --text: #e6edf3;
  --text-dim: rgba(230, 237, 243, 0.5);
  --text-faint: rgba(230, 237, 243, 0.3);
  --border: #1a2332;
  --radius: 10px;
  --radius-pill: 14px;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, system-ui, sans-serif;
  font-size: 15px;
  min-height: 100vh;
}

body {
  padding-bottom: 76px; /* room for sticky mini-player */
}

main {
  max-width: 480px;
  margin: 0 auto;
  padding: 18px;
}
```

- [ ] **Step 5: Write minimal `src/main.js`**

```js
console.log('whitenoise loaded');
const app = document.getElementById('app');
app.textContent = 'Tonight';
```

- [ ] **Step 6: Write `README.md`**

```markdown
# whitenoise

A single-page web app that plays curated ambient sounds for falling asleep.

## Develop

    npm install
    npm run serve   # http://localhost:8000

## Test

    npm test
```

- [ ] **Step 7: Update `.gitignore`**

Append:

```
node_modules/
.DS_Store
.superpowers/
```

- [ ] **Step 8: Verify it loads**

Run:

```bash
cd ~/Projects/whitenoise && bash tools/serve.sh &
sleep 1 && curl -s http://localhost:8000/ | grep -c '<main id="app">'
kill %1
```

Expected: `1`

- [ ] **Step 9: Commit**

```bash
cd ~/Projects/whitenoise
git add package.json README.md index.html styles.css tools/serve.sh .gitignore
git commit -m "feat: initialize project skeleton"
```

---

## Task 2: Library module (static track metadata)

**Files:**
- Create: `~/Projects/whitenoise/src/library.js`

- [ ] **Step 1: Write `src/library.js`**

```js
// Static list of all available tracks.
// Gradient is [topLeft, bottomRight] hex colors used by the tile background.
export const LIBRARY = [
  { id: 'rain-light',      label: 'Rain (light)',     gradient: ['#1e3a5f', '#0d1117'], file: 'audio/rain-light.m4a' },
  { id: 'rain-heavy',      label: 'Rain (heavy)',     gradient: ['#1e2a4f', '#0d1117'], file: 'audio/rain-heavy.m4a' },
  { id: 'thunder',         label: 'Thunderstorm',     gradient: ['#2e1a3a', '#0d1117'], file: 'audio/thunder.m4a' },
  { id: 'ocean',           label: 'Ocean waves',      gradient: ['#1a2e3a', '#0d1117'], file: 'audio/ocean.m4a' },
  { id: 'forest',          label: 'Forest',           gradient: ['#1a3a2e', '#0d1117'], file: 'audio/forest.m4a' },
  { id: 'mountain-breeze', label: 'Mountain breeze',  gradient: ['#1a2a3a', '#0d1117'], file: 'audio/mountain-breeze.m4a' },
  { id: 'river',           label: 'River',            gradient: ['#1e3a3a', '#0d1117'], file: 'audio/river.m4a' },
  { id: 'fireplace',       label: 'Fireplace',        gradient: ['#3a2e1a', '#0d1117'], file: 'audio/fireplace.m4a' },
  { id: 'crickets',        label: 'Night crickets',   gradient: ['#2a2a1a', '#0d1117'], file: 'audio/crickets.m4a' },
  { id: 'brown-noise',     label: 'Brown noise',      gradient: ['#3a2a2a', '#0d1117'], file: 'audio/brown-noise.m4a' },
  { id: 'pink-noise',      label: 'Pink noise',       gradient: ['#3a2a3a', '#0d1117'], file: 'audio/pink-noise.m4a' },
  { id: 'white-noise',     label: 'White noise',      gradient: ['#2a2a2a', '#0d1117'], file: 'audio/white-noise.m4a' },
  { id: 'fan',             label: 'Fan / AC hum',     gradient: ['#1a1a1a', '#0d1117'], file: 'audio/fan.m4a' },
];

export function trackById(id) {
  return LIBRARY.find(t => t.id === id) || null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/library.js
git commit -m "feat: add track library metadata"
```

---

## Task 3: State module — write tests first

**Files:**
- Create: `~/Projects/whitenoise/tests/state.test.js`
- Create: `~/Projects/whitenoise/vitest.config.js`

- [ ] **Step 1: Write `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
  },
});
```

- [ ] **Step 2: Write failing tests in `tests/state.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { State, STORAGE_KEY } from '../src/state.js';

describe('State', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when nothing is stored', () => {
    const s = new State();
    expect(s.get()).toEqual({
      lastTrackId: null,
      lastTimer: 45,
      favorites: [],
      volume: 0.7,
    });
  });

  it('persists changes to localStorage', () => {
    const s = new State();
    s.update({ lastTrackId: 'forest', volume: 0.5 });
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(raw.lastTrackId).toBe('forest');
    expect(raw.volume).toBe(0.5);
  });

  it('restores state from localStorage on construction', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      lastTrackId: 'rain-light', lastTimer: 30, favorites: ['ocean'], volume: 0.3,
    }));
    const s = new State();
    expect(s.get().lastTrackId).toBe('rain-light');
    expect(s.get().favorites).toEqual(['ocean']);
  });

  it('toggleFavorite adds when missing, removes when present', () => {
    const s = new State();
    s.toggleFavorite('forest');
    expect(s.get().favorites).toEqual(['forest']);
    s.toggleFavorite('forest');
    expect(s.get().favorites).toEqual([]);
  });

  it('toggleFavorite places newly added items at the front', () => {
    const s = new State();
    s.toggleFavorite('forest');
    s.toggleFavorite('rain-light');
    expect(s.get().favorites).toEqual(['rain-light', 'forest']);
  });

  it('subscribers are notified on update', () => {
    const s = new State();
    const calls = [];
    s.subscribe(snap => calls.push(snap.lastTrackId));
    s.update({ lastTrackId: 'forest' });
    s.update({ lastTrackId: 'ocean' });
    expect(calls).toEqual(['forest', 'ocean']);
  });

  it('survives malformed localStorage data', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    const s = new State();
    expect(s.get().lastTimer).toBe(45);
  });
});
```

- [ ] **Step 3: Install deps and run — expect failure**

Run:

```bash
cd ~/Projects/whitenoise && npm install && npm test
```

Expected: tests fail with "Cannot find module '../src/state.js'"

- [ ] **Step 4: Implement `src/state.js`**

```js
export const STORAGE_KEY = 'whitenoise.state';

const DEFAULTS = Object.freeze({
  lastTrackId: null,
  lastTimer: 45,        // minutes; 0 means ∞
  favorites: [],
  volume: 0.7,
});

export class State {
  constructor() {
    this._state = this._load();
    this._subs = new Set();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    } catch {
      return { ...DEFAULTS };
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
    } catch {
      // localStorage full or disabled — silently degrade
    }
  }

  get() {
    return { ...this._state, favorites: [...this._state.favorites] };
  }

  update(patch) {
    this._state = { ...this._state, ...patch };
    this._save();
    this._notify();
  }

  toggleFavorite(id) {
    const favs = this._state.favorites.filter(f => f !== id);
    if (favs.length === this._state.favorites.length) {
      favs.unshift(id);  // newly added → front
    }
    this.update({ favorites: favs });
  }

  subscribe(fn) {
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  }

  _notify() {
    const snap = this.get();
    for (const fn of this._subs) fn(snap);
  }
}
```

- [ ] **Step 5: Run tests — expect pass**

Run: `npm test`
Expected: all 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add tests/state.test.js vitest.config.js src/state.js package-lock.json
git commit -m "feat: add State module with localStorage persistence"
```

---

## Task 4: SleepTimer module — write tests first

**Files:**
- Create: `~/Projects/whitenoise/tests/sleep-timer.test.js`

- [ ] **Step 1: Write failing tests in `tests/sleep-timer.test.js`**

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SleepTimer } from '../src/sleep-timer.js';

describe('SleepTimer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('schedules fadeOut at (durationMin*60 - 30) seconds and stop at duration', () => {
    const onFadeOut = vi.fn();
    const onStop = vi.fn();
    const t = new SleepTimer({ onFadeOut, onStop });

    t.start(45);  // 45 min
    expect(onFadeOut).not.toHaveBeenCalled();

    vi.advanceTimersByTime((45 * 60 - 30) * 1000 - 1);
    expect(onFadeOut).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onFadeOut).toHaveBeenCalledWith(30000);
    expect(onStop).not.toHaveBeenCalled();

    vi.advanceTimersByTime(30 * 1000);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('cancels both callbacks on cancel()', () => {
    const onFadeOut = vi.fn();
    const onStop = vi.fn();
    const t = new SleepTimer({ onFadeOut, onStop });

    t.start(15);
    vi.advanceTimersByTime(5 * 1000);
    t.cancel();
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(onFadeOut).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
  });

  it('starting a new timer cancels the previous one', () => {
    const onStop = vi.fn();
    const t = new SleepTimer({ onFadeOut: () => {}, onStop });

    t.start(15);
    vi.advanceTimersByTime(5 * 1000);
    t.start(30);
    vi.advanceTimersByTime(15 * 60 * 1000);  // would have fired old timer
    expect(onStop).not.toHaveBeenCalled();

    vi.advanceTimersByTime(15 * 60 * 1000);  // 30 min total elapsed
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('start(0) means infinity — never fires callbacks', () => {
    const onFadeOut = vi.fn();
    const onStop = vi.fn();
    const t = new SleepTimer({ onFadeOut, onStop });

    t.start(0);
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(onFadeOut).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
  });

  it('remainingMs returns time until stop', () => {
    const t = new SleepTimer({ onFadeOut: () => {}, onStop: () => {} });
    t.start(45);
    expect(t.remainingMs()).toBe(45 * 60 * 1000);
    vi.advanceTimersByTime(60 * 1000);
    expect(t.remainingMs()).toBe(44 * 60 * 1000);
  });

  it('remainingMs returns 0 when not running', () => {
    const t = new SleepTimer({ onFadeOut: () => {}, onStop: () => {} });
    expect(t.remainingMs()).toBe(0);
  });

  it('remainingMs returns Infinity for ∞ mode', () => {
    const t = new SleepTimer({ onFadeOut: () => {}, onStop: () => {} });
    t.start(0);
    expect(t.remainingMs()).toBe(Infinity);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test`
Expected: tests fail with "Cannot find module '../src/sleep-timer.js'"

- [ ] **Step 3: Implement `src/sleep-timer.js`**

```js
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
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test`
Expected: all tests in both files pass.

- [ ] **Step 5: Commit**

```bash
git add tests/sleep-timer.test.js src/sleep-timer.js
git commit -m "feat: add SleepTimer module with fade-out scheduling"
```

---

## Task 5: AudioEngine module

**Files:**
- Create: `~/Projects/whitenoise/src/audio-engine.js`

This module is hard to unit-test (Web Audio is hard to mock meaningfully). We'll write it carefully and validate via manual loop-test page in Task 11.

- [ ] **Step 1: Implement `src/audio-engine.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/audio-engine.js
git commit -m "feat: add AudioEngine with seamless looping and fades"
```

---

## Task 6: MediaSession module

**Files:**
- Create: `~/Projects/whitenoise/src/media-session.js`

- [ ] **Step 1: Implement `src/media-session.js`**

```js
// Wires up navigator.mediaSession for OS lock-screen controls.
// Safe no-op if the browser doesn't support it.

export class MediaSessionBinding {
  constructor({ onPlay, onPause }) {
    this._onPlay = onPlay;
    this._onPause = onPause;
    this._supported = 'mediaSession' in navigator;
    if (!this._supported) return;

    navigator.mediaSession.setActionHandler('play', () => this._onPlay());
    navigator.mediaSession.setActionHandler('pause', () => this._onPause());
  }

  setNowPlaying(track) {
    if (!this._supported) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.label,
      artist: 'Tonight',
      album: 'Sleep sounds',
    });
    navigator.mediaSession.playbackState = 'playing';
  }

  setPaused() {
    if (!this._supported) return;
    navigator.mediaSession.playbackState = 'paused';
  }

  clear() {
    if (!this._supported) return;
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/media-session.js
git commit -m "feat: add MediaSession bindings for lock-screen controls"
```

---

## Task 7: UI module — markup + initial render

**Files:**
- Create: `~/Projects/whitenoise/src/ui.js`

This task creates the UI module and the rendering of the static parts (timer chips, sounds grid, mini-player skeleton). Wiring to other modules happens in Task 9.

- [ ] **Step 1: Implement `src/ui.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/ui.js
git commit -m "feat: add UI module with picker, favorites, and mini-player"
```

---

## Task 8: Add UI styles

**Files:**
- Modify: `~/Projects/whitenoise/styles.css`

- [ ] **Step 1: Append the layout, chip, tile, and mini-player styles**

Append to `styles.css`:

```css
.hdr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.title {
  font-size: 18px;
  font-weight: 300;
}

.label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin: 18px 0 8px;
}

.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.chip {
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--text);
  border: 0;
  font-size: 13px;
  cursor: pointer;
}

.chip.active {
  background: var(--accent);
  color: #fff;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.tile {
  aspect-ratio: 1 / 1;
  border-radius: var(--radius);
  border: 2px solid transparent;
  color: var(--text);
  font-size: 12px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 8px;
  cursor: pointer;
  position: relative;
  text-align: left;
}

.tile.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.tile-label {
  pointer-events: none;
}

.tile-fav {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 11px;
  color: var(--accent);
}

.miniplayer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--surface-2);
  border-top: 1px solid var(--border);
  padding: 12px 18px calc(12px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 480px;
  margin: 0 auto;
}

.mp-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  border: 0;
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
}

.mp-info {
  flex: 1;
  min-width: 0;
}

.mp-title {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mp-sub {
  font-size: 11px;
  color: var(--text-dim);
}

.mp-timer {
  background: transparent;
  color: var(--text-dim);
  border: 0;
  font-size: 13px;
  cursor: pointer;
}

.mp-volume {
  width: 90px;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add styles.css
git commit -m "feat: add styles for chips, tiles, and mini-player"
```

---

## Task 9: Wire everything together in `main.js`

**Files:**
- Modify: `~/Projects/whitenoise/src/main.js`

- [ ] **Step 1: Replace `src/main.js`**

```js
import { LIBRARY, trackById } from './library.js';
import { State } from './state.js';
import { AudioEngine } from './audio-engine.js';
import { SleepTimer } from './sleep-timer.js';
import { MediaSessionBinding } from './media-session.js';
import { UI } from './ui.js';

const state = new State();
const engine = new AudioEngine();
let timerEndsAt = 0;
let ui;

const timer = new SleepTimer({
  onFadeOut: (ms) => engine.fadeOut(ms),
  onStop: () => stopPlayback(),
});

const media = new MediaSessionBinding({
  onPlay: () => playLast(),
  onPause: () => pausePlayback(),
});

async function startPlayback(trackId) {
  const track = trackById(trackId);
  if (!track) return;
  await engine.play(track);
  const presetMin = state.get().lastTimer;
  timer.start(presetMin);
  timerEndsAt = presetMin === 0 ? Infinity : Date.now() + presetMin * 60_000;
  state.update({ lastTrackId: trackId });
  media.setNowPlaying(track);
  ui.showMiniPlayer(track, timerEndsAt);
}

function pausePlayback() {
  engine.pause();
  timer.cancel();
  media.setPaused();
  ui.setMiniPlayerPaused();
}

function stopPlayback() {
  engine.stop();
  timer.cancel();
  media.clear();
  ui.hideMiniPlayer();
}

function playLast() {
  const id = state.get().lastTrackId;
  if (id) startPlayback(id);
}

ui = new UI({
  root: document.getElementById('app'),
  state,
  onPlay: (id) => startPlayback(id),
  onPause: () => pausePlayback(),
  onSelectTimer: (preset) => state.update({ lastTimer: preset }),
  onToggleFavorite: (id) => state.toggleFavorite(id),
  onSetVolume: (v) => { engine.setVolume(v); state.update({ volume: v }); },
  onMiniPlayerTimerTap: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
});

// Apply initial volume from saved state
engine.setVolume(state.get().volume);

// Register service worker for offline use
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}
```

- [ ] **Step 2: Manual smoke test**

```bash
cd ~/Projects/whitenoise && bash tools/serve.sh &
sleep 1 && open http://localhost:8000/
```

Expected: page loads with title "Tonight", 6 timer chips, 13 sound tiles, no mini-player visible. Clicking a tile errors in console because no audio files exist yet — that's expected.

Stop server: `kill %1`

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: wire State, AudioEngine, SleepTimer, MediaSession, and UI in main"
```

---

## Task 10: PWA manifest + service worker

**Files:**
- Create: `~/Projects/whitenoise/manifest.json`
- Create: `~/Projects/whitenoise/service-worker.js`
- Create: `~/Projects/whitenoise/icons/icon-192.png` (placeholder, see step 3)
- Create: `~/Projects/whitenoise/icons/icon-512.png` (placeholder)

- [ ] **Step 1: Write `manifest.json`**

```json
{
  "name": "Tonight",
  "short_name": "Tonight",
  "description": "Ambient sounds for sleep",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0d1117",
  "theme_color": "#0d1117",
  "orientation": "portrait",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Write `service-worker.js`**

```js
const CACHE = 'whitenoise-v1';

const SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/src/main.js',
  '/src/library.js',
  '/src/state.js',
  '/src/audio-engine.js',
  '/src/sleep-timer.js',
  '/src/media-session.js',
  '/src/ui.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const TRACK_IDS = [
  'rain-light', 'rain-heavy', 'thunder', 'ocean', 'forest', 'mountain-breeze',
  'river', 'fireplace', 'crickets', 'brown-noise', 'pink-noise', 'white-noise', 'fan',
];
const AUDIO = TRACK_IDS.map(id => `/audio/${id}.m4a`);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    // Audio is cached lazily on first fetch — large files block install otherwise.
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res.ok && (AUDIO.includes(new URL(req.url).pathname) || SHELL.includes(new URL(req.url).pathname))) {
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      // Offline + uncached — let the browser show its error
      throw e;
    }
  })());
});
```

- [ ] **Step 3: Generate placeholder icons**

We need *something* at the icon paths. Create solid-color PNGs from the command line:

```bash
cd ~/Projects/whitenoise
python3 -c "
import struct, zlib
def png(w, h, color):
    sig = b'\\x89PNG\\r\\n\\x1a\\n'
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d))
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    raw = b''
    for _ in range(h):
        raw += b'\\x00' + bytes(color) * w
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend
open('icons/icon-192.png','wb').write(png(192, 192, (13, 17, 23)))
open('icons/icon-512.png','wb').write(png(512, 512, (13, 17, 23)))
"
```

These are dark-grey placeholder PNGs. Replace with branded icons before public launch.

- [ ] **Step 4: Verify SW registers**

```bash
bash tools/serve.sh &
sleep 1 && open http://localhost:8000/
```

In DevTools → Application → Service Workers, the worker should be activated within 1 second. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add manifest.json service-worker.js icons/
git commit -m "feat: add PWA manifest, service worker, and icon placeholders"
```

---

## Task 11: Loop seam verification tool

**Files:**
- Create: `~/Projects/whitenoise/tools/loop-test.html`

This is a manual test harness used when audio files are added. Plays each track for 3 loop iterations back-to-back so you can hear seams.

- [ ] **Step 1: Write `tools/loop-test.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Loop Seam Test</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; padding: 20px; background: #0d1117; color: #e6edf3; }
  button { display: block; margin: 8px 0; padding: 10px 16px; background: #1a2332; color: inherit; border: 0; cursor: pointer; }
  button.playing { background: #5a8dff; }
</style>
</head>
<body>
<h1>Loop seam verification</h1>
<p>Each button plays the track 3× back-to-back via Web Audio (loop=true). Listen for clicks/gaps at loop points.</p>
<div id="list"></div>
<script type="module">
import { LIBRARY } from '../src/library.js';

let ctx, current = null;

async function play(track, btn) {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (current) { current.stop(); current.disconnect(); }
  document.querySelectorAll('button').forEach(b => b.classList.remove('playing'));
  btn.classList.add('playing');

  const res = await fetch('../' + track.file);
  const buf = await ctx.decodeAudioData(await res.arrayBuffer());
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(ctx.destination);
  src.start();
  // Stop after 3 loop durations
  src.stop(ctx.currentTime + buf.duration * 3);
  current = src;
}

const list = document.getElementById('list');
for (const t of LIBRARY) {
  const b = document.createElement('button');
  b.textContent = t.label + '  (' + t.file + ')';
  b.addEventListener('click', () => play(t, b));
  list.appendChild(b);
}
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add tools/loop-test.html
git commit -m "feat: add manual loop seam verification tool"
```

---

## Task 12: Audio licensing scaffolding

**Files:**
- Create: `~/Projects/whitenoise/audio/LICENSES.md`
- Create: `~/Projects/whitenoise/audio/.gitkeep`

Audio files themselves are out of scope for this plan (they require sound editing). This task creates the directory structure and licensing template so the engineer doesn't forget.

- [ ] **Step 1: Write `audio/LICENSES.md`**

```markdown
# Audio attributions

Each track in this directory must be listed below with its source and license.
Do not ship the app without this file fully populated.

| File | Source | License | Notes |
|---|---|---|---|
| rain-light.m4a | TBD | TBD | seamless loop, ~30s |
| rain-heavy.m4a | TBD | TBD | seamless loop, ~30s |
| thunder.m4a | TBD | TBD | seamless loop, ~30s |
| ocean.m4a | TBD | TBD | seamless loop, ~30s |
| forest.m4a | TBD | TBD | seamless loop, ~30s |
| mountain-breeze.m4a | TBD | TBD | seamless loop, ~30s |
| river.m4a | TBD | TBD | seamless loop, ~30s |
| fireplace.m4a | TBD | TBD | seamless loop, ~30s |
| crickets.m4a | TBD | TBD | seamless loop, ~30s |
| brown-noise.m4a | TBD | TBD | seamless loop, ~30s |
| pink-noise.m4a | TBD | TBD | seamless loop, ~30s |
| white-noise.m4a | TBD | TBD | seamless loop, ~30s |
| fan.m4a | TBD | TBD | seamless loop, ~30s |
```

- [ ] **Step 2: Add `.gitkeep`**

```bash
touch ~/Projects/whitenoise/audio/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add audio/LICENSES.md audio/.gitkeep
git commit -m "feat: add audio license tracking scaffold"
```

---

## Task 13: PWA install hint (one-time)

**Files:**
- Modify: `~/Projects/whitenoise/src/ui.js`
- Modify: `~/Projects/whitenoise/styles.css`

- [ ] **Step 1: Add hint markup at the top of UI render**

In `src/ui.js`, modify the `_render()` method. After `this._root.innerHTML = ` template, find the line `<header class="hdr">` and replace the entire template literal with this updated version (the only change is adding the install-hint section before `<header>`):

```js
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
```

Then at the end of `_render()`, after `this._wireMiniPlayer();`, add:

```js
this._wireInstallHint();
```

And add this new method to the `UI` class:

```js
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
```

- [ ] **Step 2: Add styles for the install hint**

Append to `styles.css`:

```css
.install-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  padding: 10px 14px;
  font-size: 12px;
  margin-bottom: 12px;
}

.install-hint button {
  background: transparent;
  color: var(--text-dim);
  border: 0;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui.js styles.css
git commit -m "feat: add one-time iOS install hint"
```

---

## Task 14: Final verification

**Files:** none

- [ ] **Step 1: Run all tests**

```bash
cd ~/Projects/whitenoise && npm test
```

Expected: all tests pass (State + SleepTimer suites).

- [ ] **Step 2: Manual smoke test in Chrome**

```bash
bash tools/serve.sh &
sleep 1 && open http://localhost:8000/
```

Verify:
- Page renders with timer chips, all 13 sound tiles, no mini-player
- Tapping a chip highlights it and persists across reload
- Long-pressing a tile (~500ms) toggles favorite and shows ♥
- Favorites section appears above All sounds when ≥1 favorite
- DevTools → Application → Service Workers shows worker active
- DevTools → Application → Manifest shows the PWA manifest correctly

(Note: tapping a tile to play won't work without audio files — that's expected. Use `tools/loop-test.html` once tracks are added.)

Kill the server: `kill %1`

- [ ] **Step 3: Confirm offline behavior**

In Chrome DevTools → Application → Service Workers, check "Offline", reload the page. The shell should still load.

- [ ] **Step 4: Final commit if anything was tweaked**

```bash
git status
# If clean, no commit needed.
```

---

## Self-review notes

**Spec coverage:**
- ✅ 13 curated tracks → Task 2 (library.js)
- ✅ Sleep timer presets 15/30/45/60/90/∞ → Task 4 (SleepTimer) + Task 7 (UI chips)
- ✅ 30s fade-out → Task 4 (SleepTimer.start)
- ✅ Auto-resume last track + last timer → Task 3 (State defaults) + Task 7 (UI active styling)
- ✅ 3-column tile grid with gradients → Task 8 (CSS)
- ✅ Long-press to toggle favorite → Task 7 (`_wireLongPress`)
- ✅ Favorites row above All sounds → Task 7 (`_renderFavorites`)
- ✅ Mini-player with pause/title/sub/timer/volume → Task 7 + Task 8
- ✅ Volume slider in mini-player → Task 7 + Task 9 wiring
- ✅ MediaSession lock-screen controls → Task 6
- ✅ PWA manifest + service worker offline cache → Task 10
- ✅ One-time iOS install hint → Task 13
- ✅ Audio license tracking → Task 12
- ✅ Loop-seam verification → Task 11
- ✅ Dark-only theme → Task 1 (CSS variables)
- ⚠️ Audio files themselves are *not* in the plan — they require sound editing outside the engineer's scope. Task 12 creates the directory and license template; the engineer is expected to drop in 13 .m4a files separately.

**Type / signature consistency check:**
- `State.get()`, `State.update()`, `State.toggleFavorite()`, `State.subscribe()` — used consistently in Task 3, 7, 9.
- `SleepTimer.start(min)`, `.cancel()`, `.remainingMs()` — consistent across Tasks 4, 9.
- `AudioEngine.play(track, fadeInMs)`, `.pause()`, `.stop()`, `.fadeOut(ms)`, `.setVolume(v)` — consistent across Tasks 5, 9.
- `UI` constructor takes `{ root, state, onPlay, onPause, onSelectTimer, onToggleFavorite, onSetVolume, onMiniPlayerTimerTap }` — matches main.js wiring in Task 9.
- `MediaSessionBinding` constructor takes `{ onPlay, onPause }` — matches main.js wiring in Task 9.

No placeholders remain. Each step has the actual code.
