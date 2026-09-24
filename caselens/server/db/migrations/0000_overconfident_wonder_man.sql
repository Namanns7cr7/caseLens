-- CaseLens schema.
--
-- The trigram index on cases.normalized_title and the IVFFlat index on
-- judgment_paragraphs.embedding require these extensions, so they are
-- created first.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";
--> statement-breakpoint
CREATE TYPE "public"."authority_level" AS ENUM('PRIMARY', 'SECONDARY', 'USER', 'DEMO');--> statement-breakpoint
CREATE TYPE "public"."case_provision_relation" AS ENUM('INTERPRETS', 'APPLIES', 'MENTIONS', 'CHALLENGES');--> statement-breakpoint
CREATE TYPE "public"."court_level" AS ENUM('SUPREME_COURT', 'HIGH_COURT', 'TRIBUNAL', 'DISTRICT_COURT');--> statement-breakpoint
CREATE TYPE "public"."doctrinal_status" AS ENUM('BINDING_LANDMARK', 'AFFIRMED_FOLLOWED', 'DISTINGUISHED', 'OVERRULED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."extraction_status" AS ENUM('PENDING', 'EXTRACTING', 'CITATIONS_DETECTED', 'METADATA_CHECKED', 'PARAGRAPHS_CHECKED', 'PROPOSITIONS_CHECKED', 'COMPLETE', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."relationship_type" AS ENUM('CITES', 'CITED_BY', 'APPEAL_OF', 'AFFIRMS', 'REVERSES', 'REMANDS', 'FOLLOWS', 'DISTINGUISHES', 'OVERRULES', 'RELATED');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('VERIFIED', 'METADATA_MISMATCH', 'PARAGRAPH_MISMATCH', 'WEAK_PROPOSITION_SUPPORT', 'NO_AUTHORITATIVE_MATCH', 'NEEDS_REVIEW');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_judges" (
	"case_id" uuid NOT NULL,
	"judge_id" uuid NOT NULL,
	"bench_order" integer,
	"authoring" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_parties" (
	"case_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_provisions" (
	"case_id" uuid NOT NULL,
	"provision_id" uuid NOT NULL,
	"relation_type" "case_provision_relation" NOT NULL,
	"source_paragraph_id" uuid,
	"provenance_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_case_id" uuid NOT NULL,
	"target_case_id" uuid NOT NULL,
	"relationship_type" "relationship_type" NOT NULL,
	"source_paragraph_id" uuid,
	"confidence" numeric(4, 3),
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"provenance_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"normalized_title" text NOT NULL,
	"neutral_citation" text,
	"reporter_citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"court_id" uuid NOT NULL,
	"decision_date" timestamp,
	"case_number" text,
	"status" "doctrinal_status",
	"bench_strength" integer,
	"summary" text,
	"source_authority" text NOT NULL,
	"source_url" text NOT NULL,
	"source_document_id" uuid,
	"provenance_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"level" "court_level" NOT NULL,
	"jurisdiction" text NOT NULL,
	"state" text,
	"source_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"object_key" text NOT NULL,
	"sha256" text NOT NULL,
	"extraction_status" "extraction_status" DEFAULT 'PENDING' NOT NULL,
	"page_count" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extracted_citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"raw_text" text NOT NULL,
	"normalized_citation" text NOT NULL,
	"page_number" integer,
	"char_start" integer,
	"char_end" integer,
	"claimed_case_title" text,
	"claimed_year" integer,
	"claimed_reporter" text,
	"claimed_neutral_citation" text,
	"claimed_court" text,
	"claimed_paragraph" text,
	"claimed_quotation" text,
	"claimed_proposition" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "investigation_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investigation_id" uuid NOT NULL,
	"source_node_id" uuid NOT NULL,
	"target_node_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"label" text,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "investigation_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investigation_id" uuid NOT NULL,
	"node_type" text NOT NULL,
	"entity_id" text,
	"x" numeric NOT NULL,
	"y" numeric NOT NULL,
	"width" numeric,
	"height" numeric,
	"note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "investigations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "judges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "judgment_paragraphs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"judgment_id" uuid NOT NULL,
	"paragraph_number" text NOT NULL,
	"text" text NOT NULL,
	"text_hash" text NOT NULL,
	"is_ratio" integer DEFAULT 0 NOT NULL,
	"embedding" vector(768)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "judgments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"document_id" uuid,
	"language" text DEFAULT 'en' NOT NULL,
	"full_text" text NOT NULL,
	"source_url" text NOT NULL,
	"source_authority" text NOT NULL,
	"provenance_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"entity_type" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "provenance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content_hash" text,
	"authority_level" "authority_level" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "provisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statute_id" uuid NOT NULL,
	"provision_type" text NOT NULL,
	"provision_number" text NOT NULL,
	"heading" text NOT NULL,
	"text" text,
	"source_url" text NOT NULL,
	"provenance_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "statutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"short_title" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"source_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extracted_citation_id" uuid NOT NULL,
	"matched_case_id" uuid,
	"matched_paragraph_id" uuid,
	"status" "verification_status" NOT NULL,
	"score" numeric(4, 3) NOT NULL,
	"checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"explanation" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"claimed_vs_actual" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_judges" ADD CONSTRAINT "case_judges_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_judges" ADD CONSTRAINT "case_judges_judge_id_judges_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."judges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_provisions" ADD CONSTRAINT "case_provisions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_provisions" ADD CONSTRAINT "case_provisions_provision_id_provisions_id_fk" FOREIGN KEY ("provision_id") REFERENCES "public"."provisions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_provisions" ADD CONSTRAINT "case_provisions_provenance_id_provenance_records_id_fk" FOREIGN KEY ("provenance_id") REFERENCES "public"."provenance_records"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_relationships" ADD CONSTRAINT "case_relationships_source_case_id_cases_id_fk" FOREIGN KEY ("source_case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_relationships" ADD CONSTRAINT "case_relationships_target_case_id_cases_id_fk" FOREIGN KEY ("target_case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_relationships" ADD CONSTRAINT "case_relationships_provenance_id_provenance_records_id_fk" FOREIGN KEY ("provenance_id") REFERENCES "public"."provenance_records"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases" ADD CONSTRAINT "cases_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases" ADD CONSTRAINT "cases_provenance_id_provenance_records_id_fk" FOREIGN KEY ("provenance_id") REFERENCES "public"."provenance_records"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracted_citations" ADD CONSTRAINT "extracted_citations_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investigation_edges" ADD CONSTRAINT "investigation_edges_investigation_id_investigations_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investigation_edges" ADD CONSTRAINT "investigation_edges_source_node_id_investigation_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."investigation_nodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investigation_edges" ADD CONSTRAINT "investigation_edges_target_node_id_investigation_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."investigation_nodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investigation_nodes" ADD CONSTRAINT "investigation_nodes_investigation_id_investigations_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "judgment_paragraphs" ADD CONSTRAINT "judgment_paragraphs_judgment_id_judgments_id_fk" FOREIGN KEY ("judgment_id") REFERENCES "public"."judgments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "judgments" ADD CONSTRAINT "judgments_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "judgments" ADD CONSTRAINT "judgments_provenance_id_provenance_records_id_fk" FOREIGN KEY ("provenance_id") REFERENCES "public"."provenance_records"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "provisions" ADD CONSTRAINT "provisions_statute_id_statutes_id_fk" FOREIGN KEY ("statute_id") REFERENCES "public"."statutes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "provisions" ADD CONSTRAINT "provisions_provenance_id_provenance_records_id_fk" FOREIGN KEY ("provenance_id") REFERENCES "public"."provenance_records"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "verification_results" ADD CONSTRAINT "verification_results_extracted_citation_id_extracted_citations_id_fk" FOREIGN KEY ("extracted_citation_id") REFERENCES "public"."extracted_citations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "verification_results" ADD CONSTRAINT "verification_results_matched_case_id_cases_id_fk" FOREIGN KEY ("matched_case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_relationships_source_idx" ON "case_relationships" USING btree ("source_case_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_relationships_target_idx" ON "case_relationships" USING btree ("target_case_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_title_trgm_idx" ON "cases" USING gin ("normalized_title" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cases_slug_idx" ON "cases" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_neutral_citation_idx" ON "cases" USING btree ("neutral_citation");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_decision_date_idx" ON "cases" USING btree ("decision_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_court_idx" ON "cases" USING btree ("court_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_sha_idx" ON "documents" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extracted_citations_document_idx" ON "extracted_citations" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "investigation_edges_investigation_idx" ON "investigation_edges" USING btree ("investigation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "investigation_nodes_investigation_idx" ON "investigation_nodes" USING btree ("investigation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "judges_normalized_idx" ON "judges" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "judgment_paragraphs_judgment_idx" ON "judgment_paragraphs" USING btree ("judgment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "judgment_paragraphs_hash_idx" ON "judgment_paragraphs" USING btree ("text_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "judgment_paragraphs_embedding_idx" ON "judgment_paragraphs" USING ivfflat ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parties_normalized_idx" ON "parties" USING btree ("normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "provisions_statute_number_idx" ON "provisions" USING btree ("statute_id","provision_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_results_citation_idx" ON "verification_results" USING btree ("extracted_citation_id");