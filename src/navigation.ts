/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppTab =
  | "relatorios"
  | "kanban"
  | "clientes"
  | "base_dados"
  | "politicas"
  | "hub_testes"
  | "configuracoes";

export const TAB_PAGE_TITLES: Record<AppTab, string> = {
  kanban: "Solicitações Kanban",
  clientes: "Clientes",
  base_dados: "Base de Dados",
  relatorios: "Relatórios",
  politicas: "Políticas",
  hub_testes: "Hub de Testes",
  configuracoes: "Configurações",
};

export const TAB_PAGE_DESCRIPTIONS: Record<AppTab, string> = {
  kanban: "Gestão de pedidos de assistência técnica",
  clientes: "Cadastro e histórico de clientes",
  base_dados: "Consulta e arquivo de ordens de serviço",
  relatorios: "Indicadores e relatórios operacionais",
  politicas: "Documentos oficiais e diretrizes da operação",
  hub_testes: "Ambiente externo para testes de dispositivos",
  configuracoes: "Usuários, catálogos e integrações",
};

export const SYSTEM_NAME = "Gestão de Assistências e Manutenções";
export const SYSTEM_SUBTITLE = "Central de serviços";
