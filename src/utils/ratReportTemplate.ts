/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceRequest, Attachment } from "../types";
import { formatDate } from "../utils";
import { resolveFileUrl } from "../services/requestIds";

export interface RatLaborRow {
  operator: string;
  description: string;
  startTime: string;
  endTime: string;
  totalMinutes: number;
}

export interface RatPartRow {
  code: string;
  description: string;
  quantity: number;
}


export interface RatReportData {
  request: MaintenanceRequest;
  isFinalizado: boolean;
  diagnostic: string;
  defectCauses: string[];
  laborRows: RatLaborRow[];
  partRows: RatPartRow[];
  finalInspectionElectric: string;
  finalInspectionFunctional: string;
  technicalNotes: string;
  attachments: Attachment[];
}

function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours}h ${mins}m`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** CSS idêntico ao HTML exportado pelo sistema (visualização web). */
export const RAT_REPORT_STYLES = `
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
    .logo-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-square {
      width: 38px;
      height: 38px;
      object-fit: cover;
      border-radius: 6px;
    }
    .company-title {
      font-size: 20px;
      font-weight: bold;
      margin: 0;
      color: #0f172a;
    }
    .company-subtitle {
      font-size: 10px;
      text-transform: uppercase;
      font-family: monospace;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .company-info {
      font-size: 11px;
      color: #64748b;
      margin-top: 12px;
    }
    .company-info p {
      margin: 2px 0;
    }
    .doc-type-badge {
      display: inline-block;
      padding: 6px 12px;
      background-color: #e0f2fe;
      border: 1px solid #bae6fd;
      color: #0369a1;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
    }
    .doc-meta {
      font-size: 12px;
      color: #475569;
      margin-top: 16px;
      text-align: right;
    }
    .doc-meta p {
      margin: 4px 0;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      color: #0f172a;
      border-left: 2px solid #0f172a;
      padding-left: 8px;
      margin-bottom: 12px;
    }
    .client-detail p, .equip-detail p {
      font-size: 12px;
      margin: 4px 0;
      color: #475569;
    }
    .client-detail .name, .equip-detail .name {
      font-weight: bold;
      color: #0f172a;
    }
    .reported-defect {
      background-color: #f8fafc;
      border: 1px solid #f1f5f9;
      padding: 10px;
      border-radius: 6px;
      font-style: italic;
      font-size: 11px;
      margin-top: 8px;
      white-space: pre-wrap;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 12px;
      margin-bottom: 20px;
    }
    th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: bold;
      padding: 10px;
      text-align: left;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .mono { font-family: monospace; }
    .bold { font-weight: bold; }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
    }
    .sig-line {
      border-top: 1px solid #475569;
      margin-top: 40px;
      text-align: center;
      font-size: 11px;
      color: #475569;
    }
    .sig-line p {
      margin: 4px 0;
    }
    .print-btn-float {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #0369a1;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    @media print {
      body { padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; }
      .print-btn-float { display: none; }
    }
