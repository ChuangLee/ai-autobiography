#!/bin/bash
# w.sh <times> [res] [n] [wait-seconds]: stills of this scene into the scratchpad (log in w.log); retries when the page's first fetch fails
S=/tmp/claude-0/-root-ai-workspace-article-Autobiography/f19abdf0-da40-48e5-96be-df48ecb79d10/scratchpad
cd /root/ai-workspace/article/Autobiography/mv/lab
last=$(echo "$1" | awk -F, '{print $NF}' | tr . _)
for try in 1 2 3 4; do
  (timeout 900 node shot.mjs windows "$1" --res "${2:-0.4}" --q "n=${3:-46000}" --out $S/shots > $S/w.log 2>&1 &)
  for i in $(seq 1 $(( ${4:-100} / 2 ))); do sleep 2; if grep -q -E "windows-$last.png|\[error\]|\[exception\]|Error" $S/w.log; then break; fi; done
  grep -q "Failed to fetch" $S/w.log || break
  sleep 3
done
grep -v "ok$\|start$\|next$\|^/tmp" $S/w.log | cut -c1-600 | head -${5:-25}
