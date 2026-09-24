import "server-only";

import { normalizeCaseTitle, normalizeCitation, normalizeParagraphText } from "@/lib/legal/normalize";
import { lexicalCosine, titleSimilarity, tokenContainment } from "@/lib/legal/similarity";
import { getCorpus } from "@/server/db/seed";
import {
  citationCount,
  findCaseByCitation,
} from "@/server/repositories/case-repository";
import type {
  CaseSummary,
  CourtLevel,
  DoctrinalStatus,
  JudgmentParagraph,
  SearchFacets,
  SearchFacetValue,
  SearchHit,
  SearchResponse,
} from "@/types/domain";

/**
 * Hybrid search over the indexed corpus (ARCHITECTURE.md "Search").
 *
 * Four retrieval signals are blended:
 *   1. exact citation lookup        — decisive, short-circuits ranking;
 *   2. lexical field matching       — title, summary, issues, party, judge;
 *   3. fuzzy case-title similarity  — trigram, for misspelled party names;
 *   4. paragraph-level retrieval    — for natural-language issue queries.
 *
 * Under Postgres, (2) becomes full-text ranking, (3) becomes pg_trgm and (4)
 * becomes a pgvector nearest-neighbour search. The blend and the scoring
 * weights below are driver-independent.
 */

export interface SearchQuery {
  q: string;
  court?: string[];
  year?: string[];
  act?: string[];
  section?: string[];
  judge?: string[];
  benchStrength?: string[];
  doctrinalStatus?: string[];
  page: number;
  pageSize: number;
}

const WEIGHTS = {
  citationExact: 100,
  titleExact: 40,
  titleFuzzy: 26,
  summary: 12,
  issue: 10,
  party: 14,
  judge: 10,
  provision: 18,
  paragraph: 22,
  /** Small prior so that heavily-cited authorities break ties upward. */
  citationImpact: 6,
} as const;

/**
 * Authority weighting.
 *
 * Textual relevance alone ranks a superseded first-instance order above the
 * binding appellate authority that overturned it, because both discuss the
 * same words. That is not how a legal researcher ranks results: on the same
 * point, binding authority comes first and a superseded decision comes last.
 * These priors encode that, and the reason is surfaced in `matchReasons` so
 * the ordering is legible rather than mysterious.
 */
const COURT_FACTOR: Record<CourtLevel, number> = {
  SUPREME_COURT: 1.18,
  HIGH_COURT: 1.06,
  TRIBUNAL: 0.94,
  DISTRICT_COURT: 0.88,
};

const DOCTRINAL_FACTOR: Record<DoctrinalStatus, number> = {
  BINDING_LANDMARK: 1.25,
  AFFIRMED_FOLLOWED: 1.14,
  PENDING: 1,
  DISTINGUISHED: 0.85,
  OVERRULED: 0.5,
};

interface ScoredCase {
  summary: CaseSummary;
  score: number;
  reasons: string[];
  excerpt?: JudgmentParagraph;
  matchedProvisions: string[];
}

function tokenize(query: string): string[] {
  return normalizeParagraphText(query)
    .split(" ")
    .filter((t) => t.length > 2);
}

/** Fraction of query tokens present in `field`. */
function fieldMatch(tokens: string[], field: string | undefined): number {
  if (!field || tokens.length === 0) return 0;
  const haystack = new Set(normalizeParagraphText(field).split(" ").filter(Boolean));
  let hits = 0;
  for (const token of tokens) if (haystack.has(token)) hits += 1;
  return hits / tokens.length;
}

