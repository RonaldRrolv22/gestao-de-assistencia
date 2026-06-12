/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const MAX_CARD_INSTALLMENTS = 10;
const MIN_CENTS_PER_INSTALLMENT = 500;

/** Acréscimo por parcela extra (2x, 3x, …) — padrão 1% por parcela adicional. */
function perInstallmentSurchargeRate(): number {
  const raw = process.env.CARD_SURCHARGE_PER_INSTALLMENT ?? "0.01";
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0.01;
}

/** À vista (1x) = 0. A partir de 2x, repassa acréscimo ao cliente. */
export function surchargeRateForInstallments(installments: number): number {
  if (installments <= 1) return 0;
  return (installments - 1) * perInstallmentSurchargeRate();
}

export function cardTotalCentsForInstallments(pixBaseCents: number, installments: number): number {
  if (pixBaseCents <= 0) return 0;
  const rate = surchargeRateForInstallments(installments);
  return Math.ceil(pixBaseCents * (1 + rate));
}

function maxInstallmentsForAmount(amountCents: number): number {
  for (let number = MAX_CARD_INSTALLMENTS; number >= 1; number--) {
    const total = cardTotalCentsForInstallments(amountCents, number);
    if (number === 1 || Math.floor(total / number) >= MIN_CENTS_PER_INSTALLMENT) {
      return number;
    }
  }
  return 1;
}

/** Parcelas: 1x sem acréscimo; 2x+ com acréscimo progressivo. */
export function buildCardInstallmentsWithSurcharge(
  pixBaseCents: number
): { number: number; total: number }[] {
  const max = maxInstallmentsForAmount(pixBaseCents);
  const installments: { number: number; total: number }[] = [];
  for (let number = 1; number <= max; number++) {
    installments.push({ number, total: cardTotalCentsForInstallments(pixBaseCents, number) });
  }
  return installments;
}

/** Valor do carrinho no link Pagar.me (sempre o valor base, sem taxa). */
export function expectedCardLinkAmountCents(pixBaseCents: number): number {
  return pixBaseCents;
}

/** Maior total parcelado (só para aviso na UI). */
export function maxCardInstallmentTotalCents(pixBaseCents: number): number {
  const installments = buildCardInstallmentsWithSurcharge(pixBaseCents);
  if (installments.length === 0) return pixBaseCents;
  return Math.max(...installments.map((i) => i.total));
}

/** Valores aceitos na confirmação de pagamento via cartão. */
export function acceptableCardPaymentCents(pixBaseCents: number): number[] {
  return [...new Set(buildCardInstallmentsWithSurcharge(pixBaseCents).map((i) => i.total))];
}
