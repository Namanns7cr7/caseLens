import { beforeEach, describe, expect, it } from "vitest";

import { resetStore } from "@/server/db/store";
import { getCorpus } from "@/server/db/seed";
import {
  buildTimeline,
  citingCases,
  findCaseByCitation,
  getDossier,
  relationshipsFor,
} from "@/server/repositories/case-repository";
import { buildGraph } from "@/server/services/graph-service";
import {
  assertEvidenced,
  hasEvidence,
  isValidProvenance,
  NO_MATCH_WORDING,
  ProvenanceError,
  strongestAuthority,
} from "@/server/services/provenance";
import { search } from "@/server/services/search-service";
import {
  createEdge,
  createInvestigation,
  moveNode,
  pinNode,
  summarize,
} from "@/server/services/investigation-service";
import { resolveStatus } from "@/server/services/verification-service";

/**
 * Domain rules from docs/TESTING.md: provenance requirements, graph
 * relationship mapping, verification-status rules, and the search ->
 * dossier -> relationships -> investigation integration path.
 */

describe("provenance enforcement", () => {
  it("accepts a source-backed reference", () => {
    expect(
      isValidProvenance({
        sourceName: "Supreme Court of India",
        sourceUrl: "https://main.sci.gov.in/judgments",
        authorityLevel: "SECONDARY",
      }),
    ).toBe(true);
  });

  it("rejects a reference with no usable source", () => {
    expect(
      isValidProvenance({ sourceName: "Somewhere", sourceUrl: "", authorityLevel: "SECONDARY" }),
    ).toBe(false);
    expect(
      isValidProvenance({ sourceName: "", sourceUrl: "https://x.test", authorityLevel: "PRIMARY" }),
    ).toBe(false);
  });

  it("treats a user note as provenance about itself", () => {
    expect(
      isValidProvenance({ sourceName: "Investigator note", sourceUrl: "", authorityLevel: "USER" }),
    ).toBe(true);
  });

  it("throws when a legal assertion carries no provenance", () => {
    expect(() => assertEvidenced("relationship:test", [])).toThrow(ProvenanceError);
    expect(() => assertEvidenced("relationship:test", undefined)).toThrow(ProvenanceError);
  });

  it("reports the strongest authority backing a record", () => {
    expect(
      strongestAuthority([
        { sourceName: "a", sourceUrl: "https://a.test", authorityLevel: "DEMO" },
        { sourceName: "b", sourceUrl: "https://b.test", authorityLevel: "SECONDARY" },
      ]),
    ).toBe("SECONDARY");
  });

  it("no seeded record claims an authority level or retrieval it does not have", () => {
    // Nothing in this corpus was fetched. A record asserting PRIMARY or
    // SECONDARY authority, or carrying a retrieval date, would be claiming a
    // provenance that does not exist — the exact defect this tool detects.
    const corpus = getCorpus();
    const everyRef = [
      ...[...corpus.cases.values()].flatMap((c) => c.provenance),
      ...[...corpus.paragraphs.values()].flatMap((p) => p.provenance),
      ...[...corpus.provisions.values()].flatMap((p) => p.provenance),
      ...corpus.relationships.flatMap((r) => r.evidence),
    ];
    expect(everyRef.length).toBeGreaterThan(0);
    for (const ref of everyRef) {
      expect(ref.authorityLevel, ref.sourceName).toBe("DEMO");
      expect(ref.retrievedAt, `${ref.sourceName} claims a retrieval date`).toBeUndefined();
      expect(ref.note, ref.sourceName).toBeTruthy();
    }
  });

  it("every indexed case, passage and relationship carries provenance", () => {
    const corpus = getCorpus();
    for (const summary of corpus.cases.values()) {
      expect(hasEvidence(summary.provenance), `case ${summary.id}`).toBe(true);
    }
    for (const paragraph of corpus.paragraphs.values()) {
      expect(hasEvidence(paragraph.provenance), `paragraph ${paragraph.id}`).toBe(true);
    }
    for (const relationship of corpus.relationships) {
      expect(hasEvidence(relationship.evidence), `relationship ${relationship.id}`).toBe(true);
    }
    for (const provision of corpus.provisions.values()) {
      expect(hasEvidence(provision.provenance), `provision ${provision.id}`).toBe(true);
    }
  });
});

