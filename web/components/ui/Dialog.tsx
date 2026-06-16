"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={cn(
        "fixed inset-0 z-50 m-auto max-h-[90vh] w-[min(100%,560px)] border border-neutral-700 bg-[#141414] p-0 text-neutral-200 shadow-2xl backdrop:bg-black/70",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-medium text-neutral-200">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="px-2 py-1 text-neutral-500 hover:text-neutral-300"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="max-h-[calc(90vh-48px)] overflow-y-auto p-3">{children}</div>
    </dialog>
  );
}
