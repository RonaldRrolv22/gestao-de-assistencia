/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";
import { MaintenanceRequest } from "../types";
import { verifyPaymentStatus } from "../services/pagarmeApi";

const POLL_INTERVAL_MS = 5000;

/**
 * Verifica pagamentos pendentes em background para mover O.S. automaticamente
 * quando o cliente paga via link público ou checkout.
 */
export function usePaymentPolling(requests: MaintenanceRequest[], enabled: boolean) {
  const requestsRef = useRef(requests);
  requestsRef.current = requests;

  useEffect(() => {
    if (!enabled) return;

    const checkPending = async () => {
      const pending = requestsRef.current.filter(
        (r) =>
          r.columnId === "orcamento" &&
          r.budgetPayment?.status === "pending" &&
          !r.budget?.isWarranty
      );

      for (const req of pending) {
        try {
          await verifyPaymentStatus(req.id);
        } catch {
        }
      }
    };

    checkPending();
    const interval = setInterval(checkPending, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled]);
}
