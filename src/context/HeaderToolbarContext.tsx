/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useMemo, useState } from "react";

interface HeaderToolbarContextValue {
  toolbar: React.ReactNode;
  setToolbar: (node: React.ReactNode) => void;
}

const HeaderToolbarContext = createContext<HeaderToolbarContextValue | null>(null);

export function HeaderToolbarProvider({ children }: { children: React.ReactNode }) {
  const [toolbar, setToolbar] = useState<React.ReactNode>(null);
  const value = useMemo(() => ({ toolbar, setToolbar }), [toolbar]);

  return (
    <HeaderToolbarContext.Provider value={value}>{children}</HeaderToolbarContext.Provider>
  );
}

export function useHeaderToolbar() {
  const ctx = useContext(HeaderToolbarContext);
  if (!ctx) {
    throw new Error("useHeaderToolbar deve ser usado dentro de HeaderToolbarProvider");
  }
  return ctx;
}
