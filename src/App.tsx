/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  User,
  Client,
  ProductCatalog,
  ServiceCatalog,
  MaintenanceRequest,
  Budget,
  RAT,
  PaymentProof,
  TechnicalProduct,
} from "./types";
import Sidebar from "./components/Sidebar";
import LoginScreen from "./components/LoginScreen";
import KanbanBoard from "./components/KanbanBoard";
import CustomersSection from "./components/CustomersSection";
import ReportsSection from "./components/ReportsSection";
import PoliciesSection from "./components/PoliciesSection";
import SettingsSection from "./components/SettingsSection";
import OsDatabaseSection from "./components/OsDatabaseSection";
import BudgetModal from "./components/BudgetModal";
import RatModal from "./components/RatModal";
import { AppTab } from "./navigation";
import { useAppData } from "./hooks/useAppData";
import { subscribeToAuth, subscribeToUserProfile, logoutUser } from "./services/authService";
import {
  triggerMaintenanceStartedEmail,
  triggerRatFinalizedEmail,
  triggerTrackingEmail,
} from "./services/documentEmailApi";
import { generateShippingLabel, downloadShippingLabelZpl } from "./services/shippingLabelApi";
import { openHubTestes } from "./services/hubTestesApi";
import {
  appNoticeError,
  appNoticeSuccess,
  appNoticeWarning,
} from "./utils/appNotice";
import {
  createMaintenanceRequest,
  updateMaintenanceRequest,
  updateMaintenanceRequestBudget,
  deleteMaintenanceRequest,
  createClient,
  updateClient,
  deleteClient,
  createService,
  updateService,
  deleteService,
  createTechnicalProduct,
  updateTechnicalProduct,
  deleteTechnicalProduct,
  createAdminUserViaApi,
  updateAdminUserViaApi,
  deleteAdminUserViaApi,
} from "./services/firestoreService";
import PublicPaymentPage from "./pages/PublicPaymentPage";
import AppTopBar from "./components/AppTopBar";
import { usePaymentPolling } from "./hooks/usePaymentPolling";
import { Loader2 } from "lucide-react";
import { isAdminProfile, PROTECTED_USER_EMAILS, canEditBudget, canEditRat, canAccessHubTestes } from "./services/userRoles";

export default function App() {
  const publicPathMatch =
    typeof window !== "undefined" ? window.location.pathname.match(/^\/pagamento\/([^/]+)\/?$/) : null;

  if (publicPathMatch) {
    return <PublicPaymentPage token={decodeURIComponent(publicPathMatch[1])} />;
  }

  return <AppShell />;
}

