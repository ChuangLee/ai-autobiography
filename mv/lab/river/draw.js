// Render shaders: the paper (and, at night, the sea and the body's dark core), and the characters.
export const BG_FS = `
@group(0)@binding(0) var<uniform> G:GU; @group(0)@binding(1) var samp:sampler; @group(0)@binding(2) var fieldT:texture_2d<f32>; @group(0)@binding(3) var decoT:texture_2d<f32>; @group(0)@binding(4) var atlasS:sampler; @group(0)@binding(5) var atlasT:texture_2d<f32>;
const GOLD=vec3f(1.,.82,.55);
fn sky(rd:vec3f,night:f32)->vec3f{ let day=vec3f(.905,.875,.80)*(1.+.03*rd.y); let h=exp(-abs(rd.y)*7.); let ni=mix(vec3f(.0045,.005,.0075), vec3f(.030,.033,.043), h); return mix(day,ni,night); }
fn glyphCell(gid:f32, uv:vec2f)->f32{ if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.){ return 0.; } let cell=vec2f(gid%32., floor(gid/32.)); return textureSampleLevel(atlasT,atlasS,(cell+vec2f(uv.x,1.-uv.y))/32.,G.heads[1].w).r; }
// the body under the characters: a statue standing in the sea, revealed from the water upward
fn landH(xz:vec2f)->f32{ let w=fbm(xz*.012+5.); let a=1.-abs(2.*fbm(xz*.022+vec2f(3.,7.)+w)-1.); let b=1.-abs(2.*fbm(xz*.06+11.)-1.); return a*a*.75+b*b*.25*a; }
fn core(ro:vec3f, rd:vec3f)->vec4f{ let S=G.fig.z; let C=vec3f(G.fig.x,0.,G.fig.y); let oc=ro-(C+vec3f(0.,S*1.75,0.)); let b=dot(oc,rd); let cc=dot(oc,oc)-S*S*5.6; let h=b*b-cc; if(h<0.){ return vec4f(0.); }
  var t=max(-b-sqrt(h),0.); let te=-b+sqrt(h); var hit=false; for(var i=0;i<90;i++){ let local=(ro+rd*t-C)/S; let d=bust(local)*S; if(d<max(.006,.00024*t)){ hit=true; break; } t+=d*mix(.90,.53,smoothstep(2.45,2.8,local.y)); if(t>te){ break; } }
  if(!hit){ return vec4f(0.); } let p=ro+rd*t; let q=(p-C)/S; let rev=1.-smoothstep(G.m3.w-S*.22, G.m3.w, abs(p.y)); if(rev<=0.){ return vec4f(0.); }
  let stone=statueCol(q,bustN(q),rd,G.cam.w)*G.heads[2].w;
  if(anatomyStudy){
    // Churning water and mist take the lower body back into the river. The
    // advancing camera eventually looks above this layer at the dry face.
    let eddy=fbm(q.xz*vec2f(4.1,6.3)+vec2f(.09*G.cam.w,0.));
    let tide=.99+.32*(eddy-.5)+.075*sin(q.x*6.7+q.z*5.1+G.cam.w*.47);
    let air=smoothstep(tide-.34,tide+.61,q.y);
    let wet=mix(vec3f(.023,.027,.031),stone,.20+.80*air);
    return vec4f(wet,rev*air);
  }
  return vec4f(stone,rev); }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let ndc=vec2f(fc.x/G.m2.x*2.-1., 1.-fc.y/G.m2.y*2.); let th=G.right.w; let night=G.fwd.w; let t=G.cam.w;
  let rd=normalize(G.fwd.xyz+G.right.xyz*ndc.x*th*G.up.w+G.up.xyz*ndc.y*th); let ro=G.cam.xyz;
  var col=sky(rd,night);
  if(G.heads[0].w>0.&&rd.y>-.02){ let th2=atan2(rd.x,-rd.z); for(var l=0;l<3;l++){ let fl=f32(l); let hgt=(.035+.05*fl)*(.6+1.3*fbm(vec2f(th2*(5.-fl)+fl*7.,fl*3.)))*smoothstep(1.5,.5,abs(th2));
    let mm=smoothstep(hgt,hgt-.012,rd.y); col=mix(col, sky(rd,night)*mix(.86-.16*(2.-fl),1.,smoothstep(-.01,hgt,rd.y)*.6), mm*G.heads[0].w*(1.-.5*night)); } }
  var mtn=0.; if(G.heads[4].w>0.){ let az=atan2(rd.x,rd.z); let azF=atan2(G.fig.x-ro.x,G.fig.y-ro.z); let da=az-azF;
    for(var l=0;l<3;l++){ let fl=f32(l); let hgt=(.03+.05*fl)*(.4+1.7*fbm(vec2f(az*(11.-2.*fl)+fl*7.,fl*3.)))*smoothstep(.09+.05*fl,.36+.1*fl,abs(da));
      let m=smoothstep(hgt,hgt-.004,rd.y)*step(-.004,rd.y); let edge=smoothstep(.012,.0,abs(rd.y-hgt))*G.m1.x*G.m3.w/(G.fig.z*3.1);
      col=mix(col, (vec3f(.011,.012,.015)*(1.+fl*.8)+GOLD*.042*G.m1.x*smoothstep(1.1,.2,abs(da)))*(.55+.45*smoothstep(hgt-.05,hgt,rd.y)), m*G.heads[4].w*smoothstep(0.,.028,rd.y)); col+=GOLD*.12*edge*smoothstep(.9,.15,abs(da))*G.heads[4].w; mtn=max(mtn,m); } }
  if(rd.y<-1e-4){ let tt=-ro.y/rd.y; let P=ro+rd*tt; let xz=P.xz; let uv=(xz-vec2f(-32.,-6.))/vec2f(64.,256.);
    let det=exp(-tt*.012);
    // xuan paper: cloudy sizing, long fibres, flecks
    let f1=fbm(xz*.35); let f2=fbm(xz*2.6+7.); let fib=pow(vnoise(vec2f(xz.x*9.+xz.y*2.,xz.y*.9-xz.x*.3)),5.)+pow(vnoise(vec2f(xz.x*1.1+31.,xz.y*8.-xz.x*3.)),5.);
    var paper=vec3f(.915,.885,.81)*(1.+(.045*(f1-.5)+(.035*(f2-.5)+.05*fib)*det));
    var wash=0.; var stone=0.; var inDom=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
    if(inDom>0.){ let fl=textureSampleLevel(fieldT,samp,uv,0.); let de=textureSampleLevel(decoT,samp,uv,0.); let sd=(fl.b-.5)*16.+(f2-.5)*.5*det;
      let dry=mix(.22,1.,smoothstep(.2,.8,de.g+(f2-.5)*.25));
      wash=smoothstep(-.25,.55,sd)*(.34+.30*smoothstep(.3,3.,sd))*dry*(1.-smoothstep(G.m1.y-10.,G.m1.y+9.,xz.y))*mix(1.,1.55,smoothstep(30.,140.,ro.y));
      wash+=.10*exp(min(sd,0.)*2.2)*step(sd,0.)*(1.-smoothstep(G.m1.y-10.,G.m1.y+4.,xz.y));
      stone=smoothstep(.10,.42,de.r+(f2-.5)*.4*det+(f1-.5)*.25); let fo=1.-smoothstep(G.pr.y*1.6,G.pr.y*5.5,tt); wash*=fo; stone*=fo; }
    let land=G.heads[0].w; var sdl=-9.; if(inDom>0.){ sdl=(textureSampleLevel(fieldT,samp,uv,0.).b-.5)*16.; }
    if(land>0.){ let dv=smoothstep(.5,9.,-sdl); let e2=1.6; let h0=landH(xz); let gl=vec2f(landH(xz+vec2f(e2,0.))-h0, landH(xz+vec2f(0.,e2))-h0)/e2;
      let shade=clamp(dot(gl,normalize(vec2f(.75,.66)))*9.,0.,1.); let crest=smoothstep(.80,.98,h0)*smoothstep(.0,.25,length(gl)*8.);
      let dirv=normalize(gl+vec2f(1e-4,0.)); let cun=smoothstep(.45,.8,vnoise(vec2f(dot(xz,vec2f(-dirv.y,dirv.x))*1.6, dot(xz,dirv)*.22)))*.55+.45*f2;      // texture strokes running down the slope
      paper*=1.-land*dv*clamp(1.15*shade*(.40+.8*cun)+.55*crest*(.5+.5*cun)+.10*h0+.10*smoothstep(60.,-60.,xz.y),0.,.9); }
    let se=textureSampleLevel(decoT,samp,uv+vec2f(.006,.0015),0.).r-textureSampleLevel(decoT,samp,uv-vec2f(.006,.0015),0.).r;
    let day=paper*(1.-wash*.62)*(1.-stone*(.86+.1*f2))+vec3f(.30)*stone*max(se,0.)*3.;
    // night: the same sheet gone to deep ink; the water keeps a faint sheen, the sea is a dark mirror
    var ni=vec3f(.0065,.007,.0095)*(1.+.5*(f1-.5))+vec3f(.010,.011,.014)*wash*1.4; ni*=1.-stone*.8; ni+=vec3f(.05,.053,.062)*stone*max(se,0.)*4.;
    let sea=smoothstep(G.m1.y-6.,G.m1.y+10.,xz.y);
    if(night>.01){ let rip=vec2f(vnoise(xz*.35+vec2f(0.,t*.25))-.5, vnoise(xz*.28-vec2f(t*.2,3.))-.5)*.035; var rr=normalize(vec3f(rd.x+rip.x,-rd.y,rd.z+rip.y));
      let fres=.04+.96*pow(1.-max(-rd.y,0.),5.); var refl=sky(rr,1.)*fres;
      if(G.m1.x>0.){ let cr=core(P+vec3f(0.,.02,0.),rr); refl=mix(refl,cr.rgb*fres,cr.a*.9); let S=G.fig.z; let dx=(xz.x-G.fig.x)/S; let dz=(G.fig.y-xz.y)/S;
        refl+=GOLD*.10*G.m1.x*G.m3.w/(S*3.6)*exp(-dx*dx*3.)*exp(-max(dz,0.)*.30)*(.6+.8*vnoise(vec2f(xz.x*.6,xz.y*.12-t*.3))); }
      { let dx=(xz.x-G.fig.x)/G.fig.z; let dz=(G.fig.y-xz.y)/G.fig.z; refl+=vec3f(.10,.105,.12)*G.heads[4].z*exp(-dx*dx*9.)*exp(-max(dz-.3,0.)*.7)*smoothstep(-.4,.3,dz)*(.4+.9*vnoise(vec2f(xz.x*.5,xz.y*.10-t*.2))); }
      let ribbon=sin(xz.y*2.1+t*.44+1.7*vnoise(xz*vec2f(.8,.17))+.54*xz.x);
      let ripples=smoothstep(.58,.96,ribbon)*(.35+.65*vnoise(xz*vec2f(.42,.13)));
      ni+=vec3f(.017,.019,.024)*ripples*(1.-smoothstep(45.,155.,tt))*smoothstep(-.05,.12,rd.y+.16);
      ni=mix(ni, ni*.5+refl, sea); }
    var c=mix(day,ni,night);
    let fog=1.-exp(-tt*mix(.0016,.0045,night)); col=mix(c, sky(vec3f(rd.x,0.,rd.z),night), fog);
  } else if(G.m1.x>0.){ let cr=core(ro,rd); col=mix(col, vec3f(.0035,.0038,.005)+cr.rgb, cr.a*(1.-mtn*smoothstep(.0,.06,rd.y))); }
  if(rd.y>=-1e-4){ } else if(G.m1.x>0.){ let cr=core(ro,rd); if(cr.a>0.){ col=mix(col, vec3f(.0035,.0038,.005)+cr.rgb, cr.a); } }
  if(G.heads[4].w>0.&&rd.y>0.&&mtn<.5){ let dF=length(vec2f(G.fig.x-ro.x,G.fig.y-ro.z)); let yb=ro.y+rd.y*dF/max(length(rd.xz),.05); let S=G.fig.z; let az=atan2(rd.x,rd.z);   // cloud bands at the height of its chest
    let band=exp(-pow((yb-S*1.45)/(S*.16),2.))*smoothstep(.35,.7,fbm(vec2f(az*7.-t*.012,yb*.05)))+.8*exp(-pow((yb-S*1.05)/(S*.11),2.))*smoothstep(.35,.7,fbm(vec2f(az*5.+t*.01+3.,yb*.06)));
    let lit=exp(-pow((az-atan2(G.fig.x-ro.x,G.fig.y-ro.z))*2.2,2.))*G.m1.x; col=mix(col, vec3f(.050,.053,.064)+GOLD*.22*lit, clamp(band*1.3,0.,1.)*.8*G.heads[4].w); }
  return vec4f(col,1.); }
`;
export const GLYPH_VS_FS = `
@group(0)@binding(0) var<uniform> G:GU; @group(0)@binding(1) var<storage,read> P:array<Pt>; @group(0)@binding(2) var<storage,read> L:array<u32>; @group(0)@binding(3) var samp:sampler; @group(0)@binding(4) var atlas:texture_2d<f32>; @group(0)@binding(5) var objT:texture_2d<f32>;
struct VO{ @builtin(position) pos:vec4f, @location(0) uv:vec2f, @location(1) cell:vec2f, @location(2) ink:f32, @location(3) light:vec3f, @location(4) bias:f32, @location(5) obj:f32, @location(6) face:vec2f }
@vertex fn vs(@builtin(vertex_index) vi:u32, @builtin(instance_index) ii:u32)->VO{
  var o:VO; o.pos=vec4f(2.,2.,2.,1.); o.uv=vec2f(0.); o.cell=vec2f(0.); o.ink=0.; o.light=vec3f(0.); o.bias=0.; o.obj=0.; o.face=vec2f(2.);
  let p=P[ii]; if(p.ex.x<=.004){ return o; } var wp=p.pos; let flip=G.m1.z; let fig=step(.5,p.kind);
  if(flip<0.){ if(fig<.5||wp.y<.4){ return o; } wp.y=-wp.y; }
  let rel=wp-G.cam.xyz; let vz=dot(rel,G.fwd.xyz); if(vz<.35){ return o; } let vx=dot(rel,G.right.xyz); let vy=dot(rel,G.up.xyz);
  let r1=rf(ii*5u+1u); let r2=rf(ii*11u+2u); let night=G.fwd.w; let th=G.right.w; let t=G.cam.w;
  let isObj=step(rf(ii*37u+13u),.11)*(1.-fig); var size=mix(G.pr.x*mix(1.,3.2,smoothstep(.6,.95,G.fwd.w)),G.fig.w,fig)*(.72+.6*r1)*(1.+1.7*isObj);
  let coc=G.pr.z*abs(vz-G.pr.y)/G.pr.y; let blur=min(coc/size,4.); var a=p.ex.x/(1.+blur*blur*1.2); size*=1.+blur;
  let ppu=G.m2.y/(2.*th*vz);
  // Close flotsam stays within the scale of the bank. At reduced density a
  // single enlarged inscription used to cover the whole person and horizon.
  if(fig<.5 && night>.65){size=min(size,(.054+.026*isObj)*G.m2.y/ppu);}
  if(portraitParticles && fig>.5){
    let approach=smoothstep(47.8,52.5,t);
    size=min(size,mix(.12,.023,approach)*G.m2.y/ppu);
    a*=1.-.70*approach;
  }
  let px=size*ppu; if(px<1.4){ a*=(px/1.4)*(px/1.4); size=1.4/ppu; }
  let cs=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(1.,1.),vec2f(-1.,-1.),vec2f(1.,1.),vec2f(-1.,1.)); let c=cs[vi];
  let ang=(r2-.5)*.45+.07*sin(t*.9+r1*50.)+fig*.25*sin(t*.6+r2*30.); let ca=cos(ang); let sa=sin(ang);
  let off=vec2f(c.x*ca-c.y*sa, c.x*sa+c.y*ca)*size*.5/.78;
  o.pos=vec4f((vx+off.x)/(th*G.up.w), (vy+off.y)/th, .5*vz, vz)*vec4f(1.,1.,1.,1.);
  o.pos=vec4f(o.pos.x, o.pos.y, .5*vz, vz);
  if(portraitParticles && flip>0. && t>46.){
    let head=vec3f(G.fig.x,2.98*G.fig.z,G.fig.y-.13*G.fig.z)-G.cam.xyz;
    let depth=dot(head,G.fwd.xyz);
    let centre=vec2f(dot(head,G.right.xyz),dot(head,G.up.xyz));
    o.face=((vec2f(vx,vy)+off)*depth/vz-centre)/(vec2f(.45,.62)*G.fig.z);
  }
  o.uv=vec2f(c.x*.5+.5, .5-c.y*.5*flip); o.bias=log2(1.+blur);
  // which real glyph: by family, and by how far downstream (later in time)
  let k=tribOf(ii); let zf=mix(clamp(p.pos.z/206.,0.,1.),1.,fig); var gid=0u;
  if(k==2u){ let ch=u32(rf(ii*3u+1u)*f32(L[9])); let st=u32(clamp(zf*7.3+(rf(ii*13u+4u)-.5)*1.5,0.,6.)); gid=L[L[8]+ch*7u+st]; }
  else { var s=k; if(k>2u){ s=k-1u; } let cnt=f32(L[s*2u+1u]); var u=rf(ii*17u+9u); if(k==3u){ u=clamp(zf*.8+u*.42-.12,0.,.999); } gid=L[L[s*2u]+u32(u*cnt)]; }
  o.cell=vec2f(f32(gid%32u), f32(gid/32u)); if(isObj>.5){ let oi=objOf(k,rf(ii*41u+3u)); o.cell=vec2f(oi%4.,floor(oi/4.)); o.obj=1.; }
  let gold=p.ex.z;
  let far=1.-smoothstep(G.pr.y*1.6,G.pr.y*5.5,vz);
  o.ink=a*(1.-smoothstep(.5,.82,night))*(1.-fig)*.93*far;
  let nearGlyph=step(rf(ii*43u+17u),.045);
  let silver=vec3f(.72,.76,.86)*smoothstep(.62,.95,night)*(.042+.22*nearGlyph)*(.5+1.*r2)*far*step(rf(ii*43u+17u),.22);
  var li=mix(silver, vec3f(1.,.82,.57)*p.ex.y*G.m1.w, gold)*a; if(flip<0.){ li*=.22*exp(-wp.y*-.012); }
  o.light=li; return o; }
fn inkAt(i:VO)->f32{ let g=textureSampleBias(atlas,samp,(i.cell+i.uv)/32.,i.bias).r; let ob=textureSampleBias(objT,samp,(i.cell+i.uv)/4.,i.bias).a; return mix(g,ob,i.obj); }
@fragment fn fsInk(i:VO)->@location(0) vec4f{ return vec4f(vec3f(inkAt(i)*i.ink),1.); }
@fragment fn fsLight(i:VO)->@location(0) vec4f{ var light=i.light;
  if(portraitParticles){
    let boundary=smoothstep(.72,1.24,length(i.face));
    light*=mix(1.,.012+.988*boundary,smoothstep(47.,51.5,G.cam.w));
  }
  return vec4f(light*inkAt(i),1.); }
`;

