// Shared base for the code-only MV scenes (WebGPU only).
//   initGPU(canvas)            device, context, format; shader() reports compile errors on the page and in window.__err
//   Post                       HDR target + depth, bloom, tone mapping, grain, vignette, letterbox
//   loadAtlas(device)          the atlas of real glyphs (mv/glyphs) as a mip-mapped texture + its JSON
//   run({...})                 plays a segment of the song against a scene {reset(), step(dt,t), draw(t)}; lyrics and notes; ?t= for stills
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const fract = (x) => x - Math.floor(x);
export const hash = (i, k = 0) => fract(Math.sin(i * 127.1 + k * 311.7 + 17.3) * 43758.5453);
export const ease = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const Q = new URLSearchParams(location.search);
export const qn = (k, d) => Q.has(k) ? +Q.get(k) : d;

const filmHost = (() => {
  if (!Q.has("film") || parent === window) return null;
  try { return parent.location.origin === location.origin && typeof parent.sceneReady === "function" ? parent : null; }
  catch { return null; }
})();
if (filmHost) {
  addEventListener("error", e => { if (e.message) filmHost.sceneFailed?.(window, e.message); });
  addEventListener("unhandledrejection", e => filmHost.sceneFailed?.(window, String(e.reason)));
}
function fail(msg) { filmHost?.sceneFailed?.(window, msg); window.__err = (window.__err || "") + msg + "\n"; console.error(msg);
  let e = document.getElementById("err"); if (!e) { e = document.createElement("pre"); e.id = "err"; e.style.cssText = "position:fixed;left:0;top:0;right:0;max-height:60%;overflow:auto;margin:0;padding:12px 16px;background:#200;color:#fbb;font:13px/1.5 ui-monospace,monospace;z-index:99;white-space:pre-wrap"; document.body.appendChild(e); }
  e.textContent = window.__err; }
export { fail };

export async function initGPU(canvas, W = 1920, H = 1080) {
  const res = qn("res", 1); canvas.width = Math.round(W * res); canvas.height = Math.round(H * res);
  if (!navigator.gpu) { fail("这个页面需要 WebGPU。请用新版 Chrome、Edge、Safari 26 或 Firefox 打开。"); throw new Error("no webgpu"); }
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) { fail("没有拿到 WebGPU 显卡适配器。"); throw new Error("no adapter"); }
  const feats = ["float32-filterable"].filter((f) => adapter.features.has(f)), L = adapter.limits;
  const device = await adapter.requestDevice({ requiredFeatures: feats, requiredLimits: { maxBufferSize: L.maxBufferSize, maxStorageBufferBindingSize: L.maxStorageBufferBindingSize, maxComputeWorkgroupStorageSize: L.maxComputeWorkgroupStorageSize, maxTextureDimension2D: L.maxTextureDimension2D, maxTextureDimension3D: L.maxTextureDimension3D, maxStorageBuffersPerShaderStage: L.maxStorageBuffersPerShaderStage, maxStorageTexturesPerShaderStage: L.maxStorageTexturesPerShaderStage, maxSampledTexturesPerShaderStage: L.maxSampledTexturesPerShaderStage } });
  device.addEventListener("uncapturederror", (e) => fail("GPU: " + e.error.message));
  const ctx = canvas.getContext("webgpu"), format = navigator.gpu.getPreferredCanvasFormat(); ctx.configure({ device, format, alphaMode: "opaque" });
  let disposed = false;
  const dispose = () => { if (!disposed) { disposed = true; ctx.unconfigure(); device.destroy(); } };
  if (filmHost) addEventListener("pagehide", dispose, { once: true });
  return { device, ctx, format, W: canvas.width, H: canvas.height, adapter, dispose, f32filter: feats.includes("float32-filterable") };
}
export function shader(device, code, label = "shader") { const m = device.createShaderModule({ code, label });
  m.getCompilationInfo().then((i) => { const errs = i.messages.filter((x) => x.type === "error"); if (errs.length) fail(label + ":\n" + errs.map((x) => `  ${x.lineNum}:${x.linePos} ${x.message}\n    ${code.split("\n")[x.lineNum - 1] || ""}`).join("\n")); }); return m; }

