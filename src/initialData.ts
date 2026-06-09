/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Client, ProductCatalog, ServiceCatalog, MaintenanceRequest, TechnicalProduct } from "./types";

export const INITIAL_USERS: User[] = [
  {
    id: "usr-super-1",
    name: "Ronald Oliveira",
    email: "ronald.oliveira@neurobots.com.br",
    profile: "Administrador"
  },
  {
    id: "usr-admin-1",
    name: "Yasmin Oliveira",
    email: "yasmin.oliveira@neurobots.com",
    profile: "Administrador"
  }
];

export const INITIAL_PRODUCTS: ProductCatalog[] = [
  { id: "prd-1", code: "CTRL-01", description: "Placa Controladora Neuro", baseValue: 1250.00 },
  { id: "prd-2", code: "SENS-02", description: "Sensor Biométrico IoT", baseValue: 380.00 },
  { id: "prd-3", code: "MOTR-03", description: "Motor DC de Alta Precisão", baseValue: 650.00 },
  { id: "prd-4", code: "CABO-04", description: "Cabo Conector Blindado 2m", baseValue: 120.00 },
  { id: "prd-5", code: "BATE-05", description: "Bateria de Lítio Recarregável", baseValue: 290.00 }
];

export const INITIAL_SERVICES: ServiceCatalog[] = [
  { id: "srv-1", code: "DIAG-01", description: "Diagnóstico Avançado de Hardware", baseValue: 150.00 },
  { id: "srv-2", code: "CALB-02", description: "Calibração e Alinhamento Técnico", baseValue: 220.00 },
  { id: "srv-3", code: "MANU-03", description: "Mão de Obra para Troca de Placa", baseValue: 300.00 },
  { id: "srv-4", code: "TEST-04", description: "Teste de Carga e Software de Firmware", baseValue: 180.00 },
  { id: "srv-5", code: "MANU-05", description: "Manutenção Preventiva Geral", baseValue: 250.00 }
];

export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_REQUESTS: MaintenanceRequest[] = [];

export const INITIAL_TECHNICAL_PRODUCTS: TechnicalProduct[] = [
  { id: "tp-1", name: "Myobots" },
  { id: "tp-2", name: "Eleva" },
  { id: "tp-3", name: "Exobots" },
  { id: "tp-4", name: "Eletrobots Mindbots" },
  { id: "tp-5", name: "Eletrobots Exobots" },
  { id: "tp-6", name: "Eletrobots Ultra" },
  { id: "tp-7", name: "Eletrobots Ultra Max" },
  { id: "tp-8", name: "Eletrobots Ultra NeuroOne" }
];
