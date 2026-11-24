import {mipTexture} from "../lib.js";

// Front-facing rest surface from Lee Perry-Smith, CC BY 3.0 (scan-source.txt).
// The measured orbital surface stays continuous under the analytic eyelid boundary.
function surfaceLookup(pts,triangles){
  const cells=new Map(), scale=16;
  const key=(i,j)=>i+256*j;
  // Bin triangles in the frontal projection. The largest depth is the visible surface.
  for(let i=0;i<triangles.length;i+=3){
    const tri=[pts[triangles[i]],pts[triangles[i+1]],pts[triangles[i+2]]];
    const xrange=tri.map(p=>Math.floor(p[0]*scale)),yrange=tri.map(p=>Math.floor(p[1]*scale));
    for(let y=Math.min(...yrange);y<=Math.max(...yrange);y++)
      for(let x=Math.min(...xrange);x<=Math.max(...xrange);x++){
        const k=key(x,y);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(tri);
      }
  }
  return (x,y)=>{
    const candidates=cells.get(key(Math.floor(x*scale),Math.floor(y*scale)))||[];
    let best=-Infinity;
    for(const [a,b,c] of candidates){
      const ax=a[0]-c[0],ay=a[1]-c[1],bx=b[0]-c[0],by=b[1]-c[1],den=ax*by-ay*bx;
      if(Math.abs(den)<1e-10)continue;
      const u=((x-c[0])*by-(y-c[1])*bx)/den,v=(ax*(y-c[1])-ay*(x-c[0]))/den;
      if(Math.min(u,v,1-u-v)<-.0001)continue;
      best=Math.max(best,u*a[2]+v*b[2]+(1-u-v)*c[2]);
    }
    return best;
  };
}
async function asset(file){
  const url=new URL(file,import.meta.url);
  let response;
  try {response=await fetch(url);}
  catch(error){if(!(error instanceof TypeError))throw error;response=await fetch(url);}
  if(!response.ok)throw Error("人像曲面载入失败 "+response.status+" "+file);
  return response;
}
async function reliefView(device){
  const response=await asset("./sitter-detail.webp");
  const bitmap=await createImageBitmap(await response.blob(),{colorSpaceConversion:"none",premultiplyAlpha:"none"});
  try {return mipTexture(device,bitmap).createView();}
  finally {bitmap.close();}
}
export async function buildScan(device){
  const [bytes,detailView]=await Promise.all([
    asset("./sitter-scan.bin").then(response=>response.arrayBuffer()),
    device?reliefView(device):null
  ]);
  const view=new DataView(bytes),record=14;
  const count=view.getUint32(4,true),nindex=view.getUint32(8,true),offset=12+count*record;
  if(view.getUint32(0)!==0x4c505333||bytes.byteLength!==offset+nindex*2)throw Error('人像曲面数据不完整');
  const triangles=new Uint16Array(bytes,offset,nindex);
  const points=Array.from({length:count},(_,i)=>{
    const j=12+i*record;let a=view.getInt8(j+6)/127,b=view.getInt8(j+7)/127,c=1-Math.abs(a)-Math.abs(b);
    if(c<0){const old=a;a=(1-Math.abs(b))*Math.sign(a||1);b=(1-Math.abs(old))*Math.sign(b||1);}
    const len=Math.hypot(a,b,c);
    return [view.getInt16(j,true)/10000,view.getInt16(j+2,true)/10000,view.getInt16(j+4,true)/10000,a/len,b/len,c/len,view.getUint8(j+8)/255,view.getUint8(j+9)/255,
      view.getUint16(j+10,true)/65535,view.getUint16(j+12,true)/65535];
  });
  const depth=surfaceLookup(points,triangles);
  const vertices=new Float32Array(count*11);
  for(const [index,p] of points.entries()){
    vertices.set([...p.slice(0,6),p[1]<-1.04?2:1,...p.slice(6)],index*11);
  }
  return {detailView,mesh:{vertices,indices:new Uint32Array(triangles),stride:44},
    at(x,y){const z=depth(x,y);if(!Number.isFinite(z))throw Error('颊侧落点超出脸部曲面');return [x,y,z];},
    chest(u,y){let x=u*Math.min(1.13,.66+(-y-1.01)*1.01),z=depth(x,y);
      if(!Number.isFinite(z)){x*=.84;z=depth(x,y);}
      return [x,y,Number.isFinite(z)?z:.06];}
  };
}
