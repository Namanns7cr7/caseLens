import { type NextRequest, NextResponse } from "next/server";

import { apiError, handle, LIMITS, rateLimit } from "@/lib/api";
import { ensureSession } from "@/server/auth/session";
import {
  ACCEPTED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  uploadDocument,
} from "@/server/services/document-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return handle(async () => {
    const ownerId = await ensureSession();
    if (!rateLimit(`upload:${ownerId}`, LIMITS.upload.limit, LIMITS.upload.windowMs)) {
      return apiError("RATE_LIMITED", "Too many uploads. Wait a moment and try again.");
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return apiError("VALIDATION_ERROR", "Attach a file under the field name 'file'.");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return apiError(
        "FILE_TOO_LARGE",
        `Files must be ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB or smaller.`,
      );
    }

    // Some browsers send an empty or generic type; fall back to the extension.
    const declared = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain");
    if (!ACCEPTED_MIME_TYPES.includes(declared as (typeof ACCEPTED_MIME_TYPES)[number])) {
      return apiError("UNSUPPORTED_TYPE", "Upload a PDF or a plain-text legal document.");
    }

    const { document, duplicate } = await uploadDocument({
      filename: file.name,
      mimeType: declared,
      data: new Uint8Array(await file.arrayBuffer()),
      ownerId,
    });

    return NextResponse.json(
      { document, duplicate, status: document.extractionStatus },
      { status: duplicate ? 200 : 201 },
    );
  });
}
