/**
 * CaseLens domain model.
 *
 * Superset of the kit's `src/types/domain.ts`. Every type that carries a legal
 * assertion also carries provenance — that invariant is enforced in
 * `server/services/provenance.ts`.
 */

/* ------------------------------------------------------------------ */
/* Provenance                                                          */
/* ------------------------------------------------------------------ */

/**
 * PRIMARY   — official court/registry/gazette record.
 * SECONDARY — reporter or established legal database.
 * USER      — a note or edge the user authored; never an authority.
 * DEMO      — curated fixture shipped for the demo corpus. Rendered with an
 *             explicit "demo corpus" marker so it is never mistaken for a
 *             retrieved primary record.
 */
export type AuthorityLevel = "PRIMARY" | "SECONDARY" | "USER" | "DEMO";

export interface ProvenanceRef {
  sourceName: string;
  sourceUrl: string;
  authorityLevel: AuthorityLevel;
  retrievedAt?: string;
  paragraphId?: string;
  page?: number;
  /** Set when the underlying text is a curated fixture rather than fetched source text. */
  note?: string;
}

export interface ProvenanceRecord extends ProvenanceRef {
  id: string;
  contentHash?: string;
}

/* ------------------------------------------------------------------ */
/* Courts, judges, parties                                             */
/* ------------------------------------------------------------------ */

export type CourtLevel = "SUPREME_COURT" | "HIGH_COURT" | "TRIBUNAL" | "DISTRICT_COURT";

export interface Court {
  id: string;
  name: string;
  shortName: string;
  level: CourtLevel;
  jurisdiction: string;
  state?: string;
  sourceKey: string;
}

