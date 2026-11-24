// A standing figure drawn in transverse sections. The skin relief is part of the
// surface, so the nose, closed eyes and rib cage keep their shape in side light.
export const tidalWater=-1.8;
// Extrema of the bowed indexed head, immediately inside the two tangent planes.
export const tidalHeadBounds=[-.3023684024810791,.3137069046497345];
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const bell=(x,w)=>Math.exp(-((x/w)**2));
const bump=(x,y,cx,cy,w,h)=>Math.exp(-(((x-cx)/w)**2+((y-cy)/h)**2));

// Interpolate section radii without flattening the temple or sharpening the jaw.
function section(rows,y){
  let i=1;while(i<rows.length-1&&rows[i][0]<y)i++;
  const a=rows[i-1],b=rows[i],l=rows[Math.max(0,i-2)],r=rows[Math.min(rows.length-1,i+1)];
  const dy=b[0]-a[0],u=clamp((y-a[0])/dy,0,1),v=1-u;
  return a.slice(1).map((_,j)=>{
    const k=j+1;
    return (1+2*u)*v*v*a[k]+(3-2*u)*u*u*b[k]
      +u*v*v*dy*(b[k]-l[k])/(b[0]-l[0])-u*u*v*dy*(r[k]-a[k])/(r[0]-a[0]);
  });
}
// y, half breadth, front depth, rear depth, centre z.
export const tidalNod=.34;
const tiltC=Math.cos(tidalNod),tiltS=Math.sin(tidalNod);
function bow(p){
  const y=p[1]+.242,z=p[2]+.033;
  return [p[0],-.242+y*tiltC-z*tiltS,-.033+y*tiltS+z*tiltC];
}
const head=[
  [-.260,.006,.018,.020,.065],[-.252,.061,.062,.056,.055],[-.231,.102,.112,.092,.029],
  [-.211,.128,.135,.110,.015],[-.163,.151,.152,.121,.002],[-.108,.162,.156,.145,-.001],
  [-.041,.179,.161,.176,-.006],[.035,.190,.172,.192,-.009],[.111,.195,.174,.202,-.013],
  [.187,.190,.162,.197,-.017],[.236,.174,.146,.184,-.019],[.282,.144,.128,.155,-.020],
  [.311,.103,.094,.110,-.021],[.330,.054,.050,.058,-.020],[.338,.003,.003,.003,-.020]
];
// The upper lid crosses a shallow cornea; the tear duct is slightly lower
// than the outer corner. The lid, its corneal ribbon and its shadow share it.
const landmarkRise=.033;
function eyeSeam(u){return landmarkRise+.019-.0082*(u-.5)+.0017*Math.sin(Math.PI*u);}
function faceRelief(x,y){
  const jawY=y;y-=landmarkRise;
  const a=Math.abs(x),u=clamp((a-.031)/.117,0,1),arc=Math.sin(Math.PI*u);
  const lid=eyeSeam(u)-landmarkRise,eyeSpan=smooth(.021,.047,a)*(1-smooth(.135,.162,a));
  const lip=-.144+.0018*bell(a-.022,.013)-.0080*smooth(.022,.069,a);
  // The brow runs laterally around the orbit. The upper bridge is broad and
  // recedes at the inner eye instead of continuing straight into the forehead.
  let d=.005*bump(a,y,.084,.110,.100,.088)+.004*bump(x,y,0,.049,.055,.037);
  const brow=.058+.009*arc-.005*u;
  d-=.0165*bump(a,y,.090,.024,.059,.035);
  d+=.020*bump(a,y,.083,brow,.063,.024);
  d+=eyeSpan*(.019*bell(y-lid-.014,.019)-.004*bell(y-lid-.034,.0065)+.005*bell(y-lid+.012,.016)-.002*bell(y-lid,.0045));
  d+=.018*bump(a,y,.115,-.049,.055,.041)-.004*bump(a,y,.112,-.126,.049,.058);
  const width=.029+.015*smooth(-.014,.050,y);
  d+=.034*bump(x,y,0,-.025,width,.054)+.017*bump(x,y,0,-.046,.027,.038);
  d+=.047*bump(x,y,0,-.073,.026,.025)+.007*bump(x,y,0,-.088,.011,.012);
  d+=.036*bump(a,y,.036,-.073,.016,.016)-.0065*bump(a,y,.051,-.078,.0065,.014);
  d-=.010*bump(a,y,.030,-.086,.009,.005);
  d+=.0020*bump(a,y,.010,-.119,.007,.020);
  d+=.012*bump(x,y,0,-.140,.076,.034);
  d+=bell(a,.061)*(.0070*bell(y-lip-.005,.009)+.010*bell(y-lip+.008,.011)-.0040*bell(y-lip,.0028));
  d+=.016*bump(x,jawY,0,-.205,.084,.035)-.003*bump(x,y,0,-.173,.061,.012);
  d+=.005*bump(a,jawY,.113,-.166,.041,.049);
  return d;
}
function headPoint(y,s,c,row){
  const [w,front,back,z]=row;
  return [s*w,y,z+(c>0?front:back)*c+(c>0?faceRelief(w*s,y)*smooth(0,.55,c):0)];
}
export function tidalFacePoint(x,y){
  const row=section(head,y),s=clamp(x/row[0],-1,1);
  return bow(headPoint(y,s,Math.sqrt(1-s*s),row));
}
export function tidalCheekPoint(x,y,t){return tidalFacePoint(x,y);}

