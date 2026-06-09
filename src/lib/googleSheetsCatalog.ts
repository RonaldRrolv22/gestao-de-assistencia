/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductCatalog } from "../types";
import { getSheetsClient, getSpreadsheetId } from "./googleSheetsClient";

export const SHEET_TABS = ["Myobots", "Exobots", "Mindbots", "Oxibots", "Eleva"] as const;
export type SheetTabName = (typeof SHEET_TABS)[number];

const DATA_START_ROW: Record<SheetTabName, number> = {
  Myobots: 6,
  Exobots: 8,
  Mindbots: 6,
  Oxibots: 6,
  Eleva: 6,
};

/** Mapeia aba da planilha → nomes de equipamentos no app (request.productName). */
export const TAB_COMPATIBLE_EQUIPMENT: Record<SheetTabName, string[]> = {
  Myobots: ["Myobots"],
  Exobots: ["Exobots", "Eletrobots Exobots"],
  Mindbots: ["Eletrobots Mindbots"],
  Oxibots: ["Oxibots"],
  Eleva: ["Eleva"],
};

export function tabToSlug(tab: string): string {
  return tab.toLowerCase().replace(/\s+/g, "-");
}

/** Converte "R$ 122,67" ou "123" para número. */
export function parseBrazilianCurrency(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

function buildProductId(code: string, tab: SheetTabName): string {
  const safeCode = code.replace(/[^\w-]/g, "").toLowerCase();
  return `prd-${safeCode}-${tabToSlug(tab)}`;
}

export function rowToProduct(
  row: string[],
  tab: SheetTabName,
  syncedAt: string
): ProductCatalog | null {
  const code = (row[0] || "").trim();
  const description = (row[1] || "").trim();
  const costValue = parseBrazilianCurrency(row[2]);
  const baseValue = parseBrazilianCurrency(row[6]);

  if (!code || baseValue === null || baseValue <= 0) return null;

  return {
    id: buildProductId(code, tab),
    code,
    description: description || code,
    baseValue,
    compatibleProducts: [...TAB_COMPATIBLE_EQUIPMENT[tab]],
    sheetTab: tab,
    sheetSyncedAt: syncedAt,
    ...(costValue !== null && costValue > 0 ? { costValue } : {}),
  };
}

export async function fetchProductsFromSheetTab(tab: SheetTabName): Promise<ProductCatalog[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const startRow = DATA_START_ROW[tab];
  const range = `'${tab}'!A${startRow}:G`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  const syncedAt = new Date().toISOString();
  const products: ProductCatalog[] = [];

  for (const row of rows) {
    const product = rowToProduct(row, tab, syncedAt);
    if (product) products.push(product);
  }

  return products;
}

export async function fetchAllCatalogProductsFromSheets(): Promise<ProductCatalog[]> {
  const all: ProductCatalog[] = [];

  for (const tab of SHEET_TABS) {
    const tabProducts = await fetchProductsFromSheetTab(tab);
    all.push(...tabProducts);
  }

  return all;
}

export interface CatalogSyncSummary {
  imported: number;
  updated: number;
  removed: number;
  total: number;
  syncedAt: string;
  errors: string[];
}
