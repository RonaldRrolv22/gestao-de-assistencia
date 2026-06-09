/**
 * Simula confirmação de pagamento (mesmo fluxo de markRequestPaid) para validar
 * movimentação automática + notificação. Uso local apenas.
 */
import "dotenv/config";
import { forceConfirmPaymentForTest } from "../src/services/pagarmePaymentService";
import { getAdminDb } from "../src/lib/firebaseAdmin";

const requestId = process.argv[2] || "RAT - 260605-01";

async function main() {
  console.log("Simulando pagamento confirmado para:", requestId);
  const updated = await forceConfirmPaymentForTest(requestId);
  console.log("columnId:", updated.columnId);
  console.log("budget.isApproved:", updated.budget?.isApproved);
  console.log("budgetPayment.status:", updated.budgetPayment?.status);

  const notifs = await getAdminDb()
    .collection("notifications")
    .where("requestId", "==", requestId)
    .get();

  console.log("Notificações criadas:", notifs.size);
  notifs.docs.forEach((d) => console.log(" -", d.data().title));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
