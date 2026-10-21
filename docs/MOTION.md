# Motion

## Principle

Motion reveals spatial relationships and controls pacing. It must not compensate for weak static composition.

## Current implementation

The homepage now includes:

- a pinned opening image whose scale and depth follow natural scrolling;
- copy that recedes as the image advances;
- section reveals and restrained parallax;
- a damped mouse follower for fine pointers;
- touch and reduced-motion fallbacks.

GSAP and ScrollTrigger are isolated in the homepage client experience and cleaned up on unmount. Native scrolling remains in control.

Site-wide editorial typography uses `ScrollTypography` with explicit `data-typo`
roles. Display titles rise and stretch by character, section headings gather from
the center, quotations use a restrained perspective turn, metadata reveals in a
short character cadence, and reading copy uses a quieter block reveal. Closed
`details` content is initialized only when opened. All variants keep native
scrolling, restore their original markup on route changes, and become static
when reduced motion is requested.

## World atlas camera

`lib/atlas-camera.ts` owns every transform on the world map; CSS never animates it.

- One `translate + scale` per frame, in viewport-normalised units, so resizing cannot desynchronise the view and the map always covers its frame.
- Wheel, pinch, double-click, buttons and keys ease the view toward a target with one shared factor for position and zoom, which keeps the point under the cursor fixed.
- Dragging follows the pointer, then glides on release. Vertical touch drags still scroll the page; at minimum zoom a downward wheel scrolls the page too.
- Selecting a city is a timed flight that arcs the zoom on long hops. Hover only previews the city card; it never moves the camera.
- The layer is promoted only while moving, so the map re-rasterises sharply at rest. City markers counter-scale from `--atlas-k`.
- Reduced motion jumps straight to the target view; keyboard (`+ - 0`, arrows) and button controls cover non-pointer use.

## World ring

`components/world-command-center.tsx` wraps `public/maps/world-equirectangular.svg` (latitude −56°…84°) around a cylinder and views it from the axis. The poles are cropped on purpose: the full −90°…90° band would stretch the map about five times wider than tall, while this crop keeps it near three.

- Dragging, wheel, arrow keys and `0`/Home rotate the ring; selecting a city turns it to that longitude and narrows the field of view slightly. Vertical touch drags still scroll the page.
- City nodes are DOM buttons positioned every frame from the 3D position, so they stay focusable and keyboard-reachable.
- Reduced motion, missing WebGL, or a failed texture load fall back to the flat `WorldAtlas`.
- `record` and `radar` on a city are optional; the panel omits the record block when none is written.

## Later scroll storytelling

- Native scrolling remains in control.
- Scroll position may drive masks, transforms, opacity, depth, and chapter transitions.
- Desktop and mobile can use different timelines.
- Motion must have a static fallback and cleanly release listeners and animation contexts.

## Performance limits

Animate `transform` and `opacity` whenever possible. Avoid large animated blurs, full-screen filters, layout-triggering properties, and perpetual effects that do not add meaning.
