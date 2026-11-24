# windows: archived versions

Kept for reuse; not wired into the page. Each set is a consistent snapshot (rename back to `index.html`, `scene.wgsl.js`, `room.wgsl.js` to run it).

- `onetake-v1.*` — the first version: one continuous pull-back from a window to the sea (camera curves in the page, single city shader).
- `cuts-v2.*` — the hard-cut edit: a `SHOTS` array of 19 short shots (three exterior windows in quick succession, inside form, inside release, three rooms on the beat, over-the-shoulder, three sea shots). Shot definitions there (`ext(...)`, room cameras, `figAmt`) can be copied into the current timeline.
- `moon-v3.*` — two continuous camera moves with one dissolve; 月印万川 version: a moon in every dark pane and puddle, over-the-shoulder ink room, then the camera flies out through the gold figure and the glass, the city sinks into a photoreal moonlit sea (down to the wave crests and back up to the moon's road). The photoreal sea, the city-to-sea change (`u.s`, `u.hs`, `seaH`, `traceGround`, `lightField`) and the moon-in-panes code are all still in `scene.wgsl.js`; `layerB`/`KB`/`KB2` in this snapshot drive them.

The current page (`index.html`, `scene.wgsl.js`, `room.wgsl.js`, `paint.wgsl.js`) no longer shows the photoreal sea or the moon-in-panes; use `moon-v3.*` (or `onetake-v1.*` for the original single pull-back to the sea) to get them back.
