"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import type { AuthorityLevel, ProvenanceRef } from "@/types/domain";

/**
 * Provenance surface.
 *
 * LEGAL_DATA_RULES.md requires that every displayed legal authority exposes
 * its source name, citation, date, URL and retrieval date. This component is
 * the one place that contract is rendered, so it cannot drift between views.
 */

const AUTHORITY_STYLES: Record<AuthorityLevel, string> = {
  PRIMARY: "bg-verified-surface text-verified-ink border-verified-border",
  SECONDARY: "bg-surface-container-high text-on-surface border-outline-variant",
  DEMO: "bg-review-surface text-review-ink border-review-border",
  USER: "bg-surface-container-low text-on-surface-variant border-outline-variant",
};

const AUTHORITY_LABELS: Record<AuthorityLevel, string> = {
  PRIMARY: "Primary source",
  SECONDARY: "Secondary source",
  DEMO: "Unverified demo data",
  USER: "User note",
};

const AUTHORITY_DESCRIPTIONS: Record<AuthorityLevel, string> = {
  PRIMARY: "Official court, registry or gazette record.",
  SECONDARY: "Reporter or established legal database record.",
  DEMO: "Written from model recollection for this demo and NOT retrieved from any source. Unverified — check the linked record.",
  USER: "Authored by a user in this investigation. Not a legal authority.",
};

function strongest(evidence: ProvenanceRef[]): AuthorityLevel {
  const rank: Record<AuthorityLevel, number> = { PRIMARY: 4, SECONDARY: 3, DEMO: 2, USER: 1 };
  let best: AuthorityLevel = "USER";
  for (const ref of evidence) if (rank[ref.authorityLevel] > rank[best]) best = ref.authorityLevel;
  return best;
}

function formatRetrieved(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function AuthorityChip({ level, className }: { level: AuthorityLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-statute-code text-statute-code uppercase",
        AUTHORITY_STYLES[level],
        className,
      )}
      title={AUTHORITY_DESCRIPTIONS[level]}
    >
      {AUTHORITY_LABELS[level]}
    </span>
  );
}

/**
 * Expandable provenance for a record. Collapsed it shows the authority level;
 * expanded it lists every source with its URL and retrieval date.
 */
export function ProvenanceDisclosure({
  evidence,
  label = "Provenance",
  className,
}: {
  evidence: ProvenanceRef[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  if (evidence.length === 0) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-body-sm text-error", className)}>
        <Icon name="report_problem" size={14} />
        No provenance recorded
      </span>
    );
  }

  const level = strongest(evidence);

  return (
    <div className={cn("text-body-sm", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-secondary transition-colors rounded"
      >
        <Icon name={open ? "expand_more" : "chevron_right"} size={14} />
        <span className="font-label-md text-label-md uppercase tracking-wider">{label}</span>
        <AuthorityChip level={level} />
        <span className="font-citation-mono text-[11px] text-muted">
          {evidence.length} {evidence.length === 1 ? "source" : "sources"}
        </span>
      </button>

      {open && (
        <ul id={panelId} className="mt-2 space-y-2 border-l-2 border-outline-variant pl-3">
          {evidence.map((ref, index) => {
            const retrieved = formatRetrieved(ref.retrievedAt);
            return (
              <li key={`${ref.sourceUrl}-${ref.paragraphId ?? index}`} className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <AuthorityChip level={ref.authorityLevel} />
                  <span className="font-medium text-on-surface">{ref.sourceName}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] font-citation-mono text-muted">
                  {ref.sourceUrl ? (
                    <span className="inline-flex items-center gap-1 break-all">
                      {/* Without a retrieval date nothing was fetched from this
                          URL, so it is offered as somewhere to check the record
                          rather than presented as where the record came from. */}
                      <span className="uppercase tracking-wider">
                        {retrieved ? "Source:" : "Verify at:"}
                      </span>
                      <a
                        href={ref.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-secondary hover:underline inline-flex items-center gap-1 break-all"
                      >
                        {ref.sourceUrl}
                        <Icon name="open_in_new" size={12} />
                      </a>
                    </span>
                  ) : (
                    <span>No source URL</span>
                  )}
                  {retrieved ? (
                    <span>Retrieved {retrieved}</span>
                  ) : (
                    <span className="text-review-ink">Not retrieved</span>
                  )}
                  {ref.paragraphId && <span>¶ id {ref.paragraphId}</span>}
                  {ref.page !== undefined && <span>p. {ref.page}</span>}
                </div>
                {ref.note && (
                  <p className="text-[12px] text-on-surface-variant leading-relaxed">{ref.note}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
