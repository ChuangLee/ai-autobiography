// Measured front planes and authored scalp, jaw, auricles, lids and painted gaze.
// The source and its license are identified in anatomy-source.txt.
import {relief} from "./anatomy-contours.js";
export const HEAD = relief + `
const skull=array<vec3f,15>(
vec3f(0.008,0.013,0.324),
vec3f(0.228,0.220,0.150),
vec3f(0.308,0.286,0.070),
vec3f(0.346,0.331,0.021),
vec3f(0.366,0.360,0.004),
vec3f(0.376,0.375,-0.003),
vec3f(0.378,0.385,-0.010),
vec3f(0.378,0.382,-0.004),
vec3f(0.383,0.389,-0.006),
vec3f(0.386,0.394,-0.009),
vec3f(0.381,0.379,-0.011),
vec3f(0.356,0.348,-0.014),
vec3f(0.310,0.302,-0.023),
vec3f(0.234,0.229,-0.035),
vec3f(0.007,0.006,-0.048));
fn crossSection(y:f32)->vec3f{
  let v=clamp((y+.56)/.08,0.,13.9999);let i=i32(v);let s=fract(v);
  let a=skull[max(i-1,0)];let b=skull[i];let c=skull[i+1];let d=skull[min(i+2,14)];
  return b+.5*s*(c-a+s*(2.*a-5.*b+4.*c-d+s*(-a+3.*b-3.*c+d)));
}
// One almond-shaped cornea with unequal upper and lower lids.
fn eyeSection(x:f32)->vec3f{
  let t=(x-.151)/.070;
  let dome=pow(max(1.-t*t,0.),.70);
  let line=-.003+.003*t;
  return vec3f(line+.017*dome,line-.014*dome,dome);
}
fn headSd(q:vec3f)->f32{
  let x=q.x; let y=q.y-2.12; let s=crossSection(y);
  let span=max(s.x,.004);
  let z=-q.z-s.z;
  let a=atan2(x,z);
  let front=max(.006,s.y);
  let back=front*(1.18+.14*smoothstep(-.32,.14,y));
  let axial=select(back,front,z>0.);
  let radial=length(vec2f(x,z));
  let basic=radial/max(.001,length(vec2f(x/span,z/axial)));
  var relief=0.;
  if(a<1.78 && y<.42 && y>-.56){
    relief=contourRelief(a,y)*(1.-smoothstep(1.50,1.76,a));
    let eye=eyeSection(x);
    if(eye.z>0.){
      let up=(y-eye.x)/.012;let low=(y-eye.y)/.014;
      let cover=smoothstep(eye.y-.010,eye.y+.006,y)*(1.-smoothstep(eye.x-.003,eye.x+.012,y));
      relief+=eye.z*(.010*exp(-up*up)+.005*exp(-low*low)+.013*cover);
    }
  }
  let cap=abs(y)-.56;
  let slope=mix(.32,.82,smoothstep(0.,.14,.56-abs(y)));
  var face=max((radial-basic-relief)*slope,cap);
  let jawPlane=-.556+.11*smoothstep(.09,.37,x)+.14*smoothstep(-.23,.08,q.z);
  face=-figureUnion(-face,(y-jawPlane)*.7,.052);
  let ear=q-vec3f(.374,2.095,.014);
  var auricle=figureEll(ear,vec3f(.044,.089,.055));
  auricle=max(auricle,-figureEll(ear-vec3f(.036,.009,-.002),vec3f(.025,.054,.031)));
  return figureUnion(face,auricle,.016);
}`;

export const GAZE=`
fn portraitLocal(p:vec3f)->vec3f{
  let a=.10*smoothstep(1.05,1.78,p.y-.85);let x=p.x*cos(a)+p.z*sin(a);let z=p.z*cos(a)-p.x*sin(a);
  return headQ(vec3f(abs(x),p.y-.85,z));
}
fn almond(p:vec3f)->f32{
  let q=portraitLocal(p);
  let y=q.y-2.12; let e=eyeSection(q.x);
  return smoothstep(.0,.12,e.z)*smoothstep(-.002,.0025,min(e.x-y,y-e.y))*smoothstep(-.12,-.22,q.z);
}
fn wakingEye(p:vec3f,base:vec3f,open:f32)->vec3f{
  let q=portraitLocal(p);
  if(q.y<1.57 || q.y>2.65 || q.z>-.10){return base;}
  let x=q.x;let y=q.y-2.12;
  let e=eyeSection(x);
  let dx=(x-.15)/.09;
  let eyeSocket=exp(-dx*dx-pow(abs(y-.003)/.047,2.));
  let lid=e.z*exp(-pow(abs(y-e.x-.003)/.007,2.));
  let browLine=.078+.020*exp(-pow(abs(x-.19)/.075,2.))-.10*(x-.16);
  let brow=exp(-pow(abs(x-.16)/.101,4.)-pow(abs(y-browLine)/.012,2.));
  let nostril=exp(-pow(abs(x-.045)/.022,2.)-pow(abs(y+.199)/.009,2.));
  let corners=exp(-pow(abs(x-.112)/.017,2.)-pow(abs(y+.313)/.013,2.));
  let lips=exp(-pow(x/.115,4.)-pow(abs(y+.300-.005*cos(x*33.))/.005,2.));
  let ink=clamp(.42*eyeSocket+.44*lid+.46*brow+.63*nostril+.22*corners+.34*lips,0.,.80);
  let f=smoothstep(-.12,-.22,q.z);
  let browTail=exp(-pow(abs(x-.157)/.115,4.)-pow(abs(y-browLine+.015)/.020,2.));
  let lipMass=exp(-pow(x/.113,4.)-pow(abs(y+.313)/.026,2.));
  let cheek=exp(-pow(abs(x-.222)/.087,2.)-pow(abs(y+.092)/.074,2.));
  let philtrum=exp(-pow(x/.015,2.)-pow(abs(y+.251)/.023,2.));
  let orbit=exp(-pow(abs(x-.137)/.091,2.)-pow(abs(y-.022)/.034,2.));
  let tear=e.z*exp(-pow(abs(y-e.y+.004)/.005,2.));
  let soft=(1.-.30*browTail-.14*philtrum-.13*orbit);
  let warm=mix(vec3f(1.),vec3f(.85,.71,.66),lipMass);
  let skin=base*(1.-ink*f)*mix(vec3f(1.),soft*warm,f)+vec3f(.006,.003,.001)*cheek*f+vec3f(.019,.017,.012)*tear*f;
  let gaze=.145+.012*sign(p.x);
  let core=exp(-pow(abs(x-gaze)/.037,2.)-pow(abs(y+.003)/.015,2.));
  let underLid=smoothstep(.0,.010,e.x-y);
  let gradient=(.10+.76*core+.12*e.z)*(.34+.66*underLid);
  let cornea=mix(vec3f(.052,.063,.065),vec3f(.88,.84,.68),gradient);
  let top=mix(e.y-.004,e.x+.009,open);
  let aperture=almond(p)*smoothstep(-.003,.003,top-y);
  let lidShadow=(1.-open)*e.z*exp(-pow(abs(y-top)/.005,2.));
  return mix(skin*(1.-.30*lidShadow),cornea,aperture);
 }
fn eyeColor(p:vec3f,base:vec3f)->vec3f{return wakingEye(p,base,1.);}
`;
