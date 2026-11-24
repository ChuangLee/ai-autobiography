// The texture was sampled from horizontal sections of the sea actor, including
// the bowed skull, ears and eyelids. See tools/bake_tidal_head.mjs.
const url=new URL("./tidal-head.bin",import.meta.url);
const response=await fetch(url);
if(!response.ok)throw Error("窗中人物曲面载入失败 "+response.status);
const file=await response.arrayBuffer(),header=new DataView(file);
const width=header.getUint32(0,true),height=header.getUint32(4,true);
const low=header.getFloat32(8,true),high=header.getFloat32(12,true);
const sides=width-1,rows=height-1,radiusScale=.34,centreScale=.64;
if(file.byteLength!==16+width*height*2)throw Error("窗中人物曲面数据不完整");
export function createTidalHeadMap(device){
  const texture=device.createTexture({size:[width,height],format:"rg8unorm",
    usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING});
  device.queue.writeTexture({texture},new Uint8Array(file,16),{bytesPerRow:width*2},[width,height]);
  return texture.createView();
}
export const TIDAL_HEAD_WGSL=`
@group(0) @binding(5) var headSlices:texture_2d<f32>;
fn tidalWindowHead(h:vec3f)->f32{
  // Radial depth is addressed around each slice's own centre, including the chin.
  let scale=.43;
  let p=h/scale;
  let v=(.5+${rows}.*clamp((p.y-(${low}))/${high-low},0.,1.))/${height}.;
  let centre=(textureSampleLevel(headSlices,inkSampler,vec2f(.5,v),0.).g-.5)*${centreScale};
  let radial=vec2f(p.x,p.z-centre);
  let turn=fract(atan2(radial.x,radial.y+1e-7)/6.2831853+1.);
  let u=(.5+turn*${sides}.)/${width}.;
  let radius=textureSampleLevel(headSlices,inkSampler,vec2f(u,v),0.).r*${radiusScale};
  let slice=length(radial)-radius;
  return max(slice*.70,max(${low}-p.y,p.y-${high}))*scale;
}`;
