import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { PanelHeading } from "@/components/ui/primitives";
import { AuthorityChip } from "@/components/ui/provenance";
import { getCorpus } from "@/server/db/seed";
import { listCases, listCourts, listProvisions } from "@/server/repositories/case-repository";
import { AI_DISCLAIMER } from "@/server/services/provenance";
import { isModelConfigured, modelVersion } from "@/server/ai/gemini";
import { driverKind } from "@/server/db/client";
import type { AuthorityLevel } from "@/types/domain";

export const metadata: Metadata = { title: "Sources" };

/**
 * Source transparency.
 *
 * LEGAL_DATA_RULES.md requires that a user can see what CaseLens is connected
 * to and at what authority level. This page states the limits of the index
 * plainly — including that passage text in this build is a demo fixture —
 * because a verification tool that overstates its coverage is worse than one
 * that has none.
 */

const AUTHORITY_GUIDE: Array<{ level: AuthorityLevel; description: string }> = [
  {
    level: "PRIMARY",
    description:
      "Official court, registry or gazette record. Nothing in this build carries this level.",
  },
  {
    level: "SECONDARY",
    description:
      "Reporter or established legal database record. Nothing in this build carries this level either.",
  },
  {
    level: "DEMO",
    description:
      "Written from model recollection, not retrieved. Everything in this index sits here: metadata, statutory text and judgment passages.",
  },
  {
    level: "USER",
    description:
      "Authored by you on an investigation board. Never an authority about the law.",
  },
];

