import "server-only";

import type { DetectedCitation } from "@/lib/legal/citation";
import { extractYear, normalizeCitation, normalizeParagraphText } from "@/lib/legal/normalize";
import {
  idfWeight,
  longestCommonRunRatio,
  titleSimilarity,
  tokenContainment,
  weightedContainment,
  weightedCosine,
} from "@/lib/legal/similarity";
import { getIdfIndex } from "@/server/db/seed";
import {
  findCaseByCitation,
  findCasesByTitle,
  listParagraphs,
} from "@/server/repositories/case-repository";
import { NO_MATCH_WORDING } from "@/server/services/provenance";
import type {
  CaseSummary,
  ClaimComparison,
  ExtractedCitation,
  JudgmentParagraph,
  ProvenanceRef,
  VerificationCheck,
  VerificationResult,
  VerificationStatus,
} from "@/types/domain";

/**
 * The verification engine.
 *
 * ARCHITECTURE.md fixes the order and the division of labour:
 *
 *   Extract -> Normalize -> Exact identifier lookup -> Metadata consistency
 *   -> Retrieve source judgment -> Paragraph exact/fuzzy -> Semantic
 *   proposition check -> Human-readable explanation
 *
 * "The LLM does not determine whether an authoritative record exists.
 *  Database/source evidence does."
 *
 * Every step below is deterministic. The model is consulted only by
 * `server/ai/proposition.ts`, only after a record has already been resolved,
 * and only to explain support for a proposition — never to decide existence,
 * wording, or status. If the model is unavailable the engine degrades to a
 * deterministic lexical measure and says so in the check detail.
 */

/* Thresholds. Tuned against `seed/verification_benchmark.json`. */
export const THRESHOLDS = {
  /** Title similarity above which two titles denote the same authority. */
  titleSame: 0.72,
  /** Title similarity below which we refuse to treat a candidate as a match. */
  titleCandidate: 0.45,
  /** Token containment above which a quotation counts as verbatim. */
  quotationVerbatim: 0.85,
  /** Containment above which a quotation is a close but imperfect match. */
  quotationClose: 0.62,
  /** Longest-common-run ratio evidencing a genuine shared passage. */
  runVerbatim: 0.45,
  /**
   * Proposition-support band, calibrated against
   * `seed/verification_benchmark.json`. Measured scores on the benchmark:
   * an accurately stated holding lands at 0.32-0.75, while a proposition the
   * authority does not bear out lands at 0.22 or below.
   *
   * The band between the two is deliberately narrow, and that narrowness is
   * why the AI proposition check exists: a lexical measure cannot tell a
   * faithful restatement from its negation, so anything in the band is
   * routed to human review rather than being called either way.
   */
  propositionSupported: 0.28,
  /** Similarity below which support is reported as weak. */
  propositionWeak: 0.24,
} as const;

function check(
  id: string,
  label: string,
  outcome: VerificationCheck["outcome"],
  detail: string,
  deterministic = true,
): VerificationCheck {
  return { id, label, outcome, detail, deterministic };
}

