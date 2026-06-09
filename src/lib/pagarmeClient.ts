/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function getPagarmeConfig() {
  const secretKey = process.env.PAGARME_SECRET_KEY;
  const baseUrl = process.env.PAGARME_BASE_URL || "https://api.pagar.me/core/v5";

  if (!secretKey) {
    throw new Error("PAGARME_SECRET_KEY não configurada no .env");
  }

  return { secretKey, baseUrl };
}

function authHeader(secretKey: string): string {
  const token = Buffer.from(`${secretKey}:`).toString("base64");
  return `Basic ${token}`;
}

export async function pagarmeRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const { secretKey, baseUrl } = getPagarmeConfig();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(secretKey),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const err = data as { message?: string; errors?: Record<string, string[]> };
    const detail = err.message || JSON.stringify(err.errors || data);
    throw new Error(`Pagar.me ${response.status}: ${detail}`);
  }

  return data as T;
}
