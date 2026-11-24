import { portraitStudy } from "../river/figure.js";
const sitter = new URLSearchParams(globalThis.location?.search).get("portrait") === "sitter";
const sitterRoom = sitter ? (await import("./visitor-sitter.js")).WINDOW_SITTER : "";
const study = portraitStudy ? await import("./visitor.js") : null;
export const VISITOR_MODEL = (study?.ATTENTIVE_VISITOR ?? "") + `
fn visitorDistance(pos:vec3f)->f32{
  ${study ? "if(anatomyStudy){return attentiveDistance(pos);}" : ""}
  var q=pos;
  // The nearer hand opens towards the questioner; only the arm follows this bend.
  let arm=smoothstep(.62,.90,q.x)*(1.-smoothstep(1.10,1.76,q.y));
  q.z+=.48*arm;
  q.x-=.11*arm;
  let bound=length((q-vec3f(0.,.08,0.))*vec3f(1.,.29,1.))-1.26;
  if(bound>.05){return bound*.252;}
  var d=bust(q)*.252;
  let leg=vec3f(abs(q.x)*.252,q.y*.252+.78,q.z*.252);
  d=min(d,figureCap(leg,vec3f(.072,.79,.02),vec3f(.095,.45,.006),mix(.055,.083,smoothstep(.44,.74,leg.y))));
  d=min(d,figureCap(leg,vec3f(.095,.45,.006),vec3f(.10,.082,.028),.033+.023*exp(-pow(abs(leg.y-.32)/.11,2.))));
  d=min(d,figureEll(leg-vec3f(.10,.055,-.026),vec3f(.051,.044,.104)));
  return d;
}
`;
// One room behind one window, as a signed distance field: walls with the window cut out, desk, screen, lamp, shelf, a person.
// Room space: x across the bay, y above the floor, z inward from the façade (the glass is at z = -0.06). It is the world shifted by r.org,
// so a ray leaving through the window goes on into the city (cityColor), and the glass reflects the room.
export const ROOM = /* wgsl */`
struct R { org:vec3f, flip:f32,
  fig:vec3f, figAmt:f32,     // the gold figure's light (room space) and its strength
  a:vec4f,                   // pose (0 seated, 1 standing at the window), hair, body scale, text tile
  b:vec4f,                   // screen on, lamp on, typed (hero: characters; others: 0..1), hero
  c:vec4f,                   // person x, person z, lean, seed
  d:vec4f,                   // near, far, glass reflection, exposure
  e:vec4f }                  // x Hopper (0 ink … 1 flat planes of light and shadow), y the lit trapezoid's lean
@group(0)@binding(3) var<uniform> r:R;

fn sdBox(p:vec3f,b:vec3f)->f32{ let q=abs(p)-b; return length(max(q,vec3f(0.)))+min(max(q.x,max(q.y,q.z)),0.); }
fn sdCap(p:vec3f,a:vec3f,b:vec3f,rad:f32)->f32{ let pa=p-a; let ba=b-a; return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.))-rad; }
const SX=.42; const LAMP=vec3f(-.98,1.2,2.62);

fn person(p0:vec3f)->f32{ let sc=r.a.z; var q=(p0-vec3f(r.c.x,0.,r.c.y))/sc; var d:f32; let k=.045;
  if(r.a.x<.5){ q.z-=r.c.z*max(q.y-.6,0.);                     // seated, facing the screen (+z)
    d=figureEll(q-vec3f(0.,1.237,.026),vec3f(.092,.127,.102));
    d=smin(d,figureEll(q-vec3f(0.,1.192,.079),vec3f(.071,.073,.058)),.021);
    d=smin(d,sdCap(q,vec3f(0.,1.251,.117),vec3f(0.,1.221,.150),.016),.014);
    d=smin(d,sdCap(q,vec3f(0.,1.0,0.),vec3f(0.,1.12,.015),.046),.03);
    d=smin(d,sdCap(q*vec3f(1.,1.,1.3),vec3f(0.,.6,0.),vec3f(0.,.98,0.),.165),k);
    d=smin(d,sdCap(q,vec3f(-.17,1.0,0.),vec3f(.17,1.0,0.),.075),k);
    let qa=vec3f(abs(q.x),q.y,q.z);
    d=smin(d,sdCap(qa,vec3f(.215,.98,0.),vec3f(.25,.74,.2),.05),k); d=smin(d,sdCap(qa,vec3f(.25,.74,.2),vec3f(.13,.8,.6),.04),.03);
    d=smin(d,sdCap(qa,vec3f(.1,.5,0.),vec3f(.1,.5,.42),.078),k); d=smin(d,sdCap(qa,vec3f(.1,.5,.42),vec3f(.1,.06,.46),.055),.03); }
  else { q.z=-q.z;                                             // standing at the window, looking out: weight on one leg, a hand on the sill, the other arm folded
    d=figureEll(q-vec3f(-.012,1.595,.018),vec3f(.089,.129,.099));
    d=smin(d,figureEll(q-vec3f(-.012,1.543,.063),vec3f(.068,.059,.064)),.023);
    d=smin(d,sdCap(q,vec3f(-.012,1.603,.109),vec3f(-.012,1.578,.142),.016),.012);
    d=smin(d,sdCap(q,vec3f(0.,1.42,0.),vec3f(-.008,1.5,.012),.043),.03);
    d=smin(d,sdCap(q*vec3f(1.,1.,1.35),vec3f(0.,1.2,0.),vec3f(0.,1.36,0.),.145),k);
    d=smin(d,sdCap(q,vec3f(-.165,1.405,0.),vec3f(.165,1.39,0.),.062),k);
    d=smin(d,sdCap(q*vec3f(1.,1.,1.3),vec3f(.02,1.02,0.),vec3f(.01,1.16,0.),.12),.06);
    let sk=q-vec3f(.03,0.,0.); let syk=clamp((1.0-sk.y)/.52,0.,1.); d=smin(d,max(length(vec2f(sk.x,sk.z*1.25))-mix(.15,.215,syk),max(sk.y-1.04,.47-sk.y)),.04);     // a skirt to below the knee
    d=smin(d,sdCap(q,vec3f(.085,.5,0.),vec3f(.095,.07,-.01),.05),.03); d=smin(d,sdCap(q,vec3f(-.07,.5,.04),vec3f(-.1,.07,.05),.047),.03);
    d=min(d,sdCap(q,vec3f(.095,.035,-.03),vec3f(.1,.035,.1),.04)); d=min(d,sdCap(q,vec3f(-.1,.035,.02),vec3f(-.12,.035,.15),.04));
    d=smin(d,sdCap(q,vec3f(.2,1.38,0.),vec3f(.25,1.12,.08),.046),k); d=smin(d,sdCap(q,vec3f(.25,1.12,.08),vec3f(.2,.94,.38),.038),.03);
    d=smin(d,sdCap(q,vec3f(-.2,1.39,0.),vec3f(-.22,1.13,.06),.046),k); d=smin(d,sdCap(q,vec3f(-.22,1.13,.06),vec3f(.03,1.1,.17),.038),.03); }
  let hy=select(1.235,1.6,r.a.x>.5);
  if(r.a.y>1.5){ d=smin(d,length(q-vec3f(0.,hy+.125,-.05))-.058,.02); }                                                   // hair in a knot
  else if(r.a.y>.5){ d=smin(d,sdCap(q,vec3f(0.,hy+.01,-.045),vec3f(0.,hy-.3,-.09),.095),.04); }                           // long hair
  return d*sc; }

// Return the colossal figure's coordinates at human scale, looking towards the seated writer.
fn figureSpace(p:vec3f)->vec3f {
  let x=(p.x-r.fig.x)*r.flip;
  let z=p.z-r.fig.z;
  return vec3f(x*r.e.y-z*r.e.z,p.y-.78,-(x*r.e.z+z*r.e.y))/.252;
}
${sitterRoom}
fn visitor(p:vec3f)->f32 {
  var q=figureSpace(p);
  ${sitter ? `let d=visitorDistance(q);
  if(r.figAmt>.999 || r.a.x>.5){return d;}
  let body=visitorBody(q);
  let hands=1.-smoothstep(.022,.105,abs(body.y-1.081));
  let head=smoothstep(1.37,1.47,body.y);
  let release=smoothstep(63.69,64.,u.t)*(1.-smoothstep(66.6,67.1,u.t));
  return d+(1.-r.figAmt)*(.096+.038*head+release*(.087*hands-.068*head));`
  : 'return visitorDistance(q)+(1.-select(r.figAmt,1.,r.a.x>.5))*.118;'}
}
fn roomDistance(p0:vec3f, withVisitor:bool)->vec2f{ var p=p0; p.x*=r.flip;
  let bi=sdBox(p-vec3f(0.,1.65,2.1),vec3f(1.52,1.61,2.1));
  var d=max(-bi,-(p.z+.22)); d=max(d,-sdBox(p-vec3f(0.,1.76,-.1),vec3f(1.02,.88,.3))); var m=1.;
  var e=min(sdBox(p-vec3f(0.,1.76,-.07),vec3f(.02,.88,.028)), max(sdBox(p-vec3f(0.,1.76,-.07),vec3f(1.04,.9,.03)),-sdBox(p-vec3f(0.,1.76,-.07),vec3f(.98,.84,.1))));
  e=min(e,sdBox(p-vec3f(0.,.86,-.2),vec3f(1.12,.03,.1))); if(e<d){ d=e; m=2.; }
  if(r.a.x<.5){
    e=sdBox(p-vec3f(.17,.725,2.62),vec3f(1.25,.035,.42)); e=min(e,sdBox(vec3f(abs(p.x-.17),p.y,p.z)-vec3f(1.18,.35,2.62),vec3f(.03,.35,.38))); if(e<d){ d=e; m=3.; }
    let monitor=p-vec3f(SX,1.3,2.9);
    e=sdBox(monitor,vec3f(.745,.409,.016))-.008;
    e=min(e,sdBox(p-vec3f(SX,.777,2.87),vec3f(.145,.011,.088))-.004); e=min(e,sdCap(p,vec3f(SX,.76,2.93),vec3f(SX,.95,2.93),.028)); if(e<d){ d=e; m=4.; }
    let keyboard=p-vec3f(.01,.774,2.37);
    e=sdBox(keyboard,vec3f(.293,.009,.092))-.006;
    if(e<d){d=e;m=12.;}
    e=sdBox(p-vec3f(r.c.x,.44,r.c.y-.02),vec3f(.23,.03,.23))-.01; e=min(e,sdBox(p-vec3f(r.c.x,.74,r.c.y-.26),vec3f(.2,.3,.022))-.012); e=min(e,sdCap(p,vec3f(r.c.x,.42,r.c.y),vec3f(r.c.x,.04,r.c.y),.03)); if(e<d){ d=e; m=8.; } }
  if(r.b.y>-.5){ e=length(p-LAMP)-.1; e=min(e,sdCap(p,LAMP-vec3f(0.,.1,0.),vec3f(LAMP.x,.77,LAMP.z),.012)); if(e<d){ d=e; m=5.; } }
  if(r.a.x<.5){ e=sdBox(p-vec3f(-.92,2.12,4.13),vec3f(.56,.6,.08)); if(e<d){ d=e; m=6.; } }
  else { // Hopper's room: an inner sill, a plain bed along the wall, a blind half drawn
    e=sdBox(p-vec3f(0.,.875,.07),vec3f(1.1,.02,.09)); if(e<d){ d=e; m=2.; }
    e=sdBox(p-vec3f(-.93,.27,2.75),vec3f(.56,.2,1.3))-.03; if(e<d){ d=e; m=9.; }
    e=min(sdBox(p-vec3f(0.,2.31,-.035),vec3f(1.0,.33,.006)),sdBox(p-vec3f(0.,1.975,-.035),vec3f(1.0,.014,.012))); if(e<d){ d=e; m=10.; } }
  e=person(p); if(e<d){ d=e; m=7.; }
  if(withVisitor && (r.figAmt>.04 || r.a.x>.5)){
    let gold=visitor(p0);
    if(gold<d){d=gold; m=11.;}
  }
  return vec2f(d,m); }
fn nrm(p:vec3f, visitorVisible:bool)->vec3f{ var n=vec3f(0.); for(var i=0;i<4;i++){ let e=.5773*(2.*vec3f(f32(((i+3)>>1)&1),f32((i>>1)&1),f32(i&1))-1.); n+=e*roomDistance(p+e*.0015,visitorVisible).x; } return normalize(n); }
fn shadow(p:vec3f, l:vec3f)->f32{ let dv=l-p; let dl=length(dv); let rd=dv/dl; var t=.03; var s=1.;
  for(var i=0;i<22;i++){ let h=roomDistance(p+rd*t,false).x; s=min(s,9.*h/t); t+=clamp(h,.02,.25); if(h<.002 || t>dl-.12){ break; } } return clamp(s,0.,1.); }

fn shadowP(p:vec3f, l:vec3f)->f32{ let dv=l-p; let dl=length(dv); let rd=dv/dl; var t=.06; var s=1.;      // the person's shadow only: a clean hard shape
  for(var i=0;i<26;i++){ let h=person(p+rd*t); if(h<.003){ return 0.; } s=min(s,22.*h/t); t+=clamp(h,.02,.3); if(t>dl-.1){ break; } } return smoothstep(.15,.5,s); }
fn shade(p:vec3f, n:vec3f, m:f32, rd:vec3f, full:bool)->vec3f{ var q=p; q.x*=r.flip; var nn=n; nn.x*=r.flip;
  if(m==11.){
    let model=figureSpace(p);
    ${sitter ? `if(r.a.x>.5){return glassSitterPaint(model,n);}
    return seatedSitterPaint(model,n,rd);` : `
    let key=normalize(vec3f(-.65*r.flip,.56,-.54));
    let lit=smoothstep(-.38,.94,dot(n,key));
    let rim=pow(1.-abs(dot(n,rd)),3.);
    let base=mix(vec3f(.014,.012,.010),vec3f(.53,.39,.21),lit*lit);
    let highlight=pow(max(dot(n,normalize(key-rd)),0.),22.);
