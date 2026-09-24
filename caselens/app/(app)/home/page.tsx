import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import {
  CitationStamp,
  DoctrinalPill,
  EmptyState,
  PanelHeading,
} from "@/components/ui/primitives";
import { InvestigationList } from "@/components/investigation/investigation-list";
import { citationCount, listCases, listProvisions } from "@/server/repositories/case-repository";

export const metadata: Metadata = { title: "Home" };

const STARTING_POINTS = [
  {
    href: "/search?q=personal+guarantor+moratorium",
    title: "Does the § 14 moratorium shield a personal guarantor?",
    detail: "Three forums, four authorities, one reversal. The line that runs from NCLT Chennai to the Supreme Court.",
    icon: "account_balance" as const,
  },
  {
    href: "/search?q=section+128+co-extensive+surety",
    title: "Co-extensive liability under § 128 of the Contract Act",
    detail: "How the surety's independent contract survives the corporate resolution process.",
    icon: "menu_book" as const,
  },
  {
    href: "/search?q=clean+slate+resolution+plan",
    title: "The clean slate principle after an approved plan",
    detail: "What an approved resolution plan extinguishes — and what it does not.",
    icon: "layers" as const,
  },
];

export default function HomePage() {
  const cases = listCases();
  const provisions = listProvisions();
  const landmarks = cases
    .filter((summary) => summary.doctrinalStatus === "BINDING_LANDMARK")
    .sort((a, b) => citationCount(b.id) - citationCount(a.id));

  return (
    <div className="bg-canvas min-h-full">
      <div className="max-w-[1200px] mx-auto px-space-md lg:px-space-lg py-space-lg space-y-space-xl">
        {/* Masthead */}
        <header>
          <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-primary leading-tight">
            See the full story behind every case
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
            Investigate the law. Trace the evidence. Search the indexed corpus, follow a matter
            across forums, map how authorities relate, and check a document&apos;s citations against
            their sources.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Link href="/search" className="cl-btn-primary">
              <Icon name="search" size={16} />
              Search authorities
            </Link>
            <Link href="/verify" className="cl-btn-accent">
              <Icon name="file_search" size={16} />
              Verify a document
            </Link>
          </div>
        </header>

        {/* Investigation starting points */}
        <section>
          <PanelHeading icon="explore" title="Start an investigation" className="mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STARTING_POINTS.map((point) => (
              <Link
                key={point.href}
                href={point.href}
                className="cl-card p-4 hover:border-secondary transition-colors group"
              >
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-surface-container-high text-secondary mb-2.5">
                  <Icon name={point.icon} size={18} />
                </span>
                <p className="font-headline-md text-body-lg text-on-surface leading-snug group-hover:text-secondary transition-colors">
                  {point.title}
                </p>
                <p className="text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                  {point.detail}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Your investigations */}
        <section>
          <PanelHeading
            icon="account_tree"
            title="Your investigations"
            trailing={
              <Link href="/investigations" className="text-[12px] font-label-md text-secondary hover:underline">
                View all →
              </Link>
            }
            className="mb-4"
          />
          <InvestigationList limit={3} />
        </section>

        {/* Landmark authorities */}
        <section>
          <PanelHeading
            icon="anchor"
            title="Landmark authorities in the corpus"
            trailing={
              <span className="font-citation-mono text-[11px] text-muted">
                {cases.length} indexed
              </span>
            }
            className="mb-4"
          />
          {landmarks.length === 0 ? (
            <EmptyState
              icon="gavel"
              title="No authority is indexed yet"
              description="Load the seed corpus to populate the index."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {landmarks.slice(0, 4).map((summary) => (
                <Link
                  key={summary.id}
                  href={`/cases/${summary.id}`}
                  className="cl-card p-4 hover:border-secondary transition-colors group"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <DoctrinalPill status={summary.doctrinalStatus} />
                    <span className="font-statute-code text-statute-code uppercase text-muted">
                      {summary.courtShortName}
                      {summary.benchStrength ? ` · ${summary.benchStrength}-judge` : ""}
                    </span>
                  </div>
                  <p className="font-headline-md text-headline-md text-primary leading-tight group-hover:text-secondary transition-colors">
                    {summary.title}
                  </p>
                  <p className="mt-1.5">
                    <CitationStamp
                      value={[summary.neutralCitation, ...summary.reporterCitations]
                        .filter(Boolean)
                        .join("  |  ")}
                    />
                  </p>
                  {summary.summary && (
                    <p className="text-body-sm text-on-surface-variant mt-2 leading-relaxed line-clamp-3">
                      {summary.summary}
                    </p>
                  )}
                  <p className="font-citation-mono text-[11px] text-muted mt-2">
                    {citationCount(summary.id).toLocaleString("en-IN")} subsequent citations recorded
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Statutory provisions */}
        <section>
          <PanelHeading icon="menu_book" title="Provisions in the index" className="mb-4" />
          <div className="cl-card divide-y divide-outline-variant">
            {provisions.map((provision) => (
              <div key={provision.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5">
                <span className="font-statute-code text-statute-code text-secondary font-bold w-28 shrink-0">
                  {provision.label}
                </span>
                <span className="text-body-sm font-medium text-on-surface">{provision.heading}</span>
                <a
                  href={provision.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ml-auto font-citation-mono text-[11px] text-secondary hover:underline inline-flex items-center gap-1"
                >
                  India Code
                  <Icon name="open_in_new" size={11} />
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