const body=[
  [-2.18,.331,.182,.170,0],[-1.95,.381,.205,.190,-.005],[-1.75,.392,.190,.175,-.010],
  [-1.54,.348,.178,.181,-.012],[-1.36,.345,.188,.187,-.012],[-1.21,.374,.207,.207,-.012],
  [-1.06,.427,.225,.217,-.011],[-.91,.453,.234,.233,-.010],[-.78,.482,.242,.235,-.009],
  [-.65,.506,.211,.208,-.015],[-.565,.481,.172,.173,-.025],[-.514,.431,.153,.148,-.034],
  [-.473,.303,.127,.139,-.036],[-.435,.183,.119,.130,-.035],[-.399,.139,.115,.131,-.035],
  [-.332,.120,.104,.119,-.034],[-.266,.117,.104,.110,-.025],[-.205,.110,.100,.099,-.001],
  [-.169,.093,.089,.082,.024]
];
function bodyRelief(x,y){
  const a=Math.abs(x),f=clamp(a/.485,0,1);
  const clav=-.527+.057*Math.sin(f*2.76)-.018*bell(a,.068);
  const lowerPec=-.966+.087*((a-.225)/.246)**2+.085*smooth(.30,.48,a);
  const rib=-1.063-.190*smooth(.05,.31,a)+.022*smooth(.28,.44,a);
  const pec=smooth(-.032,.083,a)*(1-smooth(.394,.496,a));
  let z=.026*bell(y-clav,.018)*(1-smooth(.41,.52,a));
  z+=.059*pec*bell(y+.780,.165)+.024*pec*bell(y-lowerPec-.042,.069);
  z-=.010*pec*bell(y-lowerPec+.003,.026);
  z-=.008*bell(x,.029)*bell(y+.76,.152);
  z+=.011*bell(y-rib,.052)*smooth(.022,.10,a)*(1-smooth(.28,.435,a));
  const abLine=.111+.014*Math.sin((y+1.4)*5.);
  for(const mid of [-1.121,-1.303,-1.492,-1.674]){
    z+=.011*bump(a,y,abLine,mid,.098,.083);
  }
  z-=.004*bell(x,.024)*bell(y+1.39,.31);
  z+=.019*bell(a-(.29+.032*Math.sin(y*5.)),.047)*bell(y+1.35,.27);
  z+=.017*bell(a-(.029+.183*(y+.46)),.019)*bell(y+.34,.13);
  return z;
}
// Each arm descends independently from the deltoid, passes through the elbow,
// and continues below the water. The radius changes on both axes.
const arm=[
 [-2.12,.831,.064,.077,.059],[-1.95,.808,.060,.064,.045],[-1.79,.786,.063,.073,.032],
 [-1.61,.750,.081,.094,.015],[-1.47,.716,.095,.101,-.004],[-1.32,.672,.080,.085,-.028],
 [-1.23,.653,.080,.090,-.036],[-1.11,.626,.089,.108,-.030],[-.97,.592,.108,.116,-.010],
 [-.84,.559,.108,.112,-.003],[-.75,.533,.111,.135,-.006],[-.66,.505,.121,.143,-.009],
 [-.58,.477,.118,.129,-.014],[-.525,.456,.092,.086,-.014],[-.486,.445,.009,.012,-.018]
];
// A single zero-isosurface joins the deltoids to the rib cage. Horizontal
// slices retain each measured-style transverse profile, including the space
// between the waist and the arms. Average edge crossings form the skin mesh.
function addBody(verts,inds){
 const X=153,Y=170,Z=55,dx=.012,dy=.012,dz=.013;
 const ox=-.912,oy=-2.182,oz=-.335;
 const yz=Y*Z,values=new Float32Array(X*yz);
 for(let j=0;j<Y;j++){
   const y=oy+j*dy;
   const [w,front,back,cz]=section(body,y),[ac,aw,ar,az]=section(arm,y);
   const merge=.081*smooth(-1.00,-.66,y)*(1-smooth(-.52,-.41,y));
   const armEnd=smooth(-.51,-.484,y);
   for(let i=0;i<X;i++){
     const x=ox+i*dx,a=Math.abs(x),bx2=(x/w)**2,ax2=((a-ac)/Math.max(.008,aw))**2;
     const c=Math.sqrt(Math.max(0,1-bx2));
     const bodyFront=front+(c>.001?bodyRelief(x,y)*smooth(0,.64,c)/c:0);
     const biceps=.018*bell(y+1.0,.14);
     for(let k=0;k<Z;k++){
       const z=oz+k*dz;
       const bd=(Math.sqrt(bx2+((z-cz)/(z>cz?bodyFront:back))**2)-1)*Math.min(w,front);
       const ad=(Math.sqrt(ax2+((z-az)/(ar+(z>az?biceps:0)))**2)-1)*Math.min(aw,ar)+armEnd*.044;
       const armDistance=y>-.48?ad+(y+.48)*2:ad;
       const join=Math.max(merge-Math.abs(bd-armDistance),0);
       values[i*yz+j*Z+k]=Math.min(bd,armDistance)-(merge>1e-8?join*join/(4*merge):0);
     }
   }
 }
 const ids=new Int32Array(values.length);ids.fill(-1);
 const offsets=[0,yz,Z,yz+Z,1,yz+1,Z+1,yz+Z+1];
 const edges=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
 for(let i=0;i<X-1;i++)for(let j=0;j<Y-1;j++)for(let k=0;k<Z-1;k++){
   const base=i*yz+j*Z+k,sign=values[base]<0;
   if(offsets.every(d=>(values[base+d]<0)===sign))continue;
   let px=0,py=0,pz=0,hits=0;
   for(const [a,b] of edges){
     const va=values[base+offsets[a]],vb=values[base+offsets[b]];
     if((va<0)===(vb<0))continue;
     const t=va/(va-vb);
     px+=(a&1)+t*((b&1)-(a&1));py+=((a>>1)&1)+t*(((b>>1)&1)-((a>>1)&1));
     pz+=(a>>2)+t*((b>>2)-(a>>2));hits++;
   }
   const x=ox+(i+px/hits)*dx,y=oy+(j+py/hits)*dy,z=oz+(k+pz/hits)*dz;
   ids[base]=verts.length/7;verts.push(x,y,z,0,0,0,Math.abs(x)>.486?2:0);
 }
 const axes=[[yz,Z,1],[Z,1,yz],[1,yz,Z]];
 for(let i=1;i<X-1;i++)for(let j=1;j<Y-1;j++)for(let k=1;k<Z-1;k++){
   const n=i*yz+j*Z+k;
   if(ids[n]<0)continue;
   for(const [along,u,v] of axes){
     if((values[n]<0)===(values[n+along]<0))continue;
     const a=ids[n],b=ids[n-u],c=ids[n-u-v],d=ids[n-v];
     if(b<0||c<0||d<0)continue;
     if(values[n]<0)inds.push(a,b,c,a,c,d);else inds.push(a,d,c,a,c,b);
   }
 }
}

