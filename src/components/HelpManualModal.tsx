/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Download, ExternalLink } from "lucide-react";
import ModalShell from "./ui/ModalShell";
import ActionButton from "./ui/ActionButton";
import { TRAINING_MANUAL, pdfViewerUrl } from "../config/help";

interface HelpManualModalProps {
  onClose: () => void;
}

export default function HelpManualModal({ onClose }: HelpManualModalProps) {
  return (
    <ModalShell
      onClose={onClose}
      maxWidth="5xl"
      zIndex="z-[60]"
      className="w-[min(96vw,1200px)] h-[min(82vh,calc(100vh-4rem))]"
    >
      <div className="flex flex-col h-full min-h-0">
        <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-14">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-heading truncate">{TRAINING_MANUAL.title}</h2>
            <p className="text-xs text-text-secondary">Guia de treinamento do sistema</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ActionButton
              variant="secondary"
              size="sm"
              icon={<ExternalLink className="h-3.5 w-3.5" />}
              onClick={() => window.open(TRAINING_MANUAL.pdfUrl, "_blank", "noopener,noreferrer")}
            >
              Abrir em nova aba
            </ActionButton>
            <a href={TRAINING_MANUAL.pdfUrl} download>
              <ActionButton variant="primary" size="sm" icon={<Download className="h-3.5 w-3.5" />}>
                Baixar PDF
              </ActionButton>
            </a>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-2 sm:p-3">
          <iframe
            title={TRAINING_MANUAL.title}
            src={pdfViewerUrl(TRAINING_MANUAL.pdfUrl)}
            className="w-full h-full min-h-0 border-0 bg-white rounded-xl"
          />
        </div>
      </div>
    </ModalShell>
  );
}
