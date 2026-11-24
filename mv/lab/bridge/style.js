import { NOISE, FS_VS } from '../lib.js';
export const COMMON = NOISE + `
struct Scene { viewport:vec2f,t:f32,pad:f32 }
@group(0) @binding(0) var<uniform> u:Scene;
fn sat(x:f32)->f32{return clamp(x,0.,1.);}
fn env(a:f32,b:f32,c:f32,d:f32)->f32{return smoothstep(a,b,u.t)*(1.-smoothstep(c,d,u.t));}
fn px()->f32{return 1280./u.viewport.x;}
fn pigment(h:u32)->vec3f{return vec3f(f32((h>>16u)&255u),f32((h>>8u)&255u),f32(h&255u))/255.;}
fn winter()->f32{return env(199.9,202.5,204.1,206.2);}
fn autumn()->f32{return env(197.4,199.8,201.2,202.8);}
fn blossom()->f32{return max(env(193.7,195.15,196.55,197.65),smoothstep(204.1,206.7,u.t));}
fn gold()->f32{return smoothstep(207.55,210.85,u.t);}
fn camera()->vec3f{
 let z=1.+.065*smoothstep(193.,205.,u.t)+.30*smoothstep(208.8,215.25,u.t);
 return vec3f(640.-15.*smoothstep(194.,204.,u.t)+42.*gold(),360.-5.*gold(),z);
}
fn world(screen:vec2f)->vec2f{let c=camera();return (screen-vec2f(640.,360.))/c.z+c.xy;}
fn clip(w:vec2f)->vec4f{let c=camera();return vec4f((w-c.xy)*c.z/vec2f(640.,-360.),0.,1.);}
fn weave(p:vec2f)->f32{return (vnoise(p*.65)-.5)*.025+(vnoise(p*vec2f(.13,.42))-.5)*.019;}
fn gild(p:vec2f)->vec3f{
 let pos=p+5.*vec2f(vnoise(p*.014),vnoise(p*.013+36.));
 let cell=floor(pos/vec2f(38.,32.));let uv=fract(pos/vec2f(38.,32.)); let edge=min(min(uv.x,1.-uv.x)*38.,min(uv.y,1.-uv.y)*32.);
 let slip=hash21(cell);let grain=fbm(p*.019)+.40*vnoise(p*.13);
 let val=sat(.24+.48*grain+.105*(slip-.5)+.09*sin(p.x*.013+p.y*.006));
 var c=mix(pigment(0x916237u),pigment(0xf4d991u),val);
 c+=vec3f(.13,.084,.036)*(1.-smoothstep(.1,1.4,edge))*(slip-.45);
 return c+weave(p);
}
`;
export const BACKGROUND=COMMON+FS_VS+`
// Visible front of overlapping lobes in a rising cumulus. The nearest lobes keep their rounded faces.
fn cloud(base:vec3f,p0:vec2f)->vec3f{
 if(any(abs(p0-vec2f(0.,-16.))>vec2f(196.,158.))){return base;}
 let rough=vec2f(fbm(p0*.031),fbm(p0*.031+36.))-.5;
 let p=p0+rough*12.;
 let balls=array<vec4f,18>(
 vec4f(-101.,13.,39.,-3.),vec4f(-79.,-5.,40.,-1.),vec4f(-57.,15.,45.,8.),vec4f(-57.,-30.,30.,-1.),
 vec4f(-26.,-34.,47.,0.),vec4f(-5.,-76.,34.,-5.),vec4f(21.,-90.,32.,-8.),vec4f(44.,-67.,33.,-7.),
 vec4f(16.,-47.,40.,9.),vec4f(58.,-35.,40.,-3.),vec4f(84.,-7.,38.,-2.),vec4f(113.,15.,33.,-7.),
 vec4f(64.,17.,42.,7.),vec4f(16.,18.,48.,8.),vec4f(-25.,2.,45.,11.),vec4f(2.,-18.,23.,21.),
 vec4f(-101.,26.,29.,-5.),vec4f(102.,28.,25.,-2.));
 var weight=0.;var light=0.;var best=-1000.;var edge=1000.;
 for(var n=0u;n<18u;n++){
   let ball=balls[n];let q=(p-ball.xy)/vec2f(1.12,1.);let d=length(q)-ball.z;edge=min(edge,d);
   if(d>1.5){continue;}
   let z=sqrt(max(.01,ball.z*ball.z-dot(q,q)));
   let front=z+ball.w;let dominant=max(best,front);
   let old=exp(clamp((best-dominant)*.16,-40.,0.));let k=exp((front-dominant)*.16)*smoothstep(1.5,-.5,d);
   let lit=dot(normalize(vec3f(q.x,q.y,z)),vec3f(-.45,-.65,.55));
   weight=weight*old+k;light=light*old+k*lit;best=dominant;
 }
 if(edge>1.5){return base;}
 let n=light/max(weight,.001);let haze=fbm(p*.025);
 let val=sat(.56+.39*n-.16*smoothstep(-14.,34.,p.y)+.28*(haze-.48));
 let shade=mix(pigment(0x9cacc1u),pigment(0xc9cfd1u),smoothstep(.13,.57,val));
 var c=mix(shade,pigment(0xfff8e6u),smoothstep(.43,.85,val));
 c=mix(c,pigment(0xfffcecu),(1.-smoothstep(.2,4.7,abs(edge)))*.21*smoothstep(-.28,.33,n));
 return mix(base,c,1.-smoothstep(-.45,1.65,edge));
}
fn ridge(x:f32,freq:f32,base:f32,amp:f32)->f32{return base+amp*(.52*sin(x*freq)+.23*sin(x*freq*2.18+.4)+.26*vnoise(vec2f(x*freq*1.7,5.)));}
fn meadow(p:vec2f)->vec3f{
 let shade=smoothstep(305.,680.,p.y); let noise=fbm(p*vec2f(.008,.035));
 let light=.18+.46*noise+.31*vnoise(vec2f(p.x*.003,p.y*.009));
 let s=sin(p.x*.008+p.y*.013);
 var c=mix(pigment(0x46755au),pigment(0xabc269u),sat(light+.17*s));
 c=mix(c,mix(pigment(0x84764fu),pigment(0xc2ba7bu),noise),autumn()*.81);
 let sun=1.-exp(-.8*dot((p-vec2f(418.,563.))/vec2f(189.,28.),(p-vec2f(418.,563.))/vec2f(189.,28.)));
 c*=.65+.35*sun;
 let departure=smoothstep(203.1,207.,u.t);let arrival=1.-smoothstep(202.4,205.9,u.t);
 let foot1=(p-vec2f(508.-139.*departure,560.-6.*departure))/vec2f(26.,3.7);
 let foot2=(p-vec2f(519.+125.*arrival,561.+8.*arrival))/vec2f(20.,3.1);
 let contact=exp(-dot(foot1,foot1))*(1.-smoothstep(205.4,206.7,u.t))+exp(-dot(foot2,foot2))*smoothstep(202.65,204.25,u.t);
 let stripe=p.x*.47+p.y*.23+2.4*sin(p.y*.063+p.x*.071)+5.6*vnoise(p*.047)+.52*sin(p.y*.23);
 let grass=pow(max(0.,sin(stripe)),12.)*smoothstep(.47,.74,vnoise(p*vec2f(.108,.073)))*shade;
 c+=vec3f(.079,.083,.035)*grass-vec3f(.028)*pow(max(0.,cos(stripe+1.)),9.)*shade;
 c=mix(c,mix(pigment(0xb0c4c5u),pigment(0xf2f0dcu),noise+.24*sun),winter()*(.84+.15*noise));
 c*=1.-.27*min(1.,contact);
 let flowerGrid=p/vec2f(20.,12.); let loc=(fract(flowerGrid)-.23-.5*hash21(floor(flowerGrid)))*vec2f(20.,12.);
 let flower=(1.-smoothstep(.15,1.55,length(loc)))*step(.69,hash21(floor(flowerGrid)+7.))*shade;
 return mix(c,pigment(0xefe5c6u),flower*(1.-winter())*.74)+weave(p);
}
fn field(p:vec2f)->vec3f{
 var c=mix(pigment(0x519ac2u),pigment(0xd9e6cdu),smoothstep(-15.,449.,p.y)); let t=u.t-192.68;
 let vapour=fbm(p*vec2f(.004,.028)+vec2f(-t*.004,5.));
 c=mix(c,pigment(0xf3efdbu),smoothstep(.52,.77,vapour)*.13);
 if(p.x>410. && p.y<480.){ c=cloud(c,(p-vec2f(947.+t*1.5,273.))/1.69); }
 if(p.y<475.){c=cloud(c,(p-vec2f(1249.+t*1.8,349.))/.79); c=cloud(c,(p-vec2f(110.+t*1.1,354.))/.67);}
 let far=ridge(p.x,.0078,412.,58.);
 c=mix(c,mix(pigment(0x91b8beu),pigment(0xb6cbbeu),vnoise(p*.023)),smoothstep(-.9,.9,p.y-far));
 let mid=ridge(p.x,.0059,456.,49.)+.7*vnoise(vec2f(p.x*.6,7.));
 c=mix(c,mix(pigment(0x698f88u),pigment(0x9ab496u),fbm(p*vec2f(.012,.055))),smoothstep(-1.,1.,p.y-mid));
 let front=506.-.062*p.x+16.*sin(p.x*.0053+.9);
 if(p.y>front-1.){c=mix(c,meadow(p),smoothstep(-1.,1.,p.y-front));}
 // The previous shore's running outlines come to rest with the first branches.
 let remnant=(1.-smoothstep(192.68,194.60,u.t));
 let tint=dot(c,vec3f(.28,.55,.17));
 c=mix(c,mix(pigment(0x514f43u),pigment(0xe4dcbeu),sat(tint+.20)),remnant*.87);
 return c+weave(p)*.35;
}
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
 let p=world(fc.xy/u.viewport*vec2f(1280.,720.));
 var c=vec3f(0.);
 if(gold()<1.){c=field(p);}
 if(gold()>0.){let foil=gild(p);let dusky=fbm(p*vec2f(.009,.021)); var ground=mix(foil,pigment(0x544b39u),.26+.29*sat(length((p-vec2f(665.,350.))/vec2f(760.,510.))));
 ground=mix(ground,pigment(0x8f7751u),.18+.23*dusky);
 let grassline=552.+18.*sin(p.x*.005)+14.*vnoise(vec2f(p.x*.011,6.));
 ground=mix(ground,mix(pigment(0x575f48u),pigment(0x85875au),dusky),smoothstep(grassline-11.,grassline+4.,p.y)*.85);
 let cell=floor(p/vec2f(15.,14.));let spr=hash21(cell);let f=(fract(p/vec2f(15.,14.))-.25-.42*spr)*vec2f(15.,14.);
 let dotflower=(1.-smoothstep(1.,2.8,length(f)))*smoothstep(grassline-5.,grassline+23.,p.y)*step(.62,spr);
 ground=mix(ground,select(pigment(0xb87561u),pigment(0xbfc1a1u),spr>.84),dotflower);
 let gain=smoothstep(-.20,.18,gold()-.14-.64*(1.-vnoise(p*.006)));
 c=mix(c,ground,select(gain,1.,gold()>.998));}
 return vec4f(c,1.);
}`;
export const FIGURES=COMMON+`
struct Painting { @builtin(position) pos:vec4f, @location(0) p:vec2f, @location(1) @interpolate(flat) mat:u32, @location(2) @interpolate(flat) group:u32, @location(3) w:vec2f }
@vertex fn vs(@location(0) local:vec2f,@location(1) which:vec2f)->Painting{
 let mat=u32(which.x); let group=u32(which.y); var w=local;
 if(group==0u){
  let remain=1.-smoothstep(192.68,194.2,u.t);
  let jitter=remain*sin(local.y*.018)*32.;
  w.y=mix(w.y,475.+.115*(w.y-475.)+.16*(w.x-360.)+12.*sin(w.x*.015),remain*.86);
  let crown=sat((504.-w.y)/350.);
  w.x+=jitter+1.7*crown*crown*sin(u.t*1.15+w.y*.014);
 } else if(group==3u){
   w.y+=sin((u.t-210.)*.8)*.68*sat((515.-w.y)/230.);
   w.x+=.7*sin((u.t-208.)*.45)*sat((515.-w.y)/230.);
 }else if(group>=7u){
   let k=f32(group-7u);let fade=smoothstep(192.68,194.28,u.t);
   let before=vec2f(187.+k*48.,485.-k*4.+sin(k*1.1)*9.);
   let forks=array<vec2f,8>(vec2f(255.,354.),vec2f(292.,376.),vec2f(343.,377.),vec2f(361.,337.),vec2f(384.,414.),vec2f(413.,387.),vec2f(449.,374.),vec2f(469.,406.));
   w=mix(before+.72*w,forks[group-7u]+vec2f(w.x*.18+w.y*.20,w.y*.80),fade);
 }else{
  let second=(group==2u || group==6u); let mature=select(smoothstep(195.4,198.9,u.t),0.,second);
  let age=select(smoothstep(199.9,202.7,u.t),0.,second); let scale=.75+.40*mature-.09*age;
  let departing=smoothstep(203.1,207.,u.t); let arrival=1.-smoothstep(202.4,205.9,u.t);
  let feet=select(vec2f(508.-139.*departing,558.-6.*departing),vec2f(519.+125.*arrival,559.+8.*arrival),second);
  let walk=select(departing*(1.-departing)*4.,arrival*(1.-arrival)*4.,second);
  let gait=sin(u.t*7.1); let leg=sat((local.y+53.)/51.);
  w.x+=(.6+mature*.7)*sin(u.t*1.2)*sat(-local.y/168.)+leg*gait*walk*7.*select(-1.,1.,local.x>1.);
  w.x+=age*38.*pow(sat(-local.y/170.),2.); w.y+=age*28.*pow(sat(-local.y/170.),2.);
  if(second){w.x=-w.x;}
  w=feet+scale*w+vec2f(0.,gait*gait*walk*2.);
 }
 var o:Painting; o.pos=clip(w);o.p=local;o.mat=mat;o.group=group;o.w=w;return o;
}
fn robe(p:vec2f,mat:u32)->vec3f{
 let flow=p.x+10.*sin(p.y*.014)+.105*(p.y-380.);
 let offset=vec2f(flow,p.y+9.*sin(p.x*.030));
 let base=gild(offset); var c=base;
 if(mat==30u || mat==31u || mat==34u){
  let q=offset/vec2f(16.,21.); let v=fract(q)-.5;let h=hash21(floor(q));
  let rect=max(abs(v.x)-(.11+.22*h),abs(v.y)-(.20+.19*h));
  let tile=1.-smoothstep(-.025,.045,rect);
  let inset=1.-smoothstep(-.04,.03,max(abs(v.x)-.08,abs(v.y)-.21));
  let panel=smoothstep(-.49,.25,sin(flow*.075+.7*sin(p.y*.013)));
  c=mix(base,select(pigment(0x4a3c35u),pigment(0xc5c4a8u),h>.66),tile*panel*(.62+.37*h));
  c+=vec3f(.13,.099,.041)*(1.-smoothstep(.13,.29,abs(sin(flow*.076))));
  c=mix(c,pigment(0xe6c780u),inset*step(.79,h));
  if(mat==31u){c*=vec3f(.83,.75,.69);}if(mat==34u){c*=vec3f(.69,.70,.69);}
 }else{
  let q=offset/vec2f(24.,26.); let row=floor(q.y);let a=vec2f(q.x+.5*(row-2.*floor(row*.5)),q.y);
  let h=hash21(floor(a)); let v=(fract(a)-.5)*vec2f(1.,.91);
  let r=length(v);let th=atan2(v.y,v.x);let lobes=r+.037*cos(th*3.+h*4.);
  c=mix(base,pigment(0x627564u),.42);
  c=mix(c,pigment(0x63563du),(1.-smoothstep(.32,.36,lobes))*.75);
  c=mix(c,select(pigment(0xb88368u),pigment(0xa0ada0u),h>.53),1.-smoothstep(.22,.28,lobes));
  let curl=abs(sin(2.9*th+20.*r+h*4.));
  c=mix(c,pigment(0xd7b66eu),(1.-smoothstep(.13,.34,curl))*smoothstep(.08,.17,r)*(1.-smoothstep(.25,.31,r)));
  c=mix(c,pigment(0xeac779u),1.-smoothstep(.10,.15,r));
  if(mat==33u){c*=vec3f(.81,.85,.84);}
 }return c*(.96+.075*sin(flow*.13))+weave(p);
}
@fragment fn fs(i:Painting)->@location(0) vec4f{
 let m=i.mat; let t=u.t; var a=1.; var c=pigment(0x3f443du);
 if(i.group==0u){
  let spring=blossom(); let grain=vnoise(i.p*vec2f(.13,.023));
  c=mix(pigment(0x434b43u),pigment(0x736d57u),grain+.1*(1.-spring));
  if(m==2u){c=mix(pigment(0x89846au),pigment(0x9c967du),grain);}
  if(m==3u){c=mix(c,pigment(0xecede0u),winter()*.95);}
  if(m==4u){c=pigment(0x494c45u);}
  a=1.-gold();
 }else if(i.group==3u){
   if(m>=30u && m<=34u){c=robe(i.p,m);}
   if(m==38u){c=pigment(0x79623fu);}
   if(m==40u){c=mix(pigment(0xc99578u),pigment(0xe8c3a1u),.48+.30*vnoise(i.p*.04));}
   if(m==41u){c=pigment(0xf1d6b7u);}
   if(m==42u){c=pigment(0xb48268u);}
   if(m==43u){c=mix(pigment(0x37332eu),pigment(0x5b4839u),vnoise(i.p*.08));}
   if(m==44u){c=pigment(0x58473eu);}
   if(m==45u){c=pigment(0xa8635bu);}
   if(m==46u){c=pigment(0x8b674au);}
   a=smoothstep(208.15,211.20,t);
 }else if(i.group>=7u){
  a=(1.-smoothstep(193.,194.28,t))*.69; c=select(pigment(0x895d3cu),pigment(0x534c3cu),m==51u);
 }else{
  let next=(i.group==2u || i.group==6u);
  let age=select(smoothstep(199.9,202.6,t),0.,next);
  if(m==10u||m==17u){c=select(pigment(0xda9874u),pigment(0x99b4aeu),next); c=mix(c,pigment(0x92918au),age*.87);}
  if(m==11u){c=select(pigment(0xaf7160u),pigment(0x779797u),next)*mix(1.,.86,age);}
  if(m==12u||m==13u){c=select(pigment(0xf5c498u),pigment(0xc68c70u),m==13u);}
  if(m==14u){c=mix(pigment(0x343932u),mix(pigment(0x929290u),pigment(0xe1e0ccu),sat((-i.p.y-140.)*.034)),age);}
  if(m==15u){c=pigment(0xe2d9b9u);}
  if(m==16u){c=pigment(0x4c6269u);}
  if(m==18u){c=pigment(0x484039u);}
  if(m==19u){c=pigment(0x91755eu);}
  if(m==20u){c=select(pigment(0xb14f3du),pigment(0xc58658u),next);}
  if(m==21u){c=pigment(0x986c58u);}
  a=(1.-gold())*smoothstep(193.05,194.1,t)*select(1.-smoothstep(205.4,206.7,t),smoothstep(202.65,204.25,t),next);
  if(m==22u){c=pigment(0x695545u);a*=age;}
  if(m==23u||m==24u){c=select(pigment(0x4d5659u),pigment(0x60635fu),m==24u);a*=select(smoothstep(195.7,198.1,t),0.,next);}
 }
 if(a<.002){discard;}return vec4f(c+weave(i.p)*.5,a);
}`;
export const PETALS=COMMON+`
struct Sprite { @builtin(position) pos:vec4f, @location(0) q:vec2f,@location(1) info:vec4f,@location(2) w:vec2f }
@vertex fn vs(@builtin(vertex_index) vi:u32,@location(0) box:vec4f,@location(1) life:vec4f)->Sprite{
 let corners=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(1.,1.),vec2f(-1.,-1.),vec2f(1.,1.),vec2f(-1.,1.));
 let q=corners[vi];let sd=life.z;let kind=life.y;var center=box.xy; let t=u.t-192.68;let strength=sat((500.-center.y)/350.);
 var angle=life.x;var sz=box.zw; var a=1.;let seasonal=autumn();
 if(kind<.5){
  let loss=smoothstep(198.7+sd*1.8,200.2+sd*2.2,u.t);
  let grow=smoothstep(203.8+sd,205.9+sd,u.t);let falling=loss*(1.-grow);
  center+=vec2f(41.*loss*sin(sd*9.+loss*4.)+45.*loss*loss,70.*loss*loss)*falling;
  a=(1.-loss)*(1.-grow)+grow; angle+=falling*2.6;
 }else if(kind<1.5){a=blossom();sz*=.75+.34*a;}
 else if(kind<2.5){a=env(196.70+sd*.4,197.72+sd*.3,198.92+sd*.3,199.75+sd*.4);}
 else if(kind>3.5){
  angle+=.085*sin(t*.84+center.x*.014);
  a=(1.-gold())*(1.-winter()*.87)*smoothstep(192.8,194.4,u.t);
 }else{
  let flow=t*(.13+sd*.058)+sd*7.;let phase=fract(flow);
  center=vec2f(box.x+phase*(70.+115.*sd)+sin(phase*6.28+sd*11.)*(9.+sd*18.),109.+fract(box.y/530.+phase)*455.);
  let settle=smoothstep(208.4+sd*3.3,212.+sd*3.3,u.t);
  let h=hash21(vec2f(sd*313.,17.));let under=hash21(vec2f(sd*799.,1.));
  let fold=vec2f(select(599.-43.*under+(h-.5)*68.,695.+42.*under+(h-.5)*54.,sd>.56),342.+201.*under);
  center=mix(center,fold,settle);
  angle=mix(angle+flow*3.9,.15+sd*.45,settle);sz*=(.65+.32*gold())*(1.-.46*settle);
  a=(1.-.97*settle)*max(blossom()*.47+seasonal*.18+winter()*.27,gold())*smoothstep(.0,.10,phase)*(1.-smoothstep(.83,1.,phase));
 }
 if(kind<2.5){a*=(1.-gold())*smoothstep(193.,194.65,u.t);center.x+=1.7*strength*strength*sin(u.t*1.15+center.y*.014);}
 else if(kind<3.5){a*=1.-smoothstep(214.,217.8,u.t);}
 angle+=.035*sin(t*2.+sd*31.);
 let v=q*sz;let d=vec2f(cos(angle)*v.x-sin(angle)*v.y,sin(angle)*v.x+cos(angle)*v.y);
 var o:Sprite;o.pos=select(vec4f(2.,2.,2.,1.),clip(center+d),a>.010);o.q=q;o.info=vec4f(kind,sd,life.w,a);o.w=center;return o;
}
@fragment fn fs(i:Sprite)->@location(0) vec4f{
 let q=i.q;let kind=i.info.x;let seed=i.info.y;let leafLight=sat(.33+i.info.z+(293.-i.w.y)*.0012+.28*(seed-.5));
 var d=0.;var c=vec3f(0.);
 if(kind<.5){
  d=abs(q.y+.17*sin(q.x*3.))+.67*pow(abs(q.x),1.72)-.73;
  let leaf=mix(pigment(0x365c50u),pigment(0xa2bd68u),leafLight);
  c=mix(leaf,mix(pigment(0x8a5c47u),pigment(0xcf9a55u),leafLight),autumn());
  c+=vec3f(.12,.12,.08)*(1.-smoothstep(.03,.16,abs(q.y+.17*sin(q.x*3.))))*leafLight;
 }else if(kind<1.5){
  let r=length(q);let theta=atan2(q.y,q.x);d=r-.67-.19*cos(theta*5.);
  c=mix(pigment(0xd69892u),pigment(0xffecd3u),sat(.22+r+.21*seed));
  c=mix(c,pigment(0xc89d62u),1.-smoothstep(.09,.21,r));
 }else if(kind<2.5){
  d=length(q*vec2f(1.,.90))-.72;
  c=mix(pigment(0xa15347u),pigment(0xe88858u),sat(.50+.35*q.x-.35*q.y+seed*.16));
  c+=.21*(1.-smoothstep(.06,.23,length(q-vec2f(.20,-.28))));
 }else if(kind>3.5){
  let y=1.-q.y;let axis=.06*y*y-.12*y; let stem=abs(q.x-axis)-.031;
  let blade1=abs(q.x+.84*max(0.,.62-q.y))-.109*max(0.,sin((q.y+.14)*4.1));
  let blade2=abs(q.x-.77*max(0.,.82-q.y))-.105*max(0.,sin((q.y-.05)*4.2));
  let blade=min(max(blade1,-.14-q.y),max(blade2,.05-q.y));
  let head=q-vec2f(.04,-.50);
  let spike=max(abs(head.y)-.30,abs(head.x-.10*head.y)-.13-.055*cos(head.y*35.));
  d=min(max(stem,-.6-q.y),blade);c=mix(pigment(0x4b7253u),pigment(0x8fa363u),seed);
  if(seed>.58 && spike<d){ d=spike;c=mix(pigment(0xafa278u),pigment(0xe5c48du),seed*.75+.23*q.x); }
  if(seed>.89){
   let bloom=length(head*vec2f(1.,1.2))-.23-.055*cos(5.*atan2(head.y,head.x));
   if(bloom<d){d=bloom;c=mix(pigment(0xb88389u),pigment(0xf3d7c4u),sat(length(head)*3.+seed-.65));}
  }
 }else{
  let petal=abs(q.y)+.7*pow(abs(q.x),1.8)-.75;let foil=max(abs(q.x)*.8,abs(q.y))-.66;
  d=mix(petal,foil,gold());
  c=mix(mix(mix(pigment(0xc78f81u),pigment(0xffdfc5u),seed),pigment(0xf5f3e7u),winter()),mix(pigment(0xad8450u),pigment(0xffe6a9u),seed),gold());
 }
 let a=i.info.w*(1.-smoothstep(-fwidth(d)*.7,fwidth(d)*.7,d));if(a<.018){discard;}return vec4f(c,a);
}`;
// The stroke opens from left to right. Each bristle keeps the same course as the brush dries.
export const INK=COMMON+FS_VS+`
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
 let p=fc.xy/u.viewport*vec2f(1280.,720.);
 let area=fbm(p*.0054)*.50+.22*fbm(p*.023)+.25*(p.x/1280.);
 let lift=smoothstep(216.2,219.7,u.t)*1.50;
 let paper=smoothstep(area-.075,area+.08,lift-.16);
 let progress=smoothstep(217.05,222.85,u.t);
 let x=(p.x-142.)/1003.;
 let centre=427.-110.*sin(clamp(x,0.,1.)*2.75)-11.*sin(clamp(x,0.,1.)*8.);
 let width=(6.+54.*pow(clamp(sin(clamp(x,0.,1.)*3.14),0.,1.),.72))*(1.-.60*smoothstep(.34,.92,x));
 let rel=(p.y-centre)/width;
 let tear=fbm(vec2f(p.x*.014,rel*2.8)); let fiber=vnoise(vec2f(p.x*.020,rel*17.));
 let rough=vnoise(vec2f(p.x*.09,p.y*.19))+.57*tear;
 let edge=1.-smoothstep(.75,.99,abs(rel)+.23*rough);
 let start=smoothstep(-.018,.014,x+.017*rel); let end=1.-smoothstep(-.009,.011,x-progress+.013*rel*rel+fiber*.013);
 let dry=smoothstep(.19,.98,x);let track=rel*13.7+1.4*tear+.70*x*x*sin(rel*12.);
 let number=floor(track);let pos=fract(track);let seed=hash21(vec2f(number,13.));
 let halfGap=.055+.24*seed+.08*fiber;let gap=smoothstep(halfGap+.07,halfGap-.04,abs(pos-.51));
 let aa=sat(fwidth(track)*.75);let holes=smoothstep(.12+seed*.56,.51+seed*.47,x+.12*tear);
 let lifted=mix(gap,halfGap*2.,aa)*holes;
 let brushTooth=smoothstep(.50,.86,fiber+.18*rough)*dry;
 let mark=edge*start*end*(1.-lifted*dry)*(1.-brushTooth*.62)*smoothstep(217.05,217.65,u.t);
 let paperNoise=fbm(p*.027);var c=mix(pigment(0xddd3bbu),pigment(0xf2eddfu),.48+.43*paperNoise)+weave(p);
 c=mix(c,mix(pigment(0x272b29u),pigment(0x515047u),.36*fiber+.22*rough),mark);
 return vec4f(c,paper);
}`;
