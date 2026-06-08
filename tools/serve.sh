#!/usr/bin/env bash
# Simple local dev server with no caching headers
cd "$(dirname "$0")/.."
python3 -m http.server 8000
