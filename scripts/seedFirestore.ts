/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
import {
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_SERVICES,
  INITIAL_CLIENTS,
  INITIAL_REQUESTS,
  INITIAL_TECHNICAL_PRODUCTS,
} from "../src/initialData";
import { getAdminAuth, getAdminDb } from "../src/lib/firebaseAdmin";
import { sanitizeRequestDocId } from "../src/services/requestIds";

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin123";
const USER_PASSWORD = process.env.SEED_USER_PASSWORD || "user123";

async function seedUsers() {
  const auth = getAdminAuth();
  const db = getAdminDb();

  for (const user of INITIAL_USERS) {
    const password =
      user.profile === "Administrador" ? ADMIN_PASSWORD :
      user.profile === "Técnico" ? USER_PASSWORD :
      USER_PASSWORD;
    let uid: string;

    try {
      const existing = await auth.getUserByEmail(user.email.toLowerCase());
      uid = existing.uid;
      await auth.updateUser(uid, {
        password,
        displayName: user.name,
      });
      console.log(`  Usuário já existe (senha atualizada): ${user.email} (${uid})`);
    } catch {
      const created = await auth.createUser({
        email: user.email.toLowerCase(),
        password,
        displayName: user.name,
      });
      uid = created.uid;
      console.log(`  Usuário criado: ${user.email} (${uid})`);
    }

    await db.collection("users").doc(uid).set(
      {
        name: user.name,
        email: user.email.toLowerCase(),
        profile: user.profile,
      },
      { merge: true }
    );
  }
}

async function seedCollection(
  collectionName: string,
  items: Array<{ id: string }>,
  transform?: (item: Record<string, unknown>) => Record<string, unknown>
) {
  const db = getAdminDb();
  const batch = db.batch();
  for (const item of items) {
    const data = transform ? transform(item as Record<string, unknown>) : item;
    batch.set(db.collection(collectionName).doc(item.id), data, { merge: true });
  }
  await batch.commit();
  console.log(`  ${collectionName}: ${items.length} documentos`);
}

async function seedRequests() {
  const db = getAdminDb();
  const batch = db.batch();

  for (const req of INITIAL_REQUESTS) {
    const docId = sanitizeRequestDocId(req.id);
    const cleaned = { ...req };
    if (cleaned.rat?.attachments) {
      cleaned.rat = {
        ...cleaned.rat,
        attachments: cleaned.rat.attachments.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          size: a.size,
        })),
      };
    }
    if (cleaned.paymentProof) {
      cleaned.paymentProof = {
        fileName: cleaned.paymentProof.fileName,
        paymentDate: cleaned.paymentProof.paymentDate,
      };
    }
    batch.set(db.collection("maintenance_requests").doc(docId), cleaned, { merge: true });
  }

  await batch.commit();
  console.log(`  maintenance_requests: ${INITIAL_REQUESTS.length} documentos`);

  const maxNum = INITIAL_REQUESTS.reduce((max, r) => {
    const n = parseInt(r.requestNumber.replace("#", ""), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);

  const nextNum = INITIAL_REQUESTS.length > 0 ? maxNum + 1 : 1;
  await db.collection("metadata").doc("counters").set(
    { nextRequestNumber: nextNum, lastUpdated: new Date().toISOString() },
    { merge: true }
  );
  console.log(`  metadata/counters: nextRequestNumber = ${nextNum}`);
}

async function main() {
  console.log("Iniciando seed do Firestore (manutencao-nb)...\n");

  console.log("Usuários (Auth + Firestore):");
  await seedUsers();

  console.log("\nCatálogos:");
  await seedCollection("products", INITIAL_PRODUCTS);
  await seedCollection("services", INITIAL_SERVICES);
  await seedCollection("clients", INITIAL_CLIENTS);
  await seedCollection("technical_products", INITIAL_TECHNICAL_PRODUCTS);

  console.log("\nOrdens de serviço:");
  await seedRequests();

  console.log("\nSeed concluído!");
  console.log("\nCredenciais padrão:");
  console.log(`  Admin: ronald.oliveira@neurobots.com.br / ${ADMIN_PASSWORD}`);
  console.log(`  Admin: yasmin.oliveira@neurobots.com / ${ADMIN_PASSWORD}`);
  console.log(`  Técnico: carlos.tecnico@neurobots.com / ${USER_PASSWORD}`);
}

main().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
