/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Calendar, Cpu, Package, Loader2, Download } from "lucide-react";
import { MaintenanceRequest } from "../../types";
import { formatDate } from "../../utils";
import { formatRequestDisplayId } from "../../services/requestIds";
import { isBudgetRejected } from "../../utils/rejectedBudget";
import CardOperationalSummary from "./CardOperationalSummary";
import KanbanActionSlider from "./KanbanActionSlider";

interface ServiceOrderCardProps {
  request: MaintenanceRequest;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDelete?: () => void;
  onRejectBudget?: () => void;
  onGenerateShippingLabel?: () => void;
  onDownloadShippingLabel?: () => void;
  isGeneratingShippingLabel?: boolean;
  isDownloadingShippingLabel?: boolean;
}

export default function ServiceOrderCard({
  request: req,
  onClick,
  onDragStart,
  onDelete,
  onRejectBudget,
  onGenerateShippingLabel,
  onDownloadShippingLabel,
  isGeneratingShippingLabel = false,
  isDownloadingShippingLabel = false,
}: ServiceOrderCardProps) {
  const isOrcamento = req.columnId === "orcamento" || req.columnId === "recusado";
  const isLiberado = req.columnId === "liberado";
  const rejected = isBudgetRejected(req);
  const showActions = isOrcamento && (onDelete || onRejectBudget);
  const hasShippingLabel = Boolean(req.shippingLabel?.trackingCode);
  const showShippingAction = isLiberado && (onGenerateShippingLabel || onDownloadShippingLabel);

  return (
    <article
      id={`card-${req.id}`}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`kanban-card group cursor-pointer overflow-hidden ${
        rejected && isOrcamento ? "kanban-card-rejected" : ""
      }`}
    >
      <div className="px-3.5 pt-3.5 pb-3">
        {/* Bloco 1 — Cabeçalho */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-mono text-[10px] font-semibold text-heading tracking-tight">
              {formatRequestDisplayId(req.id, req.columnId)}
            </span>
            <span className="text-[10px] text-text-secondary/70 flex items-center gap-1 shrink-0">
              <Calendar className="h-3 w-3 opacity-40" />
              {formatDate(req.openingDate)}
            </span>
          </div>
          <h4 className="font-semibold text-[13px] text-heading leading-snug truncate">
            {req.clientName}
          </h4>
        </div>

        {/* Bloco 2 — Informações secundárias */}
        <div className="space-y-0.5 mb-2.5">
          {req.clientCompany && (
            <p className="text-[10px] text-text-secondary/75 truncate">{req.clientCompany}</p>
          )}
          {req.productName && (
            <p className="text-[10px] text-text-secondary/65 truncate flex items-center gap-1.5">
              <Cpu className="h-3 w-3 shrink-0 opacity-35" />
              {req.productName}
            </p>
          )}
          <p className="text-[10px] font-mono text-text-secondary/55 pl-[18px]">
            S/N {req.serialNumber || "—"}
          </p>
        </div>

        {/* Bloco 3 — Status operacional / SLA */}
        <CardOperationalSummary request={req} />
      </div>

      {showActions && (
        <div className="px-3.5 pb-3.5 pt-2.5 border-t border-border/30 bg-slate-50/40">
          <KanbanActionSlider
            onDelete={onDelete}
            onReject={!rejected ? onRejectBudget : undefined}
          />
        </div>
      )}

      {showShippingAction && (
        <div
          className="px-3.5 pb-3.5 pt-2.5 border-t border-border/30 bg-orange-50/50"
          onClick={(e) => e.stopPropagation()}
        >
          {hasShippingLabel ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-lg px-2.5 py-2 truncate">
                Rastreio: {req.shippingLabel?.trackingCode}
              </div>
              {onDownloadShippingLabel && (
                <button
                  type="button"
                  title="Baixar etiqueta novamente"
                  disabled={isDownloadingShippingLabel}
                  onClick={onDownloadShippingLabel}
                  className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-orange-200/80 bg-orange-50 text-brand-orange hover:bg-orange-100 transition-colors disabled:opacity-60"
                >
                  {isDownloadingShippingLabel ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          ) : onGenerateShippingLabel ? (
            <button
              type="button"
              disabled={isGeneratingShippingLabel}
              onClick={onGenerateShippingLabel}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-[11px] font-semibold rounded-lg transition-colors"
            >
              {isGeneratingShippingLabel ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Package className="h-3.5 w-3.5" />
              )}
              <span>{isGeneratingShippingLabel ? "Gerando..." : "Gerar etiquetas"}</span>
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}