export default function SourcesPage() {
  const corpus = getCorpus();
  const cases = listCases();
  const courts = listCourts();
  const provisions = listProvisions();
  const paragraphCount = corpus.paragraphs.size;
  const relationshipCount = corpus.relationships.length;

  return (
    <div className="bg-canvas min-h-full">
      <div className="max-w-[1000px] mx-auto px-space-md lg:px-space-lg py-space-lg space-y-space-lg">
        <header>
          <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-primary leading-tight">
            Sources and coverage
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
            Every finding CaseLens reports is bounded by what it is connected to. This page states
            what that is.
          </p>
        </header>

        {/* The honest caveat, first */}
        <section className="rounded-xl border-2 border-mismatch-border bg-mismatch-surface p-space-lg">
          <div className="flex items-start gap-3">
            <Icon name="report_problem" size={22} className="text-mismatch-ink mt-0.5 shrink-0" />
            <div className="space-y-2">
              <h2 className="font-headline-md text-headline-md text-mismatch-ink leading-tight">
                Nothing in this index was retrieved from a source
              </h2>
              <p className="text-body-md text-mismatch-ink/90 leading-relaxed">
                CaseLens has made <strong>no request</strong> to the Supreme Court portal, the NCLAT
                site, India Code, or any other source. Every record below — case titles, citations,
                forums, dates, judges, statutory text and judgment passages alike — was written
                from model recollection for this demonstration. It is all{" "}
                <AuthorityChip level="DEMO" /> and none of it carries a retrieval date, because no
                retrieval happened. The links are where you can <em>check</em> a record, not where
                it came from.
              </p>
              <p className="text-body-md text-mismatch-ink/90 leading-relaxed">
                The metadata may well be correct — these are well-known authorities — but
                &ldquo;probably right from memory&rdquo; is not provenance. A tool built to catch
                unsupported citations must not make unsupported claims of its own, so the index
                states its own status rather than dressing it up.
              </p>
              <p className="text-body-md text-mismatch-ink/90 leading-relaxed">
                What this means for findings: the engine is genuinely reliable about{" "}
                <strong>internal consistency</strong> — whether a citation resolves to an indexed
                record and whether the stated metadata agrees with it. It cannot tell you whether
                the indexed record itself is faithful to the real judgment. Treat quotation and
                proposition findings as indicative only until the corpus is replaced with verified
                source text.
              </p>
            </div>
          </div>
        </section>

        {/* Index contents */}
        <section>
          <PanelHeading icon="hub" title="What is indexed" className="mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Authorities", value: cases.length },
              { label: "Forums", value: courts.length },
              { label: "Provisions", value: provisions.length },
              { label: "Indexed passages", value: paragraphCount },
              { label: "Evidenced relationships", value: relationshipCount },
              { label: "Judges", value: corpus.judges.size },
              { label: "Parties", value: corpus.parties.size },
              { label: "Enactments", value: corpus.statutes.size },
            ].map((stat) => (
              <div key={stat.label} className="cl-card p-3">
                <p className="font-citation-mono text-2xl font-semibold text-on-surface">
                  {stat.value}
                </p>
                <p className="font-label-md text-label-md uppercase tracking-wider text-muted mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Authority levels */}
        <section className="cl-card p-space-lg">
          <PanelHeading icon="verified" title="Authority levels" className="mb-4" />
          <dl className="space-y-3">
            {AUTHORITY_GUIDE.map((entry) => (
              <div key={entry.level} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                <dt className="sm:w-40 shrink-0">
                  <AuthorityChip level={entry.level} />
                </dt>
                <dd className="text-body-sm text-on-surface-variant leading-relaxed">
                  {entry.description}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Indexed authorities */}
        <section>
          <PanelHeading icon="gavel" title="Indexed authorities" className="mb-3" />
          <ul className="cl-card divide-y divide-outline-variant">
            {cases.map((summary) => (
              <li key={summary.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={`/cases/${summary.id}`}
                    className="font-headline-md text-body-lg text-on-surface hover:text-secondary leading-snug"
                  >
                    {summary.title}
                  </Link>
                  <span className="font-citation-mono text-[11px] text-muted shrink-0">
                    {summary.courtShortName}
                    {summary.decisionDate ? ` · ${summary.decisionDate}` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="font-citation-mono text-[12px] text-on-surface-variant">
                    {[summary.neutralCitation, ...summary.reporterCitations, summary.caseNumber]
                      .filter(Boolean)
                      .join("  |  ")}
                  </span>
                  {summary.provenance[0] && (
                    <a
                      href={summary.provenance[0].sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-citation-mono text-[11px] text-secondary hover:underline inline-flex items-center gap-1"
                    >
                      {summary.provenance[0].sourceName}
                      <Icon name="open_in_new" size={11} />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Enactments */}
        <section>
          <PanelHeading icon="menu_book" title="Enactments" className="mb-3" />
          <ul className="cl-card divide-y divide-outline-variant">
            {[...corpus.statutes.values()].map((statute) => (
              <li key={statute.id} className="px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-body-md text-on-surface">{statute.title}</span>
                <a
                  href={statute.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-citation-mono text-[11px] text-secondary hover:underline inline-flex items-center gap-1"
                >
                  India Code
                  <Icon name="open_in_new" size={11} />
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Runtime configuration */}
        <section className="cl-card p-space-lg">
          <PanelHeading icon="settings" title="Runtime configuration" className="mb-4" />
          <dl className="space-y-2.5 text-body-sm">
            <div className="flex flex-wrap items-baseline gap-2">
              <dt className="w-48 font-label-md text-label-md uppercase tracking-wider text-muted">
                Data store
              </dt>
              <dd className="text-on-surface">
                {driverKind() === "postgres"
                  ? "PostgreSQL (DATABASE_URL configured)"
                  : "Seeded in-memory corpus — set DATABASE_URL to run against PostgreSQL"}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <dt className="w-48 font-label-md text-label-md uppercase tracking-wider text-muted">
                Synthesis model
              </dt>
              <dd className="text-on-surface">
                {isModelConfigured()
                  ? `${modelVersion()} — consulted only after deterministic source checks`
                  : "Not configured. Verification is fully deterministic; research returns retrieved passages rather than a synthesis."}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <dt className="w-48 font-label-md text-label-md uppercase tracking-wider text-muted">
                Model boundary
              </dt>
              <dd className="text-on-surface">
                A model never decides whether an authority exists, what a judgment says, or a
                citation&apos;s status. Those come from source lookup.
              </dd>
            </div>
          </dl>
        </section>

        <p className="text-body-sm text-on-surface-variant border-t border-outline-variant pt-4">
          <Icon name="info" size={14} className="inline mr-1 text-secondary" />
          {AI_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
