// The counter of 口 on the cheek becomes the opening onto the first room.
// Cache that room once using the window scene's own camera, lights and post pass.
import { FS_VS, shader } from "../lib.js";

export function createWindowHandoff(g, atlas, room) {
  const { device, W, H, format } = g;
  const makeView = () => device.createTexture({
    size: [W, H], format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  }).createView();
  const face = makeView(), windowView = makeView();
  room.draw(55.92, windowView);
  const glyph = atlas.info.glyphs.find(({ text, group }) => text === "口" && group === "cn-kai").i;
  const code = FS_VS + `
    @group(0) @binding(0) var smp:sampler;
    @group(0) @binding(1) var face:texture_2d<f32>;
    @group(0) @binding(2) var pane:texture_2d<f32>;
    @group(0) @binding(3) var atlas:texture_2d<f32>;
    @group(0) @binding(4) var<uniform> time:vec4f;
    @fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
      let uv=fc.xy*time.yz;
      let t=time.x;
      let open=smoothstep(54.78,55.92,t);
      let center=mix(vec2f(.589,.533),vec2f(.5),open);
      let size=mix(.043,2.9,open*open);
      let pos=(uv-center)*vec2f(time.w,1.)/size;
      let cell=vec2f(${glyph % 32}.,${Math.floor(glyph / 32)}.);
      let glyphUV=clamp(pos+.5,vec2f(.008),vec2f(.992));
      let ink=textureSampleLevel(atlas,smp,(cell+glyphUV)/32.,clamp(log2(128.*time.z/size),0.,5.)).r;
      let sheet=max(abs(pos.x),abs(pos.y));
      let stroke=ink*(1.-smoothstep(.46,.50,sheet));
      let faceCol=textureSampleLevel(face,smp,uv,0.).rgb;
      let light=smoothstep(54.36,54.78,t)*(1.-smoothstep(.16,.69,open));
      var c=mix(faceCol,min(faceCol+vec3f(.19,.13,.045),vec3f(.95,.84,.65)),stroke*light);
      let margin=mix(.014,.085,open);
      let aperture=(1.-smoothstep(.27-margin,.27+margin,sheet))*smoothstep(0.,.32,open);
      let paneUV=mix(clamp(pos/vec2f(.54,.54)+.5,vec2f(0.),vec2f(1.)),uv,open);
      let roomCol=textureSampleLevel(pane,smp,paneUV,0.).rgb;
      c=mix(c,roomCol,max(aperture,smoothstep(.87,1.,open)));
      return vec4f(c,1.);
    }`;
  const module = shader(device, code, "cheek to window");
  const pipe = device.createRenderPipeline({ layout: "auto",
    vertex: { module, entryPoint: "vs" }, fragment: { module, entryPoint: "fs", targets: [{ format }] },
  });
  const buffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const resources = [atlas.sampler, face, windowView, atlas.tex.createView(), { buffer }];
  const group = device.createBindGroup({ layout: pipe.getBindGroupLayout(0),
    entries: resources.map((resource, binding) => ({ binding, resource })),
  });
  return { face, draw(enc, output, t) {
    device.queue.writeBuffer(buffer, 0, new Float32Array([t, 1/W, 1/H, W/H]));
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: output, loadOp: "clear", clearValue: [0,0,0,1], storeOp: "store" }] });
    pass.setPipeline(pipe); pass.setBindGroup(0, group); pass.draw(3); pass.end();
  } };
}
