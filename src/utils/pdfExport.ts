/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Attachment } from "../types";

export interface PdfExportOptions {
  margin?: number;
  format?: "a4" | "letter";
  attachments?: PdfAttachmentPayload[];
}

export interface PdfAttachmentPayload {
  name: string;
  type: string;
  url?: string;
  storagePath?: string;
}

/** Prepara metadados dos anexos para o servidor (download via Firebase Admin). */
export function prepareAttachmentsForPdf(
  attachments: Attachment[],
  resolveUrl: (att: Attachment) => string | undefined
): PdfAttachmentPayload[] {
  const prepared: PdfAttachmentPayload[] = [];

  for (const att of attachments) {
    const url = resolveUrl(att);
    if (!att.storagePath && !url) continue;

    const item: PdfAttachmentPayload = {
      name: att.name,
      type: att.type,
      storagePath: att.storagePath,
    };

    if (url?.startsWith("data:")) {
      item.url = url;
    } else if (!att.storagePath && url) {
      item.url = url;
    }

    prepared.push(item);
  }

  return prepared;
}

function stripPrintButton(html: string): string {
  return html
    .replace(/<button class="print-btn-float"[^>]*>[\s\S]*?<\/button>/gi, "")
    .replace(/\.print-btn-float\s*\{[^}]*\}/gi, "")
    .replace(/@media print\s*\{[^}]*\.print-btn-float[^}]*\}[^}]*\}/gi, "");
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  if (blob.size === 0) {
    throw new Error("O servidor retornou um PDF vazio.");
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Gera PDF idêntico ao HTML via Chromium no servidor. */
export async function downloadHtmlAsPdf(
  htmlContent: string,
  filename: string,
  options?: PdfExportOptions
): Promise<void> {
  const safeFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const cleanedHtml = stripPrintButton(htmlContent);
  const bodyPayload = {
    html: cleanedHtml,
    filename: safeFilename,
    attachments: options?.attachments ?? [],
  };

  const response = await fetch("/api/export-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    let message = "Falha ao gerar PDF no servidor.";
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(`${message} Use npm run dev para iniciar o servidor com suporte a PDF.`);
  }

  const blob = await response.blob();
  triggerBlobDownload(blob, safeFilename);
}

/** Baixa o mesmo HTML exibido no navegador (para abrir/imprimir manualmente). */
export function downloadHtmlFile(htmlContent: string, filename: string): void {
  const safeFilename = filename.endsWith(".html") ? filename : `${filename}.html`;
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  triggerBlobDownload(blob, safeFilename);
}
