// 《天工开物》木刻插图 → 达芬奇手稿。同一张图：水车的轮成了齿轮，翻车的槽成了螺旋提水器，山的皴线成了扑翼的骨架，匀黑的刻线成了有轻重的褐色笔线。
// p0 = cam.x, cam.y, zoom, leo(0 woodcut … 1 notebook)   p1 = qinglü tint, stand, hat, coat fill   p2 = wheel angle, man.x, man.y, man scale
export const DRAFT = /* wgsl */`
fn riverC(x:f32)->f32{ return -.215+.03*sin(2.*x+.5)+.05*x; }
fn wheel(p:vec2f,c:vec2f,R:f32,ang:f32,leo:f32,teeth:f32,w:f32,e:f32)->f32{ let q=p-c; let r=length(q); if(r>R*1.5){ return 0.; } let th=atan2(q.y,q.x)+ang;
  let sn=sin(th*teeth)*3.; let tooth=clamp(sn,-1.,1.)*.05*R*leo; let gr=sqrt(1.+pow(step(abs(sn),1.)*cos(th*teeth)*teeth*3.*.05*R*leo/max(r,1e-4),2.)); var k=ln((r-R-tooth)/gr,w*mix(1.,.9,leo),e)+ln(r-.86*R,w*.8,e)*mix(1.,.6,leo);
  let n=12.; let ci=floor(th/TAU*n+.5); let a=(th/TAU*n-ci)*TAU/n; let odd=abs(ci%2.);
  k+=ln(a*r,w*.8,e)*step(.13*R,r)*step(r,.86*R)*mix(1.,1.-odd,leo);
  k+=ln(r-.13*R,w,e)+ln(r-.045*R,w*.7,e);
  let tb=rot(.55)*vec2f(a*r,r-.93*R); k+=ln(sdBox(tb,vec2f(.085*R,.028*R)),w*.7,e)*(1.-leo);
  // A paddle is hollow: its lip and inner shade follow it through the water.
  let bowl=rot(.55)*vec2f(a*r,r-.93*R);
  let lip=ln(sdBox(bowl-vec2f(0.,.018*R),vec2f(.064,.013)*R),w*.52,e);
  let peg=ln(length(vec2f(a*r,r-.78*R))-.019*R,w*.58,e);
  let grain=ln((r/R-.93+.012*sin(th*22.))*R,w*.47,e)*smoothstep(.45,.78,vnoise(q*54.));
  k+=(lip+peg+.7*grain)*(1.-leo);
  return min(k,1.); }
fn spiral(p:vec2f,c:vec2f,R:f32,t:f32,w:f32,e:f32)->f32{ let q=p-c; let r=length(q); if(r>R){ return 0.; } let th=atan2(q.y,q.x);
  let s=fract(log(r/R)*1.6-th/TAU+t*.25)-.5; return ln(s*r*1.9,w,e)*smoothstep(R,R*.75,r)*smoothstep(.004,.012,r); }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let zoom=U.p[0].z; let leo=U.p[0].w; let P0=U.p[0].xy+frame(fc.xy)/zoom; let e=px()/zoom*1.2; let t=U.t;
  // the cutter's hand and the pen's: the line wanders a little, more for the pen
  let P=P0+(vec2f(vnoise(P0*38.),vnoise(P0*38.+7.3))-.5)*mix(.0022,.0035,leo);
  let w=mix(.0026,.0017,leo); var ink=0.; var red=0.; let ang=U.p[2].x;
  // ── river: banks and the lines of the water
  let yc=riverC(P.x); let hw=.105+.02*sin(P.x*2.3+1.); let s=(P.y-yc)/hw;
  ink+=ln(abs(s)-1.,w*1.3/hw,e/hw);
  let wl=fract(s*5.+.5+.13*sin(P.x*34.-t*2.6+s*5.))-.5; let gap=smoothstep(.34,.5,vnoise(vec2f(P.x*9.-t*.7,s*4.)));
  ink+=ln(wl*hw/5.,w*.75,e)*step(abs(s),.97)*gap*mix(1.,.55,leo);
  let tuft=fract(P.x*46.+vnoise(vec2f(P.x*46.,3.)))-.5; ink+=ln(tuft/46.,w*.6,e)*smoothstep(1.,1.02,abs(s))*smoothstep(1.2,1.06,abs(s))*step(.5,hash21(vec2f(floor(P.x*15.),sign(s))))*(1.-.6*leo);
  // eddies where the water leaves the machines (the notebook's water studies)
  if(leo>.01){ ink+=leo*(spiral(P,vec2f(.47,-.2),.085,t,w*.7,e)+spiral(P,vec2f(-.04,-.235),.07,-t,w*.7,e)+spiral(P,vec2f(-.5,-.22),.06,t,w*.7,e)); }
  // ── three wheels in a row down the river, each on its trestle
  let C1=vec2f(.2,.0); let C2=vec2f(-.33,-.03); let C3=vec2f(-.7,-.05); var body=0.;
  for(var i=0;i<3;i++){ let c=select(select(C3,C2,i==1),C1,i==0); let R=select(select(.12,.17,i==1),.24,i==0);
    let q=vec2f(abs(P.x-c.x),P.y-c.y); let post=sdSeg(q,vec2f(0.,0.),vec2f(.55*R,-1.12*R)); let r=length(P-c);
    ink+=(ln(post-.012*R-.004,w,e)*step(.13*R,r)+ln(sdSeg(q,vec2f(.3*R,-.62*R),vec2f(0.,-.62*R)),w,e)*step(R*.0,q.x))*step(P.y,c.y)*.9*step(riverC(P.x)-hw*.2,P.y);
    ink+=wheel(P,c,R,ang*(.24/R)*select(1.,-1.,i==1),leo,select(18.,24.,i==0),w,e);
    body=max(body,step(r,.86*R)*step(.13*R,r)*smoothstep(-.3,.9,dot(normalize(P-c+1e-5),vec2f(.6,-.8)))); }
  // the pinion that the big gear drives
  if(leo>.01){ let c4=C1+.335*vec2f(cos(.5),sin(.5)); ink+=leo*wheel(P,c4,.08,-ang*3.+.2,1.,8.,w,e); body=max(body,step(length(P-c4),.07)*smoothstep(-.3,.9,dot(normalize(P-c4+1e-5),vec2f(.6,-.8)))); }
  // ── the pipe line on forked posts (连筒), woodcut only
  { let a=vec2f(.2,.262); let b=vec2f(-.95,.215); let pa=P-a; let ba=b-a; let h=sat(dot(pa,ba)/dot(ba,ba)); let d=length(pa-ba*h); let along=h*length(ba);
    var k=ln(d-.011,w,e)+ln(fract(along*9.)-.5,w*5.,e*9.)*step(d,.011);
    for(var i=0;i<3;i++){ let x=select(select(-.86,-.53,i==1),-.07,i==0); let top=mix(a.y,b.y,(a.x-x)/1.15)-.012; let q=vec2f(abs(P.x-x),P.y);
      k+=ln(sdSeg(q,vec2f(0.,top-.03),vec2f(0.,riverC(x)+.1)),w,e)+ln(sdSeg(q,vec2f(0.,top-.03),vec2f(.02,top+.012)),w,e); }
    ink+=min(k,1.)*(1.-leo); }
  // ── the chain pump (翻车) on the right; in the notebook the same trough is a water screw
  { let a=vec2f(.5,-.21); let b=vec2f(.9,.06); let ba=normalize(b-a); let q=vec2f(dot(P-a,ba),dot(P-a,vec2f(-ba.y,ba.x))); let L=length(b-a); let inside=step(0.,q.x)*step(q.x,L);
    var k=ln(abs(q.y)-.022,w,e)*inside+ln(sdSeg(q,vec2f(0.,-.022),vec2f(0.,.022)),w,e)+ln(sdSeg(q,vec2f(L,-.022),vec2f(L,.022)),w,e);
    let pd=fract(q.x*22.-t*1.4)-.5; k+=ln(pd/22.,w*.9,e)*step(abs(q.y),.02)*inside*(1.-leo);
    let hel=q.y-.02*sin(q.x*70.-t*5.); k+=ln(hel,w*.8,e)*inside*leo*step(abs(q.y),.022);
    k+=leo*(ln(sdSeg(q,vec2f(L,0.),vec2f(L+.035,0.)),w,e)+ln(sdSeg(q,vec2f(L+.035,0.),vec2f(L+.035,.04*cos(t*5.))),w,e));
    ink+=min(k,1.); body=max(body,inside*step(abs(q.y),.022)*smoothstep(.02,-.02,q.y)*.8); }
  // ── hills with their short texture strokes; rice in rows (woodcut)
  { var k=0.; for(var i=0;i<3;i++){ let fi=f32(i); let ry=.335+.055*fi+.045*sin(P.x*(3.-fi*.6)+fi*2.1)+.02*sin(P.x*8.3+fi*4.); let d=P.y-ry;
      k+=ln(d,w*1.1,e); let hs=fract(P.x*70.+d*40.+fi*.37)-.5; k+=ln(hs/70.,w*.6,e)*smoothstep(-.035,-.03,d)*step(d,-.004)*step(.45,vnoise(vec2f(P.x*14.+fi*9.,fi)))*step(.25,hash21(vec2f(floor(P.x*70.+d*40.+fi*.37),fi))); }
    let fq=vec2f(P.x-.62,P.y-.18); let fl=fract((fq.y-fq.x*.12)*30.)-.5; let inF=step(abs(fq.x-.04),.2)*step(abs(fq.y),.085)*step(.92,P.x*0.+1.);
    k+=inF*ln(fl/30.,w*.6,e)*step(.3,fract(P.x*52.+floor((fq.y-fq.x*.12)*30.)*.37));
    k+=ln(sdBox(fq-vec2f(.04,0.),vec2f(.2,.085)),w*.8,e);
    ink+=min(k,1.)*(1.-leo); }
  // ── the wing (notebook): ribs from one root, a scalloped edge, beating slowly
  if(leo>.01){ let root=vec2f(-.78,.3); let flap=.1*sin(t*3.2); var k=0.; var prev=root;
    for(var i=0;i<5;i++){ let a=.62-f32(i)*.2+flap*(1.-f32(i)*.12); let L=.56-f32(i)*.045; let tip=root+L*vec2f(cos(a),sin(a)); let mid=root+.5*L*vec2f(cos(a+.12),sin(a+.12));
      k+=ln(sdSeg(P,root,mid),w,e)+ln(sdSeg(P,mid,tip),w*.8,e);
      if(i>0){ let m=(prev+tip)*.5+normalize(root-(prev+tip)*.5)*.035; k+=ln(sdSeg(P,prev,m),w*.7,e)+ln(sdSeg(P,m,tip),w*.7,e); } prev=tip; }
    red+=min(k,1.)*leo; ink+=leo*ln(length(P-root)-.012,w,e); }
  // ── page furniture: the block's double border and title (woodcut); mirror-written notes (notebook)
  { let bd=sdBox(P,vec2f(.855,.468)); ink+=(ln(bd,w*2.2,e)+ln(bd+.012,w*.7,e))*(1.-leo);
    let q=(P-vec2f(.745,.2))/vec2f(.075,.24); let inC=step(0.,q.x)*step(q.x,1.)*step(0.,q.y)*step(q.y,1.);
    ink=mix(ink,0.,inC*(1.-leo)); ink+=(ln(sdBox(P-vec2f(.7825,.32),vec2f(.0375,.12)),w,e)+words(vec2f(q.x,1.-q.y)*vec2f(1.,1.)*1.0,vec4f(1024.,0.,128.,400.),.24*U.res.y*zoom))*(1.-leo);
    let q2=(P-vec2f(-.842,-.46))/vec2f(.06,.2); ink+=words(vec2f(q2.x,1.-q2.y),vec4f(1152.,0.,128.,400.),.2*U.res.y*zoom)*(1.-leo)*.0;
    if(leo>.01){ let n1=(P-vec2f(.5,.17))/vec2f(.36,.18); let n2=(P-vec2f(-.6,.02))/vec2f(.3,.15); let n3=(P-vec2f(-.2,-.47))/vec2f(.36,.18);
      ink+=leo*.85*(words(vec2f(n1.x,1.-n1.y),vec4f(0.,512.,768.,384.),.18*U.res.y*zoom)+words(vec2f(n2.x,1.-n2.y),vec4f(768.,512.,768.,384.),.15*U.res.y*zoom)*0.+words(vec2f(n3.x,1.-n3.y),vec4f(768.,512.,768.,384.),.18*U.res.y*zoom)); } }
  // ── the man at the pump. He straightens, and a hat comes down onto his head.
  let ms=U.p[2].w; var m=(P-U.p[2].yz)/ms; let stand=U.p[1].y; m.x+=(1.-stand)*.1*sat(m.y*1.6-.3); m.y/=mix(.9,1.,stand);
  let man=sdMan(m,0.,U.p[1].z); let md=man.w*ms; let cf=U.p[1].w;
  ink=mix(ink,0.,fill(md,e)); ink+=ln(md,w,e)+ln(man.z*ms,w,e)*step(.01,U.p[1].z);
  ink+=ln(sdSeg(m,vec2f(0.,.78),vec2f(.05,.36))*ms,w*.7,e)*fill(md,e)*(1.-cf)+ln(sdSeg(m,vec2f(-.1,.42),vec2f(.1,.44))*ms,w*.8,e)*fill(md,e)*(1.-cf);
  if(leo>.01){ ink+=leo*.6*(1.-cf)*(ln(m.x*ms,w*.4,e)*step(-.05,m.y)*step(m.y,1.08)+ln(sdSeg(vec2f(abs(m.x),fract(m.y*4.)-.5),vec2f(.2,0.),vec2f(.26,0.))*ms,w*.5,e)*step(0.,m.y)*step(m.y,1.)); }
  // ── notebook hatching: parallel strokes falling from upper left, in the shadows of the machines
  if(leo>.01){ let hq=(P.x+P.y)*120.; let hl=fract(hq)-.5; let hm=body*step(.25,vnoise(vec2f(floor(hq)*.37,(P.x-P.y)*6.)))*smoothstep(.2,.6,body+.3*vnoise(P*20.));
    ink+=leo*.55*ln(hl/120.,w*.55,e)*hm; }
  ink=sat(ink); red=sat(red);
  // ── paper and ink
  let pt=paperTex(P0); let breaks=mix(smoothstep(.12,.3,vnoise(P0*210.)+.25),mix(.55,1.,vnoise(P0*90.)),leo);
  var paper=mix(hx(0xefe5cdu),hx(0xd8c298u),leo)*(.93+.1*pt);
  paper*=1.-leo*(.10*smoothstep(.45,.8,fbm(P0*3.+4.))+.25*smoothstep(.35,.62,length(P0*vec2f(.56,1.))));
  paper=mix(paper,paper*hx(0xb89a6eu)*1.25,leo*.18*smoothstep(.6,.75,fbm(P0*7.)));
  // the blue-green of the picture before, leaving the paper
  let tint=U.p[1].x; if(tint>.001){ let hill=smoothstep(.3,.36,P.y); let wat=step(abs(s),1.);
    var tc=mix(hx(0xcdbf94u),mix(hx(0x2f8f7eu),hx(0x2a5fa0u),smoothstep(.36,.47,P.y+.03*sin(P.x*9.))),hill); tc=mix(tc,hx(0x7fb0a8u),wat); tc=mix(tc,hx(0x6f9a58u),(1.-wat)*(1.-hill)*.55);
    paper=mix(paper,tc*(.9+.2*pt),tint*.92); }
  let inkc=mix(hx(0x17130fu),hx(0x3b2110u),leo); var col=mix(paper,inkc,ink*breaks*mix(.95,.93,leo));
  // the water carries writing: faint gold characters between the lines of the river, going with the current
  if(abs(s)<.95){ let rk=s*5.+.5+.13*sin(P.x*34.-t*2.6+s*5.); let gs=hw/5.*.8; let gq=vec2f((P.x+t*.045)/gs,rk/(.8)); let gl=glyphField(gq,3.+floor(rk),gs*zoom*U.res.y);
    let gm=smoothstep(.35,.6,vnoise(vec2f(P.x*6.-t*.3,floor(rk)*1.7)))*(1.-ink); col=mix(col,mix(hx(0xb8862au),hx(0xe0b04au),leo),sat(gl*gm*.75)); }
  col=mix(col,hx(0xa3472fu)*(.8+.4*pt),red*.8*mix(.6,1.,vnoise(P0*160.)));
  // the coat fills in dark as he becomes the man in the bowler hat
  col=mix(col,hx(0x23252bu),cf*fill(min(man.x,man.z)*ms,e)); col=mix(col,hx(0xd9b396u),cf*fill(man.y*ms,e)*(1.-fill(man.z*ms,e))*0.+0.);
  return vec4f(lin3(col),U.w); }
`;
