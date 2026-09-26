import { normalizeCaseTitle, normalizeCitation, paragraphHash } from "@/lib/legal/normalize";
import { buildIdf } from "@/lib/legal/similarity";
import type {
  CaseDossier,
  CaseJudge,
  CaseParty,
  CaseProvisionLink,
  CaseRelationship,
  CaseSummary,
  Court,
  Judge,
  Judgment,
  JudgmentParagraph,
  Party,
  Provision,
  ProvenanceRef,
  Statute,
} from "@/types/domain";
import { LANDMARK_NOTE, LANDMARK_SOURCE_URL, SEED_LANDMARKS } from "./landmarks";
import {
  DEMO_TEXT_NOTE,
  METADATA_NOTE,
  STATUTE_NOTE,
  SEED_CASES,
  SEED_COURTS,
  SEED_JUDGES,
  SEED_PARTIES,
  SEED_PROVISIONS,
  SEED_RELATIONSHIPS,
  SEED_STATUTES,
  type SeedCase,
} from "./corpus";

/**
 * Builds the in-memory corpus from seed fixtures.
 *
 * Every derived record is given provenance here, at the ingestion boundary,
 * so that no downstream service ever has to invent it. `assertProvenance`
 * in `server/services/provenance.ts` enforces that the invariant held.
 */

export interface Corpus {
  courts: Map<string, Court>;
  judges: Map<string, Judge>;
  parties: Map<string, Party>;
  statutes: Map<string, Statute>;
  provisions: Map<string, Provision>;
  cases: Map<string, CaseSummary>;
  dossiers: Map<string, CaseDossier>;
  judgments: Map<string, Judgment>;
  paragraphs: Map<string, JudgmentParagraph>;
  /** Asserting relationships as seeded (one direction, evidenced). */
  relationships: CaseRelationship[];
  /** Citation counts keyed by case id. */
  citationCounts: Map<string, number>;
}

/**
 * NOTHING IN THIS CORPUS WAS RETRIEVED FROM A SOURCE.
 *
 * No record here carries `retrievedAt`, because no retrieval happened. The
 * `sourceUrl` on each record is where a reader should go to check it — not
 * where it came from. Emitting a retrieval date for a record nobody fetched
 * would be precisely the unsupported provenance claim this product exists to
 * detect, so the field is left unset and the UI renders "Verify at" rather
 * than implying a fetch.
 */
function metadataProvenance(sourceAuthority: string, sourceUrl: string): ProvenanceRef {
  return {
    sourceName: sourceAuthority,
    sourceUrl,
    authorityLevel: "DEMO",
    note: METADATA_NOTE,
  };
}

function textProvenance(
  sourceAuthority: string,
  sourceUrl: string,
  paragraphId: string,
): ProvenanceRef {
  return {
    sourceName: sourceAuthority,
    sourceUrl,
    authorityLevel: "DEMO",
    paragraphId,
    note: DEMO_TEXT_NOTE,
  };
}

function buildCourts(): Map<string, Court> {
  const map = new Map<string, Court>();
  for (const c of SEED_COURTS) {
    map.set(c.id, {
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      level: c.level,
      jurisdiction: c.jurisdiction,
      ...(c.state ? { state: c.state } : {}),
      sourceKey: c.sourceKey,
    });
  }
  return map;
}

function buildJudges(): Map<string, Judge> {
  const map = new Map<string, Judge>();
  for (const j of SEED_JUDGES) {
    map.set(j.id, { id: j.id, name: j.name, normalizedName: normalizeCaseTitle(j.name) });
  }
  return map;
}

function buildParties(): Map<string, Party> {
  const map = new Map<string, Party>();
  for (const p of SEED_PARTIES) {
    map.set(p.id, {
      id: p.id,
      name: p.name,
      normalizedName: normalizeCaseTitle(p.name),
      entityType: p.entityType,
    });
  }
  return map;
}

function buildStatutes(): Map<string, Statute> {
  const map = new Map<string, Statute>();
  for (const s of SEED_STATUTES) map.set(s.id, { ...s });
  return map;
}

function buildProvisions(statutes: Map<string, Statute>): Map<string, Provision> {
  const map = new Map<string, Provision>();
  for (const p of SEED_PROVISIONS) {
    const statute = statutes.get(p.statuteId);
    map.set(p.id, {
      id: p.id,
      statuteId: p.statuteId,
      provisionType: p.provisionType,
      provisionNumber: p.provisionNumber,
      heading: p.heading,
      text: p.text,
      sourceUrl: p.sourceUrl,
      label: p.label,
      provenance: [
        {
          sourceName: statute ? `${statute.title} (India Code)` : "India Code",
          sourceUrl: p.sourceUrl,
          authorityLevel: "DEMO",
          note: STATUTE_NOTE,
        },
      ],
    });
  }
  return map;
}

