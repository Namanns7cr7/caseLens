import type { Metadata } from "next";

import { ResearchPanel } from "@/components/research/research-panel";
import { getCorpus } from "@/server/db/seed";
import type { CaseSummary, JudgmentParagraph } from "@/types/domain";

export const metadata: Metadata = { title: "Research" };

export default function ResearchPage() {
  // Passages and authorities are handed to the client up front so a claim's
  // supporting text renders with its provenance without a second round trip.
  const corpus = getCorpus();
  const cases: Record<string, CaseSummary> = {};
  const paragraphs: Record<string, JudgmentParagraph> = {};
  for (const summary of corpus.cases.values()) cases[summary.id] = summary;
  for (const paragraph of corpus.paragraphs.values()) paragraphs[paragraph.id] = paragraph;

  return (
    <div className="bg-canvas min-h-full">
      <div className="max-w-[1000px] mx-auto px-space-md lg:px-space-lg py-space-lg space-y-space-lg">
        <header>
          <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-primary leading-tight">
            Grounded research
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
            Retrieval runs first and is deterministic. Anything written afterwards is tied to the
            passages it rests on — and a claim that cannot be tied to one is shown as unsupported
            rather than presented as an answer.
          </p>
        </header>

        <ResearchPanel cases={cases} paragraphs={paragraphs} />
      </div>
    </div>
  );
}
