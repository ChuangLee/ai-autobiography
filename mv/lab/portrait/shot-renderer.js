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
  const indexFormat=mesh.indices.BYTES_PER_ELEMENT===2?"uint16":"uint32";
  const overlayDepth={...depth,depthWriteEnabled:false,depthCompare:"always"};
  const drawRiver=link(shader(device,shot.night,"墨山与水岸"),hdrFormat,overlayDepth);
  const drawWake=link(shader(device,shot.water,"水线前的薄雾"),hdrFormat,overlayDepth,alpha);
  const drawBank=shot.bank ? link(shader(device,shot.bank,"岸上人"),hdrFormat,overlayDepth,alpha) : null;
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
  const params=new Float32Array(56),actorFrame=new Float32Array(24),streamFrame=new Float32Array(28);
  params.set([.6,85,.03,0,FIG.x,FIG.z,FIG.s,.3,0,MOUTH,1,.21,W,H,0,44.6],16);
  params[39]=.6;params.set([...walker,1],44);params[51]=1;
  actorFrame[19]=1;actorFrame[21]=1;
  streamFrame.set([ka,kb-ka+1,wa,wb-wa+1],24);

  function setBasis(index,vector,last){
    params[index]=-vector[0];params[index+1]=vector[1];params[index+2]=-vector[2];params[index+3]=last;
  }
  function writeFrame(cam,t){
    const [x,y,z]=cam.eye;
    params[0]=FIG.x-x*FIG.s;params[1]=(y-riverLevel)*FIG.s;params[2]=FIG.z-z*FIG.s;params[3]=t;
    setBasis(4,cam.r,Math.tan(cam.fov/2));setBasis(8,cam.up,W/H);setBasis(12,cam.f,1);
    params[50]=1-.70*sm(45.6,49.8,t);
    q.writeBuffer(U,0,params);
    if(t>44.9){
      actorFrame.set(cam.vp);actorFrame.set(cam.eye,16);actorFrame[20]=t;actorFrame[22]=0;
      q.writeBuffer(face,0,actorFrame);
      if(t<50.5){actorFrame[22]=1;q.writeBuffer(mirror,0,actorFrame);}
    }
    streamFrame.set(cam.vp);streamFrame.set(cam.r,16);streamFrame[19]=t;streamFrame.set(cam.up,20);
    q.writeBuffer(stream,0,streamFrame);
  }

  // The sky and mist ignore depth, so they can share the HDR pass with the
  // depth-tested actor and glyphs. The color is stored once after all layers.
  const stagePass={colorAttachments:[{view:post.hdr,loadOp:"clear",storeOp:"store",clearValue:[0,0,0,1]}],
    depthStencilAttachment:{view:post.depth,depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"discard"}};
  function drawStage(enc,t){
    const p=enc.beginRenderPass(stagePass);
    p.setPipeline(drawRiver);p.setBindGroup(0,ridge);p.draw(3);
    if(t>44.9){
      p.setPipeline(drawActor);p.setVertexBuffer(0,vertex);p.setIndexBuffer(index,indexFormat);
      if(t<50.5){p.setBindGroup(0,reflection);p.drawIndexed(mesh.indices.length);}
      p.setBindGroup(0,body);p.drawIndexed(mesh.indices.length);
    }
    p.setPipeline(drawFlow);p.setBindGroup(0,glyphs);p.draw(6,shot.flowCount);
    if(t<50.3){
      p.setPipeline(drawWake);p.setBindGroup(0,wake);p.draw(3);
      if(drawBank && t<49.){p.setPipeline(drawBank);p.setBindGroup(0,person);p.draw(3);}
    }
    p.end();
  }
  let windowScene;
  const still=new URLSearchParams(location.search).has("t");
  function prepareRoom(){
    if(windowScene)return;
    windowScene=createWindowScene(g,post,makeWindowText(device),atlas,!!shot.continueIntoWindows);
    if(shot.continueIntoWindows)windowScene.draw(62.1,room);
    windowScene.draw(55.92,room);
  }
  // Compile and draw the destination before the soundtrack can start. Preparing
  // it halfway through this short shot can skip the whole exchange of looks.
  if(!still){
    prepareRoom();
    await q.onSubmittedWorkDone();
  }
  return {draw(t){
    if(t>=53.)prepareRoom();
    if(shot.continueIntoWindows && t>=55.92){windowScene.draw(t);return;}
    const cam=shot.camera(t,W/H);
    writeFrame(cam,t);
    const enc=device.createCommandEncoder();
    drawStage(enc,t);
    const output=g.ctx.getCurrentTexture().createView();
    const inPortal=t>=shot.portalStart;
    post.run(enc,inPortal?stage:output,{...shot.finish,bars:1-sm(47.9,49.5,t),time:t});
    if(inPortal){
      q.writeBuffer(portal,0,shot.portalUniform(cam,t,W,H,glyphIndex));
      const p=enc.beginRenderPass({colorAttachments:[{view:output,loadOp:"clear",storeOp:"store",clearValue:[0,0,0,1]}]});
      p.setPipeline(drawPortal);p.setBindGroup(0,join);p.draw(3);p.end();
    }
    q.submit([enc.finish()]);
  }};
}
