/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const MAX_CARD_INSTALLMENTS = 10;
const MIN_CENTS_PER_INSTALLMENT = 500;

/** Taxa base (1x) repassada ao cliente no cartão — padrão 3,99%. */
function baseSurchargeRate(): number {
  const raw = process.env.CARD_SURCHARGE_1X ?? "0.0399";
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0.0399;
}

/** Acréscimo adicional por parcela extra (2x, 3x, …) — padrão 1% por parcela. */
function perInstallmentSurchargeRate(): number {
  const raw = process.env.CARD_SURCHARGE_PER_INSTALLMENT ?? "0.01";
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0.01;
}

export function surchargeRateForInstallments(installments: number): number {
  const extra = Math.max(0, installments - 1);
  return baseSurchargeRate() + extra * perInstallmentSurchargeRate();
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

/** Parcelas com acréscimo repassado ao cliente (valor total por opção de parcelamento). */
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

/** Valor máximo do link de cartão (maior total entre as parcelas disponíveis). */
export function expectedCardLinkAmountCents(pixBaseCents: number): number {
  const installments = buildCardInstallmentsWithSurcharge(pixBaseCents);
  if (installments.length === 0) return pixBaseCents;
  return Math.max(...installments.map((i) => i.total));
}

/** Todos os valores aceitáveis em confirmação de pagamento via cartão. */
export function acceptableCardPaymentCents(pixBaseCents: number): number[] {
  return buildCardInstallmentsWithSurcharge(pixBaseCents).map((i) => i.total);
}
