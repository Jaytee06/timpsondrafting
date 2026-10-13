# Published project models

Project entry points:

- `/viewer?project=model-01`
- `/viewer?project=model-02`
- `/viewer?project=model-03`

Register the owner-provided GLBs in `public/viewer-projects.json`. Set `modelUrl` to the deployed file path (for example `/models/model-02.glb`) after adding the actual file to `public/models/`. Do not publish placeholder files. Increment `version` when changing surface identifiers or model defaults so incompatible finish overrides are not restored. Keep the version unchanged for compatible model updates.

`profileSlug` optionally connects a model to an existing project profile. Farmhouse is mapped to `farmhouse-design-visualization`; the custom residence has a new anonymous model-project page. The project library automatically lists all models with a configured URL. There is no project selector in the viewer. Only configured models appear in the homepage’s horizontally scrollable Interactive models row and project-library cards. Direct links for pending models show a generic unavailable message.

Finish and landscaping preferences are stored in localStorage per project/version. A manually opened GLB under a project link uses that project's preference key; an ordinary uploaded GLB uses its filename/size/last-modified identity. Reset to default writes original finish choices. This is device/browser-local persistence, not cross-device customer accounts.

Place at an address sends unchanged linked presets by project ID, and Cesium fetches the bundled GLB without saving a large handoff or model cache in browser storage. Customized or manually opened models export a material/transform snapshot as GLB and store its binary bytes in IndexedDB before navigating to the Cesium address form. Choosing a property prepares and places that snapshot and then uses Cesium's existing per-property cache. A new handoff replaces the previous handoff to limit browser storage growth. The transfer link is for this browser only, not a public model-sharing URL.

Apple AR uses a snapshot of the same live scene, including current finishes and visible landscaping. Native AR and terrain placement still need device testing with the real GLBs and a working Cesium token.

Checks: `node --test scripts/tests/viewer-customization.test.mjs scripts/tests/walk-movement.test.mjs`, `npm run typecheck`, and `npm run build`.

Public identifiers, labels, model filenames, thumbnails and embedded GLB metadata must be anonymous. Use model-01, model-02 and model-03 consistently; keep owner/client names and specific development names out of shipped data.

The initial catalog uses the latest available owner-authorized models as of 2026-10-03: model-01 (custom residence v23), model-02 (farmhouse walkthrough), model-03 (duplex v06). Dropbox source names and paths are deliberately excluded from shipped metadata. `scripts/anonymize-glb.mjs` rewrites the GLB JSON chunk only, preserving embedded binary geometry/textures and the finish/door configuration.

Only the newest authorized GLB for each project is hosted. Replace it in place and change the asset URL cache key for compatible updates, preserving saved finish preferences. Do not retain model preview exports, review images, or links to them. The current GLBs contain updated front-entry spawn positions and explicit glTF -Z forward axes; both viewers read their authored transforms. Camera height remains 5 feet 7 inches.

## Viewer controls and layout

E / Interact operates doors. Hold Shift to highlight and change the nearest visible finish at any distance, including door surfaces. Scroll while holding Shift to cycle its packaged material variants; release Shift to leave finish mode. Mobile users hold the Finishes button on the right and use the opposite thumb on the left-hand sample strip. Tap a sample or an arrow, or swipe vertically to cycle; touch input supports the second finger while the first remains held. Door interaction retains its 10-foot limit. Drone view disables gravity and collisions: WASD flies in the viewing direction, Space rises, and C descends. Mobile uses the joystick plus Up/Down buttons. Return to walk restores the previous walking position. Applying a finish hides its highlight until another group is targeted or a new hold begins, showing the rendered colors clearly. Named palettes (`THEME_EARTHEN_TUSCAN`, etc.) are discovered alongside the farmhouse’s Warm/Light/Dark variants. The samples use the material’s actual base color and embedded texture, not a generic palette. Original-only surfaces state that no alternatives are packaged.

Finish samples float in a compact transparent strip over the scene without resizing the canvas. Model tools use the right-hand inspector only when finish samples are closed. Touch movement and action buttons have a dedicated bottom toolbar. Terrain placement tools and terrain errors likewise have separate layout space. On small screens the inspector is narrower and scrolls independently.

