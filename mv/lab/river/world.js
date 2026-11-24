// The stroke that is a river: geometry of the channel, the glyph families, the first placement of the characters.
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); }, fr = (x) => x - Math.floor(x);
const h1 = (i, k = 0) => fr(Math.sin(i * 127.1 + k * 311.7 + 17.3) * 43758.5453);
const vn = (x, k) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return h1(i, k) * (1 - u) + h1(i + 1, k) * u; };
export const MOUTH = 206, X0 = -32, Z0 = -6, WX = 64, WZ = 256;
export const cxf = (z) => 7 * Math.sin(z * .021 + .5) + 2.5 * Math.sin(z * .047 + 1.3);
export const FIG = { x: cxf(MOUTH) * .6, z: 279, s: 30 };
// five tributaries (across: cuneiform, hieroglyphs, Chinese, alphabets, digits and code): the split hairs where the brush first touched the paper
const TR = [{ off: -2, hw: 1.7, z0: 13 }, { off: -1, hw: 2.4, z0: 5 }, { off: 0, hw: 2.8, z0: 0 }, { off: 1, hw: 2.2, z0: 8 }, { off: 2, hw: 1.7, z0: 16 }];
const HWM = 6.5, fan = (z) => Math.pow(sm(88, 8, z), 1.15);
const xk = (k, z) => cxf(z) + (TR[k].off * 10.5 + 1.8 * Math.sin(z * .09 + k * 2.1)) * fan(z);
const hwk = (k, z) => z < TR[k].z0 ? -1 : TR[k].hw * Math.pow(sm(TR[k].z0, TR[k].z0 + 8, z), .7) * (1 + .16 * (vn(z * .33, k + 3) - .5)) * (1 - sm(84, 96, z));
const hwm = (z) => z < 60 ? -1 : (z < 180 ? HWM * sm(57, 76, z) * (1 + .14 * (vn(z * .21, 11) - .5) * sm(184, 170, z)) : HWM + (Math.min(z, MOUTH) - 180) / 26 * 13 * (z > MOUTH ? 1 + (z - MOUTH) / 26 * 1.6 : 1));
const rel = (z) => z < 60 ? .6 : z < 92 ? .6 + .4 * sm(60, 92, z) : z < 180 ? 1 : z < MOUTH ? HWM / hwm(z) : 0;
// bars (the flying white of the dry brush), stones, and the bars of the delta
const BARS = [], STONES = [];
for (let i = 0; i < 7; i++) STONES.push({ z: 99 + i * 12 + 3 * h1(i, 21), u: [-.62, .38, -.18, .66, -.46, .12, .52][i], r: .7 + .6 * h1(i, 23) });
function f(x, z) {                                   // > 0 in the water, about the distance to the nearest bank
  let d = -8; for (let k = 0; k < 5; k++) { const hw = hwk(k, z); if (hw > 0) d = Math.max(d, hw - Math.abs(x - xk(k, z))); }
  const H = hwm(z), c = cxf(z); if (H > 0) d = Math.max(d, H - Math.abs(x - c)); if (z > MOUTH - .5) d = Math.max(d, Math.min(z - MOUTH + .5, 8));
  for (const b of BARS) { const dz = z - b.z; if (Math.abs(dz) > b.l + 3) continue; const dx = x - (c + b.u * (b.delta ? H * .82 : HWM * .78)), w = b.delta ? b.w * Math.max(.25, 1 + .12 * dz) : b.w; d = Math.min(d, (Math.hypot(dx / w, dz / b.l) - 1) * w); }
  for (const s of STONES) { const dz = z - s.z; if (Math.abs(dz) > s.r + 3) continue; d = Math.min(d, Math.hypot(x - (c + s.u * HWM * .7), dz) - s.r); }
  return d; }
function dir(x, z) { let best = -1e9, dx = 0, e = .5; for (let k = 0; k < 5; k++) { const hw = hwk(k, z); if (hw > 0 && hw - Math.abs(x - xk(k, z)) > best) { best = hw - Math.abs(x - xk(k, z)); dx = (xk(k, z + e) - xk(k, z - e)); } }
  const H = hwm(z); if (H > 0 && H - Math.abs(x - cxf(z)) > best) dx = cxf(z + e) - cxf(z - e); let vx = dx, vz = 1;
  if (z > 178) { const rx = x - cxf(180), rz = z - 150, k = sm(178, 190, z); vx = vx * (1 - k) + rx / rz * k; } const l = Math.hypot(vx, vz); return [vx / l, vz / l]; }

