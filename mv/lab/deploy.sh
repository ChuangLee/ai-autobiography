#!/usr/bin/env bash
# Publish the code-only MV sample scenes to https://blind.pub/zichengjing/mv/codex/ .
# Only the scenes named in PUBLISHED go out; add a scene here (and a link in index.html) once it holds up.
set -euo pipefail
cd "$(dirname "$0")"
PUBLISHED="prelude river windows verse3 dive verse4 bridge finale film portrait"
DEST=/var/www/zichengjing/mv/codex
for d in $PUBLISHED; do
  [ -f "$d/index.html" ] || { echo "missing scene $d/index.html" >&2; exit 1; }
done
python3 ../design.py
install -d /var/www/zichengjing/mv/design-codex/design-refs
install -m 644 ../design-refs/*.webp /var/www/zichengjing/mv/design-codex/design-refs/
install -D -m 644 ../design.html /var/www/zichengjing/mv/design-codex/index.html
install -d "$DEST"
install -m 644 lib.js OFL.txt "$DEST/"
for d in $PUBLISHED; do
  install -d "$DEST/$d"
  find "$d" -maxdepth 1 -type f \( -name '*.html' -o -name '*.js' -o -name '*.json' -o -name '*.bin' -o -name '*.png' -o -name '*.webp' -o -name '*-source.txt' -o -name '*-OFL.txt' \) -exec install -m 644 {} "$DEST/$d/" \;
  # font subsets in subfolders (e.g. verse3/fonts/*.woff2); archives and helper scripts stay local
  (cd "$d" && find . -mindepth 2 -type f -name '*.woff2' -not -path './archive/*' -exec install -D -m 644 {} "$DEST/$d/{}" \;)
done
install -m 644 index.html "$DEST/"
echo "Published: $PUBLISHED"
