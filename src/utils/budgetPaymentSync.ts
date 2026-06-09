/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BudgetPayment } from "../types";

export function cardLinkAmountCents(payment: BudgetPayment | undefined): number | undefined {
  if (!payment) return undefined;
  if (typeof payment.cardLinkAmountCents === "number") return payment.cardLinkAmountCents;
  return undefined;
}

export function pixChargeAmountCents(payment: BudgetPayment | undefined): number | undefined {
  if (!payment) return undefined;
  if (typeof payment.pixAmountCents === "number") return payment.pixAmountCents;
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
  if (linkedCents === undefined || linkedCents !== amountCents) return false;
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

/** Evita que sync do Firestore (ex.: PIX salvo antes) sobrescreva link de cartão já regenerado. */
export function mergeBudgetPaymentSnapshot(
  prev: BudgetPayment | undefined,
  remote: BudgetPayment,
  liveAmountCents: number,
  shipping: number
): BudgetPayment {
  if (remote.status === "paid") return remote;
  if (!prev) return remote;

  const remoteCardCurrent = isCardPaymentLinkCurrent(remote, liveAmountCents, shipping);
  const prevCardCurrent = isCardPaymentLinkCurrent(prev, liveAmountCents, shipping);
  const remotePixCurrent = isPixStillValid(remote, liveAmountCents);
  const prevPixCurrent = isPixStillValid(prev, liveAmountCents);

  const usePrevCard = prevCardCurrent && !remoteCardCurrent;
  const usePrevPix = prevPixCurrent && !remotePixCurrent;

  return {
    ...remote,
    paymentLinkUrl: usePrevCard
      ? prev.paymentLinkUrl
      : remoteCardCurrent
        ? remote.paymentLinkUrl
        : prev.paymentLinkUrl || remote.paymentLinkUrl,
    pagarmePaymentLinkId: usePrevCard
      ? prev.pagarmePaymentLinkId
      : remoteCardCurrent
        ? remote.pagarmePaymentLinkId
        : prev.pagarmePaymentLinkId || remote.pagarmePaymentLinkId,
    cardLinkAmountCents: usePrevCard
      ? prev.cardLinkAmountCents
      : remoteCardCurrent
        ? remote.cardLinkAmountCents
        : prev.cardLinkAmountCents ?? remote.cardLinkAmountCents,
    pixQrCode: usePrevPix ? prev.pixQrCode : remote.pixQrCode || prev.pixQrCode,
    pixQrCodeUrl: usePrevPix ? prev.pixQrCodeUrl : remote.pixQrCodeUrl || prev.pixQrCodeUrl,
    pixExpiresAt: usePrevPix ? prev.pixExpiresAt : remote.pixExpiresAt || prev.pixExpiresAt,
    pagarmeOrderId: usePrevPix ? prev.pagarmeOrderId : remote.pagarmeOrderId || prev.pagarmeOrderId,
    pagarmeChargeId: usePrevPix ? prev.pagarmeChargeId : remote.pagarmeChargeId || prev.pagarmeChargeId,
    pixAmountCents: usePrevPix
      ? prev.pixAmountCents
      : remotePixCurrent
        ? remote.pixAmountCents
        : prev.pixAmountCents ?? remote.pixAmountCents,
    amountCents: liveAmountCents,
    publicToken: remote.publicToken || prev.publicToken,
    status:
      remote.status === "paid"
        ? "paid"
        : prev.status === "paid"
          ? "paid"
          : remote.status === "pending"
            ? "pending"
            : prev.status,
  };
}