${study ? `    if(anatomyStudy){
      let body=visitorBody(model);
      let skin=body.y>1.362 || (body.y>1.0 && body.y<1.20 && visitorHands(body)<.013);
      let meeting=normalize(vec3f(-.78*r.flip,.41,.65));
      let plane=clamp(.43+.57*dot(n,meeting),0.,1.);
      let cloth=mix(vec3f(.012,.015,.017),vec3f(.123,.099,.065),plane*plane);
      let fold=body.x+.079-.124*smoothstep(.89,1.34,body.y);
      let opening=smoothstep(.009,.002,abs(fold))*smoothstep(-.06,-.11,body.z)
                 *smoothstep(.64,.73,body.y)*(1.-smoothstep(1.28,1.37,body.y));
      let hem=smoothstep(.012,.002,abs(body.y-(.693+.047*body.x)))*(1.-smoothstep(.17,.21,abs(body.x)));
      let throatShadow=exp(-48.*abs(body.y-1.320))*exp(-90.*dot(body.xz,body.xz));
      let seamShade=exp(-30.*abs(body.x-.10+.20*(body.y-.74)))*smoothstep(.75,.86,body.y)*(1.-smoothstep(1.12,1.24,body.y));
      var color=cloth*(1.-.24*opening-.17*hem-.32*throatShadow-.13*seamShade);
      if(body.y<.68){color*=.72;}
      if(skin){
        color=mix(vec3f(.048,.042,.032),vec3f(.42,.309,.174),plane*plane);
        color*=.71+.29*smoothstep(1.385,1.43,body.y)+.29*(1.-smoothstep(1.19,1.23,body.y));
        if(body.y>1.411){color=eyeColor(visitorHead(model),color);}
      }
      let glancing=pow(clamp(1.-abs(dot(n,rd)),0.,1.),4.);
      color+=vec3f(.55,.41,.225)*glancing*(.13+.18*plane);
      if(r.a.x>.5){
        let painted=mix(vec3f(.086,.066,.039),vec3f(.380,.283,.149),smoothstep(.41,.52,plane));
        color=mix(color,painted,.57);
        if(body.y>1.411){color=eyeColor(visitorHead(model),color);}
        return color;
      }
      return color*r.figAmt;
    }
` : ""}
    if(r.a.x>.5){
      let plane=mix(vec3f(.15,.12,.07),vec3f(.52,.39,.19),smoothstep(.20,.36,lit));
      return select(plane,eyeColor(model,plane),anatomyStudy);
    }
    return eyeColor(model,base+vec3f(.92,.81,.60)*(.18*highlight+.08*rim))*r.figAmt;`}
  }
  var alb=.5; var em=vec3f(0.);
  let wash=.75+.5*fbm(q.xy*1.7+q.z*1.3+r.c.w*9.);
  if(m<1.5){ alb=.42*wash; if(nn.y>.7){ alb=.2+.1*step(.5,fract(q.x*2.3+.2*vnoise(q.xz*3.)))+.05*vnoise(q.xz*vec2f(30.,2.)); }
    if(q.z<-.18 || (q.z<.02 && nn.z<-.5)){ alb=.11*wash; } }
  else if(m<2.5){ alb=.12+.11*pow(1.-abs(dot(n,rd)),3.); } else if(m<3.5){ alb=.16+.05*vnoise(q.xz*vec2f(40.,3.)); }
  else if(m<4.5){ alb=.04;
    if(nn.z<-.5 && abs(q.x-SX)<.74 && abs(q.y-1.3)<.4){ let c=(q.xy-vec2f(SX,1.3))/vec2f(.74,.4); let uvs=vec2f(c.x*r.flip*.5+.5,.5-c.y*.5);
      let tile=r.a.w; let tuv=(vec2f(tile%2.,floor(tile/2.))+uvs)/vec2f(2.,5.); var a=textureSampleLevel(txt,smp,tuv,0.).r; let line=step(.5,uvs.y);
      if(r.b.w>.5){ let cp=(uvs.x*1024.-64.)/128.; let nch=select(min(r.b.z,6.),max(r.b.z-6.,0.),line>.5); a*=step(cp,nch);
        let cx=64.+128.*select(r.b.z,r.b.z-6.,r.b.z>6.); let cl=select(0.,1.,r.b.z>6.); let cy=uvs.y*512.-(150.+cl*190.); a=max(a,u.misc2.y*step(abs(uvs.x*1024.-cx-10.),5.)*step(abs(cy),62.)); }
      else { a*=step(uvs.x,clamp(r.b.z*2.-line,0.,1.)*1.02); }
      em=PAPER*.62*(1.-.22*dot(c,c))*(1.-.95*a)*r.b.x; alb=.02; } }
  else if(m<5.5){ alb=.3; if(length(q-LAMP)<.12){ em=PAPER*.8*max(r.b.y,0.); } }
  else if(m<6.5){ let row=fract((q.y-1.52)/.4); let bk=hash11(floor(q.x*27.)+floor((q.y-1.52)/.4)*31.+r.c.w*91.); alb=mix(.07,.5,bk)*step(.16,row)+.05*step(row,.16); if(nn.z>-.5){ alb=.08; } }
  else if(m<7.5){
    let local=(q-vec3f(r.c.x,0.,r.c.y))/r.a.z;
    let headY=select(1.235,1.595,r.a.x>.5);
    let front=local.z*select(1.,-1.,r.a.x>.5);
    let hairline=headY+.050+.36*min(front,.10);
    let hair=max(smoothstep(hairline-.01,hairline+.01,local.y),
                 smoothstep(.005,-.07,front)*smoothstep(headY-.08,headY-.02,local.y));
    alb=.064+.028*vnoise(vec2f(local.y*15.+local.x*4.,local.x*7.));
    if(local.y>headY-.115){alb=mix(.34,.047,hair);}
  }
  else if(m==12.){
    let local=(q.xz-vec2f(.01,2.37))/vec2f(.036,.035);
    let keycap=abs(fract(local+.5)-.5);
    let relief=1.-smoothstep(.35,.47,max(keycap.x,keycap.y));
    alb=.065+.1*relief+.05*relief*smoothstep(-.25,.4,fract(local.y+.5)-.5);
  }
  else { alb=.05; }
  var col=vec3f(0.);
  // the screen lights what is in front of it; the lamp; the figure; a little night through the window
  let ls=vec3f(SX*r.flip,1.3,2.74); var dv=ls-p; var d2=dot(dv,dv); var l=dv/sqrt(d2);
  col+=PAPER*r.b.x*.75*max(dot(n,l),0.)*smoothstep(-.05,.5,dv.z)/(d2+.25);
  let ll=vec3f(LAMP.x*r.flip,LAMP.y,LAMP.z); dv=ll-p; d2=dot(dv,dv); l=dv/sqrt(d2); col+=PAPER*max(r.b.y,0.)*.26*(.25+.75*max(dot(n,l),0.))/(d2+.2);
  if(r.figAmt>.002){ let lf=r.fig; dv=lf-p; d2=dot(dv,dv); l=dv/sqrt(d2); var sh=1.; if(full){ sh=.25+.75*shadow(p+n*.01,lf); }
    col+=GOLD*r.figAmt*select(.8,.28,anatomyStudy)*(.18+.82*max(dot(n,l),0.))*sh/(d2+.35); }
  col+=SILVER*.012*(.4+.6*max(dot(n,normalize(vec3f(0.,.3,-1.))),0.))*smoothstep(4.,0.,p.z);
  col*=alb;
  col*=mix(1.,.4,pow(1.-abs(dot(n,rd)),2.2));         // the wash pools at the edges of things
  col+=em;
  if(r.e.x>.001){ // Hopper
    let L=vec3f(1.35*r.flip,2.55,3.9); let dvh=L-p; let lh=normalize(dvh); let ndl=dot(n,lh);
    // the light comes through a tall opening: a rectangle in the plane z = 3.2 in front of the lamp
    let tz=(3.2-L.z)/(-lh.z+1e-5); let ap=L-lh*tz; let inAp=smoothstep(.0,.03,min(min(ap.x*r.flip-(-.2),1.25-ap.x*r.flip),min(ap.y-.15,2.5-ap.y)));
    var lit=inAp*smoothstep(.0,.08,ndl); if(m>6.5 && m<7.5){ lit=smoothstep(.05,.2,ndl); } else if(lit>.01 && full){ lit*=shadowP(p+n*.02,L); }
    var a=vec3f(.83,.78,.5); var b=vec3f(.2,.33,.3);                       // wall: pale yellow-green in light, deep green in shadow
    if(m<1.5){ if(nn.y>.7){ a=vec3f(.56,.3,.17); b=vec3f(.17,.11,.1); } else if(nn.y<-.7){ a=vec3f(.6,.6,.45); b=vec3f(.16,.24,.23); }
      else if(abs(nn.z)>.7 && q.z<.3){ a=vec3f(.74,.72,.5); b=vec3f(.13,.25,.24); } }
    else if(m<2.5){ a=vec3f(.5,.5,.38); b=vec3f(.07,.15,.14); }
    else if(m<6.5){ a=vec3f(.5,.27,.16); b=vec3f(.15,.1,.09); }
    else if(m<7.5){ a=vec3f(.72,.2,.15); b=vec3f(.27,.07,.09);                 // a red dress
      let hy=select(1.13,1.49,r.a.x>.5)*r.a.z; if(q.y>hy){ a=vec3f(.85,.63,.47); b=vec3f(.36,.25,.22); if(r.a.y>.5 && (q.y>hy+.2 || (q.z-r.c.y)*select(-1.,1.,r.a.x>.5)>.02)){ a=vec3f(.3,.17,.1); b=vec3f(.09,.06,.06); } }
      let ql=(q-vec3f(r.c.x,0.,r.c.y))/r.a.z;
      if(r.a.x>.5 && ((ql.y<.47 && ql.y>.085) || (abs(ql.x)>.185 && ql.y<1.3 && ql.y>.5) || (ql.z<-.1 && ql.y>.9 && ql.y<1.2))){ a=vec3f(.85,.63,.47); b=vec3f(.36,.25,.22); }    // legs and bare arms
      if(q.y<.085){ a=vec3f(.2,.12,.1); b=vec3f(.07,.05,.05); } }
    else if(m>8.5 && m<9.5){ a=vec3f(.88,.86,.76); b=vec3f(.3,.41,.42); if(q.y<.24){ a=vec3f(.42,.26,.16); b=vec3f(.14,.1,.09); } }      // the bed: a white sheet over a dark frame
    else if(m>9.5){ a=vec3f(.86,.8,.52); b=vec3f(.46,.5,.36); }                                                                                 // the blind
    var hc=mix(b,a,lit)*(.94+.1*vnoise(q.xy*5.+q.z*3.))*(.97+.06*vnoise(vec2f(q.x+q.z,q.y)*vec2f(70.,9.)));
    hc*=.9+.1*smoothstep(-.2,.9,ndl);
    col=mix(col,pow(hc,vec3f(2.2)),r.e.x); }
  return col; }

struct RO{ @location(0) c:vec4f, @builtin(frag_depth) z:f32 }
@fragment fn fs_room(@builtin(position) fc:vec4f)->RO{ var o:RO;
  let ndc0=(fc.xy-.5*u.res)/(.5*u.res.y); let wv=(vec2f(vnoise(ndc0*38.+3.),vnoise(ndc0*38.+71.))-.5)*.0036*(1.-u.s); let ndc=ndc0+wv;
  let rd0=normalize(u.fw+(u.rt*ndc.x-u.up*ndc.y)*u.tanh); let ro0=u.ro-r.org;
  let inside=ro0.z>-.2 && abs(ro0.x)<1.6;
  let tg=(-.06-ro0.z)/rd0.z; let pg=ro0+rd0*tg; let inHole=tg>0. && abs(pg.x)<1.02 && abs(pg.y-1.76)<.88;
  var col=vec3f(0.); var depth=1.; var ro=ro0; var rd=rd0; var wgt=1.; var out=false;
  ${sitter ? "var glassThrough=1.;" : ""}
  // does the ray come anywhere near this room? If not, it is the city's
  { let bc=vec3f(0.,1.7,1.95); let bh=vec3f(1.8,1.9,2.45); let m=1./select(rd0,vec3f(1e-6),abs(rd0)<vec3f(1e-6)); let k=abs(m)*bh; let nn=m*(ro0-bc); let t1=-nn-k; let t2=-nn+k;
    if(max(max(t1.x,t1.y),t1.z)>min(min(t2.x,t2.y),t2.z) || min(min(t2.x,t2.y),t2.z)<0.){ out=true; } }
  if(!out){
  // bounce 0: the view. bounce 1 (only for rays that left through the glass): the room mirrored in the window
  for(var bounce=0;bounce<2;bounce++){ var t=0.; var m=0.; let ins=inside && bounce==0;
    for(var i=0;i<90;i++){ let p=ro+rd*t; if(ins && p.z<-.34){ m=-1.; break; } let h=roomDistance(p,r.a.x<.5 || bounce==1); if(h.x<.0012+.0012*t){ m=h.y; break; } t+=h.x; if(t>16.){ break; } }
    if(m>0.){ let p=ro+rd*t;
      if(bounce==0 && !inside && m<1.5 && p.z<-.19){ out=true; let zw=t*dot(rd,u.fw); depth=r.d.y*(zw-r.d.x)/((r.d.y-r.d.x)*zw); break; }          // the outside wall belongs to the façade (but still hides what is behind it)
      let n=nrm(p,r.a.x<.5 || bounce==1); var c=shade(p,n,m,rd,bounce==0);
      if(bounce==0){ if(!inside && inHole && t>tg){ c=c*.94+SILVER*(.004*(1.+2.*pow(1.-abs(rd.z),3.))+1.5*moonFace((vec2f(pg.x*r.flip,pg.y)-PANE)/.2)*u.misc3.z*(1.-.86*r.b.x)); }
        let zv=t*dot(rd,u.fw); let nf=r.d.xy; depth=nf.y*(zv-nf.x)/((nf.y-nf.x)*zv); }
      ${sitter ? `if(bounce==1 && m==11.){
        // A strong reflection suppresses the brighter panes at the silhouette,
        // while the cool city still shows through its shadow.
        let face=smoothstep(1.34,1.45,p.y);
        glassThrough=mix(.13,.022,face)*(.72+.28*abs(rd0.z));
      }` : ""}
      col+=c*wgt; break; }
    if(bounce==1){ break; }
    out=true; if(!(inHole && r.d.z>0.)){ break; }
    ro=pg+vec3f(rd0.x,rd0.y,-rd0.z)*.02; rd=vec3f(rd0.x,rd0.y,-rd0.z); wgt=r.d.z; }
  }
  if(out){ var cro=u.ro; if(inside){ cro=u.ro+rd0*max(tg,0.); } var cc=cityColor(cro,rd0)*select(1.,.92,inside);
    if(r.e.x>.001){ let lum=dot(cc,vec3f(.3,.5,.2)); let flat=mix(mix(vec3f(.012,.03,.05),vec3f(.03,.07,.085),smoothstep(.004,.012,lum)),vec3f(.9,.62,.22),smoothstep(.05,.13,lum)); cc=mix(cc,flat,r.e.x); }
    col+=cc${sitter ? "*glassThrough" : ""}; }
  o.c=vec4f(col*r.d.w*mix(paper(fc.xy),1.,r.e.x*.6),u.misc3.w); o.z=clamp(depth,0.,1.); return o; }
`;

