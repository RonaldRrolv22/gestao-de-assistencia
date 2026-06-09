/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EmailDeliveryRecord,
  EmailDeliveryTrigger,
  EmailDeliveryType,
  MaintenanceRequest,
} from "../types";
import { getAdminDb } from "./firebaseAdmin";
import { sanitizeRequestDocId } from "../services/requestIds";
import { sendEmail, isValidEmail, getActiveEmailProvider } from "./emailClient";
import {
  appendEmailDelivery,
  createDeliveryId,
  hasSuccessfulDelivery,
} from "./emailDeliveryLog";
import {
  buildBudgetEmailHtml,
  buildRatEmailHtml,
  buildBudgetEmailText,
  buildRatEmailText,
  buildBudgetEmailSubject,
  buildRatEmailSubject,
  buildMaintenanceStartedEmailHtml,
  buildMaintenanceStartedEmailText,
  buildMaintenanceStartedEmailSubject,
  buildTrackingEmailHtml,
  buildTrackingEmailText,
  buildTrackingEmailSubject,
} from "./emailTemplates";
import {
  generateBudgetPdfBuffer,
  generateRatPdfBuffer,
  ensureCardPaymentLinkForRequest,
} from "./emailPdfService";

const REQUESTS_COLLECTION = "maintenance_requests";

const recentSends = new Map<string, number>();
const RATE_LIMIT_MS = 60_000;

export interface DispatchEmailResult {
  success: true;
  status: "sent" | "skipped" | "failed";
  sentTo: string;
  sentAt: string;
  skipped?: boolean;
  error?: string;
}

export interface DispatchEmailOptions {
  sentBy?: string;
  trigger: EmailDeliveryTrigger;
  skipRateLimit?: boolean;
  allowResend?: boolean;
  requestSnapshot?: MaintenanceRequest;
}

export interface TrackingEmailContext {
  trackingCode: string;
  serviceName?: string;
  requestSnapshot?: MaintenanceRequest;
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

function checkRateLimit(requestId: string, type: EmailDeliveryType): void {
  const key = `${requestId}:${type}`;
  const last = recentSends.get(key);
  const now = Date.now();
  if (last && now - last < RATE_LIMIT_MS) {
    const waitSec = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
    throw new Error(`Aguarde ${waitSec}s antes de reenviar este documento.`);
  }
  recentSends.set(key, now);
}

function safePdfFilename(base: string): string {
  return base.replace(/[^\w\s.-]/g, "_") + ".pdf";
}

function resolveRecipient(request: MaintenanceRequest): string {
  return request.clientEmail?.trim() || "";
}

async function recordSkipped(
  requestId: string,
  type: EmailDeliveryType,
  recipient: string,
  subject: string,
  trigger: EmailDeliveryTrigger,
  reason: string,
  sentBy?: string
): Promise<DispatchEmailResult> {
  const sentAt = new Date().toISOString();
  const record: EmailDeliveryRecord = {
    id: createDeliveryId(),
    type,
    status: "skipped",
    recipient,
    subject,
    provider: getActiveEmailProvider(),
    sentAt,
    sentBy,
    trigger,
    error: reason,
  };
  await appendEmailDelivery(requestId, record);
  return {
    success: true,
    status: "skipped",
    sentTo: recipient,
    sentAt,
    skipped: true,
    error: reason,
  };
}

async function recordFailed(
  requestId: string,
  type: EmailDeliveryType,
  recipient: string,
  subject: string,
  trigger: EmailDeliveryTrigger,
  error: string,
  sentBy?: string
): Promise<never> {
  const sentAt = new Date().toISOString();
  const record: EmailDeliveryRecord = {
    id: createDeliveryId(),
    type,
    status: "failed",
    recipient,
    subject,
    provider: getActiveEmailProvider(),
    sentAt,
    sentBy,
    trigger,
    error,
  };
  await appendEmailDelivery(requestId, record);
  throw new Error(error);
}

async function dispatchEmail(
  requestId: string,
  type: EmailDeliveryType,
  subject: string,
  html: string,
  text: string,
  options: DispatchEmailOptions,
  attachments?: { filename: string; content: Buffer }[],
  metadata?: EmailDeliveryRecord["metadata"]
): Promise<DispatchEmailResult> {
  const request = options.requestSnapshot ?? (await loadRequest(requestId));
  const recipient = resolveRecipient(request);

  if (!recipient) {
    return recordSkipped(requestId, type, "", subject, options.trigger, "Cliente sem e-mail cadastrado.", options.sentBy);
  }
  if (!isValidEmail(recipient)) {
    return recordSkipped(requestId, type, recipient, subject, options.trigger, `E-mail inválido: ${recipient}`, options.sentBy);
  }

  if (!options.allowResend && hasSuccessfulDelivery(request, type)) {
    const sentAt =
      type === "budget"
        ? request.budgetEmailSentAt
        : type === "rat"
          ? request.ratEmailSentAt
          : type === "maintenance_started"
            ? request.maintenanceStartedEmailSentAt || request.paymentConfirmationEmailSentAt
            : request.trackingEmailSentAt;
    return {
      success: true,
      status: "skipped",
      sentTo: recipient,
      sentAt: sentAt || new Date().toISOString(),
      skipped: true,
    };
  }

  try {
    const sendResult = await sendEmail({
      to: recipient,
      subject,
      html,
      text,
      includeLogo: true,
      attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content })),
    });

    const sentAt = new Date().toISOString();
    const record: EmailDeliveryRecord = {
      id: createDeliveryId(),
      type,
      status: "sent",
      recipient,
      subject,
      provider: sendResult.provider,
      messageId: sendResult.messageId,
      sentAt,
      sentBy: options.sentBy,
      trigger: options.trigger,
      metadata,
    };
    await appendEmailDelivery(requestId, record);

    return { success: true, status: "sent", sentTo: recipient, sentAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao enviar e-mail.";
    await recordFailed(requestId, type, recipient, subject, options.trigger, message, options.sentBy);
  }
}

