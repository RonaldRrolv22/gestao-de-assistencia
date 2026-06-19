/**
 * Remove todos os registros do Firestore e Storage, exceto usuários.
 * Uso: npm run cleanup-all-data
 */
import "dotenv/config";
import { getAdminDb, getAdminStorage } from "../src/lib/firebaseAdmin";

const COLLECTIONS_TO_CLEAR = [
  "maintenance_requests",
  "clients",
  "products",
  "services",
  "technical_products",
  "notifications",
  "payment_tokens",
] as const;

const BATCH_SIZE = 500;

async function deleteCollection(collectionName: string): Promise<number> {
  const db = getAdminDb();
  const snap = await db.collection(collectionName).get();
  if (snap.empty) return 0;

  let deleted = 0;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = snap.docs.slice(i, i + BATCH_SIZE);
    chunk.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

async function resetRequestCounter(): Promise<void> {
  const db = getAdminDb();
  await db.collection("metadata").doc("counters").set({
    nextRequestNumber: 1,
    lastUpdated: new Date().toISOString(),
  });
}

async function clearMaintenanceStorage(): Promise<number> {
  const bucket = getAdminStorage().bucket();
  const [files] = await bucket.getFiles({ prefix: "maintenance_requests/" });
  if (files.length === 0) return 0;

  await bucket.deleteFiles({ prefix: "maintenance_requests/" });
  return files.length;
}

async function main() {
  console.log("Limpando todos os dados (mantendo apenas usuários)...\n");

  const usersSnap = await getAdminDb().collection("users").get();
  console.log(`Usuários preservados: ${usersSnap.size}\n`);

  for (const name of COLLECTIONS_TO_CLEAR) {
    const count = await deleteCollection(name);
    console.log(`  ${name}: ${count} documento(s) removido(s)`);
  }

  await resetRequestCounter();
  console.log("  metadata/counters: reiniciado (próxima O.S. = #0001)");

  try {
    const fileCount = await clearMaintenanceStorage();
    console.log(`  Storage maintenance_requests/: ${fileCount} arquivo(s) removido(s)`);
  } catch (err) {
    console.warn("  Storage: não foi possível limpar anexos:", err instanceof Error ? err.message : err);
  }

  console.log("\nLimpeza concluída. O sistema está sem registros operacionais.");
}

main().catch((err) => {
  console.error("Erro na limpeza:", err);
  process.exit(1);
});
