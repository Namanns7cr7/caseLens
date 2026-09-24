import "server-only";

import { randomUUID } from "node:crypto";

import { getStore } from "@/server/db/store";
import { getCase, getParagraph, getProvision } from "@/server/repositories/case-repository";
import { getAnalysis } from "@/server/services/document-service";
import { assertEvidenced } from "@/server/services/provenance";
import type {
  GraphNodeType,
  Investigation,
  InvestigationEdge,
  InvestigationNode,
  InvestigationNodeMetadata,
  ProvenanceRef,
  RelationshipType,
} from "@/types/domain";

/**
 * The Investigation Board.
 *
 * Pinning is the point at which evidence leaves the corpus and enters the
 * user's workspace, so it is also where provenance is copied across. A node
 * that stands for a legal authority is rejected unless the entity it pins
 * carries evidence; a node the user authored is marked USER authority, which
 * is provenance about its own origin and never an authority about the law.
 */

export class InvestigationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "InvestigationError";
    this.code = code;
  }
}

export function createInvestigation(input: {
  title: string;
  description?: string;
  ownerId: string;
}): Investigation {
  const now = new Date().toISOString();
  const investigation: Investigation = {
    id: `inv-${randomUUID().slice(0, 8)}`,
    ownerId: input.ownerId,
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    createdAt: now,
    updatedAt: now,
    nodes: [],
    edges: [],
  };
  getStore().investigations.set(investigation.id, investigation);
  return investigation;
}

export function getInvestigation(id: string): Investigation | undefined {
  return getStore().investigations.get(id);
}

