// Compute shaders: the grid fluid of the river, and the characters that ride it and, at the end, climb out of the sea.
export const COMMON = `
struct GU { cam:vec4f, right:vec4f, up:vec4f, fwd:vec4f, pr:vec4f, fig:vec4f, m1:vec4f, m2:vec4f, heads:array<vec4f,5>, m3:vec4f }
struct Pt { pos:vec3f, age:f32, vel:vec3f, kind:f32, ex:vec4f }      // kind 0 river, 1 figure, 2 asleep under the sea; ex = alpha, shade, gold, spare
fn ih(x:u32)->u32{ let v=x*747796405u+2891336453u; let w=((v>>((v>>28u)+4u))^v)*277803737u; return (w>>22u)^w; }
fn rf(x:u32)->f32{ return f32(ih(x)&0xffffffu)/16777216.; }
fn tribOf(i:u32)->u32{ let m=(i*37u)%100u; if(m<13u){return 0u;} if(m<26u){return 1u;} if(m<56u){return 2u;} if(m<84u){return 3u;} return 4u; }
`;
const FH = `struct FU{ dt:f32, cs:f32, decay:f32, wall:f32, gx:f32, gz:f32, q:f32, wmax:f32 }
@group(0)@binding(0) var<uniform> F:FU;
fn inb(c:vec2i)->vec2i{ return clamp(c,vec2i(0),vec2i(i32(F.gx)-1,i32(F.gz)-1)); }
`;
// Vorticity and stream function. The velocity is the curl of ψ, so it has no divergence whatever the solver's accuracy: the characters never bunch up
// for numerical reasons. ψ is fixed on banks, bars and stones (no flow through them); no-slip walls feed vorticity into the water (Thom's formula), which is
// carried downstream: wakes behind the stones, shear where the tributaries meet.
export const STATUE = `
const SKEY=vec3f(-.553,.624,-.552);
// one current of characters: columns that each run at their own speed, bent by a slow swirl, every character its own size, tilt and place in its cell
fn skinLayer(uv0:vec2f, sc:f32, t:f32, dens:f32, seed:f32)->f32{ let uv=uv0+.09*vec2f(vnoise(uv0*2.3+seed)-.5, vnoise(uv0*2.3+seed+7.)-.5)+vec2f(.05*sin(uv0.y*3.1+seed),0.);
  let col=floor(uv.x*sc); let sp=.55+1.1*hash11(col*3.7+seed); let g=vec2f(uv.x*sc, uv.y*sc+t*sp*sc*.06+hash11(col+seed)*7.); let c=floor(g); let h=hash22(c+seed);
  if(h.x>dens){ return 0.; } let a=(h.y-.5)*.9; let s=.62+.5*h.y; let q=(fract(g)-.5-(h-.5)*.22)/s; let r=vec2f(q.x*cos(a)-q.y*sin(a), q.x*sin(a)+q.y*cos(a))+.5;
  return glyphCell(floor(hash21(c+seed+17.3)*961.), r); }
fn skin(q:vec3f, n:vec3f, t:f32, dens:f32, sc:f32, seed:f32)->f32{ let w=n*n;
  return w.z*skinLayer(q.xy,sc,t,dens,seed)+w.x*skinLayer(q.zy+3.7,sc,t,dens,seed+5.)+w.y*skinLayer(q.xz*vec2f(1.,-1.)+9.1,sc,t,dens,seed+11.); }
fn statueLit(q:vec3f, n:vec3f)->f32{ let ao=clamp(.5+bust(q+n*.05)*10.,0.,1.)*clamp(.55+bust(q+n*.16)*2.8,0.,1.);
  var sh=1.; var tt=.03; for(var i=0;i<12;i++){ let d=bust(q+SKEY*tt); sh=min(sh,clamp(9.*d/tt,0.,1.)); tt+=clamp(d,.02,.14); if(sh<.02){ break; } }
  return (max(dot(n,SKEY),0.)*sh*(.35+.65*ao)+.13*ao*max(dot(n,normalize(vec3f(.2,-.6,-.75))),0.)+.05*ao); }
fn statueCol(q:vec3f, n:vec3f, rd:vec3f, t:f32)->vec3f{ let lit=.12*max(dot(n,-rd),0.)+.87*statueLit(q,n); let dens=mix(.07,.92,smoothstep(.04,.62,lit)); let ndv=max(dot(n,-rd),0.);
  // Under the larger, slow-moving characters the cheek still turns through a half tone.
  let script=skin(q,n,t,dens*.85,10.,1.)+.32*skin(q,n,t*.85,dens*.65,22.,40.);
  let grazing=pow(1.-ndv,3.);
  let highlight=pow(max(dot(n,normalize(SKEY-rd)),0.),24.);
  let flesh=mix(vec3f(.044,.036,.031),vec3f(.82,.66,.42),lit);
  let under=flesh*(.42+.35*lit)+vec3f(.90,.79,.57)*(.13*highlight+.05*grazing);
  if(anatomyStudy){
    let head=smoothstep(2.13,2.42,q.y)*smoothstep(.09,-.10,q.z);
    let edge=smoothstep(.23,.42,abs(q.x));
    let retained=1.-head*(1.-.16*edge);
    let key=clamp(.60*lit+.40*max(dot(n,normalize(vec3f(-.7,.39,-.58))),0.),0.,1.);
    let ivory=mix(vec3f(.009,.011,.015),vec3f(.40,.29,.16),pow(key,1.42));
    let mottling=vnoise3(q*24.)-.5;
    let pores=vnoise3(q*137.+.28*vnoise3(q*43.))-.5;
    let tissue=ivory*(1.+head*(.105*mottling+.075*pores))
             +head*vec3f(.010,.002,-.002)*mottling;
    let surface=tissue+.025*vec3f(.9,.84,.76)*grazing+vec3f(.57,.47,.32)*script*retained;
    return wakingEye(q,surface,smoothstep(48.95,50.79,t-.06*sign(q.x)));
  }
  return eyeColor(q,under+vec3f(.024,.023,.027)*(1.-lit)+vec3f(1.,.84,.59)*script*(.065+.7*lit)); }
`;
export const FLUID = {
  init: FH + `@group(0)@binding(1) var psi0:texture_2d<f32>; @group(0)@binding(2) var pa:texture_storage_2d<r32float,write>; @group(0)@binding(3) var pb:texture_storage_2d<r32float,write>;
@group(0)@binding(4) var om:texture_storage_2d<rgba16float,write>; @group(0)@binding(5) var vel:texture_storage_2d<rgba16float,write>; @group(0)@binding(6) var field:texture_2d<f32>;
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){ if(f32(id.x)>=F.gx||f32(id.y)>=F.gz){return;} let c=vec2i(id.xy);
  let p=textureLoad(psi0,c,0).x*F.q; textureStore(pa,c,vec4f(p)); textureStore(pb,c,vec4f(p)); textureStore(om,c,vec4f(0.));
  var v=vec2f(-(textureLoad(psi0,inb(c+vec2i(0,1)),0).x-textureLoad(psi0,inb(c-vec2i(0,1)),0).x), textureLoad(psi0,inb(c+vec2i(1,0)),0).x-textureLoad(psi0,inb(c-vec2i(1,0)),0).x)*F.q/(2.*F.cs);
  if(textureLoad(field,c,0).b<=.5){ v=vec2f(0.); } textureStore(vel,c,vec4f(v,0.,0.)); }`,
  advect: FH + `@group(0)@binding(1) var samp:sampler; @group(0)@binding(2) var omIn:texture_2d<f32>; @group(0)@binding(3) var vel:texture_2d<f32>; @group(0)@binding(4) var field:texture_2d<f32>; @group(0)@binding(5) var omOut:texture_storage_2d<rgba16float,write>;
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){ if(f32(id.x)>=F.gx||f32(id.y)>=F.gz){return;} let c=vec2i(id.xy); let sz=vec2f(F.gx,F.gz); let uv=(vec2f(id.xy)+.5)/sz;
  if(textureLoad(field,c,0).b<=.5){ textureStore(omOut,c,vec4f(0.)); return; }
  let v=textureLoad(vel,c,0).xy; let vm=textureSampleLevel(vel,samp,uv-.5*F.dt*v/(F.cs*sz),0.).xy;
  let w=textureSampleLevel(omIn,samp,uv-F.dt*vm/(F.cs*sz),0.).x*exp(-F.dt*F.decay);
  textureStore(omOut,c,vec4f(clamp(w,-F.wmax,F.wmax),0.,0.,0.)); }`,
  jacobi: FH + `@group(0)@binding(1) var pin:texture_2d<f32>; @group(0)@binding(2) var om:texture_2d<f32>; @group(0)@binding(3) var psi0:texture_2d<f32>; @group(0)@binding(4) var field:texture_2d<f32>; @group(0)@binding(5) var o:texture_storage_2d<r32float,write>;
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){ if(f32(id.x)>=F.gx||f32(id.y)>=F.gz){return;} let c=vec2i(id.xy);
  if(textureLoad(field,c,0).b<=.5||c.x==0||c.y==0||c.x==i32(F.gx)-1||c.y==i32(F.gz)-1){ textureStore(o,c,vec4f(textureLoad(psi0,c,0).x*F.q)); return; }
  let s=textureLoad(pin,c+vec2i(1,0),0).x+textureLoad(pin,c-vec2i(1,0),0).x+textureLoad(pin,c+vec2i(0,1),0).x+textureLoad(pin,c-vec2i(0,1),0).x;
  textureStore(o,c,vec4f((s-textureLoad(om,c,0).x*F.cs*F.cs)*.25)); }`,
  finish: FH + `@group(0)@binding(1) var psi:texture_2d<f32>; @group(0)@binding(2) var omB:texture_2d<f32>; @group(0)@binding(3) var field:texture_2d<f32>; @group(0)@binding(4) var vel:texture_storage_2d<rgba16float,write>; @group(0)@binding(5) var omA:texture_storage_2d<rgba16float,write>;
fn solid(c:vec2i)->bool{ return textureLoad(field,inb(c),0).b<=.5; }
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){ if(f32(id.x)>=F.gx||f32(id.y)>=F.gz){return;} let c=vec2i(id.xy); let pc=textureLoad(psi,c,0).x;
  let pr=textureLoad(psi,inb(c+vec2i(1,0)),0).x; let pl=textureLoad(psi,inb(c-vec2i(1,0)),0).x; let pt=textureLoad(psi,inb(c+vec2i(0,1)),0).x; let pb=textureLoad(psi,inb(c-vec2i(0,1)),0).x;
  if(!solid(c)){ let w=textureLoad(omB,c,0).x; textureStore(vel,c,vec4f(-(pt-pb)/(2.*F.cs),(pr-pl)/(2.*F.cs),w,0.)); textureStore(omA,c,vec4f(w,0.,0.,0.)); return; }
  var s=0.; var n=0.; if(!solid(c+vec2i(1,0))){ s+=pr-pc; n+=1.; } if(!solid(c-vec2i(1,0))){ s+=pl-pc; n+=1.; } if(!solid(c+vec2i(0,1))){ s+=pt-pc; n+=1.; } if(!solid(c-vec2i(0,1))){ s+=pb-pc; n+=1.; }
  var w=0.; if(n>0.){ w=clamp(F.wall*2.*s/n/(F.cs*F.cs),-F.wmax,F.wmax); }
  textureStore(vel,c,vec4f(0.)); textureStore(omA,c,vec4f(w,0.,0.,0.)); }`,
};
export const PARTICLE_SIM = `
@group(0)@binding(0) var<uniform> G:GU; @group(0)@binding(1) var<storage,read_write> P:array<Pt>; @group(0)@binding(2) var samp:sampler; @group(0)@binding(3) var velT:texture_2d<f32>; @group(0)@binding(4) var fieldT:texture_2d<f32>; @group(0)@binding(5) var decoT:texture_2d<f32>;
fn rnd(i:u32,k:u32)->f32{ return rf(i*9781u+k*62711u+u32(G.cam.w*60.)*7919u); }
fn fuv(xz:vec2f)->vec2f{ return (xz-vec2f(-32.,-6.))/vec2f(64.,256.); }
fn sdAt(xz:vec2f)->f32{ return (textureSampleLevel(fieldT,samp,fuv(xz),0.).b-.5)*16.; }
fn flow3(p:vec3f,t:f32)->vec3f{ let a=p*.085+vec3f(0.,-t*.11,0.); let b=p.zxy*.19+vec3f(t*.07,1.7,-t*.05);
  return vec3f(sin(a.z)+cos(a.y), sin(a.x)+cos(a.z), sin(a.y)+cos(a.x))+.5*vec3f(sin(b.z)+cos(b.y), sin(b.x)+cos(b.z), sin(b.y)+cos(b.x)); }
fn headSpawn(i:u32)->Pt{ var p:Pt; let h=G.heads[tribOf(i)]; p.pos=vec3f(h.x+(rnd(i,1u)-.5)*h.z*1.1, 0., h.y+(rnd(i,2u)-.5)*4.); p.age=0.; p.vel=vec3f(0.); p.kind=0.; p.ex=vec4f(0.,1.,0.,0.); return p; }
@group(0) @binding(6) var figureVolume:texture_3d<f32>;
fn volumeSample(p:vec3f)->vec4f{
  let uv=clamp((p-volumeLo)/volumeExtent,vec3f(0.),vec3f(1.));
  let v=textureSampleLevel(figureVolume,samp,uv,0.);
  let outside=p-(volumeLo+uv*volumeExtent);
  let d=length(outside);
  let n=normalize(v.xyz+vec3f(1e-6,0.,0.));
  if(d>1e-4){
    let projected=n*v.w+outside;
    return vec4f(normalize(projected+vec3f(1e-6,0.,0.)),length(projected));
  }
  return vec4f(n,v.w);
}
fn figSpawn(i:u32)->Pt{ var p:Pt; let S=G.fig.z; let C=vec3f(G.fig.x,0.,G.fig.y); let r=rnd(i,3u); let a=rnd(i,4u)*6.2832; p.age=0.; p.vel=vec3f(0.); p.kind=1.; p.ex=vec4f(0.,.6,0.,0.);
  if(r<.20){                                                      // condenses on the body, anywhere below the rising front
    var q=vec3f((rnd(i,5u)*2.-1.)*1.3, rnd(i,11u)*max(G.m3.w/S,.06), mix(-.66,.30,rnd(i,12u)));
    if(rnd(i,13u)<.08 && G.m3.w>S*2.5){ q=vec3f((rnd(i,5u)*2.-1.)*.5, mix(2.4,min(G.m3.w/S,3.6),rnd(i,11u)), mix(-.62,.2,rnd(i,12u))); } for(var k=0;k<5;k++){ let sample=volumeSample(q); q-=sample.xyz*sample.w; }
    q.y=max(q.y,.01); p.pos=C+q*S; p.ex.w=1.; return p; }
  if(r<.36){ let k=.90+.16*rnd(i,5u); p.pos=C+vec3f(cos(a)*.60*k,0.,sin(a)*.36*k)*S; }      // climbs out at the waterline
  else { let j=floor(rnd(i,6u)*30.); let an=3.1416+(j-14.5)*.105+(rf(u32(j)*13u+5u)-.5)*.2; let R=S*(.85+2.6*rf(u32(j)*31u+7u)); let sheet=step(.6,rf(u32(j)*5u+3u)); let g=vec2f((rnd(i,7u)+rnd(i,8u)-1.)*mix(1.6,9.,sheet), (rnd(i,9u)+rnd(i,10u)-1.)*1.6);
    p.pos=C+vec3f(sin(an)*R+g.x, 0., cos(an)*R+g.y); }                                        // or rises from the open water in a column, and leans in
  p.pos.y=-.4; return p; }
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3u){ let i=id.x; if(f32(i)>=G.pr.w){return;} var p=P[i]; let dt=G.m2.z; let t=G.cam.w; let hi=rf(i*3u+11u); let hj=rf(i*7u+5u);
  if(p.kind>1.5){ if(t>=G.m2.w+pow(hi,1.4)*7.0){ p=figSpawn(i); } P[i]=p; return; }
  if(p.kind<.5){                                                   // in the river
    let uv=fuv(p.pos.xz); let fl=textureSampleLevel(fieldT,samp,uv,0.); var sd=(fl.b-.5)*16.;
    var vf=textureSampleLevel(velT,samp,uv,0.).xy;
    let dr=fl.rg*2.-1.; vf+=dr*max(0.,1.6-length(vf))*step(p.pos.z,G.m1.y);
    vf+=.5*vec2f(sin(p.pos.z*1.3+t*1.1+hi*6.), cos(p.pos.x*1.7-t*.9+hj*6.));
    let v=mix(p.vel.xz,vf,1.-exp(-dt*7.)); var xz=p.pos.xz+v*dt;
    sd=sdAt(xz); if(sd<.6){ let e=.3; let gn=normalize(vec2f(sdAt(xz+vec2f(e,0.))-sdAt(xz-vec2f(e,0.)), sdAt(xz+vec2f(0.,e))-sdAt(xz-vec2f(0.,e)))+vec2f(1e-5,0.));
      var tg=vec2f(-gn.y,gn.x); let sg=dot(tg,dr); if(abs(sg)<.2){ tg*=sign(hi-.5); } else { tg*=sign(sg); }
      xz+=tg*(1.-smoothstep(.15,.6,sd))*2.2*dt; if(sd<.22){ xz+=gn*(.22-sd)*.7; } }
    p.age+=dt; let mouth=G.m1.y; var seaT=p.vel.y; if(xz.y>mouth){ seaT+=dt; } let s=max(smoothstep(mouth+1.,mouth+7.+hi*30.,xz.y), smoothstep(1.5,4.5+4.*hi,seaT));
    let sp=length(v); let wave=.10*sin(xz.y*.9-t*2.6+xz.x*.6)+.07*sin(xz.x*2.1+t*1.7+xz.y*.4)+.05*sp*sin(xz.y*2.7-t*4.+hj*6.);
    let ty=hj*hj*.55+wave*(1.-s)-s*.5; p.pos=vec3f(xz.x, mix(p.pos.y,ty,1.-exp(-dt*5.)), xz.y); p.vel=vec3f(v.x,seaT,v.y);
    let lane=textureSampleLevel(decoT,samp,fuv(xz),0.).g; p.ex=vec4f(smoothstep(0.,1.2,p.age)*(1.-s)*mix(1.,smoothstep(.15,.75,lane),.5+.5*hj), 1., 0., 0.);
    if(s>=.999||xz.y>248.||abs(xz.x)>31.5){ if(t>G.m3.y && rnd(i,20u)<.8){ p=figSpawn(i); } else { p=headSpawn(i); } }
    P[i]=p; return; }
  // the figure: out of the still surface, upward
  let S=G.fig.z; let C=vec3f(G.fig.x,0.,G.fig.y); let q=(p.pos-C)/S; let sample=volumeSample(q); let d=sample.w*S; let n=sample.xyz; let U=G.m3.x*(.75+.5*hi)*mix(1.,.42,p.ex.w);
  let near=1.-smoothstep(.8,7.,abs(d));
  var vt=vec3f(0.,U,0.)+flow3(p.pos,t)*mix(1.6,3.2,near);
  let tn=vt-n*dot(vt,n); vt=mix(vt, tn*(1.+.35*near), near*.93);
  let topn=smoothstep(.5,.88,n.y)*near;
  let lift=smoothstep(1.,S*.55,p.pos.y)+.08;
  var va=-n*clamp(d,-3.,S*.45)*mix(.55*lift,2.2,near)*(1.-topn);
  if(d>S*.2){ let h=normalize(vec3f(C.x-p.pos.x,0.,C.z-p.pos.z)); va+=vec3f(-h.z,0.,h.x)*1.6*sin(hi*40.); }
  p.vel=mix(p.vel,vt+va,1.-exp(-dt*3.5)); p.pos+=p.vel*dt; p.age+=dt*(1.+9.*topn);
  let top=S*(2.74+.85); let life=mix(8.+hj*7., 3.6+hj*4., p.ex.w);
  let a=smoothstep(0.,mix(.7,1.2,p.ex.w),p.age)*(1.-smoothstep(top-S*.12,top+S*.34,p.pos.y))*(1.-smoothstep(life-1.8,life,p.age));
  let vd=normalize(G.cam.xyz-p.pos); let L=normalize(vec3f(-.45,.40,-.80)); let facing=dot(n,vd);
  let lam=max(dot(n,L),0.); let rim=pow(1.-abs(facing),2.5);
  let fill=max(dot(n,normalize(vec3f(.15,-.55,-.82))),0.); let sh=mix(.34, (.18+1.0*lam+.5*fill+.2*rim)*mix(.13,1.,smoothstep(-.3,.1,facing))*mix(.5,1.,smoothstep(.0,.55,facing)), near);
  p.ex=vec4f(a*(1.-topn)*mix(1.-.85*near,1.,p.ex.w), sh, smoothstep(.3,S*.22,p.pos.y), p.ex.w);      // the free streams thin out as they reach the body: no clots on it
  if(portraitParticles){
    let local=(p.pos-C)/S;
    let face=smoothstep(2.20,2.57,local.y)*(1.-smoothstep(.15,.39,abs(local.x)))*smoothstep(.12,-.13,local.z);
    p.ex.x*=1.-.98*face*near;
  }
  if(p.age>life||p.pos.y>top+S*.36){ p=figSpawn(i); }
  P[i]=p; }
`;
