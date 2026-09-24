import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Shared API conventions.
 *
 * The error shape is fixed by API_CONTRACTS.md:
 *   { "error": { "code", "message", "details" } }
 */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "UNSUPPORTED_TYPE"
  | "FILE_TOO_LARGE"
  | "CONTENT_MISMATCH"
  | "EMPTY_FILE"
  | "EMPTY_NOTE"
  | "UNKNOWN_ENTITY"
  | "INVALID_EDGE"
  | "PROVENANCE_ERROR"
  | "INTERNAL_ERROR";

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  UNSUPPORTED_TYPE: 415,
  FILE_TOO_LARGE: 413,
  CONTENT_MISMATCH: 400,
  EMPTY_FILE: 400,
  EMPTY_NOTE: 400,
  UNKNOWN_ENTITY: 404,
  INVALID_EDGE: 400,
  PROVENANCE_ERROR: 500,
  INTERNAL_ERROR: 500,
};

export function apiError(
  code: ApiErrorCode,
  message: string,
  details: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json({ error: { code, message, details } }, { status: STATUS[code] });
}

export function validationError(error: z.ZodError): NextResponse {
  return apiError("VALIDATION_ERROR", "The request did not match the expected shape.", {
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

/**
 * Wraps a handler so a thrown service error becomes the documented error
 * shape rather than a stack trace. Messages are taken from the error's own
 * text, which services write for users; internal details are never echoed.
 */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code && code in STATUS) {
      return apiError(code as ApiErrorCode, (error as Error).message);
    }
    if (error instanceof Error && error.name === "ProvenanceError") {
      // A record reached the API without provenance. That is a bug in the
      // corpus or a service, and must be loud rather than silently rendered.
      console.error("Provenance invariant violated:", error.message);
      return apiError(
        "PROVENANCE_ERROR",
        "A record could not be served because its provenance is missing.",
      );
    }
    console.error("Unhandled API error:", error instanceof Error ? error.message : error);
    return apiError("INTERNAL_ERROR", "Something went wrong handling that request.");
  }
}

/** Parses repeated query parameters into a string array. */
export function multi(params: URLSearchParams, key: string): string[] | undefined {
  const values = params.getAll(key).flatMap((value) => value.split(",")).filter(Boolean);
  return values.length > 0 ? values : undefined;
}

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/* ------------------------------------------------------------------ */

interface Bucket {
  count: number;
  resetAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __caselensRateLimit: Map<string, Bucket> | undefined;
}

/**
 * Fixed-window rate limiter for the upload, AI and search endpoints
 * (SECURITY_PRIVACY.md). In-process, which is correct for a single-instance
 * deployment; a multi-instance deployment moves the bucket store to Redis.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  if (!globalThis.__caselensRateLimit) globalThis.__caselensRateLimit = new Map();
  const buckets = globalThis.__caselensRateLimit;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export const LIMITS = {
  search: { limit: 120, windowMs: 60_000 },
  upload: { limit: 10, windowMs: 60_000 },
  analyze: { limit: 20, windowMs: 60_000 },
  ai: { limit: 20, windowMs: 60_000 },
} as const;
