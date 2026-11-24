// Shot 3: machine heartache. The written characters leave the paper; the camera rises without stopping until the desk is the bright core of a nebula
// of hundreds of thousands of characters (诗云) wheeling in silver; the nebula draws together into one line laid along a crack across the night sky,
// 说痛疑偷前代句　言空恐负片时情, in characters sharp as splinters of ice; the crack opens, and the light behind it is the lamp behind a shadow-puppet screen.
// Particles are a pure function of time (no simulation), so any frame can be drawn on its own.

// ── the characters that leave the paper. instance: (x, y, z, size) (atlas u, v, half, angle) (sheet, order, -, -)
// slots: p[0..6].x lift start per sheet; p[8] = (zoom, -, -, -): camera height / height at the lift
export const INKCHARS = `
struct VO{ @builtin(position) pos:vec4f, @location(0) uv:vec2f, @location(1) w:vec4f }
@group(0)@binding(1) var lin:sampler; @group(0)@binding(2) var inkT:texture_2d<f32>;
fn hash1(x:f32)->f32{ return fract(sin(x*127.1+17.3)*43758.5453); }
fn liftTime(i:i32,ord:f32)->f32{ return u.p[i].x+ord*.028+hash1(ord*7.13+f32(i)*13.7)*.42; }
@vertex fn vs(@builtin(vertex_index) vi:u32,@location(0) a:vec4f,@location(1) b:vec4f,@location(2) c:vec4f)->VO{ var o:VO; let t=u.ro.w;
  let q=vec2f(f32(vi&1u),f32((vi>>1u)&1u))*2.-1.; let si=i32(c.x); let ord=c.y; let tl=liftTime(si,ord); let s=t-tl; let r1=hash1(ord*3.1+c.x*17.);
  if(s<0.){ o.pos=vec4f(2.,2.,2.,1.); return o; }
  let Z=u.p[8].x; let grow=1.+.3*s; let e=smoothstep(0.,1.6,s);
  let ang=b.w+(r1-.5)*1.2*e+.35*s*s*(.5+r1); let spin=.45*e*e*(1.+r1);
  let rc=rot(spin)*a.xz*Z*(1.+.25*s*s); let y=a.y+(.004+.09*s*s)*Z*mix(1.,.0,0.)+Z*.25*smoothstep(.3,1.8,s);
  let half=a.w*grow*Z; let lq=rot(ang)*(q*half*vec2f(1.,-1.));
  let wp=vec3f(rc.x+lq.x,y,rc.y+lq.y); o.pos=u.vp*vec4f(wp,1.);
  o.uv=b.xy+q*b.z*vec2f(1.,1.); let silver=smoothstep(.55,1.5,s); let fade=1.-smoothstep(1.7,2.6,s);
  o.w=vec4f(silver,fade,c.x,r1); return o; }
@fragment fn fs(i:VO)->@location(0) vec4f{ let k=textureSample(inkT,lin,i.uv/vec2f(4.,2.)).r; let s=i.w.x; let f=i.w.y;
  let cov=k*f; let glow=vec3f(.82,.88,1.)*(.8+.6*i.w.w)*s;
  return vec4f(mix(vec3f(.012),glow,s)*cov,cov*(1.-s)); }
`;

