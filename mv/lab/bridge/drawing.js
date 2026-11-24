// All paths are in the same 1280 × 720 drawing. Curves are flattened once at startup.
export class Drawing {
  constructor() { this.data = []; }
  vertex(p, material, group) { this.data.push(p[0], p[1], material, group); }
  polygon(points, material, group = 0) {
    const edges = [], rows = [...new Set(points.map(p => p[1]))].sort((a,b) => a-b);
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i+1) % points.length];
      if (a[1] !== b[1]) edges.push([a,b]);
    }
    const xAt = ([a,b], y) => a[0] + (b[0]-a[0]) * ((y-a[1])/(b[1]-a[1]));
    for (let i=1; i<rows.length; i++) {
      const y0=rows[i-1], y1=rows[i], mid=(y0+y1)*.5;
      const active=edges.filter(([a,b]) => (a[1]>mid)!==(b[1]>mid)).sort((a,b) => xAt(a,mid)-xAt(b,mid));
      for(let k=0;k+1<active.length;k+=2){
        const a=[xAt(active[k],y0),y0], b=[xAt(active[k+1],y0),y0];
        const c=[xAt(active[k+1],y1),y1], d=[xAt(active[k],y1),y1];
        for(const p of [a,b,c,a,c,d]) this.vertex(p,material,group);
      }
    }
  }
  curve(spec) {
    const tokens = spec.match(/[MLQCZ]|-?(?:\d*\.)?\d+/g);
    const points=[]; let i=0;
    const pair=()=>[+tokens[i++],+tokens[i++]];
    while (i<tokens.length) {
      const cmd=tokens[i++];
      if(cmd==='Z') break;
      if(cmd==='M'||cmd==='L'){points.push(pair());continue;}
      const p=points.at(-1), b=pair(), c=pair(), d=cmd==='C'?pair():c;
      const length=Math.hypot(b[0]-p[0],b[1]-p[1])+Math.hypot(c[0]-b[0],c[1]-b[1])+Math.hypot(d[0]-c[0],d[1]-c[1]);
      const n=Math.max(3,Math.min(22,Math.ceil(length/8)));
      for(let k=1;k<=n;k++){const t=k/n, h=1-t;points.push([0,1].map(j=>cmd==='C'?h*h*h*p[j]+3*h*h*t*b[j]+3*h*t*t*c[j]+t*t*t*d[j]:h*h*p[j]+2*h*t*b[j]+t*t*c[j]));}
    }
    return points;
  }
  path(material,group,spec){this.polygon(this.curve(spec),material,group);}
  stroke(material,group,width,spec){this.ribbon(this.curve(spec),material,group,width,width*.66);}
  ribbon(points,material,group,start,end){
    let previous;
    for(let i=0;i<points.length;i++){
      const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
      const dx=b[0]-a[0],dy=b[1]-a[1],scale=(start+(end-start)*i/(points.length-1))*.5/(Math.hypot(dx,dy)||1);
      const left=[p[0]-dy*scale,p[1]+dx*scale],right=[p[0]+dy*scale,p[1]-dx*scale];
      if(previous) for(const q of [previous[0],previous[1],right,previous[0],right,left]) this.vertex(q,material,group);
      previous=[left,right];
    }
  }
}
export function orchard(mesh) {
  let seed=48291;
  const random=()=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
  const sprites=[];
  const leaf=(x,y,w,h,angle,kind,layer) => sprites.push(x,y,w,h,angle,kind,random(),layer);
  const b = (x,y,ang,len,width,depth,shade) => {
    const bend=(random()-.52)*.64, mid=ang+bend*.46, tail=ang+bend;
    const p=[[x,y],[x+Math.cos(ang)*len*.30,y+Math.sin(ang)*len*.30]];
    p.push([p[1][0]+Math.cos(mid)*len*.38,p[1][1]+Math.sin(mid)*len*.38]);
    const ex=p[2][0]+Math.cos(tail)*len*.32, ey=p[2][1]+Math.sin(tail)*len*.32; p.push([ex,ey]);
    mesh.ribbon(p,1,0,width,width*.63);
    if(width>4) mesh.ribbon(p.map(q=>[q[0]+width*.16,q[1]-width*.12]),2,0,width*.20,width*.10);
    if(width>2.5) mesh.ribbon(p.map(q=>[q[0],q[1]-width*.31]),3,0,width*.24,width*.065);
    if(depth<3){
      const radius=17+depth*4;
      for(let k=0;k<32;k++){
        const th=random()*6.283,rd=Math.sqrt(random())*radius,w=3+random()*5;
        leaf(ex+Math.cos(th)*rd,ey+Math.sin(th)*rd*.64,w,w*(.42+random()*.3),th+random(),0,shade+Math.sin(th)*.11);
      }
      for(let k=0;k<4;k++)leaf(ex+(random()-.5)*radius*1.6,ey+(random()-.5)*radius,3+random()*3,4+random()*2,random()*6.28,1,shade);
      if(random()>.40)leaf(ex,ey+5,3.4+random()*3,4.2+random()*3,random()*6.28,2,shade);
    }
    if(!depth)return;
    b(ex,ey,tail-.24-random()*.48,len*(.58+random()*.16),width*.58,depth-1,shade-.035);
    b(ex,ey,tail+.26+random()*.48,len*(.58+random()*.16),width*.56,depth-1,shade+.025);
    if(depth>=3)b(p[2][0],p[2][1],tail+(random()-.5)*.75,len*.70,width*.47,depth-1,shade+.08);
  };
  mesh.path(1,0,'M 347 560 Q 380 548 375 495 C 368 456 339 408 353 358 Q 366 315 355 286 Q 378 305 376 343 C 373 374 375 394 392 410 Q 399 374 424 366 Q 407 389 407 441 C 410 487 404 533 443 555 Q 415 550 401 553 L 386 561 L 380 555 Z');
  mesh.path(2,0,'M 383 548 C 395 498 370 464 366 426 Q 368 455 385 470 Q 377 431 361 408 C 369 416 393 433 395 456 Q 400 491 397 511 Q 397 536 407 549 Z');
  for(let k=0;k<16;k++){
    const x=378+random()*21, y=454+random()*68;
    mesh.stroke(k%3?4:2,0,.7+random()*1.2,`M ${x} ${y} Q ${x+7} ${y+13} ${x+2} ${y+26}`);
  }
  b(365,410,-2.59,103,28,5,.08); b(362,369,-1.99,115,24,5,.27); b(362,335,-1.43,105,20,5,.49);
  b(391,416,-.82,111,24,5,.35); b(399,431,-.35,89,15,4,.15);
  for(let i=0;i<54;i++){
    const x=random()*1370-45, y=520+random()*223;
    const blades=3+Math.floor(random()*5), size=4+(y-520)*.056;
    for(let k=0;k<blades;k++)leaf(x+(random()-.5)*size*1.6,y+(random()-.5)*size*.7,size*.74,size*(.67+.66*random()),(random()-.5)*.46,4,random());
  }
  for(let i=0;i<390;i++)leaf(195+random()*590,75+random()*435,2+random()*5,2+random()*4,random()*6.28,3,random());
  return new Float32Array(sprites);
}

// The running silhouettes from the shore settle onto the first forks of the tree.
export function afterimages(mesh) {
  const paths=[
    [50,'M -3 -33 L 6 -40 L 16 -35 L 14 -27 L 5 -25 Z'],
    [51,'M -2 -27 L 9 -28 L 5 -9 L -4 -2 L -13 -5 L -8 -19 Z'],
    [50,'M -5 -7 L 2 -3 L -11 12 L -24 16 L -29 14 L -15 7 Z'],
    [51,'M -4 -2 L 2 -5 L 16 2 L 20 18 L 16 20 L 11 7 L -4 6 Z'],
    [50,'M 1 -25 L 6 -26 L 15 -18 L 26 -25 L 28 -22 L 16 -13 L 11 -14 Z'],
    [51,'M -7 -23 L -2 -25 L -14 -15 L -25 -15 L -25 -19 L -16 -20 Z']
  ];
  for(let g=7;g<15;g++)for(const [m,s] of paths)mesh.path(m,g,s);
}
