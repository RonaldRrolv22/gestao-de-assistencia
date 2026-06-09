/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Unsubscribe,
  query,
  where,
  getDocs,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  User,
  Client,
  ProductCatalog,
  ServiceCatalog,
  TechnicalProduct,
  MaintenanceRequest,
  AppNotification,
} from "../types";
import {
  sanitizeRequestDocId,
  buildRequestDisplayId,
  formatRequestNumber,
} from "./requestIds";

/** Firestore rejeita valores `undefined` em qualquer nível do objeto. */
function stripUndefinedDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const COLLECTIONS = {
  users: "users",
  clients: "clients",
  products: "products",
  services: "services",
  technicalProducts: "technical_products",
  requests: "maintenance_requests",
  notifications: "notifications",
} as const;

function mapSnapshot<T extends { id: string }>(
  snap: { id: string; data: () => Record<string, unknown> }
): T {
  return { id: snap.id, ...snap.data() } as T;
}

export function subscribeToUsers(callback: (users: User[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COLLECTIONS.users), (snapshot) => {
    callback(snapshot.docs.map((d) => mapSnapshot<User>(d)));
  });
}

export function subscribeToClients(callback: (clients: Client[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COLLECTIONS.clients), (snapshot) => {
    callback(snapshot.docs.map((d) => mapSnapshot<Client>(d)));
  });
}

export function subscribeToProducts(callback: (products: ProductCatalog[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COLLECTIONS.products), (snapshot) => {
    callback(snapshot.docs.map((d) => mapSnapshot<ProductCatalog>(d)));
  });
}

export function subscribeToServices(callback: (services: ServiceCatalog[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COLLECTIONS.services), (snapshot) => {
    callback(snapshot.docs.map((d) => mapSnapshot<ServiceCatalog>(d)));
  });
}

export function subscribeToTechnicalProducts(
  callback: (products: TechnicalProduct[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, COLLECTIONS.technicalProducts), (snapshot) => {
    callback(snapshot.docs.map((d) => mapSnapshot<TechnicalProduct>(d)));
  });
}

export function subscribeToRequests(
  callback: (requests: MaintenanceRequest[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, COLLECTIONS.requests), (snapshot) => {
    const requests = snapshot.docs.map((d) => {
      const data = d.data() as MaintenanceRequest;
      return { ...data, id: data.id || d.id };
    });
    callback(requests);
  });
}

export function subscribeToNotifications(
  callback: (notifications: AppNotification[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, COLLECTIONS.notifications), (snapshot) => {
    const notifications = snapshot.docs
      .map((d) => mapSnapshot<AppNotification>(d))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(notifications);
  });
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.notifications, notificationId), {
    readBy: arrayUnion(userId),
  });
}

export async function markAllNotificationsRead(
  notificationIds: string[],
  userId: string
): Promise<void> {
  await Promise.all(notificationIds.map((id) => markNotificationRead(id, userId)));
}

async function reserveNextRequestNumber(): Promise<number> {
  const counterRef = doc(db, "metadata", "counters");
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const next = snap.exists() ? (snap.data().nextRequestNumber as number) : 1;
    transaction.set(
      counterRef,
      { nextRequestNumber: next + 1, lastUpdated: serverTimestamp() },
      { merge: true }
    );
    return next;
  });
}

async function countSameDayRequests(openingDate: string): Promise<number> {
  const q = query(
    collection(db, COLLECTIONS.requests),
    where("openingDate", "==", openingDate)
  );
  const snap = await getDocs(q);
  return snap.size;
}

export async function createMaintenanceRequest(
  data: Omit<MaintenanceRequest, "id" | "requestNumber" | "movementHistory">,
  movementLog: MaintenanceRequest["movementHistory"][0]
): Promise<MaintenanceRequest> {
  const openingDate = data.openingDate || new Date().toISOString().split("T")[0];
  const [seq, dayCount] = await Promise.all([
    reserveNextRequestNumber(),
    countSameDayRequests(openingDate),
  ]);

  const displayId = buildRequestDisplayId(openingDate, dayCount + 1);
  const docId = sanitizeRequestDocId(displayId);

  const request: MaintenanceRequest = {
    ...data,
    id: displayId,
    requestNumber: formatRequestNumber(seq),
    openingDate,
    movementHistory: [movementLog],
  };

  await setDoc(doc(db, COLLECTIONS.requests, docId), {
    ...request,
    updatedAt: serverTimestamp(),
  });

  return request;
}

export async function updateMaintenanceRequest(request: MaintenanceRequest): Promise<void> {
  const docId = sanitizeRequestDocId(request.id);
  await updateDoc(doc(db, COLLECTIONS.requests, docId), {
    ...request,
    updatedAt: serverTimestamp(),
  });
}

/** Atualiza somente o orçamento — preserva budgetPayment e demais campos no Firestore. */
export async function updateMaintenanceRequestBudget(
  requestId: string,
  budget: MaintenanceRequest["budget"]
): Promise<void> {
  const docId = sanitizeRequestDocId(requestId);
  const cleanBudget = stripUndefinedDeep(budget);
  try {
    await updateDoc(doc(db, COLLECTIONS.requests, docId), {
      budget: cleanBudget,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    throw err;
  }
}

export async function deleteMaintenanceRequest(displayId: string): Promise<void> {
  const docId = sanitizeRequestDocId(displayId);
  await deleteDoc(doc(db, COLLECTIONS.requests, docId));
}

export async function createClient(client: Client): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.clients, client.id), client);
}

export async function updateClient(client: Client): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.clients, client.id), { ...client });
}

export async function deleteClient(clientId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.clients, clientId));
}

export async function createProduct(product: ProductCatalog): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.products, product.id), product);
}

export async function updateProduct(product: ProductCatalog): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.products, product.id), { ...product });
}

export async function deleteProduct(productId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.products, productId));
}

export async function createService(service: ServiceCatalog): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.services, service.id), service);
}

export async function updateService(service: ServiceCatalog): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.services, service.id), { ...service });
}

export async function deleteService(serviceId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.services, serviceId));
}

export async function createTechnicalProduct(product: TechnicalProduct): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.technicalProducts, product.id), product);
}

export async function updateTechnicalProduct(product: TechnicalProduct): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.technicalProducts, product.id), { ...product });
}

export async function deleteTechnicalProduct(productId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.technicalProducts, productId));
}

export async function updateUserProfile(user: User): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.users, user.id), {
    name: user.name,
    email: user.email,
    profile: user.profile,
  });
}

export async function updateAdminUserViaApi(
  uid: string,
  payload: { name: string; email: string; profile: string; password?: string }
): Promise<User> {
  const token = await import("./authService").then((m) => m.getAuthToken());
  if (!token) throw new Error("Não autenticado.");

  const res = await fetch(`/api/admin/users/${uid}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Erro ao atualizar usuário.");
  }

  return res.json();
}

export async function createAdminUserViaApi(
  payload: { name: string; email: string; profile: string; password: string }
): Promise<User> {
  const token = await import("./authService").then((m) => m.getAuthToken());
  if (!token) throw new Error("Não autenticado.");

  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Erro ao criar usuário.");
  }

  return res.json();
}

export async function deleteAdminUserViaApi(uid: string): Promise<void> {
  const token = await import("./authService").then((m) => m.getAuthToken());
  if (!token) throw new Error("Não autenticado.");

  const res = await fetch(`/api/admin/users/${uid}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Erro ao excluir usuário.");
  }
}
