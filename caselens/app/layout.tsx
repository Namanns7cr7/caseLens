import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CaseLens — See the full story behind every case",
    template: "%s · CaseLens",
  },
  description:
    "Investigative legal intelligence for Indian case law. Search authorities, trace procedural history, map precedent relationships, and verify citations against evidence.",
  applicationName: "CaseLens",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e1c2f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-screen bg-background text-on-surface">{children}</body>
    </html>
  );
}