`;

export function buildRatReportHtml(
  data: RatReportData,
  options?: { includePrintButton?: boolean; includeAttachments?: boolean }
): string {
  const {
    request,
    isFinalizado,
    diagnostic,
    defectCauses,
    laborRows,
    partRows,
    finalInspectionElectric,
    finalInspectionFunctional,
    technicalNotes,
    attachments,
  } = data;

  const titleStr = `Relatorio_RAT_${request.id}`;
  const includePrintButton = options?.includePrintButton ?? true;
  const includeAttachments = options?.includeAttachments ?? true;

  const defectCausesHtml =
    defectCauses.length === 0
      ? '<span style="color: #94a3b8; font-style: italic;">Nenhuma causa do defeito marcada.</span>'
      : defectCauses
          .map(
            (cause) =>
              `<span style="display: inline-block; background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 10px; margin-right: 6px; margin-bottom: 6px; color: #1e293b;">${escapeHtml(cause)}</span>`
          )
          .join("");

  const laborRowsHtml =
    laborRows.length === 0
      ? `<tr><td colspan="4" class="text-center" style="color: #94a3b8; padding: 15px;">Nenhuma hora de trabalho faturada.</td></tr>`
      : laborRows
          .map(
            (row) => `
              <tr>
                <td class="bold">${escapeHtml(row.operator)}</td>
                <td>${escapeHtml(row.description)}</td>
                <td class="text-center">${escapeHtml(row.startTime)} - ${escapeHtml(row.endTime)}</td>
                <td class="text-right mono bold" style="color: #334155;">${formatMinutes(row.totalMinutes)}</td>
              </tr>`
          )
          .join("");

  const partRowsHtml =
    partRows.length === 0
      ? `<tr><td colspan="3" class="text-center" style="color: #94a3b8; padding: 15px;">Nenhum componente físico substituído no equipamento.</td></tr>`
      : partRows
          .map(
            (p) => `
              <tr>
                <td class="mono bold">${escapeHtml(p.code)}</td>
                <td>${escapeHtml(p.description)}</td>
                <td class="text-center bold">${p.quantity}</td>
              </tr>`
          )
          .join("");

  const inspectionMark = (value: string) => {
    const labels = ["C", "NC", "N/A"] as const;
    return labels
      .map((label) => (value === label ? `<b>[X] ${label}</b>` : `[ ] ${label}`))
      .join("  ");
  };

  const attachmentsHtml =
    includeAttachments && attachments.length > 0
      ? `
      <div style="margin-top: 40px; border-top: 2px dashed #cbd5e1; padding-top: 40px; page-break-before: always;">
        <h3 style="font-size: 14px; border-bottom: 2px solid #1e293b; padding-bottom: 8px; color: #1e293b; font-family: sans-serif; text-transform: uppercase;">Anexos e Documentações Complementares</h3>
        ${attachments
          .map((att, idx) => {
            const url = resolveFileUrl(att);
            return `
          <div style="margin-top: 30px; page-break-after: auto; page-break-inside: avoid;">
            <p style="font-family: monospace; font-size: 11px; color: #64748b;"><strong>Anexo ${idx + 1}:</strong> ${escapeHtml(att.name)} (${typeof att.size === "number" ? att.size : escapeHtml(String(att.size))})</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin-top: 10px;">
              ${
                url && att.type.startsWith("image/")
                  ? `<img src="${url}" style="max-height: 500px; max-width: 100%; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" />`
                  : `
                <div style="padding: 20px;">
                  <p style="font-weight: bold; color: #334155;">Documento Anexo Integrado</p>
                  <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Este documento está acoplado de forma eletrônica sob criptografia segura na base local da O.S.</p>
                  <p style="color: #0284c7; font-family: monospace; font-weight: bold; margin-top: 10px; font-size: 11px;">${escapeHtml(att.name)}</p>
                </div>`
              }
            </div>
          </div>`;
          })
          .join("")}
      </div>`
      : "";

  const printButton = includePrintButton
    ? `<button class="print-btn-float" onclick="window.print()">Imprimir este Documento</button>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(titleStr)}</title>
  <style>${RAT_REPORT_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="logo-section">
          <img class="logo-square" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSLf3i4Iwze_uASijVpUfesTds5X5AGr1thA&s" alt="Logo" />
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
        <div class="doc-type-badge">Relatório Técnico (RAT)</div>
        <div class="doc-meta">
          <p><strong>Chamado:</strong> ${escapeHtml(request.id)}</p>
          <p><strong>Nº O.S:</strong> ${escapeHtml(request.requestNumber)}</p>
          <p><strong>Relatório Status:</strong> ${isFinalizado ? "FINALIZADO DEPOSITADO" : "RASCUNHO EM ANDAMENTO"}</p>
          <p><strong>Data de Finalização:</strong> ${request.rat?.finalizedDate ? new Date(request.rat.finalizedDate).toLocaleDateString("pt-BR") : "-"}</p>
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
        <div class="section-title">MÁQUINA / DISPOSITIVO</div>
        <p class="name">Modelo: ${escapeHtml(request.productName)}</p>
        <p class="mono">Número Serial: ${escapeHtml(request.serialNumber || "N/A")}</p>
        <p>Nota Fiscal de Origem: ${request.invoiceDate ? formatDate(request.invoiceDate) : "Não informada"}</p>
      </div>
    </div>

    <div>
      <div class="section-title">LAUDO E DIAGNÓSTICO TÉCNICO</div>
      <div class="reported-defect">${escapeHtml(diagnostic || "Nenhum laudo técnico inserido ainda.")}</div>
    </div>

    <div style="margin-top: 15px;">
      <div class="section-title">CAUSA DO DEFEITO</div>
      <div style="font-size: 11px; margin-top: 6px; color: #334155;">${defectCausesHtml}</div>
    </div>

    <div>
      <div class="section-title">EQUIPE TÉCNICA E CRONOMETRAGEM DE HORAS (MÃO DE OBRA)</div>
      <table>
        <thead>
          <tr>
            <th>Técnico Encarregado</th>
            <th>Atividade / Intervenção Realizada</th>
            <th class="text-center">Horário Início/Fim</th>
            <th class="text-right">Tempo Total</th>
          </tr>
        </thead>
        <tbody>${laborRowsHtml}</tbody>
      </table>
    </div>

    <div>
      <div class="section-title">RELAÇÃO DE COMPONENTES E PEÇAS TROCADAS</div>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Descrição Comercial</th>
            <th class="text-center">Quantidade Utilizada</th>
          </tr>
        </thead>
        <tbody>${partRowsHtml}</tbody>
      </table>
    </div>

    <div>
      <div class="section-title">INSPEÇÃO FINAL</div>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 5px; font-size: 11px;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <th style="padding: 6px 10px; text-align: left; font-weight: bold; width: 60%; border-bottom: 1px solid #cbd5e1;">Item Inspecionado</th>
            <th style="padding: 6px 10px; text-align: center; font-weight: bold; width: 40%; border-bottom: 1px solid #cbd5e1;">Resultado</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 10px;">Ensaios de segurança elétrica</td>
            <td style="padding: 8px 10px; text-align: center; font-weight: bold; font-family: monospace;">${inspectionMark(finalInspectionElectric)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 10px;">Ensaio funcional</td>
            <td style="padding: 8px 10px; text-align: center; font-weight: bold; font-family: monospace;">${inspectionMark(finalInspectionFunctional)}</td>
          </tr>
        </tbody>
      </table>
      <div style="font-size: 9px; color: #64748b; font-style: italic; margin-bottom: 25px; font-family: sans-serif; line-height: 1.4;">
        Legenda: C - Conforme, NC - Não Conforme, N/A - Não se aplica.<br/>
        Os resultados dos testes estão em anexo
      </div>
    </div>

    ${
      technicalNotes
        ? `
      <div>
        <div class="section-title">OBSERVAÇÕES TÉCNICAS E NOTAS DE TESTE</div>
        <div class="reported-defect">${escapeHtml(technicalNotes)}</div>
      </div>`
        : ""
    }

    ${attachmentsHtml}
  </div>
  ${printButton}
</body>
</html>`;
}
