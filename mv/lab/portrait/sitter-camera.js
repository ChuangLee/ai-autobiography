// The bank, the sitter and the eye of the lens share the same head-length units.
import {M4, cross, dot, norm, sub, sm} from "../lib.js";
import {posedPoint} from "./sitter-pose.js";

const marks=[
  // Start beside the witness. His shoulder is the nearest dark shape at screen left.
  [44.58,[-.807,-1.174,3.308],[-.826,-.915,.04],.91],
  [45.80,[-.77,-1.39,3.74],[-.68,-1.19,.08],.91],
  [47.30,[-.39,-1.23,4.87],[-.91,-.43,.10],.84],
  [48.93,[ .29,-1.03,5.17],[-.94,-.43,.12],.75],
  [50.10,[ .88,-.75,4.35],[-.65,-.26,.12],.69],
  [51.38,[1.52,-.38,3.12],[-.39,-.08,.23],.67],
  [52.36,[1.69,-.12,2.60],[-.20,.03,.27],.65],
  [53.20,[1.49,-.038,2.08],[.09,.05,.34],.64],
  [54.24,[1.07,-.07,1.18],[.34,-.10,.36],.63],
  [55.16,[.73,-.15,.78],[.425,-.19,.44],.63]
];
function path(t){
  let i=0;
  while(i<marks.length-2 && t>marks[i+1][0]) i++;
  const a=marks[i],b=marks[i+1],prev=marks[Math.max(0,i-1)],next=marks[Math.min(marks.length-1,i+2)];
  const dt=b[0]-a[0],phase=Math.max(0,Math.min(1,(t-a[0])/dt));
  const u=i===0?phase**3*(3-2*phase):phase,v=1-u;
  function sample(col,k){
    const get=row=>k===undefined?row[col]:row[col][k];
    return (1+2*u)*v*v*get(a)+(3-2*u)*u*u*get(b)+u*v*v*dt*(get(b)-get(prev))/(b[0]-prev[0])
      -u*u*v*dt*(get(next)-get(a))/(next[0]-a[0]);
  }
  return {eye:[0,1,2].map(k=>sample(1,k)),target:[0,1,2].map(k=>sample(2,k)),fov:sample(3)};
}
// The glyph is painted on a tangent patch measured on the actual subdivision mesh.
const cx=.435, cy=-.194;
export function createSitterCamera(facePoint){
  let patch;
  function cheekPlane(t){
    if(!patch){
      const base=facePoint(cx,cy);
      const east=norm(sub(facePoint(cx+.004,cy),facePoint(cx-.004,cy)));
      const rise=sub(facePoint(cx,cy+.004),facePoint(cx,cy-.004));
      const normal=norm(cross(east,rise)), north=norm(cross(normal,east));
      patch={base,east,north,normal};
    }
    const {base,east,north,normal}=patch;
    const at=(v,d)=>posedPoint(base.map((a,i)=>a+normal[i]*.003+d*v[i]),t);
    const centre=at(normal,0);
    return {centre,east:sub(at(east,1),centre),north:sub(at(north,1),centre),normal:sub(at(normal,1),centre)};
  }
  const mix=(a,b,k)=>a.map((n,i)=>n+(b[i]-n)*k);
  function camera(t,aspect){
    const c=path(t);
    if(t>=53.30){
      const {centre,normal}=cheekPlane(t);
      // The final macro move physically approaches the ink until its counter fills the lens.
      // The smooth exponential fall in subject distance gives the eye time to see the ink lip.
      const u=Math.max(0,Math.min(1,(t-53.30)/(55.92-53.30)));
      const distance=1.65*Math.exp(-5.16*u*u);
      const destination=centre.map((n,i)=>n+normal[i]*distance);
      c.eye=mix(c.eye,destination,sm(53.30,54.65,t));
      c.target=mix(c.target,centre,sm(53.30,54.63,t));
    }
    const f=norm(sub(c.target,c.eye)),r=norm(cross(f,[0,1,0])),up=cross(r,f);
    return {...c,r,up,f,vp:M4.mul(M4.persp(c.fov,aspect,.001,80),M4.look(c.eye,c.target))};
  }
  function portalUniform(cam,t,W,H,glyph){
    const data=new Float32Array(16);
    data.set([W,H,t,glyph]);
    if(t<52.15)return data;
    const {centre,east,north,normal}=cheekPlane(t);
    const toCentre=sub(centre,cam.eye),distance=dot(toCentre,normal);
    const tan=Math.tan(cam.fov/2);
    // Each row transforms [screen NDC x,y,1] to a rational coordinate on the skin plane.
    const rays=[cam.r.map(n=>n*tan*W/H),cam.up.map(n=>n*tan),cam.f];
    const denom=rays.map(ray=>dot(ray,normal));
    const row=(axis,sign)=>rays.map((ray,i)=>.5*denom[i]+sign*(distance*dot(ray,axis)-dot(toCentre,axis)*denom[i])/.192);
    data.set([...row(east,1),0],4);
    data.set([...row(north,-1),0],8);
    data.set([...denom,0],12);
    return data;
  }
  return {camera,portalUniform};
}
