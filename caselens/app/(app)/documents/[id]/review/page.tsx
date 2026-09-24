import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { StatusPill } from "@/components/ui/primitives";
import { ReviewWorkspace, type ReviewData } from "@/components/verification/review-workspace";
import { getCase, getParagraph } from "@/server/repositories/case-repository";
import { getAnalysis } from "@/server/services/document-service";
import type { CaseSummary, JudgmentParagraph, VerificationStatus } from "@/types/domain";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const analysis = getAnalysis(id);
  return { title: analysis ? `Review — ${analysis.document.filename}` : "Review" };
}

const SUMMARY_ORDER: VerificationStatus[] = [
  "NO_AUTHORITATIVE_MATCH",
  "METADATA_MISMATCH",
  "PARAGRAPH_MISMATCH",
  "WEAK_PROPOSITION_SUPPORT",
  "NEEDS_REVIEW",
  "VERIFIED",
];

export default async function ReviewPage({ params }: PageProps) {
  const { id } = await params;
  const analysis = getAnalysis(id);
  if (!analysis) notFound();

  // Resolve the authorities and passages the findings reference, so the
  // client pane never has to fetch them one by one.
  const cases: Record<string, CaseSummary> = {};
  const paragraphs: Record<string, JudgmentParagraph> = {};
  for (const result of analysis.results) {
    if (result.matchedCaseId) {
      const summary = getCase(result.matchedCaseId);
      if (summary) cases[summary.id] = summary;
    }
    if (result.matchedParagraphId) {
      const paragraph = getParagraph(result.matchedParagraphId);
      if (paragraph) paragraphs[paragraph.id] = paragraph;
    }
  }

  const data: ReviewData = { analysis, cases, paragraphs };

  return (
    <div className="bg-canvas min-h-full flex flex-col">
      <header className="bg-surface-container-lowest px-space-md lg:px-space-lg py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/verify"
              className="inline-flex items-center gap-1.5 text-body-sm font-label-md text-secondary hover:underline"
            >
              <Icon name="arrow_back" size={14} />
              Verify another document
            </Link>
            <h1 className="font-headline-md text-headline-md text-on-surface leading-tight mt-0.5 truncate">
              {analysis.document.filename}
            </h1>
            <p className="font-citation-mono text-[11px] text-muted">
              {analysis.document.pageCount ?? "?"} pages · {analysis.summary.total} citations checked ·
              SHA-256 {analysis.document.sha256.slice(0, 16)}…
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/reports/${analysis.document.id}`} className="cl-btn-primary">
              <Icon name="file_download" size={16} />
              Legal integrity report
            </Link>
          </div>
        </div>

        {/* Finding summary strip */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {SUMMARY_ORDER.filter((status) => analysis.summary.byStatus[status] > 0).map((status) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <StatusPill status={status} />
              <span className="font-citation-mono text-[12px] text-muted">
                ×{analysis.summary.byStatus[status]}
              </span>
            </span>
          ))}
        </div>
      </header>

      <ReviewWorkspace data={data} />
    </div>
  );
}
