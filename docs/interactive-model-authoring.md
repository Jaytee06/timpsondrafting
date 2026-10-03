# Interactive GLB authoring contract

Use this structure for the next farmhouse export. These conventions are supported by the current viewer; arbitrary new metadata schemas are not automatically supported.

## Responsibilities

The model defines editable groups, their real material alternatives, door pivots and geometry. The viewer handles aiming, highlighting, selection, material swaps, saved choices, reset, door animation, and customized exports. Do not bake a viewer highlight into the model.

## Viewer interaction

Desktop: hold Shift to highlight the editable finish group under the crosshair within ten feet; scroll to cycle its packaged finishes. Aim elsewhere to switch groups. Release Shift to clear highlights and samples. Finish swatches float transparently over the scene without changing the canvas frame. E operates doors independently. Mobile: hold the Hold finishes button, aim with touch look, and use the sample arrows with another finger.

## Finish bindings

Name each editable original material `FINISH_<CATEGORY>__<GROUP_ID>`.

Supported categories: WALLS, FLOORING, CEILINGS, CABINETS, COUNTERTOPS, DOORS, TRIM, ROOF, SIDING. Keep group IDs stable across exports; use uppercase letters, digits and underscores. IDs must contain no customer names or addresses.

Examples:

- `FINISH_WALLS__KITCHEN_WALLS`
- `FINISH_DOORS__ENTRY_DOOR_LEAF`
- `FINISH_DOORS__INTERIOR_DOOR_LEAVES`
- `FINISH_TRIM__ENTRY_DOOR_FRAME`

Every material slot carrying the same category and group ID changes together. Use a separate group ID for an independently editable item, even if its original appearance is identical. Separate glass, hardware, door leaves, frames and trim into explicit mesh/material slots. Avoid putting a whole house into one inseparable material assignment.

Optionally set the original material's glTF extras to `{"tddFinish":{"label":"Kitchen walls"}}` for the UI label.

## Real finish options

Package each alternate material as `THEME_<OPTION_ID>__<CATEGORY>__<GROUP_ID>`, e.g.:

- `THEME_WHITE_OAK__DOORS__ENTRY_DOOR_LEAF`
- `THEME_PAINTED_CHARCOAL__DOORS__ENTRY_DOOR_LEAF`
- `THEME_WARM_WHITE__WALLS__KITCHEN_WALLS`

An option ID may be shared across groups for a coordinated palette, but groups may have different available options. Exact group matches are preferred. `THEME_<OPTION_ID>__<CATEGORY>` is also supported as a category-wide fallback; use it only intentionally.

Put small carrier meshes using these materials under a node named `MATERIAL_LIBRARY`; the viewer hides that hierarchy. Ensure the exporter includes the meshes/materials and embedded textures. Unassigned materials can be removed by exporters and cannot be discovered by the viewer.

Provide complete glTF PBR materials, including texture maps, UVs, base color, roughness, metalness, normal maps and transparency as needed. Use consistent UV scale across alternatives. The viewer swaps actual materials; it does not fabricate alternate wood grain or paint options. An original-only group remains original-only.

## Doors

Create a transform node such as `DOOR_SWING_ENTRY_01`, with its origin at the hinge, and put the leaf and moving hardware beneath it. Keep the stationary frame/jamb outside that node. glTF uses meters and Y up.

On a scene node, add an extras string named `viewerOptionsJSON` containing this JSON:

```json
{
  "doors": [
    {
      "id": "entry_01",
      "node": "DOOR_SWING_ENTRY_01",
      "openAngleDegrees": 90,
      "initialState": "closed",
      "axis": [0, 1, 0],
      "durationSeconds": 0.65
    }
  ]
}
```

Export the door closed. Use a negative angle for the opposite swing; the axis is local to the pivot. Optional `pairGroup` coordinates double-door leaves. Finish IDs are independent of door-action IDs, so changing the leaf finish never opens the door.

## Continuous wall surfaces

The modeler owns wall geometry and shading. A wall should read as one continuous architectural surface, including around window openings and up to vaulted ceilings. Prefer one continuous mesh per intended wall finish group where practical. If construction/export requires multiple meshes, keep adjoining faces coplanar, align boundary vertices, eliminate gaps, overlaps and duplicate faces, and use matching normals, UV scale/orientation and material assignments. Preserve sharp architectural corners; do not smooth across every edge indiscriminately.

