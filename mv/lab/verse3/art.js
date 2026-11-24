// Everything written, carved or cut, drawn with the browser's 2D canvas (before the glyph atlas is loaded: headless Chrome can hang otherwise).
//   buildSheets()    the manuscripts: a paper atlas and an ink atlas of 4×2 tiles of 1024² (ink: r ink, g writing order ×4, b ramp across the character)
//   buildPuppet()    the Shaanxi shadow puppet: carved, dyed hide, one region per part (rgb = the colour light takes through the hide, a = hide present)
//   buildScraps()    the Dada cuttings: one scissor-cut scrap per 256² cell (rgb paper and print, a = inside the cut)
//   buildSentence()  说痛疑偷前代句　言空恐负片时情 laid along the crack, the crack itself, and points inside the strokes for the particles to land on
export const KAI = '"V3Kai","LXGW WenKai","Kaiti SC","STKaiti","KaiTi",serif', SONG = '"V3Song","Noto Serif CJK SC","Songti SC","SimSun",serif', HEI = '"V3Hei","Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif', CAO = '"V3Cao","V3Kai",cursive', XING = '"V3Xing","V3Kai",cursive', LSERIF = '"V3Serif","Noto Serif",Georgia,serif';
export async function loadFonts(base = "./fonts/") { const F = [["V3Kai", "kai"], ["V3Song", "song", "200 900"], ["V3Hei", "hei", "100 900"], ["V3Cao", "cao"], ["V3Xing", "xing"], ["V3Serif", "serif", "100 900"]];
  await Promise.all(F.map(async ([fam, file, w]) => { for (let i = 0; i < 3; i++) { try { const f = new FontFace(fam, `url(${base}${file}.woff2)`, w ? { weight: w } : {}); await f.load(); (self.document ? document.fonts : self.fonts).add(f); return; } catch (e) { if (i === 2) console.warn("font " + file + " not loaded: " + e); await new Promise((r) => setTimeout(r, 200)); } } })); }
let seed = 7; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296, rr = (a, b) => a + (b - a) * rnd();
// sheets: size in metres (w, h); tile index = position in this list
export const SHEETS = [
  { id: "dufu", w: .30, h: .36 }, { id: "li", w: .34, h: .34 }, { id: "lin", w: .27, h: .38 }, { id: "blog", w: .33, h: .2475 },
  { id: "su", w: .30, h: .34 }, { id: "zhu", w: .21, h: .29 }, { id: "dai", w: .20, h: .29 }];
