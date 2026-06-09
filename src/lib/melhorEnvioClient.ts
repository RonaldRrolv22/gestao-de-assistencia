/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DEFAULT_BASE_URL = "https://melhorenvio.com.br";
const DEFAULT_AUTH_BASE = "https://auth.melhorenvio.com.br";
const DEFAULT_USER_AGENT = "SYS-TECH Manutencao (contato@systech.com.br)";
const DEFAULT_SCOPE = "shipping-calculate";

let cachedToken: { value: string; expiresAt: number } | null = null;

export function getMelhorEnvioBaseUrl(): string {
  return process.env.MELHOR_ENVIO_BASE_URL || DEFAULT_BASE_URL;
}

export function getMelhorEnvioAuthBase(): string {
  return process.env.MELHOR_ENVIO_AUTH_BASE || DEFAULT_AUTH_BASE;
}

export function getMelhorEnvioUserAgent(): string {
  return process.env.MELHOR_ENVIO_USER_AGENT || DEFAULT_USER_AGENT;
}

function getClientId(): string | undefined {
  return process.env.MELHOR_ENVIO_CLIENT_ID;
}

function getClientSecret(): string | undefined {
  return process.env.MELHOR_ENVIO_CLIENT_SECRET || process.env.frete;
}

function getDirectAccessToken(): string | undefined {
  const token = process.env.MELHOR_ENVIO_ACCESS_TOKEN || process.env.frete;
  if (token?.startsWith("eyJ")) return token;
  return undefined;
}

export function isLikelyJwtAccessToken(token: string | undefined): boolean {
  return Boolean(token?.startsWith("eyJ"));
}

export function buildMelhorEnvioAuthUrl(redirectUri: string, state = "setup"): string {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error("MELHOR_ENVIO_CLIENT_ID não configurado.");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: process.env.MELHOR_ENVIO_SCOPE || DEFAULT_SCOPE,
    state,
  });
  return `${getMelhorEnvioAuthBase()}/oauth/authorize?${params.toString()}`;
}

export async function exchangeMelhorEnvioCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("MELHOR_ENVIO_CLIENT_ID e MELHOR_ENVIO_CLIENT_SECRET são obrigatórios.");
  }

  const response = await fetch(`${getMelhorEnvioBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": getMelhorEnvioUserAgent(),
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: Number(clientId),
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    const message =
      data && typeof data.message === "string"
        ? data.message
        : `Falha ao trocar código OAuth (${response.status}).`;
    throw new Error(message);
  }

  if (!data || typeof data.access_token !== "string" || typeof data.refresh_token !== "string") {
    throw new Error("Resposta OAuth inválida do Melhor Envio.");
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: typeof data.expires_in === "number" ? data.expires_in : 2592000,
  };
}

async function refreshAccessToken(): Promise<string> {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const refreshToken = process.env.MELHOR_ENVIO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Credenciais OAuth incompletas. Configure MELHOR_ENVIO_CLIENT_ID, MELHOR_ENVIO_CLIENT_SECRET e MELHOR_ENVIO_REFRESH_TOKEN, " +
        "ou defina MELHOR_ENVIO_ACCESS_TOKEN com um JWT válido (eyJ...). " +
        "A chave em 'frete' parece ser client_secret, não access_token."
    );
  }

  const response = await fetch(`${getMelhorEnvioBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": getMelhorEnvioUserAgent(),
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: Number(clientId),
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    const message =
      data && typeof data.message === "string"
        ? data.message
        : `Falha ao renovar token OAuth (${response.status}).`;
    throw new Error(message);
  }

  if (!data || typeof data.access_token !== "string") {
    throw new Error("Resposta de renovação OAuth inválida.");
  }

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 2592000;
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  if (typeof data.refresh_token === "string") {
    process.env.MELHOR_ENVIO_REFRESH_TOKEN = data.refresh_token;
  }

  return cachedToken.value;
}

export async function getMelhorEnvioAccessToken(): Promise<string> {
  const direct = getDirectAccessToken();
  if (direct) return direct;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  return refreshAccessToken();
}

export async function calculateMelhorEnvioShipping(
  cepOrigem: string,
  cepDestino: string
): Promise<unknown> {
  const token = await getMelhorEnvioAccessToken();
  const response = await fetch(`${getMelhorEnvioBaseUrl()}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": getMelhorEnvioUserAgent(),
    },
    body: JSON.stringify({
      from: { postal_code: cepOrigem },
      to: { postal_code: cepDestino },
      volumes: [{ height: 9, width: 20, length: 28, weight: 0.8 }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const err = new Error(`Erro na API do Melhor Envio: Code ${response.status}`) as Error & {
      status: number;
      detail: string;
    };
    err.status = response.status;
    err.detail = errorText;
    throw err;
  }

  return response.json();
}
