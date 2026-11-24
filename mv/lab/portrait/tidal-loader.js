// Keep surface reconstruction off the music player's main thread.
let pending;
export function loadTidalMesh(){
  if(!pending){
    pending=new Promise((resolve,reject)=>{
      const worker=new Worker(new URL("./tidal-worker.js",import.meta.url),{type:"module"});
      worker.onmessage=({data})=>{worker.terminate();resolve(data);};
      worker.onerror=event=>{worker.terminate();reject(new Error(event.message||"巨像曲面载入失败"));};
      worker.postMessage(null);
    }).catch(()=>import("./tidal-mesh.js").then(m=>m.makeTidalMesh()));
  }
  return pending;
}