describe("verification status rules", () => {
  const base = {
    resolved: true,
    method: "EXACT_CITATION" as const,
    metadataMismatches: [] as string[],
    quotationMismatch: false,
    paragraphNumberMissing: false,
    propositionSupported: true,
    propositionWeak: false,
    hasParagraphText: true,
  };

  it("returns VERIFIED when every check passes", () => {
    expect(resolveStatus(base)).toBe("VERIFIED");
  });

  it("an unresolved record outranks every other finding", () => {
    expect(
      resolveStatus({
        ...base,
        resolved: false,
        metadataMismatches: ["year"],
        quotationMismatch: true,
        propositionWeak: true,
      }),
    ).toBe("NO_AUTHORITATIVE_MATCH");
  });

  it("a metadata mismatch outranks a paragraph mismatch", () => {
    expect(
      resolveStatus({ ...base, metadataMismatches: ["year"], quotationMismatch: true }),
    ).toBe("METADATA_MISMATCH");
  });

  it("resolution by title alone is itself a metadata mismatch", () => {
    expect(resolveStatus({ ...base, method: "FUZZY_TITLE" })).toBe("METADATA_MISMATCH");
  });

  it("a paragraph mismatch outranks weak proposition support", () => {
    expect(resolveStatus({ ...base, quotationMismatch: true, propositionWeak: true })).toBe(
      "PARAGRAPH_MISMATCH",
    );
  });

  it("a missing cited paragraph number is a paragraph mismatch", () => {
    expect(resolveStatus({ ...base, paragraphNumberMissing: true })).toBe("PARAGRAPH_MISMATCH");
  });

  it("weak support is reported when the authority does not bear the proposition", () => {
    expect(resolveStatus({ ...base, propositionSupported: false, propositionWeak: true })).toBe(
      "WEAK_PROPOSITION_SUPPORT",
    );
  });

  it("an inconclusive proposition routes to human review", () => {
    expect(resolveStatus({ ...base, propositionSupported: false })).toBe("NEEDS_REVIEW");
  });

  it("a record with no indexed text routes to human review", () => {
    expect(resolveStatus({ ...base, hasParagraphText: false })).toBe("NEEDS_REVIEW");
  });

  it("uses the coverage wording, not a fabrication claim", () => {
    expect(NO_MATCH_WORDING).toBe("No authoritative match in connected sources");
  });
});

describe("relationship mapping", () => {
  const focus = "sbi-v-ramakrishnan-sc-2018";

  it("returns relationships in both directions from one evidenced record", () => {
    const relationships = relationshipsFor(focus);
    expect(relationships.some((r) => r.type === "REVERSES")).toBe(true);
    // The inbound edges are the same facts seen from the other side.
    expect(relationships.some((r) => r.type === "CITED_BY")).toBe(true);
    for (const relationship of relationships) {
      expect(relationship.sourceCaseId).toBe(focus);
      expect(hasEvidence(relationship.evidence)).toBe(true);
    }
  });

  it("reports the authorities citing a record", () => {
    const citing = citingCases(focus).map((entry) => entry.case.id);
    expect(citing).toContain("lalit-kumar-jain-2021");
  });

  it("builds a graph whose every edge is evidenced", () => {
    const graph = buildGraph({ caseId: focus, depth: 2, includeProvisions: true });
    expect(graph.nodes.length).toBeGreaterThan(3);
    expect(graph.edges.length).toBeGreaterThan(3);
    for (const edge of graph.edges) {
      expect(hasEvidence(edge.evidence), `edge ${edge.id}`).toBe(true);
    }
  });

  it("does not draw a generic edge beside a specific one for the same pair", () => {
    const graph = buildGraph({ caseId: focus, depth: 2, includeProvisions: false });
    const pairs = new Map<string, string[]>();
    for (const edge of graph.edges) {
      const key = [edge.source, edge.target].sort().join("|");
      pairs.set(key, [...(pairs.get(key) ?? []), edge.type]);
    }
    for (const [pair, types] of pairs) {
      if (types.length > 1) {
        expect(types, `pair ${pair}`).not.toContain("RELATED");
      }
    }
  });

  it("includes statutory provision nodes when asked", () => {
    const graph = buildGraph({ caseId: focus, depth: 1, includeProvisions: true });
    expect(graph.nodes.some((n) => n.type === "PROVISION")).toBe(true);
  });

  it("returns an empty graph for an unknown case rather than throwing", () => {
    const graph = buildGraph({ caseId: "not-a-case", depth: 2, includeProvisions: true });
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });
});

describe("procedural timeline", () => {
  it("walks one matter across every forum that dealt with it", () => {
    const events = buildTimeline("sbi-v-ramakrishnan-sc-2018");
    expect(events).toHaveLength(3);
    expect(events.map((e) => e.date)).toEqual(["2017-12-18", "2018-02-28", "2018-08-14"]);
    expect(events.map((e) => e.kind)).toEqual(["DECISION", "AFFIRMATION", "REVERSAL"]);
    expect(events.filter((e) => e.isFocus)).toHaveLength(1);
  });

  it("does not pull in authorities that merely cite the case", () => {
    const events = buildTimeline("sbi-v-ramakrishnan-sc-2018");
    expect(events.map((e) => e.caseId)).not.toContain("lalit-kumar-jain-2021");
  });
});

