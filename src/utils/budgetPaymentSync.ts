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

/** Valida se o link de cartão está sincronizado com o valor do orçamento (sem depender de frete). */
export function isCardLinkSynced(payment: BudgetPayment | undefined, amountCents: number): boolean {
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

export function isCardPaymentLinkCurrent(
  payment: BudgetPayment | undefined,
  amountCents: number,
  shipping: number
): boolean {
  if (shipping <= 0) return false;
  return isCardLinkSynced(payment, amountCents);
}

export function needsCardSync(payment: BudgetPayment | undefined, amountCents: number): boolean {
  if (payment?.status === "paid") return false;
  return !isCardLinkSynced(payment, amountCents);
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

export function needsPixSync(payment: BudgetPayment | undefined, amountCents: number): boolean {
  if (payment?.status === "paid") return false;
  return !isPixStillValid(payment, amountCents);
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

  const prevCardSynced = isCardLinkSynced(prev, liveAmountCents);
  const remoteCardSynced = isCardLinkSynced(remote, liveAmountCents);
  const prevPixCurrent = isPixStillValid(prev, liveAmountCents);
  const remotePixCurrent = isPixStillValid(remote, liveAmountCents);

  const prevHasFreshCard =
    prevCardSynced ||
    (prev.cardLinkAmountCents === liveAmountCents && !!prev.paymentLinkUrl?.trim());
  const remoteHasStaleCard =
    !remoteCardSynced &&
    (remote.cardLinkAmountCents == null || remote.cardLinkAmountCents !== liveAmountCents);

  const usePrevCard =
    (prevCardSynced && !remoteCardSynced) ||
    (prevHasFreshCard && remoteHasStaleCard);
  const usePrevPix = prevPixCurrent && !remotePixCurrent;

  return {
    ...remote,
    paymentLinkUrl: usePrevCard
      ? prev.paymentLinkUrl
      : remoteCardSynced
        ? remote.paymentLinkUrl
        : prev.paymentLinkUrl || remote.paymentLinkUrl,
    pagarmePaymentLinkId: usePrevCard
      ? prev.pagarmePaymentLinkId
      : remoteCardSynced
        ? remote.pagarmePaymentLinkId
        : prev.pagarmePaymentLinkId || remote.pagarmePaymentLinkId,
    cardLinkAmountCents: usePrevCard
      ? prev.cardLinkAmountCents
      : remoteCardSynced
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
