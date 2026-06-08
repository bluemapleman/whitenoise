# White-Noise Web App — Design Spec

**Date:** 2026-06-08
**Status:** Approved by user, ready for implementation planning
**Project root:** `~/Projects/whitenoise/`

## Goal

A single-page web app that plays curated ambient/white-noise tracks for falling asleep. Optimized for one-handed, dim-screen use at bedtime. PWA-installable on iPhone. Works offline after first load.

## Primary use case

**Falling asleep.** All other use cases (focus, breaks) are out of scope for v1. This decision drives every UX choice: minimal taps, dim-friendly UI, sleep-timer as a first-class feature, no animations or distractions.

## Non-goals (v1)

- Mixing multiple tracks simultaneously
- User-uploaded audio
- Cloud sync / accounts
- Subscription / payment
- Native iOS app (planned as a follow-on if web validation succeeds)
- Light theme
- Multi-language

## Functional requirements

### Sound library

13 curated tracks shipped in v1:

| ID | Label |
|---|---|
| `rain-light` | Rain (light) |
| `rain-heavy` | Rain (heavy) |
| `thunder` | Thunderstorm |
| `ocean` | Ocean waves |
| `forest` | Forest |
| `mountain-breeze` | Mountain breeze |
| `river` | River / stream |
| `fireplace` | Fireplace |
| `crickets` | Night crickets |
| `brown-noise` | Brown noise |
| `pink-noise` | Pink noise |
| `white-noise` | White noise |
| `fan` | Fan / AC hum |

All tracks are seamless-looping AAC (`.m4a`) files, hand-edited to zero-crossings at start/end. Brown/pink/white noise are recorded/edited audio files (not programmatically generated) for consistency with nature tracks.

### Sleep timer

- Preset chips: **15 / 30 / 45 / 60 / 90 / ∞** minutes
- Last-used preset is remembered and pre-selected on next open
- During the **last 30 seconds** of the timer, audio fades from current volume → 0 (linear ramp)
- At expiry, playback stops cleanly; mini-player shows "stopped" state
- ∞ mode: no auto-stop, no fade-out

### Picker

- 3-column tile grid, all 13 tracks visible without horizontal scroll
- Each tile: a calm dark gradient + the track label (no album art, no photos)
- Tapping a tile starts playback immediately (with 2-second fade-in)
- Active tile is visually highlighted (border + slight glow)

### Favorites

- Long-press a tile (or tap a ♡ icon revealed on long-press) to toggle favorite
- A **Favorites** row appears above the main grid when ≥1 favorite exists
- Order in the favorites row: most-recently-favorited first
- Persisted to `localStorage`

### Now-playing (mini-player)

Sticky bar at the bottom of the screen, always visible. Contains:
- **Pause/play** button
- **Track label** + countdown ("42:18 · ends 11:47")
- **Timer indicator** ("⏱ 45m" — tappable to jump to timer chips)
- **Volume slider** (horizontal, ~100px, on the right side of the bar)

When no track is playing, the mini-player is hidden.

### Auto-resume

On app open:
- Last-played track is *pre-selected* (highlighted) but not auto-playing
- Last-used timer preset is selected
- One tap on the highlighted tile starts playback

### Offline / PWA

- Service worker caches `index.html`, `app.js`, `styles.css`, all icons, and all 13 audio files on first visit
- App works fully offline after first load
- PWA manifest enables "Add to Home Screen" on iOS (full-screen icon launch)
- One-time in-app hint explaining how to install on iOS (Share → Add to Home Screen) — dismissable, never shown again

### Theme

Dark only. Background `#0d1117`, accent `#5a8dff`, surface `#1a2332`. No theme toggle in v1.

## Architecture

Static single-page web app. No backend, no build step.

```
whitenoise/
├── index.html              # Single page, all UI markup
├── app.js                  # All logic (~300 lines)
├── styles.css              # Dark theme, tile gradients, layout
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline caching
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── audio/
    ├── rain-light.m4a
    ├── rain-heavy.m4a
    ├── thunder.m4a
    ├── ocean.m4a
    ├── forest.m4a
    ├── mountain-breeze.m4a
    ├── river.m4a
    ├── fireplace.m4a
    ├── crickets.m4a
    ├── brown-noise.m4a
    ├── pink-noise.m4a
    ├── white-noise.m4a
    └── fan.m4a
```

