#!/usr/bin/env bash
# Normalize all audio/*.m4a files to a consistent perceived loudness using
# ffmpeg's two-pass `loudnorm` (ITU-R BS.1770 / EBU R128).
#
# Why two-pass: a single-pass loudnorm uses an internal AGC that doesn't
# really hit the target. Two passes (measure → correct) get within ±0.5 LUFS.
#
# Why -23 LUFS: EBU R128 broadcast standard. Neutral. Users will set their
# own volume; we just need every track to sit in the same ballpark.
# (Spotify/Apple Music use -14 to -16 LUFS; that's mastered-music loud and
# inappropriate for sleep ambient.)
#
# Idempotent: re-running on already-normalized files leaves them within
# ±0.5 LUFS of target. Originals are backed up to audio/.original/ on first
# run only — if backups exist, we don't overwrite them.

set -euo pipefail

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_ROOT"

command -v ffmpeg  >/dev/null || { echo "ffmpeg not found. brew install ffmpeg" >&2; exit 1; }
command -v ffprobe >/dev/null || { echo "ffprobe not found." >&2; exit 1; }
command -v jq      >/dev/null || { echo "jq not found. brew install jq" >&2; exit 1; }

# Loudness target & limits (EBU R128 broadcast)
TARGET_I="-23"        # integrated loudness (LUFS)
TARGET_TP="-2"        # true peak ceiling (dBTP)
TARGET_LRA="11"       # loudness range (LU)
BITRATE="128k"

color()   { printf "\033[1;%sm%s\033[0m\n" "$1" "$2"; }
info()    { color 36 "==> $1"; }
ok()      { color 32 "  ✓ $1"; }
warn()    { color 33 "  ! $1"; }

mkdir -p audio/.original

for src in audio/*.m4a; do
  name=$(basename "$src")
  backup="audio/.original/$name"

  # Back up the original (only if we don't already have one)
  if [ ! -f "$backup" ]; then
    cp "$src" "$backup"
  fi

  # Always measure from the ORIGINAL so re-runs converge to target rather
  # than drift further with each pass.
  measure_src="$backup"

  info "Measuring $name"

  # Pass 1 — measure. JSON output so we can parse precisely.
  measure_json=$(ffmpeg -hide_banner -nostats -i "$measure_src" \
    -af "loudnorm=I=${TARGET_I}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:print_format=json" \
    -f null - 2>&1 | sed -n '/^{/,/^}/p')

  if [ -z "$measure_json" ]; then
    warn "  could not parse loudnorm JSON for $name — skipping"
    continue
  fi

  in_i=$(echo "$measure_json"      | jq -r '.input_i')
  in_tp=$(echo "$measure_json"     | jq -r '.input_tp')
  in_lra=$(echo "$measure_json"    | jq -r '.input_lra')
  in_thresh=$(echo "$measure_json" | jq -r '.input_thresh')
  target_offset=$(echo "$measure_json" | jq -r '.target_offset')

  printf "    in: %s LUFS, peak %s dBTP, LRA %s\n" "$in_i" "$in_tp" "$in_lra"

  # Pass 2 — correct. Use the measured stats as inputs to the linear filter
  # variant so output lands at the target precisely.
  tmp="$src.tmp.m4a"
  ffmpeg -hide_banner -loglevel error -y \
    -i "$measure_src" \
    -af "loudnorm=I=${TARGET_I}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:measured_I=${in_i}:measured_TP=${in_tp}:measured_LRA=${in_lra}:measured_thresh=${in_thresh}:offset=${target_offset}:linear=true:print_format=summary" \
    -ac 1 -ar 44100 -c:a aac -b:a "$BITRATE" \
    "$tmp"

  mv "$tmp" "$src"

  # Verify post-process loudness
  out_i=$(ffmpeg -hide_banner -i "$src" -af loudnorm=print_format=summary -f null - 2>&1 \
    | awk -F': *' '/Input Integrated/ {gsub(/ LUFS/,"",$2); print $2}')
  ok "$name now ≈ ${out_i} LUFS"
done

echo ""
info "Originals backed up to audio/.original/"
info "Re-run anytime — measurement always uses the original."