function primaryCitation(seed: SeedCase): string | undefined {
  return seed.reporterCitations[0] ?? seed.neutralCitation ?? seed.caseNumber;
}

function buildCaseSummary(seed: SeedCase, court: Court): CaseSummary {
  return {
    id: seed.id,
    title: seed.title,
    ...(primaryCitation(seed) ? { citation: primaryCitation(seed) } : {}),
    court: court.name,
    courtShortName: court.shortName,
    courtLevel: court.level,
    decisionDate: seed.decisionDate,
    summary: seed.summary,
    ...(seed.neutralCitation ? { neutralCitation: seed.neutralCitation } : {}),
    reporterCitations: seed.reporterCitations,
    ...(seed.caseNumber ? { caseNumber: seed.caseNumber } : {}),
    benchStrength: seed.benchStrength,
    doctrinalStatus: seed.doctrinalStatus,
    provenance: [metadataProvenance(seed.sourceAuthority, seed.sourceUrl)],
  };
}

export function buildCorpus(): Corpus {
  const courts = buildCourts();
  const judges = buildJudges();
  const parties = buildParties();
  const statutes = buildStatutes();
  const provisions = buildProvisions(statutes);

  const cases = new Map<string, CaseSummary>();
  const dossiers = new Map<string, CaseDossier>();
  const judgments = new Map<string, Judgment>();
  const paragraphs = new Map<string, JudgmentParagraph>();
  const citationCounts = new Map<string, number>();

  for (const seed of SEED_CASES) {
    const court = courts.get(seed.courtId);
    if (!court) throw new Error(`Seed corpus references unknown court: ${seed.courtId}`);

    const summary = buildCaseSummary(seed, court);
    cases.set(seed.id, summary);
    citationCounts.set(seed.id, seed.citationCount);

    const judgmentId = `${seed.id}--judgment`;
    const caseParagraphs: JudgmentParagraph[] = seed.paragraphs.map((p) => {
      const id = `${seed.id}--p${p.number}`;
      const paragraph: JudgmentParagraph = {
        id,
        judgmentId,
        caseId: seed.id,
        paragraphNumber: p.number,
        text: p.text,
        textHash: paragraphHash(p.text),
        ...(p.isRatio ? { isRatio: true } : {}),
        provenance: [textProvenance(seed.sourceAuthority, seed.sourceUrl, id)],
      };
      paragraphs.set(id, paragraph);
      return paragraph;
    });

    const judgment: Judgment = {
      id: judgmentId,
      caseId: seed.id,
      language: "en",
      sourceUrl: seed.sourceUrl,
      sourceAuthority: seed.sourceAuthority,
      paragraphs: caseParagraphs,
    };
    judgments.set(judgmentId, judgment);

    const caseJudges: CaseJudge[] = seed.judges.flatMap((judgeId, index) => {
      const judge = judges.get(judgeId);
      if (!judge) return [];
      return [
        {
          judge,
          benchOrder: index + 1,
          ...(seed.authoringJudge === judgeId ? { authoring: true } : {}),
        },
      ];
    });

    const caseParties: CaseParty[] = seed.parties.flatMap((p) => {
      const party = parties.get(p.partyId);
      return party ? [{ party, role: p.role }] : [];
    });

    const caseProvisions: CaseProvisionLink[] = seed.provisions.flatMap((link) => {
      const provision = provisions.get(link.provisionId);
      if (!provision) return [];
      const paragraphId = link.paragraph ? `${seed.id}--p${link.paragraph}` : undefined;
      return [
        {
          provision,
          relationType: link.relationType,
          ...(paragraphId ? { sourceParagraphId: paragraphId } : {}),
          evidence: [
            {
              sourceName: seed.sourceAuthority,
              sourceUrl: seed.sourceUrl,
              authorityLevel: "DEMO",
              ...(paragraphId ? { paragraphId } : {}),
              note: `Provision link evidenced by ${seed.shortTitle}${link.paragraph ? `, para ${link.paragraph}` : ""} in the demo corpus.`,
            },
          ],
        },
      ];
    });

    dossiers.set(seed.id, {
      summary,
      parties: caseParties,
      judges: caseJudges,
      provisions: caseProvisions,
      keyParagraphs: caseParagraphs.filter((p) => p.isRatio),
      judgment,
      citationCount: seed.citationCount,
      issues: seed.issues,
    });
  }

  /* Coverage index — metadata-only landmark authorities. These resolve a
   * citation and nothing more: no judgment text, no relationships, and no
   * metadata mismatch raised against them (see `landmarks.ts`). */
  for (const landmark of SEED_LANDMARKS) {
    const court = courts.get(landmark.courtId ?? "sci");
    if (!court) continue;

    const summary: CaseSummary = {
      id: landmark.id,
      title: landmark.title,
      ...(landmark.reporterCitations[0] ? { citation: landmark.reporterCitations[0] } : {}),
      court: court.name,
      courtShortName: court.shortName,
      courtLevel: court.level,
      decisionDate: landmark.decisionDate,
      summary: landmark.subject,
      reporterCitations: landmark.reporterCitations,
      benchStrength: landmark.benchStrength,
      doctrinalStatus: "BINDING_LANDMARK",
      coverageOnly: true,
      provenance: [
        {
          sourceName: court.name,
          sourceUrl: LANDMARK_SOURCE_URL,
          authorityLevel: "DEMO",
          note: LANDMARK_NOTE,
        },
      ],
    };

    cases.set(landmark.id, summary);
    citationCounts.set(landmark.id, 0);
    dossiers.set(landmark.id, {
      summary,
      parties: [],
      judges: [],
      provisions: [],
      keyParagraphs: [],
      citationCount: 0,
      issues: [],
    });
  }

  const relationships: CaseRelationship[] = SEED_RELATIONSHIPS.map((rel, index) => {
    const sourceCase = SEED_CASES.find((c) => c.id === rel.sourceCaseId);
    if (!sourceCase) {
      throw new Error(`Seed relationship references unknown case: ${rel.sourceCaseId}`);
    }
    if (!cases.has(rel.targetCaseId)) {
      throw new Error(`Seed relationship references unknown case: ${rel.targetCaseId}`);
    }
    const paragraphId = rel.sourceParagraph
      ? `${rel.sourceCaseId}--p${rel.sourceParagraph}`
      : undefined;

    return {
      id: `rel-${index + 1}`,
      sourceCaseId: rel.sourceCaseId,
      targetCaseId: rel.targetCaseId,
      type: rel.type,
      confidence: rel.confidence,
      ...(paragraphId ? { sourceParagraphId: paragraphId } : {}),
      evidence: [
        {
          sourceName: sourceCase.sourceAuthority,
          sourceUrl: sourceCase.sourceUrl,
          authorityLevel: "DEMO",
          ...(paragraphId ? { paragraphId } : {}),
          note: rel.detail,
        },
      ],
    };
  });

  return {
    courts,
    judges,
    parties,
    statutes,
    provisions,
    cases,
    dossiers,
    judgments,
    paragraphs,
    relationships,
    citationCounts,
  };
}

