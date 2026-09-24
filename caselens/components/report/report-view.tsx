"use client";

import { Icon } from "@/components/ui/icon";
import { StatusPill } from "@/components/ui/primitives";
import { AuthorityChip } from "@/components/ui/provenance";
import type { Report } from "@/types/domain";

/**
 * Printable report.
 *
 * The layout is a document, not a dashboard: a single measured column, serif
 * body, and every entry followed by the sources behind it. Print styles in
 * globals.css strip the chrome so the browser's own "save as PDF" produces a
 * clean artefact — no separate export pipeline to drift out of sync with
 * what the reader saw on screen.
 */

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportView({ report }: { report: Report }) {
  return (
    <article className="max-w-[860px] mx-auto px-space-md lg:px-space-lg py-space-lg">
      {/* Action bar — omitted from print */}
      <div className="cl-no-print flex flex-wrap items-center justify-between gap-2 mb-space-lg">
        <span className="font-statute-code text-statute-code uppercase tracking-wider text-muted">
          {report.kind === "INTEGRITY" ? "Legal integrity report" : "Investigation report"}
        </span>
        <button type="button" onClick={() => window.print()} className="cl-btn-primary">
          <Icon name="file_download" size={16} />
          Print or save as PDF
        </button>
      </div>

      {/* Masthead */}
      <header className="border-b-2 border-primary pb-4 mb-space-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded bg-primary flex items-center justify-center text-white">
            <Icon name="gavel" size={16} />
          </span>
          <span className="font-headline-md text-body-lg font-semibold tracking-tight">CaseLens</span>
          <span className="font-statute-code text-statute-code text-muted uppercase tracking-widest ml-auto">
            {report.subtitle}
          </span>
        </div>

        <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-primary leading-tight">
          {report.title}
        </h1>
        <p className="font-citation-mono text-[12px] text-muted mt-2">
          Generated {formatTimestamp(report.generatedAt)} · Report {report.id}
        </p>
      </header>

      {/* Sections */}
      <div className="space-y-space-xl">
        {report.sections.map((section) => (
          <section key={section.id} className="break-inside-avoid">
            <h2 className="font-headline-md text-headline-md text-primary border-b border-outline-variant pb-1.5 mb-3">
              {section.heading}
            </h2>

            {section.body && (
              <p className="text-body-md text-on-surface-variant leading-relaxed mb-4">
                {section.body}
              </p>
            )}

            {section.entries.length > 0 && (
              <ol className="space-y-5">
                {section.entries.map((entry, index) => (
                  <li key={`${section.id}-${index}`} className="break-inside-avoid">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-headline-md text-body-lg text-on-surface leading-snug">
                        {entry.title}
                      </h3>
                      {entry.status && <StatusPill status={entry.status} />}
                    </div>

                    {entry.subtitle && (
                      <p className="font-citation-mono text-[12px] text-muted mt-0.5 break-words">
                        {entry.subtitle}
                      </p>
                    )}

                    {entry.detail && (
                      <p className="font-judgment-editorial text-[17px] leading-[28px] text-on-surface mt-2 whitespace-pre-wrap">
                        {entry.detail}
                      </p>
                    )}

                    {entry.provenance.length > 0 && (
                      <div className="mt-2.5 pl-3 border-l-2 border-outline-variant space-y-1.5">
                        <p className="font-label-md text-label-md uppercase tracking-wider text-muted">
                          Sources
                        </p>
                        {entry.provenance.map((ref, refIndex) => (
                          <div key={`${ref.sourceUrl}-${refIndex}`} className="text-body-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <AuthorityChip level={ref.authorityLevel} />
                              <span className="text-on-surface">{ref.sourceName}</span>
                            </div>
                            {ref.sourceUrl && (
                              <a
                                href={ref.sourceUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="font-citation-mono text-[11px] text-secondary hover:underline break-all"
                              >
                                {ref.sourceUrl}
                              </a>
                            )}
                            {ref.note && (
                              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                                {ref.note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>

      {/* Disclaimer */}
      <footer className="mt-space-xl pt-4 border-t-2 border-primary">
        <p className="font-label-md text-label-md uppercase tracking-wider text-muted mb-1.5">
          Limitations
        </p>
        <p className="text-body-sm text-on-surface-variant leading-relaxed">{report.disclaimer}</p>
      </footer>
    </article>
  );
}
