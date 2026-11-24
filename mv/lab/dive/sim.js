// WGSL for the 3D fluid: velocity G³ and dye DG³ (2–3× finer), both advected with a MacCormack step so thin structure survives;
// vorticity confinement, pressure projection, an occupancy grid for the ray-marcher, and the top light's coloured transmittance.
export const WORLD = 3.2;                       // world size of the simulated cube; its top face is the water surface (y = 0)
// pigments as absorbers: SIG is extinction per unit concentration (what the grain takes out of white light), SCA what it scatters back
export const PIG = `
const SIG0=vec3f(.10,1.00,1.20); const SCA0=vec3f(.060,.016,.008);     // cinnabar
const SIG1=vec3f(1.20,.60,.10);  const SCA1=vec3f(.008,.026,.060);      // azurite
const SIG2=vec3f(1.10,.12,.62);  const SCA2=vec3f(.008,.060,.030);      // malachite
const SIG3=vec3f(.58,.64,1.05);  const SCA3=vec3f(.52,.40,.14);       // gold
const KP=330.;
fn sigT(d:vec4f)->vec3f{ return KP*(d.x*SIG0+d.y*SIG1+d.z*SIG2+d.w*SIG3); }
fn sigS(d:vec4f)->vec3f{ return KP*(d.x*SCA0+d.y*SCA1+d.z*SCA2+d.w*SCA3); }
`;
const HEAD = `
struct Src { p:vec4f, v:vec4f, c:vec4f }
struct Sim { dt:f32, t:f32, G:f32, DG:f32, buoy:f32, vortE:f32, lift:f32, swirl:f32, diss:f32, vdamp:f32, nsrc:f32, noise:f32, src:array<Src,6> }
@group(0)@binding(0) var<uniform> S:Sim;
@group(0)@binding(1) var samp:sampler;
fn h3(p:vec3f)->f32{ var q=fract(p*.1031); q+=dot(q,q.zyx+31.32); return fract((q.x+q.y)*q.z); }
const X=vec3i(1,0,0); const Y=vec3i(0,1,0); const Z=vec3i(0,0,1);
`;
// first half of MacCormack: plain semi-Lagrangian into a scratch texture
export const VEL1 = HEAD + `
@group(0)@binding(2) var velIn:texture_3d<f32>;
@group(0)@binding(3) var outT:texture_storage_3d<rgba16float,write>;
@compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){ if(any(id>=vec3u(u32(S.G)))){ return; }
  let uvw=(vec3f(id)+.5)/S.G; let v0=textureSampleLevel(velIn,samp,uvw,0.).xyz; let v1=textureSampleLevel(velIn,samp,uvw-.5*v0*S.dt,0.).xyz;
  textureStore(outT,id,vec4f(textureSampleLevel(velIn,samp,uvw-v1*S.dt,0.).xyz,0.)); }`;
