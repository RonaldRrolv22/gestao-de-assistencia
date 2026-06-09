/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAuthToken } from "./authService";

export async function openHubTestes(): Promise<void> {
  const token = await getAuthToken();
  // #region agent log
  fetch('http://127.0.0.1:7942/ingest/8708ad6b-cc5a-43ff-b2a2-d4996d444d0d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8ececf'},body:JSON.stringify({sessionId:'8ececf',location:'hubTestesApi.ts:openHubTestes',message:'hub open start',data:{hasToken:Boolean(token),host:window.location.host},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  if (!token) throw new Error("Não autenticado.");

  const res = await fetch("/api/hub-entry-url", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));

  // #region agent log
  fetch('http://127.0.0.1:7942/ingest/8708ad6b-cc5a-43ff-b2a2-d4996d444d0d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8ececf'},body:JSON.stringify({sessionId:'8ececf',location:'hubTestesApi.ts:openHubTestes',message:'hub API response',data:{status:res.status,ok:res.ok,error:data.error,message:data.message,hasUrl:Boolean(data.url),debug:data._debug},timestamp:Date.now(),hypothesisId:'H1-H2-H3'})}).catch(()=>{});
  // #endregion

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
