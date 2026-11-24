import {createSurfaceStudy} from "../portrait/tidal-study.js";

export async function tidalRelief(device,width,height){
  const size=[width,height],format="rgba16float";
  const plate=device.createTexture({size,format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  const depth=device.createTexture({size,format:"depth32float",usage:GPUTextureUsage.RENDER_ATTACHMENT});
  const study=await createSurfaceStudy(device,format,false);
  const enc=device.createCommandEncoder();
  const pass=enc.beginRenderPass({
    colorAttachments:[{view:plate.createView(),loadOp:"clear",clearValue:[0,0,0,0],storeOp:"store"}],
    depthStencilAttachment:{view:depth.createView(),depthLoadOp:"clear",depthClearValue:1,depthStoreOp:"discard"}
  });
  // The painted river covers the same waistline as the live sea shot.
  study.draw(pass,0,1.25,.50,3.35);pass.end();device.queue.submit([enc.finish()]);
  study.dispose();depth.destroy();
  return plate;
}
