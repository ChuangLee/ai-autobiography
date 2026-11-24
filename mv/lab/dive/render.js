import { FS_VS, NOISE } from "../lib.js";
import { PIG, WORLD } from "./sim.js";
import { INK, DABS, LAND } from "./paint.js";
// ───────── the water: no horizon, only depth. Fog toward the colour of the water at each depth, soft shafts, pigment as an absorber
// (coloured Beer–Lambert, single scattering from the top light through its own shadow), and the surface overhead: Snell's window ─────────
export const VOLUME = FS_VS + NOISE + PIG + `
struct U { cam:vec4f, right:vec4f, up:vec4f, fwd:vec4f, bmin:vec4f, bmax:vec4f, par:vec4f, par2:vec4f, drops:array<vec4f,4> }
@group(0)@binding(0) var<uniform> u:U;
@group(0)@binding(1) var samp:sampler;
@group(0)@binding(2) var dye:texture_3d<f32>;
@group(0)@binding(3) var lightT:texture_3d<f32>;
@group(0)@binding(4) var occT:texture_3d<f32>;
const FOG=vec3f(.13,.085,.080);
const WCOL=vec3f(.50,.93,.90);
const WDEC=vec3f(1.00,.50,.46);
const SUN=vec3f(1.,.97,.9);
const LDIR=vec3f(.22,-1.,.10);
fn shaft(p:vec3f)->f32{ let q=p.xz-LDIR.xz*p.y; let t=u.par.x;
  let a=fbm(q*1.7+vec2f(t*.035,-t*.02)); let b=vnoise(q*4.3-vec2f(t*.05,t*.03));
  return mix(1.,.72+.95*smoothstep(.36,.74,a)*(.55+.9*b),u.par.w*smoothstep(.05,1.,-p.y)); }
fn water(depth:f32)->vec3f{ return WCOL*u.par2.w*exp(-WDEC*depth); }
fn medium(p:vec3f, ds:f32, rd:vec3f, dense:bool, T:ptr<function,vec3f>, C:ptr<function,vec3f>){
  let depth=max(-p.y,0.); var Tl=vec3f(1.); var sT=vec3f(0.); var sS=vec3f(0.); var gl=0.;
  if(dense){ let uvw=(p-u.bmin.xyz)/(u.bmax.xyz-u.bmin.xyz);
    let d=max(textureSampleLevel(dye,samp,uvw,0.)-vec4f(.0015),vec4f(0.)); Tl=textureSampleLevel(lightT,samp,uvw,0.).rgb; sT=sigT(d); sS=sigS(d);
    let c=floor(p*90.); let h=hash31(c); gl=min(d.w,.5)*pow(max(0.,sin(h*6.283+u.par.x*(.5+1.2*hash31(c+7.)))),60.); }
  let sh=shaft(p); let ph=.85+.5*max(rd.y,0.)*max(rd.y,0.);
  let Ls=SUN*u.par.z*exp(-WDEC*depth*.7)*(Tl*(.55+.45*sh)*ph+pow(Tl,vec3f(.3))*.07)+SUN*u.par.z*gl*30.;
  let Lw=water(depth)*mix(vec3f(1.),Tl,.8)*sh;
  let s=sT+FOG; let dT=exp(-s*ds);
  *C+=*T*((sS*Ls+FOG*Lw)/s)*(1.-dT); *T*=dT;
}
fn ripple(q:vec2f)->vec2f{ let t=u.par.x; var g=vec2f(0.);
  let e=.06; let o=vec2f(t*.05,t*.03); let h0=fbm(q*1.9+o); g+=vec2f(fbm(q*1.9+vec2f(e,0.)+o)-h0,fbm(q*1.9+vec2f(0.,e)+o)-h0)/e*.045*u.par2.x;
  for(var i=0;i<4;i++){ let d=u.drops[i]; let tau=t-d.z; if(tau>0.&&tau<7.){ let v=q-d.xy; let r=length(v)+1e-4; let w=exp(-tau*.55)*smoothstep(0.,.25,tau)*d.w;
      let x=r*17.-tau*7.5; g+=v/r*cos(x)*w*.34*exp(-r*1.1)*smoothstep(tau*.62+.25,tau*.62-.1,r); } }
  return g; }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let res=u.bmin.w; let asp=u.right.w; let ndc=fc.xy/vec2f(res*asp,res)*2.-1.;
  let rd=normalize(u.fwd.xyz+ndc.x*asp*u.fwd.w*u.right.xyz-ndc.y*u.fwd.w*u.up.xyz); let ro=u.cam.xyz;
  var T=vec3f(1.); var C=vec3f(0.); let jit=hash21(fc.xy+17.);
  var tEnd=14.; var hit=false; if(rd.y>1e-4){ let ts=-ro.y/rd.y; if(ts<tEnd){ tEnd=ts; hit=true; } }
  let inv=1./rd; let a=(u.bmin.xyz-ro)*inv; let b=(u.bmax.xyz-ro)*inv; let lo=min(a,b); let hi=max(a,b);
  let t0=max(max(lo.x,lo.y),max(lo.z,0.)); let t1=min(min(hi.x,hi.y),min(hi.z,tEnd));
  let dsf=u.par.y; let dsc=u.par2.z;
  if(t1>t0){
    if(t0>0.){ let n=5; let ds=t0/f32(n); for(var i=0;i<n;i++){ medium(ro+rd*(f32(i)+jit)*ds,ds,rd,false,&T,&C); } }
    var t=t0+jit*dsf;
    for(var i=0;i<260;i++){ if(t>=t1){ break; } let p=ro+rd*t; let uvw=(p-u.bmin.xyz)/(u.bmax.xyz-u.bmin.xyz);
      if(textureSampleLevel(occT,samp,uvw,0.).r>.0012){ let ds=min(dsf,t1-t); medium(p,ds,rd,true,&T,&C); t+=ds; }
      else { let ds=min(dsc,t1-t); medium(p+rd*ds*(.5-jit*.0),ds,rd,false,&T,&C); t+=ds; }
      if(dot(T,vec3f(1.))<.006){ break; } }
    if(tEnd>t1){ let n=5; let ds=(tEnd-t1)/f32(n); for(var i=0;i<n;i++){ medium(ro+rd*(t1+(f32(i)+jit)*ds),ds,rd,false,&T,&C); } }
  } else { let n=9; let ds=tEnd/f32(n); for(var i=0;i<n;i++){ medium(ro+rd*(f32(i)+jit)*ds,ds,rd,false,&T,&C); } }
  let Tv=dot(T,vec3f(.333));
  if(hit){ let hp=ro+rd*tEnd; let g=ripple(hp.xz); let n=normalize(vec3f(g.x,-1.,g.y)); let ci=clamp(-dot(rd,n),0.,1.);
    let s2=1.7769*(1.-ci*ci); var F=1.; var ct=0.;
    if(s2<1.){ ct=sqrt(1.-s2); let rs=(1.333*ci-ct)/(1.333*ci+ct); let rp=(ci-1.333*ct)/(ci+1.333*ct); F=clamp(.5*(rs*rs+rp*rp),0.,1.); }
    C+=T*((1.-F)*vec3f(1.,.985,.95)*u.par2.y*(.7+.3*ct)+F*water(.25)*.85);
  } else { C+=T*water(max(-(ro.y+rd.y*tEnd),0.)); }
  return vec4f(C,Tv);
}
`;
// ───────── compose: the painted world above the water, the waterline on the lens, the water below; the mural hand over both ─────────
export const COMPOSE = FS_VS + NOISE + `
struct U { par:vec4f, par2:vec4f, par3:vec4f, par4:vec4f, par5:vec4f, eye0:vec4f, eye1:vec4f, bird:vec4f, misc:vec4f }
@group(0)@binding(0) var<uniform> u:U;
@group(0)@binding(1) var samp:sampler;
@group(0)@binding(2) var vol:texture_2d<f32>;
@group(0)@binding(3) var study:texture_2d<f32>;
@group(0)@binding(4) var gbuf:texture_2d<f32>;
` + INK + DABS + LAND + `
fn invFilm(y0:vec3f)->vec3f{ let y=clamp(y0,vec3f(0.),vec3f(.985)); let a=2.51-2.43*y; let b=.03-.59*y; let c=-.14*y; return (-b+sqrt(max(b*b-4.*a*c,vec3f(0.))))/(2.*a); }
// the wall: lime plaster, unevenly absorbent, crazed, flaked in places
fn plaster(uv:vec2f)->vec4f{ let p=uv*vec2f(1.7778,1.); let a=fbm(p*7.); let cr=smoothstep(.010,.0,abs(fbm(p*3.3+9.)-.5))*smoothstep(.35,.6,vnoise(p*2.+3.));
  let fl=smoothstep(.70,.78,fbm(p*11.+21.)); return vec4f(vec3f(.86+.20*(a-.5)-.22*cr-.05*hash21(floor(uv*vec2f(1920.,1080.)*.5))),fl*.45); }
const LINE=vec3f(.20,.085,.055);
// 鲲 / 鹏 in mural manner, from the buffer of which part of the body covers each pixel: flat mineral colour, iron-red contour, scales and fin rays drawn as line
fn body(uv:vec2f)->vec4f{
  let dm=vec2f(textureDimensions(gbuf)); let ip=vec2i(uv*dm); let g=textureLoad(gbuf,ip,0);
  var edge=0.; for(var k=0;k<8;k++){ let o=vec2i(vec2f(cos(f32(k)*.7854),sin(f32(k)*.7854))*select(1.6,2.6,k%2==1)); let h=textureLoad(gbuf,clamp(ip+o,vec2i(0),vec2i(dm)-1),0);
    edge=max(edge,max(abs(h.a-g.a),step(.5,abs(h.r-g.r))*min(h.a,g.a))); }
  if(g.a<.5){ return vec4f(LINE,edge*.9); }
  let AZ=vec3f(.10,.27,.52); let AZ2=vec3f(.22,.42,.62); let MA=vec3f(.16,.47,.38); let CI=vec3f(.70,.19,.11); let OC=vec3f(.78,.56,.24); let WH=vec3f(.87,.83,.73); let GD=vec3f(.93,.72,.28);
  var c=AZ; var ln=0.; let part=g.r; let a=g.g; let b=g.b;
  if(part<.5){ let rows=44.; let i=floor(a*rows); let cx=b*20.+.5*(i%2.); let fx=fract(cx); let fy=fract(a*rows); let belly=cos(b*6.2832);
    let h=hash21(vec2f(i,floor(cx))); c=mix(AZ,AZ2,step(.5,h)); c=mix(c,MA,step(.80,h)); c=mix(c,OC,step(.94,h)); c=mix(c,WH,smoothstep(-.35,-.75,belly));
    if(a<.80){ ln=smoothstep(.16,.04,abs(fy-(.08+.85*(1.-4.*(fx-.5)*(fx-.5))))); c=mix(c,c*1.25+.05,smoothstep(.5,.0,fy)*.5); }
    else { c=mix(AZ,WH,smoothstep(-.2,-.7,belly)); ln=smoothstep(.006,.002,abs(a-.805))+smoothstep(.02,.008,abs(belly+.38))*step(.93,a); } }
  else if(part<3.5){ let n=select(28.,24.,part>2.5); let f=fract(a*n); let k=floor(a*n); c=mix(CI,OC,step(.5,fract(k*.5))); c=mix(c,MA,step(.66,fract(k*.3333))*step(1.5,part)); c=mix(c,WH,smoothstep(.55,.95,b)*.0+step(.9,b)*.6);
    c=mix(c,GD,smoothstep(.80,.92,b)*step(2.5,part)); ln=smoothstep(.12,.03,min(f,1.-f)); }
  else if(part<4.5){ c=AZ; }
  else { c=mix(GD,OC,smoothstep(.3,.9,a)); ln=smoothstep(.10,.03,abs(fract(b+.5)-.5))*.0+smoothstep(.06,.02,abs(cos(b*6.2832)))*.8; }
  for(var k=0;k<2;k++){ var ey=u.eye0; if(k==1){ ey=u.eye1; } if(ey.w>.01){ let q=(uv-ey.xy)*vec2f(1.7778,1.)/ey.z; let al=length(q*vec2f(.72,1.15)); let d=length(q);
      let w=smoothstep(1.,.94,al)*ey.w; c=mix(c,WH,w); c=mix(c,GD,w*smoothstep(.66,.62,d)); c=mix(c,vec3f(.04,.035,.04),w*smoothstep(.40,.36,d)); c=mix(c,WH,w*smoothstep(.10,.06,length(q-vec2f(-.14,-.16))));
      ln=max(ln,ey.w*(smoothstep(.08,.02,abs(al-.97))+.8*smoothstep(.05,.01,abs(d-.64)))); } }
  c*=.92+.16*vnoise(uv*vec2f(1.7778,1.)*60.);
  c=mix(c,LINE,clamp(max(ln*.8,edge),0.,1.));
  return vec4f(c,1.);
}
fn above(uv:vec2f)->vec3f{
  let t=u.par.x; var c=vec3f(0.);
  if(u.par2.w>.5){ c=landscape(uv,u.par3.z,t,u.misc.x,u.par4.xy,t-u.par3.w);
    // sheets of water and colour falling from it
    let bq=(uv-u.bird.xy)*vec2f(1.7778,1.); let sp=u.bird.z; let fall=u.bird.w*smoothstep(sp*1.1,sp*.2,abs(bq.x))*smoothstep(0.,sp*.25,bq.y)*smoothstep(sp*2.6,sp*.3,bq.y)*step(uv.y,max(u.par4.y,u.par3.z)+.02);
    if(fall>.001){ let st=vnoise(vec2f(bq.x/sp*38.,bq.y/sp*2.6-t*3.5)); let hue=vnoise(vec2f(bq.x/sp*5.+3.,1.));
      let wc=mix(vec3f(.92,.93,.88),mix(vec3f(.74,.20,.11),mix(vec3f(.10,.52,.38),vec3f(.06,.25,.58),step(.6,hue)),step(.35,hue)),.5*step(.5,vnoise(vec2f(bq.x/sp*9.,7.))));
      c=mix(c,wc,fall*smoothstep(.40,.62,st)*.9); c=mix(c,vec3f(.18,.22,.25),fall*smoothstep(.04,.0,abs(st-.40))*.5); }
    let bd=body(uv); let pl=plaster(uv); c=mix(c,bd.rgb*pl.rgb,bd.a); c=mix(c,vec3f(.80,.72,.56),pl.a*.25); return invFilm(c); }
  let c0=u.par5.xy; let fr=u.par2.y; var ink=vec3f(.5);
  if(fr<3.1){ ink=inkRiver(uv,t,u.par2.x,c0); }
  if(fr>0.){ c=dabs(uv,u.par2.z,t,ink,fr,c0); } else { c=ink; }
  return invFilm(c);
}
fn under(uv:vec2f)->vec3f{
  let px=1./vec2f(textureDimensions(vol)); var c=.4*textureSampleLevel(vol,samp,uv,0.).rgb+.15*(textureSampleLevel(vol,samp,uv+px*vec2f(.9,.4),0.).rgb+textureSampleLevel(vol,samp,uv+px*vec2f(-.9,-.4),0.).rgb+textureSampleLevel(vol,samp,uv+px*vec2f(-.4,.9),0.).rgb+textureSampleLevel(vol,samp,uv+px*vec2f(.4,-.9),0.).rgb);
  let m=u.par3.y;
  if(m>0.){ let pl=plaster(uv); let lum=dot(c,vec3f(.3,.5,.2)); let lv=6.; let q=lum*lv; let f=fract(q+.5); let o=1.5/u.par.yz; let gq=lv*(abs(dot(textureSampleLevel(vol,samp,uv+vec2f(o.x,0.),0.).rgb,vec3f(.3,.5,.2))-lum)+abs(dot(textureSampleLevel(vol,samp,uv+vec2f(0.,o.y),0.).rgb,vec3f(.3,.5,.2))-lum)); let e=min(f,1.-f)/max(gq,1e-4);
    var cm=c*((floor(q+.5)+.25)/lv)/max(lum,1e-3); cm=mix(vec3f(dot(cm,vec3f(.333))),cm,1.15)*((.22+.78*lum)/max(lum,1e-3));
    cm=mix(c*((.22+.78*lum)/max(lum,1e-3)),cm,.55); cm=mix(cm,cm*.45+LINE*.3,smoothstep(1.6,.2,e)*.30)*pl.rgb; cm=mix(cm,vec3f(.70,.66,.56)*lum*2.2,pl.a*.6);
    let bd=body(uv); cm=mix(cm,bd.rgb*pl.rgb*1.15,bd.a);
    c=mix(c,cm,m); }
  return c*u.par3.x;
}
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let res=u.par.yz; let uv=fc.xy/res; let w=u.par.w;                                                 // w: 0 above water … 1 fully under
  var col=vec3f(0.);
  let wl=mix(1.08,-.14,w)+.012*sin(uv.x*5.+u.par.x*1.7)*sin(u.par.x*.9)+.006*sin(uv.x*17.-u.par.x*2.3);   // the waterline on the lens
  let un=smoothstep(-.004,.004,uv.y-wl);
  if(un<1.){ col=above(uv)*(1.-.5*smoothstep(.06,.0,wl-uv.y)*step(.001,w)); }
  if(un>0.){ let duv=vec2f(uv.x,uv.y+.02*exp(-(uv.y-wl)*30.)*step(w,.999)); var c=under(duv);
    c+=vec3f(.9,1.,1.)*.9*exp(-(uv.y-wl)*70.)*step(.001,w)*(1.-w)*4.*w; col=mix(col,c,un); }
  return vec4f(col,1.);
}`;
// which part of the creature covers each pixel: opaque discs, nearest wins. r: part, g,b: position on that part, a: covered
export const GBUF = `
struct P { p:vec4f, v:vec4f, c:vec4f, g:vec4f }
struct R { vp:mat4x4f, cam:vec4f, right:vec4f, up:vec4f, par:vec4f }
@group(0)@binding(0) var<storage,read> ps:array<P>;
@group(0)@binding(1) var<uniform> r:R;
struct VO { @builtin(position) pos:vec4f, @location(0) e:vec2f, @location(1) g:vec3f }
@vertex fn vs(@builtin(vertex_index) vi:u32, @builtin(instance_index) ii:u32)->VO{
  var o:VO; let P0=ps[ii]; var qa=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.)); let e=qa[vi];
  let wk=P0.g.w; let rad=r.par.x*smoothstep(.15,1.,wk)*select(select(1.,.75,P0.g.x>.5),.38,P0.g.x>3.5);
  let pos=P0.p.xyz; o.pos=r.vp*vec4f(pos+(r.right.xyz*e.x+r.up.xyz*e.y)*rad,1.); o.e=e; o.g=P0.g.xyz;
  let wrong=select((pos.y>0.),(pos.y<0.),(r.cam.y>0.));
  if(wk<.16||wrong||P0.c.a<=0.){ o.pos=vec4f(2.,2.,2.,1.); }
  return o; }
@fragment fn fs(i:VO)->@location(0) vec4f{ if(dot(i.e,i.e)>1.){ discard; } return vec4f(i.g,1.); }
`;
// ───────── the characters: flakes that turn with the flock and catch the light ─────────
export const PART_DRAW = `
struct P { p:vec4f, v:vec4f, c:vec4f, g:vec4f }
struct R { vp:mat4x4f, cam:vec4f, fwd:vec4f, par:vec4f, par2:vec4f }
@group(0)@binding(0) var<storage,read> ps:array<P>;
@group(0)@binding(1) var<uniform> r:R;
@group(0)@binding(2) var atlas:texture_2d<f32>;
@group(0)@binding(3) var asamp:sampler;
@group(0)@binding(4) var vol0:texture_2d<f32>;
@group(0)@binding(5) var samp:sampler;
fn h1(n:f32)->f32{ return fract(sin(n*12.9898)*43758.5453); }
struct VO { @builtin(position) pos:vec4f, @location(0) uv:vec2f, @location(1) col:vec3f, @location(2) cell:vec2f, @location(3) lod:f32, @location(4) occ:f32 }
@vertex fn vs(@builtin(vertex_index) vi:u32, @builtin(instance_index) ii:u32)->VO{
  var o:VO; let P0=ps[ii]; let sd=P0.p.w;
  var qa=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.)); let q=qa[vi];
  let pos=P0.p.xyz; let toC=r.cam.xyz-pos; let dist=length(toC); let V=toC/dist;
  let sp=length(P0.v.xyz); var vd=normalize(vec3f(h1(sd+1.)-.5,h1(sd+2.)-.5,h1(sd+3.)-.5)); if(sp>.02){ vd=normalize(mix(vd,P0.v.xyz/sp,smoothstep(.02,.15,sp))); }
  let upi=normalize(vec3f(h1(sd+4.)-.5,1.2,h1(sd+5.)-.5)*vec3f(.9,1.,.9)+vec3f(sin(r.par2.z*.4+sd*40.),0.,cos(r.par2.z*.37+sd*31.))*.35);
  var Nf=cross(vd,upi); Nf=Nf/(length(Nf)+1e-5); let fc=dot(Nf,V); if(fc<0.){ Nf=-Nf; }
  let Nn=normalize(Nf+.5*V); let X=normalize(cross(upi,Nn)); let Y=cross(Nn,X);
  let depth=dot(pos-r.cam.xyz,r.fwd.xyz);
  let base=r.par.x*(.5+1.1*h1(sd+6.)*h1(sd+7.));
  let coc=r.par.w*abs(1./r.par.z-1./max(depth,.05))*max(depth,.05);
  let pix=2.*r.fwd.w*max(depth,.05)/r.par2.y;
  let size=max(base+coc,pix*.9);
  let wp=pos+(X*q.x+Y*q.y)*size;
  o.pos=r.vp*vec4f(wp,1.);
  let ctr=r.vp*vec4f(pos,1.); let suv=ctr.xy/ctr.w*vec2f(.5,-.5)+.5;
  var occ=mix(1.,textureSampleLevel(vol0,samp,suv,0.).a,.45);
  var side=1.; if(r.cam.y>0.){ side=mix(.22,1.,smoothstep(-.05,.05,pos.y)); occ=1.; } else { side=smoothstep(.0,-.12,pos.y); }
  let area=(base*base)/(size*size);
  let flash=.20+1.25*pow(abs(fc),1.7);
  let fog=exp(-dist*.30)*smoothstep(.10,.30,depth);
  o.col=P0.c.rgb*P0.c.a*r.par.y*mix(area,sqrt(area),.35)*occ*flash*fog*side; o.occ=.85*r.par2.w*min(P0.c.a,1.)*side*area*smoothstep(.10,.30,depth);
  let id=floor(h1(sd+8.)*961.99); o.cell=vec2f(id%32.,floor(id/32.)); o.uv=q*.5+.5;
  o.lod=clamp(log2(128.*pix/(size*2.))+log2(size/base)*.75,0.,5.);
  if(depth<.08||P0.c.a<=0.){ o.pos=vec4f(2.,2.,2.,1.); }
  return o; }
@fragment fn fs(i:VO)->@location(0) vec4f{ let uv=(i.cell+.03+.94*vec2f(i.uv.x,1.-i.uv.y))/32.;
  let a=textureSampleLevel(atlas,asamp,uv,i.lod).r; let e=i.uv*2.-1.; let soft=smoothstep(1.,.75,max(abs(e.x),abs(e.y)));
  return vec4f(i.col*a*soft,a*soft*i.occ); }
`;
// The glyphs are one elastic body. First a murmuration: a long cloud whose every point is displaced by slow waves (crowding that runs
// its length, folds, a twist, a parting). Then the same glyphs take their places on 鲲, a fish too large for the frame (scaled flank,
// eye, lunate tail, fins), and its fins lengthen into the wings of 鹏. Each glyph is sprung to its own point, so the whole lags and closes up.
export const PART_SIM = NOISE + PIG + `
struct P { p:vec4f, v:vec4f, c:vec4f, g:vec4f }
struct PU { dt:f32, t:f32, k:f32, alpha:f32, scale:f32, wave:f32, split:f32, fold:f32,
  ctr:vec4f, ax:vec4f, ay:vec4f, az:vec4f, camP:vec4f, camF:vec4f, camR:vec4f, camU:vec4f, bmin:vec4f, bmax:vec4f, par:vec4f,
  kC:vec4f, kX:vec4f, kY:vec4f, kZ:vec4f, kP:vec4f }
@group(0)@binding(0) var<storage,read_write> ps:array<P>;
@group(0)@binding(1) var<uniform> u:PU;
@group(0)@binding(2) var samp:sampler;
@group(0)@binding(3) var vel:texture_3d<f32>;
@group(0)@binding(4) var dye:texture_3d<f32>;
fn hh(n:f32)->f32{ return fract(sin(n*12.9898)*43758.5453); }
fn fishR(s:f32)->f32{ if(s<.60){ return mix(.11,.92,smoothstep(0.,.60,s)); } return .92*sqrt(max(1.-pow((s-.60)/.40,2.4),0.)); }
fn birdR(s:f32)->f32{ return max(.80*exp(-pow((s-.48)/.25,2.)),.25*smoothstep(.58,.72,s)*smoothstep(.99,.93,s))+.19*exp(-pow((s-.915)/.05,2.)); }
fn RR(s:f32,m:f32)->f32{ return mix(fishR(s),birdR(s),m); }
fn neck(s:f32)->f32{ return .62*smoothstep(.62,.93,s); }
fn bone(f:f32)->vec2f{ if(f<.33){ return mix(vec2f(0.,0.),vec2f(.55,.40),f/.33); } if(f<.66){ return mix(vec2f(.55,.40),vec2f(1.20,.34),(f-.33)/.33); } return mix(vec2f(1.20,.34),vec2f(2.05,.06),(f-.66)/.34); }
fn wingP(a:vec4f, b:vec4f, beat:f32, amp:f32)->vec3f{            // x: out along the span, y: toward the leading edge, z: lift
  let s=a.x; var p=vec3f(0.);
  if(s<.80){ let f=floor(a.y*24.)/23.; let an=mix(-1.50,-.16,pow(f,1.25)); let ln=mix(.62,1.30,sin(1.5708*min(f*1.15,1.)))*(.92+.08*hh(f*91.));
    let tip=smoothstep(.62,1.,f); let uu=pow(a.z,.8)*(1.+.50*tip); let bp=bone(f); let d=vec2f(cos(an),sin(an)); let wd=(b.x-.5)*.085*(1.-.6*tip)*sin(3.1416*min(a.z*1.04,1.));
    let q=bp+d*uu*ln+vec2f(-d.y,d.x)*wd; p=vec3f(q.x,q.y,.05*uu*uu); }
  else if(s<.95){ let bp=bone(a.y); p=vec3f(bp.x+(b.x-.5)*.06,bp.y-a.z*.34*(1.-.55*a.y),(b.y-.5)*.06); }
  else { let bp=bone(a.y); p=vec3f(bp.x,bp.y+(b.x-.5)*.05,(b.y-.5)*.05); }
  let lift=amp*sin(beat-.50*p.x)*(.2+.8*smoothstep(0.,2.,p.x))+.12*amp; return vec3f(p.x*cos(lift)+.10,p.y,p.z+p.x*sin(lift));
}
fn kun(a:vec4f, b:vec4f, c:vec4f, m:f32, t:f32, und:f32, beat:f32, bend:f32, amp:f32, at:ptr<function,vec3f>)->vec4f{
  let L=mix(3.,2.3,m); let zr=mix(.62,.86,m); var p=vec3f(0.); var gold=0.; let s0=a.x; let sg=select(-1.,1.,c.x>.5);
  let wn=mix(.08,.46,m); let e0=.016*m; let e1=e0+wn; let e2=e1+.11; let e3=e2+.05*(1.-m);
  if(s0<e0){ let uu=a.y; let rad=.135*(1.-uu)*(.8+.2*b.x); let ph=a.z*6.2832; p=vec3f((.975*2.-1.)*L+uu*.52,m*neck(.96)+.03-.34*uu*uu+rad*cos(ph),rad*sin(ph)*.8); gold=1.; *at=vec3f(5.,uu,a.z); }
  else if(s0<e1){ let q=wingP(vec4f(c.z,a.y,a.z,a.w),b,beat,amp); let ws=mix(.45,2.6,m); let sw=mix(1.05,0.,m); let cs=cos(sw); let sn=sin(sw); let sa=mix(.70,.56,m);
    p=vec3f((sa*2.-1.)*L+(q.y*cs-q.x*sn)*ws,mix(-.30,.30,m)+q.z*ws-(1.-m)*.45*q.x*ws,sg*(zr*RR(sa,m)*.85+(q.x*cs+q.y*sn*.3)*ws)); gold=.25*step(.8,c.z); *at=vec3f(3.,a.y,a.z); }
  else if(s0<e2){ var th=(a.y*2.-1.)*1.15; if(c.y<.6){ th=((floor(a.y*28.)+.5)/28.*2.-1.)*1.15; } let uu=pow(a.z,.6); let Lr=mix(1.0,2.2,pow(abs(th)/1.15,1.3))*(1.+.5*m);
    let v=uu*Lr*sin(th); let mr=m*1.5708; p=vec3f(-L+.15-uu*Lr*cos(th),v*cos(mr),v*sin(mr)+(b.x-.5)*.04); *at=vec3f(1.,a.y,uu); }
  else if(s0<e3){ let s=.38+.34*a.y; let h=.8*pow(sin(3.1416*a.y),.7)*(1.-m); p=vec3f((s*2.-1.)*L-a.z*h*.55,RR(s,m)+a.z*h,(b.x-.5)*.05); *at=vec3f(2.,a.y,a.z); }
  else { var s=a.y; let rows=44.; let i=floor(s*rows); let fc=fract(a.z*20.+.5*(i%2.));
    if(c.y<.62&&s<.80){ s=(i+.08+.85*(1.-4.*(fc-.5)*(fc-.5)))/rows; }
    let ph=a.z*6.2832; let r=RR(s,m)*(.985+.03*b.x); p=vec3f((s*2.-1.)*L,r*cos(ph)+m*neck(s),zr*r*sin(ph)); *at=vec3f(0.,s,a.z); }
  let sN=clamp((p.x+L)/(2.*L),0.,1.); p.z+=und*(.03+.34*(1.-sN)*(1.-sN))*sin(2.0*p.x-t*2.3)+bend*.5*p.x*p.x;
  return vec4f(p,gold);
}
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3u){
  let i=id.x; if(i>=arrayLength(&ps)){ return; }
  var P0=ps[i]; let sd=P0.p.w; var p=P0.p.xyz; var v=P0.v.xyz; let dt=u.dt; let t=u.t;
  let a=vec4f(hh(sd+11.),hh(sd+12.),hh(sd+13.),hh(sd+14.)); let b=vec4f(hh(sd+15.),hh(sd+16.),hh(sd+17.),hh(sd+18.)); let c4=vec4f(hh(sd+31.),hh(sd+32.),hh(sd+33.),hh(sd+34.));
  let th=a.y*6.2832; let cz=2.*a.z-1.; let sz=sqrt(1.-cz*cz); let q0=vec3f(sz*cos(th),cz,sz*sin(th))*pow(a.w,.38);
  var x=q0.x*2.0*u.par.w; var y=q0.y*.95; var z=q0.z*1.0;
  let p1=2.3*x-t*1.55+.8*y; let p2=3.9*x+1.6*z+t*1.05; let p3=1.2*x-t*.5;                       // waves of crowding that run the length of the body
  let A=u.wave; x+=A*(.24*sin(p1)+.10*sin(p2)+.30*sin(p3));
  let dens=1./max(.25,1.+A*(.24*2.3*cos(p1)+.10*3.9*cos(p2)+.30*1.2*cos(p3)));
  y*=mix(1.,.55+.6*dens,.6); z*=mix(1.,.6+.5*dens,.6);
  y+=u.fold*(.55*sin(1.25*x+t*.45)+.2*sin(2.9*x-t*.8+z*2.)); z+=u.fold*.45*sin(1.7*x-t*.37+1.3);
  let tw=u.par.z*x; let cy=cos(tw); let sy=sin(tw); let y2=y*cy-z*sy; z=y*sy+z*cy; y=y2;
  let side=smoothstep(-.25,.25,q0.y+.35*sin(x*1.1+t*.2)); y+=u.split*(side-.5)*1.5*smoothstep(-2.4,.4,x); z+=u.split*(side-.5)*.7;
  y+=u.par.y*.22*x*x;
  var tg=u.ctr.xyz+u.scale*(u.ax.xyz*x+u.ay.xyz*y+u.az.xyz*z);
  let wK=u.kX.w; let m=u.kY.w; let air=u.kZ.w; let lag=c4.w*.5; let wk=smoothstep(lag,lag+.5,wK);
  var at=vec3f(0.); let kp=kun(a,b,c4,m,t,u.kP.x,u.kP.y,u.kP.z,u.kP.w,&at);
  tg=mix(tg,u.kC.xyz+u.kC.w*(u.kX.xyz*kp.x+u.kY.xyz*kp.y+u.kZ.xyz*kp.z),wk);
  var k=mix(u.k*(.55+.9*b.x),13.+8.*b.x,wk);
  let stray=step(b.w,u.par.x)*(1.-air);
  if(stray>.5){ tg=u.camP.xyz+u.camF.xyz*(.42+.55*b.x)+u.camR.xyz*(.95*sin(t*.13+b.y*6.283))+u.camU.xyz*(.42*sin(t*.10+b.z*6.283)); k=min(u.k,1.2); }
  let uvw=(p-u.bmin.xyz)/(u.bmax.xyz-u.bmin.xyz); let e=min(min(uvw.x,1.-uvw.x),min(min(uvw.y,1.-uvw.y),min(uvw.z,1.-uvw.z)));
  let inb=smoothstep(0.,.05,e); var fvv=vec3f(0.); var d=vec4f(0.);
  if(inb>0.){ fvv=textureSampleLevel(vel,samp,uvw,0.).xyz*${WORLD}*inb; d=textureSampleLevel(dye,samp,uvw,0.)*inb; }
  let n3=vec3f(vnoise3(p*2.1+vec3f(0.,t*.25,sd)),vnoise3(p*2.1+vec3f(31.,t*.25,sd)),vnoise3(p*2.1+vec3f(sd,57.,t*.25)))-.5;
  let acc=k*(tg-p)-2.*sqrt(max(k,1e-4))*.8*v+n3*mix(.5,.12,wk);
  v+=acc*dt; p+=(v+fvv*mix(.6,.15,wk))*dt;
  let dm=d.x+d.y+d.z+d.w; let tint=(d.x*vec3f(1.,.25,.12)+d.y*vec3f(.25,.45,1.)+d.z*vec3f(.2,1.,.6)+d.w*vec3f(1.,.8,.35))/max(dm,1e-4);
  var tc=mix(mix(vec3f(1.,.78,.40)*.85,vec3f(.95,.86,.62)*.8,wk),tint*1.25,clamp(dm*14.,0.,.8));
  tc=mix(tc,vec3f(1.,.76,.36)*1.9,max(smoothstep(1.25,2.1,dens)*(1.-wk),kp.w*wk)*(1.-stray));
  tc=mix(tc,vec3f(.85,.9,.9)*.8,stray);
  let cc=mix(P0.c.rgb,tc,clamp(dt*3.,0.,1.));
  let shown=max(step(hh(sd+41.),u.kP.w*0.+u.camP.w),wk);                 // before it is 鲲 the shoal is loose: only some of the characters are out
  ps[i]=P(vec4f(p,sd),vec4f(v,0.),vec4f(cc,u.alpha*shown*(.6+.8*hh(sd+21.))),vec4f(at,wk*(1.-stray)));
}`;
