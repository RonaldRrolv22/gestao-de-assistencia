/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { Attachment } from "../../types";
import { resolveFileUrl } from "../../services/requestIds";
import {
  uploadSolicitationAttachment,
  deleteStorageFile,
} from "../../services/storageService";

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
}

interface SolicitationAttachmentsFieldProps {
  variant?: "create" | "edit";
  requestId?: string;
  attachments?: Attachment[];
  pendingFiles?: PendingFile[];
  onPendingFilesChange?: (files: PendingFile[]) => void;
  onAttachmentsChange?: (attachments: Attachment[]) => void;
  disabled?: boolean;
}

function createPendingFile(file: File): PendingFile {
  return {
    id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export default function SolicitationAttachmentsField({
  variant = "create",
  requestId,
  attachments = [],
  pendingFiles = [],
  onPendingFilesChange,
  onAttachmentsChange,
  disabled = false,
}: SolicitationAttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (files.length === 0) return;

    if (variant === "create") {
      onPendingFilesChange?.([...pendingFiles, ...files.map(createPendingFile)]);
      return;
    }

    if (!requestId || !onAttachmentsChange) return;

    setUploading(true);
    try {
      const next = [...attachments];
      for (const file of files) {
        const attId = `sol-att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const { storagePath, downloadUrl } = await uploadSolicitationAttachment(
          requestId,
          attId,
          file
        );
        next.push({
          id: attId,
          name: file.name,
          type: file.type,
          size: file.size,
          storagePath,
          downloadUrl,
        });
      }
      onAttachmentsChange(next);
    } finally {
      setUploading(false);
    }
  };

  const removePending = (id: string) => {
    const target = pendingFiles.find((p) => p.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onPendingFilesChange?.(pendingFiles.filter((p) => p.id !== id));
  };

  const removeSaved = async (att: Attachment) => {
    if (att.storagePath) {
      await deleteStorageFile(att.storagePath);
    }
    onAttachmentsChange?.(attachments.filter((a) => a.id !== att.id));
  };

  const hasItems = pendingFiles.length > 0 || attachments.length > 0;

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-xl p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition-all relative ${
          disabled ? "opacity-60 pointer-events-none" : "border-slate-200"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleSelectFiles}
          disabled={disabled || uploading}
        />
        <div className="flex flex-col items-center gap-2 text-slate-500">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
          ) : (
            <ImagePlus className="h-6 w-6 text-brand-orange" />
          )}
          <p className="text-[11px] font-medium">
            {uploading ? "Enviando imagens..." : "Clique ou arraste imagens para anexar"}
          </p>
          <p className="text-[10px] text-slate-400">Formatos: JPG, PNG, WEBP, GIF</p>
        </div>
      </div>

      {hasItems && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {pendingFiles.map((item) => (
            <div
              key={item.id}
              className="relative group rounded-xl border border-slate-200 overflow-hidden bg-white"
            >
              <img
                src={item.previewUrl}
                alt={item.file.name}
                className="w-full h-24 object-cover"
              />
              <div className="p-2 text-[10px] text-slate-600 truncate">{item.file.name}</div>
              <button
                type="button"
                onClick={() => removePending(item.id)}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-500 text-white opacity-90 hover:opacity-100"
                aria-label="Remover imagem"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {attachments.map((att) => {
            const url = resolveFileUrl(att);
            return (
              <div
                key={att.id}
                className="relative group rounded-xl border border-slate-200 overflow-hidden bg-white"
              >
                {url ? (
                  <img src={url} alt={att.name} className="w-full h-24 object-cover" />
                ) : (
                  <div className="w-full h-24 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                    Sem preview
                  </div>
                )}
                <div className="p-2 text-[10px] text-slate-600 truncate">{att.name}</div>
                <button
                  type="button"
                  onClick={() => void removeSaved(att)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-500 text-white opacity-90 hover:opacity-100"
                  aria-label="Remover anexo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { PendingFile };
export { createPendingFile };
