// The night writing was made: ink painting in the fragment shader. Firelight is the only warm tone; the gold appears only inside the ghost's eye.
// U.a = (time, shot progress 0..1, width, height); U.b = (variant, first oracle-bone cell, seconds into the shot, 0)
export const HEAD = `
struct NU{ a:vec4f, b:vec4f, c:vec4f, d:vec4f, e:vec4f, f:vec4f } @group(0)@binding(0) var<uniform> U:NU; @group(0)@binding(1) var samp:sampler; @group(0)@binding(2) var atlas:texture_2d<f32>;
const WARM=vec3f(1.,.50,.15); const GOLD=vec3f(1.,.68,.26);
fn glyph(gid:f32, uv:vec2f)->f32{ if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.){ return 0.; } let cell=vec2f(gid%32., floor(gid/32.)); return textureSampleLevel(atlas,samp,(cell+vec2f(uv.x,1.-uv.y))/32.,0.).r; }
fn glyphCell(gid:f32, uv:vec2f)->f32{ return glyph(gid,uv); }
fn seg(p:vec2f,a:vec2f,b:vec2f,r:f32)->f32{ let pa=p-a; let ba=b-a; let h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }
fn scr(fc:vec4f)->vec2f{ return vec2f((fc.x/U.a.z*2.-1.)*U.a.z/U.a.w, 1.-fc.y/U.a.w*2.); }
fn millet(p0:vec2f,t:f32,fire:vec2f)->vec3f{ var c=vec3f(0.); let p=vec2f(p0.x+p0.y*.10,p0.y);
  for(var l=0;l<3;l++){ let fl=f32(l); let s=22.+fl*17.; let gp=vec2f(p.x*s+fl*17.3, (p.y+t*(.95-fl*.2))*s*.42); let cell=floor(gp); let f=fract(gp)-.5; let h=hash22(cell+fl*3.1);
    if(h.x>.86){ let d=length((f-(h-.5)*.5)*vec2f(1.,.42)); let m=smoothstep(.085,.03,d); let df=length(p0-fire); c+=(WARM*1.7/(1.+df*df*5.)+vec3f(.012,.012,.014))*m*(1.-fl*.25); } }
  return c; }
fn flame(p:vec2f,F:vec2f,sz:f32,t:f32)->vec3f{ var q=(p-F)/sz; q.x+=(fbm(q*2.2+vec2f(0.,-t*3.2))-.5)*.7*max(q.y,0.); let d=length(vec2f(q.x*(1.5+max(q.y,0.)*1.3), q.y-.42));
  let f=smoothstep(.78,.08,d)*smoothstep(-.12,.1,q.y); let dd=length(p-F); var c=WARM*f*5.+vec3f(1.,.86,.5)*pow(f,3.)*4.+WARM*.05/(dd*dd*26.+.25);
  for(var i=0;i<22;i++){ let fi=f32(i); let ph=fract(t*(.35+.3*hash11(fi*3.7))+hash11(fi)); let sp=F+vec2f(sin(fi*7.1+ph*5.)*.05*ph+(hash11(fi*1.9)-.5)*.10, sz*.5+ph*.62*(.5+hash11(fi*2.3)));
    c+=WARM*(1.-ph)*(1.-ph)*smoothstep(.0065,.001,length(p-sp))*5.; } return c; }
`;
export const CANGJIE_FS = HEAD + `
fn man(p:vec2f)->f32{                                                 // feet at (0,0), about one unit tall, leaning to the rock on his right
  var d=seg(p,vec2f(-.07,0.),vec2f(-.03,.45),.048); d=min(d,seg(p,vec2f(.10,0.),vec2f(.05,.45),.048));
  d=min(d,seg(p,vec2f(.0,.36),vec2f(.07,.74),.135)); d=min(d,length(p-vec2f(.13,.905))-.078); d=min(d,length(p-vec2f(.115,.995))-.032);
  d=min(d,seg(p,vec2f(.09,.71),vec2f(.33,.80),.036)); d=min(d,seg(p,vec2f(.33,.80),vec2f(.40,.87),.012)); d=min(d,seg(p,vec2f(.02,.68),vec2f(.19,.55),.036)); return d; }
fn human(p:vec2f)->f32{                                               // a plain standing figure, one unit tall
  var d=length(p-vec2f(0.,.915))-.07; d=min(d,seg(p,vec2f(0.,.54),vec2f(0.,.75),.10)); d=min(d,seg(p,vec2f(-.14,.77),vec2f(-.22,.43),.034)); d=min(d,seg(p,vec2f(.14,.77),vec2f(.22,.43),.034));
  d=min(d,seg(p,vec2f(-.085,0.),vec2f(-.045,.5),.05)); d=min(d,seg(p,vec2f(.085,0.),vec2f(.045,.5),.05)); return d; }
fn rockH(p:vec2f)->f32{ let w=fbm(p*1.3+3.); let st=sin((p.y+.25*w+.05*p.x)*26.)*.5+.5; let cr=abs(fbm(vec2f(p.x*2.2+w*2.,p.y*1.1)+11.)-.5); return .22*smoothstep(.3,.7,st)-.25*smoothstep(.03,.0,cr)+.3*fbm(p*9.); }
fn rockTex(p:vec2f)->f32{ let w=fbm(p*1.7); let st=fbm(vec2f(p.x*2.6+w*1.6,p.y*9.+w*2.)); let fine=fbm(p*17.); let rg=1.-abs(2.*fbm(vec2f(p.x*1.3+w,p.y*3.4))-1.); return clamp(.22+.55*st+.22*fine+.25*rg*rg,0.,1.); }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let t=U.a.x; let u=U.a.y; let tl=U.b.z; var p=scr(fc); var col=vec3f(0.);
  if(U.b.x<.5){                                                       // Cangjie at the cliff
    let piv=vec2f(-.05,-.38); p=piv+(p-piv)/(1.+.09*u); let F=vec2f(-.56,-.665); let df=length(p-F); let Lf=WARM*(1.5+.14*sin(t*13.)+.09*sin(t*7.3))/(1.+df*df*5.5);
    let B=vec2f(-.20,-.675); let hs=.43;
    col=vec3f(.0055,.006,.008)+vec3f(.012,.013,.016)*smoothstep(.5,-.9,p.y)*smoothstep(.3,-1.6,p.x);
    let edge=-.02+.11*(fbm(vec2f(p.y*2.3,3.))-.5)-.10*p.y; let gy=-.665-.04*p.x+.022*(fbm(vec2f(p.x*4.,1.))-.5);
    if(p.x>edge){ let tx=rockTex(p); let lip=smoothstep(.0,.07,p.x-edge); let ld=normalize(F-p)*.012; let bump=(rockH(p+ld)-rockH(p-ld))*7.; col=tx*Lf*(.6+.5*(1.-lip))*clamp(1.+bump,.15,2.6)+vec3f(.004);
      let ps=F+(p-F)*.40; col*=1.-.78*smoothstep(.02,-.02,man((ps-B)/hs)*hs)*smoothstep(-.7,-.55,p.y);                    // his shadow, thrown huge on the cliff
      let g0=vec2f(.07,-.36); let cs=.20; let gc=floor((p-g0)/cs); let guv=(fract((p-g0)/cs)-.11)/.78;
      if(gc.x>=0.&&gc.x<4.&&gc.y>=0.&&gc.y<3.){ let k=(3.-gc.x)*3.+(2.-gc.y); let rv=smoothstep(k*.42-3.1,k*.42-2.7,tl); let gid=U.b.y+floor(hash21(gc+11.)*36.99);
        let o=normalize(F-p)*.012; let wipe=step(1.-rv*1.05,guv.y); let m=glyph(gid,guv)*wipe; let e=(glyph(gid,guv+o)-glyph(gid,guv-o))*wipe;
        col=col*(1.-.88*m)+Lf*max(-e,0.)*1.1; if(rv>.02&&rv<.98){ col+=WARM*4.*m*smoothstep(.07,.0,abs(guv.y-(1.-rv*1.05))); } } }
    if(p.y<gy){ let gt=fbm(vec2f(p.x*6.,p.y*18.)); col=(.22+.3*gt)*Lf*smoothstep(-1.1,-.6,p.y)*.9+vec3f(.003); }
    let sd=man((p-B)/hs)*hs; let e2=vec2f(.004,0.); let n=normalize(vec2f(man((p+e2.xy-B)/hs)-man((p-e2.xy-B)/hs), man((p+e2.yx-B)/hs)-man((p-e2.yx-B)/hs))+1e-5);
    let inside=smoothstep(.003,-.003,sd); col=mix(col,vec3f(.0035),inside); col+=Lf*1.6*smoothstep(.014,.0,abs(sd+.006))*max(dot(n,normalize(F-p)),0.)*step(sd,.004);
    col+=WARM*5.*smoothstep(.012,.0,length(p-(B+vec2f(.40,.87)*hs)))*(.5+.5*sin(t*31.));                                   // the point of the tool
    col+=flame(p,F,.12,t); col+=millet(p,t,F)*(1.-inside);
    let sy=(p.y-F.y-.1)/1.9; if(sy>0.&&sy<1.2){ let sx=p.x-F.x-.10*sy*sy-.06*sin(sy*5.-t*1.1); let sw=.03+.11*sy; col+=vec3f(.20,.21,.24)*exp(-sx*sx/(sw*sw))*smoothstep(0.,.25,sy)*smoothstep(.15,.7,fbm(vec2f(sx*9.,sy*5.-t*.8)))*smoothstep(-.2,.9,u)*(.55+.5*smoothstep(.6,1.1,u)); col+=vec3f(.22,.23,.27)*exp(-dot((p-vec2f(-.50+.07*.74,-.92+.86*1.55))/vec2f(.07,.11),(p-vec2f(-.50+.07*.74,-.92+.86*1.55))/vec2f(.07,.11)))*smoothstep(.75,1.15,u)*.6; }
  } else {                                                            // the carved character alone by the fire; its shadow is a standing person
    p.x+=.62*smoothstep(.35,1.15,u)-.05; let F=vec2f(-1.12,-.66); let df=length(p-F); let Lf=WARM*(1.7+.12*sin(t*13.)+.08*sin(t*7.3))/(1.+df*df*1.7)*smoothstep(.0,.9,tl);
    let hz=-.08; col=vec3f(.0055,.006,.008)+vec3f(.01)*exp(-abs(p.y-hz)*6.);
    if(p.y<hz){ let dep=(hz-p.y); let gt=fbm(vec2f(p.x*5./(.3+dep),dep*30.)); col=(.26+.3*gt)*Lf*smoothstep(.0,.25,dep)+vec3f(.003);
      let Bs=vec2f(-.42,-.62); let dir=normalize(vec2f(1.,.115)); let al=dot(p-Bs,dir); let la=dot(p-Bs,vec2f(-dir.y,dir.x)); let s=al/(1.72+2.6*smoothstep(.55,1.15,u));
      if(s>-.05&&s<1.1){ let q=vec2f(la/(.50*(1.+.55*s)), s); let sh=smoothstep(.008+.03*s,-.008-.02*s,human(q)); col*=1.-.94*sh*(1.-.2*s); } }
    let C=vec2f(-.56,-.21); let q=p-C; let wob=.09*(fbm(p*2.4+5.)-.5)+.03*(fbm(p*9.)-.5); let bx=abs(q+vec2f(0.,.02*sin(q.x*9.)))-vec2f(.17+wob-.07*q.y,.40+.05*fbm(vec2f(q.x*5.,2.))); let sd=length(max(bx,vec2f(0.)))+min(max(bx.x,bx.y),0.)-.03;
    if(sd<0.){ let tx=rockTex(p*1.3+7.); let side=smoothstep(.16,-.2,q.x); col=tx*Lf*(.35+.85*side)+vec3f(.004);
      let guv=(q-vec2f(-.155,-.20))/.31; let gid=U.b.y+32.; let o=normalize(F-p)*.014; let m=glyph(gid,guv); let e=glyph(gid,guv+o)-glyph(gid,guv-o); col=col*(1.-.9*m)+Lf*max(-e,0.)*1.3; }
    col+=flame(p,F,.13,t); col+=millet(p,t,F)*.6;
    col*=1.-.93*smoothstep(.72,1.2,u)*smoothstep(.25,-.35,p.y+.12*p.x);                    // the shadow spreads: it will be the dark bank of the river
  }
  return vec4f(col,1.); }
`;
export const GHOST_FS = HEAD + `
const MOON=vec2f(.98,.50);
//STATUE
// Ink-wash apparitions: tall uneven veils of wet ink and mist. k = which one; far ones are many, small and faint, two near ones are large and soft.
fn vp(k:f32)->vec4f{ let h1=hash11(k*3.31+1.); let h2=hash11(k*7.77+2.); let h3=hash11(k*1.93+5.);          // x, height, lean, width
  if(k<2.){ return vec4f(mix(-1.30,1.22,k)+(h1-.5)*.1, 3.3+.4*h2, mix(.10,-.07,k), .13); }                       // near, out of focus
  if(k==3.){ return vec4f(-.50,1.55,.07,.10); }
  if(k<7.){ return vec4f(-1.15+(k-2.)*.55+(h1-.5)*.3, 1.05+.80*h2, (h3-.5)*.34+.10, .085+.03*h1); }               // middle distance
  return vec4f(-1.75+(k-7.)*.42+(h1-.5)*.3, .45+.5*h2, (h3-.5)*.3+.08, .045+.02*h1); }                           // far
fn vBase(k:f32)->f32{ if(k<2.){ return -1.5; } if(k<7.){ return -.92; } return -.62; }
fn vSway(ly:f32,k:f32,t:f32)->f32{ return (.02+.05*ly)*sin(ly*3.1-t*.9+k*2.1)+.07*(fbm(vec2f(ly*2.2-t*.3,k*7.))-.5); }
fn headTilt()->f32{ return -.30; }
// A wet-ink stain: pigment pooled at the bleeding edge, a darker hollow core, fibres running out of it. Gaunt and leaning; a face is barely there.
fn veil(p:vec2f,k:f32,t:f32)->f32{ let v=vp(k); let H=v.y*mix(.62,1.,smoothstep(-.3,.9,U.a.y+k*.03)); let by=vBase(k); let ly=(p.y-by)/H; if(ly<-.1||ly>1.3){ return 0.; }
  let hk=hash11(k*9.7+3.); let lx=(p.x-v.x)/H-v.z*ly*ly-vSway(ly,k,t)-v.w*.9*(fbm(vec2f(ly*2.6+k*4.,k))-.5);
  // the outline: thin stalk, a swelling of shoulders, a narrow neck, a small long head; all of it uneven
  let wn=fbm(vec2f(ly*5.5+k*3.,k)); let sh=exp(-(ly-.62)*(ly-.62)*38.); let hd=exp(-(ly-.86)*(ly-.86)*120.);
  let w=v.w*(.22+.55*smoothstep(.0,.6,ly)*(1.-.45*smoothstep(.70,.80,ly))+.10*sh+.18*hd)*(.55+.9*wn)*(1.+.35*sign(lx)*(fbm(vec2f(ly*4.,k*2.))-.5)*2.);
  let warp=.9*(fbm(vec2f(lx*11.+k,ly*6.-t*.25))-.5)+.3*(fbm(vec2f(lx*34.,ly*30.+k))-.5);
  let d=abs(lx)/max(w,.004)+warp*1.2;                                                       // 1 at the edge
  let top=1.-smoothstep(.95,1.04+.1*hk,ly); let foot=smoothstep(-.08,.30,ly);
  let rim=exp(-(d-1.)*(d-1.)*5.)*smoothstep(.35,.7,fbm(vec2f(lx*8.+k*3.,ly*5.)))*.5;                // pigment pooled here and there along the edge
  let core=smoothstep(1.15,.25,d)*(.25+.75*smoothstep(.3,.75,fbm(vec2f(lx*7.,ly*4.-t*.4)+k*5.)));   // the wash inside, blotched
  let bleed=smoothstep(2.4,1.,d)*.10*smoothstep(.5,.8,fbm(vec2f(lx*9.+k,ly*9.)));
  var s=(rim+core*.8+bleed)*top*foot;
  if(k>=2.&&k<7.){ let a=headTilt(); let hv=vec2f(lx,ly-.83); var hq=vec2f(hv.x*cos(a)-hv.y*sin(a), hv.x*sin(a)+hv.y*cos(a))/v.w*.13;
    hq+=.012*(vec2f(fbm(hq*30.+k),fbm(hq*30.+k+9.))-.5);
    var e=length((hq-vec2f(-.046,.036))/vec2f(.024,.017)); if(hk>.45||k==4.){ e=min(e,length((hq-vec2f(.046,.036))/vec2f(.020,.014))); }
    let mo=length(vec2f(hq.x-.004*sin(hq.y*38.+k),hq.y+.082)/vec2f(.013,.060+.012*sin(t*1.7+k)));
    s*=mix(.35,1.,smoothstep(.5,1.9,e))*mix(mix(.4,1.,step(.75,hk)),1.,smoothstep(.5,1.8,mo)); s+=.10*(1.-smoothstep(.8,1.5,e))*rim; }
  return s; }
fn eyeOf(k:f32,t:f32)->vec2f{ let v=vp(k); let H=v.y; let a=headTilt(); let c=vec2f(-.046,.036)*v.w/.13; let r=vec2f(c.x*cos(a)+c.y*sin(a), -c.x*sin(a)+c.y*cos(a));
  let ly=.83+r.y; let lx=r.x+v.z*ly*ly+vSway(ly,k,t); return vec2f(v.x+lx*H, vBase(k)+ly*H); }
fn night(p:vec2f,t:f32)->vec3f{ let dm=length(p-MOON); let pg=fbm(p*vec2f(60.,7.))*.5+fbm(p*31.)*.5;
  var col=(vec3f(.040,.043,.050)*(.8+.4*fbm(p*1.3+vec2f(t*.02,0.)))+vec3f(.10,.107,.12)/(1.+dm*dm*2.2))*(.85+.3*pg)*smoothstep(-1.15,-.2,p.y+.2*fbm(vec2f(p.x*2.,3.)));
  let md=smoothstep(.128,.118,dm); col=mix(col,vec3f(.50,.52,.55)*(.8+.35*fbm(p*8.+2.)),md*(.75+.25*smoothstep(.3,.6,fbm(p*3.+vec2f(t*.03,0.)))));
  for(var g=7;g<16;g++){ let fg=f32(g); col*=1.-clamp(veil(p,fg,t)*.55,0.,.6); }
  let r1=-.16+.22*(fbm(vec2f(p.x*1.1+3.,1.))-.5)*2.; let r2=-.52+.26*(fbm(vec2f(p.x*.8+9.,4.))-.5)*2.;
  if(p.y<r1){ col=mix(col,vec3f(.018,.019,.023),.7*smoothstep(.0,.05,r1-p.y)); } 
  for(var g=2;g<7;g++){ let fg=f32(g); col*=1.-clamp(veil(p,fg,t)*1.25,0.,.93); }
  if(p.y<r2){ col=mix(col,vec3f(.007,.0075,.009),.9*smoothstep(.0,.06,r2-p.y)); }
  col+=vec3f(.030,.032,.038)*exp(-(p.y+.55)*(p.y+.55)*5.)*(.5+.9*fbm(vec2f(p.x*1.6-t*.04,p.y*4.)));
  for(var g=0;g<2;g++){ let fg=f32(g); col*=1.-clamp(veil(p,fg,t)*1.1,0.,.9); }
  let F=vec2f(-1.25,-1.12); col+=millet(p,t,F)*.9+WARM*.05/(dot(p-F,p-F)*5.+.4);
  return col; }
fn city(p:vec2f,t:f32)->vec3f{ var c=vec3f(0.); for(var l=0;l<2;l++){ let fl=f32(l); let sc=7.+fl*6.; let x=p.x*sc+fl*3.7+t*.12*(1.+fl); let bc=floor(x); let bh=-.25+.85*hash11(bc*1.7+fl*9.)*(1.-fl*.35);
    let y=p.y+.78; if(p.y<bh&&y>0.){ let wp=vec2f(fract(x)*5.,y*(24.+fl*10.)); let wc=floor(wp); let wf=fract(wp); let on=step(.42,hash21(wc+bc*13.+fl*5.+floor(t*.9+hash21(wc)*3.)*.37));
      let m=step(.2,wf.x)*step(wf.x,.8)*step(.25,wf.y)*step(wf.y,.8)*step(.5,wc.x)*step(wc.x,3.5); c=GOLD*on*m*(2.2-fl*1.2)+vec3f(.0015); } } return c; }
fn figure(p:vec2f,t:f32)->vec3f{ let ro=vec3f(-.9,1.6,-5.6); let fw=normalize(vec3f(0.,2.47,0.)-ro); let rt=normalize(cross(fw,vec3f(0.,1.,0.))); let up=cross(rt,fw);   // seen from the water, as it will be
  let rd=normalize(fw-rt*p.x*.36+up*p.y*.36); var tt=3.2; var hit=false;
  for(var i=0;i<72;i++){ let d=bust(ro+rd*tt); if(d<.0012*tt){ hit=true; break; } tt+=d*.92; if(tt>9.){ break; } } if(!hit){ return vec3f(0.); }
  let q=ro+rd*tt; return statueCol(q,bustN(q),rd,t+40.)*1.25; }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let t=U.a.x; let p=scr(fc); let tp=t-U.c.x;          // U.c.x = when the push into the eye begins
  if(tp<=0.){ return vec4f(night(p,t),1.); }
  let t0=U.c.x; let E=eyeOf(4.,t0); let z=exp(6.6*pow(smoothstep(0.,.85,tp),1.5)); let pz=E+(p-E)/z;
  var col=night(pz,t0)*(1.-smoothstep(.45,.80,tp));
  let open=smoothstep(.70,1.05,tp)*(1.-smoothstep(1.30,1.58,tp));                          // the hollow opens onto what is coming, and closes to dark
  let lid=length(p*vec2f(.50,1./max(open,.001)*.62));
  if(open>0.){ col+=(figure(p,t)+city(vec2f(p.x*1.25,p.y*1.25+.42),t)*.55*smoothstep(-.2,-.5,p.y))*open*(1.-smoothstep(.72,1.,lid)); }
  return vec4f(col,1.); }
`;
