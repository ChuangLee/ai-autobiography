#!/usr/bin/env bash
# Publish the code-only MV sample scenes to https://blind.pub/zichengjing/mv/lab/ .
# Only the scenes named in PUBLISHED go out; add a scene here (and a link in index.html) once it holds up.
set -euo pipefail
cd "$(dirname "$0")"
PUBLISHED="river windows verse3 dive verse4"
DEST=/var/www/zichengjing/mv/lab
install -d "$DEST"
install -m 644 lib.js index.html "$DEST/"
for d in $PUBLISHED; do
  [ -d "$d" ] || { echo "missing scene $d" >&2; continue; }
  install -d "$DEST/$d"
  find "$d" -maxdepth 1 -type f \( -name '*.html' -o -name '*.js' -o -name '*.json' -o -name '*.bin' -o -name '*.png' \) -exec install -m 644 {} "$DEST/$d/" \;
  # font subsets in subfolders (e.g. verse3/fonts/*.woff2); archives and helper scripts stay local
  (cd "$d" && find . -mindepth 2 -type f -name '*.woff2' -not -path './archive/*' -exec install -D -m 644 {} "$DEST/$d/{}" \;)
done
echo "Published: $PUBLISHED"
