import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/primitives";
import { GraphCanvas } from "@/components/graph/graph-canvas";
import { getCase } from "@/server/repositories/case-repository";
import { buildGraph } from "@/server/services/graph-service";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ depth?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const summary = getCase(id);
  return { title: summary ? `Graph — ${summary.title}` : "Graph" };
}

export default async function CaseGraphPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { depth: depthParam } = await searchParams;
  const summary = getCase(id);
  if (!summary) notFound();

  const depth = Math.min(3, Math.max(1, Number(depthParam ?? 2) || 2));
  const payload = buildGraph({ caseId: id, depth, includeProvisions: true });

  return (
    <div className="flex flex-col h-full min-h-0 bg-canvas">
      <header className="bg-surface-container-lowest border-b border-outline-variant px-space-md lg:px-space-lg py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/cases/${id}`}
              className="inline-flex items-center gap-1.5 text-body-sm font-label-md text-secondary hover:underline"
            >
              <Icon name="arrow_back" size={14} />
              Back to dossier
            </Link>
            <h1 className="font-headline-md text-headline-md text-on-surface leading-tight truncate mt-0.5">
              {summary.title}
            </h1>
            <p className="font-citation-mono text-[12px] text-muted">
              {payload.nodes.length} nodes · {payload.edges.length} evidenced edges · depth {depth}
            </p>
          </div>

          <nav className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-0.5">
            {[1, 2, 3].map((value) => (
              <Link
                key={value}
                href={`/cases/${id}/graph?depth=${value}`}
                aria-current={value === depth ? "page" : undefined}
                className={
                  value === depth
                    ? "px-2.5 py-1 rounded bg-secondary text-white font-statute-code text-statute-code"
                    : "px-2.5 py-1 rounded text-on-surface-variant hover:bg-surface-container-low font-statute-code text-statute-code"
                }
              >
                DEPTH {value}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {payload.edges.length === 0 ? (
        <div className="p-space-lg">
          <EmptyState
            icon="account_tree"
            title="No evidenced relationship connects this authority"
            description="CaseLens only draws an edge where a source record evidences it. Nothing in the connected sources links this record to another indexed authority."
            action={
              <Link href={`/cases/${id}`} className="cl-btn-secondary">
                <Icon name="folder_open" size={16} />
                Return to the dossier
              </Link>
            }
          />
        </div>
      ) : (
        <GraphCanvas payload={payload} />
      )}
    </div>
  );
}