// The gold "me": real glyphs from the atlas, their motion a pure function of time (no state), so any frame can be drawn on its own.
// They pour out of the screen's light, gather into a standing figure, and on release come apart, drift and go dark.
// One path crosses between the featured rooms; the remaining paths carry sparks across the street.
export const WINDOW_PATH_COUNT = 19;
export const GLYPHS = /* wgsl */`
struct P { vp:mat4x4f, rt:vec4f, up:vec4f, org:vec4f, fig:vec4f, src:vec4f, m:vec4f, n:vec4f, snk:vec4f }
// rt.w glyph size, up.w time, org.w flip, fig.w yaw, src: where they pour from, m: tf (s since the stream began), tr (s since release), brightness, mirror in the glass;
// n: figure scale, mode (0 figure, 2 stream along cp), source spread x, y; snk: where the sparks leave (xyz) and the share that become sparks; in mode 2 m.x is seconds into the flight and snk.x its length
@group(0)@binding(0) var<uniform> P_:P; @group(0)@binding(1) var gs:sampler; @group(0)@binding(2) var atlas:texture_2d<f32>;
@group(0)@binding(3) var<uniform> routes:array<array<vec4f,8>,${WINDOW_PATH_COUNT}>;
struct VO{ @builtin(position) pos:vec4f, @location(0) uv:vec2f, @location(1) col:vec3f }
fn h1(x:f32)->f32{ return fract(sin(x*127.1+17.3)*43758.5453); }
fn cr(a:vec3f,b:vec3f,c:vec3f,d:vec3f,f:f32)->vec3f{ let f2=f*f; let f3=f2*f; return .5*((2.*b)+(-a+c)*f+(2.*a-5.*b+4.*c-d)*f2+(-a+3.*b-3.*c+d)*f3); }
@vertex fn vs(@builtin(vertex_index) vi:u32, @location(0) tg:vec4f, @location(1) ex:vec4f)->VO{ var o:VO;
  let seed=tg.w; let cell=ex.x; let order=ex.y; let tf=P_.m.x; let tr=P_.m.y; let t=P_.up.w;
  let r1=h1(seed); let r2=h1(seed+1.7); let r3=h1(seed+3.1); let r4=h1(seed+4.3); let r5=h1(seed+5.9); let r6=h1(seed+7.7);
  var pos:vec3f; var col:vec3f; var vis=1.; var fade=1.; var ang=0.; var grow=1.;
  if(P_.n.y>1.5){ // the sparks in flight: a loose braid along the curve, each glyph on its own delay
    let uu=(tf-r1*1.7-r2*r2*.8)/P_.snk.x; let uc=clamp(uu,0.,.9999); let sg=min(floor(uc*5.),4.); let f=uc*5.-sg; let i0=i32(sg);
    let path=u32(P_.src.w);
    pos=cr(routes[path][i0].xyz,routes[path][i0+1].xyz,routes[path][i0+2].xyz,routes[path][i0+3].xyz,f);
    let rad=(.12+.55*sin(3.14159*uc))*sqrt(r4); let a=seed*2.4+uc*(5.+4.*r5)+t*.4;
    pos+=vec3f(cos(a),sin(a)*.8,cos(a*1.3+1.))*rad;
    vis=smoothstep(0.,.02,uu)*(1.-smoothstep(.975,1.,uu)); ang=(r6-.5)*t*1.5;
    col=mix(vec3f(1.,.72,.3),vec3f(1.,.5,.16),r3*.6)*(.5+1.1*r2); }
  else {
    let cy=cos(P_.fig.w); let sy=sin(P_.fig.w); let tl=tg.xyz*P_.n.x;
    let tgt=vec3f(tl.x*cy+tl.z*sy,tl.y,-tl.x*sy+tl.z*cy)+P_.fig.xyz;
    let delay=${sitter ? `.075+.54*smoothstep(1.33,1.55,tl.y)+.51*(1.-smoothstep(.27,1.25,tl.y))+.41*r1` : '.1+.75*order+.55*r1'}; let tau=.95+.5*r2; let a=clamp((tf-delay)/tau,0.,1.); let e=a*a*a*(a*(a*6.-15.)+10.);
    let src=P_.src.xyz+vec3f((r3-.5)*P_.n.z,(r4-.5)*P_.n.w,-.03);
    let w=sin(3.14159*a);
    pos=mix(src,tgt,e)+w*(vec3f(sin(seed*91.+tf*1.7),cos(seed*57.+tf*1.3),sin(seed*33.+tf*2.1))*.2+vec3f(0.,.2*(r5-.2),-.1-.16*r6));
    pos+=e*.007*vec3f(sin(t*1.7+seed*40.),sin(t*1.3+seed*23.),cos(t*1.9+seed*71.));
    vis=smoothstep(0.,.07,a)*(.55+.45*e)+.6*w;
    // release: from the head down each glyph lets go. Some drift, turn and go dark; the rest are sparks and make for the window
    let b=max(tr-(${sitter ? `.16+.57*r5+.73*smoothstep(1.32,1.50,tl.y)
                +.50*(1.-smoothstep(.62,1.03,tl.y))-.14*exp(-34.*abs(tl.y-1.08))` : 'r5*1.25+(1.-order)*.55'}),0.);
    let outw=normalize(tl-vec3f(0.,1.05,0.)+vec3f(r3-.5,r4-.5,r6-.5)*.8); let ow=vec3f(outw.x*cy+outw.z*sy,outw.y,-outw.x*sy+outw.z*cy);
    pos+=ow*(.11*b+.02*b*b)+vec3f(sin(seed*13.+b*1.3)*.07*b,.09*b+.015*b*b,cos(seed*29.+b*1.1)*.07*b-.05*b);
    ang=(r6-.5)*3.2*b; grow=1.+.25*smoothstep(0.,2.,b);
    col=vec3f(1.,.84,.58)*(.45+.8*r2);
    ${study ? `
    let radial=normalize(vec2f(tl.x,1.65*(tl.z-.018)) + vec2f(1e-5));
    var outward=vec3f(P_.org.w*(radial.x*cy+radial.y*sy),0.,-radial.x*sy+radial.y*cy);
    if(P_.m.w>.5){outward.z=-outward.z;}
    let grazing=1.-abs(dot(outward,cross(P_.rt.xyz,P_.up.xyz)));
    let settled=smoothstep(.64,1.,a)*(1.-smoothstep(.04,.58,b));
    vis*=mix(1.,.07+.72*pow(clamp(grazing,0.,1.),2.),settled);
    ${sitter ? `let face=smoothstep(1.38,1.48,tl.y);
    let atRest=smoothstep(.70,.98,a)*(1.-smoothstep(.035,.40,b));
    let nape=exp(-185.*abs(tl.y-1.398))*(1.-smoothstep(-.12,-.015,tl.z));
    vis*=1.-min(.95,face*.88+nape*.82)*atRest;` : ""}` : ""}
    if(r3<P_.snk.w){ let b2=max(b-.35,0.); let w2=smoothstep(0.,1.5,b2); pos=mix(pos,P_.snk.xyz+vec3f((r4-.5)*.9,(r6-.5)*.7,0.),w2*w2*(3.-2.*w2)); fade=1.-smoothstep(1.35,1.6,b2); col=mix(col,vec3f(1.,.5,.16)*(.5+1.1*r2),w2); }
    else { fade=exp(-b*.85)*(1.-smoothstep(2.4,3.6,b)); col=mix(col,vec3f(.5,.5,.52)*.12,smoothstep(0.,1.6,b)); } }
  pos.x*=P_.org.w; if(P_.m.w>.5){ pos.z=-.12-pos.z; }
  var ia=array<u32,6>(0u,1u,2u,2u,1u,3u); let idx=ia[vi]; let cc=vec2f(f32(idx&1u),f32((idx>>1u)&1u));
  let q=(cc-.5)*2.; let ca=cos(ang); let sa=sin(ang); let qr=vec2f(q.x*ca-q.y*sa,q.x*sa+q.y*ca)*P_.rt.w*(.65+.8*r4)*grow;
  let wp=pos+P_.org.xyz+P_.rt.xyz*qr.x+P_.up.xyz*qr.y;
  o.pos=P_.vp*vec4f(wp,1.); o.uv=(vec2f(cell%32.,floor(cell/32.))+vec2f(cc.x,1.-cc.y)*.94+.03)/32.;
  o.col=col*vis*fade*P_.m.z*(.8+.2*sin(t*2.3+seed*50.)); return o; }
@fragment fn fs(i:VO)->@location(0) vec4f{ let a=textureSample(atlas,gs,i.uv).r; return vec4f(i.col*a,0.); }
`;
