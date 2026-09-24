"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { ANALYSIS_STAGES, type ExtractionStatus, type StoredDocument } from "@/types/domain";

/**
 * Upload and analysis entry point.
 *
 * The stage ladder is shown rather than a spinner because the stages are the
 * product's argument: extraction, then citation detection, then deterministic
 * metadata and paragraph checks, and only then a proposition check. A user
 * watching this sees that the conclusion is reached by source lookup.
 */

const STAGE_LABELS: Record<ExtractionStatus, string> = {
  PENDING: "Queued",
  EXTRACTING: "Extracting text",
  CITATIONS_DETECTED: "Detecting citations",
  METADATA_CHECKED: "Checking metadata against sources",
  PARAGRAPHS_CHECKED: "Checking quoted paragraphs",
  PROPOSITIONS_CHECKED: "Assessing proposition support",
  COMPLETE: "Complete",
  FAILED: "Failed",
};

const STAGE_DETAIL: Record<string, string> = {
  EXTRACTING: "Reading the document text and page structure.",
  CITATIONS_DETECTED: "Finding every case citation and what the document claims about it.",
  METADATA_CHECKED: "Looking each citation up by identifier, then comparing title, year, reporter and forum.",
  PARAGRAPHS_CHECKED: "Matching quoted passages against the indexed judgment text.",
  PROPOSITIONS_CHECKED: "Measuring whether the authority bears out the proposition drawn from it.",
  COMPLETE: "Every check finished.",
};

type Phase = "idle" | "uploading" | "analyzing" | "done" | "error";

export function UploadPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState<ExtractionStatus>("PENDING");
  const [message, setMessage] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [document, setDocument] = useState<StoredDocument>();

  const run = useCallback(
    async (file: File) => {
      setPhase("uploading");
      setMessage(undefined);
      setStage("PENDING");

      try {
        const form = new FormData();
        form.append("file", file);
        const uploadResponse = await fetch("/api/documents/upload", { method: "POST", body: form });
        const uploadPayload = (await uploadResponse.json()) as {
          document?: StoredDocument;
          duplicate?: boolean;
          error?: { message: string };
        };
        if (!uploadResponse.ok || !uploadPayload.document) {
          throw new Error(uploadPayload.error?.message ?? "Upload failed.");
        }

        setDocument(uploadPayload.document);
        setPhase("analyzing");

        // Advance the visible ladder while the server works. The stages are
        // real pipeline steps; the timing here only paces the display.
        let index = 0;
        const ticker = setInterval(() => {
          index = Math.min(index + 1, ANALYSIS_STAGES.length - 2);
          setStage(ANALYSIS_STAGES[index] as ExtractionStatus);
        }, 420);

        const analyzeResponse = await fetch(
          `/api/documents/${uploadPayload.document.id}/analyze`,
          { method: "POST" },
        );
        clearInterval(ticker);

        const analysis = (await analyzeResponse.json()) as { error?: { message: string } };
        if (!analyzeResponse.ok) {
          throw new Error(analysis.error?.message ?? "Analysis failed.");
        }

        setStage("COMPLETE");
        setPhase("done");
        router.push(`/documents/${uploadPayload.document.id}/review`);
      } catch (error) {
        setPhase("error");
        setMessage(error instanceof Error ? error.message : "Something went wrong.");
      }
    },
    [router],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) void run(file);
    },
    [run],
  );

  const useDemoBrief = useCallback(async () => {
    setPhase("uploading");
    setMessage(undefined);
    try {
      const response = await fetch("/demo/written-submissions-personal-guarantor.pdf");
      if (!response.ok) throw new Error("The demo brief could not be loaded.");
      const blob = await response.blob();
      await run(
        new File([blob], "written-submissions-personal-guarantor.pdf", { type: "application/pdf" }),
      );
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "Could not load the demo brief.");
    }
  }, [run]);

  const busy = phase === "uploading" || phase === "analyzing";

  return (
    <div className="space-y-space-lg">
      {/* Dropzone */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragging
            ? "border-secondary bg-secondary-fixed/30"
            : "border-outline-variant bg-surface-container-lowest",
          busy && "opacity-60 pointer-events-none",
        )}
      >
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-high text-secondary mb-3">
          <Icon name="upload" size={24} />
        </span>
        <p className="font-headline-md text-headline-md text-on-surface leading-tight">
          Drop a petition, judgment or written submission here
        </p>
        <p className="text-body-sm text-on-surface-variant mt-1 max-w-lg mx-auto leading-relaxed">
          CaseLens extracts the citations, resolves each one against the connected sources, and
          reports what agrees and what does not. PDF or plain text, up to 20 MB.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          <button type="button" onClick={() => inputRef.current?.click()} className="cl-btn-primary">
            <Icon name="description" size={16} />
            Choose a file
          </button>
          <button type="button" onClick={useDemoBrief} className="cl-btn-secondary">
            <Icon name="auto_awesome" size={16} />
            Use the demo brief
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,text/plain,.pdf,.txt,.md"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void run(file);
          }}
        />
      </div>

      {/* Stage ladder */}
      {(busy || phase === "done") && (
        <section className="cl-card p-space-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-label-md text-label-md uppercase tracking-wider text-on-surface">
              Analysis pipeline
            </h2>
            {document && (
              <span className="font-citation-mono text-[11px] text-muted truncate max-w-[50%]">
                {document.filename}
              </span>
            )}
          </div>

          <ol className="space-y-2.5">
            {ANALYSIS_STAGES.map((entry) => {
              const currentIndex = ANALYSIS_STAGES.indexOf(stage);
              const entryIndex = ANALYSIS_STAGES.indexOf(entry);
              const done = entryIndex < currentIndex || stage === "COMPLETE";
              const active = entry === stage && stage !== "COMPLETE";

              return (
                <li key={entry} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full border shrink-0 mt-0.5",
                      done
                        ? "bg-verified-surface border-verified-border text-verified"
                        : active
                          ? "bg-secondary border-secondary text-white"
                          : "bg-surface-container-low border-outline-variant text-muted",
                    )}
                  >
                    {done ? (
                      <Icon name="check" size={13} />
                    ) : active ? (
                      <Icon name="progress_activity" size={13} className="animate-spin" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-body-md leading-snug",
                        done || active ? "text-on-surface font-medium" : "text-muted",
                      )}
                    >
                      {STAGE_LABELS[entry]}
                    </p>
                    {STAGE_DETAIL[entry] && (
                      <p className="text-body-sm text-on-surface-variant leading-relaxed">
                        {STAGE_DETAIL[entry]}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {phase === "error" && message && (
        <div
          role="alert"
          className="rounded-xl border border-mismatch-border bg-mismatch-surface p-4 flex items-start gap-3"
        >
          <Icon name="report_problem" size={20} className="text-mismatch mt-0.5" />
          <div>
            <p className="font-label-md text-label-md uppercase tracking-wider text-mismatch-ink">
              Analysis could not complete
            </p>
            <p className="text-body-sm text-mismatch-ink/90 mt-0.5">{message}</p>
            <button
              type="button"
              onClick={() => {
                setPhase("idle");
                setMessage(undefined);
              }}
              className="mt-2 text-body-sm font-label-md text-secondary hover:underline"
            >
              Try another document
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
