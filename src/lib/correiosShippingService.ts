/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceRequest } from "../types";
import { isValidEmail } from "./emailClient";

const BASE_URL_CORREIOS = "https://api.correios.com.br";

export const REMETENTE = {
  nome: "Neurobots",
  cpfCnpj: "24052658000105",
  logradouro: "Avenida Barbosa Lima",
  numero: "149",
  complemento: "",
  bairro: "Recife",
  cidade: "Recife",
  uf: "PE",
  cep: "50030917",
};

export interface ParsedAddress {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface ShippingServiceInfo {
  code: string;
  name: string;
  label: string;
}

export interface PrePostagemResult {
  idPrePostagem: string;
  trackingCode: string;
  service: ShippingServiceInfo;
}

export class CorreiosConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorreiosConfigError";
  }
}

export class CorreiosApiError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, status?: number, payload?: unknown) {
    super(message);
    this.name = "CorreiosApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function isCorreiosConfigured(): boolean {
  return Boolean(process.env.CORREIOS_TOKEN && process.env.CORREIOS_CARTAO_POSTAGEM);
}

function getCorreiosHeaders(): Record<string, string> {
  const token = process.env.CORREIOS_TOKEN;
  if (!token) {
    throw new CorreiosConfigError("CORREIOS_TOKEN não configurado.");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function onlyDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

export function parseClientAddress(req: MaintenanceRequest): ParsedAddress {
  const result: ParsedAddress = {
    logradouro: "",
    numero: "S/N",
    complemento: "",
    bairro: "",
    cidade: req.clientCity?.trim() || "",
    uf: req.clientState?.trim().toUpperCase().slice(0, 2) || "",
    cep: onlyDigits(req.clientCep || ""),
  };

  const texto = (req.clientAddress || "").trim();
  if (!texto) return result;

  const cepMatch = texto.match(/CEP\s*[:\-]?\s*([\d]{5}[\-\.]?[\d]{3})/i);
  if (cepMatch && !result.cep) {
    result.cep = onlyDigits(cepMatch[1]);
  }

  const textoLimpo = texto.split(/;?\s*CEP/i)[0].trim().replace(/\.$/, "");
  const partes = textoLimpo.split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean);

  if (partes.length >= 1) {
    const endMatch = partes[0].match(/^(.+?)[,\s]+(\d+\w*)$/);
    if (endMatch) {
      result.logradouro = endMatch[1].trim();
      result.numero = endMatch[2].trim();
    } else {
      result.logradouro = partes[0];
    }
  }

  if (partes.length >= 2 && !result.bairro) {
    result.bairro = partes[1];
  }
  if (partes.length >= 3 && !result.complemento) {
    result.complemento = partes.slice(2).join(" - ");
  }

  if (!result.logradouro) {
    result.logradouro = textoLimpo;
  }

  return result;
}

interface ViaCepResponse {
  uf?: string;
  localidade?: string;
  bairro?: string;
  logradouro?: string;
  erro?: boolean;
}

async function lookupCep(cep: string): Promise<ViaCepResponse | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepResponse;
    return data.erro ? null : data;
  } catch {
    return null;
  }
}

export async function parseClientAddressWithCep(req: MaintenanceRequest): Promise<ParsedAddress> {
  const parsed = parseClientAddress(req);
  if (parsed.cep.length !== 8) return parsed;

  const cepInfo = await lookupCep(parsed.cep);
  if (!cepInfo?.uf) return parsed;

  const corrected: ParsedAddress = { ...parsed };
  const cepUf = cepInfo.uf.toUpperCase().slice(0, 2);

  if (parsed.uf && parsed.uf.toUpperCase() !== cepUf) {
    console.warn(
      `[Correios] O.S. ${req.id}: UF corrigida de ${parsed.uf} para ${cepUf} conforme CEP ${parsed.cep}`
    );
    corrected.uf = cepUf;
  } else if (!parsed.uf) {
    corrected.uf = cepUf;
  }

  if (!corrected.cidade && cepInfo.localidade) {
    corrected.cidade = cepInfo.localidade;
  }
  if (!corrected.bairro && cepInfo.bairro) {
    corrected.bairro = cepInfo.bairro;
  }
  if (!corrected.logradouro && cepInfo.logradouro) {
    corrected.logradouro = cepInfo.logradouro;
  }

  return corrected;
}

export function resolveShippingService(req: MaintenanceRequest): ShippingServiceInfo {
  const service = (req.budget?.shippingService || "").toUpperCase();
  if (service.includes("SEDEX")) {
    return { code: "03220", name: "SEDEX", label: "SEDEX CONTRATO AG" };
  }
  return { code: "03298", name: "PAC", label: "PAC CONTRATO AG" };
}

export function buildDeclarationItems(req: MaintenanceRequest) {
  const description = [
    "Equipamento medico em manutencao",
    req.productName,
    req.serialNumber ? `S/N: ${req.serialNumber}` : "",
  ]
    .filter(Boolean)
    .join(" - ");

  return [
    {
      conteudo: "Equipamento medico",
      descricaoConteudo: description.slice(0, 200),
      descricao: description.slice(0, 200),
      quantidade: 1,
      valor: 1.0,
    },
  ];
}

