/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from "crypto";
import { getAdminDb } from "../lib/firebaseAdmin";
import { pagarmeRequest } from "../lib/pagarmeClient";
import { BudgetPayment, Client, MaintenanceRequest } from "../types";
import { sanitizeRequestDocId } from "./requestIds";
import {
  acceptableCardPaymentCents,
  buildCardInstallmentsWithSurcharge,
  expectedCardLinkAmountCents,
} from "../utils/cardSurcharge";
import { chargeableBudgetTotal } from "../utils/maintenanceAccess";
import {
  isCardLinkSynced,
  isCardPaymentLinkCurrent,
  isPixStillValid,
} from "../utils/budgetPaymentSync";

export { isCardLinkSynced, isCardPaymentLinkCurrent, isPixStillValid };

type RequestDoc = MaintenanceRequest & { budgetPayment?: BudgetPayment };

interface PagarmeCharge {
  id?: string;
  status?: string;
  amount?: number;
  last_transaction?: {
    qr_code?: string;
    qr_code_url?: string;
    expires_at?: string;
    status?: string;
  };
}

interface PagarmeOrder {
  id?: string;
  status?: string;
  amount?: number;
  charges?: PagarmeCharge[];
  metadata?: { requestId?: string; requestDocId?: string; payment_link_id?: string };
  payment_link_id?: string;
  checkout?: { payment_link_id?: string };
}

interface PagarmePaymentLink {
  id?: string;
  url?: string;
  status?: string;
  order?: PagarmeOrder;
  total_paid_sessions?: number;
  metadata?: { requestId?: string; requestDocId?: string };
}

interface PagarmeOrderListResponse {
  data?: PagarmeOrder[];
}

/** Prazo máximo permitido pela API Pagar.me (~10 anos). */
export const PIX_EXPIRES_IN_SECONDS = 315_360_000;

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function parsePhone(phone: string): { area_code: string; number: string } {
  const digits = onlyDigits(phone);
  if (digits.length >= 10) {
    return {
      area_code: digits.slice(0, 2),
      number: digits.slice(2),
    };
  }
  return { area_code: "81", number: digits || "999999999" };
}

