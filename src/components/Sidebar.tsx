/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Sliders,
  LogOut,
  HelpCircle,
  Database,
  ScrollText,
  FlaskConical,
} from "lucide-react";
import { User } from "../types";
import { isAdminProfile, canAccessHubTestes } from "../services/userRoles";
import { AppTab } from "../navigation";
import SystemBrand from "./ui/SystemBrand";
import HelpManualModal from "./HelpManualModal";

interface SidebarProps {
  currentUser: User;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onOpenHubTestes: () => void | Promise<void>;
  onLogout: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenHubTestes,
  onLogout,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [showHelpManual, setShowHelpManual] = useState(false);
  const isAdmin = isAdminProfile(currentUser.profile);
  const canOpenHub = canAccessHubTestes(currentUser.profile);

  const navigationItems = [
    { id: "relatorios" as const, label: "Relatórios", icon: BarChart3, allowed: true },
    { id: "kanban" as const, label: "Solicitações Kanban", icon: LayoutDashboard, allowed: true },
    { id: "clientes" as const, label: "Clientes", icon: Users, allowed: true },
    { id: "base_dados" as const, label: "Base de Dados", icon: Database, allowed: true },
    { id: "politicas" as const, label: "Políticas", icon: ScrollText, allowed: true },
    { id: "hub_testes" as const, label: "Hub de Testes", icon: FlaskConical, allowed: canOpenHub, external: true },
    { id: "configuracoes" as const, label: "Configurações", icon: Sliders, allowed: isAdmin },
  ];

  const handleNav = (item: (typeof navigationItems)[number]) => {
    if ("external" in item && item.external) {
      void onOpenHubTestes();
    } else {
      setActiveTab(item.id);
    }
    onMobileClose?.();
  };

  const body = (
    <>
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navigationItems
          .filter((item) => item.allowed)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleNav(item)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl text-left animate-nav sidebar-nav-btn ${
                  isActive
                    ? "nav-active-pill shadow-glow-orange ring-1 ring-white/20"
                    : "text-text-secondary hover:bg-white/70 hover:text-text-primary hover:shadow-sm"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : ""}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
      </nav>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => setShowHelpManual(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/60 rounded-xl transition-all duration-200 text-left"
        >
          <HelpCircle className="w-4 h-4" />
          Ajuda / Manual
        </button>
      </div>

      {showHelpManual && <HelpManualModal onClose={() => setShowHelpManual(false)} />}

      <div className="p-3 border-t border-border/80 shrink-0">
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/90 border border-border/50 shadow-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full icon-badge-gradient text-white flex items-center justify-center font-semibold text-xs shrink-0">
              {currentUser.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-semibold text-heading truncate">{currentUser.name}</p>
              <p className="text-[10px] text-text-secondary truncate">{currentUser.profile}</p>
            </div>
          </div>

          <button
            id="btn-logout"
            onClick={onLogout}
            className="p-2 rounded-lg text-text-secondary hover:text-danger hover:bg-red-50 btn-glow-base hover:shadow-[0_4px_12px_-3px_rgba(220,38,38,0.18)] transition-all duration-200 cursor-pointer shrink-0"
            title="Sair do sistema"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside id="sidebar-container" className="sidebar-shell hidden lg:flex flex-col text-text-primary">
        {body}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Fechar menu"
            onClick={onMobileClose}
          />
          <aside className="relative z-10 w-64 max-w-[85vw] h-full flex flex-col shadow-premium bg-sidebar border-r border-border">
            <SystemBrand variant="sidebar" />
            {body}
          </aside>
        </div>
      )}
    </>
  );
}
