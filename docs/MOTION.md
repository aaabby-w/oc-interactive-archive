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

The planar camera remains the reduced-motion and unavailable-WebGL fallback.

`lib/atlas-camera.ts` owns every transform on the world map; CSS never animates it.

- One `translate + scale` per frame, in viewport-normalised units, so resizing cannot desynchronise the view and the map always covers its frame.
- Wheel, pinch, double-click, buttons and keys ease the view toward a target with one shared factor for position and zoom, which keeps the point under the cursor fixed.
- Dragging follows the pointer, then glides on release. Vertical touch drags still scroll the page; at minimum zoom a downward wheel scrolls the page too.
- Selecting a city is a timed flight that arcs the zoom on long hops. Hover only previews the city card; it never moves the camera.
- The layer is promoted only while moving, so the map re-rasterises sharply at rest. City markers counter-scale from `--atlas-k`.
- Reduced motion jumps straight to the target view; keyboard (`+ - 0`, arrows) and button controls cover non-pointer use.

## World command center

- `/world` normally uses a continuous cylindrical Three.js wall. Wheel and trackpad deltas become horizontal rotation with exponential settling; pointer and touch drags use the same rotation state and keep a short release momentum.
- City selection chooses the nearest equivalent turn of the cylinder, preventing an unnecessary full revolution. Field of view eases from overview to focus instead of jumping.
- Radar rings are DOM overlays projected from Three.js city coordinates. Each reaches a bounded scale, fades, and restarts.
- `prefers-reduced-motion: reduce` bypasses the WebGL room and returns the planar atlas with the same twenty-four cities, live weather, and designed network.

## Later scroll storytelling

- Native scrolling remains in control.
- Scroll position may drive masks, transforms, opacity, depth, and chapter transitions.
- Desktop and mobile can use different timelines.
- Motion must have a static fallback and cleanly release listeners and animation contexts.

## Performance limits

Animate `transform` and `opacity` whenever possible. Avoid large animated blurs, full-screen filters, layout-triggering properties, and perpetual effects that do not add meaning.
