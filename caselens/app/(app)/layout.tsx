import { AppShell } from "@/components/layout/app-shell";

/**
 * Rendered per request.
 *
 * The CSP in `middleware.ts` mints a nonce for every response, and a nonce
 * cannot be baked into a page generated at build time. Every page here reads
 * the corpus or session state anyway, so nothing is lost by rendering on
 * demand — and it keeps the policy strict rather than falling back to
 * 'unsafe-inline' for scripts.
 */
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
