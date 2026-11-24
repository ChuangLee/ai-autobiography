// The neutral face control cage is the MediaPipe generic, Apache-2.0, cited in
// anatomy-source.txt. The skull, ear, neck, eyelid motion and eyeballs are drawn here.
import {landmarks,topology} from "./sitter-control.js";
import {chestPoint} from "./planes-mesh.js";

const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const smooth=(a,b,v)=>{const k=clamp((v-a)/(b-a));return k*k*(3-2*k);};
const mix=(a,b,t)=>a+(b-a)*t;
const norm=a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const TAU=2*Math.PI;
export const eyeRadius=.155;
export const eyeCenter=side=>[side*.302,.081,.327];
const EYE_U=[133,173,157,158,159,160,161,246,33],EYE_L=[133,155,154,153,145,144,163,7,33];
const FOLD_U=[243,190,56,28,27,29,30,247,130],FOLD_L=[243,112,26,22,23,24,110,25,130];
const LIP_U=[61,185,40,39,37,0,267,269,270,409,291],LIP_L=[61,146,91,181,84,17,314,405,321,375,291];
const MOUTH_U=[78,191,80,81,82,13,312,311,310,415,308],MOUTH_L=[78,95,88,178,87,14,317,402,318,324,308];
const OVAL=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
const raw=Array.from({length:landmarks.length/3},(_,i)=>[0,1,2].map(k=>landmarks[3*i+k]/1000));
const other=raw.map(([x,y,z])=>raw.findIndex(([a,b,c])=>a===-x&&b===y&&c===z));
const combine=(a,b,k)=>a.map((v,i)=>mix(v,b[i],k));
function inside(x,y,polygon){
  let on=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=raw[polygon[j]],b=raw[polygon[i]];
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])on=!on;
  }
  return on;
}
function convert([x,y,z]){
  const aroundMouth=Math.exp(-((x/2.64)**4)-((y+4.27)/1.09)**2);
  const m=y-.235*Math.tanh((y+4.27)/.14)*aroundMouth;
  const lift=(x>0?.045:-.026)*Math.exp(-(((Math.abs(x)-2.25)/1.1)**2)-(((y+4.24)/1.4)**2));
  const leftTemple=.011*x*Math.exp(-(((y-4.5)/4.2)**2));
  return [x*.096,.08+(m-2.625)*(m<2.625?.083:.1)+lift*.083,.15+z*.088+leftTemple*.088];
}
// Upper forehead runs over the crown to the back of the neck. Simultaneously
// the lower border of the same cage turns under the mandible to meet the throat.
// Each row: half width, then y/z at forehead, temporal line and submental line.
const SKULL=[
  [.746,.825,.438,.086,-.220,-.926,.440], [.747,1.006,.272,.085,-.340,-.906,.318],
  [.728,1.148,.063,.045,-.477,-.853,.236], [.689,1.181,-.188,-.053,-.555,-.844,.214],
  [.618,1.108,-.438,-.170,-.563,-.887,.212], [.539,.953,-.638,-.303,-.529,-.941,.224],
  [.450,.696,-.783,-.440,-.467,-.993,.230], [.384,.337,-.861,-.584,-.348,-1.038,.235],
  [.352,-.080,-.805,-.744,-.228,-1.079,.239], [.345,-.441,-.662,-.900,-.159,-1.118,.244],
  [.365,-.748,-.534,-1.020,-.129,-1.161,.251], [.403,-1.034,-.478,-1.155,-.116,-1.203,.252]
];
// The shoulder section is shared with the earlier study; only the neck opening
// above it changes. Values here are posterior depths at the original measured heights.
const BACK=[[-2.36,-.55,.79],[-1.77,-.57,.79],[-1.62,-.54,.80],[-1.53,-.51,.83],[-1.44,-.49,.84],[-1.36,-.47,.89],[-1.22,-.466,.97]];
function chest(theta,row){
  const [y,b,s]=row, sn=Math.sin(theta),cs=Math.cos(theta);
  const u=Math.sign(sn)*Math.abs(sn)**s,p=chestPoint(u,y);
  if(cs>0){const mid=chestPoint(1,y)[2];p[2]=mid+(b-mid)*cs**s;}
  return p;
}
const lineMap=(chain,edge,uv)=>{
  for(let j=0;j<chain.length;j++)uv.set(chain[j],[j/(chain.length-1),edge]);
};
function makeCage(){
  const p=raw.map(convert),faces=[],eyes=[],lips=new Map(),eyeUV=new Map();
  // Adjust the underlying bony planes at their measured anatomical landmarks.
  // Zygoma stands forward of the masseter, while the paired gonial angles
  // stand out from the narrow throat underneath the chin.
  const planes=[
    [280,.014,.013,.055],[352,.014,.013,.043],[425,.004,.014,.050],[411,.012,.008,.017],
    [427,.002,-.004,-.040],[416,.003,0.,-.047],[433,-.004,-.009,-.029],
    [367,.045,-.010,.004],[394,.030,-.018,.014],[365,.038,-.017,.012],[397,.051,-.006,0],
    [336,0,-.013,.033],[296,.003,-.014,.055],[334,.004,-.015,.059],[293,.003,-.011,.047],[300,.003,-.005,.020],
    [438,.011,0,.020],[439,.019,-.004,.018],[289,.012,-.003,.017],[455,.011,0,.006],
    [309,0,.014,-.030],[290,0,.006,-.017]
  ];
  for(const [i,dx,dy,dz] of planes)for(const side of [-1,1]){
    const q=p[side>0?i:other[i]];q[0]+=side*dx;q[1]+=dy;q[2]+=dz;
  }
  for(const side of [-1,1]){
    const flip=chain=>side<0?chain:chain.map(i=>other[i]);
    const upper=flip(EYE_U),lower=flip(EYE_L),foldU=flip(FOLD_U),foldL=flip(FOLD_L);
    for(const chain of [upper,lower])lineMap(chain,0,eyeUV);
    for(const chain of [foldU,foldL])lineMap(chain,1,eyeUV);
    eyes.push({side,rim:new Set([...upper,...lower]),upper:new Set([...upper,...foldU]),lower:new Set([...lower,...foldL])});
    for(const [j,chain] of [upper,lower].entries())for(let k=1;k<chain.length-1;k++){
      const i=chain[k],arc=Math.sin(Math.PI*k/(chain.length-1));
      p[i][1]+=(j===0?.008:-.003)*arc;
      const C=eyeCenter(side),dx=p[i][0]-C[0],dy=p[i][1]-C[1];
      const contact=C[2]+Math.sqrt(Math.max(.0001,(eyeRadius+.006)**2-dx*dx-dy*dy));
      p[i][2]=mix(p[i][2],contact,Math.min(1,.30+arc));

    }
  }
  for(const chain of [MOUTH_U,MOUTH_L])lineMap(chain,0,lips);
  for(const chain of [LIP_U,LIP_L])lineMap(chain,1,lips);
  const innerLip=new Set([...MOUTH_U,...MOUTH_L]),lipPolygon=[...LIP_U,...LIP_L.slice(1,-1).reverse()];
  function face(ids,material,uv){faces.push({ids,material,uv});}
  const vertexUV=(i,tag)=>{
    if(tag===5||tag===6)return eyeUV.get(i);
    if(tag===8||tag===9){
      const u=clamp((raw[i][0]+2.456)/4.912);
      const seam=-4.275+.035*(u-.5);
      if(innerLip.has(i))return [u,0];
      const v=lips.get(i)?.[1]??clamp(Math.abs(raw[i][1]-seam)/(.25+.71*Math.sin(Math.PI*u)));
      return [u,v];
    }
    return [.5+p[i][0]*.6,.5-p[i][1]*.4];
  };
  for(let n=0;n<topology.length;n+=3){
    const ids=[topology[n],topology[n+1],topology[n+2]];
    if(eyes.some(e=>ids.every(i=>e.rim.has(i)))||ids.every(i=>innerLip.has(i)))continue;
    const eye=eyes.find(e=>ids.every(i=>e.upper.has(i))||ids.every(i=>e.lower.has(i)));
    const x=ids.reduce((v,i)=>v+raw[i][0]/3,0),y=ids.reduce((v,i)=>v+raw[i][1]/3,0);
    const mat=eye?(ids.every(i=>eye.upper.has(i))?5:6):inside(x,y,lipPolygon)?(y> -4.27?8:9):1;
    face(ids,mat,ids.map(i=>vertexUV(i,mat)));
  }
  // The dark line between the lips is a narrow oral recess behind two free edges.
  const mouth=[...MOUTH_U,...MOUTH_L.slice(1,-1).reverse()],mouthBack=mouth.map(i=>{
    const q=[...p[i]];q[2]-=.035;p.push(q);return p.length-1;
  });
  const centre=p.push([0,-.493,.518])-1;
  for(let j=0;j<mouth.length;j++){
    const k=(j+1)%mouth.length;
    for(const t of [[mouth[k],mouth[j],mouthBack[j]],[mouthBack[k],mouth[k],mouthBack[j]],[centre,mouthBack[k],mouthBack[j]]]){
      face(t,8,t.map(()=>[.5,-.5]));
    }
  }
  const theta=OVAL.map(i=>Math.atan2(raw[i][0]/7.65,(raw[i][1]+.52)/8.9));
  let prev=OVAL;
  function ring(nodes,tag){
    const current=nodes.map(v=>p.push(v)-1);
    for(let j=0;j<prev.length;j++){
      const k=(j+1)%prev.length;
      for(const ids of [[prev[j],prev[k],current[j]],[current[j],prev[k],current[k]]]){
        face(ids,tag,ids.map(i=>[.5+p[i][0]*.4,.5-p[i][1]*.35]));
      }
    }
    prev=current;
  }
  for(const [r,topY,topZ,sideY,sideZ,lowY,lowZ] of SKULL){
    ring(theta.map(a=>{
      const c=Math.cos(a),s=Math.sin(a),k=Math.abs(c);
      return [r*Math.sign(s)*Math.abs(s)**.94,mix(sideY,c>0?topY:lowY,k),mix(sideZ,c>0?topZ:lowZ,k**1.22)];
    }),1);
  }
  for(const row of BACK.slice().reverse())ring(theta.map(a=>chest(a,row)),2);
  return {p,faces};
}
// Smooth the shared positions, with UVs on the triangle corners. A material
// boundary can therefore have a clean eyelid parameter without splitting the skin.
function subdivide({p,faces}){
  const edges=new Map(),neighbours=p.map(()=>new Set()),boundary=p.map(()=>[]);
  const key=(a,b)=>Math.min(a,b)*p.length+Math.max(a,b);
  for(const {ids} of faces)for(let k=0;k<3;k++){
    const a=ids[k],b=ids[(k+1)%3],o=ids[(k+2)%3],id=key(a,b);
    const e=edges.get(id);
    if(e)e.op.push(o);else edges.set(id,{a,b,op:[o]});
    neighbours[a].add(b);neighbours[b].add(a);
  }
  const next=p.map(v=>v.slice()),refined=[];
  for(const e of edges.values()){
    const {a,b,op}=e;
    const point=combine(p[a],p[b],.5);
    if(op.length===2)for(let c=0;c<3;c++)point[c]=.75*point[c]+.125*(p[op[0]][c]+p[op[1]][c]);
    else {boundary[a].push(b);boundary[b].push(a);}
    e.mid=next.push(point)-1;
  }
  for(let i=0;i<p.length;i++){
    const b=boundary[i],near=neighbours[i];
    if(b.length===2){for(let k=0;k<3;k++)next[i][k]=.75*p[i][k]+.125*(p[b[0]][k]+p[b[1]][k]);}
    else if(near.size){
      const n=near.size,w=(.625-(.375+.25*Math.cos(TAU/n))**2)/n;
      for(let k=0;k<3;k++){let sum=0;for(const j of near)sum+=p[j][k];next[i][k]=(1-n*w)*p[i][k]+w*sum;}
    }
  }
  for(const {ids:[a,b,c],material,uv:[u,v,w]} of faces){
    const ab=edges.get(key(a,b)).mid,bc=edges.get(key(b,c)).mid,ca=edges.get(key(c,a)).mid;
    const uvAB=combine(u,v,.5),uvBC=combine(v,w,.5),uvCA=combine(w,u,.5);
    refined.push({ids:[a,ab,ca],material,uv:[u,uvAB,uvCA]},{ids:[ab,b,bc],material,uv:[uvAB,v,uvBC]},
      {ids:[ca,bc,c],material,uv:[uvCA,uvBC,w]},{ids:[ab,bc,ca],material,uv:[uvAB,uvBC,uvCA]});
  }
  return {p:next,faces:refined};
}
function seatEyes(p){
  for(const q of p){
    if(q[2]<.32)continue;
    const [x,y,z]=eyeCenter(Math.sign(q[0])||1), dx=q[0]-x,dy=q[1]-y;
    // Only the fleshy margin rests directly on the globe. The outer orbit
    // retains the measuring cage's cheek and brow planes.
    if(Math.abs(dy)>.064)continue;
    const rr=(eyeRadius+.0025)**2-dx*dx-dy*dy;
    if(rr<=0)continue;
    const orbit=z+Math.sqrt(rr),delta=Math.max(.009-Math.abs(q[2]-orbit),0);
    q[2]=Math.max(q[2],orbit)+delta*delta/(4*.009);
  }
}
const rim=[
  [-.19,.070],[-.236,.022],[-.213,-.045],[-.136,-.105],[-.018,-.139],[.106,-.141],
  [.191,-.100],[.216,-.022],[.188,.047],[.116,.077],[.054,.069],[.013,.041],[-.033,.065],[-.092,.089]
];
function rimAt(turn){
  const f=(turn%1)*rim.length,i=Math.floor(f),t=f-i;
  const a=rim[(i+rim.length-1)%rim.length],b=rim[i],c=rim[(i+1)%rim.length],d=rim[(i+2)%rim.length];
  return b.map((v,k)=>.5*(2*v+(-a[k]+c[k])*t+(2*a[k]-5*v+4*c[k]-d[k])*t*t+(-a[k]+3*v-3*c[k]+d[k])*t*t*t));
}
// Sample the completed temporal bone in its own side plane. The underside of
// the pinna can then roll into the actual skull at every point of its root.
function temporalSurface(points,faces){
  const size=50,lowY=-.31,lowZ=-.40,spanY=.59,spanZ=.40;
  const values=new Float32Array(size*size).fill(-1);
  const toY=y=>(y-lowY)*(size-1)/spanY,toZ=z=>(z-lowZ)*(size-1)/spanZ;
  for(const f of faces){
    if(f.material!==1)continue;
    const [a,b,c]=f.ids.map(i=>points[i]);
    if(a[0]<.55||b[0]<.55||c[0]<.55)continue;
    const y0=Math.max(0,Math.ceil(toY(Math.min(a[1],b[1],c[1])))),y1=Math.min(size-1,Math.floor(toY(Math.max(a[1],b[1],c[1]))));
    const z0=Math.max(0,Math.ceil(toZ(Math.min(a[2],b[2],c[2])))),z1=Math.min(size-1,Math.floor(toZ(Math.max(a[2],b[2],c[2]))));
    const by=b[1]-a[1],bz=b[2]-a[2],cy=c[1]-a[1],cz=c[2]-a[2],det=by*cz-bz*cy;
    if(Math.abs(det)<1.e-12)continue;
    for(let j=y0;j<=y1;j++)for(let i=z0;i<=z1;i++){
      const dy=lowY+j*spanY/(size-1)-a[1],dz=lowZ+i*spanZ/(size-1)-a[2];
      const u=(dy*cz-dz*cy)/det,v=(by*dz-bz*dy)/det;
      if(u>=0&&v>=0&&u+v<=1){
        const k=j*size+i;values[k]=Math.max(values[k],a[0]+u*(b[0]-a[0])+v*(c[0]-a[0]));
      }
    }
  }
  return (y,z)=>{
    const yy=clamp(toY(y),0,size-1.001),zz=clamp(toZ(z),0,size-1.001),j=Math.floor(yy),i=Math.floor(zz);
    const at=(jr,ir)=>Math.max(.62,values[jr*size+ir]);
    return mix(mix(at(j,i),at(j,i+1),zz-i),mix(at(j+1,i),at(j+1,i+1),zz-i),yy-j);
  };
}
function earPoint(side,u,v,bone){
  const outline=rimAt(u),y=mix(.004,outline[0],v),z=mix(.003,outline[1],v);
  const bell=(k,w)=>Math.exp(-((k/w)**2));
  const helix=.045*bell(v-.827,.130)*(.45+.55*smooth(-.18,-.065,y));
  const ridge=.032*bell(z-(-.036+.13*y),.019)*bell(y+.016,.127);
  const fork=.024*bell(z-(-.019+.45*(y-.043)),.018)*bell(y-.097,.057);
  const tragus=.040*bell(z-.046,.028)*bell(y+.011,.045);
  const antitragus=.025*bell(z-.006,.026)*bell(y+.097,.029);
  const bowl=-.020*bell(z-.007,.047)*bell(y+.018,.065);
  const lobe=.031*bell(y+.167,.066)*bell(z-.006,.066);
  const wy=y-.023,wz=z-.178+.14*y;
  const stand=.020+.026*(1-smooth(-.100,.040,z));
  const offset=Math.max(.002,stand+helix+ridge+fork+tragus+antitragus+bowl+lobe-.014*smooth(.90,1.,v));
  return [side*(bone(wy,wz)+offset),wy,wz];
}
let cached,skinGrid;
const gridWidth=48,gridHeight=64;
const cell=(x,y)=>[Math.floor((x+1)*gridWidth/2),Math.floor((y+1.15)*gridHeight/2.45)];
function makeGrid(p,faces){
  const cells=Array.from({length:gridWidth*gridHeight},()=>[]);
  for(const {ids,material} of faces){
    if(material!==1||ids.every(i=>p[i][2]<.02))continue;
    const [a,b,c]=ids.map(i=>p[i]);
    const lo=cell(Math.min(a[0],b[0],c[0]),Math.min(a[1],b[1],c[1]));
    const hi=cell(Math.max(a[0],b[0],c[0]),Math.max(a[1],b[1],c[1]));
    for(let y=clamp(lo[1],0,gridHeight-1);y<=clamp(hi[1],0,gridHeight-1);y++){
      for(let x=clamp(lo[0],0,gridWidth-1);x<=clamp(hi[0],0,gridWidth-1);x++)cells[x+y*gridWidth].push([a,b,c]);
    }
  }
  return cells;
}
export function sitterFacePoint(x,y){
  if(!cached)makeSitterMesh();
  const [ix,iy]=cell(x,y),tris=skinGrid[ix+iy*gridWidth]||[];
  let z=-Infinity;
  for(const [a,b,c] of tris){
    const abx=b[0]-a[0],aby=b[1]-a[1],acx=c[0]-a[0],acy=c[1]-a[1],d=abx*acy-aby*acx;
    if(Math.abs(d)<1e-12)continue;
    const dx=x-a[0],dy=y-a[1],u=(dx*acy-dy*acx)/d,v=(abx*dy-aby*dx)/d;
    if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001)z=Math.max(z,a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]));
  }
  if(!Number.isFinite(z))throw RangeError("坐标超出面部皮肤表面");
  return [x,y,z];
}
export function makeSitterMesh(){
  if(cached)return cached;
  let cage=makeCage();
  for(let i=0;i<3;i++)cage=subdivide(cage);
  const {p,faces}=cage;seatEyes(p);
  const normals=p.map(()=>[0,0,0]),vertices=[],indices=[];
  for(const {ids:[a,b,c]} of faces){
    const n=cross(sub(p[b],p[a]),sub(p[c],p[a]));
    for(const i of [a,b,c])for(let k=0;k<3;k++)normals[i][k]+=n[k];
  }
  const unit=normals.map(norm),index=new Map();
  for(const {ids,uv,material} of faces)for(let j=0;j<3;j++){
    const at=ids[j],[u,v]=uv[j],lid=material===5||material===6;
    const weight=lid?(1-v)*Math.sin(Math.PI*u)**.68:0;
    // Feature UVs differ only along the mouth's recessed rim and at a canthus.
    const key=at*128+material*4+(v<0?1:0);
    let ix=index.get(key);
    if(ix===undefined){
      ix=vertices.length/10;index.set(key,ix);
      vertices.push(...p[at],...unit[at],u,lid?1-weight:v,material,weight);
    }
    indices.push(ix);
  }
  function patch(nu,nv,sample,tag,invert=false){
    const base=vertices.length/10;
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){
      const u=i/nu,v=j/nv,q=sample(u,v);
      const du=sub(sample(Math.min(.9999999,u+.0001),v),sample(Math.max(0,u-.0001),v));
      const dv=sub(sample(u,Math.min(1,v+.0001)),sample(u,Math.max(0,v-.0001)));
      const n=norm(cross(du,dv)).map(c=>invert?-c:c);
      vertices.push(...q,...n,u,v,tag,0);
      if(i<nu&&j<nv){const a=base+j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;indices.push(...(invert?[a,c,b,b,c,d]:[a,b,c,b,d,c]));}
    }
  }
  const temporal=temporalSurface(p,faces);
  for(const side of [-1,1]){
    const centre=eyeCenter(side);
    // Spherical corneal cap under the measured opening. The hidden back of the
    // globe cannot show through the cheek when seen from a grazing angle.
    patch(80,28,(u,v)=>{
      const x=side*mix(.163,.433,u),arc=Math.sin(Math.PI*u)**.64;
      const y=.080+.006*(u-.5)+arc*mix(-.062,.070,v);
      const dx=x-centre[0],dy=y-centre[1];
      return [x,y,centre[2]+Math.sqrt(Math.max(.00003,eyeRadius**2-dx*dx-dy*dy))];
    },side>0?3:4,side<0);
    patch(112,34,(u,v)=>earPoint(side,u,v,temporal),7,side>0);
    patch(112,14,(u,v)=>{
      const edge=earPoint(side,u,1,temporal),angle=v*Math.PI*.65;
      const tuck=1-Math.cos(angle),y=mix(edge[1],edge[1]*.86,tuck);
      const z=mix(edge[2],-.17+(edge[2]+.17)*.79,tuck);
      const room=Math.abs(edge[0])-temporal(edge[1],edge[2]);
      const x=temporal(y,z)+room*(1-Math.sin(angle))-.006*v;
      return [side*x,y,z];
    },7,side>0);
  }
  // The interior behind the free lips remains visible during an exhale.
  // It extends past both mouth corners so a widening fissure always looks
  // into the oral cavity, including through an oblique camera.
  const start=vertices.length;
  patch(48,10,(u,v)=>{
    const x=mix(-.231,.231,u),b=Math.sin(Math.PI*u)**.50;
    return [x,-.496+(v-.5)*(.103*b+.020),.540-.142*Math.pow(Math.abs(x)/.231,1.52)];
  },8);
  for(let off=start;off<vertices.length;off+=10)vertices[off+7]=-.5;
  skinGrid=makeGrid(p,faces);
  cached={vertices:new Float32Array(vertices),indices:new Uint32Array(indices)};
  return cached;
}
