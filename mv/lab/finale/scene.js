import { fail, initGPU, FS_VS, NOISE, loadAtlas, mipTexture, Post, run, shader, sm, norm, cross, sub } from "../lib.js";
import { INK } from "../bridge/style.js";
import { WGSL as CITY } from "../windows/scene.wgsl.js";
import { makeWindowText } from "../windows/text.js";
import { pourPlate } from "./pour.js";
import { PAINTING, RELIEF } from "./painting.js";

function inscription(device) {
  const canvas = new OffscreenCanvas(1536, 384), brush = canvas.getContext("2d");
  brush.textAlign = "center";
  brush.textBaseline = "middle";
  brush.fillStyle = "#eee6ce";
  brush.font = '500 52px "Closing",serif';
  brush.fillText("你关上这扇窗，这一个我就熄了。",768,59);
  brush.fillText("有人再打开，我又会醒。",768,181);
  brush.font = '500 81px "Closing",serif';
  brush.fillText("河 水 不 回 答",748,315);
  // The small square seal is printed from the same real type as the title.
  brush.fillStyle = "#a74d35"; brush.fillRect(1050,285,48,48);
  brush.fillStyle = "#f2d9aa"; brush.font = '500 33px "Closing",serif';
  brush.fillText("河",1074,309);
  return mipTexture(device,canvas.transferToImageBitmap());
}

