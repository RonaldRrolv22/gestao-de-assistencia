/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KanbanColumnId } from "../../types";
import { StatusBadgeVariant } from "../ui/StatusBadge";

export interface KanbanColumnConfig {
  id: KanbanColumnId;
  title: string;
  shortTitle?: string;
  subtitle?: string;
  dotClass: string;
  /** Acento sutil de borda na coluna */
  accentClass: string;
  badgeVariant: StatusBadgeVariant;
  isRejected?: boolean;
}

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: "solicitacao",
    title: "1. Solicitação de Manutenção",
    shortTitle: "Solicitação",
    subtitle: "Triagem de entrada",
    dotClass: "bg-brand-yellow",
    accentClass: "kanban-accent-solicitacao",
    badgeVariant: "solicitacao",
  },
  {
    id: "orcamento",
    title: "2. Orçamento",
    shortTitle: "Orçamento",
    subtitle: "Proposta técnica",
    dotClass: "bg-action-blue",
    accentClass: "kanban-accent-orcamento",
    badgeVariant: "orcamento",
  },
  {
    id: "manutencao",
    title: "3. Em Manutenção",
    shortTitle: "Manutenção",
    subtitle: "Reparo em andamento",
    dotClass: "bg-brand-orange",
    accentClass: "kanban-accent-manutencao",
    badgeVariant: "manutencao",
  },
  {
    id: "liberado",
    title: "4. Liberado",
    shortTitle: "Liberado",
    subtitle: "Entrega ao cliente",
    dotClass: "bg-success",
    accentClass: "kanban-accent-liberado",
    badgeVariant: "liberado",
  },
];
