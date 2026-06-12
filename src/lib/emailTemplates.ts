/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceRequest } from "../types";
import { formatRequestDisplayId } from "../services/requestIds";
import { getRemainingDaysForMaintenance } from "../utils/maintenanceDeadline";
import { getNbCabecalhoSrcForEmail } from "./brandAssets";
import { pixCopyUrlForEmail } from "./pixCopyPage";

const CONTACT_EMAIL =
  process.env.EMAIL_REPLY_TO || process.env.SMTP_USER || "neurobots.logistic@gmail.com";

const BRAND_BLUE = "#2563EB";
const BRAND_BLUE_DARK = "#1d4ed8";
const BRAND_GREEN = "#059669";

function appUrlForEmail(): string {
  return (process.env.APP_URL || "https://gestao-de-assistencia.vercel.app").replace(/\/$/, "");
}

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailLayout(title: string, bodyHtml: string): string {
  const cabecalhoSrc = escapeHtml(getNbCabecalhoSrcForEmail());
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:0;line-height:0;">
              <img src="${cabecalhoSrc}" alt="Neurobots Assistência Técnica" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#0f172a;line-height:1.3;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;text-align:center;">
                <strong style="color:#334155;">NEUROBOTS PESQUISA E DESENVOLVIMENTO LTDA</strong><br />
                ${escapeHtml(CONTACT_EMAIL)} • (81) 98254-2262<br />
                Av. Barbosa Lima, 149 — Recife, PE
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function summaryRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;font-weight:600;vertical-align:top;">${value}</td>
  </tr>`;
}

/** Layout empilhado (rótulo acima do valor) — mais confiável em clientes de e-mail móveis. */
function summaryRowStacked(label: string, value: string): string {
  return `<tr>
    <td colspan="2" style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
      <div style="font-size:12px;color:#64748b;margin:0 0 4px;line-height:1.4;">${escapeHtml(label)}</div>
      <div style="font-size:13px;color:#0f172a;font-weight:600;line-height:1.5;">${value}</div>
    </td>
  </tr>`;
}

function escapeHref(url: string): string {
  return url.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** O.S. — orçamento e etapas antes da manutenção. */
function emailOsDisplayId(request: MaintenanceRequest): string {
  return formatRequestDisplayId(request.id, "orcamento");
}

/** RAT — após pagamento / manutenção / liberação. */
function emailRatDisplayId(request: MaintenanceRequest): string {
  return formatRequestDisplayId(request.id, "manutencao");
}

/** ID conforme a etapa atual da O.S. no kanban. */
export function emailRequestDisplayId(request: MaintenanceRequest): string {
  return formatRequestDisplayId(request.id, request.columnId);
}

function paymentOptionsBlock(request: MaintenanceRequest): string {
  const payment = request.budgetPayment;
  const budget = request.budget;
  if (!payment || budget?.isWarranty) return "";
  if ((budget.shipping || 0) <= 0) return "";

  const cardUrl = payment.paymentLinkUrl?.trim();
  const pixCode = payment.pixQrCode?.trim();
  const hasCard = !!cardUrl && cardUrl.includes("pagar.me");
  const hasPix = !!pixCode;

  if (!hasCard && !hasPix) return "";

  const totalLabel = fmt(budget.totalFinal);
  let html = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0;">
      <tr>
        <td>
          <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.05em;">
            Opções de pagamento — ${escapeHtml(totalLabel)}
          </p>
        </td>
      </tr>
    </table>`;

  if (hasCard) {
    const url = escapeHref(cardUrl!);
    html += `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px;background-color:#eff6ff;border:1px solid #93c5fd;border-radius:12px;">
      <tr>
        <td style="padding:20px;text-align:center;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;background-color:${BRAND_BLUE};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:10px;">
            Pagar com cartão de crédito
          </a>
        </td>
      </tr>
    </table>`;
  }

  if (hasPix) {
    const publicToken = payment.publicToken?.trim();
    const copyPixUrl = publicToken ? escapeHref(pixCopyUrlForEmail(publicToken, appUrlForEmail())) : null;
    html += `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background-color:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;">
      <tr>
        <td style="padding:20px;text-align:center;">
          ${
            copyPixUrl
              ? `<a href="${copyPixUrl}" style="display:inline-block;padding:14px 28px;background-color:${BRAND_GREEN};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:10px;">
            Pagar com PIX
          </a>
          <p style="margin:12px 0 0;font-size:11px;color:#64748b;line-height:1.5;">
            Clique no botão para copiar automaticamente o código PIX. Você verá a mensagem &quot;Código copiado!&quot;.
          </p>`
              : `<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#047857;text-transform:uppercase;">Pagar com PIX</p>
          <p style="margin:0 0 12px;font-size:11px;color:#64748b;line-height:1.5;">
            Copie o código PIX abaixo no app do seu banco.
          </p>`
          }
          <p style="margin:16px 0 8px;font-size:10px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:0.05em;text-align:left;">
            Código PIX (copia e cola)
          </p>
          <p style="margin:0;font-family:monospace;font-size:10px;line-height:1.5;word-break:break-all;text-align:left;background-color:#ffffff;border:1px solid #a7f3d0;border-radius:10px;padding:12px;color:#0f172a;">
            ${escapeHtml(pixCode)}
          </p>
        </td>
      </tr>
    </table>`;
  }

  return html;
}

