/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { User } from "../types";
import { normalizeUserRole, resolveProfileForEmail, shouldUpgradeToAdmin } from "./userRoles";

async function ensureUserProfile(firebaseUser: FirebaseUser): Promise<User> {
  const email = (firebaseUser.email || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Conta sem e-mail válido. Verifique o cadastro no Firebase Authentication.");
  }

  const existing = await fetchUserProfile(firebaseUser.uid);
  if (existing) {
    if (shouldUpgradeToAdmin(email, existing.profile)) {
      await updateDoc(doc(db, "users", firebaseUser.uid), { profile: "Administrador" });
      return { ...existing, profile: "Administrador" };
    }
    return existing;
  }

  const profile = resolveProfileForEmail(email);
  const name =
    firebaseUser.displayName?.trim() ||
    email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const user: User = {
    id: firebaseUser.uid,
    name,
    email,
    profile,
  };

  await setDoc(doc(db, "users", firebaseUser.uid), {
    name: user.name,
    email: user.email,
    profile: user.profile,
    createdAt: new Date().toISOString(),
    source: "auto_provision",
  });

  return user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return ensureUserProfile(credential.user);
}

export async function sendPasswordResetEmailForUser(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Informe seu e-mail para receber o link de redefinição.");
  }
  await sendPasswordResetEmail(auth, normalized);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }
    try {
      const profile = await ensureUserProfile(firebaseUser);
      callback(profile);
    } catch {
      callback(null);
    }
  });
}

export async function fetchUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: uid,
    name: data.name,
    email: data.email,
    profile: normalizeUserRole(data.profile),
  };
}

export function subscribeToUserProfile(
  uid: string,
  callback: (user: User | null) => void
): () => void {
  return onSnapshot(
    doc(db, "users", uid),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.data();
      callback({
        id: uid,
        name: data.name,
        email: data.email,
        profile: normalizeUserRole(data.profile),
      });
    },
    () => callback(null)
  );
}

export async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function verifyCurrentUserPassword(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  } catch {
    throw new Error("Senha incorreta. Tente novamente.");
  }
}
