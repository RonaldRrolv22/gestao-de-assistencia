/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Attachment, LaborRow, MaintenanceRequest, RatPartRow, RAT } from "../types";

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
  if (!request.rat) return request;
  return {
    ...request,
    rat: normalizeRat(request.rat),
  };
}
