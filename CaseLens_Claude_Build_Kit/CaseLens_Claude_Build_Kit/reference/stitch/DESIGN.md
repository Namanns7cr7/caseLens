---
name: Judicial Authority & Investigative Precision
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#44474c'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#525f75'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#0e1c2f'
  on-primary-container: '#77849c'
  inverse-primary: '#bac7e1'
  secondary: '#1d4ed8'
  on-secondary: '#ffffff'
  secondary-container: '#4069f2'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002114'
  on-tertiary-container: '#069669'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3fe'
  primary-fixed-dim: '#bac7e1'
  on-primary-fixed: '#0e1c2f'
  on-primary-fixed-variant: '#3a475c'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b7c4ff'
  on-secondary-fixed: '#001551'
  on-secondary-fixed-variant: '#0039b5'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display-lg:
    fontFamily: EB Garamond
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: EB Garamond
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: EB Garamond
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: EB Garamond
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: EB Garamond
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  judgment-editorial:
    fontFamily: EB Garamond
    fontSize: 19px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  citation-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
  statute-code:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system establishes an environment of unwavering authority, scholarly gravitas, and analytical rigor tailored for senior advocates, judicial researchers, and enterprise legal counsel navigating Indian case law. It replaces the cluttered, antiquated legal databases with a calm, high-density investigative workspace. 

The aesthetic is Modern Editorial meets Precision Tooling:
- **Tone:** Authoritative, scholarly, evidence-backed, lucid, and restrained.
- **Visual Stance:** Scholarly restraint over decorative flourish. Generous breathing room balances extreme tabular density, framing complex legal texts and statute networks with clarity.
- **Physicality:** Crisp architectural boundaries, hairline borders, matte surfaces, and subdued interactive feedback that respects the high-stakes concentration required for constitutional and appellate research.

## Colors
The palette balances institutional gravitas with surgical data visualization.

- **Primary Brand (`#0B192C`, `#0F2537`):** Deep Sovereign Navy establishes hierarchy, header structures, primary actions, and firm structural containment.
- **Interactive Sapphire (`#1D4ED8`, `#2563EB`):** High-clarity optical blue reserved strictly for interactive text anchors, active multi-select filters, focused states, and structural relationship nodes.
- **Surfaces & Canvases:**
  - Base canvas: `#FBFBFA` (warm archival off-white to eliminate glare during prolonged briefing).
  - Elevated work tiles & editor panels: `#FFFFFF` (crisp white).
  - Muted container backing: `#F1F5F9`.
- **Text & Editorial Hierarchy:**
  - Primary text: `#111827` (deep charcoal-black, high contrast for statutory reading).
  - Secondary/Supporting: `#475569` (slate).
  - Metadata & citations: `#64748B` (muted slate).
- **Subtle Partitioning:** Hairline borders use `#E2E8F0` and `#CBD5E1`.
- **Semantic Verification Signals:**
  - **Affirmed / Verified Authority:** `#059669` (surface fill: `#ECFDF5`, border: `#A7F3D0`).
  - **Needs Review / Per Incuriam Risk:** `#D97706` (surface fill: `#FFFBEB`, border: `#FDE68A`).
  - **Overruled / Citation Mismatch:** `#DC2626` (surface fill: `#FEF2F2`, border: `#FECACA`).

## Typography
Typography reflects the triad of legal analysis: editorial tradition, functional navigation, and computational certainty.

- **Judicial Headings & Judgment Texts (`EB Garamond`):** Employs classical transitional serifs to render authoritative headnotes, ratio decidendi, and Supreme Court/High Court passages. The line height is deliberately set to 32px on 19px body sizes to facilitate deep scanning and paragraph-by-paragraph scrutiny.
- **Application Interface & Metadata (`Inter`):** Neutral, robust, and legible across compact multi-pane layouts, filter trees, and interactive dossiers.
- **Legal Citations & Act Identifiers (`JetBrains Mono`):** Applied to neutral citation standards (e.g., `2023 INSC 452`), benchmark scores, bench composition counts, and statutory provisions (e.g., `§ 482 CrPC`) to guarantee tabular alignment and distinct visual tagging.

## Layout & Spacing
The layout implements a structural split-pane and multi-column architecture tailored to investigative workflows.

