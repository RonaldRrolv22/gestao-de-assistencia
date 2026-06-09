/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  expiresAt?: string | null;
  onExpire?: () => void;
  className?: string;
}

function parseRemainingMs(expiresAt: string): number | null {
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, end - Date.now());
}

function formatMmSs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CountdownTimer({ expiresAt, onExpire, className = "" }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState<number | null>(() =>
    expiresAt ? parseRemainingMs(expiresAt) : null
  );
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(null);
      setExpired(false);
      return;
    }

    const tick = () => {
      const ms = parseRemainingMs(expiresAt);
      if (ms === null) {
        setRemaining(null);
        return;
      }
      setRemaining(ms);
      if (ms <= 0 && !expired) {
        setExpired(true);
        onExpire?.();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire, expired]);

  if (!expiresAt || remaining === null) {
    return (
      <span className={`text-[10px] text-text-secondary ${className}`}>
        Validade não informada
      </span>
    );
  }

  if (remaining <= 0 || expired) {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-bold text-danger ${className}`}>
        <Clock className="h-3.5 w-3.5" />
        PIX expirado
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-brand-active-text bg-brand-active-bg border border-amber-200/60 rounded-lg px-2.5 py-1 ${className}`}>
      <Clock className="h-3.5 w-3.5 text-brand-active-icon" />
      Expira em {formatMmSs(remaining)}
    </span>
  );
}
