// Two painted pictures of the same water, one growing out of the other.
//   Van Gogh (in the manner of Starry Night Over the Rhône): a sky and a river laid in short thick strokes that all follow one flow; each star a pale core
//   ringed with concentric dashes; gas lamps on the far shore, and under each a column of broken horizontal dashes on the water.
//   Hokusai: a woodblock print drawn directly: a pale sky with bokashi, flat Prussian blues, a keyline of varying weight, and one great wave whose crest
//   breaks into claws fringed with smaller claws, over a very small moon. It rises as a swell, curls, hangs, and breaks forward into foam.
//   Between them the strokes straighten, lengthen and thin into contour line while their colours flatten to the print's inks.
export const PAINT = /* wgsl */`
struct Q { res:vec2f, t:f32, w:f32,
  a:vec4f,     // x unused, y swirl in the sky, z Hokusai (0 oil … 1 print), w the wave's rise (0 swell … 1 reared and curled)
  b:vec4f,     // x where the gold reflection stands, y how much of the scene has arrived (0 only that reflection … 1 all), z calm after, w the break (0 hanging … 1 collapsed)
  c:vec4f }    // x the swell in the river where the wave will rise, yzw unused
@group(0)@binding(0) var<uniform> q:Q;
fn hz()->f32{ return mix(.06,-.42,smoothstep(0.,1.,q.a.z)); }
const NS=11; const MOONX=.3;
fn starAt(i:i32)->vec3f{ let fi=f32(i); if(i==0){ return vec3f(MOONX,hz()+.5-.37*smoothstep(0.,1.,q.a.z),.8); }
  return vec3f((hash11(fi*3.1+1.)*2.-1.)*1.65,hz()+.2+.72*hash11(fi*5.7+2.),.65+.7*hash11(fi+9.)); }
fn lampX(i:i32)->f32{ return select((f32(i)-4.)*.41+.13*(hash11(f32(i)*7.3)-.5),q.b.x,i==4); }
fn swellV(x:f32)->f32{ return q.c.x*exp(-(x+.75)*(x+.75)/.3); }

// ───────── the print ─────────
fn seaY(x:f32)->f32{ let t=q.t; let w=q.a.w; return -.42+.032*sin(x*2.7+t*.55)+.02*sin(x*6.1-t*.8+1.)+.008*sin(x*13.+t*1.1)+.085*w*exp(-(x-1.2)*(x-1.2)/.12)+.045*w*exp(-(x-.62)*(x-.62)/.03)+swellV(x)*(1.-smoothstep(0.,.5,w)); }
// a hooked horn: a disc with a larger disc bitten out of it; the bite leaves a tip that points forward and inward
fn claw(p:vec2f, cc:vec2f, f:vec2f, o:vec2f, s:f32)->f32{ let d=p-cc; let l=vec2f(dot(d,f),dot(d,o)); return max(length(l)-s,-(length(l-vec2f(-.58*s,-.62*s))-s*1.06)); }
fn rot(v:vec2f, a:f32)->vec2f{ let c=cos(a); let s=sin(a); return vec2f(v.x*c-v.y*s,v.x*s+v.y*c); }
// claws fringed with claws, two generations down
fn clawTree(p:vec2f, cc:vec2f, f:vec2f, o:vec2f, s:f32, seed:f32)->f32{ var d=claw(p,cc,f,o,s);
  if(length(p-cc)>s*2.1){ return d; }
  for(var j=0;j<3;j++){ let fj=f32(j); let ph=-.55+.75*fj+.3*(hash11(seed+fj*3.3)-.5); let dir=f*cos(ph)+o*sin(ph); let s1=s*(.34+.16*hash11(seed*1.7+fj)); let c1=cc+dir*s*.97;
    let f1=rot(f,ph-.5); let o1=vec2f(-f1.y,f1.x)*sign(f.x*o.y-f.y*o.x); d=min(d,claw(p,c1,f1,o1,s1));
    for(var m=0;m<2;m++){ let fm=f32(m); let ph2=-.4+.9*fm; let dir2=f1*cos(ph2)+o1*sin(ph2); d=min(d,claw(p,c1+dir2*s1*.97,rot(f1,(ph2-.5)*sign(f.x*o.y-f.y*o.x)),o1,s1*.4)); } }
  return d; }
// colour (rgb) and distance to the nearest drawn contour (a)
fn pr(p:vec2f)->vec4f{ let t=q.t; let w=q.a.w; let brk=q.b.w; let calm=q.b.z;
  let BLUE=vec3f(.06,.16,.35); let MID=vec3f(.2,.38,.57); let PALE=vec3f(.56,.69,.75); let WHITE=vec3f(.94,.91,.81);
  // sky: buff paper, a darker band of bokashi at the top, and grey cloud low down where the moon sits
  var c=vec3f(.83,.79,.67); c=mix(c,vec3f(.36,.39,.42),smoothstep(.5,1.02,p.y)); c=mix(c,vec3f(.47,.48,.47),smoothstep(.5,.0,p.y+.42)*.85*smoothstep(-.6,-.35,p.y));
  var line=1e3;
  let M=vec2f(MOONX,-.29); let md=length(p-M)-.036; c=mix(c,vec3f(.98,.95,.8),smoothstep(.003,-.003,md)); line=min(line,abs(md)*1.6);
  // the great wave
  let rotb=.95*brk; let R=(.35+1.3*w)*(1.-.1*brk); let C=vec2f(-1.3,-1.2+.35*w-1.05*pow(brk,1.5)); let d=p-C; let rr=length(d); var a=atan2(d.y,d.x); if(a<-1.5708){ a+=6.2832; } a+=rotb;      // breaking, the whole wave tips forward and goes down
  let aEnd=mix(2.2,.45,smoothstep(.25,1.,w)); let aSolid=1.95;
  let Ro=R*(1.+.03*sin(a*5.+t*.4)+.05*smoothstep(.6,1.7,a)*smoothstep(2.6,1.7,a));
  let k=smoothstep(aEnd,aSolid,a); let Ri=R*mix(.8,.34,pow(k,1.3))*(1.-smoothstep(aSolid-.4,aSolid+.1,a))*(1.-.4*brk);
  var arm=max(rr-Ro,Ri-rr); let capc=C+(Ro+Ri)*.5*vec2f(cos(aEnd-rotb),sin(aEnd-rotb)); let cap=length(p-capc)-(Ro-Ri)*.5;
  if(a<aEnd || a>4.6){ arm=select(1e3,cap,a<aEnd && a>aEnd-1.2); } else { arm=min(arm,cap); }
  let near=smoothstep(aEnd+2.2,aEnd+.1,a);
  if(arm<0. && w>.02){ let tt=clamp((rr-Ri)/max(Ro-Ri,1e-3),0.,1.);
    // the face: bands of deep and lighter blue that follow the curl, darkest under the lip
    var bc=mix(BLUE*.72,BLUE,smoothstep(0.,.3,tt)); let st=sin(rr/R*30.-a*2.4+1.2*sin(a*3.)+.8*fbm(p*3.)); bc=mix(bc,MID,smoothstep(.15,.3,st)*smoothstep(.08,.3,tt)); bc=mix(bc,PALE,smoothstep(.9,.96,st)*smoothstep(.35,.7,tt));
    // foam trailing down the face from the crest in branching fingers
    let vein=sin(a*24.+7.*fbm(p*2.6)+3.*sin(rr/R*8.))+2.6*tt-2.45; let vz=smoothstep(.0,.08,vein)*smoothstep(.55,.8,tt)*(1.-.5*k);
    // the crest and the underside of the lip are foam: paper left bare, with a ragged inner edge
    let crest=tt-(1.-(.07+.24*near+.3*brk)*(.72+.28*sin(a*27.+2.*sin(a*7.)))); let under=(.04+.22*near*near)*(.7+.3*sin(a*21.+1.))-tt;
    let foam=crest>0. || (under>0. && a<aEnd+1.1);
    bc=mix(bc,WHITE,vz); if(foam){ bc=WHITE; }
    c=bc; line=min(line,abs(arm)*.75); if(!foam){ line=min(line,min(abs(crest),abs(under)+step(aEnd+1.1,a))*R*.6); line=min(line,(abs(st-.22)*.03+.006)*(1.+2.*vz)); } }
  // the claws: along the falling crest, growing toward the lip, and hanging inside the curl
  if(w>.05){ let da=.2; let k0=floor(a/da);
    for(var i=-1;i<=1;i++){ let kk=k0+f32(i); let ac=(kk+.5+.3*(hash11(kk*5.1)-.5))*da; if(ac<aEnd-.1 || ac>aEnd+2.0){ continue; } let nr=smoothstep(aEnd+2.0,aEnd+.1,ac); let er=vec2f(cos(ac-rotb),sin(ac-rotb)); let fw=vec2f(er.y,-er.x);
      let Rc=R*(1.+.03*sin(ac*5.+t*.4)+.05*smoothstep(.6,1.7,ac)*smoothstep(2.6,1.7,ac)); let s1=R*(.035+.085*nr)*(.6+.8*hash11(kk*3.7))*(1.+.5*brk);
      let c1=clawTree(p,C+er*(Rc+s1*.15),fw,er,s1,kk); if(c1<0.){ c=WHITE; } line=min(line,abs(c1));
      if(ac<aEnd+1.0){ let Ric=R*mix(.8,.34,pow(smoothstep(aEnd,aSolid,ac),1.3))*(1.-.4*brk); let s2=R*(.03+.085*nr*nr)*(.6+.8*hash11(kk*9.1));
        let c2=clawTree(p,C+er*(Ric-s2*.15),fw,-er,s2,kk+40.); if(c2<0.){ c=WHITE; } line=min(line,abs(c2)); } }
    // drops flung off the lip like snow: bare paper in two sizes
    let tip=C+Ro*vec2f(cos(aEnd-rotb),sin(aEnd-rotb)); let dt=length((p-tip-vec2f(.12,.1)*R)*vec2f(1.,1.15))/R;
    for(var g=0;g<2;g++){ let sg=mix(.06,.034,f32(g)); let sc=floor(p/sg+f32(g)*7.); let sh=hash22(sc+7.+f32(g)*3.); let sd=length(p-(sc-f32(g)*7.+.2+.6*sh)*sg)-sg*(.1+.16*sh.x);
      let dens=smoothstep(.5+.3*brk,.06,dt)*smoothstep(.45,1.,w)*(.75+.25*brk); if(sd<0. && sh.y<dens && arm>.01){ c=WHITE; line=min(line,abs(sd)*1.4); } } }
  // the sea, low in the picture: bands, small caps, and after the break a lace of foam
  let sy=seaY(p.x); if(p.y<sy){ let dp=sy-p.y; line=1e3; var sc2=mix(BLUE,BLUE*.72,smoothstep(0.,.5,dp));
    let band=sin((dp-.03*sin(p.x*4.3+t*.5)-.045*fbm(p*vec2f(1.6,5.)+vec2f(t*.05,0.)))*(42.+10.*sin(p.x*1.7))+sin(p.x*2.3)*2.+3.*fbm(p*2.2));
    sc2=mix(sc2,MID,smoothstep(.5,.66,band)*smoothstep(.5,.02,dp)); sc2=mix(sc2,PALE,smoothstep(.9,.96,band)*smoothstep(.3,.02,dp));
    let lace=.15*smoothstep(.45,.95,brk)*(1.-calm)*smoothstep(1.3,.6,abs(p.x+.45))*(.55+.45*sin(p.x*17.+3.*sin(p.x*5.+t)));
    let capd=dp-max((.008+.03*w)*abs(sin(p.x*29.+sin(p.x*9.)*2.))*smoothstep(-.44,-.36,sy),lace);
    sc2=mix(sc2,WHITE,smoothstep(.003,.0,capd)); line=min(line,abs(capd));
    // in the calm, the moon laid on the water in short gold strokes
    let mr=exp(-(p.x-M.x)*(p.x-M.x)/(.003+.05*dp))*smoothstep(.45,.02,dp)*step(.2,sin(dp*110.+sin(p.x*30.)*1.5)); sc2=mix(sc2,vec3f(.98,.84,.42),mr*calm*.92);
    c=sc2; line=min(line,abs(dp)*.8); line=min(line,abs(band-.58)*.03+.03*smoothstep(.02,.3,dp)); }
  return vec4f(c,line); }
fn printAt(p:vec2f)->vec3f{ let off=vec2f(.0035,-.0025); let a=pr(p+off); let b=pr(p);           // the colour blocks sit a hair off the key block
  var c=a.rgb; let lw=.0036*(.55+.9*vnoise(p*19.))*(1.+.5*vnoise(p*3.)); c=mix(c,vec3f(.04,.08,.2),smoothstep(lw,lw*.3,b.a));
  // paper: long fibres, tooth, and the grain of the block where the ink sits thin
  let fib=vnoise(vec2f(p.x*9.+3.*vnoise(p*2.),p.y*260.))*vnoise(p*vec2f(300.,14.)); c*=.93+.1*fib+.05*(vnoise(p*120.)-.5);
  c=mix(c,vec3f(.86,.82,.7),.07*smoothstep(.45,.8,vnoise(p*vec2f(6.,90.))));
  return c; }

// ───────── the Rhône at night ─────────
fn ground(p:vec2f)->vec3f{ let H=hz(); let top=H+swellV(p.x)*smoothstep(.12,0.,H-p.y+swellV(p.x)); var c:vec3f;
  if(p.y>H){ c=mix(vec3f(.1,.34,.42),vec3f(.035,.1,.33),smoothstep(0.,.75,p.y-H)); let bank=H+.03+.03*vnoise(vec2f(p.x*8.,1.))+.03*step(.62,vnoise(vec2f(floor(p.x*13.),3.))); if(p.y<bank){ c=mix(c,vec3f(.03,.05,.14),q.b.y); } }
  else { let d=H-p.y; c=mix(vec3f(.07,.25,.43),vec3f(.03,.09,.31),smoothstep(0.,.9,d)); c+=vec3f(0.,.05,.03)*sin(p.y*40.+vnoise(p*vec2f(3.,20.))*6.)*.5; }
  if(p.y<top+.0 && p.y>H){ c=vec3f(.06,.2,.4); }
  return c; }
// which way the brush goes: one smooth flow across the sky, wavy horizontals on the water; toward the end two slow vortices take hold of the sky
fn flowAt(p:vec2f)->f32{ let H=hz(); let h=q.a.z;
  if(p.y<H+swellV(p.x)){ let e=.02; let sl=atan((seaY(p.x+e)-seaY(p.x-e))/(2.*e)); let sv=atan((swellV(p.x+e)-swellV(p.x-e))/(2.*e))*smoothstep(.5,0.,H-p.y); return mix(.09*sin(p.x*5.+p.y*18.+q.t*.5)+sv,sl*smoothstep(.6,0.,-.42-p.y+.1),h); }
  var th=.2*sin(p.x*1.15+.5)+.13*sin(p.y*3.+p.x*.7);
  let v1=p-vec2f(-.55,H+.52); let v2=p-vec2f(.95,H+.62); th=mix(th,atan2(v1.x,-v1.y),q.a.y*exp(-dot(v1,v1)*3.)); th=mix(th,atan2(-v2.x,v2.y),q.a.y*exp(-dot(v2,v2)*4.));
  return th*(1.-h); }
fn oil(p:vec2f)->vec3f{ let h=q.a.z; let g=.05; var best=-1.; var bc=p; var bv=vec3f(0.,0.,.5); var cov=0.;
  for(var layer=0;layer<2;layer++){ let off=f32(layer)*17.3; let gg=g*(1.+.3*f32(layer)); let cell=floor(p/gg+off);
    for(var j=-1;j<=1;j++){ for(var i=-2;i<=2;i++){ let id=cell+vec2f(f32(i),f32(j)); let hh=hash22(id+off*1.7); let c0=(id-off+vec2f(.5+.5*(id.y-2.*floor(id.y*.5)),.5)+(hh-.5)*vec2f(.5,.4))*gg;
      let th=flowAt(c0)+(hh.x-.5)*.2*(1.-h); let dir=vec2f(cos(th),sin(th)); let d=p-c0; let uu=dot(d,dir); let vv=dot(d,vec2f(-dir.y,dir.x));
      let Ls=min(gg*(1.2+.6*hh.y)*(1.+1.6*h),gg*2.45); let Ws=gg*(.25+.1*hh.x)*(1.-.62*h); let m=max(abs(uu)/Ls,abs(vv)/Ws)+(vnoise(vec2f(vv/Ws*3.+hh.x*9.,uu/Ls*2.+hh.y*5.))-.5)*.34*(1.-.7*h);
      if(m<1.){ let pri=hash21(id+off+5.3); if(pri>best){ best=pri; bc=c0; bv=vec3f(vv/Ws,uu/Ls,hh.x); cov=1.; } } } } }
  let at=mix(p,bc,cov); var col=ground(at);
  // each stroke is loaded a little differently; now and then with another colour off the palette
  col*=.78+.44*hash11(bv.z*91.+at.x*3.); col=mix(col,col.zxy*vec3f(.5,1.25,.9)+vec3f(.0,.05,.04),step(.84,hash11(bv.z*57.+at.y*7.))*.5);
  if(h>.001){ col=mix(col,pr(at).rgb,smoothstep(0.,.75,h)); }
  let br=vnoise(vec2f(bv.x*5.+bv.z*40.,bv.y*1.3+bv.z*13.)); let rel=1.-.75*h;
  col*=1.+rel*(.26*(br-.5)-.24*bv.x*cov); col+=vec3f(.07,.07,.05)*rel*smoothstep(-.35,-.85,bv.x)*cov;        // furrows; the lit shoulder of each ridge
  col=mix(col*mix(.72,1.,h),col,cov);
  return col; }
// the things he draws stroke by stroke: stars ringed with dashes, lamps, and their broken columns on the water
fn dashes(p:vec2f, c0:vec3f)->vec3f{ var c=c0; let H=hz(); let t=q.t; let arr=q.b.y; let fade=1.-smoothstep(.15,.8,q.a.z);
  for(var i=0;i<NS;i++){ let s=starAt(i); let dd=p-s.xy; let rho=length(dd); let dr=.021*s.z; if(rho>dr*6.5){ continue; } let keep=select(fade,1.,i==0)*arr;
    let ph=atan2(dd.y,dd.x)+t*.12*select(-1.,1.,i%2==0)*(1.+2.*q.a.y); let kf=rho/dr; let kr=floor(kf+.5);
    if(kr<1.){ c=mix(c,vec3f(1.,.95,.62)*(1.+.2*dd.y/dr),keep); continue; }
    let n=5.+4.*kr; let u=fract(ph/6.2832*n+hash11(kr*3.+f32(i))); let rl=kf-kr;
    if(u<.64 && abs(rl)<.33){ var rc=vec3f(1.,.98,.8); if(kr>1.5){ rc=vec3f(.99,.86,.42); } if(kr>2.5){ rc=vec3f(.74,.87,.62); } if(kr>3.5){ rc=vec3f(.45,.72,.64); } if(kr>4.5){ rc=vec3f(.25,.52,.58); }
      rc*=(1.+.5*rl)*(.9+.2*vnoise(vec2f(u*9.,kr+f32(i)))); c=mix(c,rc,keep*smoothstep(6.3,4.5,kf)*select(fade,1.,kr<4. || i!=0)); } }
  for(var i=0;i<9;i++){ let fi=f32(i); let lx=lampX(i); let on=select(arr,1.,i==4)*fade;
    let ld=p-vec2f(lx,H+.022); let lr=length(ld*vec2f(1.,1.2)); if(lr<.016){ c=mix(c,vec3f(1.,.8,.3)*(1.+8.*ld.y),on*select(arr,1.,true)); }
    else if(lr<.05 && p.y>H){ let u=fract(atan2(ld.y,ld.x)/6.2832*7.+fi*.3); if(u<.55 && abs(lr-.032)<.008){ c=mix(c,vec3f(.98,.6,.16),on); } }
    let d=H-p.y; if(d>0.){ let rh=.021; let row=floor(d/rh); let yy=fract(d/rh); let hr=hash22(vec2f(row,fi*7.3));
      let cx=lx+(.024*sin(row*1.7+t*2.1+fi)+.012*sin(row*.6-t*1.3+fi*2.))*(1.+2.6*d); let hw=.012+.034*d+.02*hr.x; let len=select(.5+.35*hash11(fi*3.3),1.4,i==4);
      if(abs(p.x-cx)<hw && yy>.14 && yy<.8 && d<len*(.75+.25*hr.y) && hr.y>.2){ var rc=vec3f(1.,.84,.3); if(hr.x>.55){ rc=vec3f(.96,.56,.12); } if(hr.x<.14){ rc=vec3f(1.,.95,.72); }
        rc*=1.25-.6*yy; rc*=.9+.2*vnoise(vec2f(p.x*90.,row)); c=mix(c,rc,on*smoothstep(len,len*.5,d)); } } }
  return c; }

@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let p=(fc.xy-.5*q.res)/(.5*q.res.y)*vec2f(1.,-1.); let h=q.a.z;
  var c:vec3f;
  if(h<.999){ c=dashes(p,oil(p)); c*=.965+.035*sin(p.x*560.)*sin(p.y*560.); }      // canvas weave
  if(h>.55){ let pc=printAt(p); c=select(mix(c,pc,smoothstep(.55,1.,h)),pc,h>=.999); }
  return vec4f(pow(max(c,vec3f(0.)),vec3f(2.2)),q.w); }
`;
