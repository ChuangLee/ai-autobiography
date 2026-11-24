import {TIDAL_SKY} from "./tidal-sky.js";
// Model coordinates. High-frequency capillaries are shading only. The actor,
// floating inscriptions and water depth use the same long and cross swells.
export const TIDAL_SURFACE=`
fn tidePhase(p:vec2f,t:f32)->vec4f{
 let s=t-44.58;
 return vec4f(dot(p,vec2f(1.43,3.54))-.91*s+.71,
              dot(p,vec2f(-2.68,5.20))-1.28*s+2.43,
              dot(p,vec2f(5.71,7.86))-1.69*s+1.92,
              dot(p,vec2f(-9.1,11.06))-2.15*s+.54);
}
fn tideHeight(p:vec2f,t:f32)->f32{
 let a=tidePhase(p,t);
 let h=dot(sin(a)+.19*sin(a*2.-.82),vec4f(.040,.024,.012,.006));
 let x=14.5*p.x+7.7*p.y+.72*sin(5.1*p.y-1.7*t)-1.83*t;
 let z=-8.4*p.x+17.6*p.y+.9*sin(3.3*p.x+1.1*t)-2.02*t;
 return -1.80+h+.008*sin(x)+.006*sin(z);
}
fn tideSlope(p:vec2f,t:f32)->vec2f{
 let a=tidePhase(p,t);let s=(cos(a)+.38*cos(a*2.-.82))*vec4f(.040,.024,.012,.006);
 let b=5.1*p.y-1.7*t;let c=3.3*p.x+1.1*t;
 let k=.008*cos(14.5*p.x+7.7*p.y+.72*sin(b)-1.83*t);
 let l=.006*cos(-8.4*p.x+17.6*p.y+.9*sin(c)-2.02*t);
 return vec2f(dot(s,vec4f(1.43,-2.68,5.71,-9.10)),dot(s,vec4f(3.54,5.20,7.86,11.06)))
    +k*vec2f(14.5,7.7+3.672*cos(b))+l*vec2f(-8.4+2.97*cos(c),17.6);
}
`;

