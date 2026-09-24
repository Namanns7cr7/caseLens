"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icon";
import type { SearchFacets, SearchFacetValue } from "@/types/domain";

/**
 * Jurisprudential filter rail.
 *
 * Facet counts come from the server and are computed with each facet's own
 * filter excluded, so selecting a value never causes its siblings to vanish —
 * the rail stays navigable rather than collapsing as you narrow.
 */

const FACET_ORDER: Array<{
  key: keyof SearchFacets;
  param: string;
  label: string;
  icon: IconName;
  hint?: string;
}> = [
  { key: "courts", param: "court", label: "Court jurisdiction", icon: "account_balance" },
  { key: "benchStrength", param: "benchStrength", label: "Bench strength", icon: "groups", hint: "Art. 141 hierarchy" },
  { key: "doctrinalStatus", param: "doctrinalStatus", label: "Doctrinal status", icon: "verified" },
  { key: "sections", param: "section", label: "Statutory sections", icon: "menu_book" },
  { key: "acts", param: "act", label: "Enactments", icon: "layers" },
  { key: "years", param: "year", label: "Decision year", icon: "calendar_month" },
  { key: "judges", param: "judge", label: "Coram", icon: "person" },
];

const STATUS_DOTS: Record<string, string> = {
  BINDING_LANDMARK: "bg-on-tertiary-container",
  AFFIRMED_FOLLOWED: "bg-verified",
  DISTINGUISHED: "bg-review",
  OVERRULED: "bg-error",
  PENDING: "bg-outline",
};

export function FilterRail({ facets, className }: { facets: SearchFacets; className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const selected = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const { param } of FACET_ORDER) {
      map[param] = new Set(searchParams.getAll(param).flatMap((value) => value.split(",")).filter(Boolean));
    }
    return map;
  }, [searchParams]);

  const activeCount = useMemo(
    () => Object.values(selected).reduce((total, set) => total + set.size, 0),
    [selected],
  );

  const toggle = useCallback(
    (param: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = new Set(params.getAll(param).flatMap((v) => v.split(",")).filter(Boolean));
      if (current.has(value)) current.delete(value);
      else current.add(value);

      params.delete(param);
      for (const entry of current) params.append(param, entry);
      params.delete("page");
      router.push(`/search?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    router.push(`/search?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <div className={cn("flex flex-col gap-5 p-4 select-none", className)}>
      <div className="flex items-center justify-between border-b border-outline-variant pb-2.5">
        <div className="flex items-center gap-2">
          <Icon name="tune" size={18} className="text-secondary" />
          <h2 className="text-body-md font-label-md text-on-surface uppercase tracking-wider">
            Jurisprudential filters
          </h2>
        </div>
        <span className="font-statute-code text-statute-code text-secondary bg-surface-container px-2 py-0.5 rounded font-bold">
          {activeCount} ACTIVE
        </span>
      </div>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="self-start text-body-sm font-label-md text-secondary hover:underline"
        >
          Clear all filters
        </button>
      )}

      {FACET_ORDER.map(({ key, param, label, icon, hint }) => {
        const values: SearchFacetValue[] = facets[key];
        if (values.length === 0) return null;
        const isCollapsed = collapsed[param] ?? false;
        const chosen = selected[param] ?? new Set<string>();

        return (
          <section key={param} className="border-b border-outline-variant pb-4 last:border-b-0">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setCollapsed((prev) => ({ ...prev, [param]: !isCollapsed }))}
                aria-expanded={!isCollapsed}
                className="text-label-md font-label-md text-on-surface flex items-center gap-1.5 rounded"
              >
                <Icon name={icon} size={16} className="text-muted" />
                {label}
                <Icon name={isCollapsed ? "chevron_right" : "expand_more"} size={14} className="text-muted" />
              </button>
              {hint && (
                <span className="text-[10px] font-statute-code text-muted uppercase tracking-wider">
                  {hint}
                </span>
              )}
            </div>

            {!isCollapsed && (
              <div className="space-y-1.5">
                {values.map((value) => {
                  const isChosen = chosen.has(value.value);
                  return (
                    <label
                      key={value.value}
                      className={cn(
                        "flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors gap-2",
                        isChosen
                          ? "bg-secondary-fixed/40 border border-secondary"
                          : "border border-transparent hover:bg-surface-container-low",
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChosen}
                          onChange={() => toggle(param, value.value)}
                          className="rounded border-outline text-secondary focus:ring-secondary w-4 h-4 shrink-0"
                        />
                        {key === "doctrinalStatus" && (
                          <span
                            className={cn(
                              "inline-block w-2.5 h-2.5 rounded-full shrink-0",
                              STATUS_DOTS[value.value] ?? "bg-outline",
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            "text-body-sm truncate",
                            isChosen ? "font-semibold text-on-secondary-fixed" : "text-on-surface",
                          )}
                          title={value.label}
                        >
                          {value.label}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "font-statute-code text-statute-code px-1.5 py-0.5 rounded shrink-0",
                          isChosen
                            ? "bg-secondary text-white"
                            : "bg-surface-container-lowest text-on-surface-variant border border-outline-variant",
                        )}
                      >
                        {value.count}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Mobile presentation of the same rail, as a slide-over drawer. */
export function FilterDrawer({ facets }: { facets: SearchFacets }) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const activeCount = FACET_ORDER.reduce(
    (total, { param }) =>
      total + searchParams.getAll(param).flatMap((v) => v.split(",")).filter(Boolean).length,
    0,
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="cl-btn-secondary xl:hidden">
        <Icon name="tune" size={16} />
        Filters
        {activeCount > 0 && (
          <span className="ml-1 px-1.5 rounded bg-secondary text-white font-statute-code text-statute-code">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex xl:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[rgba(15,37,55,0.45)] backdrop-blur-[4px]"
          />
          <div className="relative ml-auto w-[300px] max-w-[88vw] h-full bg-surface-container-lowest border-l border-outline-variant overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container-lowest">
              <span className="font-label-md text-label-md uppercase tracking-wider">Filters</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 text-on-surface-variant hover:bg-surface-container-low rounded-lg"
                aria-label="Close filters"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <FilterRail facets={facets} />
          </div>
        </div>
      )}
    </>
  );
}