// second half: error correction, limited to the values around the departure point; then the forces
export const VEL2 = HEAD + `
@group(0)@binding(2) var velIn:texture_3d<f32>;
@group(0)@binding(3) var hatT:texture_3d<f32>;
@group(0)@binding(4) var dyeIn:texture_3d<f32>;
@group(0)@binding(5) var velOut:texture_storage_3d<rgba16float,write>;
@compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){
  let G=S.G; let gi=u32(G); if(any(id>=vec3u(gi))){ return; } let g1=vec3i(i32(gi)-1);
  let uvw=(vec3f(id)+.5)/G; let i=vec3i(id);
  let v0=textureLoad(velIn,i,0).xyz; let v1=textureSampleLevel(velIn,samp,uvw-.5*v0*S.dt,0.).xyz;
  let hat=textureLoad(hatT,i,0).xyz; let til=textureSampleLevel(hatT,samp,uvw+v1*S.dt,0.).xyz;
  var v=hat+.5*(v0-til);
  let b=vec3i(floor((uvw-v1*S.dt)*G-.5)); var mn=vec3f(1e9); var mx=vec3f(-1e9);
  for(var k=0;k<8;k++){ let c=textureLoad(velIn,clamp(b+vec3i(k&1,(k>>1)&1,(k>>2)&1),vec3i(0),g1),0).xyz; mn=min(mn,c); mx=max(mx,c); }
  v=clamp(v,mn,mx)*S.vdamp;
  let d=textureSampleLevel(dyeIn,samp,uvw,0.); let m=dot(d,vec4f(1.,.92,.88,1.15));
  v.y+=S.dt*(-S.buoy*m+S.lift*(.10+min(m,1.5)));
  let r=uvw.xz-.5; let rl=length(r)+.08;
  v+=S.dt*S.swirl*(vec3f(-r.y,0.,r.x)/rl*.35+vec3f(-r.x,0.,-r.y)*.3);
  let q=uvw*6.2832; let tt=S.t*.11;
  v+=S.dt*S.noise*vec3f(sin(q.y+tt)*cos(q.z*2.+1.3),sin(q.z+tt*1.3+2.)*cos(q.x*2.)*.5,sin(q.x+tt*.7+4.)*cos(q.y*2.+.7));
  let ns=i32(S.nsrc);
  for(var k=0;k<ns;k++){ let s=S.src[k]; let e=(uvw-s.p.xyz)/s.p.w; let w=exp(-dot(e,e)*1.4)*s.v.w;
    v=mix(v,s.v.xyz+vec3f(h3(vec3f(id)+S.t)-.5,0.,h3(vec3f(id)+S.t+7.)-.5)*.035*length(s.v.xyz),clamp(w,0.,1.)); }
  let e=min(min(uvw.x,1.-uvw.x),min(uvw.z,1.-uvw.z)); v*=mix(1.,smoothstep(0.,.07,e)*smoothstep(0.,.07,uvw.y),clamp(S.dt*6.,0.,1.));
  if(id.x==0u||id.x==gi-1u){ v.x=0.; } if(id.y==0u||id.y==gi-1u){ v.y=0.; } if(id.z==0u||id.z==gi-1u){ v.z=0.; }
  textureStore(velOut,id,vec4f(v,0.));
}`;
const LOADV = `fn V(i:vec3i)->vec3f{ let g=i32(S.G)-1; return textureLoad(velIn,clamp(i,vec3i(0),vec3i(g)),0).xyz; }`;
export const VORT = HEAD + `
@group(0)@binding(2) var velIn:texture_3d<f32>;
@group(0)@binding(3) var outT:texture_storage_3d<rgba16float,write>;
` + LOADV + `
@compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){ if(any(id>=vec3u(u32(S.G)))){ return; } let i=vec3i(id);
  let w=.5*vec3f((V(i+Y).z-V(i-Y).z)-(V(i+Z).y-V(i-Z).y),(V(i+Z).x-V(i-Z).x)-(V(i+X).z-V(i-X).z),(V(i+X).y-V(i-X).y)-(V(i+Y).x-V(i-Y).x));
  textureStore(outT,id,vec4f(w,length(w))); }`;
export const CONFINE = HEAD + `
@group(0)@binding(2) var velIn:texture_3d<f32>;
@group(0)@binding(3) var vortT:texture_3d<f32>;
@group(0)@binding(4) var velOut:texture_storage_3d<rgba16float,write>;
` + LOADV + `
fn W(i:vec3i)->vec4f{ let g=i32(S.G)-1; return textureLoad(vortT,clamp(i,vec3i(0),vec3i(g)),0); }
@compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){ if(any(id>=vec3u(u32(S.G)))){ return; } let i=vec3i(id);
  let gr=.5*vec3f(W(i+X).w-W(i-X).w,W(i+Y).w-W(i-Y).w,W(i+Z).w-W(i-Z).w); let n=gr/(length(gr)+1e-6);
  let v=V(i)+S.dt*S.vortE*cross(n,W(i).xyz); textureStore(velOut,id,vec4f(v,0.)); }`;