export const FS_VS = `@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{ let p=vec2f(f32((i<<1u)&2u),f32(i&2u)); return vec4f(p*2.-1.,0.,1.); }`;
// WGSL noise helpers scenes can prepend
export const NOISE = `
fn hash11(p:f32)->f32{ var q=fract(p*.1031); q*=q+33.33; q*=q+q; return fract(q); }
fn hash21(p:vec2f)->f32{ var q=fract(vec3f(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
fn hash22(p:vec2f)->vec2f{ var q=fract(vec3f(p.xyx)*vec3f(.1031,.1030,.0973)); q+=dot(q,q.yzx+33.33); return fract((q.xx+q.yz)*q.zy); }
fn hash31(p:vec3f)->f32{ var q=fract(p*.1031); q+=dot(q,q.zyx+31.32); return fract((q.x+q.y)*q.z); }
fn hash33(p:vec3f)->vec3f{ var q=fract(p*vec3f(.1031,.1030,.0973)); q+=dot(q,q.yxz+33.33); return fract((q.xxy+q.yxx)*q.zyx); }
fn vnoise(p:vec2f)->f32{ let i=floor(p); let f=fract(p); let u=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2f(1.,0.)),u.x),mix(hash21(i+vec2f(0.,1.)),hash21(i+vec2f(1.,1.)),u.x),u.y); }
fn vnoise3(p:vec3f)->f32{ let i=floor(p); let f=fract(p); let u=f*f*(3.-2.*f);
  return mix(mix(mix(hash31(i),hash31(i+vec3f(1.,0.,0.)),u.x),mix(hash31(i+vec3f(0.,1.,0.)),hash31(i+vec3f(1.,1.,0.)),u.x),u.y),
             mix(mix(hash31(i+vec3f(0.,0.,1.)),hash31(i+vec3f(1.,0.,1.)),u.x),mix(hash31(i+vec3f(0.,1.,1.)),hash31(i+vec3f(1.,1.,1.)),u.x),u.y),u.z); }
fn fbm(p:vec2f)->f32{ var a=.5; var s=0.; var q=p; for(var i=0;i<5;i++){ s+=a*vnoise(q); q=mat2x2f(1.6,1.2,-1.2,1.6)*q; a*=.5; } return s; }
fn fbm3(p:vec3f)->f32{ var a=.5; var s=0.; var q=p; for(var i=0;i<4;i++){ s+=a*vnoise3(q); q=q*2.03+vec3f(17.1,3.7,9.2); a*=.5; } return s; }
`;

