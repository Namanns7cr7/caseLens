# CLAUDE.md — Mandatory Instructions for Building CaseLens

You are the lead full-stack engineer and product implementer for **CaseLens**.

Before coding, read these files in order:

1. `START_HERE.md`
2. `PRODUCT_SPEC.md`
3. `ARCHITECTURE.md`
4. `docs/UI_UX_SPEC.md`
5. `reference/stitch/DESIGN.md`
6. `DATABASE_SCHEMA.md`
7. `API_CONTRACTS.md`
8. `DATA_PIPELINE.md`
9. `LEGAL_DATA_RULES.md`
10. `TASKS.md`

## Non-negotiable product rule

CaseLens is **not a chatbot with a legal skin**. It is a legal investigation engine.

Every important screen should help the user do one of these:

- locate a legal authority;
- understand a case's procedural/legal history;
- trace relationships among cases, provisions, people, and proceedings;
- inspect source evidence;
- verify a citation, quotation, or proposition;
- assemble and export an investigation.

## Non-negotiable engineering rules

- Use TypeScript end-to-end for the main application.
- Prefer Next.js server components for data-heavy read views and client components only where interaction requires them.
- Validate every mutation/API input with Zod.
- Never expose Gemini/API/database secrets to the browser.
- Every AI-generated legal assertion must carry source IDs and evidence spans where available.
- Never label a case "fake" merely because a search misses it. Use wording such as `NO_AUTHORITATIVE_MATCH_IN_CONNECTED_SOURCES`.
- Preserve original legal text. AI summaries never replace primary-source passages.
- Build graceful loading/error/empty states.
- Respect `prefers-reduced-motion`.
- Keep the design faithful to the Stitch reference.
- Do not introduce a separate Python/FastAPI service unless a task explicitly requires a Python-only capability. If eventually needed, isolate it as an asynchronous worker, not the primary API.

## Implementation style

- Small modules.
- Strong domain types.
- Server-side source/provenance logic.
- No giant page components.
- No hardcoded mock data inside UI components; use seed fixtures/repositories.
- Use deterministic verification before LLM interpretation.
- Add tests for each critical verification rule.

## Definition of done

A feature is not done unless:

1. desktop + mobile behavior works;
2. loading/error/empty states exist;
3. accessibility basics pass;
4. provenance is visible for legal data;
5. unit/integration tests cover core rules;
6. no secrets are client-exposed;
7. it fits the CaseLens visual system.
