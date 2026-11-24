import {loadTidalMesh} from "./tidal-loader.js";
import {NOISE,shader} from '../lib.js';
import {TIDAL_SURFACE} from './tidal-ocean.js';
import {tidalNod} from './tidal-mesh.js';
export {makeTidalMesh,tidalFacePoint,tidalCheekPoint,tidalHeadRing,tidalHeadBounds,tidalWater} from './tidal-mesh.js';

const actor=NOISE+TIDAL_SURFACE+`
struct Frame{vp:mat4x4f,eyeTime:vec4f,range:vec4f}
@group(0)@binding(0)var<uniform> frame:Frame;
@group(0)@binding(1)var atlas:texture_2d<f32>;
@group(0)@binding(2)var inkSampler:sampler;
struct Surface{@builtin(position) clip:vec4f,@location(0) p:vec3f,
 @location(1) n:vec3f,@location(2) @interpolate(flat) part:u32}
@vertex fn vs(@location(0)p:vec3f,@location(1)n:vec3f,@location(2)id:f32)->Surface{
 var world=p;
 if(frame.range.z>.5){world.y=-3.6-world.y;}
 var out:Surface;out.clip=frame.vp*vec4f(world,1.);out.p=p;out.n=n;out.part=u32(id+.5);
 return out;
}
fn bell(x:f32,w:f32)->f32{let d=x/w;return exp(-d*d);}
fn oval(x:f32,y:f32,w:f32,h:f32)->f32{let q=vec2f(x/w,y/h);return exp(-dot(q,q));}
// Analytic derivative of one band-limited value-noise cell. This perturbs
// the light frame without moving the cheek plane on which the letter sits.
fn grainSlope(p:vec3f)->vec3f{
 let g=floor(p);let f=fract(p);let u=f*f*(3.-2.*f);let du=6.*f*(1.-f);
 let a=vec4f(hash31(g),hash31(g+vec3f(1,0,0)),hash31(g+vec3f(0,1,0)),hash31(g+vec3f(1,1,0)));
 let b=vec4f(hash31(g+vec3f(0,0,1)),hash31(g+vec3f(1,0,1)),hash31(g+vec3f(0,1,1)),hash31(g+vec3f(1,1,1)));
 let slopeX=mix(mix(a.y-a.x,a.w-a.z,u.y),mix(b.y-b.x,b.w-b.z,u.y),u.z);
 let slopeY=mix(mix(a.z-a.x,a.w-a.y,u.x),mix(b.z-b.x,b.w-b.y,u.x),u.z);
 let slopeZ=mix(mix(b.x-a.x,b.y-a.y,u.x),mix(b.z-a.z,b.w-a.w,u.x),u.y);
 return vec3f(slopeX,slopeY,slopeZ)*du;
}
fn thread(d:f32,w:f32,px:f32)->f32{
 let width=max(w,px*.65);return bell(d,width)*w/width;
}
fn lobe(y:f32,b:f32,e:f32)->f32{return smoothstep(b,b+.055,y)*(1.-smoothstep(e-.055,e,y));}
fn torsoLight(p:vec3f,px:f32)->vec2f{
 let x=abs(p.x);let y=p.y;let f=clamp(x/.485,0.,1.);
 let clav=-.527+.057*sin(f*2.76)-.018*bell(x,.068);
 let pecTurn=(x-.225)/.246;
 let pec=-.966+.087*pecTurn*pecTurn+.085*smoothstep(.30,.48,x);
 let rib=-1.063-.190*smoothstep(.05,.31,x)+.022*smoothstep(.28,.44,x);
 let spread=smoothstep(.013,.066,x)*(1.-smoothstep(.427,.47,x));
 let ca=lobe(x,-.010,.456);let pa=spread*(.28+.70*smoothstep(.10,.38,x));
 let bone=ca*thread(y-clav,.0056,px)+pa*thread(y-pec,.004,px)+spread*.65*thread(y-rib,.005,px);
 var glimmer=.51*bone;
 glimmer+=.22*ca*bell(y-clav,.030)+.30*pa*bell(y-pec,.027);
 let root=.022+.169*smoothstep(-.56,-.24,y);
 glimmer+=lobe(y,-.57,-.221)*(.80*thread(x-root,.0036,px)+.36*thread(x-root*.71,.0029,px));
 // Each branch follows a different anatomical plane: upper ribs, flank, rectus.
 let bend=clamp((-y-.99)/.88,0.,1.);
 let centre=.027+.020*sin(3.8*bend)+.005*sin(y*21.);
 let inner=.102+.016*sin(4.7*bend)+.060*bend*bend;
 let flank=.305+.071*cos(2.8*bend)-.085*bend;
 let skirt=.22-.037*sin(6.0*bend);
 let stream=lobe(y,-2.,-.976);
 glimmer+=stream*(.74*thread(x-centre,.0028,px)+.88*thread(x-inner,.0038,px)+
   .72*thread(x-flank,.0045,px)+.43*thread(x-skirt,.0028,px));
 glimmer+=.37*lobe(y,-.97,-.55)*thread(x-(.011+.012*sin(y*18.)),.004,px);
 for(var k=0;k<3;k++){
   let j=f32(k);let slope=-.88-.085*j-.14*smoothstep(.15,.41,x)+.013*sin(x*11.+j);
   glimmer+=.28*lobe(x,.125,.425)*thread(y-slope,.0029,px);
 }
 return vec2f(glimmer,stream*(.5*bell(x-inner,.048)+.8*bell(x-flank,.041)));
}
fn armLight(p:vec3f,px:f32)->f32{
 let x=abs(p.x);let y=p.y;let u=clamp((-y-.48)/1.4,0.,1.);
 let arm=.442+.371*pow(u,.88);
 let shoulder=.461+.090*smoothstep(.01,.20,u);
 let fore=arm+.031*sin(7.*u+.3);
 var v=lobe(y,-2.,-.56)*(.66*thread(x-fore,.0036,px)+.39*thread(x-arm+.044-.012*sin(11.*u),.0028,px));
 v+=.34*lobe(y,-.90,-.51)*thread(x-shoulder,.0048,px);
 return v;
}
fn scripture(p:vec3f,front:f32,t:f32,px:f32)->f32{
 if(p.y>-.511 || front<.03){return 0.;}
 let x=abs(p.x);let waist=1.-smoothstep(-1.07,-.86,p.y);
 let lateral=x+.034*sin(p.y*4.5+x*8.)+.020*p.y;
 let page=vec2f(lateral/.029,(-p.y+.020*sin(x*30.)+(t-49.)*.018)/.030);
 let tile=floor(page);let cell=fract(page);
 let random=hash22(tile);
 let i=floor(frame.range.x+random.x*frame.range.y);
 let uv=(vec2f(i%32.,floor(i/32.))+cell)/32.;
 let mark=textureSampleLevel(atlas,inkSampler,uv,clamp(log2(max(px,.00015)*128./.029),0.,5.)).r;
 let paths=smoothstep(.12,.70,.5+.5*cos(page.x*.95+.94*sin(p.y*3.1)));
 let intermittent=smoothstep(.20,.77,random.y+waist*.17);
 let chest=.40*lobe(p.y,-.737,-.532)*smoothstep(.099,.193,x);
 return mark*paths*intermittent*(waist*.86+chest)*front;
}
@fragment fn fs(i:Surface)->@location(0) vec4f{
 let p=i.p;let t=frame.eyeTime.w;
 let px=max(.00012,max(length(dpdx(p)),length(dpdy(p))));
 var n=normalize(i.n);let v=normalize(frame.eyeTime.xyz-p);
 if(i.part==1u && px<.006){
   let coarse=grainSlope(p*vec3f(106.,133.,102.)+17.4);
   let fine=grainSlope(p*vec3f(267.,310.,274.)-4.2);
   let relief=.030*coarse*(1.-smoothstep(.002,.006,px))+.015*fine*(1.-smoothstep(.0007,.0029,px));
   n=normalize(n+relief-n*dot(relief,n));
 }
 let h=tideHeight(p.xz,t);if(p.y<h-.009){discard;}
 let growth=smoothstep(45.72,49.40,t);
 let fog=fbm(p.xy*5.4+p.z*3.1)-.46;
 let height=-1.87+2.46*growth;
 let current=cos(p.x*13.+.22*sin(p.y*7.))*.18+(.5+.5*sin(p.x*21.+p.y*.9))*.35;
 let lift=(1.-growth)*(current+.46*bell(p.x,.21))+.76*fog*(1.-growth);
 let flesh=smoothstep(-.20,.35,height+lift-p.y+fog*.34);
 let trace=smoothstep(46.25,48.90,t)*smoothstep(-.19,.59,height+.41+lift-p.y+fog*.82);
 if(flesh+trace<.001){discard;}
 let facing=max(0.,dot(n,v));let fres=pow(1.-facing,2.35);
 let front=smoothstep(-.06,.12,p.z);
 let warm=normalize(vec3f(-.77,.72,.39));let cool=normalize(vec3f(.80,.32,.31));
 let side=smoothstep(-.23,.84,dot(n,warm));let fill=smoothstep(-.16,.86,dot(n,cool));
 let ridgeL=max(0.,dot(n,normalize(vec3f(-.88,.28,-.26))));
 let ridgeR=max(0.,dot(n,normalize(vec3f(.89,.36,-.20))));
 let ridge=pow(ridgeL,5.)+.92*pow(ridgeR,5.);
 let velvet=vec3f(.090,.045,.050)+vec3f(.125,.072,.051)*side+vec3f(.058,.042,.046)*fill;
 var color=velvet*(.83+.22*vnoise3(p*24.));
 color+=vec3f(.53,.32,.15)*pow(max(0.,dot(n,normalize(warm+v))),25.)*.48;
 color+=vec3f(.40,.31,.25)*pow(max(0.,dot(n,normalize(cool+v))),38.)*.46;
 var channels=0.;var letter=0.;
 var faceRim=1.;
 if(i.part==1u||i.part==4u){
   let cy=p.y+.242;let cz=p.z+.033;
   let local=vec3f(p.x,-.275+cy*${Math.cos(tidalNod)}+cz*${Math.sin(tidalNod)},-.033-cy*${Math.sin(tidalNod)}+cz*${Math.cos(tidalNod)});
   let a=abs(local.x);let u=clamp((a-.031)/.117,0.,1.);
   let arc=sin(3.14159265*u);let lid=.019-.0082*(u-.5)+.0017*arc;
   let span=smoothstep(.026,.046,a)*(1.-smoothstep(.130,.153,a))*front;
   let lip=-.144+.0018*bell(a-.022,.013)-.0080*smoothstep(.022,.069,a);
   let nose=oval(a-.030,local.y+.086,.009,.0048)*front;
   let mouth=thread(local.y-lip,.0018,px)*bell(a,.050)*front;
   let cheek=oval(a-.112,local.y+.077,.061,.101)*front;
   let vellum=vnoise3(local*vec3f(59.,66.,54.))-.5;
   // A broad frontal source reads the cheeks and the widening nose plane.
   // The moon catches the true outer rim; central features receive softer fill.
   let incident=dot(n,normalize(vec3f(-.46,.73,.49)));
   let broad=.75*max(0.,incident)+.25*smoothstep(-.24,.76,incident);
   let jaw=oval(a-.083,local.y+.227,.098,.052)*front;
   let under=max(0.,dot(n,normalize(vec3f(.13,-.66,.73))));
   let glancing=pow(max(0.,dot(n,normalize(warm+v))),22.);
   color=(vec3f(.053,.035,.041)+vec3f(.238,.155,.110)*broad+vec3f(.040,.032,.033)*fill)
       *(.91+.11*vnoise3(local*24.)+cheek*.042*vellum);
   color+=vec3f(.126,.073,.047)*glancing;
   let orbital=oval(a-.091,local.y-.036,.057,.023)*front;
   let alaPocket=oval(a-.031,local.y+.088,.014,.007)*front;
   color*=1.-.17*orbital-.29*alaPocket;
   let lidVolume=oval(a-.088,local.y-lid-.014,.046,.014)*front;
   color+=vec3f(.042,.029,.021)*lidVolume*broad;
   color+=vec3f(.077,.052,.039)*jaw*under*(.48+.52*smoothstep(51.6,53.3,t));
   color*=1.-.26*span*thread(local.y-lid,.0022,px)-.32*nose-.34*mouth;
   color*=1.-.12*span*bell(local.y-lid-.014,.007);
   color+=vec3f(.078,.046,.030)*oval(local.x,local.y+.154,.052,.007)*front;
   faceRim=.13+.87*max(smoothstep(.103,.165,a),smoothstep(.146,.243,local.y)*.73);
   channels=.075*oval(a-.141,local.y+.073,.020,.048)*front;
   if(i.part==4u){
     let open=smoothstep(49.38,51.98,t);
     let high=lid+arc*(.00035+.00840*open);
     let low=lid-.0037*arc;
     if(local.y>high||local.y<low){discard;}
     let pupil=oval(a-.082-local.x*.028,local.y-lid+.0010,.015,.008);
     let depth=clamp((local.y-low)/max(.001,high-low),0.,1.);
     let slit=smoothstep(.12,.35,u)*(1.-smoothstep(.70,.93,u));
     let hood=.22+.78*(1.-smoothstep(.25,.89,depth));
     let catchlight=oval(a-.099,depth-.31,.012,.20);
     let iris=mix(vec3f(.242,.195,.147),vec3f(.092,.075,.068),pupil*.85);
     color=mix(vec3f(.057,.044,.044),iris*hood+vec3f(.158,.131,.090)*catchlight,
               slit*(.42+.58*open));
     faceRim=.035;channels=0.;
   }
 }else if(i.part==0u||i.part==2u){
   let limb=smoothstep(.40,.51,abs(p.x));
   let lines=torsoLight(p,px);channels=mix(lines.x*front,armLight(p,px)*(.27+.73*front),limb);
   letter=scripture(p,front,t,px)*(1.-limb*.80)*(.38+.55*(1.-smoothstep(-1.76,-1.09,p.y)));
   let innerArm=smoothstep(.42,.56,abs(p.x))*max(0.,-sign(p.x)*n.x);
   let flank=bell(abs(p.x)-(.349+.072*smoothstep(-1.47,-1.0,p.y)),.046)*lobe(p.y,-1.91,-.85);
   let silk=1.16*pow(innerArm,1.55)+.65*flank*front+.56*lines.y*front;
   color*=1.-.31*oval(p.x,p.y+.77,.37,.14)*front;
   color+=vec3f(.72,.31,.080)*silk+vec3f(.22,.13,.059)*silk*silk;

 }else{channels=.25;}
 let waterGlow=(1.-smoothstep(.01,.34,p.y-h))*(.65+.35*sin(p.x*13.+t*.57));
 let brilliance=faceRim*(.49*ridge+1.75*fres)+.76*channels+.70*letter+.58*waterGlow;
 let core=faceRim*(.36*ridge*ridge+1.57*pow(fres,3.))+.44*channels*channels+.46*letter+.17*waterGlow;
 let emission=vec3f(1.12,.58,.23)*brilliance+vec3f(1.17,.95,.61)*core;
 color+=emission;
 let foamLevel=h+.026*sin(p.x*26.+t*.92)+.019*sin(p.x*53.-t*.63);
 let wet=.04+.96*smoothstep(-.018,.136,p.y-foamLevel);
 // Transmission carries the real moon and horizon through the thin parts.
 // The light travelling along the surface remains visible on both sides of it.
 let torso=i.part==0u || i.part==2u;
 let outerArm=smoothstep(.44,.59,abs(p.x));
 let fromWaist=smoothstep(-1.66,-.85,p.y)*(1.-smoothstep(-.59,-.40,p.y));
 let thickness=mix(.46,1.10,fromWaist*(1.-outerArm))*(.69+.31*facing);
 let opacity=select(.73+.20*facing-.20*ridge,1.-exp(-1.10*thickness),torso);
 let alpha=opacity*flesh*wet;
 let lightAlpha=trace*(brilliance*.22+.12)*wet;
 let coverage=clamp(alpha+lightAlpha*(1.-alpha),0.,.996);
 let volume=color*alpha+vec3f(1.25,.76,.39)*trace*(1.-flesh)*(.41*fres+.58*channels+.79*waterGlow+.58*letter);
 let rimLight=select(vec3f(0.),emission*(.44*(1.-opacity)*flesh*wet),torso);
 return vec4f(volume+rimLight,coverage);
}`;

