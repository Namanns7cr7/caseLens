import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import benchmark from "@/seed/verification_benchmark.json";
import { detectCitations } from "@/lib/legal/citation";
import { extractPdfText } from "@/server/services/pdf-extract";
import { toExtractedCitation, verifyCitation } from "@/server/services/verification-service";

/**
 * The demo PDF must survive a real pdf.js round trip: what the extractor
 * recovers has to produce the same verification outcomes as the source text.
 * This is what makes the demo upload path genuine rather than special-cased.
 */

const PDF_PATH = resolve(
  process.cwd(),
  "public/demo/written-submissions-personal-guarantor.pdf",
);

async function extractedCitations() {
  const bytes = new Uint8Array(readFileSync(PDF_PATH));
  const { text, pageCount } = await extractPdfText(bytes);
  return {
    pageCount,
    text,
    citations: detectCitations(text).map((d, i) => toExtractedCitation("pdf-doc", d, i)),
  };
}

describe("demo PDF extraction", () => {
  it("extracts text from every page", async () => {
    const { text, pageCount } = await extractedCitations();
    expect(pageCount).toBeGreaterThanOrEqual(3);
    expect(text).toContain("WRITTEN SUBMISSIONS ON BEHALF OF THE FINANCIAL CREDITOR");
    expect(text).toContain("Lalit Kumar Jain");
  }, 30000);

  it("reproduces every benchmark outcome from the extracted PDF text", async () => {
    const { citations } = await extractedCitations();
    for (const entry of benchmark.cases) {
      const citation = citations.find((c) => c.rawText === entry.inputCitation);
      expect(citation, `"${entry.inputCitation}" not detected in extracted PDF text`).toBeDefined();
      if (!citation) continue;
      expect(verifyCitation(citation).status, entry.id).toBe(entry.expectedStatus);
    }
  }, 30000);
});
