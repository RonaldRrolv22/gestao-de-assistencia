/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ProductCatalog, ServiceCatalog, User, UserRole, TechnicalProduct } from "../types";
import { 
  Package, 
  Settings, 
  Users, 
  ShieldAlert, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  HelpCircle,
  Hash,
  FileSpreadsheet,
  Coins,
  RefreshCw,
  Loader2
} from "lucide-react";
import PageHeader from "./ui/PageHeader";
import { formatCurrency } from "../utils";
import { PROTECTED_USER_EMAILS, isAdminProfile } from "../services/userRoles";
import { appNoticeSuccess, appNoticeWarning } from "../utils/appNotice";
import { syncCatalogFromSheets } from "../services/catalogSyncApi";

interface SettingsSectionProps {
  products: ProductCatalog[];
  services: ServiceCatalog[];
  users: User[];
  technicalProducts: TechnicalProduct[];
  onAddService: (srv: Omit<ServiceCatalog, "id">) => void;
  onEditService: (srv: ServiceCatalog) => void;
  onDeleteService: (id: string) => void;
  onAddUser: (u: Omit<User, "id"> & { password?: string }) => void | Promise<void>;
  onEditUser: (u: User, password?: string) => void | Promise<void>;
  onDeleteUser: (id: string) => void;
  onAddTechnicalProduct: (name: string) => void;
  onEditTechnicalProduct: (prod: TechnicalProduct) => void;
  onDeleteTechnicalProduct: (id: string) => void;
  currentUser: User;
}

