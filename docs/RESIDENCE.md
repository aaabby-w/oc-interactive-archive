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
