#!/usr/bin/env bash
# Publish the lyric review page to https://blind.pub/zichengjing/. Re-run after every revision;
# comments in /var/lib/zichengjing-review are kept. Shares the review key with /ai-edu/.
set -euo pipefail
cd "$(dirname "$0")"
python3 build.py
install -d /var/www/zichengjing
# Main page = the 8th draft of 《河水不回答》 (lyrics, Suno plans, takes). The earlier three-version page lives on at old/.
install -m 644 web/index.html web/poem.jpg /var/www/zichengjing/
rm -f /var/www/zichengjing/content.json
install -d /var/www/zichengjing/old && install -m 644 web/old/index.html web/old/content.json /var/www/zichengjing/old/
[ -f web/songs.json ] && install -m 644 web/songs.json /var/www/zichengjing/
[ -f web/timing.json ] && install -m 644 web/timing.json /var/www/zichengjing/
if ls web/audio/*.mp3 >/dev/null 2>&1; then install -d /var/www/zichengjing/audio && install -m 644 web/audio/*.mp3 /var/www/zichengjing/audio/; fi
install -d /var/www/zichengjing/mv/data /var/www/zichengjing/mv/v6 && install -m 644 ../mv/index.html ../mv/timing.json /var/www/zichengjing/mv/ && install -m 644 ../mv/data/strokes.js /var/www/zichengjing/mv/data/ && install -m 644 ../mv/v6/index.html ../mv/v6/timing.json /var/www/zichengjing/mv/v6/
# MV: the web-encoded Veo clips (mv/clips, made by mv/ai/encode.sh) and the earlier hand-drawn version for comparison
install -d /var/www/zichengjing/mv/clips /var/www/zichengjing/mv/old-canvas && install -m 644 ../mv/clips/*.mp4 /var/www/zichengjing/mv/clips/ && install -m 644 ../mv/old-canvas/index.html /var/www/zichengjing/mv/old-canvas/ && install -m 644 ../mv/timing.json /var/www/zichengjing/mv/old-canvas/ && install -d /var/www/zichengjing/mv/old-canvas/data && install -m 644 ../mv/data/strokes.js /var/www/zichengjing/mv/old-canvas/data/
# MV v3 (black-and-white ink): the glyph atlas of real writing and the lyric font; the previous colour cut kept at mv/v2-color for comparison
install -d /var/www/zichengjing/mv/glyphs /var/www/zichengjing/mv/v2-color && install -m 644 ../mv/glyphs/atlas.png ../mv/glyphs/atlas.json ../mv/glyphs/lyric.woff2 ../mv/glyphs/CREDITS.md /var/www/zichengjing/mv/glyphs/ && install -m 644 ../mv/v2-color/index.html /var/www/zichengjing/mv/v2-color/
# Storyboard gallery: every shot of the whole song in lyric order (mv/shots.html), served at mv/shots/
# MV full cut: the song data (mv/song.py) and the earlier two-verse cut kept at mv/v3-two-verses for comparison
install -m 644 ../mv/song.json /var/www/zichengjing/mv/ && install -d /var/www/zichengjing/mv/v3-two-verses && install -m 644 ../mv/v3-two-verses/index.html /var/www/zichengjing/mv/v3-two-verses/
install -d /var/www/zichengjing/mv/shots && install -m 644 ../mv/shots.html /var/www/zichengjing/mv/shots/index.html
python3 build_heshui.py
install -d /var/www/zichengjing/heshui && install -m 644 web/heshui/index.html web/heshui/content.json /var/www/zichengjing/heshui/
install -d /opt/zichengjing-review
install -m 644 server.py /opt/zichengjing-review/server.py
install -d -o www-data -g www-data /var/lib/zichengjing-review
if ! cmp -s deploy/zichengjing-review.service /etc/systemd/system/zichengjing-review.service; then
  install -m 644 deploy/zichengjing-review.service /etc/systemd/system/zichengjing-review.service
  systemctl daemon-reload
  systemctl enable zichengjing-review.service
fi
systemctl restart zichengjing-review.service
install -m 644 deploy/zichengjing.nginx.conf /etc/nginx/snippets/zichengjing.conf
# Host-specific: the nginx server block that should include the snippet is named in /etc/zichengjing/deploy.env
# (NGINX_SITE_CONF=/path/to/site.conf), which is kept out of the repo. Add the include line there by hand once.
[ -f /etc/zichengjing/deploy.env ] && . /etc/zichengjing/deploy.env
if [ -n "${NGINX_SITE_CONF:-}" ] && ! grep -q 'snippets/zichengjing.conf' "$NGINX_SITE_CONF"; then
  echo "WARNING: add 'include /etc/nginx/snippets/zichengjing.conf;' to the server block in $NGINX_SITE_CONF" >&2
fi
nginx -t
systemctl reload nginx
echo "Deployed: https://blind.pub/zichengjing/"
