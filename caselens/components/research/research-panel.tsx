"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { PanelHeading } from "@/components/ui/primitives";
import { ProvenanceDisclosure } from "@/components/ui/provenance";
import type { CaseSummary, JudgmentParagraph, SynthesisResult } from "@/types/domain";

/**
 * Grounded research.
 *
 * Every claim is rendered with the passages it rests on, and a claim the
 * model could not tie to a retrieved paragraph is shown as unsupported rather
 * than quietly dropped. When no model is configured the panel says so and
 * presents the retrieved passages instead of a synthesis — the honest
 * degradation LEGAL_DATA_RULES.md requires.
 */

const SUGGESTED = [
  "Does the Section 14 moratorium bar enforcement against a personal guarantor?",
  "Does approval of a resolution plan discharge a personal guarantor?",
  "What does the clean slate principle extinguish?",
];

const CONFIDENCE_STYLES: Record<string, string> = {
  HIGH: "bg-verified-surface text-verified-ink border-verified-border",
  MEDIUM: "bg-review-surface text-review-ink border-review-border",
  LOW: "bg-mismatch-surface text-mismatch-ink border-mismatch-border",
};

export function ResearchPanel({
  cases,
  paragraphs,
}: {
  cases: Record<string, CaseSummary>;
  paragraphs: Record<string, JudgmentParagraph>;
}) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<SynthesisResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const ask = useCallback(async (value: string) => {
    if (value.trim().length < 5) return;
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    try {
      const response = await fetch("/api/research/synthesize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: value.trim() }),
      });
      const payload = (await response.json()) as SynthesisResult & {
        error?: { message: string };
      };
      if (!response.ok) throw new Error(payload.error?.message ?? "That question could not be answered.");
      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-space-lg">
      {/* Question */}
      <section className="cl-card p-space-lg">
        <label htmlFor="research-question" className="font-label-md text-label-md uppercase tracking-wider text-muted">
          Research question
        </label>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            id="research-question"
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void ask(question);
            }}
            placeholder="Ask a question the indexed authorities can answer"
            className="flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md focus:border-secondary focus:ring-1 focus:ring-secondary"
          />
          <button
            type="button"
            onClick={() => void ask(question)}
            disabled={loading || question.trim().length < 5}
            className="cl-btn-accent"
          >
            <Icon
              name={loading ? "progress_activity" : "auto_awesome"}
              size={16}
              className={loading ? "animate-spin" : undefined}
            />
            {loading ? "Retrieving…" : "Ask"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {SUGGESTED.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setQuestion(suggestion);
                void ask(suggestion);
              }}
              className="text-left text-body-sm px-2.5 py-1 rounded border border-outline-variant bg-surface-container-low hover:border-secondary transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-lg border border-mismatch-border bg-mismatch-surface px-3 py-2 text-body-sm text-mismatch-ink">
          {error}
        </p>
      )}

      {result && (
        <>
          {/* Answer */}
          <section className="cl-card p-space-lg">
            <PanelHeading
              icon="auto_awesome"
              title={result.grounded ? "Grounded synthesis" : "Retrieved passages"}
              trailing={
                <span className="font-citation-mono text-[11px] text-muted">
                  {result.modelVersion}
                </span>
              }
              className="mb-3"
            />
            <p className="font-judgment-editorial text-[18px] leading-[30px] text-on-surface">
              {result.answer}
            </p>
          </section>

          {/* Claims and their support */}
          {result.claims.length > 0 && (
            <section className="cl-card p-space-lg">
              <PanelHeading
                icon="shield"
                title={result.grounded ? "Claims and supporting passages" : "Passages retrieved"}
                className="mb-4"
              />
              <ol className="space-y-5">
                {result.claims.map((claim, index) => (
                  <li key={index}>
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                      <p className="font-headline-md text-body-lg text-on-surface leading-snug flex-1 min-w-0">
                        {claim.claim}
                      </p>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded border font-statute-code text-statute-code uppercase shrink-0",
                          CONFIDENCE_STYLES[claim.confidence],
                        )}
                      >
                        {claim.confidence === "LOW" && claim.supportingParagraphIds.length === 0
                          ? "Unsupported"
                          : `${claim.confidence} confidence`}
                      </span>
                    </div>

                    {claim.supportingParagraphIds.length === 0 ? (
                      <p className="text-body-sm text-mismatch-ink bg-mismatch-surface border border-mismatch-border rounded-lg px-3 py-2">
                        No retrieved passage could be tied to this claim. Treat it as unsupported.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {claim.supportingParagraphIds.map((paragraphId) => {
                          const paragraph = paragraphs[paragraphId];
                          const summary = paragraph ? cases[paragraph.caseId] : undefined;
                          if (!paragraph) return null;
                          return (
                            <li
                              key={paragraphId}
                              className="rounded-lg border border-outline-variant border-l-[3px] border-l-secondary bg-surface-container-low/50 p-3"
                            >
                              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                                {summary && (
                                  <Link
                                    href={`/cases/${summary.id}`}
                                    className="text-body-sm font-medium text-secondary hover:underline"
                                  >
                                    {summary.title}
                                  </Link>
                                )}
                                <span className="font-citation-mono text-[11px] text-muted">
                                  ¶ {paragraph.paragraphNumber}
                                </span>
                              </div>
                              <p className="font-judgment-editorial text-[16px] leading-[26px] text-on-surface">
                                {paragraph.text}
                              </p>
                              <ProvenanceDisclosure
                                evidence={paragraph.provenance}
                                label="Passage source"
                                className="mt-2"
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Limitations and next steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
            <section className="cl-card p-space-lg">
              <PanelHeading icon="warning" title="Limitations" className="mb-3" />
              <ul className="space-y-2">
                {result.limitations.map((limitation) => (
                  <li key={limitation} className="flex gap-2 text-body-sm text-on-surface-variant leading-relaxed">
                    <Icon name="remove" size={14} className="mt-1 shrink-0 text-muted" />
                    {limitation}
                  </li>
                ))}
              </ul>
            </section>

            <section className="cl-card p-space-lg">
              <PanelHeading icon="explore" title="Next investigation steps" className="mb-3" />
              <ul className="space-y-2">
                {result.nextSteps.map((step) => (
                  <li key={step} className="flex gap-2 text-body-sm text-on-surface leading-relaxed">
                    <Icon name="chevron_right" size={14} className="mt-1 shrink-0 text-secondary" />
                    {step}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {result.sources.length > 0 && (
            <section className="cl-card p-space-lg">
              <PanelHeading icon="hub" title="Every source consulted" className="mb-3" />
              <ProvenanceDisclosure evidence={result.sources} label="Sources" />
            </section>
          )}
        </>
      )}
    </div>
  );
}
