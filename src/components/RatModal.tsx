/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { MaintenanceRequest, RAT, LaborRow, RatPartRow, Attachment, PaymentProof } from "../types";
import EmailStatusIcons from "./ui/EmailStatusIcons";
import { 
  X, 
  Plus, 
  Trash2, 
  ClipboardCheck, 
  Clock, 
  Download, 
  CheckSquare, 
  FileText, 
  FileCheck,
  Upload, 
  Paperclip,
  CheckCircle2,
  Printer,
  ChevronRight,
  ShieldCheck,
  Zap,
  Package,
  Loader2,
  FlaskConical,
  Mail,
} from "lucide-react";
import ConfirmDialog from "./ui/ConfirmDialog";
import { formatCurrency, formatDate } from "../utils";
import { formatRequestDisplayId } from "../services/requestIds";
import { downloadShippingLabelZpl } from "../services/shippingLabelApi";
import {
  RAT_BTN_HUB,
  RAT_BTN_OUTLINE_ORANGE,
  RAT_BTN_PRIMARY,
  RAT_BTN_SECONDARY,
  RAT_DEFECT_OPTION,
  RAT_DEFECT_OPTION_ACTIVE,
  RAT_DEFECT_OPTION_IDLE,
  RAT_FOOTER,
  RAT_INPUT,
  RAT_LABEL,
  RAT_SUMMARY_CARD,
  RAT_TEXTAREA,
} from "./rat/ratModalStyles";
import { isAdminProfile } from "../services/userRoles";
import { uploadRequestAttachment, uploadPaymentProof } from "../services/storageService";
import { resolveFileUrl } from "../services/requestIds";
import { downloadHtmlAsPdf, prepareAttachmentsForPdf } from "../utils/pdfExport";
import { buildRatReportHtml } from "../utils/ratReportTemplate";
import {
  appNoticeError,
  appNoticeSuccess,
  appNoticeWarning,
} from "../utils/appNotice";
import { getEmailStatusForType } from "../utils/emailDeliveryStatus";
import { normalizeRat } from "../utils/normalizeRequest";

interface RatModalProps {
  request: MaintenanceRequest;
  onSaveRat: (requestId: string, rat: RAT) => void | Promise<void>;
  onFinalizeRat: (requestId: string) => void | Promise<void>;
  onReopenRat: (requestId: string) => void;
  onReleaseRequest: (requestId: string, payment?: PaymentProof) => void | Promise<void>;
  onGenerateShippingLabel?: (requestId: string) => void | Promise<void>;
  isGeneratingShippingLabel?: boolean;
  onResendTrackingEmail?: (requestId: string) => void | Promise<void>;
  isResendingTrackingEmail?: boolean;
  onOpenHubTestes?: () => void | Promise<void>;
  onClose: () => void;
  canEdit: boolean; // false for non-admins if in finalized, or based on permissions
  readOnly?: boolean;
  initialShowPdf?: boolean;
  currentUser: { name: string; email: string; profile: string };
  onOpenBudget?: (req: MaintenanceRequest) => void;
}

