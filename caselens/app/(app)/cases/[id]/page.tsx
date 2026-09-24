import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import {
  CitationStamp,
  DoctrinalPill,
  EmptyState,
  PanelHeading,
  StatuteChip,
} from "@/components/ui/primitives";
import { ProvenanceDisclosure } from "@/components/ui/provenance";
import { Timeline } from "@/components/case/timeline";
import { PinButton } from "@/components/investigation/pin-button";
import { RELATIONSHIP_LABELS } from "@/server/services/graph-service";
import {
  buildTimeline,
  citationCount,
  citingCases,
  getCase,
  getDossier,
  relationshipsFor,
} from "@/server/repositories/case-repository";

/**
 * The case dossier.
 *
 * Layout follows the Stitch tri-panel stance: a metadata masthead, a wide
 * editorial reading column for the judgment passages, and a right rail of
 * connected authorities and provisions. On mobile the columns stack.
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const dossier = getDossier(id);
  return { title: dossier?.summary.title ?? "Case not found" };
}

function formatDate(value: string | undefined): string {
  if (!value) return "Date not recorded";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const ROLE_LABELS: Record<string, string> = {
  APPELLANT: "Appellant",
  RESPONDENT: "Respondent",
  PETITIONER: "Petitioner",
  INTERVENER: "Intervener",
};

export default async function CaseDossierPage({ params }: PageProps) {
  const { id } = await params;
  const dossier = getDossier(id);
  if (!dossier) notFound();

  const { summary } = dossier;
  const timeline = buildTimeline(id);
  const relationships = relationshipsFor(id);
  const citedBy = citingCases(id);
  const paragraphs = dossier.judgment?.paragraphs ?? [];

  return (
    <div className="bg-canvas min-h-full">
      {/* Masthead */}
      <header className="bg-surface-container-lowest border-b border-outline-variant px-space-md lg:px-space-lg py-space-lg">
        <div className="max-w-[1400px] mx-auto">
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 text-body-sm font-label-md text-secondary hover:underline mb-3"
          >
            <Icon name="arrow_back" size={14} />
            Back to case finder
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <DoctrinalPill status={summary.doctrinalStatus} />
            {summary.benchStrength && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container font-statute-code text-statute-code font-semibold text-on-surface">
                {summary.benchStrength}-JUDGE BENCH
              </span>
            )}
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-low font-statute-code text-statute-code text-on-surface-variant">
              {summary.court}
            </span>
          </div>

          <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-primary leading-tight max-w-4xl">
            {summary.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-body-sm text-on-surface-variant">
            {(summary.neutralCitation || summary.reporterCitations.length > 0) && (
              <CitationStamp
                value={[summary.neutralCitation, ...summary.reporterCitations].filter(Boolean).join("  |  ")}
              />
            )}
            {summary.caseNumber && (
              <>
                <span className="text-muted">•</span>
                <span className="font-citation-mono text-[12px]">{summary.caseNumber}</span>
              </>
            )}
            <span className="text-muted">•</span>
            <span>
              <strong className="font-medium text-on-surface">Decided:</strong>{" "}
              {formatDate(summary.decisionDate)}
            </span>
            {dossier.judges.length > 0 && (
              <>
                <span className="text-muted">•</span>
                <span>
                  <strong className="font-medium text-on-surface">Coram:</strong>{" "}
                  {dossier.judges
                    .map((entry) => `${entry.judge.name}${entry.authoring ? " (authoring)" : ""}`)
                    .join(", ")}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Link href={`/cases/${id}/graph`} className="cl-btn-accent">
              <Icon name="account_tree" size={16} />
              Open relationship graph
            </Link>
            <PinButton nodeType="CASE" entityId={id} label="Pin case to board" />
            <Link href={`/verify?against=${id}`} className="cl-btn-secondary">
              <Icon name="file_search" size={16} />
              Verify a document against this
            </Link>
          </div>

          <ProvenanceDisclosure evidence={summary.provenance} label="Record source" className="mt-4" />
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-space-md lg:px-space-lg py-space-lg grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-space-lg">
        {/* Reading column */}
        <div className="space-y-space-lg min-w-0">
          {summary.summary && (
            <section className="cl-card p-space-lg">
              <PanelHeading icon="description" title="Headnote" className="mb-3" />
              <p className="font-judgment-editorial text-judgment-editorial text-on-surface leading-relaxed">
                {summary.summary}
              </p>
            </section>
          )}

          {dossier.issues.length > 0 && (
            <section className="cl-card p-space-lg">
              <PanelHeading icon="push_pin" title="Issues framed" className="mb-3" />
              <ol className="space-y-2">
                {dossier.issues.map((issue, index) => (
                  <li key={issue} className="flex gap-2.5 text-body-md text-on-surface">
                    <span className="font-citation-mono text-secondary font-semibold shrink-0">
                      {index + 1}.
                    </span>
                    <span className="leading-relaxed">{issue}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Judgment passages */}
          <section className="cl-card p-space-lg">
            <PanelHeading
              icon="format_quote"
              title="Judgment passages"
              trailing={
                <span className="font-citation-mono text-[11px] text-muted">
                  {paragraphs.length} indexed
                </span>
              }
              className="mb-4"
            />

            {paragraphs.length === 0 ? (
              <EmptyState
                icon="description"
                title="No paragraph text is indexed for this record"
                description="The metadata for this authority is indexed, but its judgment text has not been ingested. Open the source record to read it."
                action={
                  <a
                    href={summary.provenance[0]?.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="cl-btn-secondary"
                  >
                    <Icon name="open_in_new" size={16} />
                    Open source record
                  </a>
                }
              />
            ) : (
              <div className="space-y-4">
                {paragraphs.map((paragraph) => (
                  <article
                    key={paragraph.id}
                    id={`para-${paragraph.paragraphNumber}`}
                    className={
                      paragraph.isRatio
                        ? "rounded-lg border border-outline-variant/60 border-l-[3px] border-l-secondary bg-surface-container-low/60 p-4"
                        : "rounded-lg border border-outline-variant/50 p-4"
                    }
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      {paragraph.isRatio && (
                        <span className="font-statute-code text-statute-code text-secondary uppercase font-bold">
                          Operative ratio decidendi
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-2 shrink-0">
                        <PinButton
                          nodeType="EVIDENCE"
                          entityId={paragraph.id}
                          label="Pin passage"
                        />
                      </div>
                    </div>

                    <p className="font-judgment-editorial text-judgment-editorial text-on-surface leading-relaxed">
                      <span className="font-citation-mono text-secondary font-semibold mr-1.5">
                        ¶ {paragraph.paragraphNumber}.
                      </span>
                      {paragraph.text}
                    </p>

                    <ProvenanceDisclosure
                      evidence={paragraph.provenance}
                      label="Passage source"
                      className="mt-3"
                    />
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Procedural chronology */}
          <section className="cl-card p-space-lg">
            <PanelHeading
              icon="history"
              title="Procedural chronology"
              trailing={
                <span className="font-citation-mono text-[11px] text-muted">
                  {timeline.length} {timeline.length === 1 ? "stage" : "stages"}
                </span>
              }
              className="mb-4"
            />
            {timeline.length <= 1 ? (
              <EmptyState
                icon="schedule"
                title="No earlier or later stage is indexed for this matter"
                description="CaseLens links procedural stages through appeal, affirmation, reversal and remand relationships. None are recorded for this record in the connected sources."
              />
            ) : (
              <Timeline events={timeline} />
            )}
          </section>
        </div>

        {/* Right rail */}
        <aside className="space-y-space-lg min-w-0">
          {/* Statutory provisions */}
          <section className="cl-card p-4">
            <PanelHeading icon="menu_book" title="Provisions considered" className="mb-3" />
            {dossier.provisions.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">
                No statutory provision is linked to this record.
              </p>
            ) : (
              <ul className="space-y-3">
                {dossier.provisions.map((link) => (
                  <li key={`${link.provision.id}-${link.relationType}`} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <StatuteChip label={link.provision.label} />
                      <span className="font-statute-code text-statute-code uppercase text-muted">
                        {link.relationType.toLowerCase()}
                      </span>
                    </div>
                    <p className="text-body-sm font-medium text-on-surface">{link.provision.heading}</p>
                    {link.provision.text && (
                      <p className="text-[12px] text-on-surface-variant leading-relaxed line-clamp-3">
                        {link.provision.text}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <PinButton
                        nodeType="PROVISION"
                        entityId={link.provision.id}
                        label="Pin provision"
                      />
                    </div>
                    <ProvenanceDisclosure evidence={link.evidence} label="Link evidence" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Connected authorities */}
          <section className="cl-card p-4">
            <PanelHeading
              icon="account_tree"
              title="Connected authorities"
              trailing={
                <Link href={`/cases/${id}/graph`} className="text-[12px] font-label-md text-secondary hover:underline">
                  Graph →
                </Link>
              }
              className="mb-3"
            />
            {relationships.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">
                No relationship to another indexed authority is recorded.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {relationships.map((relationship) => {
                  const target = getCase(relationship.targetCaseId);
                  if (!target) return null;
                  return (
                    <li key={relationship.id}>
                      <Link
                        href={`/cases/${target.id}`}
                        className="block p-2 rounded border border-transparent hover:border-outline-variant hover:bg-surface-container-low transition-colors"
                      >
                        <span className="font-statute-code text-statute-code uppercase text-secondary">
                          {RELATIONSHIP_LABELS[relationship.type]}
                        </span>
                        <span className="block text-body-sm font-medium text-on-surface leading-snug">
                          {target.title}
                        </span>
                        <span className="block text-[11px] font-citation-mono text-muted">
                          {target.courtShortName}
                          {target.decisionDate ? ` • ${target.decisionDate.slice(0, 4)}` : ""}
                        </span>
                      </Link>
                      <ProvenanceDisclosure
                        evidence={relationship.evidence}
                        label="Edge evidence"
                        className="pl-2"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Subsequent treatment */}
          <section className="cl-card p-4">
            <PanelHeading icon="trending_up" title="Subsequent treatment" className="mb-3" />
            <p className="text-body-sm text-on-surface-variant mb-3">
              <span className="font-citation-mono font-semibold text-on-surface">
                {citationCount(id).toLocaleString("en-IN")}
              </span>{" "}
              subsequent citations recorded;{" "}
              <span className="font-citation-mono font-semibold text-on-surface">{citedBy.length}</span>{" "}
              indexed in this corpus.
            </p>
            {citedBy.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">
                No indexed authority in this corpus cites this record.
              </p>
            ) : (
              <ul className="space-y-2">
                {citedBy.map(({ case: citing, relationship }) => (
                  <li key={relationship.id}>
                    <Link
                      href={`/cases/${citing.id}`}
                      className="block p-2 rounded border border-transparent hover:border-outline-variant hover:bg-surface-container-low transition-colors"
                    >
                      <span className="font-statute-code text-statute-code uppercase text-secondary">
                        {RELATIONSHIP_LABELS[relationship.type]} this case
                      </span>
                      <span className="block text-body-sm font-medium text-on-surface leading-snug truncate">
                        {citing.title}
                      </span>
                      <span className="block text-[11px] font-citation-mono text-muted">
                        {citing.courtShortName}
                        {citing.decisionDate ? ` • ${citing.decisionDate.slice(0, 4)}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Parties */}
          {dossier.parties.length > 0 && (
            <section className="cl-card p-4">
              <PanelHeading icon="groups" title="Parties" className="mb-3" />
              <ul className="space-y-1.5">
                {dossier.parties.map((entry) => (
                  <li key={`${entry.party.id}-${entry.role}`} className="flex items-baseline justify-between gap-2">
                    <span className="text-body-sm text-on-surface">{entry.party.name}</span>
                    <span className="font-statute-code text-statute-code uppercase text-muted shrink-0">
                      {ROLE_LABELS[entry.role] ?? entry.role}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
