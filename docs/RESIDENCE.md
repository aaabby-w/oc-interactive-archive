# Residence

## Product rule

Residence is an observational space, not a controllable game. Visitors may look around and offer limited interactions; the character retains autonomy and may ignore or refuse them.

## Layering

```text
schedule + traits + previous state + weighted choice
                         ↓
                  pure state machine
                         ↓
             scene/animation presentation
```

The state machine must be testable without Three.js. Scene code maps states to anchors, clips, props, lighting, and dialogue.

## Deferred decisions

- canonical character timezone versus visitor-local time;
- persistence across visits;
- deterministic daily seed versus session randomness;
- interaction cooldowns and refusal rules;
- public fallback when a device cannot render WebGL.

These do not block Phase 1.

## Current scene (September 2026 user-requested demo)

- Kenney furniture is loaded locally as OBJ. Its scale/orientation is applied
  before base normalization. Props use downward surface measurements instead
  of hand-entered heights. The left door has an unobstructed entrance aisle.
- `components/residence/window-weather.ts` renders sky, hills, clouds, rain,
  moon and rare rainbow into a texture recessed behind the physical mullions.
  Weather geometry cannot protrude into the room.
- `public/models/residence-cat/companion-cat.glb` is an independently authored
  cream/taupe, blue-eyed cat with a new mesh, palette UVs/texture, 25-bone skin,
  and five original animation clips. The supplied technical-reference GLB is
  not shipped or imported into the generator. See `art-source/residence-cat/`.
- Cats follow floor waypoints around furniture, then jump onto measured bed,
  desk and sofa surfaces. Residence activity and the existing twelve-minute
  cat destination choice remain separate from clip presentation.
- Offscreen scenes pause rendering. Reduced motion uses a stationary pose and
  static weather frame. All generated model resources are disposed on unmount.

September 17 refinement: the bed retains its built-in pillow only (the duplicate
standalone pillow was removed). Rear wall segments surround an actual window
opening; window casing and mullions exist on both sides. The left door has a
continuous lintel, thick casing, paneled leaf and handles on both faces. Palette
is now mineral cream/sage/wood, inspired by the xi4u reference without copying
its layout or adding its simulation features. Cat core volumes are joined into
a rounded continuous surface, with transferred normalized skin weights and
smooth normals; original character proportions and the 25-bone rig are retained.

September 18 environment pass: the recessed canvas weather card was replaced by
a scene-wide 3D exterior. Terrain continues beneath and beyond the room; layered
hills, trees, clouds, sun/moon, rainbow and rain occupy real depth bands and
share the room's lighting and shadow system. The window remains a physical
opening with casing, sill, mullions and transparent glass. Orbit polar limits
keep the camera above the exterior ground at every angle, so the residence
underside cannot enter the frame. The music button now cycles through the six
tracks distributed with `annac777/xi4u`; its MIT notice is preserved beside the
self-hosted files.

The residence section uses the same reading order at every breakpoint: section
label, title and introduction first, followed by the complete observation board.
The desktop layout no longer places the board beside the copy.

Verification: `scripts/verify-residence-layout.mjs` measures shipped furniture
contacts/door clearance; `scripts/verify-residence-cat.py` checks original skin
weights, topology, UVs and every animation frame's contact plane in Blender.
