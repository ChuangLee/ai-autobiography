import {NOISE} from '../lib.js';
import {sitterPose} from './sitter-pose.js';
import {skinFinish} from './sitter-skin.js';

// Measured lid contacts in head-local coordinates.
const tearLines=[
  [[-.4218,.102],[-.3885,.086],[-.3515,.074],[-.3182,.071],[-.2812,.073],[-.2442,.080],[-.2109,.093],[-.1739,.109],[-.137,.119]],
  [[.1295,.115],[.1628,.106],[.1961,.097],[.2331,.085],[.2664,.077],[.2997,.072],[.3367,.073],[.37,.077],[.407,.090]]
];

export const scanPaint=NOISE+sitterPose+skinFinish+`
struct Camera{vp:mat4x4f,eye:vec4f,frame:vec4f}
@group(0)@binding(0)var<uniform> camera:Camera;
@group(0)@binding(1)var text:texture_2d<f32>;
@group(0)@binding(2)var textSampler:sampler;
@group(0)@binding(3)var relief:texture_2d<f32>;
@group(0)@binding(4)var reliefSampler:sampler;
struct Surface{@builtin(position) clip:vec4f,@location(0) p:vec3f,@location(1) n:vec3f,
 @location(2) view:vec3f,@location(3) @interpolate(flat) role:u32,@location(4) transport:vec2f,
 @location(5) opening:f32,@location(6) uv:vec2f}
fn sqBell(x:f32)->f32{return exp(-x*x);}
fn softPatch(q:vec2f,w:vec2f)->f32{let r=q/w;return exp(-dot(r,r));}
const tearLine=array<vec2f,18>(${tearLines.flat().map(([x,y])=>'vec2f('+x+','+y+')').join(',')});
fn eyelids(x:f32)->vec3f{
 let offset=select(0,9,x>0.);let first=tearLine[offset];let last=tearLine[offset+8];
 let u=clamp((x-first.x)/(last.x-first.x),0.,1.);
 var j=offset;for(var k=1;k<8;k++){if(x>tearLine[offset+k].x){j=offset+k;}}
 let a=tearLine[max(offset,j-1)];let b=tearLine[j];let c=tearLine[j+1];let d=tearLine[min(offset+8,j+2)];
 let span=c.x-b.x;let f=clamp((x-b.x)/span,0.,1.);let g=1.-f;
 let y=(1.+2.*f)*g*g*b.y+f*g*g*span*(c.y-a.y)/(c.x-a.x)
   +(3.-2.*f)*f*f*c.y-f*f*g*span*(d.y-b.y)/(d.x-b.x);
 let rise=pow(max(0.,sin(3.14159265*u)),.87);
 return vec3f(y,rise,u);
}
@vertex fn vs(@location(0)p:vec3f,@location(1)normal:vec3f,
 @location(3)role:f32,@location(5)visibility:vec2f,@location(6) scanUV:vec2f)->Surface{
 let t=camera.frame.x;
 let firstLook=smoothstep(49.03,50.89,t+.045*sign(p.x));
 let rest=smoothstep(51.21,52.25,t);
 let open=firstLook*(1.-.082*rest);
 let air=smoothstep(49.48,50.63,t)*(1.-smoothstep(50.96,52.42,t));
 var v=p;
 let front=smoothstep(.26,.55,p.z);
 let cheek=softPatch(vec2f(abs(p.x)-.393,p.y+.060),vec2f(.14,.14));
 let brow=softPatch(vec2f(abs(p.x)-.238,p.y-.219),vec2f(.12,.09));
 let lower=softPatch(vec2f(p.x,p.y+.63),vec2f(.29,.14));
 v.y+=front*(.011*cheek*firstLook+.012*brow*open-.016*lower*air);
 v.z+=front*(.008*lower*air-.005*brow*open);
 v.y+=.012*air*smoothstep(-1.82,-1.32,p.y)*(1.-smoothstep(-1.24,-.78,p.y));
 let wp=figurePose(v,v.y,t,1.);
 var world=wp;
 if(camera.frame.z>.5){world.y=-3.56-world.y;world.x+=.012*sin(world.y*87.+t*.85);}
 var out:Surface;
 out.clip=camera.vp*vec4f(world,1.);out.p=p;out.n=figurePose(normal,v.y,t,0.);
 out.uv=scanUV;out.view=camera.eye.xyz-wp;out.role=u32(role+.5);out.transport=visibility;out.opening=open;
 return out;
}
@fragment fn fs(i:Surface)->@location(0) vec4f{
 let t=camera.frame.x;let p=i.p;let v=normalize(i.view);
 let delta=(textureSample(relief,reliefSampler,i.uv).rgb*255.-128.)*(.75/127.);
 let orbit=softPatch(vec2f(abs(p.x)-.280,p.y-.092),vec2f(.13,.055));
 let detailStrength=.75*(1.-.83*orbit);
 let n=normalize(i.n+figurePose(delta,p.y,t,0.)*detailStrength);
 let pixel=max(length(dpdx(p)),length(dpdy(p)));
 let a=abs(p.x);let front=smoothstep(.17,.47,p.z);
 let L=normalize(vec3f(-.65,.58,.49));let sky=normalize(vec3f(.78,.28,-.49));
 let ao=mix(.11,1.,i.transport.x);
 let key=(.81*max(dot(n,L),0.)+.19*smoothstep(-.29,.79,dot(n,L)))*(.085+.915*i.transport.y);
 let secondary=max(dot(n,sky),0.);
 let halfVector=normalize(L+v);
 let tissue=.048*(vnoise3(p*27.)-.5)+.023*(vnoise3(p*11.+7.)-.5);
 let blush=(.51*softPatch(vec2f(a-.37,p.y+.16),vec2f(.16,.19))+.36*softPatch(vec2f(p.x,p.y+.23),vec2f(.14,.13)))*front;
 let tone=mix(vec3f(.77,.617,.424),vec3f(.71,.445,.296),blush)*(1.+tissue);
 let ambient=vec3f(.031,.039,.050)+vec3f(.105,.137,.155)*secondary*.49;
 var color=tone*(ambient*ao+vec3f(1.,.89,.71)*key);
 color+=vec3f(.032,.013,.006)*sqBell((dot(n,L)+.04)/.32)*ao*i.transport.y;
 let grazing=1.-max(0.,dot(n,v));
 let scatter=ao*sqBell((dot(n,L)-.10)/.48);
 color+=vec3f(.041,.020,.009)*scatter;
 let rim=pow(grazing,3.4)*smoothstep(-.5,.64,dot(n,sky))*ao;
 color+=vec3f(.113,.099,.068)*rim;
 let ear=smoothstep(.55,.68,a)*sqBell((p.y-.01)/.39);
 let transmit=ear*(.50+.50*grazing)*(.42+.58*max(0.,dot(n,-L)));
 color+=vec3f(.090,.046,.023)*transmit;
 let reflectedRiver=.5+.5*cos(8.*p.y+1.2*p.x+sin(4.*p.z+t*.29)-t*.32);
 color+=vec3f(.018,.021,.020)*reflectedRiver*ao*max(0.,-n.y);
 let gloss=(.024*pow(max(0.,dot(n,halfVector)),12.)+.048*pow(max(0.,dot(n,halfVector)),48.))*i.transport.y;
 color+=vec3f(1.,.83,.63)*gloss;
 color+=vec3f(.13,.16,.19)*pow(max(0.,dot(n,sky)),3.)*pow(1.-max(0.,dot(n,v)),2.)*ao;
 if(i.role==1u){
   color=skinFinish(p,n,L,color,pixel);
   let upper=-.482+.021*sqBell((a-.080)/.075)-.024*smoothstep(.12,.218,a);
   let lip=softPatch(vec2f(p.x,(p.y-upper+.033)),vec2f(.196,.049));
   color=mix(color,color*vec3f(.88,.70,.64),lip*front*.67);
   let corner=softPatch(vec2f(a-.213,p.y+.509),vec2f(.024,.020));
   color*=1.-.18*corner*front;
   // A few characters carried up the shadowed neck remain visible below the
   // temple. Unwrap about the head so their strokes turn around the cheek.
   let meridian=atan2(p.x,p.z+.17);
   let progress=clamp((p.y+1.11)/1.18,0.,1.);
   let pathAngle=1.10-.30*progress+.042*sin(p.y*7.);
   let lane=(meridian-pathAngle)/.058;
   let strand=floor(lane);
   let along=(p.y+1.09)/.045+.47*strand-.49*(t-49.);
   let idx=floor(along);
   let leftover=hash22(vec2f(strand,idx));
   let band=(1.-smoothstep(1.,3.2,abs(lane)))*smoothstep(-1.10,-.82,p.y)*(1.-smoothstep(-.35,.04,p.y));
   let drift=smoothstep(47.4,50.1,t-leftover.y*.20);
   let inCell=vec2f(fract(lane),1.-fract(along));
   let charUV=vec2f((floor(leftover.x*8.)+inCell.x)/8.,.5+.5*inCell.y);
   let stroke=textureSampleLevel(text,textSampler,charUV,0.).r;
   let shimmer=band*drift*(1.-.96*smoothstep(52.8,54.42,t))*stroke*smoothstep(.27,.79,leftover.y)*(.51+.49*sqBell((p.y+.72-progress*.16)/.34));
   color+=vec3f(.098,.068,.031)*shimmer;
   if(a>.115 && a<.435 && p.y>-.005 && p.y<.245 && p.z>.31){
     let side=sign(p.x);let line=eyelids(p.x);let y=p.y-line.x;
     let gate=smoothstep(.0,.095,line.y);
     let high=.056*line.y*(.96+.10*cos(3.14159*line.z))*i.opening;
     let low=-.014*line.y*i.opening;
     let lidScale=.73+.27*line.y;
     let aa=clamp(pixel*.48,.0009,.0065);
     let reveal=smoothstep(.03,.34,i.opening);
     let crease=sqBell((y-high-.037*line.y)/(.007+.003*line.y));
     let bulge=sqBell((y-high-.019)/.022);
     color*=1.-.22*crease*line.y*reveal;
     color+=vec3f(.026,.020,.013)*bulge*line.y*reveal;
     let lowerRoll=sqBell((y-low+.014)/.012);
     color+=vec3f(.038,.026,.016)*lowerRoll*line.y*reveal;
     let root=sqBell((y-high+.001)/(.0065*lidScale));
     color*=1.-.73*root*gate*reveal;
     // Trace through the corneal surface to the recessed iris. Gaze stays in
     // the sitter's coordinate system as the lens orbits to the right.
     let centre=select(-.266,.259,side>0.);
     let eyeCentre=vec3f(centre,.112,select(.382,.379,side>0.));
     let seek=smoothstep(49.33,51.08,t);
     let viewLocal=normalize(vec3f(dot(v,figurePose(vec3f(1.,0.,0.),p.y,t,0.)),
       dot(v,figurePose(vec3f(0.,1.,0.),p.y,t,0.)),dot(v,figurePose(vec3f(0.,0.,1.),p.y,t,0.))));
     let q=p-eyeCentre;let b=dot(q,viewLocal);
     let lensPoint=q+viewLocal*(sqrt(max(.00005,b*b-dot(q,q)+.148*.148))-b);
     let normalEye=normalize(lensPoint);
     let ray=refract(-viewLocal,normalEye,1./1.376);
     let gaze=normalize(vec3f(-.015-.033*seek,-.012-.036*seek,1.));
     let irisPlane=lensPoint+ray*((.129-dot(lensPoint,gaze))/min(-.15,dot(ray,gaze)))-gaze*.129;
     let right=normalize(cross(vec3f(0.,1.,0.),gaze));
     let local=vec2f(dot(irisPlane,right),dot(irisPlane,cross(gaze,right)));
     let r=length(local);
     let grain=.5+.5*sin(atan2(local.y,local.x)*41.+r*153.+.9*sin(local.x*89.));
     let iris=mix(vec3f(.108,.111,.087),vec3f(.24,.224,.153)*(.94+.14*grain),smoothstep(.018,.026,r));
     let limbus=mix(iris,vec3f(.128,.128,.090),smoothstep(.047,.059,r));
     let globe=sqBell((p.x-centre)/.116);
     let sclera=vec3f(.28,.256,.197)*(.48+.52*globe);
     let eye=mix(limbus,sclera,smoothstep(.054,.068,r));
     let depth=clamp((y-low)/max(.001,high-low),0.,1.);
     let shadow=.40+.58*smoothstep(.0,.24,depth)*(1.-.72*smoothstep(.38,1.,depth));
     let caruncle=1.-smoothstep(.0,.17,select(1.-line.z,line.z,side>0.));
     var lens=mix(eye,vec3f(.25,.133,.092),caruncle*.8)*shadow*(.58-.095*side);
     let reflected=reflect(-v,figurePose(normalEye,p.y,t,0.));
     let patchDir=normalize(vec3f(.26,.67,.70));
     let spec=pow(max(0.,dot(reflected,patchDir)),32.);
     let ribbon=exp(-pow((reflected.y-.15)/.12,2.))*.035;
     lens+=vec3f(.60,.52,.37)*(spec*.84+ribbon)*(.39+.61*shadow);
     // The broader sky reflection travels across the cornea. Its tiny warm core
     // stays visible between the two lids while they finish opening.
     let skyCore=softPatch(local-vec2f(-.012,.010),vec2f(.0065,.0045));
     lens+=vec3f(.43,.38,.25)*skyCore;
     let meniscus=sqBell((y-low-.0025)/.0028);
     lens+=vec3f(.077,.064,.045)*meniscus*globe;
     let opening=smoothstep(-aa,aa,min(y-low,high-y))*gate*reveal;
     color=mix(color,lens,opening);
   }
 }else{
   let mark=vec2f((p.x-.11)/.63,(-1.40+.1*sin(p.x*2.)-p.y)/.074);
   let coverage=smoothstep(0.,.02,min(min(mark.x,mark.y),min(1.-mark.x,1.-mark.y)));
   let glyph=textureSampleLevel(text,textSampler,vec2f(clamp(mark.x,0.,1.),(.99+clamp(mark.y,0.,1.))*.5),0.).r;
   color=mix(color,vec3f(.50,.36,.19),coverage*glyph*front*.19);
 }
 let clay=fbm(p.xy*3.9+p.z*2.1)-.5;
 let emerge=smoothstep(45.12,49.05,t);
 let water=-1.79+.014*sin(p.x*9.+t*.8)+.031*clay;
 if(p.y<water){discard;}
 let height=-1.89+3.92*emerge+clay*.56;
 let body=smoothstep(-.06,.31,height-p.y);
 let iridescence=smoothstep(water,water+.27,p.y);
 var alpha=body*smoothstep(water,water+.060,p.y);
 color=mix(vec3f(.031,.045,.050)+color*.19,color,iridescence);
 color=mix(vec3f(.037,.052,.060),color,smoothstep(-.10,.47,height-p.y));
 if(camera.frame.z>.5){
   alpha*=.19*smoothstep(.34,.73,fbm(p.xy*vec2f(4.,49.)+vec2f(0.,t*.7)));
   color=mix(color,vec3f(.09,.11,.11),.34);
 }

 return vec4f(color,alpha);
}`;
