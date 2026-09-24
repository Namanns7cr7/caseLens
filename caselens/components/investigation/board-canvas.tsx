"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { EmptyState, PanelHeading, StatusPill } from "@/components/ui/primitives";
import { ProvenanceDisclosure } from "@/components/ui/provenance";
import {
  createInvestigationEdge,
  deleteInvestigationNode,
  moveInvestigationNode,
  pinToInvestigation,
} from "@/lib/client/investigation";
import type { Investigation, InvestigationNode } from "@/types/domain";

/**
 * The spatial Investigation Board.
 *
 * Cards are dragged with pointer events and their positions persisted on
 * release. Edges are SVG paths recomputed from live card positions, so a
 * relationship stays attached to its cards while they move — the behaviour
 * UI_UX_SPEC.md asks for.
 */

const CARD_WIDTH = 268;
const SNAP_TOLERANCE = 8;
const GRID = 8;

const NODE_ICONS = {
  CASE: "gavel",
  PROVISION: "menu_book",
  EVIDENCE: "shield",
  NOTE: "description",
  JUDGE: "person",
  PARTY: "groups",
} as const;

const NODE_LABELS = {
  CASE: "Authority",
  PROVISION: "Provision",
  EVIDENCE: "Evidence",
  NOTE: "Note",
  JUDGE: "Judge",
  PARTY: "Party",
} as const;

interface Guide {
  axis: "x" | "y";
  position: number;
}

