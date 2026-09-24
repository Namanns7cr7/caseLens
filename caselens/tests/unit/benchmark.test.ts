import { describe, expect, it } from "vitest";

import benchmark from "@/seed/verification_benchmark.json";
import { detectCitations } from "@/lib/legal/citation";
import { DEMO_BRIEF_TEXT } from "@/server/db/seed/demo-brief";
import { toExtractedCitation, verifyCitation } from "@/server/services/verification-service";

/**
 * The benchmark gate from docs/TESTING.md: the app must reproduce every
 * expected outcome in `seed/verification_benchmark.json` before demo day.
 */

const citations = detectCitations(DEMO_BRIEF_TEXT).map((d, i) =>
  toExtractedCitation("benchmark-doc", d, i),
);

describe("verification benchmark fixture", () => {
  it("has no unreplaced placeholder entries", () => {
    for (const entry of benchmark.cases) {
      expect(entry.inputCitation).not.toMatch(/PLACEHOLDER/i);
    }
  });

  for (const entry of benchmark.cases) {
    it(`${entry.id}: ${entry.inputCitation} -> ${entry.expectedStatus}`, () => {
      const citation = citations.find((c) => c.rawText === entry.inputCitation);
      expect(citation, `citation "${entry.inputCitation}" was not detected in the demo brief`).toBeDefined();
      if (!citation) return;

      expect(citation.claimedCaseTitle).toBe(entry.claimedCaseTitle);
      expect(verifyCitation(citation).status).toBe(entry.expectedStatus);
    });
  }

  it("covers every status the product claims to distinguish", () => {
    const covered = new Set(benchmark.cases.map((c) => c.expectedStatus));
    for (const status of [
      "VERIFIED",
      "METADATA_MISMATCH",
      "PARAGRAPH_MISMATCH",
      "WEAK_PROPOSITION_SUPPORT",
      "NO_AUTHORITATIVE_MATCH",
    ]) {
      expect(covered.has(status), `benchmark does not cover ${status}`).toBe(true);
    }
  });
});
