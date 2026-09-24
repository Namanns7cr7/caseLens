import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { Omnibox } from "@/components/layout/omnibox";
import { StatusPill } from "@/components/ui/primitives";
import { listCases } from "@/server/repositories/case-repository";

export const metadata: Metadata = {
  title: "CaseLens — See the full story behind every case",
};

// Rendered per request so the CSP nonce from middleware.ts applies.
export const dynamic = "force-dynamic";

const LOOP = [
  {
    icon: "search" as const,
    title: "Search",
    detail: "Find an authority by party, citation, judge, statute or issue.",
  },
  {
    icon: "folder_open" as const,
    title: "Open the dossier",
    detail: "Read the holding, the issues framed, and the passages that carry them.",
  },
  {
    icon: "history" as const,
    title: "Trace the chronology",
    detail: "Follow one matter across every forum that dealt with it.",
  },
  {
    icon: "account_tree" as const,
    title: "Map the relationships",
    detail: "See which authorities affirm, distinguish, reverse or follow which.",
  },
  {
    icon: "file_search" as const,
    title: "Verify a document",
    detail: "Check every citation, quotation and proposition against its source.",
  },
  {
    icon: "file_download" as const,
    title: "Export the evidence",
    detail: "Produce a report where every line carries its provenance.",
  },
];

export default function LandingPage() {
  const corpus = listCases();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-space-md lg:px-space-lg py-space-sm border-b border-outline-variant bg-surface-container-lowest">
        <span className="flex items-center gap-2">
          <span className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white">
            <Icon name="gavel" size={18} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-headline-md text-headline-md font-semibold tracking-tight text-on-surface leading-none">
              CaseLens
            </span>
            <span className="font-statute-code text-statute-code text-secondary tracking-widest uppercase mt-0.5">
              Legal Intelligence
            </span>
          </span>
        </span>

        <nav className="flex items-center gap-2">
          <Link href="/sources" className="cl-btn-secondary hidden sm:inline-flex">
            Sources
          </Link>
          <Link href="/home" className="cl-btn-primary">
            Open CaseLens
            <Icon name="arrow_forward" size={16} />
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-space-md lg:px-space-lg py-space-xl bg-canvas border-b border-outline-variant">
          <div className="max-w-[900px] mx-auto text-center">
            <h1 className="font-display-lg text-display-lg-mobile lg:text-display-lg text-primary leading-tight">
              See the full story behind every case
            </h1>
            <p className="font-headline-md text-headline-md text-on-surface-variant mt-3">
              Investigate the law. Trace the evidence.
            </p>
            <p className="text-body-lg text-on-surface-variant mt-4 max-w-2xl mx-auto leading-relaxed">
              Legal research becomes risky when a citation, a paragraph or a proposition is carried
              forward without being checked. CaseLens does not ask you to trust an answer — it lets
              you trace every conclusion back to evidence.
            </p>

            <div className="max-w-2xl mx-auto mt-8">
              <Omnibox autoFocus />
              <p className="font-citation-mono text-[11px] text-muted mt-2">
                {corpus.length} authorities indexed · try &ldquo;personal guarantor moratorium&rdquo;
                or &ldquo;(2021) 9 SCC 321&rdquo;
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <Link href="/verify" className="cl-btn-accent">
                <Icon name="file_search" size={16} />
                Verify a document
              </Link>
              <Link href="/home" className="cl-btn-secondary">
                <Icon name="explore" size={16} />
                Explore the corpus
              </Link>
            </div>
          </div>
        </section>

        {/* The loop */}
        <section className="px-space-md lg:px-space-lg py-space-xl">
          <div className="max-w-[1100px] mx-auto">
            <h2 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-primary text-center leading-tight">
              One investigative loop
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {LOOP.map((step, index) => (
                <div key={step.title} className="cl-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-high text-secondary">
                      <Icon name={step.icon} size={17} />
                    </span>
                    <span className="font-citation-mono text-[11px] text-muted">0{index + 1}</span>
                  </div>
                  <p className="font-headline-md text-body-lg text-on-surface leading-snug">
                    {step.title}
                  </p>
                  <p className="text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Verification statuses */}
        <section className="px-space-md lg:px-space-lg py-space-xl bg-surface-container-lowest border-y border-outline-variant">
          <div className="max-w-[900px] mx-auto text-center">
            <h2 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-primary leading-tight">
              Findings that say exactly what they mean
            </h2>
            <p className="text-body-lg text-on-surface-variant mt-3 max-w-2xl mx-auto leading-relaxed">
              A citation can fail in different ways, and they are not interchangeable. CaseLens
              distinguishes them, and never calls a citation fabricated because a search missed it.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <StatusPill status="VERIFIED" />
              <StatusPill status="METADATA_MISMATCH" />
              <StatusPill status="PARAGRAPH_MISMATCH" />
              <StatusPill status="WEAK_PROPOSITION_SUPPORT" />
              <StatusPill status="NO_AUTHORITATIVE_MATCH" />
              <StatusPill status="NEEDS_REVIEW" />
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="px-space-md lg:px-space-lg py-space-xl">
          <div className="max-w-[760px] mx-auto text-center">
            <p className="font-judgment-editorial text-[22px] leading-[36px] text-on-surface">
              CaseLens does not ask users to trust AI. It lets them trace every conclusion back to
              evidence.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <Link href="/home" className="cl-btn-primary">
                Open CaseLens
                <Icon name="arrow_forward" size={16} />
              </Link>
              <Link href="/sources" className="cl-btn-secondary">
                <Icon name="hub" size={16} />
                See what it is connected to
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant bg-surface-container-lowest px-space-md lg:px-space-lg py-4">
        <p className="max-w-[1100px] mx-auto text-body-sm text-on-surface-variant text-center">
          AI-assisted legal research. Always verify against the linked primary authority before
          relying on a result.
        </p>
      </footer>
    </div>
  );
}
