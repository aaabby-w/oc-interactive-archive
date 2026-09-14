# Character system

## Contract

Reusable views consume a `Character` record. They never import or name a canonical OC directly.

Registry concerns:

- publication state;
- order;
- featured state;
- navigation visibility;
- Residence eligibility;
- content record location.

Character content concerns:

- bilingual display name and optional title;
- summary and profile facts;
- media references and focal positions;
- optional story, relationships, quotes, gallery, timeline, archive, and residence modules.

## Optional modules

The absence of a module is valid. Pages must omit unavailable sections rather than render empty furniture.

## Adding a character

1. Copy `content/characters/_template/character.ts`.
2. Use a stable lowercase slug.
3. Add the record to `content/characters/registry.ts`.
4. Add local media beneath that character's directory when available.
5. Validate unique order, slug, and at most one featured published character.

`character-01` through `character-03` are scaffolding labels, not permanent identities.