function formatDate(date: string | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/* ------------------------------------------------------------------ */
/* Step 1 — resolve the authority                                      */
/* ------------------------------------------------------------------ */

interface Resolution {
  match?: CaseSummary;
  /** How the record was found, for the explanation. */
  method: "EXACT_CITATION" | "FUZZY_TITLE" | "NONE";
  titleSimilarity?: number;
  checks: VerificationCheck[];
  /** Candidates considered but rejected, shown in the evidence pane. */
  nearMisses: Array<{ case: CaseSummary; similarity: number }>;
}

/** Years under which a record is legitimately cited: decision and reporter years. */
function acceptableYears(match: CaseSummary): Set<number> {
  const years = new Set<number>();
  if (match.decisionDate) years.add(Number(match.decisionDate.slice(0, 4)));
  for (const value of [match.neutralCitation, ...match.reporterCitations, match.caseNumber]) {
    const year = value ? extractYear(value) : undefined;
    if (year) years.add(year);
  }
  return years;
}

/**
 * Breaks ties between candidates whose titles are equally similar.
 *
 * The same parties are often before several forums in one matter, so two
 * records can normalize to an identical title — the appellate decision and
 * the order it reviews. Title similarity alone then picks arbitrarily, and
 * picking wrong produces a confusing finding against the wrong record.
 *
 * The other things the document states about the citation — the reporter
 * series, the forum it names, the year — disambiguate them, which is how a
 * reader would tell the two apart.
 */
function disambiguate(
  candidates: Array<{ case: CaseSummary; similarity: number }>,
  citation: ExtractedCitation,
): Array<{ case: CaseSummary; similarity: number }> {
  if (candidates.length < 2) return candidates;

  const best = candidates[0]?.similarity ?? 0;
  // Only candidates effectively tied on title need disambiguating.
  const tied = candidates.filter((c) => best - c.similarity < 0.05);
  if (tied.length < 2) return candidates;

  const score = (summary: CaseSummary): number => {
    let points = 0;

    if (citation.claimedReporter) {
      const reporters = [summary.neutralCitation, ...summary.reporterCitations]
        .filter((value): value is string => Boolean(value))
        .map((value) => normalizeCitation(value));
      if (reporters.some((r) => r.includes(citation.claimedReporter as string))) points += 3;
    }

    if (citation.claimedCourt) {
      const claimed = citation.claimedCourt.toLowerCase();
      if (
        summary.court.toLowerCase().includes(claimed) ||
        claimed.includes(summary.courtShortName.toLowerCase()) ||
        titleSimilarity(citation.claimedCourt, summary.court) >= 0.6
      ) {
        points += 3;
      }
    }

    if (citation.claimedYear) {
      const years = acceptableYears(summary);
      if (years.has(citation.claimedYear)) points += 2;
      // A citation off by a year still points at this record more than at one
      // decided in a different era.
      else if ([...years].some((y) => Math.abs(y - citation.claimedYear!) <= 1)) points += 1;
    }

    if (citation.claimedParagraph) {
      const paragraphs = listParagraphs(summary.id);
      if (paragraphs.some((p) => p.paragraphNumber === citation.claimedParagraph)) points += 1;
    }

    return points;
  };

  const ranked = tied
    .map((candidate) => ({ ...candidate, points: score(candidate.case) }))
    .sort((a, b) => b.points - a.points || b.similarity - a.similarity);

  const rest = candidates.filter((c) => !tied.includes(c));
  return [...ranked.map(({ case: c, similarity }) => ({ case: c, similarity })), ...rest];
}

function resolveAuthority(citation: ExtractedCitation): Resolution {
  const checks: VerificationCheck[] = [];

  // Exact identifier lookup over every indexed citation form.
  const identifiers = [
    citation.normalizedCitation,
    citation.claimedNeutralCitation,
    citation.rawText,
  ].filter((value): value is string => Boolean(value));

  for (const identifier of identifiers) {
    const hit = findCaseByCitation(identifier);
    if (hit) {
      checks.push(
        check(
          "exact-identifier",
          "Exact identifier lookup",
          "PASS",
          `Citation “${identifier.trim()}” resolves to an indexed record: ${hit.title}.`,
        ),
      );
      return { match: hit, method: "EXACT_CITATION", checks, nearMisses: [] };
    }
  }

  checks.push(
    check(
      "exact-identifier",
      "Exact identifier lookup",
      "FAIL",
      `No indexed authority carries the citation “${citation.rawText}”.`,
    ),
  );

  // Fall back to fuzzy title matching against the corpus.
  if (citation.claimedCaseTitle) {
    const candidates = disambiguate(
      findCasesByTitle(citation.claimedCaseTitle, THRESHOLDS.titleCandidate),
      citation,
    );
    const best = candidates[0];
    if (best && best.similarity >= THRESHOLDS.titleSame) {
      checks.push(
        check(
          "fuzzy-title",
          "Case-title similarity",
          "PARTIAL",
          `Cited title is ${Math.round(best.similarity * 100)}% similar to the indexed authority “${best.case.title}”, but the citation identifier does not match that record.`,
        ),
      );
      return {
        match: best.case,
        method: "FUZZY_TITLE",
        titleSimilarity: best.similarity,
        checks,
        nearMisses: candidates.slice(1, 3),
      };
    }
    checks.push(
      check(
        "fuzzy-title",
        "Case-title similarity",
        "FAIL",
        best
          ? `Closest indexed title “${best.case.title}” reaches only ${Math.round(best.similarity * 100)}% similarity, below the ${Math.round(THRESHOLDS.titleSame * 100)}% threshold for treating it as the same authority.`
          : "No indexed authority carries a comparable case title.",
      ),
    );
    return { method: "NONE", checks, nearMisses: candidates.slice(0, 3) };
  }

  checks.push(
    check(
      "fuzzy-title",
      "Case-title similarity",
      "SKIPPED",
      "The document does not state a case title alongside this citation, so no title comparison was possible.",
    ),
  );
  return { method: "NONE", checks, nearMisses: [] };
}

/* ------------------------------------------------------------------ */
/* Step 2 — metadata consistency                                       */
/* ------------------------------------------------------------------ */

interface MetadataOutcome {
  checks: VerificationCheck[];
  comparisons: ClaimComparison[];
  mismatches: string[];
}

function checkMetadata(citation: ExtractedCitation, match: CaseSummary): MetadataOutcome {
  const checks: VerificationCheck[] = [];
  const comparisons: ClaimComparison[] = [];
  const mismatches: string[] = [];

  /* Case title */
  if (citation.claimedCaseTitle) {
    const similarity = titleSimilarity(citation.claimedCaseTitle, match.title);
    const agrees = similarity >= THRESHOLDS.titleSame;
    comparisons.push({
      field: "Case title",
      claimed: citation.claimedCaseTitle,
      authoritative: match.title,
      agrees,
    });
    if (!agrees) mismatches.push("case title");
    checks.push(
      check(
        "metadata-title",
        "Case title consistency",
        agrees ? "PASS" : "FAIL",
        agrees
          ? `Cited title matches the indexed record (${Math.round(similarity * 100)}% similarity).`
          : `Cited title “${citation.claimedCaseTitle}” does not correspond to the authority carrying this citation, which is “${match.title}”.`,
      ),
    );
  }

  /* Year.
   *
   * A reporter citation carries the volume year, which routinely differs
   * from the decision year — (2020) 8 SCC 531 reports a judgment delivered
   * in November 2019. Comparing the cited year against the decision year
   * alone would flag correct citations. The acceptable set is therefore the
   * decision year together with every year appearing in the record's own
   * citations. */
  const authoritativeYear = match.decisionDate ? Number(match.decisionDate.slice(0, 4)) : undefined;
  if (citation.claimedYear && authoritativeYear) {
    const years = acceptableYears(match);
    const agrees = years.has(citation.claimedYear);
    comparisons.push({
      field: "Year",
      claimed: String(citation.claimedYear),
      authoritative: String(authoritativeYear),
      agrees,
    });
    if (!agrees) mismatches.push("year");
    checks.push(
      check(
        "metadata-year",
        "Year consistency",
        agrees ? "PASS" : "FAIL",
        agrees
          ? `Cited year ${citation.claimedYear} is consistent with the indexed record (decided ${authoritativeYear}; recorded citation years ${[...years].sort().join(", ")}).`
          : `The document cites this authority as ${citation.claimedYear}. The indexed record was decided in ${authoritativeYear} and is reported as ${[...years].sort().join(", ")}.`,
      ),
    );
  }

  /* Reporter */
  if (citation.claimedReporter) {
    const reporters = [match.neutralCitation, ...match.reporterCitations]
      .filter((value): value is string => Boolean(value))
      .map((value) => normalizeCitation(value));
    const agrees = reporters.some((r) => r.includes(citation.claimedReporter as string));
    comparisons.push({
      field: "Reporter",
      claimed: citation.claimedReporter,
      authoritative: match.reporterCitations.join("; ") || match.neutralCitation || null,
      agrees,
    });
    if (!agrees) mismatches.push("reporter series");
    checks.push(
      check(
        "metadata-reporter",
        "Reporter series consistency",
        agrees ? "PASS" : "FAIL",
        agrees
          ? `Reporter series ${citation.claimedReporter} appears among the indexed citations for this authority.`
          : `Reporter series ${citation.claimedReporter} is not among the citations recorded for this authority (${match.reporterCitations.join("; ") || "none recorded"}).`,
      ),
    );
  }

  /* Court */
  if (citation.claimedCourt) {
    const agrees =
      titleSimilarity(citation.claimedCourt, match.court) >= 0.5 ||
      match.court.toLowerCase().includes(citation.claimedCourt.toLowerCase()) ||
      citation.claimedCourt.toLowerCase().includes(match.courtShortName.toLowerCase());
    comparisons.push({
      field: "Forum",
      claimed: citation.claimedCourt,
      authoritative: match.court,
      agrees,
    });
    if (!agrees) mismatches.push("forum");
    checks.push(
      check(
        "metadata-court",
        "Forum consistency",
        agrees ? "PASS" : "FAIL",
        agrees
          ? `The document attributes this authority to ${match.court}, consistent with the indexed record.`
          : `The document attributes this authority to ${citation.claimedCourt}; the indexed record is a decision of ${match.court}.`,
      ),
    );
  }

  comparisons.push({
    field: "Decision date",
    claimed: null,
    authoritative: formatDate(match.decisionDate),
    agrees: true,
  });

  return { checks, comparisons, mismatches };
}

/* ------------------------------------------------------------------ */
/* Step 3 — paragraph / quotation verification                         */
/* ------------------------------------------------------------------ */

interface ParagraphOutcome {
  checks: VerificationCheck[];
  matchedParagraph?: JudgmentParagraph;
  /** True when a quotation was claimed and could not be located. */
  quotationMismatch: boolean;
  /** True when the cited paragraph number does not exist in the record. */
  paragraphNumberMissing: boolean;
  bestContainment: number;
}

function checkParagraph(citation: ExtractedCitation, match: CaseSummary): ParagraphOutcome {
  const checks: VerificationCheck[] = [];
  const paragraphs = listParagraphs(match.id);
  let matchedParagraph: JudgmentParagraph | undefined;
  let quotationMismatch = false;
  let paragraphNumberMissing = false;
  let bestContainment = 0;

  /* 3a. Paragraph-number lookup. */
  let citedParagraph: JudgmentParagraph | undefined;
  if (citation.claimedParagraph) {
    citedParagraph = paragraphs.find((p) => p.paragraphNumber === citation.claimedParagraph);
    if (citedParagraph) {
      checks.push(
        check(
          "paragraph-number",
          "Paragraph number lookup",
          "PASS",
          `Paragraph ${citation.claimedParagraph} exists in the indexed judgment.`,
        ),
      );
      matchedParagraph = citedParagraph;
    } else {
      paragraphNumberMissing = true;
      checks.push(
        check(
          "paragraph-number",
          "Paragraph number lookup",
          "FAIL",
          `The document cites paragraph ${citation.claimedParagraph}, which is not present in the indexed text of this judgment (indexed paragraphs: ${paragraphs.map((p) => p.paragraphNumber).join(", ") || "none"}).`,
        ),
      );
    }
  } else {
    checks.push(
      check(
        "paragraph-number",
        "Paragraph number lookup",
        "SKIPPED",
        "The document does not pin this citation to a paragraph.",
      ),
    );
  }

  /* 3b. Quotation matching — exact first, then fuzzy. */
  if (citation.claimedQuotation) {
    const normalizedQuote = normalizeParagraphText(citation.claimedQuotation);

    let exact: JudgmentParagraph | undefined;
    for (const paragraph of paragraphs) {
      if (normalizeParagraphText(paragraph.text).includes(normalizedQuote)) {
        exact = paragraph;
        break;
      }
    }

    if (exact) {
      bestContainment = 1;
      matchedParagraph = exact;
      checks.push(
        check(
          "quotation-exact",
          "Quotation exact match",
          "PASS",
          `The quoted passage appears verbatim at ¶ ${exact.paragraphNumber} of the indexed judgment.`,
        ),
      );
    } else {
      // Fuzzy: highest token containment across paragraphs.
      let best: { paragraph: JudgmentParagraph; containment: number; run: number } | undefined;
      for (const paragraph of paragraphs) {
        const containment = tokenContainment(citation.claimedQuotation, paragraph.text);
        const run = longestCommonRunRatio(citation.claimedQuotation, paragraph.text);
        if (!best || containment > best.containment) best = { paragraph, containment, run };
      }
      bestContainment = best?.containment ?? 0;

      if (best && best.containment >= THRESHOLDS.quotationVerbatim && best.run >= THRESHOLDS.runVerbatim) {
        matchedParagraph = best.paragraph;
        checks.push(
          check(
            "quotation-exact",
            "Quotation match",
            "PARTIAL",
            `The quoted passage matches ¶ ${best.paragraph.paragraphNumber} on ${Math.round(best.containment * 100)}% of its words, with wording differences. Compare against the primary text before quoting.`,
          ),
        );
      } else if (best && best.containment >= THRESHOLDS.quotationClose) {
        matchedParagraph = best.paragraph;
        quotationMismatch = true;
        checks.push(
          check(
            "quotation-exact",
            "Quotation match",
            "FAIL",
            `The quoted passage only partially corresponds to the indexed text. The closest paragraph is ¶ ${best.paragraph.paragraphNumber} at ${Math.round(best.containment * 100)}% word overlap, which is below the threshold for a verbatim quotation.`,
          ),
        );
      } else {
        quotationMismatch = true;
        checks.push(
          check(
            "quotation-exact",
            "Quotation match",
            "FAIL",
            best
              ? `No paragraph of the indexed judgment contains this passage. The closest is ¶ ${best.paragraph.paragraphNumber} at ${Math.round(best.containment * 100)}% word overlap.`
              : "The indexed record carries no paragraph text against which this quotation could be checked.",
          ),
        );
      }
    }

    // A quotation that resolves to a different paragraph than the one cited.
    if (citedParagraph && matchedParagraph && citedParagraph.id !== matchedParagraph.id) {
      quotationMismatch = true;
      checks.push(
        check(
          "quotation-location",
          "Quotation location",
          "FAIL",
          `The passage is attributed to ¶ ${citedParagraph.paragraphNumber} but corresponds to ¶ ${matchedParagraph.paragraphNumber} of the indexed judgment.`,
        ),
      );
    }
  } else {
    checks.push(
      check(
        "quotation-exact",
        "Quotation match",
        "SKIPPED",
        "The document does not quote this authority directly.",
      ),
    );
  }

  if (!matchedParagraph) {
    matchedParagraph = paragraphs.find((p) => p.isRatio) ?? paragraphs[0];
  }

  return {
    checks,
    ...(matchedParagraph ? { matchedParagraph } : {}),
    quotationMismatch,
    paragraphNumberMissing,
    bestContainment,
  };
}

/* ------------------------------------------------------------------ */
/* Step 4 — proposition support (deterministic baseline)               */
/* ------------------------------------------------------------------ */

export interface PropositionOutcome {
  check: VerificationCheck;
  similarity: number;
  supported: boolean;
  weak: boolean;
  bestParagraph?: JudgmentParagraph;
}

/**
 * Deterministic proposition support: how well the sentence carrying the
 * citation is borne out by the authority's own paragraphs. This runs before
 * any model call and is what the engine falls back to when no model is
 * configured. It is a lexical measure and is labelled as such.
 */
export function checkProposition(
  citation: ExtractedCitation,
  match: CaseSummary,
): PropositionOutcome {
  const proposition = citation.claimedProposition;
  if (!proposition) {
    return {
      check: check(
        "proposition-support",
        "Proposition support",
        "SKIPPED",
        "The document does not state a proposition for this citation.",
      ),
      similarity: 0,
      supported: true,
      weak: false,
    };
  }

  const idf = getIdfIndex();
  const paragraphs = listParagraphs(match.id);
  let best: { paragraph: JudgmentParagraph; score: number } | undefined;
  for (const paragraph of paragraphs) {
    // Containment is the primary measure; cosine guards against a short
    // proposition scoring high purely by being a subset of common terms.
    const weight = (term: string) => idfWeight(idf, term);
    const score = Math.max(
      weightedContainment(proposition, paragraph.text, weight),
      weightedCosine(proposition, paragraph.text, weight),
    );
    if (!best || score > best.score) best = { paragraph, score };
  }

  const similarity = best?.score ?? 0;
  const supported = similarity >= THRESHOLDS.propositionSupported;
  const weak = similarity < THRESHOLDS.propositionWeak;

  return {
    check: check(
      "proposition-support",
      "Proposition support",
      supported ? "PASS" : weak ? "FAIL" : "PARTIAL",
      best
        ? `Deterministic comparison (IDF-weighted term overlap, no model) scores the cited proposition at ${Math.round(similarity * 100)}% against ¶ ${best.paragraph.paragraphNumber}, the closest passage in the indexed judgment.`
        : "The indexed record carries no paragraph text against which this proposition could be compared.",
    ),
    similarity,
    supported,
    weak,
    ...(best ? { bestParagraph: best.paragraph } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Status resolution                                                   */
/* ------------------------------------------------------------------ */

/**
 * Maps deterministic findings to a status. Ordered by severity: an
 * unresolvable record outranks a metadata problem, which outranks a
 * paragraph problem, which outranks weak proposition support.
 */
export function resolveStatus(input: {
  resolved: boolean;
  method: Resolution["method"];
  metadataMismatches: string[];
  quotationMismatch: boolean;
  paragraphNumberMissing: boolean;
  propositionSupported: boolean;
  propositionWeak: boolean;
  hasParagraphText: boolean;
  /** Matched a coverage-index record: known by citation, nothing verified. */
  coverageOnly?: boolean;
}): VerificationStatus {
  if (!input.resolved) return "NO_AUTHORITATIVE_MATCH";

  /* A coverage-index record establishes only that the authority is known.
   * Its own metadata is unverified, so a disagreement is as likely to be our
   * error as the document's — reporting a mismatch would be accusing a
   * possibly-correct citation on the strength of a possibly-wrong record.
   * The honest outcome is that a person has to look. */
  if (input.coverageOnly) return "NEEDS_REVIEW";

  if (input.method === "FUZZY_TITLE" || input.metadataMismatches.length > 0) {
    return "METADATA_MISMATCH";
  }
  if (input.quotationMismatch || input.paragraphNumberMissing) return "PARAGRAPH_MISMATCH";
  if (!input.hasParagraphText) return "NEEDS_REVIEW";
  if (input.propositionWeak) return "WEAK_PROPOSITION_SUPPORT";
  if (!input.propositionSupported) return "NEEDS_REVIEW";
  return "VERIFIED";
}

function scoreFor(status: VerificationStatus, propositionSimilarity: number): number {
  const base: Record<VerificationStatus, number> = {
    VERIFIED: 0.94,
    METADATA_MISMATCH: 0.38,
    PARAGRAPH_MISMATCH: 0.42,
    WEAK_PROPOSITION_SUPPORT: 0.55,
    NO_AUTHORITATIVE_MATCH: 0.05,
    NEEDS_REVIEW: 0.6,
  };
  const adjustment = status === "VERIFIED" ? Math.min(0.06, propositionSimilarity / 10) : 0;
  return Math.round((base[status] + adjustment) * 1000) / 1000;
}

/* ------------------------------------------------------------------ */
/* Explanation                                                         */
/* ------------------------------------------------------------------ */

function explain(
  status: VerificationStatus,
  citation: ExtractedCitation,
  match: CaseSummary | undefined,
  metadataMismatches: string[],
  nearMisses: Array<{ case: CaseSummary; similarity: number }>,
): string {
  const cited = citation.rawText.trim();
  switch (status) {
    case "VERIFIED":
      return `The citation ${cited} resolves to ${match?.title}, and the metadata, paragraph reference and quoted passage are all consistent with the indexed record.`;
    case "METADATA_MISMATCH": {
      const fields = metadataMismatches.length
        ? metadataMismatches.join(", ")
        : "citation identifier";
      return `An indexed authority was located, but the document's ${fields} does not agree with it. The document cites ${cited}${citation.claimedCaseTitle ? ` as “${citation.claimedCaseTitle}”` : ""}, while the indexed record is ${match?.title}${match?.citation ? `, ${match.citation}` : ""}. Confirm which authority was intended before relying on this citation.`;
    }
    case "PARAGRAPH_MISMATCH":
      return `The authority ${match?.title} was located, but the passage or paragraph attributed to it does not correspond to the indexed text. Compare the quoted words against the primary source before relying on them.`;
    case "WEAK_PROPOSITION_SUPPORT":
      return `The authority ${match?.title} exists and the citation metadata is consistent, but the proposition the document draws from it finds little support in the indexed paragraphs. Human review is required.`;
    case "NO_AUTHORITATIVE_MATCH": {
      const near = nearMisses.length
        ? ` The closest indexed authorities are ${nearMisses
            .map((n) => `${n.case.title} (${Math.round(n.similarity * 100)}% title similarity)`)
            .join("; ")}.`
        : "";
      return `${NO_MATCH_WORDING}. The citation ${cited}${citation.claimedCaseTitle ? ` attributed to “${citation.claimedCaseTitle}”` : ""} does not correspond to any record in the sources CaseLens is connected to. This is a statement about coverage of the connected sources, not a finding that the authority does not exist — confirm against the reporter or the issuing court's record.${near}`;
    }
    case "NEEDS_REVIEW":
    default:
      if (match?.coverageOnly) {
        return `${match.title} is a known authority in the connected sources, and the citation ${cited} resolves to it. Its judgment text is not indexed, so the quoted passage and the proposition drawn from it could not be checked, and its metadata has not been independently verified — no mismatch is reported on the strength of an unverified record. Confirm the citation and the passage against the primary record.`;
      }
      return `The citation ${cited} could be resolved, but the automated checks did not produce a confident result. Human review is required.`;
  }
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export interface VerifyOptions {
  /** Injected by the document service after the AI step, when available. */
  aiOverride?: {
    check: VerificationCheck;
    supported: boolean;
    weak: boolean;
    modelVersion: string;
  };
}

/**
 * Runs the full deterministic pipeline for one extracted citation.
 * Pure with respect to the corpus: no I/O, no model calls.
 */
export function verifyCitation(
  citation: ExtractedCitation,
  options: VerifyOptions = {},
): VerificationResult {
  const resolution = resolveAuthority(citation);
  const checks: VerificationCheck[] = [...resolution.checks];
  const evidence: ProvenanceRef[] = [];
  let comparisons: ClaimComparison[] = [];
  let metadataMismatches: string[] = [];
  let quotationMismatch = false;
  let paragraphNumberMissing = false;
  let propositionSimilarity = 0;
  let propositionSupported = true;
  let propositionWeak = false;
  let matchedParagraph: JudgmentParagraph | undefined;
  let hasParagraphText = false;

  const match = resolution.match;

  if (match) {
    evidence.push(...match.provenance);

    const metadata = checkMetadata(citation, match);
    checks.push(...metadata.checks);
    comparisons = metadata.comparisons;
    metadataMismatches = metadata.mismatches;

    hasParagraphText = listParagraphs(match.id).length > 0;

    if (match.coverageOnly) {
      /* Nothing to check the words against. Running the paragraph and
       * proposition steps here would report FAIL for checks that were never
       * possible, which reads as a finding against the citation rather than
       * a limit of the index. They are recorded as skipped, with the reason. */
      checks.push(
        check(
          "paragraph-number",
          "Paragraph number lookup",
          "SKIPPED",
          `The judgment text of ${match.title} is not indexed, so no paragraph could be looked up.`,
        ),
        check(
          "quotation-exact",
          "Quotation match",
          "SKIPPED",
          "No indexed passage exists for this authority, so a quotation cannot be checked against it.",
        ),
        check(
          "proposition-support",
          "Proposition support",
          "SKIPPED",
          "Proposition support is measured against the authority's own paragraphs, which are not indexed for this record.",
        ),
      );
    } else {
      const paragraphOutcome = checkParagraph(citation, match);
      checks.push(...paragraphOutcome.checks);
      matchedParagraph = paragraphOutcome.matchedParagraph;
      quotationMismatch = paragraphOutcome.quotationMismatch;
      paragraphNumberMissing = paragraphOutcome.paragraphNumberMissing;

      if (matchedParagraph) evidence.push(...matchedParagraph.provenance);

      const proposition = checkProposition(citation, match);
      propositionSimilarity = proposition.similarity;
      propositionSupported = proposition.supported;
      propositionWeak = proposition.weak;

      // The model may refine the proposition step only — never the steps above.
      if (options.aiOverride) {
        checks.push(proposition.check);
        checks.push(options.aiOverride.check);
        propositionSupported = options.aiOverride.supported;
        propositionWeak = options.aiOverride.weak;
      } else {
        checks.push(proposition.check);
      }
    }
  } else {
    comparisons = [
      {
        field: "Case title",
        claimed: citation.claimedCaseTitle ?? null,
        authoritative: null,
        agrees: false,
      },
      {
        field: "Citation",
        claimed: citation.rawText,
        authoritative: null,
        agrees: false,
      },
      {
        field: "Year",
        claimed: citation.claimedYear ? String(citation.claimedYear) : null,
        authoritative: null,
        agrees: false,
      },
      {
        field: "Forum",
        claimed: citation.claimedCourt ?? null,
        authoritative: null,
        agrees: false,
      },
    ];
    // Near-miss candidates are evidence about coverage, so they are surfaced.
    for (const nearMiss of resolution.nearMisses) evidence.push(...nearMiss.case.provenance);
  }

  const status = resolveStatus({
    resolved: Boolean(match),
    method: resolution.method,
    metadataMismatches,
    quotationMismatch,
    paragraphNumberMissing,
    propositionSupported,
    propositionWeak,
    hasParagraphText,
    ...(match?.coverageOnly ? { coverageOnly: true } : {}),
  });

  return {
    id: `vr-${citation.id}`,
    extractedCitationId: citation.id,
    status,
    score: scoreFor(status, propositionSimilarity),
    explanation: explain(status, citation, match, metadataMismatches, resolution.nearMisses),
    ...(match ? { matchedCaseId: match.id } : {}),
    ...(matchedParagraph ? { matchedParagraphId: matchedParagraph.id } : {}),
    checks,
    evidence,
    claimedVsActual: comparisons,
    ...(options.aiOverride ? { modelVersion: options.aiOverride.modelVersion } : {}),
    createdAt: new Date().toISOString(),
  };
}

/** Converts a detector hit into the stored citation record. */
export function toExtractedCitation(
  documentId: string,
  detected: DetectedCitation,
  index: number,
  pageNumber?: number,
): ExtractedCitation {
  return {
    id: `${documentId}--c${index + 1}`,
    documentId,
    rawText: detected.rawText,
    normalizedCitation: detected.normalizedCitation,
    ...(pageNumber !== undefined ? { pageNumber } : {}),
    charStart: detected.charStart,
    charEnd: detected.charEnd,
    ...(detected.claimedCaseTitle ? { claimedCaseTitle: detected.claimedCaseTitle } : {}),
    ...(detected.claimedYear !== undefined ? { claimedYear: detected.claimedYear } : {}),
    ...(detected.claimedReporter ? { claimedReporter: detected.claimedReporter } : {}),
    ...(detected.claimedNeutralCitation
      ? { claimedNeutralCitation: detected.claimedNeutralCitation }
      : {}),
    ...(detected.claimedCourt ? { claimedCourt: detected.claimedCourt } : {}),
    ...(detected.claimedParagraph ? { claimedParagraph: detected.claimedParagraph } : {}),
    ...(detected.claimedQuotation ? { claimedQuotation: detected.claimedQuotation } : {}),
    ...(detected.claimedProposition ? { claimedProposition: detected.claimedProposition } : {}),
  };
}

export const STATUS_LABELS: Record<VerificationStatus, string> = {
  VERIFIED: "Verified",
  METADATA_MISMATCH: "Metadata mismatch",
  PARAGRAPH_MISMATCH: "Paragraph mismatch",
  WEAK_PROPOSITION_SUPPORT: "Weak proposition support",
  NO_AUTHORITATIVE_MATCH: NO_MATCH_WORDING,
  NEEDS_REVIEW: "Needs human review",
};

export const STATUS_TONE: Record<VerificationStatus, "verified" | "review" | "mismatch"> = {
  VERIFIED: "verified",
  METADATA_MISMATCH: "mismatch",
  PARAGRAPH_MISMATCH: "mismatch",
  WEAK_PROPOSITION_SUPPORT: "review",
  NO_AUTHORITATIVE_MATCH: "mismatch",
  NEEDS_REVIEW: "review",
};
