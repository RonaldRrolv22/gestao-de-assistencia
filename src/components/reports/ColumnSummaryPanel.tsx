/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import DashboardPanel, { DashboardChip } from "./DashboardPanel";
import StatusProgressRow from "./StatusProgressRow";
import { OPERATION_STAGE_COLORS } from "./reportsPalette";

interface ColumnSummaryPanelProps {
  totalOpen: number;
  totalBudget: number;
  totalInMaintenance: number;
  totalReleased: number;
  periodLabel?: string;
}

const COLUMNS = [
  { key: "solicitacao" as const, label: "Solicitação", color: OPERATION_STAGE_COLORS.solicitacao },
  { key: "orcamento" as const, label: "Orçamento", color: OPERATION_STAGE_COLORS.orcamento },
  { key: "manutencao" as const, label: "Manutenção", color: OPERATION_STAGE_COLORS.manutencao },
  { key: "liberado" as const, label: "Liberado", color: OPERATION_STAGE_COLORS.liberado },
];

export default function ColumnSummaryPanel({
  totalOpen,
  totalBudget,
  totalInMaintenance,
  totalReleased,
  periodLabel,
}: ColumnSummaryPanelProps) {
  const values = {
    solicitacao: totalOpen,
    orcamento: totalBudget,
    manutencao: totalInMaintenance,
    liberado: totalReleased,
  };
  const total = totalOpen + totalBudget + totalInMaintenance + totalReleased;

  return (
    <DashboardPanel
      title="Resumo da operação"
      subtitle={
        periodLabel
          ? `Distribuição por etapa · ${periodLabel}`
          : "Distribuição das O.S. por etapa"
      }
      action={<DashboardChip tone="brand">{total} no período</DashboardChip>}
    >
      <div className="space-y-3.5">
        {COLUMNS.map((col) => {
          const value = values[col.key];
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <StatusProgressRow
              key={col.key}
              label={col.label}
              value={value}
              percent={pct}
              color={col.color}
            />
          );
        })}
      </div>
    </DashboardPanel>
  );
}
