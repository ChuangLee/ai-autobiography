// Shared by every shot of verse 3: one uniform block (camera + 48 free vec4 slots) and the ray set-up.
export const NSLOT = 48;
export const HEAD = `
struct U { ro:vec4f, rt:vec4f, up:vec4f, fw:vec4f, vp:mat4x4f, p:array<vec4f,${NSLOT}> }
@group(0)@binding(0) var<uniform> u:U;
fn rayDir(fc:vec2f)->vec3f{ let q=vec2f(fc.x/u.rt.w*2.-1., 1.-fc.y/u.up.w*2.); return normalize(u.fw.xyz+q.x*u.rt.xyz+q.y*u.up.xyz); }
fn sat(x:f32)->f32{ return clamp(x,0.,1.); }
fn rot(a:f32)->mat2x2f{ let c=cos(a); let s=sin(a); return mat2x2f(c,s,-s,c); }
fn ign(p:vec2f)->f32{ return fract(52.9829189*fract(dot(p,vec2f(.06711056,.00583715)))); }
fn ggx(n:vec3f,v:vec3f,l:vec3f,r:f32)->f32{ let h=normalize(v+l); let nh=max(dot(n,h),0.); let a=r*r; let d=nh*nh*(a*a-1.)+1.; return a*a/(3.14159*d*d+1e-5)*max(dot(n,l),0.); }
fn lin3(c:vec3f)->vec3f{ return pow(max(c,vec3f(0.)),vec3f(2.2)); }
`;
export const UBYTES = 16 * 4 + 64 + NSLOT * 16;
