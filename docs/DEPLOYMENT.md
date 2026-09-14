# Deployment

## Source of truth

One Git repository is the source of truth. Deployments are outputs, not separate project copies.

## Current decision

No public deployment is required for the placeholder phase. Deployment follows after the first real character image is integrated and reviewed.

## Target properties

- Static-first output where practical.
- No hard dependency on one host's proprietary runtime.
- Local fonts, images, and models.
- Relative/base-path-safe asset handling for possible subpath hosting.
- Direct-link testing for every generated character and residence route.

## Candidate mirrors

- Vercel or Netlify for the full experience.
- GitHub Pages when static export and subpath routing are verified.
- A future Lite build only if real network testing shows that the full version is unreliable for the intended audience.

Mainland-China accessibility must be measured on real networks rather than inferred from desktop development tools.
