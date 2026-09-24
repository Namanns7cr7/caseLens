import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handle, LIMITS, rateLimit, validationError } from "@/lib/api";
import { ensureSession } from "@/server/auth/session";
import { synthesizeResearch } from "@/server/services/research-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  question: z.string().trim().min(5).max(800),
  caseIds: z.array(z.string().max(200)).max(20).optional(),
  investigationId: z.string().max(80).optional(),
});

export async function POST(request: NextRequest) {
  return handle(async () => {
    const ownerId = await ensureSession();
    if (!rateLimit(`ai:${ownerId}`, LIMITS.ai.limit, LIMITS.ai.windowMs)) {
      return apiError("RATE_LIMITED", "Too many requests. Wait a moment and try again.");
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    return NextResponse.json(await synthesizeResearch(parsed.data));
  });
}
