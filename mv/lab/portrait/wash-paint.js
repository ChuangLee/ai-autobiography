import { FS_VS, NOISE } from '../lib.js';
const COMMON=NOISE+`
struct View {size:vec2f,yaw:f32,t:f32}
@group(0) @binding(0) var<uniform> view:View;
@group(0) @binding(1) var inkAtlas:texture_2d<f32>;
@group(0) @binding(2) var inkSample:sampler;
fn rgb(k:u32)->vec3f{return vec3f(f32((k>>16u)&255u),f32((k>>8u)&255u),f32(k&255u))/255.;}
fn sq(x:f32)->f32{return x*x;}
fn sat(x:f32)->f32{return clamp(x,0.,1.);}
fn oval(x:f32,y:f32)->f32{return exp(-x*x-y*y);}
fn paperTooth(p:vec2f)->f32{
 return (vnoise(p*vec2f(1.18,.48))-.5)*.031+(vnoise(p*vec2f(.16,1.06))-.5)*.029+(vnoise(p*.069)-.5)*.024;
}
fn paper(p:vec2f)->vec3f{
 let tone=fbm(p*vec2f(.005,.009));let pulp=paperTooth(p);
 return mix(rgb(0xcac9b6u),rgb(0xf0e9d2u),.45+.50*tone)+pulp;
}
fn writing(q:vec2f,seed:f32)->f32{
 let cell=floor(q);let h=hash21(cell+seed);let uv=fract(q);
 let ranges=select(vec2f(37.,413.),vec2f(413.,861.),h>.65);
 let k=floor(mix(ranges.x,ranges.y,hash21(cell+seed*1.37)));
 let tile=vec2f(k%32.,floor(k/32.));
 return textureSampleLevel(inkAtlas,inkSample,(tile+uv)/32.,clamp(log2(32./(view.size.y*.0125)),0.,4.)).r;
}
fn stream(p:vec2f)->vec2f{
 let wave=17.*sin(p.x*.009+.4)+9.*sin(p.x*.017-1.)+4.*vnoise(vec2f(p.x*.045,3.));
 let level=p.y-wave-.044*p.x;
 let band=exp(-sq((level-654.)/24.))*.88+exp(-sq((level-704.)/14.))*.75+exp(-sq((level-742.)/32.))*.84;
 let q=vec2f(p.x*.102+.025*level-view.t*.058+.49*vnoise(p*.010),(level+4.*vnoise(p*.014))*.149);
 let dark=writing(q,5.)*.63+writing(q*vec2f(.71,1.27)+4.7,21.)*.36;
 return vec2f(sat(band),dark);
}
`;
export const BACK=COMMON+FS_VS+`
@fragment fn fs(@builtin(position) fc:vec4f)->@location(0) vec4f{
 let p=fc.xy/view.size*768.;var c=paper(p);
 let q=p/768.; let stain=fbm(p*vec2f(.008,.012));let wet=fbm(p*vec2f(.005,.015)+11.);
 let bank=.73+.045*sin(q.x*10.+.1)+.035*stain;
 let shade=sat((q.y-bank)*2.8+.49*stain);
 c=mix(c,mix(rgb(0xb5baadu),rgb(0xb2bdafu),wet),shade*.68);
 let tide=stream(p);c=mix(c,mix(rgb(0x495854u),rgb(0x70776bu),wet),tide.x*tide.y*.83);
 let line=q.y-.841-.027*sin(q.x*6.7)-.036*q.x;
 let creep=abs(line+.013*(wet-.5));c=mix(c,rgb(0x8c9683u),(1.-smoothstep(.001,.013,creep))*(.25+.32*stain));
 return vec4f(c,1.);
}`;
export const PORTRAIT=COMMON+`
struct Fragment { @builtin(position) at:vec4f,@location(0) p:vec3f,@location(1) n:vec3f,@location(2) @interpolate(flat) mat:u32 }
@vertex fn vs(@location(0) pos:vec3f,@location(1) normal:vec3f,@location(2) material:f32)->Fragment{
 let head=material!=1.;let a=view.yaw+.075;
 let pose=a*select(.43,1.,head);
 let cs=cos(pose);let sn=sin(pose);let tilt=select(.0,-.036,head);
 let x=cs*pos.x+sn*pos.z;let z=-sn*pos.x+cs*pos.z;
 let y=pos.y+tilt*x;
 let canvas=vec2f(x-.013*pos.y-.045,y-.245);
 let spot=vec2f(canvas.x,-canvas.y)*.715;
 var i:Fragment;i.at=vec4f(spot,.63-z*.30,1);i.p=pos;
 let nx=cs*normal.x+sn*normal.z;
 i.n=normalize(vec3f(nx-tilt*normal.y,normal.y,-sn*normal.x+cs*normal.z));
 i.mat=u32(material);return i;
}
fn waverInk(p:vec3f)->f32{return vnoise(p.xy*vec2f(44.,19.)+p.z*11.);}
fn line(y:f32,w:f32)->f32{return 1.-smoothstep(w*.58,w*1.32,abs(y));}
fn features(p:vec3f,base:vec3f,only:f32)->vec3f{
 if(only<.001){return base;}
 let a=abs(p.x);let eye=(a-.231)/.128;let e=clamp(eye,-1.,1.);let rim=pow(sat(1.-e*e),.72);
 let asym=select(.0015,-.002,p.x<0.);let center=-.185-.009*e+asym;
 let y=p.y-center;let lower=.029*rim;let upper=-.043*rim-.003*(1.-e)*rim;
 let aperture=smoothstep(upper-.0023,upper+.0023,y)*(1.-smoothstep(lower-.0023,lower+.0023,y))*smoothstep(1.04,.97,abs(eye));
 let sep=smoothstep(1.05,.72,abs(eye));let shadow=rgb(0x554939u);
 var c=base;
 // The eyebrow breaks into hairs against the paper at its outer third.
 let brow=-.260-.040*(1.-sq(clamp((a-.230)/.177,-1.,1.)))-.014*e;
 let bw=.017+.010*exp(-sq((a-.16)/.072));
 let ends=smoothstep(.062,.11,a)*(1.-smoothstep(.300,.432,a));
 let socket=.31*oval(eye*.82,(y+.009)/.064)+.31*oval(eye*.92,(y-lower-.011)/.033);
 c=mix(c,rgb(0x545f53u),socket);
 let hairs=.28+.72*smoothstep(.12,.86,vnoise(vec2f((a+p.y*.34)*540.,p.y*166.)));
 c=mix(c,rgb(0x5b503cu),ends*line(p.y-brow,bw)*(.45+.46*hairs));
 c=mix(c,shadow,.57*sep*line(y-(upper-.025+.007*e),.0055));
 c=mix(c,rgb(0x9b855fu),.23*sep*line(y-(lower+.023),.009));
 // The globe is lit through the paper. Its quiet gaze comes from the lids and the drift of the warm reflection.
 let orb=(a-.225)/.138;let shade=sat(.32+.48*smoothstep(upper-.004,upper+.023,y)+.19*(1.-orb*orb));
 let glint=oval((p.x-select(-.223,.223,p.x>0.)+.013*sin(view.yaw))/.045,(y+.004)/.026);
 let alabaster=.46*exp(-sq(orb/.70))+.36*shade+.21*glint;
 let ball=mix(rgb(0x999e89u),rgb(0xfff9e0u),sat(alabaster));
 c=mix(c,ball,aperture);
 c=mix(c,rgb(0x4a4639u),.88*sep*line(y-upper,.0052+.0025*(1.-abs(e))));
 c=mix(c,rgb(0x595944u),.57*sep*line(y-lower,.0056));
 c=mix(c,rgb(0x77684eu),.23*sep*oval((y-lower-.011)/.015,e/.85));
 let outer=smoothstep(.315,.392,a)*(1.-smoothstep(.412,.476,a));
 c=mix(c,rgb(0x746f58u),outer*(.14*line(y-.025-(a-.35)*.31,.003)+.10*line(y-.035-(a-.35)*.49,.003)));

 c+=vec3f(.030,.026,.015)*sep*line(y-lower-.007,.005);
 // The septum sits in front of two small sloping openings. The wings return softly into the fold.
 let wing=(a-.079)/.040;let nose=.161+.005*wing-.006*wing*wing;
 c=mix(c,rgb(0x574e3fu),.89*exp(-sq(wing))*line(p.y-nose,.0095));
 c=mix(c,rgb(0xe0cc9cu),.20*exp(-sq((wing-.2)*.92))*line(p.y-nose+.014,.0064));
 c=mix(c,rgb(0x73674fu),.22*oval((a-.116)/.012,(p.y-.138)/.030));
 c=mix(c,rgb(0x7e674bu),.28*oval((a-.109)/.010,(p.y-.148)/.024));
 c=mix(c,rgb(0x8a6e50u),.21*oval(p.x/.038,(p.y-.177)/.008));
 let nasolabial=.117+.184*max(0.,p.y-.160)+.051*smoothstep(.176,.345,p.y);
 c=mix(c,rgb(0x8d775au),.19*oval((a-nasolabial)/.012,(p.y-.259)/.079));
 let seam=.334-.004*exp(-sq((a-.048)/.036))+.004*sq(a/.19)+.002*p.x/.18;let lip=p.y-seam;
 let span=smoothstep(.185,.109,a);
 c=mix(c,rgb(0xa17e67u),.43*span*oval(lip/.032,(a-.066)/.107)*smoothstep(.012,-.007,lip));
 c=mix(c,rgb(0xba9981u),.29*span*exp(-sq((lip-.023)/.025)));
 c=mix(c,rgb(0x604d40u),.75*span*line(lip,.0062)*(.72+.28*vnoise(vec2f(p.x*360.,4.))));
 c=mix(c,rgb(0x735b49u),.44*oval((a-.166)/.018,lip/.007));
 c+=vec3f(.041,.032,.019)*oval((p.x+.028)/.066,(lip-.035)/.007);
 return mix(base,c,only);
}
@fragment fn fs(i:Fragment)->@location(0) vec4f{
 let p=i.p;let n=normalize(i.n);let pos=i.at.xy/view.size*768.;let skin=i.mat==0u;
 let side=sign(p.x);let local=vec2f(p.x,p.y);
 let laid=fbm(local*vec2f(6.,8.)+3.);let gran=vnoise(local*vec2f(164.,183.));
 let rag=fbm(local*vec2f(15.,24.)+18.)-.48;let tooth=paperTooth(pos);
 let light=dot(n,normalize(vec3f(-.64,-.75,.59)));
 let plane=light+.11*rag;let ink=rgb(0x515b53u);let goldUmber=rgb(0xad9872u);
 var c=mix(ink,rgb(0x8c8974u),smoothstep(-.68,-.04,plane));
 c=mix(c,goldUmber,smoothstep(-.15,.30,plane));
 c=mix(c,rgb(0xd7c594u),smoothstep(.12,.65,plane));
 c=mix(c,rgb(0xeee0b8u),smoothstep(.61,.95,plane));
 // A broad glaze and shell-gold occupy opposite sides of the turn. The eye and lips keep ink.
 let wash=smoothstep(.28,.77,laid+.26*(1.-light));
 c=mix(c,ink,.12*wash+.06*max(0.,-light));
 let fracture=fbm(local*vec2f(18.,47.)+p.z*16.);
 let turn=sat(.16+.82*oval((abs(p.x)-.32)/.12,(p.y+.08)/.27)+.60*oval(p.x/.09,(p.y+.12)/.37));
 let foil=turn*smoothstep(.41,.67,fracture+.23*rag)*smoothstep(.16,.47,plane)*(1.-smoothstep(.69,.95,plane));
 c=mix(c,mix(rgb(0xc9ad71u),rgb(0xf4df9eu),.28+.55*gran+.14*n.x),foil*.55);
 let edge=pow(1.-sat(n.z),2.6);
 c=mix(c,rgb(0x5d6255u),edge*(.12+.21*wash));
 let tide=smoothstep(.12,-.56,plane+rag*.34)*smoothstep(-.12,.42,laid);
 c=mix(c,rgb(0x3a4d48u),tide*.51);
 let pool=pow(1.-smoothstep(.0,.14,abs(plane+.18*rag+.10)),2.);
 c=mix(c,rgb(0x827451u),pool*.13*(.30+.70*gran));
 c+=(gran-.5)*(.013+.048*wash)+tooth*(.37+.47*wash);
 if(skin){
   let contour=smoothstep(.31,.025,n.z)*smoothstep(.34,.60,laid+rag*.22);
   c=mix(c,rgb(0x465348u),contour*(.26+.25*waverInk(p)));
   let shadow=smoothstep(.18,-.39,plane)*smoothstep(.18,.41,abs(p.x));
   let stroke=p.y*62.+p.x*31.+8.*fbm(local*5.0)+2.7*sin(p.x*9.);
   c=mix(c,rgb(0x43564eu),shadow*(.13+.12*pow(max(0.,sin(stroke)),6.))*(.47+.50*laid));
   let front=smoothstep(.13,.32,p.z);
   c=features(p,c,front);
   let jaw=.43-.42*(abs(p.x)-.28);
   c=mix(c,rgb(0x81775fu),.13*oval((abs(p.x)-.29)/.11,(p.y-jaw)/.045)*front);
 }else if(i.mat==2u){
   let canal=oval((p.z-.035)/.032,(p.y+.053)/.042);
   let bowl=oval((p.z-.016)/.072,(p.y+.068)/.11);
   c=mix(c,rgb(0x8d7558u),bowl*.31);c=mix(c,rgb(0x625a48u),canal*.52);
 }else{
   let river=stream(pos);
   let depth=smoothstep(1.13,1.65,p.y);
   let height=p.y+.078*sin(p.x*7.1+p.y)+.052*sin(p.x*12.-p.y*3.)+.039*vnoise(local*9.);
   let course=vec2f(p.x*23.+p.y*5.+.25*sin(p.y*19.),height*28.);
   let veins=exp(-sq((height-1.36-.10*p.x)/.061))+.8*exp(-sq((height-1.56+.08*p.x)/.073));
   let channels=.16+.84*smoothstep(.19,.68,veins+.25*vnoise(vec2f(p.x*2.5,height*26.)));
   let mark=writing(course,22.)*channels;
   c=mix(c,rgb(0x505e56u),depth*(.2+.42*wash)+.49*mark*smoothstep(.90,1.56,p.y));
   let lift=.29*vnoise(local*vec2f(4.,12.))+.12*vnoise(local*vec2f(23.,58.));
   let dissolve=smoothstep(1.19,1.72,p.y+lift*.78);
   let middle=mix(rgb(0x60736bu),paper(pos),.69+.27*laid);
   c=mix(c,rgb(0x45594eu),sat(veins)*depth*(.28+.30*mark));
   c=mix(c,middle,dissolve*(.95-.86*mark)*(.96-.23*sat(veins)));
   c=mix(c,rgb(0x435148u),river.x*river.y*dissolve*.81);
 }
 return vec4f(clamp(c,vec3f(0.),vec3f(1.)),1.);
}`;
