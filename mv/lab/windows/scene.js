import { shader, FS_VS, NOISE, mipTexture, clamp, sm, lerp, qn, hash, norm, cross, sub, dot } from "../lib.js";
import { WGSL } from "./scene.wgsl.js";
import { BUST, GAZE } from "../river/figure.js";
import { ROOM, GLYPHS, VISITOR_MODEL } from "./room.wgsl.js";
import { PAINT } from "./paint.wgsl.js";

export function makeWindowText(device) {
  const ASKS = [["今晚睡不着，", "能陪我说说话吗"], ["怎么跟孩子", "说对不起"], ["帮我给妈妈", "写一封信"], ["How do I tell", "her the truth?"], ["¿Qué hago", "ahora?"], ["眠れない夜は", "どうすればいい"], ["오늘 하루가", "너무 길었어"], ["Est-ce que", "j'ai bien fait ?"], ["Wie fange ich", "neu an?"], ["Что мне", "делать дальше?"]];
  const SERIF = '"Noto Serif CJK SC","Source Han Serif SC","Songti SC","SimSun","Noto Serif CJK JP","Noto Serif CJK KR","Noto Serif",Georgia,serif';
  const cv = new OffscreenCanvas(2048, 2560), x = cv.getContext("2d", { willReadFrequently: true }); x.fillStyle = "#fff"; x.textBaseline = "middle";
    ASKS.forEach((a, i) => { const ox = (i % 2) * 1024, oy = Math.floor(i / 2) * 512; a.forEach((ln, k) => { const y = oy + 150 + k * 190;
      if (i === 0) { x.font = `500 116px ${SERIF}`; x.textAlign = "center"; [...ln].forEach((ch, j) => x.fillText(ch, ox + 64 + 128 * j + 64, y)); }
      else { x.font = `500 ${/[぀-鿿가-힯]/.test(ln) ? 116 : 104}px ${SERIF}`; x.textAlign = "left"; x.fillText(ln, ox + 64, y, 900); } }); });  return mipTexture(device, cv.transferToImageBitmap());
}

