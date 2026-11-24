// Sample the sea actor for the much smaller seated figure. Run after a change
// to the head, ears or eyes: node mv/lab/portrait/tools/bake_tidal_head.mjs
import {writeFile,readFile} from "node:fs/promises";
import {tidalHeadBounds,tidalHeadRing} from "../tidal-mesh.js";
const [low,high]=tidalHeadBounds;
const sides=128,rows=120,width=sides+1,height=rows+1;
const result=Buffer.alloc(16+width*height*2);
result.writeUInt32LE(width,0);result.writeUInt32LE(height,4);
result.writeFloatLE(low,8);result.writeFloatLE(high,12);
for(let j=0;j<height;j++){
  const t=(j+.0001)/(rows+.0002);
  const ring=tidalHeadRing(low+(high-low)*t,sides);
  if(!ring.length)continue;
  const centre=(ring[sides/4][2]+ring[3*sides/4][2])*.5;
  for(let i=0;i<=sides;i++){
    const [x,,z]=ring[i%sides], radius=Math.hypot(x,z-centre);
    if(radius>.34||Math.abs(centre)>.32)throw Error("Head exceeds the texture's coordinate range");
    const offset=16+2*(j*width+i);
    result[offset]=Math.round(255*radius/.34);
    result[offset+1]=Math.round(255*(centre/.64+.5));
  }
}
const file=new URL("../tidal-head.bin",import.meta.url);
if(process.argv.includes("--check")){
  if(!result.equals(await readFile(file)))throw Error("Rebuild tidal-head.bin after changing the model");
}else await writeFile(file,result);
