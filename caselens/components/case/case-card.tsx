import Link from "next/link";

import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { CitationStamp, DoctrinalPill, StatuteChip } from "@/components/ui/primitives";
import { ProvenanceDisclosure } from "@/components/ui/provenance";
import { PinButton } from "@/components/investigation/pin-button";
import type { SearchHit } from "@/types/domain";

/**
 * Search result card.
 *
 * Stitch renders a result as a dossier tile: a doctrinal status banner, the
 * case title in Garamond, a monospaced citation/coram line, the operative
 * passage set off by a sapphire rule, statute anchors, and an action strip.
 * The leading hit is given the 2px sapphire border and the side marker.
 */

function formatDate(value: string | undefined): string {
  if (!value) return "Date not recorded";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function CaseCard({
  hit,
  featured = false,
  investigationId,
}: {
  hit: SearchHit;
  featured?: boolean;
  investigationId?: string;
}) {
  const { case: summary, excerpt } = hit;
  const citationLine = [summary.neutralCitation, ...summary.reporterCitations]
    .filter(Boolean)
    .join("  |  ");

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg transition-all",
        featured
          ? "border-2 border-secondary/70 shadow-layer1"
          : "border border-outline-variant shadow-xs hover:border-secondary",
      )}
    >
      {featured && <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary" aria-hidden="true" />}

      <div className={cn("flex flex-col sm:flex-row sm:items-start justify-between gap-2", featured && "pl-2")}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <DoctrinalPill status={summary.doctrinalStatus} />
            {summary.benchStrength && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container font-statute-code text-statute-code font-semibold text-on-surface">
                {summary.benchStrength}-JUDGE BENCH
              </span>
            )}
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-low font-statute-code text-statute-code text-on-surface-variant">
              {summary.courtShortName}
            </span>
          </div>

          <h3 className="font-headline-md text-headline-md text-primary leading-tight">
            <Link href={`/cases/${summary.id}`} className="hover:text-secondary transition-colors">
              {summary.title}
            </Link>
          </h3>
        </div>

        <div className="flex sm:flex-col items-baseline sm:items-end gap-2 sm:gap-0 shrink-0">
          <span
            className={cn(
              "font-citation-mono text-lg font-bold",
              featured ? "text-secondary" : "text-on-surface",
            )}
          >
            {Math.round(hit.score * 100)}%
          </span>
          <span className="text-[11px] font-citation-mono text-muted uppercase">Match</span>
        </div>
      </div>

      {/* Citation + coram metadata */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 mb-3 text-body-sm text-on-surface-variant",
          featured && "pl-2",
        )}
      >
        {citationLine ? (
          <CitationStamp value={citationLine} />
        ) : (
          summary.caseNumber && <CitationStamp value={summary.caseNumber} />
        )}
        <span className="text-muted">•</span>
        <span>
          <strong className="font-medium text-on-surface">Decided:</strong> {formatDate(summary.decisionDate)}
        </span>
      </div>

      {/* Operative passage */}
      {excerpt && (
        <div
          className={cn(
            "my-3 p-4 rounded-lg bg-surface-container-low/70 border-l-4 border-secondary border-t border-r border-b border-outline-variant/50",
            featured && "ml-2",
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="font-statute-code text-statute-code text-secondary uppercase font-bold flex items-center gap-1">
              <Icon name="format_quote" size={14} />
              {excerpt.isRatio ? "Operative ratio decidendi" : "Supporting passage"}
            </span>
            <span className="font-citation-mono text-[12px] text-muted shrink-0">
              {summary.courtShortName} ¶ {excerpt.paragraphNumber}
            </span>
          </div>
          <p className="font-judgment-editorial text-judgment-editorial text-on-surface leading-relaxed">
            <span className="font-citation-mono text-secondary font-semibold not-italic mr-1.5">
              ¶ {excerpt.paragraphNumber}.
            </span>
            {excerpt.text}
          </p>
          <ProvenanceDisclosure evidence={excerpt.provenance} label="Passage source" className="mt-2.5" />
        </div>
      )}

      {/* Statute anchors + why it matched */}
      <div className={cn("pt-2 border-t border-outline-variant space-y-2", featured && "pl-2")}>
        {hit.matchedProvisions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-statute-code text-statute-code text-muted uppercase font-semibold">
              Statute anchors:
            </span>
            {[...new Set(hit.matchedProvisions)].map((label) => (
              <StatuteChip key={label} label={label} />
            ))}
          </div>
        )}
        {hit.matchReasons.length > 0 && (
          <p className="text-[12px] font-citation-mono text-muted">
            Matched on: {hit.matchReasons.join(" · ")}
          </p>
        )}
      </div>

      {/* Action strip */}
      <div className={cn("mt-3 flex flex-wrap items-center justify-between gap-2", featured && "pl-2")}>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/cases/${summary.id}`} className="cl-btn-accent">
            <Icon name="folder_open" size={16} />
            Open dossier
          </Link>
          <PinButton
            nodeType="CASE"
            entityId={summary.id}
            label="Pin to board"
            investigationId={investigationId}
          />
          <Link href={`/cases/${summary.id}/graph`} className="cl-btn-secondary">
            <Icon name="account_tree" size={16} />
            Relationship graph
          </Link>
        </div>
        <ProvenanceDisclosure evidence={summary.provenance} label="Record source" />
      </div>
    </article>
  );
}
