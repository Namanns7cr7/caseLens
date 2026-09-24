import "server-only";

import { getCase, getDossier } from "@/server/repositories/case-repository";
import { getAnalysis } from "@/server/services/document-service";
import { getInvestigation, summarize } from "@/server/services/investigation-service";
import { AI_DISCLAIMER, NO_MATCH_WORDING } from "@/server/services/provenance";
import { STATUS_LABELS } from "@/server/services/verification-service";
import type { Report, ReportEntry, ReportSection, VerificationStatus } from "@/types/domain";

/**
 * Report assembly.
 *
 * Reports are the artefact that leaves CaseLens, so they are held to the
 * strictest form of the provenance rule: every entry carries the sources
 * behind it, user-authored material is labelled as such, and the wording for
 * an unresolved citation is the coverage wording from LEGAL_DATA_RULES.md.
 * Nothing is generated here — every line is drawn from stored records.
 */

const DISCLAIMER = `${AI_DISCLAIMER} Findings below are limited to the sources CaseLens is connected to; an absence of a match is a statement about that coverage, not a finding that an authority does not exist.`;

function formatDate(date: string | undefined): string {
  if (!date) return "Date not recorded";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/* ------------------------------------------------------------------ */
/* Investigation report                                                */
/* ------------------------------------------------------------------ */

export function buildInvestigationReport(investigationId: string): Report | undefined {
  const investigation = getInvestigation(investigationId);
  if (!investigation) return undefined;
  const summary = summarize(investigation);

  const sections: ReportSection[] = [];

  sections.push({
    id: "scope",
    heading: "Scope of the investigation",
    body:
      investigation.description ??
      "No description was recorded for this investigation. The scope below is inferred from the material pinned to the board.",
    entries: [
      {
        title: "Material assembled",
        detail: [
          `${summary.cases} ${summary.cases === 1 ? "authority" : "authorities"}`,
          `${summary.provisions} statutory ${summary.provisions === 1 ? "provision" : "provisions"}`,
          `${summary.evidence} evidence ${summary.evidence === 1 ? "item" : "items"}`,
          `${summary.notes} investigator ${summary.notes === 1 ? "note" : "notes"}`,
          `${summary.userLinks} user-created ${summary.userLinks === 1 ? "link" : "links"}`,
        ].join(" · "),
        provenance: [],
      },
    ],
  });

  const authorities = investigation.nodes.filter((n) => n.nodeType === "CASE");
  if (authorities.length > 0) {
    sections.push({
      id: "authorities",
      heading: "Authorities relied on",
      entries: authorities.map((node): ReportEntry => {
        const summaryRecord = node.entityId ? getCase(node.entityId) : undefined;
        return {
          title: node.metadata.title,
          ...(node.metadata.citation ? { subtitle: node.metadata.citation } : {}),
          detail: summaryRecord
            ? `${summaryRecord.court} · Decided ${formatDate(summaryRecord.decisionDate)}${summaryRecord.benchStrength ? ` · ${summaryRecord.benchStrength}-judge bench` : ""}${summaryRecord.summary ? `\n\n${summaryRecord.summary}` : ""}`
            : node.metadata.subtitle,
          provenance: node.metadata.provenance,
        };
      }),
    });
  }

  const provisions = investigation.nodes.filter((n) => n.nodeType === "PROVISION");
  if (provisions.length > 0) {
    sections.push({
      id: "provisions",
      heading: "Statutory provisions",
      entries: provisions.map((node) => ({
        title: node.metadata.title,
        ...(node.metadata.subtitle ? { subtitle: node.metadata.subtitle } : {}),
        ...(node.metadata.excerpt ? { detail: node.metadata.excerpt } : {}),
        provenance: node.metadata.provenance,
      })),
    });
  }

  const evidence = investigation.nodes.filter((n) => n.nodeType === "EVIDENCE");
  if (evidence.length > 0) {
    sections.push({
      id: "evidence",
      heading: "Evidence inspected",
      body: "Each item below is reproduced from the source record it was pinned from.",
      entries: evidence.map((node) => ({
        title: node.metadata.title,
        ...(node.metadata.subtitle ? { subtitle: node.metadata.subtitle } : {}),
        ...(node.metadata.excerpt ? { detail: node.metadata.excerpt } : {}),
        ...(node.metadata.verificationStatus ? { status: node.metadata.verificationStatus } : {}),
        provenance: node.metadata.provenance,
      })),
    });
  }

  const notes = investigation.nodes.filter((n) => n.nodeType === "NOTE");
  if (notes.length > 0) {
    sections.push({
      id: "notes",
      heading: "Investigator notes",
      body: "The following were authored by the investigator and are not legal authority.",
      entries: notes.map((node) => ({
        title: "Note",
        ...(node.metadata.excerpt ? { detail: node.metadata.excerpt } : {}),
        provenance: node.metadata.provenance,
      })),
    });
  }

  if (investigation.edges.length > 0) {
    sections.push({
      id: "links",
      heading: "Connections drawn by the investigator",
      body: "These links were created on the board. They record the investigator's reasoning and are not relationships asserted by a source.",
      entries: investigation.edges.map((edge) => {
        const source = investigation.nodes.find((n) => n.id === edge.sourceNodeId);
        const target = investigation.nodes.find((n) => n.id === edge.targetNodeId);
        return {
          title: `${source?.metadata.title ?? "Unknown"} → ${target?.metadata.title ?? "Unknown"}`,
          subtitle: edge.label ?? edge.relationshipType.replace(/_/g, " ").toLowerCase(),
          provenance: edge.evidence,
        };
      }),
    });
  }

  if (summary.sources.length > 0) {
    sections.push({
      id: "sources",
      heading: "Sources",
      body: "Every source the material above was drawn from.",
      entries: summary.sources.map((ref) => ({
        title: ref.sourceName,
        subtitle: ref.sourceUrl,
        ...(ref.note ? { detail: ref.note } : {}),
        provenance: [ref],
      })),
    });
  }

  return {
    id: `report-inv-${investigation.id}`,
    kind: "INVESTIGATION",
    title: investigation.title,
    subtitle: "Investigation report",
    generatedAt: new Date().toISOString(),
    subjectId: investigation.id,
    sections,
    disclaimer: DISCLAIMER,
  };
}

/* ------------------------------------------------------------------ */
/* Legal integrity report                                              */
/* ------------------------------------------------------------------ */

const STATUS_ORDER: VerificationStatus[] = [
  "NO_AUTHORITATIVE_MATCH",
  "METADATA_MISMATCH",
  "PARAGRAPH_MISMATCH",
  "WEAK_PROPOSITION_SUPPORT",
  "NEEDS_REVIEW",
  "VERIFIED",
];

export function buildIntegrityReport(documentId: string): Report | undefined {
  const analysis = getAnalysis(documentId);
  if (!analysis) return undefined;

  const sections: ReportSection[] = [];
  const { summary, document } = analysis;

  sections.push({
    id: "overview",
    heading: "Document examined",
    entries: [
      {
        title: document.filename,
        subtitle: `${document.pageCount ?? "?"} pages · SHA-256 ${document.sha256.slice(0, 32)}…`,
        detail: `${summary.total} ${summary.total === 1 ? "citation was" : "citations were"} detected and checked against the connected sources. ${summary.verified} verified; ${summary.issues} require attention.`,
        provenance: [
          {
            sourceName: `Uploaded document: ${document.filename}`,
            sourceUrl: "",
            authorityLevel: "USER",
            retrievedAt: document.createdAt,
            note: `Content hash SHA-256 ${document.sha256}. Checks below were run against this exact file.`,
          },
        ],
      },
    ],
  });

  sections.push({
    id: "summary",
    heading: "Findings by status",
    entries: STATUS_ORDER.filter((status) => summary.byStatus[status] > 0).map((status) => ({
      title: STATUS_LABELS[status],
      subtitle: `${summary.byStatus[status]} ${summary.byStatus[status] === 1 ? "citation" : "citations"}`,
      status,
      provenance: [],
    })),
  });

  // Issues first, then verified citations — the order a reviewer needs.
  const ordered = [...analysis.results].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );

  const issues = ordered.filter((r) => r.status !== "VERIFIED");
  if (issues.length > 0) {
    sections.push({
      id: "issues",
      heading: "Citations requiring attention",
      body: `Each finding below states what the document claims, what the connected sources record, and the checks that produced the conclusion. A “${NO_MATCH_WORDING}” finding reports the limits of the connected sources.`,
      entries: issues.map((result): ReportEntry => {
        const citation = analysis.citations.find((c) => c.id === result.extractedCitationId);
        const comparison = result.claimedVsActual
          .filter((c) => c.claimed || c.authoritative)
          .map(
            (c) =>
              `${c.field}: document states ${c.claimed ?? "—"}; connected sources record ${c.authoritative ?? "no matching record"}${c.agrees ? "" : "  ⟵ differs"}`,
          )
          .join("\n");
        const checks = result.checks
          .map((c) => `${c.label} — ${c.outcome}: ${c.detail}`)
          .join("\n");

        return {
          title: citation?.claimedCaseTitle ?? citation?.rawText ?? "Citation",
          subtitle: `${citation?.rawText ?? ""}${citation?.pageNumber ? ` · page ${citation.pageNumber}` : ""}`,
          detail: `${result.explanation}\n\nCLAIMED vs. AUTHORITATIVE\n${comparison}\n\nCHECKS RUN\n${checks}`,
          status: result.status,
          provenance: result.evidence,
        };
      }),
    });
  }

  const verified = ordered.filter((r) => r.status === "VERIFIED");
  if (verified.length > 0) {
    sections.push({
      id: "verified",
      heading: "Citations verified",
      entries: verified.map((result) => {
        const citation = analysis.citations.find((c) => c.id === result.extractedCitationId);
        return {
          title: citation?.claimedCaseTitle ?? citation?.rawText ?? "Citation",
          subtitle: `${citation?.rawText ?? ""}${citation?.pageNumber ? ` · page ${citation.pageNumber}` : ""}`,
          detail: result.explanation,
          status: result.status,
          provenance: result.evidence,
        };
      }),
    });
  }

  sections.push({
    id: "method",
    heading: "How these findings were produced",
    body: [
      "Citations were detected in the extracted text and normalized.",
      "Each was looked up by exact identifier against the indexed corpus; where that failed, by fuzzy case-title match.",
      "Metadata (title, year, reporter, forum) was compared field by field against the matched record.",
      "Quotations were checked against the indexed paragraph text, exact match first and fuzzy match second.",
      "Proposition support was measured against the authority's own paragraphs.",
      analysis.results.some((r) => r.modelVersion)
        ? `A model (${analysis.results.find((r) => r.modelVersion)?.modelVersion}) was consulted only for the proposition-support step, and only after a record had already been resolved from source data.`
        : "No model was consulted. Every finding above is deterministic and reproducible.",
    ].join(" "),
    entries: [],
  });

  return {
    id: `report-doc-${document.id}`,
    kind: "INTEGRITY",
    title: document.filename,
    subtitle: "Legal integrity report",
    generatedAt: new Date().toISOString(),
    subjectId: document.id,
    sections,
    disclaimer: DISCLAIMER,
  };
}

