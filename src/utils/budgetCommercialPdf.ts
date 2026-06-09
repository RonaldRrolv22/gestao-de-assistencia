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

const CONTACT_LINE = "contato@neurobots.com.br • (81) 98254-2262";

const CARD_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`;

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export interface BudgetPdfPaymentInfo {
  isWarranty: boolean;
  totalFinal: number;
  status?: BudgetPayment["status"];
  paidAt?: string;
  cardLinkUrl?: string;
  shippingDefined: boolean;
  autoCardError?: string;
}

export function resolveBudgetPdfPaymentInfo(
  payment: BudgetPayment | undefined,
  isWarranty: boolean,
  totalFinal: number,
  shipping: number,
  autoCardError?: string | null
): BudgetPdfPaymentInfo {
  return {
    isWarranty,
    totalFinal,
    status: payment?.status,
    paidAt: payment?.paidAt,
    cardLinkUrl: payment?.paymentLinkUrl || undefined,
    shippingDefined: shipping > 0,
    autoCardError: autoCardError || undefined,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pixContactNote(): string {
  return `<p class="payment-pix-note"><strong>Prefere pagar via PIX?</strong> Entre em contato com nossa equipe: ${escapeHtml(CONTACT_LINE)}</p>`;
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
      ${pixContactNote()}
    </div>`;
  }

  if (!info.shippingDefined) {
    return `
    <div class="payment-block payment-block-muted">
      <div class="payment-header">
        ${CARD_ICON_SVG}
        <div class="payment-title">PAGAMENTO COM CARTÃO DE CRÉDITO</div>
      </div>
      <p class="payment-text payment-muted">Defina o frete no orçamento para gerar o link de pagamento neste documento.</p>
      ${pixContactNote()}
    </div>`;
  }

  if (info.autoCardError) {
    return `
    <div class="payment-block payment-block-error">
      <div class="payment-header">
        ${CARD_ICON_SVG}
        <div class="payment-title">PAGAMENTO COM CARTÃO DE CRÉDITO</div>
      </div>
      <p class="payment-text payment-error">${escapeHtml(info.autoCardError)}</p>
      <p class="payment-text payment-muted">Verifique o cadastro do cliente (CPF/CNPJ, endereço, telefone e e-mail) e tente novamente.</p>
      ${pixContactNote()}
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
      ${pixContactNote()}
    </div>`;
  }

  return `
    <div class="payment-block payment-block-muted">
      <div class="payment-header">
        ${CARD_ICON_SVG}
        <div class="payment-title">PAGAMENTO COM CARTÃO DE CRÉDITO</div>
      </div>
      <p class="payment-text payment-muted">Gerando link de pagamento… Salve o frete e aguarde alguns instantes.</p>
      ${pixContactNote()}
    </div>`;
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

  const freteLabel = buildFreteSummaryLabel(shipping, shippingService);

  const titleStr = `Orcamento_${request.id}`;
  const paymentHtml = buildPaymentSectionHtml(paymentInfo);
  const printButton = includePrintButton
    ? `<button class="print-btn-float" onclick="window.print()">Imprimir este Documento</button>`
    : "";

  const itemsHtml =
    budgetProducts.length === 0 && budgetServices.length === 0
      ? `<tr>
              <td colspan="5" class="text-center" style="color: #94a3b8; padding: 25px;">Este orçamento não possui itens faturados.</td>
            </tr>`
      : `${budgetProducts
          .map(
            (p) => `
              <tr>
                <td class="mono" style="color: #64748b;">PEÇA</td>
                <td class="bold">${escapeHtml(p.description)}</td>
                <td class="text-center mono">${p.quantity}</td>
                <td class="text-right mono">${fmt(p.unitValue)}</td>
                <td class="text-right mono bold">${fmt(p.totalValue)}</td>
              </tr>`
          )
          .join("")}${budgetServices
          .map(
            (s) => `
              <tr>
                <td class="mono" style="color: #64748b;">SERVIÇO</td>
                <td class="bold">${escapeHtml(s.description)}</td>
                <td class="text-center mono">${s.quantity}</td>
                <td class="text-right mono">${fmt(s.unitValue)}</td>
                <td class="text-right mono bold">${fmt(s.totalValue)}</td>
              </tr>`
          )
          .join("")}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(titleStr)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 40px;
      line-height: 1.5;
      background-color: #ffffff;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .logo-section { display: flex; align-items: center; gap: 12px; }
    .logo-square { width: 38px; height: 38px; object-fit: cover; border-radius: 6px; }
    .company-title { font-size: 20px; font-weight: bold; margin: 0; color: #0f172a; }
    .company-subtitle { font-size: 10px; text-transform: uppercase; font-family: monospace; color: #64748b; margin: 2px 0 0 0; }
    .company-info { font-size: 11px; color: #64748b; margin-top: 12px; }
    .company-info p { margin: 2px 0; }
    .doc-type-badge {
      display: inline-block; padding: 6px 12px; background-color: #f1f5f9;
      border: 1px solid #cbd5e1; color: #0f172a; border-radius: 4px;
      font-weight: bold; font-size: 12px; text-transform: uppercase;
    }
    .doc-meta { font-size: 12px; color: #475569; margin-top: 16px; text-align: right; }
    .doc-meta p { margin: 4px 0; }
    .grid-2 {
      display: grid; grid-template-columns: 1fr 1fr; gap: 30px;
      border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px;
    }
    .section-title {
      font-size: 11px; font-weight: bold; text-transform: uppercase; color: #0f172a;
      border-left: 2px solid #0f172a; padding-left: 8px; margin-bottom: 12px;
    }
    .client-detail p, .equip-detail p { font-size: 12px; margin: 4px 0; color: #475569; }
    .client-detail .name, .equip-detail .name { font-weight: bold; color: #0f172a; }
    .reported-defect {
      background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 10px;
      border-radius: 6px; font-style: italic; font-size: 11px; margin-top: 8px;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
    th {
      background-color: #f1f5f9; color: #334155; font-weight: bold; padding: 10px;
      text-align: left; border-bottom: 2px solid #cbd5e1;
    }
    td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .mono { font-family: monospace; }
    .bold { font-weight: bold; }
    .summary-block { display: flex; justify-content: flex-end; margin-top: 25px; }
    .summary-box { width: 320px; border-top: 2px solid #0f172a; padding-top: 12px; font-size: 12px; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569; }
    .summary-row.total {
      font-weight: bold; font-size: 15px; color: #0f172a;
      border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px;
    }
    .payment-block {
      margin-top: 20px; padding: 16px 18px; border: 2px solid #93c5fd;
      border-radius: 10px; background-color: #eff6ff; font-size: 11px;
    }
    .payment-block-muted { border-color: #bfdbfe; background-color: #f8fafc; }
    .payment-block-error { border-color: #f87171; background-color: #fef2f2; }
    .payment-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .payment-title {
      font-weight: bold; text-transform: uppercase; color: #1d4ed8;
      font-size: 11px; letter-spacing: 0.05em;
    }
    .payment-amount-label { color: #64748b; margin: 8px 0 2px; font-size: 10px; text-transform: uppercase; }
    .payment-amount { font-size: 18px; font-weight: bold; color: #0f172a; font-family: monospace; margin: 0 0 12px; }
    .payment-cta { margin: 0 0 8px; }
    .payment-link-btn {
      display: inline-block; background-color: #2563eb; color: #ffffff !important;
      text-decoration: none; padding: 10px 16px; border-radius: 8px;
      font-weight: bold; font-size: 12px;
    }
    .payment-link-url a { color: #2563eb; word-break: break-all; font-size: 10px; }
    .payment-text { color: #475569; margin: 4px 0; }
    .payment-muted { color: #64748b; font-style: italic; }
    .payment-success { color: #059669; font-weight: 600; }
    .payment-error { color: #dc2626; font-weight: 600; }
    .payment-pix-note {
      color: #64748b; font-size: 10px; margin-top: 12px; padding-top: 10px;
      border-top: 1px dashed #bfdbfe; line-height: 1.5;
    }
    .disclaimer {
      font-size: 10px; color: #94a3b8; margin-top: 24px; line-height: 1.4;
      border-top: 1px dashed #cbd5e1; padding-top: 15px;
    }
    .print-btn-float {
      position: fixed; bottom: 20px; right: 20px; background-color: #e84e00;
      color: white; border: none; padding: 12px 20px; border-radius: 8px;
      font-weight: bold; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    @media print {
      body { padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; }
      .print-btn-float { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="logo-section">
          <img class="logo-square" src="${LOGO_URL}" alt="Logo" />
          <div>
            <h2 class="company-title">NEUROBOTS PESQUISA E DESENVOLVIMENTO LTDA</h2>
            <p class="company-subtitle">Soluções de neuroengenharia</p>
          </div>
        </div>
        <div class="company-info">
          <p>NEUROBOTS PESQUISA E DESENVOLVIMENTO LTDA</p>
          <p>CNPJ: 24.052.658/0001-05</p>
          <p>contato@neurobots.com.br • (81) 98254-2262</p>
          <p>Av. Barbosa Lima, 149 - Recife, PE</p>
        </div>
      </div>
      <div>
        <div class="doc-type-badge">Orçamento Comercial</div>
        <div class="doc-meta">
          <p><strong>O.S. Ref:</strong> ${escapeHtml(formatRequestDisplayId(request.id, "orcamento"))}</p>
          <p><strong>Nº Chamado:</strong> ${escapeHtml(String(request.requestNumber))}</p>
          <p><strong>Data de Emissão:</strong> ${new Date(request.openingDate).toLocaleDateString("pt-BR")}</p>
          <p><strong>Garantia:</strong> ${isWarranty ? "SIM (Cobertura Total)" : "NÃO (Tabelado Particular)"}</p>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="client-detail">
        <div class="section-title">CLIENTE DESTINATÁRIO</div>
        <p class="name">${escapeHtml(request.clientName)}</p>
        <p>${escapeHtml(request.clientCompany)}</p>
        <p>Endereço: ${escapeHtml(request.clientAddress)}, ${escapeHtml(request.clientCity)}-${escapeHtml(request.clientState)}</p>
        <p>Contato: ${escapeHtml(request.clientPhone)} • ${escapeHtml(request.clientEmail)}</p>
      </div>
      <div class="equip-detail">
        <div class="section-title">EQUIPAMENTO E DIAGNÓSTICO</div>
        <p class="name">Modelo: ${escapeHtml(request.productName)}</p>
        <p class="mono">Número de Série: ${escapeHtml(request.serialNumber || "N/A")}</p>
        <p style="margin-top: 8px;"><strong>Defeito Relatado:</strong></p>
        <div class="reported-defect">${escapeHtml(request.problemDescription)}</div>
      </div>
    </div>

    <div>
      <div class="section-title">LISTA DE COMPONENTES E SERVIÇOS</div>
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Descrição Comercial</th>
            <th class="text-center">Quant.</th>
            <th class="text-right">Unitário</th>
            <th class="text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>

    <div class="summary-block">
      <div class="summary-box">
        <div class="summary-row">
          <span>Subtotal do Serviço:</span>
          <span class="mono">${fmt(subtotalServices)}</span>
        </div>
        <div class="summary-row">
          <span>Subtotal em Peças:</span>
          <span class="mono">${fmt(subtotalProducts)}</span>
        </div>
        <div class="summary-row">
          <span>${freteLabel}</span>
          <span class="mono">${fmt(shipping)}</span>
        </div>
        <div class="summary-row">
          <span>Desconto Aplicado:</span>
          <span class="mono" style="color: #059669; font-weight: bold;">
            ${isWarranty ? "ISENÇÃO INTEGRAL" : fmt(discount)}
          </span>
        </div>
        <div class="summary-row total">
          <span>VALOR TOTAL GERAL:</span>
          <span class="mono">${fmt(calculatedTotal)}</span>
        </div>
      </div>
    </div>

    ${paymentHtml}

    <div class="disclaimer">
      Declaro para os devidos fins de direito que aceito os termos descritos neste documento orçamentário oficial, autorizando o início imediato dos reparos técnicos nos moldes e custos acordados acima.
    </div>
  </div>
  ${printButton}
</body>
</html>`;
}
