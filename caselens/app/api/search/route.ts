import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, handle, LIMITS, multi, rateLimit, validationError } from "@/lib/api";
import { search } from "@/server/services/search-service";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().max(400).default(""),
  court: z.array(z.string().max(80)).max(20).optional(),
  year: z.array(z.string().regex(/^\d{4}$/)).max(40).optional(),
  act: z.array(z.string().max(80)).max(20).optional(),
  section: z.array(z.string().max(80)).max(40).optional(),
  judge: z.array(z.string().max(80)).max(20).optional(),
  benchStrength: z.array(z.string().max(4)).max(10).optional(),
  doctrinalStatus: z.array(z.string().max(40)).max(10).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(request: NextRequest) {
  return handle(async () => {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (!rateLimit(`search:${ip}`, LIMITS.search.limit, LIMITS.search.windowMs)) {
      return apiError("RATE_LIMITED", "Too many searches. Wait a moment and try again.");
    }

    const params = request.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      q: params.get("q") ?? "",
      court: multi(params, "court"),
      year: multi(params, "year"),
      act: multi(params, "act"),
      section: multi(params, "section"),
      judge: multi(params, "judge"),
      benchStrength: multi(params, "benchStrength"),
      doctrinalStatus: multi(params, "doctrinalStatus"),
      page: params.get("page") ?? 1,
      pageSize: params.get("pageSize") ?? 10,
    });

    if (!parsed.success) return validationError(parsed.error);
    return NextResponse.json(search(parsed.data));
  });
}
