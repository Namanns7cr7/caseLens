import { NextResponse } from "next/server";

import { apiError, handle } from "@/lib/api";
import { currentOwnerId } from "@/server/auth/session";
import { getAnalysis, getDocumentRecord } from "@/server/services/document-service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const ownerId = await currentOwnerId();
    const record = getDocumentRecord(id);
    if (!record) return apiError("NOT_FOUND", "Document not found.");
    if (record.document.ownerId && record.document.ownerId !== ownerId) {
      return apiError("FORBIDDEN", "This document belongs to another user.");
    }
    return NextResponse.json(getAnalysis(id));
  });
}
