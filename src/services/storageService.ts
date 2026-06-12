/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../lib/firebase";
import { sanitizeRequestDocId } from "./requestIds";
import { Attachment } from "../types";

export async function uploadSolicitationAttachment(
  requestDisplayId: string,
  attachmentId: string,
  file: File
): Promise<{ storagePath: string; downloadUrl: string }> {
  const docId = sanitizeRequestDocId(requestDisplayId);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `maintenance_requests/${docId}/solicitation/${attachmentId}/${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

export async function uploadSolicitationAttachments(
  requestDisplayId: string,
  files: File[],
  existing: Attachment[] = []
): Promise<Attachment[]> {
  const uploaded = [...existing];
  for (const file of files) {
    const attId = `sol-att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const { storagePath, downloadUrl } = await uploadSolicitationAttachment(
      requestDisplayId,
      attId,
      file
    );
    uploaded.push({
      id: attId,
      name: file.name,
      type: file.type,
      size: file.size,
      storagePath,
      downloadUrl,
    });
  }
  return uploaded;
}

export async function uploadRequestAttachment(
  requestDisplayId: string,
  attachmentId: string,
  file: File
): Promise<{ storagePath: string; downloadUrl: string }> {
  const docId = sanitizeRequestDocId(requestDisplayId);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `maintenance_requests/${docId}/attachments/${attachmentId}/${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

export async function uploadPaymentProof(
  requestDisplayId: string,
  file: File
): Promise<{ storagePath: string; downloadUrl: string }> {
  const docId = sanitizeRequestDocId(requestDisplayId);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `maintenance_requests/${docId}/payment/${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

export async function deleteStorageFile(storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch {
    // File may already be deleted
  }
}
