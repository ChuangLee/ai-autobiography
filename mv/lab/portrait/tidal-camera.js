import {M4,cross,dot,norm,sub,sm} from "../lib.js";

// The lens stays on the moon–sternum axis throughout “汇聚成我”.
const marks=[
 [44.58,[-.09,-1.66,5.36],[0,-1.25,.0],.85],
 [46.45,[-.038,-1.59,4.75],[0,-1.21,.0],.84],
 [48.20,[0,-1.48,4.33],[0,-1.15,.0],.831],
 [50.25,[0,-1.43,4.18],[0,-1.11,.0],.825],
 [51.85,[.006,-1.37,4.02],[0,-1.01,.0],.815],
 [52.70,[.060,-.97,2.93],[.012,-.62,.0],.775],
 [53.37,[.112,-.64,2.12],[.024,-.40,.025],.77],
 [54.02,[.18,-.31,1.26],[.047,-.19,.06],.708],
 [55.00,[.21,-.091,.41],[.12,-.10,.12],.64]
];
function path(t){
 let i=0;while(i<marks.length-2&&t>marks[i+1][0])i++;
 const a=marks[i],b=marks[i+1],prev=marks[Math.max(0,i-1)],next=marks[Math.min(marks.length-1,i+2)];
 const dt=b[0]-a[0],u=Math.max(0,Math.min(1,(t-a[0])/dt)),v=1-u;
 function value(c,k){
   const get=row=>k===undefined?row[c]:row[c][k];
   return (1+2*u)*v*v*get(a)+(3-2*u)*u*u*get(b)+u*v*v*dt*(get(b)-get(prev))/(b[0]-prev[0])
     -u*u*v*dt*(get(next)-get(a))/(next[0]-a[0]);
 }
 return {eye:[0,1,2].map(k=>value(1,k)),target:[0,1,2].map(k=>value(2,k)),fov:value(3)};
}
const mix=(a,b,k)=>a.map((n,i)=>n+(b[i]-n)*k);
const glyphWidth=.060;
export function tidalCamera(facePoint){
 let plane;
 function skin(){
   if(plane)return plane;
   const x=.124,y=-.102,base=facePoint(x,y),east=norm(sub(facePoint(x+.0015,y),facePoint(x-.0015,y)));
   const rise=sub(facePoint(x,y+.0015),facePoint(x,y-.0015));
   const normal=norm(cross(east,rise));const north=norm(cross(normal,east));
   plane={centre:base.map((n,i)=>n+.0009*normal[i]),east,north,normal};return plane;
 }
 function camera(t,aspect){
   const c=path(t);
   if(t>53.72){
     const {centre,normal}=skin();
     const u=Math.max(0,Math.min(1,(t-53.72)/2.20));
     const dist=1.37*Math.exp(-6.35*u*u);
     const near=centre.map((v,i)=>v+normal[i]*dist);
     c.eye=mix(c.eye,near,sm(53.72,54.84,t));
     c.target=mix(c.target,centre,sm(53.72,54.74,t));
   }
   const f=norm(sub(c.target,c.eye)),r=norm(cross(f,[0,1,0])),up=cross(r,f);
   return {...c,r,up,f,vp:M4.mul(M4.persp(c.fov,aspect,.0007,100),M4.look(c.eye,c.target))};
 }
 function portalUniform(cam,t,W,H,glyph){
   const frame=new Float32Array(16);frame.set([W,H,t,glyph]);
   const {centre,east,north,normal}=skin(),rel=sub(centre,cam.eye);
   const tan=Math.tan(cam.fov/2),dist=dot(rel,normal);
   const rays=[cam.r.map(v=>v*tan*W/H),cam.up.map(v=>v*tan),cam.f];
   const den=rays.map(ray=>dot(ray,normal));
   const axis=(ax,sign)=>rays.map((r,i)=>.5*den[i]+sign*(dist*dot(r,ax)-dot(rel,ax)*den[i])/glyphWidth);
   frame.set(axis(east,1),4);frame.set(axis(north,-1),8);frame.set(den,12);frame[15]=1;return frame;
 }
 return {camera,portalUniform};
}
