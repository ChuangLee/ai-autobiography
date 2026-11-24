import { lightForm } from "./light-form.js";
import { shader, NOISE, FS_VS } from "../lib.js";

const SURFACE = NOISE + `
struct Camera { yaw:f32, time:f32, aspect:f32, pad:f32 };
@group(0) @binding(0) var<uniform> camera:Camera;
struct V {
 @builtin(position) pos:vec4f, @location(0) local:vec3f, @location(1) world:vec3f,
 @location(2) norm:vec3f, @location(3) @interpolate(flat) part:u32,
};
fn turn(p:vec3f)->vec3f{
 let c=cos(camera.yaw); let s=sin(camera.yaw);
 return vec3f(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);
}
@vertex fn vs(@location(0) p:vec3f,@location(1) n:vec3f,@location(2) part:f32)->V{
 let world=turn(p); let d=5.45-world.z;
 var o:V; o.pos=vec4f(world.x/(.283*camera.aspect),(world.y+.205)/.283,d*(15./14.8)-.2*(15./14.8),d);
 o.local=p; o.world=world; o.norm=turn(n);o.part=u32(part);return o;
}
fn sq(x:f32)->f32{return x*x;}
fn gauss(v:vec2f)->f32{return exp(-dot(v,v));}
fn display(c:vec3f)->vec3f{
 let m=clamp(c*(2.51*c+.03)/(c*(2.43*c+.59)+.14),vec3f(0),vec3f(1));
 return pow(m,vec3f(1./2.2));
}
fn follicles(q:vec2f)->f32{
 let cell=floor(q); let c=fract(q)-(.17+.66*hash22(cell+8.7));
 let r=.080+.085*hash21(cell+31.); let d=length(c*vec2f(1.,.81))/r;
 return (exp(-d*d)-.30*exp(-sq((d-1.21)/.39)))*smoothstep(.16,.87,hash21(cell+2.5));
}
@fragment fn fs(i:V)->@location(0) vec4f{
 let p=i.local; let w=i.world; let a=abs(p.x);
 let v=normalize(vec3f(0.,-.205,5.45)-w);
 var n=normalize(i.norm);
 let front=smoothstep(.1,.35,p.z)*select(0.,1.,i.part==0u);
 let u=(a-.303)/.154;let ec=.148+.022*u+.005*sign(p.x);let ey=p.y-ec;
 let ek=clamp(1.-u*u,0.,1.);let top=.077*pow(ek,.72);let bot=.048*pow(ek,.79);
 let eyeDist=min(top-ey,ey+bot);
 let lid=select(0.,1.,abs(u)<1.)*front;
 let eye=lid*smoothstep(-.0015,.0025,eyeDist);
 let mx=p.x+.008;let mu=mx/.307; let m=clamp(1.-mu*mu,0.,1.);
 let line=-.562-.009*mu*mu-.004*sin(4.*mu)-.005*exp(-sq(mu/.18));
 let dy=p.y-line; let upper=m*(.039+.025*exp(-sq((abs(mx)-.063)/.044)));
 let lower=m*(.071-.017*abs(mu));
 let lip=smoothstep(-.005,.004,min(upper-dy,dy+lower))*smoothstep(1.02,.94,abs(mu))*front;
 let nare=vec2f((a-.108)/.044,(p.y+.319+.18*(a-.108))/.015);
 let nostril=gauss(nare)*front;
 let skinNoise=vnoise3(p*44.+vec3f(3.,7.,21.));
 let pores=vec3f(vnoise3(p*89.+vec3f(.39,0.,0.)),vnoise3(p*89.+vec3f(0.,.39,0.)),vnoise3(p*89.+vec3f(0.,0.,.39)))-vec3f(vnoise3(p*89.));
 let fine=1.-smoothstep(.009,.025,length(fwidth(p)));
 n=normalize(n+turn(pores)*.072*fine*(1.-eye));
 let light=normalize(vec3f(-.79,.57,.61));
 let fill=normalize(vec3f(.79,.12,.63)); let rim=normalize(vec3f(.66,.32,-.70));
 let h=normalize(v+light);let nl=dot(n,light); let nv=max(0.,dot(n,v));
 let rough=.67+.13*skinNoise;let spec=pow(max(dot(n,h),0.),mix(37.,17.,rough));
 let orbit=front*gauss(vec2f((a-.31)/.195,(p.y-.15)/.125));
 let upperShade=lid*exp(-sq((ey-top-.017)/.041))*.40;
 let bag=front*gauss(vec2f((a-.34)/.18,(p.y-.048)/.056));
 let browY=.303+.044*smoothstep(.09,.32,a)+.010*exp(-sq((a-.33)/.16))-.049*smoothstep(.34,.56,a)+.008*sign(p.x);
 let brow=front*gauss(vec2f((a-.314)/.171,(p.y-browY+.017)/.024));
 let mound=front*gauss(vec2f((a-.34)/.25,(p.y+.16)/.26));
 var albedo=mix(vec3f(.424,.289,.169),vec3f(.529,.378,.236),.23*skinNoise+.40*mound);
 albedo=mix(albedo,vec3f(.28,.185,.107),orbit*.68+bag*.13+brow*.19);
 let tissue=gauss(vec2f((a-.18)/.24,(p.y+.23)/.24))*front+select(0.,.45,i.part==1u);
 albedo*=vec3f(1.+.048*tissue,1.-.022*tissue,1.-.048*tissue);
 albedo*=.96+.064*vnoise3(p*4.6)+.017*vnoise3(p*18.1);
 albedo=mix(albedo,vec3f(.297,.175,.117)*(.93+.12*skinNoise),lip*.76);
 let slit=smoothstep(.010,.0015,abs(dy))*m*front;
 let canthus=gauss(vec2f((abs(u)-.99)/.095,ey/.024))*front;
 let crease=lid*(exp(-sq((ey-top-.067)/.010))*.21+exp(-sq((ey+bot+.076)/.014))*.12);
 let occlusion=clamp(1.-.77*nostril-.62*slit-.32*canthus-upperShade-crease,.15,1.);
 let wrap=clamp((nl+.12)/1.12,0.,1.);
 let lightCol=vec3f(1.03,.99,.91);
 var col=albedo*(vec3f(.071,.079,.088)+1.31*lightCol*wrap+
                 vec3f(.15,.174,.22)*pow(max(dot(n,fill),0.),1.4))*occlusion;
 col+=vec3f(.048,.035,.025)*max(-n.y,0.)*(.40+.60*front)*(1.-.86*nostril);
 col+=lightCol*spec*.135*mix(.73,1.22,lip)*occlusion;
 col+=vec3f(.86,.78,.59)*pow(max(dot(n,rim),0.),2.8)*(.18+.31*pow(1.-nv,2.));
 // A thin, warm terminator remains on the backlit pinna and around the nostrils.
 col+=vec3f(.095,.041,.018)*smoothstep(-.34,-.02,nl)*(1.-smoothstep(-.02,.32,nl))*
       (select(.22,.95,i.part==1u)+.40*nostril);
 let trace=front*gauss(vec2f((a-.475)/.102,(p.y-.015)/.095));
 let furrow=(.5+.5*cos(141.*(p.y+.14*(a-.35)) + 3.2*vnoise3(p*24.)));
 col*=1.-.035*trace*pow(furrow,8.)*fine;
 let lateral=smoothstep(.036,.11,a-.40)*(1.-smoothstep(.13,.25,a-.40));
 let wrinkleJitter=.006*(vnoise3(p*32.)-.5);
 var creases=0.;
 for(var j=0;j<3;j++){
   let k=f32(j);let path=.128-.029*k+(.09-.22*k)*(a-.41)+wrinkleJitter;
   creases+=exp(-sq((p.y-path)/(.0037+.001*k)))*lateral;
 }
 let forehead=gauss(vec2f((a-.23)/.25,(p.y-.61)/.16));
 let foreheadLine=fract((p.y+.044*a*a+.016*vnoise3(p*11.))*22.);
 creases+=.24*exp(-sq((foreheadLine-.46)/.09))*forehead;
 let poreZone=.42+.58*gauss(vec2f((a-.34)/.30,(p.y+.028)/.26));
 let dermis=follicles(p.xy*84.+.29*vec2f(vnoise3(p*19.),vnoise3(p*17.+4.7)));
 let partial=1.-smoothstep(.012,.025,length(fwidth(p.xy)));
 let mottling=(vnoise3(p*62.)-.5)*.077+(vnoise3(p*133.+vec3f(.4,.7,.2))-.5)*.050;
 col*=1.+mottling*(.34+.66*poreZone)*(1.-eye)-front*(1.-eye)*(.13*creases*fine+.16*dermis*partial*poreZone+.022*skinNoise);
 let nostrilHole=(1.-smoothstep(.53,1.16,length(nare)))*front;
 col=mix(col,vec3f(.025,.016,.010),nostrilHole*.81);
 let caress=gauss(vec2f((a-.127)/.049,(p.y+.299+.10*(a-.12))/.012))*front;
 col+=vec3f(.021,.018,.014)*caress*(.55+.45*max(nl,0.));
 if(i.part==1u){
   let e=a-.691;let ez=p.z+.055;let eu=.64*e-.768*ez;
   let bowl=gauss(vec2f((eu+.022)/.052,(p.y-.037)/.102));
   let meatus=gauss(vec2f((eu+.050)/.027,(p.y-.019)/.039));
   col*=vec3f(1.,.96,.90)*(1.-.37*bowl-.33*meatus);
 }
 let margin=lid*(1.-smoothstep(.002,.016,abs(eyeDist)))*.52;
 col*=1.-margin;
 let inner=smoothstep(-.001,.042,eyeDist);let tear=gauss(vec2f((u+.87)/.14,ey/.028));
 let cornea=normalize(turn(vec3f(sign(p.x)*u*.80,ey/.10,max(.32,1.-.41*u*u))));
 let eyeView=max(.0,dot(cornea,v));
 let transmitted=gauss(vec2f((u+.035)/.88,(ey+.003)/.077))*(.72+.28*eyeView);
 let upperLid=smoothstep(-.001,.056,top-ey);
 var pearl=mix(vec3f(.38,.33,.265),vec3f(.76,.77,.73),inner);
 pearl+=vec3f(.92,1.0,1.03)*transmitted*(.32+.68*upperLid)*inner;
 pearl+=vec3f(.34,.35,.35)*pow(max(dot(cornea,h),0.),33.);
 pearl=mix(pearl,vec3f(.52,.38,.291),tear*.55);
 let scatter=gauss(vec2f(u/.92,(ey+.018)/.094))*front;
 col+=vec3f(.035,.043,.048)*scatter*(1.-eye);
 col=mix(col,pearl,eye);
 let grain=(hash21(i.pos.xy)-.5)*.014;
 return vec4f(display(col)+grain,1.);
}`;

