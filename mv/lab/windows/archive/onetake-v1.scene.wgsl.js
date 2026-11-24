// 千窗 → 粼光: one fragment shader. A ray-cast ink city (grid traversal, interiors up close), a far field of light points,
// and a moonlit sea; the same points of light serve as windows and as glints, and `u.s` carries the city into the water.
export const WGSL = /* wgsl */`
struct U { res:vec2f, t:f32, tw:f32,
  ro:vec3f, s:f32,
  fw:vec3f, tanh:f32,
  rt:vec3f, hs:f32,
  up:vec3f, typed:f32,
  moon:vec3f, heroOn:f32,
  misc:vec4f,      // x neighbour window on, y traversal steps, z glint time, w lights-outside-the-moon-path
  misc2:vec4f }    // x sea steps, y caret, z exposure of interiors, w unused
@group(0)@binding(0) var<uniform> u:U; @group(0)@binding(1) var smp:sampler; @group(0)@binding(2) var txt:texture_2d<f32>;

const CELL=40.; const FLOOR=3.4; const BAY=3.2; const HMAX=178.;
const GOLD=vec3f(1.,.74,.36); const SILVER=vec3f(.82,.88,1.);
const HEROF=12.;   // hero window: cell (0,0), face -z, bay 0, floor 12

// x,y half extents; z height; w seed.  Cell c covers [c*40-20, c*40+20].
fn bldg(c:vec2f)->vec4f{ let h1=hash21(c*1.37+3.1); let h2=hash21(c+17.3); let h3=hash21(c*2.11+41.7);
  let dist=fbm(c*.06+vec2f(3.7,9.1));
  var ht=mix(16.,58.,h1*h1)+118.*smoothstep(.46,.72,dist)*h2*h2;
  if(h3<.07){ ht=0.; }
  if(abs(c.x)<.5 && c.y<-.5){ ht=0.; }                       // the avenue that ends at the hero building
  var half=vec2f(11.+5.5*h2, 11.+5.5*h3);
  if(abs(c.x)<.5 && abs(c.y)<.5){ ht=96.; half=vec2f(17.,16.); }
  if(abs(abs(c.x)-1.)<.5 && c.y<.5 && c.y>-6.5){ ht=max(ht,52.+40.*h1); half.x=15.; }   // the avenue's walls stay tall near the hero
  ht=floor(ht/FLOOR)*FLOOR+1.1; if(ht<4.){ ht=0.; }
  return vec4f(half,ht*u.hs,h1); }

struct Hit{ t:f32, n:vec3f, c:vec2f, b:vec4f, k:i32 }      // k: 0 nothing before the ground/sky, 1 building, 2 ran out of steps
fn traceCity(ro:vec3f, rd:vec3f, maxSteps:i32)->Hit{ var H:Hit; H.k=0; H.t=1e9;
  let top=HMAX*u.hs; var t0=0.;
  if(ro.y>top){ if(rd.y>=0.){ return H; } t0=(top-ro.y)/rd.y; }
  let p0=ro+rd*t0; var cell=floor((p0.xz+20.)/CELL);
  let sg=vec2f(select(-1.,1.,rd.x>0.),select(-1.,1.,rd.z>0.)); let inv=1./max(abs(rd.xz),vec2f(1e-6));
  var tm=vec2f(((cell.x+.5+.5*sg.x)*CELL-20.-ro.x)*sg.x*inv.x, ((cell.y+.5+.5*sg.y)*CELL-20.-ro.z)*sg.y*inv.y);
  let dl=CELL*inv; let tg=select(1e9,-ro.y/rd.y,rd.y<0.);
  for(var i=0;i<maxSteps;i++){ let b=bldg(cell);
    if(b.z>.3){ let ce=vec3f(cell.x*CELL,b.z*.5,cell.y*CELL); let hf=vec3f(b.x,b.z*.5,b.y);
      let m=1./select(rd,vec3f(1e-6),abs(rd)<vec3f(1e-6)); let k=abs(m)*hf; let nn=m*(ro-ce); let t1=-nn-k; let t2=-nn+k;
      let tn=max(max(t1.x,t1.y),t1.z); let tf=min(min(t2.x,t2.y),t2.z);
      if(tn<tf && tf>0. && tn>0.){ H.t=tn; H.k=1; H.c=cell; H.b=b;
        if(t1.x>t1.y && t1.x>t1.z){ H.n=vec3f(-sign(rd.x),0.,0.); } else if(t1.y>t1.z){ H.n=vec3f(0.,-sign(rd.y),0.); } else { H.n=vec3f(0.,0.,-sign(rd.z)); }
        return H; } }
    let te=min(tm.x,tm.y); if(te>tg){ return H; } if(rd.y>0. && ro.y+rd.y*te>top){ return H; }
    if(tm.x<tm.y){ tm.x+=dl.x; cell.x+=sg.x; } else { tm.y+=dl.y; cell.y+=sg.y; } }
  H.k=2; return H; }

// one window's light over time: an ask begins, lasts a while, ends. Eased on and off.
fn winState(h:vec3f, tw:f32)->f32{ if(h.x>.5){ return 0.; } let per=mix(13.,58.,h.y); let duty=mix(.22,.62,h.z); let ph=fract(tw/per+h.x*7.31+h.y); let e=1./per;
  return smoothstep(0.,e,ph)*(1.-smoothstep(duty,duty+e,ph)); }

fn sdSeg(p:vec2f,a:vec2f,b:vec2f)->f32{ let pa=p-a; let ba=b-a; return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.)); }
fn smin(a:f32,b:f32,k:f32)->f32{ let h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }

// the room behind a window, seen through it. o = entry point (x across the bay, y above the floor), dl = ray in room space (z inward)
fn interior(o2:vec2f, dl:vec3f, h:vec3f, st:f32, hero:f32)->vec3f{
  let o=vec3f(o2,0.); let d=select(dl,vec3f(1e-5),abs(dl)<vec3f(1e-5));
  let tx=(select(-1.52,1.52,d.x>0.)-o.x)/d.x; let ty=(select(.04,3.26,d.y>0.)-o.y)/d.y; let tz=4.2/d.z; let tr=min(tx,min(ty,tz)); let q=o+d*tr;
  let flip=select(1.,-1.,h.z>.5 && hero<.5);            // some rooms are mirrored
  let sx=.42*flip; let L=vec3f(-1.02*flip,1.18,2.55);
  let dL=q-L; let lam=.62/(dot(dL,dL)+.22);
  var alb=.55; if(tz<=tr+1e-4){ // back wall: a shelf of books on the lamp side, a frame on the other
    let bx=(q.x*flip+1.5)/1.1; if(bx<1. && q.y>1.5 && q.y<2.75){ let row=fract((q.y-1.5)/.42); let bk=hash11(floor((q.x)*26.)+floor((q.y-1.5)/.42)*31.+h.x*91.); alb=mix(.16,.62,bk)*step(.14,row)+.08*step(row,.14); }
    let fr=abs(vec2f(q.x-sx*1.9-.1*flip,q.y-2.45))-vec2f(.3,.22); if(max(fr.x,fr.y)<0.){ alb=mix(.2,.75,step(max(fr.x,fr.y),-.035)*(.5+.5*vnoise(q.xy*9.+h.xy*30.))); } }
  if(ty<=tr+1e-4 && d.y<0.){ alb=.3+.12*step(.5,fract(q.x*2.2)); }   // floor boards
  var col=GOLD*lam*alb;
  let scr=GOLD*vec3f(1.,1.02,1.08);
  col+=scr*.05*alb/(dot(q-vec3f(sx,1.3,2.9),q-vec3f(sx,1.3,2.9))*.5+.6);
  // lamp: shade and glow
  let v=L-o; let tt=dot(v,d); if(tt>0. && tt<tr){ let dd=length(v-d*tt); col+=GOLD*(.008/(dd*dd+.0035)+.8*smoothstep(.13,.1,dd)); }
  // the desk edge and the screen standing on it
  let td=2.3/d.z; if(td<tr){ let p=o.xy+d.xy*td; if(abs(p.x-sx*.4)<1.25 && p.y>.69 && p.y<.76){ col=GOLD*.035; } if(abs(abs(p.x-sx*.4)-1.15)<.035 && p.y<.7){ col=GOLD*.02; } }
  let ts=2.9/d.z; if(ts<tr){ let p=o.xy+d.xy*ts; let c=(p-vec2f(sx,1.3))/vec2f(.74,.4);
    if(abs(c.x)<1. && abs(c.y)<1.){ let uvs=vec2f(c.x*.5+.5,.5-c.y*.5);
      let tile=select(floor(h.y*9.99),0.,hero>.5); let tuv=(vec2f(tile%2.,floor(tile/2.))+uvs)/vec2f(2.,5.);
      var a=textureSampleLevel(txt,smp,tuv,0.).a;
      if(hero>.5){ let line=step(.5,uvs.y); let cp=(uvs.x*1024.-64.)/128.; let n=select(min(u.typed,6.),max(u.typed-6.,0.),line>.5); a*=step(cp,n);
        let cx=64.+128.*select(u.typed,u.typed-6.,u.typed>6.); let cl=select(0.,1.,u.typed>6.); let cy=uvs.y*512.-(150.+cl*190.);
        a=max(a,u.misc2.y*step(abs(uvs.x*1024.-cx-10.),5.)*step(abs(cy),62.)); }
      let vg=1.-.25*dot(c,c); col=scr*.9*vg*(1.-.95*a);
      // the one who answers: a small gold light at the foot of the page
      let pd=length((c-vec2f(.82,-.72))*vec2f(.74,.4)); let br=.75+.25*sin(u.t*2.1+h.x*20.); col+=GOLD*vec3f(1.,.8,.5)*(6.*smoothstep(.03,.012,pd)+.004/(pd*pd+.0006))*br*select(1.,smoothstep(12.2,13.,u.typed),hero>.5); }
    else if(abs(c.x)<1.04 && abs(c.y)<1.08){ col=GOLD*.012; } else if(abs(p.x-sx)<.05 && p.y<.9 && p.y>.76){ col=GOLD*.012; } }
  // the person, from behind, seated between us and the screen
  let tp=1.55/d.z; if(tp<tr){ let p=o.xy+d.xy*tp; let px=(-.36+.1*(h.x-.5)*(1.-hero))*flip; let lean=.035*flip;
    var sd=length(p-vec2f(px+lean,1.235))-.108;
    sd=smin(sd,sdSeg(p,vec2f(px+lean*.6,1.1),vec2f(px,1.0))-.055,.03);
    sd=smin(sd,sdSeg(p,vec2f(px-.17,.9),vec2f(px+.17,.9))-.115,.07);
    sd=smin(sd,sdSeg(p,vec2f(px,.86),vec2f(px,.5))-.2,.08);
    let ch=abs(p-vec2f(px,.62))-vec2f(.25,.36); sd=min(sd,max(ch.x,ch.y)-.02);
    let a=smoothstep(.012,-.012,sd); let rim=smoothstep(-.06,0.,sd)*smoothstep(-.3,.25,(p.x-px)*flip)*step(.8,p.y);
    col=mix(col,GOLD*(.012+.2*rim),a); }
  return col*st; }

struct Fac{ col:vec3f, em:f32 }
fn facade(p:vec3f, n:vec3f, c:vec2f, b:vec4f, rd:vec3f, dist:f32, detail:bool)->vec3f{
  let hs=max(u.hs,1e-3); let ht=b.z/hs; let y=p.y/hs;
  let wash=.5+.5*fbm(p.xz*.035+p.y*.02+c*3.1); let streak=vnoise(vec2f((p.x+p.z)*1.7,p.y*.09+c.x));
  if(n.y>.5){ let e=min(b.x-abs(p.x-c.x*CELL),b.y-abs(p.z-c.y*CELL)); return vec3f(.0035+.006*wash)*SILVER*(1.+.35*smoothstep(1.2,.2,e)); }
  let moonlit=max(dot(n,normalize(vec3f(u.moon.x,0.,u.moon.z))),0.);
  var wall=vec3f(.0022+.0075*wash*wash+.003*streak)*SILVER*(1.+1.3*moonlit)*(.7+.5*smoothstep(ht,0.,y));
  let tu=vec3f(-n.z,0.,n.x); let uu=dot(p-vec3f(c.x*CELL,0.,c.y*CELL),tu); let half=select(b.y,b.x,abs(n.z)>.5);
  let bi=floor(uu/BAY+.5); let fu=uu-bi*BAY; let fi=floor(y/FLOOR); let fv=y-fi*FLOOR;
  let valid=abs(bi*BAY)+BAY*.5<half && fi>=1. && (fi+1.)*FLOOR<ht-.4;
  let face=select(select(3.,4.,n.z<0.),select(1.,2.,n.x<0.),abs(n.x)>.5);
  let h=hash33(vec3f(c.x*7.13+face*3.71+bi*1.31,c.y*5.77+fi*17.7,face+bi*.37+fi*.11));
  let isHero=abs(c.x)<.5 && abs(c.y)<.5 && face>3.5 && abs(bi)<.5 && abs(fi-HEROF)<.5;
  let isNb=abs(c.x)<.5 && abs(c.y)<.5 && face>3.5 && abs(bi-2.)<.5 && abs(fi-HEROF+1.)<.5;
  var st=winState(h,u.tw); if(isHero){ st=u.heroOn; } if(isNb){ st=u.misc.x; }
  if(abs(c.x)<.5 && abs(c.y)<.5 && face>3.5 && !isHero && !isNb){ let db=bi; let df=fi-HEROF;
    if((abs(db+1.)<.5 && abs(df)<.5) || (abs(db-1.)<.5 && abs(df-1.)<.5) || (abs(db)<.5 && abs(df+1.)<.5) || (abs(db+2.)<.5 && abs(df-1.)<.5)){ st=max(st,u.misc2.w); }
    if((abs(db-1.)<.5 && abs(df)<.5) || (abs(db)<.5 && abs(df-1.)<.5)){ st=0.; } }
  // floor lines and the wash under each sill
  wall*=1.-.35*smoothstep(.07,0.,abs(fv-.03))*smoothstep(260.,60.,dist);
  if(!valid){ return wall; }
  let wq=abs(vec2f(fu,fv-1.76))-vec2f(1.02,.88); let wd=max(wq.x,wq.y);
  let lod=smoothstep(170.,70.,dist);
  let warm=GOLD*mix(vec3f(1.,.9,.72),vec3f(1.,1.06,1.2),h.z);
  if(wd<0.){
    var col=vec3f(0.);
    if(detail && lod>0.){ let dl=vec3f(dot(rd,tu),rd.y/1.,dot(rd,-n)); col=interior(vec2f(fu,fv),normalize(dl),h,st,select(0.,1.,isHero))*u.misc2.z; }
    let flat=warm*st*(.55+.9*h.y)*(.75+.25*smoothstep(.0,.5,fv-.9));
    col=mix(flat,col,select(0.,lod,detail));
    // unlit glass keeps a little sky; frame and mullion
    col+=SILVER*.006*(1.-st)*(.6+.4*fv/FLOOR);
    let fr=smoothstep(-.05,-.02,wd)+smoothstep(.035,.015,abs(fu))*lod; col=mix(col,wall*.6,clamp(fr,0.,1.)*smoothstep(400.,150.,dist));
    return col; }
  // light spilling onto the wall around a lit window
  wall+=warm*st*.035*exp(-wd*2.6)*(1.-.5*smoothstep(-1.,1.,fv-1.76));
  wall*=1.-.5*smoothstep(.1,.0,wd)*lod;                         // the reveal's shadow line
  if(fv<.9 && fv>.82 && abs(fu)<1.1){ wall*=1.5; }              // sill
  return wall; }

// ───────── sea ─────────
fn seaH(p0:vec2f, t:f32, it:i32)->f32{ var p=p0; var a=1.; var f=.085; var sp=1.35; var ang=.3; var s=0.; var w=0.;
  for(var i=0;i<it;i++){ let d=vec2f(sin(ang),cos(ang)); let x=dot(d,p)*f+t*sp; let wv=exp(sin(x)-1.); let dx=wv*cos(x);
    p+=d*(-dx)*a*.32/f*.085; s+=wv*a; w+=a; a*=.81; f*=1.19; sp*=1.07; ang+=12.339; }
  return s/w; }
fn traceGround(ro:vec3f, rd:vec3f, A:f32, t:f32, steps:i32)->f32{ if(rd.y>-1e-4){ return -1.; }
  var tt=max(0.,-ro.y/rd.y); if(A<.01){ return tt; }
  let k=min(1./(-rd.y),7.);
  for(var i=0;i<steps;i++){ let p=ro+rd*tt; let h=(seaH(p.xz,t,10)-1.)*A; let g=p.y-h; if(g<.004*tt+.002){ break; } tt+=g*k*.6; }
  return tt; }
fn seaN(p:vec2f, A:f32, t:f32, e:f32)->vec3f{ let it=i32(clamp(30.-3.2*log2(max(e,.01)/.01)*.55,6.,30.));
  let h=seaH(p,t,it); let hx=seaH(p+vec2f(e,0.),t,it); let hz=seaH(p+vec2f(0.,e),t,it); return normalize(vec3f(-(hx-h)*A,e,-(hz-h)*A)); }

fn moonDisc(rd:vec3f)->vec3f{ let m=normalize(u.moon); let c=dot(rd,m); let ang=acos(clamp(c,-1.,1.)); let R=.0125;
  let rr=ang/R; var col=vec3f(0.);
  if(rr<1.3){ let ax=normalize(cross(m,vec3f(0.,1.,0.))); let ay=cross(ax,m); let q=vec2f(dot(rd,ax),dot(rd,ay))/R;
    let limb=sqrt(max(1.-rr*rr,0.)); let maria=fbm(q*1.6+vec2f(4.2,1.3)); let crat=fbm(q*5.+9.);
    let surf=(.62+.38*limb)*(1.-.38*smoothstep(.45,.62,maria))*(.92+.16*crat);
    col=SILVER*2.1*surf*surf*smoothstep(1.02,.97,rr); }
  col+=SILVER*(.22*exp(-ang*38.)+.07*exp(-ang*9.)+.03*exp(-ang*2.6));
  return col; }
fn sky(rd:vec3f, withMoon:bool)->vec3f{ let y=max(rd.y,0.);
  var c=SILVER*mix(.036,.0055,pow(y,.42));
  let wsh=fbm(vec2f(atan2(rd.x,rd.z)*3.,y*9.)+2.7); c*=.72+.56*wsh;
  // thin cloud washes that catch the moon
  let m=normalize(u.moon); let near=max(dot(rd,m),0.);
  let cl=smoothstep(.5,.78,fbm(vec2f(atan2(rd.x,rd.z)*5.+u.t*.004,y*30.-1.5)))*smoothstep(.0,.05,y)*smoothstep(.5,.12,y);
  c+=SILVER*cl*(.012+.11*pow(near,24.));
  if(withMoon){ c+=moonDisc(rd)*(1.-.75*cl); } else { let ang=acos(clamp(dot(rd,m),-1.,1.)); c+=SILVER*(.22*exp(-ang*38.)+.07*exp(-ang*9.)+.03*exp(-ang*2.6)); }
  return c; }

// the far field: points of light on the ground plane. x: city windows, y: glints
fn layer(p:vec2f, g:f32, fp:f32)->vec2f{ let c=floor(p/g); let h=hash33(vec3f(c*1.731,g)); let pos=(c+.22+.56*h.xy)*g; let d=p-pos; let r=max(fp*.85,mix(.45,.035,u.s));
  let spot=exp(-dot(d,d)/(r*r))*min(g*g/(3.14*r*r),60.);
  // city: is there a building here, and how tall
  let cc=floor((pos+20.)/CELL); let b=bldg(cc); let q=abs(pos-cc*CELL); let inb=mix(step(q.x,b.x)*step(q.y,b.y)*step(.3,b.z),.55,u.misc.w);
  let city=winState(vec3f(h.z*.72,h.x,h.y),u.tw)*inb*clamp(b.z/max(u.hs,1e-3)/40.,.3,3.2);
  let ph=u.misc.z*(2.2+5.*h.x)+h.y*50.; let sea=pow(.5+.5*sin(ph),9.)*(.15+2.2*h.z*h.z);
  return spot*vec2f(city,sea); }
fn lightField(p:vec2f, fp:f32)->vec2f{ let l=log2(max(fp*2.6,mix(5.,.3125,u.s))/5.); let l0=floor(l); let f=l-l0; let g=5.*exp2(l0);
  return mix(layer(p,g,fp),layer(p+13.7,g*2.,fp),f); }

fn fogT(ro:vec3f, rd:vec3f, dist:f32)->f32{ let Hh=38.; let a=1./11000.; let b=(1.-.93*u.s)/230.;
  let y0=max(ro.y,0.); let y1=max(ro.y+rd.y*dist,0.); var m:f32;
  if(abs(rd.y)<1e-3){ m=exp(-y0/Hh)*dist; } else { m=Hh*(exp(-y0/Hh)-exp(-y1/Hh))/rd.y; }
  return exp(-(dist*a+abs(m)*b)); }
fn fogC(rd:vec3f)->vec3f{ let m=normalize(u.moon); return SILVER*(.026+.05*pow(max(dot(rd,m),0.),6.)+.14*pow(max(dot(rd,m),0.),90.)); }

@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let ndc=(fc.xy-.5*u.res)/(.5*u.res.y); let rd=normalize(u.fw+(u.rt*ndc.x-u.up*ndc.y)*u.tanh); let ro=u.ro;
  let px=2.*u.tanh/u.res.y; let steps=i32(u.misc.y);
  var col:vec3f; var dist=1e9; var hitSky=true;
  var H:Hit; H.k=0; H.t=1e9; if(u.hs>.012){ H=traceCity(ro,rd,steps); }
  let A=2.3*u.s;
  if(H.k==1){ let p=ro+rd*H.t; dist=H.t; hitSky=false; col=facade(p,H.n,H.c,H.b,rd,dist,true); }
  else { let tg=traceGround(ro,rd,A,u.t,i32(u.misc2.x));
    if(tg>0.){ dist=tg; hitSky=false; let p=ro+rd*tg; let fp=px*tg; let fpe=fp/sqrt(max(-rd.y,.02));
      // water (its swell grows with s) under everything
      let e=max(fp*1.2,.02); var n=vec3f(0.,1.,0.); if(A>.01){ n=seaN(p.xz,A,u.t,e); n=normalize(mix(n,vec3f(0.,1.,0.),smoothstep(900.,9000.,tg)*.6)); }
      let R0=reflect(rd,n); let R=normalize(vec3f(R0.x,abs(R0.y)+.002,R0.z));
      let F=.02+.98*pow(1.-max(dot(n,-rd),0.),5.);
      let m=normalize(u.moon); let sd=max(dot(R,m),0.);
      var water=sky(R,false)*F+SILVER*.0016*(1.-F);
      water+=SILVER*F*(1.5*pow(sd,1400.)+.16*pow(sd,160.));                    // the moon's road
      let lf=lightField(p.xz,fpe)*smoothstep(.0025,.02,-rd.y);
      let gate=F*(pow(sd,30.)*1.+pow(sd,240.)*5.);
      let glint=GOLD*lf.y*gate*2.2;
      // city ground: dark, wet where the avenue is
      var ground=SILVER*(.0045+.004*fbm(p.xz*.02));
      let cityAmt=1.-u.s;
      if(cityAmt>.001 && u.hs>.012){
        if(H.k==2){ // beyond the traversal: the city as points of light
          let path=mix(1.,smoothstep(.985,.9995,sd)+.0,u.misc.w);
          ground+=GOLD*lf.x*.5*path; }
        else { // street level: lamps pooling on the wet road, windows reflected in long streaks
          let cc=floor((p.xz+20.)/CELL); let lq=vec2f(abs(p.x-cc.x*CELL)-18.5, (fract(p.z/36.)-.5)*36.); let pool=exp(-dot(lq,lq)/55.);
          ground+=SILVER*.02*pool*step(tg,1500.);
          if(tg<1300.){ let j=vec2f(vnoise(p.xz*.9),vnoise(p.xz*.9+31.))-.5; let rr=reflect(rd,normalize(vec3f(j.x*.05,1.,j.y*.35)));
            let H2=traceCity(p+vec3f(0.,.02,0.),rr,28); if(H2.k==1){ let p2=p+rr*H2.t; ground+=facade(p2,H2.n,H2.c,H2.b,rr,H2.t+tg,false)*.42*exp(-H2.t/260.)*smoothstep(1300.,500.,tg); } } } }
      else if(cityAmt>.001){ ground+=GOLD*lf.x*.5*mix(1.,smoothstep(.985,.9995,sd),u.misc.w); }
      col=mix(ground,water+glint,smoothstep(0.,1.,u.s)); }
    else { col=sky(rd,true); } }
  if(!hitSky){ let T=fogT(ro,rd,dist); let em=max(col-vec3f(.06),vec3f(0.)); col=(col-em)*T+fogC(rd)*(1.-T)+em*mix(T,1.,.35); }
  else { let T=fogT(ro,rd,60000.); col=mix(fogC(rd),col,max(T,smoothstep(0.,.12,rd.y))); }
  // paper: a faint wash and tooth over everything
  let pw=.92+.16*fbm(fc.xy/u.res.y*3.5+7.); col*=pw;
  return vec4f(col,1.); }
`;
