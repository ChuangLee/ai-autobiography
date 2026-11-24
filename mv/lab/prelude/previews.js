import {FS_VS,NOISE,M4,norm,sub,cross,sm,lerp,clamp,qn,mipTexture} from "../lib.js";
import {GLYPHS,SKY} from "../verse3/cloud.js";
import {HEAD,UBYTES} from "../verse3/common.js";
import {SURFACE,COMPOSE} from "../dive/render.js";

// The same two ink-to-ice shaders and letter atlas as the manuscript scene.
// Their positions depend only on time, so a seek needs no simulation history.
export function poem(g,G,atlas,sentence) {
  const sentenceMap=mipTexture(g.device,sentence.canvas.transferToImageBitmap()).createView();
  const sky=G.pipeline(FS_VS+NOISE+HEAD+SKY,"裂痕"), skyU=G.uniform(UBYTES);
  const skyBG=G.bind(sky,[{buffer:skyU},G.lin,sentenceMap]);
  const words=G.pipeline(NOISE+HEAD+GLYPHS,"诗云",{
    vertex:{buffers:[{arrayStride:16,stepMode:"instance",attributes:[{shaderLocation:0,offset:0,format:"float32x4"}]}]},
    primitive:{topology:"triangle-strip"},blend:{color:{srcFactor:"one",dstFactor:"one"},alpha:{srcFactor:"zero",dstFactor:"one"}}
  });
  const wordU=G.uniform(UBYTES), wordBG=G.bind(words,[{buffer:wordU},atlas.sampler,atlas.tex.createView()]);
  const count=Math.max(1024,Math.round(qn("n",105000))), seed=new Float32Array(count*4);
  let state=861; const rnd=()=>(state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296;
  const ids=atlas.info.glyphs.filter(x=>!["symbol","word"].includes(x.group)).map(x=>x.i);
  for(let i=0;i<count;i++){const j=Math.floor(rnd()*sentence.n), target=rnd()<.72;
    seed.set([i*1.37+rnd()*7,ids[Math.floor(ids.length*rnd())],target?sentence.pts[j*2]:-1,target?sentence.pts[j*2+1]:-1],4*i);}
  const buf=g.device.createBuffer({size:seed.byteLength,usage:GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST});
  g.device.queue.writeBuffer(buf,0,seed);
  const T=Math.tan(20*Math.PI/180), asp=G.w/G.h;
  function cam(t){const f=sm(100.38,101.74,t),e=lerp(74,27,f)*Math.PI/180;
    const d=Math.exp(lerp(Math.log(200),Math.log(760),sm(100.35,101.72,t))), y=d*.2*f;
    const pos=[.03,y+d*Math.sin(e),d*Math.cos(e)], aim=[.03,y,0], fw=norm(sub(aim,pos)), rt=norm(cross(fw,[0,1,0])),up=cross(rt,fw);
    return {pos,d,fw,rt,up,vp:M4.mul(M4.persp(40*Math.PI/180,asp,d*.003,d*22),M4.look(pos,aim))};}
  const end=cam(102), mul=(v,k)=>v.map(x=>x*k), lineD=end.d*.55;
  function data(t,c,slots){const v=new Float32Array(UBYTES/4);v.set([...c.pos,t,...mul(c.rt,T*asp),G.w,...mul(c.up,T),G.h,...c.fw,1,...c.vp]);
    slots.forEach(([i,...row])=>v.set(row,32+i*4));return v;}
  const crack=[];for(let k=0;k<sentence.crack.length;k+=2){const v=sentence.crack[k];crack.push([4+k/2,...v,...(sentence.crack[k+1]||v)]);}
  return (enc,target,s)=>{
    const t=lerp(100.48,103.43,clamp((s-5.88)/4.67)),c=cam(t),grow=sm(102.16,102.82,t),ice=sm(102.45,103.20,t);
    G.write(skyU,data(t,c,[[0,1-.65*grow,.52*(1-sm(101.55,102.30,t)),grow,1.2],[1,ice,0,0,0],[2,.12,.10,.88,.9],[3,t-98.6],...crack]));
    G.write(wordU,data(t,c,[[0,t-98.6,1-sm(102.97,103.56,t),0,0],[1,2*T/G.h,.5+.02*c.d,0,0],[2,...end.pos,lineD],[3,...mul(end.rt,T*asp)],[4,...mul(end.up,T)],[5,...end.fw],[6,101.5,1.05,.003,1-.85*ice]]));
    const p=G.pass(enc,target);p.setPipeline(sky);p.setBindGroup(0,skyBG);p.draw(3);p.setPipeline(words);p.setBindGroup(0,wordBG);p.setVertexBuffer(0,buf);p.draw(4,count);p.end();
  };
}

// Above the water there is no dye volume. The beak, body and 96 feather sheets
// still land in the real depth buffer used by the interlude's mineral landscape.
export function peng(g,G) {
  const depth=G.texture("depth32float"),body=G.texture("rgba16float"),empty=G.texture("rgba8unorm",1,1);
  const geo=G.pipeline(SURFACE,"鹏的羽片",{depthStencil:{format:"depth32float",depthWriteEnabled:true,depthCompare:"less"}});
  const comp=G.pipeline(COMPOSE,"青绿山水"), pose=G.uniform(160), paint=G.uniform(144);
  const geoBG=G.bind(geo,[{buffer:pose}]),compBG=G.bind(comp,[{buffer:paint},G.lin,empty,empty,body]);
  return (enc,target,s)=>{
    const k=clamp((s-10.18)/4.27), tilt=lerp(.53,.12,sm(.18,.88,k));
    const ax=norm([.56,tilt,-.82]), az=norm(cross(ax,[0,1,0])), ay=cross(az,ax);
    const pos=[(k-.4)*1.24,lerp(-1.20,2.0,sm(.00,.77,k)),-1.8*k];
    const lens=lerp(46,40,k)*Math.PI/180;
    const ro=[4.42+2.8*k,1.03+3.8*k,9.85+1.3*k],ta=[pos[0],Math.max(.38,pos[1]+.14),pos[2]];
    const vp=M4.mul(M4.persp(lens,G.w/G.h,.08,90),M4.look(ro,ta)),fw=norm(sub(ta,ro));
    function project(v){const c=[0,1,3].map(i=>vp[i]*v[0]+vp[i+4]*v[1]+vp[i+8]*v[2]+vp[i+12]);return [.5+.5*c[0]/c[2],.5-.5*c[1]/c[2],c[2]];}
    const bird=project(pos), surf=project([0,0,-.50]), t=150.25+4.1*k;
    G.write(pose,[...vp,...pos,1,...ax,t,...ay,1,...az,0,0,1.9*(t-146),0,.44,1,0,0,0]);
    const pass=G.pass(enc,body,depth);pass.setPipeline(geo);pass.setBindGroup(0,geoBG);pass.draw(60*32*6,1);pass.draw(14*5*6,99,0,1);pass.end();
    const eyes=[1,-1].flatMap(side=>{const e=pos.map((v,i)=>v+ax[i]*1.91+ay[i]*.57+az[i]*side*.30),q=project(e);const facing=side*az.reduce((acc,v,i)=>acc+v*(ro[i]-e[i]),0);return [q[0],q[1],.054/q[2]/Math.tan(lens/2),sm(.05,1.5,facing)];});
    const hor=clamp(.5+.5*fw[1]/Math.sqrt(1-fw[1]*fw[1])/Math.tan(lens/2),-.4,1.35);
    G.write(paint,[t,G.w,G.h,0,118.89,3.2,1,1,1,1,hor,151.10,...surf.slice(0,2),1,0,.60,.455,0,0,...eyes,...bird.slice(0,2),1.3/(bird[2]*Math.tan(lens/2)),sm(.02,.32,k)*(1-sm(.64,.99,k)),1+.67*k,bird[2],1,0]);
    const final=G.pass(enc,target);final.setPipeline(comp);final.setBindGroup(0,compBG);final.draw(3);final.end();
  };
}
