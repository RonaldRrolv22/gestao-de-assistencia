/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAuthToken } from "./authService";

export type DocumentEmailType = "budget" | "rat";

export interface SendDocumentEmailResult {
  success: boolean;
  sentTo: string;
  sentAt: string;
}

export interface TriggerEmailResult {
  success: boolean;
  sentTo: string;
  sentAt: string;
  status?: "sent" | "skipped" | "failed";
  skipped?: boolean;
  error?: string;
}

async function postEmailApi(path: string, body: Record<string, string>): Promise<TriggerEmailResult> {
  const token = await getAuthToken();
  if (!token) throw new Error("Não autenticado.");

  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const err = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(err.message || "Erro ao enviar e-mail.");
  }

  return err as TriggerEmailResult;
}

export async function sendDocumentEmail(
  requestId: string,
  type: DocumentEmailType
): Promise<SendDocumentEmailResult> {
  const token = await getAuthToken();
  if (!token) throw new Error("Não autenticado.");

  const res = await fetch("/api/email/send-document", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ requestId, type }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Erro ao enviar e-mail.");
  }

  return res.json();
}

export function sendBudgetEmail(requestId: string): Promise<SendDocumentEmailResult> {
  return sendDocumentEmail(requestId, "budget");
}

export function triggerMaintenanceStartedEmail(requestId: string): Promise<TriggerEmailResult> {
  return postEmailApi("/api/email/maintenance-started", { requestId });
}

export function triggerRatFinalizedEmail(requestId: string): Promise<TriggerEmailResult> {
  return postEmailApi("/api/email/rat-finalized", { requestId });
}

export function triggerEquipmentReceivedEmail(requestId: string): Promise<TriggerEmailResult> {
  return postEmailApi("/api/email/equipment-received", { requestId });
}

export function triggerTrackingEmail(requestId: string): Promise<TriggerEmailResult> {
  return postEmailApi("/api/email/tracking", { requestId });
}
