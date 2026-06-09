/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  MaintenanceRequest, 
  Client, 
  ProductCatalog, 
  KanbanColumnId, 
  Budget, 
  RAT, 
  MovementLog, 
  User,
  TechnicalProduct
} from "../types";
import { 
  Plus, 
  UserSquare2, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Wrench, 
  ChevronDown,
  Clock,
  ShieldCheck,
  FileCheck2,
  Trash2,
  HelpCircle,
  FileSearch,
  Users,
  X
} from "lucide-react";
import { formatDate } from "../utils";
import { formatRequestDisplayId } from "../services/requestIds";
import { canMoveKanbanCard, getKanbanMoveBlockReason } from "../utils/kanbanMovement";
import { appNoticeError, appNoticeSuccess, appNoticeWarning } from "../utils/appNotice";
import { canMoveToOrcamento, isAdminProfile } from "../services/userRoles";
import { triggerMaintenanceStartedEmail } from "../services/documentEmailApi";
import { verifyCurrentUserPassword } from "../services/authService";
import { isBudgetRejected, isRejectedVisibleInOrcamento } from "../utils/rejectedBudget";
import {
  compareReleasedDesc,
  isLiberadoVisibleInKanban,
} from "../utils/liberadoKanbanVisibility";
import KanbanColumn from "./kanban/KanbanColumn";
import { KANBAN_COLUMNS } from "./kanban/kanbanConfig";
import PasswordConfirmDialog from "./ui/PasswordConfirmDialog";
import PageHeader from "./ui/PageHeader";
import KanbanSearchControls from "./kanban/KanbanSearchControls";

/** Classes visuais do modal “Nova Solicitação de O.S.” (somente layout). */
const ADD_MODAL_INPUT =
  "w-full text-text-primary px-3 py-2.5 border border-slate-200 rounded-xl bg-white placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-brand-orange/45 focus:ring-2 focus:ring-brand-orange/15 text-xs";
const ADD_MODAL_LABEL =
  "block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5";
const ADD_MODAL_SECTION =
  "bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4";
const ADD_MODAL_SECTION_TITLE =
  "flex items-center gap-2.5 pb-3 mb-1 border-b border-slate-100";

interface KanbanBoardProps {
  requests: MaintenanceRequest[];
  clients: Client[];
  productsCatalog: ProductCatalog[];
  technicalProducts: TechnicalProduct[];
  currentUser: User;
  onAddRequest: (req: Omit<MaintenanceRequest, "id" | "requestNumber" | "movementHistory">) => void;
  onUpdateRequest: (req: MaintenanceRequest) => void;
  onDeleteRequest: (id: string) => void;
  onOpenBudget: (req: MaintenanceRequest, showPdf?: boolean) => void;
  onOpenRat: (req: MaintenanceRequest) => void;
  onRejectBudget: (requestId: string) => void | Promise<void>;
  onGenerateShippingLabel?: (requestId: string) => void | Promise<void>;
  onDownloadShippingLabel?: (requestId: string) => void | Promise<void>;
  shippingLabelLoadingId?: string | null;
  shippingLabelDownloadLoadingId?: string | null;
  searchTerm: string;
  equipmentFilter: string;
  onSearchChange: (value: string) => void;
  onEquipmentFilterChange: (value: string) => void;
  showEquipDropdown: boolean;
  onToggleEquipDropdown: () => void;
  onCloseEquipDropdown: () => void;
  uniqueProducts: string[];
  initialEditingRequest?: MaintenanceRequest | null;
  onCloseEditingRequest?: () => void;
}

