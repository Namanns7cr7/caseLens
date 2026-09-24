# CaseLens — Claude Build Kit

**CaseLens** is an investigative legal intelligence platform for Indian case law.

Core product loop:

**Search → Open Case File → Trace Timeline → Explore Relationships → Inspect Evidence → Verify Citations/Claims → Build Investigation → Export Report**

## How to use this kit with Claude

1. Upload this entire folder (or ZIP) to Claude.
2. Tell Claude to read `CLAUDE.md` first.
3. Then give Claude `prompts/MASTER_BUILD_PROMPT.md`.
4. Claude should implement the app phase-by-phase using `TASKS.md` as the source of truth.
5. Do not let Claude redesign the product. The authoritative design reference is `reference/stitch/DESIGN.md` and `docs/UI_UX_SPEC.md`.
6. Do not let Claude invent legal data. All legal facts shown as real must carry provenance.

## Target stack

- Next.js + React + TypeScript
- Tailwind CSS
- shadcn/ui-style component primitives
- PostgreSQL
- Drizzle ORM
- pgvector
- Zod
- Gemini API for grounded synthesis/extraction
- PDF.js / react-pdf for legal document reading
- @xyflow/react + d3-force for the investigation graph
- Framer Motion for restrained spring interactions

## MVP demo

The hackathon demo must support one complete golden path:

1. Search a real case.
2. Open its case file.
3. View chronology and connected authorities.
4. Open an investigation graph.
5. Pin a case/paragraph/statute to an investigation board.
6. Upload a legal PDF.
7. Extract citations.
8. Verify metadata and paragraph support against indexed sources.
9. Show flagged inconsistencies with source evidence.
10. Export an investigation/integrity report.

See `docs/DEMO_SCRIPT.md`.
