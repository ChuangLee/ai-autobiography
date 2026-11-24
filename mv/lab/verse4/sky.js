// 马格利特：平匀的日光，晴空小云，海平线；无数个穿深色大衣、戴礼帽的人悬在空中，全都背对着我们。一个转过身来，脸的位置是一团金色的字。
// p0 = zoom, turn (0 back … 1 front), gather (the men close into a fan of arms), dusk (the day goes down to the museum's dark)   p1 = cam.y, ring
export const SKY = /* wgsl */`
const ARMS=array<f32,8>(-.38,.02,.42,.84,3.52,3.12,2.72,2.30);
fn manCol(m:vec2f,d:vec4f,front:f32,far:f32,e:f32,sizePx:f32)->vec4f{
  // smooth, impersonal modelling: one soft light from the left, no brushwork
  let lit=sat(.55-m.x*3.2); var coat=mix(hx(0x16181du),hx(0x3d424du),lit*lit); coat=mix(coat,hx(0x0c0d10u),smoothstep(-.02,0.,d.x)*.6);
  let seam=ln(m.x,.0022,e)*step(m.y,.76)*step(.27,m.y)*(1.-front); coat=mix(coat,hx(0x0b0c0fu),seam*.7);
  coat=mix(coat,mix(hx(0x1b1c20u),hx(0x34373eu),lit),step(m.y,.255));                                   // trousers
  coat=mix(coat,hx(0xcaa286u)*mix(.75,1.05,lit),fill(length(vec2f(abs(m.x)-.158,m.y-.335))-.024,e));   // hands
  // Wool bunches above the elbow, while the long back panels hang straight.
  let sleeve=abs(m.x)-(.125+.018*smoothstep(.39,.68,m.y));
  let fold=(.47+.53*sin(30.*m.y+18.*sleeve))*exp(-abs(sleeve)*72.)*smoothstep(.35,.46,m.y)*(1.-smoothstep(.65,.72,m.y));
  let kick=ln(abs(m.x)-(.008+.17*(.44-m.y)),.0024,e)*smoothstep(.258,.29,m.y)*(1.-smoothstep(.36,.47,m.y));
  coat*=1.-.22*fold-.22*kick*(1.-front);
  var col=coat; var a=fill(d.x,e);
  // front: collar, tie, lapels
  if(front>.5){ let v=abs(m.x)-(m.y-.60)*.42; let shirt=step(v,0.)*step(.60,m.y)*step(m.y,.80); col=mix(col,hx(0xe9e6dfu)*mix(.8,1.,lit),shirt);
    col=mix(col,hx(0x9c2a22u),shirt*step(abs(m.x),.012+.02*(m.y-.6)*0.+.006)); col=mix(col,hx(0x0b0c0fu),ln(v,.0025,e)*step(.5,m.y)*step(m.y,.8)*.8);
    col=mix(col,hx(0x0b0c0fu),fill(length(vec2f(m.x-.03,fract(m.y*9.)-.5)/vec2f(1.,9.))-.007,e)*step(.3,m.y)*step(m.y,.56)*.8); }
  // head: from behind, hair, ears and the neck; from the front it is handled by the caller (the gold)
  let hd=d.y; let hair=step(.845,m.y)+step(.022,abs(m.x))*step(.83,m.y)*0.; var hc=mix(hx(0xc79f84u)*mix(.72,1.05,lit),hx(0x2a211cu)*mix(.8,1.5,lit),sat(hair));
  hc=mix(hc,hx(0xc79f84u)*mix(.7,1.,lit),fill(length(vec2f(abs(m.x)-.058,m.y-.855)*vec2f(1.6,1.))-.014,e));
  col=mix(col,hc,fill(min(hd,length(vec2f(abs(m.x)-.058,m.y-.855)*vec2f(1.6,1.))-.014),e)*(1.-fill(d.x,e)*step(m.y,.77))); a=max(a,fill(hd,e));
  col=mix(col,hx(0xd8d4ccu),step(.765,m.y)*step(m.y,.782)*step(abs(m.x),.034)*(1.-front));              // a line of white collar above the coat
  // hat
  let hl=sat(.5-m.x*4.5); var hat=mix(hx(0x0d0e11u),hx(0x33363du),hl*hl); hat=mix(hat,hx(0x050506u),step(m.y,.936)*step(.918,m.y));
  let brim=ln(m.y-.919+.13*m.x,.002,e)*exp(-abs(m.x+.04)*14.);
  hat+=vec3f(.11,.10,.09)*brim;
  hc*=1.-.32*smoothstep(.883,.916,m.y);
  col=mix(col,hc,fill(hd,e)*smoothstep(.878,.916,m.y));
  col=mix(col,hat,fill(d.z,e)); a=max(a,fill(d.z,e));
  return vec4f(col,a); }
fn cloud(p:vec2f)->vec2f{ // (density, height inside the cloud)
  let g=vec2f(.62,.34); var q=p/g; let row=floor(q.y); q.x+=row*.37; let id=floor(q); let f=(fract(q)-.5)*g; let h=hash22(id+3.1); if(h.x<.28){ return vec2f(0.); }
  let c=f-(h-.5)*vec2f(.2,.1); var den=0.; let sz=.6+.5*h.y;
  for(var i=0;i<5;i++){ let fi=f32(i); let o=vec2f((fi-2.)*.05,.016*sin(fi*2.3+h.x*20.)+.02*(1.-abs(fi-2.)*.5))*sz; let r=(.045-.008*abs(fi-2.)+.012*hash21(id+fi))*sz; den=max(den,1.-length((c-o)*vec2f(1.,1.25))/r); }
  den*=smoothstep(-.012*sz,.004*sz,c.y+.012*sz);                                                          // the flat base
  return vec2f(den,(c.y+.02*sz)/(.07*sz)); }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let zoom=U.p[0].x; let turn=U.p[0].y; let gather=U.p[0].z; let dusk=U.p[0].w; let P=vec2f(0.,U.p[1].x)+frame(fc.xy)/zoom; let e=px()/zoom*1.2; let t=U.t;
  // sky, even and clean; sea under a pale horizon
  let hz=-.62; var col=mix(hx(0xbcd8ecu),hx(0x3f80c8u),pow(sat((P.y-hz)/1.5),.75));
  for(var k=0;k<2;k++){ let sc=select(1.,.55,k==1); let cl=cloud((P-vec2f(t*.006*sc+f32(k)*.31,f32(k)*.17+hz*0.))/sc+vec2f(0.,.12)); let den=smoothstep(0.,.22,cl.x)*step(hz+.05,P.y);
    let cc=mix(hx(0x9fb4c8u),hx(0xfbfaf5u),smoothstep(.0,.75,cl.y+cl.x*.6)); col=mix(col,mix(cc,col,f32(k)*.25),den); }
  let sea=mix(hx(0x7fa9c0u),hx(0x1f4a63u),pow(sat((hz-P.y)/.35),.6))+.035*sin(P.y*900./ (1.+40.*(hz-P.y))+P.x*6.)*step(P.y,hz); col=mix(col,sea,fill(P.y-hz,e));
  col=mix(col,hx(0xdbe9f0u),.5*exp(-abs(P.y-hz)*60.));
  // the men: three depths of the same lattice, far to near. All have their backs to us.
  let fade=1.-smoothstep(.15,.75,gather);
  for(var k=2;k>=0;k--){ let S=.8*pow(.58,f32(k)); var m=(P-vec2f(f32(k)*.37,-.42+f32(k)*.29))/S; let row=floor((m.y+.27)/1.56); m.y-=row*1.56; m.x+=abs(row%2.)*.44; let colI=floor(m.x/.88+.5); m.x-=colI*.88;
    let hero=(k==0)&&(row==0.)&&(colI==0.); if(hero){ continue; }
    // while they gather, the lattice men fall back into the air
    let d=sdMan(m,0.,1.); if(d.w*S>.02){ continue; } let mc=manCol(m,d,0.,f32(k),e/S,0.); let air=f32(k)*.2; col=mix(col,mix(mc.rgb,col,air),mc.a*fade*U.p[1].z); }
  // eight of them come to stand round him like the spokes of a fan
  let sc0=vec2f(0.,-.42+.56); 
  if(gather>.001){ for(var i=0;i<8;i++){ let fi=f32(i); let a=ARMS[i]; let side=select(-1.,1.,i<4); let home=vec2f(side*(.88*.8*(1.+floor(fi%4./2.))),-.42+(fi%2.)*1.248*0.); let gi=smoothstep(0.,1.,sat(gather*1.5-.06*fi));
      let dir=vec2f(cos(a),sin(a)); let pos=mix(home+vec2f(0.,.4),sc0+dir*.05,gi); let ang=mix(0.,a-PI*.5,gi); let S=mix(.8,.27,gi);
      var m=(rot(-ang)*(P-pos))/S; m.y+=.5*(1.-gi); let d=sdMan(m,0.,1.); if(d.w*S<.02){ let mc=manCol(m,d,0.,0.,e/S,0.); col=mix(col,mc.rgb,mc.a*smoothstep(0.,.2,gather)); } } }
  // the one who turns
  { let m=(P-vec2f(0.,-.42))/.8; let tw=abs(cos(turn*PI)); let front=step(.5,turn); let d=sdMan(m,1.-tw,1.);
    if(d.w<.08){ let mc=manCol(vec2f(m.x/mix(.6,1.,tw),m.y),d,front,0.,e/.8,0.); col=mix(col,mc.rgb,mc.a);
      // where the face should be: gold characters, a mass of them
      if(front>.5){ let fcn=m-vec2f(0.,.86); let r=length(fcn*vec2f(1.1,1.)); let show=smoothstep(.5,.85,turn);
        col=mix(col,hx(0x1a1206u),fill(d.y,e/.8)*step(m.y,.92)*show);
        var gold=0.; for(var j=0;j<3;j++){ let fj=f32(j); let n=mix(26.,70.,fj*.5); let gp=(fcn+vec2f(fj*.013,fj*.007)+.004*vec2f(sin(t*.7+fj),cos(t*.6+fj*2.)))*n; let cell=floor(gp);
            let keep=step(length((cell+.5)/n*vec2f(1.,.85)),.1-.025*hash21(cell+fj*7.))*step(hash21(cell+fj*3.3),.86); gold=max(gold,glyphField(gp,fj+floor(t*.0),.8*zoom*U.res.y/n)*keep*(1.-.25*fj)); }
        let hatMask=1.-fill(d.z,e/.8); col=mix(col,hx(0xffc94au)*2.3,sat(gold*1.3)*show*hatMask); } } }
  // the day goes down; everything takes the colour of bronze
  let br=dot(col,vec3f(.3,.5,.2)); col=mix(col,mix(hx(0x0b0806u),hx(0xb07a34u),sat(br*1.4))*mix(1.,.35,dusk),sat(dusk*1.15));
  // the ring that will be the ring of flames
  let ring=U.p[1].y; if(ring>.001){ let rr=length(P-vec2f(0.,-.017))-.40; col=mix(col,hx(0xd9a04au),ring*ln(rr,.012,e)*.9); }
  let rv=sat(U.w*2.6-length(frame(fc.xy)-vec2f(0.,-.05))*1.6);
  return vec4f(lin3(col),rv); }
`;
