import {makeTidalMesh,makeTidalDrawing} from "./tidal-mesh.js";

self.onmessage=({data:drawing})=>{
  const mesh=drawing?makeTidalDrawing():makeTidalMesh();
  self.postMessage(mesh,[mesh.vertices.buffer,mesh.indices.buffer]);
};
