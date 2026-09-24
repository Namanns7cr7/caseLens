"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { CitationStamp, PanelHeading, StatusPill } from "@/components/ui/primitives";
import { ProvenanceDisclosure } from "@/components/ui/provenance";
import { PinButton } from "@/components/investigation/pin-button";
import type {
  CaseSummary,
  DocumentAnalysis,
  ExtractedCitation,
  JudgmentParagraph,
  VerificationResult,
} from "@/types/domain";

/**
 * Three-pane review workspace.
 *
 * Desktop: source document | issue list | evidence pane.
 * Mobile:  document / issues tabs, with the evidence pane as a bottom sheet
 *          at the three snap points MOTION_PHYSICS.md specifies.
 *
 * Selecting a citation highlights its exact span in the source text, because
 * a finding the reader cannot locate in their own document is not evidence.
 */

export interface ReviewData {
  analysis: DocumentAnalysis;
  /** Authorities referenced by results, resolved server-side. */
  cases: Record<string, CaseSummary>;
  paragraphs: Record<string, JudgmentParagraph>;
}

const STATUS_ORDER = [
  "NO_AUTHORITATIVE_MATCH",
  "METADATA_MISMATCH",
  "PARAGRAPH_MISMATCH",
  "WEAK_PROPOSITION_SUPPORT",
  "NEEDS_REVIEW",
  "VERIFIED",
] as const;

/* ------------------------------------------------------------------ */
/* Source document pane                                                */
/* ------------------------------------------------------------------ */

