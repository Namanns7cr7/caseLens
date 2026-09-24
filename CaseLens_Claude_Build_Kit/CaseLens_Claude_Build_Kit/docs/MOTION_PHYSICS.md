# Motion & Physics Specification

## Goal

CaseLens should feel like an evidence system with spatial continuity, not a collection of disconnected pages.

## Tools

- Framer Motion for panels/shared transitions/microinteractions.
- @xyflow/react for graph/board rendering.
- d3-force for force-directed graph layout.

## Motion rules

- Springs: medium damping, low overshoot.
- Cards may compress 1–2% on pointer down.
- Evidence drawers should feel weighted.
- Hover elevation stays subtle.
- No continuous ornamental animation.

## Graph physics

For legal relationship graph:
- charge repulsion;
- link-distance based on relationship type;
- stronger attraction for procedural links (appeal/remand);
- collision radius based on node size;
- center gravity;
- freeze layout after settling unless user interacts.

## Mobile sheets

Snap points around 18%, 55%, and 92% viewport height. Include velocity-aware snapping and drag resistance.

## Reduced motion

When `prefers-reduced-motion`, replace springs/shared-element transforms with quick opacity/visibility transitions.
