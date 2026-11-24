// The first water: voices leave only rings; then characters fall like rain onto it, and where they land they stay standing. Everything here is a closed-form
// function of time (no simulation state), so the shots can be cut freely.
const SEA_COMMON = `
const VT0=18.98; const SPREAD0=21.95;
fn landTime(r:f32,h:f32)->f32{ return SPREAD0+.91*pow(max(r,.01),.327)+(h-.5)*.35; }
fn rainTime(h:f32,t0:f32,r:f32)->f32{ return t0+h*5.2+r*.004; }           // mode 3: it rains for five seconds and the water fills          // the sea of characters spreads outward from the first one
fn voiceH(xz:vec2f,t:f32)->f32{ var h=0.; let die=1.-smoothstep(21.1,21.95,t);
  for(var k=0;k<7;k++){ let fk=f32(k); let ta=t-(VT0+fk*.405); if(ta<=0.){ continue; } let c=vec2f(sin(fk*2.4+1.)*8., cos(fk*1.7+.5)*6.+3.);
    let r=length(xz-c); let x=r-ta*6.2; h+=.95*exp(-ta*.6)*exp(-x*x/(5.+ta*5.))*sin(x*1.7)/(1.+r*.05); } return h*die; }
fn ring(xz:vec2f,c:vec2f,ta:f32,amp:f32)->f32{ if(ta<=0.||ta>3.2){ return 0.; } let x=length(xz-c)-ta*3.0; return amp*exp(-ta*1.25)*exp(-x*x*.55)*sin(x*5.2); }
fn landH(xz:vec2f,t:f32,mode:f32,t0:f32)->f32{ if(mode<.5){ return 0.; } var h=0.; let cell=floor(xz/4.);
  for(var j=-2;j<=2;j++){ for(var i=-2;i<=2;i++){ let cc=cell+vec2f(f32(i),f32(j)); let hh=hash22(cc); let c=(cc+.5+(hh-.5)*.8)*4.; let h3=hash21(cc+7.3);
    if(mode<2.5){ h+=ring(xz,c,t-landTime(length(c),h3),.30); } else { h+=ring(xz,c,t-rainTime(h3,t0,length(c)),.36)+ring(xz,c+vec2f(1.6,-1.2),t-rainTime(hh.x,t0,length(c)),.30)+ring(xz,c-vec2f(1.1,1.5),t-rainTime(hh.y,t0,length(c)),.26); }
    if(mode>1.5&&mode<2.5){ h+=ring(xz,c,fract((t-t0)/2.3+h3)*2.3,.34)+ring(xz,c+vec2f(1.7,-1.1),fract((t-t0)/2.9+hh.x)*2.9,.26); } } } return h; }
`;
export const SEA_BG = SEA_COMMON + `
@group(0)@binding(0) var<uniform> G:GU;
fn H(xz:vec2f)->f32{ var h=landH(xz,G.cam.w,G.fig.x,G.fig.z); if(G.fig.x<.5){ h+=voiceH(xz,G.cam.w); } return h; }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let ndc=vec2f(fc.x/G.m2.x*2.-1., 1.-fc.y/G.m2.y*2.); let th=G.right.w; let rd=normalize(G.fwd.xyz+G.right.xyz*ndc.x*th*G.up.w+G.up.xyz*ndc.y*th); let ro=G.cam.xyz;
  let mist=vec3f(.915,.888,.815); var col=mist*(1.+.025*rd.y);
  if(rd.y<-1e-4){ let tt=-ro.y/rd.y; let xz=(ro+rd*tt).xz; let e=.06+tt*.004; let h0=H(xz); let gx=(H(xz+vec2f(e,0.))-h0)/e; let gz=(H(xz+vec2f(0.,e))-h0)/e;
    let f1=fbm(xz*.22); let f2=fbm(xz*2.1+3.); let det=exp(-tt*.02);
    var paper=vec3f(.905,.878,.80)*(1.+.05*(f1-.5)+.03*(f2-.5)*det);
    let slope=dot(vec2f(gx,gz),normalize(vec2f(.55,.83)));                           // ripples as they are brushed in ink: one flank of every ring is wet
    var ink=clamp(slope*1.25,0.,.8)+.26*smoothstep(.04,.45,abs(h0))*smoothstep(.0,.6,-slope+.3);
    ink+=.05+.04*f1;                                                                 // the water itself: the faintest wash
    paper*=1.-ink*.8; col=mix(paper,mist,1.-exp(-tt*.0085)); }
  return vec4f(col,1.); }
`;
export const SEA_GLYPH = SEA_COMMON + `
@group(0)@binding(0) var<uniform> G:GU; @group(0)@binding(1) var<storage,read> L:array<u32>; @group(0)@binding(2) var samp:sampler; @group(0)@binding(3) var atlas:texture_2d<f32>; @group(0)@binding(4) var objT:texture_2d<f32>;
struct VO{ @builtin(position) pos:vec4f, @location(0) uv:vec2f, @location(1) cell:vec2f, @location(2) ink:f32, @location(3) bias:f32, @location(4) obj:f32 }
@vertex fn vs(@builtin(vertex_index) vi:u32, @builtin(instance_index) ii:u32)->VO{
  var o:VO; o.pos=vec4f(2.,2.,2.,1.); o.uv=vec2f(0.); o.cell=vec2f(0.); o.ink=0.; o.bias=0.; o.obj=0.;
  let t=G.cam.w; let mode=G.fig.x; let N=G.pr.w; let Rm=G.fig.y; let r1=rf(ii*5u+1u); let r2=rf(ii*11u+2u); let r3=rf(ii*19u+3u);
  let rad=Rm*sqrt((f32(ii)+.5)/N); let an=f32(ii)*2.39996323; var wp=vec3f(cos(an)*rad,0.,sin(an)*rad); let jit=Rm*1.25/sqrt(N); wp.x+=(rf(ii*23u+7u)-.5)*jit; wp.z+=(rf(ii*29u+8u)-.5)*jit;
  var T=landTime(rad,r1); if(mode>1.5 && r3<.42){ T=G.fig.z+r1*2.6; } if(mode>2.5){ T=rainTime(r1,G.fig.z,rad); } let ta=t-T; if(ta<-3.4){ return o; }
  let isObj=step(rf(ii*37u+13u),.17);
  var a=1.; var y=0.; if(ta<0.){ y=-ta*13.; a=1.-smoothstep(26.,44.,y); } else { y=-.16*exp(-ta*3.)*sin(ta*9.)+.03*sin(t*1.3+r2*40.); a=1.; }
  let flip=G.m1.z; if(flip<0.){ if(ta<0.){ return o; } a*=.22; }
  var size=G.pr.x*(.78+.5*r2)*(1.+1.5*isObj); wp.y=(y+size*.5/.78*.86)*flip;                        // standing on the water
  let rel=wp-G.cam.xyz; let vz=dot(rel,G.fwd.xyz); if(vz<.35){ return o; } let vx=dot(rel,G.right.xyz); let vy=dot(rel,G.up.xyz); let th=G.right.w;
  let coc=G.pr.z*abs(vz-G.pr.y)/G.pr.y; let blur=min(coc/size,4.); a/=1.+blur*blur*1.2; size*=1.+blur;
  let ppu=G.m2.y/(2.*th*vz); let px=size*ppu; if(px<1.4){ a*=(px/1.4)*(px/1.4); size=1.4/ppu; }
  let cs=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(1.,1.),vec2f(-1.,-1.),vec2f(1.,1.),vec2f(-1.,1.)); let c=cs[vi];
  var ang=(r2-.5)*.16+.04*sin(t*1.1+r1*50.)+isObj*(r3-.5)*1.1; if(ta<0.){ ang+=(r3-.5)*(1.2+2.5*isObj)*min(-ta,1.)+isObj*ta*(r2-.5)*2.; } let ca=cos(ang); let sa=sin(ang);
  var off=vec2f(c.x*ca-c.y*sa, c.x*sa+c.y*ca)*size*.5/.78; if(flip<0.){ off.x+=.12*sin(t*2.+wp.z*1.3+off.y*6.)*size; }
  o.pos=vec4f((vx+off.x)/(th*G.up.w), (vy+off.y)/th, .5*vz, vz); o.uv=vec2f(c.x*.5+.5, .5-c.y*.5*flip); o.bias=log2(1.+blur);
  let k=tribOf(ii); var gid=0u; let zf=clamp(rad/Rm*1.15,0.,1.);
  if(k==2u){ let ch=u32(rf(ii*3u+1u)*f32(L[9])); let st=u32(clamp(zf*7.3+(rf(ii*13u+4u)-.5)*1.5,0.,6.)); gid=L[L[8]+ch*7u+st]; }
  else { var s=k; if(k>2u){ s=k-1u; } let cnt=f32(L[s*2u+1u]); var u=rf(ii*17u+9u); if(k==3u){ u=clamp(zf*.8+u*.42-.12,0.,.999); } gid=L[L[s*2u]+u32(u*cnt)]; }
  o.cell=vec2f(f32(gid%32u), f32(gid/32u)); o.ink=a*.92*exp(-vz*.0075);
  if(isObj>.5){ let oi=objOf(k,rf(ii*41u+3u)); o.cell=vec2f(oi%4.,floor(oi/4.)); o.obj=1.; } return o; }
@fragment fn fsInk(i:VO)->@location(0) vec4f{ let g=textureSampleBias(atlas,samp,(i.cell+i.uv)/32.,i.bias).r; let ob=textureSampleBias(objT,samp,(i.cell+i.uv)/4.,i.bias).a; return vec4f(vec3f(mix(g,ob,i.obj)*i.ink),1.); }
`;
