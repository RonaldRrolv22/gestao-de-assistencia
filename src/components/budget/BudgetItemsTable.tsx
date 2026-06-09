/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Trash2 } from "lucide-react";
import { BudgetItemProduct, BudgetItemService } from "../../types";
import { formatCurrency } from "../../utils";
import SummaryCard from "../ui/SummaryCard";

interface BudgetItemsTableProps {
  budgetProducts: BudgetItemProduct[];
  budgetServices: BudgetItemService[];
  canEdit: boolean;
  showErrors: boolean;
  onRemoveProduct: (id: string) => void;
  onRemoveService: (id: string) => void;
}

export default function BudgetItemsTable({
  budgetProducts,
  budgetServices,
  canEdit,
  showErrors,
  onRemoveProduct,
  onRemoveService,
}: BudgetItemsTableProps) {
  const isEmpty = budgetProducts.length === 0 && budgetServices.length === 0;
  const hasError = showErrors && isEmpty;

  return (
    <SummaryCard title="Itens do orçamento" subtitle="Peças e serviços incluídos" className="overflow-visible">
      {hasError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 text-danger rounded-xl text-xs font-semibold animate-pulse no-print">
          * É obrigatório incluir pelo menos uma peça ou serviço no orçamento para poder aprová-lo.
        </div>
      )}

      <div
        className={`border rounded-xl bg-white transition-all duration-300 overflow-x-auto ${
          hasError ? "border-red-400 ring-2 ring-red-500/15" : "border-slate-200/90"
        }`}
      >
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              <th className="py-2.5 px-4">Tipo</th>
              <th className="py-2.5 px-4">Descrição</th>
              <th className="py-2.5 px-4 text-center">Qtd</th>
              <th className="py-2.5 px-4 text-right">Unitário</th>
              <th className="py-2.5 px-4 text-right">Total</th>
              {canEdit && <th className="py-2.5 px-4 text-center w-16" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {isEmpty ? (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="py-10 text-center text-text-secondary">
                  Nenhum item adicionado a este orçamento ainda.
                </td>
              </tr>
            ) : (
              <>
                {budgetProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-semibold text-slate-700 uppercase font-mono text-[10px]">Peça</td>
                    <td className="py-2.5 px-4 text-text-primary font-medium">{p.description}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold">{p.quantity}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(p.unitValue)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">{formatCurrency(p.totalValue)}</td>
                    {canEdit && (
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onRemoveProduct(p.id)}
                          className="text-text-secondary hover:text-danger p-1 rounded hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {budgetServices.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-semibold text-slate-500 uppercase font-mono text-[10px]">Serviço</td>
                    <td className="py-2.5 px-4 text-text-primary font-medium">{s.description}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold">{s.quantity}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(s.unitValue)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">{formatCurrency(s.totalValue)}</td>
                    {canEdit && (
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onRemoveService(s.id)}
                          className="text-text-secondary hover:text-danger p-1 rounded hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </SummaryCard>
  );
}
