// The things of writing, east and west, as ink-wash sprites: drawn here with brush-like strokes into a 4×4 sheet (white = ink, like the glyph atlas).
//  0 brush  1 ink stick  2 paper  3 inkstone  4 bamboo slips  5 handscroll  6 oracle bone  7 stele rubbing
//  8 clay tablet  9 papyrus roll  10 codex  11 quill  12 metal type  13 reed stylus  14 seal  15 thread-bound book
export function drawSprites(atlas, C = 256) { const cv = new OffscreenCanvas(C * 4, C * 4), x = cv.getContext("2d"); x.lineCap = "round"; x.lineJoin = "round";
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const ink = (a) => `rgba(255,255,255,${a})`;
  // a brushed line: several passes that wander a little and vary in width, so the edge is alive
  const stroke = (pts, w = 7, a = .9, close = false) => { for (let k = 0; k < 3; k++) { x.beginPath(); pts.forEach((p, i) => { const jx = (rnd() - .5) * w * .35, jy = (rnd() - .5) * w * .35; i ? x.lineTo(p[0] + jx, p[1] + jy) : x.moveTo(p[0] + jx, p[1] + jy); }); if (close) x.closePath();
    x.strokeStyle = ink(a * (k ? .45 : .8)); x.lineWidth = w * (k === 0 ? 1 : k === 1 ? .6 : 1.5) * (.85 + .3 * rnd()); x.stroke(); } };
  const wash = (pts, a = .3) => { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fillStyle = ink(a); x.fill(); x.fillStyle = ink(a * .5); x.save(); x.clip(); for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(40 + rnd() * 176, 40 + rnd() * 176, 30 + rnd() * 60, 20 + rnd() * 40, rnd() * 3, 0, 7); x.fill(); } x.restore(); };
  const box = (a, b, c, d) => [[a, b], [c, b], [c, d], [a, d]], ell = (cx, cy, rx, ry, n = 26, a0 = 0, a1 = 6.2832) => Array.from({ length: n + 1 }, (_, i) => { const t = a0 + (a1 - a0) * i / n; return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]; });
  const tiles = new Map();
  // The source atlas stores coverage in red; the sprite sheet stores it in alpha.
  const glyph = (family, ch, left, top, size) => {
    const key = family + ch;
    if (!tiles.has(key)) {
      const entry = atlas.info.glyphs.find(g => g.group === family && g.text === ch);
      if (!entry) throw Error("Missing writing on a river object: " + key);
      const tile = new OffscreenCanvas(64, 64), ctx = tile.getContext("2d", {willReadFrequently:true});
      const cell = atlas.info.cell, cols = atlas.info.cols;
      ctx.drawImage(atlas.bitmap, (entry.i % cols)*cell, Math.floor(entry.i/cols)*cell, cell, cell, 0, 0, 64, 64);
      const pixels = ctx.getImageData(0, 0, 64, 64);
      for (let j=0; j<pixels.data.length; j+=4) {
        pixels.data[j+3]=pixels.data[j];
        pixels.data[j]=pixels.data[j+1]=pixels.data[j+2]=255;
      }
      ctx.putImageData(pixels, 0, 0); tiles.set(key,tile);
    }
    x.drawImage(tiles.get(key), left, top, size, size);
  };
  const D = [
    () => { stroke([[52, 44], [150, 150]], 13, .75); stroke([[58, 38], [158, 142]], 4, .9); stroke([[146, 146], [164, 164]], 20, .95); wash([[154, 150], [176, 172], [214, 218], [198, 180], [168, 152]], .95); stroke([[168, 162], [212, 216]], 6, .95); stroke([[44, 36], [60, 52]], 9, .9); },
    () => { wash(box(92, 34, 164, 222), .88); stroke(box(92, 34, 164, 222), 6, .95, true); x.globalCompositeOperation = "destination-out"; x.fillStyle = "rgba(0,0,0,.75)"; x.fillRect(112, 60, 32, 96); x.globalCompositeOperation = "source-over"; stroke([[128, 70], [128, 146]], 4, .8); stroke([[100, 186], [156, 186]], 3, .5); },
    () => { const p = [[46, 56], [200, 40], [214, 190], [176, 214], [58, 204]]; wash(p, .12); stroke(p, 5, .8, true); stroke([[214, 190], [182, 186], [176, 214]], 4, .7); for (let i = 0; i < 4; i++) stroke([[84 + i * 30, 70], [88 + i * 30, 180]], 2, .28); },
    () => { const p = ell(128, 132, 84, 70); wash(p, .5); stroke(p, 11, .95, true); wash(ell(128, 100, 52, 26), .95); stroke(ell(128, 150, 60, 38, 20, .3, 2.85), 4, .6); },
    () => { for (let i = 0; i < 7; i++) { const a = 44 + i * 25; wash(box(a, 40, a + 19, 216), .28); stroke(box(a, 40, a + 19, 216), 3, .8, true); for(let j=0;j<5;j++) glyph("cn-clerical", "天田人山水木日月"[(i+j)%8],a+1,47+j*32,17); } stroke([[36, 84], [222, 80]], 5, .9); stroke([[36, 176], [222, 172]], 5, .9); },
    () => { const p = [[70, 84], [214, 70], [222, 168], [206, 178], [70, 172]]; wash(p, .14); stroke(p, 5, .8, true); const r = ell(60, 128, 22, 50); wash(r, .5); stroke(r, 7, .95, true); stroke(ell(60, 128, 10, 26), 3, .7, true); stroke([[60, 68], [60, 54]], 8, .95); stroke([[60, 188], [60, 202]], 8, .95); for (let i = 0; i < 5; i++) stroke([[104 + i * 22, 92], [106 + i * 22, 156]], 3, .5); },
    () => { const p = [[128, 30], [176, 44], [206, 84], [204, 150], [182, 204], [128, 226], [74, 204], [52, 150], [50, 84], [80, 44]]; wash(p, .22); stroke(p, 6, .9, true); stroke([[128, 34], [128, 222]], 3, .7); stroke([[58, 100], [198, 100]], 3, .55); stroke([[60, 160], [196, 160]], 3, .55);
      [..."日月山川雨禾"].forEach((ch,i)=>glyph("cn-oracle",ch,68+(i%2)*70,51+Math.floor(i/2)*54,35)); },
    () => { wash(box(62, 34, 194, 222), .82); stroke(box(62, 34, 194, 222), 4, .9, true); x.globalCompositeOperation = "destination-out"; [..."天人日月山川水木田禾雨火"].forEach((ch,i)=>glyph("cn-kai",ch,145-Math.floor(i/4)*36,49+(i%4)*38,34)); x.globalCompositeOperation = "source-over"; },
    () => { const p = [[62, 60], [128, 48], [196, 60], [206, 128], [196, 200], [128, 210], [60, 198], [50, 128]]; wash(p, .42); stroke(p, 8, .92, true); [..."𒀭𒆠𒀀𒌓𒈗𒇽𒁾𒅗𒂍𒉈𒄑𒊺"].forEach((ch,i)=>glyph("world-ancient",ch,66+(i%3)*42,66+Math.floor(i/3)*32,31)); },
    () => { const p = [[64, 76], [196, 70], [200, 182], [62, 186]]; wash(p, .16); stroke(p, 4, .75, true); for (const cx of [56, 204]) { const r = ell(cx, 128, 17, 62); wash(r, .42); stroke(r, 6, .92, true); } for (let j = 0; j < 5; j++) stroke([[80, 92 + j * 19], [184, 90 + j * 19]], 2, .32); for (let i = 0; i < 6; i++) stroke([[88 + i * 17, 100], [92 + i * 17, 112]], 3, .7); },
    () => { const L = [[128, 76], [44, 60], [38, 180], [128, 202]], R = [[128, 76], [212, 60], [218, 180], [128, 202]]; wash(L, .16); wash(R, .12); stroke(L, 6, .9, true); stroke(R, 6, .9, true); stroke([[128, 72], [128, 206]], 7, .95); for (let j = 0; j < 6; j++) { stroke([[58, 88 + j * 16], [114, 96 + j * 16]], 2, .5); stroke([[142, 96 + j * 16], [200, 88 + j * 16]], 2, .5); } },
    () => { stroke([[52, 214], [100, 150], [200, 44]], 5, .95); const v = [[100, 150], [118, 96], [160, 52], [204, 38], [196, 86], [160, 126], [112, 158]]; wash(v, .3); stroke(v, 4, .75, true); for (let i = 0; i < 8; i++) { const t = i / 8, a = 104 + t * 92, b = 148 - t * 100; stroke([[a, b], [a + 14 - t * 30, b - 30 + t * 8]], 2, .5); stroke([[a, b], [a + 26, b + 10 - t * 14]], 2, .5); } stroke([[52, 214], [62, 196]], 8, .95); },
    () => { const top = [[90, 70], [150, 54], [182, 78], [122, 96]], l = [[90, 70], [122, 96], [122, 204], [90, 176]], r = [[122, 96], [182, 78], [182, 184], [122, 204]]; wash(l, .8); wash(r, .5); wash(top, .2); stroke(top, 5, .95, true); stroke(l, 5, .95, true); stroke(r, 5, .95, true); stroke([[118, 66], [150, 72], [130, 84], [156, 82]], 5, .95); },
    () => { stroke([[60, 204], [190, 56]], 9, .85); stroke([[56, 208], [66, 196]], 4, .95); wash([[190, 56], [206, 34], [212, 62]], .9); stroke([[190, 56], [206, 34], [212, 62]], 4, .95, true); },
    () => { wash(box(78, 120, 178, 214), .6); stroke(box(78, 120, 178, 214), 7, .95, true); const k = ell(128, 86, 30, 32); wash(k, .75); stroke(k, 6, .95, true); stroke([[96, 150], [160, 150]], 4, .9); stroke([[96, 182], [160, 182]], 4, .9); stroke([[128, 136], [128, 198]], 4, .9); },
    () => { wash(box(64, 44, 192, 214), .2); stroke(box(64, 44, 192, 214), 6, .9, true); stroke([[84, 46], [84, 212]], 3, .6); for (let j = 0; j < 4; j++) stroke([[64, 66 + j * 44], [84, 66 + j * 44]], 4, .9); wash(box(146, 60, 176, 150), .08); stroke(box(146, 60, 176, 150), 3, .8, true); stroke([[161, 72], [161, 138]], 4, .75); },
  ];
  D.forEach((f, i) => { x.save(); x.beginPath(); x.rect((i % 4) * C, Math.floor(i / 4) * C, C, C); x.clip(); x.translate((i % 4) * C, Math.floor(i / 4) * C); x.scale(C / 256, C / 256); f(); x.restore(); });
  return cv.transferToImageBitmap(); }
// which thing belongs to which river (family 0 cuneiform, 1 hieroglyphs, 2 Chinese, 3 alphabets, 4 digits and code/print)
export const OBJ_WGSL = `
fn objOf(k:u32, r:f32)->f32{ if(k==0u){ if(r<.7){ return 8.; } return 13.; } if(k==1u){ if(r<.75){ return 9.; } return 13.; }
  if(k==2u){ let a=array<f32,10>(0.,1.,2.,3.,4.,5.,6.,7.,14.,15.); return a[u32(r*9.99)]; } if(k==3u){ if(r<.4){ return 10.; } if(r<.75){ return 11.; } return 9.; }
  if(r<.6){ return 12.; } if(r<.8){ return 10.; } return 2.; }
`;
