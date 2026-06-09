# Audio sources — YouTube URLs per track

Edit this file with the YouTube URLs you want to use, one per track. Then run `bash tools/import-from-youtube.sh` to download, transcode, and trim them all in one go.

**Tip:** for nature ambient, search YouTube for `"<sound> 10 hours seamless loop"` or `"<sound> ambient 1 hour"` — there are thousands of options. Pick a video with no voiceover, no music intro, ideally from a channel that posts pure ambience (e.g. Relaxing White Noise, Nature Soundscapes).

The script downloads the audio, transcodes to mono AAC at 128 kbps, and trims a **10-minute segment starting at 60 seconds in** (skipping any cold-open / fade-in). You can override the start time per track by adding `@<seconds>` to the URL.

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
| `cafe` | https://www.youtube.com/watch?v=uU_RxnJOdMQ@180 | ASMR Coffee Shop, 7h, NO MUSIC |
| `train-cabin` | https://www.youtube.com/watch?v=vXCB1zGGFiY@180 | Long Train Ride through Switzerland, 8.5h |
| `library` | https://www.youtube.com/watch?v=tJRf_TH2Je4@180 | Cozy Victorian Library — fireplace + page turning, 10h |
| `waterfall` | https://www.youtube.com/watch?v=WwSFmC5FtX0@180 | Peaceful Waterfall, 10h |
| `blizzard` | https://www.youtube.com/watch?v=9GZsa-hD2uw@180 | Intense Freezing Blizzard at the lake, 10h |
| `dryer` | https://www.youtube.com/watch?v=3FYynRLz6Qk@180 | Clothes Dryer, 9h black screen |
| `airplane` | https://www.youtube.com/watch?v=co7KgV2edvI@180 | Airplane Cabin White Noise, 10h |
| `rainforest` | https://www.youtube.com/watch?v=FUQEecZ0HG0@180 | Tropical Rainforest Ambience, 10h |
| `cave` | https://www.youtube.com/watch?v=OM7MJM0STok@180 | Cozy Rainy Thunder Cave + bonfire, 10h |
| `whale` | https://www.youtube.com/watch?v=nDqP7kcr-sc@180 | 8 Hours Whale Sounds Deep Underwater |
| `meadow` | https://www.youtube.com/watch?v=ipf7ifVSeDU@180 | Relaxing Meadow with Wildflowers, 8h |
| `city-night` | https://www.youtube.com/watch?v=eZcTP-XynnA@180 | NYC Night Sounds — distant traffic, 5.5h |
| `cat-purr` | https://www.youtube.com/watch?v=DF_RF3q6tAU@180 | Cat Purring, 10h, black screen, no music |
| `night-rain-window` | https://www.youtube.com/watch?v=c1XOgrBz6sU@180 | Gentle Rain on Window, 10h, black screen |
| `night-forest` | https://www.youtube.com/watch?v=6hPG4Rk-j_s@180 | Peaceful Owl Forest, 10h, black screen |
| `mountain-stream` | https://www.youtube.com/watch?v=2UxbnP-6ZlM@180 | Forest River, no birds, 10h |
| `night-wind-pines` | https://www.youtube.com/watch?v=ZCHdNAa6jeQ@180 | Wind in Pine Trees, 10h |
| `alpine-meadow` | https://www.youtube.com/watch?v=DQEM7KLGJAU@180 | Alpine Meadow Spring, 10h |
| `bamboo-forest` | https://www.youtube.com/watch?v=mi2Eb3wt74Y@180 | Bamboo Forest Wind, 10h |
| `autumn-forest` | https://www.youtube.com/watch?v=aT66uumZ0Zo@180 | Autumn Leaves Rustling, 10h |
| `forest-rain` | https://www.youtube.com/watch?v=Go4YMAws6BU@180 | Rain on Forest Leaves, 10h |
| `night-owls` | https://www.youtube.com/watch?v=BqAzRJmivqw@180 | Owls + Crickets at Night, 12h |
| `night-pond` | https://www.youtube.com/watch?v=Ji4a75-G6iE@180 | Pond Night — frogs + crickets, 10h |
| `city-rain` | https://www.youtube.com/watch?v=aGFJdCt2d80@180 | Heavy Rain on City Windows + thunder, 10h |
| `subway-station` | https://www.youtube.com/watch?v=ge-hVVWb1rg@180 | Subway Ride White Noise, 10h |
| `harbor-fog` | https://www.youtube.com/watch?v=BN69JE_AK-o@180 | Harbor Foghorns + Ships, 10h |
| `rooftop-night` | https://www.youtube.com/watch?v=hfOLsPkjE9Q@180 | Rooftop HVAC + City Night, 10h |
| `rain-tent` | https://www.youtube.com/watch?v=_0j19ee__Fk@180 | Rain on Tent, 10h, black screen |
| `campfire-night` | https://www.youtube.com/watch?v=qsOUv9EzKsg@180 | Campfire + River Night, 10h |
| `cabin-rain` | https://www.youtube.com/watch?v=rLdpprJ3jeE@180 | Rain on Tin Roof + Thunder, 10h |
| `wolf-howl-distant` | https://www.youtube.com/watch?v=tv56FHgG5eU@180 | Arctic Camp — wind, fire, distant wolves, 10h |

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
