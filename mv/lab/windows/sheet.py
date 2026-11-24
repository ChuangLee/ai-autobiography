#!/usr/bin/env python3
# sheet.py <out.png> <cols> <t1,t2,...>: contact sheet from the stills in the scratchpad
import sys, os
from PIL import Image, ImageDraw
S='/tmp/claude-0/-root-ai-workspace-article-Autobiography/f19abdf0-da40-48e5-96be-df48ecb79d10/scratchpad/shots/'
out, cols, ts = sys.argv[1], int(sys.argv[2]), [str(float(x)).rstrip('0').rstrip('.') for x in sys.argv[3].split(',')]
ims=[(t, Image.open(S+f"windows-{t.replace('.','_')}.png").convert('RGB')) for t in ts if os.path.exists(S+f"windows-{t.replace('.','_')}.png")]
w,h=ims[0][1].size; sh=Image.new('RGB',(w*cols,h*((len(ims)+cols-1)//cols)))
for i,(t,im) in enumerate(ims):
    im=im.resize((w,h)); ImageDraw.Draw(im).text((6,4),t,fill=(255,210,120)); sh.paste(im,((i%cols)*w,(i//cols)*h))
sh.save(S+out); print(len(ims), sh.size)
