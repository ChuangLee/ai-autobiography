// A section through each carved surface. Coordinates run down the page, with the nose toward +z.
import { curveN } from '../verse4/common.js';
const headProfile=curveN([
 [-1.04,.006,-.08,.006],[-1.015,.154,-.088,.160],[-.96,.290,-.101,.292],
 [-.87,.411,-.108,.402],[-.73,.500,-.088,.484],[-.56,.544,-.067,.519],
 [-.36,.552,-.052,.536],[-.20,.549,-.039,.527],[-.035,.548,-.027,.522],
 [.10,.519,-.016,.514],[.22,.472,.002,.493],[.34,.466,.043,.443],
 [.455,.452,.088,.380],[.556,.374,.165,.305],[.647,.245,.226,.226],
 [.690,.133,.276,.113],[.704,.003,.299,.006]
]);
const bodyProfile=curveN([
 [.30,.185,-.012,.186],[.48,.222,-.020,.220],[.67,.254,-.039,.235],
 [.81,.250,-.063,.232],[.925,.337,-.044,.275],[1.015,.428,-.049,.304],
 [1.095,.592,-.070,.337],[1.195,.928,-.100,.398],[1.305,1.119,-.100,.451],
 [1.49,1.220,-.075,.490],[1.86,1.311,-.061,.535],[2.1,1.36,-.065,.55]
]);
const sq=n=>n*n;
const bell=(x,y)=>Math.exp(-x*x-y*y);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function faceRelief(x,y){
 const a=Math.abs(x),ex=(a-.231)/.125;
 const tilt=(a-.231)*.102, lid=y+.185+tilt, bow=-.267-.036*Math.exp(-sq((a-.23)/.16));
 const line=.334-.004*Math.exp(-sq((a-.048)/.036))+.004*sq(a/.19)+.002*x/.18;
 const lip=y-line, span=Math.exp(-Math.pow(a/.174,4));
 const brow=.069*bell((a-.216)/.146,(y-bow)/.064);
 const orbit=-.063*bell(ex*.85,lid/.096)+.035*bell(ex,lid/.057);
 const cheeks=.065*bell((a-.344)/.126,(y-.011)/.107)-.038*bell((a-.346)/.151,(y-.224)/.134);
 const nose=.106*bell(x/.078,(y+.077)/.214)+.078*bell(x/.091,(y-.077)/.168)
   +.119*bell(x/.088,(y-.114)/.069)+.079*bell((a-.092)/.047,(y-.147)/.042)
   -.028*bell((a-.071)/.030,(y-.163)/.014);
 const mouth=.042*bell(x/.213,(y-.308)/.151)+span*(.031*Math.exp(-sq((lip+.020)/.024))+
   .048*Math.exp(-sq((lip-.028)/.032))-.015*Math.exp(-sq(lip/.009)));
 const philtrum=.006*bell((a-.026)/.022,(y-.248)/.058)-.004*bell(x/.025,(y-.255)/.059);
 const rim=1.-Math.min(1.,ex*ex);
 const lids=.018*bell(ex,(lid+.036*rim)/.014)+.018*bell(ex,(lid-.023*rim)/.019);
 const chin=.051*bell(x/.166,(y-.545)/.087)-.015*bell(x/.138,(y-.459)/.026);
 return brow+orbit+cheeks+nose+mouth+philtrum+lids+chin
   +.020*bell(x/.091,(y+.283)/.126)-.027*bell((a-.442)/.092,(y+.270)/.148);
}
function head(theta,y){
 const [rx,cz,rz]=headProfile(y),x=rx*Math.sin(theta),c=Math.cos(theta);
 const face=Math.min(1.,Math.max(0.,(c-.14)*2.24));
 let z=cz+rz*Math.sign(c)*Math.pow(Math.abs(c),.72)+face*faceRelief(x,y);
 // The hinge of the mandible sits higher at the ear than the chin.
 let yy=y-.067*(1.-Math.max(c,0.))*Math.exp(-sq((y-.472)/.191));
 return [x,yy,z];
}
function torso(theta,y){
 const [rx,cz,rz]=bodyProfile(y),x=rx*Math.sin(theta),c=Math.cos(theta),a=Math.abs(x);
 const collar=1.176-.089*Math.min(a,.85)+.012*Math.sin(a*9);
 const tendon=.074+.266*clamp((.99-y)/.44,0.,1.);
 const relief=.032*bell((y-collar)/.026,(a-.408)/.46)-.035*bell(x/.091,(y-1.131)/.056)
   +.040*bell((a-tendon)/.049,(y-.822)/.216)+.039*bell(x/.061,(y-.808)/.072)
   +.063*bell((a-.484)/.354,(y-1.373)/.195);
 return [x,y,cz+rz*c+Math.max(0.,c)*relief];
}
function ear(theta,v,side){
 const r=v,cs=Math.cos(theta),sn=Math.sin(theta),up=Math.max(0,-sn),lobe=Math.max(0,sn);
 const u=r*cs*(1.-.33*lobe+.14*up),sy=r*sn;
 const y=-.070+sy*.202,z=.019+u*.112+.027*sy-.018*up*r;
 const helix=Math.exp(-sq((r-.83)/(.115+.047*up)))*clamp(.80+.49*up-.76*Math.max(0,cs)-.52*lobe,.08,1.1);
 const stem=.22+.35*sy+.13*sy*sy;
 const fork=.19+sy*.69;
 const antihelix=.029*bell((u-stem)/.17,(sy+.04)/.49)+.021*bell((u-fork)/.15,(sy+.35)/.20);
 const tragus=.033*bell((u-.55)/.20,(sy-.03)/.22);
 const cavity=.032*bell((u-.02)/.30,(sy-.11)/.28);
 const ax=.517+.018*(1.-u)+.045*helix+antihelix+tragus-cavity+.026*bell((u+.025)/.40,(sy-.68)/.22);
 return [side*ax,y,z];
}
export function sculpture(){
 const vertices=[],indices=[];
 function surface(evalPoint,mat,axial,levels,lo,hi,closed=true){
   const start=vertices.length/7;
   for(let j=0;j<=levels;j++){
     const v=j/levels,y=lo+(hi-lo)*v;
     for(let i=0;i<=axial;i++){
       const u=i/axial,theta=(u*2-1)*Math.PI,point=evalPoint(theta,y);
       const a=evalPoint(theta+.0006,y),b=evalPoint(theta-.0006,y);
       const yp=evalPoint(theta,Math.min(hi,y+.0005)),ym=evalPoint(theta,Math.max(lo,y-.0005));
       const dx=a.map((n,k)=>n-b[k]),dy=yp.map((n,k)=>n-ym[k]);
       let nx=dx[1]*dy[2]-dx[2]*dy[1],ny=dx[2]*dy[0]-dx[0]*dy[2],nz=dx[0]*dy[1]-dx[1]*dy[0];
       if(!closed&&nx*point[0]<0){nx=-nx;ny=-ny;nz=-nz;}
       const n=Math.hypot(nx,ny,nz)||1;
       vertices.push(...point,nx/n,ny/n,nz/n,mat);
       if(i<axial&&j<levels){const p=start+j*(axial+1)+i;indices.push(p,p+1,p+axial+1,p+1,p+axial+2,p+axial+1);}
     }
   }
 }
 surface(torso,1,132,96,.30,2.10);surface(head,0,236,192,-1.04,.704);
 surface((a,r)=>ear(a,r,-1),2,72,26,.008,1,false);surface((a,r)=>ear(a,r,1),2,72,26,.008,1,false);
 return {vertices:new Float32Array(vertices),indices:new Uint32Array(indices)};
}
