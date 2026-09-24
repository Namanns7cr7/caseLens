import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handle, validationError } from "@/lib/api";
import { currentOwnerId } from "@/server/auth/session";
import { getDocumentRecord } from "@/server/services/document-service";
import { buildIntegrityReport } from "@/server/services/report-service";

export const dynamic = "force-dynamic";

const schema = z.object({ documentId: z.string().min(1).max(80) });

export async function POST(request: NextRequest) {
  return handle(async () => {
    const ownerId = await currentOwnerId();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    const record = getDocumentRecord(parsed.data.documentId);
    if (!record) return apiError("NOT_FOUND", "Document not found.");
    if (record.document.ownerId && record.document.ownerId !== ownerId) {
      return apiError("FORBIDDEN", "This document belongs to another user.");
    }

    const report = buildIntegrityReport(parsed.data.documentId);
    if (!report) return apiError("NOT_FOUND", "Document not found.");
    return NextResponse.json({ report });
  });
}
