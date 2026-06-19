/**
 * Restaura apenas catálogo de produtos (planilha) e serviços (seed).
 * Uso: npm run seed-catalog
 */
import "dotenv/config";
import { INITIAL_SERVICES } from "../src/initialData";
import { getAdminDb } from "../src/lib/firebaseAdmin";
import { syncCatalogToFirestore } from "../src/lib/catalogSyncService";

async function seedServices() {
  const db = getAdminDb();
  const batch = db.batch();
  for (const service of INITIAL_SERVICES) {
    batch.set(db.collection("services").doc(service.id), service, { merge: true });
  }
  await batch.commit();
  console.log(`  services: ${INITIAL_SERVICES.length} documento(s)`);
}

async function main() {
  console.log("Restaurando catálogo de produtos e serviços...\n");

  console.log("Produtos (Google Sheets):");
  const summary = await syncCatalogToFirestore();
  console.log(
    `  products: ${summary.total} total (${summary.imported} novos, ${summary.updated} atualizados, ${summary.removed} removidos)`
  );

  console.log("\nServiços:");
  await seedServices();

  console.log("\nCatálogo restaurado.");
}

main().catch((err) => {
  console.error("Erro:", err instanceof Error ? err.message : err);
  process.exit(1);
});