export async function dispatchBudgetEmail(
  requestId: string,
  sentBy: string,
  options?: { skipRateLimit?: boolean }
): Promise<DispatchEmailResult> {
  if (!options?.skipRateLimit) {
    checkRateLimit(requestId, "budget");
  }

  let request = await loadRequest(requestId);
  if (!request.budget) {
    throw new Error("Esta O.S. ainda não possui orçamento gerado.");
  }

  request = await ensureCardPaymentLinkForRequest(request);

  const pdfBuffer = await generateBudgetPdfBuffer(request);
  const pdfFilename = safePdfFilename(`Orcamento_${request.id}`);
  const subject = buildBudgetEmailSubject(request);
  const html = buildBudgetEmailHtml(request);
  const text = buildBudgetEmailText(request);

  return dispatchEmail(requestId, "budget", subject, html, text, {
    sentBy,
    trigger: "manual",
    allowResend: true,
  }, [{ filename: pdfFilename, content: pdfBuffer }]);
}

export async function dispatchRatEmail(
  requestId: string,
  sentBy: string,
  options?: { skipRateLimit?: boolean; trigger?: EmailDeliveryTrigger }
): Promise<DispatchEmailResult> {
  if (!options?.skipRateLimit) {
    checkRateLimit(requestId, "rat");
  }

  const request = await loadRequest(requestId);
  if (!request.rat) {
    throw new Error("Esta O.S. ainda não possui RAT gerada.");
  }

  const pdfBuffer = await generateRatPdfBuffer(request);
  const pdfFilename = safePdfFilename(`Relatorio_RAT_${request.id}`);
  const subject = buildRatEmailSubject(request);
  const html = buildRatEmailHtml(request);
  const text = buildRatEmailText(request);

  return dispatchEmail(requestId, "rat", subject, html, text, {
    sentBy,
    trigger: options?.trigger || "manual",
    skipRateLimit: options?.skipRateLimit,
  }, [{ filename: pdfFilename, content: pdfBuffer }]);
}

export async function dispatchMaintenanceStartedEmail(
  requestId: string,
  options: { trigger: EmailDeliveryTrigger; sentBy?: string }
): Promise<DispatchEmailResult> {
  const request = await loadRequest(requestId);
  const subject = buildMaintenanceStartedEmailSubject(request);
  const html = buildMaintenanceStartedEmailHtml(request);
  const text = buildMaintenanceStartedEmailText(request);

  return dispatchEmail(requestId, "maintenance_started", subject, html, text, {
    sentBy: options.sentBy || "Sistema",
    trigger: options.trigger,
  });
}

export async function dispatchTrackingEmail(
  requestId: string,
  options: {
    trigger: EmailDeliveryTrigger;
    sentBy?: string;
    allowResend?: boolean;
    trackingCode?: string;
    serviceName?: string;
    requestSnapshot?: MaintenanceRequest;
  }
): Promise<DispatchEmailResult> {
  const request =
    options.requestSnapshot ??
    (await loadRequest(requestId));

  const trackingCode =
    options.trackingCode?.trim() ||
    request.shippingLabel?.trackingCode?.trim();

  if (!trackingCode) {
    throw new Error("Esta O.S. ainda não possui código de rastreio gerado.");
  }

  const requestForTemplate: MaintenanceRequest = {
    ...request,
    shippingLabel: request.shippingLabel ?? {
      trackingCode,
      idPrePostagem: "",
      serviceCode: "",
      serviceName: options.serviceName || "",
      generatedAt: new Date().toISOString(),
    },
  };

  const subject = buildTrackingEmailSubject(requestForTemplate);
  const html = buildTrackingEmailHtml(requestForTemplate, trackingCode);
  const text = buildTrackingEmailText(requestForTemplate, trackingCode);

  return dispatchEmail(
    requestId,
    "tracking",
    subject,
    html,
    text,
    {
      sentBy: options.sentBy || "Sistema",
      trigger: options.trigger,
      allowResend: options.allowResend,
      requestSnapshot: requestForTemplate,
    },
    undefined,
    { trackingCode }
  );
}
