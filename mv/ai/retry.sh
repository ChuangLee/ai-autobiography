#!/usr/bin/env bash
# retry a shot until Veo accepts it (failed tasks are not charged)
cd "$(dirname "$0")"
for n in "$@"; do ( for i in 1 2 3 4 5 6; do out=$(python3 clips.py $n 2>&1 | tail -1); echo "$(date +%T) $out"; case "$out" in *.mp4*) break;; esac; sleep 90; done ) & done; wait
