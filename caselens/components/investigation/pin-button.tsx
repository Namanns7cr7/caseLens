"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { ensureActiveInvestigation, pinToInvestigation } from "@/lib/client/investigation";
import type { GraphNodeType } from "@/types/domain";

/**
 * Pins an entity to the active Investigation Board.
 *
 * Creating a board is implicit: an investigator who finds something worth
 * keeping should not have to set up a container first. Once pinned, the
 * button becomes a link to the board so the next action is one click away.
 */

type State = "idle" | "pinning" | "pinned" | "error";

export function PinButton({
  nodeType,
  entityId,
  label = "Pin to board",
  note,
  investigationId: fixedInvestigationId,
  variant = "secondary",
  className,
}: {
  nodeType: GraphNodeType;
  entityId?: string;
  label?: string;
  note?: string;
  investigationId?: string;
  variant?: "secondary" | "accent";
  className?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const [boardId, setBoardId] = useState<string | undefined>(fixedInvestigationId);
  const [message, setMessage] = useState<string>();

  const pin = async () => {
    setState("pinning");
    setMessage(undefined);
    try {
      const investigationId = fixedInvestigationId ?? (await ensureActiveInvestigation());
      await pinToInvestigation({
        investigationId,
        nodeType,
        ...(entityId ? { entityId } : {}),
        ...(note ? { note } : {}),
      });
      setBoardId(investigationId);
      setState("pinned");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not pin that.");
    }
  };

  if (state === "pinned" && boardId) {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-verified-border bg-verified-surface text-verified-ink text-body-sm font-label-md">
          <Icon name="check_circle" size={16} />
          Pinned
        </span>
        <Link
          href={`/investigations/${boardId}`}
          className="text-body-sm font-label-md text-secondary hover:underline"
        >
          Open board →
        </Link>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex flex-col gap-1", className)}>
      <button
        type="button"
        onClick={pin}
        disabled={state === "pinning"}
        className={variant === "accent" ? "cl-btn-accent" : "cl-btn-secondary"}
      >
        <Icon
          name={state === "pinning" ? "progress_activity" : "push_pin"}
          size={16}
          className={state === "pinning" ? "animate-spin" : undefined}
        />
        {state === "pinning" ? "Pinning…" : label}
      </button>
      {state === "error" && message && (
        <span role="alert" className="text-[12px] text-error">
          {message}
        </span>
      )}
    </span>
  );
}
