import {outlines} from "./inscription.js";
import {makePlanesMesh} from "./planes-mesh.js";
import {M4,NOISE,FS_VS,shader} from "../lib.js";

export const planesPose = `
fn figurePose(v:vec3f, y:f32, t:f32, point:f32)->vec3f{
  let head=smoothstep(-1.58,-.86,y);
  let pitch=(.17-.27*smoothstep(48.95,51.15,t))*head;
  let yaw=(-.11+.31*smoothstep(49.10,51.26,t))*head+.46*smoothstep(51.9,53.92,t);
  let pivot=vec3f(0.,-.88,-.13);
  let q=v-pivot*point;
  let r=vec3f(q.x,cos(pitch)*q.y-sin(pitch)*q.z,sin(pitch)*q.y+cos(pitch)*q.z);
  return vec3f(cos(yaw)*r.x+sin(yaw)*r.z,r.y,-sin(yaw)*r.x+cos(yaw)*r.z)+pivot*point;
}`;
export const planesPaint=NOISE+planesPose+`
struct Scene { vp:mat4x4f, eye:vec4f, frame:vec4f }
@group(0)@binding(0) var<uniform> scene:Scene;
@group(0)@binding(1) var ink:texture_2d<f32>;
@group(0)@binding(2) var smp:sampler;
struct V { @builtin(position) position:vec4f, @location(0) p:vec3f, @location(1) nor:vec3f, @location(2) uv:vec2f, @location(3) @interpolate(flat) mat:u32 }
@vertex fn vs(@location(0) p:vec3f,@location(1) n:vec3f,@location(2) uv:vec2f,@location(3) m:f32)->V{
  var wp=p;var normal=n;
  if(scene.frame.y>.5){
    let close=1.-smoothstep(49.0,50.7,scene.frame.x);
    let arc=pow(max(0.,sin(3.141593*uv.x)),.78);
    if(m==5.){wp.y-=close*.091*arc*(1.-uv.y);}
    if(m==3.||m==4.){wp.y-=close*.09*arc*uv.y;}
    wp=figurePose(wp,p.y,scene.frame.x,1.);normal=figurePose(n,p.y,scene.frame.x,0.);
    if(scene.frame.z>.5){
      wp.y=-3.56-wp.y;wp.x+=.012*sin(wp.y*148.+scene.frame.x*1.7)+.019*sin(wp.y*36.-scene.frame.x);
    }
  }
  var o:V; o.position=scene.vp*vec4f(wp,1.);o.p=p;o.nor=normal;o.uv=uv;o.mat=u32(m+.5);return o; }
fn stain(x:f32,w:f32)->f32{return exp(-min(35.,(x/w)*(x/w)));}
fn wash(p:vec2f,w:vec2f)->f32{return exp(-min(35.,dot(p/w,p/w)));}
fn bellForehead(ax:f32)->f32{return smoothstep(0.,.34,ax);}
fn curve(u:f32)->f32{return .071+.027*u;}
fn lettering(q:vec2f,row:f32)->f32{
  let local=clamp(q,vec2f(0.),vec2f(.9999));
  let letters=textureSampleLevel(ink,smp,vec2f(local.x,(local.y+row)/2.),0.).r;
  let border=min(min(q.x,1.-q.x),min(q.y,1.-q.y));
  return letters*smoothstep(0.,.007,border);}
@fragment fn fs(i:V)->@location(0) vec4f{
  let p=i.p;
  let shot=scene.frame.y>.5;let reveal=smoothstep(44.90,49.15,scene.frame.x);
  let coarse=fbm(p.xy*vec2f(2.,4.)+p.zy*vec2f(3.,2.));
  let filament=fbm(p.xy*vec2f(27.,14.)+p.z*7.);
  let threshold=.08+.25*smoothstep(-1.8,1.1,p.y)+.50*coarse+.22*filament;
  let density=smoothstep(threshold-.26,threshold+.16,reveal);
  if(shot&&(density<.015||p.y< -1.78+.019*sin(p.x*12.+scene.frame.x*.81))){discard;}
  let ax=abs(p.x);let n=normalize(i.nor);let eye=normalize(scene.eye.xyz-p);
  let l=normalize(vec3f(-.66,.66,.63));let light=dot(n,l);
  let facing=clamp(dot(n,eye),0.,1.);
  let wrap=smoothstep(-.52,.86,light);
  let horizon=normalize(vec3f(.83,.19,-.58));
  let edge=pow(max(0.,dot(horizon,n)),3.);
  let bone=vec3f(.73,.61,.412);
  let halfVector=normalize(eye+l);
  let reflection=.066*pow(max(dot(n,halfVector),0.),12.)+.044*pow(max(dot(n,halfVector),0.),39.);
  let reflected=vec3f(.118,.126,.138)*(.5+.5*max(-n.y,0.));
  var c=mix(vec3f(.105,.081,.056)+reflected*.47,bone,wrap)*(.72+.28*max(dot(n,l),0.));
  c+=vec3f(.29,.39,.44)*edge*.52+vec3f(1.,.81,.51)*reflection;
  c+=vec3f(.50,.41,.26)*pow(1.-facing,3.8)*(.16+.52*max(0.,n.y));
  let front=smoothstep(.02,.35,p.z);
  if(i.mat==1u){
    let xx=ax-.302;let yy=p.y-.08;let side=sign(p.x);
    let eyeBed=wash(vec2f(xx,yy-.10*xx),vec2f(.205,.095));
    let temple=wash(vec2f(ax-.60,p.y-.20),vec2f(.108,.19));
    let muzzle=wash(vec2f(ax-.086,p.y+.395),vec2f(.121,.084));
    let browY=.242+.059*stain(ax-.30,.185)-.05*smoothstep(.37,.55,ax)-side*.006;
    let browWidth=.033-.016*smoothstep(.23,.53,ax);
    let browBody=stain(p.y-browY+.033,browWidth)*stain((ax-.297),.206)*smoothstep(.091,.164,ax);
    let cut=vnoise(vec2f(ax*180.+p.y*116.,p.y*63.));
    let brow=browBody*(.42+.28*cut);
    let crease=stain(p.y-(curve(clamp((ax-.148)/.316,0.,1.))+.089*stain(xx,.143)+.007*side),.0065)*stain(xx,.133);
    let nostril=wash(vec2f(ax-.096,(p.y+.273)+.22*(ax-.096)),vec2f(.042,.014));
    let underEye=stain(p.y-(.006+.10*xx-.015*stain(xx,.13)) ,.025)*stain(xx,.176);
    let nasolabial=stain(ax-(.153+.52*smoothstep(.23,.62,-p.y)*.195),.013)*stain(p.y+.407,.109);
    let philtrum=wash(vec2f(p.x,p.y+.375),vec2f(.026,.058));
    let cheek=wash(vec2f(ax-.432,p.y+.081-.33*(ax-.432)),vec2f(.142,.058));
    c*=1.-front*(.43*eyeBed+.07*underEye+.105*temple+.72*brow+.22*crease+.085*nasolabial+.08*philtrum);
    c=mix(c,c*vec3f(.32,.20,.14),nostril*.94*front);
    c+=vec3f(.079,.041,.012)*cheek*front*wrap;
    c=mix(c,c*vec3f(1.03,.94,.86),muzzle*front*.58);
    // The inscriptions follow the side of the cranium, leaving the frontal planes clear.
    let angle=atan2(p.x,p.z+.11);
    let turn=(abs(angle)-.99)/.73;
    let chars=lettering(vec2f(turn,(.60+.048*sin(turn*3.)-p.y)/.070),0.);
    if(!shot){c=mix(c,vec3f(.87,.66,.33),chars*.27*front*(.37+.63*wrap));}
  }else if(i.mat==3u||i.mat==4u){
    let side=select(-1.,1.,i.mat==3u);
    let centre=vec2f(side*.307-.012,.099+.007*side);
    let off=p.xy-centre;
    let rad=length(off*vec2f(.99,1.));
    // The translucent lens has a soft centre and limbus. Its intact upper and
    // lower lids give the gaze direction without a separately painted pupil.
    let core=exp(-dot(off/vec2f(.063,.048),off/vec2f(.063,.048)));
    let limbus=smoothstep(.06,.14,rad);
    let lid=abs(i.uv.y-.52)*2.;
    let corners=pow(abs(i.uv.x*2.-1.),3.);
    let underLid=.94-.18*smoothstep(.62,1.,i.uv.y)-.17*smoothstep(.58,1.,lid)-.18*corners;
    c=mix(vec3f(.66,.643,.52),vec3f(1.,.98,.85),core*.79+.16)*underLid;
    c=mix(c,vec3f(.49,.458,.36),limbus*.30);
    c+=vec3f(.22,.21,.181)*wash(off-vec2f(-.012,.009),vec2f(.042,.029));
    if(shot){
      let shut=(1.-smoothstep(49.08,50.84,scene.frame.x))*.93;
      let edgeY=1.-shut;
      let eyelid=smoothstep(edgeY-.036,edgeY+.04,i.uv.y);
      let warmLid=mix(vec3f(.092,.078,.069),vec3f(.43,.36,.29),wrap);
      c=mix(c,warmLid*(1.-.61*stain(i.uv.y-edgeY,.064)),eyelid);
    }
  }else if(i.mat==5u||i.mat==6u){
    let upper=i.mat==5u;let arc=pow(max(0.,sin(3.14159*i.uv.x)),.7);
    let k=mix(.77,.07,smoothstep(.18,.96,i.uv.y))*arc;
    c=mix(c,c*vec3f(.45,.36,.26),k);
    c*=1.-arc*(1.-smoothstep(0.,.32,i.uv.y))*select(.47,.65,upper);
    let margin=(1.-smoothstep(.0,.13,i.uv.y))*arc;
    c=mix(c,vec3f(.095,.071,.047),margin*.69);
    let fold=stain(i.uv.y-.73,.11)*arc*select(.13,.30,upper);
    c=mix(c,c*vec3f(.55,.40,.32),fold);
  }else if(i.mat==8u||i.mat==9u){
    let top=i.mat==8u;let centre=sin(3.14159*i.uv.x);
    let flushed=select(vec3f(1.,.91,.83),vec3f(.91,.77,.68),top);
    c=mix(c,c*flushed,centre*(1.-smoothstep(.64,1.,i.uv.y)));
    c=mix(c,c*vec3f(.26,.19,.16),(1.-smoothstep(.015,.19,i.uv.y))*centre);
    c+=vec3f(.062,.036,.014)*stain(i.uv.y-.56,.18)*centre*select(1.,.18,top);
  }else if(i.mat==7u){
    c*=.64+.36*smoothstep(.20,.85,i.uv.y);
  }else{
    let q=vec2f((p.x-.12)/.66,(-1.385+.104*sin((p.x-.1)*2.4)-p.y)/.075);
    c=mix(c,vec3f(.64,.49,.29),lettering(q,1.)*front*.43);
    let jawShadow=(1.-smoothstep(.0,.40,-p.y-.75))*(1.-smoothstep(.31,.50,ax));
    c*=1.-.35*jawShadow*front;
  }
  let tissue=fbm(p.xz*23.+p.xy*vec2f(6.,32.))-.5;
  let pore=vnoise3(p*246.+.18*vnoise3(p*54.));
  let freckles=smoothstep(.61,.85,pore);
  let surface=select(1.,.09,i.mat==3u||i.mat==4u);
  c*=1.+surface*(.100*tissue-.060*freckles+.023*(vnoise3(p*114.)-.45));
  if(i.mat==1u){
    let forehead=stain(ax,.42);let curve=p.y-.038*bellForehead(ax);
    let rest=stain(curve-.46,.009)+.65*stain(curve-.575,.008);
    c*=1.-front*forehead*rest*.056;
  }
  let brush=vnoise(p.xy*vec2f(108.,190.)+p.z*63.)-.5;
  let tooth=vnoise((p.xy+vec2f(p.z*.22,0.))*387.)-.5;
  c*=1.+(.024*brush+.015*tooth);
  let glaze=mix(c, vec3f(dot(c,vec3f(.27,.64,.09))),.09);
  if(shot){
    let wetLine=-1.74+.145*sin(p.x*2.28+.54)+.047*sin(p.x*5.2+scene.frame.x*.40)+.095*(filament-.5);
    let water=smoothstep(wetLine-.12,wetLine+.19,p.y);
    let pigment=pow(density,1.44)*water;
    let seen=smoothstep(.22,.98,density)*mix(.3,1.,water);
    let night=mix(vec3f(.016,.019,.023),vec3f(.31,.285,.24),smoothstep(44.9,49.7,scene.frame.x));
    let rip=fbm(p.xz*vec2f(19.,6.)+p.xy*vec2f(4.,22.));
    let sheen=.07*(1.-seen)*smoothstep(.43,.72,rip);
    let lit=dot(n,normalize(vec3f(-.76,.54,.38)))*.5+.5;
    let lateral=vec3f(.23,.25,.28)+vec3f(.87,.73,.575)*smoothstep(.12,.83,lit);
    let orbit=wash(vec2f(ax-.30,p.y-.106),vec2f(.202,.087))*front;
    let skinTag=i.mat!=3u&&i.mat!=4u;
    let rim=pow(1.-facing,2.4)*(.13+.30*max(n.x,0.));
    let value=dot(glaze,vec3f(.24,.65,.11));
    let ivory=mix(glaze,value*vec3f(1.08,1.025,.951),.61);
    var portrait=ivory*(night+vec3f(.39,.395,.40))*lateral;
    if(skinTag){
      portrait*=1.-orbit*.46;
      portrait+=(vec3f(.51,.48,.41)*rim)*smoothstep(.10,.86,lit+.36);
    }else{
      let lens=wash(vec2f(ax-.29,p.y-.089),vec2f(.079,.041));
      portrait=mix(vec3f(.35,.34,.26),vec3f(1.11,1.08,.90),lens);
    }
    let wetSurface=mix(night*.16,portrait,seen)+vec3f(.70,.66,.51)*sheen;
    if(scene.frame.z>.5){
      let ripple=.42+.58*smoothstep(.22,.76,vnoise(p.xy*vec2f(8.,63.)+scene.frame.x*.39));
      return vec4f(wetSurface*vec3f(.42,.48,.52),.33*pigment*ripple);
    }
    let atmospheric=mix(.84,1.,smoothstep(48.8,50.1,scene.frame.x));
    return vec4f(wetSurface,pigment*atmospheric);
  }
  return vec4f(pow(max(glaze,vec3f(.0001)),vec3f(.66)),1.);
}
`;
const ground=FS_VS+NOISE+`
@group(0)@binding(0) var<uniform> size:vec4f;
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let p=fc.xy/size.xy;let haze=exp(-dot((p-vec2f(.39,.415))*vec2f(1.42,1.23),(p-vec2f(.39,.415))*vec2f(1.42,1.23))*3.7);
  let c=mix(vec3f(.027,.034,.041),vec3f(.153,.180,.185),haze*.76);
  let grain=.012*(hash21(floor(fc.xy))-.5)+.014*(fbm(p*16.)-.5);
  return vec4f(c+grain,1.);}
`;
export async function planesInscription(device) {
  const plate=new OffscreenCanvas(768,208),ctx=plate.getContext("2d");
  ctx.fillStyle="black";ctx.fillRect(0,0,768,208);ctx.fillStyle="white";
  const scale=.076;
  // Lay out the same 76px calligraphy without waiting on a second font request.
  ["河水不回答","从此流着汇聚成我"].forEach((line,row)=>{
    [...line].forEach((char,index)=>{
      const x=(index+.5)*768/line.length-500*scale, y=row*104+55+336*scale;
      ctx.setTransform(scale,0,0,-scale,x,y);
      ctx.fill(new Path2D(outlines[char]));
    });
  });
  const tex=device.createTexture({size:[768,208],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
  device.queue.copyExternalImageToTexture({source:plate},{texture:tex},[768,208]);return tex;
}
export async function create(canvas){
  const adapter=await navigator.gpu?.requestAdapter();if(!adapter)throw Error("头像研究需要 WebGPU");
  const device=await adapter.requestDevice();
  const context=canvas.getContext("webgpu"),format=navigator.gpu.getPreferredCanvasFormat();
  context.configure({device,format,alphaMode:"opaque"});
  const M=shader(device,planesPaint,"青金骨相"), B=shader(device,ground,"雕塑底色");
  const geometry=makePlanesMesh();
  function storage(data,usage){const buf=device.createBuffer({size:data.byteLength,usage:usage|GPUBufferUsage.COPY_DST});device.queue.writeBuffer(buf,0,data);return buf;}
  const vb=storage(geometry.vertices,GPUBufferUsage.VERTEX), ib=storage(geometry.indices,GPUBufferUsage.INDEX);
  const u=device.createBuffer({size:96,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const res=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const multisample={count:4}, depthStencil={format:"depth24plus",depthWriteEnabled:true,depthCompare:"less"};
  const main=device.createRenderPipeline({layout:"auto",vertex:{module:M,entryPoint:"vs",buffers:[{arrayStride:40,
    attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x3"},{shaderLocation:2,offset:24,format:"float32x2"},{shaderLocation:3,offset:32,format:"float32"}]}]},
    fragment:{module:M,entryPoint:"fs",targets:[{format}]},depthStencil,multisample});
  const background=device.createRenderPipeline({layout:"auto",vertex:{module:B,entryPoint:"vs"},
    fragment:{module:B,entryPoint:"fs",targets:[{format}]},depthStencil:{...depthStencil,depthWriteEnabled:false,depthCompare:"always"},multisample});
  const atlas=await planesInscription(device), sampler=device.createSampler({minFilter:"linear",magFilter:"linear"});
  const bind=(p,resources)=>device.createBindGroup({layout:p.getBindGroupLayout(0),entries:resources.map((resource,binding)=>({resource,binding}))});
  const group=bind(main,[{buffer:u},atlas.createView(),sampler]), backdrop=bind(background,[{buffer:res}]);
  const makeTex=fmt=>device.createTexture({size:[canvas.width,canvas.height],sampleCount:4,format:fmt,usage:GPUTextureUsage.RENDER_ATTACHMENT}).createView();
  let width=0,height=0,color,depth;
  return {draw(yaw,time){
    if(width!==canvas.width||height!==canvas.height){width=canvas.width;height=canvas.height;color=makeTex(format);depth=makeTex("depth24plus");device.queue.writeBuffer(res,0,new Float32Array([width,height,0,0]));}
    const camera=[4.7*Math.sin(yaw),.185,4.7*Math.cos(yaw)], target=[0,-.327,0];
    const vp=M4.mul(M4.persp(.665,width/height,.1,16),M4.look(camera,target));
    device.queue.writeBuffer(u,0,new Float32Array([...vp,...camera,1,time,0,0,0]));
    const enc=device.createCommandEncoder(), pass=enc.beginRenderPass({colorAttachments:[{view:color,resolveTarget:context.getCurrentTexture().createView(),loadOp:"clear",storeOp:"discard",clearValue:[0,0,0,1]}],
      depthStencilAttachment:{view:depth,depthLoadOp:"clear",depthStoreOp:"discard",depthClearValue:1}});
    pass.setPipeline(background);pass.setBindGroup(0,backdrop);pass.draw(3);
    pass.setPipeline(main);pass.setBindGroup(0,group);pass.setVertexBuffer(0,vb);pass.setIndexBuffer(ib,"uint32");pass.drawIndexed(geometry.indices.length);
    pass.end();device.queue.submit([enc.finish()]);return device.queue.onSubmittedWorkDone();
  },done:()=>device.queue.onSubmittedWorkDone(),dispose:()=>device.destroy()};
}
