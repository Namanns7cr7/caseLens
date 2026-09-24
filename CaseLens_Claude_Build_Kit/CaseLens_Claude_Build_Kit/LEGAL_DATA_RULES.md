# Legal Data, Provenance & Responsible-AI Rules

## Source hierarchy

Prefer primary/official legal sources when available. Secondary databases may support discovery but should not silently replace primary authority in the evidence UI.

## Mandatory provenance fields

Every displayed legal authority should expose, where available:

- source name;
- court/issuer;
- citation/case number;
- decision/publication date;
- source URL;
- retrieval date;
- original paragraph/page.

## Verification language

Allowed statuses:

- Verified
- Metadata mismatch
- Paragraph mismatch
- Weak proposition support
- No authoritative match in connected sources
- Needs human review

Avoid definitive `fake` / `fabricated` unless the underlying authoritative record explicitly establishes that conclusion.

## AI rules

AI may:
- summarize;
- classify issues;
- suggest related evidence;
- compare propositions semantically;
- draft investigation notes.

AI may not be treated as the authority for:
- whether a precedent exists;
- the exact wording of a judgment;
- the current text of a statute;
- whether a case has been overruled without provenance.

## User-facing disclaimer

Use concise wording such as:

> AI-assisted legal research. Always verify against the linked primary authority before relying on a result.
