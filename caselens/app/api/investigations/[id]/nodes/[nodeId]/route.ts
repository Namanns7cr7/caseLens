import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handle, validationError } from "@/lib/api";
import { ensureSession } from "@/server/auth/session";
import { moveNode, removeNode } from "@/server/services/investigation-service";

export const dynamic = "force-dynamic";

const schema = z.object({
  x: z.number().finite().min(-20000).max(20000),
  y: z.number().finite().min(-20000).max(20000),
  note: z.string().max(4000).optional(),
});

type Params = { params: Promise<{ id: string; nodeId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id, nodeId } = await params;
    const ownerId = await ensureSession();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    const node = moveNode({ investigationId: id, ownerId, nodeId, ...parsed.data });
    return NextResponse.json({ node });
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id, nodeId } = await params;
    const ownerId = await ensureSession();
    removeNode({ investigationId: id, ownerId, nodeId });
    return NextResponse.json({ ok: true });
  });
}
