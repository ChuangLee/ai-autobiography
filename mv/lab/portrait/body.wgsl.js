// The near forearm turns towards the rising writing. Its opposite hand is
// still breaking the surface. Coordinates are relative to the giant's waist.
export const BODY = `
fn limbSection(p:vec3f,a:vec3f,b:vec3f,start:f32,end:f32,belly:f32)->f32 {
  let axis=b-a; let h=clamp(dot(p-a,axis)/dot(axis,axis),0.,1.);
  let r=mix(start,end,h)+belly*4.*h*(1.-h)*(1.16-.52*h);
  return length(p-a-axis*h)-r;
}
fn riverHand(p:vec3f,wrist:vec3f,along:vec3f,facing:vec3f,thumbSide:f32)->f32 {
  let bound=length(p-(wrist+along*.22))-.34;
  if(bound>.11){return bound;}
  let across=normalize(cross(facing,along));let normal=normalize(cross(along,across));
  let v=p-wrist;
  let q=vec3f(dot(v,across)*thumbSide,dot(v,normal),dot(v,along));
  var d=figureEll(q-vec3f(.002,-.002,.095),vec3f(.124,.060,.157));
  let fingers=limbSection(q*vec3f(1.,1.46,1.),vec3f(-.025,0.,.17),vec3f(-.055,-.031,.342),.080,.054,0.);
  d=figureUnion(d,fingers/1.46,.032);
  let index=limbSection(q,vec3f(.061,.002,.162),vec3f(.069,-.029,.350),.040,.026,.002);
  d=figureUnion(d,index,.017);
  let thumb=limbSection(q,vec3f(.077,-.005,.040),vec3f(.159,.041,.152),.046,.031,.005);
  return figureUnion(d,thumb,.025);
}
fn emergingTorso(p:vec3f)->f32 {
  let side=select(-1.,1.,p.x>=0.);
  let near=p.x<0.;
  let waist=1.-smoothstep(.02,1.05,p.y);
  var core=vec3f(abs(p.x-.039*waist)*(1.+.043*waist),p.y,p.z);
  var d=torsoCore(core);
  let q=vec3f(abs(p.x),p.y,p.z);
  let shoulder=vec3f(.827,.90,.061);
  let elbow=select(vec3f(1.047,.145,.095),vec3f(1.075,.197,.041),near);
  let wrist=select(vec3f(1.136,-.563,-.112),vec3f(.789,.350,-.481),near);
  let upper=limbSection(q,shoulder,elbow,.165,.130,.038);
  let lower=limbSection(q,elbow,wrist,.125,.077,.041);
  d=figureUnion(d,figureUnion(upper,lower,.086),.111);
  let along=normalize(select(vec3f(.072,-.91,-.29),vec3f(-.81,.35,-.47),near));
  let facing=normalize(select(vec3f(-.28,-.14,-.87),vec3f(-.18,.90,-.43),near));
  let hand=riverHand(q,wrist,along,facing,side);
  return figureUnion(d,hand,.035);
}
`;
