import { type NextRequest, NextResponse } from "next/server";

import { apiError, handle, LIMITS, rateLimit } from "@/lib/api";
import { ensureSession } from "@/server/auth/session";
import { analyzeDocument, getDocumentRecord } from "@/server/services/document-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const ownerId = await ensureSession();
    if (!rateLimit(`analyze:${ownerId}`, LIMITS.analyze.limit, LIMITS.analyze.windowMs)) {
      return apiError("RATE_LIMITED", "Too many analyses. Wait a moment and try again.");
    }

    const record = getDocumentRecord(id);
    if (!record) return apiError("NOT_FOUND", "Document not found.");
    if (record.document.ownerId && record.document.ownerId !== ownerId) {
      return apiError("FORBIDDEN", "This document belongs to another user.");
    }

    return NextResponse.json(await analyzeDocument(id));
  });
}
