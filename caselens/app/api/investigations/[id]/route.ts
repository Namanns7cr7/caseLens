import { NextResponse } from "next/server";

import { apiError, handle } from "@/lib/api";
import { currentOwnerId } from "@/server/auth/session";
import { getInvestigation, summarize } from "@/server/services/investigation-service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const ownerId = await currentOwnerId();
    const investigation = getInvestigation(id);
    if (!investigation) return apiError("NOT_FOUND", "Investigation not found.");
    if (investigation.ownerId !== ownerId) {
      return apiError("FORBIDDEN", "This investigation belongs to another user.");
    }
    return NextResponse.json({ investigation, summary: summarize(investigation) });
  });
}
