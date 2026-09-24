import { EB_Garamond, Inter, JetBrains_Mono } from "next/font/google";

/**
 * The CaseLens type triad (DESIGN.md):
 *  - EB Garamond  → judicial headings + judgment text
 *  - Inter        → application UI + metadata
 *  - JetBrains Mono → citations, statute identifiers, scores
 */
export const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
});

export const fontVariables = `${inter.variable} ${garamond.variable} ${mono.variable}`;
