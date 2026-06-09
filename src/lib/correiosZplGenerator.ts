/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceRequest } from "../types";
import {
  ParsedAddress,
  REMETENTE,
  resolveShippingService,
} from "./correiosShippingService";

export interface MaintenanceZplInput {
  request: MaintenanceRequest;
  endereco: ParsedAddress;
  trackingCode: string;
  contractNumber: string;
}

function clean(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ºª]/g, ".")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C")
    .trim();
}

function formatDateBr(iso?: string): string {
  if (!iso) return new Date().toLocaleDateString("pt-BR");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}

function buildDeclarationLabel(input: MaintenanceZplInput): string {
  const { request, endereco } = input;
  const destNome = clean(request.clientName);
  const destDoc = clean(request.clientCpfCnpj || "N/A");
  const osRef = clean(request.requestNumber || request.id);
  const product = clean(request.productName);
  const serial = clean(request.serialNumber);
  const dateStr = formatDateBr(request.releasedDate || new Date().toISOString());

  let zpl = "^XA^CI28^MMT,Y^MNW^MTD^MD15^PR4,4\n";
  zpl += "^FO20,20^GB772,1178,3^FS\n";
  zpl += "^FO20,30^A0N,40,40^FB772,1,C,0^FD" + clean("DECLARACAO DE CONTEUDO") + "^FS\n";

  zpl += "^FO20,85^GB772,30,30^FS^FO30,90^A0N,22,22^FR^FDREMETENTE^FS\n";
  zpl += "^FO40,125^A0N,20,20^FDNome: " + clean(REMETENTE.nome) + "^FS\n";
  zpl += "^FO40,150^A0N,20,20^FDCNPJ: " + clean(REMETENTE.cpfCnpj) + "^FS\n";
  zpl +=
    "^FO40,175^A0N,20,20^FDEndereco: " +
    clean(`${REMETENTE.logradouro}, ${REMETENTE.numero}`) +
    "^FS\n";
  zpl +=
    "^FO40,200^A0N,20,20^FDCidade: " +
    clean(`${REMETENTE.cep} ${REMETENTE.cidade} - ${REMETENTE.uf}`) +
    "^FS\n";

  zpl += "^FO20,235^GB772,30,30^FS^FO30,240^A0N,22,22^FR^FDDESTINATARIO^FS\n";
  zpl += "^FO40,275^A0N,20,20^FDNome: " + destNome + "^FS\n";
  zpl += "^FO40,300^A0N,20,20^FDCNPJ/CPF: " + destDoc + "^FS\n";
  zpl +=
    "^FO40,325^A0N,20,20^FDEndereco: " +
    clean(`${endereco.logradouro}, ${endereco.numero}`) +
    "^FS\n";
  zpl +=
    "^FO40,350^A0N,20,20^FDCidade: " +
    clean(`${endereco.cep} ${endereco.cidade} - ${endereco.uf}`) +
    "^FS\n";

  zpl += "^FO20,385^GB772,30,30^FS^FO30,390^A0N,22,22^FR^FDCONTEUDO^FS\n";
  zpl += "^FO40,425^A0N,20,20^FDOrdem de Servico: " + osRef + "^FS\n";
  zpl += "^FO40,450^A0N,20,20^FDProduto: " + product + "^FS\n";
  if (serial) {
    zpl += "^FO40,475^A0N,20,20^FDSerial: " + serial + "^FS\n";
  }
  zpl += "^FO40,505^A0N,20,20^FDDescricao: Equipamento medico em manutencao^FS\n";
  zpl += "^FO40,530^A0N,20,20^FDQuantidade: 1  Valor declarado: R$ 1,00^FS\n";
  zpl += "^FO40,555^A0N,20,20^FDData: " + clean(dateStr) + "^FS\n";

  zpl += "^FO20,590^GB772,30,30^FS^FO30,595^A0N,18,18^FR^FDOBSERVACAO^FS\n";
  zpl +=
    "^FO40,630^A0N,18,18^FB732,4,L,0^FD" +
    clean("Retorno de equipamento apos manutencao. Sem nota fiscal.") +
    "^FS\n";

  zpl += "^XZ\n";
  return zpl;
}

