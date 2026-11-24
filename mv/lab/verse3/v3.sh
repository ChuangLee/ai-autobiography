#!/bin/bash
# v3.sh <times> [res] [extra query] : stills of this scene into the scratchpad (development helper; retries when Chrome fails under load)
S=/tmp/claude-0/-root-ai-workspace-article-Autobiography/f19abdf0-da40-48e5-96be-df48ecb79d10/scratchpad
cd /root/ai-workspace/article/Autobiography/mv/lab
for try in 1 2 3; do
  timeout 1200 node shot.mjs verse3 "$1" --res "${2:-0.35}" --q "spp=3&dspp=2&n=60000&${3:-}" --out $S/shots-v3 > $S/v3.log 2>&1
  grep -q -E "Failed to fetch|chrome exited|ECONNRESET" $S/v3.log || break
  sleep 3
done
grep -v "^/tmp" $S/v3.log | cut -c1-900 | head -${4:-30}; grep -c "^/tmp" $S/v3.log
