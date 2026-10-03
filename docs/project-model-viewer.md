# Published project models

Project entry points:

- `/viewer?project=model-01`
- `/viewer?project=model-02`
- `/viewer?project=model-03`

Register the owner-provided GLBs in `public/viewer-projects.json`. Set `modelUrl` to the deployed file path (for example `/models/model-02.glb`) after adding the actual file to `public/models/`. Do not publish placeholder files. Increment `version` when changing surface identifiers or model defaults so incompatible finish overrides are not restored. Keep the version unchanged for compatible model updates.

`profileSlug` optionally connects a model to an existing project profile. Farmhouse is mapped to `farmhouse-design-visualization`; the custom residence has a new anonymous model-project page. The project library automatically lists all models with a configured URL. There is no project selector in the viewer. Only configured models appear in the homepage’s horizontally scrollable Interactive models row and project-library cards. Direct links for pending models show a generic unavailable message.

Finish and landscaping preferences are stored in localStorage per project/version. A manually opened GLB under a project link uses that project's preference key; an ordinary uploaded GLB uses its filename/size/last-modified identity. Reset to default writes original finish choices. This is device/browser-local persistence, not cross-device customer accounts.

Place at an address exports a material/transform snapshot of the live scene as GLB, stores the handoff in IndexedDB, and navigates to the Cesium address form. Choosing a property prepares and places that snapshot and then uses Cesium's existing per-property cache. A new handoff replaces the previous handoff to limit browser storage growth. The transfer link is for this browser only, not a public model-sharing URL.

Apple AR uses a snapshot of the same live scene, including current finishes and visible landscaping. Native AR and terrain placement still need device testing with the real GLBs and a working Cesium token.

Checks: `node --test scripts/tests/viewer-customization.test.mjs scripts/tests/walk-movement.test.mjs`, `npm run typecheck`, and `npm run build`.

Public identifiers, labels, model filenames, thumbnails and embedded GLB metadata must be anonymous. Use model-01, model-02 and model-03 consistently; keep owner/client names and specific development names out of shipped data.

The initial catalog uses the latest available owner-authorized models as of 2026-10-03: model-01 (custom residence v23), model-02 (farmhouse walkthrough), model-03 (duplex v06). Dropbox source names and paths are deliberately excluded from shipped metadata. `scripts/anonymize-glb.mjs` rewrites the GLB JSON chunk only, preserving embedded binary geometry/textures and the finish/door configuration.

Only the newest authorized GLB for each project is hosted. Replace it in place and change the asset URL cache key for compatible updates, preserving saved finish preferences. Do not retain model preview exports, review images, or links to them. The current GLBs contain updated front-entry spawn positions and explicit glTF -Z forward axes; both viewers read their authored transforms. Camera height remains 5 feet 7 inches.

## Viewer controls and layout

E / Interact operates doors. Hold Shift to highlight and change the nearest visible finish at any distance, including door surfaces. Scroll while holding Shift to cycle its packaged material variants; release Shift to leave finish mode. Mobile users hold the Finishes button on the right and use the opposite thumb on the left-hand sample strip. Tap a sample or an arrow, or swipe vertically to cycle; touch input supports the second finger while the first remains held. Door interaction retains its 10-foot limit. Drone view disables gravity and collisions: WASD flies in the viewing direction, Space rises, and C descends. Mobile uses the joystick plus Up/Down buttons. Return to walk restores the previous walking position. Applying a finish hides its highlight until another group is targeted or a new hold begins, showing the rendered colors clearly. Named palettes (`THEME_EARTHEN_TUSCAN`, etc.) are discovered alongside the farmhouse’s Warm/Light/Dark variants. The samples use the material’s actual base color and embedded texture, not a generic palette. Original-only surfaces state that no alternatives are packaged.

Finish samples float in a compact transparent strip over the scene without resizing the canvas. Model tools use the right-hand inspector only when finish samples are closed. Touch movement and action buttons have a dedicated bottom toolbar. Terrain placement tools and terrain errors likewise have separate layout space. On small screens the inspector is narrower and scrolls independently.

Shared material/surface groups are still shared: selecting a sample can change multiple surfaces that use that finish. Unique per-door finishes require distinct finish identifiers in the GLB.
