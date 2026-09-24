export type VerificationStatus =
  | "VERIFIED"
  | "METADATA_MISMATCH"
  | "PARAGRAPH_MISMATCH"
  | "WEAK_PROPOSITION_SUPPORT"
  | "NO_AUTHORITATIVE_MATCH"
  | "NEEDS_REVIEW";

export type RelationshipType =
  | "CITES"
  | "CITED_BY"
  | "APPEAL_OF"
  | "AFFIRMS"
  | "REVERSES"
  | "REMANDS"
  | "FOLLOWS"
  | "DISTINGUISHES"
  | "OVERRULES"
  | "RELATED";

export interface ProvenanceRef {
  sourceName: string;
  sourceUrl: string;
  authorityLevel: "PRIMARY" | "SECONDARY" | "USER";
  retrievedAt?: string;
  paragraphId?: string;
  page?: number;
}

export interface CaseSummary {
  id: string;
  title: string;
  citation?: string;
  court: string;
  decisionDate?: string;
  summary?: string;
  provenance: ProvenanceRef[];
}

export interface CaseRelationship {
  id: string;
  sourceCaseId: string;
  targetCaseId: string;
  type: RelationshipType;
  confidence?: number;
  evidence: ProvenanceRef[];
}

export interface VerificationResult {
  status: VerificationStatus;
  score: number;
  explanation: string;
  matchedCaseId?: string;
  checks: Record<string, boolean | number | string | null>;
  evidence: ProvenanceRef[];
}