export function BoardCanvas({
  investigation: initial,
  readOnly = false,
}: {
  investigation: Investigation;
  readOnly?: boolean;
}) {
  const [investigation, setInvestigation] = useState(initial);
  const [dragging, setDragging] = useState<string | undefined>();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [linkSource, setLinkSource] = useState<string | undefined>();
  const [selected, setSelected] = useState<string | undefined>();
  const [error, setError] = useState<string>();
  const [noteDraft, setNoteDraft] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => setInvestigation(initial), [initial]);

  const updateLocal = useCallback((nodeId: string, x: number, y: number) => {
    setInvestigation((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, x, y } : node)),
    }));
  }, []);

  /** Snaps to nearby card edges, and shows the guide that caused the snap. */
  const snap = useCallback(
    (nodeId: string, x: number, y: number): { x: number; y: number; guides: Guide[] } => {
      const active: Guide[] = [];
      let snappedX = Math.round(x / GRID) * GRID;
      let snappedY = Math.round(y / GRID) * GRID;

      for (const other of investigation.nodes) {
        if (other.id === nodeId) continue;
        if (Math.abs(other.x - x) < SNAP_TOLERANCE) {
          snappedX = other.x;
          active.push({ axis: "x", position: other.x });
        }
        if (Math.abs(other.y - y) < SNAP_TOLERANCE) {
          snappedY = other.y;
          active.push({ axis: "y", position: other.y });
        }
      }
      return { x: snappedX, y: snappedY, guides: active };
    },
    [investigation.nodes],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent, node: InvestigationNode) => {
      if (readOnly) return;
      if ((event.target as HTMLElement).closest("a,button")) return;

      const surface = surfaceRef.current?.getBoundingClientRect();
      if (!surface) return;

      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      dragState.current = {
        id: node.id,
        offsetX: event.clientX - surface.left - node.x,
        offsetY: event.clientY - surface.top - node.y,
      };
      setDragging(node.id);
      setSelected(node.id);
    },
    [readOnly],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const state = dragState.current;
      const surface = surfaceRef.current?.getBoundingClientRect();
      if (!state || !surface) return;

      const rawX = event.clientX - surface.left - state.offsetX;
      const rawY = event.clientY - surface.top - state.offsetY;
      const result = snap(state.id, Math.max(0, rawX), Math.max(0, rawY));
      setGuides(result.guides);
      updateLocal(state.id, result.x, result.y);
    },
    [snap, updateLocal],
  );

  const onPointerUp = useCallback(async () => {
    const state = dragState.current;
    dragState.current = null;
    setDragging(undefined);
    setGuides([]);
    if (!state) return;

    const node = investigation.nodes.find((n) => n.id === state.id);
    if (!node) return;
    try {
      await moveInvestigationNode(investigation.id, node.id, node.x, node.y);
    } catch {
      setError("Position could not be saved. The board is still showing your change.");
    }
  }, [investigation]);

  const removeNode = useCallback(
    async (nodeId: string) => {
      const previous = investigation;
      setInvestigation((current) => ({
        ...current,
        nodes: current.nodes.filter((n) => n.id !== nodeId),
        edges: current.edges.filter(
          (e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId,
        ),
      }));
      try {
        await deleteInvestigationNode(investigation.id, nodeId);
      } catch {
        setInvestigation(previous);
        setError("That card could not be removed.");
      }
    },
    [investigation],
  );

  const linkTo = useCallback(
    async (targetId: string) => {
      if (!linkSource || linkSource === targetId) {
        setLinkSource(undefined);
        return;
      }
      try {
        await createInvestigationEdge({
          investigationId: investigation.id,
          sourceNodeId: linkSource,
          targetNodeId: targetId,
        });
        const response = await fetch(`/api/investigations/${investigation.id}`);
        const payload = (await response.json()) as { investigation: Investigation };
        setInvestigation(payload.investigation);
      } catch {
        setError("That link could not be created.");
      } finally {
        setLinkSource(undefined);
      }
    },
    [linkSource, investigation.id],
  );

  const addNote = useCallback(async () => {
    if (!noteDraft.trim()) return;
    try {
      await pinToInvestigation({
        investigationId: investigation.id,
        nodeType: "NOTE",
        note: noteDraft.trim(),
        position: { x: 80, y: 80 + investigation.nodes.length * 24 },
      });
      const response = await fetch(`/api/investigations/${investigation.id}`);
      const payload = (await response.json()) as { investigation: Investigation };
      setInvestigation(payload.investigation);
      setNoteDraft("");
      setAddingNote(false);
    } catch {
      setError("That note could not be added.");
    }
  }, [noteDraft, investigation]);

  const selectedNode = investigation.nodes.find((n) => n.id === selected);

  if (investigation.nodes.length === 0) {
    return (
      <div className="p-space-lg">
        <EmptyState
          icon="push_pin"
          title="Nothing is pinned to this board yet"
          description="Pin an authority from a search result or a dossier, a statutory provision from a case, or a verification finding from a document review. Everything you pin keeps the provenance it came with."
          action={
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href="/search" className="cl-btn-accent">
                <Icon name="search" size={16} />
                Find an authority
              </Link>
              <Link href="/verify" className="cl-btn-secondary">
                <Icon name="file_search" size={16} />
                Verify a document
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const bounds = investigation.nodes.reduce(
    (acc, node) => ({
      width: Math.max(acc.width, node.x + CARD_WIDTH + 120),
      height: Math.max(acc.height, node.y + 260),
    }),
    { width: 900, height: 640 },
  );

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">
      {/* Canvas */}
      <div className="flex-1 min-w-0 relative overflow-auto bg-canvas">
        {error && (
          <div
            role="alert"
            className="sticky top-2 mx-2 z-30 rounded-lg border border-review-border bg-review-surface px-3 py-2 text-body-sm text-review-ink flex items-center gap-2"
          >
            <Icon name="warning" size={16} />
            {error}
            <button
              type="button"
              onClick={() => setError(undefined)}
              className="ml-auto text-review-ink"
              aria-label="Dismiss"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        {linkSource && (
          <div className="sticky top-2 mx-2 z-30 rounded-lg border border-secondary bg-secondary-fixed px-3 py-2 text-body-sm text-on-secondary-fixed flex items-center gap-2">
            <Icon name="link" size={16} />
            Select the card to link to.
            <button
              type="button"
              onClick={() => setLinkSource(undefined)}
              className="ml-auto font-label-md text-secondary hover:underline"
            >
              Cancel
            </button>
          </div>
        )}

        <div
          ref={surfaceRef}
          className="relative"
          style={{
            width: bounds.width,
            height: bounds.height,
            backgroundImage:
              "radial-gradient(circle, #c5c6cd 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Alignment guides */}
          {guides.map((guide, index) => (
            <span
              key={`${guide.axis}-${guide.position}-${index}`}
              className="absolute bg-secondary/60 pointer-events-none z-20"
              style={
                guide.axis === "x"
                  ? { left: guide.position, top: 0, width: 1, height: "100%" }
                  : { top: guide.position, left: 0, height: 1, width: "100%" }
              }
            />
          ))}

          {/* Edges */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={bounds.width}
            height={bounds.height}
            aria-hidden="true"
          >
            {investigation.edges.map((edge) => {
              const source = investigation.nodes.find((n) => n.id === edge.sourceNodeId);
              const target = investigation.nodes.find((n) => n.id === edge.targetNodeId);
              if (!source || !target) return null;
              const x1 = source.x + CARD_WIDTH / 2;
              const y1 = source.y + 70;
              const x2 = target.x + CARD_WIDTH / 2;
              const y2 = target.y + 70;
              const midX = (x1 + x2) / 2;

              return (
                <g key={edge.id}>
                  <path
                    d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                    stroke="#1D4ED8"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    fill="none"
                  />
                  {edge.label && (
                    <text
                      x={midX}
                      y={(y1 + y2) / 2 - 6}
                      textAnchor="middle"
                      className="fill-[#44474c]"
                      style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Cards */}
          {investigation.nodes.map((node) => {
            const isDragging = dragging === node.id;
            const isLinkTarget = Boolean(linkSource) && linkSource !== node.id;

            return (
              <div
                key={node.id}
                onPointerDown={(event) => onPointerDown(event, node)}
                onClick={() => (linkSource ? void linkTo(node.id) : setSelected(node.id))}
                className={cn(
                  "absolute rounded-xl border bg-surface-container-lowest p-3 select-none",
                  readOnly ? "cursor-default" : "cursor-grab",
                  isDragging && "cursor-grabbing scale-[0.99] shadow-layer2 z-10",
                  !isDragging && "shadow-layer1 transition-shadow",
                  selected === node.id ? "border-secondary ring-1 ring-secondary" : "border-outline-variant",
                  isLinkTarget && "ring-2 ring-secondary/50",
                )}
                style={{ left: node.x, top: node.y, width: CARD_WIDTH }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon name={NODE_ICONS[node.nodeType]} size={14} className="text-secondary" />
                  <span className="font-statute-code text-statute-code uppercase text-muted">
                    {NODE_LABELS[node.nodeType]}
                  </span>
                  {node.metadata.verificationStatus && (
                    <StatusPill status={node.metadata.verificationStatus} showIcon={false} className="ml-auto scale-90 origin-right" />
                  )}
                </div>

                <p className="font-headline-md text-body-lg text-on-surface leading-snug line-clamp-3">
                  {node.metadata.title}
                </p>
                {node.metadata.citation && (
                  <p className="font-citation-mono text-[11px] text-secondary mt-0.5 truncate">
                    {node.metadata.citation}
                  </p>
                )}
                {node.metadata.subtitle && (
                  <p className="text-[12px] text-on-surface-variant mt-0.5 line-clamp-2">
                    {node.metadata.subtitle}
                  </p>
                )}
                {node.metadata.excerpt && (
                  <p className="text-[12px] text-on-surface-variant mt-1.5 line-clamp-3 leading-relaxed">
                    {node.metadata.excerpt}
                  </p>
                )}

                {!readOnly && (
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-outline-variant">
                    {node.nodeType === "CASE" && node.entityId && (
                      <Link
                        href={`/cases/${node.entityId}`}
                        className="text-[11px] font-label-md text-secondary hover:underline"
                      >
                        Open dossier
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setLinkSource(node.id)}
                      className="ml-auto p-1 text-muted hover:text-secondary rounded"
                      title="Link to another card"
                      aria-label="Link to another card"
                    >
                      <Icon name="link" size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeNode(node.id)}
                      className="p-1 text-muted hover:text-error rounded"
                      title="Remove from board"
                      aria-label="Remove from board"
                    >
                      <Icon name="delete" size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspector rail */}
      <aside className="lg:w-[320px] shrink-0 border-t lg:border-t-0 lg:border-l border-outline-variant bg-surface-container-lowest overflow-y-auto">
        <div className="p-4 space-y-4">
          <PanelHeading icon="info" title="Card inspector" />

          {selectedNode ? (
            <div className="space-y-3">
              <div>
                <span className="font-statute-code text-statute-code uppercase text-muted">
                  {NODE_LABELS[selectedNode.nodeType]}
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface leading-tight mt-0.5">
                  {selectedNode.metadata.title}
                </h3>
                {selectedNode.metadata.subtitle && (
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    {selectedNode.metadata.subtitle}
                  </p>
                )}
              </div>

              {selectedNode.metadata.excerpt && (
                <p className="font-judgment-editorial text-[16px] leading-[26px] text-on-surface rounded-lg border border-outline-variant bg-surface-container-low/50 p-3">
                  {selectedNode.metadata.excerpt}
                </p>
              )}

              {selectedNode.metadata.verificationStatus && (
                <StatusPill status={selectedNode.metadata.verificationStatus} />
              )}

              <ProvenanceDisclosure
                evidence={selectedNode.metadata.provenance}
                label="Card provenance"
              />
            </div>
          ) : (
            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              Select a card to see its provenance. Drag cards to arrange them; they snap to the
              alignment of their neighbours and their positions are saved.
            </p>
          )}

          {!readOnly && (
            <div className="pt-3 border-t border-outline-variant space-y-2">
              {addingNote ? (
                <div className="space-y-2">
                  <label htmlFor="board-note" className="font-label-md text-label-md uppercase tracking-wider text-muted">
                    New note
                  </label>
                  <textarea
                    id="board-note"
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    rows={4}
                    placeholder="Record your reasoning. Notes are marked as user-authored and never presented as authority."
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-low p-2 text-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void addNote()} className="cl-btn-accent">
                      Add note
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingNote(false);
                        setNoteDraft("");
                      }}
                      className="cl-btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setAddingNote(true)} className="cl-btn-secondary w-full">
                  <Icon name="add_circle" size={16} />
                  Add an investigator note
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