function SourcePane({
  text,
  citations,
  selectedId,
  onSelect,
}: {
  text: string;
  citations: ExtractedCitation[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Splits the document text into plain runs and citation spans using the
   * character offsets recorded at detection time.
   */
  const segments = useMemo(() => {
    const anchored = citations
      .filter((c) => c.charStart !== undefined && c.charEnd !== undefined)
      .sort((a, b) => (a.charStart ?? 0) - (b.charStart ?? 0));

    const out: Array<{ text: string; citation?: ExtractedCitation }> = [];
    let cursor = 0;
    for (const citation of anchored) {
      const start = citation.charStart ?? 0;
      const end = citation.charEnd ?? 0;
      if (start < cursor) continue;
      if (start > cursor) out.push({ text: text.slice(cursor, start) });
      out.push({ text: text.slice(start, end), citation });
      cursor = end;
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor) });
    return out;
  }, [text, citations]);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-surface-container-lowest">
      <div className="px-4 py-4">
        <pre className="whitespace-pre-wrap break-words font-judgment-editorial text-[16px] leading-[28px] text-on-surface">
          {segments.map((segment, index) => {
            if (!segment.citation) return <span key={index}>{segment.text}</span>;
            const active = segment.citation.id === selectedId;
            return (
              <button
                key={index}
                type="button"
                id={`span-${segment.citation.id}`}
                onClick={() => onSelect(segment.citation!.id)}
                className={cn(
                  "font-citation-mono text-[14px] rounded px-0.5 -mx-0.5 transition-colors",
                  active
                    ? "bg-secondary text-white"
                    : "bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-fixed-dim underline decoration-dotted underline-offset-2",
                )}
              >
                {segment.text}
              </button>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Issue list pane                                                     */
/* ------------------------------------------------------------------ */

function IssueList({
  data,
  selectedId,
  onSelect,
}: {
  data: ReviewData;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const ordered = useMemo(
    () =>
      [...data.analysis.results].sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status as (typeof STATUS_ORDER)[number]) -
          STATUS_ORDER.indexOf(b.status as (typeof STATUS_ORDER)[number]),
      ),
    [data.analysis.results],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 space-y-2">
        {ordered.map((result) => {
          const citation = data.analysis.citations.find(
            (c) => c.id === result.extractedCitationId,
          );
          const active = result.extractedCitationId === selectedId;

          return (
            <button
              key={result.id}
              type="button"
              onClick={() => onSelect(result.extractedCitationId)}
              className={cn(
                "w-full text-left rounded-lg border p-3 transition-colors",
                active
                  ? "border-secondary bg-secondary-fixed/25"
                  : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low",
              )}
            >
              <StatusPill status={result.status} className="mb-1.5" />
              <p className="font-headline-md text-body-lg text-on-surface leading-snug">
                {citation?.claimedCaseTitle ?? citation?.rawText ?? "Citation"}
              </p>
              <p className="font-citation-mono text-[12px] text-muted mt-0.5">
                {citation?.rawText}
                {citation?.pageNumber ? ` · page ${citation.pageNumber}` : ""}
                {citation?.claimedParagraph ? ` · cited at ¶ ${citation.claimedParagraph}` : ""}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Evidence pane                                                       */
/* ------------------------------------------------------------------ */

const OUTCOME_STYLES: Record<string, string> = {
  PASS: "text-verified-ink",
  FAIL: "text-mismatch-ink",
  PARTIAL: "text-review-ink",
  SKIPPED: "text-muted",
};

const OUTCOME_ICONS: Record<string, "check_circle" | "cancel" | "warning" | "remove"> = {
  PASS: "check_circle",
  FAIL: "cancel",
  PARTIAL: "warning",
  SKIPPED: "remove",
};

function EvidencePane({
  data,
  result,
  citation,
}: {
  data: ReviewData;
  result?: VerificationResult;
  citation?: ExtractedCitation;
}) {
  if (!result || !citation) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <PanelHeading icon="info" title="Evidence" className="mb-3" />
        <p className="text-body-sm text-on-surface-variant leading-relaxed">
          Select a citation to see what the document claims, what the connected sources record, and
          every check that produced the finding.
        </p>
      </div>
    );
  }

  const matched = result.matchedCaseId ? data.cases[result.matchedCaseId] : undefined;
  const matchedParagraph = result.matchedParagraphId
    ? data.paragraphs[result.matchedParagraphId]
    : undefined;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-5">
        <div>
          <StatusPill status={result.status} className="mb-2" />
          <h3 className="font-headline-md text-headline-md text-on-surface leading-tight">
            {citation.claimedCaseTitle ?? citation.rawText}
          </h3>
          <p className="font-citation-mono text-[12px] text-muted mt-1">
            As cited: {citation.rawText}
            {citation.pageNumber ? ` · page ${citation.pageNumber}` : ""}
          </p>
        </div>

        {/* The finding */}
        <section className="rounded-lg border border-outline-variant bg-surface-container-low/60 p-3">
          <p className="text-body-md text-on-surface leading-relaxed">{result.explanation}</p>
          <div className="flex items-center gap-3 mt-2 font-citation-mono text-[11px] text-muted">
            <span>Confidence {Math.round(result.score * 100)}%</span>
            <span>
              {result.modelVersion
                ? `Proposition step used ${result.modelVersion}`
                : "Deterministic — no model consulted"}
            </span>
          </div>
        </section>

        {/* Claimed vs authoritative */}
        <section>
          <PanelHeading icon="compare_arrows" title="Claimed vs. authoritative" className="mb-2" />
          <div className="rounded-lg border border-outline-variant overflow-hidden">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="bg-surface-container-high">
                  <th scope="col" className="text-left px-2.5 py-1.5 font-label-md text-label-md uppercase tracking-wider">
                    Field
                  </th>
                  <th scope="col" className="text-left px-2.5 py-1.5 font-label-md text-label-md uppercase tracking-wider">
                    Document states
                  </th>
                  <th scope="col" className="text-left px-2.5 py-1.5 font-label-md text-label-md uppercase tracking-wider">
                    Connected sources
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.claimedVsActual.map((row, index) => (
                  <tr
                    key={row.field}
                    className={cn(
                      "border-t border-outline-variant",
                      index % 2 === 1 && "bg-[#F8FAFC]",
                      !row.agrees && "bg-mismatch-surface",
                    )}
                  >
                    <th scope="row" className="text-left px-2.5 py-1.5 font-medium text-on-surface align-top">
                      {row.field}
                    </th>
                    <td className="px-2.5 py-1.5 align-top text-on-surface-variant break-words">
                      {row.claimed ?? "—"}
                    </td>
                    <td
                      className={cn(
                        "px-2.5 py-1.5 align-top break-words",
                        row.agrees ? "text-on-surface-variant" : "text-mismatch-ink font-medium",
                      )}
                    >
                      {row.authoritative ?? "No matching record"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quoted words side by side */}
        {citation.claimedQuotation && (
          <section>
            <PanelHeading icon="format_quote" title="Quoted passage" className="mb-2" />
            <div className="space-y-2">
              <div className="rounded-lg border border-outline-variant p-3">
                <p className="font-label-md text-label-md uppercase tracking-wider text-muted mb-1">
                  As quoted in the document
                </p>
                <p className="font-judgment-editorial text-[17px] leading-[28px] text-on-surface italic">
                  “{citation.claimedQuotation}”
                </p>
              </div>

              {matchedParagraph ? (
                <div className="rounded-lg border border-outline-variant border-l-[3px] border-l-secondary bg-surface-container-low/60 p-3">
                  <p className="font-label-md text-label-md uppercase tracking-wider text-secondary mb-1">
                    Closest indexed passage — ¶ {matchedParagraph.paragraphNumber}
                  </p>
                  <p className="font-judgment-editorial text-[17px] leading-[28px] text-on-surface">
                    {matchedParagraph.text}
                  </p>
                  <ProvenanceDisclosure
                    evidence={matchedParagraph.provenance}
                    label="Passage source"
                    className="mt-2"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-mismatch-border bg-mismatch-surface p-3">
                  <p className="text-body-sm text-mismatch-ink">
                    No indexed passage could be retrieved to compare against this quotation.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* The proposition drawn */}
        {citation.claimedProposition && (
          <section>
            <PanelHeading icon="auto_awesome" title="Proposition drawn" className="mb-2" />
            <p className="text-body-md text-on-surface leading-relaxed rounded-lg border border-outline-variant p-3">
              {citation.claimedProposition}
            </p>
          </section>
        )}

        {/* Checks run */}
        <section>
          <PanelHeading icon="shield" title={`Checks run (${result.checks.length})`} className="mb-2" />
          <ul className="space-y-2.5">
            {result.checks.map((check) => (
              <li key={check.id} className="flex gap-2.5">
                <Icon
                  name={OUTCOME_ICONS[check.outcome] ?? "info"}
                  size={16}
                  className={cn("mt-0.5 shrink-0", OUTCOME_STYLES[check.outcome])}
                />
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-on-surface">
                    {check.label}
                    {!check.deterministic && (
                      <span className="ml-1.5 font-statute-code text-statute-code uppercase text-review-ink">
                        model-assisted
                      </span>
                    )}
                  </p>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {check.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Matched authority + actions */}
        {matched && (
          <section>
            <PanelHeading icon="folder_open" title="Matched authority" className="mb-2" />
            <div className="rounded-lg border border-outline-variant p-3">
              <Link
                href={`/cases/${matched.id}`}
                className="font-headline-md text-body-lg text-on-surface hover:text-secondary leading-snug"
              >
                {matched.title}
              </Link>
              <p className="mt-1">
                <CitationStamp
                  value={[matched.neutralCitation, ...matched.reporterCitations]
                    .filter(Boolean)
                    .join("  |  ")}
                />
              </p>
              <p className="text-body-sm text-on-surface-variant mt-0.5">
                {matched.court}
                {matched.decisionDate ? ` · ${matched.decisionDate}` : ""}
              </p>
              <ProvenanceDisclosure evidence={matched.provenance} label="Record source" className="mt-2" />
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <PinButton
            nodeType="EVIDENCE"
            entityId={citation.id}
            label="Pin finding to board"
            variant="accent"
          />
          {matched && <PinButton nodeType="CASE" entityId={matched.id} label="Pin authority" />}
        </div>

        <ProvenanceDisclosure evidence={result.evidence} label="All evidence for this finding" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Workspace                                                           */
/* ------------------------------------------------------------------ */

type MobileTab = "document" | "issues";
type SheetSnap = "collapsed" | "half" | "full";

export function ReviewWorkspace({ data }: { data: ReviewData }) {
  const firstIssue =
    data.analysis.results.find((r) => r.status !== "VERIFIED") ?? data.analysis.results[0];
  const [selectedId, setSelectedId] = useState<string | undefined>(
    firstIssue?.extractedCitationId,
  );
  const [tab, setTab] = useState<MobileTab>("issues");
  const [snap, setSnap] = useState<SheetSnap>("collapsed");

  const result = data.analysis.results.find((r) => r.extractedCitationId === selectedId);
  const citation = data.analysis.citations.find((c) => c.id === selectedId);

  const select = (id: string) => {
    setSelectedId(id);
    setSnap("half");
    // Bring the matching span into view in the source pane.
    document.getElementById(`span-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const sheetHeight: Record<SheetSnap, string> = {
    collapsed: "18vh",
    half: "55vh",
    full: "92vh",
  };

  return (
    <>
      {/* Desktop: three synchronized panes */}
      <div className="hidden lg:grid grid-cols-[minmax(0,1.1fr)_320px_minmax(0,1.2fr)] h-[calc(100vh-170px)] min-h-[560px] border-t border-outline-variant">
        <div className="border-r border-outline-variant min-w-0">
          <div className="px-4 py-2 border-b border-outline-variant bg-surface-container-low">
            <PanelHeading icon="description" title="Source document" />
          </div>
          <div className="h-[calc(100%-45px)]">
            <SourcePane
              text={data.analysis.text ?? ""}
              citations={data.analysis.citations}
              selectedId={selectedId}
              onSelect={select}
            />
          </div>
        </div>

        <div className="border-r border-outline-variant bg-surface-container-low/40 min-w-0">
          <div className="px-4 py-2 border-b border-outline-variant bg-surface-container-low">
            <PanelHeading
              icon="verified"
              title="Findings"
              trailing={
                <span className="font-citation-mono text-[11px] text-muted">
                  {data.analysis.summary.issues} to review
                </span>
              }
            />
          </div>
          <div className="h-[calc(100%-45px)]">
            <IssueList data={data} selectedId={selectedId} onSelect={select} />
          </div>
        </div>

        <div className="bg-surface-container-lowest min-w-0">
          <div className="px-4 py-2 border-b border-outline-variant bg-surface-container-low">
            <PanelHeading icon="shield" title="Evidence" />
          </div>
          <div className="h-[calc(100%-45px)]">
            <EvidencePane data={data} result={result} citation={citation} />
          </div>
        </div>
      </div>

      {/* Mobile: tabs + bottom sheet */}
      <div className="lg:hidden border-t border-outline-variant">
        <div className="flex border-b border-outline-variant bg-surface-container-lowest sticky top-0 z-10">
          {(["issues", "document"] as MobileTab[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-current={tab === value ? "page" : undefined}
              className={cn(
                "flex-1 py-2.5 text-body-sm font-label-md capitalize transition-colors border-b-2",
                tab === value
                  ? "border-secondary text-secondary"
                  : "border-transparent text-on-surface-variant",
              )}
            >
              {value === "issues" ? `Findings (${data.analysis.summary.total})` : "Document"}
            </button>
          ))}
        </div>

        <div className="h-[calc(100vh-300px)] min-h-[320px]">
          {tab === "issues" ? (
            <IssueList data={data} selectedId={selectedId} onSelect={select} />
          ) : (
            <SourcePane
              text={data.analysis.text ?? ""}
              citations={data.analysis.citations}
              selectedId={selectedId}
              onSelect={select}
            />
          )}
        </div>

        {/* Evidence bottom sheet */}
        {result && citation && (
          <div
            className="fixed inset-x-0 bottom-16 z-30 bg-surface-container-lowest border-t border-outline-variant rounded-t-xl shadow-layer2 transition-[height] duration-300 ease-out flex flex-col"
            style={{ height: sheetHeight[snap] }}
          >
            <button
              type="button"
              onClick={() =>
                setSnap((current) =>
                  current === "collapsed" ? "half" : current === "half" ? "full" : "collapsed",
                )
              }
              className="shrink-0 py-2 flex flex-col items-center gap-1 border-b border-outline-variant"
              aria-label="Resize evidence panel"
            >
              <span className="w-10 h-1 rounded-full bg-outline-variant" />
              <span className="font-label-md text-label-md uppercase tracking-wider text-muted">
                Evidence — {citation.rawText}
              </span>
            </button>
            <div className="flex-1 min-h-0">
              <EvidencePane data={data} result={result} citation={citation} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