// ───────── post: scenes render linear HDR into post.hdr (rgba16float) with post.depth (depth32float) ─────────
export class Post {
  constructor(g, levels = 6) { const { device, W, H, format } = g; this.g = g; this.levels = levels;
    const mk = (w, h, fmt, usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING) => device.createTexture({ size: [Math.max(1, w), Math.max(1, h)], format: fmt, usage });
    this.hdrTex = mk(W, H, "rgba16float"); this.hdr = this.hdrTex.createView();
    this.mips = []; for (let i = 0, w = W, h = H; i < levels; i++) { w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); const t = mk(w, h, "rgba16float"); this.mips.push({ t, v: t.createView(), w, h }); }
    this.samp = device.createSampler({ magFilter: "linear", minFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
    const HEAD = `struct Pm{ a:vec4f, b:vec4f, c:vec4f } @group(0)@binding(0) var s:sampler; @group(0)@binding(1) var t:texture_2d<f32>; @group(0)@binding(2) var<uniform> P:Pm;\n` + FS_VS;
    const down = HEAD + `@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let uv=fc.xy*P.a.xy; let o=P.a.xy*.5;
      var c=textureSampleLevel(t,s,uv,0.).rgb*4.; c+=textureSampleLevel(t,s,uv+o,0.).rgb+textureSampleLevel(t,s,uv-o,0.).rgb+textureSampleLevel(t,s,uv+vec2f(o.x,-o.y),0.).rgb+textureSampleLevel(t,s,uv+vec2f(-o.x,o.y),0.).rgb; c/=8.;
      if(P.a.z>0.){ c=min(c,vec3f(24.)); let br=max(c.r,max(c.g,c.b)); let k=P.a.w; var so=clamp(br-P.a.z+k,0.,2.*k); so=so*so/(4.*k+1e-4); c*=max(so,br-P.a.z)/max(br,1e-4); }
      return vec4f(c,1.); }`;
    const up = HEAD + `@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let uv=fc.xy*P.a.xy; let o=P.a.xy;
      var c=textureSampleLevel(t,s,uv+vec2f(2.*o.x,0.),0.).rgb+textureSampleLevel(t,s,uv-vec2f(2.*o.x,0.),0.).rgb+textureSampleLevel(t,s,uv+vec2f(0.,2.*o.y),0.).rgb+textureSampleLevel(t,s,uv-vec2f(0.,2.*o.y),0.).rgb;
      c+=2.*(textureSampleLevel(t,s,uv+o,0.).rgb+textureSampleLevel(t,s,uv-o,0.).rgb+textureSampleLevel(t,s,uv+vec2f(o.x,-o.y),0.).rgb+textureSampleLevel(t,s,uv+vec2f(-o.x,o.y),0.).rgb);
      return vec4f(c/12.*P.a.z,1.); }`;
    const comp = `struct Pm{ a:vec4f, b:vec4f, c:vec4f } @group(0)@binding(0) var s:sampler; @group(0)@binding(1) var t:texture_2d<f32>; @group(0)@binding(2) var<uniform> P:Pm; @group(0)@binding(3) var bl:texture_2d<f32>;\n` + FS_VS + `
      fn h(p:vec2f)->f32{ var q=fract(vec3f(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
      @fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let uv=fc.xy*P.a.xy;
        var c=max(textureSampleLevel(t,s,uv,0.).rgb,vec3f(0.));
        if(P.a.z!=0.){ c+=textureSampleLevel(bl,s,uv,0.).rgb*P.a.z; }
        c*=P.a.w;
        let aces=clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),vec3f(0.),vec3f(1.)); c=mix(clamp(c,vec3f(0.),vec3f(1.)),aces,P.c.x);
        let q=uv-.5; c*=1.-P.b.w*smoothstep(.2,.95,length(q*vec2f(1.,.8))*1.25);
        c=pow(c,vec3f(1./2.2)); c+=(h(fc.xy+fract(P.b.z)*vec2f(113.,71.))-.5)*P.b.y;
        let bh=.128*P.b.x; let e=1.5*P.a.y; if(P.b.x>0.){ c*=smoothstep(bh-e,bh+e,uv.y)*smoothstep(bh-e,bh+e,1.-uv.y); }
        return vec4f(c,1.); }`;
    const pipe = (code, fmt, blend) => {
      const module = shader(device, code, "post");
      return device.createRenderPipeline({ layout: "auto", vertex: { module, entryPoint: "vs" }, fragment: { module, entryPoint: "fs", targets: [{ format: fmt, blend }] } });
    };
    this.pDown = pipe(down, "rgba16float"); this.pUp = pipe(up, "rgba16float", { color: { srcFactor: "one", dstFactor: "one" }, alpha: { srcFactor: "one", dstFactor: "one" } }); this.pComp = pipe(comp, format);
    this.ub = []; this.bgD = []; this.bgU = [];
    const ubuf = () => device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    for (let i = 0; i < levels; i++) { const u = ubuf(); this.ub.push(u); this.bgD.push(device.createBindGroup({ layout: this.pDown.getBindGroupLayout(0), entries: [{ binding: 0, resource: this.samp }, { binding: 1, resource: i ? this.mips[i - 1].v : this.hdr }, { binding: 2, resource: { buffer: u } }] })); }
    this.ubU = []; for (let i = 0; i < levels - 1; i++) { const u = ubuf(); this.ubU.push(u); this.bgU.push(device.createBindGroup({ layout: this.pUp.getBindGroupLayout(0), entries: [{ binding: 0, resource: this.samp }, { binding: 1, resource: this.mips[i + 1].v }, { binding: 2, resource: { buffer: u } }] })); }
    this.ubC = ubuf(); this.bgC = device.createBindGroup({ layout: this.pComp.getBindGroupLayout(0), entries: [{ binding: 0, resource: this.samp }, { binding: 1, resource: this.hdr }, { binding: 2, resource: { buffer: this.ubC } }, { binding: 3, resource: this.mips[0].v }] });
  }
  get depthTex() {
    const { device, W, H } = this.g;
    return this._depthTex ??= device.createTexture({ size: [W, H], format: "depth32float",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
  }
  get depth() { return this._depthView ??= this.depthTex.createView(); }
  // a render pass descriptor into the HDR target
  pass(clear = [0, 0, 0, 1], depth = true) { const d = { colorAttachments: [{ view: this.hdr, clearValue: clear || [0, 0, 0, 1], loadOp: clear ? "clear" : "load", storeOp: "store" }] };
    if (depth) d.depthStencilAttachment = { view: this.depth, depthClearValue: 1, depthLoadOp: clear ? "clear" : "load", depthStoreOp: "store" }; return d; }
  // o: bloom (strength), threshold, knee, exposure, tonemap (0 linear … 1 filmic), bars (0…1 letterbox to 2.39:1), grain, vignette, time
  run(enc, target, o = {}) { const { device, W, H } = this.g, q = device.queue, L = this.levels;
    const f = (a) => new Float32Array(a), one = (pipe, bg, view, load) => { const p = enc.beginRenderPass({ colorAttachments: [{ view, loadOp: load ? "load" : "clear", clearValue: [0, 0, 0, 1], storeOp: "store" }] }); p.setPipeline(pipe); p.setBindGroup(0, bg); p.draw(3); p.end(); };
    const bloom = o.bloom ?? .5;
    if (bloom !== 0) {
      const threshold = o.threshold ?? 1, knee = o.knee ?? .5, spread = o.spread ?? 1;
      for (let i = 0; i < L; i++) {
        const m = this.mips[i];
        if (this.lastThreshold === undefined || (i === 0 && (threshold !== this.lastThreshold || knee !== this.lastKnee))) {
          q.writeBuffer(this.ub[i], 0, f([1 / m.w, 1 / m.h, i === 0 ? threshold : 0, knee]));
        }
        one(this.pDown, this.bgD[i], m.v);
      }
      for (let i = L - 2; i >= 0; i--) {
        const m = this.mips[i];
        if (spread !== this.lastSpread) q.writeBuffer(this.ubU[i], 0, f([1 / m.w, 1 / m.h, spread, 0]));
        one(this.pUp, this.bgU[i], m.v, true);
      }
      this.lastThreshold = threshold; this.lastKnee = knee; this.lastSpread = spread;
    }
    q.writeBuffer(this.ubC, 0, f([1 / W, 1 / H, bloom / L * 2, o.exposure ?? 1, o.bars ?? 0, o.grain ?? .025, o.time ?? 0, o.vignette ?? .35, o.tonemap ?? 1, 0, 0, 0])); one(this.pComp, this.bgC, target);
  }
}

// ───────── textures ─────────
export function mipTexture(device, bitmap, format = "rgba8unorm") {
  const w = bitmap.width, h = bitmap.height, n = Math.floor(Math.log2(Math.max(w, h))) + 1;
  const usage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT;
  const tex = device.createTexture({ size: [w, h], format, mipLevelCount: n, usage });
  // External images upload to RGBA. The glyph atlas keeps just its ink coverage after upload.
  const upload = format === "r8unorm" ? device.createTexture({ size: [w, h], format: "rgba8unorm", usage }) : tex;
  device.queue.copyExternalImageToTexture({ source: bitmap, flipY: false }, { texture: upload }, [w, h]);
  const code = FS_VS + `@group(0)@binding(0) var s:sampler; @group(0)@binding(1) var t:texture_2d<f32>;
    override scale:f32=.5;
    @fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
      return textureSampleLevel(t,s,fc.xy/(vec2f(textureDimensions(t))*scale),0.); }`;
  const module = shader(device, code, "mip"), enc = device.createCommandEncoder();
  const pipe = scale => device.createRenderPipeline({ layout: "auto", vertex: { module, entryPoint: "vs" },
    fragment: { module, entryPoint: "fs", constants: { scale }, targets: [{ format }] } });
  const samp = device.createSampler({ minFilter: "linear", magFilter: "linear" });
  const view = i => tex.createView({ baseMipLevel: i, mipLevelCount: 1 });
  const blit = (pipeline, source, target) => {
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: target, loadOp: "clear", storeOp: "store" }] });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, device.createBindGroup({ layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: samp }, { binding: 1, resource: source }] }));
    pass.draw(3); pass.end();
  };
  if (upload !== tex) blit(pipe(1), upload.createView(), view(0));
  const down = pipe(.5);
  for (let i = 1; i < n; i++) blit(down, view(i - 1), view(i));
  device.queue.submit([enc.finish()]);
  if (upload !== tex) upload.destroy();
  return tex;
}
// The atlas of real writing: 4096² single channel (red = ink coverage), cells of 128 px, 32 per row. info.groupRanges gives [first,last] per group:
// cn-oracle, cn-bronze, cn-bigseal, cn-seal, cn-clerical, cn-kai, cn-xing, cn-cao, cn-song, cn-poem, world-ancient, world-modern, word, symbol.
// Cell i: column i%32, row floor(i/32), origin top-left. Sample with a sampler whose lodMaxClamp is about 5 so cells do not bleed into each other.
export async function loadAtlas(device, base = "../../glyphs/", retainBitmap = false) { const [info, blob] = await Promise.all([fetch(base + "atlas.json").then((r) => r.json()), fetch(base + "atlas.png").then((r) => r.blob())]);
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: "none" }); const tex = mipTexture(device, bmp, "r8unorm");
  if (!retainBitmap) bmp.close();
  return { tex, bitmap: retainBitmap ? bmp : null, info, sampler: device.createSampler({ minFilter: "linear", magFilter: "linear", mipmapFilter: "linear", lodMaxClamp: 5 }) }; }
