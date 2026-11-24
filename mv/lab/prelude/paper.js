import {FS_VS,NOISE} from "../lib.js";
export const PAPER=FS_VS+NOISE+`
struct Params{screen:vec4f, nib:vec4f}
@group(0)@binding(0) var<uniform> u:Params;
@group(0)@binding(1) var lin:sampler; @group(0)@binding(2) var ink:texture_2d<f32>;
@group(0)@binding(3) var first:texture_2d<f32>; @group(0)@binding(4) var cloud:texture_2d<f32>;
fn crossfade(uv:vec2f,t:f32,center:vec2f)->f32{
  let p=(uv-center)*vec2f(1.778,1.);
  let rim=length(p)*.71+.28*fbm(p*10.+.23*fbm(p*31.))+.055*vnoise(p*63.);
  return 1.-smoothstep(t*1.42-.09,t*1.42+.09,rim);}
fn brushOn(base:vec3f,p:vec2f)->vec3f{
  let tip=u.nib.xy;let dir=normalize(vec2f(.58,-1.));let side=vec2f(-dir.y,dir.x);
  let rel=p-tip;let h=dot(rel,dir);let offset=dot(rel,side);
  let lean=.010*sin(7.*clamp(h/.15,0.,1.))*(1.-smoothstep(.07,.18,h));
  let v=offset-lean;let press=clamp(u.nib.z*32.,0.,1.);
  let width=mix(.007,.019,press)*pow(clamp(h/.085,0.,1.),.8)+.012*smoothstep(.02,.09,h)-.009*smoothstep(.09,.158,h);
  let rad=select(.0185,width,h<.155);let aa=max(.0009,fwidth(offset));
  let shadow=(1.-smoothstep(rad*.4,rad+.023+u.nib.w*.03,abs(v+.012+.016*u.nib.w)))*smoothstep(-.004,.025,h);
  var out=base*(1.-.24*shadow);
  let mask=(1.-smoothstep(rad-aa,rad+aa,abs(v)))*smoothstep(-.002,.005,h);
  let roll=clamp(v/max(rad,.001),-1.,1.);let light=sqrt(max(0.,1.-roll*roll));
  let hair=.5+.5*cos(roll*72.+h*32.+3.*vnoise(vec2f(roll*25.,h*75.)));
  let damp=smoothstep(.035,.13,h);
  let bristles=mix(vec3f(.007,.006,.006),vec3f(.24,.17,.105),damp)*(.53+.47*light)*(.72+.28*hair);
  let cane=vec3f(.31,.161,.055)*(.38+.70*light+.10*vnoise(vec2f(roll*37.,h*9.)))+vec3f(.15,.09,.03)*pow(max(0.,1.-abs(roll+.32)),11.);
  var handle=mix(bristles,cane,smoothstep(.153,.159,h));
  let band=smoothstep(.149,.152,h)*(1.-smoothstep(.161,.166,h));
  handle=mix(handle,vec3f(.052,.038,.026)*(.7+.4*light),band);
  return mix(out,handle,mask);}
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0)vec4f{
  let t=u.screen.x;let uv=fc.xy/u.screen.yz;let aspect=u.screen.y/u.screen.z;
  let entry=smoothstep(2.25,4.12,t)*(1.-smoothstep(13.83,15.32,t));
  let center=mix(vec2f(.50,.418),vec2f(.510,.513),entry);
  let p0=(uv-.5)*vec2f(aspect,1.)*1.14*exp(-5.4*entry)+center;
  let water=smoothstep(15.62,17.84,t);
  let rate=t-15.6;let ripple=sin(uv.y*45.+2.8*fbm(uv*6.)-rate*2.3);
  let r=length((uv-vec2f(.52,.54))*vec2f(aspect,1.75));
  let ringPhase=51.*r-rate*9.4;
  let crest=exp(-pow((r-.38*max(rate,0.))/.34,2.))*sin(ringPhase);
  let drift=water*(.035+.16*smoothstep(16.4,18.2,t))*fbm(vec2f(uv.y*65.+rate,uv.x*3.4));
  let p=p0+vec2f(-drift+water*(.022*ripple+.021*crest),water*(.012*sin(uv.x*9.+rate*1.4)+.007*crest));
  let inkUV=p+.00085*vec2f(fbm(p*330.)-.5,fbm(p*330.+6.)-.5);
  let pigment=textureSampleLevel(ink,lin,inkUV,0.).rg;
  let arrival=pigment.g*2.024;let age=t-arrival;
  let cov=pigment.r*smoothstep(-.006,.014,age);
  let fibers=vnoise(vec2f(p.x*670.+p.y*52.,p.y*115.))-.5;
  let tooth=fbm(p*117.);let laid=vnoise(vec2f(p.x*27.,p.y*920.))-.5;
  let paper=vec3f(.903,.872,.791)*(.964+.038*fbm(p*9.)+.025*tooth+.023*fibers+.013*laid);
  let wet=mix(vec3f(.022,.018,.015),vec3f(.006,.010,.011),smoothstep(0.,.16,age));
  var col=mix(paper,wet*(.62+tooth*.7),cov);
  if(t>15.7 && t<18.4){
    var plume=0.;
    for(var k=1;k<=5;k++){
      let f=f32(k)/5.;let q=p-vec2f(f*drift*1.6,.011*f*water*sin(uv.y*91.));
      plume+=textureSampleLevel(ink,lin,q,1.+2.*f*water).r*(1.-.65*f)*.2;
    }
    col=mix(col,paper*vec3f(.28,.33,.34),water*plume*.75);
  }
  let a=textureSampleLevel(first,lin,uv,0.).rgb;let b=textureSampleLevel(cloud,lin,uv,0.).rgb;
  let ic=crossfade(uv,smoothstep(5.91,6.91,t),vec2f(.48,.41));
  let out=crossfade(uv,smoothstep(10.20,11.14,t),vec2f(.56,.45));
  let film=mix(mix(a,b,ic),a,out);
  let aperture=mix(cov,1.,smoothstep(.82,.99,entry))*smoothstep(1.98,2.43,t)*(1.-smoothstep(14.86,15.49,t));
  col=mix(col,film,aperture);
  if(t<2.43){col=brushOn(col,p);}
  let bleach=smoothstep(15.89,18.27,t);
  let reflectance=.07*ripple+.14*crest+.065*smoothstep(.50,.79,fbm(uv*vec2f(16.,67.)+vec2f(-rate*.2,rate*.62)));
  let table=mix(paper,vec3f(.67,.72,.71)*(1.+reflectance),.77*water);
  col=mix(col,table,bleach);
  if(t>17.67){col=mix(col,a,smoothstep(17.67,18.90,t));}
  return vec4f(col,1.);}
`;
