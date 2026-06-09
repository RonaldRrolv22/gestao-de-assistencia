/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  label?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ""}]`, error, info);
    // #region agent log
    fetch("http://127.0.0.1:7942/ingest/8708ad6b-cc5a-43ff-b2a2-d4996d444d0d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8ececf" },
      body: JSON.stringify({
        sessionId: "8ececf",
        runId: "white-screen-post-fix",
        hypothesisId: "global-error",
        location: "ErrorBoundary.tsx:componentDidCatch",
        message: this.props.label || "React render error",
        data: {
          errorMessage: error.message,
          errorName: error.name,
          componentStack: info.componentStack?.slice(0, 800) ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4">
        <div className="max-w-lg w-full rounded-2xl bg-white border border-red-200 shadow-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-red-700">Erro ao abrir {this.props.label || "tela"}</h2>
          <p className="text-sm text-slate-600">
            O sistema encontrou um erro inesperado. Copie a mensagem abaixo se precisar de suporte.
          </p>
          <pre className="text-xs bg-red-50 border border-red-100 rounded-lg p-3 overflow-auto text-red-900 whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
          {this.props.onReset && (
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null });
                this.props.onReset?.();
              }}
              className="px-4 py-2 rounded-xl bg-brand-gradient text-white text-sm font-semibold"
            >
              Fechar e tentar novamente
            </button>
          )}
        </div>
      </div>
    );
  }
}
