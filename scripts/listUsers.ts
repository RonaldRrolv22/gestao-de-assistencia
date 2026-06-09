/**
 * Lista usuários no Firestore e Firebase Auth.
 */
import "dotenv/config";
import { getAdminAuth, getAdminDb } from "../src/lib/firebaseAdmin";

const auth = getAdminAuth();
const db = getAdminDb();

console.log("=== Firestore users ===");
const fsSnap = await db.collection("users").get();
for (const doc of fsSnap.docs) {
  const d = doc.data();
  console.log(`  docId=${doc.id} | email=${d.email} | name=${d.name} | profile=${d.profile}`);
}

console.log("\n=== Firebase Auth users ===");
let pageToken: string | undefined;
do {
  const result = await auth.listUsers(1000, pageToken);
  for (const u of result.users) {
    console.log(`  uid=${u.uid} | email=${u.email} | name=${u.displayName}`);
  }
  pageToken = result.pageToken;
} while (pageToken);
