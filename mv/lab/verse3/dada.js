// Shot 5: a Dada cut-up. Words cut from newspapers and old books (the poems of the shot before among them) are shaken down onto a table in a mess;
// ten of them move by themselves and line up into this very line, 也只是把感情组合背诵, in ten different types. Then water floods the table,
// the print bleeds and lets go of the paper, and only pale water is left (the next scene opens on a still ink river).
// instance: a (atlas cell, width px, height px, seed)  b (landing x, z, angle, layer)  c (key 0..9 or -1, face down, fall start, fall duration)  d (in the line: x, z, angle, move start)
// slots: p[0] (water arrives at the left edge, seconds per metre, push start, metres per px)  p[1] (light xyz, -)
export const DADA_COMMON = `
fn h1(x:f32)->f32{ return fract(sin(x*127.1+17.3)*43758.5453); }
fn wetTime(x:vec2f)->f32{ return u.p[0].x+(x.x+.5)*u.p[0].y+.5*(fbm(x*4.+3.)-.5)+.25*abs(x.y); }
struct Pose{ p:vec3f, ang:f32, tilt:vec2f, lift:f32, vis:f32 }
fn pose(a:vec4f,b:vec4f,c:vec4f,d:vec4f,t:f32)->Pose{ var o=Pose(vec3f(0.),0.,vec2f(0.),0.,1.); let seed=a.w; let r1=h1(seed); let r2=h1(seed+1.3); let r3=h1(seed+2.7); let r4=h1(seed+4.1);
  let s=(t-c.z)/c.w; if(s<0.){ o.vis=0.; return o; }
  let y0=.0004+b.w*.00002; var land=vec3f(b.x,y0,b.y); var ang=b.z;
  if(s<1.){ let e=1.-(1.-s)*(1.-s); let start=vec3f(-.04+(r1-.5)*.12,.40+.06*r2,-.13+(r3-.5)*.08);
    let fl=(1.-s)*vec3f(sin(s*7.+seed)*.05,0.,cos(s*6.+seed*1.7)*.04);
    o.p=mix(start,land,vec3f(e,s*s*(1.6-.6*s),e))+fl; o.ang=ang+(1.-e)*(r4-.5)*8.; o.tilt=vec2f(sin(s*11.+seed),cos(s*9.+seed*2.))*(1.-s)*1.2; o.lift=1.; return o; }
  var p=land;
  if(c.x>=0.){ let m=sat((t-d.w)/1.15); let em=m*m*(3.-2.*m); let wake=sat((t-d.w+.35)/.35)*(1.-m);
    let dir=normalize(d.xy-b.xy+vec2f(1e-4)); let perp=vec2f(-dir.y,dir.x);
    p=vec3f(mix(b.xy,d.xy,em)+perp*sin(3.14159*m)*sin(m*13.+seed)*.012,y0).xzy; p=vec3f(p.x,y0+.006*sin(3.14159*m)+.0025*step(.0,m)*step(d.w,t),p.z);
    ang=mix(b.z,d.z,em)+wake*.03*sin(t*40.+seed); o.lift=sin(3.14159*m); }
  else { let k=sat((t-u.p[0].z-r1*.6)/.7); let ek=k*k*(3.-2.*k); if(abs(b.y)<.075&&abs(b.x)<.4){ let tz=sign(b.y+1e-4)*(.085+abs(b.y)*.6+r2*.04); p.z=mix(b.y,tz,ek); ang+=ek*(r3-.5)*.4; } }
  // the water: what floats drifts a little with it
  let wt=t-wetTime(p.xz); if(wt>0.){ p.x+=.018*wt+.006*sin(wt*2.+seed); p.z+=.006*sin(wt*1.7+seed*3.); ang+=.05*wt*(r2-.5); }
  o.p=p; o.ang=ang; return o; }
fn corner(o:Pose,q:vec2f,hw:vec2f)->vec3f{ var l=vec3f(q.x*hw.x,0.,q.y*hw.y); let ca=cos(o.tilt.x); let sa=sin(o.tilt.x); l=vec3f(l.x,l.y*ca-l.z*sa,l.y*sa+l.z*ca);
  let cb=cos(o.tilt.y); let sb=sin(o.tilt.y); l=vec3f(l.x*cb-l.y*sb,l.x*sb+l.y*cb,l.z); let r=rot(o.ang)*l.xz; return o.p+vec3f(r.x,l.y,r.y); }
`;
export const SCRAPS = `
@group(0)@binding(1) var lin:sampler; @group(0)@binding(2) var atl:texture_2d<f32>;
struct VO{ @builtin(position) pos:vec4f, @location(0) uv:vec2f, @location(1) w:vec3f, @location(2) n:vec3f, @location(3) f:vec4f }
@vertex fn vs(@builtin(vertex_index) vi:u32,@location(0) a:vec4f,@location(1) b:vec4f,@location(2) c:vec4f,@location(3) d:vec4f)->VO{ var o:VO; let t=u.ro.w;
  let q=vec2f(f32(vi&1u),f32((vi>>1u)&1u))*2.-1.; let ps=pose(a,b,c,d,t); if(ps.vis<.5){ o.pos=vec4f(2.,2.,2.,1.); return o; }
  let hw=vec2f(a.y,a.z)*.5*u.p[0].w+.0016; let w=corner(ps,q,hw); o.pos=u.vp*vec4f(w,1.); o.w=w;
  let e1=corner(ps,vec2f(1.,0.),hw)-corner(ps,vec2f(-1.,0.),hw); let e2=corner(ps,vec2f(0.,1.),hw)-corner(ps,vec2f(0.,-1.),hw); o.n=normalize(cross(e2,e1));
  let cell=a.x; let cc=vec2f(cell%8.,floor(cell/8.))+.5; var qq=q; if(c.y>.5){ qq.x=-qq.x; } o.uv=(cc*256.+qq*(vec2f(a.y,a.z)*.5+6.))/2048.;
  o.f=vec4f(c.y,a.w,ps.lift,c.x); return o; }
@fragment fn fs(i:VO)->@location(0) vec4f{ let t=u.ro.w; let s0=textureSampleLevel(atl,lin,i.uv,0.); if(s0.a<.5){ discard; }
  let wt=t-wetTime(i.w.xz); let w=sat(wt/1.1);
  var alb=lin3(s0.rgb);
  if(w>0.){ let dsp=vec2f(fbm(i.w.xz*60.+t*.3),fbm(i.w.xz*60.+7.-t*.2))-.5; let bl=textureSampleLevel(atl,lin,i.uv+dsp*w*.006,w*4.); let base=lin3(textureSampleLevel(atl,lin,i.uv,6.).rgb);
    alb=mix(alb,lin3(bl.rgb),w); alb=mix(alb,base,w*w*.7); alb*=1.-.22*sat(wt*4.)*(1.-w); alb=mix(alb,vec3f(.62,.64,.63),w*w*.6); }
  if(i.f.x>.5){ let base=lin3(textureSampleLevel(atl,lin,i.uv,6.).rgb); let bleed=lin3(textureSampleLevel(atl,lin,i.uv,1.5).rgb); alb=base*.95-(base-bleed)*.12; }
  let L=normalize(u.p[1].xyz); var n=i.n; if(n.y<0.){ n=-n; } let e=.72+.38*max(dot(n,L),0.); let grain=.96+.08*vnoise(i.w.xz*3000.);
  let a=1.-smoothstep(.45,.95,wt);
  return vec4f(alb*e*grain*1.15,a); }
`;
export const SHADOWS = `
struct VO{ @builtin(position) pos:vec4f, @location(0) q:vec2f, @location(1) k:vec2f, @location(2) hw:vec2f }
@vertex fn vs(@builtin(vertex_index) vi:u32,@location(0) a:vec4f,@location(1) b:vec4f,@location(2) c:vec4f,@location(3) d:vec4f)->VO{ var o:VO; let t=u.ro.w;
  let q=vec2f(f32(vi&1u),f32((vi>>1u)&1u))*2.-1.; var ps=pose(a,b,c,d,t); if(ps.vis<.5){ o.pos=vec4f(2.,2.,2.,1.); return o; }
  let h=ps.p.y; let L=normalize(u.p[1].xyz); let soft=.0012+h*.08; let hw=vec2f(a.y,a.z)*.5*u.p[0].w; let grow=hw+vec2f(soft*2.);
  ps.tilt=vec2f(0.); var w=corner(ps,q*grow/hw,hw); w-=vec3f(L.x,0.,L.z)/L.y*(h+.0012); w.y=min(h-.00012,.0047);
  o.pos=u.vp*vec4f(w,1.); o.q=q*grow; o.hw=hw; o.k=vec2f(soft,(1.-smoothstep(0.,.25,h))*.5*(1.-smoothstep(.6,1.6,t-wetTime(ps.p.xz)))); return o; }
@fragment fn fs(i:VO)->@location(0) vec4f{ let d=abs(i.q)-i.hw; let sd=length(max(d,vec2f(0.)))+min(max(d.x,d.y),0.); return vec4f(0.,0.,0.,i.k.y*(1.-smoothstep(-i.k.x,i.k.x,sd))); }
`;
// the table: grey-brown board on dark wood, lit softly from above-left; then the water over all of it
export const TABLE = `
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let rd=rayDir(fc.xy); let t=u.ro.w; let tp=-u.ro.y/rd.y; let p=u.ro.xyz+rd*tp; let x=p.xz;
  let g=fbm(x*vec2f(6.,90.)); var alb=vec3f(.11,.065,.035)*(.75+.5*g);
  let bd=max(abs(x.x)-.46,abs(x.y)-.29); if(bd<0.){ alb=vec3f(.42,.37,.3)*(.86+.2*fbm(x*14.))*(1.-.12*smoothstep(.3,.9,fbm(x*5.+9.))); alb*=.94+.06*vnoise(x*2400.); }
  alb*=1.-.4*smoothstep(.003,.0,abs(bd))*step(bd,.003);
  let L=normalize(u.p[1].xyz); let e=.9*(1.-.35*smoothstep(.1,.8,length(x-vec2f(-.15,-.1))));
  return vec4f(lin3(alb)*e*1.15,u.fw.w); }
`;
export const WATER = `
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let rd=rayDir(fc.xy); let t=u.ro.w; let tp=(.003-u.ro.y)/rd.y; let p=u.ro.xyz+rd*tp; let x=p.xz;
  let wt=t-wetTime(x); if(wt<0.){ return vec4f(0.); }
  // a thin sheet of water: slow ripples; a window's light in it; a bright rim where it is still arriving
  let fl=vec2f(t*.05,0.); let e=.0015;
  let h=fbm(x*34.-fl*8.)*.7+fbm(x*95.+fl*20.)*.3; let hx=fbm((x+vec2f(e,0.))*34.-fl*8.)*.7+fbm((x+vec2f(e,0.))*95.+fl*20.)*.3-h; let hz=fbm((x+vec2f(0.,e))*34.-fl*8.)*.7+fbm((x+vec2f(0.,e))*95.+fl*20.)*.3-h;
  let calm=1.-.8*smoothstep(.3,1.5,wt); let n=normalize(vec3f(-hx/e*.0012*calm,1.,-hz/e*.0012*calm)); let v=-rd; let fr=.02+.98*pow(1.-max(dot(n,v),0.),5.);
  let r=reflect(rd,n); let win=smoothstep(.992,.999,dot(r,normalize(vec3f(-.3,1.,-.45))))*.5;
  let rim=exp(-wt*110.)*smoothstep(.0,.004,wt); let edge=exp(-wt*6.)*smoothstep(.0,.01,wt);
  // the ink let go by the paper: grey clouds that spread and thin; the water turns pale
  let q=x*vec2f(6.,9.)+vec2f(-wt*.1,wt*.04); let cl=fbm(q+fbm(x*3.+t*.04)*1.3); let ink=smoothstep(.42,.8,cl)*exp(-abs(x.y+.0)*7.)*smoothstep(.2,.7,wt)*exp(-max(wt-.8,0.)*1.1);
  let pale=smoothstep(.45,1.05,wt);
  var A=mix(.14+.1*fr+.2*edge,1.,pale); var C=mix(vec3f(.2,.21,.2),vec3f(.84,.855,.845)*(.97+.06*fbm(x*5.)),pale);
  C=mix(C,vec3f(.34,.35,.35),ink*.8); A=max(A,ink*.75);
  C+=(vec3f(1.,1.,.97)*win*(1.-pale*.8)+vec3f(1.)*rim*.9)/max(A,.15); A=max(A,rim*.5);
  return vec4f(C,min(A,1.)*u.fw.w); }
`;