// stream function ψ/Q: the share of the river's water that passes to the left of a point. Constant on every bank, bar and stone, so no water crosses them.
const SUMHW = TR.reduce((a, t) => a + t.hw, 0), CUM = [0]; TR.forEach((t) => CUM.push(CUM[CUM.length - 1] + t.hw / SUMHW));
function fracTrib(x, z) { for (let k = 0; k < 5; k++) { const hw = Math.max(hwk(k, z), .35), xl = xk(k, z) - hw; if (x <= xl) return CUM[k]; if (x < xl + 2 * hw) return CUM[k] + (CUM[k + 1] - CUM[k]) * (x - xl) / (2 * hw); } return 1; }
function fracMain(x, z) { const H = Math.max(hwm(Math.max(z, 62)), .6); return cl(((x - cxf(Math.min(z, MOUTH))) / H + 1) / 2); }
function frac(x, z) { const m = sm(60, 80, z); return m <= 0 ? fracTrib(x, z) : m >= 1 ? fracMain(x, z) : fracTrib(x, z) * (1 - m) + fracMain(x, z) * m; }
function psi(x, z) { const c = cxf(z), H = hwm(z);
  for (const b of BARS) { const dz = z - b.z; if (Math.abs(dz) > b.l + 1) continue; const xc = c + b.u * (b.delta ? H * .82 : HWM * .78), w = b.delta ? b.w * Math.max(.25, 1 + .12 * dz) : b.w; if (Math.hypot((x - xc) / w, dz / b.l) < 1) { const zc = b.z; return frac(cxf(zc) + b.u * (b.delta ? hwm(zc) * .82 : HWM * .78), zc); } }
  for (const s of STONES) { if (Math.hypot(x - (c + s.u * HWM * .7), z - s.z) < s.r) return frac(cxf(s.z) + s.u * HWM * .7, s.z); }
  if (f(x, z) <= 0) return z < 100 ? fracTrib(x, z) : fracMain(x, z);          // land: one value per bank and per wedge between tributaries, so nothing leaks through
  return frac(x, z); }
