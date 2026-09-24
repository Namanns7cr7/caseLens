# CaseLens UI/UX Specification

The authoritative design foundation is `reference/stitch/DESIGN.md`.

## Brand

**CaseLens**

Tagline: **See the full story behind every case.**

Supporting line: **Investigate the law. Trace the evidence.**

## Visual system

Preserve:
- EB Garamond for judicial/editorial content;
- Inter for UI;
- JetBrains Mono for citations/statutes;
- deep sovereign navy structural UI;
- sapphire for active investigation actions;
- emerald/amber/crimson verification semantics;
- warm off-white reading canvas;
- thin architectural borders and restrained shadow.

## Navigation

Desktop sidebar:
Home / Investigate / Cases / Verify / Research / Saved / Reports / Sources / Settings

Mobile bottom nav:
Home / Investigate / Search / Verify / Profile

## Required pages

### `/`
Landing + global search + investigation preview.

### `/home`
Discovery: landmark/recent/saved investigations.

### `/search`
Dense case finder with facets and list/timeline/network toggle.

### `/cases/[id]`
Case dossier: overview, holdings, key paragraphs, statutes, judges, parties, timeline, relationships.

### `/cases/[id]/graph`
Force-directed relationship graph.

### `/investigations/[id]`
Spatial investigation board.

### `/verify`
Upload entry.

### `/documents/[id]/review`
Three-pane PDF/evidence review on desktop; document/issues tabs + bottom sheet on mobile.

### `/reports/[id]`
Investigation/integrity report.

### `/sources`
Source transparency and provenance.

## Flagship interactions

### Case → Case
Use shared-element transition where possible. The clicked graph/card entity should feel continuous into the next dossier.

### Citation → Evidence
Selected citation subtly pulses; related evidence drawer emerges from the appropriate side; unrelated context dims slightly.

### Investigation board
Drag cards with resistance; snap to alignment guides; relationship edges stay attached.

### Mobile bottom sheet
Three snap states: collapsed / half / full.

### Motion
Professional spring physics, not playful bounce. Respect reduced motion.

## Empty states

Never leave blank panels. Every empty state explains the next useful action.
