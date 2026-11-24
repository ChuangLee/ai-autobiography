import { mipTexture, shader } from '../lib.js';
import { sculpture } from './wash-model.js';
import { BACK, PORTRAIT } from './wash-paint.js';

export async function create(canvas) {
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  if(!adapter)throw new Error('水墨肖像需要 WebGPU。');
  const device=await adapter.requestDevice();
  const context=canvas.getContext('webgpu'),format=navigator.gpu.getPreferredCanvasFormat();
  context.configure({device,format,alphaMode:'opaque'});
  const response=await fetch(new URL('../../glyphs/atlas.png',import.meta.url));
  if(!response.ok)throw new Error('无法读取真字图集，HTTP '+response.status);
  // At this scale each printed character on the sheet is smaller than a 32-pixel type cell.
  const bitmap=await createImageBitmap(await response.blob(),{resizeWidth:1024,resizeHeight:1024,resizeQuality:'high',colorSpaceConversion:'none'});
  const texture=mipTexture(device,bitmap,'r8unorm');bitmap.close();
  const sampler=device.createSampler({magFilter:'linear',minFilter:'linear',mipmapFilter:'linear',lodMaxClamp:4});
  const uniform=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const bgl=device.createBindGroupLayout({entries:[
    {binding:0,visibility:3,buffer:{}},{binding:1,visibility:2,texture:{}},{binding:2,visibility:2,sampler:{}}
  ]});
  const binding=device.createBindGroup({layout:bgl,entries:[
    {binding:0,resource:{buffer:uniform}},{binding:1,resource:texture.createView()},{binding:2,resource:sampler}
  ]});
  const layout=device.createPipelineLayout({bindGroupLayouts:[bgl]});
  function pipeline(label,code,buffers,depthWriteEnabled){
    const module=shader(device,code,label);
    return device.createRenderPipelineAsync({label,layout,vertex:{module,entryPoint:'vs',buffers},
      fragment:{module,entryPoint:'fs',targets:[{format}]},multisample:{count:4},
      depthStencil:{format:'depth24plus',depthWriteEnabled,depthCompare:depthWriteEnabled?'less':'always'}});
  }
  const [background,portrait]=await Promise.all([
    pipeline('纸上字河',BACK,[],false),pipeline('淡金水墨肖像',PORTRAIT,[{arrayStride:28,attributes:[
      {shaderLocation:0,format:'float32x3',offset:0},{shaderLocation:1,format:'float32x3',offset:12},{shaderLocation:2,format:'float32',offset:24}
    ]}],true)
  ]);
  const mesh=sculpture();
  function buffer(data,usage){const buf=device.createBuffer({size:data.byteLength,usage,mappedAtCreation:true});
    new data.constructor(buf.getMappedRange()).set(data);buf.unmap();return buf;}
  const vb=buffer(mesh.vertices,GPUBufferUsage.VERTEX),ib=buffer(mesh.indices,GPUBufferUsage.INDEX),count=mesh.indices.length;
  let color,depth,w=0,h=0;
  return {draw(yaw,time){
    if(w!==canvas.width||h!==canvas.height){
      w=canvas.width;h=canvas.height;color?.destroy();depth?.destroy();
      const target=fmt=>device.createTexture({format:fmt,size:[w,h],sampleCount:4,usage:GPUTextureUsage.RENDER_ATTACHMENT});
      color=target(format);depth=target('depth24plus');
    }
    device.queue.writeBuffer(uniform,0,new Float32Array([w,h,yaw,time]));
    const enc=device.createCommandEncoder();const pass=enc.beginRenderPass({
      colorAttachments:[{view:color.createView(),resolveTarget:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'discard',clearValue:[.84,.82,.73,1]}],
      depthStencilAttachment:{view:depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'discard'}});
    pass.setBindGroup(0,binding);pass.setPipeline(background);pass.draw(3);
    pass.setPipeline(portrait);pass.setVertexBuffer(0,vb);pass.setIndexBuffer(ib,'uint32');pass.drawIndexed(count);pass.end();
    device.queue.submit([enc.finish()]);
    return device.queue.onSubmittedWorkDone();
  },dispose(){device.destroy();}};
}
