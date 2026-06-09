/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useRef, useState } from "react";
import { Ban, Trash2 } from "lucide-react";

export interface KanbanActionSliderProps {
  onDelete?: () => void;
  onReject?: () => void;
  disabled?: boolean;
}

const THRESHOLD = 0.52;
const HANDLE_SIZE = 24;

type ActiveSide = "delete" | "reject" | null;

export default function KanbanActionSlider({
  onDelete,
  onReject,
  disabled = false,
}: KanbanActionSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [activeSide, setActiveSide] = useState<ActiveSide>(null);
  const pointerId = useRef<number | null>(null);
  const startX = useRef(0);
  const startOffset = useRef(0);

  const getMaxOffset = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 64;
    const pad = HANDLE_SIZE / 2 + 4;
    return Math.max(36, track.clientWidth / 2 - pad);
  }, []);

  const reset = useCallback(() => {
    setOffset(0);
    setActiveSide(null);
    setDragging(false);
    pointerId.current = null;
  }, []);

  const updateFromDelta = useCallback(
    (clientX: number) => {
      const max = getMaxOffset();
      const delta = clientX - startX.current;
      const next = Math.max(-max, Math.min(max, startOffset.current + delta));
      setOffset(next);

      const ratio = Math.abs(next) / max;
      if (ratio >= THRESHOLD * 0.65) {
        setActiveSide(next < 0 ? "delete" : "reject");
      } else {
        setActiveSide(null);
      }
    },
    [getMaxOffset]
  );

  const commitAction = useCallback(
    (side: ActiveSide) => {
      if (side === "delete" && onDelete) onDelete();
      else if (side === "reject" && onReject) onReject();
      reset();
    },
    [onDelete, onReject, reset]
  );

  const finishDrag = useCallback(() => {
    const max = getMaxOffset();
    const ratio = Math.abs(offset) / max;

    if (ratio >= THRESHOLD) {
      if (offset < 0 && onDelete) commitAction("delete");
      else if (offset > 0 && onReject) commitAction("reject");
      else reset();
    } else {
      reset();
    }
  }, [offset, getMaxOffset, onDelete, onReject, commitAction, reset]);

  const onHandlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.stopPropagation();
    e.preventDefault();
    pointerId.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    startX.current = e.clientX;
    startOffset.current = offset;
  };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || disabled || pointerId.current !== e.pointerId) return;
    e.stopPropagation();
    updateFromDelta(e.clientX);
  };

  const onHandlePointerUp = (e: React.PointerEvent) => {
    if (!dragging || pointerId.current !== e.pointerId) return;
    e.stopPropagation();
    finishDrag();
  };

  const onZoneClick = (side: "delete" | "reject") => (e: React.MouseEvent) => {
    if (disabled || dragging) return;
    e.stopPropagation();
    if (side === "delete" && onDelete) commitAction("delete");
    else if (side === "reject" && onReject) commitAction("reject");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowLeft" && onDelete) {
      e.preventDefault();
      commitAction("delete");
    } else if (e.key === "ArrowRight" && onReject) {
      e.preventDefault();
      commitAction("reject");
    } else if (e.key === "Escape") {
      reset();
    }
  };

  if (!onDelete && !onReject) return null;

  const labelClass = (side: ActiveSide) =>
    `flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide transition-all duration-200 ${
      activeSide === side ? "text-white opacity-100" : "text-white/80 opacity-90"
    }`;

  return (
    <div
      className="no-print"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        ref={trackRef}
        role="group"
        aria-label="Ações: arraste para excluir ou reprovar"
        className={`kanban-action-slider relative h-[30px] rounded-full select-none touch-none overflow-hidden ${
          disabled ? "opacity-50 pointer-events-none" : ""
        }`}
        onKeyDown={onKeyDown}
        tabIndex={disabled ? -1 : 0}
      >
        <div
          className="absolute inset-y-0 left-0 w-1/2 bg-black/8 transition-opacity duration-200 pointer-events-none rounded-l-full"
          style={{ opacity: activeSide === "delete" ? 1 : 0 }}
        />
        <div
          className="absolute inset-y-0 right-0 w-1/2 bg-white/12 transition-opacity duration-200 pointer-events-none rounded-r-full"
          style={{ opacity: activeSide === "reject" ? 1 : 0 }}
        />

        {onDelete && (
          <button
            type="button"
            className="absolute inset-y-0 left-0 w-1/2 z-0 cursor-pointer focus:outline-none"
            aria-label="Excluir orçamento"
            onClick={onZoneClick("delete")}
          />
        )}
        {onReject && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 w-1/2 z-0 cursor-pointer focus:outline-none"
            aria-label="Reprovar orçamento"
            onClick={onZoneClick("reject")}
          />
        )}

        <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none z-[1]">
          {onDelete ? (
            <span className={labelClass("delete")}>
              <Trash2 className="h-3 w-3" strokeWidth={2} />
              Excluir
            </span>
          ) : (
            <span />
          )}
          {onReject ? (
            <span className={labelClass("reject")}>
              Reprovar
              <Ban className="h-3 w-3" strokeWidth={2} />
            </span>
          ) : (
            <span />
          )}
        </div>

        <div
          role="slider"
          aria-valuemin={-1}
          aria-valuemax={1}
          aria-valuenow={offset === 0 ? 0 : offset < 0 ? -1 : 1}
          aria-label="Arraste para escolher a ação"
          className="kanban-action-slider-handle absolute top-1/2 left-1/2 z-[2] rounded-full bg-white cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          style={{
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            transform: `translate(calc(-50% + ${offset}px), -50%) scale(${dragging ? 1.04 : 1})`,
            transition: dragging
              ? "none"
              : "transform 0.32s cubic-bezier(0.34, 1.35, 0.64, 1), box-shadow 0.2s ease",
            boxShadow: dragging
              ? "0 3px 12px rgb(15 23 42 / 0.16), 0 0 0 2px rgb(255 255 255 / 0.4)"
              : "0 2px 8px rgb(15 23 42 / 0.12), 0 1px 2px rgb(15 23 42 / 0.06)",
          }}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={reset}
        />
      </div>
    </div>
  );
}
