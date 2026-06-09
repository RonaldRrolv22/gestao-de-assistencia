/**
 * Remove clientes e ordens de serviço de demonstração do Firestore.
 * Uso: npm run cleanup-demo
 */
import "dotenv/config";
import { getAdminDb } from "../src/lib/firebaseAdmin";

const DEMO_CLIENT_IDS = ["cli-1", "cli-2", "cli-3"];

function matchesDemoClient(name: string, company?: string): boolean {
  const n = (name || "").trim().toLowerCase();
  const c = (company || "").trim().toLowerCase();
  const haystack = `${n} ${c}`;
  return (
    haystack.includes("roberto mendes") ||
    haystack.includes("patricia alencar") ||
    haystack.includes("patrícia alencar") ||
    haystack.includes("santa luzia")
  );
}

async function main() {
  const db = getAdminDb();

  console.log("Limpando dados de demonstração do Firestore...\n");

  const clientsSnap = await db.collection("clients").get();
  let deletedClients = 0;
  for (const doc of clientsSnap.docs) {
    const data = doc.data();
    const isDemo =
      DEMO_CLIENT_IDS.includes(doc.id) ||
      matchesDemoClient(String(data.name || ""), String(data.company || ""));
    if (isDemo) {
      await doc.ref.delete();
      console.log(`  Cliente removido: ${data.name} (${doc.id})`);
      deletedClients++;
    }
  }

  const requestsSnap = await db.collection("maintenance_requests").get();
  let deletedRequests = 0;
  for (const doc of requestsSnap.docs) {
    const data = doc.data();
    const isDemo =
      DEMO_CLIENT_IDS.includes(String(data.clientId || "")) ||
      matchesDemoClient(String(data.clientName || ""), String(data.clientCompany || ""));
    if (isDemo) {
      await doc.ref.delete();
      console.log(`  O.S. removida: ${data.id || doc.id} — ${data.clientName}`);
      deletedRequests++;
    }
  }

  const remainingRequests = await db.collection("maintenance_requests").get();
  const maxNum = remainingRequests.docs.reduce((max, d) => {
    const rn = String(d.data().requestNumber || "");
    const n = parseInt(rn.replace("#", ""), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);

  const nextNum = remainingRequests.empty ? 1 : maxNum + 1;

  await db.collection("metadata").doc("counters").set(
    { nextRequestNumber: nextNum, lastUpdated: new Date().toISOString() },
    { merge: true }
  );

  console.log(`\nConcluído: ${deletedClients} cliente(s) e ${deletedRequests} ordem(ns) removidos.`);
  console.log(`Próximo número de O.S.: ${nextNum}`);
}

main().catch((err) => {
  console.error("Erro na limpeza:", err);
  process.exit(1);
});