import {FS_VS,NOISE} from "../lib.js";
const FRAME=`
struct SeaFrame {vp:mat4x4f,eye:vec4f,right:vec4f,up:vec4f,forward:vec4f,screen:vec4f};
@group(0) @binding(0) var<uniform> s:SeaFrame;
fn bell(x:f32)->f32{return exp(-min(36.,x*x));}
`;
export const TIDAL_SEA=FS_VS+NOISE+TIDAL_SURFACE+FRAME+`
@group(0) @binding(1) var reflected:texture_2d<f32>;
@group(0) @binding(2) var lin:sampler;
fn cloud(p:vec2f)->f32{
 let a=vnoise(p);let q=vec2f(p.x*1.77+.68*p.y,-p.x*.68+1.77*p.y);
 return .54*a+.30*vnoise(q+2.8)+.16*vnoise(q*2.2-8.);
}
`+TIDAL_SKY+`
fn capillary(p:vec2f,t:f32,foot:f32)->vec2f{
 let shift=t-44.58;let phase=vec4f(dot(p,vec2f(13.,27.)),dot(p,vec2f(-29.,43.)),
     dot(p,vec2f(46.,58.)),dot(p,vec2f(-105.,89.)));
 let a=phase-shift*vec4f(2.4,3.6,4.2,5.9)+vec4f(.19,2.3,.84,1.95)+2.*sin(p.y*6.+p.x*3.3);
 let pix=foot*vec4f(4.5,8.4,12.8,19.8);
 let strength=exp(-.5*pix*pix);
 let k=cos(a)*strength*vec4f(.087,.099,.073,.046);
 return vec2f(dot(k,vec4f(.48,-.56,.66,-.72)),dot(k,vec4f(.86,.81,.76,.71)));
}
struct Pixel { @location(0) col:vec4f, @builtin(frag_depth) depth:f32 };
@fragment fn fs(@builtin(position) fc:vec4f)->Pixel{
 let uv=fc.xy/s.screen.xy;let nd=vec2f(uv.x*2.-1.,1.-2.*uv.y);
 let rd=normalize(s.forward.xyz+s.right.xyz*nd.x*s.right.w*s.up.w+s.up.xyz*nd.y*s.right.w);
 let eye=s.eye.xyz;let t=s.eye.w;
 var o:Pixel;o.depth=1.;
 if(rd.y>=-.001){o.col=vec4f(sky(rd,t),1.);return o;}
 let centre=(-1.80-eye.y)/rd.y;
 if(centre<=0.){o.col=vec4f(sky(rd,t),1.);return o;}
 if(centre>=93.){
   o.col=vec4f(sky(normalize(vec3f(rd.x,-.001,rd.z)),t),1.);return o;
 }
 var dist=centre;
 if(centre<11.){
   // Intersect the first visible wave. Bracketing from its highest possible crest
   // keeps troughs hidden from a grazing lens and prevents jumping across a crest.
   var a=max(0.,(-1.689-eye.y)/rd.y);var b=(-1.911-eye.y)/rd.y;
   let span=(b-a)/8.;var prev=a;
   for(var j=1;j<=8;j++){
     let at=a+f32(j)*span;let w=eye+rd*at;
     if(w.y<=tideHeight(w.xz,t)){b=at;break;}prev=at;
   }
   a=prev;
   for(var j=0;j<4;j++){let mid=.5*(a+b);let w=eye+rd*mid;
      if(w.y>tideHeight(w.xz,t)){a=mid;}else{b=mid;}}
   dist=(a+b)*.5;
 }
 let w=eye+dist*rd;let p=w.xz;
 let foot=dist*s.right.w*2./(s.screen.y*max(.04,-rd.y));
 let geometric=tideSlope(p,t);
 let slope=(geometric+capillary(p,t,foot))*(1.-smoothstep(15.,58.,dist)*.94);
 let normal=normalize(vec3f(-slope.x,1.,-slope.y));
 let refl=reflect(rd,normal);
 let almost=clamp(1.-max(.0,dot(-rd,normal)),0.,1.);
 let fres=.034+.966*pow(almost,5.);
 let fade=1.-exp(-.047*dist);
 let moonDir=normalize(vec3f(.0,.112,-1.));let angle=length(refl-moonDir);
 let lunar=(1.-smoothstep(.13,.34+foot*.12,angle))*smoothstep(-.08,.035,refl.y);
 let thread=pow(max(0.,dot(normal,normalize(moonDir-rd))),63.);
 let wind=cloud(p*vec2f(.94,1.63)+vec2f(3.5,t*.026));
 let rise=smoothstep(44.88,49.4,t);
 let shore=.14+.62*rise;
 let dark=mix(vec3f(.004,.010,.015),vec3f(.027,.034,.047),wind*.58+.42*max(.0,refl.y));
 let steel=pow(clamp(.50+.50*refl.y,0.,1.),3.4);
 let ink=dark*(.77+1.22*fres)+vec3f(.046,.051,.067)*steel;
 let rough=vec3f(.32,.282,.254)*(lunar*.33+.62*thread)*(.19+.81*fres)*(.33+.67*wind);
 // Intersect the reflected sightline with the figure's plane. Project that
 // point back through its true mirror camera. A different crest sees a
 // different piece of the figure, even where adjacent pixels meet its feet.
 let reflectedRay=reflect(rd,normalize(vec3f(-slope.x*.87,1.,-slope.y*.84)));
 let span=clamp(-p.y/min(-.01,reflectedRay.z),0.,9.);
 let source=w+span*reflectedRay;
 let mirror=s.vp*vec4f(source.x,-3.60-source.y,source.z,1.);
 let refUV=vec2f(.5)+vec2f(.5,-.5)*mirror.xy/max(.001,mirror.w);
 let valid=step(.0001,mirror.w)*step(.0,min(refUV.x,refUV.y))*step(max(refUV.x,refUV.y),1.)
   *smoothstep(-.05,.23,p.y)*(1.-smoothstep(52.94,53.56,t));
 let ghost=textureSampleLevel(reflected,lin,clamp(refUV,vec2f(.0),vec2f(1.)),0.).rgb*valid;
 let crest=(tideHeight(p,t)+1.8)*11.;
 let wake=exp(-1.22*abs(p.y-.30))*bell((p.x+.05*sin(8.*p.y))/.86);
 let lit=pow(max(0.,1.-abs(slope.y+.07)),16.)*(.24+.76*max(.0,crest+.34));
 let glints=vec3f(.46,.245,.102)*rise*wake*(.05+.68*lit);
 var c=ink+rough+glints+ghost*(.055+.32*fres)*(.38+.62*wind);
 let ripple=p*vec2f(10.,25.)+vec2f(.43*sin(11.*p.y-.68*t),.77*sin(p.x*7.3+.55*t));
 let windBreak=cloud(ripple+vec2f(.19*t,-.45*t));
 let waveShadow=smoothstep(-.22,.53,slope.y);
 let chop=pow(clamp(.14+windBreak*.8+waveShadow*.24,0.,1.),6.);
 let micro=exp(-min(12.,foot*8.));
 let flowShade=mix(vec3f(.245,.272,.305),vec3f(.61,.384,.233),wake*rise);
 c+=flowShade*chop*(.28+.72*micro)*(.29+.71*fres);
 let crossing=bell((p.y+.02-.14*cos(p.x*7.3)-.041*sin(p.x*21.-t*.93))/.085)
     *exp(-pow(abs(p.x)/.97,5.));
 c+=vec3f(.81,.51,.23)*crossing*rise*(.08+1.77*chop)*(.29+.71*windBreak);
 let spindrift=smoothstep(.12,.78,crest)*smoothstep(.42,.74,windBreak)
   *(.31+.69*max(0.,slope.y))*exp(-foot*11.);
 let arms=min(abs(p.x-.78),abs(p.x+.78));
 let contact=bell((p.y-.18)/.39)*max(bell(arms/.19),bell(p.x/.42));
 c+=mix(vec3f(.095,.103,.112),vec3f(.39,.247,.134),wake*shore)
   *spindrift*(.38+.95*wake+1.7*contact);
 // Small wind-driven crests ride across the long swell. Their broken
 // downwind edges catch an overcast sky even outside the moon's light path.
 let run=p.y*83.+p.x*19.+2.1*sin(p.x*12.7+p.y*5.1-t*.52)
   +3.7*windBreak-2.79*t;
 let rip=cos(run);
 let spread=exp(-pow(foot*11.8,2.));
 let rim=pow(max(0.,rip),7.)*smoothstep(.29,.78,windBreak)*(.35+.65*waveShadow)*spread;
 let silver=mix(vec3f(.21,.23,.26),vec3f(.49,.344,.202),wake*rise);
 c+=silver*rim*(.36+.55*fres);
 c*=1.-.095*spread*max(0.,-rip)*waveShadow;
 c=mix(c,vec3f(.043,.038,.046),fade*.89);
 if(dist>25.){
   let haze=sky(normalize(vec3f(rd.x,-.001,rd.z)),t);
   c=mix(c,haze,smoothstep(25.,93.,dist));
 }
 if(dist<99.){let clip=s.vp*vec4f(w,1.);o.depth=clamp(clip.z/clip.w,.0,.99999994);}
 o.col=vec4f(c,1.);return o;
}
`;

