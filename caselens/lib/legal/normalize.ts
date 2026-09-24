import { createHash } from "node:crypto";

/**
 * Deterministic text normalization for legal matching.
 *
 * Everything here must be pure and stable: the verification engine compares
 * hashes produced by these functions across runs, and DATA_PIPELINE.md
 * requires that normalization never mutate the stored primary text.
 */

/** Characters legal sources vary on but which carry no semantic weight. */
const SMART_QUOTES = /[‘’‚‛′‵]/g;
const SMART_DOUBLE_QUOTES = /[“”„‟″‶]/g;
const DASHES = /[‐‑‒–—―−]/g;
const ELLIPSIS = /…/g;

/** Lower-cases, folds punctuation variants, and collapses whitespace. */
export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function foldPunctuation(input: string): string {
  return input
    .replace(SMART_QUOTES, "'")
    .replace(SMART_DOUBLE_QUOTES, '"')
    .replace(DASHES, "-")
    .replace(ELLIPSIS, "...")
    .replace(/ /g, " ")
    .replace(/§/g, "section ");
}

/**
 * Canonical form used for paragraph identity and quotation matching.
 * Drops all punctuation so that reporter-specific typography does not
 * defeat an otherwise exact match.
 */
export function normalizeParagraphText(input: string): string {
  return normalizeWhitespace(
    foldPunctuation(input)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " "),
  );
}

/** SHA-256 over the canonical paragraph form. Stable across sources. */
export function paragraphHash(input: string): string {
  return createHash("sha256").update(normalizeParagraphText(input), "utf8").digest("hex");
}

/**
 * Case-title normalization. Strips honorifics, corporate suffixes, party
 * connectors and the "and others" tail so that citation variants of the same
 * authority converge.
 */
const TITLE_NOISE = [
  /\bversus\b/g,
  /\bvs?\.?\b/g,
  /\band others?\b/g,
  /\band anr\.?\b/g,
  /\band ors\.?\b/g,
  /\banr\.?\b/g,
  /\bors\.?\b/g,
  /\betc\.?\b/g,
  /\bthe\b/g,
];

const TITLE_SUFFIXES = [
  /\bprivate\b/g,
  /\bpvt\.?\b/g,
  /\blimited\b/g,
  /\bltd\.?\b/g,
  /\bco\.?\b/g,
  /\bcompany\b/g,
  /\bcorporation\b/g,
  /\bincorporated\b/g,
  /\binc\.?\b/g,
];

const HONORIFICS = /\b(dr|shri|smt|mr|mrs|ms|m\/s|justice|hon'?ble)\b\.?/g;

export function normalizeCaseTitle(input: string): string {
  let out = foldPunctuation(input).toLowerCase();
  out = out.replace(/\(.*?\)/g, " ");
  out = out.replace(HONORIFICS, " ");
  for (const pattern of TITLE_NOISE) out = out.replace(pattern, " ");
  for (const pattern of TITLE_SUFFIXES) out = out.replace(pattern, " ");
  out = out.replace(/[^a-z0-9\s]/g, " ");
  return normalizeWhitespace(out);
}

/** Tokens of a normalized case title, used for party-overlap scoring. */
export function titleTokens(input: string): string[] {
  return normalizeCaseTitle(input)
    .split(" ")
    .filter((t) => t.length > 1);
}

/**
 * Canonical citation key. Uppercases, folds punctuation and collapses
 * spacing so that "(2018) 17 SCC 394", "(2018) 17 S.C.C. 394" and
 * "2018 17 SCC 394" all resolve to the same key.
 */
export function normalizeCitation(input: string): string {
  return foldPunctuation(input)
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/[()[\]]/g, " ")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes a paragraph reference such as "para 26", "¶26", "paragraphs
 * 26-28" or "at p. 26", returning the first paragraph number.
 *
 * The longer spellings are listed first: the alternation is ordered so that
 * "paragraphs" matches as a whole rather than leaving a stray "s" that would
 * break the match.
 */
export function normalizeParagraphRef(input: string): string | undefined {
  const match = /(?:paragraphs?|paras?\.?|¶+|pp?\.)\s*([0-9]+(?:\s*[-,]\s*[0-9]+)*)/i.exec(input);
  const value = match?.[1];
  if (!value) return undefined;
  const first = value.split(/[-,]/)[0];
  return first ? first.trim() : undefined;
}

/** Extracts a 4-digit year in the plausible range for a reported decision. */
export function extractYear(input: string): number | undefined {
  const matches = input.match(/\b(1[89][0-9]{2}|20[0-9]{2})\b/g);
  if (!matches || matches.length === 0) return undefined;
  const year = Number(matches[0]);
  return Number.isFinite(year) ? year : undefined;
}

/** Normalizes a statutory reference to the canonical "§ N ACT" label form. */
export function normalizeProvisionLabel(section: string, act: string): string {
  return `§ ${section.trim()} ${act.trim().toUpperCase()}`;
}
