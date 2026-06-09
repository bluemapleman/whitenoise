#!/usr/bin/env bash
# Download YouTube audio for each track listed in audio/SOURCES.md, then
# transcode to 5-minute mono AAC at 128 kbps in audio/<id>.m4a.
#
# Usage:
#   bash tools/import-from-youtube.sh           # imports all tracks with URLs
#   bash tools/import-from-youtube.sh ocean fan # imports just those tracks
#
# Edit audio/SOURCES.md to set the YouTube URL per track. Append @<seconds>
# to a URL to skip that many seconds at the start (defaults to 60s skip).

set -euo pipefail

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_ROOT"

command -v yt-dlp >/dev/null || { echo "yt-dlp not found. brew install yt-dlp" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not found. brew install ffmpeg" >&2; exit 1; }

SOURCES_FILE="audio/SOURCES.md"
LICENSES_FILE="audio/LICENSES.md"
DURATION=300         # 5-minute segment per track
DEFAULT_SKIP=60      # skip first 60s by default to avoid cold-opens
BITRATE=128k
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

color()   { printf "\033[1;%sm%s\033[0m\n" "$1" "$2"; }
info()    { color 36 "==> $1"; }
ok()      { color 32 "  ✓ $1"; }
warn()    { color 33 "  ! $1"; }
err()     { color 31 "  ✗ $1"; }

# Filter args: if track IDs given, only import those
WANTED=("$@")
want() {
  if [ ${#WANTED[@]} -eq 0 ]; then return 0; fi
  for w in "${WANTED[@]}"; do [ "$w" = "$1" ] && return 0; done
  return 1
}

# Parse SOURCES.md table, one track at a time
ROWS=()
while IFS= read -r line; do
  ROWS+=("$line")
done < <(grep -E '^\| `[a-z-]+` \|' "$SOURCES_FILE" || true)

if [ ${#ROWS[@]} -eq 0 ]; then
  err "No track rows found in $SOURCES_FILE"
  exit 1
fi

mkdir -p audio

for row in "${ROWS[@]}"; do
  # Row format: | `track-id` | URL | notes |
  id=$(echo "$row" | sed -E 's/^\| `([a-z-]+)` .*/\1/')
  url_field=$(echo "$row" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')

  want "$id" || continue

  # Skip rows with empty URL field
  if [ -z "$url_field" ] || ! echo "$url_field" | grep -qE 'https?://'; then
    warn "$id — no URL set in SOURCES.md, skipping"
    continue
  fi

  # Extract URL and optional @<seconds> skip override
  if echo "$url_field" | grep -qE '@[0-9]+\s*$'; then
    skip=$(echo "$url_field" | sed -E 's/.*@([0-9]+)\s*$/\1/')
    url=$(echo "$url_field" | sed -E 's/@[0-9]+\s*$//' | tr -d ' ')
  else
    skip=$DEFAULT_SKIP
    url=$(echo "$url_field" | tr -d ' ')
  fi

  out="audio/${id}.m4a"
  if [ -f "$out" ]; then
    warn "$out already exists — delete first to re-import. Skipping $id."
    continue
  fi

  info "Downloading $id from $url (skip ${skip}s, take ${DURATION}s)"

  # Download best audio-only stream, no postprocessing yet.
  # YouTube now blocks unauthenticated yt-dlp; use cookies from Chrome.
  # (Override with $YTDLP_BROWSER, e.g. firefox/safari/brave.)
  #
  # --download-sections tells yt-dlp to only fetch the bytes we need;
  # massively faster on long-form videos. Falls back to full download if
  # the format doesn't support range seeks.
  YTDLP_BROWSER="${YTDLP_BROWSER:-chrome}"
  raw_path="$TMPDIR/${id}.raw"
  end=$((skip + DURATION + 5))    # +5s safety margin
  yt-dlp --cookies-from-browser "$YTDLP_BROWSER" \
    --download-sections "*${skip}-${end}" \
    --force-keyframes-at-cuts \
    -x --audio-format best -q -o "${raw_path}.%(ext)s" "$url" || {
    err "Download failed for $id"
    continue
  }

  # yt-dlp picks the extension itself
  raw_file=$(find "$TMPDIR" -name "${id}.raw.*" -type f | head -1)
  if [ -z "$raw_file" ]; then
    err "Couldn't find downloaded file for $id"
    continue
  fi

  echo "  → transcoding to $out"
  ffmpeg -hide_banner -loglevel error -y \
    -ss "$skip" -t "$DURATION" \
    -i "$raw_file" \
    -ac 1 -ar 44100 \
    -c:a aac -b:a "$BITRATE" \
    "$out"

  size=$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")
  ok "$out ($((size/1024/1024)) MB, ${DURATION}s)"

  # Update LICENSES.md row for this track
  python3 -c "
import re
path = '$LICENSES_FILE'
with open(path) as f: content = f.read()
pattern = r'^\| ${id}\.m4a \| .*$'
new_row = f'| ${id}.m4a | YouTube: $url | TBD (verify before public ship) | imported via tools/import-from-youtube.sh, 5-min segment from offset ${skip}s |'
content = re.sub(pattern, new_row, content, flags=re.MULTILINE)
with open(path, 'w') as f: f.write(content)
"

done

echo ""
info "Done. Current audio/ directory:"
ls -lh audio/*.m4a 2>/dev/null | awk '{print "  " $9 "  (" $5 ")"}'

echo ""
warn "Reminder: YouTube audio is almost always copyrighted. Resolve licensing before public release. The LICENSES.md entries are marked 'TBD'."
echo ""
info "Next: bash tools/deploy.sh"
