import {makeTidalMesh} from "./tidal-mesh.js";

self.onmessage=()=>{
  const mesh=makeTidalMesh();
  self.postMessage(mesh,[mesh.vertices.buffer,mesh.indices.buffer]);
};
