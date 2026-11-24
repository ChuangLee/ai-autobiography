// Nearside layout based on the Galileo and MISR observations:
// https://science.nasa.gov/photojournal/earths-moon/
// https://science.nasa.gov/photojournal/misr-views-the-moon/
export const TIDAL_SKY=`
fn basin(p:vec2f,c:vec2f,wh:vec2f)->f32{
 let q=(p-c)/wh;return 1.-smoothstep(.73,1.09,length(q));
}
fn lunarCrater(p:vec2f,scale:f32,grain:f32)->f32{
 let cell=p*scale;let tile=floor(cell);let offset=hash22(tile+scale);
 let r=.10+.23*offset.x;
 let local=(fract(cell)-(.32+.36*offset))/r;
 let radius=length(local)+.055*grain;let facing=dot(normalize(local+vec2f(.0001)),vec2f(-.62,.78));
 let rim=bell((radius-.95)/.13);let wall=bell((radius-.78)/.18);
 return rim*(.40+.60*facing)-wall*(.31+.60*facing)-.09*(1.-smoothstep(.46,.84,radius));
}
fn lunarDisk(q:vec2f)->vec3f{
 let z=sqrt(max(0.,1.-dot(q,q)));
 let chart=vec2f(atan2(q.x,max(z,.003)),asin(clamp(q.y,-1.,1.)));
 let broad=fbm(chart*7.1+vec2f(11.5,3.7));let grit=vnoise(chart*93.+11.);
 let broken=vec2f(broad-.49,cloud(chart*15.+4.)-.5);
 let p=q+.112*broken+.023*(vec2f(grit,1.-grit)-.5);
 // Imbrium and Procellarum meet in the west; Serenitatis, Tranquillitatis
 // and the smaller, isolated Crisium read progressively farther east.
 let west=max(basin(p,vec2f(-.21,.55),vec2f(.34,.255)),.9*basin(p,vec2f(-.65,.19),vec2f(.32,.50)));
 let east=max(basin(p,vec2f(.25,.43),vec2f(.206,.192)),.94*basin(p,vec2f(.48,.16),vec2f(.245,.200)));
 let seas=max(max(west,east),max(.94*basin(p,vec2f(.818,.293),vec2f(.089,.146)),.7*basin(p,vec2f(.76,-.062),vec2f(.141,.15))));
 let eject=p-vec2f(-.31,.163);let a=atan2(eject.y,eject.x);
 let spray=pow(.5+.5*cos(19.*a+1.8*sin(7.*a)+.9*sin(59.*a)),8.)*exp(-6.6*length(eject))*(.57+.43*grit);
 let craters=(1.-.61*seas)*(.17*lunarCrater(chart,5.3,grit)+.135*lunarCrater(chart,12.4,grit)+.079*lunarCrater(chart,29.7,grit));
 let albedo=(.61+.42*broad+.14*grit-.40*seas+.20*spray+craters);
 let sunlight=.70+.23*z+.16*dot(vec3f(q,z),normalize(vec3f(-.66,.62,.65)));
 return vec3f(.57,.538,.49)*albedo*sunlight;
}

// Two depths of low cloud, lit through their thinning edges. The wind advects
// the density fields slowly relative to the fixed stars and the lunar disc.
fn sky(rd:vec3f,t:f32)->vec3f{
 let az=atan2(rd.x,-rd.z);let h=rd.y;let wind=(t-44.58)*.0022;
 let p=vec2f(az*3.1+wind,h*6.6-.31*az);
 let base=fbm(p+vec2f(5.2,4.1));
 let wisp=cloud(p*3.15+vec2f(-wind*2.,7.4));
 let breaks=fbm(1.37*p+vec2f(14.16,2.55))-.46;
 let billow=clamp((base-.32)*1.47+.24*(wisp-.5)+.16*breaks,0.,1.);
 let edgelight=clamp(2.1*(base-cloud(p*.95+vec2f(5.36,4.28))),-.23,.28);
 let moonP=vec2f(rd.x,rd.y+.006)/max(.1,-rd.z)/.273;let r=length(moonP);
 let backlight=exp(-1.55*abs(r-1.))*exp(-.20*r);
 let haze=exp(-4.23*max(.0,h));
 let scattering=mix(vec3f(.028,.035,.043),vec3f(.085,.077,.068),haze);
 var clear=mix(vec3f(.011,.017,.026),scattering,.24+.57*haze)+vec3f(.083,.071,.056)*backlight;
 if(r<1.012 && rd.z<0.){
    let disk=lunarDisk(moonP);
    clear=mix(clear,disk,(1.-smoothstep(.994,1.01,r))*(.82+.18*smoothstep(.0,.11,h)));
 }
 let mist=.16+.62*smoothstep(.18,.80,billow);
 let silver=vec3f(.115,.112,.111)*(.60+.72*edgelight+backlight*.67);
 let shade=mix(vec3f(.015,.021,.029),silver,.17+.64*smoothstep(.16,.71,billow)*(.49+.51*haze));
 var c=mix(clear,shade,mist)+vec3f(.026,.024,.020)*backlight*(.4+.6*wisp);
 // Backlit shelves and individual tufts carry the haze away from the horizon.
 let flank=smoothstep(.12,.52,abs(az));
 let shelf=.060+.24*abs(az)+.085*(base-.5);
 let along=vec2f(az*6.4+wind*2.,(h-shelf)*17.);
 let tufts=fbm(along+vec2f(-3.24,5.17));
 let vapor=exp(-pow((h-shelf)/(.050+.05*tufts),2.))*smoothstep(.29,.68,tufts);
 c+=vec3f(.072,.067,.060)*vapor*(.13+.87*flank);
 // A broken bank of sea fog obscures the base of the moon and its reflection.
 let hill=cloud(vec2f(az*9.3+1.,8.6+wind));
 let bank=bell((h-.021-.029*(hill-.48))/(.028+.055*hill));
 c=mix(c,vec3f(.074,.077,.078)*(.65+.43*wisp+.26*backlight),bank*(.54+.30*hill));
 return c;
}`;
