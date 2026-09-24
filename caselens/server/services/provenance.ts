import type { AuthorityLevel, ProvenanceRef } from "@/types/domain";

/**
 * Provenance enforcement.
 *
 * DATABASE_SCHEMA.md: "No graph edge that makes a legal assertion should exist
 * without provenance_id or explicit user-created-note status."
 *
 * These helpers are the single place that rule is enforced. Services call
 * `assertEvidenced` before returning any object that asserts something about
 * the law; violations throw rather than degrading silently, because a legal
 * assertion rendered without provenance is the one failure mode CaseLens
 * cannot ship.
 */

export class ProvenanceError extends Error {
  readonly subject: string;

  constructor(subject: string, message: string) {
    super(`${subject}: ${message}`);
    this.name = "ProvenanceError";
    this.subject = subject;
  }
}

function isUsableUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function isValidProvenance(ref: ProvenanceRef): boolean {
  if (!ref.sourceName?.trim()) return false;
  // A user-authored note is provenance about itself and carries no source URL.
  if (ref.authorityLevel === "USER") return true;
  return isUsableUrl(ref.sourceUrl);
}

/**
 * Throws unless `evidence` contains at least one usable provenance reference.
 * `subject` identifies the offending record in the error message.
 */
export function assertEvidenced(subject: string, evidence: ProvenanceRef[] | undefined): void {
  if (!evidence || evidence.length === 0) {
    throw new ProvenanceError(subject, "legal assertion has no provenance");
  }
  const invalid = evidence.filter((ref) => !isValidProvenance(ref));
  if (invalid.length === evidence.length) {
    throw new ProvenanceError(subject, "no provenance reference carries a usable source");
  }
}

/** Non-throwing variant for render paths that must degrade rather than crash. */
export function hasEvidence(evidence: ProvenanceRef[] | undefined): boolean {
  return Boolean(evidence?.some(isValidProvenance));
}

/**
 * The strongest authority level present. Used by the UI to decide which
 * provenance badge to show for a record backed by several sources.
 */
const RANK: Record<AuthorityLevel, number> = { PRIMARY: 4, SECONDARY: 3, DEMO: 2, USER: 1 };

export function strongestAuthority(evidence: ProvenanceRef[]): AuthorityLevel | undefined {
  let best: AuthorityLevel | undefined;
  for (const ref of evidence) {
    if (!best || RANK[ref.authorityLevel] > RANK[best]) best = ref.authorityLevel;
  }
  return best;
}

export const AUTHORITY_LABELS: Record<AuthorityLevel, string> = {
  PRIMARY: "Primary source",
  SECONDARY: "Secondary source",
  DEMO: "Unverified demo data",
  USER: "User note",
};

export const AUTHORITY_DESCRIPTIONS: Record<AuthorityLevel, string> = {
  PRIMARY: "Official court, registry or gazette record.",
  SECONDARY: "Reporter or established legal database record.",
  DEMO: "Written from model recollection for this demo and NOT retrieved from any source. Unverified — check the linked record.",
  USER: "Authored by a user in this investigation. Not an authority.",
};

/**
 * The disclaimer required by LEGAL_DATA_RULES.md. Rendered wherever CaseLens
 * presents an AI-assisted conclusion or an exportable report.
 */
export const AI_DISCLAIMER =
  "AI-assisted legal research. Always verify against the linked primary authority before relying on a result.";

/**
 * Wording rule from LEGAL_DATA_RULES.md: a missing match is never described
 * as a fabricated authority.
 */
export const NO_MATCH_WORDING = "No authoritative match in connected sources";