export function validateShippingRequest(req: MaintenanceRequest): string | null {
  if (req.columnId !== "liberado") {
    return "A etiqueta só pode ser gerada para ordens na coluna Liberado.";
  }
  if (req.shippingLabel?.trackingCode) {
    return "Etiqueta já gerada para esta ordem de serviço.";
  }
  if (!req.clientName?.trim()) {
    return "Nome do cliente não informado.";
  }

  const email = req.clientEmail?.trim();
  if (!email) {
    return "Cliente sem e-mail cadastrado. O e-mail de rastreio não poderá ser enviado.";
  }
  if (!isValidEmail(email)) {
    return `E-mail do cliente inválido: ${email}`;
  }

  const endereco = parseClientAddress(req);
  if (endereco.cep.length !== 8) {
    return "CEP do cliente inválido ou ausente (deve ter 8 dígitos).";
  }
  if (!endereco.logradouro.trim()) {
    return "Endereço do cliente incompleto.";
  }
  if (!endereco.cidade.trim() || !endereco.uf.trim()) {
    return "Cidade/UF do cliente não informados.";
  }

  return null;
}

async function correiosFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...getCorreiosHeaders(),
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }

  if (!res.ok) {
    const errObj = typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {};
    const msgs = Array.isArray(errObj.msgs) ? errObj.msgs.join("; ") : "";
    const message =
      msgs ||
      (typeof errObj.message === "string" ? errObj.message : "") ||
      (typeof errObj.causa === "string" ? errObj.causa : "") ||
      (typeof payload === "string" && payload ? payload : `Erro na API Correios (${res.status})`);
    throw new CorreiosApiError(message, res.status, payload);
  }

  return payload as T;
}

function extractTrackingFromPayload(data: Record<string, unknown>): string {
  const keys = ["codigoObjeto", "codigoRastreio", "numObj", "codigoEtiqueta"];
  for (const key of keys) {
    const val = data[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

export async function pollTrackingCode(idPre: string, maxAttempts = 10): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    try {
      const data = await correiosFetch<Record<string, unknown>>(
        `${BASE_URL_CORREIOS}/prepostagem/v1/prepostagens/${idPre}`,
        { method: "GET" }
      );
      const tracking = extractTrackingFromPayload(data);
      if (tracking) return tracking;
    } catch (err) {
      if (i === maxAttempts - 1) throw err;
    }
  }

  return "";
}

export async function createPrePostagem(req: MaintenanceRequest): Promise<PrePostagemResult> {
  if (!isCorreiosConfigured()) {
    throw new CorreiosConfigError("Credenciais Correios não configuradas.");
  }

  const cartao = process.env.CORREIOS_CARTAO_POSTAGEM;
  if (!cartao) {
    throw new CorreiosConfigError("CORREIOS_CARTAO_POSTAGEM não configurado.");
  }

  const endereco = await parseClientAddressWithCep(req);
  const service = resolveShippingService(req);
  const serial = (req.serialNumber || "").trim();
  const cnpjDest = onlyDigits(req.clientCpfCnpj || "") || "00000000000";

  if (!req.clientCpfCnpj) {
    console.warn(`[Correios] O.S. ${req.id}: CPF/CNPJ do destinatário ausente, usando placeholder.`);
  }

  const prePostagemBody: Record<string, unknown> = {
    codigoServico: service.code,
    numeroCartaoPostagem: cartao,
    codigoFormatoObjetoInformado: "2",
    alturaInformada: "8",
    larguraInformada: "20",
    comprimentoInformado: "28",
    pesoInformado: "300",
    itensDeclaracaoConteudo: buildDeclarationItems(req),
    cienteObjetoNaoProibido: "1",
    remetente: {
      nome: REMETENTE.nome,
      cpfCnpj: REMETENTE.cpfCnpj,
      endereco: {
        cep: onlyDigits(REMETENTE.cep),
        logradouro: REMETENTE.logradouro,
        numero: REMETENTE.numero,
        complemento: REMETENTE.complemento,
        bairro: REMETENTE.bairro,
        cidade: REMETENTE.cidade,
        uf: REMETENTE.uf,
      },
    },
    destinatario: {
      nome: req.clientName,
      cpfCnpj: cnpjDest,
      endereco: {
        cep: endereco.cep,
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        complemento: endereco.complemento,
        bairro: endereco.bairro || endereco.cidade,
        cidade: endereco.cidade,
        uf: endereco.uf,
      },
    },
  };

  if (serial) {
    prePostagemBody.listaServicoAdicional = ["095"];
  }

  const response = await correiosFetch<Record<string, unknown>>(
    `${BASE_URL_CORREIOS}/prepostagem/v1/prepostagens`,
    {
      method: "POST",
      body: JSON.stringify(prePostagemBody),
    }
  );

  const idPre =
    (typeof response.id === "string" && response.id) ||
    (typeof response.idPrePostagem === "string" && response.idPrePostagem) ||
    "";

  if (!idPre) {
    throw new CorreiosApiError("Pré-postagem criada, mas ID não retornado pela API.", 502, response);
  }

  let tracking = extractTrackingFromPayload(response);
  if (!tracking) {
    tracking = await pollTrackingCode(idPre);
  }

  if (!tracking) {
    throw new CorreiosApiError(
      "Pré-postagem criada, mas código de rastreio ainda não disponível.",
      502,
      response
    );
  }

  return {
    idPrePostagem: idPre,
    trackingCode: tracking,
    service,
  };
}
