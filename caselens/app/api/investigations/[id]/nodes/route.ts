import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handle, validationError } from "@/lib/api";
import { ensureSession } from "@/server/auth/session";
import { pinNode } from "@/server/services/investigation-service";

export const dynamic = "force-dynamic";

const schema = z.object({
  nodeType: z.enum(["CASE", "PROVISION", "EVIDENCE", "NOTE"]),
  entityId: z.string().max(200).optional(),
  x: z.number().finite().min(-20000).max(20000),
  y: z.number().finite().min(-20000).max(20000),
  note: z.string().max(4000).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const ownerId = await ensureSession();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    const node = pinNode({ investigationId: id, ownerId, ...parsed.data });
    return NextResponse.json({ node }, { status: 201 });
  });
}
