// Code that dropped out of the dive scene, kept for reuse. Nothing imports this file.
// 1. HAND and FACE: point distributions (local coords, about 1.8 units tall) for a flock of particles; a,b are vec4 of per-particle hashes.
// 2. GRAINS: pigment as millions of grains advected through the fluid velocity field and splatted (crisp, but reads as grains, not as ink).
export const HAND_FACE = `
fn hand(a:vec4f, b:vec4f, open:f32)->vec3f{
  let s=a.x;
  if(s<.27){ let th=a.y*6.2832; let cz=2.*a.z-1.; let sz=sqrt(1.-cz*cz); let n=vec3f(sz*cos(th),cz,sz*sin(th));
    return vec3f(0.,-.06,0.)+n*vec3f(.37,.45,.11)*(.86+.14*b.x); }
  if(s<.86){ let f=min(floor((s-.27)/.1475),3.); let bx=-.285+f*.19; let ln=.60+.20*sin((f+.55)*.98); let ang=-.21+f*.125;
    let uu=a.y; let curl=.12+(1.-open)*1.5+.08*f; let R=ln/curl; let yy=R*sin(uu*curl); let zz=R*(1.-cos(uu*curl));
    let rad=(.078-.026*uu)*(.82+.18*b.x); let ph=b.y*6.2832; var l=vec3f(rad*cos(ph),yy,zz+rad*sin(ph)*.85);
    let ca=cos(ang); let sa=sin(ang); l=vec3f(l.x*ca+l.y*sa,-l.x*sa+l.y*ca,l.z); return vec3f(bx,.34,0.)+l; }
  if(s<.955){ let uu=a.y; let ln=.50; let curl=.25+(1.-open)*.9; let R=ln/curl; let yy=R*sin(uu*curl); let zz=R*(1.-cos(uu*curl));
    let rad=(.090-.028*uu)*(.82+.18*b.x); let ph=b.y*6.2832; var l=vec3f(rad*cos(ph),yy,zz+rad*sin(ph)*.85);
    let ang=-1.02; let ca=cos(ang); let sa=sin(ang); l=vec3f(l.x*ca+l.y*sa,-l.x*sa+l.y*ca,l.z); return vec3f(-.33,-.26,.04)+l; }
  let uu=a.y; return vec3f((b.x-.5)*(.5-.2*uu)+.05*sin(uu*5.),-.48-uu*uu*2.4,(b.y-.5)*.18-uu*.3);
}
fn faceZ(x:f32, y:f32)->f32{ let e=1.-x*x/(.60*.60)-y*y/(.80*.80); var z=.52*sqrt(max(e,0.));
  z+=.15*exp(-(x*x)/.006)*smoothstep(.28,-.16,y)*smoothstep(-.26,-.14,y)+.07*exp(-((x*x)/.012+(y+.19)*(y+.19)/.006));
  z+=.035*exp(-pow(abs(x)-.27,2.)/.02-pow(y-.30,2.)/.004)-.03*exp(-pow(abs(x)-.25,2.)/.016-pow(y-.15,2.)/.006);
  z+=.045*exp(-x*x/.03-pow(y+.43,2.)/.004)+.03*exp(-x*x/.04-pow(y+.66,2.)/.01); return z; }
fn face(a:vec4f, b:vec4f)->vec3f{   // closed eyes: shell 58 %, then brows, lids, lashes, nose, nostrils, mouth, lips, jaw
  let s=a.x; var x=0.; var y=0.; var j=.012; let sg=select(-1.,1.,b.z>.5); let uu=a.y;
  if(s<.58){ let th=a.y*6.2832; let rr=sqrt(a.z); x=.60*rr*cos(th); y=.80*rr*sin(th); j=0.; if(a.z>.86){ j=.01; } }
  else if(s<.64){ x=sg*(.10+.37*uu); y=.315+.055*sin(3.1416*uu)-.035*uu*uu; j=.014+.012*(1.-uu); }
  else if(s<.72){ x=sg*(.135+.25*uu); y=.150-.050*sin(3.1416*uu); j=.008; }
  else if(s<.75){ x=sg*(.135+.25*uu); y=.150-.050*sin(3.1416*uu)-.012-.02*b.x*sin(3.1416*uu); j=.005; }
  else if(s<.81){ x=sg*(.030+.055*uu*uu); y=.26-.44*uu; j=.012; }
  else if(s<.84){ let an=uu*3.6-.3; x=sg*(.075-.045*cos(an)+.045); y=-.215-.035*sin(an); j=.007; }
  else if(s<.87){ x=(uu*2.-1.)*.20; y=-.425-.012*cos(x/.20*3.1416)+.006; j=.007; }
  else if(s<.89){ x=(uu*2.-1.)*.17; y=-.385+.022*cos(x/.17*1.5708)*(1.-.45*exp(-x*x/.0015)); j=.008; }
  else if(s<.91){ x=(uu*2.-1.)*.15; y=-.492+.03*(x/.15)*(x/.15); j=.009; }
  else { let an=3.1416+uu*3.1416; x=.585*cos(an); y=.79*sin(an); j=.012; }
  x+=(b.x-.5)*2.*j; y+=(b.y-.5)*2.*j; return vec3f(x,y,faceZ(x,y)-.25);
}`;
// grains: struct Q { p:vec4f (xyz, seed), a:vec4f (release time, pigment, drop index, _) }; advect with RK2 through the velocity texture,
// add unequal sinking (.004+.075*seed³) and a two-scale value-noise stir; draw as soft discs of weight sigma/(.87 r²), accumulate
// (rgb = albedo*light*w, a = w) into a float target and composite c = c*exp(-a) + rgb/a*(1-exp(-a)). Mirror in y for the reflection under the surface.
