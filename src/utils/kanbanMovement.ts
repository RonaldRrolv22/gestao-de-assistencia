/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KanbanColumnId, MaintenanceRequest } from "../types";
import { canMoveToMaintenance, getMoveToMaintenanceBlockReason } from "./maintenanceAccess";

type MoveContext = Pick<MaintenanceRequest, "columnId" | "budget" | "budgetPayment" | "shippingLabel">;

/** Verifica se o card pode ser movido da coluna atual para a coluna alvo. */
export function canMoveKanbanCard(
  from: KanbanColumnId,
  to: KanbanColumnId,
  request?: MoveContext
): boolean {
  if (from === to) return false;
  if (from === "manutencao") return to === "liberado";
  if (to === "manutencao") {
    if (!request) return false;
    return canMoveToMaintenance(request);
  }
  return true;
}

export function getKanbanMoveBlockReason(
  from: KanbanColumnId,
  to: KanbanColumnId,
  request?: MoveContext
): string | null {
  if (from === to) return null;

  if (to === "manutencao" && request) {
    return getMoveToMaintenanceBlockReason(request);
  }

  if (from === "manutencao" && to !== "liberado") {
    return "Ordens em Manutenção só podem ser movidas para Liberado.";
  }

  return null;
}