const TS = 1024;
function paper(x, base, speck, n = 5000) { x.fillStyle = base; x.fillRect(0, 0, TS, TS);
  for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${speck},${rr(.02, .1)})`; const s = rr(1, 4); x.fillRect(rr(0, TS), rr(0, TS), s * rr(1, 6), s); }
  for (let i = 0; i < 14; i++) { const cx = rr(0, TS), cy = rr(0, TS), r = rr(60, 300), gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, `rgba(${speck},${rr(.03, .09)})`); gr.addColorStop(1, `rgba(${speck},0)`); x.fillStyle = gr; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); }
  const e = x.createLinearGradient(0, 0, TS, 0); e.addColorStop(0, `rgba(${speck},.16)`); e.addColorStop(.06, `rgba(${speck},0)`); e.addColorStop(.94, `rgba(${speck},0)`); e.addColorStop(1, `rgba(${speck},.16)`); x.fillStyle = e; x.fillRect(0, 0, TS, TS); }
// one character into the ink tile (and its order/ramp cell); returns [u, v, half cell] in tile uv
function glyph(k, ch, cx, cy, size, font, order, o = {}) { const s = size * (o.cell ?? 1.08) / 2;
  if (order >= 0) { const gr = k.createLinearGradient(cx - s * .5, cy - s, cx + s * .5, cy + s), gv = Math.round(order * 4); gr.addColorStop(0, `rgb(0,${gv},0)`); gr.addColorStop(1, `rgb(0,${gv},255)`); k.globalCompositeOperation = "source-over"; k.fillStyle = gr; k.fillRect(cx - s, cy - s, 2 * s, 2 * s); }
  k.save(); k.globalCompositeOperation = "lighter"; k.translate(cx + (o.dx ?? 0), cy + (o.dy ?? 0)); k.rotate(o.rot ?? 0); k.transform(o.sx ?? 1, 0, o.skew ?? 0, 1, 0, 0); k.fillStyle = "rgb(255,0,0)"; k.font = `${o.weight ?? 400} ${size}px ${font}`; k.textAlign = "center"; k.textBaseline = "middle"; k.fillText(ch, 0, 0); k.restore(); return [cx / TS, cy / TS, s / TS]; }
// vertical columns, right to left. cols: array of strings; returns the characters in writing order
function columns(k, cols, x0, y0, dx, dy, size, font, o = {}) { const out = []; let n = o.start ?? 0;
  cols.forEach((col, ci) => { [...col].forEach((ch, j) => { if (ch === "　") return; const hand = o.hand ?? 0;
    out.push(glyph(k, ch, x0 - ci * dx + rr(-1, 1) * hand * size * .05, y0 + (j + (o.indent?.[ci] ?? 0)) * dy + rr(-1, 1) * hand * size * .03, size * (1 + rr(-1, 1) * hand * .07), font, n++, { rot: rr(-1, 1) * hand * .035, skew: o.skew ?? 0, sx: o.sx ?? 1, cell: dy / size, weight: o.weight })); }); }); return out; }
// text as a 2004 screen drew it: rasterised at its pixel size and thresholded, no smoothing
function ptext(x, t, px, py, col, size, font, weight = 400) { const w = Math.ceil(size * t.length * 1.1) + 4, h = Math.ceil(size * 1.4), c = new OffscreenCanvas(w, h), q = c.getContext("2d");
  q.fillStyle = "#fff"; q.font = `${weight} ${size}px ${font}`; q.textBaseline = "top"; q.fillText(t, 1, 1); const im = q.getImageData(0, 0, w, h), d = im.data, [r, g, b] = col;
  for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] > 100 ? 255 : 0; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a; } q.putImageData(im, 0, 0); x.drawImage(c, px, py); }
export const BLOG = ["今天月考发卷子了，没考好。", "放学绕了很远的路才回家，", "不知道该跟谁说。"];
export function buildSheets() { const art = new OffscreenCanvas(4096, 2048), ink = new OffscreenCanvas(4096, 2048), A = art.getContext("2d"), K = ink.getContext("2d"), pos = {};
  K.fillStyle = "#000"; K.fillRect(0, 0, 4096, 2048);
  const tile = (i, fn) => { for (const c of [A, K]) { c.save(); c.translate((i % 4) * TS, Math.floor(i / 4) * TS); c.beginPath(); c.rect(0, 0, TS, TS); c.clip(); } fn(A, K); A.restore(); K.restore(); };
  // 0  Tang manuscript: dyed yellow hemp paper, ink-ruled columns (烏絲欄), regular script. One column written, the second under way.
  tile(0, (x, k) => { seed = 11; paper(x, "#c7a468", "70,45,10"); x.strokeStyle = "rgba(40,28,14,.5)"; x.lineWidth = 2.2;
    for (let i = 0; i <= 5; i++) { const cx = 962 - i * 180; x.beginPath(); x.moveTo(cx, 60); x.lineTo(cx + rr(-2, 2), 964); x.stroke(); } x.beginPath(); x.moveTo(40, 60); x.lineTo(990, 60); x.moveTo(40, 964); x.lineTo(990, 964); x.stroke();
    x.globalCompositeOperation = "destination-out"; for (let i = 0; i < 46; i++) { const a = rnd() < .5, u = rr(0, TS), r = rr(8, 34) * (rnd() < .2 ? 2.2 : 1); x.beginPath(); x.ellipse(a ? u : (rnd() < .5 ? 0 : TS), a ? (rnd() < .5 ? 0 : TS) : u, r * rr(.6, 2), r * rr(.4, 1), rr(0, 3), 0, 7); x.fill(); }
    for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(rr(100, 900), rr(100, 900), rr(3, 9), rr(2, 6), rr(0, 3), 0, 7); x.fill(); } x.globalCompositeOperation = "source-over";
    pos.dufu = columns(k, ["萬里悲秋常作客", "百年多病獨登臺"], 872, 150, 180, 124, 108, KAI, { hand: 1 }); });
  // 1  Song album leaf: a silk leaf in a brocade mount, small regular script, one seal
  tile(1, (x, k) => { seed = 23; x.fillStyle = "#7d8a7a"; x.fillRect(0, 0, TS, TS); x.strokeStyle = "rgba(230,230,200,.16)"; x.lineWidth = 1.5; for (let i = -40; i < 80; i++) { x.beginPath(); x.moveTo(i * 28, 0); x.lineTo(i * 28 + TS, TS); x.moveTo(i * 28 + TS, 0); x.lineTo(i * 28, TS); x.stroke(); }
    x.fillStyle = "rgba(220,200,140,.18)"; for (let i = 0; i < 37; i++) for (let j = 0; j < 37; j++) if ((i + j) % 2 === 0) { x.beginPath(); x.arc(i * 28, j * 28, 5, 0, 7); x.fill(); }
    x.save(); x.beginPath(); x.rect(96, 96, 832, 832); x.clip(); paper(x, "#cdb68a", "80,55,20", 3000); x.strokeStyle = "rgba(90,70,40,.07)"; x.lineWidth = 1; for (let i = 0; i < 420; i++) { x.beginPath(); x.moveTo(96, 96 + i * 2); x.lineTo(928, 96 + i * 2); x.stroke(); } x.restore();
    x.strokeStyle = "rgba(60,45,25,.6)"; x.lineWidth = 3; x.strokeRect(96, 96, 832, 832); x.strokeStyle = "rgba(240,230,200,.5)"; x.lineWidth = 2; x.strokeRect(88, 88, 848, 848);
    pos.li = columns(k, ["尋尋覓覓", "冷冷清清", "淒淒慘慘戚戚"], 730, 215, 150, 104, 88, KAI, { hand: .7 });
    x.fillStyle = "#a3261c"; x.fillRect(250, 760, 78, 78); x.fillStyle = "#cdb68a"; x.font = `900 34px ${SONG}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("易", 289, 780); x.fillText("安", 289, 818); });
  // 2  letter paper of the 1910s: eight red columns, brush, fast and close
  tile(2, (x, k) => { seed = 37; paper(x, "#e3d6b8", "110,80,40", 3500); x.strokeStyle = "rgba(176,42,30,.75)"; x.lineWidth = 2.5; x.strokeRect(70, 70, 884, 884); x.lineWidth = 1.6; for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(70 + i * 110.5, 70); x.lineTo(70 + i * 110.5, 954); x.stroke(); }
    x.strokeRect(62, 62, 900, 900); x.fillStyle = "rgba(176,42,30,.7)"; x.font = `500 22px ${SONG}`; x.textAlign = "center"; [..."用箋"].forEach((c, i) => x.fillText(c, 38, 880 + i * 30));
    for (const y of [352, 690]) { const gr = x.createLinearGradient(0, y - 8, 0, y + 8); gr.addColorStop(0, "rgba(60,40,20,0)"); gr.addColorStop(.5, "rgba(60,40,20,.16)"); gr.addColorStop(1, "rgba(255,250,230,.0)"); x.fillStyle = gr; x.fillRect(0, y - 8, TS, 16); }
    pos.lin = columns(k, ["意映卿卿如晤", "吾今以此書與汝永別矣"], 899, 120, 110.5, 78, 74, KAI, { hand: 1.3, skew: -.12, sx: .92 }); });
  // 3  a blog's "new entry" page about 2004 on an 800 × 600 screen: drawn at its pixel size, enlarged without smoothing
  tile(3, (x, k) => { const pg = new OffscreenCanvas(640, 480), p = pg.getContext("2d"), T = (t, px, py, c = [0, 0, 0], s = 12, w = 400, f = HEI) => ptext(p, t, px, py, c, s, f, w);
    p.fillStyle = "#fff"; p.fillRect(0, 0, 640, 480); let gr = p.createLinearGradient(0, 0, 640, 0); gr.addColorStop(0, "#0a246a"); gr.addColorStop(1, "#a6caf0"); p.fillStyle = gr; p.fillRect(0, 0, 640, 20); T("写新日志 - 小雨的角落 - Microsoft Internet Explorer", 22, 3, [255, 255, 255], 12, 700);
    p.fillStyle = "#3a6ea5"; p.fillRect(4, 4, 13, 12); p.fillStyle = "#d4d0c8"; p.fillRect(0, 20, 640, 46); T("文件(F)  编辑(E)  查看(V)  收藏(A)  工具(T)  帮助(H)", 6, 23); p.fillStyle = "#fff"; p.fillRect(48, 45, 520, 17); p.strokeStyle = "#7f7f7f"; p.lineWidth = 1; p.strokeRect(48.5, 45.5, 520, 17); T("地址(D)", 6, 47); T("http://blog.example.cn/xiaoyu/post.asp", 54, 47);
    gr = p.createLinearGradient(0, 66, 0, 126); gr.addColorStop(0, "#9fc4e8"); gr.addColorStop(1, "#dcecf8"); p.fillStyle = gr; p.fillRect(0, 66, 640, 60); T("小雨的角落", 24, 78, [28, 74, 124], 22, 700, KAI); T("只是随便写写", 150, 92, [74, 111, 150]);
    p.fillStyle = "#eef4fa"; p.fillRect(0, 126, 130, 334); p.fillStyle = "#c5d9ec"; p.fillRect(130, 126, 1, 334); ["首页", "日志 (37)", "相册", "留言板", "友情链接"].forEach((t, i) => T("· " + t, 16, 140 + i * 22, [28, 74, 156])); T("2004年11月", 16, 266, [102, 102, 102]);
    T("日 一 二 三 四 五 六", 12, 286, [136, 136, 136]); for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { const d = r * 7 + c; if (d >= 1 && d <= 30) T(String(d).padStart(2, " "), 12 + c * 16, 302 + r * 14, d === 23 ? [200, 40, 40] : [85, 85, 85], 11); }
    T("写新日志", 150, 136, [28, 74, 124], 14, 700); T("标题：", 150, 168); p.fillStyle = "#fff"; p.strokeStyle = "#7f9db9"; p.strokeRect(196.5, 164.5, 300, 20); T("无题", 201, 168); T("心情：", 510, 168); T("一般 ▾", 548, 168, [51, 51, 51]);
    T("内容：", 150, 198); p.strokeRect(196.5, 196.5, 420, 190); p.fillStyle = "#ece9d8"; p.fillRect(600, 197, 16, 189); p.fillStyle = "#c1c7d9"; p.fillRect(602, 214, 12, 40);
    for (const [bx, t] of [[196, "发表"], [262, "存草稿"]]) { p.fillStyle = "#ece9d8"; p.fillRect(bx, 398, 56, 22); p.strokeStyle = "#003c74"; p.strokeRect(bx + .5, 398.5, 56, 22); T(t, bx + (t.length === 2 ? 16 : 10), 403); }
    T("2004年11月23日 星期二 23:41", 340, 403, [136, 136, 136]); p.fillStyle = "#d4d0c8"; p.fillRect(0, 460, 640, 20); T("完毕", 6, 464);
    x.imageSmoothingEnabled = false; x.drawImage(pg, 0, 0, TS, TS);
    // the typed text: a pixel mask, enlarged into the ink tile; one order cell per character
    const m = new OffscreenCanvas(640, 480), mq = m.getContext("2d"); mq.fillStyle = "#000"; mq.fillRect(0, 0, 640, 480); pos.blog = []; let n = 0; const sx = TS / 640, sy = TS / 480;
    BLOG.forEach((ln, li) => [...ln].forEach((ch, j) => { const px = 201 + j * 13, py = 202 + li * 18; ptext(mq, ch, px, py, [255, 0, 0], 12, HEI);
      k.fillStyle = `rgb(0,${n * 4},128)`; k.fillRect(px * sx, py * sy, 13 * sx, 16 * sy); pos.blog.push([(px + 7) * sx / TS, (py + 8) * sy / TS, 7 * sx / TS]); n++; }));
    k.save(); k.globalCompositeOperation = "lighter"; k.imageSmoothingEnabled = false; k.drawImage(m, 0, 0, TS, TS); k.restore(); });
  // 4  Su Shi: xuan paper, running regular hand, a seal
  tile(4, (x, k) => { seed = 51; paper(x, "#e6dcc4", "100,80,50", 3000); pos.su = columns(k, ["十年生死兩茫茫", "不思量", "自難忘"], 800, 150, 215, 112, 104, KAI, { hand: 1.4, skew: -.06 });
    x.fillStyle = "#a3261c"; x.fillRect(160, 700, 84, 84); x.fillStyle = "#e6dcc4"; x.font = `900 36px ${SONG}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("東", 202, 722); x.fillText("坡", 202, 762); });
  // 5  Zhu Shenghao: a 1930s letter in pen on ruled note paper
  tile(5, (x, k) => { seed = 67; paper(x, "#e9e4d2", "90,90,80", 2500); x.strokeStyle = "rgba(60,90,150,.45)"; x.lineWidth = 1.6; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(90 + i * 105, 80); x.lineTo(90 + i * 105, 950); x.stroke(); }
    pos.zhu = columns(k, ["醒來覺得", "甚是愛你"], 772, 180, 105, 92, 76, KAI, { hand: 1.5, skew: -.18, sx: .9 }); });
  // 6  Dai Wangshu: a page of a 1928 magazine, set vertically in Song type
  tile(6, (x, k) => { seed = 83; paper(x, "#d9cba6", "90,60,20", 4000); x.fillStyle = "rgba(30,22,14,.85)"; x.font = `900 76px ${SONG}`; x.textAlign = "center"; x.textBaseline = "middle"; [..."雨巷"].forEach((c, i) => x.fillText(c, 900, 170 + i * 96)); x.font = `500 34px ${SONG}`; [..."戴望舒"].forEach((c, i) => x.fillText(c, 900, 420 + i * 44));
    x.strokeStyle = "rgba(30,22,14,.7)"; x.lineWidth = 3; x.beginPath(); x.moveTo(60, 60); x.lineTo(964, 60); x.moveTo(60, 968); x.lineTo(964, 968); x.stroke(); x.font = `500 24px ${SONG}`; x.fillText("— 九七九 —", 512, 994);
    pos.dai = columns(k, ["撐着油紙傘獨自", "彷徨在悠長悠長", "又寂寥的雨巷"], 740, 150, 170, 108, 78, SONG, { weight: 600 });
    k.globalCompositeOperation = "lighter"; k.fillStyle = "rgb(255,0,0)"; k.font = `600 60px ${SONG}`; k.textAlign = "center"; k.textBaseline = "middle"; k.fillText("，", 740 + 52, 150 + 4.55 * 108); k.fillText("，", 570 + 52, 150 + 4.55 * 108); k.globalCompositeOperation = "source-over"; });
  return { art, ink, pos }; }

// ───────── the shadow puppet ─────────
// A young scholar-official (小生) in a red robe and gauze hat, in the manner of the eastern Shaanxi (華縣) school: hollow face (空臉) with the long eye, the straight
// brow-to-nose line, fine carving (fish scales, flowers, fretwork), red, green and black dyes on translucent hide. Facing +x. Units: cm, y down.
// parts: name → { r: [x, y, w, h] region in px, p: [px, py] the pivot in px }. Joints in cm in the parent's frame are in PUPPET.
export const PS = 40;
export const PUPPET = { // pivots: torso at the neck; joints in the parent's frame
  head: { parent: "torso", at: [0, 0] }, lower: { parent: "torso", at: [0, 10.4] }, uarmB: { parent: "torso", at: [-2.2, 1.7] }, uarmF: { parent: "torso", at: [2.0, 1.5] },
  farmB: { parent: "uarmB", at: [0, 6.0] }, farmF: { parent: "uarmF", at: [0, 6.0] }, handB: { parent: "farmB", at: [0, 5.6] }, handF: { parent: "farmF", at: [0, 5.6] } };
export function buildPuppet() { const cv = new OffscreenCanvas(2048, 1024), x = cv.getContext("2d"), parts = {};
  const HIDE = "rgb(240,212,158)", RED = "rgb(226,52,26)", GREEN = "rgb(34,150,72)", YEL = "rgb(246,196,58)", BLK = "rgb(30,20,12)", BLUE = "rgb(60,120,190)";
  const P = (pts) => { x.beginPath(); for (const s of pts) { if (s[0] === "M") x.moveTo(s[1], s[2]); else if (s[0] === "L") x.lineTo(s[1], s[2]); else if (s[0] === "Q") x.quadraticCurveTo(s[1], s[2], s[3], s[4]); else if (s[0] === "C") x.bezierCurveTo(s[1], s[2], s[3], s[4], s[5], s[6]); } x.closePath(); };
  const cut = (fn) => { x.save(); x.globalCompositeOperation = "destination-out"; x.fillStyle = "#000"; x.strokeStyle = "#000"; fn(); x.restore(); };
  const ell = (cx, cy, rx, ry, a = 0) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, a, 0, 7); };
  const flower = (cx, cy, r, n = 5, rot = 0) => { for (let i = 0; i < n; i++) { const a = rot + i * 2 * Math.PI / n; ell(cx + Math.cos(a) * r * .55, cy + Math.sin(a) * r * .55, r * .42, r * .2, a); x.fill(); } };
  const scales = (x0, y0, x1, y1, r) => { for (let j = 0, y = y0; y < y1 + r; y += r * .9, j++) for (let xx = x0 + (j % 2) * r; xx < x1 + r; xx += 2 * r) { x.beginPath(); x.arc(xx, y, r * .86, Math.PI * .08, Math.PI * .92); x.arc(xx, y - r * .3, r * .62, Math.PI * .88, Math.PI * .12, true); x.closePath(); x.fill(); } };
  const lace = (x0, y0, x1, y1, r, col) => { cut(() => { for (let j = 0, y = y0; y < y1 + r; y += r * 1.0, j++) for (let xx = x0 + (j % 2) * r; xx < x1 + r; xx += 2 * r) { x.beginPath(); x.arc(xx, y, r * .6, 0, 7); x.fill(); } });
    x.strokeStyle = col; x.lineWidth = r * .2; for (let j = 0, y = y0; y < y1 + r; y += r * 1.0, j++) for (let xx = x0 + (j % 2) * r; xx < x1 + r; xx += 2 * r) { x.beginPath(); x.arc(xx, y - r * .1, r * .5, Math.PI * .1, Math.PI * .9); x.stroke(); x.beginPath(); x.arc(xx, y, r * .12, 0, 7); x.fillStyle = col; x.fill(); } };
  // the cut channel just inside every edge, the edge itself a dark line (the mark of a carved figure)
  const channel = (pts, w = .22) => { x.save(); P(pts); x.clip(); cut(() => { P(pts); x.lineWidth = .66; x.stroke(); }); x.restore(); P(pts); outline(w); };
  const lattice = (x0, y0, x1, y1, s) => { for (let j = 0, y = y0; y < y1; y += s, j++) for (let xx = x0 + (j % 2) * s / 2; xx < x1; xx += s) { flower(xx, y, s * .42, 4, Math.PI / 4); x.beginPath(); x.arc(xx + s / 2, y + s / 2, s * .07, 0, 7); x.fill(); } };
  const fret = (pts, w, step) => { // a band of little square holes along a polyline (回紋 fretwork)
    for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.floor(L / step)), a = Math.atan2(by - ay, bx - ax);
      for (let k = 0; k < n; k++) { const f = (k + .5) / n; x.save(); x.translate(ax + (bx - ax) * f, ay + (by - ay) * f); x.rotate(a); x.fillRect(-step * .32, -w * .3, step * .64, w * .6); x.restore(); } } };
  const cloud = (cx, cy, r, dir = 1) => { x.lineWidth = r * .22; x.lineCap = "round"; x.beginPath(); for (let i = 0; i <= 40; i++) { const f = i / 40, a = dir * f * Math.PI * 3.2, rad = r * (1 - f * .85); const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); };
  const outline = (w = .2) => { x.strokeStyle = BLK; x.lineWidth = w; x.lineJoin = "round"; x.stroke(); };
  const part = (name, r, piv, draw) => { x.save(); x.beginPath(); x.rect(r[0], r[1], r[2], r[3]); x.clip(); x.translate(r[0] + piv[0] * PS, r[1] + piv[1] * PS); x.scale(PS, PS); draw(); x.restore();
    parts[name] = { r, p: [r[0] + piv[0] * PS, r[1] + piv[1] * PS] }; };
  seed = 101;
  // ── head: neck joint at the origin
  part("head", [0, 0, 560, 600], [9, 13.2], () => {
    const face = [["M", -.9, -1.3], ["C", -2.2, -2.5, -3.0, -4.6, -2.9, -6.4], ["L", -2.7, -8.0], ["L", 2.2, -8.5], ["Q", 2.15, -7.7, 2.55, -6.95], ["L", 3.45, -5.35], ["Q", 3.98, -4.95, 3.42, -4.72], ["L", 3.28, -4.48], ["Q", 3.56, -4.3, 3.22, -4.07], ["L", 3.05, -3.98], ["Q", 3.42, -3.8, 3.15, -3.5], ["Q", 3.38, -2.92, 2.7, -2.56], ["Q", 1.9, -2.2, 1.25, -1.6], ["L", .8, -.6], ["L", .8, .6], ["L", -.6, .6]];
    P(face); x.fillStyle = HIDE; x.fill(); outline(.24);
    // hair, sideburn and the back of the head: black
    P([["M", -.95, -1.2], ["C", -2.2, -2.5, -3.0, -4.6, -2.9, -6.4], ["L", -2.7, -8.0], ["L", .55, -8.25], ["Q", .2, -7.3, -.25, -6.6], ["Q", -.55, -6.0, -.5, -5.5], ["Q", -1.05, -5.0, -1.0, -3.9], ["Q", -.85, -2.4, -.3, -1.5]]); x.fillStyle = BLK; x.fill();
    cut(() => { x.lineWidth = .07; for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(-2.4 + i * .08, -7.6 + i * .1); x.quadraticCurveTo(-2.9 + i * .3, -4.5, -1.4 + i * .1, -1.9 + i * .05); x.stroke(); } });
    // the hollow face (空臉): cut out, then the features as fine lines of hide
    cut(() => { P([["M", .7, -8.2], ["L", 2.0, -8.3], ["Q", 1.95, -7.6, 2.32, -6.92], ["L", 3.18, -5.38], ["Q", 3.5, -5.0, 3.15, -4.86], ["L", 3.0, -4.5], ["Q", 3.22, -4.28, 2.95, -4.1], ["L", 2.8, -3.98], ["Q", 3.1, -3.75, 2.9, -3.45], ["Q", 3.05, -2.98, 2.55, -2.78], ["Q", 1.9, -2.5, 1.35, -2.25], ["Q", .5, -2.9, -.25, -3.6], ["Q", -.45, -4.6, -.3, -5.4], ["Q", -.05, -6.3, .3, -7.1]]); x.fill(); });
    x.strokeStyle = BLK; x.lineCap = "round"; x.lineJoin = "round";
    x.lineWidth = .17; x.beginPath(); x.moveTo(.45, -6.95); x.quadraticCurveTo(1.4, -7.35, 2.35, -6.98); x.stroke();                   // brow
    x.lineWidth = .16; x.beginPath(); x.moveTo(.35, -6.35); x.quadraticCurveTo(1.2, -6.05, 2.55, -6.22); x.stroke();                     // upper lid, the long eye
    x.lineWidth = .1; x.beginPath(); x.moveTo(1.55, -5.95); x.quadraticCurveTo(2.1, -5.85, 2.5, -6.12); x.stroke(); x.beginPath(); x.moveTo(.35, -6.35); x.lineTo(-.05, -6.6); x.stroke();
    x.fillStyle = BLK; ell(2.12, -6.08, .17, .13); x.fill();                                                                             // pupil
    x.lineWidth = .1; x.beginPath(); x.moveTo(3.05, -4.88); x.quadraticCurveTo(2.75, -4.95, 2.8, -4.72); x.stroke();                       // nostril
    x.lineWidth = .12; x.beginPath(); x.moveTo(.0, -5.25); x.bezierCurveTo(.6, -5.6, .75, -4.4, .05, -4.2); x.stroke(); x.beginPath(); x.moveTo(.25, -4.95); x.quadraticCurveTo(.45, -4.7, .2, -4.5); x.stroke(); // ear
    x.lineWidth = .1; x.beginPath(); x.moveTo(-.1, -3.75); x.quadraticCurveTo(1.2, -2.6, 2.6, -2.75); x.stroke();                         // jaw
    x.beginPath(); x.moveTo(.35, -8.15); x.lineTo(2.0, -8.3); x.stroke();
    // gauze hat (紗帽): black crown, carved lattice, a yellow brim with fretwork, the wing at the back
    const crown = [["M", -2.95, -7.75], ["L", 2.45, -8.3], ["L", 2.3, -10.0], ["C", 1.8, -10.6, -.2, -10.7, -1.0, -10.3], ["C", -1.4, -11.9, -3.4, -12.35, -3.95, -10.9], ["C", -4.15, -10.0, -3.6, -8.6, -2.95, -7.75]];
    P(crown); x.fillStyle = BLK; x.fill(); x.save(); P(crown); x.clip(); cut(() => lattice(-3.8, -12.2, 2.4, -8.8, .5)); x.restore(); channel(crown, .2);
    P([["M", -1.15, -10.25], ["C", -1.45, -11.75, -3.3, -12.15, -3.8, -10.95], ["L", -3.55, -10.2]]); x.fillStyle = GREEN; x.fill(); cut(() => { cloud(-2.45, -11.0, .75, 1); }); P([["M", -1.15, -10.25], ["C", -1.45, -11.75, -3.3, -12.15, -3.8, -10.95], ["L", -3.55, -10.2]]); outline(.14);
    P([["M", -3.0, -7.6], ["L", 2.5, -8.15], ["L", 2.42, -8.95], ["L", -3.2, -8.45]]); x.fillStyle = YEL; x.fill(); cut(() => fret([[-2.9, -8.03], [2.35, -8.55]], .5, .42)); P([["M", -3.0, -7.6], ["L", 2.5, -8.15], ["L", 2.42, -8.95], ["L", -3.2, -8.45]]); outline(.14);
    x.strokeStyle = BLK; x.lineWidth = .22; x.beginPath(); x.moveTo(-3.7, -10.1); x.lineTo(-6.3, -10.55); x.stroke();
    ell(-7.55, -10.75, 1.45, .72, -.1); x.fillStyle = BLK; x.fill(); cut(() => { ell(-7.55, -10.75, 1.18, .5, -.1); x.fill(); }); x.fillStyle = BLK; flower(-7.55, -10.75, .9, 6, .3); x.beginPath(); x.arc(-7.55, -10.75, .16, 0, 7); x.fill();
    x.lineWidth = .1; x.beginPath(); x.moveTo(-8.7, -10.75); x.lineTo(-6.4, -10.75); x.stroke(); });
  // ── torso: neck joint at the origin; red robe, green crossed collar, a chest medallion, the jade belt jutting forward
  part("torso", [560, 0, 420, 520], [4.6, 1.0], () => {
    const body = [["M", -1.1, -.2], ["C", -2.2, .2, -3.2, .8, -3.6, 1.8], ["L", -3.4, 4], ["C", -3.3, 6, -3.0, 8.5, -3.0, 10.7], ["L", 3.0, 10.7], ["C", 3.1, 8.5, 3.6, 5.5, 3.5, 3.0], ["C", 3.4, 1.8, 2.9, .6, 1.8, -.1], ["C", 1.0, -.4, -.4, -.5, -1.1, -.2]];
    P(body); x.fillStyle = RED; x.fill(); x.save(); P(body); x.clip(); lace(-3.8, .6, 3.8, 10.8, .42, RED); x.restore();
    x.fillStyle = YEL; ell(.5, 5.4, 1.75, 1.75); x.fill(); cut(() => { flower(.5, 5.4, 1.45, 8, .2); x.beginPath(); x.arc(.5, 5.4, .3, 0, 7); x.fill(); }); x.fillStyle = YEL; x.beginPath(); x.arc(.5, 5.4, .16, 0, 7); x.fill(); ell(.5, 5.4, 1.75, 1.75); outline(.14);
    x.strokeStyle = GREEN; x.lineWidth = .72; x.lineJoin = "round"; x.beginPath(); x.moveTo(-1.0, -.25); x.lineTo(.75, 3.9); x.lineTo(1.95, -.05); x.stroke();
    cut(() => fret([[-.9, -.1], [.72, 3.7], [1.85, .05]], .55, .38));
    x.strokeStyle = BLK; x.lineWidth = .1; x.beginPath(); x.moveTo(-1.35, -.2); x.lineTo(.75, 4.3); x.lineTo(2.3, 0); x.moveTo(-.62, -.3); x.lineTo(.75, 3.45); x.lineTo(1.6, -.12); x.stroke();
    const belt = [["M", -3.25, 8.35], ["L", 3.4, 7.95], ["Q", 5.35, 7.85, 5.1, 8.9], ["Q", 4.85, 9.65, 3.4, 9.55], ["L", -3.15, 9.95]];
    P(belt); x.fillStyle = BLK; x.fill(); cut(() => { for (let i = 0; i < 8; i++) { const f = i / 7, px = -2.8 + f * 7.3, py = 8.95 - f * .35 + (px > 3.5 ? .1 : 0); x.save(); x.translate(px, py); x.rotate(-.05); x.fillRect(-.33, -.24, .66, .48); x.restore(); } }); P(belt); outline(.12);
    x.strokeStyle = BLK; x.lineWidth = .08; for (const s of [[-2.4, 2.4, -2.0, 7.4], [2.6, 3.2, 2.4, 7.4], [-1.2, 6.8, -1.6, 8.2]]) { x.beginPath(); x.moveTo(s[0], s[1]); x.quadraticCurveTo(s[0] + .3, (s[1] + s[3]) / 2, s[2], s[3]); x.stroke(); }
    channel(body); });
  // ── lower body: waist at the origin; the robe's skirt with a sea-wave hem (海水江崖), the thick-soled boots
  part("lower", [980, 0, 470, 720], [5.0, .6], () => {
    const skirt = [["M", -3.05, -.3], ["L", 3.1, -.3], ["C", 3.5, 3.5, 4.4, 8.5, 5.2, 12.7], ["L", -4.5, 12.7], ["C", -4.0, 8.5, -3.4, 3.5, -3.05, -.3]];
    const boot = (ox) => { const b = [["M", ox, 12.4], ["L", ox + 1.65, 12.4], ["L", ox + 1.75, 14.3], ["Q", ox + 2.95, 14.45, ox + 3.95, 13.9], ["Q", ox + 4.15, 14.55, ox + 3.6, 15.0], ["L", ox - .05, 15.0]];
      P(b); x.fillStyle = BLK; x.fill(); cut(() => { x.lineWidth = .08; x.beginPath(); x.moveTo(ox + .4, 12.8); x.lineTo(ox + .4, 14.6); x.moveTo(ox + 1.0, 12.8); x.lineTo(ox + 1.0, 14.6); x.stroke(); flower(ox + 2.6, 14.45, .38, 5); });
      x.fillStyle = BLK; x.fillRect(ox - .15, 15.0, 3.85, .95); cut(() => x.fillRect(ox + .05, 15.15, 3.45, .6)); x.strokeStyle = BLK; x.lineWidth = .09; for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(ox + .05, 15.15 + i * .1); x.lineTo(ox + 3.5, 15.15 + i * .1); x.stroke(); } P(b); outline(.14); };
    boot(-2.7); boot(1.9);
    P(skirt); x.fillStyle = RED; x.fill(); x.save(); P(skirt); x.clip(); cut(() => { for (const [cx, cy, r] of [[-1.4, 2.4, .95], [1.3, 3.6, .95], [-2.0, 6.6, 1.05], [.6, 7.4, 1.05], [3.0, 8.4, .95], [-1.0, 9.9, .8]]) { flower(cx, cy, r, 6, cx); x.beginPath(); x.arc(cx, cy, r * .16, 0, 7); x.fill(); }
      for (let i = 0; i < 40; i++) { const px = rr(-3.5, 4.5), py = rr(.5, 10.2); x.beginPath(); x.arc(px, py, .1, 0, 7); x.fill(); } });
    x.fillStyle = GREEN; x.fillRect(-5, 10.4, 11, 2.4); x.fillStyle = YEL; x.fillRect(-5, 10.4, 11, .45); for (let i = 0; i < 3; i++) { x.fillStyle = [BLUE, YEL, GREEN][i]; x.fillRect(-5, 11.05 + i * .55, 11, .3); }
    cut(() => { x.lineWidth = .11; for (let r = 0; r < 4; r++) for (let i = -10; i < 12; i++) { x.beginPath(); x.arc(i * .62 + (r % 2) * .31, 11.0 + r * .5, .3, Math.PI, 0); x.stroke(); } fret([[-5, 10.62], [6, 10.62]], .3, .3); });
    x.restore(); x.strokeStyle = BLK; x.lineWidth = .14; x.beginPath(); x.moveTo(1.25, -.2); x.quadraticCurveTo(1.6, 6, 2.2, 12.7); x.stroke(); x.beginPath(); x.moveTo(-5, 10.4); x.lineTo(6, 10.4); x.stroke();
    channel(skirt); });
  // ── arms: wide sleeves; the forearm ends in a green cuff and a short white water-sleeve; hands are hollow outlines with the orchid fingers
  const uarm = (name, r, dark) => part(name, r, [2.0, .9], () => { const s = [["M", -1.5, -.6], ["Q", 0, -1.25, 1.5, -.6], ["L", 1.85, 6.4], ["Q", 0, 7.0, -1.6, 6.4]];
    P(s); x.fillStyle = dark ? "rgb(200,44,24)" : RED; x.fill(); x.save(); P(s); x.clip(); lace(-2, -.5, 2, 7, .38, dark ? "rgb(200,44,24)" : RED); x.restore();
    x.fillStyle = GREEN; x.beginPath(); x.moveTo(-1.62, 5.9); x.quadraticCurveTo(0, 6.5, 1.8, 5.9); x.lineTo(1.85, 6.4); x.quadraticCurveTo(0, 7.0, -1.6, 6.4); x.closePath(); x.fill(); channel(s, .18); });
  uarm("uarmF", [1460, 0, 170, 320], false); uarm("uarmB", [1640, 0, 170, 320], true);
  const farm = (name, r) => part(name, r, [1.8, .8], () => { const s = [["M", -1.3, -.5], ["L", 1.3, -.5], ["L", 1.45, 4.4], ["L", -1.3, 4.4]];
    P(s); x.fillStyle = RED; x.fill(); x.save(); P(s); x.clip(); lace(-1.6, -.4, 1.6, 4.5, .34, RED); x.restore(); channel(s, .16);
    x.fillStyle = GREEN; x.fillRect(-1.35, 3.7, 2.85, 1.0); cut(() => fret([[-1.2, 4.2], [1.4, 4.2]], .55, .4)); x.strokeStyle = BLK; x.lineWidth = .12; x.strokeRect(-1.35, 3.7, 2.85, 1.0);
    x.fillStyle = HIDE; x.beginPath(); x.moveTo(-1.2, 4.7); x.lineTo(1.4, 4.7); x.lineTo(1.2, 6.0); x.quadraticCurveTo(0, 6.4, -1.0, 5.95); x.closePath(); x.fill(); cut(() => { x.beginPath(); x.moveTo(-.95, 4.9); x.lineTo(1.15, 4.9); x.lineTo(.98, 5.8); x.quadraticCurveTo(0, 6.1, -.8, 5.75); x.closePath(); x.fill(); });
    x.beginPath(); x.moveTo(-1.2, 4.7); x.lineTo(1.4, 4.7); x.lineTo(1.2, 6.0); x.quadraticCurveTo(0, 6.4, -1.0, 5.95); x.closePath(); outline(.12); });
  farm("farmF", [1820, 0, 130, 330]); farm("farmB", [1460, 330, 130, 330]);
  const hand = (name, r) => part(name, r, [1.6, .6], () => { x.strokeStyle = BLK; x.lineCap = "round"; x.lineJoin = "round"; x.fillStyle = HIDE;
    const f = (a, b, w) => { x.lineWidth = w + .2; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.strokeStyle = BLK; x.stroke(); x.lineWidth = w - .02; cut(() => { x.lineWidth = w - .06; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); }); };
    ell(.35, .95, .78, .95, -.3); x.fillStyle = BLK; x.fill(); cut(() => { ell(.35, .95, .62, .8, -.3); x.fill(); });
    f([.75, .55], [2.3, .2], .3); f([.85, .95], [2.1, 1.25], .28); f([2.1, 1.25], [1.75, 1.75], .24); f([.75, 1.35], [1.75, 1.85], .26); f([.55, 1.7], [1.35, 2.25], .24); f([.1, .35], [1.05, -.15], .3);
    x.lineWidth = .08; x.beginPath(); x.moveTo(-.3, .3); x.lineTo(.95, .3); x.stroke(); });
  hand("handF", [1600, 330, 180, 180]); hand("handB", [1800, 330, 180, 180]);
  return { canvas: cv, parts }; }

// ───────── the Dada cuttings ─────────
// 64 cells of 256². Cells 0–9 are the ten characters of the line, each cut from a different printed source; the rest are words cut from human writing
// (the poems of the shot before, newspaper and book type), a few in Latin type, as in the Zurich and Berlin collages. Returns per cell: [w, h] in px.
export const LINE = [..."也只是把感情组合背诵"];
export function buildScraps() { const C = 256, cv = new OffscreenCanvas(2048, 2048), x = cv.getContext("2d"), cells = []; seed = 211;
  const papers = { news: ["#d8d0ba", "70,60,40"], book: ["#e6d9b8", "90,65,25"], gloss: ["#f1eee6", "60,60,70"], red: ["#c0281c", "60,0,0"], black: ["#18171a", "200,200,200"], yellow: ["#e3bd45", "90,60,0"], blue: ["#8fa4b8", "20,30,50"], copy: ["#f2ede0", "90,80,60"], pink: ["#e4b3a8", "90,30,20"] };
  const ink = { news: "#1a1714", book: "#231a10", gloss: "#151515", red: "#f4ead8", black: "#efe9dc", yellow: "#141210", blue: "#14181e", copy: "#121010", pink: "#1d1210" };
  function cell(i, kind, w, h, draw, back = false) { const cx = (i % 8) * C, cy = Math.floor(i / 8) * C; x.save(); x.translate(cx + C / 2, cy + C / 2);
    // a scissor cut: four straight-ish edges, corners off by a little
    const j = () => rr(-1, 1) * 5, pts = [[-w / 2 + j(), -h / 2 + j()], [w / 2 + j(), -h / 2 + j()], [w / 2 + j(), h / 2 + j()], [-w / 2 + j(), h / 2 + j()]];
    if (rnd() < .3) { const k = Math.floor(rnd() * 4); pts.splice(k + 1, 0, [(pts[k][0] + pts[(k + 1) % 4][0]) / 2 + rr(-8, 8), (pts[k][1] + pts[(k + 1) % 4][1]) / 2 + rr(-8, 8)]); }
    x.beginPath(); pts.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.clip();
    const [bg, sp] = papers[kind]; x.fillStyle = bg; x.fillRect(-C / 2, -C / 2, C, C);
    for (let k = 0; k < 700; k++) { x.fillStyle = `rgba(${sp},${rr(.03, .12)})`; const s = rr(.6, 2.2); x.fillRect(rr(-C / 2, C / 2), rr(-C / 2, C / 2), s * rr(1, 3), s); }
    const gr = x.createRadialGradient(rr(-60, 60), rr(-60, 60), 10, 0, 0, 200); gr.addColorStop(0, `rgba(${sp},0)`); gr.addColorStop(1, `rgba(${sp},${rr(.05, .2)})`); x.fillStyle = gr; x.fillRect(-C / 2, -C / 2, C, C);
    x.fillStyle = ink[kind]; x.strokeStyle = ink[kind]; x.textAlign = "center"; x.textBaseline = "middle"; draw(x, w, h); x.restore(); cells[i] = [w, h, kind]; }
  const T = (t, px, py, size, font, weight = 400, o = {}) => { x.save(); x.translate(px, py); if (o.rot) x.rotate(o.rot); if (o.skew) x.transform(1, 0, o.skew, 1, 0, 0); if (o.sx) x.scale(o.sx, 1); x.font = `${weight} ${size}px ${font}`; if (o.stroke) { x.lineWidth = o.stroke; x.strokeText(t, 0, 0); } else x.fillText(t, 0, 0); x.restore(); };
  const fine = (txt, x0, y0, x1, y1, size, font, vertical) => { x.save(); x.font = `400 ${size}px ${font}`; x.textAlign = "center"; let i = 0; const s = [...txt];
    if (vertical) { for (let cx = x1; cx > x0; cx -= size * 1.35) for (let cy = y0; cy < y1; cy += size * 1.1) x.fillText(s[i++ % s.length], cx, cy); }
    else { for (let cy = y0; cy < y1; cy += size * 1.3) for (let cx = x0; cx < x1; cx += size * 1.02) x.fillText(s[i++ % s.length], cx, cy); } x.restore(); };
  const half = (x0, y0, w, h, s, a = .55) => { x.save(); x.globalAlpha = a; for (let yy = y0; yy < y0 + h; yy += s) for (let xx = x0; xx < x0 + w; xx += s) { const v = .5 + .5 * Math.sin(xx * .05 + yy * .03) * Math.cos(yy * .04); x.beginPath(); x.arc(xx + (yy / s % 2) * s / 2, yy, s * .48 * v, 0, 7); x.fill(); } x.restore(); };
  const PROSE = "萬里悲秋常作客百年多病獨登臺無邊落木蕭蕭下不盡長江滾滾來尋尋覓覓冷冷清清淒淒慘慘戚戚意映卿卿如晤吾今以此書與汝永別矣十年生死兩茫茫不思量自難忘";
  // the line, one source per character
  cell(0, "book", 150, 214, (x) => { x.globalAlpha = .5; T("之", 0, -128, 128, SONG, 500); T("夫", 0, 128, 128, SONG, 500); x.globalAlpha = 1; T("也", 0, 0, 128, SONG, 500); x.fillRect(-72, -C / 2, 2, C); x.fillRect(70, -C / 2, 2, C); });
  cell(1, "news", 200, 186, (x) => { T("只", 0, -6, 160, HEI, 900); x.fillRect(-C / 2, 76, C, 5); fine("本埠新聞昨日下午", -110, 96, 110, 120, 11, SONG); });
  cell(2, "red", 176, 178, (x) => { T("是", 0, 4, 148, HEI, 700); });
  cell(3, "news", 196, 204, (x) => { x.fillStyle = "rgba(0,0,0,.35)"; half(-C / 2, -C / 2, C, C, 7, .6); x.fillStyle = ink.news; T("把", 2, 2, 170, SONG, 900); });
  cell(4, "copy", 190, 196, (x) => { x.strokeStyle = "rgba(190,40,30,.85)"; x.lineWidth = 2.5; x.strokeRect(-82, -82, 164, 164); x.lineWidth = 1; x.setLineDash([6, 5]); x.beginPath(); x.moveTo(-82, 0); x.lineTo(82, 0); x.moveTo(0, -82); x.lineTo(0, 82); x.moveTo(-82, -82); x.lineTo(82, 82); x.moveTo(82, -82); x.lineTo(-82, 82); x.stroke(); x.setLineDash([]); x.fillStyle = ink.copy; T("感", 0, 4, 140, KAI, 400); });
  cell(5, "gloss", 172, 210, (x) => { x.fillStyle = "rgba(30,30,40,.5)"; half(-C / 2, 60, C, 60, 5, .7); x.fillStyle = ink.gloss; T("情", 0, -10, 150, HEI, 300, { skew: -.2 }); });
  cell(6, "yellow", 168, 176, (x) => { x.strokeStyle = "rgba(60,90,160,.35)"; x.lineWidth = 1; for (let i = -8; i <= 8; i++) { x.beginPath(); x.moveTo(i * 16, -C / 2); x.lineTo(i * 16, C / 2); x.moveTo(-C / 2, i * 16); x.lineTo(C / 2, i * 16); x.stroke(); } x.fillStyle = ink.yellow; T("组", 0, 4, 138, SONG, 600); });
  cell(7, "black", 164, 182, (x) => { T("合", 0, 4, 140, SONG, 800); });
  cell(8, "news", 196, 212, (x) => { x.fillStyle = "rgba(26,23,20,.85)"; fine(PROSE, -120, -120, -62, 128, 13, SONG, true); fine(PROSE.slice(20), 62, -120, 120, 128, 13, SONG, true); x.fillRect(-60, -C / 2, 1.5, C); x.fillRect(58, -C / 2, 1.5, C); x.fillStyle = ink.news; T("背", 0, 0, 118, SONG, 600); });
  cell(9, "pink", 182, 180, (x) => { T("诵", 0, 6, 150, HEI, 900); });
  // words cut from human writing
  const W = [["悲秋", "book", SONG, 500, 1], ["作客", "news", SONG, 700, 0], ["尋尋覓覓", "copy", KAI, 400, 1], ["冷冷清清", "book", SONG, 400, 1], ["凄凄", "red", HEI, 700, 0], ["永别", "news", HEI, 900, 0],
    ["卿卿", "gloss", KAI, 400, 0], ["茫茫", "blue", SONG, 700, 0], ["思量", "book", SONG, 500, 1], ["难忘", "yellow", HEI, 700, 0], ["醒來", "news", SONG, 600, 1], ["愛你", "pink", KAI, 400, 0],
    ["彷徨", "gloss", SONG, 300, 0], ["悠长", "news", HEI, 500, 0], ["寂寥", "book", SONG, 500, 1], ["雨巷", "black", SONG, 700, 0], ["心", "red", SONG, 900, 0], ["痛", "news", HEI, 900, 0],
    ["体温", "copy", KAI, 400, 0], ["感情", "blue", HEI, 300, 0], ["淚", "book", SONG, 600, 0], ["愁", "yellow", KAI, 400, 0], ["夜", "news", SONG, 900, 0], ["灯", "gloss", HEI, 700, 0],
    ["DADA", "news", LSERIF, 900, 0], ["1916", "red", LSERIF, 700, 0], ["Liebe", "gloss", LSERIF, 400, 0], ["le cœur", "book", LSERIF, 400, 0], ["No. 7", "yellow", LSERIF, 700, 0], ["§ 3", "news", LSERIF, 400, 0],
    ["登臺", "book", SONG, 500, 1], ["别矣", "copy", KAI, 400, 1], ["独自", "news", SONG, 400, 0], ["百年", "black", HEI, 700, 0], ["相思", "gloss", SONG, 500, 0], ["多病", "news", SONG, 500, 1]];
  W.forEach(([t, kind, font, wt, vert], i) => { const n = [...t].length, latin = /^[\x00-\x7fœ☞]+$/.test(t), sz = latin ? rr(44, 74) : rr(56, 92) / Math.max(1, n * .55);
    const w = vert ? sz * 1.5 + 20 : Math.min(236, (latin ? t.length * sz * .62 : n * sz * 1.04) + rr(18, 40)), h = vert ? Math.min(236, n * sz * 1.08 + rr(18, 40)) : sz * 1.5 + rr(6, 30);
    cell(10 + i, kind, w, h, (x, ww, hh) => { if (rnd() < .4) { x.globalAlpha = .4; fine(PROSE.slice(Math.floor(rnd() * 40)), -ww / 2, -hh / 2 + 4, ww / 2, hh / 2, 10, SONG, vert); x.globalAlpha = 1; }
      if (rnd() < .3) x.fillRect(-ww / 2, hh / 2 - 9, ww, 3);
      if (vert) [...t].forEach((c, k) => T(c, 0, (k - (n - 1) / 2) * sz * 1.08, sz, font, wt)); else T(t, 0, 2, sz, font, wt, { skew: rnd() < .2 ? -.2 : 0 }); }); });
  // small blocks of body text and rules, and a few blank backs
  for (let i = 10 + W.length; i < 64; i++) { const kind = ["news", "book", "gloss", "news", "blue", "copy"][i % 6], w = rr(90, 220), h = rr(60, 200);
    cell(i, kind, w, h, (x, ww, hh) => { if (i % 5 === 4) { x.fillStyle = "rgba(0,0,0,.4)"; half(-C / 2, -C / 2, C, C, rr(5, 9), .7); return; } fine(PROSE.slice(i % 30), -ww / 2 + 6, -hh / 2 + 10, ww / 2, hh / 2, rr(10, 15), SONG, i % 2); if (i % 3 === 0) x.fillRect(-ww / 2, -hh / 2 + 6, ww, 2); }); }
  return { canvas: cv, cells }; }

// ───────── the sentence along the crack ─────────
// The crack: a polyline across the sky in screen units (x 0..1, y 0..1 down), jagged like lightning; the 14 characters sit on it, each turned to the crack
// at its place, and the crack runs through them. Returns the texture canvas (2048×1152, r = the characters, g = their index/16), the crack points,
// and points inside the strokes (for the particles of the nebula to land on).
export const SENTENCE = "说痛疑偷前代句　言空恐负片时情";
export function buildSentence(nPts = 120000) { seed = 307; const W = 2048, H = 1152, cv = new OffscreenCanvas(W, H), x = cv.getContext("2d");
  let P = [[-.04, .47], [1.04, .43]]; const amp = [.07, .045, .028, .016, .009];
  for (const a of amp) { const Q = [P[0]]; for (let i = 0; i < P.length - 1; i++) { const [ax, ay] = P[i], [bx, by] = P[i + 1]; Q.push([(ax + bx) / 2 + rr(-.25, .25) * a * .4, (ay + by) / 2 + rr(-1, 1) * a]); Q.push(P[i + 1]); } P = Q; }
  // arc length → the characters at even steps along the middle 84%
  const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot((P[i][0] - P[i - 1][0]) * 16 / 9, P[i][1] - P[i - 1][1]));
  const at = (s) => { let i = 1; while (i < P.length - 1 && L[i] < s) i++; const f = (s - L[i - 1]) / (L[i] - L[i - 1]); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f]; };
  const chars = [...SENTENCE], s0 = L[L.length - 1] * .1, s1 = L[L.length - 1] * .9, place = [];
  x.fillStyle = "#000"; x.fillRect(0, 0, W, H);
  chars.forEach((ch, i) => { const s = s0 + (s1 - s0) * (i + .5) / chars.length, p = at(s), a = at(s - .06), b = at(s + .06), ang = Math.atan2((b[1] - a[1]), (b[0] - a[0]) * 16 / 9) * .3;
    if (ch === "　") return; const size = 98 * W / 1920; place.push([p[0], p[1], ang, i]);
    x.save(); x.translate(p[0] * W, p[1] * H); x.rotate(ang); x.scale(.9, 1); x.fillStyle = `rgb(255,${i * 16},0)`; x.font = `600 ${size}px ${SONG}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(ch, 0, 0); x.restore(); });
  const im = x.getImageData(0, 0, W, H).data, pts = new Float32Array(nPts * 2); let n = 0;
  for (let tries = 0; n < nPts && tries < nPts * 60; tries++) { const px = Math.floor(rnd() * W), py = Math.floor(rnd() * H); if (im[(py * W + px) * 4] > 140) { pts[n * 2] = (px + rnd()) / W; pts[n * 2 + 1] = (py + rnd()) / H; n++; } }
  return { canvas: cv, crack: P, place, pts: pts.subarray(0, n * 2), n }; }
