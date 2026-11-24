const params=new URLSearchParams(location.search);
const variants={tidal:["海上半身 · 素模","./tidal-study.js"],planes:["雕塑","./planes.js"],wash:["水墨","./wash.js"],light:["内光","./light.js"]};
const study=Object.hasOwn(variants,params.get("study")) ? params.get("study") : "planes";
const [title,url]=variants[study];
// The bronze scene orbits its camera; the ink and light studies turn their model.
const direction=study==="planes" ? -1 : 1;
const canvas=document.querySelector("canvas"),range=document.querySelector("input"),value=document.querySelector("output"),status=document.getElementById("error");
if(study==="tidal"){range.min=-100;range.max=100;}
const initial={left:-20,front:0,right:36};
document.querySelector("h1").textContent="巨像 · "+title;
range.value=initial[params.get("view")]||0;
const capture=params.has("capture");
if(capture){
  document.documentElement.classList.add("capture");
  canvas.width=canvas.height=480;
}
function failure(error){window.__err=error.message||String(error);status.textContent="画面未能启动。"+window.__err+"　可返回对照页查看实帧。";}
addEventListener("unhandledrejection",e=>failure(e.reason));
try{
  const {create}=await import(url);
  const model=await create(canvas);
  addEventListener("pagehide",e=>{if(!e.persisted)model.dispose?.();},{once:true});
  window.__at=async degree=>{
    range.value=degree;
    value.textContent=Math.round(+range.value)+"°";
    await model.draw(direction*range.value*Math.PI/180,4);
    return window.__err||"ok";
  };
  status.textContent="";
  await window.__at(+range.value);
  document.title="ready";
  let painting=false;
  function repaint(){
    value.textContent=Math.round(+range.value)+"°";
    if(painting)return;
    painting=true;
    requestAnimationFrame(async()=>{
      const degree=+range.value;
      try{await window.__at(degree);}
      catch(error){failure(error);}
      finally{
        painting=false;
        if(+range.value!==degree)repaint();
      }
    });
  }
  range.addEventListener("input",repaint);
  canvas.addEventListener("pointerdown",e=>{
    const x=e.clientX,begin=+range.value;
    canvas.setPointerCapture(e.pointerId);
    const move=event=>{
      range.value=begin+(event.clientX-x)*70/canvas.clientWidth;
      repaint();
    };
    const end=()=>{canvas.removeEventListener("pointermove",move);canvas.removeEventListener("lostpointercapture",end);};
    canvas.addEventListener("pointermove",move);canvas.addEventListener("lostpointercapture",end);
  });
}catch(e){failure(e);}
