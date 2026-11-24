export const street=`
fn facade(p:vec2f,cell:vec2f)->vec3f{
 let panel=fbm(p*1.39+cell*2.15);let sandy=vnoise(p*143.);
 let fine=.65+.35*panel;let course=1.-smoothstep(.005,.028,abs(fract((p.y+.15)*2.)-.50));
 let seam=1.-smoothstep(.004,.014,abs(fract((p.x+.12)*.74)-.50));
 let edge=.052*bell((p.x+1.81)/.13)*bell((p.y-1.51)/1.3);
 let tint=mix(vec3f(.018,.019,.032),vec3f(.060,.040,.059),panel);
 let streak=fbm(vec2f(p.x*15.2+.06*sin(p.y*2.),p.y*1.75)+cell*3.);
 let runoff=smoothstep(.49,.73,streak)*bell((p.y-.09)/.43)*smoothstep(.0,.27,1.81-abs(p.x));
 var slab=tint*(.68+.25*sandy)*fine*(1.-.25*course-.21*seam)*(1.-.25*runoff)+vec3f(.24,.13,.077)*edge;
 // A rain pipe stands forward of the brick. Its rounded face and the
 // offset cast shadow keep the wall substantial as the characters cross it.
 let pipeX=p.x-2.022;let pipe=1.-smoothstep(.035,.043,abs(pipeX));
 let dripShadow=bell((pipeX-.066)/.037);
 let bracket=(1.-smoothstep(.014,.024,abs(fract((p.y-.08)*.70)-.49)))*(1.-smoothstep(.042,.056,abs(pipeX)));
 let metal=vec3f(.042,.032,.041)*(.46+.77*bell((pipeX+.013)/.021));
 return mix(slab*(1.-.33*dripShadow),metal,pipe)+vec3f(.030,.021,.019)*bracket;
}
fn skyline(ray:vec3f)->vec3f{
 let az=atan2(ray.x,ray.z);let dusk=1.-smoothstep(-.05,.49,ray.y);
 let cloud=fbm(vec2f(az*4.6,ray.y*9.+3.));
 let veil=fbm(vec2f(az*2.34+7.,ray.y*17.));
 var c=mix(vec3f(.035,.040,.081),vec3f(.166,.095,.146),dusk*(.34+.57*cloud));
 c+=vec3f(.052,.027,.021)*bell((ray.y-.018)/.071)*(.41+.59*veil);
 let distant=floor(az*21.+.43);
 let distantRoof=.009+.065*hash11(distant+4.)+.013*step(.71,hash11(distant+21.));
 if(ray.y<distantRoof){
   let windows=vec2f(az*224.+.38,ray.y*174.);let off=abs(fract(windows)-.5);
   let lit=step(.851,hash21(floor(windows)+75.))*(1.-smoothstep(.10,.35,off.x))*(1.-smoothstep(.09,.32,off.y));
   c=mix(c,vec3f(.060,.048,.084)+lit*vec3f(.08,.055,.038),.79);
 }
 let band=az*18.;let k=floor(band);let rim=-.035+.065*hash11(k+3.);
 if(ray.y<rim){
  let block=vec2f(az*190.,ray.y*151.);let dist=abs(fract(block)-.5);
  let win=step(.855,hash21(floor(block)))*(1.-smoothstep(.12,.33,dist.x))*(1.-smoothstep(.15,.36,dist.y));
  c=vec3f(.012,.015,.031)*(.74+.26*hash11(k+10.))+win*vec3f(.167,.110,.063);
 }
 return c;
}
fn flyingType(ro:vec3f,rd:vec3f,t:f32)->vec3f{
 var result=vec3f(0.);
 for(var lane=0;lane<5;lane++){
  let j=f32(lane);let lag=.093*j;
  let depth=-.080-.13*j-.28*sin(clamp((t-63.45)/4.4,0.,1.)*3.14159);
  let d=(depth-ro.z)/rd.z;let q=(ro+d*rd).xy;
  let pitch=.295+.063*j;
  let travel=(t-63.42-lag)*(1.265+.062*j);
  let u=(q.x-travel)/pitch;let cell=floor(u);let seed=hash11(cell+32.1*j);
  let x=travel+(cell+.5)*pitch;
  let start=.72+.70*hash11(cell*7.+j);let end=4.59+.39*hash11(cell*3.7+j);
  let on=smoothstep(start-.17,start+.35,x)*(1.-smoothstep(end-.42,end+.18,x))
    *smoothstep(63.41+lag,64.03+lag,t)*(1.-smoothstep(66.91+lag,67.93+lag,t))*step(.28,seed);
  let arc=sin(clamp((x-.48)/4.11,0.,1.)*3.14159);
  let h=1.19+(.22+.17*seed)*arc+.109*sin(x*2.26+j+cell*.68)+(.076+.047*arc)*(j-2.);
  let scale=(.081+.052*j+.046*seed)*(.79+.19*sin(cell+j));
  let turn=.53+.47*abs(cos((t-64.)*(.81+.38*seed)+1.51*cell+j*.7));
  let uv=vec2f((fract(u)-.5)*pitch/turn,q.y-h)/scale;
  let a=.55*sin(cell*2.21+t*.86+j*.59)+.34*(seed-.5)+.13*arc;
  let glyphUV=vec2f(uv.x*cos(a)-uv.y*sin(a),-uv.x*sin(a)-uv.y*cos(a))+.5;
  if(all(glyphUV>=vec2f(0.)) && all(glyphUV<=vec2f(1.))){
   let index=A.letters.z+floor(seed*A.letters.w);
   let lod=clamp(log2(128.*2.*d*A.right.w/(A.screen.y*scale)),0.,4.);
   let mark=textureSampleLevel(atlas,inkSampler,(vec2f(index%32.,floor(index/32.))+glyphUV*.93+.035)/32.,lod).r;
   result+=mix(vec3f(1.40,.582,.164),vec3f(2.65,1.52,.68),seed)*mark*on*(.62+.69*seed);
  }
  let glow=exp(-dot(uv,uv)*3.7)*.068*on;
  result+=vec3f(.88,.43,.15)*glow;
 }
 return result;
}
fn roomView(origin:vec3f,direction:vec3f,id:f32,t:f32)->vec3f{
 let mirror=select(1.,-1.,id!=0. && id!=1. && hash11(id*3.21)>.43);
 let ro=origin*vec3f(mirror,1.,1.);let rd=direction*vec3f(mirror,1.,1.);
 let light=questionLight(id,t);let ai=presence(id,t);
 let furnitureHit=roomObjects(ro,rd,id);
 let writer=actorTrace(ro,rd,-1.,id,furnitureHit.d);
 let closest=min(writer.d,furnitureHit.d);
 var col=surfaceColor(ro,rd,furnitureHit,id,light,ai);
 if(writer.d<furnitureHit.d){col=writerPaint(ro+rd*writer.d,writer,id,light,ai);}
 if(ai>.005){
  let figure=actorTrace(ro,rd,1.,id,closest);
  if(figure.d<closest){
   let p=ro+rd*figure.d;
   col=goldFigure(p,figure.n,rd,col,id);
  }
 }
 return col;
}
fn curtainAt(ro:vec3f,rd:vec3f,under:vec3f,light:f32)->vec3f{
 // Two pieces share a header inside the reveal. The linen hangs heavily and
 // the sheer behind it is pulled a little further across the glass at the top.
 var col=under;
 for(var j=0;j<2;j++){
  let sheer=j==0;let depth=select(.307,.442,sheer);
  let pitch=select(31.,24.5,sheer);let amp=select(.035,.024,sheer);
  var t=(depth-ro.z)/rd.z;
  for(var k=0;k<3;k++){
   let p=ro+t*rd;let u=p.x*pitch+1.35*sin(p.y*.96)+.31*sin(2.9*p.y+.41*p.x);
   let phaseY=1.29*cos(p.y*.96)+.90*cos(2.9*p.y+.41*p.x);
   let denom=rd.z-amp*cos(u)*(pitch*rd.x+phaseY*rd.y);
   t-=(p.z-depth-amp*sin(u))/max(denom,.30);
  }
  let p=ro+t*rd;let drop=clamp((2.465-p.y)/2.09,0.,1.);
  let u=p.x*pitch+1.35*sin(p.y*.96)+.31*sin(2.9*p.y+.41*p.x);
  let weight=sin(3.14159*pow(drop,.86));
  let edge=select(-1.345,-1.18,sheer)-.217*weight+.047*drop+.022*sin(p.y*3.4)+amp*sin(u)*.38;
  let bottom=.423+.018*sin(u)+.010*sin(2.4*p.x);
  let cover=(1.-smoothstep(edge-.009,edge+.008,p.x))*smoothstep(bottom-.008,bottom+.008,p.y);
  let fall=.36+.64*smoothstep(-.91,.96,-cos(u)-.19);
  let hem=.36*bell((p.x-edge+.014)/.007)+.32*bell((p.y-bottom-.017)/.009);
  let fibers=vnoise(vec2f(p.x*91.+.21*sin(u),p.y*27.));
  let shade=mix(vec3f(.024,.019,.030),vec3f(.104,.052,.046),fall*light);
  let linen=mix(shade,vec3f(.210,.142,.131)*(.23+.77*light),select(.11,.55,sheer))*(.89+.15*fibers+hem);
  let opacity=select(.96,.20+.26*(1.-fall)+.18*hem,sheer);
  col=mix(col,linen,cover*opacity);
 }
 return col;
}
@fragment fn fs(@builtin(position) coord:vec4f)->@location(0) vec4f{
 let pixel=coord.xy/A.screen.xy;let ndc=pixel*2.-1.;let t=A.eye.w;
 let rd=normalize(A.forward.xyz+A.right.xyz*ndc.x*A.screen.z*A.right.w-A.up.xyz*ndc.y*A.right.w);
 let ro=A.eye.xyz;var col=skyline(rd);
 if(rd.z>.001){
  let d=-ro.z/rd.z;let p=ro+d*rd;
  let colId=floor((p.x+bay*.5)/bay);let row=floor(p.y/floorHeight);
  let id=colId+19.*row;let local=p.xy-vec2f(colId*bay,row*floorHeight);
  // The nearest row is a top-floor flat; its parapet recedes into dusk.
  // The subsequent retreat exposes the occupied floors beneath it.
  let roof=3.02+.035*step(1.5,colId);
  if(p.x> -18.0 && p.y<roof){
   col=facade(local,vec2f(colId,row));
   if(p.y>roof-.119){
    col=mix(vec3f(.027,.021,.037),vec3f(.109,.080,.105),smoothstep(roof-.096,roof-.039,p.y));
    col+=vec3f(.055,.035,.043)*bell((p.y-roof+.020)/.012);
   }
   let span=vec2f(1.748,1.025);let relative=local-vec2f(0.,1.440);
   let border=max(abs(relative.x)-span.x,abs(relative.y)-span.y);
   let sillY=local.y-.387;
   if(abs(relative.x)<1.849 && sillY<.06 && sillY>-.098){
    col=mix(vec3f(.021,.019,.027),vec3f(.124,.093,.094),smoothstep(-.036,.037,sillY));
   }
   if(border<.145 && border>-.01){
    let sill=smoothstep(-.33,.62,-relative.x*.43-relative.y*.73);
    let trim=.50+.42*bell((border-.088)/.020)+.23*bell((border-.024)/.014);
    col=mix(vec3f(.032,.022,.028),vec3f(.141,.092,.075),sill)*trim;
   }
   if(border<.0){
    let recess=.135/rd.z;let gp=p+rd*recess;
    let g=gp.xy-vec2f(colId*bay,row*floorHeight);let k=g-vec2f(0.,1.440);
    let opening=max(abs(k.x)-span.x+.032,abs(k.y)-span.y+.037);
    let mullion=abs(g.x+1.10)-.035;
    if(opening<0. && mullion>0.){
     let at=vec3f(g,.139);let known=row==0. && (colId==0.||colId==1.);
     let neighbor=hash21(vec2f(colId+1.,row+5.));
     if(known || (neighbor>.69 && t>69.9 && d<19.)){
      col=roomView(at,rd,id,t);
     }else{
      let fire=questionLight(id,t)*step(.64,neighbor);
      let gl=bell((g.x+.67)/.41)*bell((g.y-1.35)/.68);
      let shade=smoothstep(.06,.13,g.x+1.71)*(.64+.36*smoothstep(.07,.71,abs(g.x+1.08)));
      let behind=g+rd.xy/max(.2,rd.z)*.90;
      let curtain=.66+.34*smoothstep(.0,.15,abs(fract(behind.x*2.76+.41*neighbor)-.5));
      let lamp=(.62+.38*curtain)*(.81+.19*bell((behind.y-1.4)/.74));
      col=mix(vec3f(.009,.013,.025)*curtain,vec3f(.292,.152,.083)*lamp,fire*(.31+.62*gl))*shade;
     }
     if(id==0. && g.x<-.55){col=curtainAt(at,rd,col,questionLight(id,t));}
     // Same street reflects in both panes; the far pane has a faint offset
     // at oblique incidence, the frame occludes both layers.
     let reflected=vec3f(rd.xy,-rd.z);
     let fresnel=.028+.20*pow(1.-abs(rd.z),1.7);
     let skyReflection=skyline(reflected);
     let az=atan2(reflected.x,-reflected.z);
     let block=floor(az*7.);
     let roof=-.027+.040*hash11(block+6.);
     let bands=1.-smoothstep(.003,.007,abs(fract((reflected.y+.17)*14.)-.5));
     let hRoof=1.-smoothstep(.002,.008,abs(reflected.y-roof));
     let evening=vec3f(.30,.197,.235)*(.26+.49*bell((reflected.y-.035)/.143));
     let gRain=fbm(g*vec2f(2.4,.62)+vec2f(id,7.));
     col=mix(col,skyReflection+evening,fresnel*(.67+.42*gRain));
     col+=vec3f(.310,.211,.165)*(hRoof*.47+bands*.29*step(reflected.y,roof))*fresnel;

    }else{
     let edge=bell((mullion+.028)/.008)+bell((opening-.012)/.012);
     col=vec3f(.045,.035,.041)+vec3f(.134,.082,.051)*edge;
    }
   }
   if(t>63.35 && t<68.8){
    let spill=bell((p.x-(.76+(t-63.54)*1.30))/.691)*bell((p.y-1.39)/.65)
      *smoothstep(63.45,64.12,t)*(1.-smoothstep(66.48,67.61,t));
    col+=vec3f(.121,.056,.018)*spill*(.27+.73*smoothstep(-.05,.14,border));
    col+=flyingType(ro,rd,t);
   }
  }
 }
 let grain=hash21(coord.xy)*.86+.14*vnoise(pixel*A.screen.xy*.42);
 col*=.979+.042*grain;
 return vec4f(max(col,vec3f(.0001)),A.screen.w);
}
`;
