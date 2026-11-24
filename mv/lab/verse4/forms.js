// 文字汇成了全新的生命 — abstract mathematics, its matter real writing.
// GROUND  the dark ground the fresco cracks open onto (full-screen style, shared bindings of common.js)
// FORMS   N glyph quads placed by the vertex shader alone. Every glyph i has a fixed parameter (u,v) on a square and a place on each form:
//         sphere → (through the spindle and horn tori) ring torus → the tube flattens while it turns half a turn per circuit: a Möbius band
//         → it closes into a Klein bottle (the classic immersion) → the glyphs leave it and run along the Lorenz orbit, which never repeats
//         → they pour up a trunk that keeps dividing into three, level after level: a fractal plant.
//         Before all that they burst out of one point (the gold at the fingertip of the fresco).
// FORMS uniforms (see index.html): res, t, n | eye, tan(fov/2) | target, glyph size (frame units) | stage 0…5, gather, brightness, flow time | src xyz, tree growth | burst, hold, unused…
export const GROUND = /* wgsl */`
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let P=frame(fc.xy); let glow=U.p[0].x; let c=U.p[0].yz;
  // a deep, even dark; the faintest warmth where the gold is, and nothing else
  var col=mix(hx(0x07080bu),hx(0x0b0c11u),sat(.6-P.y*.4));
  col+=hx(0x3a2a10u)*glow*exp(-dot(P-c,P-c)*3.2)*.55;
  col*=1.-.25*smoothstep(.4,1.1,length(P*vec2f(.75,1.)));
  return vec4f(lin3(col),U.w); }
`;
export const FORMS = /* wgsl */`
struct FU{ res:vec2f, t:f32, n:f32, eye:vec4f, tgt:vec4f, m:vec4f, src:vec4f, x:vec4f }
@group(0)@binding(0) var<uniform> F:FU;
@group(0)@binding(1) var samp:sampler;
@group(0)@binding(2) var atlas:texture_2d<f32>;
@group(0)@binding(3) var<storage,read> orbit:array<vec4f>;
const PI=3.14159265; const TAU=6.2831853;
fn sat(x:f32)->f32{ return clamp(x,0.,1.); }
fn h1(i:f32,k:f32)->f32{ return fract(sin(i*12.9898+k*78.233)*43758.5453); }
fn rot2(a:f32)->mat2x2f{ let c=cos(a); let s=sin(a); return mat2x2f(c,s,-s,c); }
fn ss(x:f32)->f32{ let y=sat(x); return y*y*(3.-2.*y); }
// the tube family: sphere (R=0) … ring torus; a cross-section ellipse turned by tw about the tube's centre line
fn tube(th:f32,ps:f32,R:f32,ra:f32,rb:f32,tw:f32)->vec3f{ let c=rot2(tw)*vec2f(ra*cos(ps),rb*sin(ps)); let rr=R+c.x; return vec3f(rr*cos(th),c.y,rr*sin(th)); }
fn klein(u0:f32,v:f32)->vec3f{ let u=u0*PI; let c=cos(u); let s=sin(u); let c2=c*c; let c4=c2*c2; let c6=c4*c2; let cv=cos(v); let sv=sin(v);
  let x=-2./15.*c*(3.*cv-30.*s+90.*c4*s-60.*c6*s+5.*c*cv*s);
  let y=-1./15.*s*(3.*cv-3.*c2*cv-48.*c4*cv+48.*c6*cv-60.*s+5.*c*cv*s-5.*c2*c*cv*s-80.*c4*c*cv*s+80.*c6*c*cv*s);
  let z=2./15.*(3.+5.*c*s)*sv; let k=vec3f(x-.15,2.1-y,z)*.31; let cr=cos(.35); let sr=sin(.35); return yrot(vec3f(cr*k.x-sr*k.y,sr*k.x+cr*k.y,k.z),1.1); }
fn yrot(p:vec3f,a:f32)->vec3f{ let c=cos(a); let s=sin(a); return vec3f(c*p.x+s*p.z,p.y,-s*p.x+c*p.z); }
fn lorenz(i:f32)->vec3f{ let M=F.x.z; let k=fract(h1(i,5.1)+F.m.w*.0021)*M; let a=u32(floor(k))%u32(M); let b=(a+1u)%u32(M); return yrot(mix(orbit[a].xyz,orbit[b].xyz,fract(k)),1.25); }
// a plant that divides into three at the end of every branch; glyph i lives on one branch of one level, at a fraction along it.
// growth g: level k is grown by sat(g-k). A glyph whose branch has not grown waits at the tip of what has.
fn plant(i:f32,g:f32,t:f32)->vec4f{ let B=1.38; let K=10.; let r=h1(i,9.7); let lv=min(floor(log(1.+r*(pow(B,K+1.)-1.))/log(B)),K);
  var pos=vec3f(0.,-.82,0.); var dir=vec3f(0.,1.,0.); var side=vec3f(1.,0.,0.); var len=.40; var path=h1(i,3.3); var rad=.02;
  for(var k=0.;k<K+1.;k+=1.){ let grow=sat(g-k); let sway=.05*sin(t*.9+k*1.7+pos.x*3.);
    if(k>=lv||grow<1.){ let s=select(1.,h1(i,7.7),k>=lv); let fr=min(s,grow); let o=normalize(vec3f(h1(i,1.1),h1(i,2.2),h1(i,3.4))-.5);
      return vec4f(pos+dir*len*fr+(o-dir*dot(o,dir))*rad*sqrt(h1(i,4.4))*select(0.,1.,k>=lv),k); }
    pos+=dir*len; path*=2.; let d=floor(path); path=fract(path);
    let a=d*PI+k*PI*.5+.3*sin(k*1.7)+sway; let tilt=.52+.05*sin(k*2.3)+.5*sway; let w=cross(dir,side);
    dir=normalize(cos(tilt)*dir+sin(tilt)*(cos(a)*side+sin(a)*w)+vec3f(0.,.06,0.)); side=normalize(cross(w,dir)); len*=.74; rad*=.66; }
  return vec4f(pos,K); }
struct VO{ @builtin(position) pos:vec4f, @location(0) uv:vec2f, @location(1) @interpolate(flat) cell:f32, @location(2) @interpolate(flat) col:vec4f }
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) ii:u32)->VO{
  var o:VO; let i=f32(ii); let t=F.t; let st=F.m.x;
  let u=fract(.7548776662*i+.5); let v=fract(.5698402910*i+.5); let hr=h1(i,1.7);
  // ── where glyph i is on the current form, and the form's normal there (for the light)
  let th=u*TAU; let w=fract(2.*v); let ps=mix(asin(2.*w-1.)+step(.5,v)*PI,v*TAU-PI*.5,ss(st));
  let a01=ss(st); let a12=ss(st-1.); let spin=t*.7;
  let R=mix(0.,.62,a01); let ra=mix(.78,mix(.3,.36,a12),a01); let rb=mix(.78,mix(.3,.0,a12),a01); let tw=(th*.5+spin)*a12;
  var p=tube(th,ps,R,ra,rb,tw); var nr=normalize(p-vec3f(R*cos(th),0.,R*sin(th))+vec3f(0.,1e-4,0.));
  p+=nr*.018*sin(th*5.+ps*3.-t*2.6)*(1.-a12);                                            // the surface breathes
  if(st>2.){ let d=.45*u+.05*hr; let f=ss((st-2.-d)/.5); let k=klein(u,v*TAU); p=mix(p,k,f)+vec3f(0.,.12*sin(PI*f),0.)*(hr-.5); nr=mix(nr,normalize(k-vec3f(0.,k.y,0.)*.6+1e-4),f); }
  if(st>3.){ let d=.5*fract(u+v*.37)+.0*hr; let f=ss((st-3.-d)/.5); let l=lorenz(i); p=mix(p,l,f)+normalize(vec3f(h1(i,2.),h1(i,3.),h1(i,4.))-.5)*.25*sin(PI*f); nr=mix(nr,vec3f(0.),f); }
  var lvl=-1.;
  if(st>4.){ let d=.45*h1(i,8.8); let f=ss((st-4.-d)/.55); let pl=plant(i,F.src.w,t); lvl=pl.w; p=mix(p,pl.xyz,f); nr=mix(nr,vec3f(0.),f); }
  // ── the burst out of one point, before the sphere is made
  let gs=F.m.y; if(gs<1.){ let d=.6*h1(i,6.6); let f=ss((gs-d)/.4); let dir=normalize(vec3f(h1(i,2.5),h1(i,3.5),h1(i,4.5))-.5);
    let burst=F.src.xyz+dir*(.03+.5*pow(h1(i,9.1),2.))*F.x.x; let side=normalize(cross(dir,vec3f(0.,1.,0.))+1e-4); p=mix(burst,p,f)+side*.25*sin(PI*f)*(h1(i,5.5)-.3); }
  // ── camera
  let fw=normalize(F.tgt.xyz-F.eye.xyz); let rt=normalize(cross(fw,vec3f(0.,1.,0.))); let up=cross(rt,fw); let q=p-F.eye.xyz; let z=max(dot(q,fw),.05);
  let asp=F.res.x/F.res.y; let th2=F.eye.w;
  var ndc=vec2f(dot(q,rt)/(z*th2*asp),dot(q,up)/(z*th2));
  // ── size: most glyphs are fine grain, a few are large enough to read
  let big=step(.985,hr)*2.2+step(.93,hr)*.9+1.; var size=F.tgt.w*(.65+.5*h1(i,4.8))*big*select(1.,mix(1.9,.6,lvl/9.),lvl>=0.);
  var sf=size/(2.*z*th2); let minS=1.3/F.res.y; var inten=1.; if(sf<minS){ inten=(sf*sf)/(minS*minS); sf=minS; }
  let corner=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.))[vi];
  ndc+=corner*sf*vec2f(1./asp,1.);
  o.pos=vec4f(ndc,.5,1.); o.uv=corner*vec2f(.5,-.5)+.5;
  // ── which character: mostly the world's writing, some words, a few signs of mathematics
  let c0=h1(i,11.3); var cell=floor(h1(i,12.1)*775.99); if(c0>.9){ cell=776.+floor(h1(i,13.)*85.99); } if(c0>.965){ cell=select(901.+floor(h1(i,14.)*14.99),862.+floor(h1(i,14.)*9.99),h1(i,15.)<.35); }
  o.cell=cell;
  // ── light: a key from above left, the far side dimmer; glyphs in the middle of the cloud a little hotter
  let L=normalize(vec3f(-.5,.7,.6)); var sh=1.; if(dot(nr,nr)>.01){ let nn=normalize(nr); sh=.45+.75*max(dot(nn,L),0.)+.35*pow(1.-abs(dot(nn,-fw)),3.); sh*=mix(.38,1.,smoothstep(-.18,.16,dot(nn,-fw))); }
  let tw2=.75+.25*sin(t*3.+hr*40.); let fade=sat(1.2-z*.18);
  o.col=vec4f(F.m.z*inten*sh*tw2*fade/big,clamp((z-1.5)*.43,0.,1.),0.,sqrt(sf*F.res.y));
  if(z<.06){ o.pos=vec4f(0.,0.,-1.,1.); }
  return o; }
@fragment fn fs(o:VO)->@location(0) vec4f{
  let c=vec2f(o.cell%32.,floor(o.cell/32.)); let lod=clamp(log2(108./max(o.col.w*o.col.w,1.)),0.,5.);
  let a=textureSampleLevel(atlas,samp,(c+.5+(o.uv-.5)*.84)/32.,lod).r;
  let gold=mix(vec3f(1.,.76,.43),vec3f(.67,.54,.38),o.col.y); return vec4f(gold*a*o.col.x,0.); }
`;
// the Lorenz orbit (σ 10, ρ 28, β 8/3), integrated once; normalised so the butterfly stands upright about the origin
export function lorenzOrbit(M = 65536) { const o = new Float32Array(M * 4), dt = .004, f = (x, y, z) => [10 * (y - x), x * (28 - z) - y, x * y - 8 / 3 * z];
  let s = [.1, 0, 0]; const step = () => { const [x, y, z] = s, k1 = f(x, y, z), k2 = f(x + k1[0] * dt / 2, y + k1[1] * dt / 2, z + k1[2] * dt / 2), k3 = f(x + k2[0] * dt / 2, y + k2[1] * dt / 2, z + k2[2] * dt / 2), k4 = f(x + k3[0] * dt, y + k3[1] * dt, z + k3[2] * dt);
    s = [x + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), y + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]), z + dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])]; };
  for (let i = 0; i < 3000; i++) step(); const S = .034;
  for (let i = 0; i < M; i++) { step(); o.set([s[0] * S, (s[2] - 24) * S, s[1] * S, 0], i * 4); } return o; }
