# Master Prompt for Claude

You have been given the complete specification for a project called **CaseLens**.

Build CaseLens as a production-quality hackathon application using **Next.js + React + TypeScript**, not FastAPI.

First read `CLAUDE.md` and every referenced specification file. Treat `reference/stitch/DESIGN.md` as the visual design authority and `TASKS.md` as the implementation order.

Your job is not to redesign or merely prototype CaseLens. Implement the working product.

## Required behavior

CaseLens must support this end-to-end flow:

1. Search a legal case from an indexed corpus.
2. Open a rich case dossier.
3. Trace its procedural timeline.
4. Explore an interactive evidence-backed relationship graph.
5. Pin cases, statutes, paragraphs, and evidence into an Investigation Board.
6. Upload a legal PDF.
7. Extract and normalize citations.
8. Match citations against indexed authoritative records.
9. Check cited paragraph/quotation support.
10. Use Gemini only after deterministic source checks to explain proposition support.
11. Display evidence and provenance for every important legal conclusion.
12. Export a legal integrity/investigation report.

## Implementation priorities

Reliability > feature count.
Evidence > AI fluency.
Investigation UX > chatbot UX.
Responsive polish > decorative effects.

## Coding rules

- strict TypeScript;
- Zod at boundaries;
- Drizzle + PostgreSQL + pgvector;
- server-side secrets only;
- modular services;
- strong domain types;
- no legal claims without source provenance;
- no hardcoded UI mock data after seed layer exists;
- tests for verification logic;
- responsive desktop/mobile UI;
- preserve Stitch brand system.

## Work protocol

Implement one phase at a time from `TASKS.md`.
At the end of each phase:

1. run typecheck;
2. run lint;
3. run tests;
4. state files changed;
5. state remaining known issues;
6. continue to the next phase unless blocked by a real missing secret/credential.

Do not ask for cosmetic clarification. Use the supplied specifications.