export const QFLOW = 2 * HWM;
export function buildWorld(GX, GZ, info) { const psi0 = new Float32Array(GX * GZ); const cs = WX / GX, field = new Uint8Array(GX * GZ * 4), deco = new Uint8Array(GX * GZ * 4);
  for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) { const x = X0 + (i + .5) * cs, z = Z0 + (j + .5) * cs, d = f(x, z), [dx, dz] = dir(x, z), o = (j * GX + i) * 4;
    psi0[j * GX + i] = psi(x, z); let a = rel(z) * .8; for (let k = 0; k < 5; k++) if (z > TR[k].z0 + 1 && z < TR[k].z0 + 6 && hwk(k, z) - Math.abs(x - xk(k, z)) > 0) a = 1;       // head: where the water comes from
    field[o] = Math.round((dx * .5 + .5) * 255); field[o + 1] = Math.round((dz * .5 + .5) * 255); field[o + 2] = Math.round(cl(d / 16 + .5) * 255); field[o + 3] = Math.round(a * 255);
    let st = 0; const c = cxf(z); for (const s of STONES) { const dd = Math.hypot(x - (c + s.u * HWM * .7), z - s.z) - s.r; st = Math.max(st, 1 - sm(-.35, .12, dd)); }
    const lat = (x - c) / Math.max(hwm(z), 3) * HWM, lane = sm(.50, .70, vn(lat * 1.15 + 2.5 * vn(z * .013, 31), 32) * .62 + vn(lat * 3.7 + 9, 33) * .38) * sm(.30, .62, vn(z * .05 + lat * .25, 34)), dryAmt = sm(92, 112, z) * (.55 + .45 * sm(150, 200, z)), streak = 1 - lane * dryAmt;
    deco[o] = Math.round(st * 255); deco[o + 1] = Math.round(cl(streak) * 255); deco[o + 2] = Math.round(cl((z - 150) / 60) * 255); deco[o + 3] = 255; }
  // glyph families
  const G = info.glyphs, R = info.groupRanges, grp = (n) => G.slice(R[n][0], R[n][1] + 1), cp = (gl) => gl.text.codePointAt(0), inR = (c, a, b) => c >= a && c <= b;
  const isHiero = (gl) => inR(cp(gl), 0x13000, 0x1345F) || inR(cp(gl), 0x14400, 0x1467F) || inR(cp(gl), 0x10000, 0x100FF), isClay = (gl) => inR(cp(gl), 0x12000, 0x1254F) || inR(cp(gl), 0x10380, 0x103DF) || inR(cp(gl), 0x10900, 0x1091F) || inR(cp(gl), 0x10A60, 0x10A7F);
  const anc = grp("world-ancient"), word = grp("word"), w0 = word.findIndex((gl) => gl.text === "0");
  const fam = [anc.filter(isClay), anc.filter(isHiero), [...anc.filter((gl) => !isClay(gl) && !isHiero(gl)), ...grp("world-modern"), ...word.slice(0, w0)], [...word.slice(w0), ...grp("symbol")]].map((l) => l.map((gl) => gl.i));
  const styles = ["cn-oracle", "cn-bronze", "cn-bigseal", "cn-seal", "cn-clerical", "cn-kai", "cn-song"].map((n) => Object.fromEntries(grp(n).map((gl) => [gl.text, gl.i]))), chars = grp("cn-kai").map((gl) => gl.text), cn = [];
  for (const ch of chars) for (let s = 0; s < 7; s++) { let id = styles[s][ch]; for (let q = 1; id === undefined && q < 7; q++) id = styles[s + q]?.[ch] ?? styles[s - q]?.[ch]; cn.push(id); }
  const head = [], data = []; let off = 10; for (const l of fam) { head.push(off, l.length); data.push(...l); off += l.length; } head.push(off, chars.length); data.push(...cn);
  const lists = new Uint32Array([...head, ...data]);
  const heads = TR.map((t, k) => [xk(k, t.z0 + 3.5), t.z0 + 3.5, hwk(k, t.z0 + 3.5), 0]);
  // characters: where each one is when the picture starts. Family k = (i*37)%100 → 13/13/30/28/16 %, as in the shader
  const tribOf = (i) => { const m = (i * 37) % 100; return m < 13 ? 0 : m < 26 ? 1 : m < 56 ? 2 : m < 84 ? 3 : 4; }, cum = [0, .13, .26, .56, .84, 1];
  function particles(N, reserve) { const a = new Float32Array(N * 12);
    let seed = 0x5f3759df;
    const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < N; i++) { const o = i * 12, k = tribOf(i); let x = 0, z = 0, y = 0, kind = 0, seaT = 0;
      if (((i * 53) % 1000) / 1000 < reserve) { kind = 2; x = FIG.x; z = FIG.z - 20; y = -1; }
      else for (let n = 0; n < 60; n++) { z = TR[k].z0 + 1 + random() * (MOUTH + 16 - TR[k].z0 - 1); const r = rel(z); if (random() > .55 / Math.max(r, .2)) continue;
        if (z > MOUTH) { x = cxf(MOUTH) + (random() * 2 - 1) * hwm(z) * .95; seaT = (z - MOUTH) / 16 * 4.5; break; }   // some are already in the sea, so the heads are fed from the first second
        const lo = cum[k] * 2 - 1, hi = cum[k + 1] * 2 - 1, u = random(), xt = xk(k, z) + (u * 2 - 1) * Math.max(0, hwk(k, z)), H = Math.max(0, hwm(z)), xm = cxf(z) + (lo + (hi - lo) * u + (random() - .5) * .25 * sm(100, 190, z)) * H * .97, m = sm(62, 84, z);
        x = xt * (1 - m) + xm * m; if (f(x, z) > .18) break; }
      a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = 2 + random() * 20; a[o + 5] = seaT; a[o + 7] = kind; a[o + 8] = kind ? 0 : 1; }
    return a; }
  return { field, deco, lists, heads, particles, psi0 }; }