export function listInvestigations(ownerId: string): Investigation[] {
  return [...getStore().investigations.values()]
    .filter((investigation) => investigation.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Authorization check (SECURITY_PRIVACY.md): the owner alone may mutate. */
function requireOwned(id: string, ownerId: string): Investigation {
  const investigation = getStore().investigations.get(id);
  if (!investigation) throw new InvestigationError("NOT_FOUND", "Investigation not found.");
  if (investigation.ownerId !== ownerId) {
    throw new InvestigationError("FORBIDDEN", "This investigation belongs to another user.");
  }
  return investigation;
}

function touch(investigation: Investigation): void {
  investigation.updatedAt = new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Pinning                                                             */
/* ------------------------------------------------------------------ */

export interface PinInput {
  investigationId: string;
  ownerId: string;
  nodeType: GraphNodeType;
  entityId?: string;
  x: number;
  y: number;
  note?: string;
}

/**
 * Resolves the entity being pinned into display metadata plus its provenance.
 * Throws if an entity that asserts something about the law has none.
 */
function metadataFor(nodeType: GraphNodeType, entityId?: string, note?: string): InvestigationNodeMetadata {
  switch (nodeType) {
    case "CASE": {
      const summary = entityId ? getCase(entityId) : undefined;
      if (!summary) throw new InvestigationError("UNKNOWN_ENTITY", "That case is not in the corpus.");
      assertEvidenced(`pin:case:${summary.id}`, summary.provenance);
      return {
        title: summary.title,
        subtitle: `${summary.court}${summary.decisionDate ? ` · ${summary.decisionDate}` : ""}`,
        ...(summary.citation ? { citation: summary.citation } : {}),
        ...(summary.summary ? { excerpt: summary.summary } : {}),
        provenance: summary.provenance,
      };
    }
    case "PROVISION": {
      const provision = entityId ? getProvision(entityId) : undefined;
      if (!provision) {
        throw new InvestigationError("UNKNOWN_ENTITY", "That provision is not in the corpus.");
      }
      assertEvidenced(`pin:provision:${provision.id}`, provision.provenance);
      return {
        title: provision.label,
        subtitle: provision.heading,
        ...(provision.text ? { excerpt: provision.text } : {}),
        provenance: provision.provenance,
      };
    }
    case "EVIDENCE": {
      // Evidence pins point at a judgment paragraph or a verification result.
      const paragraph = entityId ? getParagraph(entityId) : undefined;
      if (paragraph) {
        assertEvidenced(`pin:paragraph:${paragraph.id}`, paragraph.provenance);
        const parent = getCase(paragraph.caseId);
        return {
          title: `${parent?.title ?? paragraph.caseId} — ¶ ${paragraph.paragraphNumber}`,
          subtitle: parent?.citation ?? parent?.court,
          excerpt: paragraph.text,
          provenance: paragraph.provenance,
        };
      }
      const finding = entityId ? findVerification(entityId) : undefined;
      if (finding) return finding;
      throw new InvestigationError("UNKNOWN_ENTITY", "That evidence is not available.");
    }
    case "NOTE": {
      if (!note?.trim()) {
        throw new InvestigationError("EMPTY_NOTE", "A note needs text.");
      }
      const userProvenance: ProvenanceRef[] = [
        {
          sourceName: "Investigator note",
          sourceUrl: "",
          authorityLevel: "USER",
          retrievedAt: new Date().toISOString(),
          note: "Authored in this investigation. Not a legal authority.",
        },
      ];
      return { title: "Note", excerpt: note, provenance: userProvenance };
    }
    default:
      throw new InvestigationError("UNSUPPORTED", `Cannot pin a ${nodeType} node.`);
  }
}

/** Finds a verification result across analysed documents, for evidence pins. */
function findVerification(citationId: string): InvestigationNodeMetadata | undefined {
  for (const record of getStore().documents.values()) {
    const analysis = getAnalysis(record.document.id);
    const result = analysis?.results.find((r) => r.extractedCitationId === citationId);
    if (!result) continue;
    const citation = analysis?.citations.find((c) => c.id === citationId);
    const matched = result.matchedCaseId ? getCase(result.matchedCaseId) : undefined;
    return {
      title: citation?.claimedCaseTitle ?? citation?.rawText ?? "Verification finding",
      subtitle: `${record.document.filename}${citation?.pageNumber ? ` · p. ${citation.pageNumber}` : ""}`,
      ...(citation?.rawText ? { citation: citation.rawText } : {}),
      excerpt: result.explanation,
      provenance:
        result.evidence.length > 0
          ? result.evidence
          : [
              {
                sourceName: record.document.filename,
                sourceUrl: "",
                authorityLevel: "USER",
                note: `Uploaded document. SHA-256 ${record.document.sha256.slice(0, 16)}…`,
              },
            ],
      verificationStatus: result.status,
      ...(matched ? {} : {}),
    };
  }
  return undefined;
}

export function pinNode(input: PinInput): InvestigationNode {
  const investigation = requireOwned(input.investigationId, input.ownerId);
  const metadata = metadataFor(input.nodeType, input.entityId, input.note);

  // Pinning the same entity twice moves focus to the existing card rather
  // than stacking duplicates on the board.
  const existing = investigation.nodes.find(
    (node) => node.nodeType === input.nodeType && node.entityId === input.entityId && input.entityId,
  );
  if (existing) return existing;

  const node: InvestigationNode = {
    id: `node-${randomUUID().slice(0, 8)}`,
    investigationId: investigation.id,
    nodeType: input.nodeType,
    ...(input.entityId ? { entityId: input.entityId } : {}),
    x: input.x,
    y: input.y,
    ...(input.note ? { note: input.note } : {}),
    metadata,
  };

  investigation.nodes.push(node);
  touch(investigation);
  return node;
}

export function moveNode(input: {
  investigationId: string;
  ownerId: string;
  nodeId: string;
  x: number;
  y: number;
  note?: string;
}): InvestigationNode {
  const investigation = requireOwned(input.investigationId, input.ownerId);
  const node = investigation.nodes.find((n) => n.id === input.nodeId);
  if (!node) throw new InvestigationError("NOT_FOUND", "Node not found.");

  node.x = input.x;
  node.y = input.y;
  if (input.note !== undefined) {
    node.note = input.note;
    if (node.nodeType === "NOTE") node.metadata = { ...node.metadata, excerpt: input.note };
  }
  touch(investigation);
  return node;
}

export function removeNode(input: {
  investigationId: string;
  ownerId: string;
  nodeId: string;
}): void {
  const investigation = requireOwned(input.investigationId, input.ownerId);
  investigation.nodes = investigation.nodes.filter((n) => n.id !== input.nodeId);
  investigation.edges = investigation.edges.filter(
    (e) => e.sourceNodeId !== input.nodeId && e.targetNodeId !== input.nodeId,
  );
  touch(investigation);
}

/* ------------------------------------------------------------------ */
/* Edges                                                               */
/* ------------------------------------------------------------------ */

export function createEdge(input: {
  investigationId: string;
  ownerId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: RelationshipType | "USER_LINK";
  label?: string;
}): InvestigationEdge {
  const investigation = requireOwned(input.investigationId, input.ownerId);
  const source = investigation.nodes.find((n) => n.id === input.sourceNodeId);
  const target = investigation.nodes.find((n) => n.id === input.targetNodeId);
  if (!source || !target) throw new InvestigationError("NOT_FOUND", "Both nodes must exist.");
  if (source.id === target.id) {
    throw new InvestigationError("INVALID_EDGE", "A node cannot link to itself.");
  }

  // A user-drawn edge is an assertion by the user, not by a source. It is
  // recorded as USER authority so the report can distinguish it from an
  // evidenced relationship drawn from the corpus.
  const edge: InvestigationEdge = {
    id: `edge-${randomUUID().slice(0, 8)}`,
    investigationId: investigation.id,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
    relationshipType: input.relationshipType,
    ...(input.label ? { label: input.label } : {}),
    evidence: [
      {
        sourceName: "Investigator link",
        sourceUrl: "",
        authorityLevel: "USER",
        retrievedAt: new Date().toISOString(),
        note: input.label
          ? `User-created link: ${input.label}`
          : "User-created link. Not drawn from a source record.",
      },
    ],
  };

  investigation.edges.push(edge);
  touch(investigation);
  return edge;
}

export function removeEdge(input: {
  investigationId: string;
  ownerId: string;
  edgeId: string;
}): void {
  const investigation = requireOwned(input.investigationId, input.ownerId);
  investigation.edges = investigation.edges.filter((e) => e.id !== input.edgeId);
  touch(investigation);
}

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

export interface InvestigationSummary {
  cases: number;
  provisions: number;
  evidence: number;
  notes: number;
  userLinks: number;
  flagged: number;
  /** Distinct sources the board's evidence draws on. */
  sources: ProvenanceRef[];
}

export function summarize(investigation: Investigation): InvestigationSummary {
  const sources: ProvenanceRef[] = [];
  const seen = new Set<string>();
  for (const node of investigation.nodes) {
    for (const ref of node.metadata.provenance) {
      const key = `${ref.sourceName}|${ref.sourceUrl}`;
      if (seen.has(key) || ref.authorityLevel === "USER") continue;
      seen.add(key);
      sources.push(ref);
    }
  }

  return {
    cases: investigation.nodes.filter((n) => n.nodeType === "CASE").length,
    provisions: investigation.nodes.filter((n) => n.nodeType === "PROVISION").length,
    evidence: investigation.nodes.filter((n) => n.nodeType === "EVIDENCE").length,
    notes: investigation.nodes.filter((n) => n.nodeType === "NOTE").length,
    userLinks: investigation.edges.length,
    flagged: investigation.nodes.filter(
      (n) => n.metadata.verificationStatus && n.metadata.verificationStatus !== "VERIFIED",
    ).length,
    sources,
  };
}