Shared material/surface groups are still shared: selecting a sample can change multiple surfaces that use that finish. Unique per-door finishes require distinct finish identifiers in the GLB.

## Cesium navigation

Apple AR uses an isolated snapshot with shared material instances preserved. Transmission-based glass is converted to low opacity because the installed USDZ exporter omits transmission; rougher glass retains more opacity. Existing alpha glass keeps its supplied opacity, and opaque appliance glass stays opaque. This approximation affects only the AR export. Customized colors remain in the snapshot. Regression tests inspect the generated USDZ material definitions and geometry sharing. Actual Apple Quick Look opening and rendering require an iPhone/iPad retest; archive generation alone does not prove device loading.

Customized placement patches the source GLB's material bindings and current node transforms, retaining the original embedded geometry and image bytes. This avoids decoding and re-encoding every texture during the handoff, reducing mobile export memory use. Viewer paint variations copy their source material definition with the selected color. Hidden material-library nodes are detached from the exported scene; authored spawn metadata remains intact. Unregistered synthetic scenes retain the generic exporter fallback.

Checks: `scripts/tests/source-glb-export.test.mjs` verifies embedded bytes, per-node finish isolation, transforms, hidden-node removal, and viewer paint definitions. A changed farmhouse finish was exported through the UI, reached address selection, and loaded in Cesium. The reported physical mobile export failure has not been reproduced on a device; a phone retest remains necessary.

Walk house starts at the authored model entry (or the explicitly chosen spawn). Navigation cancels any camera fly-to animation and disables Cesium's automatic camera terrain correction until exit, leaving the walking controller responsible for height. Outdoor terrain updates do not fail the architectural step-height rule; actual model floors and stairs retain that rule. Blocked diagonal movement tries its horizontal components to slide along walls. Surface picking remains a geometry/name heuristic.

Drone view starts at the current camera and flies toward its aim. WASD/arrows move, Space rises, C descends, Q/E are alternate height controls, and Shift increases speed. The camera may look up or down. Flight remains inside the project area, 0.5–120 meters above terrain. Escape returns to the normal map controls.

At phone width or with coarse touch input, walking and drone view use the shared joystick and buttons without pointer lock. Drag the scene to look; walking has Jump, drone has Up/Down. Exit controls restores map interaction, and the mode button switches between walking and drone.

Checks: `node --test scripts/tests/cesium-navigation.test.mjs scripts/tests/walk-movement.test.mjs scripts/tests/model-spawn.test.mjs`. A farmhouse at a public test location was loaded in the browser at phone width; walking entry, joystick motion, switching to drone, and height controls were exercised. Physical phone testing and detailed indoor/stair collision testing remain owner checks.

The farmhouse and single-duplex interactive GLBs were refreshed on 2026-10-06. Their catalog cache keys and finish versions were updated because the exported finish identifiers changed. Embedded binary geometry and textures are preserved during anonymization.

## Screenshot review callouts

On desktop, hold Q and drag the primary mouse button to mark the current view. A virtual cursor begins at the crosshair during pointer lock; drawing consumes mouse-look input and pauses movement without a separate capture step. Release Q to capture the marked screenshot and focus an optional note. Enter saves, Shift+Enter adds a line, and Escape cancels. Click the scene to resume walking after saving.

Review collects independent callouts across views and models in the current viewer session. Notes can be edited or deleted. Export ZIP includes `review.md`, numbered annotated PNG screenshots, and `review.json` with model URL/cache identity, camera position/quaternion, normalized mark coordinates and timestamps. Copy summary copies text only; use ZIP for visual context. No backend or external transmission is involved. Drafts are in memory; export before leaving or reloading. Existing callouts have a browser unload warning. This initial shortcut requires a keyboard and mouse and does not yet provide touch drawing, persistent draft storage, or review import.

Callouts require no room/area entry. The annotated screenshot and JSON camera pose provide location context for an agent with the same model. Copied summaries include camera position in meters and viewing direction, without image links. The ZIP Markdown includes those references and image links; JSON retains the full camera pose.

