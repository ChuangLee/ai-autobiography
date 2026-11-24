// Shots that dropped out of verse 1 when the storyboard changed, kept for reuse elsewhere in the film. Not loaded by the page.
// Their shaders live on: CORDS_FS, RELAY_FS and the four-eyed face (MUD_FS with U.b.x = 1) in classics.js; the 3D voice rings (sea.js mode 0),
// the glyph rain of mode 2, the spreading sea of mode 1; the dry-brush stroke seen from straight above and the drop into it (river world cameras).
// Below: the timeline of the 18-shot cut as it stood (cameras, timings), verbatim.
export const ARCHIVE_18_SHOT_CUT = String.raw`
// ───────── the other worlds of the verse: the first water (sea.js) and the night writing was made (night.js). No simulation state: pure functions of time ─────────
const NS = Math.max(1000, Math.round(qn("ns", 120000))), seaSize = .62 * Math.sqrt(120000 / NS);
const seaM = shader(device, FS_VS + NOISE + COMMON + SEA_BG, "sea"), seaG = shader(device, NOISE + COMMON + SEA_GLYPH, "sea-glyphs");
const fsPipe = (m) => device.createRenderPipeline({ layout: "auto", vertex: { module: m, entryPoint: "vs" }, fragment: { module: m, entryPoint: "fs", targets: [{ format: "rgba16float" }] } });
const P_seaBg = fsPipe(seaM), subS = device.createBuffer({ size: 224, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }), subR = device.createBuffer({ size: 224, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
const P_seaInk = device.createRenderPipeline({ layout: "auto", vertex: { module: seaG, entryPoint: "vs" }, fragment: { module: seaG, entryPoint: "fsInk", targets: [{ format: "rgba16float", blend: { color: { srcFactor: "zero", dstFactor: "one-minus-src" }, alpha: { srcFactor: "zero", dstFactor: "one" } } }] } });
const B_seaBg = bg(P_seaBg, [{ buffer: subS }]), seaBG = (ub) => bg(P_seaInk, [{ buffer: ub }, { buffer: lists }, atlas.sampler, atlas.tex.createView()]), B_seaInk = seaBG(subS), B_seaInkR = seaBG(subR);
const nub = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
const P_cang = fsPipe(shader(device, FS_VS + NOISE + CANGJIE_FS, "cangjie")), P_ghost = fsPipe(shader(device, FS_VS + NOISE + BUST + GHOST_FS.replace('//STATUE', STATUE), "ghosts"));
const nightBG = (p) => bg(p, [{ buffer: nub }, atlas.sampler, atlas.tex.createView()]), B_cang = nightBG(P_cang), B_ghost = nightBG(P_ghost);
const ORACLE = atlas.info.groupRanges["cn-oracle"][0];

// ───────── the cut: one shot every two or three seconds, on the phrase starts. w = which world is drawn; cam(u) with u = 0…1 through the shot ─────────
const FX = FIG.x, FZ = FIG.z, S = FIG.s, c = cxf, WL = FZ - .36 * S, e3 = (u) => u * u * (3 - 2 * u), out2 = (u) => 1 - (1 - u) * (1 - u);
const SHOTS = [
  // 人开口了十万年: voices leave rings on empty water, and the rings die
  { t: 18.9, w: "sea", mode: 0, cam: (u) => ({ eye: [0, lerp(8.5, 7.4, u), lerp(-37, -32, u)], tgt: [0, 0, 2], fov: 44, focus: 34 }) },
  { t: 20.4, w: "sea", mode: 0, cam: (u) => ({ eye: [lerp(12, 10.5, u), 1.7, lerp(-7, -5.5, u)], tgt: [2, 0, 6], fov: 40, focus: 13 }) },
  // 才有文字记下传说: the first characters fall, and where they land they stay standing; then the sea of them spreads
  { t: 21.92, w: "sea", mode: 1, cam: (u) => ({ eye: [lerp(2.8, 1.8, u), lerp(1.9, 2.5, u), lerp(-8.5, -11, u)], tgt: [0, 1.3, 0], fov: 42, focus: 10 }) },
  { t: 24.0, w: "sea", mode: 1, cam: (u) => { const e = ease(u); return { eye: [0, lerp(5, 64, e), lerp(-16, -72, e)], tgt: [0, 0, lerp(4, 26, e)], fov: 46, focus: lerp(17, 112, e) }; } },
  // 人又写了几千年: one dry-brush stroke on paper; drop into it: it moves, it is characters
  { t: 26.43, w: "river", cam: (u) => ({ eye: [c(104) + 10, lerp(226, 204, u), 96], tgt: [c(104), 0, 104], fov: 38, focus: 215, roll: 1 }) },
  { t: 27.9, w: "river", cam: (u) => { const e = out2(u); return { eye: [c(96) + lerp(22, 9, e), lerp(60, 8.5, e), lerp(76, 97, e)], tgt: [c(116), 0, lerp(106, 118, e)], fov: 46, focus: lerp(68, 22, e) }; } },
  // 字才汇成文明的河: rain of characters into rippling water; pull back: five tributaries braid into one
  { t: 29.45, w: "sea", mode: 2, cam: (u) => ({ eye: [lerp(-9, -7, u), lerp(3.4, 3.0, u), lerp(-15, -13, u)], tgt: [0, 3.3, 6], fov: 50, focus: 16 }) },
  { t: 31.4, w: "river", cam: (u) => { const e = e3(u); return { eye: [c(86) + lerp(3, 9, e), lerp(8, 40, e), lerp(96, 122, e)], tgt: [c(44), 0, lerp(62, 46, e)], fov: 48, focus: lerp(36, 86, e) }; } },
  // 造字的那一夜 / 听说有鬼哭过 / 鬼哭的是什么 / 至今没人说破
  { t: 33.61, w: "cangjie", v: 0 }, { t: 35.47, w: "ghost", v: 0 }, { t: 37.30, w: "ghost", v: 1 }, { t: 39.26, w: "cangjie", v: 1 },
  // 河水不回答: the river mouth; the sea is the unpainted part of the picture. The move comes to rest
  { t: 41.53, w: "river", cam: (u) => { const e = out2(u); return { eye: [lerp(c(180) + 1, c(198) * .3 + FX * .7, e), lerp(2.6, 1.5, e), lerp(177, 198, e)], tgt: [lerp(c(196), FX, e), lerp(.2, 1.0, e), lerp(194, 226, e)], fov: 50, focus: lerp(9, 12, e) }; } },
  // 从此流着汇聚成我: for the first time the water flows up
  { t: 44.58, w: "river", cam: (u) => ({ eye: [FX + lerp(9.5, 7.5, u), lerp(1.3, 2.4, u), WL - 13], tgt: [FX - 1, lerp(1.4, 5.5, u), WL], fov: 42, focus: 14 }) },
  { t: 46.5, w: "river", cam: (u) => ({ eye: [FX - lerp(36, 33, u), lerp(6, 8, u), FZ - 52], tgt: [FX + 3, lerp(17, 27, u), FZ], fov: 46, focus: 62 }) },
  { t: 48.67, w: "river", cam: (u) => ({ eye: [FX, 3.2, lerp(199, 201.5, u)], tgt: [FX, S * lerp(1.06, 1.17, u), FZ], fov: 52, focus: 78 }) },
  { t: 51.0, w: "river", cam: (u) => ({ eye: [FX + lerp(29, 25, u), S * lerp(.9, 1.0, u), FZ - 46], tgt: [FX - 1, S * lerp(1.2, 1.3, u), FZ - 6], fov: 30, focus: 50 }) },
  { t: 53.5, w: "river", cam: (u) => ({ eye: [FX - lerp(13, 11, u), 2.4, FZ - lerp(66, 63, u)], tgt: [FX + 1, S * lerp(1.38, 1.45, u), FZ], fov: 50, focus: 76 }) },
  { t: 56.01 },
];
function shotAt(t) { let i = 0; while (i < SHOTS.length - 2 && t >= SHOTS[i + 1].t) i++; const s = SHOTS[i]; return { s, i, u: clamp((t - s.t) / (SHOTS[i + 1].t - s.t)), tl: t - s.t }; }
function basis(k) { const roll = k.roll || 0, up0 = norm([.9 * roll, 1 - roll * .999, .42 * roll]), F = norm(sub(k.tgt, k.eye)), R = norm(cross(F, up0)), Up = cross(R, F); return { eye: k.eye, F, R, Up, fov: k.fov * Math.PI / 180, focus: Math.max(3, k.focus) }; }
function riverCam(t) { if (qn("topz", 0)) { const z = qn("topz", 0), h = qn("toph", 60); return { eye: [c(z), h, z], F: [0, -1, 0], R: [0, 0, 1], Up: [1, 0, 0], fov: .7, focus: h }; }
  let { s, i, u } = shotAt(t); while (s.w !== "river") { s = SHOTS[++i]; u = 0; } return basis(s.cam(u)); }
const camU = (a, cam, t) => { a.set([...cam.eye, t], 0); a.set([...cam.R, Math.tan(cam.fov / 2)], 4); a.set([...cam.Up, g.W / g.H], 8); a.set([...cam.F, 0], 12); };

const sizeR = clamp(Math.sqrt(4100 * 1.5 / (N * (1 - RESERVE))), .13, 1.0), sizeF = .40 * Math.sqrt(420000 / N) * S / 32;
function uniforms(t, dt) { const cam = riverCam(t), night = sm(33.7, 36.5, t), rise = sm(RISE, RISE + 5, t), Uup = lerp(17, 6.5, sm(RISE + .5, RISE + 8, t)) * S / 24;
  const a = new Float32Array(56); camU(a, cam, t); a[15] = night;
  a.set([sizeR, cam.focus, lerp(.09, .035, night), N], 16); a.set([FX, FZ, S, sizeF], 20); a.set([rise, MOUTH, 1, qn("gold", .5)], 24); a.set([g.W, g.H, dt, RISE], 28);
  world.heads.forEach((h, k) => a.set(h, 32 + k * 4)); a[39] = qn("lod", .6); a[43] = qn("skin", 1); a.set([Uup, RISE + 1.2, RESERVE, S * 3.1 * sm(RISE + .3, RISE + 4.4, t)], 52); return a; }

let frame = 0; const NOSIM = qn("nosim", 0);
const scene = {
  reset() { frame = 0; device.queue.writeBuffer(pbuf, 0, init);
    device.queue.writeBuffer(fub, 0, fluidU(1 / 30));
    let enc = device.createCommandEncoder(); const c0 = enc.beginComputePass(); c0.setPipeline(P_init); c0.setBindGroup(0, B_init); c0.dispatchWorkgroups(WX, WZ); c0.end(); device.queue.submit([enc.finish()]);
    for (let i = 0; i < WARM; i++) { enc = device.createCommandEncoder(); fluidStep(enc, 0, 1 / 30); device.queue.submit([enc.finish()]); } },
  // the river and its characters are simulated through every shot, seen or not, so the water is continuous under the cuts
  step(dt, t) { if (NOSIM) return; const enc = device.createCommandEncoder(); if (frame % 2 === 0) fluidStep(enc, t, dt * 2); frame++;
    device.queue.writeBuffer(gub, 0, uniforms(t, dt)); const cp = enc.beginComputePass(); cp.setPipeline(P_sim); cp.setBindGroup(0, B_sim); cp.dispatchWorkgroups(N / 64); cp.end(); device.queue.submit([enc.finish()]); },
  draw(t) { const { s, u, tl } = shotAt(t), enc = device.createCommandEncoder(), p = enc.beginRenderPass(post.pass([0, 0, 0, 1], false)); let po;
    if (s.w === "river") { const a = uniforms(t, 0), night = a[15]; device.queue.writeBuffer(gub, 0, a); const r = a.slice(); r[26] = -1; device.queue.writeBuffer(gubR, 0, r);
      p.setPipeline(P_bg); p.setBindGroup(0, B_bg); p.draw(3);
      if (night < .999) { p.setPipeline(P_ink); p.setBindGroup(0, B_ink); p.draw(6, N); }
      if (night > .001) { p.setPipeline(P_light); if (a[24] > 0) { p.setBindGroup(0, B_lightR); p.draw(6, N); } p.setBindGroup(0, B_light); p.draw(6, N); }
      po = { bloom: lerp(0, 1.1, night), threshold: .9, knee: .6, tonemap: night, bars: 1 - sm(48.67, 49.4, t), grain: lerp(.018, .03, night), vignette: lerp(.22, .5, night) };
    } else if (s.w === "sea") { const cam = basis(s.cam(u)), a = new Float32Array(56); camU(a, cam, t); a.set([seaSize, cam.focus, .05, NS], 16); a.set([s.mode, 150, 29.25, 0], 20); a.set([0, 0, 1, 0], 24); a.set([g.W, g.H, 0, 0], 28);
      device.queue.writeBuffer(subS, 0, a); const r = a.slice(); r[26] = -1; device.queue.writeBuffer(subR, 0, r);
      p.setPipeline(P_seaBg); p.setBindGroup(0, B_seaBg); p.draw(3);
      if (s.mode > 0) { p.setPipeline(P_seaInk); p.setBindGroup(0, B_seaInkR); p.draw(6, NS); p.setBindGroup(0, B_seaInk); p.draw(6, NS); }
      po = { bloom: 0, tonemap: 0, bars: 1, grain: .018, vignette: .22 };
    } else { device.queue.writeBuffer(nub, 0, new Float32Array([t, u, g.W, g.H, s.v, ORACLE, tl, 0]));
      if (s.w === "cangjie") { p.setPipeline(P_cang); p.setBindGroup(0, B_cang); } else { p.setPipeline(P_ghost); p.setBindGroup(0, B_ghost); } p.draw(3);
      po = { bloom: 1.0, threshold: .9, knee: .6, tonemap: 1, bars: 1, grain: .032, vignette: .5 }; }
    p.end(); post.run(enc, g.ctx.getCurrentTexture().createView(), { exposure: 1, time: t, ...po }); device.queue.submit([enc.finish()]); },
};
window.__shots = SHOTS.slice(0, -1).map((s) => s.t);
// the still-frame server drops idle connections after 5 s; a failed first request here makes the browser reconnect before run() fetches the song
for (let k = 0; k < 3; k++) { try { await fetch("../../song.json", { cache: "no-store" }); break; } catch (e) {} }
run({ g, seg: [qn("t0", 18.9), 56.0], scene, title: "样片 A · 第一段：从声音到“我”", captions: [[18.9, 22.9, "本视频全部由 Claude 用代码生成"]],
  notes: { 0: "人类大概在9万多年前发展出语言", 1: "人类大概在5千年前发明文字", 3: "楔形字、圣书字、汉字、各种字母、数字与代码，各成一条", 4: "《淮南子》：昔者苍颉作书，而天雨粟，鬼夜哭", 6: "原诗：鬼哭当年缘底事　早知今夜字成精", 9: "大语言模型由人类写下的文字训练而成" } });

`;
