import "server-only";

import { cookies } from "next/headers";

/**
 * Session identity.
 *
 * The hackathon build has no account system, so ownership is anchored to a
 * server-set opaque cookie. It is enough to enforce the authorization checks
 * in the investigation service — one visitor cannot read or mutate another's
 * board — without pretending to be authentication. A real deployment
 * replaces `currentOwnerId` with the authenticated subject and nothing else
 * changes, because every service takes `ownerId` as an argument.
 */

const COOKIE_NAME = "caselens_session";
export const DEMO_OWNER_ID = "demo-user";

export async function currentOwnerId(): Promise<string> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? DEMO_OWNER_ID;
}

/**
 * Issues a session cookie if one is not already present. Called from route
 * handlers and server actions, which are the only places Next.js permits a
 * cookie write.
 */
export async function ensureSession(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const id = `user-${crypto.randomUUID().slice(0, 12)}`;
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}
