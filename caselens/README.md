# CaseLens

**See the full story behind every case.** Investigate the law. Trace the evidence.

An investigative legal intelligence platform for Indian case law. Search an
indexed corpus, open a case dossier, trace a matter across forums, map how
authorities relate, verify a document's citations against their sources,
assemble an investigation board, and export a report where every line carries
its provenance.

Built to the specification in `../CaseLens_Claude_Build_Kit/`.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

No database or API key is required to run the app or the demo.

```bash
npm run verify       # typecheck + lint + unit tests
npm run test:e2e     # Playwright: golden demo path + accessibility
npm run demo:pdf     # regenerate the demo brief PDF
```

## The golden demo path

1. **Search** — `/search?q=personal+guarantor+moratorium`. Binding Supreme
   Court authority leads; a superseded first-instance order is ranked down
   with the reason stated on the card.
2. **Dossier** — open *State Bank of India v. V. Ramakrishnan*. Headnote,
   issues framed, judgment passages, coram, statutory provisions.
3. **Chronology** — the same matter across three forums: NCLT Chennai →
   NCLAT (affirmed) → Supreme Court (reversed).
4. **Graph** — force-directed, every edge carrying the evidence behind it.
   Mobile falls back to a linear tree.
5. **Verify** — upload the demo brief (or use the button). Watch the
   extraction stages run.
6. **Evidence** — click the flagged citation. Claimed metadata sits beside the
   authoritative record, with every check that produced the finding.
7. **Pin** — put the finding on an investigation board.
8. **Export** — produce the integrity or investigation report.

## How it is put together

```
app/
  (marketing)/        landing
  (app)/              the workspace — search, cases, graph, verify, review,
                      investigations, reports, research, sources
  api/                route handlers; every input validated with Zod
components/           layout, search, case, graph, investigation, document,
                      verification, report, ui
server/
  db/                 Drizzle schema, seed corpus, mutable store
  repositories/       read access to the corpus (provenance enforced here)
  services/           search, graph, verification, documents, investigations,
                      reports, research, provenance, storage, pdf extraction
  ai/                 Gemini access, strictly bounded
lib/legal/            normalization, similarity, citation detection
tests/unit/           89 tests — normalization, verification, domain rules,
                      the benchmark gate, the PDF pipeline
tests/e2e/            golden path + WCAG A/AA audit, desktop and mobile
```

### The rule the whole design turns on

> The LLM does not determine whether an authoritative record exists.
> Database/source evidence does. — `ARCHITECTURE.md`

Verification runs deterministically, in order: extract and normalize → exact
identifier lookup → fuzzy title match → metadata comparison field by field →
quotation matching against the indexed text → proposition support. A model is
consulted **only** at the last step, **only** after a record has already been
resolved from source data, and **only** to interpret retrieved paragraphs. If
no model is configured the engine completes anyway and says so.

Every record that asserts something about the law carries provenance, enforced
in `server/services/provenance.ts` — a record without it raises rather than
rendering. A missing match is always worded as a statement about the coverage
of the connected sources, never as a finding that an authority is fabricated.

That discipline is applied to the app's own corpus, not just to uploaded
documents: because nothing in the index was actually retrieved, every seeded
record is labelled `DEMO` and carries no retrieval date, and a unit test fails
the build if any record claims otherwise. See **Known limitations**.

### Verification statuses

| Status | Meaning |
| --- | --- |
| Verified | Resolves to an indexed record; metadata, paragraph and quotation all agree |
| Metadata mismatch | Record found, but title / year / reporter / forum disagree |
| Paragraph mismatch | Record found, but the quoted passage or paragraph number does not correspond |
| Weak proposition support | Correctly cited, but the authority does not bear out the proposition drawn from it |
| No authoritative match in connected sources | Nothing in the connected sources carries this citation. A coverage statement, not an existence finding |
| Needs human review | The checks did not produce a confident result |

## Configuration

Copy `.env.example` to `.env.local`. Every value is optional for the demo.

| Variable | Effect when unset |
| --- | --- |
| `DATABASE_URL` | Reads the seeded in-memory corpus. Set it to run against PostgreSQL + pgvector. |
| `VERTEX_PROJECT` / `VERTEX_LOCATION` | Gemini via Vertex AI, authenticated by the runtime's own Google identity — no API key. This is what the deployed service uses. |
| `GEMINI_API_KEY` | Alternative backend (Google AI Studio) for a local checkout. With neither set, verification stays fully deterministic and research returns retrieved passages rather than a synthesis, and says so. |
| `OBJECT_STORAGE_*` | Uploads are stored on local disk under `storage/`. |

Secrets are read only on the server. The model key never reaches the browser.

## Security

- CSP with a per-request nonce (`middleware.ts`); `'unsafe-inline'` is not
  used for scripts.
- Uploads validated on MIME type, magic bytes and size; filenames sanitised;
  storage keys derived from content hash, never from user input.
- SHA-256 duplicate detection, scoped per owner.
- Rate limits on search, upload, analysis and AI endpoints.
- Authorization checks on investigations, documents and reports.
- Errors return a fixed shape and never echo internals; the model key and
  document bodies are kept out of logs.

## Known limitations

These are stated plainly in the app at `/sources`, not just here.

- **Nothing in the index was retrieved from a source.** No request has ever
  been made to the Supreme Court portal, the NCLAT site or India Code — the
  only outbound call in the codebase goes to Gemini. The entire corpus, case
  metadata and judgment passages alike, was written from model recollection
  for this demo. Every record is labelled `DEMO` / "Unverified demo data",
  carries no retrieval date, and shows its link as "Verify at" rather than as
  a source. Findings are therefore statements about *internal consistency*
  with this index, not about agreement with the real judgments. See
  [`docs/CORPUS.md`](docs/CORPUS.md) for how to replace it with verified text.
- **Investigations and uploaded documents live in memory.** They survive hot
  reloads but not a server restart. The Postgres tables exist in
  `server/db/schema.ts`; swapping `server/db/store.ts` for a Drizzle-backed
  implementation is the change needed to persist them.
- **The corpus is seven authorities.** Search, graph and verification are all
  bounded by that.
- **Sessions are cookie-based, not authenticated.** Enough to keep one
  visitor's board separate from another's; not an account system.
- **Semantic retrieval is IDF-weighted lexical**, not embeddings. The pgvector
  column and index are in the schema; no embedding backend is wired up.

## Documentation

- [`docs/CORPUS.md`](docs/CORPUS.md) — what is indexed, at what authority
  level, and how to replace the passage text
- [`seed/verification_benchmark.json`](seed/verification_benchmark.json) — the
  expected outcome for every demo citation, asserted by the test suite

AI-assisted legal research. Always verify against the linked primary authority
before relying on a result.
