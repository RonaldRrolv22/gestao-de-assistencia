/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KanbanColumnId, MaintenanceRequest } from "../types";
import { canReleaseEquipment } from "../services/userRoles";
import { canMoveToMaintenance, getMoveToMaintenanceBlockReason } from "./maintenanceAccess";

type MoveContext = Pick<
  MaintenanceRequest,
  "columnId" | "budget" | "budgetPayment" | "shippingLabel" | "rat"
>;

/** Verifica se o card pode ser movido da coluna atual para a coluna alvo. */
export function canMoveKanbanCard(
  from: KanbanColumnId,
  to: KanbanColumnId,
  request?: MoveContext,
  profile?: string
): boolean {
  if (from === to) return false;
  if (from === "manutencao" && to === "liberado") {
    return getMoveToLiberadoBlockReason(from, to, request, profile) === null;
  }
  if (from === "manutencao") return false;
  if (to === "manutencao") {
    if (!request) return false;
    return canMoveToMaintenance(request);
  }
  return true;
}

export function getMoveToLiberadoBlockReason(
  from: KanbanColumnId,
  to: KanbanColumnId,
  request?: MoveContext,
  profile?: string
): string | null {
  if (from !== "manutencao" || to !== "liberado") return null;

  if (request?.rat?.status !== "Finalizado") {
    return "Finalize a RAT antes de liberar o equipamento.";
  }

  if (profile && !canReleaseEquipment(profile)) {
    return "Somente Administradores podem liberar equipamentos.";
  }

  return null;
}

export function getKanbanMoveBlockReason(
  from: KanbanColumnId,
  to: KanbanColumnId,
  request?: MoveContext,
  profile?: string
): string | null {
  if (from === to) return null;

  if (to === "manutencao" && request) {
    return getMoveToMaintenanceBlockReason(request);
  }

  const liberadoReason = getMoveToLiberadoBlockReason(from, to, request, profile);
  if (liberadoReason) return liberadoReason;

  if (from === "manutencao" && to !== "liberado") {
    return "Ordens em Manutenção só podem ser movidas para Liberado.";
  }

  return null;
}
