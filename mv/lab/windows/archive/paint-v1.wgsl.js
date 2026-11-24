// Two painted pictures of the same water, one growing out of the other.
//   Van Gogh (in the manner of Starry Night Over the Rhône): the scene is a function of position; the picture is built from thick brush strokes,
//   each one a dab laid along a flow field and loaded with the scene's colour at its centre. The strokes coarsen and the sky's flow begins to swirl.
//   Hokusai: a woodblock print drawn directly: flat Prussian blues and paper white, a keyline, bokashi gradients, a great wave with claws of foam,
//   a very small moon under it; then the wave subsides into a swell.
export const PAINT = /* wgsl */`
struct Q { res:vec2f, t:f32, w:f32,
  a:vec4f,     // x stroke coarseness, y swirl, z Hokusai (0 oil … 1 print), w the wave (0 swell … 1 reared)
  b:vec4f }    // x where the gold reflection stands (x), y how much of the scene has arrived (0 only the gold reflection … 1 all), z moonlit swell, w unused
@group(0)@binding(0) var<uniform> q:Q;
const HZ=.06;

// ───────── the Rhône at night, as a function ─────────
fn lampX(i:i32)->f32{ return select((f32(i)-4.)*.4+.13*(hash11(f32(i)*7.3)-.5),q.b.x,i==4); }
fn rhone(p:vec2f)->vec3f{ let t=q.t; var c:vec3f; let arr=q.b.y;
  if(p.y>HZ){ let y=p.y-HZ; c=mix(vec3f(.09,.3,.37),vec3f(.03,.09,.27),smoothstep(0.,.8,y)); c+=vec3f(.02,.06,.04)*(vnoise(p*3.)-.4);
    for(var i=0;i<13;i++){ let fi=f32(i); let sp=vec2f((hash11(fi*3.1+1.)*2.-1.)*1.7,HZ+.22+.68*hash11(fi*5.7+2.)); let d=length(p-sp); let big=.6+.8*hash11(fi+9.);
      c=mix(c,vec3f(.62,.8,.62),exp(-d*d*70./big)*.8*arr); c=mix(c,vec3f(1.,.93,.55),smoothstep(.034*big,.014*big,d)*arr); }
    let bank=HZ+.03+.035*vnoise(vec2f(p.x*8.,1.))+.035*step(.62,vnoise(vec2f(floor(p.x*13.),3.)));
    if(p.y<bank){ c=mix(c,vec3f(.03,.05,.15),arr); }
    for(var i=0;i<9;i++){ let ld=length((p-vec2f(lampX(i),HZ+.022))*vec2f(1.,1.25)); let on=select(arr,1.,i==4); c=mix(c,vec3f(1.,.72,.2),clamp(exp(-ld*ld*380.)*.9+smoothstep(.022,.01,ld),0.,1.)*on); } }
  else { let d=HZ-p.y; c=mix(vec3f(.06,.22,.38),vec3f(.03,.09,.3),smoothstep(0.,.95,d)); c+=vec3f(0.,.07,.05)*sin(p.y*58.+vnoise(p*vec2f(3.,22.))*6.)*.5;
    for(var i=0;i<9;i++){ let fi=f32(i); let wob=.022*sin(d*36.+t*2.1+fi)+.012*sin(d*88.-t*3.1+fi*2.); let x=p.x-lampX(i)-wob*(1.+2.5*d); let wd=.02+.035*d;
      let s=exp(-x*x/(wd*wd)); let len=select(.6+.35*hash11(fi*3.3),1.3,i==4); let on=select(arr,1.,i==4);
      let f=s*smoothstep(len,0.,d)*(.72+.28*sin(d*120.+fi*2.+t*1.6)); c=mix(c,mix(vec3f(.95,.52,.1),vec3f(1.,.88,.38),s*s),clamp(f*1.7,0.,1.)*on); } }
  return c; }
// which way the brush goes
fn flowAt(p:vec2f)->f32{ if(p.y<HZ){ return .13*sin(p.x*3.+p.y*15.); }
  let e=.01; let n0=fbm(p*1.25+vec2f(q.t*.03,0.)); let gx=fbm(p*1.25+vec2f(e+q.t*.03,0.))-n0; let gy=fbm(p*1.25+vec2f(q.t*.03,e))-n0;
  var th=mix(.35+.45*sin(p.x*1.4+p.y*2.3),atan2(-gx,gy),q.a.y);
  for(var i=0;i<13;i++){ let fi=f32(i); let sp=vec2f((hash11(fi*3.1+1.)*2.-1.)*1.7,HZ+.22+.68*hash11(fi*5.7+2.)); let dd=p-sp; let k=exp(-dot(dd,dd)*28.); if(k>.05){ th=mix(th,atan2(dd.x,-dd.y),k); } }
  return th; }
fn oil(p:vec2f)->vec3f{ let cs=mix(.026,.085,q.a.x); var best=-1.; var bc=p; var bv=vec3f(0.,0.,.5); var cov=0.;
  for(var layer=0;layer<2;layer++){ let off=f32(layer)*17.3; let g=cs*(1.+.4*f32(layer)); let cell=floor(p/g+off);
    for(var j=-1;j<=1;j++){ for(var i=-1;i<=1;i++){ let id=cell+vec2f(f32(i),f32(j)); let h=hash22(id+off*1.7); let c0=(id-off+.5+(h-.5)*.9)*g;
      let th=flowAt(c0)+(h.x-.5)*.45; let dir=vec2f(cos(th),sin(th)); let d=p-c0-dir*(fract(q.t*.05+h.y)-.5)*g*.5; let uu=dot(d,dir); let vv=dot(d,vec2f(-dir.y,dir.x));
      let Ls=g*(.8+.55*h.y); let Ws=g*(.2+.13*h.x); let m=max(abs(uu)/Ls,abs(vv)/Ws)+(vnoise(vec2f(vv/Ws*3.+h.x*9.,uu/Ls*2.+h.y*5.))-.5)*.4;
      if(m<1.){ let pri=hash21(id+off+5.3); if(pri>best){ best=pri; bc=c0; bv=vec3f(vv/Ws,uu/Ls,h.x); cov=1.; } } } } }
  var col=rhone(mix(p,bc,cov));
  let br=vnoise(vec2f(bv.x*5.+bv.z*40.,bv.y*1.4+bv.z*13.));
  col*=.84+.3*br; col*=1.-.22*bv.x*cov;                     // bristle furrows, and the ridge of paint catching the light on one side
  col+=vec3f(.05,.05,.03)*smoothstep(.55,.9,br)*smoothstep(1.,.3,abs(bv.x))*cov;
  col=mix(col*.8,col,cov);
  // canvas weave under it
  col*=.96+.04*sin(p.x*520.)*sin(p.y*520.);
  return col; }

// ───────── the print ─────────
fn seaY(x:f32)->f32{ let t=q.t; let w=q.a.w; return -.1+.045*sin(x*2.7+t*.55)+.026*sin(x*6.1-t*.8+1.)+.012*sin(x*13.+t*1.1)+.3*w*exp(-(x-1.0)*(x-1.0)/.16)+.1*w*exp(-(x+1.5)*(x+1.5)/.2); }
fn claw(p:vec2f, cc:vec2f, fwd:vec2f, outv:vec2f, s:f32)->f32{ let d=p-cc; let l=vec2f(dot(d,fwd),dot(d,outv)); return max(length(l-vec2f(0.,.05*s))-s,-(length(l-vec2f(-.62*s,-.5*s))-s*1.02)); }
fn print(p:vec2f)->vec3f{ let t=q.t; let w=q.a.w; let calm=q.b.z;
  let BLUE=vec3f(.07,.17,.36); let MID=vec3f(.2,.38,.56); let PALE=vec3f(.55,.68,.74); let WHITE=vec3f(.93,.9,.8); let LINE=vec3f(.03,.07,.2);
  // sky: bokashi, darkest at the top, a paler band above the water
  var c=mix(vec3f(.3,.4,.47),vec3f(.045,.09,.2),smoothstep(-.05,.75,p.y)); c=mix(c,vec3f(.42,.5,.52),.5*exp(-max(p.y-HZ,0.)*9.));
  var line=1e3;
  // the moon: very small, under the wave
  let M=vec2f(.42,.17); let md=length(p-M)-.04; c=mix(c,vec3f(.55,.62,.6),.5*exp(-max(md,0.)*14.)); c=mix(c,vec3f(.97,.9,.66),smoothstep(.003,-.003,md)); line=min(line,abs(md));
  // the great wave: an arm that rises on the left and curls over to the right
  let C=vec2f(-.56,-.62+.5*w); let R=.2+.92*w; let d=p-C; let rr=length(d); var a=atan2(d.y,d.x); if(a<-1.5708){ a+=6.2832; }
  let aEnd=2.9-2.42*smoothstep(0.,1.,w);            // the lip: far over to the right when the wave is fully reared
  let Ro=R*(1.+.035*sin(a*5.+t*.4)); let k=smoothstep(aEnd,aEnd+2.0,a); let Ri=R*mix(.8,.27,k);
  let inA=a>aEnd && a<3.9; var arm=max(rr-Ro,Ri-rr); let cap=length(d-(Ro+Ri)*.5*vec2f(cos(aEnd),sin(aEnd)))-(Ro-Ri)*.5; if(!inA){ arm=select(1e3,cap,a<=aEnd); } else { arm=min(arm,cap); }
  if(arm<0. && w>.02){ let tt=clamp((rr-Ri)/max(Ro-Ri,1e-3),0.,1.);
    var bc=mix(BLUE*.75,BLUE,smoothstep(0.,.35,tt)); let st=sin(tt*17.+sin(a*4.)*1.2+a*2.); bc=mix(bc,MID,smoothstep(.2,.4,st)*smoothstep(.12,.4,tt)); bc=mix(bc,PALE,smoothstep(.86,.95,st)*smoothstep(.4,.8,tt));
    // foam running down the face from the crest
    let vein=sin(a*46.+3.*sin(tt*7.))+1.6*tt-1.25; bc=mix(bc,WHITE,smoothstep(.0,.12,vein)*smoothstep(.45,.75,tt)*(1.-k*.6));
    // the crest and the underside of the lip are foam: paper left bare
    let nearL=smoothstep(aEnd+2.4,aEnd+.15,a); let crest=tt-(1.-(.05+.2*nearL)*(.75+.25*sin(a*31.))); let under=(.03+.2*nearL*nearL)*(.7+.3*sin(a*23.+1.))-tt;
    if(crest>0. || (under>0. && a<aEnd+1.2)){ bc=WHITE; }
    c=bc; line=min(line,abs(arm)); line=min(line,min(abs(crest),abs(under)+step(aEnd+1.2,a))*.9); line=min(line,abs(st-.3)*.012+.004*step(tt,.12)); }
  // claws of foam: along the crest near the lip, and hanging from under it
  if(w>.02){ let da=.105; let k0=floor(a/da);
    for(var i=-1;i<=1;i++){ let ac=(k0+f32(i)+.5)*da; if(ac<aEnd-.05 || ac>aEnd+2.3){ continue; } let near=smoothstep(aEnd+2.3,aEnd+.2,ac); let er=vec2f(cos(ac),sin(ac)); let fw=vec2f(er.y,-er.x);
      let Rc=R*(1.+.035*sin(ac*5.+t*.4)); let s1=R*(.028+.075*near)*(.7+.6*hash11(floor(ac/da)*3.7));
      let c1=claw(p,C+er*(Rc+s1*.1),fw,er,s1); if(c1<0.){ c=WHITE; } line=min(line,abs(c1));
      let Ric=R*mix(.8,.27,smoothstep(aEnd,aEnd+2.0,ac)); let s2=R*(.02+.085*near*near)*(.7+.6*hash11(floor(ac/da)*9.1));
      let c2=claw(p,C+er*(Ric-s2*.1),fw,-er,s2); if(c2<0. && ac<aEnd+1.3){ c=WHITE; line=min(line,abs(c2)); } }
    // spray: paper showing through as dots, thrown ahead of the lip
    let tip=C+Ro*vec2f(cos(aEnd),sin(aEnd)); let sg=.05; let sc=floor(p/sg); let sh=hash22(sc+7.); let sd=length(p-(sc+.2+.6*sh)*sg)-.006-.008*sh.x;
    let dens=smoothstep(.75*R,.1*R,length(p-tip-vec2f(.1,-.05)*R))*smoothstep(.3,1.,w); if(sd<0. && sh.y<dens && arm>0.){ c=WHITE; } }
  // the sea, its lesser waves, their caps
  let sy=seaY(p.x); if(p.y<sy){ let dp=sy-p.y; line=1e3; var sc2=mix(BLUE,BLUE*.7,smoothstep(0.,.9,dp));
    let band=sin((dp-.035*sin(p.x*4.3+t*.5)-.05*fbm(p*vec2f(1.6,5.)+vec2f(t*.05,0.)))*(34.+10.*sin(p.x*1.7))+sin(p.x*2.3)*2.+3.*fbm(p*2.2)); sc2=mix(sc2,MID,smoothstep(.55,.7,band)*smoothstep(.8,.02,dp)); sc2=mix(sc2,PALE,smoothstep(.92,.97,band)*smoothstep(.5,.02,dp));
    // caps on the crests; in the calm, the moon laid on the water in short gold strokes
    let capz=smoothstep(.004,.0,dp-(.01+.03*w)*abs(sin(p.x*29.+sin(p.x*9.)*2.))*smoothstep(-.02,.06,sy+.1)); sc2=mix(sc2,WHITE,capz); line=min(line,abs(dp-(.01+.03*w)*abs(sin(p.x*29.+sin(p.x*9.)*2.))*smoothstep(-.02,.06,sy+.1)));
    let mr=exp(-(p.x-M.x)*(p.x-M.x)/(.004+.07*dp))*smoothstep(.75,.03,dp)*step(.25,sin(dp*95.+sin(p.x*30.)*1.5)); sc2=mix(sc2,vec3f(.97,.86,.5),mr*calm*.9);
    c=sc2; line=min(line,abs(dp)); line=min(line,abs(band-.6)*.02+.02*smoothstep(.02,.5,dp)); }
  // keyline, pressed a little unevenly
  let lw=.0042*(.7+.6*vnoise(p*23.)); c=mix(c,LINE,smoothstep(lw,lw*.35,line));
  // paper: fibres, and the grain of the block where the colour sits thin
  c*=.95+.07*vnoise(p*vec2f(240.,38.))+.04*(vnoise(p*90.)-.5); c=mix(c,c*vec3f(1.03,1.,.94),.5);
  return c; }

@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let p=(fc.xy-.5*q.res)/(.5*q.res.y)*vec2f(1.,-1.);
  var c:vec3f; let h=q.a.z;
  if(h<.999){ c=oil(p); }
  if(h>.001){ let pr=print(p);
    // the strokes close up into line: the oil thins toward flat colour and the print's drawing comes through, edges first
    let edge=smoothstep(.0,.6,h); c=select(mix(c,pr,smoothstep(.0,1.,h*1.15-.15*vnoise(p*6.))),pr,h>=.999); c=mix(c,c*(.9+.2*edge),0.); }
  return vec4f(pow(max(c,vec3f(0.)),vec3f(2.2)),q.w); }
`;
