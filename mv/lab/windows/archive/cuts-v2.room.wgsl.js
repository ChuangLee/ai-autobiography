// One room behind one window, as a signed distance field: walls with the window cut out, desk, screen, lamp, shelf, a person.
// Room space: x across the bay, y above the floor, z inward from the façade (the glass is at z = -0.06). It is the world shifted by r.org,
// so a ray leaving through the window goes on into the city (cityColor), and the glass reflects the room.
export const ROOM = /* wgsl */`
struct R { org:vec3f, flip:f32,
  fig:vec3f, figAmt:f32,     // the gold figure's light (room space) and its strength
  a:vec4f,                   // pose (0 seated, 1 standing at the window), hair, body scale, text tile
  b:vec4f,                   // screen on, lamp on, typed (hero: characters; others: 0..1), hero
  c:vec4f,                   // person x, person z, lean, seed
  d:vec4f }                  // near, far, glass reflection, exposure
@group(0)@binding(3) var<uniform> r:R;

fn sdBox(p:vec3f,b:vec3f)->f32{ let q=abs(p)-b; return length(max(q,vec3f(0.)))+min(max(q.x,max(q.y,q.z)),0.); }
fn sdCap(p:vec3f,a:vec3f,b:vec3f,rad:f32)->f32{ let pa=p-a; let ba=b-a; return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.))-rad; }
const SX=.42; const LAMP=vec3f(-.98,1.2,2.62);

fn person(p0:vec3f)->f32{ let sc=r.a.z; var q=(p0-vec3f(r.c.x,0.,r.c.y))/sc; var d:f32; let k=.045;
  if(r.a.x<.5){ q.z-=r.c.z*max(q.y-.6,0.);                     // seated, facing the screen (+z)
    d=length(q-vec3f(0.,1.235,.03))-.105;
    d=smin(d,sdCap(q,vec3f(0.,1.0,0.),vec3f(0.,1.12,.015),.046),.03);
    d=smin(d,sdCap(q*vec3f(1.,1.,1.3),vec3f(0.,.6,0.),vec3f(0.,.98,0.),.165),k);
    d=smin(d,sdCap(q,vec3f(-.17,1.0,0.),vec3f(.17,1.0,0.),.075),k);
    let qa=vec3f(abs(q.x),q.y,q.z);
    d=smin(d,sdCap(qa,vec3f(.215,.98,0.),vec3f(.25,.74,.2),.05),k); d=smin(d,sdCap(qa,vec3f(.25,.74,.2),vec3f(.13,.8,.6),.04),.03);
    d=smin(d,sdCap(qa,vec3f(.1,.5,0.),vec3f(.1,.5,.42),.078),k); d=smin(d,sdCap(qa,vec3f(.1,.5,.42),vec3f(.1,.06,.46),.055),.03); }
  else { q.z=-q.z;                                             // standing, looking out (-z)
    d=length(q-vec3f(0.,1.6,.02))-.105;
    d=smin(d,sdCap(q,vec3f(0.,1.42,0.),vec3f(0.,1.5,.01),.046),.03);
    d=smin(d,sdCap(q*vec3f(1.,1.,1.3),vec3f(0.,1.02,0.),vec3f(0.,1.38,0.),.16),k);
    d=smin(d,sdCap(q,vec3f(-.18,1.41,0.),vec3f(.18,1.41,0.),.075),k);
    let qa=vec3f(abs(q.x),q.y,q.z);
    d=smin(d,sdCap(qa,vec3f(.225,1.39,0.),vec3f(.255,1.1,0.),.05),k); d=smin(d,sdCap(qa,vec3f(.255,1.1,0.),vec3f(.24,.84,.04),.042),.03);
    d=smin(d,sdCap(qa,vec3f(.09,.98,0.),vec3f(.1,.06,0.),.082),k); }
  let hy=select(1.235,1.6,r.a.x>.5);
  if(r.a.y>1.5){ d=smin(d,length(q-vec3f(0.,hy+.125,-.05))-.058,.02); }                                                   // hair in a knot
  else if(r.a.y>.5){ d=smin(d,sdCap(q,vec3f(0.,hy+.01,-.045),vec3f(0.,hy-.3,-.09),.095),.04); }                           // long hair
  return d*sc; }

fn map(p0:vec3f)->vec2f{ var p=p0; p.x*=r.flip;
  let bi=sdBox(p-vec3f(0.,1.65,2.1),vec3f(1.52,1.61,2.1));
  var d=max(-bi,-(p.z+.22)); d=max(d,-sdBox(p-vec3f(0.,1.76,-.1),vec3f(1.02,.88,.3))); var m=1.;
  var e=min(sdBox(p-vec3f(0.,1.76,-.07),vec3f(.02,.88,.028)), max(sdBox(p-vec3f(0.,1.76,-.07),vec3f(1.04,.9,.03)),-sdBox(p-vec3f(0.,1.76,-.07),vec3f(.98,.84,.1))));
  e=min(e,sdBox(p-vec3f(0.,.86,-.2),vec3f(1.12,.03,.1))); if(e<d){ d=e; m=2.; }
  if(r.a.x<.5){
    e=sdBox(p-vec3f(.17,.725,2.62),vec3f(1.25,.035,.42)); e=min(e,sdBox(vec3f(abs(p.x-.17),p.y,p.z)-vec3f(1.18,.35,2.62),vec3f(.03,.35,.38))); if(e<d){ d=e; m=3.; }
    e=sdBox(p-vec3f(SX,1.3,2.9),vec3f(.74,.4,.014)); e=min(e,sdCap(p,vec3f(SX,.76,2.93),vec3f(SX,.95,2.93),.028)); if(e<d){ d=e; m=4.; }
    e=sdBox(p-vec3f(r.c.x,.44,r.c.y-.02),vec3f(.23,.03,.23))-.01; e=min(e,sdBox(p-vec3f(r.c.x,.74,r.c.y-.26),vec3f(.2,.3,.022))-.012); e=min(e,sdCap(p,vec3f(r.c.x,.42,r.c.y),vec3f(r.c.x,.04,r.c.y),.03)); if(e<d){ d=e; m=8.; } }
  if(r.b.y>-.5){ e=length(p-LAMP)-.1; e=min(e,sdCap(p,LAMP-vec3f(0.,.1,0.),vec3f(LAMP.x,.77,LAMP.z),.012)); if(e<d){ d=e; m=5.; } }
  e=sdBox(p-vec3f(-.92,2.12,4.13),vec3f(.56,.6,.08)); if(e<d){ d=e; m=6.; }
  e=person(p); if(e<d){ d=e; m=7.; }
  return vec2f(d,m); }
fn nrm(p:vec3f)->vec3f{ var n=vec3f(0.); for(var i=0;i<4;i++){ let e=.5773*(2.*vec3f(f32(((i+3)>>1)&1),f32((i>>1)&1),f32(i&1))-1.); n+=e*map(p+e*.0015).x; } return normalize(n); }
fn shadow(p:vec3f, l:vec3f)->f32{ let dv=l-p; let dl=length(dv); let rd=dv/dl; var t=.03; var s=1.;
  for(var i=0;i<22;i++){ let h=map(p+rd*t).x; s=min(s,9.*h/t); t+=clamp(h,.02,.25); if(h<.002 || t>dl-.12){ break; } } return clamp(s,0.,1.); }

fn shade(p:vec3f, n:vec3f, m:f32, rd:vec3f, full:bool)->vec3f{ var q=p; q.x*=r.flip; var nn=n; nn.x*=r.flip;
  var alb=.5; var em=vec3f(0.);
  let wash=.75+.5*fbm(q.xy*1.7+q.z*1.3+r.c.w*9.);
  if(m<1.5){ alb=.42*wash; if(nn.y>.7){ alb=.2+.1*step(.5,fract(q.x*2.3+.2*vnoise(q.xz*3.)))+.05*vnoise(q.xz*vec2f(30.,2.)); }
    if(q.z<-.18 || (q.z<.02 && nn.z<-.5)){ alb=.11*wash; } }
  else if(m<2.5){ alb=.1; } else if(m<3.5){ alb=.16+.05*vnoise(q.xz*vec2f(40.,3.)); }
  else if(m<4.5){ alb=.04;
    if(nn.z<-.5 && abs(q.x-SX)<.74 && abs(q.y-1.3)<.4){ let c=(q.xy-vec2f(SX,1.3))/vec2f(.74,.4); let uvs=vec2f(c.x*.5+.5,.5-c.y*.5);
      let tile=r.a.w; let tuv=(vec2f(tile%2.,floor(tile/2.))+uvs)/vec2f(2.,5.); var a=textureSampleLevel(txt,smp,tuv,0.).a; let line=step(.5,uvs.y);
      if(r.b.w>.5){ let cp=(uvs.x*1024.-64.)/128.; let nch=select(min(r.b.z,6.),max(r.b.z-6.,0.),line>.5); a*=step(cp,nch);
        let cx=64.+128.*select(r.b.z,r.b.z-6.,r.b.z>6.); let cl=select(0.,1.,r.b.z>6.); let cy=uvs.y*512.-(150.+cl*190.); a=max(a,u.misc2.y*step(abs(uvs.x*1024.-cx-10.),5.)*step(abs(cy),62.)); }
      else { a*=step(uvs.x,clamp(r.b.z*2.-line,0.,1.)*1.02); }
      em=PAPER*.95*(1.-.22*dot(c,c))*(1.-.95*a)*r.b.x; alb=.02; } }
  else if(m<5.5){ alb=.3; if(length(q-LAMP)<.12){ em=PAPER*1.15*max(r.b.y,0.); } }
  else if(m<6.5){ let row=fract((q.y-1.52)/.4); let bk=hash11(floor(q.x*27.)+floor((q.y-1.52)/.4)*31.+r.c.w*91.); alb=mix(.07,.5,bk)*step(.16,row)+.05*step(row,.16); if(nn.z>-.5){ alb=.08; } }
  else if(m<7.5){ alb=.075; if(q.y>select(1.13,1.49,r.a.x>.5)*r.a.z){ alb=select(.17,.05,r.a.y>.5); } }
  else { alb=.05; }
  var col=vec3f(0.);
  // the screen lights what is in front of it; the lamp; the figure; a little night through the window
  let ls=vec3f(SX*r.flip,1.3,2.74); var dv=ls-p; var d2=dot(dv,dv); var l=dv/sqrt(d2);
  col+=PAPER*r.b.x*.75*max(dot(n,l),0.)*smoothstep(-.05,.5,dv.z)/(d2+.25);
  let ll=vec3f(LAMP.x*r.flip,LAMP.y,LAMP.z); dv=ll-p; d2=dot(dv,dv); l=dv/sqrt(d2); col+=PAPER*max(r.b.y,0.)*.26*(.25+.75*max(dot(n,l),0.))/(d2+.2);
  if(r.figAmt>.002){ let lf=r.fig; dv=lf-p; d2=dot(dv,dv); l=dv/sqrt(d2); var sh=1.; if(full){ sh=.25+.75*shadow(p+n*.01,lf); }
    col+=GOLD*r.figAmt*1.5*(.18+.82*max(dot(n,l),0.))*sh/(d2+.35); }
  col+=SILVER*.012*(.4+.6*max(dot(n,normalize(vec3f(0.,.3,-1.))),0.))*smoothstep(4.,0.,p.z);
  col*=alb;
  col*=mix(1.,.4,pow(1.-abs(dot(n,rd)),2.2));         // the wash pools at the edges of things
  return col+em; }

struct RO{ @location(0) c:vec4f, @builtin(frag_depth) z:f32 }
@fragment fn fs_room(@builtin(position) fc:vec4f)->RO{ var o:RO;
  let ndc=(fc.xy-.5*u.res)/(.5*u.res.y); let rd0=normalize(u.fw+(u.rt*ndc.x-u.up*ndc.y)*u.tanh); let ro0=u.ro-r.org;
  let inside=ro0.z>-.2;
  let tg=(-.06-ro0.z)/rd0.z; let pg=ro0+rd0*tg; let inHole=tg>0. && abs(pg.x)<1.02 && abs(pg.y-1.76)<.88;
  var col=vec3f(0.); var depth=1.; var ro=ro0; var rd=rd0; var wgt=1.; var out=false;
  // bounce 0: the view. bounce 1 (only for rays that left through the glass): the room mirrored in the window
  for(var bounce=0;bounce<2;bounce++){ var t=0.; var m=0.; let ins=inside && bounce==0;
    for(var i=0;i<90;i++){ let p=ro+rd*t; if(ins && p.z<-.34){ m=-1.; break; } let h=map(p); if(h.x<.0012+.0012*t){ m=h.y; break; } t+=h.x; if(t>16.){ break; } }
    if(m>0.){ let p=ro+rd*t; let n=nrm(p); var c=shade(p,n,m,rd,bounce==0);
      if(bounce==0){ if(!inside && inHole && t>tg){ c=c*.94+SILVER*.004*(1.+2.*pow(1.-abs(rd.z),3.)); }
        if(!inside && p.z<-.19){ let q=vec2f(abs(p.x)-1.02,abs(p.y-1.76)-.88); let dd=length(max(q,vec2f(0.)))+min(max(q.x,q.y),0.); c+=PAPER*r.b.x*.012*exp(-max(dd,0.)*2.4); }
        let zv=t*dot(rd,u.fw); let nf=r.d.xy; depth=nf.y*(zv-nf.x)/((nf.y-nf.x)*zv); }
      col+=c*wgt; break; }
    if(bounce==1){ break; }
    out=true; if(!(inHole && r.d.z>0.)){ break; }
    ro=pg+vec3f(rd0.x,rd0.y,-rd0.z)*.02; rd=vec3f(rd0.x,rd0.y,-rd0.z); wgt=r.d.z; }
  if(out){ col+=cityColor(u.ro+rd0*max(tg,0.),rd0)*.92; }
  o.c=vec4f(col*r.d.w*paper(fc.xy),1.); o.z=clamp(depth,0.,1.); return o; }
`;

