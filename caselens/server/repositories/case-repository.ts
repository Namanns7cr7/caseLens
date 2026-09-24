import "server-only";

import { normalizeCitation } from "@/lib/legal/normalize";
import { titleSimilarity } from "@/lib/legal/similarity";
import { getCitationIndex, getCorpus } from "@/server/db/seed";
import { assertEvidenced } from "@/server/services/provenance";
import type {
  CaseDossier,
  CaseRelationship,
  CaseSummary,
  Court,
  JudgmentParagraph,
  Provision,
  RelationshipType,
  TimelineEvent,
} from "@/types/domain";

/**
 * Read access to the indexed legal corpus.
 *
 * All reads flow through here so that provenance enforcement happens in one
 * place. The corpus is immutable seeded data — identical under either driver
 * (see `server/db/client.ts`).
 */

export function listCases(): CaseSummary[] {
  return [...getCorpus().cases.values()].sort((a, b) =>
    (b.decisionDate ?? "").localeCompare(a.decisionDate ?? ""),
  );
}

export function getCase(id: string): CaseSummary | undefined {
  return getCorpus().cases.get(id);
}

export function getCourt(id: string): Court | undefined {
  return getCorpus().courts.get(id);
}

export function listCourts(): Court[] {
  return [...getCorpus().courts.values()];
}

export function listProvisions(): Provision[] {
  return [...getCorpus().provisions.values()];
}

export function getProvision(id: string): Provision | undefined {
  return getCorpus().provisions.get(id);
}

export function getParagraph(id: string): JudgmentParagraph | undefined {
  return getCorpus().paragraphs.get(id);
}

export function listParagraphs(caseId: string): JudgmentParagraph[] {
  const dossier = getCorpus().dossiers.get(caseId);
  return dossier?.judgment?.paragraphs ?? [];
}

export function getDossier(id: string): CaseDossier | undefined {
  const dossier = getCorpus().dossiers.get(id);
  if (!dossier) return undefined;
  assertEvidenced(`case:${id}`, dossier.summary.provenance);
  return dossier;
}

/** Exact identifier lookup — step 3 of the ARCHITECTURE.md verification sequence. */
export function findCaseByCitation(citation: string): CaseSummary | undefined {
  const id = getCitationIndex().get(normalizeCitation(citation));
  return id ? getCorpus().cases.get(id) : undefined;
}

export interface TitleMatch {
  case: CaseSummary;
  similarity: number;
}

/** Fuzzy case-title matching, ordered best-first. */
export function findCasesByTitle(title: string, minimum = 0.45): TitleMatch[] {
  const matches: TitleMatch[] = [];
  for (const summary of getCorpus().cases.values()) {
    const similarity = titleSimilarity(title, summary.title);
    if (similarity >= minimum) matches.push({ case: summary, similarity });
  }
  return matches.sort((a, b) => b.similarity - a.similarity);
}

export function citationCount(caseId: string): number {
  return getCorpus().citationCounts.get(caseId) ?? 0;
}

/* ------------------------------------------------------------------ */
/* Relationships                                                       */
/* ------------------------------------------------------------------ */

/** The reciprocal of an asserting edge, for traversal in both directions. */
const INVERSE: Record<RelationshipType, RelationshipType> = {
  CITES: "CITED_BY",
  CITED_BY: "CITES",
  APPEAL_OF: "RELATED",
  AFFIRMS: "RELATED",
  REVERSES: "RELATED",
  REMANDS: "RELATED",
  FOLLOWS: "CITED_BY",
  DISTINGUISHES: "CITED_BY",
  OVERRULES: "CITED_BY",
  RELATED: "RELATED",
};

/**
 * Relationships touching `caseId`, in both directions. Inbound edges are
 * returned with their type inverted and carry the same evidence record as
 * the asserting edge — a single evidenced fact, viewed from two sides.
 */
