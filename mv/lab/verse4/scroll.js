// 宋人山水长卷，绢本水墨，北宋的格局（范宽、郭熙）：
//   主峰居上中，巍然直立；峰面分成一条条竖的石柱，柱与柱之间是暗的石缝，柱面横着一层层石台，台下有阴影；雨点皴顺着石柱竖落，
//   缝里密、受光的面疏；峰顶是密密的小树和点苔；一道瀑布是留出的绢；山脚没入雾里。
//   中景是郭熙的卷云山：圆转的小山，里面一圈圈卷曲的皴线；山上蟹爪的寒树。近景是有轮廓、有披麻皴的大石，石上虬曲的松，松针一簇簇画成扇形。
//   远山淡墨，三层之间隔着雾。绢色老旧，四边更暗更暖。
// 河几乎不动：大片留白，岸边几道细水纹，水纹细看是淡金的字。松下石台上两人对弈，一个樵夫看棋（烂柯）。
// “对于回答你们太匆匆”：樵夫起身，拖着残影下山；岸上的人成了一串串频闪的连续位置，杜尚《下楼梯的裸女》那样的分面：
// 每个人是一叠半透明的赭褐色面片，叠在一起，身后有点线的运动弧；房子立起又倒下，是一层层重叠的轮廓。河与对弈的人始终不动。
// p0 = cam.x, cam.y, zoom, appear   p1 = drain (the vermilion turns to ink), rise (the woodcutter gets up), futur (the people become after-images), clock (their own time; it races)
// p2 = red (the paste running into the river)
export const SCROLL = /* wgsl */`
fn riverY(x:f32)->f32{ return -.29+.03*sin(1.2*x+.5)+.012*sin(3.1*x+1.); }
fn riverW(x:f32)->f32{ return .075+.02*sin(1.9*x+2.)+.008*sin(4.7*x); }
fn farBank(x:f32)->f32{ return riverY(x)+riverW(x)+.004*vnoise(vec2f(x*30.,1.)); }
fn nearBank(x:f32)->f32{ return riverY(x)-riverW(x)-.005*vnoise(vec2f(x*25.,4.)); }
fn nearPath(x:f32)->f32{ return nearBank(x)-.07+.008*sin(x*4.+1.); }
// one ink mark of coverage a and tone k (0 pale wash … 1 black) over the ink so far: (coverage, tone)
fn put(ink:vec2f,a:f32,k:f32)->vec2f{ let aa=sat(a); let c=ink.x+(1.-ink.x)*aa; return vec2f(c,mix(ink.y,k,aa/max(c,1e-4))); }
// raindrop strokes: short upright dabs, each a little different, the density given by the caller
fn rain(p:vec2f,dens:f32,e:f32)->f32{ var a=0.; for(var k=0;k<2;k++){ let g=vec2f(.0034,.0068)*(1.+.4*f32(k)); let q=p/g+f32(k)*vec2f(.37,.61); let id=floor(q); let f=fract(q)-.5; let h=hash22(id+f32(k)*13.);
    if(h.x<dens){ let c=(h-.5)*.45; let r=(f-c)*g; let d=length(r*vec2f(1.,.36+.14*h.y))-.00095*(.7+.8*h.y); a=max(a,(1.-smoothstep(-e,e,d))*(.45+.55*fract(h.y*7.3))); } } return a; }
fn moss(p:vec2f,dens:f32,sz:f32,e:f32)->f32{ let g=sz*3.2; let q=p/g; let id=floor(q); let f=fract(q)-.5; let h=hash22(id+7.); if(h.x>dens){ return 0.; } let d=length((f-(h-.5)*.45)*g*vec2f(1.,1.3))-sz*(.6+.7*h.y); return 1.-smoothstep(-e,e,d); }
// a dry stroke along a contour: width varies, the brush runs dry in places
fn dry(d:f32,w:f32,s:f32,e:f32)->f32{ return ln(d,w*(.6+.8*vnoise(vec2f(s*30.,1.7))),e)*smoothstep(.18,.45,vnoise(vec2f(s*90.,4.1))+.25); }
// ── the main peak (Fan Kuan): upright columns of rock, ledges across them, dense strokes in the clefts, a crown of small trees, a waterfall
// Overlapping projecting spurs: their uneven caps and joints continue down into
// washes whose weight depends on the orientation of each face.
fn cliffCap(u:f32, centre:f32, left:f32, right:f32, crown:f32)->f32{
  let x=u-centre;
  let edge=abs(x)/select(left,right,x>0.);
  return crown*(1.-smoothstep(.27,1.,edge))-.044*x;
}
fn summit(u:f32)->f32{
  let central=cliffCap(u,-.16,.84,.58,1.);
  let shoulder=cliffCap(u,.34,.36,.72,.79);
  let lower=cliffCap(u,-.71,.53,.39,.57);
  let chipped=.032*vnoise(vec2f(u*15.+20.,.25))+.012*vnoise(vec2f(u*52.,8.));
  return -.03+.53*(max(central,max(shoulder,lower))+chipped);
}
fn mainPeak(S:vec2f,e:f32,ink0:vec2f)->vec2f{
  let u=(S.x-.72)/.34;
  if(abs(u)>1.26){return ink0;}
  let top=summit(u);
  let y=S.y-top;
  if(y>.025||S.y<-.05){return ink0;}
  let h=(S.y+.03)/.53;
  let rock=vnoise(S*vec2f(19.,11.)+4.);
  let air=smoothstep(.02,.38,h+.13*(rock-.5));
  let inside=fill(y,e)*air;
  let fork=u+.33*(1.-h)+.052*sin(11.*h+u)+.05*(rock-.5);
  let front=1.-smoothstep(.035,.53,abs(fork+.16));
  let flank=smoothstep(-.86,-.48,fork)*(1.-smoothstep(-.45,-.19,fork));
  let notch=1.-smoothstep(.018,.15,abs(fork+.41));
  let chippedFace=vnoise(vec2f(fork*8.+h*1.8,h*3.+5.));
  let gully=smoothstep(.48,.79,chippedFace)*smoothstep(.09,.29,h);
  let face=sat(.22+.28*flank+.34*notch-.14*front+.26*gully+.22*(rock-.5));
  let strata=h*6.1+.86*u+1.26*(vnoise(vec2f(u*2.9+5.,h*3.+3.))-.5);
  let strataBreak=vnoise(S*vec2f(27.,32.)+vec2f(21.,1.));
  let lip=1.-smoothstep(.02,.15,abs(fract(strata)-.55));
  let shelf=lip*smoothstep(.52,.72,strataBreak)*(.38+.62*flank);
  let waterfallX=.812+.014*sin(h*3.5)-.012*smoothstep(.38,.54,h);
  let waterfall=(1.-smoothstep(.002,.005+e,abs(S.x-waterfallX)))*smoothstep(.18,.28,h)*(1.-smoothstep(.59,.65,h));
  let mask=inside*(1.-waterfall);
  var ink=put(ink0,mask*(.12+.66*face+.16*shelf),.69);
  ink=put(ink,mask*(.22+.78*face)*rain(S+vec2f(.014*h,0.),.16+.59*face+.22*shelf,e),.97);
  let spurEdge=abs(fork+.41)*.34;
  ink=put(ink,mask*dry(spurEdge,.0017,S.y+.03,e)*smoothstep(.18,.48,rock),1.);
  ink=put(ink,mask*shelf*.17,.91);
  // Rows of accumulating ink tilt into the gullies and fade onto the light face.
  let slant=.20+.32*flank-.29*front;
  let strokeCoord=vec2f(S.x+slant*S.y,S.y);
  let innerWash=smoothstep(.41,.67,vnoise(strokeCoord*vec2f(53.,12.)+13.));
  ink=put(ink,mask*innerWash*(.11+.25*gully+.12*flank),.87);
  ink=put(ink,air*dry(y,.0015,S.x,e),.91);
  let crown=smoothstep(-.052,-.005,y);
  ink=put(ink,inside*crown*moss(S,.65,.0018,e)*.8,.98);
  if(y>-.023){
    let id=floor(S.x/.015);
    let x=(id+.20+.60*hash11(id+21.))*.015;
    let treeH=.003+.012*hash11(id*7.+3.);
    let local=S-vec2f(x,summit((x-.72)/.34)-.002);
    let width=.001+.29*treeH*(1.-sat(local.y/treeH));
    let clump=fill(max(abs(local.x)-width,max(-local.y,local.y-treeH)),e);
    ink=put(ink,clump*air*(.5+.35*hash11(id)),.93);
  }
  return ink;
}
// side peaks and far ranges: same manner, lighter, fewer strokes
fn sidePeak(S:vec2f,cx:f32,w:f32,H:f32,base:f32,seed:f32,tone:f32,e:f32,ink0:vec2f)->vec2f{ var ink=ink0; let u=(S.x-cx)/w; if(abs(u)>1.){ return ink; }
  let prof=pow(sat(1.-pow(abs(u),2.4)),.5)*(1.+.06*sin(u*7.+seed))+.03*(vnoise(vec2f(S.x*30.,seed))-.5); let top=base+H*prof; let y=S.y-top; if(y>.01){ return ink; }
  let hgt=(S.y-base)/H; let mist=smoothstep(.05,.45,hgt+.2*(fbm(S*vec2f(3.,7.)+seed)-.5)); if(mist<.01){ return ink; }
  let inside=fill(y,e); let cxw=u*4.+.2*sin(S.y*6.+seed); let ed=min(fract(cxw),1.-fract(cxw)); let crown=smoothstep(-.08,0.,y);
  ink=put(ink,inside*mist*(.06+.08*crown+.06*(1.-smoothstep(0.,.25,ed)))*tone,.3);
  let backSpur=vnoise(S*vec2f(14.,6.)+seed);
  ink=put(ink,inside*mist*smoothstep(.46,.73,backSpur)*(.15+.13*crown)*tone,.64);
  ink=put(ink,inside*mist*rain(S+seed,(.05+.35*(1.-smoothstep(0.,.25,ed))+.3*crown)*tone,e)*.7*tone,.8);
  ink=put(ink,mist*dry(y,.0012,S.x+seed,e)*tone,1.); ink=put(ink,inside*moss(S+seed,.7,.001,e)*crown*mist*tone,1.);
  return ink; }
// ── the middle ground (Guo Xi): rounded hills with curling contours inside, like clouds
fn cloudHill(S:vec2f,cx:f32,w:f32,H:f32,base:f32,seed:f32,e:f32,ink0:vec2f)->vec2f{ var ink=ink0; let u=(S.x-cx)/w; if(abs(u)>1.1){ return ink; }
  let x=u+.10*(vnoise(S*17.+seed)-.5);
  let top=base+H*(.12+max(cliffCap(x,-.27,.68,.65,.86),cliffCap(x,.36,.42,.63,.55))
                  +.085*vnoise(vec2f(x*9.,seed))+.035*vnoise(vec2f(x*24.,seed)));
  let f=(top-S.y)/H;
  if(f<-.045||S.y<base-.025){return ink;}
  let inside=fill(S.y-top,e)*smoothstep(base-.022,base+.042,S.y);
  // curling strokes: the contours of the mound turned into hooks by a swirl, broken, drawn only in places
  let sw=atan2(S.y-base,S.x-cx)*2.+6.*fbm(S*7.+seed); let curl=abs(fract(f*3.2+.25*sin(sw))-.5); let dark=smoothstep(.7,.0,f)*.4+.4*smoothstep(.3,.0,curl);
  let foldShade=smoothstep(.10,.50,f)*smoothstep(-.70,.02,x+.3*f);
  ink=put(ink,inside*(.10+.19*dark+.28*foldShade),.58);
  ink=put(ink,inside*ln(curl/3.2*w,.0005,e)*smoothstep(.55,.7,vnoise(S*26.+seed))*.6*smoothstep(.1,.3,f)*smoothstep(.85,.5,f),1.);
  ink=put(ink,inside*rain(S*1.2+seed,.12+.25*smoothstep(.2,.0,curl),e)*.6,.8);
  ink=put(ink,dry(f*w*.85,.0012,S.x+seed,e)*smoothstep(base,base+.03,S.y),1.);
  ink=put(ink,inside*moss(S+seed,.4,.0011,e)*smoothstep(.12,.0,f),1.);
  return ink; }
// ── trees. Crab-claw: bare branches that divide and end in hooked twigs pointing down.
fn crabTree(S:vec2f,root:vec2f,h:f32,seed:f32,e:f32,ink0:vec2f)->vec2f{ var ink=ink0; let q=S-root; if(q.y<-.005||q.y>h*1.25||abs(q.x)>h*.8){ return ink; }
  var l=ln(q.x-.05*h*sin(q.y/h*3.+seed),.0005+.0025*h*sat(1.-q.y/h),e)*step(q.y,h*.55);
  for(var i=0;i<2;i++){ let si=select(-1.,1.,i==0); let a=vec2f(.05*h*sin(.55*3.+seed),h*.55); let b=a+vec2f(si*h*.32,h*.28);
    l=max(l,ln(sdSeg(q,a,b),.0005+.0008*h,e));
    for(var j=0;j<2;j++){ let sj=select(-1.,1.,j==0); let c=mix(a,b,.6+.4*f32(j)); let d2=c+vec2f((si*.6+sj*.5)*h*.18,h*(.12+.05*sj)); l=max(l,ln(sdSeg(q,c,d2),.0004,e));
      for(var k=0;k<3;k++){ let fk=f32(k); let g=mix(c,d2,.4+.3*fk); let tip=g+vec2f((si+sj*.5)*h*.07*(1.+.3*hash11(fk+seed)),h*.05); let hook=tip+vec2f(si*h*.02,-h*.035);
        l=max(l,ln(min(sdSeg(q,g,tip),sdSeg(q,tip,hook)),.00028,e)); } } }
  return put(ink,l,1.); }
// a gnarled pine: a twisting trunk with bark scales; branches out and down; each needle cluster a fan of single strokes
fn pine(S:vec2f,root:vec2f,h:f32,lean:f32,seed:f32,e:f32,ink0:vec2f)->vec2f{ var ink=ink0; let q=S-root; if(q.y<-.01||q.y>h*1.2||abs(q.x-lean*h*.4)>h*.8){ return ink; }
  let s=sat(q.y/h); let tx=lean*h*s*s+.05*h*sin(s*5.+seed); let w=h*(.04-.025*s)+.0006; let d=abs(q.x-tx)-w;
  ink=put(ink,fill(d,e)*.3*step(q.y,h),.5); ink=put(ink,ln(d,.0004+.0003*(1.-s),e)*step(q.y,h*.96),1.);
  let sc=vec2f((q.x-tx)/w,q.y/(w*1.1)); let arc=length(vec2f(sc.x*.7,(fract(sc.y+floor(sc.x*.5)*.5)-.5)*1.4)); ink=put(ink,fill(d,e)*ln(arc-.42,.07,.06)*step(.6,hash11(floor(sc.y)+seed))*.65,1.);
  for(var i=0;i<5;i++){ let fi=f32(i); let by=h*(.45+.12*fi); let side=select(-1.,1.,(i+i32(seed))%2==0); let ss=sat(by/h); let bx=lean*h*ss*ss+.05*h*sin(ss*5.+seed);
    let a=vec2f(bx,by); let L=h*(.32-.04*fi)*(.75+.5*hash11(fi+seed)); let mid=a+vec2f(side*L*.5,h*.03); let b=a+vec2f(side*L,-h*(.02+.04*hash11(fi*2.+seed)));
    ink=put(ink,ln(min(sdSeg(q,a,mid),sdSeg(q,mid,b)),.0004*(1.-fi*.08)+.0002,e),1.);
    for(var c=0;c<3;c++){ let cp=mix(mid,b,f32(c)*.5)+vec2f(0.,h*.012); let R=h*(.085-.006*fi); let cq=q-cp; let rr=length(cq);
      if(rr<R*1.05&&cq.y>-R*.25){
        let plume=fill(length(cq*vec2f(.93,1.62))-R*.9,e)*smoothstep(-.22,.17,cq.y/R);
        ink=put(ink,plume*(.27+.3*fbm(q*90.+fi)),.94);
        let an=atan2(cq.y,cq.x); let n=14.; let ai=round(an/PI*n)/n*PI; let dl=rr*abs(sin(an-ai)); ink=put(ink,ln(dl,.00028,e)*step(R*.18,rr)*step(rr,R*(.85+.15*hash11(ai*9.+fi+seed))),1.);
        ink=put(ink,fill(rr-R*.22,e)*.9,1.); } } }
  return ink; }
// a boulder: a few rounded masses with a strong outline, hemp-fibre strokes following its shape, dark underneath, moss on top
fn boulder(S:vec2f,c:vec2f,r:f32,seed:f32,e:f32,ink0:vec2f)->vec2f{ var ink=ink0; let q=S-c; if(length(q)>r*2.2){ return ink; }
  var d=length(q*vec2f(1.,1.25))-r; d=smin(d,length((q-vec2f(r*.9,-r*.2))*vec2f(1.,1.3))-r*.7,r*.3); d=smin(d,length((q-vec2f(-r*.8,-r*.3))*vec2f(1.,1.4))-r*.6,r*.3);
  d=max(d,-(q.y+r*.55)); d+=r*.06*(vnoise(q/r*3.+seed)-.5); if(d>e*3.){ return ink; }
  let inside=fill(d,e); let dep=sat(-d/r); let sh=smoothstep(-.2*r,.4*r,-q.x*.6-q.y);                      // light from the upper right
  ink=put(ink,inside*(.1+.25*sh+.15*smoothstep(-.2,-.5,q.y/r)),.55);
  let fib=abs(fract(d/r*7.+.3*vnoise(q/r*5.+seed))-.5); ink=put(ink,inside*ln(fib/7.*r,.0005,e)*smoothstep(.35,.6,vnoise(q/r*vec2f(8.,3.)+seed))*(.4+.6*sh),1.);
  ink=put(ink,dry(d,.0018,atan2(q.y,q.x)*r*3.+seed,e),1.); ink=put(ink,inside*moss(S+seed,.55,.0013,e)*smoothstep(-.03,-.005,d)*step(-.1*r,q.y),1.);
  return ink; }
// little people in fine line: standing (k 0), seated facing right (k 1), the woodcutter with axe and load (k 2). Returns (line, white of the robe)
fn person(q:vec2f,k:f32,e:f32)->vec2f{ let seat=k==1.;
  let hc=select(vec2f(0.,.86),vec2f(.02,.6),seat); let head=length((q-hc)*vec2f(1.1,1.))-.085;
  var body:f32; if(seat){ body=min(max(length((q-vec2f(0.,.2))*vec2f(1.,1.35))-.34,-q.y),sdBox(q-vec2f(.0,.35),vec2f(.12,.16))-.04); }
  else { let yy=sat(q.y/.76); body=sdBox(q-vec2f(0.,.39),vec2f(.08+.12*(1.-yy),.37))-.025; body=min(body,sdSeg(q,vec2f(.05,.66),vec2f(.16,.42))-.05); }
  let d=min(head,body); var l=ln(d,.022,e); l=max(l,fill(length(q-hc-vec2f(-.01,.1))-.045,e)); l=max(l,ln(sdSeg(q,hc+vec2f(-.05,-.11),hc+vec2f(.02,-.2)),.015,e)*fill(d,e));
  l=max(l,ln(sdSeg(q,select(vec2f(-.1,.55),vec2f(-.15,.25),seat),select(vec2f(.08,.1),vec2f(.15,.05),seat)),.012,e)*fill(d,e)*.7);                  // a fold of the robe
  if(k==2.){ l=max(l,ln(sdSeg(q,vec2f(.24,.0),vec2f(.18,.62)),.02,e)); l=max(l,fill(sdBox(q-vec2f(.21,.64),vec2f(.07,.035)),e));
    l=max(l,ln(sdSeg(q,vec2f(-.1,.78),vec2f(-.36,.42)),.02,e)); l=max(l,fill(length((q-vec2f(-.4,.4))*vec2f(1.,.65))-.11,e)*.8); }
  return vec2f(l,fill(d,e)); }
// ── Duchamp: a body at stride phase ph (work 0 walking … 1 bending to lift), as a stack of faceted planes
struct Pose{ hip:vec2f, sh:vec2f, hd:vec2f, k1:vec2f, a1:vec2f, k2:vec2f, a2:vec2f, e1:vec2f, w1:vec2f, e2:vec2f, w2:vec2f }
fn walk(ph:f32,lean:f32,work:f32)->Pose{ var P:Pose; let s=sin(ph*TAU); let c=cos(ph*TAU); let bob=.025*abs(c); let bend=work*(.5+.5*sin(ph*TAU));
  P.hip=vec2f(0.,.5+bob-.12*bend); P.sh=P.hip+vec2f(.1*lean+.25*bend,.3-.1*bend); P.hd=P.sh+vec2f(.04*lean+.12*bend,.13-.03*bend);
  let t1=.5*s*(1.-work)+.25*bend; let t2=-.5*s*(1.-work)-.1*bend; P.k1=P.hip+.26*vec2f(sin(t1),-cos(t1)); P.a1=P.k1+.25*vec2f(sin(t1-.5*max(-c,0.)-.15-.6*bend),-cos(t1-.5*max(-c,0.)-.15-.6*bend));
  P.k2=P.hip+.26*vec2f(sin(t2),-cos(t2)); P.a2=P.k2+.25*vec2f(sin(t2-.5*max(c,0.)-.15-.4*bend),-cos(t2-.5*max(c,0.)-.15-.4*bend));
  let u1=-.6*s*(1.-work)+work*(.6+2.2*(1.-bend)); let u2=.6*s*(1.-work)+work*(.9+2.*(1.-bend));
  P.e1=P.sh+.19*vec2f(sin(u1),-cos(u1)); P.w1=P.e1+.18*vec2f(sin(u1+.5),-cos(u1+.5)); P.e2=P.sh+.19*vec2f(sin(u2),-cos(u2)); P.w2=P.e2+.18*vec2f(sin(u2+.5),-cos(u2+.5)); return P; }
// acc: (coverage, tone 0 umber … 1 cream, contour, unused)
fn plane(q:vec2f,a:vec2f,b:vec2f,w0:f32,w1:f32,e:f32,acc:vec4f)->vec4f{ let pa=q-a; let ba=b-a; let L=length(ba); let dir=ba/max(L,1e-4); let al=dot(pa,dir); let h=sat(al/L); let w=mix(w0,w1,h); let n=vec2f(-dir.y,dir.x); let ax=dot(pa,n);
  // a tapered facet with chamfered ends, split along its axis into a lit and a shaded half
  let d=max(abs(ax)-w,max(-al-w*.4,al-L-w*.4)+abs(ax)*.35); if(d>e*3.){ return acc; }
  let a0=fill(d,e); let tone=select(.18,.82,ax>0.)+.1*h; let c=acc.x+(1.-acc.x)*a0*.5;
  return vec4f(c,mix(acc.y,tone,a0*.5/max(c,1e-3)),max(acc.z,max(ln(d,.013,e)*.85,ln(ax,.006,e)*fill(d,e)*.3)),acc.w); }
fn body(q:vec2f,P:Pose,e:f32,acc0:vec4f)->vec4f{ var acc=acc0;
  acc=plane(q,P.hip-vec2f(0.,.05),P.sh,.14,.17,e,acc); acc=plane(q,P.hip,mix(P.hip,P.sh,.6),.09,.12,e,acc);
  acc=plane(q,P.hip,P.k1,.085,.06,e,acc); acc=plane(q,P.k1,P.a1,.055,.03,e,acc); acc=plane(q,P.hip,P.k2,.085,.06,e,acc); acc=plane(q,P.k2,P.a2,.055,.03,e,acc);
  acc=plane(q,P.sh,P.e1,.045,.038,e,acc); acc=plane(q,P.e1,P.w1,.038,.024,e,acc); acc=plane(q,P.sh,P.e2,.045,.038,e,acc); acc=plane(q,P.e2,P.w2,.038,.024,e,acc);
  acc=plane(q,P.hd-vec2f(.0,.07),P.hd+vec2f(.02,.07),.06,.045,e,acc); return acc; }
// a house of posts and beams with a thatched roof; build b 0…1. Returns (outline, fill)
fn house(q:vec2f,b:f32,e:f32)->vec2f{ var l=0.; let posts=sat(b*3.); let beam=sat(b*3.-1.); let roof=sat(b*3.-2.);
  for(var i=0;i<3;i++){ let x=-.5+.5*f32(i); l=max(l,ln(sdSeg(q,vec2f(x,0.),vec2f(x,.5*posts)),.024,e)*step(.01,posts)); }
  l=max(l,ln(sdSeg(q,vec2f(-.56,.5),vec2f(-.56+1.12*beam,.5)),.024,e)*step(.01,beam)); l=max(l,ln(sdSeg(q,vec2f(-.56,.25),vec2f(-.56+1.12*beam,.25)),.02,e)*step(.01,beam));
  let rq=q-vec2f(0.,.5); let rd=max(abs(rq.x)*.5+rq.y-.36,-rq.y); let rm=step(.01,roof)*step(rq.x,-.75+1.5*roof); l=max(l,ln(rd,.024,e)*rm);
  let f=fill(rd,e)*rm+fill(sdBox(q-vec2f(0.,.25),vec2f(.5,.25)),e)*step(.01,beam)*.5; l=max(l,fill(rd,e)*rm*ln(fract((rq.x*.6+rq.y)*14.)-.5,.12,.08)*.6); return vec2f(l,f); }
fn addFp(fp:vec4f,acc:vec4f,wk:f32)->vec4f{ let c=fp.x+(1.-fp.x)*acc.x*wk; return vec4f(c,mix(fp.y,acc.y,acc.x*wk/max(c,1e-3)),max(fp.z,acc.z*wk),fp.w); }
// one runner on a lane: a stroboscopic string of positions, with a dotted arc through the hips and a line through the heads
fn runner(S:vec2f,fj:f32,lane:i32,clock:f32,fut:f32,e:f32,fp0:vec4f)->vec4f{ var fp=fp0; let dir=select(1.,-1.,lane==1);
  let spd=select(.81,1.03,lane==1);
  let sz=select(.067,.104,lane==1)*(.95+.10*hash11(fj+5.));
  let x0r=-1.38; let span=2.85;
  let index=select(fj,fj-6.,lane==1);
  let phase=(index+.17*hash11(fj+9.))/select(6.,4.,lane==1);
  let pos=fract(phase+dir*spd*clock*.25/span);
  let xh=x0r+pos*span; let yb=select(farBank(xh)+.003,nearPath(xh),lane==1);
  if(abs(S.y-yb-sz*.5)>sz*.85){ return fp; } if((S.x-xh)*dir>sz*.7||(S.x-xh)*dir<-sz*.7-.2*fut){ return fp; }
  let M=5; var hipPrev=vec2f(0.); var hdPrev=vec2f(0.);
  for(var k=0;k<M;k++){ let ck=clock-f32(k)*select(.12,.17,lane==1); let pk=fract(phase+dir*spd*ck*.25/span); if(abs(pk-pos)>.5){ break; }
    let xk=x0r+pk*span; let byk=select(farBank(xk)+.003,nearPath(xk),lane==1); let q=(S-vec2f(xk,byk))/sz*vec2f(dir,1.);
    let po=walk(xk*dir/(.6*sz)*.5+hash11(fj*5.),1.,0.); let wk=pow(1.-f32(k)/f32(M),1.4)*fut;
    let entrance=smoothstep(.0,.055,pk)*(1.-smoothstep(.945,1.,pk));
    if(abs(q.x)<.8&&q.y>-.2&&q.y<1.2){
      fp=addFp(fp,body(q,po,e/sz,vec4f(0.,.5,0.,0.)),wk*entrance);
    }
    let hipW=vec2f(xk,byk)+po.hip*vec2f(dir,1.)*sz; let hdW=vec2f(xk,byk)+po.hd*vec2f(dir,1.)*sz;
    if(k>0){ let sd=sdSeg(S,hipPrev,hipW); let al=length(S-hipPrev); fp.z=max(fp.z,ln(sd,.0005,e)*step(.5,fract(al/(.006*sz/.055)))*wk*.34*entrance);
      fp.z=max(fp.z,ln(sdSeg(S,hdPrev,hdW),.00035,e)*wk*.24*entrance); }
    hipPrev=hipW; hdPrev=hdW; }
  return fp; }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let zoom=U.p[0].z; let P=frame(fc.xy); let S=U.p[0].xy+P/zoom; let e=px()/zoom*1.1; let t=U.t;
  let appear=U.p[0].w; let drain=U.p[1].x; let rise=U.p[1].y; let fut=U.p[1].z; let clock=U.p[1].w; let red=U.p[2].x;
  // ── silk: warm, darkened with age and darker toward its edges; the weave; the creases of rolling
  var silk=mix(hx(0xbda372u),hx(0xab915fu),fbm(S*vec2f(1.2,2.5)+2.));
  silk*=.955+.045*vnoise(vec2f(S.x*1100.,S.y*25.))*vnoise(vec2f(S.x*25.,S.y*1100.));
  silk*=1.-.07*smoothstep(.55,.85,fbm(S*2.2+4.)); silk=mix(silk,silk*vec3f(.86,.8,.7),smoothstep(.62,.8,fbm(S*vec2f(.8,3.)+9.))*.45);
  let cr=fract(S.x/.41+.02*sin(S.y*6.))-.5; silk*=1.+.05*exp(-pow(cr*.41/.0012,2.))-.035*exp(-pow((cr*.41-.0025)/.0015,2.));
  silk=mix(silk,silk*vec3f(.72,.6,.45),smoothstep(.36,.56,abs(S.y-.0))*.8);
  var ink=vec2f(0.,.5);
  // ── far: pale ranges, the side peaks; mist between
  { let xr=S.x*1.4; let top=.06+.16*fbm(vec2f(xr,1.))+.05*sin(xr*1.1+.4); let d=S.y-top; ink=put(ink,fill(d,e*3.)*smoothstep(-.2,-.01,d)*(.08+.04*vnoise(S*vec2f(30.,4.))),.2); }
  ink=sidePeak(S,1.28,.3,.42,-.06,3.,.6,e,ink); ink=sidePeak(S,.14,.26,.34,-.08,11.,.55,e,ink); ink=sidePeak(S,-.58,.42,.58,-.06,17.,.75,e,ink); ink=sidePeak(S,-1.3,.32,.45,-.08,24.,.6,e,ink);
  ink=mainPeak(S,e,ink);
  // ── the middle ground: cloud-hills along the far bank; the terrace spur; crab-claw trees
  ink=cloudHill(S,.5,.2,.2,-.17,5.,e,ink); ink=cloudHill(S,.98,.18,.13,-.19,8.,e,ink); ink=cloudHill(S,-.3,.22,.12,-.2,13.,e,ink); ink=cloudHill(S,-.9,.2,.16,-.2,19.,e,ink);
  { let fb=farBank(S.x); let d=S.y-fb; ink=put(ink,dry(d,.0009,S.x,e)*.9,1.); ink=put(ink,step(0.,d)*step(d,.05)*moss(S,.15,.0009,e),1.);
    ink=put(ink,ln(S.y-fb-.012-.006*sin(S.x*9.),.0005,e)*smoothstep(.45,.7,vnoise(vec2f(S.x*30.,5.)))*.6,1.); }
  let TER=vec2f(.5,.02);
  { let q=S-TER; let hw=.07+.1*sat(-q.y*5.)+.01*(vnoise(vec2f(q.y*50.,2.))-.5); let rock=max(abs(q.x+.12*q.y)-hw,q.y+.0045)+.003*(vnoise(q*vec2f(60.,9.))-.5);
    let fade=smoothstep(-.12,-.03,q.y+.02*(vnoise(vec2f(q.x*20.,1.))-.5)); let ins=fill(rock,e)*fade; let sh=smoothstep(-.02,.06,-(q.x+.12*q.y));
    ink=put(ink,ins*(.1+.2*sh),.5); ink=put(ink,ins*rain(q*1.4,.12+.45*sh,e)*.7,.9);
    let curl=abs(fract((q.x*1.4-q.y*.4)*20.+.3*vnoise(q*30.))-.5); ink=put(ink,ins*ln(curl/20.,.0005,e)*smoothstep(.4,.65,vnoise(q*vec2f(20.,4.)))*.6,1.);
    ink=put(ink,dry(rock,.0011,q.x*3.+q.y,e)*smoothstep(-.04,-.004,q.y),1.); ink=put(ink,ln(q.y+.0045,.0006,e)*step(abs(q.x),hw-.004),1.); }
  ink=pine(S,TER+vec2f(-.075,-.005),.2,.55,1.,e,ink);
  ink=crabTree(S,vec2f(.62,farBank(.62)+.06),.09,2.,e,ink); ink=crabTree(S,vec2f(.95,farBank(.95)+.04),.08,4.,e,ink); ink=crabTree(S,vec2f(-.28,farBank(-.28)+.04),.08,6.,e,ink);
  ink=crabTree(S,vec2f(-.36,farBank(-.36)+.03),.06,7.,e,ink); ink=crabTree(S,vec2f(.03,farBank(.03)+.008),.07,8.,e,ink); ink=crabTree(S,vec2f(-.72,farBank(-.72)+.04),.08,9.,e,ink);
  var white=0.;
  { let fs=.026; let q1=(S-TER-vec2f(-.024,-.004))/fs; let q2=(S-TER-vec2f(.024,-.004))/fs; let p1=person(q1,1.,e/fs); let p2=person(q2*vec2f(-1.,1.),1.,e/fs);
    let bq=S-TER-vec2f(0.,.0015); let board=sdBox(bq,vec2f(.0085,.0035)); let grid=ln(fract(bq.x/.0021)-.5,.06,.08)*step(board,0.);
    ink=put(ink,max(max(p1.x,p2.x),ln(board,.0004,e)),1.); ink=put(ink,grid*.5,1.); white=max(white,max(p1.y,p2.y)); ink=put(ink,fill(board,e)*.22,.5);
    let stn=hash21(floor(bq/.0021)); ink=put(ink,fill(length(fract(bq/.0021)-.5)*.0021-.0007,e)*step(.7,stn)*step(board,0.),1.); white=max(white,fill(length(fract(bq/.0021)-.5)*.0021-.0007,e)*step(stn,.25)*step(board,0.)); }
  let WC=TER+vec2f(.07,-.003); let wfs=.032;
  if(rise<.02){ let q=(S-WC)/wfs; let p=person(q,2.,e/wfs); ink=put(ink,p.x,1.); white=max(white,p.y); }
  // ── water: bare silk; a few fine lines near the banks, barely moving; looked at closely, faint gold writing
  let ry=riverY(S.x); let rw=riverW(S.x); let wv=(S.y-ry)/rw; var gold=0.;
  if(abs(wv)<1.){ let k=S.y*120.+.4*sin(S.x*12.+S.y*40.)+.1*sin(S.x*37.-t*.05); let wl=fract(k)-.5; let brk=smoothstep(.45,.62,vnoise(vec2f(S.x*18.-t*.006,floor(k)*.7)));
    let shore=smoothstep(.35,.95,abs(wv)); ink=put(ink,ln(wl/120.,.00035,e)*brk*(.25+.45*shore),.85);
    let rd=S.x*130.; let ri=floor(rd); let reed=ln((fract(rd)-.5)/130.+(wv-.8)*.004,.0003,e)*step(.86,hash11(ri))*smoothstep(.78,.86,wv)*step(wv,.82+.25*hash11(ri*3.)); ink=put(ink,reed*.8,1.);
    let gk=floor(k); let gp=vec2f((S.x+t*.003)/.0072+gk*3.7,(fract(k)-.5)/.9+.5);
    gold=glyphField(gp,gk,.0072*zoom*U.res.y)*brk*smoothstep(.25,.6,vnoise(vec2f(S.x*3.,gk*.3)))*(.25+.75*shore); }
  // ── the near bank: a path, boulders with pines on them
  { let nb=nearBank(S.x); ink=put(ink,dry(S.y-nb,.0011,S.x,e),1.); ink=put(ink,step(S.y,nb)*moss(S*1.1,.05,.0013,e),1.);
    let pth=nearPath(S.x); ink=put(ink,ln(S.y-pth+.006,.0005,e)*smoothstep(.45,.7,vnoise(vec2f(S.x*30.,8.)))*.5,1.); }
  ink=boulder(S,vec2f(.30,nearBank(.30)-.03),.045,1.,e,ink); ink=boulder(S,vec2f(.36,nearBank(.36)-.05),.03,2.,e,ink);
  ink=boulder(S,vec2f(-.45,nearBank(-.45)-.035),.05,3.,e,ink); ink=boulder(S,vec2f(1.12,nearBank(1.12)-.03),.05,4.,e,ink); ink=boulder(S,vec2f(.85,nearBank(.85)-.06),.03,5.,e,ink);
  ink=pine(S,vec2f(.29,nearBank(.29)+.005),.3,-.4,4.,e,ink); ink=pine(S,vec2f(-.47,nearBank(-.47)+.008),.28,.45,5.,e,ink); ink=pine(S,vec2f(1.1,nearBank(1.1)+.01),.26,-.3,6.,e,ink);
  // ── the village on the far bank: houses in fine line; once the people hurry, they are put up and pulled down
  var fp=vec4f(0.,.5,0.,0.);
  for(var i=0;i<3;i++){ let fi=f32(i); let hx0=select(select(-.46,.18,i==1),-.12,i==0); let hb=farBank(hx0)+.004; let hs=.045; let q=(S-vec2f(hx0,hb))/hs;
    if(abs(q.x)<3.2&&q.y>-.4&&q.y<1.4){
      if(fut<.01){ let hl=house(q,1.,e/hs); ink=put(ink,hl.x,1.); white=max(white,hl.y*.3); }
      else { let cyc=clock*.6+fi*.37;
        for(var k=0;k<7;k++){ let bk=fract(cyc-f32(k)*.028); let bb=select(1.-sat((bk-.62)/.22),sat(bk/.45),bk<.62); let wgt=(1.-f32(k)/7.)*fut;
          let fall=select(0.,(bk-.62)*.7,bk>.62); let hq=vec2f(q.x-fall*q.y*.8,q.y+fall*.2); let hl=house(hq,bb,e/hs);
          fp=addFp(fp,vec4f(hl.y*.6,.7-.3*f32(k)/7.,hl.x,0.),wgt); }
        ink=put(ink,house(q,1.,e/hs).x*(1.-fut),1.);
        for(var b=0;b<2;b++){ let bxo=select(-.95,.95,b==1); let bsz=.055; let bq0=(S-vec2f(hx0+bxo*hs,hb-.002))/bsz; if(abs(bq0.x)>.9||bq0.y<-.2||bq0.y>1.3){ continue; }
          for(var k=0;k<7;k++){ let ck=clock-f32(k)*.045; let po=walk(ck*2.4+fi+f32(b)*.5,0.,1.); let wk=(1.-f32(k)/7.)*fut; fp=addFp(fp,body(bq0*vec2f(select(1.,-1.,b==1),1.),po,e/bsz,vec4f(0.,.5,0.,0.)),wk); } } } } }
  // ── people on both banks. Before: a few small figures, still. After: stroboscopic strings of positions, racing both ways.
  for(var j=0;j<10;j++){ let fj=f32(j); let lane=select(0,1,j>=6);
    if(fut<1. && j%3==0){
      let idx=select(fj,fj-6.,lane==1);
      let phase=(idx+.17*hash11(fj+9.))/select(6.,4.,lane==1);
      let dir=select(1.,-1.,lane==1); let speed=select(.81,1.03,lane==1);
      let x0=-1.38+fract(phase+dir*speed*clock*.25/2.85)*2.85;
      let by=select(farBank(x0)+.003,nearPath(x0),lane==1);
      let sz=select(.067,.104,lane==1)*(.95+.10*hash11(fj+5.));
      let pp=person((S-vec2f(x0,by))/sz,0.,e/sz);
      ink=put(ink,pp.x*(1.-fut),1.); white=max(white,pp.y*(1.-fut));
    }
    if(fut>.001){fp=runner(S,fj,lane,clock,fut,e,fp);} }
  // the woodcutter: he gets up and hurries down to the village, his positions left behind him
  if(rise>=.02){ let M=12; var hipPrev=vec2f(0.);
    for(var k=0;k<M;k++){ let rk=sat(rise-f32(k)*.05); let mv=sat((rk-.12)/.88); let pos=TER+vec2f(.07-.27*mv,-.003-.19*pow(mv,1.3));
      let q=(S-pos)/wfs*vec2f(-1.,1.); let up=sat(rk/.12); let po=walk(mv*6.,1.,.6*(1.-up)); let wk=(1.-f32(k)/f32(M))*up;
      if(abs(q.x)<1.&&q.y>-.3&&q.y<1.3){ fp=addFp(fp,body(q,po,e/wfs,vec4f(0.,.5,0.,0.)),wk); }
      let hipW=pos+po.hip*vec2f(-1.,1.)*wfs; if(k>0){ let al=length(S-hipPrev); fp.z=max(fp.z,ln(sdSeg(S,hipPrev,hipW),.0005,e)*step(.5,fract(al/.004))*wk); } hipPrev=hipW;
      if(k==0){ let p=person((S-WC)/wfs,2.,e/wfs); ink=put(ink,p.x*(1.-up),1.); white=max(white,p.y*(1.-up)); } } }
  // ── ink onto silk; lead white; the Futurist planes; the gold in the water
  let inkc=mix(hx(0x8f7f66u),hx(0x1c1812u),ink.y); var col=mix(silk,inkc,ink.x*.95);
  col=mix(col,hx(0xe4dac3u),white*.6*(1.-ink.x*.6));
  let och=mix(mix(hx(0x4a2810u),hx(0xb87a34u),smoothstep(.05,.5,fp.y)),hx(0xeed3a0u),smoothstep(.55,.95,fp.y)); col=mix(col,och*mix(vec3f(1.),col*1.3,.25),sat(fp.x)*.92);
  col=mix(col,hx(0x22140au),sat(fp.z)*.85);
  col+=hx(0xa47e34u)*gold*(1.-ink.x)*.55;
  // ── the vermilion running down from where the seal was into the river, then downstream, turning to ink
  if(red>.002){ let thr=exp(-pow((P.x+.008*sin(P.y*25.+t*1.5))/(.0035+.004*red),2.))*step(farBank(S.x)-.004,S.y)*step(P.y,-.03+.02*(1.-red))*sat(red*2.)*(1.-sat((t-178.3)*1.2));
    let dx=.72-S.x; let plume=exp(-pow((S.y-ry-.008*sin(S.x*20.))/(rw*(.25+.35*sat(dx*2.))),2.))*smoothstep(-.02,.02,dx)*smoothstep(.05+red*.9,red*.6,dx)*(.5+.5*fbm(S*vec2f(14.,40.)+t*.1))*red*step(abs(wv),1.);
    let pc=mix(hx(0xc23a22u),mix(silk,inkc,.35),drain); col=mix(col,pc,sat(max(thr*(1.-drain),plume*.75)*(1.-drain*.6))); }
  // the edges of the frame darker and warmer, as an old scroll is
  col=mix(col,col*vec3f(.8,.68,.52),smoothstep(.5,1.05,length(P*vec2f(.62,1.)))*.55);
  return vec4f(lin3(col),sat(appear*1.7-.7*sat(.5-P.y))*U.w); }
`;
