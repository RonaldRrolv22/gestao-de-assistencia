/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceRequest } from "../types";

const KANBAN_LIBERADO_VISIBLE_DAYS = 5;

export function getReleasedAt(request: MaintenanceRequest): string | null {
  if (request.releasedDate) {
    return request.releasedDate.includes("T")
      ? request.releasedDate
      : `${request.releasedDate}T12:00:00.000Z`;
  }

  const logs = [...(request.movementHistory || [])]
    .filter((log) => log.toColumn === "liberado")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return logs[0]?.timestamp ?? null;
}

export function getDaysSinceReleased(request: MaintenanceRequest): number | null {
  const releasedAt = getReleasedAt(request);
  if (!releasedAt) return null;

  const released = new Date(releasedAt);
  const today = new Date();
  const dStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dEnd = new Date(released.getFullYear(), released.getMonth(), released.getDate());
  const diffMs = dStart.getTime() - dEnd.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getReleasedDaysRemainingInKanban(request: MaintenanceRequest): number | null {
  const daysSince = getDaysSinceReleased(request);
  if (daysSince === null) return null;
  return Math.max(0, KANBAN_LIBERADO_VISIBLE_DAYS - daysSince);
}

/** O.S. liberada visível no kanban por até 5 dias; depois permanece só no banco de dados. */
export function isLiberadoVisibleInKanban(request: MaintenanceRequest): boolean {
  if (request.columnId !== "liberado") return false;
  const daysSince = getDaysSinceReleased(request);
  if (daysSince === null) return true;
  return daysSince <= KANBAN_LIBERADO_VISIBLE_DAYS;
}

export function compareReleasedDesc(a: MaintenanceRequest, b: MaintenanceRequest): number {
  const aTime = getReleasedAt(a) ? new Date(getReleasedAt(a)!).getTime() : 0;
  const bTime = getReleasedAt(b) ? new Date(getReleasedAt(b)!).getTime() : 0;
  return bTime - aTime;
}
