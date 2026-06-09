/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductCatalog } from "../types";
import { getAdminDb } from "./firebaseAdmin";
import {
  CatalogSyncSummary,
  fetchAllCatalogProductsFromSheets,
} from "./googleSheetsCatalog";

const PRODUCTS_COLLECTION = "products";

export async function syncCatalogToFirestore(): Promise<CatalogSyncSummary> {
  const syncedAt = new Date().toISOString();
  const errors: string[] = [];
  let sheetProducts: ProductCatalog[] = [];

  try {
    sheetProducts = await fetchAllCatalogProductsFromSheets();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao ler planilha.";
    throw new Error(message);
  }

  const db = getAdminDb();
  const existingSnap = await db.collection(PRODUCTS_COLLECTION).get();
  const existingById = new Map<string, ProductCatalog & { sheetTab?: string }>();
  const sheetSourcedIds = new Set<string>();

  for (const doc of existingSnap.docs) {
    existingById.set(doc.id, doc.data() as ProductCatalog);
  }

  let imported = 0;
  let updated = 0;
  const batchSize = 400;
  let batch = db.batch();
  let batchCount = 0;

  const commitBatch = async () => {
    if (batchCount === 0) return;
    await batch.commit();
    batch = db.batch();
    batchCount = 0;
  };

  for (const product of sheetProducts) {
    sheetSourcedIds.add(product.id);
    const existing = existingById.get(product.id);

    if (!existing) {
      imported++;
    } else if (
      existing.baseValue !== product.baseValue ||
      existing.description !== product.description ||
      existing.code !== product.code
    ) {
      updated++;
    }

    batch.set(db.collection(PRODUCTS_COLLECTION).doc(product.id), product, { merge: true });
    batchCount++;

    if (batchCount >= batchSize) {
      await commitBatch();
    }
  }

  await commitBatch();

  let removed = 0;
  batch = db.batch();
  batchCount = 0;

  for (const doc of existingSnap.docs) {
    const data = doc.data() as ProductCatalog;
    if (data.sheetTab && !sheetSourcedIds.has(doc.id)) {
      batch.delete(doc.ref);
      removed++;
      batchCount++;
      if (batchCount >= batchSize) {
        await commitBatch();
      }
    }
  }

  await commitBatch();

  return {
    imported,
    updated,
    removed,
    total: sheetProducts.length,
    syncedAt,
    errors,
  };
}
