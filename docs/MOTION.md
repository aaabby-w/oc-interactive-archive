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

## Later scroll storytelling

- Native scrolling remains in control.
- Scroll position may drive masks, transforms, opacity, depth, and chapter transitions.
- Desktop and mobile can use different timelines.
- Motion must have a static fallback and cleanly release listeners and animation contexts.

## Performance limits

Animate `transform` and `opacity` whenever possible. Avoid large animated blurs, full-screen filters, layout-triggering properties, and perpetual effects that do not add meaning.