- **Grid System:** A 12-column flexible grid system anchored by a pinned 280px left rail (filter taxonomies, bench compositions, court hierarchies), a 450px central search/dossier feed, and a generous resizable right canvas (ratio comparison, graph visualizer, and full judgment viewer).
- **Responsive Adaptations:**
  - **Desktop (1440px+):** Tri-panel synchronized investigative layout with simultaneous reading and citation verification panels.
  - **Tablet (768px - 1024px):** Dual-pane view with collapsible left rail as an overlay drawer.
  - **Mobile (< 768px):** Linear stacked view prioritizing quick citation lookup, verified status pills, and judgment executive summaries.
- **Rhythm:** Spacing follows an 8pt base grid with 4pt baseline snap points for monospaced citation stamps. Inner container padding strictly maintains `space-lg` (24px) for analytical focus.

## Elevation & Depth
Elevation favors crisp tonal differentiation and razor-thin borders over diffuse dropshadows, ensuring an uncluttered, authoritative surface.

- **Layer 0 (Canvas Base):** Flat `#FBFBFA` tone.
- **Layer 1 (Investigation Cards & Workspaces):** Pure `#FFFFFF` surface bordered by a 1px solid hairline (`#E2E8F0`). Shadow: `0 1px 3px rgba(11, 25, 44, 0.04)`.
- **Layer 2 (Contextual Popovers & Citation Inspector):** Pure `#FFFFFF` with dual-tier outline: 1px border (`#CBD5E1`) and directional ambient shadow: `0 8px 24px -4px rgba(11, 25, 44, 0.08), 0 2px 6px -1px rgba(11, 25, 44, 0.03)`.
- **Layer 3 (Modals & Graph Nodes Focused):** 1px border (`#94A3B8`) accompanied by a crisp floating scrim `rgba(15, 37, 55, 0.45)` with 4px backdrop blur.

## Shapes
Shapes evoke polished architectural precision rather than toy-like roundness.

- **Standard Containers & Dossier Cards:** Curated at 8px (`space-sm` * 2) to 12px for standard panels, retaining structure.
- **Inner Interactive Controls (Input Fields, Search Bars):** 8px corner radius.
- **Citations & Status Badges:** 6px radius for structural stability; pill-shaped treatments are avoided to maintain formal court record aesthetic.
- **Graph Nodes:** Octagonal and rounded-square geometries to distinguish precedent courts (Supreme Court, High Courts, Tribunals).

## Components

- **Buttons:**
  - *Primary:* Sovereign Navy background (`#0B192C`), crisp white text, 8px corner radius, hairline inset shadow, transitioning to `#0F2537` on hover.
  - *Secondary:* Hairline slate border (`#CBD5E1`), background `#FFFFFF`, text `#111827`, subtle hover tint (`#F8FAFC`).
  - *Accent Action:* Sapphire blue (`#1D4ED8`), white text, reserved for "Extract Precedent", "Generate Brief", and analytical triggers.
- **Citations & Verification Chips:**
  - Compact container displaying monospaced Act or Case ID (`JetBrains Mono`).
  - Accompanied by a 6px status indicator: Emerald (`#059669`) for authoritative/valid law; Amber (`#D97706`) for distinguished/questioned; Crimson (`#DC2626`) for expressly overruled.
- **Judgment Reader & Holding Cards:**
  - Dual-column or wide single-column cards with an off-axis vertical marker: 3px solid Sapphire Blue anchor highlighting the key *ratio decidendi*.
  - Paragraph numbers rendered in monospaced muted slate (`#64748B`) in the left margin gutter.
- **Input Fields & Global Case Finder:**
  - High-affordance search bar with dual keyboard shortcut indicators (`⌘K`).
  - White background, 1px border (`#CBD5E1`), transitioning to a 2px sapphire focus ring with zero vertical displacement.
- **Investigation Graph Inspector (Relationship Visualizer):**
  - Edge connectors with semantic color encoding: Blue for citing, Green for upholding, Red for overruling.
  - Node tooltips rendered in crisp `#0B192C` with stark white monospaced authority scores.
- **Tabular Precedent Lists:**
  - Alternating rows using `#FFFFFF` and `#F8FAFC`.
  - Borderless horizontal dividers (`#E2E8F0`), maintaining 44px compact row heights for dense, multi-jurisdiction scanning.