export const DIVG = HEAD + `
@group(0)@binding(2) var velIn:texture_3d<f32>;
@group(0)@binding(3) var outT:texture_storage_3d<r32float,write>;
` + LOADV + `
@compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){ if(any(id>=vec3u(u32(S.G)))){ return; } let i=vec3i(id);
  let d=.5*((V(i+X).x-V(i-X).x)+(V(i+Y).y-V(i-Y).y)+(V(i+Z).z-V(i-Z).z)); textureStore(outT,id,vec4f(d,0.,0.,0.)); }`;
export const JACOBI = HEAD + `
@group(0)@binding(2) var pIn:texture_3d<f32>;
@group(0)@binding(3) var divT:texture_3d<f32>;
@group(0)@binding(4) var pOut:texture_storage_3d<r32float,write>;
fn Pr(i:vec3i)->f32{ let g=i32(S.G)-1; return textureLoad(pIn,clamp(i,vec3i(0),vec3i(g)),0).x; }
@compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){ if(any(id>=vec3u(u32(S.G)))){ return; } let i=vec3i(id);
  let p=(Pr(i+X)+Pr(i-X)+Pr(i+Y)+Pr(i-Y)+Pr(i+Z)+Pr(i-Z)-textureLoad(divT,i,0).x)/6.; textureStore(pOut,id,vec4f(p,0.,0.,0.)); }`;
export const GRAD = HEAD + `
@group(0)@binding(2) var velIn:texture_3d<f32>;
@group(0)@binding(3) var pIn:texture_3d<f32>;
@group(0)@binding(4) var velOut:texture_storage_3d<rgba16float,write>;
` + LOADV + `
fn Pr(i:vec3i)->f32{ let g=i32(S.G)-1; return textureLoad(pIn,clamp(i,vec3i(0),vec3i(g)),0).x; }
@compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){ let gi=u32(S.G); if(any(id>=vec3u(gi))){ return; } let i=vec3i(id);
  var v=V(i)-.5*vec3f(Pr(i+X)-Pr(i-X),Pr(i+Y)-Pr(i-Y),Pr(i+Z)-Pr(i-Z));
  if(id.x==0u||id.x==gi-1u){ v.x=0.; } if(id.y==0u||id.y==gi-1u){ v.y=0.; } if(id.z==0u||id.z==gi-1u){ v.z=0.; }
  textureStore(velOut,id,vec4f(v,0.)); }`;
export const DYE1 = HEAD + `
@group(0)@binding(2) var velIn:texture_3d<f32>;
@group(0)@binding(3) var dyeIn:texture_3d<f32>;
@group(0)@binding(4) var outT:texture_storage_3d<rgba16float,write>;
@compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){ if(any(id>=vec3u(u32(S.DG)))){ return; }
  let uvw=(vec3f(id)+.5)/S.DG; let v=textureSampleLevel(velIn,samp,uvw,0.).xyz; let v1=textureSampleLevel(velIn,samp,uvw-.5*v*S.dt,0.).xyz;
  textureStore(outT,id,textureSampleLevel(dyeIn,samp,uvw-v1*S.dt,0.)); }`;
