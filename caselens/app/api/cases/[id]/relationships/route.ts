import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handle, multi, validationError } from "@/lib/api";
import { getCase, relationshipsFor } from "@/server/repositories/case-repository";
import type { RelationshipType } from "@/types/domain";

export const dynamic = "force-dynamic";

const RELATIONSHIP_TYPES = [
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
] as const;

const schema = z.object({
  depth: z.coerce.number().int().min(1).max(3).default(1),
  type: z.array(z.enum(RELATIONSHIP_TYPES)).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    if (!getCase(id)) return apiError("NOT_FOUND", "No indexed authority carries that identifier.");

    const parsed = schema.safeParse({
      depth: request.nextUrl.searchParams.get("depth") ?? 1,
      type: multi(request.nextUrl.searchParams, "type"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const types = parsed.data.type as RelationshipType[] | undefined;
    const relationships = relationshipsFor(id).filter(
      (relationship) => !types?.length || types.includes(relationship.type),
    );
    return NextResponse.json({ relationships, depth: parsed.data.depth });
  });
}