export interface Judge {
  id: string;
  name: string;
  normalizedName: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export type PartyEntityType = "INDIVIDUAL" | "COMPANY" | "STATE" | "BANK" | "AUTHORITY";

export interface Party {
  id: string;
  name: string;
  normalizedName: string;
  entityType?: PartyEntityType;
}

export type PartyRole = "APPELLANT" | "RESPONDENT" | "PETITIONER" | "INTERVENER";

export interface CaseParty {
  party: Party;
  role: PartyRole;
}

export interface CaseJudge {
  judge: Judge;
  benchOrder?: number;
  authoring?: boolean;
}

/* ------------------------------------------------------------------ */
/* Statutes                                                            */
/* ------------------------------------------------------------------ */

export interface Statute {
  id: string;
  title: string;
  shortTitle: string;
  jurisdiction: string;
  sourceUrl: string;
}

export type ProvisionType = "SECTION" | "ARTICLE" | "RULE" | "CLAUSE";

export interface Provision {
  id: string;
  statuteId: string;
  provisionType: ProvisionType;
  provisionNumber: string;
  heading: string;
  text?: string;
  sourceUrl: string;
  /** Display label, e.g. "§ 14 IBC". */
  label: string;
  provenance: ProvenanceRef[];
}

export type CaseProvisionRelation = "INTERPRETS" | "APPLIES" | "MENTIONS" | "CHALLENGES";

export interface CaseProvisionLink {
  provision: Provision;
  relationType: CaseProvisionRelation;
  sourceParagraphId?: string;
  evidence: ProvenanceRef[];
}

/* ------------------------------------------------------------------ */
/* Cases + judgments                                                   */
/* ------------------------------------------------------------------ */

export type DoctrinalStatus =
  | "BINDING_LANDMARK"
  | "AFFIRMED_FOLLOWED"
  | "DISTINGUISHED"
  | "OVERRULED"
  | "PENDING";

export interface CaseSummary {
  id: string;
  title: string;
  citation?: string;
  court: string;
  courtShortName: string;
  courtLevel: CourtLevel;
  decisionDate?: string;
  summary?: string;
  neutralCitation?: string;
  reporterCitations: string[];
  caseNumber?: string;
  benchStrength?: number;
  doctrinalStatus: DoctrinalStatus;
  /**
   * True for a record in the coverage index: known by citation and metadata
   * only, with no indexed judgment text and no independently verified
   * metadata. The verification engine reports these as known-but-uncheckable
   * rather than raising a mismatch against them.
   */
  coverageOnly?: boolean;
  provenance: ProvenanceRef[];
}

export interface JudgmentParagraph {
  id: string;
  judgmentId: string;
  caseId: string;
  paragraphNumber: string;
  text: string;
  textHash: string;
  /** Marked true for the operative ratio decidendi paragraph(s). */
  isRatio?: boolean;
  provenance: ProvenanceRef[];
}

export interface Judgment {
  id: string;
  caseId: string;
  language: string;
  sourceUrl: string;
  sourceAuthority: string;
  paragraphs: JudgmentParagraph[];
}

/* ------------------------------------------------------------------ */
/* Relationships                                                       */
/* ------------------------------------------------------------------ */

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

export const PROCEDURAL_RELATIONSHIPS: readonly RelationshipType[] = [
  "APPEAL_OF",
  "REMANDS",
  "REVERSES",
  "AFFIRMS",
];

export interface CaseRelationship {
  id: string;
  sourceCaseId: string;
  targetCaseId: string;
  type: RelationshipType;
  confidence?: number;
  sourceParagraphId?: string;
  evidence: ProvenanceRef[];
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

export type TimelineEventKind =
  | "FILING"
  | "DECISION"
  | "APPEAL"
  | "REMAND"
  | "AFFIRMATION"
  | "REVERSAL"
  | "STATUTORY_EVENT";

export interface TimelineEvent {
  id: string;
  date: string;
  kind: TimelineEventKind;
  title: string;
  forum: string;
  description: string;
  caseId?: string;
  /** True for the case whose dossier is being viewed. */
  isFocus?: boolean;
  provenance: ProvenanceRef[];
}

/* ------------------------------------------------------------------ */
/* Case dossier                                                        */
/* ------------------------------------------------------------------ */

export interface CaseDossier {
  summary: CaseSummary;
  parties: CaseParty[];
  judges: CaseJudge[];
  provisions: CaseProvisionLink[];
  keyParagraphs: JudgmentParagraph[];
  judgment?: Judgment;
  citationCount: number;
  issues: string[];
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

export interface SearchFacetValue {
  value: string;
  label: string;
  count: number;
}

export interface SearchFacets {
  courts: SearchFacetValue[];
  years: SearchFacetValue[];
  acts: SearchFacetValue[];
  sections: SearchFacetValue[];
  judges: SearchFacetValue[];
  benchStrength: SearchFacetValue[];
  doctrinalStatus: SearchFacetValue[];
}

export interface SearchHit {
  case: CaseSummary;
  score: number;
  /** Highest-signal paragraph supporting the match; always primary-source text. */
  excerpt?: JudgmentParagraph;
  matchedProvisions: string[];
  matchReasons: string[];
}

export interface SearchResponse {
  results: SearchHit[];
  facets: SearchFacets;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  queryTimeMs: number;
}

/* ------------------------------------------------------------------ */
/* Graph                                                               */
/* ------------------------------------------------------------------ */

export type GraphNodeType = "CASE" | "PROVISION" | "JUDGE" | "PARTY" | "NOTE" | "EVIDENCE";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  sublabel?: string;
  courtLevel?: CourtLevel;
  doctrinalStatus?: DoctrinalStatus;
  year?: number;
  isFocus?: boolean;
  entityId: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType | CaseProvisionRelation;
  label: string;
  confidence?: number;
  evidence: ProvenanceRef[];
  sourceParagraphId?: string;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  focusId: string;
  depth: number;
}

/* ------------------------------------------------------------------ */
/* Investigations                                                      */
/* ------------------------------------------------------------------ */

export interface InvestigationNodeMetadata {
  title: string;
  subtitle?: string;
  citation?: string;
  excerpt?: string;
  provenance: ProvenanceRef[];
  verificationStatus?: VerificationStatus;
}

export interface InvestigationNode {
  id: string;
  investigationId: string;
  nodeType: GraphNodeType;
  entityId?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  note?: string;
  metadata: InvestigationNodeMetadata;
}

export interface InvestigationEdge {
  id: string;
  investigationId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: RelationshipType | "USER_LINK";
  label?: string;
  evidence: ProvenanceRef[];
}

export interface Investigation {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  nodes: InvestigationNode[];
  edges: InvestigationEdge[];
}

/* ------------------------------------------------------------------ */
/* Documents + verification                                            */
/* ------------------------------------------------------------------ */

export type ExtractionStatus =
  | "PENDING"
  | "EXTRACTING"
  | "CITATIONS_DETECTED"
  | "METADATA_CHECKED"
  | "PARAGRAPHS_CHECKED"
  | "PROPOSITIONS_CHECKED"
  | "COMPLETE"
  | "FAILED";

export const ANALYSIS_STAGES: readonly ExtractionStatus[] = [
  "EXTRACTING",
  "CITATIONS_DETECTED",
  "METADATA_CHECKED",
  "PARAGRAPHS_CHECKED",
  "PROPOSITIONS_CHECKED",
  "COMPLETE",
];

export interface StoredDocument {
  id: string;
  ownerId?: string;
  filename: string;
  mimeType: string;
  objectKey: string;
  sha256: string;
  extractionStatus: ExtractionStatus;
  pageCount?: number;
  createdAt: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface ExtractedCitation {
  id: string;
  documentId: string;
  rawText: string;
  normalizedCitation: string;
  pageNumber?: number;
  charStart?: number;
  charEnd?: number;
  claimedCaseTitle?: string;
  claimedYear?: number;
  claimedReporter?: string;
  claimedNeutralCitation?: string;
  claimedCourt?: string;
  claimedParagraph?: string;
  /** Verbatim text the document attributes to the authority, if quoted. */
  claimedQuotation?: string;
  /** Proposition the document asserts the authority supports. */
  claimedProposition?: string;
}

export type VerificationStatus =
  | "VERIFIED"
  | "METADATA_MISMATCH"
  | "PARAGRAPH_MISMATCH"
  | "WEAK_PROPOSITION_SUPPORT"
  | "NO_AUTHORITATIVE_MATCH"
  | "NEEDS_REVIEW";

export interface VerificationCheck {
  id: string;
  label: string;
  outcome: "PASS" | "FAIL" | "PARTIAL" | "SKIPPED";
  detail: string;
  /** Deterministic checks run before any model call. */
  deterministic: boolean;
}

export interface ClaimComparison {
  field: string;
  claimed: string | null;
  authoritative: string | null;
  agrees: boolean;
}

export interface VerificationResult {
  id: string;
  extractedCitationId: string;
  status: VerificationStatus;
  score: number;
  explanation: string;
  matchedCaseId?: string;
  matchedParagraphId?: string;
  checks: VerificationCheck[];
  evidence: ProvenanceRef[];
  /** Field-level comparison of what the document claims vs. the authority. */
  claimedVsActual: ClaimComparison[];
  modelVersion?: string;
  createdAt: string;
}

export interface DocumentAnalysis {
  document: StoredDocument;
  stage: ExtractionStatus;
  citations: ExtractedCitation[];
  results: VerificationResult[];
  text?: string;
  summary: {
    total: number;
    verified: number;
    issues: number;
    byStatus: Record<VerificationStatus, number>;
  };
}

/* ------------------------------------------------------------------ */
/* Grounded AI                                                         */
/* ------------------------------------------------------------------ */

export interface GroundedClaim {
  claim: string;
  supportingCaseIds: string[];
  supportingParagraphIds: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface SynthesisResult {
  answer: string;
  claims: GroundedClaim[];
  limitations: string[];
  nextSteps: string[];
  sources: ProvenanceRef[];
  modelVersion: string;
  /** True when produced by deterministic extraction because no model was configured. */
  grounded: boolean;
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export type ReportKind = "INVESTIGATION" | "INTEGRITY";

export interface ReportEntry {
  title: string;
  subtitle?: string;
  detail?: string;
  status?: VerificationStatus;
  provenance: ProvenanceRef[];
}

export interface ReportSection {
  id: string;
  heading: string;
  body?: string;
  entries: ReportEntry[];
}

export interface Report {
  id: string;
  kind: ReportKind;
  title: string;
  subtitle: string;
  generatedAt: string;
  subjectId: string;
  sections: ReportSection[];
  disclaimer: string;
}
