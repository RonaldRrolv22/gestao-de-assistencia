/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MaintenanceRequest, ProductCatalog, ServiceCatalog, Budget, BudgetItemProduct, BudgetItemService, BudgetPayment } from "../types";
import { 
  X, 
  Sparkles, 
  Calculator, 
  FileCheck, 
  BadgeHelp,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Truck,
  XCircle,
  Ban,
  Printer,
  Mail
} from "lucide-react";
import { formatCurrency, formatDate } from "../utils";
import { downloadHtmlAsPdf } from "../utils/pdfExport";
import { buildBudgetCommercialHtml, buildFreteSummaryLabel, resolveBudgetPdfPaymentInfo } from "../utils/budgetCommercialPdf";
import { generateCardLink } from "../services/pagarmeApi";
import BudgetCommercialPaymentBlock from "./budget/BudgetCommercialPaymentBlock";
import BudgetPaymentSection from "./BudgetPaymentSection";
import { formatRequestDisplayId } from "../services/requestIds";
import {
  appNoticeError,
  appNoticeSuccess,
  appNoticeWarning,
} from "../utils/appNotice";
import ConfirmDialog from "./ui/ConfirmDialog";
import BudgetOsSummaryCard from "./budget/BudgetOsSummaryCard";
import WarrantyCard from "./budget/WarrantyCard";
import BudgetAddItemForms from "./budget/BudgetAddItemForms";
import BudgetItemsTable from "./budget/BudgetItemsTable";
import FinancialSummaryCard from "./budget/FinancialSummaryCard";
import StickyActionFooter from "./budget/StickyActionFooter";
import EmailStatusIcons from "./ui/EmailStatusIcons";
import { sendBudgetEmail } from "../services/documentEmailApi";

interface BudgetModalProps {
  request: MaintenanceRequest;
  productsCatalog: ProductCatalog[];
  servicesCatalog: ServiceCatalog[];
  onSaveBudget: (requestId: string, budget: Budget) => void | Promise<void>;
  onApproveBudget: (requestId: string) => void;
  onRejectBudget: (requestId: string) => void;
  onClose: () => void;
  canEdit: boolean;
  initialShowPdf?: boolean;
}

const ORIGIN_CEP_DISPLAY = "50030-917";

function maskCep(value: string): string {
  const clean = value.replace(/\D/g, "");
  if (clean.length > 5) return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
  return clean;
}

/** Mantém apenas PAC e SEDEX dos Correios na cotação. */
function isCorreiosPacOrSedex(opt: { name?: string; company?: { name?: string } }): boolean {
  const company = opt.company?.name?.toLowerCase() ?? "";
  const name = opt.name?.toLowerCase().trim() ?? "";
  return company.includes("correios") && (name === "pac" || name === "sedex");
}

