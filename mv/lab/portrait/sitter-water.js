import {FS_VS, NOISE} from "../lib.js";
import {COMMON} from "../river/sim.js";
import {sitterPose} from "./sitter-pose.js";

const world=FS_VS+NOISE+COMMON+`
@group(0) @binding(0) var<uniform> G:GU;
const level=-1.78;
const witness=vec3f(-1.47,-1.647,1.76);
fn toLocal(v:vec3f)->vec3f{return vec3f(-v.x,v.y,-v.z);}
fn cameraPosition()->vec3f{
 return vec3f((G.fig.x-G.cam.x)/G.fig.z,G.cam.y/G.fig.z+level,(G.fig.y-G.cam.z)/G.fig.z);
}
fn cameraRay(fc:vec2f)->vec3f{
 let uv=fc/G.m2.xy*2.-1.;
 return normalize(toLocal(G.fwd.xyz+G.right.xyz*uv.x*G.right.w*G.up.w-G.up.xyz*uv.y*G.right.w));
}
fn shore(z:f32)->f32{
 // The wet edge first juts out beside the listener and then turns back upstream.
 return -1.40-.17*(z-1.74)*(z-1.74)+.073*sin(3.2*z+.47)+.031*sin(z*8.4);
}
fn current(z:f32)->f32{return -.15-.58*sin(z*2.55-.22)-.27*z;}
fn bell(x:f32)->f32{return exp(-min(32.,x*x));}
`;