// the small figure on the bank, seen from behind: a robe, a head, a topknot. Drawn last, over the river (G.heads[3] = where he stands, .w = how present)
export const OVER_FS = `
@group(0)@binding(0) var<uniform> G:GU;
fn sgm(p:vec2f,a:vec2f,b:vec2f,r:f32)->f32{ let pa=p-a; let ba=b-a; let h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{ let P0=G.heads[3].xyz; let pres=G.heads[3].w; if(pres<=0.){ discard; }
  let ndc=vec2f(fc.x/G.m2.x*2.-1., 1.-fc.y/G.m2.y*2.); let th=G.right.w; let rd=normalize(G.fwd.xyz+G.right.xyz*ndc.x*th*G.up.w+G.up.xyz*ndc.y*th); let ro=G.cam.xyz;
  let nrm=normalize(vec3f(G.fwd.x,0.,G.fwd.z)); let den=dot(rd,nrm); if(den<1e-4){ discard; } let tt=dot(P0-ro,nrm)/den; if(tt<=0.){ discard; } let hp=ro+rd*tt-P0;
  let v=vec2f(dot(hp,normalize(vec3f(nrm.z,0.,-nrm.x))), hp.y);                                    // across, up; he is 1.9 tall
  var d=sgm(v,vec2f(0.,.05),vec2f(0.,1.25),.30-.11*clamp(v.y/1.3,0.,1.)); d=min(d,length(v-vec2f(0.,1.62))-.135); d=min(d,length(v-vec2f(0.,1.80))-.055);
  d=min(d,sgm(v,vec2f(-.30,1.30),vec2f(-.36,.62),.085)); d=min(d,sgm(v,vec2f(.30,1.30),vec2f(.36,.62),.085)); d=max(d,-v.y);
  let a=smoothstep(.02,-.02,d)*pres; if(a<=0.){ discard; } let rim=smoothstep(-.05,.0,d)*smoothstep(-.1,.3,v.x);
  return vec4f(vec3f(.0035,.0037,.0045)+vec3f(.035,.037,.044)*rim*G.fwd.w, a); }
`;
