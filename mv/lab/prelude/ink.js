// Six strokes of 字. Each knot records the position and width of the moving brush.
const strokes = [
  [.04,.19, [[.46,.08,.005],[.485,.105,.014],[.516,.153,.021],[.521,.164,.004]]],
  [.24,.42, [[.238,.181,.004],[.24,.212,.012],[.228,.253,.021],[.213,.279,.013],[.208,.286,.003]]],
  [.48,.81, [[.247,.219,.004],[.283,.216,.016],[.46,.204,.015],[.66,.187,.016],[.739,.179,.023],[.76,.186,.024],[.719,.226,.012],[.689,.256,.002]]],
  [.86,1.16, [[.331,.351,.004],[.366,.351,.016],[.496,.33,.015],[.596,.309,.022],[.612,.313,.020],[.553,.378,.011],[.478,.429,.003]]],
  [1.2,1.59, [[.453,.401,.004],[.478,.425,.015],[.51,.492,.019],[.521,.587,.022],[.513,.670,.024],[.494,.718,.027],[.480,.731,.020],[.435,.685,.009],[.419,.671,.002]]],
  [1.64,1.98, [[.167,.549,.004],[.20,.557,.020],[.332,.54,.016],[.533,.51,.018],[.703,.491,.016],[.798,.473,.024],[.829,.485,.012],[.834,.49,.002]]]
];
function knot(pts,u) {
  const f = Math.min(1,Math.max(0,u))*(pts.length-1), i = Math.min(pts.length-2,Math.floor(f)), s=f-i;
  const a=pts[Math.max(0,i-1)], b=pts[i], c=pts[i+1], d=pts[Math.min(pts.length-1,i+2)];
  return b.map((v,k)=>.5*(2*v+(-a[k]+c[k])*s+(2*a[k]-5*v+4*c[k]-d[k])*s*s+(-a[k]+3*v-3*c[k]+d[k])*s*s*s));
}
export function brush(t) {
  for (let i=0;i<strokes.length;i++){
    const [a,b,p]=strokes[i];
    if(t>=a && t<=b) return [...knot(p,(t-a)/(b-a)),0];
    if(t<a) {
      const last=i?strokes[i-1]:[0,0,[[p[0][0]+.03,p[0][1]-.08,0]]];
      const u=Math.max(0,(t-last[1])/(a-last[1])), f=u*u*(3-2*u), prev=last[2].at(-1);
      return [prev[0]+(p[0][0]-prev[0])*f,prev[1]+(p[0][1]-prev[1])*f,.003,Math.sin(Math.PI*u)];
    }
  }
  const q=strokes.at(-1)[2].at(-1), f=Math.min(1,(t-1.98)/.42);
  return [q[0]+f*f*.67,q[1]-f*f*.79,.002,f];
}
export function writeInk() {
  const size=768, cv=new OffscreenCanvas(size,size), ctx=cv.getContext("2d"), out=ctx.createImageData(size,size), pixels=out.data;
  for(let i=0;i<pixels.length;i+=4){pixels[i+1]=255;pixels[i+3]=255;}
  for(const [a,b,pts] of strokes){
    for(let j=0;j<=310;j++){
      const u=j/310, [nx,ny,r]=knot(pts,u), rad=Math.max(.8,r*size), x=nx*size, y=ny*size;
      const ahead=knot(pts,Math.min(1,u+.009)), len=Math.hypot(ahead[0]-nx,ahead[1]-ny)||1;
      const normal=[(ahead[1]-ny)/len,(nx-ahead[0])/len];
      for(let py=Math.max(0,Math.floor(y-rad*1.3));py<=Math.min(size-1,Math.ceil(y+rad*1.3));py++){
        for(let px=Math.max(0,Math.floor(x-rad*1.4));px<=Math.min(size-1,Math.ceil(x+rad*1.4));px++){
          const dx=(px-x)/rad, dy=(py-y)/rad, near=Math.hypot(dx*.88+dy*.14,dy*1.02);
          const edge=1-near+.033*Math.sin(54*nx+px*.67+py*.37)+.022*Math.sin(py*2.04-px*.56);
          if(edge<=0)continue;
          const k=4*(py*size+px), dry=.85+.13*Math.sin((py+.20*px)*1.23+.8*Math.sin(nx*15));
          const striation=Math.cos((dx*normal[0]+dy*normal[1])*25+u*2.3);
          const split=Math.max(0,(striation-.79)*3)*Math.min(1,near*1.3)*Math.sin(Math.PI*u)**2;
          const ink=Math.min(1,edge*9)*(.97-.30*(1-dry)*near-.31*split);
          pixels[k]=Math.max(pixels[k],Math.round(255*ink));
          pixels[k+1]=Math.min(pixels[k+1],Math.round((a+(b-a)*u)/2*252));
        }
      }
    }
  }
  ctx.putImageData(out,0,0);return cv.transferToImageBitmap();
}
