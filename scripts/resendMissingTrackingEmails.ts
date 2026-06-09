/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Reenvia e-mails de rastreio para O.S. com etiqueta gerada mas sem envio confirmado.
 * Uso: npx tsx scripts/resendMissingTrackingEmails.ts
 */

import "dotenv/config";
import { getAdminDb } from "../src/lib/firebaseAdmin";
import { triggerTrackingEmail } from "../src/lib/documentEmailService";
import { hasSuccessfulDelivery } from "../src/lib/emailDeliveryLog";
import { MaintenanceRequest } from "../src/types";

async function main() {
  const snap = await getAdminDb().collection("maintenance_requests").get();
  const pending: MaintenanceRequest[] = [];

  for (const doc of snap.docs) {
    const data = doc.data() as MaintenanceRequest;
    const request: MaintenanceRequest = { ...data, id: data.id || doc.id };
    if (!request.shippingLabel?.trackingCode) continue;
    if (hasSuccessfulDelivery(request, "tracking")) continue;
    pending.push(request);
  }

  if (pending.length === 0) {
    console.log("Nenhuma O.S. com rastreio pendente de e-mail.");
    return;
  }

  console.log(`Encontradas ${pending.length} O.S. sem e-mail de rastreio enviado:`);
  for (const req of pending) {
    console.log(`  - ${req.id} | rastreio: ${req.shippingLabel?.trackingCode} | cliente: ${req.clientEmail || "(sem e-mail)"}`);
  }

  for (const req of pending) {
    try {
      console.log(`\nEnviando rastreio para ${req.id}...`);
      const result = await triggerTrackingEmail(req.id, "Script resendMissingTrackingEmails", {
        allowResend: true,
        trackingCode: req.shippingLabel!.trackingCode,
        serviceName: req.shippingLabel!.serviceName,
        requestSnapshot: req,
      });
      console.log(`  OK: status=${result.status} sentTo=${result.sentTo}`);
    } catch (err) {
      console.error(`  ERRO em ${req.id}:`, err instanceof Error ? err.message : err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
