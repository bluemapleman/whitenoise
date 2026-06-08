#!/usr/bin/env bash
# Generate brown/pink/white noise loops directly to audio/.
# Output: 30-second seamless mono AAC files at 128 kbps in audio/<color>-noise.m4a
#
# Pure noise is mathematically perfect — it loops seamlessly by definition.
# No licensing concerns.

set -euo pipefail

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_ROOT"

command -v ffmpeg >/dev/null || { echo "ffmpeg not found. brew install ffmpeg" >&2; exit 1; }

DURATION=300         # seconds per loop (5 min — long enough to mask the loop)
BITRATE=128k         # AAC bitrate — sweet spot for noise
SAMPLE_RATE=44100

mkdir -p audio

for color in brown pink white; do
  out="audio/${color}-noise.m4a"
  echo "Generating $out (${DURATION}s, ${BITRATE} AAC)..."
  ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i "anoisesrc=color=${color}:sample_rate=${SAMPLE_RATE}:amplitude=0.5:duration=${DURATION}" \
    -c:a aac -b:a "${BITRATE}" \
    "$out"
done

echo ""
echo "Done. Generated:"
ls -lh audio/*-noise.m4a
