import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handle, validationError } from "@/lib/api";
import { tokenContainment } from "@/lib/legal/similarity";
import { getCase, listParagraphs } from "@/server/repositories/case-repository";

export const dynamic = "force-dynamic";

const schema = z.object({ q: z.string().max(400).optional() });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    if (!getCase(id)) return apiError("NOT_FOUND", "No indexed authority carries that identifier.");

    const parsed = schema.safeParse({ q: request.nextUrl.searchParams.get("q") ?? undefined });
    if (!parsed.success) return validationError(parsed.error);

    const query = parsed.data.q?.trim();
    const paragraphs = listParagraphs(id);
    if (!query) return NextResponse.json({ paragraphs });

    // Rank by how much of the query is present in each paragraph, preserving
    // the original text rather than returning a snippet.
    const ranked = paragraphs
      .map((paragraph) => ({ paragraph, score: tokenContainment(query, paragraph.text) }))
      .filter((entry) => entry.score > 0.15)
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({ paragraphs: ranked.map((entry) => entry.paragraph) });
  });
}
