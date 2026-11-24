// A relief plate for the fixed view in the coda. The same brow and clavicles
// catch every new kind of paint; the light and ink move over their surface.
import { BUST, GAZE, portraitStudy } from "../river/figure.js";
export const RELIEF = BUST + GAZE + `
@group(0) @binding(0) var plate:texture_storage_2d<rgba16float,write>;
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){
  let size=textureDimensions(plate);
  if(any(id.xy>=size)){return;}
  let uv=(vec2f(id.xy)+.5)/vec2f(size);
  let side=vec3f(.95,0.,.31225); let rd=vec3f(-side.z,0.,side.x);
  let ro=side*((uv.x-.5)*2.72)+vec3f(0.,3.58-uv.y*3.69,0.)-rd*1.45;
  var d=0.; var sample=vec4f(0.);
  for(var j=0;j<70;j++){let p=ro+rd*d; let h=bust(p);
    if(h<.0015){sample=vec4f(bustN(p),${portraitStudy ? "1.+almond(p)" : "1."});break;}
    d+=max(h*.80,.001); if(d>2.65){break;}
  }
  textureStore(plate,id.xy,sample);
}`;

export const PAINTING = `
struct Frame{size:vec2f, t:f32, phase:f32, pane:vec2f, scale:f32, blank:f32}
@group(0) @binding(0) var<uniform> f:Frame;
@group(0) @binding(1) var fil:sampler;
@group(0) @binding(2) var relief:texture_2d<f32>;
@group(0) @binding(3) var letters:texture_2d<f32>;
@group(0) @binding(4) var poured:texture_2d<f32>;
fn inkGlyph(q:vec2f, lod:f32)->f32{
  let cell=floor(q); let i=189.+floor(hash21(cell)*39.99);
  let uv=(vec2f(i%32.,floor(i/32.))+clamp(fract(q),vec2f(.012),vec2f(.988)))/32.;
  return textureSampleLevel(letters,fil,uv,lod).r;
}
fn riverCenter(d:f32)->f32{return .50+(.04+.47*d)*sin(2.3+d*12.)+.030*sin(29.*d);}
fn riverWidth(d:f32)->f32{return (.006+.080*d+.91*d*d)*(.85+.29*vnoise(vec2f(d*17.,7.)));}
fn ridge(x:f32,i:f32)->f32{
  let k=x*(1.7+i*.21)+i*6.19;
  let peak=.43*abs(sin(k*2.2+i))+.32*vnoise(vec2f(k*4.,i+.7))+.20*vnoise(vec2f(k*14.,i+4.))+.05*vnoise(vec2f(k*36.,i));
  let base=.44+.061*i+.009*i*i;
  let depth=max(0.,base-.438);
  // Each range meets the alluvial terrace before it meets the water.
  let valley=smoothstep(-.018,.12+.023*i,abs(x-riverCenter(depth))-riverWidth(depth));
  return base-(.15+.082*i)*peak*mix(.06,1.,valley);
}
struct Drawing{ color:vec3f, mark:f32, body:f32, reliefLight:f32, water:f32, contour:f32, valley:f32 }
fn drawing(q:vec2f, t:f32, lod:f32)->Drawing{
  let grain=fbm(q*vec2f(3.,6.)); let fiber=vnoise(q*vec2f(88.,220.));
  let gold=vec3f(.90,.72,.42);
  var c=mix(vec3f(.70,.72,.65),vec3f(.94,.84,.64),smoothstep(.03,.48,q.y));
  var line=0.; var curl=.15*q.y; var band=0.;
  let pos=(q-vec2f(.52,.095))/vec2f(.256,.610)+vec2f(.5,0.);
  let surf=textureSampleLevel(relief,fil,clamp(pos,vec2f(0.),vec2f(1.)),0.);
  var actor=min(1.,surf.w)*select(0.,1.,all(pos>=vec2f(0.))&&all(pos<=vec2f(1.)));
  // The torso enters the far water at the trailing bank. Rippled mist hides
  // the submerged arms; downstream water can never cover its chest.
  let waterLine=.514+.006*sin(q.x*71.+t*.4)+.007*vnoise(vec2f(q.x*55.,1.));
  actor*=1.-smoothstep(waterLine-.008,waterLine+.007,q.y);
  let n=surf.xyz; let light=max(clamp(dot(n,normalize(vec3f(-.74,.59,-.38)))*.64+.47,.08,1.),1.23*max(0.,surf.w-1.));
  let script=inkGlyph(vec2f(pos.x*17.+.73*n.x,pos.y*27.+.81*n.y-.16*t),lod);
  for(var i=0;i<7;i++){
    let layer=f32(i); let h=ridge(q.x,layer);
    let edge=q.y-h;
    let cover=smoothstep(-.002,.0015,edge);
    let bend=q.x-.36*edge+.056*grain;
    let slope=clamp((ridge(bend+.015,layer)-ridge(bend-.016,layer))/.031,-2.6,2.6);
    let stroke=fbm(vec2f(q.x*11.+slope*.075,edge*17.+layer));
    let ch=bend*27.+edge*(7.+1.3*slope)+5.9*stroke+layer*9.;
    let cleft=(1.-smoothstep(.02,.19,abs(fract(ch+1.2*grain)-.5)))*smoothstep(.002,.035,edge)*smoothstep(.36,.68,stroke);
    let wash=fbm(vec2f(q.x*20.+layer,edge*19.));
    let pigment=clamp(.48+wash*.44+layer*.031+cleft*.13,0.,1.);
    var rock=mix(vec3f(.55,.65,.61),mix(vec3f(.105,.305,.325),vec3f(.10,.20,.33),wash),pigment*layer*.15+.14);
    let ledge=smoothstep(-.6,1.65,slope+.93*stroke);
    let soil=(1.-smoothstep(.009,.055,edge))*(.47+.53*stroke);
    rock=mix(rock,vec3f(.32,.47,.365),ledge*(.21+.40*stroke)*layer/6.);
    rock=mix(rock,vec3f(.57,.47,.32),soil*.48*ledge);
    rock*=.90+.15*wash+.11*ledge-.31*cleft*layer/6.;
    // Broken stands of pine grow on selected shelves, not across the whole rock.
    let px=q.x*(102.+14.*layer); let seed=hash21(vec2f(floor(px),layer));
    let pHeight=(.006+.016*seed)*(.3+layer/6.);
    let treetop=1.+edge/pHeight;
    let pine=(1.-smoothstep(.10,.44,abs(fract(px)-.5)/(.10+.75*clamp(treetop,0.,1.))))*smoothstep(-.003,.002,edge+pHeight)*(1.-smoothstep(.001,.014,edge));
    let woods=pine*smoothstep(.37,.66,vnoise(vec2f(q.x*21.,layer)))*smoothstep(.12,.6,seed);
    c=mix(c,rock*.68,woods*.85);
    c=mix(c,rock,cover); line=mix(line,max(cleft*.57,1.-smoothstep(.001,.006,abs(edge))),cover);
    curl=mix(curl,ch*.015,cover); band=mix(band,layer/6.,cover);
    if(i==3){c=mix(c,mix(vec3f(.32,.255,.19),gold,light)*(1.+.28*script),actor);
      line=mix(line,.31*script+.25*(1.-light),actor);}
    if(i>3){actor*=1.-cover;}
  }
  let delta=q.y-.438; let depth=max(delta,0.);
  let center=riverCenter(depth);
  let width=riverWidth(depth);

  let bank=abs(q.x-center)-width;
  let bankEdge=bank+(.002+.05*depth)*(.6-fbm(vec2f(q.x*53.,depth*105.)));
  let wet=(1.-smoothstep(-.002,.003,bankEdge))*smoothstep(0.,.015,delta)*(1.-actor);
  let terrace=(1.-smoothstep(-.009,.012+.065*depth,bankEdge))*smoothstep(.0,.06,depth);
  let gravel=fbm(vec2f(q.x*67.,depth*125.));
  let sand=mix(vec3f(.55,.52,.405),vec3f(.68,.65,.49),gravel);
  c=mix(c,sand,terrace*(.58+.35*gravel)*(1.-actor));
  let current=vec2f((q.x-center)/(.09+depth)*5.,log(.04+depth)*29.-t*.30+.85*sin(q.x*23.));
  let glint=(1.-smoothstep(.055,.30,abs(fract(current.y+.35*vnoise(current*.48))-.5)))*vnoise(current*vec2f(1.7,.4));
  let reflection=exp(-abs(q.x-.52)*(.9/(.025+depth*.16)))*smoothstep(.0,.17,depth);
  var water=mix(vec3f(.57,.66,.61),vec3f(.22,.43,.46),smoothstep(.0,.55,depth));
  let pool=vnoise(vec2f(q.x*16.,depth*53.-.18*t));
  let shoal=exp(-abs(bankEdge)/(.005+.045*depth));
  water=mix(water,vec3f(.65,.67,.55),.49*shoal+.14*pool);
  water=mix(water,gold,(.22+.65*glint)*reflection)+.13*glint*(.37+.63*pool);
  let mirrored=vec2f(pos.x+.035*(pool-.5),((2.*waterLine-q.y)-.095)/.61);
  let reflected=textureSampleLevel(relief,fil,clamp(mirrored,vec2f(.001),vec2f(.999)),0.).w;
  water=mix(water,gold,.36*reflected*smoothstep(.50,.55,q.y)*(1.-smoothstep(.57,.83,q.y))*(.30+.70*glint));
  c=mix(c,water,wet);
  line=mix(line,glint,wet); line=max(line,(1.-smoothstep(.001,.005,abs(bank)))*smoothstep(.0,.035,delta)*(1.-actor));
  c*=.945+.065*grain+.033*fiber;
  return Drawing(c,line,actor,light,wet,curl,band);
}
fn strand(q:vec2f, frequency:f32, seed:f32)->f32{
  let p=q*vec2f(1.78,1.); let bend=p.y+.16*sin(p.x*5.+seed)+.08*sin(p.x*12.+p.y*5.+seed);
  let h=bend*frequency+2.*vnoise(p*4.+seed);
  let rag=vnoise(vec2f(p.x*45.+seed,h*.14));
  return (1.-smoothstep(.022,.12+.13*rag,abs(fract(h)-.5)))*smoothstep(.26,.60,rag);
}
fn style(k:i32,q:vec2f,d:Drawing)->vec3f{
  let L=dot(d.color,vec3f(.26,.55,.19)); let grain=fbm(q*vec2f(24.,16.));
  let paper=vec3f(.85,.79,.65)*(.91+.13*grain);
  let blue=vec3f(.075,.205,.335); let dark=vec3f(.09,.087,.074); let gold=vec3f(.97,.76,.42);
  if(k==0){return d.color*(1.-.16*d.mark);}
  if(k==1){ // Carved key block, two blue impressions and the reserved paper.
    let value=floor(L*7.+grain*.20)/7.;
    var col=mix(vec3f(.065,.13,.245),paper,clamp((value-.19)*1.61,0.,1.));
    col=mix(col,blue,(.26+.52*d.mark)*d.water);
    return mix(col,mix(blue,gold,d.reliefLight),d.body*.89)*(1.-.42*d.mark);
  }
  if(k==2){ // Impasto follows the folds of land and the broken horizontal water.
    let angle=mix(-.75+.7*cos(d.contour*4.),.08+.095*sin(q.y*21.),d.water);
    let dir=vec2f(cos(angle),sin(angle));let point=vec2f(dot(q,dir),dot(q,vec2f(-dir.y,dir.x)));
    let cell=point*vec2f(38.,117.)+vec2f(5.1*grain,2.4*vnoise(q*17.));let r=hash21(floor(cell));
    let imp=1.-smoothstep(.18,.53,length((fract(cell)-.5)*vec2f(1.,1.4)));
    let hue=mix(vec3f(.15,.24,.42),vec3f(.93,.72,.34),clamp((L-.25)*1.5+r*.2,0.,1.));
    return mix(d.color*vec3f(.73,.85,1.04),hue,imp*(.6+.35*r))+.09*d.mark;
  }
  if(k==3){ // Planes meet along diagonals; the silhouette holds its place.
    let b=q*vec2f(13.,9.);let uv=fract(b);let corner=step(uv.x,uv.y);
    let fac=hash21(floor(b)+corner*3.1); let shade=floor(L*7.)/7.;
    let col=mix(vec3f(.18,.29,.30),vec3f(.91,.68,.36),shade*.8+fac*.28);
    return mix(col,d.color,.29)*(.83+.31*fac)-.12*d.mark;
  }
  if(k==4){
    let cell=q*vec2f(14.,8.);let r=hash21(floor(cell));let frac=fract(cell);
    let rule=1.-smoothstep(.016,.043,min(min(frac.x,1.-frac.x),min(frac.y,1.-frac.y)));
    var tile=paper;if(r<.13){tile=vec3f(.69,.17,.09);}else if(r<.28){tile=blue;}else if(r<.40){tile=gold;}
    return mix(mix(tile*(.48+.52*L),d.color,.38+.35*d.body),dark,rule*(.60+.31*step(.52,r)));
  }
  if(k==5){let idx=clamp(floor((L+grain*.035)*9.),0.,9.)/9.;return mix(blue,gold,idx)*(.88+.12*d.water)+.085*d.color;}
  if(k==6){
    let circuit=strand(q,44.,2.4)*d.valley;
    return mix(vec3f(.067,.115,.18),d.color*.68,.46)+d.mark*vec3f(.19,.65,.68)+circuit*vec3f(.42,.19,.34)+d.body*gold*(.38+.26*d.reliefLight);
  }
  if(k==7){
    let hatch=strand(q,96.,3.)*(1.-L);
    return mix(vec3f(.17,.18,.15),paper,clamp(L*1.28-hatch*.8-d.mark*.26,0.,1.))+d.body*gold*.22;
  }
  // Cursive characters travel in long, connected sweeps along the valley.
  let path=vec2f(q.x*3.8+q.y*1.35,q.y*2.9+.39*sin(q.x*8.)+.15*q.x);
  let cell=floor(path); let id=269.+floor(hash21(cell+2.)*39.9);
  let uv=(vec2f(id%32.,floor(id/32.))+fract(path))/32.;
  let script=textureSampleLevel(letters,fil,uv,.45).r;
  let tear=vnoise(q*vec2f(63.,185.));
  let dry=clamp((1.-L)*1.09+d.mark*.22+script*(.28+.41*tear)*(.44+.56*d.valley),0.,1.);
  let base=mix(paper,dark,dry)+d.body*gold*(.27+.19*d.reliefLight);
  if(k==8){return base;}
  let paint=textureSampleLevel(poured,fil,(q+vec2f(.19,.12))/vec2f(1.40,1.24),0.);
  return mix(mix(base,d.color,.24),paint.rgb,paint.a*(.85-.23*d.body));
}
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
  let uv=fc.xy/f.size; let t=f.t; let scale=f.scale;
  let sheet=(uv-f.pane)/scale+.5;
  let uvEdge=min(sheet,1.-sheet);
  let border=smoothstep(-.002,.006,min(uvEdge.x,uvEdge.y)*scale);
  if(border<.001){return vec4f(0.);}
  let opening=1.-smoothstep(223.,225.2,t);
  let recede=smoothstep(223.,248.,t);
  var q=(sheet-vec2f(.52,.48))*mix(.81,1.33,recede)+vec2f(.52,.48);
  let phase=f.phase;
  let pixel=smoothstep(4.,5.,phase)*(1.-smoothstep(5.,6.,phase));
  let mosaic=vec2f(180.,104.);
  q=mix(q,(floor(q*mosaic)+.5)/mosaic,pixel);
  let lod=clamp(log2(128.*29.*1.35/(max(.05,scale)*f.size.y*.65)),0.,5.);
  let d=drawing(q,t,lod);
  var col=style(i32(floor(phase)),q,d);
  let part=fract(phase);
  if(part>.0001){col=mix(col,style(min(9,i32(floor(phase))+1),q,d),smoothstep(0.,1.,part));}
  let scroll=smoothstep(244.,248.4,t);
  if(scroll>0.){
    let keep=smoothstep(.22,.78,q.x)*(1.-smoothstep(248.7,254.7,t));
    let wash=clamp(dot(d.color,vec3f(.22,.63,.15))*1.32-.15*d.mark,0.,1.);
    let ink=mix(vec3f(.115,.135,.115),vec3f(.88,.839,.73),wash);
    var panorama=mix(ink,d.color,keep);
    panorama=mix(panorama,vec3f(.91,.72,.44)*(.65+d.reliefLight*.4),d.body*.76);
    let margin=min(sheet.y,1.-sheet.y);
    let mount=smoothstep(.0,.041,smoothstep(245.3,250.,t)*.055-margin);
    panorama=mix(panorama,vec3f(.53,.44,.29)*(.89+.14*vnoise(sheet*vec2f(480.,80.))),mount);
    col=mix(col,panorama,scroll);
  }
  let tooth=vnoise(sheet*vec2f(170.,530.));
  col=mix(col,vec3f(.83,.80,.70)*(.96+.045*tooth),opening*.72);
  return vec4f(pow(max(col,vec3f(.002)),vec3f(2.2)),border*(1.-smoothstep(257.4,258.8,t)));
}
`;
