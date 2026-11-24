// The visitor's coat, hands and weight-bearing foot use room metres. The head
// alone returns to the shared giant's coordinates, including its eye material.
export const ATTENTIVE_VISITOR = `
fn visitorBody(p:vec3f)->vec3f { return p*.252+vec3f(0.,.78,0.); }
fn visitorHead(model:vec3f)->vec3f {
  var p=visitorBody(model)-vec3f(-.013,1.365,-.035);
  let turn=.24; let c=cos(turn); let s=sin(turn);
  p=vec3f(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);
  let bow=.113; let cy=cos(bow);let sy=sin(bow);
  p=vec3f(p.x,p.y*cy-p.z*sy,p.y*sy+p.z*cy);
  return p/vec3f(.275,.252,.255)+vec3f(0.,(1.365-.78)/.252,0.);
}
fn visitorLimb(p:vec3f,a:vec3f,b:vec3f,r0:f32,r1:f32)->f32{
  let ba=b-a;let h=clamp(dot(p-a,ba)/dot(ba,ba),0.,1.);
  return length(p-a-ba*h)-mix(r0,r1,h);
}
fn visitorHands(p:vec3f)->f32{
  // One palm turns towards the writer. The other supports the forearm.
  var d=visitorLimb(p,vec3f(-.110,1.067,-.201),vec3f(-.072,1.097,-.220),.025,.030);
  d=figureUnion(d,visitorLimb(p,vec3f(-.074,1.096,-.220),vec3f(-.003,1.102,-.229),.029,.017),.012);
  d=figureUnion(d,visitorLimb(p,vec3f(-.073,1.091,-.208),vec3f(-.039,1.113,-.203),.017,.010),.009);
  var lower=visitorLimb(p,vec3f(.027,1.025,-.206),vec3f(-.039,1.034,-.225),.026,.030);
  lower=figureUnion(lower,visitorLimb(p,vec3f(-.039,1.034,-.225),vec3f(-.097,1.057,-.214),.030,.019),.012);
  return min(d,lower);
}
fn attentiveDistance(model:vec3f)->f32{
  let p=visitorBody(model);
  let outside=max(abs(p-vec3f(0.,.847,-.026))-vec3f(.318,.874,.277),vec3f(0.));
  let boxDistance=length(outside);if(boxDistance>.05){return boxDistance*.91;}
  let chest=smoothstep(.92,1.25,p.y);
  let hem=1.-smoothstep(.69,.93,p.y);
  let width=.128+.044*chest+.039*hem;
  let torso=p-vec3f(-.017*chest,0.,-.023*chest-.015*smoothstep(1.0,1.30,p.y));
  let radial=length(torso.xz*vec2f(1.,1.36)) - width;
  let across=abs(torso.x);
  let shoulders=1.345-.054*smoothstep(.045,.139,across)-.045*smoothstep(.12,.205,across);
  let edge=.682+.047*p.x-.015*clamp(-p.z/.15,0.,1.);
  let capped=vec2f(radial/1.36,max(edge-p.y,p.y-shoulders));
  var d=min(max(capped.x,capped.y),0.)+length(max(capped,vec2f(0.)))-.009;
  // The throat remains clear above the curved neckline of the jacket.
  let collar=max(length((p.xz-vec2f(-.013,-.025))*vec2f(1.,1.12))-.068,abs(p.y-1.340)-.017);
  d=figureUnion(d,collar,.016);
  if(p.y>1.262){
    let neck=visitorLimb(p,vec3f(-.013,1.312,-.029),vec3f(-.014,1.454,-.026),.060,.058);
    let face=max(bust(visitorHead(model))*.248,1.388-p.y);
    d=figureUnion(d,figureUnion(neck,face,.013),.013);
  }
  if(p.y>.92 && p.y<1.39){
    let shoulderR=vec3f(.143,1.245,-.019); let elbowR=vec3f(.260,1.048,-.036);
    var arms=visitorLimb(p,shoulderR,elbowR,.064,.047);
    arms=figureUnion(arms,visitorLimb(p,elbowR,vec3f(.039,1.024,-.204),.048,.034),.025);
    let shoulderL=vec3f(-.166,1.242,-.029); let elbowL=vec3f(-.269,1.002,-.015);
    var sleeve=visitorLimb(p,shoulderL,elbowL,.063,.047);
    sleeve=figureUnion(sleeve,visitorLimb(p,elbowL,vec3f(-.117,1.065,-.196),.047,.034),.021);
    d=figureUnion(d,min(arms,sleeve),.037);
    d=figureUnion(d,visitorHands(p),.009);
  }
  if(p.y<.718){
    // The near foot carries the weight. A relaxed knee comes half a step forward.
    let rightHip=vec3f(.079,.685,.010); let rightKnee=vec3f(.098,.371,.028); let rightFoot=vec3f(.113,.093,.038);
    let leftHip=vec3f(-.078,.681,-.003); let leftKnee=vec3f(-.106,.377,-.057); let leftFoot=vec3f(-.128,.091,-.109);
    var legs=visitorLimb(p,rightHip,rightKnee,.085,.067);
    legs=figureUnion(legs,visitorLimb(p,rightKnee,rightFoot,.067,.053),.027);
    var freeLeg=visitorLimb(p,leftHip,leftKnee,.082,.064);
    freeLeg=figureUnion(freeLeg,visitorLimb(p,leftKnee,leftFoot,.064,.050),.025);
    legs=min(legs,freeLeg);
    let shoeR=figureEll(p-vec3f(.115,.055,-.007),vec3f(.064,.054,.107));
    let shoeL=figureEll(p-vec3f(-.13,.054,-.14),vec3f(.060,.053,.102));
    d=figureUnion(d,min(legs,min(shoeR,shoeL)),.016);
  }
  return d*.87;
}
`;
