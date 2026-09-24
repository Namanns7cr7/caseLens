"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { CardSkeleton, EmptyState } from "@/components/ui/primitives";
import { createInvestigation, writeActiveInvestigationId } from "@/lib/client/investigation";
import type { Investigation } from "@/types/domain";

/**
 * Lists the current session's investigation boards.
 *
 * Rendered on the client because ownership is anchored to the session cookie
 * and the list changes as the user pins from elsewhere in the app.
 */

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InvestigationList({ limit, showCreate = true }: { limit?: number; showCreate?: boolean }) {
  const [investigations, setInvestigations] = useState<Investigation[]>();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/investigations");
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { investigations: Investigation[] };
      setInvestigations(payload.investigations);
    } catch {
      setInvestigations([]);
      setError("Investigations could not be loaded.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async () => {
    const name = title.trim() || "Untitled investigation";
    try {
      const investigation = await createInvestigation(name);
      setTitle("");
      setCreating(false);
      setInvestigations((current) => [investigation, ...(current ?? [])]);
    } catch {
      setError("That investigation could not be created.");
    }
  }, [title]);

  if (investigations === undefined) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const shown = limit ? investigations.slice(0, limit) : investigations;

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <EmptyState
          icon="account_tree"
          title="No investigation board yet"
          description="A board is where pinned authorities, provisions, evidence and your own notes sit together. One is created the first time you pin something — or start one now."
          action={
            showCreate ? (
              <button type="button" onClick={() => setCreating(true)} className="cl-btn-accent">
                <Icon name="add_circle" size={16} />
                Start an investigation
              </button>
            ) : (
              <Link href="/search" className="cl-btn-accent">
                <Icon name="search" size={16} />
                Find an authority to pin
              </Link>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {shown.map((investigation) => {
            const flagged = investigation.nodes.filter(
              (node) =>
                node.metadata.verificationStatus &&
                node.metadata.verificationStatus !== "VERIFIED",
            ).length;

            return (
              <Link
                key={investigation.id}
                href={`/investigations/${investigation.id}`}
                onClick={() => writeActiveInvestigationId(investigation.id)}
                className="cl-card p-4 hover:border-secondary transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="account_tree" size={16} className="text-secondary" />
                  <span className="font-statute-code text-statute-code uppercase text-muted">
                    {investigation.nodes.length} pinned
                  </span>
                  {flagged > 0 && (
                    <span className="ml-auto font-statute-code text-statute-code uppercase px-1.5 py-0.5 rounded border border-review-border bg-review-surface text-review-ink">
                      {flagged} flagged
                    </span>
                  )}
                </div>
                <p className="font-headline-md text-body-lg text-on-surface leading-snug group-hover:text-secondary transition-colors">
                  {investigation.title}
                </p>
                {investigation.description && (
                  <p className="text-body-sm text-on-surface-variant mt-1 line-clamp-2">
                    {investigation.description}
                  </p>
                )}
                <p className="font-citation-mono text-[11px] text-muted mt-2">
                  Updated {formatTimestamp(investigation.updatedAt)}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {showCreate && shown.length > 0 && (
        <div>
          {creating ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void create();
                  if (event.key === "Escape") setCreating(false);
                }}
                placeholder="What are you investigating?"
                autoFocus
                className="flex-1 min-w-[220px] rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5 text-body-md focus:border-secondary focus:ring-1 focus:ring-secondary"
              />
              <button type="button" onClick={() => void create()} className="cl-btn-accent">
                Create
              </button>
              <button type="button" onClick={() => setCreating(false)} className="cl-btn-secondary">
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setCreating(true)} className="cl-btn-secondary">
              <Icon name="add_circle" size={16} />
              New investigation
            </button>
          )}
        </div>
      )}
    </div>
  );
}