describe("search", () => {
  it("resolves an exact citation to its record", () => {
    expect(findCaseByCitation("(2018) 17 SCC 394")?.id).toBe("sbi-v-ramakrishnan-sc-2018");
    expect(findCaseByCitation("2021 INSC 319")?.id).toBe("lalit-kumar-jain-2021");
  });

  it("ranks binding authority above a superseded decision on the same point", () => {
    const response = search({ q: "personal guarantor moratorium", page: 1, pageSize: 10 });
    const leading = response.results[0];
    expect(leading?.case.doctrinalStatus).toBe("BINDING_LANDMARK");
    expect(leading?.case.courtLevel).toBe("SUPREME_COURT");
  });

  it("returns nothing for a query that matches nothing", () => {
    const response = search({ q: "zzzznotanauthorityzzzz", page: 1, pageSize: 10 });
    expect(response.results).toHaveLength(0);
    expect(response.pagination.total).toBe(0);
  });

  it("computes facets that a filter can be applied from", () => {
    const response = search({ q: "moratorium", page: 1, pageSize: 10 });
    expect(response.facets.courts.length).toBeGreaterThan(0);
    expect(response.facets.sections.length).toBeGreaterThan(0);
    for (const facet of response.facets.courts) expect(facet.count).toBeGreaterThan(0);
  });

  it("applies a statutory-section filter", () => {
    const filtered = search({ q: "", section: ["ibc-s31"], page: 1, pageSize: 20 });
    for (const hit of filtered.results) {
      const dossier = getDossier(hit.case.id);
      expect(dossier?.provisions.some((p) => p.provision.id === "ibc-s31")).toBe(true);
    }
  });
});

describe("investigation board", () => {
  beforeEach(() => resetStore());

  it("pins an authority with the provenance it arrived with", () => {
    const investigation = createInvestigation({ title: "Test", ownerId: "owner-1" });
    const node = pinNode({
      investigationId: investigation.id,
      ownerId: "owner-1",
      nodeType: "CASE",
      entityId: "lalit-kumar-jain-2021",
      x: 10,
      y: 20,
    });
    expect(node.metadata.title).toContain("Lalit Kumar Jain");
    expect(hasEvidence(node.metadata.provenance)).toBe(true);
  });

  it("marks an investigator note as user-authored, never as authority", () => {
    const investigation = createInvestigation({ title: "Test", ownerId: "owner-1" });
    const node = pinNode({
      investigationId: investigation.id,
      ownerId: "owner-1",
      nodeType: "NOTE",
      note: "Check the NCLAT reasoning again.",
      x: 0,
      y: 0,
    });
    expect(node.metadata.provenance[0]?.authorityLevel).toBe("USER");
  });

  it("refuses to pin an entity that is not in the corpus", () => {
    const investigation = createInvestigation({ title: "Test", ownerId: "owner-1" });
    expect(() =>
      pinNode({
        investigationId: investigation.id,
        ownerId: "owner-1",
        nodeType: "CASE",
        entityId: "not-a-case",
        x: 0,
        y: 0,
      }),
    ).toThrow(/not in the corpus/);
  });

  it("persists a moved node position", () => {
    const investigation = createInvestigation({ title: "Test", ownerId: "owner-1" });
    const node = pinNode({
      investigationId: investigation.id,
      ownerId: "owner-1",
      nodeType: "PROVISION",
      entityId: "ibc-s14",
      x: 0,
      y: 0,
    });
    moveNode({
      investigationId: investigation.id,
      ownerId: "owner-1",
      nodeId: node.id,
      x: 240,
      y: 160,
    });
    expect(node.x).toBe(240);
    expect(node.y).toBe(160);
  });

  it("records a user-drawn link as a user assertion", () => {
    const investigation = createInvestigation({ title: "Test", ownerId: "owner-1" });
    const a = pinNode({
      investigationId: investigation.id,
      ownerId: "owner-1",
      nodeType: "CASE",
      entityId: "lalit-kumar-jain-2021",
      x: 0,
      y: 0,
    });
    const b = pinNode({
      investigationId: investigation.id,
      ownerId: "owner-1",
      nodeType: "CASE",
      entityId: "essar-steel-coc-2019",
      x: 300,
      y: 0,
    });
    const edge = createEdge({
      investigationId: investigation.id,
      ownerId: "owner-1",
      sourceNodeId: a.id,
      targetNodeId: b.id,
      relationshipType: "USER_LINK",
      label: "compare clean-slate reasoning",
    });
    expect(edge.evidence[0]?.authorityLevel).toBe("USER");
  });

  it("refuses access to another user's board", () => {
    const investigation = createInvestigation({ title: "Private", ownerId: "owner-1" });
    expect(() =>
      pinNode({
        investigationId: investigation.id,
        ownerId: "someone-else",
        nodeType: "CASE",
        entityId: "lalit-kumar-jain-2021",
        x: 0,
        y: 0,
      }),
    ).toThrow(/belongs to another user/);
  });

  it("summarises a board without counting user notes as sources", () => {
    const investigation = createInvestigation({ title: "Test", ownerId: "owner-1" });
    pinNode({
      investigationId: investigation.id,
      ownerId: "owner-1",
      nodeType: "CASE",
      entityId: "lalit-kumar-jain-2021",
      x: 0,
      y: 0,
    });
    pinNode({
      investigationId: investigation.id,
      ownerId: "owner-1",
      nodeType: "NOTE",
      note: "A thought.",
      x: 0,
      y: 100,
    });
    const summary = summarize(investigation);
    expect(summary.cases).toBe(1);
    expect(summary.notes).toBe(1);
    expect(summary.sources.every((ref) => ref.authorityLevel !== "USER")).toBe(true);
  });
});