export function buildBudgetEmailHtml(request: MaintenanceRequest): string {
  const budget = request.budget!;
  const totalLabel = budget.isWarranty
    ? "Garantia — sem custo ao cliente"
    : fmt(budget.totalFinal);

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6;">
      Olá, <strong>${escapeHtml(request.clientName)}</strong>!
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      Segue o orçamento referente à manutenção do seu equipamento. O documento completo está em anexo (PDF).
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:12px;padding:4px 20px;margin-bottom:24px;">
      ${summaryRow("O.S.", escapeHtml(emailOsDisplayId(request)))}
      ${summaryRow("Nº interno", escapeHtml(request.requestNumber))}
      ${summaryRow("Equipamento", escapeHtml(request.productName))}
      ${summaryRow("Nº de série", escapeHtml(request.serialNumber || "N/A"))}
      ${summaryRow("Valor total", escapeHtml(totalLabel))}
      ${budget.shipping && budget.shipping > 0 ? summaryRow("Frete", escapeHtml(fmt(budget.shipping) + (budget.shippingService ? ` (${budget.shippingService})` : ""))) : ""}
    </table>
    ${paymentOptionsBlock(request)}`;

  return emailLayout("Seu Orçamento de Manutenção", body);
}

export function buildRatEmailHtml(request: MaintenanceRequest): string {
  const rat = request.rat!;
  const diagnosticPreview =
    rat.diagnostic.length > 200 ? `${rat.diagnostic.slice(0, 200)}…` : rat.diagnostic;

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6;">
      Olá, <strong>${escapeHtml(request.clientName)}</strong>!
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      O relatório de assistência técnica (RAT) do seu equipamento foi concluído. O laudo completo está em anexo (PDF).
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:12px;padding:4px 20px;margin-bottom:24px;">
      ${summaryRow("RAT", escapeHtml(emailRatDisplayId(request)))}
      ${summaryRow("Nº interno", escapeHtml(request.requestNumber))}
      ${summaryRow("Equipamento", escapeHtml(request.productName))}
      ${summaryRow("Status da RAT", escapeHtml(rat.status))}
      ${rat.finalizedDate ? summaryRow("Finalizada em", escapeHtml(new Date(rat.finalizedDate).toLocaleDateString("pt-BR"))) : ""}
      ${diagnosticPreview ? summaryRow("Diagnóstico", escapeHtml(diagnosticPreview)) : ""}
    </table>
    <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6;">
      Em breve você receberá o código de rastreio para a entrega do seu equipamento.
    </p>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
      Guarde este documento para seus registros.
    </p>`;

  return emailLayout("Relatório de Assistência Técnica (RAT)", body);
}

