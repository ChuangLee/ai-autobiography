// The distant figure shares the Lee Perry-Smith scan with the cheek close-up.
// Only the quantized radial measurements are needed in the existing SDF passes.
import {shellData} from "./sitter-shell-data.js";

export const HEAD=shellData+`
fn sitterWeights(t:f32)->vec4f{
  let v=t*t;let w=v*t;let u=1.-t;
  return vec4f(u*u*u,3.*w-6.*v+4.,-3.*w+3.*v+3.*t+1.,w)/6.;
}
fn sitterWeightSlope(t:f32)->vec4f{
  let u=1.-t;let v=t*t;
  return vec4f(-.5*u*u,1.5*v-2.*t,-1.5*v+t+.5,.5*v);
}
fn sitterArcRow(j:i32,i:i32)->vec4f{
  let words=sitterColumns/3;let first=i/3;
  let a=sitterRadial[j*words+first];let b=sitterRadial[j*words+(first+1)%words];
  let lane=vec4u(u32(i%3))+vec4u(0,1,2,3);
  let block=select(vec4u(a),vec4u(b),lane>=vec4u(3u));
  return vec4f((block>>((lane%vec4u(3u))*10u))&vec4u(1023u))/2046.;
}
fn sitterToScan(q:vec3f)->vec3f{
  return vec3f(q.x/.515,.08+(q.y-2.12)/.485,-(q.z+.102)/.480);
}
// Cubics through the same measured tear lines that open in the close-up.
fn sitterLids(x:f32)->vec3f{
  let right=x>0.;
  let start=select(-.4218,.1295,right);let end=select(-.137,.407,right);
  let u=clamp((x-start)/(end-start),0.,1.);
  let coeff=select(vec4f(-.120276,.330862,-.193083,.102940),vec4f(.113801,-.068583,-.070207,.115234),right);
  let line=((coeff.x*u+coeff.y)*u+coeff.z)*u+coeff.w;
  let arch=pow(max(0.,4.*u*(1.-u)),.90);
  return vec3f(line,arch,u);
}
fn headSd(q:vec3f)->f32{
  let top=max(sitterFloor-q.y,q.y-sitterCrown);
  let bounds=max(top,max(abs(q.x-.005)-.425,abs(q.z)-.499));
  if(bounds>.045){return bounds;}
  let cap=figureEll(q-sitterCrownCenter-vec3f(sitterCrownTilt.x,0.,sitterCrownTilt.y)*(q.y-sitterCrown),sitterCrownRadii);
  if(q.y>sitterCrown-.085){return cap;}
  let rowsPerUnit=f32(sitterRows-1)/(sitterCrown-sitterFloor);
  let row=clamp((q.y-sitterFloor)*rowsPerUnit,0.,f32(sitterRows-1)-.00001);
  let j=i32(row);let v=fract(row);
  let h=clamp(vec4i(j-1,j,j+1,j+2),vec4i(0),vec4i(sitterRows-1));
  let hw=sitterWeights(v);let dh=sitterWeightSlope(v);
  let axis=sitterAxis[h.x]*hw.x+sitterAxis[h.y]*hw.y+sitterAxis[h.z]*hw.z+sitterAxis[h.w]*hw.w;
  let axisSlope=(sitterAxis[h.x]*dh.x+sitterAxis[h.y]*dh.y+sitterAxis[h.z]*dh.z+sitterAxis[h.w]*dh.w)*rowsPerUnit;
  let d=q.xz-axis;let r=length(d);
  let phase=fract(atan2(d.x,-d.y+.0000001)*.1591549431+1.)*f32(sitterColumns);
  let i=(i32(phase)-1+sitterColumns)%sitterColumns;
  let aw=sitterWeights(fract(phase));let da=sitterWeightSlope(fract(phase));
  let a=sitterArcRow(h.x,i);let b=sitterArcRow(h.y,i);
  let c=sitterArcRow(h.z,i);let f=sitterArcRow(h.w,i);
  let radii=vec4f(dot(a,aw),dot(b,aw),dot(c,aw),dot(f,aw));
  let radius=dot(hw,radii);
  let drY=dot(dh,radii)*rowsPerUnit;
  let drA=dot(hw,vec4f(dot(a,da),dot(b,da),dot(c,da),dot(f,da)))*f32(sitterColumns)*.1591549431;
  let radial=d/max(r,.019);
  let arcSlope=drA/max(r,.028);
  let heightSlope=drY+dot(radial,axisSlope)-arcSlope*dot(vec2f(-radial.y,radial.x),axisSlope);
  var outline=radius;
  if(q.z<-.18 && abs(q.y-2.13)<.092){
    let scan=sitterToScan(q);let e=sitterLids(scan.x);
    if(e.y>.001){
      let y=scan.y-e.x;
      let topLid=.059*e.y;let lowLid=-.010*e.y;
      let lens=smoothstep(lowLid-.009,lowLid+.003,y)*(1.-smoothstep(topLid-.004,topLid+.011,y));
      let eyelid=exp(-pow(abs(y-topLid)/.014,2.));
      outline+=e.y*(.0045*lens+.0060*eyelid);
    }
  }
  // Correct the ray step for the local slope of the crown, alae and jaw.
  let s=inverseSqrt(1.+heightSlope*heightSlope+arcSlope*arcSlope);
  let surface=max((r-outline)*clamp(s*.88,.12,.88),top);
  return mix(surface,cap,smoothstep(sitterCrown-.18,sitterCrown-.085,q.y));
}`;

