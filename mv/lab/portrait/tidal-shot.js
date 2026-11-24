import {Post,shader,sm} from "../lib.js";
import {tidalCamera} from "./tidal-camera.js";
import {createTidalFigure,tidalFacePoint} from "./tidal-figure.js";
import {TIDAL_SEA,TIDAL_LETTERS,TIDAL_BOAT,TIDAL_MIST,TIDAL_CURRENTS} from "./tidal-ocean.js";
import {PORTAL} from "./cheek-portal.js";

const hdr="rgba16float",depth="depth32float",U=GPUTextureUsage;
const premultiplied={color:{srcFactor:"one",dstFactor:"one-minus-src-alpha"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha"}};
function uniform(device,size){
 return device.createBuffer({size,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
}
function group(device,pipeline,items){
 return device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:items.map((resource,binding)=>({binding,resource}))});
}
function pipeline(device,source,label,format,depthStencil,blend,topology="triangle-list"){
 const module=shader(device,source,label);
 return device.createRenderPipeline({label,layout:"auto",primitive:{topology},
   vertex:{module,entryPoint:"vs"},fragment:{module,entryPoint:"fs",targets:[{format,blend}]},depthStencil});
}
function colorPass(view,clear=[0,0,0,0]){
 return {colorAttachments:[{view,loadOp:"clear",storeOp:"store",clearValue:clear}]};
}
function depthPass(view,z){
 return {...colorPass(view),depthStencilAttachment:{view:z,depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"discard"}};
}
function vocabulary(info){
 const families=["cn-poem","cn-kai","cn-clerical","world-ancient","cn-oracle","word","cn-seal","world-modern"];
 const words=new Uint32Array(24*64);
 for(let lane=0;lane<24;lane++){
   const [lo,hi]=info.groupRanges[families[lane%families.length]],n=hi-lo+1;
   for(let i=0;i<64;i++)words[64*lane+i]=lo+(i+Math.floor(lane*7.39))%n;
 }
 return words;
}
export async function createTidalStage(g,atlas){
 const {device,W,H}=g,q=device.queue;
 const drawing=new URLSearchParams(location.search).get("figure")==="curves";
 const actor=await createTidalFigure(g,atlas,drawing);
 const {camera,portalUniform}=tidalCamera(tidalFacePoint,drawing);
 const buffer=uniform(device,144),data=new Float32Array(36);
 const sampler=device.createSampler({magFilter:"linear",minFilter:"linear"});
 const size=[Math.max(2,Math.ceil(W*.5)),Math.max(2,Math.ceil(H*.5))];
 const reflected=device.createTexture({size,format:hdr,usage:U.RENDER_ATTACHMENT|U.TEXTURE_BINDING}).createView();
 const mirrorDepth=device.createTexture({size,format:depth,usage:U.RENDER_ATTACHMENT}).createView();
 const sceneDepth=device.createTexture({size:[W,H],format:depth,usage:U.RENDER_ATTACHMENT}).createView();
 const solid={format:depth,depthWriteEnabled:true,depthCompare:"less"};
 const sea=pipeline(device,TIDAL_SEA,"月色与潮面",hdr,{...solid,depthCompare:"always"});
 const flow=pipeline(device,TIDAL_LETTERS,"字海",hdr,{...solid,depthWriteEnabled:false},premultiplied,"triangle-strip");
 const boat=pipeline(device,TIDAL_BOAT,"浪谷里的木舟",hdr,solid);
 const threads=pipeline(device,TIDAL_CURRENTS,"刻入浪面的细流",hdr,{...solid,depthWriteEnabled:false},premultiplied,"triangle-strip");
 const mist=pipeline(device,TIDAL_MIST,"水汽聚散",hdr,{...solid,depthCompare:"always",depthWriteEnabled:false},premultiplied);
 const words=vocabulary(atlas.info);
 const text=device.createBuffer({size:words.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
 q.writeBuffer(text,0,words);
 const uniforms={buffer};
 const ocean=group(device,sea,[uniforms,reflected,sampler]);
 const glyphs=group(device,flow,[uniforms,atlas.tex.createView(),atlas.sampler,{buffer:text}]);
 const vessel=group(device,boat,[uniforms]);
 const strands=group(device,threads,[uniforms]),spray=group(device,mist,[uniforms]);
 const reflectionPass=depthPass(reflected,mirrorDepth);
 data[27]=W/H;data[32]=W;data[33]=H;
 function draw(enc,targetView,t){
   const cam=camera(t,W/H);
   data.set(cam.vp);data.set(cam.eye,16);data[19]=t;
   data.set(cam.r,20);data[23]=Math.tan(cam.fov/2);data.set(cam.up,24);
   data.set(cam.f,28);q.writeBuffer(buffer,0,data);
   // Render the real figure behind the mirrored plane. The sea samples its
   // premultiplied result with the slope of this particular moving wave.
   if(t<53.58){
     const mirror=enc.beginRenderPass(reflectionPass);actor.draw(mirror,cam,t,true);mirror.end();
   }
   const pass=enc.beginRenderPass(depthPass(targetView,sceneDepth));
   pass.setPipeline(sea);pass.setBindGroup(0,ocean);pass.draw(3);
   actor.draw(pass,cam,t,false);
   pass.setPipeline(threads);pass.setBindGroup(0,strands);pass.draw(226,48);
   pass.setPipeline(flow);pass.setBindGroup(0,glyphs);pass.draw(4,words.length);
   if(t<53.60){pass.setPipeline(mist);pass.setBindGroup(0,spray);pass.draw(3);}
   if(t<52.9){pass.setPipeline(boat);pass.setBindGroup(0,vessel);pass.draw(18*2*4*6);}
   pass.end();return cam;
 }
 return {draw,portalUniform};
}

export async function createTidalShot(g,atlas){
 // Resolve the destination before synchronous pipeline compilation can stall
 // module loading on software adapters. Prelude creates just the stage above.
 const {createWindowScene,makeWindowText}=await import("../windows/scene.js");
 const {device,W,H,format}=g,q=device.queue,post=new Post(g);
 const stage=await createTidalStage(g,atlas);
 const portal=pipeline(device,PORTAL,"字的内白接到窗内",format);
 const makeView=()=>device.createTexture({size:[W,H],format,usage:U.RENDER_ATTACHMENT|U.TEXTURE_BINDING}).createView();
 const picture=makeView(),windowView=makeView(),hand=uniform(device,64);
 const lin=device.createSampler({minFilter:"linear",magFilter:"linear"});
 const transfer=group(device,portal,[{buffer:hand},lin,picture,windowView,atlas.tex.createView()]);
 const glyph=atlas.info.glyphs.find(x=>x.group==="cn-kai"&&x.text==="口").i;
 const params=new URLSearchParams(location.search),continueFilm=params.has("film");
 let room;
 function prepareRoom(){
   if(room)return;
   room=createWindowScene(g,post,makeWindowText(device),atlas,continueFilm);
   if(continueFilm)room.draw(62.1,windowView);
   room.draw(55.92,windowView);
 }
 if(!params.has("t")){prepareRoom();await q.onSubmittedWorkDone();}
 return {draw(t){
   if(t>=52.15)prepareRoom();
   if(continueFilm&&t>=55.92){room.draw(t);return;}
   const enc=device.createCommandEncoder(),cam=stage.draw(enc,post.hdr,t),end=t>=52.15;
   const out=g.ctx.getCurrentTexture().createView();
   post.run(enc,end?picture:out,{bloom:.22,threshold:.82,knee:.29,exposure:.95,tonemap:.81,grain:.009,
      vignette:.19,bars:1-sm(44.58,46.70,t),time:t});
   if(end){
     q.writeBuffer(hand,0,stage.portalUniform(cam,t,W,H,glyph));
     const p=enc.beginRenderPass(colorPass(out));p.setPipeline(portal);p.setBindGroup(0,transfer);p.draw(3);p.end();
   }
   q.submit([enc.finish()]);
 }};
}
