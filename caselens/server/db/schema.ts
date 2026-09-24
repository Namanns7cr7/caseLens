import { sql } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Drizzle schema — the authoritative persistence shape from DATABASE_SCHEMA.md.
 *
 * The application reads through `server/repositories/*`, which selects a driver
 * at runtime: Postgres when DATABASE_URL is set, otherwise the seeded in-memory
 * corpus. This schema is what `drizzle-kit generate` emits migrations from.
 */

/* pgvector column type. 768 dims matches Gemini text-embedding-004. */
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(768)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(",")
      .filter(Boolean)
      .map((n) => Number(n));
  },
});

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const courtLevelEnum = pgEnum("court_level", [
  "SUPREME_COURT",
  "HIGH_COURT",
  "TRIBUNAL",
  "DISTRICT_COURT",
]);

export const relationshipTypeEnum = pgEnum("relationship_type", [
  "CITES",
  "CITED_BY",
  "APPEAL_OF",
  "AFFIRMS",
  "REVERSES",
  "REMANDS",
  "FOLLOWS",
  "DISTINGUISHES",
  "OVERRULES",
  "RELATED",
]);

export const caseProvisionRelationEnum = pgEnum("case_provision_relation", [
  "INTERPRETS",
  "APPLIES",
  "MENTIONS",
  "CHALLENGES",
]);

export const extractionStatusEnum = pgEnum("extraction_status", [
  "PENDING",
  "EXTRACTING",
  "CITATIONS_DETECTED",
  "METADATA_CHECKED",
  "PARAGRAPHS_CHECKED",
  "PROPOSITIONS_CHECKED",
  "COMPLETE",
  "FAILED",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "VERIFIED",
  "METADATA_MISMATCH",
  "PARAGRAPH_MISMATCH",
  "WEAK_PROPOSITION_SUPPORT",
  "NO_AUTHORITATIVE_MATCH",
  "NEEDS_REVIEW",
]);

export const authorityLevelEnum = pgEnum("authority_level", [
  "PRIMARY",
  "SECONDARY",
  "USER",
  "DEMO",
]);

export const doctrinalStatusEnum = pgEnum("doctrinal_status", [
  "BINDING_LANDMARK",
  "AFFIRMED_FOLLOWED",
  "DISTINGUISHED",
  "OVERRULED",
  "PENDING",
]);

/* ------------------------------------------------------------------ */
/* Provenance                                                          */
/* ------------------------------------------------------------------ */

export const provenanceRecords = pgTable("provenance_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
  contentHash: text("content_hash"),
  authorityLevel: authorityLevelEnum("authority_level").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
});

/* ------------------------------------------------------------------ */
/* Courts / judges / parties                                           */
/* ------------------------------------------------------------------ */

export const courts = pgTable("courts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  level: courtLevelEnum("level").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  state: text("state"),
  sourceKey: text("source_key").notNull(),
});

export const judges = pgTable(
  "judges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => ({ normalizedIdx: index("judges_normalized_idx").on(t.normalizedName) }),
);

export const parties = pgTable(
  "parties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    entityType: text("entity_type"),
  },
  (t) => ({ normalizedIdx: index("parties_normalized_idx").on(t.normalizedName) }),
);

/* ------------------------------------------------------------------ */
/* Cases                                                               */
/* ------------------------------------------------------------------ */

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Stable human-readable identifier used in application URLs. The domain
    // layer addresses cases by slug; the Postgres driver maps slug <-> uuid.
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    neutralCitation: text("neutral_citation"),
    reporterCitations: jsonb("reporter_citations").$type<string[]>().notNull().default([]),
    courtId: uuid("court_id")
      .notNull()
      .references(() => courts.id),
    decisionDate: timestamp("decision_date", { withTimezone: false }),
    caseNumber: text("case_number"),
    status: doctrinalStatusEnum("status"),
    benchStrength: integer("bench_strength"),
    summary: text("summary"),
    sourceAuthority: text("source_authority").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceDocumentId: uuid("source_document_id"),
    provenanceId: uuid("provenance_id")
      .notNull()
      .references(() => provenanceRecords.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Trigram index for fuzzy case-title matching (requires pg_trgm).
    titleTrgmIdx: index("cases_title_trgm_idx").using(
      "gin",
      sql`${t.normalizedTitle} gin_trgm_ops`,
    ),
    slugIdx: uniqueIndex("cases_slug_idx").on(t.slug),
    neutralCitationIdx: index("cases_neutral_citation_idx").on(t.neutralCitation),
    decisionDateIdx: index("cases_decision_date_idx").on(t.decisionDate),
    courtIdx: index("cases_court_idx").on(t.courtId),
  }),
);

