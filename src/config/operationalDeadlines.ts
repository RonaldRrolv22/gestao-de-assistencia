/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KanbanColumnId } from "../types";

export interface OperationalDeadline {
  id: string;
  title: string;
  shortLabel: string;
  description: string;
  /** Prazo em dias corridos */
  maxDays?: number;
  /** Prazo em dias úteis */
  businessDays?: number;
  applicableStages: KanbanColumnId[];
  /** Não se aplica a orçamentos em garantia */
  excludeWarranty?: boolean;
}

/** Prazo máximo legal de execução do reparo (CDC) — referência informativa. */
export const REPAIR_EXECUTION_MAX_DAYS = 30;

/** Prazo operacional de reparo exibido no Kanban (dias úteis). */
export const MAINTENANCE_SLA_BUSINESS_DAYS = 14;

/** Prazo de retorno do diagnóstico após recebimento (dias úteis). */
export const DIAGNOSIS_BUSINESS_DAYS = 4;

export const OPERATIONAL_DEADLINES: OperationalDeadline[] = [
  {
    id: "diagnosis",
    title: "Diagnóstico",
    shortLabel: "Até 4 dias úteis após recebimento",
    description:
      "Após recebermos o dispositivo, o técnico tem até 4 dias úteis para dar o retorno da solicitação.",
    businessDays: DIAGNOSIS_BUSINESS_DAYS,
    applicableStages: ["solicitacao"],
  },
  {
    id: "rat_opening",
    title: "Abertura do RAT",
    shortLabel: "Até 1 dia útil após recebimento",
    description: "Abertura do RAT: até 1 dia útil após o recebimento do produto.",
    businessDays: 1,
    applicableStages: ["solicitacao", "manutencao"],
  },
  {
    id: "budget_send",
    title: "Envio do orçamento ao cliente",
    shortLabel: "Até 2 dias úteis após diagnóstico",
    description:
      "Envio do orçamento ao cliente: até 2 dias úteis após diagnóstico, quando aplicável (casos fora da garantia).",
    businessDays: 2,
    applicableStages: ["solicitacao", "orcamento"],
    excludeWarranty: true,
  },
  {
    id: "repair_execution",
    title: "Execução do reparo",
    shortLabel: `Até ${MAINTENANCE_SLA_BUSINESS_DAYS} dias úteis`,
    description:
      "Prazo de execução do reparo: conforme a complexidade do serviço, respeitando o prazo máximo de 30 dias estabelecido pelo CDC.",
    businessDays: MAINTENANCE_SLA_BUSINESS_DAYS,
    applicableStages: ["manutencao"],
  },
  {
    id: "product_return",
    title: "Devolução ao cliente",
    shortLabel: "Até 4 dias úteis após testes",
    description:
      "Devolução do produto ao cliente: até 4 dias úteis após a conclusão dos testes.",
    businessDays: 4,
    applicableStages: ["manutencao", "liberado"],
  },
];

export function getDeadlinesForStage(stage: KanbanColumnId): OperationalDeadline[] {
  return OPERATIONAL_DEADLINES.filter((item) => item.applicableStages.includes(stage));
}

export function getPrimaryDeadlineForStage(stage: KanbanColumnId): OperationalDeadline | undefined {
  if (stage === "solicitacao") {
    return OPERATIONAL_DEADLINES.find((item) => item.id === "diagnosis");
  }
  if (stage === "manutencao") {
    return OPERATIONAL_DEADLINES.find((item) => item.id === "repair_execution");
  }
  return getDeadlinesForStage(stage)[0];
}
