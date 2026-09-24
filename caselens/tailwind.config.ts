import type { Config } from "tailwindcss";

/**
 * Design tokens transcribed verbatim from reference/stitch/code.html +
 * reference/stitch/DESIGN.md. Do not re-theme: the Stitch system is the
 * visual authority for CaseLens.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./server/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "on-tertiary-container": "#069669",
        "outline-variant": "#c5c6cd",
        "error-container": "#ffdad6",
        "surface-container": "#e9edff",
        surface: "#f9f9ff",
        "on-tertiary": "#ffffff",
        "on-primary": "#ffffff",
        "inverse-on-surface": "#edf0ff",
        secondary: "#1d4ed8",
        "surface-dim": "#d3daef",
        error: "#ba1a1a",
        "on-surface-variant": "#44474c",
        "tertiary-fixed": "#85f8c4",
        background: "#f9f9ff",
        "on-primary-fixed": "#0e1c2f",
        "on-error-container": "#93000a",
        "on-secondary-fixed": "#001551",
        "on-secondary-fixed-variant": "#0039b5",
        "primary-container": "#0e1c2f",
        "primary-fixed-dim": "#bac7e1",
        "tertiary-fixed-dim": "#68dba9",
        "on-surface": "#141b2b",
        "on-error": "#ffffff",
        "on-secondary-container": "#fffbff",
        "on-background": "#141b2b",
        outline: "#75777d",
        "on-tertiary-fixed": "#002114",
        "surface-container-highest": "#dce2f7",
        "surface-container-lowest": "#ffffff",
        "on-primary-container": "#77849c",
        "on-tertiary-fixed-variant": "#005137",
        "secondary-container": "#4069f2",
        "tertiary-container": "#002114",
        "inverse-surface": "#293040",
        "on-primary-fixed-variant": "#3a475c",
        tertiary: "#000000",
        "primary-fixed": "#d6e3fe",
        "surface-container-high": "#e1e8fd",
        "secondary-fixed-dim": "#b7c4ff",
        "surface-tint": "#525f75",
        "inverse-primary": "#bac7e1",
        primary: "#000000",
        "secondary-fixed": "#dce1ff",
        "surface-container-low": "#f1f3ff",
        "surface-bright": "#f9f9ff",
        "on-secondary": "#ffffff",
        "surface-variant": "#dce2f7",
        /* Reading canvas + semantic verification signals (DESIGN.md) */
        canvas: "#FBFBFA",
        /*
         * Muted text.
         *
         * The Stitch `outline` tone (#75777d) reaches only 4.46:1 on the
         * reading canvas, just under the 4.5:1 WCAG AA threshold for normal
         * text — and most of the metadata it was used for is set at 11-12px.
         * This token stays in the same slate family as DESIGN.md's
         * "metadata & citations" colour while clearing AA with margin.
         * `outline` is retained for borders and decorative rules.
         */
        muted: "#5A6473",
        /*
         * Semantic verification signals (DESIGN.md).
         *
         * The base tones are the specified signal colours and are used for
         * dots, rules, borders and icons, where the 3:1 non-text contrast
         * threshold applies. As small text on a light surface they fall
         * around 3:1 and miss the 4.5:1 AA threshold, so each has an "ink"
         * variant — the same hue carried darker — for text.
         */
        verified: "#059669",
        "verified-ink": "#065F46",
        "verified-surface": "#ECFDF5",
        "verified-border": "#A7F3D0",
        review: "#D97706",
        "review-ink": "#92400E",
        "review-surface": "#FFFBEB",
        "review-border": "#FDE68A",
        mismatch: "#DC2626",
        "mismatch-ink": "#991B1B",
        "mismatch-surface": "#FEF2F2",
        "mismatch-border": "#FECACA",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        "space-md": "1rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        gutter: "1.5rem",
        "gutter-sm": "0.75rem",
        "margin-mobile": "1rem",
        margin: "2rem",
        "space-lg": "1.5rem",
        "space-xl": "2.5rem",
      },
      fontFamily: {
        "body-lg": ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        "body-md": ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        "body-sm": ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        "label-md": ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        "headline-lg": ["var(--font-garamond)", "EB Garamond", "Georgia", "serif"],
        "headline-lg-mobile": ["var(--font-garamond)", "EB Garamond", "Georgia", "serif"],
        "headline-md": ["var(--font-garamond)", "EB Garamond", "Georgia", "serif"],
        "display-lg": ["var(--font-garamond)", "EB Garamond", "Georgia", "serif"],
        "display-lg-mobile": ["var(--font-garamond)", "EB Garamond", "Georgia", "serif"],
        "judgment-editorial": ["var(--font-garamond)", "EB Garamond", "Georgia", "serif"],
        "citation-mono": ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
        "statute-code": ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "body-lg": ["16px", { lineHeight: "26px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "22px", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.04em", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.015em", fontWeight: "600" }],
        "headline-lg-mobile": ["26px", { lineHeight: "34px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "500" }],
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "display-lg-mobile": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "judgment-editorial": ["19px", { lineHeight: "32px", letterSpacing: "0.01em", fontWeight: "400" }],
        "citation-mono": ["13px", { lineHeight: "18px", letterSpacing: "-0.01em", fontWeight: "500" }],
        "statute-code": ["11px", { lineHeight: "14px", letterSpacing: "0.05em", fontWeight: "600" }],
      },
      boxShadow: {
        /* Elevation ladder from DESIGN.md */
        xs: "0 1px 2px rgba(11, 25, 44, 0.03)",
        layer1: "0 1px 3px rgba(11, 25, 44, 0.04)",
        layer2:
          "0 8px 24px -4px rgba(11, 25, 44, 0.08), 0 2px 6px -1px rgba(11, 25, 44, 0.03)",
      },
    },
  },
  plugins: [],
};

export default config;