/** Module-level singleton so the corpus is built once per server process. */
let cached: Corpus | undefined;

export function getCorpus(): Corpus {
  if (!cached) cached = buildCorpus();
  return cached;
}

/** Citation lookup index: normalized citation key -> case id. */
let citationIndex: Map<string, string> | undefined;

export function getCitationIndex(): Map<string, string> {
  if (citationIndex) return citationIndex;
  const index = new Map<string, string>();
  for (const summary of getCorpus().cases.values()) {
    const keys = [
      summary.neutralCitation,
      ...summary.reporterCitations,
      summary.caseNumber,
    ].filter((value): value is string => Boolean(value));
    for (const key of keys) index.set(normalizeCitation(key), summary.id);
  }
  citationIndex = index;
  return index;
}

/**
 * Inverse document frequency over every indexed judgment paragraph.
 *
 * Used by the proposition check to down-weight the boilerplate vocabulary of
 * insolvency drafting, so that similarity reflects the distinctive terms of a
 * claim rather than its shared furniture.
 */
let idfIndex: Map<string, number> | undefined;

export function getIdfIndex(): Map<string, number> {
  if (idfIndex) return idfIndex;
  const documents: string[] = [];
  for (const paragraph of getCorpus().paragraphs.values()) documents.push(paragraph.text);
  for (const provision of getCorpus().provisions.values()) {
    if (provision.text) documents.push(provision.text);
  }
  idfIndex = buildIdf(documents);
  return idfIndex;
}
