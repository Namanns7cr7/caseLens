import { NextResponse } from "next/server";

import { getCorpus } from "@/server/db/seed";
import { driverKind } from "@/server/db/client";
import { isModelConfigured } from "@/server/ai/gemini";

export const dynamic = "force-dynamic";

/** Liveness probe for the host's health check, and a quick config readout. */
export async function GET() {
  const corpus = getCorpus();
  return NextResponse.json({
    status: "ok",
    corpus: { cases: corpus.cases.size, paragraphs: corpus.paragraphs.size },
    dataStore: driverKind(),
    synthesisModel: isModelConfigured() ? "configured" : "not configured",
  });
}
