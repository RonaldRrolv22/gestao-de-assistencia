/**
 * Smoke test: lista O.S. em orçamento e tenta gerar PIX/cartão via API local.
 */
import "dotenv/config";
import { getAdminDb } from "../src/lib/firebaseAdmin";
import { MaintenanceRequest } from "../src/types";

async function main() {
  const db = getAdminDb();
  const snap = await db.collection("maintenance_requests").get();

  const candidates: MaintenanceRequest[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as MaintenanceRequest;
    if (
      data.columnId === "orcamento" &&
      data.budget &&
      !data.budget.isWarranty &&
      (data.budget.totalFinal ?? 0) > 0
    ) {
      candidates.push({ ...data, id: data.id || doc.id });
    }
  }

  console.log("O.S. particulares em orçamento:", candidates.length);
  for (const r of candidates.slice(0, 5)) {
    console.log(` - ${r.id} | total: R$ ${r.budget?.totalFinal} | clientId: ${r.clientId}`);
  }

  if (candidates.length === 0) {
    console.log("Nenhuma O.S. elegível para teste de pagamento.");
    return;
  }

  const reqId = candidates[0].id;
  console.log("\nTestando PIX para:", reqId);

  const pixRes = await fetch("http://localhost:3000/api/pagarme/pix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId: reqId }),
  });
  const pixBody = await pixRes.text();
  console.log("PIX status:", pixRes.status);
  console.log("PIX body:", pixBody.slice(0, 600));

  console.log("\nTestando cartão para:", reqId);
  const cardRes = await fetch("http://localhost:3000/api/pagarme/card-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId: reqId }),
  });
  const cardBody = await cardRes.text();
  console.log("CARD status:", cardRes.status);
  console.log("CARD body:", cardBody.slice(0, 600));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
