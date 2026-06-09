/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAuthToken } from "./authService";

export interface CatalogSyncResult {
  imported: number;
  updated: number;
  removed: number;
  total: number;
  syncedAt: string;
  errors: string[];
}

export async function syncCatalogFromSheets(): Promise<CatalogSyncResult> {
  const token = await getAuthToken();
  if (!token) throw new Error("Não autenticado.");

  const res = await fetch("/api/catalog/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Erro ao sincronizar catálogo com a planilha.");
  }

  return res.json();
}
