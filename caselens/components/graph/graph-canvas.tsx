"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import "@xyflow/react/dist/style.css";

import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { PanelHeading } from "@/components/ui/primitives";
import { ProvenanceDisclosure } from "@/components/ui/provenance";
import { PinButton } from "@/components/investigation/pin-button";
import type { GraphEdge, GraphNode, GraphPayload, RelationshipType } from "@/types/domain";

/**
 * The relationship graph.
 *
 * Layout runs d3-force once, off-screen, and the settled positions are handed
 * to React Flow — MOTION_PHYSICS.md asks for a layout that freezes after
 * settling rather than one that jitters under the cursor. Procedural links
 * (appeal, affirm, reverse, remand) get a short, stiff spring so a case's
 * forum history reads as a tight spine; citation links sit further out.
 */

/* ------------------------------------------------------------------ */
/* Physics                                                             */
/* ------------------------------------------------------------------ */

function linkDistance(type: string): number {
  switch (type) {
    case "APPEAL_OF":
    case "REVERSES":
    case "AFFIRMS":
    case "REMANDS":
      return 130;
    case "FOLLOWS":
    case "OVERRULES":
    case "DISTINGUISHES":
      return 210;
    case "INTERPRETS":
    case "APPLIES":
    case "MENTIONS":
    case "CHALLENGES":
      return 165;
    default:
      return 250;
  }
}

function linkStrength(type: string): number {
  switch (type) {
    case "APPEAL_OF":
    case "REVERSES":
    case "AFFIRMS":
    case "REMANDS":
      return 1;
    case "FOLLOWS":
    case "OVERRULES":
    case "DISTINGUISHES":
      return 0.5;
    default:
      return 0.25;
  }
}

export function edgeColor(type: string): string {
  switch (type) {
    case "AFFIRMS":
    case "FOLLOWS":
      return "#059669";
    case "OVERRULES":
    case "REVERSES":
      return "#DC2626";
    case "DISTINGUISHES":
      return "#D97706";
    case "INTERPRETS":
    case "APPLIES":
    case "MENTIONS":
    case "CHALLENGES":
      return "#75777d";
    default:
      return "#1D4ED8";
  }
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  isFocus: boolean;
  radius: number;
}

/** Runs the force simulation to completion and returns settled coordinates. */
function computeLayout(payload: GraphPayload): Map<string, { x: number; y: number }> {
  const simNodes: SimNode[] = payload.nodes.map((node) => ({
    id: node.id,
    isFocus: Boolean(node.isFocus),
    radius: node.type === "PROVISION" ? 62 : 108,
    // Seed the focus node at the origin so the graph composes around it.
    ...(node.isFocus ? { x: 0, y: 0, fx: 0, fy: 0 } : {}),
  }));

  const links: Array<SimulationLinkDatum<SimNode> & { type: string }> = payload.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    type: edge.type,
  }));

  const simulation = forceSimulation(simNodes)
    .force(
      "link",
      forceLink<SimNode, (typeof links)[number]>(links)
        .id((node) => node.id)
        .distance((link) => linkDistance(link.type))
        .strength((link) => linkStrength(link.type)),
    )
    .force("charge", forceManyBody<SimNode>().strength((node) => (node.isFocus ? -1400 : -900)))
    .force("collide", forceCollide<SimNode>().radius((node) => node.radius).iterations(2))
    .force("x", forceX(0).strength(0.05))
    .force("y", forceY(0).strength(0.07))
    .stop();

  // Run to convergence synchronously, then freeze — no animation loop.
  simulation.tick(400);

  const positions = new Map<string, { x: number; y: number }>();
  for (const node of simNodes) {
    positions.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
  }
  return positions;
}

/* ------------------------------------------------------------------ */
/* Node rendering                                                      */
/* ------------------------------------------------------------------ */

type CaseNodeData = GraphNode & Record<string, unknown>;

const COURT_SHAPES: Record<string, string> = {
  SUPREME_COURT: "rounded-xl",
  HIGH_COURT: "rounded-lg",
  TRIBUNAL: "rounded",
  DISTRICT_COURT: "rounded",
};

