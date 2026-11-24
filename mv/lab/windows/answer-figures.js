// Two real seated volumes. The writer intercepts light; the visitor carries
// the atlas on his surface, and the light between strokes still reaches the room.
export const figures=`
fn actorFacing(side:f32,id:f32)->vec2f{
 return normalize(vec2f(-side,select(mix(-.115,-.16,step(.5,id)),-.66,side>0.)));
}
fn actorPos(p:vec3f,side:f32,id:f32)->vec3f{
 let ctr=vec3f(side*.990,0.,1.62+select(.075,-.025,side>0.));
 let f=actorFacing(side,id);
 let d=p-ctr;
 return vec3f(dot(d.xz,vec2f(-f.y,f.x)),d.y,dot(d.xz,f));
}
fn part(a:vec2f,d:f32,m:f32)->vec2f{
 if(d<a.x){return vec2f(d,m);}return a;
}
fn posedHead(q:vec3f,id:f32,visitor:bool)->vec3f{
 let t=A.eye.w;
 let lift=select(.032*smoothstep(57.,59.8,t),.220*smoothstep(66.55,69.42,t),id==1.);
 let bow=select(.350-lift,.132+.047*(1.-presence(id,t)),visitor);
 let headCentre=select(vec3f(-.019,1.265+.22*lift,.215-.32*lift),vec3f(.008,1.313,.129),visitor);
 let h=q-headCentre;
 return vec3f(h.x,h.y*cos(bow)+h.z*sin(bow),h.z*cos(bow)-h.y*sin(bow));
}
fn taper(q:vec3f,a:vec3f,b:vec3f,r0:f32,r1:f32)->f32{
 let axis=b-a;let u=clamp(dot(q-a,axis)/dot(axis,axis),0.,1.);
 return length(q-a-axis*u)-mix(r0,r1,u);
}
fn actorDist(p:vec3f,side:f32,id:f32)->vec2f{
 let q=actorPos(p,side,id);let visitor=side>0.;
 let boxq=abs(q-vec3f(0.,.76,.098))-vec3f(.239,.759,.536);
 if(max(max(boxq.x,boxq.z),boxq.y)>.026){return vec2f(length(max(boxq,vec3f(0.))),1.);}
 let t=A.eye.w;
 let h=posedHead(q,id,visitor);var v=vec2f(9.,1.);
 if(q.y>1.095){
  var face:f32;
  if(visitor){face=tidalWindowHead(h);}
  else {
   let jaw=smoothstep(.029,.108,-h.y);
   face=headSd(vec3f(h.x/(.281*(1.-.15*jaw)),2.12+h.y/.275,-(h.z+.010*jaw)/.276))*.265;
  }
  v=part(v,face,2.);
  if(!visitor){
   let scalp=figureEll(h-vec3f(-.004,.045,-.005),vec3f(.112,.118,.122));
   let hairline=.028+.53*h.z-.17*h.x+.013*sin(h.x*26.-.62)-.031*bell((h.x+.076)/.039);
   v=part(v,max(scalp,hairline-h.y),3.);
   let lock=figureEll(h-vec3f(.006,-.028,-.087),vec3f(.119,.142,.073));
   v=part(v,lock,3.);
   if(id==0.){
    v=part(v,figureEll(h-vec3f(-.048,-.076,-.120),vec3f(.063,.069,.049)),3.);
    let curl=vec3f(-.095,.111,.033);let temple=vec3f(-.104,.027,.033);
    v=part(v,taper(h,curl,temple,.024,.018),3.);
    v=part(v,taper(h,temple,vec3f(-.097,-.060,-.010),.018,.006),3.);
   }
  }
  let lift=select(.0,smoothstep(66.55,69.42,t),id==1.);
  let neck=select(vec3f(-.018,1.225+.039*lift,.162-.047*lift),vec3f(.008,1.25,.122),visitor);
  v=part(v,capsule(q,vec3f(0.,1.06,.106),neck,.059),2.);
 }
 let lean=select(.191-.068*step(.5,id)*smoothstep(66.55,69.42,t),.095,visitor);
 let back=q.z-(.005+lean*smoothstep(.56,1.12,q.y));
 var cloth=9.;
 if(q.y>.44 && q.y<1.20){
  let shoulderY=1.055-.055*abs(q.x)/.206;
  let chest=figureEll(vec3f(q.x,q.y-.871,back),vec3f(.168,.261,.129));
  let shoulder=figureEll(vec3f(q.x,q.y-shoulderY,back),vec3f(.212,.070,.101));
  cloth=blendDist(chest,shoulder,select(.079,.035,visitor));
  if(!visitor){
   // Gravity carries the loose knit from the far shoulder to the seated hip.
   let hem=figureEll(vec3f(q.x+.014,q.y-.690,back+.022),vec3f(.173,.197,.139));
   cloth=blendDist(cloth,hem,.062);
  }
 }
 v=part(v,figureEll(q-vec3f(0.,.542,-.012),vec3f(.177,.128,.180)),4.);
 for(var k=0;k<2;k++){
  let sg=f32(k)*2.-1.;
  if(q.y<.687){
   let hip=vec3f(.093*sg,.522,-.010);let knee=vec3f(.122*sg,.483,.312+.035*sg);
   let ankle=vec3f(.126*sg,.109,.304+.054*sg);
   v=part(v,blendDist(capsule(q,hip,knee,.081),capsule(q,knee,ankle,.054),.018),4.);
   v=part(v,figureEll(q-ankle-vec3f(0.,-.041,.053),vec3f(.063,.053,.121)),5.);
  }
  if(q.y>.73 && q.y<1.19){
   let sh=vec3f(.155*sg,1.038,lean*.86);let elbow=vec3f(.185*sg,.855,.194+.054*sg+lean*.31);
   let fk=select(.032*sin(t*2.+sg),.017*sin(t*.92+sg),visitor);
   let wrist=vec3f(.104*sg,.825+.012*sg,.366+.034*sg+fk*.22);
   if(visitor){
    cloth=min(cloth,blendDist(capsule(q,sh,elbow,.048),capsule(q,elbow,wrist,.038),.019));
   }else{
    // The sleeve is cut from the same volume as the shoulder. Its inner
    // elbow gathers and opens into a naked forearm just past the fold.
    let shoulder=sh+vec3f(-.014*sg,.011,-.005);
    let bent=elbow+vec3f(.009*sg,-.012,.014);
    let cuff=mix(bent,wrist,.51);
    let upperAxis=bent-shoulder;
    let armU=clamp(dot(q-shoulder,upperAxis)/dot(upperAxis,upperAxis),0.,1.);
    let pinch=.0036*cos(armU*26.+q.z*21.+sg*.68)*bell((armU-.75)/.26);
    let upper=taper(q,shoulder,bent,.068,.052)+pinch;
    let lower=taper(q,bent,cuff,.052,.035);
    let armAxis=cuff-bent;
    let along=clamp(dot(q-bent,armAxis)/dot(armAxis,armAxis),0.,1.);
    let crease=.0031*cos(along*16.4+.80*sg+15.*q.x)*bell((along-.51)/.52);
    let folded=blendDist(upper,lower+crease,.039);
    let trap=taper(q,vec3f(-.007,1.106,lean+.020),shoulder,.060,.057);
    cloth=blendDist(cloth,blendDist(trap,folded,.038),.054);
    let arm=taper(q,mix(bent,cuff,.83),wrist,.032,.022);
    v=part(v,arm,2.);
   }
   let palm=wrist+vec3f(-.011*sg,-.001,.043);
   v=part(v,figureEll(q-palm,vec3f(.040,.019,.051)),2.);
   for(var f=0;f<4;f++){
     let j=f32(f);let finger=palm+vec3f((j-1.5)*.013,.0,.032);
     let end=finger+vec3f((j-1.5)*.002,-.008+.003*sin(t*2.7+j),.038-.004*abs(j-1.));
     v=part(v,capsule(q,finger,end,.008),2.);
   }
   v=part(v,capsule(q,palm+vec3f(-sg*.020,.0,.011),palm+vec3f(-sg*.047,.004,.037),.011),2.);
  }
 }
 return part(v,cloth,1.);
}
fn actorTrace(ro:vec3f,rd:vec3f,side:f32,id:f32,limit:f32)->Hit{
 let cen=vec3f(side*.99,.76,1.62);let halfBox=vec3f(.61,.79,.52);
 let inv=1./select(rd,vec3f(.00001),abs(rd)<vec3f(.00001));
 let z=(cen-ro)*inv;let e=abs(inv)*halfBox;let lo=z-e;let hi=z+e;
 var t=max(.001,max(max(lo.x,lo.y),lo.z));let end=min(limit,min(min(hi.x,hi.y),hi.z));
 if(t>=end){return miss();}
 for(var i=0;i<68;i++){
  let p=ro+rd*t;let s=actorDist(p,side,id);
  if(s.x<.0012+.00022*t){
   let a=vec2f(.00165,-.00165);
   let n=normalize(a.xyy*actorDist(p+a.xyy,side,id).x+a.yyx*actorDist(p+a.yyx,side,id).x
                  +a.yxy*actorDist(p+a.yxy,side,id).x+a.xxx*actorDist(p+a.xxx,side,id).x);
   return Hit(t,n,20u+u32(s.y));
  }
  t+=max(.001,s.x*.86);if(t>end){break;}
 }return miss();
}
fn writerPaint(p:vec3f,h:Hit,id:f32,light:f32,ai:f32)->vec3f{
 let n=h.n;let q=actorPos(p,-1.,id);let head=posedHead(q,id,false);
 let dirt=vnoise3(q*34.)-.5;
 let front=smoothstep(.034,.114,q.z-.112);
 let V=abs(q.x+.012)-(.049*(q.y-.887)/.20);
 let opening=(1.-smoothstep(-.004,.005,V))*front*smoothstep(.85,.94,q.y);
 let collar=bell((V-.014)/.011)*front*smoothstep(.855,.94,q.y);
 let ax=abs(q.x);let sleeve=smoothstep(.113,.17,ax);
 let elbow=bell((q.y-.849)/.068)*bell((q.z-.265)/.123)*sleeve;
 let fold=.5+.5*cos(q.y*79.+q.z*35.+sin(q.x*37.+q.y*9.)*1.7);
 var alb=mix(vec3f(.235,.149,.116),vec3f(.073,.153,.151),step(.5,id));
 alb*=.90+(.036+.20*elbow)*fold+.19*collar;
 let throat=smoothstep(.990,1.135,q.y);
 let beneath=mix(vec3f(.109,.077,.068),vec3f(.323,.243,.201),throat);
 alb=mix(alb,beneath,opening);
 let skin=h.mat==22u;
 if(skin){
  alb=vec3f(.738,.404,.309)*(.90+.14*dirt);
  let scan=sitterToScan(vec3f(head.x/.281,2.12+head.y/.275,-head.z/.276));
  let lid=sitterLids(scan.x);let rim=scan.y-lid.x;
  let face=smoothstep(.23,.42,scan.z);
  let orbit=bell((abs(scan.x)-.295)/.154)*bell((rim-.034)/.081)*face;
  let brow=bell((abs(scan.x)-.30)/.155)*bell((rim-.115+.13*(abs(scan.x)-.30))/.037)*face;
  let aperture=smoothstep(.04,.28,lid.y)*smoothstep(-.025,.006,rim+.01*lid.y)
    *(1.-smoothstep(.049*lid.y,.081*lid.y+.010,rim))*face;
  let iris=bell((abs(scan.x)-.27)/.061)*bell((rim-.009)/.038);
  let wet=bell((abs(scan.x)-.254)/.021)*bell((rim-.034)/.018);
  let lips=bell(head.x/.040)*bell((head.y+.074)/.007)*face;
  let cheek=bell((abs(head.x)-.060)/.034)*bell((head.y+.030)/.035)*face;
  let nostril=bell((abs(scan.x)-.118)/.061)*bell((scan.y+.245)/.037)*face;
  let hollow=bell((abs(head.x)-.065)/.035)*bell((head.y+.055)/.022)*face;
  let overhang=bell((abs(scan.x)-.27)/.177)*bell((rim-.076)/.047)*face;
  alb*=1.-.14*hollow-.11*overhang;
  let ear=bell((abs(head.x)-.098)/.019)*bell((head.y+.010)/.031)*bell((head.z-.006)/.041);
  alb*=vec3f(1.,1.-.138*cheek,1.-.097*cheek)*(1.-.39*orbit-.62*brow)*(1.-.59*nostril-.35*lips);
  alb=mix(alb,mix(vec3f(.34,.26,.227),vec3f(.043,.033,.033),iris)+wet*vec3f(.43,.35,.27),aperture);
  alb=mix(alb,vec3f(.49,.207,.145),.43*ear);
 }
 if(h.mat==23u){
  let strand=.5+.5*sin(atan2(head.x,head.z)*69.+.7*sin(head.y*41.)+3.*head.y);
  alb=mix(vec3f(.031,.017,.014),vec3f(.101,.059,.038),.28+.63*strand);
 }
 if(h.mat==24u||h.mat==25u){alb=vec3f(.087,.067,.058)*(1.+.18*dirt);}
 let lamp=vec3f(-1.185,1.48,1.89)-p;
 let L=normalize(lamp);
 let soft=max(0.,(dot(n,L)+.27)/1.27);
 let diffuse=light*(.062+soft/(.35+1.22*dot(lamp,lamp)));
 let screen=normalize(vec3f(-.241,.95,1.69)-p);
 let bounced=max(0.,(dot(n,screen)+.19)/1.19)*light;
 let eye=step(1.12,q.y);
 let skinGlow=select(0.,1.,skin);
 let frontal=smoothstep(.029,.073,head.z);
 let cheek=bell((abs(head.x)-.052)/.039)*bell((head.y+.027)/.034)*frontal;
 let alae=bell((abs(head.x)-.023)/.017)*bell((head.y+.050)/.018)*frontal;
 let eyelid=bell((abs(head.x)-.041)/.027)*bell((head.y-.005)/.010)*frontal;
 let fingers=(1.-eye)*smoothstep(.31,.41,q.z);
 let facets=eye*(.36*cheek+.36*alae+.30*eyelid)+.44*fingers;
 let halfVector=normalize(L+normalize(vec3f(A.eye.x-id*bay,A.eye.y,A.eye.z)-p));
 let glint=pow(max(0.,dot(n,halfVector)),19.)*facets*skinGlow;
 let ambient=vec3f(.030,.032,.047)+vec3f(.081,.061,.056)*max(-n.y,0.)*light;
 let warm=vec3f(1.10,.755,.585)*diffuse;
 let cool=vec3f(.349,.318,.315)*bounced*(.62+skinGlow*.72);
 let aiLight=vec3f(.202,.124,.081)*ai*max(0.,dot(n,normalize(vec3f(.99,1.12,1.60)-p)));
 return alb*(ambient+warm+cool+aiLight)+vec3f(.50,.285,.184)*glint*light;

}
fn faceLetter(q:vec3f,n:vec3f,scale:f32,cellNoise:f32,footprint:f32)->vec3f{
 // Map the observed cheek and rib cage in the actor's own tangent directions.
 // On the two side planes horizontal follows the spine-to-sternum direction.
 let up=abs(n.y)>max(abs(n.x),abs(n.z))+.18;
 var plane=vec2f(q.x*sign(n.z),q.y);
 if(abs(n.x)>abs(n.z)+.13){plane=vec2f(-q.z*sign(n.x),q.y);}
 if(up){plane=vec2f(q.x,q.z*sign(n.y));}
 let uv=plane/scale;
 let row=floor(uv.y);let shifted=uv+vec2f(.43*hash11(row+cellNoise),.0);
 let cell=floor(shifted);let random=hash21(cell+cellNoise);
 let index=A.letters.x+floor(random*A.letters.y);
 let glyphUV=vec2f(fract(shifted.x),1.-fract(shifted.y));
 let lod=clamp(log2(128.*footprint/scale),.0,4.);
 let ink=textureSampleLevel(atlas,inkSampler,(vec2f(index%32.,floor(index/32.))+glyphUV*.95+.025)/32.,lod).r;
 return vec3f(ink,random,fract(shifted.y));
}
fn goldFigure(p:vec3f,n:vec3f,rd:vec3f,under:vec3f,id:f32)->vec3f{
 let q=actorPos(p,1.,id);let h=posedHead(q,id,true);let t=A.eye.w;
 let shoulder=bell((q.y-1.065)/.176);let fingers=bell((q.y-.837)/.072)*smoothstep(.18,.32,q.z);
 let f=actorFacing(1.,id);let normal=vec3f(dot(n.xz,vec2f(-f.y,f.x)),n.y,dot(n.xz,f));
 let metresPerPixel=2.*abs((p.z-A.eye.z)/rd.z)*A.right.w/A.screen.y;
 let scale=.085+.021*smoothstep(.18,.70,q.y)-.037*smoothstep(1.16,1.28,q.y);
 let ink=faceLetter(q,normal,scale,id*58.3+1.,metresPerPixel*.61);
 let glyph=ink.x;let seed=ink.y;
 let bornAt=select(56.40,66.98,id==1.)+.85*(1.-shoulder)+.35*seed+.36*smoothstep(1.18,1.34,q.y);
 let form=smoothstep(bornAt,bornAt+.94,t);
 let leave=smoothstep(63.25+.36*(1.-fingers)+.66*shoulder+.56*seed,64.16+.46*(1.-fingers)+.77*shoulder+.73*seed,t);
 let remains=form*(1.-select(0.,leave,id==0.))*smoothstep(.035,.60,presence(id,t));
 let rim=pow(clamp(1.-abs(dot(n,rd)),0.,1.),2.70);
 let face=smoothstep(1.13,1.29,q.y);
 let cheek=smoothstep(-.32,.91,dot(n,normalize(vec3f(-.62,.54,-.55))));
 // The head shares the sea figure's undulating surface. On the face the
 // script thins at the eyelids and the parted lips; it strengthens at temples.
 let eyeHeight=.43*.037;
 let front=smoothstep(.026,.065,h.z);
 let eyes=bell((abs(h.x)-.0335)/.028)*bell((h.y-eyeHeight)/.010)*front;
 let lips=bell(h.x/.027)*bell((h.y+.058)/.008)*front;
 let nose=bell(h.x/.016)*bell((h.y+.016)/.033)*front;
 let facial=smoothstep(.04,.083,h.z)*face;
 let tissue=mix(vec3f(.365,.216,.106),vec3f(.748,.452,.210),face)
   *(.26+.74*cheek)*(1.-.74*eyes-.42*lips)+vec3f(.091,.052,.022)*nose;
 let body=mix(under,tissue,remains*(.095+.28*face+.10*cheek+.25*facial));
 let aroundEye=1.-.88*eyes-.56*lips;
 let line=mix(vec3f(1.51,.723,.224),vec3f(2.01,1.31,.615),seed)
   *(glyph*(.83+.41*seed)*(1.-.55*facial)*aroundEye+rim*(.069+.15*seed))*(.51+.49*cheek);
 return body+remains*line;
}
`;
