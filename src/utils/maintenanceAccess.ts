/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Budget, BudgetPayment, KanbanColumnId, MaintenanceRequest } from "../types";

/** Garantia com cobrança de frete ao cliente. */
export function warrantyChargesShipping(budget: Budget | undefined): boolean {
  return Boolean(budget?.isWarranty && budget.chargeShippingOnWarranty && (budget.shipping || 0) > 0);
}

/** Valor cobrável do orçamento (PIX / confirmação de pagamento). */
export function chargeableBudgetTotal(budget: Budget | undefined): number {
  if (!budget) return 0;
  if (budget.isWarranty) {
    return warrantyChargesShipping(budget) ? Math.max(0, budget.shipping || 0) : 0;
  }
  if (typeof budget.totalFinal === "number" && Number.isFinite(budget.totalFinal)) {
    return Math.max(0, budget.totalFinal);
  }
  const subtotalProducts = (budget.products || []).reduce((sum, p) => sum + (p.totalValue || 0), 0);
  const subtotalServices = (budget.services || []).reduce((sum, s) => sum + (s.totalValue || 0), 0);
  const subtotal = subtotalProducts + subtotalServices;
  return Math.max(0, subtotal + (budget.shipping || 0) - (budget.discount || 0));
}

export function isMaintenancePaymentSatisfied(
  budget: Budget | undefined,
  payment: BudgetPayment | undefined
): boolean {
  if (!budget) return false;
  if (budget.isWarranty) {
    if (warrantyChargesShipping(budget)) {
      return payment?.status === "paid";
    }
    return true;
  }
  return payment?.status === "paid";
}

export function getMaintenanceBlockReason(
  from: KanbanColumnId,
  budget: Budget | undefined,
  payment: BudgetPayment | undefined
): string | null {
  if (from !== "orcamento") {
    return "A O.S. precisa estar em Orçamento com pagamento confirmado antes de iniciar a manutenção.";
  }

  if (!budget) {
    return "Elabore e salve o orçamento antes de iniciar a manutenção.";
  }

  if (isMaintenancePaymentSatisfied(budget, payment)) {
    return null;
  }

  if (budget.isWarranty && warrantyChargesShipping(budget)) {
    return "O frete deve ser pago via PIX antes de iniciar a manutenção.";
  }

  return "Pagamento via Pagar.me necessário antes de iniciar a manutenção.";
}

export function canEnterMaintenance(
  from: KanbanColumnId,
  budget: Budget | undefined,
  payment: BudgetPayment | undefined
): boolean {
  return getMaintenanceBlockReason(from, budget, payment) === null;
}

type MoveContext = Pick<MaintenanceRequest, "columnId" | "budget" | "budgetPayment" | "shippingLabel">;

export function canMoveToMaintenance(request: MoveContext): boolean {
  if (request.shippingLabel?.trackingCode) return false;
  return canEnterMaintenance(request.columnId, request.budget, request.budgetPayment);
}

export function getMoveToMaintenanceBlockReason(request: MoveContext): string | null {
  if (request.shippingLabel?.trackingCode) {
    return `Esta ordem já possui etiqueta de envio gerada (rastreio: ${request.shippingLabel.trackingCode}). Não é possível retornar para Manutenção.`;
  }
  return getMaintenanceBlockReason(request.columnId, request.budget, request.budgetPayment);
}