const COURSE=`
fn course(f:f32,lane:u32,t:f32)->vec2f{
 let side=select(-1.,1.,(lane&1u)==1u);let n=f32(lane/2u);let h=hash11(n*37.+side*3.+5.);
 let sheaf=smoothstep(.01,.73,f);
 let z=-.11+f*(3.98+.31*h);
 let width=(.11+n*.052)*(.70+.30*sheaf)+(.21+.023*n)*f+(.22+n*.207)*f*f;
 let bend=(.030+.105*sheaf)*sin(1.9*z+n*.46+side*.73)+.039*sin(z*5.3+n*.72+t*.13);
 var p=vec2f(side*(width+bend),z);
 if(n>7.5){
   let w=(n-7.5)*.18;
   p=vec2f(side*(.45+f*(2.48+w)+.16*sin(3.*f+n)),.06+.115*n+.31*sin(4.6*f+n*.45)+.45*f);
 }
 return p;
}
`;

export const TIDAL_LETTERS=NOISE+TIDAL_SURFACE+FRAME+COURSE+`
@group(0) @binding(1) var letters:texture_2d<f32>;
@group(0) @binding(2) var lin:sampler;
@group(0) @binding(3) var<storage,read> text:array<u32>;
struct Word { @builtin(position) clip:vec4f, @location(0) uv:vec2f, @location(1) @interpolate(flat) cell:vec2f, @location(2) tint:vec4f };
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) id:u32)->Word{
 let corner=array<vec2f,4>(vec2f(-.5,-.5),vec2f(.5,-.5),vec2f(-.5,.5),vec2f(.5,.5))[vi];
 let lane=id/64u;let j=id%64u;let n=f32(lane/2u);let side=select(-1.,1.,(lane&1u)==1u);
 let h=hash11(f32(lane)*19.+3.);let g=hash11(f32(id)*.713+7.);
 let t=s.eye.w;
 let f=fract((f32(j)+.22*h)/64.-(t-44.58)*(.026+.008*h));
 let xz=course(f,lane,t);let step=course(f+.002,lane,t)-xz;
 let axis=normalize(step);
 let p=vec3f(xz.x,tideHeight(xz,t),xz.y);
 let gather=smoothstep(44.80,47.36,t);
 let arch=(1.-smoothstep(0.,.19,f))*(1.-stepFn(n))*gather;
 let hang=arch*arch*(.52+.70*h);
 let inward=vec3f(side*(.26+.12*h),-1.80+hang,.14+.09*h);
 var mark=mix(p,inward,arch*.85);
 let slope=tideSlope(mark.xz,t);
 let incline=mix(.21+.09*h,.80,arch);
 let bearing=normalize(vec2f(-.30*axis.x,-1.));
 let horizontal=vec2f(-bearing.y,bearing.x);
 let up=normalize(vec3f(bearing.x,incline+dot(bearing,slope)*.87,bearing.y));
 let across=normalize(vec3f(horizontal.x,dot(horizontal,slope),horizontal.y));
 // Vary the amount of water over a word. This is evaluated against the same
 // depth surface as the ocean, so troughs hide the bottoms of real strokes.
 let size=(.044+.017*h+.012*g)*mix(.84,1.12,smoothstep(.3,.96,f));
 mark.y+=.004+size*.116+.006*sin(5.7*xz.y+2.4*xz.x-t*.72);
 let wp=mark+size*(across*corner.x+up*corner.y);
 var out:Word;out.clip=s.vp*vec4f(wp,1.);out.uv=vec2f(corner.x+.5,.5-corner.y);
 let glyph=text[id];out.cell=vec2f(f32(glyph%32u),f32(glyph/32u));
 let amplitude=.55+.45*sin(7.8*f+n*.34-t*.25);
 let glint=.51+.66*amplitude*amplitude+.15*g;
 let gold=mix(vec3f(.26,.29,.30),vec3f(.89,.68,.385),(.32+.67*gather)*(.72+.28*h));
 let edge=smoothstep(.002,.039,f)*(1.-smoothstep(.91,.998,f));
 out.tint=vec4f(gold*glint,edge*(.48+.36*h+.15*g)*mix(.70,1.,gather));return out;
}
fn stepFn(n:f32)->f32{return smoothstep(5.,9.,n);}
@fragment fn fs(i:Word)->@location(0) vec4f{
 let ink=textureSample(letters,lin,(i.cell+i.uv)/32.).r*i.tint.a;
 return vec4f(i.tint.rgb*ink,ink);
}
`;

