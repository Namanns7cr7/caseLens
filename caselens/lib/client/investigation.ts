"use client";

import type { GraphNodeType, Investigation, InvestigationNode } from "@/types/domain";

/**
 * Client-side helpers for the active investigation.
 *
 * Pinning happens from search results, dossiers, the graph and the review
 * pane, so "which board am I pinning to" has to be answerable from anywhere.
 * The active board id is remembered per browser; the board itself lives on
 * the server and is owned by the session cookie.
 */

const ACTIVE_KEY = "caselens.activeInvestigation";

export function readActiveInvestigationId(): string | undefined {
  try {
    return window.localStorage.getItem(ACTIVE_KEY) ?? undefined;
  } catch {
    // Private browsing or blocked storage: fall back to creating a board.
    return undefined;
  }
}

export function writeActiveInvestigationId(id: string): void {
  try {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // Non-fatal: the caller still has the id for this interaction.
  }
}

export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => undefined)) as
    | (T & { error?: { code: string; message: string } })
    | undefined;

  if (!response.ok || payload?.error) {
    throw new ApiError(
      payload?.error?.code ?? "INTERNAL_ERROR",
      payload?.error?.message ?? "That request could not be completed.",
    );
  }
  return payload as T;
}

export async function createInvestigation(title: string, description?: string): Promise<Investigation> {
  const { investigation } = await request<{ investigation: Investigation }>("/api/investigations", {
    method: "POST",
    body: JSON.stringify({ title, ...(description ? { description } : {}) }),
  });
  writeActiveInvestigationId(investigation.id);
  return investigation;
}

/**
 * Returns the active board, creating one on first pin so the user is never
 * asked to set up a board before they can save evidence.
 */
export async function ensureActiveInvestigation(): Promise<string> {
  const existing = readActiveInvestigationId();
  if (existing) {
    try {
      await request<{ investigation: Investigation }>(`/api/investigations/${existing}`);
      return existing;
    } catch {
      // Stale id (server restarted, or a different session): start a new board.
    }
  }
  const investigation = await createInvestigation("Untitled investigation");
  return investigation.id;
}

/** Lays new cards out on a loose grid so pins never land on top of each other. */
export function nextPosition(existingCount: number): { x: number; y: number } {
  const column = existingCount % 3;
  const row = Math.floor(existingCount / 3);
  return { x: 80 + column * 320, y: 80 + row * 220 };
}

export async function pinToInvestigation(input: {
  investigationId: string;
  nodeType: GraphNodeType;
  entityId?: string;
  note?: string;
  position?: { x: number; y: number };
}): Promise<InvestigationNode> {
  const { investigation } = await request<{ investigation: Investigation }>(
    `/api/investigations/${input.investigationId}`,
  );
  const position = input.position ?? nextPosition(investigation.nodes.length);

  const { node } = await request<{ node: InvestigationNode }>(
    `/api/investigations/${input.investigationId}/nodes`,
    {
      method: "POST",
      body: JSON.stringify({
        nodeType: input.nodeType,
        ...(input.entityId ? { entityId: input.entityId } : {}),
        ...(input.note ? { note: input.note } : {}),
        ...position,
      }),
    },
  );
  return node;
}

export async function moveInvestigationNode(
  investigationId: string,
  nodeId: string,
  x: number,
  y: number,
): Promise<void> {
  await request(`/api/investigations/${investigationId}/nodes/${nodeId}`, {
    method: "PATCH",
    body: JSON.stringify({ x, y }),
  });
}

export async function deleteInvestigationNode(
  investigationId: string,
  nodeId: string,
): Promise<void> {
  await request(`/api/investigations/${investigationId}/nodes/${nodeId}`, { method: "DELETE" });
}

export async function createInvestigationEdge(input: {
  investigationId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
}): Promise<void> {
  await request(`/api/investigations/${input.investigationId}/edges`, {
    method: "POST",
    body: JSON.stringify({
      sourceNodeId: input.sourceNodeId,
      targetNodeId: input.targetNodeId,
      relationshipType: "USER_LINK",
      ...(input.label ? { label: input.label } : {}),
    }),
  });
}