export const NIGHT=world+`
fn mountain(x:f32,k:f32)->f32{
 let s=x*(.57+.22*k)+3.7*k;
 let folded=fbm(vec2f(s*.86,7.3*k));
 let valley=1.-.62*bell((s+2.8-.44*k)/2.5);
 return level+.06+valley*(1.44+.67*k)*(.09+.88*folded+.21*sin(.79*s+.32*k)+.19*sin(s*1.58-1.2*k));
}
fn seg(p:vec2f,a:vec2f,b:vec2f)->f32{
 let d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));
}
fn person(p:vec2f)->f32{
 // The coat falls from the shoulder. The head leans forward, clear of the collar.
 let head=length((p-vec2f(.033,.856))/vec2f(.094,.126))-1.;
 let bun=length((p-vec2f(-.017,.970))/vec2f(.052,.043))-1.;
 let neck=seg(p,vec2f(.012,.705),vec2f(.030,.803))-.051;
 let hem=clamp((p.y-.16)/.53,0.,1.);
 let robe=max(max(abs(p.x-(-.046+.029*hem))-(.16-.057*hem),.115-p.y),p.y-.70);
 let sleeve=seg(p,vec2f(-.005,.671),vec2f(.108,.437))-.059;
 let leg1=seg(p,vec2f(-.100,.19),vec2f(-.129,.020))-.038;
 let leg2=seg(p,vec2f(.026,.19),vec2f(.062,.027))-.041;
 return min(min(min(min(head*.094,bun*.045),neck),min(leg1,leg2)),min(robe,sleeve));
}
// Finite pieces of the bank. The pale facets of each rock end below the waterline.
const ledges=array<vec4f,14>(
  vec4f(-2.77,-1.847,1.97,.18),vec4f(-2.47,-1.836,2.13,-.34),
  vec4f(-2.12,-1.799,1.78,.42),vec4f(-1.72,-1.781,1.79,-.24),
  vec4f(-2.08,-1.818,2.16,.31),vec4f(-1.72,-1.818,2.00,-.48),
  vec4f(-1.46,-1.795,1.94,.61),vec4f(-1.69,-1.805,1.53,.78),
  vec4f(-1.40,-1.804,1.64,-.62),vec4f(-1.53,-1.808,2.05,.53),
  vec4f(-1.32,-1.802,1.87,-.64),vec4f(-1.85,-1.806,2.24,.36),
  vec4f(-2.43,-1.821,1.48,-.52),vec4f(-1.31,-1.796,1.57,.70));
const radii=array<vec3f,14>(
  vec3f(1.16,.192,.46),vec3f(.82,.166,.29),vec3f(.61,.167,.31),vec3f(.43,.160,.235),
  vec3f(.48,.137,.23),vec3f(.25,.117,.136),vec3f(.148,.072,.110),vec3f(.19,.095,.115),
  vec3f(.128,.086,.096),vec3f(.137,.070,.087),vec3f(.095,.058,.072),vec3f(.17,.087,.11),
  vec3f(.32,.118,.14),vec3f(.076,.046,.051));
fn unroll(v:vec3f,c:f32,s:f32)->vec3f{return vec3f(v.x*c+v.z*s,v.y,v.z*c-v.x*s);}
fn slab(ro:vec3f,ray:vec3f,index:i32)->vec4f{
 let stone=ledges[index];let axes=radii[index];
 let cs=cos(stone.w);let sn=sin(stone.w);
 let origin=unroll(ro-stone.xyz,cs,sn)/axes; let dir=unroll(ray,cs,sn)/axes;
 let dd=dot(dir,dir);let od=dot(origin,dir);
 let delta=od*od-dd*(dot(origin,origin)-1.);
 if(delta<=0.){return vec4f(0.);}
 var end=(-od+sqrt(delta))/dd;
 var hit=(-od-sqrt(delta))/dd;var n=origin+dir*hit;
 // Joint planes leave a tilted bed, a broken end and a narrower seam on the face.
 for(var j=0;j<4;j++){
   let plane=array<vec3f,4>(vec3f(.10,1.,-.18),vec3f(.90,.38,.29),vec3f(-.52,.23,-.94),vec3f(.19,.51,1.))[j];
   let cap=array<f32,4>(.90,.84,.85,.74)[j]+.065*sin(f32(index)*2.13+f32(j));let den=dot(dir,plane);
   let offset=cap-dot(origin,plane);
   if(abs(den)<.0001){if(offset<0.){return vec4f(0.);}}
   else {
     let t=offset/den;
     if(den<0.&&t>hit){hit=t;n=plane;}
     if(den>0.){end=min(end,t);}
   }
 }
 if(hit<0.||hit>end){return vec4f(0.);}
 return vec4f(normalize(unroll(n/axes,cs,-sn)),hit);
}
fn facesBank(ro:vec3f,ray:vec3f)->bool{
 let safe=select(vec3f(-1.),vec3f(1.),ray>=vec3f(0.))*max(abs(ray),vec3f(.00001));
 let a=(vec3f(-4.0,-1.88,1.16)-ro)/safe;let b=(vec3f(-1.12,-1.54,2.68)-ro)/safe;
 let lo=min(a,b);let hi=max(a,b);
 return max(0.,max(lo.x,max(lo.y,lo.z)))<min(hi.x,min(hi.y,hi.z));
}
fn grasses(ro:vec3f,ray:vec3f,base:vec3f,width:f32,height:f32,seed:f32,blur:f32)->vec4f{
 let look=normalize((ro-base)*vec3f(1.,0.,1.));let lateral=vec3f(look.z,0.,-look.x);
 let den=dot(ray,look);
 if(den>-.04){return vec4f(0.);}
 let distance=dot(base-ro,look)/den;
 let rel=ro+distance*ray-base;let p=vec2f(dot(rel,lateral)/width,rel.y/height);
 if(distance<=0.||p.y<-.05||p.y>1.05||abs(p.x)>1.06){return vec4f(0.);}
 var coverage=0.;var rim=0.;
 for(var blade=0;blade<8;blade++){
   let v=f32(blade);let h=.35+.61*hash11(seed+v*9.3);
   let k=clamp(p.y/h,0.,1.);let lean=(hash11(seed+v*2.7+9.)-.49)*1.57;
   let start=(hash11(seed+v*1.5+31.)-.5)*.58;
   let centre=start+lean*(.35*k+.65*k*k)+.051*sin(k*3.1+seed)*k;
   let radius=.011+.036*(1.-k);let aa=clamp(blur/width,.024,.33);
   let mask=(1.-smoothstep(radius-aa,radius+aa,abs(p.x-centre)))*(1.-smoothstep(h-.035,h+.035,p.y));
   coverage=max(coverage,mask);rim=max(rim,mask*hash11(v+seed+4.)*(.24+.76*k));
 }
 return vec4f(vec3f(.008,.014,.014)+vec3f(.069,.067,.040)*rim,coverage);
}
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
 let ro=cameraPosition(); let ray=cameraRay(fc.xy); let t=G.cam.w;
 let bankFocus=length(ro-witness-vec3f(0.,.22,0.));
 let faceFocus=length(ro-vec3f(.29,.02,.48));
 let focus=mix(bankFocus,faceFocus,smoothstep(45.88,48.78,t));
 let pupil=.016+.038*smoothstep(49.30,52.48,t);
 let az=atan2(ray.x,-ray.z);
 let cloud=fbm(vec2f(az*3.4+.004*t,ray.y*8.8+3.3));
 let halo=bell((az+.36)/.70)*bell((ray.y-.012)/.21);
 let horizon=bell((ray.y-.008)/.123);
 var col=mix(vec3f(.009,.016,.025),vec3f(.046,.083,.105),(.33+.67*cloud)*horizon);
 col+=vec3f(.086,.060,.037)*halo*(.22+.78*cloud);
 col+=vec3f(.012,.018,.026)*cloud;
 // A different slice of folded terrain for each distance. Their overlaps shift as the boat moves.
 if(ray.z<-.16){
   for(var layer=0;layer<3;layer++){
     let k=f32(2-layer);let dst=(-3.95-6.2*k-ro.z)/ray.z;
     let p=ro+ray*dst;let h=mountain(p.x,k);
     let coc=pupil*abs(1.-dst/max(.05,focus));
     let ridge=smoothstep(-.035-.042*k-coc,.035+.042*k+coc,h-p.y);
     let down=max(0.,h-p.y);
     let facet=vnoise(vec2f(p.x*2.8+down*2.4,k*8.9+.57*down))*.72
           +vnoise(vec2f(p.x*6.5-down*4.5,.64*down))*.28;
     let light=bell((p.x+2.+k)/4.5);
     let stone=mix(vec3f(.006,.012,.017),vec3f(.043,.065,.078),k*.30+.27*facet);
     let rim=light*bell(down/(.10+.06*k))*(.18+.82*facet);
     col=mix(col,stone+vec3f(.020,.023,.023)*rim+vec3f(.014,.016,.018)*k*.27,ridge);
   }
 }
 // Light from the forming body reaches the haze in front of the hills and
 // breaks into narrow reflections on the moving water below.
 let rise=smoothstep(45.48,48.65,t);
 let lightCentre=vec3f(-.10,-1.35+1.51*rise,-.035);
 let along=dot(lightCentre-ro,ray);
 let fogPoint=ro+ray*max(0.,along);
 let radius=(fogPoint-lightCentre)/vec3f(.91,1.26,.85);
 let vapour=.81+.19*vnoise(vec2f(fogPoint.x*2.1+.056*t,fogPoint.y*3.3-fogPoint.z*.61));
 let scatter=rise*exp(-1.18*dot(radius,radius))*vapour*smoothstep(.05,1.3,along);
 col+=vec3f(.132,.086,.041)*scatter;
 if(ray.y<-.0002){
   let d=(level-ro.y)/ray.y;
   if(d>0.){
     let p=(ro+ray*d).xz; let pix=(d*G.right.w*2./G.m2.y+pupil*abs(1.-d/max(.05,focus)))/max(.035,-ray.y);
     let haze=1.-exp(-d*.047);
     let crosswind=vnoise(vec2f(p.x*3.9,p.y*1.7+t*.09));
     let breakup=vnoise(vec2f(p.x*9.7+.60*sin(p.y*5.),p.y*3.7-t*.19));
     let chop=sin(p.y*39.+5.7*crosswind+1.35*breakup+1.19*sin(3.1*p.x+2.2*p.y-t*.34)+t*.66);
     let thin=smoothstep(.18,.95,chop)*smoothstep(.27,.77,breakup+.20*crosswind)*(1.-smoothstep(.035,.22,pix));
     let channel=bell((p.x-current(p.y))/(.18+.09*abs(p.y)));
     let bankside=bell((p.x-shore(p.y)-.055)/.12)*bell((p.y-1.6)/1.5);
     let mirror=bell((p.x+.28*sin(p.y*1.9))/(.31+.11*abs(p.y)))*bell((p.y-.55)/2.0);
     let cold=vec3f(.013,.025,.032)+vec3f(.015,.022,.024)*(thin*.53+.31*crosswind);
     let glint=(.08+.92*thin)*(.23+.77*crosswind);
     col=mix(cold+glint*(vec3f(.22,.25,.23)*channel+vec3f(.20,.13,.055)*mirror
       +vec3f(.19,.18,.13)*bankside),mix(vec3f(.053,.070,.079),col,smoothstep(14.,48.,d)),haze);
     let normal=normalize(vec3f(.049*sin(3.2*p.x+crosswind*4.+t*.51),
                              1.,.13*chop+.072*(breakup-.5)));
     let lamp=normalize(lightCentre-vec3f(p.x,level,p.y));
     let streak=pow(max(0.,dot(reflect(ray,normal),lamp)),17.);
     let reach=rise/(1.+.25*dot(p,p));
     col+=vec3f(.44,.275,.117)*reach*(.035+.965*streak)*(.22+.78*smoothstep(-.63,.82,chop));
     let ground=length((p-vec2f(-2.45,1.88))/vec2f(1.25,.51));
     let gravel=vnoise(p*37.)*vnoise(p*13.3);
     let silt=1.-smoothstep(.65,1.30,ground+(.5-gravel)*.17);
     let pebbles=vec3f(.018,.026,.027)+vec3f(.062,.069,.061)*gravel;
     col=mix(col,pebbles,silt*(.72-.25*thin));
     // Only this finite headland interrupts the lens. Its last stone clears the
     // lower left when the boat passes the witness on its approach to the face.
     if(facesBank(ro,ray)){
       var nearest=d;var rockN=vec3f(0.);
       for(var i=0;i<14;i++){
         let h=slab(ro,ray,i);
         if(h.w>0.&&h.w<nearest){nearest=h.w;rockN=h.xyz;}
       }
       if(nearest<d){
         let pos=ro+ray*nearest;let above=pos.y-level;
         let seam=vec2f(dot(pos,vec3f(19.,27.,13.)),dot(pos,vec3f(-11.,23.,20.)));
         let cleavage=vnoise(seam*.58);
         let grain=vec2f(vnoise(seam+vec2f(.16,0.))-vnoise(seam-vec2f(.16,0.)),
                         vnoise(seam+vec2f(0.,.16))-vnoise(seam-vec2f(0.,.16)));
         rockN=normalize(rockN+vec3f(grain.x,0.,grain.y)*.81);
         let mica=vnoise(73.*pos.xz-41.*pos.y);
         let material=mix(vec3f(.016,.020,.022),vec3f(.046,.048,.045),cleavage);
         let lamina=sin(33.*pos.x+89.*pos.y+10.*pos.z+2.6*cleavage);
         let bands=(.68+.32*mica)*smoothstep(.30,.95,lamina);
         let light=max(0.,dot(rockN,normalize(vec3f(-.29,.68,-.57))));
         let moist=1.-smoothstep(.019,.106,above);
         let bevel=pow(1.-max(0.,dot(-ray,rockN)),3.);
         let colour=material*(.45+.92*light+.30*bands)
              +vec3f(.053,.064,.061)*moist*(.13+.74*bevel)*(.39+.61*cleavage);
         let blur=pupil*abs(1.-nearest/max(.05,focus));
         let edge=smoothstep(-.009-blur,.018+blur,above);
         col=mix(col,colour,edge);
       }
       let defocus=d*G.right.w/G.m2.y+.004;
       let rush1=grasses(ro,ray,vec3f(-1.78,-1.669,1.69),.077,.100,9.,defocus);
       let rush2=grasses(ro,ray,vec3f(-2.12,-1.692,1.99),.097,.086,20.,defocus);
       let rush3=grasses(ro,ray,vec3f(-1.55,-1.733,1.98),.049,.046,37.,defocus);
       col=mix(col,rush1.rgb,rush1.a);col=mix(col,rush2.rgb,rush2.a);col=mix(col,rush3.rgb,rush3.a);
     }
   }
 }
 let forward=normalize(toLocal(G.fwd.xyz)*vec3f(1.,0.,1.));
 let right=normalize(cross(forward,vec3f(0.,1.,0.)));
 let dist=dot(witness-ro,forward)/max(.0001,dot(ray,forward));
 if(dist>0.){
   let d=ro+dist*ray-witness;let p=vec2f(dot(d,right),d.y)/.278;
   let sd=person(p);let aa=max(.008,(dist*1.10/G.m2.y+pupil*abs(1.-dist/max(.05,focus)))/.278);
   let cover=1.-smoothstep(-aa,aa,sd);
   let light=smoothstep(-.10,.10,p.x+.11*p.y)*exp(-abs(sd)/.026);
   let wool=vec3f(.003,.004,.006)+vec3f(.036,.039,.033)*light;
   col=mix(col,wool,cover);
 }
 return vec4f(col,1.);
}`;

