import {createPortraitShot} from "./shot-renderer.js";
import {createSitterCamera} from "./sitter-camera.js";
import {NIGHT, WATER_VEIL, FLOW, PORTAL} from "./sitter-water.js";

export async function createSitterShot(g,atlas){
  let actor, facePoint;
  if(new URLSearchParams(location.search).get("head")==="cage"){
    const [shape,material]=await Promise.all([import("./sitter-mesh.js"),import("./sitter-paint.js")]);
    actor={makeMesh:shape.makeSitterMesh,paint:material.sitterPaint};
    facePoint=shape.sitterFacePoint;
  }else{
    const [scan,material]=await Promise.all([import("./scan-mesh.js").then(m=>m.buildScan(g.device)),import("./scan-paint.js")]);
    actor={makeMesh:()=>scan.mesh,chest:scan.chest,detailView:scan.detailView,paint:material.scanPaint};
    facePoint=scan.at;
  }
  return createPortraitShot(g,atlas,{
    ...actor,...createSitterCamera(facePoint),
    continueIntoWindows:new URLSearchParams(location.search).has("film"),
    night:NIGHT,water:WATER_VEIL,flow:FLOW,portal:PORTAL,portalSize:64,flowCount:1680,
    finish:{bloom:.18,threshold:1.15,knee:.35,tonemap:.78,exposure:1,grain:.012,vignette:.23}
  });
}
