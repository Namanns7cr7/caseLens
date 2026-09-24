import { describe, expect, it } from "vitest";

import { detectCitations } from "@/lib/legal/citation";
import { DEMO_BRIEF_TEXT } from "@/server/db/seed/demo-brief";
import {
  toExtractedCitation,
  verifyCitation,
} from "@/server/services/verification-service";
import type { ExtractedCitation, VerificationStatus } from "@/types/domain";

/**
 * End-to-end check of the deterministic verification pipeline against the
 * curated demo brief. Each expectation below is one of the failure modes
 * PRODUCT_SPEC.md requires the engine to distinguish.
 */

function citationsFromBrief(): ExtractedCitation[] {
  return detectCitations(DEMO_BRIEF_TEXT).map((d, i) => toExtractedCitation("demo-doc", d, i));
}

function findCitation(fragment: string): ExtractedCitation {
  const found = citationsFromBrief().find(
    (c) =>
      c.rawText.includes(fragment) ||
      (c.claimedCaseTitle ?? "").toLowerCase().includes(fragment.toLowerCase()),
  );
  if (!found) {
    throw new Error(
      `No citation matching "${fragment}". Detected: ${citationsFromBrief()
        .map((c) => `${c.rawText} :: ${c.claimedCaseTitle ?? "-"}`)
        .join(" | ")}`,
    );
  }
  return found;
}

function statusOf(fragment: string): VerificationStatus {
  return verifyCitation(findCitation(fragment)).status;
}

describe("citation detection", () => {
  it("finds every case citation in the demo brief", () => {
    const citations = citationsFromBrief();
    expect(citations.length).toBeGreaterThanOrEqual(6);
  });

  it("captures the case title that introduces a citation", () => {
    const citation = findCitation("(2021) 9 SCC 321");
    expect(citation.claimedCaseTitle).toMatch(/Lalit Kumar Jain/);
  });

  it("captures the claimed paragraph reference", () => {
    const citation = findCitation("(2021) 9 SCC 321");
    expect(citation.claimedParagraph).toBe("125");
  });

  it("captures the quotation attributed to the authority", () => {
    const citation = findCitation("(2021) 9 SCC 321");
    expect(citation.claimedQuotation).toContain("does not operate so as to discharge");
  });

  it("records character offsets for source highlighting", () => {
    for (const citation of citationsFromBrief()) {
      expect(citation.charStart).toBeGreaterThanOrEqual(0);
      expect(citation.charEnd).toBeGreaterThan(citation.charStart ?? 0);
      expect(DEMO_BRIEF_TEXT.slice(citation.charStart, citation.charEnd).replace(/\s+/g, " ")).toBe(
        citation.rawText,
      );
    }
  });
});

describe("verification statuses", () => {
  it("verifies a correctly cited and correctly quoted authority", () => {
    expect(statusOf("(2021) 9 SCC 321")).toBe("VERIFIED");
  });

  it("reports no authoritative match for an unresolvable citation", () => {
    expect(statusOf("2026 INSC 668")).toBe("NO_AUTHORITATIVE_MATCH");
  });

  it("flags a metadata mismatch when the cited year is wrong", () => {
    expect(statusOf("(2019) 17 SCC 394")).toBe("METADATA_MISMATCH");
  });

  it("flags a paragraph mismatch when the quotation is not in the record", () => {
    expect(statusOf("(2020) 8 SCC 531")).toBe("PARAGRAPH_MISMATCH");
  });

  it("flags weak support when the proposition is not borne out", () => {
    expect(statusOf("(2021) 9 SCC 657")).toBe("WEAK_PROPOSITION_SUPPORT");
  });
});

describe("verification language", () => {
  it("never describes an unmatched citation as fabricated", () => {
    const result = verifyCitation(findCitation("2026 INSC 668"));
    expect(result.explanation).toContain("No authoritative match in connected sources");
    expect(result.explanation.toLowerCase()).not.toMatch(/fake|fabricat|invented|bogus|non-existent/);
  });

  it("states that an unmatched citation is a coverage finding, not an existence finding", () => {
    const result = verifyCitation(findCitation("2026 INSC 668"));
    expect(result.explanation).toMatch(/not a finding that the authority does not exist/i);
  });
});

describe("evidence and provenance", () => {
  it("attaches provenance to every resolved result", () => {
    const result = verifyCitation(findCitation("(2021) 9 SCC 321"));
    expect(result.evidence.length).toBeGreaterThan(0);
    for (const ref of result.evidence) {
      expect(ref.sourceName).toBeTruthy();
      expect(ref.sourceUrl).toMatch(/^https?:\/\//);
    }
  });

  it("runs every deterministic check before any model is consulted", () => {
    const result = verifyCitation(findCitation("(2021) 9 SCC 321"));
    expect(result.checks.every((c) => c.deterministic)).toBe(true);
    expect(result.modelVersion).toBeUndefined();
  });

  it("produces a claimed-vs-authoritative comparison for the review pane", () => {
    const result = verifyCitation(findCitation("(2019) 17 SCC 394"));
    const year = result.claimedVsActual.find((c) => c.field === "Year");
    expect(year?.claimed).toBe("2019");
    expect(year?.authoritative).toBe("2018");
    expect(year?.agrees).toBe(false);
  });

  it("surfaces near-miss candidates when nothing resolves", () => {
    const result = verifyCitation(findCitation("2026 INSC 668"));
    expect(result.matchedCaseId).toBeUndefined();
    expect(result.score).toBeLessThan(0.2);
  });
});
