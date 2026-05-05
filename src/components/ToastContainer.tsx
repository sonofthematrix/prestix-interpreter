"use client";

import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { removeToast } from "@/store/slices/uiSlice";
import { useEffect } from "react";

const TOAST_DURATION_MS = 4500;

export function ToastContainer() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  const dispatch = useAppDispatch();

  return (
    <div
      id="toast-container"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          id={t.id}
          message={t.message}
          type={t.type}
          onDismiss={() => dispatch(removeToast(t.id))}
        />
      ))}
    </div>
  );
}

function ToastItem({
  id,
  message,
  type,
  onDismiss,
}: {
  id: number;
  message: string;
  type?: "success" | "error" | "info";
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [id, onDismiss]);

  const classes =
    type === "error"
      ? "bg-red-900/90 text-red-100 border-red-500/50"
      : type === "success"
        ? "bg-green-900/90 text-green-100 border-green-500/50"
        : "bg-zinc-800/95 text-white border-white/20";

  return (
    <div
      role="status"
      className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${classes}`}
    >
      {message}
    </div>
  );
}
