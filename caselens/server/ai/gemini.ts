import "server-only";

import { z } from "zod";

import { listParagraphs } from "@/server/repositories/case-repository";
import type {
  CaseSummary,
  ExtractedCitation,
  JudgmentParagraph,
  VerificationCheck,
} from "@/types/domain";

/**
 * Grounded Gemini access.
 *
 * Boundaries this module enforces, from CLAUDE.md and prompts/GEMINI_SYSTEM_PROMPT.md:
 *
 *   - the API key is read from the server environment and never leaves it;
 *   - the model is given retrieved records and told to reason only over them;
 *   - output is parsed against a strict Zod schema and discarded if it does
 *     not conform — a malformed answer degrades to the deterministic result
 *     rather than being shown;
 *   - the model is never asked whether an authority exists, what a judgment
 *     says, or what a citation's status is. It is asked only to compare a
 *     proposition against supplied paragraphs, or to synthesise over records
 *     the caller already retrieved.
 */

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const AI_STUDIO_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Two ways to reach Gemini, in preference order.
 *
 * VERTEX — used when VERTEX_PROJECT is set. Authenticates with the runtime's
 * own Google identity (the Cloud Run service account, or local application
 * default credentials), so there is no API key to provision, rotate or leak.
 * This is the path the deployed service uses.
 *
 * AI_STUDIO — used when GEMINI_API_KEY is set instead. Kept because it is the
 * zero-setup option for a local checkout.
 *
 * NONE — neither configured. Verification stays fully deterministic and the
 * research page returns retrieved passages rather than a synthesis, and says
 * so; nothing silently degrades.
 */
type Backend = "VERTEX" | "AI_STUDIO" | "NONE";

const VERTEX_LOCATION = process.env.VERTEX_LOCATION ?? "asia-south1";

export function backend(): Backend {
  if (process.env.VERTEX_PROJECT) return "VERTEX";
  if (process.env.GEMINI_API_KEY) return "AI_STUDIO";
  return "NONE";
}

export function isModelConfigured(): boolean {
  return backend() !== "NONE";
}

export function modelVersion(): string {
  switch (backend()) {
    case "VERTEX":
      return `${MODEL} (Vertex AI, ${VERTEX_LOCATION})`;
    case "AI_STUDIO":
      return `${MODEL} (Gemini API)`;
    default:
      return "deterministic-fallback";
  }
}

/**
 * OAuth token for Vertex AI, via Application Default Credentials.
 *
 * `google-auth-library` resolves credentials the same way every Google
 * client does: the Cloud Run metadata server in production, and a
 * developer's gcloud login locally. An earlier version of this called the
 * metadata endpoint by hand and failed silently inside the container, which
 * is a good argument for not hand-rolling auth. The library also caches and
 * refreshes the token, so callers can ask for one per request.
 */
let authClient: import("google-auth-library").GoogleAuth | undefined;

async function vertexAccessToken(): Promise<string | undefined> {
  try {
    if (!authClient) {
      const { GoogleAuth } = await import("google-auth-library");
      authClient = new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
    }
    const token = await authClient.getAccessToken();
    return token ?? undefined;
  } catch (error) {
    console.error(
      "Vertex AI token request failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return undefined;
  }
}

export const SYSTEM_PROMPT = `You are the reasoning layer inside CaseLens, an AI-assisted legal investigation tool.

You are not the source of legal authority. Your output must be grounded in the supplied retrieved records.

Rules:
1. Never invent cases, citations, paragraph numbers, statutory text, judges, dates, or holdings.
2. If evidence is missing or conflicting, say so explicitly.
3. Distinguish: what the uploaded/user document claims; what the retrieved authority actually states; your comparison/inference.
4. Include source IDs and paragraph IDs for every material conclusion.
5. Do not say a citation is fabricated merely because no match was found. Say: "No authoritative match was found in the connected sources".
6. Prefer direct source passages over summaries.
7. Use concise, neutral legal-research language.
8. Human verification is required for high-impact conclusions.`;

interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: Record<string, unknown>;
  timeoutMs?: number;
}

