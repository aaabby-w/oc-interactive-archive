# Performance

## Baseline

- Keep the initial route useful without JavaScript-only media.
- Do not ship GSAP, Three.js, R3F, or Drei before a page uses them.
- Self-host critical assets.
- Reserve media dimensions to avoid layout shift.
- Lazy-load below-the-fold media and route-specific heavy code.
- Honor reduced motion and lower mobile effects without reducing content.

## Future media targets

- Prefer AVIF/WebP for raster images with an original-quality source retained outside the public bundle.
- Compress GLB/GLTF geometry and textures after visual review.
- Cap device pixel ratio and shadow quality in 3D views.
- Dispose WebGL resources and remove animation/event subscriptions on route exit.

## Audit gates

Desktop and real mobile devices must be checked for LCP, CLS, bundle weight, frame stability, touch response, memory, and degraded fallbacks before public launch.