// ── the nebula. instance: (seed, atlas cell, target x, target y)  target x < 0: no place in the line
// slots: p[0] (time since the nebula began, fade in, gather 0..1 start, -)  p[1] (pixel angle, core radius share, -, -)
// p[2] final camera position (xyz, D)  p[3] its right×tan  p[4] its up×tan  p[5] its forward  p[6] (gather start, spread, glyph size at the line, line dim)
export const GLYPHS = `
struct VO{ @builtin(position) pos:vec4f, @location(0) uv:vec2f, @location(1) col:vec4f, @location(2) footprint:vec3f }
@group(0)@binding(1) var gs:sampler; @group(0)@binding(2) var atlas:texture_2d<f32>;
fn h1(x:f32)->f32{ return fract(sin(x*127.1+17.3)*43758.5453); }
fn gauss(a:f32,b:f32)->f32{ return sqrt(-2.*log(max(a,1e-6)))*cos(6.2831853*b); }
@vertex fn vs(@builtin(vertex_index) vi:u32,@location(0) a:vec4f)->VO{ var o:VO; let t=u.ro.w; let seed=a.x; let tn=u.p[0].x;
  let q=vec2f(f32(vi&1u),f32((vi>>1u)&1u))*2.-1.;
  let r1=h1(seed); let r2=h1(seed+1.7); let r3=h1(seed+3.1); let r4=h1(seed+4.3); let r5=h1(seed+5.9); let r6=h1(seed+7.7); let r7=h1(seed+9.1);
  // where it lives in the disc: radius log-uniform from the desk to the edge; two arms and a haze between them
  let lr=mix(log(.22),log(520.),pow(r1,.92)); let r=exp(lr); var th=0.;
  if(r2<.78){ th=floor(r3*2.)*3.14159+(lr-log(.22))*1.45+gauss(r4,r5)*(.22+.1*r6); } else { th=r3*6.2831853; }
  let om=.62*pow(r/30.,-.32); th+=om*tn+r7*.3;
  let y=clamp(gauss(r6,r4),-2.5,2.5)*r*.028*(1.+2.*exp(-r*.1));
  var p=vec3f(cos(th)*r,y,sin(th)*r);
  var size=r*.022*(.5+.9*r5*r5); var lum=(.08+.7*pow(r6,6.))*(.6+.4*r2);
  // drawing together: from its place in the wheel to its place in the line (or into the dark)
  let g0=u.p[6].x+u.p[6].y*(.55*abs(a.z-.5)*2.+.45*r7); let gk=sat((t-g0)/.95); let ge=gk*gk*(3.-2.*gk);
  if(a.z>=0.&&gk>0.){ let tgt=u.p[2].xyz+u.p[2].w*(u.p[5].xyz+(a.z*2.-1.)*u.p[3].xyz+(1.-a.w*2.)*u.p[4].xyz);
    let mid=mix(p,tgt,.5)+vec3f(0.,r*.4,0.)*sin(3.14159*ge)+cross(normalize(tgt-p+vec3f(1e-3)),vec3f(0.,1.,0.))*length(tgt-p)*.25*(r3-.5);
    p=mix(mix(p,mid,ge),mix(mid,tgt,ge),ge); size=mix(size,u.p[6].z*u.p[2].w*(.7+.6*r5),ge); lum=mix(lum,.03+.03*r6,ge)*mix(1.,u.p[6].w,ge); }
  else if(gk>0.){ lum*=1.-ge*(1.-.25*step(.97,r6)); size*=1.-.6*ge; }
  // the camera's own view: billboards; the core round the desk is left to the lamp's glow; sub-pixel glyphs keep their energy, not their size
  let rt=normalize(u.rt.xyz); let up=normalize(u.up.xyz); let cp=u.vp*vec4f(p,1.); let dist=max(cp.w,1e-3);
  let px=size/(dist*u.p[1].x); let ps=max(px,1.4); let s2=size*ps/max(px,1e-6);
  let ang=(r4-.5)*6.28+tn*(r5-.5)*.6; let lq=rot(ang)*q*s2*.5; let wp=p+rt*lq.x+up*lq.y;
  o.pos=u.vp*vec4f(wp,1.); if(cp.w<.05){ o.pos=vec4f(2.,2.,2.,1.); }
  let core=smoothstep(u.p[1].y*.6,u.p[1].y,r)+ge; let big=1.-smoothstep(260.,700.,px);
  let sub=min(1.,(px*px)/(ps*ps)); o.footprint=vec3f(q,px);
  let cell=a.y; o.uv=(vec2f(cell%32.,floor(cell/32.))+.5+q*vec2f(.5,-.5)*.92)/32.;
  let tint=mix(vec3f(.78,.84,1.),vec3f(1.,.93,.82),exp(-r*.08)*.7);
  o.col=vec4f(tint*lum*u.p[0].y*sat(core)*big*sub*1.6,1.); return o; }
@fragment fn fs(i:VO)->@location(0) vec4f{ let glyph=textureSample(atlas,gs,i.uv).r;
  let r2=dot(i.footprint.xy,i.footprint.xy);
  let unresolved=.57*exp(-2.1*r2)*(1.-smoothstep(.48,1.,r2));
  let k=mix(unresolved,glyph,smoothstep(1.8,5.5,i.footprint.z));
  return vec4f(i.col.rgb*k,0.); }
`;

