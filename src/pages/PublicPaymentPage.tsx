/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { fetchPublicPaymentSummary, PublicPaymentSummary } from "../services/pagarmeApi";
import BudgetPaymentSection from "../components/BudgetPaymentSection";
import SummaryCard from "../components/ui/SummaryCard";
import GradientHeader from "../components/ui/GradientHeader";
import BrandLogo from "../components/ui/BrandLogo";
import { formatCurrency } from "../utils";
import { Loader2 } from "lucide-react";
import { MaintenanceRequest } from "../types";

interface PublicPaymentPageProps {
  token: string;
}

export default function PublicPaymentPage({ token }: PublicPaymentPageProps) {
  const [summary, setSummary] = useState<PublicPaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublicPaymentSummary(token);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link inválido.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-6">
        <SummaryCard title="Pagamento indisponível">
          <p className="text-danger font-medium text-sm">{error || "Pagamento não encontrado."}</p>
        </SummaryCard>
      </div>
    );
  }

  if (summary.isWarranty) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-6">
        <SummaryCard title="Garantia técnica">
          <p className="text-sm text-text-secondary">
            Este orçamento está coberto por garantia e não requer pagamento online.
          </p>
        </SummaryCard>
      </div>
    );
  }

  const fakeRequest = {
    id: summary.requestId,
    requestNumber: summary.requestNumber,
    columnId: summary.columnId,
    clientName: summary.clientName,
    clientCompany: summary.clientCompany,
    productName: summary.productName,
    budgetPayment: summary.budgetPayment,
  } as MaintenanceRequest;

  return (
    <div className="min-h-screen bg-bg py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="rounded-xl overflow-hidden border border-border shadow-card bg-card">
          <GradientHeader>
            <BrandLogo size="sm" />
            <p className="text-xs text-text-secondary font-mono mt-2">O.S. {summary.requestId}</p>
          </GradientHeader>
        </div>

        <SummaryCard title="Resumo do orçamento">
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-text-secondary">Cliente:</span>{" "}
              <strong className="text-text-primary">{summary.clientName}</strong> — {summary.clientCompany}
            </p>
            <p>
              <span className="text-text-secondary">Equipamento:</span> {summary.productName}
            </p>
            <p className="text-2xl font-bold text-text-primary pt-3 border-t border-border tracking-tight">
              {formatCurrency(summary.totalFinal)}
            </p>
          </div>
        </SummaryCard>

        <BudgetPaymentSection
          request={fakeRequest}
          totalFinal={summary.totalFinal}
          publicToken={token}
          compact
          onPaid={load}
        />
      </div>
    </div>
  );
}
