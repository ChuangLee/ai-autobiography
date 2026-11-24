// Shared WGSL for the verse-4 styles. Every full-screen style gets the same bindings:
//   U.res, U.t (song seconds), U.w (layer weight), U.p[0..5] (style parameters, see index.html)
//   atlas (real glyphs, 962 cells of 128 px, 32 a row), sheet (words set with browser fonts), form (the gold form rendered off screen, for the silkscreen)
export const HEAD = /* wgsl */`
struct Un{ res:vec2f, t:f32, w:f32, p:array<vec4f,6> }
@group(0)@binding(0) var<uniform> U:Un;
@group(0)@binding(1) var samp:sampler;
@group(0)@binding(2) var atlas:texture_2d<f32>;
@group(0)@binding(3) var sheet:texture_2d<f32>;
@group(0)@binding(4) var form:texture_2d<f32>;
const PI=3.14159265; const TAU=6.2831853;
fn sat(x:f32)->f32{ return clamp(x,0.,1.); }
fn rot(a:f32)->mat2x2f{ let c=cos(a); let s=sin(a); return mat2x2f(c,s,-s,c); }
fn lin3(c:vec3f)->vec3f{ return pow(max(c,vec3f(0.)),vec3f(2.2)); }
fn hx(h:u32)->vec3f{ return vec3f(f32((h>>16u)&255u),f32((h>>8u)&255u),f32(h&255u))/255.; }
fn px()->f32{ return 1./U.res.y; }
// frame coordinates: y up, height 1, centre 0
fn frame(fc:vec2f)->vec2f{ return vec2f(fc.x-.5*U.res.x,.5*U.res.y-fc.y)/U.res.y; }
fn sdSeg(p:vec2f,a:vec2f,b:vec2f)->f32{ let pa=p-a; let ba=b-a; return length(pa-ba*sat(dot(pa,ba)/dot(ba,ba))); }
fn sdBox(p:vec2f,b:vec2f)->f32{ let d=abs(p)-b; return length(max(d,vec2f(0.)))+min(max(d.x,d.y),0.); }
fn smin(a:f32,b:f32,k:f32)->f32{ let h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }
fn smax(a:f32,b:f32,k:f32)->f32{ return -smin(-a,-b,k); }
// a line of half-width w around distance 0, anti-aliased over e
fn ln(d:f32,w:f32,e:f32)->f32{ return 1.-smoothstep(w-e,w+e,abs(d)); }
fn fill(d:f32,e:f32)->f32{ return 1.-smoothstep(-e,e,d); }
// one glyph of the atlas: cell index, q in 0..1 (y down) inside its square, lod from the size of the square in pixels
fn glyph(cell:f32,q:vec2f,sizePx:f32)->f32{ let c=vec2f(cell%32.,floor(cell/32.)); let m=step(abs(q.x-.5),.5)*step(abs(q.y-.5),.5);
  return m*textureSampleLevel(atlas,samp,(c+.5+(q-.5)*.84)/32.,clamp(log2(108./max(sizePx,1.)),0.,5.)).r; }
// a field of glyphs: p in tile units (y up); every tile holds a different real character
fn glyphField(p:vec2f,seed:f32,sizePx:f32)->f32{ let i=floor(p); let f=fract(p); let cell=floor(hash21(i+seed*17.3)*961.99); return glyph(cell,vec2f(f.x,1.-f.y),sizePx); }
// words from the sheet: q in 0..1 (y down) of the rectangle r (x,y,w,h in sheet pixels, sheet 2048×1024)
fn words(q:vec2f,r:vec4f,sizePx:f32)->f32{ let m=step(abs(q.x-.5),.5)*step(abs(q.y-.5),.5);
  return m*textureSampleLevel(sheet,samp,(r.xy+q*r.zw)/vec2f(2048.,1024.),clamp(log2(r.w/max(sizePx,1.)),0.,6.)).a; }
// paper: fibres and a little tooth
fn paperTex(p:vec2f)->f32{ return .5*fbm(p*vec2f(60.,220.))+.3*fbm(p*340.)+.2*vnoise(p*900.); }
// the bowler-hatted man, about 1 tall, feet at y=0, head centre near y=.865. turn: 0 full width … 1 edge-on. hat: 0 bare-headed … 1 hat on (it comes down from above)
// returns (coat, head, hat, whole)
fn sdMan(q:vec2f,turn:f32,hat:f32)->vec4f{ var p=q; p.x/=mix(1.,.6,turn); let ax=abs(p.x);
  let sh=mix(.118,.148,smoothstep(.2,.74,p.y));                         // the overcoat flares a little to the knee
  var coat=sdBox(p-vec2f(0.,.50),vec2f(sh-.035,.245))-.035; coat=max(coat,(p.y-.79)+ax*.42);   // sloping shoulders
  let legs=sdBox(vec2f(ax-.05,p.y-.12),vec2f(.036,.12))-.006; let shoe=sdBox(vec2f(ax-.062,p.y-.014),vec2f(.046,.012))-.01;
  let hand=min(length(vec2f(ax-.158,p.y-.335))-.024,sdSeg(vec2f(ax,p.y),vec2f(.128,.71),vec2f(.156,.38))-.033);
  let head=length((p-vec2f(0.,.865))*vec2f(1.14,1.))-.064; let neck=sdBox(p-vec2f(0.,.79),vec2f(.032,.035));
  let hp=p-vec2f(0.,.918+(1.-hat)*.45); let dome=max(length(hp*vec2f(1.,1.02))-.074,-hp.y-.004); let brim=sdBox(hp-vec2f(0.,-.002),vec2f(.112,.003))-.007; var hatd=min(dome,brim); if(hat<.01){ hatd=9.; }
  let body=min(min(min(coat,hand),min(legs,shoe)),neck);
  return vec4f(body,head,hatd,min(min(body,head),hatd)); }
`;
// cubic through keys, for the timeline
export function curve(x, y) { const n = x.length, d = [], m = new Array(n); for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2]; for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : 2 * d[i - 1] * d[i] / (d[i - 1] + d[i]);
  return (t) => { if (t <= x[0]) return y[0]; if (t >= x[n - 1]) return y[n - 1]; let i = 0; while (t > x[i + 1]) i++; const h = x[i + 1] - x[i], s = (t - x[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * h * m[i + 1]; }; }
export const curveN = (keys) => { const x = keys.map((k) => k[0]), n = keys[0].length - 1, cs = []; for (let j = 0; j < n; j++) cs.push(curve(x, keys.map((k) => k[j + 1]))); return (t) => cs.map((c) => c(t)); };
