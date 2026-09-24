"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

/**
 * The global case finder.
 *
 * Stitch specifies a high-affordance omnibox with a visible ⌘K affordance and
 * a 2px sapphire focus ring that does not displace the field. Suggestions are
 * fetched from the search API, so the box searches the same index the results
 * page does rather than a separate client-side list.
 */

interface Suggestion {
  id: string;
  title: string;
  citation?: string;
  court: string;
  decisionDate?: string;
}

export function Omnibox({
  initialQuery = "",
  className,
  autoFocus = false,
}: {
  initialQuery?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ⌘K / Ctrl-K focuses the finder from anywhere.
   *
   * The shell mounts two omniboxes — one in the header for wide viewports and
   * one in the mobile search row — and only one is displayed at a time. Both
   * listen for the shortcut, so each checks that it is the visible one before
   * taking focus; otherwise the hidden instance would swallow the shortcut at
   * whichever breakpoint it is not shown. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const input = inputRef.current;
        // offsetParent is null for a display:none subtree.
        if (!input || input.offsetParent === null) return;
        event.preventDefault();
        input.focus();
        input.select();
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* Close on outside click. */
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  /* Debounced suggestion fetch. */
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&pageSize=5`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as {
          results: Array<{ case: Suggestion }>;
        };
        setSuggestions(payload.results.map((hit) => hit.case));
        setHighlighted(-1);
      } catch {
        // Aborted or offline: leave the previous suggestions in place.
      }
    }, 160);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const submit = useCallback(
    (value: string) => {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    },
    [router],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlighted((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const picked = suggestions[highlighted];
      if (picked) {
        setOpen(false);
        router.push(`/cases/${picked.id}`);
      } else {
        submit(query);
      }
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="flex items-center border border-outline-variant bg-surface-container-low rounded-lg px-3 py-1.5 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary focus-within:bg-white transition-colors">
        <Icon name="search" size={18} className="text-muted mr-2" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search by party, citation, judge, statute or legal issue"
          aria-label="Search the indexed corpus"
          aria-expanded={open && suggestions.length > 0}
          aria-controls="omnibox-suggestions"
          role="combobox"
          className="flex-1 bg-transparent border-0 p-0 text-body-md text-on-surface placeholder:text-muted focus:outline-none focus:ring-0 min-w-0 [&::-webkit-search-cancel-button]:hidden"
        />
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              title="Clear query"
              aria-label="Clear query"
              className="text-muted hover:text-on-surface p-0.5 rounded"
            >
              <Icon name="close" size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-citation-mono text-muted bg-surface-container rounded border border-outline-variant">
            ⌘K
          </kbd>
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id="omnibox-suggestions"
          role="listbox"
          className="absolute z-50 mt-1 w-full cl-popover overflow-hidden max-h-80 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id} role="option" aria-selected={index === highlighted}>
              <button
                type="button"
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => {
                  setOpen(false);
                  router.push(`/cases/${suggestion.id}`);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 border-b border-outline-variant last:border-b-0 transition-colors",
                  index === highlighted ? "bg-surface-container-low" : "bg-transparent",
                )}
              >
                <span className="block font-headline-md text-body-md text-on-surface truncate">
                  {suggestion.title}
                </span>
                <span className="block font-citation-mono text-[11px] text-muted truncate">
                  {[suggestion.citation, suggestion.court, suggestion.decisionDate?.slice(0, 4)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => submit(query)}
              className="w-full text-left px-3 py-2 bg-surface-container-low text-secondary text-body-sm font-label-md hover:bg-surface-container transition-colors"
            >
              Search all authorities for “{query.trim()}”
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
