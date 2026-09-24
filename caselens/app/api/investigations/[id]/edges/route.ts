import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handle, validationError } from "@/lib/api";
import { ensureSession } from "@/server/auth/session";
import { createEdge, removeEdge } from "@/server/services/investigation-service";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  sourceNodeId: z.string().min(1).max(80),
  targetNodeId: z.string().min(1).max(80),
  relationshipType: z
    .enum([
      "CITES",
      "CITED_BY",
      "APPEAL_OF",
      "AFFIRMS",
      "REVERSES",
      "REMANDS",
      "FOLLOWS",
      "DISTINGUISHES",
      "OVERRULES",
      "RELATED",
      "USER_LINK",
    ])
    .default("USER_LINK"),
  label: z.string().trim().max(200).optional(),
});

const deleteSchema = z.object({ edgeId: z.string().min(1).max(80) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const ownerId = await ensureSession();
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    const edge = createEdge({ investigationId: id, ownerId, ...parsed.data });
    return NextResponse.json({ edge }, { status: 201 });
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const ownerId = await ensureSession();
    const parsed = deleteSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    removeEdge({ investigationId: id, ownerId, edgeId: parsed.data.edgeId });
    return NextResponse.json({ ok: true });
  });
}