Window openings belong in the wall surface; reveal, sill and trim may be separate intentional surfaces. Vaulted extensions of the same wall should share the wall's finish group unless they are deliberately customizable separately. Assign all constituent material slots the same `FINISH_WALLS__<GROUP_ID>` so the viewer highlights and changes the complete wall together.

The viewer can coordinate finish bindings and highlighting across multiple meshes. It cannot reliably repair cracks, noncoplanar faces, shading seams, mismatched UVs or duplicate geometry with recoloring. Verify the exported GLB under directional light before delivery.

## Geometry and acceptance checks

Provide real openings, accurate jamb widths, nonintersecting closed leaves, and individual stair treads/landings at usable dimensions. Collision currently derives from model geometry and viewer heuristics; dedicated collision metadata would require a separate viewer change. Do not assume a custom collision tag is already supported.

Check: each intended group highlights; only its assigned slots change; samples show supplied options; glass/hardware stay unchanged; doors rotate at the hinge; closed/open collisions and stairs are usable; reset restores the model; customized AR/Cesium exports retain materials. Reuse group/option IDs for updates; deliberately migrate saved choices if IDs change.

## Expanded farmhouse handoff integration

The reported 337 editable groups, 21 option IDs and 637 bindings use the existing naming contract. Group-specific options take precedence over category-wide options, and each group's sample strip must include only bindings that actually resolve for that group. Static door assemblies remain finish-editable without adding a door action. The carrier hierarchy remains hidden from selection, collision and customized exports.

Keep packaged choices first. Any viewer-authored finish extensions should be deliberately configured for approved paint groups from the handoff catalog, rather than inferred from broad categories. Implemented reusable additions: Mist blue and Soft clay, offered only for WALLS/CEILINGS groups with an explicitly packaged WARM_WHITE paint base that is opaque, nonmetallic and has no diffuse texture. This keeps existing whites/greiges in the supplied catalog. Mark additions as visualization options with stable `viewer:` identifiers, distinguish them from supplied materials, and persist/reset/export them through the same finish system. These options use stable `viewer:` IDs supported by browser preferences.

For derived variations, clone an approved painted base material; preserve its normals, UV transforms, roughness and relevant texture maps. A color-multiplied diffuse texture cannot reliably become any arbitrary lighter paint; use a neutral paint base or an explicitly authored alternate where needed. Never reinterpret wood, stone, glass, hardware or roofing as paint solely because of their finish category. Wood species, stone patterns and shingles should continue using their actual packaged materials.

The owner chose to accept the newest farmhouse defaults rather than migrate old choices. The project version and asset cache key were incremented; previous saved records remain untouched. If migration is requested later, inspect the actual handoff schema first. Preserve the prior saved record. Migrate unchanged/renamed IDs only when the option resolves in the new target. For a merged group, migrate only agreeing source choices; present conflicting choices for resolution without guessing or overwriting the old record. Keep unsupported/ambiguous choices available for review. The handoff JSON files are development inputs; do not claim the viewer loads them automatically.

Runtime checks remain required on the new file: Shift aim selection, group/category isolation, every resolved option and reset, returning-customer migration, closed/open collision and stairs, and customized AR/Cesium appearance. Model-side door sweep and planar-coverage checks do not establish runtime collision behavior.

## Authored walkthrough entry

Use `SPAWN_FRONT` as the primary ground/feet entry marker. Additional unit markers such as `SPAWN_FRONT_UNIT_B` may coexist; the exact primary name takes precedence. Marker transforms include the full ancestor hierarchy. The viewer applies no backward setback or arbitrary site-anchor substitution when this marker exists.

Canonical metadata uses glTF-local `forwardAxis` values `-Z`, `+Z`, `-X` or `+X`. Existing farmhouse/duplex text beginning `local -Y` describes Blender-local forward before export and is interpreted as glTF-local `+Z`; existing courtyard-home `-Z` is already in glTF space. Both current conventions are supported without rebuilding the models. Prefer explicit glTF axis values for future exports.

Spawn metadata survives anonymization and customized GLB export. Cesium transforms the spawn by its default glTF axis correction, the placed model matrix and scale, and uses the authored facing direction plus site heading. Manual Cesium spawn choices remain overrides; Reset to model entry restores the authored default.

The owner-selected runtime camera height is 5 feet 7 inches (1.7018 meters) above the walking surface in both viewers. This runtime height takes precedence over a model's eye-height hint and is not multiplied by site-placement scale. Missing spawn markers retain the existing fallback behavior.
