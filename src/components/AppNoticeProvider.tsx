/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import AppNoticeDialog from "./ui/AppNoticeDialog";
import {
  AppNoticeState,
  registerAppNoticeListener,
} from "../utils/appNotice";

const CLOSED_STATE: AppNoticeState = {
  open: false,
  title: "",
  message: "",
  variant: "info",
};

export default function AppNoticeProvider({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<AppNoticeState>(CLOSED_STATE);

  useEffect(() => {
    registerAppNoticeListener(setNotice);
    return () => registerAppNoticeListener(null);
  }, []);

  return (
    <>
      {children}
      <AppNoticeDialog
        open={notice.open}
        title={notice.title}
        message={notice.message}
        variant={notice.variant}
        onClose={() => setNotice(CLOSED_STATE)}
      />
    </>
  );
}