export default function RatModal({
  request,
  onSaveRat,
  onFinalizeRat,
  onReopenRat,
  onReleaseRequest,
  onGenerateShippingLabel,
  isGeneratingShippingLabel = false,
  onResendTrackingEmail,
  isResendingTrackingEmail = false,
  onOpenHubTestes,
  onClose,
  canEdit,
  readOnly = false,
  initialShowPdf = false,
  currentUser,
  onOpenBudget
}: RatModalProps) {

  // Current RAT state
  const isFinalizado = request.rat?.status === "Finalizado";
  const normalizedRat = normalizeRat(request.rat);
  
  // Local edit states
  const [diagnostic, setDiagnostic] = useState(normalizedRat?.diagnostic || request.initialDiagnostic || "");
  const [laborRows, setLaborRows] = useState<LaborRow[]>(normalizedRat?.labor ?? []);
  const [partRows, setPartRows] = useState<RatPartRow[]>(normalizedRat?.parts ?? []);
  const [technicalNotes, setTechnicalNotes] = useState(normalizedRat?.technicalNotes || "");
  const [attachments, setAttachments] = useState<Attachment[]>(normalizedRat?.attachments ?? []);
  const [finalInspectionElectric, setFinalInspectionElectric] = useState<"C" | "NC" | "N/A">(normalizedRat?.finalInspectionElectric || "N/A");
  const [finalInspectionFunctional, setFinalInspectionFunctional] = useState<"C" | "NC" | "N/A">(normalizedRat?.finalInspectionFunctional || "N/A");
  const [defectCauses, setDefectCauses] = useState<string[]>(normalizedRat?.defectCauses ?? []);

  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [showSaveDraftConfirm, setShowSaveDraftConfirm] = useState(false);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  
  // Local single row inputs state
  const [newLabor, setNewLabor] = useState({ operator: currentUser.name, description: "", startTime: "08:00", endTime: "12:00" });
  const [newPart, setNewPart] = useState({ code: "", description: "", quantity: 1 });

  // Closure state controls (payment modal)
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentFile, setPaymentFile] = useState<{ name: string; file?: File } | null>(null);
  const [uploading, setUploading] = useState(false);

  // PDF Preview control
  const [showPdfPreview, setShowPdfPreview] = useState(initialShowPdf);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [savingRat, setSavingRat] = useState(false);
  const [downloadingLabel, setDownloadingLabel] = useState(false);

  useEffect(() => {
    if (initialShowPdf) setShowPdfPreview(true);
  }, [initialShowPdf]);

  // Local validation error message
  const [errorLocal, setErrorLocal] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const isClosed = request.columnId === "liberado";
  const isPaymentSettled =
    Boolean(request.budget?.isWarranty) || request.budgetPayment?.status === "paid";
  const trackingEmailStatus = getEmailStatusForType(request, "tracking");
  const canResendTrackingEmail =
    Boolean(request.shippingLabel?.trackingCode) &&
    onResendTrackingEmail &&
    isAdminProfile(currentUser.profile) &&
    (trackingEmailStatus.status === "failed" || trackingEmailStatus.status === "pending");

  // Calculate minute difference from start to end HH:MM
  const calculateMinutes = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 0;
    try {
      const [sh, sm] = startStr.split(":").map(Number);
      const [eh, em] = endStr.split(":").map(Number);
      if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
      
      let minutes = (eh * 60 + em) - (sh * 60 + sm);
      if (minutes < 0) {
        // Cross-day handle, add 24 hours
        minutes += 24 * 60;
      }
      return minutes;
    } catch (e) {
      return 0;
    }
  };

  const handleAddLabor = () => {
    if (!newLabor.description.trim()) {
      appNoticeWarning("Por favor, descreva o serviço executado.");
      return;
    }
    const minutes = calculateMinutes(newLabor.startTime, newLabor.endTime);
    const row: LaborRow = {
      id: `lab-${Date.now()}`,
      operator: newLabor.operator,
      description: newLabor.description.trim(),
      startTime: newLabor.startTime,
      endTime: newLabor.endTime,
      totalMinutes: minutes
    };
    setLaborRows(prev => [...prev, row]);
    setNewLabor({ operator: currentUser.name, description: "", startTime: "08:00", endTime: "12:00" });
  };

  const handleRemoveLabor = (id: string) => {
    setLaborRows(prev => prev.filter(row => row.id !== id));
  };

  const handleAddPart = () => {
    if (!newPart.description.trim()) {
      appNoticeWarning("Por favor, informe a descrição ou código da peça trocada.");
      return;
    }
    const row: RatPartRow = {
      id: `part-${Date.now()}`,
      code: newPart.code.trim().toUpperCase() || "PECA-CH",
      description: newPart.description.trim(),
      quantity: newPart.quantity
    };
    setPartRows(prev => [...prev, row]);
    setNewPart({ code: "", description: "", quantity: 1 });
  };

  const handleRemovePart = (id: string) => {
    setPartRows(prev => prev.filter(p => p.id !== id));
  };

  const getAttachmentUrl = (att: Attachment) => resolveFileUrl(att);

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFinalizado) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const attId = `att-${Date.now()}`;
    setUploading(true);
    try {
      const { storagePath, downloadUrl } = await uploadRequestAttachment(request.id, attId, file);
      const newAtt: Attachment = {
        id: attId,
        name: file.name,
        type: file.type,
        size: file.size,
        storagePath,
        downloadUrl,
      };
      setAttachments((prev) => [...prev, newAtt]);
    } catch {
      appNoticeError("Erro ao enviar anexo. Verifique sua conexão e tente novamente.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (id: string) => {
    if (isFinalizado) return;
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const requiresConformeAttachments =
    finalInspectionElectric === "C" || finalInspectionFunctional === "C";
  const missingConformeAttachments = requiresConformeAttachments && attachments.length === 0;

  const validateConformeAttachments = (): boolean => {
    if (!missingConformeAttachments) return true;
    setShowErrors(true);
    appNoticeWarning(
      "Com testes marcados como Conforme (C), é obrigatório anexar os resultados dos ensaios na seção de anexos abaixo."
    );
    return false;
  };

  const getRatPayload = (status: "Rascunho" | "Finalizado"): RAT => {
    return {
      diagnostic: diagnostic.trim(),
      labor: laborRows,
      parts: partRows,
      technicalNotes: technicalNotes.trim(),
      attachments: attachments,
      status: status,
      finalizedDate: status === "Finalizado" ? new Date().toISOString() : undefined,
      finalInspectionElectric,
      finalInspectionFunctional,
      defectCauses
    };
  };

  // Save draft locally
  const handleSaveDraft = () => {
    setShowSaveDraftConfirm(true);
  };

  // Finalize completely
  const handleFinalize = () => {
    if (!diagnostic.trim() || laborRows.length === 0) {
      setShowErrors(true);
      appNoticeWarning("Por favor, preencha todos os campos obrigatórios (Diagnóstico Técnico e pelo menos um registro de Mão de Obra) antes de finalizar a RAT.");
      return;
    }
    if (!validateConformeAttachments()) return;
    setShowFinalizeConfirm(true);
  };

  const confirmFinalize = async () => {
    setShowFinalizeConfirm(false);
    setSavingRat(true);
    try {
      const payload = getRatPayload("Finalizado");
      await Promise.resolve(onSaveRat(request.id, payload));
      await Promise.resolve(onFinalizeRat(request.id));
      setShowFinalizeConfirm(false);
      appNoticeSuccess("RAT finalizada com sucesso.");
    } catch (err) {
      appNoticeError(err instanceof Error ? err.message : "Erro ao finalizar a RAT.");
    } finally {
      setSavingRat(false);
    }
  };

  const confirmReopen = () => {
    onReopenRat(request.id);
    setShowReopenConfirm(false);
  };

  // Handle Closure submission
  const handlePaymentAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setPaymentFile({ name: file.name, file });
  };

  const handleDirectRelease = async () => {
    setUploading(true);
    try {
      await Promise.resolve(onReleaseRequest(request.id));
      setShowReleaseConfirm(false);
      onClose();
      appNoticeSuccess("Equipamento liberado com sucesso!");
    } catch {
      appNoticeError("Erro ao liberar equipamento. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentFile?.file) {
      appNoticeWarning("Por favor, faça o upload de um comprovante de pagamento.");
      return;
    }
    setUploading(true);
    try {
      const { storagePath, downloadUrl } = await uploadPaymentProof(request.id, paymentFile.file);
      const closure: PaymentProof = {
        fileName: paymentFile.name,
        storagePath,
        downloadUrl,
        paymentDate: paymentDate,
      };
      await Promise.resolve(onReleaseRequest(request.id, closure));
      setShowClosureModal(false);
      onClose();
      appNoticeSuccess("Pagamento registrado e equipamento liberado com sucesso!");
    } catch {
      appNoticeError("Erro ao enviar comprovante. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const formatMinutes = (total: number) => {
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return `${hours}h ${mins}m`;
  };

  const persistRatDraft = () => {
    const status = request.rat?.status === "Finalizado" ? "Finalizado" : "Rascunho";
    const payload = getRatPayload(status);
    return onSaveRat(request.id, payload);
  };

  const handleDownloadRatPdf = async () => {
    const titleStr = `Relatorio_RAT_${request.id}`;
    const htmlContent = buildRatReportHtml(
      {
        request,
        isFinalizado,
        diagnostic,
        defectCauses,
        laborRows,
        partRows,
        finalInspectionElectric,
        finalInspectionFunctional,
        technicalNotes,
        attachments,
      },
      { includePrintButton: false, includeAttachments: false }
    );

    setExportingPdf(true);
    try {
      const attachmentPayload = prepareAttachmentsForPdf(attachments, getAttachmentUrl);

      if (attachments.length > 0 && attachmentPayload.length === 0) {
        appNoticeWarning(
          "Não foi possível incluir os anexos no PDF. O relatório principal será baixado sem os arquivos anexados."
        );
      }

      await downloadHtmlAsPdf(htmlContent, `${titleStr}.pdf`, {
        attachments: attachmentPayload,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar PDF.";
      appNoticeError(`${msg} Certifique-se de que o servidor está rodando (npm run dev).`);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadShippingLabel = async () => {
    setDownloadingLabel(true);
    try {
      await downloadShippingLabelZpl(request.id);
      appNoticeSuccess("Etiqueta baixada com sucesso.");
    } catch (err) {
      appNoticeError(err instanceof Error ? err.message : "Erro ao baixar etiqueta.");
    } finally {
      setDownloadingLabel(false);
    }
  };

  const confirmSaveDraft = async () => {
    if (!validateConformeAttachments()) {
      setShowSaveDraftConfirm(false);
      return;
    }
    setShowSaveDraftConfirm(false);
    setSavingRat(true);
    try {
      const payload = getRatPayload("Rascunho");
      await Promise.resolve(onSaveRat(request.id, payload));
      setShowSaveDraftConfirm(false);
      appNoticeSuccess("Rascunho do RAT salvo com sucesso.");
    } catch (err) {
      appNoticeError(err instanceof Error ? err.message : "Erro ao salvar rascunho do RAT.");
    } finally {
      setSavingRat(false);
    }
  };
  return (
    <>
      {savingRat && (
        <div className="fixed inset-0 z-[70] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-fade-in">
          <Loader2 className="h-9 w-9 animate-spin text-brand-orange" />
          <p className="text-sm font-semibold text-slate-700">Salvando RAT...</p>
        </div>
      )}
      <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto font-sans text-xs">
        <div id="rat-modal-container" className="bg-white rounded-3xl w-full max-w-4xl shadow-[0_24px_64px_-12px_rgba(15,23,42,0.18)] border border-slate-200/80 max-h-[92vh] flex flex-col overflow-hidden animate-fade-in">
          
          {/* Header premium alinhado ao orçamento */}
          <div className="px-6 py-5 border-b border-slate-200/80 bg-white flex items-start justify-between gap-4 shrink-0">
            <div className="min-w-0 border-l-4 border-brand-orange pl-4">
              <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider bg-orange-50 text-brand-orange border border-orange-200/70 px-2.5 py-1 rounded-full">
                RAT — Relatório de Assistência Técnica
              </span>
              <h3 className="font-semibold text-base sm:text-lg text-slate-900 mt-2.5 leading-snug tracking-tight">
                Laudo de O.S.
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-1">
                {formatRequestDisplayId(request.id, request.columnId)} • {request.clientCompany}
              </p>
            </div>
            
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-xl transition-all duration-200 shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body contents scroll Area */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
            
            {/* Card resumo cliente/equipamento */}
            <div className={RAT_SUMMARY_CARD}>
              <div className="space-y-2">
                <h4 className={RAT_LABEL}>Paciente/Cliente</h4>
                <p className="text-slate-900 font-semibold text-sm">{request.clientName}</p>
                <p className="text-slate-600 text-xs">{request.clientCompany}</p>
                <p className="text-slate-500 text-xs">{request.clientAddress}, {request.clientCity} - {request.clientState}</p>
              </div>

              <div className="space-y-2">
                <h4 className={RAT_LABEL}>Equipamento Atendido</h4>
                <p className="text-slate-900 font-semibold text-sm">{request.productName}</p>
                <p className="text-slate-600 text-xs">S/N de Série: <strong className="font-mono text-slate-800">{request.serialNumber || "N/A"}</strong></p>
                {onOpenHubTestes && (
                  <button
                    type="button"
                    onClick={() => void onOpenHubTestes()}
                    className={`mt-2 ${RAT_BTN_HUB}`}
                  >
                    <FlaskConical className="h-3.5 w-3.5 shrink-0" />
                    <span>Testar dispositivo agora</span>
                  </button>
                )}
                {request.budget && (
                  <div className="mt-2 flex flex-col items-start gap-2">
                    <p className="text-slate-700 font-medium text-[11px]">
                      Orçamento: {request.budget.isWarranty ? "Sob Garantia Técnica (Isento)" : `Particular faturado em ${formatCurrency(request.budget.totalFinal)}`}
                    </p>
                    {onOpenBudget && (
                      <button
                        type="button"
                        onClick={() => onOpenBudget(request)}
                        className={RAT_BTN_OUTLINE_ORANGE}
                      >
                        <FileText className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                        <span>Abrir Orçamento</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* If finalized, show banner */}
            {isFinalizado && (
              <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl text-emerald-900 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">Este relatório (RAT) está FINALIZADO!</h4>
                  <p className="text-xs text-emerald-800">
                    O laudo técnico, as horas trabalhadas e as peças trocadas estão consolidadas e travadas de acordo com as diretrizes do suporte.
                  </p>
                </div>
              </div>
            )}

            {/* Section 1: Diagnóstico Técnico */}
            <div className="space-y-2">
              <label htmlFor="rat-diagnostic" className={RAT_LABEL}>
                Diagnóstico Técnico Avançado *
              </label>
              <textarea
                id="rat-diagnostic"
                placeholder="Insira o diagnóstico analítico detalhado do estado do circuito, falhas operacionais encontradas e análise lógica de integridade..."
                disabled={isFinalizado || !canEdit}
                value={diagnostic}
                onChange={(e) => setDiagnostic(e.target.value)}
                className={`${RAT_TEXTAREA} ${showErrors && !diagnostic.trim() ? "border-red-400 bg-red-50/30 focus:ring-red-200 focus:border-red-400" : ""}`}
              />
            </div>

            {/* Campo: Causa do Defeito */}
            <div className="space-y-2 pb-1">
              <label className={RAT_LABEL}>
                Causa do Defeito *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  "Desgaste",
                  "Fabricação",
                  "Montagem",
                  "Transporte",
                  "Uso incorreto",
                  "Outros"
                ].map((option) => {
                  const isChecked = defectCauses.includes(option);
                  return (
                    <label
                      key={option}
                      htmlFor={`defect-cause-${option}`}
                      className={`${RAT_DEFECT_OPTION} ${
                        isChecked ? RAT_DEFECT_OPTION_ACTIVE : RAT_DEFECT_OPTION_IDLE
                      } ${isFinalizado || !canEdit ? "opacity-75 cursor-not-allowed" : ""}`}
                    >
                      <input
                        type="checkbox"
                        id={`defect-cause-${option}`}
                        checked={isChecked}
                        disabled={isFinalizado || !canEdit}
                        onChange={() => {
                          if (isFinalizado || !canEdit) return;
                          setDefectCauses(prev =>
                            prev.includes(option)
                              ? prev.filter(c => c !== option)
                              : [...prev, option]
                          );
                        }}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/30 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="text-xs select-none">{option}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Mão de Obra (Labor list) */}
            <div className="space-y-3.5 pt-2 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-sky-500" />
                <span>Horas Técnicas e Mão de Obra *</span>
              </h4>

              {/* Input row for technical logs */}
              {!isFinalizado && canEdit && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-205 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-semibold text-slate-550 uppercase">Técnico Operador</label>
                    <input
                      type="text"
                      id="input-labor-operator"
                      value={newLabor.operator}
                      onChange={(e) => setNewLabor({ ...newLabor, operator: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-semibold text-slate-550 uppercase">Serviço Executado nesta O.O.</label>
                    <input
                      type="text"
                      id="input-labor-desc"
                      placeholder="Ex: Troca de capacitores queimados"
                      value={newLabor.description}
                      onChange={(e) => setNewLabor({ ...newLabor, description: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-550 uppercase block mb-1">Hora Início</label>
                    <input
                      type="time"
                      id="input-labor-start"
                      value={newLabor.startTime}
                      onChange={(e) => setNewLabor({ ...newLabor, startTime: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded text-center text-xs text-slate-800 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-550 uppercase block mb-1">Hora Fim</label>
                    <input
                      type="time"
                      id="input-labor-end"
                      value={newLabor.endTime}
                      onChange={(e) => setNewLabor({ ...newLabor, endTime: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded text-center text-xs text-slate-800 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <button
                      type="button"
                      id="btn-add-labor"
                      onClick={handleAddLabor}
                      className="w-full h-[38px] bg-slate-900 text-white rounded font-bold hover:bg-slate-800 text-xs flex items-center justify-center cursor-pointer"
                    >
                      Inserir
                    </button>
                  </div>
                </div>
              )}

              {showErrors && laborRows.length === 0 && (
                <div className="text-[11px] font-semibold text-red-650 animate-pulse border border-red-200 bg-red-50 p-2.5 rounded-lg no-print">
                  * É necessário cadastrar pelo menos um registro de mão de obra e horas técnicas para poder finalizar a RAT.
                </div>
              )}

              {/* Labor list grid */}
              <div className={`border rounded-lg overflow-hidden transition-all duration-300 ${showErrors && laborRows.length === 0 ? "border-red-500 bg-red-50/10 ring-2 ring-red-500/20" : "border-slate-150"}`}>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-450 uppercase uppercase-widest">
                      <th className="py-2 px-3">Técnico</th>
                      <th className="py-2 px-3">Atividade de Intervenção</th>
                      <th className="py-2 px-3 text-center">Início / Fim</th>
                      <th className="py-2 px-3 text-right">Total Horas</th>
                      {!isFinalizado && canEdit && <th className="py-2 px-3 text-center w-12">Remover</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-105 text-xs">
                    {laborRows.length === 0 ? (
                      <tr>
                        <td colSpan={!isFinalizado && canEdit ? 5 : 4} className="py-4 text-center text-slate-400">Sem atividades de mão de obra registradas.</td>
                      </tr>
                    ) : (
                      laborRows.map(row => (
                        <tr key={row.id}>
                          <td className="py-2 px-3 font-semibold text-slate-800">{row.operator}</td>
                          <td className="py-2 px-3 text-slate-600">{row.description}</td>
                          <td className="py-2 px-3 text-center font-mono">{row.startTime} - {row.endTime}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-800 font-mono">{formatMinutes(row.totalMinutes)}</td>
                          {!isFinalizado && canEdit && (
                            <td className="py-2 px-3 text-center">
                              <button onClick={() => handleRemoveLabor(row.id)} className="text-slate-400 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Peças Trocadas */}
            <div className="space-y-3.5 pt-2 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-sky-500" />
                <span>Relação de Componentes e Peças Substituídas</span>
              </h4>

              {!isFinalizado && canEdit && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-205 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-semibold text-slate-550 uppercase">Código da Peça</label>
                    <input
                      type="text"
                      id="input-part-code"
                      placeholder="Ex: CTRL-01"
                      value={newPart.code}
                      onChange={(e) => setNewPart({ ...newPart, code: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-xs uppercase text-slate-800"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-550 uppercase">Descrição da Peça Substituída</label>
                    <input
                      type="text"
                      id="input-part-desc"
                      placeholder="Ex: Microcontrolador ARM 32-bit"
                      value={newPart.description}
                      onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-xs text-slate-800"
                    />
                  </div>
                  <div className="sm:col-span-1 flex gap-2">
                    <div className="w-20 shrink-0">
                      <label className="text-[10px] font-semibold text-slate-550 uppercase">Qtd</label>
                      <input
                        type="number"
                        min="1"
                        id="input-part-qty"
                        value={newPart.quantity}
                        onChange={(e) => setNewPart({ ...newPart, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full p-2 border border-slate-300 rounded bg-white text-xs text-slate-800 text-center font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      id="btn-add-part"
                      onClick={handleAddPart}
                      className="w-full py-2 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 text-xs self-end cursor-pointer"
                    >
                      Inserir
                    </button>
                  </div>
                </div>
              )}

              <div className="border border-slate-150 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-450 uppercase tracking-widest">
                      <th className="py-2 px-3">Código</th>
                      <th className="py-2 px-3">Descrição Comercial</th>
                      <th className="py-2 px-3 text-center">Quantidade Utilizada</th>
                      {!isFinalizado && canEdit && <th className="py-2 px-3 text-center w-12">Remover</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-105 text-xs">
                    {partRows.length === 0 ? (
                      <tr>
                        <td colSpan={!isFinalizado && canEdit ? 4 : 3} className="py-4 text-center text-slate-400">Nenhuma peça de reposição listada neste laudo.</td>
                      </tr>
                    ) : (
                      partRows.map(row => (
                        <tr key={row.id}>
                          <td className="py-2 px-3 font-mono font-bold text-slate-700">{row.code}</td>
                          <td className="py-2 px-3 text-slate-600">{row.description}</td>
                          <td className="py-2 px-3 text-center font-bold font-mono text-slate-800">{row.quantity}</td>
                          {!isFinalizado && canEdit && (
                            <td className="py-2 px-3 text-center">
                              <button onClick={() => handleRemovePart(row.id)} className="text-slate-400 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section: Inspeção Final */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <span className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Inspeção Final *
              </span>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
                {/* Safety Test Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-150">
                  <span className="text-xs font-semibold text-slate-800">Ensaios de segurança elétrica</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(["C", "NC", "N/A"] as const).map((opt) => {
                      const isSelected = finalInspectionElectric === opt;
                      const isReadOnly = isFinalizado || !canEdit;
                      const activeColors = 
                        opt === "C" ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold shadow-sm" :
                        opt === "NC" ? "bg-red-50 border-red-500 text-red-800 font-extrabold shadow-sm" :
                        "bg-slate-150 border-slate-400 text-slate-800 font-extrabold shadow-sm";
                      
                      return (
                        <button
                          key={`elect-${opt}`}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => setFinalInspectionElectric(opt)}
                          className={`px-3 py-1 text-[11px] font-bold border rounded-lg transition-all duration-150 ${
                            isReadOnly ? "opacity-75" : "cursor-pointer active:scale-95"
                          } ${
                            isSelected 
                              ? activeColors 
                              : "bg-white border-slate-250 text-slate-500 hover:border-slate-350 hover:bg-slate-50"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Functional Test Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                  <span className="text-xs font-semibold text-slate-800">Ensaio funcional</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(["C", "NC", "N/A"] as const).map((opt) => {
                      const isSelected = finalInspectionFunctional === opt;
                      const isReadOnly = isFinalizado || !canEdit;
                      const activeColors = 
                        opt === "C" ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold shadow-sm" :
                        opt === "NC" ? "bg-red-50 border-red-500 text-red-800 font-extrabold shadow-sm" :
                        "bg-slate-150 border-slate-400 text-slate-800 font-extrabold shadow-sm";
                      
                      return (
                        <button
                          key={`func-${opt}`}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => setFinalInspectionFunctional(opt)}
                          className={`px-3 py-1 text-[11px] font-bold border rounded-lg transition-all duration-150 ${
                            isReadOnly ? "opacity-75" : "cursor-pointer active:scale-95"
                          } ${
                            isSelected 
                              ? activeColors 
                              : "bg-white border-slate-250 text-slate-500 hover:border-slate-350 hover:bg-slate-50"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 leading-relaxed pt-1.5 border-t border-slate-150 border-dashed">
                  <span className="font-semibold block text-slate-600 mb-0.5">Legenda:</span>
                  <p className="italic">
                    C - Conforme, NC - Não Conforme, N/A - Não se aplica.
                    <br />
                    Os resultados dos testes estão em anexo
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4: Observações Técnicas */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label htmlFor="rat-technical-notes" className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Observações Técnicas / Notas de Teste
              </label>
              <textarea
                id="rat-technical-notes"
                placeholder="Insira notas adicionais sobre calibração e recomendações de uso clínico preventivo para o cliente final..."
                disabled={isFinalizado || !canEdit}
                value={technicalNotes}
                onChange={(e) => setTechnicalNotes(e.target.value)}
                className="w-full text-slate-800 p-3 h-20 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs focus:border-sky-500"
              />
            </div>

            {/* Section 5: Anexos e arquivos (PDF, imagens, laudos) */}
            <div className={`space-y-3.5 pt-2 border-t border-slate-100 ${showErrors && missingConformeAttachments ? "rounded-xl ring-2 ring-red-500/20" : ""}`}>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Paperclip className="h-4 w-4 text-sky-500" />
                <span>Documentações e Fotos (Anexos){requiresConformeAttachments ? " *" : ""}</span>
              </h4>
              {showErrors && missingConformeAttachments && (
                <p className="text-[11px] text-red-600 font-semibold">
                  Anexo obrigatório quando algum ensaio estiver marcado como Conforme (C).
                </p>
              )}

              {!isFinalizado && canEdit && (
                <div id="attachments-dropzone" className={`border-2 border-dashed rounded-xl p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition-all relative ${showErrors && missingConformeAttachments ? "border-red-400 bg-red-50/30" : "border-slate-205"}`}>
                  <Upload className="h-7 w-7 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 font-semibold text-xs">Arraste fotos / laudos ou clique para fazer upload</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">Formatos suportados: PNG, JPG, PDF, TXT (Gravado de forma local)</p>
                  
                  <input
                    type="file"
                    id="input-file-attach"
                    onChange={handleAttachmentUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              )}

              {/* Render lists of current uploaded items */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-3 bg-white border border-slate-150 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-5 w-5 text-sky-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-xs truncate" title={att.name}>{att.name}</p>
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5">{(att.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {getAttachmentUrl(att) && (
                          <a
                            href={getAttachmentUrl(att)}
                            download={att.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-slate-700 bg-slate-50 rounded"
                            title="Download arquivo"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {!isFinalizado && canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id)}
                            className="p-1 text-slate-400 hover:text-red-650 bg-slate-150 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Footer premium */}
          <div className={RAT_FOOTER}>
            <EmailStatusIcons
              request={request}
              types={["maintenance_started", "rat", "tracking"]}
            />
            <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleDownloadRatPdf()}
                disabled={exportingPdf}
                className={`${RAT_BTN_SECONDARY} disabled:opacity-60`}
              >
                {exportingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                <span>{exportingPdf ? "Gerando PDF..." : "Baixar PDF da RAT"}</span>
              </button>

              {isFinalizado && !isClosed && (
                <>
                  <button
                    type="button"
                    id="btn-release-equipment"
                    onClick={() => setShowReleaseConfirm(true)}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Liberar Equipamento</span>
                  </button>
                  {!isPaymentSettled && (
                    <button
                      type="button"
                      id="btn-close-os-launcher"
                      onClick={() => setShowClosureModal(true)}
                      disabled={uploading}
                      className="flex items-center gap-1.5 px-4 py-2 border border-amber-200 bg-amber-50 text-amber-900 font-semibold rounded-xl hover:bg-amber-100 cursor-pointer disabled:opacity-60"
                    >
                      <Zap className="h-4 w-4 text-amber-600" />
                      <span>Confirmar Pagamento (Liberação)</span>
                    </button>
                  )}
                </>
              )}

              {isClosed && onGenerateShippingLabel && (
                request.shippingLabel?.trackingCode ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold rounded-xl text-xs">
                      <Package className="h-4 w-4" />
                      <span>Rastreio: {request.shippingLabel.trackingCode}</span>
                    </div>
                    <button
                      type="button"
                      id="btn-download-shipping-label"
                      onClick={() => void handleDownloadShippingLabel()}
                      disabled={downloadingLabel}
                      className={`${RAT_BTN_SECONDARY} disabled:opacity-60`}
                    >
                      {downloadingLabel ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Printer className="h-4 w-4" />
                      )}
                      <span>{downloadingLabel ? "Baixando..." : "Baixar etiqueta"}</span>
                    </button>
                    {canResendTrackingEmail && (
                      <button
                        type="button"
                        id="btn-resend-tracking-email"
                        onClick={() => onResendTrackingEmail(request.id)}
                        disabled={isResendingTrackingEmail}
                        className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-60 text-xs"
                      >
                        {isResendingTrackingEmail ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        <span>{isResendingTrackingEmail ? "Reenviando..." : "Reenviar e-mail de rastreio"}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    id="btn-generate-shipping-label"
                    onClick={() => onGenerateShippingLabel(request.id)}
                    disabled={isGeneratingShippingLabel}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-60"
                  >
                    {isGeneratingShippingLabel ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                    <span>{isGeneratingShippingLabel ? "Gerando etiquetas..." : "Gerar etiquetas"}</span>
                  </button>
                )
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wider text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">
                MAN
              </span>
              <button
                type="button"
                onClick={onClose}
                className={RAT_BTN_SECONDARY}
              >
                Cancelar
              </button>

              {isFinalizado && isAdminProfile(currentUser.profile) && (
                <button
                  type="button"
                  id="btn-reopen-rat"
                  onClick={() => setShowReopenConfirm(true)}
                  className={`${RAT_BTN_OUTLINE_ORANGE} px-4 py-2.5 normal-case tracking-normal text-xs`}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  <span>Reabrir RAT</span>
                </button>
              )}

              {!isFinalizado && canEdit && (
                <>
                  <button
                    type="button"
                    id="btn-save-rat-draft"
                    onClick={handleSaveDraft}
                    disabled={savingRat}
                    className={`${RAT_BTN_OUTLINE_ORANGE} px-4 py-2.5 normal-case tracking-normal text-xs disabled:opacity-60`}
                  >
                    Salvar Rascunho
                  </button>
                  <button
                    type="button"
                    id="btn-finalize-rat"
                    onClick={handleFinalize}
                    disabled={savingRat}
                    className={`${RAT_BTN_PRIMARY} disabled:opacity-60`}
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Finalizar RAT</span>
                  </button>
                </>
              )}
            </div>
            </div>
          </div>

        </div>
      </div>

      {/* MODAL 2: CLOSURE PAYMENT / COMPROVANTE PAYMENT MODAL overlay */}
      {showClosureModal && (
        <div id="closure-payment-backdrop" className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-55">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b bg-emerald-50 border-emerald-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">Etapa Final de Entrega</span>
                <h3 className="font-bold text-slate-900 text-base mt-1">Registrar pagamento e liberar</h3>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Opcional — use quando o pagamento ainda não foi confirmado no sistema.
                </p>
              </div>
              <button onClick={() => setShowClosureModal(false)} className="text-slate-400 hover:text-slate-600 p-1 bg-white border border-slate-100 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmClosure} className="p-5 space-y-4 text-xs">
              
              {/* Payment Proof requirement */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Anexar Comprovante de Pagamento *
                </label>
                <div className="border border-slate-200 bg-slate-50/50 hover:bg-slate-50 p-4 text-center rounded-xl relative">
                  <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700">Escolher arquivo comprimido (PDF, JPG, PNG)</p>
                  <p className="text-slate-400 text-[10px]">Tamanho máx: 5MB</p>
                  <input
                    type="file"
                    required
                    id="input-closure-payment-file"
                    accept="image/*,.pdf"
                    onChange={handlePaymentAttach}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                {paymentFile && (
                  <p className="text-emerald-700 bg-emerald-50 rounded-lg p-2 font-mono font-semibold">
                    Atachado: {paymentFile.name}
                  </p>
                )}
              </div>

              {/* Payment date input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Data Efetiva de Recebimento / Pagamento *
                </label>
                <input
                  type="date"
                  required
                  id="input-closure-payment-date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full text-slate-800 p-2.5 text-sm border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Total overview check inside closure */}
              {request.budget && (
                <div className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between font-mono">
                  <span className="text-slate-500 font-medium font-sans">Valor Quitado:</span>
                  <span className="text-sm font-bold text-slate-800">
                    {request.budget.isWarranty ? "R$ 0,00 (Sob Cobertura)" : formatCurrency(request.budget.totalFinal)}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowClosureModal(false)}
                  className="px-4 py-2 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg"
                >
                  cancelar
                </button>
                <button
                  type="submit"
                  id="btn-confirm-release"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm cursor-pointer text-xs"
                >
                  Confirmar Liberação
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* RAT PDF PRINT PREVIEW OVERLAY */}
      {showPdfPreview && (
        <div id="pdf-preview-backdrop" className="fixed inset-0 bg-slate-950 backdrop-blur-md flex items-center justify-center p-4 z-55 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border p-8 flex flex-col justify-between max-h-[96vh]">
            
            {/* Inner actions banner - Hide inside actual browser printer */}
            <div className="mb-4 p-3 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-between no-print text-xs">
              <span className="font-semibold text-slate-800">Relatório de Assistência Técnica (RAT) - Pré-visualização do Documento</span>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadRatPdf}
                  disabled={exportingPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {exportingPdf ? "Gerando PDF..." : "Baixar PDF"}
                </button>
                <button
                  onClick={() => {
                    if (readOnly || initialShowPdf) {
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
                  <span className="inline-block px-3 py-1 bg-sky-100 border border-sky-350 text-sky-900 rounded font-bold text-xs uppercase font-mono">RELATÓRIO TÉCNICO (RAT)</span>
                  <div className="text-[11px] text-slate-600 mt-4 space-y-1">
                    <p><strong>Chamado:</strong> {request.id}</p>
                    <p><strong>Nº O.S:</strong> {request.requestNumber}</p>
                    <p><strong>Relatório Status:</strong> {isFinalizado ? "FINALIZADO" : "RASCUNHO EM ANDAMENTO"}</p>
                    <p><strong>Data de Finalização:</strong> {request.rat?.finalizedDate ? formatDate(request.rat.finalizedDate) : "-"}</p>
                  </div>
                </div>
              </div>

              {/* Client specifications and device details */}
              <div className="grid grid-cols-2 gap-6 py-5 border-b border-slate-200 text-xs text-slate-600">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-2 border-l-2 border-slate-800 pl-1.5">CLIENTE DESTINATÁRIO</h4>
                  <p className="font-semibold text-slate-800">{request.clientName}</p>
                  <p className="text-slate-500">{request.clientCompany}</p>
                  <p className="text-slate-500">Endereço: {request.clientAddress}, {request.clientCity}-{request.clientState}</p>
                  <p className="text-slate-500">Contato: {request.clientPhone} • {request.clientEmail}</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-2 border-l-2 border-slate-800 pl-1.5">MÁQUINA / DISPOSITIVO</h4>
                  <p className="font-semibold text-slate-800">Modelo: {request.productName}</p>
                  <p className="text-slate-500 font-mono text-[11px]">Número Serial: {request.serialNumber || "N/A"}</p>
                  <p className="text-slate-500 mt-1">Nota Fiscal de Origem (NF-e): {request.invoiceDate ? formatDate(request.invoiceDate) : "Não informada"}</p>
                </div>
              </div>

              {/* Section: Diagnostic display */}
              <div className="py-4 border-b border-slate-250 text-xs">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-1.5">LAUDO E DIAGNÓSTICO TÉCNICO</h4>
                <p className="text-slate-805 leading-relaxed bg-slate-50 border p-3 rounded italic text-[11px] whitespace-pre-wrap">
                  {diagnostic || "Nenhum laudo técnico inserido ainda."}
                </p>
              </div>

              {/* Section: Causa do Defeito Display */}
              <div className="py-4 border-b border-slate-250 text-xs">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-1.5">CAUSA DO DEFEITO</h4>
                <div className="flex flex-wrap gap-1 py-1">
                  {defectCauses.length === 0 ? (
                    <span className="text-slate-400 italic text-[11px]">Nenhuma causa do defeito marcada.</span>
                  ) : (
                    defectCauses.map((cause) => (
                      <span
                        key={cause}
                        className="inline-flex items-center px-3 py-1 rounded-full text-[10.5px] font-bold bg-slate-50 text-slate-800 border border-slate-300"
                      >
                        {cause}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="py-4 border-b border-slate-200">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-2.5">EQUIPE TÉCNICA E CRONOMETRAGEM DE HORAS (MÃO DE OBRA)</h4>
                
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-semibold font-mono text-[10px]">
                      <th className="py-2 px-3">Técnico Encarregado</th>
                      <th className="py-2 px-3">Atividade / Intervenção Realizada</th>
                      <th className="py-2 px-3 text-center">Horário Início/Fim</th>
                      <th className="py-2 px-3 text-right">Tempo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {laborRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400 font-light text-[11px]">Nenhuma hora de trabalho faturada.</td>
                      </tr>
                    ) : (
                      laborRows.map((row) => (
                        <tr key={row.id}>
                          <td className="py-2 px-3 font-semibold text-slate-800">{row.operator}</td>
                          <td className="py-2 px-3 text-slate-600">{row.description}</td>
                          <td className="py-2 px-3 text-center">{row.startTime} - {row.endTime}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-700 font-mono">{formatMinutes(row.totalMinutes)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Replace block of items replaces */}
              <div className="py-4 border-b border-slate-200">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-2.5 font-sans">RELAÇÃO DE COMPONENTES E PEÇAS TROCADAS</h4>
                
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-300 font-semibold font-mono text-[10px]">
                      <th className="py-2 px-3">Código</th>
                      <th className="py-2 px-3">Descrição Comercial</th>
                      <th className="py-2 px-3 text-center">Quantidade Utilizada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {partRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400 font-light font-sans text-xs">Nenhum componente físico substituído no equipamento.</td>
                      </tr>
                    ) : (
                      partRows.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2 px-3 font-bold text-slate-800">{p.code}</td>
                          <td className="py-2 px-3 text-slate-600 font-sans text-xs">{p.description}</td>
                          <td className="py-2 px-3 text-center font-bold">{p.quantity}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Technical notes */}
              {technicalNotes && (
                <div className="py-4 border-b border-slate-200 text-xs text-slate-600">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-1">OBSERVAÇÕES TÉCNICAS E NOTAS DE TESTE</h4>
                  <p className="leading-relaxed bg-slate-50 p-3 rounded border italic text-[11px] whitespace-pre-wrap">{technicalNotes}</p>
                </div>
              )}
              {/* Render attachments as separate high-contrast sheets/pages for printing/previewing */}
              {attachments.map((att, i) => (
                <div key={att.id} className="mt-8 pt-8 border-t-2 border-dashed border-slate-300 break-before-page print:border-0 print:pt-0">
                  <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                      Documentação Complementar — Anexo {i + 1} de {attachments.length}
                    </span>
                    <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded font-bold font-mono text-slate-800">
                      {att.name} ({att.size})
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-50/50 rounded-xl border p-4">
                    {getAttachmentUrl(att) ? (
                      att.type.startsWith("image/") ? (
                        <img 
                          src={getAttachmentUrl(att)} 
                          alt={att.name} 
                          className="max-h-[600px] max-w-full object-contain rounded border pointer-events-none shadow" 
                        />
                      ) : getAttachmentUrl(att)!.includes("application/pdf") || att.type === "application/pdf" ? (
                        <div className="w-full flex flex-col items-center gap-4 p-4 bg-white rounded-xl border border-slate-200">
                          <div className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl no-print">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
                                <FileCheck className="h-6 w-6" />
                              </div>
                              <div className="text-left">
                                <p className="font-bold text-slate-800 text-xs">Anexo PDF Integrado à O.S.</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{att.name} ({att.size})</p>
                              </div>
                            </div>
                            <a
                              href={getAttachmentUrl(att)}
                              download={att.name}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-slate-950 text-white font-bold rounded-lg hover:bg-slate-850 text-xs text-center transition shadow-xs"
                            >
                              Baixar / Abrir PDF
                            </a>
                          </div>

                          <object
                            data={getAttachmentUrl(att)}
                            type="application/pdf"
                            className="w-full h-[550px] rounded-xl border border-slate-200 no-print"
                          >
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-xl border border-slate-200 w-full h-[400px]">
                              <p className="font-semibold text-slate-800 text-sm">Visualização Direta Bloqueada pelo Chrome</p>
                              <p className="text-slate-500 text-[11px] mt-1.5 max-w-sm">
                                Utilize o botão seguro acima para baixar e visualizar o arquivo.
                              </p>
                              <a
                                href={getAttachmentUrl(att)}
                                download={att.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-505 text-white font-bold rounded-xl text-xs"
                              >
                                Abrir Documento Completo
                              </a>
                            </div>
                          </object>

                          <div className="text-center p-3 border border-slate-200 rounded bg-white max-w-sm hidden print:block">
                            <p className="font-bold text-sky-600 text-xs">Arquivo PDF Integrado</p>
                            <p className="text-slate-500 text-[10px] mt-1">Nome do arquivo: {att.name}</p>
                            <p className="text-slate-400 text-[9px] mt-0.5">Tamanho: {att.size}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 bg-white rounded-xl border max-w-lg text-center shadow-xs">
                          <p className="font-bold text-slate-800 text-sm">Visualização de Documento Complementar</p>
                          <p className="text-slate-500 text-[11px] mt-1">Este documento foi anexado permanentemente ao histórico unificado do Chamado.</p>
                          <p className="text-sky-600 font-bold font-mono mt-3 text-xs">{att.name}</p>
                          {getAttachmentUrl(att)?.startsWith("data:text/") && (
                            <pre className="mt-4 p-3 bg-slate-50 rounded border text-left font-mono text-[10px] overflow-x-auto text-slate-800 max-h-[300px] whitespace-pre-wrap">
                              {atob(getAttachmentUrl(att)!.split(",")[1])}
                            </pre>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="text-center p-6 bg-white rounded border max-w-lg">
                        <p className="font-bold text-slate-700">Atalho do Anexo Comercial</p>
                        <p className="text-slate-500 mt-1">Anexo carregado localmente pelo console da O.S.</p>
                        <p className="text-blue-600 font-bold font-mono mt-3 text-xs">{att.name}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

            </div>

            {/* Print action footer */}
            <div className="mt-4 flex justify-end gap-2 pr-2 no-print">
              <button
                onClick={() => setShowPdfPreview(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RELEASE CONFIRMATION MODAL */}
      {showReleaseConfirm && (
        <div id="release-confirm-backdrop" className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in text-xs text-slate-700">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-emerald-100 overflow-hidden text-center p-6 space-y-4">
            <div className="mx-auto h-12 w-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-base text-slate-900">Liberar equipamento</h3>
              <p className="text-slate-500 leading-relaxed text-[11.5px]">
                Confirmar a liberação do equipamento para entrega ao cliente?
                {!isPaymentSettled && (
                  <span className="block mt-1.5 text-slate-400">
                    O pagamento não foi confirmado no sistema. Você pode liberar agora ou registrar o pagamento antes, se preferir.
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowReleaseConfirm(false)}
                disabled={uploading}
                className="flex-1 py-2 bg-slate-105 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-xs disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDirectRelease()}
                disabled={uploading}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-xl shadow-sm transition-all cursor-pointer text-xs disabled:opacity-60"
              >
                {uploading ? "Liberando..." : "Sim, liberar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINALIZATION CONFIRMATION MODAL */}
      {showFinalizeConfirm && (
        <div id="finalize-confirm-backdrop" className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in text-xs text-slate-700">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-emerald-100 overflow-hidden text-center p-6 space-y-4">
            <div className="mx-auto h-12 w-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
              <ClipboardCheck className="h-6 w-6 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-bold text-base text-slate-900">Finalizar Relatório de Assistência</h3>
              <p className="text-slate-500 leading-relaxed text-[11.5px]">
                Você tem certeza de que deseja finalizar o relatório técnico da O.S. <strong className="font-mono text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10.5px] border border-emerald-105">{request.id}</strong>?
              </p>
              <p className="text-amber-500 font-semibold text-[10.5px]">
                Aviso: O laudo técnico, as horas e as peças serão consolidados e travados.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowFinalizeConfirm(false)}
                className="flex-1 py-2 bg-slate-105 hover:bg-slate-200 hover:text-slate-800 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void confirmFinalize()}
                disabled={savingRat}
                className="flex-1 py-2 bg-brand-gradient hover:opacity-95 font-bold text-white rounded-xl shadow-sm transition-all cursor-pointer text-xs disabled:opacity-60"
              >
                {savingRat ? "Finalizando..." : "Sim, Finalizar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REOPEN CONFIRMATION MODAL */}
      {showReopenConfirm && (
        <div id="reopen-confirm-backdrop" className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in text-xs text-slate-700">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-amber-100 overflow-hidden text-center p-6 space-y-4">
            <div className="mx-auto h-12 w-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center border border-amber-150">
              <ClipboardCheck className="h-6 w-6 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-bold text-base text-slate-900">Reabrir Relatório (RAT)</h3>
              <p className="text-slate-500 leading-relaxed text-[11.5px]">
                Você tem certeza de que deseja reabrir e desbloquear o laudo técnico da O.S. <strong className="font-mono text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[10.5px] border border-amber-105">{request.id}</strong>?
              </p>
              <p className="text-slate-500 text-[10.5px]">
                Essa ação permitirá que o relatório volte para o modo rascunho de edição.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowReopenConfirm(false)}
                className="flex-1 py-2 bg-slate-105 hover:bg-slate-200 hover:text-slate-800 text-slate-707 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmReopen}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 font-bold text-white rounded-xl shadow-sm hover:shadow transition-all cursor-pointer text-xs"
              >
                Confirmar Reabertura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE DRAFT CONFIRMATION MODAL */}
      {showSaveDraftConfirm && (
        <div id="save-draft-confirm-backdrop" className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[65] animate-fade-in text-xs text-slate-750">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 overflow-hidden text-center p-6 space-y-4">
            <div className="mx-auto h-12 w-12 bg-orange-50 text-brand-orange rounded-full flex items-center justify-center border border-orange-200/70">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            
            <div className="space-y-3">
              <h3 className="font-bold text-base text-slate-900">Salvar Rascunho do Relatório</h3>
              <p className="text-slate-500 leading-relaxed text-[11.5px]">
                Você deseja salvar o rascunho atual da O.S.
              </p>
              <span className="inline-block max-w-full font-mono text-brand-orange font-semibold bg-orange-50 px-3 py-1.5 rounded-lg text-xs border border-orange-200/70 whitespace-nowrap">
                {formatRequestDisplayId(request.id, request.columnId)}
              </span>
              <p className="text-slate-400 text-[10.5px]">
                O progresso será mantido para futuras edições.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveDraftConfirm(false)}
                className="flex-1 py-2 bg-slate-105 hover:bg-slate-200 hover:text-slate-800 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void confirmSaveDraft()}
                disabled={savingRat}
                className={`flex-1 py-2 bg-brand-gradient hover:opacity-95 font-bold text-white rounded-xl shadow-sm transition-all cursor-pointer text-xs disabled:opacity-60`}
              >
                {savingRat ? "Salvando..." : "Sim, Salvar rascunho"}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
