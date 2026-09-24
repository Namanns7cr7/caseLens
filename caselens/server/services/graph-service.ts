import "server-only";

import { getCorpus } from "@/server/db/seed";
import { relationshipsFor } from "@/server/repositories/case-repository";
import { assertEvidenced } from "@/server/services/provenance";
import type {
  CaseProvisionRelation,
  GraphEdge,
  GraphNode,
  GraphPayload,
  RelationshipType,
} from "@/types/domain";

/**
 * Builds the evidence-backed relationship graph around a focus case.
 *
 * Every edge carries the provenance of the underlying relationship record —
 * an edge that would assert something about the law without evidence is
 * rejected by `assertEvidenced` rather than drawn.
 */

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  CITES: "cites",
  CITED_BY: "cited by",
  APPEAL_OF: "appeal of",
  AFFIRMS: "affirms",
  REVERSES: "reverses",
  REMANDS: "remands",
  FOLLOWS: "follows",
  DISTINGUISHES: "distinguishes",
  OVERRULES: "overrules",
  RELATED: "related to",
};

export const PROVISION_RELATION_LABELS: Record<CaseProvisionRelation, string> = {
  INTERPRETS: "interprets",
  APPLIES: "applies",
  MENTIONS: "mentions",
  CHALLENGES: "challenges",
};

export interface GraphQuery {
  caseId: string;
  depth: number;
  types?: RelationshipType[];
  includeProvisions: boolean;
}

function caseNode(caseId: string, isFocus: boolean): GraphNode | undefined {
  const summary = getCorpus().cases.get(caseId);
  if (!summary) return undefined;
  return {
    id: `case:${caseId}`,
    type: "CASE",
    label: summary.title,
    sublabel: summary.citation ?? summary.caseNumber ?? summary.court,
    courtLevel: summary.courtLevel,
    doctrinalStatus: summary.doctrinalStatus,
    ...(summary.decisionDate ? { year: Number(summary.decisionDate.slice(0, 4)) } : {}),
    ...(isFocus ? { isFocus: true } : {}),
    entityId: caseId,
  };
}

function provisionNode(provisionId: string): GraphNode | undefined {
  const provision = getCorpus().provisions.get(provisionId);
  if (!provision) return undefined;
  return {
    id: `provision:${provisionId}`,
    type: "PROVISION",
    label: provision.label,
    sublabel: provision.heading,
    entityId: provisionId,
  };
}

/**
 * Breadth-first expansion from the focus case out to `depth` hops.
 * Provision nodes are attached to every case included in the expansion.
 */
export function buildGraph(query: GraphQuery): GraphPayload {
  const corpus = getCorpus();
  if (!corpus.cases.has(query.caseId)) {
    return { nodes: [], edges: [], focusId: `case:${query.caseId}`, depth: query.depth };
  }

  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  const focus = caseNode(query.caseId, true);
  if (focus) nodes.set(focus.id, focus);

  let frontier = [query.caseId];
  const visited = new Set<string>([query.caseId]);

  for (let hop = 0; hop < Math.max(1, query.depth); hop += 1) {
    const next: string[] = [];
    for (const currentId of frontier) {
      for (const rel of relationshipsFor(currentId)) {
        if (query.types?.length && !query.types.includes(rel.type)) continue;
        assertEvidenced(`graph-edge:${rel.id}`, rel.evidence);

        const neighbourId = rel.targetCaseId;
        const neighbour = caseNode(neighbourId, false);
        if (!neighbour) continue;
        if (!nodes.has(neighbour.id)) nodes.set(neighbour.id, neighbour);

        // Canonical edge key so the two directions of one fact draw once.
        const [a, b] = [rel.sourceCaseId, rel.targetCaseId].sort() as [string, string];
        const pair = `${a}|${b}`;
        const key = `${pair}|${rel.type}`;

        // Inverting a procedural edge (APPEAL_OF, AFFIRMS, REVERSES, REMANDS)
        // yields a generic RELATED, which would draw a second, less
        // informative line beside the specific one. Suppress it where the
        // pair is already connected.
        if (rel.type === "RELATED") {
          const alreadyConnected = [...edges.keys()].some(
            (existing) => existing.startsWith(`${pair}|`) && !existing.endsWith("|RELATED"),
          );
          if (alreadyConnected) continue;
        }

        if (!edges.has(key)) {
          edges.set(key, {
            id: rel.id,
            source: `case:${rel.sourceCaseId}`,
            target: `case:${rel.targetCaseId}`,
            type: rel.type,
            label: RELATIONSHIP_LABELS[rel.type],
            ...(rel.confidence !== undefined ? { confidence: rel.confidence } : {}),
            evidence: rel.evidence,
            ...(rel.sourceParagraphId ? { sourceParagraphId: rel.sourceParagraphId } : {}),
          });
        }

        if (!visited.has(neighbourId)) {
          visited.add(neighbourId);
          next.push(neighbourId);
        }
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }

  if (query.includeProvisions) {
    for (const caseId of visited) {
      const dossier = corpus.dossiers.get(caseId);
      if (!dossier) continue;
      for (const link of dossier.provisions) {
        assertEvidenced(`graph-edge:provision:${caseId}:${link.provision.id}`, link.evidence);
        const node = provisionNode(link.provision.id);
        if (!node) continue;
        if (!nodes.has(node.id)) nodes.set(node.id, node);
        const key = `${caseId}|${link.provision.id}|${link.relationType}`;
        if (!edges.has(key)) {
          edges.set(key, {
            id: key,
            source: `case:${caseId}`,
            target: node.id,
            type: link.relationType,
            label: PROVISION_RELATION_LABELS[link.relationType],
            evidence: link.evidence,
            ...(link.sourceParagraphId ? { sourceParagraphId: link.sourceParagraphId } : {}),
          });
        }
      }
    }
  }

  return {
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    focusId: `case:${query.caseId}`,
    depth: query.depth,
  };
}

/**
 * Link distance per relationship type (MOTION_PHYSICS.md): procedural links
 * pull harder so an appeal chain reads as a tight spine, while citation
 * links sit further out.
 */
export function linkDistance(type: GraphEdge["type"]): number {
  switch (type) {
    case "APPEAL_OF":
    case "REVERSES":
    case "AFFIRMS":
    case "REMANDS":
      return 90;
    case "FOLLOWS":
    case "OVERRULES":
    case "DISTINGUISHES":
      return 150;
    case "INTERPRETS":
    case "APPLIES":
    case "MENTIONS":
    case "CHALLENGES":
      return 120;
    default:
      return 190;
  }
}

/** Link strength companion to `linkDistance`. Procedural links are stiffer. */
export function linkStrength(type: GraphEdge["type"]): number {
  switch (type) {
    case "APPEAL_OF":
    case "REVERSES":
    case "AFFIRMS":
    case "REMANDS":
      return 1;
    case "FOLLOWS":
    case "OVERRULES":
    case "DISTINGUISHES":
      return 0.55;
    default:
      return 0.3;
  }
}

/** Semantic edge colour encoding from DESIGN.md. */
export function edgeColor(type: GraphEdge["type"]): string {
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
