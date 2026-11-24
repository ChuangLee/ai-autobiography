import {NOISE} from '../lib.js';
import {skinFinish} from './sitter-skin.js';
import {eyeCenter} from './sitter-mesh.js';

import {sitterPose} from './sitter-pose.js';

export const sitterPaint=NOISE+sitterPose+skinFinish+`
const sphereCentre=vec3f(${eyeCenter(1).join(",")});
struct Scene {vp:mat4x4f, eye:vec4f, frame:vec4f}
@group(0) @binding(0) var<uniform> scene:Scene;
@group(0) @binding(1) var ink:texture_2d<f32>;
@group(0) @binding(2) var inkSampler:sampler;
struct VertexOut {
 @builtin(position) clip:vec4f,@location(0) p:vec3f,@location(1) n:vec3f,
 @location(2) uv:vec2f,@location(3) @interpolate(flat) material:u32,
 @location(4) viewLocal:vec3f,@location(5) viewWorld:vec3f
}
fn saturate(x:f32)->f32{return clamp(x,0.,1.);}
fn soft(x:f32)->f32{return exp(-min(x*x,35.));}
fn area(p:vec2f,w:vec2f)->f32{let q=p/w;return exp(-min(dot(q,q),35.));}
fn breath(t:f32)->f32{return smoothstep(49.66,50.71,t)*(1.-smoothstep(51.04,52.23,t));}
fn lowered(t:f32)->f32{return .97*(1.-smoothstep(48.94,50.68,t))+.064*smoothstep(51.29,52.44,t);}
fn rotateX(p:vec3f,r:f32)->vec3f{return vec3f(p.x,cos(r)*p.y-sin(r)*p.z,sin(r)*p.y+cos(r)*p.z);}
@vertex fn vs(@location(0) p:vec3f,@location(1) normal:vec3f,@location(2) uv:vec2f,@location(3) material:f32)->VertexOut{
 let mat=u32(material+.5);let shot=scene.frame.y>.5;
 let t=select(50.95,scene.frame.x,shot);var v=p;var n=normal;
 if(mat==5u||mat==6u){
  let side=select(-1.,1.,p.x>0.);let c=sphereCentre*vec3f(side,1.,1.);
  let lidWeight=1.-smoothstep(.0,1.,uv.y);
  let blink=lowered(t);let tilt=select(-.072,.425,mat==5u)*blink*lidWeight;
  v=c+rotateX(v-c,tilt);n=rotateX(n,tilt);
 }
 if(mat==1u||mat==8u||mat==9u){
  let a=abs(p.x);let exhale=breath(t);
  let front=smoothstep(.27,.52,p.z);
  let corner=area(vec2f(a-.232,p.y+.497),vec2f(.081,.057));
  // The vermilion, the oral recess and the surrounding skin share the same
  // displacement field, so breathing cannot open a crack into the landscape.
  let seam=-.493+.005*smoothstep(.0,.16,a)+.0013*sign(p.x)*smoothstep(.06,.22,a);
  let under=1.-smoothstep(seam-.0022,seam+.0022,p.y);
  let mouthSpan=1.-smoothstep(.126,.236,a);
  let jaw=under*soft((p.y+.508)/.143)*mouthSpan;
  let upper=(1.-under)*soft((p.y-seam)/.028)*mouthSpan;
  v.y+=front*((.0035-.019*exhale)*jaw+.0025*exhale*upper+.004*exhale*corner);
  v.x+=front*exhale*sign(p.x)*.004*corner;
  // The cheek rises into the lower lid when the gaze finds the person below.
  let cheek=area(vec2f(a-.39,p.y+.07),vec2f(.142,.10));
  v.y+=front*cheek*.008*smoothstep(49.55,51.0,t);
 }
 if(shot){v=figurePose(v,p.y,t,1.);n=figurePose(n,p.y,t,0.);}
 let actual=v;var eye=scene.eye.xyz;
 if(scene.frame.z>.5){
  eye.y=-3.56-eye.y;
  v.y=-3.56-v.y;
  v.x+=.010*sin(v.y*117.+t*1.26)+.016*sin(v.y*41.-t*.76);
 }
 let direction=normalize(eye-actual);
 var localView=direction;
 if(shot){localView=vec3f(dot(direction,figurePose(vec3f(1.,0.,0.),p.y,t,0.)),dot(direction,figurePose(vec3f(0.,1.,0.),p.y,t,0.)),dot(direction,figurePose(vec3f(0.,0.,1.),p.y,t,0.)));}
 var o:VertexOut;o.clip=scene.vp*vec4f(v,1.);o.p=p;o.n=n;o.uv=uv;o.material=mat;o.viewLocal=localView;o.viewWorld=direction;return o;
}
fn skinLight(n:vec3f,v:vec3f,albedo:vec3f,oil:f32,blood:f32)->vec3f{
 // A large warm source above the river, its blue-grey sky and water on the other side.
 let key=normalize(vec3f(-.69,.55,.48));let sky=normalize(vec3f(.75,.49,.30));
 let L=dot(n,key);let cosV=saturate(dot(n,v));
 let halfVector=normalize(key+v);
 let softKey=smoothstep(-.23,.87,L);
 let direct=max(L,0.);
 let irradiance=vec3f(.043,.063,.092)+vec3f(.760,.647,.476)*(.60*softKey+.40*direct)
   +vec3f(.052,.084,.099)*smoothstep(-.10,.94,dot(n,sky));
 var c=albedo*irradiance;
 // Red light travels farther through skin than blue, especially across the terminator.
 let transmission=soft((L+.028)/.33)*(.42+.58*blood);
 c+=vec3f(.037,.012,.004)*transmission;
 let fresnel=.029+.13*pow(1.-cosV,4.);
 let sheen=fresnel*(.58*pow(saturate(dot(n,halfVector)),12.)+.48*pow(saturate(dot(n,halfVector)),49.));
 c+=vec3f(.95,.80,.62)*sheen*oil;
 let rim=pow(saturate(dot(n,normalize(vec3f(.68,.32,-.66)))),4.)*pow(1.-cosV,1.65);
 return c+rim*vec3f(.118,.151,.160);
}
fn eyeLens(p:vec3f,viewLocal:vec3f,side:f32,t:f32)->vec3f{
 let center=sphereCentre*vec3f(side,1.,1.);
 let rel=p-center;let outward=normalize(rel);let v=normalize(viewLocal);
 let attending=smoothstep(49.05,50.75,t);
 let gaze=normalize(vec3f(mix(-.075,-.195,attending)-.017*side,mix(-.060,-.126,attending),1.));
 let tangent=normalize(cross(vec3f(0.,1.,0.),gaze));let up=cross(gaze,tangent);
 // Cornea and iris occupy different depths. The apparent iris shifts as the camera slips around it.
 let ray=refract(-v,outward,1./1.376);
 let depth=clamp((.133-dot(rel,gaze))/min(-.07,dot(ray,gaze)),0.,.044);
 let irisPoint=rel+ray*depth;
 let uv=vec2f(dot(irisPoint,tangent),dot(irisPoint,up));let r=length(uv);
 let phase=atan2(uv.y,uv.x);let fibers=.5+.5*sin(phase*47.+4.2*sin(phase*7.)+r*208.);
 let upperShade=smoothstep(.072,.117,p.y);
 let corner=smoothstep(.072,.133,abs(p.x-side*.291));
 let sclera=mix(vec3f(.452,.415,.349),vec3f(.635,.622,.555),saturate(.74+.22*outward.z-.89*corner));
 var iris=mix(vec3f(.254,.261,.236),vec3f(.484,.460,.365),.43+.32*fibers+.17*soft((r-.034)/.014));
 // A submerged grey centre takes the value of the dark water, never black.
 iris=mix(iris,vec3f(.151,.168,.151),.75*(1.-smoothstep(.015,.024,r)));
 iris*=1.-.19*soft((r-.062)/.0048);
 var c=mix(sclera,iris,1.-smoothstep(.061,.066,r));
 // Both lids cut the sky. The high key reaches the far side of the globe first.
 let orbitalLight=smoothstep(-.48,.76,dot(outward,normalize(vec3f(-.66,.41,.58))));
 c*=mix(vec3f(.28,.33,.35),vec3f(.69,.66,.59),orbitalLight)*(1.-.31*upperShade-.16*corner);
 let tear=soft((abs(p.x)-.181)/.020)*soft((p.y-.077)/.030);
 c=mix(c,c*vec3f(1.17,.60,.56),tear*.72);
 // Single reflection of sky on the front of the cornea, distinct from the iris behind it.
 let lamp=normalize(vec3f(-.40,.43,.76));let H=normalize(v+lamp);
 let alignment=dot(H,outward);
 let glint=pow(saturate(alignment),650.);
 c+=vec3f(.74,.72,.60)*glint;
 let wet=.035*pow(1.-saturate(dot(v,outward)),3.);
 return c+vec3f(.54,.64,.66)*wet;
}
@fragment fn fs(i:VertexOut)->@location(0) vec4f{
 let p=i.p;let n=normalize(i.n);let v=normalize(i.viewWorld);let mat=i.material;
 let footprint=max(length(dpdx(p)),length(dpdy(p)));let close=1.-smoothstep(.003,.018,footprint);
 let shot=scene.frame.y>.5;let t=select(50.95,scene.frame.x,shot);
 let front=smoothstep(.18,.49,p.z);let a=abs(p.x);let side=sign(p.x);
 let coarse=vnoise3(p*7.1)+.40*vnoise3(p*16.1+4.3)-.68;
 let pores=vnoise3(p*199.+.22*vnoise3(p*44.))- .48;
 let cheek=area(vec2f(a-.394,p.y+.115-.20*(a-.40)),vec2f(.174,.113))*front;
 let nose=area(vec2f(p.x,p.y+.187),vec2f(.151,.117))*front;
 let circulation=saturate(cheek+.45*nose+select(0.,.38,mat==7u));
 // Yellow ochre in light, quiet rose through the cheek and then the cooler turn of the jaw.
 var tone=mix(vec3f(.608,.468,.284),vec3f(.747,.542,.337),.50+.36*coarse);
 tone=mix(tone,vec3f(.750,.386,.254),circulation*.61);
 tone*=1.+.040*coarse+select(.014*pores*close,0.,mat==1u);
 let key=normalize(vec3f(-.69,.55,.48));var c=skinLight(n,v,tone,.62+.42*nose,circulation);
 // The river throws a low band of light across the cheek. Towards the crown and
 // behind the temple the large source falls off instead of lighting a uniform dome.
 let temple=smoothstep(.36,.72,a)*smoothstep(-.58,.14,p.y);
 let overhead=smoothstep(.50,1.16,p.y)*(1.-.25*front);
 let neckShadow=smoothstep(-1.10,-.73,p.y)*(1.-smoothstep(-.85,-.59,p.y));
 c*=vec3f(1.)-vec3f(.34,.26,.15)*temple-vec3f(.29,.21,.12)*overhead;
 c*=1.-neckShadow*.23*front;
 if(mat==1u){
  let eyeX=(a-.299)/.146;let orbit=area(vec2f(a-.295,p.y-.112),vec2f(.166,.082));
  let nostrilFloor=area(vec2f(a-.097,p.y+.260),vec2f(.037,.019))*smoothstep(.20,.78,-n.y)*soft((p.z-.672)/.058);
  let cheekFold=.148+.111*smoothstep(.27,.52,-p.y);
  let crease=soft((a-cheekFold)/.012)*soft((p.y+.402)/.108);
  c*=1.-front*(.130*orbit+.035*crease+.032*soft((p.x)/.036)*soft((p.y+.377)/.061));
  c=mix(c,c*vec3f(.74,.53,.42),nostrilFloor*.32);
  let lidRim=.016+.013*eyeX-.013*soft(eyeX/.89);
  c*=1.-front*.054*soft((p.y-lidRim)/.007)*soft(eyeX);
  let mouth=soft((p.y+.499)/(.006+.008*breath(t)))*soft(p.x/.174)*front;
  c=mix(c,c*vec3f(.32,.205,.17),mouth*.72);
  c=skinFinish(p,n,key,c,footprint);
 }else if(mat==3u||mat==4u){
  c=eyeLens(p,i.viewLocal,select(-1.,1.,mat==3u),t);
 }else if(mat==5u||mat==6u){
  let arc=pow(max(0.,sin(3.141593*i.uv.x)),.74);let lidColor=mix(tone,vec3f(.714,.474,.327),.46);
  // As the free edge travels, the upper lid unfolds against the globe; its
  // surface faces the lens even while its shaded crease stays under the ridge.
  let cEye=sphereCentre*vec3f(side,1.,1.);let folded=lowered(t);
  let lidT=select(-.072,.425,mat==5u)*folded*(1.-smoothstep(.0,1.,i.uv.y));
  var globeNormal=normalize(rotateX(p-cEye,lidT));
  if(shot){globeNormal=figurePose(globeNormal,p.y,t,0.);}
  let unfold=arc*(1.-smoothstep(.35,1.,i.uv.y));
  let drape=select(.16,.27+.63*folded,mat==5u)*unfold;
  let lidN=normalize(mix(n,globeNormal,drape));
  c=skinLight(lidN,v,lidColor,.67,.56);
  let rim=arc*(1.-smoothstep(.01,.20,i.uv.y));
  c=mix(c,c*vec3f(.59,.46,.36),rim*select(.33,.68,mat==5u));
  if(mat==6u){c+=rim*vec3f(.068,.062,.043)*(.50+.50*max(n.z,0.));}
 }else if(mat==7u){
  c=mix(c,skinLight(n,v,vec3f(.69,.404,.272),.67,.75),.40);
 }else if(mat==8u||mat==9u){
  let upper=mat==8u;let body=pow(max(0.,sin(3.141593*i.uv.x)),.53);
  let flush=select(vec3f(.690,.389,.294),vec3f(.586,.332,.242),upper);
  let vermilion=mix(tone,flush,body*(.88-.78*smoothstep(.64,1.,i.uv.y)));
  c=skinLight(n,v,vermilion,select(.97,.57,upper),.76);
  let contact=body*(1.-smoothstep(.0,.180,i.uv.y));
  c=mix(c,c*vec3f(.48,.29,.24),contact*select(.66,.84,upper));
  let wet=.032*body*soft((i.uv.y-.51)/.19)*(.73+.22*vnoise(vec2f(p.x*155.,p.y*45.)));
  if(!upper){c+=vec3f(1.,.71,.48)*wet;}
  if(i.uv.y<0.){c=vec3f(.056,.030,.024);}
 }else{
  // The last marks sit in the turning collarbone, clear of the face.
  let q=vec2f((p.x-.13)/.65,(-1.40+.082*sin(p.x*2.6)-p.y)/.067);
  let uv=clamp(q,vec2f(0.),vec2f(.999));
  let glyph=textureSampleLevel(ink,inkSampler,vec2f(uv.x,(uv.y+1.)*.5),0.).r;
  let clip=smoothstep(0.,.020,min(min(q.x,q.y),min(1.-q.x,1.-q.y)));
  c=mix(c,vec3f(.686,.501,.284),glyph*clip*front*.30);
  c*=1.-.18*soft((p.y+1.03)/.21)*soft(a/.43)*front;
 }
 if(!shot){return vec4f(pow(max(c,vec3f(.0001)),vec3f(.64)),1.);}
 let reveal=smoothstep(44.92,49.10,t);
 let silt=fbm(p.xz*vec2f(6.,4.)+p.xy*vec2f(2.,5.))-.49;
 let rip=sin(p.x*6.12+t*.71)+.32*sin(p.x*15.3+p.z*3.-t*.62);
 let water=-1.76+.025*rip+.042*silt;
 if(p.y<water){discard;}
 let threshold=.26+.18*smoothstep(-1.78,.81,p.y)+silt*.42;
 let pigment=smoothstep(threshold-.19,threshold+.22,reveal);
 if(pigment<.012){discard;}
 let distanceToWater=p.y-water;
 let line=smoothstep(.004,.15,distanceToWater);
 let damp=1.-smoothstep(.04,.33,distanceToWater);
 let trough=vnoise(p.xz*vec2f(7.3,5.4)+vec2f(t*.19,2.));
 let bead=soft((distanceToWater-.012-.004*trough)/(.003+min(.012,footprint*.6)));
 let rippleLight=smoothstep(.43,.72,trough)*smoothstep(-.30,.46,n.z);
 let ambient=vec3f(.040,.061,.076);
 c=mix(ambient,c,pigment*(.45+.55*line));
 c*=vec3f(1.)-damp*vec3f(.28,.20,.095);
 c+=vec3f(.173,.138,.081)*bead*rippleLight*pigment;
 if(scene.frame.z>.5){
  let reflection=.31*(.49+.51*smoothstep(.13,.82,vnoise(p.xy*vec2f(9.,58.)+.32*t)));
  return vec4f(c*vec3f(.52,.57,.60),reflection*pigment);
 }
 return vec4f(c,pigment*(.55+.45*line));
}
`;
