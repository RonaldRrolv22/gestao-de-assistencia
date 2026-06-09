/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { MaintenanceRequest } from "../types";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  ArrowRight,
  Calendar,
} from "lucide-react";
import PageHeader from "./ui/PageHeader";
import StatusBadge from "./ui/StatusBadge";
import {
  filterOsDatabaseRows,
  getBudgetDecision,
  getFriendlyColumnLabel,
  formatDateBr,
  formatDateTimeBr,
  formatBudgetValue,
  formatFreteSummary,
  formatPaymentStatus,
  formatRatStatus,
  formatReleaseInfo,
  columnIdToBadgeVariant,
  budgetDecisionToBadgeVariant,
  StageFilter,
  TimeFilter,
} from "../utils/osDatabase";

interface OsDatabaseSectionProps {
  requests: MaintenanceRequest[];
  onPreviewBudget: (request: MaintenanceRequest) => void;
  onPreviewRat: (request: MaintenanceRequest) => void;
}

export default function OsDatabaseSection({
  requests,
  onPreviewBudget,
  onPreviewRat,
}: OsDatabaseSectionProps) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredRows = useMemo(
    () =>
      filterOsDatabaseRows(requests, {
        search,
        stage: stageFilter,
        timeFilter,
      }),
    [requests, search, stageFilter, timeFilter]
  );

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 lg:px-6 pt-4 lg:pt-5 pb-4">
        <PageHeader
          variant="page"
          title="Base de Dados — Orçamentos & RATs"
          subtitle="Visualização em planilha de todas as O.S. com orçamento gerado"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por O.S., cliente, equipamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as StageFilter)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
          >
            <option value="all">Todas as etapas</option>
            <option value="orcamento">Orçamento</option>
            <option value="manutencao">Em Manutenção</option>
            <option value="liberado">Liberado</option>
            <option value="recusado">Reprovado</option>
          </select>

          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(
              [
                { value: "all", label: "Todos" },
                { value: "30", label: "30d" },
                { value: "90", label: "90d" },
                { value: "year", label: "Ano" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeFilter(opt.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  timeFilter === opt.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-medium ml-auto">
            {filteredRows.length} registro{filteredRows.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-5 pb-5 overflow-hidden">
        <div className="h-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50">
                  <th className="py-3 px-3 w-8" />
                  <th className="py-3 px-3">O.S.</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Equipamento</th>
                  <th className="py-3 px-3">Etapa</th>
                  <th className="py-3 px-3">Orçamento</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3 text-right">Valor</th>
                  <th className="py-3 px-3">Frete</th>
                  <th className="py-3 px-3">Abertura</th>
                  <th className="py-3 px-3">Aprovação</th>
                  <th className="py-3 px-3">Pagamento</th>
                  <th className="py-3 px-3">RAT</th>
                  <th className="py-3 px-3">Liberação</th>
                  <th className="py-3 px-3 text-center w-24">PDFs</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-12 text-center text-slate-400">
                      Nenhuma O.S. com orçamento encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((req) => {
                    const decision = getBudgetDecision(req);
                    const isExpanded = expandedId === req.id;
                    return (
                      <React.Fragment key={req.id}>
                        <tr className="hover:bg-slate-50/60">
                          <td className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpand(req.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded"
                              title="Ver histórico de etapas"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-slate-800">{req.id}</div>
                            <div className="text-[10px] text-slate-400">{req.requestNumber}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-700">{req.clientName}</div>
                            {req.clientCompany && (
                              <div className="text-[10px] text-slate-400">{req.clientCompany}</div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-700">{req.productName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">N/S: {req.serialNumber || "-"}</div>
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge variant={columnIdToBadgeVariant(req.columnId)}>
                              {getFriendlyColumnLabel(req.columnId)}
                            </StatusBadge>
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge variant={budgetDecisionToBadgeVariant(decision)}>
                              {decision}
                            </StatusBadge>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {req.budget?.isWarranty ? "Garantia" : "Particular"}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-900 font-mono">
                            {formatBudgetValue(req)}
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-[140px] truncate" title={formatFreteSummary(req)}>
                            {formatFreteSummary(req)}
                          </td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            {formatDateBr(req.openingDate)}
                          </td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            {req.budget?.approvedDate ? formatDateTimeBr(req.budget.approvedDate) : "-"}
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-[120px] truncate" title={formatPaymentStatus(req)}>
                            {formatPaymentStatus(req)}
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-[120px] truncate" title={formatRatStatus(req)}>
                            {formatRatStatus(req)}
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-[140px] truncate" title={formatReleaseInfo(req)}>
                            {formatReleaseInfo(req)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onPreviewBudget(req)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Visualizar PDF do orçamento"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => req.rat && onPreviewRat(req)}
                                disabled={!req.rat}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={req.rat ? "Visualizar PDF da RAT" : "RAT ainda não gerada"}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={15} className="px-5 py-4">
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Histórico de Movimentação
                                </h4>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                  {(req.movementHistory || []).length === 0 ? (
                                    <p className="text-[11px] text-slate-400 italic">Sem registros de movimentação.</p>
                                  ) : (
                                    req.movementHistory.map((log, index) => (
                                      <div
                                        key={log.id || index}
                                        className="flex items-center justify-between text-[11px] bg-white p-2.5 rounded-lg border border-slate-100"
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-blue-600 px-1 bg-blue-50 border rounded text-[9px]">
                                            ETAPA
                                          </span>
                                          <span className="text-slate-500">{getFriendlyColumnLabel(log.fromColumn)}</span>
                                          <ArrowRight className="h-3 w-3 text-slate-400" />
                                          <span className="text-slate-800 font-bold">
                                            {getFriendlyColumnLabel(log.toColumn)}
                                          </span>
                                        </div>
                                        <div className="text-right text-slate-400 text-[10px]">
                                          <span>Por: {log.userName}</span>
                                          <span className="mx-1">•</span>
                                          <span>{formatDateTimeBr(log.timestamp)}</span>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
