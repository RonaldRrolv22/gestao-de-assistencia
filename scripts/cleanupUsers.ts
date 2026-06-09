/**
 * Remove usuários duplicados/órfãos do Firestore e contas extras do Firebase Auth.
 * Mantém apenas Ronald e uma conta Yasmin (yasmin.oliveira@neurobots.com).
 *
 * Uso: npx tsx scripts/cleanupUsers.ts
 */
import "dotenv/config";
import { getAdminAuth, getAdminDb } from "../src/lib/firebaseAdmin";

const KEEP_EMAILS = new Set([
  "ronald.oliveira@neurobots.com.br",
  "yasmin.oliveira@neurobots.com",
]);

const auth = getAdminAuth();
const db = getAdminDb();

async function deleteFirestoreUser(docId: string, email: string) {
  await db.collection("users").doc(docId).delete();
  console.log(`  Firestore removido: ${docId} (${email})`);
}

async function deleteAuthUser(uid: string, email: string) {
  try {
    await auth.deleteUser(uid);
    console.log(`  Auth removido: ${uid} (${email})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("user-not-found")) {
      console.log(`  Auth já ausente: ${uid} (${email})`);
    } else {
      throw err;
    }
  }
}

console.log("Limpando usuários...\n");

// 1) Firestore: manter só um doc por e-mail permitido (preferir docId = Auth uid)
const authUids = new Set<string>();
let pageToken: string | undefined;
do {
  const result = await auth.listUsers(1000, pageToken);
  for (const u of result.users) authUids.add(u.uid);
  pageToken = result.pageToken;
} while (pageToken);

const fsSnap = await db.collection("users").get();
const keptByEmail = new Map<string, string>();

for (const doc of fsSnap.docs) {
  const email = (doc.data().email || "").trim().toLowerCase();
  if (!KEEP_EMAILS.has(email)) {
    await deleteFirestoreUser(doc.id, email);
    continue;
  }

  const existingKeep = keptByEmail.get(email);
  if (!existingKeep) {
    keptByEmail.set(email, doc.id);
    continue;
  }

  // Duplicata: preferir documento cujo id coincide com uid do Auth
  const currentIsAuthUid = authUids.has(doc.id);
  const keptIsAuthUid = authUids.has(existingKeep);

  if (currentIsAuthUid && !keptIsAuthUid) {
    await deleteFirestoreUser(existingKeep, email);
    keptByEmail.set(email, doc.id);
  } else {
    await deleteFirestoreUser(doc.id, email);
  }
}

// 2) Auth: remover contas fora da lista permitida
pageToken = undefined;
do {
  const result = await auth.listUsers(1000, pageToken);
  for (const u of result.users) {
    const email = (u.email || "").trim().toLowerCase();
    if (!email || KEEP_EMAILS.has(email)) continue;
    await deleteAuthUser(u.uid, email);
    await deleteFirestoreUser(u.uid, email).catch(() => {});
  }
  pageToken = result.pageToken;
} while (pageToken);

console.log("\nUsuários restantes:");
const finalFs = await db.collection("users").get();
for (const doc of finalFs.docs) {
  const d = doc.data();
  console.log(`  ${d.email} (${doc.id}) — ${d.name}`);
}

const finalAuth = await auth.listUsers(1000);
for (const u of finalAuth.users) {
  console.log(`  Auth: ${u.email} (${u.uid})`);
}

console.log("\nLimpeza concluída.");
