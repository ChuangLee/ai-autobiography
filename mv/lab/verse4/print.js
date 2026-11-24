// 沃霍尔的丝网版画：定格的形体分成四格并排，各一种刺眼的平涂色；黑版是网点照片，套色不准；刮板拉出的墨有条纹、有缺墨的白点。
// 每格下面印着旧名字：人、神、鬼、器。一方朱印（小篆白文“我”）盖下来，印泥却化开了，四个字顺着水流走，朱红淌下去。
// p0 = split (the frozen form divides into four), ink (the colours are pulled across), seal (it comes down), run (the paste runs)
// p1 = wash (the water carries it all down), time, appear, unused
export const PRINT = /* wgsl */`
const BG=array<u32,4>(0xff6aaeu,0xff8a1cu,0x23c1c4u,0xb59af2u);
const FG=array<u32,4>(0xffe437u,0x3d5df0u,0xff4f9eu,0xd4f046u);
const AC=array<u32,4>(0x2fc7c9u,0xffe437u,0xff8a1cu,0xff5a5au);
fn formL(uv:vec2f)->f32{ let c=textureSampleLevel(form,samp,uv,0.).rgb; return dot(c,vec3f(.3,.55,.15)); }
fn formSoft(uv:vec2f,r:f32)->f32{ var s=0.; for(var i=0;i<8;i++){ let a=f32(i)*.785+.3; s+=formL(uv+vec2f(cos(a),sin(a))*r*vec2f(.5625,1.)); } return s/8.; }
// halftone: a 45° screen of round dots whose area carries the tone v (0 white … 1 solid)
fn halftone(p:vec2f,v:f32,cell:f32,e:f32)->f32{ let q=rot(.785)*p/cell; let f=fract(q)-.5; let r=sqrt(sat(v))*.62; return 1.-smoothstep(r-e/cell,r+e/cell,length(f)); }
// the seal: white characters cut into a square of vermilion
fn sealMark(q:vec2f,sz:f32,e:f32)->f32{ let b=sdBox(q,vec2f(.5))+.035*(vnoise(q*14.)-.5); var a=fill(b,e/sz);
  let gq=q*vec2f(1.,-1.)*.86+.5; let gl=glyph(147.,gq,sz*U.res.y*.86); a*=1.-smoothstep(.35,.6,gl);
  a*=smoothstep(.15,.45,vnoise(q*60.)+.35)*.25+.75; return a; }
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let P0=frame(fc.xy); let e=px()*1.2; let split=U.p[0].x; let ink=U.p[0].y; let seal=U.p[0].z; let run=U.p[0].w; let wash=U.p[1].x; let tt=U.p[1].y; let appear=U.p[1].z;
  // ── the water: the print is carried down, more at the bottom, in tongues
  // the water: the inks run down in drips, column by column, faster at the bottom
  let drip=wash*wash*(.15+.8*pow(fbm(vec2f(P0.x*26.,3.)),2.))*(1.+.8*sat(.3-P0.y)); var P=P0+vec2f(.004*sin(P0.y*40.+tt*3.)*wash,drip*.5);
  let sp=ss01(split); let canvas=hx(0xeee7d8u)*(.93+.07*fbm(P*vec2f(600.,40.))*fbm(P*vec2f(40.,600.)));
  var col=mix(vec3f(0.),canvas,sp); var a=1.;
  for(var k=0;k<4;k++){ let fk=f32(k);
    // the panel's place: the whole frame at first, its own slot at the end
    // the frozen frame is cut into four strips; each carries its part of the picture to its slot, where the picture becomes the whole form
    let c0=vec2f(-.889+(fk+.5)*.4445,0.); let h0=vec2f(.22225,.5); let cS=vec2f((fk-1.5)*.405,.12); let hS=vec2f(.19,.28);
    let c=mix(c0,cS,sp); let h=mix(h0,hS,sp);
    let lq=(P-c)/h; if(abs(lq.x)>1.||abs(lq.y)>1.){ continue; }
    let po=c0+lq*h0; let foC=vec2f(po.x/1.7778+.5,.5-po.y); let foP=(lq*vec2f(.3,.442))*vec2f(.5625,-1.)+vec2f(.5,.52);
    let fo=mix(foC,foP,ss01(sp*1.25-.1));
    // misregistration: every screen is laid a little off, differently for each panel
    let o1=vec2f(hash21(vec2f(fk,1.))-.5,hash21(vec2f(fk,2.))-.5)*.016*ink; let o2=vec2f(hash21(vec2f(fk,3.))-.5,hash21(vec2f(fk,4.))-.5)*.012*ink;
    let fL=formL(fo); let sil=smoothstep(.04,.12,formSoft(fo+o1*vec2f(.5625,1.),.018));
    let det=formL(fo+o2*vec2f(.5625,1.));
    // the frozen form as it was (gold on dark) under the ink still to come
    var pc=lin3(vec3f(.04))+textureSampleLevel(form,samp,fo,0.).rgb*0.;
    pc=pow(textureSampleLevel(form,samp,fo,0.).rgb,vec3f(1./2.2));
    // the pull of the squeegee across each panel, one after another
    let pull=sat((ink*1.8-fk*.22)*1.5-(1.-lq.y)*.5)*sat(ink*12.); let keyPull=sat((ink*1.8-fk*.22-.45)*1.6-(1.-lq.y)*.5)*sat(ink*12.);
    let streak=.88+.12*vnoise(vec2f(lq.x*60.+fk*9.,lq.y*1.5))+.06*vnoise(vec2f(lq.x*300.,lq.y*8.));
    var flat=hx(BG[k])*streak; flat=mix(flat,hx(FG[k])*streak,sil);
    flat=mix(flat,hx(AC[k]),sil*smoothstep(.55,.9,formSoft(fo+o1*vec2f(.5625,1.),.006))*.9);
    pc=mix(pc,flat,pull);
    // the black screen: the form as a halftone photograph, its dark gaps as dots; a heavy edge where the light ends
    let tone=sat(1.-det*1.6)*sil; let dots=halftone(P,tone*.85,.0052,e); let edge=sil*(1.-smoothstep(.05,.09,formSoft(fo+o2*vec2f(.5625,1.),.008)))*1.;
    var key=max(dots*sil,edge*.9); key*=smoothstep(.12,.4,vnoise(vec2f(lq.x*90.,lq.y*4.+fk))+.3);  // starved ink: white flecks
    pc=mix(pc,hx(0x141216u),key*keyPull);
    // the panel's edge on the canvas
    let ed=max(abs(lq.x)*h.x-h.x,abs(lq.y)*h.y-h.y); pc=mix(pc,canvas,smoothstep(-.0015,.0,ed)*sp);
    col=pc; }
  // ── the old names under the panels
  for(var k=0;k<4;k++){ let fk=f32(k); var lp=P-vec2f((fk-1.5)*.405,-.235); let drift=run*(.08+.25*hash21(vec2f(fk,8.)))*smoothstep(0.,1.,run)+wash*.4; lp.y+=drift; lp.x+=.03*sin(lp.y*30.+tt*2.+fk)*run;
    let q=lp/.105+.5; let w=words(vec2f(q.x,1.-q.y),vec4f(256.*fk,6.,256.,256.),.105*U.res.y); let blur=1.-.6*run;
    col=mix(col,hx(0x141216u),sat(w*sp*ink*1.2)*(1.-run*.85)*smoothstep(.2,.5,vnoise(lp*80.)+.4)*blur); }
  // ── the seal. A shadow first, then the impression; then the paste runs into the wet paper and down
  let sc=vec2f(.0,.0); let SZ=.22; let sq=(P0-sc)/SZ;
  if(seal>.001){ let sh=seal*(1.-step(.92,seal)); let shd=fill(sdBox(sq*(1.-.5*(1.-seal)),vec2f(.5))-.15*(1.-seal),.25*(1.-seal)+.02); col*=1.-.35*sh*shd;
    let imp=step(.92,seal); let bleed=run;
    let warp=vec2f(fbm(sq*3.+tt*.3),fbm(sq*3.+7.-tt*.3))-.5; let q2=sq+warp*.35*bleed+vec2f(0.,.25*bleed*bleed*(sq.y+.6));
    var m=sealMark(q2,SZ*(1.+.4*bleed),e);
    // the paste spreads: soft vermilion clouds round the square, threads running down
    let cloud=smoothstep(.75,.2,length(sq*vec2f(1.,.8))-bleed*.6+.25*(fbm(sq*4.+tt*.5)-.5))*bleed;
    let weave=vnoise(q2*vec2f(170.,45.))*.58+vnoise(q2*vec2f(48.,167.))*.42;
    let pressure=smoothstep(.92,1.,seal);
    let contact=mix(smoothstep(.28,.68,weave+.13*q2.x),.86+.14*weave,pressure);
    let red=max(m*contact*(1.-.65*bleed),cloud*.75);
    col=mix(col,mix(hx(0xc8231au),hx(0xe0452eu),vnoise(sq*20.)),sat(red)*imp*(1.-wash*.4)); }
  // ── as the water carries the print away the colours go grey, and the layer goes
  let gray=dot(col,vec3f(.3,.55,.15)); col=mix(col,mix(col,vec3f(gray)*vec3f(1.,.97,.9),.7),wash);
  a=appear*(1.-smoothstep(.0,1.,wash*2.3-.6*sat(.5-P0.y)));
  return vec4f(lin3(col),a*U.w); }
fn ss01(x:f32)->f32{ let y=sat(x); return y*y*(3.-2.*y); }
`;
