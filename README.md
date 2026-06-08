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

13 tracks total. **3 are already in repo** (brown / pink / white noise — generated locally by `tools/gen-noise.sh`).

For the **10 nature tracks** (rain, ocean, forest, etc.), the easiest path is YouTube:

1. Open `audio/SOURCES.md` and fill in a YouTube URL per track. Suggested searches included.
2. Run:
   ```bash
   bash tools/import-from-youtube.sh
   ```
   The script downloads, trims a 5-min segment (skipping the first 60s by default), and transcodes to mono AAC at 128 kbps. ~30 seconds per track.
3. Verify the loops sound clean by playing them in the browser:
   ```bash
   npm run serve
   open http://localhost:8000/tools/loop-test.html
   ```

> **License caveat:** YouTube audio is almost always copyrighted. The importer marks `audio/LICENSES.md` entries as `TBD`. Resolve licensing (CC-licensed videos, paid library, or own recording) before public release.

To **regenerate the noise tracks** (or change their duration):

```bash
bash tools/gen-noise.sh
```

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
