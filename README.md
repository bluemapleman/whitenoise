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

## Deploy

The app is deployed to **Cloudflare Pages** — free tier, global CDN, automatic HTTPS, no bandwidth limits. `tools/deploy.sh` is the single entry point: first run does the full setup, subsequent runs just push + redeploy.

### First-time setup (one-time, ~10 minutes)

You only do this once per machine.

**1. Install the two CLI tools:**

```bash
brew install gh                    # GitHub CLI
npm install -g wrangler            # Cloudflare CLI
```

**2. Authenticate both:**

```bash
gh auth login                      # opens browser → GitHub OAuth
wrangler login                     # opens browser → Cloudflare OAuth
```

You need a (free) GitHub account and a (free) Cloudflare account. If you don't have a Cloudflare account yet, sign up at https://dash.cloudflare.com/sign-up — credit card not required.

**3. First deploy:**

```bash
bash tools/deploy.sh
```

The script will:
- Verify both CLIs are installed and authenticated.
- Warn if you have fewer than 13 audio files in `audio/` (deploy continues if you confirm).
- Prompt to commit any pending changes.
- Create a GitHub repo (asks public/private, default `private`) and push.
- Deploy to a fresh Cloudflare Pages project named `whitenoise`.
- Print the live URL (e.g. `https://whitenoise.pages.dev`).

The first deploy takes ~30 seconds. Cloudflare propagates globally within a minute.

### Ongoing deploys

Once setup is done, every deploy is one command:

```bash
bash tools/deploy.sh
```

It will:
- Prompt to commit any pending changes (with a message you provide).
- Push to GitHub.
- Re-deploy to Cloudflare Pages.

The live URL stays the same (`https://whitenoise.pages.dev`) — Cloudflare swaps content in place. Users on the site at deploy time will see the update on their next page load.

### What the script ships (and doesn't)

The deploy bundle excludes spec, plan, tests, dev tooling, and `node_modules/`:

| Included | Excluded |
|---|---|
| `index.html`, `styles.css` | `package.json`, `vitest.config.js` |
| `src/*.js` (runtime modules) | `tests/`, `tools/` |
| `manifest.json`, `service-worker.js` | `docs/` (spec + plan stay private) |
| `icons/` | `node_modules/` |
| `audio/*.m4a` | `README.md`, `.gitignore` |

This keeps the public deploy lean and avoids leaking design docs to crawlers.

### Custom domain (optional)

A real domain like `tonight.app` is more memorable than `whitenoise.pages.dev`. Setup:

1. Buy a domain (Cloudflare Registrar is at-cost, ~$10/year for `.app` or `.com`).
2. Cloudflare dashboard → Workers & Pages → `whitenoise` → Custom domains → Add custom domain → enter your domain.
3. Cloudflare auto-configures DNS if you bought via Cloudflare Registrar; otherwise you point your registrar's nameservers at Cloudflare.
4. HTTPS provisions automatically within minutes.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `gh: command not found` | gh not installed | `brew install gh` |
| `wrangler: command not found` | wrangler not on PATH | `npm install -g wrangler`; check `npm bin -g` is on `$PATH` |
| `gh auth status` reports not authenticated | Token expired or revoked | `gh auth login` again |
| Wrangler asks for account selection on every deploy | Multiple Cloudflare accounts on the token | `wrangler login` and pick one, or set `CLOUDFLARE_ACCOUNT_ID` |
| Tiles 404 on the live site | No audio files yet | Add `.m4a` files to `audio/` and redeploy |
| Service worker serves stale assets after deploy | Browser cached old SW | Bump `CACHE = 'whitenoise-v1'` to `v2` in `service-worker.js`; existing users update on next visit |
| Deploy fails with "project not found" | Pages project name collision | Edit `PAGES_PROJECT` in `tools/deploy.sh`, or delete the conflicting project in the Cloudflare dashboard |

### Cost expectations

Cloudflare Pages free tier covers your use case at any realistic traffic level:

- **Bandwidth:** unlimited (genuinely — no cap on the free plan)
- **Builds:** 500/month (you'll never hit this for a static site)
- **Custom domains:** unlimited
- **HTTPS:** free, automatic

The only ongoing cost is a custom domain if you want one ($10/year). Everything else stays $0.

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
