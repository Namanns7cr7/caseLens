# Testing Strategy

## Unit tests

- citation normalization;
- case-title similarity;
- exact identifier matching;
- paragraph normalization/hash;
- verification-status rules;
- graph relationship mapping;
- source-provenance requirements.

## Integration tests

- search → case dossier;
- case → relationships;
- document upload → extraction → verification;
- investigation pin/move/save;
- report generation.

## E2E

Use Playwright for the golden demo flow.

## Benchmark fixture

`seed/verification_benchmark.json` should contain expected outcomes for known demo citations. The app must pass these before demo day.
