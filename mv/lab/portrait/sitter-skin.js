// Coordinates travel with the face. Optical width integrates fine marks across
// a pixel when the sitter is small, so individual hairs do not sparkle.
export const skinFinish = `
fn sitterBell(v:f32)->f32{return exp(-v*v);}
fn sitterBrowY(x:f32)->f32 {
  return .221+.031*sitterBell((x-.29)/.16)-.019*smoothstep(.38,.53,x);
}
fn browFilaments(p:vec2f,side:f32,pixel:f32)->f32{
  if(p.x<.09 || p.x>.545 || abs(p.y-sitterBrowY(p.x))>.073){return 0.;}
  let pitch=.0093;
  let col=i32(floor((p.x-.119)/pitch));
  var opacity=0.;
  for(var j=-6;j<=1;j++){
    let index=col+j;let cell=f32(index);
    for(var layer=0;layer<2;layer++){
      let seed=cell*13.+f32(layer)*73.+side*8.3;
      let rnd=hash22(vec2f(seed,.83));
      let x=.119+(cell+.45*rnd.x)*pitch;
      let u=clamp((x-.11)/.406,0.,1.);
      let density=smoothstep(.11,.155,x)*(1.-smoothstep(.46,.528,x));
      let width=mix(.031,.013,u);
      let root=vec2f(x,sitterBrowY(x)-width*.67+width*(rnd.y-.30)+.0045*side);
      let direction=vec2f(.009+.040*u+.010*rnd.y,.032-.041*u+.009*rnd.x);
      let t=clamp(dot(p-root,direction)/dot(direction,direction),0.,1.);
      let curve=root+t*direction+vec2f(0.,.005)*sin(3.14159*t);
      let r=mix(.00165,.00036,t)*(.7+.55*rnd.x);
      let aa=max(.0004,pixel*.58);
      let cover=r/(aa+r)*(1.-smoothstep(0.,aa+r,length(p-curve)));
      opacity+=cover*density*(.65+.35*rnd.y);
    }
  }
  return 1.-exp(-opacity*1.8);
}
fn skinFinish(p:vec3f,n:vec3f,towardLight:vec3f,base:vec3f,pixel:f32)->vec3f{
  let a=abs(p.x);let side=sign(p.x);let facial=smoothstep(.12,.36,p.z);
  let poresVisible=1.-smoothstep(.002,.009,pixel);
  let marksVisible=1.-smoothstep(.006,.029,pixel);
  let cheek=sitterBell((a-.395)/.187)*sitterBell((p.y+.137)/.196);
  let nose=sitterBell(a/.14)*sitterBell((p.y+.18)/.15);
  let lipArea=sitterBell((a-.14)/.147)*sitterBell((p.y+.48)/.11);
  let tooth=vnoise3(p*151.)-.5;
  let mottling=vnoise3(p*21.+vec3f(7.))-.5;
  let pore=smoothstep(.48,.81,vnoise3(p*179.+vec3f(tooth*.57)));
  var c=base*(1.+facial*(.088*mottling-(.027+.13*cheek+.085*nose)*pore*poresVisible));
  c+=vec3f(.014,.004,-.003)*cheek*mottling*facial;
  if(facial<.01){return c;}
  let brow=browFilaments(vec2f(a,p.y),side,max(pixel,.0002));
  c=mix(c,c*vec3f(.29,.24,.19),brow*facial);
  let x=(a-.285)/.17;
  let orb=sitterBell(x);
  let lower=.027+.021*x+.033*x*x+.004*side;
  let broken=.4+.6*smoothstep(.25,.72,vnoise(p.xy*67.));
  let wrinkle=sitterBell((p.y-lower+.017)/.005)*orb*broken;
  let outer=smoothstep(.38,.44,a)*(1.-smoothstep(.53,.60,a));
  let ray=p.y-.073+(a-.413)*.30;
  let eyeCorner=outer*(sitterBell(ray/.005)+.6*sitterBell((ray+(a-.40)*.28+.011)/.005));
  let nasoX=.13+.55*clamp(-p.y-.245,0.,.32);
  let naso=sitterBell((a-nasoX)/.014)*sitterBell((p.y+.391)/.107);
  let light=smoothstep(-.15,.65,dot(n,towardLight));
  c*=1.-facial*marksVisible*(.11*wrinkle+.084*eyeCorner+.067*naso)*(.60+.40*light);
  let stubble=lipArea*poresVisible*smoothstep(.61,.82,vnoise3(p*197.));
  return c*(1.-.035*stubble*facial);
}`;
