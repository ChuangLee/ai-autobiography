// Keep surface reconstruction off the music player's main thread.
const pending=new Map();
export function loadTidalMesh(drawing=false){
  if(!pending.has(drawing)){
    const task=new Promise((resolve,reject)=>{
      const worker=new Worker(new URL("./tidal-worker.js",import.meta.url),{type:"module"});
      worker.onmessage=({data})=>{worker.terminate();resolve(data);};
      worker.onerror=event=>{worker.terminate();reject(new Error(event.message||"巨像曲面载入失败"));};
      worker.postMessage(drawing);
    }).catch(()=>import("./tidal-mesh.js").then(m=>drawing?m.makeTidalDrawing():m.makeTidalMesh()));
    pending.set(drawing,task);
  }
  return pending.get(drawing);
}