function addHead(verts,inds){
 function rings(y0,y1,rows,cols,mat,sample){
   const base=verts.length/7;
   const angles=Array.from({length:cols},(_,j)=>[Math.sin(TAU*j/cols),Math.cos(TAU*j/cols)]);
   for(let i=0;i<=rows;i++){
     const y=y0+(y1-y0)*i/rows,pos=sample(y);
     for(const [s,c] of angles){const p=pos(s,c);verts.push(...p,0,0,0,mat);}
   }
   for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
     const a=base+i*cols+j,b=base+i*cols+(j+1)%cols;
     inds.push(a,b,a+cols,b,b+cols,a+cols);
   }
 }
 rings(head[0][0],head.at(-1)[0],170,160,1,y=>{const row=section(head,y);return (s,c)=>bow(headPoint(y,s,c,row));});
 for(const side of [-1,1]){
   rings(-.109,.037,30,44,3,y=>{
     const f=(y+.036)/.074,k=Math.sqrt(Math.max(.0001,1-f*f));
     return (s,c)=>{
       const outward=s*side;
       const q=c*k,r=Math.sqrt(q*q+f*f);
       const rolled=.0095*bell(r-.79,.12)*(1-smooth(.60,.94,-f));
       const bowl=.021*bump(q,f,.12,.02,.38,.43);
       const fork=.007*bell(q+.22-.27*f,.12)*bell(f-.15,.56);
       const tragus=.0078*bump(q,f,.49,-.11,.17,.24);
       const fold=(rolled-bowl+fork+tragus)*smooth(.10,.74,outward);
       return bow([side*(.176+.006*f+fold)+s*.031*k,y,-.012+.042*k*c+.010*f]);};
   });
 }
 // A corneal ribbon sits physically between the two lids. Its dome rises
 // most at the centre of the opening and disappears under the lid margins.
 for(const side of [-1,1]){
   const base=verts.length/7,across=46,high=8;
   for(let j=0;j<=high;j++)for(let i=0;i<=across;i++){
     const u=i/across,v=j/high,x=side*(.034+.112*u),arc=Math.sin(Math.PI*u);
     const line=eyeSeam((Math.abs(x)-.031)/.117);
     const y=line+(.0125*v-.0037)*arc, row=section(head,y),sx=x/row[0];
     const point=headPoint(y,sx,Math.sqrt(1-sx*sx),row);
     point[2]+=.00065+.0035*arc*Math.sin(Math.PI*v);
     verts.push(...bow(point),0,0,0,4);
   }
   for(let j=0;j<high;j++)for(let i=0;i<across;i++){
     const a=base+j*(across+1)+i,b=a+1,c=a+across+1,d=c+1;
     if(side>0)inds.push(a,b,c,b,d,c);else inds.push(a,c,b,b,c,d);
   }
 }
}
let cached;
export function makeTidalMesh(){
 if(cached)return cached;
 const verts=[],inds=[];
 addHead(verts,inds);addBody(verts,inds);
 // Vertex normals come from the same triangles the distant coda projects.
 for(let i=0;i<inds.length;i+=3){
   const a=7*inds[i],b=7*inds[i+1],c=7*inds[i+2];
   const x=verts[b]-verts[a],y=verts[b+1]-verts[a+1],z=verts[b+2]-verts[a+2];
   const u=verts[c]-verts[a],v=verts[c+1]-verts[a+1],w=verts[c+2]-verts[a+2];
   const nx=y*w-z*v,ny=z*u-x*w,nz=x*v-y*u;
   for(const k of [a,b,c]){verts[k+3]+=nx;verts[k+4]+=ny;verts[k+5]+=nz;}
 }
 for(let j=0;j<verts.length;j+=7){
   const n=Math.hypot(verts[j+3],verts[j+4],verts[j+5]);
   if(n>1e-12){
     verts[j+3]/=n;verts[j+4]/=n;verts[j+5]/=n;
   }else if(verts[j+6]===4){
     // At each tear duct the upper and lower edge of the ribbon meet.
     verts[j+3]=0;verts[j+4]=-tiltS;verts[j+5]=tiltC;
   }else{
     const r=Math.hypot(verts[j],verts[j+2])||1;
     verts[j+3]=verts[j]/r;verts[j+4]=0;verts[j+5]=verts[j+2]/r;
   }
 }
 cached={vertices:new Float32Array(verts),indices:new Uint32Array(inds),stride:28};
 return cached;
}