export async function createTidalFigure(g,atlas,post){
 const {device}=g, mesh=await loadTidalMesh();
 const upload=(arr,usage)=>{
   const buf=device.createBuffer({size:arr.byteLength,usage:usage|GPUBufferUsage.COPY_DST});
   device.queue.writeBuffer(buf,0,arr);return buf;
 };
 const vertex=upload(mesh.vertices,GPUBufferUsage.VERTEX),index=upload(mesh.indices,GPUBufferUsage.INDEX);
 const module=shader(device,actor,'月前的潮汐巨像');
 const layout=device.createBindGroupLayout({entries:[
   {binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},
   {binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
   {binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}}
 ]});
 const pipelineLayout=device.createPipelineLayout({bindGroupLayouts:[layout]});
 const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}};
 const pipes=['ccw','cw'].map(frontFace=>device.createRenderPipeline({
   layout:pipelineLayout,vertex:{module,entryPoint:'vs',buffers:[{arrayStride:28,attributes:[
     {shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'},{shaderLocation:2,offset:24,format:'float32'}]}]},
   fragment:{module,entryPoint:'fs',targets:[{format:'rgba16float',blend}]},
   primitive:{frontFace,cullMode:'back'},depthStencil:{format:'depth32float',depthWriteEnabled:true,depthCompare:'less'}
 }));
 const uniforms=pipes.map(()=>device.createBuffer({size:96,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));
 const tex=atlas.tex.createView(),groups=uniforms.map(buffer=>device.createBindGroup({layout,entries:[
   {binding:0,resource:{buffer}},{binding:1,resource:tex},{binding:2,resource:atlas.sampler}]}));
 const data=new Float32Array(24);const [a,b]=atlas.info.groupRanges['cn-kai'];data[20]=a;data[21]=b-a+1;
 return {draw(pass,cam,t,mirror=false){
   if(t<=45.72)return;
   const slot=mirror?1:0;
   data.set(cam.vp);data.set(cam.eye,16);data[19]=t;data[22]=slot;
   device.queue.writeBuffer(uniforms[slot],0,data);
   pass.setPipeline(pipes[slot]);pass.setBindGroup(0,groups[slot]);
   pass.setVertexBuffer(0,vertex);pass.setIndexBuffer(index,'uint32');pass.drawIndexed(mesh.indices.length);
 }};
}