// Only the lower foam is composited in front of the chest; the eyebrow, sky and
// cheek cannot be touched by this pass even when the camera climbs.
export const WATER_VEIL=world+`
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
 let ro=cameraPosition();let ray=cameraRay(fc.xy);let t=G.cam.w;
 if(ray.y>-.015){discard;}
 let d=(level+.040-ro.y)/ray.y;
 if(d<.001){discard;}
 let p=(ro+d*ray).xz;
 let ell=length((p-vec2f(-.07,.13))/vec2f(1.30,.54));
 let crest=bell((ell-1.)/.21)*smoothstep(-.13,.38,p.y);
 let noise=vnoise(vec2f(p.x*14.+t*.09,p.y*7.2));
 let ripple=pow(.5+.5*sin(29.*ell+4.*noise-t*1.26),3.);
 let fog=.19*bell((p.y-.37+.09*sin(4.*p.x))/.22)*bell((p.x+.14)/1.12);
 let strength=smoothstep(45.18,47.4,t);
 return vec4f(mix(vec3f(.042,.058,.066),vec3f(.26,.24,.18),noise*ripple),
    strength*(fog+crest*ripple*(.21+.55*noise)));
}`;

// One group of letters follows each bend of the surface current into the chest.
// Motion, the orientation of the graph and the wake all use the same world units.
export const FLOW=COMMON+sitterPose+`
struct Stream{vp:mat4x4f,right:vec4f,up:vec4f,ids:vec4f}
@group(0) @binding(0) var<uniform> S:Stream;
@group(0) @binding(1) var atlas:texture_2d<f32>;
@group(0) @binding(2) var lin:sampler;
@group(0) @binding(3) var chest:texture_2d<f32>;
struct Letter{@builtin(position) pos:vec4f,@location(0) uv:vec2f,@location(1) @interpolate(flat) cell:vec2f,@location(2) tint:vec4f}
@vertex fn vs(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Letter{
 let quad=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.))[v];
 let lane=rf(i*23u+5u);let b=rf(i*17u+3u);let c=rf(i*11u+7u);let d=rf(i*29u+11u);
 let time=S.right.w;
 let guide=i%43u==0u;
 let phase=select(fract(.001+rf(i+77u)+(time-44.58)*(.052+.024*b)),fract(f32(i/43u)/40.+(time-44.58)*.067),guide);
 let z=3.92-3.63*phase;
 let x=-.15-.58*sin(z*2.55-.22)-.27*z;
 let fly=smoothstep(.51,.96,phase)*smoothstep(45.,48.1,time);
 let coast=-1.40-.17*(z-1.74)*(z-1.74)+.073*sin(z*3.2+.47)+.031*sin(z*8.4);
 let surface=vec3f(x+(lane-.5)*(.21+.60*pow(c,2.))+.04*sin(3.9*z+b*9.),
                    -1.770+.006*sin(z*32.+b*6.+time*.66),z+.05*(d-.5));
 let side=select(-1.,1.,lane>.52);
 let across=clamp(.72-.32*fly+.43*(b-.5),.11,.96);
 let high=clamp(.05+.81*fly+.13*(d-.5),0.,1.);
 let vertex=textureLoad(chest,vec2i(round(vec2f(across,high)*127.)),0).xyz;
 let dest=figurePose(vec3f(side*vertex.x,vertex.y,vertex.z+.012),vertex.y,time,1.);
 let s=smoothstep(0.,.70,fly);
 let pos=mix(surface,dest,s);
 let waterAcross=vec3f(1.,0.,0.);let waterAlong=normalize(vec3f(-.40*cos(z*2.55-.22),select(.26+.20*d,.76,guide),-1.));
 let ax=normalize(mix(waterAcross,S.right.xyz,s));let ay=normalize(mix(waterAlong,S.up.xyz,s));
 let size=select(.021+.058*pow(d,2.8),.074+.027*b,guide)*mix(1.,.69,s);
 let ang=(c-.5)*.94+.40*cos(z*2.55-.22);
 let uv=quad-.5;let ca=cos(ang);let sa=sin(ang);
 let g=pos+size*(ax*(uv.x*ca-uv.y*sa)+ay*(uv.x*sa+uv.y*ca));
 let gid=select(S.ids.x+floor(rf(i+19u)*S.ids.y),S.ids.z+floor(rf(i+13u)*S.ids.w),b>.74);
 var out:Letter;out.pos=S.vp*vec4f(g,1.);out.uv=vec2f(quad.x,1.-quad.y);
 out.cell=vec2f(gid%32.,floor(gid/32.));
 let edge=smoothstep(.012,.08,phase)*(1.-smoothstep(.80,.98,phase));
 let migration=smoothstep(-.01,.11,surface.x-coast);
 let tint=mix(vec3f(.38,.48,.50),vec3f(.69,.49,.28),s);
 // As the focus leaves the water, the closest loose letters fall into soft shadow.
 let focus=1.-.78*smoothstep(49.90,52.6,time)*(1.-s);
 out.tint=vec4f(tint*(.38+.62*lane),edge*focus*migration*select(.11+.32*c*c,.82,guide));
 return out;
}
@fragment fn fs(i:Letter)->@location(0) vec4f{
 let alpha=textureSample(atlas,lin,(i.cell+i.uv)/32.).r*i.tint.a;
 return vec4f(i.tint.rgb,alpha);
}`;

