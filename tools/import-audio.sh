#!/usr/bin/env bash
# Interactive importer: prompts you to map files in ~/Downloads to track IDs,
# then transcodes each to 30s mono AAC at audio/<id>.m4a.
#
# Usage:
#   bash tools/import-audio.sh
#
# After running, LICENSES.md is updated for each imported track.

set -euo pipefail

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_ROOT"

command -v ffmpeg >/dev/null || { echo "ffmpeg not found. brew install ffmpeg" >&2; exit 1; }

DOWNLOADS="${HOME}/Downloads"
LICENSES="audio/LICENSES.md"

# Track IDs that need importing — the 10 nature tracks (noise files are generated)
TRACK_IDS=(
  "rain-light"
  "rain-heavy"
  "thunder"
  "ocean"
  "forest"
  "mountain-breeze"
  "river"
  "fireplace"
  "crickets"
  "fan"
)

# Per-track Freesound source URL — kept in sync with DOWNLOAD-CHECKLIST.md
declare -A SOURCES=(
  [rain-light]="https://freesound.org/people/samesamesame/sounds/242889/"
  [rain-heavy]="https://freesound.org/people/Rvgerxini/sounds/527658/"
  [thunder]="https://freesound.org/people/billgrip/sounds/151447/"
  [ocean]="https://freesound.org/people/Rmutt/sounds/148808/"
  [forest]="https://freesound.org/people/Magnesus/sounds/723913/"
  [mountain-breeze]="https://freesound.org/people/lwdickens/sounds/260633/"
  [river]="https://freesound.org/people/BurghRecords/sounds/446019/"
  [fireplace]="https://freesound.org/people/NickTayloe/sounds/813328/"
  [crickets]="https://freesound.org/people/Sclolex/sounds/210540/"
  [fan]="https://freesound.org/people/Mihacappy/sounds/855824/"
)

color()   { printf "\033[1;%sm%s\033[0m\n" "$1" "$2"; }
info()    { color 36 "==> $1"; }
ok()      { color 32 "  ✓ $1"; }
warn()    { color 33 "  ! $1"; }

# List candidate audio files in ~/Downloads (recent, common formats)
mapfile -t CANDIDATES < <(find "$DOWNLOADS" -maxdepth 1 -type f \
  \( -iname "*.wav" -o -iname "*.flac" -o -iname "*.mp3" -o -iname "*.ogg" -o -iname "*.m4a" -o -iname "*.aac" \) \
  -print 2>/dev/null | sort)

if [ ${#CANDIDATES[@]} -eq 0 ]; then
  echo "No audio files found in $DOWNLOADS. Download the 10 tracks first (see audio/DOWNLOAD-CHECKLIST.md)." >&2
  exit 1
fi

info "Found ${#CANDIDATES[@]} candidate file(s) in $DOWNLOADS"
for i in "${!CANDIDATES[@]}"; do
  printf "  [%2d] %s\n" "$i" "$(basename "${CANDIDATES[$i]}")"
done
echo ""

# For each track ID, ask the user to pick a candidate file
mkdir -p audio
for id in "${TRACK_IDS[@]}"; do
  out="audio/${id}.m4a"
  if [ -f "$out" ]; then
    warn "$out already exists — skipping (delete it first to re-import)"
    continue
  fi

  echo ""
  info "Track: $id"
  echo "    Source: ${SOURCES[$id]}"
  printf "    Pick a file by [number] from above, or 's' to skip, or 'q' to quit: "
  read -r choice

  case "$choice" in
    s|S) warn "Skipped $id"; continue ;;
    q|Q) echo "Quitting."; exit 0 ;;
    ''|*[!0-9]*) warn "Invalid input — skipped $id"; continue ;;
  esac

  if [ "$choice" -ge "${#CANDIDATES[@]}" ]; then
    warn "Out of range — skipped $id"
    continue
  fi

  src="${CANDIDATES[$choice]}"
  echo "  Importing $(basename "$src") → $out"

  # Transcode: convert to mono AAC, 128 kbps, take first 30 seconds
  ffmpeg -hide_banner -loglevel error -y \
    -i "$src" \
    -ac 1 -ar 44100 \
    -t 30 \
    -c:a aac -b:a 128k \
    "$out"

  size=$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")
  ok "$out ($((size/1024)) KB)"

  # Update LICENSES.md row for this track
  python3 -c "
import re
path = 'audio/LICENSES.md'
with open(path) as f: content = f.read()
pattern = r'^\| ${id}\.m4a \| .*$'
url = '${SOURCES[$id]}'
new_row = f'| ${id}.m4a | [Freesound]({url}) | CC0 (public domain) | imported via tools/import-audio.sh, trimmed to 30s |'
content = re.sub(pattern, new_row, content, flags=re.MULTILINE)
with open(path, 'w') as f: f.write(content)
"
done

echo ""
info "Done. Imported tracks:"
ls -lh audio/*.m4a 2>/dev/null | awk '{print "  " $9 "  (" $5 ")"}'

echo ""
info "Next: bash tools/deploy.sh"
