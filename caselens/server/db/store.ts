import "server-only";

import type {
  DocumentAnalysis,
  ExtractedCitation,
  Investigation,
  StoredDocument,
  VerificationResult,
} from "@/types/domain";

/**
 * Mutable application state: investigations, uploaded documents and their
 * verification results.
 *
 * The legal corpus is immutable and comes from the seed fixtures. Only the
 * records below change at runtime, so only they need a writable store.
 *
 * This is the in-process implementation, held on `globalThis` so it survives
 * Next.js hot reloads in development. The Postgres tables for these records
 * already exist in `./schema.ts`; swapping this module for a Drizzle-backed
 * implementation is the single change needed to persist across restarts.
 */

export interface DocumentRecord {
  document: StoredDocument;
  text: string;
  citations: ExtractedCitation[];
  results: VerificationResult[];
  /** Page boundaries as character offsets into `text`, for span highlighting. */
  pageOffsets: number[];
}

interface Store {
  investigations: Map<string, Investigation>;
  documents: Map<string, DocumentRecord>;
  /**
   * "<ownerId>:<sha256>" -> document id, for duplicate detection
   * (SECURITY_PRIVACY.md).
   *
   * The key is scoped to the owner deliberately. A global sha-to-document
   * index would hand a second user the first user's document record for
   * identical bytes — which they then could not read, because the
   * authorization check would correctly reject them.
   */
  documentsBySha: Map<string, string>;
}

/** Duplicate-detection key. Anonymous uploads dedupe within the anonymous scope. */
export function documentShaKey(ownerId: string | undefined, sha256: string): string {
  return `${ownerId ?? "anonymous"}:${sha256}`;
}

declare global {
  // eslint-disable-next-line no-var
  var __caselensStore: Store | undefined;
}

function createStore(): Store {
  return {
    investigations: new Map(),
    documents: new Map(),
    documentsBySha: new Map(),
  };
}

export function getStore(): Store {
  if (!globalThis.__caselensStore) {
    globalThis.__caselensStore = createStore();
  }
  return globalThis.__caselensStore;
}

/** Test helper: drop all mutable state. */
export function resetStore(): void {
  globalThis.__caselensStore = createStore();
}

export function toAnalysis(record: DocumentRecord): DocumentAnalysis {
  const byStatus: DocumentAnalysis["summary"]["byStatus"] = {
    VERIFIED: 0,
    METADATA_MISMATCH: 0,
    PARAGRAPH_MISMATCH: 0,
    WEAK_PROPOSITION_SUPPORT: 0,
    NO_AUTHORITATIVE_MATCH: 0,
    NEEDS_REVIEW: 0,
  };
  for (const result of record.results) byStatus[result.status] += 1;

  return {
    document: record.document,
    stage: record.document.extractionStatus,
    citations: record.citations,
    results: record.results,
    text: record.text,
    summary: {
      total: record.citations.length,
      verified: byStatus.VERIFIED,
      issues: record.results.length - byStatus.VERIFIED,
      byStatus,
    },
  };
}
