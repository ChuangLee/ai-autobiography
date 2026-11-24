// A cast thread of paint leaves an elliptical pool when the wrist slows.
// Coordinates extend beyond the visible paper as the camera draws back.
export function pourPlate() {
  const w=1536,h=864, canvas=new OffscreenCanvas(w,h), x=canvas.getContext("2d");
  let state=0x43e19;
  const random=()=>((state=(Math.imul(1664525,state)+1013904223)>>>0)/4294967296);
  const palette=["#25251f","#3d3830","#375d61","#93513b","#b29a6c","#dbcbae"];
  for(let i=0;i<138;i++){
    const dye=palette[Math.floor(random()**1.5*palette.length)];
    let px=w*random(),py=h*(.17+.85*random()),angle=random()*Math.PI*2;
    let spin=(random()-.5)*.21;
    const wave=random()*6.28, speed=3+random()*6, width=.65+random()**3*5;
    x.fillStyle=dye; x.strokeStyle=dye; x.lineCap="round";
    const length=32+Math.floor(random()*105);
    for(let j=0;j<length;j++){
      spin=spin*.956+.021*Math.sin(j*.091+wave)+.024*(random()-.5);
      angle+=spin;
      const v=speed*(.74+.30*Math.cos(j*.073+wave))+.2;
      const nx=px+v*Math.cos(angle),ny=py+v*Math.sin(angle)*.77+.44;
      x.lineWidth=width*(.28+1.19/(.5+v/speed))*(.93+.1*random())*Math.min(1.,(j+1)/4,(length-j)/6);
      x.beginPath();x.moveTo(px,py);x.lineTo(nx,ny);x.stroke();
      if(random()<.038){
        const radius=width*(.3+random()*.78);
        const distance=(random()-.5)*33;
        x.beginPath();x.ellipse(nx+Math.sin(angle)*distance,ny-Math.cos(angle)*distance,radius*1.6,radius,angle,0,2*Math.PI);x.fill();
      }
      px=nx;py=ny;
    }
  }
  return canvas.transferToImageBitmap();
}
