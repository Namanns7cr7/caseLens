import Link from "next/link";

import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icon";
import { ProvenanceDisclosure } from "@/components/ui/provenance";
import type { TimelineEvent, TimelineEventKind } from "@/types/domain";

/**
 * Procedural chronology.
 *
 * The chain is walked over procedural relationships only, so what is drawn
 * here is the life of one matter across forums — not a list of authorities
 * that happen to cite each other.
 */

const KIND_STYLES: Record<TimelineEventKind, { icon: IconName; tone: string; label: string }> = {
  FILING: { icon: "description", tone: "bg-surface-container-high text-on-surface-variant", label: "Filed" },
  DECISION: { icon: "gavel", tone: "bg-surface-container-high text-on-surface", label: "Decided" },
  APPEAL: { icon: "trending_up", tone: "bg-secondary-fixed text-on-secondary-fixed", label: "On appeal" },
  REMAND: { icon: "arrow_back", tone: "bg-review-surface text-review-ink", label: "Remanded" },
  AFFIRMATION: { icon: "check_circle", tone: "bg-verified-surface text-verified-ink", label: "Affirmed below" },
  REVERSAL: { icon: "cancel", tone: "bg-mismatch-surface text-mismatch-ink", label: "Reversed below" },
  STATUTORY_EVENT: { icon: "menu_book", tone: "bg-surface-container-high text-on-surface", label: "Statutory" },
};

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function Timeline({ events, className }: { events: TimelineEvent[]; className?: string }) {
  if (events.length === 0) return null;

  return (
    <ol className={cn("relative", className)}>
      {/* Spine */}
      <span
        className="absolute left-[15px] top-2 bottom-2 w-px bg-outline-variant"
        aria-hidden="true"
      />

      {events.map((event) => {
        const style = KIND_STYLES[event.kind];
        return (
          <li key={event.id} className="relative pl-11 pb-5 last:pb-0">
            <span
              className={cn(
                "absolute left-0 top-0.5 flex items-center justify-center w-8 h-8 rounded-lg border",
                event.isFocus
                  ? "bg-secondary text-white border-secondary"
                  : `${style.tone} border-outline-variant`,
              )}
            >
              <Icon name={style.icon} size={16} />
            </span>

            <div
              className={cn(
                "rounded-lg border p-3",
                event.isFocus
                  ? "border-secondary/50 bg-secondary-fixed/20"
                  : "border-outline-variant bg-surface-container-lowest",
              )}
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-citation-mono text-[12px] text-secondary font-semibold">
                  {formatDate(event.date)}
                </span>
                <span className="font-statute-code text-statute-code uppercase text-muted">
                  {style.label}
                </span>
                {event.isFocus && (
                  <span className="font-statute-code text-statute-code uppercase px-1.5 py-0.5 rounded bg-secondary text-white">
                    This case
                  </span>
                )}
              </div>

              <h4 className="font-headline-md text-body-lg text-on-surface leading-snug">
                {event.caseId && !event.isFocus ? (
                  <Link href={`/cases/${event.caseId}`} className="hover:text-secondary transition-colors">
                    {event.title}
                  </Link>
                ) : (
                  event.title
                )}
              </h4>

              <p className="text-body-sm text-on-surface-variant mt-0.5">{event.forum}</p>

              {event.description && (
                <p className="text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">
                  {event.description}
                </p>
              )}

              <ProvenanceDisclosure evidence={event.provenance} label="Source" className="mt-2" />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
