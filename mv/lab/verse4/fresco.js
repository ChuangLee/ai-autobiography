// 西斯廷天顶的湿壁画：两只手的指尖将触未触。左边是人的手，有力，食指伸直；右边是金色的字聚成的手，松垂，等着被造。
// 手是在画面平面里的圆截面体（每节手指一段锥形胶囊，各有前后），所以有雕塑的体积和真正的遮挡；上色按米开朗基罗的湿壁画：
// 暖的肉色、绿土的半调、阴影里一道道排线、褐色的轮廓线；衣袖是“闪色”（亮处粉白，暗处紫）；底子是石灰的灰白与赭绿的地。
// 墙面有龟裂、剥落、日作的接缝；画框是画出来的石质檐口。最后裂缝张开，碎片退入黑暗。
// p0 = cam.x, cam.y, zoom, light (0 dark … 1 lit)   p1 = reach (the human arm comes in), ignite (life goes into the gold hand), open (the cracks open), spark
// p2 = metal (1 the gold hand is still bronze … 0 it is characters)
export const FRESCO = /* wgsl */`
// the human hand and forearm, seen from the back: a, b of each part (xy, xy); radius at a, radius at b, height, kind
// kinds: 0 forearm, 1 forearm muscle, 2 wrist, 3 back of the hand, 4 5 6 the three bones of a finger, 7 8 thumb, 9 knuckle or finger joint, 10 tendon, 11 wrist bone, 12 metacarpal
const HA=array<vec4f,37>(vec4f(-.80,-.12,-.24,.038),vec4f(-.70,-.055,-.46,.012),vec4f(-.74,-.035,-.52,.018),vec4f(-.76,-.135,-.44,-.048),
  vec4f(-.25,.034,-.205,.048),vec4f(-.236,.014,-.235,.014),
  vec4f(-.205,.046,-.13,.052),vec4f(-.205,.062,-.116,.081),vec4f(-.205,.050,-.118,.061),vec4f(-.203,.038,-.124,.041),vec4f(-.200,.027,-.131,.022),
  vec4f(-.114,.081,-.113,.081),vec4f(-.117,.061,-.116,.061),vec4f(-.123,.041,-.122,.041),vec4f(-.131,.022,-.130,.022),
  vec4f(-.200,.058,-.122,.079),vec4f(-.200,.049,-.124,.060),vec4f(-.198,.040,-.128,.041),vec4f(-.196,.031,-.135,.023),
  vec4f(-.112,.081,-.074,.077),vec4f(-.074,.077,-.048,.073),vec4f(-.048,.073,-.028,.0705),
  vec4f(-.114,.061,-.075,.055),vec4f(-.075,.055,-.052,.044),vec4f(-.052,.044,-.040,.031),
  vec4f(-.120,.041,-.085,.032),vec4f(-.085,.032,-.068,.018),vec4f(-.068,.018,-.062,.004),
  vec4f(-.128,.022,-.100,.012),vec4f(-.100,.012,-.088,-.001),vec4f(-.088,-.001,-.086,-.012),
  vec4f(-.074,.077,-.0735,.077),vec4f(-.048,.073,-.0475,.073),vec4f(-.075,.055,-.0745,.055),
  vec4f(-.195,.025,-.160,.008),vec4f(-.160,.008,-.133,.000),vec4f(-.133,.000,-.113,.002));
const HB=array<vec4f,37>(vec4f(.080,.036,0.,0.),vec4f(.060,.038,.012,1.),vec4f(.050,.032,.008,1.),vec4f(.055,.034,.004,1.),
  vec4f(.036,.039,.004,2.),vec4f(.011,.011,.026,11.),
  vec4f(.033,.031,.006,3.),vec4f(.016,.0145,.010,12.),vec4f(.017,.0155,.013,12.),vec4f(.016,.015,.011,12.),vec4f(.015,.0135,.007,12.),
  vec4f(.0155,.0155,.016,9.),vec4f(.016,.016,.019,9.),vec4f(.015,.015,.016,9.),vec4f(.013,.013,.011,9.),
  vec4f(.0038,.0034,.021,10.),vec4f(.004,.0036,.024,10.),vec4f(.0036,.0032,.021,10.),vec4f(.0034,.003,.016,10.),
  vec4f(.0128,.0115,.016,4.),vec4f(.0113,.0102,.016,5.),vec4f(.0100,.0088,.016,6.),
  vec4f(.0132,.0118,.012,4.),vec4f(.0116,.0104,.012,5.),vec4f(.0102,.0090,.012,6.),
  vec4f(.0125,.0110,.008,4.),vec4f(.0110,.0098,.008,5.),vec4f(.0096,.0085,.008,6.),
  vec4f(.0110,.0098,.004,4.),vec4f(.0096,.0087,.004,5.),vec4f(.0085,.0076,.004,6.),
  vec4f(.0122,.0122,.0165,9.),vec4f(.0108,.0108,.0165,9.),vec4f(.0125,.0125,.0125,9.),
  vec4f(.019,.015,.0,7.),vec4f(.0135,.012,-.002,7.),vec4f(.0115,.0095,-.002,8.));
const GA=array<vec4f,22>(vec4f(.98,-.15,.265,-.004),vec4f(.90,-.10,.42,-.03),vec4f(.272,-.004,.212,.013),
  vec4f(.214,.016,.131,.032),vec4f(.212,.002,.135,.010),vec4f(.205,-.008,.140,-.010),
  vec4f(.129,.043,.091,.052),vec4f(.091,.052,.065,.055),vec4f(.065,.055,.043,.052),
  vec4f(.127,.025,.091,.022),vec4f(.091,.022,.073,.008),vec4f(.073,.008,.067,-.008),
  vec4f(.131,.008,.101,.000),vec4f(.101,.000,.089,-.016),vec4f(.089,-.016,.089,-.030),
  vec4f(.138,-.007,.113,-.015),vec4f(.113,-.015,.104,-.027),vec4f(.104,-.027,.105,-.038),
  vec4f(.192,-.006,.166,-.026),vec4f(.166,-.026,.147,-.031),vec4f(.130,.040,.129,.040),vec4f(.128,.023,.127,.023));
const GB=array<vec4f,22>(vec4f(.076,.039,0.,0.),vec4f(.07,.044,.008,1.),vec4f(.040,.042,.004,2.),
  vec4f(.034,.029,.012,3.),vec4f(.033,.028,.008,3.),vec4f(.030,.025,.004,3.),
  vec4f(.0125,.0112,.016,4.),vec4f(.0112,.0098,.016,5.),vec4f(.0098,.0084,.016,6.),
  vec4f(.0125,.0112,.010,4.),vec4f(.0112,.0100,.011,5.),vec4f(.0100,.0088,.012,6.),
  vec4f(.0118,.0105,.005,4.),vec4f(.0105,.0094,.006,5.),vec4f(.0094,.0084,.007,6.),
  vec4f(.0104,.0092,.000,4.),vec4f(.0092,.0082,.001,5.),vec4f(.0082,.0074,.002,6.),
  vec4f(.0180,.0140,-.006,7.),vec4f(.0136,.0112,-.005,8.),vec4f(.0135,.0135,.017,9.),vec4f(.013,.013,.015,9.));
struct Hit{ z:f32, al:f32, ac:f32, id:f32, len:f32, r:f32, kind:f32 }
fn hgt(k:f32)->f32{ return select(select(select(.9,.55,k==3.),.72,k==12.),1.,k==10.); }
fn blendK(k:f32)->f32{ return select(select(.006,.016,k<3.),.003,k==10.); }
fn acc1(p:vec2f,A:vec4f,B:vec4f,i:i32,H:ptr<function,Hit>,zs:ptr<function,f32>){ let a=A.xy; let b=A.zw; let pa=p-a; let ba=b-a; let L2=max(dot(ba,ba),1e-8); let h=sat(dot(pa,ba)/L2); let r=mix(B.x,B.y,h); let q=pa-ba*h; let d=length(q);
  if(d<r){ let z=B.z+sqrt(r*r-d*d)*hgt(B.w); if(z>(*H).z){ (*H).z=z; (*H).al=h; (*H).ac=sign(q.x*ba.y-q.y*ba.x)*d/r; (*H).id=f32(i); (*H).len=sqrt(L2); (*H).r=r; (*H).kind=B.w; }
    *zs=select(z,smax(*zs,z,blendK(B.w)),*zs>-.5); } }
// one hand: the smooth upper surface over all its parts, and the part that is on top (for hatching, creases, nails, glyph rows)
fn hand(p:vec2f,g:bool)->Hit{ var H:Hit; H.z=-1.; var zs=-1.;
  if(g){ for(var i=0;i<22;i++){ acc1(p,GA[i],GB[i],i,&H,&zs); } } else { for(var i=0;i<37;i++){ acc1(p,HA[i],HB[i],i,&H,&zs); } }
  H.z=zs; return H; }
fn handZ(p:vec2f,g:bool)->f32{ return hand(p,g).z; }
// the network of cracks in the plaster: distance to the nearest crack at two scales, and a cell id
fn vor(p:vec2f)->vec3f{ let i=floor(p); let f=fract(p); var d1=9.; var d2=9.; var id=vec2f(0.);
  for(var y=-1;y<=1;y++){ for(var x=-1;x<=1;x++){ let o=vec2f(f32(x),f32(y)); let s=o+.15+.7*hash22(i+o)-f; let d=dot(s,s); if(d<d1){ d2=d1; d1=d; id=i+o; } else if(d<d2){ d2=d; } } }
  return vec3f(sqrt(d2)-sqrt(d1),id); }
fn cracks(p:vec2f)->vec2f{ let w=vec2f(fbm(p*5.),fbm(p*5.+5.))*.5; let a=vor(p*6.+w).x/6.; let b=vor(p*17.+w*2.5+3.).x/17.;
  let amt=smoothstep(.42,.62,fbm(p*2.3+1.)); let fine=mix(1.,b,step(.5,vnoise(p*9.+2.))*amt);
  // two long cracks that run across the vault
  let l1=abs(p.y-.18-.12*p.x-.03*fbm(vec2f(p.x*6.,1.))-.012*sin(p.x*31.)); let l2=abs(p.x+.36-.25*p.y-.03*fbm(vec2f(p.y*6.,3.)));
  return vec2f(min(min(a,fine),min(l1,l2)*1.),amt); }
// sky, earth, drapery and the painted cornice: everything that is not a hand
fn ground(F:vec2f,e:f32)->vec3f{
  let mott=fbm(F*5.+3.)*.6+fbm(F*22.)*.4; let brush=vnoise(vec2f(F.x*40.+F.y*25.,F.y*8.-F.x*6.));
  var c=mix(hx(0xe7dcc4u),hx(0xbfc6bfu),sat(F.y*1.4+.15+.3*(mott-.5)));                       // lime white, cooling toward the top
  c=mix(c,hx(0xd8cdb2u),.35*smoothstep(.3,.7,brush)*smoothstep(.0,.3,F.y+.2));
  c=mix(c,hx(0xf2e9d6u),.55*exp(-dot(F-vec2f(.01,.06),F-vec2f(.01,.06))*14.));                  // the light gathers in the gap
  // the earth under the gold arm: olive green, warm where the light falls
  let gy=-.11-.32*(F.x-.15)+.025*sin(F.x*9.)+.02*(fbm(vec2f(F.x*4.,2.))-.5); let earth=smoothstep(gy+.008,gy-.008,F.y)*smoothstep(.0,.15,F.x);
  c=mix(c,mix(hx(0x6f7449u),mix(hx(0x9c9a62u),hx(0xc4b07au),smoothstep(.4,.8,mott)),sat(.6+(F.y-gy)*5.)),earth);
  c=mix(c,hx(0x575c3au),earth*smoothstep(-.02,-.25,F.y-gy)*.6);
  // the creator's mantle at the left: cangiante, rose-white in the light and violet in the folds, billowing behind the arm
  let sl=F-vec2f(-.80,-.04); let ang=atan2(sl.y,sl.x); let edge=.34+.05*sin(ang*4.+1.)+.03*fbm(vec2f(ang*3.,1.));
  let mant=smoothstep(.01,-.01,length(sl*vec2f(1.,1.15))-edge)*smoothstep(-.02,.02,-(sl.x-.28));
  let fl=sl.x*20.+sl.y*7.+2.2*fbm(sl*3.); let fold=sin(fl)*.5+.5; let fold2=sin(sl.x*-9.+sl.y*30.+1.5*fbm(sl*4.+2.))*.5+.5;
  let lit=sat(fold*.65+fold2*.3+.15*(sl.y+.1)*4.-.1);
  var mc=mix(hx(0x4b2c52u),hx(0xa8738au),smoothstep(.08,.5,lit)); mc=mix(mc,hx(0xecd2ccu),smoothstep(.55,.95,lit)); mc=mix(mc,hx(0x2e1a36u),.6*smoothstep(.22,.0,lit));
  c=mix(c,mc,mant); c=mix(c,hx(0x2e1838u),mant*ln(sin(fl)*.3,.04,.05)*.25);
  return c*(.95+.08*mott); }
fn fleshCol(n:vec3f,H:Hit,F:vec2f,e:f32,cav:f32)->vec3f{
  let L=normalize(vec3f(-.5,.78,.36)); let dif=dot(n,L); let w=sat(dif*.62+.36-cav*1.2);
  var c=mix(hx(0x4a2e1fu),hx(0x8e6748u),smoothstep(.08,.4,w)); c=mix(c,hx(0xd2a47cu),smoothstep(.36,.68,w)); c=mix(c,hx(0xf5dcb8u),smoothstep(.7,.97,w));
  c=mix(c,hx(0x8b8865u),.35*smoothstep(.2,.42,w)*smoothstep(.62,.42,w));                       // terra verde in the half tones
  c+=hx(0x6b3a24u)*.18*smoothstep(.3,.0,w)*sat(n.y*-2.+.2);                                     // warm light bounced into the shadow side
  // tratteggio: fine strokes across the form in the half-light and shadow
  let acr=H.al*H.len+.45*H.r*(1.-sqrt(max(1.-H.ac*H.ac,0.)))*sign(H.ac+1e-4); let ht=fract(acr*380.+.25*vnoise(F*90.))-.5; let hm=smoothstep(.52,.25,w)*step(.3,vnoise(F*140.+H.id));
  c*=1.-.32*hm*ln(ht/380.,.0005,e*.5+.0002);
  let ht2=fract((acr*.6+H.ac*H.r*.8)*420.)-.5; c*=1.-.25*smoothstep(.3,.12,w)*ln(ht2/420.,.0005,e*.5+.0002);
  // The pink on the knuckles goes on wet lime. Broken short strokes let
  // the green underpainting show through as the plane turns from the light.
  let chalk=vnoise(F*vec2f(360.,213.));
  let scumble=smoothstep(.53,.78,chalk)*smoothstep(.22,.55,w)*(1.-smoothstep(.69,.89,w));
  c=mix(c,hx(0xc8bd98u),scumble*.105);
  if(H.kind==9.){ c=mix(c,c*vec3f(1.09,.91,.86),.51); }
  if(H.kind==10.){c=mix(c,hx(0xb2ac8bu),.11*smoothstep(.21,.68,abs(H.ac)));}
  // the creases at the joints and the nail of each finger
  if(H.kind>=4.&&H.kind<=6.){ let jd=H.al*H.len; c*=1.-.45*ln(jd-.0018,.0006,e)*step(abs(H.ac),.8)*step(H.kind,5.5)*step(4.5,H.kind)
      *1.-.0; if(H.kind>5.5){ let nl=length(vec2f((1.-H.al)*H.len*1.4-.006,H.ac*H.r-H.r*.25)); c=mix(c,mix(c,hx(0xf2dccau),.45),smoothstep(.0055,.0045,nl)); c*=1.-.4*ln(nl-.005,.0005,e); } }
  return c; }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let zoom=U.p[0].z; let Pf=frame(fc.xy); var F=U.p[0].xy+rot(-U.p[2].y)*Pf/zoom; let e=px()/zoom*1.2; let t=U.t;
  let reach=U.p[1].x; let ignite=U.p[1].y; let open=U.p[1].z; let spark=U.p[1].w; let metal=U.p[2].x; let light=U.p[0].w;
  // ── the cracks open: every piece of plaster shrinks toward its own centre and goes dark, from the fingertips outward
  var cover=1.; var dark=0.; var rimF=0.; let G=vec2f(.01,.06);
  if(open>.001){ let wq=vec2f(fbm(F*5.),fbm(F*5.+5.))*.5; let v=vor(F*17.+wq*2.5+3.); let bg=vor(F*6.+wq);
    let dl=length(F-G)*.9+.35*hash21(v.yz+.7)+.12*hash21(bg.yz);
    let o=sat((open*2.-dl)/.5); let thr=o*.85;                                       // the chip's edge lifts and retreats toward its middle
    let remain=mix(1.,smoothstep(thr,thr+.05,v.x),step(.002,o))*step(o,.97); cover=remain;
    rimF=o*remain*(1.-smoothstep(thr+.02,thr+.16,v.x));                              // the curled lip catches the light
    dark=o*.6+.3*o*smoothstep(thr+.3,thr+.08,v.x); }
  // ── the hands. The human's arm slides in along its own length.
  let off=(1.-reach)*vec2f(-.2,-.04); var col=ground(F,e); var a=1.;
  var nH=vec3f(0.,0.,1.); var inH=0.; var inG=0.; var Hh:Hit; var Hg:Hit;
  let ph=F-off; if(ph.x<-.0&&ph.x>-.8&&ph.y>-.2&&ph.y<.16){ Hh=hand(ph,false); if(Hh.z>-.5){ inH=1.; let ex=vec2f(.0012,0.); nH=normalize(vec3f(-(handZ(ph+ex.xy,false)-Hh.z)/.0012,-(handZ(ph+ex.yx,false)-Hh.z)/.0012,1.)); } }
  if(F.x>.0&&F.y>-.22&&F.y<.12){ Hg=hand(F,true); if(Hg.z>-.5){ inG=1.; } }
  // the giornata: the day's patch of plaster laid round the human hand, a seam a little way out from it
  { let gz=handZ(ph*vec2f(.93,.9)+vec2f(-.006,.004),false); let sm2=step(-.5,gz)*(1.-inH); col*=1.-.06*sm2; }
  if(inH>.5){ var cav=0.; for(var k=0;k<4;k++){ let o=.0055*vec2f(cos(f32(k)*1.571+.4),sin(f32(k)*1.571+.4)); cav+=max(handZ(ph+o,false)-Hh.z,0.); } cav=sat(cav*28.);
    let fcol=fleshCol(nH,Hh,ph,e,cav); let edge=smoothstep(.0,.004,Hh.z-HB[i32(Hh.id)].z*0.)*0.+smoothstep(.12,.32,nH.z);
    col=mix(hx(0x4a2a18u),fcol,mix(.25,1.,edge)); }
  // ── the gold hand: bronze at first; then its surface is characters, row on row along each finger, and they light from the fingertip in
  if(inG>.5){ let ex=vec2f(.0012,0.); let n=normalize(vec3f(-(handZ(F+ex.xy,true)-Hg.z)/.0012,-(handZ(F+ex.yx,true)-Hg.z)/.0012,1.));
    let L=normalize(vec3f(-.55,.62,.56)); let dif=sat(dot(n,L)); let rim=smoothstep(.35,.1,n.z);
    let hv=normalize(L+vec3f(0.,0.,1.)); let spec=pow(sat(dot(n,hv)),40.);
    let bronze=hx(0x2a1a0cu)*.6+hx(0xc8913eu)*dif*.9+hx(0xffe2a8u)*spec*1.4;
    let gs=mix(.0095,.014,smoothstep(.2,.4,F.x)); let ar=rot(.2)*(F-vec2f(.04,.05)); let gp=ar/gs+vec2f(-t*.6*ignite,0.);
    let gl=glyphField(gp,1.,gs*zoom*U.res.y)*(.8+.2*n.z);
    let tipd=length(F-vec2f(.036,.053)); let lit=sat(ignite*2.6-tipd*7.);
    let gold=hx(0x5a3a10u)*(.35+.75*dif)+hx(0xffc95au)*gl*(.7+1.2*dif+.6*rim)*(.7+1.8*lit);
    col=mix(gold,bronze,metal); col=mix(col,col*.55,smoothstep(.12,.0,n.z)); }
  // ── plaster: the cracks, their lit lips, a few losses where the intonaco shows
  let cr=cracks(F); let lip=cracks(F+vec2f(.0009,-.0009)); let cw=.00045+.0005*cr.y;
  col*=1.-(.22+.3*cr.y)*ln(cr.x,cw,e*.8+.0002); col+=hx(0x1a140cu)*.0+.035*ln(lip.x,cw,e)*(1.-ln(cr.x,cw,e));
  col*=1.-.05*smoothstep(.006,.0,cr.x)*cr.y;
  let loss=smoothstep(.7,.74,fbm(F*13.+9.))*smoothstep(.2,.6,vnoise(F*4.)); col=mix(col,hx(0xd8d2c4u)*(.9+.1*vnoise(F*300.)),loss*.85*(1.-inG*.7));
  col*=.97+.06*vnoise(F*420.);
  // ── the gold point at the fingertip, where the two nearly meet
  let sp=length(F-vec2f(.033,.054)); col+=hx(0xffc860u)*spark*(exp(-sp*sp*zoom*zoom*9000.)*6.+exp(-sp*zoom*40.)*.5);
  // ── the chapel's light comes up from the gold outward; the pieces that come away go dark
  let lp=length(F-vec2f(.16,.02))*zoom; let lt=sat(light*1.6-lp*.5); col*=mix(.03,1.,lt*lt)+(1.-lt)*inG*1.2*(1.-metal*.4);
  col*=1.-dark*.85; col=mix(col,hx(0xe8e0cfu),rimF*.8);
  a=cover*sat(light*4.-lp*1.5+inG*light*4.);
  return vec4f(lin3(col),a*U.w); }
`;
