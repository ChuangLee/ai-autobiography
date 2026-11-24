import {mipTexture} from "../lib.js";

// Front-facing rest surface from Lee Perry-Smith, CC BY 3.0 (scan-source.txt).
// The measured orbital surface stays continuous under the analytic eyelid boundary.
function surfaceLookup(positions,indices){
  const cells=new Map(), scale=16;
  const key=(x,y)=>x+256*y;
  // Store the triangle basis once. The 128² chest map and the cheek camera
  // sample the same frontal projection; both need the frontmost intersection.
  // Each record holds C.xyz, (A−C).xy, (B−C).xy, the determinant, A.z and B.z.
  const basis=new Float64Array(indices.length/3*10);
  for(let i=0;i<indices.length;i+=3){
    const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
    const cx=positions[c],cy=positions[c+1];
    const ax=positions[a]-cx,ay=positions[a+1]-cy,bx=positions[b]-cx,by=positions[b+1]-cy;
    const den=ax*by-ay*bx;
    if(Math.abs(den)<1e-10)continue;
    const offset=i/3*10;
    basis.set([cx,cy,positions[c+2],ax,ay,bx,by,den,positions[a+2],positions[b+2]],offset);
    const left=Math.floor(Math.min(positions[a],positions[b],cx)*scale);
    const right=Math.floor(Math.max(positions[a],positions[b],cx)*scale);
    const bottom=Math.floor(Math.min(positions[a+1],positions[b+1],cy)*scale);
    const top=Math.floor(Math.max(positions[a+1],positions[b+1],cy)*scale);
    for(let y=bottom;y<=top;y++)for(let x=left;x<=right;x++){
      const k=key(x,y);let cell=cells.get(k);
      if(!cell){cell=[];cells.set(k,cell);}
      cell.push(offset);
    }
  }
  return (x,y)=>{
    const candidates=cells.get(key(Math.floor(x*scale),Math.floor(y*scale)));
    let best=-Infinity;
    if(!candidates)return best;
    for(const i of candidates){
      const dx=x-basis[i],dy=y-basis[i+1],den=basis[i+7];
      const u=(dx*basis[i+6]-dy*basis[i+5])/den;
      const v=(basis[i+3]*dy-basis[i+4]*dx)/den;
      const w=1-u-v;
      if(Math.min(u,v,w)>=-.0001){
        best=Math.max(best,u*basis[i+8]+v*basis[i+9]+w*basis[i+2]);
      }
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
  const positions=new Float64Array(count*3),vertices=new Float32Array(count*11);
  for(let i=0;i<count;i++){
    const j=12+i*record,k=i*11,xyz=i*3;
    const x=view.getInt16(j,true)/10000,y=view.getInt16(j+2,true)/10000,z=view.getInt16(j+4,true)/10000;
    // CPU anchor queries use the decoded doubles; GPU vertices use float32.
    positions[xyz]=x;positions[xyz+1]=y;positions[xyz+2]=z;
    vertices[k]=x;vertices[k+1]=y;vertices[k+2]=z;
    let a=view.getInt8(j+6)/127,b=view.getInt8(j+7)/127,c=1-Math.abs(a)-Math.abs(b);
    if(c<0){const old=a;a=(1-Math.abs(b))*Math.sign(a||1);b=(1-Math.abs(old))*Math.sign(b||1);}
    const len=Math.hypot(a,b,c);
    vertices[k+3]=a/len;vertices[k+4]=b/len;vertices[k+5]=c/len;
    vertices[k+6]=y<-1.04?2:1;vertices[k+7]=view.getUint8(j+8)/255;vertices[k+8]=view.getUint8(j+9)/255;
    vertices[k+9]=view.getUint16(j+10,true)/65535;vertices[k+10]=view.getUint16(j+12,true)/65535;
  }
  const depth=surfaceLookup(positions,triangles);
  return {detailView,mesh:{vertices,indices:triangles,stride:44},
    at(x,y){const z=depth(x,y);if(!Number.isFinite(z))throw Error('颊侧落点超出脸部曲面');return [x,y,z];},
    chest(u,y){let x=u*Math.min(1.13,.66+(-y-1.01)*1.01),z=depth(x,y);
      if(!Number.isFinite(z)){x*=.84;z=depth(x,y);}
      return [x,y,Number.isFinite(z)?z:.06];}
  };
}
