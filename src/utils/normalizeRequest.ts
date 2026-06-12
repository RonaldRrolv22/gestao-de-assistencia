/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Attachment, Budget, BudgetItemProduct, BudgetItemService, LaborRow, MaintenanceRequest, RatPartRow, RAT } from "../types";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

export function normalizeBudget(budget: Budget | undefined): Budget | undefined {
  if (!budget) return undefined;

  return {
    ...budget,
    products: asArray<BudgetItemProduct>(budget.products),
    services: asArray<BudgetItemService>(budget.services),
  };
}

export function normalizeRat(rat: RAT | undefined): RAT | undefined {
  if (!rat) return undefined;

  return {
    ...rat,
    labor: asArray<LaborRow>(rat.labor),
    parts: asArray<RatPartRow>(rat.parts),
    attachments: asArray<Attachment>(rat.attachments),
    defectCauses: asStringArray(rat.defectCauses),
  };
}

export function normalizeMaintenanceRequest(request: MaintenanceRequest): MaintenanceRequest {
  const rat = request.rat ? normalizeRat(request.rat) : undefined;
  const budget = request.budget ? normalizeBudget(request.budget) : undefined;
  const solicitationAttachments = asArray<Attachment>(request.solicitationAttachments);

  if (rat === request.rat && budget === request.budget) {
    return {
      ...request,
      solicitationAttachments,
    };
  }

  return {
    ...request,
    ...(rat !== undefined ? { rat } : {}),
    ...(budget !== undefined ? { budget } : {}),
    solicitationAttachments,
  };
}