export const GAZE=`
fn portraitLocal(p:vec3f)->vec3f{
  let y=p.y-.85;
  let angle=.10*smoothstep(1.05,1.78,y);
  let x=p.x*cos(angle)+p.z*sin(angle);
  let z=p.z*cos(angle)-p.x*sin(angle);
  return sitterToScan(headQ(vec3f(x,y,z)));
}
fn sitterAperture(s:vec3f,opening:f32)->f32{
  let e=sitterLids(s.x);let y=s.y-e.x;
  let low=-.012*e.y*opening;let high=.059*e.y*opening;
  return smoothstep(.02,.21,e.y)*smoothstep(-.003,.003,min(y-low,high-y))*smoothstep(.23,.34,s.z)
    *smoothstep(.04,.25,opening);
}
fn almond(p:vec3f)->f32{return sitterAperture(portraitLocal(p),1.);}
fn sitterBell(d:f32,w:f32)->f32 {let a=d/w;return exp(-a*a);}
fn wakingEye(p:vec3f,base:vec3f,open:f32)->vec3f{
  let s=portraitLocal(p);let face=smoothstep(.20,.42,s.z);let x=abs(s.x);
  if(face<.003||s.y> .57||s.y<-.80){return base;}
  let eye=sitterLids(s.x);let y=s.y-eye.x;
  let top=.059*eye.y*open;
  let eyeBed=sitterBell(x-.28,.181)*sitterBell(s.y-.118,.105);
  let browLine=.221+.050*sitterBell(x-.29,.135)-.072*smoothstep(.33,.49,x);
  let brow=sitterBell(s.y-browLine,.026)*sitterBell(x-.288,.139);
  let lipLine=-.497+.015*sitterBell(x-.075,.078)-.014*smoothstep(.11,.22,x);
  let upperLip=sitterBell(s.y-lipLine-.020,.023)*sitterBell(x,.163);
  let seam=sitterBell(s.y-lipLine,.008)*sitterBell(x,.167);
  let wing=sitterBell(x-.094,.040)*sitterBell(s.y+.256,.013);
  let shade=.15*eyeBed+.29*brow+.37*wing+.30*seam;
  var skin=base*(1.-face*shade)*mix(vec3f(1.),vec3f(.94,.80,.73),upperLip*.63*face);
  skin*=1.-.34*eye.y*sitterBell(y-top,.0070)*face;
  let aperture=sitterAperture(s,open);
  let cx=select(-.286,.274,s.x>0.)-.011;
  let radius=length(vec2f((s.x-cx)*.91,y-.015));
  let iris=1.-smoothstep(.045,.067,radius);
  let pupil=1.-smoothstep(.018,.031,radius);
  let lidLight=.71+.25*smoothstep(.006,.027,top-y);
  let lit=clamp(.38+.74*dot(base,vec3f(.23,.66,.11)),.23,1.);
  var lens=mix(vec3f(.72,.70,.586),vec3f(.255,.254,.185),iris);
  lens=mix(lens,vec3f(.109,.111,.086),.80*pupil);
  let glint=sitterBell(s.x-cx+.014,.010)*sitterBell(y-.035,.008);
  return mix(skin,lens*lit*lidLight+vec3f(.29,.26,.20)*glint,aperture);
}
fn eyeColor(p:vec3f,base:vec3f)->vec3f{return wakingEye(p,base,1.);}
`;