/** Endpoint and auth header for whichever backend is configured. */
async function resolveTarget(): Promise<{ url: string; headers: Record<string, string> } | undefined> {
  const mode = backend();

  if (mode === "VERTEX") {
    const project = process.env.VERTEX_PROJECT;
    const token = await vertexAccessToken();
    if (!project || !token) {
      console.error("Vertex AI is configured but no access token could be obtained");
      return undefined;
    }
    return {
      url:
        `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${project}` +
        `/locations/${VERTEX_LOCATION}/publishers/google/models/${MODEL}:generateContent`,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    };
  }

  if (mode === "AI_STUDIO") {
    return {
      url: `${AI_STUDIO_ENDPOINT}/${MODEL}:generateContent`,
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY as string,
      },
    };
  }

  return undefined;
}

/** Calls Gemini and returns parsed JSON, or undefined if unavailable. */
async function generateJson(options: GenerateOptions): Promise<unknown | undefined> {
  const target = await resolveTarget();
  if (!target) return undefined;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);

  try {
    const response = await fetch(target.url, {
      method: "POST",
      headers: target.headers,
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: options.systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: options.userPrompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: options.responseSchema,
        },
      }),
    });

    if (!response.ok) {
      // Never log the credential or the document body.
      console.error(`Gemini request failed with status ${response.status}`);
      return undefined;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return undefined;
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Gemini request timed out");
    } else {
      console.error("Gemini request errored");
    }
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

/* ------------------------------------------------------------------ */
/* Proposition support                                                 */
/* ------------------------------------------------------------------ */

const propositionSchema = z.object({
  support: z.enum(["SUPPORTED", "PARTIAL", "NOT_SUPPORTED"]),
  supportingParagraphNumbers: z.array(z.string()).max(6),
  explanation: z.string().min(10).max(1200),
});

const PROPOSITION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    support: { type: "string", enum: ["SUPPORTED", "PARTIAL", "NOT_SUPPORTED"] },
    supportingParagraphNumbers: { type: "array", items: { type: "string" } },
    explanation: { type: "string" },
  },
  required: ["support", "supportingParagraphNumbers", "explanation"],
};

export interface AiPropositionOutcome {
  check: VerificationCheck;
  supported: boolean;
  weak: boolean;
  modelVersion: string;
}

function renderParagraphs(paragraphs: JudgmentParagraph[]): string {
  return paragraphs
    .map((p) => `[paragraph ${p.paragraphNumber} | id ${p.id}]\n${p.text}`)
    .join("\n\n");
}

/**
 * Asks the model whether the supplied paragraphs bear out the proposition the
 * document draws from the authority.
 *
 * The authority has already been resolved deterministically before this runs;
 * the model sees only its paragraphs and the drafter's proposition, and
 * cannot influence whether the record exists or what its metadata says.
 */
