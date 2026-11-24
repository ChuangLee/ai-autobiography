// 字才汇成文明的河: a landscape handscroll from a high oblique viewpoint. Receding ranges of ink mountains, mist in the valleys; five rivers of characters,
// each one family of writing and its things, wind down their own valleys from the far ranges and join on the plain into one river that runs on to the sea.
// Stateless: the terrain is a ray-marched heightfield and the rivers are painted on its valley floors, flowing with time.
export const SCROLL_FS = `
@group(0)@binding(0) var<uniform> G:GU; @group(0)@binding(1) var<storage,read> L:array<u32>; @group(0)@binding(2) var samp:sampler; @group(0)@binding(3) var atlas:texture_2d<f32>; @group(0)@binding(4) var objT:texture_2d<f32>;
fn xm(z:f32)->f32{ let d=max(34.-z,0.); return .0105*d*d; }
fn spreadAt(z:f32)->f32{ return smoothstep(26.,70.,z)*17.+max(z-52.,0.)*.46; }
fn rxk(k:f32,z:f32)->f32{ let s=smoothstep(30.,95.,z); return xm(z)+(k-2.)*spreadAt(z)+s*(21.*sin(z*.024+k*1.9)+9.*sin(z*.057+k*4.3)); }
fn rwk(k:f32,z:f32)->f32{ return mix(10.5, 3.6+.7*sin(k*2.3)+.8*sin(z*.05+k), smoothstep(22.,58.,z))*(1.-.3*smoothstep(220.,460.,z)); }
// signed distance to the nearest river (x only: the rivers run mostly along z), and which one
fn river(p:vec2f)->vec3f{ var d=1e5; var kk=0.; var u=0.; for(var i=0;i<5;i++){ let k=f32(i); let dx=p.x-rxk(k,p.y); let w=rwk(k,p.y); let dd=abs(dx)-w; if(dd<d){ d=dd; kk=k; u=dx/w; } } return vec3f(d,kk,u); }
fn ridged(p:vec2f)->f32{ var a=.5; var s=0.; var q=p; for(var i=0;i<4;i++){ let n=1.-abs(2.*vnoise(q)-1.); s+=a*n*n; q=mat2x2f(1.6,1.2,-1.2,1.6)*q+7.3; a*=.5; } return s; }
fn height(p:vec2f)->f32{ let r=river(p).x; let m=smoothstep(.5,24.,r); let sx=p.x-xm(p.y); let seaM=smoothstep(40.,110.,sx)*smoothstep(70.,15.,p.y); let plain=max(smoothstep(8.,62.,p.y), smoothstep(34.,95.,abs(sx)))*(1.-seaM);
  return m*plain*(ridged(p*.021+vec2f(3.,11.))*34.+ridged(p*.07)*5.)*(.55+.004*max(p.y,0.)); }
fn pickGlyph(k:u32,h:f32,h2:f32,zf:f32)->f32{ var gid=0u; if(k==2u){ let ch=u32(h*f32(L[9])*.999); let st=u32(clamp(zf*7.3+(h2-.5)*1.5,0.,6.)); gid=L[L[8]+ch*7u+st]; }
  else { var s=k; if(k>2u){ s=k-1u; } gid=L[L[s*2u]+u32(h*f32(L[s*2u+1u])*.999)]; } return f32(gid); }
fn glyphAt(gid:f32,uv:vec2f,lod:f32)->f32{ if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.){ return 0.; } return textureSampleLevel(atlas,samp,(vec2f(gid%32.,floor(gid/32.))+uv)/32.,lod).r; }
fn objAt(oi:f32,uv:vec2f,lod:f32)->f32{ if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.){ return 0.; } return textureSampleLevel(objT,samp,(vec2f(oi%4.,floor(oi/4.))+uv)/4.,lod).a; }
// what floats in river k at (across u in world units, along v): two sizes of characters and, larger and rarer, the things of that writing
fn cargo(k:f32,uw:f32,z:f32,t:f32,dist:f32)->f32{ var ink=0.; let ku=u32(k); let zf=clamp(1.-z/300.,0.,1.);
  for(var l=0;l<3;l++){ let cs=array<f32,3>(2.1,3.6,6.4)[l]; let sp=array<f32,3>(5.,4.,3.2)[l]; let col=floor(uw/cs); let v=(z+t*sp*(.8+.4*hash11(col*7.1+f32(l))))/cs+hash11(col*3.3)*9.;
    let c=vec2f(col,floor(v)); let f=vec2f(fract(uw/cs),fract(v)); let h=hash22(c+k*17.+f32(l)*31.); if(h.x>array<f32,3>(.85,.62,.42)[l]){ continue; }
    let a=(h.y-.5)*.7; let q=f-.5-(h-.5)*.16; let r=vec2f(q.x*cos(a)-q.y*sin(a), q.x*sin(a)+q.y*cos(a))/.84+.5; let lod=clamp(log2(dist/cs*.012*128.),0.,5.);
    if(l==2&&h.x<.16){ ink=max(ink,objAt(objOf(ku,hash21(c+5.)),vec2f(r.x,1.-r.y),clamp(lod-1.,0.,5.))*.9); } else { ink=max(ink,glyphAt(pickGlyph(ku,hash21(c+9.),h.y,zf),vec2f(r.x,1.-r.y),lod)); } }
  return ink; }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let ndc=vec2f(fc.x/G.m2.x*2.-1., 1.-fc.y/G.m2.y*2.); let th=G.right.w; let rd=normalize(G.fwd.xyz+G.right.xyz*ndc.x*th*G.up.w+G.up.xyz*ndc.y*th); let ro=G.cam.xyz; let t=G.cam.w;
  let scr=vec2f(ndc.x*G.up.w,ndc.y); let pf=fbm(scr*1.3)*.6+fbm(scr*9.)*.4; let paper=vec3f(.915,.888,.815)*(.97+.06*pf);
  var col=paper*(1.-.10*smoothstep(.0,.5,rd.y+.12));                                       // the sky: bare silk, the faintest wash
  var tt=2.; var hit=false; var p=ro; for(var i=0;i<110;i++){ p=ro+rd*tt; let h=height(p.xz); let d=p.y-h; if(d<.002*tt){ hit=true; break; } tt+=max(d*.42,.12+tt*.004); if(tt>900.){ break; } }
  if(hit){ let e=.35+tt*.004; let h0=height(p.xz); let n=normalize(vec3f(h0-height(p.xz+vec2f(e,0.)), e, h0-height(p.xz+vec2f(0.,e))));
    let rv=river(p.xz); let lit=dot(n,normalize(vec3f(-.55,.62,-.56)));
    // hemp-fibre strokes: long lines running down the fall of the slope, heavier on the shaded side and under the crests
    let fall=normalize(n.xz+vec2f(1e-4,0.)); let along=dot(p.xz,fall); let across=dot(p.xz,vec2f(-fall.y,fall.x));
    let fib=smoothstep(.42,.75,vnoise(vec2f(across*.9,along*.10+h0*.2)))*.65+smoothstep(.5,.8,vnoise(vec2f(across*2.1+3.,along*.2)))*.35;
    let fibd=mix(fib,.5,smoothstep(70.,260.,tt)); let steep=1.-n.y; var ink=clamp(steep*3.4,0.,1.)*(.30+.70*fibd)*(.55+.45*smoothstep(.3,-.35,lit)); ink+=.42*smoothstep(.2,-.3,lit)*smoothstep(1.,9.,h0); ink+=.6*smoothstep(.45,.85,steep)*smoothstep(.15,-.4,lit);
    ink+=.10*smoothstep(0.,6.,h0)*pf;                                                       // a wash over the high ground
    ink=clamp(ink*1.45,0.,.95); var c=paper*(1.-ink);
    if(rv.x<0.){ let w=rwk(rv.y,p.z); let tone=array<f32,5>(.95,.8,1.,.72,.86)[u32(rv.y)]; let edge=smoothstep(0.,-.5,rv.x);
      c=paper*(1.-(.30+.62*smoothstep(60.,300.,tt))*edge*tone); c*=1.-tone*edge*cargo(rv.y,rv.z*w,p.z,t,tt)*.97; c*=1.-.3*smoothstep(-.6,0.,rv.x)*edge; }
    else { c*=1.-.16*exp(-rv.x*.7); }                                                       // wet bank
    // the sea at one side is unpainted; mist lies in the valleys; the far ranges are pale washes
    let seaM=smoothstep(40.,110.,p.x-xm(p.z))*smoothstep(70.,15.,p.z); c=mix(c,paper*(1.-.03*smoothstep(.4,.6,vnoise(vec2f(p.x*.05,p.z*.4+t*.2)))),seaM*step(0.,rv.x));
    let mist=clamp(exp(-max(p.y,0.)*.22)*smoothstep(90.,300.,tt)*.8*(.6+.6*fbm(p.xz*.012+vec2f(t*.01,0.))),0.,1.)*step(0.,rv.x-1.);
    c=mix(c,paper*1.01,mist); let far=1.-exp(-tt*.00085); col=mix(c,paper*(1.-.05*smoothstep(.0,.3,rd.y+.2)),far*mix(.9,.55,step(rv.x,0.))); }
  // a few of the things still falling, close past the lens, as the land appears below
  for(var i=0;i<9;i++){ let fi=f32(i); let h=hash22(vec2f(fi*3.1,7.)); let t0=29.7+fi*.26; let y=1.55-(t-t0)*(1.3+.6*h.x); if(y<-1.6||y>1.6){ continue; }
    let c0=vec2f((h.y*2.-1.)*1.6,y); let sz=.32+.34*h.x; let a=(h.x-.5)*2.+(t-t0)*(h.y-.5)*2.4; let q=(scr-c0)/sz; let r=vec2f(q.x*cos(a)-q.y*sin(a), q.x*sin(a)+q.y*cos(a))+.5;
    col*=1.-.55*objAt(floor(h.y*15.99),vec2f(r.x,1.-r.y),2.2)*(1.-smoothstep(32.2,33.2,t)); }
  col*=mix(1.,.50,G.fwd.w);                                                                 // dusk
  return vec4f(col,1.); }
`;
