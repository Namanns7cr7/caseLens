import { describe, expect, it } from "vitest";

import { detectCitations, detectProvisions } from "@/lib/legal/citation";
import {
  extractYear,
  normalizeCaseTitle,
  normalizeCitation,
  normalizeParagraphRef,
  normalizeParagraphText,
  paragraphHash,
} from "@/lib/legal/normalize";
import {
  buildIdf,
  idfWeight,
  levenshteinRatio,
  longestCommonRunRatio,
  titleSimilarity,
  tokenContainment,
  weightedContainment,
} from "@/lib/legal/similarity";

/** Unit coverage for the normalization and similarity rules (docs/TESTING.md). */

describe("citation normalization", () => {
  it("folds punctuation and spacing variants to one key", () => {
    const canonical = normalizeCitation("(2018) 17 SCC 394");
    expect(normalizeCitation("(2018) 17 S.C.C. 394")).toBe(canonical);
    expect(normalizeCitation("2018  17   SCC  394")).toBe(canonical);
    expect(normalizeCitation("[2018] 17 SCC 394")).toBe(canonical);
  });

  it("keeps genuinely different citations distinct", () => {
    expect(normalizeCitation("(2018) 17 SCC 394")).not.toBe(normalizeCitation("(2019) 17 SCC 394"));
    expect(normalizeCitation("2018 INSC 712")).not.toBe(normalizeCitation("2018 INSC 713"));
  });

  it("extracts the year from a citation", () => {
    expect(extractYear("(2021) 9 SCC 321")).toBe(2021);
    expect(extractYear("2018 INSC 712")).toBe(2018);
    expect(extractYear("no year here")).toBeUndefined();
  });

  it("normalizes paragraph references in their common written forms", () => {
    expect(normalizeParagraphRef("at paragraph 26")).toBe("26");
    expect(normalizeParagraphRef("para 125")).toBe("125");
    expect(normalizeParagraphRef("¶ 18")).toBe("18");
    expect(normalizeParagraphRef("paragraphs 26-28")).toBe("26");
    expect(normalizeParagraphRef("no reference")).toBeUndefined();
  });
});

describe("case-title normalization", () => {
  it("strips honorifics, corporate suffixes and party connectors", () => {
    expect(normalizeCaseTitle("Dr. Vishnu Kumar Agarwal v. Piramal Enterprises Ltd.")).toBe(
      "vishnu kumar agarwal piramal enterprises",
    );
  });

  it("converges the common variants of one title", () => {
    const base = normalizeCaseTitle("State Bank of India v. V. Ramakrishnan & Anr.");
    expect(normalizeCaseTitle("State Bank of India vs V. Ramakrishnan and Others")).toBe(base);
    expect(normalizeCaseTitle("State Bank of India versus V. Ramakrishnan & Ors")).toBe(base);
  });
});

describe("case-title similarity", () => {
  it("scores variants of the same authority as the same case", () => {
    expect(
      titleSimilarity(
        "State Bank of India v. V. Ramakrishnan & Anr.",
        "State Bank of India vs V Ramakrishnan and Others",
      ),
    ).toBeGreaterThanOrEqual(0.72);
  });

  it("scores unrelated authorities well below the identity threshold", () => {
    expect(
      titleSimilarity(
        "Lalit Kumar Jain v. Union of India",
        "Committee of Creditors of Essar Steel India Ltd. v. Satish Kumar Gupta",
      ),
    ).toBeLessThan(0.45);
  });

  it("tolerates a misspelled party name", () => {
    expect(titleSimilarity("Lalit Kumar Jain v. Union of India", "Lalit Kumar Jane v. Union of India"))
      .toBeGreaterThan(0.6);
  });

  it("is symmetric", () => {
    const a = "Ghanashyam Mishra & Sons Pvt. Ltd. v. Edelweiss Asset Reconstruction Co. Ltd.";
    const b = "Ghanashyam Mishra and Sons v. Edelweiss ARC";
    expect(titleSimilarity(a, b)).toBeCloseTo(titleSimilarity(b, a), 10);
  });
});

describe("paragraph normalization and hashing", () => {
  const passage =
    "Section 14 refers to the corporate debtor only; personal guarantor assets are expressly excluded.";

  it("is stable across typography that carries no meaning", () => {
    const smartQuoted =
      "Section 14 refers to the corporate debtor only; personal guarantor assets are expressly excluded.";
    expect(paragraphHash(passage)).toBe(paragraphHash(smartQuoted));
  });

  it("ignores whitespace and case differences", () => {
    expect(paragraphHash(passage)).toBe(paragraphHash(`  SECTION 14   refers to the corporate
      debtor only; personal guarantor assets are expressly excluded.  `));
  });

  it("changes when the words change", () => {
    expect(paragraphHash(passage)).not.toBe(
      paragraphHash(passage.replace("excluded", "included")),
    );
  });

  it("strips punctuation from the canonical form", () => {
    expect(normalizeParagraphText("Section 14, read with § 60(2), applies.")).toBe(
      "section 14 read with section 60 2 applies",
    );
  });
});

