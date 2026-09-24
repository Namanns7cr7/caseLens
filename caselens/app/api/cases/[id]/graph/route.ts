import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handle, multi, validationError } from "@/lib/api";
import { getCase } from "@/server/repositories/case-repository";
import { buildGraph } from "@/server/services/graph-service";
import type { RelationshipType } from "@/types/domain";

export const dynamic = "force-dynamic";

const schema = z.object({
  depth: z.coerce.number().int().min(1).max(3).default(2),
  type: z.array(z.string().max(30)).optional(),
  provisions: z
    .union([z.literal("true"), z.literal("false")])
    .default("true")
    .transform((value) => value === "true"),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    if (!getCase(id)) return apiError("NOT_FOUND", "No indexed authority carries that identifier.");

    const search = request.nextUrl.searchParams;
    const parsed = schema.safeParse({
      depth: search.get("depth") ?? 2,
      type: multi(search, "type"),
      provisions: search.get("provisions") ?? "true",
    });
    if (!parsed.success) return validationError(parsed.error);

    return NextResponse.json(
      buildGraph({
        caseId: id,
        depth: parsed.data.depth,
        ...(parsed.data.type ? { types: parsed.data.type as RelationshipType[] } : {}),
        includeProvisions: parsed.data.provisions,
      }),
    );
  });
}
