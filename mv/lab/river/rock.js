// 人开口了十万年 / 才有文字记下传说: a line animation in the manner of rock art (ochre and ink), which turns into ink-painted objects:
// the clay tablet, the hieroglyphic wall, the oracle bone. U.c,U.d = eight cuneiform cells; U.e,U.f = eight hieroglyph cells; U.b.y = first oracle-bone cell.
import { HEAD } from "./night.js";
export const ROCK_FS = HEAD + `
const OCHRE=vec3f(.60,.25,.12);
fn paper(p:vec2f)->vec3f{ let f1=fbm(p*1.2); let f2=fbm(p*9.); let fib=pow(vnoise(vec2f(p.x*40.+p.y*8.,p.y*4.)),5.)+pow(vnoise(vec2f(p.x*5.+31.,p.y*36.-p.x*9.)),5.);
  return vec3f(.915,.888,.815)*(1.+.05*(f1-.5)+.03*(f2-.5)+.012*fib); }
fn br(p:vec2f,a:vec2f,b:vec2f,w:f32)->f32{ let d=seg(p,a,b,0.); let n=vnoise(p*90.)*.5+vnoise(p*31.)*.5; return smoothstep(w*(1.05+.5*(n-.5)),w*.45,d); }      // a brushed line
// a little figure: feet at (0,0), one unit tall; face = ±1 which way it looks; a1 = angle of the forward arm; bob = how much it is speaking
fn man(w:vec2f,base:vec2f,s:f32,face:f32,a1:f32,lean:f32,bob:f32,rev:f32)->f32{ let p=(w-base)/s; if(abs(p.x)>.9||p.y<-.1||p.y>1.2){ return 0.; }
  let hip=vec2f(.038*face*lean,.46);
  let neck=vec2f(lean*face*.15,.80+bob*.012);
  let head=neck+vec2f(face*.035,.103);
  var profile=(p-head)*vec2f(face,1.);
  let skull=length(profile/vec2f(.080,.10));
  let jaw=br(profile,vec2f(.058,.003),vec2f(.048,-.068+.009*bob),.029);
  var m=max(smoothstep(1.,.82,skull),jaw);
  m=max(m,br(profile,vec2f(.056,.025),vec2f(.095,-.006),.018));
  let backKnee=hip+vec2f(-face*.115,-.21);
  let foreKnee=hip+vec2f(face*.115,-.19);
  m=max(m,br(p,hip,neck,.052));
  m=max(m,max(br(p,hip,backKnee,.042),br(p,backKnee,vec2f(-face*.18,0.),.032)));
  m=max(m,max(br(p,hip,foreKnee,.045),br(p,foreKnee,vec2f(face*.145,0.),.031)));
  let shoulder=neck-vec2f(0.,.052);
  let elbow=shoulder+vec2f(face*cos(a1-.25),sin(a1-.25))*.18;
  let wrist=elbow+vec2f(face*cos(a1+.22),sin(a1+.22))*.16;
  m=max(m,max(br(p,shoulder,elbow,.037),br(p,elbow,wrist,.028)));
  m=max(m,br(p,wrist,wrist+vec2f(face*.076,.018),.013));
  m=max(m,br(p,shoulder,hip-vec2f(face*.085,-.05),.028));
  return m*smoothstep(0.,1.,rev); }
fn mouthOf(base:vec2f,s:f32,face:f32,lean:f32)->vec2f{ return base+vec2f(lean*face*.12+face*.11,.90)*s; }
fn dashes(w:vec2f,m:vec2f,face:f32,age:f32)->f32{ if(age<=0.||age>.8){ return 0.; } var a=0.; for(var j=0;j<3;j++){ let an=(f32(j)-1.)*.38+.12; let d=vec2f(cos(an)*face,sin(an)); let c=m+d*(.05+.30*age);
    a=max(a,br(w,c-d*.022,c+d*.022,.0095)); } return a*(1.-smoothstep(.45,.8,age)); }
fn beast(w:vec2f,c:vec2f,s:f32)->f32{ let p=(w-c)/s; if(abs(p.x)>1.||abs(p.y)>.8){ return 0.; }
  var b=br(p,vec2f(-.42,.10),vec2f(-.10,.22),.03); b=max(b,br(p,vec2f(-.10,.22),vec2f(.28,.16),.03)); b=max(b,br(p,vec2f(.28,.16),vec2f(.50,.30),.03)); b=max(b,br(p,vec2f(.50,.30),vec2f(.62,.20),.026));
  b=max(b,br(p,vec2f(.62,.20),vec2f(.46,.10),.024)); b=max(b,br(p,vec2f(-.42,.10),vec2f(-.36,-.10),.028)); b=max(b,br(p,vec2f(-.36,-.10),vec2f(.30,-.08),.026)); b=max(b,br(p,vec2f(.30,-.08),vec2f(.46,.10),.026));
  b=max(b,br(p,vec2f(-.30,-.10),vec2f(-.34,-.42),.024)); b=max(b,br(p,vec2f(-.18,-.10),vec2f(-.14,-.42),.024)); b=max(b,br(p,vec2f(.20,-.08),vec2f(.16,-.42),.024)); b=max(b,br(p,vec2f(.30,-.08),vec2f(.36,-.42),.024));
  b=max(b,br(p,vec2f(.52,.30),vec2f(.60,.48),.02)); b=max(b,br(p,vec2f(.60,.48),vec2f(.74,.52),.018)); b=max(b,br(p,vec2f(.48,.30),vec2f(.50,.50),.02)); b=max(b,br(p,vec2f(-.42,.10),vec2f(-.56,-.04),.018)); return b; }
fn wet(w:vec2f,rev:f32)->f32{ let n=fbm(w*3.1)*.6+fbm(w*11.)*.4; return smoothstep(n-.05,n+.22,rev*1.35); }                               // ink soaking in
fn rbox(v:vec2f,h:vec2f,r:f32)->f32{ let q=abs(v)-h+r; return length(max(q,vec2f(0.)))+min(max(q.x,q.y),0.)-r; }
fn pick8(h:f32,a:vec4f,b:vec4f)->f32{ let i=u32(h*7.99); if(i<4u){ return a[i]; } return b[i-4u]; }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let t=U.a.x; let p=scr(fc);
  let k1=smoothstep(21.3,22.4,t); let k2=smoothstep(23.2,25.0,t); let up=smoothstep(25.9,27.1,t);
  let cen=mix(mix(vec2f(.12,-.16),vec2f(2.30,-.10),k1),vec2f(3.6,.0),k2)+vec2f(0.,2.3*up*up); let zoom=mix(mix(1.28,1.7,k1),1.,k2); let w=cen+p/zoom;
  var col=paper(w);
  // the rock: the faintest wash where the figures are, a darker one where the wall is
  col*=1.-.07*smoothstep(1.7,.2,length((w-vec2f(.1,-.1))*vec2f(.6,1.)))*smoothstep(19.,20.2,t)*(.6+.8*fbm(w*2.3));
  var ink=0.; var och=0.;
  let tk=(t-18.98)/.405; let beat=fract(tk);
  // four round a fire: one points at the beast and names it, one answers; a child copies the grown-up's mouth
  let r0=smoothstep(19.0,19.6,t); let r1=smoothstep(19.15,19.75,t); let r2=smoothstep(19.3,19.9,t); let r3=smoothstep(19.45,20.05,t);
  let sp=array<i32,8>(0,1,0,1,2,3,2,3); var who=-1; if(tk>=0.&&tk<8.){ who=sp[u32(tk)]; }
  let b0=select(0.,sin(beat*18.),who==0); let b1=select(0.,sin(beat*18.),who==1); let b2=select(0.,sin(beat*18.),who==2); let b3=select(0.,sin(beat*18.),who==3);
  och=max(och,man(w,vec2f(-.98,-.62),.44,1.,.42+.10*b0,.4,b0,r0)); ink=max(ink,man(w,vec2f(-.42,-.62),.42,-1.,-.5+.5*max(b1,0.),.3,b1,r1));
  ink=max(ink,man(w,vec2f(.74,-.62),.44,-1.,-.2+.2*b2,.9,b2,r2)); och=max(och,man(w,vec2f(.36,-.62),.27,1.,.1+.5*max(b3,0.),.2,b3,r3));
  och=max(och,beast(w,vec2f(1.20,.30),.52)*smoothstep(19.5,20.4,t));
  // the fire: a few ochre tongues, and the sticks
  { let f=w-vec2f(-.02,-.60); for(var i=0;i<4;i++){ let fi=f32(i); let x0=(fi-1.5)*.045; let h=.13+.07*sin(t*9.+fi*2.1)+.04*sin(t*15.+fi); och=max(och,br(f,vec2f(x0,0.),vec2f(x0*.4+.02*sin(t*7.+fi),h),.014)*smoothstep(19.2,19.8,t)); }
    ink=max(ink,max(br(f,vec2f(-.11,-.035),vec2f(.10,.02),.012),br(f,vec2f(-.09,.02),vec2f(.11,-.035),.012))*smoothstep(19.1,19.7,t)); }
  // what they say: a few short strokes at the mouth, which drift off and are gone
  for(var k=0;k<8;k++){ let age=t-(18.98+f32(k)*.405); let s=sp[k]; var m=mouthOf(vec2f(-.98,-.62),.44,1.,.4); var fa=1.;
    if(s==1){ m=mouthOf(vec2f(-.42,-.62),.42,-1.,.3); fa=-1.; } if(s==2){ m=mouthOf(vec2f(.74,-.62),.44,-1.,.9); fa=-1.; } if(s==3){ m=mouthOf(vec2f(.36,-.62),.27,1.,.2); }
    ink=max(ink,dashes(w,m,fa,age)); }
  // 才有文字: one of them turns to the rock; the strokes from the mouth land on it, and stay
  let r4=smoothstep(21.2,21.9,t); let scr0=vec2f(2.02,-.62); och=max(och,man(w,scr0,.44,1.,.55+.12*sin(t*11.)*step(22.,t)*step(t,23.5),.5,sin(t*9.),r4));
  let m4=mouthOf(scr0,.44,1.,.5); let keep=1.-smoothstep(23.3,24.0,t);
  for(var i=0;i<9;i++){ let fi=f32(i); let t0=22.0+fi*.15; let a=clamp((t-t0)/.38,0.,1.); if(t<t0){ continue; } let slot=vec2f(2.36+f32(i%3)*.085+.01*sin(fi*5.), .16-f32(i/3)*.10);
    let c=mix(m4,slot,a*a*(3.-2.*a)); let d=mix(vec2f(.022,.006),vec2f(.004,.03),a); ink=max(ink,br(w,c-d,c+d,.0095)*keep); }
  col=mix(col,col*OCHRE*1.08,och*.92); col*=1.-.90*ink;
  // and the marks are writing: a clay tablet, a wall of hieroglyphs, an oracle bone, each coming up out of wet ink
  { let v=w-vec2f(2.50,-.02); let d=rbox(v,vec2f(.33,.42),.10); let rv=wet(w,smoothstep(23.2,24.1,t)); if(d<.02&&rv>0.){ let inb=smoothstep(.0,-.012,d);
      var c=mix(vec3f(1.),vec3f(.62,.60,.56)*(.85+.3*fbm(w*7.)),inb); c*=1.-.75*smoothstep(.022,.0,abs(d))*(.6+.6*vnoise(w*40.)); c*=1.-.25*smoothstep(-.10,.0,d)*inb; c*=1.-.18*smoothstep(.3,-.42,v.y)*inb;
      let g=(v+vec2f(.27,.36))/.135; let gc=floor(g); if(gc.x>=0.&&gc.x<4.&&gc.y>=0.&&gc.y<5.&&d<-.03){ c*=1.-.85*glyph(pick8(hash21(gc+2.),U.c,U.d),(fract(g)-.04)/.92); }
      col=mix(col,col*c,rv); } }
  { let v=w-vec2f(3.60,.0); let d=rbox(v+vec2f(.015*sin(v.y*23.),.012*sin(v.x*31.)),vec2f(.40,.66),.02)+.012*(fbm(w*14.)-.5); let rv=wet(w+3.,smoothstep(24.1,25.0,t)); if(d<.02&&rv>0.){ let inb=smoothstep(.0,-.012,d);
      var c=mix(vec3f(1.),vec3f(.70,.68,.63)*(.82+.3*fbm(w*5.)+.12*fbm(w*40.)),inb); c*=1.-.7*smoothstep(.02,.0,abs(d))*(.6+.6*vnoise(w*40.));
      let g=(v+vec2f(.34,.60))/.17; let gc=floor(g); if(gc.x>=0.&&gc.x<4.&&gc.y>=0.&&gc.y<7.&&d<-.03){ c*=1.-.82*glyph(pick8(hash21(gc+5.),U.e,U.f),(fract(g)-.06)/.88); c*=1.-.35*smoothstep(.03,.0,fract(g).x)*inb; }
      col=mix(col,col*c,rv); } }
  { let v=w-vec2f(4.72,-.02); let d=rbox(v,vec2f(.34-.035*cos(v.y*9.5)-.05*smoothstep(.2,.52,abs(v.y)),.52),.16); let rv=wet(w+7.,smoothstep(25.0,25.9,t)); if(d<.02&&rv>0.){ let inb=smoothstep(.0,-.012,d);
      var c=mix(vec3f(1.),vec3f(.84,.82,.76)*(.88+.2*fbm(w*6.)),inb); c*=1.-.7*smoothstep(.018,.0,abs(d))*(.6+.6*vnoise(w*40.));
      c*=1.-.5*smoothstep(.008,.0,abs(v.x+.006*sin(v.y*40.)))*inb; c*=1.-.35*smoothstep(.007,.0,abs(abs(v.y)-.20))*inb;
      let g=(v+vec2f(.27,.34))/.18; let gc=floor(g); if(gc.x>=0.&&gc.x<3.&&gc.y>=0.&&gc.y<4.&&d<-.035){ c*=1.-.86*glyph(U.b.y+floor(hash21(gc+9.)*36.99),(fract(g)-.08)/.84); }
      col=mix(col,col*c,rv); } }
  return vec4f(col,1.); }
`;