function buildCorreiosLabel(input: MaintenanceZplInput): string {
  const { request, endereco, trackingCode, contractNumber } = input;
  const service = resolveShippingService(request);
  const serial = (request.serialNumber || "").trim();
  const isSpecial = Boolean(serial);
  const osRef = clean(request.requestNumber || request.id);
  const rastreio = (trackingCode || "").replace(/\s/g, "");
  const destNome = clean(request.clientName);
  const fontSize = destNome.length > 39 ? 26 : 38;

  let zpl = "^XA^CI28^MMT,Y^MNW^MTD^MD15^PR4,4\n";
  zpl += "^FO20,20^GB772,1178,3^FS\n";
  zpl += "^FO40,40^A0N,40,40^FDNEUROBOTS^FS\n";
  zpl += "^FO330,15^BQN,2,5^FDQA," + rastreio + "^FS\n";

  zpl += "^FO650,40^GC100,3,B^FS\n";
  zpl += "^FO685,75^A0N,40,40^FD" + (service.name === "SEDEX" ? "S" : "P") + "^FS\n";

  zpl +=
    "^FO40,220^A0N,24,24^FDContrato: " +
    clean(contractNumber) +
    "  " +
    clean(service.label) +
    "^FS\n";
  zpl += "^FO40,260^A0N,54,54^FD" + clean(trackingCode) + "^FS\n";
  zpl += "^FO610,265^A0N,28,28^FDOS: " + osRef + "^FS\n";

  if (isSpecial) {
    zpl += "^FO620,305^GB80,45,3^FS\n";
    zpl += "^FO642,312^A0N,32,32^FDAP^FS\n";
  }

  zpl += "^BY3,3,90^FO80,340^BCN,90,Y,N,N^FD" + rastreio + "^FS\n";

  zpl += "^FO40,470^A0N,20,20^FDRecebedor:________________________________________________^FS\n";
  zpl += "^FO40,500^A0N,20,20^FDAssinatura:_______________________ Documento:_____________^FS\n";

  zpl += "^FO20,540^GB772,30,30^FS^FO30,545^A0N,22,22^FR^FDDESTINATARIO^FS\n";
  zpl += `^FO40,580^A0N,${fontSize},${fontSize}^FB700,2,L,0^FD${destNome}^FS\n`;
  zpl +=
    "^FO40,635^A0N,25,25^FD" +
    clean(`${endereco.logradouro}, ${endereco.numero}`) +
    "^FS\n";
  zpl +=
    "^FO40,665^A0N,25,25^FD" +
    clean(endereco.complemento || endereco.bairro || "") +
    "^FS\n";
  zpl +=
    "^FO40,695^A0N,36,36^FD" +
    clean(endereco.cep.replace(/\D/g, "")) +
    " " +
    clean(`${endereco.cidade}/${endereco.uf}`) +
    "^FS\n";

  zpl +=
    "^BY2,3,70^FO150,745^BCN,70,Y,N,N^FD" +
    endereco.cep.replace(/\D/g, "") +
    "^FS\n";

  zpl += "^FO20,845^GB772,30,30^FS^FO30,850^A0N,22,22^FR^FDREMETENTE^FS\n";
  zpl += "^FO40,885^A0N,20,20^FD" + clean(REMETENTE.nome) + "^FS\n";
  zpl +=
    "^FO40,910^A0N,20,20^FD" +
    clean(`${REMETENTE.logradouro}, ${REMETENTE.numero}`) +
    "^FS\n";
  zpl +=
    "^FO40,935^A0N,20,20^FD" +
    clean(`${REMETENTE.cidade} - ${REMETENTE.uf} CEP: ${REMETENTE.cep}`) +
    "^FS\n";

  zpl += "^XZ";
  return zpl;
}

export function generateMaintenanceZpl(input: MaintenanceZplInput): string {
  return buildDeclarationLabel(input) + buildCorreiosLabel(input);
}