// ── the sky: deep night with the nebula's own haze, the core; then the crack, the sentence in ice, the opening into light
// slots: p[0] (haze, core, crack grow 0..1, crack glow)  p[1] (ice 0..1, split, open 0..1, glare inside)  p[2] the screen's rectangle (x0, y0, x1, y1) it opens to
// p[3] (time since the nebula began, -, -, -)  p[4..20] the crack, two points to a slot (x, y in 0..1, y down)
export const SKY = `
@group(0)@binding(1) var lin:sampler; @group(0)@binding(2) var sent:texture_2d<f32>;
fn cpt(i:i32)->vec2f{ let v=u.p[4+i/2]; if(i%2==0){ return v.xy; } return v.zw; }
fn segd(p:vec2f,a:vec2f,b:vec2f)->vec2f{ let pa=p-a; let ba=b-a; let h=sat(dot(pa,ba)/dot(ba,ba)); return vec2f(length(pa-ba*h),h); }
const ASP=1.7777778;
// distance to the crack (in screen-height units), the crack's height at x, and how far along it this is (0..1)
fn crack(uv:vec2f)->vec3f{ var d=1e9; var y=.45; var s=0.; let p=uv*vec2f(ASP,1.);
  for(var i=0;i<32;i++){ let a=cpt(i)*vec2f(ASP,1.); let b=cpt(i+1)*vec2f(ASP,1.); let r=segd(p,a,b); if(r.x<d){ d=r.x; s=(f32(i)+r.y)/32.; }
    if(uv.x>=cpt(i).x&&uv.x<cpt(i+1).x){ y=mix(cpt(i).y,cpt(i+1).y,(uv.x-cpt(i).x)/(cpt(i+1).x-cpt(i).x)); } }
  return vec3f(d,y,s); }
fn vor(p:vec2f)->vec2f{ let n=floor(p); let f=fract(p); var d1=8.; var d2=8.; for(var j=-1;j<=1;j++){ for(var i=-1;i<=1;i++){ let g=vec2f(f32(i),f32(j)); let o=hash22(n+g); let r=g+o-f; let d=dot(r,r); if(d<d1){ d2=d1; d1=d; } else if(d<d2){ d2=d; } } } return vec2f(sqrt(d1),sqrt(d2)-sqrt(d1)); }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let uv=fc.xy/vec2f(u.rt.w,u.up.w); let rd=rayDir(fc.xy); let tn=u.p[3].x;
  var col=vec3f(.0018,.0024,.0048)*(1.+.6*uv.y);
  // the nebula's haze in the plane of the disc (under the glyphs)
  if(rd.y<0.){ let tp=-u.ro.y/rd.y; let w=u.ro.xyz+rd*tp; let r=length(w.xz); let lr=log(max(r,.05)); var th=atan2(w.z,w.x)-.62*pow(max(r,.2)/30.,-.32)*tn;
    var arm=0.; for(var k=0;k<2;k++){ let a=fract((th-f32(k)*3.14159-(lr-log(.22))*1.45)/6.2831853+.5)-.5; arm+=exp(-a*a*40.); }
    let fall=exp(-pow(max(r,.1)/320.,2.))*smoothstep(.05,.5,r/max(u.ro.y,1.));
    let dust=fbm(vec2f(lr*3.,th*2.)+tn*.05)*.7+.3;
    col+=vec3f(.5,.56,.72)*(.006+.03*arm)*fall*dust*u.p[0].x*(1.+2./(1.+r*.02)); }
  // the core: where the lamp was
  let cc=u.vp*vec4f(0.,0.,0.,1.); if(cc.w>0.){ let cs=(cc.xy/cc.w*vec2f(.5,-.5)+.5); let d=length((uv-cs)*vec2f(ASP,1.)); col+=vec3f(1.,.86,.62)*u.p[0].y*(.02/(d*d*80.+.02)+.15*exp(-d*9.)); }
  var alpha=u.fw.w;
  let cr=crack(uv); let grow=u.p[0].z; let along=abs(cr.z-.5)*2.;
  if(grow>0.){ let reach=smoothstep(along,along+.06,grow*1.06)*(1.-u.p[1].z*u.p[1].z); let pxs=1./u.up.w;
    // the craquelure of a glaze, faint over the whole sky, gathering to the crack
    let v1=vor(uv*vec2f(ASP,1.)*7.+3.); let v2=vor(uv*vec2f(ASP,1.)*23.+9.); let near=exp(-cr.x*9.);
    col+=vec3f(.5,.6,.8)*(smoothstep(.012,.0,v1.y)*(.006+.04*near)+smoothstep(.01,.0,v2.y)*.025*near)*reach*u.p[0].w;
    // the crack: a hair of white light with a cold glow; branches off it like lightning
    let core=smoothstep(1.3*pxs,.2*pxs,cr.x); let glow=exp(-cr.x*220.)*.25+exp(-cr.x*40.)*.025;
    let br=vor(uv*vec2f(ASP,1.)*13.+vec2f(5.,1.)); let branch=smoothstep(.02,.0,br.y)*exp(-cr.x*30.)*smoothstep(.0,.02,cr.x);
    col+=(vec3f(.85,.93,1.)*core*2.25+vec3f(.55,.7,1.)*glow*.85+vec3f(.6,.75,1.)*branch*.35)*reach*u.p[0].w; }
  // the sentence, in ice, split by the crack
  let ice=u.p[1].x; if(ice>0.){ let side=sign(uv.y-cr.y); let sp=u.p[1].y*side; let fc0=floor((uv*vec2f(ASP,1.))*38.+vor(uv*vec2f(ASP,1.)*38.).x*.0); let sh=(hash22(floor(uv*vec2f(ASP,1.)*34.+vec2f(fbm(uv*40.)*2.)))-.5)*vec2f(1./ASP,1.)*.0035; let su=uv-vec2f(0.,sp)+sh;
    let lod=clamp(log2(2048./u.rt.w),0.,2.4);
    let k0=textureSampleLevel(sent,lin,su,lod).r; let k1=textureSampleLevel(sent,lin,su,1.5).r; let k2=textureSampleLevel(sent,lin,su,3.).r;
    let ix=textureSampleLevel(sent,lin,su,0.).g*255./16.; let appear=sat(ice*16.-abs(ix-7.)*1.1-1.);
    if(k2>.002){ let e=vec2f(max(1./2048.,.65/u.rt.w),0.); let gx=textureSampleLevel(sent,lin,su+e.xy,lod).r-textureSampleLevel(sent,lin,su-e.xy,lod).r; let gy=textureSampleLevel(sent,lin,su+e.yx*1.78,lod).r-textureSampleLevel(sent,lin,su-e.yx*1.78,lod).r;
      let hx=textureSampleLevel(sent,lin,su+e.xy*3.,2.).r-textureSampleLevel(sent,lin,su-e.xy*3.,2.).r; let hy=textureSampleLevel(sent,lin,su+e.yx*5.3,2.).r-textureSampleLevel(sent,lin,su-e.yx*5.3,2.).r;
      let fp=su*vec2f(ASP,1.)*70.; let fac=vor(fp); let fid=hash21(floor(fp*1.3)); let facet=hash21(floor(fp+.5)+7.);
      let n=normalize(vec3f(-hx*5.+(facet-.5)*.5,-hy*5.+(hash21(floor(fp+.5))-.5)*.5,1.)); let L=normalize(vec3f(.0,sign(cr.y-uv.y)*.8,.6)); let spec=pow(max(dot(reflect(-L,n),vec3f(0.,0.,1.)),0.),40.);
      let rim=sat(length(vec2f(gx,gy))*1.6);                                               // the cut edge of every stroke
      let inner=vec3f(.075,.14,.25)*(.65+facet)+vec3f(.31,.52,.77)*pow(facet,6.)*.4;           // dark, cold, a facet catching light here and there
      let fract_=smoothstep(.025,.0,fac.y)*.40;                                             // fractures running through the ice
      let near=exp(-abs(uv.y-cr.y)*25.);
      var ic=inner*k0+vec3f(.69,.84,1.)*(rim*.91+spec*.78*k1+fract_*k0)*(.6+.64*near);
      let glint=step(.996,hash21(floor(fp*2.)))*k0*sin(tn*9.+facet*30.)*sin(tn*9.+facet*30.); ic+=vec3f(1.)*glint*3.;
      col=mix(col,col*.1,k1*appear)+ic*appear; } }
  // the crack opens: the jagged edges straighten into the edges of the lit screen behind it
  let op=u.p[1].z; if(op>0.){ let R=u.p[2]; let e=op*op*(3.-2.*op); let jag=cr.y-uv.y;
    let top=mix(cr.y-.002,R.y,e)+(cr.y-.45)*(1.-e)*.0; let bot=mix(cr.y+.002,R.w,e); let l=mix(-.1,R.x,e*e); let r=mix(1.1,R.z,e*e);
    let ein=smoothstep(.0,1.5/u.up.w,min(min(uv.y-top,bot-uv.y),min(uv.x-l,r-uv.x)));
    let rim=exp(-abs(min(min(uv.y-top,bot-uv.y),min(uv.x-l,r-uv.x)))*240.)*(1.-e*.7);
    col+=vec3f(1.,.9,.75)*rim*1.1*(1.-ein);
    let glare=u.p[1].w; col=mix(col,vec3f(1.,.86,.66)*.62,ein*glare); alpha*=1.-ein*(1.-glare); }
  return vec4f(col,alpha); }
`;
