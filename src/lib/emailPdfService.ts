/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceRequest } from "../types";
import { generatePdfFromHtml } from "./generatePdf";
import { mergeRatPdfWithAttachments, PdfMergeAttachment } from "./mergeRatPdf";
import {
  buildBudgetCommercialHtml,
  resolveBudgetPdfPaymentInfo,
} from "../utils/budgetCommercialPdf";
import { buildRatReportHtml } from "../utils/ratReportTemplate";
import { getAdminDb } from "./firebaseAdmin";
import { sanitizeRequestDocId } from "../services/requestIds";
import {
  createCardPaymentLink,
  createPixPayment,
  createPublicPaymentToken,
  isCardPaymentLinkCurrent,
} from "../services/pagarmePaymentService";

const REQUESTS_COLLECTION = "maintenance_requests";

async function loadRequest(requestId: string): Promise<MaintenanceRequest> {
  const docId = sanitizeRequestDocId(requestId);
  const snap = await getAdminDb().collection(REQUESTS_COLLECTION).doc(docId).get();
  if (!snap.exists) {
    throw new Error(`Ordem de serviço "${requestId}" não encontrada.`);
  }
  const data = snap.data() as MaintenanceRequest;
  return { ...data, id: data.id || requestId };
}

export async function ensurePaymentMethodsForRequest(
  request: MaintenanceRequest
): Promise<MaintenanceRequest> {
  const budget = request.budget;
  if (!budget || budget.isWarranty || budget.totalFinal <= 0) return request;

  const shipping = budget.shipping || 0;
  if (shipping <= 0) return request;

  const amountCents = Math.round(budget.totalFinal * 100);
  const payment = request.budgetPayment;

  if (!isCardPaymentLinkCurrent(payment, amountCents, shipping)) {
    await createCardPaymentLink(request.id, { amountCents });
    request = await loadRequest(request.id);
  }

  if (!request.budgetPayment?.pixQrCode) {
    await createPixPayment(request.id, { amountCents });
    request = await loadRequest(request.id);
  }

  if (!request.budgetPayment?.publicToken) {
    await createPublicPaymentToken(request.id);
    request = await loadRequest(request.id);
  }

  return request;
}

/** @deprecated Use ensurePaymentMethodsForRequest */
export async function ensureCardPaymentLinkForRequest(
  request: MaintenanceRequest
): Promise<MaintenanceRequest> {
  return ensurePaymentMethodsForRequest(request);
}

export async function generateBudgetPdfBuffer(request: MaintenanceRequest): Promise<Buffer> {
  const budget = request.budget!;
  const budgetProducts = budget.products || [];
  const budgetServices = budget.services || [];
  const subtotalProducts = budgetProducts.reduce((sum, p) => sum + p.totalValue, 0);
  const subtotalServices = budgetServices.reduce((sum, s) => sum + s.totalValue, 0);
  const shipping = budget.shipping || 0;
  const discount = budget.discount || 0;

  const html = buildBudgetCommercialHtml({
    request,
    isWarranty: budget.isWarranty,
    budgetProducts,
    budgetServices,
    subtotalProducts,
    subtotalServices,
    shipping,
    shippingService: budget.shippingService,
    discount,
    calculatedTotal: budget.totalFinal,
    paymentInfo: resolveBudgetPdfPaymentInfo(
      request.budgetPayment,
      budget.isWarranty,
      budget.totalFinal,
      shipping
    ),
    includePrintButton: false,
  });

  return generatePdfFromHtml(html);
}

export async function generateRatPdfBuffer(request: MaintenanceRequest): Promise<Buffer> {
  const rat = request.rat!;
  const isFinalizado = rat.status === "Finalizado";

  const html = buildRatReportHtml(
    {
      request,
      isFinalizado,
      diagnostic: rat.diagnostic || request.initialDiagnostic || "",
      defectCauses: rat.defectCauses || [],
      laborRows: rat.labor || [],
      partRows: rat.parts || [],
      finalInspectionElectric: rat.finalInspectionElectric || "N/A",
      finalInspectionFunctional: rat.finalInspectionFunctional || "N/A",
      technicalNotes: rat.technicalNotes || "",
      attachments: rat.attachments || [],
    },
    { includePrintButton: false, includeAttachments: false }
  );

  const attList: PdfMergeAttachment[] = (rat.attachments || [])
    .filter((att) => att.storagePath)
    .map((att) => ({
      name: att.name,
      type: att.type,
      storagePath: att.storagePath,
    }));

  if (attList.length > 0) {
    return mergeRatPdfWithAttachments(html, attList);
  }
  return generatePdfFromHtml(html);
}
