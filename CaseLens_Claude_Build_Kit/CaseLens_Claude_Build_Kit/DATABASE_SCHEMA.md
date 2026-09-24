# Database Schema

Use PostgreSQL + Drizzle ORM + pgvector.

## Core tables

### courts
- id UUID PK
- name
- short_name
- level
- jurisdiction
- state
- source_key

### judges
- id UUID PK
- name
- normalized_name
- metadata JSONB

### parties
- id UUID PK
- name
- normalized_name
- entity_type nullable

### cases
- id UUID PK
- title
- normalized_title
- neutral_citation nullable
- reporter_citations JSONB
- court_id FK
- decision_date
- case_number nullable
- status nullable
- summary nullable
- source_authority
- source_url
- source_document_id nullable
- created_at
- updated_at

Indexes: normalized_title trigram; neutral_citation; decision_date; court_id.

### case_parties
- case_id
- party_id
- role

### case_judges
- case_id
- judge_id
- bench_order nullable

### statutes
- id
- title
- short_title
- jurisdiction
- source_url

### provisions
- id
- statute_id
- provision_type
- provision_number
- heading
- text nullable
- source_url

### judgments
- id
- case_id
- document_id
- language
- full_text
- source_url
- source_authority

### judgment_paragraphs
- id
- judgment_id
- paragraph_number
- text
- text_hash
- embedding vector

### case_relationships
- id
- source_case_id
- target_case_id
- relationship_type enum:
  CITES | CITED_BY | APPEAL_OF | AFFIRMS | REVERSES | REMANDS | FOLLOWS | DISTINGUISHES | OVERRULES | RELATED
- source_paragraph_id nullable
- confidence numeric
- evidence JSONB
- provenance_id

### case_provisions
- case_id
- provision_id
- relation_type enum: INTERPRETS | APPLIES | MENTIONS | CHALLENGES
- source_paragraph_id nullable

### documents
- id
- owner_id nullable
- filename
- mime_type
- object_key
- sha256
- extraction_status
- metadata JSONB

### extracted_citations
- id
- document_id
- raw_text
- normalized_citation
- page_number nullable
- char_start nullable
- char_end nullable
- claimed_case_title nullable
- claimed_year nullable
- claimed_reporter nullable

### verification_results
- id
- extracted_citation_id
- matched_case_id nullable
- status enum:
  VERIFIED | METADATA_MISMATCH | PARAGRAPH_MISMATCH | WEAK_PROPOSITION_SUPPORT | NO_AUTHORITATIVE_MATCH | NEEDS_REVIEW
- score numeric
- checks JSONB
- explanation
- evidence JSONB
- model_version nullable
- created_at

### investigations
- id
- owner_id
- title
- description nullable
- created_at
- updated_at

### investigation_nodes
- id
- investigation_id
- node_type
- entity_id nullable
- x
- y
- width nullable
- height nullable
- note nullable
- metadata JSONB

### investigation_edges
- id
- investigation_id
- source_node_id
- target_node_id
- relationship_type
- label nullable
- evidence JSONB

### provenance_records
- id
- source_name
- source_url
- retrieved_at
- content_hash nullable
- authority_level
- metadata JSONB

## Key rule

No graph edge that makes a legal assertion should exist without `provenance_id` or explicit user-created-note status.
