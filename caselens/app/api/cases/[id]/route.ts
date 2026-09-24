import { NextResponse } from "next/server";

import { apiError, handle } from "@/lib/api";
import { citingCases, getDossier, relationshipsFor } from "@/server/repositories/case-repository";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const dossier = getDossier(id);
    if (!dossier) return apiError("NOT_FOUND", "No indexed authority carries that identifier.");

    return NextResponse.json({
      ...dossier,
      relationships: relationshipsFor(id),
      citedBy: citingCases(id).map((entry) => ({
        case: entry.case,
        relationship: entry.relationship,
      })),
    });
  });
}
