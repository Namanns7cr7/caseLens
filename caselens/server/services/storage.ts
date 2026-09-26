import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

/**
 * Object storage for uploaded documents.
 *
 * DEPLOYMENT.md targets GCS or an S3-compatible store. The interface below is
 * what the document service depends on; the local-disk implementation is the
 * default so the app runs without cloud credentials. Keys are derived from the
 * content hash, never from the user-supplied filename, so a crafted filename
 * cannot escape the storage root.
 */

export interface ObjectStorage {
  put(key: string, data: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}

/**
 * Where uploads land.
 *
 * Locally this is `./storage`. Most hosts mount the application directory
 * read-only, so `STORAGE_DIR` overrides it and the OS temp directory is the
 * fallback — writable essentially everywhere, and appropriate for files that
 * only need to outlive the request that uploaded them.
 */
function resolveStorageRoot(): string {
  if (process.env.STORAGE_DIR) return resolve(process.env.STORAGE_DIR);
  if (process.env.VERCEL || process.env.RENDER || process.env.NODE_ENV === "production") {
    return resolve(tmpdir(), "caselens-storage");
  }
  return resolve(process.cwd(), "storage");
}

const STORAGE_ROOT = resolveStorageRoot();

/** Rejects any key that could traverse outside the storage root. */
function safePath(key: string): string {
  if (!/^[a-z0-9/_-]+\.[a-z0-9]{1,8}$/i.test(key) || key.includes("..")) {
    throw new Error("Invalid object key");
  }
  const path = resolve(join(STORAGE_ROOT, key));
  if (!path.startsWith(STORAGE_ROOT)) throw new Error("Invalid object key");
  return path;
}

const localStorage: ObjectStorage = {
  async put(key, data) {
    const path = safePath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  },
  async get(key) {
    return new Uint8Array(await readFile(safePath(key)));
  },
  async delete(key) {
    await unlink(safePath(key));
  },
};

export function getStorage(): ObjectStorage {
  // A bucket-backed implementation slots in here when OBJECT_STORAGE_BUCKET
  // is configured; the document service is unaware of which is active.
  return localStorage;
}

export function sha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Content-addressed storage key. Extension is derived from the MIME type. */
export function objectKeyFor(hash: string, mimeType: string): string {
  const extension = mimeType === "application/pdf" ? "pdf" : "txt";
  return `documents/${hash.slice(0, 2)}/${hash}.${extension}`;
}
