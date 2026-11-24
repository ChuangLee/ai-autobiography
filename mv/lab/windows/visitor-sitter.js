// In a room the screen, a little to the side of the seated writer, becomes the
// warm source. The window supplies a cooler fill on the other cheek.
export const WINDOW_SITTER = `
fn seatedSitterPaint(model:vec3f, n:vec3f, rd:vec3f)->vec3f{
  let p=visitorBody(model);
  let L=normalize(vec3f(-.72*r.flip,.36,.71));
  let areaLight=smoothstep(-.27,.88,dot(n,L));
  let cool=smoothstep(-.05,.91,dot(n,normalize(vec3f(.66*r.flip,.28,-.66))));
  let silhouette=pow(clamp(1.-abs(dot(n,rd)),0.,1.),3.);
  let collar=smoothstep(1.305,1.382,p.y);
  let hand=((p.y>1.045 && p.y<1.132) || (p.y>.729 && p.y<.884)) && visitorHands(p)<.003;
  if(p.y>1.359 || hand){
    let skin=mix(vec3f(.046,.035,.026),vec3f(.44,.305,.168),areaLight)
                +vec3f(.021,.029,.035)*cool;
    let cheek=exp(-((abs(p.x+.014)-.065)*(abs(p.x+.014)-.065)/.0018
                   +(p.y-1.48)*(p.y-1.48)/.0013));
    var c=skin*mix(vec3f(1.),vec3f(1.055,.975,.88),cheek);
    if(hand){
      let bounce=smoothstep(-.39,.74,dot(n,normalize(vec3f(-.11*r.flip,.67,-.74))));
      c=c*(.63+.17*areaLight)+vec3f(.058,.040,.023)*(.36+.64*bounce);
    }else{
      let chin=(1.-smoothstep(1.405,1.453,p.y))*smoothstep(.05,.78,-n.y);
      c*=(.65+.35*smoothstep(1.369,1.432,p.y))*(1.-.16*chin);
    }
    c+=vec3f(.077,.058,.039)*silhouette*(.42+.58*areaLight)*smoothstep(1.390,1.459,p.y);
    if(p.y>1.412 && !hand){
      let head=visitorHead(model);
      let sinceQuestion=u.t-select(67.3,60.,r.b.w>.5);
      let attend=.44+.40*smoothstep(.67,1.84,sinceQuestion);
      let quiet=.17*smoothstep(63.72,64.26,u.t)*r.b.w;
      let gaze=wakingEye(head,c,attend-quiet);
      // The recessed eye takes light from the screen, not the intensity of a
      // street lamp. Keep the single corneal highlight within the skin's range.
      c=mix(c,min(gaze,c*.52+vec3f(.205,.207,.162)),.94);
    }
    return c*r.figAmt;
  }
  let wrap=p.x+.079-.124*smoothstep(.89,1.34,p.y);
  let opening=(1.-smoothstep(.003,.012,abs(wrap)))*(1.-smoothstep(-.10,-.045,p.z))
              *smoothstep(.68,.78,p.y)*(1.-smoothstep(1.28,1.35,p.y));
  let hem=(1.-smoothstep(.003,.013,abs(p.y-.693-.047*p.x)))*(1.-smoothstep(.16,.21,abs(p.x)));
  let turn=exp(-70.*abs(p.x-.097+.11*(p.y-.92)))*smoothstep(.74,.94,p.y)*(1.-smoothstep(1.17,1.28,p.y));
  let cloth=mix(vec3f(.016,.019,.019),vec3f(.148,.109,.064),areaLight*areaLight)+vec3f(.009,.014,.016)*cool;
  let trim=1.-.23*opening-.23*hem-.16*turn;
  return (cloth*trim*(.74+.26*smoothstep(.59,.79,p.y))+
          vec3f(.064,.047,.029)*silhouette*(.29+.71*areaLight))*(1.-.16*collar)*r.figAmt;
}
fn glassSitterPaint(model:vec3f,n:vec3f)->vec3f{
  let p=visitorBody(model);
  let side=dot(n,normalize(vec3f(-.61*r.flip,.40,-.69)));
  let light=smoothstep(.135,.32,side);
  let halfLight=smoothstep(-.40,-.16,side);
  var c=mix(vec3f(.042,.053,.052),vec3f(.122,.104,.068),halfLight);
  if(p.y>1.36){
    c=mix(c,vec3f(.462,.333,.186),light);
    if(p.y>1.412){c=mix(c,min(wakingEye(visitorHead(model),c,.78),c+vec3f(.10,.11,.073)),.72);}
  }else{
    c=mix(c,vec3f(.205,.174,.107),light);
  }
  return c;
}
`;