const SKY=FS_VS+`
struct Camera { yaw:f32,time:f32,aspect:f32,pad:f32};
@group(0) @binding(0) var<uniform> camera:Camera;
@fragment fn fs(@builtin(position) xy:vec4f)->@location(0) vec4f{
 let uv=xy.xy/vec2f(camera.pad*camera.aspect,camera.pad);
 let q=uv-vec2f(.37,.39);let haze=exp(-dot(q*vec2f(2.,1.5),q*vec2f(2.,1.5))*1.8);
 let c=mix(vec3f(.030,.044,.058),vec3f(.184,.199,.196),haze*.76);
 return vec4f(c,1.);
}`;

export async function create(canvas) {
  const adapter=await navigator.gpu.requestAdapter();
  if(!adapter)throw Error("WebGPU adapter unavailable");
  const device=await adapter.requestDevice(), ctx=canvas.getContext("webgpu");
  const format=navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({device,format,alphaMode:"opaque"});
  const {vertices,indices}=lightForm();
  const upload=(data,usage)=>{
    const b=device.createBuffer({size:data.byteLength,usage,mappedAtCreation:true});
    new data.constructor(b.getMappedRange()).set(data); b.unmap(); return b;
  };
  const vb=upload(vertices,GPUBufferUsage.VERTEX), ib=upload(indices,GPUBufferUsage.INDEX);
  const uniform=device.createBuffer({size:16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM});
  const depths=new Map();
  const getDepth=(w,h)=>{
    const key=w+"x"+h;if(!depths.has(key))depths.set(key,device.createTexture({size:[w,h],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT}));
    return depths.get(key).createView();
  };
  function pipe(code,skin){
    const mod=shader(device,code,skin?"淡金角膜与皮肤":"夜色");
    const p=device.createRenderPipeline({layout:"auto",
      vertex:{module:mod,entryPoint:"vs",buffers:skin?[{arrayStride:28,attributes:[
        {shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x3"},
        {shaderLocation:2,offset:24,format:"float32"}]}]:[]},
      fragment:{module:mod,entryPoint:"fs",targets:[{format}]},
      primitive:{topology:"triangle-list"},depthStencil:{format:"depth24plus",depthWriteEnabled:skin,depthCompare:skin?"less":"always"}});
    const g=device.createBindGroup({layout:p.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
    return [p,g];
  }
  const [face,faceBG]=pipe(SURFACE,true),[sky,skyBG]=pipe(SKY,false);
  return {
    draw(yaw,time){
      const w=canvas.width,h=canvas.height;
      device.queue.writeBuffer(uniform,0,new Float32Array([yaw,time,w/h,h]));
      const enc=device.createCommandEncoder();
      const pass=enc.beginRenderPass({colorAttachments:[{view:ctx.getCurrentTexture().createView(),clearValue:[0,0,0,1],loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{view:getDepth(w,h),depthLoadOp:"clear",depthClearValue:1,depthStoreOp:"store"}});
      pass.setPipeline(sky);pass.setBindGroup(0,skyBG);pass.draw(3);
      pass.setPipeline(face);pass.setBindGroup(0,faceBG);pass.setVertexBuffer(0,vb);pass.setIndexBuffer(ib,"uint32");pass.drawIndexed(indices.length);pass.end();
      device.queue.submit([enc.finish()]);
    },
    dispose(){device.destroy();}
  };
}
