# whitenoise

A single-page web app that plays curated ambient sounds for falling asleep.

**Live:** https://whitenoise-d5j.pages.dev
**Repo:** https://github.com/bluemapleman/whitenoise

## Status

Code complete. Audio files not yet added — tiles 404 until you drop them in `audio/`.

## Develop locally

```bash
npm install
npm run serve     # http://localhost:8000
npm test          # 14 unit tests
```

## Add audio

1. Put 13 files in `audio/` named exactly: `rain-light.m4a`, `rain-heavy.m4a`, `thunder.m4a`, `ocean.m4a`, `forest.m4a`, `mountain-breeze.m4a`, `river.m4a`, `fireplace.m4a`, `crickets.m4a`, `brown-noise.m4a`, `pink-noise.m4a`, `white-noise.m4a`, `fan.m4a`.
2. Each must be a seamless loop (zero-crossings at start/end). Verify in the browser:
   ```bash
   npm run serve
   open http://localhost:8000/tools/loop-test.html
   ```
3. Fill in `audio/LICENSES.md` (per-track source + license).

## Deploy

```bash
bash tools/deploy.sh
```

The script commits, pushes to GitHub, and redeploys to Cloudflare Pages. Same URL stays live.

**First-time setup** (once per machine):

```bash
brew install gh && gh auth login
npm install -g wrangler && wrangler login
```

## Layout

```
src/         runtime modules (library, state, audio-engine, sleep-timer, ui, main)
audio/       drop .m4a files here
tools/       deploy.sh, serve.sh, loop-test.html
tests/       vitest unit tests
docs/        spec + implementation plan
```

## To-do

**Before tiles play:** add 13 audio files (see above), fill in `audio/LICENSES.md`.

**Before public ship:** real PWA icons (currently solid-color placeholders), iPhone test (iOS 17/18), 4-hour desktop test.

**Backlog:** native iOS app, mixing multiple sounds, custom volume per track, light theme, i18n. All explicitly out of v1 scope.

## Known limitation

iOS Safari pauses audio when the screen locks. `MediaSession` is wired to maximize lock-screen survival, but reliable background playback is why a native iOS app sits in the backlog.
