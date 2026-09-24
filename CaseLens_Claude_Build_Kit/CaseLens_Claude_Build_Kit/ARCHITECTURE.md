# Architecture

## High-level

```text
Browser
  │
  ▼
Next.js / TypeScript
  ├─ Server Components (read-heavy pages)
  ├─ Route Handlers / Server Actions
  ├─ Client interaction islands
  │
  ├─ Case Service
  ├─ Search Service
  ├─ Graph Service
  ├─ Investigation Service
  ├─ Document Service
  ├─ Verification Service
  ├─ Report Service
  └─ AI Grounding Service
        │
        ├──────── PostgreSQL + pgvector
        ├──────── Object Storage (PDFs)
        ├──────── Gemini API
        └──────── Connected legal-source adapters
```

## Important design choice

The primary app is TypeScript. Do not create FastAPI for ordinary CRUD, search orchestration, Gemini calls, or graph endpoints.

A future Python worker is allowed only for heavy OCR/layout/NLP jobs if JS tooling becomes a bottleneck.

## Domain layers

### Source adapters
Translate external/public/legal data into a common normalized form.

### Normalization
Normalizes case names, neutral/reporter citations, courts, dates, sections, paragraph references, and source URLs.

### Legal graph
Stores typed nodes and evidence-backed edges.

### Verification engine
Deterministic checks first; AI interpretation second.

### Investigation engine
Pins evidence-backed objects into a user workspace and preserves relationships.

## Search

Use hybrid search:

- structured filters (court/year/act/section);
- PostgreSQL full-text/BM25-like lexical search where available;
- trigram/fuzzy case-title matching;
- pgvector semantic retrieval for issues/paragraphs.

## Verification sequence

```text
Extract citation
  ↓
Normalize
  ↓
Exact identifier lookup
  ↓
Case-title / court / year consistency check
  ↓
Retrieve source judgment
  ↓
Paragraph exact/fuzzy check
  ↓
Semantic proposition check
  ↓
Human-readable explanation
```

The LLM does not determine whether an authoritative record exists. Database/source evidence does.
