# Data & Ingestion Pipeline

## Principle

CaseLens is only as credible as its provenance. Separate `source acquisition`, `normalization`, `indexing`, and `AI enrichment`.

## Pipeline

```text
Authoritative/approved source
   ↓
Fetch or manually import
   ↓
Store original artifact + SHA-256
   ↓
Extract text
   ↓
Normalize metadata
   ↓
Split into judgment paragraphs
   ↓
Extract citations/statutes
   ↓
Resolve identifiers/entities
   ↓
Create evidence-backed relationships
   ↓
Create embeddings
   ↓
Search index
```

## Do not

- bypass CAPTCHA or access controls;
- scrape sources in violation of terms;
- silently replace primary-source text with AI-cleaned text;
- treat LLM-extracted relationships as verified without evidence.

## MVP corpus

Start with a small curated set of authoritative or permitted documents, enough to demonstrate:

- one procedural chain across multiple forums;
- real citation relationships;
- at least one known citation anomaly scenario;
- statutes/provisions connected to those cases.

## Citation normalization

Normalize variants while preserving raw text:

- neutral citation;
- SCC/SCC OnLine-style reporter citation;
- case title;
- year;
- court;
- paragraph reference.

## Paragraph verification

1. exact normalized text match;
2. fuzzy string match;
3. paragraph-number lookup;
4. semantic similarity as support, never as sole proof that a quote exists.
