/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { google } from "googleapis";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function parseInlineServiceAccount(raw: string): Record<string, unknown> {
  let json = raw.trim().replace(/^["']|["']$/g, "");
  try {
    const decoded = Buffer.from(json, "base64").toString("utf8");
    JSON.parse(decoded);
    json = decoded;
  } catch {
    // valor já é JSON em texto
  }
  return JSON.parse(json) as Record<string, unknown>;
}

function loadServiceAccountJson(): Record<string, unknown> {
  const inline =
    process.env.GOOGLE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT;
  const pathEnv =
    process.env.GOOGLE_SERVICE_ACCOUNT_PATH ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (inline) {
    return parseInlineServiceAccount(inline);
  }

  if (pathEnv && existsSync(resolve(pathEnv))) {
    return JSON.parse(readFileSync(resolve(pathEnv), "utf8"));
  }

  throw new Error(
    "Credenciais Google não configuradas. Defina GOOGLE_SERVICE_ACCOUNT_PATH ou GOOGLE_SERVICE_ACCOUNT no .env " +
      "e compartilhe a planilha com o e-mail da service account."
  );
}

export function getSheetsClient() {
  const credentials = loadServiceAccountJson();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

export function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID não configurado no .env.");
  }
  return id;
}
