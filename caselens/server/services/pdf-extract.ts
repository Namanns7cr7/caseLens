import "server-only";

/**
 * PDF text extraction.
 *
 * pdf.js is loaded from its legacy build and only when a PDF actually needs
 * parsing, so the worker machinery never enters the client bundle. Text is
 * reassembled per page with line breaks inferred from item geometry, because
 * the verification engine depends on paragraph blocks being separable.
 */

export interface ExtractedText {
  text: string;
  pageCount: number;
  /** Character offset in `text` at which each page begins. */
  pageOffsets: number[];
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

/** Page separator. Matches the block boundary the citation detector honours. */
const PAGE_SEPARATOR = "\n\f\n";

async function loadPdfJs() {
  // The legacy build runs in Node without DOM APIs.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    // pdf.js still resolves a worker entry point even when it falls back to
    // running in-process, so it has to be pointed at the packaged worker.
    const { createRequire } = await import("node:module");
    const { pathToFileURL } = await import("node:url");
    const require = createRequire(import.meta.url);
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
      require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs"),
    ).href;
  }
  return pdfjs;
}

interface TextLine {
  y: number;
  text: string;
}

/**
 * Groups text items into visual lines by their baseline, inserting a space
 * wherever the horizontal gap between two items on the same line is wide
 * enough to be a word boundary.
 */
function groupIntoLines(items: PdfTextItem[]): TextLine[] {
  const lines: TextLine[] = [];
  let current: TextLine | undefined;
  let previousEndX = 0;
  let previousHeight = 10;

  for (const item of items) {
    if (item.str === "") continue;
    const x = item.transform[4];
    const y = item.transform[5];
    if (typeof x !== "number" || typeof y !== "number") continue;
    const height = item.height && item.height > 0 ? item.height : previousHeight;

    if (!current || Math.abs(current.y - y) > height * 0.5) {
      current = { y, text: item.str };
      lines.push(current);
    } else {
      // pdf.js splits a rendered line into several items; a gap of roughly a
      // space width between them is a real word boundary.
      const needsSpace = x - previousEndX > height * 0.17 && !/\s$/.test(current.text);
      current.text += needsSpace ? ` ${item.str}` : item.str;
    }

    previousHeight = height;
    previousEndX = x + (item.width ?? item.str.length * height * 0.5);
  }

  return lines;
}

/** Median baseline spacing, used to tell a line break from a paragraph break. */
function medianLeading(lines: TextLine[]): number {
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const gap = Math.abs((lines[i]?.y ?? 0) - (lines[i - 1]?.y ?? 0));
    if (gap > 1) gaps.push(gap);
  }
  if (gaps.length === 0) return 14;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)] ?? 14;
}

/**
 * Joins lines into page text. A vertical gap materially wider than the median
 * leading is a paragraph break, and is emitted as a blank line — the citation
 * detector uses those blank lines to scope a quotation to the paragraph that
 * cites it, so getting this boundary right is what keeps a quotation in one
 * paragraph from being attributed to a citation in the next.
 */
function linesToText(lines: TextLine[]): string {
  if (lines.length === 0) return "";
  const leading = medianLeading(lines);
  let out = lines[0]?.text ?? "";
  for (let i = 1; i < lines.length; i += 1) {
    const gap = Math.abs((lines[i]?.y ?? 0) - (lines[i - 1]?.y ?? 0));
    out += gap > leading * 1.45 ? "\n\n" : "\n";
    out += lines[i]?.text ?? "";
  }
  return out;
}

function itemsToText(items: PdfTextItem[]): string {
  return linesToText(groupIntoLines(items));
}

export async function extractPdfText(data: Uint8Array): Promise<ExtractedText> {
  const pdfjs = await loadPdfJs();
  const document = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: false,
  }).promise;

  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(itemsToText(content.items as PdfTextItem[]));
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }

  const pageOffsets: number[] = [];
  let text = "";
  for (const [index, page] of pages.entries()) {
    if (index > 0) text += PAGE_SEPARATOR;
    pageOffsets.push(text.length);
    text += page;
  }

  return { text, pageCount: pages.length, pageOffsets };
}

/** Extraction for plain-text uploads, which take the same downstream path. */
export function extractPlainText(raw: string): ExtractedText {
  const pages = raw.split(/\f/);
  const pageOffsets: number[] = [];
  let text = "";
  for (const [index, page] of pages.entries()) {
    if (index > 0) text += PAGE_SEPARATOR;
    pageOffsets.push(text.length);
    text += page.replace(/\r\n/g, "\n");
  }
  return { text, pageCount: pages.length, pageOffsets };
}

/** Maps a character offset in the extracted text to a 1-based page number. */
export function pageForOffset(pageOffsets: number[], offset: number): number {
  let page = 1;
  for (let i = 0; i < pageOffsets.length; i += 1) {
    const start = pageOffsets[i];
    if (start !== undefined && offset >= start) page = i + 1;
    else break;
  }
  return page;
}