// Horizontal silhouette for the smaller window figures, sampled on the bowed
// head's actual triangles. Angle zero faces the camera and turns toward +X.
let cutCache;
function headCuts(){
 if(cutCache)return cutCache;
 const raw=[],indices=[],bins=new Map();
 addHead(raw,indices);
 const v=new Float32Array(raw);
 for(let i=0;i<indices.length;i+=3){
   const a=indices[i]*7,b=indices[i+1]*7,c=indices[i+2]*7;
   const lo=Math.floor(Math.min(v[a+1],v[b+1],v[c+1])*128);
   const hi=Math.floor(Math.max(v[a+1],v[b+1],v[c+1])*128);
   for(let bin=lo;bin<=hi;bin++){
     let bucket=bins.get(bin);if(!bucket){bucket=[];bins.set(bin,bucket);}
     bucket.push(a,b,c);
   }
 }
 cutCache={v,bins};return cutCache;
}
export function tidalHeadRing(y,count){
 const {v,bins}=headCuts(),bucket=bins.get(Math.floor(y*128));
 if(!bucket)return [];
 const segments=[];
 for(let i=0;i<bucket.length;i+=3){
   const a=bucket[i],b=bucket[i+1],c=bucket[i+2];
   const ay=v[a+1],by=v[b+1],cy=v[c+1];
   if(y<Math.min(ay,by,cy)||y>=Math.max(ay,by,cy))continue;
   const cut=[];
   for(const [p,q] of [[a,b],[b,c],[c,a]]){
     if((v[p+1]<=y)===(v[q+1]<=y))continue;
     const t=(y-v[p+1])/(v[q+1]-v[p+1]);
     cut.push([v[p]+(v[q]-v[p])*t,v[p+2]+(v[q+2]-v[p+2])*t]);
   }
   if(cut.length===2)segments.push(cut);
 }
 if(!segments.length)return [];
 let lo=Infinity,hi=-Infinity;
 for(const [a,b] of segments){lo=Math.min(lo,a[1],b[1]);hi=Math.max(hi,a[1],b[1]);}
 const zc=(lo+hi)*.5;
 return Array.from({length:count},(_,i)=>{
   const angle=TAU*i/count,x=Math.sin(angle),z=Math.cos(angle);let r=0;
   for(const [a,b] of segments){
     const dx=b[0]-a[0],dz=b[1]-a[1],den=x*dz-z*dx;
     if(Math.abs(den)<1e-12)continue;
     const ax=a[0],az=a[1]-zc;
     const ray=(ax*dz-az*dx)/den,t=(ax*z-az*x)/den;
     if(t>=-1e-8&&t<=1.00000001)r=Math.max(r,ray);
   }
   return [r*x,y,zc+r*z];
 });
}
