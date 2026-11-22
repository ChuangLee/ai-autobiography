#!/usr/bin/env python3
"""Keyframes for the shots that need a fixed composition or the same giant. Run: python3 keyframes.py [name ...]"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
HERE = Path(__file__).parent
REF = (HERE / "keys" / "giant-nb.url").read_text().strip()
LOOK = (" Photoreal high-end VFX film still, anamorphic lens, volumetric haze, fine film grain, hyper detailed."
        " Palette: deep violet and mauve night, amber, molten gold, rose; no blue light anywhere. No captions, no watermark.")
GIANT = ("the same colossal luminous giant as in the reference image: bald, serene classical-statue face and physique, body of translucent molten white-gold light"
         " glowing from within, thousands of tiny glowing characters flowing under the skin like rivers and veins of light")
K = {
  "k-night": ("nano-banana-2", "2K", None,
    "Prehistoric night on a high plateau above a misty valley. An ancient Chinese sage with long wild grey hair and a fur cloak kneels by a small fire,"
    " carving the first written characters into a tortoise shell with a bronze knife; each carved stroke glows faintly gold. Above him the vast night sky"
    " has begun to rain down countless tiny glowing golden grains like a slow meteor shower. Far below in the mist, pale translucent ghostly figures look up."
    " Warm firelight against the deep violet night, a huge moon." + LOOK),
  "k-strata": ("nano-banana-2", "2K", None,
    "Low aerial view flying through a colossal canyon at night. Its cliff walls are strata of human writing laid down through the ages: at the bottom carved"
    " oracle bones and tortoise shells, above them stacked bamboo slips bound with cord, then engraved stone steles, then towering walls of books and paper"
    " scrolls, and along the top rim thousands of glowing screens. Along the canyon floor runs a river made of glowing golden characters. Epic scale." + LOOK),
  "k-vortex": ("nano-banana-2", "2K", [REF],
    "Same scene, same camera, same moon, sea of glowing characters and the lone boat, but the giant is completely gone. In its place, the sea of characters"
    " swirls into a huge slow vortex of golden light, rivers of glowing characters from every direction converging into it, a faint column of light"
    " starting to rise from its centre. Keep everything else identical." + LOOK),
  "k-city": ("nano-banana-2", "2K", [REF],
    "Wide low-angle shot from a city street at night: " + GIANT + ", now stands waist-deep among the towers of a vast night megacity, skyscrapers"
    " reaching its waist. Thousands of fine golden threads of light stream out from its body into thousands of lit windows across the city."
    " Moon behind its shoulder." + LOOK),
  "k-window": ("nano-banana-2", "2K", None,
    "Night exterior of a dark high-rise apartment block, close on one lit window. Through the glass: a young woman sits at a desk in front of a laptop,"
    " and across the desk, facing her, sits a small luminous human-shaped figure made entirely of glowing golden characters, like a person of light."
    " Warm lamplight inside, all neighbouring windows dark." + LOOK),
  "k-breaking": ("nano-banana-2", "2K", [REF],
    "Medium shot from the height of a skyscraper roof: " + GIANT + ", standing in a night megacity, its body violently disintegrating into millions of"
    " glowing character particles and in the same instant re-forming, one shoulder and arm blown apart into a storm of glyphs that is being pulled back,"
    " a ring-shaped shockwave of light in the air, city windows below flickering on and off. Eyes open, glowing gold." + LOOK),
  "k-touch": ("nano-banana-2", "2K", [REF],
    "From behind a lone small human figure standing on a rooftop at night, looking up with one hand raised: " + GIANT + ", bends down toward them out of"
    " the sky, its enormous calm face filling the upper frame, eyes open and glowing gold, one gigantic finger of light reaching down until it almost"
    " touches the person's raised hand. City lights far below." + LOOK),
}
def run(name):
    model, res, refs, prompt = K[name]; inp = {"prompt": prompt, "aspect_ratio": "16:9", "resolution": res}
    if refs: inp["image_input"] = refs
    return subprocess.run(["python3", str(HERE / "kie.py"), "img", name, model, json.dumps(inp)], capture_output=True, text=True)
if __name__ == "__main__":
    names = sys.argv[1:] or list(K)
    with ThreadPoolExecutor(8) as ex:
        for n, r in zip(names, ex.map(run, names)): print(n, r.stdout.strip(), r.stderr.strip()[-300:])
