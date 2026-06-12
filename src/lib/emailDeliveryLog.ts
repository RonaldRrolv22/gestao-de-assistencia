/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EmailDeliveryRecord,
  EmailDeliveryType,
  MaintenanceRequest,
} from "../types";
import { getAdminDb } from "./firebaseAdmin";
import { sanitizeRequestDocId } from "../services/requestIds";

const REQUESTS_COLLECTION = "maintenance_requests";

/** Remove propriedades `undefined` — Firestore Admin rejeita valores undefined em updates. */
export function sanitizeFirestoreData<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeFirestoreData(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (nested !== undefined) {
      out[key] = sanitizeFirestoreData(nested);
    }
  }
  return out as T;
}

function legacyFieldsForSuccess(
  type: EmailDeliveryType,
  sentAt: string,
  sentBy?: string
): Record<string, string> {
  switch (type) {
    case "budget":
      return { budgetEmailSentAt: sentAt, budgetEmailSentBy: sentBy || "Sistema" };
    case "rat":
      return { ratEmailSentAt: sentAt, ratEmailSentBy: sentBy || "Sistema" };
    case "maintenance_started":
      return { maintenanceStartedEmailSentAt: sentAt };
    case "equipment_received":
      return { equipmentReceivedEmailSentAt: sentAt };
    case "tracking":
      return { trackingEmailSentAt: sentAt, trackingEmailSentBy: sentBy || "Sistema" };
  }
}

export function getLatestDelivery(
  request: MaintenanceRequest,
  type: EmailDeliveryType
): EmailDeliveryRecord | undefined {
  const deliveries = request.emailDeliveries || [];
  const filtered = deliveries
    .filter((d) => d.type === type)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  return filtered[0];
}

export function hasSuccessfulDelivery(
  request: MaintenanceRequest,
  type: EmailDeliveryType
): boolean {
  const latest = getLatestDelivery(request, type);
  if (latest?.status === "sent") return true;

  switch (type) {
    case "budget":
      return Boolean(request.budgetEmailSentAt);
    case "rat":
      return Boolean(request.ratEmailSentAt);
    case "maintenance_started":
      return Boolean(request.maintenanceStartedEmailSentAt || request.paymentConfirmationEmailSentAt);
    case "equipment_received":
      return Boolean(request.equipmentReceivedEmailSentAt);
    case "tracking":
      return Boolean(request.trackingEmailSentAt);
  }
}

export async function appendEmailDelivery(
  requestId: string,
  record: EmailDeliveryRecord
): Promise<void> {
  const docId = sanitizeRequestDocId(requestId);
  const ref = getAdminDb().collection(REQUESTS_COLLECTION).doc(docId);
  const snap = await ref.get();
  const existing = (snap.data()?.emailDeliveries || []) as EmailDeliveryRecord[];
  const sanitizedRecord = sanitizeFirestoreData(record);
  const sanitizedExisting = existing.map((item) => sanitizeFirestoreData(item));
  const updated = [...sanitizedExisting, sanitizedRecord];

  const patch: Record<string, unknown> = { emailDeliveries: updated };
  if (record.status === "sent") {
    Object.assign(patch, legacyFieldsForSuccess(record.type, record.sentAt, record.sentBy));
  }

  await ref.update(sanitizeFirestoreData(patch));
}

export function createDeliveryId(): string {
  return `email-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
