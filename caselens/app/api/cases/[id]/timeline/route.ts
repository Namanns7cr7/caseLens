import { NextResponse } from "next/server";

import { apiError, handle } from "@/lib/api";
import { buildTimeline, getCase } from "@/server/repositories/case-repository";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    if (!getCase(id)) return apiError("NOT_FOUND", "No indexed authority carries that identifier.");
    return NextResponse.json({ events: buildTimeline(id) });
  });
}
