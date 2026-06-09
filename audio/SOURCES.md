# Audio sources — YouTube URLs per track

Edit this file with the YouTube URLs you want to use, one per track. Then run `bash tools/import-from-youtube.sh` to download, transcode, and trim them all in one go.

**Tip:** for nature ambient, search YouTube for `"<sound> 10 hours seamless loop"` or `"<sound> ambient 1 hour"` — there are thousands of options. Pick a video with no voiceover, no music intro, ideally from a channel that posts pure ambience (e.g. Relaxing White Noise, Nature Soundscapes).

The script downloads the audio, transcodes to mono AAC at 128 kbps, and trims a **5-minute segment starting at 60 seconds in** (skipping any cold-open / fade-in). You can override the start time per track by adding `@<seconds>` to the URL.

| Track | YouTube URL | Notes |
|---|---|---|
| `rain-light` | https://www.youtube.com/watch?v=dR_3g5WCdHs@180 | Soothing Gentle Rain in the Old Park, 10h |
| `rain-heavy` | https://www.youtube.com/watch?v=nIE9GnWuiZ8@180 | Heavy Rain No Thunder, 10h |
| `thunder` | https://www.youtube.com/watch?v=ekXFslHOvZ8@180 | 10 Hours Rain & Thunder |
| `ocean` | https://www.youtube.com/watch?v=bn9F19Hi1Lk@180 | High Quality Stereo Ocean Waves, 11h |
| `forest` | https://www.youtube.com/watch?v=2G8LAiHSCAs@180 | Forest Birdsong Nature Sounds, 8h |
| `mountain-breeze` | https://www.youtube.com/watch?v=iO-mUnSjMKM@180 | Gentle wind in the mountains, 4h |
| `river` | https://www.youtube.com/watch?v=UJZxtO9XNno@180 | Gentle Stream Sounds, 12h |
| `fireplace` | https://www.youtube.com/watch?v=7mnewZMHrsg@180 | 10 Hours Relaxing Fireplace, NO MUSIC |
| `crickets` | https://www.youtube.com/watch?v=g1w3IT5WnYw@180 | Night Ambient Sounds, Cricket, 10h |
| `fan` | https://www.youtube.com/watch?v=px1PqCX6i8c@180 | Box Fan White Noise, 10h |

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
