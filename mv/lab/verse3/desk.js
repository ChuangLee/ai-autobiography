// Shot 2: human heartache. One lamp, one night, a desk; the manuscripts land one on another and are written, recited, typed.
// Planar things (desk, sheets) are intersected analytically; the oil lamp, the brush and (for its shadow) the writing hand are signed distance fields.
// Thin-lens depth of field by a few stochastic samples per pixel; the flame is an analytic emitter blurred by its circle of confusion.
// slots: p[0..6] sheet (x, z, angle, y; y>50 = not here)  p[7..13] (written at ws, ws, characters/s, lift start)  p[14] flame (xyz, power)
// p[15] brush tip (xyz, on)  p[16] brush axis  p[17] forearm direction  p[18] (moon, blind, screen glow, caret on)  p[19] (caret u, v, blind phase, -)
// p[20] (exposure, dim, focus distance, lens radius)  p[21] (pixel angle, seed, samples, -)  p[22] lamp foot (x, z)  p[23..29] sheet (curl, tilt x, tilt z, -)  p[30] moonlit patch (x, z, size)
export const DESK = `
@group(0)@binding(1) var lin:sampler; @group(0)@binding(2) var artT:texture_2d<f32>; @group(0)@binding(3) var inkT:texture_2d<f32>;
fn sheetSize(i:i32)->vec2f{ switch(i){ case 0:{return vec2f(.30,.36);} case 1:{return vec2f(.34,.34);} case 2:{return vec2f(.27,.38);} case 3:{return vec2f(.33,.2475);} case 4:{return vec2f(.30,.34);} case 5:{return vec2f(.21,.29);} default:{return vec2f(.20,.29);} } }
fn tileUV(i:i32,uv:vec2f)->vec2f{ return (vec2f(f32(i%4),f32(i/4))+clamp(uv,vec2f(.0005),vec2f(.9995)))/vec2f(4.,2.); }
fn toLocal(i:i32,p:vec2f)->vec2f{ let s=u.p[i]; return rot(-s.z)*(p-s.xy); }
fn sheetN(i:i32)->vec3f{ let e=u.p[23+i]; return normalize(vec3f(-e.y,1.,-e.z)); }
fn sheetY(i:i32,p:vec2f)->f32{ let s=u.p[i]; let e=u.p[23+i]; let d=p-s.xy; return s.w+e.y*d.x+e.z*d.y; }
fn curl(i:i32,l:vec2f)->vec3f{ // height of the paper's curl and its slope (local)
  let hs=sheetSize(i)*.5; let c=u.p[23+i].x; let a=l/hs; let a3=a*a*a;
  let h=c*(a3.x*a.x*.005+a3.y*a.y*.003+.0005*sin(l.y*13.+f32(i))*a.x);
  let gx=c*(4.*a3.x*.005/hs.x+.0005*sin(l.y*13.+f32(i))/hs.x); let gz=c*(4.*a3.y*.003/hs.y+.0005*13.*cos(l.y*13.+f32(i))*a.x);
  return vec3f(h,gx,gz); }
struct SH{ t:f32, i:i32, l:vec2f }
fn hitSheets(ro:vec3f,rd:vec3f)->SH{ var r=SH(1e9,-1,vec2f(0.));
  for(var i=0;i<7;i++){ let s=u.p[i]; if(s.w>50.){ continue; } let n=sheetN(i); let c=vec3f(s.x,s.w,s.y); let dn=dot(rd,n); if(abs(dn)<1e-5){ continue; }
    let t=dot(c-ro,n)/dn; if(t<=0.||t>r.t+1e-6){ continue; } let p=ro+rd*t; let l=toLocal(i,p.xz); let hs=sheetSize(i)*.5; if(abs(l.x)>hs.x||abs(l.y)>hs.y){ continue; }
    if(i==0){ let a=textureSampleLevel(artT,lin,tileUV(i,l/(hs*2.)+.5),1.).a; if(a<.5){ continue; } }
    r=SH(t,i,l); }
  return r; }
// ── the oil lamp (a glazed dish on a stem), the brush, the hand
fn sdCyl(p:vec3f,r:f32,h:f32)->f32{ let d=vec2f(length(p.xz)-r,abs(p.y)-h); return min(max(d.x,d.y),0.)+length(max(d,vec2f(0.))); }
fn capsule(p:vec3f,a:vec3f,b:vec3f,r:f32)->f32{ let pa=p-a; let ba=b-a; let h=sat(dot(pa,ba)/dot(ba,ba)); return length(pa-ba*h)-r; }
fn smin(a:f32,b:f32,k:f32)->f32{ let h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }
fn lampBase()->vec3f{ return vec3f(u.p[22].x,0.,u.p[22].y); }
const LH=.36;
fn sdLamp(p0:vec3f)->vec2f{ let p=p0-lampBase(); if(length(p.xz)>.09||p.y>LH+.03){ return vec2f(max(length(p.xz)-.08,p.y-LH-.02),0.); }
  var d=sdCyl(p-vec3f(0.,.008,0.),.064,.006)-.003; d=smin(d,sdCyl(p-vec3f(0.,.022,0.),.036,.007)-.002,.01);
  let sr=.0085+.007*exp(-p.y*36.)+.005*exp(-abs(p.y-(LH-.02))*55.); d=smin(d,max(length(p.xz)-sr,abs(p.y-LH*.5)-LH*.5),.006);
  d=smin(d,length((p-vec3f(0.,LH*.52,0.))/vec3f(1.,.55,1.))-.019,.006); d=smin(d,length((p-vec3f(0.,LH*.2,0.))/vec3f(1.,.5,1.))-.015,.006);
  let rim=mix(.024,.064,sat((p.y-(LH-.03))/.03)); var dish=max(length(p.xz)-rim,abs(p.y-(LH-.015))-.015); dish=max(dish,-(length(p-vec3f(0.,LH+.084,0.))-.0855)); d=smin(d,dish,.004);
  var m=1.; let oil=max(length(p.xz)-.056,abs(p.y-(LH-.007))-.001); if(oil<d){ d=oil; m=2.; }
  let wd=vec3f(u.p[22].z,0.,u.p[22].w); let wk=capsule(p,wd*.045+vec3f(0.,LH-.007,0.),wd*.053+vec3f(0.,LH+.003,0.),.0016); if(wk<d){ d=wk; m=3.; }
  return vec2f(d,m); }
fn sdBrush(p:vec3f)->vec2f{ if(u.p[15].w<.5){ return vec2f(1.,0.); } let T=u.p[15].xyz; let A=u.p[16].xyz; let v=p-T; let h=dot(v,A); let r=length(v-A*h);
  if(r>.03||h<-.01||h>.26){ return vec2f(max(r-.02,max(-h,h-.25)),0.); }
  let f=sat(h/.03); let R=.0056*pow(f,.5)*(1.-.22*f*f*f*f); var d=max(r-R,max(-h,h-.03))*.7; var m=4.;
  let fe=max(r-.0062,abs(h-.0335)-.0035); if(fe<d){ d=fe; m=5.; }
  let sh=max(r-(.0046+.0005*exp(-pow((h-.11)/.004,2.))+.0005*exp(-pow((h-.2)/.004,2.))),abs(h-.141)-.104); if(sh<d){ d=sh; m=6.; }
  return vec2f(d,m); }
fn sdHand(p:vec3f)->f32{ if(u.p[15].w<.5){ return 1.; } let T=u.p[15].xyz; let A=u.p[16].xyz; let D=u.p[17].xyz; let S=normalize(cross(A,D)); let G=T+A*.145;
  if(length(p-G)>.42){ return length(p-G)-.4; }
  var d=length((p-(G+D*.035+A*.012))/vec3f(.05,.05,.05))-.75; d=d*.05;
  d=smin(d,capsule(p,G+D*.03+S*.025,G-D*.012+S*.008+A*.004,.0095),.01);                                 // thumb
  for(var k=0;k<4;k++){ let fk=f32(k); let o=G+A*(.012-fk*.016); d=smin(d,capsule(p,o+D*.035-S*.02,o-D*.012-S*.012,.009-fk*.0008),.006); } // fingers round the shaft
  let W=G+D*.085-A*.005; d=smin(d,capsule(p,W,W+D*.28+vec3f(0.,-.09,0.),.032),.03);                       // forearm, down to an elbow on the desk
  return d; }
fn sdObj(p:vec3f)->vec2f{ var r=sdLamp(p); let b=sdBrush(p); if(b.x<r.x){ r=b; } return r; }
fn nObj(p:vec3f)->vec3f{ let e=vec2f(.0004,0.); return normalize(vec3f(sdObj(p+e.xyy).x-sdObj(p-e.xyy).x,sdObj(p+e.yxy).x-sdObj(p-e.yxy).x,sdObj(p+e.yyx).x-sdObj(p-e.yyx).x)); }
// ── light
fn flamePos()->vec3f{ return u.p[14].xyz; }
const FLAME=vec3f(1.,.6,.27);
fn dishShadow(p:vec3f)->f32{ let F=flamePos(); let lb=lampBase(); if(p.y>LH-.012){ return 1.; } let L=F-p; let k=(LH-.012-p.y)/L.y; let x=p+L*k; let r=length(x.xz-lb.xz); return smoothstep(.058,.064+.02*(1.-k),r); }
var<private> gJit:f32;
fn handShadow(p:vec3f)->f32{ if(u.p[15].w<.5){ return 1.; } let F=flamePos(); let L=F-p; let dl=length(L); let ld=L/dl; var res=1.; var t=.002+.006*gJit;
  if(length(p-u.p[15].xyz)>.7){ return 1.; }
  for(var i=0;i<40;i++){ let q=p+ld*t; let h=min(sdHand(q),capsule(q,u.p[15].xyz+u.p[16].xyz*.004,u.p[15].xyz+u.p[16].xyz*.24,.0048)); res=min(res,40.*h/t); t+=clamp(h*.7,.0015,.03); if(res<.01||t>dl-.02){ break; } }
  return smoothstep(0.,1.,sat(res)); }
fn sheetShadow(p:vec3f,own:i32)->f32{ let F=flamePos(); var s=1.;
  for(var j=0;j<7;j++){ let sj=u.p[j]; if(sj.w>50.||j==own){ continue; } let dy=sj.w-p.y; if(dy<.00015){ continue; }
    let L=normalize(F-p); if(L.y<.05){ continue; } let q=p+L*(dy/L.y); let l=toLocal(j,q.xz); let hs=sheetSize(j)*.5; let e=abs(l)-hs; let d=max(e.x,e.y);
    let pen=.0006+dy*.06; s*=1.-.82*smoothstep(pen,-pen,d);
    let l2=toLocal(j,p.xz); let e2=abs(l2)-hs; let d2=max(e2.x,e2.y); s*=1.-.35*smoothstep(.006,0.,abs(d2))*step(dy,.004)*step(d2,0.); }
  return s; }
fn blindAt(p:vec3f)->f32{ let b=u.p[18].y; let ph=u.p[19].z; let x=dot(p.xz,vec2f(.28,.96))*52.+ph; let s=smoothstep(.2,.42,abs(fract(x)-.5)*2.);
  let cord=1.-.7*smoothstep(.004,.0,abs(fract(dot(p.xz,vec2f(.96,-.28))*3.2+.3)-.5)-.0)*.0; return mix(1.,mix(.12,1.,s)*cord,b); }
fn lightAt(p:vec3f,n:vec3f,own:i32,obj:bool)->vec3f{ let F=flamePos(); let L=F-p; let d2=max(dot(L,L),.0004); let ld=L*inverseSqrt(d2);
  var sh=dishShadow(p); if(sh>.01){ sh*=handShadow(p); } if(!obj){ sh*=sheetShadow(p,own); }
  var e=FLAME*u.p[14].w*max(dot(n,ld),0.)/d2*sh;
  let M=normalize(vec3f(.55,.78,-.3)); let pq=rot(.35)*(p.xz-u.p[30].xy)/u.p[30].z; let pmask=smoothstep(1.,.55,max(abs(pq.x)*.8,abs(pq.y)));     // moonlight through a window, a blind across it
  e+=vec3f(.42,.55,.85)*u.p[18].x*max(dot(n,M),0.)*pmask*blindAt(p);
  if(u.p[18].z>0.&&u.p[3].w<50.){ let sp=vec3f(u.p[3].x,u.p[3].w+.05,u.p[3].y); let l2=sp-p; let dd=max(dot(l2,l2),.002); e+=vec3f(.5,.66,1.)*u.p[18].z*.012*max(dot(n,l2*inverseSqrt(dd)),0.)/dd; }
  return e+vec3f(.0025,.003,.0045); }
fn specAt(p:vec3f,n:vec3f,v:vec3f,r:f32)->vec3f{ let F=flamePos(); let L=F-p; let d2=max(dot(L,L),.0004); return FLAME*u.p[14].w*ggx(n,v,L*inverseSqrt(d2),r)/d2*dishShadow(p); }
fn hash1(x:f32)->f32{ return fract(sin(x*127.1+17.3)*43758.5453); }
fn liftTime(i:i32,ord:f32)->f32{ return u.p[7+i].w+ord*.028+hash1(ord*7.13+f32(i)*13.7)*.42; }
// ── surfaces
fn shadeSheet(i:i32,l:vec2f,p:vec3f,rd:vec3f,dist:f32,pix:f32)->vec3f{ let t=u.ro.w; let hs=sheetSize(i)*.5; let uv=l/(hs*2.)+.5; let tuv=tileUV(i,uv);
  let lod=log2(max(pix*dist/max(abs(rd.y),.15)/(hs.x*2./1024.),1e-3)); let st=u.p[7+i];
  let art=textureSampleLevel(artT,lin,tuv,lod); var alb=lin3(art.rgb);
  let ik=textureSampleLevel(inkT,lin,tuv,lod); let ib=textureSampleLevel(inkT,lin,tuv,lod+2.2).r; let io=textureSampleLevel(inkT,lin,tuv,0.);
  let ord=floor(io.g*255./4.+.5); let ramp=io.b; let P=st.x+max(t-st.y,0.)*st.z;
  var vis=smoothstep(-.06,.06,P-ord-ramp); if(i==1){ vis=smoothstep(ord,ord+1.2,P); } if(i==3){ vis=step(ord+.5,P); }
  let tl=liftTime(i,ord); let lifted=smoothstep(tl,tl+.16,t); vis*=1.-lifted;
  var k=ik.r*vis; let tw=st.y+(ord-st.x)/max(st.z,1e-3); var wet=0.; if((i==0||i==2)&&ord>=st.x){ wet=(1.-smoothstep(.0,2.6,t-tw))*step(tw,t); }
  // the paper's surface: fibres and the curl of the sheet
  let c=curl(i,l); let fp=pix*dist/max(abs(rd.y),.2); let fib=vec2f(vnoise(l*vec2f(700.,300.))-.5,vnoise(l*vec2f(300.,700.)+7.)-.5)*.06; let gl=vec2f(c.y,c.z)+fib*smoothstep(.0012,.0004,fp);
  let gw=rot(u.p[i].z)*gl; var n=normalize(sheetN(i)-vec3f(gw.x,0.,gw.y)); let pp=p+vec3f(0.,c.x,0.);
  if(i==3){ // the blog: a screen's light, not paper. Text in pixels, the caret blinking
    var scr=alb*(.04+.85*u.p[18].z); let sc=.84+.16*sin(uv.y*480.*6.2832); scr*=mix(1.,sc,smoothstep(2.5,.5,lod));
    scr=mix(scr,vec3f(.0),k); let cq=(uv-u.p[19].xy)*vec2f(640.,480.); if(u.p[18].w>.5&&abs(cq.x)<.6&&abs(cq.y)<7.){ scr=vec3f(0.); }
    let edge=smoothstep(0.,.03,min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y))); return scr*edge*(1.-.25*dot(uv-.5,uv-.5)*4.)+specAt(pp,n,-rd,.08)*.04; }
  var inkCol=vec3f(.011,.010,.011); if(i==5){ inkCol=vec3f(.012,.02,.055); } if(i==6){ inkCol=vec3f(.02,.018,.016); }
  let dens=.84+.16*vnoise(tuv*vec2f(4096.,2048.)*.5)+.1*sat(ik.r-ib*1.1);
  var bleed=.1; if(i==4){ bleed=.28; } if(i==6){ bleed=.03; }
  alb*=1.-bleed*ib*vis*(1.-k);
  alb=mix(alb,inkCol,sat(k*dens));
  var col=alb*lightAt(pp,n,i,false);
  col+=lightAt(pp,n,i,false)*alb*.35*sat(1.-k);                                                                       // light through the paper
  col+=specAt(pp,n,-rd,.42)*(.02+.05*k)+specAt(pp,n,-rd,.18)*wet*k*.05;                                                   // the sheen of paper; fresh ink glistens
  let ed=min(hs.x-abs(l.x),hs.y-abs(l.y)); col*=mix(.55,1.,smoothstep(.0,.0025+pix*dist,ed)); col+=lightAt(pp,vec3f(0.,1.,0.),i,false)*alb*.25*smoothstep(.0015+pix*dist,.0,ed);
  return col; }
fn shadeDesk(p:vec3f,rd:vec3f,dist:f32,pix:f32)->vec3f{ let q=p.xz;
  let g=fbm(vec2f(q.x*2.2,q.y*38.)+vec2f(0.,fbm(q*3.)*2.)); let ring=.5+.5*sin(q.y*190.+g*14.);
  var alb=vec3f(.085,.046,.024)*(.7+.5*g)*(.85+.15*ring); alb*=.9+.1*vnoise(q*vec2f(40.,800.));
  let n=normalize(vec3f((vnoise(q*vec2f(30.,600.))-.5)*.02,1.,(vnoise(q*vec2f(600.,30.))-.5)*.02));
  var col=alb*lightAt(p,n,-1,false); let fr=.04+.96*pow(1.-max(dot(-rd,n),0.),5.);
  col+=specAt(p,n,-rd,.22)*fr*2.2*sheetShadow(p,-1)*handShadow(p);
  return col; }
fn shadeObj(p:vec3f,rd:vec3f,m:f32)->vec3f{ let n=nObj(p); var alb=vec3f(.1,.07,.04); var r=.22; var sp=1.; var e=vec3f(0.);
  if(m==2.){ alb=vec3f(.03,.02,.008); r=.05; } if(m==3.){ alb=vec3f(.02); let F=flamePos(); e=FLAME*3.*exp(-length(p-F)*300.); }
  if(m==4.){ alb=vec3f(.012,.011,.012); r=.15; sp=1.5; } if(m==5.){ alb=vec3f(.03,.012,.01); r=.25; } if(m==6.){ alb=vec3f(.42,.28,.12)*(.8+.2*vnoise(vec2f(dot(p,vec3f(1.,0.,1.))*2000.,p.y*30.))); r=.35; }
  if(m==1.){ let lb=lampBase(); alb=mix(vec3f(.12,.075,.035),vec3f(.06,.05,.03),smoothstep(.0,.2,p.y-lb.y)*.0+.5*vnoise(p.xz*300.+p.y*80.)); r=.18; }
  let fr=.04+.96*pow(1.-max(dot(-rd,n),0.),5.); let F=flamePos(); let lf=normalize(F-p); let back=sat(dot(lf,rd)*1.2); let rim=pow(1.-abs(dot(n,rd)),3.)*back*u.p[14].w/max(dot(F-p,F-p),.01)*.25;
  return alb*lightAt(p,n,-1,true)+specAt(p,n,-rd,r)*fr*sp*2.+e+FLAME*rim*(alb*4.+.04); }
fn flameGlow(ro:vec3f,rd:vec3f,tmax:f32,coc:f32)->vec3f{ let F=flamePos()+vec3f(0.,.007,0.); let tc=dot(F-ro,rd); if(tc<0.||tc>tmax+.02){ return vec3f(0.); }
  let v=ro+rd*tc-F; let fl=u.p[14].w; let w=coc*tc;
  let q=v/vec3f(.0032,.0095,.0032); let s2=1.+w*w/(.0032*.0032); let core=exp(-dot(q,q)/s2)/s2;
  let q2=v/vec3f(.0062,.016,.0062); let s3=1.+w*w/(.007*.007); let outer=exp(-dot(q2,q2)/s3)/s3;
  let blue=exp(-dot((v+vec3f(0.,.008,0.))/vec3f(.004,.003,.004),(v+vec3f(0.,.008,0.))/vec3f(.004,.003,.004))/s2)/s2;
  let halo=exp(-length(v)*40.)*.04;
  return (vec3f(1.,.88,.6)*core*10.+vec3f(1.,.42,.1)*outer*.9+vec3f(.15,.25,1.)*blue*.8+FLAME*halo*.5)*fl*14.; }
fn radiance(ro:vec3f,rd:vec3f,pix:f32)->vec3f{ let sh=hitSheets(ro,rd); var td=1e9; if(rd.y<0.){ td=-ro.y/rd.y; } let tp=min(sh.t,td);
  // march the lamp and the brush up to the paper
  var t=.002; var hit=false; var m=0.; let tm=min(tp,3.);
  for(var i=0;i<72;i++){ let r=sdObj(ro+rd*t); if(r.x<.00025*t+.00004){ hit=true; m=r.y; break; } t+=r.x*.9; if(t>tm){ break; } }
  var col=vec3f(0.); var tt=tp;
  if(hit){ col=shadeObj(ro+rd*t,rd,m); tt=t; }
  else if(sh.i>=0&&sh.t<=td){ col=shadeSheet(sh.i,sh.l,ro+rd*sh.t,rd,sh.t,pix); }
  else if(td<1e8){ col=shadeDesk(ro+rd*td,rd,td,pix); col*=1.-smoothstep(1.2,3.,length((ro+rd*td).xz)); }
  return col; }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let F=u.p[20].z; let R=u.p[20].w; let N=i32(u.p[21].z); let seed=u.p[21].y; let pix=u.p[21].x;
  let rtn=normalize(u.rt.xyz); let upn=normalize(u.up.xyz); let fwn=normalize(u.fw.xyz); var acc=vec3f(0.); let r0=ign(fc.xy+seed*vec2f(47.,17.));
  for(var i=0;i<N;i++){ let fi=f32(i); let h2=hash22(fc.xy+vec2f(fi*7.3+seed*13.,fi*3.1+seed*5.)); let rd0=rayDir(fc.xy+h2-.5); let fp=u.ro.xyz+rd0*(F/dot(rd0,fwn));
    gJit=fract(r0+fi*.7548776); let a=6.2831853*(r0+fi*.61803); let rr=sqrt((fi+.5)/f32(N))*R; let o=u.ro.xyz+(rtn*cos(a)+upn*sin(a))*rr; let d=normalize(fp-o);
    acc+=min(radiance(o,d,pix),vec3f(40.)); }
  var c=acc/f32(N);
  // the flame, blurred analytically by the lens instead of by samples (no sparkle)
  let rd=rayDir(fc.xy); let tf=dot(flamePos()-u.ro.xyz,rd); let cocw=R*abs(tf-F)/max(F*tf,.001);
  c+=flameGlow(u.ro.xyz,rd,1e3,cocw);
  return vec4f(c*u.p[20].x*(1.-u.p[20].y),u.fw.w); }
`;
