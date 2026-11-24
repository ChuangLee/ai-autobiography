import {M4, NOISE, FS_VS, sm, norm, cross, sub} from "../lib.js";
import {BG_FS, OVER_FS} from "../river/draw.js";
import {COMMON, STATUE} from "../river/sim.js";
import {BUST, GAZE} from "../river/figure.js";
import {FIG, cxf} from "../river/world.js";
import {createPortraitShot} from "./shot-renderer.js";
import {makePlanesMesh} from "./planes-mesh.js";
import {planesPose, planesPaint} from "./planes.js";

const riverLevel=-1.78, walker=[cxf(192)-16.5,0,192];
const bankX=(FIG.x-walker[0])/FIG.s;
const keyframes=[
  [44.58,[bankX+.20,-1.667,3.20],[bankX*.52,-1.614,1.13],.82],
  [45.60,[bankX+.24,-1.64,3.31],[bankX*.39,-1.58,.94],.83],
  [47.35,[.93,-1.26,4.62],[.03,-.94,.04],.86],
  [48.85,[1.07,-.99,4.43],[.04,-.22,.05],.85],
  [50.35,[1.55,-.36,3.00],[-.29,-.015,.17],.78],
  [51.76,[1.26,-.07,2.61],[-.20,-.025,.27],.75],
  [52.40,[1.15,-.15,2.56],[.04,-.14,.30],.75],
  [53.42,[1.21,-.76,2.11],[.58,-.96,.32],.76],
  [54.30,[1.22,-1.29,1.35],[.78,-1.44,-.015],.70],
  [55.10,[1.09,-1.38,.79],[.80,-1.46,-.05],.66],
  [55.92,[.97,-1.42,.47],[.80,-1.46,-.05],.61]
];
// Time-weighted Hermite tangents keep the dolly moving through the camera marks.
function camera(t,aspect){
  let i=0;while(i<keyframes.length-2&&t>keyframes[i+1][0])i++;
  const a=keyframes[i], b=keyframes[i+1], prev=keyframes[Math.max(0,i-1)], next=keyframes[Math.min(keyframes.length-1,i+2)];
  const dt=b[0]-a[0], v=Math.max(0,Math.min(1,(t-a[0])/dt));
  function sample(part,k){const at=row=>k===undefined?row[part]:row[part][k];
    return (1+2*v)*(1-v)**2*at(a)+v*(1-v)**2*(at(b)-at(prev))/(b[0]-prev[0])*dt
      +(3-2*v)*v*v*at(b)+v*v*(v-1)*(at(next)-at(a))/(next[0]-a[0])*dt;}
  const xyz=part=>[0,1,2].map(k=>sample(part,k));
  const eye=xyz(1),target=xyz(2),fov=sample(3);
  const f=norm(sub(target,eye)),r=norm(cross(f,[0,1,0])),up=cross(r,f);
  return {eye,r,up,f,fov,vp:M4.mul(M4.persp(fov,aspect,.025,25),M4.look(eye,target))};
}
const FLOW=COMMON+planesPose+`
struct Stream { vp:mat4x4f, right:vec4f, up:vec4f, ids:vec4f }
@group(0) @binding(0) var<uniform> s:Stream;
@group(0) @binding(1) var atlas:texture_2d<f32>;
@group(0) @binding(2) var atlasS:sampler;
@group(0) @binding(3) var chest:texture_2d<f32>;
struct Letter{@builtin(position) pos:vec4f,@location(0) uv:vec2f,@location(1) @interpolate(flat) cell:vec2f,@location(2) tint:vec4f}
@vertex fn vs(@builtin(vertex_index) v:u32,@builtin(instance_index) id:u32)->Letter{
  let corner=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.))[v];
  let a=rf(id*7u+6u);let b=rf(id*11u+2u);let c=rf(id*5u+23u);let d=rf(id*9u+11u);
  let time=s.right.w;let side=select(-1.,1.,a>.42);
  let phase=fract(rf(id*13u+5u)+(time-44.58)*(.066+.017*b));
  let t=smoothstep(.51,.98,phase)*smoothstep(44.8,48.,time);
  let z=3.45-3.09*smoothstep(0.,.67,phase);
  let spread=(.10+.89*(1.-smoothstep(.03,.80,phase)))*(.34+1.15*abs(b-.5));
  let bank=(.50+.23*sin(phase*14.+a*1.9)+.13*sin(phase*25.+c*.5))*side;
  let ripple=sin(z*28.+(b-.5)*8.+time*1.2);
  let lower=vec3f(bank+spread*(c-.5)*4.4,-1.77+.007*ripple,z+(d-.5)*.17);
  let across=clamp(.78-.45*t+.53*(c-.5)+.055*sin(t*10.+b),.08,.98);
  let high=clamp(t*.79+.15*(b-.5),0.,1.);
  let sample=textureLoad(chest,vec2i(round(vec2f(across,high)*127.)),0).xyz;
  let front=vec3f(side*sample.x,sample.y,sample.z+.012);
  let wp=mix(lower,figurePose(front,front.y,time,1.),smoothstep(0.,.36,t));
  let tilted=(a-.5)*.54+side*t*.34;
  let glyphSize=mix(.013,.057,pow(d,1.5))*mix(.76,1.22,t);
  let waterUp=normalize(vec3f(.8*s.right.x,.04,.8*s.right.z)*sin(tilted)+vec3f(0.,.10,-1.)*cos(tilted));
  let vertical=mix(waterUp,s.up.xyz,smoothstep(.025,.48,t));
  let span=corner-.5;
  let w=wp+glyphSize*(s.right.xyz*(span.x*cos(tilted)-span.y*sin(tilted))+vertical*(span.x*sin(tilted)+span.y*cos(tilted)));
  var out:Letter;out.pos=s.vp*vec4f(w,1.);out.uv=vec2f(corner.x,1.-corner.y);
  let glyph=select(s.ids.x+floor(rf(id+21u)*s.ids.y),s.ids.z+floor(rf(id+9u)*s.ids.w),a>.78);
  out.cell=vec2f(glyph%32.,floor(glyph/32.));
  let edge=smoothstep(0.,.041,phase)*(1.-smoothstep(.76,.97,phase));
  let brightness=(.26+.74*b)*(.63+.37*sin(phase*9.5+time*.44)*sin(phase*9.5+time*.44));
  let rgb=mix(vec3f(.43,.53,.53),vec3f(.68,.51,.32),t);
  out.tint=vec4f(rgb*brightness,edge*.86);return out;
}
@fragment fn fs(l:Letter)->@location(0) vec4f {
  let alpha=textureSample(atlas,atlasS,(l.cell+l.uv)/32.).r*l.tint.a;
  return vec4f(l.tint.rgb,alpha);
}`;
// A low sheet of silt and wave crests passes in front of the submerged chest.
// Project it on the water so that it no longer covers the face when the camera lifts.
const WATER_VEIL=FS_VS+COMMON+NOISE+`
@group(0) @binding(0) var<uniform> G:GU;
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let ndc=vec2f(fc.x/G.m2.x*2.-1.,1.-fc.y/G.m2.y*2.);
  let d=normalize(G.fwd.xyz+G.right.xyz*ndc.x*G.right.w*G.up.w+G.up.xyz*ndc.y*G.right.w);
  if(d.y>=-.008){discard;}
  let distance=(1.65-G.cam.y)/d.y;
  if(distance<=0.){discard;}
  let world=G.cam.xyz+distance*d;
  let p=(vec2f(G.fig.x,G.fig.y)-world.xz)/G.fig.z;
  let time=G.cam.w;
  let zone=exp(-pow(abs(p.x)/1.62,4.)-pow(abs(p.y-.40-.21*sin(p.x*3.))/.52,2.));
  let grain=fbm(p*vec2f(4.,10.)-vec2f(.1,.22)*time);
  let crest=pow(max(0.,sin(p.y*65.+1.62*sin(p.x*5.)+4.*grain-time*1.25)),5.);
  let wake=zone*(.12+.79*crest)*smoothstep(.26,.67,grain);
  let scatter=vec3f(.041,.048,.056)+vec3f(.041,.040,.032)*crest;
  return vec4f(scatter,wake*.89*smoothstep(45.20,47.,time));
}`;
const PORTAL=FS_VS+`
struct Frame{ screen:vec4f, anchor:vec4f, axes:vec4f }
@group(0)@binding(0) var<uniform> s:Frame;
@group(0)@binding(1) var lin:sampler;
@group(0)@binding(2) var scene:texture_2d<f32>;
@group(0)@binding(3) var room:texture_2d<f32>;
@group(0)@binding(4) var atlas:texture_2d<f32>;
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let uv=fc.xy/s.screen.xy;let base=textureSampleLevel(scene,lin,uv,0.).rgb;
  let t=s.screen.z;
  if(t<52.50){return vec4f(base,1.);}
  let a=s.axes.xy;let b=s.axes.zw;let det=a.x*b.y-b.x*a.y;
  if(abs(det)<1.e-7||s.screen.w<.5){return vec4f(base,1.);}
  let delta=uv-s.anchor.xy;
  let q=vec2f(b.y*delta.x-b.x*delta.y,-a.y*delta.x+a.x*delta.y)/det+.5;
  let gid=s.anchor.z;
  let inkUV=(vec2f(gid%32.,floor(gid/32.))+clamp(q,vec2f(0.),vec2f(1.)))/32.;
  let ink=textureSampleLevel(atlas,lin,inkUV,0.).r*step(0.,min(min(q.x,1.-q.x),min(q.y,1.-q.y)));
  var col=mix(base,vec3f(.91,.85,.65),ink*.86*smoothstep(52.50,53.85,t));
  if(t>54.25){
    let k=smoothstep(54.25,55.92,t);
    let centre=mix(s.anchor.xy,.5*vec2f(1.),k);
    let advance=k*k*(1.13-.13*k);
    let horizontal=mix(a*.283,vec2f(.52,0.),advance);
    let vertical=mix(b*.243,vec2f(0.,.52),advance);
    let offset=uv-centre;
    let area=horizontal.x*vertical.y-horizontal.y*vertical.x;
    let local=vec2f(vertical.y*offset.x-vertical.x*offset.y,-horizontal.y*offset.x+horizontal.x*offset.y)/area;
    // Push through the counter of this particular 楷书 口. Its sloping sides
    // straighten in perspective as the wall on the far side takes the frame.
    let movingUV=vec2f(.50,.487)+local*vec2f(.283,.243);
    let movingInk=textureSampleLevel(atlas,lin,(vec2f(gid%32.,floor(gid/32.))+clamp(movingUV,vec2f(0.),vec2f(1.)))/32.,0.).r;
    let edge=max(abs(local.x),abs(local.y));
    let survivingInk=movingInk*(1.-smoothstep(1.40,1.61,edge))*(1.-smoothstep(.075,.55,k));
    col=mix(col,vec3f(.74,.64,.46),survivingInk*.78);
    let roomUV=clamp(.5+.5*local*mix(.23,1.,k),vec2f(0.),vec2f(1.));
    let interior=textureSampleLevel(room,lin,roomUV,0.).rgb;
    let coverage=(1.-smoothstep(.986,1.008,edge))*smoothstep(54.25,54.43,t);
    col=mix(col,interior,coverage);
    if(t>=55.90){col=mix(col,textureSampleLevel(room,lin,uv,0.).rgb,smoothstep(55.90,55.92,t));}
  }
  return vec4f(col,1.);
}`;
function project(m,p) {
  const c=[0,1,3].map(r=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]);
  return [.5+.5*c[0]/c[2],.5-.5*c[1]/c[2],c[2]];
}
function shoulder(t,dx,dy){
  const y=-1.50+dy, x=.72+dx,z=.41-.48*dx-.50*dy;
  const h=sm(-1.58,-.86,y),p=(.17-.27*sm(48.95,51.15,t))*h;
  const a=(-.11+.31*sm(49.10,51.26,t))*h+.46*sm(51.9,53.92,t);
  const cy=y+.88,cz=z+.13,r=cy*Math.sin(p)+cz*Math.cos(p);
  return [x*Math.cos(a)+r*Math.sin(a),-.88+cy*Math.cos(p)-cz*Math.sin(p),-.13-x*Math.sin(a)+r*Math.cos(a)];
}
function portalUniform(cam,t,W,H,glyphIndex){
    const pos=project(cam.vp,shoulder(t,0,0)),ri=project(cam.vp,shoulder(t,.12,0)),lo=project(cam.vp,shoulder(t,0,-.12));
    return new Float32Array([W,H,t,pos[2]>.05?1:0,pos[0],pos[1],glyphIndex,0,2*(ri[0]-pos[0]),2*(ri[1]-pos[1]),2*(lo[0]-pos[0]),2*(lo[1]-pos[1])]);
}
export function createPlanesShot(g,atlas){
  return createPortraitShot(g,atlas,{
    camera, makeMesh:makePlanesMesh, paint:planesPaint, night:FS_VS+NOISE+COMMON+BUST+GAZE+STATUE+BG_FS,
    water:WATER_VEIL, bank:FS_VS+COMMON+OVER_FS, flow:FLOW, portal:PORTAL, portalUniform, portalSize:48,
    flowCount:1680, finish:{bloom:.25,threshold:.86,knee:.4,tonemap:.87,exposure:1,grain:.019,vignette:.30}
  });
}