function scoreCorpus(query: string): ScoredCase[] {
  const corpus = getCorpus();
  const tokens = tokenize(query);
  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  // 1. Exact citation lookup short-circuits everything else.
  const citationHit = hasQuery ? findCaseByCitation(trimmed) : undefined;

  const scored: ScoredCase[] = [];

  for (const dossier of corpus.dossiers.values()) {
    const summary = dossier.summary;
    let score = 0;
    const reasons: string[] = [];

    if (citationHit?.id === summary.id) {
      score += WEIGHTS.citationExact;
      reasons.push(`Exact citation match for “${trimmed}”`);
    }

    if (hasQuery) {
      // 2. Lexical field matching.
      if (normalizeCaseTitle(trimmed) === normalizeCaseTitle(summary.title)) {
        score += WEIGHTS.titleExact;
        reasons.push("Exact case-title match");
      } else {
        // 3. Fuzzy title similarity.
        const similarity = titleSimilarity(trimmed, summary.title);
        if (similarity >= 0.4) {
          score += similarity * WEIGHTS.titleFuzzy;
          reasons.push(`Case title ${Math.round(similarity * 100)}% similar`);
        }
      }

      const titleTokenMatch = fieldMatch(tokens, summary.title);
      if (titleTokenMatch > 0) score += titleTokenMatch * WEIGHTS.titleExact * 0.5;

      const summaryMatch = fieldMatch(tokens, summary.summary);
      if (summaryMatch > 0) {
        score += summaryMatch * WEIGHTS.summary;
        if (summaryMatch >= 0.4) reasons.push("Headnote covers the query terms");
      }

      for (const issue of dossier.issues) {
        const issueMatch = fieldMatch(tokens, issue);
        if (issueMatch >= 0.5) {
          score += issueMatch * WEIGHTS.issue;
          reasons.push(`Framed issue: ${issue}`);
          break;
        }
      }

      for (const { party } of dossier.parties) {
        const partyMatch = titleSimilarity(trimmed, party.name);
        if (partyMatch >= 0.55 || fieldMatch(tokens, party.name) >= 0.8) {
          score += WEIGHTS.party;
          reasons.push(`Party: ${party.name}`);
          break;
        }
      }

      for (const { judge } of dossier.judges) {
        if (fieldMatch(tokens, judge.name) >= 0.8) {
          score += WEIGHTS.judge;
          reasons.push(`Coram: ${judge.name}`);
          break;
        }
      }

      // Statutory reference in the query, e.g. "section 14 IBC" or "§ 128".
      const normalizedQuery = normalizeParagraphText(trimmed);
      for (const link of dossier.provisions) {
        const provision = link.provision;
        const sectionToken = `section ${provision.provisionNumber}`.toLowerCase();
        const mentionsSection = normalizedQuery.includes(sectionToken);
        const mentionsAct = fieldMatch(tokens, provision.label) > 0;
        if (mentionsSection || (mentionsAct && fieldMatch(tokens, provision.heading) >= 0.5)) {
          score += WEIGHTS.provision;
          reasons.push(`Construes ${provision.label}`);
          break;
        }
      }
    }

    // 4. Paragraph-level retrieval for natural-language issue queries.
    let excerpt: JudgmentParagraph | undefined;
    let bestParagraphScore = 0;
    const paragraphs = dossier.judgment?.paragraphs ?? [];
    for (const paragraph of paragraphs) {
      if (!hasQuery) break;
      const containment = tokenContainment(trimmed, paragraph.text);
      const cosine = lexicalCosine(trimmed, paragraph.text);
      const paragraphScore = Math.max(containment, cosine * 1.6);
      if (paragraphScore > bestParagraphScore) {
        bestParagraphScore = paragraphScore;
        excerpt = paragraph;
      }
    }
    if (bestParagraphScore >= 0.25 && excerpt) {
      score += bestParagraphScore * WEIGHTS.paragraph;
      reasons.push(`Passage support at ¶ ${excerpt.paragraphNumber}`);
    }

    // Always surface the ratio paragraph when nothing better was retrieved.
    if (!excerpt) excerpt = dossier.keyParagraphs[0] ?? paragraphs[0];

    // Citation-impact and authority priors.
    //
    // These are tie-breakers among records that already have some textual
    // relevance. Applying them unconditionally would give every record in
    // the corpus a non-zero score, so a query matching nothing would return
    // everything instead of an empty result.
    const impact = Math.log10(1 + citationCount(summary.id)) / 3;
    if (!hasQuery || score > 0) score += impact * WEIGHTS.citationImpact;

    // An exact citation lookup is a request for one specific record, so the
    // authority weighting is not applied to it.
    if (hasQuery && score > 0 && citationHit?.id !== summary.id) {
      score *= COURT_FACTOR[summary.courtLevel] * DOCTRINAL_FACTOR[summary.doctrinalStatus];

      if (summary.doctrinalStatus === "OVERRULED") {
        reasons.unshift("Ranked down — recorded as superseded");
      } else if (summary.doctrinalStatus === "BINDING_LANDMARK") {
        reasons.unshift(`Binding authority of the ${summary.court}`);
      } else if (summary.doctrinalStatus === "DISTINGUISHED") {
        reasons.unshift("Ranked down — treated as distinguished");
      }
    }

    if (!hasQuery) {
      // Empty query: browse mode, ranked by impact and recency.
      score = impact * 20 + (summary.decisionDate ? Number(summary.decisionDate.slice(0, 4)) / 1000 : 0);
      reasons.push("Browsing the indexed corpus");
    }

    if (score > 0) {
      scored.push({
        summary,
        score,
        reasons,
        ...(excerpt ? { excerpt } : {}),
        matchedProvisions: dossier.provisions.map((p) => p.provision.label),
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------------------ */
/* Filtering + facets                                                  */
/* ------------------------------------------------------------------ */

function caseYear(summary: CaseSummary): string {
  return summary.decisionDate?.slice(0, 4) ?? "";
}

function matchesFilters(entry: ScoredCase, query: SearchQuery): boolean {
  const corpus = getCorpus();
  const dossier = corpus.dossiers.get(entry.summary.id);
  if (!dossier) return false;

  if (query.court?.length) {
    const court = [...corpus.courts.values()].find((c) => c.name === entry.summary.court);
    if (!court || !query.court.includes(court.id)) return false;
  }
  if (query.year?.length && !query.year.includes(caseYear(entry.summary))) return false;
  if (query.act?.length) {
    const acts = new Set(dossier.provisions.map((p) => p.provision.statuteId));
    if (!query.act.some((a) => acts.has(a))) return false;
  }
  if (query.section?.length) {
    const sections = new Set(dossier.provisions.map((p) => p.provision.id));
    if (!query.section.some((s) => sections.has(s))) return false;
  }
  if (query.judge?.length) {
    const judgeIds = new Set(dossier.judges.map((j) => j.judge.id));
    if (!query.judge.some((j) => judgeIds.has(j))) return false;
  }
  if (query.benchStrength?.length) {
    if (!query.benchStrength.includes(String(entry.summary.benchStrength ?? ""))) return false;
  }
  if (query.doctrinalStatus?.length) {
    if (!query.doctrinalStatus.includes(entry.summary.doctrinalStatus)) return false;
  }
  return true;
}

function toFacetValues(counts: Map<string, { label: string; count: number }>): SearchFacetValue[] {
  return [...counts.entries()]
    .map(([value, { label, count }]) => ({ value, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

const DOCTRINAL_LABELS: Record<string, string> = {
  BINDING_LANDMARK: "Binding landmark settled",
  AFFIRMED_FOLLOWED: "Affirmed / followed",
  DISTINGUISHED: "Distinguished / narrowed",
  OVERRULED: "Overruled / superseded",
  PENDING: "Pending",
};

const BENCH_LABELS: Record<string, string> = {
  "1": "Single judge",
  "2": "2-judge division bench",
  "3": "3-judge bench",
  "5": "5-judge constitution bench",
};

/**
 * Facets are computed over the candidate set *before* that facet's own filter
 * is applied, so selecting a value never makes its siblings disappear.
 */
function buildFacets(candidates: ScoredCase[], query: SearchQuery): SearchFacets {
  const corpus = getCorpus();

  const countBy = (
    exclude: keyof SearchQuery,
    key: (entry: ScoredCase) => Array<{ value: string; label: string }>,
  ): SearchFacetValue[] => {
    const scopedQuery = { ...query, [exclude]: undefined } as SearchQuery;
    const counts = new Map<string, { label: string; count: number }>();
    for (const entry of candidates) {
      if (!matchesFilters(entry, scopedQuery)) continue;
      for (const { value, label } of key(entry)) {
        if (!value) continue;
        const existing = counts.get(value);
        if (existing) existing.count += 1;
        else counts.set(value, { label, count: 1 });
      }
    }
    return toFacetValues(counts);
  };

  return {
    courts: countBy("court", (entry) => {
      const court = [...corpus.courts.values()].find((c) => c.name === entry.summary.court);
      return court ? [{ value: court.id, label: court.name }] : [];
    }),
    years: countBy("year", (entry) => {
      const year = caseYear(entry.summary);
      return year ? [{ value: year, label: year }] : [];
    }),
    acts: countBy("act", (entry) => {
      const dossier = corpus.dossiers.get(entry.summary.id);
      const seen = new Map<string, string>();
      for (const link of dossier?.provisions ?? []) {
        const statute = corpus.statutes.get(link.provision.statuteId);
        if (statute) seen.set(statute.id, statute.title);
      }
      return [...seen.entries()].map(([value, label]) => ({ value, label }));
    }),
    sections: countBy("section", (entry) => {
      const dossier = corpus.dossiers.get(entry.summary.id);
      const seen = new Map<string, string>();
      for (const link of dossier?.provisions ?? []) {
        seen.set(link.provision.id, `${link.provision.label} — ${link.provision.heading}`);
      }
      return [...seen.entries()].map(([value, label]) => ({ value, label }));
    }),
    judges: countBy("judge", (entry) => {
      const dossier = corpus.dossiers.get(entry.summary.id);
      return (dossier?.judges ?? []).map((j) => ({ value: j.judge.id, label: j.judge.name }));
    }),
    benchStrength: countBy("benchStrength", (entry) => {
      const value = String(entry.summary.benchStrength ?? "");
      return value ? [{ value, label: BENCH_LABELS[value] ?? `${value}-judge bench` }] : [];
    }),
    doctrinalStatus: countBy("doctrinalStatus", (entry) => [
      {
        value: entry.summary.doctrinalStatus,
        label: DOCTRINAL_LABELS[entry.summary.doctrinalStatus] ?? entry.summary.doctrinalStatus,
      },
    ]),
  };
}

export function search(query: SearchQuery): SearchResponse {
  const started = performance.now();

  const candidates = scoreCorpus(query.q);
  const facets = buildFacets(candidates, query);
  const filtered = candidates.filter((entry) => matchesFilters(entry, query));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(Math.max(1, query.page), totalPages);
  const start = (page - 1) * query.pageSize;

  const top = filtered[0]?.score ?? 1;
  const results: SearchHit[] = filtered.slice(start, start + query.pageSize).map((entry) => ({
    case: entry.summary,
    // Normalized to the leading hit so the UI can show a comparable match ratio.
    score: top > 0 ? Math.min(1, entry.score / top) : 0,
    ...(entry.excerpt ? { excerpt: entry.excerpt } : {}),
    matchedProvisions: entry.matchedProvisions,
    matchReasons: entry.reasons.slice(0, 3),
  }));

  return {
    results,
    facets,
    pagination: { page, pageSize: query.pageSize, total, totalPages },
    queryTimeMs: Math.round((performance.now() - started) * 100) / 100,
  };
}

/** Typeahead suggestions for the omnibox. */
export function suggest(query: string, limit = 6): CaseSummary[] {
  if (!query.trim()) return [];
  const normalized = normalizeCitation(query);
  const corpus = getCorpus();
  const out: Array<{ summary: CaseSummary; score: number }> = [];
  for (const summary of corpus.cases.values()) {
    const citationHit = [summary.neutralCitation, ...summary.reporterCitations]
      .filter(Boolean)
      .some((c) => normalizeCitation(c as string).includes(normalized));
    const score = citationHit ? 1 : titleSimilarity(query, summary.title);
    if (score >= 0.35) out.push({ summary, score });
  }
  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.summary);
}