### Logical modules in `app.js`

| Module | Responsibility | Depends on |
|---|---|---|
| `AudioEngine` | Decode track buffer; schedule seamless loops via `AudioBufferSourceNode` with `loop=true`; control gain via single `GainNode`; expose `play(id)`, `pause()`, `setVolume(v)`, `fadeOut(ms)`, `stop()` | Web Audio API |
| `SleepTimer` | Hold active duration; trigger 30s fade-out before end; stop playback at end; cancel on track change or pause | `AudioEngine` |
| `Library` | Static list of 13 tracks `{id, label, gradient: [from, to], file}` | — |
| `State` | Current track, current timer preset, favorites Set, last-played, volume — persisted to `localStorage` on every change | `localStorage` |
| `UI` | Render timer chips, favorites row, all-sounds grid, mini-player; wire click + long-press handlers; update active states | All of the above |
| `MediaSession` | `navigator.mediaSession.metadata` + `setActionHandler('play'/'pause')` so OS lock-screen controls work | `AudioEngine` |
| `ServiceWorker` | Precache all assets on `install`; serve from cache on `fetch` | — |

### Data flow

```
user taps tile
  → UI.selectTrack(id)
  → AudioEngine.play(id, fadeInMs=2000)
  → SleepTimer.start(presetMin)
  → State.persist({ lastTrackId, lastTimer })
  → MediaSession.update(metadata)

timer expires (presetMin*60 - 30s)
  → AudioEngine.fadeOut(30000)
  → at presetMin: AudioEngine.stop()
  → UI.updateMiniPlayer({ state: 'stopped' })

user adjusts volume slider
  → AudioEngine.setVolume(v)
  → State.persist({ volume: v })
```

### Persistence (`localStorage`, single key `whitenoise.state`)

```js
{
  lastTrackId: "forest",
  lastTimer: 45,            // minutes; 0 means ∞
  favorites: ["forest", "rain-light", "fireplace"],
  volume: 0.7
}
```

### Web Audio specifics

- Single `AudioContext`, created on first user gesture (Safari autoplay rule)
- One `AudioBufferSourceNode` per play, torn down on stop
- One persistent `GainNode` between source and `destination` for volume + fade
- Buffers are loaded lazily on first play of each track and cached in memory for the session
- Fade-in: `gain.linearRampToValueAtTime(volume, ctx.currentTime + 2)`
- Fade-out: `gain.linearRampToValueAtTime(0, ctx.currentTime + 30)`

### Hosting

Cloudflare Pages (free tier). Drop the directory, get an HTTPS URL. PWA manifest + service worker work out of the box.

## Testing strategy

| Test type | What it covers | How |
|---|---|---|
| Manual on real iPhone (iOS 17 + 18) | Background audio, lock-screen MediaSession, autoplay unlock, install-to-home-screen flow | Required before launch |
| Manual on Chrome desktop | 4+ hour stability, tab switching, memory growth | DevTools Performance + Memory panels |
| Unit tests for `SleepTimer` | Fade-out timing, cancellation on track change, ∞ mode | Vitest with mocked `AudioContext` |
| Loop seam verification | Each track loops without click/gap | Standalone HTML test page that loops each track 3× back-to-back |
| Offline | App fully functional with no network after first load | DevTools "Offline" + manual cold load |

## Risks (priority-ordered)

1. **iOS Safari background audio is unreliable** — accepted limitation. Mitigation: implement `MediaSession` correctly to maximize lock-screen survival; document in-app that screen-on or guided-access gives best results.
2. **Loop seam quality** — every track must be edited to perfect zero-crossings. Budget 2 hours/track of editing.
3. **Audio licensing** — use Freesound CC0 / CC-BY tracks or self-record. Verify license per file before shipping. Maintain `audio/LICENSES.md` with per-track attribution.
4. **First-tap audio unlock** — `AudioContext.resume()` must be tied to a user gesture. Test cold-load → immediate tap → playback < 100ms.
5. **PWA install discoverability on iOS** — Safari hides "Add to Home Screen" in the share menu. Show a one-time in-app hint with a screenshot.

## Out-of-scope (revisit post-launch)

- Mixing multiple sounds (would change the picker UX significantly)
- Per-track custom volume
- Custom timer durations (slider/wheel)
- iOS native app (only after web validation shows demand)
- User accounts / cloud sync
- Light theme
- Internationalization
