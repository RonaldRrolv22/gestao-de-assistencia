/**
 * Valida fluxo automático: status polling, movimentação para manutenção e notificação.
 */
import "dotenv/config";
import { getAdminDb } from "../src/lib/firebaseAdmin";
import { MaintenanceRequest } from "../src/types";

async function main() {
  const db = getAdminDb();

  const snap = await db.collection("maintenance_requests").get();
  const all = snap.docs.map((d) => ({ docId: d.id, ...(d.data() as MaintenanceRequest) }));

  const pending = all.filter(
    (r) =>
      r.columnId === "orcamento" &&
      r.budgetPayment?.status === "pending" &&
      !r.budget?.isWarranty
  );

  const inManutencao = all.filter((r) => r.columnId === "manutencao");
  const paid = all.filter((r) => r.budgetPayment?.status === "paid");

  console.log("=== Estado atual ===");
  console.log("Pendentes (orcamento):", pending.length);
  pending.forEach((r) =>
    console.log(`  ${r.id} | method=${r.budgetPayment?.method} | order=${r.budgetPayment?.pagarmeOrderId}`)
  );
  console.log("Em manutenção:", inManutencao.length);
  console.log("Pagos:", paid.length);

  const notifSnap = await db.collection("notifications").get();
  const notifs = notifSnap.docs
    .map((d) => d.data())
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 5);
  console.log("\n=== Últimas notificações ===");
  if (notifs.length === 0) {
    console.log("(nenhuma)");
  } else {
    notifs.forEach((n) => {
      console.log(`  ${n.title} | ${n.requestId} | ${n.createdAt}`);
    });
  }

  if (pending.length === 0) {
    console.log("\nNenhuma O.S. pendente para testar polling.");
    return;
  }

  const reqId = pending[0].id;
  console.log(`\n=== Simulando polling: GET /api/pagarme/status/${reqId} ===`);

  const before = pending[0];
  const res = await fetch(`http://localhost:3000/api/pagarme/status/${encodeURIComponent(reqId)}`);
  const body = await res.json();
  console.log("HTTP", res.status, "| paid:", body.paid, "| status:", body.status);

  const docId = snap.docs.find((d) => (d.data() as MaintenanceRequest).id === reqId)?.id;
  const afterSnap = docId
    ? await db.collection("maintenance_requests").doc(docId).get()
    : null;

  if (afterSnap?.exists) {
    const after = afterSnap.data() as MaintenanceRequest;
    console.log("\n=== Após verificação ===");
    console.log("columnId:", before.columnId, "->", after.columnId);
    console.log("budget.isApproved:", before.budget?.isApproved, "->", after.budget?.isApproved);
    console.log("budgetPayment.status:", before.budgetPayment?.status, "->", after.budgetPayment?.status);

    if (body.paid && after.columnId === "manutencao") {
      console.log("\n✓ SUCESSO: O.S. movida para Em Manutenção automaticamente.");
    } else if (!body.paid) {
      console.log("\n○ Pagamento ainda pendente na Pagar.me (aguardando cliente pagar).");
    } else {
      console.log("\n✗ FALHA: paid=true mas columnId não é manutencao.");
    }
  }

  const newNotifs = await db
    .collection("notifications")
    .where("requestId", "==", reqId)
    .get();
  console.log("\nNotificações para esta O.S.:", newNotifs.size);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