## Site grade and underground geometry

Export an empty named `GROUND_DATUM` at intended site grade. The Three.js viewer uses its transformed world Y elevation for the ground grid and fallback walking level, independently of pool excavation, foundations or buried tanks. Author in Blender Z-up; the GLB exporter converts the marker to Y-up. Parent transforms are honored, and geometry is not shifted. Actual floor collision surfaces still determine walking height where available.

Without that marker, a numeric `viewerGroundHeightMeters` on `SPAWN_FRONT` is accepted as a ground elevation in exported scene Y-up coordinates (meters). Otherwise legacy models retain the bounding-box minimum fallback. The anonymizer preserves this field. Keep the spawn itself on its walking surface, which can differ from site grade. Include real site geometry with the appropriate pool opening. This change applies to the standalone Three.js viewer; Cesium terrain placement is separate.

## Authored door clips

Nodes tagged `interactionType: "door"` and `animationClip` use their embedded opening clip through E/Interact. Nodes sharing a clip toggle together. Closing samples the same clip in reverse, including sectional and sliding movement. Moving door descendants remain wall-collision candidates and their world transforms update with playback. Legacy named swing doors remain supported. Direct door metadata survives anonymization. This support applies to Three.js; Cesium remains separate.

## Lightweight daylight rendering

The standalone Three.js viewer uses one directional daylight shadow, hemisphere/ambient fill, and a low-intensity packaged RoomEnvironment reflection map. No fixture-light controls, night presets, texture downsampling, or geometry simplification are added. The reflection map is generated once per renderer and disposed on unmount. Sun bounds fit visible building geometry, excluding landscaping/collision/material-library branches, with 2048px desktop and 1024px mobile shadow maps.

Shadow maps are cached while the model is unchanged; model/finish/landscaping changes and moving doors invalidate the cache. Idle door clips no longer resample or update their world matrices every frame; multiple panels sharing a clip reuse the same sample. The October 11 Sierra Bella 4AM GLB was inspected and loaded locally for an exterior rendering check. Its approximately 628k triangles and 2976 mesh primitives are retained; actual frame rate remains hardware/view dependent. Blender/SketchUp presentation lighting and indirect bounce are not reproduced exactly by this lightweight layer. Interior and physical-device visual checks remain required.

Depth separation uses consistent direct lighting: sun intensity 1.8, shadow intensity 0.55, hemisphere fill 0.65, ambient fill 0.08 and directional fill 0.35. The viewer does not add distance fog. Shadow normal bias is 0.015m to keep contact closer to surfaces. These values are presentation settings, not verified physical illumination or Blender bounced lighting.

A low-intensity, unshadowed directional studio fill and reduced uniform ambient fill improve front/side separation on interior cabinetry and trim. The fill is a presentation aid rather than physically simulated indoor illumination; it adds one light calculation but no additional shadow map or rendering pass.

## Rendering continuity and resolution

The stationary-only SSAO introduced in `7c10e45` has been removed. It invalidated shading on camera movement and ran normal/depth, occlusion and blur passes after stopping, then faded the result back in. The replacement below updates continuously, without movement thresholds or a fade. Baked occlusion already authored in a GLB remains available through its materials.

Canvas pixel density is capped at 1.5 on desktop and 1.25 for coarse-pointer devices, with antialiasing enabled and a high-performance GPU preference (a browser hint). At device DPR 2, the desktop cap renders about 44% fewer pixels than the previous default; this reduces pixel workload without changing geometry, textures, collision or exported files. It does not guarantee an FPS improvement on CPU-bound scenes. The ground grid uses subdued neutral lines and a shorter 40m fade distance.

Local Chromium visual checks cover bundled models. Physical iPhone Safari comparison and interior navigation remain necessary before claiming device parity or a measured performance gain.

### Model-03 interior comparison — October 11, 2026

The Shading selector compares Current lighting (the previous local settings), Tuned lighting, and Tuned + depth (default). Camera pose and finishes survive mode changes. Tuned lighting reduces hemisphere fill to 0.48, ambient to 0.04 and environment to 0.12, while increasing directional studio fill to 0.6. Sun and exposure stay at their existing settings. These remain presentation cues, not physical indoor lighting.