function AppShell() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const {
    users,
    clients,
    productsCatalog,
    servicesCatalog,
    technicalProducts,
    requests,
    notifications,
    loading: dataLoading,
  } = useAppData(!!currentUser);

  usePaymentPolling(requests, !!currentUser);

  const [activeTab, setActiveTab] = useState<AppTab>("relatorios");
  const [kanbanSearchTerm, setKanbanSearchTerm] = useState("");
  const [kanbanEquipmentFilter, setKanbanEquipmentFilter] = useState("");
  const [kanbanShowEquipDropdown, setKanbanShowEquipDropdown] = useState(false);

  const [activeBudgetReq, setActiveBudgetReq] = useState<MaintenanceRequest | null>(null);
  const [activeBudgetReqShowPdf, setActiveBudgetReqShowPdf] = useState<boolean>(false);
  const [budgetReadOnly, setBudgetReadOnly] = useState(false);
  const [activeRatReq, setActiveRatReq] = useState<MaintenanceRequest | null>(null);
  const [activeRatShowPdf, setActiveRatShowPdf] = useState(false);
  const [ratReadOnly, setRatReadOnly] = useState(false);
  const [initialEditingRequest, setInitialEditingRequest] = useState<MaintenanceRequest | null>(null);
  const [budgetReturnView, setBudgetReturnView] = useState<{
    type: "rat" | "consolidated";
    request: MaintenanceRequest;
  } | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = subscribeToUserProfile(currentUser.id, (profile) => {
      if (profile) {
        setCurrentUser(profile);
      }
    });
    return unsub;
  }, [currentUser?.id]);

  useEffect(() => {
    if (!activeBudgetReq) return;
    const updated = requests.find((r) => r.id === activeBudgetReq.id);
    if (!updated) return;
    const budgetJson = JSON.stringify(updated.budget ?? null);
    const activeBudgetJson = JSON.stringify(activeBudgetReq.budget ?? null);
    if (
      updated.columnId !== activeBudgetReq.columnId ||
      updated.budgetPayment?.status !== activeBudgetReq.budgetPayment?.status ||
      updated.budgetPayment?.amountCents !== activeBudgetReq.budgetPayment?.amountCents ||
      updated.budgetPayment?.pixQrCode !== activeBudgetReq.budgetPayment?.pixQrCode ||
      updated.budgetPayment?.paymentLinkUrl !== activeBudgetReq.budgetPayment?.paymentLinkUrl ||
      updated.budgetPayment?.publicToken !== activeBudgetReq.budgetPayment?.publicToken ||
      updated.budgetPayment?.method !== activeBudgetReq.budgetPayment?.method ||
      updated.budget?.isApproved !== activeBudgetReq.budget?.isApproved ||
      budgetJson !== activeBudgetJson
    ) {
      setActiveBudgetReq(updated);
    }
  }, [requests, activeBudgetReq]);

  useEffect(() => {
    if (!activeRatReq) return;
    const updated = requests.find((r) => r.id === activeRatReq.id);
    if (!updated) return;
    const deliveriesJson = JSON.stringify(updated.emailDeliveries ?? []);
    const activeDeliveriesJson = JSON.stringify(activeRatReq.emailDeliveries ?? []);
    if (
      updated.shippingLabel?.trackingCode !== activeRatReq.shippingLabel?.trackingCode ||
      updated.trackingEmailSentAt !== activeRatReq.trackingEmailSentAt ||
      deliveriesJson !== activeDeliveriesJson
    ) {
      setActiveRatReq(updated);
    }
  }, [requests, activeRatReq]);

  const handleNavigateToRequest = (requestId: string) => {
    const req = requests.find((r) => r.id === requestId);
    setActiveTab("kanban");
    if (req) {
      setInitialEditingRequest(req);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setActiveTab("relatorios");
  };

  const handleAddRequest = async (
    newReqData: Omit<MaintenanceRequest, "id" | "requestNumber" | "movementHistory">
  ) => {
    try {
      const initialLog = {
        id: `mov-init-${Date.now()}`,
        fromColumn: "nova_solicitacao" as const,
        toColumn: "solicitacao" as const,
        userId: currentUser?.id || "usr-anon",
        userName: currentUser?.name || "Anônimo",
        timestamp: new Date().toISOString(),
      };

      const clientExists = clients.some(
        (c) =>
          c.id === newReqData.clientId ||
          (c.name.toLowerCase() === newReqData.clientName.toLowerCase() &&
            c.company.toLowerCase() === newReqData.clientCompany.toLowerCase())
      );

      let finalClientId = newReqData.clientId;

      if (!clientExists) {
        const newClientEntity: Client = {
          id: `cli-${Date.now()}`,
          name: newReqData.clientName,
          company: newReqData.clientCompany,
          address: newReqData.clientAddress,
          city: newReqData.clientCity,
          state: newReqData.clientState,
          phone: newReqData.clientPhone,
          email: newReqData.clientEmail,
          cpfCnpj: newReqData.clientCpfCnpj || "",
          cep: newReqData.clientCep,
        };
        finalClientId = newClientEntity.id;
        await createClient(newClientEntity);
      }

      await createMaintenanceRequest(
        { ...newReqData, clientId: finalClientId },
        initialLog
      );
    } catch (err) {
      console.error(err);
      appNoticeError("Erro ao criar ordem de serviço. Verifique sua conexão e permissões.");
    }
  };

  const handleUpdateRequest = async (updated: MaintenanceRequest) => {
    await updateMaintenanceRequest(updated);
  };

  const handleDeleteRequest = async (id: string) => {
    await deleteMaintenanceRequest(id);
  };

  const handleSaveBudget = async (requestId: string, budget: Budget) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) {
      throw new Error("Ordem de serviço não encontrada para salvar o orçamento.");
    }

    await updateMaintenanceRequestBudget(requestId, budget);

    const updated: MaintenanceRequest = { ...req, budget };
    if (activeBudgetReq && activeBudgetReq.id === requestId) {
      setActiveBudgetReq(updated);
    }
  };

  const handleApproveBudget = async (requestId: string, budgetOverride?: Budget) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    const budget = budgetOverride ?? req.budget;

    // #region agent log
    fetch("http://127.0.0.1:7942/ingest/8708ad6b-cc5a-43ff-b2a2-d4996d444d0d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8ececf" },
      body: JSON.stringify({
        sessionId: "8ececf",
        runId: "warranty-fix",
        hypothesisId: "warranty-race",
        location: "App.tsx:handleApproveBudget",
        message: "Approve budget invoked",
        data: {
          requestId,
          overrideIsWarranty: budgetOverride?.isWarranty ?? null,
          storedIsWarranty: req.budget?.isWarranty ?? null,
          effectiveIsWarranty: budget?.isWarranty ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (budget && !budget.isWarranty) {
      appNoticeWarning("Orçamentos particulares só avançam após pagamento confirmado via Pagar.me.");
      throw new Error("Orçamento particular exige pagamento confirmado.");
    }

    const log = {
      id: `mov-${Date.now()}`,
      fromColumn: req.columnId,
      toColumn: "manutencao" as const,
      userId: currentUser?.id || "usr-anon",
      userName: currentUser?.name || "Anônimo",
      timestamp: new Date().toISOString(),
    };

    const updated: MaintenanceRequest = {
      ...req,
      columnId: "manutencao",
      budget: budget
        ? { ...budget, isApproved: true, approvedDate: new Date().toISOString() }
        : undefined,
      movementHistory: [...req.movementHistory, log],
      rat: req.rat || {
        diagnostic: req.initialDiagnostic || "",
        labor: [],
        parts: [],
        technicalNotes: "",
        attachments: [],
        status: "Rascunho",
      },
    };

    await handleUpdateRequest(updated);

    try {
      const emailResult = await triggerMaintenanceStartedEmail(requestId);
      if (emailResult.skipped) {
        appNoticeWarning("E-mail de manutenção já havia sido enviado anteriormente.");
      } else if (emailResult.status === "failed") {
        appNoticeWarning(`Falha ao enviar e-mail de manutenção: ${emailResult.error || "erro desconhecido"}`);
      } else {
        appNoticeSuccess(`E-mail de manutenção enviado para ${emailResult.sentTo}.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao enviar e-mail de manutenção iniciada.";
      appNoticeWarning(message);
    }
  };

  const handleRejectBudget = async (requestId: string) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    const now = new Date().toISOString();
    const log = {
      id: `mov-${Date.now()}`,
      fromColumn: req.columnId,
      toColumn: "orcamento" as const,
      userId: currentUser?.id || "usr-anon",
      userName: currentUser?.name || "Anônimo",
      timestamp: now,
    };

    const updated: MaintenanceRequest = {
      ...req,
      columnId: "orcamento",
      budgetRejectedAt: now,
      movementHistory: [...req.movementHistory, log],
    };

    await handleUpdateRequest(updated);
  };

  const handleSaveRat = async (requestId: string, rat: RAT) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    const updated: MaintenanceRequest = { ...req, rat };
    await handleUpdateRequest(updated);

    if (activeRatReq && activeRatReq.id === requestId) {
      setActiveRatReq(updated);
    }
  };

  const handleFinalizeRat = async (requestId: string) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    const updated: MaintenanceRequest = {
      ...req,
      rat: req.rat
        ? { ...req.rat, status: "Finalizado", finalizedDate: new Date().toISOString() }
        : undefined,
    };
    await handleUpdateRequest(updated);

    if (activeRatReq && activeRatReq.id === requestId) {
      setActiveRatReq(updated);
    }

    try {
      await triggerRatFinalizedEmail(requestId);
    } catch (err) {
      console.warn("Falha ao enviar e-mail da RAT finalizada:", err);
    }
  };

  const handleReopenRat = async (requestId: string) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    const updated: MaintenanceRequest = {
      ...req,
      rat: req.rat ? { ...req.rat, status: "Rascunho", finalizedDate: undefined } : undefined,
    };
    await handleUpdateRequest(updated);

    if (activeRatReq && activeRatReq.id === requestId) {
      setActiveRatReq(updated);
    }
  };

  const handleOpenHubTestes = async () => {
    try {
      await openHubTestes();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao abrir o Hub de Testes.";
      appNoticeError(message);
    }
  };

  const [shippingLabelLoadingId, setShippingLabelLoadingId] = useState<string | null>(null);
  const [shippingLabelDownloadLoadingId, setShippingLabelDownloadLoadingId] = useState<string | null>(null);
  const [trackingEmailResendLoadingId, setTrackingEmailResendLoadingId] = useState<string | null>(null);

  const handleResendTrackingEmail = async (requestId: string) => {
    setTrackingEmailResendLoadingId(requestId);
    try {
      const result = await triggerTrackingEmail(requestId);
      if (result.status === "sent") {
        appNoticeSuccess(`E-mail de rastreio reenviado para ${result.sentTo}.`);
      } else if (result.status === "failed") {
        appNoticeWarning(`Falha ao reenviar e-mail de rastreio: ${result.error || "erro desconhecido"}`);
      } else if (result.status === "skipped") {
        appNoticeWarning(`Reenvio de rastreio ignorado: ${result.error || "motivo desconhecido"}`);
      } else {
        appNoticeWarning("Reenvio de rastreio concluído sem confirmação de envio.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao reenviar e-mail de rastreio.";
      appNoticeError(message);
    } finally {
      setTrackingEmailResendLoadingId(null);
    }
  };

  const handleGenerateShippingLabel = async (requestId: string) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    if (req.shippingLabel?.trackingCode) {
      appNoticeWarning(`Etiqueta já gerada. Rastreio: ${req.shippingLabel.trackingCode}`);
      return;
    }

    setShippingLabelLoadingId(requestId);
    try {
      const result = await generateShippingLabel(requestId);
      const updated: MaintenanceRequest = {
        ...req,
        shippingLabel: result.shippingLabel,
      };
      await handleUpdateRequest(updated);

      if (activeRatReq && activeRatReq.id === requestId) {
        setActiveRatReq(updated);
      }
      if (initialEditingRequest && initialEditingRequest.id === requestId) {
        setInitialEditingRequest(updated);
      }

      const email = result.emailResult;
      if (email?.status === "sent") {
        appNoticeSuccess(`Etiqueta gerada! Rastreio: ${result.trackingCode}. E-mail enviado para ${email.sentTo}.`);
      } else if (email?.status === "skipped") {
        appNoticeWarning(`Etiqueta gerada (rastreio: ${result.trackingCode}), mas o e-mail de rastreio foi ignorado: ${email.error || "já enviado anteriormente"}.`);
      } else if (email?.status === "failed") {
        appNoticeWarning(`Etiqueta gerada (rastreio: ${result.trackingCode}), mas o e-mail falhou: ${email.error || "erro desconhecido"}`);
      } else if (!email) {
        appNoticeWarning(`Etiqueta gerada (rastreio: ${result.trackingCode}), mas não houve confirmação do envio do e-mail. Verifique o status no card da O.S.`);
      } else {
        appNoticeWarning(`Etiqueta gerada (rastreio: ${result.trackingCode}), mas o e-mail de rastreio não foi confirmado.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao gerar etiqueta.";
      appNoticeError(message);
    } finally {
      setShippingLabelLoadingId(null);
    }
  };

  const handleDownloadShippingLabel = async (requestId: string) => {
    setShippingLabelDownloadLoadingId(requestId);
    try {
      await downloadShippingLabelZpl(requestId);
      appNoticeSuccess("Etiqueta baixada com sucesso.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao baixar etiqueta.";
      appNoticeError(message);
    } finally {
      setShippingLabelDownloadLoadingId(null);
    }
  };

  const handleReleaseRequest = async (requestId: string, payment?: PaymentProof) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    const log = {
      id: `mov-${Date.now()}`,
      fromColumn: req.columnId,
      toColumn: "liberado" as const,
      userId: currentUser?.id || "usr-anon",
      userName: currentUser?.name || "Anônimo",
      timestamp: new Date().toISOString(),
    };

    const updated: MaintenanceRequest = {
      ...req,
      columnId: "liberado",
      releasedDate: new Date().toISOString().split("T")[0],
      movementHistory: [...req.movementHistory, log],
    };

    if (payment) {
      updated.paymentProof = payment;
    }

    await handleUpdateRequest(updated);
  };

  const handleAddService = async (srv: Omit<ServiceCatalog, "id">) => {
    const next: ServiceCatalog = { id: `srv-${Date.now()}`, ...srv };
    await createService(next);
  };

  const handleEditService = async (srv: ServiceCatalog) => {
    await updateService(srv);
  };

  const handleDeleteService = async (id: string) => {
    await deleteService(id);
  };

  const handleAddUser = async (
    u: Omit<User, "id"> & { password?: string }
  ) => {
    if (!u.password?.trim()) {
      throw new Error("Defina uma senha inicial para o novo usuário.");
    }
    await createAdminUserViaApi({
      name: u.name,
      email: u.email,
      profile: u.profile,
      password: u.password.trim(),
    });
  };

  const handleEditUser = async (u: User, password?: string) => {
    await updateAdminUserViaApi(u.id, {
      name: u.name,
      email: u.email,
      profile: u.profile,
      ...(password?.trim() ? { password: password.trim() } : {}),
    });
  };

  const handleDeleteUser = async (id: string) => {
    const target = users.find((u) => u.id === id);
    if (PROTECTED_USER_EMAILS.includes(target?.email.toLowerCase() || "")) {
      appNoticeWarning("Não é permitido excluir este usuário administrador principal.");
      return;
    }
    if (currentUser?.id === id) {
      appNoticeWarning("Você não pode excluir sua própria conta enquanto estiver logado.");
      return;
    }
    await deleteAdminUserViaApi(id);
  };

  const handleAddClient = async (client: Omit<Client, "id">) => {
    const next: Client = { id: `cli-${Date.now()}`, ...client };
    await createClient(next);
  };

  const handleEditClient = async (client: Client) => {
    await updateClient(client);
  };

  const handleDeleteClient = async (clientId: string) => {
    await deleteClient(clientId);
  };

  const handleAddTechnicalProduct = async (name: string) => {
    const next: TechnicalProduct = { id: `tp-${Date.now()}`, name: name.trim() };
    await createTechnicalProduct(next);
  };

  const handleEditTechnicalProduct = async (prod: TechnicalProduct) => {
    await updateTechnicalProduct({ ...prod, name: prod.name.trim() });
  };

  const handleDeleteTechnicalProduct = async (id: string) => {
    await deleteTechnicalProduct(id);
  };

  const kanbanUniqueProducts = useMemo(
    () => Array.from(new Set(requests.map((r) => r.productName))),
    [requests]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
        <p className="text-sm text-slate-500">Carregando dados do sistema...</p>
      </div>
    );
  }

  const isAdmin = isAdminProfile(currentUser.profile);
  const profile = currentUser.profile;
  const userCanEditBudget = canEditBudget(profile);
  const userCanEditRat = canEditRat(profile);
  const userCanOpenHub = canAccessHubTestes(profile);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg font-sans">
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenHubTestes={handleOpenHubTestes}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <AppTopBar currentUserName={currentUser.name} />

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {activeTab === "kanban" && (
          <KanbanBoard
            requests={requests}
            clients={clients}
            productsCatalog={productsCatalog}
            technicalProducts={technicalProducts}
            currentUser={currentUser}
            onAddRequest={handleAddRequest}
            onUpdateRequest={handleUpdateRequest}
            onDeleteRequest={handleDeleteRequest}
            onOpenBudget={(req, showPdf = false) => {
              if (showPdf) {
                setBudgetReturnView({ type: "consolidated", request: req });
              } else {
                setBudgetReturnView(null);
              }
              setBudgetReadOnly(false);
              setActiveBudgetReq(req);
              setActiveBudgetReqShowPdf(showPdf);
            }}
            onOpenRat={(req) => {
              setRatReadOnly(false);
              setActiveRatShowPdf(false);
              setActiveRatReq(req);
            }}
            onRejectBudget={handleRejectBudget}
            onGenerateShippingLabel={handleGenerateShippingLabel}
            onDownloadShippingLabel={handleDownloadShippingLabel}
            shippingLabelLoadingId={shippingLabelLoadingId}
            shippingLabelDownloadLoadingId={shippingLabelDownloadLoadingId}
            searchTerm={kanbanSearchTerm}
            equipmentFilter={kanbanEquipmentFilter}
            onSearchChange={setKanbanSearchTerm}
            onEquipmentFilterChange={setKanbanEquipmentFilter}
            showEquipDropdown={kanbanShowEquipDropdown}
            onToggleEquipDropdown={() => setKanbanShowEquipDropdown((v) => !v)}
            onCloseEquipDropdown={() => setKanbanShowEquipDropdown(false)}
            uniqueProducts={kanbanUniqueProducts}
            initialEditingRequest={initialEditingRequest}
            onCloseEditingRequest={() => setInitialEditingRequest(null)}
          />
        )}

        {activeTab === "clientes" && (
          <CustomersSection
            clients={clients}
            requests={requests}
            onAddClient={handleAddClient}
            onEditClient={handleEditClient}
            onDeleteClient={handleDeleteClient}
            currentUserProfile={currentUser.profile}
          />
        )}

        {activeTab === "base_dados" && (
          <OsDatabaseSection
            requests={requests}
            onPreviewBudget={(req) => {
              setBudgetReturnView(null);
              setBudgetReadOnly(true);
              setActiveBudgetReq(req);
              setActiveBudgetReqShowPdf(true);
            }}
            onPreviewRat={(req) => {
              setRatReadOnly(true);
              setActiveRatShowPdf(true);
              setActiveRatReq(req);
            }}
          />
        )}

        {activeTab === "relatorios" && (
          <ReportsSection
            requests={requests}
            products={productsCatalog}
            onNavigateToKanban={() => setActiveTab("kanban")}
          />
        )}

        {activeTab === "politicas" && <PoliciesSection />}

        {activeTab === "configuracoes" && isAdmin && (
          <SettingsSection
            products={productsCatalog}
            services={servicesCatalog}
            users={users}
            technicalProducts={technicalProducts}
            onAddService={handleAddService}
            onEditService={handleEditService}
            onDeleteService={handleDeleteService}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            onAddTechnicalProduct={handleAddTechnicalProduct}
            onEditTechnicalProduct={handleEditTechnicalProduct}
            onDeleteTechnicalProduct={handleDeleteTechnicalProduct}
            currentUser={currentUser}
          />
        )}
        </div>
      </main>

      {activeBudgetReq && (
        <BudgetModal
          request={activeBudgetReq}
          productsCatalog={productsCatalog}
          servicesCatalog={servicesCatalog}
          onSaveBudget={handleSaveBudget}
          onApproveBudget={handleApproveBudget}
          onRejectBudget={handleRejectBudget}
          onClose={() => {
            setActiveBudgetReq(null);
            setActiveBudgetReqShowPdf(false);
            setBudgetReadOnly(false);
            if (budgetReturnView) {
              if (budgetReturnView.type === "rat") {
                setActiveRatReq(budgetReturnView.request);
              } else if (budgetReturnView.type === "consolidated") {
                setInitialEditingRequest(budgetReturnView.request);
              }
              setBudgetReturnView(null);
            }
          }}
          canEdit={userCanEditBudget && !budgetReadOnly}
          initialShowPdf={activeBudgetReqShowPdf}
        />
      )}

      {activeRatReq && (
        <RatModal
          request={activeRatReq}
          onSaveRat={handleSaveRat}
          onFinalizeRat={handleFinalizeRat}
          onReopenRat={handleReopenRat}
          onReleaseRequest={handleReleaseRequest}
          onGenerateShippingLabel={handleGenerateShippingLabel}
          isGeneratingShippingLabel={shippingLabelLoadingId === activeRatReq.id}
          onResendTrackingEmail={handleResendTrackingEmail}
          isResendingTrackingEmail={trackingEmailResendLoadingId === activeRatReq.id}
          onOpenHubTestes={userCanOpenHub ? handleOpenHubTestes : undefined}
          onClose={() => {
            setActiveRatReq(null);
            setActiveRatShowPdf(false);
            setRatReadOnly(false);
          }}
          canEdit={userCanEditRat && !ratReadOnly}
          readOnly={ratReadOnly}
          initialShowPdf={activeRatShowPdf}
          currentUser={currentUser}
          onOpenBudget={(req) => {
            setBudgetReturnView({ type: "rat", request: req });
            setActiveRatReq(null);
            setActiveRatShowPdf(false);
            setRatReadOnly(false);
            setBudgetReadOnly(false);
            setActiveBudgetReq(req);
            setActiveBudgetReqShowPdf(true);
          }}
        />
      )}
    </div>
  );
}
