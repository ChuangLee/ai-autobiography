// 朱罗王朝的青铜舞王（Nataraja）：右腿立在侏儒阿帕斯玛拉背上，左腿抬起横摆；前左臂“象鼻手”斜过胸前垂向抬起的脚，前右手施无畏印；
// 后两手一持手鼓一托火；另有四臂展开各托一物（书、笔、法轮、莲）。宽肩、细腰、圆润的四肢、宁静的脸；发辫向两侧飞开直到火焰圈；
// 火焰圈是马蹄形的环，外缘一圈三叉的火舌；脚下双层莲座、方座。光线步进的有向距离场；金属的微表面高光、凹处的铜绿；博物馆的灯；方座立在一池静水里。
// 结尾镜头推近那只象鼻手：它伸出来，接下来就是壁画里的金手。
// p0 = eye.xyz, tan(fov/2)   p1 = target.xyz, steps   p2 = reach (the gajahasta arm stretches forward), time, reflections (0/1)
export const BRONZE = /* wgsl */`
fn cap(p:vec3f,a:vec3f,b:vec3f,ra:f32,rb:f32)->f32{ let pa=p-a; let ba=b-a; let h=sat(dot(pa,ba)/dot(ba,ba)); return length(pa-ba*h)-mix(ra,rb,h); }
fn ell(p:vec3f,r:vec3f)->f32{ let k0=length(p/r); let k1=length(p/(r*r)); return k0*(k0-1.)/max(k1,1e-5); }
fn tor(p:vec3f,R:f32,r:f32)->f32{ return length(vec2f(length(p.xz)-R,p.y))-r; }
fn box3(p:vec3f,b:vec3f,r:f32)->f32{ let q=abs(p)-b; return length(max(q,vec3f(0.)))+min(max(q.x,max(q.y,q.z)),0.)-r; }
// eight arms: elbow, wrist (xyz) and the direction of the fingers (xyz) + what the hand holds; palm normal
const AE=array<vec3f,8>(vec3f(.42,1.53,-.06),vec3f(.47,1.39,-.09),vec3f(.47,1.23,-.09),vec3f(.36,1.17,.16),vec3f(-.42,1.53,-.06),vec3f(-.47,1.39,-.09),vec3f(-.47,1.23,-.09),vec3f(-.34,1.14,.10));
const AW=array<vec3f,8>(vec3f(.50,1.75,-.07),vec3f(.67,1.52,-.10),vec3f(.69,1.24,-.11),vec3f(.05,1.12,.30),vec3f(-.50,1.75,-.07),vec3f(-.67,1.52,-.10),vec3f(-.69,1.24,-.11),vec3f(-.36,1.37,.14));
const AF=array<vec4f,8>(vec4f(.25,.97,0.,0.),vec4f(.45,.9,0.,1.),vec4f(.95,.3,0.,2.),vec4f(-.78,-.6,.08,-1.),vec4f(-.25,.97,0.,3.),vec4f(-.45,.9,0.,4.),vec4f(-.95,.3,0.,5.),vec4f(0.,1.,.05,-1.));
const AN=array<vec3f,8>(vec3f(0.,0.,1.),vec3f(0.,0.,1.),vec3f(0.,0.,1.),vec3f(.15,-.5,-.85),vec3f(0.,0.,1.),vec3f(0.,0.,1.),vec3f(0.,0.,1.),vec3f(0.,0.,1.));
fn held(q:vec3f,k:i32)->f32{ // in the hand's frame: x across, y along the fingers, z out of the palm
  if(k==0){ let w=q-vec3f(0.,.07,.03); return length(w*vec3f(1.,.55+.9*sat(w.y*8.+.4),1.))-.035+.006*sin(w.y*60.+U.p[2].y*6.); }   // fire
  if(k==1){ return box3(q-vec3f(0.,.08,.025),vec3f(.018,.09,.012),.004); }                                                          // palm-leaf book
  if(k==2){ return min(cap(q,vec3f(0.,-.05,.025),vec3f(0.,.16,.025),.007,.007),cap(q,vec3f(0.,.16,.025),vec3f(0.,.22,.025),.014,.001)); } // brush
  if(k==3){ let w=q-vec3f(0.,.11,.02); return min(cap(w,vec3f(0.,-.06,0.),vec3f(0.,0.,0.),.045,.012),cap(w,vec3f(0.,0.,0.),vec3f(0.,.06,0.),.012,.045)); } // drum
  if(k==4){ let w=(q-vec3f(0.,.10,.02)).xzy; return min(tor(w,.06,.009),min(cap(w,vec3f(-.06,0.,0.),vec3f(.06,0.,0.),.006,.006),cap(w,vec3f(0.,0.,-.06),vec3f(0.,0.,.06),.006,.006))); } // wheel
  let w=q-vec3f(0.,.08,.02); return min(ell(w,vec3f(.03,.045,.03)),cap(q,vec3f(0.,-.04,.02),vec3f(0.,.04,.02),.005,.005)); }    // lotus bud
fn hand(p:vec3f,wr:vec3f,fd:vec3f,pn:vec3f,k:i32)->f32{ let ac=normalize(cross(fd,pn)); let q=vec3f(dot(p-wr,ac),dot(p-wr,fd),dot(p-wr,pn));
  if(length(q-vec3f(0.,.09,0.))>.2){ return length(q-vec3f(0.,.09,0.))-.15; }
  var d=ell(q-vec3f(0.,.045,0.),vec3f(.04,.052,.017));
  let curl=select(.25,.05,k<0);
  for(var i=0;i<4;i++){ let fi=f32(i)-1.5; let b=vec3f(fi*.019,.088-abs(fi)*.006,0.); let L=.062-abs(fi+.5)*.008; let m=b+vec3f(fi*.004,L*.55,L*curl*.35); let tip=b+vec3f(fi*.007,L*(1.-curl*.3),L*curl);
    d=smin(d,min(cap(q,b,m,.0105,.0095),cap(q,m,tip,.0095,.008)),.008); }
  d=smin(d,min(cap(q,vec3f(-.035,.02,.006),vec3f(-.058,.055,.02),.012,.01),cap(q,vec3f(-.058,.055,.02),vec3f(-.062,.085,.026),.01,.008)),.01);
  if(k>=0){ d=min(d,held(q,k)); } return d; }
fn figure(p:vec3f)->f32{ let ax=vec3f(abs(p.x),p.y,p.z);
  // each group of parts is only worked out near its own height; elsewhere a safe bound stands in for it
  var d=9.;
  if(p.y>.74&&p.y<1.66){
  // torso: rounded hips, a narrow waist, a broad chest, the shoulders
  d=ell(p-vec3f(.02,.93,0.),vec3f(.165,.12,.11));
  d=smin(d,cap(p,vec3f(.015,.95,0.),vec3f(0.,1.13,.0),.115,.1),.06);
  d=smin(d,ell(p-vec3f(0.,1.27,.012),vec3f(.185,.15,.115)),.07);
  d=smin(d,cap(p,vec3f(-.19,1.375,-.005),vec3f(.19,1.375,-.005),.068,.068),.06);
  d=smin(d,ell(ax-vec3f(.08,1.3,.07),vec3f(.085,.06,.04)),.05);                          // the pectorals, broad and flat
  d=smin(d,cap(p,vec3f(0.,1.41,0.),vec3f(0.,1.53,.01),.05,.046),.03);
  d=min(d,tor(p-vec3f(0.,1.43,.005),.07,.009)); d=min(d,tor((p-vec3f(0.,1.36,.03))*vec3f(1.,1.6,1.),.12,.012));
  d=min(d,tor(p-vec3f(.015,1.0,0.),.128,.014)); { let tq=p-vec3f(.0,1.22,.0); let tq2=vec3f(dot(tq,vec3f(.78,.62,0.)),dot(tq,vec3f(.62,-.78,0.)),tq.z*1.45); d=min(d,length(vec2f(length(tq2.xz)-.2,tq2.y))-.006); }
  } else { d=max(.8-p.y,p.y-1.6); }
  if(p.y>1.47){
  // the head: a calm oval face, nose, lips, the brow; earrings; the tall crown and the fan behind it
  let hp=p-vec3f(0.,1.62,.012); d=smin(d,ell(hp,vec3f(.08,.1,.088)),.02);
  d=smin(d,cap(p,vec3f(0.,1.645,.083),vec3f(0.,1.6,.1),.009,.013),.012); d=smin(d,ell(p-vec3f(0.,1.571,.084),vec3f(.024,.008,.011)),.006); d=smin(d,ell(p-vec3f(0.,1.557,.082),vec3f(.02,.007,.01)),.006);
  d=smax(d,-ell(ax-vec3f(.031,1.634,.088),vec3f(.022,.0075,.012)),.006);                 // the eyes, long and half closed
  d=smin(d,cap(ax,vec3f(.008,1.652,.088),vec3f(.055,1.648,.075),.005,.004),.008);       // the brow
  d=smin(d,ell(p-vec3f(0.,1.538,.068),vec3f(.03,.02,.025)),.02);                         // the chin
  d=smin(d,cap(ax,vec3f(.018,1.655,.083),vec3f(.055,1.66,.07),.008,.006),.01);
  d=min(d,tor((ax-vec3f(.088,1.56,.0)).yxz,.022,.006));
  d=min(d,cap(p,vec3f(0.,1.7,-.005),vec3f(0.,1.93,-.02),.075,.03)); d=min(d,tor(p-vec3f(0.,1.72,-.005),.077,.011)); d=min(d,tor(p-vec3f(0.,1.81,-.01),.058,.009));
  let fp=p-vec3f(0.,1.7,-.07); let fa=atan2(fp.y,fp.x); let fr=length(fp.xy); d=min(d,max(max(fr-.21-.018*cos(fa*26.),abs(fp.z)-.007),-fp.y-.02));
  } else { d=min(d,1.5-p.y); }
  if(p.y<1.05){
  // legs: the right stands, bent, on the dwarf; the left is lifted and swung across
  d=smin(d,cap(p,vec3f(-.085,.9,0.),vec3f(-.2,.52,.06),.088,.06),.05); d=smin(d,cap(p,vec3f(-.2,.52,.06),vec3f(-.125,.14,.02),.06,.036),.03);
  d=smin(d,ell(p-vec3f(-.19,.4,.07),vec3f(.05,.1,.05)),.03);
  d=smin(d,cap(p,vec3f(-.125,.11,.02),vec3f(-.125,.075,.13),.034,.026),.03);
  d=smin(d,cap(p,vec3f(.085,.9,0.),vec3f(.40,.79,.18),.088,.06),.05); d=smin(d,cap(p,vec3f(.40,.79,.18),vec3f(-.1,.61,.29),.06,.036),.03);
  d=smin(d,ell(p-vec3f(.3,.73,.22),vec3f(.1,.05,.05)),.03);
  d=smin(d,cap(p,vec3f(-.1,.61,.29),vec3f(-.25,.56,.31),.034,.022),.03);
  d=min(d,tor((p-vec3f(-.125,.15,.02)),.04,.009)); d=min(d,tor((p-vec3f(-.09,.6,.29)).yxz,.04,.009));
  // the dwarf Apasmara lying on the lotus under the right foot
  d=min(d,cap(p,vec3f(-.32,.075,.05),vec3f(.18,.075,.05),.055,.06)); d=smin(d,length(p-vec3f(.25,.11,.08))-.05,.03); d=smin(d,cap(p,vec3f(.2,.09,.1),vec3f(.3,.2,.12),.018,.014),.02);
  } else { d=min(d,p.y-1.); }
  // the sash, flying out from the waist on his right
  { let sx=-p.x-.14; if(sx>0.&&sx<.6){ let sy=1.0+.06*sx+.03*sin(sx*12.+U.p[2].y*2.); d=min(d,max(abs(p.y-sy)-.022*(1.-sx*.8),abs(p.z-.02-.03*sin(sx*7.))-.006)-.003); } }
  // the locks flying out to both sides, six on each, ending at the ring; a flower here and there
  if(p.y>1.15&&p.y<1.85&&ax.x>.06&&ax.x<.92){ let sx=sat((ax.x-.08)/.8); for(var i=0;i<6;i++){ let fi=f32(i)-2.5;
      let y=mix(1.62+.03*fi,1.44+.1*fi,smoothstep(0.,1.,sx))+.022*sin(ax.x*16.+fi*1.7+U.p[2].y*1.5)*sx;
      let lk=length(vec2f((p.y-y)*.8,p.z+.04))-(.013-.006*sx); d=smin(d,lk,.01); }
    let fl=length(vec3f(ax.x-.5,p.y-1.53,p.z+.03))-.025; d=min(d,fl); }
  // the arms: upper arm, armlet, forearm, bracelet, hand and what it holds
  let reach=U.p[2].x;
  for(var i=0;i<8;i++){ let sh=vec3f(select(-.19,.19,i<4),1.375,0.); var el=AE[i]; var wr=AW[i]; if(i==3){ el+=vec3f(.02,-.12,.14)*reach; wr+=vec3f(.02,.04,.18)*reach; }
    let bb=min(cap(p,sh,el,.0,.0),cap(p,el,wr,.0,.0)); if(bb>.32){ d=min(d,bb-.2); continue; }
    d=smin(d,cap(p,sh,el,.06,.048),.04); d=min(d,cap(p,mix(sh,el,.28),mix(sh,el,.36),.066,.064));
    d=smin(d,cap(p,el,wr,.047,.033),.025); d=min(d,cap(p,mix(el,wr,.86),mix(el,wr,.92),.04,.038));
    var fd=AF[i].xyz; if(i==3){ fd=mix(fd,vec3f(-.95,.12,.1),reach); }
    d=smin(d,hand(p,wr,normalize(fd),normalize(AN[i]),i32(AF[i].w)),.015); }
  return d; }
fn ring(p:vec3f)->f32{ let C=vec3f(0.,1.02,-.08); let q=p-C; let R=.96;
  if(p.y>.25){ let rl=length(q.xy); var d=box3(vec3f(rl-R,0.,q.z),vec3f(.034,0.,.024),.008);
    d=min(d,length(vec2f(rl-R+.05,q.z))-.012);
    let ra=atan2(q.y,q.x); let n=34.; let ci=floor(ra/TAU*n); let ca=(ra/TAU*n-ci-.5)*TAU/n; let s=ca*rl; let r2=rl-R-.03;
    let curl=.022*sin(ci*2.3+U.p[2].y*2.); let fq=vec3f(r2,s,q.z);
    var f=min(cap(fq,vec3f(0.,0.,0.),vec3f(.075,curl,0.),.034,.016),cap(fq,vec3f(.075,curl,0.),vec3f(.15,-curl*.6,0.),.016,.002));
    f=smin(f,min(cap(fq,vec3f(.0,.022,0.),vec3f(.06,.05+curl*.4,0.),.02,.008),cap(fq,vec3f(.06,.05+curl*.4,0.),vec3f(.095,.042+curl,0.),.008,.002)),.012);
    f=smin(f,min(cap(fq,vec3f(.0,-.022,0.),vec3f(.06,-.05+curl*.4,0.),.02,.008),cap(fq,vec3f(.06,-.05+curl*.4,0.),vec3f(.095,-.042+curl,0.),.008,.002)),.012);
    f=max(f,abs(q.z)-.012)-.004; d=smin(d,f,.014); return d; }
  let lx=abs(p.x)-sqrt(R*R-(.25-1.02)*(.25-1.02)); return box3(vec3f(lx,p.y-.05,p.z+.08),vec3f(.034,.2,.024),.008); }
fn pedestal(p:vec3f)->f32{ let rr=length(p.xz); let th=atan2(p.z,p.x);
  let pet=abs(fract(th/TAU*18.)-.5);
  var d=max(rr-.43-.03*(1.-pet*2.)*smoothstep(-.04,.04,p.y),abs(p.y-.0)-.05)-.012;
  d=min(d,max(rr-.47+.04*pet*2.*smoothstep(-.06,-.14,p.y),abs(p.y+.1)-.045)-.012);
  d=min(d,box3(p-vec3f(0.,-.24,0.),vec3f(.7,.07,.34),.01)); d=min(d,box3(p-vec3f(0.,-.16,0.),vec3f(.62,.015,.3),.008)); d=min(d,box3(p-vec3f(0.,-.33,0.),vec3f(.74,.025,.37),.01));
  return d; }
fn map(p:vec3f)->f32{ let bd=length((p-vec3f(0.,.9,0.))*vec3f(1.,.82,1.))-1.4; if(bd>.3){ return bd; }
  return min(min(figure(p),ring(p)),pedestal(p)); }
fn nrm(p:vec3f)->vec3f{ let e=vec2f(.0009,-.0009); return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx)); }
fn env(rd:vec3f)->vec3f{ // the gallery: dark, a long soft light overhead, a warm one front left, a cold slit behind right
  var c=mix(hx(0x0a0908u),hx(0x1b1713u),sat(rd.y*.5+.5));
  c+=hx(0xfff0d8u)*2.4*smoothstep(.7,.92,rd.y)*smoothstep(.9,.2,abs(rd.x));
  c+=hx(0xffc890u)*1.5*smoothstep(.55,.88,dot(rd,normalize(vec3f(-.8,.35,.6)))); c+=hx(0x9fc0ffu)*.9*smoothstep(.78,.96,dot(rd,normalize(vec3f(.75,.25,-.6))));
  return lin3(c*.5)*1.1; }
fn march(ro:vec3f,rd:vec3f,steps:i32,tmax:f32)->f32{ var t=0.; for(var i=0;i<steps;i++){ let d=map(ro+rd*t); if(d<.0008*(1.+t)){ return t; } t+=d*.85; if(t>tmax){ break; } } return -1.; }
fn shade(p:vec3f,rd:vec3f,full:bool)->vec3f{ let n=nrm(p); let v=-rd; var ao=1.;
  if(full){ for(var i=1;i<=4;i++){ let h=.025*f32(i); ao-=(h-map(p+n*h))*(1.1/f32(i)); } ao=sat(ao); }
  // bronze with the warmth of gold; dark green-brown where the polisher's hand does not reach
  let cav=smoothstep(.85,.35,ao); let pat=sat(cav*.85+.3*smoothstep(.55,.8,fbm3(p*16.))*cav+.15*smoothstep(.6,.8,fbm3(p*9.+3.)));
  let F0=mix(lin3(hx(0xe7a955u)),lin3(hx(0x3f4630u))*.55,pat*.8); let rough=mix(.26,.6,pat)+.06*fbm3(p*40.);
  var col=vec3f(0.); let r=reflect(rd,n); let ndv=max(dot(n,v),1e-3); let fr=F0+(1.-F0)*pow(1.-ndv,5.);
  col+=fr*mix(env(r),env(n)*.45+env(r)*.25,rough)*ao;
  for(var i=0;i<2;i++){ let l=normalize(select(vec3f(.65,.35,-.6),vec3f(-.55,.72,.55),i==0)); let lc=select(lin3(hx(0xa9c4ffu))*1.3,lin3(hx(0xffe2b8u))*2.4,i==0);
    let h=normalize(l+v); let nl=sat(dot(n,l)); let nh=sat(dot(n,h)); let a2=rough*rough*rough*rough; let dn=nh*nh*(a2-1.)+1.; let D=a2/(PI*dn*dn); let k=(rough+1.)*(rough+1.)/8.; let G=nl/(nl*(1.-k)+k)*ndv/(ndv*(1.-k)+k);
    var sh=1.; if(full&&i==0){ var ts=.02; for(var j=0;j<16;j++){ let ds=map(p+n*.003+l*ts); sh=min(sh,10.*ds/ts); ts+=clamp(ds,.015,.12); if(sh<.02||ts>1.5){ break; } } sh=sat(sh); }
    col+=(F0*D*G/max(4.*ndv,.05)+F0*.05*pat)*lc*nl*sh; }
  return col*(.3+.7*ao); }
fn back(rd:vec3f,ro:vec3f)->vec3f{ // the gallery wall: dark, the pool of a lamp behind the figure
  let tw=(-3.-ro.z)/min(rd.z,-1e-3); let hp=ro+rd*tw; let q=(hp.xy-vec2f(0.,1.1))*vec2f(.4,.48); let g=exp(-dot(q,q));
  return lin3(mix(hx(0x0c0a09u),hx(0x4e3c2bu),g*smoothstep(-1.2,.3,hp.y))*(.9+.2*fbm(hp.xy*3.))*(1.-.4*smoothstep(-.1,-.37,hp.y))); }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let ro=U.p[0].xyz; let ta=U.p[1].xyz; let fw=normalize(ta-ro); let rt=normalize(cross(fw,vec3f(0.,1.,0.))); let up=cross(rt,fw); let q=frame(fc.xy)*2.*U.p[0].w; let rd=normalize(fw+rt*q.x+up*q.y);
  let steps=i32(U.p[1].w); var col=back(rd,ro); let wy=-.37; let tp=(wy-ro.y)/min(rd.y,-1e-4);
  let t=march(ro,rd,steps,14.);
  if(t>0.&&(rd.y>=0.||t<tp)){ col=shade(ro+rd*t,rd,true); }
  else if(rd.y<0.&&(-3.-ro.z)/min(rd.z,-1e-3)>tp){ // the still pool: the figure, the wall and the lamps stand in it
    let wp=ro+rd*tp; let rip=.01*vec3f(vnoise(wp.xz*5.+U.t*.25)-.5,0.,vnoise(wp.xz*5.+7.-U.t*.2)-.5); let r2=normalize(reflect(rd,vec3f(0.,1.,0.))+rip);
    var rc=back(r2,wp); if(U.p[2].z>.5){ let t2=march(wp,r2,steps/2,8.); if(t2>0.){ rc=shade(wp+r2*t2,r2,false); } }
    let fr=.06+.94*pow(1.-sat(-rd.y),4.); col=rc*mix(.45,.95,fr)*exp(-.03*tp)+lin3(hx(0x0a0908u))+lin3(hx(0x3a2c1eu))*exp(-abs(wp.x)*1.5)*exp(-abs(wp.z+1.)*.8)*.6; }
  return vec4f(col,U.w); }
`;