export default function SettingsSection({
  products,
  services,
  users,
  technicalProducts,
  onAddService,
  onEditService,
  onDeleteService,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onAddTechnicalProduct,
  onEditTechnicalProduct,
  onDeleteTechnicalProduct,
  currentUser
}: SettingsSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<"products" | "services" | "users" | "technical_products">("products");

  // Add/Edit Modals states
  const [serviceModal, setServiceModal] = useState<{ isOpen: boolean; item?: ServiceCatalog } | null>(null);
  const [userModal, setUserModal] = useState<{ isOpen: boolean; item?: User } | null>(null);
  const [technicalProductModal, setTechnicalProductModal] = useState<{ isOpen: boolean; item?: TechnicalProduct } | null>(null);

  // Form Field States
  const [serviceForm, setServiceForm] = useState({ code: "", description: "", baseValue: "" });
  const [userForm, setUserForm] = useState({ name: "", email: "", profile: "Usuário" as UserRole, password: "" });
  const [technicalProductForm, setTechnicalProductForm] = useState({ name: "" });

  // Error messages
  const [errorMsg, setErrorMsg] = useState("");
  const [userSuccessMsg, setUserSuccessMsg] = useState("");
  const [catalogSyncing, setCatalogSyncing] = useState(false);
  const [catalogSyncMessage, setCatalogSyncMessage] = useState("");

  const lastSheetSyncAt = products
    .map((p) => p.sheetSyncedAt)
    .filter(Boolean)
    .sort()
    .pop();

  const catalogAutoSyncedRef = useRef(false);

  const runCatalogSync = useCallback(async (silent = false) => {
    if (!isAdminProfile(currentUser.profile)) return;
    if (!silent) {
      setCatalogSyncing(true);
      setCatalogSyncMessage("");
      setErrorMsg("");
    }
    try {
      const result = await syncCatalogFromSheets();
      if (!silent) {
        setCatalogSyncMessage(
          `${result.total} itens sincronizados (${result.imported} novos, ${result.updated} atualizados, ${result.removed} removidos).`
        );
      }
    } catch (err) {
      if (!silent) {
        const msg = err instanceof Error ? err.message : "Erro ao sincronizar catálogo.";
        setErrorMsg(msg);
      }
    } finally {
      if (!silent) setCatalogSyncing(false);
    }
  }, [currentUser.profile]);

  const handleSyncCatalog = () => void runCatalogSync(false);

  useEffect(() => {
    if (activeSubTab !== "products" || !isAdminProfile(currentUser.profile) || catalogAutoSyncedRef.current) {
      return;
    }
    catalogAutoSyncedRef.current = true;
    void runCatalogSync(true);
  }, [activeSubTab, currentUser.profile, runCatalogSync]);

  const handleOpenService = (s?: ServiceCatalog) => {
    setErrorMsg("");
    if (s) {
      setServiceModal({ isOpen: true, item: s });
      setServiceForm({ code: s.code, description: s.description, baseValue: s.baseValue.toString() });
    } else {
      setServiceModal({ isOpen: true });
      setServiceForm({ code: "", description: "", baseValue: "0" });
    }
  };

  const handleOpenUser = (u?: User) => {
    setErrorMsg("");
    setUserSuccessMsg("");
    if (u) {
      setUserModal({ isOpen: true, item: u });
      setUserForm({ name: u.name, email: u.email, profile: u.profile, password: "" });
    } else {
      setUserModal({ isOpen: true });
      setUserForm({ name: "", email: "", profile: "Usuário", password: "" });
    }
  };

  const handleOpenTechnicalProduct = (tp?: TechnicalProduct) => {
    setErrorMsg("");
    if (tp) {
      setTechnicalProductModal({ isOpen: true, item: tp });
      setTechnicalProductForm({ name: tp.name });
    } else {
      setTechnicalProductModal({ isOpen: true });
      setTechnicalProductForm({ name: "" });
    }
  };

  const handleSaveTechnicalProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!technicalProductForm.name.trim()) {
      setErrorMsg("O nome do produto/equipamento é obrigatório.");
      return;
    }

    if (technicalProductModal?.item) {
      onEditTechnicalProduct({
        id: technicalProductModal.item.id,
        name: technicalProductForm.name.trim()
      });
    } else {
      onAddTechnicalProduct(technicalProductForm.name.trim());
    }
    setTechnicalProductModal(null);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(serviceForm.baseValue);
    if (isNaN(val) || val < 0) {
      setErrorMsg("O valor padrão deve ser um número válido positivo.");
      return;
    }
    if (!serviceForm.code.trim() || !serviceForm.description.trim()) {
      setErrorMsg("Preencha todos os campos obrigatórios.");
      return;
    }

    if (serviceModal?.item) {
      onEditService({
        id: serviceModal.item.id,
        code: serviceForm.code.trim().toUpperCase(),
        description: serviceForm.description.trim(),
        baseValue: val
      });
    } else {
      onAddService({
        code: serviceForm.code.trim().toUpperCase(),
        description: serviceForm.description.trim(),
        baseValue: val
      });
    }
    setServiceModal(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim()) {
      setErrorMsg("Preencha todos os campos obrigatórios.");
      return;
    }
    const emailLower = userForm.email.trim().toLowerCase();
    const isEditing = !!userModal?.item;
    const sameEmailUser = users.find(u => u.email.toLowerCase() === emailLower);

    if (sameEmailUser && (!isEditing || sameEmailUser.id !== userModal?.item?.id)) {
      setErrorMsg("Este endereço de e-mail já está cadastrado.");
      return;
    }

    if (!isEditing && !userForm.password.trim()) {
      setErrorMsg("Defina uma senha inicial para o novo usuário.");
      return;
    }

    const payload = {
      name: userForm.name.trim(),
      email: emailLower,
      profile: userForm.profile,
      ...(isEditing ? {} : { password: userForm.password }),
    };

    try {
      if (isEditing && userModal?.item) {
        await onEditUser(
          {
            id: userModal.item.id,
            name: payload.name,
            email: payload.email,
            profile: payload.profile,
          },
          userForm.password.trim() || undefined
        );
        appNoticeSuccess(`Usuário "${payload.name}" atualizado com sucesso.`);
      } else {
        await onAddUser(payload);
        setUserSuccessMsg(
          `Usuário "${payload.name}" criado. E-mail e senha inicial prontos para o primeiro login.`
        );
      }
      setUserModal(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar usuário.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto max-h-screen">
      <div className="max-w-[1440px] mx-auto w-full px-4 lg:px-6 py-4 lg:py-5 space-y-6">
        <PageHeader
          variant="page"
          title="Configurações"
          subtitle="Parâmetros tabelados de faturamento de peças, serviços de técnicos e contas autorizadas"
        />

      {/* Settings Navigation SubTabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab("products")}
          className={`px-5 py-3 border-b-2 font-medium text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "products"
              ? "border-brand-orange text-brand-orange font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Tabela de Produtos (Peças)</span>
        </button>

        <button
          onClick={() => setActiveSubTab("services")}
          className={`px-5 py-3 border-b-2 font-medium text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "services"
              ? "border-brand-orange text-brand-orange font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <Coins className="h-4 w-4" />
          <span>Tabela de Serviços</span>
        </button>

        <button
          onClick={() => setActiveSubTab("users")}
          className={`px-5 py-3 border-b-2 font-medium text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "users"
              ? "border-brand-orange text-brand-orange font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Usuários e Permissões</span>
        </button>

        <button
          onClick={() => setActiveSubTab("technical_products")}
          className={`px-5 py-3 border-b-2 font-medium text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === "technical_products"
              ? "border-brand-orange text-brand-orange font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Meus Produtos (Equipamentos)</span>
        </button>
      </div>

      {/* Subtab Content: Products Catalog */}
      {activeSubTab === "products" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Catálogo de Peças / Produtos</h3>
              <p className="text-xs text-slate-500 mt-1">
                Produtos sincronizados automaticamente da planilha Google Sheets. Cadastre novos itens diretamente na planilha.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAdminProfile(currentUser.profile) && (
                <button
                  type="button"
                  id="btn-sync-catalog"
                  onClick={handleSyncCatalog}
                  disabled={catalogSyncing}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-60"
                >
                  {catalogSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span>{catalogSyncing ? "Atualizando..." : "Atualizar valores"}</span>
                </button>
              )}
            </div>
          </div>

          {(errorMsg || catalogSyncMessage || lastSheetSyncAt) && (
            <div className="px-5 pt-3 text-[11px] text-slate-500 space-y-1">
              {errorMsg && <p className="text-red-700 font-medium bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
              {catalogSyncMessage && <p className="text-emerald-700 font-medium">{catalogSyncMessage}</p>}
              {lastSheetSyncAt && !catalogSyncMessage && !errorMsg && (
                <p>Última sincronização com planilha: {new Date(lastSheetSyncAt).toLocaleString("pt-BR")}</p>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50">
                  <th className="py-3 px-5">Código</th>
                  <th className="py-3 px-5">Descrição do Produto (Peça)</th>
                  <th className="py-3 px-5">Equipamentos Compatíveis</th>
                  <th className="py-3 px-5 text-right">Preço de Tabela</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Nenhum produto na planilha ainda. Adicione na planilha e aguarde a sincronização automática.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} id={`prod-row-${p.code}`} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span>{p.code}</span>
                          {p.sheetTab && (
                            <span className="px-1 py-0.5 rounded bg-blue-50 text-blue-700 text-[8px] font-bold uppercase border border-blue-100">
                              Planilha
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 font-medium">{p.description}</td>
                      <td className="py-3.5 px-5">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {p.compatibleProducts && p.compatibleProducts.length > 0 ? (
                            p.compatibleProducts.map((comp) => (
                              <span key={comp} className="px-1.5 py-0.5 rounded bg-orange-50 text-brand-orange text-[9.5px] font-semibold border border-orange-200/60 block">
                                {comp}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Todos</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right font-medium text-slate-900">{formatCurrency(p.baseValue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab Content: Services Catalog */}
      {activeSubTab === "services" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Preços Tabelados de Serviços</h3>
              <p className="text-xs text-slate-500 mt-1">Preços de horas técnicas, calibração e mão de obra homologada.</p>
            </div>
            <button
              id="btn-add-service"
              onClick={() => handleOpenService()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-gradient hover:opacity-90 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Serviço</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50">
                  <th className="py-3 px-5">Código</th>
                  <th className="py-3 px-5">Descrição do Serviço Técnico</th>
                  <th className="py-3 px-5 text-right">Valor Padrão</th>
                  <th className="py-3 px-5 text-center w-28">Ações</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Nenhum serviço cadastrado na tabela de preços.
                    </td>
                  </tr>
                ) : (
                  services.map((s) => (
                    <tr key={s.id} id={`srv-row-${s.code}`} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-700">{s.code}</td>
                      <td className="py-3.5 px-5 text-slate-600 font-medium">{s.description}</td>
                      <td className="py-3.5 px-5 text-right font-medium text-slate-900">{formatCurrency(s.baseValue)}</td>
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            id={`btn-edit-srv-${s.code}`}
                            onClick={() => handleOpenService(s)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            id={`btn-delete-srv-${s.code}`}
                            onClick={() => {
                              if (confirm(`Remover serviço técnico ${s.code} da tabela de preços recomendados?`)) {
                                onDeleteService(s.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab Content: Users & Accounts */}
      {activeSubTab === "users" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Usuários do Sistema</h3>
              <p className="text-xs text-slate-500 mt-1">Visualização e gerenciamento de permissões de acesso corporativo.</p>
            </div>
            <button
              id="btn-add-user"
              onClick={() => handleOpenUser()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-gradient hover:opacity-90 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Convidar Usuário</span>
            </button>
          </div>

          {/* User profiles notice about password */}
          <div className="mx-5 my-1 p-3 bg-orange-50 border border-orange-200/60 rounded-xl text-xs text-slate-800 flex items-start gap-2.5">
            <HelpCircle className="h-4.5 w-4.5 shrink-0 text-brand-orange mt-0.5" />
            <div>
              <strong className="font-bold text-slate-900">Autenticação Firebase:</strong>
              <p className="mt-0.5 text-slate-700 leading-relaxed">
                Novos usuários são criados com e-mail e senha via Firebase Authentication.
                Ao cadastrar, defina a senha inicial que será usada no primeiro login.
              </p>
            </div>
          </div>

          {userSuccessMsg && (
            <div className="mx-5 p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-800">
              {userSuccessMsg}
            </div>
          )}

          <div className="mx-5 overflow-x-auto">
            <table className="w-full text-left border-collapse text-[10px]">
              <caption className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Permissões por perfil
              </caption>
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-widest bg-slate-50">
                  <th className="py-2 px-3">Perfil</th>
                  <th className="py-2 px-3 text-center">Configurações</th>
                  <th className="py-2 px-3 text-center">Hub Testes</th>
                  <th className="py-2 px-3 text-center">Orçamento</th>
                  <th className="py-2 px-3 text-center">RAT</th>
                  <th className="py-2 px-3 text-center">Clientes (editar)</th>
                  <th className="py-2 px-3 text-center">Clientes (excluir)</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 divide-y divide-slate-100">
                <tr>
                  <td className="py-2 px-3 font-semibold">Administrador</td>
                  <td className="py-2 px-3 text-center">Sim</td>
                  <td className="py-2 px-3 text-center">Sim</td>
                  <td className="py-2 px-3 text-center">Sim</td>
                  <td className="py-2 px-3 text-center">Sim</td>
                  <td className="py-2 px-3 text-center">Sim</td>
                  <td className="py-2 px-3 text-center">Sim</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold">Técnico</td>
                  <td className="py-2 px-3 text-center">Não</td>
                  <td className="py-2 px-3 text-center">Sim</td>
                  <td className="py-2 px-3 text-center">Não</td>
                  <td className="py-2 px-3 text-center">Sim</td>
                  <td className="py-2 px-3 text-center">Não</td>
                  <td className="py-2 px-3 text-center">Não</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold">Usuário</td>
                  <td className="py-2 px-3 text-center">Não</td>
                  <td className="py-2 px-3 text-center">Não</td>
                  <td className="py-2 px-3 text-center">Sim</td>
                  <td className="py-2 px-3 text-center">Não</td>
                  <td className="py-2 px-3 text-center">Sim</td>
                  <td className="py-2 px-3 text-center">Não</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50">
                  <th className="py-3 px-5">Nome Completo</th>
                  <th className="py-3 px-5">E-mail Corporativo</th>
                  <th className="py-3 px-5">Perfil de Acesso</th>
                  <th className="py-3 px-5 text-center w-28">Ações</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {users.map((u) => {
                  const isLoggedUser = u.id === currentUser.id;
                  const isProtectedUser = PROTECTED_USER_EMAILS.includes(u.email.toLowerCase());

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-5 font-semibold text-slate-800">
                        {u.name} {isLoggedUser && <span className="text-[10px] bg-slate-100 text-slate-500 font-normal px-1.5 py-0.5 rounded ml-1">Você</span>}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 font-mono">{u.email}</td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide ${
                          u.profile === "Administrador"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : u.profile === "Técnico"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-slate-50 text-slate-600 border border-slate-200"
                        }`}>
                          {u.profile}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenUser(u)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
                            title="Editar usuário"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          
                          <button
                            onClick={() => {
                              if (isLoggedUser) {
                                appNoticeWarning("Você não pode se auto-excluir do sistema de gerenciamento.");
                                return;
                              }
                              if (isProtectedUser) {
                                appNoticeWarning("Este usuário administrador principal não pode ser excluído.");
                                return;
                              }
                              if (confirm(`Remover usuário "${u.name}" (${u.email})?`)) {
                                onDeleteUser(u.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-20"
                            disabled={isLoggedUser || isProtectedUser}
                            title="Remover acesso"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {serviceModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-base">
                {serviceModal.item ? "Editar Serviço" : "Novo Serviço na Tabela"}
              </h3>
              <button onClick={() => setServiceModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveService} className="p-5 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">{errorMsg}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Código do Serviço *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: INSP-02"
                  value={serviceForm.code}
                  onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })}
                  className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange uppercase font-mono"
                  disabled={!!serviceModal.item}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Descrição do Serviço *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Hora de Inspeção Mecânica"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Preço do Serviço Recomendado (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={serviceForm.baseValue}
                  onChange={(e) => setServiceForm({ ...serviceForm, baseValue: e.target.value })}
                  className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange text-right font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setServiceModal(null)} className="px-4 py-2 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-lg">
                  Cancelar
                </button>
                <button type="submit" id="btn-save-srv-modal" className="px-5 py-2 bg-brand-gradient hover:opacity-90 text-white text-sm font-semibold rounded-lg shadow-sm">
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subtab Content: Technical Products (Myobots, Eleva, etc.) */}
      {activeSubTab === "technical_products" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-4 animate-fade-in">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Meus Produtos (Equipamentos em Manutenção)</h3>
              <p className="text-xs text-slate-500 mt-1">Produtos que podem ser selecionados na ficha técnica de nova solicitação de O.S.</p>
            </div>
            <button
              id="btn-add-tech-product"
              onClick={() => handleOpenTechnicalProduct()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-gradient hover:opacity-90 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Produto</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50">
                  <th className="py-3 px-5">Código ID</th>
                  <th className="py-3 px-5">Produto / Equipamento Técnico</th>
                  <th className="py-3 px-5 text-center w-28">Ações</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {technicalProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      Nenhum equipamento técnico cadastrado.
                    </td>
                  </tr>
                ) : (
                  technicalProducts.map((tp) => (
                    <tr key={tp.id} id={`tech-prod-row-${tp.id}`} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-400">{tp.id}</td>
                      <td className="py-3.5 px-5 font-semibold text-slate-800 text-[13px]">{tp.name}</td>
                      <td className="py-3.5 px-5 text-center animate-fade-in">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            id={`btn-edit-tp-${tp.id}`}
                            onClick={() => handleOpenTechnicalProduct(tp)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
                            title="Editar Produto"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            id={`btn-delete-tp-${tp.id}`}
                            onClick={() => {
                              if (confirm(`Deseja remover definitivamente o produto/equipamento "${tp.name}"?`)) {
                                onDeleteTechnicalProduct(tp.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                            title="Excluir Produto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Modal */}
      {userModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-base">
                {userModal.item ? "Editar Usuário" : "Convidar / Cadastrar Usuário"}
              </h3>
              <button onClick={() => setUserModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-5 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">{errorMsg}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Leonardo da Vinci"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  E-mail Corporativo de Login *
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ex: leonardo@neurobots.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange font-mono"
                  disabled={!!userModal.item && PROTECTED_USER_EMAILS.includes(userModal.item.email.toLowerCase())}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Nível de Perfil / Acesso *
                </label>
                <select
                  required
                  value={userForm.profile}
                  onChange={(e) => setUserForm({ ...userForm, profile: e.target.value as UserRole })}
                  className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none bg-white focus:ring-2 focus:ring-brand-orange/20"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Técnico">Técnico</option>
                  <option value="Usuário">Usuário</option>
                </select>
              </div>
              {!userModal.item ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    Senha Inicial *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    Nova Senha (opcional)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    placeholder="Deixe em branco para manter a senha atual"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setUserModal(null)} className="px-4 py-2 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-lg">
                  Cancelar
                </button>
                <button type="submit" id="btn-save-user-modal" className="px-5 py-2 bg-brand-gradient hover:opacity-90 text-white text-sm font-semibold rounded-lg shadow-sm">
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Technical Product Modal */}
      {technicalProductModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-base">
                {technicalProductModal.item ? "Editar Equipamento Técnico" : "Novo Equipamento Técnico"}
              </h3>
              <button onClick={() => setTechnicalProductModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTechnicalProduct} className="p-5 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">{errorMsg}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Nome do Produto / Equipamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Myobots"
                  value={technicalProductForm.name}
                  onChange={(e) => setTechnicalProductForm({ name: e.target.value })}
                  className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setTechnicalProductModal(null)} className="px-4 py-2 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-lg">
                  Cancelar
                </button>
                <button type="submit" id="btn-save-tech-prod-modal" className="px-5 py-2 bg-brand-gradient hover:opacity-90 text-white text-sm font-semibold rounded-lg shadow-sm">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
