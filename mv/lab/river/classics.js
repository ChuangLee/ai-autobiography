// Shots that rest on the classical sources, painted in the fragment shader in the same ink-wash hand as night.js (and with its header).
//   CORDS  《易·系辞》上古结绳而治: voice rings tighten into knots on hanging cords; the knots drop and are the first characters
//   RELAY  one character (文) on the materials of writing, its script changing with the material as the light crosses it
//   MUD    《说文解字》见鸟兽蹄迒之迹，初造书契: tracks in firelit mud become oracle-bone characters; tilt up to Cangjie's four eyes
import { HEAD } from "./night.js";
const PAPER = `
fn paper(p:vec2f)->vec3f{ let f1=fbm(p*1.2); let f2=fbm(p*9.); let fib=pow(vnoise(vec2f(p.x*40.+p.y*8.,p.y*4.)),5.)+pow(vnoise(vec2f(p.x*5.+31.,p.y*36.-p.x*9.)),5.);
  return vec3f(.915,.888,.815)*(1.+.045*(f1-.5)+.03*(f2-.5)+.04*fib); }
`;
export const CORDS_FS = HEAD + PAPER + `
const NV=7;
fn vc(k:f32)->vec2f{ return vec2f(-1.26+k*.42+(hash11(k*3.7)-.5)*.16, .18+(hash11(k*5.3+2.)-.5)*.62); }
fn knotBlob(v:vec2f,r:f32)->f32{ let d=min(length(v)-r, min(length(v-vec2f(r*.75,r*.55))-r*.62, length(v+vec2f(r*.7,r*.6))-r*.6)); return smoothstep(.006,-.006,d); }
// ink of everything that hangs: rings, cords, knots; sh>0 makes the softer copy that is its shadow on the paper
fn hang(p:vec2f,t:f32,soft:f32)->f32{ var ink=0.; let fade=1.-smoothstep(22.35,23.05,t);
  for(var i=0;i<NV;i++){ let k=f32(i); let c0=vc(k); let tk=18.98+k*.405; let age=t-tk; if(age<=0.){ continue; } let Tc=20.45+k*.08; let e=smoothstep(Tc,Tc+.75,t);
    let top=1.15; let bot=c0.y-.22-.3*hash11(k*9.1); let sw=.035*sin(t*1.25+k*1.9)+.012*sin(t*2.9+k); let cx=c0.x+sw*(top-p.y)*e;
    // the main knot: it was a ring on the water
    let Td=22.12+k*.07; let td=max(t-Td,0.); let cy=c0.y-1.9*td*td; let c=vec2f(c0.x+sw*(top-c0.y)*e,cy); let d=length(p-c);
    let r0=.07+min(age,Tc-tk)*.30; let r=mix(r0,.034,e); let wdt=(.010+.012*min(age,1.5))*(1.+soft);
    let band=exp(-((d-r)/wdt)*((d-r)/wdt))+.45*exp(-((d-r*.62)/wdt)*((d-r*.62)/wdt))+.25*exp(-((d-r*.3)/wdt)*((d-r*.3)/wdt));
    let ringA=smoothstep(0.,.2,age)*exp(-age*.75)*(1.-e)*.75;
    let gm=smoothstep(0.,.32,td); let gs=.17; let gl=glyph(U.b.y+floor(hash11(k*2.3)*36.99),(p-c)/gs+.5);
    ink=max(ink, band*ringA); ink=max(ink, e*mix(knotBlob(p-c,.036+.012*hash11(k*4.4)),gl,gm)*mix(1.,.93,gm));
    // the cord, growing down through it, and the other knots on it
    let grow=smoothstep(Tc+.15,Tc+.95,t); let ylo=mix(top,bot,grow);
    if(p.y>ylo&&td<=0.||p.y>max(ylo,c0.y+.02)){ let dl=abs(p.x-cx); ink=max(ink, smoothstep(.0075*(1.+soft),.0025,dl)*(.82+.18*sin(p.y*210.+k))*fade); }
    for(var j=0;j<3;j++){ let fj=f32(j); let yk=mix(top-.2,bot+.06,hash11(k*7.1+fj*3.3)); if(abs(yk-c0.y)<.09||yk<ylo){ continue; }
      ink=max(ink, knotBlob(p-vec2f(c0.x+sw*(top-yk)*e,yk),.016+.022*hash11(k*1.7+fj*5.9))*fade); } }
  return ink; }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let t=U.a.x; let p=scr(fc); var col=paper(p);
  let sh=hang(p-vec2f(.045,-.035),t,1.6); col*=1.-.20*sh*smoothstep(20.6,21.4,t);
  let ink=hang(p,t,0.); col*=1.-.93*ink; return vec4f(col,1.); }
`;
export const RELAY_FS = HEAD + PAPER + `
// U.c = cells of 文 in oracle bone, bronze, clerical, regular script; U.d.x = Song (printed) type
fn gk(k:i32)->f32{ if(k==0){ return U.c.x; } if(k==1){ return U.c.y; } if(k==2){ return U.c.z; } if(k==3){ return U.c.w; } return U.d.x; }
fn onMat(p:vec2f,k:i32,g:vec2f)->vec3f{ let L=normalize(vec2f(-.62,.78)); let id=gk(k); let m=glyph(id,g); let e=glyph(id,g+L*.0055)-glyph(id,g-L*.0055); var c=vec3f(0.);
  if(k==0){ let cr=abs(fbm(p*2.1+5.)-.5); let cr2=abs(fbm(p*4.7+1.)-.5);                                              // ox scapula / turtle plastron: incised
    c=vec3f(.80,.77,.70)*(.88+.14*fbm(p*3.)+.07*fbm(p*42.))*(1.-.42*smoothstep(.011,.0,cr))*(1.-.22*smoothstep(.006,.0,cr2));
    c=c*(1.-.74*m)+vec3f(.30)*max(-e,0.)-vec3f(.10)*max(e,0.); }
  else if(k==1){ let pa=fbm(p*5.)+.4*fbm(p*23.);                                                                       // bronze: cast, under patina
    c=vec3f(.150,.158,.155)*(.55+.75*pa)+vec3f(.10,.11,.105)*smoothstep(.62,.85,fbm(p*9.+3.));
    c=c*(1.-.55*m)+vec3f(.42)*max(e,0.)*(.6+.6*pa)-vec3f(.07)*max(-e,0.); }
  else if(k==2){ let sx=p.x/.31+.5; let sid=floor(sx); let fx=fract(sx); let gap=smoothstep(.0,.035,fx)*smoothstep(1.,.965,fx);  // bamboo slips: brushed
    c=vec3f(.67,.64,.56)*(.84+.16*hash11(sid*3.1))*(.9+.12*fbm(vec2f(p.x*70.,p.y*1.6)))*(.30+.70*gap);
    let node=abs(fract(p.y*.9+hash11(sid*7.7))-.5); c*=1.-.35*smoothstep(.008,.0,node);
    let cord=min(abs(p.y-.52),abs(p.y+.50)); c=mix(c,vec3f(.30,.28,.24)*(.7+.3*sin(p.x*150.)),smoothstep(.022,.012,cord)*.85);
    c*=1.-.93*m*gap; }
  else if(k==3){ c=vec3f(.42,.42,.43)*(.78+.30*fbm(p*4.)+.26*fbm(p*52.));                                              // stone: cut with a chisel, a V in section
    c=c*(1.-.40*m)+vec3f(.40)*max(e,0.)-vec3f(.22)*max(-e,0.); c*=1.-.25*smoothstep(.008,.0,abs(fbm(p*1.6+8.)-.5)); }
  else { c=paper(p); let rule=abs(fract(p.x/.62+.5)-.5)*.62; c*=1.-.30*smoothstep(.006,.002,rule);                    // paper: printed from a block
    c*=1.-.95*m*(.88+.12*fbm(p*60.)); }
  return c; }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let t=U.a.x; let u=U.a.y; var p=scr(fc);
  let z=(1.+.10*clamp(u,0.,1.))*exp(1.05*smoothstep(.84,1.3,u)); p=vec2f(0.,-.10)+(p-vec2f(0.,-.10))/z;
  let g=(p-vec2f(-.66,-.66))/1.32; let s=clamp(u,-.1,1.05)*4.5-.15; let ph=s+.5-(p.x/3.56+.5)*.95+.05*(fbm(p*2.5)-.5)+.25*p.y*.2;
  let k=clamp(i32(floor(ph)),0,4); var col=onMat(p,k,g);
  let fr=fract(ph); if(ph>.98&&ph<4.99){ col+=vec3f(.95,.92,.84)*(exp(-fr*fr*55.)*.55+exp(-fr*5.)*.10); col*=1.+.25*exp(-(1.-fr)*(1.-fr)*30.); }   // the light crossing
  return vec4f(col,1.); }
`;
export const MUD_FS = HEAD + `
fn birdTrack(v:vec2f)->f32{ var d=seg(v,vec2f(0.),vec2f(0.,.52),.034); d=min(d,seg(v,vec2f(0.),vec2f(-.30,.40),.030)); d=min(d,seg(v,vec2f(0.),vec2f(.30,.40),.030)); d=min(d,seg(v,vec2f(0.),vec2f(0.,-.24),.026));
  d=min(d,length(v)-.06); return smoothstep(.012,-.012,d); }
fn hoof(v:vec2f)->f32{ let a=length((v-vec2f(-.13,0.))/vec2f(.11,.22)); let b=length((v-vec2f(.13,0.))/vec2f(.11,.22)); return smoothstep(1.08,.9,min(a,b)); }
fn rot2(v:vec2f,a:f32)->vec2f{ return vec2f(v.x*cos(a)-v.y*sin(a), v.x*sin(a)+v.y*cos(a)); }
fn mark(q:vec2f,c:vec2f,sc:f32,an:f32,kind:f32,gi:f32,mo:f32)->f32{ let v=rot2(q-c,an)/sc; if(abs(v.x)>.75||abs(v.y)>.75){ return 0.; }
  var tr=0.; if(kind<.5){ tr=birdTrack(v-vec2f(0.,-.12)); } else { tr=hoof(v); } let gl=glyph(U.b.y+gi,v*.86+.5); return mix(tr,gl,mo); }
// everything pressed into the mud. The light of the fire comes from the right; where it has passed, a track is a character
fn marks(q:vec2f,u:f32)->f32{ let mo=smoothstep(.30,.62,u-q.x*.09); var m=mark(q,vec2f(0.,-.10),.62,0.,0.,22.,mo);                       // 鸟
  for(var i=0;i<8;i++){ let f=f32(i); let alt=f32(i%2)*2.-1.; m=max(m,mark(q,vec2f(-1.52+f*.44,.60-f*.055+alt*.07),.17,-1.25+alt*.2,0.,select(select(select(0.,3.,i%4==1),5.,i%4==2),21.,i%4==3),mo)); }
  for(var i=0;i<5;i++){ let f=f32(i); m=max(m,mark(q,vec2f(-1.45+f*.62+.1*sin(f*3.),-.72+.06*sin(f*5.)),.16,.5,1.,select(24.,23.,i%2==1),mo)); }
  return m; }
fn lens(v:vec2f,w:f32,h:f32)->f32{ let r=(w*w+h*h)/(2.*h); return max(length(v-vec2f(0.,r-h))-r, length(v+vec2f(0.,r-h))-r); }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let t=U.a.x; let u=U.a.y; let p=scr(fc); let q=p*(1.-.10*u)+vec2f(.10*u,2.42*smoothstep(.50,.95,u)*step(.5,U.b.x)); var col=vec3f(.004,.0042,.005);
  let F=vec2f(-2.25,-.35); let df=length(q-F); let fl=1.+.10*sin(t*13.)+.07*sin(t*7.3); let Lf=WARM*fl*2.2/(1.+df*df*.55)*smoothstep(-.25,.25,u);
  if(q.y<1.25){ let g1=fbm(q*3.); let g2=fbm(q*17.+3.); let Ld=normalize(F-q)*.006; let m=marks(q,u); let e=marks(q+Ld,u)-marks(q-Ld,u);
    var c=(.045+.085*g1+.05*g2)*Lf+Lf*.55*pow(fbm(q*8.+2.),7.);                                                              // wet earth
    c=c*(1.-.80*m)+Lf*.55*max(-e,0.)-c*.5*max(e,0.); col+=c*smoothstep(1.2,.72,q.y); }
  // the face, out of the dark above: firelight from below and one side; two pairs of eyes, calm
  let fq=q-vec2f(0.,2.42); let rr=length(fq/vec2f(.56,.72));
  if(rr<1.25&&q.y>1.3){ let nz=sqrt(max(1.-rr*rr,0.)); let nrm=normalize(vec3f(fq.x/.56,fq.y/.72,nz+.001)); let lam=max(dot(nrm,normalize(vec3f(.78,-.30,.52))),0.);
    let head=smoothstep(1.02,.96,rr); let wr=fbm(vec2f(fq.x*9.,fq.y*42.))*.5+fbm(fq*22.)*.5;
    var skin=WARM*fl*(.012+.62*lam*lam)*(.75+.5*wr);
    skin*=1.-.55*smoothstep(.05,.0,abs(fq.x+.035+.02*fq.y))*smoothstep(.34,-.16,fq.y)*smoothstep(-.26,-.10,fq.y);          // the shaded side of the nose
    skin+=WARM*.20*lam*smoothstep(.035,.0,abs(fq.x-.03))*smoothstep(.30,-.14,fq.y)*smoothstep(-.24,-.12,fq.y);            // and its lit ridge
    for(var i=0;i<4;i++){ let sx=f32(i%2)*2.-1.; let row=f32(i/2); let ec=vec2f(sx*.215,.20-row*.165); let v=fq-ec; let d=lens(v,.112,.040);
      skin=mix(skin, skin*.25+WARM*fl*.10*lam, smoothstep(.004,-.004,d));                                                 // the eye
      skin*=1.-.9*smoothstep(.012,.0,abs(d))*step(0.,v.y)-.45*smoothstep(.008,.0,abs(d))*step(v.y,0.);                    // lids
      let ir=length(v-vec2f(0.,-.004)); skin*=1.-.92*smoothstep(.034,.028,ir)*smoothstep(.004,-.004,d);
      skin+=vec3f(1.,.72,.36)*3.2*fl*smoothstep(.0085,.003,length(v-vec2f(.014,.008)))*smoothstep(.004,-.004,d);          // the fire in it
      if(row<.5){ let bd=abs(v.y-.085-.03*cos(v.x*9.))-.012*(1.-abs(v.x)*3.); skin*=1.-.8*smoothstep(.006,-.004,bd)*step(abs(v.x),.19); } }
    let beard=smoothstep(-.26,-.42,fq.y+.05*cos(fq.x*5.))*(.55+.45*fbm(vec2f(fq.x*46.,fq.y*4.))); skin=mix(skin, skin*.22+WARM*fl*.05*lam*fbm(vec2f(fq.x*60.,fq.y*3.)), beard);
    let hair=smoothstep(.44,.56,fq.y+.10*abs(fq.x)); skin=mix(skin, vec3f(.002)+WARM*.03*lam*fbm(vec2f(fq.x*50.,fq.y*6.)), hair);
    col=mix(col,skin,head*smoothstep(1.3,1.75,q.y)); col+=WARM*fl*.10*smoothstep(.06,.0,abs(rr-.99))*max(nrm.x,0.)*smoothstep(1.3,1.75,q.y); }
  // beard below the face, running down into the dark
  let bq=q-vec2f(0.,1.62); if(abs(bq.x)<.42&&bq.y<.16&&bq.y>-.5){ let bs=smoothstep(.42,.1,abs(bq.x)+.3*max(-bq.y,0.))*(.4+.6*fbm(vec2f(bq.x*55.,bq.y*3.5))); col+=WARM*.035*bs*fl; }
  col+=flame(q,vec2f(-1.9,-.95),.0001,t)*.8;                                                               // sparks crossing the dark
  return vec4f(col,1.); }
`;