`ViewerAmbientOcclusion` uses the installed Three.js r170 GTAOPass on every rendered frame. It computes normals/depth, short-range AO and Poisson denoising, then multiplies the result over the antialiased main canvas. After owner feedback about smudging, AO radius is 0.12m, thickness 0.06m and blend intensity 0.32. Targets use half the CSS viewport dimensions, capped at 720px on the longer side for desktop and 480px for coarse-pointer devices; AO uses 12/8 samples and denoise uses 12/8 samples. Pixel cost is bounded, but the extra geometry pass still costs CPU/GPU work on complex models. No model files, UVs or authored materials are changed.

The grid, finish highlight and transparent/transmissive meshes are excluded from AO depth. Existing hidden model branches remain hidden; visibility and renderer state are restored after the pass. AO resources are disposed on model/renderer changes. Devices without half-float color target support fall back to tuned lighting. Review screenshots call the same render function as navigation so they include the selected shading. Screen-space effects can miss offscreen occluders or show some grain/edge halos; moving and physical-phone checks remain necessary.

In local development only, model-03 exposes Kitchen test view, placing the camera in the ground-floor Unit B kitchen. Use it to compare cabinet fronts, ceiling junctions and door recesses without navigating from the entrance each time. Motion test repeats a 2.4-second lateral camera sweep and returns to its starting pose, making moving comparisons possible even where an automated browser blocks pointer lock. Both shortcuts are excluded from production. Model-03 SHA-256 remains `fcf65b0e0cade212c90d18b4a60e7f3ebc3cede6686018cb8f2c079be695bf82`.

Verification: typecheck, focused ESLint and 16 collision/finish/authored-door/source-export/review-export checks pass. Production Vite build passes. Local browser comparison covers the kitchen with all three shading modes and original/light/warm cabinet finishes; original finish restored afterward. The motion sweep retains AO throughout movement. After adding cursor controls below, local browser dragging and backward walking work without pointer lock. Physical iPhone performance remains a manual check; no FPS gain is claimed.

### Cursor navigation

Desktop navigation defaults to clicking the scene to capture the mouse, free mouse movement to look, WASD movement and E/Shift interactions. Escape releases capture/stops navigation. If the browser rejects capture, the footer explicitly reports that drag-to-look is available; navigation keys remain usable. A deliberate drag does not request capture when released. Editable fields ignore movement keys, and opening tools or review freezes movement. Touch retains dragging/joystick controls. Subsequent drags during finish comparison do not clear the held finish selection.

Capture mouse also allows explicitly retrying capture. It uses the canvas owner's document and handles a rejected pointer-lock request by retaining cursor navigation. Failed automatic requests are not retried on each click until controls are reinitialized or capture is explicitly requested. Direct cursor look and captured mouse look share pitch limits and avoid double-applying movement. Review drawing continues to consume its own input before normal look controls.

Opening a local/Dropbox GLB closes Model tools and clears the previous finish inspector, allowing navigation to resume. Loaded files use their actual filename and file-specific finish preferences rather than inheriting the linked project's identity. Model-03 camera shortcuts appear only while its catalog GLB is loaded. Local verification opened a separate Butts walkthrough GLB through the file chooser, confirmed the tools panel closed, and exercised entry, backward movement, turning and Escape. The embedded automated browser rejects pointer lock, so those checks used the explicitly indicated fallback; free mouse capture remains a regular-browser check.

### Separate annotation strokes

Hold Q while drawing, releasing the mouse between strokes to draw disconnected lines in one callout. Press Z while holding Q to undo the latest stroke. Release Q to add the note. Both the live overlay and exported screenshot preserve stroke boundaries; review JSON includes normalized `strokes` alongside the existing flattened `points` field.

The bottom controls include a remembered drawing mode: click the underlined Hold/Toggle word in “Hold Q to Draw” / “Toggle Q to Draw” to switch modes. Hold is the default. Toggle Q starts drawing on the first press and opens the note on the second press; key repeats are ignored. Escape and window blur cancel drawing in either mode.