export default function BudgetModal({
  request,
  productsCatalog,
  servicesCatalog,
  onSaveBudget,
  onApproveBudget,
  onRejectBudget,
  onClose,
  canEdit,
  initialShowPdf = false
}: BudgetModalProps) {
  
  // Set up local state for budgeting editing
  const [isWarranty, setIsWarranty] = useState(request.budget?.isWarranty || false);
  const [budgetProducts, setBudgetProducts] = useState<BudgetItemProduct[]>(request.budget?.products || []);
  const [budgetServices, setBudgetServices] = useState<BudgetItemService[]>(request.budget?.services || []);
  const [discount, setDiscount] = useState<number>(request.budget?.discount || 0);
  const [shipping, setShipping] = useState<number>(request.budget?.shipping || 0);
  const [shippingCep, setShippingCep] = useState(() => maskCep(request.clientCep || ""));
  const [shippingService, setShippingService] = useState<string>(request.budget?.shippingService || "");
  const [cepError, setCepError] = useState("");
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState("");
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const savedCepDigits = (request.clientCep || "").replace(/\D/g, "");
  const hasSavedShipping = (request.budget?.shipping || 0) > 0 && savedCepDigits.length === 8;
  const lastQuotedCepRef = useRef(hasSavedShipping ? savedCepDigits : "");
  const confirmedShippingCepRef = useRef(hasSavedShipping ? savedCepDigits : "");
  
  // Error state
  const [errorLocal, setErrorLocal] = useState("");
  const [showSaveDraftConfirm, setShowSaveDraftConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showSendEmailConfirm, setShowSendEmailConfirm] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  // PDF Printable Mode overlay
  const [showPdfPreview, setShowPdfPreview] = useState(initialShowPdf);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [paymentSnapshot, setPaymentSnapshot] = useState<BudgetPayment | undefined>(request.budgetPayment);
  const [autoCardLoading, setAutoCardLoading] = useState(false);
  const [autoCardError, setAutoCardError] = useState<string | null>(null);
  const paymentSnapshotRef = useRef(paymentSnapshot);
  paymentSnapshotRef.current = paymentSnapshot;
  const calculatedTotalRef = useRef(0);

  useEffect(() => {
    setPaymentSnapshot(request.budgetPayment);
  }, [request.budgetPayment]);

  // Catalog selectors helper
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productQty, setProductQty] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceQty, setServiceQty] = useState(1);

  // Filter products catalog to match compatible equipment
  const filteredProductsCatalog = productsCatalog.filter(p => {
    if (!p.compatibleProducts || p.compatibleProducts.length === 0) return true;
    return p.compatibleProducts.includes(request.productName);
  });

  // If guarantee is toggled, adjust rates to R$ 0.00
  // But we want to maintain the real tables internally so if they untoggle, prices restore!
  // Let's implement active calculations dynamically.
  
  const getProductPrice = (productId: string) => {
    const cat = productsCatalog.find(p => p.id === productId);
    return cat ? cat.baseValue : 0;
  };

  const getServicePrice = (serviceId: string) => {
    const cat = servicesCatalog.find(s => s.id === serviceId);
    return cat ? cat.baseValue : 0;
  };

  // Recalculate values when warranty is toggled
  useEffect(() => {
    // Regenerate totals on products
    setBudgetProducts(prev => prev.map(item => {
      const unit = getProductPrice(item.productId);
      return {
        ...item,
        unitValue: unit,
        totalValue: unit * item.quantity
      };
    }));

    // Regenerate totals on services
    setBudgetServices(prev => prev.map(item => {
      const unit = getServicePrice(item.serviceId);
      return {
        ...item,
        unitValue: unit,
        totalValue: unit * item.quantity
      };
    }));
  }, [isWarranty]);

  // Calculations
  const subtotalProducts = budgetProducts.reduce((sum, p) => sum + p.totalValue, 0);
  const subtotalServices = budgetServices.reduce((sum, s) => sum + s.totalValue, 0);
  const calculatedSubtotal = subtotalProducts + subtotalServices;
  const finalDiscount = isWarranty ? (calculatedSubtotal + shipping) : discount;
  const calculatedTotal = isWarranty ? 0 : Math.max(0, calculatedSubtotal + shipping - discount);
  calculatedTotalRef.current = calculatedTotal;

  useEffect(() => {
    if (isWarranty || request.columnId !== "orcamento") return;
    if (shipping <= 0) return;
    if (calculatedTotal <= 0) return;
    if (budgetProducts.length === 0 && budgetServices.length === 0) return;
    if (paymentSnapshotRef.current?.status === "paid") return;

    const timer = setTimeout(async () => {
      const amountCents = Math.round(calculatedTotalRef.current * 100);
      const current = paymentSnapshotRef.current;
      if (
        current?.paymentLinkUrl &&
        current.amountCents === amountCents &&
        current.method === "credit_card"
      ) {
        return;
      }

      setAutoCardLoading(true);
      setAutoCardError(null);
      try {
        const result = await generateCardLink(request.id, amountCents);
        setPaymentSnapshot(result);
      } catch (err) {
        setAutoCardError(err instanceof Error ? err.message : "Erro ao gerar link de cartão.");
      } finally {
        setAutoCardLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    shipping,
    calculatedTotal,
    isWarranty,
    budgetProducts.length,
    budgetServices.length,
    request.id,
    request.columnId,
  ]);

  // Handle adding product item
  const handleAddProduct = () => {
    if (!selectedProductId) return;
    const cat = productsCatalog.find(p => p.id === selectedProductId);
    if (!cat) return;

    // Check if product is already in the list to increment instead
    const existingIndex = budgetProducts.findIndex(item => item.productId === selectedProductId);
    if (existingIndex > -1) {
      setBudgetProducts(prev => {
        const copy = [...prev];
        const item = copy[existingIndex];
        const newQty = item.quantity + productQty;
        item.quantity = newQty;
        item.totalValue = item.unitValue * newQty;
        return copy;
      });
    } else {
      const unit = cat.baseValue;
      const newItem: BudgetItemProduct = {
        id: `bp-local-${Date.now()}`,
        productId: cat.id,
        description: cat.description,
        quantity: productQty,
        unitValue: unit,
        totalValue: unit * productQty
      };
      setBudgetProducts(prev => [...prev, newItem]);
    }
    // reset selectors
    setSelectedProductId("");
    setProductQty(1);
  };

  // Handle adding service item
  const handleAddService = () => {
    if (!selectedServiceId) return;
    const cat = servicesCatalog.find(s => s.id === selectedServiceId);
    if (!cat) return;

    // Check if service is already in list
    const existingIndex = budgetServices.findIndex(item => item.serviceId === selectedServiceId);
    if (existingIndex > -1) {
      setBudgetServices(prev => {
        const copy = [...prev];
        const item = copy[existingIndex];
        const newQty = item.quantity + serviceQty;
        item.quantity = newQty;
        item.totalValue = item.unitValue * newQty;
        return copy;
      });
    } else {
      const unit = cat.baseValue;
      const newItem: BudgetItemService = {
        id: `bs-local-${Date.now()}`,
        serviceId: cat.id,
        description: cat.description,
        quantity: serviceQty,
        unitValue: unit,
        totalValue: unit * serviceQty
      };
      setBudgetServices(prev => [...prev, newItem]);
    }
    // reset selectors
    setSelectedServiceId("");
    setServiceQty(1);
  };

  // Removing items
  const handleRemoveProduct = (id: string) => {
    setBudgetProducts(prev => prev.filter(item => item.id !== id));
  };

  const handleRemoveService = (id: string) => {
    setBudgetServices(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveOnly = () => {
    const budgetData: Budget = {
      isWarranty,
      products: budgetProducts,
      services: budgetServices,
      discount: finalDiscount,
      shipping: shipping,
      shippingService: shippingService,
      subtotal: calculatedSubtotal,
      totalFinal: calculatedTotal,
      isApproved: request.budget?.isApproved || false,
      approvedDate: request.budget?.approvedDate
    };
    return onSaveBudget(request.id, budgetData);
  };

  const handleApproveAction = () => {
    // Save first to push current values
    const budgetData: Budget = {
      isWarranty,
      products: budgetProducts,
      services: budgetServices,
      discount: finalDiscount,
      shipping: shipping,
      shippingService: shippingService,
      subtotal: calculatedSubtotal,
      totalFinal: calculatedTotal,
      isApproved: true,
      approvedDate: new Date().toISOString()
    };
    onSaveBudget(request.id, budgetData);
    onApproveBudget(request.id);
    onClose();
  };

  const handleCalculateShipping = useCallback(async (cepOverride?: string) => {
    const cleanCep = (cepOverride ?? shippingCep).replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setCepError("CEP inválido. Deve conter exatamente 8 dígitos.");
      return;
    }
    setCepError("");
    setShippingLoading(true);
    setShippingError("");
    setShippingOptions([]);
    setShowShippingModal(true);
    setSelectedOptionId(null);

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      const response = await fetch("/api/frete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ cep_destino: cleanCep }),
        signal: controller.signal
      });

      clearTimeout(timer);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data && typeof data.message === "string"
            ? data.message
            : `Erro ao consultar frete (código ${response.status}).`;
        throw new Error(message);
      }

      if (!Array.isArray(data)) {
        throw new Error("Resposta da API de frete inválida.");
      }

      const validOptions = data.filter((opt: any) => !opt.error && (opt.price !== undefined || opt.custom_price !== undefined));
      const correiosOptions = validOptions.filter(isCorreiosPacOrSedex);

      if (correiosOptions.length === 0) {
        setShippingError("Nenhuma opção PAC ou SEDEX dos Correios disponível para o CEP informado.");
      } else {
        const getPriceSum = (opt: any) => {
          const priceStr = opt.custom_price !== undefined ? opt.custom_price : opt.price;
          return parseFloat(priceStr) || 0;
        };

        const sorted = correiosOptions.sort((a: any, b: any) => getPriceSum(a) - getPriceSum(b));
        setShippingOptions(sorted);
        lastQuotedCepRef.current = cleanCep;
      }
    } catch (err: unknown) {
      clearTimeout(timer);
      const message =
        err instanceof Error
          ? err.name === "AbortError"
            ? "A consulta de frete excedeu o tempo limite. Tente novamente."
            : err.message
          : "Erro ao consultar frete.";
      setShippingError(message);
      setShipping(0);
      setShippingService("");
      confirmedShippingCepRef.current = "";
    } finally {
      setShippingLoading(false);
    }
  }, [shippingCep]);

  const handleManualCalculateShipping = useCallback(() => {
    const cleanCep = shippingCep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setCepError("CEP inválido. Deve conter exatamente 8 dígitos.");
      return;
    }
    lastQuotedCepRef.current = "";
    confirmedShippingCepRef.current = "";
    setShipping(0);
    setShippingService("");
    void handleCalculateShipping(cleanCep);
  }, [shippingCep, handleCalculateShipping]);

  useEffect(() => {
    const cleanCep = shippingCep.replace(/\D/g, "");
    if (confirmedShippingCepRef.current && cleanCep !== confirmedShippingCepRef.current) {
      setShipping(0);
      setShippingService("");
      confirmedShippingCepRef.current = "";
      lastQuotedCepRef.current = "";
    }
  }, [shippingCep]);

  const pdfPaymentInfo = resolveBudgetPdfPaymentInfo(
    paymentSnapshot,
    isWarranty,
    calculatedTotal,
    shipping,
    autoCardError
  );

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      await handleSaveOnly();
      const result = await sendBudgetEmail(request.id);
      setShowSendEmailConfirm(false);
      appNoticeSuccess(`Orçamento enviado com sucesso para ${result.sentTo}.`);
    } catch (err) {
      appNoticeError(err instanceof Error ? err.message : "Erro ao enviar e-mail.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadPdf = async () => {
    const titleStr = `Orcamento_${request.id}`;
    const htmlContent = buildBudgetCommercialHtml({
      request,
      isWarranty,
      budgetProducts,
      budgetServices,
      subtotalProducts,
      subtotalServices,
      shipping,
      shippingService,
      discount,
      calculatedTotal,
      paymentInfo: pdfPaymentInfo,
    });

    setExportingPdf(true);
    try {
      await downloadHtmlAsPdf(htmlContent, `${titleStr}.pdf`);
    } catch (err) {
      appNoticeError(err instanceof Error ? err.message : "Erro ao gerar PDF. Tente novamente.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePaymentChange = (payment: BudgetPayment) => {
    setPaymentSnapshot(payment);
    if (payment.paymentLinkUrl) {
      setAutoCardError(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
        <div id="budget-modal-container" className="bg-white rounded-3xl w-full max-w-5xl shadow-[0_24px_64px_-12px_rgba(15,23,42,0.18)] border border-slate-200/80 max-h-[92vh] flex flex-col overflow-hidden animate-fade-in text-xs">

          <div className="px-6 py-5 border-b border-slate-200/80 bg-white flex items-start justify-between gap-4 shrink-0">
            <div className="min-w-0 border-l-4 border-brand-orange pl-4">
              <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider bg-orange-50 text-brand-orange border border-orange-200/70 px-2.5 py-1 rounded-full">
                Orçamento Comercial
              </span>
              <h3 className="font-semibold text-base sm:text-lg text-slate-900 mt-2.5 leading-snug tracking-tight">
                Elaboração de Orçamentação Técnica
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-1">
                {formatRequestDisplayId(request.id, request.columnId)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-slate-400 hover:text-slate-600 p-2 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-colors duration-200"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 sm:py-6 space-y-5 bg-slate-50/70 pb-24">
            
            <BudgetOsSummaryCard request={request} />

            <WarrantyCard isWarranty={isWarranty} canEdit={canEdit} onChange={setIsWarranty} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {canEdit && (
                  <BudgetAddItemForms
                    filteredProductsCatalog={filteredProductsCatalog}
                    servicesCatalog={servicesCatalog}
                    selectedProductId={selectedProductId}
                    productQty={productQty}
                    selectedServiceId={selectedServiceId}
                    serviceQty={serviceQty}
                    onProductIdChange={setSelectedProductId}
                    onProductQtyChange={setProductQty}
                    onServiceIdChange={setSelectedServiceId}
                    onServiceQtyChange={setServiceQty}
                    onAddProduct={handleAddProduct}
                    onAddService={handleAddService}
                  />
                )}

                <BudgetItemsTable
                  budgetProducts={budgetProducts}
                  budgetServices={budgetServices}
                  canEdit={canEdit}
                  showErrors={showErrors}
                  onRemoveProduct={handleRemoveProduct}
                  onRemoveService={handleRemoveService}
                />
              </div>

              <div className="lg:col-span-1">
                <FinancialSummaryCard
                  subtotalServices={subtotalServices}
                  subtotalProducts={subtotalProducts}
                  shipping={shipping}
                  discount={discount}
                  calculatedTotal={calculatedTotal}
                  calculatedSubtotal={calculatedSubtotal}
                  isWarranty={isWarranty}
                  canEdit={canEdit}
                  shippingService={shippingService}
                  shippingCep={shippingCep}
                  cepError={cepError}
                  shippingLoading={shippingLoading}
                  onDiscountChange={setDiscount}
                  onShippingCepChange={(value) => {
                    setShippingCep(value);
                    if (value.replace(/\D/g, "").length === 8) setCepError("");
                  }}
                  onCalculateShipping={handleManualCalculateShipping}
                />
              </div>
            </div>

            {!isWarranty && request.columnId === "orcamento" && (
              <BudgetPaymentSection
                request={request}
                totalFinal={calculatedTotal}
                shipping={shipping}
                paymentOverride={paymentSnapshot}
                externalLoadingCard={autoCardLoading}
                externalAutoCardError={autoCardError}
                onPaymentChange={handlePaymentChange}
                onPaid={() => {
                  onClose();
                }}
              />
            )}

          </div>

          <StickyActionFooter
            canEdit={canEdit}
            isWarranty={isWarranty}
            clientEmail={request.clientEmail}
            sendingEmail={sendingEmail}
            emailStatus={<EmailStatusIcons request={request} types={["budget"]} />}
            onExportPdf={() => setShowPdfPreview(true)}
            onSendEmail={canEdit ? () => setShowSendEmailConfirm(true) : undefined}
            onClose={onClose}
            onSaveDraft={() => setShowSaveDraftConfirm(true)}
            onReject={() => setShowRejectConfirm(true)}
            onApproveWarranty={() => {
              if (budgetProducts.length === 0 && budgetServices.length === 0) {
                setShowErrors(true);
                appNoticeWarning("Não é possível aprovar um orçamento vazio. Por favor, adicione pelo menos uma peça ou serviço.");
                return;
              }
              setShowApproveConfirm(true);
            }}
          />

        </div>
      </div>

      {/* PDF PRINT VIEW MODAL */}
      {showPdfPreview && (
        <div id="pdf-preview-backdrop" className="fixed inset-0 bg-slate-950 backdrop-blur-md flex items-center justify-center p-4 z-[55] overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border p-8 flex flex-col justify-between max-h-[96vh]">
            
            {/* Inner actions banner - Hide inside actual browser printer */}
            <div className="mb-4 p-3 bg-orange-50 text-slate-800 rounded-xl flex items-center justify-between no-print text-xs border border-orange-200/60">
              <span className="font-semibold">Pré-visualização do Documento PDF Homologado para Envio / Impressão</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={exportingPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gradient hover:opacity-95 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {exportingPdf ? "Gerando PDF..." : "Baixar PDF Comercial"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (initialShowPdf) {
                      onClose();
                    } else {
                      setShowPdfPreview(false);
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold"
                >
                  Voltar
                </button>
              </div>
            </div>

            {/* Printable Frame wrapper */}
            <div className="flex-1 overflow-y-auto bg-white border border-slate-300 p-8 rounded-lg shadow-inner print:border-0 print:p-0">
              {/* Document Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <img className="h-12 w-12 object-cover rounded" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSLf3i4Iwze_uASijVpUfesTds5X5AGr1thA&s" alt="Logo" />
                    <div>
                      <h2 className="font-sans font-bold text-lg text-slate-900 leading-tight">NEUROBOTS PESQUISA E DESENVOLVIMENTO LTDA</h2>
                      <p className="text-[9px] uppercase tracking-wider font-mono text-slate-500">Soluções de neuroengenharia</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-3 space-y-0.5">
                    <p>NEUROBOTS PESQUISA E DESENVOLVIMENTO LTDA</p>
                    <p>CNPJ: 24.052.658/0001-05</p>
                    <p>contato@neurobots.com.br • (81) 98254-2262</p>
                    <p>Av. Barbosa Lima, 149 - Recife, PE</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-slate-100 border text-slate-800 rounded font-semibold text-xs uppercase font-mono">ORÇAMENTO COMERCIAL</span>
                  <div className="text-[11px] text-slate-600 mt-4 space-y-1">
                    <p><strong>O.S. Ref:</strong> {request.id}</p>
                    <p><strong>Nº Chamado:</strong> {request.requestNumber}</p>
                    <p><strong>Data de Emissão:</strong> {formatDate(request.openingDate)}</p>
                    <p><strong>Garantia:</strong> {isWarranty ? "SIM (Cobertura Total)" : "NÃO (Tabelado Particular)"}</p>
                  </div>
                </div>
              </div>

              {/* Client specifications and device details */}
              <div className="grid grid-cols-2 gap-6 py-5 border-b border-slate-200 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-2 border-l-2 border-slate-800 pl-1.5">CLIENTE DESTINATÁRIO</h4>
                  <p className="font-semibold text-slate-800">{request.clientName}</p>
                  <p className="text-slate-500">{request.clientCompany}</p>
                  <p className="text-slate-500">Endereço: {request.clientAddress}, {request.clientCity}-{request.clientState}</p>
                  <p className="text-slate-500">Contato: {request.clientPhone} • {request.clientEmail}</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-2 border-l-2 border-slate-800 pl-1.5">EQUIPAMENTO E DIAGNÓSTICO</h4>
                  <p className="font-semibold text-slate-800">Modelo: {request.productName}</p>
                  <p className="text-slate-500 font-mono">Sério/Serial: {request.serialNumber || "N/A"}</p>
                  <p className="text-slate-500 mt-2"><strong>Defeito Relatado:</strong></p>
                  <p className="text-slate-600 bg-slate-50 p-2 rounded italic text-[11px] leading-relaxed border border-slate-100">{request.problemDescription}</p>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="py-6">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-3">LISTA DE COMPONENTES E SERVIÇOS</h4>
                
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold">
                      <th className="py-2 px-3">Código</th>
                      <th className="py-2 px-3">Descrição Comercial</th>
                      <th className="py-2 px-3 text-center">Quant.</th>
                      <th className="py-2 px-3 text-right">Unitário</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {budgetProducts.length === 0 && budgetServices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 font-light">Este orçamento não possui itens faturados.</td>
                      </tr>
                    ) : (
                      <>
                        {budgetProducts.map((p) => (
                          <tr key={p.id}>
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-500">PEÇA</td>
                            <td className="py-2 px-3 text-slate-900 font-medium">{p.description}</td>
                            <td className="py-2 px-3 text-center font-mono">{p.quantity}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(p.unitValue)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(p.totalValue)}</td>
                          </tr>
                        ))}

                        {budgetServices.map((s) => (
                          <tr key={s.id}>
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-500">SERVIÇO</td>
                            <td className="py-2 px-3 text-slate-900 font-medium">{s.description}</td>
                            <td className="py-2 px-3 text-center font-mono">{s.quantity}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(s.unitValue)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(s.totalValue)}</td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Summary Block */}
              <div className="flex justify-end pt-3">
                <div className="w-80 border-t-2 border-slate-800 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal de Serviços:</span>
                    <span className="font-mono">{formatCurrency(subtotalServices)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal em Peças:</span>
                    <span className="font-mono">{formatCurrency(subtotalProducts)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{buildFreteSummaryLabel(shipping, shippingService)}</span>
                    <span className="font-mono">{formatCurrency(shipping)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Desconto Aplicado:</span>
                    <span className="font-mono text-emerald-700 font-medium">
                      {isWarranty ? "ISENÇÃO INTEGRAL" : formatCurrency(discount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>VALOR TOTAL GERAL:</span>
                    <span className="font-mono text-brand-orange text-base">{formatCurrency(calculatedTotal)}</span>
                  </div>
                </div>
              </div>

              <BudgetCommercialPaymentBlock info={pdfPaymentInfo} loading={autoCardLoading} />

              {/* Approval signatory frame */}
              <div className="mt-12 pt-10 border-t border-dashed border-slate-300">
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  Declaro para os devidos fins de direito que aceito os termos descritos neste documento orçamentário oficial, autorizando o início imediato dos reparos técnicos nos moldes e custos acordados acima.
                </p>
              </div>

            </div>

            {/* Print action footer */}
            <div className="mt-4 flex justify-end gap-2 pr-2 no-print">
              <button
                type="button"
                onClick={() => setShowPdfPreview(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showSaveDraftConfirm}
        title="Salvar Rascunho?"
        description="Deseja salvar as alterações deste orçamento como um rascunho temporário?"
        confirmLabel="Sim, Salvar"
        icon={<FileCheck className="h-5 w-5" />}
        onCancel={() => setShowSaveDraftConfirm(false)}
        onConfirm={async () => {
          try {
            await handleSaveOnly();
            setShowSaveDraftConfirm(false);
            appNoticeSuccess("Rascunho de orçamento salvo com sucesso.");
          } catch (err) {
            appNoticeError(err instanceof Error ? err.message : "Erro ao salvar rascunho do orçamento.");
          }
        }}
      />

      <ConfirmDialog
        open={showApproveConfirm}
        title="Aprovar Orçamento Técnico?"
        description={`Esta ação aprovará o orçamento no valor de ${formatCurrency(calculatedTotal)} e moverá a O.S. para Em Manutenção.`}
        confirmLabel="Confirmar e Iniciar Manutenção"
        confirmVariant="primary"
        icon={<CheckCircle2 className="h-5 w-5 text-success" />}
        onCancel={() => setShowApproveConfirm(false)}
        onConfirm={() => {
          handleApproveAction();
          setShowApproveConfirm(false);
        }}
      />

      <ConfirmDialog
        open={showSendEmailConfirm}
        title="Enviar orçamento por e-mail?"
        description={`O PDF do orçamento será enviado para ${request.clientEmail || "(sem e-mail)"}.`}
        confirmLabel={sendingEmail ? "Enviando..." : "Enviar e-mail"}
        icon={<Mail className="h-5 w-5 text-brand-orange" />}
        onCancel={() => !sendingEmail && setShowSendEmailConfirm(false)}
        onConfirm={() => void handleSendEmail()}
      />

      <ConfirmDialog
        open={showRejectConfirm}
        title="Recusar Orçamento Técnico?"
        description={`Marcar a O.S. ${request.id} como recusada e encaminhá-la para Orçamentos Recusados?`}
        confirmLabel="Sim, Recusar"
        cancelLabel="Voltar"
        confirmVariant="danger"
        icon={<Ban className="h-5 w-5 text-danger" />}
        onCancel={() => setShowRejectConfirm(false)}
        onConfirm={() => {
          onRejectBudget(request.id);
          setShowRejectConfirm(false);
          onClose();
          appNoticeSuccess("Orçamento marcado como RECUSADO com sucesso.");
        }}
      />

      {/* Shipping Options modal popup */}
      {showShippingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 no-print animate-fade-in text-slate-800">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-sky-600 animate-pulse" />
                <h3 className="font-bold text-sm text-slate-900">Cotação de Envios</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowShippingModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {shippingLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Loader2 className="h-8 w-8 text-sky-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-500">Consultando taxas de frete com Melhor Envio...</p>
                  <p className="text-[10px] text-slate-400 italic">Isso pode levar alguns segundos.</p>
                </div>
              ) : shippingError ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center space-y-3">
                  <p className="text-xs font-semibold text-amber-800">{shippingError}</p>
                  <button
                    type="button"
                    onClick={() => void handleCalculateShipping()}
                    className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg text-[10px] uppercase transition"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-[11px] text-slate-500 font-medium">
                    Opções Correios (PAC e SEDEX) de <strong>{ORIGIN_CEP_DISPLAY}</strong> para <strong>{shippingCep}</strong>:
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {shippingOptions.map((opt, index) => {
                      const costValue = parseFloat(opt.custom_price !== undefined ? opt.custom_price : opt.price || "0");
                      const deliveryDays = opt.custom_delivery_time !== undefined ? opt.custom_delivery_time : (opt.delivery_time || 0);
                      const optionName = `${opt.company.name} ${opt.name}`;
                      const isSelected = selectedOptionId === `${index}-${opt.name}`;

                      return (
                        <div
                          key={`${index}-${opt.name}`}
                          onClick={() => setSelectedOptionId(`${index}-${opt.name}`)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 text-left flex items-center justify-between ${
                            isSelected
                              ? "border-brand-orange bg-orange-50/50 ring-2 ring-brand-orange/20"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {index === 0 && (
                                <span className="text-[8.5px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded tracking-wide">
                                  Mais Barato
                                </span>
                              )}
                              <span className="font-bold text-slate-800 text-xs">{optionName}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-sans">
                              Prazo estimado de entrega: <strong>{deliveryDays} {deliveryDays === 1 ? "dia útil" : "dias úteis"}</strong>
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {formatCurrency(costValue)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!shippingLoading && !shippingError && (
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowShippingModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={selectedOptionId === null}
                  onClick={() => {
                    if (selectedOptionId === null) return;
                    const selectedIdx = parseInt(selectedOptionId.split("-")[0]);
                    const selectedOpt = shippingOptions[selectedIdx];
                    if (selectedOpt) {
                      const cost = parseFloat(selectedOpt.custom_price !== undefined ? selectedOpt.custom_price : selectedOpt.price || "0");
                      const fullName = `${selectedOpt.company.name} ${selectedOpt.name}`;
                      setShipping(cost);
                      setShippingService(fullName);
                      confirmedShippingCepRef.current = shippingCep.replace(/\D/g, "");
                      setShowShippingModal(false);
                      appNoticeSuccess(`Frete adicionado ao orçamento: R$ ${cost.toFixed(2)} (${fullName})`);
                    }
                  }}
                  className={`px-4 py-2 font-bold rounded-xl transition ${
                    selectedOptionId === null
                      ? "bg-slate-105 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : "bg-brand-gradient text-white border border-transparent shadow-sm hover:opacity-95 cursor-pointer animate-fade-in"
                  }`}
                >
                  Confirmar frete selecionado
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
