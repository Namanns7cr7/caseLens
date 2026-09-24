import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handle, validationError } from "@/lib/api";
import { currentOwnerId } from "@/server/auth/session";
import { getInvestigation } from "@/server/services/investigation-service";
import { buildInvestigationReport } from "@/server/services/report-service";

export const dynamic = "force-dynamic";

const schema = z.object({ investigationId: z.string().min(1).max(80) });

export async function POST(request: NextRequest) {
  return handle(async () => {
    const ownerId = await currentOwnerId();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    const investigation = getInvestigation(parsed.data.investigationId);
    if (!investigation) return apiError("NOT_FOUND", "Investigation not found.");
    if (investigation.ownerId !== ownerId) {
      return apiError("FORBIDDEN", "This investigation belongs to another user.");
    }

    const report = buildInvestigationReport(parsed.data.investigationId);
    if (!report) return apiError("NOT_FOUND", "Investigation not found.");
    return NextResponse.json({ report });
  });
}
