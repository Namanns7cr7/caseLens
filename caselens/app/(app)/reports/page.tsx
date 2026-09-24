import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { EmptyState, PanelHeading } from "@/components/ui/primitives";
import { currentOwnerId } from "@/server/auth/session";
import { listDocuments } from "@/server/services/document-service";
import { listInvestigations } from "@/server/services/investigation-service";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const ownerId = await currentOwnerId();
  const investigations = listInvestigations(ownerId);
  const documents = listDocuments().filter(
    (document) => !document.ownerId || document.ownerId === ownerId,
  );

  const empty = investigations.length === 0 && documents.length === 0;

  return (
    <div className="bg-canvas min-h-full">
      <div className="max-w-[1000px] mx-auto px-space-md lg:px-space-lg py-space-lg space-y-space-lg">
        <header>
          <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-primary leading-tight">
            Reports
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
            Every report is assembled from stored records. Nothing in it is generated prose, and
            each entry carries the sources it was drawn from.
          </p>
        </header>

        {empty ? (
          <EmptyState
            icon="description"
            title="No report to export yet"
            description="Reports are produced from an investigation board or from a verified document. Build one and the export becomes available."
            action={
              <div className="flex flex-wrap gap-2 justify-center">
                <Link href="/verify" className="cl-btn-accent">
                  <Icon name="file_search" size={16} />
                  Verify a document
                </Link>
                <Link href="/search" className="cl-btn-secondary">
                  <Icon name="search" size={16} />
                  Start from a search
                </Link>
              </div>
            }
          />
        ) : (
          <>
            {documents.length > 0 && (
              <section>
                <PanelHeading icon="shield" title="Legal integrity reports" className="mb-3" />
                <ul className="cl-card divide-y divide-outline-variant">
                  {documents.map((document) => (
                    <li key={document.id}>
                      <Link
                        href={`/reports/${document.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors"
                      >
                        <Icon name="description" size={18} className="text-secondary shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-body-md font-medium text-on-surface truncate">
                            {document.filename}
                          </span>
                          <span className="block font-citation-mono text-[11px] text-muted">
                            {document.pageCount ?? "?"} pages · {document.extractionStatus.toLowerCase()}
                          </span>
                        </span>
                        <Icon name="chevron_right" size={16} className="ml-auto text-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {investigations.length > 0 && (
              <section>
                <PanelHeading icon="account_tree" title="Investigation reports" className="mb-3" />
                <ul className="cl-card divide-y divide-outline-variant">
                  {investigations.map((investigation) => (
                    <li key={investigation.id}>
                      <Link
                        href={`/reports/${investigation.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors"
                      >
                        <Icon name="account_tree" size={18} className="text-secondary shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-body-md font-medium text-on-surface truncate">
                            {investigation.title}
                          </span>
                          <span className="block font-citation-mono text-[11px] text-muted">
                            {investigation.nodes.length} pinned items
                          </span>
                        </span>
                        <Icon name="chevron_right" size={16} className="ml-auto text-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