export const caseParties = pgTable("case_parties", {
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  partyId: uuid("party_id")
    .notNull()
    .references(() => parties.id),
  role: text("role").notNull(),
});

export const caseJudges = pgTable("case_judges", {
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  judgeId: uuid("judge_id")
    .notNull()
    .references(() => judges.id),
  benchOrder: integer("bench_order"),
  authoring: integer("authoring"),
});

/* ------------------------------------------------------------------ */
/* Statutes / provisions                                               */
/* ------------------------------------------------------------------ */

export const statutes = pgTable("statutes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  shortTitle: text("short_title").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  sourceUrl: text("source_url").notNull(),
});

export const provisions = pgTable(
  "provisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    statuteId: uuid("statute_id")
      .notNull()
      .references(() => statutes.id, { onDelete: "cascade" }),
    provisionType: text("provision_type").notNull(),
    provisionNumber: text("provision_number").notNull(),
    heading: text("heading").notNull(),
    text: text("text"),
    sourceUrl: text("source_url").notNull(),
    provenanceId: uuid("provenance_id")
      .notNull()
      .references(() => provenanceRecords.id),
  },
  (t) => ({
    statuteProvisionIdx: uniqueIndex("provisions_statute_number_idx").on(
      t.statuteId,
      t.provisionNumber,
    ),
  }),
);

export const caseProvisions = pgTable("case_provisions", {
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  provisionId: uuid("provision_id")
    .notNull()
    .references(() => provisions.id),
  relationType: caseProvisionRelationEnum("relation_type").notNull(),
  sourceParagraphId: uuid("source_paragraph_id"),
  provenanceId: uuid("provenance_id")
    .notNull()
    .references(() => provenanceRecords.id),
});

/* ------------------------------------------------------------------ */
/* Judgments + paragraphs                                              */
/* ------------------------------------------------------------------ */

export const judgments = pgTable("judgments", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  documentId: uuid("document_id"),
  language: text("language").notNull().default("en"),
  fullText: text("full_text").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceAuthority: text("source_authority").notNull(),
  provenanceId: uuid("provenance_id")
    .notNull()
    .references(() => provenanceRecords.id),
});

export const judgmentParagraphs = pgTable(
  "judgment_paragraphs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    judgmentId: uuid("judgment_id")
      .notNull()
      .references(() => judgments.id, { onDelete: "cascade" }),
    paragraphNumber: text("paragraph_number").notNull(),
    text: text("text").notNull(),
    textHash: text("text_hash").notNull(),
    isRatio: integer("is_ratio").notNull().default(0),
    embedding: vector("embedding"),
  },
  (t) => ({
    judgmentIdx: index("judgment_paragraphs_judgment_idx").on(t.judgmentId),
    hashIdx: index("judgment_paragraphs_hash_idx").on(t.textHash),
    // IVFFlat index for pgvector cosine similarity retrieval.
    embeddingIdx: index("judgment_paragraphs_embedding_idx").using(
      "ivfflat",
      sql`${t.embedding} vector_cosine_ops`,
    ),
  }),
);

/* ------------------------------------------------------------------ */
/* Relationships                                                       */
/* ------------------------------------------------------------------ */

