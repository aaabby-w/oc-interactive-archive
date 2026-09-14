# 3D asset specification

## Preferred delivery

- GLB preferred; GLTF with colocated resources accepted when needed.
- Real-world scale and consistent forward/up axes.
- Transform applied, sensible pivots, no hidden unused geometry.
- Separate interactive props and named anchors.

## Naming

Use semantic stable names such as:

```text
Room
Bed
Desk
DeskChair
Laptop
Lamp
Window
Door
Bookshelf
Anchor_Bed
Anchor_Desk
Anchor_Window
```

Avoid generated names such as `Mesh001`.

## Web readiness

- Provide compressed textures in practical sizes.
- Avoid enormous 4K maps on minor props.
- Keep materials and draw calls deliberate.
- Agree on Draco or Meshopt before final export.
- Animation clips require semantic names and clean loops.
- Provide a poster/fallback image for every Residence.

Exact polygon, texture, and file-size budgets will be set after the first target scene and device test.
