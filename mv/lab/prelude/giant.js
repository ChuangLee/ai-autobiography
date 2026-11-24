import {BUST,GAZE} from "../river/figure.js";
import {FS_VS,NOISE} from "../lib.js";
export const GIANT=FS_VS+NOISE+BUST+GAZE+`
@group(0)@binding(0) var<uniform> par:vec4f;
@group(0)@binding(1) var samp:sampler; @group(0)@binding(2) var atlas:texture_2d<f32>;
fn writing(p:vec2f,g:f32)->f32{let cell=vec2f(g%32.,floor(g/32.));return textureSampleLevel(atlas,samp,(cell+.05+.90*fract(p))/32.,.7).r;}
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0)vec4f{
  let uv=fc.xy/par.yz;let t=par.x;let z=smoothstep(2.,6.8,t);
  let cam=mix(vec3f(-2.75,1.02,-5.7),vec3f(-.88,2.58,-2.30),z);
  let f=normalize(vec3f(0.,1.80+1.01*z,0.)-cam);let rt=normalize(cross(f,vec3f(0,1,0)));let up=cross(rt,f);
  let q=(uv-.5)*vec2f(1.77778,-1.);let rd=normalize(f+rt*q.x*.87+up*q.y*.87);
  let haze=exp(-abs(rd.y)*7.);var col=vec3f(.003,.006,.016)+vec3f(.025,.031,.038)*haze;
  let low=(vec3f(-1.22,-.01,-.70)-cam)/rd;let high=(vec3f(1.22,3.60,.72)-cam)/rd;
  let lo=min(low,high);let hi=max(low,high);var d=max(0.,max(max(lo.x,lo.y),lo.z));let end=min(min(hi.x,hi.y),hi.z);
  var hit=false;
  for(var i=0;i<79;i++){if(d>end){break;}let sd=bust(cam+rd*d);if(sd<.0017+.00018*d){hit=true;break;}d+=max(.002,sd*.88);}
  let gold=vec3f(1.,.76,.43);let light=normalize(vec3f(-.58,.82,-.46));
  if(hit){let p=cam+rd*d;let n=bustN(p);let plane=vec2f(atan2(p.x,-p.z)*.65,-p.y)*8.8;
    let id=floor(hash21(floor(plane))*180.)+par.w;let ink=writing(plane,id);
    let diffuse=max(0.,dot(n,light));let fres=pow(1.-max(dot(n,-rd),0.),3.);
    let relief=smoothstep(.1,.8,ink);let cloth=fbm(p.xy*40.);
    col=vec3f(.065,.049,.029)*(.6+.4*cloth)+gold*(.08+.62*diffuse)+vec3f(1.,.92,.70)*pow(max(dot(n,normalize(light-rd)),0.),40.)*.53;
    col=eyeColor(p,col); col*=.83+.2*cloth; col+=gold*relief*(.17+.55*fres+.24*diffuse)+vec3f(.55,.52,.39)*fres;
  }else if(rd.y<-.001){let p=cam-rd*(cam.y/rd.y);let surf=p.xz;
    let rip=fbm(surf*vec2f(7.,32.)+vec2f(0.,-t*.65));
    let wake=exp(-abs(surf.x-.12*cos(surf.y))*(1.8+.22*abs(surf.y)))*exp(-abs(surf.y)*.12);
    let coords=vec2f(p.x*8.+p.z*.52,p.z*13.-t*.42);let id=par.w+floor(hash21(floor(coords))*120.);
    col+=vec3f(.013,.021,.025)*(1.+rip*2.)+gold*wake*(.025+.36*smoothstep(.55,.78,rip)+writing(coords,id)*.21)*smoothstep(22.,3.,length(surf));}
  // Three curved curtains of loose writing are caught by the rising shoulders.
  // Intersect them in world space so foreground ink can pass in front of the body.
  for(var layer=0;layer<3;layer++){
    let planeZ=1.05-f32(layer)*.72;let depth=(planeZ-cam.z)/rd.z;
    if(depth<0. || (hit && depth>d)){continue;}
    let w=cam+rd*depth;
    if(w.y<.025||w.y>2.15){continue;}
    let f=f32(layer);let band=.90+.45*f+.24*sin(w.y*2.8+f);
    let dx=abs(w.x)-band+.086*sin(w.y*7.+f);
    let thin=exp(-dx*dx*43.)*exp(-w.y*.51)*smoothstep(2.15,1.12,w.y);
    let field=vec2f((w.x+.13*sin(w.y*2.9+f))*8.,(-w.y+t*.16)*8.5);
    let rnd=hash21(floor(field)+f*28.5);
    let mark=writing(field,par.w+floor(145.*rnd));
    col+=gold*mark*thin*smoothstep(.36,.80,rnd)*(.21+.31*rnd);
  }
  return vec4f(col,1.);
}`;
