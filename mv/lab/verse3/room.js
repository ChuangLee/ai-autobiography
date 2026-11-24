// Shot 1: an ordinary server room, rendered as a photograph. Analytic ray tracing of the aisle (floor, ceiling, perforated rack doors with the
// equipment behind them in parallax, trays), a ray-marched person, one glossy bounce in the floor, thin-lens depth of field by stochastic sampling.
// p[0] = person root (x, 0, z, on)   p[1..14] = joints (see rig() in index.html)   p[15] = (focus distance, lens radius, samples, exposure)
// p[16] = (hero LED x, y, z, gain)   p[17] = (frame noise seed, fov scale(pixel angle), -, -)
export const ROOM = `
const RX=.8; const RH=2.1; const CH=3.; const ZE=24.; const ZR=20.; const WX=2.6;
struct Hit{ t:f32, id:i32, n:vec3f }
fn cap(p:vec3f,a:vec3f,b:vec3f,r:f32)->f32{ let pa=p-a; let ba=b-a; let h=sat(dot(pa,ba)/dot(ba,ba)); return length(pa-ba*h)-r; }
fn capT(p:vec3f,a:vec3f,b:vec3f,r1:f32,r2:f32)->f32{ let pa=p-a; let ba=b-a; let h=sat(dot(pa,ba)/dot(ba,ba)); return length(pa-ba*h)-mix(r1,r2,h); }
fn smin(a:f32,b:f32,k:f32)->f32{ let h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }
fn J(i:i32)->vec3f{ return u.p[i].xyz; }
// the person: local space, feet at the origin, walking towards +z (away from the camera). returns (distance, material)
fn sdPerson(p:vec3f)->vec2f{
  let hipL=J(1); let knL=J(2); let anL=J(3); let hipR=J(4); let knR=J(5); let anR=J(6);
  let shL=J(7); let elL=J(8); let haL=J(9); let shR=J(10); let elR=J(11); let haR=J(12); let cup=J(13); let bob=u.p[14].x; let lean=u.p[14].y;
  var q=p; q.y-=bob;
  // trousers
  var dl=min(capT(p,hipL,knL,.082,.062),capT(p,knL,anL,.06,.048)); dl=min(dl,min(capT(p,hipR,knR,.082,.062),capT(p,knR,anR,.06,.048)));
  let pel=length((q-vec3f(0.,.93,-.01))/vec3f(.17,.12,.12))-1.; dl=smin(dl,pel*.11,.05);
  var r=vec2f(dl,1.);
  // shoes
  let fl=vec3f(0.,-.035,.13); var ds=min(capT(p,anL+vec3f(0.,-.03,-.02),anL+fl,.05,.042),capT(p,anR+vec3f(0.,-.03,-.02),anR+fl,.05,.042));
  if(ds<r.x){ r=vec2f(ds,2.); }
  // sweater: torso, shoulders, sleeves
  var qt=q; qt.x/=1.18; qt.z=(qt.z-lean*(q.y-.95))/1.02; var dt=capT(qt,vec3f(0.,1.0,0.),vec3f(0.,1.36,.0),.118,.128)*1.0;
  dt=smin(dt,cap(q,vec3f(-.145,1.42,lean*.45),vec3f(.145,1.42,lean*.45),.056),.06);
  dt=smin(dt,min(capT(p,shL,elL,.058,.047),capT(p,elL,haL,.046,.038)),.03); dt=smin(dt,min(capT(p,shR,elR,.058,.047),capT(p,elR,haR-(haR-elR)*.12,.046,.04)),.03);
  dt-=.0015*sin(p.y*60.+p.x*20.)*sat(1.2-abs(p.y-1.05)*4.);     // a few folds at the waist
  if(dt<r.x){ r=vec2f(dt,3.); }
  // neck, head, ears, hands
  let hc=vec3f(0.,1.635+bob,lean*.7+.01);
  var dk=cap(p,vec3f(0.,1.46+bob,lean*.55),hc,.047); dk=smin(dk,(length((p-hc)/vec3f(.078,.105,.095))-1.)*.08,.02);
  dk=min(dk,(length((vec3f(abs(p.x),p.y,p.z)-hc-vec3f(.078,-.005,-.005))/vec3f(.012,.03,.018))-1.)*.012);
  dk=min(dk,capT(p,haL,haL+vec3f(.006,-.056,.009),.034,.019));
  dk=min(dk,capT(p,haL+vec3f(.019,-.014,.01),haL+vec3f(.022,-.041,.023),.013,.009));
  dk=min(dk,capT(p,haR,haR+vec3f(.006,.005,.023),.033,.023));
  if(dk<r.x){ r=vec2f(dk,4.); }
  // hair: a cap over the skull, cut off at the forehead (which faces +z)
  let hh=(length((p-hc-vec3f(0.,.012,-.012))/vec3f(.084,.108,.1))-1.)*.08; let dh=max(hh,-(p.y-hc.y+.045- (p.z-hc.z)*.9 - .01*sin(p.x*40.)));
  if(dh<r.x){ r=vec2f(dh,5.); }
  // the cup
  let c=p-cup; let radius=.036+.05*c.y;
  let shell=max(max(length(c.xz)-radius,abs(c.y)-.052)-.0025,min(radius-.003-length(c.xz),c.y+.043));
  let ear=c-vec3f(-.031,0.,-.018);
  let handle=length(vec2f((length(ear.xy/vec2f(.020,.030))-1.)*.019,ear.z))-.0042;
  let dc=min(shell,handle); if(dc<r.x){ r=vec2f(dc,6.); }
  return r; }
fn nPerson(p:vec3f)->vec3f{ let e=vec2f(.003,0.); return normalize(vec3f(sdPerson(p+e.xyy).x-sdPerson(p-e.xyy).x,sdPerson(p+e.yxy).x-sdPerson(p-e.yxy).x,sdPerson(p+e.yyx).x-sdPerson(p-e.yyx).x)); }
fn box(ro:vec3f,rd:vec3f,lo:vec3f,hi:vec3f)->vec2f{ let a=(lo-ro)/rd; let b=(hi-ro)/rd; let mn=min(a,b); let mx=max(a,b); return vec2f(max(mn.x,max(mn.y,mn.z)),min(mx.x,min(mx.y,mx.z))); }
fn boxN(p:vec3f,lo:vec3f,hi:vec3f)->vec3f{ let c=(lo+hi)*.5; let d=(p-c)/((hi-lo)*.5); let a=abs(d); if(a.x>a.y&&a.x>a.z){ return vec3f(sign(d.x),0.,0.); } if(a.y>a.z){ return vec3f(0.,sign(d.y),0.); } return vec3f(0.,0.,sign(d.z)); }
const TR0=vec3f(.83,2.17,-10.); const TR1=vec3f(1.02,2.29,20.); const TY0=vec3f(1.2,2.44,-10.); const TY1=vec3f(1.78,2.52,22.);
fn trace(ro:vec3f,rd:vec3f,person:bool)->Hit{ var h=Hit(1e9,0,vec3f(0.));
  if(rd.y<0.){ let t=-ro.y/rd.y; h=Hit(t,1,vec3f(0.,1.,0.)); } else { let t=(CH-ro.y)/rd.y; h=Hit(t,2,vec3f(0.,-1.,0.)); }
  let s=sign(rd.x); if(s!=0.){
    if(ro.x*s<RX){ let t=(s*RX-ro.x)/rd.x; let p=ro+rd*t; if(t>0.&&t<h.t&&p.y<RH&&p.z>-10.&&p.z<ZR){ h=Hit(t,3,vec3f(-s,0.,0.)); } }
    let t=(s*WX-ro.x)/rd.x; if(t>0.&&t<h.t){ h=Hit(t,4,vec3f(-s,0.,0.)); } }
  if(rd.z>0.){ let t=(ZE-ro.z)/rd.z; if(t<h.t){ h=Hit(t,5,vec3f(0.,0.,-1.)); } } else if(rd.z<0.){ let t=(-12.-ro.z)/rd.z; if(t<h.t){ h=Hit(t,6,vec3f(0.,0.,1.)); } }
  // rack ends facing the cross aisle
  if(rd.z<0.&&ro.z>ZR){ let t=(ZR-ro.z)/rd.z; let p=ro+rd*t; if(t<h.t&&abs(p.x)>RX&&p.y<RH){ h=Hit(t,10,vec3f(0.,0.,1.)); } }
  // the fibre trough and the cable ladder over each row (mirrored)
  let mo=vec3f(abs(ro.x),ro.y,ro.z); let md=vec3f(rd.x*sign(ro.x+1e-6),rd.y,rd.z);
  for(var k=-1.;k<=1.;k+=2.){ let o2=vec3f(ro.x*k,ro.y,ro.z); let d2=vec3f(rd.x*k,rd.y,rd.z);
    var b=box(o2,d2,TR0,TR1); if(b.x>0.&&b.x<b.y&&b.x<h.t){ var n=boxN(o2+d2*b.x,TR0,TR1); n.x*=k; h=Hit(b.x,7,n); }
    b=box(o2,d2,TY0,TY1); if(b.x>0.&&b.x<b.y&&b.x<h.t){ var n=boxN(o2+d2*b.x,TY0,TY1); n.x*=k; h=Hit(b.x,8,n); } }
  if(person&&u.p[0].w>.5){ let o=ro-vec3f(u.p[0].x,0.,u.p[0].z); let b=box(o,rd,vec3f(-.42,0.,-.5),vec3f(.42,1.8,.55));
    if(b.x<b.y&&b.y>0.&&b.x<h.t){ var t=max(b.x,0.); for(var i=0;i<56;i++){ let d=sdPerson(o+rd*t).x; if(d<.0012*t+.0006){ h=Hit(t,9,vec3f(0.)); break; } t+=d*.9; if(t>b.y||t>h.t){ break; } } } }
  return h; }
// light from the ceiling panels (0.6 × 1.2 m every 2.4 m down the middle of the aisle) on a point with normal n
fn panels(p:vec3f,n:vec3f)->f32{ var e=0.; let k=round(p.z/2.4);
  for(var j=-2.;j<=2.;j+=1.){ let l=vec3f(0.,CH,(k+j)*2.4)-p; let d2=dot(l,l); let ld=l*inverseSqrt(d2); e+=max(dot(n,ld),0.)*max(ld.y,0.)/(d2+.35); } return e; }
fn panelSpec(p:vec3f,r:vec3f,pw:f32)->f32{ var e=0.; let k=round((p.z+r.z*2.)/2.4);
  for(var j=-1.;j<=1.;j+=1.){ let l=normalize(vec3f(0.,CH,(k+j)*2.4)-p); e+=pow(max(dot(r,l),0.),pw); } return e; }
fn led(q:vec2f,c:vec2f,r0:f32,px:f32)->f32{ let r=max(r0,px*.75); let d=(q-c)/r; return exp(-dot(d,d))*(r0*r0)/(r*r); }
fn blink(id:f32,t:f32)->f32{ let rate=mix(.4,9.,pow(hash11(id*1.31),2.2)); let k=floor(t*rate+hash11(id)*7.); let on=step(.42,hash11(k*.173+id*3.7)); return mix(on,1.,step(.86,hash11(id*5.3))); }
struct Mat{ alb:vec3f, emi:vec3f, rough:f32, spec:f32 }
// what is behind the door of rack ri at height y, across-rack position f (0..0.6 m)
fn gear(ri:f32,f:f32,y:f32,t:f32,px:f32)->Mat{ var m=Mat(vec3f(.012),vec3f(0.),.6,.2);
  if(f<.062||f>.538){ // mounting rail with its square holes
    let hy=fract((y-.12)/.01482); m.alb=vec3f(.05)*(1.-.8*step(.3,hy)*step(hy,.75)*step(abs(abs(f-.3)-.262),.005)); return m; }
  if(y<.14||y>2.0){ return m; }
  let net=step(4.5,(ri+3.)%6.); let uu=(y-.14)/.04445; let a=(f-.062)/.476;
  if(net>.5){ // network rack: patch panels and switches alternating, with a cable manager between
    let ui=floor(uu); let b=fract(uu); let kind=ui%3.; let id=ri*91.7+ui*3.1;
    if(kind==2.){ // cable manager: fingers, and the patch cords running through it
      let cx=fract(a*24.); let cid=floor(a*24.)+ui*.37+ri; let hue=hash11(cid); let cc=mix(mix(vec3f(.04,.16,.5),vec3f(.75,.58,.05),step(.55,hue)),vec3f(.5),step(.85,hue));
      m.alb=mix(vec3f(.02),cc,smoothstep(.5,.3,abs(cx-.5))*step(.15,b)); m.rough=.5; return m; }
    let px2=a*24.; let pi=floor(px2); let pf=fract(px2); let row=step(.5,b);
    let port=step(.14,pf)*step(pf,.86)*step(.12,fract(b*2.))*step(fract(b*2.),.7);
    let used=step(.2,hash11(id+pi*1.7+row*9.3));
    let hue=hash11(pi+ui*.37+ri+ (1.-row)*0.); let cc=mix(mix(vec3f(.04,.16,.5),vec3f(.75,.58,.05),step(.55,hue)),vec3f(.5),step(.85,hue));
    m.alb=mix(vec3f(.055,.057,.06),mix(vec3f(.008),cc,used*.9),port); m.rough=.45;
    if(kind==0.){ let lc=vec2f((pi+.5)/24.*.476, (floor(b*2.)+.86)*.5*.04445); let q=vec2f(a*.476,b*.04445);
      let on=blink(id+pi*7.1+row*13.,t)*used; let amber=step(.8,hash11(id+pi*2.3)); m.emi=mix(vec3f(.15,1.,.25),vec3f(1.,.55,.05),amber)*on*led(q,lc,.0016,px)*10.; }
    return m; }
  // servers: 2U units, some 1U, a few blanking panels
  let di=floor(uu*.5); let id=ri*57.3+di*7.7; let h=hash11(id); let b=fract(uu*.5);
  if(h>.9){ m.alb=vec3f(.03)+.012*step(.96,fract(uu)); m.rough=.5; return m; }   // blanking panels
  let gap=step(.035,b)*step(b,.965); let q=vec2f(a*.476,b*.0889);
  if(h<.32){ // 2U storage: 12 drive carriers in 3 rows
    let cx=a*4.; let cy=b*3.; let ci=floor(vec2f(cx,cy)); let cf=fract(vec2f(cx,cy));
    let car=step(.03,cf.x)*step(cf.x,.97)*step(.1,cf.y)*step(cf.y,.9); let vent=.5+.5*step(.5,fract(cf.x*14.+floor(cf.y*5.)*.5))*step(cf.x,.8);
    m.alb=mix(vec3f(.02),vec3f(.085,.088,.092)*vent,car)*gap; m.rough=.4; m.spec=.5;
    let lid=id+ci.x*3.3+ci.y*17.9; let lc=(ci+vec2f(.9,.22))/vec2f(4.,3.)*vec2f(.476,.0889);
    m.emi=vec3f(.12,1.,.3)*blink(lid,t)*led(q,lc,.0015,px)*9.+vec3f(.1,.35,1.)*step(.25,hash11(lid*1.9))*led(q,lc-vec2f(.006,0.),.0013,px)*5.; return m; }
  if(h<.72){ // 2U server: bezel grille, 8 small drives on the left, status lights on the right ear
    let grille=.55+.45*step(.5,fract(q.x*260.+floor(q.y*150.)*.5))*step(.3,fract(q.y*150.));
    var alb=vec3f(.03,.031,.034)*grille; let dz=a*10.; let dj=floor(dz); let df=fract(dz);
    if(a<.6){ let car=step(.06,df)*step(df,.94)*step(.5,b)*step(b,.9); alb=mix(alb,vec3f(.07,.072,.078),car); let lid=id+dj*5.1; let lc=vec2f((dj+.5)/10.*.476,.0889*.56);
      m.emi=vec3f(.12,1.,.3)*blink(lid,t)*led(q,lc,.0014,px)*8.; }
    let st=vec2f(.476*.955,.0889*.5); m.emi+=mix(vec3f(.1,.4,1.),vec3f(.15,1.,.3),step(.5,hash11(id*3.3)))*led(q,st,.002,px)*7.+vec3f(1.,.5,.05)*step(.93,hash11(id*7.9))*blink(id+.5,t*.3)*led(q,st-vec2f(.012,0.),.0018,px)*8.;
    m.alb=alb*gap; m.rough=.45; m.spec=.4; return m; }
  // 1U pair: a silver-faced appliance over a switch with its row of link lights
  let top=step(.5,b); let b1=fract(b*2.);
  if(top>.5){ m.alb=vec3f(.2,.2,.21)*(.8+.2*step(.5,fract(a*40.)))*step(.08,b1)*step(b1,.92); m.rough=.35; m.spec=.6; m.emi=vec3f(.15,1.,.3)*led(q,vec2f(.02,.0889*.75),.0018,px)*7.; return m; }
  let pi=floor(a*26.); let pf=fract(a*26.); let port=step(.15,pf)*step(pf,.85)*step(.2,b1)*step(b1,.72)*step(1.,pi)*step(pi,24.);
  m.alb=mix(vec3f(.04,.042,.05),vec3f(.006),port)*step(.06,b1); let lid=id+pi*3.7; let lc=vec2f((pi+.5)/26.*.476,.0889*.42);
  m.emi=mix(vec3f(.15,1.,.25),vec3f(1.,.6,.05),step(.75,hash11(lid)))*blink(lid,t)*step(.3,hash11(lid*2.1))*led(q,lc,.0014,px)*9.*step(1.,pi)*step(pi,24.);
  return m; }
fn surface(h:Hit,p:vec3f,rd:vec3f,t:f32,px:f32)->Mat{ var m=Mat(vec3f(.5),vec3f(0.),.6,0.);
  if(h.id==1){ // raised floor: 600 mm panels, speckled laminate, a perforated one here and there down the cold aisle
    let g=p.xz/.6+vec2f(.5,0.); let gi=floor(g); let gf=fract(g); let e=min(min(gf.x,1.-gf.x),min(gf.y,1.-gf.y))*.6; let aa=px*1.2+.0006;
    let seam=smoothstep(.0012+aa,.0012,e); var alb=vec3f(.56,.56,.55)*(.94+.1*hash21(gi))+(hash21(floor(p.xz*900.))-.5)*.05*smoothstep(.004,.0,px);
    alb*=.9+.2*fbm(p.xz*vec2f(3.,1.2)); alb*=1.-.1*smoothstep(.55,.0,abs(p.x))*fbm(p.xz*vec2f(8.,2.)+3.);   // wear along the walking line
    let perf=step(abs(gi.x),.5)*step(.6,hash21(gi+7.)); if(perf>.5){ let hq=fract(gf*22.)-.5; let hole=mix(smoothstep(.3+aa*30.,.3-aa*30.,length(hq)),.28,smoothstep(.25,.9,aa*44.));
      alb=mix(alb,vec3f(.03),hole*step(.045,gf.x)*step(gf.x,.955)*step(.045,gf.y)*step(gf.y,.955)); }
    m.alb=mix(alb,vec3f(.1),seam); m.rough=.16+.2*fbm(p.xz*5.)+.3*seam; m.spec=1.; return m; }
  if(h.id==2){ // ceiling: tile grid; light panels; a detector now and then
    let g=p.xz/.6+vec2f(.5,0.); let gf=fract(g); let e=min(min(gf.x,1.-gf.x),min(gf.y,1.-gf.y))*.6; let bar=smoothstep(.014+px,.012,e);
    m.alb=mix(vec3f(.74,.74,.72)*(.97+.05*hash21(floor(g))),vec3f(.6),bar);
    let lz=fract(p.z/2.4+.5)*2.4-1.2; let on=step(abs(p.x),.29)*step(abs(lz),.59);
    m.emi=vec3f(1.,.985,.95)*on*(4.2-1.2*smoothstep(.2,.3,abs(p.x))); 
    let dq=vec2f(abs(p.x)-1.2,fract(p.z/4.8)*4.8-2.4); m.alb=mix(m.alb,vec3f(.85),smoothstep(.06,.05,length(dq))); m.emi+=vec3f(1.,.05,.02)*led(dq,vec2f(.03,0.),.004,px)*step(.5,fract(t*.35+floor(p.z/4.8)*.37))*3.;
    return m; }
  if(h.id==3){ let s=-h.n.x; let rz=(p.z+10.)/.6; let ri=floor(rz)+s*40.; let f=fract(rz)*.6; let y=p.y;
    // the door: frame, perforated sheet, handle, label
    let frame=step(f,.022)+step(.578,f)+step(y,.09)+step(2.065,y);
    let pitch=.0062; var hq=vec2f(f,y)/pitch; hq.x+=.5*(floor(hq.y)%2.); let hd=length(fract(hq)-.5); let aa=px/pitch;
    var open=mix(smoothstep(.37+aa,.37-aa,hd),.43,smoothstep(.2,.7,aa));
    if(frame>0.){ open=0.; }
    let handle=step(.512,f)*step(f,.548)*step(.98,y)*step(y,1.24);
    // parallax: where the ray passes the equipment plane 55 mm behind the sheet
    let k=.055/max(abs(rd.x),.02); let f2=f+rd.z*k; let y2=y+rd.y*k; var g=gear(ri,f2,y2,t,px);
    if(f2<0.||f2>.6){ g.alb=vec3f(.02); g.emi=vec3f(0.); }
    let sheen=.045+.02*fbm(vec2f(f*30.,y*4.)+ri);
    m.alb=mix(vec3f(sheen)*(1.-.5*step(.5,frame)*0.),g.alb*.8,open); m.emi=g.emi*open; m.rough=mix(.38,.6,open); m.spec=mix(1.,g.spec*.4,open);
    if(handle>.5){ m.alb=vec3f(.02); m.rough=.25; m.spec=1.; m.emi=vec3f(0.); let kq=vec2f(f-.53,y-1.02); m.alb=mix(m.alb,vec3f(.45),smoothstep(.009,.007,length(kq))); }
    let lq=vec2f((f-.24)/.12,(1.985-y)/.045); if(lq.x>0.&&lq.x<1.&&lq.y>0.&&lq.y<1.){ let li=(ri+80.)%16.; let tx=textureSampleLevel(labels,lin,vec2f((li%4.+lq.x)/4.,(floor(li/4.)+lq.y)/4.),clamp(log2(px*4000.),0.,5.)).r;
      m.alb=mix(vec3f(.78,.78,.74),vec3f(.05),tx); m.emi=vec3f(0.); m.rough=.7; m.spec=.1; }
    // the hero status lamp on the door frame of one rack
    let hl=u.p[16]; if(abs(p.z-hl.z)<.2&&abs(p.x-hl.x)<.01){ let d=(p.zy-hl.zy)/max(.004,px*.75); m.emi+=vec3f(1.,.52,.1)*exp(-dot(d,d))*min(1.,(.004*.004)/(px*px*.56))*hl.w; }
    return m; }
  if(h.id==4||h.id==6){ m.alb=vec3f(.6,.6,.58); m.rough=.9; if(p.y<RH&&abs(p.z)<19.9){ m.alb=vec3f(.02); } return m; }
  if(h.id==5){ // far wall: skirting, a door with a small pane, the exit sign above it
    m.alb=vec3f(.62,.62,.6); m.rough=.9; let dq=vec2f(p.x-.0,p.y);
    if(abs(dq.x)<.5&&dq.y<2.1){ m.alb=vec3f(.34,.37,.4); if(abs(dq.x-.22)<.12&&abs(dq.y-1.5)<.28){ m.alb=vec3f(.03); m.rough=.1; m.spec=1.; } if(abs(dq.x+.4)<.03&&abs(dq.y-1.05)<.06){ m.alb=vec3f(.5); } }
    else if(abs(dq.x)<.56&&dq.y<2.16){ m.alb=vec3f(.25); }
    if(abs(dq.x)<.2&&abs(dq.y-2.36)<.075){ m.alb=vec3f(.05,.3,.12); m.emi=vec3f(.1,.9,.35)*1.6; }
    if(p.y<.1){ m.alb=vec3f(.15); } 
    let eq=vec2f(p.x-1.75,p.y-.75); if(abs(eq.x)<.075&&abs(eq.y)<.27){ m.alb=vec3f(.5,.03,.02); m.rough=.3; m.spec=1.; }
    return m; }
  if(h.id==7){ m.alb=vec3f(.6,.47,.1)*(.9+.1*step(.02,fract(p.z/1.83))); m.rough=.45; m.spec=.6; if(abs(h.n.y)<.5&&fract(p.z/1.83)<.02){ m.alb*=.5; } return m; }
  if(h.id==8){ // cable ladder seen from below and from the side: rails, rungs, the bundles lying on it
    if(abs(h.n.x)>.5){ m.alb=vec3f(.33,.34,.35); m.rough=.4; m.spec=.6; return m; }
    let rung=step(fract(p.z/.3),.1); let ax=abs(p.x); let b=fract((ax-1.2)/.58*7.); let bi=floor((ax-1.2)/.58*7.); let hue=hash11(bi+3.+step(0.,p.x)*9.);
    let cc=mix(mix(vec3f(.05,.17,.5),vec3f(.3,.3,.32),step(.5,hue)),vec3f(.6,.45,.05),step(.85,hue))*(.6+.4*sin(b*3.14159))*(1.-.6*step(fract(p.z/.9+hue),.03));
    m.alb=mix(cc,vec3f(.3,.31,.32),rung); m.rough=.6; return m; }
  if(h.id==10){ m.alb=vec3f(.04); m.rough=.4; m.spec=.6; return m; }
  return m; }
fn shadePerson(o:vec3f,rd:vec3f,pw:vec3f)->vec3f{ let n=nPerson(o); let id=sdPerson(o).y; var alb=vec3f(.5); var sp=.02;
  if(id==1.){ alb=vec3f(.085,.088,.1)*(.85+.3*fbm(o.xy*vec2f(160.,40.))); } else if(id==2.){ alb=mix(vec3f(.03),vec3f(.6),step(o.y,.022)); sp=.08; }
  else if(id==3.){ alb=vec3f(.11,.125,.15)*(.8+.4*fbm(o.xy*vec2f(60.,220.))); }
  else if(id==4.){ alb=vec3f(.52,.35,.27); sp=.05; } else if(id==5.){ alb=vec3f(.022,.02,.02)*(.6+.8*fbm(o.xy*vec2f(300.,40.))); sp=.12; } else { alb=vec3f(.72,.72,.7); sp=.2; }
  var ao=1.; for(var i=1.;i<=3.;i+=1.){ ao-=(i*.05-sdPerson(o+n*i*.05).x)*.9/i; } ao=sat(ao);
  let e=panels(pw,n)*2.6+ (.42+.25*n.y)*1.; let r=reflect(rd,n); let fr=pow(1.-max(dot(-rd,n),0.),4.);
  return alb*e*ao*.8+ (sp*panelSpec(pw,r,24.)*.6+fr*.06)*ao; }
// radiance along a ray; bounce = follow the floor's reflection once
fn radiance(ro:vec3f,rd:vec3f,t:f32,pix:f32,rnd:vec2f)->vec4f{
  var col=vec3f(0.); var thr=vec3f(1.); var o=ro; var d=rd; var dist=0.;
  for(var b=0;b<2;b++){ let h=trace(o,d,true); let p=o+d*h.t; let px=(dist+h.t)*pix; if(b==0){ dist=h.t; }
    if(h.id==9){ let root=vec3f(u.p[0].x,0.,u.p[0].z); col+=thr*shadePerson(p-root,d,p); break; }
    let m=surface(h,p,d,t,px); var n=h.n;
    // diffuse light: panels + what the room bounces back, with the corners occluded
    var amb=.36; var ao=1.;
    if(h.id==1){ ao=mix(.45,1.,smoothstep(0.,.5,RX-abs(p.x)))*mix(.7,1.,smoothstep(0.,1.6,RX-abs(p.x)));
      if(u.p[0].w>.5){ let q=p-vec3f(u.p[0].x,0.,u.p[0].z); if(abs(q.x)<.9&&abs(q.z)<1.){ ao*=mix(.42,1.,sat(sdPerson(q+vec3f(0.,.07,0.)).x/.16))*mix(.72,1.,sat(sdPerson(q+vec3f(0.,.5,0.)).x/.5)); } } }
    if(h.id==3){ ao=mix(.55,1.,smoothstep(0.,.35,p.y))*mix(.8,1.,smoothstep(0.,.3,RH-p.y)); amb=.3; }
    if(h.id==2){ amb=.62; ao=mix(.8,1.,smoothstep(WX,RX,abs(p.x))); }
    if(h.id==4){ ao=.55; } if(h.id==8||h.id==7){ amb=.4; ao=.8; } if(h.id==5){ ao=mix(.7,1.,smoothstep(0.,.5,p.y)); }
    let e=(panels(p,n)*3.+amb)*ao; col+=thr*(m.alb*e+m.emi);
    if(h.id==1){ // glossy floor: continue along the (roughened) mirror direction
      let fr=.04+.96*pow(1.-max(dot(-d,n),0.),5.); thr*=fr*(1.-m.rough*.9)*ao; let j=(rnd-.5)*m.rough*.5; d=normalize(reflect(d,n)+vec3f(j.x,abs(j.y)*.3,j.y)); o=p+n*.001; }
    else { let r=reflect(d,n); col+=thr*m.spec*(panelSpec(p,r,mix(400.,20.,m.rough))*mix(.5,.05,m.rough)+ (.04+.96*pow(1.-max(dot(-d,n),0.),5.))*.22*(1.-m.rough))*ao; break; } }
  return vec4f(col,dist); }
@group(0)@binding(1) var lin:sampler; @group(0)@binding(2) var labels:texture_2d<f32>;
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let t=u.ro.w; let F=u.p[15].x; let R=u.p[15].y; let N=i32(u.p[15].z); let seed=u.p[17].x; let pix=u.p[17].y;
  let rtn=normalize(u.rt.xyz); let upn=normalize(u.up.xyz); let fwn=normalize(u.fw.xyz); var acc=vec3f(0.); let r0=ign(fc.xy+seed*vec2f(47.,17.));
  for(var i=0;i<N;i++){ let fi=f32(i); let h2=hash22(fc.xy+vec2f(fi*7.3+seed*13.,fi*3.1+seed*5.));
    let rd0=rayDir(fc.xy+h2-.5); let fp=u.ro.xyz+rd0*(F/dot(rd0,fwn));
    let a=6.2831853*(r0+fi*.61803); let rr=sqrt((fi+.5)/f32(N))*R; let o=u.ro.xyz+(rtn*cos(a)+upn*sin(a))*rr; let d=normalize(fp-o);
    let c=radiance(o,d,t,pix,hash22(fc.xy*1.7+vec2f(fi*1.9+seed*3.,fi)));  acc+=min(c.rgb,vec3f(30.)); }
  var c=acc/f32(N)*u.p[15].w;
  let hl=u.p[16]; if(hl.w>1.01){ let rd=rayDir(fc.xy); let tc=dot(hl.xyz-u.ro.xyz,rd); let v=u.ro.xyz+rd*tc-hl.xyz; let r=length(v)/max(tc*pix,1e-5);
    let k=(hl.w-1.)/5.; c+=vec3f(1.,.5,.1)*(exp(-r*r*.35)*7.+exp(-r*.18)*.5)*k*u.p[17].z; }
  return vec4f(c,u.fw.w); }
`;
