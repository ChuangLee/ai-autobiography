// Coordinates in head lengths (chin to crown = 2.09). +Z points at the sitter's gaze.
const TAU = Math.PI * 2;
const sat = v => Math.max(0, Math.min(1, v));
const bell = (v, r) => Math.exp(-Math.min(40, (v/r)**2));
const smooth = (a,b,v) => {const k=sat((v-a)/(b-a)); return k*k*(3-2*k);};
const gauss = (x,y,cx,cy,rx,ry) => bell(x-cx,rx)*bell(y-cy,ry);
const mix = (a,b,k) => a+(b-a)*k;
function ringTable(rows,y) {
  let i=0;
  while (i<rows.length-2 && rows[i+1][0]<y) i++;
  const a=rows[i],b=rows[i+1],prev=rows[Math.max(0,i-1)],next=rows[Math.min(rows.length-1,i+2)];
  const span=b[0]-a[0], t=sat((y-a[0])/span);
  return a.slice(1).map((v,k)=>{
    const n=k+1, m0=(b[n]-prev[n])/(b[0]-prev[0])*span, m1=(next[n]-a[n])/(next[0]-a[0])*span;
    return (1+2*t)*(1-t)**2*v+t*(1-t)**2*m0+(3-2*t)*t*t*b[n]+t*t*(t-1)*m1;
  });
}
// Height, cheek-to-cheek radius, face plane, nape, outward squareness of the section.
const HEAD=[
  [-.905,.03,.34,.26,.90],[-.885,.165,.46,.07,.81],[-.83,.322,.50,-.14,.75],
  [-.735,.457,.523,-.32,.73],[-.625,.55,.485,-.44,.75],[-.46,.60,.50,-.595,.79],
  [-.26,.645,.49,-.67,.83],[-.06,.691,.485,-.714,.88],[.13,.688,.493,-.739,.90],
  [.30,.678,.540,-.755,.87],[.51,.691,.535,-.747,.90],[.72,.674,.487,-.684,.98],
  [.91,.578,.391,-.586,1.01],[1.055,.406,.254,-.460,1.04],[1.145,.234,.12,-.307,1.06],
  [1.18,.026,-.07,-.12,1.0]
];
// Articulated relief follows the bony ridges. The nasal bridge varies in breadth
// and height along its length; it is continuous with the brow and upper lip.
const NOSE=[
 [-.395,.063,0],[-.339,.056,.020],[-.303,.048,.090],[-.278,.061,.174],
 [-.25,.084,.255],[-.212,.095,.267],[-.162,.091,.257],[-.07,.079,.209],
 [.035,.075,.168],[.145,.080,.102],[.235,.089,.047],[.33,.111,.009],[.42,.12,0]
];
function relief(x,y) {
  const ax=Math.sqrt(x*x+.0003);
  const yy=y+.005*Math.tanh(x/.135)*smooth(-.55,.28,y), ex=ax-.306;
  let r=.041*gauss(ax,yy,.226,.65,.25,.32);                  // frontal eminence
  const brow=.232+.061*bell(ax-.30,.18)-.050*smooth(.36,.59,ax);
  r+=.081*bell(yy-brow,.094)*bell(ax-.295,.239);
  r+=.053*gauss(ax,yy,.062,.216,.083,.115);                  // glabella
  r-=.060*bell(ex,.195)*bell(yy-(.090+.10*ex),.111);        // orbit
  r+=.031*bell(yy-(-.001+.15*ex),.049)*bell(ex,.172);       // infraorbital rim
  r+=.074*bell(yy-(-.108+.43*(ax-.43)),.133)*bell(ax-.439,.178);
  r-=.041*bell(yy-(-.328-.45*(ax-.46)),.17)*bell(ax-.461,.178);
  r-=.046*gauss(ax,yy,.608,.19,.088,.216);                  // temple
  r+=.038*gauss(ax,yy,.522,-.48,.121,.19);                 // masseter
  const [w,h]=ringTable(NOSE,yy);
  r+=h*bell(x+.003*bell(yy+.1,.3),w*1.13);
  r+=.061*gauss(ax,yy,.102,-.098,.080,.166);
  r+=.124*gauss(ax,yy,.115,-.235,.055,.058);                // alar cartilage
  r-=.052*gauss(ax,yy+.19*(ax-.10),.098,-.277,.046,.017);
  r+=.032*gauss(ax,yy,.01,-.285,.037,.047);
  r-=.022*gauss(ax,yy,.16,-.247,.020,.047);
  r+=.063*gauss(ax,yy,.084,-.391,.13,.104);
  r+=.011*bell(ax-(.038+.040*sat((-.32-yy)/.17)),.030)*bell(yy+.38,.063);
  r-=.012*bell(ax-(.154+.42*sat(-yy-.25)),.041)*bell(yy+.405,.126);
  r-=.041*gauss(ax,yy,.00,-.615,.176,.041);
  r+=.080*gauss(ax,yy,.103,-.739,.190,.113);                 // mental eminence
  return r;
}
function front(x,y) {
  const [w,f,b,shape]=ringTable(HEAD,y);
  const cosine=Math.sqrt(Math.max(0,1-(Math.min(.999,Math.abs(x)/w))**(2/shape)));
  return (f+b)/2+(f-b)*.5*cosine**shape+relief(x,y)*smooth(.06,.75,cosine);
}
const TORSO=[
  [-2.36,1.54,.50,-.55,.79],[-1.77,1.43,.57,-.57,.79],[-1.62,1.31,.56,-.54,.80],
  [-1.53,1.15,.51,-.51,.83],[-1.44,.90,.42,-.49,.84],[-1.36,.70,.33,-.47,.89],
  [-1.22,.454,.242,-.466,.97],[-1.04,.383,.249,-.469,1.0],[-.85,.362,.239,-.477,.98],
  [-.65,.369,.23,-.48,1.],[-.48,.383,.16,-.47,1.]
];
function chestRelief(x,y){
  const ax=Math.abs(x), anchor=.113+Math.max(0,y+1.49)*.37;
  const scm=.046*bell(ax-anchor,.067)*bell(y+1.08,.375);
  const clavicle=-1.495+.125*Math.sin(Math.min(ax,1.29)/1.29*Math.PI*.75);
  return scm+.035*gauss(ax,y,0,-1.005,.088,.079)+.033*bell(y-clavicle,.043)*bell(ax-.57,.53)
    -.048*bell(y-clavicle+.065,.043)*bell(ax-.49,.44)-.052*gauss(ax,y,0,-1.425,.148,.073)
    +.06*gauss(ax,y,.53,-1.67,.40,.18)-.023*bell(x,.04)*bell(y+1.68,.16);
}
// The moving letters ride the same positive-Z surface that the indexed torso uses.
export function chestPoint(u,y) {
  const [w,f,b,s]=ringTable(TORSO,y), x=w*u, cs=Math.sqrt(Math.max(0,1-Math.abs(u)**(2/s)));
  return [x,y,(f+b)*.5+(f-b)*.5*cs**s+chestRelief(x,y)*smooth(.06,.75,cs)];
}
export function makePlanesMesh(){
  const vertices=[], indices=[];
  // The derivative is evaluated on the smooth patch itself. Adjacent patches can
  // meet along a tight crease without a faceted seam in the skull or cornea.
  function patch(nu,nv,evalPoint,tag,flip=false){
    const start=vertices.length/10;
    for(let v=0;v<=nv;v++) for(let u=0;u<=nu;u++){
      const s=u/nu,t=v/nv,p=evalPoint(s,t);
      const pl=evalPoint(Math.max(0,s-.00016),t),pr=evalPoint(Math.min(1,s+.00016),t);
      const pb=evalPoint(s,Math.max(0,t-.00016)),pt=evalPoint(s,Math.min(1,t+.00016));
      const a=pr.map((x,i)=>x-pl[i]), b=pt.map((x,i)=>x-pb[i]);
      const n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
      const l=(flip?-1:1)*(Math.hypot(...n)||1);
      vertices.push(...p,...n.map(x=>x/l),s,t,tag,0);
      if(u<nu&&v<nv){const i=start+v*(nu+1)+u; indices.push(i,i+1,i+nu+1,i+1,i+nu+2,i+nu+1);}
    }
  }
  function sections(table,reliefFn,tag,nu,nv){
    patch(nu,nv,(u,v)=>{
      const y=mix(table[0][0],table.at(-1)[0],v),[w,f,b,s]=ringTable(table,y);
      const a=TAU*(u-.5),sn=Math.sin(a),cs=Math.cos(a);
      const x=w*Math.sign(sn)*Math.abs(sn)**s;
      const z=(f+b)*.5+(f-b)*.5*Math.sign(cs)*Math.abs(cs)**s+reliefFn(x,y)*smooth(.06,.75,cs);
      return [x,y,z];
    },tag);
  }
  sections(TORSO,chestRelief,2,112,68);
  sections(HEAD,relief,1,192,182);
  for(const side of [-1,1]){
    const inner=.139, outer=.471;
    const line=u=>.061+.035*u+.006*side;
    const arc=u=>Math.sin(Math.PI*u)**.78;
    const high=u=>line(u)+arc(u)*(.065-.012*u);
    const low=u=>line(u)-arc(u)*(.040+.007*u);
    const eyeFront=(u,v)=>{
      const x=mix(inner,outer,u),y=mix(low(u),high(u),v);
      const bulge=arc(u)*(.024+.011*Math.sin(Math.PI*v));
      return front(side*x,y)+.006+bulge;
    };
    patch(70,22,(u,v)=>[side*mix(inner,outer,u), mix(low(u),high(u),v),eyeFront(u,v)],side>0?3:4,side<0);
    for(const upper of [false,true]){
      patch(72,18,(u,v)=>{
        const x=mix(inner,outer,u), yy=upper?high(u):low(u), d=(upper?.080:-.060)*arc(u)*v;
        const y=yy+d, target=front(side*x,y);
        const z=mix(eyeFront(u,upper?1:0)+.004,target-.0013,v*v*(3-2*v))
          +(upper?.014:.010)*Math.sin(Math.PI*v)*arc(u);
        return [side*x,y,z];
      },upper?5:6,(side<0)===upper);
    }
    // Recessed auricle. The projecting helix, antihelix and tragus catch separate bands of light.
    patch(76,29,(u,v)=>{
      const a=u*TAU, cs=Math.cos(a), sn=Math.sin(a);
      const y=-.013+v*.209*sn, z=-.077+v*.122*cs+v*.047*sn;
      const rim=.054*bell(v-.846,.124), fold=.026*bell(v-.48,.14)*smooth(-.58,.54,sn);
      const tragus=.026*bell(sn+.15,.34)*smooth(.45,.86,cs)*bell(v-.53,.20);
      const anti=.026*bell(v*(cs+.21*sn)+.12,.13)*bell(v*sn-.11,.44);
      const x=.679+.030*v+.026*v*sn-.034*v*cs+.82*rim+fold*.63+anti+tragus-.006*bell(v,.39);
      return [side*x,y,z];
    },7,side<0);
  }
  const seam=u=>-.476+.005*bell(Math.abs(u)-.43,.29)-.005*bell(u,.25)-.008*Math.abs(u)**1.8;
  for(const upper of [false,true]){
    patch(110,20,(s,v)=>{
      const u=2*s-1, x=u*.249, q=Math.max(0,1-u*u), y0=seam(u);
      const h=upper?(.052+.012*bell(Math.abs(u)-.31,.27)-.007*bell(u,.19)):(-.066+.010*Math.abs(u));
      const y=y0+h*q**.68*v;
      const bulge=q**.84*((upper?.014:.022)*(1-v)**2+Math.sin(Math.PI*v)*(1-v*v)*(upper?.029:.036));
      return [x,y,front(x,y)+bulge-(v*v)*.0007];
    },upper?8:9,!upper);
  }
  return {vertices:new Float32Array(vertices),indices:new Uint32Array(indices)};
}
