/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
import { getAdminAuth, getAdminDb } from "../src/lib/firebaseAdmin";
import { resolveProfileForEmail } from "../src/services/userRoles";

async function syncAuthUsers() {
  const auth = getAdminAuth();
  const db = getAdminDb();

  console.log("Sincronizando usuários do Firebase Auth → Firestore...\n");

  let pageToken: string | undefined;
  let total = 0;

  do {
    const result = await auth.listUsers(1000, pageToken);

    for (const user of result.users) {
      const email = (user.email || "").trim().toLowerCase();
      if (!email) {
        console.log(`  Ignorado (sem e-mail): uid=${user.uid}`);
        continue;
      }

      const profile = resolveProfileForEmail(email);
      const name =
        user.displayName?.trim() ||
        email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      const existingSnap = await db.collection("users").doc(user.uid).get();
      const existingProfile = existingSnap.exists ? existingSnap.data()?.profile : null;

      let finalProfile = profile;
      if (existingProfile === "Administrador" || existingProfile === "Técnico") {
        if (profile === "Administrador") {
          finalProfile = "Administrador";
        } else {
          finalProfile = existingProfile as typeof profile;
        }
      }

      await db.collection("users").doc(user.uid).set(
        {
          name,
          email,
          profile: finalProfile,
          syncedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      console.log(`  ${email} → ${finalProfile} (${user.uid})`);
      total += 1;
    }

    pageToken = result.pageToken;
  } while (pageToken);

  console.log(`\nSincronização concluída: ${total} usuário(s).`);
}

syncAuthUsers().catch((err) => {
  console.error("Erro na sincronização:", err);
  process.exit(1);
});
