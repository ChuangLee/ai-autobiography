// Box and ellipsoid intersections keep the parallax of the recess, the room
// beyond it and the chair on the other side of a body made of strokes.
export const furniture=`
struct Hit{d:f32,n:vec3f,mat:u32}
fn miss()->Hit{return Hit(10000.,vec3f(0.,1.,0.),0u);}
fn nearest(a:Hit,b:Hit)->Hit{if(b.d<a.d){return b;}return a;}
fn box(ro:vec3f,rd:vec3f,c:vec3f,r:vec3f,mat:u32)->Hit{
 let v=ro-c;let inv=1./select(rd,vec3f(.00001),abs(rd)<vec3f(.00001));
 let x=-(v*inv);let k=abs(inv)*r;let lo=x-k;let hi=x+k;
 let n=max(max(lo.x,lo.y),lo.z);let f=min(min(hi.x,hi.y),hi.z);
 if(n>f||f<.004){return miss();}
 if(n<.003){return Hit(f,sign(rd)*step(hi, min(hi.yzx,hi.zxy)),mat);}
 return Hit(n,-sign(rd)*step(max(lo.yzx,lo.zxy),lo),mat);
}
fn oval(ro:vec3f,rd:vec3f,c:vec3f,s:vec3f,mat:u32)->Hit{
 let v=(ro-c)/s;let e=rd/s;let a=dot(e,e);let b=dot(e,v);let h=b*b-a*(dot(v,v)-1.);
 if(h<=0.){return miss();}let t=(-b-sqrt(h))/a;if(t<.003){return miss();}
 return Hit(t,normalize((v+t*e)/s),mat);
}
fn rail(ro:vec3f,rd:vec3f,a:vec3f,b:vec3f,r:f32,mat:u32)->Hit{
 let ba=b-a;let oa=ro-a;let v=dot(ba,ba);let br=dot(ba,rd);let bo=dot(ba,oa);
 let den=v-br*br;let mid=v*dot(rd,oa)-bo*br;let c=v*(dot(oa,oa)-r*r)-bo*bo;
 let disc=mid*mid-den*c;
 if(disc<0.||den<.00001){return miss();}
 let t=(-mid-sqrt(disc))/den;let h=bo+t*br;
 if(t<.004||h<0.||h>v){return miss();}
 return Hit(t,normalize(oa+t*rd-ba*(h/v)),mat);
}
// Rounded plan and a softer, smaller bevel across the edge of the tabletop.
fn slabSdf(p:vec3f,halfSize:vec3f)->f32{
 let edge=.066;let q=abs(p.xz)-halfSize.xz+edge;
 let outline=length(max(q,vec2f(0.)))+min(max(q.x,q.y),0.)-edge;
 let bevel=.017;let sides=vec2f(outline,abs(p.y)-halfSize.y)+bevel;
 return length(max(sides,vec2f(0.)))+min(max(sides.x,sides.y),0.)-bevel;
}
fn slab(ro:vec3f,rd:vec3f,c:vec3f,r:vec3f,mat:u32)->Hit{
 let hit=box(ro,rd,c,r,mat);if(hit.d>9999.){return hit;}
 var t=hit.d;
 for(var i=0;i<15;i++){
  let q=ro+t*rd-c;let d=slabSdf(q,r);
  if(d<.00045){
   let e=vec2f(.0006,0.);
   let n=vec3f(slabSdf(q+e.xyy,r)-slabSdf(q-e.xyy,r),slabSdf(q+e.yxy,r)-slabSdf(q-e.yxy,r),slabSdf(q+e.yyx,r)-slabSdf(q-e.yyx,r));
   return Hit(t,normalize(n),mat);
  }t+=d;if(t>hit.d+.165){break;}
 }return miss();
}
fn chairShell(p:vec3f)->f32{
 let u=clamp(p.z/.252,-1.,1.);let u2=u*u;
 let x=.209-.150*u2+.058*(p.y-.44);
 let d=(p.x-x)*inverseSqrt(1.+1.4161*u2);
 let crest=1.027-.499*pow(abs(u),1.65)+.057*u;
 let rounded=.020;
 let bound=vec3f(abs(d)-(.022+.014*(1.-u2)),abs(p.z)-.252,max(.418-p.y,p.y-crest))+rounded;
 return length(max(bound,vec3f(0.)))+min(0.,max(bound.x,max(bound.y,bound.z)))-rounded;
}
fn chair(ro:vec3f,rd:vec3f,side:f32)->Hit{
 let x=side*1.03;let z=1.62;
 let bounds=box(ro,rd,vec3f(x,.56,z),vec3f(.369,.56,.372),0u);
 if(bounds.d>9999.){return miss();}
 let rot=.38*side;let ca=cos(rot);let sa=sin(rot);let d=ro-vec3f(x,0.,z);
 let r=vec3f(side*(d.x*ca-d.z*sa),d.y,d.x*sa+d.z*ca);
 let v=vec3f(side*(rd.x*ca-rd.z*sa),rd.y,rd.x*sa+rd.z*ca);
 var h=slab(r,v,vec3f(0.,.432,0.),vec3f(.220,.040,.247),6u);
 let shellBox=box(r,v,vec3f(.075,.746,0.),vec3f(.210,.335,.254),6u);
 if(shellBox.d<h.d){
  var t=shellBox.d;
  for(var j=0;j<36;j++){
   let q=r+t*v;let shell=chairShell(q);
   if(shell<.0008){
    let e=vec2f(.001,0.);
    let n=vec3f(chairShell(q+e.xyy)-chairShell(q-e.xyy),chairShell(q+e.yxy)-chairShell(q-e.yxy),chairShell(q+e.yyx)-chairShell(q-e.yyx));
    h=nearest(h,Hit(t,normalize(n),6u));break;
   }t+=max(.0006,.82*shell);if(t>h.d || t>shellBox.d+.65){break;}
  }
 }
 for(var i=0;i<2;i++){let sg=f32(i)*2.-1.;
  h=nearest(h,rail(r,v,vec3f(.191,.012,sg*.216),vec3f(.151,.429,sg*.168),.021,5u));
  h=nearest(h,rail(r,v,vec3f(-.188,.012,sg*.224),vec3f(-.147,.429,sg*.171),.019,5u));
 }
 h.n=vec3f(side*h.n.x*ca+h.n.z*sa,h.n.y,-side*h.n.x*sa+h.n.z*ca);
 return h;
}
fn lampShade(ro:vec3f,rd:vec3f)->Hit{
 // A hollow dark metal cone with a rolled lip. Its open ivory interior is
 // visible only to rays that really look under the shade.
 let crown=vec3f(-1.244,1.597,1.917);let axis=normalize(vec3f(.44,-.89,-.12));
 let h=.129;let rad=.086;let slope=.53;let r0=rad-slope*h;
 let q=ro-crown;let y=dot(q,axis);let v=dot(rd,axis);let qp=q-y*axis;let vp=rd-v*axis;
 let r=r0+y*slope;let a=dot(vp,vp)-v*v*slope*slope;
 let b=dot(qp,vp)-r*v*slope;let c=dot(qp,qp)-r*r;let disc=b*b-a*c;
 var hit=miss();
 if(disc>0. && abs(a)>.0001){
  for(var j=0;j<2;j++){
   let t=(-b+select(-1.,1.,j==1)*sqrt(disc))/a;let along=y+t*v;
   if(t>.002 && along>=0. && along<=h){
    let n=normalize(qp+t*vp-axis*slope*(r0+along*slope));
    let mat=select(3u,4u,dot(n,rd)>0.);
    hit=nearest(hit,Hit(t,n,mat));
   }
  }
 }
 return hit;
}
fn mug(ro:vec3f,rd:vec3f)->Hit{
 let p=ro-vec3f(.275,.807,1.773);let radius=.041;let slope=.091;let height=.101;
 let bounds=box(p,rd,vec3f(.030,.054,0.),vec3f(.086,.058,.058),11u);
 if(bounds.d>9999.){return miss();}
 let a=dot(rd.xz,rd.xz)-slope*slope*rd.y*rd.y;
 let r=radius+slope*p.y;
 let b=dot(p.xz,rd.xz)-r*slope*rd.y;let c=dot(p.xz,p.xz)-r*r;
 let disc=b*b-a*c;var h=miss();
 if(disc>0. && abs(a)>.00001){
  let t=(-b-sqrt(disc))/a;let v=p+t*rd;
  if(t>.003 && v.y>=0. && v.y<=height){
   h=Hit(t,normalize(vec3f(v.x,-slope*(radius+slope*v.y),v.z)),11u);
  }
 }
 if(rd.y<-.001){
  let t=(height-p.y)/rd.y;let edge=length(p.xz+t*rd.xz);
  if(t>.003 && edge<radius+height*slope){
   h=nearest(h,Hit(t,vec3f(0.,1.,0.),select(15u,11u,edge>.043)));
  }
 }
 let a0=vec3f(.043,.082,0.);let a1=vec3f(.079,.078,0.);
 let a2=vec3f(.079,.046,0.);let a3=vec3f(.044,.029,0.);
 h=nearest(h,rail(p,rd,a0,a1,.007,11u));h=nearest(h,rail(p,rd,a1,a2,.008,11u));
 return nearest(h,rail(p,rd,a2,a3,.007,11u));
}
fn laptopSpace(d:vec3f)->vec3f{
 let c=.824;let s=.56658;
 return vec3f(c*d.x-s*d.z,d.y,s*d.x+c*d.z);
}
fn roomObjects(ro:vec3f,rd:vec3f,id:f32)->Hit{
 // The wall hit is the exit from the inside of the room.
 var h=box(ro,rd,vec3f(0.,1.51,1.91),vec3f(2.12,1.51,1.93),1u);h.n=-h.n;
 h=nearest(h,slab(ro,rd,vec3f(-.06,.771,1.61),vec3f(.797,.036,.466),2u));
 for(var j=0;j<2;j++){let dx=f32(j)*1.33-.7;
  h=nearest(h,box(ro,rd,vec3f(dx,.37,1.24),vec3f(.042,.37,.038),2u));
  h=nearest(h,box(ro,rd,vec3f(dx,.37,2.00),vec3f(.042,.37,.038),2u));
 }
 h=nearest(h,chair(ro,rd,1.));h=nearest(h,chair(ro,rd,-1.));
 // A low laptop leaves the two profiles clear. The base and lid meet at the hinge.
 var keys=box(laptopSpace(ro-vec3f(-.317,.820,1.57)),laptopSpace(rd),vec3f(0.),vec3f(.208,.013,.155),7u);
 keys.n=vec3f(.824*keys.n.x+.56658*keys.n.z,keys.n.y,-.56658*keys.n.x+.824*keys.n.z);
 h=nearest(h,keys);
 let c=vec3f(-.241,.947,1.69);let a=-.25;let rel=laptopSpace(ro-c);let direct=laptopSpace(rd);
 let v=vec3f(rel.x,rel.y*cos(a)-rel.z*sin(a),rel.y*sin(a)+rel.z*cos(a));
 let ray=vec3f(direct.x,direct.y*cos(a)-direct.z*sin(a),direct.y*sin(a)+direct.z*cos(a));
 var laptop=box(v,ray,vec3f(0.),vec3f(.195,.132,.010),8u);
 laptop.n=vec3f(laptop.n.x,laptop.n.y*cos(a)+laptop.n.z*sin(a),-laptop.n.y*sin(a)+laptop.n.z*cos(a));
 laptop.n=vec3f(.824*laptop.n.x+.56658*laptop.n.z,laptop.n.y,-.56658*laptop.n.x+.824*laptop.n.z);
 h=nearest(h,laptop);
 // A glazed cup and its lip beside an untidy stack of books.
 h=nearest(h,box(ro,rd,vec3f(.49,.821,1.924),vec3f(.133,.012,.093),9u));
 h=nearest(h,box(ro,rd,vec3f(.508,.840,1.916),vec3f(.126,.008,.087),10u));
 h=nearest(h,mug(ro,rd));
 // The hinged task light throws a near field across the writer's hands.
 h=nearest(h,box(ro,rd,vec3f(-2.094,1.46,2.45),vec3f(.020,.069,.056),3u));
 h=nearest(h,rail(ro,rd,vec3f(-2.088,1.46,2.45),vec3f(-1.610,1.598,2.14),.010,3u));
 h=nearest(h,rail(ro,rd,vec3f(-1.610,1.598,2.14),vec3f(-1.244,1.597,1.917),.009,3u));
 h=nearest(h,lampShade(ro,rd));
 h=nearest(h,box(ro,rd,vec3f(.125,.811,1.471),vec3f(.167,.002,.117),10u));
 h=nearest(h,rail(ro,rd,vec3f(.063,.819,1.415),vec3f(.231,.819,1.455),.0045,3u));
 if(box(ro,rd,vec3f(-1.18,1.91,3.60),vec3f(.72,.58,.24),0u).d<h.d){
 for(var j=0;j<2;j++){
  let sy=1.42+.52*f32(j)+select(.0,.13,id==1.);
  h=nearest(h,box(ro,rd,vec3f(-1.18,sy,3.60),vec3f(.702,.032,.230),2u));
  for(var k=0;k<5;k++){
   let q=f32(k);let seed=hash11(q*7.91+f32(j)*6.+id*13.);
   let width=.041+.051*seed;let height=.082+.088*seed;
   let bx=-1.69+q*.181+sin(f32(j)+q*2.4)*.045;
   h=nearest(h,box(ro,rd,vec3f(bx,sy+.033+height,3.61),vec3f(width,height,.104),12u));
  }
 }
 }
 return h;
}
fn surfaceColor(ro:vec3f,rd:vec3f,h:Hit,id:f32,light:f32,ai:f32)->vec3f{
 let p=ro+rd*h.d;let n=h.n;let grain=vnoise3(p*vec3f(6.,37.,15.)+id*4.);
 let age=fbm(p.xy*1.45+p.zy*.78+id*3.);var base=mix(vec3f(.158,.103,.107),vec3f(.248,.151,.136),age);
 if(h.mat==1u && n.y<-.76){base=vec3f(.260,.192,.189)*(.80+.22*age);}
 if(h.mat==1u && n.y>.76){
  let seam=1.-smoothstep(.009,.024,abs(fract(p.x*3.1)-.5));
  base=mix(vec3f(.21,.126,.080),vec3f(.39,.237,.135),grain)*(1.-.33*seam);
 }
 if(h.mat==2u||h.mat==5u||h.mat==6u){
  let wood=vnoise(p.xz*vec2f(2.7,61.)+p.y*6.8);
  base=mix(vec3f(.156,.078,.046),vec3f(.393,.211,.105),.24+.60*wood);
  if(h.mat==6u){
   let leather=vnoise3(p*104.);
   base=mix(vec3f(.087,.037,.032),vec3f(.165,.084,.058),.35+.60*leather);
  }
 }
 if(h.mat==3u){base=vec3f(.093,.083,.077);}
 if(h.mat==4u){return vec3f(.398,.245,.147)*(.07+.93*light);}
 if(h.mat==7u){
  let deck=laptopSpace(p-vec3f(-.317,.820,1.57));
  let key=step(.22,fract((deck.x+.20)*62.))*step(.25,fract(deck.z*48.))*step(-.050,deck.z);
  base=mix(vec3f(.20,.18,.14),vec3f(.053,.045,.041),key*step(.70,n.y));
 }
 if(h.mat==8u){
  let rel=laptopSpace(p-vec3f(-.241,.947,1.69));let local=vec2f(rel.x/.390+.5,.5-rel.y/.255);
  if(laptopSpace(n).z<-.75 && all(local>vec2f(.034)) && all(local<vec2f(.966))){
   let tile=select(0.,2.,id==1.);let uv=(vec2f(tile%2.,floor(tile/2.))+local)/vec2f(2.,5.);
   let letters=textureSampleLevel(questions,paperSampler,uv,0.).r;
   let askedAt=select(55.92,66.53,id==1.);
   let typed=1.-smoothstep(-.015,.045,local.x-clamp((A.eye.w-askedAt)*.68,0.,1.));
   return vec3f(.23,.179,.108)*(.021+.979*light)*(1.-.73*letters*typed);
  }
  base=vec3f(.064,.063,.062);
 }
 if(h.mat==9u){base=vec3f(.17,.090,.063);}
 if(h.mat==10u){base=vec3f(.37,.318,.204);}
 if(h.mat==11u){base=mix(vec3f(.175,.146,.128),vec3f(.411,.345,.278),smoothstep(.813,.904,p.y));}
 if(h.mat==15u){base=vec3f(.044,.022,.015);}
 if(h.mat==12u){let b=hash11(floor((p.x+2.)*28.));base=mix(vec3f(.095,.069,.058),vec3f(.40,.258,.146),b)*(.62+.38*step(.070,fract(p.x*28.)));}
 let lamp=vec3f(-1.185,1.48,1.89)-p;
 let key=vec3f(.98,.67,.40)*light*(.22+.78*max(dot(n,normalize(lamp)),0.))*.88/(.45+dot(lamp,lamp)*.75);
 let tableLight=vec3f(.19,.113,.048)*ai/(.43+dot(p-vec3f(.88,1.05,1.62),p-vec3f(.88,1.05,1.62)));
 let falloff=.63+.37*smoothstep(0.,.48,min(min(2.12-abs(p.x),p.y),3.84-p.z));
 let sky=vec3f(.023,.025,.033)+vec3f(.063,.053,.053)*max(-n.z,0.);
 let back=step(.98,-n.z)*step(3.2,p.z);
 let cone=exp(-dot((p.xy-vec2f(-.39,1.48))*vec2f(.78,1.23),(p.xy-vec2f(-.39,1.48))*vec2f(.78,1.23)));
 let after=exp(-dot((p.xy-vec2f(.98,1.33))*vec2f(1.05,1.45),(p.xy-vec2f(.98,1.33))*vec2f(1.05,1.45)));
 let wallwash=light*vec3f(.203,.103,.077)*(.32+.68*cone)*(.35+.65*back);
 let reflected=back*ai*after*vec3f(.178,.093,.035);
 let shadeOfShelf=back*bell((p.x+1.26)/.73)*
   (bell((p.y-1.30-.10*step(.5,id))/.090)+.63*bell((p.y-1.85-.10*step(.5,id))/.085));
 let floorPlane=step(.95,n.y)*step(p.y,.06);
 let underDesk=exp(-pow(abs((p.x+.09)/1.45),4.)-pow(abs((p.z-1.65)/.68),4.));
 let foot=bell((abs(p.x)-.99)/.32)*bell((p.z-1.55)/.52);
 let onDesk=step(.95,n.y)*step(abs(p.y-.807),.044);
 let deskShadow=bell((p.x+.36)/.36)*bell((p.z-1.60)/.23)
   +.36*bell((abs(p.x)-.61)/.21)*bell((p.z-1.53)/.27);
 let occlusion=(1.-.49*floorPlane*underDesk)*(1.-.41*floorPlane*foot)*(1.-.36*onDesk*min(1.,deskShadow));
 // Warm light reflects off the desk toward the wall. A second, cooler
 // source from the street leaves a soft, enlarged human shadow on the plaster.
 let bloomOnWall=exp(-dot((p.xy-vec2f(-.41,1.18))*vec2f(.81,1.12),(p.xy-vec2f(-.41,1.18))*vec2f(.81,1.12)));
 let sittingShadow=bell((p.x+1.39)/.30)*bell((p.y-1.48)/.47)
   +.74*bell((p.x+1.40)/.207)*bell((p.y-1.89)/.21);
 let bounce=light*back*bloomOnWall*vec3f(.124,.061,.051)*(1.-.71*min(1.,sittingShadow));
 let angleShade=mix(1.,.65+.35*smoothstep(.015,.77,2.12-abs(p.x)),back);
 let wall=base*(sky+(key+wallwash+tableLight+reflected+bounce)*falloff)*angleShade
  *(1.-.40*shadeOfShelf)*(1.-.24*back*min(1.,sittingShadow))*occlusion;
 let pool=bell((p.x+.94)/.71)*bell((p.z-1.12)/.81);
 let floorBounce=vec3f(.277,.141,.066)*light*floorPlane*pool*occlusion;
 let halfVector=normalize(normalize(lamp)-rd);
 let varnish=select(.0,.070,h.mat==2u||h.mat==6u||h.mat==11u);
 let sheen=light*varnish*pow(max(0.,dot(n,halfVector)),24.);
 let rimLight=pow(clamp(1.-abs(dot(n,rd)),0.,1.),3.)*smoothstep(.64,1.0,p.y);
 let leather=select(0.,ai*.038*rimLight,h.mat==6u);
 return wall+base*floorBounce+vec3f(.75,.44,.221)*(sheen+leather);
}
`;
