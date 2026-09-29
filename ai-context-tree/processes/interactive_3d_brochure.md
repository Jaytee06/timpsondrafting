# Interactive 3D Brochure

## Status

The landing page now exposes a local-file GLB viewer at `/viewer` with a first-person camera, level walking, gravity, and double jumping. Desktop uses pointer-lock mouse look with keyboard movement. Coarse-pointer/mobile devices use touch-drag camera look, a virtual thumbstick, and a jump button; the desktop help banner is hidden on mobile to preserve screen space. It starts empty and requires the visitor to select a local `.glb`; do not bundle a customer or demonstration GLB into the public build by default.

The viewer uses lightweight raycasting rather than an octree, capsule solver, or physics engine. If the GLB contains a mesh or group whose name begins with `COLLISION`, the viewer hides it and raycasts downward against its mesh children to determine walking height. Use simple ramps over stair runs and horizontal surfaces for upper floors. Horizontal wall probes also block movement against visible mesh names containing `wall`, `sill infill`, or `above header`, while names associated with doors, jambs, trim, handles, levers, or roses are excluded so openings remain passable. This remains a naming-based presentation aid rather than general-purpose physics.

## Blender Delivery Contract

For dependable web viewing and collision, Blender should provide:

- A detailed `.glb` using meters, with applied transforms and Y as the up axis.
- A predictable origin near the building and the lowest walkable exterior surface at ground level.
- Embedded materials and textures, with sensible texture sizes and no missing external files.
- Hidden drafting/construction objects removed from the web export.
- Repeated objects instanced where practical and unnecessary geometry removed.
- A separate, low-detail collision mesh for floors, stairs, walls, roofs, and terrain. Name it consistently, such as `COLLISION`, and omit decorations, glass, furniture, hardware, plants, and other surfaces that should not block the player.
- A named `SPAWN_FRONT` Empty at floor level outside the front entrance, rotated so the camera's local forward direction points into the house. The base viewer starts 10 meters behind its world position, adds eye height, and uses its world rotation; when it is absent, the viewer falls back to guessing from the model bounds.
- Optional semantic names for objects that may become interactive, such as doors, material-option surfaces, roof groups, and landscaping groups.

The detailed render mesh and simplified collision mesh should stay aligned and use the same scale and origin. A collision mesh is strongly preferred, although the viewer can initially derive collision from visible geometry.

## Future Upload Workflow

When a GLB is first uploaded, the application may emit a webhook event containing an asset identifier, project identifier, storage URL, filename, file size, export/schema version, and processing status. Do not send private client details unless the destination and consent rules are defined.

A downstream model-processing service could then:

1. Validate the GLB, scale, axes, materials, and required named objects.
2. Inspect bounds and derive a recommended camera spawn.
3. Generate or validate collision acceleration data.
4. Produce thumbnails, preview renders, optimized model variants, and mobile fallbacks.
5. Discover named configurable objects and generate a manifest of available presentation options.
6. Return processing results through a signed callback or a polled job record.

## Presentation Manifest

Keep presentation choices outside the binary GLB in a versioned JSON manifest. It can describe available materials, visible object groups, lighting presets, landscaping variants, camera tours, spawn points, annotations, and permitted client-facing controls. The GLB remains the source geometry; the manifest controls how each project is presented.

## Deferred Work

- Capsule/player collision and stair handling.
- Ground detection across multiple floors and terrain.
- GLB processing webhook and job lifecycle.
- Model option manifest and customer-facing configurator.
- Asset storage, authorization, client consent, and retention rules.
