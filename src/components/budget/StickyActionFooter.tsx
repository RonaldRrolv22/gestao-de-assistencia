/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Ban, CheckCircle2, Mail, Printer } from "lucide-react";
import ActionButton from "../ui/ActionButton";

interface StickyActionFooterProps {
  canSaveDraft: boolean;
  canManageCommercial: boolean;
  isWarranty: boolean;
  showApproveWarranty?: boolean;
  clientEmail?: string;
  sendingEmail?: boolean;
  emailStatus?: React.ReactNode;
  onExportPdf: () => void;
  onSendEmail?: () => void;
  onClose: () => void;
  onSaveDraft: () => void;
  onReject: () => void;
  onApproveWarranty: () => void;
}

export default function StickyActionFooter({
  canSaveDraft,
  canManageCommercial,
  isWarranty,
  showApproveWarranty = true,
  clientEmail,
  sendingEmail = false,
  emailStatus,
  onExportPdf,
  onSendEmail,
  onClose,
  onSaveDraft,
  onReject,
  onApproveWarranty,
}: StickyActionFooterProps) {
  return (
    <div className="sticky bottom-0 z-10 px-4 sm:px-6 py-4 border-t border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-[0_-8px_24px_-8px_rgba(15,23,42,0.08)] flex flex-col gap-3">
      {canManageCommercial && emailStatus ? (
        <div className="flex items-center gap-2">{emailStatus}</div>
      ) : null}
      <div className="flex flex-col sm:flex-row flex-wrap justify-between items-stretch sm:items-center gap-3">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <ActionButton
            id="btn-export-pdf-budget"
            variant="secondary"
            className="w-full sm:w-auto"
            icon={<Printer className="h-4 w-4" />}
            onClick={onExportPdf}
          >
            Visualizar PDF Comercial
          </ActionButton>
          {canManageCommercial && onSendEmail && (
            <ActionButton
              id="btn-send-budget-email"
              variant="secondary"
              className="w-full sm:w-auto"
              icon={<Mail className="h-4 w-4" />}
              onClick={onSendEmail}
              disabled={!clientEmail?.trim() || sendingEmail}
              title={!clientEmail?.trim() ? "Cliente sem e-mail cadastrado" : undefined}
            >
              {sendingEmail ? "Enviando..." : "Enviar por E-mail"}
            </ActionButton>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <ActionButton variant="neutral" onClick={onClose} className="w-full sm:w-auto">
            Fechar
          </ActionButton>
          {canSaveDraft && (
            <ActionButton
              id="btn-save-budget"
              variant="primary"
              onClick={onSaveDraft}
              className="w-full sm:w-auto"
            >
              Salvar Rascunho
            </ActionButton>
          )}
          {canManageCommercial && (
            <>
              <ActionButton
                id="btn-reject-budget"
                variant="danger"
                icon={<Ban className="h-4 w-4" />}
                onClick={onReject}
                className="w-full sm:w-auto"
              >
                Orçamento Recusado
              </ActionButton>
              {isWarranty && showApproveWarranty && (
                <ActionButton
                  id="btn-approve-budget"
                  variant="success"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={onApproveWarranty}
                  className="w-full sm:w-auto"
                >
                  Aprovar (Garantia)
                </ActionButton>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
