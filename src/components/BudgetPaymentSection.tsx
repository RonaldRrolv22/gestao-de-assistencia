/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BudgetPayment, MaintenanceRequest } from "../types";
import {
  generatePixPayment,
  generatePixPaymentByToken,
  generateCardLink,
  generateCardLinkByToken,
  verifyPaymentStatus,
  verifyPaymentStatusByToken,
  createPublicPaymentLink,
} from "../services/pagarmeApi";
import { CheckCircle2 } from "lucide-react";
import PaymentPanel from "./payment/PaymentPanel";
import { isCardPaymentLinkCurrent } from "../utils/budgetPaymentSync";

interface BudgetPaymentSectionProps {
  request: MaintenanceRequest;
  totalFinal: number;
  shipping?: number;
  paymentOverride?: BudgetPayment;
  externalLoadingCard?: boolean;
  externalAutoCardError?: string | null;
  publicToken?: string;
  compact?: boolean;
  onPaid?: () => void;
  onPaymentChange?: (payment: BudgetPayment) => void;
}

export default function BudgetPaymentSection({
  request,
  totalFinal,
  shipping = 0,
  paymentOverride,
  externalLoadingCard = false,
  externalAutoCardError = null,
  publicToken,
  compact = false,
  onPaid,
  onPaymentChange,
}: BudgetPaymentSectionProps) {
  const initial = request.budgetPayment;
  const [payment, setPayment] = useState<BudgetPayment | undefined>(initial);
  const [loadingPix, setLoadingPix] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(
    initial?.publicToken ? `${window.location.origin}/pagamento/${initial.publicToken}` : null
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [syncingPix, setSyncingPix] = useState(false);
  const [pixExpired, setPixExpired] = useState(false);
  const totalFinalRef = useRef(totalFinal);
  totalFinalRef.current = totalFinal;

  const notifyPayment = (next: BudgetPayment) => {
    setPayment(next);
    onPaymentChange?.(next);
  };

  useEffect(() => {
    if (paymentOverride) {
      setPayment(paymentOverride);
      return;
    }
    const remote = request.budgetPayment;
    if (!remote) return;
    setPayment((local) => {
      const liveCents = Math.round(totalFinalRef.current * 100);
      if (
        local?.status === "pending" &&
        local.pixQrCode &&
        local.amountCents === liveCents &&
        remote.amountCents !== liveCents
      ) {
        return local;
      }
      return remote;
    });
    if (remote.publicToken) {
      setPublicUrl(`${window.location.origin}/pagamento/${remote.publicToken}`);
    }
  }, [request.budgetPayment, paymentOverride]);

  const handleVerify = useCallback(async () => {
    setLoadingVerify(true);
    setError(null);
    try {
      const result = publicToken
        ? await verifyPaymentStatusByToken(publicToken)
        : await verifyPaymentStatus(request.id);
      if (result.paid) {
        setPayment((p) => {
          const next = p ? { ...p, status: "paid" as const } : p;
          if (next) onPaymentChange?.(next);
          return next;
        });
        setMessage("Pagamento confirmado! A O.S. será movida para Em Manutenção.");
        onPaid?.();
      } else {
        setPayment((p) => {
          if (result.status === "expired" && p?.pixQrCode && p.status === "pending") {
            return p;
          }
          const next = p ? { ...p, status: result.status } : p;
          if (next) onPaymentChange?.(next);
          return next;
        });
        setMessage(result.status === "pending" ? "Pagamento ainda não identificado." : undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao verificar pagamento.");
    } finally {
      setLoadingVerify(false);
    }
  }, [publicToken, request.id, onPaid]);

  useEffect(() => {
    if (payment?.status !== "pending") return;
    const interval = setInterval(() => {
      handleVerify();
    }, 10000);
    return () => clearInterval(interval);
  }, [payment?.status, handleVerify]);

  const handlePix = useCallback(
    async (refresh = false, amountCentsOverride?: number) => {
      const amountCents = amountCentsOverride ?? Math.round(totalFinalRef.current * 100);
      if (amountCents <= 0) {
        setError("Informe um valor maior que zero (peças, serviços ou frete) antes de gerar o pagamento.");
        return;
      }
      setLoadingPix(true);
      setSyncingPix(refresh);
      setError(null);
      setMessage(refresh ? "Atualizando PIX para o novo valor..." : null);
      try {
        const result = publicToken
          ? await generatePixPaymentByToken(publicToken, refresh, amountCents)
          : await generatePixPayment(request.id, refresh, amountCents);
        notifyPayment(result);
        setPixExpired(false);
        setMessage(
          refresh
            ? "PIX atualizado para o valor do orçamento."
            : result.pixQrCode
              ? "PIX gerado. Escaneie o QR code ou copie o código."
              : undefined
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao gerar PIX.");
      } finally {
        setLoadingPix(false);
        setSyncingPix(false);
      }
    },
    [publicToken, request.id, onPaymentChange]
  );

  const pixAmountCents = payment?.pixAmountCents ?? payment?.amountCents ?? 0;
  const liveAmountCents = Math.round(totalFinal * 100);
  const pixAmountMismatch =
    !compact &&
    !request.budget?.isWarranty &&
    payment?.status === "pending" &&
    !!payment?.pixQrCode &&
    liveAmountCents > 0 &&
    pixAmountCents !== liveAmountCents;
  const cardAmountMismatch =
    !compact &&
    !request.budget?.isWarranty &&
    payment?.status !== "paid" &&
    !!payment?.paymentLinkUrl &&
    shipping > 0 &&
    liveAmountCents > 0 &&
    !isCardPaymentLinkCurrent(payment, liveAmountCents, shipping);

  const handleCard = async () => {
    const amountCents = Math.round(totalFinalRef.current * 100);
    if (amountCents <= 0) {
      setError("Informe um valor maior que zero (peças, serviços ou frete) antes de gerar o pagamento.");
      return;
    }
    setLoadingCard(true);
    setError(null);
    try {
      const result = publicToken
        ? await generateCardLinkByToken(publicToken, amountCents)
        : await generateCardLink(request.id, amountCents);
      notifyPayment(result);
      setMessage("Link de cartão gerado (parcelamento em até 10x, conforme valor mínimo por parcela).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar link de cartão.");
    } finally {
      setLoadingCard(false);
    }
  };

  useEffect(() => {
    if (!cardAmountMismatch || loadingCard || externalLoadingCard) return;
    void handleCard();
  }, [cardAmountMismatch, loadingCard, externalLoadingCard, totalFinal, shipping]);

  const handlePublicLink = async () => {
    if (publicUrl && !compact) return;
    setLoadingLink(true);
    setError(null);
    try {
      const result = await createPublicPaymentLink(request.id);
      setPublicUrl(result.url);
      notifyPayment({
        ...(payment || { status: "none", amountCents: Math.round(totalFinalRef.current * 100) }),
        publicToken: result.token,
      });
      setMessage("Link público copiado — envie ao cliente.");
      await navigator.clipboard.writeText(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar link público.");
    } finally {
      setLoadingLink(false);
    }
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setMessage("Copiado!");
  };

  if (payment?.status === "paid" || request.columnId === "manutencao") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 text-xs flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <span>Pagamento confirmado. O.S. em manutenção.</span>
      </div>
    );
  }

  const displayError = error || externalAutoCardError;
  const combinedLoadingCard = loadingCard || externalLoadingCard;

  return (
    <PaymentPanel
      totalFinal={totalFinal}
      shipping={shipping}
      payment={payment}
      compact={compact}
      publicToken={!!publicToken}
      error={displayError}
      message={message}
      syncingPix={syncingPix || loadingPix}
      pixAmountMismatch={pixAmountMismatch}
      pixAmountCents={pixAmountCents}
      pixExpired={pixExpired}
      loadingPix={loadingPix}
      loadingCard={combinedLoadingCard}
      loadingVerify={loadingVerify}
      loadingLink={loadingLink}
      publicUrl={publicUrl}
      onGeneratePix={() => handlePix(false)}
      onGenerateCard={handleCard}
      onPublicLink={handlePublicLink}
      onVerify={handleVerify}
      onRefreshPix={() => handlePix(true)}
      onCopy={copyText}
    />
  );
}
