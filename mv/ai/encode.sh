#!/usr/bin/env bash
# Re-encode the raw Veo clips (ai/clips) for the web player (clips/): no audio, short GOP so seeking is instant, faststart.
# Some Veo takes came with a fake old-film border: those are cropped by 7.5 %. s-break keeps only its first 1.5 s (before the
# blast turns into smoke), played forward and back twice, so the giant shatters and re-forms. s-sink is played backwards.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p clips
OUT="-an -c:v libx264 -preset medium -crf 25 -maxrate 9M -bufsize 18M -g 12 -pix_fmt yuv420p -movflags +faststart"
for f in ai/clips/*.mp4; do n=$(basename "$f" .mp4); o=clips/$n.mp4; [ "$o" -nt "$f" ] && continue
  case $n in
    i-macro|i-sea|s-fall|s-river|s-ghosts|s-windows|s-window) vf="crop=iw/1.075:ih/1.075,scale=1920:1080:flags=lanczos,fps=24" ;;
    # c-bloom grew a fake inscription and seals down its left edge: cropped away, and c-calm (same painting, cut together) is cropped to match
    c-calm|c-bloom) vf="crop=iw/1.09:ih/1.09:iw-ow:ih-oh,scale=1920:1080:flags=lanczos,fps=24" ;;
    c-petal) vf="crop=iw/1.17:ih/1.17:iw-ow:ih-oh,scale=1920:1080:flags=lanczos,fps=24" ;;      # a stray green blob at the left edge
    *) vf="scale=1920:1080:flags=lanczos,fps=24" ;;
  esac
  if [ "$n" = s-sink ] || [ "$n" = n-sink ]; then        # the giant sinking, reversed: the characters gather into him
    ffmpeg -loglevel error -y -i "$f" -vf "$vf,reverse" $OUT "$o"
  elif [ "$n" = c-calm ]; then                            # only the first 3.3 s stay calm (then a black tree grows): played forward and back
    ffmpeg -loglevel error -y -i "$f" -filter_complex "[0:v]$vf,trim=0:3.3,setpts=PTS-STARTPTS,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]" -map "[v]" $OUT "$o"
  elif [ "$n" = s-break ]; then
    ffmpeg -loglevel error -y -i "$f" -filter_complex "[0:v]$vf,split=4[a][b][c][d];[a]trim=0:1.5,setpts=PTS-STARTPTS[p1];[b]trim=0.3:1.5,setpts=PTS-STARTPTS,reverse[p2];[c]trim=0.3:1.45,setpts=PTS-STARTPTS[p3];[d]trim=0:1.45,setpts=PTS-STARTPTS,reverse[p4];[p1][p2][p3][p4]concat=n=4:v=1[v]" -map "[v]" $OUT "$o"
  else
    ffmpeg -loglevel error -y -i "$f" -vf "$vf" $OUT "$o"
  fi
  echo "encoded $n $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$o")s"
done
