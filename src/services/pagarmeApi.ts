/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BudgetPayment } from "../types";

export interface PublicPaymentSummary {
  requestId: string;
  requestNumber: string;
  clientName: string;
  clientCompany: string;
  productName: string;
  totalFinal: number;
  isWarranty: boolean;
  columnId: string;
  budgetPayment: BudgetPayment;
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || `Erro ${response.status}`;
  } catch {
    return `Erro ${response.status}`;
  }
}

export async function generatePixPayment(
  requestId: string,
  forceRefresh = false,
  amountCents?: number
): Promise<BudgetPayment> {
  const response = await fetch("/api/pagarme/pix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, forceRefresh, amountCents }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function generatePixPaymentByToken(
  token: string,
  forceRefresh = false,
  amountCents?: number
): Promise<BudgetPayment> {
  const response = await fetch("/api/pagarme/pix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, forceRefresh, amountCents }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function generateCardLink(
  requestId: string,
  amountCents?: number,
  forceRefresh = false
): Promise<BudgetPayment> {
  const response = await fetch("/api/pagarme/card-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, amountCents, forceRefresh }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function generateCardLinkByToken(
  token: string,
  amountCents?: number,
  forceRefresh = false
): Promise<BudgetPayment> {
  const response = await fetch("/api/pagarme/card-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, amountCents, forceRefresh }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function verifyPaymentStatus(requestId: string): Promise<{
  status: BudgetPayment["status"];
  paid: boolean;
}> {
  const response = await fetch(`/api/pagarme/status/${encodeURIComponent(requestId)}`);
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return { status: data.status, paid: data.paid };
}

export async function verifyPaymentStatusByToken(token: string): Promise<{
  status: BudgetPayment["status"];
  paid: boolean;
}> {
  const response = await fetch(`/api/pagarme/status-by-token/${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return { status: data.status, paid: data.paid };
}

export async function createPublicPaymentLink(requestId: string): Promise<{ url: string; token: string }> {
  const response = await fetch("/api/pagarme/public-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function fetchPublicPaymentSummary(token: string): Promise<PublicPaymentSummary> {
  const response = await fetch(`/api/pagarme/public/${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}