describe("quotation matching measures", () => {
  const paragraph =
    "The liability of the surety under Section 128 of the Indian Contract Act is co-extensive with that of the principal debtor unless the contract provides otherwise.";

  it("scores a verbatim fragment as fully contained", () => {
    expect(tokenContainment("the liability of the surety is co-extensive", paragraph)).toBe(1);
  });

  it("scores an unrelated passage low", () => {
    expect(tokenContainment("the tribunal dismissed the appeal for non-prosecution", paragraph))
      .toBeLessThan(0.4);
  });

  it("detects a genuine verbatim run rather than shared vocabulary", () => {
    const verbatim = "under Section 128 of the Indian Contract Act is co-extensive";
    const scattered = "contract the surety section liability of debtor the principal";
    expect(longestCommonRunRatio(verbatim, paragraph)).toBeGreaterThan(
      longestCommonRunRatio(scattered, paragraph),
    );
  });

  it("levenshtein ratio is 1 for identical strings and 0 for disjoint ones", () => {
    expect(levenshteinRatio("2018 INSC 712", "2018 INSC 712")).toBe(1);
    expect(levenshteinRatio("abc", "xyz")).toBe(0);
  });
});

describe("IDF weighting", () => {
  const corpus = [
    "the moratorium under section 14 applies to the corporate debtor",
    "the resolution plan binds the corporate debtor and its creditors",
    "the surety liability is co-extensive with the principal debtor",
  ];
  const idf = buildIdf(corpus);

  it("weights a term appearing in every document below a rare one", () => {
    expect(idfWeight(idf, "the")).toBeLessThan(idfWeight(idf, "moratorium"));
  });

  it("gives an unseen term the maximum weight", () => {
    expect(idfWeight(idf, "forfeits")).toBeGreaterThan(idfWeight(idf, "moratorium"));
  });

  it("scores a proposition built from unseen terms as unsupported", () => {
    const weight = (term: string) => idfWeight(idf, term);
    const faithful = weightedContainment(
      "the moratorium applies to the corporate debtor",
      corpus[0] as string,
      weight,
    );
    const invented = weightedContainment(
      "the creditor forfeits its right where it participated and voted",
      corpus[0] as string,
      weight,
    );
    expect(faithful).toBeGreaterThan(0.9);
    expect(invented).toBeLessThan(0.2);
  });
});

describe("citation detection", () => {
  it("detects the Indian citation forms", () => {
    const text = `
The Court in Lalit Kumar Jain v. Union of India, (2021) 9 SCC 321, held otherwise.

A neutral citation such as 2018 INSC 712 is also recognised.

So is AIR 2018 SC 3054 and Company Appeal (AT) (Insolvency) No. 346 of 2018.
`;
    const found = detectCitations(text).map((c) => c.rawText);
    expect(found).toContain("(2021) 9 SCC 321");
    expect(found).toContain("2018 INSC 712");
    expect(found).toContain("AIR 2018 SC 3054");
    expect(found).toContain("Company Appeal (AT) (Insolvency) No. 346 of 2018");
  });

  it("does not attribute a quotation from one paragraph to a citation in the next", () => {
    const text = `
1. The Court held that "the assets of a personal guarantor stand outside the sweep of the moratorium declared under Section 14 of the Code" in that matter, (2018) 17 SCC 394.

2. A separate point arises under (2021) 9 SCC 657, which is cited without any quotation at all.
`;
    const detected = detectCitations(text);
    const first = detected.find((c) => c.rawText === "(2018) 17 SCC 394");
    const second = detected.find((c) => c.rawText === "(2021) 9 SCC 657");
    expect(first?.claimedQuotation).toContain("stand outside the sweep");
    expect(second?.claimedQuotation).toBeUndefined();
  });

  it("reads a case title that is split across a line break", () => {
    const text = `It was settled in State Bank of India v.
V. Ramakrishnan & Anr., (2018) 17 SCC 394, at paragraph 26.`;
    const detected = detectCitations(text)[0];
    expect(detected?.claimedCaseTitle).toMatch(/State Bank of India/);
    expect(detected?.claimedParagraph).toBe("26");
  });

  it("does not swallow the previous sentence into the case title", () => {
    const text = `The same principle was restated by a three-Judge Bench. In Pooja Ramesh Singh v. State Bank of India & Anr., 2026 INSC 668, the Court held at paragraph 18 that it applies.`;
    const detected = detectCitations(text)[0];
    expect(detected?.claimedCaseTitle).toBe("Pooja Ramesh Singh v. State Bank of India & Anr.");
  });

  it("detects statutory provisions", () => {
    const found = detectProvisions(
      "Read Section 14 of the Insolvency and Bankruptcy Code, 2016 with Section 128 of the Indian Contract Act.",
    );
    expect(found.map((p) => p.section)).toEqual(expect.arrayContaining(["14", "128"]));
  });
});