export const TIDAL_BOAT=TIDAL_SURFACE+FRAME+`
struct Vessel {@builtin(position) clip:vec4f,@location(0) shade:vec3f};
@vertex fn vs(@builtin(vertex_index) id:u32)->Vessel{
 let face=id/6u;let corner=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.))[id%6u];
 let k=face%18u;let side=select(-1.,1.,(face/18u)%2u==1u);
 let row=face/36u;let x=(f32(k)+corner.x)/18.*2.-1.;
 let beam=(.10+.90*max(0.,1.-x*x))*(.95-.11*x);
 let ribs=array<vec3f,5>(vec3f(.18,-.021,.28),vec3f(.78,.015,.65),vec3f(1.,.031,.36),vec3f(.92,.035,1.),vec3f(.23,.009,.18));
 let lo=ribs[row];let hi=ribs[row+1u];let rail=mix(lo,hi,corner.y);
 let centre=vec2f(-.115,2.53);let forward=normalize(vec2f(.58,-.82));let lateral=vec2f(-forward.y,forward.x);
 let dx=forward*x*.139+lateral*side*beam*.042*rail.x;
 let draft=tideHeight(centre,s.eye.w);let tilt=tideSlope(centre,s.eye.w);
 let lift=.024*pow(abs(x),3.4)+rail.y;
 let point=vec3f(centre.x+dx.x,draft+dot(dx,tilt)*.78+lift,centre.y+dx.y);
 var o:Vessel;o.clip=s.vp*vec4f(point,1.);o.shade=mix(vec3f(.004,.005,.007),vec3f(.074,.061,.041),rail.z*(.53+.27*side));return o;
}
@fragment fn fs(i:Vessel)->@location(0) vec4f{return vec4f(i.shade,1.);}
`;

