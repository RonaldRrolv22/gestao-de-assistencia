/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../types";
import { Shield, Lock, Eye, EyeOff, AlertCircle, Check, Loader2, CheckCircle } from "lucide-react";
import { loginWithEmail, sendPasswordResetEmailForUser } from "../services/authService";
import BrandLogo from "./ui/BrandLogo";

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const APP_TITLE = "Gestão de Assistências";

const FEATURES = [
  "Quadro Kanban de solicitações",
  "Orçamentos e faturamento integrado",
  "Pagamentos PIX e cartão (Pagar.me)",
  "Relatórios e histórico de atendimentos",
] as const;

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);
    setLoading(true);

    try {
      const user = await loginWithEmail(email, password);
      onLogin(user);
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string; message?: string };
      const code = firebaseErr.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setError("E-mail ou senha incorretos. Use a senha definida no Firebase Authentication.");
      } else if (code === "auth/user-not-found") {
        setError("E-mail não cadastrado no Firebase Authentication.");
      } else if (code === "auth/too-many-requests") {
        setError("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else {
        setError(firebaseErr.message || "Erro ao autenticar. Verifique e-mail e senha.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setResetSuccess(null);

    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError("Informe seu e-mail acima para receber o link de redefinição de senha.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmailForUser(normalized);
      setResetSuccess(
        `Enviamos um link de redefinição para ${normalized}. Verifique sua caixa de entrada e o spam.`
      );
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string; message?: string };
      const code = firebaseErr.code || "";
      if (code === "auth/invalid-email") {
        setError("E-mail inválido. Verifique o endereço informado.");
      } else if (code === "auth/too-many-requests") {
        setError("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Não foi possível enviar o e-mail de redefinição. Tente novamente.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="login-page grid grid-cols-1 md:grid-cols-2">
      {/* Hero — desktop */}
      <div className="login-hero login-grid relative hidden md:flex flex-col justify-between p-10 lg:p-12 overflow-hidden">
        <div
          className="login-hero-blob w-64 h-64 -top-16 -right-16 bg-[#FF8C42]/25"
          aria-hidden
        />
        <div
          className="login-hero-blob login-hero-blob-delay w-48 h-48 bottom-24 -left-12 bg-[#F59E0B]/20"
          aria-hidden
        />
        <div
          className="login-hero-blob login-hero-blob-delay w-32 h-32 top-1/3 right-1/4 bg-[#FDBA24]/15"
          aria-hidden
        />

        <div className="relative z-10 animate-fade-in">
          <BrandLogo size="header" showText={false} flush />
        </div>

        <div className="relative z-10 my-auto py-8 animate-slide-up">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight leading-tight text-slate-900">
            {APP_TITLE}
          </h1>
          <p className="mt-4 text-[15px] text-slate-600 leading-relaxed max-w-sm">
            Gestão de ordens de serviço, orçamentos, pagamentos e manutenção técnica em um único painel.
          </p>

          <div className="mt-10 space-y-1">
            {FEATURES.map((feature, idx) => (
              <div
                key={feature}
                className={`login-feature-row flex items-center gap-3 rounded-xl px-2 py-2 -mx-2 animate-stagger-item`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-orange/10 text-brand-orange shrink-0 ring-1 ring-brand-orange/15">
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <span className="text-sm text-slate-700 font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-slate-400 tracking-wider uppercase">
          NEUROBOTS · 2026
        </p>
      </div>

      {/* Formulário */}
      <div className="login-form-panel flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 min-h-[100dvh] md:min-h-0">
        <div className="w-full max-w-md lg:max-w-lg">
          {/* Mobile header */}
          <div className="md:hidden text-center mb-6 animate-fade-in">
            <BrandLogo size="lg" showText={false} className="justify-center mx-auto" />
            <p className="mt-4 text-base font-semibold text-slate-800">{APP_TITLE}</p>
          </div>

          <div className="login-card rounded-2xl p-6 sm:p-8 lg:p-10 animate-slide-up">
            <div className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                Bem-vindo de volta
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Use o e-mail e senha do Firebase Authentication.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleLoginSubmit}>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200/90 p-4 text-xs text-red-700 flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="rounded-xl bg-amber-50 border border-amber-200/90 p-4 text-xs text-amber-900 flex items-start gap-2 animate-fade-in">
                  <CheckCircle className="h-4 w-4 shrink-0 text-brand-orange mt-0.5" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5"
                >
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Shield className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setResetSuccess(null);
                    }}
                    className="login-input block w-full pl-10 pr-3.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm bg-white"
                    placeholder="seu.email@neurobots.com.br"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5"
                >
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input block w-full pl-10 pr-11 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm bg-white"
                    placeholder="Senha do Firebase Auth"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-brand-orange transition-colors duration-200 rounded-r-xl"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => void handleForgotPassword()}
                    disabled={resetLoading || loading}
                    className="text-xs font-medium text-brand-orange hover:text-brand-orange-deep transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? "Enviando..." : "Esqueci a senha"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="btn-login-submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 h-12 px-4 rounded-xl text-sm font-semibold text-white bg-brand-gradient btn-premium-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                    Entrando...
                  </>
                ) : (
                  "Entrar no sistema"
                )}
              </button>
            </form>
          </div>

          <p className="text-center mt-6 text-slate-400 text-[11px]">
            © 2026 Neurobots. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