/** A dossier-scoped report, used when exporting a single case. */
export function buildCaseReport(caseId: string): Report | undefined {
  const dossier = getDossier(caseId);
  if (!dossier) return undefined;

  return {
    id: `report-case-${caseId}`,
    kind: "INVESTIGATION",
    title: dossier.summary.title,
    subtitle: "Case dossier export",
    generatedAt: new Date().toISOString(),
    subjectId: caseId,
    sections: [
      {
        id: "record",
        heading: "Record",
        entries: [
          {
            title: dossier.summary.title,
            subtitle: dossier.summary.citation ?? dossier.summary.caseNumber,
            detail: `${dossier.summary.court} · Decided ${formatDate(dossier.summary.decisionDate)}\n\n${dossier.summary.summary ?? ""}`,
            provenance: dossier.summary.provenance,
          },
        ],
      },
      {
        id: "holdings",
        heading: "Key passages",
        entries: dossier.keyParagraphs.map((paragraph) => ({
          title: `¶ ${paragraph.paragraphNumber}`,
          detail: paragraph.text,
          provenance: paragraph.provenance,
        })),
      },
      {
        id: "provisions",
        heading: "Statutory provisions considered",
        entries: dossier.provisions.map((link) => ({
          title: link.provision.label,
          subtitle: `${link.relationType.toLowerCase()} · ${link.provision.heading}`,
          ...(link.provision.text ? { detail: link.provision.text } : {}),
          provenance: link.provision.provenance,
        })),
      },
    ],
    disclaimer: DISCLAIMER,
  };
}