function pickNonEmpty(...values: (string | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

interface PaymentCustomerProfile {
  name: string;
  email: string;
  document: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  zipCode: string;
  type: "individual" | "company";
}

async function loadClientById(clientId: string): Promise<Client | null> {
  if (!clientId?.trim()) return null;
  const snap = await getAdminDb().collection("clients").doc(clientId).get();
  if (!snap.exists) return null;
  return snap.data() as Client;
}

async function resolveCustomerProfile(req: RequestDoc): Promise<PaymentCustomerProfile> {
  const client = await loadClientById(req.clientId);

  const document = onlyDigits(pickNonEmpty(client?.cpfCnpj, req.clientCpfCnpj));
  const name =
    pickNonEmpty(client?.name, req.clientName) ||
    pickNonEmpty(client?.company, req.clientCompany);

  const profile: PaymentCustomerProfile = {
    name,
    email: pickNonEmpty(client?.email, req.clientEmail),
    document,
    phone: pickNonEmpty(client?.phone, req.clientPhone),
    addressLine: pickNonEmpty(client?.address, req.clientAddress),
    city: pickNonEmpty(client?.city, req.clientCity),
    state: pickNonEmpty(client?.state, req.clientState).toUpperCase(),
    zipCode: onlyDigits(pickNonEmpty(client?.cep, req.clientCep)),
    type: document.length === 14 ? "company" : "individual",
  };

  return profile;
}

function validateCustomerProfile(profile: PaymentCustomerProfile): void {
  const missing: string[] = [];

  if (profile.document.length !== 11 && profile.document.length !== 14) {
    missing.push("CPF/CNPJ");
  }
  if (!profile.email) missing.push("e-mail");
  if (onlyDigits(profile.phone).length < 10) missing.push("telefone");
  if (!profile.name) missing.push("nome");
  if (!profile.addressLine) missing.push("endereço");
  if (!profile.city) missing.push("cidade");
  if (profile.state.length !== 2) missing.push("UF");
  if (profile.zipCode.length !== 8) missing.push("CEP");

  if (missing.length > 0) {
    throw new Error(
      `Dados do cliente incompletos para pagamento (${missing.join(", ")}). ` +
        "Atualize o cadastro em Clientes antes de gerar a cobrança."
    );
  }
}

function buildCustomer(profile: PaymentCustomerProfile) {
  validateCustomerProfile(profile);

  const phone = parsePhone(profile.phone);

  return {
    name: profile.name,
    email: profile.email.trim().toLowerCase(),
    document: profile.document,
    type: profile.type,
    phones: {
      mobile_phone: {
        country_code: "55",
        area_code: phone.area_code,
        number: phone.number,
      },
    },
    address: {
      line_1: profile.addressLine,
      zip_code: profile.zipCode,
      city: profile.city,
      state: profile.state,
      country: "BR",
    },
  };
}

export function effectiveBudgetTotal(budget: MaintenanceRequest["budget"]): number {
  return chargeableBudgetTotal(budget);
}

function pixAmountCentsForRequest(req: RequestDoc): number {
  const cents = Math.round(chargeableBudgetTotal(req.budget) * 100);
  if (cents <= 0) {
    throw new Error("Valor do orçamento deve ser maior que zero para cobrança.");
  }
  return cents;
}

function assertChargeableRequest(req: RequestDoc, forCard = false): void {
  if (!req.budget) {
    throw new Error("Orçamento não encontrado para cobrança.");
  }
  if (req.budget.isWarranty) {
    if (!req.budget.chargeShippingOnWarranty || !(req.budget.shipping || 0)) {
      throw new Error("Orçamentos em garantia sem cobrança de frete não exigem pagamento.");
    }
    if (forCard) {
      throw new Error("Orçamentos em garantia cobram apenas frete via PIX.");
    }
  }
}

function resolveAmountCents(req: RequestDoc, overrideCents?: number): number {
  if (overrideCents !== undefined) {
    if (overrideCents <= 0) {
      throw new Error("Valor do orçamento deve ser maior que zero para cobrança.");
    }
    return overrideCents;
  }
  return pixAmountCentsForRequest(req);
}

export async function loadRequestByDisplayId(requestId: string): Promise<{ docId: string; data: RequestDoc }> {
  const docId = sanitizeRequestDocId(requestId);
  const snap = await getAdminDb().collection("maintenance_requests").doc(docId).get();
  if (!snap.exists) {
    throw new Error(`Ordem de serviço não encontrada: ${requestId}`);
  }
  return { docId, data: snap.data() as RequestDoc };
}

export async function loadRequestByPublicToken(token: string): Promise<{ docId: string; data: RequestDoc }> {
  const tokenSnap = await getAdminDb().collection("payment_tokens").doc(token).get();
  if (!tokenSnap.exists) {
    throw new Error("Link de pagamento inválido ou expirado.");
  }
  const requestDocId = tokenSnap.data()?.requestDocId as string;
  const snap = await getAdminDb().collection("maintenance_requests").doc(requestDocId).get();
  if (!snap.exists) {
    throw new Error("Ordem de serviço não encontrada.");
  }
  const data = snap.data() as RequestDoc;
  if (data.budgetPayment?.publicToken !== token) {
    throw new Error("Token de pagamento inválido.");
  }
  return { docId: requestDocId, data };
}

async function saveBudgetPayment(docId: string, payment: BudgetPayment): Promise<void> {
  await getAdminDb().collection("maintenance_requests").doc(docId).set(
    { budgetPayment: payment, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export async function createPixPayment(
  requestId: string,
  options?: { forceRefresh?: boolean; amountCents?: number }
): Promise<BudgetPayment & { requestId: string }> {
  const { docId, data: req } = await loadRequestByDisplayId(requestId);
  assertChargeableRequest(req);

  const amountCents = resolveAmountCents(req, options?.amountCents);
  const existing = req.budgetPayment;

  if (!options?.forceRefresh && existing && isPixStillValid(existing, amountCents)) {
    return { ...existing, requestId: req.id };
  }

  const customer = buildCustomer(await resolveCustomerProfile(req));

  const order = await pagarmeRequest<PagarmeOrder>("POST", "/orders", {
    customer,
    items: [
      {
        amount: amountCents,
        description: `Orçamento O.S. ${req.id}`,
        quantity: 1,
        code: sanitizeRequestDocId(req.id),
      },
    ],
    payments: [
      {
        payment_method: "pix",
        pix: { expires_in: PIX_EXPIRES_IN_SECONDS },
      },
    ],
    metadata: {
      requestId: req.id,
      requestDocId: docId,
    },
    closed: true,
  });

  const charge = order.charges?.[0];
  const tx = charge?.last_transaction;

  const payment: BudgetPayment = {
    ...(existing || { status: "none", amountCents: 0 }),
    status: "pending",
    method: "pix",
    pagarmeOrderId: order.id,
    pagarmeChargeId: charge?.id,
    pixQrCode: tx?.qr_code,
    pixQrCodeUrl: tx?.qr_code_url,
    pixExpiresAt: tx?.expires_at,
    amountCents,
    pixAmountCents: amountCents,
    cardLinkAmountCents: existing?.cardLinkAmountCents,
    paymentLinkUrl: existing?.paymentLinkUrl,
    pagarmePaymentLinkId: existing?.pagarmePaymentLinkId,
  };

  await saveBudgetPayment(docId, payment);
  return { ...payment, requestId: req.id };
}

export async function createCardPaymentLink(
  requestId: string,
  options?: { amountCents?: number; forceRefresh?: boolean }
): Promise<BudgetPayment & { requestId: string }> {
  const { docId, data: req } = await loadRequestByDisplayId(requestId);
  assertChargeableRequest(req, true);

  const pixBaseCents = resolveAmountCents(req, options?.amountCents);
  const cardLinkCents = expectedCardLinkAmountCents(pixBaseCents);
  const existing = req.budgetPayment;

  if (
    !options?.forceRefresh &&
    existing &&
    isCardLinkSynced(existing, pixBaseCents)
  ) {
    return { ...existing, requestId: req.id };
  }

  const installments = buildCardInstallmentsWithSurcharge(pixBaseCents);
  const customer = buildCustomer(await resolveCustomerProfile(req));

  const link = await pagarmeRequest<PagarmePaymentLink & {
    payment_settings?: {
      credit_card_settings?: {
        installments?: { number: number; total: number }[];
      };
    };
  }>("POST", "/paymentlinks", {
    name: `Orçamento O.S. ${req.id}`,
    type: "order",
    customer_settings: { customer },
    payment_settings: {
      accepted_payment_methods: ["credit_card"],
      credit_card_settings: {
        operation_type: "auth_and_capture",
        installments,
      },
    },
    cart_settings: {
      items: [
        {
          name: `Orçamento O.S. ${req.id}`,
          amount: cardLinkCents,
          default_quantity: 1,
        },
      ],
    },
    metadata: {
      requestId: req.id,
      requestDocId: docId,
    },
  });

  const savedInstallments = link.payment_settings?.credit_card_settings?.installments ?? [];
  const savedMax = savedInstallments[savedInstallments.length - 1]?.number ?? 1;
  const requestedMax = installments[installments.length - 1]?.number ?? 1;
  if (savedMax < requestedMax) {
    throw new Error(
      `Pagar.me criou o link apenas com ${savedMax}x, mas o orçamento permite até ${requestedMax}x. Tente gerar o link novamente.`
    );
  }

  const existingPayment = req.budgetPayment;
  const payment: BudgetPayment = {
    ...(existingPayment || { status: "none", amountCents: 0 }),
    status: "pending",
    method: "credit_card",
    pagarmePaymentLinkId: link.id,
    paymentLinkUrl: link.url,
    amountCents: pixBaseCents,
    cardLinkAmountCents: cardLinkCents,
    pixAmountCents: existingPayment?.pixAmountCents ?? pixBaseCents,
    pagarmeOrderId: existingPayment?.pagarmeOrderId,
    pagarmeChargeId: existingPayment?.pagarmeChargeId,
    pixQrCode: existingPayment?.pixQrCode,
    pixQrCodeUrl: existingPayment?.pixQrCodeUrl,
    pixExpiresAt: existingPayment?.pixExpiresAt,
  };

  await saveBudgetPayment(docId, payment);
  return { ...payment, requestId: req.id };
}

async function createPaymentApprovedNotification(req: RequestDoc, paidAt: string): Promise<void> {
  const notifId = `pay-${sanitizeRequestDocId(req.id)}-${Date.now()}`;
  const totalFinal = effectiveBudgetTotal(req.budget);

  await getAdminDb().collection("notifications").doc(notifId).set({
    id: notifId,
    type: "payment_approved",
    requestId: req.id,
    requestNumber: req.requestNumber,
    clientName: req.clientName,
    productName: req.productName,
    totalFinal,
    title: `Pagamento aprovado — ${req.id}`,
    message: `O pagamento da O.S. ${req.id} (${req.productName}) foi confirmado. Inicie a manutenção do equipamento.`,
    createdAt: paidAt,
    readBy: [],
  });
}

async function notifyMaintenanceStartedEmail(req: RequestDoc): Promise<void> {
  try {
    const { sendMaintenanceStartedEmail } = await import("../lib/documentEmailService");
    const result = await sendMaintenanceStartedEmail(req, "auto_payment");
    if (result.status === "failed") {
      console.error("Falha ao enviar e-mail de manutenção iniciada:", result.error);
    }
  } catch (err) {
    console.error("Falha ao enviar e-mail de manutenção iniciada:", err);
  }
}

async function markRequestPaid(docId: string, req: RequestDoc): Promise<RequestDoc> {
  if (req.columnId === "manutencao") {
    if (!req.maintenanceStartedEmailSentAt && !req.paymentConfirmationEmailSentAt) {
      await notifyMaintenanceStartedEmail(req);
    }
    return req;
  }

  const log = {
    id: `mov-pay-${Date.now()}`,
    fromColumn: req.columnId,
    toColumn: "manutencao" as const,
    userId: "pagarme",
    userName: "Pagar.me",
    timestamp: new Date().toISOString(),
  };

  const paidAt = new Date().toISOString();
  const budgetPayment: BudgetPayment = {
    ...(req.budgetPayment || { amountCents: 0, status: "none" }),
    status: "paid",
    paidAt,
  };

  const updated: RequestDoc = {
    ...req,
    columnId: "manutencao",
    budget: req.budget
      ? { ...req.budget, isApproved: true, approvedDate: paidAt }
      : req.budget,
    budgetPayment,
    movementHistory: [...(req.movementHistory || []), log],
    rat: req.rat || {
      diagnostic: req.initialDiagnostic || "",
      labor: [],
      parts: [],
      technicalNotes: "",
      attachments: [],
      status: "Rascunho",
    },
  };

  await getAdminDb().collection("maintenance_requests").doc(docId).set(
    { ...updated, updatedAt: new Date().toISOString() },
    { merge: true }
  );

  await createPaymentApprovedNotification(updated, paidAt);
  await notifyMaintenanceStartedEmail(updated);

  return updated;
}

interface PagarmeWebhookPayload {
  type?: string;
  data?: PagarmeOrder & {
    metadata?: { requestId?: string; requestDocId?: string };
  };
}

async function findRequestByPagarmeOrderId(
  orderId: string
): Promise<{ docId: string; data: RequestDoc } | null> {
  const snap = await getAdminDb()
    .collection("maintenance_requests")
    .where("budgetPayment.pagarmeOrderId", "==", orderId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { docId: doc.id, data: doc.data() as RequestDoc };
}

async function findRequestByPagarmePaymentLinkId(
  paymentLinkId: string
): Promise<{ docId: string; data: RequestDoc } | null> {
  const snap = await getAdminDb()
    .collection("maintenance_requests")
    .where("budgetPayment.pagarmePaymentLinkId", "==", paymentLinkId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { docId: doc.id, data: doc.data() as RequestDoc };
}

function isOrderPaid(order?: PagarmeOrder): boolean {
  if (!order) return false;
  if (order.status === "paid") return true;
  return Boolean(order.charges?.some((c) => c.status === "paid"));
}

function orderAmountCents(order: PagarmeOrder): number | undefined {
  if (typeof order.amount === "number") return order.amount;
  const paidCharge = order.charges?.find((c) => c.status === "paid") ?? order.charges?.[0];
  return typeof paidCharge?.amount === "number" ? paidCharge.amount : undefined;
}

function expectedPaymentAmountsCents(payment: BudgetPayment): number[] {
  const amounts = new Set<number>();
  if (payment.cardLinkAmountCents != null) amounts.add(payment.cardLinkAmountCents);
  if (payment.pixAmountCents != null) amounts.add(payment.pixAmountCents);
  if (payment.amountCents > 0) amounts.add(payment.amountCents);
  return [...amounts];
}

/** Só confirma pagamento se o pedido pago pertence a esta O.S. e ao valor esperado. */
function isPaidOrderMatchingRequest(
  order: PagarmeOrder,
  payment: BudgetPayment,
  request: RequestDoc
): boolean {
  if (!isOrderPaid(order)) return false;

  const metaRequestId = order.metadata?.requestId?.trim();
  if (metaRequestId && metaRequestId !== request.id) return false;

  const metaDocId = order.metadata?.requestDocId?.trim();
  if (metaDocId && metaDocId !== sanitizeRequestDocId(request.id)) return false;

  const paidAmount = orderAmountCents(order);
  const expectedAmounts = expectedPaymentAmountsCents(payment);
  const budgetCents = Math.round(effectiveBudgetTotal(request.budget) * 100);

  if (paidAmount == null) {
    return Boolean(metaRequestId || metaDocId);
  }

  if (expectedAmounts.includes(paidAmount)) return true;
  if (budgetCents > 0 && paidAmount === budgetCents) return true;
  if (budgetCents > 0 && acceptableCardPaymentCents(budgetCents).includes(paidAmount)) return true;

  return false;
}

async function findPaidOrderForPaymentLink(
  paymentLinkId: string,
  payment: BudgetPayment,
  request: RequestDoc
): Promise<PagarmeOrder | null> {
  try {
    const response = await pagarmeRequest<PagarmeOrderListResponse>(
      "GET",
      `/orders?payment_link_id=${encodeURIComponent(paymentLinkId)}&status=paid&size=10`
    );
    const paid = (response.data || []).find((order) =>
      isPaidOrderMatchingRequest(order, payment, request)
    );
    if (paid) return paid;
  } catch (err) {
    console.warn("[pagarme] Listagem de pedidos por payment_link_id falhou:", paymentLinkId, err);
  }
  return null;
}

function extractPaymentLinkIdFromOrder(order: PagarmeOrder & Record<string, unknown>): string | undefined {
  const direct = order.payment_link_id;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const checkout = order.checkout as { payment_link_id?: string } | undefined;
  if (checkout?.payment_link_id?.trim()) return checkout.payment_link_id.trim();

  const metadataLink = order.metadata?.payment_link_id;
  if (typeof metadataLink === "string" && metadataLink.trim()) return metadataLink.trim();

  return undefined;
}

function isWebhookPaidEvent(payload: PagarmeWebhookPayload): boolean {
  const eventType = payload.type || "";
  const order = payload.data;
  if (!order) return false;

  if (eventType === "order.paid" || eventType === "charge.paid") return true;
  if (order.status === "paid") return true;
  if (order.charges?.some((c) => c.status === "paid")) return true;
  return false;
}

export async function handlePagarmeWebhook(payload: PagarmeWebhookPayload): Promise<void> {
  if (!isWebhookPaidEvent(payload)) return;

  const order = payload.data!;
  let docId = order.metadata?.requestDocId;
  let req: RequestDoc | null = null;

  if (docId) {
    const snap = await getAdminDb().collection("maintenance_requests").doc(docId).get();
    if (snap.exists) req = snap.data() as RequestDoc;
  }

  if (!req && order.metadata?.requestId) {
    const loaded = await loadRequestByDisplayId(order.metadata.requestId);
    docId = loaded.docId;
    req = loaded.data;
  }

  if (!req && order.id) {
    const found = await findRequestByPagarmeOrderId(order.id);
    if (found) {
      docId = found.docId;
      req = found.data;
    }
  }

  if (!req) {
    const paymentLinkId = extractPaymentLinkIdFromOrder(order as PagarmeOrder & Record<string, unknown>);
    if (paymentLinkId) {
      const found = await findRequestByPagarmePaymentLinkId(paymentLinkId);
      if (found) {
        docId = found.docId;
        req = found.data;
      }
    }
  }

  if (!req || !docId) {
    console.warn("[pagarme-webhook] O.S. não encontrada para evento pago.", order.id);
    return;
  }

  const payment = req.budgetPayment;
  if (payment && !isPaidOrderMatchingRequest(order, payment, req)) {
    console.warn(
      "[pagarme-webhook] Pedido pago ignorado — valor ou metadata não correspondem à O.S.",
      order.id,
      req.id
    );
    return;
  }

  await markRequestPaid(docId, req);
}

function mapChargeStatus(charge?: PagarmeCharge): BudgetPayment["status"] {
  const status = charge?.status || charge?.last_transaction?.status;
  if (status === "paid") return "paid";
  if (status === "failed" || status === "canceled") return "failed";
  if (status === "expired") return "expired";
  return "pending";
}

async function resolveRemotePaymentStatus(
  payment: BudgetPayment,
  request: RequestDoc
): Promise<{ status: BudgetPayment["status"]; orderId?: string }> {
  let status: BudgetPayment["status"] = "pending";
  let orderId = payment.pagarmeOrderId;

  if (payment.pagarmeOrderId) {
    const order = await pagarmeRequest<PagarmeOrder>("GET", `/orders/${payment.pagarmeOrderId}`);
    const chargeStatus = mapChargeStatus(order.charges?.[0]);
    const orderPaid =
      order.status === "paid" || chargeStatus === "paid" || isOrderPaid(order);
    if (orderPaid && isPaidOrderMatchingRequest(order, payment, request)) {
      return { status: "paid", orderId: payment.pagarmeOrderId };
    }
    if (chargeStatus === "failed") status = "failed";
    if (chargeStatus === "expired") status = "expired";
  }

  if (payment.pagarmePaymentLinkId) {
    const link = await pagarmeRequest<PagarmePaymentLink>(
      "GET",
      `/paymentlinks/${payment.pagarmePaymentLinkId}`
    );

    const paidOrderFromLink =
      link.order && isPaidOrderMatchingRequest(link.order, payment, request)
        ? link.order
        : await findPaidOrderForPaymentLink(payment.pagarmePaymentLinkId, payment, request);

    if (paidOrderFromLink) {
      return { status: "paid", orderId: paidOrderFromLink.id || orderId };
    }

    if (link.status === "expired" && status === "pending" && !payment.pixQrCode) {
      status = "expired";
    }
  }

  return { status, orderId };
}

export async function checkPaymentStatus(requestId: string): Promise<{
  status: BudgetPayment["status"];
  request: RequestDoc;
  paid: boolean;
}> {
  const { docId, data: req } = await loadRequestByDisplayId(requestId);
  const payment = req.budgetPayment;

  if (!payment || payment.status === "none") {
    return { status: "none", request: req, paid: false };
  }

  if (payment.status === "paid") {
    return { status: "paid", request: req, paid: true };
  }

  const { status: remoteStatus, orderId } = await resolveRemotePaymentStatus(payment, req);
  if (orderId && orderId !== payment.pagarmeOrderId) {
    payment.pagarmeOrderId = orderId;
  }

  let effectiveStatus = remoteStatus;
  if (
    remoteStatus === "expired" &&
    payment.pixQrCode &&
    isPixStillValid(payment, payment.amountCents)
  ) {
    effectiveStatus = "pending";
  }

  if (effectiveStatus === "paid") {
    const reqWithOrder: RequestDoc = {
      ...req,
      budgetPayment: {
        ...payment,
        ...(orderId ? { pagarmeOrderId: orderId } : {}),
      },
    };
    const updated = await markRequestPaid(docId, reqWithOrder);
    return { status: "paid", request: updated, paid: true };
  }

  if (effectiveStatus !== payment.status) {
    const updatedPayment: BudgetPayment = { ...payment, status: effectiveStatus };
    await saveBudgetPayment(docId, updatedPayment);
    return { status: effectiveStatus, request: { ...req, budgetPayment: updatedPayment }, paid: false };
  }

  return { status: payment.status, request: req, paid: false };
}

export async function forceConfirmPaymentForTest(requestId: string): Promise<RequestDoc> {
  const { docId, data } = await loadRequestByDisplayId(requestId);
  return markRequestPaid(docId, data);
}

export async function checkPaymentStatusByToken(token: string) {
  const { data: req } = await loadRequestByPublicToken(token);
  return checkPaymentStatus(req.id);
}

/** Verifica O.S. pendentes no Firestore e move para manutenção quando o pagamento for confirmado. */
export async function pollPendingPayments(): Promise<{ checked: number; moved: number }> {
  const snap = await getAdminDb()
    .collection("maintenance_requests")
    .where("columnId", "==", "orcamento")
    .get();

  let checked = 0;
  let moved = 0;

  for (const doc of snap.docs) {
    const req = { ...(doc.data() as RequestDoc), id: (doc.data() as RequestDoc).id || doc.id };
    if (req.budget?.isWarranty && !req.budget.chargeShippingOnWarranty) continue;

    const payment = req.budgetPayment;
    if (!payment || payment.status === "paid" || payment.status === "none") continue;
    if (!payment.pagarmePaymentLinkId && !payment.pagarmeOrderId && !payment.pixQrCode) continue;

    checked += 1;
    try {
      const result = await checkPaymentStatus(req.id);
      if (result.paid && result.request.columnId === "manutencao") {
        moved += 1;
      }
    } catch (err) {
      console.warn("[pagarme-poll] Falha ao verificar pagamento:", req.id, err);
    }
  }

  return { checked, moved };
}

export async function createPublicPaymentToken(requestId: string): Promise<{ url: string; token: string }> {
  const { docId, data: req } = await loadRequestByDisplayId(requestId);
  const token = req.budgetPayment?.publicToken || randomUUID();

  await getAdminDb().collection("payment_tokens").doc(token).set({
    requestDocId: docId,
    requestId: req.id,
    createdAt: new Date().toISOString(),
  });

  const payment: BudgetPayment = {
    ...(req.budgetPayment || {
      status: "none",
      amountCents: req.budget ? Math.round(effectiveBudgetTotal(req.budget) * 100) : 0,
    }),
    publicToken: token,
  };

  await saveBudgetPayment(docId, payment);

  return { token, url: `${appUrl()}/pagamento/${token}` };
}

export function toPublicPaymentSummary(req: RequestDoc) {
  return {
    requestId: req.id,
    requestNumber: req.requestNumber,
    clientName: req.clientName,
    clientCompany: req.clientCompany,
    productName: req.productName,
    totalFinal: effectiveBudgetTotal(req.budget),
    isWarranty: req.budget?.isWarranty ?? false,
    columnId: req.columnId,
    budgetPayment: req.budgetPayment || { status: "none" as const, amountCents: 0 },
  };
}

export async function createPixPaymentByToken(
  token: string,
  options?: { forceRefresh?: boolean; amountCents?: number }
) {
  const { data: req } = await loadRequestByPublicToken(token);
  return createPixPayment(req.id, options);
}

export async function createCardPaymentLinkByToken(
  token: string,
  options?: { amountCents?: number; forceRefresh?: boolean }
) {
  const { data: req } = await loadRequestByPublicToken(token);
  return createCardPaymentLink(req.id, options);
}

export async function getPublicPaymentSummary(token: string) {
  const { data: req } = await loadRequestByPublicToken(token);
  return toPublicPaymentSummary(req);
}
