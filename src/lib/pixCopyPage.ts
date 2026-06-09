/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPixCopyPageHtml(pixCode: string): string {
  const safeCodeJson = JSON.stringify(pixCode);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PIX — Código copiado</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 32px 16px; background: #ecfdf5; color: #0f172a; }
    .card { max-width: 420px; margin: 0 auto; background: #fff; border: 1px solid #6ee7b7; border-radius: 16px; padding: 28px 24px; box-shadow: 0 8px 24px rgba(5, 150, 105, 0.12); text-align: center; }
    h1 { font-size: 22px; margin: 0 0 8px; color: #047857; }
    p { margin: 0 0 16px; font-size: 14px; color: #475569; line-height: 1.5; }
    textarea { width: 100%; box-sizing: border-box; min-height: 96px; font-family: monospace; font-size: 11px; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px; resize: vertical; color: #0f172a; background: #f8fafc; }
    .hint { font-size: 12px; color: #64748b; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1 id="status">Copiando código PIX…</h1>
    <p id="subtitle">Aguarde um instante.</p>
    <textarea id="pix-code" readonly aria-label="Código PIX copia e cola">${escapeHtml(pixCode)}</textarea>
    <p class="hint">Se não copiar automaticamente, selecione o código acima e copie manualmente no app do seu banco.</p>
  </div>
  <script>
    (function () {
      var code = ${safeCodeJson};
      var status = document.getElementById("status");
      var subtitle = document.getElementById("subtitle");
      var field = document.getElementById("pix-code");
      function showCopied() {
        status.textContent = "Código copiado!";
        subtitle.textContent = "Cole no app do seu banco para concluir o pagamento via PIX.";
      }
      function showManual() {
        status.textContent = "Copie o código PIX";
        subtitle.textContent = "Selecione o código abaixo e copie no app do seu banco.";
        field.focus();
        field.select();
      }
      function legacyCopy() {
        field.focus();
        field.select();
        try {
          if (document.execCommand("copy")) {
            showCopied();
            return;
          }
        } catch (e) {}
        showManual();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(showCopied).catch(legacyCopy);
      } else {
        legacyCopy();
      }
    })();
  </script>
</body>
</html>`;
}

export function buildPixCopyErrorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PIX indisponível</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 32px 16px; background: #fef2f2; color: #0f172a; }
    .card { max-width: 420px; margin: 0 auto; background: #fff; border: 1px solid #fecaca; border-radius: 16px; padding: 28px 24px; text-align: center; }
    h1 { font-size: 20px; margin: 0 0 12px; color: #b91c1c; }
    p { margin: 0; font-size: 14px; color: #475569; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h1>PIX indisponível</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}

export function pixCopyUrlForEmail(publicToken: string, appUrl?: string): string {
  const base = (appUrl || process.env.APP_URL || "https://gestao-de-assistencia.vercel.app").replace(/\/$/, "");
  return `${base}/copiar-pix/${encodeURIComponent(publicToken)}`;
}
