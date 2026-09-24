# The CaseLens corpus

## What is in the index

CaseLens ships with a curated corpus built around one doctrinal line: whether
the moratorium under Section 14 of the Insolvency and Bankruptcy Code, 2016
shields a personal guarantor whose liability arises under Section 128 of the
Indian Contract Act, 1872.

That line was chosen because it supplies, in a small number of records,
everything the product needs to demonstrate:

| Requirement | Where it comes from |
| --- | --- |
| A procedural chain across forums | NCLT Chennai → NCLAT → Supreme Court, in *V. Ramakrishnan* |
| Real citation relationships | *Lalit Kumar Jain* follows *V. Ramakrishnan*; *Ghanashyam Mishra* follows *Essar Steel* |
| A cautionary / anomaly precedent | *Dr. Vishnu Kumar Agarwal v. Piramal Enterprises* |
| Statutory provisions connected to cases | IBC §§ 14, 31, 60, 95; ICA §§ 128, 134; SARFAESI § 13 |

The corpus lives in [`server/db/seed/corpus.ts`](../server/db/seed/corpus.ts).

## Nothing here was retrieved

This is the single most important thing to understand before relying on a
CaseLens finding in this build.

**No request was ever made to any source.** Not to the Supreme Court judgment
portal, not to the NCLAT site, not to India Code. The only outbound HTTP call
anywhere in the codebase goes to the Gemini API; you can confirm that with:

```bash
grep -rn "fetch(" --include=*.ts --include=*.tsx server lib app
```

Every record in this corpus — case titles, citations, forums, decision dates,
judges, parties, statutory text and judgment passages — was **written from
model recollection** for this demonstration.

Accordingly:

- every record carries `DEMO` authority, which the UI labels "Unverified demo
  data";
- **no record carries a `retrievedAt` date**, because no retrieval happened;
- the `sourceUrl` on each record is rendered as "Verify at", not as the
  record's origin, and each ref shows "Not retrieved".

`PRIMARY` and `SECONDARY` authority are defined in the type system and
rendered by the UI, but **nothing in this build claims either**. A unit test
(`tests/unit/domain-rules.test.ts`) fails the build if any seeded record
asserts a level above `DEMO` or carries a retrieval date.

The metadata is likely to be correct — these are well-known authorities — but
"probably right from memory" is not provenance, and a tool whose purpose is
catching unsupported citations must not make unsupported claims of its own.

## What this means for each verification status

Every status below is a statement about **internal consistency** — agreement
between a document and this index. None is a statement about agreement with
the real judgment, because the index has not been checked against one.

| Status | What it actually tells you here |
| --- | --- |
| `VERIFIED` | The citation resolves to an indexed record and the stated metadata agrees with it. It does **not** mean the authority was confirmed against a court record. |
| `METADATA_MISMATCH` | Reliable *as a discrepancy signal*: the document disagrees with the index. Which of the two is right still has to be checked. |
| `NO_AUTHORITATIVE_MATCH` | Reliable as a statement about coverage — nothing in a seven-record index matches. It says nothing about whether the authority exists. |
| `PARAGRAPH_MISMATCH` | **Indicative only.** The quoted words do not match the *demo abstract*, not necessarily the judgment. |
| `WEAK_PROPOSITION_SUPPORT` | **Indicative only**, for the same reason. |

## Replacing the passage text with verified source text

This is the one change that turns the build from a demonstration into
something you could rely on for quotation checking.

1. Obtain the judgment text from an authoritative source you are permitted to
   use. Do not bypass access controls or scrape in violation of terms — see
   [`DATA_PIPELINE.md`](../../CaseLens_Claude_Build_Kit/CaseLens_Claude_Build_Kit/DATA_PIPELINE.md).
2. In `server/db/seed/corpus.ts`, replace each `SeedParagraph.text` with the
   verbatim paragraph, keeping `number` aligned with the source's own
   paragraph numbering. Confirm the metadata (title, citations, date, coram)
   against the record at the same time.
3. In `server/db/seed/index.ts`, change `metadataProvenance`, `textProvenance`
   and the provision provenance to emit `authorityLevel: "PRIMARY"` (or
   `"SECONDARY"` for a reporter), set a real `retrievedAt`, and replace the
   `*_NOTE` text. The UI switches from "Verify at" to "Source" automatically
   once a retrieval date is present.
4. Replace the caveat panel on `app/(app)/sources/page.tsx` and the rail
   banner in `components/layout/app-shell.tsx`.
5. Update the invariant test in `tests/unit/domain-rules.test.ts` — it
   currently asserts that nothing claims more than `DEMO`, which is exactly
   the assertion you are changing. Update the two source-transparency tests in
   `tests/e2e/golden-path.spec.ts` as well.
6. Run `npm run test` — the benchmark in `seed/verification_benchmark.json`
   pins the expected outcome for every demo citation, so a change that breaks
   a check fails there rather than in front of an audience.

Paragraph hashes are derived, not stored by hand: `paragraphHash` in
`lib/legal/normalize.ts` recomputes them from the text at load.

## The authority deliberately absent from the corpus

The Stitch reference design features a case styled *Pooja Ramesh Singh v.
State Bank of India & Anr.*, `2026 INSC 668`. No such authority exists, and
seeding it as a real record would have violated the first rule in
[`LEGAL_DATA_RULES.md`](../../CaseLens_Claude_Build_Kit/CaseLens_Claude_Build_Kit/LEGAL_DATA_RULES.md).

It is therefore **not in the corpus**. It appears only inside the demo brief,
as a citation the verification engine cannot resolve — which is a better
demonstration than seeding it would have been, because it exercises the
`NO_AUTHORITATIVE_MATCH` path and the careful wording that path requires.

## The demo brief

`server/db/seed/demo-brief.ts` holds a synthetic written submission. It is not
a real filing and is not attributed to any real proceeding, chamber or
advocate. It plants one instance of each failure mode:

| Citation in the brief | Expected finding |
| --- | --- |
| `(2021) 9 SCC 321` — *Lalit Kumar Jain* | `VERIFIED` |
| `Company Appeal (AT) (Insolvency) No. 346 of 2018` — *Vishnu Kumar Agarwal* | `VERIFIED` |
| `(2019) 17 SCC 394` — *V. Ramakrishnan*, wrong year | `METADATA_MISMATCH` |
| `(2020) 8 SCC 531` — *Essar Steel*, quotation not in the record | `PARAGRAPH_MISMATCH` |
| `(2021) 9 SCC 657` — *Ghanashyam Mishra*, proposition not borne out | `WEAK_PROPOSITION_SUPPORT` |
| `2026 INSC 668` — no such record | `NO_AUTHORITATIVE_MATCH` |

Regenerate the PDF after editing the brief:

```bash
npm run demo:pdf
```

Note one deliberate subtlety in the `(2020) 8 SCC 531` case: the reporter
volume year (2020) legitimately differs from the decision year (2019). The
engine treats both as acceptable, so a correct citation is not flagged — see
`acceptableYears` in `server/services/verification-service.ts`.

## Adding an authority

1. Append a `SeedCase` to `SEED_CASES` with a slug id, metadata, issues,
   paragraphs and a source URL.
2. Add any `SeedRelationship` entries. Only assert the direction that the
   source evidences; the reciprocal direction is derived at read time, so one
   evidenced record backs both views.
3. Add provision links via the case's `provisions` array.
4. Run `npm run test`. The corpus builder throws on a relationship that names
   an unknown case, and the provenance tests fail on any record without a
   source.