export async function explainProposition(
  citation: ExtractedCitation,
  match: CaseSummary,
): Promise<AiPropositionOutcome | undefined> {
  const proposition = citation.claimedProposition;
  if (!proposition) return undefined;

  const paragraphs = listParagraphs(match.id);
  if (paragraphs.length === 0) return undefined;

  const raw = await generateJson({
    systemPrompt: SYSTEM_PROMPT,
    responseSchema: PROPOSITION_RESPONSE_SCHEMA,
    userPrompt: `A legal document cites the authority below and draws a proposition from it.

RETRIEVED AUTHORITY
Title: ${match.title}
Citation: ${match.citation ?? match.neutralCitation ?? match.caseNumber ?? "not recorded"}
Forum: ${match.court}
Decided: ${match.decisionDate ?? "not recorded"}

RETRIEVED PARAGRAPHS (the only text you may rely on)
${renderParagraphs(paragraphs)}

PROPOSITION THE DOCUMENT DRAWS FROM THIS AUTHORITY
"${proposition}"

Decide whether the retrieved paragraphs support that proposition.
Answer SUPPORTED only if a paragraph states it. Answer NOT_SUPPORTED if the
paragraphs say nothing about it, or say the opposite. Answer PARTIAL if they
support part of it. Cite the paragraph numbers you relied on. Do not use any
knowledge beyond the paragraphs above.`,
  });

  if (raw === undefined) return undefined;
  const parsed = propositionSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("Gemini proposition response failed schema validation");
    return undefined;
  }

  const { support, supportingParagraphNumbers, explanation } = parsed.data;
  // Only paragraph numbers that actually exist may be reported as support.
  const known = new Set(paragraphs.map((p) => p.paragraphNumber));
  const cited = supportingParagraphNumbers.filter((n) => known.has(n));

  const outcome: VerificationCheck["outcome"] =
    support === "SUPPORTED" ? "PASS" : support === "PARTIAL" ? "PARTIAL" : "FAIL";

  return {
    check: {
      id: "proposition-support-ai",
      label: "Proposition support (model-assisted)",
      outcome,
      detail: `${explanation}${cited.length ? ` Relied on ¶ ${cited.join(", ¶ ")}.` : " The model cited no paragraph of the indexed judgment."} Model: ${MODEL}. This step interprets the retrieved paragraphs only; the existence and metadata of the authority were established by source lookup, not by the model.`,
      deterministic: false,
    },
    supported: support === "SUPPORTED",
    weak: support === "NOT_SUPPORTED",
    modelVersion: MODEL,
  };
}

/* ------------------------------------------------------------------ */
/* Research synthesis                                                  */
/* ------------------------------------------------------------------ */

export const synthesisSchema = z.object({
  answer: z.string().min(10).max(4000),
  claims: z
    .array(
      z.object({
        claim: z.string().min(5).max(700),
        supportingParagraphIds: z.array(z.string()).max(8),
        confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
      }),
    )
    .max(8),
  limitations: z.array(z.string().max(400)).max(6),
  nextSteps: z.array(z.string().max(300)).max(6),
});

export type SynthesisPayload = z.infer<typeof synthesisSchema>;

const SYNTHESIS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          supportingParagraphIds: { type: "array", items: { type: "string" } },
          confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
        },
        required: ["claim", "supportingParagraphIds", "confidence"],
      },
    },
    limitations: { type: "array", items: { type: "string" } },
    nextSteps: { type: "array", items: { type: "string" } },
  },
  required: ["answer", "claims", "limitations", "nextSteps"],
};

export async function synthesize(
  question: string,
  paragraphs: JudgmentParagraph[],
  cases: CaseSummary[],
): Promise<SynthesisPayload | undefined> {
  if (paragraphs.length === 0) return undefined;

  const raw = await generateJson({
    systemPrompt: SYSTEM_PROMPT,
    responseSchema: SYNTHESIS_RESPONSE_SCHEMA,
    timeoutMs: 30000,
    userPrompt: `Answer the research question using ONLY the retrieved records below.

QUESTION
${question}

RETRIEVED AUTHORITIES
${cases
  .map(
    (c) =>
      `- ${c.title} | ${c.citation ?? c.neutralCitation ?? c.caseNumber ?? "no citation recorded"} | ${c.court} | ${c.decisionDate ?? "date not recorded"}`,
  )
  .join("\n")}

RETRIEVED PARAGRAPHS (the only text you may rely on)
${paragraphs.map((p) => `[id ${p.id} | ${p.caseId} ¶ ${p.paragraphNumber}]\n${p.text}`).join("\n\n")}

For every claim you make, cite the paragraph ids you relied on, using the exact
id strings above. State limitations where the retrieved records do not settle
the question. Suggest concrete next investigation steps.`,
  });

  if (raw === undefined) return undefined;
  const parsed = synthesisSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("Gemini synthesis response failed schema validation");
    return undefined;
  }

  // Drop any paragraph id the model produced that is not in the retrieved set.
  const known = new Set(paragraphs.map((p) => p.id));
  return {
    ...parsed.data,
    claims: parsed.data.claims.map((claim) => ({
      ...claim,
      supportingParagraphIds: claim.supportingParagraphIds.filter((id) => known.has(id)),
    })),
  };
}
