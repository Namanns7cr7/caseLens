import { normalizeCaseTitle, normalizeParagraphText, titleTokens } from "./normalize";

/**
 * Cached tokenization of the texts the matching layer compares.
 *
 * Normalization is regex-heavy, and every measure in `similarity.ts` starts
 * by redoing it. A single search re-normalizes the same query once per
 * paragraph in the corpus, and re-normalizes every paragraph on every
 * keystroke — work whose result cannot change, because both normalization
 * and tokenization are pure functions of the string.
 *
 * Caching keyed on the string itself is therefore safe: identical input
 * yields identical output by construction. Corpus text is a fixed set of
 * strings that recurs on every request, so it stays resident; query text
 * varies and simply misses.
 *
 * The analyses handed out are shared and MUST be treated as read-only.
 */

export interface TextAnalysis {
  /** Normalized form, as produced by `normalizeParagraphText`. */
  readonly normalized: string;
  /** Tokens in document order — the input to run-length comparison. */
  readonly tokens: readonly string[];
  /** Distinct tokens, for containment tests. */
  readonly tokenSet: ReadonlySet<string>;
  /** Term frequencies, for cosine measures. */
  readonly counts: ReadonlyMap<string, number>;
}

export interface TitleProfile {
  /** Normalized form, as produced by `normalizeCaseTitle`. */
  readonly normalized: string;
  /** Character trigrams of the normalized title. */
  readonly trigrams: ReadonlySet<string>;
  /** Distinct party-name tokens, for word-overlap scoring. */
  readonly tokens: ReadonlySet<string>;
}

/**
 * Two-generation cache.
 *
 * A plain cap that clears on overflow evicts the corpus entries — the ones
 * worth keeping — as soon as enough distinct queries pass through. Holding
 * the previous generation and promoting on hit keeps recurring strings
 * resident while still bounding memory at 2 × MAX_ENTRIES.
 */
const MAX_ENTRIES = 4096;

class Memo<T> {
  private current = new Map<string, T>();
  private previous = new Map<string, T>();

  get(key: string, compute: (key: string) => T): T {
    const hit = this.current.get(key);
    if (hit !== undefined) return hit;

    const stale = this.previous.get(key);
    if (stale !== undefined) {
      this.current.set(key, stale);
      return stale;
    }

    const value = compute(key);
    if (this.current.size >= MAX_ENTRIES) {
      this.previous = this.current;
      this.current = new Map();
    }
    this.current.set(key, value);
    return value;
  }
}

const textMemo = new Memo<TextAnalysis>();
const titleMemo = new Memo<TitleProfile>();

/** Character trigrams of a normalized string, mirroring pg_trgm behaviour. */
export function trigramsOf(normalized: string): Set<string> {
  const padded = `  ${normalized} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i += 1) {
    out.add(padded.slice(i, i + 3));
  }
  return out;
}

/** Tokenized view of a passage, computed once per distinct string. */
export function analyze(text: string): TextAnalysis {
  return textMemo.get(text, (input) => {
    const normalized = normalizeParagraphText(input);
    const tokens = normalized.split(" ").filter(Boolean);
    const counts = new Map<string, number>();
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    return { normalized, tokens, tokenSet: new Set(tokens), counts };
  });
}

/** Trigram and token view of a case title, computed once per distinct string. */
export function titleProfileOf(title: string): TitleProfile {
  return titleMemo.get(title, (input) => {
    const normalized = normalizeCaseTitle(input);
    return {
      normalized,
      trigrams: normalized ? trigramsOf(normalized) : new Set<string>(),
      tokens: new Set(titleTokens(input)),
    };
  });
}
