/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

let initialized = false;

export function initFirebaseAdmin(): admin.app.App {
  if (initialized && admin.apps.length) {
    return admin.app();
  }

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountEnv) {
    let json: string;
    try {
      json = Buffer.from(serviceAccountEnv, "base64").toString("utf8");
      JSON.parse(json);
    } catch {
      json = serviceAccountEnv;
    }
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(json)),
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "manutencao-nb.firebasestorage.app",
    });
  } else if (serviceAccountPath && existsSync(resolve(serviceAccountPath))) {
    const json = readFileSync(resolve(serviceAccountPath), "utf8");
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(json)),
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "manutencao-nb.firebasestorage.app",
    });
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || "manutencao-nb",
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "manutencao-nb.firebasestorage.app",
      });
    } catch {
      throw new Error(
        "Credenciais Firebase Admin não configuradas. Defina FIREBASE_SERVICE_ACCOUNT (JSON ou base64) no .env " +
        "ou baixe a chave de service account em Firebase Console > Configurações do projeto > Contas de serviço."
      );
    }
  }

  initialized = true;
  return admin.app();
}

export function getAdminAuth() {
  return initFirebaseAdmin().auth();
}

export function getAdminDb() {
  return initFirebaseAdmin().firestore();
}

export function getAdminStorage() {
  return initFirebaseAdmin().storage();
}

export async function verifyAdminToken(
  authHeader: string | undefined
): Promise<{ uid: string; isAdmin: boolean }> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Token de autenticação ausente.");
  }
  const token = authHeader.slice(7);
  const decoded = await getAdminAuth().verifyIdToken(token);
  const profileSnap = await getAdminDb().collection("users").doc(decoded.uid).get();
  const profile = profileSnap.data()?.profile;
  return { uid: decoded.uid, isAdmin: profile === "Administrador" };
}
