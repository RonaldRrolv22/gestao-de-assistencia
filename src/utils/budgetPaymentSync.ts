/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BudgetPayment } from "../types";

export function cardLinkAmountCents(payment: BudgetPayment | undefined): number | undefined {
  if (!payment) return undefined;
  if (typeof payment.cardLinkAmountCents === "number") return payment.cardLinkAmountCents;
  if (payment.paymentLinkUrl) return payment.amountCents;
  return undefined;
}

export function pixChargeAmountCents(payment: BudgetPayment | undefined): number | undefined {
  if (!payment) return undefined;
  if (typeof payment.pixAmountCents === "number") return payment.pixAmountCents;
  if (payment.pixQrCode) return payment.amountCents;
  return undefined;
}

export function isCardPaymentLinkCurrent(
  payment: BudgetPayment | undefined,
  amountCents: number,
  shipping: number
): boolean {
  if (shipping <= 0) return false;
  const url = payment?.paymentLinkUrl?.trim() || "";
  if (
    !url ||
    payment?.status === "paid" ||
    payment?.status === "expired" ||
    !payment?.pagarmePaymentLinkId
  ) {
    return false;
  }
  const linkedCents = cardLinkAmountCents(payment);
  if (linkedCents !== amountCents) return false;
  if (!url.includes("pagar.me")) return false;
  if (url.includes("localhost") || url.includes("/pagamento/")) return false;
  return true;
}

export function isPixStillValid(payment: BudgetPayment | undefined, amountCents: number): boolean {
  if (
    !payment ||
    payment.status !== "pending" ||
    !payment.pixQrCode ||
    !payment.pagarmeOrderId
  ) {
    return false;
  }
  const pixCents = pixChargeAmountCents(payment);
  return pixCents === amountCents;
}