export function createWindowScene(g, post, text, atlas, includeGlyphs = true) {
  const { device } = g;
  const over = { color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" } }, add = { color: { srcFactor: "one", dstFactor: "one" }, alpha: { srcFactor: "zero", dstFactor: "one" } };
  const cityMod = shader(device, FS_VS + NOISE + WGSL, "city"), glyMod = shader(device, GLYPHS, "glyphs");
  const cityPipe = device.createRenderPipeline({ layout: "auto", vertex: { module: cityMod, entryPoint: "vs" }, fragment: { module: cityMod, entryPoint: "fs", targets: [{ format: "rgba16float", blend: over }] } });
  const glyPipe = device.createRenderPipeline({ layout: "auto", vertex: { module: glyMod, entryPoint: "vs", buffers: [{ arrayStride: 32, stepMode: "instance", attributes: [{ shaderLocation: 0, offset: 0, format: "float32x4" }, { shaderLocation: 1, offset: 16, format: "float32x4" }] }] },
    fragment: { module: glyMod, entryPoint: "fs", targets: [{ format: "rgba16float", blend: add }] }, depthStencil: { format: "depth32float", depthWriteEnabled: false, depthCompare: "less-equal" } });
  const ubuf = (n) => device.createBuffer({ size: n, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const ub = [ubuf(160), ubuf(160)], rb = [ubuf(112), ubuf(112)], qb = ubuf(64), pb = Array.from({ length: 24 }, () => ubuf(320)), lin = device.createSampler({ minFilter: "linear", magFilter: "linear", mipmapFilter: "linear" });
  const cityBG = ub.map((b) => device.createBindGroup({ layout: cityPipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: b } }, { binding: 1, resource: lin }, { binding: 2, resource: text.createView() }] }));
  const glyBG = pb.map((b) => device.createBindGroup({ layout: glyPipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: b } }, { binding: 1, resource: atlas.sampler }, { binding: 2, resource: atlas.tex.createView() }] }));
  const paintMod = shader(device, FS_VS + NOISE + PAINT, "paint");
  const paintPipe = device.createRenderPipeline({ layout: "auto", vertex: { module: paintMod, entryPoint: "vs" }, fragment: { module: paintMod, entryPoint: "fs", targets: [{ format: "rgba16float", blend: over }] } });
  const paintBG = device.createBindGroup({ layout: paintPipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: qb } }] });
  let roomPipe, roomBG;
  function needRoom() { if (roomPipe) return; const roomMod = shader(device, FS_VS + NOISE + WGSL + BUST + GAZE + VISITOR_MODEL + ROOM, "room");
    roomPipe = device.createRenderPipeline({ layout: "auto", vertex: { module: roomMod, entryPoint: "vs" }, fragment: { module: roomMod, entryPoint: "fs_room", targets: [{ format: "rgba16float", blend: over }] }, depthStencil: { format: "depth32float", depthWriteEnabled: true, depthCompare: "always" } });
    roomBG = ub.map((b, i) => device.createBindGroup({ layout: roomPipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: b } }, { binding: 1, resource: lin }, { binding: 2, resource: text.createView() }, { binding: 3, resource: { buffer: rb[i] } }] })); }
  // Seed the surface by height, then project once on the GPU onto the same posed
  // body that is ray marched in the room. Both households use this one buffer.
  const NG = qn("windowN", qn("join", 0) ? 46000 : qn("n", 46000));
  let glyBuf;
  if (includeGlyphs) {
    const R = atlas.info.groupRanges, pools = [["cn-kai", 4], ["cn-poem", 4], ["cn-xing", 2], ["cn-song", 2], ["cn-clerical", 1], ["cn-seal", 1], ["cn-oracle", 1], ["world-modern", 5], ["world-ancient", 1.5], ["word", 2]], tot = pools.reduce((s, x) => s + x[1], 0);
    const data = new Float32Array(NG * 8); let rs = 12345; const rnd = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < NG; i++) {
      const y = 1.675 * rnd() ** .77, angle = rnd() * 2 * Math.PI;
      const side = rnd() < .5 ? -1 : 1;
      let center = 0, radius = .155, depth = .09;
      if (y < .78) { center = side*.095; radius = .066; depth = .06; }
      else if (y > 1.42) { radius = .092; depth = .10; }
      else if (rnd() < .27) { center = side*.234; radius = .044; depth = .045; }
      const x = center + radius*Math.cos(angle), z = depth*Math.sin(angle);
      let k = rnd()*tot, gi = 0;
      while (k > pools[gi][1]) { k -= pools[gi][1]; gi++; }
      const [lo, hi] = R[pools[gi][0]];
      data.set([x, y, z, i*.37+rnd()*9, lo+Math.floor(rnd()*(hi-lo+1)),
        clamp(1-y/1.7+(rnd()-.5)*.15), 0, 0], i*8);
    }
    glyBuf = device.createBuffer({size:data.byteLength, usage:GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    device.queue.writeBuffer(glyBuf,0,data);
    const shape = shader(device, BUST + VISITOR_MODEL + `
      struct Point{ pos:vec4f, extra:vec4f }
      @group(0) @binding(0) var<storage,read_write> points:array<Point>;
      fn dist(p:vec3f)->f32 {return visitorDistance(vec3f(p.x,p.y-.78,-p.z)/.252);}
      @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3u){
        if(id.x>=arrayLength(&points)){return;}
        var p=points[id.x].pos.xyz;
        let e=vec2f(.00065,-.00065);
        for(var j=0;j<4;j++){
          let n=e.xyy*dist(p+e.xyy)+e.yyx*dist(p+e.yyx)+e.yxy*dist(p+e.yxy)+e.xxx*dist(p+e.xxx);
          p-=normalize(n+vec3f(1e-12,0.,0.))*clamp(dist(p),-.04,.06);
        }
        points[id.x].pos=vec4f(p,points[id.x].pos.w);
      }`, "window figure surface");
    const pipe = device.createComputePipeline({layout:"auto",compute:{module:shape,entryPoint:"main"}});
    const group = device.createBindGroup({layout:pipe.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:glyBuf}}]});
    const enc=device.createCommandEncoder(), pass=enc.beginComputePass();
    pass.setPipeline(pipe); pass.setBindGroup(0,group); pass.dispatchWorkgroups(Math.ceil(NG/64));
    pass.end(); device.queue.submit([enc.finish()]);
  }

  // ───────── timeline ─────────
  // Nothing cuts. Three pictures, each a continuous move, joined by transformations:
  //   A  55.9–74.8  ink night, gold. The window → along the façade → in through the glass, the figure gathers → out again: one in every window →
  //                 this one goes dark and comes apart → with the sparks across the night, in at another window, it gathers again →
  //                 back out and up: the whole estate dispersing and gathering, then only a shimmer
  //   B  74.3–79.5  (the shimmer recedes into the view from a window; ink flattens into planes) Hopper: one person at a lit window; in the glass, the gold figure
  //   C  78.7–88.4  (the reflection in the glass melts into reflections in water) Van Gogh: lamps trembling in a river, strokes coarsening, the sky starting to turn →
  //                 (the strokes close into line) Hokusai: the water rears into the great wave over a very small moon, and subsides into a moonlit swell
  const WY = 12 * 3.4 + 1.76, WZ = -16, D2R = Math.PI / 180;
  const rate = (t) => 1 + 2.2 * sm(70.5, 73.5, t), TW = (() => { const a = [0]; for (let i = 1; i <= 3300; i++) a.push(a[i - 1] + rate(55.9 + (i - .5) * .01) * .01); return (t) => { const k = clamp((t - 55.9) / .01, 0, 3299.999), i = Math.floor(k); return 40 + a[i] + (a[i + 1] - a[i]) * (k - i); }; })();
  const STEPS = qn("steps", 96), SEA = qn("sea", 40), MAZ = Math.PI + .075, MOON = (() => { const el = 7.2 * D2R; return [Math.sin(MAZ) * Math.cos(el), Math.sin(el), Math.cos(MAZ) * Math.cos(el)]; })();
  // monotone cubic through keys (Fritsch–Carlson); curveN does it per component
  function curve(x, y) { const n = x.length, d = [], m = new Array(n); for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2]; for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : 2 * d[i - 1] * d[i] / (d[i - 1] + d[i]);
    return (t) => { if (t <= x[0]) return y[0]; if (t >= x[n - 1]) return y[n - 1]; let i = 0; while (t > x[i + 1]) i++; const h = x[i + 1] - x[i], s = (t - x[i]) / h, s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * h * m[i + 1]; }; }
  const curveN = (keys, pick) => { const x = keys.map((k) => k[0]), n = [].concat(pick(keys[0])).length, cs = []; for (let j = 0; j < n; j++) cs.push(curve(x, keys.map((k) => [].concat(pick(k))[j]))); return (t) => cs.map((c) => c(t)); };
  // rooms on the hero façade (bay, floor); flip mirrors the layout. hair 0 short, 1 long, 2 knot.
  const base = { flip: 1, pose: 0, hair: 0, scale: 1, tile: 0, hero: 0, px: -.36, pz: 1.55, lean: .06, seed: .1, lamp: 1 };
  const HERO = { ...base, bi: 0, fi: 12, hero: 1 }, RB = { ...base, bi: -2, fi: 17, flip: -1, hair: 1, scale: .93, tile: 2, seed: .52, lamp: 0, lean: .1 }, RS = { ...base, bi: 1, fi: 24, pose: 1, hair: 1, seed: .2, lamp: -1, px: -.3, pz: .5 };
  const org = (R) => [R.bi * 3.2, R.fi * 3.4, WZ], inRoom = (R, p) => { const o = org(R); return [o[0] + p[0] * R.flip, o[1] + p[1], o[2] + p[2]]; };
  const FIG = { x: .9, z: 1.5, yaw: -2.05 }, SCREEN = [.42, 1.3, 2.86], PANEOUT = [.25, 1.9, -.1], figAmt = (tf, tr) => sm(.5, 2.3, tf) * (1 - sm(.2, 2.2, tr));
  const pitchTo = (ro, deg, yaw = 0) => [ro[0] + 100 * Math.sin(yaw) * Math.cos(deg * D2R), ro[1] + 100 * Math.sin(deg * D2R), ro[2] + 100 * Math.cos(yaw) * Math.cos(deg * D2R)];
  const mix3 = (a, b, w) => a.map((v, i) => lerp(v, b[i], w));
  // the moments
  const T = { form: 60.0, kindle: 61.5, dark: 63.55, release: 63.7, fly: 64.9, flight: 2.5, swap: 66.6, ask: 66.5, form2: 67.3, back: 71.4, cityOnly: 74.25,
    hopIn: [74.3, 75.4], oilIn: [78.7, 79.6], printIn: [81.0, 82.5], rear: [82.0, 84.5], brk: [85.2, 86.9], calm: [86.5, 87.8] };
  // the sparks' road from the hero's pane to the other window
  const road = (pts) => [mix3(pts[0], pts[1], -1), ...pts, mix3(pts[5], pts[4], -1)];
  const CPS = road([inRoom(HERO, PANEOUT), [0, 44.6, -22.5], [-3.5, 49.5, -34], [-8.2, 55.5, -35], [-9, 59.4, -26.5], inRoom(RB, PANEOUT)]);
  // other fires being handed on across the estate, seen as the camera pulls away: from a window on one side of the avenue, over it, to a window on the other. [start, seconds, road]
  const FIRES = Array.from({ length: 18 }, (_, i) => { const h = (k) => hash(i * 7.31, k), side = i % 2 ? 1 : -1, z0 = -24 - 22 * i - 30 * h(1), z1 = z0 - 20 - 60 * h(2), y0 = 22 + 60 * h(3), y1 = 22 + 60 * h(4), top = Math.max(y0, y1) + 8 + 14 * h(5);
    return [72.1 + 1.3 * h(6), 1.7 + .8 * h(7), road([[-25 * side, y0, z0], [-15 * side, lerp(y0, top, .7), lerp(z0, z1, .2)], [-4 * side, top, lerp(z0, z1, .42)], [6 * side, top - 2, lerp(z0, z1, .62)], [17 * side, lerp(y1, top, .6), lerp(z0, z1, .82)], [25 * side, y1, z1]])]; });
  // move A: [t, position, look-at, fov]
  const KA = [[55.92, [.30, 42.55, -19.2], [.12, 42.3, -14.4], 34], [57.5, [.22, 42.6, -19.0], [.12, 42.3, -14.4], 34], [58.6, [5.8, 44.6, -22.5], [4.6, 44.1, -16], 38], [59.6, [1.6, 43.6, -24], [.5, 42.8, -16], 42],
    [60.4, [-.2, 42.6, -17.9], [.5, 42.0, -14.3], 50], [61.0, [-.62, 42.32, -15.6], [.62, 41.98, -14.25], 56], [61.9, [-.8, 42.3, -15.46], [.62, 41.98, -14.25], 56],
    [62.5, [-.3, 42.65, -17.2], [.4, 42.1, -14.4], 50], [63.2, [1.2, 43.4, -25], [.2, 42.6, -16], 44], [64.4, [2.6, 43.8, -30], [.1, 43.0, -17], 44], [65.3, [3.4, 44.5, -33], [-1.0, 45.5, -24], 46],
    [66.1, [3.0, 46.5, -34], [-5, 51, -33], 48], [66.9, [.5, 50, -34], [-8.5, 56.5, -31], 50],
    [67.6, [-4, 54.5, -31], [-8.6, 59, -24], 50], [68.2, [-8.2, 58.6, -23.5], [-6.9, 59.3, -16], 48], [68.9, [-7.1, 59.75, -17.8], [-7.0, 59.0, -14.3], 50], [69.5, [-5.85, 59.35, -15.6], [-7.0, 59.0, -14.3], 56],
    [70.65, [-5.8, 59.35, -15.5], [-7.0, 59.0, -14.3], 56], [71.4, [-6.0, 59.6, -17.5], [-6.6, 59.3, -14.5], 50]];
  const aPos = curveN(KA, (k) => k[1]), aTa = curveN(KA, (k) => k[2]), aFov = curveN(KA, (k) => k[3]);
  function camA(t) { if (t <= T.back) return { ro: aPos(t), ta: aTa(t), fov: aFov(t)[0] };
    const d = 1.5 * Math.exp(2.089 * (t - T.back)), w = sm(T.back, 73, t), ro = [-6.0 * (1 - w), 59.6 + .265 * (d - 1.5), WZ - d];
    return { ro, ta: mix3([-6.6, 59.3, -14.5], pitchTo(ro, -17), sm(72.0, 73.6, t)), fov: lerp(50, 35, sm(T.back, 73, t)) }; }
  // move B: the room high on the façade (room coordinates). Out of the view through the pane, back and aside until the lit wall, the window and the one person compose; then in on the glass.
  const GLASSX = .42;      // where the gold figure stands in the reflection
  const KB = [[74.3, [.3, 1.55, .12], [.2, 1.3, -30], 46], [75.2, [.55, 1.5, 1.3], [.0, 1.4, -6], 46], [76.3, [1.12, 1.46, 3.25], [-.3, 1.42, .2], 47], [77.9, [1.05, 1.46, 3.1], [-.25, 1.42, .2], 46],
    [78.8, [.72, 1.48, 1.7], [.3, 1.42, -.5], 44], [79.6, [GLASSX + .04, 1.46, .32], [GLASSX, 1.38, -3], 42]].map((k) => [k[0], inRoom(RS, k[1]), inRoom(RS, k[2]), k[3]]);
  const bPos = curveN(KB, (k) => k[1]), bTa = curveN(KB, (k) => k[2]), bFov = curveN(KB, (k) => k[3]);
  const cityDef = { s: 0, hs: 1, heroOn: 1, ring: 1, path: 0, fig: 1, wave: 1, moonPane: 0, emb: [99, 99, 0] };
  const figDraw = (R, fg, extra) => ({ org: org(R), flip: R.flip, fig: [fg.x, 0, fg.z], yaw: fg.yaw, src: SCREEN, spread: [1.3, .68], snk: PANEOUT, sparks: .55, tf: 10, tr: 0, k: .052, mirror: 0, mode: 0, size: .007, cps: CPS, ...extra });
  function layerA(t) { const C = camA(t), heroOn = 1 - sm(T.dark, T.dark + .45, t), ask = sm(T.ask, T.ask + .4, t), R = t < T.swap ? HERO : RB, glyphs = [];
    const city = { ...cityDef, heroOn, fig: sm(T.kindle, T.kindle + 1.1, t), emb: [R.bi, R.fi, R === HERO ? heroOn : ask] };
    if (t >= T.cityOnly) return { ...C, city, post: { bloom: 1, tonemap: 1 } };
    const tfH = t - T.form, trH = t - T.release, tf2 = t - T.form2;
    if (tfH > 0 && trH < 4.2) glyphs.push(figDraw(HERO, FIG, { tf: tfH, tr: Math.max(trH, 0) }));
    const spark = { org: [0, 0, 0], flip: 1, fig: [0, 0, 0], yaw: 0, src: [0, 0, 0], spread: [0, 0], sparks: 0, tr: 0, mirror: 0, mode: 2 };
    if (t > T.fly && t < T.fly + T.flight + 2.7) glyphs.push({ ...spark, snk: [T.flight, 0, 0], tf: t - T.fly, k: .5, size: .012, cps: CPS, n: Math.floor(NG * .6) });
    if (tf2 > 0) glyphs.push(figDraw(RB, FIG, { tf: tf2, src: PANEOUT, spread: [.9, .7] }));
    for (const [t0, len, cps] of FIRES) if (t > t0 && t < t0 + len + 2.7 && glyphs.length < 22) glyphs.push({ ...spark, snk: [len, 0, 0], tf: t - t0, k: .2, size: .03 + .00045 * Math.max(0, -WZ - C.ro[2]), cps, n: Math.floor(NG * .08) });
    const room = R === HERO ? { R, screen: heroOn, lampK: 1 - .88 * sm(T.dark, T.dark + .6, t), typed: Math.floor(clamp((t - 56.05) / 1.45) * 13 + 1e-3), light: [FIG.x, FIG.z, figAmt(tfH, trH)] }
      : { R, screen: ask, lampK: 1, typed: clamp((t - T.ask - .3) / 1.2), light: [FIG.x, FIG.z, figAmt(tf2, 0)] };
    return { ...C, city, room, glyphs, post: { bloom: 1, tonemap: 1 } }; }
  function layerB(t) { const fg = { x: GLASSX, z: .7, yaw: Math.PI }, hop = sm(T.hopIn[0], T.hopIn[1] + .4, t);
    return { ro: bPos(t), ta: bTa(t), fov: bFov(t)[0], city: { ...cityDef, emb: [RS.bi, RS.fi, 0] }, room: { R: RS, screen: 0, lampK: 1, typed: 0, light: [fg.x, fg.z, 0], refl: lerp(.40, .68, hop), hop },
      glyphs: [figDraw(RS, fg, { mirror: 1, k: .075 * sm(74.9, 76.4, t) })], post: { bloom: lerp(1, .35, hop), tonemap: lerp(1, .25, hop) } }; }
  // the painted water: what the brush and the block are doing at time t
  function layerC(t) { const hok = sm(T.printIn[0], T.printIn[1], t), brk = sm(T.brk[0], T.brk[1], t), rise = sm(T.rear[0], T.rear[1], t) * (1 - .9 * sm(T.brk[1] - .5, T.brk[1] + .7, t));
    return { paint: [0, sm(79.9, 81.3, t), hok, rise, 0, sm(T.oilIn[1] - .5, T.oilIn[1] + .9, t), sm(T.calm[0], T.calm[1], t), brk, .1 * sm(80.2, 81.6, t), 0, 0, 0], post: { bloom: .1, tonemap: 0 } }; }
  const layers = (t) => t < T.hopIn[0] ? [[layerA(t), 1]] : t < T.hopIn[1] ? [[layerA(t), 1], [layerB(t), sm(T.hopIn[0], T.hopIn[1], t)]] : t < T.oilIn[0] ? [[layerB(t), 1]]
    : t < T.oilIn[1] ? [[layerB(t), 1], [layerC(t), sm(T.oilIn[0], T.oilIn[1], t)]] : [[layerC(t), 1]];

  function camera(ro, ta, fov) { const fw = norm(sub(ta, ro)), rt = norm(cross([0, 1, 0], fw)), up = cross(fw, rt), th = Math.tan(fov * D2R / 2), asp = g.W / g.H, n = .05, f = 400, k = f / (f - n);
    const row = (v, sc, w) => [v[0] * sc, v[1] * sc, v[2] * sc, -dot(v, ro) * sc + w], r0 = row(rt, 1 / (th * asp), 0), r1 = row(up, 1 / th, 0), r2 = row(fw, k, -n * k), r3 = row(fw, 1, 0), vp = new Float32Array(16);
    for (let c = 0; c < 4; c++) { vp[c * 4] = r0[c]; vp[c * 4 + 1] = r1[c]; vp[c * 4 + 2] = r2[c]; vp[c * 4 + 3] = r3[c]; } return { fw, rt, up, th, vp, n, f }; }

  function draw(t, output = g.ctx.getCurrentTexture().createView()) {
    const enc = device.createCommandEncoder(), caret = .5 + .5 * Math.cos(t * 5), Ls = layers(t); let gi = 0, bloom = 0, tone = 0;
    Ls.forEach(([L, w], i) => { const pw = Ls.length > 1 ? (i ? w : 1 - w) : 1; bloom += pw * (L.post?.bloom ?? 1); tone += pw * (L.post?.tonemap ?? 1);
      const color = [{ view: post.hdr, clearValue: [0, 0, 0, 1], loadOp: i ? "load" : "clear", storeOp: "store" }];
      if (L.paint) { device.queue.writeBuffer(qb, 0, new Float32Array([g.W, g.H, t, w, ...L.paint])); const p = enc.beginRenderPass({ colorAttachments: color }); p.setPipeline(paintPipe); p.setBindGroup(0, paintBG); p.draw(3); p.end(); return; }
      const C = camera(L.ro, L.ta, L.fov), c = L.city;
      device.queue.writeBuffer(ub[i], 0, new Float32Array([g.W, g.H, t, TW(t), ...L.ro, c.s, ...C.fw, C.th, ...C.rt, c.hs, ...C.up, 0, ...MOON, c.heroOn,
        0, STEPS, t, c.path, SEA, caret, .6, c.ring, c.fig, c.wave, c.moonPane, w, ...c.emb, 0]));
      if (!L.room) { const p = enc.beginRenderPass({ colorAttachments: color }); p.setPipeline(cityPipe); p.setBindGroup(0, cityBG[i]); p.draw(3); p.end(); return; }
      needRoom(); const rm = L.room, R = rm.R, o = org(R);
      device.queue.writeBuffer(rb[i], 0, new Float32Array([...o, R.flip, rm.light[0] * R.flip, 1.22, rm.light[1], rm.light[2], R.pose, R.hair, R.scale, R.tile,
        rm.screen, R.lamp < 0 ? -1 : R.lamp * rm.lampK, rm.typed, R.hero, R.px, R.pz, R.lean, R.seed, C.n, C.f, rm.refl || 0, 1, rm.hop || 0, Math.cos(R === RS ? Math.PI : FIG.yaw), Math.sin(R === RS ? Math.PI : FIG.yaw), 0]));
      const p = enc.beginRenderPass({ colorAttachments: color, depthStencilAttachment: { view: post.depth, depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "store" } });
      p.setPipeline(roomPipe); p.setBindGroup(0, roomBG[i]); p.draw(3);
      if (L.glyphs.length) { p.setPipeline(glyPipe); p.setVertexBuffer(0, glyBuf);
        for (const G of L.glyphs) { device.queue.writeBuffer(pb[gi], 0, new Float32Array([...C.vp, ...C.rt, G.size, ...C.up, t, ...G.org, G.flip, ...G.fig, G.yaw, ...G.src, 0, G.tf, G.tr, G.k * w, G.mirror, 1, G.mode, ...G.spread, ...G.snk, G.sparks, ...G.cps.flatMap((q) => [...q, 0])]));
          p.setBindGroup(0, glyBG[gi]); p.draw(6, G.n || NG); gi++; } }
      p.end(); });
    post.run(enc, output, { bloom, threshold: .8, knee: .6, exposure: lerp(1, 1.25, tone), tonemap: tone, bars: 0, grain: .035, vignette: lerp(.2, .5, tone), time: t });
    device.queue.submit([enc.finish()]);
  }
  return { draw };
}
