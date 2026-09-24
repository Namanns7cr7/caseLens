import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Icon } from "@/components/ui/icon";
import { CardSkeleton, EmptyState } from "@/components/ui/primitives";
import { CaseCard } from "@/components/case/case-card";
import { FilterDrawer, FilterRail } from "@/components/search/filter-rail";
import { SearchAnalytics } from "@/components/search/search-analytics";
import { search, type SearchQuery } from "@/server/services/search-service";

export const metadata: Metadata = { title: "Case finder" };

type SearchParams = Record<string, string | string[] | undefined>;

function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const values = (Array.isArray(value) ? value : [value])
    .flatMap((entry) => entry.split(","))
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
}

function toQuery(params: SearchParams): SearchQuery {
  const page = Number(Array.isArray(params.page) ? params.page[0] : (params.page ?? 1));
  return {
    q: (Array.isArray(params.q) ? params.q[0] : params.q) ?? "",
    ...(toArray(params.court) ? { court: toArray(params.court) } : {}),
    ...(toArray(params.year) ? { year: toArray(params.year) } : {}),
    ...(toArray(params.act) ? { act: toArray(params.act) } : {}),
    ...(toArray(params.section) ? { section: toArray(params.section) } : {}),
    ...(toArray(params.judge) ? { judge: toArray(params.judge) } : {}),
    ...(toArray(params.benchStrength) ? { benchStrength: toArray(params.benchStrength) } : {}),
    ...(toArray(params.doctrinalStatus) ? { doctrinalStatus: toArray(params.doctrinalStatus) } : {}),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 10,
  };
}

function Pagination({
  page,
  totalPages,
  params,
}: {
  page: number;
  totalPages: number;
  params: SearchParams;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || value === undefined) continue;
      for (const entry of Array.isArray(value) ? value : [value]) next.append(key, entry);
    }
    next.set("page", String(target));
    return `/search?${next.toString()}`;
  };

  return (
    <nav className="flex items-center justify-between pt-4 mt-4 border-t border-outline-variant" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className="cl-btn-secondary">
          <Icon name="arrow_back" size={16} />
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="font-citation-mono text-[12px] text-muted">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className="cl-btn-secondary">
          Next
          <Icon name="arrow_forward" size={16} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

async function Results({ params }: { params: SearchParams }) {
  const query = toQuery(params);
  const response = search(query);
  const { results, facets, pagination, queryTimeMs } = response;

  return (
    <div className="flex-1 flex min-h-0">
      {/* Telemetry bar + results feed */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="bg-surface-container-lowest border-b border-outline-variant px-space-md lg:px-space-lg py-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-high border border-outline-variant font-statute-code text-statute-code text-on-surface">
                <span className="w-2 h-2 rounded-full bg-on-tertiary-container" />
                {pagination.total} {pagination.total === 1 ? "AUTHORITY" : "AUTHORITIES"}
              </span>
              <span className="text-body-sm text-muted hidden sm:inline">•</span>
              <span className="font-citation-mono text-[12px] text-muted hidden sm:inline">
                Search latency: {queryTimeMs}ms
              </span>
              <span className="text-body-sm text-muted hidden md:inline">•</span>
              <span className="text-body-sm text-on-surface-variant hidden md:flex items-center gap-1">
                <Icon name="hub" size={15} className="text-secondary" />
                Hybrid retrieval: identifier, title, statute and passage
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FilterDrawer facets={facets} />
            </div>
          </div>
        </div>

        <section className="flex-1 overflow-y-auto px-space-md lg:px-space-lg py-4 bg-canvas">
          {results.length === 0 ? (
            <EmptyState
              icon="search"
              title="No authority in the connected sources matches this query"
              description={
                query.q
                  ? `Nothing indexed matches “${query.q}” under the current filters. Clear a filter, or try the party name, the neutral citation, or the statutory section — for example “section 14 IBC” or “personal guarantor moratorium”.`
                  : "Start by searching for a party, a citation, a judge, or the legal issue you are investigating."
              }
              action={
                <Link href="/search?q=personal+guarantor+moratorium" className="cl-btn-accent">
                  <Icon name="explore" size={16} />
                  Try a sample investigation
                </Link>
              }
            />
          ) : (
            <>
              <div className="space-y-4">
                {results.map((hit, index) => (
                  <CaseCard key={hit.case.id} hit={hit} featured={index === 0 && pagination.page === 1} />
                ))}
              </div>
              <Pagination page={pagination.page} totalPages={pagination.totalPages} params={params} />
            </>
          )}
        </section>
      </div>

      {/* Analytics drawer */}
      <aside className="hidden 2xl:flex w-[320px] shrink-0 border-l border-outline-variant bg-surface-container-lowest overflow-y-auto">
        <SearchAnalytics response={response} query={query.q} />
      </aside>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex-1 px-space-md lg:px-space-lg py-4 bg-canvas space-y-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const facets = search({ ...toQuery(params), pageSize: 1 }).facets;

  return (
    <div className="flex h-full min-h-0">
      {/* Pinned facet rail (desktop) */}
      <aside className="hidden xl:block w-[300px] shrink-0 border-r border-outline-variant bg-surface-container-lowest overflow-y-auto">
        <Suspense fallback={<div className="p-4"><CardSkeleton /></div>}>
          <FilterRail facets={facets} />
        </Suspense>
      </aside>

      <Suspense fallback={<ResultsSkeleton />}>
        <Results params={params} />
      </Suspense>
    </div>
  );
}