// Intermittent filaments on the windward faces join the inscriptions. Each
// ribbon crosses behind the sea depth at the start of the next trough.
export const TIDAL_CURRENTS=NOISE+TIDAL_SURFACE+FRAME+COURSE+`
struct Thread {@builtin(position) clip:vec4f,@location(0) pigment:vec4f};
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) lane:u32)->Thread{
 let f=f32(vi/2u)/112.;let lr=select(-1.,1.,vi%2u==1u);let t=s.eye.w;
 let track=lane%24u;let h=hash11(f32(lane)*5.51+2.9);let id=f32(track);
 let a=course(f,track,t);let tangent=normalize(course(f+.002,track,t)-a);
 let crosswise=vec2f(-tangent.y,tangent.x);
 let twin=select(-1.,1.,lane>=24u);
 let drift=.024*sin(7.*f+.42*id-.18*t)+.009*sin(23.*f+id+t*.31);
 let width=mix(.0015,.0037,h)*(1.+f*.45);
 let p=a+crosswise*(twin*(.012+.014*h)+drift+lr*width);
 let above=.003+.004*sin(f*23.+id*.83-t*.44);
 let wp=vec3f(p.x,tideHeight(p,t)+above,p.y);
 let exposure=clamp(.35+.48*sin(f*16.+id*.55-t*.30)+.75*tideSlope(p,t).y,0.,1.);
 let life=smoothstep(0.,.028,f)*(1.-smoothstep(.92,1.,f));
 let amber=smoothstep(46.,49.7,t);
 let strength=life*(.22+.77*exposure*exposure)*(.42+.47*h);
 var o:Thread;o.clip=s.vp*vec4f(wp,1.);
 o.pigment=vec4f(mix(vec3f(.34,.35,.39),vec3f(1.47,.86,.38),amber)*strength,strength);return o;
}
@fragment fn fs(i:Thread)->@location(0) vec4f{return i.pigment;}
`;

export const TIDAL_MIST=FS_VS+NOISE+FRAME+`
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
 let nd=vec2f(2.,-2.)*fc.xy/s.screen.xy+vec2f(-1.,1.);
 let rd=normalize(s.forward.xyz+s.right.xyz*nd.x*s.right.w*s.up.w+s.up.xyz*nd.y*s.right.w);
 let t=s.eye.w;let age=t-44.58;let boil=smoothstep(.22,1.45,age)*(1.-smoothstep(2.45,5.35,age));
 var color=vec4f(0.);
 for(var k=0;k<3;k++){
   let n=f32(k);let depth=.64-.46*n;
   let d=(depth-s.eye.z)/min(-.001,rd.z);
   if(d<=0.){continue;}
   let w=s.eye.xyz+rd*d;
   let altitude=w.y+1.80;
   if(altitude<-.13 || altitude>2.65 || abs(w.x)>3.0){continue;}
   let q=w.xy*vec2f(2.2,3.1)+vec2f(n*7.7+age*.12,-age*.53+3.2*n);
   let b=fbm(q*.78);let fluff=fbm(q*2.8+vec2f(2.8*b,3.8*b));
   let curled=w.x-.20*sin(3.2*altitude+.46*age);
   let shaft=bell(curled/(.29+.17*max(.0,altitude)))*bell((altitude-.85)/1.0)*boil;
   let bank=bell((altitude-.07-.10*sin(3.5*w.x+.4*age))/.15)*bell(w.x/1.64);
   let envelope=shaft*.77+bank*(.31+.13*boil);
   let density=smoothstep(.38,.68,.57*b+.43*fluff)*envelope*smoothstep(-.13,.01,altitude);
   let warm=smoothstep(1.5,5.,age);
   let lit=mix(vec3f(.194,.196,.203),vec3f(.34,.209,.120),warm)*(1.+.44*fluff);
   color=vec4f(lit*density,density)+color*(1.-density);
 }
 return color;
}`;