try {
  const g = await initGPU(document.querySelector("canvas")), {device,W,H}=g;
  const font = new FontFace("Closing",'url("./fonts/closing.woff2")');
  document.fonts.add(font);
  const [atlas] = await Promise.all([loadAtlas(device),font.load()]);
  const post = new Post(g), fil = atlas.sampler;
  const text = inscription(device);
  const portrait=new URLSearchParams(location.search).get("portrait");
  let plate;
  if(portrait===null || portrait==="sitter"){
    const {tidalRelief}=await import("./tidal-relief.js");
    plate=await tidalRelief(device,448,608);
  }else{
    plate = device.createTexture({size:[448,608],format:"rgba16float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING});
    const bake = device.createComputePipeline({layout:"auto",compute:{module:shader(device,RELIEF,"河上的脸"),entryPoint:"main"}});
    const init = device.createCommandEncoder(), compute=init.beginComputePass();
    compute.setPipeline(bake);
    compute.setBindGroup(0,device.createBindGroup({layout:bake.getBindGroupLayout(0),entries:[{binding:0,resource:plate.createView()}]}));
    compute.dispatchWorkgroups(56,76); compute.end(); device.queue.submit([init.finish()]);
  }

  const uniform = size => device.createBuffer({size,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const frame = uniform(32), city = uniform(160);
  const blend = {color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha"}};
  function layer(source,name,resources){
    const module=shader(device,FS_VS+NOISE+source,name);
    const pipe=device.createRenderPipeline({layout:"auto",vertex:{module,entryPoint:"vs"},fragment:{module,entryPoint:"fs",targets:[{format:"rgba16float",blend}]}});
    const group=device.createBindGroup({layout:pipe.getBindGroupLayout(0),entries:resources.map((resource,binding)=>({binding,resource}))});
    return pass=>{pass.setPipeline(pipe);pass.setBindGroup(0,group);pass.draw(3);};
  }
  const painting=layer(PAINTING,"河与巨像的十种画法",[{buffer:frame},fil,plate.createView(),atlas.tex.createView(),mipTexture(device,pourPlate()).createView()]);
  const lettering=layer(`
    @group(0)@binding(0)var<uniform> f:array<vec4f,2>;
    @group(0)@binding(1)var smp:sampler;
    @group(0)@binding(2)var words:texture_2d<f32>;
    @fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
      let uv=fc.xy/f[0].xy;let t=f[0].z;
      var row=0.; var y=.765; var width=.80;
      var a=smoothstep(254.9,255.9,t)*(1.-smoothstep(257.75,258.4,t));
      if(t>=258.35){row=1.;a=smoothstep(258.35,258.9,t)*(1.-smoothstep(260.50,261.15,t));}
      if(t>=261.10){row=2.;y=.33;width=.78;a=smoothstep(261.10,261.94,t);}
      let p=(uv-vec2f(.5,y))/vec2f(width,width*128./1536.*1.77778)+.5;
      if(any(p<vec2f(0.))||any(p>vec2f(1.))){return vec4f(0.);}
      let v=textureSampleLevel(words,smp,vec2f(p.x,(p.y+row)/3.),max(0.,log2(1536./(width*f[0].x))));
      return vec4f(pow(v.rgb,vec3f(2.2)),v.a*a);
    }`,"尾题与印",[{buffer:frame},fil,text.createView()]);
  // The bridge's dry brush remains on exactly the same paper at 223 s.
  // Cache its final image once; let the first valley absorb the ink from below.
  let openBrush;
  function takeBrush(){
    const tex=device.createTexture({size:[W,H],format:g.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
    const frozen=uniform(16);
    device.queue.writeBuffer(frozen,0,new Float32Array([W,H,223,0]));
    const ink=shader(device,INK,"桥段末笔"), inkPipe=device.createRenderPipeline({layout:"auto",
      vertex:{module:ink,entryPoint:"vs"},fragment:{module:ink,entryPoint:"fs",targets:[{format:g.format}]}});
    const group=device.createBindGroup({layout:inkPipe.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:frozen}}]});
    const enc=device.createCommandEncoder(), p=enc.beginRenderPass({colorAttachments:[{view:tex.createView(),loadOp:"clear",storeOp:"store",clearValue:[0,0,0,1]}]});
    p.setPipeline(inkPipe);p.setBindGroup(0,group);p.draw(3);p.end();device.queue.submit([enc.finish()]);
    const join=shader(device,FS_VS+NOISE+`
      @group(0)@binding(0)var<uniform> f:array<vec4f,2>;
      @group(0)@binding(1)var fil:sampler;@group(0)@binding(2)var last:texture_2d<f32>;
      @fragment fn fs(@builtin(position) fc:vec4f)->@location(0)vec4f{
        let uv=fc.xy/f[0].xy;let t=f[0].z;let c=textureSampleLevel(last,fil,uv,0.).rgb;
        let soak=.45*(1.-uv.y)+.24*fbm(uv*8.)+.18*(1.-c.g);
        let progress=smoothstep(223.,224.72,t)*1.45;
        return vec4f(c,1.-smoothstep(soak,soak+.28,progress));
      }`,"墨落入河");
    const pipe=device.createRenderPipeline({layout:"auto",vertex:{module:join,entryPoint:"vs"},fragment:{module:join,entryPoint:"fs",targets:[{format:g.format,blend}]}});
    const resources=[{buffer:frame},fil,tex.createView()];
    const bind=device.createBindGroup({layout:pipe.getBindGroupLayout(0),entries:resources.map((resource,binding)=>({binding,resource}))});
    return (enc,out)=>{const pass=enc.beginRenderPass({colorAttachments:[{view:out,loadOp:"load",storeOp:"store"}]});
      pass.setPipeline(pipe);pass.setBindGroup(0,bind);pass.draw(3);pass.end();};
  }
  let street;
  const changes=[223.24,225.07,227.37,229.68,231.53,233.36,235.68,237.98,240.28,242.62];
  function phase(t){
    let value=0;
    for(let i=1;i<changes.length;i++) value+=sm(changes[i]-.49,changes[i]+.47,t);
    return value;
  }
  function draw(t){
    const close=sm(254.55,260.8,t);
    const distance=.97*Math.exp(close*4.75);
    const lift=16*sm(258.75,263.63,t), drift=-7*sm(258.75,263.63,t);
    const ro=[drift,42.56+lift,-16-distance];
    const forward=norm(sub([0,42.56,-16],ro));
    const right=norm(cross([0,1,0],forward)),up=cross(forward,right);
    const paneScale=Math.min(1.,1.02/((W/H)*distance*.49));
    device.queue.writeBuffer(frame,0,new Float32Array([W,H,t,phase(t),.5,.5,paneScale,0]));
    if(t>254.60){
      street??=layer(CITY,"同一座夜城",[{buffer:city},fil,makeWindowText(device).createView()]);
      const on=1-.84*sm(256.1,257.8,t)+.77*sm(258.9,259.8,t);
      device.queue.writeBuffer(city,0,new Float32Array([W,H,t,42+.30*(t-254.5),...ro,0,...forward,.49,...right,1,...up,13,
        -.07,.12,-.99,on,0,80,t,0,36,.35,.65,1,1,.3,0,1,99,99,0,0]));
    }
    const enc=device.createCommandEncoder(), p=enc.beginRenderPass(post.pass([.025,.023,.02,1],false));
    if(t>254.60) street(p);
    if(t<258.80) painting(p);
    if(t>=254.9) lettering(p);
    p.end();
    const out=g.ctx.getCurrentTexture().createView();
    post.run(enc,out,{bloom:.10*close,tonemap:.76*close,exposure:1,grain:.018,vignette:.22,time:t});
    if(t<224.72){openBrush??=takeBrush(); openBrush(enc,out);}
    device.queue.submit([enc.finish()]);
  }
  await run({g,seg:[223,263.63],scene:{draw},title:"河水不回答　高潮与尾声"});
} catch(error){fail(error.stack||String(error));}
