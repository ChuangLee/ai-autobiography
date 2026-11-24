import {loadTidalMesh} from "./tidal-loader.js";
import {shader} from "../lib.js";

// The turning study and the coda draw the same indexed surface. Only the
// fragment output changes: the painters need normals, the study needs light.
export async function createSurfaceStudy(device,format,studio){
  const mesh=await loadTidalMesh();
  function upload(array,usage){
    const buffer=device.createBuffer({size:array.byteLength,usage:usage|GPUBufferUsage.COPY_DST});
    device.queue.writeBuffer(buffer,0,array);
    return buffer;
  }
  const vertex=upload(mesh.vertices,GPUBufferUsage.VERTEX), index=upload(mesh.indices,GPUBufferUsage.INDEX);
  const frame=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const module=shader(device,`
    @group(0) @binding(0) var<uniform> f:vec4f;
    struct Varying{@builtin(position) clip:vec4f,@location(0) normal:vec3f}
    @vertex fn vs(@location(0)p:vec3f,@location(1)n:vec3f)->Varying{
      let side=vec3f(cos(f.x),0.,sin(f.x));let front=vec3f(-sin(f.x),0.,cos(f.x));
      var v:Varying;
      v.clip=vec4f(dot(side,p)/f.y,1.+2.*(p.y-f.z)/f.w,.52-dot(front,p)*.42,1.);
      v.normal=vec3f(dot(side,n),n.y,dot(front,n));return v;
    }
    @fragment fn fs(v:Varying)->@location(0)vec4f{
      let n=normalize(v.normal);
      ${studio ? `
      let key=max(0.,dot(n,normalize(vec3f(-.56,.72,.54))));
      let sky=.11+.11*(n.y*.5+.5);
      let rim=pow(1.-abs(n.z),3.)*max(0.,dot(n,normalize(vec3f(.85,.28,-.4))));
      let spec=pow(max(0.,dot(n,normalize(vec3f(-.36,.46,1.)))),36.);
      let light=vec3f(.53,.50,.46)*(sky+.69*key)+vec3f(.12,.14,.16)*rim+vec3f(.052)*spec;
      return vec4f(pow(light,vec3f(1./2.2)),1.);` : `
      let crease=clamp(length(fwidth(n.xy))*1.35,0.,.48);
      return vec4f(n.xy,-n.z,1.+crease);`}
    }
  `,"海上巨像 · 曲面");
  const pipe=device.createRenderPipeline({layout:"auto",vertex:{module,entryPoint:"vs",buffers:[{arrayStride:mesh.stride,
    attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x3"}]}]},
    fragment:{module,entryPoint:"fs",targets:[{format}]},depthStencil:{format:"depth32float",depthCompare:"less",depthWriteEnabled:true}});
  const group=device.createBindGroup({layout:pipe.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:frame}}]});
  return {
    draw(pass,angle,halfWidth,top,height){
      device.queue.writeBuffer(frame,0,new Float32Array([angle,halfWidth,top,height]));
      pass.setPipeline(pipe);pass.setBindGroup(0,group);pass.setVertexBuffer(0,vertex);
      pass.setIndexBuffer(index,mesh.indices.BYTES_PER_ELEMENT===2?"uint16":"uint32");pass.drawIndexed(mesh.indices.length);
    },
    dispose(){frame.destroy();vertex.destroy();index.destroy();}
  };
}

export async function create(canvas){
  const adapter=await navigator.gpu?.requestAdapter();if(!adapter)throw Error("转面需要 WebGPU");
  const device=await adapter.requestDevice(), context=canvas.getContext("webgpu");
  const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:"opaque"});
  const model=await createSurfaceStudy(device,format,true);
  const depth=device.createTexture({size:[canvas.width,canvas.height],format:"depth32float",usage:GPUTextureUsage.RENDER_ATTACHMENT});
  const depthView=depth.createView();
  return {
    draw(angle){
      const enc=device.createCommandEncoder();
      const pass=enc.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:"clear",clearValue:[.067,.075,.081,1],storeOp:"store"}],
        depthStencilAttachment:{view:depthView,depthLoadOp:"clear",depthClearValue:1,depthStoreOp:"discard"}});
      model.draw(pass,angle,1.16,.49,2.29);pass.end();device.queue.submit([enc.finish()]);
      return device.queue.onSubmittedWorkDone();
    },
    dispose(){model.dispose();depth.destroy();device.destroy();}
  };
}
