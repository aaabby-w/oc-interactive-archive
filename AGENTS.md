# OC Interactive Website

This repository is an original-character interactive website. Treat the site as an immersive world, not a wiki, card collection, SaaS dashboard, or generic portfolio.

## Before editing

Read the documents relevant to the task:

- Product and scope: `docs/PRODUCT.md`, `docs/ROADMAP.md`
- Routes: `docs/SITEMAP.md`
- Art direction: `docs/VISUAL-DIRECTION.md`
- Motion: `docs/MOTION.md`
- Characters and content: `docs/CHARACTER-SYSTEM.md`, `docs/CONTENT-SYSTEM.md`
- Residence and 3D: `docs/RESIDENCE.md`, `docs/3D-ASSET-SPEC.md`
- Language: `docs/I18N.md`
- Performance and deployment: `docs/PERFORMANCE.md`, `docs/DEPLOYMENT.md`

## Non-negotiable rules

- Build only the requested roadmap phase. Do not implement later phases pre-emptively.
- Never hard-code a specific OC into reusable components or routing.
- Character pages read from the character registry and content records.
- Chinese is the primary reading language. English may act as a simultaneous typographic layer; there is no full locale routing yet.
- Keep the core experience static-first, client-interactive, and platform-independent.
- Self-host critical media and fonts. Do not make the site depend on Google Fonts, remote image CDNs, or third-party JavaScript CDNs.
- Desktop and mobile share one art direction, but may use different compositions and motion implementations.
- Respect `prefers-reduced-motion` and keep touch, keyboard, and pointer use viable.
- Do not use fashionable rounded-card or glass-dashboard patterns as a substitute for art direction.
- Do not add GSAP or Three.js until the phase that actually uses them.

## Current project state

- Phase 0 documentation and the Phase 1 technical skeleton are active. A first-pass Phase 2/3 homepage is also present by explicit user request.
- The working title, logo, tagline, and final character media are intentionally unset.
- `character-01` is a replaceable placeholder. It is not a canonical character identity.
- The homepage uses `public/images/hero-conservatory-placeholder.png` as a replaceable, generated environment asset. It is not canonical OC art.
- Light mode is the default; dark mode must preserve the same art direction and remain one click away.

## Validation

For implementation tasks, run the build. Also verify the relevant route at desktop and mobile sizes when a preview is available.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
