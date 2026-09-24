import Link from "next/link";

import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icon";
import type { DoctrinalStatus, VerificationStatus } from "@/types/domain";

/**
 * Shared display primitives, built to the Stitch component vocabulary:
 * hairline borders, 6px status chips, monospaced citation stamps, and
 * restrained tonal fills rather than shadow.
 */

/* ------------------------------------------------------------------ */
/* Verification status                                                 */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<VerificationStatus, string> = {
  VERIFIED: "Verified",
  METADATA_MISMATCH: "Metadata mismatch",
  PARAGRAPH_MISMATCH: "Paragraph mismatch",
  WEAK_PROPOSITION_SUPPORT: "Weak proposition support",
  NO_AUTHORITATIVE_MATCH: "No authoritative match",
  NEEDS_REVIEW: "Needs human review",
};

const STATUS_STYLES: Record<VerificationStatus, string> = {
  VERIFIED: "bg-verified-surface text-verified-ink border-verified-border",
  METADATA_MISMATCH: "bg-mismatch-surface text-mismatch-ink border-mismatch-border",
  PARAGRAPH_MISMATCH: "bg-mismatch-surface text-mismatch-ink border-mismatch-border",
  WEAK_PROPOSITION_SUPPORT: "bg-review-surface text-review-ink border-review-border",
  NO_AUTHORITATIVE_MATCH: "bg-mismatch-surface text-mismatch-ink border-mismatch-border",
  NEEDS_REVIEW: "bg-review-surface text-review-ink border-review-border",
};

const STATUS_DOTS: Record<VerificationStatus, string> = {
  VERIFIED: "bg-verified",
  METADATA_MISMATCH: "bg-mismatch",
  PARAGRAPH_MISMATCH: "bg-mismatch",
  WEAK_PROPOSITION_SUPPORT: "bg-review",
  NO_AUTHORITATIVE_MATCH: "bg-mismatch",
  NEEDS_REVIEW: "bg-review",
};

const STATUS_ICONS: Record<VerificationStatus, IconName> = {
  VERIFIED: "check_circle",
  METADATA_MISMATCH: "report_problem",
  PARAGRAPH_MISMATCH: "report_problem",
  WEAK_PROPOSITION_SUPPORT: "warning",
  NO_AUTHORITATIVE_MATCH: "cancel",
  NEEDS_REVIEW: "info",
};

export function StatusPill({
  status,
  className,
  showIcon = true,
}: {
  status: VerificationStatus;
  className?: string;
  showIcon?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-statute-code text-statute-code uppercase",
        STATUS_STYLES[status],
        className,
      )}
    >
      {showIcon ? (
        <Icon name={STATUS_ICONS[status]} size={13} />
      ) : (
        <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOTS[status])} />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}

export function statusLabel(status: VerificationStatus): string {
  return STATUS_LABELS[status];
}

/* ------------------------------------------------------------------ */
/* Doctrinal status                                                    */
/* ------------------------------------------------------------------ */

const DOCTRINAL_LABELS: Record<DoctrinalStatus, string> = {
  BINDING_LANDMARK: "Binding landmark",
  AFFIRMED_FOLLOWED: "Affirmed / followed",
  DISTINGUISHED: "Distinguished",
  OVERRULED: "Superseded",
  PENDING: "Pending",
};

const DOCTRINAL_STYLES: Record<DoctrinalStatus, string> = {
  BINDING_LANDMARK: "bg-tertiary-fixed text-on-tertiary-fixed border-on-tertiary-container",
  AFFIRMED_FOLLOWED: "bg-verified-surface text-verified-ink border-verified-border",
  DISTINGUISHED: "bg-review-surface text-review-ink border-review-border",
  OVERRULED: "bg-mismatch-surface text-mismatch-ink border-mismatch-border",
  PENDING: "bg-surface-container-high text-on-surface-variant border-outline-variant",
};

const DOCTRINAL_ICONS: Record<DoctrinalStatus, IconName> = {
  BINDING_LANDMARK: "anchor",
  AFFIRMED_FOLLOWED: "check_circle",
  DISTINGUISHED: "warning",
  OVERRULED: "cancel",
  PENDING: "schedule",
};

export function DoctrinalPill({
  status,
  className,
}: {
  status: DoctrinalStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded border font-statute-code text-statute-code font-bold uppercase",
        DOCTRINAL_STYLES[status],
        className,
      )}
    >
      <Icon name={DOCTRINAL_ICONS[status]} size={13} />
      {DOCTRINAL_LABELS[status]}
    </span>
  );
}

export function doctrinalLabel(status: DoctrinalStatus): string {
  return DOCTRINAL_LABELS[status];
}

/* ------------------------------------------------------------------ */
/* Citation stamp                                                      */
/* ------------------------------------------------------------------ */

export function CitationStamp({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "font-citation-mono text-citation-mono font-semibold text-on-surface",
        className,
      )}
    >
      {value}
    </span>
  );
}

export function StatuteChip({
  label,
  href,
  className,
}: {
  label: string;
  href?: string;
  className?: string;
}) {
  const content = (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high font-statute-code text-statute-code text-secondary font-bold border border-transparent",
        href && "hover:border-secondary transition-colors",
        className,
      )}
    >
      {label}
    </span>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

/* ------------------------------------------------------------------ */
/* Section scaffolding                                                 */
/* ------------------------------------------------------------------ */

export function PanelHeading({
  icon,
  title,
  trailing,
  className,
}: {
  icon?: IconName;
  title: string;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between border-b border-outline-variant pb-2.5", className)}>
      <div className="flex items-center gap-2 min-w-0">
        {icon && <Icon name={icon} size={18} className="text-secondary" />}
        <h2 className="text-body-md font-label-md text-on-surface uppercase tracking-wider truncate">
          {title}
        </h2>
      </div>
      {trailing}
    </div>
  );
}

/**
 * Empty state. UI_UX_SPEC.md: "Never leave blank panels. Every empty state
 * explains the next useful action."
 */
export function EmptyState({
  icon = "search",
  title,
  description,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-low/50 px-6 py-10",
        className,
      )}
    >
      <span className="flex items-center justify-center w-11 h-11 rounded-full bg-surface-container-high text-muted">
        <Icon name={icon} size={22} />
      </span>
      <div className="space-y-1 max-w-md">
        <p className="font-headline-md text-headline-md text-on-surface leading-tight">{title}</p>
        <p className="text-body-sm text-on-surface-variant leading-relaxed">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 rounded-xl border border-mismatch-border bg-mismatch-surface px-6 py-10">
      <span className="flex items-center justify-center w-11 h-11 rounded-full bg-white text-mismatch border border-mismatch-border">
        <Icon name="report_problem" size={22} />
      </span>
      <div className="space-y-1 max-w-md">
        <p className="font-headline-md text-headline-md text-mismatch-ink leading-tight">{title}</p>
        <p className="text-body-sm text-mismatch-ink/90 leading-relaxed">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("cl-skeleton", className)} aria-hidden="true" />;
}

/** Loading placeholder shaped like a result card, to avoid layout shift. */
export function CardSkeleton() {
  return (
    <div className="cl-card p-space-lg space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
