import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReportView } from "@/components/report/report-view";
import { currentOwnerId } from "@/server/auth/session";
import { getDocumentRecord } from "@/server/services/document-service";
import { getInvestigation } from "@/server/services/investigation-service";
import {
  buildCaseReport,
  buildIntegrityReport,
  buildInvestigationReport,
} from "@/server/services/report-service";
import type { Report } from "@/types/domain";

/**
 * One route renders every report kind, dispatching on the subject id:
 *   inv-<id>       investigation report
 *   doc-<id>       legal integrity report
 *   case:<caseId>  dossier export
 *
 * Investigation and document ids already carry their own prefix, so they are
 * passed through as-is rather than prefixed a second time.
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

async function resolveReport(id: string): Promise<Report | undefined> {
  const ownerId = await currentOwnerId();

  if (id.startsWith("inv-")) {
    const investigation = getInvestigation(id);
    if (!investigation || investigation.ownerId !== ownerId) return undefined;
    return buildInvestigationReport(id);
  }

  if (id.startsWith("doc-")) {
    const record = getDocumentRecord(id);
    if (!record) return undefined;
    if (record.document.ownerId && record.document.ownerId !== ownerId) return undefined;
    return buildIntegrityReport(id);
  }

  if (id.startsWith("case:")) return buildCaseReport(id.slice(5));
  return undefined;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const report = await resolveReport(id);
  return { title: report ? `${report.subtitle} — ${report.title}` : "Report" };
}

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;
  const report = await resolveReport(id);
  if (!report) notFound();

  return (
    <div className="bg-canvas min-h-full">
      <ReportView report={report} />
    </div>
  );
}
