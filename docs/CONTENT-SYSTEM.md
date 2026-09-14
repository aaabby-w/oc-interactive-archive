# Content system

## Current source

Phase 1 stores typed content in TypeScript. This keeps schema changes explicit while the content volume is small. A future MDX or CMS migration must preserve the same domain types.

```text
content/
├── site.ts
└── characters/
    ├── types.ts
    ├── registry.ts
    └── _template/
        └── character.ts
```

## Separation

- `content/site.ts`: navigation, interface labels, temporary identity, and shared site copy.
- Character records: facts and prose about one character.
- Registry: discovery and routing flags only.
- Components: presentation and interaction, not authored content.

## Media

All production media should be local and carry dimensions, alt text, and optional focal position. Temporary slots must be explicit and removable.