// The gold "me": real glyphs from the atlas, their motion a pure function of time (no state), so any frame can be drawn on its own.
// They pour out of the screen's light, gather into a standing figure, and on release come apart, drift and go dark.
export const GLYPHS = /* wgsl */`
struct P { vp:mat4x4f, rt:vec4f, up:vec4f, org:vec4f, fig:vec4f, src:vec4f, m:vec4f, n:vec4f }
// rt.w glyph size, up.w time, org.w flip, fig.w yaw, src.w unused, m: tf (s since the stream began), tr (s since release), brightness, mirror in the glass; n: figure scale
@group(0)@binding(0) var<uniform> P_:P; @group(0)@binding(1) var gs:sampler; @group(0)@binding(2) var atlas:texture_2d<f32>;
struct VO{ @builtin(position) pos:vec4f, @location(0) uv:vec2f, @location(1) col:vec3f }
fn h1(x:f32)->f32{ return fract(sin(x*127.1+17.3)*43758.5453); }
@vertex fn vs(@builtin(vertex_index) vi:u32, @location(0) tg:vec4f, @location(1) ex:vec4f)->VO{ var o:VO;
  let seed=tg.w; let cell=ex.x; let order=ex.y; let tf=P_.m.x; let tr=P_.m.y; let t=P_.up.w;
  let r1=h1(seed); let r2=h1(seed+1.7); let r3=h1(seed+3.1); let r4=h1(seed+4.3); let r5=h1(seed+5.9); let r6=h1(seed+7.7);
  let cy=cos(P_.fig.w); let sy=sin(P_.fig.w); let tl=tg.xyz*P_.n.x;
  var tgt=vec3f(tl.x*cy+tl.z*sy,tl.y,-tl.x*sy+tl.z*cy)+P_.fig.xyz;
  let delay=.1+.75*order+.55*r1; let tau=.95+.5*r2; let a=clamp((tf-delay)/tau,0.,1.); let e=a*a*a*(a*(a*6.-15.)+10.);
  let src=P_.src.xyz+vec3f((r3-.5)*1.3,(r4-.5)*.68,-.03);
  let w=sin(3.14159*a);
  var pos=mix(src,tgt,e)+w*(vec3f(sin(seed*91.+tf*1.7),cos(seed*57.+tf*1.3),sin(seed*33.+tf*2.1))*.2+vec3f(0.,.2*(r5-.2),-.1-.16*r6));
  pos+=e*.007*vec3f(sin(t*1.7+seed*40.),sin(t*1.3+seed*23.),cos(t*1.9+seed*71.));
  var vis=smoothstep(0.,.07,a)*(.55+.45*e)+.6*w;
  // release: from the head down, each glyph lets go, drifts, turns, and goes out
  let b=max(tr-(r5*1.25+(1.-order)*.55),0.);
  let outw=normalize(tl-vec3f(0.,1.05,0.)+vec3f(r3-.5,r4-.5,r6-.5)*.8); let ow=vec3f(outw.x*cy+outw.z*sy,outw.y,-outw.x*sy+outw.z*cy);
  pos+=ow*(.11*b+.02*b*b)+vec3f(sin(seed*13.+b*1.3)*.07*b,.09*b+.015*b*b,cos(seed*29.+b*1.1)*.07*b-.05*b);
  let fade=exp(-b*.85)*(1.-smoothstep(2.4,3.6,b)); let ang=(r6-.5)*3.2*b;
  var col=mix(vec3f(1.,.72,.3),vec3f(.5,.5,.52)*.12,smoothstep(0.,1.6,b))*(.55+.9*r2);
  pos.x*=P_.org.w; if(P_.m.w>.5){ pos.z=-.12-pos.z; }
  var ia=array<u32,6>(0u,1u,2u,2u,1u,3u); let idx=ia[vi]; let cc=vec2f(f32(idx&1u),f32((idx>>1u)&1u));
  let q=(cc-.5)*2.; let ca=cos(ang); let sa=sin(ang); let qr=vec2f(q.x*ca-q.y*sa,q.x*sa+q.y*ca)*P_.rt.w*(.65+.8*r4)*(1.+.25*smoothstep(0.,2.,b));
  let wp=pos+P_.org.xyz+P_.rt.xyz*qr.x+P_.up.xyz*qr.y;
  o.pos=P_.vp*vec4f(wp,1.); o.uv=(vec2f(cell%32.,floor(cell/32.))+vec2f(cc.x,1.-cc.y)*.94+.03)/32.;
  o.col=col*vis*fade*P_.m.z*(.8+.2*sin(t*2.3+seed*50.)); return o; }
@fragment fn fs(i:VO)->@location(0) vec4f{ let a=textureSample(atlas,gs,i.uv).r; return vec4f(i.col*a,1.); }
`;
