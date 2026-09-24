import { type NextRequest, NextResponse } from "next/server";

/**
 * Content Security Policy (SECURITY_PRIVACY.md).
 *
 * A fresh nonce is minted per request and handed to Next through the
 * `x-nonce` header, which it applies to the inline bootstrap scripts it
 * emits. `strict-dynamic` then lets those trusted scripts load the app
 * chunks without the policy having to enumerate them.
 *
 * `style-src-attr 'unsafe-inline'` is deliberate and narrow: the graph and
 * the investigation board position nodes with inline `style` attributes,
 * which is the only inline styling the app relies on. It does not permit
 * inline `<style>` elements or any script.
 */

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";

  const csp = [
    "default-src 'self'",
    // Dev needs eval for React Refresh; production does not.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-inline'" : ""}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and the demo file, which carry no
     * markup and so need no policy.
     */
    {
      source: "/((?!_next/static|_next/image|favicon.ico|demo/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