export function relationshipsFor(caseId: string): CaseRelationship[] {
  const out: CaseRelationship[] = [];
  for (const rel of getCorpus().relationships) {
    if (rel.sourceCaseId === caseId) {
      assertEvidenced(`relationship:${rel.id}`, rel.evidence);
      out.push(rel);
    } else if (rel.targetCaseId === caseId) {
      assertEvidenced(`relationship:${rel.id}`, rel.evidence);
      out.push({
        ...rel,
        id: `${rel.id}--inverse`,
        sourceCaseId: rel.targetCaseId,
        targetCaseId: rel.sourceCaseId,
        type: INVERSE[rel.type],
      });
    }
  }
  return out;
}

export function allRelationships(): CaseRelationship[] {
  return getCorpus().relationships;
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

const PROCEDURAL: RelationshipType[] = ["APPEAL_OF", "AFFIRMS", "REVERSES", "REMANDS"];

/**
 * Builds the procedural chronology for a case: every forum that dealt with
 * the same matter, ordered by date. The chain is walked over procedural
 * relationships only, so unrelated citing authorities do not pollute it.
 */
export function buildTimeline(caseId: string): TimelineEvent[] {
  const corpus = getCorpus();
  const chain = new Set<string>([caseId]);

  // Breadth-first walk over procedural edges in both directions.
  const queue = [caseId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    for (const rel of corpus.relationships) {
      if (!PROCEDURAL.includes(rel.type)) continue;
      const neighbours =
        rel.sourceCaseId === current
          ? [rel.targetCaseId]
          : rel.targetCaseId === current
            ? [rel.sourceCaseId]
            : [];
      for (const next of neighbours) {
        if (!chain.has(next)) {
          chain.add(next);
          queue.push(next);
        }
      }
    }
  }

  const events: TimelineEvent[] = [];
  for (const id of chain) {
    const summary = corpus.cases.get(id);
    if (!summary?.decisionDate) continue;

    const inbound = corpus.relationships.filter(
      (r) => r.sourceCaseId === id && PROCEDURAL.includes(r.type) && chain.has(r.targetCaseId),
    );
    const kind = inbound.some((r) => r.type === "REVERSES")
      ? "REVERSAL"
      : inbound.some((r) => r.type === "AFFIRMS")
        ? "AFFIRMATION"
        : inbound.some((r) => r.type === "APPEAL_OF")
          ? "APPEAL"
          : "DECISION";

    events.push({
      id: `timeline-${id}`,
      date: summary.decisionDate,
      kind,
      title: summary.title,
      forum: summary.court,
      description: summary.summary ?? "",
      caseId: id,
      ...(id === caseId ? { isFocus: true } : {}),
      provenance: summary.provenance,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/** Cases that cite `caseId`, used for the "subsequent treatment" panel. */
export function citingCases(caseId: string): Array<{ case: CaseSummary; relationship: CaseRelationship }> {
  const corpus = getCorpus();
  const out: Array<{ case: CaseSummary; relationship: CaseRelationship }> = [];
  for (const rel of corpus.relationships) {
    if (rel.targetCaseId !== caseId) continue;
    const summary = corpus.cases.get(rel.sourceCaseId);
    if (summary) out.push({ case: summary, relationship: rel });
  }
  return out.sort((a, b) =>
    (b.case.decisionDate ?? "").localeCompare(a.case.decisionDate ?? ""),
  );
}

/** Cases sharing a provision with `caseId`. Powers "connected authorities". */
export function casesCitingProvision(provisionId: string): CaseSummary[] {
  const corpus = getCorpus();
  const out: CaseSummary[] = [];
  for (const dossier of corpus.dossiers.values()) {
    if (dossier.provisions.some((p) => p.provision.id === provisionId)) {
      out.push(dossier.summary);
    }
  }
  return out.sort((a, b) => (b.decisionDate ?? "").localeCompare(a.decisionDate ?? ""));
}
