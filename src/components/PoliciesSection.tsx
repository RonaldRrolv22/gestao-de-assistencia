/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ArrowLeft, Download, ExternalLink, FileText, Truck } from "lucide-react";
import { POLICY_DOCUMENTS, PolicyDocument } from "../config/policies";
import OperationalDeadlinesPanel from "./policies/OperationalDeadlinesPanel";
import PageHeader from "./ui/PageHeader";
import ActionButton from "./ui/ActionButton";

function pdfViewerUrl(url: string): string {
  return `${url}#view=FitH&toolbar=1`;
}

export default function PoliciesSection() {
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyDocument | null>(null);

  if (selectedPolicy) {
    return (
      <div className="app-tab-fill bg-bg">
        <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedPolicy(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-brand-orange transition-colors shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
              <div className="h-5 w-px bg-border hidden sm:block" />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-heading truncate">
                  {selectedPolicy.title}
                </h2>
                <p className="text-[11px] text-text-secondary truncate">{selectedPolicy.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ActionButton
                variant="secondary"
                size="sm"
                icon={<ExternalLink className="h-3.5 w-3.5" />}
                onClick={() => window.open(selectedPolicy.pdfUrl, "_blank", "noopener,noreferrer")}
              >
                Abrir em nova aba
              </ActionButton>
              <a href={selectedPolicy.pdfUrl} download>
                <ActionButton variant="primary" size="sm" icon={<Download className="h-3.5 w-3.5" />}>
                  Baixar PDF
                </ActionButton>
              </a>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-3">
          <div className="flex-1 min-h-0 w-full report-panel overflow-hidden flex flex-col">
            <iframe
              title={selectedPolicy.title}
              src={pdfViewerUrl(selectedPolicy.pdfUrl)}
              className="w-full h-full min-h-0 flex-1 border-0 bg-white"
              style={{ minHeight: 0 }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-tab-scroll reports-page">
      <div className="p-4 sm:p-6 lg:p-8 pb-12 space-y-6 max-w-[1440px] mx-auto w-full">
        <PageHeader
          variant="page"
          title="Políticas"
          subtitle="Documentos oficiais e diretrizes da operação"
        />

        <OperationalDeadlinesPanel />

        <section className="space-y-4">
          <p className="reports-section-label px-1">Documentos disponíveis</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {POLICY_DOCUMENTS.map((policy) => (
              <PolicyCard key={policy.id} policy={policy} onOpen={() => setSelectedPolicy(policy)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function PolicyCard({
  policy,
  onOpen,
}: {
  policy: PolicyDocument;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="report-panel text-left p-5 sm:p-6 flex flex-col gap-4 hover:border-orange-200/60 transition-all group w-full"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="w-10 h-10 icon-badge-gradient rounded-xl shadow-glow-orange shrink-0">
          {policy.id.includes("frete") ? (
            <Truck className="h-5 w-5" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
        </span>
        {policy.year && (
          <span className="text-[10px] font-bold text-brand-orange bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">
            {policy.year}
          </span>
        )}
      </div>
      <div>
        <h3 className="font-bold text-heading text-sm sm:text-base group-hover:text-brand-orange transition-colors">
          {policy.title}
        </h3>
        <p className="text-xs text-text-secondary/75 mt-1.5 leading-relaxed">{policy.description}</p>
      </div>
      <span className="text-[11px] font-semibold text-brand-orange mt-auto">
        Visualizar documento →
      </span>
    </button>
  );
}
