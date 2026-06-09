/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceRequest } from "../types";
import { getRemainingDaysForMaintenance as getSlaRemainingDays } from "./maintenanceSla";

/** @deprecated Prefer getMaintenanceSlaInfo de maintenanceSla.ts */
export function getRemainingDaysForMaintenance(req: MaintenanceRequest): number {
  return getSlaRemainingDays(req);
}
