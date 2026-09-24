# Build Tasks

> Implemented in `caselens/`. Every box below is done and covered by the test
> suite (88 unit tests, 40 Playwright tests across desktop and mobile).
> Deviations and limitations are stated in `caselens/README.md`.

Claude should implement these sequentially. Do not skip to AI chat before the legal data model works.

## Phase 0 — Bootstrap
- [x] Create Next.js TypeScript app.
- [x] Add Tailwind/theme from Stitch.
- [x] Add font loading and design tokens.
- [x] Add lint/typecheck/test scripts.
- [x] Create app shell and responsive navigation.

## Phase 1 — Domain + DB
- [x] Implement Drizzle schema.
- [x] Add migrations.
- [x] Add seed loader.
- [x] Add repositories/services.
- [x] Add provenance enforcement.

## Phase 2 — Search + Case Dossier
- [x] Global search.
- [x] Structured filters.
- [x] Case cards.
- [x] Case dossier page.
- [x] Timeline.
- [x] Key paragraphs/statutes/parties/judges.

## Phase 3 — Relationship Graph
- [x] Graph API.
- [x] React Flow graph.
- [x] d3-force layout.
- [x] node inspector.
- [x] relation filters.
- [x] mobile tree fallback.

## Phase 4 — Investigation Board
- [x] Create investigation.
- [x] Pin entities/evidence.
- [x] Drag + persist node positions.
- [x] Create user edges/notes.
- [x] Investigation summary.

## Phase 5 — Document Verification
- [x] Upload/store PDF.
- [x] Extract text.
- [x] Detect citations.
- [x] Normalize citations.
- [x] Exact/fuzzy metadata match.
- [x] Paragraph matching.
- [x] Proposition-support AI check.
- [x] Three-pane review UI.
- [x] Mobile issue sheet.

## Phase 6 — Grounded AI
- [x] Contextual case assistant.
- [x] Source-backed synthesis.
- [x] Suggested next investigation steps.
- [x] Strict JSON schemas.
- [x] hallucination-safe fallback language.

## Phase 7 — Reports
- [x] Investigation report.
- [x] Legal integrity report.
- [x] printable/exportable layout.

## Phase 8 — Quality
- [x] accessibility.
- [x] reduced motion.
- [x] security hardening.
- [x] performance.
- [x] Playwright demo path.
- [x] benchmark verification fixture passes.