function formatDeadlineLabel(request: MaintenanceRequest): string {
  const days = getRemainingDaysForMaintenance(request);
  if (days <= 0) return "em breve";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

export function buildMaintenanceStartedEmailHtml(request: MaintenanceRequest): string {
  const isWarranty = request.budget?.isWarranty ?? false;
  const isPaid = request.budgetPayment?.status === "paid";
  const deadlineLabel = formatDeadlineLabel(request);

  const contextLine = isWarranty
    ? "Seu orçamento em garantia foi aprovado e o reparo já foi iniciado."
    : isPaid
      ? "Confirmamos o recebimento do pagamento e o reparo já foi iniciado."
      : "Seu equipamento entrou em processo de assistência técnica.";

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6;">
      Olá, <strong>${escapeHtml(request.clientName)}</strong>!
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      ${escapeHtml(contextLine)} Um técnico da Neurobots já está cuidando do reparo do seu equipamento.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eff6ff;border-radius:12px;padding:4px 20px;margin-bottom:8px;border:1px solid #bfdbfe;">
      ${summaryRow("RAT", escapeHtml(emailRatDisplayId(request)))}
      ${summaryRow("Nº interno", escapeHtml(request.requestNumber))}
      ${summaryRow("Equipamento", escapeHtml(request.productName))}
      ${summaryRow("Status", "Em manutenção")}
      ${summaryRow("Prazo estimado", escapeHtml(deadlineLabel))}
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
      A partir desta etapa, sua ordem de serviço passa a ser identificada pelo número de RAT acima.
      Acompanhe o andamento pelos nossos canais de atendimento. Entraremos em contato caso seja necessário.
    </p>`;

  return emailLayout("Reparo em Andamento", body);
}

export function buildPaymentConfirmationEmailHtml(request: MaintenanceRequest): string {
  const totalLabel = request.budget?.isWarranty
    ? "Garantia — sem custo"
    : fmt(request.budget?.totalFinal ?? 0);

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6;">
      Olá, <strong>${escapeHtml(request.clientName)}</strong>!
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      Confirmamos o recebimento do pagamento referente à sua ordem de serviço. Seu equipamento já está em <strong>processo de assistência técnica</strong> pela nossa equipe.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eff6ff;border-radius:12px;padding:4px 20px;margin-bottom:8px;border:1px solid #bfdbfe;">
      ${summaryRow("RAT", escapeHtml(emailRatDisplayId(request)))}
      ${summaryRow("Nº interno", escapeHtml(request.requestNumber))}
      ${summaryRow("Equipamento", escapeHtml(request.productName))}
      ${summaryRow("Valor pago", escapeHtml(totalLabel))}
      ${summaryRow("Status", "Em manutenção")}
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
      Acompanhe o andamento pelos nossos canais de atendimento. Em breve entraremos em contato caso seja necessário.
    </p>`;

  return emailLayout("Pagamento Confirmado", body);
}

export function buildBudgetEmailSubject(request: MaintenanceRequest): string {
  return `Orçamento de Manutenção — ${emailOsDisplayId(request)} | Neurobots`;
}

export function buildRatEmailSubject(request: MaintenanceRequest): string {
  return `Relatório Técnico (RAT) — ${emailRatDisplayId(request)} | Neurobots`;
}

export function buildPaymentConfirmationEmailSubject(request: MaintenanceRequest): string {
  return `Pagamento confirmado — ${emailRatDisplayId(request)} | Neurobots`;
}

export function buildMaintenanceStartedEmailSubject(request: MaintenanceRequest): string {
  return `Reparo em andamento — ${emailRatDisplayId(request)} | Neurobots`;
}

function formatEquipmentReceivedDateLabel(iso?: string): string {
  if (!iso?.trim()) return "—";
  const [y, m, d] = iso.trim().split("-");
  if (y && m && d) return `${d}/${m}/${y}`;
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

export function buildEquipmentReceivedEmailSubject(request: MaintenanceRequest): string {
  return `Equipamento recebido — ${emailOsDisplayId(request)} | Neurobots`;
}

export function buildEquipmentReceivedEmailHtml(request: MaintenanceRequest): string {
  const receivedLabel = formatEquipmentReceivedDateLabel(request.equipmentReceivedDate);
  const serialLabel = request.serialNumber?.trim() || "Não informado";

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6;">
      Olá, <strong>${escapeHtml(request.clientName)}</strong>!
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      Confirmamos o recebimento do seu equipamento em nossa assistência técnica.
      Ele já está registrado em nosso sistema e seguirá para triagem e diagnóstico.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eff6ff;border-radius:12px;padding:4px 20px;margin-bottom:8px;border:1px solid #bfdbfe;">
      ${summaryRow("O.S.", escapeHtml(emailOsDisplayId(request)))}
      ${summaryRow("Nº interno", escapeHtml(request.requestNumber))}
      ${summaryRow("Equipamento", escapeHtml(request.productName))}
      ${summaryRow("Número de série", escapeHtml(serialLabel))}
      ${summaryRow("Recebido em", escapeHtml(receivedLabel))}
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
      Em breve entraremos em contato com o diagnóstico e, se necessário, o orçamento para o reparo.
      Guarde este e-mail para seus registros.
    </p>`;

  return emailLayout("Equipamento Recebido", body);
}

export function buildEquipmentReceivedEmailText(request: MaintenanceRequest): string {
  const receivedLabel = formatEquipmentReceivedDateLabel(request.equipmentReceivedDate);
  const serialLabel = request.serialNumber?.trim() || "Não informado";

  return [
    `Olá, ${request.clientName}!`,
    "",
    "Confirmamos o recebimento do seu equipamento em nossa assistência técnica.",
    "Ele já está registrado em nosso sistema e seguirá para triagem e diagnóstico.",
    "",
    `O.S.: ${emailOsDisplayId(request)}`,
    `Nº interno: ${request.requestNumber}`,
    `Equipamento: ${request.productName}`,
    `Número de série: ${serialLabel}`,
    `Recebido em: ${receivedLabel}`,
    "",
    "Em breve entraremos em contato com o diagnóstico e, se necessário, o orçamento para o reparo.",
    "Guarde este e-mail para seus registros.",
    emailTextFooter(),
  ].join("\n");
}

function emailTextFooter(): string {
  return [
    "",
    "---",
    "NEUROBOTS PESQUISA E DESENVOLVIMENTO LTDA",
    `${CONTACT_EMAIL} • (81) 98254-2262`,
    "Av. Barbosa Lima, 149 — Recife, PE",
  ].join("\n");
}

export function buildBudgetEmailText(request: MaintenanceRequest): string {
  const budget = request.budget!;
  const totalLabel = budget.isWarranty
    ? "Garantia — sem custo ao cliente"
    : fmt(budget.totalFinal);

  const paymentUrl = request.budgetPayment?.paymentLinkUrl;
  const pixCode = request.budgetPayment?.pixQrCode;

  const lines = [
    `Olá, ${request.clientName}!`,
    "",
    "Segue o orçamento referente à manutenção do seu equipamento. O documento completo está em anexo (PDF).",
    "",
    `O.S.: ${emailOsDisplayId(request)}`,
    `Nº interno: ${request.requestNumber}`,
    `Equipamento: ${request.productName}`,
    `Nº de série: ${request.serialNumber || "N/A"}`,
    `Valor total: ${totalLabel}`,
  ];

  if (budget.shipping && budget.shipping > 0) {
    lines.push(
      `Frete: ${fmt(budget.shipping)}${budget.shippingService ? ` (${budget.shippingService})` : ""}`
    );
  }

  if ((budget.shipping || 0) > 0 && !budget.isWarranty && (paymentUrl || pixCode)) {
    lines.push("", "Opções de pagamento:");
    if (paymentUrl) {
      lines.push(`Pagar com cartão: ${paymentUrl}`);
    }
    const publicToken = request.budgetPayment?.publicToken?.trim();
    if (pixCode && publicToken) {
      lines.push(`Pagar com PIX (copiar): ${pixCopyUrlForEmail(publicToken, appUrlForEmail())}`);
      lines.push(`Código PIX: ${pixCode}`);
    } else if (pixCode) {
      lines.push(`Código PIX: ${pixCode}`);
    }
  }

  lines.push(emailTextFooter());
  return lines.join("\n");
}

export function buildRatEmailText(request: MaintenanceRequest): string {
  const rat = request.rat!;
  const diagnosticPreview =
    rat.diagnostic.length > 200 ? `${rat.diagnostic.slice(0, 200)}…` : rat.diagnostic;

  const lines = [
    `Olá, ${request.clientName}!`,
    "",
    "O relatório de assistência técnica (RAT) do seu equipamento foi concluído. O laudo completo está em anexo (PDF).",
    "",
    `RAT: ${emailRatDisplayId(request)}`,
    `Nº interno: ${request.requestNumber}`,
    `Equipamento: ${request.productName}`,
    `Status da RAT: ${rat.status}`,
  ];

  if (rat.finalizedDate) {
    lines.push(`Finalizada em: ${new Date(rat.finalizedDate).toLocaleDateString("pt-BR")}`);
  }
  if (diagnosticPreview) {
    lines.push(`Diagnóstico: ${diagnosticPreview}`);
  }

  lines.push(
    "",
    "Em breve você receberá o código de rastreio para a entrega do seu equipamento.",
    "",
    "Guarde este documento para seus registros.",
    emailTextFooter()
  );
  return lines.join("\n");
}

export function buildMaintenanceStartedEmailText(request: MaintenanceRequest): string {
  const isWarranty = request.budget?.isWarranty ?? false;
  const isPaid = request.budgetPayment?.status === "paid";
  const deadlineLabel = formatDeadlineLabel(request);

  const contextLine = isWarranty
    ? "Seu orçamento em garantia foi aprovado e o reparo já foi iniciado."
    : isPaid
      ? "Confirmamos o recebimento do pagamento e o reparo já foi iniciado."
      : "Seu equipamento entrou em processo de assistência técnica.";

  return [
    `Olá, ${request.clientName}!`,
    "",
    `${contextLine} Um técnico da Neurobots já está cuidando do reparo do seu equipamento.`,
    "",
    `RAT: ${emailRatDisplayId(request)}`,
    `Nº interno: ${request.requestNumber}`,
    `Equipamento: ${request.productName}`,
    "Status: Em manutenção",
    `Prazo estimado: ${deadlineLabel}`,
    "",
    "A partir desta etapa, sua ordem de serviço passa a ser identificada pelo número de RAT acima.",
    "Acompanhe o andamento pelos nossos canais de atendimento. Entraremos em contato caso seja necessário.",
    emailTextFooter(),
  ].join("\n");
}

export const CORREIOS_TRACKING_BASE_URL = "https://rastreamento.correios.com.br/app/index.php";

export function buildCorreiosTrackingUrl(trackingCode: string): string {
  const code = trackingCode.trim().toUpperCase();
  return `${CORREIOS_TRACKING_BASE_URL}?objetos=${encodeURIComponent(code)}`;
}

export function buildTrackingEmailSubject(request: MaintenanceRequest): string {
  return `Seu dispositivo saiu da assistência — ${emailRatDisplayId(request)} | Neurobots`;
}

export function buildTrackingEmailHtml(request: MaintenanceRequest, trackingCode: string): string {
  const trackingUrl = buildCorreiosTrackingUrl(trackingCode);
  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6;">
      Olá, <strong>${escapeHtml(request.clientName)}</strong>!
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      Seu dispositivo saiu da assistência técnica. Acompanhe a entrega por meio do código
      <strong style="font-size:15px;letter-spacing:1px;color:#15803d;">${escapeHtml(trackingCode)}</strong>
      no site dos Correios.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0fdf4;border-radius:12px;padding:4px 20px;margin-bottom:24px;border:1px solid #bbf7d0;">
      <tbody>
        ${summaryRowStacked("RAT", escapeHtml(emailRatDisplayId(request)))}
        ${summaryRowStacked("Equipamento", escapeHtml(request.productName))}
        ${summaryRowStacked("Código de rastreio", `<strong style="font-size:16px;letter-spacing:1px;color:#15803d;">${escapeHtml(trackingCode)}</strong>`)}
        ${request.shippingLabel?.serviceName ? summaryRowStacked("Serviço", escapeHtml(request.shippingLabel.serviceName)) : ""}
      </tbody>
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;">
      <tr>
        <td align="center">
          <a href="${escapeHref(trackingUrl)}" style="display:inline-block;padding:14px 28px;background-color:${BRAND_BLUE};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:10px;">
            Clique aqui para rastrear
          </a>
        </td>
      </tr>
    </table>`;

  return emailLayout("Seu Dispositivo Foi Despachado", body);
}

export function buildTrackingEmailText(request: MaintenanceRequest, trackingCode: string): string {
  const trackingUrl = buildCorreiosTrackingUrl(trackingCode);
  return [
    `Olá, ${request.clientName}!`,
    "",
    `Seu dispositivo saiu da assistência técnica. Acompanhe a entrega por meio do código ${trackingCode} no site dos Correios.`,
    "",
    `RAT: ${emailRatDisplayId(request)}`,
    `Equipamento: ${request.productName}`,
    `Código de rastreio: ${trackingCode}`,
    request.shippingLabel?.serviceName ? `Serviço: ${request.shippingLabel.serviceName}` : "",
    "",
    "Clique no botão do e-mail ou acesse o site de rastreamento dos Correios com o código acima.",
    emailTextFooter(),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPaymentConfirmationEmailText(request: MaintenanceRequest): string {
  const totalLabel = request.budget?.isWarranty
    ? "Garantia — sem custo"
    : fmt(request.budget?.totalFinal ?? 0);

  return [
    `Olá, ${request.clientName}!`,
    "",
    "Confirmamos o recebimento do pagamento referente à sua ordem de serviço.",
    "Seu equipamento já está em processo de assistência técnica pela nossa equipe.",
    "",
    `RAT: ${emailRatDisplayId(request)}`,
    `Nº interno: ${request.requestNumber}`,
    `Equipamento: ${request.productName}`,
    `Valor pago: ${totalLabel}`,
    "Status: Em manutenção",
    emailTextFooter(),
  ].join("\n");
}
