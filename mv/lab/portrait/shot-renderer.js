import { Post, shader, sm } from "../lib.js";
import { FIG, MOUTH, buildWorld, cxf } from "../river/world.js";
import { createWindowScene, makeWindowText } from "../windows/scene.js";
import { chestPoint } from "./planes-mesh.js";
import { planesInscription } from "./planes.js";

const riverLevel=-1.78, walker=[cxf(192)-16.5,0,192];
export async function createPortraitShot(g,atlas,shot){
  const {device,W,H,format}=g,q=device.queue;
  const post=new Post(g),hdrFormat="rgba16float";
  const makeUniform=size=>device.createBuffer({size,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const group=(pipeline,resources)=>device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:resources.map((resource,binding)=>({binding,resource}))});
  const tex=()=>device.createTexture({size:[W,H],format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}).createView();
  const link=(module,fmt,depthStencil,blend,buffers=[])=>device.createRenderPipeline({layout:"auto",vertex:{module,entryPoint:"vs",buffers},fragment:{module,entryPoint:"fs",targets:[{format:fmt,blend}]},depthStencil});
  const alpha={color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha"}};
  const stage=tex(),room=tex(),mesh=shot.makeMesh(),ink=await planesInscription(device);
  const lin=device.createSampler({minFilter:"linear",magFilter:"linear"});

  function uploadTexture(data){
    const texture=device.createTexture({size:[64,256],format:"rgba8unorm",usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING});
    q.writeTexture({texture},data,{bytesPerRow:256},[64,256]);return texture.createView();
  }
  function upload(data,usage){
    const buffer=device.createBuffer({size:data.byteLength,usage:GPUBufferUsage.COPY_DST|usage});
    q.writeBuffer(buffer,0,data);return buffer;
  }
  const chest=device.createTexture({size:[128,128],format:"rgba32float",usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING});
  const surface=new Float32Array(128*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++)surface.set((shot.chest ?? chestPoint)(x/127,-1.78+.86*y/127),(128*y+x)*4);
  q.writeTexture({texture:chest},surface,{bytesPerRow:128*16},[128,128]);
  const depth={format:"depth32float",depthWriteEnabled:true,depthCompare:"less"};
  const vertex=upload(mesh.vertices,GPUBufferUsage.VERTEX),index=upload(mesh.indices,GPUBufferUsage.INDEX);
  const drawRiver=link(shader(device,shot.night,"墨山与水岸"),hdrFormat);
  const drawWake=link(shader(device,shot.water,"水线前的薄雾"),hdrFormat,undefined,alpha);
  const drawBank=shot.bank ? link(shader(device,shot.bank,"岸上人"),hdrFormat,undefined,alpha) : null;
  const attributes=[
    {shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x3"}
  ];
  if(shot.detailView){
    attributes.push({shaderLocation:3,offset:24,format:"float32"},{shaderLocation:5,offset:28,format:"float32x2"},{shaderLocation:6,offset:36,format:"float32x2"});
  }else{
    attributes.push({shaderLocation:2,offset:24,format:"float32x2"},{shaderLocation:3,offset:32,format:"float32"},{shaderLocation:4,offset:36,format:"float32"});
  }
  const drawActor=link(shader(device,shot.paint,"汇聚成人"),hdrFormat,depth,alpha,[{arrayStride:mesh.stride??40,attributes}]);
  const drawFlow=link(shader(device,shot.flow,"河与锁骨上的文字"),hdrFormat,{...depth,depthWriteEnabled:false},alpha);
  const drawPortal=link(shader(device,shot.portal,"肩上的口"),format);
  const U=makeUniform(224),face=makeUniform(96),mirror=makeUniform(96),stream=makeUniform(112),portal=makeUniform(shot.portalSize);
  const atlasView=atlas.tex.createView(), backResources=[{buffer:U}];
  if(shot.bank){
    const world=buildWorld(64,256,atlas.info);
    backResources.push(lin,uploadTexture(world.field),uploadTexture(world.deco),atlas.sampler,atlasView);
  }
  const ridge=group(drawRiver,backResources);
  const wake=group(drawWake,[{buffer:U}]);
  const skinResources=[ink.createView(),lin];
  if(shot.detailView)skinResources.push(shot.detailView,device.createSampler({minFilter:"linear",magFilter:"linear",mipmapFilter:"linear"}));
  const person=drawBank && group(drawBank,[{buffer:U}]),body=group(drawActor,[{buffer:face},...skinResources]);
  const reflection=group(drawActor,[{buffer:mirror},...skinResources]);
  const glyphs=group(drawFlow,[{buffer:stream},atlasView,atlas.sampler,chest.createView()]),join=group(drawPortal,[{buffer:portal},lin,stage,room,atlasView]);
  const glyphIndex=atlas.info.glyphs.find(x=>x.group==="cn-kai"&&x.text==="口").i;
  const [ka,kb]=atlas.info.groupRanges["cn-kai"],[wa,wb]=atlas.info.groupRanges["world-ancient"];
  const basis=v=>[-v[0],v[1],-v[2]],params=new Float32Array(56);
  let roomReady=false;
  const still=new URLSearchParams(location.search).has("t");
  function prepareRoom(){
    if(roomReady)return;
    const windowScene=createWindowScene(g,post,makeWindowText(device),atlas,false);
    windowScene.draw(55.92,room);roomReady=true;
  }
  // Compile and draw the destination before the soundtrack can start. Preparing
  // it halfway through this short shot can skip the whole exchange of looks.
  if(!still){
    prepareRoom();
    await q.onSubmittedWorkDone();
  }
  return {draw(t){
    if(t>=53.)prepareRoom();
    const cam=shot.camera(t,W/H),[x,y,z]=cam.eye;
    params.set([FIG.x-x*FIG.s,(y-riverLevel)*FIG.s,FIG.z-z*FIG.s,t],0);
    params.set([...basis(cam.r),Math.tan(cam.fov/2),...basis(cam.up),W/H,...basis(cam.f),1],4);
    params.set([.6,85,.03,0,FIG.x,FIG.z,FIG.s,.3,0,MOUTH,1,.21,W,H,0,44.6],16);
    params[39]=.6;params.set([...walker,1],44);params[50]=1-.70*sm(45.6,49.8,t);params[51]=1;
    q.writeBuffer(U,0,params);
    q.writeBuffer(face,0,new Float32Array([...cam.vp,...cam.eye,1,t,1,0,0]));
    q.writeBuffer(mirror,0,new Float32Array([...cam.vp,...cam.eye,1,t,1,1,0]));
    q.writeBuffer(stream,0,new Float32Array([...cam.vp,...cam.r,t,...cam.up,0,ka,kb-ka+1,wa,wb-wa+1]));
    q.writeBuffer(portal,0,shot.portalUniform(cam,t,W,H,glyphIndex));
    const enc=device.createCommandEncoder();
    const pass=(view,loadOp,withDepth=false)=>enc.beginRenderPass({colorAttachments:[{view,loadOp,storeOp:"store",clearValue:[0,0,0,1]}],...(withDepth?{depthStencilAttachment:{view:post.depth,depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"discard"}}:{})});
    let p=pass(post.hdr,"clear");
    p.setPipeline(drawRiver);p.setBindGroup(0,ridge);p.draw(3);p.end();
    p=pass(post.hdr,"load",true);
    if(t>44.9){p.setPipeline(drawActor);p.setVertexBuffer(0,vertex);p.setIndexBuffer(index,"uint32");if(t<50.5){p.setBindGroup(0,reflection);p.drawIndexed(mesh.indices.length);}p.setBindGroup(0,body);p.drawIndexed(mesh.indices.length);}
    p.setPipeline(drawFlow);p.setBindGroup(0,glyphs);p.draw(6,shot.flowCount);p.end();
    if(t<50.3){
      p=pass(post.hdr,"load");p.setPipeline(drawWake);p.setBindGroup(0,wake);p.draw(3);
      if(drawBank && t<49.){p.setPipeline(drawBank);p.setBindGroup(0,person);p.draw(3);}
      p.end();
    }
    post.run(enc,stage,{...shot.finish,bars:1-sm(47.9,49.5,t),time:t});
    p=pass(g.ctx.getCurrentTexture().createView(),"clear");p.setPipeline(drawPortal);p.setBindGroup(0,join);p.draw(3);p.end();
    q.submit([enc.finish()]);
  }};
}
