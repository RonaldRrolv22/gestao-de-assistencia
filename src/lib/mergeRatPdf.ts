/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument, PageSizes, rgb, StandardFonts } from "pdf-lib";
import { generatePdfFromHtml } from "./generatePdf";
import { getAdminStorage } from "./firebaseAdmin";

export interface PdfMergeAttachment {
  name: string;
  type: string;
  url?: string;
  storagePath?: string;
}

async function resolveAttachmentBuffer(att: PdfMergeAttachment): Promise<Buffer> {
  if (att.storagePath) {
    const [buffer] = await getAdminStorage().bucket().file(att.storagePath).download();
    return buffer;
  }

  if (!att.url) {
    throw new Error(`Anexo "${att.name}" sem storagePath ou URL.`);
  }

  if (att.url.startsWith("data:")) {
    const comma = att.url.indexOf(",");
    if (comma === -1) throw new Error(`Data URL inválida: ${att.name}`);
    return Buffer.from(att.url.slice(comma + 1), "base64");
  }

  const response = await fetch(att.url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar anexo "${att.name}" (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function isPdfAttachment(type: string, name: string, buffer: Buffer): boolean {
  if (type === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return true;
  return buffer.subarray(0, 5).toString("utf8").startsWith("%PDF");
}

function isImageAttachment(type: string, name: string): boolean {
  if (type.startsWith("image/")) return true;
  const lower = name.toLowerCase();
  return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp");
}

function isTextAttachment(type: string, name: string): boolean {
  if (type.startsWith("text/")) return true;
  return name.toLowerCase().endsWith(".txt");
}

async function imageBufferToPdf(buffer: Buffer, mimeType: string, title: string): Promise<Buffer> {
  const lower = mimeType.toLowerCase();
  const canEmbedDirect = lower.includes("png") || lower.includes("jpeg") || lower.includes("jpg");

  if (!canEmbedDirect) {
    const b64 = buffer.toString("base64");
    const src = `data:${mimeType || "image/png"};base64,${b64}`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#fff;font-family:sans-serif;padding:24px;box-sizing:border-box;}
      h2{font-size:12px;color:#334155;margin:0 0 16px;}
      img{max-width:100%;max-height:85vh;object-fit:contain;}
    </style></head><body><h2>Anexo: ${title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</h2><img src="${src}" alt="anexo" /></body></html>`;
    return generatePdfFromHtml(html);
  }

  const doc = await PDFDocument.create();
  const page = doc.addPage(PageSizes.A4);
  const [pageW, pageH] = PageSizes.A4;
  const margin = 36;

  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawText(`Anexo: ${title}`, {
    x: margin,
    y: pageH - margin - 12,
    size: 10,
    font,
    color: rgb(0.2, 0.25, 0.35),
  });

  const imageAreaH = pageH - margin * 2 - 24;
  const imageAreaW = pageW - margin * 2;

  let image;
  if (lower.includes("png")) {
    image = await doc.embedPng(buffer);
  } else {
    image = await doc.embedJpg(buffer);
  }

  const scale = Math.min(imageAreaW / image.width, imageAreaH / image.height, 1);
  const w = image.width * scale;
  const h = image.height * scale;

  page.drawImage(image, {
    x: margin + (imageAreaW - w) / 2,
    y: margin + (imageAreaH - h) / 2,
    width: w,
    height: h,
  });

  return Buffer.from(await doc.save());
}

async function textBufferToPdf(buffer: Buffer, title: string): Promise<Buffer> {
  const text = buffer.toString("utf-8");
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<style>
  body { font-family: sans-serif; padding: 40px; font-size: 11px; color: #1e293b; }
  h2 { font-size: 13px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; }
  pre { white-space: pre-wrap; word-break: break-word; line-height: 1.5; }
</style></head>
<body><h2>Anexo: ${title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</h2><pre>${escaped}</pre></body></html>`;
  return generatePdfFromHtml(html);
}

async function appendPdfBuffer(merged: PDFDocument, buffer: Buffer): Promise<void> {
  const source = await PDFDocument.load(buffer);
  const pages = await merged.copyPages(source, source.getPageIndices());
  for (const page of pages) {
    merged.addPage(page);
  }
}

/** Gera o PDF da RAT e anexa imagens/PDFs/TXT enviados pelo usuário. */
export async function mergeRatPdfWithAttachments(
  reportHtml: string,
  attachments: PdfMergeAttachment[]
): Promise<Buffer> {
  const mainBuffer = await generatePdfFromHtml(reportHtml);
  const merged = await PDFDocument.load(mainBuffer);

  for (const att of attachments) {
    try {
      const buffer = await resolveAttachmentBuffer(att);

      if (isPdfAttachment(att.type, att.name, buffer)) {
        await appendPdfBuffer(merged, buffer);
      } else if (isImageAttachment(att.type, att.name)) {
        const imagePdf = await imageBufferToPdf(buffer, att.type, att.name);
        await appendPdfBuffer(merged, imagePdf);
      } else if (isTextAttachment(att.type, att.name)) {
        const textPdf = await textBufferToPdf(buffer, att.name);
        await appendPdfBuffer(merged, textPdf);
      } else {
        throw new Error(`Tipo não suportado: ${att.type || att.name}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[mergeRatPdf] Erro ao incluir anexo "${att.name}":`, err);
      throw new Error(`Falha ao incluir anexo "${att.name}" no PDF: ${message}`);
    }
  }

  return Buffer.from(await merged.save());
}
