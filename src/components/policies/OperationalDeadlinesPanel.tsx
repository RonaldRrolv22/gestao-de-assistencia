/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Clock } from "lucide-react";
import { OPERATIONAL_DEADLINES } from "../../config/operationalDeadlines";

export default function OperationalDeadlinesPanel() {
  return (
    <section className="space-y-4">
      <div className="px-1">
        <p className="reports-section-label">Prazos operacionais</p>
        <p className="text-xs text-text-secondary/75 mt-1 max-w-2xl leading-relaxed">
          Referência informativa para a equipe técnica e comercial. Os prazos abaixo orientam cada
          etapa do fluxo de assistência.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {OPERATIONAL_DEADLINES.map((item) => (
          <article
            key={item.id}
            className="report-panel p-5 sm:p-6 flex gap-4 items-start"
          >
            <span className="w-10 h-10 icon-badge-gradient rounded-xl shadow-glow-orange shrink-0">
              <Clock className="h-5 w-5" />
            </span>
            <div className="min-w-0 space-y-2">
              <div>
                <h3 className="font-bold text-heading text-sm sm:text-base">{item.title}</h3>
                <p className="text-[11px] font-semibold text-brand-orange mt-1">{item.shortLabel}</p>
              </div>
              <p className="text-xs text-text-secondary/80 leading-relaxed">{item.description}</p>
              {item.excludeWarranty && (
                <p className="text-[10px] text-slate-500 italic">
                  Aplica-se somente a casos fora da garantia.
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
