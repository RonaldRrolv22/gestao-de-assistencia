/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAuthToken } from "./authService";
import { ShippingLabel } from "../types";

export interface ShippingEmailResult {
  success: boolean;
  sentTo: string;
  sentAt: string;
  status?: "sent" | "skipped" | "failed";
  skipped?: boolean;
  error?: string;
}

export interface GenerateShippingLabelResult {
  success: boolean;
  trackingCode: string;
  idPrePostagem: string;
  serviceName: string;
  shippingLabel: ShippingLabel;
  zplContent: string;
  fileName: string;
  emailResult?: ShippingEmailResult | null;
}

function downloadZplFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".zpl") ? fileName : `${fileName}.zpl`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function generateShippingLabel(
  requestId: string
): Promise<GenerateShippingLabelResult> {
  const token = await getAuthToken();
  if (!token) throw new Error("Não autenticado.");

  const res = await fetch("/api/shipping/generate-labels", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ requestId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detailMsgs = data.details?.msgs
      ? (Array.isArray(data.details.msgs) ? data.details.msgs.join("; ") : String(data.details.msgs))
      : "";
    throw new Error(detailMsgs || data.message || "Erro ao gerar etiqueta de envio.");
  }

  const result = data as GenerateShippingLabelResult;
  if (result.zplContent) {
    downloadZplFile(result.zplContent, result.fileName || `etiqueta_${requestId}.zpl`);
  }

  return result;
}
