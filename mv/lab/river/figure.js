// Keep the published take available while the proposed head is being reviewed.
const portraitVersion = new URLSearchParams(globalThis.location?.search).get("portrait");
const measuredSitter = portraitVersion === "sitter";
export const portraitStudy = measuredSitter || portraitVersion === "anatomy";
const [study, body] = portraitStudy ? await Promise.all([
  measuredSitter ? import("../portrait/sitter-shell.js") : import("../portrait/anatomy.wgsl.js"),
  import("../portrait/body.wgsl.js"),
]) : [null, null];
const TORSO = `
fn figureEll(p:vec3f, r:vec3f)->f32{ let k0=length(p/r); let k1=length(p/(r*r)); return k0*(k0-1.)/max(k1,1e-5); }
fn figureCap(p:vec3f,a:vec3f,b:vec3f,r:f32)->f32{ let pa=p-a; let ba=b-a; let h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }
fn figureUnion(a:f32,b:f32,k:f32)->f32{ let h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }
// A colossal bust: about one head = 1.1 units; y up, facing -z, standing in the water at y = 0. Symmetric in x.
fn torsoCore(q:vec3f)->f32{
  var d=figureEll(q-vec3f(0.,.70,.02), vec3f(.70,.52,.36));                              // ribcage
  d=figureUnion(d, figureEll(q-vec3f(.29,.80,-.20), vec3f(.30,.21,.15)), .10);                  // pectoral
  d=figureUnion(d, figureEll(q-vec3f(0.,.02,.04), vec3f(.53,.72,.30)), .28);                    // waist
  d=figureUnion(d, figureEll(q-vec3f(0.,-.62,.05), vec3f(.60,.62,.34)), .30);                   // hips, going down into the sea
  d=figureUnion(d, figureEll(q-vec3f(0.,.18,-.20), vec3f(.26,.42,.10)), .16);                   // the plane of the abdomen
  d=figureUnion(d, figureEll(q-vec3f(.84,.90,.05), vec3f(.26,.30,.25)), .26);                   // the shoulder, rounded into the chest: no arms
  d=figureUnion(d, figureCap(q, vec3f(.10,1.13,-.20), vec3f(.76,1.13,-.08), .042), .07);        // clavicle
  d=figureUnion(d, figureCap(q, vec3f(0.,1.50,.13), vec3f(.66,1.13,.09), .115), .16);           // trapezius
  d=figureUnion(d, figureCap(q, vec3f(0.,1.10,.09), vec3f(0.,1.80,.03), .185), .14);            // neck
  d=figureUnion(d, figureCap(q, vec3f(.06,1.20,-.13), vec3f(.20,1.72,.06), .05), .06);          // sternomastoid
  return d;
}
fn torsoSd(q:vec3f)->f32{
  var d=torsoCore(q);
  // Upper arms fall under the deltoids; at sea the lower arms are submerged.
  d=figureUnion(d,figureCap(q,vec3f(.85,.84,.045),vec3f(.94,.30,.02),.18),.11);
  d=figureUnion(d,figureEll(q-vec3f(.93,.46,-.015),vec3f(.177,.30,.178)),.06);
  d=figureUnion(d,figureCap(q,vec3f(.94,.29,.02),vec3f(.96,-.32,-.09),.12),.09);
  d=figureUnion(d,figureEll(q-vec3f(.96,-.44,-.10),vec3f(.106,.185,.090)),.055);
  return d; }
`;
const PRIOR_HEAD = `
fn faceSquare(x:f32)->f32{return x*x;}
fn headSd(q:vec3f)->f32{
  // Model the forehead, cheeks and mouth on a continuous cranial surface.
  // g is local to the front of the head, so the same relief turns away at the temples.
  let y=q.y-2.12;
  let jaw=smoothstep(-.48,-.02,y);
  let rx=mix(.295,.383,jaw);
  let chin=.104*(1.-smoothstep(-.43,-.10,y));
  let g=smoothstep(.04,-.24,q.z);
  let eye=vec2f((q.x-.153)/.092,(y-.014)/.050);
  let brow=vec2f((q.x-.15)/.158,(y-.105+.09*q.x)/.048);
  let cheek=vec2f((q.x-.209)/.104,(y+.068)/.105);
  let muzzle=vec2f(q.x/.195,(y+.225)/.115);
  let nasal=vec2f(q.x/(.040+.017*smoothstep(.04,-.15,y)),(y+.044)/.162);
  let tip=vec2f(q.x/.065,(y+.128)/.054);
  let wing=vec2f((q.x-.056)/.033,(y+.144)/.030);
  let nostril=vec2f((q.x-.045)/.019,(y+.164)/.012);
  let lipsWidth=exp(-faceSquare(q.x/.117));
  let lipLine=-.277+.009*smoothstep(.012,.048,q.x)-.008*smoothstep(.07,.13,q.x);
  let lipY=y-lipLine;
  let lips=lipsWidth*(.030*exp(-faceSquare((lipY-.016)/.018))+.038*exp(-faceSquare((lipY+.020)/.021))-.019*exp(-faceSquare(lipY/.007)));
  let lidY=y-.008-.011*(q.x-.15)/.10;
  let lid=.017*exp(-faceSquare((q.x-.15)/.085)-faceSquare((lidY-.019)/.013));
  let relief=.050*exp(-dot(brow,brow))-.023*exp(-dot(eye,eye))+.048*exp(-dot(cheek,cheek))
    +.045*exp(-dot(muzzle,muzzle))+.111*exp(-dot(nasal,nasal))+.088*exp(-dot(tip,tip))
    +.043*exp(-dot(wing,wing))-.026*exp(-dot(nostril,nostril))+lips+lid;
  var h=figureEll(vec3f(q.x,y,q.z-.008+chin+g*relief),vec3f(rx,.555,.426));
  // A corneal dome occupies the hollow. The upper lid overlaps the sphere;
  // below it the lower orbital rim softens into the cheek plane.
  let globe=figureEll(q-vec3f(.151,2.133,-.349),vec3f(.089,.050,.067));
  h=figureUnion(h,globe,.017);
  let lidX=(q.x-.151)/.092;
  let lidArc=.020*(1.-min(lidX*lidX,1.));
  let lidFold=figureEll(vec3f(q.x-.151,q.y-2.139-lidArc,q.z+.373),vec3f(.089,.021,.039));
  h=figureUnion(h,lidFold,.013);
  let ear=q-vec3f(.36,2.085,.027);
  var helix=figureEll(ear,vec3f(.057,.108,.069));
  helix=max(helix,-figureEll(ear-vec3f(.050,.013,-.004),vec3f(.027,.066,.038)));
  return figureUnion(h,helix,.014); }
`;
export const BUST = `const anatomyStudy=${portraitStudy};
` + TORSO + (body?.BODY ?? "") + (study?.HEAD ?? PRIOR_HEAD) + `
fn headQ(q:vec3f)->vec3f{ let a=.19; let v=q-vec3f(0.,1.72,.02); return vec3f(v.x, v.y*cos(a)-v.z*sin(a), v.y*sin(a)+v.z*cos(a))+vec3f(0.,1.72,.02); }
${measuredSitter ? `fn sitterHeadOnly(p:vec3f)->f32{
  let y=p.y-.85;let a=.10*smoothstep(1.05,1.78,y);
  let x=p.x*cos(a)+p.z*sin(a);let z=p.z*cos(a)-p.x*sin(a);
  return headSd(headQ(vec3f(x,y-.055*x*(1.-smoothstep(1.04,1.55,y)),z)));
}` : ""}
fn bust(p:vec3f)->f32{ var q=p; q.y-=.85;
  if(anatomyStudy){
    let turn=.10*smoothstep(1.05,1.78,q.y);
    let old=q.xz;q.x=old.x*cos(turn)+old.y*sin(turn);q.z=old.y*cos(turn)-old.x*sin(turn);
    q.y-=.055*q.x*(1.-smoothstep(1.04,1.55,q.y));
  }
  ${body ? `if(q.y<1.2){return emergingTorso(q);}` : ""}
  ${measuredSitter ? `let head=headQ(q);q.x=abs(q.x);
  if(q.y>2.12){return headSd(head);}return figureUnion(torsoSd(q),headSd(head),.10);` :
  `q.x=abs(q.x); if(q.y<1.2){ return torsoSd(q); } if(q.y>2.12){ return headSd(headQ(q)); } return figureUnion(torsoSd(q),headSd(headQ(q)),.10);`} }
fn bustN(p:vec3f)->vec3f{ let e=vec2f(.004,-.004); return normalize(e.xyy*bust(p+e.xyy)+e.yyx*bust(p+e.yyx)+e.yxy*bust(p+e.yxy)+e.xxx*bust(p+e.xxx)); }
`;
export const GAZE = study?.GAZE ?? `
fn eyeColor(p:vec3f, base:vec3f)->vec3f {
  let q=headQ(vec3f(abs(p.x),p.y-.85,p.z));
  if(q.z>-.24){return base;}
  let x=(q.x-.153)/.083;
  let y=q.y-2.12-.011*x;
  let aperture=(1.-x*x)*.014;
  let open=smoothstep(.0,.005,aperture-abs(y));
  let iris=length(vec2f((q.x-.146)*.85,y+.005));
  let lens=mix(vec3f(.22,.16,.085),vec3f(.33,.27,.19),smoothstep(.008,.024,iris));
  return mix(base,lens,open*.72);
}
fn wakingEye(p:vec3f,base:vec3f,open:f32)->vec3f{return eyeColor(p,base);}
`;

// Cache the distance and outward normal for the particles. The close-up is marched
// against the analytic surface and retains details smaller than a voxel.
export const FIGURE_VOLUME = `
const volumeLo=vec3f(-1.45,-.72,-.90);
const volumeExtent=vec3f(2.90,4.65,1.80);
`;
export const BAKE_FIGURE = BUST + FIGURE_VOLUME + `
@group(0) @binding(0) var volume:texture_storage_3d<rgba16float,write>;
@compute @workgroup_size(4,4,4) fn main(@builtin(global_invocation_id) id:vec3u){
  let uv=(vec3f(id)+.5)/vec3f(textureDimensions(volume));
  let p=volumeLo+uv*volumeExtent;
  textureStore(volume,id,vec4f(bustN(p),bust(p)));
}
`;