// The window sits beyond this particular handwritten counter. The pupil of the
// camera approaches it; the room does not stretch to follow its calligraphic frame.
export const PORTAL=FS_VS+`
struct F{screen:vec4f,glyphX:vec4f,glyphY:vec4f,denom:vec4f}
@group(0) @binding(0) var<uniform> S:F;
@group(0) @binding(1) var lin:sampler;
@group(0) @binding(2) var scene:texture_2d<f32>;
@group(0) @binding(3) var room:texture_2d<f32>;
@group(0) @binding(4) var atlas:texture_2d<f32>;
// Row intersections of the enclosed counter, measured from glyph 207 in the real atlas.
const counter=array<u32,64>(
  0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u,
  0u, 0u, 0u, 0u, 0u, 0u, 20579u, 11107u,
  7778u, 7778u, 7778u, 7778u, 7778u, 7778u, 7778u, 8033u,
  8033u, 8033u, 8033u, 8033u, 8033u, 8033u, 8032u, 8288u,
  8288u, 8288u, 8288u, 8288u, 8288u, 8287u, 8287u, 8543u,
  8543u, 8543u, 8543u, 8543u, 8511u, 0u, 0u, 0u,
  0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u,
  0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u
);
fn widthAt(row:i32)->vec2f{
 let extent=counter[u32(clamp(row,0,63))];
 return vec2f(f32(extent>>8u),f32(extent&255u))/128.;
}
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
 let uv=fc.xy/S.screen.xy;let t=S.screen.z;
 let base=textureSampleLevel(scene,lin,uv,0.).rgb;
 if(t<52.15){return vec4f(base,1.);}
 let ndc=vec3f(uv.x*2.-1.,1.-2.*uv.y,1.);
 let w=dot(ndc,S.denom.xyz);
 if(w>=-.0002){return vec4f(base,1.);}
 let p=vec2f(dot(ndc,S.glyphX.xyz),dot(ndc,S.glyphY.xyz))/w;
 if(any(p<vec2f(0.))||any(p>vec2f(1.))){return vec4f(base,1.);}
 let gid=S.screen.w;let cell=vec2f(gid%32.,floor(gid/32.));
 let ink=textureSampleLevel(atlas,lin,(cell+p)/32.,0.).r;
 let trace=smoothstep(52.19,53.24,t);
 let gold=base*vec3f(.69,.63,.52)+vec3f(.144,.115,.072);
 var col=mix(base,gold,trace*ink*.77);
 let row=p.y*64.;let j=i32(floor(row));
 let span=mix(widthAt(clamp(j,14,44)),widthAt(clamp(j+1,14,44)),fract(row));
 let border=min(p.x-span.x,span.y-p.x);
 let ends=smoothstep(27.5,28.9,p.y*128.)*(1.-smoothstep(87.6,89.,p.y*128.));
 let inside=smoothstep(-.003,.007,border)*ends*(1.-ink);
 let enter=smoothstep(53.63,54.83,t);
 let through=smoothstep(54.73,55.60,t);
 let roomUV=mix(vec2f(.48,.47)+(p-vec2f(.50,.485))*vec2f(1.16,1.35),uv,through);
 let other=textureSampleLevel(room,lin,clamp(roomUV,vec2f(0.),vec2f(1.)),0.).rgb;
 let deep=other*mix(vec3f(.49,.42,.33),vec3f(1.),smoothstep(54.68,55.46,t));
 let lip=1.-smoothstep(.002,.026,max(0.,border));
 let penumbra=1.-.45*lip*(1.-through);
 col=mix(col,deep*penumbra,enter*inside);
 return vec4f(col,1.);
}`;