export default function KanbanBoard({
  requests,
  clients,
  productsCatalog,
  technicalProducts,
  currentUser,
  onAddRequest,
  onUpdateRequest,
  onDeleteRequest,
  onOpenBudget,
  onOpenRat,
  onRejectBudget,
  onGenerateShippingLabel,
  onDownloadShippingLabel,
  shippingLabelLoadingId,
  shippingLabelDownloadLoadingId,
  searchTerm,
  equipmentFilter,
  onSearchChange,
  onEquipmentFilterChange,
  showEquipDropdown,
  onToggleEquipDropdown,
  onCloseEquipDropdown,
  uniqueProducts,
  initialEditingRequest,
  onCloseEditingRequest
}: KanbanBoardProps) {

  // Validation feedback state
  const [showErrors, setShowErrors] = useState(false);

  // Payment confirmation states
  const [paymentConfirmRequest, setPaymentConfirmRequest] = useState<MaintenanceRequest | null>(null);
  const [paymentConfirmFile, setPaymentConfirmFile] = useState<{ name: string; data?: string } | null>(null);

  const [rejectConfirmRequest, setRejectConfirmRequest] = useState<MaintenanceRequest | null>(null);

  // "Nova Solicitação" form modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedExistingClientId, setSelectedExistingClientId] = useState("");

  // Customer sub-form states
  const [clientForm, setClientForm] = useState({
    name: "",
    company: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    email: "",
    cpfCnpj: "",
    cep: ""
  });

  // Equipment & issue sub-form states
  const [equipmentForm, setEquipmentForm] = useState({
    productName: "",
    serialNumber: "",
    invoiceDate: ""
  });

  // Description / problema sub-form states
  const [requestDescForm, setRequestDescForm] = useState({
    problemDescription: "",
    initialDiagnostic: ""
  });

  // Edit simple request details modal state (Column 1 cards editing parameters)
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);

  useEffect(() => {
    if (initialEditingRequest !== undefined) {
      setEditingRequest(initialEditingRequest);
      if (initialEditingRequest) {
        setEditedInitialDiagnostic(initialEditingRequest.initialDiagnostic || "");
      }
    }
  }, [initialEditingRequest]);

  const handleSetEditingRequest = (req: MaintenanceRequest | null) => {
    setEditingRequest(req);
    if (!req) {
      onCloseEditingRequest?.();
    }
  };
  const [editedInitialDiagnostic, setEditedInitialDiagnostic] = useState("");
  const [requestToDelete, setRequestToDelete] = useState<MaintenanceRequest | null>(null);

  // Drag and drop states
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  // If selecting an existing client, auto-fill client sub-form
  const handleClientSelectChange = (clientId: string) => {
    setSelectedExistingClientId(clientId);
    if (!clientId || clientId === "add_new_client") {
      setClientForm({
        name: "",
        company: "",
        address: "",
        city: "",
        state: "SP", // default state
        phone: "",
        email: "",
        cpfCnpj: "",
        cep: ""
      });
      return;
    }

    const found = clients.find(c => c.id === clientId);
    if (found) {
      setClientForm({
        name: found.name,
        company: found.company,
        address: found.address,
        city: found.city,
        state: found.state,
        phone: found.phone,
        email: found.email,
        cpfCnpj: found.cpfCnpj || "",
        cep: found.cep || ""
      });
    }
  };

  // Submit "Nova Solicitação"
  const handleSaveRequest = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedExistingClientId) {
      appNoticeWarning("Por favor, selecione um cliente cadastrado ou selecione '+ Adicionar Cliente' no início da lista.");
      return;
    }

    if (selectedExistingClientId === "add_new_client") {
      if (!clientForm.name.trim() || !clientForm.cpfCnpj.trim()) {
        setShowErrors(true);
        appNoticeWarning("Preencha todos os campos obrigatórios (*).");
        return;
      }
    }

    if (!equipmentForm.productName.trim() || !equipmentForm.serialNumber.trim() || !requestDescForm.problemDescription.trim()) {
      setShowErrors(true);
      appNoticeWarning("Preencha todos os campos obrigatórios (*).");
      return;
    }

    onAddRequest({
      columnId: "solicitacao",
      clientId: selectedExistingClientId === "add_new_client" ? `cli-temp-${Date.now()}` : selectedExistingClientId,
      clientName: clientForm.name.trim(),
      clientCompany: clientForm.company.trim() || "Particular", // default value if empty
      clientAddress: clientForm.address.trim(),
      clientCity: clientForm.city.trim(),
      clientState: clientForm.state.trim().toUpperCase(),
      clientPhone: clientForm.phone.trim(),
      clientEmail: clientForm.email.trim(),
      clientCpfCnpj: clientForm.cpfCnpj.trim(),
      clientCep: clientForm.cep.trim(),
      productName: equipmentForm.productName.trim(),
      serialNumber: equipmentForm.serialNumber.trim(),
      invoiceDate: equipmentForm.invoiceDate,
      openingDate: new Date().toISOString().split("T")[0],
      problemDescription: requestDescForm.problemDescription.trim(),
      initialDiagnostic: requestDescForm.initialDiagnostic.trim()
    });

    // Reset forms & close
    setShowAddModal(false);
    setSelectedExistingClientId("");
    setClientForm({ name: "", company: "", address: "", city: "", state: "", phone: "", email: "", cpfCnpj: "", cep: "" });
    setEquipmentForm({ productName: "", serialNumber: "", invoiceDate: "" });
    setRequestDescForm({ problemDescription: "", initialDiagnostic: "" });
  };

  // Movement handler integrating logs
  const handleMoveCard = async (reqId: string, toCol: KanbanColumnId) => {
    const card = requests.find(r => r.id === reqId);
    if (!card) return;

    if (card.columnId === toCol) return;

    const blockReason = getKanbanMoveBlockReason(card.columnId, toCol, card);
    if (blockReason) {
      appNoticeWarning(blockReason);
      return;
    }

    if (!canMoveKanbanCard(card.columnId, toCol, card)) {
      return;
    }

    if (toCol === "manutencao" && card.columnId === "orcamento") {
      const isWarranty = card.budget?.isWarranty;
      const isPaid = card.budgetPayment?.status === "paid";
      if (!isWarranty && !isPaid) {
        appNoticeWarning("Pagamento via Pagar.me necessário antes de iniciar a manutenção.");
        return;
      }
    }

    // Movement restriction check for non-admins if entering budget table editing
    if (toCol === "orcamento" && !canMoveToOrcamento(currentUser.profile)) {
      appNoticeWarning("Seu perfil não possui autorização para tabular e editar Orçamentos.");
      return;
    }

    // Creating movement history log entry
    const log: MovementLog = {
      id: `mov-${Date.now()}`,
      fromColumn: card.columnId,
      toColumn: toCol,
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: new Date().toISOString()
    };

    const updated: MaintenanceRequest = {
      ...card,
      columnId: toCol,
      movementHistory: [...card.movementHistory, log]
    };

    // If entering budget table, guarantee initial state if undefined
    if (toCol === "orcamento" && !updated.budget) {
      updated.budget = {
        isWarranty: false,
        products: [],
        services: [],
        discount: 0,
        subtotal: 0,
        totalFinal: 0,
        isApproved: false
      };
    }

    // If entering manutenção, auto initialize RAT draft if not already existing
    if (toCol === "manutencao" && !updated.rat) {
      updated.rat = {
        diagnostic: "",
        labor: [],
        parts: [],
        technicalNotes: "",
        attachments: [],
        status: "Rascunho"
      };
    }

    await onUpdateRequest(updated);

    if (toCol === "manutencao") {
      try {
        const emailResult = await triggerMaintenanceStartedEmail(reqId);
        if (emailResult.status === "failed") {
          appNoticeWarning(`Falha ao enviar e-mail de manutenção: ${emailResult.error || "erro desconhecido"}`);
        } else if (!emailResult.skipped) {
          appNoticeSuccess(`E-mail de manutenção enviado para ${emailResult.sentTo}.`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Falha ao enviar e-mail de manutenção iniciada.";
        appNoticeWarning(message);
      }
    }
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCardId(id);
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, targetColumnId: KanbanColumnId) => {
    e.preventDefault();
    const id = draggedCardId;
    if (id) {
      const card = requests.find((r) => r.id === id);
      if (card && !canMoveKanbanCard(card.columnId, targetColumnId, card)) {
        e.dataTransfer.dropEffect = "none";
        return;
      }
    }
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: KanbanColumnId) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedCardId;
    if (id) {
      handleMoveCard(id, targetColumnId);
    }
    setDraggedCardId(null);
  };

  // Search filter implementation
  const filteredRequests = requests.filter(req => {
    const term = searchTerm.toLowerCase().trim();
    const matchSearch = 
      req.id.toLowerCase().includes(term) ||
      req.clientName.toLowerCase().includes(term) ||
      req.clientCompany.toLowerCase().includes(term) ||
      req.serialNumber.toLowerCase().includes(term);

    const matchProduct = equipmentFilter === "" || req.productName === equipmentFilter;

    return matchSearch && matchProduct;
  });

  // Helper inside card clicks
  const handleCardClick = (req: MaintenanceRequest) => {
    setEditedInitialDiagnostic(req.initialDiagnostic || "");
    if (req.columnId === "solicitacao") {
      handleSetEditingRequest(req);
    } else if (req.columnId === "orcamento" || req.columnId === "recusado") {
      onOpenBudget(req);
    } else if (req.columnId === "manutencao") {
      // #region agent log
      fetch("http://127.0.0.1:7942/ingest/8708ad6b-cc5a-43ff-b2a2-d4996d444d0d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8ececf" },
        body: JSON.stringify({
          sessionId: "8ececf",
          runId: "white-screen-pre",
          hypothesisId: "click-flow",
          location: "KanbanBoard.tsx:handleCardClick",
          message: "Maintenance card clicked",
          data: {
            requestId: req.id,
            hasRat: Boolean(req.rat),
            ratStatus: req.rat?.status ?? null,
            laborType: req.rat?.labor == null ? "null" : Array.isArray(req.rat.labor) ? "array" : typeof req.rat.labor,
            partsType: req.rat?.parts == null ? "null" : Array.isArray(req.rat.parts) ? "array" : typeof req.rat.parts,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      onOpenRat(req);
    } else if (req.columnId === "liberado") {
      handleSetEditingRequest(req);
    }
  };

  const getColumnRequests = (colId: KanbanColumnId) => {
    const colRequests = filteredRequests.filter((req) => {
      if (colId === "orcamento") {
        const inOrcamento = req.columnId === "orcamento";
        const legacyRejected = req.columnId === "recusado";
        if (!inOrcamento && !legacyRejected) return false;
        if (isBudgetRejected(req)) {
          return isRejectedVisibleInOrcamento(req);
        }
        return inOrcamento;
      }
      if (colId === "liberado") {
        return req.columnId === "liberado" && isLiberadoVisibleInKanban(req);
      }
      return req.columnId === colId;
    });
    if (colId === "manutencao") {
      return [...colRequests].sort((a, b) => {
        const aFin = a.rat?.status === "Finalizado" ? 1 : 0;
        const bFin = b.rat?.status === "Finalizado" ? 1 : 0;
        return bFin - aFin;
      });
    }
    if (colId === "liberado") {
      return [...colRequests].sort(compareReleasedDesc);
    }
    return colRequests;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-bg">
      <div className="shrink-0 px-6 lg:px-8 pt-4 lg:pt-5">
        <PageHeader
          variant="page"
          title="Solicitações Kanban"
          subtitle="Gestão de pedidos de assistência técnica"
        >
          <KanbanSearchControls
            variant="header"
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            equipmentFilter={equipmentFilter}
            onEquipmentFilterChange={onEquipmentFilterChange}
            showEquipDropdown={showEquipDropdown}
            onToggleEquipDropdown={onToggleEquipDropdown}
            onCloseEquipDropdown={onCloseEquipDropdown}
            technicalProducts={technicalProducts}
            uniqueProducts={uniqueProducts}
          />
        </PageHeader>
      </div>

      <div className="flex-1 min-h-0 px-6 lg:px-8 py-4 overflow-y-auto overflow-x-auto select-none bg-bg">
        <div className="kanban-board-row flex gap-4 w-full min-w-0 items-stretch pb-2">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              config={col}
              requests={getColumnRequests(col.id)}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              onAddRequest={
                col.id === "solicitacao"
                  ? () => {
                      setShowErrors(false);
                      setShowAddModal(true);
                    }
                  : undefined
              }
              onCardClick={handleCardClick}
              onDragStart={handleDragStart}
              onDeleteCard={setRequestToDelete}
              onRejectBudget={
                col.id === "orcamento" ? (req) => setRejectConfirmRequest(req) : undefined
              }
              onGenerateShippingLabel={
                col.id === "liberado" && onGenerateShippingLabel
                  ? (req) => onGenerateShippingLabel(req.id)
                  : undefined
              }
              onDownloadShippingLabel={
                col.id === "liberado" && onDownloadShippingLabel
                  ? (req) => onDownloadShippingLabel(req.id)
                  : undefined
              }
              shippingLabelLoadingId={shippingLabelLoadingId}
              shippingLabelDownloadLoadingId={shippingLabelDownloadLoadingId}
            />
          ))}
        </div>
      </div>

      <PasswordConfirmDialog
        open={!!rejectConfirmRequest}
        title="Reprovar orçamento?"
        description={
          rejectConfirmRequest
            ? `Confirmar reprovação da ${formatRequestDisplayId(rejectConfirmRequest.id, rejectConfirmRequest.columnId)}? O card permanecerá em Orçamento por até 5 dias.`
            : ""
        }
        confirmLabel="Reprovar"
        cancelLabel="Cancelar"
        onCancel={() => setRejectConfirmRequest(null)}
        onConfirm={async (password) => {
          await verifyCurrentUserPassword(password);
          if (rejectConfirmRequest) {
            await onRejectBudget(rejectConfirmRequest.id);
            setRejectConfirmRequest(null);
          }
        }}
      />

      <PasswordConfirmDialog
        open={!!requestToDelete}
        title="Excluir ordem de serviço?"
        description={
          requestToDelete
            ? `Excluir permanentemente a ${formatRequestDisplayId(requestToDelete.id, requestToDelete.columnId)} (${requestToDelete.clientName})? Esta ação não pode ser desfeita.`
            : ""
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onCancel={() => setRequestToDelete(null)}
        onConfirm={async (password) => {
          await verifyCurrentUserPassword(password);
          if (requestToDelete) {
            onDeleteRequest(requestToDelete.id);
            setRequestToDelete(null);
          }
        }}
      />

      {/* MODAL 1: "NOVA SOLICITAÇÃO DE MANUTENÇÃO" FORM OVERLAY */}
      {showAddModal && (
        <div id="add-request-backdrop" className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-[0_24px_64px_-12px_rgba(15,23,42,0.18)] border border-slate-200/80 max-h-[92vh] flex flex-col overflow-hidden animate-fade-in text-xs">

            {/* Header claro */}
            <div className="px-6 py-5 border-b border-slate-200/80 bg-white flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider bg-orange-50 text-brand-orange border border-orange-200/70 px-2.5 py-1 rounded-full">
                  Triagem de Entrada
                </span>
                <h3 className="font-semibold text-base sm:text-lg text-slate-900 mt-2.5 leading-snug tracking-tight">
                  Nova Solicitação de O.S. de Manutenção
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="shrink-0 text-slate-400 hover:text-slate-600 p-2 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-colors duration-200"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRequest} className="flex flex-col flex-1 min-h-0 text-slate-700">
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 sm:py-6 space-y-5 bg-slate-50/70">

              {/* Step 1: Client selection drop */}
              <div className={ADD_MODAL_SECTION}>
                <div className={ADD_MODAL_SECTION_TITLE}>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 text-brand-orange">
                    <UserSquare2 className="h-4 w-4" />
                  </span>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                    <span>Selecionar Cliente *</span>
                  </label>
                </div>
                <div className="space-y-2">
                  <select
                    id="select-existing-client"
                    value={selectedExistingClientId}
                    onChange={(e) => handleClientSelectChange(e.target.value)}
                    className={`${ADD_MODAL_INPUT} font-medium`}
                    required
                  >
                    <option value="">-- Selecione o Cliente --</option>
                    <option value="add_new_client" className="text-brand-orange font-bold">+ Adicionar Cliente</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                    ))}
                  </select>
                </div>

                {/* Summary of pre-existing client choice */}
                {selectedExistingClientId && selectedExistingClientId !== "add_new_client" && (() => {
                  const selectedObj = clients.find(c => c.id === selectedExistingClientId);
                  if (!selectedObj) return null;
                  return (
                    <div className="bg-sky-50/80 border border-sky-100 p-4 rounded-xl space-y-1 text-[11px] text-sky-900">
                      <p className="font-semibold">{selectedObj.name}</p>
                      <p>{selectedObj.company} • Tel: {selectedObj.phone} • Email: {selectedObj.email}</p>
                      <p className="opacity-90">{selectedObj.address ? `${selectedObj.address}, ` : ""}{selectedObj.city} - {selectedObj.state}</p>
                      {selectedObj.cpfCnpj && <p className="font-mono mt-1">CPF/CNPJ: {selectedObj.cpfCnpj}</p>}
                    </div>
                  );
                })()}

                {/* Render the addition inputs only when "+ Adicionar Cliente" is selected */}
                {selectedExistingClientId === "add_new_client" && (
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in text-[11px]">
                    <div className="sm:col-span-2 bg-orange-50/80 border border-orange-100/90 p-3.5 rounded-xl text-brand-orange font-medium leading-relaxed">
                      Você está cadastrando um novo cliente no sistema. Preencha os dados abaixo:
                    </div>

                    <div>
                      <label className={ADD_MODAL_LABEL}>Nome do Responsável *</label>
                      <input
                        type="text"
                        placeholder="Ex: Dr. Juliano Mendes"
                        value={clientForm.name}
                        onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                        className={`${ADD_MODAL_INPUT} ${showErrors && !clientForm.name.trim() ? "border-red-500 bg-red-50/30 ring-2 ring-red-500/10" : ""}`}
                      />
                    </div>

                    <div>
                      <label className={ADD_MODAL_LABEL}>CPF / CNPJ *</label>
                      <input
                        type="text"
                        placeholder="Ex: 000.000.000-00 ou 00.000.000/0000-00"
                        value={clientForm.cpfCnpj}
                        onChange={(e) => setClientForm({ ...clientForm, cpfCnpj: e.target.value })}
                        className={`${ADD_MODAL_INPUT} font-mono ${showErrors && !clientForm.cpfCnpj.trim() ? "border-red-500 bg-red-50/30 ring-2 ring-red-500/10" : ""}`}
                      />
                    </div>

                    <div>
                      <label className={ADD_MODAL_LABEL}>Empresa / Clínica (não obrigatório)</label>
                      <input
                        type="text"
                        placeholder="Ex: Clinio Reabilitação Ltda"
                        value={clientForm.company}
                        onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })}
                        className={ADD_MODAL_INPUT}
                      />
                    </div>

                    <div>
                      <label className={ADD_MODAL_LABEL}>Telefone Celular / WhatsApp</label>
                      <input
                        type="text"
                        placeholder="Ex: (11) 98112-0044"
                        value={clientForm.phone}
                        onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                        className={ADD_MODAL_INPUT}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className={ADD_MODAL_LABEL}>E-mail de Contato</label>
                      <input
                        type="email"
                        placeholder="Ex: juliano@empresa.com"
                        value={clientForm.email}
                        onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                        className={ADD_MODAL_INPUT}
                      />
                    </div>

                    <div>
                      <label className={ADD_MODAL_LABEL}>CEP</label>
                      <input
                        type="text"
                        placeholder="Ex: 01001-000"
                        value={clientForm.cep}
                        onChange={(e) => setClientForm({ ...clientForm, cep: e.target.value })}
                        className={`${ADD_MODAL_INPUT} font-mono`}
                      />
                    </div>

                    <div>
                      <label className={ADD_MODAL_LABEL}>Endereço de envio postal</label>
                      <input
                        type="text"
                        placeholder="Ex: Rua das Amoreiras, 102 - Bloco D"
                        value={clientForm.address}
                        onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                        className={ADD_MODAL_INPUT}
                      />
                    </div>

                    <div>
                      <label className={ADD_MODAL_LABEL}>Cidade</label>
                      <input
                        type="text"
                        placeholder="Ex: São Paulo"
                        value={clientForm.city}
                        onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })}
                        className={ADD_MODAL_INPUT}
                      />
                    </div>

                    <div>
                      <label className={ADD_MODAL_LABEL}>Estado (UF)</label>
                      <select
                        value={clientForm.state}
                        onChange={(e) => setClientForm({ ...clientForm, state: e.target.value })}
                        className={`${ADD_MODAL_INPUT} font-medium`}
                      >
                        <option value="">UF</option>
                        {["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Equipment details and problem description */}
              <div className={ADD_MODAL_SECTION}>
                <div className={ADD_MODAL_SECTION_TITLE}>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 text-brand-orange">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Dados do Equipamento Técnico
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className={ADD_MODAL_LABEL}>Produto / Equipamento *</label>
                    <select
                      required
                      value={equipmentForm.productName}
                      onChange={(e) => setEquipmentForm({ ...equipmentForm, productName: e.target.value })}
                      className={`${ADD_MODAL_INPUT} font-medium ${showErrors && !equipmentForm.productName.trim() ? "border-red-500 bg-red-50/30 ring-2 ring-red-500/10" : ""}`}
                    >
                      <option value="">-- Selecione o Equipamento --</option>
                      {technicalProducts.map(tp => (
                        <option key={tp.id} value={tp.name}>{tp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={ADD_MODAL_LABEL}>Número de Série *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: SN-889-10"
                      value={equipmentForm.serialNumber}
                      onChange={(e) => setEquipmentForm({ ...equipmentForm, serialNumber: e.target.value })}
                      className={`${ADD_MODAL_INPUT} font-mono ${showErrors && !equipmentForm.serialNumber.trim() ? "border-red-500 bg-red-50/30 ring-2 ring-red-500/10" : ""}`}
                    />
                  </div>
                  <div>
                    <label className={ADD_MODAL_LABEL}>Data da Nota Fiscal (NF)</label>
                    <input
                      type="date"
                      value={equipmentForm.invoiceDate}
                      onChange={(e) => setEquipmentForm({ ...equipmentForm, invoiceDate: e.target.value })}
                      className={`${ADD_MODAL_INPUT} font-mono`}
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: problem details */}
              <div className={ADD_MODAL_SECTION}>
                <div className={ADD_MODAL_SECTION_TITLE}>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 text-brand-orange">
                    <AlertCircle className="h-4 w-4" />
                  </span>
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Problema Relatado e Diagnóstico Inicial
                  </h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={ADD_MODAL_LABEL}>Descrição Comercial do Problema *</label>
                    <textarea
                      required
                      placeholder="Descreva de forma detalhada o sintoma relatado do erro operacional vivenciado pelo cliente..."
                      value={requestDescForm.problemDescription}
                      onChange={(e) => setRequestDescForm({ ...requestDescForm, problemDescription: e.target.value })}
                      className={`${ADD_MODAL_INPUT} min-h-[88px] resize-y text-slate-800 ${showErrors && !requestDescForm.problemDescription.trim() ? "border-red-500 bg-red-50/30 ring-2 ring-red-500/10" : ""}`}
                    />
                  </div>
                  <div>
                    <label className={ADD_MODAL_LABEL}>Diagnóstico Técnico</label>
                    <textarea
                      placeholder="Observações visuais obtidas durante a recepção no balcão e triagem de entrada..."
                      value={requestDescForm.initialDiagnostic}
                      onChange={(e) => setRequestDescForm({ ...requestDescForm, initialDiagnostic: e.target.value })}
                      className={`${ADD_MODAL_INPUT} min-h-[88px] resize-y text-slate-800`}
                    />
                  </div>
                </div>
              </div>

              </div>

              <div className="shrink-0 flex justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-slate-200/80 bg-white/95 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-save-new-solicitacao-modal"
                  className="px-5 py-2.5 bg-brand-gradient hover:opacity-95 hover:shadow-md text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all duration-200"
                >
                  Criar Cartão
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITING / CONSULTATION VIEW MODAL FOR ACTIVE CARDS parameters (Column 1 and 4 views) */}
      {editingRequest && (
        <div id="editing-request-backdrop" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-fade-in text-xs text-slate-700">
            
            {/* Header */}
            <div className="p-5 border-b border-border bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase bg-brand-orange/20 text-brand-orange px-2 py-0.5 rounded">Ficha de O.S. de Assistência</span>
                <h3 className="font-bold text-sm mt-1.5 text-white">Consolidado Técnico: {formatRequestDisplayId(editingRequest.id, editingRequest.columnId)}</h3>
              </div>
              <button onClick={() => handleSetEditingRequest(null)} className="text-slate-400 hover:text-white p-1 bg-slate-800 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Customer info */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Informações do Cliente e Empresa</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block">Responsável:</span>
                    <strong className="text-slate-800 text-[12px]">{editingRequest.clientName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Empresa/Organização:</span>
                    <strong className="text-slate-800 text-[12px]">{editingRequest.clientCompany}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Celular/WhatsApp:</span>
                    <span>{editingRequest.clientPhone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">E-mail corporativo:</span>
                    <span className="font-mono text-blue-600">{editingRequest.clientEmail}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Endereço de envio:</span>
                    <span>{editingRequest.clientAddress}, {editingRequest.clientCity} - {editingRequest.clientState}</span>
                  </div>
                </div>
              </div>

              {/* Equipment details */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] border-b pb-1">Identificação da Máquina</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 block">Produto/Aparelho:</span>
                    <strong className="text-slate-800">{editingRequest.productName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Número Serial S/N:</span>
                    <strong className="text-slate-800 font-mono">{editingRequest.serialNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Emissão da NF:</span>
                    <span>{editingRequest.invoiceDate ? formatDate(editingRequest.invoiceDate) : "Não informada"}</span>
                  </div>
                </div>
              </div>

              {/* Syntom details */}
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Defeitos e Diagnóstico Técnico</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-500 font-semibold block mb-1">Sintoma Comercial:</span>
                    <p className="text-slate-700 bg-white p-2.5 rounded border italic border-slate-200 leading-relaxed font-sans">{editingRequest.problemDescription}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block mb-1">Diagnóstico Técnico:</span>
                    <div className="flex gap-2 items-start mt-1.5">
                      <textarea
                        value={editedInitialDiagnostic}
                        onChange={(e) => setEditedInitialDiagnostic(e.target.value)}
                        placeholder="Nenhum diagnóstico visual cadastrado. Caso necessário, escreva ou edite-o aqui..."
                        className="flex-1 text-text-primary p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/15 text-xs min-h-[75px] bg-white resize-y"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!editingRequest) return;
                          const updatedReq = {
                            ...editingRequest,
                            initialDiagnostic: editedInitialDiagnostic.trim()
                          };
                          onUpdateRequest(updatedReq);
                          handleSetEditingRequest(updatedReq);
                          appNoticeSuccess("Diagnóstico visual de triagem atualizado com sucesso!");
                        }}
                        className="px-4 py-2.5 bg-brand-gradient hover:opacity-90 text-white font-semibold rounded-xl shrink-0 transition-all text-xs shadow-sm"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Orçamento Técnico section in Consolidated Ficha modal */}
              {editingRequest.budget && (
                <div className="space-y-3 bg-blue-50/40 p-4 rounded-xl border border-blue-100/50">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Orçamento Consolidado</h4>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenBudget(editingRequest, true);
                        // Auto close this modal to focus on the budget
                        handleSetEditingRequest(null);
                      }}
                      className="px-2.5 py-1 bg-card hover:bg-orange-50 hover:text-brand-orange text-text-primary border border-border rounded-lg text-[10px] font-semibold shadow-card transition-all cursor-pointer flex items-center gap-1 uppercase"
                    >
                      <FileCheck2 className="h-3.5 w-3.5 text-brand-orange" />
                      <span>Abrir Orçamento</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 mt-1 text-slate-600 font-sans">
                    <div>
                      <span className="text-slate-400 block">Tipo:</span>
                      <strong className="text-slate-700">{editingRequest.budget.isWarranty ? "Garantia Técnica" : "Orçamento Particular"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Valor Consolidado:</span>
                      <strong className="text-slate-700">
                        {editingRequest.budget.isWarranty 
                          ? "R$ 0,00" 
                          : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(editingRequest.budget.totalFinal)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Aprovação:</span>
                      <strong className={editingRequest.budget.isApproved ? "text-emerald-700" : "text-amber-700"}>
                        {editingRequest.budget.isApproved ? "✓ Aprovado" : "Pendente"}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Log History timeline details */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] border-b pb-1">Histórico e Log de Movimentação do Card</h4>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {editingRequest.movementHistory.map((log, index) => {
                    const getFriendlyColumnLabel = (col: string) => {
                      switch (col) {
                        case "nova_solicitacao": return "Solicitação Criada";
                        case "solicitacao": return "Solicitação";
                        case "orcamento": return "Orçamento";
                        case "manutencao": return "Em Manutenção";
                        case "liberado": return "Liberado";
                        case "recusado": return "Orçamento Recusado";
                        default: return String(col).toUpperCase();
                      }
                    };
                    const fromLabel = getFriendlyColumnLabel(log.fromColumn);
                    const toLabel = getFriendlyColumnLabel(log.toColumn);

                    return (
                      <div key={log.id || index} className="flex items-center justify-between text-[11px] bg-slate-50 p-2.5 rounded border border-slate-100 font-sans">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-blue-600 px-1 bg-blue-50 border rounded text-[9.5px]">ETAPA</span>
                          <span className="text-slate-500">{fromLabel}</span>
                          <ArrowRight className="h-3 w-3 text-text-secondary mx-1 inline-block" />
                          <span className="text-slate-800 font-bold">{toLabel}</span>
                        </div>
                        <div className="text-right text-slate-400 text-[10px]">
                          <span>Por: {log.userName}</span>
                          <span className="mx-1">•</span>
                          <span>{new Date(log.timestamp).toLocaleString("pt-BR")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-100 flex justify-between items-center no-print">
              
              {/* Option to delete OS card restricted to admins */}
              {isAdminProfile(currentUser.profile) ? (
                <button
                  type="button"
                  id="btn-delete-request-os"
                  onClick={() => {
                    if (confirm(`DESEJA EXCLUIR DEFINITIVAMENTE A ORDEM DE SERVIÇO ${editingRequest.id}? Esta operação é irreversível.`)) {
                      onDeleteRequest(editingRequest.id);
                      handleSetEditingRequest(null);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 bg-white border border-red-200 rounded-xl"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Excluir O.S.</span>
                </button>
              ) : <div />}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSetEditingRequest(null)}
                  className="px-5 py-2 bg-brand-gradient hover:opacity-90 text-white font-semibold rounded-xl shadow-sm cursor-pointer"
                >
                  Fechar Ficha
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