const STATUS_ACCENTS: Record<string, string> = {
  BINDING_LANDMARK: "border-l-[3px] border-l-verified",
  AFFIRMED_FOLLOWED: "border-l-[3px] border-l-verified",
  DISTINGUISHED: "border-l-[3px] border-l-review",
  OVERRULED: "border-l-[3px] border-l-mismatch",
  PENDING: "border-l-[3px] border-l-outline",
};

function CaseFlowNode({ data, selected }: NodeProps<Node<CaseNodeData>>) {
  const node = data;
  const isProvision = node.type === "PROVISION";

  return (
    <div
      className={cn(
        "bg-surface-container-lowest border px-3 py-2 transition-shadow max-w-[220px]",
        isProvision
          ? "rounded border-outline-variant bg-surface-container-low"
          : COURT_SHAPES[node.courtLevel ?? "TRIBUNAL"],
        !isProvision && "border-outline-variant",
        !isProvision && node.doctrinalStatus ? STATUS_ACCENTS[node.doctrinalStatus] : "",
        node.isFocus && "border-secondary border-2 shadow-layer2",
        selected && "ring-2 ring-secondary ring-offset-1",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-outline !w-1.5 !h-1.5 !border-0" />

      {isProvision ? (
        <>
          <span className="font-statute-code text-statute-code text-secondary font-bold block">
            {node.label}
          </span>
          <span className="text-[11px] text-on-surface-variant leading-tight block mt-0.5 line-clamp-2">
            {node.sublabel}
          </span>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5 mb-0.5">
            {node.isFocus && (
              <span className="font-statute-code text-[9px] uppercase px-1 py-0.5 rounded bg-secondary text-white">
                Focus
              </span>
            )}
            <span className="font-statute-code text-[9px] uppercase text-muted">{node.year}</span>
          </div>
          <span className="font-headline-md text-[13px] leading-tight text-on-surface block line-clamp-3">
            {node.label}
          </span>
          <span className="font-citation-mono text-[10px] text-muted block mt-0.5 truncate">
            {node.sublabel}
          </span>
        </>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-outline !w-1.5 !h-1.5 !border-0" />
    </div>
  );
}

const nodeTypes = { caseNode: CaseFlowNode };

/* ------------------------------------------------------------------ */
/* Inspector                                                           */
/* ------------------------------------------------------------------ */

function NodeInspector({
  node,
  edges,
  nodes,
  onClose,
}: {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  onClose: () => void;
}) {
  const connected = edges.filter((edge) => edge.source === node.id || edge.target === node.id);
  const nameOf = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      <PanelHeading
        icon="info"
        title="Node inspector"
        trailing={
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="p-1 text-muted hover:text-on-surface rounded"
          >
            <Icon name="close" size={16} />
          </button>
        }
      />

      <div>
        <span className="font-statute-code text-statute-code uppercase text-muted">
          {node.type === "PROVISION" ? "Statutory provision" : "Authority"}
        </span>
        <h3 className="font-headline-md text-headline-md text-on-surface leading-tight mt-1">
          {node.label}
        </h3>
        {node.sublabel && (
          <p className="font-citation-mono text-[12px] text-muted mt-1">{node.sublabel}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {node.type === "CASE" ? (
          <>
            <Link href={`/cases/${node.entityId}`} className="cl-btn-accent">
              <Icon name="folder_open" size={16} />
              Open dossier
            </Link>
            <Link href={`/cases/${node.entityId}/graph`} className="cl-btn-secondary">
              <Icon name="account_tree" size={16} />
              Re-centre graph
            </Link>
          </>
        ) : null}
        <PinButton
          nodeType={node.type === "PROVISION" ? "PROVISION" : "CASE"}
          entityId={node.entityId}
          label="Pin to board"
        />
      </div>

      <section>
        <PanelHeading icon="link" title={`Connections (${connected.length})`} className="mb-2" />
        {connected.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">
            No relationship to another node in this view.
          </p>
        ) : (
          <ul className="space-y-3">
            {connected.map((edge) => {
              const outgoing = edge.source === node.id;
              const otherId = outgoing ? edge.target : edge.source;
              return (
                <li key={edge.id} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: edgeColor(edge.type) }}
                    />
                    <span className="font-statute-code text-statute-code uppercase text-on-surface">
                      {outgoing ? edge.label : `${edge.label} (inbound)`}
                    </span>
                    {edge.confidence !== undefined && (
                      <span className="font-citation-mono text-[10px] text-muted ml-auto">
                        confidence {Math.round(edge.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="text-body-sm text-on-surface leading-snug pl-3.5">
                    {nameOf(otherId)}
                  </p>
                  <ProvenanceDisclosure evidence={edge.evidence} label="Edge evidence" className="pl-3.5" />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Canvas                                                              */
/* ------------------------------------------------------------------ */

const RELATIONSHIP_FILTERS: Array<{ value: RelationshipType; label: string }> = [
  { value: "APPEAL_OF", label: "Appeal" },
  { value: "AFFIRMS", label: "Affirms" },
  { value: "REVERSES", label: "Reverses" },
  { value: "FOLLOWS", label: "Follows" },
  { value: "DISTINGUISHES", label: "Distinguishes" },
  { value: "OVERRULES", label: "Overrules" },
  { value: "CITES", label: "Cites" },
  { value: "CITED_BY", label: "Cited by" },
  { value: "RELATED", label: "Related" },
];

function Canvas({ payload }: { payload: GraphPayload }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showProvisions, setShowProvisions] = useState(true);
  const [selectedId, setSelectedId] = useState<string | undefined>(payload.focusId);
  const { fitView } = useReactFlow();

  const visible = useMemo(() => {
    const edges = payload.edges.filter((edge) => {
      if (hidden.has(edge.type)) return false;
      if (!showProvisions && edge.target.startsWith("provision:")) return false;
      return true;
    });
    const keep = new Set<string>([payload.focusId]);
    for (const edge of edges) {
      keep.add(edge.source);
      keep.add(edge.target);
    }
    const nodes = payload.nodes.filter((node) => keep.has(node.id));
    return { nodes, edges };
  }, [payload, hidden, showProvisions]);

  const layout = useMemo(
    () => computeLayout({ ...payload, nodes: visible.nodes, edges: visible.edges }),
    [payload, visible],
  );

  const initialNodes: Node<CaseNodeData>[] = useMemo(
    () =>
      visible.nodes.map((node) => ({
        id: node.id,
        type: "caseNode",
        position: layout.get(node.id) ?? { x: 0, y: 0 },
        data: node as CaseNodeData,
        draggable: true,
      })),
    [visible.nodes, layout],
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      visible.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        animated: false,
        style: { stroke: edgeColor(edge.type), strokeWidth: edge.type === "APPEAL_OF" ? 2 : 1.5 },
        labelStyle: { fontSize: 10, fontFamily: "var(--font-mono)", fill: "#44474c" },
        labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor(edge.type), width: 14, height: 14 },
      })),
    [visible.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    // Re-frame after a relayout so the new shape is fully visible.
    const timer = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 60);
    return () => clearTimeout(timer);
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

  const toggleType = useCallback((type: string) => {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const selected = visible.nodes.find((node) => node.id === selectedId);
  const presentTypes = new Set(payload.edges.map((edge) => edge.type));

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">
      <div className="flex-1 min-h-[420px] lg:min-h-0 relative">
        {/* Relationship filters */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-[calc(100%-1.5rem)]">
          {RELATIONSHIP_FILTERS.filter((filter) => presentTypes.has(filter.value)).map((filter) => {
            const off = hidden.has(filter.value);
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => toggleType(filter.value)}
                aria-pressed={!off}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded border font-statute-code text-statute-code uppercase transition-colors",
                  off
                    ? "bg-surface-container-low text-muted border-outline-variant line-through"
                    : "bg-surface-container-lowest text-on-surface border-outline-variant",
                )}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: off ? "#c5c6cd" : edgeColor(filter.value) }}
                />
                {filter.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowProvisions((value) => !value)}
            aria-pressed={showProvisions}
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded border font-statute-code text-statute-code uppercase transition-colors",
              showProvisions
                ? "bg-surface-container-lowest text-on-surface border-outline-variant"
                : "bg-surface-container-low text-muted border-outline-variant line-through",
            )}
          >
            <Icon name="menu_book" size={12} />
            Provisions
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={(_event, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(undefined)}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
          className="bg-canvas"
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#c5c6cd" />
          <Controls showInteractive={false} className="!shadow-layer1 !border !border-outline-variant !rounded-lg" />
        </ReactFlow>
      </div>

      {/* Inspector */}
      <aside className="lg:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-outline-variant bg-surface-container-lowest lg:max-h-none max-h-[50vh] overflow-y-auto">
        {selected ? (
          <NodeInspector
            node={selected}
            edges={visible.edges}
            nodes={visible.nodes}
            onClose={() => setSelectedId(undefined)}
          />
        ) : (
          <div className="p-4 space-y-3">
            <PanelHeading icon="info" title="Node inspector" />
            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              Select a node to inspect the relationship, the evidence behind each edge, and to pin it
              to an investigation.
            </p>
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 space-y-2">
              <p className="font-label-md text-label-md uppercase tracking-wider text-muted">
                Edge colours
              </p>
              {[
                { label: "Affirms / follows", type: "AFFIRMS" },
                { label: "Reverses / overrules", type: "REVERSES" },
                { label: "Distinguishes", type: "DISTINGUISHES" },
                { label: "Cites", type: "CITES" },
                { label: "Statutory link", type: "INTERPRETS" },
              ].map((entry) => (
                <div key={entry.type} className="flex items-center gap-2 text-body-sm">
                  <span
                    className="w-6 h-0.5 rounded"
                    style={{ backgroundColor: edgeColor(entry.type) }}
                  />
                  {entry.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

/** Mobile fallback: the same relationships as an indented tree. */
function TreeFallback({ payload }: { payload: GraphPayload }) {
  const focus = payload.nodes.find((node) => node.id === payload.focusId);
  const outgoing = payload.edges.filter((edge) => edge.source === payload.focusId);
  const incoming = payload.edges.filter((edge) => edge.target === payload.focusId);
  const nameOf = (id: string) => payload.nodes.find((n) => n.id === id)?.label ?? id;
  const entityOf = (id: string) => payload.nodes.find((n) => n.id === id);

  const render = (edge: GraphEdge, inbound: boolean) => {
    const otherId = inbound ? edge.source : edge.target;
    const other = entityOf(otherId);
    return (
      <li key={edge.id} className="pl-4 border-l border-outline-variant py-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: edgeColor(edge.type) }} />
          <span className="font-statute-code text-statute-code uppercase text-on-surface-variant">
            {inbound ? `${edge.label} this case` : edge.label}
          </span>
        </div>
        {other?.type === "CASE" ? (
          <Link
            href={`/cases/${other.entityId}`}
            className="text-body-md font-medium text-on-surface hover:text-secondary"
          >
            {nameOf(otherId)}
          </Link>
        ) : (
          <span className="text-body-md font-medium text-on-surface">{nameOf(otherId)}</span>
        )}
        <ProvenanceDisclosure evidence={edge.evidence} label="Edge evidence" className="mt-1" />
      </li>
    );
  };

  return (
    <div className="p-space-md space-y-4">
      <div>
        <span className="font-statute-code text-statute-code uppercase text-muted">Focus</span>
        <h2 className="font-headline-md text-headline-md text-on-surface leading-tight">
          {focus?.label}
        </h2>
      </div>

      {outgoing.length > 0 && (
        <section>
          <PanelHeading icon="arrow_forward" title="This case →" className="mb-2" />
          <ul>{outgoing.map((edge) => render(edge, false))}</ul>
        </section>
      )}

      {incoming.length > 0 && (
        <section>
          <PanelHeading icon="arrow_back" title="→ This case" className="mb-2" />
          <ul>{incoming.map((edge) => render(edge, true))}</ul>
        </section>
      )}
    </div>
  );
}

export function GraphCanvas({ payload }: { payload: GraphPayload }) {
  return (
    <>
      {/* Force-directed canvas on tablet and up */}
      <div className="hidden md:block h-[calc(100vh-190px)] min-h-[520px]">
        <ReactFlowProvider>
          <Canvas payload={payload} />
        </ReactFlowProvider>
      </div>
      {/* Linear tree on mobile, per UI_UX_SPEC.md */}
      <div className="md:hidden">
        <TreeFallback payload={payload} />
      </div>
    </>
  );
}
