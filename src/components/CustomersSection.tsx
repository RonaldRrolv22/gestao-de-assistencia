/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Client, MaintenanceRequest } from "../types";
import { 
  Plus, 
  Search, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Edit2, 
  Trash2, 
  Eye, 
  X, 
  Clock, 
  CheckCircle2, 
  ClipboardList,
  UserPlus,
  Users
} from "lucide-react";
import { formatDate } from "../utils";
import PageHeader from "./ui/PageHeader";
import { canManageClients, canDeleteClients } from "../services/userRoles";

interface CustomersSectionProps {
  clients: Client[];
  requests: MaintenanceRequest[];
  onAddClient: (client: Omit<Client, "id">) => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  currentUserProfile: string;
}

export default function CustomersSection({
  clients,
  requests,
  onAddClient,
  onEditClient,
  onDeleteClient,
  currentUserProfile
}: CustomersSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  
  // Modals / Detail Views states
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedClientHistory, setSelectedClientHistory] = useState<Client | null>(null);

  // Form states
  const [formData, setFormData] = useState({
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

  const canManage = canManageClients(currentUserProfile);
  const canDelete = canDeleteClients(currentUserProfile);

  const filteredClients = clients.filter((client) => {
    const matchesName = client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = client.company.toLowerCase().includes(searchCompany.toLowerCase());
    return matchesName && matchesCompany;
  });

  const getClientHistory = (clientId: string) => {
    return requests.filter(req => req.clientId === clientId);
  };

  const handleOpenAdd = () => {
    setFormData({
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
    setIsAddingNew(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      company: client.company,
      address: client.address,
      city: client.city,
      state: client.state,
      phone: client.phone,
      email: client.email,
      cpfCnpj: client.cpfCnpj || "",
      cep: client.cep || ""
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      onEditClient({
        ...editingClient,
        ...formData
      });
      setEditingClient(null);
    } else {
      onAddClient(formData);
      setIsAddingNew(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto max-h-screen">
      <div className="max-w-[1440px] mx-auto w-full px-4 lg:px-6 py-4 lg:py-5 space-y-6">
        <PageHeader
          variant="page"
          title="Clientes Cadastrados"
          subtitle="Gerenciamento, histórico de atendimentos e dados de contato"
        >
          {canManage && (
            <button
              id="btn-add-client"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-gradient text-white rounded-xl text-sm font-semibold shadow-card cursor-pointer w-full sm:w-auto justify-center"
            >
              <UserPlus className="h-4 w-4" />
              <span>Cadastrar Novo Cliente</span>
            </button>
          )}
        </PageHeader>

      {/* Modern Search and Filter Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Buscar por Nome do Cliente
          </label>
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-client-name"
              placeholder="Digite o nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-slate-50/50"
            />
          </div>
        </div>

        <div className="relative">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Filtrar por Empresa / Organização
          </label>
          <div className="relative">
            <Building2 className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-client-company"
              placeholder="Digite o nome da empresa..."
              value={searchCompany}
              onChange={(e) => setSearchCompany(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-slate-50/50"
            />
          </div>
        </div>
      </div>

      {/* Main Customers List */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-xs">
          <div className="inline-flex p-4 rounded-xl bg-slate-50 text-slate-400 mb-4">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="font-semibold text-slate-800 text-lg">Nenhum cliente correspondente</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            Ajuste seus filtros de busca ou cadastre um novo cliente para iniciar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredClients.map((client) => {
            const history = getClientHistory(client.id);
            return (
              <div 
                key={client.id}
                id={`client-card-${client.id}`}
                className="bg-white border border-slate-150 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-base">{client.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1 text-slate-500 font-medium text-xs">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{client.company}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-medium px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200/50">
                      {history.length} {history.length === 1 ? "Atendimento" : "Atendimentos"}
                    </span>
                  </div>

                  {/* Contact Grid details */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-55 py-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{client.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    {client.cpfCnpj && (
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-bold shrink-0">CPF/CNPJ</span>
                        <span className="font-mono text-xs text-slate-700">{client.cpfCnpj}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {client.cep ? `CEP ${client.cep}, ` : ""}{client.address}, {client.city} - {client.state}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    id={`btn-history-${client.id}`}
                    onClick={() => setSelectedClientHistory(client)}
                    className="flex justify-center items-center gap-1.5 px-3 py-1.5 text-xs text-brand-orange hover:text-brand-orange font-semibold bg-orange-50 hover:bg-orange-100 rounded-lg transition-all border border-orange-200/60 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Ver Histórico de Manutenções</span>
                  </button>

                  {(canManage || canDelete) && (
                    <div className="flex items-center gap-1.5">
                      {canManage && (
                        <button
                          id={`btn-edit-${client.id}`}
                          onClick={() => handleOpenEdit(client)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-all"
                          title="Editar cadastro"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          id={`btn-delete-${client.id}`}
                          onClick={() => {
                            if (confirm(`Excluir o cliente "${client.name}"? Isso removerá o cadastro (solicitações associadas não serão apagadas porém perderão o autor).`)) {
                              onDeleteClient(client.id);
                            }
                          }}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                          title="Remover cliente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Client Modal overlay */}
      {(isAddingNew || editingClient) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-lg">
                {editingClient ? `Editar Cliente: ${editingClient.name}` : "Cadastrar Novo Cliente"}
              </h3>
              <button 
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingClient(null);
                }} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Nome do Responsável *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo do contato"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  CPF / CNPJ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 000.000.000-00 ou 00.000.000/0000-00"
                  value={formData.cpfCnpj}
                  onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                  className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Empresa / Clínica (não obrigatório)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Clínica Reabilitar S/S"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    Telefone Celular / WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    E-mail de Contato
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="email@dominio.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={formData.cep || ""}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    Endereço de envio postal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Av. Beira Mar, 450 - Sl 10"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    Estado (UF)
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full text-slate-800 p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white font-medium"
                  >
                    <option value="">UF</option>
                    {["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingClient(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-save-client-modal"
                  className="px-5 py-2 bg-brand-gradient hover:opacity-90 text-white text-sm font-semibold rounded-lg shadow-sm"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History and Consultation Modal overlay */}
      {selectedClientHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Dossiê do Cliente</span>
                <h3 className="font-semibold text-slate-900 text-lg leading-tight">{selectedClientHistory.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{selectedClientHistory.company}</p>
              </div>
              <button 
                onClick={() => setSelectedClientHistory(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 bg-white border border-slate-200 rounded-lg shadow-xs"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List with History records parsed */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2 mb-2">
                <ClipboardList className="h-4 w-4 text-brand-orange" />
                <span>Histórico Cronológico de Atendimentos</span>
              </h4>

              {(() => {
                const historyOS = getClientHistory(selectedClientHistory.id);
                if (historyOS.length === 0) {
                  return (
                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-8 text-center text-slate-500 text-sm">
                      Sem registros anteriores de manutenção para este cliente.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {historyOS.map((os) => {
                      // Work outline status tags
                      let statusText = "";
                      let statusColor = "";
                      if (os.columnId === "solicitacao") {
                        statusText = "Solicitação";
                        statusColor = "bg-amber-100 text-amber-800 border-amber-200";
                      } else if (os.columnId === "orcamento") {
                        statusText = "Orçamento";
                        statusColor = "bg-orange-50 text-brand-orange border-orange-200/60";
                      } else if (os.columnId === "manutencao") {
                        statusText = "Em Manutenção";
                        statusColor = "bg-purple-100 text-purple-800 border-purple-200";
                        if (os.rat?.status === "Finalizado") {
                          statusText = "RAT Finalizada";
                          statusColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                        }
                      } else if (os.columnId === "liberado") {
                        statusText = "Liberado";
                        statusColor = "bg-slate-100 text-slate-700 border-slate-200";
                      }

                      return (
                        <div key={os.id} className="border border-slate-150 bg-white hover:bg-slate-50/50 p-4 rounded-xl space-y-2.5 transition-all">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-brand-orange">{os.id}</span>
                              <span className="text-xs text-slate-400">|</span>
                              <span className="text-xs text-slate-500 font-medium">Abertura: {formatDate(os.openingDate)}</span>
                            </div>
                            <span className={`text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {statusText}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                            <div>
                              <strong className="text-slate-700">Equipamento:</strong> {os.productName} (S/N: {os.serialNumber || "-"})
                            </div>
                            <div>
                              <strong className="text-slate-700">Sintoma:</strong> {os.problemDescription}
                            </div>
                          </div>

                          {/* Budget total summary inside history OS */}
                          {os.budget && (
                            <div className="pt-2 border-t border-dotted border-slate-200 flex justify-between items-center text-xs">
                              <span className="text-slate-500">
                                {os.budget.isWarranty ? "Sob Cobertura de Garantia" : "Orçamento Particular"}
                              </span>
                              <span className="font-bold text-slate-800">
                                Total: {os.budget.isWarranty ? "R$ 0,00" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(os.budget.totalFinal)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button
                onClick={() => setSelectedClientHistory(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl"
              >
                Voltar à Busca
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