// Palm-space x runs from wrist to fingertips; z measures across the metacarpals.
// Each palm continues inside the sleeve and the thumb has a separate web.
export const WINDOW_HANDS = `
fn visitorHands(p:vec3f)->f32{
  if(p.y>.955){
    let arm=p-vec3f(-.128,1.074,-.157);
    let f=normalize(vec3f(.79,.23,-.57));let across=normalize(vec3f(.57,0.,.79));
    let w=across*.9004+cross(across,f)*.4350;let normal=cross(w,f);
    let q=vec3f(dot(arm,f),dot(arm,normal),dot(arm,w));
    let bound=length(q-vec3f(.054,0.,0.))-.098;
    if(bound>.035){return bound;}
    var d=visitorLimb(q,vec3f(-.018,0.,0.),vec3f(.038,.001,0.),.018,.019);
    d=figureUnion(d,figureEll(q-vec3f(.048,0.,0.),vec3f(.041,.015,.030)),.009);
    for(var i=0;i<4;i++){
      let j=f32(i);let z=-.021+j*.014;
      let reach=.121-.005*abs(j-1.)-.005*max(j-1.,0.);
      let bend=mix(.006,-.004,j/3.);
      let tip=vec3f(reach,.005+bend,z*1.26);
      let knuckle=vec3f(.098,.006,z*1.13);
      let finger=visitorLimb(q,vec3f(.066,.002,z),knuckle,.009-.0006*j,.0076-.0005*j);
      d=figureUnion(d,min(finger,visitorLimb(q,knuckle,tip,.0074,.0054)),.0036);
    }
    let thumb=visitorLimb(q,vec3f(.037,.003,-.018),vec3f(.059,.017,-.041),.012,.009);
    return figureUnion(d,min(thumb,visitorLimb(q,vec3f(.059,.017,-.041),vec3f(.076,.024,-.048),.009,.006)),.006);
  }
  let arm=p-vec3f(.198,.869,-.041);
  let q=vec3f(-arm.y,arm.x,arm.z);
  let bound=length(q-vec3f(.059,0.,0.))-.096;
  if(bound>.029){return bound;}
  var d=visitorLimb(q,vec3f(-.013,0.,0.),vec3f(.045,0.,-.004),.018,.020);
  d=figureUnion(d,figureEll(q-vec3f(.057,-.001,-.006),vec3f(.040,.017,.030)),.007);
  for(var i=0;i<4;i++){
    let j=f32(i);let z=-.026+j*.014;
    d=figureUnion(d,visitorLimb(q,vec3f(.076,-.002,z),vec3f(.124-.006*abs(j-1.),-.013,z+.006),.009,.006),.003);
  }
  let thumb=visitorLimb(q,vec3f(.037,-.003,-.024),vec3f(.068,-.016,-.042),.012,.008);
  return figureUnion(d,min(thumb,visitorLimb(q,vec3f(.068,-.016,-.042),vec3f(.083,-.022,-.037),.008,.006)),.005);
}
`;

export const WINDOW_SLEEVES = `
  if(p.y>.716 && p.y<1.39){
    let left=vec3f(-.169,1.240,-.025);let elbow=vec3f(-.225,1.009,-.038);
    let wrist=vec3f(-.126,1.074,-.155);
    var sleeve=visitorLimb(p,left,elbow,.061,.043);
    sleeve=figureUnion(sleeve,visitorLimb(p,elbow,wrist,.044,.027),.021);
    let right=vec3f(.147,1.247,-.016);let slack=vec3f(.206,1.051,.018);
    let cuff=vec3f(.199,.864,-.041);
    var other=visitorLimb(p,right,slack,.060,.046);
    other=figureUnion(other,visitorLimb(p,slack,cuff,.047,.026),.025);
    d=figureUnion(d,min(sleeve,other),.030);
    d=figureUnion(d,visitorHands(p),.0045);
  }
`;

// The secondary households occupy a few pixels on the façade. Dark under the
// chin, ochre on one cheek and a bent sleeve survive at that scale.
export const NEIGHBOUR_SITTER = `
      let k=vec2f(p.x*flip,p.y);
      let head=k-vec2f(-.025,1.546);
      let width=mix(.072,.094,smoothstep(-.097,.012,head.y));
      let face=(length(head/vec2f(width,.136))-1.)*.083;
      let nose=sdSeg(head,vec2f(-.057,-.008),vec2f(-.085,-.025))-.013;
      var headShape=min(face,nose);
      let neck=sdSeg(k,vec2f(-.018,1.381),vec2f(-.021,1.468))-.046;
      headShape=smin(headShape,neck,.012);
      let sh=abs(k.x+.010);
      let shoulders=min(1.354-.077*sh/.19,1.354);
      var coat=max(sh-.15+.013*cos((k.y-.70)*6.),max(.684-k.y,k.y-shoulders))-.015;
      let arm=sdSeg(k,vec2f(-.135,1.286),vec2f(-.205,1.036))-.040;
      coat=smin(coat,min(arm,sdSeg(k,vec2f(-.205,1.036),vec2f(-.076,1.073))-.031),.023);
      coat=smin(coat,sdSeg(k,vec2f(.139,1.27),vec2f(.197,.86))-.041,.026);
      let leg=sdSeg(vec2f(abs(k.x),k.y),vec2f(.067,.706),vec2f(.096,.080))-.052;
      let suit=min(coat,leg);
      let sd=min(suit,headShape);
      let warm=(1.-smoothstep(-.071,.085,head.x+.34*head.y));
      let cheek=smoothstep(-.016,.055,head.y+.20*head.x);
      let jaw=smoothstep(-.130,-.061,head.y);
      let skin=mix(vec3f(.088,.068,.043),vec3f(.481,.343,.184),warm*(.57+.43*cheek)*jaw);
      let cloth=mix(vec3f(.039,.036,.034),vec3f(.194,.149,.093),(1.-smoothstep(-.13,.12,k.x+.036*(k.y-1.))));
      let pigment=mix(cloth,skin,smoothstep(-.015,.005,suit-headShape));
      let covered=(1.-smoothstep(-.012,.016,sd))*smoothstep(.02,.75,u.misc3.x);
      col=mix(col,pigment,covered);
      col+=GOLD*.021*u.misc3.x*exp(-max(sd,0.)*13.);
`;
