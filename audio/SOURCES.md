# Audio sources — YouTube URLs per track

Edit this file with the YouTube URLs you want to use, one per track. Then run `bash tools/import-from-youtube.sh` to download, transcode, and trim them all in one go.

**Tip:** for nature ambient, search YouTube for `"<sound> 10 hours seamless loop"` or `"<sound> ambient 1 hour"` — there are thousands of options. Pick a video with no voiceover, no music intro, ideally from a channel that posts pure ambience (e.g. Relaxing White Noise, Nature Soundscapes).

The script downloads the audio, transcodes to mono AAC at 128 kbps, and trims a **5-minute segment starting at 60 seconds in** (skipping any cold-open / fade-in). You can override the start time per track by adding `@<seconds>` to the URL.

| Track | YouTube URL | Notes |
|---|---|---|
| `rain-light` |  | example: `https://www.youtube.com/watch?v=ABC@90` (skips first 90s) |
| `rain-heavy` |  |  |
| `thunder` |  |  |
| `ocean` |  |  |
| `forest` |  |  |
| `mountain-breeze` |  |  |
| `river` |  |  |
| `fireplace` |  |  |
| `crickets` |  |  |
| `fan` |  |  |

## Suggested searches

- **rain-light:** `gentle rain ambient seamless`
- **rain-heavy:** `heavy rain no thunder 10 hours`
- **thunder:** `thunderstorm rain ambience sleep`
- **ocean:** `ocean waves seamless loop sleep`
- **forest:** `forest birds morning ambience`
- **mountain-breeze:** `mountain wind trees ambient`
- **river:** `flowing stream sleep no music`
- **fireplace:** `crackling fireplace ASMR no music`
- **crickets:** `night crickets summer countryside`
- **fan:** `box fan white noise hum 10 hours`
