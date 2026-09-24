import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { PanelHeading, StatusPill } from "@/components/ui/primitives";
import { UploadPanel } from "@/components/verification/upload-panel";

export const metadata: Metadata = { title: "Verify a document" };

const STATUSES = [
  {
    status: "VERIFIED" as const,
    meaning: "The citation resolves to an indexed record, and the metadata, paragraph reference and quoted words all agree with it.",
  },
  {
    status: "METADATA_MISMATCH" as const,
    meaning: "An authority was located, but the title, year, reporter or forum stated in the document does not agree with the record.",
  },
  {
    status: "PARAGRAPH_MISMATCH" as const,
    meaning: "The authority was located, but the quoted passage or paragraph number does not correspond to the indexed text.",
  },
  {
    status: "WEAK_PROPOSITION_SUPPORT" as const,
    meaning: "The citation is correct, but the proposition drawn from it finds little support in the authority's own paragraphs.",
  },
  {
    status: "NO_AUTHORITATIVE_MATCH" as const,
    meaning: "No record in the connected sources carries this citation or a comparable title. This reports the limits of those sources — it is not a finding that the authority does not exist.",
  },
  {
    status: "NEEDS_REVIEW" as const,
    meaning: "The checks did not produce a confident result. A person has to look.",
  },
];

export default function VerifyPage() {
  return (
    <div className="bg-canvas min-h-full">
      <div className="max-w-[1100px] mx-auto px-space-md lg:px-space-lg py-space-lg space-y-space-lg">
        <header>
          <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-primary leading-tight">
            Verify a document
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
            Legal research becomes risky when a citation, a paragraph or a proposition is carried
            forward without being checked against its source. Upload a document and CaseLens will
            check each one.
          </p>
        </header>

        <UploadPanel />

        <section className="cl-card p-space-lg">
          <PanelHeading icon="verified" title="What each finding means" className="mb-4" />
          <dl className="space-y-3">
            {STATUSES.map((entry) => (
              <div key={entry.status} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                <dt className="sm:w-56 shrink-0">
                  <StatusPill status={entry.status} />
                </dt>
                <dd className="text-body-sm text-on-surface-variant leading-relaxed">
                  {entry.meaning}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="cl-card p-space-lg">
          <PanelHeading icon="shield" title="How the checks are ordered" className="mb-4" />
          <ol className="space-y-3">
            {[
              ["Extract and normalize", "Citations are located in the text with their character offsets preserved, so every finding can be traced back to the exact span in the document."],
              ["Resolve by identifier", "Each citation is looked up against the indexed corpus by exact identifier, then by fuzzy case title. Source data decides whether a record exists — no model is consulted at this step."],
              ["Compare metadata", "Title, year, reporter series and forum are compared field by field against the matched record."],
              ["Check the words", "Quoted passages are matched against the indexed judgment text, exact match first and fuzzy match second."],
              ["Assess the proposition", "Only once a record is resolved is the proposition compared against the authority's own paragraphs. This is the one step a model may refine — and only to interpret the retrieved text."],
            ].map(([title, detail], index) => (
              <li key={title} className="flex gap-3">
                <span className="font-citation-mono text-secondary font-semibold shrink-0 w-5">
                  {index + 1}.
                </span>
                <div>
                  <p className="text-body-md font-medium text-on-surface">{title}</p>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 pt-4 border-t border-outline-variant text-body-sm text-on-surface-variant">
            <Icon name="info" size={14} className="inline mr-1 text-secondary" />
            AI-assisted legal research. Always verify against the linked primary authority before
            relying on a result.{" "}
            <Link href="/sources" className="cl-inline-link">
              See what CaseLens is connected to →
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
