import { extractYear, normalizeCitation, normalizeParagraphRef, normalizeWhitespace } from "./normalize";

/**
 * Citation detection and normalization for Indian legal writing.
 *
 * The detector is deterministic and evidence-preserving: it records the raw
 * matched text and its character offsets so the review UI can highlight the
 * exact span in the source document. Nothing here decides whether a citation
 * is valid — that is the verification engine's job.
 */

export interface DetectedCitation {
  rawText: string;
  normalizedCitation: string;
  charStart: number;
  charEnd: number;
  claimedCaseTitle?: string;
  claimedYear?: number;
  claimedReporter?: string;
  claimedNeutralCitation?: string;
  claimedCourt?: string;
  claimedParagraph?: string;
  claimedQuotation?: string;
  claimedProposition?: string;
}

/** Indian neutral citation, e.g. "2018 INSC 712", "2023 DHC 4521". */
const NEUTRAL_CITATION = /\b(1[89][0-9]{2}|20[0-9]{2})\s+(INSC|SCC?OnLine|DHC|BOMHC|MHC|KERHC|CALHC|APHC|NCLAT|NCLT)\s+([0-9]+)\b/gi;

/** Reporter citation, e.g. "(2018) 17 SCC 394", "(2021) 9 SCC 321". */
const REPORTER_CITATION = /\((1[89][0-9]{2}|20[0-9]{2})\)\s*([0-9]{1,3})\s*([A-Z][A-Za-z.]{1,12}(?:\s+[A-Z][A-Za-z.]{1,12})?)\s*([0-9]{1,5})\b/g;

/** AIR-style citation, e.g. "AIR 2018 SC 3054". */
const AIR_CITATION = /\bAIR\s+(1[89][0-9]{2}|20[0-9]{2})\s+([A-Z]{2,6})\s+([0-9]{1,5})\b/g;

/** Tribunal/appeal case numbers, e.g. "Company Appeal (AT) (Insolvency) No. 346 of 2018". */
const CASE_NUMBER =
  /\b((?:Company|Civil|Criminal|Transferred|Special\s+Leave)\s+(?:Appeal|Petition|Case)\s*(?:\([A-Z]{1,3}\)\s*)?(?:\((?:Insolvency|Ins)\)\s*)?(?:No\.?|Nos\.?)\s*[0-9]+(?:\s*-\s*[0-9]+)?\s+of\s+(1[89][0-9]{2}|20[0-9]{2}))/gi;

