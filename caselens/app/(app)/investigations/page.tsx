import type { Metadata } from "next";

import { PanelHeading } from "@/components/ui/primitives";
import { InvestigationList } from "@/components/investigation/investigation-list";

export const metadata: Metadata = { title: "Investigations" };

export default function InvestigationsPage() {
  return (
    <div className="bg-canvas min-h-full">
      <div className="max-w-[1200px] mx-auto px-space-md lg:px-space-lg py-space-lg space-y-space-lg">
        <header>
          <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-primary leading-tight">
            Investigations
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
            A board holds the authorities, provisions, evidence and notes behind one line of
            enquiry. Everything you pin keeps the provenance it arrived with, and the report you
            export carries it through.
          </p>
        </header>

        <section>
          <PanelHeading icon="account_tree" title="Your boards" className="mb-4" />
          <InvestigationList />
        </section>
      </div>
    </div>
  );
}
