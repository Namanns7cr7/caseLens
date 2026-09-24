import "server-only";

import { detectCitations } from "@/lib/legal/citation";
import { documentShaKey, getStore, toAnalysis, type DocumentRecord } from "@/server/db/store";
import { explainProposition, isModelConfigured } from "@/server/ai/gemini";
import {
  extractPdfText,
  extractPlainText,
  pageForOffset,
  type ExtractedText,
} from "@/server/services/pdf-extract";
import { getCase } from "@/server/repositories/case-repository";
import { getStorage, objectKeyFor, sha256 } from "@/server/services/storage";
import {
  toExtractedCitation,
  verifyCitation,
} from "@/server/services/verification-service";
import type { DocumentAnalysis, ExtractionStatus, StoredDocument } from "@/types/domain";

/**
 * Upload -> extraction -> citation detection -> verification.
 *
 * The staged pipeline mirrors the states API_CONTRACTS.md defines, so the
 * review UI can show real progress rather than a spinner: EXTRACTING,
 * CITATIONS_DETECTED, METADATA_CHECKED, PARAGRAPHS_CHECKED,
 * PROPOSITIONS_CHECKED, COMPLETE.
 */

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const ACCEPTED_MIME_TYPES = ["application/pdf", "text/plain", "text/markdown"] as const;

export class UploadError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "UploadError";
    this.code = code;
  }
}

/** PDFs begin with "%PDF-". Checked so the MIME type alone is not trusted. */
function looksLikePdf(data: Uint8Array): boolean {
  return (
    data.length > 5 &&
    data[0] === 0x25 &&
    data[1] === 0x50 &&
    data[2] === 0x44 &&
    data[3] === 0x46 &&
    data[4] === 0x2d
  );
}

export interface UploadInput {
  filename: string;
  mimeType: string;
  data: Uint8Array;
  ownerId?: string;
}

export interface UploadOutcome {
  document: StoredDocument;
  /** True when the SHA-256 matched a document already stored. */
  duplicate: boolean;
}

/** Strips any path component from a user-supplied filename. */
function safeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "document";
  return base.replace(/[^\w.\- ]+/g, "_").slice(0, 200) || "document";
}

export async function uploadDocument(input: UploadInput): Promise<UploadOutcome> {
  if (input.data.byteLength === 0) {
    throw new UploadError("EMPTY_FILE", "The uploaded file is empty.");
  }
  if (input.data.byteLength > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      "FILE_TOO_LARGE",
      `Files must be ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB or smaller.`,
    );
  }
  if (!ACCEPTED_MIME_TYPES.includes(input.mimeType as (typeof ACCEPTED_MIME_TYPES)[number])) {
    throw new UploadError(
      "UNSUPPORTED_TYPE",
      "Upload a PDF or a plain-text legal document.",
    );
  }
  if (input.mimeType === "application/pdf" && !looksLikePdf(input.data)) {
    throw new UploadError(
      "CONTENT_MISMATCH",
      "The file is declared as a PDF but its contents are not a PDF.",
    );
  }

  const hash = sha256(input.data);
  const store = getStore();

  // Duplicate detection (SECURITY_PRIVACY.md): re-analysing identical bytes
  // wastes work and would create a second review thread for one document.
  // Scoped to the uploader — see the note on `documentsBySha`.
  const shaKey = documentShaKey(input.ownerId, hash);
  const existingId = store.documentsBySha.get(shaKey);
  if (existingId) {
    const existing = store.documents.get(existingId);
    if (existing) return { document: existing.document, duplicate: true };
  }

  const objectKey = objectKeyFor(hash, input.mimeType);
  await getStorage().put(objectKey, input.data);

  // Ids derive from content and owner, so two users uploading identical
  // bytes get distinct records rather than colliding on one id.
  const id = `doc-${sha256(new TextEncoder().encode(shaKey)).slice(0, 12)}`;
  const document: StoredDocument = {
    id,
    ...(input.ownerId ? { ownerId: input.ownerId } : {}),
    filename: safeFilename(input.filename),
    mimeType: input.mimeType,
    objectKey,
    sha256: hash,
    extractionStatus: "PENDING",
    createdAt: new Date().toISOString(),
    metadata: { sizeBytes: input.data.byteLength },
  };

  store.documents.set(id, {
    document,
    text: "",
    citations: [],
    results: [],
    pageOffsets: [0],
  });
  store.documentsBySha.set(shaKey, id);

  return { document, duplicate: false };
}

