/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceRequest } from "../types";
import { getAdminDb } from "./firebaseAdmin";
import { sanitizeRequestDocId } from "../services/requestIds";
import { isValidEmail } from "./emailClient";
import { hasSuccessfulDelivery } from "./emailDeliveryLog";
import {
  dispatchBudgetEmail,
  dispatchMaintenanceStartedEmail,
  dispatchRatEmail,
  dispatchTrackingEmail,
  DispatchEmailResult,
  TrackingEmailContext,
} from "./emailDispatchService";

export type { TrackingEmailContext };

const REQUESTS_COLLECTION = "maintenance_requests";

export type DocumentEmailType = "budget" | "rat";

export interface SendDocumentEmailResult {
  success: true;
  sentTo: string;
  sentAt: string;
}

export interface TriggerEmailResult {
  success: true;
  sentTo: string;
  sentAt: string;
  status?: "sent" | "skipped" | "failed";
  skipped?: boolean;
  error?: string;
}

async function loadRequest(requestId: string): Promise<MaintenanceRequest> {
  const docId = sanitizeRequestDocId(requestId);
  const snap = await getAdminDb().collection(REQUESTS_COLLECTION).doc(docId).get();
  if (!snap.exists) {
    throw new Error(`Ordem de serviço "${requestId}" não encontrada.`);
  }
  const data = snap.data() as MaintenanceRequest;
  return { ...data, id: data.id || requestId };
}

function toTriggerResult(result: DispatchEmailResult): TriggerEmailResult {
  return {
    success: true,
    sentTo: result.sentTo,
    sentAt: result.sentAt,
    status: result.status,
    skipped: result.skipped,
    error: result.error,
  };
}

export async function sendMaintenanceStartedEmail(
  request: MaintenanceRequest,
  trigger: "auto_payment" | "auto_kanban" = "auto_payment"
): Promise<DispatchEmailResult> {
  if (hasSuccessfulDelivery(request, "maintenance_started")) {
    return {
      success: true,
      status: "skipped",
      sentTo: request.clientEmail?.trim() || "",
      sentAt: request.maintenanceStartedEmailSentAt || request.paymentConfirmationEmailSentAt || "",
      skipped: true,
    };
  }
  return dispatchMaintenanceStartedEmail(request.id, { trigger, sentBy: "Sistema" });
}

export async function triggerMaintenanceStartedEmail(
  requestId: string,
  trigger: "auto_kanban" | "manual" = "auto_kanban"
): Promise<TriggerEmailResult> {
  const request = await loadRequest(requestId);

  if (request.columnId !== "manutencao") {
    throw new Error("A O.S. precisa estar em manutenção para enviar este e-mail.");
  }
  const canNotify =
    request.budget?.isApproved ||
    request.budget?.isWarranty ||
    request.budgetPayment?.status === "paid";
  if (!canNotify) {
    throw new Error("Orçamento ainda não aprovado para esta O.S.");
  }

  const email = request.clientEmail?.trim();
  if (!email || !isValidEmail(email)) {
    throw new Error("Cliente sem e-mail válido cadastrado nesta O.S.");
  }

  const result = await dispatchMaintenanceStartedEmail(requestId, {
    trigger,
    sentBy: "Sistema",
  });
  return toTriggerResult(result);
}

export async function triggerRatFinalizedEmail(requestId: string): Promise<TriggerEmailResult> {
  const request = await loadRequest(requestId);

  if (!request.rat || request.rat.status !== "Finalizado") {
    throw new Error("A RAT precisa estar finalizada para enviar este e-mail.");
  }

  const email = request.clientEmail?.trim();
  if (!email || !isValidEmail(email)) {
    throw new Error("Cliente sem e-mail válido cadastrado nesta O.S.");
  }

  const result = await dispatchRatEmail(requestId, "Sistema", {
    skipRateLimit: true,
    trigger: "auto_finalize_rat",
  });
  return toTriggerResult(result);
}

export async function triggerTrackingEmail(
  requestId: string,
  sentBy = "Sistema",
  options?: { allowResend?: boolean } & Partial<TrackingEmailContext>
): Promise<TriggerEmailResult> {
  const request =
    options?.requestSnapshot ?? (await loadRequest(requestId));

  const trackingCode =
    options?.trackingCode?.trim() ||
    request.shippingLabel?.trackingCode?.trim();

  if (!trackingCode) {
    throw new Error("Esta O.S. ainda não possui código de rastreio gerado.");
  }

  const email = request.clientEmail?.trim();
  if (!email || !isValidEmail(email)) {
    throw new Error("Cliente sem e-mail válido cadastrado nesta O.S.");
  }

  const result = await dispatchTrackingEmail(requestId, {
    trigger: options?.allowResend ? "manual" : "auto_shipping",
    sentBy,
    allowResend: options?.allowResend,
    trackingCode,
    serviceName: options?.serviceName,
    requestSnapshot: options?.requestSnapshot ?? request,
  });
  return toTriggerResult(result);
}

export async function sendDocumentEmailToClient(
  requestId: string,
  type: DocumentEmailType,
  sentBy: string,
  options?: { skipRateLimit?: boolean }
): Promise<SendDocumentEmailResult> {
  const result =
    type === "budget"
      ? await dispatchBudgetEmail(requestId, sentBy, { skipRateLimit: options?.skipRateLimit })
      : await dispatchRatEmail(requestId, sentBy, {
          skipRateLimit: options?.skipRateLimit,
          trigger: "manual",
        });

  if (result.status === "failed") {
    throw new Error(result.error || "Falha ao enviar e-mail.");
  }

  return { success: true, sentTo: result.sentTo, sentAt: result.sentAt };
}
