import {FS_VS,NOISE,shader,norm,sub,cross} from "../lib.js";
import {HEAD} from "../portrait/sitter-shell.js";
import {createTidalHeadMap,TIDAL_HEAD_WGSL} from "../portrait/tidal-head-map.js";
import {furniture} from "./answer-furniture.js";
import {figures} from "./answer-figures.js";
import {street} from "./answer-street.js";

const settings=`
struct Camera{eye:vec4f,right:vec4f,up:vec4f,forward:vec4f,screen:vec4f,letters:vec4f}
@group(0)@binding(0)var<uniform> A:Camera;
@group(0)@binding(1)var atlas:texture_2d<f32>;
@group(0)@binding(2)var inkSampler:sampler;
@group(0)@binding(3)var questions:texture_2d<f32>;
@group(0)@binding(4)var paperSampler:sampler;
const bay=4.38;const floorHeight=3.12;
fn figureEll(p:vec3f,r:vec3f)->f32{let a=length(p/r);return a*(a-1.)/max(length(p/(r*r)),.0001);}
fn capsule(p:vec3f,a:vec3f,b:vec3f,r:f32)->f32{let d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.))-r;}
fn blendDist(a:f32,b:f32,k:f32)->f32{let h=max(k-abs(a-b),0.)/k;return min(a,b)-.25*k*h*h;}
fn bell(v:f32)->f32{return exp(-v*v);}
fn questionLight(id:f32,t:f32)->f32{
 if(id==0.){return (.83+.17*smoothstep(55.9,57.6,t))*(1.-smoothstep(63.22,63.94,t));}
 if(id==1.){return smoothstep(66.5,67.24,t);}
 let start=70.1+3.2*hash11(id*39.+14.);return smoothstep(start,start+.73,t)*(.38+.62*hash11(id+13.));
}
fn presence(id:f32,t:f32)->f32{
 if(id==0.){return smoothstep(56.22,60.49,t)*(1.-smoothstep(63.28,65.04,t));}
 if(id==1.){return smoothstep(66.85,69.66,t);}
 return questionLight(id,t)*smoothstep(70.2,72.4,t);
}
`;
// The frame remains outside the glass. The side window and the wall between
// households move through the picture as the camera tracks parallel to the street.
const keys=[
 [55.92,1.85,1.56,-3.51,-.61,1.34,1.06,49],
 [58.40,2.09,1.52,-3.24,-.49,1.30,1.12,47],
 [61.20,2.25,1.46,-2.91,-.32,1.24,1.21,45],
 [63.10,2.35,1.44,-3.04,-.25,1.24,1.21,46],
 [64.80,2.79,1.42,-3.05,1.22,1.23,.16,49],
 [66.40,4.00,1.43,-2.73,2.54,1.24,.05,48],
 [68.20,5.43,1.52,-3.07,4.15,1.24,1.07,47],
 [69.90,5.92,1.49,-2.93,4.49,1.24,1.25,46],
 [70.65,6.05,1.50,-3.22,4.48,1.23,1.27,47],
 [72.05,6.71,2.80,-7.70,3.16,1.11,.46,53],
 [73.57,8.10,4.31,-14.9,2.48,.27,.32,58],
 [75.40,9.93,6.21,-23.4,1.84,-.72,.06,61]
];
function lens(t){
 let i=0;while(i<keys.length-2 && t>keys[i+1][0])i++;
 const a=keys[i],b=keys[i+1],prior=keys[Math.max(0,i-1)],next=keys[Math.min(keys.length-1,i+2)];
 const h=b[0]-a[0],u=Math.min(1,Math.max(0,(t-a[0])/h)),v=1-u;
 return a.slice(1).map((n,j)=>{const k=j+1;return (1+2*u)*v*v*n+(3-2*u)*u*u*b[k]
   +u*v*v*h*(b[k]-prior[k])/(b[0]-prior[0])-u*u*v*h*(next[k]-n)/(next[0]-a[0]);});
}
export function createAnswerRoom(g,atlas,text,sampler){
 const d=g.device, module=shader(d,FS_VS+NOISE+settings+HEAD+TIDAL_HEAD_WGSL+furniture+figures+street,"墙内的两个回答");
 const blend={color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha"}};
 const pipe=d.createRenderPipeline({layout:"auto",vertex:{module,entryPoint:"vs"},fragment:{module,entryPoint:"fs",targets:[{format:"rgba16float",blend}]}});
 const buf=d.createBuffer({size:96,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const group=d.createBindGroup({layout:pipe.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:buf}},{binding:1,resource:atlas.tex.createView()},{binding:2,resource:atlas.sampler},{binding:3,resource:text},{binding:4,resource:sampler},{binding:5,resource:createTidalHeadMap(d)}]});
 const q=new Float32Array(24),ka=atlas.info.groupRanges["cn-kai"],song=atlas.info.groupRanges["cn-song"];
 q.set([g.W,g.H,g.W/g.H,0,ka[0],ka[1]-ka[0]+1,song[0],song[1]-song[0]+1],16);
 return (encoder,color,t,weight)=>{
  const k=lens(t),eye=k.slice(0,3),f=norm(sub(k.slice(3,6),eye)),right=norm(cross([0,1,0],f)),up=cross(f,right);
  q.set(eye,0);q[3]=t;q.set(right,4);q[7]=Math.tan(k[6]*Math.PI/360);q.set(up,8);q.set(f,12);q[19]=weight;
  d.queue.writeBuffer(buf,0,q);const p=encoder.beginRenderPass({colorAttachments:color});p.setPipeline(pipe);p.setBindGroup(0,group);p.draw(3);p.end();
 };
}