/** Statutory provisions, e.g. "Section 14 of the IBC", "§ 128 of the Indian Contract Act". */
const PROVISION_REFERENCE =
  /(?:Section|Sections|§|§§)\s*([0-9]+[A-Z]?(?:\([0-9a-z]+\))*)\s*(?:of\s+(?:the\s+)?)?([A-Z][A-Za-z,'’\s]{2,60}?(?:Act|Code)(?:,\s*[0-9]{4})?|IBC|ICA|CrPC|CPC|SARFAESI)?/g;

const COURT_HINTS: Array<{ pattern: RegExp; court: string }> = [
  { pattern: /\bSupreme Court\b/i, court: "Supreme Court of India" },
  { pattern: /\bNCLAT\b|\bAppellate Tribunal\b/i, court: "National Company Law Appellate Tribunal" },
  { pattern: /\bNCLT\b|\bAdjudicating Authority\b/i, court: "National Company Law Tribunal" },
  { pattern: /\bHigh Court\b/i, court: "High Court" },
];

/** Reporter abbreviation -> canonical name, for display in evidence panes. */
export const REPORTER_NAMES: Record<string, string> = {
  SCC: "Supreme Court Cases",
  SCR: "Supreme Court Reports",
  AIR: "All India Reporter",
  INSC: "Supreme Court of India neutral citation",
  COMPLR: "Company Law Reporter",
};

interface Anchor {
  rawText: string;
  start: number;
  end: number;
  reporter?: string;
  neutral?: string;
  year?: number;
}

function collectAnchors(text: string): Anchor[] {
  const anchors: Anchor[] = [];

  for (const m of text.matchAll(NEUTRAL_CITATION)) {
    if (m.index === undefined) continue;
    anchors.push({
      rawText: m[0],
      start: m.index,
      end: m.index + m[0].length,
      neutral: normalizeWhitespace(m[0]).toUpperCase(),
      year: Number(m[1]),
    });
  }

  for (const m of text.matchAll(REPORTER_CITATION)) {
    if (m.index === undefined) continue;
    anchors.push({
      rawText: m[0],
      start: m.index,
      end: m.index + m[0].length,
      reporter: m[3]?.replace(/\./g, "").toUpperCase(),
      year: Number(m[1]),
    });
  }

  for (const m of text.matchAll(AIR_CITATION)) {
    if (m.index === undefined) continue;
    anchors.push({
      rawText: m[0],
      start: m.index,
      end: m.index + m[0].length,
      reporter: "AIR",
      year: Number(m[1]),
    });
  }

  for (const m of text.matchAll(CASE_NUMBER)) {
    if (m.index === undefined) continue;
    anchors.push({
      rawText: m[0],
      start: m.index,
      end: m.index + m[0].length,
      year: Number(m[2]),
    });
  }

  return anchors.sort((a, b) => a.start - b.start);
}

/**
 * Merges anchors that sit within `gap` characters of each other — a single
 * citation commonly carries both a neutral and a reporter reference.
 */
function mergeAdjacent(anchors: Anchor[], text: string, gap = 6): Anchor[] {
  const merged: Anchor[] = [];
  for (const anchor of anchors) {
    const previous = merged[merged.length - 1];
    if (previous && anchor.start - previous.end <= gap) {
      const between = text.slice(previous.end, anchor.start);
      if (/^[\s,;|]*$/.test(between)) {
        previous.end = anchor.end;
        previous.rawText = text.slice(previous.start, anchor.end);
        previous.reporter = previous.reporter ?? anchor.reporter;
        previous.neutral = previous.neutral ?? anchor.neutral;
        previous.year = previous.year ?? anchor.year;
        continue;
      }
    }
    merged.push({ ...anchor });
  }
  return merged;
}

/**
 * Lowercase words that legitimately appear inside a case title and must not
 * terminate the backward scan for it.
 */
const TITLE_CONNECTORS = new Set([
  "of",
  "and",
  "the",
  "&",
  "v",
  "v.",
  "vs",
  "vs.",
  "versus",
  "on",
  "for",
]);

const CONNECTOR_WORD = /^(?:v\.?|vs\.?|versus)$/i;

/** Lead-in words that introduce a citation but are not part of the title. */
const LEAD_IN = /^(?:in|see|per|cf\.?|also|and|but|to|of|on|for|that|from)\s+/i;

/**
 * Abbreviations that end in a period without ending a sentence. Without this
 * set, a backward scan cannot tell "Piramal Enterprises Ltd." (part of the
 * title) from "...restated by a three-Judge Bench." (the previous sentence).
 */
const ABBREVIATIONS = new Set([
  "ltd.",
  "pvt.",
  "co.",
  "corp.",
  "inc.",
  "llp.",
  "pte.",
  "anr.",
  "ors.",
  "dr.",
  "mr.",
  "mrs.",
  "ms.",
  "m/s.",
  "no.",
  "nos.",
  "v.",
  "vs.",
  "st.",
  "govt.",
]);

/** True for "V." and "D.Y." style initials. */
function isInitial(word: string): boolean {
  return /^(?:[A-Z]\.){1,4}$/.test(word);
}

function endsSentence(word: string): boolean {
  if (!word.endsWith(".")) return false;
  if (isInitial(word)) return false;
  return !ABBREVIATIONS.has(word.toLowerCase());
}

function isTitleWord(word: string): boolean {
  if (!word) return false;
  if (TITLE_CONNECTORS.has(word.toLowerCase())) return true;
  // A word that terminates a sentence cannot be part of the title that follows it.
  if (endsSentence(word)) return false;
  // Title words are capitalised, an initial, or an ampersand.
  return /^[A-Z(]/.test(word) || word === "&";
}

/**
 * Looks backwards from a citation for the case title that introduces it.
 *
 * Indian drafting places the title immediately before the citation, but hard
 * line wrapping routinely splits it across lines and party abbreviations
 * ("Ltd.", "Anr.", "V.") are full of periods — so sentence splitting is not a
 * usable boundary here. Instead we walk backwards word by word, accepting
 * title-shaped words, and stop at the first word that cannot belong to a
 * case title.
 */
function findClaimedTitle(text: string, anchorStart: number): string | undefined {
  const raw = text.slice(Math.max(0, anchorStart - 300), anchorStart);
  const window = normalizeWhitespace(raw.replace(/\s+/g, " ")).replace(/[\s,]+$/, "");
  if (!window) return undefined;

  const words = window.split(" ");
  const run: string[] = [];
  for (let i = words.length - 1; i >= 0 && run.length < 16; i -= 1) {
    const word = words[i];
    if (!word || !isTitleWord(word)) break;
    run.unshift(word);
  }
  if (run.length < 3) return undefined;

  // The run must contain a party connector to be a case title.
  if (!run.some((w) => CONNECTOR_WORD.test(w))) return undefined;

  let title = normalizeWhitespace(run.join(" "));
  // Strip lead-in words repeatedly ("In", "See also", ...).
  let previous = "";
  while (title !== previous) {
    previous = title;
    title = title.replace(LEAD_IN, "");
  }
  title = title.replace(/[\s,;:]+$/, "");

  // A title cannot begin with the connector itself.
  const firstWord = title.split(" ")[0];
  if (!firstWord || CONNECTOR_WORD.test(firstWord)) return undefined;
  return title.length >= 6 ? title : undefined;
}

/**
 * The enclosing text block for a citation: bounded by blank lines, which
 * separate numbered paragraphs in legal drafting. Scoping the search for
 * quotations and propositions to this block stops a quotation belonging to
 * one paragraph being attributed to a citation in the next.
 */
const BLOCK_BOUNDARY = /\n[ \t]*\n|\f/g;

function enclosingBlock(text: string, start: number, end: number): { text: string; offset: number } {
  let from = 0;
  let to = text.length;
  BLOCK_BOUNDARY.lastIndex = 0;
  for (const m of text.matchAll(BLOCK_BOUNDARY)) {
    if (m.index === undefined) continue;
    const boundaryEnd = m.index + m[0].length;
    if (boundaryEnd <= start) from = boundaryEnd;
    else if (m.index >= end) {
      to = m.index;
      break;
    }
  }
  return { text: text.slice(from, to), offset: from };
}

/** Finds a paragraph reference in the text immediately around the citation. */
function findParagraphRef(text: string, start: number, end: number): string | undefined {
  const window = text.slice(Math.max(0, start - 120), Math.min(text.length, end + 160));
  return normalizeParagraphRef(window);
}

/**
 * Finds a quotation attributed to the citation, within the citation's own
 * paragraph block. Covers both "X held: '...'" and "'...' (X v. Y, ...)"
 * orderings by preferring the quotation nearest the citation anchor.
 */
function findQuotation(text: string, start: number, end: number): string | undefined {
  const block = enclosingBlock(text, start, end);
  const quotes = [...block.text.matchAll(/["“”]([^"“”]{40,1200})["“”]/g)];
  if (quotes.length === 0) return undefined;

  const anchorInBlock = start - block.offset;
  let best: { text: string; distance: number } | undefined;
  for (const q of quotes) {
    if (q.index === undefined || !q[1]) continue;
    const distance = Math.abs(q.index - anchorInBlock);
    if (!best || distance < best.distance) best = { text: q[1], distance };
  }
  return best ? normalizeWhitespace(best.text) : undefined;
}

/**
 * Citation scaffolding — the drafting furniture that introduces an
 * authority. It is not part of the proposition being asserted, and leaving
 * it in badly distorts any similarity measure against the judgment, because
 * words like "Hon'ble", "submitted" and "paragraph" never appear in the
 * judgment text itself.
 */
const SCAFFOLDING: RegExp[] = [
  /\bit is (?:respectfully |further |also )*submitted that\b/gi,
  /\bthe (?:hon'?ble )?(?:supreme court|court|tribunal|bench)\s+(?:of india\s+)?has (?:further |also |consistently )*(?:held|observed|concluded|clarified)(?:\s+that)?\b/gi,
  /\bthe (?:hon'?ble )?(?:supreme court|court|tribunal|bench)\s+(?:of india\s+)?(?:held|observed|concluded|clarified|considered|noted)\b(?:\s+(?:at|in)\s+(?:paragraphs?|paras?|¶)\s*[0-9]+)?(?:\s+that)?/gi,
  /\b(?:at|in)\s+(?:paragraphs?|paras?|¶)\s*[0-9]+(?:\s+that)?\b/gi,
  /\bthat decision is directly binding on this adjudicating authority\b/gi,
  /\b(?:in|see|see also|cf\.?|per)\s+(?=[A-Z])/g,
  /\bthe same principle has been restated by a [a-z-]+ bench\b/gi,
];

/**
 * Finds the proposition the document asserts the authority supports: the
 * citation's own paragraph block, with the citation, any quotation, the case
 * title and the citation scaffolding removed, so what remains is the
 * drafter's own assertion about the law.
 */
function findProposition(
  text: string,
  start: number,
  end: number,
  claimedTitle?: string,
): string | undefined {
  const block = enclosingBlock(text, start, end);
  const anchorInBlock = start - block.offset;
  const anchorEndInBlock = end - block.offset;
  const withoutCitation =
    block.text.slice(0, anchorInBlock) + " " + block.text.slice(anchorEndInBlock);

  let sentence = normalizeWhitespace(withoutCitation)
    .replace(/["“”][^"“”]{40,1200}["“”]/g, " ")
    .replace(/^\s*\d+\.\s*/, "");

  if (claimedTitle) {
    sentence = sentence.split(claimedTitle).join(" ");
  }
  for (const pattern of SCAFFOLDING) sentence = sentence.replace(pattern, " ");

  // Removing the citation and the title leaves dangling connectives and
  // doubled punctuation ("In,,"). Tidy them so the proposition reads as a
  // sentence in the review pane.
  sentence = normalizeWhitespace(
    sentence
      .replace(/\(\s*\)/g, " ")
      .replace(/\b(?:in|see|per|cf\.?|also)\s*(?=[,.;:])/gi, " ")
      .replace(/\s+([,.;:])/g, "$1")
      .replace(/([,;:.])[\s,;:]*\1+/g, "$1")
      .replace(/([,;:])\s*\./g, ".")
      .replace(/^[,;:.\s]+/, "")
      .replace(/[\s,;:.]+$/, "."),
  );
  return sentence.length >= 25 ? sentence.slice(0, 900) : undefined;
}

function findCourtHint(text: string, start: number, end: number): string | undefined {
  const window = text.slice(Math.max(0, start - 200), Math.min(text.length, end + 200));
  for (const { pattern, court } of COURT_HINTS) {
    if (pattern.test(window)) return court;
  }
  return undefined;
}

/**
 * Extracts every case citation in a document, along with what the document
 * claims about it. Offsets are relative to the supplied text.
 */
export function detectCitations(text: string): DetectedCitation[] {
  const anchors = mergeAdjacent(collectAnchors(text), text);
  const seen = new Set<string>();
  const out: DetectedCitation[] = [];

  for (const anchor of anchors) {
    const rawText = normalizeWhitespace(anchor.rawText);
    const claimedCaseTitle = findClaimedTitle(text, anchor.start);
    // De-duplicate repeat references to the same authority in the same document.
    const key = `${normalizeCitation(rawText)}::${claimedCaseTitle ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      rawText,
      normalizedCitation: normalizeCitation(rawText),
      charStart: anchor.start,
      charEnd: anchor.end,
      claimedCaseTitle,
      claimedYear: anchor.year ?? extractYear(rawText),
      claimedReporter: anchor.reporter,
      claimedNeutralCitation: anchor.neutral,
      claimedCourt: findCourtHint(text, anchor.start, anchor.end),
      claimedParagraph: findParagraphRef(text, anchor.start, anchor.end),
      claimedQuotation: findQuotation(text, anchor.start, anchor.end),
      claimedProposition: findProposition(text, anchor.start, anchor.end, claimedCaseTitle),
    });
  }

  return out;
}

export interface DetectedProvision {
  rawText: string;
  section: string;
  act?: string;
  charStart: number;
  charEnd: number;
}

/** Extracts statutory references so the dossier can link provisions. */
export function detectProvisions(text: string): DetectedProvision[] {
  const out: DetectedProvision[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(PROVISION_REFERENCE)) {
    if (m.index === undefined || !m[1]) continue;
    const act = m[2] ? normalizeWhitespace(m[2]) : undefined;
    const key = `${m[1]}::${act ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      rawText: normalizeWhitespace(m[0]),
      section: m[1],
      act,
      charStart: m.index,
      charEnd: m.index + m[0].length,
    });
  }
  return out;
}
