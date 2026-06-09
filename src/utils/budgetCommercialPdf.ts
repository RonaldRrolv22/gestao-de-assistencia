/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BudgetItemProduct,
  BudgetItemService,
  BudgetPayment,
  MaintenanceRequest,
} from "../types";
import { formatRequestDisplayId } from "../services/requestIds";

const LOGO_URL =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSLf3i4Iwze_uASijVpUfesTds5X5AGr1thA&s";

const CARD_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`;

const PIX_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/></svg>`;

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export interface BudgetPdfPaymentInfo {
  isWarranty: boolean;
  totalFinal: number;
  status?: BudgetPayment["status"];
  paidAt?: string;
  cardLinkUrl?: string;
  pixCopyPaste?: string;
  pixQrCodeUrl?: string;
  shippingDefined: boolean;
  autoCardError?: string;
  autoPixError?: string;
}

export function resolveBudgetPdfPaymentInfo(
  payment: BudgetPayment | undefined,
  isWarranty: boolean,
  totalFinal: number,
  shipping: number,
  autoCardError?: string | null,
  autoPixError?: string | null
): BudgetPdfPaymentInfo {
  return {
    isWarranty,
    totalFinal,
    status: payment?.status,
    paidAt: payment?.paidAt,
    cardLinkUrl: payment?.paymentLinkUrl || undefined,
    pixCopyPaste: payment?.pixQrCode || undefined,
    pixQrCodeUrl: payment?.pixQrCodeUrl || undefined,
    shippingDefined: shipping > 0,
    autoCardError: autoCardError || undefined,
    autoPixError: autoPixError || undefined,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCardBlockHtml(info: BudgetPdfPaymentInfo): string {
  if (info.autoCardError) {
    return `
    <div class="payment-block payment-block-error">
      <div class="payment-header">
        ${CARD_ICON_SVG}
        <div class="payment-title">PAGAMENTO COM CARTÃO DE CRÉDITO</div>
      </div>
      <p class="payment-text payment-error">${escapeHtml(info.autoCardError)}</p>
      <p class="payment-text payment-muted">Verifique o cadastro do cliente (CPF/CNPJ, endereço, telefone e e-mail) e tente novamente.</p>
    </div>`;
  }

  if (info.cardLinkUrl) {
    const url = escapeHtml(info.cardLinkUrl);
    return `
    <div class="payment-block">
      <div class="payment-header">
        ${CARD_ICON_SVG}
        <div class="payment-title">PAGAMENTO COM CARTÃO DE CRÉDITO</div>
      </div>
      <p class="payment-amount-label">Valor para pagamento:</p>
      <p class="payment-amount">${fmt(info.totalFinal)}</p>
      <p class="payment-cta">
        <a href="${url}" class="payment-link-btn">Clique aqui para pagar com cartão (até 10x)</a>
      </p>
      <p class="payment-link-url"><a href="${url}">${url}</a></p>
    </div>`;
  }

  return `
    <div class="payment-block payment-block-muted">
      <div class="payment-header">
        ${CARD_ICON_SVG}
        <div class="payment-title">PAGAMENTO COM CARTÃO DE CRÉDITO</div>
      </div>
      <p class="payment-text payment-muted">Gerando link de pagamento… Aguarde alguns instantes.</p>
    </div>`;
}

function buildPixBlockHtml(info: BudgetPdfPaymentInfo): string {
  if (info.autoPixError) {
    return `
    <div class="payment-block payment-block-error">
      <div class="payment-header">
        ${PIX_ICON_SVG}
        <div class="payment-title">PAGAMENTO COM PIX</div>
      </div>
      <p class="payment-text payment-error">${escapeHtml(info.autoPixError)}</p>
      <p class="payment-text payment-muted">Verifique o cadastro do cliente e tente novamente.</p>
    </div>`;
  }

  if (info.pixCopyPaste) {
    const code = escapeHtml(info.pixCopyPaste);
    const qrImg = info.pixQrCodeUrl
      ? `<div class="payment-qr"><img src="${escapeHtml(info.pixQrCodeUrl)}" alt="QR Code PIX" /></div>`
      : "";
    return `
    <div class="payment-block payment-block-pix">
      <div class="payment-header">
        ${PIX_ICON_SVG}
        <div class="payment-title">PAGAMENTO COM PIX</div>
      </div>
      <p class="payment-amount-label">Valor para pagamento:</p>
      <p class="payment-amount">${fmt(info.totalFinal)}</p>
      ${qrImg}
      <p class="payment-amount-label">Código copia e cola:</p>
      <p class="payment-pix-code">${code}</p>
      <p class="payment-text payment-muted">Válido até confirmação do pagamento. Copie o código acima no app do seu banco.</p>
    </div>`;
  }

  return `
    <div class="payment-block payment-block-muted">
      <div class="payment-header">
        ${PIX_ICON_SVG}
        <div class="payment-title">PAGAMENTO COM PIX</div>
      </div>
      <p class="payment-text payment-muted">Gerando PIX copia e cola… Aguarde alguns instantes.</p>
    </div>`;
}

export function buildPaymentSectionHtml(info: BudgetPdfPaymentInfo): string {
  if (info.isWarranty) {
    return `
    <div class="payment-block">
      <div class="payment-header">
        ${CARD_ICON_SVG}
        <div class="payment-title">PAGAMENTO</div>
      </div>
      <p class="payment-text">Serviço coberto por garantia — sem pagamento necessário.</p>
    </div>`;
  }

  if (info.status === "paid") {
    const paidDate = info.paidAt
      ? new Date(info.paidAt).toLocaleDateString("pt-BR")
      : null;
    return `
    <div class="payment-block">
      <div class="payment-header">
        ${CARD_ICON_SVG}
        <div class="payment-title">PAGAMENTO</div>
      </div>
      <p class="payment-text payment-success">Pagamento confirmado${paidDate ? ` em ${paidDate}` : ""}.</p>
    </div>`;
  }

  if (!info.shippingDefined) {
    return `
    <div class="payment-block payment-block-muted">
      <div class="payment-header">
        ${CARD_ICON_SVG}
        <div class="payment-title">OPÇÕES DE PAGAMENTO</div>
      </div>
      <p class="payment-text payment-muted">Defina o frete no orçamento para gerar as opções de pagamento (cartão e PIX) neste documento.</p>
    </div>`;
  }

  return buildCardBlockHtml(info) + buildPixBlockHtml(info);
}

/** Extrai PAC ou SEDEX do nome do serviço de frete (ex: "Correios PAC" → "PAC"). */
export function formatShippingServiceLabel(shippingService?: string): string {
  if (!shippingService?.trim()) return "";
  const lower = shippingService.toLowerCase();
  if (lower.includes("sedex")) return "SEDEX";
  if (lower.includes("pac")) return "PAC";
  return shippingService.replace(/^correios\s*/i, "").trim();
}

export function buildFreteSummaryLabel(shipping: number, shippingService?: string): string {
  const service = formatShippingServiceLabel(shippingService);
  if (shipping > 0 && service) return `Frete (${service}):`;
  return "Frete:";
}

export interface BudgetCommercialPdfParams {
  request: MaintenanceRequest;
  isWarranty: boolean;
  budgetProducts: BudgetItemProduct[];
  budgetServices: BudgetItemService[];
  subtotalProducts: number;
  subtotalServices: number;
  shipping: number;
  shippingService?: string;
  discount: number;
  calculatedTotal: number;
  paymentInfo: BudgetPdfPaymentInfo;
  includePrintButton?: boolean;
}

export function buildBudgetCommercialHtml(params: BudgetCommercialPdfParams): string {
  const {
    request,
    isWarranty,
    budgetProducts,
    budgetServices,
    subtotalProducts,
    subtotalServices,
    shipping,
    shippingService,
    discount,
    calculatedTotal,
    paymentInfo,
    includePrintButton = true,
  } = params;

  const displayId = formatRequestDisplayId(request.id, "orcamento");
  const productRows = budgetProducts
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td class="text-center">${p.quantity}</td>
        <td class="text-right">${fmt(p.unitValue)}</td>
        <td class="text-right">${fmt(p.totalValue)}</td>
      </tr>`
    )
    .join("");

  const serviceRows = budgetServices
    .map(
      (s) => `
      <tr>
        <td>${escapeHtml(s.name)}</td>
        <td class="text-center">${s.quantity}</td>
        <td class="text-right">${fmt(s.unitValue)}</td>
        <td class="text-right">${fmt(s.totalValue)}</td>
      </tr>`
    )
    .join("");

  const paymentSection = buildPaymentSectionHtml(paymentInfo);
  const freteLabel = buildFreteSummaryLabel(shipping, shippingService);
  const printBtn = includePrintButton
    ? `<button onclick="window.print()" class="print-btn">Imprimir / Salvar PDF</button>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Orçamento ${escapeHtml(displayId)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; padding: 32px; font-size: 12px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
    .logo { width: 120px; height: auto; }
    .doc-title { font-size: 20px; font-weight: bold; color: #0f172a; }
    .doc-subtitle { color: #64748b; font-size: 11px; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-box { background: #f8fafc; border-radius: 8px; padding: 12px 16px; }
    .info-label { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
    .info-value { font-size: 12px; color: #334155; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f1f5f9; color: #475569; font-size: 10px; text-transform: uppercase; padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .totals { margin-left: auto; width: 280px; margin-bottom: 24px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; color: #475569; }
    .total-row.final { font-size: 16px; font-weight: bold; color: #0f172a; border-top: 2px solid #e2e8f0; padding-top: 8px; margin-top: 4px; }
    .warranty-badge { background: #ecfdf5; color: #059669; padding: 8px 16px; border-radius: 8px; font-weight: bold; text-align: center; margin-bottom: 16px; }
    .payment-block {
      border: 2px solid #93c5fd; background-color: #eff6ff; border-radius: 12px; padding: 16px; margin-bottom: 12px;
    }
    .payment-block-pix { border-color: #6ee7b7; background-color: #ecfdf5; }
    .payment-block-muted { border-color: #bfdbfe; background-color: #f8fafc; }
    .payment-block-error { border-color: #f87171; background-color: #fef2f2; }
    .payment-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .payment-title {
      font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #1e40af;
    }
    .payment-block-pix .payment-title { color: #047857; }
    .payment-amount-label { color: #64748b; margin: 8px 0 2px; font-size: 10px; text-transform: uppercase; }
    .payment-amount { font-size: 18px; font-weight: bold; color: #0f172a; font-family: monospace; margin: 0 0 12px; }
    .payment-cta { margin: 0 0 8px; }
    .payment-link-btn {
      display: inline-block; background: #2563eb; color: #fff; padding: 10px 20px; border-radius: 8px;
      text-decoration: none; font-weight: bold; font-size: 12px;
    }
    .payment-link-url a { color: #2563eb; word-break: break-all; font-size: 10px; }
    .payment-text { color: #475569; margin: 4px 0; }
    .payment-muted { color: #64748b; font-style: italic; }
    .payment-success { color: #059669; font-weight: 600; }
    .payment-error { color: #dc2626; font-weight: 600; }
    .payment-pix-code {
      font-family: monospace; font-size: 9px; word-break: break-all; background: #fff;
      border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px; margin: 4px 0 8px; color: #0f172a;
    }
    .payment-qr { text-align: center; margin: 8px 0; }
    .payment-qr img { max-width: 180px; border-radius: 8px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; text-align: center; }
    .print-btn { display: block; margin: 24px auto 0; padding: 10px 24px; background: #f97316; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; }
    @media print { .print-btn { display: none; } body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="doc-title">Orçamento de Manutenção</div>
      <div class="doc-subtitle">O.S. ${escapeHtml(displayId)} • Nº interno ${escapeHtml(request.requestNumber)}</div>
    </div>
    <img src="${LOGO_URL}" alt="Neurobots" class="logo" />
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Cliente</div>
      <div class="info-value">${escapeHtml(request.clientName)}</div>
      ${request.clientCompany ? `<div class="info-value">${escapeHtml(request.clientCompany)}</div>` : ""}
    </div>
    <div class="info-box">
      <div class="info-label">Equipamento</div>
      <div class="info-value">${escapeHtml(request.productName)}</div>
      <div class="info-value">S/N: ${escapeHtml(request.serialNumber || "N/A")}</div>
    </div>
  </div>

  ${isWarranty ? '<div class="warranty-badge">Serviço coberto por garantia — sem custo ao cliente</div>' : ""}

  ${budgetProducts.length > 0 ? `
  <h3 style="font-size:11px;text-transform:uppercase;color:#64748b;margin-bottom:8px;">Peças</h3>
  <table>
    <thead><tr><th>Descrição</th><th class="text-center">Qtd</th><th class="text-right">Unit.</th><th class="text-right">Total</th></tr></thead>
    <tbody>${productRows}</tbody>
  </table>` : ""}

  ${budgetServices.length > 0 ? `
  <h3 style="font-size:11px;text-transform:uppercase;color:#64748b;margin-bottom:8px;">Serviços</h3>
  <table>
    <thead><tr><th>Descrição</th><th class="text-center">Qtd</th><th class="text-right">Unit.</th><th class="text-right">Total</th></tr></thead>
    <tbody>${serviceRows}</tbody>
  </table>` : ""}

  <div class="totals">
    <div class="total-row"><span>Subtotal peças:</span><span>${fmt(subtotalProducts)}</span></div>
    <div class="total-row"><span>Subtotal serviços:</span><span>${fmt(subtotalServices)}</span></div>
    ${shipping > 0 ? `<div class="total-row"><span>${freteLabel}</span><span>${fmt(shipping)}</span></div>` : ""}
    ${discount > 0 ? `<div class="total-row"><span>Desconto:</span><span>-${fmt(discount)}</span></div>` : ""}
    <div class="total-row final"><span>Total:</span><span>${isWarranty ? "Garantia" : fmt(calculatedTotal)}</span></div>
  </div>

  ${paymentSection}

  <div class="footer">
    Neurobots Assistência Técnica • contato@neurobots.com.br • (81) 98254-2262
  </div>
  ${printBtn}
</body>
</html>`;
}
