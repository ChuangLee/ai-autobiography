// Shot 4: the shadow-puppet stage. A screen of cloth lit from behind by a hanging oil lamp; the carved, dyed hide puppet pressed against it performs to
// the accents of the voice. The camera goes round the edge of the screen: behind it the rods move, and no hand holds them.
// Analytic scene: screen, frame, ledge, a stool, the rods (capsules), the lamp; the puppet is nine textured parts in the plane just behind the cloth.
// From the front, the light comes through cloth and hide (transmission through every part, multiplied); from behind, the hide is lit by the lamp.
// slots: p[0..17] parts: world (x, y) → atlas px as (m00, m01, m10, m11), (b0, b1, order, -)   p[18..23] rods: (attach xyz), (end xyz)
// p[24] lamp (xyz, power)  p[25] (exposure, fall, -, -)  p[26] (-, -, pixel angle, seed)
export function puppetWGSL(rects) { // rects: per part [x, y, w, h] in atlas px
  return `
@group(0)@binding(1) var lin:sampler; @group(0)@binding(2) var pup:texture_2d<f32>;
const NP=9; const ZP=.004; const SX=.6; const SY0=.0; const SY1=.8; const ATL=vec2f(2048.,1024.);
const TEXELS_PER_M=3125.; // 40 atlas pixels per cm of drawing, each cm projects to .0128 m
fn rect(k:i32)->vec4f{ switch(k){ ${rects.map((r, i) => `case ${i}:{ return vec4f(${r.map((v) => v.toFixed(1)).join(",")}); }`).join(" ")} default:{ return vec4f(0.); } } }
// every part's texture at a point of the puppet's plane; transmission (product) and the topmost part's colour
struct PS{ tr:vec3f, top:vec4f }
fn parts(x:vec2f,lod:f32)->PS{ var r=PS(vec3f(1.),vec4f(0.));
  for(var k=0;k<NP;k++){ let m=u.p[k*2]; let b=u.p[k*2+1]; let px=vec2f(m.x*x.x+m.y*x.y,m.z*x.x+m.w*x.y)+b.xy; let R=rect(k);
    if(px.x<R.x+1.||px.y<R.y+1.||px.x>R.x+R.z-1.||px.y>R.y+R.w-1.){ continue; }
    let c=textureSampleLevel(pup,lin,px/ATL,lod); if(c.a<.01){ continue; }
    let tc=pow(c.rgb,vec3f(2.0))*vec3f(1.,.97,.9); r.tr*=mix(vec3f(1.),tc,c.a); let opacity=c.a+r.top.a*(1.-c.a);
    let color=(c.rgb*c.a+r.top.rgb*r.top.a*(1.-c.a))/max(opacity,1e-5);
    r.top=vec4f(color,opacity); }
  return r; }
struct Seg{ a:vec3f, b:vec3f, r:f32 }
fn rodSeg(k:i32,j:i32)->Seg{ let A=u.p[18+k*2].xyz; let E=u.p[19+k*2].xyz; let d=normalize(E-A); if(j==0){ return Seg(A,E,.0018); } return Seg(E,E+d*.11,.0052); }
fn segSeg(p0:vec3f,p1:vec3f,q0:vec3f,q1:vec3f)->vec3f{ // closest distance between two segments, and the parameters
  let d1=p1-p0; let d2=q1-q0; let r=p0-q0; let a=dot(d1,d1); let e=dot(d2,d2); let f=dot(d2,r); let c=dot(d1,r); let b=dot(d1,d2); let dn=a*e-b*b;
  var s=0.; if(dn>1e-8){ s=sat((b*f-c*e)/dn); } var t=(b*s+f)/e; if(t<0.){ t=0.; s=sat(-c/a); } else if(t>1.){ t=1.; s=sat((b-c)/a); }
  return vec3f(length(p0+d1*s-q0-d2*t),s,t); }
fn rodShadow(p:vec3f)->f32{ let L=u.p[24].xyz; var s=1.; for(var k=0;k<3;k++){ for(var j=0;j<2;j++){ let g=rodSeg(k,j); let d=segSeg(p,L,g.a,g.b); let along=d.y*length(L-p);
      let pen=.0008+along*.025; s*=mix(1.,.15,smoothstep(g.r+pen,g.r-pen,d.x)); } } return s; }
// ray against a capsule (iq)
fn capI(ro:vec3f,rd:vec3f,pa:vec3f,pb:vec3f,ra:f32)->f32{ let ba=pb-pa; let oa=ro-pa; let baba=dot(ba,ba); let bard=dot(ba,rd); let baoa=dot(ba,oa); let rdoa=dot(rd,oa); let oaoa=dot(oa,oa);
  let a=baba-bard*bard; var b=baba*rdoa-baoa*bard; var c=baba*oaoa-baoa*baoa-ra*ra*baba; var h=b*b-a*c;
  if(h>=0.){ let t=(-b-sqrt(h))/a; let y=baoa+t*bard; if(y>0.&&y<baba){ return t; } let oc=select(ro-pb,oa,y<=0.); b=dot(rd,oc); c=dot(oc,oc)-ra*ra; h=b*b-c; if(h>0.){ return -b-sqrt(h); } }
  return -1.; }
fn boxI(ro:vec3f,rd:vec3f,lo:vec3f,hi:vec3f)->vec4f{ let a=(lo-ro)/rd; let b=(hi-ro)/rd; let mn=min(a,b); let mx=max(a,b); let tn=max(mn.x,max(mn.y,mn.z)); let tf=min(mx.x,min(mx.y,mx.z));
  if(tn>tf||tf<0.){ return vec4f(-1.); } var n=vec3f(0.); if(tn==mn.x){ n=vec3f(-sign(rd.x),0.,0.); } else if(tn==mn.y){ n=vec3f(0.,-sign(rd.y),0.); } else { n=vec3f(0.,0.,-sign(rd.z)); } return vec4f(tn,n); }
fn lampE(p:vec3f,n:vec3f)->f32{ let L=u.p[24].xyz-p; let d2=max(dot(L,L),.01); return u.p[24].w*max(dot(n,L*inverseSqrt(d2)),0.)/d2; }
fn cloth(x:vec2f,foot:f32)->f32{
  // The weave disappears continuously as the camera sees the cloth edge-on.
  let threads=x*vec2f(1500.,1630.);
  let visibility=exp(-.18*foot*foot*1500.*1500.);
  return .91+.039*sin(threads.x)*sin(threads.y)*visibility
    +.047*(vnoise(x*vec2f(63.,4.))-.5)+.039*(vnoise(x*vec2f(3.,90.))-.5);
}
fn screenFront(x:vec2f,pix:f32)->vec3f{ // the screen seen by the audience: lamp light through hide and cloth
  let p=vec3f(x,0.); let L=u.p[24].xyz; let d=L-p; let d2=dot(d,d); let cs=d.z*inverseSqrt(d2); var E=u.p[24].w*cs/d2;
  let lod=clamp(log2(max(pix*TEXELS_PER_M,1.)),0.,6.); let pr=parts(x+(x-L.xy)*ZP/max(L.z,.1),lod);
  var c=vec3f(1.,.82,.56)*E*pr.tr*rodShadow(p+vec3f(0.,0.,.0005))*cloth(x,pix)*.55;
  c+=vec3f(1.,.8,.55)*E*.05*exp(-length(x-vec2f(L.x,L.y))*2.); // the glow the cloth spreads
  return c; }
fn shadeBack(p:vec3f,n:vec3f,alb:vec3f,rough:f32,rd:vec3f)->vec3f{ let L=normalize(u.p[24].xyz-p); let e=lampE(p,n); let v=-rd;
  // the bright screen lights the room behind it a little
  let sc=vec3f(0.,.4,0.)-p; let es=max(dot(n,normalize(sc)),0.)/(dot(sc,sc)+.3)*.05*u.p[24].w;
  return alb*(vec3f(1.,.8,.55)*e+vec3f(1.,.85,.6)*es+.0015)+vec3f(1.,.8,.55)*ggx(n,v,L,rough)*e*.15; }
fn flame(ro:vec3f,rd:vec3f,tmax:f32)->vec3f{ let F=u.p[24].xyz; let tc=dot(F-ro,rd); if(tc<0.||tc>tmax){ return vec3f(0.); } let v=ro+rd*tc-F;
  let q=v/vec3f(.005,.013,.005); return (vec3f(1.,.85,.55)*exp(-dot(q,q))*30.+vec3f(1.,.5,.15)*exp(-length(v)*60.)*.6)*u.p[24].w*2.; }
fn radiance(ro:vec3f,rd:vec3f,pix:f32)->vec3f{ var tb=1e9; var col=vec3f(0.); var n=vec3f(0.); var id=0; var hp=vec3f(0.); var hideAlpha=0.; var gripAlong=0.;
  // screen and puppet planes
  if(abs(rd.z)>1e-5){ let t=-ro.z/rd.z; let p=ro+rd*t; if(t>0.&&abs(p.x)<SX&&p.y>SY0&&p.y<SY1){ tb=t; id=1; }
    if(ro.z>ZP){ let t2=(ZP-ro.z)/rd.z; let p2=ro+rd*t2; if(t2>0.&&t2<tb){ let lod=clamp(log2(max(pix*t2*TEXELS_PER_M/max(abs(rd.z),.12),1.)),0.,6.); let pr=parts(p2.xy,lod); if(pr.top.w>.015){ tb=t2; id=2; col=pr.top.rgb; hideAlpha=pr.top.a; } } } }
  // the frame round the screen, the board under it, the ledge behind, the floor, a stool, the walls of the booth
  var B=array<vec4f,10>(vec4f(-SX-.04,SY0-.04,-.03,0.),vec4f(SX+.04,SY0,.03,0.),vec4f(-SX-.04,SY1,-.03,0.),vec4f(SX+.04,SY1+.045,.03,0.),vec4f(-SX-.04,SY0-.04,-.03,0.),vec4f(-SX,SY1+.045,.03,0.),
    vec4f(SX,SY0-.04,-.03,0.),vec4f(SX+.04,SY1+.045,.03,0.),vec4f(-.95,-.06,.0,0.),vec4f(.95,SY0-.035,.6,0.));
  for(var k=0;k<5;k++){ let h=boxI(ro,rd,B[k*2].xyz,B[k*2+1].xyz); if(h.x>0.&&h.x<tb){ tb=h.x; n=h.yzw; id=3+select(0,1,k==4); } }
  let fb=boxI(ro,rd,vec3f(-.95,-.75,-.035),vec3f(.95,-.04,-.03)); if(fb.x>0.&&fb.x<tb){ tb=fb.x; n=fb.yzw; id=5; }
  for(var k=0;k<5;k++){ var lo=vec3f(-.34,-.36,.74); var hi=vec3f(-.06,-.33,.96); if(k>0){ let c=vec2f(select(-.32,-.08,k%2==0),select(.76,.94,k>2)); lo=vec3f(c.x-.012,-.75,c.y-.012); hi=vec3f(c.x+.012,-.36,c.y+.012); }
    let h=boxI(ro,rd,lo,hi); if(h.x>0.&&h.x<tb){ tb=h.x; n=h.yzw; id=6; } }
  if(rd.y<0.){ let t=(-.75-ro.y)/rd.y; if(t>0.&&t<tb){ tb=t; n=vec3f(0.,1.,0.); id=7; } }
  if(rd.z>0.){ let t=(1.3-ro.z)/rd.z; if(t>0.&&t<tb){ tb=t; n=vec3f(0.,0.,-1.); id=8; } } else if(rd.z<0.){ let t=(-3.-ro.z)/rd.z; if(t>0.&&t<tb){ tb=t; n=vec3f(0.,0.,1.); id=8; } }
  if(abs(rd.x)>1e-5){ let t=(sign(rd.x)*1.1-ro.x)/rd.x; if(t>0.&&t<tb){ tb=t; n=vec3f(-sign(rd.x),0.,0.); id=8; } }
  for(var k=0;k<3;k++){ for(var j=0;j<2;j++){ let g=rodSeg(k,j); let t=capI(ro,rd,g.a,g.b,g.r); if(t>0.&&t<tb){ tb=t; id=9+j; let p=ro+rd*t; let ba=g.b-g.a; let h=sat(dot(p-g.a,ba)/dot(ba,ba)); n=normalize(p-g.a-ba*h); gripAlong=h; } } }
  // the lamp: a small dish on wires
  let L=u.p[24].xyz; let lh=boxI(ro,rd,L+vec3f(-.045,-.032,-.045),L+vec3f(.045,-.012,.045)); if(lh.x>0.&&lh.x<tb){ tb=lh.x; n=lh.yzw; id=11; }
  for(var k=0;k<3;k++){ let a=f32(k)*2.094; let w0=L+vec3f(cos(a)*.04,-.015,sin(a)*.04); let t=capI(ro,rd,w0,L+vec3f(0.,.25,0.),.0007); if(t>0.&&t<tb){ tb=t; id=12; n=normalize(vec3f(cos(a),.2,sin(a))); } }
  hp=ro+rd*tb;
  if(id==1){ if(ro.z<0.){ col=screenFront(hp.xy,pix*tb/max(abs(rd.z),.12)); }
    else { let lod=clamp(log2(max(pix*tb*TEXELS_PER_M/max(abs(rd.z),.12),1.)),0.,6.); let Lp=u.p[24].xyz; let pr=parts(hp.xy+(hp.xy-Lp.xy)*ZP/max(Lp.z-ZP,.1),lod); col=vec3f(.85,.8,.7)*lampE(hp,vec3f(0.,0.,1.))*pr.tr*rodShadow(hp)*cloth(hp.xy,pix*tb/max(abs(rd.z),.12))+.002; } }
  else if(id==2){
    let hide=pow(col,vec3f(2.2))*.75;
    let L=u.p[24].xyz-hp;
    let lambert=max(normalize(L).z,0.);
    let light=u.p[24].w/max(dot(L,L),.01);
    let backing=vec3f(.85,.80,.70)*lambert*light*cloth(hp.xy,pix*tb/max(abs(rd.z),.12));
    let varnish=shadeBack(hp,vec3f(0.,0.,1.),hide,.46,rd);
    col=mix(backing,varnish+hide*backing*.19,hideAlpha);
  }
  else if(id==3||id==4){ let g=fbm(hp.xy*vec2f(4.,60.)+hp.z*9.); let alb=vec3f(.075,.028,.016)*(.7+.5*g); col=shadeBack(hp,n,alb,.35,rd);
    if(ro.z<0.){ let sc=vec3f(clamp(hp.x,-SX,SX),clamp(hp.y,SY0,SY1),0.)-hp; col+=alb*vec3f(1.,.8,.55)*u.p[24].w*.9*max(dot(n,normalize(sc)),0.)/(dot(sc,sc)*30.+.5); } }
  else if(id==5){ let g=fbm(hp.xy*vec2f(3.,30.)); let alb=vec3f(.12,.04,.025)*(.7+.5*g); var c2=alb*.01; let sc=vec3f(0.,.3,0.)-hp; c2+=alb*vec3f(1.,.8,.55)*u.p[24].w*.06*max(dot(n,normalize(sc)),0.)/(dot(sc,sc)+.2);
    let q=fract(hp.xy*vec2f(6.,8.)); c2*=.8+.3*smoothstep(.45,.5,abs(q.x-.5))*0.; col=c2; }
  else if(id==6||id==7){ let g=fbm(hp.xz*vec2f(30.,3.)); let alb=select(vec3f(.12,.07,.04),vec3f(.07,.045,.03),id==7)*(.7+.5*g); col=shadeBack(hp,n,alb,.5,rd); }
  else if(id==8){ col=shadeBack(hp,n,vec3f(.02,.012,.01),.9,rd); }
  else if(id==9){
    let stem=vec3f(.115,.067,.027)*(.82+.18*gripAlong);
    col=shadeBack(hp,n,stem,.38,rd);
  }
  else if(id==10){ let fibre=vnoise(vec2f(gripAlong*4.,dot(n,vec3f(17.,11.,5.))));
    let winding=smoothstep(.20,.30,gripAlong)*smoothstep(.90,.83,gripAlong);
    let thread=.5+.5*cos(gripAlong*95.+atan2(n.y,n.x)*2.);
    let alb=mix(vec3f(.41,.26,.11)*(.78+.3*fibre),vec3f(.19,.095,.038)*(.77+.35*thread),winding);
    col=shadeBack(hp,n,alb,.48,rd); }
  else if(id==11){ col=vec3f(.04,.025,.015)*lampE(hp+vec3f(0.,.2,0.),n)+vec3f(.6,.35,.15)*.02; }
  else if(id==12){ col=vec3f(.02); }
  return col+flame(ro,rd,tb); }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let rd=rayDir(fc.xy); let pix=u.p[26].z; let c=radiance(u.ro.xyz,rd,pix);
  return vec4f(c*u.p[25].x,u.fw.w); }
`; }
