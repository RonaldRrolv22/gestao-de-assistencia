/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KanbanColumnId } from "../types";

/** Converts display ID "RAT - 260528-01" to Firestore doc ID "rat-260528-01". */
export function sanitizeRequestDocId(displayId: string): string {
  return displayId.replace(/^(RAT|OS)\s*-\s*/i, "rat-").replace(/\s+/g, "").toLowerCase();
}

/** Solicitação e Orçamento usam "OS"; Manutenção e Liberado usam "RAT". */
export function usesRatDenomination(columnId: KanbanColumnId): boolean {
  return columnId === "manutencao" || columnId === "liberado";
}

/** Exibe o código conforme a etapa do kanban (OS ou RAT + sufixo numérico). */
export function formatRequestDisplayId(id: string, columnId: KanbanColumnId): string {
  const suffix = id.replace(/^(RAT|OS)\s*-\s*/i, "").trim();
  const prefix = usesRatDenomination(columnId) ? "RAT" : "OS";
  return suffix ? `${prefix} ${suffix}` : id;
}

export function buildRequestDisplayId(openingDate: string, daySequence: number): string {
  const parts = openingDate.split("-");
  const year = parts[0] || "2026";
  const month = parts[1] || "01";
  const day = parts[2] || "01";
  const yy = year.substring(2);
  const xx = daySequence.toString().padStart(2, "0");
  return `RAT - ${yy}${month}${day}-${xx}`;
}

export function formatRequestNumber(seq: number): string {
  return `#${seq.toString().padStart(4, "0")}`;
}

/** Resolves attachment/payment file URL (Storage or legacy base64). */
export function resolveFileUrl(
  item: { downloadUrl?: string; dataUrl?: string; fileData?: string }
): string | undefined {
  return item.downloadUrl || item.dataUrl || item.fileData;
}
