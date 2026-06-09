/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ClipboardList, Plus } from "lucide-react";
import { MaintenanceRequest } from "../../types";
import EmptyState from "../ui/EmptyState";
import ServiceOrderCard from "./ServiceOrderCard";
import { KanbanColumnConfig } from "./kanbanConfig";

interface KanbanColumnProps {
  config: KanbanColumnConfig;
  requests: MaintenanceRequest[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onAddRequest?: () => void;
  onCardClick: (req: MaintenanceRequest) => void;
  onDragStart: (e: React.DragEvent, reqId: string) => void;
  onDeleteCard?: (req: MaintenanceRequest) => void;
  onRejectBudget?: (req: MaintenanceRequest) => void;
  onGenerateShippingLabel?: (req: MaintenanceRequest) => void;
  onDownloadShippingLabel?: (req: MaintenanceRequest) => void;
  shippingLabelLoadingId?: string | null;
  shippingLabelDownloadLoadingId?: string | null;
}

export default function KanbanColumn({
  config,
  requests,
  onDragOver,
  onDrop,
  onAddRequest,
  onCardClick,
  onDragStart,
  onDeleteCard,
  onRejectBudget,
  onGenerateShippingLabel,
  onDownloadShippingLabel,
  shippingLabelLoadingId,
  shippingLabelDownloadLoadingId,
}: KanbanColumnProps) {
  const isOrcamentoColumn = config.id === "orcamento";
  const isLiberadoColumn = config.id === "liberado";
  const stepLabel = config.shortTitle ?? config.title;

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      id={`kanban-column-${config.id}`}
      className={`kanban-column flex flex-col min-w-[268px] flex-1 self-stretch ${config.accentClass}`}
    >
      <div className="kanban-column-header flex items-center justify-between gap-2 px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`kanban-column-dot ${config.dotClass}`} />
          <div className="min-w-0">
            <h3 className="text-[11px] font-semibold text-heading truncate leading-tight">
              {stepLabel}
            </h3>
            {config.subtitle && (
              <p className="text-[10px] text-text-secondary/80 truncate mt-0.5">{config.subtitle}</p>
            )}
          </div>
        </div>
        <span className="kanban-column-count">{requests.length}</span>
      </div>

      {config.id === "solicitacao" && onAddRequest && (
        <div className="px-3 pt-2 pb-2 shrink-0">
          <button
            type="button"
            id="btn-trigger-new-solicitacao"
            onClick={onAddRequest}
            className="kanban-add-btn w-full group"
          >
            <span className="kanban-add-btn-icon">
              <Plus className="h-3.5 w-3.5 icon-plus-animate" />
            </span>
            <span>Nova Solicitação de O.S.</span>
          </button>
        </div>
      )}

      <div className="flex flex-col flex-1 px-3 pb-3 pt-2 gap-2">
        {requests.length === 0 ? (
          <EmptyState
            fill
            title="Nenhuma O.S."
            description={
              config.id === "solicitacao"
                ? "Crie uma solicitação ou arraste cards para cá."
                : "Arraste cards para esta etapa."
            }
            icon={<ClipboardList className="h-4 w-4" />}
          />
        ) : (
          <>
            <div className="space-y-2.5">
              {requests.map((req) => (
                <ServiceOrderCard
                  key={req.id}
                  request={req}
                  onClick={() => onCardClick(req)}
                  onDragStart={(e) => onDragStart(e, req.id)}
                  onDelete={isOrcamentoColumn && onDeleteCard ? () => onDeleteCard(req) : undefined}
                  onRejectBudget={
                    isOrcamentoColumn && onRejectBudget ? () => onRejectBudget(req) : undefined
                  }
                  onGenerateShippingLabel={
                    isLiberadoColumn && onGenerateShippingLabel
                      ? () => onGenerateShippingLabel(req)
                      : undefined
                  }
                  onDownloadShippingLabel={
                    isLiberadoColumn && onDownloadShippingLabel && req.shippingLabel?.trackingCode
                      ? () => onDownloadShippingLabel(req)
                      : undefined
                  }
                  isGeneratingShippingLabel={shippingLabelLoadingId === req.id}
                  isDownloadingShippingLabel={shippingLabelDownloadLoadingId === req.id}
                />
              ))}
            </div>
            <div className="kanban-drop-zone min-h-[72px] shrink-0 rounded-lg" aria-hidden />
          </>
        )}
      </div>
    </div>
  );
}
