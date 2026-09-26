import { analyze, titleProfileOf, trigramsOf } from "./text-analysis";

/**
 * Deterministic similarity measures.
 *
 * DATA_PIPELINE.md orders paragraph verification as: exact match, then fuzzy
 * match, then paragraph-number lookup, and only then semantic support. These
 * functions cover the first two rungs and must never call a model.
 *
 * Tokenization is shared through `text-analysis.ts`, which caches it per
 * distinct string. These measures are applied across the whole corpus for a
 * single query, so re-normalizing the same text once per comparison costs
 * more than the comparison itself.
 */

/** Character trigrams of a normalized string, mirroring pg_trgm behaviour. */
export function trigrams(input: string): Set<string> {
  return trigramsOf(input);
}

export function jaccard<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): number {
  if (a.size === 0 && b.size === 0) return 1;
  // Iterate the smaller set: membership is O(1) on either side, so the loop
  // length is the only thing that varies.
  const small = a.size <= b.size ? a : b;
  const large = small === a ? b : a;
  let intersection = 0;
  for (const value of small) if (large.has(value)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Trigram similarity in [0,1] over normalized case titles. */
export function titleSimilarity(a: string, b: string): number {
  const pa = titleProfileOf(a);
  const pb = titleProfileOf(b);
  if (!pa.normalized || !pb.normalized) return 0;
  if (pa.normalized === pb.normalized) return 1;
  const trigramScore = jaccard(pa.trigrams, pb.trigrams);
  // Party-name overlap rescues titles whose word order or noise words differ.
  const tokenScore = jaccard(pa.tokens, pb.tokens);
  return Math.max(trigramScore, (trigramScore + tokenScore) / 2);
}

/**
 * Levenshtein distance with an early-exit band. Used for short strings only
 * (citations, paragraph numbers) — quadratic cost is acceptable there.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let current = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const deletion = (previous[j] ?? 0) + 1;
      const insertion = (current[j - 1] ?? 0) + 1;
      const substitution = (previous[j - 1] ?? 0) + cost;
      current[j] = Math.min(deletion, insertion, substitution);
    }
    const swap = previous;
    previous = current;
    current = swap;
  }
  return previous[b.length] ?? 0;
}

export function levenshteinRatio(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - levenshtein(a, b) / longest;
}

/**
 * Token-level containment: how much of `needle` appears in `haystack`.
 * This is the right measure for "is this quotation drawn from this
 * paragraph", because a quotation is typically a fragment of the paragraph.
 */
export function tokenContainment(needle: string, haystack: string): number {
  const needleTokens = analyze(needle).tokens;
  if (needleTokens.length === 0) return 0;
  const haystackTokens = analyze(haystack).tokenSet;
  let present = 0;
  for (const token of needleTokens) if (haystackTokens.has(token)) present += 1;
  return present / needleTokens.length;
}

/**
 * Longest common word-run between two passages, expressed as a fraction of
 * the shorter passage. A high value means a genuine verbatim overlap rather
 * than coincidental shared vocabulary.
 */
export function longestCommonRunRatio(a: string, b: string): number {
  const ta = analyze(a).tokens;
  const tb = analyze(b).tokens;
  if (ta.length === 0 || tb.length === 0) return 0;

  let best = 0;
  let previous = new Array<number>(tb.length + 1).fill(0);
  let current = new Array<number>(tb.length + 1).fill(0);

  for (let i = 1; i <= ta.length; i += 1) {
    const left = ta[i - 1];
    for (let j = 1; j <= tb.length; j += 1) {
      if (left === tb[j - 1]) {
        const run = (previous[j - 1] ?? 0) + 1;
        current[j] = run;
        if (run > best) best = run;
      } else {
        current[j] = 0;
      }
    }
    const swap = previous;
    previous = current;
    current = swap;
    current.fill(0);
  }
  return best / Math.min(ta.length, tb.length);
}

/**
 * Bag-of-words cosine similarity. Stands in for the pgvector semantic step
 * when no embedding backend is configured; it is deterministic, which keeps
 * verification reproducible. Flagged as non-semantic to callers.
 */
export function lexicalCosine(a: string, b: string): number {
  return weightedCosine(a, b, () => 1);
}

/**
 * Cosine similarity with a per-term weight, normally inverse document
 * frequency over the indexed corpus.
 *
 * Unweighted overlap is a poor measure for legal propositions: two passages
 * can share almost all of their vocabulary ("resolution plan", "creditor",
 * "guarantor", "in favour of") while asserting opposite things, because that
 * vocabulary is the boilerplate of the field. Weighting by IDF puts the
 * decisive mass on the distinctive terms — the ones that carry the claim —
 * so a proposition built from words the authority never uses scores low even
 * when its boilerplate matches.
 */
export function weightedCosine(
  a: string,
  b: string,
  weightOf: (term: string) => number,
): number {
  const ca = analyze(a).counts;
  const cb = analyze(b).counts;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [token, count] of ca) {
    // One weight lookup per term. This runs once per corpus paragraph per
    // comparison, so the duplicate lookup is worth eliding.
    const weight = weightOf(token);
    const weighted = count * weight;
    normA += weighted * weighted;
    const other = cb.get(token);
    if (other) dot += weighted * other * weight;
  }
  for (const [token, count] of cb) {
    const weighted = count * weightOf(token);
    normB += weighted * weighted;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Weighted containment: the share of `needle`'s weight mass that also occurs
 * in `haystack`.
 *
 * For "is this proposition borne out by this paragraph" this is a better
 * measure than cosine, because a proposition is short and a paragraph is
 * long — cosine penalises that length mismatch even when the paragraph says
 * exactly what the proposition claims. Containment asks only whether the
 * distinctive content of the claim is present.
 */
export function weightedContainment(
  needle: string,
  haystack: string,
  weightOf: (term: string) => number,
): number {
  const needleTerms = analyze(needle).counts;
  const haystackTerms = analyze(haystack).tokenSet;
  let total = 0;
  let present = 0;
  for (const [token, count] of needleTerms) {
    const weight = count * weightOf(token);
    total += weight;
    if (haystackTerms.has(token)) present += weight;
  }
  return total === 0 ? 0 : present / total;
}

/** Builds an IDF lookup from a document collection. */
export function buildIdf(documents: string[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const document of documents) {
    for (const token of analyze(document).tokenSet) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }
  const total = documents.length;
  const idf = new Map<string, number>();
  for (const [token, count] of df) {
    idf.set(token, Math.log((total + 1) / (count + 1)) + 1);
  }
  return idf;
}

/**
 * Weight for a term not present in the corpus. Unseen terms are maximally
 * distinctive, so a proposition full of them cannot score as supported.
 */
export function idfWeight(idf: Map<string, number>, term: string): number {
  const known = idf.get(term);
  if (known !== undefined) return known;
  return Math.log(idf.size + 1) + 1;
}

/** Cosine similarity between dense embedding vectors. */
export function vectorCosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
