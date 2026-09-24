import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { BoardCanvas } from "@/components/investigation/board-canvas";
import { currentOwnerId } from "@/server/auth/session";
import { getInvestigation, summarize } from "@/server/services/investigation-service";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const investigation = getInvestigation(id);
  return { title: investigation?.title ?? "Investigation" };
}

export default async function InvestigationPage({ params }: PageProps) {
  const { id } = await params;
  const investigation = getInvestigation(id);
  if (!investigation) notFound();

  const ownerId = await currentOwnerId();
  const readOnly = investigation.ownerId !== ownerId;
  const summary = summarize(investigation);

  return (
    <div className="flex flex-col h-full min-h-0 bg-canvas">
      <header className="bg-surface-container-lowest border-b border-outline-variant px-space-md lg:px-space-lg py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/investigations"
              className="inline-flex items-center gap-1.5 text-body-sm font-label-md text-secondary hover:underline"
            >
              <Icon name="arrow_back" size={14} />
              All investigations
            </Link>
            <h1 className="font-headline-md text-headline-md text-on-surface leading-tight mt-0.5">
              {investigation.title}
            </h1>
            <p className="font-citation-mono text-[11px] text-muted">
              {summary.cases} authorities · {summary.provisions} provisions · {summary.evidence} evidence ·{" "}
              {summary.notes} notes · {summary.userLinks} links
              {summary.flagged > 0 && ` · ${summary.flagged} flagged`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/search" className="cl-btn-secondary">
              <Icon name="search" size={16} />
              Add an authority
            </Link>
            <Link href={`/reports/${investigation.id}`} className="cl-btn-primary">
              <Icon name="file_download" size={16} />
              Export investigation report
            </Link>
          </div>
        </div>

        {readOnly && (
          <p className="mt-2 text-body-sm text-review-ink bg-review-surface border border-review-border rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
            <Icon name="info" size={14} />
            This board belongs to another session and is read-only here.
          </p>
        )}
      </header>

      <div className="flex-1 min-h-0">
        <BoardCanvas investigation={investigation} readOnly={readOnly} />
      </div>
    </div>
  );
}