export function getDocumentRecord(id: string): DocumentRecord | undefined {
  return getStore().documents.get(id);
}

export function getAnalysis(id: string): DocumentAnalysis | undefined {
  const record = getStore().documents.get(id);
  return record ? toAnalysis(record) : undefined;
}

function setStage(record: DocumentRecord, stage: ExtractionStatus): void {
  record.document = { ...record.document, extractionStatus: stage };
}

/**
 * Runs the analysis pipeline to completion.
 *
 * The deterministic engine decides every status. The model, when configured,
 * is consulted once per resolved citation and only to refine the proposition
 * step — see `server/ai/gemini.ts` and the ordering note in
 * `server/services/verification-service.ts`.
 */
export async function analyzeDocument(id: string): Promise<DocumentAnalysis> {
  const record = getStore().documents.get(id);
  if (!record) throw new UploadError("NOT_FOUND", "Document not found.");

  try {
    /* Stage 1 — extract text. */
    setStage(record, "EXTRACTING");
    const bytes = await getStorage().get(record.document.objectKey);
    let extracted: ExtractedText;
    if (record.document.mimeType === "application/pdf") {
      extracted = await extractPdfText(bytes);
    } else {
      extracted = extractPlainText(new TextDecoder().decode(bytes));
    }
    record.text = extracted.text;
    record.pageOffsets = extracted.pageOffsets;
    record.document = { ...record.document, pageCount: extracted.pageCount };

    /* Stage 2 — detect citations. */
    setStage(record, "CITATIONS_DETECTED");
    record.citations = detectCitations(extracted.text).map((detected, index) =>
      toExtractedCitation(
        id,
        detected,
        index,
        pageForOffset(extracted.pageOffsets, detected.charStart),
      ),
    );

    /* Stages 3-4 — deterministic metadata and paragraph checks. */
    setStage(record, "METADATA_CHECKED");
    setStage(record, "PARAGRAPHS_CHECKED");
    record.results = record.citations.map((citation) => verifyCitation(citation));

    /* Stage 5 — proposition support. Model-assisted only where a record was
     * already resolved deterministically. */
    setStage(record, "PROPOSITIONS_CHECKED");
    if (isModelConfigured()) {
      record.results = await Promise.all(
        record.citations.map(async (citation, index) => {
          const deterministic = record.results[index];
          if (!deterministic?.matchedCaseId) return deterministic!;
          const matched = getCase(deterministic.matchedCaseId);
          if (!matched || !citation.claimedProposition) return deterministic;

          const aiOverride = await explainProposition(citation, matched);
          return aiOverride ? verifyCitation(citation, { aiOverride }) : deterministic;
        }),
      );
    }

    setStage(record, "COMPLETE");
  } catch (error) {
    setStage(record, "FAILED");
    record.document = {
      ...record.document,
      metadata: {
        ...record.document.metadata,
        error: error instanceof Error ? error.message : "Analysis failed",
      },
    };
    throw error;
  }

  return toAnalysis(record);
}

/** Loads the curated demo brief as an uploaded document, for the demo path. */
export async function ingestDemoBrief(): Promise<DocumentAnalysis> {
  const { readFile } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  const { DEMO_BRIEF_FILENAME } = await import("@/server/db/seed/demo-brief");

  const path = resolve(process.cwd(), "public/demo", DEMO_BRIEF_FILENAME);
  const data = new Uint8Array(await readFile(path));
  const { document } = await uploadDocument({
    filename: DEMO_BRIEF_FILENAME,
    mimeType: "application/pdf",
    data,
    ownerId: "demo-user",
  });

  const existing = getAnalysis(document.id);
  if (existing?.stage === "COMPLETE") return existing;
  return analyzeDocument(document.id);
}

export function listDocuments(): StoredDocument[] {
  return [...getStore().documents.values()]
    .map((record) => record.document)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
