import {sm} from '../lib.js';

// The handoff projects the same point that the vertex shader moves; rotations
// pivot at the base of the neck. At the cheek close-up the pose comes to rest.
export function posedPoint(point,time){
  const [x,y,z]=point;
  const h=sm(-1.58,-.85,y), neck=sm(-1.03,-.53,y);
  const listen=sm(48.82,51.28,time), settle=sm(51.84,53.16,time);
  const pitch=(.167-.131*listen+.025*settle)*h;
  const yaw=(-.105-.067*listen+.026*settle)*h;
  const roll=(-.020+.012*listen)*neck;
  const cy=y+.88,cz=z+.13,py=cy*Math.cos(pitch)-cz*Math.sin(pitch),pz=cy*Math.sin(pitch)+cz*Math.cos(pitch);
  const xx=x*Math.cos(yaw)+pz*Math.sin(yaw);
  return [xx*Math.cos(roll)-py*Math.sin(roll),xx*Math.sin(roll)+py*Math.cos(roll)-.88,-x*Math.sin(yaw)+pz*Math.cos(yaw)-.13];
}
export const sitterPose=`
fn figurePose(v:vec3f,y:f32,t:f32,point:f32)->vec3f{
 let h=smoothstep(-1.58,-.85,y);let neck=smoothstep(-1.03,-.53,y);
 let listen=smoothstep(48.82,51.28,t);let settle=smoothstep(51.84,53.16,t);
 let pitch=(.167-.131*listen+.025*settle)*h;let yaw=(-.105-.067*listen+.026*settle)*h;
 let roll=(-.020+.012*listen)*neck;let pivot=vec3f(0.,-.88,-.13);
 let p=v-pivot*point;
 let r=vec3f(p.x,p.y*cos(pitch)-p.z*sin(pitch),p.y*sin(pitch)+p.z*cos(pitch));
 let q=vec3f(r.x*cos(yaw)+r.z*sin(yaw),r.y,-r.x*sin(yaw)+r.z*cos(yaw));
 return vec3f(q.x*cos(roll)-q.y*sin(roll),q.x*sin(roll)+q.y*cos(roll),q.z)+pivot*point;
}`;