// text drawn with the browser's fonts into a texture (white on transparent); for real sentences inside a scene
export function textTexture(device, w, h, draw) { const c = new OffscreenCanvas(w, h), x = c.getContext("2d"); draw(x, w, h); return mipTexture(device, c.transferToImageBitmap()); }

// ───────── camera maths (column-major Float32Array(16), WebGPU clip space z 0..1) ─────────
export const M4 = {
  persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = f / (n - f); m[11] = -1; m[14] = n * f / (n - f); return m; },
  look(e, c, up = [0, 1, 0]) { const z = norm(sub(e, c)), x = norm(cross(up, z)), y = cross(z, x); return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]); },
  mul(a, b) { const m = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) m[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return m; },
  inv(m) { const r = new Float32Array(16), a = m; const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6], b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; d = 1 / d;
    r[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * d; r[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * d; r[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * d; r[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * d;
    r[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * d; r[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * d; r[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * d; r[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * d;
    r[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * d; r[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * d; r[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * d; r[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * d;
    r[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * d; r[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * d; r[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * d; r[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * d; return r; },
};
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// ───────── player ─────────
// seg [t0,t1] in song seconds. scene: { reset(), step(dt,t) (fixed 1/60 s, optional), draw(t) }. notes: { phraseIndex: "括号注释" }. captions: [[a,b,"text"]] extra lines (e.g. the opening credit).
const CSS = `html,body{margin:0;height:100%;background:#000;overflow:hidden}canvas{position:fixed;inset:0;margin:auto;width:min(100vw,177.78vh);height:min(56.25vw,100vh);display:block}
#ov{position:fixed;inset:0;margin:auto;width:min(100vw,177.78vh);height:min(56.25vw,100vh);pointer-events:none;font-family:"MVLyric","LXGW WenKai","Kaiti SC","STKaiti","KaiTi","Noto Serif CJK SC",serif;container-type:size}
#ly{position:absolute;left:0;right:0;bottom:15.5%;text-align:center;color:#f3ecdc;font-size:3.3cqh;letter-spacing:.14em;text-shadow:0 0 .6em rgba(0,0,0,.85),0 0 .15em rgba(0,0,0,.9);transition:opacity .35s}
#nt{position:absolute;left:0;right:0;bottom:11.2%;text-align:center;color:#d9cfba;font-size:1.9cqh;letter-spacing:.08em;opacity:.85;text-shadow:0 0 .6em rgba(0,0,0,.9);transition:opacity .35s}
#st{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:.6em;color:#e9e2d4;background:rgba(0,0,0,.45);font:18px/1.6 "Noto Serif CJK SC",serif;cursor:pointer;z-index:5;text-align:center;padding:16px}#st small{color:#a59c8c;font-size:14px}
#bar{position:fixed;left:0;right:0;bottom:0;height:14px;z-index:4;cursor:pointer}#bar i{position:absolute;left:0;bottom:0;height:3px;background:#c9a04a;opacity:.7}#bar:hover i{height:6px}
#fps{position:fixed;right:8px;top:6px;color:#8a8376;font:11px ui-monospace,monospace;z-index:4}`;
export async function loadSong() {
  const songUrl = "../../song.json";
  let response;
  try {
    response = await fetch(songUrl);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    try { response = await fetch(songUrl); }
    catch (retryError) { throw new Error("歌曲时间表请求失败（" + songUrl + "）：" + retryError.message, { cause: retryError }); }
  }
  if (!response.ok) throw new Error("歌曲时间表请求失败（" + songUrl + "），HTTP " + response.status);
  return response.json();
}
export async function run({ g, seg, scene, notes = {}, captions = [], title = "", hint = "" }) {
  const st = document.createElement("style"); st.textContent = `@font-face{font-family:"MVLyric";src:url("../../glyphs/lyric.woff2") format("woff2")}` + CSS; document.head.appendChild(st);
  const ov = document.createElement("div"); ov.id = "ov"; ov.innerHTML = `<div id="ly"></div><div id="nt"></div>`; document.body.appendChild(ov);
  const bar = document.createElement("div"); bar.id = "bar"; bar.innerHTML = "<i></i>"; document.body.appendChild(bar); const fpsEl = document.createElement("div"); fpsEl.id = "fps"; document.body.appendChild(fpsEl);
  const song = filmHost?.filmSong ?? await loadSong();
  const [t0, t1] = seg, DT = 1 / 60, ly = ov.children[0], nt = ov.children[1];
  const captionsAt = t => {
    let line = "", note = "";
    song.phrases.forEach(([begin, end, words], i) => {
      if (t >= begin - .15 && t < end + .6) { line = words; note = notes[i] || ""; }
    });
    for (const [begin, end, words, isLyric] of captions) {
      if (t < begin || t >= end || (filmHost && t >= 18.9 && words === "本视频全部由 Claude 用代码生成")) continue;
      if (isLyric) line = words; else note = words;
    }
    return [line, note];
  };
  const text = t => {
    const [line, note] = captionsAt(t);
    if (ly.dataset.s !== line) { ly.dataset.s = line; ly.textContent = line; }
    if (nt.dataset.s !== note) { nt.dataset.s = note; nt.textContent = note ? "（" + note + "）" : ""; }
  };
  let simTick = 0;
  scene.reset?.();
  window.__song = song;
  const advance = (target, budget) => {
    if (!scene.step || scene.needsSimulation?.(target) === false) return true;
    const tick = Math.floor((target - t0) / DT + 1e-6);
    if (tick < simTick) { scene.reset?.(); simTick = 0; }
    const stop = Math.min(tick, simTick + budget);
    while (simTick < stop) { scene.step(DT, t0 + simTick * DT); simTick++; }
    return simTick === tick;
  };
  let presented = NaN;
  const present = (t) => {
    scene.draw(t);
    text(t);
    bar.firstChild.style.width = (100 * (t - t0) / (t1 - t0)) + "%";
    presented = t;
  };
  const songTime = t => clamp(Number.isFinite(t) ? t : t0, t0, t1);
  const queue = g.device.queue;
  if (filmHost) {
    ov.hidden = true; bar.hidden = true; fpsEl.hidden = true;
    const draw = time => { scene.draw(songTime(time)); };
    filmHost.sceneReady(window, {
      captionsAt,
      dispose: g.dispose,
      frame(time) {
        if (!advance(songTime(time), 6)) return false;
        draw(time);
        return true;
      },
      async prepare(time, cancelled) {
        const target = songTime(time);
        while (!advance(target, 24)) {
          await queue.onSubmittedWorkDone();
          if (cancelled()) return false;
        }
        if (cancelled()) return false;
        draw(target);
        await queue.onSubmittedWorkDone();
        if (window.__err) throw new Error(window.__err);
        return !cancelled();
      },
    });
    return;
  }
  if (Q.has("t")) {
    window.__at = async (time) => {
      const t = songTime(time);
      while (!advance(t, 30)) await queue.onSubmittedWorkDone();
      scene.draw(t); text(t);
      await queue.onSubmittedWorkDone();
      return window.__err || "ok";
    };
    await window.__at(+Q.get("t"));
    document.title = "ready";
    return;
  }

  const au = new Audio("../../../" + song.file);
  au.preload = "auto";
  const start = document.createElement("div"); start.id = "st";
  start.innerHTML = `<div>${title}</div><small>${hint || "点击播放　空格暂停　← → 快退快进　点底部进度条跳转"}</small>`;
  document.body.appendChild(start);
  let playing = false, pt = t0, revision = 0, pending = null;
  let count = 0, fpsStart = performance.now();
  const resumeAudio = () => {
    const request = revision;
    au.play().catch(error => {
      if (request !== revision || !playing || error.name === "AbortError") return;
      playing = false;
      start.style.display = "";
      start.lastElementChild.textContent = error.name === "NotAllowedError" ? "点击继续播放" : "音频播放失败：" + error.message;
    });
  };
  // Seeking replays fixed steps in bounded GPU batches. Keep the last complete picture
  // and pause the soundtrack until the requested picture is ready. A second seek can
  // replace its target between batches, without competing writes to scene buffers.
  const prepare = async () => {
    for (;;) {
      const request = revision, target = pt;
      while (!advance(target, 24)) {
        fpsEl.textContent = "正在定位…";
        await queue.onSubmittedWorkDone();
        if (revision !== request) break;
      }
      if (revision !== request) continue;
      present(target);
      await queue.onSubmittedWorkDone();
      if (revision !== request) continue;
      fpsEl.textContent = "";
      fpsStart = performance.now(); count = 0;
      if (playing) resumeAudio();
      return window.__err || "ok";
    }
  };
  const seek = (time) => {
    pt = songTime(time);
    revision++;
    au.pause();
    au.currentTime = pt;
    if (!pending) pending = prepare().finally(() => { pending = null; });
    return pending;
  };
  window.__at = seek;
  const play = () => { playing = true; start.style.display = "none"; if (!pending) resumeAudio(); };
  const pause = () => { playing = false; if (!pending) pt = au.currentTime; au.pause(); };
  start.onclick = play;
  addEventListener("keydown", e => {
    if (e.code === "Space") { playing ? pause() : play(); e.preventDefault(); }
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      const time = playing && !pending ? au.currentTime : pt;
      seek(clamp(time + (e.code === "ArrowLeft" ? -3 : 3), t0, t1 - .1));
    }
  });
  bar.onclick = e => seek(lerp(t0, t1, e.clientX / innerWidth));
  const loop = (now) => {
    if (!pending) {
      const t = playing ? songTime(au.currentTime) : pt;
      if (playing && (t >= t1 || au.ended)) seek(t0);
      else if (t !== presented) {
        if (!advance(t, 6)) seek(t);
        else {
          present(t);
          count++;
          if (now - fpsStart >= 1000) { fpsEl.textContent = Math.round(count * 1000 / (now - fpsStart)) + " fps"; fpsStart = now; count = 0; }
        }
      }
    }
    requestAnimationFrame(loop);
  };
  await seek(qn("from", t0));
  requestAnimationFrame(loop);
}
