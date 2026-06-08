# Audio download checklist

10 nature tracks to download from Freesound. All **CC0 (public domain)** — no attribution required, but we'll record it anyway in `LICENSES.md`.

## Steps

1. **Log in** to https://freesound.org/ (free account, ~30 sec to sign up).
2. For each link below: click → "Download" button on the page → save to `~/Downloads/`. Don't worry about the filename — the rename script will handle it.
3. Once all 10 are downloaded, run:
   ```bash
   bash ~/Projects/whitenoise/tools/import-audio.sh
   ```
4. The script will prompt you to map each downloaded file to a track ID, transcode to AAC, and trim to 30s.

## The 10 tracks

| # | Track ID | Candidate | Freesound link |
|---|---|---|---|
| 1 | `rain-light` | Rain from Indoors – Perfect loop (samesamesame) | https://freesound.org/people/samesamesame/sounds/242889/ |
| 2 | `rain-heavy` | Indoor raining loop (Rvgerxini) | https://freesound.org/people/Rvgerxini/sounds/527658/ |
| 3 | `thunder` | Long Rumbling Thunder (billgrip) | https://freesound.org/people/billgrip/sounds/151447/ |
| 4 | `ocean` | oceanwaves-7 (Rmutt) | https://freesound.org/people/Rmutt/sounds/148808/ |
| 5 | `forest` | Forest birds – ambient seamless loop (Magnesus) | https://freesound.org/people/Magnesus/sounds/723913/ |
| 6 | `mountain-breeze` | outdoor winter ambience birds light wind (lwdickens) | https://freesound.org/people/lwdickens/sounds/260633/ |
| 7 | `river` | Gentle Stream Natural Stream Sound (BurghRecords) | https://freesound.org/people/BurghRecords/sounds/446019/ |
| 8 | `fireplace` | Crackling Flames (loop) (NickTayloe) | https://freesound.org/people/NickTayloe/sounds/813328/ |
| 9 | `crickets` | crickets.wav (Sclolex) | https://freesound.org/people/Sclolex/sounds/210540/ |
| 10 | `fan` | hum.wav (Mihacappy) — explicitly "loops perfectly" | https://freesound.org/people/Mihacappy/sounds/855824/ |

## Notes

- Freesound serves `.wav`, `.flac`, `.mp3`, or `.ogg` depending on what was uploaded. The import script transcodes whatever you have to `.m4a` AAC.
- Several candidates explicitly say "loop" or "seamless" in their title or description. The rest will likely need 5-10 min of edit work in Audacity for clickless looping (do this only if you hear a click in the live app — the spec accepts mild seams for v1).
- If a track sounds wrong when you preview it on Freesound, swap it for a different result. The Freesound URLs in the table are recommendations, not requirements.

## After import

- Delete this file (it's tracked in git only as a temporary checklist).
- The `import-audio.sh` script auto-updates `LICENSES.md` with each track's source URL and "CC0" license.
