import "server-only";

import { idfWeight, weightedContainment, weightedCosine } from "@/lib/legal/similarity";
import { getCorpus, getIdfIndex } from "@/server/db/seed";
import { modelVersion, synthesize } from "@/server/ai/gemini";
import { getCase, listParagraphs } from "@/server/repositories/case-repository";
import { AI_DISCLAIMER } from "@/server/services/provenance";
import type {
  CaseSummary,
  GroundedClaim,
  JudgmentParagraph,
  ProvenanceRef,
  SynthesisResult,
} from "@/types/domain";

/**
 * Grounded research synthesis.
 *
 * Retrieval is deterministic and happens first; the model only ever sees
 * paragraphs this service selected. When no model is configured the service
 * still answers — by presenting the retrieved passages themselves, with their
 * provenance, rather than a generated summary. That degraded mode is marked
 * `grounded: false` so the UI can say plainly that no synthesis was performed.
 */

export interface SynthesisRequest {
  question: string;
  caseIds?: string[];
  investigationId?: string;
  maxParagraphs?: number;
}

/** Retrieves the passages most relevant to the question. */
function retrieve(
  question: string,
  caseIds: string[] | undefined,
  limit: number,
): { paragraphs: JudgmentParagraph[]; cases: CaseSummary[] } {
  const corpus = getCorpus();
  const idf = getIdfIndex();
  const weight = (term: string) => idfWeight(idf, term);

  const scope =
    caseIds && caseIds.length > 0
      ? caseIds.flatMap((id) => listParagraphs(id))
      : [...corpus.paragraphs.values()];

  const scored = scope
    .map((paragraph) => ({
      paragraph,
      score: Math.max(
        weightedContainment(question, paragraph.text, weight),
        weightedCosine(question, paragraph.text, weight),
      ),
    }))
    .filter((entry) => entry.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const paragraphs = scored.map((entry) => entry.paragraph);
  const caseIdSet = new Set(paragraphs.map((p) => p.caseId));
  const cases = [...caseIdSet]
    .map((id) => getCase(id))
    .filter((value): value is CaseSummary => Boolean(value));

  return { paragraphs, cases };
}

function provenanceFor(paragraphs: JudgmentParagraph[], cases: CaseSummary[]): ProvenanceRef[] {
  const refs: ProvenanceRef[] = [];
  const seen = new Set<string>();
  for (const source of [...cases.flatMap((c) => c.provenance), ...paragraphs.flatMap((p) => p.provenance)]) {
    const key = `${source.sourceUrl}|${source.paragraphId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push(source);
  }
  return refs;
}

/** Investigation steps derived from the retrieved records, not generated. */
function deterministicNextSteps(cases: CaseSummary[]): string[] {
  const steps: string[] = [];
  const corpus = getCorpus();

  const overruled = cases.filter((c) => c.doctrinalStatus === "OVERRULED");
  for (const c of overruled.slice(0, 2)) {
    steps.push(`Check the subsequent treatment of ${c.title} — the corpus records it as superseded.`);
  }

  const distinguished = cases.filter((c) => c.doctrinalStatus === "DISTINGUISHED");
  for (const c of distinguished.slice(0, 1)) {
    steps.push(`Read ${c.title} against the authorities that distinguish it before relying on it.`);
  }

  for (const c of cases.slice(0, 2)) {
    const citing = corpus.relationships.filter((r) => r.targetCaseId === c.id).length;
    if (citing > 0) {
      steps.push(`Open the relationship graph for ${c.title} to trace its ${citing} connected ${citing === 1 ? "authority" : "authorities"}.`);
    }
  }

  steps.push("Verify each passage against the linked primary source before citing it.");
  return steps.slice(0, 5);
}

export async function synthesizeResearch(request: SynthesisRequest): Promise<SynthesisResult> {
  const limit = request.maxParagraphs ?? 12;
  const { paragraphs, cases } = retrieve(request.question, request.caseIds, limit);

  if (paragraphs.length === 0) {
    return {
      answer:
        "No indexed passage in the connected sources addresses this question. Broaden the query, or widen the corpus before drawing a conclusion.",
      claims: [],
      limitations: [
        "Retrieval returned no passage above the relevance threshold.",
        AI_DISCLAIMER,
      ],
      nextSteps: ["Rephrase the question using the statutory language or a party name."],
      sources: [],
      modelVersion: modelVersion(),
      grounded: false,
    };
  }

  const sources = provenanceFor(paragraphs, cases);
  const ai = await synthesize(request.question, paragraphs, cases);

  if (ai) {
    const claims: GroundedClaim[] = ai.claims.map((claim) => {
      const supportingCaseIds = [
        ...new Set(
          claim.supportingParagraphIds
            .map((id) => paragraphs.find((p) => p.id === id)?.caseId)
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      return {
        claim: claim.claim,
        supportingCaseIds,
        supportingParagraphIds: claim.supportingParagraphIds,
        // A claim the model could not tie to a retrieved paragraph is
        // downgraded regardless of the confidence it reported.
        confidence: claim.supportingParagraphIds.length === 0 ? "LOW" : claim.confidence,
      };
    });

    return {
      answer: ai.answer,
      claims,
      limitations: [...ai.limitations, AI_DISCLAIMER],
      nextSteps: ai.nextSteps.length > 0 ? ai.nextSteps : deterministicNextSteps(cases),
      sources,
      modelVersion: modelVersion(),
      grounded: true,
    };
  }

  /* No model configured, or the model failed schema validation. Present the
   * retrieved passages rather than a synthesis, and say so. */
  const claims: GroundedClaim[] = paragraphs.slice(0, 5).map((paragraph) => ({
    claim: paragraph.text,
    supportingCaseIds: [paragraph.caseId],
    supportingParagraphIds: [paragraph.id],
    confidence: "MEDIUM",
  }));

  const caseList = cases
    .slice(0, 4)
    .map((c) => `${c.title}${c.citation ? ` (${c.citation})` : ""}`)
    .join("; ");

  return {
    answer: `No synthesis model is configured, so CaseLens has not written an answer. It retrieved ${paragraphs.length} passage${paragraphs.length === 1 ? "" : "s"} from ${cases.length} ${cases.length === 1 ? "authority" : "authorities"} that bear on this question: ${caseList}. The passages are reproduced below with their sources — read them directly rather than relying on a summary.`,
    claims,
    limitations: [
      "No synthesis was performed: GEMINI_API_KEY is not configured on the server.",
      "The passages below were selected by deterministic term-overlap retrieval, which can miss a relevant authority that uses different wording.",
      AI_DISCLAIMER,
    ],
    nextSteps: deterministicNextSteps(cases),
    sources,
    modelVersion: modelVersion(),
    grounded: false,
  };
}
