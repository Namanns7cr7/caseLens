import "server-only";

import { normalizeCaseTitle, normalizeCitation } from "@/lib/legal/normalize";
import { lexicalCosine, titleSimilarity, tokenContainment } from "@/lib/legal/similarity";
import { analyze } from "@/lib/legal/text-analysis";
import { getCitationForms, getCorpus, getCourtIdByName } from "@/server/db/seed";
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
  return analyze(query).tokens.filter((t) => t.length > 2);
}

/**
 * Fraction of query tokens present in `field`.
 *
 * Every field is drawn from the corpus and so recurs on every request; the
 * tokenization behind `analyze` is cached per distinct string rather than
 * rebuilt per case per query.
 */
function fieldMatch(tokens: string[], field: string | undefined): number {
  if (!field || tokens.length === 0) return 0;
  const haystack = analyze(field).tokenSet;
  let hits = 0;
  for (const token of tokens) if (haystack.has(token)) hits += 1;
  return hits / tokens.length;
}

function scoreCorpus(query: string): ScoredCase[] {
  const corpus = getCorpus();
  const tokens = tokenize(query);
  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;
  // Query-side derivations depend only on the query, so they are computed
  // here rather than once per case.
  const normalizedQuery = analyze(trimmed).normalized;
  const normalizedQueryTitle = normalizeCaseTitle(trimmed);

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
      if (normalizedQueryTitle === normalizeCaseTitle(summary.title)) {
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
    for (const paragraph of hasQuery ? paragraphs : []) {
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

interface FacetEntry {
  value: string;
  label: string;
}

/**
 * The facet values one candidate contributes, in every dimension.
 *
 * A request filters the candidate set once and then counts it again per
 * facet — eight passes in total. Deriving a candidate's court, acts,
 * sections and judges inside each of those passes redoes the same dossier
 * walk eight times over, so it is done once here and read from afterwards.
 */
type FacetProfile = Record<keyof SearchFacets, FacetEntry[]>;

/** Facet dimension paired with the query field that filters on it. */
const DIMENSIONS: ReadonlyArray<{ facet: keyof SearchFacets; filter: keyof SearchQuery }> = [
  { facet: "courts", filter: "court" },
  { facet: "years", filter: "year" },
  { facet: "acts", filter: "act" },
  { facet: "sections", filter: "section" },
  { facet: "judges", filter: "judge" },
  { facet: "benchStrength", filter: "benchStrength" },
  { facet: "doctrinalStatus", filter: "doctrinalStatus" },
];

function buildProfile(entry: ScoredCase): FacetProfile {
  const corpus = getCorpus();
  const summary = entry.summary;
  const dossier = corpus.dossiers.get(summary.id);

  const court = corpus.courts.get(getCourtIdByName().get(summary.court) ?? "");
  const year = caseYear(summary);
  const bench = String(summary.benchStrength ?? "");

  const acts = new Map<string, string>();
  const sections = new Map<string, string>();
  for (const link of dossier?.provisions ?? []) {
    const statute = corpus.statutes.get(link.provision.statuteId);
    if (statute) acts.set(statute.id, statute.title);
    sections.set(link.provision.id, `${link.provision.label} — ${link.provision.heading}`);
  }

  return {
    courts: court ? [{ value: court.id, label: court.name }] : [],
    years: year ? [{ value: year, label: year }] : [],
    acts: [...acts].map(([value, label]) => ({ value, label })),
    sections: [...sections].map(([value, label]) => ({ value, label })),
    judges: (dossier?.judges ?? []).map((j) => ({ value: j.judge.id, label: j.judge.name })),
    benchStrength: bench
      ? [{ value: bench, label: BENCH_LABELS[bench] ?? `${bench}-judge bench` }]
      : [],
    doctrinalStatus: [
      {
        value: summary.doctrinalStatus,
        label: DOCTRINAL_LABELS[summary.doctrinalStatus] ?? summary.doctrinalStatus,
      },
    ],
  };
}

/**
 * Whether a candidate survives the selected filters, optionally ignoring one
 * dimension. A dimension with no selection is not a constraint.
 */
function matchesFilters(
  profile: FacetProfile,
  query: SearchQuery,
  exclude?: keyof SearchQuery,
): boolean {
  for (const { facet, filter } of DIMENSIONS) {
    if (filter === exclude) continue;
    const selected = query[filter] as string[] | undefined;
    if (!selected?.length) continue;
    if (!profile[facet].some((option) => selected.includes(option.value))) return false;
  }
  return true;
}

/**
 * Facets are computed over the candidate set *before* that facet's own filter
 * is applied, so selecting a value never makes its siblings disappear.
 */
function buildFacets(
  candidates: ScoredCase[],
  profiles: FacetProfile[],
  query: SearchQuery,
): SearchFacets {
  const counts = new Map<keyof SearchFacets, Map<string, { label: string; count: number }>>();
  for (const { facet } of DIMENSIONS) counts.set(facet, new Map());

  // One pass over the candidates; each dimension is admitted or skipped on
  // its own scoped filter test rather than on its own pass.
  for (let i = 0; i < candidates.length; i += 1) {
    const profile = profiles[i];
    if (!profile) continue;
    for (const { facet, filter } of DIMENSIONS) {
      if (!matchesFilters(profile, query, filter)) continue;
      const bucket = counts.get(facet);
      if (!bucket) continue;
      for (const { value, label } of profile[facet]) {
        if (!value) continue;
        const existing = bucket.get(value);
        if (existing) existing.count += 1;
        else bucket.set(value, { label, count: 1 });
      }
    }
  }

  const values = (facet: keyof SearchFacets): SearchFacetValue[] =>
    toFacetValues(counts.get(facet) ?? new Map());

  return {
    courts: values("courts"),
    years: values("years"),
    acts: values("acts"),
    sections: values("sections"),
    judges: values("judges"),
    benchStrength: values("benchStrength"),
    doctrinalStatus: values("doctrinalStatus"),
  };
}

export function search(query: SearchQuery): SearchResponse {
  const started = performance.now();

  const candidates = scoreCorpus(query.q);
  const profiles = candidates.map(buildProfile);
  const facets = buildFacets(candidates, profiles, query);
  const filtered = candidates.filter((_, i) => {
    const profile = profiles[i];
    return profile ? matchesFilters(profile, query) : false;
  });

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
  const forms = getCitationForms();
  const out: Array<{ summary: CaseSummary; score: number }> = [];
  for (const summary of corpus.cases.values()) {
    const citationHit = (forms.get(summary.id) ?? []).some((c) => c.includes(normalized));
    const score = citationHit ? 1 : titleSimilarity(query, summary.title);
    if (score >= 0.35) out.push({ summary, score });
  }
  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.summary);
}
