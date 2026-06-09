/**
 * Reenvia e-mail de rastreio para IDs específicos (força reenvio).
 * Uso: npx tsx scripts/resendTrackingByIds.ts "RAT - 260605-01" "RAT - 260606-01"
 */

import "dotenv/config";
import { getAdminDb } from "../src/lib/firebaseAdmin";
import { triggerTrackingEmail } from "../src/lib/documentEmailService";
import { MaintenanceRequest } from "../src/types";
import { sanitizeRequestDocId } from "../src/services/requestIds";
import { buildCorreiosTrackingUrl } from "../src/lib/emailTemplates";

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error("Informe ao menos um requestId.");
  process.exit(1);
}

for (const requestId of ids) {
  const docId = sanitizeRequestDocId(requestId);
  const snap = await getAdminDb().collection("maintenance_requests").doc(docId).get();
  if (!snap.exists) {
    console.error(`Não encontrado: ${requestId}`);
    continue;
  }
  const req = { ...(snap.data() as MaintenanceRequest), id: snap.data()?.id || requestId };
  const code = req.shippingLabel?.trackingCode;
  if (!code) {
    console.error(`Sem rastreio: ${requestId}`);
    continue;
  }
  console.log(`URL: ${buildCorreiosTrackingUrl(code)}`);
  const result = await triggerTrackingEmail(requestId, "Script resendTrackingByIds", {
    allowResend: true,
    trackingCode: code,
    serviceName: req.shippingLabel?.serviceName,
    requestSnapshot: req,
  });
  console.log(`${requestId} -> status=${result.status} sentTo=${result.sentTo}`);
}
