/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Calendar, FileDown, FileSpreadsheet } from "lucide-react";
import ActionButton from "../ui/ActionButton";

const PERIOD_OPTIONS: { value: "30" | "90" | "year" | "all"; label: string }[] = [
  { value: "all", label: "Todo período" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "year", label: "Este ano" },
];

interface ReportsHeaderToolbarProps {
  timeFilter: "30" | "90" | "year" | "all";
  onTimeFilterChange: (value: "30" | "90" | "year" | "all") => void;
  onExportCsv: () => void;
  onDownloadPdf: () => void;
  exportingPdf: boolean;
  compact?: boolean;
}

export default function ReportsHeaderToolbar({
  timeFilter,
  onTimeFilterChange,
  onExportCsv,
  onDownloadPdf,
  exportingPdf,
  compact = false,
}: ReportsHeaderToolbarProps) {
  if (compact) {
    return (
      <div className="flex flex-col gap-2 w-full lg:flex-row lg:items-center lg:justify-end lg:gap-3">
        <div className="flex items-center gap-2 glass-toolbar rounded-xl p-1 w-full lg:w-auto overflow-x-auto report-chart-scroll relative z-10">
          <Calendar className="h-3.5 w-3.5 text-brand-orange shrink-0 ml-0.5 hidden sm:block" />
          <div className="flex items-center gap-0.5 min-w-0 relative z-10">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onTimeFilterChange(opt.value)}
                aria-pressed={timeFilter === opt.value}
                className={`report-period-pill relative z-10 ${timeFilter === opt.value ? "report-period-pill-active" : ""}`}
                id={opt.value === "all" ? "time-filter-select" : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <ActionButton
            variant="secondary"
            size="sm"
            icon={<FileSpreadsheet className="h-3.5 w-3.5 text-brand-orange" />}
            onClick={onExportCsv}
            className="flex-1 lg:flex-none"
          >
            Exportar XLS
          </ActionButton>
          <ActionButton
            variant="primary"
            size="sm"
            loading={exportingPdf}
            icon={<FileDown className="h-3.5 w-3.5" />}
            onClick={onDownloadPdf}
            className="flex-1 lg:flex-none"
          >
            {exportingPdf ? "Gerando PDF..." : "Baixar PDF"}
          </ActionButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
      <div className="flex items-center gap-2 glass-toolbar rounded-xl p-1.5 w-full lg:w-auto overflow-x-auto report-chart-scroll relative z-10">
        <Calendar className="h-4 w-4 text-brand-orange shrink-0 ml-1 hidden sm:block" />
        <div className="flex items-center gap-1 min-w-0 relative z-10">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onTimeFilterChange(opt.value)}
              aria-pressed={timeFilter === opt.value}
              className={`report-period-pill relative z-10 ${timeFilter === opt.value ? "report-period-pill-active" : ""}`}
              id={opt.value === "all" ? "time-filter-select" : undefined}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <ActionButton
          variant="secondary"
          size="sm"
          icon={<FileSpreadsheet className="h-4 w-4 text-brand-orange" />}
          onClick={onExportCsv}
          className="flex-1 sm:flex-none"
        >
          Exportar XLS
        </ActionButton>
        <ActionButton
          variant="primary"
          size="sm"
          loading={exportingPdf}
          icon={<FileDown className="h-4 w-4" />}
          onClick={onDownloadPdf}
          className="flex-1 sm:flex-none"
        >
          {exportingPdf ? "Gerando PDF..." : "Baixar PDF"}
        </ActionButton>
      </div>
    </div>
  );
}
