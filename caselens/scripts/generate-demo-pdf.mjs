/**
 * Generates the curated demo PDF from `server/db/seed/demo-brief.ts`.
 *
 *   node scripts/generate-demo-pdf.mjs
 *
 * Writes `public/demo/written-submissions-personal-guarantor.pdf`.
 *
 * The PDF is assembled by hand rather than with a library: the brief is plain
 * text in a single standard font, so a minimal writer keeps the demo asset
 * free of an extra dependency and makes the byte layout auditable. The output
 * is a normal text-bearing PDF, so pdf.js extracts real text from it — the
 * upload path in the demo is not special-cased.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

/* Read the brief out of the TypeScript source without a build step. */
function loadBriefPages() {
  const source = readFileSync(resolve(root, "server/db/seed/demo-brief.ts"), "utf8");
  const pages = [];
  const pattern = /const PAGE_\d+ = `([\s\S]*?)`;/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    pages.push(match[1].replace(/\\`/g, "`").replace(/\\\$/g, "$"));
  }
  if (pages.length === 0) throw new Error("No PAGE_n template literals found in demo-brief.ts");
  return pages;
}

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 64;
const MARGIN_TOP = 72;
const FONT_SIZE = 10.5;
const LEADING = 15.5;
const MAX_LINES = Math.floor((PAGE_HEIGHT - MARGIN_TOP * 2) / LEADING);

/** Escapes the three characters that are special inside a PDF string. */
function pdfString(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Replaces characters outside WinAnsi with close ASCII equivalents, so the
 * extracted text still matches what the corpus and detector expect.
 */
function toWinAnsi(text) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/§/g, "Section ")
    // Drop anything outside WinAnsi, but keep the line breaks: they carry the
    // paragraph structure the citation detector relies on.
    .replace(/[^\x20-\x7e\n]/g, "");
}

function wrap(line, maxChars) {
  if (line.length <= maxChars) return [line];
  const words = line.split(" ");
  const out = [];
  let current = "";
  for (const word of words) {
    if (current && `${current} ${word}`.length > maxChars) {
      out.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) out.push(current);
  return out;
}

/** Splits the brief into rendered pages of at most MAX_LINES lines. */
function paginate(sourcePages) {
  const maxChars = Math.floor((PAGE_WIDTH - MARGIN_X * 2) / (FONT_SIZE * 0.5));
  const rendered = [];
  for (const source of sourcePages) {
    const lines = [];
    for (const rawLine of toWinAnsi(source).split("\n")) {
      if (rawLine.trim() === "") lines.push("");
      else lines.push(...wrap(rawLine.trim(), maxChars));
    }
    // A source page may overflow one physical page; keep splitting.
    for (let i = 0; i < lines.length; i += MAX_LINES) {
      rendered.push(lines.slice(i, i + MAX_LINES));
    }
  }
  return rendered;
}

function contentStream(lines) {
  const parts = ["BT", `/F1 ${FONT_SIZE} Tf`, `${LEADING} TL`, `1 0 0 1 ${MARGIN_X} ${PAGE_HEIGHT - MARGIN_TOP} Tm`];
  for (const line of lines) {
    parts.push(`(${pdfString(line)}) Tj`, "T*");
  }
  parts.push("ET");
  return parts.join("\n");
}

function buildPdf(pages) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length; // 1-based object number
  };

  // Reserve 1 = Catalog, 2 = Pages; fill them in once page ids are known.
  add("");
  add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");

  const pageIds = [];
  for (const lines of pages) {
    const stream = contentStream(lines);
    const contentId = add(
      `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    );
    const pageId = add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  }

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

const pages = paginate(loadBriefPages());
const outputDir = resolve(root, "public/demo");
mkdirSync(outputDir, { recursive: true });
const outputPath = resolve(outputDir, "written-submissions-personal-guarantor.pdf");
writeFileSync(outputPath, buildPdf(pages));
console.log(`Wrote ${outputPath} (${pages.length} pages)`);
