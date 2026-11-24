// Coordinates are in head units with +z towards the face. Each row records a
// horizontal skull section: breadth, rear depth, and the front at seven lateral
// landmarks. Angular sampling keeps the temple continuous into the occiput.
const skull = [
  [-1.02,.045,.19, .37,.37,.37,.36,.35,.35,.34],
  [-.984,.255,.28, .51,.51,.50,.49,.46,.40,.32],
  [-.91,.396,.39, .58,.58,.57,.54,.48,.38,.25],
  [-.83,.497,.45, .60,.59,.57,.52,.45,.34,.19],
  [-.72,.579,.51, .51,.51,.50,.48,.42,.32,.17],
  [-.59,.634,.56, .53,.53,.52,.48,.415,.335,.20],
  [-.45,.653,.61,.55,.55,.54,.515,.44,.36,.22],
  [-.30,.677,.646,.55,.55,.55,.53,.47,.40,.24],
  [-.15,.702,.675,.54,.54,.55,.54,.51,.445,.26],
  [-.025,.72,.685,.52,.51,.51,.525,.513,.442,.26],
  [.10,.724,.692,.51,.485,.473,.472,.479,.418,.24],
  [.22,.722,.693,.545,.495,.456,.448,.455,.382,.20],
  [.34,.718,.689,.566,.558,.545,.539,.51,.412,.22],
  [.44,.716,.688,.595,.593,.576,.558,.51,.398,.227],
  [.59,.709,.690,.582,.583,.57,.542,.485,.392,.23],
  [.74,.687,.678,.55,.548,.533,.504,.457,.36,.21],
  [.87,.649,.649,.505,.501,.49,.465,.423,.337,.19],
  [1.00,.573,.593,.432,.430,.420,.399,.363,.287,.161],
  [1.105,.451,.494,.337,.334,.326,.310,.28,.221,.127],
  [1.17,.336,.39,.238,.236,.231,.22,.199,.16,.085],
  [1.22,.183,.245,.111,.110,.106,.100,.089,.071,.040],
  [1.24,.004,.075,-.042,-.042,-.042,-.042,-.042,-.042,-.042]
];
const xs=[0,.16,.34,.5,.66,.80,.94];
const nose=[
  [-.405,0,.080,0],[-.367,.041,.062,.024],[-.333,.134,.081,.081],
  [-.297,.228,.105,.116],[-.257,.246,.108,.085],[-.201,.218,.096,.035],
  [-.10,.174,.080,.005],[.035,.134,.078,0],[.15,.097,.077,0],
  [.257,.064,.075,0],[.34,.020,.075,0],[.409,0,.10,0]
];
const clamp=x=>Math.min(1,Math.max(0,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const sq=x=>x*x, gauss=(x,y)=>Math.exp(-x*x-y*y);
const mix=(a,b,t)=>a+(b-a)*t;
const interval=(keys,t)=>{let i=1;while(i<keys.length-1&&keys[i]<t)i++;return i-1;};
function cubic(keys, values, t) {
  const i=interval(keys,t),j=i+1,d=keys[j]-keys[i],f=clamp((t-keys[i])/d);
  const slope=k=>{
    if(k===0) return keys===xs?0:(values[1]-values[0])/(keys[1]-keys[0]);
    if(k===keys.length-1) return (values[k]-values[k-1])/(keys[k]-keys[k-1]);
    const l=(values[k]-values[k-1])/(keys[k]-keys[k-1]);
    const r=(values[k+1]-values[k])/(keys[k+1]-keys[k]);
    return l*r<=0?0:2*l*r/(l+r);
  };
  return (2*f*f*f-3*f*f+1)*values[i]+(f*f*f-2*f*f+f)*d*slope(i)
       +(-2*f*f*f+3*f*f)*values[j]+(f*f*f-f*f)*d*slope(j);
}
function table(rows){
  const keys=rows.map(row=>row[0]);
  const values=rows[0].slice(1).map((_,i)=>rows.map(row=>row[i+1]));
  return t=>values.map(col=>cubic(keys,col,t));
}
const section=table(skull), bridge=table(nose);

function skin(theta,y,row,noseRow) {
  const c=Math.cos(theta),s=Math.sin(theta), rx=row[0],x=rx*s,a=Math.abs(x);
  const side=-.065+.026*smooth(.0,.72,y);
  const jawLift=smooth(-.36,-1.02,y)*(.138*s*s*smooth(.19,.53,a)+.36*Math.max(0,-c));
  if(c<0)return [x,y+jawLift,side+(row[1]+side)*c];
  const profile=row.slice(2).map((z,i)=>(z-side)/Math.sqrt(1-xs[i]*xs[i]));
  let z=side+c*cubic(xs,profile,Math.abs(s));
  const sideMix=smooth(.1,.53,c);
  // The malar crest descends diagonally into the cheek. Leave the plane
  // under the zygoma hollow, then turn its lower edge into the masseter.
  let sculpt=.035*gauss((a-.425)/.154,(y+.032+.16*(a-.425))/.115)
      -.032*gauss((a-.452)/.128,(y+.35+.36*(a-.45))/.205)
      +.027*gauss((a-.50)/.090,(y+.56)/.16)
      +.027*gauss((a-.26)/.18,(y-.60)/.24)-.023*gauss((a-.58)/.095,(y-.48)/.19);
  const [rise,width,alar]=noseRow;
  const bridgeX=x-.006*Math.sin((y+.15)*8);
  sculpt+=rise*(.59*Math.exp(-sq(bridgeX/width))+.41*Math.exp(-sq(bridgeX/(width*1.70))))
       +.029*gauss(bridgeX/.080,(y+.247)/.048)+.017*gauss(bridgeX/.034,(y+.339)/.030)
       +alar*gauss((a-.124)/.061,(y+.285)/.112)
       -.016*gauss((a-.107)/.039,(y+.319+.16*(a-.10))/.019);
  // Two vertical columns define the philtrum; the nasolabial turn is a
  // soft plane with its deepest part immediately under the wing.
  const phil=.045+clamp((-y-.35)/.15)*.029;
  sculpt+=.007*gauss((a-phil)/.035,(y+.419)/.060)
       -.004*gauss(a/.039,(y+.423)/.063);
  const crease=.150+.47*Math.max(0,-y-.31);
  sculpt-=.011*gauss((a-crease)/.044,(y+.413)/.113);
  // The upper and lower lips have separate vermilion planes.
  const mx=x+.008;
  const u=mx/.307, m=clamp(1-u*u);
  const line=-.562-.009*u*u-.004*Math.sin(4*u)-.005*gauss(u/.18,0);
  const upper=m*(.039+.025*gauss((Math.abs(mx)-.063)/.044,0));
  const lower=m*(.071-.017*Math.abs(u));
  const dy=y-line;
  if(m>0){
    const lip=dy>=0?upper:lower;
    const t=dy>=0?dy:-dy;
    sculpt+=m*(dy>=0?.035:.050)*Math.exp(-sq((t-.47*lip)/Math.max(.018,lip*.89)));
    sculpt-=.012*m*Math.exp(-sq(dy/.009));
  }
  sculpt+=.024*gauss(a/.196,(y+.80)/.106)-.016*gauss(a/.135,(y+.665)/.036);
  sculpt-=.008*gauss((a-.303)/.038,(y+.565)/.028);
  // Eye and lids share the same limbus. The section between the eyelid
  // margins bulges like a cornea; above and below it the skin folds over it.
  const eyeX=a-.303, ex=eyeX/.154, eyeY=.148+.022*ex+.005*Math.sign(x);
  const ey=y-eyeY,k=clamp(1-ex*ex);
  const top=.077*k**.72, bottom=.048*k**.79;
  const globe=.382+.128*Math.exp(-.47*ex*ex-.42*sq(ey/.157));
  const orbital=smooth(1.43,.79,Math.hypot(ex/1.10,ey/.180));
  z+=sideMix*sculpt;
  const upperMargin=ey-top, lowerMargin=-ey-bottom;
  let lids=.010*Math.exp(-sq(upperMargin/.015))+.008*Math.exp(-sq(lowerMargin/.017));
  lids+=.020*Math.exp(-sq((upperMargin-.027)/.031))-.012*Math.exp(-sq((upperMargin-.064)/.022));
  lids+=.012*Math.exp(-sq((lowerMargin-.033)/.039))-.007*Math.exp(-sq((lowerMargin-.079)/.030));
  z=mix(z,globe+lids*Math.sqrt(k),orbital*sideMix);
  const browY=.303+.044*smooth(.09,.32,a)+.010*gauss((a-.33)/.16,0)-.049*smooth(.34,.56,a)+.008*Math.sign(x);
  z+=sideMix*(.034*gauss((a-.31)/.213,(y-browY)/.068)
    -.015*gauss((a-.11)/.028,(y-.276)/.066));
  return [x,y+jawLift,z];
}

export function lightForm() {
  const points=[], indices=[];
  function patch(n,m,point,part,reverse=false){
    const base=points.length;
    for(let j=0;j<=m;j++)for(let i=0;i<=n;i++)points.push({p:point(i/n,j/m),n:[0,0,0],part});
    for(let j=0;j<m;j++) for(let i=0;i<n;i++) {
      const a=base+j*(n+1)+i,b=a+1,c=a+n+1,d=c+1;
      if(reverse)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);
    }
    // Periodic edges must share normals; their vertex attributes remain split.
    return [base,n,m];
  }
  const periodic=[];
  const N=256,M=236;
  const rows=Array.from({length:M+1},(_,j)=>{
    const y=mix(-1.02,1.24,j/M);return [y,section(y),bridge(y)];
  });
  periodic.push(patch(N,M,(u,v)=>{
    const [y,r,no]=rows[Math.round(v*M)];return skin((u-.5)*2*Math.PI,y,r,no);
  },0));
  // Neck dives behind the mandibular angle. Widen its final sections into
  // the trapezius and shoulder, with sternomastoid tendons on the front.
  const torso=table([
    [-2.15,1.86,.76,.64,-.12],[-1.90,1.77,.72,.69,-.11],[-1.70,1.48,.59,.66,-.09],
    [-1.56,1.03,.45,.58,-.07],[-1.40,.70,.35,.48,-.065],[-1.24,.504,.284,.43,-.08],
    [-1.08,.450,.277,.40,-.072],[-.86,.431,.276,.40,-.085],[-.68,.451,.26,.38,-.11]
  ]);
  periodic.push(patch(128,100,(u,v)=>{
    const y=mix(-2.15,-.68,v),[w,front,back,off]=torso(y),a=(u-.5)*2*Math.PI;
    const x=w*Math.sin(a),c=Math.cos(a);let z=off+c*(c>0?front:back);
    if(c>0){const cx=.12+.28*clamp((y+1.62)/.83);
      z+=.041*gauss((Math.abs(x)-cx)/.071,(y+1.17)/.45)
        +.045*gauss(x/.094,(y+1.14)/.14)
        +.063*gauss((y+1.67-.06*Math.abs(x))/.041,(Math.abs(x)-.59)/.61)
        -.061*gauss(x/.14,(y+1.63)/.069);
    }
    return [x,y,z];
  },2));
  // The pinna is a folded radial surface. The inner bowl turns towards
  // the cheek, and the helix throws a narrow local shadow into the fossa.
  for(const side of [-1,1]){
    patch(100,42,(u,v)=>{
      const angle=u*2*Math.PI,co=Math.cos(angle),si=Math.sin(angle);
      const y=.037+v*(.279*si+.016*si*si);
      const uEar=v*(.150*co*(.88+.12*si)+.045*si);
      const radial=v, helix=.038*Math.exp(-sq((radial-.80)/.155));
      const fork=.020*Math.exp(-sq((radial-.50-.15*co)/.125));
      const concha=.020*gauss((uEar+.027)/.052,(y-.029)/.085);
      const tragus=.026*gauss((uEar+.070)/.021,(y-.014)/.079);
      const depth=.069+helix+fork-concha+tragus-.121*smooth(.86,1,radial);
      return [side*(.691+.64*uEar+.768*depth),y,-.055-.768*uEar+.64*depth];
    },1,side>0);
  }
  for(let k=0;k<indices.length;k+=3){
    const A=points[indices[k]],B=points[indices[k+1]],C=points[indices[k+2]];
    const x=B.p.map((v,i)=>v-A.p[i]),y=C.p.map((v,i)=>v-A.p[i]);
    const cross=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
    for(const v of [A,B,C])for(let i=0;i<3;i++)v.n[i]+=cross[i];
  }
  for(const [b,n,m] of periodic)for(let j=0;j<=m;j++){
    const a=points[b+j*(n+1)],z=points[b+j*(n+1)+n];a.n=a.n.map((v,i)=>v+z.n[i]);z.n=a.n;
  }
  const vertices=new Float32Array(points.length*7);
  points.forEach((v,i)=>{
    const n=Math.hypot(...v.n)||1;
    vertices.set([...v.p,...v.n.map(x=>x/n),v.part],i*7);
  });
  return {vertices,indices:new Uint32Array(indices)};
}
