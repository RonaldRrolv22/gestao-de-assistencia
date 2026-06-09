/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAuthToken } from "./authService";

export async function openHubTestes(): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("Não autenticado.");

  const res = await fetch("/api/hub-entry-url", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Não foi possível abrir o Hub de Testes.");
  }

  const url = data.url as string | undefined;
  if (!url) {
    throw new Error("URL do Hub de Testes não disponível.");
  }

  const opened = window.open(url, "_blank");

  if (!opened) {
    throw new Error(
      "Não foi possível abrir nova aba. Verifique se o bloqueador de pop-ups está desativado para este site.",
    );
  }
}
