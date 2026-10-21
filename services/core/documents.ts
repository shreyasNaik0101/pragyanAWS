import { LIMITS, type Passage } from "@pragyan/schema";
import { AppError } from "./service";
export function passages(text: string, page?: number): Passage[] {
  const clean = text.replace(/\u0000/g, "").trim();
  if (!clean) return [];
  const chunks = clean
    .split(/\n\s*\n/)
    .flatMap((p) => p.match(/[\s\S]{1,1800}(?:\s|$)|[\s\S]+$/g) || []);
  return chunks.map((text, i) => ({
    id: `p${page || 1}-${i + 1}`,
    text: text.trim(),
    ...(page ? { page } : {}),
  }));
}
export async function extractPdf(buffer: Buffer): Promise<Passage[]> {
  if (
    buffer.length > LIMITS.uploadBytes ||
    buffer.subarray(0, 5).toString() !== "%PDF-"
  )
    throw new AppError(400, "Upload a PDF up to 5 MB");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  let doc;
  try {
    doc = await getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
    }).promise;
  } catch {
    throw new AppError(
      422,
      "This PDF is encrypted, damaged, or unsupported. Paste its text instead.",
    );
  }
  try {
    if (doc.numPages > 30)
      throw new AppError(422, "PDFs are limited to 30 pages");
    const out: Passage[] = [];
    let length = 0;
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      const text = content.items
        .map((x: any) => ("str" in x ? x.str + (x.hasEOL ? "\n" : " ") : ""))
        .join("");
      length += text.length;
      if (length > LIMITS.input)
        throw new AppError(
          422,
          "PDF text exceeds 16,000 characters. Supply a shorter excerpt.",
        );
      out.push(...passages(text, i));
    }
    if (out.reduce((n, s) => n + s.text.length, 0) < 40)
      throw new AppError(
        422,
        "No readable text found. Scanned PDFs require OCR, which is not enabled.",
      );
    if (out.length > 40)
      throw new AppError(
        422,
        "Too many source passages. Supply a shorter excerpt.",
      );
    return out;
  } finally {
    await doc.destroy();
  }
}