export const caseRelationships = pgTable(
  "case_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceCaseId: uuid("source_case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    targetCaseId: uuid("target_case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    relationshipType: relationshipTypeEnum("relationship_type").notNull(),
    sourceParagraphId: uuid("source_paragraph_id"),
    confidence: numeric("confidence", { precision: 4, scale: 3 }),
    evidence: jsonb("evidence").$type<unknown[]>().notNull().default([]),
    // Key rule (DATABASE_SCHEMA.md): no asserting edge without provenance.
    provenanceId: uuid("provenance_id")
      .notNull()
      .references(() => provenanceRecords.id),
  },
  (t) => ({
    sourceIdx: index("case_relationships_source_idx").on(t.sourceCaseId),
    targetIdx: index("case_relationships_target_idx").on(t.targetCaseId),
  }),
);

/* ------------------------------------------------------------------ */
/* Documents + verification                                            */
/* ------------------------------------------------------------------ */

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id"),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    objectKey: text("object_key").notNull(),
    sha256: text("sha256").notNull(),
    extractionStatus: extractionStatusEnum("extraction_status").notNull().default("PENDING"),
    pageCount: integer("page_count"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ shaIdx: index("documents_sha_idx").on(t.sha256) }),
);

export const extractedCitations = pgTable(
  "extracted_citations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    rawText: text("raw_text").notNull(),
    normalizedCitation: text("normalized_citation").notNull(),
    pageNumber: integer("page_number"),
    charStart: integer("char_start"),
    charEnd: integer("char_end"),
    claimedCaseTitle: text("claimed_case_title"),
    claimedYear: integer("claimed_year"),
    claimedReporter: text("claimed_reporter"),
    claimedNeutralCitation: text("claimed_neutral_citation"),
    claimedCourt: text("claimed_court"),
    claimedParagraph: text("claimed_paragraph"),
    claimedQuotation: text("claimed_quotation"),
    claimedProposition: text("claimed_proposition"),
  },
  (t) => ({ documentIdx: index("extracted_citations_document_idx").on(t.documentId) }),
);

export const verificationResults = pgTable(
  "verification_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    extractedCitationId: uuid("extracted_citation_id")
      .notNull()
      .references(() => extractedCitations.id, { onDelete: "cascade" }),
    matchedCaseId: uuid("matched_case_id").references(() => cases.id),
    matchedParagraphId: uuid("matched_paragraph_id"),
    status: verificationStatusEnum("status").notNull(),
    score: numeric("score", { precision: 4, scale: 3 }).notNull(),
    checks: jsonb("checks").$type<unknown[]>().notNull().default([]),
    explanation: text("explanation").notNull(),
    evidence: jsonb("evidence").$type<unknown[]>().notNull().default([]),
    claimedVsActual: jsonb("claimed_vs_actual").$type<unknown[]>().notNull().default([]),
    modelVersion: text("model_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ citationIdx: index("verification_results_citation_idx").on(t.extractedCitationId) }),
);

/* ------------------------------------------------------------------ */
/* Investigations                                                      */
/* ------------------------------------------------------------------ */

export const investigations = pgTable("investigations", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const investigationNodes = pgTable(
  "investigation_nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    investigationId: uuid("investigation_id")
      .notNull()
      .references(() => investigations.id, { onDelete: "cascade" }),
    nodeType: text("node_type").notNull(),
    entityId: text("entity_id"),
    x: numeric("x").notNull(),
    y: numeric("y").notNull(),
    width: numeric("width"),
    height: numeric("height"),
    note: text("note"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => ({ investigationIdx: index("investigation_nodes_investigation_idx").on(t.investigationId) }),
);

export const investigationEdges = pgTable(
  "investigation_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    investigationId: uuid("investigation_id")
      .notNull()
      .references(() => investigations.id, { onDelete: "cascade" }),
    sourceNodeId: uuid("source_node_id")
      .notNull()
      .references(() => investigationNodes.id, { onDelete: "cascade" }),
    targetNodeId: uuid("target_node_id")
      .notNull()
      .references(() => investigationNodes.id, { onDelete: "cascade" }),
    relationshipType: text("relationship_type").notNull(),
    label: text("label"),
    evidence: jsonb("evidence").$type<unknown[]>().notNull().default([]),
  },
  (t) => ({ investigationIdx: index("investigation_edges_investigation_idx").on(t.investigationId) }),
);
