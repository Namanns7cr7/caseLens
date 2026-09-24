import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { PanelHeading } from "@/components/ui/primitives";
import type { SearchResponse } from "@/types/domain";

/**
 * Right-hand analytics drawer.
 *
 * Every number here is computed from the result set that is on screen — the
 * panel describes the current query rather than asserting anything about the
 * law, so it needs no provenance of its own. Where it does name authorities,
 * it links to the dossier that carries theirs.
 */

const STATUS_LABELS: Record<string, string> = {
  BINDING_LANDMARK: "Binding landmark",
  AFFIRMED_FOLLOWED: "Affirmed / followed",
  DISTINGUISHED: "Distinguished",
  OVERRULED: "Superseded",
  PENDING: "Pending",
};

export function SearchAnalytics({
  response,
  query,
}: {
  response: SearchResponse;
  query: string;
}) {
  const { facets, results, pagination } = response;

  const years = [...facets.years].sort((a, b) => a.value.localeCompare(b.value));
  const peak = Math.max(1, ...years.map((y) => y.count));

  const settled = facets.doctrinalStatus.find((s) => s.value === "BINDING_LANDMARK")?.count ?? 0;
  const superseded = facets.doctrinalStatus.find((s) => s.value === "OVERRULED")?.count ?? 0;
  const cautionary = facets.doctrinalStatus.find((s) => s.value === "DISTINGUISHED")?.count ?? 0;
  const statusTotal = Math.max(1, settled + superseded + cautionary);

  return (
    <div className="flex flex-col gap-5 p-4 w-full">
      <PanelHeading icon="analytics" title="Result analytics" />

      {/* What the current result set consists of */}
      <div className="p-3.5 rounded-xl bg-surface-container border border-secondary/30">
        <div className="flex items-center gap-2 text-secondary mb-2">
          <Icon name="auto_awesome" size={16} />
          <span className="text-label-md font-label-md uppercase tracking-wider font-bold">
            Result composition
          </span>
        </div>
        <p className="text-body-sm text-on-surface leading-relaxed">
          {pagination.total === 0 ? (
            <>No indexed authority matches this query.</>
          ) : (
            <>
              <strong>{pagination.total}</strong>{" "}
              {pagination.total === 1 ? "authority" : "authorities"}
              {query ? (
                <>
                  {" "}
                  match <span className="font-citation-mono">“{query}”</span>
                </>
              ) : (
                " are indexed"
              )}
              {settled > 0 && (
                <>
                  , of which <strong>{settled}</strong>{" "}
                  {settled === 1 ? "is recorded" : "are recorded"} as binding landmark
                  {settled === 1 ? "" : "s"}
                </>
              )}
              {superseded > 0 && (
                <>
                  {" "}
                  and <strong>{superseded}</strong> as superseded
                </>
              )}
              .
            </>
          )}
        </p>
        <span className="font-statute-code text-statute-code text-on-surface-variant text-[11px] block mt-2">
          Counts describe the indexed corpus, not the whole of Indian case law.
        </span>
      </div>

      {/* Decision-year distribution */}
      {years.length > 0 && (
        <section className="border-b border-outline-variant pb-4">
          <span className="text-label-md font-label-md text-on-surface block mb-2">
            Decision years in this result set
          </span>
          <div className="flex items-end gap-1.5 h-24 pt-4 px-1 border-b border-outline-variant">
            {years.map((year) => (
              <div key={year.value} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
                <div
                  className="w-full bg-surface-container-high group-hover:bg-secondary rounded-t transition-colors"
                  style={{ height: `${Math.max(8, (year.count / peak) * 100)}%` }}
                  title={`${year.count} in ${year.value}`}
                />
                <span className="text-[9px] font-citation-mono text-muted">
                  &apos;{year.value.slice(2)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Doctrinal disposition */}
      {facets.doctrinalStatus.length > 0 && (
        <section className="border-b border-outline-variant pb-4">
          <span className="text-label-md font-label-md text-on-surface block mb-2">
            Doctrinal disposition
          </span>
          <div className="w-full h-3 rounded-full bg-surface-container-high overflow-hidden flex mb-2">
            {settled > 0 && (
              <div className="h-full bg-verified" style={{ width: `${(settled / statusTotal) * 100}%` }} />
            )}
            {cautionary > 0 && (
              <div className="h-full bg-review" style={{ width: `${(cautionary / statusTotal) * 100}%` }} />
            )}
            {superseded > 0 && (
              <div className="h-full bg-error" style={{ width: `${(superseded / statusTotal) * 100}%` }} />
            )}
          </div>
          <div className="space-y-1.5 font-statute-code text-[12px]">
            {facets.doctrinalStatus.map((status) => (
              <div key={status.value} className="flex items-center justify-between gap-2">
                <span className="truncate">{STATUS_LABELS[status.value] ?? status.label}</span>
                <span className="font-bold text-on-surface shrink-0">{status.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Statutory anchors */}
      {facets.sections.length > 0 && (
        <section className="border-b border-outline-variant pb-4">
          <span className="text-label-md font-label-md text-on-surface block mb-2">
            Statutory anchors
          </span>
          <div className="space-y-1.5">
            {facets.sections.slice(0, 6).map((section) => (
              <div key={section.value} className="flex items-center justify-between gap-2 text-body-sm">
                <span className="font-statute-code text-secondary font-bold truncate">
                  {section.label.split(" — ")[0]}
                </span>
                <span className="font-citation-mono text-[11px] text-muted shrink-0">
                  {section.count} {section.count === 1 ? "case" : "cases"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Leading authorities on screen */}
      {results.length > 0 && (
        <section>
          <span className="text-label-md font-label-md text-on-surface block mb-2">
            Leading authorities
          </span>
          <div className="space-y-2">
            {results.slice(0, 3).map((hit) => (
              <Link
                key={hit.case.id}
                href={`/cases/${hit.case.id}`}
                className="block p-2 rounded border border-transparent hover:border-outline-variant hover:bg-surface-container-low transition-colors"
              >
                <div className="flex justify-between items-center gap-2 text-body-sm">
                  <span className="font-semibold text-on-surface truncate">{hit.case.title}</span>
                  <span className="font-citation-mono text-secondary text-statute-code font-bold shrink-0">
                    {Math.round(hit.score * 100)}%
                  </span>
                </div>
                <span className="text-[11px] font-citation-mono text-muted">
                  {hit.case.courtShortName}
                  {hit.case.benchStrength ? ` • ${hit.case.benchStrength}-judge` : ""}
                  {hit.case.decisionDate ? ` • ${hit.case.decisionDate.slice(0, 4)}` : ""}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-auto pt-2">
        <Link href="/verify" className="cl-btn-primary w-full">
          <Icon name="file_search" size={18} />
          Verify a document against these
        </Link>
      </div>
    </div>
  );
}
