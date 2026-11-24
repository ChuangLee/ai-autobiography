// The painted pictures above the water. Each is a real renderer, not a filter:
//   INK       the still river, sparse in the manner of Ni Zan (paper, wet wash, dry-brush trees)
//   MONET     a low-resolution colour study of the harbour at sunrise and of the lily pond (one tall canvas the camera tilts down);
//             the compositor then paints it stroke by stroke (DABS): broken colour, short loaded touches lying along the water
//   LAND      blue-and-green landscape on silk: layered azurite / malachite / ochre washes with gold outline
import { FS_VS, NOISE } from "../lib.js";
export const HILLS = `
fn ridge(x:f32, s:f32, k:f32)->f32{ return clamp((fbm(vec2f(x*s+k,k*1.7))-.22)*1.55+(vnoise(vec2f(x*s*5.+k,3.))-.5)*.10,0.,1.); }
fn hillH(x:f32)->vec3f{ return vec3f(.010+.080*ridge(x,1.9,.3)*smoothstep(.78,.25,x)+.02*smoothstep(.9,.4,x),
  .006+.135*ridge(x,2.6,7.3)*smoothstep(.52,.86,x)*smoothstep(1.3,.9,x), .003+.020*ridge(x,4.,3.1)*smoothstep(.40,.62,x)*smoothstep(1.05,.70,x)); }
`;
export const MONET = FS_VS + NOISE + HILLS + `
struct U { par:vec4f, par2:vec4f, res:vec4f }
@group(0)@binding(0) var<uniform> u:U;
const HOR=.455; const SX=.60;
fn boatS(p:vec2f, s:f32)->f32{ let q=p/s; var a=smoothstep(.012,.0,abs(q.y-.012*q.x*q.x*30.)-.011*(1.-q.x*q.x*36.))*step(abs(q.x),.166);
  a=max(a,smoothstep(.012,.0,length((q-vec2f(.03,-.05))*vec2f(1.,.55))-.018)); a=max(a,smoothstep(.012,.0,length((q-vec2f(-.07,-.035))*vec2f(1.,.6))-.014)); return a; }
fn sunrise(uv:vec2f)->vec3f{
  let t=u.par.x; let sunY=u.par.z; let warm=u.par.w; var c=vec3f(0.);
  if(uv.y<HOR){ let h=(HOR-uv.y)/HOR;
    c=mix(vec3f(.56,.57,.64),vec3f(.38,.47,.60),smoothstep(0.,.85,h));
    c=mix(c,vec3f(.52,.49,.66),.55*smoothstep(.42,.72,fbm(vec2f(uv.x*1.6+7.,uv.y*4.))));                                   // violet haze
    c=mix(c,vec3f(.90,.56,.40),.38*warm*smoothstep(.52,.80,fbm(vec2f(uv.x*2.6+3.,uv.y*9.+t*.01)))*smoothstep(.04,.3,h)*exp(-pow((uv.x-SX)*2.2,2.)));
    c=mix(c,vec3f(.90,.62,.48),.40*warm*exp(-length((uv-vec2f(SX,sunY))*vec2f(1.78,1.))*7.));
    let hh=hillH(uv.x); let y=HOR-uv.y; let m=max(smoothstep(hh.x+.01,hh.x-.01,y)*.55,smoothstep(hh.y+.008,hh.y-.01,y)*.8);
    c=mix(c,vec3f(.33,.41,.55),m*.8*smoothstep(-.01,.03,y));
    let cx=floor(uv.x*46.); let mh=.03+.09*hash11(cx*3.7)*step(.72,hash11(cx)); c=mix(c,vec3f(.30,.38,.52),.5*smoothstep(.0016,.0004,abs(fract(uv.x*46.)-.5)/46.)*step(y,mh)*step(0.,y));
  } else { let d=uv.y-HOR;
    c=mix(vec3f(.47,.53,.62),vec3f(.21,.31,.44),smoothstep(0.,.55,d));
    c=mix(c,vec3f(.40,.40,.60),.45*smoothstep(.45,.75,fbm(vec2f(uv.x*2.+5.,uv.y*3.))));                                     // violet in the water too
    c=mix(c,vec3f(.14,.25,.36),.60*smoothstep(.56,.74,vnoise(vec2f(uv.x*11.+t*.02,uv.y*47.))*.6+.4*vnoise(vec2f(uv.x*4.,uv.y*13.+3.))));     // short dark touches, no two alike
    c=mix(c,vec3f(.64,.68,.74),.40*smoothstep(.60,.80,vnoise(vec2f(uv.x*14.-t*.015,uv.y*58.+7.))*.6+.4*vnoise(vec2f(uv.x*5.+9.,uv.y*11.))));
    let hh=hillH(uv.x); let m=max(smoothstep(hh.x,hh.x-.03,d)*.4,smoothstep(hh.y,hh.y-.04,d)*.6); c=mix(c,vec3f(.30,.39,.52),m*.6);
    let waveRow=log(1.+12.*d)*19.;
    let wavePhase=waveRow+.45*sin(uv.x*13.+t*.42)+.29*t;
    let wob=(vnoise(vec2f(waveRow*.8,t*.19))-.5)*(.014+.054*d); let wd=.009+.06*d;
    let colm=smoothstep(wd*1.5,wd*.4,abs(uv.x-SX+wob)); let ripple=.5+.5*cos(wavePhase*3.16);
    let brk=smoothstep(.25,.76,ripple*.78+.22*vnoise(vec2f(uv.x*41.,waveRow)));
    c=mix(c,vec3f(1.,.47,.12),colm*brk*smoothstep(u.par2.y,u.par2.y*.3,d)*smoothstep(0.,.010,d));
    let boat=vec2f(.165,.705);
    let wake=uv-boat;
    let mirror=boatS(vec2f(wake.x+wob*.40,-wake.y*1.6),.80)*smoothstep(.0,.023,wake.y);
    c=mix(c,vec3f(.20,.24,.35),.52*mirror*(.62+.38*ripple));
    var b=boatS(wake,.80); c=mix(c,vec3f(.085,.14,.24),b*.96);
    b=boatS(uv-vec2f(.30,.60),.45); c=mix(c,vec3f(.17,.25,.37),b*.8); b=boatS(uv-vec2f(.42,.535),.3); c=mix(c,vec3f(.30,.38,.50),b*.65);
  }
  let d=length((uv-vec2f(SX,sunY))*vec2f(1.78,1.));
  let pigment=mix(vec3f(.99,.36,.075),vec3f(.96,.455,.19),smoothstep(.40,.76,vnoise(uv*140.)));
  c=mix(c,pigment,smoothstep(.032,.026,d));
  return c;
}
fn pads(p:vec2f, cs:vec2f, raft:f32, sd:f32, c:ptr<function,vec3f>){
  if(raft<=.0001){return;}
  let q=p/cs; let i=floor(q); var pad=0.; var pc=vec3f(0.); var blo=0.; var bc=vec3f(0.);
  for(var dy=-1;dy<=1;dy++){ for(var dx=-1;dx<=1;dx++){ let cc=i+vec2f(f32(dx),f32(dy)); let h=hash22(cc+sd); if(hash21(cc+11.+sd)>clamp(raft,0.,1.)*.9){ continue; }
      let radius=.30+.42*hash21(cc+5.+sd);
      let bob=.026*sin(u.par.x*.74+h.y*6.28);
      let e=(q-(cc+.5+(h-.5)*.8))/radius-vec2f(.0,bob);
      let angle=atan2(e.y,e.x)-h.x*6.283;
      let dd=length(e)*(.98+.028*sin(angle*3.+h.y)+.022*cos(angle*5.));
      let gap=smoothstep(.99,.925,cos(angle))*smoothstep(.08,.35,dd);
      let leaf=smoothstep(1.,.90,dd)*mix(1.,gap,smoothstep(.12,.36,dd));
      let skirt=smoothstep(1.09,.82,length(e-vec2f(.035,.16)))*(1.-leaf);
      if(skirt>.001){ *c=mix(*c,vec3f(.095,.15,.24),skirt*.43); }
      if(leaf>pad){
        pad=leaf;
        let ribs=.5+.5*cos(angle*9.+dd*.55);
        let curl=smoothstep(.69,.96,dd)*max(-e.y,0.);
        let light=clamp(.49-.33*e.y+.15*ribs*dd+.30*curl+.17*(h.y-.5),0.,1.);
        pc=mix(vec3f(.10,.25,.25),vec3f(.51,.68,.45),light);
        pc=mix(pc,vec3f(.67,.71,.61),curl*.48);
      }
      if(hash21(cc+23.+sd)>.80){
        let petal=(e-vec2f(.12,-.47))/vec2f(.52,.85);
        let phi=atan2(petal.y,petal.x);
        let rr=length(petal);
        let flutes=.5+.5*cos(8.*phi+h.y*5.);
        let silhouette=.54+.29*flutes-.14*petal.y;
        let edge=smoothstep(silhouette+.06,silhouette-.05,rr);
        if(edge>blo){
          blo=edge;
          let pink=mix(vec3f(.80,.45,.54),vec3f(.93,.73,.74),h.y);
          bc=mix(pink,vec3f(.99,.92,.85),smoothstep(.12,.65,rr)*(.45+.55*flutes));
          bc=mix(bc,vec3f(.91,.67,.27),smoothstep(.28,.12,length(petal-vec2f(0.,.10))));
        }
      }
  } }
  *c=mix(*c,pc,pad*.96); *c=mix(*c,mix(bc,vec3f(.98,.52,.18),u.par2.x*.65),blo); }
// A close blossom. Three staggered whorls share a centre; upturned inner petals
// catch warm light while the lower ones meet the blue reflection.
fn blossom(p:vec2f, base:vec3f)->vec3f{
  var c=base;
  for(var k=0;k<3;k++){
    let ring=f32(k);
    let q=p*vec2f(1.+ring*.24,1.+ring*.16)+vec2f(.04*ring,.13*ring);
    let petals=9.-ring;
    let angle=atan2(q.y,q.x);
    let sector=round((angle+.39*ring)*petals/6.2832);
    let axis=sector*6.2832/petals-.39*ring;
    let dir=vec2f(cos(axis),sin(axis));
    let along=dot(q,dir);
    let halfWidth=(.23-.03*ring)*sin(3.1416*clamp(along,0.,1.));
    let across=dot(q,vec2f(-dir.y,dir.x));
    let coverage=smoothstep(.04,-.04,max(abs(across)-halfWidth,max(-along,along-.93)));
    let fold=clamp(.43+.38*dir.y-.60*across+.25*along,0.,1.);
    c=mix(c,mix(vec3f(.68,.34,.48),vec3f(.99,.90,.82),fold+.04*ring),coverage);
  }
  return mix(c,vec3f(.98,.72,.27),.9*smoothstep(.16,.07,length(p+vec2f(.015,.11))));
}
fn lilies(p:vec2f)->vec3f{                                   // p.y runs on down the tall canvas
  var c=mix(vec3f(.10,.13,.34),vec3f(.03,.17,.15),smoothstep(.30,.60,fbm(vec2f(p.x*3.4,p.y*.8+2.))));
  c=mix(c,vec3f(.02,.08,.09),.75*smoothstep(.50,.72,fbm(vec2f(p.x*9.,p.y*.55+6.))));                      // trees that are not in the picture, standing in the water
  c=mix(c,vec3f(.20,.11,.36),.55*smoothstep(.52,.78,fbm(vec2f(p.x*5.+3.,p.y*.7+1.))));                    // violet between them
  c=mix(c,vec3f(.50,.47,.76),.55*smoothstep(.60,.80,fbm(vec2f(p.x*1.5+9.,p.y*1.2))));                     // openings of lilac sky
  c=mix(c,vec3f(.90,.70,.70),.40*smoothstep(.70,.88,fbm(vec2f(p.x*2.2+1.,p.y*1.7+5.))));                  // one pink cloud
  let raft=smoothstep(.48,.60,fbm(vec2f(p.x*1.5+3.,p.y*4.2)))+exp(-pow((p.x-SX)/.11,2.))*smoothstep(.85,1.05,p.y)*smoothstep(1.7,1.3,p.y);
  pads(p,vec2f(.157,.068),raft*.85,0.,&c); pads(p+vec2f(.03,.01),vec2f(.052,.023),raft*smoothstep(.40,.62,fbm(p*vec2f(5.,9.)+8.)),40.,&c);
  let centre=vec2f(.56+.0009*sin(u.par.x*.65),1.385+.0016*sin(u.par.x*.83));
  let flower=(p-centre)/vec2f(.063,.051);
  if(length(flower)<1.12){c=blossom(flower,c);}
  return c;
}
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let uv=fc.xy/u.res.xy; let Y=uv.y+u.par.y; let p=vec2f(uv.x,Y);
  if(Y<=.98){return vec4f(sunrise(p),1.);}
  if(Y>=1.22){return vec4f(lilies(p),1.);}
  return vec4f(mix(sunrise(p),lilies(p),smoothstep(.98,1.22,Y)),1.); }
`;
export const INK = HILLS + `
fn hills(uv:vec2f, hor:f32, soft:f32)->f32{
  let x=uv.x; let y=hor-uv.y; let g=fbm(uv*vec2f(9.,26.))*.6+fbm(uv*vec2f(70.,110.))*.25; let hh=hillH(x);
  var ink=.20*smoothstep(hh.x+.006+soft,hh.x-.008-soft,y)*smoothstep(-.004,.040+soft,y)*(.70+.6*g);
  ink=max(ink,.56*smoothstep(hh.y+.004+soft,hh.y-.010-soft,y)*smoothstep(-.006,.050+soft,y)*(.50+.9*g)*smoothstep(.50,.66,x));
  ink=max(ink,.42*smoothstep(hh.z+.002+soft,hh.z-.003-soft,y)*smoothstep(-.003,.004+soft,y)*(.7+.5*g));
  return ink; }
fn seg(p:vec2f, a:vec2f, b:vec2f, w0:f32, w1:f32)->f32{ let pa=p-a; let ba=b-a; let h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); let d=length(pa-ba*h); let w=mix(w0,w1,h);
  return smoothstep(w,w*.35,d)*(.55+.6*vnoise(p*vec2f(900.,300.))); }
fn tree(p:vec2f, o:vec2f, hgt:f32, lean:f32, sd:f32)->f32{ let q=(p-o)*vec2f(1.7778,1.); let top=vec2f(lean*hgt,-hgt); var a=seg(q,vec2f(0.),top,.0030,.0011);
  for(var i=0;i<6;i++){ let f=f32(i); let h=.36+.105*f; let s=select(-1.,1.,hash11(sd+f)>.5); let base=top*h; let ln=hgt*(.36-.045*f)*(.7+.6*hash11(sd+f*3.)); let dir=normalize(vec2f(s*(.8+.5*hash11(sd+f*7.)),-.55-.5*hash11(sd+f*5.)));
    a=max(a,seg(q,base,base+dir*ln,.0015,.0005)); a=max(a,seg(q,base+dir*ln*.55,base+dir*ln*.55+vec2f(dir.x*.3-s*.2,-.9)*ln*.45,.0010,.0004)); }
  return a; }
fn inkRiver(uv:vec2f, t:f32, td:f32, c0:vec2f)->vec3f{
  let hor=.455; let asp=1.7778;
  let grain=fbm(uv*vec2f(asp,1.)*340.)*.5+fbm(uv*vec2f(asp*900.,40.))*.5;
  var col=vec3f(.925,.908,.868)*(1.-.04*(grain-.5)); var ink=0.;
  if(uv.y<hor){ ink=hills(uv,hor,0.);
    ink+=.10*smoothstep(.42,.05,uv.y)*(.55+.9*fbm(uv*vec2f(1.7,2.6)+3.))+.05*smoothstep(.45,.85,fbm(uv*vec2f(1.4,6.)+11.))*smoothstep(hor,hor-.22,uv.y); }
  else { let d=uv.y-hor; let wob=(fbm(vec2f(uv.x*5.,uv.y*150.+t*.05))-.5)*.007*smoothstep(0.,.10,d)+(vnoise(vec2f(uv.x*2.,uv.y*40.-t*.035))-.5)*.004;
    ink=hills(vec2f(uv.x+wob,hor-d*1.03),hor,.003+d*.09)*(.78-d*.9);
    ink+=.035+.22*smoothstep(.05,.50,d)*(.8+.4*fbm(uv*vec2f(1.2,7.)+5.))+.03*smoothstep(.40,.62,vnoise(vec2f(uv.x*1.2+t*.004,uv.y*60.)))*smoothstep(.02,.2,d); }
  ink*=1.+.3*(fbm(uv*vec2f(asp,1.)*120.)-.5);
  // the near bank: a low spit, a few rocks, three bare trees in dry brush
  let bx=uv.x; let bank=.800+.018*ridge(bx,5.,2.2)*smoothstep(.02,.16,bx)*smoothstep(.40,.22,bx)+.05*smoothstep(.30,.42,bx)+.2*smoothstep(.36,.5,bx);
  ink=max(ink,.50*smoothstep(bank+.004,bank-.002,uv.y)*smoothstep(bank-.045,bank-.004,uv.y)*step(bx,.44)*(.45+.9*fbm(uv*vec2f(60.,160.))));
  ink=max(ink,.80*tree(uv,vec2f(.105,.800),.235,.10,1.)); ink=max(ink,.72*tree(uv,vec2f(.150,.797),.185,-.14,2.)); ink=max(ink,.62*tree(uv,vec2f(.205,.802),.150,.22,3.));
  let tau=t-td;
  if(tau>0.){ let v=(uv-c0)*vec2f(asp,5.2); let r=length(v); let w=exp(-tau*.5)*smoothstep(0.,.2,tau);
    ink+=.16*w*(.5+.5*cos(r*46.-tau*13.))*smoothstep(tau*.20+.05,tau*.20-.03,r)*smoothstep(.0,.03,r)*smoothstep(1.,.2,tau/4.); }
  col=mix(col,vec3f(.075,.072,.078),clamp(ink,0.,1.));
  var red=0.;
  if(tau>0.){ let v=(uv-c0)*vec2f(asp,3.4); red=smoothstep(.016+.05*sqrt(min(tau,3.)),.0,length(v))*smoothstep(0.,.08,tau)*(.6+.5*fbm(uv*90.)); }
  let fall=clamp((t-(td-.62))/.62,0.,1.);
  if(fall>0.&&fall<1.){ let y=mix(.08,c0.y,fall*fall); let p=(uv-vec2f(c0.x,y))*vec2f(asp,1.); let st=1.+2.2*fall;
    red=max(red,smoothstep(.0085,.0060,length(vec2f(p.x*1.25,p.y/st+max(p.y,0.)*.9)))); }
  return mix(col,vec3f(.80,.13,.07),clamp(red,0.,1.)*.95);
}`;
// stroke-by-stroke rendering of the colour study in texture 'study' (screen-aligned; pan moves the canvas under the frame)
export const DABS = `
fn reach(p:vec2f, c0:vec2f)->f32{ let q=(p-c0)*vec2f(1.7778,1.); return min(length(q*vec2f(.8,1.3))+.24,abs(q.x)*5.+select(3.,q.y*.6,q.y>0.)); }   // the sun's road first, then outward from the disc
fn dabs(uv:vec2f, pan:f32, t:f32, ink:vec3f, fr:f32, c0:vec2f)->vec3f{
  let cv=vec2f(uv.x*1.7778,uv.y+pan); let whole=step(3.1,fr);
  var col=mix(ink,textureSampleLevel(study,samp,uv,0.).rgb*.88+vec3f(0.,.01,.025),max(whole,smoothstep(fr-.30,fr-.75,reach(vec2f(uv.x,uv.y+pan),c0))));
  for(var L=0;L<3;L++){ let fl=f32(L); let cs=vec2f(.070,.034)*pow(.60,fl); let dr=vec2f(t*.003*(fl+1.)*smoothstep(.455,.62,cv.y)*(1.-smoothstep(.97,1.22,cv.y)),0.); let q=(cv+dr)/cs; let i=floor(q);
    for(var dy=-1;dy<=1;dy++){ for(var dx=-1;dx<=1;dx++){ let cc=i+vec2f(f32(dx),f32(dy)); let h=hash22(cc+fl*37.); let h2=hash21(cc*1.7+fl*11.);
        if(h2<.10*fl){ continue; }
        let ctr=(cc+.5+(h-.5)*.9)*cs-dr; let on=max(whole,smoothstep(fr,fr-.07,reach(vec2f(ctr.x/1.7778,ctr.y),c0)+.22*h.y-.05*fl)); if(on<.01){ continue; }
        let th=(h.x-.5)*.5+(h2-.5)*1.1*step(ctr.y,.30)+1.5708*step(.62,h2)*smoothstep(1.02,1.2,ctr.y); let e=cv-ctr; let cth=cos(th); let sth=sin(th);
        let l=vec2f(e.x*cth+e.y*sth,-e.x*sth+e.y*cth)/(cs*vec2f(.36+.50*h2,.52)*(.75+.5*h.y));
        let d=length(l); let br=vnoise(vec2f(l.x*2.2+h2*9.,l.y*7.+h.x*20.)); let a=smoothstep(1.,.70,d+.28*(br-.5))*on;
        if(a>.01){ var c=textureSampleLevel(study,samp,vec2f(ctr.x/1.7778,ctr.y-pan),0.).rgb; let j=hash33(vec3f(cc,fl+3.))-.5;
          c=c*(1.+.18*j.x)+vec3f(j.y,-.5*j.y,j.z)*.08; let m=max(c.r,max(c.g,c.b)); c=mix(vec3f(m),c,1.22); c*=.94+.14*br+.10*l.y;
          let bristles=cos(l.y*24.+br*2.5)*smoothstep(1.,.3,d);
          c*=1.+.038*bristles;
          let preserve=mix(.93,.56,smoothstep(1.04,1.27,ctr.y));
          col=mix(col,c,a*preserve); } } } }
  // A final thin glaze restores the petal edges and negative space between leaves.
  let layer=textureSampleLevel(study,samp,uv,0.).rgb;
  let edge=max(0.,layer.r-layer.g*.88);
  col=mix(col,layer,smoothstep(1.02,1.30,cv.y)*(.26+.37*smoothstep(.02,.26,edge)));
  // Keep the vermilion disc intact where the reflected light breaks into strokes below.
  let sunY=mix(.455,.405,smoothstep(120.,124.5,t));
  let sun=1.-smoothstep(.026,.041,length(cv-vec2f(c0.x*1.7778,sunY)));
  return mix(col,layer,sun*whole*.85); }
`;
export const LAND = `
fn pk(x:f32)->f32{ var s=0.; var a=.62; var f=1.; for(var i=0;i<4;i++){ s+=a*pow(1.-abs(2.*vnoise(vec2f(x*f,f*7.3))-1.),1.5); a*=.48; f*=2.6; } return s; }
fn silk(uv:vec2f)->f32{ return .5*vnoise(uv*vec2f(1920.,60.))+.5*vnoise(uv*vec2f(60.,1080.)); }
fn landscape(uv0:vec2f, hor:f32, t:f32, zoom:f32, ce:vec2f, te:f32)->vec3f{
  let asp=1.7778; var uv=uv0; let sk=silk(uv0);
  let GOLD=vec3f(.97,.80,.36); let AZ=vec3f(.105,.258,.445); let MA=vec3f(.155,.418,.348); let OC=vec3f(.62,.45,.22); let SILK=vec3f(.80,.67,.43);
  // the water lifts over the body before it comes through, then tears
  let qe=(uv0-ce)*vec2f(asp,1.); let re=length(qe*vec2f(1.,3.2)); let swell=smoothstep(-1.6,0.,te)*(1.-smoothstep(0.,2.5,te)); uv.y+=.045*swell*exp(-re*re*9.)*step(hor,uv0.y);
  var col=mix(SILK,vec3f(.60,.47,.27),smoothstep(hor,hor-.9,uv.y))*(.95+.08*sk);
  col=mix(col,vec3f(.92,.82,.56),.6*exp(-pow((uv.y-hor)*6.,2.)));
  let d0=uv.y-hor;
  if(d0>0.){ col=mix(vec3f(.72,.68,.48),vec3f(.44,.52,.42),smoothstep(0.,.6,d0))*(.95+.08*sk);                                    // water: silk showing through thin green, a net of wave lines
    let k=1./(d0*zoom+.02); let w=vec2f(uv.x*asp*(5.+3.2*k),log(d0*zoom+.02)*16.); let row=floor(w.y); let fx=fract(w.x+.5*(row%2.)); let fy=fract(w.y);
    col=mix(col,vec3f(.22,.30,.25),.30*smoothstep(.12,.02,abs(fy-.25-.5*(1.-pow(abs(fx*2.-1.),2.))))*smoothstep(.0,.02,d0)); }
  let NL=9;
  for(var i=0;i<NL;i++){ let f=f32(i); let near=f/f32(NL-1); let zs=sqrt(zoom); let sc=mix(2.6,.85,near)*zs; let x=uv.x*asp*sc+f*5.37+.01*t*near;
    let base=hor+(-.004+.36*pow(near,1.5))/zs; let env=.40+.60*smoothstep(.34,.60,vnoise(vec2f(x*.33+3.+f*1.7,f*2.)));
    let H=mix(.15,.80,near)/zs*pow(pk(x),1.5)*env; let Hl=mix(.15,.80,near)/zs*pow(pk(x-.012),1.5)*env;
    let y=base-uv.y; let rel=y/max(H,1e-4);
    if(y>-.012/zoom&&y<H){ let lit=smoothstep(-.02,.02,(H-Hl)/max(H,.02)+.9*(vnoise(vec2f(x*5.,rel*3.5+f))-.5)); let fold=vnoise(vec2f(x*7.,rel*5.+f*3.)); let cre=abs(fract(rel*2.6+fold*1.6+x*1.3)-.5);
      var c=mix(AZ,MA,lit*.85+.15*fold); c=mix(c,AZ*.8,smoothstep(.55,.95,rel)*(1.-lit)*.7); c=mix(OC,c,smoothstep(.02,.34,rel+.14*(fold-.5)));          // malachite on the lit slope over azurite, ochre feet
      let face=fbm(vec2f(x*7.2+rel*.52,rel*1.5+f*6.));
      c*=.76+.31*face+.09*vnoise(vec2f(x*13.,y*zoom*9.));
      let schist=vnoise(vec2f(x*83.+face*4.,rel*12.));
      c=mix(c,AZ*.64,smoothstep(.56,.83,schist)*(.16+.20*(1.-lit))*near);
      c=mix(c,vec3f(.03,.13,.26),.55*smoothstep(.05,.0,cre)*smoothstep(.12,.3,rel));                                                                     // the facets of the rock drawn in
      c=mix(c,GOLD,.26*smoothstep(.018,.0,abs(cre-.25))*smoothstep(.2,.4,rel)*near*smoothstep(.54,.72,fold));
      c=mix(mix(SILK,vec3f(.55,.66,.66),.6),c,mix(.30,1.,sqrt(near)));                                                                                     // far ranges go pale into the silk
      let sunlit=smoothstep(-.03,.07,(H-Hl)/max(.035,H))*smoothstep(.29,.66,fold);
      c=mix(c,GOLD,smoothstep((.003+.003*near)/zoom,.0,H-y)*sunlit*.70);
      c=mix(c,mix(SILK,vec3f(.90,.86,.74),.6),smoothstep(.16,.0,rel)*.75*(.6+.4*vnoise(vec2f(x*2.,f))));                                                  // mist lies along the feet
      col=mix(col,c,smoothstep(-.012/zoom,0.,y)); } }
  if(te>-1.6){ let an=atan2(qe.x,-qe.y); let rr=length(qe); let up=pow(max(cos(an*.85),0.),.6); let g=smoothstep(0.,.4,te)*(1.-smoothstep(1.6,3.4,te));
    let rch=(.12+.50*sqrt(max(te,0.)))*(.4+.9*fbm(vec2f(an*5.,te*.3+3.)))*up*g; let bd=smoothstep(rch,rch*.35,rr)*g;
    let hue=fbm(vec2f(an*2.3+5.,rr*5.-te*.5)); let wc=mix(vec3f(.93,.92,.84),mix(mix(vec3f(.74,.20,.11),GOLD,step(.5,hue)),mix(MA,AZ,step(.7,hue)),step(.6,hue)),.45*smoothstep(.35,.6,hue));
    col=mix(col,wc,clamp(bd*(.5+.8*fbm(vec2f(an*11.,rr*18.-te*2.))),0.,1.)); col=mix(col,vec3f(.10,.16,.22),.8*smoothstep(.010,.0,abs(rr-rch*.72))*g);
    let rg=length(qe*vec2f(1.,4.6)); let w=exp(-max(te,0.)*.3)*smoothstep(-.8,.3,te); col=mix(col,vec3f(.94,.90,.74),.5*w*(.5+.5*cos(rg*34.-te*9.))*smoothstep(max(te,0.)*.32+.10,max(te,0.)*.32-.04,rg)*smoothstep(.0,.03,rg)*step(hor,uv0.y));
    col=mix(col,vec3f(.90,.90,.80),.5*swell*exp(-re*re*14.)*step(hor,uv0.y)); }
  return col*(.97+.06*vnoise(uv0*vec2f(asp,1.)*5.));
}`;