export const DYE2 = HEAD + `
@group(0)@binding(2) var velIn:texture_3d<f32>;
@group(0)@binding(3) var dyeIn:texture_3d<f32>;
@group(0)@binding(4) var hatT:texture_3d<f32>;
@group(0)@binding(5) var dyeOut:texture_storage_3d<rgba16float,write>;
@compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){ let gi=u32(S.DG); if(any(id>=vec3u(gi))){ return; } let g1=vec3i(i32(gi)-1);
  let uvw=(vec3f(id)+.5)/S.DG; let i=vec3i(id); let v=textureSampleLevel(velIn,samp,uvw,0.).xyz; let v1=textureSampleLevel(velIn,samp,uvw-.5*v*S.dt,0.).xyz;
  let hat=textureLoad(hatT,i,0); let til=textureSampleLevel(hatT,samp,uvw+v1*S.dt,0.);
  var d=hat+.5*(textureLoad(dyeIn,i,0)-til);
  let b=vec3i(floor((uvw-v1*S.dt)*S.DG-.5)); var mn=vec4f(1e9); var mx=vec4f(-1e9);
  for(var k=0;k<8;k++){ let c=textureLoad(dyeIn,clamp(b+vec3i(k&1,(k>>1)&1,(k>>2)&1),vec3i(0),g1),0); mn=min(mn,c); mx=max(mx,c); }
  d=clamp(d,mn,mx);
  let ns=i32(S.nsrc);
  for(var k=0;k<ns;k++){ let s=S.src[k]; let e=(uvw-s.p.xyz)/s.p.w; let w=exp(-dot(e,e)*2.4)*(.7+.6*h3(vec3f(id)*.37+S.t)); d+=s.c*w*S.dt; }
  let e=min(min(uvw.x,1.-uvw.x),min(uvw.z,1.-uvw.z)); d*=1.-S.dt*5.*(1.-smoothstep(0.,.07,e)*smoothstep(0.,.08,uvw.y));
  textureStore(dyeOut,id,clamp(d,vec4f(0.),vec4f(4.)));
}`;
// where there is any pigment at all, at a sixth of the resolution: lets the ray-marcher stride through clear water
export const OCC = HEAD + `
@group(0)@binding(2) var dyeIn:texture_3d<f32>;
@group(0)@binding(3) var outT:texture_storage_3d<rgba16float,write>;
@compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){ let od=textureDimensions(outT); if(any(id>=od)){ return; }
  let dd=vec3i(textureDimensions(dyeIn)); let bl=(dd+vec3i(od)-1)/vec3i(od); let o=vec3i(id)*bl; var m=0.;
  for(var z=0;z<bl.z;z++){ for(var y=0;y<bl.y;y++){ for(var x=0;x<bl.x;x++){ let c=textureLoad(dyeIn,min(o+vec3i(x,y,z),dd-1),0); m=max(m,max(max(c.x,c.y),max(c.z,c.w))); } } }
  textureStore(outT,id,vec4f(m,0.,0.,0.)); }`;
export const LIGHT = HEAD + PIG + `
@group(0)@binding(2) var dyeIn:texture_3d<f32>;
@group(0)@binding(3) var outT:texture_storage_3d<rgba16float,write>;
@compute @workgroup_size(8,8,1) fn main(@builtin(global_invocation_id) id:vec3u){ let gd=textureDimensions(outT); let gi=gd.x; if(id.x>=gi||id.y>=gi){ return; }
  var tau=vec3f(0.); let n=f32(gi); let ds=${WORLD}/n; let o=1.3/n;
  for(var y=i32(gi)-1;y>=0;y--){ let uvw=(vec3f(f32(id.x),f32(y),f32(id.y))+.5)/n;
    let d=.36*textureSampleLevel(dyeIn,samp,uvw,0.)+.16*(textureSampleLevel(dyeIn,samp,uvw+vec3f(o,0.,0.),0.)+textureSampleLevel(dyeIn,samp,uvw-vec3f(o,0.,0.),0.)+textureSampleLevel(dyeIn,samp,uvw+vec3f(0.,0.,o),0.)+textureSampleLevel(dyeIn,samp,uvw-vec3f(0.,0.,o),0.));
    let s=sigT(d)*ds*.5; tau+=s; textureStore(outT,vec3u(id.x,u32(y),id.y),vec4f(exp(-tau),1.)); tau+=s; } }`;
export const CLEAR16 = `@group(0)@binding(0) var o:texture_storage_3d<rgba16float,write>; @compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){ if(any(id>=textureDimensions(o))){ return; } textureStore(o,id,vec4f(0.)); }`;
export const CLEAR32 = `@group(0)@binding(0) var o:texture_storage_3d<r32float,write>; @compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){ if(any(id>=textureDimensions(o))){ return; } textureStore(o,id,vec4f(0.)); }`;
