# whitenoise

A single-page web app that plays curated ambient sounds for falling asleep. Vanilla JS, Web Audio API, PWA-installable, works offline after first load.

## Status

Code complete — 14/14 unit tests passing. **Audio files not yet shipped.** The app loads, renders, and is fully wired; tapping a tile will fail until `.m4a` files are dropped into `audio/`.

## Develop

```bash
npm install
npm run serve   # http://localhost:8000
```

## Test

```bash
npm test
```

## Project layout

```
whitenoise/
├── index.html              # Single page mount point
├── styles.css              # Dark theme + layout
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline cache (shell precache + lazy audio)
├── icons/                  # PWA icons (placeholder solid-color PNGs)
├── audio/                  # Drop 13 .m4a files here (see LICENSES.md)
├── src/
│   ├── library.js          # Static track metadata
│   ├── state.js            # localStorage-backed state + pub/sub
│   ├── sleep-timer.js      # Pure timer with fade-out scheduling
│   ├── audio-engine.js     # Web Audio: load, loop, fade, volume
│   ├── media-session.js    # OS lock-screen controls
│   ├── ui.js               # DOM rendering + event wiring
│   └── main.js             # Wires the modules together
├── tests/                  # Vitest unit tests (state, sleep-timer)
├── tools/
│   ├── serve.sh            # Local dev server
│   └── loop-test.html      # Manual loop-seam verification page
└── docs/superpowers/
    ├── specs/              # Design spec
    └── plans/              # Implementation plan
```

---

## To-do (priority order)

### P0 — required before the app actually works

- [ ] **Acquire & edit 13 audio loops** (`audio/<id>.m4a`). Each must be hand-edited to zero-crossings at start and end so `<AudioBufferSourceNode loop>` doesn't click. Budget ~2 hr / track. Required tracks are listed in `audio/LICENSES.md`.
- [ ] **Fill in `audio/LICENSES.md`** with source + license per track. Do not ship without this.
- [ ] **Verify each track loops cleanly** using `tools/loop-test.html` (open `http://localhost:8000/tools/loop-test.html` after `npm run serve`).

### P1 — required before public ship

- [ ] **Replace placeholder icons** at `icons/icon-192.png` and `icons/icon-512.png` (currently solid `#0d1117` PNGs). Need real branded artwork.
- [ ] **Manual test on iPhone (iOS 17 + 18)** — background audio, lock-screen MediaSession, autoplay unlock, install-to-home-screen flow. The spec calls this out as the gating test before launch.
- [ ] **Manual long-running test on Chrome desktop** — 4+ hour playback session, watch for memory growth in DevTools.
- [ ] **Set up hosting** — Cloudflare Pages free tier is the recommended path. Drop the directory, get an HTTPS URL. PWA + service worker work out of the box.
- [ ] **Push to a remote** (`gh repo create whitenoise --private --source=. --push` or equivalent). Currently no remote configured.

### P2 — nice to have

- [ ] **Test-only Web Audio coverage** — add unit tests for `AudioEngine` using a Web Audio mock (verifying that gain anchoring, source teardown, and fade scheduling all behave correctly). Currently only `state` and `sleep-timer` are unit-tested; audio + UI are validated manually.
- [ ] **iOS Safari < 14.5 compatibility** — wrap `decodeAudioData` in the callback-style Promise wrapper for older iOS users (only matters if the audience includes pre-2021 iPhones).
- [ ] **In-app install hint screenshot** — the iOS install hint currently shows text only. A small screenshot showing the Share menu would help users find the option.
- [ ] **Service worker cache versioning** — bumping `CACHE = 'whitenoise-v1'` to `v2` invalidates old caches on next deploy. Establish a process for this.

### P3 — backlog (post-launch validation gates)

- [ ] **Native iOS app** — only after web validation shows real demand, *and* lock-screen background-audio limitations on iOS Safari are blocking real users. Spec defers this explicitly.
- [ ] **Mixing multiple sounds simultaneously** (would change the picker UX).
- [ ] **Per-track custom volume** (long-press menu).
- [ ] **Custom timer durations** (slider/wheel beyond the 6 chips).
- [ ] **User accounts / cloud sync.**
- [ ] **Light theme.**
- [ ] **Internationalization.**

### Known constraints (won't fix)

- iOS Safari pauses audio when the screen locks or the tab is backgrounded. `MediaSession` is wired up to maximize lock-screen survival, but reliable background playback is the reason a native iOS app exists in the P3 backlog. The in-app hint reminds users to keep the screen on or use Guided Access.

---

## Architecture references

- Spec: `docs/superpowers/specs/2026-06-08-whitenoise-webapp-design.md`
- Plan: `docs/superpowers/plans/2026-06-08-whitenoise-webapp.md`

Both are committed to the repo and authoritative.
