import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handle, validationError } from "@/lib/api";
import { ensureSession, currentOwnerId } from "@/server/auth/session";
import { createInvestigation, listInvestigations } from "@/server/services/investigation-service";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
});

export async function GET() {
  return handle(async () => {
    const ownerId = await currentOwnerId();
    return NextResponse.json({ investigations: listInvestigations(ownerId) });
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const ownerId = await ensureSession();
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    const investigation = createInvestigation({ ...parsed.data, ownerId });
    return NextResponse.json({ investigation }, { status: 201 });
  });
}
