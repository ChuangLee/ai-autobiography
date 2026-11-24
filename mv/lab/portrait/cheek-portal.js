import {FS_VS} from "../lib.js";
export const PORTAL=FS_VS+`
struct F{screen:vec4f,glyphX:vec4f,glyphY:vec4f,denom:vec4f}
@group(0) @binding(0) var<uniform> S:F;
@group(0) @binding(1) var lin:sampler;
@group(0) @binding(2) var scene:texture_2d<f32>;
@group(0) @binding(3) var room:texture_2d<f32>;
@group(0) @binding(4) var atlas:texture_2d<f32>;
// Row intersections of the enclosed counter, measured from glyph 207 in the real atlas.
const counter=array<u32,64>(
  0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u,
  0u, 0u, 0u, 0u, 0u, 0u, 20579u, 11107u,
  7778u, 7778u, 7778u, 7778u, 7778u, 7778u, 7778u, 8033u,
  8033u, 8033u, 8033u, 8033u, 8033u, 8033u, 8032u, 8288u,
  8288u, 8288u, 8288u, 8288u, 8288u, 8287u, 8287u, 8543u,
  8543u, 8543u, 8543u, 8543u, 8511u, 0u, 0u, 0u,
  0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u,
  0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u
);
fn widthAt(row:i32)->vec2f{
 let extent=counter[u32(clamp(row,0,63))];
 return vec2f(f32(extent>>8u),f32(extent&255u))/128.;
}
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
 let uv=fc.xy/S.screen.xy;let t=S.screen.z;
 let base=textureSampleLevel(scene,lin,uv,0.).rgb;
 if(t<52.15){return vec4f(base,1.);}
 let ndc=vec3f(uv.x*2.-1.,1.-2.*uv.y,1.);
 let w=dot(ndc,S.denom.xyz);
 if(w>=-.0002){return vec4f(base,1.);}
 let p=vec2f(dot(ndc,S.glyphX.xyz),dot(ndc,S.glyphY.xyz))/w;
 if(any(p<vec2f(0.))||any(p>vec2f(1.))){return vec4f(base,1.);}
 let gid=S.screen.w;let cell=vec2f(gid%32.,floor(gid/32.));
 let ink=textureSampleLevel(atlas,lin,(cell+p)/32.,0.).r;
 let trace=smoothstep(52.19,53.24,t);
 let gold=base*vec3f(.69,.63,.52)+vec3f(.144,.115,.072);
 var col=mix(base,gold,trace*ink*.77);
 let row=p.y*64.;let j=i32(floor(row));
 let span=mix(widthAt(clamp(j,14,44)),widthAt(clamp(j+1,14,44)),fract(row));
 let border=min(p.x-span.x,span.y-p.x);
 let ends=smoothstep(27.5,28.9,p.y*128.)*(1.-smoothstep(87.6,89.,p.y*128.));
 let inside=smoothstep(-.003,.007,border)*ends*(1.-ink);
 let enter=smoothstep(53.63,54.83,t);
 let through=smoothstep(54.73,55.60,t);
 let roomUV=mix(vec2f(.48,.47)+(p-vec2f(.50,.485))*vec2f(1.16,1.35),uv,through);
 let other=textureSampleLevel(room,lin,clamp(roomUV,vec2f(0.),vec2f(1.)),0.).rgb;
 let deep=other*mix(vec3f(.49,.42,.33),vec3f(1.),smoothstep(54.68,55.46,t));
 let lip=1.-smoothstep(.002,.026,max(0.,border));
 let penumbra=1.-.45*lip*(1.-through);
 col=mix(col,deep*penumbra,enter*inside);
 if(S.denom.w>0.){
   let glint=smoothstep(54.9,55.21,t)*(1.-smoothstep(55.36,55.85,t));
   let line=p.y-.58-.009*sin(15.*p.x+t*.42);
   let streak=exp(-line*line/.000014)*exp(-30.*(p.x-.53)*(p.x-.53));
   col+=vec3f(.048,.032,.014)*glint*inside*streak;
 }
 return vec4f(col,1.);
}`;
